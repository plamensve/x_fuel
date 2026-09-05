(() => {
    if (window.__GORIVA_GLOBAL_NAV__) return;
    window.__GORIVA_GLOBAL_NAV__ = true;

    const navItems = [
        { href: "/", label: "Начало", symbol: "⌂", match: ["/", "/index.html"] },
        { href: "/pages/useful.html", label: "Полезно", symbol: "✦", match: ["/pages/useful.html"] },
        { href: "/pages/trends.html", label: "История", symbol: "↗", match: ["/pages/trends.html"] },
        { href: "/pages/weather.html", label: "Времето", symbol: "☼", match: ["/pages/weather.html"] },
        { href: "/pages/business-clients.html", label: "За бизнеса", symbol: "◆", match: ["/pages/business-clients.html"] },
        { href: "/pages/news.html", label: "Новини", symbol: "▤", match: ["/pages/news.html", "/pages/articles/"] },
        { href: "/pages/rules.html", label: "Условия", symbol: "✓", match: ["/pages/rules.html"] }
    ];

    const normalizePath = value => {
        const path = (value || "/").replace(/\/+/g, "/");
        return path !== "/" ? path.replace(/\/$/, "") : path;
    };

    const isActive = item => {
        const path = normalizePath(window.location.pathname);
        return item.match.some(match => match.endsWith("/") ? path.startsWith(match) : path === normalizePath(match));
    };

    function ensureStyles() {
        if (document.getElementById("goriva-global-progress-css")) return;
        const link = document.createElement("link");
        link.id = "goriva-global-progress-css";
        link.rel = "stylesheet";
        link.href = "/pages/styles/global-progress.css?v=20260831-perf2";
        document.head.appendChild(link);
    }

    function buildScrollProgress() {
        if (!document.body || document.querySelector(".goriva-scroll-progress")) return;
        const progress = document.createElement("div");
        progress.className = "goriva-scroll-progress";
        progress.setAttribute("aria-hidden", "true");
        progress.innerHTML = '<span class="goriva-scroll-progress-bar"></span>';
        document.body.prepend(progress);

        const bar = progress.firstElementChild;
        let ticking = false;
        const update = () => {
            const doc = document.documentElement;
            const max = Math.max(1, doc.scrollHeight - window.innerHeight);
            bar.style.transform = `scaleX(${Math.min(1, Math.max(0, window.scrollY / max))})`;
            ticking = false;
        };
        const requestUpdate = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(update);
        };
        update();
        addEventListener("scroll", requestUpdate, { passive: true });
        addEventListener("resize", requestUpdate, { passive: true });
    }

    function buildHeader() {
        if (!document.body || document.querySelector(".goriva-global-header")) return;

        const legacyHeader = document.querySelector("body > .header-bar");
        const legacyNav = document.querySelector("body > .main-nav");
        const businessHeader = document.querySelector("body > .business-header");
        const target = legacyHeader || businessHeader || legacyNav || document.body.firstElementChild;

        const header = document.createElement("header");
        header.className = "goriva-global-header";
        header.innerHTML = `
            <div class="goriva-global-nav-shell">
                <a class="goriva-global-brand" href="/" aria-label="goriva.online — Начало">
                    <img src="/media/2logo.png" alt="goriva.online logo" width="48" height="48" decoding="async">
                    <span class="goriva-global-brand-copy"><strong>goriva.online</strong><span><i aria-hidden="true"></i>Актуални цени в България</span></span>
                </a>
                <nav class="goriva-global-nav" aria-label="Основна навигация">
                    <button class="goriva-global-menu-toggle" type="button" aria-label="Отвори менюто" aria-expanded="false" aria-controls="goriva-global-menu">
                        <span class="goriva-global-menu-icon" aria-hidden="true"><b></b><b></b><b></b></span>
                    </button>
                    <div id="goriva-global-menu" class="goriva-global-menu">
                        ${navItems.map(item => `<a href="${item.href}" data-symbol="${item.symbol}" ${isActive(item) ? 'class="is-active" aria-current="page"' : ""}><span class="goriva-nav-symbol" aria-hidden="true">${item.symbol}</span><span>${item.label}</span></a>`).join("")}
                    </div>
                </nav>
                <div class="goriva-global-actions" aria-label="Статус на данните">
                    <span class="goriva-data-status" role="status"><span class="goriva-data-status-dot" aria-hidden="true"></span><span>Актуални данни днес</span></span>
                </div>
            </div>`;

        if (target) target.before(header);
        else document.body.prepend(header);
        [legacyHeader, legacyNav, businessHeader].forEach(node => node?.remove());
        document.body.classList.add("has-goriva-global-nav");

        const toggle = header.querySelector(".goriva-global-menu-toggle");
        const menu = header.querySelector(".goriva-global-menu");
        const closeMenu = () => {
            menu?.classList.remove("is-open");
            toggle?.setAttribute("aria-expanded", "false");
            document.body.classList.remove("goriva-menu-open");
        };
        toggle?.addEventListener("click", event => {
            event.stopPropagation();
            const open = menu.classList.toggle("is-open");
            toggle.setAttribute("aria-expanded", String(open));
            document.body.classList.toggle("goriva-menu-open", open);
        });
        menu?.addEventListener("click", event => {
            if (event.target.closest("a")) closeMenu();
        });
        document.addEventListener("click", event => {
            if (menu?.classList.contains("is-open") && !menu.contains(event.target) && !toggle?.contains(event.target)) closeMenu();
        });
        document.addEventListener("keydown", event => {
            if (event.key === "Escape") closeMenu();
        });

        let scrollTicking = false;
        const updateScrollState = () => {
            header.classList.toggle("is-scrolled", window.scrollY > 10);
            scrollTicking = false;
        };
        addEventListener("scroll", () => {
            if (scrollTicking) return;
            scrollTicking = true;
            requestAnimationFrame(updateScrollState);
        }, { passive: true });
        updateScrollState();
    }

    function buildFooter() {
        if (!document.body || document.querySelector("body > .goriva-global-footer")) return;
        const currentFooter = document.querySelector("body > .site-footer");
        const footer = document.createElement("footer");
        footer.className = "site-footer goriva-global-footer";
        footer.innerHTML = `
            <div class="footer-container">
                <div class="footer-column footer-brand">
                    <a href="/" class="footer-brand-link" aria-label="goriva.online - Начало"><img src="/media/footer-logo.png" alt="goriva.online logo" class="footer-logo" loading="lazy" decoding="async"></a>
                    <p class="footer-brand-copy">Практична платформа за актуални и исторически цени на горивата в България — по градове, бензиностанции и вид гориво.</p>
                    <div class="footer-data-note">Данните имат информационен характер и могат да се различават от цените на място.</div>
                </div>
                <div class="footer-column"><h4>Данни и инструменти</h4><ul class="footer-links"><li><a href="/">Текущи цени</a></li><li><a href="/pages/trends.html">История на цените</a></li><li><a href="/pages/useful.html">Полезно</a></li><li><a href="/pages/weather.html">Прогноза за времето</a></li></ul></div>
                <div class="footer-column"><h4>goriva.online</h4><ul class="footer-links"><li><a href="/pages/news.html">Новини</a></li><li><a href="/pages/business-clients.html">Бизнес клиенти</a></li><li><a href="/pages/rules.html">Общи условия</a></li><li><a href="/pages/privacy.html">Политика за поверителност</a></li><li><a href="/#fuel-form">Сподели цена</a></li></ul></div>
                <div class="footer-column footer-contact-column">
                    <h4>Контакт</h4>
                    <div class="footer-contact-list"><div class="contact-item"><span class="contact-icon" aria-hidden="true">☎</span><a href="tel:+359883427273">+359 883 427 273</a></div><div class="contact-item"><span class="contact-icon" aria-hidden="true">✉</span><a href="mailto:svetoslavov.plamen@gmail.com">svetoslavov.plamen@gmail.com</a></div></div>
                    <div class="social-icons" aria-label="Социални мрежи">
                        <a href="https://www.facebook.com/plamen.sve" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/facebook.svg" alt="" width="20" height="20" loading="lazy"></a>
                        <a href="https://www.instagram.com/goriva.online/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/instagram.svg" alt="" width="20" height="20" loading="lazy"></a>
                        <a href="https://www.linkedin.com/in/plamen-svetoslavov/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/linkedin.svg" alt="" width="20" height="20" loading="lazy"></a>
                        <a href="https://wa.me/359883427273" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/whatsapp.svg" alt="" width="20" height="20" loading="lazy"></a>
                    </div>
                </div>
            </div>
            <div class="footer-bottom"><div class="footer-bottom-meta"><span>© 2026 goriva.online</span><span class="footer-separator">•</span><span>Цени на горивата в България</span></div><span class="footer-status">Платформата е активна</span></div>`;
        if (currentFooter) currentFooter.replaceWith(footer);
        else document.body.appendChild(footer);
    }

    function initGlobalShell() {
        ensureStyles();
        buildHeader();
        buildFooter();
        buildScrollProgress();
    }

    if (document.body && (document.querySelector("body > .header-bar") || document.querySelector("body > .main-nav") || document.querySelector("body > .business-header"))) {
        initGlobalShell();
    } else if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initGlobalShell, { once: true });
    } else {
        initGlobalShell();
    }
})();
