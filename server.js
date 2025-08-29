const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
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
            scriptSrc: ["'self'", "'unsafe-inline'", "https://www.gstatic.com", "https://code.jquery.com", "https://stackpath.bootstrapcdn.com", "https://apis.google.com", "https://accounts.google.com", "https://www.googletagmanager.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://coffeenoir-1fe6b.firebaseapp.com", "https://identitytoolkit.googleapis.com", "https://www.googleapis.com", "https://securetoken.googleapis.com", "https://firebase.googleapis.com", "https://firebaseinstallations.googleapis.com"],
            frameSrc: ["'self'", "https://accounts.google.com", "https://coffeenoir-1fe6b.firebaseapp.com"]
        }
    }
}));

// Rate limiting - more lenient for static files
const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 200, // increased limit for static files
    message: {
        error: 'عذراً، تم تجاوز الحد المسموح من الطلبات. حاول مرة أخرى لاحقاً.',
        retryAfter: '5 دقائق'
    },
    skip: (req) => {
        // Skip rate limiting for static files
        return req.url.startsWith('/css/') || 
               req.url.startsWith('/js/') || 
               req.url.startsWith('/img/') || 
               req.url.startsWith('/lib/') || 
               req.url.startsWith('/mail/') ||
               req.url.startsWith('/uploads/');
    }
});

app.use(limiter);

// Middleware
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5000', 
        'https://coffenoirdat.onrender.com',
        process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// Serve static frontend files (CSS, JS, Images)
app.use('/css', express.static('css'));
app.use('/js', express.static('js', {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.set('Content-Type', 'text/javascript');
        }
    }
}));
app.use('/img', express.static('img'));
app.use('/lib', express.static('lib', {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.set('Content-Type', 'text/javascript');
        }
    }
}));
app.use('/mail', express.static('mail'));

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

// API info endpoint (moved from root to preserve API access)
app.get('/api', (req, res) => {
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

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/menu', (req, res) => {
    res.sendFile(path.join(__dirname, 'menu.html'));
});

app.get('/points', (req, res) => {
    res.sendFile(path.join(__dirname, 'points.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'profile.html'));
});

app.get('/cardpay', (req, res) => {
    res.sendFile(path.join(__dirname, 'cardpay.html'));
});

app.get('/hot-drinks', (req, res) => {
    res.sendFile(path.join(__dirname, 'hot-drinks.html'));
});

app.get('/cold-drinks', (req, res) => {
    res.sendFile(path.join(__dirname, 'cold-drinks.html'));
});

app.get('/desserts', (req, res) => {
    res.sendFile(path.join(__dirname, 'desserts.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'about.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/service', (req, res) => {
    res.sendFile(path.join(__dirname, 'service.html'));
});

app.get('/menucart', (req, res) => {
    res.sendFile(path.join(__dirname, 'menucart.html'));
});

app.get('/test-points', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-points.html'));
});

app.get('/testimonial', (req, res) => {
    res.sendFile(path.join(__dirname, 'testimonial.html'));
});

app.get('/reservation', (req, res) => {
    res.sendFile(path.join(__dirname, 'reservation.html'));
});

// Alternative routes (with .html extension for direct access)
app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/menu.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'menu.html'));
});

app.get('/points.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'points.html'));
});

app.get('/profile.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'profile.html'));
});

app.get('/cardpay.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'cardpay.html'));
});

app.get('/hot-drinks.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'hot-drinks.html'));
});

app.get('/cold-drinks.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'cold-drinks.html'));
});

app.get('/desserts.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'desserts.html'));
});

app.get('/about.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'about.html'));
});

app.get('/contact.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/service.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'service.html'));
});

app.get('/menucart.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'menucart.html'));
});

app.get('/test-points.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-points.html'));
});

app.get('/testimonial.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'testimonial.html'));
});

app.get('/reservation.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'reservation.html'));
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
const MONGODB_URI = process.env.MONGODB_URI || 
    process.env.DATABASE_URL || 
    'mongodb+srv://testdevices123qq_db_user:Q8dZE807gKe06dFB@cluster0.kwjeufv.mongodb.net/noir-cafe?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
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
