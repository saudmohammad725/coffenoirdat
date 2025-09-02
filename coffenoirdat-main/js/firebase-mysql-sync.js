/**
 * نظام مزامنة Firebase مع MySQL
 * يقوم بنقل البيانات من Firebase إلى قاعدة بيانات MySQL في لوحة الأدمن
 */

class FirebaseMySQLSync {
    constructor() {
        this.adminApiUrl = window.location.origin.includes('localhost') 
            ? 'http://localhost/serveradminprov3/firebase-sync.php'
            : '/serveradminprov3/firebase-sync.php';
        this.apiKey = 'firebase_sync_key_2024';
        this.syncQueue = [];
        this.isProcessing = false;
        
        this.initializeSync();
    }

    /**
     * تهيئة نظام المزامنة
     */
    initializeSync() {
        console.log('🔄 تهيئة نظام مزامنة Firebase مع MySQL...');
        
        // الاستماع لأحداث Firebase
        this.setupFirebaseListeners();
        
        // بدء معالجة قائمة المزامنة
        this.startQueueProcessor();
    }

    /**
     * إعداد مستمعي أحداث Firebase
     */
    setupFirebaseListeners() {
        // مراقبة تغييرات المستخدمين
        if (typeof auth !== 'undefined') {
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    console.log('👤 مستخدم سجل دخول، مزامنة مع MySQL:', user.email);
                    await this.syncUserData(user);
                    await this.syncUserActivity(user, 'login');
                }
            });
        }

        // مراقبة تغييرات في Firestore
        if (typeof db !== 'undefined') {
            this.setupFirestoreListeners();
        }
    }

    /**
     * إعداد مستمعي Firestore
     */
    setupFirestoreListeners() {
        try {
            // مراقبة تغييرات المستخدمين
            db.collection('users').onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added' || change.type === 'modified') {
                        const userData = change.doc.data();
                        userData.uid = change.doc.id;
                        this.addToSyncQueue('user_data', userData);
                    }
                });
            });

            // مراقبة نشاط المستخدمين
            db.collection('user_activity').onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const activityData = change.doc.data();
                        activityData.id = change.doc.id;
                        this.addToSyncQueue('user_activity', activityData);
                    }
                });
            });

            // مراقبة أجهزة المستخدمين
            db.collection('user_devices').onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added' || change.type === 'modified') {
                        const deviceData = change.doc.data();
                        deviceData.id = change.doc.id;
                        this.addToSyncQueue('user_device', deviceData);
                    }
                });
            });

            // مراقبة طلبات المستخدمين
            db.collection('user_orders').onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added' || change.type === 'modified') {
                        const orderData = change.doc.data();
                        orderData.id = change.doc.id;
                        this.addToSyncQueue('user_order', orderData);
                    }
                });
            });

            console.log('✅ تم إعداد مستمعي Firestore للمزامنة');

        } catch (error) {
            console.error('❌ خطأ في إعداد مستمعي Firestore:', error);
        }
    }

    /**
     * مزامنة بيانات المستخدم
     */
    async syncUserData(user) {
        try {
            const userData = {
                firebase_uid: user.uid,
                email: user.email,
                display_name: user.displayName || user.email.split('@')[0],
                photo_url: user.photoURL,
                phone_number: user.phoneNumber,
                provider: this.getProviderName(user),
                email_verified: user.emailVerified,
                last_login_at: new Date().toISOString(),
                created_at: user.metadata.creationTime,
                last_sign_in_time: user.metadata.lastSignInTime
            };

            this.addToSyncQueue('user_data', userData);
            console.log('📝 تم إضافة بيانات المستخدم لقائمة المزامنة');

        } catch (error) {
            console.error('❌ خطأ في مزامنة بيانات المستخدم:', error);
        }
    }

    /**
     * مزامنة نشاط المستخدم
     */
    async syncUserActivity(user, action, metadata = {}) {
        try {
            const activityData = {
                firebase_uid: user.uid,
                user_email: user.email,
                action: action,
                metadata: JSON.stringify(metadata),
                ip_address: 'client-side',
                user_agent: navigator.userAgent,
                page_url: window.location.href,
                timestamp: new Date().toISOString()
            };

            this.addToSyncQueue('user_activity', activityData);
            console.log('📊 تم إضافة نشاط المستخدم لقائمة المزامنة:', action);

        } catch (error) {
            console.error('❌ خطأ في مزامنة نشاط المستخدم:', error);
        }
    }

    /**
     * إضافة عنصر لقائمة المزامنة
     */
    addToSyncQueue(type, data) {
        this.syncQueue.push({
            type: type,
            data: data,
            timestamp: Date.now(),
            attempts: 0
        });

        console.log(`📋 تم إضافة ${type} لقائمة المزامنة. العناصر في القائمة: ${this.syncQueue.length}`);
    }

    /**
     * بدء معالج قائمة المزامنة
     */
    startQueueProcessor() {
        setInterval(() => {
            if (!this.isProcessing && this.syncQueue.length > 0) {
                this.processQueue();
            }
        }, 5000); // معالجة كل 5 ثوان

        console.log('🔄 تم بدء معالج قائمة المزامنة');
    }

    /**
     * معالجة قائمة المزامنة
     */
    async processQueue() {
        if (this.isProcessing || this.syncQueue.length === 0) {
            return;
        }

        this.isProcessing = true;
        console.log(`🔄 بدء معالجة قائمة المزامنة - ${this.syncQueue.length} عنصر`);

        const batchSize = 5; // معالجة 5 عناصر في المرة الواحدة
        const batch = this.syncQueue.splice(0, batchSize);

        for (const item of batch) {
            try {
                await this.syncToMySQL(item);
                console.log(`✅ تم مزامنة ${item.type} بنجاح`);
            } catch (error) {
                console.error(`❌ فشل في مزامنة ${item.type}:`, error);
                
                // إعادة المحاولة حتى 3 مرات
                item.attempts++;
                if (item.attempts < 3) {
                    this.syncQueue.push(item);
                    console.log(`🔄 إعادة محاولة ${item.type} - المحاولة ${item.attempts}`);
                } else {
                    console.error(`❌ فشل نهائي في مزامنة ${item.type} بعد 3 محاولات`);
                }
            }
        }

        this.isProcessing = false;
        console.log(`✅ انتهت معالجة الدفعة. العناصر المتبقية: ${this.syncQueue.length}`);
    }

    /**
     * مزامنة البيانات مع MySQL
     */
    async syncToMySQL(item) {
        try {
            const response = await fetch(this.adminApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({
                    type: item.type,
                    data: item.data,
                    timestamp: item.timestamp
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'فشل في المزامنة');
            }

            return result;

        } catch (error) {
            console.error('❌ خطأ في مزامنة MySQL:', error);
            throw error;
        }
    }

    /**
     * الحصول على اسم مقدم الخدمة
     */
    getProviderName(user) {
        if (user.providerData && user.providerData.length > 0) {
            return user.providerData[0].providerId;
        }
        return 'email';
    }

    /**
     * مزامنة يدوية لجميع البيانات
     */
    async manualFullSync() {
        try {
            console.log('🔄 بدء المزامنة اليدوية الشاملة...');

            if (typeof auth === 'undefined' || typeof db === 'undefined') {
                throw new Error('Firebase غير متاح');
            }

            // مزامنة المستخدم الحالي
            const currentUser = auth.currentUser;
            if (currentUser) {
                await this.syncUserData(currentUser);
                await this.syncUserActivity(currentUser, 'manual_sync');
            }

            // مزامنة جميع المستخدمين من Firestore
            const usersSnapshot = await db.collection('users').get();
            usersSnapshot.forEach((doc) => {
                const userData = doc.data();
                userData.uid = doc.id;
                this.addToSyncQueue('user_data', userData);
            });

            // مزامنة جميع الأنشطة
            const activitiesSnapshot = await db.collection('user_activity').limit(100).get();
            activitiesSnapshot.forEach((doc) => {
                const activityData = doc.data();
                activityData.id = doc.id;
                this.addToSyncQueue('user_activity', activityData);
            });

            console.log('✅ تم إضافة جميع البيانات لقائمة المزامنة');

        } catch (error) {
            console.error('❌ خطأ في المزامنة اليدوية:', error);
        }
    }

    /**
     * الحصول على إحصائيات المزامنة
     */
    getSyncStats() {
        return {
            queueLength: this.syncQueue.length,
            isProcessing: this.isProcessing,
            totalSynced: this.totalSynced || 0,
            totalFailed: this.totalFailed || 0
        };
    }
}

// تهيئة نظام المزامنة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // انتظار تحميل Firebase
    const initSync = () => {
        if (typeof firebase !== 'undefined') {
            window.firebaseMySQLSync = new FirebaseMySQLSync();
            console.log('🔄 تم تهيئة نظام مزامنة Firebase مع MySQL');
        } else {
            setTimeout(initSync, 100);
        }
    };
    
    initSync();
});

// تصدير للاستخدام كوحدة
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseMySQLSync;
}
