// Create Ride Logic - Handles ride creation with step wizard

class CreateRideManager {
    constructor() {
        this.currentStep = 1;
    }

    init() {
        if (!authManager.requireAuth()) return;
        initNavToggle();
        initNavAvatar();
        initLogoutLinks();

        this.initWizard();
        this.initEarningsCalculator();

        const submitBtn = document.getElementById('submitRide');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.handleSubmit());
        }

        // Set minimum date to today
        const dateInput = document.getElementById('departureDate');
        if (dateInput) {
            dateInput.setAttribute('min', new Date().toISOString().split('T')[0]);
        }
    }

    /* ---- Step Wizard ---- */

    initWizard() {
        document.getElementById('toStep2')?.addEventListener('click', () => {
            const pickup = document.getElementById('pickupLocation')?.value.trim();
            const dropoff = document.getElementById('dropoffLocation')?.value.trim();
            if (!pickup || !dropoff) {
                showNotification('Please enter pickup and drop-off locations.', 'error');
                return;
            }
            this.goToStep(2);
        });
        document.getElementById('toStep3')?.addEventListener('click', () => {
            const date = document.getElementById('departureDate')?.value;
            const time = document.getElementById('departureTime')?.value;
            const seats = document.getElementById('availableSeats')?.value;
            if (!date || !time) {
                showNotification('Please select departure date and time.', 'error');
                return;
            }
            if (!seats) {
                showNotification('Please select available seats.', 'error');
                return;
            }
            this.goToStep(3);
            this.populateSummary();
        });
        document.getElementById('backToStep1')?.addEventListener('click', () => this.goToStep(1));
        document.getElementById('backToStep2')?.addEventListener('click', () => this.goToStep(2));
    }

    goToStep(step) {
        // Hide all steps
        for (let i = 1; i <= 3; i++) {
            const panel = document.getElementById('step' + i);
            if (panel) panel.classList.toggle('hidden', i !== step);
        }
        // Update wizard circles & labels
        for (let i = 1; i <= 3; i++) {
            const circle = document.getElementById('step' + i + 'circle');
            const label = document.getElementById('step' + i + 'label');
            if (circle) circle.classList.toggle('active', i <= step);
            if (label) label.classList.toggle('active', i <= step);
        }
        this.currentStep = step;
    }

    /* ---- Earnings Calculator ---- */

    initEarningsCalculator() {
        const priceInput = document.getElementById('pricePerSeat');
        const seatsSelect = document.getElementById('availableSeats');
        const update = () => {
            const price = Number(priceInput?.value) || 0;
            const seats = Number(seatsSelect?.value) || 0;
            const display = document.getElementById('earningsDisplay');
            if (display) display.textContent = 'KSh ' + (price * seats).toLocaleString();
        };
        priceInput?.addEventListener('input', update);
        seatsSelect?.addEventListener('change', update);
    }

    /* ---- Summary ---- */

    populateSummary() {
        const from = document.getElementById('pickupLocation')?.value || 'Not set';
        const to = document.getElementById('dropoffLocation')?.value || 'Not set';
        const date = document.getElementById('departureDate')?.value || 'Not set';
        const time = document.getElementById('departureTime')?.value || 'Not set';
        const seats = document.getElementById('availableSeats')?.value || '\u2014';
        const price = document.getElementById('pricePerSeat')?.value;

        const el = (id, text) => { const e = document.getElementById(id); if (e) e.textContent = text; };
        el('summaryRoute', from + ' \u2192 ' + to);
        el('summaryDateTime', date + ' \u00b7 ' + time);
        el('summarySeats', seats + ' seats');
        if (price) el('summaryPrice', 'KSh ' + Number(price).toLocaleString());
    }

    /* ---- Submit ---- */

    async handleSubmit() {
        const submitBtn = document.getElementById('submitRide');

        const origin = document.getElementById('pickupLocation')?.value.trim();
        const destination = document.getElementById('dropoffLocation')?.value.trim();
        const departureDate = document.getElementById('departureDate')?.value;
        const departureTime = document.getElementById('departureTime')?.value;
        const availableSeats = document.getElementById('availableSeats')?.value;
        const pricePerSeat = document.getElementById('pricePerSeat')?.value;
        const notes = document.getElementById('rideNotes')?.value.trim() || '';

        if (!origin || !destination) {
            showNotification('Please enter pickup and drop-off locations.', 'error');
            return;
        }
        if (!departureDate || !departureTime) {
            showNotification('Please select departure date and time.', 'error');
            return;
        }
        if (!availableSeats) {
            showNotification('Please select available seats.', 'error');
            return;
        }
        if (!pricePerSeat) {
            showNotification('Please enter a price per seat.', 'error');
            return;
        }

        const departureISO = `${departureDate}T${departureTime}:00`;
        if (new Date(departureISO) <= new Date()) {
            showNotification('Departure time must be in the future.', 'error');
            return;
        }

        const rideData = {
            origin,
            destination,
            departure_time: departureISO,
            available_seats: parseInt(availableSeats),
            price_per_seat: parseFloat(pricePerSeat),
            notes: notes || undefined,
        };

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Posting\u2026';
        }

        try {
            const response = await RideAPI.createRide(rideData);

            if (response.success) {
                showNotification(SUCCESS_MESSAGES.RIDE_CREATED, 'success');
                setTimeout(() => {
                    if (response.data && response.data.id) {
                        window.location.href = `ride-details.html?id=${response.data.id}`;
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                }, 1000);
            } else {
                showNotification(response.message || 'Failed to create ride.', 'error');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Post My Ride'; }
            }
        } catch (error) {
            showNotification(error.message || ERROR_MESSAGES.SERVER, 'error');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Post My Ride'; }
        }
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
