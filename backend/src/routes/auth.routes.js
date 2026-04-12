const express    = require("express");
const router     = express.Router();
const authCtrl   = require("../controllers/AuthController.js");
const { verifyToken } = require("../auth/authMiddleware.js");


// Public
router.post("/register", authCtrl.register);   // POST /auth/register
router.post("/login",    authCtrl.login);       // POST /auth/login

// Protégées
router.post("/logout", verifyToken, authCtrl.logout); // POST /auth/logout
router.get("/me",      verifyToken, authCtrl.me);     // GET  /auth/me

module.exports = router;