# 🍵 Noir Café Backend API

مرحباً بك في الخادم الخلفي لمقهى نوار - نظام إدارة مقهى متكامل مع Node.js و MongoDB.

## 🚀 المميزات

### 🔐 نظام المصادقة والحماية
- **JWT Authentication** للمصادقة الآمنة
- **Firebase Integration** لتسجيل الدخول بـ Google/Twitter
- **Role-based Access Control** (Customer, Staff, Manager, Admin)
- **Rate Limiting** لحماية API من الاستخدام المفرط
- **Input Validation** مع express-validator
- **Security Headers** مع Helmet

### 👥 إدارة المستخدمين
- **ملفات شخصية كاملة** مع الإعدادات المخصصة
- **نظام النقاط والولاء** مع مستويات مختلفة
- **تتبع نشاط المستخدم** والجلسات
- **إدارة العناوين** ومعلومات التوصيل

### 🪙 نظام النقاط المتطور
- **36 باقة نقاط** مختلفة (10-1000 نقطة)
- **نقاط مجانية** مع الباقات الكبيرة
- **تتبع المعاملات** بالتفصيل
- **تحليلات وإحصائيات** شاملة

### 🛍️ إدارة الطلبات
- **أنواع طلبات متعددة** (في المطعم، تيك أواي، توصيل)
- **طرق دفع متنوعة** (نقاط، نقد، بطاقة)
- **تتبع حالة الطلب** في الوقت الفعلي
- **نظام التقييم** والملاحظات

### 📦 إدارة المنتجات
- **فئات متعددة** (مشروبات ساخنة/باردة، حلويات)
- **تخصيصات المنتجات** والأحجام
- **تتبع المخزون** والمبيعات
- **نظام التقييمات** للمنتجات

## 📋 متطلبات النظام

```bash
Node.js >= 16.0.0
MongoDB >= 4.4
npm >= 8.0.0
```

## 🔧 التثبيت والإعداد

### 1. تحميل المشروع
```bash
git clone <repository-url>
cd noir-cafe-backend
npm install
```

### 2. إعداد متغيرات البيئة
```bash
cp env.example .env
```

قم بتحرير ملف `.env` وأضف الإعدادات التالية:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/noir-cafe

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Firebase Admin (Optional)
FIREBASE_PROJECT_ID=coffeenoir-1fe6b
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@coffeenoir-1fe6b.iam.gserviceaccount.com
```

### 3. تشغيل قاعدة البيانات
```bash
# تثبيت وتشغيل MongoDB
mongod --dbpath /path/to/your/data/directory
```

### 4. تشغيل الخادم
```bash
# وضع التطوير
npm run dev

# وضع الإنتاج
npm start
```

## 📚 API Documentation

### 🔐 Authentication Endpoints

#### POST `/api/auth/firebase`
تسجيل الدخول باستخدام Firebase

```json
{
  "uid": "firebase-user-id",
  "email": "user@example.com",
  "displayName": "اسم المستخدم",
  "photoURL": "https://...",
  "provider": "google.com"
}
```

#### POST `/api/auth/login`
تسجيل الدخول بالبريد الإلكتروني

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### POST `/api/auth/register`
إنشاء حساب جديد

```json
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "اسم المستخدم"
}
```

### 🪙 Points Endpoints

#### GET `/api/points/packages`
جلب باقات النقاط المتاحة

#### GET `/api/points/balance/:uid`
جلب رصيد النقاط للمستخدم

#### POST `/api/points/purchase`
شراء باقة نقاط

```json
{
  "packagePoints": 100,
  "packagePrice": 100,
  "paymentMethod": "card",
  "paymentDetails": {
    "cardType": "visa",
    "last4": "1234"
  }
}
```

#### POST `/api/points/redeem`
استخدام النقاط

```json
{
  "pointsToRedeem": 50,
  "items": [
    {
      "name": "قهوة أمريكانو",
      "quantity": 1,
      "pointsPrice": 25
    }
  ]
}
```

### 👥 Users Endpoints

#### GET `/api/users/profile/:uid`
جلب الملف الشخصي

#### PUT `/api/users/profile/:uid`
تحديث الملف الشخصي

#### GET `/api/users/leaderboard`
قائمة المتصدرين في النقاط

### 🛍️ Orders Endpoints

#### POST `/api/orders`
إنشاء طلب جديد

```json
{
  "items": [
    {
      "name": "قهوة أمريكانو",
      "price": 15,
      "pointsPrice": 25,
      "quantity": 2,
      "category": "hot_drinks"
    }
  ],
  "orderType": "dine_in",
  "payment": {
    "method": "points",
    "pointsUsed": 50
  }
}
```

#### GET `/api/orders/user/:uid`
جلب طلبات المستخدم

#### PUT `/api/orders/:orderNumber/status`
تحديث حالة الطلب (للموظفين)

### 📦 Products Endpoints

#### GET `/api/products`
جلب جميع المنتجات مع الفلترة

**المعاملات:**
- `category`: القسم (hot_drinks, cold_drinks, desserts)
- `featured`: المنتجات المميزة
- `search`: البحث
- `page`: رقم الصفحة
- `limit`: عدد النتائج
- `sort`: ترتيب (price_low, price_high, popular, rating)

#### GET `/api/products/featured`
المنتجات المميزة

#### GET `/api/products/bestsellers`
الأكثر مبيعاً

#### GET `/api/products/category/:category`
منتجات حسب القسم

## 🗄️ هيكل قاعدة البيانات

### 👤 Users Collection
```javascript
{
  uid: String,           // معرف المستخدم الفريد
  email: String,         // البريد الإلكتروني
  displayName: String,   // الاسم المعروض
  points: {
    current: Number,     // النقاط الحالية
    total: Number,       // إجمالي النقاط المكتسبة
    used: Number         // النقاط المستخدمة
  },
  loyalty: {
    tier: String,        // مستوى الولاء (bronze, silver, gold, platinum)
    totalSpent: Number   // إجمالي المبلغ المنفق
  },
  // ... مزيد من الحقول
}
```

### 🪙 PointsTransactions Collection
```javascript
{
  transactionId: String,  // رقم المعاملة الفريد
  user: {
    uid: String,
    name: String,
    email: String
  },
  type: String,           // نوع المعاملة (purchase, redemption, bonus)
  points: {
    amount: Number,       // كمية النقاط (+/-)
    balanceBefore: Number,
    balanceAfter: Number
  },
  status: String,         // حالة المعاملة
  // ... تفاصيل إضافية
}
```

### 📦 Products Collection
```javascript
{
  name: String,           // اسم المنتج
  category: String,       // القسم
  pricing: {
    regular: Number,      // السعر بالريال
    points: Number        // السعر بالنقاط
  },
  availability: {
    isAvailable: Boolean,
    maxDailyQuantity: Number
  },
  ratings: {
    average: Number,
    count: Number
  },
  // ... تفاصيل إضافية
}
```

### 🛍️ Orders Collection
```javascript
{
  orderNumber: String,    // رقم الطلب الفريد
  customer: {
    uid: String,
    name: String,
    email: String
  },
  items: [Array],         // قائمة المنتجات
  totals: {
    subtotal: Number,
    tax: Number,
    total: Number
  },
  payment: {
    method: String,
    status: String,
    pointsUsed: Number
  },
  status: String,         // حالة الطلب
  // ... تفاصيل إضافية
}
```

## 🛡️ الأمان والحماية

### 🔐 JWT Authentication
- تشفير آمن للرموز المميزة
- انتهاء صلاحية قابل للتخصيص
- تحديث الرموز تلقائياً

### 🛡️ Input Validation
- التحقق من صحة جميع المدخلات
- منع SQL/NoSQL Injection
- تنظيف البيانات المدخلة

### 🚦 Rate Limiting
- حد أقصى للطلبات لكل IP
- حماية من هجمات DDoS
- تخصيص الحدود حسب النقطة

### 🔒 Security Headers
- منع XSS attacks
- CSRF protection
- Content Security Policy

## 📊 المراقبة والتحليلات

### 📈 إحصائيات النقاط
```bash
GET /api/points/stats
```

### 📋 تقارير المبيعات
```bash
GET /api/orders/stats?startDate=2024-01-01&endDate=2024-01-31
```

### 👥 تحليلات المستخدمين
```bash
GET /api/users/analytics
```

## 🧪 الاختبار

```bash
# تشغيل الاختبارات
npm test

# تشغيل اختبارات التغطية
npm run test:coverage
```

## 🚀 النشر للإنتاج

### 1. إعداد متغيرات البيئة
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/noir-cafe
JWT_SECRET=super-secure-production-secret
```

### 2. بناء المشروع
```bash
npm run build
```

### 3. تشغيل الخادم
```bash
npm start
```

## 🔧 استكشاف الأخطاء

### مشاكل الاتصال بقاعدة البيانات
```bash
# تحقق من تشغيل MongoDB
sudo systemctl status mongod

# تحقق من الاتصال
mongo --eval "db.adminCommand('ismaster')"
```

### مشاكل JWT
```bash
# تحقق من متغير JWT_SECRET
echo $JWT_SECRET
```

### مشاكل الشبكة
```bash
# تحقق من المنفذ
netstat -an | grep 5000
```

## 📞 الدعم والمساعدة

- **الوثائق:** `/api/docs`
- **Health Check:** `/health`
- **البريد الإلكتروني:** support@noir-cafe.com

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT - انظر ملف [LICENSE](LICENSE) للتفاصيل.

---

**تم تطويره بـ ❤️ لمقهى نوار**
