const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        error: 'تم تجاوز الحد المسموح من محاولات تسجيل الدخول. حاول مرة أخرى بعد 15 دقيقة.',
        retryAfter: '15 دقيقة'
    }
});

// Validation middleware
const validateFirebaseAuth = [
    body('uid').notEmpty().withMessage('UID مطلوب'),
    body('email').isEmail().withMessage('البريد الإلكتروني غير صحيح'),
    body('displayName').notEmpty().withMessage('الاسم المعروض مطلوب'),
    body('provider').isIn(['google.com', 'twitter.com']).withMessage('مقدم الخدمة غير مدعوم')
];

/**
 * @route POST /api/auth/firebase
 * @desc Authenticate user with Firebase credentials (Google/Twitter/Email)
 * @access Public
 */
router.post('/firebase', authLimiter, [
    body('uid').notEmpty().withMessage('UID مطلوب'),
    body('email').isEmail().withMessage('البريد الإلكتروني غير صحيح'),
    body('displayName').notEmpty().withMessage('الاسم المعروض مطلوب')
], async (req, res) => {
    try {
        // Check validation results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'بيانات غير صحيحة',
                errors: errors.array()
            });
        }

        const { uid, email, displayName, photoURL, provider } = req.body;

        // Check if user exists
        let user = await User.findByUID(uid);

        if (user) {
            // Update existing user
            user.email = email;
            user.displayName = displayName;
            user.photoURL = photoURL;
            user.activity.lastLoginAt = new Date();
            user.activity.loginCount += 1;
            user.activity.ipAddress = req.ip;
            user.activity.userAgent = req.get('User-Agent');
            
            await user.save();
        } else {
            // Create new user
            user = new User({
                uid,
                email,
                displayName,
                photoURL,
                provider,
                isEmailVerified: true, // Firebase handles verification
                activity: {
                    lastLoginAt: new Date(),
                    loginCount: 1,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                }
            });
            
            await user.save();
        }

        // Generate JWT token with 30 minutes expiration
        const expiresIn = '30m';
        const token = jwt.sign(
            { 
                uid: user.uid, 
                email: user.email,
                role: user.role 
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn }
        );

        // Calculate exact expiration time
        const expirationTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

        // Send response
        res.status(200).json({
            status: 'success',
            message: 'تم تسجيل الدخول بنجاح',
            data: {
                user: user.toSafeObject(),
                token,
                expiresIn: expiresIn,
                expiresAt: expirationTime.toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Firebase auth error:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في تسجيل الدخول',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route POST /api/auth/refresh
 * @desc Refresh JWT token
 * @access Private
 */
router.post('/refresh', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                status: 'error',
                message: 'الرمز المميز مطلوب'
            });
        }

        // Verify the old token (allow expired tokens for refresh)
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                decoded = jwt.decode(token);
            } else {
                throw error;
            }
        }

        // Find user
        const user = await User.findByUID(decoded.uid);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'المستخدم غير موجود'
            });
        }

        // Generate new token with 30 minutes expiration
        const expiresIn = '30m';
        const newToken = jwt.sign(
            { 
                uid: user.uid, 
                email: user.email,
                role: user.role 
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn }
        );

        // Calculate exact expiration time
        const expirationTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

        res.status(200).json({
            status: 'success',
            message: 'تم تحديث الرمز المميز بنجاح',
            data: {
                token: newToken,
                expiresIn: expiresIn,
                expiresAt: expirationTime.toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Token refresh error:', error);
        res.status(401).json({
            status: 'error',
            message: 'فشل في تحديث الرمز المميز'
        });
    }
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout', async (req, res) => {
    try {
        // In a more complex setup, you might want to blacklist the token
        // For now, we'll just send a success response
        res.status(200).json({
            status: 'success',
            message: 'تم تسجيل الخروج بنجاح'
        });

    } catch (error) {
        console.error('❌ Logout error:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في تسجيل الخروج'
        });
    }
});

/**
 * @route GET /api/auth/verify
 * @desc Verify JWT token
 * @access Public
 */
router.get('/verify', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'لا يوجد رمز مميز'
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

        res.status(200).json({
            status: 'success',
            message: 'الرمز المميز صحيح',
            data: {
                user: user.toSafeObject(),
                tokenValid: true
            }
        });

    } catch (error) {
        console.error('❌ Token verification error:', error);
        res.status(401).json({
            status: 'error',
            message: 'الرمز المميز غير صحيح',
            tokenValid: false
        });
    }
});

/**
 * @route POST /api/auth/register
 * @desc Register new user with email/password
 * @access Public
 */
router.post('/register', [
    body('email').isEmail().withMessage('البريد الإلكتروني غير صحيح'),
    body('password').isLength({ min: 6 }).withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
    body('displayName').notEmpty().withMessage('الاسم المعروض مطلوب')
], async (req, res) => {
    try {
        // Check validation results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'بيانات غير صحيحة',
                errors: errors.array()
            });
        }

        const { email, password, displayName } = req.body;

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                status: 'error',
                message: 'البريد الإلكتروني مستخدم مسبقاً'
            });
        }

        // Create new user
        const uid = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const user = new User({
            uid,
            email,
            displayName,
            password,
            provider: 'email',
            activity: {
                lastLoginAt: new Date(),
                loginCount: 1,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });

        await user.save();

        // Generate JWT token with 30 minutes expiration
        const expiresIn = '30m';
        const token = jwt.sign(
            { 
                uid: user.uid, 
                email: user.email,
                role: user.role 
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn }
        );

        // Calculate exact expiration time
        const expirationTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

        res.status(201).json({
            status: 'success',
            message: 'تم إنشاء الحساب بنجاح',
            data: {
                user: user.toSafeObject(),
                token,
                expiresIn: expiresIn,
                expiresAt: expirationTime.toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في إنشاء الحساب'
        });
    }
});

/**
 * @route POST /api/auth/login
 * @desc Login with email/password
 * @access Public
 */
router.post('/login', authLimiter, [
    body('email').isEmail().withMessage('البريد الإلكتروني غير صحيح'),
    body('password').notEmpty().withMessage('كلمة المرور مطلوبة')
], async (req, res) => {
    try {
        // Check validation results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'بيانات غير صحيحة',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Find user and include password for comparison
        const user = await User.findByEmail(email).select('+password');
        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                status: 'error',
                message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            });
        }

        // Update login activity
        user.activity.lastLoginAt = new Date();
        user.activity.loginCount += 1;
        user.activity.ipAddress = req.ip;
        user.activity.userAgent = req.get('User-Agent');
        await user.save();

        // Generate JWT token with 30 minutes expiration
        const expiresIn = '30m';
        const token = jwt.sign(
            { 
                uid: user.uid, 
                email: user.email,
                role: user.role 
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn }
        );

        // Calculate exact expiration time
        const expirationTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

        res.status(200).json({
            status: 'success',
            message: 'تم تسجيل الدخول بنجاح',
            data: {
                user: user.toSafeObject(),
                token,
                expiresIn: expiresIn,
                expiresAt: expirationTime.toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في تسجيل الدخول'
        });
    }
});

module.exports = router;
