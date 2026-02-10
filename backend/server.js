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

// CORS: Permitir peticiones desde el frontend (mejorado para permitir todos los subdominios de Vercel)
app.use(cors({
    origin: function(origin, callback) {
        // Permitir requests sin origin (como Postman, curl, apps móviles)
        if (!origin) return callback(null, true);
        
        // Lista de dominios permitidos exactos
        const allowedOrigins = [
            'https://forms-wysaro.vercel.app',
            'http://localhost:5500',
            'http://localhost:3000',
            'http://127.0.0.1:5500',
            process.env.FRONTEND_URL
        ].filter(Boolean);
        
        // Permitir TODOS los subdominios de Vercel (incluyendo preview deployments)
        if (origin.endsWith('.vercel.app') || origin.includes('.vercel.app')) {
            console.log('✅ CORS permitido para Vercel subdomain:', origin);
            return callback(null, true);
        }
        
        // Permitir dominios de la lista
        if (allowedOrigins.indexOf(origin) !== -1) {
            console.log('✅ CORS permitido para origin:', origin);
            callback(null, true);
        } else {
            console.log('❌ CORS bloqueado para origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Headers CORS adicionales para asegurar compatibilidad
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Log del origin para debugging
    if (origin) {
        console.log('📡 Request from origin:', origin);
    }
    
    // Permitir todos los subdominios de Vercel
    if (origin && (origin.endsWith('.vercel.app') || origin.includes('.vercel.app'))) {
        res.header('Access-Control-Allow-Origin', origin);
    } else if (origin === 'http://localhost:5500' || origin === 'http://localhost:3000' || origin === 'http://127.0.0.1:5500') {
        res.header('Access-Control-Allow-Origin', origin);
    } else if (origin === 'https://forms-wysaro.vercel.app' || origin === process.env.FRONTEND_URL) {
        res.header('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
        // Si no hay origin (requests desde servidor, Postman, etc), permitir
        res.header('Access-Control-Allow-Origin', '*');
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Manejar preflight requests
    if (req.method === 'OPTIONS') {
        console.log('✅ Preflight request handled for:', origin);
        return res.sendStatus(200);
    }
    
    next();
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
});

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});
