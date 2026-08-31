// ============================================================
// core/session-manager.js - مدیریت نشست کاربران
// ============================================================

import { SECURITY_CONFIG } from './security-config.js';

// ---------- کلید ذخیره‌سازی ----------

const SESSION_KEY = 'user_session';

// ---------- ایجاد نشست جدید ----------

/**
 * ایجاد یک نشست جدید برای کاربر
 * @param {string} userId - شناسه کاربر
 * @param {string} username - نام کاربری
 * @param {object} extraData - اطلاعات اضافی (اختیاری)
 * @returns {object} - شیء نشست
 */
export function createSession(userId, username, extraData = {}) {
    const session = {
        token: crypto.randomUUID(),
        userId: userId,
        username: username,
        createdAt: Date.now(),
        expiresAt: Date.now() + SECURITY_CONFIG.SESSION_TIMEOUT * 1000,
        ...extraData
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
}

// ---------- دریافت نشست جاری ----------

/**
 * دریافت نشست جاری (اگر معتبر باشد)
 * @returns {object|null} - شیء نشست یا null
 */
export function getSession() {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    try {
        const session = JSON.parse(stored);
        
        // بررسی انقضا
        if (Date.now() > session.expiresAt) {
            destroySession();
            return null;
        }
        
        return session;
    } catch (e) {
        return null;
    }
}

// ---------- تمدید نشست ----------

/**
 * تمدید زمان انقضای نشست (با هر فعالیت کاربر)
 * @returns {object|null} - نشست تمدیدشده یا null
 */
export function refreshSession() {
    const session = getSession();
    if (!session) return null;

    session.expiresAt = Date.now() + SECURITY_CONFIG.SESSION_TIMEOUT * 1000;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
}

// ---------- بررسی وضعیت لاگین ----------

/**
 * بررسی آیا کاربر وارد شده است؟
 * @returns {boolean}
 */
export function isLoggedIn() {
    return getSession() !== null;
}

// ---------- دریافت اطلاعات کاربر از نشست ----------

/**
 * دریافت اطلاعات کاربر از نشست جاری
 * @returns {object|null} - { userId, username, ... } یا null
 */
export function getUserInfo() {
    const session = getSession();
    if (!session) return null;
    return {
        userId: session.userId,
        username: session.username,
        token: session.token
    };
}

// ---------- حذف نشست (خروج) ----------

/**
 * حذف نشست و پاک کردن تمام داده‌های مرتبط
 */
export function destroySession() {
    // پاک کردن نشست
    sessionStorage.removeItem(SESSION_KEY);
    
    // پاک کردن CSRF
    sessionStorage.removeItem('csrf_default');
    
    // پاک کردن CAPTCHA
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
        if (key.startsWith('csrf_') || key.startsWith('captcha_')) {
            sessionStorage.removeItem(key);
        }
    });
}

// ---------- تغییر رمز عبور (نیاز به نشست معتبر) ----------

/**
 * بررسی می‌کند که آیا کاربر اجازه تغییر رمز دارد؟
 * @returns {boolean}
 */
export function canChangePassword() {
    const session = getSession();
    if (!session) return false;
    // می‌توان شرایط اضافی مثل تأیید هویت را اضافه کرد
    return true;
}

// ---------- تابع کمکی برای لاگین خودکار ----------

/**
 * بررسی خودکار نشست در همه صفحات
 * اگر نشست معتبر نباشد، کاربر را به صفحه لاگین هدایت می‌کند
 * @param {string} redirectUrl - آدرس صفحه لاگین
 */
export function requireLogin(redirectUrl = '../member/login.html') {
    if (!isLoggedIn()) {
        window.location.href = redirectUrl;
        return false;
    }
    return true;
}
