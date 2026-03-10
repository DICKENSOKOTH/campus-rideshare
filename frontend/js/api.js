// API Client - Handles all HTTP requests to the backend

class APIClient {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.timeout = API_CONFIG.TIMEOUT;
    }

    // Get auth token from localStorage
    getToken() {
        return localStorage.getItem(STORAGE_KEYS.TOKEN);
    }

    // Build headers with auth token
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (includeAuth) {
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

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
                if (error.status === 401) {
                    // Unauthorized - clear token and redirect to login
                    localStorage.removeItem(STORAGE_KEYS.TOKEN);
                    localStorage.removeItem(STORAGE_KEYS.USER);
                    if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
                        window.location.href = 'login.html';
                    }
                }
                throw error;
            }

            // Network error
            throw { status: 0, message: ERROR_MESSAGES.NETWORK };
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

// API Service Methods - Organized by feature

const AuthAPI = {
    async login(email, password) {
        return api.post(API_ENDPOINTS.LOGIN, { email, password }, { includeAuth: false });
    },

    async register(userData) {
        return api.post(API_ENDPOINTS.REGISTER, userData, { includeAuth: false });
    },

    async getMe() {
        return api.get(API_ENDPOINTS.ME);
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
        return api.get(API_ENDPOINTS.GET_RIDES, { queryParams: filters });
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
        return api.get(API_ENDPOINTS.ADMIN_RIDES, { queryParams: filters });
    },
};
