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

    async init() {
        if (!(await authManager.requireAuth())) return;

        this.populateSidebar();

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
        setInterval(async () => { await dashboard.init(); }, 30000);
    }
});
