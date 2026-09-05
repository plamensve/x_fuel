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
            /* Keep city controls on the left and fuel controls anchored to the far right. */
            .home-top10-controls {
                grid-template-columns: minmax(0, 1fr) max-content !important;
            }

            .home-top10-controls .home-top10-control-group:last-child {
                width: max-content;
                max-width: 100%;
                justify-self: end;
            }

            .home-top10-controls .home-top10-control-group:last-child .home-top10-tabs {
                justify-content: flex-end;
            }

            .home-top10-card.rank-1 .home-top4-ad-banner {
                position: absolute;
                z-index: 3;
                top: calc(52% - 26px);
                left: 58%;
                right: auto;
                transform: translate(-50%, -50%);
                width: min(54%, 760px);
                min-width: 430px;
                padding: 22px 26px;
                border: 1px solid rgba(96,165,250,.20);
                border-radius: 18px;
                background:
                    radial-gradient(circle at 100% 0%, rgba(59,130,246,.15), transparent 42%),
                    linear-gradient(145deg, rgba(15,29,47,.90), rgba(10,22,38,.95));
                box-shadow: 0 16px 34px rgba(2,6,23,.20), inset 0 1px 0 rgba(255,255,255,.03);
                text-align: left;
            }

            .home-top4-ad-banner .home-top4-ad-label {
                display: inline-flex;
                align-items: center;
                justify-content: flex-start;
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
                max-width: none;
                margin: 0;
                color: #a8b8ca;
                font-size: 13px;
                line-height: 1.6;
            }

            .home-top4-ad-banner .home-top4-ad-contact {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 8px 18px;
                margin-top: 14px;
                padding-top: 12px;
                border-top: 1px solid rgba(148,163,184,.12);
            }

            .home-top4-ad-contact a,
            .home-top4-ad-contact span {
                color: #f8fafc;
                font-size: 12px;
                font-weight: 850;
                letter-spacing: .005em;
                text-decoration: none;
            }

            .home-top4-ad-contact a:hover {
                color: #93c5fd;
            }

            .home-top4-ad-banner .home-top4-ad-accent {
                display: inline-block;
                margin-top: 11px;
                color: #93c5fd;
                font-size: 11px;
                font-weight: 850;
            }

            /* Keep the selected product in its original right-side position. */
            .home-top10-card.rank-1 .home-top10-fuel-pill {
                position: static;
                top: auto;
                right: auto;
                justify-self: end;
                align-self: center;
                margin: 0;
                padding: 8px 13px;
                font-size: 12px;
                line-height: 1;
                font-weight: 900;
                letter-spacing: .025em;
                border-color: rgba(34,197,94,.22);
                background: rgba(34,197,94,.085);
            }

            @media (max-width: 1180px) {
                .home-top10-card.rank-1 .home-top4-ad-banner {
                    left: 59%;
                    width: min(52%, 650px);
                    min-width: 390px;
                    padding: 20px 22px;
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

            @media (max-width: 820px) {
                .home-top10-controls {
                    grid-template-columns: 1fr !important;
                }

                .home-top10-controls .home-top10-control-group:last-child {
                    width: 100%;
                    justify-self: stretch;
                }

                .home-top10-controls .home-top10-control-group:last-child .home-top10-tabs {
                    justify-content: flex-start;
                }
            }

            @media (max-width: 560px) {
                .home-top10-card.rank-1 .home-top4-ad-banner {
                    padding: 16px;
                    border-radius: 14px;
                }

                .home-top4-ad-banner strong { font-size: 18px; }
                .home-top4-ad-banner p { font-size: 12px; }

                .home-top4-ad-contact {
                    flex-direction: column;
                    align-items: flex-start !important;
                    gap: 6px !important;
                }

                .home-top4-ad-contact a,
                .home-top4-ad-contact span { font-size: 11px; }

                .home-top10-card.rank-1 .home-top10-fuel-pill {
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
            <div class="home-top4-ad-contact">
                <a href="mailto:svetoslavov.plamen@gmail.com">svetoslavov.plamen@gmail.com</a>
                <a href="tel:+359883427273">(+359) 883 42 72 73</a>
            </div>
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
