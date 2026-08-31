/**
 * ============================================================
 * menu.js - منوی یکپارچه (بدون فایل خارجی) - اصلاح شده با container
 * ============================================================
 */
(function() {
    'use strict';

    // ============================================================
    // ۱. مدیریت وضعیت کاربر (اختیاری)
    // ============================================================
    const KEYS = {
        IS_LOGGED_IN: 'isLoggedIn',
        CURRENT_USER: 'currentUser',
        USER_ID: 'current_user_id',
        USERNAME: 'current_username'
    };

    let cachedUser = null;
    let cachedIsLoggedIn = false;

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

    window.isUserLoggedIn = function() { return cachedIsLoggedIn; };
    window.getCurrentUser = function() { return cachedUser; };

    // ============================================================
    // ۲. منوی پیش‌فرض (شامل پنل ادمین)
    // ============================================================
    const defaultMenu = {
        header: [
            { title: 'خانه', link: 'index.html', icon: 'fa-home' },
            { title: 'مقالات', link: 'articles.html', icon: 'fa-newspaper' },
            { title: 'آرشیو', link: 'archive.html', icon: 'fa-archive' },
            { title: 'تماس', link: 'index.html#contact', icon: 'fa-envelope' },
            { title: 'پنل ادمین', link: 'admin/admin-login.html', icon: 'fa-user-shield' }
        ],
        slide: [
            { title: 'درباره من', link: 'index.html#about', icon: 'fa-user' },
            { title: 'مهارت‌ها', link: 'index.html#skills', icon: 'fa-tools' },
            { title: 'تحصیلات', link: 'index.html#education', icon: 'fa-graduation-cap' },
            { title: 'پروژه‌ها', link: 'index.html#projects', icon: 'fa-folder-open' },
            { title: 'پنل ادمین', link: 'admin/admin-login.html', icon: 'fa-user-shield' }
        ]
    };

    let cachedHeaderMenu = [];
    let cachedSlideMenu = [];
    let isMenuRendered = false;
    let menuLoaded = false;

    function getBasePath() {
        const path = window.location.pathname;
        if (path.includes('/member/')) return '../';
        if (path.includes('/admin/')) return '../';
        return './';
    }

    // ============================================================
    // ۳. بارگذاری منوها از JSON (در صورت وجود)
    // ============================================================
    async function loadMenusFromJson() {
        try {
            const res = await fetch('_data/menu.json?t=' + Date.now());
            if (!res.ok) throw new Error('فایل منو پیدا نشد');
            const data = await res.json();
            const menuData = data.guest || data;
            cachedHeaderMenu = menuData.header?.length ? menuData.header : defaultMenu.header;
            cachedSlideMenu = menuData.slide?.length ? menuData.slide : defaultMenu.slide;
        } catch (e) {
            console.warn('⚠️ استفاده از منوی پیش‌فرض:', e);
            cachedHeaderMenu = defaultMenu.header;
            cachedSlideMenu = defaultMenu.slide;
        }
        cachedHeaderMenu = cachedHeaderMenu.filter(item => item.title !== 'محصولات');
        cachedSlideMenu = cachedSlideMenu.filter(item => item.title !== 'محصولات');
    }

    // ============================================================
    // ۴. رندر منوها
    // ============================================================
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

    // ============================================================
    // ۵. ایجاد هدر و منوی کشویی با ساختار صحیح (شامل container)
    // ============================================================
    function buildHeader() {
        if (menuLoaded) return;
        const base = getBasePath();

        // حذف عناصر قبلی
        const oldHeader = document.querySelector('.main-header');
        if (oldHeader) oldHeader.remove();
        const oldSlide = document.getElementById('slideMenu');
        if (oldSlide) oldSlide.remove();
        const oldOverlay = document.getElementById('menuOverlay');
        if (oldOverlay) oldOverlay.remove();

        // ===== هدر با ساختار container =====
        const headerHTML = `
            <header class="main-header">
                <div class="container">
                    <div class="logo">
                        <a href="${base}index.html">
                            <div class="logo-icon"><i class="fas fa-cogs"></i></div>
                            <h1>مهندس ماهان</h1>
                        </a>
                    </div>
                    <ul class="nav-list">
                        <!-- آیتم‌ها توسط JS پر می‌شوند -->
                    </ul>
                    <div class="header-actions">
                        <button id="themeToggle" aria-label="تغییر تم">
                            <i class="fas fa-moon" style="position:absolute;top:50%;right:50%;transform:translate(50%,-50%);opacity:1;"></i>
                            <i class="fas fa-sun" style="position:absolute;top:50%;right:50%;transform:translate(50%,-50%) rotate(90deg);opacity:0;"></i>
                        </button>
                        <button class="menu-toggle" id="menuToggle" aria-expanded="false" aria-label="باز کردن منو">
                            <span class="bar"></span>
                            <span class="bar"></span>
                            <span class="bar"></span>
                            <span>منو</span>
                        </button>
                    </div>
                </div>
            </header>

            <div class="menu-overlay" id="menuOverlay"></div>
            <div class="slide-menu-container" id="slideMenu" role="dialog" aria-modal="true" aria-label="منوی اصلی">
                <div class="slide-menu-header">
                    <button id="slideMenuClose" class="close-btn" aria-label="بستن منو"><i class="fas fa-times"></i></button>
                </div>
                <div class="slide-menu-profile">
                    <img src="${base}mahanphoto.png" alt="مهندس ماهان ادهم قزوینی" class="slide-menu-profile-img">
                    <h3>مهندس ماهان ادهم قزوینی</h3>
                    <p>متخصص مکانیک سیالات و CFD</p>
                </div>
                <ul class="slide-menu-list">
                    <!-- آیتم‌ها توسط JS پر می‌شوند -->
                </ul>
                <div class="slide-menu-actions">
                    <a href="${base}resume.pdf" download class="btn btn-outline"><i class="fas fa-download"></i> دانلود رزومه</a>
                    <a href="${base}index.html#contact" class="btn btn-primary"><i class="fas fa-paper-plane"></i> درخواست همکاری</a>
                </div>
            </div>
        `;

        const temp = document.createElement('div');
        temp.innerHTML = headerHTML;

        const header = temp.querySelector('.main-header');
        if (header) document.body.prepend(header);

        const overlay = temp.querySelector('#menuOverlay');
        if (overlay) document.body.appendChild(overlay);

        const slide = temp.querySelector('#slideMenu');
        if (slide) document.body.appendChild(slide);

        menuLoaded = true;

        // بارگذاری آیتم‌های منو
        loadMenusFromJson().then(() => {
            renderHeaderMenu();
            renderSlideMenu();
            initMobileMenu();
        });

        console.log('✅ هدر و منوی کشویی با ساختار صحیح ساخته شد.');
    }

    // ============================================================
    // ۶. توابع منوی کشویی (همانند قبل)
    // ============================================================
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

        if (slideMenuClose) {
            const newClose = slideMenuClose.cloneNode(true);
            slideMenuClose.parentNode.replaceChild(newClose, slideMenuClose);
            newClose.addEventListener('click', closeMenu);
            newClose.addEventListener('touchstart', closeMenu, { passive: false });
        }

        if (menuOverlay) {
            const newOverlay = menuOverlay.cloneNode(true);
            menuOverlay.parentNode.replaceChild(newOverlay, menuOverlay);
            newOverlay.addEventListener('click', closeMenu);
            newOverlay.addEventListener('touchstart', closeMenu, { passive: false });
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && slideMenu.classList.contains('active')) {
                closeMenu();
            }
        });

        // بستن منو با کلیک روی لینک‌ها
        slideMenu.querySelectorAll('.slide-menu-link, .slide-menu-actions a').forEach(link => {
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
            newLink.addEventListener('click', closeMenu);
            newLink.addEventListener('touchstart', closeMenu, { passive: false });
        });

        slideMenu.addEventListener('click', function(e) { e.stopPropagation(); });
        slideMenu.addEventListener('touchstart', function(e) { e.stopPropagation(); }, { passive: true });

        // تم تاریک/روشن
        const themeToggle = document.getElementById('themeToggle');
        const currentTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', currentTheme);

        if (themeToggle) {
            const moonIcon = themeToggle.querySelector('.fa-moon');
            const sunIcon = themeToggle.querySelector('.fa-sun');
            if (currentTheme === 'light') {
                if (moonIcon) moonIcon.style.opacity = '0';
                if (sunIcon) { sunIcon.style.opacity = '1'; sunIcon.style.transform = 'translate(50%,-50%) rotate(0deg)'; }
            } else {
                if (moonIcon) moonIcon.style.opacity = '1';
                if (sunIcon) { sunIcon.style.opacity = '0'; sunIcon.style.transform = 'translate(50%,-50%) rotate(90deg)'; }
            }

            themeToggle.addEventListener('click', function() {
                const current = document.documentElement.getAttribute('data-theme');
                const newTheme = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                if (newTheme === 'light') {
                    if (moonIcon) moonIcon.style.opacity = '0';
                    if (sunIcon) { sunIcon.style.opacity = '1'; sunIcon.style.transform = 'translate(50%,-50%) rotate(0deg)'; }
                } else {
                    if (moonIcon) moonIcon.style.opacity = '1';
                    if (sunIcon) { sunIcon.style.opacity = '0'; sunIcon.style.transform = 'translate(50%,-50%) rotate(90deg)'; }
                }
            });
        }

        console.log('✅ منوی کشویی فعال شد.');
    }

    // ============================================================
    // ۷. بارگذاری اولیه
    // ============================================================
    document.addEventListener('DOMContentLoaded', function() {
        loadState();
        buildHeader();

        window.updateUserUI = function() {};
        window.updateCartUI = function() {};
        window.getCartItems = function() { return []; };
    });

    console.log('✅ menu.js (با ساختار container) بارگذاری شد.');
})();
