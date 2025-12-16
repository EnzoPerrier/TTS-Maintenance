const express = require('express');
const router = express.Router();
const authController = require('../auth/authController');

router.post('/register', authController.register); // Seulement admin plus tard
router.post('/login', authController.login);

module.exports = router;
