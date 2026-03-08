// Admin Panel Logic - Manage users, rides, and platform statistics

class AdminPanel {
    constructor() {
        this.users = [];
        this.rides = [];
        this.stats = {};
        this.currentView = 'dashboard';
        this.filters = {
            userStatus: 'all',
            rideStatus: 'all',
            searchQuery: '',
        };
    }

    async init() {
        // Require admin authentication
        if (!authManager.requireAdmin()) {
            return;
        }

        this.setupNavigation();
        await this.loadDashboard();
        this.setupEventHandlers();
    }

    setupNavigation() {
        const navButtons = document.querySelectorAll('.admin-nav-btn');
        
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                if (view) {
                    this.switchView(view);
                }
            });
        });
    }

    setupEventHandlers() {
        // Search functionality
        const searchInput = document.getElementById('adminSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.searchQuery = e.target.value.toLowerCase();
                this.applyFilters();
            });
        }

        // Filter dropdowns
        const userStatusFilter = document.getElementById('userStatusFilter');
        if (userStatusFilter) {
            userStatusFilter.addEventListener('change', (e) => {
                this.filters.userStatus = e.target.value;
                this.applyFilters();
            });
        }

        const rideStatusFilter = document.getElementById('rideStatusFilter');
        if (rideStatusFilter) {
            rideStatusFilter.addEventListener('change', (e) => {
                this.filters.rideStatus = e.target.value;
                this.applyFilters();
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshCurrentView();
            });
        }
    }

    async switchView(view) {
        this.currentView = view;

        // Update active nav button
        document.querySelectorAll('.admin-nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === view) {
                btn.classList.add('active');
            }
        });

        // Load appropriate view
        switch (view) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'users':
                await this.loadUsers();
                break;
            case 'rides':
                await this.loadRides();
                break;
            case 'reports':
                await this.loadReports();
                break;
            default:
                console.error('Unknown view:', view);
        }
    }

    async loadDashboard() {
        this.showLoading();

        try {
            const response = await AdminAPI.getStats();
            
            if (response.success && response.data) {
                this.stats = response.data;
                this.renderDashboard();
            } else {
                this.showError('Failed to load dashboard');
            }
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            this.showError(error.message || ERROR_MESSAGES.SERVER);
        } finally {
            this.hideLoading();
        }
    }

    renderDashboard() {
        const container = document.getElementById('adminContent');
        if (!container) return;

        container.innerHTML = `
            <div class="admin-dashboard">
                <h2>Platform Overview</h2>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">👥</div>
                        <div class="stat-value">${this.stats.total_users || 0}</div>
                        <div class="stat-label">Total Users</div>
                        <div class="stat-change ${this.stats.users_change >= 0 ? 'positive' : 'negative'}">
                            ${this.stats.users_change > 0 ? '+' : ''}${this.stats.users_change || 0}% this month
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">🚗</div>
                        <div class="stat-value">${this.stats.total_rides || 0}</div>
                        <div class="stat-label">Total Rides</div>
                        <div class="stat-change ${this.stats.rides_change >= 0 ? 'positive' : 'negative'}">
                            ${this.stats.rides_change > 0 ? '+' : ''}${this.stats.rides_change || 0}% this month
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">📅</div>
                        <div class="stat-value">${this.stats.active_rides || 0}</div>
                        <div class="stat-label">Active Rides</div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">💰</div>
                        <div class="stat-value">$${this.stats.total_revenue || 0}</div>
                        <div class="stat-label">Total Revenue</div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">✅</div>
                        <div class="stat-value">${this.stats.completed_rides || 0}</div>
                        <div class="stat-label">Completed Rides</div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">⭐</div>
                        <div class="stat-value">${this.stats.average_rating?.toFixed(1) || 'N/A'}</div>
                        <div class="stat-label">Average Rating</div>
                    </div>
                </div>

                <div class="dashboard-sections">
                    <div class="dashboard-section">
                        <h3>Recent Activity</h3>
                        <div id="recentActivity">
                            ${this.renderRecentActivity()}
                        </div>
                    </div>

                    <div class="dashboard-section">
                        <h3>Platform Health</h3>
                        <div class="health-metrics">
                            <div class="metric">
                                <span class="metric-label">User Engagement</span>
                                <div class="metric-bar">
                                    <div class="metric-fill" style="width: ${this.stats.user_engagement || 0}%"></div>
                                </div>
                                <span class="metric-value">${this.stats.user_engagement || 0}%</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Ride Completion Rate</span>
                                <div class="metric-bar">
                                    <div class="metric-fill" style="width: ${this.stats.completion_rate || 0}%"></div>
                                </div>
                                <span class="metric-value">${this.stats.completion_rate || 0}%</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Customer Satisfaction</span>
                                <div class="metric-bar">
                                    <div class="metric-fill" style="width: ${(this.stats.average_rating / 5 * 100) || 0}%"></div>
                                </div>
                                <span class="metric-value">${this.stats.average_rating?.toFixed(1) || 'N/A'}/5</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderRecentActivity() {
        if (!this.stats.recent_activity || this.stats.recent_activity.length === 0) {
            return '<p class="empty-state">No recent activity</p>';
        }

        return `
            <div class="activity-list">
                ${this.stats.recent_activity.map(activity => `
                    <div class="activity-item">
                        <div class="activity-icon">${this.getActivityIcon(activity.type)}</div>
                        <div class="activity-details">
                            <p>${activity.description}</p>
                            <span class="activity-time">${this.formatTime(activity.timestamp)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async loadUsers() {
        this.showLoading();

        try {
            const response = await AdminAPI.getAllUsers(this.filters);
            
            if (response.success && response.data) {
                this.users = response.data;
                this.renderUsers();
            } else {
                this.showError('Failed to load users');
            }
        } catch (error) {
            console.error('Failed to load users:', error);
            this.showError(error.message || ERROR_MESSAGES.SERVER);
        } finally {
            this.hideLoading();
        }
    }

    renderUsers() {
        const container = document.getElementById('adminContent');
        if (!container) return;

        container.innerHTML = `
            <div class="admin-users">
                <div class="section-header">
                    <h2>User Management</h2>
                    <div class="section-actions">
                        <input type="text" id="adminSearch" placeholder="Search users..." value="${this.filters.searchQuery}">
                        <select id="userStatusFilter">
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="banned">Banned</option>
                        </select>
                    </div>
                </div>

                <div class="users-table">
                    <table>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>Joined</th>
                                <th>Rides</th>
                                <th>Rating</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.users.map(user => `
                                <tr>
                                    <td>
                                        <div class="user-cell">
                                            <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
                                            <span>${user.name}</span>
                                        </div>
                                    </td>
                                    <td>${user.email}</td>
                                    <td>${this.formatDate(user.created_at)}</td>
                                    <td>${user.total_rides || 0}</td>
                                    <td>
                                        ${user.rating ? `
                                            <span class="rating">⭐ ${user.rating.toFixed(1)}</span>
                                        ` : 'N/A'}
                                    </td>
                                    <td>
                                        <span class="status-badge status-${user.status || 'active'}">
                                            ${user.status || 'active'}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="btn-icon" onclick="adminPanel.viewUser('${user.id}')" title="View">
                                                👁️
                                            </button>
                                            <button class="btn-icon" onclick="adminPanel.moderateUser('${user.id}')" title="Moderate">
                                                ⚙️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this.setupEventHandlers();
    }

    async loadRides() {
        this.showLoading();

        try {
            const response = await AdminAPI.getAllRides(this.filters);
            
            if (response.success && response.data) {
                this.rides = response.data;
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

    renderRides() {
        const container = document.getElementById('adminContent');
        if (!container) return;

        container.innerHTML = `
            <div class="admin-rides">
                <div class="section-header">
                    <h2>Ride Management</h2>
                    <div class="section-actions">
                        <input type="text" id="adminSearch" placeholder="Search rides..." value="${this.filters.searchQuery}">
                        <select id="rideStatusFilter">
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                <div class="rides-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Route</th>
                                <th>Driver</th>
                                <th>Date</th>
                                <th>Seats</th>
                                <th>Price</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.rides.map(ride => `
                                <tr>
                                    <td>
                                        <div class="route-cell">
                                            ${ride.origin} → ${ride.destination}
                                        </div>
                                    </td>
                                    <td>${ride.driver_name}</td>
                                    <td>${this.formatDate(ride.departure_time)}</td>
                                    <td>${ride.available_seats}/${ride.total_seats}</td>
                                    <td>$${ride.price_per_seat}</td>
                                    <td>
                                        <span class="status-badge status-${ride.status}">
                                            ${ride.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="btn-icon" onclick="adminPanel.viewRide('${ride.id}')" title="View">
                                                👁️
                                            </button>
                                            <button class="btn-icon" onclick="adminPanel.moderateRide('${ride.id}')" title="Moderate">
                                                ⚙️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this.setupEventHandlers();
    }

    async loadReports() {
        const container = document.getElementById('adminContent');
        if (container) {
            container.innerHTML = `
                <div class="admin-reports">
                    <h2>Reports & Analytics</h2>
                    <p>Reports and analytics features coming soon...</p>
                </div>
            `;
        }
    }

    applyFilters() {
        if (this.currentView === 'users') {
            this.renderUsers();
        } else if (this.currentView === 'rides') {
            this.renderRides();
        }
    }

    async refreshCurrentView() {
        switch (this.currentView) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'users':
                await this.loadUsers();
                break;
            case 'rides':
                await this.loadRides();
                break;
            case 'reports':
                await this.loadReports();
                break;
        }
    }

    viewUser(userId) {
        // Open user details modal or navigate
        window.open(`/profile.html?id=${userId}`, '_blank');
    }

    async moderateUser(userId) {
        const action = prompt('Enter action (suspend/unsuspend/ban/unban):');
        if (!action) return;

        const reason = prompt('Enter reason for moderation:');
        if (!reason) return;

        try {
            const response = await AdminAPI.moderateUser(userId, action, reason);
            
            if (response.success) {
                showNotification('User moderated successfully', 'success');
                await this.loadUsers();
            } else {
                showNotification(response.message || 'Moderation failed', 'error');
            }
        } catch (error) {
            console.error('Moderation failed:', error);
            showNotification(error.message || 'Moderation failed', 'error');
        }
    }

    viewRide(rideId) {
        window.open(`/ride-details.html?id=${rideId}`, '_blank');
    }

    async moderateRide(rideId) {
        const action = prompt('Enter action (approve/cancel/delete):');
        if (!action) return;

        const reason = prompt('Enter reason for moderation:');
        if (!reason) return;

        try {
            const response = await AdminAPI.moderateRide(rideId, action, reason);
            
            if (response.success) {
                showNotification('Ride moderated successfully', 'success');
                await this.loadRides();
            } else {
                showNotification(response.message || 'Moderation failed', 'error');
            }
        } catch (error) {
            console.error('Moderation failed:', error);
            showNotification(error.message || 'Moderation failed', 'error');
        }
    }

    getActivityIcon(type) {
        const icons = {
            user_registered: '👤',
            ride_created: '🚗',
            ride_completed: '✅',
            booking_made: '📅',
            rating_submitted: '⭐',
        };
        return icons[type] || '📌';
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInMs = now - date;
        const diffInMinutes = Math.floor(diffInMs / 60000);
        
        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;
        
        return this.formatDate(timestamp);
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
        const container = document.getElementById('adminContent');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="icon-alert"></i>
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button class="btn" onclick="adminPanel.refreshCurrentView()">Retry</button>
                </div>
            `;
        }
        this.hideLoading();
    }
}

// Initialize admin panel when page loads
let adminPanel;

if (window.location.pathname.includes('admin.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        adminPanel = new AdminPanel();
        adminPanel.init();
    });
}
