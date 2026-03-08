// Profile Logic - User profile management

class ProfileManager {
    constructor() {
        this.profile = null;
        this.ratings = [];
        this.isEditMode = false;
    }

    async init() {
        // Require authentication
        if (!authManager.requireAuth()) {
            return;
        }

        await this.loadProfile();
        await this.loadRatings();
        this.setupForm();
    }

    async loadProfile() {
        this.showLoading();

        try {
            const response = await UserAPI.getProfile();
            
            if (response.success && response.data) {
                this.profile = response.data;
                this.renderProfile();
            } else {
                this.showError('Failed to load profile');
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
            this.showError(error.message || ERROR_MESSAGES.SERVER);
        } finally {
            this.hideLoading();
        }
    }

    async loadRatings() {
        try {
            if (authManager.currentUser) {
                const response = await UserAPI.getRatings(authManager.currentUser.id);
                
                if (response.success && response.data) {
                    this.ratings = response.data;
                    this.renderRatings();
                }
            }
        } catch (error) {
            console.error('Failed to load ratings:', error);
        }
    }

    renderProfile() {
        const container = document.getElementById('profileContainer');
        if (!container) return;

        const avgRating = this.profile.rating || 0;
        const totalRides = this.profile.rides_as_driver || 0;
        const totalBookings = this.profile.rides_as_passenger || 0;

        container.innerHTML = `
            <div class="profile-header">
                <div class="profile-avatar">
                    ${this.profile.name.charAt(0).toUpperCase()}
                </div>
                <div class="profile-info">
                    <h1>${this.profile.name}</h1>
                    <p>${this.profile.email}</p>
                    ${avgRating > 0 ? `
                        <div class="rating">
                            <i class="icon-star"></i>
                            ${avgRating.toFixed(1)} (${totalRides + totalBookings} rides)
                        </div>
                    ` : ''}
                </div>
                <button class="btn btn-secondary" onclick="profileManager.toggleEditMode()">
                    <i class="icon-edit"></i> Edit Profile
                </button>
            </div>

            <div class="profile-stats">
                <div class="stat-card">
                    <div class="stat-value">${totalRides}</div>
                    <div class="stat-label">Rides Offered</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalBookings}</div>
                    <div class="stat-label">Rides Taken</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${avgRating.toFixed(1)}</div>
                    <div class="stat-label">Average Rating</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.profile.member_since ? this.getMemberDuration() : 'New'}</div>
                    <div class="stat-label">Member Since</div>
                </div>
            </div>

            <div id="profileEditForm" style="display: none;">
                <form id="updateProfileForm">
                    <div class="form-section">
                        <h3>Personal Information</h3>
                        
                        <div class="form-group">
                            <label for="name">Full Name*</label>
                            <input type="text" id="name" name="name" value="${this.profile.name}" required>
                        </div>

                        <div class="form-group">
                            <label for="email">Email*</label>
                            <input type="email" id="email" name="email" value="${this.profile.email}" required>
                        </div>

                        <div class="form-group">
                            <label for="phone">Phone Number</label>
                            <input type="tel" id="phone" name="phone" value="${this.profile.phone || ''}">
                        </div>

                        <div class="form-group">
                            <label for="studentId">Student ID</label>
                            <input type="text" id="studentId" name="studentId" value="${this.profile.student_id || ''}">
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>About</h3>
                        
                        <div class="form-group">
                            <label for="bio">Bio</label>
                            <textarea id="bio" name="bio" rows="4">${this.profile.bio || ''}</textarea>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>Vehicle Information (Optional)</h3>
                        
                        <div class="form-group">
                            <label for="vehicleMake">Make</label>
                            <input type="text" id="vehicleMake" name="vehicleMake" value="${this.profile.vehicle_make || ''}">
                        </div>

                        <div class="form-group">
                            <label for="vehicleModel">Model</label>
                            <input type="text" id="vehicleModel" name="vehicleModel" value="${this.profile.vehicle_model || ''}">
                        </div>

                        <div class="form-group">
                            <label for="vehicleColor">Color</label>
                            <input type="text" id="vehicleColor" name="vehicleColor" value="${this.profile.vehicle_color || ''}">
                        </div>

                        <div class="form-group">
                            <label for="vehiclePlate">License Plate</label>
                            <input type="text" id="vehiclePlate" name="vehiclePlate" value="${this.profile.vehicle_plate || ''}">
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                        <button type="button" class="btn btn-secondary" onclick="profileManager.toggleEditMode()">
                            Cancel
                        </button>
                    </div>

                    <div id="updateError" class="error-message"></div>
                </form>
            </div>

            <div class="profile-details">
                <div class="detail-item">
                    <strong>Phone:</strong>
                    <span>${this.profile.phone || 'Not provided'}</span>
                </div>
                <div class="detail-item">
                    <strong>Student ID:</strong>
                    <span>${this.profile.student_id || 'Not provided'}</span>
                </div>
                ${this.profile.bio ? `
                    <div class="detail-item">
                        <strong>Bio:</strong>
                        <p>${this.profile.bio}</p>
                    </div>
                ` : ''}
                ${this.profile.vehicle_make ? `
                    <div class="detail-item">
                        <strong>Vehicle:</strong>
                        <span>${this.profile.vehicle_make} ${this.profile.vehicle_model || ''} ${this.profile.vehicle_color || ''}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderRatings() {
        const container = document.getElementById('ratingsContainer');
        if (!container) return;

        if (this.ratings.length === 0) {
            container.innerHTML = `
                <div class="info-section">
                    <h3>Reviews</h3>
                    <p class="empty-state">No reviews yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="info-section">
                <h3>Reviews (${this.ratings.length})</h3>
                <div class="ratings-list">
                    ${this.ratings.map(rating => `
                        <div class="rating-item">
                            <div class="rating-header">
                                <div class="rating-stars">
                                    ${this.renderStars(rating.rating)}
                                </div>
                                <span class="rating-date">${this.formatDate(rating.created_at)}</span>
                            </div>
                            <p class="rating-comment">${rating.comment || ''}</p>
                            <div class="rating-ride">
                                <small>${rating.ride_origin} → ${rating.ride_destination}</small>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    setupForm() {
        const form = document.getElementById('updateProfileForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleUpdateProfile();
        });
    }

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        const editForm = document.getElementById('profileEditForm');
        const profileDetails = document.querySelector('.profile-details');
        
        if (editForm) {
            editForm.style.display = this.isEditMode ? 'block' : 'none';
        }
        if (profileDetails) {
            profileDetails.style.display = this.isEditMode ? 'none' : 'block';
        }
    }

    async handleUpdateProfile() {
        const form = document.getElementById('updateProfileForm');
        const errorMessage = document.getElementById('updateError');
        
        if (errorMessage) errorMessage.textContent = '';

        const formData = new FormData(form);
        const profileData = {
            name: formData.get('name').trim(),
            email: formData.get('email').trim(),
            phone: formData.get('phone').trim(),
            student_id: formData.get('studentId').trim(),
            bio: formData.get('bio').trim(),
            vehicle_make: formData.get('vehicleMake').trim(),
            vehicle_model: formData.get('vehicleModel').trim(),
            vehicle_color: formData.get('vehicleColor').trim(),
            vehicle_plate: formData.get('vehiclePlate').trim(),
        };

        try {
            const response = await UserAPI.updateProfile(profileData);
            
            if (response.success) {
                showNotification(SUCCESS_MESSAGES.PROFILE_UPDATED, 'success');
                
                // Update stored user data
                if (response.data) {
                    authManager.saveAuthData(localStorage.getItem(STORAGE_KEYS.TOKEN), response.data);
                }
                
                await this.loadProfile();
                this.toggleEditMode();
            } else {
                if (errorMessage) errorMessage.textContent = response.message || 'Failed to update profile';
            }
        } catch (error) {
            console.error('Failed to update profile:', error);
            if (errorMessage) errorMessage.textContent = error.message || ERROR_MESSAGES.SERVER;
        }
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let stars = '';
        
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars += '<i class="icon-star-full"></i>';
            } else if (i === fullStars && hasHalfStar) {
                stars += '<i class="icon-star-half"></i>';
            } else {
                stars += '<i class="icon-star-empty"></i>';
            }
        }
        
        return stars;
    }

    getMemberDuration() {
        if (!this.profile.member_since) return 'New';
        
        const memberDate = new Date(this.profile.member_since);
        const now = new Date();
        const months = Math.floor((now - memberDate) / (1000 * 60 * 60 * 24 * 30));
        
        if (months < 1) return 'New';
        if (months < 12) return `${months} month${months > 1 ? 's' : ''}`;
        
        const years = Math.floor(months / 12);
        return `${years} year${years > 1 ? 's' : ''}`;
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
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
        const container = document.getElementById('profileContainer');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="icon-alert"></i>
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button class="btn" onclick="profileManager.loadProfile()">Retry</button>
                </div>
            `;
        }
        this.hideLoading();
    }
}

// Initialize when page loads
let profileManager;

if (window.location.pathname.includes('profile.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        profileManager = new ProfileManager();
        profileManager.init();
    });
}
