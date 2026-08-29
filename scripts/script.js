(() => {
    const navSrc = "/scripts/global-nav.js?v=20260829-1100";
    if (!window.__GORIVA_GLOBAL_NAV_LOADER__) {
        window.__GORIVA_GLOBAL_NAV_LOADER__ = true;
        const navScript = document.createElement("script");
        navScript.src = navSrc;
        navScript.async = false;
        document.head.appendChild(navScript);
    }

    const baseSrc = "/scripts/script-base.js?v=20260828-2108";
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
    const src = "/scripts/home-hero-map-pro.js?v=20260829-hero-map";

    if (document.readyState === "loading") {
        document.write(`<script src="${src}"><\/script>`);
        return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
})();

// Shared editorial layout for article pages.
(() => {
    if (!window.location.pathname.includes('/pages/articles/')) return;
    const src = "/scripts/article-modern.js?v=20260829-article3";
    if (document.readyState === "loading") {
        document.write(`<script src="${src}"><\/script>`);
        return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
})();

// Business clients CTA: the approved design renders the right-side button as a CSS
// pseudo-element, so it needs an explicit click handler to behave like a real link.
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
            if (event.key === "Enter" || event.key === " ") {
                scrollToContact(event);
            }
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
