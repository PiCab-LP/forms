require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const app = express();

// ===========================
// SEGURIDAD
// ===========================

// Helmet: Protección de headers HTTP
app.use(helmet());

// CORS: Permitir peticiones desde el frontend
app.use(cors({
    origin: [
        'https://forms-wysaro.vercel.app',
        'http://localhost:5500',
        process.env.FRONTEND_URL
    ].filter(Boolean), // Filtrar valores undefined/null
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Headers CORS adicionales para asegurar compatibilidad
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Manejar preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

// Sanitización contra NoSQL injection
app.use(mongoSanitize());

// Rate limiting global (100 requests por 15 minutos)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10000,
    message: { 
        success: false, 
        message: 'Too many requests, please try again later.' 
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api', globalLimiter);

// Rate limiting específico para formularios (TEMPORALMENTE DESHABILITADO)
const formSubmitLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 999999, // ← Sin límite temporal para testing
    message: { 
        success: false, 
        message: 'Too many form submissions. Please try again in 1 hour.' 
    },
    skipSuccessfulRequests: false,
});

// Rate limiting para admin (más flexible)
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200,
    message: { 
        success: false, 
        message: 'Too many admin requests, please try again later.' 
    }
});

// ===========================
// MIDDLEWARES
// ===========================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy (importante para obtener la IP real si usas un proxy/load balancer)
app.set('trust proxy', 1);

// ===========================
// MONGODB CONNECTION
// ===========================

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB conectado exitosamente'))
    .catch(err => console.error('❌ Error conectando a MongoDB:', err));

// ===========================
// RUTAS
// ===========================

const formRoutes = require('./routes/form.routes');
const adminRoutes = require('./routes/admin.routes');

// Ruta de prueba (sin rate limiting)
app.get('/', (req, res) => {
    res.json({ message: '🚀 Servidor funcionando correctamente' });
});

// Health check (sin rate limiting)
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Aplicar rate limiter específico a formularios
app.use('/api/form', formSubmitLimiter, formRoutes);

// Aplicar rate limiter específico a admin
app.use('/api/admin', adminLimiter, adminRoutes);

// Servir archivos estáticos del frontend
app.use(express.static('../frontend'));

// Ruta 404
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Endpoint not found' 
    });
});

// ===========================
// ERROR HANDLER GLOBAL
// ===========================

app.use((err, req, res, next) => {
    console.error('❌ Error no manejado:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ===========================
// INICIAR SERVIDOR
// ===========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🟢 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`🌐 CORS habilitado para: https://forms-wysaro.vercel.app`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});
