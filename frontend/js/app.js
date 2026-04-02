// Shared application utilities — loaded on all authenticated pages

document.addEventListener('DOMContentLoaded', () => {
    initNavToggle();
    initNavAvatar();
    initSidebarActive();
    initLogoutLinks();
});

/** Mobile nav hamburger toggle */
function initNavToggle() {
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    if (toggle && links && !toggle.dataset.bound) {
        toggle.dataset.bound = '1';
        toggle.addEventListener('click', () => links.classList.toggle('open'));
    }
}

/** Populate nav avatar with user initials from auth */
function initNavAvatar() {
    const avatar = document.querySelector('.nav-avatar');
    if (!avatar || typeof authManager === 'undefined') return;
    const user = authManager.currentUser;
    if (user && user.full_name) {
        const initials = user.full_name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
        avatar.textContent = initials;
        avatar.title = user.full_name;
    }
}

/** Highlight sidebar link matching current page */
function initSidebarActive() {
    const page = window.location.pathname.split('/').pop() || 'home.html';
    document.querySelectorAll('.sidebar-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href === page) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/** Wire up all logout links/buttons */
function initLogoutLinks() {
    document.querySelectorAll('[data-action="logout"]').forEach(el => {
        el.addEventListener('click', async e => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                if (typeof authManager !== 'undefined') await authManager.logout();
            }
        });
    });
}
