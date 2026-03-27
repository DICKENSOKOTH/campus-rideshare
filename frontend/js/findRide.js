// Find Ride Logic - Search and filter available rides

class FindRideManager {
    constructor() {
        this.rides = [];
        this.filteredRides = [];
        this.filters = {
            origin: '',
            destination: '',
            date: '',
            minSeats: 1,
            maxPrice: 2000,
        };
    }

    async init() {
        if (!(await authManager.requireAuth())) return;

        this.setupSearch();
        this.setupFilters();
        await this.loadRides();
    }

    /* ---- Search ---- */

    setupSearch() {
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }

        const dateInput = document.getElementById('searchDate');
        if (dateInput) {
            dateInput.setAttribute('min', new Date().toISOString().split('T')[0]);
        }
    }

    /* ---- Filters ---- */

    setupFilters() {
        const priceRange = document.getElementById('priceRange');
        const priceValue = document.getElementById('priceValue');
        if (priceRange) {
            priceRange.addEventListener('input', () => {
                this.filters.maxPrice = Number(priceRange.value);
                if (priceValue) priceValue.textContent = 'KSh ' + Number(priceRange.value).toLocaleString();
            });
        }

        const seatsFilter = document.getElementById('seatsFilter');
        if (seatsFilter) {
            seatsFilter.addEventListener('change', () => {
                this.filters.minSeats = Number(seatsFilter.value) || 0;
            });
        }

        const sortBy = document.getElementById('sortBy');
        if (sortBy) {
            sortBy.addEventListener('change', () => this.applyFilters());
        }

        const applyBtn = document.getElementById('applyFilters');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applyFilters());
        }

        const clearBtn = document.getElementById('clearFilters');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearFilters());
        }
    }

    clearFilters() {
        this.filters.maxPrice = 2000;
        this.filters.minSeats = 0;
        const priceRange = document.getElementById('priceRange');
        const priceValue = document.getElementById('priceValue');
        if (priceRange) priceRange.value = 2000;
        if (priceValue) priceValue.textContent = 'KSh 2,000';
        const seatsFilter = document.getElementById('seatsFilter');
        if (seatsFilter) seatsFilter.value = '0';
        this.applyFilters();
    }

    /* ---- Load & Search ---- */

    async loadRides() {
        this.showLoading();
        try {
            const response = await RideAPI.getRides();
            if (response.success && response.data) {
                this.rides = response.data;
                this.applyFilters();
            } else {
                this.showEmpty('No rides available right now.');
            }
        } catch (error) {
            console.error('Failed to load rides:', error);
            this.showError(error.message || ERROR_MESSAGES.SERVER);
        }
    }

    async handleSearch() {
        const origin = document.getElementById('searchFrom')?.value.trim();
        const destination = document.getElementById('searchTo')?.value.trim();
        const date = document.getElementById('searchDate')?.value;

        const searchParams = {};
        if (origin) searchParams.origin = origin;
        if (destination) searchParams.destination = destination;
        if (date) searchParams.date = date;

        this.showLoading();
        try {
            const response = await RideAPI.getRides(searchParams);
            if (response.success && response.data) {
                this.rides = response.data;
                this.applyFilters();
            } else {
                this.rides = [];
                this.filteredRides = [];
                this.renderRides();
            }
        } catch (error) {
            console.error('Search failed:', error);
            showNotification(error.message || 'Search failed', 'error');
        }
    }

    /* ---- Filter + Sort ---- */

    applyFilters() {
        let filtered = [...this.rides];

        filtered = filtered.filter(r => r.price_per_seat <= this.filters.maxPrice);
        filtered = filtered.filter(r => (r.seats_left || r.seats_remaining || 0) >= this.filters.minSeats);

        const sortBy = document.getElementById('sortBy')?.value || 'time';
        switch (sortBy) {
            case 'price':
                filtered.sort((a, b) => a.price_per_seat - b.price_per_seat);
                break;
            case 'rating':
                filtered.sort((a, b) => (b.driver_rating || 0) - (a.driver_rating || 0));
                break;
            case 'time':
            default:
                filtered.sort((a, b) => new Date(a.departure_time) - new Date(b.departure_time));
                break;
        }

        this.filteredRides = filtered;
        this.renderRides();
    }

    /* ---- Render ---- */

    renderRides() {
        const grid = document.getElementById('ridesGrid');
        const countEl = document.getElementById('ridesCount');
        if (!grid) return;

        if (countEl) {
            countEl.innerHTML = this.filteredRides.length
                ? `Showing <strong>${this.filteredRides.length} ride${this.filteredRides.length > 1 ? 's' : ''}</strong> available`
                : 'No rides found';
        }

        if (this.filteredRides.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <svg class="icon icon-3xl"><use href="assets/icons.svg#icon-search"></use></svg>
                    <h3>No rides found</h3>
                    <p>Try adjusting your search criteria or check back later.</p>
                </div>`;
            return;
        }

        grid.innerHTML = this.filteredRides.map(ride => this.buildRideCard(ride)).join('');
    }

    buildRideCard(ride) {
        const seatsLeft = ride.seats_left || ride.seats_remaining || 0;
        const badgeClass = seatsLeft <= 1 ? 'badge-danger' : 'badge-gold';
        const initials = this.getInitials(ride.driver_name || 'DR');
        const dt = this.formatDateTime(ride.departure_time);

        return `
            <div class="ride-card" data-ride-id="${ride.id}">
                <div class="ride-card-header">
                    <div class="route-display">
                        <span class="route-label">${this.escapeHtml(ride.origin)}</span>
                        <div class="route-line"></div>
                        <span class="route-label">${this.escapeHtml(ride.destination)}</span>
                    </div>
                    <div class="ride-card-header-meta">
                        <span class="ride-card-date">
                            <svg class="icon icon-sm"><use href="assets/icons.svg#icon-calendar"></use></svg>
                            ${dt}
                        </span>
                        <span class="badge ${badgeClass}">${seatsLeft} seat${seatsLeft !== 1 ? 's' : ''} left</span>
                    </div>
                </div>
                <div class="ride-card-body">
                    <div class="ride-card-driver">
                        <div class="avatar avatar-md">${initials}</div>
                        <div class="ride-card-driver-name">
                            <strong>${this.escapeHtml(ride.driver_name || 'Driver')}</strong>
                            ${ride.driver_rating ? `<span class="stars">${this.renderStars(ride.driver_rating)}</span>` : ''}
                        </div>
                    </div>
                    <div class="ride-card-info">
                        <span class="ride-card-info-item">
                            <svg class="icon icon-sm"><use href="assets/icons.svg#icon-clock"></use></svg>
                            ${this.formatTime(ride.departure_time)}
                        </span>
                        <span class="ride-card-info-item">
                            <svg class="icon icon-sm"><use href="assets/icons.svg#icon-car"></use></svg>
                            ${this.escapeHtml(ride.vehicle || '')}
                        </span>
                    </div>
                    <div class="ride-card-price">
                        <span class="price-large-text">KSh ${Number(ride.price_per_seat).toLocaleString()}</span>
                        <span class="price-hint">per seat</span>
                    </div>
                </div>
                <div class="ride-card-footer">
                    <a href="ride-details.html?id=${ride.id}" class="btn btn-primary btn-sm btn-block">View &amp; Book</a>
                </div>
            </div>`;
    }

    /* ---- Helpers ---- */

    getInitials(name) {
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }

    renderStars(rating) {
        const full = Math.floor(rating);
        const half = rating - full >= 0.5 ? 1 : 0;
        return '\u2605'.repeat(full) + (half ? '\u2606' : '') + ` <small>${rating.toFixed(1)}</small>`;
    }

    escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    formatDateTime(dateTimeStr) {
        const date = new Date(dateTimeStr);
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    formatTime(dateTimeStr) {
        const date = new Date(dateTimeStr);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    showLoading() {
        const grid = document.getElementById('ridesGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="empty-state">
                    <svg class="icon icon-3xl spin"><use href="assets/icons.svg#icon-loader"></use></svg>
                    <p>Searching rides&hellip;</p>
                </div>`;
        }
    }

    showEmpty(msg) {
        const grid = document.getElementById('ridesGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="empty-state">
                    <svg class="icon icon-3xl"><use href="assets/icons.svg#icon-search"></use></svg>
                    <h3>No rides yet</h3>
                    <p>${msg}</p>
                </div>`;
        }
    }

    showError(message) {
        const grid = document.getElementById('ridesGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="empty-state">
                    <svg class="icon icon-3xl"><use href="assets/icons.svg#icon-alert-circle"></use></svg>
                    <h3>Something went wrong</h3>
                    <p>${this.escapeHtml(message)}</p>
                    <button class="btn btn-secondary" onclick="findRideManager.loadRides()">Retry</button>
                </div>`;
        }
    }
}

// Initialize when page loads
let findRideManager;
if (window.location.pathname.includes('find-ride.html')) {
    document.addEventListener('DOMContentLoaded', async () => {
        findRideManager = new FindRideManager();
        await findRideManager.init();
    });
}
