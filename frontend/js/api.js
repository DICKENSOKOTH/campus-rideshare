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
                    if (window.location.pathname !== '/login.html' && window.location.pathname !== '/register.html') {
                        window.location.href = '/login.html';
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

    async logout() {
        return api.post(API_ENDPOINTS.LOGOUT);
    },

    async verifyToken() {
        return api.get(API_ENDPOINTS.VERIFY_TOKEN);
    },
};

const UserAPI = {
    async getProfile() {
        return api.get(API_ENDPOINTS.GET_PROFILE);
    },

    async updateProfile(userData) {
        return api.put(API_ENDPOINTS.UPDATE_PROFILE, userData);
    },

    async updateLocation(location) {
        return api.post(API_ENDPOINTS.UPDATE_LOCATION, location);
    },

    async getUserRides() {
        return api.get(API_ENDPOINTS.GET_USER_RIDES);
    },

    async getUserBookings() {
        return api.get(API_ENDPOINTS.GET_USER_BOOKINGS);
    },

    async getRatings(userId) {
        return api.get(API_ENDPOINTS.GET_RATINGS, { params: { id: userId } });
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

    async updateRide(rideId, rideData) {
        return api.put(API_ENDPOINTS.UPDATE_RIDE, rideData, { params: { id: rideId } });
    },

    async deleteRide(rideId) {
        return api.delete(API_ENDPOINTS.DELETE_RIDE, { params: { id: rideId } });
    },

    async searchRides(searchParams) {
        return api.get(API_ENDPOINTS.SEARCH_RIDES, { queryParams: searchParams });
    },
};

const BookingAPI = {
    async createBooking(rideId, bookingData) {
        return api.post(API_ENDPOINTS.CREATE_BOOKING, bookingData, { params: { id: rideId } });
    },

    async updateBooking(bookingId, bookingData) {
        return api.put(API_ENDPOINTS.UPDATE_BOOKING, bookingData, { params: { id: bookingId } });
    },

    async cancelBooking(bookingId) {
        return api.post(API_ENDPOINTS.CANCEL_BOOKING, {}, { params: { id: bookingId } });
    },

    async acceptBooking(bookingId) {
        return api.post(API_ENDPOINTS.ACCEPT_BOOKING, {}, { params: { id: bookingId } });
    },

    async rejectBooking(bookingId) {
        return api.post(API_ENDPOINTS.REJECT_BOOKING, {}, { params: { id: bookingId } });
    },
};

const RatingAPI = {
    async createRating(rideId, ratingData) {
        return api.post(API_ENDPOINTS.CREATE_RATING, ratingData, { params: { id: rideId } });
    },
};

const AIAPI = {
    async chat(message, context = {}) {
        return api.post(API_ENDPOINTS.AI_CHAT, { message, context });
    },

    async getSuggestions(userContext) {
        return api.post(API_ENDPOINTS.AI_SUGGESTIONS, userContext);
    },
};

const AdminAPI = {
    async getAllUsers(filters = {}) {
        return api.get(API_ENDPOINTS.GET_ALL_USERS, { queryParams: filters });
    },

    async getAllRides(filters = {}) {
        return api.get(API_ENDPOINTS.GET_ALL_RIDES, { queryParams: filters });
    },

    async getStats() {
        return api.get(API_ENDPOINTS.GET_STATS);
    },

    async moderateUser(userId, action, reason) {
        return api.post(API_ENDPOINTS.MODERATE_USER, { action, reason }, { params: { id: userId } });
    },

    async moderateRide(rideId, action, reason) {
        return api.post(API_ENDPOINTS.MODERATE_RIDE, { action, reason }, { params: { id: rideId } });
    },
};
