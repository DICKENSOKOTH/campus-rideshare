// API Configuration
const API_CONFIG = {
    BASE_URL: 'http://localhost:5000/api',
    WEBSOCKET_URL: 'ws://localhost:8765',
    TIMEOUT: 30000, // 30 seconds
};

// API Endpoints — must match Flask backend routes exactly
const API_ENDPOINTS = {
    // Auth
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',

    // User
    GET_PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    GET_PUBLIC_PROFILE: '/users/:id',
    RATE_USER: '/users/rate/:id',

    // Rides
    CREATE_RIDE: '/rides',
    GET_RIDES: '/rides',
    GET_RIDE: '/rides/:id',
    DELETE_RIDE: '/rides/:id',
    GET_MY_RIDES: '/rides/my',
    GET_MY_BOOKINGS: '/rides/bookings',

    // Bookings
    BOOK_RIDE: '/rides/:id/book',
    CANCEL_BOOKING: '/rides/booking/:id',

    // AI Assistant
    AI_CHAT: '/ai/chat',
    AI_SUGGESTIONS: '/ai/chat/suggestions',

    // Admin
    ADMIN_STATS: '/admin/stats',
    ADMIN_USERS: '/admin/users',
    ADMIN_TOGGLE_USER: '/admin/users/:id/toggle',
    ADMIN_ACTIVITY: '/admin/activity',
    ADMIN_RIDES: '/admin/rides',
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
    LOGIN: 'Login successful! Redirecting…',
    REGISTER: 'Account created successfully! Please log in.',
    PROFILE_UPDATED: 'Profile updated successfully.',
    RIDE_CREATED: 'Ride posted successfully!',
    RIDE_UPDATED: 'Ride updated successfully.',
    RIDE_DELETED: 'Ride deleted.',
    BOOKING_CREATED: 'Ride booked successfully!',
    BOOKING_ACCEPTED: 'Booking accepted!',
    BOOKING_REJECTED: 'Booking rejected.',
    BOOKING_CANCELLED: 'Booking cancelled.',
    RATING_SUBMITTED: 'Rating submitted successfully!',
};
