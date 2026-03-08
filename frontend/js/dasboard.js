// Dashboard Logic - Main user dashboard functionality

class Dashboard {
    constructor() {
        this.userRides = [];
        this.userBookings = [];
        this.stats = {
            totalRides: 0,
            totalBookings: 0,
            upcomingRides: 0,
            completedRides: 0,
        };
    }

    async init() {
        // Require authentication
        if (!authManager.requireAuth()) {
            return;
        }

        // Show loading state
        this.showLoading();

        try {
            // Load dashboard data in parallel
            await Promise.all([
                this.loadUserRides(),
                this.loadUserBookings(),
            ]);

            // Render dashboard
            this.render();
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            this.showError('Failed to load dashboard data. Please refresh the page.');
        }
    }

    async loadUserRides() {
        try {
            const response = await UserAPI.getUserRides();
            if (response.success && response.data) {
                this.userRides = response.data;
            }
        } catch (error) {
            console.error('Failed to load rides:', error);
            throw error;
        }
    }

    async loadUserBookings() {
        try {
            const response = await UserAPI.getUserBookings();
            if (response.success && response.data) {
                this.userBookings = response.data;
            }
        } catch (error) {
            console.error('Failed to load bookings:', error);
            throw error;
        }
    }

    calculateStats() {
        this.stats.totalRides = this.userRides.length;
        this.stats.totalBookings = this.userBookings.length;
        
        const now = new Date();
        this.stats.upcomingRides = this.userRides.filter(ride => 
            new Date(ride.departure_time) > now && ride.status === 'active'
        ).length;
        
        this.stats.completedRides = this.userRides.filter(ride => 
            ride.status === 'completed'
        ).length;
    }

    render() {
        this.calculateStats();
        this.renderStats();
        this.renderUpcomingRides();
        this.renderRecentBookings();
        this.renderQuickActions();
        this.hideLoading();
    }

    renderStats() {
        const statsContainer = document.getElementById('statsContainer');
        if (!statsContainer) return;

        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${this.stats.totalRides}</div>
                <div class="stat-label">Total Rides</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${this.stats.upcomingRides}</div>
                <div class="stat-label">Upcoming Rides</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${this.stats.totalBookings}</div>
                <div class="stat-label">My Bookings</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${this.stats.completedRides}</div>
                <div class="stat-label">Completed</div>
            </div>
        `;
    }

    renderUpcomingRides() {
        const container = document.getElementById('upcomingRidesContainer');
        if (!container) return;

        const now = new Date();
        const upcomingRides = this.userRides
            .filter(ride => new Date(ride.departure_time) > now && ride.status === 'active')
            .sort((a, b) => new Date(a.departure_time) - new Date(b.departure_time))
            .slice(0, 5);

        if (upcomingRides.length === 0) {
            container.innerHTML = '<p class="empty-state">No upcoming rides</p>';
            return;
        }

        container.innerHTML = upcomingRides.map(ride => `
            <div class="ride-card" data-ride-id="${ride.id}">
                <div class="ride-header">
                    <span class="ride-route">${ride.origin} → ${ride.destination}</span>
                    <span class="ride-status status-${ride.status}">${ride.status}</span>
                </div>
                <div class="ride-details">
                    <div class="ride-time">
                        <i class="icon-clock"></i>
                        ${this.formatDateTime(ride.departure_time)}
                    </div>
                    <div class="ride-seats">
                        <i class="icon-users"></i>
                        ${ride.available_seats}/${ride.total_seats} seats available
                    </div>
                    <div class="ride-price">
                        <i class="icon-dollar"></i>
                        $${ride.price_per_seat}
                    </div>
                </div>
                <div class="ride-actions">
                    <button class="btn btn-sm btn-secondary" onclick="dashboard.viewRide('${ride.id}')">
                        View Details
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="dashboard.editRide('${ride.id}')">
                        Edit
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderRecentBookings() {
        const container = document.getElementById('recentBookingsContainer');
        if (!container) return;

        const recentBookings = this.userBookings
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5);

        if (recentBookings.length === 0) {
            container.innerHTML = '<p class="empty-state">No bookings yet</p>';
            return;
        }

        container.innerHTML = recentBookings.map(booking => `
            <div class="booking-card" data-booking-id="${booking.id}">
                <div class="booking-header">
                    <span class="booking-route">${booking.ride.origin} → ${booking.ride.destination}</span>
                    <span class="booking-status status-${booking.status}">${booking.status}</span>
                </div>
                <div class="booking-details">
                    <div class="booking-time">
                        <i class="icon-clock"></i>
                        ${this.formatDateTime(booking.ride.departure_time)}
                    </div>
                    <div class="booking-driver">
                        <i class="icon-user"></i>
                        Driver: ${booking.ride.driver_name}
                    </div>
                    <div class="booking-seats">
                        <i class="icon-users"></i>
                        ${booking.seats} seat(s)
                    </div>
                </div>
                <div class="booking-actions">
                    <button class="btn btn-sm btn-secondary" onclick="dashboard.viewBooking('${booking.id}')">
                        View Details
                    </button>
                    ${booking.status === 'pending' || booking.status === 'accepted' ? `
                        <button class="btn btn-sm btn-danger" onclick="dashboard.cancelBooking('${booking.id}')">
                            Cancel
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    renderQuickActions() {
        const container = document.getElementById('quickActionsContainer');
        if (!container) return;

        container.innerHTML = `
            <button class="action-card" onclick="window.location.href='/create-ride.html'">
                <i class="icon-plus"></i>
                <span>Create Ride</span>
            </button>
            <button class="action-card" onclick="window.location.href='/find-ride.html'">
                <i class="icon-search"></i>
                <span>Find Ride</span>
            </button>
            <button class="action-card" onclick="window.location.href='/profile.html'">
                <i class="icon-user"></i>
                <span>My Profile</span>
            </button>
            <button class="action-card" onclick="window.location.href='/ai-assistant.html'">
                <i class="icon-message"></i>
                <span>AI Assistant</span>
            </button>
        `;
    }

    viewRide(rideId) {
        window.location.href = `/ride-details.html?id=${rideId}`;
    }

    editRide(rideId) {
        window.location.href = `/create-ride.html?id=${rideId}&edit=true`;
    }

    viewBooking(bookingId) {
        const booking = this.userBookings.find(b => b.id === bookingId);
        if (booking) {
            window.location.href = `/ride-details.html?id=${booking.ride_id}`;
        }
    }

    async cancelBooking(bookingId) {
        const confirmed = confirm('Are you sure you want to cancel this booking?');
        if (!confirmed) return;

        try {
            const response = await BookingAPI.cancelBooking(bookingId);
            
            if (response.success) {
                showNotification(SUCCESS_MESSAGES.BOOKING_CANCELLED, 'success');
                // Reload bookings
                await this.loadUserBookings();
                this.renderRecentBookings();
            } else {
                showNotification(response.message || 'Failed to cancel booking', 'error');
            }
        } catch (error) {
            console.error('Failed to cancel booking:', error);
            showNotification(error.message || 'Failed to cancel booking', 'error');
        }
    }

    formatDateTime(dateTimeStr) {
        const date = new Date(dateTimeStr);
        const options = {
            month: 'short',
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
        const errorContainer = document.getElementById('errorContainer');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="error-message">
                    <p>${message}</p>
                    <button onclick="location.reload()">Retry</button>
                </div>
            `;
            errorContainer.style.display = 'block';
        }
        this.hideLoading();
    }
}

// Initialize dashboard when page loads
let dashboard;

if (window.location.pathname.includes('dashboard.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        dashboard = new Dashboard();
        dashboard.init();

        // Refresh data every 30 seconds
        setInterval(() => {
            dashboard.init();
        }, 30000);
    });
}
