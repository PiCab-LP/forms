const express = require('express');
const router = express.Router();
const formController = require('../controllers/form.controller');

// Rutas del formulario
router.post('/submit', formController.submitForm);
router.get('/get/:token', formController.getForm);
router.post('/update', formController.updateForm);
router.get('/history/:token', formController.getFormHistory);

module.exports = router;
