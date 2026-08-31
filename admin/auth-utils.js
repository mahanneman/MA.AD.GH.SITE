/**
 * auth-utils.js - نسخه کامل با پشتیبانی از utf8ToBase64
 * توابع امنیتی برای احراز هویت، هش، 2FA، قفل، لاگ و ...
 * فقط برای پنل مدیریت استفاده می‌شود
 */

(function() {
    'use strict';

    const STORAGE_KEY = 'admin_auth_data';
    const ATTEMPTS_KEY = 'admin_login_attempts';
    const LOG_KEY = 'admin_auth_log';
    const TWOFA_KEY = 'admin_2fa_code';

    // ============================================================
    // 1. مدیریت کاربران
    // ============================================================
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

    // ============================================================
    // 2. هش کردن رمز با SHA-256 + Salt (Web Crypto API)
    // ============================================================
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

    // ============================================================
    // 3. قدرت رمز عبور
    // ============================================================
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

    // ============================================================
    // 4. محدودیت تلاش (Rate Limiting)
    // ============================================================
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
        if (data.attempts >= 5) {
            data.lockUntil = Date.now() + 60 * 1000; // 60 ثانیه قفل
        }
        saveAttempts(data);
        return data;
    }

    // ============================================================
    // 5. تایید دو مرحله‌ای (2FA) - شبیه‌سازی
    // ============================================================
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

    // ============================================================
    // 6. مدیریت نشست (Session)
    // ============================================================
    function createSession(username) {
        const token = btoa(username + ':' + Date.now() + ':' + Math.random().toString(36));
        return token;
    }

    // ============================================================
    // 7. لاگ فعالیت‌ها
    // ============================================================
    function logActivity(username, action) {
        const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
        logs.unshift({
            username: username,
            action: action,
            timestamp: new Date().toISOString(),
            ip: '192.168.1.' + Math.floor(Math.random() * 255)
        });
        if (logs.length > 200) logs.length = 200;
        localStorage.setItem(LOG_KEY, JSON.stringify(logs));
    }

    function logFailedAttempt(username) {
        logActivity(username, 'تلاش ناموفق برای ورود');
    }

    function getLogs() {
        return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    }

    // ============================================================
    // 8. تغییر رمز و فعال/غیرفعال کردن 2FA
    // ============================================================
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

    // ============================================================
    // 9. اضافه کردن utf8ToBase64 (برای سازگاری با لاگین ساده)
    // ============================================================
    function utf8ToBase64(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        let binary = '';
        for (let i = 0; i < data.length; i++) {
            binary += String.fromCharCode(data[i]);
        }
        return btoa(binary);
    }

    // ============================================================
    // 10. صادر کردن API
    // ============================================================
    window.AuthUtils = {
        getUsers,
        saveUsers,
        hashPassword,
        generateSalt,
        passwordStrength,
        getAttempts,
        saveAttempts,
        resetAttempts,
        recordFailedAttempt,
        generate2FACode,
        store2FACode,
        verify2FA,
        createSession,
        logActivity,
        logFailedAttempt,
        getLogs,
        changePassword,
        toggle2FA,
        utf8ToBase64   // اضافه شده برای سازگاری
    };

    console.log('✅ auth-utils.js بارگذاری شد.');
})();
