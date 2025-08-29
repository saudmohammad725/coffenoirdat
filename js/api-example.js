/**
 * API Usage Examples with Auth Manager
 * أمثلة على استخدام API مع Auth Manager
 */

// مثال 1: طلب بسيط باستخدام Auth Manager
async function getUserProfile() {
    try {
        const response = await authManager.apiRequest('/api/users/profile');
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ User profile:', data);
            return data;
        } else {
            throw new Error('Failed to fetch profile');
        }
    } catch (error) {
        console.error('❌ Error fetching profile:', error);
        throw error;
    }
}

// مثال 2: إضافة نقاط
async function addUserPoints(points) {
    try {
        const response = await authManager.apiRequest('/api/points/add', {
            method: 'POST',
            body: JSON.stringify({ points })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Points added:', data);
            
            // Update local points manager
            if (window.pointsManager) {
                window.pointsManager.addPoints(points);
            }
            
            return data;
        } else {
            throw new Error('Failed to add points');
        }
    } catch (error) {
        console.error('❌ Error adding points:', error);
        throw error;
    }
}

// مثال 3: إنشاء طلبية
async function createOrder(orderData) {
    try {
        const response = await authManager.apiRequest('/api/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Order created:', data);
            return data;
        } else {
            throw new Error('Failed to create order');
        }
    } catch (error) {
        console.error('❌ Error creating order:', error);
        throw error;
    }
}

// مثال 4: طلب مع معالجة خطأ التوكن
async function secureApiCall(endpoint, options = {}) {
    try {
        // First attempt
        let response = await authManager.apiRequest(endpoint, options);
        
        if (response.status === 401) {
            // Token might be expired, try to refresh
            console.log('🔄 Token expired, attempting refresh...');
            
            try {
                await authManager.extendSession();
                
                // Retry the request with new token
                response = await authManager.apiRequest(endpoint, options);
            } catch (refreshError) {
                console.error('❌ Token refresh failed:', refreshError);
                authManager.logout('token-refresh-failed');
                throw new Error('Authentication failed');
            }
        }
        
        return response;
    } catch (error) {
        console.error('❌ Secure API call failed:', error);
        throw error;
    }
}

// مثال 5: تحميل الملفات مع المصادقة
async function uploadFile(file, endpoint = '/api/upload') {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await authManager.apiRequest(endpoint, {
            method: 'POST',
            body: formData,
            headers: {
                // Don't set Content-Type for FormData, let browser handle it
                ...authManager.getAuthHeader()
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ File uploaded:', data);
            return data;
        } else {
            throw new Error('Failed to upload file');
        }
    } catch (error) {
        console.error('❌ Error uploading file:', error);
        throw error;
    }
}

// مثال 6: Fetch مع retry logic
async function fetchWithRetry(endpoint, options = {}, maxRetries = 3) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await authManager.apiRequest(endpoint, options);
            
            if (response.ok) {
                return response;
            } else if (response.status === 401) {
                // Don't retry on auth errors
                throw new Error('Authentication failed');
            } else if (response.status >= 500) {
                // Retry on server errors
                lastError = new Error(`Server error: ${response.status}`);
                console.log(`🔄 Retry ${i + 1}/${maxRetries} for ${endpoint}`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
                continue;
            } else {
                // Don't retry on client errors
                throw new Error(`Client error: ${response.status}`);
            }
        } catch (error) {
            lastError = error;
            
            if (error.message.includes('Authentication')) {
                break; // Don't retry auth errors
            }
            
            if (i === maxRetries - 1) {
                break; // Last attempt
            }
            
            console.log(`🔄 Network retry ${i + 1}/${maxRetries} for ${endpoint}`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
    
    throw lastError;
}

// تصدير الدوال للاستخدام العام
window.apiExamples = {
    getUserProfile,
    addUserPoints,
    createOrder,
    secureApiCall,
    uploadFile,
    fetchWithRetry
};

console.log('🔗 API examples loaded');
