# 🔥 إعداد Firebase و Firestore

## المشكلة الحالية
```
FirebaseError: Missing or insufficient permissions.
```

## الحلول المتاحة

### 1. إعداد قواعد Firestore (الحل الأفضل)

#### الخطوة 1: الذهاب إلى Firebase Console
1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. اختر مشروعك: `coffeenoir-1fe6b`
3. اذهب إلى **Firestore Database** من القائمة الجانبية

#### الخطوة 2: تحديث قواعد الأمان
1. انقر على تبويب **Rules**
2. استبدل القواعد الحالية بالقواعد التالية:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow users to read and write their own activity logs
    match /user_activity/{activityId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
    }
    
    // Allow public read access to some collections (optional)
    match /public/{document=**} {
      allow read: if true;
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. انقر على **Publish**

### 2. تفعيل Authentication Providers

#### تفعيل Google Authentication:
1. اذهب إلى **Authentication** > **Sign-in method**
2. انقر على **Google**
3. فعّل **Enable**
4. أدخل **Project support email**
5. انقر **Save**

#### تفعيل Twitter Authentication:
1. اذهب إلى **Authentication** > **Sign-in method**
2. انقر على **Twitter**
3. فعّل **Enable**
4. أدخل **API Key** و **API Secret** من Twitter Developer Console
5. انقر **Save**

### 3. إعداد Authorized Domains
1. اذهب إلى **Authentication** > **Settings**
2. في قسم **Authorized domains**
3. أضف نطاقك (مثل `localhost` للتطوير)

## النظام الاحتياطي

إذا لم تتمكن من إصلاح Firestore، النظام سيعمل تلقائياً مع localStorage:

✅ **المصادقة تعمل** - Google و Twitter  
✅ **حفظ البيانات** - في متصفح المستخدم  
✅ **سجل الأنشطة** - محفوظ محلياً  
✅ **الإعدادات** - تعمل بشكل كامل  

## اختبار النظام

1. افتح `profile.html` في المتصفح
2. اضغط على "تسجيل الدخول"
3. اختر Google أو Twitter
4. النظام سيعمل سواء كان Firestore متاحاً أم لا

## ملاحظات مهمة

- **في وضع localStorage**: البيانات محفوظة في متصفح المستخدم فقط
- **في وضع Firestore**: البيانات محفوظة في السحابة ومتاحة من أي جهاز
- **الأمان**: قواعد Firestore تسمح للمستخدمين بالوصول لبياناتهم فقط

## استكشاف الأخطاء

إذا استمرت المشكلة:
1. تحقق من إعدادات Firebase في `firebase-config.js`
2. تأكد من تفعيل Firestore في Firebase Console
3. تحقق من قواعد الأمان
4. تأكد من تفعيل Authentication providers
