// =====================================================
//  adminController.js
//  Contrôleur pour le panneau d'administration
// =====================================================

const db = require("../config/db.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const ADMIN_SECRET     = process.env.ADMIN_JWT_SECRET || "admin_secret_change_me";
const ADMIN_TOKEN_EXPIRY = "8h";
const SALT_ROUNDS      = 12;

// =====================================================
//  LOGIN ADMIN  —  POST /admin/login
// =====================================================
exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE username = ? AND role = 'admin'",
      [username]
    );
    if (rows.length === 0) return res.status(401).json({ error: "Identifiants incorrects" });

    const user  = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Identifiants incorrects" });

    const token = jwt.sign(
      { id: user.id_user, username: user.username, role: "admin" },
      ADMIN_SECRET,
      { expiresIn: ADMIN_TOKEN_EXPIRY }
    );
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
  if (!header || !header.startsWith("Bearer "))
    return res.status(401).json({ error: "Non autorisé" });

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, ADMIN_SECRET);
    if (decoded.role !== "admin") throw new Error("Not admin");
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
};

// =====================================================
//  STATS GLOBALES  —  GET /admin/stats
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
      `SELECT COUNT(*) as mods24h FROM activity_logs
       WHERE action IN ('CREATE','UPDATE','DELETE')
         AND created_at >= NOW() - INTERVAL 24 HOUR`
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
//  STATS PAR UTILISATEUR  —  GET /admin/users/:id/stats
//  Retourne connexions totales, jours actifs, heure
//  préférée, IP les plus fréquentes, activité CRUD,
//  heatmap des 30 derniers jours
// =====================================================
exports.getUserStats = async (req, res) => {
  const { id } = req.params;
  try {
    // ── Infos de base ────────────────────────────────
    const [[user]] = await db.query(
      `SELECT id_user, username, email, role, is_blocked, last_login,
              created_at
       FROM users WHERE id_user = ?`,
      [id]
    );
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    // ── Connexions totales (logins) ──────────────────
    const [[{ totalLogins }]] = await db.query(
      `SELECT COUNT(*) as totalLogins FROM activity_logs
       WHERE id_user = ? AND action = 'LOGIN'`,
      [id]
    );

    // ── Jours distincts avec activité ────────────────
    const [[{ activeDays }]] = await db.query(
      `SELECT COUNT(DISTINCT DATE(created_at)) as activeDays
       FROM activity_logs WHERE id_user = ?`,
      [id]
    );

    // ── Première activité enregistrée ────────────────
    const [[{ firstSeen }]] = await db.query(
      `SELECT MIN(created_at) as firstSeen FROM activity_logs WHERE id_user = ?`,
      [id]
    );

    // ── Heure préférée de connexion (0-23) ───────────
    const [hourRows] = await db.query(
      `SELECT HOUR(created_at) as hour, COUNT(*) as cnt
       FROM activity_logs
       WHERE id_user = ? AND action = 'LOGIN'
       GROUP BY hour ORDER BY cnt DESC LIMIT 1`,
      [id]
    );
    const preferredHour = hourRows.length > 0 ? hourRows[0].hour : null;

    // ── Répartition logins par heure (heatmap 0-23) ──
    const [loginsByHour] = await db.query(
      `SELECT HOUR(created_at) as hour, COUNT(*) as cnt
       FROM activity_logs
       WHERE id_user = ? AND action = 'LOGIN'
       GROUP BY hour ORDER BY hour ASC`,
      [id]
    );

    // ── Activité CRUD ────────────────────────────────
    const [crudRows] = await db.query(
      `SELECT action, COUNT(*) as cnt FROM activity_logs
       WHERE id_user = ? AND action IN ('CREATE','UPDATE','DELETE','LOGIN','BLOCK')
       GROUP BY action`,
      [id]
    );
    const crudStats = { CREATE: 0, UPDATE: 0, DELETE: 0, LOGIN: 0, BLOCK: 0 };
    crudRows.forEach(r => { crudStats[r.action] = r.cnt; });

    // ── Heatmap des 90 derniers jours ────────────────
    const [heatmapRows] = await db.query(
      `SELECT DATE(created_at) as day, COUNT(*) as cnt
       FROM activity_logs
       WHERE id_user = ?
         AND created_at >= NOW() - INTERVAL 90 DAY
       GROUP BY day ORDER BY day ASC`,
      [id]
    );

    // ── Connexions des 30 derniers jours ─────────────
    const [loginsByDay] = await db.query(
      `SELECT DATE(created_at) as day, COUNT(*) as cnt
       FROM activity_logs
       WHERE id_user = ? AND action = 'LOGIN'
         AND created_at >= NOW() - INTERVAL 30 DAY
       GROUP BY day ORDER BY day ASC`,
      [id]
    );

    // ── IP les plus fréquentes (top 5) ───────────────
    const [topIPs] = await db.query(
      `SELECT ip_address, COUNT(*) as cnt FROM activity_logs
       WHERE id_user = ? AND ip_address IS NOT NULL
       GROUP BY ip_address ORDER BY cnt DESC LIMIT 5`,
      [id]
    );

    // ── Sessions actives actuellement ────────────────
    const [activeSessions] = await db.query(
      `SELECT session_id, ip_address, created_at, last_activity
       FROM user_sessions
       WHERE id_user = ? AND expires_at > NOW()`,
      [id]
    );

    // ── Dernières actions (10) ────────────────────────
    const [recentActions] = await db.query(
      `SELECT action, table_name, detail, ip_address, created_at
       FROM activity_logs WHERE id_user = ?
       ORDER BY created_at DESC LIMIT 10`,
      [id]
    );

    res.json({
      user,
      totalLogins,
      activeDays,
      firstSeen,
      preferredHour,
      loginsByHour,
      crudStats,
      heatmapRows,
      loginsByDay,
      topIPs,
      activeSessions,
      recentActions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// =====================================================
//  SESSIONS ACTIVES  —  GET /admin/sessions
// =====================================================
exports.getSessions = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.session_id, s.ip_address, s.created_at, s.last_activity,
             u.username, u.id_user
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

// DELETE /admin/sessions/:sessionId
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

// DELETE /admin/sessions
exports.deleteAllSessions = async (req, res) => {
  try {
    await db.query("DELETE FROM user_sessions WHERE expires_at > NOW() AND id_user != ?", [req.admin.id]);
    await logAction(db, req.admin.id, req.admin.username, "BLOCK", "user_sessions", "Kick de toutes les sessions", req.ip);
    res.json({ message: "Toutes les sessions supprimées" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// =====================================================
//  UTILISATEURS  —  GET /admin/users
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

// =====================================================
//  CRÉER UN UTILISATEUR  —  POST /admin/users
// =====================================================
exports.createUser = async (req, res) => {
  const { username, password, email, role } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Username et password requis" });

  const assignedRole = (role === "admin") ? "admin" : "user";
  try {
    const [existing] = await db.query("SELECT id_user FROM users WHERE username = ?", [username]);
    if (existing.length > 0) return res.status(409).json({ error: "Ce nom d'utilisateur est déjà pris" });

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await db.query(
      "INSERT INTO users (username, email, password_hash, role, is_blocked) VALUES (?, ?, ?, ?, 0)",
      [username, email || null, password_hash, assignedRole]
    );
    await logAction(db, req.admin.id, req.admin.username, "CREATE", "users",
      `Création du compte "${username}" (${assignedRole})`, req.ip);

    res.status(201).json({ message: "Utilisateur créé", id_user: result.insertId, username, role: assignedRole });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// =====================================================
//  MODIFIER UN UTILISATEUR  —  PUT /admin/users/:id
// =====================================================
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, email, role, password } = req.body;
  try {
    const [existing] = await db.query("SELECT * FROM users WHERE id_user = ?", [id]);
    if (existing.length === 0) return res.status(404).json({ error: "Utilisateur introuvable" });
    const user = existing[0];

    if (username && username !== user.username) {
      const [dup] = await db.query("SELECT id_user FROM users WHERE username = ? AND id_user != ?", [username, id]);
      if (dup.length > 0) return res.status(409).json({ error: "Ce nom d'utilisateur est déjà pris" });
    }

    const fields = [], params = [];
    if (username)           { fields.push("username = ?");      params.push(username); }
    if (email !== undefined){ fields.push("email = ?");         params.push(email || null); }
    if (role)               { fields.push("role = ?");          params.push(role); }
    if (password) {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      fields.push("password_hash = ?"); params.push(hash);
    }
    if (fields.length === 0) return res.status(400).json({ error: "Aucun champ à modifier" });

    params.push(id);
    await db.query(`UPDATE users SET ${fields.join(", ")} WHERE id_user = ?`, params);
    await logAction(db, req.admin.id, req.admin.username, "UPDATE", "users",
      `Modification du compte "${user.username}"`, req.ip);

    res.json({ message: "Utilisateur mis à jour" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// =====================================================
//  SUPPRIMER UN UTILISATEUR  —  DELETE /admin/users/:id
// =====================================================
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.admin.id)
    return res.status(400).json({ error: "Impossible de supprimer votre propre compte" });

  try {
    const [rows] = await db.query("SELECT username, role FROM users WHERE id_user = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Utilisateur introuvable" });

    await db.query("DELETE FROM user_sessions WHERE id_user = ?", [id]);
    await db.query("DELETE FROM users WHERE id_user = ?", [id]);
    await logAction(db, req.admin.id, req.admin.username, "DELETE", "users",
      `Suppression du compte "${rows[0].username}" (${rows[0].role})`, req.ip);

    res.json({ message: "Utilisateur supprimé" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// =====================================================
//  BLOQUER / DÉBLOQUER  —  POST /admin/users/:id/block
// =====================================================
exports.blockUser = async (req, res) => {
  const { id } = req.params;
  const { block, reason } = req.body;
  try {
    await db.query(
      "UPDATE users SET is_blocked = ?, block_reason = ? WHERE id_user = ?",
      [block ? 1 : 0, block ? (reason || "") : null, id]
    );
    if (block) await db.query("DELETE FROM user_sessions WHERE id_user = ?", [id]);

    const [[user]] = await db.query("SELECT username FROM users WHERE id_user = ?", [id]);
    await logAction(db, req.admin.id, req.admin.username,
      block ? "BLOCK" : "UPDATE", "users",
      block ? `Blocage de "${user?.username}" — Raison: ${reason || "non précisée"}`
            : `Déblocage de "${user?.username}"`,
      req.ip
    );
    res.json({ message: block ? "Utilisateur bloqué" : "Utilisateur débloqué" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// =====================================================
//  LOGS  —  GET /admin/logs
// =====================================================
exports.getLogs = async (req, res) => {
  const limit  = parseInt(req.query.limit) || 100;
  const action = req.query.action || null;
  try {
    let query = "SELECT * FROM activity_logs";
    const params = [];
    if (action) { query += " WHERE action = ?"; params.push(action); }
    query += " ORDER BY created_at DESC LIMIT ?";
    params.push(limit);
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

exports.clearLogs = async (req, res) => {
  try {
    await db.query("DELETE FROM activity_logs");
    await logAction(db, req.admin.id, req.admin.username, "DELETE", "activity_logs", "Purge des logs d'activité", req.ip);
    res.json({ message: "Logs supprimés" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// =====================================================
//  VERROU GLOBAL  —  GET /admin/lock  |  POST /admin/lock
// =====================================================
exports.getLock = async (req, res) => {
  try {
    const [rows]  = await db.query("SELECT config_value FROM app_config WHERE config_key = 'global_lock'");
    const [rows2] = await db.query("SELECT config_value FROM app_config WHERE config_key = 'lock_message'");
    res.json({
      locked:  rows.length  > 0 && rows[0].config_value  === "1",
      message: rows2.length > 0 ? rows2[0].config_value : "",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

exports.setLock = async (req, res) => {
  const { locked, message } = req.body;
  try {
    await db.query(
      "INSERT INTO app_config (config_key, config_value) VALUES ('global_lock', ?) ON DUPLICATE KEY UPDATE config_value = ?",
      [locked ? "1" : "0", locked ? "1" : "0"]
    );
    if (message !== undefined) {
      await db.query(
        "INSERT INTO app_config (config_key, config_value) VALUES ('lock_message', ?) ON DUPLICATE KEY UPDATE config_value = ?",
        [message, message]
      );
    }
    if (locked) {
      await db.query(`DELETE s FROM user_sessions s JOIN users u ON s.id_user = u.id_user WHERE u.role != 'admin'`);
    }
    await logAction(db, req.admin.id, req.admin.username, "BLOCK", "app_config",
      locked ? `Verrouillage global activé — ${message || ""}` : "Verrouillage global désactivé", req.ip);

    res.json({ message: locked ? "Application verrouillée" : "Application déverrouillée" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// =====================================================
//  UTILITAIRE logAction
// =====================================================
exports.logAction = logAction;

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
//  MIDDLEWARE : Verrou global
// =====================================================
exports.checkAppLock = async (req, res, next) => {
  if (req.path.startsWith("/admin")) return next();
  if (req.path === "/" || req.path.startsWith("/uploads") || req.path.startsWith("/Ressources")) return next();
  try {
    const [rows] = await db.query("SELECT config_value FROM app_config WHERE config_key = 'global_lock'");
    if (rows.length > 0 && rows[0].config_value === "1") {
      const [msg] = await db.query("SELECT config_value FROM app_config WHERE config_key = 'lock_message'");
      return res.status(503).json({
        error: "Application verrouillée",
        message: msg.length > 0 ? msg[0].config_value : "L'application est temporairement indisponible.",
      });
    }
    next();
  } catch { next(); }
};

// =====================================================
//  MIDDLEWARE : Utilisateur bloqué
// =====================================================
exports.checkUserBlock = async (req, res, next) => {
  if (!req.user) return next();
  try {
    const [rows] = await db.query("SELECT is_blocked, block_reason FROM users WHERE id_user = ?", [req.user.id]);
    if (rows.length > 0 && rows[0].is_blocked) {
      return res.status(403).json({
        error: "Compte bloqué",
        message: rows[0].block_reason || "Votre accès a été suspendu. Contactez l'administrateur.",
      });
    }
    next();
  } catch { next(); }
};