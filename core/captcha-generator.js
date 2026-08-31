// ============================================================
// core/captcha-generator.js - تولید و اعتبارسنجی CAPTCHA
// ============================================================

import { SECURITY_CONFIG } from './security-config.js';

// ---------- تبدیل اعداد به فارسی ----------

const persianDigits = '۰۱۲۳۴۵۶۷۸۹';

function toPersianNumber(num) {
    return String(num).split('').map(d => persianDigits[parseInt(d)] || d).join('');
}

// ---------- تولید CAPTCHA ----------

/**
 * تولید یک سوال CAPTCHA جدید (جمع دو عدد تصادفی)
 * @param {string} identifier - شناسه منحصربه‌فرد برای فرم (اختیاری)
 * @returns {object} - { question, answer, expiry }
 */
export function generateCaptcha(identifier = 'default') {
    const num1 = Math.floor(Math.random() * 9) + 1; // ۱ تا ۹
    const num2 = Math.floor(Math.random() * 9) + 1;
    const answer = num1 + num2;

    const captcha = {
        question: `${toPersianNumber(num1)} + ${toPersianNumber(num2)} = ?`,
        answer: String(answer),
        expiry: Date.now() + SECURITY_CONFIG.CAPTCHA_EXPIRY * 1000
    };

    // ذخیره در sessionStorage با کلید اختصاصی
    const key = `captcha_${identifier}`;
    sessionStorage.setItem(key, JSON.stringify(captcha));

    return captcha;
}

// ---------- دریافت CAPTCHA جاری ----------

/**
 * دریافت CAPTCHA ذخیره‌شده
 * @param {string} identifier - شناسه فرم
 * @returns {object|null} - شیء CAPTCHA یا null
 */
export function getCaptcha(identifier = 'default') {
    const key = `captcha_${identifier}`;
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;

    try {
        return JSON.parse(stored);
    } catch (e) {
        return null;
    }
}

// ---------- اعتبارسنجی CAPTCHA ----------

/**
 * اعتبارسنجی پاسخ کاربر به CAPTCHA
 * @param {string} input - پاسخ وارد شده توسط کاربر
 * @param {string} identifier - شناسه فرم
 * @returns {boolean} - آیا پاسخ صحیح است؟
 */
export function validateCaptcha(input, identifier = 'default') {
    const captcha = getCaptcha(identifier);
    if (!captcha) return false;

    // بررسی انقضا
    if (Date.now() > captcha.expiry) {
        // حذف CAPTCHA منقضی‌شده
        clearCaptcha(identifier);
        return false;
    }

    // مقایسه پاسخ (بدون حساسیت به فاصله)
    const isValid = input.trim() === captcha.answer;

    // اگر صحیح بود، CAPTCHA را پاک کن (یکبار مصرف)
    if (isValid) {
        clearCaptcha(identifier);
    }

    return isValid;
}

// ---------- بازتولید CAPTCHA ----------

/**
 * بازتولید CAPTCHA جدید (برای دکمه refresh)
 * @param {string} identifier - شناسه فرم
 * @returns {object} - CAPTCHA جدید
 */
export function refreshCaptcha(identifier = 'default') {
    clearCaptcha(identifier);
    return generateCaptcha(identifier);
}

// ---------- پاک کردن CAPTCHA ----------

/**
 * حذف CAPTCHA از sessionStorage
 * @param {string} identifier - شناسه فرم
 */
export function clearCaptcha(identifier = 'default') {
    const key = `captcha_${identifier}`;
    sessionStorage.removeItem(key);
}

// ---------- نمایش CAPTCHA در DOM ----------

/**
 * نمایش CAPTCHA در یک المان DOM
 * @param {string} containerId - شناسه المان برای نمایش سوال
 * @param {string} inputId - شناسه ورودی برای دریافت پاسخ
 * @param {string} identifier - شناسه فرم (اختیاری)
 * @returns {object} - CAPTCHA تولید شده
 */
export function renderCaptcha(containerId, inputId, identifier = 'default') {
    const container = document.getElementById(containerId);
    const input = document.getElementById(inputId);
    
    if (!container || !input) {
        console.error('❌ المان‌های CAPTCHA یافت نشدند.');
        return null;
    }

    const captcha = generateCaptcha(identifier);
    
    // نمایش سوال
    container.innerHTML = `
        <span style="font-size: 1.2rem; font-weight: 700; color: var(--member-primary);">
            ${captcha.question}
        </span>
        <button type="button" onclick="window.refreshCaptchaUI('${identifier}')" 
                style="background: none; border: none; color: var(--member-primary); cursor: pointer; font-size: 1.2rem;">
            ⟳
        </button>
    `;

    // پاک کردن ورودی
    input.value = '';
    input.placeholder = 'عدد را وارد کنید...';

    // ذخیره identifier در input برای استفاده در اعتبارسنجی
    input.dataset.captchaId = identifier;

    return captcha;
}

// ---------- تابع گلوبال برای refresh (از onclick استفاده می‌شود) ----------

window.refreshCaptchaUI = function(identifier = 'default') {
    const input = document.querySelector(`input[data-captcha-id="${identifier}"]`);
    const container = input ? input.previousElementSibling : null;
    
    if (container && input) {
        const captcha = generateCaptcha(identifier);
        container.innerHTML = `
            <span style="font-size: 1.2rem; font-weight: 700; color: var(--member-primary);">
                ${captcha.question}
            </span>
            <button type="button" onclick="window.refreshCaptchaUI('${identifier}')" 
                    style="background: none; border: none; color: var(--member-primary); cursor: pointer; font-size: 1.2rem;">
                ⟳
            </button>
        `;
        input.value = '';
        input.dataset.captchaId = identifier;
    }
};
