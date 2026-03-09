// Dashboard Logic - Main user dashboard functionality

class Dashboard {
    constructor() {
        this.userRides = [];
        this.userBookings = [];
    }

    async init() {
        if (!authManager.requireAuth()) return;

        const greeting = document.getElementById('pageGreeting');
        if (greeting && authManager.currentUser) {
            const hour = new Date().getHours();
            const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
            greeting.textContent = `Good ${period}, ${authManager.currentUser.full_name}`;
        }

        try {
            await Promise.all([this.loadUserRides(), this.loadUserBookings()]);
            this.updateStats();
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
        if (statNumbers[0]) statNumbers[0].textContent = totalRides + totalBookings;
        if (statNumbers[2]) statNumbers[2].textContent = upcoming || '\u2014';
    }

    async cancelBooking(bookingId) {
        if (!confirm('Are you sure you want to cancel this booking?')) return;
        try {
            const response = await BookingAPI.cancelBooking(bookingId);
            if (response.success) {
                showNotification(SUCCESS_MESSAGES.BOOKING_CANCELLED, 'success');
                await this.loadUserBookings();
                this.updateStats();
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
            <div class="hero-card-row">
                <div class="avatar avatar-sm">JK</div>
                <div>
                    <div class="route-label">John K.</div>
                    <div class="hero-card-meta stars"><svg class="icon icon-sm"><use href="assets/icons.svg#icon-star-filled"></use></svg> 4.9</div>
                </div>
                <span class="badge badge-gold" style="margin-left:auto">3 seats</span>
            </div>
            <div class="hero-card-route">
                <span class="route-label">Campus</span>
                <span class="route-line"></span>
                <span class="route-label">CBD Nairobi</span>
            </div>
            <div class="hero-card-meta">Friday &middot; 2:30 PM &middot; KSh 350/seat</div>`;
    }
    const aiEl = document.getElementById('heroPreviewAI');
    if (aiEl) {
        aiEl.innerHTML = `
            <div class="hero-card-label"><svg class="icon icon-sm"><use href="assets/icons.svg#icon-sparkle"></use></svg> AI Assistant</div>
            <div class="hero-card-bubble">"I need a cheap ride to Westlands Friday afternoon"</div>
            <div class="hero-card-result">Found 4 matching rides for you!</div>`;
    }
    const statsEl = document.getElementById('heroPreviewStats');
    if (statsEl) {
        statsEl.innerHTML = `
            <div class="hero-card-label"><svg class="icon icon-sm"><use href="assets/icons.svg#icon-bar-chart"></use></svg> This Month</div>
            <div class="hero-card-stats">
                <div class="hero-card-stat"><div class="hero-card-stat-num">KSh 4,200</div><div class="hero-card-stat-lbl">Saved</div></div>
                <div class="hero-card-stat"><div class="hero-card-stat-num">8</div><div class="hero-card-stat-lbl">Trips</div></div>
                <div class="hero-card-stat"><div class="hero-card-stat-num">24 kg</div><div class="hero-card-stat-lbl">CO&#8322; Saved</div></div>
            </div>`;
    }
}

// ── Bootstrap ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.endsWith('index.html') || path.endsWith('/') || path === '') {
        initLandingPage();
    }

    if (path.includes('dashboard') || path.includes('home')) {
        const dashboard = new Dashboard();
        dashboard.init();
        setInterval(() => dashboard.init(), 30000);
    }
});
