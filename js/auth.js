import { auth, db, analytics } from './firebase-config.js';
import { 
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    User
} from "firebase/auth";
import { 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc,
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    orderBy,
    limit,
    getDocs
} from "firebase/firestore";
import { logEvent } from "firebase/analytics";

// Initialize OAuth providers
const googleProvider = new GoogleAuthProvider();

// Current user state
let currentUser = null;

// Check login status on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
});

// Initialize authentication system
function initializeAuth() {
    // Auth state observer
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) {
            console.log('User signed in:', user.displayName || user.email);
            
            // Log sign in event
            await logUserActivity(user.uid, 'sign_in', {
                provider: user.providerData[0]?.providerId || 'unknown',
                displayName: user.displayName,
                email: user.email
            });
            
            // Create or update user profile
            await createOrUpdateUserProfile(user);
            
            // Update UI
            updateUI(true);
            loadUserData(user.uid);
            
        } else {
            console.log('User signed out');
            updateUI(false);
        }
    });
}

// Update UI based on authentication state
function updateUI(isSignedIn) {
    const loginAlert = document.getElementById('loginAlert');
    const profileContent = document.getElementById('profileContent');
    
    if (loginAlert && profileContent) {
        if (isSignedIn) {
            loginAlert.style.display = 'none';
            profileContent.style.display = 'block';
        } else {
            loginAlert.style.display = 'block';
            profileContent.style.display = 'none';
        }
    }
}

// Create or update user profile in Firestore
async function createOrUpdateUserProfile(user) {
    try {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        
        const userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            provider: user.providerData[0]?.providerId || 'unknown',
            lastLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        if (userDoc.exists()) {
            // Update existing user
            await updateDoc(userRef, userData);
            console.log('User profile updated');
        } else {
            // Create new user profile
            userData.createdAt = serverTimestamp();
            userData.settings = {
                language: 'ar',
                currency: 'SAR',
                emailNotifications: true,
                pushNotifications: true
            };
            
            await setDoc(userRef, userData);
            console.log('New user profile created');
            
            // Log analytics event for new user
            logEvent(analytics, 'sign_up', {
                method: userData.provider
            });
        }
        
    } catch (error) {
        console.error("Error creating/updating user profile:", error);
    }
}

// Load user data and update UI elements
async function loadUserData(userId) {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Update profile elements if they exist
            const elements = [
                { id: 'userFullName', value: userData.displayName || 'غير محدد' },
                { id: 'userEmail', value: userData.email || 'غير محدد' },
                { id: 'userProvider', value: getProviderName(userData.provider) || 'غير محدد' },
                { id: 'userLastLogin', value: formatDate(userData.lastLoginAt) || 'غير محدد' },
                { id: 'userMemberSince', value: formatDate(userData.createdAt) || 'غير محدد' }
            ];
            
            elements.forEach(element => {
                const el = document.getElementById(element.id);
                if (el) el.textContent = element.value;
            });
            
            // Update user avatar if exists
            const avatarElement = document.getElementById('userAvatar');
            if (avatarElement && userData.photoURL) {
                avatarElement.src = userData.photoURL;
                avatarElement.style.display = 'block';
            }
        }
    } catch (error) {
        console.error("Error loading user data:", error);
    }
}

// Get provider display name
function getProviderName(providerId) {
    switch (providerId) {
        case 'google.com': return 'Google';
        case 'twitter.com': return 'Twitter';
        default: return 'غير معروف';
    }
}

// Format date for display
function formatDate(timestamp) {
    if (!timestamp) return null;
    
    let date;
    if (timestamp.seconds) {
        // Firestore Timestamp
        date = new Date(timestamp.seconds * 1000);
    } else {
        date = new Date(timestamp);
    }
    
    return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Log user activity to Firestore
async function logUserActivity(userId, action, metadata = {}) {
    try {
        const activityData = {
            userId: userId,
            action: action, // 'sign_in', 'sign_out', 'profile_update', etc.
            metadata: metadata,
            timestamp: serverTimestamp(),
            userAgent: navigator.userAgent,
            ip: 'client-side' // Would need server-side for real IP
        };
        
        await addDoc(collection(db, "user_activity"), activityData);
        console.log(`Activity logged: ${action} for user ${userId}`);
        
        // Also log to Analytics
        logEvent(analytics, action, {
            user_id: userId,
            ...metadata
        });
        
    } catch (error) {
        console.error("Error logging user activity:", error);
    }
}

// Profile tabs functionality
function initializeProfileTabs() {
    document.querySelectorAll('.profile-nav .nav-link').forEach(link => {
        link.addEventListener('click', function() {
            document.querySelectorAll('.profile-nav .nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
            const tabId = 'tab-' + this.dataset.tab;
            const tabElement = document.getElementById(tabId);
            if (tabElement) {
                tabElement.style.display = 'block';
            }
        });
    });
}

// Sign in with Google
async function signInWithGoogle() {
    try {
        console.log('Attempting Google sign in...');
        
        // Configure Google provider for better UX
        googleProvider.addScope('profile');
        googleProvider.addScope('email');
        googleProvider.setCustomParameters({
            'login_hint': 'user@example.com'
        });
        
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        console.log('Google sign in successful:', user.displayName);
        
        // Close any open modals
        closeAllModals();
        
        // Log analytics event (في الخلفية)
        logEvent(analytics, 'login', {
            method: 'google'
        }).catch(error => console.log('Analytics failed:', error));
        
        // Refresh تلقائي بعد تسجيل الدخول الناجح
        setTimeout(() => {
            window.location.reload();
        }, 800);
        
    } catch (error) {
        console.error('Google sign in error:', error);
        
        // لا نظهر أي رسائل خطأ، فقط نسجل في الكونسول
        // في حالة الإلغاء أو الأخطاء البسيطة، لا نفعل شيء
        if (error.code === 'auth/popup-closed-by-user' || 
            error.code === 'auth/cancelled-popup-request') {
            return; // لا نفعل شيء للإلغاء
        }
        
        // للأخطاء الأخرى، نسجل فقط في الكونسول
        console.log('Login failed, but no user notification shown');
    }
}



// Close all modals
function closeAllModals() {
    // Close Bootstrap modals
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        const modalInstance = window.bootstrap?.Modal?.getInstance(modal);
        if (modalInstance) {
            modalInstance.hide();
        } else {
            modal.style.display = 'none';
        }
    });
    
    // Remove backdrop
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
    
    // Remove modal-open class from body
    document.body.classList.remove('modal-open');
    document.body.style.paddingRight = '';
}

// Edit profile function
async function editProfile() {
    if (!currentUser) {
        alert('يرجى تسجيل الدخول أولاً');
        return;
    }
    
    try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Note: In a real app, you'd want a proper edit form modal
            const newDisplayName = prompt('الاسم المعروض:', userData.displayName || '');
            if (newDisplayName === null) return; // User cancelled
            
            if (newDisplayName && newDisplayName.trim()) {
                await updateDoc(doc(db, "users", currentUser.uid), {
                    displayName: newDisplayName.trim(),
                    updatedAt: serverTimestamp()
                });
                
                // Log profile update activity
                await logUserActivity(currentUser.uid, 'profile_update', {
                    field: 'displayName',
                    newValue: newDisplayName.trim()
                });
                
                // Reload user data
                loadUserData(currentUser.uid);
                alert('تم تحديث البيانات بنجاح');
                
            } else {
                alert('يرجى إدخال اسم صحيح');
            }
        }
    } catch (error) {
        console.error("Error updating profile:", error);
        alert('حدث خطأ في تحديث البيانات');
    }
}

// Logout function
async function logout() {
    if (!currentUser) {
        return;
    }
    
    try {
        // Log sign out activity before signing out (في الخلفية)
        logUserActivity(currentUser.uid, 'sign_out', {
            provider: currentUser.providerData[0]?.providerId || 'unknown',
            displayName: currentUser.displayName,
            sessionDuration: Date.now() - (currentUser.metadata.lastSignInTime ? new Date(currentUser.metadata.lastSignInTime).getTime() : Date.now())
        }).catch(error => console.log('Activity logging failed:', error));
        
        // Sign out
        await signOut(auth);
        
        // Log analytics event (في الخلفية)
        logEvent(analytics, 'logout', {}).catch(error => console.log('Analytics failed:', error));
        
        // Refresh تلقائي فوري
        setTimeout(() => {
            window.location.reload();
        }, 500);
        
    } catch (error) {
        console.error("Error signing out:", error);
        
        // في حالة الخطأ، نقوم بrefresh أيضاً
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
}

// Get user activity history
async function getUserActivityHistory(userId, limitCount = 10) {
    try {
        const q = query(
            collection(db, "user_activity"),
            where("userId", "==", userId),
            orderBy("timestamp", "desc"),
            limit(limitCount)
        );
        
        const querySnapshot = await getDocs(q);
        const activities = [];
        
        querySnapshot.forEach((doc) => {
            activities.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return activities;
    } catch (error) {
        console.error("Error getting user activity:", error);
        return [];
    }
}

// Initialize the authentication system when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeProfileTabs();
});

// Export functions for global use
window.signInWithGoogle = signInWithGoogle;
window.logout = logout;
window.editProfile = editProfile;
window.getUserActivityHistory = getUserActivityHistory;
window.currentUser = currentUser;

// Export for debugging purposes
window.auth = auth;
window.db = db;
