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
                top: 52%;
                left: 57%;
                right: auto;
                transform: translate(-50%, -50%);
                width: min(44%, 560px);
                min-width: 360px;
                padding: 22px 24px;
                border: 1px solid rgba(96,165,250,.20);
                border-radius: 18px;
                background:
                    radial-gradient(circle at 100% 0%, rgba(59,130,246,.15), transparent 42%),
                    linear-gradient(145deg, rgba(15,29,47,.90), rgba(10,22,38,.95));
                box-shadow: 0 16px 34px rgba(2,6,23,.20), inset 0 1px 0 rgba(255,255,255,.03);
                text-align: center;
            }

            .home-top4-ad-banner .home-top4-ad-label {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                margin-bottom: 10px;
                padding: 6px 10px;
                border: 1px solid rgba(250,204,21,.18);
                border-radius: 999px;
                color: #fde68a;
                background: rgba(250,204,21,.065);
                font-size: 10px;
                font-weight: 900;
                letter-spacing: .10em;
                text-transform: uppercase;
            }

            .home-top4-ad-banner strong {
                display: block;
                margin: 0 0 8px;
                color: #f8fafc;
                font-size: clamp(21px, 2vw, 26px);
                line-height: 1.18;
                letter-spacing: -.02em;
            }

            .home-top4-ad-banner p {
                max-width: 500px;
                margin: 0 auto;
                color: #a8b8ca;
                font-size: 13px;
                line-height: 1.6;
            }

            .home-top4-ad-banner .home-top4-ad-accent {
                display: inline-block;
                margin-top: 12px;
                color: #93c5fd;
                font-size: 11px;
                font-weight: 850;
            }

            /* Give the winner badge and selected fuel clear visual separation. */
            .home-top10-card.rank-1 .home-top10-fuel-pill {
                position: relative;
                top: 32px;
                padding: 8px 13px;
                font-size: 12px;
                line-height: 1;
                font-weight: 900;
                letter-spacing: .025em;
                border-color: rgba(34,197,94,.22);
                background: rgba(34,197,94,.085);
            }

            @media (max-width: 1100px) {
                .home-top10-card.rank-1 .home-top4-ad-banner {
                    left: 60%;
                    width: min(43%, 500px);
                    min-width: 320px;
                    padding: 19px 20px;
                }

                .home-top4-ad-banner strong { font-size: 20px; }
                .home-top4-ad-banner p { font-size: 12px; }
            }

            @media (max-width: 980px) {
                .home-top10-card.rank-1 .home-top4-ad-banner {
                    position: relative;
                    top: auto;
                    left: auto;
                    right: auto;
                    transform: none;
                    width: 100%;
                    min-width: 0;
                    margin-top: 22px;
                }

                .home-top10-card.rank-1 .home-top10-card-copy h3,
                .home-top10-card.rank-1 .home-top10-card-copy p {
                    max-width: 100%;
                }
            }

            @media (max-width: 560px) {
                .home-top10-card.rank-1 .home-top4-ad-banner {
                    padding: 16px;
                    border-radius: 14px;
                }

                .home-top4-ad-banner strong { font-size: 18px; }
                .home-top4-ad-banner p { font-size: 12px; }

                .home-top10-card.rank-1 .home-top10-fuel-pill {
                    top: 22px;
                    padding: 7px 11px;
                    font-size: 11px;
                }
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
