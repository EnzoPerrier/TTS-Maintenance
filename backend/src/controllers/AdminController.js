// =====================================================
//  adminController.js
//  Contrôleur pour le panneau d'administration
// =====================================================

const db = require("../config/db.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const ADMIN_SECRET = process.env.ADMIN_JWT_SECRET || "admin_secret_change_me";
const ADMIN_TOKEN_EXPIRY = "8h";

// =====================================================
//  LOGIN ADMIN
//  POST /admin/login
// =====================================================
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE username = ? AND role = 'admin'",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Identifiants incorrects" });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: "Identifiants incorrects" });
    }

    const token = jwt.sign(
      { id: user.id_user, username: user.username, role: "admin" },
      ADMIN_SECRET,
      { expiresIn: ADMIN_TOKEN_EXPIRY }
    );

    // Log la connexion admin
    await logAction(db, user.id_user, user.username, "LOGIN", "admin", "Connexion au panneau admin", req.ip);

    res.json({ token, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// =====================================================
//  MIDDLEWARE AUTH ADMIN
// =====================================================
exports.requireAdmin = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, ADMIN_SECRET);
    if (decoded.role !== "admin") throw new Error("Not admin");
    req.admin = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
};

// =====================================================
//  STATS GLOBALES
//  GET /admin/stats
// =====================================================
exports.getStats = async (req, res) => {
  try {
    const [[{ activeSessions }]] = await db.query(
      "SELECT COUNT(*) as activeSessions FROM user_sessions WHERE expires_at > NOW()"
    );
    const [[{ totalUsers }]] = await db.query(
      "SELECT COUNT(*) as totalUsers FROM users WHERE role != 'admin'"
    );
    const [[{ blockedUsers }]] = await db.query(
      "SELECT COUNT(*) as blockedUsers FROM users WHERE is_blocked = 1"
    );
    const [[{ mods24h }]] = await db.query(
      "SELECT COUNT(*) as mods24h FROM activity_logs WHERE action IN ('CREATE','UPDATE','DELETE') AND created_at >= NOW() - INTERVAL 24 HOUR"
    );
    const [recentLogs] = await db.query(
      "SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 10"
    );

    res.json({ activeSessions, totalUsers, blockedUsers, mods24h, recentLogs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// =====================================================
//  SESSIONS ACTIVES
//  GET /admin/sessions
// =====================================================
exports.getSessions = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.session_id, s.ip_address, s.created_at, s.last_activity, u.username, u.id_user
      FROM user_sessions s
      JOIN users u ON s.id_user = u.id_user
      WHERE s.expires_at > NOW()
      ORDER BY s.last_activity DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// DELETE /admin/sessions/:sessionId — Kick une session
exports.deleteSession = async (req, res) => {
  const { sessionId } = req.params;
  try {
    await db.query("DELETE FROM user_sessions WHERE session_id = ?", [sessionId]);
    await logAction(db, req.admin.id, req.admin.username, "BLOCK", "user_sessions", `Kick session ${sessionId}`, req.ip);
    res.json({ message: "Session supprimée" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// DELETE /admin/sessions — Kick toutes les sessions
exports.deleteAllSessions = async (req, res) => {
  try {
    // Garder la session de l'admin actuel
    await db.query("DELETE FROM user_sessions WHERE expires_at > NOW() AND id_user != ?", [req.admin.id]);
    await logAction(db, req.admin.id, req.admin.username, "BLOCK", "user_sessions", "Kick de toutes les sessions", req.ip);
    res.json({ message: "Toutes les sessions supprimées" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// =====================================================
//  UTILISATEURS
//  GET /admin/users
// =====================================================
exports.getUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id_user, username, email, role, is_blocked, block_reason, last_login FROM users ORDER BY username ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// POST /admin/users/:id/block — Bloquer/débloquer un utilisateur
exports.blockUser = async (req, res) => {
  const { id } = req.params;
  const { block, reason } = req.body;

  try {
    await db.query(
      "UPDATE users SET is_blocked = ?, block_reason = ? WHERE id_user = ?",
      [block ? 1 : 0, block ? (reason || "") : null, id]
    );

    // Invalider ses sessions si on le bloque
    if (block) {
      await db.query("DELETE FROM user_sessions WHERE id_user = ?", [id]);
    }

    const [[user]] = await db.query("SELECT username FROM users WHERE id_user = ?", [id]);
    const action = block ? "BLOCK" : "UPDATE";
    const detail = block
      ? `Blocage de ${user?.username} — Raison: ${reason || "non précisée"}`
      : `Déblocage de ${user?.username}`;

    await logAction(db, req.admin.id, req.admin.username, action, "users", detail, req.ip);

    res.json({ message: block ? "Utilisateur bloqué" : "Utilisateur débloqué" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// =====================================================
//  LOGS D'ACTIVITÉ
//  GET /admin/logs
// =====================================================
exports.getLogs = async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const action = req.query.action || null;

  try {
    let query = "SELECT * FROM activity_logs";
    const params = [];

    if (action) {
      query += " WHERE action = ?";
      params.push(action);
    }

    query += " ORDER BY created_at DESC LIMIT ?";
    params.push(limit);

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// DELETE /admin/logs — Vider les logs
exports.clearLogs = async (req, res) => {
  try {
    await db.query("DELETE FROM activity_logs");
    // Re-log cette action
    await logAction(db, req.admin.id, req.admin.username, "DELETE", "activity_logs", "Purge des logs d'activité", req.ip);
    res.json({ message: "Logs supprimés" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// =====================================================
//  VERROU GLOBAL
//  GET /admin/lock
//  POST /admin/lock
// =====================================================
exports.getLock = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT config_value FROM app_config WHERE config_key = 'global_lock'"
    );
    const [rows2] = await db.query(
      "SELECT config_value FROM app_config WHERE config_key = 'lock_message'"
    );

    const locked = rows.length > 0 && rows[0].config_value === "1";
    const message = rows2.length > 0 ? rows2[0].config_value : "";

    res.json({ locked, message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

exports.setLock = async (req, res) => {
  const { locked, message } = req.body;

  try {
    // UPSERT config
    await db.query(`
      INSERT INTO app_config (config_key, config_value) VALUES ('global_lock', ?)
      ON DUPLICATE KEY UPDATE config_value = ?
    `, [locked ? "1" : "0", locked ? "1" : "0"]);

    if (message !== undefined) {
      await db.query(`
        INSERT INTO app_config (config_key, config_value) VALUES ('lock_message', ?)
        ON DUPLICATE KEY UPDATE config_value = ?
      `, [message, message]);
    }

    if (locked) {
      // Invalider toutes les sessions non-admin
      await db.query(`
        DELETE s FROM user_sessions s
        JOIN users u ON s.id_user = u.id_user
        WHERE u.role != 'admin'
      `);
    }

    await logAction(
      db, req.admin.id, req.admin.username,
      "BLOCK", "app_config",
      locked ? `Verrouillage global activé — ${message || ""}` : "Verrouillage global désactivé",
      req.ip
    );

    res.json({ message: locked ? "Application verrouillée" : "Application déverrouillée" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// =====================================================
//  UTILITAIRE : Enregistrer un log
//  À appeler depuis les autres controllers
// =====================================================
exports.logAction = logAction; // Export pour utilisation dans les autres controllers

async function logAction(db, userId, username, action, tableName, detail, ip) {
  try {
    await db.query(
      "INSERT INTO activity_logs (id_user, username, action, table_name, detail, ip_address) VALUES (?, ?, ?, ?, ?, ?)",
      [userId || null, username || null, action, tableName || null, detail || null, ip || null]
    );
  } catch (e) {
    console.error("logAction error:", e);
  }
}

// =====================================================
//  MIDDLEWARE : Vérifier si l'app est verrouillée
//  À utiliser dans server.js avant les routes normales
// =====================================================
exports.checkAppLock = async (req, res, next) => {
  // Les routes admin passent toujours
  if (req.path.startsWith("/admin")) return next();
  if (req.path === "/" || req.path.startsWith("/uploads") || req.path.startsWith("/Ressources")) return next();

  try {
    const [rows] = await db.query(
      "SELECT config_value FROM app_config WHERE config_key = 'global_lock'"
    );
    const locked = rows.length > 0 && rows[0].config_value === "1";

    if (locked) {
      const [msg] = await db.query(
        "SELECT config_value FROM app_config WHERE config_key = 'lock_message'"
      );
      return res.status(503).json({
        error: "Application verrouillée",
        message: msg.length > 0 ? msg[0].config_value : "L'application est temporairement indisponible."
      });
    }

    next();
  } catch (e) {
    next(); // En cas d'erreur DB, on laisse passer
  }
};

// =====================================================
//  MIDDLEWARE : Vérifier si l'utilisateur est bloqué
//  À utiliser dans les routes après authentification
// =====================================================
exports.checkUserBlock = async (req, res, next) => {
  if (!req.user) return next();

  try {
    const [rows] = await db.query(
      "SELECT is_blocked, block_reason FROM users WHERE id_user = ?",
      [req.user.id]
    );

    if (rows.length > 0 && rows[0].is_blocked) {
      return res.status(403).json({
        error: "Compte bloqué",
        message: rows[0].block_reason || "Votre accès a été suspendu. Contactez l'administrateur."
      });
    }

    next();
  } catch (e) {
    next();
  }
};