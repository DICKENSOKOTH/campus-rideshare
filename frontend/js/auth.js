// Authentication Logic - Handles login, register, logout, and session management

class AuthManager {
    constructor() {
        this.currentUser = this.getCurrentUser();
    }

    getCurrentUser() {
        const userStr = localStorage.getItem(STORAGE_KEYS.USER);
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    isAuthenticated() {
        return !!localStorage.getItem(STORAGE_KEYS.TOKEN);
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    saveAuthData(token, user) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        this.currentUser = user;
    }

    clearAuthData() {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        this.currentUser = null;
    }

    async login(email, password) {
        try {
            const response = await AuthAPI.login(email, password);

            if (response.success && response.data) {
                // Backend returns access_token, not token
                this.saveAuthData(response.data.access_token, response.data.user);
                return { success: true, user: response.data.user };
            }

            return { success: false, message: response.message || 'Login failed' };
        } catch (error) {
            return { success: false, message: error.message || ERROR_MESSAGES.SERVER };
        }
    }

    async register(userData) {
        try {
            const response = await AuthAPI.register(userData);

            if (response.success) {
                return { success: true, message: response.message || SUCCESS_MESSAGES.REGISTER };
            }

            return { success: false, message: response.message || 'Registration failed' };
        } catch (error) {
            return { success: false, message: error.message || ERROR_MESSAGES.SERVER };
        }
    }

    logout() {
        this.clearAuthData();
        window.location.href = 'login.html';
    }

    async verifyToken() {
        if (!this.isAuthenticated()) return false;
        try {
            const response = await AuthAPI.getMe();
            return response.success;
        } catch (error) {
            this.clearAuthData();
            return false;
        }
    }

    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    requireAdmin() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        if (!this.isAdmin()) {
            window.location.href = 'dashboard.html';
            return false;
        }
        return true;
    }

    redirectIfAuthenticated() {
        if (this.isAuthenticated()) {
            window.location.href = 'dashboard.html';
            return true;
        }
        return false;
    }
}

// Create singleton instance
const authManager = new AuthManager();

// ── Login Page Logic ────────────────────────────────────
if (window.location.pathname.includes('login.html')) {
    authManager.redirectIfAuthenticated();

    document.addEventListener('DOMContentLoaded', () => {
        const loginForm = document.getElementById('loginForm');
        const loginBtn = document.getElementById('loginBtn');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const errorBanner = document.getElementById('errorBanner');
        const errorText = document.getElementById('errorBannerText');

        function showLoginError(msg) {
            if (errorBanner) {
                errorBanner.classList.remove('hidden');
                if (errorText) errorText.textContent = msg;
            }
        }

        function hideLoginError() {
            if (errorBanner) errorBanner.classList.add('hidden');
        }

        async function handleLogin(e) {
            if (e) e.preventDefault();
            const email = emailInput?.value.trim();
            const password = passwordInput?.value;

            hideLoginError();

            if (!email || !password) {
                showLoginError('Please fill in all fields.');
                return;
            }

            loginBtn.disabled = true;
            loginBtn.textContent = 'Signing in\u2026';

            const result = await authManager.login(email, password);

            if (result.success) {
                showNotification(SUCCESS_MESSAGES.LOGIN, 'success');
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 500);
            } else {
                showLoginError(result.message);
                loginBtn.disabled = false;
                loginBtn.textContent = 'Sign In';
            }
        }

        if (loginForm) loginForm.addEventListener('submit', handleLogin);

        // Password visibility toggle
        initPasswordToggle('togglePassword', 'password');
    });
}

// ── Register Page Logic ─────────────────────────────────
// Registration form/UI logic is in register.js (loaded separately on register page).
if (window.location.pathname.includes('register.html')) {
    authManager.redirectIfAuthenticated();
}

// ── Logout handler (available on all pages) ─────────────
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.logout-btn, [data-action="logout"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                authManager.logout();
            }
        });
    });

    // Update user display in navbar / header
    if (authManager.isAuthenticated() && authManager.currentUser) {
        const nameEl = document.getElementById('userName');
        const emailEl = document.getElementById('userEmail');
        if (nameEl) nameEl.textContent = authManager.currentUser.full_name;
        if (emailEl) emailEl.textContent = authManager.currentUser.email;
    }
});

// Utility function to show notifications (uses toast styles from components.css)
function showNotification(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const typeClass = type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : 'toast-info';
    const toast = document.createElement('div');
    toast.className = `toast ${typeClass}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Utility: password visibility toggle
function initPasswordToggle(toggleId, inputId) {
    const toggle = document.getElementById(toggleId);
    const input  = document.getElementById(inputId);
    if (!toggle || !input) return;

    toggle.addEventListener('click', () => {
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        const useEl = toggle.querySelector('use');
        if (useEl) {
            useEl.setAttribute('href', showing ? 'assets/icons.svg#icon-eye' : 'assets/icons.svg#icon-eye-off');
        }
    });
}

// Utility: populate nav avatar with user initials
function updateNavAvatar() {
    const avatar = document.getElementById('navAvatar');
    if (avatar && authManager.currentUser) {
        const parts = authManager.currentUser.full_name.split(' ');
        avatar.textContent = parts.map(p => p[0]).join('').substring(0, 2).toUpperCase();
    }
}
