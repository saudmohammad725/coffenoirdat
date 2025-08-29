const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const pointsRoutes = require('./routes/points');
const ordersRoutes = require('./routes/orders');
const productsRoutes = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://www.gstatic.com", "https://code.jquery.com", "https://stackpath.bootstrapcdn.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://coffeenoir-1fe6b.firebaseapp.com"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'عذراً، تم تجاوز الحد المسموح من الطلبات. حاول مرة أخرى لاحقاً.',
        retryAfter: '15 دقيقة'
    }
});

app.use(limiter);

// Middleware
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Noir Café Backend is running perfectly! ☕',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/products', productsRoutes);

// Welcome endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'مرحباً بك في واجهة برمجة التطبيقات الخاصة بمقهى نوار! ☕',
        description: 'Noir Café Backend API - نظام إدارة مقهى متكامل',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            users: '/api/users',
            points: '/api/points',
            orders: '/api/orders',
            products: '/api/products'
        },
        documentation: 'https://docs.noir-cafe.com'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack);
    
    // Send error response
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'حدث خطأ داخلي في الخادم',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'المسار المطلوب غير موجود',
        path: req.originalUrl
    });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/noir-cafe', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
    console.log('🎯 Database: MongoDB connected successfully');
})
.catch((err) => {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 إيقاف الخادم بسبب SIGTERM...');
    mongoose.connection.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🔄 إيقاف الخادم بسبب SIGINT...');
    mongoose.connection.close();
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 خادم نوار كافيه يعمل على المنفذ:', PORT);
    console.log('🌐 Server running at: http://localhost:' + PORT);
    console.log('📚 API Documentation: http://localhost:' + PORT + '/api/docs');
    console.log('💡 Environment:', process.env.NODE_ENV || 'development');
});

module.exports = app;
