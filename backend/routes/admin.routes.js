const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// Obtener todos los formularios (con búsqueda y paginación)
router.get('/forms', adminController.getAllForms);

// Obtener detalles de un formulario específico
router.get('/forms/:token', adminController.getFormDetails);

// Obtener estadísticas
router.get('/stats', adminController.getStats);

// Eliminar formulario
router.delete('/forms/:token', adminController.deleteForm);

// Exportar a CSV
router.get('/export/csv', adminController.exportToCSV);

module.exports = router;
