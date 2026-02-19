const express = require('express');
const router = express.Router();
const formController = require('../controllers/form.controller');
// 🔥 Importamos la configuración de Cloudinary que creamos antes
const upload = require('../config/cloudinary');

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
// Se agrega upload.fields para capturar logos y referencias
router.post('/submit', upload.fields([
    { name: 'logoFiles', maxCount: 3 },      // Opción 1: Hasta 3 logos
    { name: 'referenceFiles', maxCount: 5 }  // Opción 2: Hasta 5 referencias
]), (req, res, next) => {
    console.log('📝 [ROUTE] POST /submit');
    // Log para verificar si llegaron archivos
    if (req.files) {
        console.log('  📁 Files detected:', Object.keys(req.files));
    }
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
// Se agrega también aquí el middleware para permitir cambiar fotos en modo edición
router.post('/update', upload.fields([
    { name: 'logoFiles', maxCount: 3 },
    { name: 'referenceFiles', maxCount: 5 }
]), (req, res, next) => {
    console.log('🔄 [ROUTE] POST /update');
    if (req.files) {
        console.log('  📁 Update files detected:', Object.keys(req.files));
    }
    next();
}, formController.updateForm);

// Obtener historial de cambios
router.get('/history/:token', (req, res, next) => {
    console.log('📜 [ROUTE] GET /history/:token');
    console.log('  Token:', req.params.token);
    next();
}, formController.getFormHistory);

module.exports = router;