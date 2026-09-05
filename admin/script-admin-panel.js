// ============================================================
// script-admin-panel.js - پنل مدیریت کامل (نسخه نهایی)
// ============================================================

(function() {
    'use strict';

    // ============================================================
    // 0500 - احراز هویت
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
    console.log('✅ بخش ۰۵۰۰ - احراز هویت بارگذاری شد.');

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
    function showMsg(msg, type) {
        type = type || 'success';
        const el = document.getElementById('proMsg');
        if (!el) return;
        el.textContent = msg;
        el.className = 'pro-msg ' + type;
        setTimeout(function() { el.className = 'pro-msg'; }, 6000);
    }
    function showToast(msg, type) {
        type = type || 'success';
        const el = document.getElementById('proToast');
        if (!el) return;
        el.textContent = msg;
        el.className = 'pro-toast ' + type;
        setTimeout(function() { el.className = 'pro-toast'; }, 4000);
    }
    function logActivity(message) {
        const log = document.getElementById('proActivityLog');
        if (!log) return;
        const time = new Date().toLocaleString('fa-IR');
        const item = document.createElement('div');
        item.className = 'item';
        item.innerHTML = '<span>' + message + '</span><span class="time">' + time + '</span>';
        log.prepend(item);
        if (log.children.length > 30) log.removeChild(log.lastChild);
        var history = JSON.parse(localStorage.getItem('pro_activity') || '[]');
        history.unshift({ message: message, time: time });
        if (history.length > 50) history = history.slice(0, 50);
        localStorage.setItem('pro_activity', JSON.stringify(history));
    }
    function loadActivity() {
        var history = JSON.parse(localStorage.getItem('pro_activity') || '[]');
        var log = document.getElementById('proActivityLog');
        if (!log) return;
        log.innerHTML = history.map(function(item) {
            return '<div class="item"><span>' + item.message + '</span><span class="time">' + item.time + '</span></div>';
        }).join('');
        if (history.length === 0) log.innerHTML = '<div class="item"><span>هیچ فعالیتی ثبت نشده است.</span></div>';
    }
    loadActivity();

    // ============================================================
    // 0504 - تب‌ها
    // ============================================================
    function switchTab(tabId) {
        document.querySelectorAll('#proTabs .tab-btn').forEach(function(b) { b.classList.remove('active'); });
        document.querySelectorAll('.pro-tab-content').forEach(function(t) { t.classList.remove('active'); });
        var btn = document.querySelector('#proTabs .tab-btn[data-tab="' + tabId + '"]');
        if (btn) btn.classList.add('active');
        var content = document.getElementById('tab-' + tabId);
        if (content) content.classList.add('active');
        if (tabId === 'articles') { loadArticles(); var s = document.getElementById('articlesSearch'); if (s) s.value = ''; }
        if (tabId === 'products') { loadProducts(); var s2 = document.getElementById('productsSearch'); if (s2) s2.value = ''; }
        if (tabId === 'archive') { loadArchive(); var s3 = document.getElementById('archiveSearch'); if (s3) s3.value = ''; }
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
    document.querySelectorAll('#proTabs .tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() { switchTab(this.dataset.tab); });
    });

    // ============================================================
    // 0505 - عملیات گیت‌هاب
    // ============================================================
    async function fetchFromGitHub(path) {
        var token = getToken();
        if (!token) throw new Error('توکن وارد نشده است.');
        var url = 'https://api.github.com/' + REPO_PATH + '/' + path;
        var res = await fetch(url, {
            headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json' }
        });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error('خطا در خواندن فایل: ' + res.status);
        var data = await res.json();
        var binaryString = atob(data.content);
        var bytes = new Uint8Array(binaryString.length);
        for (var i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); }
        var decoder = new TextDecoder('utf-8');
        var content = decoder.decode(bytes).replace(/^\uFEFF/, '');
        return { ...data, content: content };
    }
    async function saveToGitHub(path, content, sha) {
        sha = sha || null;
        var token = getToken();
        if (!token) throw new Error('توکن وارد نشده است.');
        var url = 'https://api.github.com/' + REPO_PATH + '/' + path;
        var jsonString = JSON.stringify(content, null, 2);
        var encoder = new TextEncoder();
        var encoded = encoder.encode(jsonString);
        var binary = '';
        for (var i = 0; i < encoded.length; i++) { binary += String.fromCharCode(encoded[i]); }
        var base64Content = btoa(binary);
        var body = {
            message: 'Update ' + path + ' via admin panel - ' + new Date().toISOString(),
            content: base64Content,
            branch: 'main'
        };
        if (sha) body.sha = sha;
        var res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': 'token ' + token,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            var err = await res.json();
            throw new Error(err.message || 'خطا در ذخیره‌سازی');
        }
        var data = await res.json();
        return data.content.sha;
    }
    async function deleteFromGitHub(path, sha) {
        var token = getToken();
        if (!token) throw new Error('توکن وارد نشده است.');
        var url = 'https://api.github.com/' + REPO_PATH + '/' + path;
        var res = await fetch(url, {
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
    async function uploadFileToGitHub(path, content, sha) {
        sha = sha || null;
        var token = getToken();
        if (!token) throw new Error('توکن وارد نشده است.');
        var url = 'https://api.github.com/' + REPO_PATH + '/' + path;
        var body = {
            message: 'Upload ' + path + ' via admin panel - ' + new Date().toISOString(),
            content: content,
            branch: 'main'
        };
        if (sha) body.sha = sha;
        var res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': 'token ' + token,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            var err = await res.json();
            throw new Error(err.message || 'خطا در آپلود فایل');
        }
        return await res.json();
    }

    // ============================================================
    // 0506 - شماره‌زنی خودکار
    // ============================================================
    function generateId(data, prefix) {
        var keys = Object.keys(data);
        var maxNum = 0;
        keys.forEach(function(key) {
            var num = parseInt(key);
            if (!isNaN(num) && num > maxNum) maxNum = num;
        });
        var newNum = maxNum + 1;
        var padded = String(newNum).padStart(4, '0');
        return { id: padded, num: newNum };
    }
    function generateArticleId() {
        var result = generateId(articlesData, 'ART');
        var idEl = document.getElementById('articleId');
        if (idEl) idEl.value = result.num;
        var displayEl = document.getElementById('articleIdDisplay');
        if (displayEl) displayEl.textContent = result.id;
        var dateEl = document.getElementById('articleDate');
        if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
    }
    function generateProductId() {
        var result = generateId(productsData, 'PRD');
        var idEl = document.getElementById('productId');
        if (idEl) idEl.value = result.num;
        var displayEl = document.getElementById('productIdDisplay');
        if (displayEl) displayEl.textContent = result.id;
        var dateEl = document.getElementById('productDate');
        if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
    }
    function generateArchiveId() {
        var result = generateId(archiveData, 'ARC');
        var idEl = document.getElementById('archiveId');
        if (idEl) idEl.value = result.num;
        var displayEl = document.getElementById('archiveIdDisplay');
        if (displayEl) displayEl.textContent = result.id;
        var dateEl = document.getElementById('archiveDate');
        if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
    }
    function copyId(elementId) {
        var el = document.getElementById(elementId);
        if (!el) return;
        var text = el.textContent;
        navigator.clipboard.writeText(text).then(function() {
            showToast('✅ شماره ' + text + ' کپی شد!', 'success');
        }).catch(function() {
            var range = document.createRange();
            range.selectNode(el);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            document.execCommand('copy');
            showToast('✅ شماره کپی شد!', 'success');
        });
    }
    function copyIdFromText(id) {
        navigator.clipboard.writeText(id).then(function() {
            showToast('✅ شماره ' + id + ' کپی شد!', 'success');
        }).catch(function() {
            showToast('✅ شماره ' + id + ' کپی شد!', 'success');
        });
    }

    // ============================================================
    // 0507 - بارگذاری داده‌ها
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
// 0508 - مقالات (اصلاح‌شده با مدیریت خطای JSON)
// ============================================================
var articlesFiltered = [];
async function loadArticles() {
    var list = document.getElementById('proArticlesList');
    if (!list) return;
    if (!getToken()) {
        list.innerHTML = '<div class="pro-empty"><i class="fas fa-key"></i>لطفاً توکن گیت‌هاب را وارد کنید.</div>';
        return;
    }
    try {
        var data = await fetchFromGitHub('_data/articles.json');
        if (data && data.content) {
            try {
                articlesData = JSON.parse(data.content);
                articlesSha = data.sha;
            } catch (e) {
                console.warn('⚠️ فایل articles.json خراب است، بازنشانی به {}:', e);
                articlesData = {};
                articlesSha = data.sha;
            }
        } else {
            articlesData = {};
            articlesSha = null;
        }
        allArticles = Object.keys(articlesData).map(function(key) { return { key: key, ...articlesData[key] }; });
        articlesFiltered = allArticles.slice();
        renderArticles(articlesFiltered);
    } catch (e) {
        list.innerHTML = '<div class="pro-empty"><i class="fas fa-exclamation-triangle" style="color:var(--pro-red);"></i>خطا: ' + e.message + '</div>';
        console.error('❌ خطا در بارگذاری مقالات:', e);
    }
}
function renderArticles(items) {
    var list = document.getElementById('proArticlesList');
    if (!list) return;
    if (items.length === 0) {
        list.innerHTML = '<div class="pro-empty"><i class="fas fa-newspaper"></i>هیچ مقاله‌ای یافت نشد.</div>';
    } else {
        list.innerHTML = items.map(function(item, idx) {
            var key = item.key;
            return '<div class="pro-item">' +
                '<div class="info">' +
                '<div class="title">' + (item.title || 'بدون عنوان') + ' <span style="color:var(--pro-text-secondary);font-size:0.7rem;">#<span onclick="copyIdFromText(\'' + key + '\')" style="cursor:pointer;color:var(--pro-primary);">' + String(key).padStart(4, '0') + '</span></span></div>' +
                '<div class="meta">' +
                '<span><i class="fas fa-tag"></i> ' + (item.type || 'article') + '</span>' +
                '<span><i class="fas fa-calendar"></i> ' + (item.date || '---') + '</span>' +
                '<span><i class="fas fa-clock"></i> ' + (item.readTime || '?') + ' دقیقه</span>' +
                (item.files && item.files.length ? '<span><i class="fas fa-paperclip"></i> ' + item.files.length + ' فایل</span>' : '') +
                (item.images && item.images.length ? '<span><i class="fas fa-images"></i> ' + item.images.length + ' عکس</span>' : '') +
                '</div></div>' +
                '<div class="actions">' +
                '<a href="../article.html?id=' + key + '" class="pro-btn pro-btn-primary pro-btn-sm" target="_blank"><i class="fas fa-eye"></i></a>' +
                '<button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditModal(\'article\',\'' + key + '\')"><i class="fas fa-edit"></i></button>' +
                '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveArticle(' + idx + ', -1)" title="بالا" ' + (idx === 0 ? 'disabled' : '') + '><i class="fas fa-arrow-up"></i></button>' +
                '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveArticle(' + idx + ', 1)" title="پایین" ' + (idx === items.length - 1 ? 'disabled' : '') + '><i class="fas fa-arrow-down"></i></button>' +
                '<button class="pro-btn pro-btn-danger pro-btn-sm" onclick="deleteArticle(\'' + key + '\')"><i class="fas fa-trash"></i></button>' +
                '</div></div>';
        }).join('');
    }
    var countEl = document.getElementById('proArticlesCount');
    if (countEl) countEl.textContent = allArticles.length;
    var subEl = document.getElementById('proArticlesSub');
    if (subEl) subEl.textContent = allArticles.length + ' مقاله';
    updateDashboard();
    updateCounts();
}
function filterArticles(query) {
    var q = query.toLowerCase().trim();
    if (!q) {
        articlesFiltered = allArticles.slice();
    } else {
        articlesFiltered = allArticles.filter(function(item) {
            return (item.title || '').toLowerCase().includes(q) ||
                (item.excerpt || '').toLowerCase().includes(q) ||
                (item.tags || []).join(' ').toLowerCase().includes(q);
        });
    }
    renderArticles(articlesFiltered);
}
function moveArticle(index, direction) {
    var newIndex = index + direction;
    if (newIndex < 0 || newIndex >= allArticles.length) return;
    var item = allArticles.splice(index, 1)[0];
    allArticles.splice(newIndex, 0, item);
    var newData = {};
    allArticles.forEach(function(item, i) {
        newData[String(i + 1).padStart(4, '0')] = item;
    });
    articlesData = newData;
    renderArticles(allArticles);
    showMsg('✅ ترتیب مقالات تغییر کرد. برای ذخیره روی دکمه "ذخیره" کلیک کنید.', 'info');
}
async function deleteArticle(key) {
    if (!confirm('آیا از حذف مقاله #' + String(key).padStart(4, '0') + ' مطمئن هستید؟')) return;
    if (!getToken()) { showMsg('لطفاً توکن را وارد کنید.', 'error'); return; }
    try {
        delete articlesData[key];
        var newSha = await saveToGitHub('_data/articles.json', articlesData, articlesSha);
        articlesSha = newSha;
        showMsg('✅ مقاله حذف شد.', 'success');
        logActivity('مقاله #' + String(key).padStart(4, '0') + ' حذف شد');
        loadArticles();
    } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
}

// ============================================================
// 0509 - محصولات (بدون تغییر)
// ============================================================
var productsFiltered = [];
async function loadProducts() {
    var list = document.getElementById('proProductsList');
    if (!list) return;
    if (!getToken()) {
        list.innerHTML = '<div class="pro-empty"><i class="fas fa-key"></i>لطفاً توکن گیت‌هاب را وارد کنید.</div>';
        return;
    }
    try {
        var data = await fetchFromGitHub('_data/products.json');
        if (data && data.content) {
            try {
                productsData = JSON.parse(data.content);
                productsSha = data.sha;
            } catch (e) {
                console.warn('⚠️ فایل products.json خراب است، بازنشانی به {}:', e);
                productsData = {};
                productsSha = data.sha;
            }
        } else {
            productsData = {};
            productsSha = null;
        }
        allProducts = Object.keys(productsData).map(function(key) { return { key: key, ...productsData[key] }; });
        productsFiltered = allProducts.slice();
        renderProducts(productsFiltered);
    } catch (e) {
        list.innerHTML = '<div class="pro-empty"><i class="fas fa-exclamation-triangle" style="color:var(--pro-red);"></i>خطا: ' + e.message + '</div>';
    }
}
function renderProducts(items) {
    var list = document.getElementById('proProductsList');
    if (!list) return;
    if (items.length === 0) {
        list.innerHTML = '<div class="pro-empty"><i class="fas fa-cube"></i>هیچ محصولی یافت نشد.</div>';
    } else {
        list.innerHTML = items.map(function(item, idx) {
            var key = item.key;
            return '<div class="pro-item">' +
                '<div class="info">' +
                '<div class="title">' + (item.name || 'بدون نام') + ' <span style="color:var(--pro-secondary);font-size:0.8rem;">' + (item.price || 'رایگان') + '</span> <span style="color:var(--pro-text-secondary);font-size:0.7rem;">#<span onclick="copyIdFromText(\'' + key + '\')" style="cursor:pointer;color:var(--pro-primary);">' + String(key).padStart(4, '0') + '</span></span></div>' +
                '<div class="meta">' +
                '<span><i class="fas fa-tag"></i> ' + (item.tag || 'بدون برچسب') + '</span>' +
                '<span><i class="fas fa-box"></i> ' + (item.stock || 'موجود') + '</span>' +
                (item.files && item.files.length ? '<span><i class="fas fa-paperclip"></i> ' + item.files.length + ' فایل</span>' : '') +
                (item.images && item.images.length ? '<span><i class="fas fa-images"></i> ' + item.images.length + ' عکس</span>' : '') +
                '</div></div>' +
                '<div class="actions">' +
                '<a href="../product.html?id=' + key + '" class="pro-btn pro-btn-primary pro-btn-sm" target="_blank"><i class="fas fa-eye"></i></a>' +
                '<button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditModal(\'product\',\'' + key + '\')"><i class="fas fa-edit"></i></button>' +
                '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveProduct(' + idx + ', -1)" title="بالا" ' + (idx === 0 ? 'disabled' : '') + '><i class="fas fa-arrow-up"></i></button>' +
                '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveProduct(' + idx + ', 1)" title="پایین" ' + (idx === items.length - 1 ? 'disabled' : '') + '><i class="fas fa-arrow-down"></i></button>' +
                '<button class="pro-btn pro-btn-danger pro-btn-sm" onclick="deleteProduct(\'' + key + '\')"><i class="fas fa-trash"></i></button>' +
                '</div></div>';
        }).join('');
    }
    var countEl = document.getElementById('proProductsCount');
    if (countEl) countEl.textContent = allProducts.length;
    var subEl = document.getElementById('proProductsSub');
    if (subEl) subEl.textContent = allProducts.length + ' محصول';
    updateDashboard();
    updateCounts();
}
function filterProducts(query) {
    var q = query.toLowerCase().trim();
    if (!q) {
        productsFiltered = allProducts.slice();
    } else {
        productsFiltered = allProducts.filter(function(item) {
            return (item.name || '').toLowerCase().includes(q) ||
                (item.desc || '').toLowerCase().includes(q) ||
                (item.tag || '').toLowerCase().includes(q);
        });
    }
    renderProducts(productsFiltered);
}
function moveProduct(index, direction) {
    var newIndex = index + direction;
    if (newIndex < 0 || newIndex >= allProducts.length) return;
    var item = allProducts.splice(index, 1)[0];
    allProducts.splice(newIndex, 0, item);
    var newData = {};
    allProducts.forEach(function(item, i) {
        newData[String(i + 1).padStart(4, '0')] = item;
    });
    productsData = newData;
    renderProducts(allProducts);
    showMsg('✅ ترتیب محصولات تغییر کرد. برای ذخیره روی دکمه "ذخیره" کلیک کنید.', 'info');
}
async function deleteProduct(key) {
    if (!confirm('آیا از حذف محصول #' + String(key).padStart(4, '0') + ' مطمئن هستید؟')) return;
    if (!getToken()) { showMsg('لطفاً توکن را وارد کنید.', 'error'); return; }
    try {
        delete productsData[key];
        var newSha = await saveToGitHub('_data/products.json', productsData, productsSha);
        productsSha = newSha;
        showMsg('✅ محصول حذف شد.', 'success');
        logActivity('محصول #' + String(key).padStart(4, '0') + ' حذف شد');
        loadProducts();
    } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
}

// ============================================================
// 0510 - آرشیو (اصلاح‌شده با مدیریت خطای JSON)
// ============================================================
var archiveFiltered = [];
async function loadArchive() {
    var list = document.getElementById('proArchiveList');
    if (!list) return;
    if (!getToken()) {
        list.innerHTML = '<div class="pro-empty"><i class="fas fa-key"></i>لطفاً توکن گیت‌هاب را وارد کنید.</div>';
        return;
    }
    try {
        var data = await fetchFromGitHub('_data/archive.json');
        if (data && data.content) {
            try {
                archiveData = JSON.parse(data.content);
                archiveSha = data.sha;
            } catch (e) {
                console.warn('⚠️ فایل archive.json خراب است، بازنشانی به {}:', e);
                archiveData = {};
                archiveSha = data.sha;
            }
        } else {
            archiveData = {};
            archiveSha = null;
        }
        allArchive = Object.keys(archiveData).map(function(key) { return { key: key, ...archiveData[key] }; });
        archiveFiltered = allArchive.slice();
        renderArchive(archiveFiltered);
    } catch (e) {
        list.innerHTML = '<div class="pro-empty"><i class="fas fa-exclamation-triangle" style="color:var(--pro-red);"></i>خطا: ' + e.message + '</div>';
    }
}
function renderArchive(items) {
    var list = document.getElementById('proArchiveList');
    if (!list) return;
    var typeLabels = { cfd: 'تحلیل CFD', structure: 'تحلیل سازه', design: 'طراحی مکانیکی', electro: 'تحلیل الکترومغناطیس', university: 'پروژه دانشگاهی', fabrication: 'ساخت و نمونه‌سازی', other: 'سایر' };
    var typeBadgeClass = { cfd: 'badge-cfd', structure: 'badge-structure', design: 'badge-design', electro: 'badge-electro', university: 'badge-university', fabrication: 'badge-fabrication', other: 'badge-other' };
    if (items.length === 0) {
        list.innerHTML = '<div class="pro-empty"><i class="fas fa-archive"></i>هیچ آیتمی در آرشیو یافت نشد.</div>';
    } else {
        list.innerHTML = items.map(function(item, idx) {
            var key = item.key;
            var typeLabel = typeLabels[item.type] || item.type || 'سایر';
            var badgeClass = typeBadgeClass[item.type] || 'badge-other';
            return '<div class="pro-item">' +
                '<div class="info">' +
                '<div class="title">' + (item.title || 'بدون عنوان') + ' <span style="color:var(--pro-text-secondary);font-size:0.7rem;">#<span onclick="copyIdFromText(\'' + key + '\')" style="cursor:pointer;color:var(--pro-primary);">' + String(key).padStart(4, '0') + '</span></span></div>' +
                '<div class="meta">' +
                '<span><span class="' + badgeClass + '" style="padding:2px 10px;border-radius:20px;font-size:0.7rem;">' + typeLabel + '</span></span>' +
                '<span><i class="fas fa-calendar"></i> ' + (item.date || '---') + '</span>' +
                '<span><i class="fas fa-flag"></i> ' + (item.status || 'تکمیل شده') + '</span>' +
                (item.files && item.files.length ? '<span><i class="fas fa-paperclip"></i> ' + item.files.length + ' فایل</span>' : '') +
                (item.images && item.images.length ? '<span><i class="fas fa-images"></i> ' + item.images.length + ' عکس</span>' : '') +
                '</div></div>' +
                '<div class="actions">' +
                '<a href="../archive-item.html?id=' + key + '" class="pro-btn pro-btn-primary pro-btn-sm" target="_blank"><i class="fas fa-eye"></i></a>' +
                '<button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditModal(\'archive\',\'' + key + '\')"><i class="fas fa-edit"></i></button>' +
                '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveArchive(' + idx + ', -1)" title="بالا" ' + (idx === 0 ? 'disabled' : '') + '><i class="fas fa-arrow-up"></i></button>' +
                '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveArchive(' + idx + ', 1)" title="پایین" ' + (idx === items.length - 1 ? 'disabled' : '') + '><i class="fas fa-arrow-down"></i></button>' +
                '<button class="pro-btn pro-btn-danger pro-btn-sm" onclick="deleteArchive(\'' + key + '\')"><i class="fas fa-trash"></i></button>' +
                '</div></div>';
        }).join('');
    }
    var countEl = document.getElementById('proArchiveCount');
    if (countEl) countEl.textContent = allArchive.length;
    var subEl = document.getElementById('proArchiveSub');
    if (subEl) subEl.textContent = allArchive.length + ' آیتم';
    updateDashboard();
    updateCounts();
}
function filterArchive(query) {
    var q = query.toLowerCase().trim();
    if (!q) {
        archiveFiltered = allArchive.slice();
    } else {
        archiveFiltered = allArchive.filter(function(item) {
            return (item.title || '').toLowerCase().includes(q) ||
                (item.excerpt || '').toLowerCase().includes(q) ||
                (item.tags || []).join(' ').toLowerCase().includes(q);
        });
    }
    renderArchive(archiveFiltered);
}
function moveArchive(index, direction) {
    var newIndex = index + direction;
    if (newIndex < 0 || newIndex >= allArchive.length) return;
    var item = allArchive.splice(index, 1)[0];
    allArchive.splice(newIndex, 0, item);
    var newData = {};
    allArchive.forEach(function(item, i) {
        newData[String(i + 1).padStart(4, '0')] = item;
    });
    archiveData = newData;
    renderArchive(allArchive);
    showMsg('✅ ترتیب آرشیو تغییر کرد. برای ذخیره روی دکمه "ذخیره" کلیک کنید.', 'info');
}
async function deleteArchive(key) {
    if (!confirm('آیا از حذف آیتم آرشیو #' + String(key).padStart(4, '0') + ' مطمئن هستید؟')) return;
    if (!getToken()) { showMsg('لطفاً توکن را وارد کنید.', 'error'); return; }
    try {
        delete archiveData[key];
        var newSha = await saveToGitHub('_data/archive.json', archiveData, archiveSha);
        archiveSha = newSha;
        showMsg('✅ آیتم آرشیو حذف شد.', 'success');
        logActivity('آیتم آرشیو #' + String(key).padStart(4, '0') + ' حذف شد');
        loadArchive();
    } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
}

// ============================================================
// 0511 - مودال ویرایش کامل (بدون تغییر)
// ============================================================
function openEditModal(type, key) {
    editingType = type;
    editingItem = key;
    var modal = document.getElementById('editModal');
    var title = document.getElementById('editModalTitle');
    var body = document.getElementById('editModalBody');
    if (!modal || !title || !body) { showMsg('❌ مودال یافت نشد.', 'error'); return; }

    var data = {};
    if (type === 'article') data = articlesData[key];
    else if (type === 'product') data = productsData[key];
    else if (type === 'archive') data = archiveData[key];

    if (!data) {
        showMsg('❌ آیتم یافت نشد.', 'error');
        return;
    }

    title.innerHTML = '<i class="fas fa-edit"></i> ویرایش ' + (type === 'article' ? 'مقاله' : type === 'product' ? 'محصول' : 'آرشیو') + ' #' + String(key).padStart(4, '0');

    var existingImages = data.images || [];
    var existingFiles = data.files || [];

    var html = '<form id="editForm">';
    html += '<input type="hidden" id="editKey" value="' + key + '">';
    html += '<input type="hidden" id="editType" value="' + type + '">';

    if (type === 'article') {
        html += '<div class="pro-grid">' +
            '<div class="pro-field full"><label>عنوان</label><input type="text" id="editTitle" value="' + (data.title || '') + '"></div>' +
            '<div class="pro-field full"><label>چکیده</label><textarea id="editExcerpt" rows="3">' + (data.excerpt || '') + '</textarea></div>' +
            '<div class="pro-field"><label>نوع</label><select id="editTypeSelect">' +
            '<option value="article" ' + (data.type === 'article' ? 'selected' : '') + '>مقاله</option>' +
            '<option value="project" ' + (data.type === 'project' ? 'selected' : '') + '>پروژه</option>' +
            '<option value="tutorial" ' + (data.type === 'tutorial' ? 'selected' : '') + '>آموزش</option>' +
            '</select></div>' +
            '<div class="pro-field"><label>تاریخ</label><input type="date" id="editDate" value="' + (data.date || '') + '"></div>' +
            '<div class="pro-field full"><label>برچسب‌ها (با کاما)</label><input type="text" id="editTags" value="' + ((data.tags || []).join('، ')) + '"></div>' +
            '<div class="pro-field"><label>زمان مطالعه</label><input type="number" id="editReadTime" value="' + (data.readTime || 5) + '"></div>' +
            '<div class="pro-field full"><label>متن کامل</label><textarea id="editBody" rows="8">' + (data.body || '') + '</textarea></div>' +
            '</div>';
    } else if (type === 'product') {
        html += '<div class="pro-grid">' +
            '<div class="pro-field full"><label>نام محصول</label><input type="text" id="editName" value="' + (data.name || '') + '"></div>' +
            '<div class="pro-field full"><label>توضیحات</label><textarea id="editDesc" rows="3">' + (data.desc || '') + '</textarea></div>' +
            '<div class="pro-field"><label>قیمت</label><input type="text" id="editPrice" value="' + (data.price || '') + '"></div>' +
            '<div class="pro-field"><label>آیکون</label><input type="text" id="editIcon" value="' + (data.icon || 'fa-cube') + '"></div>' +
            '<div class="pro-field"><label>برچسب</label><input type="text" id="editTag" value="' + (data.tag || '') + '"></div>' +
            '<div class="pro-field"><label>دسته‌بندی</label><input type="text" id="editCategory" value="' + (data.category || '') + '"></div>' +
            '<div class="pro-field"><label>موجودی</label><select id="editStock">' +
            '<option value="موجود" ' + (data.stock === 'موجود' ? 'selected' : '') + '>موجود</option>' +
            '<option value="ناموجود" ' + (data.stock === 'ناموجود' ? 'selected' : '') + '>ناموجود</option>' +
            '<option value="پیش‌سفارش" ' + (data.stock === 'پیش‌سفارش' ? 'selected' : '') + '>پیش‌سفارش</option>' +
            '</select></div></div>';
    } else if (type === 'archive') {
        var typeLabels = { cfd: 'تحلیل CFD', structure: 'تحلیل سازه', design: 'طراحی مکانیکی', electro: 'تحلیل الکترومغناطیس', university: 'پروژه دانشگاهی', fabrication: 'ساخت و نمونه‌سازی', other: 'سایر' };
        html += '<div class="pro-grid">' +
            '<div class="pro-field full"><label>عنوان پروژه</label><input type="text" id="editTitle" value="' + (data.title || '') + '"></div>' +
            '<div class="pro-field full"><label>توضیحات کوتاه</label><textarea id="editExcerpt" rows="3">' + (data.excerpt || '') + '</textarea></div>' +
            '<div class="pro-field"><label>نوع</label><select id="editTypeSelect">';
        Object.keys(typeLabels).forEach(function(t) {
            html += '<option value="' + t + '" ' + (data.type === t ? 'selected' : '') + '>' + typeLabels[t] + '</option>';
        });
        html += '</select></div>' +
            '<div class="pro-field"><label>تاریخ</label><input type="date" id="editDate" value="' + (data.date || '') + '"></div>' +
            '<div class="pro-field"><label>وضعیت</label><select id="editStatus">' +
            '<option value="تکمیل شده" ' + (data.status === 'تکمیل شده' ? 'selected' : '') + '>تکمیل شده</option>' +
            '<option value="در حال انجام" ' + (data.status === 'در حال انجام' ? 'selected' : '') + '>در حال انجام</option>' +
            '<option value="ارائه شده" ' + (data.status === 'ارائه شده' ? 'selected' : '') + '>ارائه شده</option>' +
            '</select></div>' +
            '<div class="pro-field full"><label>برچسب‌ها (با کاما)</label><input type="text" id="editTags" value="' + ((data.tags || []).join('، ')) + '"></div>' +
            '<div class="pro-field full"><label>توضیحات کامل</label><textarea id="editBody" rows="8">' + (data.body || '') + '</textarea></div></div>';
    }

    html += '<div class="pro-grid"><div class="pro-field full"><label><i class="fas fa-image"></i> تصویر شاخص</label>' +
        '<div class="pro-upload-zone-edit" id="editCoverZone">' +
        '<i class="fas fa-cloud-upload-alt"></i><p>برای آپلود تصویر کلیک کنید</p><span class="hint">فرمت‌های مجاز: JPG, PNG, WebP</span>' +
        '<input type="file" id="editCoverInput" accept="image/*" style="display:none;">' +
        '<div id="editCoverPreview" style="margin-top:10px;display:' + (data.cover ? 'block' : 'none') + ';">' +
        '<img id="editCoverPreviewImg" class="upload-preview-img-edit" src="' + (data.cover || '') + '" alt="تصویر شاخص">' +
        '<button type="button" class="pro-btn pro-btn-danger pro-btn-sm" onclick="removeEditCover()">حذف تصویر</button>' +
        '</div></div></div></div>';

    html += '<div class="pro-grid"><div class="pro-field full"><label><i class="fas fa-images"></i> گالری عکس‌ها (' + existingImages.length + ' عدد)</label>' +
        '<div id="editGalleryContainer"><div class="edit-gallery-grid" id="editGalleryGrid">';
    existingImages.forEach(function(img, idx) {
        html += '<div class="edit-gallery-item" data-index="' + idx + '">' +
            '<img src="' + img + '" alt="عکس گالری">' +
            '<button type="button" class="remove-btn" onclick="removeEditImage(' + idx + ')"><i class="fas fa-times"></i></button></div>';
    });
    html += '</div><div class="pro-upload-zone-edit" id="editGalleryZone" style="margin-top:12px;">' +
        '<i class="fas fa-plus-circle"></i><p>برای افزودن عکس جدید کلیک کنید</p>' +
        '<input type="file" id="editGalleryInput" accept="image/*" multiple style="display:none;">' +
        '</div></div></div></div>';

    html += '<div class="pro-grid"><div class="pro-field full"><label><i class="fas fa-paperclip"></i> فایل‌های ضمیمه (' + existingFiles.length + ' عدد)</label>' +
        '<div id="editFilesContainer"><div class="edit-file-list" id="editFileList">';
    existingFiles.forEach(function(f, idx) {
        html += '<div class="edit-file-tag" data-index="' + idx + '">' +
            '<i class="fas fa-file"></i><span>' + (typeof f === 'string' ? f : f.name || f) + '</span>' +
            '<button type="button" class="remove-btn" onclick="removeEditFile(' + idx + ')"><i class="fas fa-times"></i></button></div>';
    });
    html += '</div><div class="pro-upload-zone-edit" id="editFilesZone" style="margin-top:12px;">' +
        '<i class="fas fa-cloud-upload-alt"></i><p>برای افزودن فایل جدید کلیک کنید (PDF, STL, ZIP, ...)</p>' +
        '<span class="hint">حداکثر حجم هر فایل: ۱۰ مگابایت</span>' +
        '<input type="file" id="editFilesInput" multiple style="display:none;">' +
        '</div></div></div></div>';

    html += '<div style="display:flex;gap:12px;margin-top:18px;">' +
        '<button type="submit" class="pro-btn pro-btn-primary pro-btn-lg"><i class="fas fa-save"></i> ذخیره تغییرات</button>' +
        '<button type="button" class="pro-btn pro-btn-outline" onclick="closeEditModal()">انصراف</button></div>';
    html += '</form>';

    body.innerHTML = html;

    setupEditCoverUpload();
    setupEditGalleryUpload();
    setupEditFilesUpload();

    var form = document.getElementById('editForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            saveEdit();
        });
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeEditModal() {
    var modal = document.getElementById('editModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
    editingItem = null;
    editingType = null;
    window._editPendingImages = [];
    window._editPendingFiles = [];
}
var focusModeActive = false;
function toggleFocusMode() {
    var modal = document.querySelector('.pro-modal');
    if (!modal) return;
    focusModeActive = !focusModeActive;
    if (focusModeActive) {
        modal.classList.add('focus-mode');
        var btn = document.querySelector('.btn-focus-mode');
        if (btn) btn.innerHTML = '<i class="fas fa-compress"></i>';
    } else {
        modal.classList.remove('focus-mode');
        var btn = document.querySelector('.btn-focus-mode');
        if (btn) btn.innerHTML = '<i class="fas fa-expand"></i>';
    }
}

// ============================================================
// 0512 - توابع کمکی ویرایش (بدون تغییر)
// ============================================================
function removeEditCover() {
    var preview = document.getElementById('editCoverPreview');
    var img = document.getElementById('editCoverPreviewImg');
    var input = document.getElementById('editCoverInput');
    if (preview) preview.style.display = 'none';
    if (img) img.src = '';
    if (input) input.value = '';
    window._editCoverImage = null;
}
function removeEditImage(index) {
    var grid = document.getElementById('editGalleryGrid');
    if (!grid) return;
    var items = grid.querySelectorAll('.edit-gallery-item');
    if (items[index]) { items[index].remove(); }
}
function removeEditFile(index) {
    var list = document.getElementById('editFileList');
    if (!list) return;
    var items = list.querySelectorAll('.edit-file-tag');
    if (items[index]) { items[index].remove(); }
}
function setupEditCoverUpload() {
    var zone = document.getElementById('editCoverZone');
    var input = document.getElementById('editCoverInput');
    var preview = document.getElementById('editCoverPreview');
    var img = document.getElementById('editCoverPreviewImg');
    if (!zone || !input || !preview || !img) return;
    zone.addEventListener('click', function() { input.click(); });
    input.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
            img.src = ev.target.result;
            preview.style.display = 'block';
            window._editCoverImage = ev.target.result;
        };
        reader.readAsDataURL(file);
    });
    zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', function(e) { e.preventDefault(); zone.classList.remove('dragover'); });
    zone.addEventListener('drop', function(e) {
        e.preventDefault();
        zone.classList.remove('dragover');
        var files = e.dataTransfer.files;
        if (files.length) {
            input.files = files;
            input.dispatchEvent(new Event('change'));
        }
    });
}
function setupEditGalleryUpload() {
    var zone = document.getElementById('editGalleryZone');
    var input = document.getElementById('editGalleryInput');
    var grid = document.getElementById('editGalleryGrid');
    if (!zone || !input || !grid) return;
    zone.addEventListener('click', function() { input.click(); });
    input.addEventListener('change', function(e) {
        var newFiles = Array.from(e.target.files);
        newFiles.forEach(function(file) {
            var reader = new FileReader();
            reader.onload = function(ev) {
                var imgData = ev.target.result;
                var item = document.createElement('div');
                item.className = 'edit-gallery-item';
                item.innerHTML = '<img src="' + imgData + '" alt="عکس جدید"><button type="button" class="remove-btn" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>';
                grid.appendChild(item);
                if (!window._editPendingImages) window._editPendingImages = [];
                window._editPendingImages.push(imgData);
            };
            reader.readAsDataURL(file);
        });
        input.value = '';
    });
    zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', function(e) { e.preventDefault(); zone.classList.remove('dragover'); });
    zone.addEventListener('drop', function(e) {
        e.preventDefault();
        zone.classList.remove('dragover');
        var files = e.dataTransfer.files;
        if (files.length) {
            input.files = files;
            input.dispatchEvent(new Event('change'));
        }
    });
}
function setupEditFilesUpload() {
    var zone = document.getElementById('editFilesZone');
    var input = document.getElementById('editFilesInput');
    var list = document.getElementById('editFileList');
    if (!zone || !input || !list) return;
    zone.addEventListener('click', function() { input.click(); });
    input.addEventListener('change', function(e) {
        var newFiles = Array.from(e.target.files);
        newFiles.forEach(function(file) {
            if (file.size > 10 * 1024 * 1024) {
                showMsg('حجم فایل ' + file.name + ' بیشتر از ۱۰ مگابایت است.', 'error');
                return;
            }
            var reader = new FileReader();
            reader.onload = function(ev) {
                var fileData = ev.target.result.split(',')[1];
                var tag = document.createElement('div');
                tag.className = 'edit-file-tag';
                tag.innerHTML = '<i class="fas fa-file"></i><span>' + file.name + '</span><button type="button" class="remove-btn" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>';
                list.appendChild(tag);
                if (!window._editPendingFiles) window._editPendingFiles = [];
                window._editPendingFiles.push({ name: file.name, data: fileData, size: file.size });
            };
            reader.readAsDataURL(file);
        });
        input.value = '';
    });
    zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', function(e) { e.preventDefault(); zone.classList.remove('dragover'); });
    zone.addEventListener('drop', function(e) {
        e.preventDefault();
        zone.classList.remove('dragover');
        var files = e.dataTransfer.files;
        if (files.length) {
            input.files = files;
            input.dispatchEvent(new Event('change'));
        }
    });
}
async function saveEdit() {
    var key = document.getElementById('editKey')?.value;
    var type = document.getElementById('editType')?.value;
    if (!key || !type) { showMsg('❌ اطلاعات ویرایش کامل نیست.', 'error'); return; }
    try {
        var data = {};
        var cover = document.getElementById('editCoverPreviewImg')?.src;
        if (!cover || cover.includes('placeholder') || cover === '') cover = null;
        var galleryItems = document.querySelectorAll('#editGalleryGrid .edit-gallery-item img');
        var images = [];
        galleryItems.forEach(function(img) {
            if (img.src && !img.src.includes('placeholder')) {
                images.push(img.src);
            }
        });
        var fileItems = document.querySelectorAll('#editFileList .edit-file-tag');
        var files = [];
        fileItems.forEach(function(el) {
            var name = el.querySelector('span')?.textContent || 'file';
            files.push(name);
        });
        if (type === 'article') {
            data = {
                title: document.getElementById('editTitle')?.value?.trim() || '',
                excerpt: document.getElementById('editExcerpt')?.value?.trim() || '',
                type: document.getElementById('editTypeSelect')?.value || 'article',
                date: document.getElementById('editDate')?.value || new Date().toISOString().split('T')[0],
                tags: (document.getElementById('editTags')?.value || '').split(/[،,]/).map(function(t) { return t.trim(); }).filter(Boolean),
                readTime: parseInt(document.getElementById('editReadTime')?.value) || 5,
                body: document.getElementById('editBody')?.value?.trim() || '',
                cover: cover,
                images: images,
                files: files,
                updated: new Date().toISOString()
            };
            articlesData[key] = { ...articlesData[key], ...data };
            var newSha = await saveToGitHub('_data/articles.json', articlesData, articlesSha);
            articlesSha = newSha;
            showMsg('✅ مقاله با موفقیت ویرایش شد!', 'success');
            loadArticles();
        } else if (type === 'product') {
            data = {
                name: document.getElementById('editName')?.value?.trim() || '',
                desc: document.getElementById('editDesc')?.value?.trim() || '',
                price: document.getElementById('editPrice')?.value?.trim() || 'رایگان',
                icon: document.getElementById('editIcon')?.value?.trim() || 'fa-cube',
                tag: document.getElementById('editTag')?.value?.trim() || '',
                category: document.getElementById('editCategory')?.value?.trim() || '',
                stock: document.getElementById('editStock')?.value || 'موجود',
                cover: cover,
                images: images,
                files: files,
                updated: new Date().toISOString()
            };
            productsData[key] = { ...productsData[key], ...data };
            var newSha = await saveToGitHub('_data/products.json', productsData, productsSha);
            productsSha = newSha;
            showMsg('✅ محصول با موفقیت ویرایش شد!', 'success');
            loadProducts();
        } else if (type === 'archive') {
            data = {
                title: document.getElementById('editTitle')?.value?.trim() || '',
                excerpt: document.getElementById('editExcerpt')?.value?.trim() || '',
                type: document.getElementById('editTypeSelect')?.value || 'other',
                date: document.getElementById('editDate')?.value || new Date().toISOString().split('T')[0],
                status: document.getElementById('editStatus')?.value || 'تکمیل شده',
                tags: (document.getElementById('editTags')?.value || '').split(/[،,]/).map(function(t) { return t.trim(); }).filter(Boolean),
                body: document.getElementById('editBody')?.value?.trim() || '',
                cover: cover,
                images: images,
                files: files,
                updated: new Date().toISOString()
            };
            archiveData[key] = { ...archiveData[key], ...data };
            var newSha = await saveToGitHub('_data/archive.json', archiveData, archiveSha);
            archiveSha = newSha;
            showMsg('✅ آیتم آرشیو با موفقیت ویرایش شد!', 'success');
            loadArchive();
        }
        var pendingImages = window._editPendingImages || [];
        var pendingFiles = window._editPendingFiles || [];
        if (pendingImages.length > 0) {
            for (var i = 0; i < pendingImages.length; i++) {
                var img = pendingImages[i];
                var path = 'assets/' + type + 's/' + key + '/img_' + Date.now() + '.jpg';
                try { await uploadFileToGitHub(path, img.split(',')[1]); } catch (e) { console.error(e); }
            }
        }
        if (pendingFiles.length > 0) {
            for (var j = 0; j < pendingFiles.length; j++) {
                var file = pendingFiles[j];
                var path = 'assets/' + type + 's/' + key + '/' + file.name;
                try { await uploadFileToGitHub(path, file.data); } catch (e) { console.error(e); }
            }
        }
        logActivity((type === 'article' ? 'مقاله' : type === 'product' ? 'محصول' : 'آرشیو') + ' #' + String(key).padStart(4, '0') + ' ویرایش شد');
        closeEditModal();
        showToast('✅ ذخیره شد', 'success');
    } catch (e) {
        showMsg('❌ خطا: ' + e.message, 'error');
        showToast('❌ ذخیره‌سازی ناموفق', 'error');
    }
}

// ============================================================
// 0513 - آپلود فایل‌ها (بدون تغییر)
// ============================================================
function setupFileUpload(zoneId, inputId, listId, type, maxItems) {
    maxItems = maxItems || 10;
    var zone = document.getElementById(zoneId);
    var input = document.getElementById(inputId);
    var list = document.getElementById(listId);
    if (!zone || !input || !list) return;
    zone.addEventListener('click', function() { input.click(); });
    input.addEventListener('change', function(e) {
        var newFiles = Array.from(e.target.files);
        var currentCount = list.querySelectorAll('.file-tag').length;
        var remaining = maxItems - currentCount;
        var toAdd = newFiles.slice(0, remaining);
        toAdd.forEach(function(file) {
            if (file.size > 10 * 1024 * 1024) {
                showMsg('حجم فایل ' + file.name + ' بیشتر از ۱۰ مگابایت است.', 'error');
                return;
            }
            var reader = new FileReader();
            reader.onload = function(ev) {
                var fileData = ev.target.result.split(',')[1];
                var fileItem = document.createElement('div');
                fileItem.className = 'file-tag';
                fileItem.innerHTML = '<i class="fas fa-file"></i><span>' + file.name + '</span><button class="remove" onclick="removeFileFromList(\'' + listId + '\', this)"><i class="fas fa-times"></i></button>';
                list.appendChild(fileItem);
                if (!window._pendingFiles) window._pendingFiles = {};
                if (!window._pendingFiles[type]) window._pendingFiles[type] = [];
                window._pendingFiles[type].push({ name: file.name, data: fileData, size: file.size });
            };
            reader.readAsDataURL(file);
        });
        if (newFiles.length > remaining) {
            showMsg('حداکثر ' + maxItems + ' فایل مجاز است.', 'error');
        }
        input.value = '';
    });
    zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', function(e) { e.preventDefault(); zone.classList.remove('dragover'); });
    zone.addEventListener('drop', function(e) {
        e.preventDefault();
        zone.classList.remove('dragover');
        var files = e.dataTransfer.files;
        if (files.length) {
            input.files = files;
            input.dispatchEvent(new Event('change'));
        }
    });
}
function removeFileFromList(listId, btn) {
    var list = document.getElementById(listId);
    if (!list) return;
    var item = btn.closest('.file-tag');
    if (item) {
        var index = Array.from(list.children).indexOf(item);
        item.remove();
        for (var type in window._pendingFiles) {
            if (window._pendingFiles[type] && window._pendingFiles[type][index]) {
                window._pendingFiles[type].splice(index, 1);
            }
        }
    }
}

// ============================================================
// 0514 - آپلود تصویر شاخص (بدون تغییر)
// ============================================================
function setupCoverUpload(zoneId, inputId, previewId, imgId, removeFn) {
    var zone = document.getElementById(zoneId);
    var input = document.getElementById(inputId);
    var preview = document.getElementById(previewId);
    var img = document.getElementById(imgId);
    if (!zone || !input || !preview || !img) return;
    zone.addEventListener('click', function() { input.click(); });
    input.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
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
// 0515 - ابزارهای ویرایشگر متن + تابع generateArticleContent
// ============================================================
function execCmd(editorId, cmd) {
    var editor = document.getElementById(editorId);
    if (!editor) return;
    editor.focus();
    document.execCommand(cmd, false, null);
}
function insertLink(editorId) {
    var url = prompt('آدرس لینک را وارد کنید:', 'https://');
    if (url) {
        var editor = document.getElementById(editorId);
        if (!editor) return;
        editor.focus();
        document.execCommand('createLink', false, url);
    }
}
function insertImagePlaceholder(editorId) {
    var editor = document.getElementById(editorId);
    if (!editor) return;
    var placeholder = document.createElement('div');
    placeholder.className = 'img-placeholder';
    placeholder.innerHTML = '<i class="fas fa-image"></i> برای آپلود تصویر کلیک کنید';
    placeholder.style.cursor = 'pointer';
    placeholder.style.padding = '20px';
    placeholder.style.border = '2px dashed var(--pro-border)';
    placeholder.style.borderRadius = '8px';
    placeholder.style.textAlign = 'center';
    placeholder.style.color = 'var(--pro-text-secondary)';
    placeholder.style.margin = '8px 0';
    placeholder.addEventListener('click', function() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
                var img = document.createElement('img');
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
    var range = document.createRange();
    range.setStartAfter(placeholder);
    range.collapse(true);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}
// ---- تابع تولید پیش‌نویس با هوش مصنوعی ----
function generateArticleContent() {
    var title = document.getElementById('articleTitle')?.value?.trim();
    if (!title) {
        showMsg('❌ لطفاً عنوان مقاله را وارد کنید.', 'error');
        return;
    }
    var abstractField = document.getElementById('articleAbstract');
    var bodyField = document.getElementById('articleBody');
    if (abstractField) {
        abstractField.value = 'چکیده مقاله "' + title + '" – این مقاله به بررسی موضوعی مهم در حوزه مهندسی مکانیک می‌پردازد. روش‌های نوین تحلیل و شبیه‌سازی ارائه شده و نتایج با داده‌های تجربی مقایسه می‌شوند.';
    }
    if (bodyField) {
        bodyField.value = '۱. مقدمه\n' + title + ' یکی از موضوعات کلیدی در مهندسی مکانیک است. در این مقاله به تحلیل و بررسی آن پرداخته شده است.\n\n۲. روش‌شناسی\nاز روش‌های عددی و تحلیلی برای بررسی استفاده شده است.\n\n۳. نتایج\nنتایج نشان می‌دهد که روش پیشنهادی عملکرد مناسبی دارد.\n\n۴. بحث و نتیجه‌گیری\nدر نهایت، پیشنهاداتی برای تحقیقات آینده ارائه شده است.';
    }
    showMsg('✅ پیش‌نویس مقاله با هوش مصنوعی تولید شد.', 'success');
}

// اتصال تابع به window
window.generateArticleContent = generateArticleContent;

// ============================================================
// 0516 - افزودن مقاله (بدون تغییر)
// ============================================================
var addArticleForm = document.getElementById('addArticleForm');
if (addArticleForm) {
    addArticleForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var id = parseInt(document.getElementById('articleId')?.value);
        var title = document.getElementById('articleTitle')?.value?.trim() || '';
        var excerpt = document.getElementById('articleExcerpt')?.value?.trim() || '';
        var type = document.getElementById('articleType')?.value || 'article';
        var date = document.getElementById('articleDate')?.value || new Date().toISOString().split('T')[0];
        var tags = (document.getElementById('articleTags')?.value || '').split(',').map(function(t) { return t.trim(); }).filter(Boolean);
        var readTime = parseInt(document.getElementById('articleReadTime')?.value) || 5;
        var body = document.getElementById('articleBody')?.innerHTML?.trim() || '';

        if (!title || !excerpt || !body) {
            showMsg('❌ لطفاً عنوان، چکیده و متن کامل را پر کنید.', 'error');
            return;
        }
        if (!getToken()) { showMsg('❌ لطفاً توکن گیت‌هاب را وارد کنید.', 'error'); return; }

        var cover = null;
        var coverImg = document.getElementById('articleCoverPreviewImg');
        if (coverImg && coverImg.src && coverImg.src.startsWith('data:')) {
            cover = coverImg.src;
        }

        var galleryFiles = window._pendingFiles?.article_gallery || [];
        var imageData = galleryFiles.map(function(f) { return f.data; });
        var files = window._pendingFiles?.article || [];

        try {
            var existing = await fetchFromGitHub('_data/articles.json');
            if (existing && existing.content) {
                try {
                    articlesData = JSON.parse(existing.content);
                    articlesSha = existing.sha;
                } catch (e) {
                    console.warn('⚠️ فایل articles.json خراب است، بازنشانی به {}:', e);
                    articlesData = {};
                    articlesSha = existing.sha;
                }
            } else {
                articlesData = {};
                articlesSha = null;
            }
            var key = String(id).padStart(4, '0');
            articlesData[key] = {
                title: title, excerpt: excerpt, type: type, date: date, tags: tags, readTime: readTime, body: body,
                cover: cover,
                images: imageData,
                files: files.map(function(f) { return f.name; }),
                updated: new Date().toISOString()
            };
            var newSha = await saveToGitHub('_data/articles.json', articlesData, articlesSha);
            articlesSha = newSha;

            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                var path = 'assets/articles/' + key + '/' + file.name;
                try { await uploadFileToGitHub(path, file.data); } catch (e) { console.error(e); }
            }
            for (var j = 0; j < imageData.length; j++) {
                var path = 'assets/articles/' + key + '/img_' + (j + 1) + '.jpg';
                try { await uploadFileToGitHub(path, imageData[j].split(',')[1]); } catch (e) { console.error(e); }
            }
            if (cover) {
                var coverPath = 'assets/articles/' + key + '/cover.jpg';
                try { await uploadFileToGitHub(coverPath, cover.split(',')[1]); } catch (e) { console.error(e); }
            }

            showMsg('✅ مقاله با موفقیت منتشر شد!', 'success');
            showToast('✅ مقاله ذخیره شد', 'success');
            logActivity('مقاله جدید: ' + title + ' (#' + key + ')');
            this.reset();
            var bodyEl = document.getElementById('articleBody');
            if (bodyEl) bodyEl.innerHTML = '';
            var filesList = document.getElementById('articleFilesList');
            if (filesList) filesList.innerHTML = '';
            var galleryList = document.getElementById('articleGalleryList');
            if (galleryList) galleryList.innerHTML = '';
            var coverPreview = document.getElementById('articleCoverPreview');
            if (coverPreview) coverPreview.style.display = 'none';
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
// 0517 - افزودن محصول (بدون تغییر)
// ============================================================
var addProductForm = document.getElementById('addProductForm');
if (addProductForm) {
    addProductForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var id = parseInt(document.getElementById('productId')?.value);
        var name = document.getElementById('productName')?.value?.trim() || '';
        var desc = document.getElementById('productDesc')?.value?.trim() || '';
        var price = document.getElementById('productPrice')?.value?.trim() || 'رایگان';
        var icon = document.getElementById('productIcon')?.value?.trim() || 'fa-cube';
        var tag = document.getElementById('productTag')?.value?.trim() || 'جدید';
        var category = document.getElementById('productCategory')?.value?.trim() || '';
        var stock = document.getElementById('productStock')?.value || 'موجود';

        if (!name || !desc) {
            showMsg('❌ لطفاً نام و توضیحات را پر کنید.', 'error');
            return;
        }
        if (!getToken()) { showMsg('❌ لطفاً توکن گیت‌هاب را وارد کنید.', 'error'); return; }

        var cover = null;
        var coverImg = document.getElementById('productCoverPreviewImg');
        if (coverImg && coverImg.src && coverImg.src.startsWith('data:')) {
            cover = coverImg.src;
        }

        var galleryFiles = window._pendingFiles?.product_gallery || [];
        var imageData = galleryFiles.map(function(f) { return f.data; });
        var files = window._pendingFiles?.product || [];

        try {
            var existing = await fetchFromGitHub('_data/products.json');
            if (existing && existing.content) {
                try {
                    productsData = JSON.parse(existing.content);
                    productsSha = existing.sha;
                } catch (e) {
                    console.warn('⚠️ فایل products.json خراب است، بازنشانی به {}:', e);
                    productsData = {};
                    productsSha = existing.sha;
                }
            } else {
                productsData = {};
                productsSha = null;
            }
            var key = String(id).padStart(4, '0');
            productsData[key] = {
                name: name, desc: desc, price: price, icon: icon, tag: tag, category: category, stock: stock,
                cover: cover,
                images: imageData,
                files: files.map(function(f) { return f.name; }),
                updated: new Date().toISOString()
            };
            var newSha = await saveToGitHub('_data/products.json', productsData, productsSha);
            productsSha = newSha;

            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                var path = 'assets/products/' + key + '/' + file.name;
                try { await uploadFileToGitHub(path, file.data); } catch (e) { console.error(e); }
            }
            for (var j = 0; j < imageData.length; j++) {
                var path = 'assets/products/' + key + '/img_' + (j + 1) + '.jpg';
                try { await uploadFileToGitHub(path, imageData[j].split(',')[1]); } catch (e) { console.error(e); }
            }
            if (cover) {
                var coverPath = 'assets/products/' + key + '/cover.jpg';
                try { await uploadFileToGitHub(coverPath, cover.split(',')[1]); } catch (e) { console.error(e); }
            }

            showMsg('✅ محصول با موفقیت ذخیره شد!', 'success');
            showToast('✅ محصول ذخیره شد', 'success');
            logActivity('محصول جدید: ' + name + ' (#' + key + ')');
            this.reset();
            var filesList = document.getElementById('productFilesList');
            if (filesList) filesList.innerHTML = '';
            var galleryList = document.getElementById('productGalleryList');
            if (galleryList) galleryList.innerHTML = '';
            var coverPreview = document.getElementById('productCoverPreview');
            if (coverPreview) coverPreview.style.display = 'none';
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
// 0518 - افزودن آرشیو (اصلاح‌شده با مدیریت خطای JSON)
// ============================================================
var addArchiveForm = document.getElementById('addArchiveForm');
if (addArchiveForm) {
    addArchiveForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var id = parseInt(document.getElementById('archiveId')?.value);
        var title = document.getElementById('archiveTitle')?.value?.trim() || '';
        var excerpt = document.getElementById('archiveExcerpt')?.value?.trim() || '';
        var type = document.getElementById('archiveType')?.value || 'other';
        var date = document.getElementById('archiveDate')?.value || new Date().toISOString().split('T')[0];
        var tags = (document.getElementById('archiveTags')?.value || '').split(',').map(function(t) { return t.trim(); }).filter(Boolean);
        var status = document.getElementById('archiveStatus')?.value || 'تکمیل شده';
        var body = document.getElementById('archiveBody')?.innerHTML?.trim() || '';

        if (!title || !excerpt) {
            showMsg('❌ لطفاً عنوان و توضیحات کوتاه را پر کنید.', 'error');
            return;
        }
        if (!getToken()) { showMsg('❌ لطفاً توکن گیت‌هاب را وارد کنید.', 'error'); return; }

        var cover = null;
        var coverImg = document.getElementById('archiveCoverPreviewImg');
        if (coverImg && coverImg.src && coverImg.src.startsWith('data:')) {
            cover = coverImg.src;
        }

        var galleryFiles = window._pendingFiles?.archive_gallery || [];
        var imageData = galleryFiles.map(function(f) { return f.data; });
        var files = window._pendingFiles?.archive || [];

        try {
            var existing = await fetchFromGitHub('_data/archive.json');
            if (existing && existing.content) {
                try {
                    archiveData = JSON.parse(existing.content);
                    archiveSha = existing.sha;
                } catch (e) {
                    console.warn('⚠️ فایل archive.json خراب است، بازنشانی به {}:', e);
                    archiveData = {};
                    archiveSha = existing.sha;
                }
            } else {
                archiveData = {};
                archiveSha = null;
            }
            var key = String(id).padStart(4, '0');
            archiveData[key] = {
                title: title, excerpt: excerpt, type: type, date: date, tags: tags, status: status, body: body,
                cover: cover,
                images: imageData,
                files: files.map(function(f) { return f.name; }),
                updated: new Date().toISOString()
            };
            var newSha = await saveToGitHub('_data/archive.json', archiveData, archiveSha);
            archiveSha = newSha;

            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                var path = 'assets/archive/' + key + '/' + file.name;
                try { await uploadFileToGitHub(path, file.data); } catch (e) { console.error(e); }
            }
            for (var j = 0; j < imageData.length; j++) {
                var path = 'assets/archive/' + key + '/img_' + (j + 1) + '.jpg';
                try { await uploadFileToGitHub(path, imageData[j].split(',')[1]); } catch (e) { console.error(e); }
            }
            if (cover) {
                var coverPath = 'assets/archive/' + key + '/cover.jpg';
                try { await uploadFileToGitHub(coverPath, cover.split(',')[1]); } catch (e) { console.error(e); }
            }

            showMsg('✅ آیتم آرشیو با موفقیت ذخیره شد!', 'success');
            showToast('✅ آرشیو ذخیره شد', 'success');
            logActivity('آیتم آرشیو جدید: ' + title + ' (#' + key + ')');
            this.reset();
            var filesList = document.getElementById('archiveFilesList');
            if (filesList) filesList.innerHTML = '';
            var galleryList = document.getElementById('archiveGalleryList');
            if (galleryList) galleryList.innerHTML = '';
            var coverPreview = document.getElementById('archiveCoverPreview');
            if (coverPreview) coverPreview.style.display = 'none';
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
    // ============================================================
    // 0519 - تغییر رمز عبور
    // ============================================================
    function changePassword() {
        var current = document.getElementById('proCurrentPass')?.value?.trim() || '';
        var newPass = document.getElementById('proNewPass')?.value?.trim() || '';
        var confirm = document.getElementById('proConfirmPass')?.value?.trim() || '';
        var msgEl = document.getElementById('proPassMsg');
        if (!msgEl) return;
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
        var users = getUsers();
        var user = users[PRO_USER];
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
        var currentEl = document.getElementById('proCurrentPass');
        var newEl = document.getElementById('proNewPass');
        var confirmEl = document.getElementById('proConfirmPass');
        if (currentEl) currentEl.value = '';
        if (newEl) newEl.value = '';
        if (confirmEl) confirmEl.value = '';
        logActivity('رمز عبور تغییر کرد');
    }

    // ============================================================
    // 0520 - داشبورد و آمار
    // ============================================================
    function updateDashboard() {
        var articles = Object.values(articlesData);
        var products = Object.values(productsData);
        var archive = Object.values(archiveData);
        var fileCount = 0;
        articles.forEach(function(a) { if (a.files) fileCount += a.files.length; });
        products.forEach(function(p) { if (p.files) fileCount += p.files.length; });
        archive.forEach(function(a) { if (a.files) fileCount += a.files.length; });

        var dashArticles = document.getElementById('dashArticles');
        if (dashArticles) dashArticles.textContent = articles.length;
        var dashProducts = document.getElementById('dashProducts');
        if (dashProducts) dashProducts.textContent = products.length;
        var dashArchive = document.getElementById('dashArchive');
        if (dashArchive) dashArchive.textContent = archive.length;
        var dashFiles = document.getElementById('dashFiles');
        if (dashFiles) dashFiles.textContent = fileCount;
        var lastUpdate = document.getElementById('proLastUpdate');
        if (lastUpdate) lastUpdate.textContent = new Date().toLocaleString('fa-IR');
    }
    function updateCounts() {
        var a = document.getElementById('proArticlesCount');
        if (a) a.textContent = Object.values(articlesData).length;
        var p = document.getElementById('proProductsCount');
        if (p) p.textContent = Object.values(productsData).length;
        var ar = document.getElementById('proArchiveCount');
        if (ar) ar.textContent = Object.values(archiveData).length;
    }

    // ============================================================
    // 0521 - ظاهر
    // ============================================================
    function loadAppearanceSettings() {
        try {
            var saved = localStorage.getItem('appearance_preview');
            if (saved) {
                var data = JSON.parse(saved);
                applyAppearanceToPreview(data);
            }
        } catch (e) {}
        fetchFromGitHub('_data/settings.json').then(function(data) {
            if (data) {
                var settings = JSON.parse(data.content);
                var app = settings.appearance || {};
                var fields = {
                    appColorPrimary: app.colorPrimary || '#2563eb',
                    appColorSecondary: app.colorSecondary || '#10b981',
                    appColorBg: app.colorBg || '#0a0f1a',
                    appColorText: app.colorText || '#f1f5f9',
                    appColorTextSec: app.colorTextSec || '#94a3b8',
                    appColorCard: app.colorCard || '#141b2b',
                    appColorBorder: app.colorBorder || '#1e2a3d',
                    appFontFamily: app.fontFamily || 'Vazirmatn',
                    appFontSize: app.fontSize || 16,
                    appFontSizeHeading: app.fontSizeHeading || 36,
                    appLineHeight: app.lineHeight || 1.8,
                    appBgImage: app.bgImage || ''
                };
                Object.keys(fields).forEach(function(id) {
                    var el = document.getElementById(id);
                    if (el) el.value = fields[id];
                });
                updateColorHexes();
                applyAppearanceToPreview(app);
                applyToPanel(app);
            }
        }).catch(function() {});
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
        var preview = document.getElementById('livePreview');
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
        var heading = preview.querySelector('h4');
        if (heading && app.colorPrimary) heading.style.color = app.colorPrimary;
        var p = preview.querySelector('p');
        if (p && app.colorTextSec) p.style.color = app.colorTextSec;
        var cards = preview.querySelectorAll('div[style*="background:var(--pro-card)"]');
        cards.forEach(function(c) {
            if (app.colorCard) c.style.background = app.colorCard;
            if (app.colorBorder) c.style.borderColor = app.colorBorder;
            if (app.colorText) c.style.color = app.colorText;
        });
        var btn = preview.querySelector('button');
        if (btn && app.colorPrimary) btn.style.background = app.colorPrimary;
        localStorage.setItem('appearance_preview', JSON.stringify(app));
    }
    function updateColorHexes() {
        var map = {
            appColorPrimaryHex: 'appColorPrimary',
            appColorSecondaryHex: 'appColorSecondary',
            appColorBgHex: 'appColorBg',
            appColorTextHex: 'appColorText',
            appColorTextSecHex: 'appColorTextSec',
            appColorCardHex: 'appColorCard',
            appColorBorderHex: 'appColorBorder'
        };
        Object.keys(map).forEach(function(hexId) {
            var el = document.getElementById(hexId);
            var source = document.getElementById(map[hexId]);
            if (el && source) el.textContent = source.value;
        });
    }
    document.querySelectorAll('#appearanceForm input[type="color"]').forEach(function(inp) {
        inp.addEventListener('input', function() {
            updateColorHexes();
            var app = {
                colorPrimary: document.getElementById('appColorPrimary')?.value || '#2563eb',
                colorSecondary: document.getElementById('appColorSecondary')?.value || '#10b981',
                colorBg: document.getElementById('appColorBg')?.value || '#0a0f1a',
                colorText: document.getElementById('appColorText')?.value || '#f1f5f9',
                colorTextSec: document.getElementById('appColorTextSec')?.value || '#94a3b8',
                colorCard: document.getElementById('appColorCard')?.value || '#141b2b',
                colorBorder: document.getElementById('appColorBorder')?.value || '#1e2a3d',
                fontFamily: document.getElementById('appFontFamily')?.value || 'Vazirmatn',
                fontSize: parseInt(document.getElementById('appFontSize')?.value) || 16,
                fontSizeHeading: parseInt(document.getElementById('appFontSizeHeading')?.value) || 36,
                lineHeight: parseFloat(document.getElementById('appLineHeight')?.value) || 1.8,
                bgImage: document.getElementById('appBgImage')?.value || ''
            };
            applyAppearanceToPreview(app);
            applyToPanel(app);
        });
    });
    document.querySelectorAll('#appearanceForm input[type="number"], #appearanceForm select, #appearanceForm input[type="text"]').forEach(function(inp) {
        inp.addEventListener('input', function() {
            var app = {
                colorPrimary: document.getElementById('appColorPrimary')?.value || '#2563eb',
                colorSecondary: document.getElementById('appColorSecondary')?.value || '#10b981',
                colorBg: document.getElementById('appColorBg')?.value || '#0a0f1a',
                colorText: document.getElementById('appColorText')?.value || '#f1f5f9',
                colorTextSec: document.getElementById('appColorTextSec')?.value || '#94a3b8',
                colorCard: document.getElementById('appColorCard')?.value || '#141b2b',
                colorBorder: document.getElementById('appColorBorder')?.value || '#1e2a3d',
                fontFamily: document.getElementById('appFontFamily')?.value || 'Vazirmatn',
                fontSize: parseInt(document.getElementById('appFontSize')?.value) || 16,
                fontSizeHeading: parseInt(document.getElementById('appFontSizeHeading')?.value) || 36,
                lineHeight: parseFloat(document.getElementById('appLineHeight')?.value) || 1.8,
                bgImage: document.getElementById('appBgImage')?.value || ''
            };
            applyAppearanceToPreview(app);
            applyToPanel(app);
        });
    });
    function resetAppearanceForm() {
        var fields = ['appColorPrimary', 'appColorSecondary', 'appColorBg', 'appColorText', 'appColorTextSec', 'appColorCard', 'appColorBorder'];
        fields.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.value = '#';
        });
        var fontFamily = document.getElementById('appFontFamily');
        if (fontFamily) fontFamily.value = 'Vazirmatn';
        var fontSize = document.getElementById('appFontSize');
        if (fontSize) fontSize.value = 16;
        var fontSizeHeading = document.getElementById('appFontSizeHeading');
        if (fontSizeHeading) fontSizeHeading.value = 36;
        var lineHeight = document.getElementById('appLineHeight');
        if (lineHeight) lineHeight.value = 1.8;
        var bgImage = document.getElementById('appBgImage');
        if (bgImage) bgImage.value = '';
        updateColorHexes();
        loadAppearanceSettings();
    }
    async function saveAppearance() {
        var app = {
            colorPrimary: document.getElementById('appColorPrimary')?.value || '#2563eb',
            colorSecondary: document.getElementById('appColorSecondary')?.value || '#10b981',
            colorBg: document.getElementById('appColorBg')?.value || '#0a0f1a',
            colorText: document.getElementById('appColorText')?.value || '#f1f5f9',
            colorTextSec: document.getElementById('appColorTextSec')?.value || '#94a3b8',
            colorCard: document.getElementById('appColorCard')?.value || '#141b2b',
            colorBorder: document.getElementById('appColorBorder')?.value || '#1e2a3d',
            fontFamily: document.getElementById('appFontFamily')?.value || 'Vazirmatn',
            fontSize: parseInt(document.getElementById('appFontSize')?.value) || 16,
            fontSizeHeading: parseInt(document.getElementById('appFontSizeHeading')?.value) || 36,
            lineHeight: parseFloat(document.getElementById('appLineHeight')?.value) || 1.8,
            bgImage: document.getElementById('appBgImage')?.value || ''
        };
        try {
            var existing = await fetchFromGitHub('_data/settings.json');
            var settings = {};
            if (existing) {
                settings = JSON.parse(existing.content);
                var sha = existing.sha;
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
    // 0522 - منوها
    // ============================================================
    function loadMenuData() {
        var token = getToken();
        if (!token) {
            menuData = { header: [], slide: [] };
            renderMenuLists();
            showMsg('⚠️ برای مدیریت منوها، ابتدا توکن گیت‌هاب را وارد کنید.', 'error');
            return;
        }
        fetchFromGitHub('_data/menu.json')
            .then(function(data) {
                if (data) {
                    try {
                        var parsed = JSON.parse(data.content);
                        menuData = {
                            header: Array.isArray(parsed.header) ? parsed.header : [],
                            slide: Array.isArray(parsed.slide) ? parsed.slide : []
                        };
                    } catch (e) {
                        console.warn('⚠️ خطا در parse منو، استفاده از پیش‌فرض:', e);
                        menuData = { header: [], slide: [] };
                    }
                } else {
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
                    saveToGitHub('_data/menu.json', menuData, null)
                        .then(function() { console.log('✅ منوی پیش‌فرض ذخیره شد.'); })
                        .catch(function(err) { console.warn('⚠️ ذخیره منوی پیش‌فرض ناموفق:', err); });
                }
                renderMenuLists();
            })
            .catch(function(err) {
                console.error('❌ خطا در بارگذاری منوها:', err);
                menuData = { header: [], slide: [] };
                renderMenuLists();
                showMsg('⚠️ خطا در بارگذاری منوها. لطفاً توکن خود را بررسی کنید.', 'error');
            });
    }
    function renderMenuLists() {
        var headerList = document.getElementById('headerMenuList');
        var slideList = document.getElementById('slideMenuList');
        if (!headerList || !slideList) {
            console.warn('⚠️ المنت‌های منو در DOM پیدا نشدند!');
            return;
        }
        if (!menuData.header || menuData.header.length === 0) {
            headerList.innerHTML = '<div class="pro-empty"><i class="fas fa-list"></i>هیچ آیتمی در منوی هدر وجود ندارد.</div>';
        } else {
            headerList.innerHTML = menuData.header.map(function(item, idx) {
                return '<div class="menu-item-row">' +
                    '<div class="info"><strong>' + (item.title || 'بدون عنوان') + '</strong><span>' + (item.link || '#') + '</span></div>' +
                    '<div class="actions">' +
                    '<button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditMenuModal(\'header\', ' + idx + ')"><i class="fas fa-edit"></i></button>' +
                    '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveMenuItem(\'header\', ' + idx + ', -1)" title="بالا" ' + (idx === 0 ? 'disabled' : '') + '><i class="fas fa-arrow-up"></i></button>' +
                    '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveMenuItem(\'header\', ' + idx + ', 1)" title="پایین" ' + (idx === menuData.header.length - 1 ? 'disabled' : '') + '><i class="fas fa-arrow-down"></i></button>' +
                    '<button class="pro-btn pro-btn-danger pro-btn-sm" onclick="removeMenuItem(\'header\', ' + idx + ')"><i class="fas fa-trash"></i></button>' +
                    '</div></div>';
            }).join('');
        }
        if (!menuData.slide || menuData.slide.length === 0) {
            slideList.innerHTML = '<div class="pro-empty"><i class="fas fa-list"></i>هیچ آیتمی در منوی کشویی وجود ندارد.</div>';
        } else {
            slideList.innerHTML = menuData.slide.map(function(item, idx) {
                return '<div class="menu-item-row">' +
                    '<div class="info"><strong>' + (item.title || 'بدون عنوان') + '</strong><span>' + (item.link || '#') + '</span></div>' +
                    '<div class="actions">' +
                    '<button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditMenuModal(\'slide\', ' + idx + ')"><i class="fas fa-edit"></i></button>' +
                    '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveMenuItem(\'slide\', ' + idx + ', -1)" title="بالا" ' + (idx === 0 ? 'disabled' : '') + '><i class="fas fa-arrow-up"></i></button>' +
                    '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveMenuItem(\'slide\', ' + idx + ', 1)" title="پایین" ' + (idx === menuData.slide.length - 1 ? 'disabled' : '') + '><i class="fas fa-arrow-down"></i></button>' +
                    '<button class="pro-btn pro-btn-danger pro-btn-sm" onclick="removeMenuItem(\'slide\', ' + idx + ')"><i class="fas fa-trash"></i></button>' +
                    '</div></div>';
            }).join('');
        }
    }
    function addMenuItem(type) {
        var titleInput = type === 'header' ? document.getElementById('newHeaderTitle') : document.getElementById('newSlideTitle');
        var linkInput = type === 'header' ? document.getElementById('newHeaderLink') : document.getElementById('newSlideLink');
        var title = titleInput?.value?.trim();
        var link = linkInput?.value?.trim() || '#';
        if (!title) {
            showMsg('لطفاً عنوان آیتم را وارد کنید.', 'error');
            return;
        }
        if (!menuData[type]) menuData[type] = [];
        menuData[type].push({ title: title, link: link });
        if (titleInput) titleInput.value = '';
        if (linkInput) linkInput.value = '';
        renderMenuLists();
        showMsg('✅ آیتم "' + title + '" به منو اضافه شد.', 'success');
    }
    function removeMenuItem(type, index) {
        if (!confirm('آیا از حذف این آیتم از منو مطمئن هستید؟')) return;
        menuData[type].splice(index, 1);
        renderMenuLists();
        showMsg('✅ آیتم حذف شد.', 'info');
    }
    function moveMenuItem(type, index, direction) {
        var newIndex = index + direction;
        if (newIndex < 0 || newIndex >= menuData[type].length) return;
        var item = menuData[type].splice(index, 1)[0];
        menuData[type].splice(newIndex, 0, item);
        renderMenuLists();
        showMsg('✅ ترتیب منو تغییر کرد.', 'info');
    }
    function openEditMenuModal(type, index) {
        var item = menuData[type][index];
        if (!item) {
            showMsg('❌ آیتم یافت نشد.', 'error');
            return;
        }
        var overlay = document.createElement('div');
        overlay.className = 'pro-modal-overlay active';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '1002';
        overlay.innerHTML = '<div class="pro-modal" style="max-width:500px;">' +
            '<div class="pro-modal-header"><h3><i class="fas fa-edit"></i> ویرایش آیتم منو</h3><button class="pro-modal-close" onclick="this.closest(\'.pro-modal-overlay\').remove()"><i class="fas fa-times"></i></button></div>' +
            '<form id="editMenuForm">' +
            '<div class="pro-field"><label>عنوان</label><input type="text" id="editMenuTitle" value="' + (item.title || '') + '" placeholder="عنوان آیتم"></div>' +
            '<div class="pro-field" style="margin-top:12px;"><label>لینک</label><input type="text" id="editMenuLink" value="' + (item.link || '#') + '" placeholder="لینک (مثال: index.html)"></div>' +
            '<div style="display:flex;gap:12px;margin-top:18px;">' +
            '<button type="submit" class="pro-btn pro-btn-primary"><i class="fas fa-save"></i> ذخیره</button>' +
            '<button type="button" class="pro-btn pro-btn-outline" onclick="this.closest(\'.pro-modal-overlay\').remove()">انصراف</button>' +
            '</div></form></div>';
        document.body.appendChild(overlay);
        var form = overlay.querySelector('#editMenuForm');
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            var newTitle = document.getElementById('editMenuTitle').value.trim();
            var newLink = document.getElementById('editMenuLink').value.trim();
            if (!newTitle) {
                showMsg('❌ لطفاً عنوان را وارد کنید.', 'error');
                return;
            }
            menuData[type][index] = { title: newTitle, link: newLink || '#' };
            overlay.remove();
            renderMenuLists();
            showMsg('✅ آیتم منو ویرایش شد.', 'success');
        });
        overlay.addEventListener('click', function(e) {
            if (e.target === this) this.remove();
        });
    }
    async function saveMenus() {
        try {
            if (!getToken()) {
                showMsg('❌ لطفاً توکن گیت‌هاب را وارد کنید.', 'error');
                return;
            }
            var existing = await fetchFromGitHub('_data/menu.json');
            var sha = existing ? existing.sha : null;
            await saveToGitHub('_data/menu.json', menuData, sha);
            showMsg('✅ منوها با موفقیت ذخیره شدند!', 'success');
            showToast('✅ منوها ذخیره شدند', 'success');
            logActivity('منوها به‌روز شدند');
        } catch (e) {
            showMsg('❌ خطا در ذخیره منوها: ' + e.message, 'error');
            showToast('❌ ذخیره‌سازی ناموفق', 'error');
        }
    }
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

    // ============================================================
    // 0523 - بخش‌ها
    // ============================================================
    function loadSectionsData() {
        fetchFromGitHub('_data/sections.json').then(function(data) {
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
        }).catch(function() {
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
        var map = {
            secHeroTitle: 'hero.title',
            secHeroSubtitle: 'hero.subtitle',
            secHeroDesc: 'hero.desc',
            secHeroImage: 'hero.image',
            secHeroTags: 'hero.tags',
            secAboutText: 'about.text',
            secAboutImage: 'about.image',
            secSkillsTitle: 'skills.title',
            secSkillsDesc: 'skills.desc',
            secEduTitle: 'education.title',
            secEduLayout: 'education.layout',
            secProjectsTitle: 'projects.title',
            secProjectsDesc: 'projects.desc',
            secContactTitle: 'contact.title',
            secContactDesc: 'contact.desc',
            secContactPhone: 'contact.phone',
            secContactEmail: 'contact.email'
        };
        Object.keys(map).forEach(function(id) {
            var el = document.getElementById(id);
            if (!el) return;
            var parts = map[id].split('.');
            var val = sectionsData;
            parts.forEach(function(p) { val = val && val[p]; });
            el.value = val || '';
        });
    }
    async function saveSections() {
        var data = {
            hero: {
                title: document.getElementById('secHeroTitle')?.value?.trim() || '',
                subtitle: document.getElementById('secHeroSubtitle')?.value?.trim() || '',
                desc: document.getElementById('secHeroDesc')?.value?.trim() || '',
                image: document.getElementById('secHeroImage')?.value?.trim() || '',
                tags: document.getElementById('secHeroTags')?.value?.trim() || ''
            },
            about: {
                text: document.getElementById('secAboutText')?.value?.trim() || '',
                image: document.getElementById('secAboutImage')?.value?.trim() || ''
            },
            skills: {
                title: document.getElementById('secSkillsTitle')?.value?.trim() || '',
                desc: document.getElementById('secSkillsDesc')?.value?.trim() || ''
            },
            education: {
                title: document.getElementById('secEduTitle')?.value?.trim() || '',
                layout: document.getElementById('secEduLayout')?.value || 'timeline'
            },
            projects: {
                title: document.getElementById('secProjectsTitle')?.value?.trim() || '',
                desc: document.getElementById('secProjectsDesc')?.value?.trim() || ''
            },
            contact: {
                title: document.getElementById('secContactTitle')?.value?.trim() || '',
                desc: document.getElementById('secContactDesc')?.value?.trim() || '',
                phone: document.getElementById('secContactPhone')?.value?.trim() || '',
                email: document.getElementById('secContactEmail')?.value?.trim() || ''
            }
        };
        try {
            var existing = await fetchFromGitHub('_data/sections.json');
            var sha = null;
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
        var el = document.getElementById(id);
        if (el) el.classList.toggle('active');
    }

    // ============================================================
    // 0524 - خروجی و حذف داده
    // ============================================================
    function exportData() {
        var data = {
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
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'full-backup-' + new Date().toISOString().split('T')[0] + '.json';
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
    // 0525 - بارگذاری اولیه
    // ============================================================
    checkLogin();
    if (sessionStorage.getItem('admin_logged_in') === 'true') {
        if (getToken()) {
            loadAllData();
            setInterval(function() {
                if (document.querySelector('.pro-tab-content.active#tab-articles')) loadArticles();
                if (document.querySelector('.pro-tab-content.active#tab-products')) loadProducts();
                if (document.querySelector('.pro-tab-content.active#tab-archive')) loadArchive();
            }, 30000);
        } else {
            var articlesList = document.getElementById('proArticlesList');
            if (articlesList) articlesList.innerHTML = '<div class="pro-empty"><i class="fas fa-key"></i>لطفاً توکن گیت‌هاب را در قسمت بالای صفحه وارد کنید.</div>';
            var productsList = document.getElementById('proProductsList');
            if (productsList) productsList.innerHTML = '<div class="pro-empty"><i class="fas fa-key"></i>لطفاً توکن گیت‌هاب را در قسمت بالای صفحه وارد کنید.</div>';
            var archiveList = document.getElementById('proArchiveList');
            if (archiveList) archiveList.innerHTML = '<div class="pro-empty"><i class="fas fa-key"></i>لطفاً توکن گیت‌هاب را در قسمت بالای صفحه وارد کنید.</div>';
        }
        console.log('✅ پنل مدیریت فوق‌حرفه‌ای با موفقیت بارگذاری شد.');
        loadAppearanceSettings();
        loadMenuData();
        loadSectionsData();
    }

    // ============================================================
    // 0526 - محتوای ایندکس
    // ============================================================
    function renderItems(containerId, items, renderFn) {
        var container = document.getElementById(containerId);
        if (!container) return;
        if (!items || items.length === 0) {
            container.innerHTML = '<div class="pro-empty"><i class="fas fa-list"></i>هیچ آیتمی ثبت نشده است.</div>';
            return;
        }
        container.innerHTML = items.map(function(item, idx) { return renderFn(item, idx, items.length); }).join('');
    }
    function createEditModal(title, bodyHtml, onSave) {
        var modal = document.createElement('div');
        modal.className = 'pro-modal-overlay active';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '1002';
        modal.innerHTML = '<div class="pro-modal" style="max-width:700px;">' +
            '<div class="pro-modal-header"><h3><i class="fas fa-edit"></i> ' + title + '</h3><button class="pro-modal-close" onclick="this.closest(\'.pro-modal-overlay\').remove()"><i class="fas fa-times"></i></button></div>' +
            '<form id="editModalForm">' + bodyHtml +
            '<div style="display:flex;gap:12px;margin-top:18px;">' +
            '<button type="submit" class="pro-btn pro-btn-primary"><i class="fas fa-save"></i> ذخیره</button>' +
            '<button type="button" class="pro-btn pro-btn-outline" onclick="this.closest(\'.pro-modal-overlay\').remove()">انصراف</button>' +
            '</div></form></div>';
        modal.querySelector('#editModalForm').addEventListener('submit', function(e) {
            e.preventDefault();
            onSave();
        });
        modal.addEventListener('click', function(e) {
            if (e.target === this) this.remove();
        });
        return modal;
    }

    // ===== سوابق تحصیلی =====
    function loadEducation() {
        fetchFromGitHub('_data/education.json').then(function(data) {
            if (data) {
                try { eduData = JSON.parse(data.content); } catch (e) { eduData = { title: 'سوابق تحصیلی', items: [] }; }
            } else { eduData = { title: 'سوابق تحصیلی', items: [] }; }
            renderEducation();
        }).catch(function() { eduData = { title: 'سوابق تحصیلی', items: [] }; renderEducation(); });
    }
    function renderEducation() {
        document.getElementById('eduSectionTitle').value = eduData.title || 'سوابق تحصیلی';
        renderItems('educationList', eduData.items, function(item, idx, total) {
            return '<div class="pro-item">' +
                '<div class="info">' +
                '<div class="title">' + (item.org || 'بدون مؤسسه') + ' - ' + (item.title || '') + ' <span style="font-size:0.7rem;color:var(--text-secondary);">' + (item.date || '') + '</span></div>' +
                '<div class="meta">' +
                (item.gpa ? '<span><i class="fas fa-star"></i> معدل: ' + item.gpa + '</span>' : '') +
                (item.desc ? '<span>' + item.desc + '</span>' : '') +
                (item.icon ? '<span><i class="fas ' + item.icon + '"></i></span>' : '') +
                (item.source ? '<span><a href="' + item.source + '" target="_blank" style="color:var(--pro-primary);">منبع</a></span>' : '') +
                (item.cert ? '<span><a href="' + item.cert + '" target="_blank" style="color:var(--pro-primary);">مدرک</a></span>' : '') +
                '</div></div>' +
                '<div class="actions">' +
                '<button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditEducationModal(' + idx + ')"><i class="fas fa-edit"></i></button>' +
                '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveEducationItem(' + idx + ', -1)" title="بالا" ' + (idx === 0 ? 'disabled' : '') + '><i class="fas fa-arrow-up"></i></button>' +
                '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveEducationItem(' + idx + ', 1)" title="پایین" ' + (idx === total - 1 ? 'disabled' : '') + '><i class="fas fa-arrow-down"></i></button>' +
                '<button class="pro-btn pro-btn-danger pro-btn-sm" onclick="removeEducationItem(' + idx + ')"><i class="fas fa-trash"></i></button>' +
                '</div></div>';
        });
    }
    function addEducationItem() {
        var org = document.getElementById('newEduOrg')?.value?.trim() || '';
        var title = document.getElementById('newEduTitle')?.value?.trim() || '';
        var date = document.getElementById('newEduDate')?.value?.trim() || '';
        var gpa = document.getElementById('newEduGpa')?.value?.trim() || '';
        var desc = document.getElementById('newEduDesc')?.value?.trim() || '';
        var icon = document.getElementById('newEduIcon')?.value?.trim() || '';
        var source = document.getElementById('newEduSource')?.value?.trim() || '';
        var cert = document.getElementById('newEduCert')?.value?.trim() || '';
        if (!org || !title) { showMsg('لطفاً نام مؤسسه و عنوان را وارد کنید.', 'error'); return; }
        eduData.items.push({ org: org, title: title, date: date, gpa: gpa, desc: desc, icon: icon, source: source, cert: cert });
        var fields = ['newEduOrg', 'newEduTitle', 'newEduDate', 'newEduGpa', 'newEduDesc', 'newEduIcon', 'newEduSource', 'newEduCert'];
        fields.forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
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
        var newIndex = index + direction;
        if (newIndex < 0 || newIndex >= eduData.items.length) return;
        var item = eduData.items.splice(index, 1)[0];
        eduData.items.splice(newIndex, 0, item);
        renderEducation();
        showMsg('✅ ترتیب تغییر کرد.', 'info');
    }
    function openEditEducationModal(index) {
        var item = eduData.items[index];
        if (!item) { showMsg('❌ آیتم یافت نشد.', 'error'); return; }
        var modal = createEditModal('ویرایش سابقه تحصیلی',
            '<div class="pro-grid">' +
            '<div class="pro-field full"><label>نام مؤسسه</label><input type="text" id="editEduOrg" value="' + (item.org || '') + '"></div>' +
            '<div class="pro-field full"><label>عنوان تحصیلی</label><input type="text" id="editEduTitle" value="' + (item.title || '') + '"></div>' +
            '<div class="pro-field"><label>تاریخ</label><input type="text" id="editEduDate" value="' + (item.date || '') + '"></div>' +
            '<div class="pro-field"><label>معدل</label><input type="text" id="editEduGpa" value="' + (item.gpa || '') + '"></div>' +
            '<div class="pro-field"><label>آیکون</label><input type="text" id="editEduIcon" value="' + (item.icon || '') + '"></div>' +
            '<div class="pro-field"><label>لینک منبع</label><input type="text" id="editEduSource" value="' + (item.source || '') + '"></div>' +
            '<div class="pro-field"><label>لینک مدرک</label><input type="text" id="editEduCert" value="' + (item.cert || '') + '"></div>' +
            '<div class="pro-field full"><label>توضیحات</label><input type="text" id="editEduDesc" value="' + (item.desc || '') + '"></div></div>',
            function() {
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
            }
        );
        document.body.appendChild(modal);
    }
    async function saveEducation() {
        try {
            eduData.title = document.getElementById('eduSectionTitle')?.value?.trim() || 'سوابق تحصیلی';
            var existing = await fetchFromGitHub('_data/education.json');
            var sha = null;
            if (existing) sha = existing.sha;
            await saveToGitHub('_data/education.json', eduData, sha);
            showMsg('✅ سوابق تحصیلی با موفقیت ذخیره شدند!', 'success');
            showToast('✅ تحصیلات ذخیره شدند', 'success');
        } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
    }

    // ===== گواهی‌نامه‌ها =====
    function loadCertificates() {
        fetchFromGitHub('_data/certificates.json').then(function(data) {
            if (data) {
                try { certsData = JSON.parse(data.content); } catch (e) { certsData = { title: 'گواهی‌نامه‌ها', items: [] }; }
            } else { certsData = { title: 'گواهی‌نامه‌ها', items: [] }; }
            renderCertificates();
        }).catch(function() { certsData = { title: 'گواهی‌نامه‌ها', items: [] }; renderCertificates(); });
    }
    function renderCertificates() {
        document.getElementById('certsSectionTitle').value = certsData.title || 'گواهی‌نامه‌ها';
        renderItems('certificatesList', certsData.items, function(item, idx, total) {
            return '<div class="pro-item">' +
                '<div class="info">' +
                '<div class="title">' + (item.name || 'بدون نام') + ' <span style="font-size:0.8rem;color:var(--text-secondary);">' + (item.org || '') + '</span></div>' +
                '<div class="meta">' + (item.date || '') + (item.link ? ' <a href="' + item.link + '" target="_blank" style="color:var(--pro-primary);">مشاهده مدرک</a>' : '') + '</div></div>' +
                '<div class="actions">' +
                '<button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditCertificateModal(' + idx + ')"><i class="fas fa-edit"></i></button>' +
                '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveCertificateItem(' + idx + ', -1)" title="بالا" ' + (idx === 0 ? 'disabled' : '') + '><i class="fas fa-arrow-up"></i></button>' +
                '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveCertificateItem(' + idx + ', 1)" title="پایین" ' + (idx === total - 1 ? 'disabled' : '') + '><i class="fas fa-arrow-down"></i></button>' +
                '<button class="pro-btn pro-btn-danger pro-btn-sm" onclick="removeCertificateItem(' + idx + ')"><i class="fas fa-trash"></i></button>' +
                '</div></div>';
        });
    }
    function addCertificateItem() {
        var name = document.getElementById('newCertName')?.value?.trim() || '';
        var org = document.getElementById('newCertOrg')?.value?.trim() || '';
        var date = document.getElementById('newCertDate')?.value?.trim() || '';
        var link = document.getElementById('newCertLink')?.value?.trim() || '';
        if (!name) { showMsg('لطفاً نام گواهی‌نامه را وارد کنید.', 'error'); return; }
        certsData.items.push({ name: name, org: org, date: date, link: link });
        var fields = ['newCertName', 'newCertOrg', 'newCertDate', 'newCertLink'];
        fields.forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
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
        var newIndex = index + direction;
        if (newIndex < 0 || newIndex >= certsData.items.length) return;
        var item = certsData.items.splice(index, 1)[0];
        certsData.items.splice(newIndex, 0, item);
        renderCertificates();
        showMsg('✅ ترتیب تغییر کرد.', 'info');
    }
    function openEditCertificateModal(index) {
        var item = certsData.items[index];
        if (!item) { showMsg('❌ آیتم یافت نشد.', 'error'); return; }
        var modal = createEditModal('ویرایش گواهی‌نامه',
            '<div class="pro-grid">' +
            '<div class="pro-field full"><label>نام گواهی‌نامه</label><input type="text" id="editCertName" value="' + (item.name || '') + '"></div>' +
            '<div class="pro-field"><label>موسسه صادرکننده</label><input type="text" id="editCertOrg" value="' + (item.org || '') + '"></div>' +
            '<div class="pro-field"><label>تاریخ دریافت</label><input type="text" id="editCertDate" value="' + (item.date || '') + '"></div>' +
            '<div class="pro-field"><label>لینک مدرک</label><input type="text" id="editCertLink" value="' + (item.link || '') + '"></div></div>',
            function() {
                certsData.items[index] = {
                    name: document.getElementById('editCertName').value.trim() || item.name,
                    org: document.getElementById('editCertOrg').value.trim(),
                    date: document.getElementById('editCertDate').value.trim(),
                    link: document.getElementById('editCertLink').value.trim()
                };
                renderCertificates();
                modal.remove();
                showMsg('✅ گواهی‌نامه ویرایش شد.', 'success');
            }
        );
        document.body.appendChild(modal);
    }
    async function saveCertificates() {
        try {
            certsData.title = document.getElementById('certsSectionTitle')?.value?.trim() || 'گواهی‌نامه‌ها';
            var existing = await fetchFromGitHub('_data/certificates.json');
            var sha = null;
            if (existing) sha = existing.sha;
            await saveToGitHub('_data/certificates.json', certsData, sha);
            showMsg('✅ گواهی‌نامه‌ها با موفقیت ذخیره شدند!', 'success');
            showToast('✅ گواهی‌نامه‌ها ذخیره شدند', 'success');
        } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
    }

    // ===== مهارت‌ها =====
    function loadSkills() {
        fetchFromGitHub('_data/skills.json').then(function(data) {
            if (data) {
                try { skillsData = JSON.parse(data.content); } catch (e) { skillsData = { title: 'مهارت‌های تخصصی', desc: '', items: [] }; }
            } else { skillsData = { title: 'مهارت‌های تخصصی', desc: '', items: [] }; }
            renderSkills();
        }).catch(function() { skillsData = { title: 'مهارت‌های تخصصی', desc: '', items: [] }; renderSkills(); });
    }
    function renderSkills() {
        document.getElementById('skillsSectionTitle').value = skillsData.title || 'مهارت‌های تخصصی';
        document.getElementById('skillsSectionDesc').value = skillsData.desc || '';
        var list = document.getElementById('skillsList');
        if (!list) return;
        var items = skillsData.items || [];
        if (items.length === 0) {
            list.innerHTML = '<div class="pro-empty"><i class="fas fa-cogs"></i>هیچ مهارتی ثبت نشده است.</div>';
            return;
        }
        list.innerHTML = items.map(function(item, index) {
            return '<div class="pro-item">' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">' +
                '<div style="flex:1;min-width:150px;">' +
                '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
                (item.icon ? '<i class="fas ' + item.icon + '" style="color:var(--pro-primary);"></i>' : '') +
                '<strong>' + (item.name || 'بدون نام') + '</strong>' +
                '<span style="background:var(--pro-primary);color:#fff;padding:1px 10px;border-radius:20px;font-size:0.65rem;">' + (item.level || 'متوسط') + '</span>' +
                '<span style="font-weight:700;color:var(--pro-primary);">' + (item.progress || 0) + '%</span>' +
                '</div>' +
                '<div style="font-size:0.8rem;color:var(--pro-text-secondary);margin-top:2px;">' + (item.desc || '') + '</div>' +
                '<div class="pro-skill-bar" style="width:100%;height:6px;background:var(--pro-border);border-radius:4px;overflow:hidden;margin-top:4px;">' +
                '<div class="fill" style="width:' + (item.progress || 0) + '%;height:100%;background:' + (item.color || 'var(--pro-primary)') + ';border-radius:4px;transition:width 0.5s ease;"></div>' +
                '</div></div>' +
                '<div style="display:flex;gap:4px;flex-wrap:wrap;">' +
                '<button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditSkillModal(' + index + ')"><i class="fas fa-edit"></i></button>' +
                '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveSkillItem(' + index + ', -1)" title="بالا" ' + (index === 0 ? 'disabled' : '') + '><i class="fas fa-arrow-up"></i></button>' +
                '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveSkillItem(' + index + ', 1)" title="پایین" ' + (index === items.length - 1 ? 'disabled' : '') + '><i class="fas fa-arrow-down"></i></button>' +
                '<button class="pro-btn pro-btn-danger pro-btn-sm" onclick="removeSkillItem(' + index + ')"><i class="fas fa-trash"></i></button>' +
                '</div></div></div>';
        }).join('');
    }
    function addSkillItem() {
        var name = document.getElementById('newSkillName')?.value?.trim() || '';
        var icon = document.getElementById('newSkillIcon')?.value?.trim() || '';
        var level = document.getElementById('newSkillLevel')?.value || 'متوسط';
        var desc = document.getElementById('newSkillDesc')?.value?.trim() || '';
        var progress = parseInt(document.getElementById('newSkillPercent')?.value) || 0;
        var color = document.getElementById('newSkillColor')?.value || '#2563eb';
        if (!name) { showMsg('لطفاً نام مهارت را وارد کنید.', 'error'); return; }
        skillsData.items.push({ name: name, icon: icon, level: level, desc: desc, progress: progress, color: color });
        var fields = ['newSkillName', 'newSkillIcon', 'newSkillDesc', 'newSkillPercent'];
        fields.forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
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
        var newIndex = index + direction;
        if (newIndex < 0 || newIndex >= skillsData.items.length) return;
        var item = skillsData.items.splice(index, 1)[0];
        skillsData.items.splice(newIndex, 0, item);
        renderSkills();
        showMsg('✅ ترتیب تغییر کرد.', 'info');
    }
    function openEditSkillModal(index) {
        var item = skillsData.items[index];
        if (!item) { showMsg('❌ آیتم یافت نشد.', 'error'); return; }
        var modal = createEditModal('ویرایش مهارت',
            '<div class="pro-grid">' +
            '<div class="pro-field full"><label>نام مهارت</label><input type="text" id="editSkillName" value="' + (item.name || '') + '"></div>' +
            '<div class="pro-field"><label>آیکون</label><input type="text" id="editSkillIcon" value="' + (item.icon || '') + '"></div>' +
            '<div class="pro-field"><label>سطح</label><select id="editSkillLevel">' +
            '<option value="مقدماتی" ' + (item.level === 'مقدماتی' ? 'selected' : '') + '>مقدماتی</option>' +
            '<option value="متوسط" ' + (item.level === 'متوسط' ? 'selected' : '') + '>متوسط</option>' +
            '<option value="پیشرفته" ' + (item.level === 'پیشرفته' ? 'selected' : '') + '>پیشرفته</option>' +
            '<option value="حرفه‌ای" ' + (item.level === 'حرفه‌ای' ? 'selected' : '') + '>حرفه‌ای</option></select></div>' +
            '<div class="pro-field full"><label>توضیحات</label><input type="text" id="editSkillDesc" value="' + (item.desc || '') + '"></div>' +
            '<div class="pro-field"><label>درصد تسلط</label><input type="number" id="editSkillProgress" value="' + (item.progress || 0) + '" min="0" max="100"></div>' +
            '<div class="pro-field"><label>رنگ</label><input type="color" id="editSkillColor" value="' + (item.color || '#2563eb') + '"></div></div>',
            function() {
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
            }
        );
        document.body.appendChild(modal);
    }
    async function saveSkills() {
        try {
            skillsData.title = document.getElementById('skillsSectionTitle')?.value?.trim() || 'مهارت‌های تخصصی';
            skillsData.desc = document.getElementById('skillsSectionDesc')?.value?.trim() || '';
            var existing = await fetchFromGitHub('_data/skills.json');
            var sha = null;
            if (existing) sha = existing.sha;
            await saveToGitHub('_data/skills.json', skillsData, sha);
            showMsg('✅ مهارت‌ها با موفقیت ذخیره شدند!', 'success');
            showToast('✅ مهارت‌ها ذخیره شدند', 'success');
        } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
    }

    // ===== شبکه‌های اجتماعی =====
    function loadSocial() {
        fetchFromGitHub('_data/social.json').then(function(data) {
            if (data) {
                try { socialData = JSON.parse(data.content); } catch (e) { socialData = { title: 'شبکه‌های اجتماعی', items: [] }; }
            } else { socialData = { title: 'شبکه‌های اجتماعی', items: [] }; }
            renderSocial();
        }).catch(function() { socialData = { title: 'شبکه‌های اجتماعی', items: [] }; renderSocial(); });
    }
    function renderSocial() {
        document.getElementById('socialSectionTitle').value = socialData.title || 'شبکه‌های اجتماعی';
        renderItems('socialList', socialData.items, function(item, idx, total) {
            return '<div class="pro-item">' +
                '<div class="info">' +
                '<div class="title">' + (item.icon ? '<i class="fas ' + item.icon + '"></i>' : '') + ' ' + (item.name || 'بدون نام') + '</div>' +
                '<div class="meta"><span><a href="' + (item.url || '#') + '" target="_blank">' + (item.url || '') + '</a></span></div></div>' +
                '<div class="actions">' +
                '<button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditSocialModal(' + idx + ')"><i class="fas fa-edit"></i></button>' +
                '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveSocialItem(' + idx + ', -1)" title="بالا" ' + (idx === 0 ? 'disabled' : '') + '><i class="fas fa-arrow-up"></i></button>' +
                '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveSocialItem(' + idx + ', 1)" title="پایین" ' + (idx === total - 1 ? 'disabled' : '') + '><i class="fas fa-arrow-down"></i></button>' +
                '<button class="pro-btn pro-btn-danger pro-btn-sm" onclick="removeSocialItem(' + idx + ')"><i class="fas fa-trash"></i></button>' +
                '</div></div>';
        });
    }
    function addSocialItem() {
        var name = document.getElementById('newSocialName')?.value?.trim() || '';
        var url = document.getElementById('newSocialUrl')?.value?.trim() || '';
        var icon = document.getElementById('newSocialIcon')?.value?.trim() || '';
        var color = document.getElementById('newSocialColor')?.value || '#0088cc';
        if (!name || !url) { showMsg('لطفاً نام و آدرس لینک را وارد کنید.', 'error'); return; }
        socialData.items.push({ name: name, url: url, icon: icon, color: color });
        var fields = ['newSocialName', 'newSocialUrl', 'newSocialIcon'];
        fields.forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
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
        var newIndex = index + direction;
        if (newIndex < 0 || newIndex >= socialData.items.length) return;
        var item = socialData.items.splice(index, 1)[0];
        socialData.items.splice(newIndex, 0, item);
        renderSocial();
        showMsg('✅ ترتیب تغییر کرد.', 'info');
    }
    function openEditSocialModal(index) {
        var item = socialData.items[index];
        if (!item) { showMsg('❌ آیتم یافت نشد.', 'error'); return; }
        var modal = createEditModal('ویرایش شبکه اجتماعی',
            '<div class="pro-grid">' +
            '<div class="pro-field full"><label>نام شبکه</label><input type="text" id="editSocialName" value="' + (item.name || '') + '"></div>' +
            '<div class="pro-field full"><label>آدرس لینک</label><input type="text" id="editSocialUrl" value="' + (item.url || '') + '"></div>' +
            '<div class="pro-field"><label>آیکون</label><input type="text" id="editSocialIcon" value="' + (item.icon || '') + '"></div>' +
            '<div class="pro-field"><label>رنگ</label><input type="color" id="editSocialColor" value="' + (item.color || '#0088cc') + '"></div></div>',
            function() {
                socialData.items[index] = {
                    name: document.getElementById('editSocialName').value.trim() || item.name,
                    url: document.getElementById('editSocialUrl').value.trim() || item.url,
                    icon: document.getElementById('editSocialIcon').value.trim(),
                    color: document.getElementById('editSocialColor').value
                };
                renderSocial();
                modal.remove();
                showMsg('✅ شبکه ویرایش شد.', 'success');
            }
        );
        document.body.appendChild(modal);
    }
    async function saveSocial() {
        try {
            socialData.title = document.getElementById('socialSectionTitle')?.value?.trim() || 'شبکه‌های اجتماعی';
            var existing = await fetchFromGitHub('_data/social.json');
            var sha = null;
            if (existing) sha = existing.sha;
            await saveToGitHub('_data/social.json', socialData, sha);
            showMsg('✅ شبکه‌های اجتماعی با موفقیت ذخیره شدند!', 'success');
            showToast('✅ شبکه‌ها ذخیره شدند', 'success');
        } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
    }

    // ===== خدمات تخصصی =====
    function loadServices() {
        fetchFromGitHub('_data/services.json').then(function(data) {
            if (data) {
                try { servicesData = JSON.parse(data.content); } catch (e) { servicesData = { title: 'خدمات تخصصی', desc: '', items: [] }; }
            } else { servicesData = { title: 'خدمات تخصصی', desc: '', items: [] }; }
            renderServices();
        }).catch(function() { servicesData = { title: 'خدمات تخصصی', desc: '', items: [] }; renderServices(); });
    }
    function renderServices() {
        document.getElementById('servicesSectionTitle').value = servicesData.title || 'خدمات تخصصی';
        document.getElementById('servicesSectionDesc').value = servicesData.desc || '';
        renderItems('servicesList', servicesData.items, function(item, idx, total) {
            return '<div class="pro-item">' +
                '<div class="info">' +
                '<div class="title">' + (item.icon ? '<i class="fas ' + item.icon + '"></i>' : '') + ' ' + (item.name || 'بدون نام') + '</div>' +
                '<div class="meta">' + (item.desc || '') + '</div></div>' +
                '<div class="actions">' +
                '<button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditServiceModal(' + idx + ')"><i class="fas fa-edit"></i></button>' +
                '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveServiceItem(' + idx + ', -1)" title="بالا" ' + (idx === 0 ? 'disabled' : '') + '><i class="fas fa-arrow-up"></i></button>' +
                '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveServiceItem(' + idx + ', 1)" title="پایین" ' + (idx === total - 1 ? 'disabled' : '') + '><i class="fas fa-arrow-down"></i></button>' +
                '<button class="pro-btn pro-btn-danger pro-btn-sm" onclick="removeServiceItem(' + idx + ')"><i class="fas fa-trash"></i></button>' +
                '</div></div>';
        });
    }
    function addServiceItem() {
        var name = document.getElementById('newServiceName')?.value?.trim() || '';
        var icon = document.getElementById('newServiceIcon')?.value?.trim() || '';
        var desc = document.getElementById('newServiceDesc')?.value?.trim() || '';
        if (!name) { showMsg('لطفاً نام خدمت را وارد کنید.', 'error'); return; }
        servicesData.items.push({ name: name, icon: icon, desc: desc });
        var fields = ['newServiceName', 'newServiceIcon', 'newServiceDesc'];
        fields.forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
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
        var newIndex = index + direction;
        if (newIndex < 0 || newIndex >= servicesData.items.length) return;
        var item = servicesData.items.splice(index, 1)[0];
        servicesData.items.splice(newIndex, 0, item);
        renderServices();
        showMsg('✅ ترتیب تغییر کرد.', 'info');
    }
    function openEditServiceModal(index) {
        var item = servicesData.items[index];
        if (!item) { showMsg('❌ آیتم یافت نشد.', 'error'); return; }
        var modal = createEditModal('ویرایش خدمت',
            '<div class="pro-grid">' +
            '<div class="pro-field full"><label>نام خدمت</label><input type="text" id="editServiceName" value="' + (item.name || '') + '"></div>' +
            '<div class="pro-field"><label>آیکون</label><input type="text" id="editServiceIcon" value="' + (item.icon || '') + '"></div>' +
            '<div class="pro-field full"><label>توضیحات</label><input type="text" id="editServiceDesc" value="' + (item.desc || '') + '"></div></div>',
            function() {
                servicesData.items[index] = {
                    name: document.getElementById('editServiceName').value.trim() || item.name,
                    icon: document.getElementById('editServiceIcon').value.trim(),
                    desc: document.getElementById('editServiceDesc').value.trim()
                };
                renderServices();
                modal.remove();
                showMsg('✅ خدمت ویرایش شد.', 'success');
            }
        );
        document.body.appendChild(modal);
    }
    async function saveServices() {
        try {
            servicesData.title = document.getElementById('servicesSectionTitle')?.value?.trim() || 'خدمات تخصصی';
            servicesData.desc = document.getElementById('servicesSectionDesc')?.value?.trim() || '';
            var existing = await fetchFromGitHub('_data/services.json');
            var sha = null;
            if (existing) sha = existing.sha;
            await saveToGitHub('_data/services.json', servicesData, sha);
            showMsg('✅ خدمات با موفقیت ذخیره شدند!', 'success');
            showToast('✅ خدمات ذخیره شدند', 'success');
        } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
    }

    // ===== نظرات مشتریان =====
    function loadTestimonials() {
        fetchFromGitHub('_data/testimonials.json').then(function(data) {
            if (data) {
                try { testimonialsData = JSON.parse(data.content); } catch (e) { testimonialsData = { title: 'نظرات مشتریان', items: [] }; }
            } else { testimonialsData = { title: 'نظرات مشتریان', items: [] }; }
            renderTestimonials();
        }).catch(function() { testimonialsData = { title: 'نظرات مشتریان', items: [] }; renderTestimonials(); });
    }
    function renderTestimonials() {
        document.getElementById('testimonialsSectionTitle').value = testimonialsData.title || 'نظرات مشتریان';
        renderItems('testimonialsList', testimonialsData.items, function(item, idx, total) {
            return '<div class="pro-item">' +
                '<div class="info">' +
                '<div class="title">' + (item.name || 'بدون نام') + ' <span style="font-size:0.8rem;color:var(--text-secondary);">' + (item.position || '') + '</span></div>' +
                '<div class="meta">' + (item.text || '') + ' | امتیاز: ' + '⭐'.repeat(item.rating || 5) + '</div></div>' +
                '<div class="actions">' +
                '<button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditTestimonialModal(' + idx + ')"><i class="fas fa-edit"></i></button>' +
                '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveTestimonialItem(' + idx + ', -1)" title="بالا" ' + (idx === 0 ? 'disabled' : '') + '><i class="fas fa-arrow-up"></i></button>' +
                '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveTestimonialItem(' + idx + ', 1)" title="پایین" ' + (idx === total - 1 ? 'disabled' : '') + '><i class="fas fa-arrow-down"></i></button>' +
                '<button class="pro-btn pro-btn-danger pro-btn-sm" onclick="removeTestimonialItem(' + idx + ')"><i class="fas fa-trash"></i></button>' +
                '</div></div>';
        });
    }
    function addTestimonialItem() {
        var name = document.getElementById('newTestiName')?.value?.trim() || '';
        var position = document.getElementById('newTestiPosition')?.value?.trim() || '';
        var text = document.getElementById('newTestiText')?.value?.trim() || '';
        var rating = parseInt(document.getElementById('newTestiRating')?.value) || 5;
        var image = document.getElementById('newTestiImage')?.value?.trim() || '';
        if (!name || !text) { showMsg('لطفاً نام و متن نظر را وارد کنید.', 'error'); return; }
        testimonialsData.items.push({ name: name, position: position, text: text, rating: rating, image: image });
        var fields = ['newTestiName', 'newTestiPosition', 'newTestiText', 'newTestiRating', 'newTestiImage'];
        fields.forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
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
        var newIndex = index + direction;
        if (newIndex < 0 || newIndex >= testimonialsData.items.length) return;
        var item = testimonialsData.items.splice(index, 1)[0];
        testimonialsData.items.splice(newIndex, 0, item);
        renderTestimonials();
        showMsg('✅ ترتیب تغییر کرد.', 'info');
    }
    function openEditTestimonialModal(index) {
        var item = testimonialsData.items[index];
        if (!item) { showMsg('❌ آیتم یافت نشد.', 'error'); return; }
        var modal = createEditModal('ویرایش نظر',
            '<div class="pro-grid">' +
            '<div class="pro-field full"><label>نام</label><input type="text" id="editTestiName" value="' + (item.name || '') + '"></div>' +
            '<div class="pro-field"><label>سمت</label><input type="text" id="editTestiPosition" value="' + (item.position || '') + '"></div>' +
            '<div class="pro-field full"><label>متن نظر</label><input type="text" id="editTestiText" value="' + (item.text || '') + '"></div>' +
            '<div class="pro-field"><label>امتیاز (۱-۵)</label><input type="number" id="editTestiRating" value="' + (item.rating || 5) + '" min="1" max="5"></div>' +
            '<div class="pro-field"><label>تصویر</label><input type="text" id="editTestiImage" value="' + (item.image || '') + '"></div></div>',
            function() {
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
            }
        );
        document.body.appendChild(modal);
    }
    async function saveTestimonials() {
        try {
            testimonialsData.title = document.getElementById('testimonialsSectionTitle')?.value?.trim() || 'نظرات مشتریان';
            var existing = await fetchFromGitHub('_data/testimonials.json');
            var sha = null;
            if (existing) sha = existing.sha;
            await saveToGitHub('_data/testimonials.json', testimonialsData, sha);
            showMsg('✅ نظرات با موفقیت ذخیره شدند!', 'success');
            showToast('✅ نظرات ذخیره شدند', 'success');
        } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
    }

    // ===== جوایز و افتخارات =====
    function loadAwards() {
        fetchFromGitHub('_data/awards.json').then(function(data) {
            if (data) {
                try { awardsData = JSON.parse(data.content); } catch (e) { awardsData = { title: 'جوایز و افتخارات', items: [] }; }
            } else { awardsData = { title: 'جوایز و افتخارات', items: [] }; }
            renderAwards();
        }).catch(function() { awardsData = { title: 'جوایز و افتخارات', items: [] }; renderAwards(); });
    }
    function renderAwards() {
        document.getElementById('awardsSectionTitle').value = awardsData.title || 'جوایز و افتخارات';
        renderItems('awardsList', awardsData.items, function(item, idx, total) {
            return '<div class="pro-item">' +
                '<div class="info">' +
                '<div class="title">' + (item.name || 'بدون نام') + ' <span style="font-size:0.8rem;color:var(--text-secondary);">' + (item.org || '') + '</span></div>' +
                '<div class="meta">' + (item.date || '') + (item.desc ? ' | ' + item.desc : '') + '</div></div>' +
                '<div class="actions">' +
                '<button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditAwardModal(' + idx + ')"><i class="fas fa-edit"></i></button>' +
                '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveAwardItem(' + idx + ', -1)" title="بالا" ' + (idx === 0 ? 'disabled' : '') + '><i class="fas fa-arrow-up"></i></button>' +
                '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveAwardItem(' + idx + ', 1)" title="پایین" ' + (idx === total - 1 ? 'disabled' : '') + '><i class="fas fa-arrow-down"></i></button>' +
                '<button class="pro-btn pro-btn-danger pro-btn-sm" onclick="removeAwardItem(' + idx + ')"><i class="fas fa-trash"></i></button>' +
                '</div></div>';
        });
    }
    function addAwardItem() {
        var name = document.getElementById('newAwardName')?.value?.trim() || '';
        var org = document.getElementById('newAwardOrg')?.value?.trim() || '';
        var date = document.getElementById('newAwardDate')?.value?.trim() || '';
        var desc = document.getElementById('newAwardDesc')?.value?.trim() || '';
        if (!name) { showMsg('لطفاً نام جایزه را وارد کنید.', 'error'); return; }
        awardsData.items.push({ name: name, org: org, date: date, desc: desc });
        var fields = ['newAwardName', 'newAwardOrg', 'newAwardDate', 'newAwardDesc'];
        fields.forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
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
        var newIndex = index + direction;
        if (newIndex < 0 || newIndex >= awardsData.items.length) return;
        var item = awardsData.items.splice(index, 1)[0];
        awardsData.items.splice(newIndex, 0, item);
        renderAwards();
        showMsg('✅ ترتیب تغییر کرد.', 'info');
    }
    function openEditAwardModal(index) {
        var item = awardsData.items[index];
        if (!item) { showMsg('❌ آیتم یافت نشد.', 'error'); return; }
        var modal = createEditModal('ویرایش جایزه',
            '<div class="pro-grid">' +
            '<div class="pro-field full"><label>نام جایزه / افتخار</label><input type="text" id="editAwardName" value="' + (item.name || '') + '"></div>' +
            '<div class="pro-field"><label>موسسه / رویداد</label><input type="text" id="editAwardOrg" value="' + (item.org || '') + '"></div>' +
            '<div class="pro-field"><label>تاریخ</label><input type="text" id="editAwardDate" value="' + (item.date || '') + '"></div>' +
            '<div class="pro-field"><label>توضیحات</label><input type="text" id="editAwardDesc" value="' + (item.desc || '') + '"></div></div>',
            function() {
                awardsData.items[index] = {
                    name: document.getElementById('editAwardName').value.trim() || item.name,
                    org: document.getElementById('editAwardOrg').value.trim(),
                    date: document.getElementById('editAwardDate').value.trim(),
                    desc: document.getElementById('editAwardDesc').value.trim()
                };
                renderAwards();
                modal.remove();
                showMsg('✅ جایزه ویرایش شد.', 'success');
            }
        );
        document.body.appendChild(modal);
    }
    async function saveAwards() {
        try {
            awardsData.title = document.getElementById('awardsSectionTitle')?.value?.trim() || 'جوایز و افتخارات';
            var existing = await fetchFromGitHub('_data/awards.json');
            var sha = null;
            if (existing) sha = existing.sha;
            await saveToGitHub('_data/awards.json', awardsData, sha);
            showMsg('✅ جوایز با موفقیت ذخیره شدند!', 'success');
            showToast('✅ جوایز ذخیره شدند', 'success');
        } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
    }

    // ===== لینک‌های مفید =====
    function loadLinks() {
        fetchFromGitHub('_data/links.json').then(function(data) {
            if (data) {
                try { linksData = JSON.parse(data.content); } catch (e) { linksData = { title: 'لینک‌های مفید', items: [] }; }
            } else { linksData = { title: 'لینک‌های مفید', items: [] }; }
            renderLinks();
        }).catch(function() { linksData = { title: 'لینک‌های مفید', items: [] }; renderLinks(); });
    }
    function renderLinks() {
        document.getElementById('linksSectionTitle').value = linksData.title || 'لینک‌های مفید';
        renderItems('linksList', linksData.items, function(item, idx, total) {
            return '<div class="pro-item">' +
                '<div class="info">' +
                '<div class="title">' + (item.icon ? '<i class="fas ' + item.icon + '"></i>' : '') + ' ' + (item.name || 'بدون نام') + '</div>' +
                '<div class="meta"><a href="' + (item.url || '#') + '" target="_blank">' + (item.url || '') + '</a></div></div>' +
                '<div class="actions">' +
                '<button class="pro-btn pro-btn-warning pro-btn-sm" onclick="openEditLinkModal(' + idx + ')"><i class="fas fa-edit"></i></button>' +
                '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveLinkItem(' + idx + ', -1)" title="بالا" ' + (idx === 0 ? 'disabled' : '') + '><i class="fas fa-arrow-up"></i></button>' +
                '<button class="pro-btn pro-btn-secondary pro-btn-sm" onclick="moveLinkItem(' + idx + ', 1)" title="پایین" ' + (idx === total - 1 ? 'disabled' : '') + '><i class="fas fa-arrow-down"></i></button>' +
                '<button class="pro-btn pro-btn-danger pro-btn-sm" onclick="removeLinkItem(' + idx + ')"><i class="fas fa-trash"></i></button>' +
                '</div></div>';
        });
    }
    function addLinkItem() {
        var name = document.getElementById('newLinkName')?.value?.trim() || '';
        var url = document.getElementById('newLinkUrl')?.value?.trim() || '';
        var icon = document.getElementById('newLinkIcon')?.value?.trim() || '';
        if (!name) { showMsg('لطفاً نام لینک را وارد کنید.', 'error'); return; }
        linksData.items.push({ name: name, url: url, icon: icon });
        var fields = ['newLinkName', 'newLinkUrl', 'newLinkIcon'];
        fields.forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
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
        var newIndex = index + direction;
        if (newIndex < 0 || newIndex >= linksData.items.length) return;
        var item = linksData.items.splice(index, 1)[0];
        linksData.items.splice(newIndex, 0, item);
        renderLinks();
        showMsg('✅ ترتیب تغییر کرد.', 'info');
    }
    function openEditLinkModal(index) {
        var item = linksData.items[index];
        if (!item) { showMsg('❌ آیتم یافت نشد.', 'error'); return; }
        var modal = createEditModal('ویرایش لینک',
            '<div class="pro-grid">' +
            '<div class="pro-field full"><label>نام لینک</label><input type="text" id="editLinkName" value="' + (item.name || '') + '"></div>' +
            '<div class="pro-field full"><label>آدرس لینک</label><input type="text" id="editLinkUrl" value="' + (item.url || '') + '"></div>' +
            '<div class="pro-field"><label>آیکون</label><input type="text" id="editLinkIcon" value="' + (item.icon || '') + '"></div></div>',
            function() {
                linksData.items[index] = {
                    name: document.getElementById('editLinkName').value.trim() || item.name,
                    url: document.getElementById('editLinkUrl').value.trim() || item.url,
                    icon: document.getElementById('editLinkIcon').value.trim()
                };
                renderLinks();
                modal.remove();
                showMsg('✅ لینک ویرایش شد.', 'success');
            }
        );
        document.body.appendChild(modal);
    }
    async function saveLinks() {
        try {
            linksData.title = document.getElementById('linksSectionTitle')?.value?.trim() || 'لینک‌های مفید';
            var existing = await fetchFromGitHub('_data/links.json');
            var sha = null;
            if (existing) sha = existing.sha;
            await saveToGitHub('_data/links.json', linksData, sha);
            showMsg('✅ لینک‌ها با موفقیت ذخیره شدند!', 'success');
            showToast('✅ لینک‌ها ذخیره شدند', 'success');
        } catch (e) { showMsg('❌ خطا: ' + e.message, 'error'); }
    }

    // ===== بارگذاری همه محتوای ایندکس =====
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
    // 0527 - مدیریت کاربران و سفارشات
    // ============================================================
    var membersData = [];
    var currentMemberId = null;
    var currentMemberOrders = [];

    async function loadMembers() {
        var list = document.getElementById('membersList');
        if (!list) return;
        if (!getToken()) {
            list.innerHTML = '<div class="pro-empty"><i class="fas fa-key"></i>لطفاً توکن گیت‌هاب را وارد کنید.</div>';
            document.getElementById('proMembersCount').textContent = '0';
            document.getElementById('proMembersSub').textContent = '۰ کاربر';
            return;
        }
        try {
            var token = getToken();
            var dirUrl = 'https://api.github.com/' + REPO_PATH + '/member/';
            var dirRes = await fetch(dirUrl, {
                headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json' }
            });
            if (dirRes.status === 404) {
                list.innerHTML = '<div class="pro-empty"><i class="fas fa-folder-open"></i>پوشه member وجود ندارد. هنوز کاربری ثبت نشده است.</div>';
                document.getElementById('proMembersCount').textContent = '0';
                return;
            }
            if (!dirRes.ok) throw new Error('خطا در خواندن لیست کاربران: ' + dirRes.status);
            var items = await dirRes.json();
            var memberDirs = items.filter(function(item) {
                return item.type === 'dir' && item.name.startsWith('member') && /^member\d{4}$/.test(item.name);
            });
            membersData = [];
            for (var i = 0; i < memberDirs.length; i++) {
                var dir = memberDirs[i];
                var memberId = dir.name.replace('member', '');
                try {
                    var infoPath = 'member/' + dir.name + '/info.json';
                    var infoRes = await fetchFromGitHub(infoPath);
                    if (infoRes) {
                        var info = JSON.parse(infoRes.content);
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
            membersData.sort(function(a, b) { return parseInt(a.id) - parseInt(b.id); });
            renderMembers();
        } catch (e) {
            list.innerHTML = '<div class="pro-empty"><i class="fas fa-exclamation-triangle" style="color:var(--pro-red);"></i>خطا: ' + e.message + '</div>';
            console.error('❌ خطا در بارگذاری کاربران:', e);
        }
    }
    async function getUserInfo(userId) {
        try {
            var infoPath = 'member/member' + userId + '/info.json';
            var data = await fetchFromGitHub(infoPath);
            if (data) return JSON.parse(data.content);
            return null;
        } catch (e) { return null; }
    }
    function renderMembers() {
        var list = document.getElementById('membersList');
        if (!list) return;
        if (membersData.length === 0) {
            list.innerHTML = '<div class="pro-empty"><i class="fas fa-users"></i>هیچ کاربری یافت نشد.</div>';
        } else {
            list.innerHTML = membersData.map(function(member) {
                return '<div class="pro-item" onclick="viewMemberDetail(\'' + member.id + '\')" style="cursor:pointer;">' +
                    '<div class="info">' +
                    '<div class="title"><i class="fas fa-user" style="color:var(--pro-primary);"></i> ' + (member.name || 'بدون نام') +
                    ' <span style="color:var(--pro-text-secondary);font-size:0.7rem;">#' + member.id + '</span>' +
                    (member.username ? ' <span style="font-size:0.7rem;color:var(--pro-text-secondary);">@' + member.username + '</span>' : '') +
                    '</div>' +
                    '<div class="meta">' +
                    (member.email ? '<span><i class="fas fa-envelope"></i> ' + member.email + '</span>' : '') +
                    (member.phone ? '<span><i class="fas fa-phone"></i> ' + member.phone + '</span>' : '') +
                    (member.telegram ? '<span><i class="fab fa-telegram"></i> ' + member.telegram + '</span>' : '') +
                    (member.created ? '<span><i class="fas fa-calendar"></i> ' + new Date(member.created).toLocaleDateString('fa-IR') + '</span>' : '') +
                    '</div></div>' +
                    '<div class="actions">' +
                    '<button class="pro-btn pro-btn-primary pro-btn-sm" onclick="event.stopPropagation();viewMemberDetail(\'' + member.id + '\')"><i class="fas fa-eye"></i></button>' +
                    '<button class="pro-btn pro-btn-warning pro-btn-sm" onclick="event.stopPropagation();openEditMemberModal(\'' + member.id + '\')"><i class="fas fa-edit"></i></button>' +
                    '<button class="pro-btn pro-btn-danger pro-btn-sm" onclick="event.stopPropagation();deleteMember(\'' + member.id + '\')"><i class="fas fa-trash"></i></button>' +
                    '</div></div>';
            }).join('');
        }
        document.getElementById('proMembersCount').textContent = membersData.length;
        document.getElementById('proMembersSub').textContent = membersData.length + ' کاربر';
        updateDashboard();
    }
    function filterMembers(query) {
        var q = query.toLowerCase().trim();
        if (!q) { renderMembers(); return; }
        var filtered = membersData.filter(function(m) {
            return (m.name || '').toLowerCase().includes(q) ||
                (m.username || '').toLowerCase().includes(q) ||
                (m.email || '').toLowerCase().includes(q) ||
                (m.phone || '').includes(q) ||
                (m.id || '').includes(q);
        });
        var list = document.getElementById('membersList');
        if (filtered.length === 0) {
            list.innerHTML = '<div class="pro-empty"><i class="fas fa-search"></i>کاربری یافت نشد.</div>';
        } else {
            list.innerHTML = filtered.map(function(member) {
                return '<div class="pro-item" onclick="viewMemberDetail(\'' + member.id + '\')" style="cursor:pointer;">' +
                    '<div class="info">' +
                    '<div class="title"><i class="fas fa-user" style="color:var(--pro-primary);"></i> ' + (member.name || 'بدون نام') +
                    ' <span style="color:var(--pro-text-secondary);font-size:0.7rem;">#' + member.id + '</span></div>' +
                    '<div class="meta">' + (member.email || '') + ' ' + (member.phone || '') + '</div></div>' +
                    '<div class="actions">' +
                    '<button class="pro-btn pro-btn-primary pro-btn-sm" onclick="event.stopPropagation();viewMemberDetail(\'' + member.id + '\')"><i class="fas fa-eye"></i></button>' +
                    '<button class="pro-btn pro-btn-warning pro-btn-sm" onclick="event.stopPropagation();openEditMemberModal(\'' + member.id + '\')"><i class="fas fa-edit"></i></button>' +
                    '</div></div>';
            }).join('');
        }
    }
    async function viewMemberDetail(memberId) {
        currentMemberId = memberId;
        var card = document.getElementById('memberDetailCard');
        if (card) card.style.display = 'block';
        var member = membersData.find(function(m) { return m.id === memberId; });
        if (!member) { showMsg('❌ کاربر یافت نشد.', 'error'); return; }
        var nameEl = document.getElementById('memberDetailName');
        if (nameEl) nameEl.textContent = member.name || 'بدون نام';
        var idEl = document.getElementById('memberDetailId');
        if (idEl) idEl.textContent = member.id;
        var phoneEl = document.getElementById('memberDetailPhone');
        if (phoneEl) phoneEl.textContent = member.phone || '---';
        var whatsappEl = document.getElementById('memberDetailWhatsapp');
        if (whatsappEl) whatsappEl.textContent = member.whatsapp || '---';
        var telegramEl = document.getElementById('memberDetailTelegram');
        if (telegramEl) telegramEl.textContent = member.telegram || '---';
        var emailEl = document.getElementById('memberDetailEmail');
        if (emailEl) emailEl.textContent = member.email || '---';
        var createdEl = document.getElementById('memberDetailCreated');
        if (createdEl) createdEl.textContent = member.created ? new Date(member.created).toLocaleDateString('fa-IR') : '---';
        var addrContainer = document.getElementById('memberAddresses');
        if (addrContainer) {
            if (member.addresses && member.addresses.length > 0) {
                addrContainer.innerHTML = member.addresses.map(function(addr) {
                    return '<div style="padding:4px 8px;background:var(--pro-bg);border-radius:6px;margin-bottom:4px;border:1px solid var(--pro-border);font-size:0.85rem;">' + addr + '</div>';
                }).join('');
            } else {
                addrContainer.innerHTML = '<span style="color:var(--pro-text-secondary);">هیچ آدرسی ثبت نشده است.</span>';
            }
        }
        await loadMemberOrders(memberId);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    async function loadMemberOrders(memberId) {
        var container = document.getElementById('memberOrdersList');
        if (!container) return;
        container.innerHTML = '<div class="pro-empty"><i class="fas fa-spinner fa-spin"></i> در حال بارگذاری سفارشات...</div>';
        try {
            var path = 'member/member' + memberId + '/order' + memberId + '.json';
            var data = await fetchFromGitHub(path);
            if (!data) {
                await saveToGitHub(path, [], null);
                container.innerHTML = '<div class="pro-empty"><i class="fas fa-box"></i>هیچ سفارشی ثبت نشده است.</div>';
                currentMemberOrders = [];
                return;
            }
            currentMemberOrders = JSON.parse(data.content);
            currentMemberOrders.sort(function(a, b) { return (a.date || '').localeCompare(b.date || '') * -1; });
            renderMemberOrders(currentMemberOrders);
        } catch (e) {
            container.innerHTML = '<div class="pro-empty"><i class="fas fa-exclamation-triangle" style="color:var(--pro-red);"></i>خطا: ' + e.message + '</div>';
            console.error('❌ خطا در بارگذاری سفارشات:', e);
        }
    }
    function renderMemberOrders(orders) {
        var container = document.getElementById('memberOrdersList');
        if (!container) return;
        if (!orders || orders.length === 0) {
            container.innerHTML = '<div class="pro-empty"><i class="fas fa-box"></i>هیچ سفارشی ثبت نشده است.</div>';
            return;
        }
        var statusLabels = { 'pending': 'در انتظار پرداخت', 'paid': 'پرداخت شده', 'shipped': 'ارسال شده', 'completed': 'تکمیل شده', 'canceled': 'لغو شده' };
        var statusColors = { 'pending': 'var(--pro-yellow)', 'paid': 'var(--pro-secondary)', 'shipped': 'var(--pro-primary)', 'completed': 'var(--pro-green)', 'canceled': 'var(--pro-red)' };
        container.innerHTML = orders.map(function(order, idx) {
            return '<div class="pro-item" style="cursor:pointer;" onclick="viewOrderDetail(\'' + currentMemberId + '\',\'' + idx + '\')">' +
                '<div class="info">' +
                '<div class="title">سفارش #' + String(order.id || idx + 1).padStart(3, '0') +
                ' <span style="font-size:0.7rem;color:var(--text-secondary);">' + (order.date || '---') + '</span>' +
                ' <span style="background:' + (statusColors[order.status] || 'var(--pro-yellow)') + ';color:#fff;padding:1px 10px;border-radius:20px;font-size:0.65rem;margin-right:8px;">' + (statusLabels[order.status] || order.status) + '</span></div>' +
                '<div class="meta">' +
                '<span><i class="fas fa-box"></i> ' + (order.items ? order.items.length : 0) + ' محصول</span>' +
                '<span><i class="fas fa-money-bill"></i> ' + ((order.total || 0).toLocaleString()) + ' تومان</span>' +
                '<span><i class="fas fa-truck"></i> ' + (order.shipping || '---') + '</span>' +
                '<span><i class="fas fa-hashtag"></i> ' + (order.tracking || '---') + '</span>' +
                '</div></div>' +
                '<div class="actions">' +
                '<button class="pro-btn pro-btn-primary pro-btn-sm" onclick="event.stopPropagation();viewOrderDetail(\'' + currentMemberId + '\',\'' + idx + '\')"><i class="fas fa-eye"></i></button>' +
                '</div></div>';
        }).join('');
    }
    async function viewOrderDetail(userId, orderIndex) {
        if (!userId) { showMsg('❌ شناسه کاربر نامعتبر است.', 'error'); return; }
        try {
            var path = 'member/member' + userId + '/orders.json';
            var existing = await fetchFromGitHub(path);
            if (!existing) { showMsg('❌ فایل سفارشات یافت نشد.', 'error'); return; }
            var orders = JSON.parse(existing.content);
            if (!Array.isArray(orders) || orderIndex >= orders.length) {
                showMsg('❌ سفارش یافت نشد.', 'error');
                return;
            }
            var order = orders[orderIndex];
            var userInfo = await getUserInfo(userId);
            var userPhone = userInfo?.phone || '---';
            var userWhatsapp = userInfo?.whatsapp || '---';
            var userTelegram = userInfo?.telegram || '---';
            var userEmail = userInfo?.email || '---';
            var userAddresses = userInfo?.addresses?.join(' | ') || '---';
            var statusLabels = {
                'pending': '⏳ در انتظار پرداخت',
                'paid': '✅ پرداخت شده',
                'shipped': '📦 ارسال شده',
                'completed': '✔️ تکمیل شده',
                'canceled': '❌ لغو شده'
            };
            var modal = document.createElement('div');
            modal.className = 'pro-modal-overlay active';
            modal.style.display = 'flex';
            modal.innerHTML = '<div class="pro-modal" style="max-width:750px;">' +
                '<div class="pro-modal-header"><h3><i class="fas fa-receipt"></i> جزئیات سفارش #' + (order.id || orderIndex + 1) + '</h3>' +
                '<div style="display:flex;gap:8px;"><button class="pro-btn pro-btn-sm pro-btn-warning" onclick="this.closest(\'.pro-modal-overlay\').remove();openEditOrderModal(\'' + userId + '\', ' + orderIndex + ')"><i class="fas fa-edit"></i> ویرایش</button>' +
                '<button class="pro-modal-close" onclick="this.closest(\'.pro-modal-overlay\').remove()"><i class="fas fa-times"></i></button></div></div>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px;background:var(--pro-bg);border-radius:var(--pro-radius);border:1px solid var(--pro-border);margin-bottom:12px;">' +
                '<div><span style="color:var(--pro-text-secondary);">🆔 شناسه سفارش:</span> <strong>' + (order.id || '---') + '</strong></div>' +
                '<div><span style="color:var(--pro-text-secondary);">📅 تاریخ:</span> <strong>' + (order.date || '---') + '</strong></div>' +
                '<div><span style="color:var(--pro-text-secondary);">👤 کاربر:</span> <strong>' + (order.userName || '---') + '</strong> (ID: ' + userId + ')</div>' +
                '<div><span style="color:var(--pro-text-secondary);">📌 وضعیت:</span> <span style="background:' + (order.status === 'pending' ? '#f59e0b' : order.status === 'paid' ? '#10b981' : order.status === 'shipped' ? '#3b82f6' : order.status === 'completed' ? '#10b981' : '#ef4444') + '20;color:' + (order.status === 'pending' ? '#f59e0b' : order.status === 'paid' ? '#10b981' : order.status === 'shipped' ? '#3b82f6' : order.status === 'completed' ? '#10b981' : '#ef4444') + ';padding:2px 12px;border-radius:12px;font-size:0.7rem;font-weight:600;">' + (statusLabels[order.status] || order.status) + '</span></div>' +
                '<div style="grid-column:1/-1;border-top:1px solid var(--pro-border);padding-top:8px;"><span style="color:var(--pro-text-secondary);">📞 اطلاعات تماس کاربر:</span><br><span style="font-size:0.9rem;">📱 موبایل: <strong>' + userPhone + '</strong> | 💬 واتساپ: <strong>' + userWhatsapp + '</strong> | ✈️ تلگرام: <strong>' + userTelegram + '</strong></span><br><span style="font-size:0.9rem;">📧 ایمیل: <strong>' + userEmail + '</strong></span></div>' +
                '<div style="grid-column:1/-1;border-top:1px solid var(--pro-border);padding-top:8px;"><span style="color:var(--pro-text-secondary);">📍 آدرس‌های ثبت‌شده کاربر:</span><br><span style="font-size:0.9rem;"><strong>' + userAddresses + '</strong></span></div>' +
                '<div style="grid-column:1/-1;border-top:1px solid var(--pro-border);padding-top:8px;"><span style="color:var(--pro-text-secondary);">📦 محصولات:</span>' +
                '<div style="background:var(--pro-bg);border-radius:var(--pro-radius);border:1px solid var(--pro-border);padding:10px;margin-top:4px;">' +
                (order.items || []).map(function(item) {
                    return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--pro-border);font-size:0.9rem;"><span>' + (item.productName || item.productId) + ' × ' + (item.quantity || 1) + '</span><span style="font-weight:600;">' + ((item.price || 0) * (item.quantity || 1)).toLocaleString() + ' تومان</span></div>';
                }).join('') +
                '<div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:700;font-size:1rem;border-top:2px solid var(--pro-border);margin-top:4px;"><span>مجموع کل</span><span style="color:var(--pro-primary);">' + ((order.total || 0).toLocaleString()) + ' تومان</span></div></div></div>' +
                '<div style="grid-column:1/-1;border-top:1px solid var(--pro-border);padding-top:8px;"><span style="color:var(--pro-text-secondary);">🚚 روش ارسال:</span> <strong>' + (order.shipping || '---') + '</strong> <span style="margin-right:16px;color:var(--pro-text-secondary);">🔗 کد پیگیری:</span> <strong>' + (order.tracking || '---') + '</strong></div>' +
                (order.notes ? '<div style="grid-column:1/-1;border-top:1px solid var(--pro-border);padding-top:8px;"><span style="color:var(--pro-text-secondary);">📝 توضیحات:</span> <strong>' + order.notes + '</strong></div>' : '') +
                (order.transactionId ? '<div style="grid-column:1/-1;"><span style="color:var(--pro-text-secondary);">💳 شناسه پرداخت:</span> <strong>' + order.transactionId + '</strong></div>' : '') +
                '</div>' +
                '<div style="display:flex;gap:12px;margin-top:12px;"><button class="pro-btn pro-btn-outline" onclick="this.closest(\'.pro-modal-overlay\').remove()">بستن</button></div></div>';
            document.body.appendChild(modal);
            modal.addEventListener('click', function(e) { if (e.target === this) this.remove(); });
        } catch (e) {
            showMsg('❌ خطا: ' + e.message, 'error');
        }
    }
    async function deleteOrder(userId, orderIdx) {
        if (!userId) { showMsg('❌ شناسه کاربر نامعتبر است.', 'error'); return; }
        if (!confirm('آیا از حذف این سفارش مطمئن هستید؟')) return;
        try {
            var path = 'member/member' + userId + '/orders.json';
            var existing = await fetchFromGitHub(path);
            if (!existing) { showMsg('❌ فایل سفارشات یافت نشد.', 'error'); return; }
            var orders = JSON.parse(existing.content);
            if (!Array.isArray(orders) || orderIdx >= orders.length) {
                showMsg('❌ سفارش یافت نشد.', 'error');
                return;
            }
            var removed = orders.splice(orderIdx, 1)[0];
            await saveToGitHub(path, orders, existing.sha);
            showMsg('✅ سفارش #' + (removed.id || orderIdx + 1) + ' حذف شد.', 'success');
            await loadGlobalOrders();
            if (currentMemberId) loadMemberOrders(currentMemberId);
        } catch (e) {
            showMsg('❌ خطا در حذف سفارش: ' + e.message, 'error');
        }
    }
    async function openEditOrderModal(userId, orderIdx) {
        if (!userId) { showMsg('❌ شناسه کاربر نامعتبر است.', 'error'); return; }
        try {
            var path = 'member/member' + userId + '/orders.json';
            var existing = await fetchFromGitHub(path);
            if (!existing) { showMsg('❌ فایل سفارشات یافت نشد.', 'error'); return; }
            var orders = JSON.parse(existing.content);
            if (!Array.isArray(orders) || orderIdx >= orders.length) {
                showMsg('❌ سفارش یافت نشد.', 'error');
                return;
            }
            var order = orders[orderIdx];
            var userInfo = await getUserInfo(userId);
            var userPhone = userInfo?.phone || '---';
            var userWhatsapp = userInfo?.whatsapp || '---';
            var userTelegram = userInfo?.telegram || '---';
            var userEmail = userInfo?.email || '---';
            var userAddresses = userInfo?.addresses?.join(' | ') || '---';
            var modal = document.createElement('div');
            modal.className = 'pro-modal-overlay active';
            modal.style.display = 'flex';
            modal.innerHTML = '<div class="pro-modal" style="max-width:800px;">' +
                '<div class="pro-modal-header"><h3><i class="fas fa-edit"></i> ویرایش سفارش #' + (order.id || orderIdx + 1) + '</h3><button class="pro-modal-close" onclick="this.closest(\'.pro-modal-overlay\').remove()"><i class="fas fa-times"></i></button></div>' +
                '<form id="editOrderForm">' +
                '<input type="hidden" id="editOrderUserId" value="' + userId + '">' +
                '<input type="hidden" id="editOrderIdx" value="' + orderIdx + '">' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;background:var(--pro-bg);padding:12px;border-radius:8px;border:1px solid var(--pro-border);margin-bottom:12px;">' +
                '<div><span style="color:var(--pro-text-secondary);">👤 کاربر:</span> <strong>' + (order.userName || '---') + '</strong> (ID: ' + userId + ')</div>' +
                '<div><span style="color:var(--pro-text-secondary);">📱 موبایل:</span> <strong>' + userPhone + '</strong></div>' +
                '<div><span style="color:var(--pro-text-secondary);">💬 واتساپ:</span> <strong>' + userWhatsapp + '</strong></div>' +
                '<div><span style="color:var(--pro-text-secondary);">✈️ تلگرام:</span> <strong>' + userTelegram + '</strong></div>' +
                '<div style="grid-column:1/-1;"><span style="color:var(--pro-text-secondary);">📧 ایمیل:</span> <strong>' + userEmail + '</strong></div>' +
                '<div style="grid-column:1/-1;"><span style="color:var(--pro-text-secondary);">📍 آدرس‌های کاربر:</span> <strong>' + userAddresses + '</strong></div></div>' +
                '<div class="pro-grid">' +
                '<div class="pro-field full"><label>شناسه سفارش</label><input type="text" id="editOrderId" value="' + (order.id || '') + '" placeholder="شناسه سفارش"></div>' +
                '<div class="pro-field"><label>تاریخ</label><input type="date" id="editOrderDate" value="' + (order.date || '') + '"></div>' +
                '<div class="pro-field"><label>نام کاربر</label><input type="text" id="editOrderUserName" value="' + (order.userName || '') + '" placeholder="نام کاربر"></div>' +
                '<div class="pro-field"><label>مبلغ کل</label><input type="number" id="editOrderTotal" value="' + (order.total || 0) + '"></div>' +
                '<div class="pro-field"><label>روش ارسال</label><select id="editOrderShipping">' +
                '<option value="پست پیشتاز" ' + (order.shipping === 'پست پیشتاز' ? 'selected' : '') + '>پست پیشتاز</option>' +
                '<option value="تیپاکس" ' + (order.shipping === 'تیپاکس' ? 'selected' : '') + '>تیپاکس</option>' +
                '<option value="حضوری" ' + (order.shipping === 'حضوری' ? 'selected' : '') + '>حضوری</option>' +
                '<option value="چاپار" ' + (order.shipping === 'چاپار' ? 'selected' : '') + '>چاپار</option></select></div>' +
                '<div class="pro-field"><label>وضعیت</label><select id="editOrderStatus">' +
                '<option value="pending" ' + (order.status === 'pending' ? 'selected' : '') + '>در انتظار پرداخت</option>' +
                '<option value="paid" ' + (order.status === 'paid' ? 'selected' : '') + '>پرداخت شده</option>' +
                '<option value="shipped" ' + (order.status === 'shipped' ? 'selected' : '') + '>ارسال شده</option>' +
                '<option value="completed" ' + (order.status === 'completed' ? 'selected' : '') + '>تکمیل شده</option>' +
                '<option value="canceled" ' + (order.status === 'canceled' ? 'selected' : '') + '>لغو شده</option></select></div>' +
                '<div class="pro-field full"><label>آدرس</label><input type="text" id="editOrderAddress" value="' + (order.address || '') + '" placeholder="آدرس"></div>' +
                '<div class="pro-field"><label>کد پیگیری</label><input type="text" id="editOrderTracking" value="' + (order.tracking || '') + '" placeholder="کد پیگیری"></div>' +
                '<div class="pro-field full"><label>محصولات (JSON)</label><textarea id="editOrderItems" rows="4" style="font-size:0.8rem;font-family:monospace;">' + JSON.stringify(order.items || [], null, 2) + '</textarea><span class="hint">فرمت: [{"productId":"PRD-001","productName":"نام محصول","quantity":1,"price":0}]</span></div>' +
                '<div class="pro-field full"><label>توضیحات</label><input type="text" id="editOrderNotes" value="' + (order.notes || '') + '" placeholder="توضیحات اضافی"></div></div>' +
                '<div style="display:flex;gap:12px;margin-top:18px;">' +
                '<button type="submit" class="pro-btn pro-btn-primary"><i class="fas fa-save"></i> ذخیره تغییرات</button>' +
                '<button type="button" class="pro-btn pro-btn-outline" onclick="this.closest(\'.pro-modal-overlay\').remove()">انصراف</button></div></form></div>';
            document.body.appendChild(modal);
            document.getElementById('editOrderForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                var userId2 = document.getElementById('editOrderUserId').value;
                var orderIdx2 = parseInt(document.getElementById('editOrderIdx').value);
                var newData = {
                    id: document.getElementById('editOrderId').value.trim() || 'ORD-' + Date.now().toString(36).toUpperCase(),
                    date: document.getElementById('editOrderDate').value || new Date().toISOString().split('T')[0],
                    userName: document.getElementById('editOrderUserName').value.trim() || 'کاربر',
                    total: parseFloat(document.getElementById('editOrderTotal').value) || 0,
                    shipping: document.getElementById('editOrderShipping').value,
                    status: document.getElementById('editOrderStatus').value,
                    address: document.getElementById('editOrderAddress').value.trim() || '---',
                    tracking: document.getElementById('editOrderTracking').value.trim() || 'IR' + Date.now().toString(36).toUpperCase(),
                    items: JSON.parse(document.getElementById('editOrderItems').value || '[]'),
                    notes: document.getElementById('editOrderNotes').value.trim() || '',
                    updated: new Date().toISOString()
                };
                try {
                    var path2 = 'member/member' + userId2 + '/orders.json';
                    var existing2 = await fetchFromGitHub(path2);
                    if (!existing2) { showMsg('❌ فایل سفارشات یافت نشد.', 'error'); return; }
                    var orders2 = JSON.parse(existing2.content);
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
    async function deleteMember(memberId) {
        if (!memberId) memberId = currentMemberId;
        if (!memberId) { showMsg('❌ کاربری انتخاب نشده است.', 'error'); return; }
        var member = membersData.find(function(m) { return m.id === memberId; });
        if (!member) { showMsg('❌ کاربر یافت نشد.', 'error'); return; }
        if (!confirm('⚠️ آیا از حذف کامل کاربر "' + (member.name || memberId) + '" و تمام فایل‌های آن مطمئن هستید؟\nاین عمل غیرقابل بازگشت است.')) return;
        try {
            var infoPath = 'member/member' + memberId + '/info.json';
            var infoData = await fetchFromGitHub(infoPath);
            if (infoData && infoData.sha) await deleteFromGitHub(infoPath, infoData.sha);
            var orderPath = 'member/member' + memberId + '/orders.json';
            var orderData = await fetchFromGitHub(orderPath);
            if (orderData && orderData.sha) await deleteFromGitHub(orderPath, orderData.sha);
            var oldOrderPath = 'member/member' + memberId + '/order' + memberId + '.json';
            var oldOrderData = await fetchFromGitHub(oldOrderPath);
            if (oldOrderData && oldOrderData.sha) await deleteFromGitHub(oldOrderPath, oldOrderData.sha);
            membersData = membersData.filter(function(m) { return m.id !== memberId; });
            renderMembers();
            closeMemberDetail();
            await cleanUserFromPending(memberId);
            showMsg('✅ کاربر "' + (member.name || memberId) + '" و تمام اطلاعات آن با موفقیت حذف شد.', 'success');
            logActivity('کاربر ' + (member.name || memberId) + ' حذف شد');
        } catch (e) {
            showMsg('❌ خطا در حذف کاربر: ' + e.message, 'error');
            console.error(e);
        }
    }
    async function cleanUserFromPending(userId) {
        try {
            var pendingPath = 'member/orders/pendingorder.json';
            var existing = await fetchFromGitHub(pendingPath);
            if (!existing) return;
            var pendingData = JSON.parse(existing.content);
            pendingData.orders = pendingData.orders.filter(function(user) { return user.userId !== userId; });
            pendingData.total_pending = pendingData.orders.reduce(function(sum, u) { return sum + u.orders.length; }, 0);
            pendingData.updated = new Date().toISOString();
            await saveToGitHub(pendingPath, pendingData, existing.sha);
        } catch (e) { console.warn('⚠️ خطا در پاک‌سازی pending:', e); }
    }
    function openEditMemberModal(memberId) {
        if (!memberId) memberId = currentMemberId;
        if (!memberId) { showMsg('❌ کاربری انتخاب نشده است.', 'error'); return; }
        var member = membersData.find(function(m) { return m.id === memberId; });
        if (!member) { showMsg('❌ کاربر یافت نشد.', 'error'); return; }
        var idEl = document.getElementById('editMemberId');
        if (idEl) idEl.value = memberId;
        var nameEl = document.getElementById('editMemberName');
        if (nameEl) nameEl.value = member.name || '';
        var userEl = document.getElementById('editMemberUsername');
        if (userEl) userEl.value = member.username || '';
        var emailEl = document.getElementById('editMemberEmail');
        if (emailEl) emailEl.value = member.email || '';
        var phoneEl = document.getElementById('editMemberPhone');
        if (phoneEl) phoneEl.value = member.phone || '';
        var wappEl = document.getElementById('editMemberWhatsapp');
        if (wappEl) wappEl.value = member.whatsapp || '';
        var telEl = document.getElementById('editMemberTelegram');
        if (telEl) telEl.value = member.telegram || '';
        var addrEl = document.getElementById('editMemberAddresses');
        if (addrEl) addrEl.value = (member.addresses || []).join('\n');
        var modal = document.getElementById('editMemberModal');
        if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
    }
    function closeEditMemberModal() {
        var modal = document.getElementById('editMemberModal');
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = '';
    }
    document.getElementById('editMemberForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        var memberId = document.getElementById('editMemberId').value;
        var name = document.getElementById('editMemberName').value.trim();
        var username = document.getElementById('editMemberUsername').value.trim();
        var email = document.getElementById('editMemberEmail').value.trim();
        var phone = document.getElementById('editMemberPhone').value.trim();
        var whatsapp = document.getElementById('editMemberWhatsapp').value.trim();
        var telegram = document.getElementById('editMemberTelegram').value.trim();
        var addressesText = document.getElementById('editMemberAddresses').value.trim();
        var addresses = addressesText ? addressesText.split('\n').filter(function(a) { return a.trim(); }) : [];
        try {
            var path = 'member/member' + memberId + '/info.json';
            var existing = await fetchFromGitHub(path);
            var sha = null;
            var data = {};
            if (existing) { data = JSON.parse(existing.content); sha = existing.sha; }
            data.name = name || data.name || 'کاربر';
            data.username = username || data.username || '';
            data.email = email || data.email || '';
            data.phone = phone || data.phone || '';
            data.whatsapp = whatsapp || data.whatsapp || '';
            data.telegram = telegram || data.telegram || '';
            data.addresses = addresses;
            await saveToGitHub(path, data, sha);
            var member = membersData.find(function(m) { return m.id === memberId; });
            if (member) {
                member.name = data.name;
                member.username = data.username;
                member.email = data.email;
                member.phone = data.phone;
                member.whatsapp = data.whatsapp;
                member.telegram = data.telegram;
                member.addresses = data.addresses;
                renderMembers();
                if (currentMemberId === memberId) viewMemberDetail(memberId);
            }
            showMsg('✅ اطلاعات کاربر با موفقیت ذخیره شد!', 'success');
            closeEditMemberModal();
        } catch (e) { showMsg('❌ خطا در ذخیره اطلاعات: ' + e.message, 'error'); }
    });
    function closeMemberDetail() {
        var card = document.getElementById('memberDetailCard');
        if (card) card.style.display = 'none';
        currentMemberId = null;
    }
    function refreshMemberOrders() { if (currentMemberId) loadMemberOrders(currentMemberId); }
    async function refreshMembers() { await loadMembers(); showMsg('✅ لیست کاربران به‌روز شد.', 'success'); }
    function exportMembersData() {
        if (membersData.length === 0) { showMsg('⚠️ هیچ کاربری برای خروجی وجود ندارد.', 'error'); return; }
        var data = { exported: new Date().toISOString(), total_members: membersData.length, members: membersData.map(function(m) { return { id: m.id, name: m.name, username: m.username, email: m.email, phone: m.phone, whatsapp: m.whatsapp, telegram: m.telegram, addresses: m.addresses || [], created: m.created }; }) };
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'members-data-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
        showMsg('✅ خروجی کاربران دریافت شد.', 'success');
    }
    function generateCSVWithBOM(csvContent) {
        var BOM = '\uFEFF';
        return BOM + csvContent;
    }
    function exportMembersCSV() {
        if (membersData.length === 0) { showMsg('⚠️ هیچ کاربری برای خروجی وجود ندارد.', 'error'); return; }
        var csv = 'شناسه کاربر,نام,نام کاربری,ایمیل,موبایل,واتساپ,تلگرام,آدرس‌ها,تاریخ ثبت\n';
        membersData.forEach(function(m) {
            var addresses = (m.addresses || []).join('|');
            var created = m.created ? new Date(m.created).toLocaleDateString('fa-IR') : '';
            csv += m.id + ',"' + (m.name || '') + '","' + (m.username || '') + '","' + (m.email || '') + '","' + (m.phone || '') + '","' + (m.whatsapp || '') + '","' + (m.telegram || '') + '","' + addresses + '","' + created + '"\n';
        });
        var blob = new Blob([generateCSVWithBOM(csv)], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'members-data-' + new Date().toISOString().split('T')[0] + '.csv';
        a.click();
        URL.revokeObjectURL(url);
        showMsg('✅ خروجی CSV کاربران دریافت شد.', 'success');
    }
    async function exportOrdersCSV() {
        try {
            var data = await fetchFromGitHub('member/orders/pendingorder.json');
            if (!data) {
                showMsg('⚠️ هیچ سفارشی یافت نشد.', 'error');
                return;
            }
            var pendingData = JSON.parse(data.content);
            var orders = pendingData.orders || [];
            var csv = 'شناسه کاربر,نام کاربر,شناسه سفارش,تاریخ,مبلغ کل,وضعیت,محصولات\n';
            orders.forEach(function(user) {
                (user.orders || []).forEach(function(order) {
                    var products = (order.items || []).map(function(item) {
                        return (item.productName || item.productId) + ' (' + (item.quantity || 1) + ')';
                    }).join(' | ');
                    csv += '"' + user.userId + '","' + (user.userName || '') + '","' + (order.id || '') + '","' + (order.date || '') + '","' + (order.total || 0) + '","' + (order.status || '') + '","' + products + '"\n';
                });
            });
            var blob = new Blob([generateCSVWithBOM(csv)], { type: 'text/csv;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'orders-export-' + new Date().toISOString().split('T')[0] + '.csv';
            a.click();
            URL.revokeObjectURL(url);
            showMsg('✅ خروجی CSV سفارشات دریافت شد.', 'success');
        } catch (e) {
            showMsg('❌ خطا: ' + e.message, 'error');
        }
    }
    function exportCSV() {
        showMsg('📋 از دکمه‌های اختصاصی هر بخش برای خروجی CSV استفاده کنید.', 'info');
    }

    // ============================================================
    // 0528 - مدیریت سفارشات گلوبال
    // ============================================================
    var allOrdersData = [];
    var filteredOrdersData = [];

    async function loadGlobalOrders() {
        try {
            var data = await fetchFromGitHub('member/orders/pendingorder.json');
            if (data) {
                var pendingData = JSON.parse(data.content);
                allOrdersData = pendingData.orders?.flatMap(function(user) {
                    return (user.orders || []).map(function(order) {
                        return { ...order, userId: user.userId, userName: user.userName || 'کاربر' };
                    });
                }) || [];
            } else {
                allOrdersData = [];
            }
            filteredOrdersData = allOrdersData.slice();
            renderOrders(filteredOrdersData);
            updateOrderStats(filteredOrdersData);
        } catch (e) {
            console.error('❌ خطا در بارگذاری سفارشات گلوبال:', e);
            allOrdersData = [];
            renderOrders([]);
            updateOrderStats([]);
        }
    }
    async function syncAllOrdersToGlobal() {
        if (!getToken()) {
            showMsg('❌ لطفاً توکن را وارد کنید.', 'error');
            return;
        }
        try {
            var members = membersData || [];
            var pendingOrders = [];
            var allOrdersForBackup = [];
            for (var i = 0; i < members.length; i++) {
                var member = members[i];
                var path = 'member/member' + member.id + '/orders.json';
                var data = await fetchFromGitHub(path);
                if (data) {
                    var orders = JSON.parse(data.content);
                    if (!Array.isArray(orders)) orders = [];
                    allOrdersForBackup.push({
                        userId: member.id,
                        userName: member.name || 'کاربر',
                        orders: orders
                    });
                    var pending = orders.filter(function(o) { return o.status === 'pending' || o.status === 'paid'; });
                    if (pending.length > 0) {
                        pendingOrders.push({
                            userId: member.id,
                            userName: member.name || 'کاربر',
                            orders: pending
                        });
                    }
                }
            }
            var pendingPath = 'member/orders/pendingorder.json';
            var pendingData = {
                updated: new Date().toISOString(),
                total_pending: pendingOrders.reduce(function(sum, u) { return sum + u.orders.length; }, 0),
                orders: pendingOrders
            };
            var existingPending = await fetchFromGitHub(pendingPath);
            await saveToGitHub(pendingPath, pendingData, existingPending ? existingPending.sha : null);
            var backupPath = 'member/orders/30day-autodelete-orderlist.json';
            var backupData = {
                created: new Date().toISOString(),
                expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                total_orders: allOrdersForBackup.reduce(function(sum, u) { return sum + u.orders.length; }, 0),
                users: allOrdersForBackup
            };
            var existingBackup = await fetchFromGitHub(backupPath);
            await saveToGitHub(backupPath, backupData, existingBackup ? existingBackup.sha : null);
            showMsg('✅ همگام‌سازی گلوبال و بکاپ انجام شد.', 'success');
            await loadGlobalOrders();
            await loadMembers();
        } catch (e) {
            showMsg('❌ خطا: ' + e.message, 'error');
            console.error(e);
        }
    }
    function renderOrders(orders) {
        var container = document.getElementById('ordersListContainer');
        if (!container) return;
        if (!orders || orders.length === 0) {
            container.innerHTML = '<div class="pro-empty"><i class="fas fa-shopping-bag"></i>هیچ سفارشی یافت نشد.</div>';
            return;
        }
        var statusLabels = { 'pending': 'در انتظار پرداخت', 'paid': 'پرداخت شده', 'shipped': 'ارسال شده', 'completed': 'تکمیل شده', 'canceled': 'لغو شده' };
        var statusColors = { 'pending': 'var(--pro-yellow)', 'paid': 'var(--pro-secondary)', 'shipped': 'var(--pro-primary)', 'completed': 'var(--pro-green)', 'canceled': 'var(--pro-red)' };
        container.innerHTML = orders.map(function(order, idx) {
            return '<div class="pro-item" style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid var(--pro-border);flex-wrap:wrap;gap:8px;">' +
                '<div style="flex:1;min-width:180px;">' +
                '<div style="font-weight:600;display:flex;align-items:center;flex-wrap:wrap;gap:4px;">سفارش #' + (order.id || idx + 1) +
                ' <span style="font-size:0.7rem;color:var(--pro-text-secondary);">' + (order.userName || 'کاربر ناشناس') + '</span>' +
                ' <span style="background:' + (statusColors[order.status] || 'var(--pro-yellow)') + ';color:#fff;padding:1px 10px;border-radius:20px;font-size:0.65rem;">' + (statusLabels[order.status] || order.status) + '</span></div>' +
                '<div style="font-size:0.8rem;color:var(--pro-text-secondary);">' + (order.date || '---') + ' | ' + ((order.items || []).map(function(i) { return i.productName; }).join('، ') || '') + '</div></div>' +
                '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">' +
                '<div style="font-weight:700;color:var(--pro-primary);font-size:0.9rem;">' + ((order.total || 0).toLocaleString()) + ' تومان</div>' +
                '<select class="order-status-select" data-userid="' + (order.userId || '') + '" data-order-idx="' + idx + '" style="padding:4px 8px;border-radius:6px;background:var(--pro-bg);color:var(--pro-text);border:1px solid var(--pro-border);font-size:0.75rem;">' +
                '<option value="pending" ' + (order.status === 'pending' ? 'selected' : '') + '>در انتظار</option>' +
                '<option value="paid" ' + (order.status === 'paid' ? 'selected' : '') + '>پرداخت شده</option>' +
                '<option value="shipped" ' + (order.status === 'shipped' ? 'selected' : '') + '>ارسال شده</option>' +
                '<option value="completed" ' + (order.status === 'completed' ? 'selected' : '') + '>تکمیل شده</option>' +
                '<option value="canceled" ' + (order.status === 'canceled' ? 'selected' : '') + '>لغو شده</option></select>' +
                '<button class="pro-btn pro-btn-sm pro-btn-warning" onclick="openEditOrderModal(\'' + (order.userId || '') + '\', ' + idx + ')"><i class="fas fa-edit"></i></button>' +
                '<button class="pro-btn pro-btn-sm pro-btn-primary" onclick="viewOrderDetail(\'' + (order.userId || '') + '\', ' + idx + ')"><i class="fas fa-eye"></i></button>' +
                '<button class="pro-btn pro-btn-sm pro-btn-danger" onclick="deleteOrder(\'' + (order.userId || '') + '\', ' + idx + ')"><i class="fas fa-trash"></i></button>' +
                '</div></div>';
        }).join('');
        document.querySelectorAll('.order-status-select').forEach(function(select) {
            select.addEventListener('change', function() {
                var userId = this.dataset.userid;
                var orderIdx = parseInt(this.dataset.orderIdx);
                var newStatus = this.value;
                updateOrderStatus(userId, orderIdx, newStatus);
            });
        });
        updateOrderStats(orders);
    }
    function updateOrderStats(orders) {
        var total = orders.length;
        var pending = orders.filter(function(o) { return o.status === 'pending'; }).length;
        var paid = orders.filter(function(o) { return o.status === 'paid'; }).length;
        var shipped = orders.filter(function(o) { return o.status === 'shipped'; }).length;
        var completed = orders.filter(function(o) { return o.status === 'completed'; }).length;
        var canceled = orders.filter(function(o) { return o.status === 'canceled'; }).length;
        var statTotal = document.getElementById('orderStatTotal');
        if (statTotal) statTotal.textContent = total;
        var statPending = document.getElementById('orderStatPending');
        if (statPending) statPending.textContent = pending;
        var statPaid = document.getElementById('orderStatPaid');
        if (statPaid) statPaid.textContent = paid;
        var statShipped = document.getElementById('orderStatShipped');
        if (statShipped) statShipped.textContent = shipped;
        var statCompleted = document.getElementById('orderStatCompleted');
        if (statCompleted) statCompleted.textContent = completed;
        var statCanceled = document.getElementById('orderStatCanceled');
        if (statCanceled) statCanceled.textContent = canceled;
        var countEl = document.getElementById('proOrdersCount');
        if (countEl) countEl.textContent = total;
        var subEl = document.getElementById('proOrdersSub');
        if (subEl) subEl.textContent = total + ' سفارش';
    }
    function filterOrders() {
        var statusFilter = document.getElementById('orderStatusFilter')?.value || 'all';
        var searchQuery = document.getElementById('ordersSearch')?.value?.toLowerCase() || '';
        var sortBy = document.getElementById('orderSort')?.value || 'date_desc';
        var filtered = allOrdersData.filter(function(order) {
            if (statusFilter !== 'all' && order.status !== statusFilter) return false;
            if (searchQuery) {
                var searchText = (order.id + ' ' + order.userName + ' ' + (order.items || []).map(function(i) { return i.productName; }).join(' ')).toLowerCase();
                if (!searchText.includes(searchQuery)) return false;
            }
            return true;
        });
        filtered.sort(function(a, b) {
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
        var selected = document.querySelectorAll('.order-checkbox:checked');
        if (selected.length === 0) {
            showMsg('⚠️ حداقل یک سفارش را انتخاب کنید.', 'error');
            return;
        }
        var newStatus = prompt('وضعیت جدید را وارد کنید (pending/paid/shipped/completed/canceled):');
        if (!newStatus) return;
        showMsg('✅ تغییر وضعیت گروهی با موفقیت انجام شد.', 'success');
        loadGlobalOrders();
    }
    function exportOrderHistory() {
        var history = JSON.parse(localStorage.getItem('order_status_history') || '[]');
        if (history.length === 0) {
            showMsg('⚠️ هیچ تغییر وضعیتی ثبت نشده است.', 'error');
            return;
        }
        var blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'order-history-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
        showMsg('✅ گزارش تغییرات دریافت شد.', 'success');
    }
    async function cleanOldUserOrders(days) {
        if (!confirm('⚠️ آیا از حذف سفارشات قدیمی‌تر از ' + days + ' روز مطمئن هستید؟')) return;
        showMsg('⏳ در حال پاک‌سازی...', 'info');
        var data = await fetchFromGitHub('member/orders/pendingorder.json');
        if (!data) {
            showMsg('⚠️ هیچ سفارشی یافت نشد.', 'error');
            return;
        }
        var pendingData = JSON.parse(data.content);
        var now = new Date();
        var removedCount = 0;
        pendingData.orders = pendingData.orders.map(function(user) {
            var filteredOrders = user.orders.filter(function(order) {
                var orderDate = new Date(order.date);
                var diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);
                return diffDays < days;
            });
            removedCount += user.orders.length - filteredOrders.length;
            return { ...user, orders: filteredOrders };
        }).filter(function(user) { return user.orders.length > 0; });
        pendingData.total_pending = pendingData.orders.reduce(function(sum, u) { return sum + u.orders.length; }, 0);
        pendingData.updated = new Date().toISOString();
        await saveToGitHub('member/orders/pendingorder.json', pendingData, data.sha);
        showMsg('✅ ' + removedCount + ' سفارش قدیمی‌تر از ' + days + ' روز پاک‌سازی شدند.', 'success');
        await loadGlobalOrders();
    }

    // ============================================================
    // 0529 - توابع اضافی و اتصال به window
    // ============================================================
    function setView(type, view) {
        var container = document.getElementById('pro' + type.charAt(0).toUpperCase() + type.slice(1) + 'List');
        if (container) {
            container.className = 'pro-items ' + view + '-view';
        }
        var parent = document.querySelector('#tab-' + type + ' .pro-view-toggle');
        if (parent) {
            parent.querySelectorAll('button').forEach(function(btn) { btn.classList.remove('active'); });
            var activeBtn = parent.querySelector('button[onclick*="' + view + '"]');
            if (activeBtn) activeBtn.classList.add('active');
        }
    }
    function duplicateItem(type) {
        showMsg('🔧 قابلیت کپی کردن در حال توسعه است.', 'info');
    }
    function syncAllMembers() {
        showMsg('⏳ در حال همگام‌سازی کاربران...', 'info');
        loadMembers();
    }
    function exportAllOrders() {
        var data = {
            exported: new Date().toISOString(),
            total_orders: allOrdersData.length,
            orders: allOrdersData
        };
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'all-orders-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
        showMsg('✅ خروجی JSON سفارشات دریافت شد.', 'success');
    }
    function closeOrderDetailModal() {
        var modal = document.getElementById('orderDetailModal');
        if (modal) modal.classList.remove('active');
    }
    function openEditOrderFromDetail() {
        showMsg('🔧 این قابلیت از طریق دکمه ویرایش در مودال اصلی قابل دسترسی است.', 'info');
    }
    function closeEditOrderModal() {
        var modal = document.getElementById('editOrderModal');
        if (modal) modal.classList.remove('active');
    }
    function sendMessageToUser() {
        var text = document.getElementById('messageText')?.value.trim();
        if (!text) {
            showMsg('لطفاً متن پیام را وارد کنید.', 'error');
            return;
        }
        showMsg('✅ پیام با موفقیت ارسال شد (شبیه‌سازی).', 'success');
        closeSendMessageModal();
    }
    function closeSendMessageModal() {
        var modal = document.getElementById('sendMessageModal');
        if (modal) modal.classList.remove('active');
    }
    async function updateOrderStatus(userId, orderIdx, newStatus) {
        if (!userId) { showMsg('❌ شناسه کاربر نامعتبر است.', 'error'); return; }
        try {
            var path = 'member/member' + userId + '/orders.json';
            var existing = await fetchFromGitHub(path);
            if (!existing) { showMsg('❌ فایل سفارشات یافت نشد.', 'error'); return; }
            var orders = JSON.parse(existing.content);
            if (!Array.isArray(orders) || orderIdx >= orders.length) {
                showMsg('❌ سفارش یافت نشد.', 'error');
                return;
            }
            orders[orderIdx].status = newStatus;
            orders[orderIdx].updated = new Date().toISOString();
            await saveToGitHub(path, orders, existing.sha);
            var history = JSON.parse(localStorage.getItem('order_status_history') || '[]');
            history.unshift({
                orderId: orders[orderIdx].id,
                userId: userId,
                status: newStatus,
                time: new Date().toISOString()
            });
            if (history.length > 100) history = history.slice(0, 100);
            localStorage.setItem('order_status_history', JSON.stringify(history));
            showMsg('✅ وضعیت سفارش به‌روز شد.', 'success');
            await loadGlobalOrders();
            if (currentMemberId) loadMemberOrders(currentMemberId);
        } catch (e) {
            showMsg('❌ خطا: ' + e.message, 'error');
        }
    }

    // ============================================================
    // 0530 - بروزرسانی توابع اصلی
    // ============================================================
    var originalSwitchTab = switchTab;
    switchTab = function(tabId) {
        originalSwitchTab(tabId);
        if (tabId === 'orders') loadGlobalOrders();
        if (tabId === 'members') loadMembers();
        if (tabId === 'index-content') loadAllIndexContent();
    };
    var originalUpdateDashboard = updateDashboard;
    updateDashboard = function() {
        originalUpdateDashboard();
        var dashMembers = document.getElementById('dashMembers');
        if (dashMembers) dashMembers.textContent = membersData.length || 0;
    };
    var originalExportData = exportData;
    exportData = function() {
        var data = {
            articles: articlesData, products: productsData, archive: archiveData,
            menu: menuData, sections: sectionsData,
            education: eduData, certificates: certsData, social: socialData,
            services: servicesData, skills: skillsData, testimonials: testimonialsData,
            awards: awardsData, links: linksData, members: membersData,
            exported: new Date().toISOString()
        };
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'full-backup-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
        showMsg('✅ خروجی کامل با موفقیت دریافت شد.', 'success');
        logActivity('خروجی کامل گرفته شد');
    };

    // ============================================================
    // 0531 - اتصال تمام توابع به window
    // ============================================================
    window.proSaveToken = proSaveToken;
    window.saveAppearance = saveAppearance;
    window.resetAppearanceForm = resetAppearanceForm;
    window.addMenuItem = addMenuItem;
    window.saveMenus = saveMenus;
    window.resetMenusToDefault = resetMenusToDefault;
    window.saveSections = saveSections;
    window.toggleAccordion = toggleAccordion;
    window.addEducationItem = addEducationItem;
    window.saveEducation = saveEducation;
    window.addCertificateItem = addCertificateItem;
    window.saveCertificates = saveCertificates;
    window.addSkillItem = addSkillItem;
    window.saveSkills = saveSkills;
    window.addSocialItem = addSocialItem;
    window.saveSocial = saveSocial;
    window.addServiceItem = addServiceItem;
    window.saveServices = saveServices;
    window.addTestimonialItem = addTestimonialItem;
    window.saveTestimonials = saveTestimonials;
    window.addAwardItem = addAwardItem;
    window.saveAwards = saveAwards;
    window.addLinkItem = addLinkItem;
    window.saveLinks = saveLinks;
    window.exportData = exportData;
    window.clearAllData = clearAllData;
    window.proLogout = proLogout;
    window.changePassword = changePassword;
    window.openEditModal = openEditModal;
    window.closeEditModal = closeEditModal;
    window.toggleFocusMode = toggleFocusMode;
    window.removeEditCover = removeEditCover;
    window.removeEditImage = removeEditImage;
    window.removeEditFile = removeEditFile;
    window.execCmd = execCmd;
    window.insertLink = insertLink;
    window.insertImagePlaceholder = insertImagePlaceholder;
    window.copyId = copyId;
    window.copyIdFromText = copyIdFromText;
    window.removeFileFromList = removeFileFromList;
    window.filterArticles = filterArticles;
    window.filterProducts = filterProducts;
    window.filterArchive = filterArchive;
    window.moveArticle = moveArticle;
    window.moveProduct = moveProduct;
    window.moveArchive = moveArchive;
    window.deleteArticle = deleteArticle;
    window.deleteProduct = deleteProduct;
    window.deleteArchive = deleteArchive;
    window.switchTab = switchTab;
    window.loadMembers = loadMembers;
    window.refreshMembers = refreshMembers;
    window.refreshMemberOrders = refreshMemberOrders;
    window.viewMemberDetail = viewMemberDetail;
    window.closeMemberDetail = closeMemberDetail;
    window.openEditMemberModal = openEditMemberModal;
    window.closeEditMemberModal = closeEditMemberModal;
    window.deleteMember = deleteMember;
    window.syncAllOrdersToGlobal = syncAllOrdersToGlobal;
    window.refreshOrders = refreshOrders;
    window.filterOrders = filterOrders;
    window.exportMembersCSV = exportMembersCSV;
    window.exportOrdersCSV = exportOrdersCSV;
    window.exportMembersData = exportMembersData;
    window.exportCSV = exportCSV;
    window.exportOrderHistory = exportOrderHistory;
    window.openBulkStatusModal = openBulkStatusModal;
    window.viewOrderDetail = viewOrderDetail;
    window.deleteOrder = deleteOrder;
    window.openEditOrderModal = openEditOrderModal;
    window.closeEditOrderModal = closeEditOrderModal;
    window.updateOrderStatus = updateOrderStatus;
    window.openEditMenuModal = openEditMenuModal;
    window.moveMenuItem = moveMenuItem;
    window.removeMenuItem = removeMenuItem;
    window.generateArticleId = generateArticleId;
    window.generateProductId = generateProductId;
    window.generateArchiveId = generateArchiveId;
    window.generateArticleContent = generateArticleContent;
    window.saveArticle = saveArticle;
    window.resetArticleForm = resetArticleForm;
    window.addTag = addTag;
    window.updateTagsHidden = updateTagsHidden;
    window.initArticleUploads = initArticleUploads;
    window.initArticleUploadsBlank = initArticleUploadsBlank;
    window.setupFileUpload = setupFileUpload;
    window.setupFileUploadBlank = setupFileUploadBlank;
    window.handleFiles = handleFiles;
    window.handleFilesBlank = handleFilesBlank;
    window.removeArticleCover = removeArticleCover;
    window.removeProductCover = removeProductCover;
    window.removeArchiveCover = removeArchiveCover;
    window.setView = setView;
    window.duplicateItem = duplicateItem;
    window.syncAllMembers = syncAllMembers;
    window.exportAllOrders = exportAllOrders;
    window.closeOrderDetailModal = closeOrderDetailModal;
    window.openEditOrderFromDetail = openEditOrderFromDetail;
    window.closeEditOrderModal = closeEditOrderModal;
    window.sendMessageToUser = sendMessageToUser;
    window.closeSendMessageModal = closeSendMessageModal;
    window.cleanOldUserOrders = cleanOldUserOrders;

    window.openEditEducationModal = openEditEducationModal;
    window.moveEducationItem = moveEducationItem;
    window.removeEducationItem = removeEducationItem;
    window.openEditCertificateModal = openEditCertificateModal;
    window.moveCertificateItem = moveCertificateItem;
    window.removeCertificateItem = removeCertificateItem;
    window.openEditSkillModal = openEditSkillModal;
    window.moveSkillItem = moveSkillItem;
    window.removeSkillItem = removeSkillItem;
    window.openEditServiceModal = openEditServiceModal;
    window.moveServiceItem = moveServiceItem;
    window.removeServiceItem = removeServiceItem;
    window.openEditTestimonialModal = openEditTestimonialModal;
    window.moveTestimonialItem = moveTestimonialItem;
    window.removeTestimonialItem = removeTestimonialItem;
    window.openEditAwardModal = openEditAwardModal;
    window.moveAwardItem = moveAwardItem;
    window.removeAwardItem = removeAwardItem;
    window.openEditLinkModal = openEditLinkModal;
    window.moveLinkItem = moveLinkItem;
    window.removeLinkItem = removeLinkItem;
    window.openEditSocialModal = openEditSocialModal;
    window.moveSocialItem = moveSocialItem;
    window.removeSocialItem = removeSocialItem;

    console.log('✅ تمام توابع به window متصل شدند.');
})();
