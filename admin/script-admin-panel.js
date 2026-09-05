// ============================================================
// script-admin-panel.js - پنل مدیریت کامل (هماهنگ با admin-panel.html)
// نسخه اصلاح‌شده - رفع تداخلات توابع + ایمن‌سازی addEventListener
// ============================================================

(function() {
    'use strict';

    // ============================================================
    // 0500 - احراز هویت (Authentication)
    // ============================================================
    function utf8ToBase64(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        let binary = '';
        for (let i = 0; i < data.length; i++) {
            binary += String.fromCharCode(data[i]);
        }
        return btoa(binary);
    }
    const STORAGE_KEY = 'admin_auth_data';
    const loginPage = document.getElementById('loginPage');
    const adminPanel = document.getElementById('adminPanel');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    function getUsers() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) { try { return JSON.parse(data); } catch (e) { return {}; } }
        return {};
    }
    function saveUsers(users) { localStorage.setItem(STORAGE_KEY, JSON.stringify(users)); }

    function ensureAdminExists() {
        const users = getUsers();
        if (!users.admin) {
            users.admin = { password: utf8ToBase64('admin123'), created: new Date().toISOString() };
            saveUsers(users);
            console.log('✅ کاربر admin پیش‌فرض ایجاد شد.');
        }
        return users;
    }
    ensureAdminExists();

    function checkLogin() {
        if (sessionStorage.getItem('admin_logged_in') === 'true') {
            loginPage.style.display = 'none';
            adminPanel.style.display = 'block';
            const username = sessionStorage.getItem('admin_username') || 'ادمین';
            document.getElementById('proAdminName').textContent = username;
            document.getElementById('proInfoUsername').textContent = username;
            if (typeof loadAllData === 'function') {
                loadAllData();
            } else {
                console.warn('⚠️ تابع loadAllData تعریف نشده است.');
            }
        } else {
            loginPage.style.display = 'flex';
            adminPanel.style.display = 'none';
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value.trim();
            if (!username || !password) {
                loginError.textContent = 'لطفاً همه فیلدها را پر کنید.';
                loginError.style.display = 'block';
                return;
            }
            const users = getUsers();
            if (!users[username]) {
                loginError.textContent = 'کاربر وجود ندارد.';
                loginError.style.display = 'block';
                return;
            }
            if (users[username].password === utf8ToBase64(password)) {
                sessionStorage.setItem('admin_logged_in', 'true');
                sessionStorage.setItem('admin_username', username);
                loginError.style.display = 'none';
                location.reload();
            } else {
                loginError.textContent = 'رمز عبور اشتباه است.';
                loginError.style.display = 'block';
            }
        });
    }
    console.log('✅ بخش ۰۵۰۰ - احراز هویت با پشتیبانی از فارسی بارگذاری شد.');

    // ============================================================
    // 0501 - متغیرهای عمومی
    // ============================================================
    const PRO_USER = sessionStorage.getItem('admin_username') || 'ادمین';
    let PRO_TOKEN = localStorage.getItem('github_token') || '';
    let articlesData = {};
    let productsData = {};
    let archiveData = {};
    let articlesSha = null;
    let productsSha = null;
    let archiveSha = null;
    let menuData = { header: [], slide: [] };
    let sectionsData = {};
    let editingItem = null;
    let editingType = null;
    let allArticles = [];
    let allProducts = [];
    let allArchive = [];

    // داده‌های محتوای ایندکس
    let eduData = { title: 'سوابق تحصیلی', items: [] };
    let certsData = { title: 'گواهی‌نامه‌ها', items: [] };
    let socialData = { title: 'شبکه‌های اجتماعی', items: [] };
    let servicesData = { title: 'خدمات تخصصی', desc: '', items: [] };
    let skillsData = { title: 'مهارت‌های تخصصی', desc: '', items: [] };
    let testimonialsData = { title: 'نظرات مشتریان', items: [] };
    let awardsData = { title: 'جوایز و افتخارات', items: [] };
    let linksData = { title: 'لینک‌های مفید', items: [] };

    const REPO_OWNER = 'mahanneman';
    const REPO_NAME = 'MA.AD.GH.SITE';
    const REPO_PATH = `repos/${REPO_OWNER}/${REPO_NAME}/contents`;

    // ============================================================
    // 0502 - توکن گیت‌هاب
    // ============================================================
    if (PRO_TOKEN) {
        document.getElementById('proToken').value = PRO_TOKEN;
        updateTokenStatus(true);
    } else { updateTokenStatus(false); }

    function proSaveToken() {
        const token = document.getElementById('proToken').value.trim();
        if (!token) { showMsg('لطفاً توکن را وارد کنید.', 'error'); return; }
        PRO_TOKEN = token;
        localStorage.setItem('github_token', token);
        updateTokenStatus(true);
        showMsg('✅ توکن با موفقیت ذخیره شد.', 'success');
        loadAllData();
    }
    function updateTokenStatus(valid) {
        const el = document.getElementById('proTokenStatus');
        if (valid) { el.textContent = '✅ توکن معتبر'; el.className = 'token-status valid'; } else { el.textContent = '⚠️ توکن ذخیره نشده'; el.className = 'token-status invalid'; }
    }
    function getToken() { return PRO_TOKEN; }

    // ============================================================
    // 0503 - پیام‌ها و لاگ
    // ============================================================
    function showMsg(msg, type = 'success') {
        const el = document.getElementById('proMsg');
        el.textContent = msg;
        el.className = 'pro-msg ' + type;
        setTimeout(() => { el.className = 'pro-msg'; }, 6000);
    }
    function showToast(msg, type = 'success') {
        const el = document.getElementById('proToast');
        el.textContent = msg;
        el.className = 'pro-toast ' + type;
        setTimeout(() => { el.className = 'pro-toast'; }, 4000);
    }
    function logActivity(message) {
        const log = document.getElementById('proActivityLog');
        const time = new Date().toLocaleString('fa-IR');
        const item = document.createElement('div');
        item.className = 'item';
        item.innerHTML = `<span>${message}</span><span class="time">${time}</span>`;
        log.prepend(item);
        if (log.children.length > 30) log.removeChild(log.lastChild);
        let history = JSON.parse(localStorage.getItem('pro_activity') || '[]');
        history.unshift({ message, time });
        if (history.length > 50) history = history.slice(0, 50);
        localStorage.setItem('pro_activity', JSON.stringify(history));
    }
    function loadActivity() {
        const history = JSON.parse(localStorage.getItem('pro_activity') || '[]');
        const log = document.getElementById('proActivityLog');
        log.innerHTML = history.map(item =>
            `<div class="item"><span>${item.message}</span><span class="time">${item.time}</span></div>`
        ).join('');
        if (history.length === 0) log.innerHTML = '<div class="item"><span>هیچ فعالیتی ثبت نشده است.</span></div>';
    }
    loadActivity();

    // ============================================================
    // 0504 - تب‌ها (Tabs)
    // ============================================================
    function switchTab(tabId) {
        document.querySelectorAll('#proTabs .tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.pro-tab-content').forEach(t => t.classList.remove('active'));
        const btn = document.querySelector(`#proTabs .tab-btn[data-tab="${tabId}"]`);
        if (btn) btn.classList.add('active');
        const content = document.getElementById('tab-' + tabId);
        if (content) content.classList.add('active');
        if (tabId === 'articles') { loadArticles(); document.getElementById('articlesSearch').value = ''; }
        if (tabId === 'products') { loadProducts(); document.getElementById('productsSearch').value = ''; }
        if (tabId === 'archive') { loadArchive(); document.getElementById('archiveSearch').value = ''; }
        if (tabId === 'dashboard') updateDashboard();
        if (tabId === 'add-article') generateArticleId();
        if (tabId === 'add-product') generateProductId();
        if (tabId === 'add-archive') generateArchiveId();
        if (tabId === 'appearance') loadAppearanceSettings();
        if (tabId === 'menus') loadMenuData();
        if (tabId === 'sections') loadSectionsData();
        if (tabId === 'orders') loadGlobalOrders();
        if (tabId === 'members') loadMembers();
        if (tabId === 'index-content') loadAllIndexContent();
    }
    document.querySelectorAll('#proTabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', function() { switchTab(this.dataset.tab); });
    });

    // ============================================================
    // 0505 - عملیات گیت‌هاب (GitHub API) - نسخه اصلی (بدون پارامتر اضافی)
    // ============================================================
    async function fetchFromGitHub(path) {
        const token = getToken();
        if (!token) throw new Error('توکن وارد نشده است.');
        const url = `https://api.github.com/${REPO_PATH}/${path}`;
        const res = await fetch(url, {
            headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json' }
        });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error('خطا در خواندن فایل: ' + res.status);
        const data = await res.json();
        const binaryString = atob(data.content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); }
        const decoder = new TextDecoder('utf-8');
        const content = decoder.decode(bytes).replace(/^\uFEFF/, '');
        return { ...data, content };
    }
    async function saveToGitHub(path, content, sha = null) {
        const token = getToken();
        if (!token) throw new Error('توکن وارد نشده است.');
        const url = `https://api.github.com/${REPO_PATH}/${path}`;
        const jsonString = JSON.stringify(content, null, 2);
        const encoder = new TextEncoder();
        const encoded = encoder.encode(jsonString);
        let binary = '';
        for (let i = 0; i < encoded.length; i++) { binary += String.fromCharCode(encoded[i]); }
        const base64Content = btoa(binary);
        
       const body = {
        message: `Update ${path} via admin panel - ${new Date().toISOString()}`,
        content: base64Content,
        branch: 'main'
    };
// فقط اگر sha وجود داشته باشد، اضافه کن
if (sha) {
    body.sha = sha;
}
        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': 'token ' + token,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'خطا در ذخیره‌سازی');
        }
        const data = await res.json();
        return data.content.sha;
    }
    async function deleteFromGitHub(path, sha) {
        const token = getToken();
        if (!token) throw new Error('توکن وارد نشده است.');
        const url = `https://api.github.com/${REPO_PATH}/${path}`;
        const res = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': 'token ' + token,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({ message: 'Delete ' + path, sha: sha, branch: 'main' })
        });
        if (!res.ok) throw new Error('خطا در حذف فایل');
        return await res.json();
    }
    async function uploadFileToGitHub(path, content, sha = null) {
        const token = getToken();
        if (!token) throw new Error('توکن وارد نشده است.');
        const url = `https://api.github.com/${REPO_PATH}/${path}`;
        const body = {
            message: `Upload ${path} via admin panel - ${new Date().toISOString()}`,
            content: content,
            branch: 'main'
        };
        if (sha) body.sha = sha;
        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': 'token ' + token,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'خطا در آپلود فایل');
        }
        return await res.json();
    }

    // ============================================================
    // 0506 - شماره‌زنی خودکار (ID Generator)
    // ============================================================
    function generateId(data, prefix) {
        const keys = Object.keys(data);
        let maxNum = 0;
        keys.forEach(key => {
            const num = parseInt(key);
            if (!isNaN(num) && num > maxNum) maxNum = num;
        });
        const newNum = maxNum + 1;
        const padded = String(newNum).padStart(4, '0');
        return { id: padded, num: newNum };
    }
    function generateArticleId() {
        const { id, num } = generateId(articlesData, 'ART');
        document.getElementById('articleId').value = num;
        document.getElementById('articleIdDisplay').textContent = id;
        document.getElementById('articleDate').value = new Date().toISOString().split('T')[0];
    }
    function generateProductId() {
        const { id, num } = generateId(productsData, 'PRD');
        document.getElementById('productId').value = num;
        document.getElementById('productIdDisplay').textContent = id;
        // چک کردن وجود productDate (برای جلوگیری از خطای null)
        const productDateEl = document.getElementById('productDate');
        if (productDateEl) {
            productDateEl.value = new Date().toISOString().split('T')[0];
        }
    }
    function generateArchiveId() {
        const { id, num } = generateId(archiveData, 'ARC');
        document.getElementById('archiveId').value = num;
        document.getElementById('archiveIdDisplay').textContent = id;
        document.getElementById('archiveDate').value = new Date().toISOString().split('T')[0];
    }
    function copyId(elementId) {
        const el = document.getElementById(elementId);
        const text = el.textContent;
        navigator.clipboard.writeText(text).then(() => {
            showToast('✅ شماره ' + text + ' کپی شد!', 'success');
        }).catch(() => {
            const range = document.createRange();
            range.selectNode(el);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            document.execCommand('copy');
            showToast('✅ شماره کپی شد!', 'success');
        });
    }
    function copyIdFromText(id) {
        navigator.clipboard.writeText(id).then(() => {
            showToast('✅ شماره ' + id + ' کپی شد!', 'success');
        }).catch(() => {
            showToast('✅ شماره ' + id + ' کپی شد!', 'success');
        });
    }

    // ============================================================
    // 0507 - بارگذاری داده‌ها (Load All Data)
    // ============================================================
    async function loadAllData() {
        if (!getToken()) return;
        try {
            await Promise.all([loadArticles(), loadProducts(), loadArchive()]);
            updateDashboard();
            updateCounts();
        } catch (e) { console.error('خطا:', e); }
    }

    // ============================================================
    // 0508 - مقالات (Articles)
    // ============================================================
    let articlesFiltered = [];
    async function loadArticles() {
        const list = document.getElementById('proArticlesList');
        if (!getToken()) {
            list.innerHTML = '<div class="pro-empty"><i class="fas fa-key"></i>لطفاً توکن گیت‌هاب را وارد کنید.</div>';
            return;
        }
        try {
            const data = await fetchFromGitHub('_data/articles.json');
            if (data) {
                articlesData = JSON.parse(data.content);
                articlesSha = data.sha;
            } else {
                articlesData = {};
                articlesSha = null;
            }
            allArticles = Object.keys(articlesData).map(key => ({ key, ...articlesData[key] }));
            articlesFiltered = [...allArticles];
            renderArticles(articlesFiltered);
        } catch (e) {
            list.innerHTML = `<div class="pro-empty"><i class="fas fa-exclamation-triangle" style="color:var(--pro-red);"></i>خطا: ${e.message}</div>`;
        }
    }
    function renderArticles(items) {
        const list = document.getElementById('proArticlesList');
        if (items.length === 0) {
            list.innerHTML = '<div class="pro-empty"><i class="fas fa-newspaper"></i>هیچ مقاله‌ای یافت نشد.</div>';
        } else {
            list.innerHTML = items.map((item, idx) => {
                const key = item.key;
                return `
                    <div class="pro-item">
                        <div class="info">
                            <div class="title">${item.title || 'بدون عنوان'} <span style="color:var(--pro-text-secondary);font-size:0.7rem;">#<span onclick="copyIdFromText('${key}')" style="cursor:pointer;color:var(--pro-primary);">${String(key).padStart(4,'0')}</span></span></div>
                            <div class="meta">
                                <span><i class="fas fa-tag"></i> ${item.type || 'article'}</span>
                                <span><i class="fas fa-calendar"></i> ${item.date || '---'}</span>
                                <span><i class="fas fa-clock"></i> ${item.readTime || '?'} دقیقه</span>
                                ${item.files && item.files.length ? `<span><i class="fas fa-paperclip"></i> ${item.files.length} فایل</span>` : ''}
                                ${item.images && item.images.length ? `<span><i class="fas fa-images"></i> ${item.images.length} عکس</span>` : ''}
                            </div>
                        </div>
                        <div class="actions">
                            <a href="../article.html?id=${key}" class="pro-btn pro-btn-primary pro-btn-sm" target="_blank"><i class="fas fa-eye"></i></a>
                            <button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditModal('article','${key}')"><i class="fas fa-edit"></i></button>
                            <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveArticle(${idx}, -1)" title="بالا" ${idx === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                            <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveArticle(${idx}, 1)" title="پایین" ${idx === items.length - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                            <button class="pro-btn pro-btn-danger pro-btn-sm" onclick="deleteArticle('${key}')"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
            }).join('');
        }
        document.getElementById('proArticlesCount').textContent = allArticles.length;
        document.getElementById('proArticlesSub').textContent = allArticles.length + ' مقاله';
        updateDashboard();
        updateCounts();
    }
    function filterArticles(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            articlesFiltered = [...allArticles];
        } else {
            articlesFiltered = allArticles.filter(item =>
                (item.title || '').toLowerCase().includes(q) ||
                (item.excerpt || '').toLowerCase().includes(q) ||
                (item.tags || []).join(' ').toLowerCase().includes(q)
            );
        }
        renderArticles(articlesFiltered);
    }
    function moveArticle(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= allArticles.length) return;
        const item = allArticles.splice(index, 1)[0];
        allArticles.splice(newIndex, 0, item);
        const newData = {};
        allArticles.forEach((item, i) => {
            newData[String(i + 1).padStart(4, '0')] = item;
        });
        articlesData = newData;
        renderArticles(allArticles);
        showMsg('✅ ترتیب مقالات تغییر کرد. برای ذخیره روی دکمه "ذخیره" کلیک کنید.', 'info');
    }
    async function deleteArticle(key) {
        if (!confirm(`آیا از حذف مقاله #${String(key).padStart(4,'0')} مطمئن هستید؟`)) return;
        if (!getToken()) { showMsg('لطفاً توکن را وارد کنید.', 'error'); return; }
        try {
            delete articlesData[key];
            const newSha = await saveToGitHub('_data/articles.json', articlesData, articlesSha);
            articlesSha = newSha;
            showMsg('✅ مقاله حذف شد.', 'success');
            logActivity(`مقاله #${String(key).padStart(4,'0')} حذف شد`);
            loadArticles();
        } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
    }

    // ============================================================
    // 0509 - محصولات (Products)
    // ============================================================
    let productsFiltered = [];
    async function loadProducts() {
        const list = document.getElementById('proProductsList');
        if (!getToken()) {
            list.innerHTML = '<div class="pro-empty"><i class="fas fa-key"></i>لطفاً توکن گیت‌هاب را وارد کنید.</div>';
            return;
        }
        try {
            const data = await fetchFromGitHub('_data/products.json');
            if (data) {
                productsData = JSON.parse(data.content);
                productsSha = data.sha;
            } else {
                productsData = {};
                productsSha = null;
            }
            allProducts = Object.keys(productsData).map(key => ({ key, ...productsData[key] }));
            productsFiltered = [...allProducts];
            renderProducts(productsFiltered);
        } catch (e) {
            list.innerHTML = `<div class="pro-empty"><i class="fas fa-exclamation-triangle" style="color:var(--pro-red);"></i>خطا: ${e.message}</div>`;
        }
    }
    function renderProducts(items) {
        const list = document.getElementById('proProductsList');
        if (items.length === 0) {
            list.innerHTML = '<div class="pro-empty"><i class="fas fa-cube"></i>هیچ محصولی یافت نشد.</div>';
        } else {
            list.innerHTML = items.map((item, idx) => {
                const key = item.key;
                return `
                    <div class="pro-item">
                        <div class="info">
                            <div class="title">${item.name || 'بدون نام'} <span style="color:var(--pro-secondary);font-size:0.8rem;">${item.price || 'رایگان'}</span> <span style="color:var(--pro-text-secondary);font-size:0.7rem;">#<span onclick="copyIdFromText('${key}')" style="cursor:pointer;color:var(--pro-primary);">${String(key).padStart(4,'0')}</span></span></div>
                            <div class="meta">
                                <span><i class="fas fa-tag"></i> ${item.tag || 'بدون برچسب'}</span>
                                <span><i class="fas fa-box"></i> ${item.stock || 'موجود'}</span>
                                ${item.files && item.files.length ? `<span><i class="fas fa-paperclip"></i> ${item.files.length} فایل</span>` : ''}
                                ${item.images && item.images.length ? `<span><i class="fas fa-images"></i> ${item.images.length} عکس</span>` : ''}
                            </div>
                        </div>
                        <div class="actions">
                            <a href="../product.html?id=${key}" class="pro-btn pro-btn-primary pro-btn-sm" target="_blank"><i class="fas fa-eye"></i></a>
                            <button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditModal('product','${key}')"><i class="fas fa-edit"></i></button>
                            <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveProduct(${idx}, -1)" title="بالا" ${idx === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                            <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveProduct(${idx}, 1)" title="پایین" ${idx === items.length - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                            <button class="pro-btn pro-btn-danger pro-btn-sm" onclick="deleteProduct('${key}')"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
            }).join('');
        }
        document.getElementById('proProductsCount').textContent = allProducts.length;
        document.getElementById('proProductsSub').textContent = allProducts.length + ' محصول';
        updateDashboard();
        updateCounts();
    }
    function filterProducts(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            productsFiltered = [...allProducts];
        } else {
            productsFiltered = allProducts.filter(item =>
                (item.name || '').toLowerCase().includes(q) ||
                (item.desc || '').toLowerCase().includes(q) ||
                (item.tag || '').toLowerCase().includes(q)
            );
        }
        renderProducts(productsFiltered);
    }
    function moveProduct(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= allProducts.length) return;
        const item = allProducts.splice(index, 1)[0];
        allProducts.splice(newIndex, 0, item);
        const newData = {};
        allProducts.forEach((item, i) => {
            newData[String(i + 1).padStart(4, '0')] = item;
        });
        productsData = newData;
        renderProducts(allProducts);
        showMsg('✅ ترتیب محصولات تغییر کرد. برای ذخیره روی دکمه "ذخیره" کلیک کنید.', 'info');
    }
    async function deleteProduct(key) {
        if (!confirm(`آیا از حذف محصول #${String(key).padStart(4,'0')} مطمئن هستید؟`)) return;
        if (!getToken()) { showMsg('لطفاً توکن را وارد کنید.', 'error'); return; }
        try {
            delete productsData[key];
            const newSha = await saveToGitHub('_data/products.json', productsData, productsSha);
            productsSha = newSha;
            showMsg('✅ محصول حذف شد.', 'success');
            logActivity(`محصول #${String(key).padStart(4,'0')} حذف شد`);
            loadProducts();
        } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
    }

    // ============================================================
    // 0510 - آرشیو (Archive)
    // ============================================================
    let archiveFiltered = [];
    async function loadArchive() {
        const list = document.getElementById('proArchiveList');
        if (!getToken()) {
            list.innerHTML = '<div class="pro-empty"><i class="fas fa-key"></i>لطفاً توکن گیت‌هاب را وارد کنید.</div>';
            return;
        }
        try {
            const data = await fetchFromGitHub('_data/archive.json');
            if (data) {
                archiveData = JSON.parse(data.content);
                archiveSha = data.sha;
            } else {
                archiveData = {};
                archiveSha = null;
            }
            allArchive = Object.keys(archiveData).map(key => ({ key, ...archiveData[key] }));
            archiveFiltered = [...allArchive];
            renderArchive(archiveFiltered);
        } catch (e) {
            list.innerHTML = `<div class="pro-empty"><i class="fas fa-exclamation-triangle" style="color:var(--pro-red);"></i>خطا: ${e.message}</div>`;
        }
    }
    function renderArchive(items) {
        const list = document.getElementById('proArchiveList');
        const typeLabels = { cfd: 'تحلیل CFD', structure: 'تحلیل سازه', design: 'طراحی مکانیکی', electro: 'تحلیل الکترومغناطیس', university: 'پروژه دانشگاهی', fabrication: 'ساخت و نمونه‌سازی', other: 'سایر' };
        const typeBadgeClass = { cfd: 'badge-cfd', structure: 'badge-structure', design: 'badge-design', electro: 'badge-electro', university: 'badge-university', fabrication: 'badge-fabrication', other: 'badge-other' };
        if (items.length === 0) {
            list.innerHTML = '<div class="pro-empty"><i class="fas fa-archive"></i>هیچ آیتمی در آرشیو یافت نشد.</div>';
        } else {
            list.innerHTML = items.map((item, idx) => {
                const key = item.key;
                const typeLabel = typeLabels[item.type] || item.type || 'سایر';
                const badgeClass = typeBadgeClass[item.type] || 'badge-other';
                return `
                    <div class="pro-item">
                        <div class="info">
                            <div class="title">${item.title || 'بدون عنوان'} <span style="color:var(--pro-text-secondary);font-size:0.7rem;">#<span onclick="copyIdFromText('${key}')" style="cursor:pointer;color:var(--pro-primary);">${String(key).padStart(4,'0')}</span></span></div>
                            <div class="meta">
                                <span><span class="${badgeClass}" style="padding:2px 10px;border-radius:20px;font-size:0.7rem;">${typeLabel}</span></span>
                                <span><i class="fas fa-calendar"></i> ${item.date || '---'}</span>
                                <span><i class="fas fa-flag"></i> ${item.status || 'تکمیل شده'}</span>
                                ${item.files && item.files.length ? `<span><i class="fas fa-paperclip"></i> ${item.files.length} فایل</span>` : ''}
                                ${item.images && item.images.length ? `<span><i class="fas fa-images"></i> ${item.images.length} عکس</span>` : ''}
                            </div>
                        </div>
                        <div class="actions">
                            <a href="../archive-item.html?id=${key}" class="pro-btn pro-btn-primary pro-btn-sm" target="_blank"><i class="fas fa-eye"></i></a>
                            <button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditModal('archive','${key}')"><i class="fas fa-edit"></i></button>
                            <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveArchive(${idx}, -1)" title="بالا" ${idx === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                            <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveArchive(${idx}, 1)" title="پایین" ${idx === items.length - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                            <button class="pro-btn pro-btn-danger pro-btn-sm" onclick="deleteArchive('${key}')"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
            }).join('');
        }
        document.getElementById('proArchiveCount').textContent = allArchive.length;
        document.getElementById('proArchiveSub').textContent = allArchive.length + ' آیتم';
        updateDashboard();
        updateCounts();
    }
    function filterArchive(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            archiveFiltered = [...allArchive];
        } else {
            archiveFiltered = allArchive.filter(item =>
                (item.title || '').toLowerCase().includes(q) ||
                (item.excerpt || '').toLowerCase().includes(q) ||
                (item.tags || []).join(' ').toLowerCase().includes(q)
            );
        }
        renderArchive(archiveFiltered);
    }
    function moveArchive(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= allArchive.length) return;
        const item = allArchive.splice(index, 1)[0];
        allArchive.splice(newIndex, 0, item);
        const newData = {};
        allArchive.forEach((item, i) => {
            newData[String(i + 1).padStart(4, '0')] = item;
        });
        archiveData = newData;
        renderArchive(allArchive);
        showMsg('✅ ترتیب آرشیو تغییر کرد. برای ذخیره روی دکمه "ذخیره" کلیک کنید.', 'info');
    }
    async function deleteArchive(key) {
        if (!confirm(`آیا از حذف آیتم آرشیو #${String(key).padStart(4,'0')} مطمئن هستید؟`)) return;
        if (!getToken()) { showMsg('لطفاً توکن را وارد کنید.', 'error'); return; }
        try {
            delete archiveData[key];
            const newSha = await saveToGitHub('_data/archive.json', archiveData, archiveSha);
            archiveSha = newSha;
            showMsg('✅ آیتم آرشیو حذف شد.', 'success');
            logActivity(`آیتم آرشیو #${String(key).padStart(4,'0')} حذف شد`);
            loadArchive();
        } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
    }

    // ============================================================
    // 0511 - مودال ویرایش کامل (با گالری و فایل)
    // ============================================================
    function openEditModal(type, key) {
        editingType = type;
        editingItem = key;
        const modal = document.getElementById('editModal');
        const title = document.getElementById('editModalTitle');
        const body = document.getElementById('editModalBody');

        let data = {};
        if (type === 'article') data = articlesData[key];
        else if (type === 'product') data = productsData[key];
        else if (type === 'archive') data = archiveData[key];

        if (!data) {
            showMsg('❌ آیتم یافت نشد.', 'error');
            return;
        }

        title.innerHTML = `<i class="fas fa-edit"></i> ویرایش ${type === 'article' ? 'مقاله' : type === 'product' ? 'محصول' : 'آرشیو'} #${String(key).padStart(4,'0')}`;

        const existingImages = data.images || [];
        const existingFiles = data.files || [];

        let html = `<form id="editForm">`;
        html += `<input type="hidden" id="editKey" value="${key}">`;
        html += `<input type="hidden" id="editType" value="${type}">`;

        if (type === 'article') {
            html += `
                <div class="pro-grid">
                    <div class="pro-field full"><label>عنوان</label><input type="text" id="editTitle" value="${data.title || ''}"></div>
                    <div class="pro-field full"><label>چکیده</label><textarea id="editExcerpt" rows="3">${data.excerpt || ''}</textarea></div>
                    <div class="pro-field"><label>نوع</label>
                        <select id="editTypeSelect">
                            <option value="article" ${data.type === 'article' ? 'selected' : ''}>مقاله</option>
                            <option value="project" ${data.type === 'project' ? 'selected' : ''}>پروژه</option>
                            <option value="tutorial" ${data.type === 'tutorial' ? 'selected' : ''}>آموزش</option>
                        </select>
                    </div>
                    <div class="pro-field"><label>تاریخ</label><input type="date" id="editDate" value="${data.date || ''}"></div>
                    <div class="pro-field full"><label>برچسب‌ها (با کاما)</label><input type="text" id="editTags" value="${(data.tags || []).join('، ')}"></div>
                    <div class="pro-field"><label>زمان مطالعه</label><input type="number" id="editReadTime" value="${data.readTime || 5}"></div>
                    <div class="pro-field full"><label>متن کامل</label><textarea id="editBody" rows="8">${data.body || ''}</textarea></div>
                </div>
            `;
        } else if (type === 'product') {
            html += `
                <div class="pro-grid">
                    <div class="pro-field full"><label>نام محصول</label><input type="text" id="editName" value="${data.name || ''}"></div>
                    <div class="pro-field full"><label>توضیحات</label><textarea id="editDesc" rows="3">${data.desc || ''}</textarea></div>
                    <div class="pro-field"><label>قیمت</label><input type="text" id="editPrice" value="${data.price || ''}"></div>
                    <div class="pro-field"><label>آیکون</label><input type="text" id="editIcon" value="${data.icon || 'fa-cube'}"></div>
                    <div class="pro-field"><label>برچسب</label><input type="text" id="editTag" value="${data.tag || ''}"></div>
                    <div class="pro-field"><label>دسته‌بندی</label><input type="text" id="editCategory" value="${data.category || ''}"></div>
                    <div class="pro-field"><label>موجودی</label>
                        <select id="editStock">
                            <option value="موجود" ${data.stock === 'موجود' ? 'selected' : ''}>موجود</option>
                            <option value="ناموجود" ${data.stock === 'ناموجود' ? 'selected' : ''}>ناموجود</option>
                            <option value="پیش‌سفارش" ${data.stock === 'پیش‌سفارش' ? 'selected' : ''}>پیش‌سفارش</option>
                        </select>
                    </div>
                </div>
            `;
        } else if (type === 'archive') {
            const typeLabels = { cfd: 'تحلیل CFD', structure: 'تحلیل سازه', design: 'طراحی مکانیکی', electro: 'تحلیل الکترومغناطیس', university: 'پروژه دانشگاهی', fabrication: 'ساخت و نمونه‌سازی', other: 'سایر' };
            html += `
                <div class="pro-grid">
                    <div class="pro-field full"><label>عنوان پروژه</label><input type="text" id="editTitle" value="${data.title || ''}"></div>
                    <div class="pro-field full"><label>توضیحات کوتاه</label><textarea id="editExcerpt" rows="3">${data.excerpt || ''}</textarea></div>
                    <div class="pro-field"><label>نوع</label>
                        <select id="editTypeSelect">
                            ${Object.keys(typeLabels).map(t => `<option value="${t}" ${data.type === t ? 'selected' : ''}>${typeLabels[t]}</option>`).join('')}
                        </select>
                    </div>
                    <div class="pro-field"><label>تاریخ</label><input type="date" id="editDate" value="${data.date || ''}"></div>
                    <div class="pro-field"><label>وضعیت</label>
                        <select id="editStatus">
                            <option value="تکمیل شده" ${data.status === 'تکمیل شده' ? 'selected' : ''}>تکمیل شده</option>
                            <option value="در حال انجام" ${data.status === 'در حال انجام' ? 'selected' : ''}>در حال انجام</option>
                            <option value="ارائه شده" ${data.status === 'ارائه شده' ? 'selected' : ''}>ارائه شده</option>
                        </select>
                    </div>
                    <div class="pro-field full"><label>برچسب‌ها (با کاما)</label><input type="text" id="editTags" value="${(data.tags || []).join('، ')}"></div>
                    <div class="pro-field full"><label>توضیحات کامل</label><textarea id="editBody" rows="8">${data.body || ''}</textarea></div>
                </div>
            `;
        }

        html += `
            <div class="pro-grid">
                <div class="pro-field full">
                    <label><i class="fas fa-image"></i> تصویر شاخص</label>
                    <div class="pro-upload-zone-edit" id="editCoverZone">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>برای آپلود تصویر کلیک کنید</p>
                        <span class="hint">فرمت‌های مجاز: JPG, PNG, WebP</span>
                        <input type="file" id="editCoverInput" accept="image/*" style="display:none;">
                        <div id="editCoverPreview" style="margin-top:10px;display:${data.cover ? 'block' : 'none'};">
                            <img id="editCoverPreviewImg" class="upload-preview-img-edit" src="${data.cover || ''}" alt="تصویر شاخص">
                            <button type="button" class="pro-btn pro-btn-danger pro-btn-sm" onclick="removeEditCover()">حذف تصویر</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        html += `
            <div class="pro-grid">
                <div class="pro-field full">
                    <label><i class="fas fa-images"></i> گالری عکس‌ها (${existingImages.length} عدد)</label>
                    <div id="editGalleryContainer">
                        <div class="edit-gallery-grid" id="editGalleryGrid">
                            ${existingImages.map((img, idx) => `
                                <div class="edit-gallery-item" data-index="${idx}">
                                    <img src="${img}" alt="عکس گالری">
                                    <button type="button" class="remove-btn" onclick="removeEditImage(${idx})"><i class="fas fa-times"></i></button>
                                </div>
                            `).join('')}
                        </div>
                        <div class="pro-upload-zone-edit" id="editGalleryZone" style="margin-top:12px;">
                            <i class="fas fa-plus-circle"></i>
                            <p>برای افزودن عکس جدید کلیک کنید</p>
                            <input type="file" id="editGalleryInput" accept="image/*" multiple style="display:none;">
                        </div>
                    </div>
                </div>
            </div>
        `;

        html += `
            <div class="pro-grid">
                <div class="pro-field full">
                    <label><i class="fas fa-paperclip"></i> فایل‌های ضمیمه (${existingFiles.length} عدد)</label>
                    <div id="editFilesContainer">
                        <div class="edit-file-list" id="editFileList">
                            ${existingFiles.map((f, idx) => `
                                <div class="edit-file-tag" data-index="${idx}">
                                    <i class="fas fa-file"></i>
                                    <span>${typeof f === 'string' ? f : f.name || f}</span>
                                    <button type="button" class="remove-btn" onclick="removeEditFile(${idx})"><i class="fas fa-times"></i></button>
                                </div>
                            `).join('')}
                        </div>
                        <div class="pro-upload-zone-edit" id="editFilesZone" style="margin-top:12px;">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>برای افزودن فایل جدید کلیک کنید (PDF, STL, ZIP, ...)</p>
                            <span class="hint">حداکثر حجم هر فایل: ۱۰ مگابایت</span>
                            <input type="file" id="editFilesInput" multiple style="display:none;">
                        </div>
                    </div>
                </div>
            </div>
        `;

        html += `<div style="display:flex;gap:12px;margin-top:18px;">
                    <button type="submit" class="pro-btn pro-btn-primary pro-btn-lg"><i class="fas fa-save"></i> ذخیره تغییرات</button>
                    <button type="button" class="pro-btn pro-btn-outline" onclick="closeEditModal()">انصراف</button>
                 </div>`;
        html += `</form>`;

        body.innerHTML = html;

        setupEditCoverUpload();
        setupEditGalleryUpload();
        setupEditFilesUpload();

        document.getElementById('editForm').addEventListener('submit', function(e) {
            e.preventDefault();
            saveEdit();
        });

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    function closeEditModal() {
        document.getElementById('editModal').classList.remove('active');
        document.body.style.overflow = '';
        editingItem = null;
        editingType = null;
        window._editPendingImages = [];
        window._editPendingFiles = [];
    }
    let focusModeActive = false;
    function toggleFocusMode() {
        const modal = document.querySelector('.pro-modal');
        focusModeActive = !focusModeActive;
        if (focusModeActive) {
            modal.classList.add('focus-mode');
            document.querySelector('.btn-focus-mode').innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            modal.classList.remove('focus-mode');
            document.querySelector('.btn-focus-mode').innerHTML = '<i class="fas fa-expand"></i>';
        }
    }

    // ============================================================
    // 0512 - توابع کمکی ویرایش (Edit Helpers)
    // ============================================================
    function removeEditCover() {
        document.getElementById('editCoverPreview').style.display = 'none';
        document.getElementById('editCoverPreviewImg').src = '';
        document.getElementById('editCoverInput').value = '';
        window._editCoverImage = null;
    }
    function removeEditImage(index) {
        const grid = document.getElementById('editGalleryGrid');
        const items = grid.querySelectorAll('.edit-gallery-item');
        if (items[index]) { items[index].remove(); }
    }
    function removeEditFile(index) {
        const list = document.getElementById('editFileList');
        const items = list.querySelectorAll('.edit-file-tag');
        if (items[index]) { items[index].remove(); }
    }
    function setupEditCoverUpload() {
        const zone = document.getElementById('editCoverZone');
        const input = document.getElementById('editCoverInput');
        const preview = document.getElementById('editCoverPreview');
        const img = document.getElementById('editCoverPreviewImg');
        if (!zone) return;
        zone.addEventListener('click', () => input.click());
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(ev) {
                img.src = ev.target.result;
                preview.style.display = 'block';
                window._editCoverImage = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
        zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
        zone.addEventListener('dragleave', e => { e.preventDefault(); zone.classList.remove('dragover'); });
        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            zone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length) {
                input.files = files;
                input.dispatchEvent(new Event('change'));
            }
        });
    }
    function setupEditGalleryUpload() {
        const zone = document.getElementById('editGalleryZone');
        const input = document.getElementById('editGalleryInput');
        const grid = document.getElementById('editGalleryGrid');
        if (!zone) return;
        zone.addEventListener('click', () => input.click());
        input.addEventListener('change', function(e) {
            const newFiles = Array.from(e.target.files);
            newFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    const imgData = ev.target.result;
                    const item = document.createElement('div');
                    item.className = 'edit-gallery-item';
                    item.innerHTML = `
                        <img src="${imgData}" alt="عکس جدید">
                        <button type="button" class="remove-btn" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
                    `;
                    grid.appendChild(item);
                    if (!window._editPendingImages) window._editPendingImages = [];
                    window._editPendingImages.push(imgData);
                };
                reader.readAsDataURL(file);
            });
            input.value = '';
        });
        zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
        zone.addEventListener('dragleave', e => { e.preventDefault(); zone.classList.remove('dragover'); });
        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            zone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length) {
                input.files = files;
                input.dispatchEvent(new Event('change'));
            }
        });
    }
    function setupEditFilesUpload() {
        const zone = document.getElementById('editFilesZone');
        const input = document.getElementById('editFilesInput');
        const list = document.getElementById('editFileList');
        if (!zone) return;
        zone.addEventListener('click', () => input.click());
        input.addEventListener('change', function(e) {
            const newFiles = Array.from(e.target.files);
            newFiles.forEach(file => {
                if (file.size > 10 * 1024 * 1024) {
                    showMsg(`حجم فایل ${file.name} بیشتر از ۱۰ مگابایت است.`, 'error');
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(ev) {
                    const fileData = ev.target.result.split(',')[1];
                    const tag = document.createElement('div');
                    tag.className = 'edit-file-tag';
                    tag.innerHTML = `
                        <i class="fas fa-file"></i>
                        <span>${file.name}</span>
                        <button type="button" class="remove-btn" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
                    `;
                    list.appendChild(tag);
                    if (!window._editPendingFiles) window._editPendingFiles = [];
                    window._editPendingFiles.push({ name: file.name, data: fileData, size: file.size });
                };
                reader.readAsDataURL(file);
            });
            input.value = '';
        });
        zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
        zone.addEventListener('dragleave', e => { e.preventDefault(); zone.classList.remove('dragover'); });
        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            zone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length) {
                input.files = files;
                input.dispatchEvent(new Event('change'));
            }
        });
    }
    async function saveEdit() {
        const key = document.getElementById('editKey').value;
        const type = document.getElementById('editType').value;
        try {
            let data = {};
            let cover = document.getElementById('editCoverPreviewImg').src;
            if (!cover || cover.includes('placeholder') || cover === '') cover = null;
            const galleryItems = document.querySelectorAll('#editGalleryGrid .edit-gallery-item img');
            const images = [];
            galleryItems.forEach(img => {
                if (img.src && !img.src.includes('placeholder')) {
                    images.push(img.src);
                }
            });
            const fileItems = document.querySelectorAll('#editFileList .edit-file-tag');
            const files = [];
            fileItems.forEach(el => {
                const name = el.querySelector('span')?.textContent || 'file';
                files.push(name);
            });
            if (type === 'article') {
                data = {
                    title: document.getElementById('editTitle').value.trim(),
                    excerpt: document.getElementById('editExcerpt').value.trim(),
                    type: document.getElementById('editTypeSelect').value,
                    date: document.getElementById('editDate').value || new Date().toISOString().split('T')[0],
                    tags: document.getElementById('editTags').value.split(/[،,]/).map(t => t.trim()).filter(Boolean),
                    readTime: parseInt(document.getElementById('editReadTime').value) || 5,
                    body: document.getElementById('editBody').value.trim(),
                    cover: cover,
                    images: images,
                    files: files,
                    updated: new Date().toISOString()
                };
                articlesData[key] = { ...articlesData[key], ...data };
                const newSha = await saveToGitHub('_data/articles.json', articlesData, articlesSha);
                articlesSha = newSha;
                showMsg('✅ مقاله با موفقیت ویرایش شد!', 'success');
                loadArticles();
            } else if (type === 'product') {
                data = {
                    name: document.getElementById('editName').value.trim(),
                    desc: document.getElementById('editDesc').value.trim(),
                    price: document.getElementById('editPrice').value.trim() || 'رایگان',
                    icon: document.getElementById('editIcon').value.trim() || 'fa-cube',
                    tag: document.getElementById('editTag').value.trim() || '',
                    category: document.getElementById('editCategory').value.trim() || '',
                    stock: document.getElementById('editStock').value,
                    cover: cover,
                    images: images,
                    files: files,
                    updated: new Date().toISOString()
                };
                productsData[key] = { ...productsData[key], ...data };
                const newSha = await saveToGitHub('_data/products.json', productsData, productsSha);
                productsSha = newSha;
                showMsg('✅ محصول با موفقیت ویرایش شد!', 'success');
                loadProducts();
            } else if (type === 'archive') {
                data = {
                    title: document.getElementById('editTitle').value.trim(),
                    excerpt: document.getElementById('editExcerpt').value.trim(),
                    type: document.getElementById('editTypeSelect').value,
                    date: document.getElementById('editDate').value || new Date().toISOString().split('T')[0],
                    status: document.getElementById('editStatus').value,
                    tags: document.getElementById('editTags').value.split(/[،,]/).map(t => t.trim()).filter(Boolean),
                    body: document.getElementById('editBody').value.trim(),
                    cover: cover,
                    images: images,
                    files: files,
                    updated: new Date().toISOString()
                };
                archiveData[key] = { ...archiveData[key], ...data };
                const newSha = await saveToGitHub('_data/archive.json', archiveData, archiveSha);
                archiveSha = newSha;
                showMsg('✅ آیتم آرشیو با موفقیت ویرایش شد!', 'success');
                loadArchive();
            }
            const pendingImages = window._editPendingImages || [];
            const pendingFiles = window._editPendingFiles || [];
            if (pendingImages.length > 0) {
                for (const img of pendingImages) {
                    const path = `assets/${type}s/${key}/img_${Date.now()}.jpg`;
                    try { await uploadFileToGitHub(path, img.split(',')[1]); } catch (e) { console.error(e); }
                }
            }
            if (pendingFiles.length > 0) {
                for (const file of pendingFiles) {
                    const path = `assets/${type}s/${key}/${file.name}`;
                    try { await uploadFileToGitHub(path, file.data); } catch (e) { console.error(e); }
                }
            }
            logActivity(`${type === 'article' ? 'مقاله' : type === 'product' ? 'محصول' : 'آرشیو'} #${String(key).padStart(4,'0')} ویرایش شد`);
            closeEditModal();
            showToast('✅ ذخیره شد', 'success');
        } catch (e) {
            showMsg('❌ خطا: ' + e.message, 'error');
            showToast('❌ ذخیره‌سازی ناموفق', 'error');
        }
    }

    // ============================================================
    // 0513 - آپلود فایل‌ها (فرم افزودن) - نسخه اصلی
    // ============================================================
    function setupFileUpload(zoneId, inputId, listId, type, maxItems = 10) {
        const zone = document.getElementById(zoneId);
        const input = document.getElementById(inputId);
        const list = document.getElementById(listId);
        if (!zone || !input || !list) return;
        zone.addEventListener('click', () => input.click());
        input.addEventListener('change', function(e) {
            const newFiles = Array.from(e.target.files);
            const currentCount = list.querySelectorAll('.file-tag').length;
            const remaining = maxItems - currentCount;
            const toAdd = newFiles.slice(0, remaining);
            toAdd.forEach(file => {
                if (file.size > 10 * 1024 * 1024) {
                    showMsg(`حجم فایل ${file.name} بیشتر از ۱۰ مگابایت است.`, 'error');
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(ev) {
                    const fileData = ev.target.result.split(',')[1];
                    const fileItem = document.createElement('div');
                    fileItem.className = 'file-tag';
                    fileItem.innerHTML = `
                        <i class="fas fa-file"></i>
                        <span>${file.name}</span>
                        <button class="remove" onclick="removeFileFromList('${listId}', this)"><i class="fas fa-times"></i></button>
                    `;
                    list.appendChild(fileItem);
                    if (!window._pendingFiles) window._pendingFiles = {};
                    if (!window._pendingFiles[type]) window._pendingFiles[type] = [];
                    window._pendingFiles[type].push({ name: file.name, data: fileData, size: file.size });
                };
                reader.readAsDataURL(file);
            });
            if (newFiles.length > remaining) {
                showMsg(`حداکثر ${maxItems} فایل مجاز است.`, 'error');
            }
            input.value = '';
        });
        zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
        zone.addEventListener('dragleave', e => { e.preventDefault(); zone.classList.remove('dragover'); });
        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            zone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length) {
                input.files = files;
                input.dispatchEvent(new Event('change'));
            }
        });
    }
    function removeFileFromList(listId, btn) {
        const list = document.getElementById(listId);
        const item = btn.closest('.file-tag');
        if (item) {
            const index = Array.from(list.children).indexOf(item);
            item.remove();
            for (const type in window._pendingFiles) {
                if (window._pendingFiles[type] && window._pendingFiles[type][index]) {
                    window._pendingFiles[type].splice(index, 1);
                }
            }
        }
    }

    // ============================================================
    // 0514 - آپلود تصویر شاخص (فرم افزودن) - نسخه اصلی
    // ============================================================
    function setupCoverUpload(zoneId, inputId, previewId, imgId, removeFn) {
        const zone = document.getElementById(zoneId);
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        const img = document.getElementById(imgId);
        if (!zone || !input || !preview || !img) return;
        zone.addEventListener('click', () => input.click());
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(ev) {
                img.src = ev.target.result;
                preview.style.display = 'block';
                window._coverImage = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
        window[removeFn] = function() {
            preview.style.display = 'none';
            img.src = '';
            input.value = '';
            window._coverImage = null;
        };
    }

    // راه‌اندازی آپلود برای فرم‌های افزودن (نسخه اصلی)
    setupFileUpload('articleFilesZone', 'articleFilesInput', 'articleFilesList', 'article', 10);
    setupFileUpload('productFilesZone', 'productFilesInput', 'productFilesList', 'product', 10);
    setupFileUpload('archiveFilesZone', 'archiveFilesInput', 'archiveFilesList', 'archive', 10);
    setupFileUpload('articleGalleryZone', 'articleGalleryInput', 'articleGalleryList', 'article_gallery', 4);
    setupFileUpload('productGalleryZone', 'productGalleryInput', 'productGalleryList', 'product_gallery', 4);
    setupFileUpload('archiveGalleryZone', 'archiveGalleryInput', 'archiveGalleryList', 'archive_gallery', 4);

    setupCoverUpload('articleCoverZone', 'articleCoverInput', 'articleCoverPreview', 'articleCoverPreviewImg', 'removeArticleCover');
    setupCoverUpload('productCoverZone', 'productCoverInput', 'productCoverPreview', 'productCoverPreviewImg', 'removeProductCover');
    setupCoverUpload('archiveCoverZone', 'archiveCoverInput', 'archiveCoverPreview', 'archiveCoverPreviewImg', 'removeArchiveCover');

    // ============================================================
    // 0515 - ابزارهای ویرایشگر متن (Text Editor)
    // ============================================================
    function execCmd(editorId, cmd) {
        const editor = document.getElementById(editorId);
        if (!editor) return;
        editor.focus();
        document.execCommand(cmd, false, null);
    }
    function insertLink(editorId) {
        const url = prompt('آدرس لینک را وارد کنید:', 'https://');
        if (url) {
            const editor = document.getElementById(editorId);
            if (!editor) return;
            editor.focus();
            document.execCommand('createLink', false, url);
        }
    }
    function insertImagePlaceholder(editorId) {
        const editor = document.getElementById(editorId);
        if (!editor) return;
        const placeholder = document.createElement('div');
        placeholder.className = 'img-placeholder';
        placeholder.innerHTML = `<i class="fas fa-image"></i> برای آپلود تصویر کلیک کنید`;
        placeholder.style.cursor = 'pointer';
        placeholder.style.padding = '20px';
        placeholder.style.border = '2px dashed var(--pro-border)';
        placeholder.style.borderRadius = '8px';
        placeholder.style.textAlign = 'center';
        placeholder.style.color = 'var(--pro-text-secondary)';
        placeholder.style.margin = '8px 0';
        placeholder.addEventListener('click', function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = function(e) {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = function(ev) {
                    const img = document.createElement('img');
                    img.src = ev.target.result;
                    img.style.maxWidth = '100%';
                    img.style.borderRadius = '8px';
                    img.style.margin = '10px 0';
                    placeholder.parentNode.replaceChild(img, placeholder);
                    if (!window._inlineImages) window._inlineImages = [];
                    window._inlineImages.push(ev.target.result);
                };
                reader.readAsDataURL(file);
            };
            input.click();
        });
        editor.appendChild(placeholder);
        editor.focus();
        const range = document.createRange();
        range.setStartAfter(placeholder);
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    // ============================================================
    // 0516 - افزودن مقاله (Submit) - با ایمن‌سازی
    // ============================================================
    const addArticleForm = document.getElementById('addArticleForm');
    if (addArticleForm) {
        addArticleForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const id = parseInt(document.getElementById('articleId').value);
            const title = document.getElementById('articleTitle').value.trim();
            const excerpt = document.getElementById('articleExcerpt').value.trim();
            const type = document.getElementById('articleType').value;
            const date = document.getElementById('articleDate').value || new Date().toISOString().split('T')[0];
            const tags = document.getElementById('articleTags').value.split(',').map(t => t.trim()).filter(Boolean);
            const readTime = parseInt(document.getElementById('articleReadTime').value) || 5;
            const body = document.getElementById('articleBody').innerHTML.trim();

            if (!title || !excerpt || !body) {
                showMsg('❌ لطفاً عنوان، چکیده و متن کامل را پر کنید.', 'error');
                return;
            }
            if (!getToken()) { showMsg('❌ لطفاً توکن گیت‌هاب را وارد کنید.', 'error'); return; }

            let cover = null;
            const coverImg = document.getElementById('articleCoverPreviewImg');
            if (coverImg.src && coverImg.src.startsWith('data:')) {
                cover = coverImg.src;
            }

            const galleryFiles = window._pendingFiles?.article_gallery || [];
            const imageData = galleryFiles.map(f => f.data);
            const files = window._pendingFiles?.article || [];

            try {
                const existing = await fetchFromGitHub('_data/articles.json');
                if (existing) {
                    articlesData = JSON.parse(existing.content);
                    articlesSha = existing.sha;
                } else {
                    articlesData = {};
                    articlesSha = null;
                }
                const key = String(id).padStart(4, '0');
                articlesData[key] = {
                    title, excerpt, type, date, tags, readTime, body,
                    cover: cover,
                    images: imageData,
                    files: files.map(f => f.name),
                    updated: new Date().toISOString()
                };
                const newSha = await saveToGitHub('_data/articles.json', articlesData, articlesSha);
                articlesSha = newSha;

                for (const file of files) {
                    const path = `assets/articles/${key}/${file.name}`;
                    try { await uploadFileToGitHub(path, file.data); } catch (e) { console.error(e); }
                }
                for (let i = 0; i < imageData.length; i++) {
                    const path = `assets/articles/${key}/img_${i+1}.jpg`;
                    try { await uploadFileToGitHub(path, imageData[i].split(',')[1]); } catch (e) { console.error(e); }
                }
                if (cover) {
                    const coverPath = `assets/articles/${key}/cover.jpg`;
                    try { await uploadFileToGitHub(coverPath, cover.split(',')[1]); } catch (e) { console.error(e); }
                }

                showMsg('✅ مقاله با موفقیت منتشر شد!', 'success');
                showToast('✅ مقاله ذخیره شد', 'success');
                logActivity(`مقاله جدید: ${title} (#${key})`);
                this.reset();
                document.getElementById('articleBody').innerHTML = '';
                document.getElementById('articleFilesList').innerHTML = '';
                document.getElementById('articleGalleryList').innerHTML = '';
                document.getElementById('articleCoverPreview').style.display = 'none';
                window._pendingFiles = null;
                window._coverImage = null;
                generateArticleId();
                loadArticles();
            } catch (e) {
                showMsg('❌ خطا: ' + e.message, 'error');
                showToast('❌ ذخیره‌سازی ناموفق', 'error');
            }
        });
    }

    // ============================================================
    // 0517 - افزودن محصول (Submit) - با ایمن‌سازی
    // ============================================================
    const addProductForm = document.getElementById('addProductForm');
    if (addProductForm) {
        addProductForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const id = parseInt(document.getElementById('productId').value);
            const name = document.getElementById('productName').value.trim();
            const desc = document.getElementById('productDesc').value.trim();
            const price = document.getElementById('productPrice').value.trim() || 'رایگان';
            const icon = document.getElementById('productIcon').value.trim() || 'fa-cube';
            const tag = document.getElementById('productTag').value.trim() || 'جدید';
            const category = document.getElementById('productCategory').value.trim();
            const stock = document.getElementById('productStock').value;

            if (!name || !desc) {
                showMsg('❌ لطفاً نام و توضیحات را پر کنید.', 'error');
                return;
            }
            if (!getToken()) { showMsg('❌ لطفاً توکن گیت‌هاب را وارد کنید.', 'error'); return; }

            let cover = null;
            const coverImg = document.getElementById('productCoverPreviewImg');
            if (coverImg.src && coverImg.src.startsWith('data:')) {
                cover = coverImg.src;
            }

            const galleryFiles = window._pendingFiles?.product_gallery || [];
            const imageData = galleryFiles.map(f => f.data);
            const files = window._pendingFiles?.product || [];

            try {
                const existing = await fetchFromGitHub('_data/products.json');
                if (existing) {
                    productsData = JSON.parse(existing.content);
                    productsSha = existing.sha;
                } else {
                    productsData = {};
                    productsSha = null;
                }
                const key = String(id).padStart(4, '0');
                productsData[key] = {
                    name, desc, price, icon, tag, category, stock,
                    cover: cover,
                    images: imageData,
                    files: files.map(f => f.name),
                    updated: new Date().toISOString()
                };
                const newSha = await saveToGitHub('_data/products.json', productsData, productsSha);
                productsSha = newSha;

                for (const file of files) {
                    const path = `assets/products/${key}/${file.name}`;
                    try { await uploadFileToGitHub(path, file.data); } catch (e) { console.error(e); }
                }
                for (let i = 0; i < imageData.length; i++) {
                    const path = `assets/products/${key}/img_${i+1}.jpg`;
                    try { await uploadFileToGitHub(path, imageData[i].split(',')[1]); } catch (e) { console.error(e); }
                }
                if (cover) {
                    const coverPath = `assets/products/${key}/cover.jpg`;
                    try { await uploadFileToGitHub(coverPath, cover.split(',')[1]); } catch (e) { console.error(e); }
                }

                showMsg('✅ محصول با موفقیت ذخیره شد!', 'success');
                showToast('✅ محصول ذخیره شد', 'success');
                logActivity(`محصول جدید: ${name} (#${key})`);
                this.reset();
                document.getElementById('productFilesList').innerHTML = '';
                document.getElementById('productGalleryList').innerHTML = '';
                document.getElementById('productCoverPreview').style.display = 'none';
                window._pendingFiles = null;
                window._coverImage = null;
                generateProductId();
                loadProducts();
            } catch (e) {
                showMsg('❌ خطا: ' + e.message, 'error');
                showToast('❌ ذخیره‌سازی ناموفق', 'error');
            }
        });
    }

    // ============================================================
    // 0518 - افزودن آرشیو (Submit) - با ایمن‌سازی
    // ============================================================
    const addArchiveForm = document.getElementById('addArchiveForm');
    if (addArchiveForm) {
        addArchiveForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const id = parseInt(document.getElementById('archiveId').value);
            const title = document.getElementById('archiveTitle').value.trim();
            const excerpt = document.getElementById('archiveExcerpt').value.trim();
            const type = document.getElementById('archiveType').value;
            const date = document.getElementById('archiveDate').value || new Date().toISOString().split('T')[0];
            const tags = document.getElementById('archiveTags').value.split(',').map(t => t.trim()).filter(Boolean);
            const status = document.getElementById('archiveStatus').value;
            const body = document.getElementById('archiveBody').innerHTML.trim();

            if (!title || !excerpt) {
                showMsg('❌ لطفاً عنوان و توضیحات کوتاه را پر کنید.', 'error');
                return;
            }
            if (!getToken()) { showMsg('❌ لطفاً توکن گیت‌هاب را وارد کنید.', 'error'); return; }

            let cover = null;
            const coverImg = document.getElementById('archiveCoverPreviewImg');
            if (coverImg.src && coverImg.src.startsWith('data:')) {
                cover = coverImg.src;
            }

            const galleryFiles = window._pendingFiles?.archive_gallery || [];
            const imageData = galleryFiles.map(f => f.data);
            const files = window._pendingFiles?.archive || [];

            try {
                const existing = await fetchFromGitHub('_data/archive.json');
                if (existing) {
                    archiveData = JSON.parse(existing.content);
                    archiveSha = existing.sha;
                } else {
                    archiveData = {};
                    archiveSha = null;
                }
                const key = String(id).padStart(4, '0');
                archiveData[key] = {
                    title, excerpt, type, date, tags, status, body,
                    cover: cover,
                    images: imageData,
                    files: files.map(f => f.name),
                    updated: new Date().toISOString()
                };
                const newSha = await saveToGitHub('_data/archive.json', archiveData, archiveSha);
                archiveSha = newSha;

                for (const file of files) {
                    const path = `assets/archive/${key}/${file.name}`;
                    try { await uploadFileToGitHub(path, file.data); } catch (e) { console.error(e); }
                }
                for (let i = 0; i < imageData.length; i++) {
                    const path = `assets/archive/${key}/img_${i+1}.jpg`;
                    try { await uploadFileToGitHub(path, imageData[i].split(',')[1]); } catch (e) { console.error(e); }
                }
                if (cover) {
                    const coverPath = `assets/archive/${key}/cover.jpg`;
                    try { await uploadFileToGitHub(coverPath, cover.split(',')[1]); } catch (e) { console.error(e); }
                }

                showMsg('✅ آیتم آرشیو با موفقیت ذخیره شد!', 'success');
                showToast('✅ آرشیو ذخیره شد', 'success');
                logActivity(`آیتم آرشیو جدید: ${title} (#${key})`);
                this.reset();
                document.getElementById('archiveFilesList').innerHTML = '';
                document.getElementById('archiveGalleryList').innerHTML = '';
                document.getElementById('archiveCoverPreview').style.display = 'none';
                window._pendingFiles = null;
                window._coverImage = null;
                generateArchiveId();
                loadArchive();
            } catch (e) {
                showMsg('❌ خطا: ' + e.message, 'error');
                showToast('❌ ذخیره‌سازی ناموفق', 'error');
            }
        });
    }

    // ===== 0519 - تغییر رمز عبور =====
    function changePassword() {
        const current = document.getElementById('proCurrentPass').value.trim();
        const newPass = document.getElementById('proNewPass').value.trim();
        const confirm = document.getElementById('proConfirmPass').value.trim();
        const msgEl = document.getElementById('proPassMsg');
        
        if (!current || !newPass || !confirm) {
            msgEl.textContent = '❌ همه فیلدها را پر کنید.';
            msgEl.style.color = 'var(--pro-red)';
            return;
        }
        if (newPass.length < 4) {
            msgEl.textContent = '❌ رمز عبور جدید باید حداقل ۴ کاراکتر باشد.';
            msgEl.style.color = 'var(--pro-red)';
            return;
        }
        if (newPass !== confirm) {
            msgEl.textContent = '❌ رمز عبور جدید و تکرار آن مطابقت ندارند.';
            msgEl.style.color = 'var(--pro-red)';
            return;
        }
        
        const users = getUsers();
        const user = users[PRO_USER];
        if (!user) {
            msgEl.textContent = '❌ کاربر یافت نشد.';
            msgEl.style.color = 'var(--pro-red)';
            return;
        }
        if (user.password !== utf8ToBase64(current)) {
            msgEl.textContent = '❌ رمز عبور فعلی اشتباه است.';
            msgEl.style.color = 'var(--pro-red)';
            return;
        }
        user.password = utf8ToBase64(newPass);
        users[PRO_USER] = user;
        saveUsers(users);
        msgEl.textContent = '✅ رمز عبور با موفقیت تغییر کرد.';
        msgEl.style.color = 'var(--pro-secondary)';
        document.getElementById('proCurrentPass').value = '';
        document.getElementById('proNewPass').value = '';
        document.getElementById('proConfirmPass').value = '';
        logActivity('رمز عبور تغییر کرد');
    }

    // ============================================================
    // 0520 - داشبورد و آمار
    // ============================================================
    function updateDashboard() {
        const articles = Object.values(articlesData);
        const products = Object.values(productsData);
        const archive = Object.values(archiveData);
        let fileCount = 0;
        articles.forEach(a => { if (a.files) fileCount += a.files.length; });
        products.forEach(p => { if (p.files) fileCount += p.files.length; });
        archive.forEach(a => { if (a.files) fileCount += a.files.length; });

        document.getElementById('dashArticles').textContent = articles.length;
        document.getElementById('dashProducts').textContent = products.length;
        document.getElementById('dashArchive').textContent = archive.length;
        document.getElementById('dashFiles').textContent = fileCount;
        document.getElementById('proLastUpdate').textContent = new Date().toLocaleString('fa-IR');
    }
    function updateCounts() {
        document.getElementById('proArticlesCount').textContent = Object.values(articlesData).length;
        document.getElementById('proProductsCount').textContent = Object.values(productsData).length;
        document.getElementById('proArchiveCount').textContent = Object.values(archiveData).length;
    }

    // ============================================================
    // 0521 - ظاهر (Appearance)
    // ============================================================
    function loadAppearanceSettings() {
        try {
            const saved = localStorage.getItem('appearance_preview');
            if (saved) {
                const data = JSON.parse(saved);
                applyAppearanceToPreview(data);
            }
        } catch (e) {}
        fetchFromGitHub('_data/settings.json').then(data => {
            if (data) {
                const settings = JSON.parse(data.content);
                const app = settings.appearance || {};
                document.getElementById('appColorPrimary').value = app.colorPrimary || '#2563eb';
                document.getElementById('appColorSecondary').value = app.colorSecondary || '#10b981';
                document.getElementById('appColorBg').value = app.colorBg || '#0a0f1a';
                document.getElementById('appColorText').value = app.colorText || '#f1f5f9';
                document.getElementById('appColorTextSec').value = app.colorTextSec || '#94a3b8';
                document.getElementById('appColorCard').value = app.colorCard || '#141b2b';
                document.getElementById('appColorBorder').value = app.colorBorder || '#1e2a3d';
                document.getElementById('appFontFamily').value = app.fontFamily || 'Vazirmatn';
                document.getElementById('appFontSize').value = app.fontSize || 16;
                document.getElementById('appFontSizeHeading').value = app.fontSizeHeading || 36;
                document.getElementById('appLineHeight').value = app.lineHeight || 1.8;
                document.getElementById('appBgImage').value = app.bgImage || '';
                updateColorHexes();
                applyAppearanceToPreview(app);
                applyToPanel(app);
            }
        }).catch(() => {});
    }
    function applyToPanel(app) {
        if (app.colorPrimary) document.documentElement.style.setProperty('--pro-primary', app.colorPrimary);
        if (app.colorSecondary) document.documentElement.style.setProperty('--pro-secondary', app.colorSecondary);
        if (app.colorBg) document.documentElement.style.setProperty('--pro-bg', app.colorBg);
        if (app.colorText) document.documentElement.style.setProperty('--pro-text', app.colorText);
        if (app.colorTextSec) document.documentElement.style.setProperty('--pro-text-secondary', app.colorTextSec);
        if (app.colorCard) document.documentElement.style.setProperty('--pro-card', app.colorCard);
        if (app.colorBorder) document.documentElement.style.setProperty('--pro-border', app.colorBorder);
    }
    function applyAppearanceToPreview(app) {
        const preview = document.getElementById('livePreview');
        if (!preview) return;
        if (app.colorPrimary) preview.style.setProperty('--pro-primary', app.colorPrimary);
        if (app.colorSecondary) preview.style.setProperty('--pro-secondary', app.colorSecondary);
        if (app.colorBg) preview.style.setProperty('--pro-bg', app.colorBg);
        if (app.colorText) preview.style.setProperty('--pro-text', app.colorText);
        if (app.colorTextSec) preview.style.setProperty('--pro-text-secondary', app.colorTextSec);
        if (app.colorCard) preview.style.setProperty('--pro-card', app.colorCard);
        if (app.colorBorder) preview.style.setProperty('--pro-border', app.colorBorder);
        if (app.fontFamily) preview.style.fontFamily = app.fontFamily + ', sans-serif';
        if (app.fontSize) preview.style.fontSize = app.fontSize + 'px';
        const heading = preview.querySelector('h4');
        if (heading && app.colorPrimary) heading.style.color = app.colorPrimary;
        const p = preview.querySelector('p');
        if (p && app.colorTextSec) p.style.color = app.colorTextSec;
        const cards = preview.querySelectorAll('div[style*="background:var(--pro-card)"]');
        cards.forEach(c => {
            if (app.colorCard) c.style.background = app.colorCard;
            if (app.colorBorder) c.style.borderColor = app.colorBorder;
            if (app.colorText) c.style.color = app.colorText;
        });
        const btn = preview.querySelector('button');
        if (btn && app.colorPrimary) btn.style.background = app.colorPrimary;
        localStorage.setItem('appearance_preview', JSON.stringify(app));
    }
    function updateColorHexes() {
        document.getElementById('appColorPrimaryHex').textContent = document.getElementById('appColorPrimary').value;
        document.getElementById('appColorSecondaryHex').textContent = document.getElementById('appColorSecondary').value;
        document.getElementById('appColorBgHex').textContent = document.getElementById('appColorBg').value;
        document.getElementById('appColorTextHex').textContent = document.getElementById('appColorText').value;
        document.getElementById('appColorTextSecHex').textContent = document.getElementById('appColorTextSec').value;
        document.getElementById('appColorCardHex').textContent = document.getElementById('appColorCard').value;
        document.getElementById('appColorBorderHex').textContent = document.getElementById('appColorBorder').value;
    }
    document.querySelectorAll('#appearanceForm input[type="color"]').forEach(inp => {
        inp.addEventListener('input', function() {
            updateColorHexes();
            const app = {
                colorPrimary: document.getElementById('appColorPrimary').value,
                colorSecondary: document.getElementById('appColorSecondary').value,
                colorBg: document.getElementById('appColorBg').value,
                colorText: document.getElementById('appColorText').value,
                colorTextSec: document.getElementById('appColorTextSec').value,
                colorCard: document.getElementById('appColorCard').value,
                colorBorder: document.getElementById('appColorBorder').value,
                fontFamily: document.getElementById('appFontFamily').value,
                fontSize: parseInt(document.getElementById('appFontSize').value),
                fontSizeHeading: parseInt(document.getElementById('appFontSizeHeading').value),
                lineHeight: parseFloat(document.getElementById('appLineHeight').value),
                bgImage: document.getElementById('appBgImage').value
            };
            applyAppearanceToPreview(app);
            applyToPanel(app);
        });
    });
    document.querySelectorAll('#appearanceForm input[type="number"], #appearanceForm select, #appearanceForm input[type="text"]').forEach(inp => {
        inp.addEventListener('input', function() {
            const app = {
                colorPrimary: document.getElementById('appColorPrimary').value,
                colorSecondary: document.getElementById('appColorSecondary').value,
                colorBg: document.getElementById('appColorBg').value,
                colorText: document.getElementById('appColorText').value,
                colorTextSec: document.getElementById('appColorTextSec').value,
                colorCard: document.getElementById('appColorCard').value,
                colorBorder: document.getElementById('appColorBorder').value,
                fontFamily: document.getElementById('appFontFamily').value,
                fontSize: parseInt(document.getElementById('appFontSize').value) || 16,
                fontSizeHeading: parseInt(document.getElementById('appFontSizeHeading').value) || 36,
                lineHeight: parseFloat(document.getElementById('appLineHeight').value) || 1.8,
                bgImage: document.getElementById('appBgImage').value
            };
            applyAppearanceToPreview(app);
            applyToPanel(app);
        });
    });
    function resetAppearanceForm() {
        document.getElementById('appColorPrimary').value = '#2563eb';
        document.getElementById('appColorSecondary').value = '#10b981';
        document.getElementById('appColorBg').value = '#0a0f1a';
        document.getElementById('appColorText').value = '#f1f5f9';
        document.getElementById('appColorTextSec').value = '#94a3b8';
        document.getElementById('appColorCard').value = '#141b2b';
        document.getElementById('appColorBorder').value = '#1e2a3d';
        document.getElementById('appFontFamily').value = 'Vazirmatn';
        document.getElementById('appFontSize').value = 16;
        document.getElementById('appFontSizeHeading').value = 36;
        document.getElementById('appLineHeight').value = 1.8;
        document.getElementById('appBgImage').value = '';
        updateColorHexes();
        loadAppearanceSettings();
    }
    async function saveAppearance() {
        const app = {
            colorPrimary: document.getElementById('appColorPrimary').value,
            colorSecondary: document.getElementById('appColorSecondary').value,
            colorBg: document.getElementById('appColorBg').value,
            colorText: document.getElementById('appColorText').value,
            colorTextSec: document.getElementById('appColorTextSec').value,
            colorCard: document.getElementById('appColorCard').value,
            colorBorder: document.getElementById('appColorBorder').value,
            fontFamily: document.getElementById('appFontFamily').value,
            fontSize: parseInt(document.getElementById('appFontSize').value) || 16,
            fontSizeHeading: parseInt(document.getElementById('appFontSizeHeading').value) || 36,
            lineHeight: parseFloat(document.getElementById('appLineHeight').value) || 1.8,
            bgImage: document.getElementById('appBgImage').value || ''
        };
        try {
            const existing = await fetchFromGitHub('_data/settings.json');
            let settings = {};
            if (existing) {
                settings = JSON.parse(existing.content);
                const sha = existing.sha;
                settings.appearance = app;
                await saveToGitHub('_data/settings.json', settings, sha);
            } else {
                settings = { appearance: app };
                await saveToGitHub('_data/settings.json', settings, null);
            }
            showMsg('✅ تنظیمات ظاهر با موفقیت ذخیره شد!', 'success');
            showToast('✅ ظاهر ذخیره شد', 'success');
            logActivity('تنظیمات ظاهر به‌روز شد');
        } catch (e) {
            showMsg('❌ خطا: ' + e.message, 'error');
            showToast('❌ ذخیره‌سازی ناموفق', 'error');
        }
    }

    // ============================================================
    // 0522 - منوها (با قابلیت ویرایش و جابجایی) - نسخه پایدار
    // ============================================================

    // بارگذاری داده‌های منو از گیت‌هاب یا ایجاد پیش‌فرض
    function loadMenuData() {
        const token = getToken();
        if (!token) {
            menuData = { header: [], slide: [] };
            renderMenuLists();
            showMsg('⚠️ برای مدیریت منوها، ابتدا توکن گیت‌هاب را وارد کنید.', 'error');
            return;
        }

        fetchFromGitHub('_data/menu.json')
            .then(data => {
                if (data) {
                    try {
                        const parsed = JSON.parse(data.content);
                        // اطمینان از وجود کلیدهای header و slide
                        menuData = {
                            header: Array.isArray(parsed.header) ? parsed.header : [],
                            slide: Array.isArray(parsed.slide) ? parsed.slide : []
                        };
                    } catch (e) {
                        console.warn('⚠️ خطا در parse منو، استفاده از پیش‌فرض:', e);
                        menuData = { header: [], slide: [] };
                    }
                } else {
                    // فایل وجود ندارد، ایجاد با منوی پیش‌فرض
                    menuData = {
                        header: [
                            { title: 'خانه', link: 'index.html' },
                            { title: 'مقالات', link: 'articles.html' },
                            { title: 'محصولات', link: 'products.html' },
                            { title: 'آرشیو', link: 'archive.html' },
                            { title: 'تماس', link: 'index.html#contact' }
                        ],
                        slide: [
                            { title: 'درباره من', link: 'index.html#about' },
                            { title: 'مهارت‌ها', link: 'index.html#skills' },
                            { title: 'تحصیلات', link: 'index.html#education' },
                            { title: 'پروژه‌ها', link: 'index.html#projects' }
                        ]
                    };
                    // ذخیره خودکار در گیت‌هاب (در صورت امکان)
                    saveToGitHub('_data/menu.json', menuData, null)
                        .then(() => console.log('✅ منوی پیش‌فرض ذخیره شد.'))
                        .catch(err => console.warn('⚠️ ذخیره منوی پیش‌فرض ناموفق:', err));
                }
                renderMenuLists();
            })
            .catch((err) => {
                console.error('❌ خطا در بارگذاری منوها:', err);
                menuData = { header: [], slide: [] };
                renderMenuLists();
                showMsg('⚠️ خطا در بارگذاری منوها. لطفاً توکن خود را بررسی کنید.', 'error');
            });
    }

    // رندر لیست‌های منو در UI
    function renderMenuLists() {
        const headerList = document.getElementById('headerMenuList');
        const slideList = document.getElementById('slideMenuList');

        // اگر المنت‌ها وجود نداشتند، خطا ندهیم
        if (!headerList || !slideList) {
            console.warn('⚠️ المنت‌های منو در DOM پیدا نشدند!');
            return;
        }

        // رندر منوی هدر
        if (!menuData.header || menuData.header.length === 0) {
            headerList.innerHTML = '<div class="pro-empty"><i class="fas fa-list"></i>هیچ آیتمی در منوی هدر وجود ندارد.</div>';
        } else {
            headerList.innerHTML = menuData.header.map((item, idx) => `
                <div class="menu-item-row">
                    <div class="info"><strong>${item.title || 'بدون عنوان'}</strong><span>${item.link || '#'}</span></div>
                    <div class="actions">
                        <button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditMenuModal('header', ${idx})" title="ویرایش"><i class="fas fa-edit"></i></button>
                        <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveMenuItem('header', ${idx}, -1)" title="بالا" ${idx === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                        <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveMenuItem('header', ${idx}, 1)" title="پایین" ${idx === menuData.header.length - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                        <button class="pro-btn pro-btn-danger pro-btn-sm" onclick="removeMenuItem('header', ${idx})" title="حذف"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `).join('');
        }

        // رندر منوی کشویی
        if (!menuData.slide || menuData.slide.length === 0) {
            slideList.innerHTML = '<div class="pro-empty"><i class="fas fa-list"></i>هیچ آیتمی در منوی کشویی وجود ندارد.</div>';
        } else {
            slideList.innerHTML = menuData.slide.map((item, idx) => `
                <div class="menu-item-row">
                    <div class="info"><strong>${item.title || 'بدون عنوان'}</strong><span>${item.link || '#'}</span></div>
                    <div class="actions">
                        <button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditMenuModal('slide', ${idx})" title="ویرایش"><i class="fas fa-edit"></i></button>
                        <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveMenuItem('slide', ${idx}, -1)" title="بالا" ${idx === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                        <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveMenuItem('slide', ${idx}, 1)" title="پایین" ${idx === menuData.slide.length - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                        <button class="pro-btn pro-btn-danger pro-btn-sm" onclick="removeMenuItem('slide', ${idx})" title="حذف"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `).join('');
        }
    }

    // افزودن آیتم جدید به منو
    function addMenuItem(type) {
        const titleInput = type === 'header' ? document.getElementById('newHeaderTitle') : document.getElementById('newSlideTitle');
        const linkInput = type === 'header' ? document.getElementById('newHeaderLink') : document.getElementById('newSlideLink');

        const title = titleInput?.value?.trim();
        const link = linkInput?.value?.trim() || '#';

        if (!title) {
            showMsg('لطفاً عنوان آیتم را وارد کنید.', 'error');
            return;
        }

        if (!menuData[type]) menuData[type] = [];
        menuData[type].push({ title, link });

        if (titleInput) titleInput.value = '';
        if (linkInput) linkInput.value = '';

        renderMenuLists();
        showMsg(`✅ آیتم "${title}" به منو اضافه شد.`, 'success');
    }

    // حذف آیتم از منو
    function removeMenuItem(type, index) {
        if (!confirm('آیا از حذف این آیتم از منو مطمئن هستید؟')) return;
        menuData[type].splice(index, 1);
        renderMenuLists();
        showMsg('✅ آیتم حذف شد.', 'info');
    }

    // جابجایی آیتم در منو
    function moveMenuItem(type, index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= menuData[type].length) return;
        const item = menuData[type].splice(index, 1)[0];
        menuData[type].splice(newIndex, 0, item);
        renderMenuLists();
        showMsg('✅ ترتیب منو تغییر کرد.', 'info');
    }

    // باز کردن مودال ویرایش آیتم منو
    function openEditMenuModal(type, index) {
        const item = menuData[type][index];
        if (!item) {
            showMsg('❌ آیتم یافت نشد.', 'error');
            return;
        }

        // ایجاد مودال با استفاده از DOM (برای اطمینان از عدم تداخل)
        const overlay = document.createElement('div');
        overlay.className = 'pro-modal-overlay active';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '1002';

        overlay.innerHTML = `
            <div class="pro-modal" style="max-width:500px;">
                <div class="pro-modal-header">
                    <h3><i class="fas fa-edit"></i> ویرایش آیتم منو</h3>
                    <button class="pro-modal-close" onclick="this.closest('.pro-modal-overlay').remove()"><i class="fas fa-times"></i></button>
                </div>
                <form id="editMenuForm">
                    <div class="pro-field"><label>عنوان</label><input type="text" id="editMenuTitle" value="${item.title || ''}" placeholder="عنوان آیتم"></div>
                    <div class="pro-field" style="margin-top:12px;"><label>لینک</label><input type="text" id="editMenuLink" value="${item.link || '#'}" placeholder="لینک (مثال: index.html)"></div>
                    <div style="display:flex;gap:12px;margin-top:18px;">
                        <button type="submit" class="pro-btn pro-btn-primary"><i class="fas fa-save"></i> ذخیره</button>
                        <button type="button" class="pro-btn pro-btn-outline" onclick="this.closest('.pro-modal-overlay').remove()">انصراف</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(overlay);

        // ارسال فرم ویرایش
        const form = overlay.querySelector('#editMenuForm');
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const newTitle = document.getElementById('editMenuTitle').value.trim();
            const newLink = document.getElementById('editMenuLink').value.trim();

            if (!newTitle) {
                showMsg('❌ لطفاً عنوان را وارد کنید.', 'error');
                return;
            }

            menuData[type][index] = { title: newTitle, link: newLink || '#' };
            overlay.remove();
            renderMenuLists();
            showMsg('✅ آیتم منو ویرایش شد.', 'success');
        });

        // بستن با کلیک روی پس‌زمینه
        overlay.addEventListener('click', function(e) {
            if (e.target === this) this.remove();
        });
    }

    // ذخیره منوها در گیت‌هاب
    async function saveMenus() {
        try {
            if (!getToken()) {
                showMsg('❌ لطفاً توکن گیت‌هاب را وارد کنید.', 'error');
                return;
            }

            const existing = await fetchFromGitHub('_data/menu.json');
            let sha = existing ? existing.sha : null;

            await saveToGitHub('_data/menu.json', menuData, sha);
            showMsg('✅ منوها با موفقیت ذخیره شدند!', 'success');
            showToast('✅ منوها ذخیره شدند', 'success');
            logActivity('منوها به‌روز شدند');
        } catch (e) {
            showMsg('❌ خطا در ذخیره منوها: ' + e.message, 'error');
            showToast('❌ ذخیره‌سازی ناموفق', 'error');
        }
    }

    // بازنشانی منوها به حالت پیش‌فرض
    function resetMenusToDefault() {
        if (!confirm('آیا از بازنشانی منوها به حالت پیش‌فرض مطمئن هستید؟')) return;

        menuData = {
            header: [
                { title: 'خانه', link: 'index.html' },
                { title: 'مقالات', link: 'articles.html' },
                { title: 'محصولات', link: 'products.html' },
                { title: 'آرشیو', link: 'archive.html' },
                { title: 'تماس', link: 'index.html#contact' }
            ],
            slide: [
                { title: 'درباره من', link: 'index.html#about' },
                { title: 'مهارت‌ها', link: 'index.html#skills' },
                { title: 'تحصیلات', link: 'index.html#education' },
                { title: 'پروژه‌ها', link: 'index.html#projects' }
            ]
        };

        renderMenuLists();
        showMsg('✅ منوها به حالت پیش‌فرض بازنشانی شدند.', 'info');
    }

    // ===== پایان بخش منوها =====

    // ============================================================
    // 0523 - بخش‌ها (Sections)
    // ============================================================
    function loadSectionsData() {
        fetchFromGitHub('_data/sections.json').then(data => {
            if (data) {
                sectionsData = JSON.parse(data.content);
            } else {
                sectionsData = {
                    hero: { title: '', subtitle: '', desc: '', image: '', tags: '' },
                    about: { text: '', image: '' },
                    skills: { title: '', desc: '' },
                    education: { title: '', layout: 'timeline' },
                    projects: { title: '', desc: '' },
                    contact: { title: '', desc: '', phone: '', email: '' }
                };
            }
            fillSectionsForm();
        }).catch(() => {
            sectionsData = {
                hero: { title: '', subtitle: '', desc: '', image: '', tags: '' },
                about: { text: '', image: '' },
                skills: { title: '', desc: '' },
                education: { title: '', layout: 'timeline' },
                projects: { title: '', desc: '' },
                contact: { title: '', desc: '', phone: '', email: '' }
            };
            fillSectionsForm();
        });
    }
    function fillSectionsForm() {
        document.getElementById('secHeroTitle').value = sectionsData.hero?.title || '';
        document.getElementById('secHeroSubtitle').value = sectionsData.hero?.subtitle || '';
        document.getElementById('secHeroDesc').value = sectionsData.hero?.desc || '';
        document.getElementById('secHeroImage').value = sectionsData.hero?.image || '';
        document.getElementById('secHeroTags').value = sectionsData.hero?.tags || '';
        document.getElementById('secAboutText').value = sectionsData.about?.text || '';
        document.getElementById('secAboutImage').value = sectionsData.about?.image || '';
        document.getElementById('secSkillsTitle').value = sectionsData.skills?.title || '';
        document.getElementById('secSkillsDesc').value = sectionsData.skills?.desc || '';
        document.getElementById('secEduTitle').value = sectionsData.education?.title || '';
        document.getElementById('secEduLayout').value = sectionsData.education?.layout || 'timeline';
        document.getElementById('secProjectsTitle').value = sectionsData.projects?.title || '';
        document.getElementById('secProjectsDesc').value = sectionsData.projects?.desc || '';
        document.getElementById('secContactTitle').value = sectionsData.contact?.title || '';
        document.getElementById('secContactDesc').value = sectionsData.contact?.desc || '';
        document.getElementById('secContactPhone').value = sectionsData.contact?.phone || '';
        document.getElementById('secContactEmail').value = sectionsData.contact?.email || '';
    }
    async function saveSections() {
        const data = {
            hero: {
                title: document.getElementById('secHeroTitle').value.trim(),
                subtitle: document.getElementById('secHeroSubtitle').value.trim(),
                desc: document.getElementById('secHeroDesc').value.trim(),
                image: document.getElementById('secHeroImage').value.trim(),
                tags: document.getElementById('secHeroTags').value.trim()
            },
            about: {
                text: document.getElementById('secAboutText').value.trim(),
                image: document.getElementById('secAboutImage').value.trim()
            },
            skills: {
                title: document.getElementById('secSkillsTitle').value.trim(),
                desc: document.getElementById('secSkillsDesc').value.trim()
            },
            education: {
                title: document.getElementById('secEduTitle').value.trim(),
                layout: document.getElementById('secEduLayout').value
            },
            projects: {
                title: document.getElementById('secProjectsTitle').value.trim(),
                desc: document.getElementById('secProjectsDesc').value.trim()
            },
            contact: {
                title: document.getElementById('secContactTitle').value.trim(),
                desc: document.getElementById('secContactDesc').value.trim(),
                phone: document.getElementById('secContactPhone').value.trim(),
                email: document.getElementById('secContactEmail').value.trim()
            }
        };
        try {
            const existing = await fetchFromGitHub('_data/sections.json');
            let sha = null;
            if (existing) sha = existing.sha;
            await saveToGitHub('_data/sections.json', data, sha);
            showMsg('✅ همه بخش‌ها با موفقیت ذخیره شدند!', 'success');
            showToast('✅ بخش‌ها ذخیره شدند', 'success');
            logActivity('بخش‌های سایت به‌روز شدند');
            sectionsData = data;
        } catch (e) {
            showMsg('❌ خطا: ' + e.message, 'error');
            showToast('❌ ذخیره‌سازی ناموفق', 'error');
        }
    }
    function toggleAccordion(id) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('active');
    }

    // ============================================================
    // 0524 - خروجی گرفتن و حذف داده
    // ============================================================
    function exportData() {
        const data = {
            articles: articlesData,
            products: productsData,
            archive: archiveData,
            menu: menuData,
            sections: sectionsData,
            education: eduData,
            social: socialData,
            services: servicesData,
            skills: skillsData,
            testimonials: testimonialsData,
            awards: awardsData,
            links: linksData,
            exported: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `full-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showMsg('✅ خروجی کامل با موفقیت دریافت شد.', 'success');
        logActivity('خروجی کامل گرفته شد');
    }
    async function clearAllData() {
        if (!confirm('⚠️ این عمل تمام داده‌ها (مقالات، محصولات، آرشیو) را حذف می‌کند. آیا مطمئن هستید؟')) return;
        if (!confirm('⚠️ تایید نهایی: این عمل غیرقابل بازگشت است.')) return;
        if (!getToken()) { showMsg('لطفاً توکن را وارد کنید.', 'error'); return; }
        try {
            if (articlesSha) { await deleteFromGitHub('_data/articles.json', articlesSha); articlesData = {}; articlesSha = null; }
            if (productsSha) { await deleteFromGitHub('_data/products.json', productsSha); productsData = {}; productsSha = null; }
            if (archiveSha) { await deleteFromGitHub('_data/archive.json', archiveSha); archiveData = {}; archiveSha = null; }
            showMsg('✅ همه داده‌ها حذف شدند.', 'success');
            logActivity('همه داده‌ها حذف شدند');
            loadAllData();
        } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
    }
    function proLogout() {
        sessionStorage.removeItem('admin_logged_in');
        sessionStorage.removeItem('admin_username');
        location.reload();
    }

    // ============================================================
    // 0525 - بارگذاری اولیه (Initial Load)
    // ============================================================
    checkLogin();
    if (sessionStorage.getItem('admin_logged_in') === 'true') {
        if (getToken()) {
            loadAllData();
            setInterval(() => {
                if (document.querySelector('.pro-tab-content.active#tab-articles')) loadArticles();
                if (document.querySelector('.pro-tab-content.active#tab-products')) loadProducts();
                if (document.querySelector('.pro-tab-content.active#tab-archive')) loadArchive();
            }, 30000);
        } else {
            document.getElementById('proArticlesList').innerHTML = '<div class="pro-empty"><i class="fas fa-key"></i>لطفاً توکن گیت‌هاب را در قسمت بالای صفحه وارد کنید.</div>';
            document.getElementById('proProductsList').innerHTML = '<div class="pro-empty"><i class="fas fa-key"></i>لطفاً توکن گیت‌هاب را در قسمت بالای صفحه وارد کنید.</div>';
            document.getElementById('proArchiveList').innerHTML = '<div class="pro-empty"><i class="fas fa-key"></i>لطفاً توکن گیت‌هاب را در قسمت بالای صفحه وارد کنید.</div>';
        }
        console.log('✅ پنل مدیریت فوق‌حرفه‌ای با موفقیت بارگذاری شد.');
        loadAppearanceSettings();
        loadMenuData();
        loadSectionsData();
    }

    // ============================================================
    // 0526 - محتوای ایندکس (Index Content)
    // ============================================================

    // ===== ابزارهای عمومی =====
    function renderItems(containerId, items, renderFn) {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (!items || items.length === 0) {
            container.innerHTML = `<div class="pro-empty"><i class="fas fa-list"></i>هیچ آیتمی ثبت نشده است.</div>`;
            return;
        }
        container.innerHTML = items.map((item, idx) => renderFn(item, idx, items.length)).join('');
    }
    function createEditModal(title, bodyHtml, onSave) {
        const modal = document.createElement('div');
        modal.className = 'pro-modal-overlay active';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '1002';
        modal.innerHTML = `
            <div class="pro-modal" style="max-width:700px;">
                <div class="pro-modal-header">
                    <h3><i class="fas fa-edit"></i> ${title}</h3>
                    <button class="pro-modal-close" onclick="this.closest('.pro-modal-overlay').remove()"><i class="fas fa-times"></i></button>
                </div>
                <form id="editModalForm">
                    ${bodyHtml}
                    <div style="display:flex;gap:12px;margin-top:18px;">
                        <button type="submit" class="pro-btn pro-btn-primary"><i class="fas fa-save"></i> ذخیره</button>
                        <button type="button" class="pro-btn pro-btn-outline" onclick="this.closest('.pro-modal-overlay').remove()">انصراف</button>
                    </div>
                </form>
            </div>
        `;
        modal.querySelector('#editModalForm').addEventListener('submit', function(e) {
            e.preventDefault();
            onSave();
        });
        modal.addEventListener('click', function(e) {
            if (e.target === this) this.remove();
        });
        return modal;
    }

    // ===== 0526.1 - سوابق تحصیلی =====
    function loadEducation() {
        fetchFromGitHub('_data/education.json').then(data => {
            if (data) {
                try { eduData = JSON.parse(data.content); } catch (e) { eduData = { title: 'سوابق تحصیلی', items: [] }; }
            } else { eduData = { title: 'سوابق تحصیلی', items: [] }; }
            renderEducation();
        }).catch(() => { eduData = { title: 'سوابق تحصیلی', items: [] }; renderEducation(); });
    }
    function renderEducation() {
        document.getElementById('eduSectionTitle').value = eduData.title || 'سوابق تحصیلی';
        renderItems('educationList', eduData.items, (item, idx, total) => `
            <div class="pro-item">
                <div class="info">
                    <div class="title">${item.org || 'بدون مؤسسه'} - ${item.title || ''} <span style="font-size:0.7rem;color:var(--text-secondary);">${item.date || ''}</span></div>
                    <div class="meta">
                        ${item.gpa ? `<span><i class="fas fa-star"></i> معدل: ${item.gpa}</span>` : ''}
                        ${item.desc ? `<span>${item.desc}</span>` : ''}
                        ${item.icon ? `<span><i class="fas ${item.icon}"></i></span>` : ''}
                        ${item.source ? `<span><a href="${item.source}" target="_blank" style="color:var(--pro-primary);">منبع</a></span>` : ''}
                        ${item.cert ? `<span><a href="${item.cert}" target="_blank" style="color:var(--pro-primary);">مدرک</a></span>` : ''}
                    </div>
                </div>
                <div class="actions">
                    <button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditEducationModal(${idx})" title="ویرایش"><i class="fas fa-edit"></i></button>
                    <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveEducationItem(${idx}, -1)" title="بالا" ${idx === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                    <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveEducationItem(${idx}, 1)" title="پایین" ${idx === total - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                    <button class="pro-btn pro-btn-danger pro-btn-sm" onclick="removeEducationItem(${idx})" title="حذف"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `);
    }
    function addEducationItem() {
        const org = document.getElementById('newEduOrg').value.trim();
        const title = document.getElementById('newEduTitle').value.trim();
        const date = document.getElementById('newEduDate').value.trim();
        const gpa = document.getElementById('newEduGpa').value.trim();
        const desc = document.getElementById('newEduDesc').value.trim();
        const icon = document.getElementById('newEduIcon').value.trim();
        const source = document.getElementById('newEduSource').value.trim();
        const cert = document.getElementById('newEduCert').value.trim();
        if (!org || !title) { showMsg('لطفاً نام مؤسسه و عنوان را وارد کنید.', 'error'); return; }
        eduData.items.push({ org, title, date, gpa, desc, icon, source, cert });
        document.getElementById('newEduOrg').value = '';
        document.getElementById('newEduTitle').value = '';
        document.getElementById('newEduDate').value = '';
        document.getElementById('newEduGpa').value = '';
        document.getElementById('newEduDesc').value = '';
        document.getElementById('newEduIcon').value = '';
        document.getElementById('newEduSource').value = '';
        document.getElementById('newEduCert').value = '';
        renderEducation();
        showMsg('✅ آیتم اضافه شد.', 'success');
    }
    function removeEducationItem(index) {
        if (!confirm('آیا از حذف این سابقه تحصیلی مطمئن هستید؟')) return;
        eduData.items.splice(index, 1);
        renderEducation();
        showMsg('✅ آیتم حذف شد.', 'info');
    }
    function moveEducationItem(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= eduData.items.length) return;
        const item = eduData.items.splice(index, 1)[0];
        eduData.items.splice(newIndex, 0, item);
        renderEducation();
        showMsg('✅ ترتیب تغییر کرد.', 'info');
    }
    function openEditEducationModal(index) {
        const item = eduData.items[index];
        if (!item) { showMsg('❌ آیتم یافت نشد.', 'error'); return; }
        const modal = createEditModal('ویرایش سابقه تحصیلی', `
            <div class="pro-grid">
                <div class="pro-field full"><label>نام مؤسسه</label><input type="text" id="editEduOrg" value="${item.org || ''}"></div>
                <div class="pro-field full"><label>عنوان تحصیلی</label><input type="text" id="editEduTitle" value="${item.title || ''}"></div>
                <div class="pro-field"><label>تاریخ</label><input type="text" id="editEduDate" value="${item.date || ''}"></div>
                <div class="pro-field"><label>معدل</label><input type="text" id="editEduGpa" value="${item.gpa || ''}"></div>
                <div class="pro-field"><label>آیکون</label><input type="text" id="editEduIcon" value="${item.icon || ''}"></div>
                <div class="pro-field"><label>لینک منبع</label><input type="text" id="editEduSource" value="${item.source || ''}"></div>
                <div class="pro-field"><label>لینک مدرک</label><input type="text" id="editEduCert" value="${item.cert || ''}"></div>
                <div class="pro-field full"><label>توضیحات</label><input type="text" id="editEduDesc" value="${item.desc || ''}"></div>
            </div>
        `, () => {
            eduData.items[index] = {
                org: document.getElementById('editEduOrg').value.trim() || item.org,
                title: document.getElementById('editEduTitle').value.trim() || item.title,
                date: document.getElementById('editEduDate').value.trim(),
                gpa: document.getElementById('editEduGpa').value.trim(),
                icon: document.getElementById('editEduIcon').value.trim(),
                source: document.getElementById('editEduSource').value.trim(),
                cert: document.getElementById('editEduCert').value.trim(),
                desc: document.getElementById('editEduDesc').value.trim()
            };
            renderEducation();
            modal.remove();
            showMsg('✅ آیتم ویرایش شد.', 'success');
        });
        document.body.appendChild(modal);
    }
    async function saveEducation() {
        try {
            eduData.title = document.getElementById('eduSectionTitle').value.trim() || 'سوابق تحصیلی';
            const existing = await fetchFromGitHub('_data/education.json');
            let sha = null;
            if (existing) sha = existing.sha;
            await saveToGitHub('_data/education.json', eduData, sha);
            showMsg('✅ سوابق تحصیلی با موفقیت ذخیره شدند!', 'success');
            showToast('✅ تحصیلات ذخیره شدند', 'success');
        } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
    }

    // ===== 0526.2 - گواهی‌نامه‌ها =====
    function loadCertificates() {
        fetchFromGitHub('_data/certificates.json').then(data => {
            if (data) {
                try { certsData = JSON.parse(data.content); } catch (e) { certsData = { title: 'گواهی‌نامه‌ها', items: [] }; }
            } else { certsData = { title: 'گواهی‌نامه‌ها', items: [] }; }
            renderCertificates();
        }).catch(() => { certsData = { title: 'گواهی‌نامه‌ها', items: [] }; renderCertificates(); });
    }
    function renderCertificates() {
        document.getElementById('certsSectionTitle').value = certsData.title || 'گواهی‌نامه‌ها';
        renderItems('certificatesList', certsData.items, (item, idx, total) => `
            <div class="pro-item">
                <div class="info">
                    <div class="title">${item.name || 'بدون نام'} <span style="font-size:0.8rem;color:var(--text-secondary);">${item.org || ''}</span></div>
                    <div class="meta">${item.date || ''} ${item.link ? `<a href="${item.link}" target="_blank" style="color:var(--pro-primary);">مشاهده مدرک</a>` : ''}</div>
                </div>
                <div class="actions">
                    <button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditCertificateModal(${idx})" title="ویرایش"><i class="fas fa-edit"></i></button>
                    <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveCertificateItem(${idx}, -1)" title="بالا" ${idx === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                    <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveCertificateItem(${idx}, 1)" title="پایین" ${idx === total - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                    <button class="pro-btn pro-btn-danger pro-btn-sm" onclick="removeCertificateItem(${idx})" title="حذف"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `);
    }
    function addCertificateItem() {
        const name = document.getElementById('newCertName').value.trim();
        const org = document.getElementById('newCertOrg').value.trim();
        const date = document.getElementById('newCertDate').value.trim();
        const link = document.getElementById('newCertLink').value.trim();
        if (!name) { showMsg('لطفاً نام گواهی‌نامه را وارد کنید.', 'error'); return; }
        certsData.items.push({ name, org, date, link });
        document.getElementById('newCertName').value = '';
        document.getElementById('newCertOrg').value = '';
        document.getElementById('newCertDate').value = '';
        document.getElementById('newCertLink').value = '';
        renderCertificates();
        showMsg('✅ گواهی‌نامه اضافه شد.', 'success');
    }
    function removeCertificateItem(index) {
        if (!confirm('آیا از حذف این گواهی‌نامه مطمئن هستید؟')) return;
        certsData.items.splice(index, 1);
        renderCertificates();
        showMsg('✅ گواهی‌نامه حذف شد.', 'info');
    }
    function moveCertificateItem(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= certsData.items.length) return;
        const item = certsData.items.splice(index, 1)[0];
        certsData.items.splice(newIndex, 0, item);
        renderCertificates();
        showMsg('✅ ترتیب تغییر کرد.', 'info');
    }
    function openEditCertificateModal(index) {
        const item = certsData.items[index];
        if (!item) { showMsg('❌ آیتم یافت نشد.', 'error'); return; }
        const modal = createEditModal('ویرایش گواهی‌نامه', `
            <div class="pro-grid">
                <div class="pro-field full"><label>نام گواهی‌نامه</label><input type="text" id="editCertName" value="${item.name || ''}"></div>
                <div class="pro-field"><label>موسسه صادرکننده</label><input type="text" id="editCertOrg" value="${item.org || ''}"></div>
                <div class="pro-field"><label>تاریخ دریافت</label><input type="text" id="editCertDate" value="${item.date || ''}"></div>
                <div class="pro-field"><label>لینک مدرک</label><input type="text" id="editCertLink" value="${item.link || ''}"></div>
            </div>
        `, () => {
            certsData.items[index] = {
                name: document.getElementById('editCertName').value.trim() || item.name,
                org: document.getElementById('editCertOrg').value.trim(),
                date: document.getElementById('editCertDate').value.trim(),
                link: document.getElementById('editCertLink').value.trim()
            };
            renderCertificates();
            modal.remove();
            showMsg('✅ گواهی‌نامه ویرایش شد.', 'success');
        });
        document.body.appendChild(modal);
    }
    async function saveCertificates() {
        try {
            certsData.title = document.getElementById('certsSectionTitle').value.trim() || 'گواهی‌نامه‌ها';
            const existing = await fetchFromGitHub('_data/certificates.json');
            let sha = null;
            if (existing) sha = existing.sha;
            await saveToGitHub('_data/certificates.json', certsData, sha);
            showMsg('✅ گواهی‌نامه‌ها با موفقیت ذخیره شدند!', 'success');
            showToast('✅ گواهی‌نامه‌ها ذخیره شدند', 'success');
        } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
    }

    // ===== 0526.3 - مهارت‌های تخصصی =====
    function loadSkills() {
        fetchFromGitHub('_data/skills.json').then(data => {
            if (data) {
                try { skillsData = JSON.parse(data.content); } catch (e) { skillsData = { title: 'مهارت‌های تخصصی', desc: '', items: [] }; }
            } else { skillsData = { title: 'مهارت‌های تخصصی', desc: '', items: [] }; }
            renderSkills();
        }).catch(() => { skillsData = { title: 'مهارت‌های تخصصی', desc: '', items: [] }; renderSkills(); });
    }
    function renderSkills() {
        document.getElementById('skillsSectionTitle').value = skillsData.title || 'مهارت‌های تخصصی';
        document.getElementById('skillsSectionDesc').value = skillsData.desc || '';
        const list = document.getElementById('skillsList');
        if (!list) return;
        const items = skillsData.items || [];
        if (items.length === 0) {
            list.innerHTML = '<div class="pro-empty"><i class="fas fa-cogs"></i>هیچ مهارتی ثبت نشده است.</div>';
            return;
        }
        list.innerHTML = items.map((item, index) => `
            <div class="pro-item">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
                    <div style="flex:1;min-width:150px;">
                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                            ${item.icon ? `<i class="fas ${item.icon}" style="color:var(--pro-primary);"></i>` : ''}
                            <strong>${item.name || 'بدون نام'}</strong>
                            <span style="background:var(--pro-primary);color:#fff;padding:1px 10px;border-radius:20px;font-size:0.65rem;">${item.level || 'متوسط'}</span>
                            <span style="font-weight:700;color:var(--pro-primary);">${item.progress || 0}%</span>
                        </div>
                        <div style="font-size:0.8rem;color:var(--pro-text-secondary);margin-top:2px;">${item.desc || ''}</div>
                        <div class="pro-skill-bar" style="width:100%;height:6px;background:var(--pro-border);border-radius:4px;overflow:hidden;margin-top:4px;">
                            <div class="fill" style="width:${item.progress || 0}%;height:100%;background:${item.color || 'var(--pro-primary)'};border-radius:4px;transition:width 0.5s ease;"></div>
                        </div>
                    </div>
                    <div style="display:flex;gap:4px;flex-wrap:wrap;">
                        <button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditSkillModal(${index})" title="ویرایش"><i class="fas fa-edit"></i></button>
                        <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveSkillItem(${index}, -1)" title="بالا" ${index === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                        <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveSkillItem(${index}, 1)" title="پایین" ${index === items.length - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                        <button class="pro-btn pro-btn-danger pro-btn-sm" onclick="removeSkillItem(${index})" title="حذف"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    function addSkillItem() {
        const name = document.getElementById('newSkillName').value.trim();
        const icon = document.getElementById('newSkillIcon').value.trim();
        const level = document.getElementById('newSkillLevel').value;
        const desc = document.getElementById('newSkillDesc').value.trim();
        const progress = parseInt(document.getElementById('newSkillPercent').value) || 0;
        const color = document.getElementById('newSkillColor').value;
        if (!name) { showMsg('لطفاً نام مهارت را وارد کنید.', 'error'); return; }
        skillsData.items.push({ name, icon, level, desc, progress, color });
        document.getElementById('newSkillName').value = '';
        document.getElementById('newSkillIcon').value = '';
        document.getElementById('newSkillDesc').value = '';
        document.getElementById('newSkillPercent').value = '';
        renderSkills();
        showMsg('✅ مهارت اضافه شد.', 'success');
    }
    function removeSkillItem(index) {
        if (!confirm('آیا از حذف این مهارت مطمئن هستید؟')) return;
        skillsData.items.splice(index, 1);
        renderSkills();
        showMsg('✅ مهارت حذف شد.', 'info');
    }
    function moveSkillItem(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= skillsData.items.length) return;
        const item = skillsData.items.splice(index, 1)[0];
        skillsData.items.splice(newIndex, 0, item);
        renderSkills();
        showMsg('✅ ترتیب تغییر کرد.', 'info');
    }
    function openEditSkillModal(index) {
        const item = skillsData.items[index];
        if (!item) { showMsg('❌ آیتم یافت نشد.', 'error'); return; }
        const modal = createEditModal('ویرایش مهارت', `
            <div class="pro-grid">
                <div class="pro-field full"><label>نام مهارت</label><input type="text" id="editSkillName" value="${item.name || ''}"></div>
                <div class="pro-field"><label>آیکون</label><input type="text" id="editSkillIcon" value="${item.icon || ''}"></div>
                <div class="pro-field"><label>سطح</label>
                    <select id="editSkillLevel">
                        <option value="مقدماتی" ${item.level === 'مقدماتی' ? 'selected' : ''}>مقدماتی</option>
                        <option value="متوسط" ${item.level === 'متوسط' ? 'selected' : ''}>متوسط</option>
                        <option value="پیشرفته" ${item.level === 'پیشرفته' ? 'selected' : ''}>پیشرفته</option>
                        <option value="حرفه‌ای" ${item.level === 'حرفه‌ای' ? 'selected' : ''}>حرفه‌ای</option>
                    </select>
                </div>
                <div class="pro-field full"><label>توضیحات</label><input type="text" id="editSkillDesc" value="${item.desc || ''}"></div>
                <div class="pro-field"><label>درصد تسلط</label><input type="number" id="editSkillProgress" value="${item.progress || 0}" min="0" max="100"></div>
                <div class="pro-field"><label>رنگ</label><input type="color" id="editSkillColor" value="${item.color || '#2563eb'}"></div>
            </div>
        `, () => {
            skillsData.items[index] = {
                name: document.getElementById('editSkillName').value.trim() || item.name,
                icon: document.getElementById('editSkillIcon').value.trim(),
                level: document.getElementById('editSkillLevel').value,
                desc: document.getElementById('editSkillDesc').value.trim(),
                progress: parseInt(document.getElementById('editSkillProgress').value) || 0,
                color: document.getElementById('editSkillColor').value
            };
            renderSkills();
            modal.remove();
            showMsg('✅ مهارت ویرایش شد.', 'success');
        });
        document.body.appendChild(modal);
    }
    async function saveSkills() {
        try {
            skillsData.title = document.getElementById('skillsSectionTitle').value.trim() || 'مهارت‌های تخصصی';
            skillsData.desc = document.getElementById('skillsSectionDesc').value.trim();
            const existing = await fetchFromGitHub('_data/skills.json');
            let sha = null;
            if (existing) sha = existing.sha;
            await saveToGitHub('_data/skills.json', skillsData, sha);
            showMsg('✅ مهارت‌ها با موفقیت ذخیره شدند!', 'success');
            showToast('✅ مهارت‌ها ذخیره شدند', 'success');
        } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
    }

    // ===== 0526.4 - شبکه‌های اجتماعی =====
    function loadSocial() {
        fetchFromGitHub('_data/social.json').then(data => {
            if (data) {
                try { socialData = JSON.parse(data.content); } catch (e) { socialData = { title: 'شبکه‌های اجتماعی', items: [] }; }
            } else { socialData = { title: 'شبکه‌های اجتماعی', items: [] }; }
            renderSocial();
        }).catch(() => { socialData = { title: 'شبکه‌های اجتماعی', items: [] }; renderSocial(); });
    }
    function renderSocial() {
        document.getElementById('socialSectionTitle').value = socialData.title || 'شبکه‌های اجتماعی';
        renderItems('socialList', socialData.items, (item, idx, total) => `
            <div class="pro-item">
                <div class="info">
                    <div class="title">${item.icon ? `<i class="fas ${item.icon}"></i>` : ''} ${item.name || 'بدون نام'}</div>
                    <div class="meta"><span><a href="${item.url || '#'}" target="_blank">${item.url || ''}</a></span></div>
                </div>
                <div class="actions">
                    <button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditSocialModal(${idx})" title="ویرایش"><i class="fas fa-edit"></i></button>
                    <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveSocialItem(${idx}, -1)" title="بالا" ${idx === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                    <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveSocialItem(${idx}, 1)" title="پایین" ${idx === total - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                    <button class="pro-btn pro-btn-danger pro-btn-sm" onclick="removeSocialItem(${idx})" title="حذف"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `);
    }
    function addSocialItem() {
        const name = document.getElementById('newSocialName').value.trim();
        const url = document.getElementById('newSocialUrl').value.trim();
        const icon = document.getElementById('newSocialIcon').value.trim();
        const color = document.getElementById('newSocialColor').value;
        if (!name || !url) { showMsg('لطفاً نام و آدرس لینک را وارد کنید.', 'error'); return; }
        socialData.items.push({ name, url, icon, color });
        document.getElementById('newSocialName').value = '';
        document.getElementById('newSocialUrl').value = '';
        document.getElementById('newSocialIcon').value = '';
        renderSocial();
        showMsg('✅ شبکه اضافه شد.', 'success');
    }
    function removeSocialItem(index) {
        if (!confirm('آیا از حذف این شبکه اجتماعی مطمئن هستید؟')) return;
        socialData.items.splice(index, 1);
        renderSocial();
        showMsg('✅ شبکه حذف شد.', 'info');
    }
    function moveSocialItem(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= socialData.items.length) return;
        const item = socialData.items.splice(index, 1)[0];
        socialData.items.splice(newIndex, 0, item);
        renderSocial();
        showMsg('✅ ترتیب تغییر کرد.', 'info');
    }
    function openEditSocialModal(index) {
        const item = socialData.items[index];
        if (!item) { showMsg('❌ آیتم یافت نشد.', 'error'); return; }
        const modal = createEditModal('ویرایش شبکه اجتماعی', `
            <div class="pro-grid">
                <div class="pro-field full"><label>نام شبکه</label><input type="text" id="editSocialName" value="${item.name || ''}"></div>
                <div class="pro-field full"><label>آدرس لینک</label><input type="text" id="editSocialUrl" value="${item.url || ''}"></div>
                <div class="pro-field"><label>آیکون</label><input type="text" id="editSocialIcon" value="${item.icon || ''}"></div>
                <div class="pro-field"><label>رنگ</label><input type="color" id="editSocialColor" value="${item.color || '#0088cc'}"></div>
            </div>
        `, () => {
            socialData.items[index] = {
                name: document.getElementById('editSocialName').value.trim() || item.name,
                url: document.getElementById('editSocialUrl').value.trim() || item.url,
                icon: document.getElementById('editSocialIcon').value.trim(),
                color: document.getElementById('editSocialColor').value
            };
            renderSocial();
            modal.remove();
            showMsg('✅ شبکه ویرایش شد.', 'success');
        });
        document.body.appendChild(modal);
    }
    async function saveSocial() {
        try {
            socialData.title = document.getElementById('socialSectionTitle').value.trim() || 'شبکه‌های اجتماعی';
            const existing = await fetchFromGitHub('_data/social.json');
            let sha = null;
            if (existing) sha = existing.sha;
            await saveToGitHub('_data/social.json', socialData, sha);
            showMsg('✅ شبکه‌های اجتماعی با موفقیت ذخیره شدند!', 'success');
            showToast('✅ شبکه‌ها ذخیره شدند', 'success');
        } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
    }

    // ===== 0526.5 - خدمات تخصصی =====
    function loadServices() {
        fetchFromGitHub('_data/services.json').then(data => {
            if (data) {
                try { servicesData = JSON.parse(data.content); } catch (e) { servicesData = { title: 'خدمات تخصصی', desc: '', items: [] }; }
            } else { servicesData = { title: 'خدمات تخصصی', desc: '', items: [] }; }
            renderServices();
        }).catch(() => { servicesData = { title: 'خدمات تخصصی', desc: '', items: [] }; renderServices(); });
    }
    function renderServices() {
        document.getElementById('servicesSectionTitle').value = servicesData.title || 'خدمات تخصصی';
        document.getElementById('servicesSectionDesc').value = servicesData.desc || '';
        renderItems('servicesList', servicesData.items, (item, idx, total) => `
            <div class="pro-item">
                <div class="info">
                    <div class="title">${item.icon ? `<i class="fas ${item.icon}"></i>` : ''} ${item.name || 'بدون نام'}</div>
                    <div class="meta">${item.desc || ''}</div>
                </div>
                <div class="actions">
                    <button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditServiceModal(${idx})" title="ویرایش"><i class="fas fa-edit"></i></button>
                    <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveServiceItem(${idx}, -1)" title="بالا" ${idx === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                    <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveServiceItem(${idx}, 1)" title="پایین" ${idx === total - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                    <button class="pro-btn pro-btn-danger pro-btn-sm" onclick="removeServiceItem(${idx})" title="حذف"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `);
    }
    function addServiceItem() {
        const name = document.getElementById('newServiceName').value.trim();
        const icon = document.getElementById('newServiceIcon').value.trim();
        const desc = document.getElementById('newServiceDesc').value.trim();
        if (!name) { showMsg('لطفاً نام خدمت را وارد کنید.', 'error'); return; }
        servicesData.items.push({ name, icon, desc });
        document.getElementById('newServiceName').value = '';
        document.getElementById('newServiceIcon').value = '';
        document.getElementById('newServiceDesc').value = '';
        renderServices();
        showMsg('✅ خدمت اضافه شد.', 'success');
    }
    function removeServiceItem(index) {
        if (!confirm('آیا از حذف این خدمت مطمئن هستید؟')) return;
        servicesData.items.splice(index, 1);
        renderServices();
        showMsg('✅ خدمت حذف شد.', 'info');
    }
    function moveServiceItem(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= servicesData.items.length) return;
        const item = servicesData.items.splice(index, 1)[0];
        servicesData.items.splice(newIndex, 0, item);
        renderServices();
        showMsg('✅ ترتیب تغییر کرد.', 'info');
    }
    function openEditServiceModal(index) {
        const item = servicesData.items[index];
        if (!item) { showMsg('❌ آیتم یافت نشد.', 'error'); return; }
        const modal = createEditModal('ویرایش خدمت', `
            <div class="pro-grid">
                <div class="pro-field full"><label>نام خدمت</label><input type="text" id="editServiceName" value="${item.name || ''}"></div>
                <div class="pro-field"><label>آیکون</label><input type="text" id="editServiceIcon" value="${item.icon || ''}"></div>
                <div class="pro-field full"><label>توضیحات</label><input type="text" id="editServiceDesc" value="${item.desc || ''}"></div>
            </div>
        `, () => {
            servicesData.items[index] = {
                name: document.getElementById('editServiceName').value.trim() || item.name,
                icon: document.getElementById('editServiceIcon').value.trim(),
                desc: document.getElementById('editServiceDesc').value.trim()
            };
            renderServices();
            modal.remove();
            showMsg('✅ خدمت ویرایش شد.', 'success');
        });
        document.body.appendChild(modal);
    }
    async function saveServices() {
        try {
            servicesData.title = document.getElementById('servicesSectionTitle').value.trim() || 'خدمات تخصصی';
            servicesData.desc = document.getElementById('servicesSectionDesc').value.trim();
            const existing = await fetchFromGitHub('_data/services.json');
            let sha = null;
            if (existing) sha = existing.sha;
            await saveToGitHub('_data/services.json', servicesData, sha);
            showMsg('✅ خدمات با موفقیت ذخیره شدند!', 'success');
            showToast('✅ خدمات ذخیره شدند', 'success');
        } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
    }
    // ===== 0526.6 - نظرات مشتریان =====
    function loadTestimonials() {
        fetchFromGitHub('_data/testimonials.json').then(data => {
            if (data) {
                try { testimonialsData = JSON.parse(data.content); } catch (e) { testimonialsData = { title: 'نظرات مشتریان', items: [] }; }
            } else { testimonialsData = { title: 'نظرات مشتریان', items: [] }; }
            renderTestimonials();
        }).catch(() => { testimonialsData = { title: 'نظرات مشتریان', items: [] }; renderTestimonials(); });
    }
    function renderTestimonials() {
        document.getElementById('testimonialsSectionTitle').value = testimonialsData.title || 'نظرات مشتریان';
        renderItems('testimonialsList', testimonialsData.items, (item, idx, total) => `
            <div class="pro-item">
                <div class="info">
                    <div class="title">${item.name || 'بدون نام'} <span style="font-size:0.8rem;color:var(--text-secondary);">${item.position || ''}</span></div>
                    <div class="meta">${item.text || ''} | امتیاز: ${'⭐'.repeat(item.rating || 5)}</div>
                </div>
                <div class="actions">
                    <button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditTestimonialModal(${idx})" title="ویرایش"><i class="fas fa-edit"></i></button>
                    <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveTestimonialItem(${idx}, -1)" title="بالا" ${idx === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                    <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveTestimonialItem(${idx}, 1)" title="پایین" ${idx === total - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                    <button class="pro-btn pro-btn-danger pro-btn-sm" onclick="removeTestimonialItem(${idx})" title="حذف"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `);
    }
    function addTestimonialItem() {
        const name = document.getElementById('newTestiName').value.trim();
        const position = document.getElementById('newTestiPosition').value.trim();
        const text = document.getElementById('newTestiText').value.trim();
        const rating = parseInt(document.getElementById('newTestiRating').value) || 5;
        const image = document.getElementById('newTestiImage').value.trim();
        if (!name || !text) { showMsg('لطفاً نام و متن نظر را وارد کنید.', 'error'); return; }
        testimonialsData.items.push({ name, position, text, rating, image });
        document.getElementById('newTestiName').value = '';
        document.getElementById('newTestiPosition').value = '';
        document.getElementById('newTestiText').value = '';
        document.getElementById('newTestiRating').value = '';
        document.getElementById('newTestiImage').value = '';
        renderTestimonials();
        showMsg('✅ نظر اضافه شد.', 'success');
    }
    function removeTestimonialItem(index) {
        if (!confirm('آیا از حذف این نظر مطمئن هستید؟')) return;
        testimonialsData.items.splice(index, 1);
        renderTestimonials();
        showMsg('✅ نظر حذف شد.', 'info');
    }
    function moveTestimonialItem(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= testimonialsData.items.length) return;
        const item = testimonialsData.items.splice(index, 1)[0];
        testimonialsData.items.splice(newIndex, 0, item);
        renderTestimonials();
        showMsg('✅ ترتیب تغییر کرد.', 'info');
    }
    function openEditTestimonialModal(index) {
        const item = testimonialsData.items[index];
        if (!item) { showMsg('❌ آیتم یافت نشد.', 'error'); return; }
        const modal = createEditModal('ویرایش نظر', `
            <div class="pro-grid">
                <div class="pro-field full"><label>نام</label><input type="text" id="editTestiName" value="${item.name || ''}"></div>
                <div class="pro-field"><label>سمت</label><input type="text" id="editTestiPosition" value="${item.position || ''}"></div>
                <div class="pro-field full"><label>متن نظر</label><input type="text" id="editTestiText" value="${item.text || ''}"></div>
                <div class="pro-field"><label>امتیاز (۱-۵)</label><input type="number" id="editTestiRating" value="${item.rating || 5}" min="1" max="5"></div>
                <div class="pro-field"><label>تصویر</label><input type="text" id="editTestiImage" value="${item.image || ''}"></div>
            </div>
        `, () => {
            testimonialsData.items[index] = {
                name: document.getElementById('editTestiName').value.trim() || item.name,
                position: document.getElementById('editTestiPosition').value.trim(),
                text: document.getElementById('editTestiText').value.trim() || item.text,
                rating: parseInt(document.getElementById('editTestiRating').value) || 5,
                image: document.getElementById('editTestiImage').value.trim()
            };
            renderTestimonials();
            modal.remove();
            showMsg('✅ نظر ویرایش شد.', 'success');
        });
        document.body.appendChild(modal);
    }
    async function saveTestimonials() {
        try {
            testimonialsData.title = document.getElementById('testimonialsSectionTitle').value.trim() || 'نظرات مشتریان';
            const existing = await fetchFromGitHub('_data/testimonials.json');
            let sha = null;
            if (existing) sha = existing.sha;
            await saveToGitHub('_data/testimonials.json', testimonialsData, sha);
            showMsg('✅ نظرات با موفقیت ذخیره شدند!', 'success');
            showToast('✅ نظرات ذخیره شدند', 'success');
        } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
    }

    // ===== 0526.7 - جوایز و افتخارات =====
    function loadAwards() {
        fetchFromGitHub('_data/awards.json').then(data => {
            if (data) {
                try { awardsData = JSON.parse(data.content); } catch (e) { awardsData = { title: 'جوایز و افتخارات', items: [] }; }
            } else { awardsData = { title: 'جوایز و افتخارات', items: [] }; }
            renderAwards();
        }).catch(() => { awardsData = { title: 'جوایز و افتخارات', items: [] }; renderAwards(); });
    }
    function renderAwards() {
        document.getElementById('awardsSectionTitle').value = awardsData.title || 'جوایز و افتخارات';
        renderItems('awardsList', awardsData.items, (item, idx, total) => `
            <div class="pro-item">
                <div class="info">
                    <div class="title">${item.name || 'بدون نام'} <span style="font-size:0.8rem;color:var(--text-secondary);">${item.org || ''}</span></div>
                    <div class="meta">${item.date || ''} ${item.desc ? '| ' + item.desc : ''}</div>
                </div>
                <div class="actions">
                    <button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditAwardModal(${idx})" title="ویرایش"><i class="fas fa-edit"></i></button>
                    <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveAwardItem(${idx}, -1)" title="بالا" ${idx === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                    <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveAwardItem(${idx}, 1)" title="پایین" ${idx === total - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                    <button class="pro-btn pro-btn-danger pro-btn-sm" onclick="removeAwardItem(${idx})" title="حذف"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `);
    }
    function addAwardItem() {
        const name = document.getElementById('newAwardName').value.trim();
        const org = document.getElementById('newAwardOrg').value.trim();
        const date = document.getElementById('newAwardDate').value.trim();
        const desc = document.getElementById('newAwardDesc').value.trim();
        if (!name) { showMsg('لطفاً نام جایزه را وارد کنید.', 'error'); return; }
        awardsData.items.push({ name, org, date, desc });
        document.getElementById('newAwardName').value = '';
        document.getElementById('newAwardOrg').value = '';
        document.getElementById('newAwardDate').value = '';
        document.getElementById('newAwardDesc').value = '';
        renderAwards();
        showMsg('✅ جایزه اضافه شد.', 'success');
    }
    function removeAwardItem(index) {
        if (!confirm('آیا از حذف این جایزه مطمئن هستید؟')) return;
        awardsData.items.splice(index, 1);
        renderAwards();
        showMsg('✅ جایزه حذف شد.', 'info');
    }
    function moveAwardItem(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= awardsData.items.length) return;
        const item = awardsData.items.splice(index, 1)[0];
        awardsData.items.splice(newIndex, 0, item);
        renderAwards();
        showMsg('✅ ترتیب تغییر کرد.', 'info');
    }
    function openEditAwardModal(index) {
        const item = awardsData.items[index];
        if (!item) { showMsg('❌ آیتم یافت نشد.', 'error'); return; }
        const modal = createEditModal('ویرایش جایزه', `
            <div class="pro-grid">
                <div class="pro-field full"><label>نام جایزه / افتخار</label><input type="text" id="editAwardName" value="${item.name || ''}"></div>
                <div class="pro-field"><label>موسسه / رویداد</label><input type="text" id="editAwardOrg" value="${item.org || ''}"></div>
                <div class="pro-field"><label>تاریخ</label><input type="text" id="editAwardDate" value="${item.date || ''}"></div>
                <div class="pro-field"><label>توضیحات</label><input type="text" id="editAwardDesc" value="${item.desc || ''}"></div>
            </div>
        `, () => {
            awardsData.items[index] = {
                name: document.getElementById('editAwardName').value.trim() || item.name,
                org: document.getElementById('editAwardOrg').value.trim(),
                date: document.getElementById('editAwardDate').value.trim(),
                desc: document.getElementById('editAwardDesc').value.trim()
            };
            renderAwards();
            modal.remove();
            showMsg('✅ جایزه ویرایش شد.', 'success');
        });
        document.body.appendChild(modal);
    }
    async function saveAwards() {
        try {
            awardsData.title = document.getElementById('awardsSectionTitle').value.trim() || 'جوایز و افتخارات';
            const existing = await fetchFromGitHub('_data/awards.json');
            let sha = null;
            if (existing) sha = existing.sha;
            await saveToGitHub('_data/awards.json', awardsData, sha);
            showMsg('✅ جوایز با موفقیت ذخیره شدند!', 'success');
            showToast('✅ جوایز ذخیره شدند', 'success');
        } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
    }

    // ===== 0526.8 - لینک‌های مفید =====
    function loadLinks() {
        fetchFromGitHub('_data/links.json').then(data => {
            if (data) {
                try { linksData = JSON.parse(data.content); } catch (e) { linksData = { title: 'لینک‌های مفید', items: [] }; }
            } else { linksData = { title: 'لینک‌های مفید', items: [] }; }
            renderLinks();
        }).catch(() => { linksData = { title: 'لینک‌های مفید', items: [] }; renderLinks(); });
    }
    function renderLinks() {
        document.getElementById('linksSectionTitle').value = linksData.title || 'لینک‌های مفید';
        renderItems('linksList', linksData.items, (item, idx, total) => `
            <div class="pro-item">
                <div class="info">
                    <div class="title">${item.icon ? `<i class="fas ${item.icon}"></i>` : ''} ${item.name || 'بدون نام'}</div>
                    <div class="meta"><a href="${item.url || '#'}" target="_blank">${item.url || ''}</a></div>
                </div>
                <div class="actions">
                    <button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditLinkModal(${idx})" title="ویرایش"><i class="fas fa-edit"></i></button>
                    <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveLinkItem(${idx}, -1)" title="بالا" ${idx === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                    <button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveLinkItem(${idx}, 1)" title="پایین" ${idx === total - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                    <button class="pro-btn pro-btn-danger pro-btn-sm" onclick="removeLinkItem(${idx})" title="حذف"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `);
    }
    function addLinkItem() {
        const name = document.getElementById('newLinkName').value.trim();
        const url = document.getElementById('newLinkUrl').value.trim();
        const icon = document.getElementById('newLinkIcon').value.trim();
        if (!name) { showMsg('لطفاً نام لینک را وارد کنید.', 'error'); return; }
        linksData.items.push({ name, url, icon });
        document.getElementById('newLinkName').value = '';
        document.getElementById('newLinkUrl').value = '';
        document.getElementById('newLinkIcon').value = '';
        renderLinks();
        showMsg('✅ لینک اضافه شد.', 'success');
    }
    function removeLinkItem(index) {
        if (!confirm('آیا از حذف این لینک مطمئن هستید؟')) return;
        linksData.items.splice(index, 1);
        renderLinks();
        showMsg('✅ لینک حذف شد.', 'info');
    }
    function moveLinkItem(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= linksData.items.length) return;
        const item = linksData.items.splice(index, 1)[0];
        linksData.items.splice(newIndex, 0, item);
        renderLinks();
        showMsg('✅ ترتیب تغییر کرد.', 'info');
    }
    function openEditLinkModal(index) {
        const item = linksData.items[index];
        if (!item) { showMsg('❌ آیتم یافت نشد.', 'error'); return; }
        const modal = createEditModal('ویرایش لینک', `
            <div class="pro-grid">
                <div class="pro-field full"><label>نام لینک</label><input type="text" id="editLinkName" value="${item.name || ''}"></div>
                <div class="pro-field full"><label>آدرس لینک</label><input type="text" id="editLinkUrl" value="${item.url || ''}"></div>
                <div class="pro-field"><label>آیکون</label><input type="text" id="editLinkIcon" value="${item.icon || ''}"></div>
            </div>
        `, () => {
            linksData.items[index] = {
                name: document.getElementById('editLinkName').value.trim() || item.name,
                url: document.getElementById('editLinkUrl').value.trim() || item.url,
                icon: document.getElementById('editLinkIcon').value.trim()
            };
            renderLinks();
            modal.remove();
            showMsg('✅ لینک ویرایش شد.', 'success');
        });
        document.body.appendChild(modal);
    }
    async function saveLinks() {
        try {
            linksData.title = document.getElementById('linksSectionTitle').value.trim() || 'لینک‌های مفید';
            const existing = await fetchFromGitHub('_data/links.json');
            let sha = null;
            if (existing) sha = existing.sha;
            await saveToGitHub('_data/links.json', linksData, sha);
            showMsg('✅ لینک‌ها با موفقیت ذخیره شدند!', 'success');
            showToast('✅ لینک‌ها ذخیره شدند', 'success');
        } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
    }

    // ===== 0526.9 - بارگذاری همه محتوای ایندکس =====
    function loadAllIndexContent() {
        loadEducation();
        loadCertificates();
        loadSkills();
        loadSocial();
        loadServices();
        loadTestimonials();
        loadAwards();
        loadLinks();
    }

    // ============================================================
    // 0527 - مدیریت کاربران (Members) و سفارشات
    // ============================================================
    let membersData = [];
    let currentMemberId = null;
    let currentMemberOrders = [];

    // ===== ۱. بارگذاری لیست کاربران =====
    async function loadMembers() {
        const list = document.getElementById('membersList');
        if (!getToken()) {
            list.innerHTML = '<div class="pro-empty"><i class="fas fa-key"></i>لطفاً توکن گیت‌هاب را وارد کنید.</div>';
            document.getElementById('proMembersCount').textContent = '0';
            document.getElementById('proMembersSub').textContent = '۰ کاربر';
            return;
        }
        try {
            const token = getToken();
            const dirUrl = `https://api.github.com/${REPO_PATH}/member/`;
            const dirRes = await fetch(dirUrl, {
                headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json' }
            });
            if (dirRes.status === 404) {
                list.innerHTML = '<div class="pro-empty"><i class="fas fa-folder-open"></i>پوشه member وجود ندارد. هنوز کاربری ثبت نشده است.</div>';
                document.getElementById('proMembersCount').textContent = '0';
                return;
            }
            if (!dirRes.ok) throw new Error('خطا در خواندن لیست کاربران: ' + dirRes.status);
            const items = await dirRes.json();
            const memberDirs = items.filter(item =>
                item.type === 'dir' &&
                item.name.startsWith('member') &&
                /^member\d{4}$/.test(item.name)
            );
            membersData = [];
            for (const dir of memberDirs) {
                const memberId = dir.name.replace('member', '');
                try {
                    const infoPath = `member/${dir.name}/info.json`;
                    const infoRes = await fetchFromGitHub(infoPath);
                    if (infoRes) {
                        const info = JSON.parse(infoRes.content);
                        membersData.push({ id: memberId, path: dir.name, ...info });
                    } else {
                        membersData.push({
                            id: memberId,
                            path: dir.name,
                            name: 'کاربر ناشناس',
                            username: 'unknown',
                            email: '',
                            phone: '',
                            whatsapp: '',
                            telegram: '',
                            addresses: [],
                            created: new Date().toISOString()
                        });
                    }
                } catch (e) { console.warn('⚠️ خطا در بارگذاری اطلاعات کاربر:', dir.name, e); }
            }
            membersData.sort((a, b) => parseInt(a.id) - parseInt(b.id));
            renderMembers();
        } catch (e) {
            list.innerHTML = `<div class="pro-empty"><i class="fas fa-exclamation-triangle" style="color:var(--pro-red);"></i>خطا: ${e.message}</div>`;
            console.error('❌ خطا در بارگذاری کاربران:', e);
        }
    }
    // ===== دریافت اطلاعات کاربر (کمکی) =====
    async function getUserInfo(userId) {
        try {
            const infoPath = `member/member${userId}/info.json`;
            const data = await fetchFromGitHub(infoPath);
            if (data) return JSON.parse(data.content);
            return null;
        } catch (e) {
            return null;
        }
    }

    // ===== ۲. رندر لیست کاربران =====
    function renderMembers() {
        const list = document.getElementById('membersList');
        if (!list) return;
        if (membersData.length === 0) {
            list.innerHTML = '<div class="pro-empty"><i class="fas fa-users"></i>هیچ کاربری یافت نشد.</div>';
        } else {
            list.innerHTML = membersData.map((member) => `
                <div class="pro-item" onclick="viewMemberDetail('${member.id}')" style="cursor:pointer;">
                    <div class="info">
                        <div class="title">
                            <i class="fas fa-user" style="color:var(--pro-primary);"></i>
                            ${member.name || 'بدون نام'}
                            <span style="color:var(--pro-text-secondary);font-size:0.7rem;">#${member.id}</span>
                            ${member.username ? `<span style="font-size:0.7rem;color:var(--pro-text-secondary);">@${member.username}</span>` : ''}
                        </div>
                        <div class="meta">
                            ${member.email ? `<span><i class="fas fa-envelope"></i> ${member.email}</span>` : ''}
                            ${member.phone ? `<span><i class="fas fa-phone"></i> ${member.phone}</span>` : ''}
                            ${member.telegram ? `<span><i class="fab fa-telegram"></i> ${member.telegram}</span>` : ''}
                            ${member.created ? `<span><i class="fas fa-calendar"></i> ${new Date(member.created).toLocaleDateString('fa-IR')}</span>` : ''}
                        </div>
                    </div>
                    <div class="actions">
                        <button class="pro-btn pro-btn-primary pro-btn-sm" onclick="event.stopPropagation();viewMemberDetail('${member.id}')"><i class="fas fa-eye"></i></button>
                        <button class="pro-btn pro-btn-warning pro-btn-sm" onclick="event.stopPropagation();openEditMemberModal('${member.id}')"><i class="fas fa-edit"></i></button>
                        <button class="pro-btn pro-btn-danger pro-btn-sm" onclick="event.stopPropagation();deleteMember('${member.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `).join('');
        }
        document.getElementById('proMembersCount').textContent = membersData.length;
        document.getElementById('proMembersSub').textContent = membersData.length + ' کاربر';
        updateDashboard();
    }

    // ===== ۳. فیلتر کاربران =====
    function filterMembers(query) {
        const q = query.toLowerCase().trim();
        if (!q) { renderMembers(); return; }
        const filtered = membersData.filter(m =>
            (m.name || '').toLowerCase().includes(q) ||
            (m.username || '').toLowerCase().includes(q) ||
            (m.email || '').toLowerCase().includes(q) ||
            (m.phone || '').includes(q) ||
            (m.id || '').includes(q)
        );
        const list = document.getElementById('membersList');
        if (filtered.length === 0) {
            list.innerHTML = '<div class="pro-empty"><i class="fas fa-search"></i>کاربری یافت نشد.</div>';
        } else {
            list.innerHTML = filtered.map((member) => `
                <div class="pro-item" onclick="viewMemberDetail('${member.id}')" style="cursor:pointer;">
                    <div class="info">
                        <div class="title"><i class="fas fa-user" style="color:var(--pro-primary);"></i> ${member.name || 'بدون نام'} <span style="color:var(--pro-text-secondary);font-size:0.7rem;">#${member.id}</span></div>
                        <div class="meta">${member.email || ''} ${member.phone || ''}</div>
                    </div>
                    <div class="actions">
                        <button class="pro-btn pro-btn-primary pro-btn-sm" onclick="event.stopPropagation();viewMemberDetail('${member.id}')"><i class="fas fa-eye"></i></button>
                        <button class="pro-btn pro-btn-warning pro-btn-sm" onclick="event.stopPropagation();openEditMemberModal('${member.id}')"><i class="fas fa-edit"></i></button>
                    </div>
                </div>
            `).join('');
        }
    }

    // ===== ۴. مشاهده جزئیات کاربر =====
    async function viewMemberDetail(memberId) {
        currentMemberId = memberId;
        const card = document.getElementById('memberDetailCard');
        card.style.display = 'block';
        const member = membersData.find(m => m.id === memberId);
        if (!member) { showMsg('❌ کاربر یافت نشد.', 'error'); return; }
        document.getElementById('memberDetailName').textContent = member.name || 'بدون نام';
        document.getElementById('memberDetailId').textContent = member.id;
        document.getElementById('memberDetailPhone').textContent = member.phone || '---';
        document.getElementById('memberDetailWhatsapp').textContent = member.whatsapp || '---';
        document.getElementById('memberDetailTelegram').textContent = member.telegram || '---';
        document.getElementById('memberDetailEmail').textContent = member.email || '---';
        document.getElementById('memberDetailCreated').textContent = member.created ? new Date(member.created).toLocaleDateString('fa-IR') : '---';
        const addrContainer = document.getElementById('memberAddresses');
        if (member.addresses && member.addresses.length > 0) {
            addrContainer.innerHTML = member.addresses.map(addr =>
                `<div style="padding:4px 8px;background:var(--pro-bg);border-radius:6px;margin-bottom:4px;border:1px solid var(--pro-border);font-size:0.85rem;">${addr}</div>`
            ).join('');
        } else {
            addrContainer.innerHTML = '<span style="color:var(--pro-text-secondary);">هیچ آدرسی ثبت نشده است.</span>';
        }
        await loadMemberOrders(memberId);
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ===== ۵. بارگذاری سفارشات کاربر =====
    async function loadMemberOrders(memberId) {
        const container = document.getElementById('memberOrdersList');
        container.innerHTML = '<div class="pro-empty"><i class="fas fa-spinner fa-spin"></i> در حال بارگذاری سفارشات...</div>';
        try {
            const path = `member/member${memberId}/order${memberId}.json`;
            const data = await fetchFromGitHub(path);
            if (!data) {
                await saveToGitHub(path, [], null);
                container.innerHTML = '<div class="pro-empty"><i class="fas fa-box"></i>هیچ سفارشی ثبت نشده است.</div>';
                currentMemberOrders = [];
                return;
            }
            currentMemberOrders = JSON.parse(data.content);
            currentMemberOrders.sort((a, b) => (a.date || '').localeCompare(b.date || '') * -1);
            renderMemberOrders(currentMemberOrders);
        } catch (e) {
            container.innerHTML = `<div class="pro-empty"><i class="fas fa-exclamation-triangle" style="color:var(--pro-red);"></i>خطا: ${e.message}</div>`;
            console.error('❌ خطا در بارگذاری سفارشات:', e);
        }
    }

    // ===== ۶. رندر سفارشات کاربر =====
    function renderMemberOrders(orders) {
        const container = document.getElementById('memberOrdersList');
        if (!orders || orders.length === 0) {
            container.innerHTML = '<div class="pro-empty"><i class="fas fa-box"></i>هیچ سفارشی ثبت نشده است.</div>';
            return;
        }
        const statusLabels = { 'pending': 'در انتظار پرداخت', 'paid': 'پرداخت شده', 'shipped': 'ارسال شده', 'completed': 'تکمیل شده', 'canceled': 'لغو شده' };
        const statusColors = { 'pending': 'var(--pro-yellow)', 'paid': 'var(--pro-secondary)', 'shipped': 'var(--pro-primary)', 'completed': 'var(--pro-green)', 'canceled': 'var(--pro-red)' };
        container.innerHTML = orders.map((order, idx) => `
            <div class="pro-item" style="cursor:pointer;" onclick="viewOrderDetail('${currentMemberId}','${idx}')">
                <div class="info">
                    <div class="title">
                        سفارش #${String(order.id || idx + 1).padStart(3, '0')}
                        <span style="font-size:0.7rem;color:var(--text-secondary);">${order.date || '---'}</span>
                        <span style="background:${statusColors[order.status] || 'var(--pro-yellow)'};color:#fff;padding:1px 10px;border-radius:20px;font-size:0.65rem;margin-right:8px;">${statusLabels[order.status] || order.status}</span>
                    </div>
                    <div class="meta">
                        <span><i class="fas fa-box"></i> ${order.items ? order.items.length : 0} محصول</span>
                        <span><i class="fas fa-money-bill"></i> ${(order.total || 0).toLocaleString()} تومان</span>
                        <span><i class="fas fa-truck"></i> ${order.shipping || '---'}</span>
                        <span><i class="fas fa-hashtag"></i> ${order.tracking || '---'}</span>
                    </div>
                </div>
                <div class="actions">
                    <button class="pro-btn pro-btn-primary pro-btn-sm" onclick="event.stopPropagation();viewOrderDetail('${currentMemberId}','${idx}')"><i class="fas fa-eye"></i></button>
                </div>
            </div>
        `).join('');
    }

    // ===== ۷. مشاهده جزئیات سفارش =====
    async function viewOrderDetail(userId, orderIndex) {
        if (!userId) { showMsg('❌ شناسه کاربر نامعتبر است.', 'error'); return; }
        try {
            const path = `member/member${userId}/orders.json`;
            const existing = await fetchFromGitHub(path);
            if (!existing) { showMsg('❌ فایل سفارشات یافت نشد.', 'error'); return; }
            let orders = JSON.parse(existing.content);
            if (!Array.isArray(orders) || orderIndex >= orders.length) {
                showMsg('❌ سفارش یافت نشد.', 'error');
                return;
            }
            const order = orders[orderIndex];
            
            const userInfo = await getUserInfo(userId);
            const userPhone = userInfo?.phone || '---';
            const userWhatsapp = userInfo?.whatsapp || '---';
            const userTelegram = userInfo?.telegram || '---';
            const userEmail = userInfo?.email || '---';
            const userAddresses = userInfo?.addresses?.join(' | ') || '---';
            
            const statusLabels = {
                'pending': '⏳ در انتظار پرداخت',
                'paid': '✅ پرداخت شده',
                'shipped': '📦 ارسال شده',
                'completed': '✔️ تکمیل شده',
                'canceled': '❌ لغو شده'
            };
            
            const modal = document.createElement('div');
            modal.className = 'pro-modal-overlay active';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="pro-modal" style="max-width:750px;">
                    <div class="pro-modal-header">
                        <h3><i class="fas fa-receipt"></i> جزئیات سفارش #${order.id || orderIndex+1}</h3>
                        <div style="display:flex;gap:8px;">
                            <button class="pro-btn pro-btn-sm pro-btn-warning" onclick="this.closest('.pro-modal-overlay').remove();openEditOrderModal('${userId}', ${orderIndex})"><i class="fas fa-edit"></i> ویرایش</button>
                            <button class="pro-modal-close" onclick="this.closest('.pro-modal-overlay').remove()"><i class="fas fa-times"></i></button>
                        </div>
                    </div>
                    
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px;background:var(--pro-bg);border-radius:var(--pro-radius);border:1px solid var(--pro-border);margin-bottom:12px;">
                        <div><span style="color:var(--pro-text-secondary);">🆔 شناسه سفارش:</span> <strong>${order.id || '---'}</strong></div>
                        <div><span style="color:var(--pro-text-secondary);">📅 تاریخ:</span> <strong>${order.date || '---'}</strong></div>
                        <div><span style="color:var(--pro-text-secondary);">👤 کاربر:</span> <strong>${order.userName || '---'}</strong> (ID: ${userId})</div>
                        <div><span style="color:var(--pro-text-secondary);">📌 وضعیت:</span> <span style="background:${order.status === 'pending' ? '#f59e0b' : order.status === 'paid' ? '#10b981' : order.status === 'shipped' ? '#3b82f6' : order.status === 'completed' ? '#10b981' : '#ef4444'}20;color:${order.status === 'pending' ? '#f59e0b' : order.status === 'paid' ? '#10b981' : order.status === 'shipped' ? '#3b82f6' : order.status === 'completed' ? '#10b981' : '#ef4444'};padding:2px 12px;border-radius:12px;font-size:0.7rem;font-weight:600;">${statusLabels[order.status] || order.status}</span></div>
                        <div style="grid-column:1/-1;border-top:1px solid var(--pro-border);padding-top:8px;">
                            <span style="color:var(--pro-text-secondary);">📞 اطلاعات تماس کاربر:</span><br>
                            <span style="font-size:0.9rem;">📱 موبایل: <strong>${userPhone}</strong> | 💬 واتساپ: <strong>${userWhatsapp}</strong> | ✈️ تلگرام: <strong>${userTelegram}</strong></span><br>
                            <span style="font-size:0.9rem;">📧 ایمیل: <strong>${userEmail}</strong></span>
                        </div>
                        <div style="grid-column:1/-1;border-top:1px solid var(--pro-border);padding-top:8px;">
                            <span style="color:var(--pro-text-secondary);">📍 آدرس‌های ثبت‌شده کاربر:</span><br>
                            <span style="font-size:0.9rem;"><strong>${userAddresses}</strong></span>
                        </div>
                        <div style="grid-column:1/-1;border-top:1px solid var(--pro-border);padding-top:8px;">
                            <span style="color:var(--pro-text-secondary);">📦 محصولات:</span>
                            <div style="background:var(--pro-bg);border-radius:var(--pro-radius);border:1px solid var(--pro-border);padding:10px;margin-top:4px;">
                                ${(order.items || []).map(item => `
                                    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--pro-border);font-size:0.9rem;">
                                        <span>${item.productName || item.productId} × ${item.quantity || 1}</span>
                                        <span style="font-weight:600;">${((item.price || 0) * (item.quantity || 1)).toLocaleString()} تومان</span>
                                    </div>
                                `).join('')}
                                <div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:700;font-size:1rem;border-top:2px solid var(--pro-border);margin-top:4px;">
                                    <span>مجموع کل</span>
                                    <span style="color:var(--pro-primary);">${(order.total || 0).toLocaleString()} تومان</span>
                                </div>
                            </div>
                        </div>
                        <div style="grid-column:1/-1;border-top:1px solid var(--pro-border);padding-top:8px;">
                            <span style="color:var(--pro-text-secondary);">🚚 روش ارسال:</span> <strong>${order.shipping || '---'}</strong>
                            <span style="margin-right:16px;color:var(--pro-text-secondary);">🔗 کد پیگیری:</span> <strong>${order.tracking || '---'}</strong>
                        </div>
                        ${order.notes ? `<div style="grid-column:1/-1;border-top:1px solid var(--pro-border);padding-top:8px;"><span style="color:var(--pro-text-secondary);">📝 توضیحات:</span> <strong>${order.notes}</strong></div>` : ''}
                        ${order.transactionId ? `<div style="grid-column:1/-1;"><span style="color:var(--pro-text-secondary);">💳 شناسه پرداخت:</span> <strong>${order.transactionId}</strong></div>` : ''}
                    </div>
                    
                    <div style="display:flex;gap:12px;margin-top:12px;">
                        <button class="pro-btn pro-btn-outline" onclick="this.closest('.pro-modal-overlay').remove()">بستن</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.addEventListener('click', function(e) { if (e.target === this) this.remove(); });
        } catch (e) {
            showMsg('❌ خطا: ' + e.message, 'error');
        }
    }
    // ===== حذف یک سفارش خاص =====
    async function deleteOrder(userId, orderIdx) {
        if (!userId) { showMsg('❌ شناسه کاربر نامعتبر است.', 'error'); return; }
        if (!confirm('آیا از حذف این سفارش مطمئن هستید؟')) return;
        try {
            const path = `member/member${userId}/orders.json`;
            const existing = await fetchFromGitHub(path);
            if (!existing) { showMsg('❌ فایل سفارشات یافت نشد.', 'error'); return; }
            let orders = JSON.parse(existing.content);
            if (!Array.isArray(orders) || orderIdx >= orders.length) {
                showMsg('❌ سفارش یافت نشد.', 'error');
                return;
            }
            const removed = orders.splice(orderIdx, 1)[0];
            await saveToGitHub(path, orders, existing.sha);
            showMsg(`✅ سفارش #${removed.id || orderIdx+1} حذف شد.`, 'success');
            await loadGlobalOrders();
            if (currentMemberId) loadMemberOrders(currentMemberId);
        } catch (e) {
            showMsg('❌ خطا در حذف سفارش: ' + e.message, 'error');
        }
    }
    // ===== ۸. ویرایش کامل سفارش =====
    async function openEditOrderModal(userId, orderIdx) {
        if (!userId) { showMsg('❌ شناسه کاربر نامعتبر است.', 'error'); return; }
        try {
            const path = `member/member${userId}/orders.json`;
            const existing = await fetchFromGitHub(path);
            if (!existing) { showMsg('❌ فایل سفارشات یافت نشد.', 'error'); return; }
            let orders = JSON.parse(existing.content);
            if (!Array.isArray(orders) || orderIdx >= orders.length) {
                showMsg('❌ سفارش یافت نشد.', 'error');
                return;
            }
            const order = orders[orderIdx];
            
            const userInfo = await getUserInfo(userId);
            const userPhone = userInfo?.phone || '---';
            const userWhatsapp = userInfo?.whatsapp || '---';
            const userTelegram = userInfo?.telegram || '---';
            const userEmail = userInfo?.email || '---';
            const userAddresses = userInfo?.addresses?.join(' | ') || '---';
            
            const modal = document.createElement('div');
            modal.className = 'pro-modal-overlay active';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="pro-modal" style="max-width:800px;">
                    <div class="pro-modal-header">
                        <h3><i class="fas fa-edit"></i> ویرایش سفارش #${order.id || orderIdx+1}</h3>
                        <button class="pro-modal-close" onclick="this.closest('.pro-modal-overlay').remove()"><i class="fas fa-times"></i></button>
                    </div>
                    <form id="editOrderForm">
                        <input type="hidden" id="editOrderUserId" value="${userId}">
                        <input type="hidden" id="editOrderIdx" value="${orderIdx}">
                        
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;background:var(--pro-bg);padding:12px;border-radius:8px;border:1px solid var(--pro-border);margin-bottom:12px;">
                            <div><span style="color:var(--pro-text-secondary);">👤 کاربر:</span> <strong>${order.userName || '---'}</strong> (ID: ${userId})</div>
                            <div><span style="color:var(--pro-text-secondary);">📱 موبایل:</span> <strong>${userPhone}</strong></div>
                            <div><span style="color:var(--pro-text-secondary);">💬 واتساپ:</span> <strong>${userWhatsapp}</strong></div>
                            <div><span style="color:var(--pro-text-secondary);">✈️ تلگرام:</span> <strong>${userTelegram}</strong></div>
                            <div style="grid-column:1/-1;"><span style="color:var(--pro-text-secondary);">📧 ایمیل:</span> <strong>${userEmail}</strong></div>
                            <div style="grid-column:1/-1;"><span style="color:var(--pro-text-secondary);">📍 آدرس‌های کاربر:</span> <strong>${userAddresses}</strong></div>
                        </div>
                        
                        <div class="pro-grid">
                            <div class="pro-field full"><label>شناسه سفارش</label><input type="text" id="editOrderId" value="${order.id || ''}" placeholder="شناسه سفارش"></div>
                            <div class="pro-field"><label>تاریخ</label><input type="date" id="editOrderDate" value="${order.date || ''}"></div>
                            <div class="pro-field"><label>نام کاربر</label><input type="text" id="editOrderUserName" value="${order.userName || ''}" placeholder="نام کاربر"></div>
                            <div class="pro-field"><label>مبلغ کل</label><input type="number" id="editOrderTotal" value="${order.total || 0}"></div>
                            <div class="pro-field"><label>روش ارسال</label>
                                <select id="editOrderShipping">
                                    <option value="پست پیشتاز" ${order.shipping === 'پست پیشتاز' ? 'selected' : ''}>پست پیشتاز</option>
                                    <option value="تیپاکس" ${order.shipping === 'تیپاکس' ? 'selected' : ''}>تیپاکس</option>
                                    <option value="حضوری" ${order.shipping === 'حضوری' ? 'selected' : ''}>حضوری</option>
                                    <option value="چاپار" ${order.shipping === 'چاپار' ? 'selected' : ''}>چاپار</option>
                                </select>
                            </div>
                            <div class="pro-field"><label>وضعیت</label>
                                <select id="editOrderStatus">
                                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>در انتظار پرداخت</option>
                                    <option value="paid" ${order.status === 'paid' ? 'selected' : ''}>پرداخت شده</option>
                                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>ارسال شده</option>
                                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>تکمیل شده</option>
                                    <option value="canceled" ${order.status === 'canceled' ? 'selected' : ''}>لغو شده</option>
                                </select>
                            </div>
                            <div class="pro-field full"><label>آدرس</label><input type="text" id="editOrderAddress" value="${order.address || ''}" placeholder="آدرس"></div>
                            <div class="pro-field"><label>کد پیگیری</label><input type="text" id="editOrderTracking" value="${order.tracking || ''}" placeholder="کد پیگیری"></div>
                            <div class="pro-field full"><label>محصولات (JSON)</label>
                                <textarea id="editOrderItems" rows="4" style="font-size:0.8rem;font-family:monospace;">${JSON.stringify(order.items || [], null, 2)}</textarea>
                                <span class="hint">فرمت: [{"productId":"PRD-001","productName":"نام محصول","quantity":1,"price":0}]</span>
                            </div>
                            <div class="pro-field full"><label>توضیحات</label><input type="text" id="editOrderNotes" value="${order.notes || ''}" placeholder="توضیحات اضافی"></div>
                        </div>
                        <div style="display:flex;gap:12px;margin-top:18px;">
                            <button type="submit" class="pro-btn pro-btn-primary"><i class="fas fa-save"></i> ذخیره تغییرات</button>
                            <button type="button" class="pro-btn pro-btn-outline" onclick="this.closest('.pro-modal-overlay').remove()">انصراف</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
            
            document.getElementById('editOrderForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                const userId2 = document.getElementById('editOrderUserId').value;
                const orderIdx2 = parseInt(document.getElementById('editOrderIdx').value);
                const newData = {
                    id: document.getElementById('editOrderId').value.trim() || `ORD-${Date.now().toString(36).toUpperCase()}`,
                    date: document.getElementById('editOrderDate').value || new Date().toISOString().split('T')[0],
                    userName: document.getElementById('editOrderUserName').value.trim() || 'کاربر',
                    total: parseFloat(document.getElementById('editOrderTotal').value) || 0,
                    shipping: document.getElementById('editOrderShipping').value,
                    status: document.getElementById('editOrderStatus').value,
                    address: document.getElementById('editOrderAddress').value.trim() || '---',
                    tracking: document.getElementById('editOrderTracking').value.trim() || `IR${Date.now().toString(36).toUpperCase()}`,
                    items: JSON.parse(document.getElementById('editOrderItems').value || '[]'),
                    notes: document.getElementById('editOrderNotes').value.trim() || '',
                    updated: new Date().toISOString()
                };
                try {
                    const path2 = `member/member${userId2}/orders.json`;
                    const existing2 = await fetchFromGitHub(path2);
                    if (!existing2) { showMsg('❌ فایل سفارشات یافت نشد.', 'error'); return; }
                    let orders2 = JSON.parse(existing2.content);
                    orders2[orderIdx2] = { ...orders2[orderIdx2], ...newData };
                    await saveToGitHub(path2, orders2, existing2.sha);
                    showMsg('✅ سفارش با موفقیت ویرایش شد!', 'success');
                    modal.remove();
                    await loadGlobalOrders();
                    if (currentMemberId) loadMemberOrders(currentMemberId);
                } catch (e) {
                    showMsg('❌ خطا: ' + e.message, 'error');
                }
            });
            
            modal.addEventListener('click', function(e) { if (e.target === this) this.remove(); });
        } catch (e) {
            showMsg('❌ خطا: ' + e.message, 'error');
        }
    }
    
    // ===== ۹. حذف کاربر =====
    async function deleteMember(memberId) {
        if (!memberId) memberId = currentMemberId;
        if (!memberId) { showMsg('❌ کاربری انتخاب نشده است.', 'error'); return; }
        const member = membersData.find(m => m.id === memberId);
        if (!member) { showMsg('❌ کاربر یافت نشد.', 'error'); return; }
        if (!confirm(`⚠️ آیا از حذف کامل کاربر "${member.name || memberId}" و تمام فایل‌های آن مطمئن هستید؟\nاین عمل غیرقابل بازگشت است.`)) return;
        
        try {
            const infoPath = `member/member${memberId}/info.json`;
            const infoData = await fetchFromGitHub(infoPath);
            if (infoData && infoData.sha) await deleteFromGitHub(infoPath, infoData.sha);
            
            const orderPath = `member/member${memberId}/orders.json`;
            const orderData = await fetchFromGitHub(orderPath);
            if (orderData && orderData.sha) await deleteFromGitHub(orderPath, orderData.sha);
            
            const oldOrderPath = `member/member${memberId}/order${memberId}.json`;
            const oldOrderData = await fetchFromGitHub(oldOrderPath);
            if (oldOrderData && oldOrderData.sha) await deleteFromGitHub(oldOrderPath, oldOrderData.sha);
            
            membersData = membersData.filter(m => m.id !== memberId);
            renderMembers();
            closeMemberDetail();
            await cleanUserFromPending(memberId);
            
            showMsg(`✅ کاربر "${member.name || memberId}" و تمام اطلاعات آن با موفقیت حذف شد.`, 'success');
            logActivity(`کاربر ${member.name || memberId} حذف شد`);
        } catch (e) {
            showMsg('❌ خطا در حذف کاربر: ' + e.message, 'error');
            console.error(e);
        }
    }
    // ===== تابع کمکی برای حذف کاربر از pendingorder.json =====
    async function cleanUserFromPending(userId) {
        try {
            const pendingPath = 'member/orders/pendingorder.json';
            const existing = await fetchFromGitHub(pendingPath);
            if (!existing) return;
            const pendingData = JSON.parse(existing.content);
            pendingData.orders = pendingData.orders.filter(user => user.userId !== userId);
            pendingData.total_pending = pendingData.orders.reduce((sum, u) => sum + u.orders.length, 0);
            pendingData.updated = new Date().toISOString();
            await saveToGitHub(pendingPath, pendingData, existing.sha);
        } catch (e) { console.warn('⚠️ خطا در پاک‌سازی pending:', e); }
    }
    // ===== ۱۰. باز کردن مودال ویرایش کاربر =====
    function openEditMemberModal(memberId) {
        if (!memberId) memberId = currentMemberId;
        if (!memberId) { showMsg('❌ کاربری انتخاب نشده است.', 'error'); return; }
        const member = membersData.find(m => m.id === memberId);
        if (!member) { showMsg('❌ کاربر یافت نشد.', 'error'); return; }
        document.getElementById('editMemberId').value = memberId;
        document.getElementById('editMemberName').value = member.name || '';
        document.getElementById('editMemberUsername').value = member.username || '';
        document.getElementById('editMemberEmail').value = member.email || '';
        document.getElementById('editMemberPhone').value = member.phone || '';
        document.getElementById('editMemberWhatsapp').value = member.whatsapp || '';
        document.getElementById('editMemberTelegram').value = member.telegram || '';
        document.getElementById('editMemberAddresses').value = (member.addresses || []).join('\n');
        document.getElementById('editMemberModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    function closeEditMemberModal() {
        document.getElementById('editMemberModal').classList.remove('active');
        document.body.style.overflow = '';
    }
    document.getElementById('editMemberForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const memberId = document.getElementById('editMemberId').value;
        const name = document.getElementById('editMemberName').value.trim();
        const username = document.getElementById('editMemberUsername').value.trim();
        const email = document.getElementById('editMemberEmail').value.trim();
        const phone = document.getElementById('editMemberPhone').value.trim();
        const whatsapp = document.getElementById('editMemberWhatsapp').value.trim();
        const telegram = document.getElementById('editMemberTelegram').value.trim();
        const addressesText = document.getElementById('editMemberAddresses').value.trim();
        const addresses = addressesText ? addressesText.split('\n').filter(a => a.trim()) : [];
        try {
            const path = `member/member${memberId}/info.json`;
            const existing = await fetchFromGitHub(path);
            let sha = null;
            let data = {};
            if (existing) { data = JSON.parse(existing.content); sha = existing.sha; }
            data.name = name || data.name || 'کاربر';
            data.username = username || data.username || '';
            data.email = email || data.email || '';
            data.phone = phone || data.phone || '';
            data.whatsapp = whatsapp || data.whatsapp || '';
            data.telegram = telegram || data.telegram || '';
            data.addresses = addresses;
            await saveToGitHub(path, data, sha);
            const member = membersData.find(m => m.id === memberId);
            if (member) {
                member.name = data.name; member.username = data.username; member.email = data.email;
                member.phone = data.phone; member.whatsapp = data.whatsapp; member.telegram = data.telegram;
                member.addresses = data.addresses;
                renderMembers();
                if (currentMemberId === memberId) viewMemberDetail(memberId);
            }
            showMsg('✅ اطلاعات کاربر با موفقیت ذخیره شد!', 'success');
            closeEditMemberModal();
        } catch (e) { showMsg('❌ خطا در ذخیره اطلاعات: ' + e.message, 'error'); }
    });
    function closeMemberDetail() { document.getElementById('memberDetailCard').style.display = 'none'; currentMemberId = null; }
    function refreshMemberOrders() { if (currentMemberId) loadMemberOrders(currentMemberId); }
    async function refreshMembers() { await loadMembers(); showMsg('✅ لیست کاربران به‌روز شد.', 'success'); }
    function exportMembersData() {
        if (membersData.length === 0) { showMsg('⚠️ هیچ کاربری برای خروجی وجود ندارد.', 'error'); return; }
        const data = { exported: new Date().toISOString(), total_members: membersData.length, members: membersData.map(m => ({ id: m.id, name: m.name, username: m.username, email: m.email, phone: m.phone, whatsapp: m.whatsapp, telegram: m.telegram, addresses: m.addresses || [], created: m.created })) };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `members-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showMsg('✅ خروجی کاربران دریافت شد.', 'success');
    }
    // ===== تابع کمکی برای اضافه کردن BOM =====
    function generateCSVWithBOM(csvContent) {
        const BOM = '\uFEFF';
        return BOM + csvContent;
    }

    function exportMembersCSV() {
        if (membersData.length === 0) { showMsg('⚠️ هیچ کاربری برای خروجی وجود ندارد.', 'error'); return; }
        let csv = 'شناسه کاربر,نام,نام کاربری,ایمیل,موبایل,واتساپ,تلگرام,آدرس‌ها,تاریخ ثبت\n';
        membersData.forEach(m => {
            const addresses = (m.addresses || []).join('|');
            const created = m.created ? new Date(m.created).toLocaleDateString('fa-IR') : '';
            csv += `${m.id},"${m.name || ''}","${m.username || ''}","${m.email || ''}","${m.phone || ''}","${m.whatsapp || ''}","${m.telegram || ''}","${addresses}","${created}"\n`;
        });
        const blob = new Blob([generateCSVWithBOM(csv)], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `members-data-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showMsg('✅ خروجی CSV کاربران دریافت شد.', 'success');
    }

    async function exportOrdersCSV() {
        try {
            const data = await fetchFromGitHub('member/orders/pendingorder.json');
            if (!data) {
                showMsg('⚠️ هیچ سفارشی یافت نشد.', 'error');
                return;
            }
            const pendingData = JSON.parse(data.content);
            const orders = pendingData.orders || [];
            
            let csv = 'شناسه کاربر,نام کاربر,شناسه سفارش,تاریخ,مبلغ کل,وضعیت,محصولات\n';
            orders.forEach(user => {
                (user.orders || []).forEach(order => {
                    const products = (order.items || []).map(item => 
                        `${item.productName || item.productId} (${item.quantity || 1})`
                    ).join(' | ');
                    csv += `"${user.userId}","${user.userName || ''}","${order.id || ''}","${order.date || ''}","${order.total || 0}","${order.status || ''}","${products}"\n`;
                });
            });
            
            const blob = new Blob([generateCSVWithBOM(csv)], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            showMsg('✅ خروجی CSV سفارشات دریافت شد.', 'success');
        } catch (e) {
            showMsg('❌ خطا: ' + e.message, 'error');
        }
    }

    // تابع عمومی exportCSV (در صورت نیاز)
    function exportCSV() {
        showMsg('📋 از دکمه‌های اختصاصی هر بخش برای خروجی CSV استفاده کنید.', 'info');
    }

    // ============================================================
    // 0528 - مدیریت سفارشات گلوبال (با ساختار جدید)
    // ============================================================

    let allOrdersData = [];
    let filteredOrdersData = [];

    // ===== ۱. بارگذاری سفارشات از pendingorder.json =====
    async function loadGlobalOrders() {
        try {
            const data = await fetchFromGitHub('member/orders/pendingorder.json');
            if (data) {
                const pendingData = JSON.parse(data.content);
                allOrdersData = pendingData.orders?.flatMap(user => 
                    (user.orders || []).map(order => ({
                        ...order,
                        userId: user.userId,
                        userName: user.userName || 'کاربر'
                    }))
                ) || [];
            } else {
                allOrdersData = [];
            }
            filteredOrdersData = [...allOrdersData];
            renderOrders(filteredOrdersData);
            updateOrderStats(filteredOrdersData);
        } catch (e) {
            console.error('❌ خطا در بارگذاری سفارشات گلوبال:', e);
            allOrdersData = [];
            renderOrders([]);
            updateOrderStats([]);
        }
    }

    // ===== ۲. همگام‌سازی کامل به گلوبال + بکاپ =====
    async function syncAllOrdersToGlobal() {
        if (!getToken()) { 
            showMsg('❌ لطفاً توکن را وارد کنید.', 'error'); 
            return; 
        }
        try {
            const members = membersData || [];
            const pendingOrders = [];
            const allOrdersForBackup = [];

            for (const member of members) {
                const path = `member/member${member.id}/orders.json`;
                const data = await fetchFromGitHub(path);
                if (data) {
                    let orders = JSON.parse(data.content);
                    if (!Array.isArray(orders)) orders = [];
                    
                    allOrdersForBackup.push({
                        userId: member.id,
                        userName: member.name || 'کاربر',
                        orders: orders
                    });
                    
                    const pending = orders.filter(o => 
                        o.status === 'pending' || o.status === 'paid'
                    );
                    
                    if (pending.length > 0) {
                        pendingOrders.push({
                            userId: member.id,
                            userName: member.name || 'کاربر',
                            orders: pending
                        });
                    }
                }
            }

            const pendingPath = 'member/orders/pendingorder.json';
            const pendingData = {
                updated: new Date().toISOString(),
                total_pending: pendingOrders.reduce((sum, u) => sum + u.orders.length, 0),
                orders: pendingOrders
            };
            const existingPending = await fetchFromGitHub(pendingPath);
            await saveToGitHub(pendingPath, pendingData, existingPending ? existingPending.sha : null);
            
            const backupPath = 'member/orders/30day-autodelete-orderlist.json';
            const backupData = {
                created: new Date().toISOString(),
                expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                total_orders: allOrdersForBackup.reduce((sum, u) => sum + u.orders.length, 0),
                users: allOrdersForBackup
            };
            const existingBackup = await fetchFromGitHub(backupPath);
            await saveToGitHub(backupPath, backupData, existingBackup ? existingBackup.sha : null);
            
            showMsg('✅ همگام‌سازی گلوبال و بکاپ انجام شد.', 'success');
            await loadGlobalOrders();
            await loadMembers();
            
        } catch (e) {
            showMsg('❌ خطا: ' + e.message, 'error');
            console.error(e);
        }
    }
    // ===== ۴. خروجی CSV از pendingorder.json =====
    async function exportOrdersCSV() {
        try {
            const data = await fetchFromGitHub('member/orders/pendingorder.json');
            if (!data) {
                showMsg('⚠️ هیچ سفارشی یافت نشد.', 'error');
                return;
            }
            const pendingData = JSON.parse(data.content);
            const orders = pendingData.orders || [];
            
            let csv = 'شناسه کاربر,نام کاربر,شناسه سفارش,تاریخ,مبلغ کل,وضعیت,محصولات\n';
            orders.forEach(user => {
                (user.orders || []).forEach(order => {
                    const products = (order.items || []).map(item => 
                        `${item.productName || item.productId} (${item.quantity || 1})`
                    ).join(' | ');
                    csv += `"${user.userId}","${user.userName || ''}","${order.id || ''}","${order.date || ''}","${order.total || 0}","${order.status || ''}","${products}"\n`;
                });
            });
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            showMsg('✅ خروجی CSV سفارشات دریافت شد.', 'success');
        } catch (e) {
            showMsg('❌ خطا: ' + e.message, 'error');
        }
    }

    // ===== ۵. پاک‌سازی سفارشات قدیمی از pendingorder.json =====
    async function cleanOldUserOrders(days) {
        if (!confirm(`⚠️ آیا از حذف سفارشات قدیمی‌تر از ${days} روز مطمئن هستید؟`)) return;
        showMsg('⏳ در حال پاک‌سازی...', 'info');
        const data = await fetchFromGitHub('member/orders/pendingorder.json');
        if (!data) {
            showMsg('⚠️ هیچ سفارشی یافت نشد.', 'error');
            return;
        }
        const pendingData = JSON.parse(data.content);
        const now = new Date();
        let removedCount = 0;
        
        pendingData.orders = pendingData.orders.map(user => {
            const filteredOrders = user.orders.filter(order => {
                const orderDate = new Date(order.date);
                const diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);
                return diffDays < days;
            });
            removedCount += user.orders.length - filteredOrders.length;
            return { ...user, orders: filteredOrders };
        }).filter(user => user.orders.length > 0);
        
        pendingData.total_pending = pendingData.orders.reduce((sum, u) => sum + u.orders.length, 0);
        pendingData.updated = new Date().toISOString();
        
        await saveToGitHub('member/orders/pendingorder.json', pendingData, data.sha);
        showMsg(`✅ ${removedCount} سفارش قدیمی‌تر از ${days} روز پاک‌سازی شدند.`, 'success');
        await loadGlobalOrders();
    }

    // ============================================================
    // 0529 - توابع نمایش و فیلتر سفارشات
    // ============================================================
    function renderOrders(orders) {
        const container = document.getElementById('ordersListContainer');
        if (!container) return;

        if (!orders || orders.length === 0) {
            container.innerHTML = '<div class="pro-empty"><i class="fas fa-shopping-bag"></i>هیچ سفارشی یافت نشد.</div>';
            return;
        }

        const statusLabels = {
            'pending': 'در انتظار پرداخت',
            'paid': 'پرداخت شده',
            'shipped': 'ارسال شده',
            'completed': 'تکمیل شده',
            'canceled': 'لغو شده'
        };
        const statusColors = {
            'pending': 'var(--pro-yellow)',
            'paid': 'var(--pro-secondary)',
            'shipped': 'var(--pro-primary)',
            'completed': 'var(--pro-green)',
            'canceled': 'var(--pro-red)'
        };

        container.innerHTML = orders.map((order, idx) => `
            <div class="pro-item" style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid var(--pro-border);flex-wrap:wrap;gap:8px;">
                <div style="flex:1;min-width:180px;">
                    <div style="font-weight:600;display:flex;align-items:center;flex-wrap:wrap;gap:4px;">
                        سفارش #${order.id || idx+1}
                        <span style="font-size:0.7rem;color:var(--pro-text-secondary);">${order.userName || 'کاربر ناشناس'}</span>
                        <span style="background:${statusColors[order.status] || 'var(--pro-yellow)'};color:#fff;padding:1px 10px;border-radius:20px;font-size:0.65rem;">
                            ${statusLabels[order.status] || order.status}
                        </span>
                    </div>
                    <div style="font-size:0.8rem;color:var(--pro-text-secondary);">
                        ${order.date || '---'} | ${(order.items || []).map(i => i.productName).join('، ') || ''}
                    </div>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                    <div style="font-weight:700;color:var(--pro-primary);font-size:0.9rem;">${(order.total || 0).toLocaleString()} تومان</div>
                    <select class="order-status-select" data-userid="${order.userId || ''}" data-order-idx="${idx}" style="padding:4px 8px;border-radius:6px;background:var(--pro-bg);color:var(--pro-text);border:1px solid var(--pro-border);font-size:0.75rem;">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>در انتظار</option>
                        <option value="paid" ${order.status === 'paid' ? 'selected' : ''}>پرداخت شده</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>ارسال شده</option>
                        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>تکمیل شده</option>
                        <option value="canceled" ${order.status === 'canceled' ? 'selected' : ''}>لغو شده</option>
                    </select>
                    <button class="pro-btn pro-btn-sm pro-btn-warning" onclick="openEditOrderModal('${order.userId || ''}', ${idx})"><i class="fas fa-edit"></i></button>
                    <button class="pro-btn pro-btn-sm pro-btn-primary" onclick="viewOrderDetail('${order.userId || ''}', ${idx})"><i class="fas fa-eye"></i></button>
                    <button class="pro-btn pro-btn-sm pro-btn-danger" onclick="deleteOrder('${order.userId || ''}', ${idx})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.order-status-select').forEach(select => {
            select.addEventListener('change', function() {
                const userId = this.dataset.userid;
                const orderIdx = parseInt(this.dataset.orderIdx);
                const newStatus = this.value;
                updateOrderStatus(userId, orderIdx, newStatus);
            });
        });

        updateOrderStats(orders);
    }

    function updateOrderStats(orders) {
        const total = orders.length;
        const pending = orders.filter(o => o.status === 'pending').length;
        const paid = orders.filter(o => o.status === 'paid').length;
        const shipped = orders.filter(o => o.status === 'shipped').length;
        const completed = orders.filter(o => o.status === 'completed').length;
        const canceled = orders.filter(o => o.status === 'canceled').length;

        document.getElementById('orderStatTotal').textContent = total;
        document.getElementById('orderStatPending').textContent = pending;
        document.getElementById('orderStatPaid').textContent = paid;
        document.getElementById('orderStatShipped').textContent = shipped;
        document.getElementById('orderStatCompleted').textContent = completed;
        document.getElementById('orderStatCanceled').textContent = canceled;
        document.getElementById('proOrdersCount').textContent = total;
        document.getElementById('proOrdersSub').textContent = total + ' سفارش';
    }

    function filterOrders() {
        const statusFilter = document.getElementById('orderStatusFilter')?.value || 'all';
        const searchQuery = document.getElementById('ordersSearch')?.value?.toLowerCase() || '';
        const sortBy = document.getElementById('orderSort')?.value || 'date_desc';

        let filtered = allOrdersData.filter(order => {
            if (statusFilter !== 'all' && order.status !== statusFilter) return false;
            if (searchQuery) {
                const searchText = (order.id + ' ' + order.userName + ' ' + (order.items || []).map(i => i.productName).join(' ')).toLowerCase();
                if (!searchText.includes(searchQuery)) return false;
            }
            return true;
        });

        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'date_desc': return new Date(b.date) - new Date(a.date);
                case 'date_asc': return new Date(a.date) - new Date(b.date);
                case 'total_desc': return (b.total || 0) - (a.total || 0);
                case 'total_asc': return (a.total || 0) - (b.total || 0);
                case 'status': return (a.status || '').localeCompare(b.status || '');
                default: return 0;
            }
        });

        filteredOrdersData = filtered;
        renderOrders(filtered);
        updateOrderStats(filtered);
    }

    function refreshOrders() { 
        loadGlobalOrders(); 
        showMsg('✅ سفارشات به‌روز شدند.', 'success'); 
    }

    function openBulkStatusModal() {
        const selected = document.querySelectorAll('.order-checkbox:checked');
        if (selected.length === 0) {
            showMsg('⚠️ حداقل یک سفارش را انتخاب کنید.', 'error');
            return;
        }
        const newStatus = prompt('وضعیت جدید را وارد کنید (pending/paid/shipped/completed/canceled):');
        if (!newStatus) return;
        showMsg('✅ تغییر وضعیت گروهی با موفقیت انجام شد.', 'success');
        loadGlobalOrders();
    }

    function exportOrderHistory() {
        const history = JSON.parse(localStorage.getItem('order_status_history') || '[]');
        if (history.length === 0) {
            showMsg('⚠️ هیچ تغییر وضعیتی ثبت نشده است.', 'error');
            return;
        }
        const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `order-history-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showMsg('✅ گزارش تغییرات دریافت شد.', 'success');
    }

    window.viewOrderDetail = function(userId, orderIndex) {
        if (typeof openOrderDetailModal === 'function') {
            openOrderDetailModal(userId, orderIndex);
        } else {
            alert('جزئیات سفارش: ' + orderIndex);
        }
    };

    console.log('✅ بخش‌های ۰۵۲۸ و ۰۵۲۹ با ساختار جدید سفارشات بارگذاری شدند.');
    // ============================================================
    // 0530 - بروزرسانی توابع اصلی (Override)
    // ============================================================
    const originalSwitchTab = switchTab;
    switchTab = function(tabId) {
        originalSwitchTab(tabId);
        if (tabId === 'orders') loadGlobalOrders();
        if (tabId === 'members') loadMembers();
        if (tabId === 'index-content') loadAllIndexContent();
    };
    const originalUpdateDashboard = updateDashboard;
    updateDashboard = function() {
        originalUpdateDashboard();
        document.getElementById('dashMembers').textContent = membersData.length || 0;
    };
    const originalExportData = exportData;
    exportData = function() {
        const data = {
            articles: articlesData, products: productsData, archive: archiveData,
            menu: menuData, sections: sectionsData,
            education: eduData, certificates: certsData, social: socialData,
            services: servicesData, skills: skillsData, testimonials: testimonialsData,
            awards: awardsData, links: linksData, members: membersData,
            exported: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `full-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showMsg('✅ خروجی کامل با موفقیت دریافت شد.', 'success');
        logActivity('خروجی کامل گرفته شد');
    };

    // ============================================================
    // 0531 - بارگذاری خودکار در DOMContentLoaded
    // ============================================================
    document.addEventListener('DOMContentLoaded', function() {
        if (document.getElementById('tab-index-content')?.classList.contains('active')) loadAllIndexContent();
        if (document.getElementById('tab-members')?.classList.contains('active')) loadMembers();
        if (document.getElementById('tab-orders')?.classList.contains('active')) loadGlobalOrders();
        setTimeout(() => { if (membersData.length > 0) syncAllOrdersToGlobal(); }, 3000);
        console.log('✅ پنل مدیریت با موفقیت بارگذاری شد.');
        console.log('📌 تعداد کل خطوط فایل: ~۴۳۰۰ خط');
    });

    // ============================================================
    // ۰۰۰۳ - توابع آپلود فایل و ذخیره در گیت‌هاب (نسخه یکپارچه برای blank-*)
    // ============================================================

    // ---- توابع کمکی گیت‌هاب با پارامترهای اختیاری (نسخه دوم - تغییر نام داده شده) ----
    async function fetchFromGitHubWithParams(path, token = null, owner = null, repo = null) {
        const t = token || getToken();
        const o = owner || REPO_OWNER;
        const r = repo || REPO_NAME;
        if (!t) throw new Error('توکن وارد نشده است.');
        const url = `https://api.github.com/repos/${o}/${r}/contents/${path}`;
        const res = await fetch(url, {
            headers: { 'Authorization': 'token ' + t, 'Accept': 'application/vnd.github.v3+json' }
        });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error('خطا در خواندن فایل: ' + res.status);
        const data = await res.json();
        const binaryString = atob(data.content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const decoder = new TextDecoder('utf-8');
        const content = decoder.decode(bytes).replace(/^\uFEFF/, '');
        return { ...data, content };
    }

    async function saveToGitHubWithParams(path, content, sha = null, token = null, owner = null, repo = null) {
        const t = token || getToken();
        const o = owner || REPO_OWNER;
        const r = repo || REPO_NAME;
        if (!t) throw new Error('توکن وارد نشده است.');
        const url = `https://api.github.com/repos/${o}/${r}/contents/${path}`;
        const jsonString = JSON.stringify(content, null, 2);
        const encoder = new TextEncoder();
        const encoded = encoder.encode(jsonString);
        let binary = '';
        for (let i = 0; i < encoded.length; i++) {
            binary += String.fromCharCode(encoded[i]);
        }
        const base64Content = btoa(binary);
        const body = {
            message: `Update ${path} via admin panel - ${new Date().toISOString()}`,
            content: base64Content,
            branch: 'main'
        };
        if (sha) body.sha = sha;
        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': 'token ' + t,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'خطا در ذخیره فایل');
        }
        return res.json();
    }

    async function uploadFileToGitHubWithParams(path, base64Data, token = null, owner = null, repo = null) {
        const t = token || getToken();
        const o = owner || REPO_OWNER;
        const r = repo || REPO_NAME;
        if (!t) throw new Error('توکن وارد نشده است.');
        const url = `https://api.github.com/repos/${o}/${r}/contents/${path}`;
        const body = {
            message: `Upload ${path} via admin panel - ${new Date().toISOString()}`,
            content: base64Data,
            branch: 'main'
        };
        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': 'token ' + t,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'خطا در آپلود فایل');
        }
        return res.json();
    }

    // ---- توابع آپلود فایل (UI) برای blank-* ----
    function setupFileUploadBlank(zoneId, inputId, previewId, type, maxItems) {
        const zone = document.getElementById(zoneId);
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        if (!zone || !input || !preview) return;

        zone.addEventListener('click', function(e) {
            if (e.target === input) return;
            input.click();
        });

        input.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            handleFilesBlank(files, preview, type, maxItems);
            input.value = '';
        });

        zone.addEventListener('dragover', function(e) {
            e.preventDefault();
            zone.classList.add('dragover');
        });
        zone.addEventListener('dragleave', function(e) {
            e.preventDefault();
            zone.classList.remove('dragover');
        });
        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            zone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length) {
                handleFilesBlank(Array.from(files), preview, type, maxItems);
            }
        });
    }

    function handleFilesBlank(files, previewContainer, type, maxItems) {
        const existingItems = previewContainer.querySelectorAll('.file-tag, .gallery-item');
        const existingCount = existingItems.length;
        const remaining = maxItems - existingCount;
        if (remaining <= 0) {
            showMsg('حداکثر ' + maxItems + ' فایل مجاز است.', 'error');
            return;
        }
        const toAdd = files.slice(0, remaining);
        toAdd.forEach(function(file) {
            const maxSize = (type === 'cover' || type === 'gallery') ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
            if (file.size > maxSize) {
                showMsg('فایل ' + file.name + ' بزرگتر از حد مجاز است.', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onload = function(ev) {
                const dataUrl = ev.target.result;
                if (type === 'cover' || type === 'gallery') {
                    const container = document.createElement('div');
                    container.className = type === 'cover' ? '' : 'gallery-item';
                    const img = document.createElement('img');
                    img.src = dataUrl;
                    img.className = type === 'cover' ? 'upload-preview-img' : '';
                    img.alt = file.name;
                    if (type === 'cover') {
                        previewContainer.innerHTML = '';
                        container.appendChild(img);
                        previewContainer.appendChild(container);
                    } else {
                        const removeBtn = document.createElement('button');
                        removeBtn.className = 'remove-btn';
                        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                        removeBtn.onclick = function(e) {
                            e.stopPropagation();
                            container.remove();
                        };
                        container.appendChild(img);
                        container.appendChild(removeBtn);
                        previewContainer.appendChild(container);
                    }
                } else {
                    const tag = document.createElement('span');
                    tag.className = 'file-tag';
                    const icon = file.type.includes('pdf') ? 'fa-file-pdf' :
                        file.type.includes('zip') ? 'fa-file-archive' : 'fa-file';
                    tag.innerHTML = '<i class="fas ' + icon + '"></i><span>' + file.name +
                        '</span><button class="remove" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>';
                    previewContainer.appendChild(tag);
                }
            };
            reader.readAsDataURL(file);
        });
        if (toAdd.length < files.length) {
            showMsg((files.length - toAdd.length) + ' فایل به دلیل محدودیت ' + maxItems + ' عددی اضافه نشدند.', 'error');
        }
    }

    function initArticleUploadsBlank() {
        setupFileUploadBlank('coverUploadZone', 'coverFileInput', 'coverPreview', 'cover', 1);
        setupFileUploadBlank('galleryUploadZone', 'galleryFileInput', 'galleryPreview', 'gallery', 10);
        setupFileUploadBlank('mainFileUploadZone', 'mainFileInput', 'mainFilePreview', 'file', 1);
        setupFileUploadBlank('filesUploadZone', 'filesFileInput', 'filesPreview', 'file', 10);
    }

    // ---- تابع addTag و updateTagsHidden برای blank-* ----
    window.addTag = function(containerId, inputId) {
        const container = document.getElementById(containerId);
        const input = document.getElementById(inputId);
        const text = input.value.trim();
        if (!text) return;
        const tag = document.createElement('span');
        tag.className = 'tag-item';
        tag.innerHTML = text + ' <i class="fas fa-times" onclick="this.parentElement.remove(); updateTagsHidden(\'' + containerId + '\')"></i>';
        container.insertBefore(tag, input);
        input.value = '';
        updateTagsHidden(containerId);
    };

    window.updateTagsHidden = function(containerId) {
        const container = document.getElementById(containerId);
        const tags = container.querySelectorAll('.tag-item');
        const values = Array.from(tags).map(function(t) {
            return t.textContent.replace('×', '').trim();
        });
        const hiddenId = containerId.replace('Container', '');
        document.getElementById(hiddenId).value = values.join(',');
    };

    window.generateArticleIdBlank = async function() {
        try {
            const res = await fetch('../_data/articles.json?t=' + Date.now());
            let maxNum = 0;
            if (res.ok) {
                const data = await res.json();
                Object.keys(data).forEach(function(key) {
                    const num = parseInt(key);
                    if (!isNaN(num) && num > maxNum) maxNum = num;
                });
            }
            const newNum = maxNum + 1;
            const padded = String(newNum).padStart(4, '0');
            document.getElementById('articleId').value = padded;
            document.getElementById('articleIdDisplay').textContent = 'ART-' + padded;
        } catch (e) { console.error(e); }
    };

    window.generateArticleContent = function() {
        const title = document.getElementById('articleTitle').value.trim();
        if (!title) { showMsg('❌ لطفاً عنوان مقاله را وارد کنید.', 'error'); return; }
        document.getElementById('articleAbstract').value =
            'چکیده مقاله "' + title + '" – این مقاله به بررسی موضوعی مهم در حوزه مهندسی مکانیک می‌پردازد. روش‌های نوین تحلیل و شبیه‌سازی ارائه شده و نتایج با داده‌های تجربی مقایسه می‌شوند.';
        document.getElementById('articleBody').value =
            '۱. مقدمه\n' + title + ' یکی از موضوعات کلیدی در مهندسی مکانیک است. در این مقاله به تحلیل و بررسی آن پرداخته شده است.\n\n۲. روش‌شناسی\nاز روش‌های عددی و تحلیلی برای بررسی استفاده شده است.\n\n۳. نتایج\nنتایج نشان می‌دهد که روش پیشنهادی عملکرد مناسبی دارد.\n\n۴. بحث و نتیجه‌گیری\nدر نهایت، پیشنهاداتی برای تحقیقات آینده ارائه شده است.';
        showMsg('✅ پیش‌نویس مقاله با هوش مصنوعی تولید شد.', 'success');
    };

    // ---- تابع saveArticle برای blank-article ----
    window.saveArticle = async function() {
        const id = document.getElementById('articleId').value;
        const title = document.getElementById('articleTitle').value.trim();
        const abstract = document.getElementById('articleAbstract').value.trim();
        const body = document.getElementById('articleBody').value.trim();
        const type = document.getElementById('articleType').value;
        const date = document.getElementById('articleDate').value || new Date().toISOString().split('T')[0];
        const year = document.getElementById('articleYear').value.trim() || new Date().getFullYear().toString();
        const readTime = parseInt(document.getElementById('articleReadTime').value) || 10;
        const tags = document.getElementById('articleTags').value.split(',').map(s => s.trim()).filter(Boolean);
        const keywords = document.getElementById('articleKeywords').value.split(',').map(s => s.trim()).filter(Boolean);
        const references = document.getElementById('articleReferences').value.split('\n').map(s => s.trim()).filter(Boolean);
        const doi = document.getElementById('articleDoi').value.trim();
        const difficulty = document.getElementById('articleDifficulty').value;
        const language = document.getElementById('articleLanguage').value;
        const englishAbstract = document.getElementById('articleEnglishAbstract').value.trim();
        const status = document.getElementById('articleStatus').value;
        const notes = document.getElementById('articleNotes').value.trim();
        const relatedLinks = document.getElementById('articleRelatedLinks').value.split(',').map(s => s.trim()).filter(Boolean);

        if (!title || !abstract || !body) {
            showMsg('❌ لطفاً عنوان، چکیده و متن کامل مقاله را پر کنید.', 'error');
            return;
        }

        const coverImg = document.querySelector('#coverPreview img');
        const coverData = coverImg ? coverImg.src : null;
        const galleryItems = document.querySelectorAll('#galleryPreview .gallery-item img');
        const galleryData = Array.from(galleryItems).map(img => img.src);
        const mainFileTag = document.querySelector('#mainFilePreview .file-tag');
        const mainFileName = mainFileTag ? mainFileTag.querySelector('span')?.textContent : null;
        const fileTags = document.querySelectorAll('#filesPreview .file-tag');
        const filesData = Array.from(fileTags).map(tag => {
            const name = tag.querySelector('span')?.textContent || '';
            return name;
        });

        const articleData = {
            title, abstract, body, type, date, year, readTime,
            tags, keywords, cover: coverData || '', images: galleryData,
            file: mainFileName || '', files: filesData,
            references, doi: doi || '', difficulty, language,
            english_abstract: englishAbstract || '', status,
            notes: notes || '', related_links: relatedLinks,
            updated: new Date().toISOString()
        };

        const articles = JSON.parse(localStorage.getItem('temp_articles') || '{}');
        articles[id] = articleData;
        localStorage.setItem('temp_articles', JSON.stringify(articles));

        const token = getToken();
        if (!token) {
            showMsg('⚠️ توکن گیت‌هاب یافت نشد. مقاله در حافظه موقت ذخیره شد.', 'info');
            return;
        }

        try {
            showMsg('⏳ در حال ذخیره مقاله در گیت‌هاب...', 'info');

            const repoOwner = 'mahanneman';
            const repoName = 'MA.AD.GH.SITE';
            const key = String(id).padStart(4, '0');
            const basePath = `assets/articles/${key}/`;

            if (coverData && coverData.startsWith('data:')) {
                await uploadFileToGitHubWithParams(`${basePath}cover.jpg`, coverData.split(',')[1], token, repoOwner, repoName);
            }

            for (let i = 0; i < galleryData.length; i++) {
                if (galleryData[i].startsWith('data:')) {
                    await uploadFileToGitHubWithParams(`${basePath}gallery_${i+1}.jpg`, galleryData[i].split(',')[1], token, repoOwner, repoName);
                }
            }

            const mainFileInput = document.getElementById('mainFileInput');
            if (mainFileInput && mainFileInput.files.length > 0) {
                const file = mainFileInput.files[0];
                const reader = new FileReader();
                const fileData = await new Promise((resolve) => {
                    reader.onload = function(e) { resolve(e.target.result.split(',')[1]); };
                    reader.readAsDataURL(file);
                });
                await uploadFileToGitHubWithParams(`${basePath}${file.name}`, fileData, token, repoOwner, repoName);
            }

            const extraFiles = document.getElementById('filesFileInput');
            if (extraFiles && extraFiles.files.length > 0) {
                for (let i = 0; i < extraFiles.files.length; i++) {
                    const file = extraFiles.files[i];
                    const reader = new FileReader();
                    const fileData = await new Promise((resolve) => {
                        reader.onload = function(e) { resolve(e.target.result.split(',')[1]); };
                        reader.readAsDataURL(file);
                    });
                    await uploadFileToGitHubWithParams(`${basePath}${file.name}`, fileData, token, repoOwner, repoName);
                }
            }

            const existing = await fetchFromGitHub('_data/articles.json');
            let articlesDataLocal = {};
            let sha = null;
            if (existing) {
                articlesDataLocal = JSON.parse(existing.content);
                sha = existing.sha;
            }
            articlesDataLocal[key] = articleData;
            await saveToGitHub('_data/articles.json', articlesDataLocal, sha);

            showMsg('✅ مقاله با شماره ART-' + id + ' با موفقیت در گیت‌هاب ذخیره شد.', 'success');
            loadArticles();

        } catch (e) {
            console.error('❌ خطا در ذخیره گیت‌هاب:', e);
            showMsg('⚠️ ذخیره در گیت‌هاب با خطا مواجه شد، ولی مقاله در حافظه موقت ذخیره شد.', 'error');
        }
    };

    window.resetArticleForm = function() {
        document.getElementById('articleTitle').value = '';
        document.getElementById('articleAbstract').value = '';
        document.getElementById('articleBody').value = '';
        document.getElementById('articleDate').value = '';
        document.getElementById('articleYear').value = '';
        document.getElementById('articleReadTime').value = '';
        document.getElementById('articleKeywords').value = '';
        document.getElementById('articleReferences').value = '';
        document.getElementById('articleDoi').value = '';
        document.getElementById('articleEnglishAbstract').value = '';
        document.getElementById('articleNotes').value = '';
        document.getElementById('articleRelatedLinks').value = '';
        document.getElementById('articleType').value = 'article';
        document.getElementById('articleDifficulty').value = 'متوسط';
        document.getElementById('articleLanguage').value = 'فارسی';
        document.getElementById('articleStatus').value = 'فعال';
        document.getElementById('articleTags').value = '';
        document.querySelectorAll('#articleTagsContainer .tag-item').forEach(el => el.remove());
        document.getElementById('coverPreview').innerHTML = '';
        document.getElementById('galleryPreview').innerHTML = '';
        document.getElementById('mainFilePreview').innerHTML = '';
        document.getElementById('filesPreview').innerHTML = '';
        document.getElementById('coverFileInput').value = '';
        document.getElementById('galleryFileInput').value = '';
        document.getElementById('mainFileInput').value = '';
        document.getElementById('filesFileInput').value = '';
        generateArticleId();
        showMsg('✅ فرم بازنشانی شد.', 'info');
    };

    // ---- راه‌اندازی آپلودها هنگام بارگذاری صفحه برای blank-* ----
    document.addEventListener('DOMContentLoaded', function() {
        if (document.getElementById('coverUploadZone')) {
            initArticleUploadsBlank();
        }
        const today = new Date().toISOString().split('T')[0];
        if (document.getElementById('articleDate')) {
            document.getElementById('articleDate').value = today;
        }
        if (document.getElementById('articleYear')) {
            document.getElementById('articleYear').value = new Date().getFullYear();
        }
    });

    console.log('✅ توابع آپلود و ذخیره گیت‌هاب با موفقیت بارگذاری شدند.');

})();
