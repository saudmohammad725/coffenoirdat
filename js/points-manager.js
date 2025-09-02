/**
 * Points Manager - نظام إدارة النقاط المركزي
 * يضمن توحيد النقاط في جميع الصفحات
 */

class PointsManager {
    constructor() {
        this.STORAGE_KEY = 'userPoints';
        this.initializePoints();
        this.setupAuthEventListeners();
    }

    /**
     * تهيئة النقاط - يضمن البدء من 0 إذا لم تكن موجودة
     */
    initializePoints() {
        // Wait for auth manager to be ready
        if (typeof window.authManager !== 'undefined' && window.authManager.isLoggedIn()) {
            const user = window.authManager.getCurrentUser();
            if (user && user.points !== undefined) {
                this.setPoints(user.points);
                return;
            }
        }
        
        const existingPoints = localStorage.getItem(this.STORAGE_KEY);
        if (existingPoints === null || existingPoints === undefined) {
            console.log('🎯 تهيئة النقاط من 0');
            this.setPoints(0);
        }
    }

    /**
     * الحصول على النقاط الحالية
     * @returns {number} عدد النقاط
     */
    getPoints() {
        const points = localStorage.getItem(this.STORAGE_KEY);
        return parseInt(points) || 0;
    }

    /**
     * تعيين النقاط
     * @param {number} points عدد النقاط الجديد
     */
    setPoints(points) {
        const newPoints = Math.max(0, parseInt(points) || 0); // لا يمكن أن تكون سالبة
        localStorage.setItem(this.STORAGE_KEY, newPoints.toString());
        console.log(`💰 تم تحديث النقاط إلى: ${newPoints}`);
        this.updateAllDisplays();
        return newPoints;
    }

    /**
     * إضافة نقاط
     * @param {number} points عدد النقاط المراد إضافتها
     */
    addPoints(points) {
        const currentPoints = this.getPoints();
        const newPoints = currentPoints + (parseInt(points) || 0);
        return this.setPoints(newPoints);
    }

    /**
     * خصم نقاط
     * @param {number} points عدد النقاط المراد خصمها
     * @returns {boolean} true إذا تم الخصم بنجاح، false إذا كانت النقاط غير كافية
     */
    deductPoints(points) {
        const currentPoints = this.getPoints();
        const pointsToDeduct = parseInt(points) || 0;
        
        if (currentPoints >= pointsToDeduct) {
            const newPoints = currentPoints - pointsToDeduct;
            this.setPoints(newPoints);
            return true;
        } else {
            console.warn(`⚠️ النقاط غير كافية: ${currentPoints} < ${pointsToDeduct}`);
            return false;
        }
    }

    /**
     * فحص إذا كانت النقاط كافية
     * @param {number} requiredPoints النقاط المطلوبة
     * @returns {boolean}
     */
    hasEnoughPoints(requiredPoints) {
        return this.getPoints() >= (parseInt(requiredPoints) || 0);
    }

    /**
     * تحديث جميع عروض النقاط في الصفحة
     */
    updateAllDisplays() {
        const points = this.getPoints();
        
        // تحديث العروض المختلفة
        const displays = [
            'navUserPointsDisplay',
            'mobileUserPointsDisplay',
            'userPointsDisplay', 
            'currentPoints',
            'footerPointsDisplay'
        ];

        displays.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = points;
            }
        });

        // تحديث آخر وقت تحديث
        const timeElement = document.getElementById('lastUpdateTime');
        if (timeElement) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('ar-SA', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true
            });
            timeElement.textContent = timeString;
        }

        // إشعار النوافذ الأخرى بالتحديث
        window.dispatchEvent(new CustomEvent('pointsUpdated', { 
            detail: { points: points } 
        }));
    }

    /**
     * مسح جميع النقاط (إعادة تعيين)
     */
    resetPoints() {
        console.log('🔄 إعادة تعيين النقاط إلى 0');
        return this.setPoints(0);
    }

    /**
     * الحصول على تفاصيل النقاط
     */
    getPointsInfo() {
        return {
            current: this.getPoints(),
            lastUpdated: new Date().toISOString(),
            storage: this.STORAGE_KEY
        };
    }

    /**
     * إعداد مستمعي أحداث المصادقة
     */
    setupAuthEventListeners() {
        // Listen for login events
        document.addEventListener('auth:login', (event) => {
            const { user } = event.detail;
            if (user && user.points !== undefined) {
                console.log('🔐 User logged in, updating points from server:', user.points);
                this.setPoints(user.points);
            }
        });

        // Listen for logout events
        document.addEventListener('auth:logout', () => {
            console.log('🔐 User logged out, clearing points');
            localStorage.removeItem(this.STORAGE_KEY);
            this.setPoints(0);
        });

        // Sync points when auth manager is ready
        setTimeout(() => {
            if (typeof window.authManager !== 'undefined' && window.authManager.isLoggedIn()) {
                const user = window.authManager.getCurrentUser();
                if (user && user.points !== undefined) {
                    this.setPoints(user.points);
                }
            }
        }, 1000);
    }
}

// إنشاء مثيل عام من مدير النقاط
window.pointsManager = new PointsManager();

// الاستماع لتحديثات النقاط من النوافذ الأخرى
window.addEventListener('storage', function(e) {
    if (e.key === 'userPoints') {
        window.pointsManager.updateAllDisplays();
    }
});

// تصدير للاستخدام كوحدة
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PointsManager;
}
