/**
 * auth-utils.js - نسخه کامل با تمام توابع مورد نیاز
 */
(function() {
    'use strict';

    const STORAGE_KEY = 'admin_auth_data';
    const ATTEMPTS_KEY = 'admin_login_attempts';
    const LOG_KEY = 'admin_auth_log';
    const TWOFA_KEY = 'admin_2fa_code';
    const SESSION_KEY = 'admin_session';

    function getUsers() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            try { return JSON.parse(data); } catch (e) { return {}; }
        }
        return {};
    }

    function saveUsers(users) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    }

    async function hashPassword(password, salt) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + salt);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function generateSalt() {
        return Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    }

    // ✅ تابع hashToHex اضافه شد
    function hashToHex(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16).padStart(8, '0');
    }

    function passwordStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;
        const percent = Math.min(100, score * 20);
        let label = 'ضعیف';
        let color = '#ef4444';
        let hint = 'حداقل ۸ کاراکتر';
        if (percent >= 80) { label = 'فوق‌قوی'; color = '#22c55e'; hint = 'عالی!'; }
        else if (percent >= 60) { label = 'قوی'; color = '#22c55e'; hint = 'خوب است'; }
        else if (percent >= 40) { label = 'متوسط'; color = '#f59e0b'; hint = 'بهتر می‌تواند باشد'; }
        else { label = 'ضعیف'; color = '#ef4444'; hint = 'از حروف بزرگ، کوچک، عدد و نماد استفاده کنید'; }
        return { percent, label, color, hint };
    }

    function getAttempts() {
        const data = localStorage.getItem(ATTEMPTS_KEY);
        if (data) {
            try { return JSON.parse(data); } catch (e) { return { attempts: 0, lockUntil: null }; }
        }
        return { attempts: 0, lockUntil: null };
    }

    function saveAttempts(data) {
        localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(data));
    }

    function resetAttempts() {
        saveAttempts({ attempts: 0, lockUntil: null });
    }

    function recordFailedAttempt(username) {
        const data = getAttempts();
        data.attempts = (data.attempts || 0) + 1;
        let lockDuration = 60;
        if (data.attempts >= 10) lockDuration = 300;
        else if (data.attempts >= 7) lockDuration = 120;
        if (data.attempts >= 5) {
            data.lockUntil = Date.now() + lockDuration * 1000;
        }
        saveAttempts(data);
        return data;
    }

    function isLocked() {
        const data = getAttempts();
        if (data.lockUntil && Date.now() < data.lockUntil) {
            return true;
        }
        if (data.lockUntil && Date.now() >= data.lockUntil) {
            data.lockUntil = null;
            data.attempts = 0;
            saveAttempts(data);
        }
        return false;
    }

    function getLockRemaining() {
        const data = getAttempts();
        if (data.lockUntil && Date.now() < data.lockUntil) {
            return Math.ceil((data.lockUntil - Date.now()) / 1000);
        }
        return 0;
    }

    function generate2FACode() {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        store2FACode(code);
        return code;
    }

    function store2FACode(code) {
        localStorage.setItem(TWOFA_KEY, JSON.stringify({ code, expires: Date.now() + 5 * 60 * 1000 }));
    }

    function verify2FA(inputCode) {
        const data = JSON.parse(localStorage.getItem(TWOFA_KEY) || 'null');
        if (!data) return false;
        if (Date.now() > data.expires) {
            localStorage.removeItem(TWOFA_KEY);
            return false;
        }
        return data.code === inputCode;
    }

    function createSession(username) {
        const token = btoa(username + ':' + Date.now() + ':' + Math.random().toString(36).substring(2));
        const sessionData = {
            token: token,
            username: username,
            created: Date.now(),
            expires: Date.now() + 30 * 60 * 1000
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        return token;
    }

    function getSession() {
        const data = localStorage.getItem(SESSION_KEY);
        if (!data) return null;
        try {
            const session = JSON.parse(data);
            if (session.expires && Date.now() > session.expires) {
                localStorage.removeItem(SESSION_KEY);
                return null;
            }
            return session;
        } catch (e) {
            return null;
        }
    }

    function destroySession() {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem('admin_session');
    }

    function isSessionValid() {
        const session = getSession();
        return session !== null && session.username !== undefined;
    }

    function logActivity(username, action) {
        const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
        logs.unshift({
            username: username || 'سیستم',
            action: action,
            timestamp: new Date().toISOString(),
            ip: '192.168.1.' + Math.floor(Math.random() * 255)
        });
        if (logs.length > 200) logs.length = 200;
        localStorage.setItem(LOG_KEY, JSON.stringify(logs));
    }

    function logFailedAttempt(username) {
        logActivity(username || 'ناشناس', 'تلاش ناموفق برای ورود');
    }

    function getLogs() {
        return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    }

    function clearLogs() {
        localStorage.setItem(LOG_KEY, '[]');
    }

    async function changePassword(username, newPassword) {
        const users = getUsers();
        if (!users[username]) return false;
        const salt = generateSalt();
        const hashed = await hashPassword(newPassword, salt);
        users[username].password = hashed;
        users[username].salt = salt;
        saveUsers(users);
        return true;
    }

    function toggle2FA(username, enabled) {
        const users = getUsers();
        if (!users[username]) return false;
        users[username].twofaEnabled = enabled;
        saveUsers(users);
        return true;
    }

    function utf8ToBase64(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        let binary = '';
        for (let i = 0; i < data.length; i++) {
            binary += String.fromCharCode(data[i]);
        }
        return btoa(binary);
    }

    function base64ToUtf8(base64) {
        try {
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return new TextDecoder().decode(bytes);
        } catch (e) {
            return null;
        }
    }

    function generateSecureToken(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < length; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }

    function sanitizeInput(str) {
        if (!str) return '';
        return str.replace(/[<>"'`]/g, '').trim();
    }

    window.AuthUtils = {
        getUsers,
        saveUsers,
        hashPassword,
        generateSalt,
        hashToHex,
        passwordStrength,
        getAttempts,
        saveAttempts,
        resetAttempts,
        recordFailedAttempt,
        isLocked,
        getLockRemaining,
        generate2FACode,
        store2FACode,
        verify2FA,
        createSession,
        getSession,
        destroySession,
        isSessionValid,
        logActivity,
        logFailedAttempt,
        getLogs,
        clearLogs,
        changePassword,
        toggle2FA,
        utf8ToBase64,
        base64ToUtf8,
        generateSecureToken,
        sanitizeInput
    };

    console.log('✅ auth-utils.js بارگذاری شد.');
})();
