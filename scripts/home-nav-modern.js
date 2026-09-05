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
    style.href = "/pages/styles/home-prices-light-pro.css?v=20260905-2135";
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
            min-height: 34px !important;
            margin-left: 10px !important;
            padding: 0 13px !important;
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 36%, #db2777 70%, #ea580c 100%) !important;
            border: 1px solid rgba(255,255,255,.28) !important;
            border-radius: 999px !important;
            box-shadow: 0 8px 20px rgba(124,58,237,.18), inset 0 1px 0 rgba(255,255,255,.24) !important;
            font-size: 12px !important;
            font-weight: 900 !important;
            letter-spacing: .01em !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
        }

        main.container > .prices-card #prices-date::before {
            content: "▣" !important;
            width: 19px !important;
            height: 19px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 6px !important;
            color: #ffffff !important;
            background: rgba(255,255,255,.16) !important;
            box-shadow: inset 0 0 0 1px rgba(255,255,255,.12) !important;
            font-size: 10px !important;
            line-height: 1 !important;
        }

        @media (max-width: 760px) {
            main.container > .prices-card #prices-date {
                margin: 9px 0 0 !important;
                min-height: 32px !important;
                padding: 0 11px !important;
                font-size: 11px !important;
            }
        }
    `;
    document.head.appendChild(style);
})();
