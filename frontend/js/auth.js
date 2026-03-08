// Authentication Logic - Handles login, register, logout, and session management

class AuthManager {
    constructor() {
        this.currentUser = this.getCurrentUser();
    }

    // Get current user from localStorage
    getCurrentUser() {
        const userStr = localStorage.getItem(STORAGE_KEYS.USER);
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                console.error('Failed to parse user data:', e);
                return null;
            }
        }
        return null;
    }

    // Check if user is logged in
    isAuthenticated() {
        const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
        return !!token;
    }

    // Check if user is admin
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    // Save auth data
    saveAuthData(token, user) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        this.currentUser = user;
    }

    // Clear auth data
    clearAuthData() {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        this.currentUser = null;
    }

    // Login
    async login(email, password) {
        try {
            const response = await AuthAPI.login(email, password);
            
            if (response.success && response.data) {
                this.saveAuthData(response.data.token, response.data.user);
                return { success: true, user: response.data.user };
            }
            
            return { success: false, message: response.message || 'Login failed' };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: error.message || ERROR_MESSAGES.SERVER };
        }
    }

    // Register
    async register(userData) {
        try {
            const response = await AuthAPI.register(userData);
            
            if (response.success) {
                return { success: true, message: response.message || SUCCESS_MESSAGES.REGISTER };
            }
            
            return { success: false, message: response.message || 'Registration failed' };
        } catch (error) {
            console.error('Register error:', error);
            return { success: false, message: error.message || ERROR_MESSAGES.SERVER };
        }
    }

    // Logout
    async logout() {
        try {
            await AuthAPI.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuthData();
            window.location.href = '/login.html';
        }
    }

    // Verify token validity
    async verifyToken() {
        if (!this.isAuthenticated()) {
            return false;
        }

        try {
            const response = await AuthAPI.verifyToken();
            return response.success;
        } catch (error) {
            console.error('Token verification failed:', error);
            this.clearAuthData();
            return false;
        }
    }

    // Protect page - redirect if not authenticated
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    }

    // Protect admin page
    requireAdmin() {
        if (!this.isAuthenticated()) {
            window.location.href = '/login.html';
            return false;
        }
        if (!this.isAdmin()) {
            window.location.href = '/dashboard.html';
            return false;
        }
        return true;
    }

    // Redirect if already logged in
    redirectIfAuthenticated() {
        if (this.isAuthenticated()) {
            window.location.href = '/dashboard.html';
            return true;
        }
        return false;
    }
}

// Create singleton instance
const authManager = new AuthManager();

// Login Page Logic
if (window.location.pathname.includes('login.html')) {
    // Redirect if already logged in
    authManager.redirectIfAuthenticated();

    document.addEventListener('DOMContentLoaded', () => {
        const loginForm = document.getElementById('loginForm');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const submitBtn = document.getElementById('submitBtn');
        const errorMessage = document.getElementById('errorMessage');

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // Clear previous errors
                if (errorMessage) errorMessage.textContent = '';
                
                // Get form values
                const email = emailInput?.value.trim();
                const password = passwordInput?.value;

                // Basic validation
                if (!email || !password) {
                    if (errorMessage) errorMessage.textContent = 'Please fill in all fields';
                    return;
                }

                // Disable submit button
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Logging in...';
                }

                // Attempt login
                const result = await authManager.login(email, password);

                if (result.success) {
                    // Show success message
                    showNotification(SUCCESS_MESSAGES.LOGIN, 'success');
                    
                    // Redirect to dashboard
                    setTimeout(() => {
                        window.location.href = '/dashboard.html';
                    }, 500);
                } else {
                    // Show error
                    if (errorMessage) errorMessage.textContent = result.message;
                    
                    // Re-enable submit button
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Login';
                    }
                }
            });
        }
    });
}

// Register Page Logic
if (window.location.pathname.includes('register.html')) {
    // Redirect if already logged in
    authManager.redirectIfAuthenticated();

    document.addEventListener('DOMContentLoaded', () => {
        const registerForm = document.getElementById('registerForm');
        const submitBtn = document.getElementById('submitBtn');
        const errorMessage = document.getElementById('errorMessage');

        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // Clear previous errors
                if (errorMessage) errorMessage.textContent = '';
                
                // Get form values
                const formData = new FormData(registerForm);
                const userData = {
                    name: formData.get('name')?.trim(),
                    email: formData.get('email')?.trim(),
                    password: formData.get('password'),
                    confirmPassword: formData.get('confirmPassword'),
                    phone: formData.get('phone')?.trim(),
                    studentId: formData.get('studentId')?.trim(),
                };

                // Basic validation
                if (!userData.name || !userData.email || !userData.password || !userData.confirmPassword) {
                    if (errorMessage) errorMessage.textContent = 'Please fill in all required fields';
                    return;
                }

                if (userData.password !== userData.confirmPassword) {
                    if (errorMessage) errorMessage.textContent = 'Passwords do not match';
                    return;
                }

                if (userData.password.length < 6) {
                    if (errorMessage) errorMessage.textContent = 'Password must be at least 6 characters';
                    return;
                }

                // Remove confirmPassword before sending
                delete userData.confirmPassword;

                // Disable submit button
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Creating Account...';
                }

                // Attempt registration
                const result = await authManager.register(userData);

                if (result.success) {
                    // Show success message
                    showNotification(result.message, 'success');
                    
                    // Redirect to login
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 1500);
                } else {
                    // Show error
                    if (errorMessage) errorMessage.textContent = result.message;
                    
                    // Re-enable submit button
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Create Account';
                    }
                }
            });
        }
    });
}

// Logout functionality (available on all pages)
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtns = document.querySelectorAll('.logout-btn, [data-action="logout"]');
    
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const confirmed = confirm('Are you sure you want to logout?');
            if (confirmed) {
                await authManager.logout();
            }
        });
    });

    // Update user display in navbar/header
    const userNameDisplay = document.getElementById('userName');
    const userEmailDisplay = document.getElementById('userEmail');
    
    if (authManager.isAuthenticated() && authManager.currentUser) {
        if (userNameDisplay) userNameDisplay.textContent = authManager.currentUser.name;
        if (userEmailDisplay) userEmailDisplay.textContent = authManager.currentUser.email;
    }
});

// Utility function to show notifications
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        border-radius: 4px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
