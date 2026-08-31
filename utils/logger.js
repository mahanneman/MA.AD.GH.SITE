// ============================================================
// utils/logger.js - ثبت لاگ فعالیت‌ها
// ============================================================

import { getSession } from '../core/session-manager.js';

// ---------- کلید ذخیره‌سازی ----------

const LOG_STORAGE_KEY = 'security_logs';

// ---------- دریافت لاگ‌های ذخیره‌شده ----------

function getLogs() {
    try {
        const data = localStorage.getItem(LOG_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

// ---------- ذخیره لاگ‌ها ----------

function saveLogs(logs) {
    // حداکثر ۱۰۰۰ لاگ نگهداری می‌شود
    if (logs.length > 1000) {
        logs = logs.slice(0, 1000);
    }
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
}

// ---------- ثبت یک رویداد ----------

/**
 * ثبت یک رویداد در لاگ
 * @param {string} action - نوع عمل (مانند 'login', 'logout', 'change_password', 'order_placed')
 * @param {object} details - جزئیات رویداد
 * @param {string} level - سطح اهمیت ('info', 'warning', 'error', 'critical')
 */
export function logActivity(action, details = {}, level = 'info') {
    const session = getSession();
    const log = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        action: action,
        level: level,
        userId: session ? session.userId : 'anonymous',
        username: session ? session.username : 'guest',
        details: details,
        userAgent: navigator.userAgent,
        ip: getIPAddress()
    };

    const logs = getLogs();
    logs.unshift(log); // جدیدترین در ابتدا
    saveLogs(logs);

    // اگر خطای بحرانی است، به کنسول هم نمایش بده
    if (level === 'error' || level === 'critical') {
        console.error(`[${level.toUpperCase()}] ${action}:`, details);
    }

    return log;
}

// ---------- دریافت IP (شبیه‌سازی) ----------

function getIPAddress() {
    // در محیط واقعی، از headerهای سرور استفاده می‌شود
    // در GitHub Pages، این فقط یک شبیه‌سازی است
    return '192.168.1.' + Math.floor(Math.random() * 255);
}

// ---------- دریافت لاگ‌ها با فیلتر ----------

/**
 * دریافت لاگ‌ها با فیلترهای دلخواه
 * @param {object} filters - { action, level, userId, from, to, limit }
 * @returns {array} - لیست لاگ‌ها
 */
export function getFilteredLogs(filters = {}) {
    let logs = getLogs();

    if (filters.action) {
        logs = logs.filter(log => log.action === filters.action);
    }

    if (filters.level) {
        logs = logs.filter(log => log.level === filters.level);
    }

    if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId);
    }

    if (filters.from) {
        const fromDate = new Date(filters.from);
        logs = logs.filter(log => new Date(log.timestamp) >= fromDate);
    }

    if (filters.to) {
        const toDate = new Date(filters.to);
        logs = logs.filter(log => new Date(log.timestamp) <= toDate);
    }

    if (filters.limit) {
        logs = logs.slice(0, filters.limit);
    }

    return logs;
}

// ---------- پاک کردن لاگ‌ها ----------

/**
 * پاک کردن تمام لاگ‌ها (فقط برای مدیریت)
 */
export function clearLogs() {
    localStorage.removeItem(LOG_STORAGE_KEY);
}

// ---------- دریافت آمار لاگ‌ها ----------

/**
 * دریافت آمار کلی از لاگ‌ها
 * @returns {object} - { total, byLevel, byAction, last24h }
 */
export function getLogStats() {
    const logs = getLogs();
    const now = Date.now();
    const last24h = logs.filter(log => (now - new Date(log.timestamp).getTime()) < 24 * 60 * 60 * 1000);

    const byLevel = {};
    const byAction = {};

    logs.forEach(log => {
        byLevel[log.level] = (byLevel[log.level] || 0) + 1;
        byAction[log.action] = (byAction[log.action] || 0) + 1;
    });

    return {
        total: logs.length,
        last24h: last24h.length,
        byLevel: byLevel,
        byAction: byAction
    };
}

// ---------- توابع کمکی برای لاگ‌های خاص ----------

export function logLogin(username, success, details = {}) {
    return logActivity(
        'login',
        { username, success, ...details },
        success ? 'info' : 'warning'
    );
}

export function logLogout(username) {
    return logActivity('logout', { username }, 'info');
}

export function logPasswordChange(username) {
    return logActivity('change_password', { username }, 'info');
}

export function logOrderPlaced(orderId, total) {
    return logActivity('order_placed', { orderId, total }, 'info');
}

export function logOrderStatusChange(orderId, oldStatus, newStatus) {
    return logActivity('order_status_change', { orderId, oldStatus, newStatus }, 'info');
}

export function logError(action, error) {
    return logActivity(
        'error',
        { action, error: error.message || error },
        'error'
    );
}

export function logCritical(action, details) {
    return logActivity(action, details, 'critical');
}
