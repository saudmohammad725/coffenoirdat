const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: [100, 'اسم المنتج يجب أن يكون أقل من 100 حرف']
    },
    nameEn: {
        type: String,
        trim: true,
        maxlength: [100, 'English name must be less than 100 characters']
    },
    description: {
        type: String,
        required: true,
        maxlength: [500, 'وصف المنتج يجب أن يكون أقل من 500 حرف']
    },
    descriptionEn: {
        type: String,
        maxlength: [500, 'English description must be less than 500 characters']
    },
    
    // Categorization
    category: {
        type: String,
        enum: ['hot_drinks', 'cold_drinks', 'desserts', 'food', 'other'],
        required: true
    },
    subcategory: {
        type: String,
        enum: [
            'coffee', 'tea', 'hot_chocolate', 'specialty_hot',
            'iced_coffee', 'iced_tea', 'smoothies', 'juices', 'soft_drinks',
            'cakes', 'pastries', 'cookies', 'ice_cream',
            'sandwiches', 'salads', 'snacks',
            'merchandise', 'gift_cards'
        ]
    },
    tags: [{
        type: String,
        trim: true
    }],
    
    // Pricing
    pricing: {
        regular: {
            type: Number,
            required: true,
            min: [0, 'السعر يجب أن يكون أكبر من أو يساوي صفر']
        },
        points: {
            type: Number,
            required: true,
            min: [0, 'سعر النقاط يجب أن يكون أكبر من أو يساوي صفر']
        },
        cost: {
            type: Number,
            min: [0, 'التكلفة يجب أن تكون أكبر من أو يساوي صفر']
        },
        currency: {
            type: String,
            enum: ['SAR', 'USD', 'EUR'],
            default: 'SAR'
        }
    },
    
    // Sizes and Variations
    sizes: [{
        name: {
            type: String,
            required: true
        },
        nameEn: String,
        price: {
            type: Number,
            required: true
        },
        points: {
            type: Number,
            required: true
        },
        volume: String, // e.g., "250ml", "16oz"
        calories: Number
    }],
    
    // Customizations
    customizations: [{
        name: {
            type: String,
            required: true
        },
        nameEn: String,
        type: {
            type: String,
            enum: ['single', 'multiple'],
            default: 'single'
        },
        required: {
            type: Boolean,
            default: false
        },
        options: [{
            name: {
                type: String,
                required: true
            },
            nameEn: String,
            price: {
                type: Number,
                default: 0
            },
            points: {
                type: Number,
                default: 0
            }
        }]
    }],
    
    // Media
    images: [{
        url: {
            type: String,
            required: true
        },
        alt: String,
        isPrimary: {
            type: Boolean,
            default: false
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Nutritional Information
    nutrition: {
        calories: Number,
        protein: Number, // grams
        fat: Number, // grams
        carbohydrates: Number, // grams
        sugar: Number, // grams
        sodium: Number, // mg
        caffeine: Number, // mg
        allergens: [{
            type: String,
            enum: ['milk', 'eggs', 'nuts', 'soy', 'wheat', 'shellfish', 'fish']
        }],
        dietary: [{
            type: String,
            enum: ['vegetarian', 'vegan', 'gluten_free', 'sugar_free', 'low_fat', 'organic']
        }]
    },
    
    // Availability
    availability: {
        isAvailable: {
            type: Boolean,
            default: true
        },
        isSeasonalItem: {
            type: Boolean,
            default: false
        },
        availableFrom: Date,
        availableUntil: Date,
        availableDays: [{
            type: String,
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        }],
        availableHours: {
            start: String, // "08:00"
            end: String // "22:00"
        },
        maxDailyQuantity: Number,
        currentDailySold: {
            type: Number,
            default: 0
        }
    },
    
    // Inventory
    inventory: {
        trackInventory: {
            type: Boolean,
            default: false
        },
        stockQuantity: {
            type: Number,
            default: 0,
            min: [0, 'كمية المخزون يجب أن تكون أكبر من أو يساوي صفر']
        },
        lowStockThreshold: {
            type: Number,
            default: 10
        },
        restockDate: Date,
        supplier: String
    },
    
    // Ratings and Reviews
    ratings: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0
        },
        breakdown: {
            five: { type: Number, default: 0 },
            four: { type: Number, default: 0 },
            three: { type: Number, default: 0 },
            two: { type: Number, default: 0 },
            one: { type: Number, default: 0 }
        }
    },
    
    // Sales Data
    sales: {
        totalSold: {
            type: Number,
            default: 0
        },
        totalRevenue: {
            type: Number,
            default: 0
        },
        lastSoldAt: Date,
        popularityScore: {
            type: Number,
            default: 0
        }
    },
    
    // Preparation Information
    preparation: {
        prepTime: {
            type: Number, // minutes
            default: 5
        },
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'easy'
        },
        instructions: String,
        equipment: [String],
        ingredients: [{
            name: String,
            quantity: String,
            unit: String
        }]
    },
    
    // SEO and Marketing
    seo: {
        slug: {
            type: String,
            unique: true,
            sparse: true
        },
        metaTitle: String,
        metaDescription: String,
        keywords: [String]
    },
    
    // Status and Visibility
    status: {
        type: String,
        enum: ['draft', 'active', 'inactive', 'discontinued'],
        default: 'active'
    },
    featured: {
        type: Boolean,
        default: false
    },
    isNew: {
        type: Boolean,
        default: false
    },
    isBestseller: {
        type: Boolean,
        default: false
    },
    
    // Sorting and Display
    sortOrder: {
        type: Number,
        default: 0
    },
    displayOnMenu: {
        type: Boolean,
        default: true
    },
    
    // Metadata
    metadata: {
        createdBy: String,
        updatedBy: String,
        version: {
            type: Number,
            default: 1
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
productSchema.index({ category: 1, status: 1 });
productSchema.index({ 'availability.isAvailable': 1 });
productSchema.index({ featured: 1 });
productSchema.index({ 'ratings.average': -1 });
productSchema.index({ 'sales.popularityScore': -1 });
productSchema.index({ name: 'text', description: 'text' });

// Virtual for primary image
productSchema.virtual('primaryImage').get(function() {
    const primaryImg = this.images.find(img => img.isPrimary);
    return primaryImg ? primaryImg.url : (this.images[0] ? this.images[0].url : null);
});

// Virtual for profit margin
productSchema.virtual('profitMargin').get(function() {
    if (this.pricing.cost && this.pricing.regular) {
        return ((this.pricing.regular - this.pricing.cost) / this.pricing.regular * 100).toFixed(2);
    }
    return 0;
});

// Virtual for availability status
productSchema.virtual('isCurrentlyAvailable').get(function() {
    if (!this.availability.isAvailable) return false;
    
    const now = new Date();
    
    // Check date range
    if (this.availability.availableFrom && now < this.availability.availableFrom) return false;
    if (this.availability.availableUntil && now > this.availability.availableUntil) return false;
    
    // Check daily quantity limit
    if (this.availability.maxDailyQuantity && 
        this.availability.currentDailySold >= this.availability.maxDailyQuantity) {
        return false;
    }
    
    // Check inventory
    if (this.inventory.trackInventory && this.inventory.stockQuantity <= 0) return false;
    
    return true;
});

// Pre-save middleware
productSchema.pre('save', function(next) {
    // Generate slug if not exists
    if (!this.seo.slug && this.name) {
        this.seo.slug = this.name
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim();
    }
    
    // Update version
    if (this.isModified() && !this.isNew) {
        this.metadata.version += 1;
    }
    
    // Ensure at least one image is primary
    if (this.images.length > 0) {
        const hasPrimary = this.images.some(img => img.isPrimary);
        if (!hasPrimary) {
            this.images[0].isPrimary = true;
        }
    }
    
    // Calculate popularity score based on sales and ratings
    this.sales.popularityScore = (this.sales.totalSold * 0.7) + (this.ratings.average * this.ratings.count * 0.3);
    
    next();
});

// Instance methods
productSchema.methods.updateRating = function(newRating) {
    const oldCount = this.ratings.count;
    const oldAverage = this.ratings.average;
    
    // Update breakdown
    this.ratings.breakdown[this.getStarKey(newRating)]++;
    
    // Calculate new average
    const newCount = oldCount + 1;
    const newAverage = ((oldAverage * oldCount) + newRating) / newCount;
    
    this.ratings.count = newCount;
    this.ratings.average = Math.round(newAverage * 100) / 100;
    
    return this.save();
};

productSchema.methods.getStarKey = function(rating) {
    const starKeys = { 5: 'five', 4: 'four', 3: 'three', 2: 'two', 1: 'one' };
    return starKeys[rating];
};

productSchema.methods.recordSale = function(quantity = 1, revenue = 0) {
    this.sales.totalSold += quantity;
    this.sales.totalRevenue += revenue;
    this.sales.lastSoldAt = new Date();
    this.availability.currentDailySold += quantity;
    
    return this.save();
};

productSchema.methods.addCustomization = function(customization) {
    this.customizations.push(customization);
    return this.save();
};

productSchema.methods.setFeatured = function(featured = true) {
    this.featured = featured;
    return this.save();
};

// Static methods
productSchema.statics.findByCategory = function(category, options = {}) {
    const query = {
        category,
        status: 'active',
        'availability.isAvailable': true
    };
    
    return this.find(query)
        .sort(options.sort || { sortOrder: 1, name: 1 })
        .limit(options.limit || 50);
};

productSchema.statics.findFeatured = function(limit = 10) {
    return this.find({
        featured: true,
        status: 'active',
        'availability.isAvailable': true
    })
    .sort({ 'sales.popularityScore': -1 })
    .limit(limit);
};

productSchema.statics.findByPriceRange = function(minPrice, maxPrice) {
    return this.find({
        'pricing.regular': { $gte: minPrice, $lte: maxPrice },
        status: 'active',
        'availability.isAvailable': true
    });
};

productSchema.statics.searchProducts = function(searchTerm, options = {}) {
    return this.find({
        $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { nameEn: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } },
            { tags: { $in: [new RegExp(searchTerm, 'i')] } }
        ],
        status: 'active'
    })
    .sort(options.sort || { 'sales.popularityScore': -1 })
    .limit(options.limit || 20);
};

productSchema.statics.getBestsellers = function(limit = 10) {
    return this.find({
        status: 'active',
        'availability.isAvailable': true
    })
    .sort({ 'sales.totalSold': -1 })
    .limit(limit);
};

productSchema.statics.getLowStockItems = function() {
    return this.find({
        'inventory.trackInventory': true,
        $expr: { $lte: ['$inventory.stockQuantity', '$inventory.lowStockThreshold'] }
    });
};

module.exports = mongoose.model('Product', productSchema);
