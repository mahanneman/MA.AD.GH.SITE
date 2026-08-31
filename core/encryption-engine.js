// ============================================================
// core/encryption-engine.js - موتور رمزنگاری AES-GCM
// ============================================================

import { SECURITY_CONFIG } from './security-config.js';

// ---------- توابع کمکی برای تبدیل داده‌ها ----------

/**
 * تبدیل ArrayBuffer به Base64
 */
function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
}

/**
 * تبدیل Base64 به ArrayBuffer
 */
function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * تبدیل رشته به ArrayBuffer (UTF-8)
 */
function strToBuffer(str) {
    return new TextEncoder().encode(str);
}

/**
 * تبدیل ArrayBuffer به رشته (UTF-8)
 */
function bufferToStr(buffer) {
    return new TextDecoder().decode(buffer);
}

// ---------- استخراج کلید از رمز عبور (PBKDF2) ----------

/**
 * تولید کلید رمزنگاری از رمز عبور با استفاده از PBKDF2
 * @param {string} password - رمز عبور کاربر
 * @param {Uint8Array} salt - نمک تصادفی (اختیاری)
 * @returns {Promise<CryptoKey>}
 */
async function deriveKey(password, salt = null) {
    // اگر salt داده نشده، یک salt تصادفی تولید کن
    if (!salt) {
        salt = crypto.getRandomValues(new Uint8Array(SECURITY_CONFIG.SALT_LENGTH));
    }

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: SECURITY_CONFIG.PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

// ---------- رمزنگاری داده ----------

/**
 * رمزنگاری داده با AES-GCM
 * @param {any} data - داده قابل تبدیل به JSON
 * @param {string} password - رمز عبور برای رمزنگاری
 * @param {Uint8Array} customSalt - نمک دلخواه (اختیاری)
 * @returns {Promise<{ iv: string, data: string, salt: string }>}
 */
export async function encryptData(data, password, customSalt = null) {
    try {
        // ۱. تبدیل داده به JSON و سپس به ArrayBuffer
        const jsonString = JSON.stringify(data);
        const dataBuffer = strToBuffer(jsonString);

        // ۲. تولید Salt (اگر داده نشده)
        const salt = customSalt || crypto.getRandomValues(new Uint8Array(SECURITY_CONFIG.SALT_LENGTH));

        // ۳. استخراج کلید از رمز عبور
        const key = await deriveKey(password, salt);

        // ۴. تولید IV تصادفی (۱۲ بایت برای AES-GCM)
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // ۵. رمزنگاری داده
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            dataBuffer
        );

        // ۶. بازگرداندن نتیجه به صورت Base64
        return {
            iv: bufferToBase64(iv),
            salt: bufferToBase64(salt),
            data: bufferToBase64(encrypted)
        };
    } catch (error) {
        console.error('❌ خطا در رمزنگاری:', error);
        throw new Error('خطا در رمزنگاری داده: ' + error.message);
    }
}

// ---------- رمزگشایی داده ----------

/**
 * رمزگشایی داده با AES-GCM
 * @param {object} encryptedObj - شیء حاوی iv, salt, data (همگی Base64)
 * @param {string} password - رمز عبور برای رمزگشایی
 * @returns {Promise<any>} - داده رمزگشایی‌شده
 */
export async function decryptData(encryptedObj, password) {
    try {
        // ۱. تبدیل Base64 به ArrayBuffer
        const iv = base64ToBuffer(encryptedObj.iv);
        const salt = base64ToBuffer(encryptedObj.salt);
        const encrypted = base64ToBuffer(encryptedObj.data);

        // ۲. استخراج کلید از رمز عبور با همان Salt
        const key = await deriveKey(password, new Uint8Array(salt));

        // ۳. رمزگشایی داده
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encrypted
        );

        // ۴. تبدیل به JSON
        const jsonString = bufferToStr(decrypted);
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('❌ خطا در رمزگشایی:', error);
        // اگر رمز اشتباه باشد، خطا می‌دهد
        return null;
    }
}

// ---------- رمزنگاری رشته (ساده) ----------

/**
 * رمزنگاری یک رشته ساده (برای توکن و ...)
 * @param {string} text - متن برای رمزنگاری
 * @param {string} password - رمز عبور
 * @returns {Promise<string>} - رشته رمزنگاری‌شده به صورت Base64
 */
export async function encryptString(text, password) {
    const result = await encryptData({ text }, password);
    return JSON.stringify(result);
}

/**
 * رمزگشایی یک رشته ساده
 * @param {string} encryptedString - رشته رمزنگاری‌شده (JSON)
 * @param {string} password - رمز عبور
 * @returns {Promise<string>} - متن رمزگشایی‌شده
 */
export async function decryptString(encryptedString, password) {
    try {
        const obj = JSON.parse(encryptedString);
        const result = await decryptData(obj, password);
        return result ? result.text : null;
    } catch (e) {
        return null;
    }
}

// ---------- تابع کمکی برای اعتبارسنجی رمزنگاری ----------

/**
 * بررسی می‌کند که آیا داده رمزنگاری‌شده با رمز عبور قابل رمزگشایی است؟
 * @param {object} encryptedObj - شیء رمزنگاری‌شده
 * @param {string} password - رمز عبور
 * @returns {Promise<boolean>}
 */
export async function testEncryption(encryptedObj, password) {
    try {
        const result = await decryptData(encryptedObj, password);
        return result !== null;
    } catch (e) {
        return false;
    }
}
