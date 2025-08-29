# 🔧 متغيرات البيئة المطلوبة في Render

## 📋 القائمة الكاملة لمتغيرات البيئة

### في Render Dashboard → Environment Variables:

```bash
# ===== Database Configuration =====
MONGODB_URI=mongodb+srv://admin:YOUR_PASSWORD@cluster0.mongodb.net/noir-cafe?retryWrites=true&w=majority

# ===== Server Configuration =====
PORT=10000
NODE_ENV=production
FRONTEND_URL=https://coffenoirdat.onrender.com

# ===== JWT Configuration =====
JWT_SECRET=noir-cafe-super-secret-production-key-2024-very-secure
JWT_EXPIRES_IN=30m

# ===== Firebase Configuration (إذا كنت تستخدمه) =====
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-firebase-client-id
FIREBASE_TYPE=service_account
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com

# ===== Security Configuration =====
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🗄️ إعداد MongoDB Atlas (مطلوب فوراً!)

### 1. إنشاء حساب MongoDB Atlas:
1. اذهب إلى: https://cloud.mongodb.com
2. سجل حساب جديد أو سجل الدخول
3. أنشئ Cluster جديد (اختر Free Tier)

### 2. إعداد Database User:
```bash
Username: admin
Password: [أنشئ كلمة مرور قوية مثل: NoirCafe2024@Production]
```

### 3. إعداد Network Access:
```bash
IP Address: 0.0.0.0/0
Description: Allow access from anywhere (for Render deployment)
```

### 4. الحصول على Connection String:
```bash
# انقر على "Connect" → "Connect your application"
# اختر Driver: Node.js
# انسخ الرابط وضع كلمة المرور الصحيحة

mongodb+srv://admin:YOUR_ACTUAL_PASSWORD@cluster0.mongodb.net/noir-cafe?retryWrites=true&w=majority
```

---

## 🚀 خطوات إعداد Render

### 1. اذهب إلى Render Dashboard:
- https://dashboard.render.com

### 2. اختر الخدمة الخاصة بك:
- Noir Café Backend Service

### 3. اذهب إلى Environment:
- Environment Variables tab

### 4. أضف المتغيرات واحد تلو الآخر:

#### المتغيرات الأساسية (مطلوبة):
```
Key: MONGODB_URI
Value: mongodb+srv://admin:YOUR_ACTUAL_PASSWORD@cluster0.mongodb.net/noir-cafe?retryWrites=true&w=majority

Key: JWT_SECRET  
Value: noir-cafe-production-secret-key-very-secure-2024

Key: NODE_ENV
Value: production

Key: PORT
Value: 10000

Key: FRONTEND_URL
Value: https://coffenoirdat.onrender.com
```

### 5. احفظ التغييرات:
- اضغط "Save Changes"
- سيتم إعادة نشر الخدمة تلقائياً

---

## ✅ التحقق من النجاح

### بعد إضافة المتغيرات، تحقق من Logs:
```bash
✅ تم الاتصال بقاعدة البيانات بنجاح
✅ Server running on port 10000
✅ Environment: production
```

### اختبر الـ endpoints:
```bash
# Health check
https://coffenoirdat.onrender.com/health

# API info  
https://coffenoirdat.onrender.com/

# Products
https://coffenoirdat.onrender.com/api/products
```

---

## 🆘 استكشاف الأخطاء

### إذا استمر خطأ MongoDB:
1. **تحقق من كلمة المرور**: تأكد أنها صحيحة في MongoDB Atlas
2. **تحقق من IP Whitelist**: يجب أن يكون `0.0.0.0/0`
3. **تحقق من الرابط**: تأكد من عدم وجود مسافات إضافية
4. **تحقق من اسم Database**: يجب أن يكون `noir-cafe`

### إذا استمرت المشاكل:
```bash
# في Render Logs, ابحث عن:
❌ خطأ في الاتصال بقاعدة البيانات

# الحل:
1. اذهب إلى MongoDB Atlas → Database Access
2. تأكد من وجود المستخدم "admin"
3. اعد تعيين كلمة المرور
4. حدث MONGODB_URI في Render
```

---

## 🔄 إعادة النشر

### بعد إضافة جميع المتغيرات:
1. اذهب إلى Deployments tab
2. اضغط "Manual Deploy"
3. اختر "Deploy latest commit"
4. راقب الـ Logs للتأكد من النجاح

---

## 📱 النتيجة المتوقعة

### Logs ناجحة:
```bash
🚀 خادم نوار كافيه يعمل على المنفذ: 10000
🌐 Server running at: http://localhost:10000
📚 API Documentation: http://localhost:10000/api/docs
💡 Environment: production
✅ تم الاتصال بقاعدة البيانات بنجاح
🎯 Database: MongoDB connected successfully
```

### URLs جاهزة:
- **Frontend**: https://coffenoirdat.onrender.com
- **API Base**: https://coffenoirdat.onrender.com/api
- **Health Check**: https://coffenoirdat.onrender.com/health

---

## 🎉 بعد النجاح

### تأكد من عمل الـ API:
```bash
# اختبر endpoints مختلفة:
curl https://coffenoirdat.onrender.com/health
curl https://coffenoirdat.onrender.com/api/products
curl https://coffenoirdat.onrender.com/api/points/packages
```

### مراقبة الأداء:
- راقب Metrics في Render Dashboard
- تحقق من استخدام CPU/Memory
- راقب Response Times

**🏆 بهذا سيكون التطبيق جاهز ويعمل بنجاح على Render!** 🚀☕
