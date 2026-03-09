// Register page — role toggle, password strength, upload zone

document.addEventListener('DOMContentLoaded', () => {
    initRoleToggle();
    initPasswordStrength();
    initPasswordToggle('togglePwd', 'password');
    initRegisterForm();
});

function initRoleToggle() {
    const passenger = document.getElementById('rolePassenger');
    const driver = document.getElementById('roleDriver');
    const driverFields = document.getElementById('driverFields');
    if (!passenger || !driver) return;

    passenger.addEventListener('click', () => {
        passenger.classList.add('active');
        driver.classList.remove('active');
        if (driverFields) driverFields.classList.add('hidden');
    });

    driver.addEventListener('click', () => {
        driver.classList.add('active');
        passenger.classList.remove('active');
        if (driverFields) driverFields.classList.remove('hidden');
    });
}

function initPasswordStrength() {
    const input = document.getElementById('password');
    const bar = document.getElementById('strengthBar');
    const label = document.getElementById('strengthText');
    if (!input || !bar) return;

    const levels = [
        { width: '0%',   cls: '',                 text: 'Password strength' },
        { width: '25%',  cls: 'progress-danger',  text: 'Weak' },
        { width: '50%',  cls: 'progress-warning', text: 'Fair' },
        { width: '75%',  cls: 'progress-info',    text: 'Good' },
        { width: '100%', cls: 'progress-success',  text: 'Strong' },
    ];

    input.addEventListener('input', () => {
        const v = input.value;
        let score = 0;
        if (v.length >= 8)          score++;
        if (/[A-Z]/.test(v))        score++;
        if (/[0-9]/.test(v))        score++;
        if (/[^A-Za-z0-9]/.test(v)) score++;

        const level = levels[score];
        bar.style.width = level.width;
        bar.className = 'progress-bar ' + level.cls;
        if (label) label.textContent = level.text;
    });
}

function initRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const firstName = document.getElementById('firstName')?.value.trim();
        const lastName  = document.getElementById('lastName')?.value.trim();
        const email     = document.getElementById('email')?.value.trim();
        const phone     = document.getElementById('phone')?.value.trim();
        const password  = document.getElementById('password')?.value;
        const terms     = document.getElementById('terms')?.checked;
        const btn       = document.getElementById('registerBtn');

        if (!firstName || !lastName || !email || !password) {
            showNotification('Please fill in all required fields.', 'error');
            return;
        }
        if (password.length < 8) {
            showNotification('Password must be at least 8 characters.', 'error');
            return;
        }
        if (!terms) {
            showNotification('Please agree to the Terms of Service.', 'error');
            return;
        }

        const driverBtn = document.getElementById('roleDriver');
        const role = driverBtn && driverBtn.classList.contains('active') ? 'driver' : 'rider';

        const userData = {
            full_name: `${firstName} ${lastName}`,
            email,
            password,
            phone: phone || undefined,
            role,
        };

        btn.disabled = true;
        btn.textContent = 'Creating Account\u2026';

        const result = await authManager.register(userData);

        if (result.success) {
            showNotification(result.message, 'success');
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        } else {
            showNotification(result.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Create Account';
        }
    });
}
