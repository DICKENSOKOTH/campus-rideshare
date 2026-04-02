// Authentication Logic - Handles login, register, logout, and session management

class AuthManager {
    constructor() {
        this.currentUser = this.getCurrentUser();
        this._accessToken = null;
        this._refreshToken = null;
        this._redirecting = false;
        this._verifyPromise = null;
        this._lastVerifyAt = 0;
        this._lastVerifyOk = null;
    }

    getCurrentUser() {
        // Always null initially; will be set after backend verification
        return null;
    }

    isAuthenticated() {
        // Only authenticated if currentUser is set after backend verification
        return !!this.currentUser;
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    saveAuthData(token, user, refreshToken = null) {
        // Store tokens and user only in memory
        this._accessToken = token;
        this._refreshToken = refreshToken;
        this.currentUser = user;
    }

    clearAuthData() {
        this.currentUser = null;
        this._accessToken = null;
        this._refreshToken = null;
    }

    async login(email, password) {
        try {
            const response = await AuthAPI.login(email, password);

            if (response.success && response.data) {
                this.saveAuthData(response.data.access_token, response.data.user, response.data.refresh_token);
                return { success: true, user: response.data.user };
            }

            return { success: false, message: response.message || 'Login failed' };
        } catch (error) {
            const detail = error.data?.errors;
            const msg = Array.isArray(detail) ? detail.join(', ') : (error.message || ERROR_MESSAGES.SERVER);
            return { success: false, message: msg };
        }
    }

    async register(userData) {
        try {
            const response = await AuthAPI.register(userData);

            if (response.success) {
                return { success: true, message: response.message || SUCCESS_MESSAGES.REGISTER };
            }

            const msg = response.errors?.join(', ') || response.message || 'Registration failed';
            return { success: false, message: msg };
        } catch (error) {
            const detail = error.data?.errors;
            const msg = Array.isArray(detail) ? detail.join(', ') : (error.message || ERROR_MESSAGES.SERVER);
            return { success: false, message: msg };
        }
    }

    async logout() {
        try {
            await AuthAPI.logout();
        } catch (e) {
            // Proceed with local cleanup even if backend call fails
        }
        this.clearAuthData();
        this._redirectTo('login.html');
    }

    async verifyToken() {
        // Coalesce concurrent verification calls and rate-limit repeated checks
        if (this._verifyPromise) return this._verifyPromise;
        this._verifyPromise = (async () => {
            try {
                const now = Date.now();
                // If we recently verified less than 1.5s ago, reuse the previous result
                if (now - this._lastVerifyAt < 1500 && this._lastVerifyOk !== null) {
                    return this._lastVerifyOk;
                }
                const response = await AuthAPI.getMe();
                if (response.success && response.data) {
                    this.currentUser = response.data;
                    this._lastVerifyAt = Date.now();
                    this._lastVerifyOk = true;
                    return true;
                }
                this.clearAuthData();
                this._lastVerifyAt = Date.now();
                this._lastVerifyOk = false;
                return false;
            } catch (error) {
                this.clearAuthData();
                this._lastVerifyAt = Date.now();
                this._lastVerifyOk = false;
                return false;
            } finally {
                this._verifyPromise = null;
            }
        })();
        return this._verifyPromise;
    }

    async requireAuth() {
        // Always verify user exists in DB
        const ok = await this.verifyToken();
        if (!ok) {
            this._redirectTo('login.html');
            return false;
        }
        return true;
    }

    async requireAdmin() {
        if (!(await this.requireAuth())) return false;
        if (!this.isAdmin()) {
            this._redirectTo('home.html');
            return false;
        }
        return true;
    }

    async redirectIfAuthenticated() {
        // Don't use requireAuth here - it redirects to login on failure which causes loops
        // Instead, just check if user is authenticated without redirecting
        const ok = await this.verifyToken();
        if (ok) {
            this._redirectTo('home.html');
            return true;
        }
        return false;
    }

    _redirectTo(path) {
        if (this._redirecting) return;
        this._redirecting = true;
        window.location.href = path;
    }
}

// Create singleton instance
const authManager = new AuthManager();

// Apply role-based UI restrictions (hide "Post a Ride" for non-drivers)
function applyRoleRestrictions() {
    const user = authManager.currentUser;
    if (!user || user.role === 'driver') return;
    
    // Hide all "Post a Ride" links for riders
    const postRideLinks = document.querySelectorAll('a[href="create-ride.html"]');
    postRideLinks.forEach(link => {
        link.style.display = 'none';
    });
}

// Utility function to show notifications (uses toast styles from components.css)
// Defined globally so it's available on all pages
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

    const duration = type === 'error' ? 6000 : 3000;
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Utility: password visibility toggle (global)
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

// Global: verify user on every page except public pages (login/register/index/landing)
const publicPages = ['login.html', 'register.html', 'index.html'];
const isPublicPage = publicPages.some(page => window.location.pathname.includes(page)) || 
                     window.location.pathname === '/' || 
                     window.location.pathname.endsWith('/');
if (!isPublicPage) {
    (async () => {
        const ok = await authManager.requireAuth();
        if (ok) {
            // Apply role-based restrictions after successful auth
            applyRoleRestrictions();
        }
    })();
}

// ── Login Page Logic ────────────────────────────────────
if (window.location.pathname.includes('login.html')) {
    // Only redirect if user exists in DB
    (async () => {
        await authManager.redirectIfAuthenticated();
    })();

    document.addEventListener('DOMContentLoaded', () => {
        const loginForm = document.getElementById('loginForm');
        const loginBtn = document.getElementById('loginBtn');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const errorBanner = document.getElementById('errorBanner');
        const errorText = document.getElementById('errorBannerText');
        const emailError = document.getElementById('emailError');
        const passwordError = document.getElementById('passwordError');

        function showLoginError(msg) {
            if (errorBanner) {
                errorBanner.classList.remove('hidden');
                if (errorText) errorText.textContent = msg;
            }
        }

        function hideLoginError() {
            if (errorBanner) errorBanner.classList.add('hidden');
        }

        function setFieldError(input, errorEl, msg) {
            if (input) input.classList.add('error');
            if (errorEl) { errorEl.textContent = msg; errorEl.classList.remove('hidden'); }
        }

        function clearFieldError(input, errorEl) {
            if (input) input.classList.remove('error');
            if (errorEl) errorEl.classList.add('hidden');
        }

        function clearAllErrors() {
            hideLoginError();
            clearFieldError(emailInput, emailError);
            clearFieldError(passwordInput, passwordError);
        }

        // Clear field error on input
        if (emailInput) emailInput.addEventListener('input', () => { clearFieldError(emailInput, emailError); hideLoginError(); });
        if (passwordInput) passwordInput.addEventListener('input', () => { clearFieldError(passwordInput, passwordError); hideLoginError(); });

        function validateLoginForm() {
            let valid = true;
            const email = emailInput?.value.trim();
            const password = passwordInput?.value;

            if (!email) {
                setFieldError(emailInput, emailError, 'Email is required.');
                valid = false;
            } else if (!/^[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(email)) {
                setFieldError(emailInput, emailError, 'Please enter a valid email address.');
                valid = false;
            }

            if (!password) {
                setFieldError(passwordInput, passwordError, 'Password is required.');
                valid = false;
            }

            return valid;
        }

        async function handleLogin(e) {
            if (e) e.preventDefault();
            clearAllErrors();

            if (!validateLoginForm()) return;

            loginBtn.disabled = true;
            loginBtn.textContent = 'Signing in\u2026';

            try {
                const result = await authManager.login(
                    emailInput.value.trim(),
                    passwordInput.value
                );
                if (result.success) {
                    // Immediately verify user exists in DB
                    const ok = await authManager.verifyToken();
                    if (ok) {
                        showNotification(SUCCESS_MESSAGES.LOGIN, 'success');
                        window.location.href = 'home.html';
                    } else {
                        showLoginError('Account not found. Please sign in again.');
                        authManager.clearAuthData();
                        loginBtn.disabled = false;
                        loginBtn.textContent = 'Sign In';
                    }
                } else {
                    showLoginError(result.message);
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Sign In';
                }
            } catch (err) {
                showLoginError(err.message || ERROR_MESSAGES.SERVER);
                loginBtn.disabled = false;
                loginBtn.textContent = 'Sign In';
            }
        }

        // Attach the submit handler to the login form
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
    })();

    // Utility: populate nav avatar with user initials
    function updateNavAvatar() {
        const avatar = document.getElementById('navAvatar');
        if (avatar && authManager.currentUser) {
            const parts = authManager.currentUser.full_name.split(' ');
            avatar.textContent = parts.map(p => p[0]).join('').substring(0, 2).toUpperCase();
        }
    }
}
