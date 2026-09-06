(() => {
    if (window.__GORIVA_EKO_FALLBACK__) return;
    if (typeof window.fetch !== "function") return;

    // Prevent the legacy fallback in script.js from installing a second wrapper.
    window.__GORIVA_EKO_FALLBACK__ = true;

    const nativeFetch = window.fetch.bind(window);
    const EKO_NAME = "ЕКО";
    const HISTORY_LIMIT = 1200;
    const COMPLETE_STATION_THRESHOLD = 95;
    const historyCache = new Map();

    const normalize = value => (value || "").toString().trim().toUpperCase();
    const stationKey = row => normalize(row?.location) || `${normalize(row?.city)}|${normalize(row?.station)}`;
    const fuelKey = row => `${stationKey(row)}|${normalize(row?.fuel)}`;

    function isTodayFuelPricesRequest(url, init) {
        const method = (init?.method || "GET").toUpperCase();
        return method === "GET" &&
            url.includes(".supabase.co/rest/v1/fuel_prices") &&
            url.includes("created_at=gte.") &&
            url.includes("created_at=lt.") &&
            !url.includes("station=eq.");
    }

    function readApiKey(input, init) {
        const headers = new Headers(init?.headers || (typeof input !== "string" ? input?.headers : undefined) || {});
        return headers.get("apikey") || "";
    }

    function todayStartFromUrl(url) {
        const match = decodeURIComponent(url).match(/created_at=gte\.([^&]+)/);
        return match ? match[1] : null;
    }

    async function fetchRecentHistoricalEko(origin, apiKey, beforeIso) {
        const cacheKey = `${origin}|${beforeIso}`;
        if (!historyCache.has(cacheKey)) {
            const promise = (async () => {
                const params = new URLSearchParams({
                    select: "*",
                    station: `eq.${EKO_NAME}`,
                    created_at: `lt.${beforeIso}`,
                    order: "created_at.desc",
                    limit: String(HISTORY_LIMIT)
                });

                const response = await nativeFetch(`${origin}/rest/v1/fuel_prices?${params.toString()}`, {
                    headers: { apikey: apiKey }
                });

                if (!response.ok) throw new Error(`EKO fallback request failed: ${response.status}`);
                const rows = await response.json();
                return Array.isArray(rows) ? rows : [];
            })().catch(error => {
                historyCache.delete(cacheKey);
                throw error;
            });

            historyCache.set(cacheKey, promise);
        }
        return historyCache.get(cacheKey);
    }

    window.fetch = async (input, init = {}) => {
        const url = typeof input === "string" ? input : input?.url || "";
        const response = await nativeFetch(input, init);

        if (!response.ok || !isTodayFuelPricesRequest(url, init)) return response;

        try {
            const apiKey = readApiKey(input, init);
            const todayStartIso = todayStartFromUrl(url);
            if (!apiKey || !todayStartIso) return response;

            const todayRows = await response.clone().json();
            if (!Array.isArray(todayRows)) return response;

            const todayEkoStations = new Set(
                todayRows
                    .filter(row => normalize(row.station) === EKO_NAME)
                    .map(stationKey)
                    .filter(Boolean)
            );

            // A normal direct EKO import covers roughly the full network. When
            // coverage is already healthy there is nothing to backfill, so avoid
            // an additional historical network request entirely.
            if (todayEkoStations.size >= COMPLETE_STATION_THRESHOLD) return response;

            const requestUrl = new URL(url);
            const historicalEko = await fetchRecentHistoricalEko(requestUrl.origin, apiKey, todayStartIso);

            const selectedFallbackRows = new Map();
            for (const row of historicalEko) {
                const key = stationKey(row);
                if (!key || todayEkoStations.has(key)) continue;
                const keyWithFuel = fuelKey(row);
                if (!selectedFallbackRows.has(keyWithFuel)) selectedFallbackRows.set(keyWithFuel, row);
            }

            if (!selectedFallbackRows.size) return response;

            const displayTimestamp = new Date().toISOString();
            const fallbackRows = [...selectedFallbackRows.values()].map(row => ({
                ...row,
                _eko_fallback: true,
                _source_created_at: row.created_at,
                created_at: displayTimestamp
            }));

            const headers = new Headers(response.headers);
            headers.set("Content-Type", "application/json");
            headers.delete("Content-Length");

            return new Response(JSON.stringify([...todayRows, ...fallbackRows]), {
                status: response.status,
                statusText: response.statusText,
                headers
            });
        } catch (error) {
            console.warn("Efficient EKO fallback skipped", error);
            return response;
        }
    };
})();