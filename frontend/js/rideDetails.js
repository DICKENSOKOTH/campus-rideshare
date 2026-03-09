// Ride Details Logic - Display and manage individual ride details

class RideDetailsManager {
    constructor() {
        this.rideId = null;
        this.ride = null;
        this.bookings = [];
        this.isOwner = false;
        this.wsConnection = null;
    }

    async init() {
        // Require authentication
        if (!authManager.requireAuth()) {
            return;
        }

        // Get ride ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.rideId = urlParams.get('id');

        if (!this.rideId) {
            showNotification('Invalid ride ID', 'error');
            window.location.href = '/dashboard.html';
            return;
        }

        await this.loadRideDetails();
        this.setupEventHandlers();
        this.connectWebSocket();
    }

    async loadRideDetails() {
        this.showLoading();

        try {
            const response = await RideAPI.getRide(this.rideId);
            
            if (response.success && response.data) {
                this.ride = response.data;
                this.isOwner = authManager.currentUser && 
                              authManager.currentUser.id === this.ride.driver_id;
                
                this.renderRideDetails();
                
                if (this.isOwner) {
                    await this.loadBookings();
                }

                // Initialize map
                if (window.mapManager) {
                    window.mapManager.showRoute(
                        { lat: this.ride.origin_lat, lng: this.ride.origin_lng },
                        { lat: this.ride.destination_lat, lng: this.ride.destination_lng }
                    );
                }
            } else {
                this.showError('Ride not found');
            }
        } catch (error) {
            console.error('Failed to load ride:', error);
            this.showError(error.message || ERROR_MESSAGES.SERVER);
        } finally {
            this.hideLoading();
        }
    }

    async loadBookings() {
        try {
            // This would be an endpoint to get bookings for a specific ride
            // For now, we'll assume bookings are included in ride data
            if (this.ride.bookings) {
                this.bookings = this.ride.bookings;
                this.renderBookings();
            }
        } catch (error) {
            console.error('Failed to load bookings:', error);
        }
    }

    renderRideDetails() {
        // Update page title
        document.title = `${this.ride.origin} to ${this.ride.destination} — Campus Rideshare`;

        // Render main ride info
        const container = document.getElementById('rideDetailsContainer');
        if (!container) return;

        const isUpcoming = new Date(this.ride.departure_time) > new Date();
        const canBook = isUpcoming && !this.isOwner && this.ride.available_seats > 0;

        container.innerHTML = `
            <div class="ride-details-header">
                <div class="route-info">
                    <h1>${this.ride.origin}</h1>
                    <i class="icon-arrow-right"></i>
                    <h1>${this.ride.destination}</h1>
                </div>
                <div class="ride-status-badge status-${this.ride.status}">
                    ${this.ride.status}
                </div>
            </div>

            <div class="ride-details-grid">
                <div class="ride-main-info">
                    <div class="info-section">
                        <h3>Trip Information</h3>
                        <div class="info-list">
                            <div class="info-item">
                                <i class="icon-clock"></i>
                                <div>
                                    <strong>Departure</strong>
                                    <p>${this.formatDateTime(this.ride.departure_time)}</p>
                                </div>
                            </div>
                            <div class="info-item">
                                <i class="icon-users"></i>
                                <div>
                                    <strong>Available Seats</strong>
                                    <p>${this.ride.available_seats} of ${this.ride.total_seats}</p>
                                </div>
                            </div>
                            <div class="info-item">
                                <i class="icon-dollar"></i>
                                <div>
                                    <strong>Price per Seat</strong>
                                    <p>$${this.ride.price_per_seat}</p>
                                </div>
                            </div>
                            ${this.ride.vehicle_info ? `
                                <div class="info-item">
                                    <i class="icon-car"></i>
                                    <div>
                                        <strong>Vehicle</strong>
                                        <p>${this.ride.vehicle_info}</p>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    ${this.ride.description ? `
                        <div class="info-section">
                            <h3>Description</h3>
                            <p>${this.ride.description}</p>
                        </div>
                    ` : ''}

                    <div class="info-section">
                        <h3>Driver</h3>
                        <div class="driver-info">
                            <div class="driver-avatar">
                                ${this.ride.driver_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <strong>${this.ride.driver_name}</strong>
                                ${this.ride.driver_rating ? `
                                    <div class="rating">
                                        <i class="icon-star"></i>
                                        ${this.ride.driver_rating.toFixed(1)} (${this.ride.driver_rides || 0} rides)
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    ${this.isOwner ? `
                        <div class="owner-actions">
                            <button class="btn btn-secondary" onclick="rideDetailsManager.editRide()">
                                <i class="icon-edit"></i> Edit Ride
                            </button>
                            <button class="btn btn-danger" onclick="rideDetailsManager.deleteRide()">
                                <i class="icon-trash"></i> Delete Ride
                            </button>
                        </div>
                    ` : canBook ? `
                        <div class="booking-section">
                            <h3>Book this ride</h3>
                            <div class="booking-form">
                                <label>Number of seats:</label>
                                <input type="number" id="seatsInput" min="1" max="${this.ride.available_seats}" value="1">
                                <button class="btn btn-primary btn-lg" onclick="rideDetailsManager.bookRide()">
                                    Book Now - $${this.ride.price_per_seat}
                                </button>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="ride-sidebar">
                    <div id="mapContainer" class="map-container">
                        <!-- Map will be rendered here -->
                    </div>
                </div>
            </div>

            ${this.isOwner ? '<div id="bookingsContainer"></div>' : ''}
        `;
    }

    renderBookings() {
        const container = document.getElementById('bookingsContainer');
        if (!container || !this.isOwner) return;

        if (this.bookings.length === 0) {
            container.innerHTML = `
                <div class="info-section">
                    <h3>Bookings</h3>
                    <p class="empty-state">No bookings yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="info-section">
                <h3>Bookings (${this.bookings.length})</h3>
                <div class="bookings-list">
                    ${this.bookings.map(booking => `
                        <div class="booking-item" data-booking-id="${booking.id}">
                            <div class="booking-user">
                                <div class="user-avatar">
                                    ${booking.passenger_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <strong>${booking.passenger_name}</strong>
                                    <p>${booking.seats} seat(s)</p>
                                </div>
                            </div>
                            <div class="booking-status">
                                <span class="status-badge status-${booking.status}">
                                    ${booking.status}
                                </span>
                                ${booking.status === 'pending' ? `
                                    <div class="booking-actions">
                                        <button class="btn btn-sm btn-success" 
                                                onclick="rideDetailsManager.acceptBooking('${booking.id}')">
                                            Accept
                                        </button>
                                        <button class="btn btn-sm btn-danger" 
                                                onclick="rideDetailsManager.rejectBooking('${booking.id}')">
                                            Reject
                                        </button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    setupEventHandlers() {
        // Setup any additional event handlers
    }

    connectWebSocket() {
        // Connect to WebSocket for real-time updates
        if (window.wsManager) {
            this.wsConnection = window.wsManager.subscribeToRide(this.rideId, (update) => {
                this.handleRideUpdate(update);
            });
        }
    }

    handleRideUpdate(update) {
        // Handle real-time updates
        if (update.type === 'booking_created' || update.type === 'booking_cancelled') {
            this.loadRideDetails();
            if (this.isOwner) {
                this.loadBookings();
            }
        }
    }

    async bookRide() {
        const seatsInput = document.getElementById('seatsInput');
        const seats = seatsInput ? parseInt(seatsInput.value) : 1;

        if (seats < 1 || seats > this.ride.available_seats) {
            showNotification(`Please enter between 1 and ${this.ride.available_seats} seats`, 'error');
            return;
        }

        try {
            const response = await BookingAPI.createBooking(this.rideId, { seats });
            
            if (response.success) {
                showNotification(SUCCESS_MESSAGES.BOOKING_CREATED, 'success');
                await this.loadRideDetails();
            } else {
                showNotification(response.message || 'Booking failed', 'error');
            }
        } catch (error) {
            console.error('Booking failed:', error);
            showNotification(error.message || 'Booking failed', 'error');
        }
    }

    async acceptBooking(bookingId) {
        try {
            const response = await BookingAPI.acceptBooking(bookingId);
            
            if (response.success) {
                showNotification(SUCCESS_MESSAGES.BOOKING_ACCEPTED, 'success');
                await this.loadRideDetails();
                await this.loadBookings();
            } else {
                showNotification(response.message || 'Failed to accept booking', 'error');
            }
        } catch (error) {
            console.error('Failed to accept booking:', error);
            showNotification(error.message || 'Failed to accept booking', 'error');
        }
    }

    async rejectBooking(bookingId) {
        const confirmed = confirm('Are you sure you want to reject this booking?');
        if (!confirmed) return;

        try {
            const response = await BookingAPI.rejectBooking(bookingId);
            
            if (response.success) {
                showNotification(SUCCESS_MESSAGES.BOOKING_REJECTED, 'success');
                await this.loadRideDetails();
                await this.loadBookings();
            } else {
                showNotification(response.message || 'Failed to reject booking', 'error');
            }
        } catch (error) {
            console.error('Failed to reject booking:', error);
            showNotification(error.message || 'Failed to reject booking', 'error');
        }
    }

    editRide() {
        window.location.href = `/create-ride.html?id=${this.rideId}&edit=true`;
    }

    async deleteRide() {
        const confirmed = confirm('Are you sure you want to delete this ride? This action cannot be undone.');
        if (!confirmed) return;

        try {
            const response = await RideAPI.deleteRide(this.rideId);
            
            if (response.success) {
                showNotification(SUCCESS_MESSAGES.RIDE_DELETED, 'success');
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1000);
            } else {
                showNotification(response.message || 'Failed to delete ride', 'error');
            }
        } catch (error) {
            console.error('Failed to delete ride:', error);
            showNotification(error.message || 'Failed to delete ride', 'error');
        }
    }

    formatDateTime(dateTimeStr) {
        const date = new Date(dateTimeStr);
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        };
        return date.toLocaleString('en-US', options);
    }

    showLoading() {
        const loadingEl = document.getElementById('loadingIndicator');
        if (loadingEl) loadingEl.style.display = 'block';
    }

    hideLoading() {
        const loadingEl = document.getElementById('loadingIndicator');
        if (loadingEl) loadingEl.style.display = 'none';
    }

    showError(message) {
        const container = document.getElementById('rideDetailsContainer');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="icon-alert"></i>
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button class="btn" onclick="window.location.href='/dashboard.html'">
                        Back to Dashboard
                    </button>
                </div>
            `;
        }
        this.hideLoading();
    }

    cleanup() {
        // Cleanup WebSocket connection
        if (this.wsConnection && window.wsManager) {
            window.wsManager.unsubscribeFromRide(this.rideId);
        }
    }
}

// Initialize when page loads
let rideDetailsManager;

if (window.location.pathname.includes('ride-details.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        rideDetailsManager = new RideDetailsManager();
        rideDetailsManager.init();
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (rideDetailsManager) {
            rideDetailsManager.cleanup();
        }
    });
}
