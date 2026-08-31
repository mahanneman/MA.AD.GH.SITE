// ============================================================
// encryption/data-encryptor.js - رمزنگاری اطلاعات کاربران
// ============================================================

import { encryptData, decryptData } from '../core/encryption-engine.js';
import { getSession } from '../core/session-manager.js';

// ---------- رمزنگاری اطلاعات کاربر ----------

/**
 * رمزنگاری تمام اطلاعات حساس کاربر با رمز عبور خودش
 * @param {object} userData - اطلاعات کاربر (name, email, phone, addresses, ...)
 * @param {string} password - رمز عبور کاربر
 * @returns {Promise<object>} - شیء رمزنگاری‌شده
 */
export async function encryptUserData(userData, password) {
    const fieldsToEncrypt = ['name', 'email', 'phone', 'addresses', 'whatsapp', 'telegram', 'postal_code'];
    const encrypted = {};

    for (const field of fieldsToEncrypt) {
        if (userData[field] !== undefined) {
            try {
                encrypted[field] = await encryptData(userData[field], password);
            } catch (e) {
                console.error(`❌ خطا در رمزنگاری ${field}:`, e);
                encrypted[field] = userData[field]; // fallback (بدون رمزنگاری)
            }
        }
    }

    // فیلدهایی که رمزنگاری نمی‌شوند (شناسه و تاریخ)
    encrypted.id = userData.id;
    encrypted.username = userData.username;
    encrypted.created = userData.created;
    encrypted.lastLogin = userData.lastLogin;

    return encrypted;
}

// ---------- رمزگشایی اطلاعات کاربر ----------

/**
 * رمزگشایی اطلاعات رمزنگاری‌شده کاربر
 * @param {object} encryptedData - داده‌های رمزنگاری‌شده
 * @param {string} password - رمز عبور کاربر
 * @returns {Promise<object>} - اطلاعات رمزگشایی‌شده
 */
export async function decryptUserData(encryptedData, password) {
    const fieldsToDecrypt = ['name', 'email', 'phone', 'addresses', 'whatsapp', 'telegram', 'postal_code'];
    const decrypted = {};

    for (const field of fieldsToDecrypt) {
        if (encryptedData[field]) {
            try {
                decrypted[field] = await decryptData(encryptedData[field], password);
                // اگر رمزگشایی شکست بخورد، null برمی‌گرداند
                if (decrypted[field] === null) {
                    throw new Error(`خطا در رمزگشایی ${field}`);
                }
            } catch (e) {
                console.error(`❌ خطا در رمزگشایی ${field}:`, e);
                return null; // رمز اشتباه است
            }
        } else {
            decrypted[field] = '';
        }
    }

    // فیلدهای غیررمزنگاری‌شده را کپی کن
    decrypted.id = encryptedData.id;
    decrypted.username = encryptedData.username;
    decrypted.created = encryptedData.created;
    decrypted.lastLogin = encryptedData.lastLogin;

    return decrypted;
}

// ---------- رمزنگاری آدرس‌ها (مجزا) ----------

/**
 * رمزنگاری یک آدرس خاص
 * @param {object} address - { address, postalCode, city, province }
 * @param {string} password - رمز عبور کاربر
 * @returns {Promise<object>} - آدرس رمزنگاری‌شده
 */
export async function encryptAddress(address, password) {
    return await encryptData(address, password);
}

/**
 * رمزگشایی یک آدرس خاص
 * @param {object} encryptedAddress - آدرس رمزنگاری‌شده
 * @param {string} password - رمز عبور کاربر
 * @returns {Promise<object>} - آدرس رمزگشایی‌شده
 */
export async function decryptAddress(encryptedAddress, password) {
    return await decryptData(encryptedAddress, password);
}

// ---------- رمزنگاری سفارشات ----------

/**
 * رمزنگاری اطلاعات سفارش
 * @param {object} order - اطلاعات سفارش
 * @param {string} password - رمز عبور کاربر
 * @returns {Promise<object>} - سفارش رمزنگاری‌شده
 */
export async function encryptOrder(order, password) {
    const sensitive = ['address', 'paymentInfo', 'notes'];
    const encrypted = { ...order };

    for (const field of sensitive) {
        if (order[field]) {
            encrypted[field] = await encryptData(order[field], password);
        }
    }

    return encrypted;
}

/**
 * رمزگشایی سفارش
 * @param {object} encryptedOrder - سفارش رمزنگاری‌شده
 * @param {string} password - رمز عبور کاربر
 * @returns {Promise<object>} - سفارش رمزگشایی‌شده
 */
export async function decryptOrder(encryptedOrder, password) {
    const sensitive = ['address', 'paymentInfo', 'notes'];
    const decrypted = { ...encryptedOrder };

    for (const field of sensitive) {
        if (encryptedOrder[field]) {
            try {
                decrypted[field] = await decryptData(encryptedOrder[field], password);
                if (decrypted[field] === null) return null;
            } catch (e) {
                return null;
            }
        }
    }

    return decrypted;
}
