// ============================================================
// auth/token-encryptor.js - رمزنگاری توکن گیت‌هاب
// ============================================================

import { encryptData, decryptData } from '../core/encryption-engine.js';

// ---------- کلید اصلی برای رمزنگاری توکن (ثابت) ----------

// این کلید باید در جای امن نگهداری شود.
// برای امنیت بیشتر، می‌توانید از ترکیبی از اطلاعات کاربر استفاده کنید.
const MASTER_KEY = 'mahan_secure_master_key_2024_!@#';

// ---------- رمزنگاری توکن ----------

/**
 * رمزنگاری توکن گیت‌هاب با کلید اصلی
 * @param {string} token - توکن گیت‌هاب
 * @returns {Promise<object>} - شیء رمزنگاری‌شده
 */
export async function encryptToken(token) {
    return await encryptData({ token }, MASTER_KEY);
}

// ---------- رمزگشایی توکن ----------

/**
 * رمزگشایی توکن گیت‌هاب
 * @param {object} encrypted - شیء رمزنگاری‌شده
 * @returns {Promise<string|null>} - توکن یا null در صورت خطا
 */
export async function decryptToken(encrypted) {
    try {
        const result = await decryptData(encrypted, MASTER_KEY);
        return result ? result.token : null;
    } catch (e) {
        return null;
    }
}

// ---------- ذخیره توکن در sessionStorage ----------

/**
 * ذخیره توکن به صورت رمزنگاری‌شده در sessionStorage
 * @param {string} token - توکن گیت‌هاب
 */
export async function saveToken(token) {
    const encrypted = await encryptToken(token);
    sessionStorage.setItem('github_token_encrypted', JSON.stringify(encrypted));
}

// ---------- دریافت توکن از sessionStorage ----------

/**
 * دریافت توکن رمزگشایی‌شده از sessionStorage
 * @returns {Promise<string|null>} - توکن یا null
 */
export async function getToken() {
    const encryptedStr = sessionStorage.getItem('github_token_encrypted');
    if (!encryptedStr) return null;

    try {
        const encrypted = JSON.parse(encryptedStr);
        return await decryptToken(encrypted);
    } catch (e) {
        return null;
    }
}

// ---------- حذف توکن ----------

/**
 * حذف توکن از sessionStorage (برای خروج)
 */
export function removeToken() {
    sessionStorage.removeItem('github_token_encrypted');
}

// ---------- بررسی وجود توکن ----------

/**
 * بررسی اینکه آیا توکن در sessionStorage وجود دارد (بدون رمزگشایی)
 * @returns {boolean}
 */
export function hasToken() {
    return sessionStorage.getItem('github_token_encrypted') !== null;
}

// ---------- بررسی اعتبار توکن (با یک درخواست تست) ----------

/**
 * تست اعتبار توکن با ارسال یک درخواست ساده به گیت‌هاب
 * @param {string} token - توکن گیت‌هاب (اختیاری، اگر نداده شود از storage می‌خواند)
 * @returns {Promise<boolean>} - آیا توکن معتبر است؟
 */
export async function validateToken(token = null) {
    if (!token) {
        token = await getToken();
        if (!token) return false;
    }

    try {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': 'token ' + token,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        return response.ok;
    } catch (e) {
        return false;
    }
}
