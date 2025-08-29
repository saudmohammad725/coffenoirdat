const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    // Order Identification
    orderNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    // Customer Information
    customer: {
        uid: {
            type: String,
            required: true,
            index: true
        },
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        phone: String
    },
    
    // Order Items
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        name: {
            type: String,
            required: true
        },
        nameEn: String,
        price: {
            type: Number,
            required: true,
            min: [0, 'السعر يجب أن يكون أكبر من أو يساوي صفر']
        },
        pointsPrice: {
            type: Number,
            default: 0,
            min: [0, 'سعر النقاط يجب أن يكون أكبر من أو يساوي صفر']
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, 'الكمية يجب أن تكون على الأقل 1']
        },
        category: {
            type: String,
            enum: ['hot_drinks', 'cold_drinks', 'desserts', 'food', 'other'],
            required: true
        },
        image: String,
        customizations: [{
            name: String,
            value: String,
            price: {
                type: Number,
                default: 0
            }
        }],
        subtotal: {
            type: Number,
            required: true
        }
    }],
    
    // Order Totals
    totals: {
        subtotal: {
            type: Number,
            required: true,
            min: [0, 'المجموع الفرعي يجب أن يكون أكبر من أو يساوي صفر']
        },
        tax: {
            type: Number,
            default: 0,
            min: [0, 'الضريبة يجب أن تكون أكبر من أو يساوي صفر']
        },
        discount: {
            type: Number,
            default: 0,
            min: [0, 'الخصم يجب أن يكون أكبر من أو يساوي صفر']
        },
        delivery: {
            type: Number,
            default: 0,
            min: [0, 'رسوم التوصيل يجب أن تكون أكبر من أو يساوي صفر']
        },
        total: {
            type: Number,
            required: true,
            min: [0, 'المجموع الكلي يجب أن يكون أكبر من أو يساوي صفر']
        }
    },
    
    // Payment Information
    payment: {
        method: {
            type: String,
            enum: ['points', 'cash', 'card', 'online', 'mixed'],
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
            default: 'pending'
        },
        pointsUsed: {
            type: Number,
            default: 0,
            min: [0, 'النقاط المستخدمة يجب أن تكون أكبر من أو يساوي صفر']
        },
        cashAmount: {
            type: Number,
            default: 0,
            min: [0, 'المبلغ النقدي يجب أن يكون أكبر من أو يساوي صفر']
        },
        transactionId: String,
        gateway: String, // stripe, paypal, etc.
        gatewayResponse: mongoose.Schema.Types.Mixed
    },
    
    // Order Status & Tracking
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
        default: 'pending'
    },
    orderType: {
        type: String,
        enum: ['dine_in', 'takeaway', 'delivery'],
        required: true
    },
    
    // Timing
    timing: {
        placedAt: {
            type: Date,
            default: Date.now
        },
        confirmedAt: Date,
        preparingAt: Date,
        readyAt: Date,
        completedAt: Date,
        cancelledAt: Date,
        estimatedReadyTime: Date,
        actualReadyTime: Date
    },
    
    // Delivery Information (if applicable)
    delivery: {
        address: {
            street: String,
            city: String,
            state: String,
            zipCode: String,
            country: {
                type: String,
                default: 'SA'
            },
            coordinates: {
                latitude: Number,
                longitude: Number
            }
        },
        instructions: String,
        driver: {
            name: String,
            phone: String,
            vehicleInfo: String
        },
        trackingNumber: String,
        estimatedDeliveryTime: Date,
        actualDeliveryTime: Date
    },
    
    // Store Information
    store: {
        id: String,
        name: {
            type: String,
            default: 'Noir Café - Main Branch'
        },
        address: String,
        phone: String
    },
    
    // Staff Information
    staff: {
        cashier: {
            id: String,
            name: String
        },
        barista: {
            id: String,
            name: String
        },
        manager: {
            id: String,
            name: String
        }
    },
    
    // Additional Information
    notes: {
        customer: String,
        staff: String,
        kitchen: String
    },
    
    // Points & Loyalty
    pointsEarned: {
        type: Number,
        default: 0,
        min: [0, 'النقاط المكتسبة يجب أن تكون أكبر من أو يساوي صفر']
    },
    
    // Promotions & Discounts
    promotions: [{
        code: String,
        name: String,
        discountType: {
            type: String,
            enum: ['percentage', 'fixed', 'points']
        },
        discountValue: Number,
        appliedAmount: Number
    }],
    
    // Rating & Feedback
    feedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: String,
        submittedAt: Date
    },
    
    // Metadata
    metadata: {
        source: {
            type: String,
            enum: ['website', 'mobile_app', 'pos', 'phone', 'social_media'],
            default: 'website'
        },
        device: String,
        userAgent: String,
        ipAddress: String,
        sessionId: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
orderSchema.index({ 'customer.uid': 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'timing.placedAt': -1 });

// Virtual for order duration
orderSchema.virtual('duration').get(function() {
    if (this.timing.completedAt && this.timing.placedAt) {
        return Math.round((this.timing.completedAt - this.timing.placedAt) / (1000 * 60)); // in minutes
    }
    return null;
});

// Virtual for total items count
orderSchema.virtual('itemsCount').get(function() {
    return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Pre-save middleware
orderSchema.pre('save', function(next) {
    // Generate order number if not exists
    if (!this.orderNumber) {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        this.orderNumber = `NC${year}${month}${day}${random}`;
    }
    
    // Calculate totals
    const subtotal = this.items.reduce((total, item) => total + item.subtotal, 0);
    this.totals.subtotal = subtotal;
    
    // Calculate tax (15% VAT in Saudi Arabia)
    this.totals.tax = Math.round(subtotal * 0.15 * 100) / 100;
    
    // Calculate final total
    this.totals.total = this.totals.subtotal + this.totals.tax + this.totals.delivery - this.totals.discount;
    
    // Calculate points earned (1 point per SAR spent)
    if (this.payment.method !== 'points') {
        this.pointsEarned = Math.floor(this.totals.total);
    }
    
    // Update timing based on status changes
    if (this.isModified('status')) {
        const now = new Date();
        switch(this.status) {
            case 'confirmed':
                if (!this.timing.confirmedAt) this.timing.confirmedAt = now;
                break;
            case 'preparing':
                if (!this.timing.preparingAt) this.timing.preparingAt = now;
                break;
            case 'ready':
                if (!this.timing.readyAt) this.timing.readyAt = now;
                break;
            case 'completed':
                if (!this.timing.completedAt) this.timing.completedAt = now;
                break;
            case 'cancelled':
                if (!this.timing.cancelledAt) this.timing.cancelledAt = now;
                break;
        }
    }
    
    next();
});

// Instance methods
orderSchema.methods.updateStatus = function(newStatus, staffInfo = null) {
    this.status = newStatus;
    
    if (staffInfo) {
        if (staffInfo.role === 'cashier') this.staff.cashier = staffInfo;
        if (staffInfo.role === 'barista') this.staff.barista = staffInfo;
        if (staffInfo.role === 'manager') this.staff.manager = staffInfo;
    }
    
    return this.save();
};

orderSchema.methods.addFeedback = function(rating, comment) {
    this.feedback = {
        rating,
        comment,
        submittedAt: new Date()
    };
    return this.save();
};

orderSchema.methods.applyPromotion = function(promotionCode, discountValue, discountType) {
    const promotion = {
        code: promotionCode,
        discountType,
        discountValue,
        appliedAmount: discountType === 'percentage' 
            ? this.totals.subtotal * (discountValue / 100)
            : discountValue
    };
    
    this.promotions.push(promotion);
    this.totals.discount += promotion.appliedAmount;
    
    return this.save();
};

// Static methods
orderSchema.statics.findByCustomer = function(customerUid, limit = 20) {
    return this.find({ 'customer.uid': customerUid })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('items.productId');
};

orderSchema.statics.findByOrderNumber = function(orderNumber) {
    return this.findOne({ orderNumber });
};

orderSchema.statics.getTodaysOrders = function() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.find({
        createdAt: {
            $gte: today,
            $lt: tomorrow
        }
    }).sort({ createdAt: -1 });
};

orderSchema.statics.getOrderStats = function(startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: startDate,
                    $lte: endDate
                },
                status: { $ne: 'cancelled' }
            }
        },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$totals.total' },
                averageOrderValue: { $avg: '$totals.total' },
                totalItemsSold: { $sum: { $sum: '$items.quantity' } }
            }
        }
    ]);
};

module.exports = mongoose.model('Order', orderSchema);
