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

    function buildHeader() {
        if (!document.body || document.querySelector(".goriva-global-header")) return;

        const legacyHeader = document.querySelector("body > .header-bar");
        const legacyNav = document.querySelector("body > .main-nav");
        const businessHeader = document.querySelector("body > .business-header");
        const insertionTarget = legacyHeader || businessHeader || legacyNav || document.body.firstElementChild;

        const header = document.createElement("header");
        header.className = "goriva-global-header";
        header.innerHTML = `
            <div class="goriva-global-nav-shell">
                <a class="goriva-global-brand" href="/" aria-label="goriva.online — Начало">
                    <img src="/media/2logo.png" alt="goriva.online logo" width="48" height="48">
                    <span class="goriva-global-brand-copy">
                        <strong>goriva.online</strong>
                        <span><i aria-hidden="true"></i>Актуални цени в България</span>
                    </span>
                </a>

                <nav class="goriva-global-nav" aria-label="Основна навигация">
                    <button class="goriva-global-menu-toggle" type="button" aria-label="Отвори менюто" aria-expanded="false" aria-controls="goriva-global-menu">
                        <span class="goriva-global-menu-icon" aria-hidden="true"><b></b><b></b><b></b></span>
                    </button>
                    <div id="goriva-global-menu" class="goriva-global-menu">
                        ${navItems.map(item => `
                            <a href="${item.href}" data-symbol="${item.symbol}" ${isActive(item) ? 'class="is-active" aria-current="page"' : ""}>
                                <span class="goriva-nav-symbol" aria-hidden="true">${item.symbol}</span>
                                <span>${item.label}</span>
                            </a>
                        `).join("")}
                    </div>
                </nav>

                <div class="goriva-global-actions">
                    <a class="goriva-share-price-cta" href="/#fuel-form"><span aria-hidden="true">＋</span>Сподели цена</a>
                    <a class="goriva-facebook-cta" href="https://www.facebook.com/groups/960591129738525" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">f</span>Facebook</a>
                </div>
            </div>
        `;

        if (insertionTarget && insertionTarget !== document.body.firstElementChild) {
            insertionTarget.before(header);
        } else if (insertionTarget) {
            document.body.insertBefore(header, insertionTarget);
        } else {
            document.body.prepend(header);
        }

        [legacyHeader, legacyNav, businessHeader].forEach(node => {
            if (node && node !== header) node.remove();
        });

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

        menu?.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
        document.addEventListener("click", event => {
            if (!menu?.classList.contains("is-open")) return;
            if (menu.contains(event.target) || toggle?.contains(event.target)) return;
            closeMenu();
        });
        document.addEventListener("keydown", event => {
            if (event.key === "Escape") closeMenu();
        });
        window.addEventListener("resize", () => {
            if (window.innerWidth > 900) closeMenu();
        }, { passive: true });

        const updateScrollState = () => header.classList.toggle("is-scrolled", window.scrollY > 10);
        updateScrollState();
        window.addEventListener("scroll", updateScrollState, { passive: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", buildHeader, { once: true });
    } else {
        buildHeader();
    }
})();
