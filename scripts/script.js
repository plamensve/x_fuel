// Site-wide mobile/responsive hardening. Loaded last so it can fix page-specific overflow safely.
(() => {
    if (document.getElementById("goriva-mobile-responsive-css")) return;
    const link = document.createElement("link");
    link.id = "goriva-mobile-responsive-css";
    link.rel = "stylesheet";
    link.href = "/pages/styles/mobile-responsive.css?v=20260830-mobile-audit1";
    document.head.appendChild(link);
})();

(() => {
    const navSrc = "/scripts/global-nav.js?v=20260830-privacy1";
    if (!window.__GORIVA_GLOBAL_NAV_LOADER__) {
        window.__GORIVA_GLOBAL_NAV_LOADER__ = true;
        const navScript = document.createElement("script");
        navScript.src = navSrc;
        navScript.async = false;
        document.head.appendChild(navScript);
    }

    const baseSrc = "/scripts/script-base.js?v=20260829-all-today-prices";
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
        console.error("Failed to load legacy site script", error);
    }
})();

// Homepage hero + station-map visual redesign.
(() => {
    const src = "/scripts/home-hero-map-pro.js?v=20260830-instagram-fix1";

    if (document.readyState === "loading") {
        document.write(`<script src="${src}"><\/script>`);
        return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
})();

// Homepage process + founder / partnerships redesign.
(() => {
    if (window.location.pathname !== '/' && !window.location.pathname.endsWith('/index.html')) return;
    const src = "/scripts/home-about-modern.js?v=20260829-1123";
    if (document.readyState === "loading") {
        document.write(`<script src="${src}"><\/script>`);
        return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
})();

// Normalize Instagram links after all homepage DOM rewrites.
(() => {
    const INSTAGRAM_URL = "https://www.instagram.com/goriva.online/";

    const normalizeInstagramLinks = () => {
        document.querySelectorAll('a[href*="instagram.com"]').forEach(link => {
            link.href = INSTAGRAM_URL;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        });

        const founderSocials = document.querySelector('.founder-socials');
        if (founderSocials && !founderSocials.querySelector('a[href*="instagram.com"]')) {
            const instagram = document.createElement('a');
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

// Shared newsroom layout for article pages.
(() => {
    if (!window.location.pathname.includes('/pages/articles/')) return;
    const src = "/scripts/article-modern.js?v=20260829-newsroom1";
    if (document.readyState === "loading") {
        document.write(`<script src="${src}"><\/script>`);
        return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
})();

// Business clients CTA.
(() => {
    const initBusinessInquiryCta = () => {
        const section = document.querySelector(".business-cta-text");
        const content = section?.querySelector(".cta-content");
        const textLink = section?.querySelector(".cta-highlight");
        const contact = document.getElementById("contact");

        if (!section || !content || !textLink || !contact) return;

        const scrollToContact = (event) => {
            if (event) event.preventDefault();
            contact.scrollIntoView({ behavior: "smooth", block: "start" });
        };

        textLink.setAttribute("role", "link");
        textLink.setAttribute("tabindex", "0");
        textLink.setAttribute("aria-label", "Изпрати запитване");

        textLink.addEventListener("click", scrollToContact);
        textLink.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") scrollToContact(event);
        });

        content.addEventListener("click", (event) => {
            if (event.target === content) scrollToContact(event);
        });
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initBusinessInquiryCta, { once: true });
    } else {
        initBusinessInquiryCta();
    }
})();