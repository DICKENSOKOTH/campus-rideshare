// Register page — driver toggle, password strength, inline validation

document.addEventListener('DOMContentLoaded', () => {
    initDriverToggle();
    initPasswordStrength();
    initPasswordToggle('togglePwd', 'password');
    initRegisterForm();
});

/* ── Driver toggle ──────────────────────────────────────── */

function initDriverToggle() {
    const checkbox = document.getElementById('offerRides');
    const driverFields = document.getElementById('driverFields');
    if (!checkbox || !driverFields) return;

    checkbox.addEventListener('change', () => {
        driverFields.classList.toggle('hidden', !checkbox.checked);
    });
}

/* ── Password strength meter ────────────────────────────── */

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

/* ── Inline validation helpers ──────────────────────────── */

function setFieldError(inputId, errorId, msg) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    if (input) input.classList.add('error');
    if (error) { error.textContent = msg; error.classList.remove('hidden'); }
}

function clearFieldError(inputId, errorId) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    if (input) input.classList.remove('error');
    if (error) error.classList.add('hidden');
}

function clearAllRegErrors() {
    const pairs = [
        ['firstName', 'firstNameError'],
        ['lastName', 'lastNameError'],
        ['email', 'emailError'],
        ['phone', 'phoneError'],
        ['password', 'passwordError'],
    ];
    pairs.forEach(([i, e]) => clearFieldError(i, e));
    const termsErr = document.getElementById('termsError');
    if (termsErr) termsErr.classList.add('hidden');
}

function validateRegForm() {
    let valid = true;

    const firstName = document.getElementById('firstName')?.value.trim();
    const lastName = document.getElementById('lastName')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const phone = document.getElementById('phone')?.value.trim();
    const password = document.getElementById('password')?.value || '';
    const terms = document.getElementById('terms')?.checked;

    if (!firstName) { setFieldError('firstName', 'firstNameError', 'First name is required.'); valid = false; }
    else if (firstName.length < 2) { setFieldError('firstName', 'firstNameError', 'Must be at least 2 characters.'); valid = false; }

    if (!lastName) { setFieldError('lastName', 'lastNameError', 'Last name is required.'); valid = false; }
    else if (lastName.length < 2) { setFieldError('lastName', 'lastNameError', 'Must be at least 2 characters.'); valid = false; }

    if (!email) { setFieldError('email', 'emailError', 'Email is required.'); valid = false; }
    else if (!/^[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(email)) { setFieldError('email', 'emailError', 'Please enter a valid email address.'); valid = false; }

    if (phone && !/^\+?[0-9]{9,15}$/.test(phone.replace(/\s/g, ''))) {
        setFieldError('phone', 'phoneError', 'Enter a valid phone number (9-15 digits).');
        valid = false;
    }

    if (!password) { setFieldError('password', 'passwordError', 'Password is required.'); valid = false; }
    else if (password.length < 8) { setFieldError('password', 'passwordError', 'Must be at least 8 characters.'); valid = false; }
    else if (!/[A-Z]/.test(password)) { setFieldError('password', 'passwordError', 'Must contain at least one uppercase letter.'); valid = false; }
    else if (!/[0-9]/.test(password)) { setFieldError('password', 'passwordError', 'Must contain at least one digit.'); valid = false; }

    if (!terms) {
        const termsErr = document.getElementById('termsError');
        if (termsErr) { termsErr.textContent = 'You must agree to the Terms of Service.'; termsErr.classList.remove('hidden'); }
        valid = false;
    }

    return valid;
}

/* ── Form submission ────────────────────────────────────── */

function initRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    // Clear field error on input for each field
    ['firstName', 'lastName', 'email', 'phone', 'password'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => clearFieldError(id, id + 'Error'));
    });
    const termsEl = document.getElementById('terms');
    if (termsEl) termsEl.addEventListener('change', () => {
        const termsErr = document.getElementById('termsError');
        if (termsErr) termsErr.classList.add('hidden');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('registerBtn');
        if (btn && btn.disabled) return;

        clearAllRegErrors();

        if (!validateRegForm()) return;

        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim().replace(/\s/g, '');
        const password = document.getElementById('password').value;
        const wantsDriver = document.getElementById('offerRides')?.checked;

        const userData = {
            full_name: firstName + ' ' + lastName,
            email,
            password,
            phone: phone || undefined,
            role: wantsDriver ? 'driver' : 'rider',
        };

        btn.disabled = true;
        btn.textContent = 'Creating Account\u2026';

        try {
            const result = await authManager.register(userData);

            if (result.success) {
                showNotification(result.message, 'success');
                setTimeout(() => { window.location.href = 'login.html'; }, 800);
            } else {
                showNotification(result.message, 'error');
                btn.disabled = false;
                btn.textContent = 'Create Account';
            }
        } catch (err) {
            console.error('Registration error:', err);
            showNotification(err.message || 'Registration failed. Please try again.', 'error');
            btn.disabled = false;
            btn.textContent = 'Create Account';
        }
    });
}
