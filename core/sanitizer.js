// ============================================================
// core/sanitizer.js - سانیتایز کردن ورودی‌ها (XSS Protection)
// ============================================================

export function sanitizeHTML(str) {
    if (!str) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };
    return String(str).replace(/[&<>"'`=\/]/g, function(s) {
        return map[s];
    });
}

export function sanitizeURL(url) {
    if (!url) return '#';
    const dangerous = ['javascript:', 'data:', 'vbscript:', 'file:'];
    const lower = url.toLowerCase();
    for (const d of dangerous) {
        if (lower.includes(d)) {
            return '#';
        }
    }
    return url;
}

export function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone) {
    return /^09[0-9]{9}$/.test(phone);
}

export function validatePostalCode(postal) {
    return /^[0-9]{10}$/.test(postal);
}

export function sanitizeNumber(str) {
    return String(str).replace(/\D/g, '');
}

export function sanitizeJSON(str) {
    if (!str) return '';
    return str.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
}
