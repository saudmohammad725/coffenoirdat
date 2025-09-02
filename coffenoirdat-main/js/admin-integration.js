/**
 * نظام التكامل مع لوحة الأدمن - Noir Café
 * يربط بين الموقع الرئيسي ولوحة الإدارة
 */

class AdminIntegration {
    constructor() {
        this.adminApiUrl = window.location.origin.includes('localhost') 
            ? 'http://localhost/serveradminprov3/api.php'
            : '/serveradminprov3/api.php';
        this.apiKey = 'client_website_key';
        this.syncInterval = null;
        this.lastSyncTime = null;
        
        this.initializeIntegration();
    }

    /**
     * تهيئة نظام التكامل
     */
    initializeIntegration() {
        console.log('🔗 تهيئة نظام التكامل مع لوحة الأدمن...');
        
        // الاستماع لأحداث المصادقة
        this.setupAuthListeners();
        
        // بدء المزامنة الدورية
        this.startPeriodicSync();
        
        // مزامنة المستخدم الحالي
        if (window.authManager && window.authManager.isLoggedIn()) {
            this.syncCurrentUser();
        }
    }

    /**
     * إعداد مستمعي أحداث المصادقة
     */
    setupAuthListeners() {
        // عند تسجيل الدخول
        document.addEventListener('auth:login', async (event) => {
            const { user } = event.detail;
            console.log('👤 مستخدم سجل دخول، مزامنة مع لوحة الأدمن:', user.displayName);
            await this.syncUserWithAdmin(user, 'login');
        });

        // عند تسجيل الخروج
        document.addEventListener('auth:logout', async (event) => {
            console.log('🚪 مستخدم سجل خروج');
            this.stopPeriodicSync();
        });

        // عند تحديث النقاط
        window.addEventListener('pointsUpdated', async (event) => {
            const { points } = event.detail;
            if (window.authManager && window.authManager.isLoggedIn()) {
                await this.updateUserPointsInAdmin(points);
            }
        });
    }

    /**
     * مزامنة المستخدم مع لوحة الأدمن
     */
    async syncUserWithAdmin(user, action = 'sync') {
        try {
            const userData = {
                firebase_uid: user.uid,
                email: user.email,
                display_name: user.displayName,
                phone_number: user.phoneNumber || null,
                points_balance: user.points?.current || 0,
                photo_url: user.photoURL || null,
                provider: user.providerData?.[0]?.providerId || 'firebase',
                last_login: new Date().toISOString(),
                action: action
            };

            const response = await this.makeApiRequest('POST', 'sync_user', userData);
            
            if (response.success) {
                console.log('✅ تم مزامنة المستخدم مع لوحة الأدمن بنجاح');
                
                // تحديث النقاط المحلية إذا كانت مختلفة
                if (response.data && response.data.points_balance !== undefined) {
                    const currentPoints = window.pointsManager.getPoints();
                    if (currentPoints !== response.data.points_balance) {
                        console.log(`💰 تحديث النقاط: ${currentPoints} → ${response.data.points_balance}`);
                        window.pointsManager.setPoints(response.data.points_balance);
                    }
                }
            } else {
                console.warn('⚠️ فشل في مزامنة المستخدم:', response.message);
            }
        } catch (error) {
            console.error('❌ خطأ في مزامنة المستخدم:', error);
        }
    }

    /**
     * مزامنة المستخدم الحالي
     */
    async syncCurrentUser() {
        if (!window.authManager || !window.authManager.isLoggedIn()) {
            return;
        }

        const user = window.authManager.getCurrentUser();
        if (user) {
            await this.syncUserWithAdmin(user, 'sync');
        }
    }

    /**
     * تحديث نقاط المستخدم في لوحة الأدمن
     */
    async updateUserPointsInAdmin(points) {
        try {
            const user = window.authManager.getCurrentUser();
            if (!user) return;

            const response = await this.makeApiRequest('POST', 'update_points', {
                firebase_uid: user.uid,
                points_balance: points,
                last_update: new Date().toISOString()
            });

            if (response.success) {
                console.log('✅ تم تحديث النقاط في لوحة الأدمن');
            }
        } catch (error) {
            console.error('❌ خطأ في تحديث النقاط:', error);
        }
    }

    /**
     * فحص حالة الحساب من لوحة الأدمن
     */
    async checkAccountStatus() {
        try {
            const user = window.authManager.getCurrentUser();
            if (!user) return { active: true };

            const response = await this.makeApiRequest('GET', `user_status&firebase_uid=${user.uid}`);
            
            if (response.success && response.data) {
                const { is_active, status_message } = response.data;
                
                if (!is_active) {
                    // الحساب معطل - تسجيل خروج فوري
                    console.warn('⚠️ الحساب معطل من لوحة الأدمن');
                    this.showAccountDisabledMessage(status_message);
                    window.authManager.logout('account_disabled');
                    return { active: false, message: status_message };
                }
            }
            
            return { active: true };
        } catch (error) {
            console.error('❌ خطأ في فحص حالة الحساب:', error);
            return { active: true }; // افتراض الحساب نشط في حالة الخطأ
        }
    }

    /**
     * عرض رسالة تعطيل الحساب
     */
    showAccountDisabledMessage(message) {
        const alertHtml = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.8);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    background: white;
                    padding: 40px;
                    border-radius: 20px;
                    text-align: center;
                    font-family: 'Tajawal', sans-serif;
                    max-width: 400px;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.3);
                ">
                    <i class="fas fa-ban" style="font-size: 64px; color: #dc3545; margin-bottom: 20px;"></i>
                    <h3 style="color: #33211D; margin-bottom: 20px;">تم تعطيل حسابك</h3>
                    <p style="color: #666; margin-bottom: 30px; line-height: 1.6;">
                        ${message || 'تم تعطيل حسابك من قبل الإدارة. للاستفسار يرجى التواصل مع الدعم الفني.'}
                    </p>
                    <button onclick="window.location.href='contact.html'" style="
                        background: #DA9F5B;
                        color: white;
                        border: none;
                        padding: 12px 30px;
                        border-radius: 25px;
                        font-weight: 600;
                        cursor: pointer;
                        margin-right: 10px;
                    ">تواصل معنا</button>
                    <button onclick="window.location.reload()" style="
                        background: transparent;
                        color: #666;
                        border: 1px solid #ddd;
                        padding: 12px 30px;
                        border-radius: 25px;
                        font-weight: 600;
                        cursor: pointer;
                    ">إعادة تحميل</button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', alertHtml);
    }

    /**
     * بدء المزامنة الدورية
     */
    startPeriodicSync() {
        // مزامنة كل 30 ثانية
        this.syncInterval = setInterval(async () => {
            if (window.authManager && window.authManager.isLoggedIn()) {
                // فحص حالة الحساب
                await this.checkAccountStatus();
                
                // مزامنة البيانات
                await this.syncCurrentUser();
            }
        }, 30000);
        
        console.log('🔄 بدأت المزامنة الدورية (كل 30 ثانية)');
    }

    /**
     * إيقاف المزامنة الدورية
     */
    stopPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('⏹️ تم إيقاف المزامنة الدورية');
        }
    }

    /**
     * إرسال طلب للوحة الأدمن
     */
    async makeApiRequest(method, endpoint, data = null) {
        try {
            const url = `${this.adminApiUrl}?endpoint=${endpoint}`;
            
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                }
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result;
            
        } catch (error) {
            console.error('❌ خطأ في طلب API:', error);
            throw error;
        }
    }

    /**
     * إرسال إحصائيات الاستخدام
     */
    async sendUsageStats(action, details = {}) {
        try {
            const user = window.authManager?.getCurrentUser();
            if (!user) return;

            await this.makeApiRequest('POST', 'usage_stats', {
                firebase_uid: user.uid,
                action: action,
                details: details,
                timestamp: new Date().toISOString(),
                page: window.location.pathname,
                user_agent: navigator.userAgent
            });
        } catch (error) {
            console.error('❌ خطأ في إرسال الإحصائيات:', error);
        }
    }

    /**
     * إشعار لوحة الأدمن بنشاط المستخدم
     */
    async notifyUserActivity(activity) {
        try {
            const user = window.authManager?.getCurrentUser();
            if (!user) return;

            await this.makeApiRequest('POST', 'user_activity', {
                firebase_uid: user.uid,
                activity: activity,
                timestamp: new Date().toISOString(),
                page: window.location.pathname
            });
        } catch (error) {
            console.error('❌ خطأ في إشعار النشاط:', error);
        }
    }
}

// تهيئة نظام التكامل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // انتظار تحميل authManager
    const initIntegration = () => {
        if (typeof window.authManager !== 'undefined') {
            window.adminIntegration = new AdminIntegration();
            console.log('🔗 تم تهيئة نظام التكامل مع لوحة الأدمن');
        } else {
            setTimeout(initIntegration, 100);
        }
    };
    
    initIntegration();
});

// تصدير للاستخدام كوحدة
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminIntegration;
}
