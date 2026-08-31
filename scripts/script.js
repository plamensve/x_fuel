// Site-wide mobile/responsive hardening. Keep this tiny bootstrap as the single
// compatibility layer for legacy pages, but avoid synchronous XHR/eval and
// defer below-the-fold enhancements until the browser is idle.
(() => {
    if (!document.getElementById("goriva-mobile-responsive-css")) {
        const link = document.createElement("link");
        link.id = "goriva-mobile-responsive-css";
        link.rel = "stylesheet";
        link.href = "/pages/styles/mobile-responsive.css?v=20260831-perf1";
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

const gorivaLoadScript = (src, { id = "", defer = true } = {}) => {
    if (id && document.getElementById(id)) return Promise.resolve();
    const existing = [...document.scripts].find(script => script.src && script.src.includes(src.split("?")[0]));
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

const gorivaWhenIdle = callback => {
    if ("requestIdleCallback" in window) {
        window.requestIdleCallback(callback, { timeout: 1800 });
    } else {
        window.setTimeout(callback, 350);
    }
};

// Global navigation is needed site-wide. Load it without blocking HTML parsing.
(() => {
    if (window.__GORIVA_GLOBAL_NAV_LOADER__) return;
    window.__GORIVA_GLOBAL_NAV_LOADER__ = true;
    gorivaLoadScript("/scripts/global-nav.js?v=20260831-perf1", { id: "goriva-global-nav-script" })
        .catch(error => console.error("Failed to load global navigation", error));
})();

// Legacy site logic still owns the price table/ticker/form. During parser-time
// loading keep document.write for deterministic DOMContentLoaded registration,
// but remove the old synchronous XMLHttpRequest + eval fallback entirely.
(() => {
    const baseSrc = "/scripts/script-base.js?v=20260831-perf1";
    const current = document.currentScript;
    if (document.readyState === "loading" && !current?.defer && !current?.async) {
        document.write(`<script src="${baseSrc}"><\/script>`);
        return;
    }
    gorivaLoadScript(baseSrc, { id: "goriva-script-base" })
        .catch(error => console.error("Failed to load legacy site script", error));
})();

// Homepage hero/map shell is above the fold and should be ready immediately.
(() => {
    if (window.location.pathname !== "/" && !window.location.pathname.endsWith("/index.html")) return;
    const src = "/scripts/home-hero-map-pro.js?v=20260831-perf1";
    if (document.readyState === "loading") {
        document.write(`<script src="${src}"><\/script>`);
        return;
    }
    gorivaLoadScript(src, { id: "goriva-home-hero-map" })
        .catch(error => console.error("Failed to load homepage hero/map shell", error));
})();

// Below-the-fold homepage redesign can wait until the browser has completed the
// critical rendering path. Nothing is removed; only initialization timing changes.
(() => {
    if (window.location.pathname !== "/" && !window.location.pathname.endsWith("/index.html")) return;
    gorivaWhenIdle(() => {
        gorivaLoadScript("/scripts/home-about-modern.js?v=20260831-perf1", { id: "goriva-home-about-modern" })
            .catch(error => console.error("Failed to load homepage editorial sections", error));
    });
})();

// Normalize Instagram links after homepage DOM rewrites.
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

    const schedule = () => gorivaWhenIdle(normalizeInstagramLinks);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule, { once: true });
    else schedule();
})();

// Shared newsroom layout is not part of the first paint; initialize it after the
// article HTML is visible.
(() => {
    if (!window.location.pathname.includes("/pages/articles/")) return;
    gorivaWhenIdle(() => {
        gorivaLoadScript("/scripts/article-modern.js?v=20260831-perf1", { id: "goriva-article-modern" })
            .catch(error => console.error("Failed to load article layout", error));
    });
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
