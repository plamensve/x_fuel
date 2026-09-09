(() => {
    const navSrc = "/scripts/global-nav.js?v=20260909-lukoil1";
    if (!window.__GORIVA_GLOBAL_NAV_LOADER__) {
        window.__GORIVA_GLOBAL_NAV_LOADER__ = true;
        const navScript = document.createElement("script");
        navScript.src = navSrc;
        navScript.async = false;
        document.head.appendChild(navScript);
    }

    const baseSrc = "/scripts/site-shell-base.js?v=20260906-perf1";

    // The previous loader used a synchronous XMLHttpRequest + eval whenever
    // site-shell.js itself was deferred. That blocks the main thread and network
    // parser on every internal page. Load the same script asynchronously instead;
    // site-shell-base.js is now safe even when DOMContentLoaded already fired.
    if (!document.getElementById("goriva-site-shell-base")) {
        const baseScript = document.createElement("script");
        baseScript.id = "goriva-site-shell-base";
        baseScript.src = baseSrc;
        baseScript.async = false;
        baseScript.onerror = () => console.error("Failed to load site shell");
        document.head.appendChild(baseScript);
    }

    function installTrendsFetchOptimizer() {
        if (!window.location.pathname.endsWith("/pages/trends.html")) return;
        if (window.__GORIVA_TRENDS_FETCH_OPTIMIZED__ || typeof window.fetch !== "function") return;
        window.__GORIVA_TRENDS_FETCH_OPTIMIZED__ = true;

        const upstreamFetch = window.fetch.bind(window);
        const TREND_SELECT = "created_at,price,fuel,region,city,station,location";

        window.fetch = (input, init = {}) => {
            const rawUrl = typeof input === "string" ? input : input?.url || "";
            const method = String(init.method || (typeof input !== "string" ? input?.method : "GET") || "GET").toUpperCase();
            let requestUrl = rawUrl;
            let safeInit = init;

            try {
                const url = new URL(rawUrl, window.location.href);
                const isFuelPrices = method === "GET" &&
                    url.hostname.endsWith(".supabase.co") &&
                    url.pathname.endsWith("/rest/v1/fuel_prices");

                if (isFuelPrices) {
                    // The history dashboard only reads these seven columns. Avoid
                    // transferring unused database columns across tens of monthly
                    // pagination requests.
                    if (url.searchParams.get("select") === "*") {
                        url.searchParams.set("select", TREND_SELECT);
                    }
                    requestUrl = url.toString();

                    const headers = new Headers(
                        init.headers || (typeof input !== "string" ? input?.headers : undefined) || {}
                    );
                    const apiKey = headers.get("apikey") || "";
                    if (apiKey.startsWith("sb_publishable_") && headers.get("Authorization") === `Bearer ${apiKey}`) {
                        headers.delete("Authorization");
                    }
                    safeInit = { ...init, headers };
                }
            } catch (_) {
                // Keep the original request untouched on malformed/unexpected URLs.
            }

            if (requestUrl !== rawUrl && typeof input !== "string") {
                try {
                    return upstreamFetch(new Request(requestUrl, input), safeInit);
                } catch (_) {
                    return upstreamFetch(input, safeInit);
                }
            }
            return upstreamFetch(requestUrl || input, safeInit);
        };
    }

    installTrendsFetchOptimizer();

    const loadReliableTrendChart = () => {
        if (!window.location.pathname.endsWith("/pages/trends.html")) return;
        if (document.getElementById("goriva-reliable-trend-chart")) return;

        const script = document.createElement("script");
        script.id = "goriva-reliable-trend-chart";
        script.src = "/scripts/trends-reliable-chart.js?v=20260906-perf1";
        script.async = false;
        document.head.appendChild(script);
    };

    function scheduleReliableTrendChart() {
        if (!window.location.pathname.endsWith("/pages/trends.html")) return;
        const section = document.getElementById("price-chart-section");

        if (!section || !("IntersectionObserver" in window)) {
            const run = () => {
                if ("requestIdleCallback" in window) requestIdleCallback(loadReliableTrendChart, { timeout: 2500 });
                else setTimeout(loadReliableTrendChart, 500);
            };
            if (document.readyState === "complete") run();
            else window.addEventListener("load", run, { once: true });
            return;
        }

        // The reliable chart downloads a 90-day raw dataset. It should not
        // compete with the initial calendar, header and above-the-fold content.
        const observer = new IntersectionObserver(entries => {
            if (!entries.some(entry => entry.isIntersecting)) return;
            observer.disconnect();
            if ("requestIdleCallback" in window) requestIdleCallback(loadReliableTrendChart, { timeout: 1200 });
            else setTimeout(loadReliableTrendChart, 0);
        }, { rootMargin: "320px 0px" });
        observer.observe(section);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", scheduleReliableTrendChart, { once: true });
    } else {
        scheduleReliableTrendChart();
    }
})();
