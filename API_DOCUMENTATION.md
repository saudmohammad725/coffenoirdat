# 📚 دليل REST API الكامل - Noir Café

## 🌟 نظرة عامة

REST API متكامل لمقهى Noir Café يربط Firebase مع Node.js/MongoDB مع دعم كامل لإدارة المستخدمين والنقاط والطلبات والمنتجات.

## 🔐 المصادقة والأمان

### JWT Authentication
- **مدة الانتهاء**: 30 دقيقة
- **Header**: `Authorization: Bearer <token>`
- **تجديد تلقائي**: عبر `/api/auth/refresh`

### أدوار المستخدمين
- `user` - مستخدم عادي
- `admin` - مدير النظام
- `staff` - موظف
- `manager` - مدير المقهى

---

## 🔗 الـ Endpoints الأساسية

## 1. 👥 Users API

### GET `/api/users`
**الوصف**: جلب جميع المستخدمين (مديرين فقط)  
**الصلاحية**: Admin only  
**Query Parameters**:
```
?page=1&limit=20&status=active&role=user
```

**Response**:
```json
{
  "status": "success",
  "message": "تم جلب قائمة المستخدمين بنجاح",
  "data": {
    "users": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalUsers": 100,
      "limit": 20,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### GET `/api/users/:id`
**الوصف**: جلب مستخدم محدد  
**الصلاحية**: Owner or Admin  

**Response**:
```json
{
  "status": "success",
  "message": "تم جلب بيانات المستخدم بنجاح",
  "data": {
    "user": {
      "uid": "user123",
      "displayName": "محمد أحمد",
      "email": "mohamed@example.com",
      "points": {
        "current": 250,
        "total": 1000,
        "used": 750
      },
      "role": "user",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### PATCH `/api/users/:id`
**الوصف**: تحديث بيانات المستخدم  
**الصلاحية**: Owner or Admin  

**Request Body**:
```json
{
  "points": 300,
  "status": "active",
  "role": "admin",
  "displayName": "الاسم الجديد",
  "profile": {
    "phone": "+966501234567"
  }
}
```

**Response**:
```json
{
  "status": "success",
  "message": "تم تحديث بيانات المستخدم بنجاح",
  "data": {
    "user": {...},
    "updatedFields": ["points", "displayName"]
  }
}
```

### DELETE `/api/users/:id`
**الوصف**: حذف مستخدم (soft delete)  
**الصلاحية**: Admin only  

---

## 2. 💰 Points API

### POST `/api/points/add`
**الوصف**: إضافة نقاط للمستخدم  
**الصلاحية**: Admin or Owner (محدود)  

**Request Body**:
```json
{
  "userUid": "user123",
  "points": 100,
  "reason": "شراء باقة نقاط",
  "source": "purchase",
  "adminNote": "تمت الإضافة بنجاح",
  "relatedOrder": "ORD-2024-001"
}
```

**Response**:
```json
{
  "status": "success",
  "message": "تم إضافة النقاط بنجاح",
  "data": {
    "transaction": {...},
    "targetUser": {
      "uid": "user123",
      "displayName": "محمد أحمد",
      "newBalance": 350
    },
    "pointsAdded": 100,
    "source": "purchase"
  }
}
```

### POST `/api/points/deduct`
**الوصف**: خصم نقاط من المستخدم  
**الصلاحية**: Admin only  

### GET `/api/points/balance/:uid`
**الوصف**: جلب رصيد النقاط  
**الصلاحية**: Owner or Admin  

### GET `/api/points/transactions/:uid`
**الوصف**: جلب تاريخ معاملات النقاط  
**الصلاحية**: Owner or Admin  

### GET `/api/points/packages`
**الوصف**: جلب باقات النقاط المتاحة  
**الصلاحية**: Public  

### POST `/api/points/purchase`
**الوصف**: شراء باقة نقاط  
**الصلاحية**: Authenticated  

### POST `/api/points/redeem`
**الوصف**: استخدام النقاط للشراء  
**الصلاحية**: Authenticated  

### GET `/api/points/stats`
**الوصف**: إحصائيات النقاط  
**الصلاحية**: Admin only  

---

## 3. 🛒 Orders API

### POST `/api/orders`
**الوصف**: إنشاء طلب جديد  
**الصلاحية**: Authenticated  

**Request Body**:
```json
{
  "items": [
    {
      "name": "قهوة أمريكانو",
      "price": 15,
      "pointsPrice": 10,
      "quantity": 2,
      "options": ["سكر", "حليب"]
    }
  ],
  "orderType": "dine_in",
  "payment": {
    "method": "mixed",
    "cashAmount": 20,
    "pointsUsed": 10
  },
  "notes": {
    "customer": "بدون سكر"
  }
}
```

**Response**:
```json
{
  "status": "success",
  "message": "تم إنشاء الطلب بنجاح",
  "data": {
    "order": {
      "orderNumber": "ORD-2024-001",
      "customer": {...},
      "items": [...],
      "totals": {
        "subtotal": 30,
        "tax": 4.5,
        "total": 34.5
      },
      "status": "pending"
    },
    "userBalance": {
      "current": 240,
      "total": 1000,
      "used": 760
    }
  }
}
```

### GET `/api/orders`
**الوصف**: جلب جميع الطلبات  
**الصلاحية**: Admin only  

**Query Parameters**:
```
?page=1&limit=20&status=pending&orderType=dine_in&startDate=2024-01-01&endDate=2024-01-31
```

### GET `/api/orders/:orderNumber`
**الوصف**: جلب طلب محدد  
**الصلاحية**: Owner or Staff  

### GET `/api/orders/user/:uid`
**الوصف**: جلب طلبات المستخدم  
**الصلاحية**: Owner or Staff  

### PUT `/api/orders/:orderNumber/status`
**الوصف**: تحديث حالة الطلب  
**الصلاحية**: Staff only  

**Request Body**:
```json
{
  "status": "preparing",
  "staffInfo": {
    "name": "أحمد محمد",
    "station": "المطبخ"
  }
}
```

### DELETE `/api/orders/:orderNumber`
**الوصف**: إلغاء الطلب (مع استرداد النقاط)  
**الصلاحية**: Owner (خلال 10 دقائق) or Admin  

### GET `/api/orders/today`
**الوصف**: طلبات اليوم مع الإحصائيات  
**الصلاحية**: Staff only  

### GET `/api/orders/stats`
**الوصف**: إحصائيات مفصلة للطلبات  
**الصلاحية**: Admin only  

### POST `/api/orders/:orderNumber/feedback`
**الوصف**: إضافة تقييم للطلب  
**الصلاحية**: Order Owner  

---

## 4. 🍰 Products API

### GET `/api/products`
**الوصف**: جلب جميع المنتجات مع فلترة وبحث  
**الصلاحية**: Public  

**Query Parameters**:
```
?category=hot_drinks&featured=true&available=true&search=قهوة&page=1&limit=20&sort=popular
```

**Response**:
```json
{
  "status": "success",
  "message": "تم جلب المنتجات بنجاح",
  "data": {
    "products": [
      {
        "id": "prod123",
        "name": "قهوة أمريكانو",
        "description": "قهوة كلاسيكية بطعم قوي",
        "category": "hot_drinks",
        "pricing": {
          "regular": 15,
          "points": 10
        },
        "featured": true,
        "availability": {
          "isAvailable": true,
          "stock": 50
        },
        "ratings": {
          "average": 4.5,
          "count": 120
        }
      }
    ],
    "pagination": {...},
    "filters": {...}
  }
}
```

### GET `/api/products/featured`
**الوصف**: المنتجات المميزة  
**الصلاحية**: Public  

### GET `/api/products/bestsellers`
**الوصف**: المنتجات الأكثر مبيعاً  
**الصلاحية**: Public  

### GET `/api/products/category/:category`
**الوصف**: منتجات قسم معين  
**الصلاحية**: Public  

### GET `/api/products/:id`
**الوصف**: تفاصيل منتج محدد  
**الصلاحية**: Public  

### POST `/api/products`
**الوصف**: إضافة منتج جديد  
**الصلاحية**: Staff only  

### PUT `/api/products/:id`
**الوصف**: تحديث منتج  
**الصلاحية**: Staff only  

### POST `/api/products/:id/rating`
**الوصف**: إضافة تقييم للمنتج  
**الصلاحية**: Authenticated  

### POST `/api/products/:id/sale`
**الوصف**: تسجيل بيعة للمنتج  
**الصلاحية**: Staff only  

---

## 5. 🔐 Authentication API

### POST `/api/auth/firebase`
**الوصف**: تسجيل دخول عبر Firebase  
**الصلاحية**: Public  

### POST `/api/auth/login`
**الوصف**: تسجيل دخول بالإيميل وكلمة المرور  
**الصلاحية**: Public  

### POST `/api/auth/register`
**الوصف**: إنشاء حساب جديد  
**الصلاحية**: Public  

### POST `/api/auth/refresh`
**الوصف**: تحديث JWT token  
**الصلاحية**: Public  

### GET `/api/auth/verify`
**الوصف**: التحقق من صحة التوكن  
**الصلاحية**: Public  

### POST `/api/auth/logout`
**الوصف**: تسجيل الخروج  
**الصلاحية**: Authenticated  

---

## 📊 حالات الرد الموحدة

### نجح الطلب (2xx)
```json
{
  "status": "success",
  "message": "رسالة النجاح بالعربية",
  "data": { ... }
}
```

### خطأ في البيانات (400)
```json
{
  "status": "error",
  "message": "بيانات غير صحيحة",
  "errors": [
    {
      "field": "email",
      "message": "البريد الإلكتروني غير صحيح"
    }
  ]
}
```

### غير مصرح (401)
```json
{
  "status": "error",
  "message": "يجب تسجيل الدخول أولاً"
}
```

### ممنوع (403)
```json
{
  "status": "error",
  "message": "ليس لديك صلاحية الوصول لهذا المورد"
}
```

### غير موجود (404)
```json
{
  "status": "error",
  "message": "المورد المطلوب غير موجود"
}
```

### خطأ في الخادم (500)
```json
{
  "status": "error",
  "message": "خطأ داخلي في الخادم"
}
```

---

## 🔧 أمثلة عملية

### 1. إنشاء مستخدم جديد وإضافة نقاط
```javascript
// 1. تسجيل المستخدم
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    displayName: 'محمد أحمد'
  })
});

const { data: { token, user } } = await registerResponse.json();

// 2. إضافة نقاط ترحيبية
const addPointsResponse = await fetch('/api/points/add', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userUid: user.uid,
    points: 50,
    reason: 'نقاط ترحيبية',
    source: 'bonus'
  })
});
```

### 2. إنشاء طلب مع دفع مختلط
```javascript
const orderResponse = await fetch('/api/orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    items: [
      {
        name: 'قهوة لاتيه',
        price: 20,
        pointsPrice: 15,
        quantity: 1
      }
    ],
    orderType: 'takeaway',
    payment: {
      method: 'mixed',
      cashAmount: 10,
      pointsUsed: 15
    }
  })
});
```

### 3. جلب إحصائيات شاملة (للمديرين)
```javascript
const statsResponse = await fetch('/api/orders/stats?period=30', {
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});

const pointsStatsResponse = await fetch('/api/points/stats', {
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});
```

---

## 🌐 Integration مع Frontend

### استخدام Auth Manager
```javascript
// تسجيل الدخول وحفظ التوكن
const loginData = await apiCall('/api/auth/firebase', {...});
authManager.login(loginData);

// طلب محمي تلقائياً
const userProfile = await authManager.apiRequest('/api/users/profile');

// إضافة نقاط مع تحديث الواجهة
const pointsResult = await authManager.apiRequest('/api/points/add', {
  method: 'POST',
  body: JSON.stringify({...})
});

// تحديث إدارة النقاط
if (pointsResult.ok) {
  const data = await pointsResult.json();
  pointsManager.setPoints(data.data.targetUser.newBalance);
}
```

---

## 🚀 Performance & Optimization

### Rate Limiting
- **Auth endpoints**: 5 requests/15 minutes
- **Points operations**: 30 requests/minute
- **General API**: 100 requests/minute

### Caching
- المنتجات المميزة: 15 دقيقة
- إحصائيات النظام: 5 دقائق
- بيانات المستخدم: 2 دقيقة

### Pagination
- Default limit: 20 items
- Maximum limit: 100 items
- Total count included in response

---

## 🔍 Testing Examples

### cURL Examples

#### Get Products
```bash
curl -X GET "http://localhost:3000/api/products?category=hot_drinks&limit=5" \
  -H "Content-Type: application/json"
```

#### Create Order (Authenticated)
```bash
curl -X POST "http://localhost:3000/api/orders" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"name": "قهوة", "price": 15, "quantity": 1}],
    "orderType": "dine_in",
    "payment": {"method": "cash", "cashAmount": 15}
  }'
```

#### Add Points (Admin)
```bash
curl -X POST "http://localhost:3000/api/points/add" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userUid": "user123",
    "points": 100,
    "reason": "مكافأة خاصة"
  }'
```

---

## 📈 Monitoring & Analytics

### Logs Format
```
✅ Success: User user123 added 100 points (purchase)
❌ Error: Authentication failed for /api/orders
🔄 Info: Token refreshed for user user456
💰 Points: 50 points added to user789 by admin123
```

### Key Metrics
- API response times
- Authentication success rate
- Points transaction volume
- Order completion rate
- Error frequency by endpoint

---

**🎉 API جاهز للاستخدام مع Firebase + Node.js + MongoDB!**

للدعم التقني أو الاستفسارات، راجع الكود أو ابدأ الخادم مع `npm start`.
