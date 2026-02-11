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

// 🔥 Helmet con CSP deshabilitado para permitir fetch cross-origin
app.use(helmet({
    contentSecurityPolicy: false, // ← Deshabilitar CSP que bloquea fetch
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false
}));

// 🔥 CORS SIMPLIFICADO (sin conflictos)
app.use(cors({
    origin: function(origin, callback) {
        console.log('📡 Request from origin:', origin || '[NO ORIGIN]');
        
        // Permitir requests sin origin (Postman, curl, server-to-server)
        if (!origin) {
            console.log('✅ CORS permitido: Sin origin');
            return callback(null, true);
        }
        
        // Lista de dominios permitidos exactos
        const allowedOrigins = [
            'https://forms-wysaro.vercel.app',
            'http://localhost:5500',
            'http://localhost:3000',
            'http://127.0.0.1:5500',
            process.env.FRONTEND_URL
        ].filter(Boolean);
        
        // Permitir TODOS los subdominios de Vercel (preview deployments)
        if (origin.endsWith('.vercel.app')) {
            console.log('✅ CORS permitido para Vercel subdomain:', origin);
            return callback(null, true);
        }
        
        // Permitir dominios de la lista
        if (allowedOrigins.includes(origin)) {
            console.log('✅ CORS permitido para origin listado:', origin);
            return callback(null, true);
        }
        
        console.log('❌ CORS BLOQUEADO para origin:', origin);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
}));

// 🔥 Manejar preflight OPTIONS requests explícitamente
app.options('*', (req, res) => {
    const origin = req.headers.origin;
    console.log('✅ Preflight OPTIONS request from:', origin || '[NO ORIGIN]');
    res.sendStatus(200);
});

// Sanitización contra NoSQL injection
app.use(mongoSanitize());

// Rate limiting global (10000 requests por 15 minutos)
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
    
    // Manejar errores de CORS específicamente
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: 'CORS policy: Origin not allowed',
            origin: req.headers.origin
        });
    }
    
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
    console.log(`🌐 CORS habilitado para:`);
    console.log(`   - https://forms-wysaro.vercel.app`);
    console.log(`   - Todos los subdominios *.vercel.app`);
    console.log(`   - localhost:5500, localhost:3000`);
    console.log(`   - ${process.env.FRONTEND_URL || '[FRONTEND_URL no configurada]'}`);
    console.log(`🛡️  Helmet CSP: DESHABILITADO (para permitir fetch cross-origin)`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});
