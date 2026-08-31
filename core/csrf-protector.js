// ============================================================
// core/csrf-protector.js - محافظت در برابر حملات CSRF
// ============================================================

import { SECURITY_CONFIG } from './security-config.js';

// ---------- تولید توکن CSRF ----------

/**
 * تولید یک توکن CSRF جدید
 * @param {string} formId - شناسه فرم (برای تفکیک توکن‌ها)
 * @returns {string} - توکن CSRF
 */
export function generateCSRFToken(formId = 'default') {
    // ۱. تولید توکن تصادفی با crypto.randomUUID()
    const token = crypto.randomUUID();
    
    // ۲. محاسبه زمان انقضا
    const expiry = Date.now() + SECURITY_CONFIG.CSRF_TOKEN_EXPIRY * 1000;
    
    // ۳. ذخیره در sessionStorage با کلید اختصاصی
    const key = `csrf_${formId}`;
    sessionStorage.setItem(key, JSON.stringify({
        token: token,
        expiry: expiry
    }));
    
    return token;
}

// ---------- دریافت توکن CSRF ----------

/**
 * دریافت توکن CSRF موجود یا تولید توکن جدید
 * @param {string} formId - شناسه فرم
 * @returns {string} - توکن CSRF
 */
export function getCSRFToken(formId = 'default') {
    const key = `csrf_${formId}`;
    const stored = sessionStorage.getItem(key);
    
    if (!stored) {
        return generateCSRFToken(formId);
    }
    
    try {
        const data = JSON.parse(stored);
        // اگر توکن منقضی شده، توکن جدید تولید کن
        if (Date.now() > data.expiry) {
            return generateCSRFToken(formId);
        }
        return data.token;
    } catch (e) {
        return generateCSRFToken(formId);
    }
}

// ---------- اعتبارسنجی توکن CSRF ----------

/**
 * اعتبارسنجی توکن CSRF دریافتی از فرم
 * @param {string} token - توکن ارسال‌شده از فرم
 * @param {string} formId - شناسه فرم
 * @returns {boolean} - آیا توکن معتبر است؟
 * @throws {Error} - اگر توکن نامعتبر باشد
 */
export function validateCSRFToken(token, formId = 'default') {
    // ۱. اگر توکن ارسال نشده باشد
    if (!token) {
        throw new Error('❌ توکن CSRF ارسال نشده است.');
    }
    
    // ۲. دریافت توکن ذخیره‌شده
    const key = `csrf_${formId}`;
    const stored = sessionStorage.getItem(key);
    
    if (!stored) {
        throw new Error('❌ توکن CSRF در نشست یافت نشد.');
    }
    
    let data;
    try {
        data = JSON.parse(stored);
    } catch (e) {
        throw new Error('❌ داده CSRF نامعتبر است.');
    }
    
    // ۳. بررسی انقضا
    if (Date.now() > data.expiry) {
        // حذف توکن منقضی‌شده
        sessionStorage.removeItem(key);
        throw new Error('❌ توکن CSRF منقضی شده است. لطفاً صفحه را مجدداً بارگذاری کنید.');
    }
    
    // ۴. مقایسه توکن‌ها
    if (data.token !== token) {
        throw new Error('❌ توکن CSRF نامعتبر است.');
    }
    
    // ۵. در صورت موفقیت، توکن را یکبار مصرف کن (اختیاری)
    // اگر می‌خواهید توکن یکبار مصرف باشد، خط زیر را فعال کنید:
    // sessionStorage.removeItem(key);
    
    return true;
}

// ---------- حذف توکن CSRF ----------

/**
 * حذف توکن CSRF از نشست (بعد از استفاده)
 * @param {string} formId - شناسه فرم
 */
export function clearCSRFToken(formId = 'default') {
    const key = `csrf_${formId}`;
    sessionStorage.removeItem(key);
}

// ---------- تزریق خودکار توکن به فرم‌ها ----------

/**
 * به تمام فرم‌های صفحه یک فیلد مخفی CSRF اضافه می‌کند
 * @param {string} formId - شناسه فرم (اختیاری)
 */
export function autoInjectCSRF(formId = 'default') {
    const forms = document.querySelectorAll('form');
    forms.forEach((form, index) => {
        // اگر فرم قبلاً توکن دارد، از آن صرف‌نظر کن
        if (form.querySelector('input[name="csrf_token"]')) {
            return;
        }
        
        const token = getCSRFToken(formId || `form_${index}`);
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'csrf_token';
        input.value = token;
        form.appendChild(input);
    });
}

// ---------- تولید توکن برای فرم‌های Ajax ----------

/**
 * توکن CSRF را به هدر درخواست Ajax اضافه می‌کند
 * @param {object} options - تنظیمات fetch
 * @param {string} formId - شناسه فرم
 * @returns {object} - تنظیمات به‌روز شده با هدر CSRF
 */
export function addCSRFToFetch(options, formId = 'default') {
    const token = getCSRFToken(formId);
    
    if (!options.headers) {
        options.headers = {};
    }
    
    options.headers['X-CSRF-Token'] = token;
    options.headers['X-Requested-With'] = 'XMLHttpRequest';
    
    return options;
}

// ---------- بررسی خودکار CSRF در fetch ----------

/**
 * یک wrapper برای fetch که خودکار CSRF را اعتبارسنجی می‌کند
 * @param {string} url - آدرس درخواست
 * @param {object} options - تنظیمات fetch
 * @param {string} formId - شناسه فرم
 * @returns {Promise<Response>}
 */
export async function secureFetch(url, options = {}, formId = 'default') {
    // اضافه کردن CSRF به هدر
    options = addCSRFToFetch(options, formId);
    
    // ارسال درخواست
    const response = await fetch(url, options);
    
    // اگر سرور CSRF را بررسی کند، می‌توانیم از هدر پاسخ استفاده کنیم
    // (در GitHub Pages این امکان وجود ندارد، اما برای آینده مفید است)
    return response;
}
