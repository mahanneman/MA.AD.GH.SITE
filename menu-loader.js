/**
 * ============================================================
 * menu-loader.js - بارگذاری یکپارچه منو با auth.js
 * نسخه نهایی - بدون flicker و بدون رندر مجدد
 * ============================================================
 */
(function() {
    'use strict';

    const defaultMenu = {
        header: [
            { title: 'خانه', link: 'index.html', icon: 'fa-home' },
            { title: 'مقالات', link: 'articles.html', icon: 'fa-newspaper' },
            { title: 'محصولات', link: 'products.html', icon: 'fa-cubes' },
            { title: 'آرشیو', link: 'archive.html', icon: 'fa-archive' },
            { title: 'تماس', link: 'index.html#contact', icon: 'fa-envelope' }
        ],
        slide: [
            { title: 'درباره من', link: 'index.html#about', icon: 'fa-user' },
            { title: 'مهارت‌ها', link: 'index.html#skills', icon: 'fa-tools' },
            { title: 'تحصیلات', link: 'index.html#education', icon: 'fa-graduation-cap' },
            { title: 'پروژه‌ها', link: 'index.html#projects', icon: 'fa-folder-open' }
        ]
    };

    let cachedHeaderMenu = [];
    let cachedSlideMenu = [];
    let isMenuRendered = false; // جلوگیری از رندر مجدد

    function getBasePath() {
        const path = window.location.pathname;
        if (path.includes('/member/')) return '../';
        if (path.includes('/admin/')) return '../';
        return './';
    }

    // ===== بارگذاری منوها از JSON =====
    async function loadMenusFromJson() {
        try {
            const res = await fetch('_data/menu.json?t=' + Date.now());
            if (!res.ok) throw new Error('فایل منو پیدا نشد');
            const data = await res.json();
            if (data.guest && data.user) {
                const isLoggedIn = window.isUserLoggedIn ? window.isUserLoggedIn() : false;
                const menuData = isLoggedIn ? data.user : data.guest;
                cachedHeaderMenu = menuData.header?.length ? menuData.header : defaultMenu.header;
                cachedSlideMenu = menuData.slide?.length ? menuData.slide : defaultMenu.slide;
            } else {
                cachedHeaderMenu = data.header?.length ? data.header : defaultMenu.header;
                cachedSlideMenu = data.slide?.length ? data.slide : defaultMenu.slide;
            }
        } catch (e) {
            console.warn('⚠️ خطا در بارگذاری منوها، استفاده از پیش‌فرض:', e);
            cachedHeaderMenu = defaultMenu.header;
            cachedSlideMenu = defaultMenu.slide;
        }
    }

    // ===== رندر منوی هدر (فقط یک بار) =====
    function renderHeaderMenu() {
        if (isMenuRendered) return;
        const navList = document.querySelector('.main-header .nav-list');
        if (!navList) return;

        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const base = getBasePath();

        navList.innerHTML = cachedHeaderMenu.map(item => {
            const url = base + item.link;
            const isActive = item.link === currentPath ||
                (item.link === 'index.html' && currentPath === '') ||
                (item.link.includes('#') && currentPath === 'index.html');
            return `<li><a href="${url}" class="${isActive ? 'active' : ''}">${item.icon ? '<i class="fas '+item.icon+'"></i> ' : ''}${item.title}</a></li>`;
        }).join('');

        isMenuRendered = true;
    }

    // ===== رندر منوی کشویی (فقط یک بار) =====
    function renderSlideMenu() {
        const slideList = document.querySelector('.slide-menu-list');
        if (!slideList) return;
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const base = getBasePath();

        slideList.innerHTML = cachedSlideMenu.map(item => {
            const url = base + item.link;
            const isActive = item.link === currentPath ||
                (item.link === 'index.html' && currentPath === '') ||
                (item.link.includes('#') && currentPath === 'index.html');
            return `<li class="slide-menu-item">
                <a href="${url}" class="slide-menu-link ${isActive ? 'active' : ''}">
                    <span class="menu-icon"><i class="fas ${item.icon || 'fa-link'}"></i></span>
                    ${item.title}
                    <span class="menu-indicator"></span>
                </a>
            </li>`;
        }).join('');
    }

    // ===== به‌روزرسانی اطلاعات کاربر (منوی کشویی کاربر) =====
    window.updateUserUI = function() {
        const userContainer = document.querySelector('.header-user-info');
        const authSlide = document.getElementById('auth-slide');
        if (!userContainer && !authSlide) return;

        const isLoggedIn = window.isUserLoggedIn ? window.isUserLoggedIn() : false;
        const user = window.getCurrentUser ? window.getCurrentUser() : null;
        const base = getBasePath();

        if (userContainer) {
            if (isLoggedIn && user) {
                userContainer.innerHTML = `
                    <div class="user-dropdown-wrapper">
                        <span class="user-trigger">
                            <i class="fas fa-user-circle"></i>
                            <span>${user.name || user.username || 'کاربر'}</span>
                            <i class="fas fa-chevron-down"></i>
                        </span>
                        <div class="user-dropdown-menu">
                            <a href="${base}member/memberpage.html?id=${user.id}"><i class="fas fa-id-card"></i> داشبورد</a>
                      <button class="logout-btn" onclick="window.logoutUser ? window.logoutUser() : location.reload()"><i class="fas fa-sign-out-alt"></i> خروج</button>
                        </div>
                    </div>
                `;
                const trigger = userContainer.querySelector('.user-trigger');
                const dropdown = userContainer.querySelector('.user-dropdown-menu');
                if (trigger && dropdown) {
                    // حذف رویدادهای قبلی
                    const newTrigger = trigger.cloneNode(true);
                    trigger.parentNode.replaceChild(newTrigger, trigger);
                    newTrigger.addEventListener('click', function(e) {
                        e.stopPropagation();
                        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                    });
                    document.addEventListener('click', function(e) {
                        if (!userContainer.contains(e.target)) dropdown.style.display = 'none';
                    });
                }
            } else {
                userContainer.innerHTML = `
                    <a href="${base}member/login.html"><i class="fas fa-sign-in-alt"></i> ورود</a>
                    <span>|</span>
                    <a href="${base}member/signup.html"><i class="fas fa-user-plus"></i> ثبت‌نام</a>
                `;
            }
        }

        if (authSlide) {
            if (isLoggedIn && user) {
                authSlide.innerHTML = `
                    <div style="display:flex;justify-content:center;gap:1.5rem;font-size:0.75rem;padding-top:15px;">
                        <a href="${base}member/memberpage.html?id=${user.id}"><i class="fas fa-user-circle" style="color:var(--primary-color);"></i> ${user.name || user.username}</a>
                        <span>|</span>
            <a href="#" class="slide-logout-btn" onclick="window.logoutUser(); return false;"><i class="fas fa-sign-out-alt"></i> خروج</a>
                    </div>
                `;
            } else {
                authSlide.innerHTML = `
                    <div style="display:flex;justify-content:center;gap:1.5rem;font-size:0.75rem;padding-top:15px;">
                        <a href="${base}member/login.html"><i class="fas fa-sign-in-alt" style="color:var(--primary-color);"></i> ورود</a>
                        <span>|</span>
                        <a href="${base}member/signup.html"><i class="fas fa-user-plus" style="color:var(--secondary-color);"></i> ثبت‌نام</a>
                    </div>
                `;
            }
        }
    };

    // ===== به‌روزرسانی سبد خرید =====
    window.updateCartUI = function() {
        const cartIcon = document.querySelector('.header-cart-icon');
        const cartBadge = cartIcon ? cartIcon.querySelector('.cart-badge') : null;
        const isLoggedIn = window.isUserLoggedIn ? window.isUserLoggedIn() : false;
        const cartItems = window.getCartItems ? window.getCartItems() : [];

        if (cartBadge) {
            const count = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
            cartBadge.textContent = count;
            cartBadge.style.display = (isLoggedIn && count > 0) ? 'flex' : 'none';
        }
        if (cartIcon) {
            cartIcon.style.opacity = isLoggedIn ? '1' : '0.5';
            cartIcon.title = isLoggedIn ? 'سبد خرید' : 'برای مشاهده سبد خرید وارد شوید';
        }
    };

    // ===== بارگذاری اولیه =====
    document.addEventListener('DOMContentLoaded', async function() {
        await loadMenusFromJson();
        renderHeaderMenu();
        renderSlideMenu();

        setTimeout(function() {
            window.updateUserUI();
            window.updateCartUI();
        }, 80);

        // فقط به تغییرات وضعیت لاگین و سبد خرید گوش می‌دهیم
        window.addEventListener('storage', function(e) {
            if (e.key === 'isLoggedIn' || e.key === 'currentUser' || e.key === 'user_cart') {
                window.updateUserUI();
                window.updateCartUI();
                // فقط در صورت تغییر وضعیت لاگین، منوها را دوباره بارگذاری کن
                if (e.key === 'isLoggedIn') {
                    loadMenusFromJson().then(() => {
                        if (!isMenuRendered) {
                            renderHeaderMenu();
                            renderSlideMenu();
                        }
                    });
                }
            }
        });

        console.log('✅ menu-loader.js بارگذاری شد.');
    });
})();
