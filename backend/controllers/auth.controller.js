const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Login
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('🔐 [AUTH] Login attempt for:', username);
        
        // Validar campos
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required.'
            });
        }
        
        // Verificar usuario
        if (username !== ADMIN_USERNAME) {
            console.log('❌ [AUTH] Invalid username');
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials.'
            });
        }
        
        // Verificar password
        const isValidPassword = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
        
        if (!isValidPassword) {
            console.log('❌ [AUTH] Invalid password');
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials.'
            });
        }
        
        console.log('✅ [AUTH] Login successful');
        
        // Generar JWT
        const token = jwt.sign(
            { 
                username: ADMIN_USERNAME,
                role: 'admin'
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        
        res.json({
            success: true,
            token,
            expiresIn: JWT_EXPIRES_IN,
            user: {
                username: ADMIN_USERNAME,
                role: 'admin'
            }
        });
        
    } catch (error) {
        console.error('❌ [AUTH] Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login error. Please try again.'
        });
    }
};

// Verificar token
exports.verify = (req, res) => {
    // Si llegamos aquí, el middleware ya validó el token
    res.json({
        success: true,
        user: req.user
    });
};
