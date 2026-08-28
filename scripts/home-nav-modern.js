(() => {
    const ASSET_VERSION = "20260828-2038";
    const header = document.querySelector("body > .header-bar");
    const nav = document.querySelector("body > .main-nav");
    const headerContainer = header?.querySelector(".header-container");
    const logo = headerContainer?.querySelector(".header-logo");
    const facebook = headerContainer?.querySelector(".facebook-button");

    if (!header || !nav || !headerContainer || !logo) return;

    document.body.classList.add("has-modern-home-nav");

    const refreshTop4Stylesheet = () => {
        const top4Styles = document.getElementById("home-top10-cards-css");
        if (!top4Styles) return false;

        const freshHref = `pages/styles/home-top10-cards.css?v=${ASSET_VERSION}`;
        if (!top4Styles.getAttribute("href")?.includes(`v=${ASSET_VERSION}`)) {
            top4Styles.href = freshHref;
        }
        return true;
    };

    if (!refreshTop4Stylesheet()) {
        const observer = new MutationObserver(() => {
            if (refreshTop4Stylesheet()) observer.disconnect();
        });
        observer.observe(document.head, {childList: true});
    }

    if (!headerContainer.querySelector(".home-nav-brand")) {
        const brand = document.createElement("a");
        brand.className = "home-nav-brand";
        brand.href = "index.html";
        brand.setAttribute("aria-label", "goriva.online — начало");

        const copy = document.createElement("span");
        copy.className = "home-nav-brand-copy";
        copy.innerHTML = "<strong>goriva.online</strong><span>Актуални цени в България</span>";

        brand.appendChild(logo);
        brand.appendChild(copy);
        headerContainer.prepend(brand);
    }

    if (!headerContainer.querySelector(".home-nav-actions")) {
        const actions = document.createElement("div");
        actions.className = "home-nav-actions";

        const submit = document.createElement("a");
        submit.className = "home-nav-submit";
        submit.href = "#fuel-form";
        submit.textContent = "Сподели цена";
        submit.setAttribute("aria-label", "Сподели актуална цена на гориво");

        actions.appendChild(submit);

        if (facebook) {
            facebook.textContent = "Facebook";
            facebook.rel = "noopener noreferrer";
            facebook.setAttribute("aria-label", "Отвори Facebook общността на goriva.online");
            actions.appendChild(facebook);
        }

        headerContainer.appendChild(actions);
    }

    const navItems = [
        ["index.html", "⌂", "Начало"],
        ["pages/useful.html", "✦", "Полезно"],
        ["pages/trends.html", "↗", "История"],
        ["pages/weather.html", "☼", "Времето"],
        ["pages/business-clients.html", "◆", "За бизнеса"],
        ["pages/news.html", "▤", "Новини"],
        ["pages/rules.html", "✓", "Условия"]
    ];

    navItems.forEach(([href, symbol, label]) => {
        const link = nav.querySelector(`.nav-container a[href="${href}"]`);
        if (!link) return;
        link.dataset.navSymbol = symbol;
        link.textContent = label;
        if (href === "index.html") link.setAttribute("aria-current", "page");
    });

    const updateScrollState = () => {
        header.classList.toggle("is-scrolled", window.scrollY > 12);
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, {passive: true});

    nav.querySelectorAll(".nav-container a").forEach(link => {
        link.addEventListener("click", () => {
            nav.querySelector(".nav-container")?.classList.remove("open");
        });
    });
})();
