const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Product = require('../models/Product');
const { authenticateToken, requireStaff, optionalAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * @route GET /api/products
 * @desc Get all products with filtering and search
 * @access Public
 */
router.get('/', optionalAuth, [
    query('category').optional().isIn(['hot_drinks', 'cold_drinks', 'desserts', 'food', 'other']),
    query('featured').optional().isBoolean(),
    query('available').optional().isBoolean(),
    query('search').optional().isLength({ min: 1, max: 100 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
    try {
        const {
            category,
            featured,
            available,
            search,
            page = 1,
            limit = 20,
            sort = 'sortOrder'
        } = req.query;

        // Build query
        let query = { status: 'active' };
        
        if (category) query.category = category;
        if (featured === 'true') query.featured = true;
        if (available === 'true') query['availability.isAvailable'] = true;

        let products;

        if (search) {
            // Search products
            products = await Product.searchProducts(search, {
                limit: parseInt(limit),
                sort: { 'sales.popularityScore': -1 }
            });
        } else {
            // Regular query with pagination
            const sortObj = {};
            if (sort === 'price_low') sortObj['pricing.regular'] = 1;
            else if (sort === 'price_high') sortObj['pricing.regular'] = -1;
            else if (sort === 'popular') sortObj['sales.popularityScore'] = -1;
            else if (sort === 'rating') sortObj['ratings.average'] = -1;
            else sortObj.sortOrder = 1;

            products = await Product.find(query)
                .sort(sortObj)
                .limit(parseInt(limit))
                .skip((parseInt(page) - 1) * parseInt(limit));
        }

        const totalProducts = await Product.countDocuments(query);

        res.status(200).json({
            status: 'success',
            message: 'تم جلب المنتجات بنجاح',
            data: {
                products,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalProducts / parseInt(limit)),
                    totalProducts,
                    limit: parseInt(limit),
                    hasNext: parseInt(page) < Math.ceil(totalProducts / parseInt(limit)),
                    hasPrev: parseInt(page) > 1
                },
                filters: {
                    category,
                    featured,
                    available,
                    search,
                    sort
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching products:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في جلب المنتجات'
        });
    }
});

/**
 * @route GET /api/products/featured
 * @desc Get featured products
 * @access Public
 */
router.get('/featured', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const products = await Product.findFeatured(limit);

        res.status(200).json({
            status: 'success',
            message: 'تم جلب المنتجات المميزة بنجاح',
            data: {
                products,
                totalProducts: products.length
            }
        });

    } catch (error) {
        console.error('❌ Error fetching featured products:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في جلب المنتجات المميزة'
        });
    }
});

/**
 * @route GET /api/products/bestsellers
 * @desc Get bestselling products
 * @access Public
 */
router.get('/bestsellers', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const products = await Product.getBestsellers(limit);

        res.status(200).json({
            status: 'success',
            message: 'تم جلب المنتجات الأكثر مبيعاً بنجاح',
            data: {
                products,
                totalProducts: products.length
            }
        });

    } catch (error) {
        console.error('❌ Error fetching bestsellers:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في جلب المنتجات الأكثر مبيعاً'
        });
    }
});

/**
 * @route GET /api/products/category/:category
 * @desc Get products by category
 * @access Public
 */
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const sort = req.query.sort || 'sortOrder';

        const sortOptions = {};
        if (sort === 'price_low') sortOptions['pricing.regular'] = 1;
        else if (sort === 'price_high') sortOptions['pricing.regular'] = -1;
        else if (sort === 'popular') sortOptions['sales.popularityScore'] = -1;
        else sortOptions.sortOrder = 1;

        const products = await Product.findByCategory(category, {
            limit,
            sort: sortOptions
        });

        res.status(200).json({
            status: 'success',
            message: 'تم جلب منتجات القسم بنجاح',
            data: {
                products,
                category,
                totalProducts: products.length
            }
        });

    } catch (error) {
        console.error('❌ Error fetching category products:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في جلب منتجات القسم'
        });
    }
});

/**
 * @route GET /api/products/:id
 * @desc Get single product by ID
 * @access Public
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                status: 'error',
                message: 'المنتج غير موجود'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'تم جلب المنتج بنجاح',
            data: {
                product: product.toObject()
            }
        });

    } catch (error) {
        console.error('❌ Error fetching product:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في جلب المنتج'
        });
    }
});

/**
 * @route POST /api/products
 * @desc Create new product (Staff only)
 * @access Private (Staff)
 */
router.post('/', authenticateToken, requireStaff, [
    body('name').notEmpty().withMessage('اسم المنتج مطلوب'),
    body('description').notEmpty().withMessage('وصف المنتج مطلوب'),
    body('category').isIn(['hot_drinks', 'cold_drinks', 'desserts', 'food', 'other']).withMessage('قسم المنتج غير صحيح'),
    body('pricing.regular').isFloat({ min: 0 }).withMessage('سعر المنتج غير صحيح'),
    body('pricing.points').isInt({ min: 0 }).withMessage('سعر النقاط غير صحيح')
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

        const productData = {
            ...req.body,
            metadata: {
                createdBy: req.user.uid,
                version: 1
            }
        };

        const product = new Product(productData);
        await product.save();

        res.status(201).json({
            status: 'success',
            message: 'تم إنشاء المنتج بنجاح',
            data: {
                product: product.toObject()
            }
        });

    } catch (error) {
        console.error('❌ Error creating product:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في إنشاء المنتج'
        });
    }
});

/**
 * @route PUT /api/products/:id
 * @desc Update product (Staff only)
 * @access Private (Staff)
 */
router.put('/:id', authenticateToken, requireStaff, async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                status: 'error',
                message: 'المنتج غير موجود'
            });
        }

        // Update product
        Object.assign(product, req.body);
        product.metadata.updatedBy = req.user.uid;
        
        await product.save();

        res.status(200).json({
            status: 'success',
            message: 'تم تحديث المنتج بنجاح',
            data: {
                product: product.toObject()
            }
        });

    } catch (error) {
        console.error('❌ Error updating product:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في تحديث المنتج'
        });
    }
});

/**
 * @route POST /api/products/:id/rating
 * @desc Add rating to product
 * @access Private
 */
router.post('/:id/rating', authenticateToken, [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('التقييم يجب أن يكون بين 1 و 5')
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

        const { id } = req.params;
        const { rating } = req.body;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                status: 'error',
                message: 'المنتج غير موجود'
            });
        }

        await product.updateRating(rating);

        res.status(200).json({
            status: 'success',
            message: 'تم إضافة التقييم بنجاح',
            data: {
                ratings: product.ratings
            }
        });

    } catch (error) {
        console.error('❌ Error adding rating:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في إضافة التقييم'
        });
    }
});

/**
 * @route POST /api/products/:id/sale
 * @desc Record a sale for the product (Staff only)
 * @access Private (Staff)
 */
router.post('/:id/sale', authenticateToken, requireStaff, [
    body('quantity').isInt({ min: 1 }).withMessage('الكمية غير صحيحة'),
    body('revenue').isFloat({ min: 0 }).withMessage('الإيراد غير صحيح')
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

        const { id } = req.params;
        const { quantity, revenue } = req.body;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                status: 'error',
                message: 'المنتج غير موجود'
            });
        }

        await product.recordSale(quantity, revenue);

        res.status(200).json({
            status: 'success',
            message: 'تم تسجيل البيعة بنجاح',
            data: {
                sales: product.sales
            }
        });

    } catch (error) {
        console.error('❌ Error recording sale:', error);
        res.status(500).json({
            status: 'error',
            message: 'خطأ في تسجيل البيعة'
        });
    }
});

module.exports = router;
