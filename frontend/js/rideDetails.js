// Ride Details Logic - Display and manage individual ride details

class RideDetailsManager {
    constructor() {
        this.rideId = null;
        this.ride = null;
        this.isOwner = false;
        this.selectedSeat = null;
        this.wsConnection = null;
    }

    async init() {
        if (!authManager.requireAuth()) return;

        const urlParams = new URLSearchParams(window.location.search);
        this.rideId = urlParams.get('id');

        if (!this.rideId) {
            showNotification('Invalid ride ID', 'error');
            window.location.href = 'dashboard.html';
            return;
        }

        await this.loadRideDetails();
        this.setupEventHandlers();
        this.connectWebSocket();
    }

    async loadRideDetails() {
        try {
            const response = await RideAPI.getRide(this.rideId);
            if (response.success && response.data) {
                this.ride = response.data;
                this.isOwner = authManager.currentUser &&
                    authManager.currentUser.id === this.ride.driver_id;
                this.populatePage();

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
        }
    }

    /* ---- Populate Page ---- */

    populatePage() {
        const r = this.ride;
        document.title = `${r.origin} \u2192 ${r.destination} \u2014 Campus Rideshare`;

        const el = (id, text) => { const e = document.getElementById(id); if (e) e.textContent = text; };

        el('rideOrigin', r.origin);
        el('rideDestination', r.destination);
        el('rideDate', this.formatDate(r.departure_time));
        el('rideTime', this.formatTime(r.departure_time));

        const seatsLeft = r.seats_remaining || r.seats_left || 0;
        const seatsTotal = r.seats_total || r.available_seats || seatsLeft;
        el('rideSeats', seatsLeft + ' of ' + seatsTotal);

        // Driver
        const initials = this.getInitials(r.driver_name || 'DR');
        el('driverAvatar', initials);
        el('driverName', r.driver_name || 'Driver');
        if (r.driver_rating) {
            const starsEl = document.getElementById('driverStars');
            if (starsEl) starsEl.innerHTML = this.renderStars(r.driver_rating);
        }
        el('driverStats', (r.driver_rating ? r.driver_rating.toFixed(1) + ' rating' : '') +
            (r.driver_trips ? ' \u00b7 ' + r.driver_trips + ' trips' : ''));

        this.renderDriverStats(r);
        this.renderRideInfo(r);
        this.renderSeats(seatsLeft, seatsTotal);
        this.renderPricing(r.price_per_seat);
        this.renderReviews(r.reviews || []);

        el('bookingPrice', 'KSh ' + Number(r.price_per_seat).toLocaleString());
        el('bookingSeatsLabel', seatsLeft + ' seat' + (seatsLeft !== 1 ? 's' : '') + ' available');
    }

    renderDriverStats(r) {
        const grid = document.getElementById('driverStatGrid');
        if (!grid) return;
        const stats = [
            { num: r.driver_trips || '\u2014', label: 'Total Trips' },
            { num: r.driver_rating ? r.driver_rating.toFixed(1) : '\u2014', label: 'Rating' },
            { num: r.driver_ontime || '\u2014', label: 'On Time' },
        ];
        grid.innerHTML = stats.map(s => `
            <div class="driver-stat-box">
                <div class="driver-stat-num">${s.num}</div>
                <div class="driver-stat-label">${s.label}</div>
            </div>`).join('');
    }

    renderRideInfo(r) {
        const body = document.getElementById('rideInfoBody');
        if (!body) return;
        const icon = name => `<div class="info-icon"><svg class="icon icon-md"><use href="assets/icons.svg#icon-${name}"></use></svg></div>`;
        const rows = [];
        if (r.vehicle) rows.push({ ic: 'car', label: 'Vehicle', value: r.vehicle });
        rows.push({ ic: 'map-pin', label: 'Pickup Point', value: r.origin });
        if (r.stopover) rows.push({ ic: 'navigation', label: 'Stopover', value: r.stopover });
        rows.push({ ic: 'flag', label: 'Drop-off Point', value: r.destination });
        if (r.notes) rows.push({ ic: 'clipboard', label: 'Notes', value: r.notes });

        body.innerHTML = rows.map(row => `
            <div class="info-row">
                ${icon(row.ic)}
                <div>
                    <div class="info-label">${row.label}</div>
                    <div class="info-value">${this.escapeHtml(row.value)}</div>
                </div>
            </div>`).join('');
    }

    renderSeats(seatsLeft, seatsTotal) {
        const grid = document.getElementById('seatGrid');
        if (!grid) return;
        const labels = ['A1', 'A2', 'B1', 'B2', 'B3'];
        const booked = seatsTotal - seatsLeft;
        grid.innerHTML = labels.slice(0, seatsTotal).map((lbl, i) => {
            const cls = i < booked ? 'seat booked' : 'seat available';
            return `<div class="${cls}" data-seat="${lbl}">${lbl}</div>`;
        }).join('');

        grid.querySelectorAll('.seat.available').forEach(seat => {
            seat.addEventListener('click', () => {
                grid.querySelectorAll('.seat').forEach(s => s.classList.remove('selected'));
                seat.classList.add('selected');
                this.selectedSeat = seat.dataset.seat;
            });
        });
    }

    renderPricing(price) {
        const el = (id, text) => { const e = document.getElementById(id); if (e) e.textContent = text; };
        const formatted = 'KSh ' + Number(price).toLocaleString();
        el('breakdownSubtotal', formatted);
        el('breakdownTotal', formatted);
    }

    renderReviews(reviews) {
        const container = document.getElementById('reviewsContainer');
        if (!container) return;
        if (!reviews.length) return; // keep empty state

        container.innerHTML = reviews.map(rev => `
            <div class="review-card">
                <div class="review-meta">
                    <div class="avatar avatar-sm">${this.getInitials(rev.reviewer_name || 'U')}</div>
                    <div>
                        <strong>${this.escapeHtml(rev.reviewer_name || 'Anonymous')}</strong>
                        <div class="stars">${this.renderStars(rev.rating || 5)}</div>
                    </div>
                    <span class="review-text">${rev.time_ago || ''}</span>
                </div>
                <p class="review-text">${this.escapeHtml(rev.comment || '')}</p>
            </div>`).join('');
    }

    /* ---- Events ---- */

    setupEventHandlers() {
        document.getElementById('bookRideBtn')?.addEventListener('click', () => this.bookRide());
        document.getElementById('saveRideBtn')?.addEventListener('click', () => {
            showNotification('Ride saved to your bookmarks.', 'info');
        });
        document.getElementById('messageDriver')?.addEventListener('click', () => {
            showNotification('Messaging is coming soon.', 'info');
        });
    }

    async bookRide() {
        const seatsLeft = this.ride?.seats_remaining || this.ride?.seats_left || 0;
        if (seatsLeft < 1) {
            showNotification('No seats available.', 'error');
            return;
        }

        const btn = document.getElementById('bookRideBtn');
        if (btn) { btn.disabled = true; btn.textContent = 'Booking\u2026'; }

        try {
            const response = await BookingAPI.bookRide(this.rideId, { seats_booked: 1 });
            if (response.success) {
                showNotification(SUCCESS_MESSAGES.BOOKING_CREATED, 'success');
                await this.loadRideDetails();
            } else {
                showNotification(response.message || 'Booking failed', 'error');
            }
        } catch (error) {
            console.error('Booking failed:', error);
            showNotification(error.message || 'Booking failed', 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Book This Ride'; }
        }
    }

    /* ---- WebSocket ---- */

    connectWebSocket() {
        if (window.wsManager) {
            this.wsConnection = window.wsManager.subscribeToRide(this.rideId, (update) => {
                if (update.type === 'booking_created' || update.type === 'booking_cancelled') {
                    this.loadRideDetails();
                }
            });
        }
    }

    /* ---- Helpers ---- */

    getInitials(name) {
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }

    renderStars(rating) {
        const full = Math.floor(rating);
        return '\u2605'.repeat(full) + (rating - full >= 0.5 ? '\u2606' : '') + ` <small>${rating.toFixed(1)}</small>`;
    }

    escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    formatDate(dt) {
        return new Date(dt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    }

    formatTime(dt) {
        return new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    showError(message) {
        const container = document.getElementById('rideDetailsContainer');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg class="icon icon-3xl"><use href="assets/icons.svg#icon-alert-circle"></use></svg>
                    <h3>Something went wrong</h3>
                    <p>${this.escapeHtml(message)}</p>
                    <a href="dashboard.html" class="btn btn-secondary">Back to Dashboard</a>
                </div>`;
        }
    }

    cleanup() {
        if (this.wsConnection && window.wsManager) {
            window.wsManager.unsubscribeFromRide(this.rideId);
        }
    }
}

let rideDetailsManager;
if (window.location.pathname.includes('ride-details.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        rideDetailsManager = new RideDetailsManager();
        rideDetailsManager.init();
    });
    window.addEventListener('beforeunload', () => {
        if (rideDetailsManager) rideDetailsManager.cleanup();
    });
}
