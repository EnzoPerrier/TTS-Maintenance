const express = require("express");
const router  = express.Router();
const admin   = require("../controllers/adminController.js");

// ── Auth admin (public) ───────────────────────────────
router.post("/login", admin.login);

// ── Toutes les routes suivantes requièrent requireAdmin ─
router.use(admin.requireAdmin);

// Stats globales
router.get("/stats", admin.getStats);

// Sessions
router.get   ("/sessions",              admin.getSessions);
router.delete("/sessions",              admin.deleteAllSessions);
router.delete("/sessions/:sessionId",   admin.deleteSession);

// Utilisateurs — CRUD + stats
router.get   ("/users",               admin.getUsers);
router.post  ("/users",               admin.createUser);
router.put   ("/users/:id",           admin.updateUser);
router.delete("/users/:id",           admin.deleteUser);
router.post  ("/users/:id/block",     admin.blockUser);
router.get   ("/users/:id/stats",     admin.getUserStats);   // ← stats par utilisateur

// Logs
router.get   ("/logs",  admin.getLogs);
router.delete("/logs",  admin.clearLogs);

// Verrou global
router.get ("/lock", admin.getLock);
router.post("/lock", admin.setLock);

module.exports = router;