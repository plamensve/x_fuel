// Site-wide mobile/responsive hardening. Keep this bootstrap small and avoid
// synchronous XHR/eval. Above-the-fold and layout-defining homepage modules
// must initialize during parsing so Lighthouse does not see late layout shifts.
(() => {
    if (!document.getElementById("goriva-mobile-responsive-css")) {
        const link = document.createElement("link");
        link.id = "goriva-mobile-responsive-css";
        link.rel = "stylesheet";
        link.href = "/pages/styles/mobile-responsive.css?v=20260831-perf2";
        document.head.appendChild(link);
    }
})();

// Supabase publishable keys are API keys, not JWTs. Strip an invalid Bearer
// copy if older frontend code sends the same sb_publishable_* value.
(() => {
    if (window.__GORIVA_SUPABASE_FETCH_HARDENED__ || typeof window.fetch !== "function") return;
    window.__GORIVA_SUPABASE_FETCH_HARDENED__ = true;
    const nativeFetch = window.fetch.bind(window);

    window.fetch = (input, init = {}) => {
        try {
            const url = typeof input === "string" ? input : input?.url || "";
            if (url.includes(".supabase.co/rest/v1/")) {
                const headers = new Headers(init.headers || (typeof input !== "string" ? input?.headers : undefined) || {});
                const apiKey = headers.get("apikey") || "";
                const authorization = headers.get("Authorization") || "";
                if (apiKey.startsWith("sb_publishable_") && authorization === `Bearer ${apiKey}`) {
                    headers.delete("Authorization");
                    init = { ...init, headers };
                }
            }
        } catch (error) {
            console.warn("Supabase request hardening skipped", error);
        }
        return nativeFetch(input, init);
    };
})();

// EKO fallback: the main price table intentionally requests only today's rows.
// For a specific EKO station that has no row at all today, append the newest
// historical rows available for that station (one latest row per fuel type).
// The database is not modified: only the frontend response is enriched.
(() => {
    if (window.__GORIVA_EKO_FALLBACK__ || typeof window.fetch !== "function") return;
    window.__GORIVA_EKO_FALLBACK__ = true;

    const upstreamFetch = window.fetch.bind(window);
    const EKO_NAME = "ЕКО";
    const PAGE_SIZE = 1000;

    const normalize = value => (value || "").toString().trim().toUpperCase();
    const stationKey = row => normalize(row?.location) || `${normalize(row?.city)}|${normalize(row?.station)}`;
    const fuelKey = row => `${stationKey(row)}|${normalize(row?.fuel)}`;

    const isTodayFuelPricesRequest = (url, init) => {
        const method = (init?.method || "GET").toUpperCase();
        return method === "GET" &&
            url.includes(".supabase.co/rest/v1/fuel_prices") &&
            url.includes("created_at=gte.") &&
            url.includes("created_at=lt.") &&
            !url.includes("station=eq.");
    };

    const readHeader = (input, init, name) => {
        const headers = new Headers(init?.headers || (typeof input !== "string" ? input?.headers : undefined) || {});
        return headers.get(name) || "";
    };

    async function fetchAllHistoricalEko(baseUrl, apiKey, beforeIso) {
        const rows = [];
        let offset = 0;

        while (true) {
            const historyUrl =
                `${baseUrl}/rest/v1/fuel_prices` +
                `?select=*` +
                `&station=eq.${encodeURIComponent(EKO_NAME)}` +
                `&created_at=lt.${encodeURIComponent(beforeIso)}` +
                `&order=created_at.desc` +
                `&limit=${PAGE_SIZE}` +
                `&offset=${offset}`;

            const response = await upstreamFetch(historyUrl, {
                headers: { apikey: apiKey }
            });

            if (!response.ok) {
                throw new Error(`EKO fallback request failed: ${response.status}`);
            }

            const batch = await response.json();
            rows.push(...batch);

            if (batch.length < PAGE_SIZE) break;
            offset += PAGE_SIZE;
        }

        return rows;
    }

    window.fetch = async (input, init = {}) => {
        const url = typeof input === "string" ? input : input?.url || "";
        const response = await upstreamFetch(input, init);

        if (!response.ok || !isTodayFuelPricesRequest(url, init)) {
            return response;
        }

        try {
            const apiKey = readHeader(input, init, "apikey");
            if (!apiKey) return response;

            const todayRows = await response.clone().json();
            if (!Array.isArray(todayRows)) return response;

            const requestUrl = new URL(url);
            const lowerBoundParam = [...requestUrl.searchParams.entries()]
                .find(([key]) => key === "created_at")?.[1];

            // PostgREST query is encoded as created_at=gte.<ISO>. Extract the
            // lower bound directly from the URL because it marks today's start.
            const gteMatch = decodeURIComponent(url).match(/created_at=gte\.([^&]+)/);
            if (!gteMatch) return response;
            const todayStartIso = gteMatch[1];

            const origin = requestUrl.origin;
            const historicalEko = await fetchAllHistoricalEko(origin, apiKey, todayStartIso);

            const todayEkoStations = new Set(
                todayRows
                    .filter(row => normalize(row.station) === EKO_NAME)
                    .map(stationKey)
            );

            const selectedFallbackRows = new Map();

            // historicalEko is ordered newest first. The first row encountered
            // for station+fuel is therefore the latest available observation.
            for (const row of historicalEko) {
                const key = stationKey(row);
                if (!key || todayEkoStations.has(key)) continue;

                const keyWithFuel = fuelKey(row);
                if (!selectedFallbackRows.has(keyWithFuel)) {
                    selectedFallbackRows.set(keyWithFuel, row);
                }
            }

            if (selectedFallbackRows.size === 0) return response;

            const displayTimestamp = new Date().toISOString();
            const fallbackRows = [...selectedFallbackRows.values()].map(row => ({
                ...row,
                _eko_fallback: true,
                _source_created_at: row.created_at,
                created_at: displayTimestamp
            }));

            const merged = [...todayRows, ...fallbackRows];
            const headers = new Headers(response.headers);
            headers.set("Content-Type", "application/json");
            headers.delete("Content-Length");

            return new Response(JSON.stringify(merged), {
                status: response.status,
                statusText: response.statusText,
                headers
            });
        } catch (error) {
            console.warn("EKO latest-price fallback skipped", error);
            return response;
        }
    };
})();

const gorivaLoadScript = (src, { id = "", defer = true } = {}) => {
    if (id && document.getElementById(id)) return Promise.resolve();
    const base = src.split("?")[0];
    const existing = [...document.scripts].find(script => script.src && script.src.includes(base));
    if (existing) return Promise.resolve();

    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        if (id) script.id = id;
        script.src = src;
        script.async = false;
        script.defer = defer;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

// Global navigation is needed site-wide. Load it without blocking HTML parsing.
(() => {
    if (window.__GORIVA_GLOBAL_NAV_LOADER__) return;
    window.__GORIVA_GLOBAL_NAV_LOADER__ = true;
    gorivaLoadScript("/scripts/global-nav.js?v=20260831-perf2", { id: "goriva-global-nav-script" })
        .catch(error => console.error("Failed to load global navigation", error));
})();

// Legacy site logic owns the price table/ticker/form. Keep deterministic
// parser-time loading, but never fall back to synchronous XMLHttpRequest/eval.
(() => {
    const baseSrc = "/scripts/script-base.js?v=20260831-perf2";
    const current = document.currentScript;
    if (document.readyState === "loading" && !current?.defer && !current?.async) {
        document.write(`<script src="${baseSrc}"><\/script>`);
        return;
    }
    gorivaLoadScript(baseSrc, { id: "goriva-script-base" })
        .catch(error => console.error("Failed to load legacy site script", error));
})();

// Homepage hero/map shell defines the initial page geometry. It must run during
// parsing rather than after an idle callback, otherwise the hero/map replacement
// becomes a late LCP candidate and produces large CLS values.
(() => {
    if (window.location.pathname !== "/" && !window.location.pathname.endsWith("/index.html")) return;
    const src = "/scripts/home-hero-map-pro.js?v=20260831-perf2";
    if (document.readyState === "loading") {
        document.write(`<script src="${src}"><\/script>`);
        return;
    }
    gorivaLoadScript(src, { id: "goriva-home-hero-map" })
        .catch(error => console.error("Failed to load homepage hero/map shell", error));
})();

// This module rewrites complete homepage sections and injects their layout CSS.
// Running it at idle caused the page to move after first paint. Initialize it
// during parsing so the final DOM is established before Lighthouse measures LCP/CLS.
(() => {
    if (window.location.pathname !== "/" && !window.location.pathname.endsWith("/index.html")) return;
    const src = "/scripts/home-about-modern.js?v=20260831-perf2";
    if (document.readyState === "loading") {
        document.write(`<script src="${src}"><\/script>`);
        return;
    }
    gorivaLoadScript(src, { id: "goriva-home-about-modern" })
        .catch(error => console.error("Failed to load homepage editorial sections", error));
})();

// Normalize Instagram links after homepage DOM rewrites are complete.
(() => {
    const INSTAGRAM_URL = "https://www.instagram.com/goriva.online/";
    const normalizeInstagramLinks = () => {
        document.querySelectorAll('a[href*="instagram.com"]').forEach(link => {
            link.href = INSTAGRAM_URL;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        });

        const founderSocials = document.querySelector(".founder-socials");
        if (founderSocials && !founderSocials.querySelector('a[href*="instagram.com"]')) {
            const instagram = document.createElement("a");
            instagram.href = INSTAGRAM_URL;
            instagram.target = "_blank";
            instagram.rel = "noopener noreferrer";
            instagram.textContent = "Instagram";
            founderSocials.appendChild(instagram);
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", normalizeInstagramLinks, { once: true });
    } else {
        normalizeInstagramLinks();
    }
})();

// Shared newsroom layout. It changes article structure, so avoid deliberately
// postponing it until idle; establish the final article geometry promptly.
(() => {
    if (!window.location.pathname.includes("/pages/articles/")) return;
    const src = "/scripts/article-modern.js?v=20260831-perf2";
    if (document.readyState === "loading") {
        document.write(`<script src="${src}"><\/script>`);
        return;
    }
    gorivaLoadScript(src, { id: "goriva-article-modern" })
        .catch(error => console.error("Failed to load article layout", error));
})();

// Business clients CTA.
(() => {
    const initBusinessInquiryCta = () => {
        const section = document.querySelector(".business-cta-text");
        const content = section?.querySelector(".cta-content");
        const textLink = section?.querySelector(".cta-highlight");
        const contact = document.getElementById("contact");
        if (!section || !content || !textLink || !contact) return;

        const scrollToContact = event => {
            if (event) event.preventDefault();
            contact.scrollIntoView({ behavior: "smooth", block: "start" });
        };

        textLink.setAttribute("role", "link");
        textLink.setAttribute("tabindex", "0");
        textLink.setAttribute("aria-label", "Изпрати запитване");
        textLink.addEventListener("click", scrollToContact);
        textLink.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") scrollToContact(event);
        });
        content.addEventListener("click", event => {
            if (event.target === content) scrollToContact(event);
        });
    };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initBusinessInquiryCta, { once: true });
    else initBusinessInquiryCta();
})();
