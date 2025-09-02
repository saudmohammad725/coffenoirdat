const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin, canModifyUser, canViewUsers } = require('../middleware/admin');

const router = express.Router();

/**
 * @route GET /api/users/profile/:uid
 * @desc Get user profile
 * @access Private
 */
router.get('/profile/:uid', authenticateToken, async (req, res) => {
    try {
        const { uid } = req.params;

        // Check if user can access this profile
        if (req.user.uid !== uid && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'غير مخول لعرض هذا الملف الشخصي'
            });
        }

        const user = await User.findByUID(uid);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'المستخدم غير موجود'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'تم جلب الملف الشخصي بنجاح',
            data: {
                user: user.toSafeObject()
            }
        });

    } catch (error) {
        console.error('❌ Error fetching profile:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في جلب الملف الشخصي'
        });
    }
});

/**
 * @route PUT /api/users/profile/:uid
 * @desc Update user profile
 * @access Private
 */
router.put('/profile/:uid', authenticateToken, [
    body('displayName').optional().isLength({ min: 1, max: 50 }).withMessage('الاسم يجب أن يكون بين 1 و 50 حرف'),
    body('profile.phone').optional().isMobilePhone().withMessage('رقم الهاتف غير صحيح'),
    body('settings.language').optional().isIn(['ar', 'en']).withMessage('اللغة غير مدعومة'),
    body('settings.currency').optional().isIn(['SAR', 'USD', 'EUR']).withMessage('العملة غير مدعومة')
], async (req, res) => {
    try {
        const { uid } = req.params;

        // Check validation results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'بيانات غير صحيحة',
                errors: errors.array()
            });
        }

        // Check if user can update this profile
        if (req.user.uid !== uid && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'غير مخول لتعديل هذا الملف الشخصي'
            });
        }

        const user = await User.findByUID(uid);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'المستخدم غير موجود'
            });
        }

        // Update allowed fields
        const allowedUpdates = ['displayName', 'profile', 'settings'];
        const updates = {};

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                if (field === 'profile' || field === 'settings') {
                    updates[field] = { ...user[field], ...req.body[field] };
                } else {
                    updates[field] = req.body[field];
                }
            }
        });

        // Apply updates
        Object.assign(user, updates);
        await user.save();

        res.status(200).json({
            status: 'success',
            message: 'تم تحديث الملف الشخصي بنجاح',
            data: {
                user: user.toSafeObject()
            }
        });

    } catch (error) {
        console.error('❌ Error updating profile:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في تحديث الملف الشخصي'
        });
    }
});

/**
 * @route GET /api/users/leaderboard
 * @desc Get top users by points
 * @access Public
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const topUsers = await User.getTopUsers(limit);

        res.status(200).json({
            status: 'success',
            message: 'تم جلب قائمة المتصدرين بنجاح',
            data: {
                topUsers,
                limit
            }
        });

    } catch (error) {
        console.error('❌ Error fetching leaderboard:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في جلب قائمة المتصدرين'
        });
    }
});

/**
 * @route GET /api/users
 * @desc Get all users (Admin only)
 * @access Private (Admin)
 */
router.get('/', authenticateToken, canViewUsers, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const role = req.query.role;

        // Build query
        const query = {};
        if (status) query.status = status;
        if (role) query.role = role;

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit);

        const totalUsers = await User.countDocuments(query);

        res.status(200).json({
            status: 'success',
            message: 'تم جلب قائمة المستخدمين بنجاح',
            data: {
                users,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalUsers / limit),
                    totalUsers,
                    limit,
                    hasNext: page < Math.ceil(totalUsers / limit),
                    hasPrev: page > 1
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching users:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في جلب قائمة المستخدمين'
        });
    }
});

/**
 * @route GET /api/users/:id
 * @desc Get specific user by ID
 * @access Private (User themselves or Admin)
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Find user by ID or UID
        let user = await User.findById(id).catch(() => null);
        if (!user) {
            user = await User.findByUID(id);
        }

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'المستخدم غير موجود'
            });
        }

        // Check permissions
        if (req.user.uid !== user.uid && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'ليس لديك صلاحية عرض هذا المستخدم'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'تم جلب بيانات المستخدم بنجاح',
            data: {
                user: user.toSafeObject()
            }
        });

    } catch (error) {
        console.error('❌ Error fetching user:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في جلب بيانات المستخدم'
        });
    }
});

/**
 * @route PATCH /api/users/:id
 * @desc Update user data (points, status, role)
 * @access Private (User themselves or Admin)
 */
router.patch('/:id', authenticateToken, canModifyUser, [
    body('points').optional().isInt({ min: 0 }).withMessage('النقاط يجب أن تكون رقم صحيح غير سالب'),
    body('status').optional().isIn(['active', 'inactive', 'banned']).withMessage('الحالة غير صحيحة'),
    body('role').optional().isIn(['user', 'admin']).withMessage('الدور غير صحيح'),
    body('displayName').optional().isLength({ min: 1, max: 50 }).withMessage('الاسم يجب أن يكون بين 1 و 50 حرف'),
    body('profile').optional().isObject().withMessage('بيانات الملف الشخصي غير صحيحة'),
    body('settings').optional().isObject().withMessage('الإعدادات غير صحيحة')
], async (req, res) => {
    try {
        const { id } = req.params;

        // Check validation results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'بيانات غير صحيحة',
                errors: errors.array()
            });
        }

        // Find user by ID or UID
        let user = await User.findById(id).catch(() => null);
        if (!user) {
            user = await User.findByUID(id);
        }

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'المستخدم غير موجود'
            });
        }

        // Check what can be updated based on user role
        const isAdmin = req.user.role === 'admin';
        const isSelfUpdate = req.user.uid === user.uid;

        // Fields that only admins can update
        const adminOnlyFields = ['role', 'status'];
        
        // Fields that anyone can update about themselves (or admin about anyone)
        const allowedFields = ['displayName', 'profile', 'settings', 'points'];

        const updates = {};
        
        // Process updates
        for (const [field, value] of Object.entries(req.body)) {
            if (adminOnlyFields.includes(field)) {
                if (!isAdmin) {
                    return res.status(403).json({
                        status: 'error',
                        message: `ليس لديك صلاحية تعديل ${field}`
                    });
                }
                updates[field] = value;
            } else if (allowedFields.includes(field)) {
                if (field === 'points') {
                    // Special handling for points
                    if (!isAdmin && !isSelfUpdate) {
                        return res.status(403).json({
                            status: 'error',
                            message: 'ليس لديك صلاحية تعديل النقاط'
                        });
                    }
                    updates[field] = value;
                } else if (field === 'profile' || field === 'settings') {
                    // Merge objects
                    updates[field] = { ...user[field], ...value };
                } else {
                    updates[field] = value;
                }
            }
        }

        // Apply updates
        Object.assign(user, updates);
        await user.save();

        // Log the update
        console.log(`✅ User ${user.uid} updated by ${req.user.uid}:`, Object.keys(updates));

        res.status(200).json({
            status: 'success',
            message: 'تم تحديث بيانات المستخدم بنجاح',
            data: {
                user: user.toSafeObject(),
                updatedFields: Object.keys(updates)
            }
        });

    } catch (error) {
        console.error('❌ Error updating user:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في تحديث بيانات المستخدم'
        });
    }
});

/**
 * @route DELETE /api/users/:id
 * @desc Delete user (Admin only)
 * @access Private (Admin)
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Find user by ID or UID
        let user = await User.findById(id).catch(() => null);
        if (!user) {
            user = await User.findByUID(id);
        }

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'المستخدم غير موجود'
            });
        }

        // Prevent self-deletion
        if (req.user.uid === user.uid) {
            return res.status(400).json({
                status: 'error',
                message: 'لا يمكنك حذف حسابك بنفسك'
            });
        }

        // Soft delete by setting status to 'deleted'
        user.status = 'deleted';
        user.deletedAt = new Date();
        await user.save();

        console.log(`🗑️ User ${user.uid} soft deleted by admin ${req.user.uid}`);

        res.status(200).json({
            status: 'success',
            message: 'تم حذف المستخدم بنجاح'
        });

    } catch (error) {
        console.error('❌ Error deleting user:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في حذف المستخدم'
        });
    }
});

module.exports = router;
