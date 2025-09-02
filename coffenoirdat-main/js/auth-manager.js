/**
 * JWT Authentication Manager
 * إدارة المصادقة والتوكن في الواجهة الأمامية
 */

class AuthManager {
    constructor() {
        this.token = null;
        this.expirationTime = null;
        this.user = null;
        this.logoutTimer = null;
        this.warningTimer = null;
        
        // Initialize from localStorage
        this.loadFromStorage();
        
        // Check token validity on startup
        this.checkTokenValidity();
        
        // Set up logout warning and auto-logout
        this.setupAutoLogout();
    }

    /**
     * تحميل البيانات من localStorage
     */
    loadFromStorage() {
        try {
            this.token = localStorage.getItem('authToken');
            this.user = JSON.parse(localStorage.getItem('authUser') || 'null');
            this.expirationTime = localStorage.getItem('tokenExpiration');
            
            console.log('🔄 Loaded auth data from localStorage:', {
                hasToken: !!this.token,
                hasUser: !!this.user,
                expiration: this.expirationTime
            });
        } catch (error) {
            console.error('❌ Error loading auth data from localStorage:', error);
            this.clearAuthData();
        }
    }

    /**
     * حفظ البيانات في localStorage
     */
    saveToStorage() {
        try {
            if (this.token) {
                localStorage.setItem('authToken', this.token);
                localStorage.setItem('authUser', JSON.stringify(this.user));
                localStorage.setItem('tokenExpiration', this.expirationTime);
            } else {
                this.clearStorage();
            }
        } catch (error) {
            console.error('❌ Error saving auth data to localStorage:', error);
        }
    }

    /**
     * مسح البيانات من localStorage
     */
    clearStorage() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        localStorage.removeItem('tokenExpiration');
        console.log('🗑️ Cleared auth data from localStorage');
    }

    /**
     * تسجيل الدخول وحفظ التوكن
     */
    login(authData) {
        const { token, user, expiresAt } = authData;
        
        this.token = token;
        this.user = user;
        this.expirationTime = expiresAt;
        
        // Save to localStorage
        this.saveToStorage();
        
        // Setup auto-logout
        this.setupAutoLogout();
        
        console.log('✅ Login successful:', {
            user: user.displayName || user.email,
            expiresAt: expiresAt
        });
        
        // Trigger login event
        this.triggerEvent('login', { user, token });
        
        return true;
    }

    /**
     * تسجيل الخروج
     */
    logout(reason = 'manual') {
        console.log(`🚪 Logging out (${reason})`);
        
        // Clear timers
        if (this.logoutTimer) {
            clearTimeout(this.logoutTimer);
            this.logoutTimer = null;
        }
        if (this.warningTimer) {
            clearTimeout(this.warningTimer);
            this.warningTimer = null;
        }
        
        // Clear auth data
        this.clearAuthData();
        
        // Trigger logout event
        this.triggerEvent('logout', { reason });
        
        // Redirect to login if not manual logout
        if (reason !== 'manual') {
            this.showLogoutMessage(reason);
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 3000);
        }
    }

    /**
     * مسح بيانات المصادقة
     */
    clearAuthData() {
        this.token = null;
        this.user = null;
        this.expirationTime = null;
        this.clearStorage();
    }

    /**
     * فحص صحة التوكن
     */
    async checkTokenValidity() {
        if (!this.token || !this.expirationTime) {
            return false;
        }

        const now = new Date();
        const expiration = new Date(this.expirationTime);

        // Check if token is expired
        if (now >= expiration) {
            console.log('⏰ Token expired');
            this.logout('expired');
            return false;
        }

        // Verify with backend
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.log('❌ Token verification failed');
                this.logout('invalid');
                return false;
            }

            console.log('✅ Token is valid');
            return true;
        } catch (error) {
            console.error('❌ Error verifying token:', error);
            return true; // Don't logout on network errors
        }
    }

    /**
     * إعداد تسجيل الخروج التلقائي
     */
    setupAutoLogout() {
        // Clear existing timers
        if (this.logoutTimer) clearTimeout(this.logoutTimer);
        if (this.warningTimer) clearTimeout(this.warningTimer);

        if (!this.expirationTime) return;

        const now = new Date().getTime();
        const expiration = new Date(this.expirationTime).getTime();
        const timeLeft = expiration - now;

        if (timeLeft <= 0) {
            this.logout('expired');
            return;
        }

        // Set warning 5 minutes before expiration
        const warningTime = timeLeft - (5 * 60 * 1000); // 5 minutes before
        if (warningTime > 0) {
            this.warningTimer = setTimeout(() => {
                this.showExpirationWarning();
            }, warningTime);
        }

        // Set auto-logout at expiration
        this.logoutTimer = setTimeout(() => {
            this.logout('expired');
        }, timeLeft);

        console.log(`⏰ Auto-logout set for ${new Date(this.expirationTime).toLocaleString()}`);
    }

    /**
     * عرض تحذير انتهاء الصلاحية
     */
    showExpirationWarning() {
        const warningHtml = `
            <div id="tokenWarning" style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #ff6b6b, #ee5a52);
                color: white;
                padding: 20px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                z-index: 10000;
                font-family: 'Tajawal', sans-serif;
                text-align: center;
                min-width: 300px;
                animation: slideInRight 0.5s ease;
            ">
                <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i>
                <h4 style="margin: 0 0 10px 0; font-weight: 700;">تحذير انتهاء الجلسة</h4>
                <p style="margin: 0 0 15px 0;">ستنتهي جلستك خلال 5 دقائق</p>
                <button onclick="authManager.extendSession()" style="
                    background: white;
                    color: #ff6b6b;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-right: 10px;
                ">تمديد الجلسة</button>
                <button onclick="document.getElementById('tokenWarning').remove()" style="
                    background: transparent;
                    color: white;
                    border: 1px solid white;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-weight: 600;
                    cursor: pointer;
                ">إغلاق</button>
            </div>
            <style>
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            </style>
        `;
        
        document.body.insertAdjacentHTML('beforeend', warningHtml);
        
        // Auto-remove warning after 30 seconds
        setTimeout(() => {
            const warning = document.getElementById('tokenWarning');
            if (warning) warning.remove();
        }, 30000);
    }

    /**
     * تمديد الجلسة
     */
    async extendSession() {
        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: this.token })
            });

            if (response.ok) {
                const data = await response.json();
                this.login(data.data);
                
                // Remove warning
                const warning = document.getElementById('tokenWarning');
                if (warning) warning.remove();
                
                this.showSuccessMessage('تم تمديد الجلسة بنجاح');
            } else {
                throw new Error('Failed to refresh token');
            }
        } catch (error) {
            console.error('❌ Error extending session:', error);
            this.showErrorMessage('فشل في تمديد الجلسة');
        }
    }

    /**
     * عرض رسالة تسجيل الخروج
     */
    showLogoutMessage(reason) {
        const messages = {
            expired: 'انتهت صلاحية جلستك. سيتم توجيهك لتسجيل الدخول...',
            invalid: 'جلستك غير صحيحة. سيتم توجيهك لتسجيل الدخول...',
            error: 'حدث خطأ في الجلسة. سيتم توجيهك لتسجيل الدخول...'
        };

        const message = messages[reason] || 'تم تسجيل الخروج';
        
        const alertHtml = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 20px;
                box-shadow: 0 20px 50px rgba(0,0,0,0.3);
                z-index: 10001;
                text-align: center;
                font-family: 'Tajawal', sans-serif;
            ">
                <i class="fas fa-sign-out-alt" style="font-size: 48px; color: #DA9F5B; margin-bottom: 20px;"></i>
                <h3 style="color: #33211D; margin-bottom: 15px;">تم تسجيل الخروج</h3>
                <p style="color: #666; margin: 0;">${message}</p>
            </div>
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 10000;
            "></div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', alertHtml);
    }

    /**
     * عرض رسالة نجاح
     */
    showSuccessMessage(message) {
        this.showToast(message, 'success');
    }

    /**
     * عرض رسالة خطأ
     */
    showErrorMessage(message) {
        this.showToast(message, 'error');
    }

    /**
     * عرض toast notification
     */
    showToast(message, type = 'info') {
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            info: '#17a2b8'
        };

        const toastHtml = `
            <div style="
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: ${colors[type]};
                color: white;
                padding: 15px 25px;
                border-radius: 25px;
                z-index: 10000;
                font-family: 'Tajawal', sans-serif;
                animation: slideInDown 0.3s ease;
            ">
                ${message}
            </div>
            <style>
                @keyframes slideInDown {
                    from { transform: translate(-50%, -100%); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
            </style>
        `;
        
        const toast = document.createElement('div');
        toast.innerHTML = toastHtml;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    /**
     * إطلاق أحداث مخصصة
     */
    triggerEvent(eventName, data) {
        const event = new CustomEvent(`auth:${eventName}`, { detail: data });
        document.dispatchEvent(event);
    }

    /**
     * الحصول على header المصادقة
     */
    getAuthHeader() {
        return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
    }

    /**
     * فحص حالة تسجيل الدخول
     */
    isLoggedIn() {
        return !!(this.token && this.user && this.expirationTime);
    }

    /**
     * الحصول على المستخدم الحالي
     */
    getCurrentUser() {
        return this.user;
    }

    /**
     * الحصول على التوكن
     */
    getToken() {
        return this.token;
    }

    /**
     * طلب API مع التوكن
     */
    async apiRequest(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...this.getAuthHeader(),
            ...(options.headers || {})
        };

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);
            
            // Check if token expired
            if (response.status === 401) {
                this.logout('unauthorized');
                throw new Error('Unauthorized');
            }
            
            return response;
        } catch (error) {
            console.error('❌ API request failed:', error);
            throw error;
        }
    }
}

// Initialize auth manager globally
window.authManager = new AuthManager();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}

console.log('🔐 Auth Manager initialized');
