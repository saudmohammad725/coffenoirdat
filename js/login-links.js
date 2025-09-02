/**
 * تحديث روابط تسجيل الدخول في جميع الصفحات
 * يضيف روابط للصفحة الجديدة login.html
 */

document.addEventListener('DOMContentLoaded', function() {
    // البحث عن جميع الروابط والأزرار التي تحتوي على نص تسجيل الدخول
    const loginElements = document.querySelectorAll('[data-toggle="modal"][data-target="#loginModal"], .btn[onclick*="login"], a[href*="login"], button[onclick*="signIn"]');
    
    loginElements.forEach(element => {
        // تحويل الأزرار إلى روابط
        if (element.tagName === 'BUTTON') {
            const link = document.createElement('a');
            link.href = 'login.html';
            link.className = element.className;
            link.innerHTML = element.innerHTML;
            element.parentNode.replaceChild(link, element);
        }
        // تحديث الروابط الموجودة
        else if (element.tagName === 'A') {
            element.href = 'login.html';
            element.removeAttribute('data-toggle');
            element.removeAttribute('data-target');
            element.removeAttribute('onclick');
        }
    });
    
    // إضافة رابط تسجيل الدخول في الـ navbar إذا لم يكن موجوداً
    const navbar = document.querySelector('.navbar-nav');
    if (navbar && !document.querySelector('a[href="login.html"]')) {
        // فحص إذا كان المستخدم غير مسجل دخول
        if (!window.authManager || !window.authManager.isLoggedIn()) {
            const loginLink = document.createElement('a');
            loginLink.href = 'login.html';
            loginLink.className = 'nav-item nav-link';
            loginLink.innerHTML = '<i class="fa fa-sign-in-alt"></i> تسجيل الدخول';
            
            // إضافة الرابط في نهاية القائمة
            const navItem = document.createElement('div');
            navItem.className = 'nav-item';
            navItem.appendChild(loginLink);
            navbar.appendChild(navItem);
        }
    }
    
    console.log('✅ Login links updated');
});
