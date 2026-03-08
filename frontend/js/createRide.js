// Create Ride Logic - Handles ride creation and editing

class CreateRideManager {
    constructor() {
        this.isEditMode = false;
        this.rideId = null;
        this.rideData = null;
        this.originCoords = null;
        this.destinationCoords = null;
    }

    async init() {
        // Require authentication
        if (!authManager.requireAuth()) {
            return;
        }

        // Check if editing existing ride
        const urlParams = new URLSearchParams(window.location.search);
        this.rideId = urlParams.get('id');
        this.isEditMode = urlParams.get('edit') === 'true' && this.rideId;

        if (this.isEditMode) {
            await this.loadRideData();
        }

        this.setupForm();
        this.setupMapPickers();
    }

    async loadRideData() {
        try {
            const response = await RideAPI.getRide(this.rideId);
            
            if (response.success && response.data) {
                this.rideData = response.data;
                this.populateForm();
            } else {
                showNotification('Failed to load ride data', 'error');
                window.location.href = '/dashboard.html';
            }
        } catch (error) {
            console.error('Failed to load ride:', error);
            showNotification('Failed to load ride data', 'error');
            window.location.href = '/dashboard.html';
        }
    }

    populateForm() {
        if (!this.rideData) return;

        const form = document.getElementById('createRideForm');
        if (!form) return;

        // Update page title
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) pageTitle.textContent = 'Edit Ride';

        // Populate form fields
        const fields = {
            origin: this.rideData.origin,
            destination: this.rideData.destination,
            departureDate: this.rideData.departure_time.split('T')[0],
            departureTime: this.rideData.departure_time.split('T')[1].substring(0, 5),
            totalSeats: this.rideData.total_seats,
            pricePerSeat: this.rideData.price_per_seat,
            description: this.rideData.description || '',
        };

        Object.keys(fields).forEach(key => {
            const input = form.elements[key];
            if (input) input.value = fields[key];
        });

        // Store coordinates
        this.originCoords = {
            lat: this.rideData.origin_lat,
            lng: this.rideData.origin_lng,
        };
        this.destinationCoords = {
            lat: this.rideData.destination_lat,
            lng: this.rideData.destination_lng,
        };
    }

    setupForm() {
        const form = document.getElementById('createRideForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSubmit();
        });

        // Set minimum date to today
        const dateInput = form.elements['departureDate'];
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.setAttribute('min', today);
        }

        // Real-time validation
        const seatsInput = form.elements['totalSeats'];
        if (seatsInput) {
            seatsInput.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                if (value < 1) e.target.value = 1;
                if (value > APP_CONSTANTS.MAX_PASSENGERS) e.target.value = APP_CONSTANTS.MAX_PASSENGERS;
            });
        }

        const priceInput = form.elements['pricePerSeat'];
        if (priceInput) {
            priceInput.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (value < APP_CONSTANTS.MIN_PRICE) e.target.value = APP_CONSTANTS.MIN_PRICE;
                if (value > APP_CONSTANTS.MAX_PRICE) e.target.value = APP_CONSTANTS.MAX_PRICE;
            });
        }
    }

    setupMapPickers() {
        // Setup origin map picker
        const originBtn = document.getElementById('selectOriginBtn');
        if (originBtn) {
            originBtn.addEventListener('click', () => {
                this.openMapPicker('origin');
            });
        }

        // Setup destination map picker
        const destinationBtn = document.getElementById('selectDestinationBtn');
        if (destinationBtn) {
            destinationBtn.addEventListener('click', () => {
                this.openMapPicker('destination');
            });
        }
    }

    openMapPicker(type) {
        // This would open a map modal to select location
        // For now, we'll use geocoding from the address input
        const form = document.getElementById('createRideForm');
        const address = form.elements[type]?.value;

        if (!address) {
            showNotification(`Please enter ${type} address first`, 'error');
            return;
        }

        // Use geocoding service (would be implemented with map.js)
        if (window.mapManager) {
            window.mapManager.geocodeAddress(address, (coords) => {
                if (type === 'origin') {
                    this.originCoords = coords;
                } else {
                    this.destinationCoords = coords;
                }
                showNotification(`${type} location set`, 'success');
            });
        }
    }

    async handleSubmit() {
        const form = document.getElementById('createRideForm');
        const submitBtn = document.getElementById('submitBtn');
        const errorMessage = document.getElementById('errorMessage');

        // Clear previous errors
        if (errorMessage) errorMessage.textContent = '';

        // Get form data
        const formData = new FormData(form);
        const rideData = {
            origin: formData.get('origin').trim(),
            destination: formData.get('destination').trim(),
            departure_time: `${formData.get('departureDate')}T${formData.get('departureTime')}:00`,
            total_seats: parseInt(formData.get('totalSeats')),
            price_per_seat: parseFloat(formData.get('pricePerSeat')),
            description: formData.get('description')?.trim() || '',
            vehicle_info: formData.get('vehicleInfo')?.trim() || '',
        };

        // Add coordinates if available
        if (this.originCoords) {
            rideData.origin_lat = this.originCoords.lat;
            rideData.origin_lng = this.originCoords.lng;
        }
        if (this.destinationCoords) {
            rideData.destination_lat = this.destinationCoords.lat;
            rideData.destination_lng = this.destinationCoords.lng;
        }

        // Validate
        const validation = this.validateRideData(rideData);
        if (!validation.valid) {
            if (errorMessage) errorMessage.textContent = validation.message;
            return;
        }

        // Disable submit button
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = this.isEditMode ? 'Updating...' : 'Creating...';
        }

        try {
            let response;
            if (this.isEditMode) {
                response = await RideAPI.updateRide(this.rideId, rideData);
            } else {
                response = await RideAPI.createRide(rideData);
            }

            if (response.success) {
                const message = this.isEditMode ? SUCCESS_MESSAGES.RIDE_UPDATED : SUCCESS_MESSAGES.RIDE_CREATED;
                showNotification(message, 'success');
                
                // Redirect to ride details or dashboard
                setTimeout(() => {
                    if (response.data && response.data.id) {
                        window.location.href = `/ride-details.html?id=${response.data.id}`;
                    } else {
                        window.location.href = '/dashboard.html';
                    }
                }, 1000);
            } else {
                if (errorMessage) errorMessage.textContent = response.message || 'Failed to save ride';
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = this.isEditMode ? 'Update Ride' : 'Create Ride';
                }
            }
        } catch (error) {
            console.error('Failed to save ride:', error);
            if (errorMessage) errorMessage.textContent = error.message || ERROR_MESSAGES.SERVER;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = this.isEditMode ? 'Update Ride' : 'Create Ride';
            }
        }
    }

    validateRideData(data) {
        // Check required fields
        if (!data.origin || !data.destination) {
            return { valid: false, message: 'Please enter origin and destination' };
        }

        if (data.origin === data.destination) {
            return { valid: false, message: 'Origin and destination cannot be the same' };
        }

        if (!data.departure_time) {
            return { valid: false, message: 'Please select departure date and time' };
        }

        // Check if departure time is in the future
        const departureDate = new Date(data.departure_time);
        const now = new Date();
        if (departureDate <= now) {
            return { valid: false, message: 'Departure time must be in the future' };
        }

        // Validate seats
        if (data.total_seats < 1 || data.total_seats > APP_CONSTANTS.MAX_PASSENGERS) {
            return { valid: false, message: `Seats must be between 1 and ${APP_CONSTANTS.MAX_PASSENGERS}` };
        }

        // Validate price
        if (data.price_per_seat < APP_CONSTANTS.MIN_PRICE || data.price_per_seat > APP_CONSTANTS.MAX_PRICE) {
            return { valid: false, message: `Price must be between $${APP_CONSTANTS.MIN_PRICE} and $${APP_CONSTANTS.MAX_PRICE}` };
        }

        return { valid: true };
    }
}

// Initialize when page loads
let createRideManager;

if (window.location.pathname.includes('create-ride.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        createRideManager = new CreateRideManager();
        createRideManager.init();
    });
}
