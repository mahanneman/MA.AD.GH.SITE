// ============================================================
// core/security-config.js - تنظیمات کلی امنیت
// ============================================================

export const SECURITY_CONFIG = {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 60,
    ENCRYPTION_ALGORITHM: 'AES-GCM',
    PBKDF2_ITERATIONS: 100000,
    SALT_LENGTH: 16,
    SESSION_TIMEOUT: 30 * 60,
    CSRF_TOKEN_EXPIRY: 60 * 60,
    CAPTCHA_EXPIRY: 5 * 60,
    MIN_PASSWORD_LENGTH: 8,
    PASSWORD_REQUIRE_UPPERCASE: true,
    PASSWORD_REQUIRE_LOWERCASE: true,
    PASSWORD_REQUIRE_NUMBER: true,
    PASSWORD_REQUIRE_SPECIAL: true,
    MAX_FILE_SIZE: 5 * 1024 * 1024,
    ALLOWED_FILE_TYPES: ['image/png', 'image/jpeg', 'image/jpg'],
    MIN_IMAGE_DIMENSION: 100,
};
