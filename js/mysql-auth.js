// ===================================================================
// MySQL Authentication System - نظام المصادقة MySQL
// Noir Café Client-Side Authentication
// ===================================================================

class MySQLAuth {
    constructor() {
        this.apiUrl = 'http://localhost/serveradminprov3/user-api.php';
        this.sessionToken = localStorage.getItem('session_token');
        this.user = null;
        
        // تحميل بيانات المستخدم من localStorage
        const storedUser = localStorage.getItem('user_data');
        if (storedUser) {
            try {
                this.user = JSON.parse(storedUser);
            } catch (e) {
                console.error('Error parsing stored user data:', e);
                localStorage.removeItem('user_data');
            }
        }
        
        this.init();
    }
    
    async init() {
        // التحقق من صحة الجلسة عند بدء التطبيق
        if (this.sessionToken) {
            const isValid = await this.validateSession();
            if (!isValid) {
                this.logout();
            }
        }
        
        // تحديث واجهة المستخدم
        this.updateUI();
        
        // بدء تتبع الصفحات
        this.startPageTracking();
    }
    
    // دالة تسجيل مستخدم جديد
    async register(userData) {
        try {
            const response = await fetch(`${this.apiUrl}?action=register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // حفظ بيانات الجلسة
                this.sessionToken = result.data.session_token;
                this.user = {
                    id: result.data.user_id,
                    username: result.data.username,
                    email: result.data.email,
                    points: 0
                };
                
                localStorage.setItem('session_token', this.sessionToken);
                localStorage.setItem('user_data', JSON.stringify(this.user));
                
                this.updateUI();
                
                // إظهار رسالة نجاح
                this.showNotification('تم التسجيل بنجاح! مرحباً بك في Noir Café', 'success');
                
                return { success: true, data: result.data };
            } else {
                this.showNotification(result.message, 'error');
                return { success: false, error: result.message };
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showNotification('حدث خطأ في التسجيل، يرجى المحاولة مرة أخرى', 'error');
            return { success: false, error: 'Network error' };
        }
    }
    
    // دالة تسجيل الدخول
    async login(email, password) {
        try {
            const response = await fetch(`${this.apiUrl}?action=login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // حفظ بيانات الجلسة
                this.sessionToken = result.data.session_token;
                this.user = {
                    id: result.data.user_id,
                    username: result.data.username,
                    email: result.data.email,
                    full_name: result.data.full_name,
                    points: result.data.points
                };
                
                localStorage.setItem('session_token', this.sessionToken);
                localStorage.setItem('user_data', JSON.stringify(this.user));
                
                this.updateUI();
                
                // إظهار رسالة نجاح
                this.showNotification(`مرحباً بعودتك ${this.user.username}!`, 'success');
                
                return { success: true, data: result.data };
            } else {
                this.showNotification(result.message, 'error');
                return { success: false, error: result.message };
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('حدث خطأ في تسجيل الدخول، يرجى المحاولة مرة أخرى', 'error');
            return { success: false, error: 'Network error' };
        }
    }
    
    // دالة تسجيل الخروج
    async logout() {
        try {
            if (this.sessionToken) {
                await fetch(`${this.apiUrl}?action=logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': this.sessionToken
                    }
                });
            }
        } catch (error) {
            console.error('Logout API error:', error);
        }
        
        // مسح البيانات المحلية
        this.sessionToken = null;
        this.user = null;
        localStorage.removeItem('session_token');
        localStorage.removeItem('user_data');
        
        this.updateUI();
        this.showNotification('تم تسجيل الخروج بنجاح', 'info');
    }
    
    // دالة نسيت كلمة المرور
    async forgotPassword(email) {
        try {
            const response = await fetch(`${this.apiUrl}?action=forgot_password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني', 'success');
                
                // للاختبار - إظهار الرمز
                if (result.data && result.data.reset_token) {
                    console.log('Reset Token (for testing):', result.data.reset_token);
                    this.showNotification(`رمز إعادة التعيين (للاختبار): ${result.data.reset_token}`, 'info');
                }
                
                return { success: true, data: result.data };
            } else {
                this.showNotification(result.message, 'error');
                return { success: false, error: result.message };
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            this.showNotification('حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
            return { success: false, error: 'Network error' };
        }
    }
    
    // دالة إعادة تعيين كلمة المرور
    async resetPassword(resetToken, newPassword) {
        try {
            const response = await fetch(`${this.apiUrl}?action=reset_password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    reset_token: resetToken, 
                    new_password: newPassword 
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('تم تغيير كلمة المرور بنجاح، يرجى تسجيل الدخول مرة أخرى', 'success');
                return { success: true };
            } else {
                this.showNotification(result.message, 'error');
                return { success: false, error: result.message };
            }
        } catch (error) {
            console.error('Reset password error:', error);
            this.showNotification('حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
            return { success: false, error: 'Network error' };
        }
    }
    
    // دالة التحقق من صحة الجلسة
    async validateSession() {
        if (!this.sessionToken) return false;
        
        try {
            const response = await fetch(`${this.apiUrl}?action=validate_session&session_token=${this.sessionToken}`);
            const result = await response.json();
            
            if (result.success) {
                // تحديث بيانات المستخدم
                this.user = {
                    id: result.data.user_id,
                    username: result.data.username,
                    email: result.data.email
                };
                localStorage.setItem('user_data', JSON.stringify(this.user));
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error('Session validation error:', error);
            return false;
        }
    }
    
    // دالة الحصول على ملف المستخدم
    async getProfile() {
        if (!this.sessionToken) return null;
        
        try {
            const response = await fetch(`${this.apiUrl}?action=profile&session_token=${this.sessionToken}`);
            const result = await response.json();
            
            if (result.success) {
                this.user = result.data;
                localStorage.setItem('user_data', JSON.stringify(this.user));
                return result.data;
            } else {
                return null;
            }
        } catch (error) {
            console.error('Get profile error:', error);
            return null;
        }
    }
    
    // دالة تتبع زيارة الصفحة
    async trackPageVisit(pageUrl, pageTitle) {
        try {
            await fetch(`${this.apiUrl}?action=track_visit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.sessionToken || ''
                },
                body: JSON.stringify({
                    page_url: pageUrl,
                    page_title: pageTitle,
                    session_token: this.sessionToken
                })
            });
        } catch (error) {
            console.error('Page tracking error:', error);
        }
    }
    
    // بدء تتبع الصفحات التلقائي
    startPageTracking() {
        // تتبع الصفحة الحالية
        this.trackPageVisit(window.location.href, document.title);
        
        // تتبع تغييرات الصفحة (للـ SPA)
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                this.trackPageVisit(url, document.title);
            }
        }).observe(document, { subtree: true, childList: true });
        
        // تتبع تغيير العنوان
        let lastTitle = document.title;
        new MutationObserver(() => {
            if (document.title !== lastTitle) {
                lastTitle = document.title;
                this.trackPageVisit(location.href, document.title);
            }
        }).observe(document.querySelector('title') || document.head, { 
            subtree: true, 
            childList: true 
        });
    }
    
    // تحديث واجهة المستخدم
    updateUI() {
        // تحديث أزرار تسجيل الدخول/الخروج
        const loginButtons = document.querySelectorAll('.login-btn, .auth-login');
        const logoutButtons = document.querySelectorAll('.logout-btn, .auth-logout');
        const userInfo = document.querySelectorAll('.user-info, .auth-user-info');
        
        if (this.isLoggedIn()) {
            // إخفاء أزرار تسجيل الدخول
            loginButtons.forEach(btn => {
                btn.style.display = 'none';
            });
            
            // إظهار أزرار تسجيل الخروج
            logoutButtons.forEach(btn => {
                btn.style.display = 'inline-block';
            });
            
            // تحديث معلومات المستخدم
            userInfo.forEach(info => {
                info.innerHTML = `
                    <span class="user-name">مرحباً، ${this.user.username}</span>
                    <span class="user-points">النقاط: ${this.user.points || 0}</span>
                `;
                info.style.display = 'block';
            });
        } else {
            // إظهار أزرار تسجيل الدخول
            loginButtons.forEach(btn => {
                btn.style.display = 'inline-block';
            });
            
            // إخفاء أزرار تسجيل الخروج
            logoutButtons.forEach(btn => {
                btn.style.display = 'none';
            });
            
            // إخفاء معلومات المستخدم
            userInfo.forEach(info => {
                info.style.display = 'none';
            });
        }
        
        // تحديث النقاط في أي مكان
        const pointsElements = document.querySelectorAll('.user-points-display');
        pointsElements.forEach(element => {
            element.textContent = this.user?.points || 0;
        });
    }
    
    // فحص حالة تسجيل الدخول
    isLoggedIn() {
        return this.sessionToken && this.user;
    }
    
    // الحصول على بيانات المستخدم
    getUser() {
        return this.user;
    }
    
    // إظهار الإشعارات
    showNotification(message, type = 'info') {
        // إنشاء عنصر الإشعار
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // إضافة الستايل
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            animation: slideIn 0.3s ease-out;
        `;
        
        // ألوان حسب النوع
        const colors = {
            success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
            error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
            warning: { bg: '#fff3cd', border: '#ffeaa7', text: '#856404' },
            info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' }
        };
        
        const color = colors[type] || colors.info;
        notification.style.backgroundColor = color.bg;
        notification.style.border = `1px solid ${color.border}`;
        notification.style.color = color.text;
        
        // إضافة CSS للأنيميشن
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
                .notification-close {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    float: right;
                    margin-left: 10px;
                }
            `;
            document.head.appendChild(style);
        }
        
        // إضافة للصفحة
        document.body.appendChild(notification);
        
        // إزالة تلقائية بعد 5 ثواني
        const removeNotification = () => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        };
        
        setTimeout(removeNotification, 5000);
        
        // إزالة عند الضغط على زر الإغلاق
        notification.querySelector('.notification-close').onclick = removeNotification;
    }
}

// إنشاء مثيل عام للاستخدام في جميع أنحاء التطبيق
window.mysqlAuth = new MySQLAuth();

// دوال مساعدة للاستخدام السهل
window.login = (email, password) => window.mysqlAuth.login(email, password);
window.register = (userData) => window.mysqlAuth.register(userData);
window.logout = () => window.mysqlAuth.logout();
window.forgotPassword = (email) => window.mysqlAuth.forgotPassword(email);
window.resetPassword = (token, password) => window.mysqlAuth.resetPassword(token, password);
window.isLoggedIn = () => window.mysqlAuth.isLoggedIn();
window.getUser = () => window.mysqlAuth.getUser();

console.log('✅ MySQL Auth System loaded successfully!');
console.log('Available functions: login(), register(), logout(), forgotPassword(), resetPassword(), isLoggedIn(), getUser()');
