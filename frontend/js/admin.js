// Admin Panel — Manage users, rides, and platform statistics

class AdminPanel {
    constructor() {
        this.users = [];
        this.rides = [];
        this.stats = {};
        this.activeTab = 'Users';
        this.usersPage = 1;
        this.ridesPage = 1;
        this.pageSize = 20;
    }

    async init() {
        if (!(await authManager.requireAdmin())) return;

        this.setupTabs();
        this.setupFilters();
        await this.loadStats();
        await this.loadUsers();
    }

    /* ─── Tabs ─── */

    setupTabs() {
        const tabs = {
            tabUsers: 'panelUsers',
            tabRides: 'panelRides',
            tabReports: 'panelReports',
            tabVerifications: 'panelVerifications',
        };

        Object.entries(tabs).forEach(([btnId, panelId]) => {
            const btn = document.getElementById(btnId);
            if (!btn) return;
            btn.addEventListener('click', () => {
                // deactivate all
                Object.entries(tabs).forEach(([bId, pId]) => {
                    document.getElementById(bId).classList.remove('active');
                    document.getElementById(pId).classList.add('hidden');
                });
                btn.classList.add('active');
                document.getElementById(panelId).classList.remove('hidden');

                const label = btnId.replace('tab', '');
                this.activeTab = label;
                this.onTabActivated(label);
            });
        });
    }

    async onTabActivated(label) {
        switch (label) {
            case 'Users':
                if (!this.users.length) await this.loadUsers();
                break;
            case 'Rides':
                if (!this.rides.length) await this.loadRides();
                break;
            case 'Reports':
                this.renderReportsPlaceholder();
                break;
            case 'Verifications':
                this.renderVerificationsPlaceholder();
                break;
        }
    }

    /* ─── Filters & Search ─── */

    setupFilters() {
        const userSearch = document.getElementById('userSearch');
        if (userSearch) {
            userSearch.addEventListener('input', () => {
                this.usersPage = 1;
                this.renderUsers();
            });
        }

        const userRoleFilter = document.getElementById('userRoleFilter');
        if (userRoleFilter) {
            userRoleFilter.addEventListener('change', () => {
                this.usersPage = 1;
                this.renderUsers();
            });
        }

        const rideStatusFilter = document.getElementById('rideStatusFilter');
        if (rideStatusFilter) {
            rideStatusFilter.addEventListener('change', () => {
                this.ridesPage = 1;
                this.renderRides();
            });
        }

        // Pagination buttons
        this.wire('usersPrev', 'click', () => { if (this.usersPage > 1) { this.usersPage--; this.renderUsers(); } });
        this.wire('usersNext', 'click', () => { this.usersPage++; this.renderUsers(); });
        this.wire('ridesPrev', 'click', () => { if (this.ridesPage > 1) { this.ridesPage--; this.renderRides(); } });
        this.wire('ridesNext', 'click', () => { this.ridesPage++; this.renderRides(); });
    }

    wire(id, event, handler) {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
    }

    /* ─── Stats ─── */

    async loadStats() {
        try {
            const res = await AdminAPI.getStats();
            if (res.success && res.data) {
                this.stats = res.data;
                this.renderStats();
            }
        } catch (err) {
            console.error('Failed to load stats:', err);
        }
    }

    renderStats() {
        const s = this.stats;
        this.setText('statUsers', s.total_users ?? '–');
        this.setText('statActiveRides', s.active_rides ?? '–');
        this.setText('statCompleted', s.completed_rides ?? '–');
        this.setText('statReports', s.pending_reports ?? '–');

        this.setChange('statUsersChange', s.users_change);
        this.setChange('statRidesChange', s.rides_change);
        this.setChange('statCompletedChange', s.completed_change);
        this.setChange('statReportsChange', s.reports_change);
    }

    setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    setChange(id, value) {
        const el = document.getElementById(id);
        if (!el || value == null) return;
        const up = value >= 0;
        el.classList.remove('up', 'down');
        el.classList.add(up ? 'up' : 'down');
        el.textContent = `${up ? '+' : ''}${value}% this month`;
    }

    /* ─── Users ─── */

    async loadUsers() {
        try {
            const res = await AdminAPI.getUsers();
            if (res.success && res.data) {
                this.users = Array.isArray(res.data) ? res.data : [];
                this.renderUsers();
            }
        } catch (err) {
            console.error('Failed to load users:', err);
            showNotification(err.message || ERROR_MESSAGES.SERVER, 'error');
        }
    }

    getFilteredUsers() {
        let list = this.users;
        const q = (document.getElementById('userSearch')?.value || '').toLowerCase();
        const role = document.getElementById('userRoleFilter')?.value || '';

        if (q) {
            list = list.filter(u =>
                (u.full_name || '').toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q)
            );
        }
        if (role) {
            list = list.filter(u => u.role === role);
        }
        return list;
    }

    renderUsers() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        const filtered = this.getFilteredUsers();
        const start = (this.usersPage - 1) * this.pageSize;
        const page = filtered.slice(start, start + this.pageSize);

        if (!page.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No users found</td></tr>`;
        } else {
            tbody.innerHTML = page.map(u => `
                <tr>
                    <td>
                        <div class="table-user-cell">
                            <div class="avatar avatar-sm">${this.getInitials(u.full_name)}</div>
                            <span>${this.esc(u.full_name || 'Unknown')}</span>
                        </div>
                    </td>
                    <td>${this.esc(u.email)}</td>
                    <td><span class="badge badge-${u.role === 'admin' ? 'danger' : u.role === 'driver' ? 'gold' : 'info'}">${this.esc(u.role || 'rider')}</span></td>
                    <td>${this.formatDate(u.created_at)}</td>
                    <td><span class="badge badge-${u.is_active ? 'success' : 'danger'}">${u.is_active ? 'Active' : 'Disabled'}</span></td>
                    <td>
                        <div class="table-actions">
                            <button class="btn btn-sm btn-ghost" data-action="view-user" data-id="${u.id}" title="View profile">
                                <svg class="icon icon-sm"><use href="assets/icons.svg#icon-eye"></use></svg>
                            </button>
                            <button class="btn btn-sm btn-ghost" data-action="toggle-user" data-id="${u.id}" title="Toggle status">
                                <svg class="icon icon-sm"><use href="assets/icons.svg#icon-settings"></use></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        // Pagination info
        this.setText('usersCount', `Showing ${start + 1}–${Math.min(start + this.pageSize, filtered.length)} of ${filtered.length}`);

        // Delegate action clicks
        tbody.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                const id = e.currentTarget.dataset.id;
                if (action === 'view-user') this.viewUser(id);
                if (action === 'toggle-user') this.toggleUser(id);
            });
        });
    }

    viewUser(userId) {
        window.open(`profile.html?id=${userId}`, '_blank');
    }

    async toggleUser(userId) {
        if (!confirm('Toggle this user\'s active status?')) return;

        try {
            const res = await AdminAPI.toggleUser(userId);
            if (res.success) {
                showNotification('User status updated', 'success');
                await this.loadUsers();
            } else {
                showNotification(res.message || 'Action failed', 'error');
            }
        } catch (err) {
            console.error('Toggle user failed:', err);
            showNotification(err.message || ERROR_MESSAGES.SERVER, 'error');
        }
    }

    /* ─── Rides ─── */

    async loadRides() {
        try {
            const res = await AdminAPI.getRides();
            if (res.success && res.data) {
                this.rides = Array.isArray(res.data) ? res.data : [];
                this.renderRides();
            }
        } catch (err) {
            console.error('Failed to load rides:', err);
            showNotification(err.message || ERROR_MESSAGES.SERVER, 'error');
        }
    }

    getFilteredRides() {
        let list = this.rides;
        const status = document.getElementById('rideStatusFilter')?.value || '';
        if (status) {
            list = list.filter(r => r.status === status);
        }
        return list;
    }

    renderRides() {
        const tbody = document.getElementById('ridesTableBody');
        if (!tbody) return;

        const filtered = this.getFilteredRides();
        const start = (this.ridesPage - 1) * this.pageSize;
        const page = filtered.slice(start, start + this.pageSize);

        if (!page.length) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No rides found</td></tr>`;
        } else {
            tbody.innerHTML = page.map(r => `
                <tr>
                    <td>${this.esc(r.origin)} &rarr; ${this.esc(r.destination)}</td>
                    <td>${this.esc(r.driver_name || '–')}</td>
                    <td>${this.formatDate(r.departure_time)}</td>
                    <td>${r.seats_remaining ?? 0}/${r.seats_total ?? 0}</td>
                    <td>$${Number(r.price_per_seat || 0).toFixed(2)}</td>
                    <td><span class="badge badge-${this.rideStatusBadge(r.status)}">${this.esc(r.status)}</span></td>
                    <td>
                        <div class="table-actions">
                            <button class="btn btn-sm btn-ghost" data-action="view-ride" data-id="${r.id}" title="View ride">
                                <svg class="icon icon-sm"><use href="assets/icons.svg#icon-eye"></use></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        this.setText('ridesCount', `Showing ${start + 1}–${Math.min(start + this.pageSize, filtered.length)} of ${filtered.length}`);

        tbody.querySelectorAll('[data-action="view-ride"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                window.open(`ride-details.html?id=${e.currentTarget.dataset.id}`, '_blank');
            });
        });
    }

    rideStatusBadge(status) {
        const map = { scheduled: 'info', completed: 'success', cancelled: 'danger', active: 'gold' };
        return map[status] || 'info';
    }

    /* ─── Reports & Verifications (placeholder) ─── */

    renderReportsPlaceholder() {
        const tbody = document.getElementById('reportsTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No reports to display</td></tr>`;
        }
    }

    renderVerificationsPlaceholder() {
        const tbody = document.getElementById('verificationsTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No pending verifications</td></tr>`;
        }
    }

    /* ─── Utilities ─── */

    formatDate(dateStr) {
        if (!dateStr) return '–';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }

    esc(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }
}

// Initialize
let adminPanel;
document.addEventListener('DOMContentLoaded', async () => {
    adminPanel = new AdminPanel();
    await adminPanel.init();
});
