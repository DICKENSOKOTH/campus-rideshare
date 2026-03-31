// Profile Logic — User profile management

class ProfileManager {
    constructor() {
        this.profile = null;
        this.ratings = [];
        this.isEditMode = false;
        this.rideHistoryLoaded = false; // Track if ride history has been loaded
    }

    async init() {
        if (!(await authManager.requireAuth())) return;
        this.setupTabs();
        this.setupEditToggle();
        await this.loadProfile();
        // Ride history is now loaded lazily when user clicks the tabs
    }

    /* ── Data Loading ── */

    async loadProfile() {
        try {
            const response = await UserAPI.getProfile();
            if (response.success && response.data) {
                this.profile = response.data;
                this.ratings = this.profile.ratings || [];
                this.populateHeader();
                this.populateForm();
                this.renderVerification();
                this.renderBadges();
                this.renderReviews();
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
        }
    }

    async loadRideHistory() {
        try {
            const [bookingsRes, ridesRes] = await Promise.all([
                UserAPI.getMyBookings(),
                UserAPI.getMyRides()
            ]);
            if (bookingsRes.success && bookingsRes.data) {
                this.renderPassengerRides(bookingsRes.data);
            }
            if (ridesRes.success && ridesRes.data) {
                this.renderDriverRides(ridesRes.data);
            }
        } catch (error) {
            console.error('Failed to load ride history:', error);
        }
    }

    /* ── Header Population ── */

    populateHeader() {
        const p = this.profile;
        const initials = this.getInitials(p.full_name);

        const avatar = document.getElementById('profileAvatar');
        if (avatar) avatar.textContent = initials;

        const name = document.getElementById('profileName');
        if (name) name.textContent = p.full_name || '';

        const meta = document.getElementById('profileMeta');
        if (meta) {
            const parts = [];
            if (p.email) parts.push(p.email);
            if (p.created_at) parts.push('Member since ' + this.formatShortDate(p.created_at));
            meta.textContent = parts.join('  ·  ');
        }

        const statRides = document.getElementById('statRides');
        if (statRides) statRides.textContent = p.total_rides || '0';

        const statRating = document.getElementById('statRating');
        if (statRating) statRating.textContent = p.rating ? Number(p.rating).toFixed(1) : '–';

        const statSaved = document.getElementById('statSaved');
        if (statSaved) statSaved.textContent = p.savings ? 'KSh ' + Number(p.savings).toLocaleString() : '–';

        const statCO2 = document.getElementById('statCO2');
        if (statCO2) statCO2.textContent = p.co2_saved ? p.co2_saved + 'kg' : '–';
    }

    /* ── Form Population ── */

    populateForm() {
        const p = this.profile;
        const nameParts = (p.full_name || '').split(' ');
        this.setVal('firstName', nameParts[0] || '');
        this.setVal('lastName', nameParts.slice(1).join(' ') || '');
        this.setVal('email', p.email || '');
        this.setVal('phone', p.phone || '');
        this.setVal('emergency', p.emergency_contact || '');
    }

    setVal(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    }

    /* ── Tabs ── */

    setupTabs() {
        const tabs = [
            { btn: 'tabPassenger', panel: 'panelPassenger' },
            { btn: 'tabDriver',    panel: 'panelDriver' },
            { btn: 'tabSaved',     panel: 'panelSaved' },
        ];

        tabs.forEach(({ btn, panel }) => {
            const btnEl = document.getElementById(btn);
            if (!btnEl) return;
            btnEl.addEventListener('click', async () => {
                tabs.forEach(t => {
                    const b = document.getElementById(t.btn);
                    const p = document.getElementById(t.panel);
                    if (b) b.classList.remove('active');
                    if (p) p.classList.add('hidden');
                });
                btnEl.classList.add('active');
                const panelEl = document.getElementById(panel);
                if (panelEl) panelEl.classList.remove('hidden');
                
                // Lazy load ride history when user clicks Passenger or Driver tabs
                if ((btn === 'tabPassenger' || btn === 'tabDriver') && !this.rideHistoryLoaded) {
                    this.rideHistoryLoaded = true;
                    await this.loadRideHistory();
                }
            });
        });
    }

    /* ── Edit Mode ── */

    setupEditToggle() {
        const editBtn = document.getElementById('editProfileBtn');
        const saveBtn = document.getElementById('saveInfoBtn');
        const form = document.getElementById('profileForm');

        if (editBtn) {
            editBtn.addEventListener('click', () => this.toggleEditMode());
        }
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.handleSave());
        }
        if (form) {
            form.addEventListener('submit', e => {
                e.preventDefault();
                this.handleSave();
            });
        }
    }

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        const fields = ['firstName', 'lastName', 'phone', 'emergency'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !this.isEditMode;
        });

        const saveBtn = document.getElementById('saveInfoBtn');
        if (saveBtn) saveBtn.classList.toggle('hidden', !this.isEditMode);

        const editBtn = document.getElementById('editProfileBtn');
        if (editBtn) {
            editBtn.innerHTML = this.isEditMode
                ? '<svg class="icon icon-sm"><use href="assets/icons.svg#icon-x"></use></svg> Cancel'
                : '<svg class="icon icon-sm"><use href="assets/icons.svg#icon-edit"></use></svg> Edit Profile';
        }

        const errorEl = document.getElementById('profileError');
        if (errorEl) errorEl.classList.add('hidden');
    }

    async handleSave() {
        const errorEl = document.getElementById('profileError');
        if (errorEl) { errorEl.classList.add('hidden'); errorEl.textContent = ''; }

        const firstName = document.getElementById('firstName')?.value.trim();
        const lastName = document.getElementById('lastName')?.value.trim();
        const phone = document.getElementById('phone')?.value.trim();

        if (!firstName) {
            if (errorEl) { errorEl.textContent = 'First name is required.'; errorEl.classList.remove('hidden'); }
            return;
        }

        const fullName = [firstName, lastName].filter(Boolean).join(' ');

        try {
            const response = await UserAPI.updateProfile({
                full_name: fullName,
                phone: phone || null
            });

            if (response.success) {
                showNotification(SUCCESS_MESSAGES.PROFILE_UPDATED, 'success');
                if (response.data) {
                    // Preserve current in-memory token when updating user data
                    const token = (typeof authManager !== 'undefined') ? authManager._accessToken : null;
                    const refresh = (typeof authManager !== 'undefined') ? authManager._refreshToken : null;
                    authManager.saveAuthData(token, response.data, refresh);
                }
                await this.loadProfile();
                if (this.isEditMode) this.toggleEditMode();
            } else {
                if (errorEl) { errorEl.textContent = response.message || 'Failed to update profile'; errorEl.classList.remove('hidden'); }
            }
        } catch (error) {
            console.error('Failed to update profile:', error);
            if (errorEl) { errorEl.textContent = error.message || ERROR_MESSAGES.SERVER; errorEl.classList.remove('hidden'); }
        }
    }

    /* ── Passenger Rides ── */

    renderPassengerRides(bookings) {
        const container = document.getElementById('passengerRides');
        if (!container) return;

        if (!bookings.length) return; // keep empty state

        container.innerHTML = bookings.map(b => `
            <div class="ride-item">
                <div class="ride-item-icon">
                    <svg class="icon icon-md"><use href="assets/icons.svg#icon-car"></use></svg>
                </div>
                <div class="flex-1">
                    <div class="ride-item-route">${this.escapeHtml(b.origin)} → ${this.escapeHtml(b.destination)}</div>
                    <div class="ride-item-meta">${this.formatShortDate(b.departure_time)} · ${this.escapeHtml(b.driver_name)} · KSh ${Number(b.price_per_seat).toLocaleString()}</div>
                </div>
                <div class="stars">${this.renderStars(b.rating || 0)}</div>
            </div>
        `).join('');
    }

    /* ── Driver Rides ── */

    renderDriverRides(rides) {
        const container = document.getElementById('driverRides');
        if (!container) return;

        if (!rides.length) return; // keep empty state

        container.innerHTML = rides.map(r => `
            <div class="ride-item">
                <div class="ride-item-icon">
                    <svg class="icon icon-md"><use href="assets/icons.svg#icon-car"></use></svg>
                </div>
                <div class="flex-1">
                    <div class="ride-item-route">${this.escapeHtml(r.origin)} → ${this.escapeHtml(r.destination)}</div>
                    <div class="ride-item-meta">${this.formatShortDate(r.departure_time)} · ${r.seats_total - (r.seats_left || r.seats_remaining || 0)} passengers · KSh ${Number(r.price_per_seat).toLocaleString()}</div>
                </div>
                <span class="badge badge-${r.status === 'scheduled' ? 'gold' : r.status === 'completed' ? 'success' : 'danger'}">${r.status}</span>
            </div>
        `).join('');
    }

    /* ── Verification ── */

    renderVerification() {
        const container = document.getElementById('verificationContainer');
        if (!container) return;

        const p = this.profile;
        const items = [
            {
                icon: 'icon-mail',
                title: 'University Email',
                desc: p.is_verified ? 'Verified student' : 'Pending verification',
                verified: !!p.is_verified
            },
            {
                icon: 'icon-phone',
                title: 'Phone Number',
                desc: p.phone || 'Not provided',
                verified: !!p.phone
            },
            {
                icon: 'icon-file-text',
                title: "Driver's License",
                desc: 'Required to post rides',
                verified: false,
                action: true
            }
        ];

        container.innerHTML = items.map(item => `
            <div class="verification-item${item.verified ? ' verified' : ''}">
                <div class="verification-item-left">
                    <svg class="icon icon-md"><use href="assets/icons.svg#${item.icon}"></use></svg>
                    <div>
                        <div class="verification-item-title">${item.title}</div>
                        <div class="verification-item-desc">${this.escapeHtml(item.desc)}</div>
                    </div>
                </div>
                ${item.verified
                    ? '<span class="badge badge-success">Verified</span>'
                    : item.action
                        ? '<button class="btn btn-sm btn-primary">Verify</button>'
                        : '<span class="badge badge-gold">Pending</span>'
                }
            </div>
        `).join('');
    }

    /* ── Badges ── */

    renderBadges() {
        const container = document.getElementById('badgesContainer');
        if (!container) return;

        const p = this.profile;
        const totalRides = p.total_rides || 0;
        const rating = p.rating || 0;
        const co2 = p.co2_saved || 0;

        const badges = [
            { icon: 'icon-leaf',   name: 'Eco Traveller',   desc: 'Saved 20kg+ CO₂',          earned: co2 >= 20 },
            { icon: 'icon-star',   name: '5 Star Rider',    desc: 'Maintained 4.5+ rating',    earned: rating >= 4.5 },
            { icon: 'icon-award',  name: 'Frequent Rider',  desc: 'Complete 15 rides to unlock', earned: totalRides >= 15 },
        ];

        container.innerHTML = '<div class="badge-list">' + badges.map(b => `
            <div class="badge-item ${b.earned ? 'earned' : 'locked'}">
                <svg class="icon icon-lg"><use href="assets/icons.svg#${b.earned ? b.icon : 'icon-lock'}"></use></svg>
                <div>
                    <div class="badge-item-name">${b.name}</div>
                    <div class="badge-item-desc">${b.desc}</div>
                </div>
            </div>
        `).join('') + '</div>';
    }

    /* ── Reviews ── */

    renderReviews() {
        // Reviews could be shown in a separate section if needed
        // For now the ratings data is available in this.ratings
    }

    /* ── Helpers ── */

    renderStars(rating) {
        const full = Math.floor(rating);
        const half = rating % 1 >= 0.5;
        let out = '';
        for (let i = 0; i < 5; i++) {
            if (i < full) out += '<svg class="icon icon-sm"><use href="assets/icons.svg#icon-star-filled"></use></svg>';
            else if (i === full && half) out += '<svg class="icon icon-sm"><use href="assets/icons.svg#icon-star"></use></svg>';
            else out += '<svg class="icon icon-sm text-muted"><use href="assets/icons.svg#icon-star"></use></svg>';
        }
        return out;
    }

    getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
    }

    escapeHtml(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    formatShortDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    getMemberDuration() {
        if (!this.profile.created_at) return 'New';
        const months = Math.floor((Date.now() - new Date(this.profile.created_at)) / (1000 * 60 * 60 * 24 * 30));
        if (months < 1) return 'New';
        if (months < 12) return `${months} month${months > 1 ? 's' : ''}`;
        const years = Math.floor(months / 12);
        return `${years} year${years > 1 ? 's' : ''}`;
    }
}

// Initialize
let profileManager;
if (window.location.pathname.includes('profile.html')) {
    document.addEventListener('DOMContentLoaded', async () => {
        profileManager = new ProfileManager();
        await profileManager.init();
    });
}
