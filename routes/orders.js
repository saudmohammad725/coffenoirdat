const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const User = require('../models/User');
const PointsTransaction = require('../models/PointsTransaction');
const { authenticateToken, requireStaff } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();

/**
 * @route POST /api/orders
 * @desc Create new order
 * @access Private
 */
router.post('/', authenticateToken, [
    body('items').isArray({ min: 1 }).withMessage('قائمة المنتجات مطلوبة'),
    body('orderType').isIn(['dine_in', 'takeaway', 'delivery']).withMessage('نوع الطلب غير صحيح'),
    body('payment.method').isIn(['points', 'cash', 'card', 'mixed']).withMessage('طريقة الدفع غير صحيحة')
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

        const { items, orderType, payment, delivery, notes } = req.body;
        const { uid } = req.user;

        // Find user
        const user = await User.findByUID(uid);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'المستخدم غير موجود'
            });
        }

        // Validate items and calculate totals
        let subtotal = 0;
        const processedItems = items.map(item => {
            const itemSubtotal = (item.price || item.pointsPrice || 0) * item.quantity;
            subtotal += itemSubtotal;
            
            return {
                ...item,
                subtotal: itemSubtotal
            };
        });

        // Check if user has enough points for points payment
        if (payment.method === 'points' || payment.pointsUsed > 0) {
            const requiredPoints = payment.pointsUsed || subtotal;
            if (user.points.current < requiredPoints) {
                return res.status(400).json({
                    status: 'error',
                    message: 'النقاط غير كافية',
                    data: {
                        required: requiredPoints,
                        available: user.points.current,
                        shortage: requiredPoints - user.points.current
                    }
                });
            }
        }

        // Create order
        const order = new Order({
            customer: {
                uid: user.uid,
                name: user.displayName,
                email: user.email,
                phone: user.profile?.phone
            },
            items: processedItems,
            orderType,
            payment: {
                ...payment,
                status: 'pending'
            },
            delivery: delivery || {},
            notes: notes || {},
            metadata: {
                source: 'website',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });

        await order.save();

        // Process points payment if applicable
        if (payment.method === 'points' || payment.pointsUsed > 0) {
            const pointsToUse = payment.pointsUsed || subtotal;
            
            // Create redemption transaction
            const redemptionTransaction = new PointsTransaction({
                user: {
                    uid: user.uid,
                    name: user.displayName,
                    email: user.email
                },
                type: 'redemption',
                points: {
                    amount: -pointsToUse,
                    balanceBefore: user.points.current,
                    balanceAfter: user.points.current - pointsToUse
                },
                relatedOrder: {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    orderTotal: order.totals.total
                },
                redemption: {
                    items: processedItems.map(item => ({
                        productName: item.name,
                        quantity: item.quantity,
                        pointsValue: item.pointsPrice || 0
                    })),
                    totalPointsUsed: pointsToUse
                },
                status: 'completed',
                metadata: {
                    source: 'website',
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                }
            });

            await redemptionTransaction.save();

            // Deduct points from user
            await user.deductPoints(pointsToUse, `طلب رقم ${order.orderNumber}`);

            // Update order payment status
            order.payment.status = 'completed';
            await order.save();
        }

        res.status(201).json({
            status: 'success',
            message: 'تم إنشاء الطلب بنجاح',
            data: {
                order: order.toObject(),
                userBalance: {
                    current: user.points.current,
                    total: user.points.total,
                    used: user.points.used
                }
            }
        });

    } catch (error) {
        console.error('❌ Error creating order:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في إنشاء الطلب'
        });
    }
});

/**
 * @route GET /api/orders/user/:uid
 * @desc Get user's orders
 * @access Private
 */
router.get('/user/:uid', authenticateToken, async (req, res) => {
    try {
        const { uid } = req.params;
        const limit = parseInt(req.query.limit) || 20;

        // Check if user can access these orders
        if (req.user.uid !== uid && !['admin', 'manager', 'staff'].includes(req.user.role)) {
            return res.status(403).json({
                status: 'error',
                message: 'غير مخول لعرض هذه الطلبات'
            });
        }

        const orders = await Order.findByCustomer(uid, limit);

        res.status(200).json({
            status: 'success',
            message: 'تم جلب الطلبات بنجاح',
            data: {
                orders,
                totalOrders: orders.length
            }
        });

    } catch (error) {
        console.error('❌ Error fetching user orders:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في جلب الطلبات'
        });
    }
});

/**
 * @route GET /api/orders/:orderNumber
 * @desc Get specific order by order number
 * @access Private
 */
router.get('/:orderNumber', authenticateToken, async (req, res) => {
    try {
        const { orderNumber } = req.params;

        const order = await Order.findByOrderNumber(orderNumber);
        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: 'الطلب غير موجود'
            });
        }

        // Check if user can access this order
        if (order.customer.uid !== req.user.uid && !['admin', 'manager', 'staff'].includes(req.user.role)) {
            return res.status(403).json({
                status: 'error',
                message: 'غير مخول لعرض هذا الطلب'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'تم جلب الطلب بنجاح',
            data: {
                order: order.toObject()
            }
        });

    } catch (error) {
        console.error('❌ Error fetching order:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في جلب الطلب'
        });
    }
});

/**
 * @route PUT /api/orders/:orderNumber/status
 * @desc Update order status (Staff only)
 * @access Private (Staff)
 */
router.put('/:orderNumber/status', authenticateToken, requireStaff, [
    body('status').isIn(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']).withMessage('حالة الطلب غير صحيحة'),
    body('staffInfo').optional().isObject()
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

        const { orderNumber } = req.params;
        const { status, staffInfo } = req.body;

        const order = await Order.findByOrderNumber(orderNumber);
        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: 'الطلب غير موجود'
            });
        }

        // Add staff information
        const staffData = {
            id: req.user.uid,
            name: req.user.displayName,
            role: req.user.role,
            ...staffInfo
        };

        await order.updateStatus(status, staffData);

        res.status(200).json({
            status: 'success',
            message: 'تم تحديث حالة الطلب بنجاح',
            data: {
                order: order.toObject()
            }
        });

    } catch (error) {
        console.error('❌ Error updating order status:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في تحديث حالة الطلب'
        });
    }
});

/**
 * @route POST /api/orders/:orderNumber/feedback
 * @desc Add feedback to order
 * @access Private
 */
router.post('/:orderNumber/feedback', authenticateToken, [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('التقييم يجب أن يكون بين 1 و 5'),
    body('comment').optional().isLength({ max: 500 }).withMessage('التعليق يجب أن يكون أقل من 500 حرف')
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

        const { orderNumber } = req.params;
        const { rating, comment } = req.body;

        const order = await Order.findByOrderNumber(orderNumber);
        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: 'الطلب غير موجود'
            });
        }

        // Check if user owns this order
        if (order.customer.uid !== req.user.uid) {
            return res.status(403).json({
                status: 'error',
                message: 'غير مخول لتقييم هذا الطلب'
            });
        }

        // Check if order is completed
        if (order.status !== 'completed') {
            return res.status(400).json({
                status: 'error',
                message: 'لا يمكن تقييم الطلب قبل اكتماله'
            });
        }

        await order.addFeedback(rating, comment);

        res.status(200).json({
            status: 'success',
            message: 'تم إضافة التقييم بنجاح',
            data: {
                feedback: order.feedback
            }
        });

    } catch (error) {
        console.error('❌ Error adding feedback:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في إضافة التقييم'
        });
    }
});

/**
 * @route GET /api/orders
 * @desc Get all orders (Admin only)
 * @access Private (Admin)
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const orderType = req.query.orderType;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        // Build query
        const query = {};
        if (status) query.status = status;
        if (orderType) query.orderType = orderType;
        
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .populate('customer.uid', 'displayName email');

        const totalOrders = await Order.countDocuments(query);

        // Calculate summary statistics
        const summaryStats = await Order.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totals.total' },
                    totalPointsUsed: { $sum: '$payment.pointsUsed' },
                    averageOrderValue: { $avg: '$totals.total' },
                    ordersByStatus: {
                        $push: {
                            status: '$status',
                            total: '$totals.total'
                        }
                    }
                }
            }
        ]);

        res.status(200).json({
            status: 'success',
            message: 'تم جلب الطلبات بنجاح',
            data: {
                orders,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalOrders / limit),
                    totalOrders,
                    limit,
                    hasNext: page < Math.ceil(totalOrders / limit),
                    hasPrev: page > 1
                },
                summary: summaryStats[0] || {}
            }
        });

    } catch (error) {
        console.error('❌ Error fetching orders:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في جلب الطلبات'
        });
    }
});

/**
 * @route GET /api/orders/today
 * @desc Get today's orders (Staff only)
 * @access Private (Staff)
 */
router.get('/today', authenticateToken, requireStaff, async (req, res) => {
    try {
        const orders = await Order.getTodaysOrders();

        // Calculate today's stats
        const stats = {
            totalOrders: orders.length,
            totalRevenue: orders.reduce((sum, order) => sum + order.totals.total, 0),
            totalPointsUsed: orders.reduce((sum, order) => sum + (order.payment.pointsUsed || 0), 0),
            ordersByStatus: orders.reduce((acc, order) => {
                acc[order.status] = (acc[order.status] || 0) + 1;
                return acc;
            }, {}),
            ordersByType: orders.reduce((acc, order) => {
                acc[order.orderType] = (acc[order.orderType] || 0) + 1;
                return acc;
            }, {})
        };

        res.status(200).json({
            status: 'success',
            message: 'تم جلب طلبات اليوم بنجاح',
            data: {
                orders,
                stats,
                date: new Date().toISOString().split('T')[0]
            }
        });

    } catch (error) {
        console.error('❌ Error fetching today\'s orders:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في جلب طلبات اليوم'
        });
    }
});

/**
 * @route GET /api/orders/stats
 * @desc Get orders statistics (Admin only)
 * @access Private (Admin)
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const period = req.query.period || '30'; // days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        // Get comprehensive statistics
        const [
            totalStats,
            dailyStats,
            popularItems,
            customerStats
        ] = await Promise.all([
            // Total statistics
            Order.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalRevenue: { $sum: '$totals.total' },
                        totalPointsUsed: { $sum: '$payment.pointsUsed' },
                        averageOrderValue: { $avg: '$totals.total' },
                        ordersByStatus: {
                            $push: {
                                status: '$status',
                                total: '$totals.total'
                            }
                        }
                    }
                }
            ]),
            
            // Daily breakdown
            Order.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        orders: { $sum: 1 },
                        revenue: { $sum: '$totals.total' },
                        pointsUsed: { $sum: '$payment.pointsUsed' }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            
            // Popular items
            Order.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.name',
                        totalOrdered: { $sum: '$items.quantity' },
                        totalRevenue: { $sum: '$items.subtotal' }
                    }
                },
                { $sort: { totalOrdered: -1 } },
                { $limit: 10 }
            ]),
            
            // Customer statistics
            Order.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                {
                    $group: {
                        _id: '$customer.uid',
                        customerName: { $first: '$customer.name' },
                        totalOrders: { $sum: 1 },
                        totalSpent: { $sum: '$totals.total' },
                        totalPointsUsed: { $sum: '$payment.pointsUsed' }
                    }
                },
                { $sort: { totalSpent: -1 } },
                { $limit: 10 }
            ])
        ]);

        res.status(200).json({
            status: 'success',
            message: 'تم جلب إحصائيات الطلبات بنجاح',
            data: {
                overview: totalStats[0] || {},
                dailyBreakdown: dailyStats,
                popularItems: popularItems,
                topCustomers: customerStats,
                period: `${period} يوم`,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error fetching order stats:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في جلب إحصائيات الطلبات'
        });
    }
});

/**
 * @route DELETE /api/orders/:orderNumber
 * @desc Cancel/Delete order (Admin or order owner within time limit)
 * @access Private
 */
router.delete('/:orderNumber', authenticateToken, async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const { reason } = req.body;

        const order = await Order.findByOrderNumber(orderNumber);
        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: 'الطلب غير موجود'
            });
        }

        const isAdmin = req.user.role === 'admin';
        const isOwner = order.customer.uid === req.user.uid;

        // Check permissions
        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                status: 'error',
                message: 'ليس لديك صلاحية إلغاء هذا الطلب'
            });
        }

        // Check if order can be cancelled
        if (!isAdmin && ['completed', 'cancelled'].includes(order.status)) {
            return res.status(400).json({
                status: 'error',
                message: 'لا يمكن إلغاء الطلب في هذه المرحلة'
            });
        }

        // Time limit check for non-admin users (e.g., 10 minutes)
        if (!isAdmin) {
            const timeDiff = Date.now() - order.createdAt.getTime();
            const timeLimit = 10 * 60 * 1000; // 10 minutes
            
            if (timeDiff > timeLimit) {
                return res.status(400).json({
                    status: 'error',
                    message: 'تجاوز الوقت المسموح لإلغاء الطلب (10 دقائق)'
                });
            }
        }

        // If points were used, refund them
        if (order.payment.pointsUsed > 0) {
            const user = await User.findByUID(order.customer.uid);
            if (user) {
                // Create refund transaction
                const refundTransaction = new PointsTransaction({
                    user: {
                        uid: user.uid,
                        name: user.displayName,
                        email: user.email
                    },
                    type: 'refund',
                    points: {
                        amount: order.payment.pointsUsed,
                        balanceBefore: user.points.current,
                        balanceAfter: user.points.current + order.payment.pointsUsed
                    },
                    description: `استرداد نقاط من الطلب المُلغى ${order.orderNumber}`,
                    relatedOrder: {
                        orderId: order._id,
                        orderNumber: order.orderNumber,
                        orderTotal: order.totals.total
                    },
                    status: 'completed',
                    metadata: {
                        source: 'cancellation',
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent'),
                        cancelledBy: req.user.uid
                    }
                });

                await refundTransaction.save();
                await user.addPoints(order.payment.pointsUsed, `استرداد من طلب ملغى ${order.orderNumber}`);
            }
        }

        // Update order status
        order.status = 'cancelled';
        order.cancellation = {
            cancelledBy: req.user.uid,
            cancelledAt: new Date(),
            reason: reason || 'إلغاء بواسطة العميل',
            refundIssued: order.payment.pointsUsed > 0
        };

        await order.save();

        res.status(200).json({
            status: 'success',
            message: 'تم إلغاء الطلب بنجاح',
            data: {
                order: order.toObject(),
                refundedPoints: order.payment.pointsUsed || 0
            }
        });

    } catch (error) {
        console.error('❌ Error cancelling order:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في إلغاء الطلب'
        });
    }
});

module.exports = router;
