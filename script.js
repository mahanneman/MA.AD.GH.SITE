// ===== بارگذاری تنظیمات ظاهری =====
async function loadAppearanceSettings() {
    try {
        const res = await fetch('/MA.AD.GH.SITE/_data/settings.json?t=' + Date.now());
        if (res.ok) {
            const data = await res.json();
            const appearance = data.appearance || {};
            
            if (appearance.colorPrimary) {
                document.documentElement.style.setProperty('--primary-color', appearance.colorPrimary);
                document.documentElement.style.setProperty('--pro-primary', appearance.colorPrimary);
            }
            if (appearance.colorSecondary) {
                document.documentElement.style.setProperty('--secondary-color', appearance.colorSecondary);
                document.documentElement.style.setProperty('--pro-secondary', appearance.colorSecondary);
            }
            if (appearance.colorBg) {
                document.documentElement.style.setProperty('--bg-primary', appearance.colorBg);
                document.documentElement.style.setProperty('--pro-bg', appearance.colorBg);
            }
            if (appearance.colorText) {
                document.documentElement.style.setProperty('--text-primary', appearance.colorText);
                document.documentElement.style.setProperty('--pro-text', appearance.colorText);
            }
            if (appearance.colorTextSec) {
                document.documentElement.style.setProperty('--text-secondary', appearance.colorTextSec);
                document.documentElement.style.setProperty('--pro-text-secondary', appearance.colorTextSec);
            }
            if (appearance.colorCard) {
                document.documentElement.style.setProperty('--bg-secondary', appearance.colorCard);
                document.documentElement.style.setProperty('--pro-card', appearance.colorCard);
            }
            if (appearance.colorBorder) {
                document.documentElement.style.setProperty('--border-color', appearance.colorBorder);
                document.documentElement.style.setProperty('--pro-border', appearance.colorBorder);
            }
            if (appearance.fontFamily) {
                document.body.style.fontFamily = appearance.fontFamily + ', sans-serif';
            }
            if (appearance.fontSize) {
                document.body.style.fontSize = appearance.fontSize + 'px';
            }
            if (appearance.fontSizeHeading) {
                document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
                    el.style.fontSize = appearance.fontSizeHeading + 'px';
                });
            }
            if (appearance.lineHeight) {
                document.body.style.lineHeight = appearance.lineHeight;
            }
            if (appearance.bgImage) {
                document.body.style.backgroundImage = 'url(' + appearance.bgImage + ')';
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundAttachment = 'fixed';
            }
        }
    } catch (e) {
        console.error('خطا در بارگذاری تنظیمات ظاهر:', e);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // ===== اعمال تنظیمات ظاهری =====
    loadAppearanceSettings();

    // ===== منوی کشویی =====
    const menuToggle = document.getElementById('menuToggle');
    const slideMenu = document.getElementById('slideMenu');
    const slideMenuClose = document.getElementById('slideMenuClose');
    const menuOverlay = document.getElementById('menuOverlay');
    const slideLinks = document.querySelectorAll('.slide-menu-link');

    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            slideMenu.classList.add('active');
            menuOverlay.classList.add('active');
            document.body.classList.add('no-scroll');
            this.setAttribute('aria-expanded', 'true');
        });
    }

    function closeSlideMenu() {
        slideMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.classList.remove('no-scroll');
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    }

    if (slideMenuClose) slideMenuClose.addEventListener('click', closeSlideMenu);
    if (menuOverlay) menuOverlay.addEventListener('click', closeSlideMenu);

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && slideMenu.classList.contains('active')) closeSlideMenu();
    });

    // ===== تم تاریک/روشن =====
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'light') {
        document.querySelector('.fa-moon').style.opacity = '0';
        document.querySelector('.fa-sun').style.opacity = '1';
        document.querySelector('.fa-sun').style.transform = 'translate(50%,-50%) rotate(0deg)';
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const current = document.documentElement.getAttribute('data-theme');
            const newTheme = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            const moon = document.querySelector('.fa-moon');
            const sun = document.querySelector('.fa-sun');
            if (newTheme === 'light') {
                moon.style.opacity = '0';
                sun.style.opacity = '1';
                sun.style.transform = 'translate(50%,-50%) rotate(0deg)';
            } else {
                moon.style.opacity = '1';
                sun.style.opacity = '0';
                sun.style.transform = 'translate(50%,-50%) rotate(90deg)';
            }
        });
    }

    // ===== بارگذاری داده‌ها =====
    let articlesData = [];

    async function loadArticles() {
        try {
            const res = await fetch('/MA.AD.GH.SITE/_data/articles.json?t=' + Date.now());
            if (res.ok) {
                const data = await res.json();
                articlesData = Object.keys(data).map(key => ({ ...data[key], key }));
            } else {
                articlesData = [
                    { key: 'article-1', title: 'تحلیل جریان آشفته در لوله‌ها', excerpt: 'بررسی عددی جریان آشفته با مدل‌های توربولانس', date: '۱۴۰۳/۰۲/۱۰', tags: ['CFD', 'توربولانس'], type: 'article' },
                    { key: 'article-2', title: 'طراحی سیستم تهویه مطبوع', excerpt: 'طراحی و شبیه‌سازی سیستم HVAC', date: '۱۴۰۳/۰۱/۲۵', tags: ['HVAC', 'طراحی'], type: 'project' },
                    { key: 'article-3', title: 'آموزش شبکه‌بندی', excerpt: 'آموزش تولید مش ساختار یافته', date: '۱۴۰۲/۱۲/۰۵', tags: ['آموزش', 'شبکه‌بندی'], type: 'tutorial' }
                ];
            }
            renderRecentArticles(articlesData);
            renderAboutText(articlesData);
        } catch (e) {
            console.error('خطا در بارگذاری مقالات:', e);
            articlesData = [
                { key: 'article-1', title: 'تحلیل جریان آشفته در لوله‌ها', excerpt: 'بررسی عددی جریان آشفته با مدل‌های توربولانس', date: '۱۴۰۳/۰۲/۱۰', tags: ['CFD', 'توربولانس'], type: 'article' },
                { key: 'article-2', title: 'طراحی سیستم تهویه مطبوع', excerpt: 'طراحی و شبیه‌سازی سیستم HVAC', date: '۱۴۰۳/۰۱/۲۵', tags: ['HVAC', 'طراحی'], type: 'project' },
                { key: 'article-3', title: 'آموزش شبکه‌بندی', excerpt: 'آموزش تولید مش ساختار یافته', date: '۱۴۰۲/۱۲/۰۵', tags: ['آموزش', 'شبکه‌بندی'], type: 'tutorial' }
            ];
            renderRecentArticles(articlesData);
            renderAboutText(articlesData);
        }
    }

    function renderRecentArticles(articles) {
        const grid = document.getElementById('recentArticlesGrid');
        if (!grid) return;
        const recent = articles.slice(0, 3);
        if (recent.length === 0) {
            grid.innerHTML = '<p style="text-align:center;color:var(--text-secondary);">هیچ مقاله‌ای یافت نشد.</p>';
            return;
        }
        grid.innerHTML = recent.map(item => `
            <div class="article-preview-card">
                <span class="tag ${item.type || 'article'}">${item.type === 'article' ? 'مقاله' : item.type === 'project' ? 'پروژه' : 'آموزش'}</span>
                <h3><a href="article.html?id=${item.key}">${item.title || 'بدون عنوان'}</a></h3>
                <p>${item.excerpt || ''}</p>
                <div class="meta">
                    <span><i class="fas fa-calendar"></i> ${item.date || '---'}</span>
                    <span><i class="fas fa-tags"></i> ${item.tags ? item.tags.join('، ') : ''}</span>
                </div>
            </div>
        `).join('');
    }

    function renderAboutText(articles) {
        const aboutEl = document.getElementById('aboutText');
        if (aboutEl && articles.length > 0) {
            aboutEl.textContent = articles[0].excerpt || 'مهندس ماهان ادهم قزوینی، فارغ‌التحصیل کارشناسی مهندسی مکانیک از دانشگاه آزاد اسلامی واحد تهران مرکز با گرایش سیالات و حرارت. با گذراندن دوره‌های تخصصی و کسب گواهی‌نامه‌های معتبر در زمینه نرم‌افزارهای مهندسی، همواره در حال گسترش دانش و مهارت‌های فنی هستم.';
        }
    }

    // ===== بارگذاری مهارت‌ها =====
    function loadSkills() {
        const grid = document.getElementById('skillsGrid');
        if (!grid) return;
        const skills = [
            { name: 'CATIA', icon: 'fa-drafting-compass', level: 'پیشرفته', desc: 'طراحی سطح، مونتاژ و نقشه‌کشی صنعتی' },
            { name: 'SOLIDWORKS', icon: 'fa-cube', level: 'پیشرفته', desc: 'مدل‌سازی سه‌بعدی و طراحی ماشین‌آلات' },
            { name: 'AutoCAD', icon: 'fa-draw-polygon', level: 'حرفه‌ای', desc: 'نقشه‌کشی دو بعدی و نقشه‌های اجرایی' },
            { name: 'ANSYS Fluent', icon: 'fa-water', level: 'پیشرفته', desc: 'تحلیل جریان سیالات و انتقال حرارت' },
            { name: 'ANSYS Mechanical', icon: 'fa-bolt', level: 'پیشرفته', desc: 'تحلیل تنش و ارتعاشات سازه‌ای' },
            { name: 'COMSOL', icon: 'fa-atom', level: 'متوسط', desc: 'شبیه‌سازی چندفیزیکی و PDE' }
        ];
        grid.innerHTML = skills.map(s => `
            <div style="background:var(--bg-secondary);border-radius:16px;padding:1.5rem;border:1px solid var(--border-color);transition:0.3s;">
                <div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.8rem;">
                    <div style="width:50px;height:50px;background:linear-gradient(135deg,var(--primary-color),#8b5cf6);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.5rem;"><i class="fas ${s.icon}"></i></div>
                    <div><h4 style="font-size:1.1rem;margin:0;">${s.name}</h4><span style="font-size:0.8rem;color:var(--text-secondary);">${s.level}</span></div>
                </div>
                <p style="font-size:0.9rem;color:var(--text-secondary);margin:0;">${s.desc}</p>
            </div>
        `).join('');
    }

    // ===== بارگذاری گواهی‌نامه‌ها =====
    function loadCertificates() {
        const list = document.getElementById('certificatesList');
        if (!list) return;
        const certs = [
            { name: 'CATIA سطح پیشرفته', org: 'مجتمع فنی تهران', date: '۱۴۰۲' },
            { name: 'تحلیل CFD با Ansys Fluent', org: 'آموزش آزاد CFD', date: '۱۴۰۳' },
            { name: 'طراحی با SolidWorks', org: 'دوره تخصصی آنلاین', date: '۱۴۰۲' }
        ];
        list.innerHTML = certs.map(c => `
            <div style="display:flex;gap:0.8rem;padding:0.8rem;background:var(--bg-tertiary);border-radius:12px;">
                <div style="width:40px;height:40px;background:linear-gradient(135deg,var(--secondary-color),var(--primary-color));border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1rem;flex-shrink:0;"><i class="fas fa-award"></i></div>
                <div><h5 style="font-size:0.95rem;margin-bottom:0.2rem;">${c.name}</h5><p style="font-size:0.8rem;color:var(--text-secondary);margin:0;">${c.org}</p><div style="display:flex;gap:1rem;font-size:0.7rem;color:var(--text-secondary);margin-top:0.3rem;"><span><i class="fas fa-calendar"></i> ${c.date}</span></div></div>
            </div>
        `).join('');
    }

    // ===== بارگذاری تحصیلات =====
    function loadEducation() {
        const timeline = document.getElementById('educationTimeline');
        if (!timeline) return;
        const eduItems = [
            { title: 'کارشناسی مهندسی مکانیک', org: 'دانشگاه آزاد اسلامی واحد تهران مرکز', date: '۱۳۹۹ - ۱۴۰۴', badge: 'فارغ‌التحصیل', details: ['گرایش: سیالات و حرارت', 'معدل: ۱۵.۷۲', 'تعداد واحد: ۱۴۰'] },
            { title: 'گواهی نامه تخصصی CATIA', org: 'مجتمع فنی تهران', date: '۱۴۰۴', badge: 'پیشرفته', details: ['طراحی سطح، مونتاژ، نقشه‌کشی', 'مدت: ۱۲۰ ساعت', 'نمره: ۱۸.۵ از ۲۰'] },
            { title: 'تحلیل CFD با Ansys Fluent', org: 'آموزش آزاد CFD', date: '۱۴۰۳', badge: 'تخصصی', details: ['تحلیل جریان سیالات', 'انتقال حرارت و توربولانس', 'مدت: ۸۰ ساعت'] }
        ];
        timeline.innerHTML = eduItems.map((item, idx) => `
            <div style="position:relative;padding-right:2rem;margin-bottom:2rem;border-right:2px solid var(--primary-color);">
                <div style="position:absolute;right:-8px;top:0;width:14px;height:14px;background:var(--primary-color);border-radius:50%;border:3px solid var(--bg-secondary);"></div>
                <div style="background:var(--bg-primary);border-radius:16px;padding:1.5rem;border:1px solid var(--border-color);">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem;">
                        <h4 style="font-size:1.1rem;margin:0;">${item.title}</h4>
                        <span style="display:inline-flex;align-items:center;gap:0.3rem;padding:0.2rem 0.8rem;background:${idx === 0 ? 'linear-gradient(135deg,var(--primary-color),#8b5cf6)' : 'linear-gradient(135deg,var(--secondary-color),var(--primary-color))'};color:#fff;border-radius:20px;font-size:0.7rem;font-weight:600;">${item.badge}</span>
                    </div>
                    <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:0.3rem;">${item.org}</p>
                    <p style="color:var(--primary-color);font-size:0.85rem;font-weight:600;margin-bottom:0.5rem;">${item.date}</p>
                    <ul style="list-style:none;padding:0;font-size:0.85rem;color:var(--text-secondary);">
                        ${item.details.map(d => `<li style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.2rem;"><i class="fas fa-check" style="color:var(--secondary-color);"></i> ${d}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `).join('');
    }

    // ===== بارگذاری اطلاعات تماس =====
    function loadContactInfo() {
        const info = document.getElementById('contactInfo');
        if (!info) return;
        info.innerHTML = `
            <div style="display:flex;align-items:flex-start;gap:1rem;">
                <div style="width:40px;height:40px;background:var(--bg-tertiary);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--primary-color);font-size:1.1rem;flex-shrink:0;"><i class="fas fa-phone"></i></div>
                <div style="flex:1;"><h4 style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:0.2rem;">تلفن تماس</h4><a href="tel:+989902279702" style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem;background:var(--bg-tertiary);border-radius:8px;text-decoration:none;color:var(--text-primary);transition:0.3s;"><span style="font-weight:600;">۰۹۹۰۲۲۷۹۷۰۲</span><span style="display:flex;align-items:center;gap:0.3rem;color:var(--text-secondary);font-size:0.8rem;"><i class="fas fa-phone-alt"></i> تماس</span></a></div>
            </div>
            <div style="display:flex;align-items:flex-start;gap:1rem;">
                <div style="width:40px;height:40px;background:var(--bg-tertiary);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--primary-color);font-size:1.1rem;flex-shrink:0;"><i class="fas fa-envelope"></i></div>
                <div style="flex:1;"><h4 style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:0.2rem;">ایمیل</h4><a href="mailto:mahan.neman2020@gmail.com" style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem;background:var(--bg-tertiary);border-radius:8px;text-decoration:none;color:var(--text-primary);transition:0.3s;"><span style="font-weight:600;">mahan.neman2020@gmail.com</span><span style="display:flex;align-items:center;gap:0.3rem;color:var(--text-secondary);font-size:0.8rem;"><i class="fas fa-paper-plane"></i> ارسال ایمیل</span></a></div>
            </div>
            <div style="display:flex;align-items:flex-start;gap:1rem;">
                <div style="width:40px;height:40px;background:var(--bg-tertiary);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--primary-color);font-size:1.1rem;flex-shrink:0;"><i class="fab fa-telegram"></i></div>
                <div style="flex:1;"><h4 style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:0.2rem;">تلگرام</h4><a href="https://t.me/mahanenman" target="_blank" style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem;background:var(--bg-tertiary);border-radius:8px;text-decoration:none;color:var(--text-primary);transition:0.3s;"><span style="font-weight:600;">@mahanenman</span><span style="display:flex;align-items:center;gap:0.3rem;color:var(--text-secondary);font-size:0.8rem;"><i class="fas fa-external-link-alt"></i> پیام</span></a></div>
            </div>
        `;
    }

    // ===== شمارنده‌ها =====
    const counters = document.querySelectorAll('.stat-number');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                counters.forEach(c => {
                    const target = parseInt(c.dataset.count);
                    let current = 0;
                    const interval = setInterval(() => {
                        current++;
                        if (current >= target) { c.textContent = target; clearInterval(interval); }
                        else c.textContent = current;
                    }, 50);
                });
                observer.disconnect();
            }
        });
    }, { threshold: 0.5 });
    const heroStats = document.querySelector('.hero-stats') || document.querySelector('.stat-number')?.closest('div');
    if (heroStats) observer.observe(heroStats);

    // ===== فرم تماس =====
    const contactForm = document.getElementById('contactForm');
    const formSuccess = document.getElementById('formSuccess');
    const closeSuccess = document.getElementById('closeSuccess');
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const btn = this.querySelector('button[type="submit"]');
            const textSpan = btn.querySelector('span:first-child');
            const loaderSpan = btn.querySelector('span:last-child');
            textSpan.style.opacity = '0';
            loaderSpan.style.opacity = '1';
            btn.disabled = true;
            try {
                await new Promise(resolve => setTimeout(resolve, 1500));
                this.style.display = 'none';
                formSuccess.style.display = 'flex';
                setTimeout(() => {
                    this.reset();
                    this.style.display = 'flex';
                    formSuccess.style.display = 'none';
                    textSpan.style.opacity = '1';
                    loaderSpan.style.opacity = '0';
                    btn.disabled = false;
                    document.getElementById('charCount').textContent = '0';
                }, 5000);
            } catch (e) {
                textSpan.style.opacity = '1';
                loaderSpan.style.opacity = '0';
                btn.disabled = false;
                alert('خطا در ارسال پیام. لطفاً مجدداً تلاش کنید.');
            }
        });
        const msgInput = document.getElementById('message');
        const charCount = document.getElementById('charCount');
        if (msgInput && charCount) {
            msgInput.addEventListener('input', function() {
                charCount.textContent = this.value.length;
                if (this.value.length > 500) {
                    this.value = this.value.substring(0, 500);
                    charCount.textContent = 500;
                }
            });
        }
    }
    if (closeSuccess) {
        closeSuccess.addEventListener('click', function() {
            formSuccess.style.display = 'none';
            contactForm.style.display = 'flex';
        });
    }

    // ===== پیمایش نرم برای لینک‌های داخلی =====
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        if (a.closest('.slide-menu-list')) return;
        a.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                window.scrollTo({ top: target.offsetTop - 70, behavior: 'smooth' });
            }
        });
    });

    // ===== بارگذاری اولیه =====
    loadArticles();
    loadSkills();
    loadCertificates();
    loadEducation();
    loadContactInfo();

    // ===== آپدیت سال در فوتر =====
    const yearEl = document.querySelector('.copyright p:first-child');
    if (yearEl) {
        const persianYear = new Date().getFullYear() - 621;
        yearEl.innerHTML = yearEl.innerHTML.replace('۱۴۰۳', persianYear);
    }
});
