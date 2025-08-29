const User = require('../models/User');

/**
 * Middleware للتحقق من صلاحيات المدير
 * يتطلب تسجيل الدخول ودور admin
 */
const requireAdmin = async (req, res, next) => {
    try {
        // التأكد من وجود المستخدم من middleware السابق
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                message: 'يجب تسجيل الدخول أولاً'
            });
        }

        // التحقق من دور المدير
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'ليس لديك صلاحية الوصول لهذا المورد'
            });
        }

        // المتابعة إلى middleware التالي
        next();

    } catch (error) {
        console.error('❌ Admin authorization error:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في التحقق من الصلاحيات'
        });
    }
};

/**
 * Middleware للتحقق من صلاحية تعديل المستخدم
 * يسمح للمستخدم بتعديل بياناته أو للمدير بتعديل أي مستخدم
 */
const canModifyUser = async (req, res, next) => {
    try {
        const targetUserId = req.params.id;
        const currentUser = req.user;

        // إذا كان مدير، يسمح له بالتعديل
        if (currentUser.role === 'admin') {
            return next();
        }

        // إذا كان المستخدم يعدل بياناته الخاصة
        if (currentUser.uid === targetUserId || currentUser._id.toString() === targetUserId) {
            return next();
        }

        // غير مصرح له
        return res.status(403).json({
            status: 'error',
            message: 'ليس لديك صلاحية تعديل هذا المستخدم'
        });

    } catch (error) {
        console.error('❌ User modification authorization error:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في التحقق من الصلاحيات'
        });
    }
};

/**
 * Middleware للتحقق من صلاحية عرض المستخدمين
 * يسمح للمديرين فقط بعرض قائمة المستخدمين
 */
const canViewUsers = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                message: 'يجب تسجيل الدخول أولاً'
            });
        }

        // فقط المدراء يمكنهم عرض قائمة المستخدمين
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'ليس لديك صلاحية عرض قائمة المستخدمين'
            });
        }

        next();

    } catch (error) {
        console.error('❌ Users view authorization error:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في التحقق من الصلاحيات'
        });
    }
};

module.exports = {
    requireAdmin,
    canModifyUser,
    canViewUsers
};
