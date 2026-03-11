// WebSocket Manager - Handles real-time updates and notifications

class WebSocketManager {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.subscriptions = new Map();
        this.messageHandlers = [];
        this.heartbeatInterval = null;
        this.reconnectTimeout = null;
        this.lastMessageId = null; // Track the last processed message ID
    }

    /**
     * Connect to WebSocket server
     */
    connect() {
        if (this.ws && this.isConnected) {
            console.log('WebSocket already connected');
            return;
        }

        try {
            const token = (typeof authManager !== 'undefined') ? authManager._accessToken : null;
            if (!token) {
                console.warn('No auth token, skipping WebSocket connection');
                return;
            }

            // Connect with auth token
            const wsUrl = `${API_CONFIG.WEBSOCKET_URL}?token=${token}`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => this.handleOpen();
            this.ws.onmessage = (event) => this.handleMessage(event);
            this.ws.onerror = (error) => this.handleError(error);
            this.ws.onclose = (event) => this.handleClose(event);

            console.log('Connecting to WebSocket...');
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Handle WebSocket open event
     */
    handleOpen() {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Send authentication
        this.sendMessage({
            type: 'auth',
            token: (typeof authManager !== 'undefined') ? authManager._accessToken : null,
        });

        // Start heartbeat
        this.startHeartbeat();

        // Resubscribe to all previous subscriptions
        this.resubscribeAll();
    }

    /**
     * Handle incoming WebSocket messages
     */
    handleMessage(event) {
        try {
            const message = JSON.parse(event.data);
            console.log('WebSocket message received:', message);

            // Deduplicate messages based on a unique ID
            if (message.id && message.id === this.lastMessageId) {
                console.warn('Duplicate WebSocket message ignored:', message.id);
                return;
            }
            this.lastMessageId = message.id;

            // Handle different message types
            switch (message.type) {
                case 'auth_success':
                    console.log('WebSocket authenticated');
                    break;

                case 'auth_error':
                    console.error('WebSocket authentication failed');
                    this.disconnect();
                    break;

                case 'pong':
                    // Heartbeat response
                    break;

                case 'ride_update':
                    this.handleRideUpdate(message);
                    break;

                case 'booking_update':
                    this.handleBookingUpdate(message);
                    break;

                case 'location_update':
                    this.handleLocationUpdate(message);
                    break;

                case 'notification':
                    this.handleNotification(message);
                    break;

                default:
                    // Call generic message handlers
                    this.messageHandlers.forEach(handler => handler(message));
            }
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    }

    /**
     * Handle WebSocket error
     */
    handleError(error) {
        console.error('WebSocket error:', error);
        showNotification('WebSocket connection error. Retrying...', 'error');
    }

    /**
     * Handle WebSocket close event
     */
    handleClose(event) {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnected = false;
        this.stopHeartbeat();

        // Attempt to reconnect unless it was a normal closure
        if (event.code !== 1000) {
            this.scheduleReconnect();
        }
    }

    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            showNotification('Lost connection to server', 'error');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000); // Cap delay at 30 seconds

        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, delay);
    }

    /**
     * Send message through WebSocket
     */
    sendMessage(message) {
        if (!this.isConnected || !this.ws) {
            console.warn('WebSocket not connected, cannot send message');
            return false;
        }

        try {
            this.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('Failed to send WebSocket message:', error);
            return false;
        }
    }

    /**
     * Subscribe to ride updates
     */
    subscribeToRide(rideId, callback) {
        const key = `ride_${rideId}`;
        this.subscriptions.set(key, callback);

        this.sendMessage({
            type: 'subscribe',
            channel: 'ride',
            ride_id: rideId,
        });

        return key;
    }

    /**
     * Unsubscribe from ride updates
     */
    unsubscribeFromRide(rideId) {
        const key = `ride_${rideId}`;
        this.subscriptions.delete(key);

        this.sendMessage({
            type: 'unsubscribe',
            channel: 'ride',
            ride_id: rideId,
        });
    }

    /**
     * Subscribe to user updates (bookings, notifications)
     */
    subscribeToUserUpdates(callback) {
        const key = 'user_updates';
        this.subscriptions.set(key, callback);

        this.sendMessage({
            type: 'subscribe',
            channel: 'user',
        });

        return key;
    }

    /**
     * Resubscribe to all previous subscriptions
     */
    resubscribeAll() {
        this.subscriptions.forEach((callback, key) => {
            if (key.startsWith('ride_')) {
                const rideId = key.replace('ride_', '');
                this.sendMessage({
                    type: 'subscribe',
                    channel: 'ride',
                    ride_id: rideId,
                });
            } else if (key === 'user_updates') {
                this.sendMessage({
                    type: 'subscribe',
                    channel: 'user',
                });
            }
        });
    }

    /**
     * Add generic message handler
     */
    addMessageHandler(handler) {
        this.messageHandlers.push(handler);
    }

    /**
     * Remove message handler
     */
    removeMessageHandler(handler) {
        const index = this.messageHandlers.indexOf(handler);
        if (index > -1) {
            this.messageHandlers.splice(index, 1);
        }
    }

    /**
     * Handle ride update messages
     */
    handleRideUpdate(message) {
        const key = `ride_${message.ride_id}`;
        const callback = this.subscriptions.get(key);
        
        if (callback) {
            callback(message);
        }
    }

    /**
     * Handle booking update messages
     */
    handleBookingUpdate(message) {
        // Notify user updates subscribers
        const callback = this.subscriptions.get('user_updates');
        if (callback) {
            callback(message);
        }

        // Show notification
        showNotification(message.message || 'Booking updated', 'info');
    }

    /**
     * Handle location update messages
     */
    handleLocationUpdate(message) {
        const key = `ride_${message.ride_id}`;
        const callback = this.subscriptions.get(key);
        
        if (callback) {
            callback(message);
        }

        // Update map if available
        if (window.mapManager && message.location) {
            // Update driver location on map
            // This would be implemented based on specific requirements
        }
    }

    /**
     * Handle notification messages
     */
    handleNotification(message) {
        showNotification(message.message, message.level || 'info');

        // Play sound for important notifications
        if (message.important) {
            this.playNotificationSound();
        }
    }

    /**
     * Send location update
     */
    async sendLocationUpdate(rideId) {
        try {
            const location = await mapManager.getCurrentLocation();
            
            if (location) {
                this.sendMessage({
                    type: 'location_update',
                    ride_id: rideId,
                    location: location,
                    timestamp: new Date().toISOString(),
                });

                return true;
            }
        } catch (error) {
            console.error('Failed to send location update:', error);
        }
        
        return false;
    }

    /**
     * Start heartbeat to keep connection alive
     */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.sendMessage({ type: 'ping' });
            }
        }, 30000); // 30 seconds
    }

    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Play notification sound
     */
    playNotificationSound() {
        // Create and play a simple notification sound
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.error('Failed to play notification sound:', error);
        }
    }

    /**
     * Disconnect WebSocket
     */
    disconnect() {
        this.stopHeartbeat();

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        
        this.isConnected = false;
        this.reconnectAttempts = 0;
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            connected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            subscriptions: this.subscriptions.size,
        };
    }
}

// Create singleton instance
const wsManager = new WebSocketManager();

// Make it globally available
window.wsManager = wsManager;

// Auto-connect when user is authenticated
document.addEventListener('DOMContentLoaded', () => {
    if (authManager.isAuthenticated()) {
        // Connect after a short delay to ensure page is loaded
        setTimeout(() => {
            wsManager.connect();
        }, 1000);
    }
});

// Disconnect on page unload
window.addEventListener('beforeunload', () => {
    wsManager.disconnect();
});
