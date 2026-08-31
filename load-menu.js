/**
 * ============================================================
 * load-menu.js - بارگذاری هدر و منوی کشویی از member-menu.html
 * نسخه نهایی - بدون رندر مجدد اضافی
 * ============================================================
 */
(function() {
    'use strict';

    // ===== تشخیص مسیر پایه =====
    function getBasePath() {
        const path = window.location.pathname;
        if (path.includes('/member/')) return '../';
        if (path.includes('/admin/')) return '../';
        return './';
    }

    // ===== تابع فعال‌سازی منوی کشویی (موبایل/دسکتاپ) =====
    function initMobileMenu() {
        const menuToggle = document.getElementById('menuToggle');
        const slideMenu = document.getElementById('slideMenu');
        const slideMenuClose = document.getElementById('slideMenuClose');
        const menuOverlay = document.getElementById('menuOverlay');

        if (!menuToggle || !slideMenu) {
            console.warn('⚠️ عناصر منو پیدا نشدند.');
            return;
        }

        // حذف رویدادهای قبلی
        const newToggle = menuToggle.cloneNode(true);
        menuToggle.parentNode.replaceChild(newToggle, menuToggle);

        function openMenu(e) {
            e.preventDefault();
            e.stopPropagation();
            slideMenu.classList.add('active');
            if (menuOverlay) menuOverlay.classList.add('active');
            document.body.classList.add('no-scroll');
            document.body.style.overflow = 'hidden';
            newToggle.setAttribute('aria-expanded', 'true');
        }

        function closeMenu(e) {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            slideMenu.classList.remove('active');
            if (menuOverlay) menuOverlay.classList.remove('active');
            document.body.classList.remove('no-scroll');
            document.body.style.overflow = '';
            newToggle.setAttribute('aria-expanded', 'false');
        }

        // رویدادهای دکمه منو
        let isTouching = false;
        newToggle.addEventListener('click', function(e) {
            if (isTouching) return;
            openMenu(e);
        });
        newToggle.addEventListener('touchstart', function(e) {
            isTouching = true;
            openMenu(e);
            setTimeout(() => { isTouching = false; }, 300);
        }, { passive: false });

        // دکمه بستن
        if (slideMenuClose) {
            const newClose = slideMenuClose.cloneNode(true);
            slideMenuClose.parentNode.replaceChild(newClose, slideMenuClose);
            newClose.addEventListener('click', closeMenu);
            newClose.addEventListener('touchstart', closeMenu, { passive: false });
        }

        // overlay
        if (menuOverlay) {
            const newOverlay = menuOverlay.cloneNode(true);
            menuOverlay.parentNode.replaceChild(newOverlay, menuOverlay);
            newOverlay.addEventListener('click', closeMenu);
            newOverlay.addEventListener('touchstart', closeMenu, { passive: false });
        }

        // Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && slideMenu.classList.contains('active')) {
                closeMenu();
            }
        });

        // لینک‌های داخل منو
        slideMenu.querySelectorAll('.slide-menu-link, .slide-menu-actions a, .slide-menu-contact a, #auth-slide a').forEach(link => {
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
            newLink.addEventListener('click', closeMenu);
            newLink.addEventListener('touchstart', closeMenu, { passive: false });
        });

        // جلوگیری از بسته شدن با کلیک داخل منو
        slideMenu.addEventListener('click', function(e) { e.stopPropagation(); });
        slideMenu.addEventListener('touchstart', function(e) { e.stopPropagation(); }, { passive: true });

        console.log('✅ منوی کشویی فعال شد.');
    }

    // ===== تابع اصلی بارگذاری =====
    async function loadMenu() {
        try {
            const base = getBasePath();
            const menuFile = base + 'member-menu.html';
            console.log('🔍 بارگذاری منو از:', menuFile);

            const response = await fetch(menuFile);
            if (!response.ok) throw new Error('فایل member-menu.html یافت نشد');
            const html = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const header = doc.querySelector('.main-header');
            const slideMenu = doc.querySelector('.slide-menu-container');
            const overlay = doc.querySelector('.menu-overlay');

            // حذف عناصر قبلی
            const oldHeader = document.querySelector('.main-header');
            if (oldHeader) oldHeader.remove();
            if (header) document.body.prepend(header);

            const oldSlide = document.getElementById('slideMenu');
            if (oldSlide) oldSlide.remove();
            if (slideMenu) document.body.appendChild(slideMenu);

            const oldOverlay = document.getElementById('menuOverlay');
            if (oldOverlay) oldOverlay.remove();
            if (overlay) document.body.appendChild(overlay);

            // فعال‌سازی منوی کشویی
            initMobileMenu();

            // به‌روزرسانی UI پس از بارگذاری
            setTimeout(function() {
                if (typeof window.updateUserUI === 'function') {
                    window.updateUserUI();
                }
                if (typeof window.updateCartUI === 'function') {
                    window.updateCartUI();
                }
            }, 100);

            console.log('✅ هدر و منوی کشویی با موفقیت بارگذاری شدند.');

        } catch (e) {
            console.error('❌ خطا در بارگذاری هدر و منو:', e);
            showFallbackHeader();
        }
    }

    // ===== هدر پیش‌فرض =====
    function showFallbackHeader() {
        const base = getBasePath();
        const fallback = `
            <header class="main-header">
                <div class="container">
                    <div class="logo">
                        <a href="${base}index.html">
                            <div class="logo-icon"><i class="fas fa-cogs"></i></div>
                            <h1>ماهان ادهم قزوینی</h1>
                        </a>
                    </div>
                    <ul class="nav-list">
                        <li><a href="${base}index.html">خانه</a></li>
                        <li><a href="${base}articles.html">مقالات</a></li>
                        <li><a href="${base}products.html">محصولات</a></li>
                        <li><a href="${base}archive.html">آرشیو</a></li>
                        <li><a href="${base}index.html#contact">تماس</a></li>
                    </ul>
                    <div class="header-actions">
                        <div class="header-user-info"></div>
                        <a href="#" class="header-cart-icon"><i class="fas fa-shopping-cart"></i><span class="cart-badge">0</span></a>
                        <button id="themeToggle"><i class="fas fa-moon"></i><i class="fas fa-sun"></i></button>
                        <button class="menu-toggle" id="menuToggle"><span><span class="bar"></span><span class="bar"></span><span class="bar"></span></span> منو</button>
                    </div>
                </div>
            </header>
            <div class="slide-menu-container" id="slideMenu">
                <button class="slide-menu-close" id="slideMenuClose"><i class="fas fa-times"></i></button>
                <div class="slide-menu-profile">
                    <img src="${base}mahanphoto.png" alt="ماهان ادهم قزوینی" class="slide-menu-profile-img">
                    <h3>ماهان ادهم قزوینی</h3>
                    <p>متخصص تحلیل CFD و طراحی</p>
                    <div class="status"><span class="dot"></span><span>در دسترس برای پروژه‌ها</span></div>
                </div>
                <ul class="slide-menu-list">
                    <li><a href="${base}index.html#about" class="slide-menu-link">درباره من</a></li>
                    <li><a href="${base}index.html#skills" class="slide-menu-link">مهارت‌ها</a></li>
                    <li><a href="${base}index.html#education" class="slide-menu-link">تحصیلات</a></li>
                    <li><a href="${base}index.html#projects" class="slide-menu-link">پروژه‌ها</a></li>
                </ul>
                <div id="auth-slide" style="padding:0 20px 20px;border-top:1px solid var(--border-color);margin:10px 0 0;">
                    <div style="display:flex;justify-content:center;gap:1.5rem;font-size:0.75rem;padding-top:15px;">
                        <a href="${base}member/login.html" style="color:var(--text-secondary);text-decoration:none;"><i class="fas fa-sign-in-alt" style="color:var(--primary-color);"></i> ورود</a>
                        <span style="color:var(--border-color);">|</span>
                        <a href="${base}member/signup.html" style="color:var(--text-secondary);text-decoration:none;"><i class="fas fa-user-plus" style="color:var(--secondary-color);"></i> ثبت‌نام</a>
                    </div>
                </div>
                <div class="slide-menu-actions">
                    <a href="${base}resume.pdf" download class="btn btn-primary"><i class="fas fa-download"></i> دانلود رزومه</a>
                    <a href="${base}index.html#contact" class="btn btn-secondary"><i class="fas fa-paper-plane"></i> درخواست همکاری</a>
                </div>
            </div>
            <div class="menu-overlay" id="menuOverlay"></div>
        `;
        const temp = document.createElement('div');
        temp.innerHTML = fallback;
        const header = temp.querySelector('.main-header');
        if (header) document.body.prepend(header);
        const slide = temp.querySelector('#slideMenu');
        if (slide) document.body.appendChild(slide);
        const overlay = temp.querySelector('#menuOverlay');
        if (overlay) document.body.appendChild(overlay);
        setTimeout(initMobileMenu, 100);
        console.warn('⚠️ هدر پیش‌فرض بارگذاری شد.');
    }

    // ===== بارگذاری اولیه =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadMenu);
    } else {
        loadMenu();
    }
})();
// ============================================================
// Dropdown سبد خرید در هدر (قابل استفاده در تمام صفحات)
// ============================================================

(function() {
    'use strict';

    function createCartDropdown() {
        if (document.getElementById('cartDropdown')) return;

        const cartIcon = document.querySelector('.header-cart-icon');
        if (!cartIcon) return;

        const dropdown = document.createElement('div');
        dropdown.id = 'cartDropdown';
        dropdown.className = 'cart-dropdown';
        dropdown.style.cssText = `
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            right: auto;
            min-width: 300px;
            max-width: 380px;
            background: var(--bg-secondary, #141b2b);
            border: 1px solid var(--border-color, #1e2a3d);
            border-radius: 12px;
            box-shadow: 0 15px 40px rgba(0,0,0,0.4);
            z-index: 1000;
            margin-top: 8px;
            padding: 12px 0;
            max-height: 400px;
            overflow-y: auto;
            direction: rtl;
        `;
        dropdown.innerHTML = `
            <div style="padding: 0 16px 8px; border-bottom: 1px solid var(--border-color, #1e2a3d);">
                <span style="font-weight: 700; font-size: 0.9rem;">🛒 سبد خرید</span>
            </div>
            <div id="cartDropdownContent" style="padding: 8px 16px;"></div>
            <div id="cartDropdownFooter" style="padding: 8px 16px; border-top: 1px solid var(--border-color, #1e2a3d);">
                <div style="display:flex; justify-content:space-between; font-weight:700; margin-bottom:8px;">
                    <span>جمع کل:</span>
                    <span id="cartDropdownTotal" style="color:var(--primary-color, #2563eb);">۰ تومان</span>
                </div>
                <button id="cartCheckoutBtn" class="member-btn member-btn-primary" style="width:100%; justify-content:center; padding:8px; font-size:0.85rem; background:var(--primary-color); color:#fff; border:none; border-radius:30px; cursor:pointer;" disabled>
                    <i class="fas fa-credit-card"></i> تسویه حساب
                </button>
            </div>
        `;

        cartIcon.style.position = 'relative';
        cartIcon.appendChild(dropdown);

        cartIcon.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // بررسی لاگین
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true' || sessionStorage.getItem('current_user_id');
            if (!isLoggedIn) {
                showToast('لطفاً ابتدا وارد شوید.', true);
                return;
            }
            
            const dd = document.getElementById('cartDropdown');
            if (dd) {
                const isOpen = dd.style.display === 'block';
                dd.style.display = isOpen ? 'none' : 'block';
                if (!isOpen) renderCartDropdownContent();
            }
        });

        document.addEventListener('click', function(e) {
            const dd = document.getElementById('cartDropdown');
            if (dd && dd.style.display === 'block' && !dd.contains(e.target) && !cartIcon.contains(e.target)) {
                dd.style.display = 'none';
            }
        });

        // به‌روزرسانی تعداد بج
        updateCartBadge();
    }
renderCartDropdownContent
    function updateCartBadge() {
        const cart = JSON.parse(localStorage.getItem('user_cart') || '[]');
        const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        document.querySelectorAll('.cart-badge').forEach(badge => {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        });
    }

    function showToast(message, isError = false) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; bottom: 30px; left: 30px;
            background: ${isError ? '#ef4444' : 'var(--primary-color, #2563eb)'}; color: #fff;
            padding: 12px 24px; border-radius: 12px; font-weight: 600;
            z-index: 9999; box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            animation: slideUp 0.3s ease; font-family: 'Vazirmatn', sans-serif;
            direction: rtl;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // بارگذاری اولیه
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(createCartDropdown, 500);
        // به‌روزرسانی هنگام تغییر سبد خرید
        window.addEventListener('storage', function(e) {
            if (e.key === 'user_cart') {
                updateCartBadge();
                const dd = document.getElementById('cartDropdown');
                if (dd && dd.style.display === 'block') {
                    renderCartDropdownContent();
                }
            }
        });
    });

    // قرار دادن توابع در معرض دید سراسری
    window.renderCartDropdownContent = renderCartDropdownContent;
    window.updateCartBadge = updateCartBadge;
    window.getProductList = getProductList;

})();
