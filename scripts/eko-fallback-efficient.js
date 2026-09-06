(() => {
    if (window.__GORIVA_EKO_FALLBACK__) return;

    // Disable the historical EKO fallback in script.js. The current-day data
    // request must never wait for unrelated historical rows.
    window.__GORIVA_EKO_FALLBACK__ = true;

    // Load the small ticker/CPU guard before DOMContentLoaded whenever possible.
    if (!document.getElementById('goriva-performance-guard')) {
        const perf = document.createElement('script');
        perf.id = 'goriva-performance-guard';
        perf.src = '/scripts/performance-guard.js?v=20260906-3';
        perf.async = false;
        document.head.appendChild(perf);
    }

    if (window.__GORIVA_LAZY_GEOJSON_FETCH__ || typeof window.fetch !== 'function') return;
    window.__GORIVA_LAZY_GEOJSON_FETCH__ = true;

    const nativeFetch = window.fetch.bind(window);
    let mapReadyPromise = null;

    function waitUntilMapIsNearViewport() {
        if (mapReadyPromise) return mapReadyPromise;
        mapReadyPromise = new Promise(resolve => {
            const start = () => {
                const map = document.getElementById('station-map');
                const section = map?.closest('.station-map-section') || map;
                if (!section || !('IntersectionObserver' in window)) {
                    setTimeout(resolve, 800);
                    return;
                }
                let released = false;
                const done = () => {
                    if (released) return;
                    released = true;
                    observer.disconnect();
                    resolve();
                };
                const observer = new IntersectionObserver(entries => {
                    if (entries.some(entry => entry.isIntersecting)) done();
                }, { rootMargin: '650px 0px' });
                observer.observe(section);
                setTimeout(done, 5000);
            };
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
            else start();
        });
        return mapReadyPromise;
    }

    function optimizeTodayPriceRequest(url, init) {
        const method = String(init?.method || 'GET').toUpperCase();
        if (method !== 'GET' || !url.includes('.supabase.co/rest/v1/fuel_prices')) return url;
        if (!url.includes('created_at=gte.') || !url.includes('created_at=lt.') || !url.includes('select=*')) return url;

        // The homepage only uses these fields. Avoid transferring every database
        // column for 1,000+ daily rows on every page of the request.
        return url.replace(
            'select=*',
            'select=region,city,station,fuel,price,location,created_at'
        );
    }

    window.fetch = async (input, init = {}) => {
        const originalUrl = typeof input === 'string' ? input : input?.url || '';
        const normalized = originalUrl.split('?')[0].replace(/^https?:\/\/[^/]+/i, '');
        const isStationGeoJson = normalized === 'data/export.geojson' || normalized === '/data/export.geojson';

        if (isStationGeoJson) await waitUntilMapIsNearViewport();

        const optimizedUrl = optimizeTodayPriceRequest(originalUrl, init);
        if (optimizedUrl !== originalUrl) {
            if (typeof input === 'string') return nativeFetch(optimizedUrl, init);
            try {
                return nativeFetch(new Request(optimizedUrl, input), init);
            } catch (_) {
                return nativeFetch(input, init);
            }
        }

        return nativeFetch(input, init);
    };
})();
