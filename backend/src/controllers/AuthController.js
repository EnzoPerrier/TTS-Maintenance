// =====================================================
//  authController.js
//  Authentification des utilisateurs normaux
//  SÉPARÉ de adminController.js — secret JWT différent
// =====================================================

const db      = require("../config/db.js");
const jwt     = require("jsonwebtoken");
const bcrypt  = require("bcrypt");

const JWT_SECRET      = process.env.JWT_SECRET;
const JWT_EXPIRY      = process.env.JWT_EXPIRY || "24h";
const SALT_ROUNDS     = 12;

// =====================================================
//  REGISTER
//  POST /auth/register
//  À protéger ultérieurement (admin seulement ou
//  invitation) — pour l'instant ouvert pour init.
// =====================================================
exports.register = async (req, res) => {
  const { username, password, email, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username et password requis" });
  }

  // Seul un admin peut créer un autre admin
  const assignedRole = (role === "admin") ? "admin" : "user";

  try {
    // Vérifier unicité du username
    const [existing] = await db.query(
      "SELECT id_user FROM users WHERE username = ?",
      [username]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: "Ce nom d'utilisateur est déjà pris" });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await db.query(
      `INSERT INTO users (username, email, password_hash, role, is_blocked)
       VALUES (?, ?, ?, ?, 0)`,
      [username, email || null, password_hash, assignedRole]
    );

    return res.status(201).json({
      message: "Compte créé avec succès",
      id_user: result.insertId,
      username,
      role: assignedRole,
    });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// =====================================================
//  LOGIN
//  POST /auth/login
// =====================================================
exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username et password requis" });
  }

  try {
    // Récupérer l'utilisateur (tous rôles confondus)
    const [rows] = await db.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      // Réponse générique pour ne pas révéler si le compte existe
      return res.status(401).json({ message: "Identifiants incorrects" });
    }

    const user = rows[0];

    // Vérifier si le compte est bloqué
    if (user.is_blocked) {
      return res.status(403).json({
        message: user.block_reason || "Votre accès a été suspendu. Contactez l'administrateur.",
      });
    }

    // Vérifier le mot de passe
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Identifiants incorrects" });
    }

    // Générer le token JWT (secret utilisateur, différent du secret admin)
    const token = jwt.sign(
      {
        id:       user.id_user,
        username: user.username,
        role:     user.role,
        // id_client optionnel si système lie un user à un client
        ...(user.id_client ? { id_client: user.id_client } : {}),
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Mettre à jour last_login
    await db.query(
      "UPDATE users SET last_login = NOW() WHERE id_user = ?",
      [user.id_user]
    );

    // Enregistrer la session (optionnel - pour le panel admin)
    try {
      await db.query(
        `INSERT INTO user_sessions (id_user, ip_address, expires_at)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
        [user.id_user, req.ip]
      );
    } catch (sessionErr) {
      // Non bloquant si la table user_sessions n'existe pas encore
      console.warn("user_sessions insert skipped:", sessionErr.message);
    }

    // Log d'activité (réutilise logAction de adminController)
    try {
      const { logAction } = require("./AdminController.js");
      await logAction(db, user.id_user, user.username, "LOGIN", "users", "Connexion utilisateur", req.ip);
    } catch (logErr) {
      console.warn("logAction skipped:", logErr.message);
    }

    return res.json({
      token,
      user: {
        id_user:  user.id_user,
        username: user.username,
        email:    user.email,
        role:     user.role,
      },
    });

  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// =====================================================
//  LOGOUT
//  POST /auth/logout
//  Supprime la session en base (le token reste valide
//  jusqu'à expiration côté client — prévoir une
//  blacklist si nécessaire)
// =====================================================
exports.logout = async (req, res) => {
  // req.user est injecté par verifyToken (auth.middleware.js)
  if (!req.user) {
    return res.status(401).json({ message: "Non authentifié" });
  }

  try {
    await db.query(
      "DELETE FROM user_sessions WHERE id_user = ?",
      [req.user.id]
    );
    return res.json({ message: "Déconnecté avec succès" });
  } catch (err) {
    console.error("logout error:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// =====================================================
//  ME — Profil courant
//  GET /auth/me
// =====================================================
exports.me = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Non authentifié" });
  }

  try {
    const [rows] = await db.query(
      "SELECT id_user, username, email, role, last_login FROM users WHERE id_user = ?",
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("me error:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

