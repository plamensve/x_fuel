(() => {
    if (window.__GORIVA_EKO_FALLBACK__) return;

    // Disable the historical EKO fallback in script.js. The current-day data
    // request must never wait for unrelated historical rows.
    window.__GORIVA_EKO_FALLBACK__ = true;

    // Load the small ticker/CPU guard before DOMContentLoaded whenever possible.
    if (!document.getElementById('goriva-performance-guard')) {
        const perf = document.createElement('script');
        perf.id = 'goriva-performance-guard';
        perf.src = '/scripts/performance-guard.js?v=20260906-2';
        perf.async = false;
        document.head.appendChild(perf);
    }

    // The legacy homepage map used to download and parse the full station
    // GeoJSON immediately on DOMContentLoaded. Defer that heavy request until
    // the map is actually close to the viewport. This keeps the hero, consent
    // UI and current-price table from competing with thousands of map markers
    // during first paint.
    if (window.__GORIVA_LAZY_GEOJSON_FETCH__ || typeof window.fetch !== 'function') return;
    window.__GORIVA_LAZY_GEOJSON_FETCH__ = true;

    const nativeFetch = window.fetch.bind(window);
    let mapReadyPromise = null;

    function waitUntilMapIsNearViewport() {
        if (mapReadyPromise) return mapReadyPromise;

        mapReadyPromise = new Promise(resolve => {
            const release = () => resolve();
            const start = () => {
                const map = document.getElementById('station-map');
                const section = map?.closest('.station-map-section') || map;
                if (!section || !('IntersectionObserver' in window)) {
                    setTimeout(release, 800);
                    return;
                }

                let released = false;
                const done = () => {
                    if (released) return;
                    released = true;
                    observer.disconnect();
                    release();
                };

                const observer = new IntersectionObserver(entries => {
                    if (entries.some(entry => entry.isIntersecting)) done();
                }, { rootMargin: '650px 0px' });

                observer.observe(section);
                setTimeout(done, 5000);
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', start, { once: true });
            } else {
                start();
            }
        });

        return mapReadyPromise;
    }

    window.fetch = async (input, init = {}) => {
        const url = typeof input === 'string' ? input : input?.url || '';
        const normalized = url.split('?')[0].replace(/^https?:\/\/[^/]+/i, '');
        const isStationGeoJson = normalized === 'data/export.geojson' || normalized === '/data/export.geojson';

        if (isStationGeoJson) {
            await waitUntilMapIsNearViewport();
        }

        return nativeFetch(input, init);
    };
})();
