const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to authenticate JWT token
 */
const authenticateToken = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'الرمز المميز مطلوب للوصول'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        
        // Find user
        const user = await User.findByUID(decoded.uid);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'المستخدم غير موجود'
            });
        }

        // Check if user is active
        if (user.status !== 'active') {
            return res.status(403).json({
                status: 'error',
                message: 'الحساب غير مفعل'
            });
        }

        // Attach user to request
        req.user = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            points: user.points
        };

        next();

    } catch (error) {
        console.error('❌ Authentication error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                status: 'error',
                message: 'الرمز المميز غير صحيح'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                status: 'error',
                message: 'انتهت صلاحية الرمز المميز'
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'خطأ في التحقق من الهوية'
        });
    }
};

/**
 * Middleware to check if user has admin role
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            status: 'error',
            message: 'مطلوب تسجيل الدخول'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            status: 'error',
            message: 'مطلوب صلاحيات إدارية'
        });
    }

    next();
};

/**
 * Middleware to check if user has manager role or higher
 */
const requireManager = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            status: 'error',
            message: 'مطلوب تسجيل الدخول'
        });
    }

    if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({
            status: 'error',
            message: 'مطلوب صلاحيات إدارية'
        });
    }

    next();
};

/**
 * Middleware to check if user has staff role or higher
 */
const requireStaff = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            status: 'error',
            message: 'مطلوب تسجيل الدخول'
        });
    }

    if (!['admin', 'manager', 'staff'].includes(req.user.role)) {
        return res.status(403).json({
            status: 'error',
            message: 'مطلوب صلاحيات الموظف'
        });
    }

    next();
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
            const user = await User.findByUID(decoded.uid);
            
            if (user && user.status === 'active') {
                req.user = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    role: user.role,
                    points: user.points
                };
            }
        }

        next();

    } catch (error) {
        // Continue without authentication
        next();
    }
};

module.exports = {
    authenticateToken,
    requireAdmin,
    requireManager,
    requireStaff,
    optionalAuth
};
