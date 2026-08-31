// ============================================================
// core/rate-limiter.js - محدود کردن تعداد تلاش‌ها (Brute Force Protection)
// ============================================================

import { SECURITY_CONFIG } from './security-config.js';

// ---------- کلید ذخیره‌سازی در localStorage ----------

const STORAGE_KEY = 'rate_limiter_data';

/**
 * دریافت داده‌های ذخیره‌شده از localStorage
 * @returns {object} - داده‌های rate limiter
 */
function getStorageData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

/**
 * ذخیره داده‌های rate limiter در localStorage
 * @param {object} data - داده‌های جدید
 */
function saveStorageData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ---------- توابع اصلی ----------

/**
 * بررسی وضعیت قفل برای یک شناسه (مثلاً ایمیل یا IP)
 * @param {string} identifier - شناسه کاربر (ایمیل، نام کاربری یا IP)
 * @returns {object} - وضعیت فعلی { count, lockUntil, remainingTime }
 * @throws {Error} - اگر حساب قفل باشد
 */
export function checkRateLimit(identifier) {
    const data = getStorageData();
    const key = `rate_${identifier}`;
    const record = data[key] || { count: 0, lockUntil: null };

    // اگر قفل فعال است
    if (record.lockUntil && Date.now() < record.lockUntil) {
        const remaining = Math.ceil((record.lockUntil - Date.now()) / 1000);
        throw new Error(`❌ حساب قفل است. ${remaining} ثانیه دیگر تلاش کنید.`);
    }

    // اگر زمان قفل گذشته، آن را پاک کن
    if (record.lockUntil && Date.now() >= record.lockUntil) {
        delete record.lockUntil;
        record.count = 0;
        data[key] = record;
        saveStorageData(data);
    }

    return {
        count: record.count,
        lockUntil: record.lockUntil,
        remainingAttempts: Math.max(0, SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - record.count)
    };
}

/**
 * ثبت یک تلاش ناموفق
 * @param {string} identifier - شناسه کاربر
 * @returns {object} - وضعیت جدید
 */
export function recordAttempt(identifier) {
    const data = getStorageData();
    const key = `rate_${identifier}`;
    const record = data[key] || { count: 0, lockUntil: null };

    // افزایش تعداد تلاش
    record.count += 1;

    // اگر از حداکثر تعداد تلاش عبور کرد، قفل کن
    if (record.count >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
        record.lockUntil = Date.now() + SECURITY_CONFIG.LOCKOUT_DURATION * 1000;
    }

    data[key] = record;
    saveStorageData(data);

    return {
        count: record.count,
        lockUntil: record.lockUntil,
        remainingAttempts: Math.max(0, SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - record.count),
        isLocked: record.lockUntil !== null && Date.now() < record.lockUntil
    };
}

/**
 * بازنشانی تعداد تلاش‌ها (پس از ورود موفق)
 * @param {string} identifier - شناسه کاربر
 */
export function resetAttempts(identifier) {
    const data = getStorageData();
    const key = `rate_${identifier}`;
    delete data[key];
    saveStorageData(data);
}

/**
 * دریافت زمان باقی‌مانده تا رفع قفل (برای نمایش به کاربر)
 * @param {string} identifier - شناسه کاربر
 * @returns {number} - زمان باقی‌مانده به ثانیه (۰ اگر قفل نیست)
 */
export function getRemainingLockTime(identifier) {
    const data = getStorageData();
    const key = `rate_${identifier}`;
    const record = data[key];

    if (!record || !record.lockUntil) return 0;
    if (Date.now() >= record.lockUntil) return 0;

    return Math.ceil((record.lockUntil - Date.now()) / 1000);
}

/**
 * پاک کردن تمام داده‌های rate limiter (برای تست یا مدیریت)
 */
export function clearAllRateLimits() {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * دریافت آمار کلی تلاش‌ها (برای مدیریت)
 * @returns {object} - آمار تعداد کاربران قفل‌شده و کل تلاش‌ها
 */
export function getRateLimitStats() {
    const data = getStorageData();
    let totalAttempts = 0;
    let lockedUsers = 0;

    for (const key in data) {
        const record = data[key];
        totalAttempts += record.count || 0;
        if (record.lockUntil && Date.now() < record.lockUntil) {
            lockedUsers++;
        }
    }

    return {
        totalAttempts,
        lockedUsers,
        totalRecords: Object.keys(data).length
    };
}
