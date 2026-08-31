export const ERROR_MESSAGES = {
    'NETWORK_ERROR': '❌ خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید.',
    'AUTH_FAILED': '❌ نام کاربری یا رمز عبور اشتباه است.',
    'SESSION_EXPIRED': '❌ نشست شما منقضی شده است. لطفاً مجدداً وارد شوید.',
    'PERMISSION_DENIED': '❌ شما دسترسی به این بخش را ندارید.',
    'INVALID_INPUT': '❌ اطلاعات وارد شده صحیح نیست. لطفاً بررسی کنید.',
    'FILE_TOO_LARGE': '❌ حجم فایل بیش از حد مجاز است.',
    'FILE_INVALID_TYPE': '❌ نوع فایل مجاز نیست.',
    'CAPTCHA_INVALID': '❌ کد امنیتی اشتباه است.',
    'CSRF_INVALID': '❌ درخواست نامعتبر است. لطفاً صفحه را مجدداً بارگذاری کنید.',
    'RATE_LIMIT': '❌ تعداد تلاش بیش از حد. لطفاً چند دقیقه بعد تلاش کنید.',
    'UNKNOWN': '❌ خطایی رخ داده است. لطفاً دوباره تلاش کنید.'
};

export function handleError(error, fallbackMessage = 'UNKNOWN') {
    let message = ERROR_MESSAGES[fallbackMessage] || ERROR_MESSAGES.UNKNOWN;
    
    if (typeof error === 'string') {
        message = error;
    } else if (error && error.message) {
        // بررسی پیام‌های خاص
        if (error.message.includes('قفل است')) {
            message = error.message;
        } else if (error.message.includes('CSRF')) {
            message = ERROR_MESSAGES.CSRF_INVALID;
        } else if (error.message.includes('CAPTCHA')) {
            message = ERROR_MESSAGES.CAPTCHA_INVALID;
        } else if (error.message.includes('شبکه') || error.message.includes('network')) {
            message = ERROR_MESSAGES.NETWORK_ERROR;
        } else {
            message = error.message || ERROR_MESSAGES.UNKNOWN;
        }
    }
    
    console.error('❌ خطا:', error);
    return message;
}

export function showErrorToUser(error, fallbackMessage = 'UNKNOWN') {
    const message = handleError(error, fallbackMessage);
    // استفاده از toast یا alert
    if (window.showToast) {
        window.showToast(message, true);
    } else {
        alert(message);
    }
}
