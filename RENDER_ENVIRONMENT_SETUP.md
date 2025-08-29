# 🚀 إعداد متغيرات البيئة في Render - الآن!

## 📋 بيانات قاعدة البيانات الصحيحة:

```bash
Username: testdevices123qq_db_user
Password: Q8dZE807gKe06dFB
Database URL: mongodb+srv://testdevices123qq_db_user:Q8dZE807gKe06dFB@cluster0.kwjeufv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

---

## ⚡ اذهب إلى Render Dashboard الآن:

### 1. افتح: https://dashboard.render.com
### 2. اختر الـ Service الخاص بـ Noir Café
### 3. اذهب إلى **Environment** tab
### 4. أضف هذه المتغيرات **بالضبط**:

```bash
Key: MONGODB_URI
Value: mongodb+srv://testdevices123qq_db_user:Q8dZE807gKe06dFB@cluster0.kwjeufv.mongodb.net/noir-cafe?retryWrites=true&w=majority

Key: JWT_SECRET
Value: noir-cafe-production-secret-key-2024-very-secure

Key: NODE_ENV
Value: production

Key: PORT
Value: 10000

Key: FRONTEND_URL
Value: https://coffenoirdat.onrender.com
```

### 5. اضغط **Save Changes**

---

## 🔄 إعادة النشر:

### في نفس Dashboard:
1. اذهب إلى **Deployments** tab
2. اضغط **Manual Deploy**
3. اختر **Deploy latest commit**
4. انتظر 2-3 دقائق

---

## ✅ تحقق من النجاح:

### ستظهر في الـ Logs:
```bash
✅ تم الاتصال بقاعدة البيانات بنجاح
🚀 خادم نوار كافيه يعمل على المنفذ: 10000
🌐 Server running at: http://localhost:10000
💡 Environment: production
```

### اختبر هذه الروابط:
```bash
https://coffenoirdat.onrender.com/health
https://coffenoirdat.onrender.com/api/products
```

---

## 🎯 الخطوات مرقمة:

### الخطوة 1: أضف MONGODB_URI
```
Key: MONGODB_URI
Value: mongodb+srv://testdevices123qq_db_user:Q8dZE807gKe06dFB@cluster0.kwjeufv.mongodb.net/noir-cafe?retryWrites=true&w=majority
```

### الخطوة 2: أضف JWT_SECRET
```
Key: JWT_SECRET
Value: noir-cafe-production-secret-key-2024-very-secure
```

### الخطوة 3: أضف NODE_ENV
```
Key: NODE_ENV
Value: production
```

### الخطوة 4: أضف PORT
```
Key: PORT
Value: 10000
```

### الخطوة 5: أضف FRONTEND_URL
```
Key: FRONTEND_URL
Value: https://coffenoirdat.onrender.com
```

### الخطوة 6: احفظ وأعد النشر
- Save Changes
- Deployments → Manual Deploy

---

## 🎉 النتيجة:

**🏆 سيعمل التطبيق بنجاح في غضون 3 دقائق!** ✨
