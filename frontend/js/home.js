// Dashboard Logic - Main user dashboard functionality

class Dashboard {
    constructor() {
        this.userRides = [];
        this.userBookings = [];
    }

    populateSidebar() {
        const user = authManager.currentUser;
        if (!user) return;
        const avatar = document.getElementById('sidebarAvatar');
        const name   = document.getElementById('sidebarName');
        const role   = document.getElementById('sidebarRole');
        if (avatar) {
            avatar.textContent = user.full_name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
        }
        if (name) name.textContent = user.full_name;
        if (role) role.textContent = user.role === 'driver' ? 'Driver' : 'Rider';
    }

    // Hide "Post a Ride" links for non-drivers
    applyRoleRestrictions() {
        const user = authManager.currentUser;
        if (!user || user.role === 'driver') return;

        // Hide Post a Ride from navbar, sidebar, and quick actions
        const postRideLinks = document.querySelectorAll('a[href="create-ride.html"]');
        postRideLinks.forEach(link => {
            link.style.display = 'none';
        });
    }

    async init() {
        if (!(await authManager.requireAuth())) return;

        this.populateSidebar();
        this.applyRoleRestrictions();

        const greeting = document.getElementById('pageGreeting');
        if (greeting && authManager.currentUser) {
            const hour = new Date().getHours();
            const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
            greeting.textContent = `Good ${period}, ${authManager.currentUser.full_name}`;
        }

        try {
            await Promise.all([this.loadUserRides(), this.loadUserBookings()]);
            this.updateStats();
            this.renderUpcomingRides();
            this.renderRecentActivity();
        } catch (error) {
            console.error('Dashboard load error:', error);
        }
    }

    async loadUserRides() {
        try {
            const response = await UserAPI.getMyRides();
            if (response.success && response.data) {
                this.userRides = response.data;
            }
        } catch (error) {
            console.error('Failed to load rides:', error);
        }
    }

    async loadUserBookings() {
        try {
            const response = await UserAPI.getMyBookings();
            if (response.success && response.data) {
                this.userBookings = response.data;
            }
        } catch (error) {
            console.error('Failed to load bookings:', error);
        }
    }

    // Optimized DOM updates to reduce unnecessary reflows and repaints
    updateStats() {
        const statsRow = document.getElementById('statsRow');
        if (!statsRow) return;

        const totalRides = this.userRides.length;
        const totalBookings = this.userBookings.length;
        const now = new Date();
        const upcoming = this.userRides.filter(r =>
            new Date(r.departure_time) > now && r.status === 'scheduled'
        ).length + this.userBookings.filter(b =>
            new Date(b.departure_time) > now && b.status === 'confirmed'
        ).length;

        const statNumbers = statsRow.querySelectorAll('.stat-number');
        const updates = [totalRides + totalBookings, null, upcoming || '\u2014'];

        statNumbers.forEach((el, index) => {
            if (el && el.textContent !== updates[index]?.toString()) {
                el.textContent = updates[index];
            }
        });
    }

    // Render upcoming rides (booked rides departing in the future)
    renderUpcomingRides() {
        const container = document.getElementById('upcomingRides');
        if (!container) return;

        const now = new Date();
        const isDriver = authManager.currentUser?.role === 'driver';

        // Combine driver's scheduled rides and rider's confirmed bookings
        let upcomingItems = [];

        // Add driver's upcoming rides
        if (isDriver) {
            this.userRides
                .filter(r => new Date(r.departure_time) > now && r.status === 'scheduled')
                .forEach(r => upcomingItems.push({ ...r, type: 'driving' }));
        }

        // Add booked rides (as passenger)
        this.userBookings
            .filter(b => new Date(b.departure_time) > now && (b.status === 'confirmed' || b.status === 'pending'))
            .forEach(b => upcomingItems.push({ ...b, type: 'booked' }));

        // Sort by departure time
        upcomingItems.sort((a, b) => new Date(a.departure_time) - new Date(b.departure_time));

        // Take top 5
        upcomingItems = upcomingItems.slice(0, 5);

        if (upcomingItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg class="icon icon-2xl"><use href="assets/icons.svg#icon-car"></use></svg>
                    </div>
                    <h3>No upcoming rides</h3>
                    <p>Book a ride to see it here.</p>
                </div>`;
            return;
        }

        container.innerHTML = upcomingItems.map(item => {
            const date = new Date(item.departure_time);
            const formattedDate = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const badge = item.type === 'driving' 
                ? '<span class="badge badge-primary">Driving</span>' 
                : `<span class="badge badge-${item.status === 'confirmed' ? 'success' : 'warning'}">${item.status === 'confirmed' ? 'Confirmed' : 'Pending'}</span>`;

            return `
                <div class="ride-item">
                    <div class="ride-item-info">
                        <div class="ride-item-route">
                            <strong>${item.origin}</strong>
                            <svg class="icon icon-sm"><use href="assets/icons.svg#icon-arrow-right"></use></svg>
                            <strong>${item.destination}</strong>
                        </div>
                        <div class="ride-item-meta">
                            <span>${formattedDate} at ${formattedTime}</span>
                            ${badge}
                        </div>
                    </div>
                    <a href="ride-details.html?id=${item.ride_id || item.id}" class="btn btn-outline btn-sm">View</a>
                </div>`;
        }).join('');
    }

    // Render recent activity (completed rides, new bookings, etc.)
    renderRecentActivity() {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        const now = new Date();
        const isDriver = authManager.currentUser?.role === 'driver';
        let activities = [];

        // Add completed/cancelled rides as driver
        if (isDriver) {
            this.userRides
                .filter(r => r.status === 'completed' || r.status === 'cancelled')
                .forEach(r => activities.push({
                    type: r.status === 'completed' ? 'ride_completed' : 'ride_cancelled',
                    message: `${r.status === 'completed' ? 'Completed' : 'Cancelled'} ride to ${r.destination}`,
                    time: new Date(r.departure_time),
                    icon: r.status === 'completed' ? 'check-circle' : 'x-circle'
                }));
        }

        // Add past bookings
        this.userBookings
            .filter(b => new Date(b.departure_time) < now || b.status === 'cancelled')
            .forEach(b => activities.push({
                type: b.status === 'confirmed' ? 'booking_completed' : (b.status === 'cancelled' ? 'booking_cancelled' : 'booking_pending'),
                message: b.status === 'cancelled' 
                    ? `Cancelled booking to ${b.destination}` 
                    : `Ride to ${b.destination}`,
                time: new Date(b.departure_time),
                icon: b.status === 'confirmed' ? 'check-circle' : (b.status === 'cancelled' ? 'x-circle' : 'clock')
            }));

        // Add recent confirmed bookings as activity
        this.userBookings
            .filter(b => b.status === 'confirmed' && new Date(b.departure_time) > now)
            .forEach(b => activities.push({
                type: 'booking_confirmed',
                message: `Booked ride to ${b.destination}`,
                time: new Date(b.booked_at || b.departure_time),
                icon: 'check'
            }));

        // Sort by time descending
        activities.sort((a, b) => b.time - a.time);

        // Take top 5
        activities = activities.slice(0, 5);

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg class="icon icon-2xl"><use href="assets/icons.svg#icon-activity"></use></svg>
                    </div>
                    <h3>No recent activity</h3>
                    <p>Your activity will show up here.</p>
                </div>`;
            return;
        }

        container.innerHTML = activities.map(activity => {
            const timeAgo = this.getTimeAgo(activity.time);
            return `
                <div class="activity-item">
                    <div class="activity-icon ${activity.type.includes('cancelled') ? 'error' : (activity.type.includes('completed') || activity.type.includes('confirmed') ? 'success' : '')}">
                        <svg class="icon icon-sm"><use href="assets/icons.svg#icon-${activity.icon}"></use></svg>
                    </div>
                    <div class="activity-content">
                        <p class="activity-message">${activity.message}</p>
                        <span class="activity-time">${timeAgo}</span>
                    </div>
                </div>`;
        }).join('');
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    async cancelBooking(bookingId) {
        if (!confirm('Are you sure you want to cancel this booking?')) return;
        try {
            const response = await BookingAPI.cancelBooking(bookingId);
            if (response.success) {
                showNotification(SUCCESS_MESSAGES.BOOKING_CANCELLED, 'success');
                await this.loadUserBookings();
                this.updateStats();
                this.renderUpcomingRides();
                this.renderRecentActivity();
            } else {
                showNotification(response.message || 'Failed to cancel booking', 'error');
            }
        } catch (error) {
            showNotification(error.message || 'Failed to cancel booking', 'error');
        }
    }
}

// ── Landing page (index.html) ──────────────────────────────
function initLandingPage() {
    // Navbar scroll behaviour
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
            navbar.classList.toggle('transparent', window.scrollY <= 50);
        });
    }
    // Mobile menu toggle
    const toggle = document.getElementById('navToggle');
    const links  = document.getElementById('navLinks');
    if (toggle && links) {
        toggle.addEventListener('click', () => links.classList.toggle('open'));
    }
    // Populate hero preview cards
    buildHeroCards();
}

function buildHeroCards() {
    const rideEl = document.getElementById('heroPreviewRide');
    if (rideEl) {
        rideEl.innerHTML = `
            <div class="hero-card-label">
                <svg class="icon icon-sm"><use href="assets/icons.svg#icon-map-pin"></use></svg> Smart Ride Matching
            </div>
            <div class="hero-card-route">
                <span class="route-label">Origin</span>
                <span class="route-line"></span>
                <span class="route-label">Destination</span>
            </div>
            <div class="hero-card-meta">Find verified drivers heading your way</div>`;
    }
    const aiEl = document.getElementById('heroPreviewAI');
    if (aiEl) {
        aiEl.innerHTML = `
            <div class="hero-card-label"><svg class="icon icon-sm"><use href="assets/icons.svg#icon-sparkle"></use></svg> AI Assistant</div>
            <div class="hero-card-bubble">Tell the AI where you're going and it finds the best match</div>
            <div class="hero-card-result">Powered by smart route matching</div>`;
    }
    const statsEl = document.getElementById('heroPreviewStats');
    if (statsEl) {
        statsEl.innerHTML = `
            <div class="hero-card-label"><svg class="icon icon-sm"><use href="assets/icons.svg#icon-bar-chart"></use></svg> Track Your Impact</div>
            <div class="hero-card-stats">
                <div class="hero-card-stat"><div class="hero-card-stat-lbl">Money Saved</div></div>
                <div class="hero-card-stat"><div class="hero-card-stat-lbl">Trips Shared</div></div>
                <div class="hero-card-stat"><div class="hero-card-stat-lbl">CO&#8322; Reduced</div></div>
            </div>`;
    }
}

// ── Bootstrap ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;

    if (path.endsWith('index.html') || path.endsWith('/') || path === '') {
        initLandingPage();
    }

    if (path.includes('home')) {
        const dashboard = new Dashboard();
        await dashboard.init();
        // Removed aggressive 30-second polling that caused excessive API requests.
        // Dashboard now loads once on page load; use WebSocket for real-time updates
        // or manual refresh if needed.
    }
});
