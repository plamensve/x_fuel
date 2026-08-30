(() => {
    const ASSET_VERSION = "20260830-1635";
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
            facebook.className = "facebook-button instagram-nav-button";
            facebook.href = "https://www.instagram.com/goriva.online/";
            facebook.textContent = "Instagram";
            facebook.rel = "noopener noreferrer";
            facebook.setAttribute("aria-label", "Отвори goriva.online в Instagram");
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

    const hero = document.querySelector(".about-project .about-inner");
    const heroCta = hero?.querySelector(".about-cta");
    if (hero && heroCta && !hero.querySelector(".instagram-follow-hook")) {
        heroCta.querySelector(".facebook-button-1")?.remove();
        heroCta.querySelector(".instagram-button-1")?.remove();

        const card = document.createElement("a");
        card.className = "instagram-follow-hook";
        card.href = "https://www.instagram.com/goriva.online/";
        card.target = "_blank";
        card.rel = "noopener noreferrer";
        card.setAttribute("aria-label", "Последвай goriva.online в Instagram за ежедневни цени на горивата");
        card.innerHTML = `
            <span class="instagram-follow-icon" aria-hidden="true">◎</span>
            <span class="instagram-follow-copy">
                <strong>Искаш да виждаш най-ниските цени всеки ден?</strong>
                <span>Последвай @goriva.online в Instagram за ежедневни цени, сравнения и полезна информация за шофьори.</span>
            </span>
            <span class="instagram-follow-action">Последвай ни →</span>
        `;
        hero.appendChild(card);
    }

    if (!document.getElementById("instagram-follow-hook-styles")) {
        const style = document.createElement("style");
        style.id = "instagram-follow-hook-styles";
        style.textContent = `
            .instagram-nav-button {
                background: linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045) !important;
                border-color: rgba(255,255,255,.18) !important;
                box-shadow: 0 8px 22px rgba(193,53,132,.24) !important;
            }
            .instagram-nav-button::before {
                content: "◎" !important;
                color: #fff !important;
                background: rgba(255,255,255,.14) !important;
            }
            .instagram-follow-hook {
                max-width: 760px;
                margin: 22px auto 0;
                padding: 16px 18px;
                display: grid;
                grid-template-columns: 42px minmax(0,1fr) auto;
                align-items: center;
                gap: 14px;
                border: 1px solid rgba(193,53,132,.18);
                border-radius: 16px;
                background: linear-gradient(135deg, rgba(131,58,180,.08), rgba(253,29,29,.05), rgba(252,176,69,.08));
                color: #172033;
                text-decoration: none;
                box-shadow: 0 12px 28px rgba(15,23,42,.08);
                transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
            }
            .instagram-follow-hook:hover {
                transform: translateY(-2px);
                border-color: rgba(193,53,132,.32);
                box-shadow: 0 16px 34px rgba(15,23,42,.12);
            }
            .instagram-follow-icon {
                width: 42px;
                height: 42px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 12px;
                color: #fff;
                background: linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045);
                font-size: 24px;
                font-weight: 800;
            }
            .instagram-follow-copy {
                min-width: 0;
                text-align: left;
            }
            .instagram-follow-copy strong {
                display: block;
                margin-bottom: 4px;
                color: #111827;
                font-size: 15px;
                line-height: 1.35;
            }
            .instagram-follow-copy span {
                display: block;
                color: #64748b;
                font-size: 13px;
                line-height: 1.5;
            }
            .instagram-follow-action {
                white-space: nowrap;
                padding: 10px 14px;
                border-radius: 10px;
                color: #fff;
                background: linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045);
                font-size: 13px;
                font-weight: 750;
            }
            @media (max-width: 700px) {
                .instagram-follow-hook {
                    grid-template-columns: 40px minmax(0,1fr);
                    padding: 14px;
                }
                .instagram-follow-action {
                    grid-column: 1 / -1;
                    text-align: center;
                }
            }
        `;
        document.head.appendChild(style);
    }

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

(() => {
    if (document.querySelector('script[data-home-fuel-poll]')) return;

    const pollScript = document.createElement("script");
    pollScript.src = "scripts/home-fuel-poll.js?v=20260829-1730";
    pollScript.defer = true;
    pollScript.dataset.homeFuelPoll = "true";
    document.body.appendChild(pollScript);
})();
