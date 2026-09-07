(() => {
    if (window.__GORIVA_EKO_FALLBACK__) return;

    // Own the EKO fallback here so the homepage can reuse the latest imported
    // EKO batch without the expensive full-history scan in script.js.
    window.__GORIVA_EKO_FALLBACK__ = true;

    // Load the ticker/CPU guard before DOMContentLoaded whenever possible.
    if (!document.getElementById("goriva-performance-guard")) {
        const perf = document.createElement("script");
        perf.id = "goriva-performance-guard";
        perf.src = "/scripts/performance-guard.js?v=20260906-4";
        perf.async = false;
        document.head.appendChild(perf);
    }

    if (window.__GORIVA_RUNTIME_FETCH_OPTIMIZED__ || typeof window.fetch !== "function") return;
    window.__GORIVA_RUNTIME_FETCH_OPTIMIZED__ = true;

    const nativeFetch = window.fetch.bind(window);
    const DAILY_SELECT = "region,city,station,fuel,price,location,created_at";
    const EKO_NAME = "ЕКО";
    const EKO_HISTORY_PAGE_SIZE = 1000;
    const SOFIA_TIME_ZONE = "Europe/Sofia";
    const dailyResponseCache = new Map();
    const dailyInflight = new Map();
    let mapReadyPromise = null;

    const sofiaDateFormatter = new Intl.DateTimeFormat("sv-SE", {
        timeZone: SOFIA_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });

    const normalize = value => (value || "").toString().trim().toLocaleUpperCase("bg-BG");
    const isEkoRow = row => {
        const station = normalize(row?.station);
        return station === EKO_NAME || station === "EKO";
    };

    const getMethod = (input, init) => String(
        init?.method || (typeof input !== "string" ? input?.method : "GET") || "GET"
    ).toUpperCase();

    const getUrl = input => typeof input === "string" ? input : input?.url || "";

    function asUrl(rawUrl) {
        try {
            return new URL(rawUrl, window.location.href);
        } catch (_) {
            return null;
        }
    }

    function sofiaDateKey(value) {
        const date = value instanceof Date ? value : new Date(value);
        return Number.isNaN(date.getTime()) ? null : sofiaDateFormatter.format(date);
    }

    function sanitizeSupabaseInit(input, init = {}) {
        const rawUrl = getUrl(input);
        if (!rawUrl.includes(".supabase.co/")) return init;

        try {
            const headers = new Headers(
                init.headers || (typeof input !== "string" ? input?.headers : undefined) || {}
            );
            const apiKey = headers.get("apikey") || "";
            const authorization = headers.get("Authorization") || "";

            // Supabase publishable keys are API keys, not JWTs. Avoid carrying
            // a redundant Bearer copy through every request.
            if (apiKey.startsWith("sb_publishable_") && authorization === `Bearer ${apiKey}`) {
                headers.delete("Authorization");
            }

            return { ...init, headers };
        } catch (_) {
            return init;
        }
    }

    function isFuelPricesEndpoint(url) {
        return Boolean(
            url &&
            url.hostname.endsWith(".supabase.co") &&
            url.pathname.endsWith("/rest/v1/fuel_prices")
        );
    }

    function canonicalTodayPricesUrl(rawUrl, method) {
        if (method !== "GET") return null;
        const url = asUrl(rawUrl);
        if (!isFuelPricesEndpoint(url)) return null;

        // Station-specific requests belong to the EKO map and have different
        // semantics. Only consolidate the broad, current-day homepage queries.
        if (url.searchParams.has("station")) return null;

        const createdAtFilters = url.searchParams.getAll("created_at");
        const hasStart = createdAtFilters.some(value => value.startsWith("gte."));
        const hasEnd = createdAtFilters.some(value => value.startsWith("lt."));
        if (!hasStart || !hasEnd) return null;

        // script-base.js and eco_filter.js request the same day independently,
        // with different select/order clauses. Canonicalizing them lets both
        // consumers share exactly one network response per page.
        url.searchParams.set("select", DAILY_SELECT);
        url.searchParams.set("order", "created_at.desc");
        return url.toString();
    }

    async function snapshotNetworkResponse(url, init) {
        const response = await nativeFetch(url, init);
        const body = await response.text();
        const headers = new Headers(response.headers);
        headers.delete("content-length");
        headers.delete("content-encoding");

        return {
            body,
            status: response.status,
            statusText: response.statusText,
            headers: [...headers.entries()]
        };
    }

    function responseFromSnapshot(snapshot) {
        return new Response(snapshot.body, {
            status: snapshot.status,
            statusText: snapshot.statusText,
            headers: snapshot.headers
        });
    }

    function readApiKey(init) {
        try {
            return new Headers(init?.headers || {}).get("apikey") || "";
        } catch (_) {
            return "";
        }
    }

    async function fetchLatestHistoricalEkoRows(canonicalUrl, apiKey, todayStartIso) {
        const requestUrl = asUrl(canonicalUrl);
        if (!requestUrl || !apiKey || !todayStartIso) return { rows: [], dateKey: null };

        const rows = [];
        let offset = 0;
        let latestDateKey = null;

        while (true) {
            const historyUrl = new URL(requestUrl.origin + requestUrl.pathname);
            historyUrl.searchParams.set("select", DAILY_SELECT);
            historyUrl.searchParams.set("station", `eq.${EKO_NAME}`);
            historyUrl.searchParams.append("created_at", `lt.${todayStartIso}`);
            historyUrl.searchParams.set("order", "created_at.desc");
            historyUrl.searchParams.set("limit", String(EKO_HISTORY_PAGE_SIZE));
            historyUrl.searchParams.set("offset", String(offset));

            const response = await nativeFetch(historyUrl.toString(), {
                headers: { apikey: apiKey },
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error(`EKO latest-price fallback request failed: ${response.status}`);
            }

            const batch = await response.json();
            if (!Array.isArray(batch) || batch.length === 0) break;

            for (const row of batch) {
                const rowDateKey = sofiaDateKey(row.created_at);
                if (!rowDateKey) continue;

                if (!latestDateKey) latestDateKey = rowDateKey;
                if (rowDateKey !== latestDateKey) {
                    return { rows, dateKey: latestDateKey };
                }

                rows.push(row);
            }

            if (batch.length < EKO_HISTORY_PAGE_SIZE) break;
            offset += EKO_HISTORY_PAGE_SIZE;
        }

        return { rows, dateKey: latestDateKey };
    }

    async function enrichTodaySnapshotWithLatestEko(canonicalUrl, snapshot, safeInit) {
        if (snapshot.status < 200 || snapshot.status >= 300) return snapshot;

        try {
            const todayRows = JSON.parse(snapshot.body);
            if (!Array.isArray(todayRows) || todayRows.some(isEkoRow)) return snapshot;

            const requestUrl = asUrl(canonicalUrl);
            const startFilter = requestUrl?.searchParams
                .getAll("created_at")
                .find(value => value.startsWith("gte."));
            const todayStartIso = startFilter?.slice(4) || "";
            const apiKey = readApiKey(safeInit);
            if (!todayStartIso || !apiKey) return snapshot;

            const latestEko = await fetchLatestHistoricalEkoRows(canonicalUrl, apiKey, todayStartIso);
            if (!latestEko.rows.length) return snapshot;

            const startMs = new Date(todayStartIso).getTime();
            const displayTimestamp = Number.isFinite(startMs)
                ? new Date(startMs + 12 * 60 * 60 * 1000).toISOString()
                : new Date().toISOString();

            // Downstream legacy code filters rows with isToday(). Preserve the
            // original timestamp for traceability, but expose the fallback rows
            // as today's client-side snapshot so they remain visible in the table.
            const fallbackRows = latestEko.rows.map(row => ({
                ...row,
                _eko_fallback: true,
                _source_created_at: row.created_at,
                _eko_fallback_date: latestEko.dateKey,
                created_at: displayTimestamp
            }));

            const headers = new Headers(snapshot.headers);
            headers.set("content-type", "application/json; charset=utf-8");
            headers.delete("content-length");

            return {
                ...snapshot,
                body: JSON.stringify([...todayRows, ...fallbackRows]),
                headers: [...headers.entries()]
            };
        } catch (error) {
            console.warn("EKO latest-price fallback skipped", error);
            return snapshot;
        }
    }

    async function fetchSharedTodayPrices(canonicalUrl, input, init) {
        const cached = dailyResponseCache.get(canonicalUrl);
        if (cached) return responseFromSnapshot(cached);

        const running = dailyInflight.get(canonicalUrl);
        if (running) return responseFromSnapshot(await running);

        const safeInit = sanitizeSupabaseInit(input, init);
        const promise = (async () => {
            const snapshot = await snapshotNetworkResponse(canonicalUrl, safeInit);
            return enrichTodaySnapshotWithLatestEko(canonicalUrl, snapshot, safeInit);
        })();
        dailyInflight.set(canonicalUrl, promise);

        try {
            const snapshot = await promise;
            if (snapshot.status >= 200 && snapshot.status < 300) {
                dailyResponseCache.set(canonicalUrl, snapshot);
            }
            return responseFromSnapshot(snapshot);
        } finally {
            dailyInflight.delete(canonicalUrl);
        }
    }

    function clearTodayPriceCache() {
        dailyResponseCache.clear();
        dailyInflight.clear();
    }

    function waitUntilMapIsNearViewport() {
        if (mapReadyPromise) return mapReadyPromise;

        mapReadyPromise = new Promise(resolve => {
            const start = () => {
                const map = document.getElementById("station-map") || document.getElementById("station-map-eko");
                const section = map?.closest(".station-map-section") || map;

                if (!section || !("IntersectionObserver" in window)) {
                    window.setTimeout(resolve, 1200);
                    return;
                }

                let released = false;
                const done = () => {
                    if (released) return;
                    released = true;
                    observer.disconnect();
                    window.clearTimeout(fallbackTimer);
                    resolve();
                };

                // Do not compete with hero/LCP work. Start map data shortly
                // before the user reaches the map; still provide a long fallback
                // so the map eventually hydrates even without scrolling.
                const observer = new IntersectionObserver(entries => {
                    if (entries.some(entry => entry.isIntersecting)) done();
                }, { rootMargin: "160px 0px" });

                observer.observe(section);
                const fallbackTimer = window.setTimeout(done, 15000);
            };

            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", start, { once: true });
            } else {
                start();
            }
        });

        return mapReadyPromise;
    }

    function isMapDataRequest(rawUrl) {
        const url = asUrl(rawUrl);
        if (!url) return false;

        if (url.origin === window.location.origin) {
            if (url.pathname === "/data/eko_stations.json" || url.pathname === "/data/eko_products.json") {
                return true;
            }
            if (url.pathname === "/data/export.geojson") return true;
        }

        if (!isFuelPricesEndpoint(url)) return false;
        const stationFilter = url.searchParams.get("station") || "";
        return stationFilter.toLocaleUpperCase("bg-BG") === "EQ.ЕКО";
    }

    function isUnusedLegacyEcoPetrolRequest(rawUrl, method) {
        if (method !== "GET") return false;
        const url = asUrl(rawUrl);
        if (!url || !url.hostname.endsWith(".supabase.co") || !url.pathname.endsWith("/rest/v1/ecopetrol")) {
            return false;
        }

        // ecopetrol_prices.js still contains an old widget fetch. On the current
        // homepage none of its target elements exist, so the full table response
        // is pure network/JSON work with no visible output.
        return !document.querySelector(
            '[id^="dizel-"], [id^="benzin95-"], [id^="benzin100-"], [id^="lpg-"], [id^="adblue-"]'
        );
    }

    window.fetch = async (input, init = {}) => {
        const rawUrl = getUrl(input);
        const method = getMethod(input, init);
        const parsedUrl = asUrl(rawUrl);

        if (isFuelPricesEndpoint(parsedUrl) && method !== "GET" && method !== "HEAD") {
            const response = await nativeFetch(input, sanitizeSupabaseInit(input, init));
            if (response.ok) clearTodayPriceCache();
            return response;
        }

        const canonicalUrl = canonicalTodayPricesUrl(rawUrl, method);
        if (canonicalUrl) {
            return fetchSharedTodayPrices(canonicalUrl, input, init);
        }

        if (isUnusedLegacyEcoPetrolRequest(rawUrl, method)) {
            return new Response("[]", {
                status: 200,
                headers: { "Content-Type": "application/json; charset=utf-8" }
            });
        }

        if (method === "GET" && isMapDataRequest(rawUrl)) {
            await waitUntilMapIsNearViewport();
        }

        return nativeFetch(input, sanitizeSupabaseInit(input, init));
    };
})();
