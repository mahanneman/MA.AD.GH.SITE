/**
 * ============================================================
 * auth.js - مدیریت احراز هویت و وضعیت کاربر
 * نسخه نهایی - توابع سراسری پایدار
 * ============================================================
 */
(function() {
    'use strict';

    // ===== کلیدهای ذخیره‌سازی =====
    const KEYS = {
        IS_LOGGED_IN: 'isLoggedIn',
        CURRENT_USER: 'currentUser',
        USER_CART: 'user_cart',
        USER_ID: 'current_user_id',
        USERNAME: 'current_username'
    };

    // ===== وضعیت فعلی (کش) =====
    let cachedUser = null;
    let cachedIsLoggedIn = false;

    // ===== بارگذاری وضعیت از localStorage =====
    function loadState() {
        try {
            const isLoggedIn = localStorage.getItem(KEYS.IS_LOGGED_IN) === 'true';
            const user = JSON.parse(localStorage.getItem(KEYS.CURRENT_USER) || 'null');
            const userId = sessionStorage.getItem(KEYS.USER_ID) || localStorage.getItem(KEYS.USER_ID);
            const username = sessionStorage.getItem(KEYS.USERNAME) || localStorage.getItem(KEYS.USERNAME);

            if (userId && username && !isLoggedIn) {
                localStorage.setItem(KEYS.IS_LOGGED_IN, 'true');
                if (user) localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
                cachedIsLoggedIn = true;
                cachedUser = user || { id: userId, username: username };
            } else {
                cachedIsLoggedIn = isLoggedIn;
                cachedUser = user;
            }
            return { isLoggedIn: cachedIsLoggedIn, user: cachedUser };
        } catch (e) {
            cachedIsLoggedIn = false;
            cachedUser = null;
            return { isLoggedIn: false, user: null };
        }
    }

    // ===== توابع سراسری =====

    /** بررسی وضعیت لاگین */
    window.isUserLoggedIn = function() {
        return cachedIsLoggedIn;
    };

    /** دریافت اطلاعات کاربر جاری */
    window.getCurrentUser = function() {
        return cachedUser;
    };

    /** دریافت آیتم‌های سبد خرید */
  window.getCartItems = async function() {
    const userId = sessionStorage.getItem('current_user_id');
    if (!userId) return [];
    try {
        const res = await fetch(`https://your-worker.workers.dev/api/cart?userId=${userId}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.items || [];
    } catch (e) {
        return [];
    }
};
    /** تنظیم وضعیت لاگین (پس از ورود موفق) */
    window.setLoginStatus = function(userData) {
        if (!userData || !userData.id) return false;
        try {
            localStorage.setItem(KEYS.IS_LOGGED_IN, 'true');
            localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(userData));
            localStorage.setItem(KEYS.USER_ID, userData.id);
            if (userData.username) localStorage.setItem(KEYS.USERNAME, userData.username);
            sessionStorage.setItem(KEYS.USER_ID, userData.id);
            if (userData.username) sessionStorage.setItem(KEYS.USERNAME, userData.username);
            if (userData.cart) localStorage.setItem(KEYS.USER_CART, JSON.stringify(userData.cart));

            cachedIsLoggedIn = true;
            cachedUser = userData;

            // به‌روزرسانی UI
            if (typeof window.updateUserUI === 'function') window.updateUserUI();
            if (typeof window.updateCartUI === 'function') window.updateCartUI();

            return true;
        } catch (e) {
            console.error('خطا در ذخیره وضعیت لاگین:', e);
            return false;
        }
    };

    /** خروج از حساب کاربری */
    window.logoutUser = function() {
        localStorage.removeItem(KEYS.IS_LOGGED_IN);
        localStorage.removeItem(KEYS.CURRENT_USER);
        localStorage.removeItem(KEYS.USER_ID);
        localStorage.removeItem(KEYS.USERNAME);
        sessionStorage.removeItem(KEYS.USER_ID);
        sessionStorage.removeItem(KEYS.USERNAME);

        cachedIsLoggedIn = false;
        cachedUser = null;

        if (typeof window.updateUserUI === 'function') window.updateUserUI();
        if (typeof window.updateCartUI === 'function') window.updateCartUI();

        window.location.href = 'index.html';
    };

    // ===== بارگذاری اولیه =====
    loadState();

    // ===== همگام‌سازی با تغییرات در تب‌های دیگر =====
    window.addEventListener('storage', function(e) {
        if (e.key === KEYS.IS_LOGGED_IN || e.key === KEYS.CURRENT_USER || e.key === KEYS.USER_CART) {
            loadState();
            if (typeof window.updateUserUI === 'function') window.updateUserUI();
            if (typeof window.updateCartUI === 'function') window.updateCartUI();
        }
    });

    console.log('✅ auth.js بارگذاری شد. وضعیت:', cachedIsLoggedIn ? 'لاگین' : 'مهمان');
})();
