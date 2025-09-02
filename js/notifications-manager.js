/**
 * نظام إدارة الإشعارات - Noir Café
 * يتعامل مع الإشعارات من لوحة الأدمن
 */

class NotificationsManager {
    constructor() {
        this.apiUrl = window.location.origin.includes('localhost') 
            ? 'http://localhost/serveradminprov3/api.php'
            : '/serveradminprov3/api.php';
        this.apiKey = 'client_website_key';
        this.notifications = [];
        this.unreadCount = 0;
        this.checkInterval = null;
        
        this.initializeNotifications();
    }

    /**
     * تهيئة نظام الإشعارات
     */
    initializeNotifications() {
        console.log('🔔 تهيئة نظام الإشعارات...');
        
        // إنشاء عنصر الإشعارات في الصفحة
        this.createNotificationElements();
        
        // تحميل الإشعارات الأولية
        this.loadNotifications();
        
        // بدء الفحص الدوري
        this.startPeriodicCheck();
        
        // الاستماع لأحداث المصادقة
        this.setupAuthListeners();
    }

    /**
     * إنشاء عناصر الإشعارات في الصفحة
     */
    createNotificationElements() {
        // إنشاء أيقونة الإشعارات في الـ navbar
        const navbar = document.querySelector('.navbar-nav');
        if (navbar && !document.getElementById('notificationIcon')) {
            const notificationItem = document.createElement('div');
            notificationItem.className = 'nav-item dropdown d-flex align-items-center mr-3';
            notificationItem.innerHTML = `
                <a class="nav-link position-relative" href="#" id="notificationIcon" 
                   data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"
                   style="cursor: pointer;">
                    <i class="fas fa-bell" style="font-size: 1.2em;"></i>
                    <span class="badge badge-danger position-absolute" 
                          id="notificationBadge" 
                          style="top: -5px; right: -5px; min-width: 18px; height: 18px; 
                                 border-radius: 50%; font-size: 0.7em; display: none;">0</span>
                </a>
                <div class="dropdown-menu dropdown-menu-right" 
                     id="notificationDropdown"
                     style="width: 350px; max-height: 400px; overflow-y: auto;">
                    <div class="dropdown-header d-flex justify-content-between align-items-center">
                        <strong>الإشعارات</strong>
                        <button class="btn btn-link btn-sm p-0" onclick="notificationsManager.markAllAsRead()">
                            <small>تحديد الكل كمقروء</small>
                        </button>
                    </div>
                    <div id="notificationsList">
                        <div class="text-center py-3">
                            <i class="fas fa-spinner fa-spin"></i> جاري التحميل...
                        </div>
                    </div>
                </div>
            `;
            
            navbar.appendChild(notificationItem);
        }

        // إنشاء حاوي للإشعارات المنبثقة
        if (!document.getElementById('notificationToasts')) {
            const toastContainer = document.createElement('div');
            toastContainer.id = 'notificationToasts';
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 350px;
            `;
            document.body.appendChild(toastContainer);
        }
    }

    /**
     * إعداد مستمعي أحداث المصادقة
     */
    setupAuthListeners() {
        document.addEventListener('auth:login', () => {
            console.log('🔔 المستخدم سجل دخول، تحميل الإشعارات...');
            this.loadNotifications();
            this.startPeriodicCheck();
        });

        document.addEventListener('auth:logout', () => {
            console.log('🔔 المستخدم سجل خروج، مسح الإشعارات...');
            this.clearNotifications();
            this.stopPeriodicCheck();
        });
    }

    /**
     * تحميل الإشعارات من الخادم
     */
    async loadNotifications() {
        if (!window.authManager || !window.authManager.isLoggedIn()) {
            return;
        }

        try {
            const user = window.authManager.getCurrentUser();
            const response = await this.makeApiRequest('GET', `user_notifications&firebase_uid=${user.uid}&limit=20`);
            
            if (response.success) {
                this.notifications = response.data.notifications || [];
                this.updateNotificationDisplay();
                this.updateUnreadCount();
                console.log(`🔔 تم تحميل ${this.notifications.length} إشعار`);
            }
        } catch (error) {
            console.error('❌ خطأ في تحميل الإشعارات:', error);
        }
    }

    /**
     * تحديث عرض الإشعارات
     */
    updateNotificationDisplay() {
        const notificationsList = document.getElementById('notificationsList');
        if (!notificationsList) return;

        if (this.notifications.length === 0) {
            notificationsList.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-bell-slash fa-2x mb-2"></i>
                    <p class="mb-0">لا توجد إشعارات</p>
                </div>
            `;
            return;
        }

        notificationsList.innerHTML = this.notifications.map(notification => {
            const isRead = parseInt(notification.is_read);
            const createdAt = new Date(notification.created_at);
            const timeAgo = this.formatTimeAgo(createdAt);
            
            const typeIcons = {
                'info': 'fas fa-info-circle text-info',
                'success': 'fas fa-check-circle text-success',
                'warning': 'fas fa-exclamation-triangle text-warning',
                'error': 'fas fa-times-circle text-danger',
                'points': 'fas fa-coins text-primary',
                'admin': 'fas fa-user-shield text-secondary'
            };

            const icon = typeIcons[notification.type] || typeIcons['info'];

            return `
                <div class="dropdown-item notification-item ${!isRead ? 'unread' : ''}" 
                     onclick="notificationsManager.markAsRead(${notification.id})" 
                     style="cursor: pointer; border-bottom: 1px solid #eee; ${!isRead ? 'background-color: #f8f9fa;' : ''}">
                    <div class="d-flex align-items-start">
                        <div class="mr-2">
                            <i class="${icon}"></i>
                        </div>
                        <div class="flex-grow-1">
                            <div class="font-weight-bold">${notification.title}</div>
                            <div class="text-muted small mb-1">${notification.message}</div>
                            <div class="text-muted" style="font-size: 0.75em;">${timeAgo}</div>
                        </div>
                        ${!isRead ? '<div class="badge badge-primary badge-pill ml-2">جديد</div>' : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * تحديث عداد الإشعارات غير المقروءة
     */
    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !parseInt(n.is_read)).length;
        
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount;
                badge.style.display = 'flex';
                badge.style.alignItems = 'center';
                badge.style.justifyContent = 'center';
            } else {
                badge.style.display = 'none';
            }
        }

        // تحديث عنوان الصفحة
        if (this.unreadCount > 0) {
            document.title = `(${this.unreadCount}) Noir Café`;
        } else {
            document.title = 'Noir Café';
        }
    }

    /**
     * تحديد إشعار كمقروء
     */
    async markAsRead(notificationId) {
        try {
            const user = window.authManager.getCurrentUser();
            if (!user) return;

            const response = await this.makeApiRequest('POST', 'mark_notification_read', {
                notification_id: notificationId,
                firebase_uid: user.uid
            });

            if (response.success) {
                // تحديث الإشعار محلياً
                const notification = this.notifications.find(n => n.id == notificationId);
                if (notification) {
                    notification.is_read = 1;
                    notification.read_at = new Date().toISOString();
                }
                
                this.updateNotificationDisplay();
                this.updateUnreadCount();
            }
        } catch (error) {
            console.error('❌ خطأ في تحديد الإشعار كمقروء:', error);
        }
    }

    /**
     * تحديد جميع الإشعارات كمقروءة
     */
    async markAllAsRead() {
        const unreadNotifications = this.notifications.filter(n => !parseInt(n.is_read));
        
        for (const notification of unreadNotifications) {
            await this.markAsRead(notification.id);
        }
    }

    /**
     * عرض إشعار منبثق فوري
     */
    showToastNotification(title, message, type = 'info') {
        const toastContainer = document.getElementById('notificationToasts');
        if (!toastContainer) return;

        const typeColors = {
            'info': '#17a2b8',
            'success': '#28a745',
            'warning': '#ffc107',
            'error': '#dc3545',
            'points': '#007bff',
            'admin': '#6c757d'
        };

        const typeIcons = {
            'info': 'fas fa-info-circle',
            'success': 'fas fa-check-circle',
            'warning': 'fas fa-exclamation-triangle',
            'error': 'fas fa-times-circle',
            'points': 'fas fa-coins',
            'admin': 'fas fa-user-shield'
        };

        const toastId = 'toast_' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.style.cssText = `
            background: white;
            border: none;
            border-left: 4px solid ${typeColors[type]};
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            margin-bottom: 10px;
            padding: 15px;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;

        toast.innerHTML = `
            <div class="d-flex align-items-start">
                <div style="color: ${typeColors[type]}; margin-right: 10px;">
                    <i class="${typeIcons[type]}"></i>
                </div>
                <div class="flex-grow-1">
                    <div style="font-weight: 600; color: #333; margin-bottom: 4px;">${title}</div>
                    <div style="color: #666; font-size: 0.9em;">${message}</div>
                </div>
                <button onclick="document.getElementById('${toastId}').remove()" 
                        style="background: none; border: none; color: #999; font-size: 1.2em; cursor: pointer;">
                    ×
                </button>
            </div>
        `;

        toastContainer.appendChild(toast);

        // أنيميشن الظهور
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);

        // إزالة تلقائية بعد 5 ثواني
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 5000);
    }

    /**
     * بدء الفحص الدوري للإشعارات الجديدة
     */
    startPeriodicCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        // فحص كل 30 ثانية
        this.checkInterval = setInterval(async () => {
            if (window.authManager && window.authManager.isLoggedIn()) {
                const oldCount = this.unreadCount;
                await this.loadNotifications();
                
                // إظهار إشعار إذا كان هناك إشعارات جديدة
                if (this.unreadCount > oldCount) {
                    const newNotifications = this.notifications
                        .filter(n => !parseInt(n.is_read))
                        .slice(0, this.unreadCount - oldCount);
                    
                    newNotifications.forEach(notification => {
                        this.showToastNotification(
                            notification.title,
                            notification.message,
                            notification.type
                        );
                    });
                }
            }
        }, 30000);
    }

    /**
     * إيقاف الفحص الدوري
     */
    stopPeriodicCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    /**
     * مسح جميع الإشعارات
     */
    clearNotifications() {
        this.notifications = [];
        this.unreadCount = 0;
        this.updateNotificationDisplay();
        this.updateUnreadCount();
    }

    /**
     * تنسيق الوقت المنقضي
     */
    formatTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) {
            return 'الآن';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `منذ ${minutes} دقيقة`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `منذ ${hours} ساعة`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `منذ ${days} يوم`;
        }
    }

    /**
     * إرسال طلب API
     */
    async makeApiRequest(method, endpoint, data = null) {
        try {
            const url = `${this.apiUrl}?endpoint=${endpoint}`;
            
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

            return await response.json();
            
        } catch (error) {
            console.error('❌ خطأ في طلب API:', error);
            throw error;
        }
    }
}

// تهيئة نظام الإشعارات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // انتظار تحميل authManager
    const initNotifications = () => {
        if (typeof window.authManager !== 'undefined') {
            window.notificationsManager = new NotificationsManager();
            console.log('🔔 تم تهيئة نظام الإشعارات');
        } else {
            setTimeout(initNotifications, 100);
        }
    };
    
    initNotifications();
});

// تصدير للاستخدام كوحدة
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationsManager;
}
