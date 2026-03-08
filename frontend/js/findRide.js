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
            maxPrice: APP_CONSTANTS.MAX_PRICE,
        };
    }

    async init() {
        // Require authentication
        if (!authManager.requireAuth()) {
            return;
        }

        this.setupSearchForm();
        this.setupFilters();
        await this.loadRides();
    }

    setupSearchForm() {
        const searchForm = document.getElementById('searchForm');
        if (!searchForm) return;

        searchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSearch();
        });

        // Set minimum date to today
        const dateInput = searchForm.elements['date'];
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.setAttribute('min', today);
        }
    }

    setupFilters() {
        // Price filter
        const priceFilter = document.getElementById('maxPriceFilter');
        const priceDisplay = document.getElementById('priceDisplay');
        if (priceFilter) {
            priceFilter.addEventListener('input', (e) => {
                this.filters.maxPrice = parseFloat(e.target.value);
                if (priceDisplay) priceDisplay.textContent = `$${this.filters.maxPrice}`;
                this.applyFilters();
            });
        }

        // Seats filter
        const seatsFilter = document.getElementById('minSeatsFilter');
        if (seatsFilter) {
            seatsFilter.addEventListener('change', (e) => {
                this.filters.minSeats = parseInt(e.target.value);
                this.applyFilters();
            });
        }

        // Sort options
        const sortSelect = document.getElementById('sortBy');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                this.applyFilters();
            });
        }
    }

    async loadRides() {
        this.showLoading();

        try {
            const response = await RideAPI.getRides({ status: 'active' });
            
            if (response.success && response.data) {
                this.rides = response.data;
                this.filteredRides = [...this.rides];
                this.renderRides();
            } else {
                this.showError('Failed to load rides');
            }
        } catch (error) {
            console.error('Failed to load rides:', error);
            this.showError(error.message || ERROR_MESSAGES.SERVER);
        } finally {
            this.hideLoading();
        }
    }

    async handleSearch() {
        const form = document.getElementById('searchForm');
        const formData = new FormData(form);

        const searchParams = {
            origin: formData.get('origin')?.trim(),
            destination: formData.get('destination')?.trim(),
            date: formData.get('date'),
        };

        // Update filters
        Object.assign(this.filters, searchParams);

        this.showLoading();

        try {
            const response = await RideAPI.searchRides(searchParams);
            
            if (response.success && response.data) {
                this.rides = response.data;
                this.applyFilters();
            } else {
                showNotification('No rides found', 'info');
                this.rides = [];
                this.filteredRides = [];
                this.renderRides();
            }
        } catch (error) {
            console.error('Search failed:', error);
            showNotification(error.message || 'Search failed', 'error');
        } finally {
            this.hideLoading();
        }
    }

    applyFilters() {
        let filtered = [...this.rides];

        // Apply price filter
        filtered = filtered.filter(ride => ride.price_per_seat <= this.filters.maxPrice);

        // Apply seats filter
        filtered = filtered.filter(ride => ride.available_seats >= this.filters.minSeats);

        // Apply sorting
        const sortBy = document.getElementById('sortBy')?.value || 'time';
        
        switch (sortBy) {
            case 'price-low':
                filtered.sort((a, b) => a.price_per_seat - b.price_per_seat);
                break;
            case 'price-high':
                filtered.sort((a, b) => b.price_per_seat - a.price_per_seat);
                break;
            case 'seats':
                filtered.sort((a, b) => b.available_seats - a.available_seats);
                break;
            case 'time':
            default:
                filtered.sort((a, b) => new Date(a.departure_time) - new Date(b.departure_time));
                break;
        }

        this.filteredRides = filtered;
        this.renderRides();
    }

    renderRides() {
        const container = document.getElementById('ridesContainer');
        const countDisplay = document.getElementById('ridesCount');

        if (!container) return;

        // Update count
        if (countDisplay) {
            countDisplay.textContent = `${this.filteredRides.length} ride(s) found`;
        }

        if (this.filteredRides.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="icon-search"></i>
                    <h3>No rides found</h3>
                    <p>Try adjusting your search criteria or check back later</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.filteredRides.map(ride => `
            <div class="ride-card" data-ride-id="${ride.id}">
                <div class="ride-header">
                    <div class="ride-route">
                        <h3>${ride.origin}</h3>
                        <i class="icon-arrow-right"></i>
                        <h3>${ride.destination}</h3>
                    </div>
                    <div class="ride-price-badge">
                        $${ride.price_per_seat}/seat
                    </div>
                </div>
                
                <div class="ride-info">
                    <div class="info-item">
                        <i class="icon-clock"></i>
                        <span>${this.formatDateTime(ride.departure_time)}</span>
                    </div>
                    <div class="info-item">
                        <i class="icon-users"></i>
                        <span>${ride.available_seats} seat(s) available</span>
                    </div>
                    <div class="info-item">
                        <i class="icon-user"></i>
                        <span>Driver: ${ride.driver_name}</span>
                    </div>
                    ${ride.driver_rating ? `
                        <div class="info-item">
                            <i class="icon-star"></i>
                            <span>${ride.driver_rating.toFixed(1)}</span>
                        </div>
                    ` : ''}
                </div>

                ${ride.description ? `
                    <div class="ride-description">
                        <p>${ride.description}</p>
                    </div>
                ` : ''}

                <div class="ride-actions">
                    <button class="btn btn-primary" onclick="findRideManager.bookRide('${ride.id}')">
                        Book Now
                    </button>
                    <button class="btn btn-secondary" onclick="findRideManager.viewDetails('${ride.id}')">
                        View Details
                    </button>
                </div>
            </div>
        `).join('');
    }

    viewDetails(rideId) {
        window.location.href = `/ride-details.html?id=${rideId}`;
    }

    async bookRide(rideId) {
        // Open booking modal or redirect
        const seatsInput = prompt('How many seats do you need?', '1');
        
        if (!seatsInput) return;
        
        const seats = parseInt(seatsInput);
        const ride = this.filteredRides.find(r => r.id === rideId);

        if (!ride) {
            showNotification('Ride not found', 'error');
            return;
        }

        if (seats < 1 || seats > ride.available_seats) {
            showNotification(`Please enter between 1 and ${ride.available_seats} seats`, 'error');
            return;
        }

        try {
            const response = await BookingAPI.createBooking(rideId, { seats });
            
            if (response.success) {
                showNotification(SUCCESS_MESSAGES.BOOKING_CREATED, 'success');
                
                // Redirect to ride details
                setTimeout(() => {
                    window.location.href = `/ride-details.html?id=${rideId}`;
                }, 1500);
            } else {
                showNotification(response.message || 'Booking failed', 'error');
            }
        } catch (error) {
            console.error('Booking failed:', error);
            showNotification(error.message || 'Booking failed', 'error');
        }
    }

    formatDateTime(dateTimeStr) {
        const date = new Date(dateTimeStr);
        const options = {
            weekday: 'short',
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
        const container = document.getElementById('ridesContainer');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="icon-alert"></i>
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button class="btn" onclick="findRideManager.loadRides()">Retry</button>
                </div>
            `;
        }
    }
}

// Initialize when page loads
let findRideManager;

if (window.location.pathname.includes('find-ride.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        findRideManager = new FindRideManager();
        findRideManager.init();
    });
}
