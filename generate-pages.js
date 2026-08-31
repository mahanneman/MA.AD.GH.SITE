const fs = require('fs');
const path = require('path');

// ===== توابع کمکی =====
function readJSON(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        console.error(`❌ خطا در خواندن ${filePath}:`, e.message);
        return {};
    }
}

function readTemplate(templatePath) {
    try {
        return fs.readFileSync(templatePath, 'utf8');
    } catch (e) {
        console.error(`❌ خطا در خواندن قالب ${templatePath}:`, e.message);
        return '';
    }
}

function renderPage(template, data) {
    let html = template;
    Object.keys(data).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, data[key] || '');
    });
    return html;
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// ===== نگاشت نوع‌ها =====
const typeLabels = {
    article: 'مقاله',
    project: 'پروژه',
    tutorial: 'آموزش'
};
const typeClasses = {
    article: 'type-article',
    project: 'type-project',
    tutorial: 'type-tutorial'
};

const archiveTypeLabels = {
    cfd: 'تحلیل CFD',
    structure: 'تحلیل سازه',
    design: 'طراحی مکانیکی',
    electro: 'تحلیل الکترومغناطیس',
    university: 'پروژه دانشگاهی',
    fabrication: 'ساخت و نمونه‌سازی',
    other: 'سایر'
};
const archiveTypeClasses = {
    cfd: 'badge-cfd',
    structure: 'badge-structure',
    design: 'badge-design',
    electro: 'badge-electro',
    university: 'badge-university',
    fabrication: 'badge-fabrication',
    other: 'badge-other'
};

const statusLabels = {
    'تکمیل شده': 'status-completed',
    'در حال انجام': 'status-progress',
    'ارائه شده': 'status-presented'
};

const stockClasses = {
    'موجود': 'stock-in-stock',
    'ناموجود': 'stock-out-stock',
    'پیش‌سفارش': 'stock-pre-order'
};

// ===== تولید صفحات =====
function generateArticles() {
    console.log('📝 در حال تولید صفحات مقالات...');
    const articles = readJSON('_data/articles.json');
    const template = readTemplate('newpage/article.html');
    
    if (!template) return;

    Object.keys(articles).forEach(id => {
        const item = articles[id];
        const typeLabel = typeLabels[item.type] || 'مقاله';
        const typeClass = typeClasses[item.type] || 'type-article';
        
        const coverHtml = item.cover ? 
            `<img src="${item.cover}" alt="${item.title}">` : 
            `<div class="placeholder"><i class="fas fa-newspaper"></i></div>`;
        
        const galleryHtml = (item.images && item.images.length > 0) ? 
            `<div class="image-gallery">${item.images.map(img => `<img src="${img}" alt="عکس مقاله" loading="lazy">`).join('')}</div>` : 
            '';
        
        const filesHtml = (item.files && item.files.length > 0) ? 
            `<div class="files-section">
                <h3><i class="fas fa-paperclip"></i> فایل‌های پیوست (${item.files.length})</h3>
                <div class="file-list">
                    ${item.files.map(f => `<div class="file-item"><i class="fas fa-file"></i><a href="/assets/articles/${id}/${f}" target="_blank">${f}</a></div>`).join('')}
                </div>
            </div>` : 
            '';

        const data = {
            title: item.title || 'بدون عنوان',
            coverHtml: coverHtml,
            typeLabel: typeLabel,
            typeClass: typeClass,
            date: item.date || '---',
            readTime: item.readTime || 5,
            tags: (item.tags || []).join('، '),
            galleryHtml: galleryHtml,
            body: item.body || item.excerpt || '',
            filesHtml: filesHtml
        };

        const output = renderPage(template, data);
        const outDir = path.join('assets', 'articles', id);
        ensureDir(outDir);
        fs.writeFileSync(path.join(outDir, 'index.html'), output);
        console.log(`✅ مقاله ${id} تولید شد: ${outDir}/index.html`);
    });
}

function generateProducts() {
    console.log('📝 در حال تولید صفحات محصولات...');
    const products = readJSON('_data/products.json');
    const template = readTemplate('newpage/product.html');
    
    if (!template) return;

    Object.keys(products).forEach(id => {
        const item = products[id];
        
        const coverHtml = item.cover ? 
            `<img src="${item.cover}" alt="${item.name}">` : 
            `<div class="placeholder"><i class="fas fa-cube"></i></div>`;
        
        const stockClass = stockClasses[item.stock] || 'stock-in-stock';
        
        const tagHtml = item.tag ? 
            `<span><i class="fas fa-tag"></i> <span class="tag-badge">${item.tag}</span></span>` : 
            '';
        
        const categoryHtml = item.category ? 
            `<span><i class="fas fa-folder"></i> ${item.category}</span>` : 
            '';
        
        const updatedHtml = item.updated ? 
            `<span><i class="fas fa-calendar"></i> ${item.updated}</span>` : 
            '';
        
        const galleryHtml = (item.images && item.images.length > 0) ? 
            `<div class="image-gallery">${item.images.map(img => `<img src="${img}" alt="عکس محصول" loading="lazy">`).join('')}</div>` : 
            '';
        
        const filesHtml = (item.files && item.files.length > 0) ? 
            `<div class="files-section">
                <h3><i class="fas fa-paperclip"></i> فایل‌های پیوست (${item.files.length})</h3>
                <div class="file-list">
                    ${item.files.map(f => `<div class="file-item"><i class="fas fa-file"></i><a href="/assets/products/${id}/${f}" target="_blank">${f}</a></div>`).join('')}
                </div>
            </div>` : 
            '';

        const data = {
            name: item.name || 'بدون نام',
            price: item.price || 'رایگان',
            coverHtml: coverHtml,
            stockClass: stockClass,
            stock: item.stock || 'موجود',
            tagHtml: tagHtml,
            categoryHtml: categoryHtml,
            updatedHtml: updatedHtml,
            galleryHtml: galleryHtml,
            desc: item.desc || item.body || '',
            filesHtml: filesHtml
        };

        const output = renderPage(template, data);
        const outDir = path.join('assets', 'products', id);
        ensureDir(outDir);
        fs.writeFileSync(path.join(outDir, 'index.html'), output);
        console.log(`✅ محصول ${id} تولید شد: ${outDir}/index.html`);
    });
}

function generateArchive() {
    console.log('📝 در حال تولید صفحات آرشیو...');
    const archive = readJSON('_data/archive.json');
    const template = readTemplate('newpage/archive-item.html');
    
    if (!template) return;

    Object.keys(archive).forEach(id => {
        const item = archive[id];
        
        const typeLabel = archiveTypeLabels[item.type] || 'سایر';
        const typeClass = archiveTypeClasses[item.type] || 'badge-other';
        const statusClass = statusLabels[item.status] || 'status-completed';
        
        const coverHtml = item.cover ? 
            `<img src="${item.cover}" alt="${item.title}">` : 
            `<div class="placeholder"><i class="fas fa-archive"></i></div>`;
        
        const galleryHtml = (item.images && item.images.length > 0) ? 
            `<div class="image-gallery">${item.images.map(img => `<img src="${img}" alt="عکس پروژه" loading="lazy">`).join('')}</div>` : 
            '';
        
        const filesHtml = (item.files && item.files.length > 0) ? 
            `<div class="files-section">
                <h3><i class="fas fa-paperclip"></i> فایل‌های پیوست (${item.files.length})</h3>
                <div class="file-list">
                    ${item.files.map(f => `<div class="file-item"><i class="fas fa-file"></i><a href="/assets/archive/${id}/${f}" target="_blank">${f}</a></div>`).join('')}
                </div>
            </div>` : 
            '';

        const data = {
            title: item.title || 'بدون عنوان',
            coverHtml: coverHtml,
            typeLabel: typeLabel,
            typeClass: typeClass,
            date: item.date || '---',
            status: item.status || 'تکمیل شده',
            statusClass: statusClass,
            tags: (item.tags || []).join('، '),
            galleryHtml: galleryHtml,
            body: item.body || item.excerpt || '',
            filesHtml: filesHtml
        };

        const output = renderPage(template, data);
        const outDir = path.join('assets', 'archive', id);
        ensureDir(outDir);
        fs.writeFileSync(path.join(outDir, 'index.html'), output);
        console.log(`✅ آیتم آرشیو ${id} تولید شد: ${outDir}/index.html`);
    });
}

// ===== اجرای اصلی =====
function main() {
    console.log('🚀 شروع فرآیند تولید صفحات static...\n');
    generateArticles();
    generateProducts();
    generateArchive();
    console.log('\n✅ همه صفحات با موفقیت تولید شدند!');
}

main();
