(() => {
    if (window.__GORIVA_EKO_FALLBACK__) return;
    window.__GORIVA_EKO_FALLBACK__ = true;

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
    const currentDayEkoChecks = new Map();
    let mapReadyPromise = null;

    const sofiaDateFormatter = new Intl.DateTimeFormat("sv-SE", {
        timeZone: SOFIA_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });

    const normalize = value => (value || "").toString().trim().toLocaleUpperCase("bg-BG");
    const isEkoRow = row => ["ЕКО", "EKO"].includes(normalize(row?.station));
    const ekoStationKey = row => normalize(row?.location) || `${normalize(row?.city)}|${normalize(row?.station)}`;
    const ekoFuelKey = row => `${ekoStationKey(row)}|${normalize(row?.fuel)}`;

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
        if (url.searchParams.has("station")) return null;

        const createdAtFilters = url.searchParams.getAll("created_at");
        const hasStart = createdAtFilters.some(value => value.startsWith("gte."));
        const hasEnd = createdAtFilters.some(value => value.startsWith("lt."));
        if (!hasStart || !hasEnd) return null;

        url.searchParams.set("select", DAILY_SELECT);
        url.searchParams.set("order", "created_at.desc");
        return url.toString();
    }

    function getDayWindow(url) {
        const filters = url?.searchParams.getAll("created_at") || [];
        const start = filters.find(value => value.startsWith("gte."))?.slice(4) || "";
        const end = filters.find(value => value.startsWith("lt."))?.slice(3) || "";
        if (!start || !end) return null;
        return { start, end, key: `${start}|${end}` };
    }

    function isFinalPage(url, rowCount) {
        const limit = Number(url?.searchParams.get("limit"));
        if (!Number.isFinite(limit) || limit <= 0) return true;
        return rowCount < limit;
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

    async function hasCurrentDayEkoRows(requestUrl, apiKey, dayWindow) {
        if (currentDayEkoChecks.has(dayWindow.key)) {
            return currentDayEkoChecks.get(dayWindow.key);
        }

        const promise = (async () => {
            const checkUrl = new URL(requestUrl.origin + requestUrl.pathname);
            checkUrl.searchParams.set("select", "created_at");
            checkUrl.searchParams.set("station", `eq.${EKO_NAME}`);
            checkUrl.searchParams.append("created_at", `gte.${dayWindow.start}`);
            checkUrl.searchParams.append("created_at", `lt.${dayWindow.end}`);
            checkUrl.searchParams.set("limit", "1");

            const response = await nativeFetch(checkUrl.toString(), {
                headers: { apikey: apiKey },
                cache: "no-store"
            });
            if (!response.ok) throw new Error(`EKO current-day check failed: ${response.status}`);

            const rows = await response.json();
            return Array.isArray(rows) && rows.length > 0;
        })();

        currentDayEkoChecks.set(dayWindow.key, promise);
        try {
            return await promise;
        } finally {
            currentDayEkoChecks.delete(dayWindow.key);
        }
    }

    function latestRowPerStationFuel(rows) {
        const selected = new Map();
        for (const row of rows) {
            const key = ekoFuelKey(row);
            if (!key || key.startsWith("|")) continue;
            if (!selected.has(key)) selected.set(key, row);
        }
        return [...selected.values()];
    }

    async function fetchLatestHistoricalEkoRows(requestUrl, apiKey, todayStartIso) {
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
            if (!response.ok) throw new Error(`EKO fallback request failed: ${response.status}`);

            const batch = await response.json();
            if (!Array.isArray(batch) || batch.length === 0) break;

            for (const row of batch) {
                const rowDateKey = sofiaDateKey(row.created_at);
                if (!rowDateKey) continue;

                if (!latestDateKey) latestDateKey = rowDateKey;
                if (rowDateKey !== latestDateKey) {
                    return { rows: latestRowPerStationFuel(rows), dateKey: latestDateKey };
                }
                rows.push(row);
            }

            if (batch.length < EKO_HISTORY_PAGE_SIZE) break;
            offset += EKO_HISTORY_PAGE_SIZE;
        }

        return { rows: latestRowPerStationFuel(rows), dateKey: latestDateKey };
    }

    async function enrichFinalTodayPageWithLatestEko(canonicalUrl, snapshot, safeInit) {
        if (snapshot.status < 200 || snapshot.status >= 300) return snapshot;

        try {
            const todayRows = JSON.parse(snapshot.body);
            if (!Array.isArray(todayRows)) return snapshot;

            const requestUrl = asUrl(canonicalUrl);
            if (!requestUrl || !isFinalPage(requestUrl, todayRows.length)) return snapshot;
            if (todayRows.some(isEkoRow)) return snapshot;

            const dayWindow = getDayWindow(requestUrl);
            const apiKey = readApiKey(safeInit);
            if (!dayWindow || !apiKey) return snapshot;

            // The final page can contain no EKO rows even when an earlier page did.
            // Verify the whole current-day window before using yesterday's import.
            if (await hasCurrentDayEkoRows(requestUrl, apiKey, dayWindow)) return snapshot;

            const latestEko = await fetchLatestHistoricalEkoRows(requestUrl, apiKey, dayWindow.start);
            if (!latestEko.rows.length) return snapshot;

            const startMs = new Date(dayWindow.start).getTime();
            const displayTimestamp = Number.isFinite(startMs)
                ? new Date(startMs + 12 * 60 * 60 * 1000).toISOString()
                : new Date().toISOString();

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
            return enrichFinalTodayPageWithLatestEko(canonicalUrl, snapshot, safeInit);
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
        currentDayEkoChecks.clear();
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
            if (url.pathname === "/data/eko_stations.json" || url.pathname === "/data/eko_products.json") return true;
            if (url.pathname === "/data/export.geojson") return true;
        }

        if (!isFuelPricesEndpoint(url)) return false;
        const stationFilter = url.searchParams.get("station") || "";
        return stationFilter.toLocaleUpperCase("bg-BG") === "EQ.ЕКО";
    }

    function isUnusedLegacyEcoPetrolRequest(rawUrl, method) {
        if (method !== "GET") return false;
        const url = asUrl(rawUrl);
        if (!url || !url.hostname.endsWith(".supabase.co") || !url.pathname.endsWith("/rest/v1/ecopetrol")) return false;

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
        if (canonicalUrl) return fetchSharedTodayPrices(canonicalUrl, input, init);

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

// Daily price cards use local SVG brand assets. The legacy card renderer only
// recognizes several station names in Cyrillic, while the data can contain the
// same chains in Latin (for example "Petrol"). Install one normalized resolver
// before the renderer's DOMContentLoaded callback runs so existing SVG files are
// actually attached to the cards/table without changing unknown stations.
(() => {
    const stationLogoRules = [
        { match: ["екопетрол", "ecopetrol"], src: "/images/station_logos/ecopetrol.svg" },
        { match: ["ромпетрол", "rompetrol"], src: "/images/station_logos/rompetrol.svg" },
        { match: ["бенита", "benita"], src: "/images/station_logos/benita.svg" },
        { match: ["лукойл", "lukoil"], src: "/images/station_logos/lukoil.svg" },
        { match: ["омв", "omv"], src: "/images/station_logos/omv.svg" },
        { match: ["шел", "shell"], src: "/images/station_logos/shell.svg" },
        { match: ["инса", "insa"], src: "/images/station_logos/insa.svg" },
        { match: ["круиз", "kruiz", "cruise"], src: "/images/station_logos/kruiz.svg" },
        { match: ["булмаркет", "bulmarket"], src: "/images/station_logos/bulmarket.svg" },
        { match: ["пауър ойл", "poweroil"], src: "/images/station_logos/power-oil.png" },
        { match: ["дизелор", "dieselor", "diselor", "dieseler"], src: "/images/station_logos/dieselor-logo.jpg" },
        { match: ["химойл", "himoil", "chimoil"], src: "/images/station_logos/himoil.svg" },
        { match: ["петрол", "petrol"], src: "/images/station_logos/petrol-logo.png" },
        { match: ["еко", "eko"], src: "/images/station_logos/eko.svg" }
    ];

    const normalizeStationName = value => String(value || "")
        .toLocaleLowerCase("bg-BG")
        .normalize("NFKC")
        .replace(/[\s\-_.]+/g, "")
        .trim();

    const resolveStationLogo = name => {
        const normalized = normalizeStationName(name);
        if (!normalized) return null;
        if (["петролкомерс", "petrolcommerce", "petrolkomers"].some(alias => normalized.includes(alias))) return null;

        const rule = stationLogoRules.find(item =>
            item.match.some(alias => normalized.includes(normalizeStationName(alias)))
        );

        return rule?.src || null;
    };

    const installStationLogoResolver = () => {
        window.getStationLogo = resolveStationLogo;
    };

    // This file is loaded before script-base.js, so this listener is registered
    // first and replaces the legacy resolver before its initial card render.
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", installStationLogoResolver, { once: true });
    } else {
        installStationLogoResolver();
    }
})();
