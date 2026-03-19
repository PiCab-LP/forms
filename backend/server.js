require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const app = express();

// ===========================
// CONFIGURACIÓN DE PROXY (IMPORTANTE PARA RENDER)
// ===========================
// 🔥 Esto debe ir PRIMERO para que obtenga la IP real antes de cualquier chequeo
app.set('trust proxy', 1);

// ===========================
// SEGURIDAD
// ===========================

// 🔥 Helmet con CSP deshabilitado para permitir fetch cross-origin
app.use(helmet({
    contentSecurityPolicy: false, // ← Deshabilitar CSP que bloquea fetch
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false
}));

// ===========================
// CONFIGURACIÓN DE CORS (SOLUCIÓN IPHONE)
// ===========================

// Definimos las opciones en una variable para usarlas en app.use Y en app.options
const corsOptions = {
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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 204 // ← CAMBIO: 204 es mejor para Safari/iOS que 200
};

// 1. Aplicar CORS general
app.use(cors(corsOptions));

// 2. 🔥 LA CORRECCIÓN: Habilitar Preflight (OPTIONS) usando la misma configuración
// Esto reemplaza tu bloque manual anterior y evita el error "Double Header" en iPhone
app.options('*', cors(corsOptions));


// ===========================
// MIDDLEWARES DE SANITIZACIÓN
// ===========================

// Sanitización contra NoSQL injection
app.use(mongoSanitize());


// ===========================
// RATE LIMITING
// ===========================

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


// Rate limiting específico para formularios (TEMPORALMENTE DESHABILITADO/ALTO)
const formSubmitLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5, // Límite de 5 envíos por hora por IP (aplicado para evitar spam)
    message: { 
        success: false, 
        message: 'Too many form submissions. Please try again in 1 hour.' 
    },
    skipSuccessfulRequests: false,
});


// Rate limiting para admin (más flexible) //
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200,
    message: { 
        success: false, 
        message: 'Too many admin requests, please try again later.' 
    }
});

// Rate limiting MUY ESTRICTO exclusivo para Login (Prevención de Fuerza Bruta)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos de bloqueo
    max: 5, // Máximo 5 intentos por IP
    message: { 
        success: false, 
        message: 'Demasiados intentos de inicio de sesión fallidos. Por favor, inténtelo de nuevo en 15 minutos.' 
    },
    // Recomendación: Opcionalmente se puede saltar el límite si el login fue exitoso, 
    // pero para mayor seguridad lo aplicamos a cada intento (exitoso o no).
    skipSuccessfulRequests: false,
});

// ===========================
// BODY PARSERS
// ===========================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


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
const authRoutes = require('./routes/auth.routes'); 


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


// Aplicar limitador de fuerza bruta SOLO a la ruta de inicio de sesión
app.use('/api/auth/login', loginLimiter);

// Aplicar rutas de autenticación
app.use('/api/auth', authRoutes); 

// Aplicar rate limiter específico a formularios
app.use('/api/form', formSubmitLimiter, formRoutes);


// Aplicar rate limiter específico a admin
app.use('/api/admin', adminLimiter, adminRoutes);


// Servir archivos estáticos del frontend (si aplica)
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