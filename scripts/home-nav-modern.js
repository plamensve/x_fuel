(() => {
    const ASSET_VERSION = "20260830-1650";
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
    if (hero && heroCta) {
        heroCta.querySelector(".facebook-button-1")?.remove();
        heroCta.querySelector(".instagram-button-1")?.remove();

        let banner = hero.querySelector(".instagram-follow-banner");
        if (!banner) {
            banner = document.createElement("a");
            banner.className = "instagram-follow-banner";
            banner.href = "https://www.instagram.com/goriva.online/";
            banner.target = "_blank";
            banner.rel = "noopener noreferrer";
            banner.setAttribute("aria-label", "Последвай goriva.online в Instagram за ежедневни цени на горивата");
            banner.innerHTML = `
                <span class="instagram-banner-icon" aria-hidden="true">
                    <span class="instagram-banner-camera">◎</span>
                </span>
                <span class="instagram-banner-copy">
                    <span class="instagram-banner-eyebrow">ЦЕНИТЕ ВСЕКИ ДЕН В INSTAGRAM</span>
                    <strong>Искаш да си информиран за цените на горивата всеки ден?</strong>
                    <span class="instagram-banner-text">Следвай <b>@goriva.online</b> и виждай актуални цени, най-евтини бензиностанции и кратки сравнения директно във фийда си.</span>
                </span>
                <span class="instagram-banner-action">
                    <span>Последвай ни</span>
                    <span aria-hidden="true">→</span>
                </span>
            `;
            heroCta.insertAdjacentElement("afterend", banner);
        }
    }

    if (!document.getElementById("instagram-follow-banner-styles")) {
        const style = document.createElement("style");
        style.id = "instagram-follow-banner-styles";
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
            .about-project .about-cta {
                margin-bottom: 0;
            }
            .instagram-follow-banner {
                position: relative;
                max-width: 820px;
                margin: 22px auto 0;
                padding: 18px 20px;
                display: grid;
                grid-template-columns: 54px minmax(0, 1fr) auto;
                align-items: center;
                gap: 16px;
                overflow: hidden;
                border: 1px solid rgba(193, 53, 132, .18);
                border-radius: 18px;
                background:
                    radial-gradient(circle at 0% 50%, rgba(131,58,180,.12), transparent 34%),
                    radial-gradient(circle at 100% 50%, rgba(252,176,69,.13), transparent 38%),
                    linear-gradient(135deg, rgba(255,255,255,.98), rgba(255,248,251,.96));
                color: #172033;
                text-decoration: none;
                box-shadow: 0 14px 34px rgba(15,23,42,.10), 0 3px 8px rgba(193,53,132,.06);
                transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
                isolation: isolate;
            }
            .instagram-follow-banner::before {
                content: "";
                position: absolute;
                inset: 0 auto 0 0;
                width: 4px;
                background: linear-gradient(180deg, #833ab4, #fd1d1d, #fcb045);
            }
            .instagram-follow-banner::after {
                content: "";
                position: absolute;
                width: 180px;
                height: 180px;
                right: -90px;
                top: -95px;
                border-radius: 50%;
                background: rgba(252,176,69,.08);
                z-index: -1;
            }
            .instagram-follow-banner:hover {
                transform: translateY(-2px);
                border-color: rgba(193,53,132,.32);
                box-shadow: 0 18px 42px rgba(15,23,42,.13), 0 4px 12px rgba(193,53,132,.10);
            }
            .instagram-banner-icon {
                width: 54px;
                height: 54px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 16px;
                background: linear-gradient(135deg, #833ab4 0%, #c13584 35%, #fd1d1d 68%, #fcb045 100%);
                box-shadow: 0 8px 20px rgba(193,53,132,.22);
            }
            .instagram-banner-camera {
                width: 27px;
                height: 27px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border: 2px solid #fff;
                border-radius: 8px;
                color: #fff;
                font-size: 17px;
                line-height: 1;
                font-weight: 800;
            }
            .instagram-banner-copy {
                min-width: 0;
                text-align: left;
            }
            .instagram-banner-eyebrow {
                display: block;
                margin-bottom: 4px;
                color: #a72b72;
                font-size: 10px;
                font-weight: 850;
                letter-spacing: .08em;
            }
            .instagram-banner-copy strong {
                display: block;
                margin-bottom: 5px;
                color: #172033;
                font-size: 16px;
                line-height: 1.35;
                letter-spacing: -.01em;
            }
            .instagram-banner-text {
                display: block;
                color: #68758a;
                font-size: 12px;
                line-height: 1.5;
            }
            .instagram-banner-text b {
                color: #a72b72;
                font-weight: 750;
            }
            .instagram-banner-action {
                min-height: 42px;
                padding: 0 16px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 9px;
                border-radius: 12px;
                color: #fff;
                background: linear-gradient(135deg, #833ab4, #c13584 45%, #fd1d1d 75%, #fcb045);
                box-shadow: 0 9px 20px rgba(193,53,132,.20);
                font-size: 13px;
                font-weight: 800;
                white-space: nowrap;
            }
            .instagram-follow-banner:hover .instagram-banner-action {
                box-shadow: 0 11px 24px rgba(193,53,132,.28);
            }
            @media (max-width: 760px) {
                .instagram-follow-banner {
                    grid-template-columns: 48px minmax(0,1fr);
                    padding: 16px;
                    gap: 13px;
                }
                .instagram-banner-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 14px;
                }
                .instagram-banner-action {
                    grid-column: 1 / -1;
                    width: 100%;
                    min-height: 44px;
                }
            }
            @media (max-width: 520px) {
                .instagram-follow-banner {
                    margin-top: 18px;
                    border-radius: 16px;
                }
                .instagram-banner-copy strong {
                    font-size: 14px;
                }
                .instagram-banner-text {
                    font-size: 11px;
                }
                .instagram-banner-eyebrow {
                    font-size: 9px;
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
