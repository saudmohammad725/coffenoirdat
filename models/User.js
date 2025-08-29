const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Basic Information
    uid: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'يرجى إدخال بريد إلكتروني صحيح']
    },
    displayName: {
        type: String,
        required: true,
        trim: true,
        maxlength: [50, 'اسم المستخدم يجب أن يكون أقل من 50 حرف']
    },
    photoURL: {
        type: String,
        default: null
    },
    
    // Authentication
    provider: {
        type: String,
        enum: ['google.com', 'twitter.com', 'email'],
        required: true
    },
    password: {
        type: String,
        minlength: [6, 'كلمة المرور يجب أن تكون على الأقل 6 أحرف'],
        select: false // Don't include password in queries by default
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    
    // Points System
    points: {
        current: {
            type: Number,
            default: 0,
            min: [0, 'النقاط لا يمكن أن تكون سالبة']
        },
        total: {
            type: Number,
            default: 0,
            min: [0, 'إجمالي النقاط لا يمكن أن يكون سالباً']
        },
        used: {
            type: Number,
            default: 0,
            min: [0, 'النقاط المستخدمة لا يمكن أن تكون سالبة']
        }
    },
    
    // User Preferences
    settings: {
        language: {
            type: String,
            enum: ['ar', 'en'],
            default: 'ar'
        },
        currency: {
            type: String,
            enum: ['SAR', 'USD', 'EUR'],
            default: 'SAR'
        },
        notifications: {
            email: {
                type: Boolean,
                default: true
            },
            push: {
                type: Boolean,
                default: true
            },
            sms: {
                type: Boolean,
                default: false
            }
        },
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'light'
        }
    },
    
    // Profile Information
    profile: {
        phone: {
            type: String,
            match: [/^[\+]?[1-9][\d]{0,15}$/, 'يرجى إدخال رقم هاتف صحيح']
        },
        dateOfBirth: {
            type: Date
        },
        gender: {
            type: String,
            enum: ['male', 'female', 'other', 'prefer_not_to_say']
        },
        address: {
            street: String,
            city: String,
            state: String,
            country: {
                type: String,
                default: 'SA'
            },
            zipCode: String,
            coordinates: {
                latitude: Number,
                longitude: Number
            }
        }
    },
    
    // Activity Tracking
    activity: {
        lastLoginAt: {
            type: Date,
            default: Date.now
        },
        lastActiveAt: {
            type: Date,
            default: Date.now
        },
        loginCount: {
            type: Number,
            default: 1
        },
        ipAddress: String,
        userAgent: String
    },
    
    // Account Status
    status: {
        type: String,
        enum: ['active', 'suspended', 'banned', 'pending'],
        default: 'active'
    },
    role: {
        type: String,
        enum: ['customer', 'admin', 'manager', 'staff'],
        default: 'customer'
    },
    
    // Subscription & Loyalty
    loyalty: {
        tier: {
            type: String,
            enum: ['bronze', 'silver', 'gold', 'platinum'],
            default: 'bronze'
        },
        joinDate: {
            type: Date,
            default: Date.now
        },
        totalSpent: {
            type: Number,
            default: 0
        },
        orderCount: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ uid: 1 });
userSchema.index({ 'points.current': -1 });
userSchema.index({ 'loyalty.tier': 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return this.displayName;
});

// Virtual for points percentage to next tier
userSchema.virtual('pointsToNextTier').get(function() {
    const tierThresholds = {
        bronze: 500,
        silver: 1500,
        gold: 5000,
        platinum: Infinity
    };
    
    const currentTier = this.loyalty.tier;
    const currentPoints = this.points.total;
    
    switch(currentTier) {
        case 'bronze':
            return Math.max(0, tierThresholds.bronze - currentPoints);
        case 'silver':
            return Math.max(0, tierThresholds.silver - currentPoints);
        case 'gold':
            return Math.max(0, tierThresholds.gold - currentPoints);
        default:
            return 0;
    }
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
    // Hash password if it's modified
    if (this.isModified('password') && this.password) {
        const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        this.password = await bcrypt.hash(this.password, rounds);
    }
    
    // Update loyalty tier based on total points
    const totalPoints = this.points.total;
    if (totalPoints >= 5000) {
        this.loyalty.tier = 'platinum';
    } else if (totalPoints >= 1500) {
        this.loyalty.tier = 'gold';
    } else if (totalPoints >= 500) {
        this.loyalty.tier = 'silver';
    } else {
        this.loyalty.tier = 'bronze';
    }
    
    // Update last active timestamp
    this.activity.lastActiveAt = new Date();
    
    next();
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.addPoints = function(points, reason = 'مشتريات') {
    this.points.current += points;
    this.points.total += points;
    return this.save();
};

userSchema.methods.deductPoints = function(points, reason = 'شراء منتج') {
    if (this.points.current < points) {
        throw new Error('النقاط غير كافية');
    }
    this.points.current -= points;
    this.points.used += points;
    return this.save();
};

userSchema.methods.toSafeObject = function() {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.__v;
    return userObject;
};

// Static methods
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByUID = function(uid) {
    return this.findOne({ uid });
};

userSchema.statics.getTopUsers = function(limit = 10) {
    return this.find({ status: 'active' })
        .sort({ 'points.total': -1 })
        .limit(limit)
        .select('displayName points.total loyalty.tier createdAt');
};

module.exports = mongoose.model('User', userSchema);
