/**
 * Profile Authentication Integration
 * ربط صفحة الملف الشخصي مع Auth Manager
 */

document.addEventListener('DOMContentLoaded', function() {
    // تحديث Firebase Auth لاستخدام Auth Manager
    if (typeof firebase !== 'undefined' && firebase.auth) {
        // Override Firebase auth state change
        firebase.auth().onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                console.log('🔥 Firebase user authenticated:', firebaseUser.email);
                
                // Send to backend for JWT token
                try {
                    const response = await fetch('/api/auth/firebase', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName,
                            photoURL: firebaseUser.photoURL,
                            provider: firebaseUser.providerData[0]?.providerId || 'google.com'
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        
                        // Use Auth Manager to handle the login
                        authManager.login({
                            token: data.data.token,
                            user: data.data.user,
                            expiresAt: data.data.expiresAt
                        });
                        
                        console.log('✅ JWT token received and stored');
                        
                        // Update UI
                        updateProfileUI(data.data.user);
                        
                    } else {
                        console.error('❌ Failed to get JWT token');
                        throw new Error('Backend authentication failed');
                    }
                } catch (error) {
                    console.error('❌ Error during authentication:', error);
                    authManager.showErrorMessage('فشل في تسجيل الدخول');
                }
            } else {
                console.log('🔥 Firebase user signed out');
                authManager.logout('firebase-logout');
            }
        });
    }

    // Listen for auth events from Auth Manager
    document.addEventListener('auth:login', (event) => {
        const { user } = event.detail;
        console.log('🔐 Auth Manager login event:', user.email);
        updateProfileUI(user);
    });

    document.addEventListener('auth:logout', (event) => {
        const { reason } = event.detail;
        console.log('🔐 Auth Manager logout event:', reason);
        clearProfileUI();
        
        // Sign out from Firebase too
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut().catch(console.error);
        }
    });

    // Check if already logged in on page load
    if (authManager.isLoggedIn()) {
        const user = authManager.getCurrentUser();
        updateProfileUI(user);
    }
});

/**
 * تحديث واجهة الملف الشخصي
 */
function updateProfileUI(user) {
    // Update profile info
    const profileElements = {
        'userDisplayName': user.displayName || user.email,
        'userEmail': user.email,
        'userPoints': user.points || 0,
        'userRole': user.role === 'admin' ? 'مدير' : 'مستخدم',
        'userUID': user.uid
    };

    Object.entries(profileElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });

    // Update profile picture
    const profileImg = document.getElementById('userProfileImage');
    if (profileImg && user.photoURL) {
        profileImg.src = user.photoURL;
    }

    // Show logged in state
    const loginSection = document.getElementById('loginSection');
    const profileSection = document.getElementById('profileSection');
    
    if (loginSection) loginSection.style.display = 'none';
    if (profileSection) profileSection.style.display = 'block';
    
    console.log('✅ Profile UI updated for:', user.email);
}

/**
 * مسح واجهة الملف الشخصي
 */
function clearProfileUI() {
    // Show login section
    const loginSection = document.getElementById('loginSection');
    const profileSection = document.getElementById('profileSection');
    
    if (loginSection) loginSection.style.display = 'block';
    if (profileSection) profileSection.style.display = 'none';
    
    console.log('🧹 Profile UI cleared');
}

/**
 * تسجيل الخروج اليدوي
 */
function manualLogout() {
    authManager.logout('manual');
}

// Make functions globally available
window.updateProfileUI = updateProfileUI;
window.clearProfileUI = clearProfileUI;
window.manualLogout = manualLogout;

console.log('👤 Profile authentication integration loaded');
