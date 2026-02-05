const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('✅ MongoDB conectado exitosamente'))
.catch(err => console.error('❌ Error conectando a MongoDB:', err));

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ message: '🚀 Servidor funcionando correctamente' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🟢 Servidor corriendo en http://localhost:${PORT}`);
});
