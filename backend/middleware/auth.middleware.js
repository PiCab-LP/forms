const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

// Middleware para proteger rutas
exports.protect = (req, res, next) => {
    try {
        // Buscar token en headers
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('❌ [AUTH] No token provided');
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }
        
        const token = authHeader.split(' ')[1];
        
        console.log('🔍 [AUTH] Validando token...');
        
        // Verificar token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        console.log('✅ [AUTH] Token válido para usuario:', decoded.username);
        
        // Agregar user info al request
        req.user = decoded;
        
        next();
    } catch (error) {
        console.error('❌ [AUTH] Token inválido:', error.message);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please login again.'
            });
        }
        
        return res.status(401).json({
            success: false,
            message: 'Invalid token.'
        });
    }
};
