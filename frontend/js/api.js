// API Client - Handles all HTTP requests to the backend

class APIClient {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.timeout = API_CONFIG.TIMEOUT;
        this._refreshing = null; // shared promise for concurrent refresh attempts
        this._redirecting = false;
        this._refreshFailedUntil = 0; // cooldown when refresh repeatedly fails
    }

    // Get auth token from localStorage
    getToken() {
        // Tokens are handled by httpOnly cookies; no client-side token access
        return null;
    }

    // Build headers with auth token
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
        };

        // Authorization header intentionally not used; cookies carry JWTs

        return headers;
    }

    // Build full URL from endpoint
    buildURL(endpoint, params = {}) {
        let url = this.baseURL + endpoint;
        
        // Replace URL parameters (e.g., :id)
        Object.keys(params).forEach(key => {
            url = url.replace(`:${key}`, params[key]);
        });

        return url;
    }

    // Generic request method
    async request(method, endpoint, options = {}) {
        const { data, params, includeAuth = true, queryParams } = options;

        const url = this.buildURL(endpoint, params);
        
        // Add query parameters
        const urlObj = new URL(url);
        if (queryParams) {
            Object.keys(queryParams).forEach(key => {
                urlObj.searchParams.append(key, queryParams[key]);
            });
        }

        const config = {
            method,
            headers: this.getHeaders(includeAuth),
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            config.body = JSON.stringify(data);
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            config.signal = controller.signal;
            // Send cookies for auth (httpOnly cookies set by backend)
            config.credentials = 'include';

            const response = await fetch(urlObj.toString(), config);
            clearTimeout(timeoutId);

            const responseData = await response.json();

            if (!response.ok) {
                throw {
                    status: response.status,
                    message: responseData.message || ERROR_MESSAGES.SERVER,
                    data: responseData,
                };
            }

            return responseData;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw { status: 408, message: 'Request timeout' };
            }

            if (error.status) {
                // Error from server
                if (error.status === 401 && options.includeAuth !== false && !options._retried) {
                    // Try to refresh the token (server uses httpOnly refresh cookie)
                    const refreshed = await this._tryRefreshToken();
                    if (refreshed) {
                        // Retry the original request once
                        return this.request(method, endpoint, { ...options, _retried: true });
                    }
                    // Refresh failed — redirect to login
                    this._forceLogout();
                }
                throw error;
            }

            // Network error
            throw { status: 0, message: ERROR_MESSAGES.NETWORK };
        }
    }

    // Attempt to refresh the access token by calling the refresh endpoint.
    // The server expects the refresh token in an httpOnly cookie.
    async _tryRefreshToken() {
        // If recent refresh attempts failed, avoid hammering the server
        if (Date.now() < this._refreshFailedUntil) return false;

        if (!this._refreshing) {
            this._refreshing = (async () => {
                try {
                    const res = await fetch(this.baseURL + API_ENDPOINTS.REFRESH, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                    });
                    if (!res.ok) {
                        // put a short cooldown (5s) on further refresh attempts
                        this._refreshFailedUntil = Date.now() + 5000;
                        return false;
                    }
                    const body = await res.json();
                    return body.success === true;
                } catch {
                    this._refreshFailedUntil = Date.now() + 5000;
                    return false;
                } finally {
                    this._refreshing = null;
                }
            })();
        }
        return this._refreshing;
    }

    // Clear auth data and redirect to login — guarded against multiple parallel calls
    _forceLogout() {
        try { if (typeof authManager !== 'undefined') authManager.clearAuthData(); } catch(_){}
        if (this._redirecting) return;
        const path = window.location.pathname;
        if (!path.includes('login.html') && !path.includes('register.html') && !path.includes('index.html')) {
            this._redirecting = true;
            window.location.href = 'login.html';
        }
    }

    // Convenience methods
    async get(endpoint, options = {}) {
        return this.request('GET', endpoint, options);
    }

    async post(endpoint, data, options = {}) {
        return this.request('POST', endpoint, { ...options, data });
    }

    async put(endpoint, data, options = {}) {
        return this.request('PUT', endpoint, { ...options, data });
    }

    async patch(endpoint, data, options = {}) {
        return this.request('PATCH', endpoint, { ...options, data });
    }

    async delete(endpoint, options = {}) {
        return this.request('DELETE', endpoint, options);
    }
}

// Create a singleton instance
const api = new APIClient();

// Debounce utility to prevent redundant API calls
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Centralized error handling for API responses
async function handleAPIError(promise) {
    try {
        return await promise;
    } catch (error) {
        console.error('API Error:', error);
        showNotification(error.message || 'An error occurred', 'error');
        throw error; // Re-throw to allow further handling if needed
    }
}

// API Service Methods - Organized by feature

const AuthAPI = {
    async login(email, password) {
        return handleAPIError(api.post(API_ENDPOINTS.LOGIN, { email, password }, { includeAuth: false }));
    },

    async register(userData) {
        return handleAPIError(api.post(API_ENDPOINTS.REGISTER, userData, { includeAuth: false }));
    },

    async getMe() {
        return handleAPIError(api.get(API_ENDPOINTS.ME));
    },
};

const UserAPI = {
    async getProfile() {
        return api.get(API_ENDPOINTS.GET_PROFILE);
    },

    async updateProfile(userData) {
        return api.put(API_ENDPOINTS.UPDATE_PROFILE, userData);
    },

    async getPublicProfile(userId) {
        return api.get(API_ENDPOINTS.GET_PUBLIC_PROFILE, { params: { id: userId } });
    },

    async getMyRides() {
        return api.get(API_ENDPOINTS.GET_MY_RIDES);
    },

    async getMyBookings() {
        return api.get(API_ENDPOINTS.GET_MY_BOOKINGS);
    },

    async rateUser(bookingId, ratingData) {
        return api.post(API_ENDPOINTS.RATE_USER, ratingData, { params: { id: bookingId } });
    },
};

const RideAPI = {
    async createRide(rideData) {
        return api.post(API_ENDPOINTS.CREATE_RIDE, rideData);
    },

    async getRides(filters = {}) {
        return handleAPIError(api.get(API_ENDPOINTS.GET_RIDES, { queryParams: filters }));
    },

    async getRide(rideId) {
        return api.get(API_ENDPOINTS.GET_RIDE, { params: { id: rideId } });
    },

    async deleteRide(rideId) {
        return api.delete(API_ENDPOINTS.DELETE_RIDE, { params: { id: rideId } });
    },
};

const BookingAPI = {
    async bookRide(rideId, data) {
        return api.post(API_ENDPOINTS.BOOK_RIDE, data, { params: { id: rideId } });
    },

    async cancelBooking(bookingId) {
        return api.delete(API_ENDPOINTS.CANCEL_BOOKING, { params: { id: bookingId } });
    },
};

const AIAPI = {
    async chat(message, history = []) {
        return api.post(API_ENDPOINTS.AI_CHAT, { message, history });
    },

    async getSuggestions() {
        return api.get(API_ENDPOINTS.AI_SUGGESTIONS);
    },

    async getChatPageData() {
        return api.get(API_ENDPOINTS.AI_CHAT);
    },
};

const AdminAPI = {
    async getStats() {
        return api.get(API_ENDPOINTS.ADMIN_STATS);
    },

    async getUsers(filters = {}) {
        return api.get(API_ENDPOINTS.ADMIN_USERS, { queryParams: filters });
    },

    async toggleUser(userId) {
        return api.put(API_ENDPOINTS.ADMIN_TOGGLE_USER, {}, { params: { id: userId } });
    },

    async getActivity() {
        return api.get(API_ENDPOINTS.ADMIN_ACTIVITY);
    },

    async getRides(filters = {}) {
        return handleAPIError(api.get(API_ENDPOINTS.ADMIN_RIDES, { queryParams: filters }));
    },
};
