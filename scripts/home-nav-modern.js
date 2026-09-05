// The shared global navigation is the authoritative header/navigation renderer.
// This legacy homepage module previously rebuilt the same header first, injected
// a large duplicate style block and then got replaced again by global-nav.js.
// Keep only the unique homepage poll bootstrap so the visible functionality is
// unchanged without doing duplicate DOM/layout work on the critical path.
(() => {
    if (document.querySelector('script[data-home-fuel-poll]')) return;

    const pollScript = document.createElement("script");
    pollScript.src = "scripts/home-fuel-poll.js?v=20260831-perf2";
    pollScript.defer = true;
    pollScript.dataset.homeFuelPoll = "true";
    document.body.appendChild(pollScript);
})();

// Load the final homepage daily-prices presentation layer after legacy styles.
(() => {
    if (document.querySelector('link[data-home-prices-light-pro]')) return;

    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = "/pages/styles/home-prices-light-pro.css?v=20260905-2154";
    style.dataset.homePricesLightPro = "true";
    document.head.appendChild(style);
})();

// Final date badge treatment: decorative, compact and visually distinct from controls.
(() => {
    if (document.getElementById("home-prices-date-badge-style")) return;

    const style = document.createElement("style");
    style.id = "home-prices-date-badge-style";
    style.textContent = `
        main.container > .prices-card #prices-date {
            display: inline-flex !important;
            align-items: center !important;
            gap: 7px !important;
            min-height: 36px !important;
            margin-left: 10px !important;
            padding: 0 14px !important;
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 36%, #db2777 70%, #ea580c 100%) !important;
            border: 1px solid rgba(255,255,255,.28) !important;
            border-radius: 999px !important;
            box-shadow: 0 8px 20px rgba(124,58,237,.18), inset 0 1px 0 rgba(255,255,255,.24) !important;
            font-size: 14px !important;
            font-weight: 900 !important;
            letter-spacing: .01em !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
        }

        main.container > .prices-card #prices-date::before {
            content: "▣" !important;
            width: 20px !important;
            height: 20px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 6px !important;
            color: #ffffff !important;
            background: rgba(255,255,255,.16) !important;
            box-shadow: inset 0 0 0 1px rgba(255,255,255,.12) !important;
            font-size: 11px !important;
            line-height: 1 !important;
        }

        @media (max-width: 760px) {
            main.container > .prices-card #prices-date {
                margin: 9px 0 0 !important;
                min-height: 34px !important;
                padding: 0 12px !important;
                font-size: 13px !important;
            }
        }
    `;
    document.head.appendChild(style);
})();

// Remove the legacy parentheses that script-base.js adds around the current date.
(() => {
    const cleanPriceDate = () => {
        const date = document.getElementById("prices-date");
        if (!date) return;
        const clean = date.textContent.trim().replace(/^\(\s*/, "").replace(/\s*\)$/, "");
        if (date.textContent !== clean) date.textContent = clean;
    };

    const init = () => {
        cleanPriceDate();
        const date = document.getElementById("prices-date");
        if (!date) return;
        const observer = new MutationObserver(cleanPriceDate);
        observer.observe(date, { childList: true, characterData: true, subtree: true });
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();

// Use the unused space in the #1 Top 4 card as a tasteful advertising placement teaser.
(() => {
    if (!document.getElementById("home-top4-ad-style")) {
        const style = document.createElement("style");
        style.id = "home-top4-ad-style";
        style.textContent = `
            .home-top10-card.rank-1 .home-top4-ad-banner {
                position: absolute;
                z-index: 3;
                top: 78px;
                right: 24px;
                width: min(38%, 430px);
                min-width: 300px;
                padding: 16px 17px;
                border: 1px solid rgba(96,165,250,.18);
                border-radius: 15px;
                background:
                    radial-gradient(circle at 100% 0%, rgba(59,130,246,.13), transparent 42%),
                    linear-gradient(145deg, rgba(15,29,47,.86), rgba(10,22,38,.92));
                box-shadow: 0 12px 28px rgba(2,6,23,.16), inset 0 1px 0 rgba(255,255,255,.025);
                text-align: left;
            }

            .home-top4-ad-banner .home-top4-ad-label {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                margin-bottom: 8px;
                padding: 5px 8px;
                border: 1px solid rgba(250,204,21,.16);
                border-radius: 999px;
                color: #fde68a;
                background: rgba(250,204,21,.055);
                font-size: 9px;
                font-weight: 900;
                letter-spacing: .09em;
                text-transform: uppercase;
            }

            .home-top4-ad-banner strong {
                display: block;
                margin: 0 0 6px;
                color: #f8fafc;
                font-size: 17px;
                line-height: 1.25;
                letter-spacing: -.015em;
            }

            .home-top4-ad-banner p {
                margin: 0;
                color: #9fb0c2;
                font-size: 11px;
                line-height: 1.55;
            }

            .home-top4-ad-banner .home-top4-ad-accent {
                display: inline-block;
                margin-top: 10px;
                color: #93c5fd;
                font-size: 10px;
                font-weight: 800;
            }

            @media (max-width: 980px) {
                .home-top10-card.rank-1 .home-top4-ad-banner {
                    position: relative;
                    top: auto;
                    right: auto;
                    width: 100%;
                    min-width: 0;
                    margin-top: 18px;
                }

                .home-top10-card.rank-1 .home-top10-card-copy h3,
                .home-top10-card.rank-1 .home-top10-card-copy p {
                    max-width: 100%;
                }
            }

            @media (max-width: 560px) {
                .home-top10-card.rank-1 .home-top4-ad-banner {
                    padding: 14px;
                    border-radius: 13px;
                }

                .home-top4-ad-banner strong { font-size: 15px; }
            }
        `;
        document.head.appendChild(style);
    }

    const addAdvertisingBanner = () => {
        const winner = document.querySelector(".home-top10-card.rank-1");
        if (!winner || winner.querySelector(".home-top4-ad-banner")) return;

        const banner = document.createElement("aside");
        banner.className = "home-top4-ad-banner";
        banner.setAttribute("aria-label", "Място за реклама и продуктово позициониране");
        banner.innerHTML = `
            <span class="home-top4-ad-label">Реклама</span>
            <strong>Място за Вашата реклама</strong>
            <p>Предлагаме продуктово позициониране и брандирано присъствие пред аудитория, която активно сравнява цени и услуги за автомобили.</p>
            <span class="home-top4-ad-accent">Продуктово позициониране · Бранд присъствие</span>
        `;

        const footer = winner.querySelector(".home-top10-card-footer");
        if (footer) winner.insertBefore(banner, footer);
        else winner.appendChild(banner);
    };

    const init = () => {
        addAdvertisingBanner();
        const root = document.querySelector(".home-top10-card-grid") || document.body;
        const observer = new MutationObserver(addAdvertisingBanner);
        observer.observe(root, { childList: true, subtree: true });
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
