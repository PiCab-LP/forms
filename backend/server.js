const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const formRoutes = require('./routes/form.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('✅ MongoDB conectado exitosamente'))
.catch(err => console.error('❌ Error conectando a MongoDB:', err));

// Rutas
app.use('/api/form', formRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ message: '🚀 Servidor funcionando correctamente' });
});

// Servir archivos estáticos del frontend
app.use(express.static('../frontend'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🟢 Servidor corriendo en http://localhost:${PORT}`);
});
