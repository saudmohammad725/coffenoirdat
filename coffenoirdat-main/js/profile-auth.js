/**
 * نظام المصادقة المحدث للملف الشخصي
 * يدعم تسجيل الدخول بالإيميل + Google + Twitter
 */

class ProfileAuth {
    constructor() {
        this.currentUser = null;
        this.initializeAuth();
    }

    /**
     * تهيئة نظام المصادقة
     */
    initializeAuth() {
        // Auth state observer
        auth.onAuthStateChanged(async (user) => {
            console.log('🔐 Auth state changed:', user ? 'User logged in' : 'User logged out');
            
            this.currentUser = user;
            if (user) {
                console.log('👤 User signed in:', user.displayName || user.email);
                
                // تحديث فوري للـ UI
                this.updateUI(true);
                
                try {
                    // إرسال البيانات للخلفية والتكامل مع لوحة الأدمن
                    await this.syncWithBackend(user);
                    
                    // تحميل بيانات المستخدم
                    await this.loadUserData(user);
                    
                } catch (error) {
                    console.error('❌ Error in background auth operations:', error);
                }
                
            } else {
                console.log('🚪 User signed out');
                this.updateUI(false);
            }
        });
    }

    /**
     * مزامنة مع الخلفية ولوحة الأدمن
     */
    async syncWithBackend(user) {
        try {
            // إرسال بيانات المستخدم للخلفية (Node.js)
            const authData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                photoURL: user.photoURL,
                provider: this.getProviderName(user),
                isEmailVerified: user.emailVerified
            };

            // مزامنة مع النظام الخلفي
            const response = await fetch('/api/auth/firebase', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(authData)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Backend sync successful:', result.message);
                
                // حفظ التوكن إذا كان متوفراً
                if (result.data && result.data.token) {
                    if (window.authManager) {
                        window.authManager.login(result.data);
                    }
                }
            }

            // مزامنة مع لوحة الأدمن
            if (window.adminIntegration) {
                await window.adminIntegration.syncUserWithAdmin(authData, 'login');
            }

        } catch (error) {
            console.error('❌ Backend sync error:', error);
        }
    }

    /**
     * تحديث واجهة المستخدم
     */
    updateUI(isSignedIn) {
        const loginAlert = document.getElementById('loginAlert');
        const profileContent = document.getElementById('profileContent');
        
        if (loginAlert && profileContent) {
            if (isSignedIn) {
                loginAlert.style.display = 'none';
                profileContent.style.display = 'block';
                
                // تحديث عرض النقاط
                if (window.pointsManager) {
                    window.pointsManager.updateAllDisplays();
                }
            } else {
                loginAlert.style.display = 'block';
                profileContent.style.display = 'none';
                
                // إعادة تعيين الصور
                this.resetAvatars();
            }
        }
    }

    /**
     * إعادة تعيين الصور الشخصية
     */
    resetAvatars() {
        const avatarElement = document.getElementById('userAvatar');
        const defaultAvatar = document.getElementById('defaultAvatar');
        
        if (avatarElement && defaultAvatar) {
            avatarElement.style.display = 'none';
            avatarElement.src = '';
            defaultAvatar.style.display = 'flex';
        }
    }

    /**
     * تحميل بيانات المستخدم
     */
    async loadUserData(user) {
        try {
            // تحديث عناصر الواجهة
            this.updateUserElements(user);
            
            // تحميل بيانات إضافية من Firestore إذا كان متاحاً
            if (typeof db !== 'undefined') {
                const userDoc = await db.collection("users").doc(user.uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    this.updateUserElements(userData);
                }
            }
            
        } catch (error) {
            console.error('❌ Error loading user data:', error);
        }
    }

    /**
     * تحديث عناصر واجهة المستخدم بالبيانات
     */
    updateUserElements(userData) {
        const elements = [
            { id: 'userFullName', value: userData.displayName || 'غير محدد' },
            { id: 'userEmail', value: userData.email || 'غير محدد' },
            { id: 'userProvider', value: this.getProviderDisplayName(userData.provider || userData.providerId) },
            { id: 'userLastLogin', value: this.formatDate(userData.lastLoginAt || userData.metadata?.lastSignInTime) },
            { id: 'userMemberSince', value: this.formatDate(userData.createdAt || userData.metadata?.creationTime) }
        ];
        
        elements.forEach(element => {
            const el = document.getElementById(element.id);
            if (el) {
                el.textContent = element.value;
            }
        });
        
        // تحديث الصورة الشخصية
        this.updateAvatar(userData.photoURL);
    }

    /**
     * تحديث الصورة الشخصية
     */
    updateAvatar(photoURL) {
        const avatarElement = document.getElementById('userAvatar');
        const defaultAvatar = document.getElementById('defaultAvatar');
        
        if (avatarElement && defaultAvatar) {
            if (photoURL) {
                avatarElement.src = photoURL;
                avatarElement.style.display = 'block';
                defaultAvatar.style.display = 'none';
            } else {
                avatarElement.style.display = 'none';
                defaultAvatar.style.display = 'flex';
            }
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
     * الحصول على اسم مقدم الخدمة للعرض
     */
    getProviderDisplayName(providerId) {
        switch (providerId) {
            case 'google.com': return 'Google';
            case 'twitter.com': return 'Twitter';
            case 'password': return 'البريد الإلكتروني';
            case 'email': return 'البريد الإلكتروني';
            default: return 'غير معروف';
        }
    }

    /**
     * تنسيق التاريخ
     */
    formatDate(timestamp) {
        if (!timestamp) return 'غير محدد';
        
        let date;
        if (timestamp.seconds) {
            // Firestore Timestamp
            date = new Date(timestamp.seconds * 1000);
        } else if (typeof timestamp === 'string') {
            date = new Date(timestamp);
        } else {
            date = timestamp;
        }
        
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * تسجيل الخروج
     */
    async logout() {
        try {
            await auth.signOut();
            
            // مسح البيانات المحلية
            if (window.authManager) {
                window.authManager.logout('manual');
            }
            
            if (window.pointsManager) {
                window.pointsManager.resetPoints();
            }
            
            console.log('✅ Logout successful');
            
        } catch (error) {
            console.error('❌ Logout error:', error);
        }
    }

    /**
     * الحصول على المستخدم الحالي
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * فحص حالة تسجيل الدخول
     */
    isLoggedIn() {
        return !!this.currentUser;
    }
}

// تصدير للاستخدام العام
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfileAuth;
}

// تهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // انتظار تحميل Firebase
    const initProfileAuth = () => {
        if (typeof firebase !== 'undefined' && typeof auth !== 'undefined') {
            window.profileAuth = new ProfileAuth();
            console.log('🔐 Profile Auth initialized');
        } else {
            setTimeout(initProfileAuth, 100);
        }
    };
    
    initProfileAuth();
});