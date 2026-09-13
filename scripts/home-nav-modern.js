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
    style.href = "/pages/styles/home-prices-light-pro.css?v=20260909-cards5";
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

// Use the unused space in the #1 Top 4 card for the Ardes affiliate offer.
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
                width: min(54%, 700px);
                min-width: 430px;
                padding: 18px 21px;
                border: 1px solid rgba(45,212,191,.30);
                border-radius: 18px;
                background:
                    radial-gradient(circle at 100% 0%, rgba(20,184,166,.20), transparent 42%),
                    linear-gradient(145deg, rgba(15,29,47,.90), rgba(10,22,38,.95));
                box-shadow: 0 16px 34px rgba(2,6,23,.20), inset 0 1px 0 rgba(255,255,255,.03);
                text-align: left;
            }

            .home-top4-ad-topline {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                margin-bottom: 10px;
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

            .home-top4-ad-brand {
                display: inline-flex;
                align-items: center;
                max-width: 166px;
                padding: 4px 8px;
                border-radius: 8px;
                background: #fff;
                box-shadow: 0 4px 12px rgba(2,6,23,.16);
            }

            .home-top4-ad-brand img {
                display: block;
                width: 150px;
                height: auto;
                max-width: 100%;
            }

            .home-top4-ad-banner strong {
                display: block;
                margin: 0 0 7px;
                color: #f8fafc;
                font-size: clamp(19px, 2vw, 25px);
                line-height: 1.18;
                letter-spacing: -.02em;
            }

            .home-top4-ad-banner p {
                max-width: none;
                margin: 0;
                color: #a8b8ca;
                font-size: 12px;
                line-height: 1.5;
            }

            .home-top4-ad-offer {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 8px;
                margin-top: 12px;
                padding: 9px 10px;
                border: 1px solid rgba(34,197,94,.24);
                border-radius: 12px;
                background: rgba(255,255,255,.035);
            }

            .home-top4-ad-offer > span {
                color: #cbd5e1;
                font-size: 10px;
                font-weight: 800;
                letter-spacing: .04em;
                text-transform: uppercase;
            }

            .home-top4-ad-offer code {
                color: #bbf7d0;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-size: 12px;
                font-weight: 900;
                letter-spacing: .02em;
                word-break: break-word;
            }

            .home-top4-ad-copy {
                min-height: 26px;
                margin-left: auto;
                padding: 0 9px;
                border: 1px solid rgba(34,197,94,.34);
                border-radius: 7px;
                color: #bbf7d0;
                background: rgba(34,197,94,.10);
                cursor: pointer;
                font: inherit;
                font-size: 10px;
                font-weight: 850;
            }

            .home-top4-ad-copy:hover,
            .home-top4-ad-copy.is-copied {
                color: #fff;
                border-color: rgba(34,197,94,.60);
                background: rgba(34,197,94,.22);
            }

            .home-top4-ad-actions {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 9px 12px;
                margin-top: 12px;
            }

            .home-top4-ad-cta {
                min-height: 32px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 7px;
                padding: 0 12px;
                border-radius: 8px;
                color: #fff;
                background: #16a34a;
                box-shadow: 0 7px 16px rgba(22,163,74,.24);
                font-size: 11px;
                font-weight: 900;
                text-decoration: none;
            }

            .home-top4-ad-cta:hover {
                background: #15803d;
                color: #fff;
                transform: translateY(-1px);
            }

            .home-top4-ad-note {
                color: #a8b8ca;
                font-size: 10px;
                line-height: 1.35;
            }

            .home-top4-ad-banner .home-top4-ad-accent {
                display: block;
                margin-top: 10px;
                color: #93a4b8;
                font-size: 10px;
                line-height: 1.35;
                font-weight: 850;
            }

            /* All ranking cards: keep the fuel badge and / litre next to the euro sign. */
            .home-top10-card .home-top10-card-top {
                grid-template-columns: auto minmax(0, 1fr) !important;
            }

            .home-top10-card .home-top10-card-price {
                align-items: center !important;
                gap: 9px !important;
            }

            .home-top10-card .home-top10-price-meta {
                display: inline-flex;
                flex-direction: column;
                align-items: flex-start;
                justify-content: center;
                align-self: center;
                gap: 5px;
                margin-left: 0;
                transform: translateY(1px);
            }

            .home-top10-card .home-top10-price-meta .home-top10-fuel-pill {
                position: static;
                margin: 0;
                padding: 7px 11px;
                border-color: rgba(34,197,94,.22);
                background: rgba(34,197,94,.085);
                font-size: 11px;
                line-height: 1;
                font-weight: 900;
                letter-spacing: .025em;
                white-space: nowrap;
            }

            .home-top10-card .home-top10-price-meta > span:last-child {
                color: #9fb0c2;
                font-size: 12px;
                font-weight: 720;
                line-height: 1;
                white-space: nowrap;
            }

            .home-top10-card.rank-1 .home-top10-price-meta {
                gap: 6px;
                transform: translateY(2px);
            }

            .home-top10-card.rank-1 .home-top10-price-meta .home-top10-fuel-pill {
                padding: 8px 12px;
                font-size: 12px;
            }

            .home-top10-card.rank-1 .home-top10-price-meta > span:last-child {
                color: #c6b96e;
                font-size: 13px;
                font-weight: 720;
            }

            /* Give cards #2–#4 stronger typography so the ranking reads better. */
            .home-top10-card:not(.rank-1) .home-top10-card-copy h3 {
                font-size: 19px !important;
                line-height: 1.28;
            }

            .home-top10-card:not(.rank-1) .home-top10-card-copy p {
                margin-top: 8px;
                font-size: 13px !important;
                line-height: 1.5;
            }

            .home-top10-card:not(.rank-1) .home-top10-card-price {
                margin-top: 18px;
            }

            .home-top10-card:not(.rank-1) .home-top10-card-price strong {
                font-size: 32px !important;
                line-height: 1;
            }

            .home-top10-card:not(.rank-1) .home-top10-card-footer {
                margin-top: 17px;
                padding-top: 13px;
                font-size: 12px !important;
            }

            .home-top10-card:not(.rank-1) .home-top10-rank-badge {
                width: 40px;
                height: 40px;
                font-size: 17px;
            }

            @media (max-width: 1180px) {
                .home-top10-card.rank-1 .home-top4-ad-banner {
                    left: 59%;
                    width: min(52%, 620px);
                    min-width: 400px;
                    padding: 17px 19px;
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
                    padding: 15px;
                    border-radius: 14px;
                }

                .home-top4-ad-banner strong { font-size: 18px; }
                .home-top4-ad-banner p { font-size: 12px; }

                .home-top4-ad-topline {
                    align-items: flex-start;
                }

                .home-top4-ad-brand {
                    max-width: 126px;
                    padding: 3px 6px;
                }

                .home-top4-ad-brand img {
                    width: 114px;
                }

                .home-top4-ad-offer {
                    align-items: flex-start;
                    flex-direction: column;
                }

                .home-top4-ad-copy {
                    margin-left: 0;
                }

                .home-top4-ad-actions {
                    flex-direction: column;
                    align-items: flex-start !important;
                    gap: 8px !important;
                }

                .home-top4-ad-offer code { font-size: 11px; }

                .home-top10-card .home-top10-card-price {
                    gap: 7px !important;
                }

                .home-top10-card .home-top10-price-meta .home-top10-fuel-pill,
                .home-top10-card.rank-1 .home-top10-price-meta .home-top10-fuel-pill {
                    padding: 6px 9px;
                    font-size: 10px;
                }

                .home-top10-card .home-top10-price-meta > span:last-child,
                .home-top10-card.rank-1 .home-top10-price-meta > span:last-child {
                    font-size: 11px;
                }

                .home-top10-card:not(.rank-1) .home-top10-card-copy h3 {
                    font-size: 18px !important;
                }

                .home-top10-card:not(.rank-1) .home-top10-card-price strong {
                    font-size: 30px !important;
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
        banner.setAttribute("aria-label", "Реклама на Ardes.bg с промо код за 1 процент отстъпка");
        banner.innerHTML = `
            <div class="home-top4-ad-topline">
                <span class="home-top4-ad-label">Реклама</span>
                <span class="home-top4-ad-brand"><img src="media/ardes-affiliate-logo.png" alt="Ardes.bg" width="150" height="36" loading="lazy" decoding="async"></span>
            </div>
            <strong>Техника с 1% отстъпка</strong>
            <p>Използвай промо кода при онлайн поръчка на продукти на стандартна цена в Ardes.bg.</p>
            <div class="home-top4-ad-offer">
                <span>Промо код</span>
                <code>1876-1938-2844-1239</code>
                <button class="home-top4-ad-copy" type="button" data-copy-code="1876-1938-2844-1239">Копирай</button>
            </div>
            <div class="home-top4-ad-actions">
                <a class="home-top4-ad-cta" href="https://ardes.bg/?utm_source=goriva.online&amp;utm_medium=affiliate&amp;utm_campaign=promo_code" target="_blank" rel="sponsored noopener noreferrer">Пазарувай в Ardes.bg <span aria-hidden="true">→</span></a>
                <span class="home-top4-ad-note">1% важи за стандартни цени; не важи за „онлайн цена“.</span>
            </div>
            <span class="home-top4-ad-accent">Партньорска оферта от „Ардес Информационни Технологии“ ЕООД.</span>
        `;

        const copyButton = banner.querySelector(".home-top4-ad-copy");
        copyButton?.addEventListener("click", async () => {
            const code = copyButton.dataset.copyCode || "";
            try {
                await navigator.clipboard.writeText(code);
                copyButton.textContent = "Копирано";
                copyButton.classList.add("is-copied");
                window.setTimeout(() => {
                    copyButton.textContent = "Копирай";
                    copyButton.classList.remove("is-copied");
                }, 1800);
            } catch (error) {
                window.prompt("Копирай промо кода:", code);
            }
        });

        const footer = winner.querySelector(".home-top10-card-footer");
        if (footer) winner.insertBefore(banner, footer);
        else winner.appendChild(banner);
    };

    const moveFuelLabelsToPrice = () => {
        document.querySelectorAll(".home-top10-card").forEach(card => {
            const price = card.querySelector(".home-top10-card-price");
            const fuelPill = card.querySelector(".home-top10-fuel-pill");
            if (!price || !fuelPill || price.querySelector(".home-top10-price-meta")) return;

            const unit = [...price.children].find(el => el.tagName === "SPAN" && el !== fuelPill);
            if (!unit) return;

            const meta = document.createElement("span");
            meta.className = "home-top10-price-meta";
            price.insertBefore(meta, unit);
            meta.appendChild(fuelPill);
            meta.appendChild(unit);
        });
    };

    const syncTop4Cards = () => {
        addAdvertisingBanner();
        moveFuelLabelsToPrice();
    };

    const init = () => {
        syncTop4Cards();
        const root = document.querySelector(".home-top10-card-grid") || document.body;
        const observer = new MutationObserver(syncTop4Cards);
        observer.observe(root, { childList: true, subtree: true });
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
