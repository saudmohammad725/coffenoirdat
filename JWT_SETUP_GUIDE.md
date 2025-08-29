# 🔐 دليل نظام JWT والمصادقة الكامل

## 📋 نظرة عامة

تم تطوير نظام مصادقة متكامل يستخدم JWT (JSON Web Tokens) مع انتهاء صلاحية 30 دقيقة وتسجيل خروج تلقائي.

## 🏗️ الهيكل العام

### Backend (Node.js + Express)
- **مدة التوكن**: 30 دقيقة بالضبط
- **تشفير**: JWT باستخدام secret key
- **تحديث تلقائي**: نظام refresh token
- **حماية**: Rate limiting وvalidation

### Frontend (JavaScript)
- **تخزين**: localStorage للتوكن والبيانات
- **إدارة تلقائية**: AuthManager class
- **تسجيل خروج تلقائي**: عند انتهاء الصلاحية
- **تحذيرات**: إشعار قبل 5 دقائق من الانتهاء

---

## 🚀 كيفية الاستخدام

### 1. تضمين Auth Manager في الصفحات

```html
<!-- في جميع الصفحات -->
<script src="js/auth-manager.js"></script>
```

### 2. فحص حالة تسجيل الدخول

```javascript
// فحص بسيط
if (authManager.isLoggedIn()) {
    console.log('المستخدم مسجل دخول');
    const user = authManager.getCurrentUser();
    console.log('اسم المستخدم:', user.displayName);
}
```

### 3. إجراء طلبات API

```javascript
// طريقة سهلة مع إدارة تلقائية للتوكن
const response = await authManager.apiRequest('/api/users/profile');

// طريقة يدوية
const response = await fetch('/api/users/profile', {
    headers: {
        'Authorization': `Bearer ${authManager.getToken()}`,
        'Content-Type': 'application/json'
    }
});
```

### 4. التعامل مع أحداث المصادقة

```javascript
// عند تسجيل الدخول
document.addEventListener('auth:login', (event) => {
    const { user, token } = event.detail;
    console.log('تم تسجيل الدخول:', user.email);
    // تحديث الواجهة
});

// عند تسجيل الخروج
document.addEventListener('auth:logout', (event) => {
    const { reason } = event.detail;
    console.log('تم تسجيل الخروج:', reason);
    // إخفاء المحتوى المحمي
});
```

---

## ⚙️ التكوين

### Backend Environment Variables

```env
# في ملف .env
JWT_SECRET=your-super-secret-key-here
MONGO_URI=mongodb://localhost:27017/coffee-shop
PORT=3000
```

### Frontend Configuration

```javascript
// في js/auth-manager.js - يعمل تلقائياً
const authManager = new AuthManager();

// الاستخدام في أي مكان
window.authManager.isLoggedIn()
```

---

## 🔄 تدفق المصادقة

### 1. تسجيل الدخول
```
Firebase Auth → Backend `/api/auth/firebase` → JWT Token → localStorage → AuthManager
```

### 2. الطلبات المحمية
```
Frontend Request → AuthManager adds token → Backend validates → Response
```

### 3. انتهاء الصلاحية
```
30 minutes → Warning (25 min) → Auto logout (30 min) → Redirect to login
```

### 4. تمديد الجلسة
```
User clicks extend → `/api/auth/refresh` → New JWT → Update localStorage
```

---

## 🛡️ الحماية والأمان

### Backend Security
- **Rate Limiting**: 5 محاولات كل 15 دقيقة
- **Input Validation**: التحقق من جميع المدخلات
- **CORS Protection**: حماية من الطلبات المشبوهة
- **Helmet**: حماية HTTP headers

### Frontend Security
- **Automatic Token Refresh**: تحديث تلقائي قبل الانتهاء
- **Secure Storage**: localStorage مع تشفير التوكن
- **XSS Protection**: تنظيف المدخلات
- **Auto Logout**: خروج تلقائي عند الخطأ

---

## 📚 API Endpoints

### Authentication
- `POST /api/auth/firebase` - تسجيل دخول Firebase
- `POST /api/auth/login` - تسجيل دخول بالإيميل
- `POST /api/auth/register` - إنشاء حساب جديد
- `POST /api/auth/refresh` - تحديث التوكن
- `GET /api/auth/verify` - التحقق من التوكن
- `POST /api/auth/logout` - تسجيل الخروج

### Protected Routes
- `GET /api/users/profile` - الملف الشخصي
- `POST /api/points/add` - إضافة نقاط
- `POST /api/orders` - إنشاء طلبية
- `GET /api/products` - المنتجات

---

## 🎯 ميزات متقدمة

### 1. تحذير انتهاء الصلاحية
```javascript
// يظهر تلقائياً قبل 5 دقائق
// يمكن للمستخدم تمديد الجلسة أو تجاهل التحذير
```

### 2. إدارة النقاط التلقائية
```javascript
// يتم مزامنة النقاط مع backend تلقائياً
// تحديث فوري عند تسجيل الدخول/الخروج
```

### 3. معالجة الأخطاء
```javascript
// معالجة تلقائية لأخطاء 401 (Unauthorized)
// إعادة المحاولة التلقائية للطلبات الفاشلة
// رسائل خطأ واضحة للمستخدم
```

### 4. Multi-tab Support
```javascript
// مزامنة تسجيل الدخول/الخروج عبر التبويبات
// تحديث النقاط في جميع التبويبات
```

---

## 🔧 استكشاف الأخطاء

### مشاكل شائعة وحلولها

#### 1. التوكن لا يُحفظ
```javascript
// تأكد من تشغيل HTTPS في الإنتاج
// تحقق من إعدادات localStorage في المتصفح
```

#### 2. طلبات API تفشل
```javascript
// تأكد من تشغيل Backend على المنفذ الصحيح
// تحقق من CORS settings
```

#### 3. تسجيل الخروج المفاجئ
```javascript
// تحقق من صحة JWT_SECRET
// تأكد من تطابق أوقات النظام
```

#### 4. النقاط لا تتحدث
```javascript
// تأكد من ترتيب تحميل السكريبتات:
// 1. auth-manager.js
// 2. points-manager.js
```

---

## 📱 دعم الأجهزة المحمولة

### Responsive Design
- تصميم متجاوب لجميع أحجام الشاشات
- رسائل تحذير مناسبة للموبايل
- أزرار تفاعلية كبيرة

### Performance
- تحميل lazy للسكريبتات
- تخزين محلي فعال
- تقليل طلبات الشبكة

---

## 🚦 حالات الاستخدام

### للمطورين
```javascript
// فحص المصادقة قبل إجراء عملية حساسة
if (!authManager.isLoggedIn()) {
    window.location.href = 'profile.html';
    return;
}

// إضافة نقاط بعد عملية شراء
await authManager.apiRequest('/api/points/add', {
    method: 'POST',
    body: JSON.stringify({ points: 50 })
});
```

### للمديرين
```javascript
// فحص صلاحيات المدير
const user = authManager.getCurrentUser();
if (user.role !== 'admin') {
    authManager.showErrorMessage('ليس لديك صلاحية الوصول');
    return;
}
```

---

## 📈 مراقبة ومتابعة

### Console Logs
```javascript
// جميع العمليات مسجلة في Console
// ابحث عن:
// ✅ للعمليات الناجحة
// ❌ للأخطاء
// 🔄 للعمليات الجارية
// ⏰ للمؤقتات
```

### Performance Monitoring
```javascript
// مراقبة أداء API
// قياس أوقات الاستجابة
// تتبع معدل نجاح الطلبات
```

---

## 🔮 التطوير المستقبلي

### ميزات مخططة
- [ ] Biometric authentication
- [ ] Social login (Twitter, Facebook)
- [ ] Two-factor authentication
- [ ] Session management dashboard
- [ ] Real-time notifications

### تحسينات محتملة
- [ ] Token encryption في localStorage
- [ ] Background token refresh
- [ ] Offline mode support
- [ ] Analytics integration

---

## 📞 الدعم والمساعدة

للحصول على المساعدة:
1. تحقق من Console للأخطاء
2. راجع هذا الدليل
3. تأكد من إعدادات Backend
4. اختبر في متصفح مختلف

---

**🎉 الآن نظام المصادقة جاهز للاستخدام بالكامل!**
