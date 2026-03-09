// API Configuration
const API_CONFIG = {
    BASE_URL: 'http://localhost:5000/api',
    WEBSOCKET_URL: 'ws://localhost:8765',
    TIMEOUT: 30000, // 30 seconds
};

// API Endpoints
const API_ENDPOINTS = {
    // Auth
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    VERIFY_TOKEN: '/auth/verify',
    
    // User
    GET_PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    UPDATE_LOCATION: '/users/location',
    GET_USER_RIDES: '/users/rides',
    GET_USER_BOOKINGS: '/users/bookings',
    
    // Rides
    CREATE_RIDE: '/rides',
    GET_RIDES: '/rides',
    GET_RIDE: '/rides/:id',
    UPDATE_RIDE: '/rides/:id',
    DELETE_RIDE: '/rides/:id',
    SEARCH_RIDES: '/rides/search',
    
    // Bookings
    CREATE_BOOKING: '/rides/:id/book',
    UPDATE_BOOKING: '/bookings/:id',
    CANCEL_BOOKING: '/bookings/:id/cancel',
    ACCEPT_BOOKING: '/bookings/:id/accept',
    REJECT_BOOKING: '/bookings/:id/reject',
    
    // Ratings
    CREATE_RATING: '/rides/:id/rate',
    GET_RATINGS: '/users/:id/ratings',
    
    // AI Assistant
    AI_CHAT: '/ai/chat',
    AI_SUGGESTIONS: '/ai/suggestions',
    
    // Admin
    GET_ALL_USERS: '/admin/users',
    GET_ALL_RIDES: '/admin/rides',
    GET_STATS: '/admin/stats',
    MODERATE_USER: '/admin/users/:id',
    MODERATE_RIDE: '/admin/rides/:id',
};

// Local Storage Keys
const STORAGE_KEYS = {
    TOKEN: 'campus_rideshare_token',
    USER: 'campus_rideshare_user',
    THEME: 'campus_rideshare_theme',
    LOCATION: 'campus_rideshare_last_location',
};

// Map Configuration
const MAP_CONFIG = {
    DEFAULT_CENTER: { lat: 40.7128, lng: -74.0060 }, // Default to NYC, should be set to campus location
    DEFAULT_ZOOM: 14,
    MARKER_COLORS: {
        PICKUP: '#4CAF50',
        DROPOFF: '#F44336',
        CURRENT: '#2196F3',
    },
};

// App Constants
const APP_CONSTANTS = {
    MAX_PASSENGERS: 8,
    MIN_PRICE: 0,
    MAX_PRICE: 100,
    SEARCH_RADIUS: 10, // km
    UPDATE_INTERVAL: 30000, // 30 seconds for location updates
};

// Error Messages
const ERROR_MESSAGES = {
    NETWORK: 'Network error. Please check your connection.',
    UNAUTHORIZED: 'Please login to continue.',
    FORBIDDEN: 'You do not have permission to perform this action.',
    NOT_FOUND: 'The requested resource was not found.',
    SERVER: 'Server error. Please try again later.',
    VALIDATION: 'Please check your input and try again.',
};

// Success Messages
const SUCCESS_MESSAGES = {
    LOGIN: 'Login successful!',
    REGISTER: 'Registration successful! Please login.',
    RIDE_CREATED: 'Ride created successfully!',
    RIDE_UPDATED: 'Ride updated successfully!',
    RIDE_DELETED: 'Ride deleted successfully!',
    BOOKING_CREATED: 'Booking request sent!',
    BOOKING_ACCEPTED: 'Booking accepted!',
    BOOKING_REJECTED: 'Booking rejected!',
    BOOKING_CANCELLED: 'Booking cancelled!',
    PROFILE_UPDATED: 'Profile updated successfully!',
    RATING_SUBMITTED: 'Rating submitted successfully!',
};
