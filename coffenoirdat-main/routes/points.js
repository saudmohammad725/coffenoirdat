const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const PointsTransaction = require('../models/PointsTransaction');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for points operations
const pointsLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per minute
    message: {
        error: 'تم تجاوز الحد المسموح من العمليات. حاول مرة أخرى بعد دقيقة.',
        retryAfter: '1 دقيقة'
    }
});

/**
 * @route GET /api/points/packages
 * @desc Get available points packages
 * @access Public
 */
router.get('/packages', async (req, res) => {
    try {
        const packages = [
            // Small packages
            { points: 10, price: 10, popular: false, bonus: 0 },
            { points: 20, price: 20, popular: false, bonus: 0 },
            { points: 30, price: 30, popular: false, bonus: 0 },
            { points: 40, price: 40, popular: false, bonus: 0 },
            { points: 50, price: 50, popular: false, bonus: 0 },
            { points: 60, price: 60, popular: false, bonus: 0 },
            { points: 70, price: 70, popular: false, bonus: 0 },
            { points: 80, price: 80, popular: false, bonus: 0 },
            { points: 90, price: 90, popular: false, bonus: 0 },
            
            // Popular packages with bonuses
            { points: 100, price: 100, popular: true, bonus: 20, tag: 'عرض مميز' },
            { points: 110, price: 110, popular: false, bonus: 0 },
            { points: 120, price: 120, popular: false, bonus: 0 },
            { points: 130, price: 130, popular: false, bonus: 0 },
            { points: 140, price: 140, popular: false, bonus: 0 },
            { points: 150, price: 150, popular: false, bonus: 0 },
            { points: 160, price: 160, popular: false, bonus: 0 },
            { points: 170, price: 170, popular: false, bonus: 0 },
            { points: 180, price: 180, popular: false, bonus: 0 },
            { points: 190, price: 190, popular: false, bonus: 0 },
            { points: 200, price: 200, popular: false, bonus: 0 },
            { points: 250, price: 250, popular: false, bonus: 0 },
            
            // Medium packages
            { points: 300, price: 300, popular: true, bonus: 35, tag: 'وفر أكثر' },
            { points: 350, price: 350, popular: false, bonus: 0 },
            { points: 400, price: 400, popular: false, bonus: 0 },
            { points: 450, price: 450, popular: false, bonus: 0 },
            
            // Large packages
            { points: 500, price: 500, popular: true, bonus: 50, tag: 'الأكثر طلباً' },
            { points: 550, price: 550, popular: false, bonus: 0 },
            { points: 600, price: 600, popular: false, bonus: 0 },
            { points: 650, price: 650, popular: false, bonus: 0 },
            { points: 700, price: 700, popular: false, bonus: 0 },
            { points: 750, price: 750, popular: false, bonus: 0 },
            { points: 800, price: 800, popular: false, bonus: 0 },
            { points: 850, price: 850, popular: false, bonus: 0 },
            { points: 900, price: 900, popular: false, bonus: 0 },
            { points: 950, price: 950, popular: false, bonus: 0 },
            
            // Premium package
            { points: 1000, price: 1000, popular: true, bonus: 100, tag: 'أفضل قيمة' }
        ];

        // Add calculated fields
        const enrichedPackages = packages.map(pkg => ({
            ...pkg,
            totalPoints: pkg.points + pkg.bonus,
            savings: pkg.bonus > 0 ? ((pkg.bonus / pkg.points) * 100).toFixed(0) + '%' : null,
            pricePerPoint: (pkg.price / (pkg.points + pkg.bonus)).toFixed(2)
        }));

        res.status(200).json({
            status: 'success',
            message: 'تم جلب باقات النقاط بنجاح',
            data: {
                packages: enrichedPackages,
                currency: 'SAR',
                totalPackages: enrichedPackages.length
            }
        });

    } catch (error) {
        console.error('❌ Error fetching packages:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في جلب باقات النقاط'
        });
    }
});

/**
 * @route GET /api/points/balance/:uid
 * @desc Get user's current points balance
 * @access Private
 */
router.get('/balance/:uid', authenticateToken, async (req, res) => {
    try {
        const { uid } = req.params;

        // Check if user is authorized to view this balance
        if (req.user.uid !== uid && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'غير مخول لعرض هذا الرصيد'
            });
        }

        const user = await User.findByUID(uid);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'المستخدم غير موجود'
            });
        }

        // Get recent transactions
        const recentTransactions = await PointsTransaction.findByUser(uid, { limit: 10 });

        res.status(200).json({
            status: 'success',
            message: 'تم جلب رصيد النقاط بنجاح',
            data: {
                balance: {
                    current: user.points.current,
                    total: user.points.total,
                    used: user.points.used
                },
                user: {
                    uid: user.uid,
                    displayName: user.displayName,
                    tier: user.loyalty.tier
                },
                recentTransactions: recentTransactions,
                nextTierPoints: user.pointsToNextTier
            }
        });

    } catch (error) {
        console.error('❌ Error fetching balance:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في جلب رصيد النقاط'
        });
    }
});

/**
 * @route POST /api/points/purchase
 * @desc Purchase points package
 * @access Private
 */
router.post('/purchase', pointsLimiter, authenticateToken, [
    body('packagePoints').isInt({ min: 10, max: 1000 }).withMessage('كمية النقاط غير صحيحة'),
    body('packagePrice').isFloat({ min: 1 }).withMessage('سعر الباقة غير صحيح'),
    body('paymentMethod').isIn(['card', 'cash', 'online']).withMessage('طريقة الدفع غير صحيحة'),
    body('paymentDetails').optional().isObject()
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

        const { packagePoints, packagePrice, paymentMethod, paymentDetails } = req.body;
        const { uid } = req.user;

        // Find user
        const user = await User.findByUID(uid);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'المستخدم غير موجود'
            });
        }

        // Calculate bonus points
        let bonusPoints = 0;
        if (packagePoints === 100) bonusPoints = 20;
        else if (packagePoints === 300) bonusPoints = 35;
        else if (packagePoints === 500) bonusPoints = 50;
        else if (packagePoints === 1000) bonusPoints = 100;

        const totalPoints = packagePoints + bonusPoints;

        // Create purchase transaction
        const purchaseTransaction = new PointsTransaction({
            user: {
                uid: user.uid,
                name: user.displayName,
                email: user.email
            },
            type: 'purchase',
            points: {
                amount: totalPoints,
                balanceBefore: user.points.current,
                balanceAfter: user.points.current + totalPoints
            },
            relatedPackage: {
                packageSize: packagePoints,
                purchasePrice: packagePrice,
                currency: 'SAR',
                paymentMethod,
                paymentDetails
            },
            status: 'completed', // In real app, this would be 'pending' until payment confirms
            metadata: {
                source: 'website',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });

        await purchaseTransaction.save();

        // Create bonus transaction if applicable
        if (bonusPoints > 0) {
            const bonusTransaction = new PointsTransaction({
                user: {
                    uid: user.uid,
                    name: user.displayName,
                    email: user.email
                },
                type: 'bonus',
                points: {
                    amount: bonusPoints,
                    balanceBefore: user.points.current + packagePoints,
                    balanceAfter: user.points.current + totalPoints
                },
                bonus: {
                    reason: 'promotion',
                    description: `نقاط مجانية مع شراء باقة ${packagePoints} نقطة`,
                    promotionCode: `BONUS_${packagePoints}`
                },
                status: 'completed',
                metadata: {
                    source: 'website',
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                }
            });

            await bonusTransaction.save();
        }

        // Update user points
        await user.addPoints(totalPoints, 'شراء باقة نقاط');

        res.status(200).json({
            status: 'success',
            message: 'تم شراء النقاط بنجاح',
            data: {
                purchaseTransaction: purchaseTransaction.toObject(),
                bonusTransaction: bonusPoints > 0 ? bonusPoints : null,
                newBalance: {
                    current: user.points.current,
                    total: user.points.total,
                    used: user.points.used
                },
                pointsAdded: totalPoints,
                bonusReceived: bonusPoints
            }
        });

    } catch (error) {
        console.error('❌ Error purchasing points:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في شراء النقاط'
        });
    }
});

/**
 * @route POST /api/points/redeem
 * @desc Redeem points for products
 * @access Private
 */
router.post('/redeem', pointsLimiter, authenticateToken, [
    body('pointsToRedeem').isInt({ min: 1 }).withMessage('كمية النقاط المراد استخدامها غير صحيحة'),
    body('items').isArray({ min: 1 }).withMessage('قائمة المنتجات مطلوبة'),
    body('orderNumber').optional().isString()
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

        const { pointsToRedeem, items, orderNumber } = req.body;
        const { uid } = req.user;

        // Find user
        const user = await User.findByUID(uid);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'المستخدم غير موجود'
            });
        }

        // Check if user has enough points
        if (user.points.current < pointsToRedeem) {
            return res.status(400).json({
                status: 'error',
                message: 'النقاط غير كافية',
                data: {
                    required: pointsToRedeem,
                    available: user.points.current,
                    shortage: pointsToRedeem - user.points.current
                }
            });
        }

        // Create redemption transaction
        const redemptionTransaction = new PointsTransaction({
            user: {
                uid: user.uid,
                name: user.displayName,
                email: user.email
            },
            type: 'redemption',
            points: {
                amount: -pointsToRedeem, // Negative for deduction
                balanceBefore: user.points.current,
                balanceAfter: user.points.current - pointsToRedeem
            },
            redemption: {
                items: items.map(item => ({
                    productName: item.name,
                    quantity: item.quantity || 1,
                    pointsValue: item.pointsPrice || 0
                })),
                totalPointsUsed: pointsToRedeem
            },
            relatedOrder: orderNumber ? { orderNumber } : undefined,
            status: 'completed',
            metadata: {
                source: 'website',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });

        await redemptionTransaction.save();

        // Deduct points from user
        await user.deductPoints(pointsToRedeem, 'استخدام نقاط للشراء');

        res.status(200).json({
            status: 'success',
            message: 'تم استخدام النقاط بنجاح',
            data: {
                transaction: redemptionTransaction.toObject(),
                newBalance: {
                    current: user.points.current,
                    total: user.points.total,
                    used: user.points.used
                },
                pointsUsed: pointsToRedeem,
                remainingPoints: user.points.current
            }
        });

    } catch (error) {
        console.error('❌ Error redeeming points:', error);
        
        if (error.message === 'النقاط غير كافية') {
            return res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
        
        res.status(500).json({
            status: 'error',
            message: 'خطأ في استخدام النقاط'
        });
    }
});

/**
 * @route GET /api/points/transactions/:uid
 * @desc Get user's points transaction history
 * @access Private
 */
router.get('/transactions/:uid', authenticateToken, [
    query('page').optional().isInt({ min: 1 }).withMessage('رقم الصفحة غير صحيح'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('حد العناصر غير صحيح'),
    query('type').optional().isIn(['purchase', 'redemption', 'bonus', 'refund', 'adjustment'])
], async (req, res) => {
    try {
        const { uid } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const type = req.query.type;

        // Check if user is authorized
        if (req.user.uid !== uid && req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'غير مخول لعرض هذه المعاملات'
            });
        }

        // Build query options
        const options = {
            limit: limit,
            skip: (page - 1) * limit
        };

        if (type) options.type = type;

        // Get transactions
        const transactions = await PointsTransaction.findByUser(uid, options);
        const totalTransactions = await PointsTransaction.countDocuments({ 'user.uid': uid });

        res.status(200).json({
            status: 'success',
            message: 'تم جلب تاريخ المعاملات بنجاح',
            data: {
                transactions,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalTransactions / limit),
                    totalTransactions,
                    limit,
                    hasNext: page < Math.ceil(totalTransactions / limit),
                    hasPrev: page > 1
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching transactions:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في جلب تاريخ المعاملات'
        });
    }
});

/**
 * @route GET /api/points/stats
 * @desc Get points system statistics (Admin only)
 * @access Private (Admin)
 */
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'غير مخول لعرض الإحصائيات'
            });
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Get various statistics
        const [
            totalUsers,
            totalPointsIssued,
            totalPointsRedeemed,
            transactionStats,
            topUsers
        ] = await Promise.all([
            User.countDocuments({ status: 'active' }),
            PointsTransaction.aggregate([
                { $match: { type: { $in: ['purchase', 'bonus'] }, status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$points.amount' } } }
            ]),
            PointsTransaction.aggregate([
                { $match: { type: 'redemption', status: 'completed' } },
                { $group: { _id: null, total: { $sum: { $abs: '$points.amount' } } } }
            ]),
            PointsTransaction.getTransactionStats(thirtyDaysAgo, new Date()),
            PointsTransaction.getTopUsers(thirtyDaysAgo, new Date(), 5)
        ]);

        res.status(200).json({
            status: 'success',
            message: 'تم جلب الإحصائيات بنجاح',
            data: {
                overview: {
                    totalUsers,
                    totalPointsIssued: totalPointsIssued[0]?.total || 0,
                    totalPointsRedeemed: totalPointsRedeemed[0]?.total || 0,
                    pointsInCirculation: (totalPointsIssued[0]?.total || 0) - (totalPointsRedeemed[0]?.total || 0)
                },
                transactionStats,
                topUsers,
                period: '30 يوم الماضية'
            }
        });

    } catch (error) {
        console.error('❌ Error fetching stats:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في جلب الإحصائيات'
        });
    }
});

/**
 * @route POST /api/points/add
 * @desc Add points to user (after purchase or admin action)
 * @access Private (Admin or special operations)
 */
router.post('/add', pointsLimiter, authenticateToken, [
    body('userUid').notEmpty().withMessage('معرف المستخدم مطلوب'),
    body('points').isInt({ min: 1 }).withMessage('عدد النقاط يجب أن يكون رقم موجب'),
    body('reason').notEmpty().withMessage('سبب إضافة النقاط مطلوب'),
    body('source').optional().isIn(['purchase', 'bonus', 'admin', 'promotion', 'refund']).withMessage('مصدر النقاط غير صحيح'),
    body('adminNote').optional().isString(),
    body('relatedOrder').optional().isString()
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

        const { userUid, points, reason, source = 'admin', adminNote, relatedOrder } = req.body;
        const isAdmin = req.user.role === 'admin';
        const isOwner = req.user.uid === userUid;

        // Check permissions
        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                status: 'error',
                message: 'ليس لديك صلاحية إضافة نقاط لهذا المستخدم'
            });
        }

        // Additional restrictions for non-admin users
        if (!isAdmin) {
            // Non-admin users can only add points from specific sources
            if (!['purchase', 'bonus'].includes(source)) {
                return res.status(403).json({
                    status: 'error',
                    message: 'مصدر النقاط غير مسموح'
                });
            }

            // Limit the amount non-admin users can add
            if (points > 1000) {
                return res.status(400).json({
                    status: 'error',
                    message: 'لا يمكن إضافة أكثر من 1000 نقطة في المرة الواحدة'
                });
            }
        }

        // Find target user
        const targetUser = await User.findByUID(userUid);
        if (!targetUser) {
            return res.status(404).json({
                status: 'error',
                message: 'المستخدم المستهدف غير موجود'
            });
        }

        // Create transaction record
        const transaction = new PointsTransaction({
            user: {
                uid: targetUser.uid,
                name: targetUser.displayName,
                email: targetUser.email
            },
            type: source,
            points: {
                amount: points,
                balanceBefore: targetUser.points.current,
                balanceAfter: targetUser.points.current + points
            },
            description: reason,
            relatedOrder: relatedOrder ? { orderNumber: relatedOrder } : undefined,
            status: 'completed',
            adminAction: isAdmin ? {
                adminUid: req.user.uid,
                adminName: req.user.displayName || req.user.email,
                note: adminNote,
                timestamp: new Date()
            } : undefined,
            metadata: {
                source: 'api',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                initiatedBy: req.user.uid
            }
        });

        await transaction.save();

        // Add points to user
        await targetUser.addPoints(points, reason);

        // Log the action
        console.log(`💰 ${points} points added to user ${targetUser.uid} by ${req.user.uid} (${source})`);

        res.status(200).json({
            status: 'success',
            message: 'تم إضافة النقاط بنجاح',
            data: {
                transaction: transaction.toObject(),
                targetUser: {
                    uid: targetUser.uid,
                    displayName: targetUser.displayName,
                    newBalance: targetUser.points.current
                },
                pointsAdded: points,
                source: source,
                initiatedBy: {
                    uid: req.user.uid,
                    isAdmin: isAdmin
                }
            }
        });

    } catch (error) {
        console.error('❌ Error adding points:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في إضافة النقاط'
        });
    }
});

/**
 * @route POST /api/points/deduct
 * @desc Deduct points from user (Admin only)
 * @access Private (Admin)
 */
router.post('/deduct', pointsLimiter, authenticateToken, [
    body('userUid').notEmpty().withMessage('معرف المستخدم مطلوب'),
    body('points').isInt({ min: 1 }).withMessage('عدد النقاط يجب أن يكون رقم موجب'),
    body('reason').notEmpty().withMessage('سبب خصم النقاط مطلوب'),
    body('adminNote').optional().isString()
], async (req, res) => {
    try {
        // Only admins can deduct points
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'فقط المديرين يمكنهم خصم النقاط'
            });
        }

        // Check validation results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'بيانات غير صحيحة',
                errors: errors.array()
            });
        }

        const { userUid, points, reason, adminNote } = req.body;

        // Find target user
        const targetUser = await User.findByUID(userUid);
        if (!targetUser) {
            return res.status(404).json({
                status: 'error',
                message: 'المستخدم المستهدف غير موجود'
            });
        }

        // Check if user has enough points
        if (targetUser.points.current < points) {
            return res.status(400).json({
                status: 'error',
                message: 'المستخدم لا يملك نقاط كافية',
                data: {
                    requested: points,
                    available: targetUser.points.current,
                    shortage: points - targetUser.points.current
                }
            });
        }

        // Create transaction record
        const transaction = new PointsTransaction({
            user: {
                uid: targetUser.uid,
                name: targetUser.displayName,
                email: targetUser.email
            },
            type: 'adjustment',
            points: {
                amount: -points, // Negative for deduction
                balanceBefore: targetUser.points.current,
                balanceAfter: targetUser.points.current - points
            },
            description: reason,
            status: 'completed',
            adminAction: {
                adminUid: req.user.uid,
                adminName: req.user.displayName || req.user.email,
                note: adminNote,
                timestamp: new Date()
            },
            metadata: {
                source: 'admin_deduction',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });

        await transaction.save();

        // Deduct points from user
        await targetUser.deductPoints(points, reason);

        // Log the action
        console.log(`💸 ${points} points deducted from user ${targetUser.uid} by admin ${req.user.uid}`);

        res.status(200).json({
            status: 'success',
            message: 'تم خصم النقاط بنجاح',
            data: {
                transaction: transaction.toObject(),
                targetUser: {
                    uid: targetUser.uid,
                    displayName: targetUser.displayName,
                    newBalance: targetUser.points.current
                },
                pointsDeducted: points,
                admin: {
                    uid: req.user.uid,
                    name: req.user.displayName || req.user.email
                }
            }
        });

    } catch (error) {
        console.error('❌ Error deducting points:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في خصم النقاط'
        });
    }
});

module.exports = router;
