(() => {
    if (window.__GORIVA_HOME_MAP_ASSET_LOADER__) return;
    window.__GORIVA_HOME_MAP_ASSET_LOADER__ = true;

    // Tell legacy script-base.js that the dedicated EKO map owns #station-map,
    // even before Leaflet itself is loaded.
    window.__GORIVA_EKO_MAP_MODE__ = true;

    const MAP_ROOT_MARGIN = "420px 0px";
    const FALLBACK_MS = 15000;
    let startPromise = null;

    function ensurePreconnect() {
        if (document.querySelector('link[data-goriva-map-preconnect]')) return;
        const link = document.createElement("link");
        link.rel = "preconnect";
        link.href = "https://unpkg.com";
        link.crossOrigin = "anonymous";
        link.dataset.gorivaMapPreconnect = "true";
        document.head.appendChild(link);
    }

    function loadStyle(href, id) {
        if (id && document.getElementById(id)) return;
        if ([...document.styleSheets].some(sheet => sheet.href && sheet.href.includes(href.split("?")[0]))) return;

        const link = document.createElement("link");
        if (id) link.id = id;
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
    }

    function loadScript(src, id) {
        if (id && document.getElementById(id)) return Promise.resolve();
        const base = src.split("?")[0];
        const existing = [...document.scripts].find(script => script.src && script.src.includes(base));
        if (existing) {
            if (existing.dataset.gorivaLoaded === "1" || existing.readyState === "complete") return Promise.resolve();
            return new Promise((resolve, reject) => {
                existing.addEventListener("load", resolve, { once: true });
                existing.addEventListener("error", reject, { once: true });
            });
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            if (id) script.id = id;
            script.src = src;
            script.async = false;
            script.addEventListener("load", () => {
                script.dataset.gorivaLoaded = "1";
                resolve();
            }, { once: true });
            script.addEventListener("error", reject, { once: true });
            document.head.appendChild(script);
        });
    }

    function startMapAssets() {
        if (startPromise) return startPromise;

        startPromise = (async () => {
            ensurePreconnect();

            loadStyle("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "goriva-leaflet-css");
            loadStyle("https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.css", "goriva-markercluster-css");
            loadStyle("https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.Default.css", "goriva-markercluster-default-css");

            await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "goriva-leaflet-js");
            await loadScript("https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js", "goriva-markercluster-js");
            await loadScript("/scripts/station-icons.js?v=20260830-1239", "goriva-station-icons");
            await loadScript("/scripts/ecopetrol_prices.js?v=20260906-eko-map1", "goriva-eko-map-data");
        })().catch(error => {
            console.error("Failed to lazy-load homepage map assets", error);
            throw error;
        });

        return startPromise;
    }

    function armLoader() {
        const map = document.getElementById("station-map") || document.getElementById("station-map-eko");
        const section = map?.closest(".station-map-section") || map;

        if (!section || !("IntersectionObserver" in window)) {
            if ("requestIdleCallback" in window) requestIdleCallback(startMapAssets, { timeout: 2500 });
            else setTimeout(startMapAssets, 1200);
            return;
        }

        let released = false;
        const release = () => {
            if (released) return;
            released = true;
            observer.disconnect();
            clearTimeout(fallbackTimer);
            startMapAssets();
        };

        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) release();
        }, { rootMargin: MAP_ROOT_MARGIN });

        observer.observe(section);
        const fallbackTimer = setTimeout(release, FALLBACK_MS);

        // Anchor jumps to the map should hydrate immediately even before the
        // IntersectionObserver callback is delivered.
        document.addEventListener("click", event => {
            const link = event.target.closest('a[href="#station-map"], a[href*="#station-map"]');
            if (link) release();
        }, { passive: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", armLoader, { once: true });
    } else {
        armLoader();
    }
})();
