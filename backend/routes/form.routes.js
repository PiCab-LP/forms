const express = require('express');
const router = express.Router();
const formController = require('../controllers/form.controller');

// 🔥 Middleware para logging detallado
router.use((req, res, next) => {
    console.log('🔍 [ROUTE] Request received');
    console.log('  Method:', req.method);
    console.log('  Path:', req.path);
    console.log('  Origin:', req.headers.origin || '[NO ORIGIN]');
    console.log('  User-Agent:', req.headers['user-agent']?.substring(0, 50) + '...');
    next();
});

// Guardar nuevo formulario
router.post('/submit', (req, res, next) => {
    console.log('📝 [ROUTE] POST /submit');
    next();
}, formController.submitForm);

// 🔥 Obtener formulario para editar (con logs detallados)
router.get('/get/:token', (req, res, next) => {
    console.log('📥 [ROUTE] GET /get/:token');
    console.log('  Token:', req.params.token);
    console.log('  Full URL:', req.originalUrl);
    next();
}, formController.getForm);

// Actualizar formulario existente
router.post('/update', (req, res, next) => {
    console.log('🔄 [ROUTE] POST /update');
    next();
}, formController.updateForm);

// Obtener historial de cambios
router.get('/history/:token', (req, res, next) => {
    console.log('📜 [ROUTE] GET /history/:token');
    console.log('  Token:', req.params.token);
    next();
}, formController.getFormHistory);

module.exports = router;
