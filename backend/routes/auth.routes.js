const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

// Login (público)
router.post('/login', authController.login);

// Verificar token (protegido)
router.get('/verify', protect, authController.verify);

module.exports = router;
