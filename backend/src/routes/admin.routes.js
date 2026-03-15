// =====================================================
//  admin_routes.js
//  Routes du panneau d'administration
// =====================================================

const express = require("express");
const router = express.Router();
const adminController = require("../admin/adminController");

const auth = adminController.requireAdmin;

// Auth
router.post("/login", adminController.login);

// Stats dashboard
router.get("/stats", auth, adminController.getStats);

// Sessions
router.get("/sessions", auth, adminController.getSessions);
router.delete("/sessions/:sessionId", auth, adminController.deleteSession);
router.delete("/sessions", auth, adminController.deleteAllSessions);

// Utilisateurs
router.get("/users", auth, adminController.getUsers);
router.post("/users/:id/block", auth, adminController.blockUser);

// Logs
router.get("/logs", auth, adminController.getLogs);
router.delete("/logs", auth, adminController.clearLogs);

// Verrou global
router.get("/lock", auth, adminController.getLock);
router.post("/lock", auth, adminController.setLock);

module.exports = router;