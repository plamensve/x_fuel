(() => {
    const navSrc = "/scripts/global-nav.js?v=20260829-1100";
    if (!window.__GORIVA_GLOBAL_NAV_LOADER__) {
        window.__GORIVA_GLOBAL_NAV_LOADER__ = true;
        const navScript = document.createElement("script");
        navScript.src = navSrc;
        navScript.async = false;
        document.head.appendChild(navScript);
    }

    const baseSrc = "/scripts/site-shell-base.js?v=20260828-2108";
    const current = document.currentScript;

    if (document.readyState === "loading" && !current?.defer && !current?.async) {
        document.write(`<script src="${baseSrc}"><\/script>`);
        return;
    }

    try {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", baseSrc, false);
        xhr.send(null);
        if (xhr.status === 200 || xhr.status === 0) {
            (0, eval)(`${xhr.responseText}\n//# sourceURL=${baseSrc}`);
        }
    } catch (error) {
        console.error("Failed to load site shell", error);
    }

    const loadReliableTrendChart = () => {
        if (!window.location.pathname.endsWith("/pages/trends.html")) return;
        if (document.getElementById("goriva-reliable-trend-chart")) return;

        const script = document.createElement("script");
        script.id = "goriva-reliable-trend-chart";
        script.src = "/scripts/trends-reliable-chart.js?v=20260902-1";
        script.async = false;
        document.head.appendChild(script);
    };

    if (document.readyState === "loading") {
        window.addEventListener("DOMContentLoaded", () => {
            window.setTimeout(loadReliableTrendChart, 0);
        }, { once: true });
    } else {
        window.setTimeout(loadReliableTrendChart, 0);
    }
})();
