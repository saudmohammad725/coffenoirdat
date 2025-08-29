const mongoose = require('mongoose');

const pointsTransactionSchema = new mongoose.Schema({
    // Transaction Identification
    transactionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    // User Information
    user: {
        uid: {
            type: String,
            required: true,
            index: true
        },
        name: String,
        email: String
    },
    
    // Transaction Details
    type: {
        type: String,
        enum: ['purchase', 'redemption', 'bonus', 'refund', 'adjustment', 'expiry'],
        required: true,
        index: true
    },
    
    // Points Information
    points: {
        amount: {
            type: Number,
            required: true,
            validate: {
                validator: function(v) {
                    return v !== 0;
                },
                message: 'كمية النقاط يجب أن تكون أكبر أو أقل من صفر'
            }
        },
        balanceBefore: {
            type: Number,
            required: true,
            min: [0, 'الرصيد السابق يجب أن يكون أكبر من أو يساوي صفر']
        },
        balanceAfter: {
            type: Number,
            required: true,
            min: [0, 'الرصيد الحالي يجب أن يكون أكبر من أو يساوي صفر']
        }
    },
    
    // Related Order or Purchase
    relatedOrder: {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order'
        },
        orderNumber: String,
        orderTotal: Number
    },
    
    // Related Package Purchase (for points purchase)
    relatedPackage: {
        packageSize: Number, // 100, 500, 1000, etc.
        purchasePrice: Number,
        currency: {
            type: String,
            default: 'SAR'
        },
        paymentMethod: {
            type: String,
            enum: ['card', 'cash', 'online', 'gift'],
            default: 'card'
        },
        paymentDetails: {
            transactionId: String,
            gateway: String,
            last4: String,
            cardType: String
        }
    },
    
    // Bonus Information (for promotional points)
    bonus: {
        reason: {
            type: String,
            enum: ['welcome', 'birthday', 'loyalty', 'promotion', 'referral', 'review', 'social_share', 'anniversary']
        },
        description: String,
        promotionCode: String,
        multiplier: {
            type: Number,
            default: 1
        }
    },
    
    // Redemption Information (when points are used)
    redemption: {
        items: [{
            productName: String,
            quantity: Number,
            pointsValue: Number
        }],
        totalPointsUsed: Number,
        cashDiscount: Number // if partial payment with points
    },
    
    // Expiry Information
    expiry: {
        originalEarnDate: Date,
        expiryDate: Date,
        reason: {
            type: String,
            default: 'expired'
        },
        isManualExpiry: {
            type: Boolean,
            default: false
        }
    },
    
    // Admin Adjustment
    adjustment: {
        reason: String,
        adjustedBy: {
            adminId: String,
            adminName: String
        },
        notes: String,
        approved: {
            type: Boolean,
            default: false
        }
    },
    
    // Status and Processing
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed'],
        default: 'pending',
        index: true
    },
    
    // Processing Information
    processing: {
        processedAt: Date,
        processingDuration: Number, // milliseconds
        attempts: {
            type: Number,
            default: 0
        },
        lastAttemptAt: Date,
        errorMessage: String,
        retryCount: {
            type: Number,
            default: 0
        }
    },
    
    // Location and Device Information
    metadata: {
        source: {
            type: String,
            enum: ['website', 'mobile_app', 'pos', 'admin_panel', 'api'],
            default: 'website'
        },
        deviceInfo: {
            type: String
        },
        ipAddress: String,
        userAgent: String,
        location: {
            country: String,
            city: String,
            coordinates: {
                latitude: Number,
                longitude: Number
            }
        },
        sessionId: String
    },
    
    // Notification Status
    notifications: {
        emailSent: {
            type: Boolean,
            default: false
        },
        smsSent: {
            type: Boolean,
            default: false
        },
        pushSent: {
            type: Boolean,
            default: false
        },
        sentAt: Date
    },
    
    // Security and Fraud Detection
    security: {
        fraudScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        flagged: {
            type: Boolean,
            default: false
        },
        flagReason: String,
        reviewedBy: String,
        reviewedAt: Date
    },
    
    // Additional Notes
    notes: {
        user: String,
        admin: String,
        system: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
pointsTransactionSchema.index({ 'user.uid': 1, createdAt: -1 });
pointsTransactionSchema.index({ transactionId: 1 });
pointsTransactionSchema.index({ type: 1, status: 1 });
pointsTransactionSchema.index({ createdAt: -1 });
pointsTransactionSchema.index({ 'relatedOrder.orderNumber': 1 });
pointsTransactionSchema.index({ 'bonus.promotionCode': 1 });

// Virtual for transaction value description
pointsTransactionSchema.virtual('description').get(function() {
    switch(this.type) {
        case 'purchase':
            return `شراء ${Math.abs(this.points.amount)} نقطة`;
        case 'redemption':
            return `استخدام ${Math.abs(this.points.amount)} نقطة`;
        case 'bonus':
            return `نقاط مجانية: ${this.bonus.reason || 'مكافأة'}`;
        case 'refund':
            return `استرداد ${Math.abs(this.points.amount)} نقطة`;
        case 'adjustment':
            return `تعديل إداري: ${this.adjustment.reason || 'تعديل'}`;
        case 'expiry':
            return `انتهاء صلاحية ${Math.abs(this.points.amount)} نقطة`;
        default:
            return `معاملة نقاط: ${this.points.amount}`;
    }
});

// Virtual for display amount with sign
pointsTransactionSchema.virtual('displayAmount').get(function() {
    const amount = this.points.amount;
    return amount > 0 ? `+${amount}` : `${amount}`;
});

// Virtual for processing time
pointsTransactionSchema.virtual('processingTime').get(function() {
    if (this.processing.processedAt && this.createdAt) {
        return this.processing.processedAt - this.createdAt;
    }
    return null;
});

// Pre-save middleware
pointsTransactionSchema.pre('save', function(next) {
    // Generate transaction ID if not exists
    if (!this.transactionId) {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const time = date.getTime().toString().slice(-6);
        this.transactionId = `PT${year}${month}${day}${time}`;
    }
    
    // Update processing information when status changes
    if (this.isModified('status')) {
        if (this.status === 'completed' || this.status === 'failed') {
            this.processing.processedAt = new Date();
            this.processing.processingDuration = Date.now() - this.createdAt.getTime();
        }
    }
    
    // Set balance after based on transaction type
    if (this.isModified('points.amount') || this.isModified('points.balanceBefore')) {
        this.points.balanceAfter = Math.max(0, this.points.balanceBefore + this.points.amount);
    }
    
    next();
});

// Instance methods
pointsTransactionSchema.methods.markAsCompleted = function() {
    this.status = 'completed';
    this.processing.processedAt = new Date();
    this.processing.processingDuration = Date.now() - this.createdAt.getTime();
    return this.save();
};

pointsTransactionSchema.methods.markAsFailed = function(errorMessage) {
    this.status = 'failed';
    this.processing.processedAt = new Date();
    this.processing.errorMessage = errorMessage;
    this.processing.attempts += 1;
    this.processing.lastAttemptAt = new Date();
    return this.save();
};

pointsTransactionSchema.methods.retry = function() {
    if (this.status === 'failed' && this.processing.retryCount < 3) {
        this.status = 'pending';
        this.processing.retryCount += 1;
        this.processing.lastAttemptAt = new Date();
        return this.save();
    }
    throw new Error('لا يمكن إعادة المحاولة');
};

pointsTransactionSchema.methods.reverse = function(reason) {
    if (this.status !== 'completed') {
        throw new Error('لا يمكن عكس معاملة غير مكتملة');
    }
    
    this.status = 'reversed';
    this.notes.system = reason;
    return this.save();
};

pointsTransactionSchema.methods.flagForReview = function(reason, fraudScore = 50) {
    this.security.flagged = true;
    this.security.flagReason = reason;
    this.security.fraudScore = fraudScore;
    this.status = 'pending';
    return this.save();
};

// Static methods
pointsTransactionSchema.statics.findByUser = function(userUid, options = {}) {
    const query = { 'user.uid': userUid };
    
    if (options.type) query.type = options.type;
    if (options.status) query.status = options.status;
    
    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 50);
};

pointsTransactionSchema.statics.findByTransactionId = function(transactionId) {
    return this.findOne({ transactionId });
};

pointsTransactionSchema.statics.getUserBalance = function(userUid) {
    return this.findOne(
        { 'user.uid': userUid },
        { 'points.balanceAfter': 1 },
        { sort: { createdAt: -1 } }
    );
};

pointsTransactionSchema.statics.getTransactionStats = function(startDate, endDate, type = null) {
    const matchQuery = {
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'completed'
    };
    
    if (type) matchQuery.type = type;
    
    return this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$type',
                totalTransactions: { $sum: 1 },
                totalPoints: { $sum: '$points.amount' },
                averagePoints: { $avg: '$points.amount' },
                totalUsers: { $addToSet: '$user.uid' }
            }
        },
        {
            $addFields: {
                uniqueUsers: { $size: '$totalUsers' }
            }
        },
        {
            $project: {
                totalUsers: 0
            }
        }
    ]);
};

pointsTransactionSchema.statics.getTopUsers = function(startDate, endDate, limit = 10) {
    return this.aggregate([
        {
            $match: {
                type: { $in: ['purchase', 'bonus'] },
                status: 'completed',
                createdAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: '$user.uid',
                userName: { $first: '$user.name' },
                totalPoints: { $sum: '$points.amount' },
                transactionCount: { $sum: 1 }
            }
        },
        {
            $sort: { totalPoints: -1 }
        },
        {
            $limit: limit
        }
    ]);
};

pointsTransactionSchema.statics.getDailyStats = function(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate },
                status: 'completed'
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' },
                    type: '$type'
                },
                count: { $sum: 1 },
                totalPoints: { $sum: '$points.amount' }
            }
        },
        {
            $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
        }
    ]);
};

pointsTransactionSchema.statics.getFlaggedTransactions = function() {
    return this.find({
        'security.flagged': true,
        'security.reviewedAt': { $exists: false }
    }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('PointsTransaction', pointsTransactionSchema);
