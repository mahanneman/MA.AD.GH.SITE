// ============================================================
// auth/password-hasher.js - هش کردن رمز عبور با SHA-256 + Salt
// ============================================================

// ---------- توابع کمکی ----------

function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
}

function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function strToBuffer(str) {
    return new TextEncoder().encode(str);
}

// ---------- هش کردن رمز عبور ----------

/**
 * هش کردن رمز عبور با SHA-256 و Salt تصادفی
 * @param {string} password - رمز عبور کاربر
 * @returns {Promise<string>} - رشته به صورت "salt:hash"
 */
export async function hashPassword(password) {
    // ۱. تولید Salt تصادفی (۱۶ بایت)
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltBase64 = bufferToBase64(salt);

    // ۲. ترکیب رمز و Salt
    const data = strToBuffer(password + saltBase64);

    // ۳. هش با SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // ۴. بازگرداندن به صورت salt:hash
    return `${saltBase64}:${hash}`;
}

// ---------- اعتبارسنجی رمز عبور ----------

/**
 * بررسی رمز عبور با هش ذخیره‌شده
 * @param {string} password - رمز عبور وارد شده
 * @param {string} storedHash - هش ذخیره‌شده (فرمت "salt:hash")
 * @returns {Promise<boolean>} - آیا رمز صحیح است؟
 */
export async function verifyPassword(password, storedHash) {
    try {
        // ۱. جدا کردن Salt و Hash
        const parts = storedHash.split(':');
        if (parts.length !== 2) return false;
        
        const salt = parts[0];
        const originalHash = parts[1];

        // ۲. هش کردن رمز وارد شده با همان Salt
        const data = strToBuffer(password + salt);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const newHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // ۳. مقایسه هش‌ها (با زمان ثابت برای جلوگیری از timing attack)
        return constantTimeCompare(newHash, originalHash);
    } catch (e) {
        return false;
    }
}

// ---------- مقایسه امن (constant time) ----------

/**
 * مقایسه دو رشته بدون وابستگی به زمان (جلوگیری از timing attack)
 */
function constantTimeCompare(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

// ---------- قدرت سنجی رمز عبور ----------

/**
 * بررسی قدرت رمز عبور و بازگرداندن امتیاز
 * @param {string} password - رمز عبور
 * @returns {object} - { score, label, color, hint }
 */
export function passwordStrength(password) {
    let score = 0;
    const checks = [];

    if (password.length >= 8) {
        score++;
        checks.push('✅ حداقل ۸ کاراکتر');
    } else {
        checks.push('❌ حداقل ۸ کاراکتر');
    }

    if (password.length >= 12) {
        score++;
        checks.push('✅ حداقل ۱۲ کاراکتر');
    }

    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
        score++;
        checks.push('✅ حروف بزرگ و کوچک');
    } else {
        checks.push('❌ حروف بزرگ و کوچک');
    }

    if (/\d/.test(password)) {
        score++;
        checks.push('✅ حداقل یک عدد');
    } else {
        checks.push('❌ حداقل یک عدد');
    }

    if (/[^a-zA-Z0-9]/.test(password)) {
        score++;
        checks.push('✅ حداقل یک نماد (مثل @#$%)');
    } else {
        checks.push('❌ حداقل یک نماد (مثل @#$%)');
    }

    // تعیین سطح
    const levels = [
        { label: 'ضعیف', color: '#ef4444', hint: 'رمز بسیار ضعیف است.' },
        { label: 'متوسط', color: '#f59e0b', hint: 'رمز قابل قبول است اما امن نیست.' },
        { label: 'قوی', color: '#22c55e', hint: 'رمز خوب است.' },
        { label: 'بسیار قوی', color: '#10b981', hint: 'رمز عالی است!' }
    ];

    const levelIndex = Math.min(Math.floor(score / 2), 3);
    const level = levels[levelIndex];

    return {
        score: score,
        maxScore: 5,
        percent: Math.round((score / 5) * 100),
        label: level.label,
        color: level.color,
        hint: level.hint,
        checks: checks
    };
}

// ---------- تولید رمز عبور تصادفی (برای بازیابی) ----------

/**
 * تولید رمز عبور تصادفی با طول مشخص
 * @param {number} length - طول رمز (پیش‌فرض: ۱۲)
 * @returns {string} - رمز عبور تصادفی
 */
export function generateRandomPassword(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}
