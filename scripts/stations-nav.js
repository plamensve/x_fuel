(() => {
    const STYLE_ID = "goriva-stations-nav-css";
    const EKO_URL = "/stations/eko/";
    const EKO_LOGO_URL = "/images/station_logos/eko.svg";

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
.goriva-stations-nav-item{position:relative;display:inline-flex;align-items:stretch}
.goriva-stations-nav-toggle{min-height:40px;padding:0 10px;display:inline-flex;align-items:center;gap:7px;border:0;border-radius:10px;color:#cbd5e1;background:transparent;font:inherit;font-size:12px;font-weight:650;white-space:nowrap;cursor:pointer}
.goriva-stations-nav-toggle:hover,.goriva-stations-nav-toggle:focus-visible,.goriva-stations-nav-item.is-open>.goriva-stations-nav-toggle,.goriva-stations-nav-item.is-current>.goriva-stations-nav-toggle{color:#fff;background:rgba(255,255,255,.065);outline:none}
.goriva-stations-nav-toggle .goriva-nav-symbol{font-size:13px;opacity:.82}
.goriva-stations-nav-caret{font-size:10px;line-height:1;transition:transform .18s ease}
.goriva-stations-nav-item.is-open .goriva-stations-nav-caret{transform:rotate(180deg)}
.goriva-stations-nav-dropdown{position:absolute;top:calc(100% + 8px);left:0;z-index:7000;min-width:230px;padding:8px;border:1px solid rgba(148,163,184,.16);border-radius:14px;background:rgba(8,17,31,.98);box-shadow:0 18px 42px rgba(2,6,23,.36);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);opacity:0;visibility:hidden;transform:translateY(-4px);transition:opacity .16s ease,transform .16s ease,visibility .16s ease}
.goriva-stations-nav-item.is-open .goriva-stations-nav-dropdown{opacity:1;visibility:visible;transform:translateY(0)}
.goriva-stations-nav-option{width:100%;min-height:42px;padding:0 12px;display:flex;align-items:center;justify-content:space-between;gap:12px;border:0;border-radius:9px;color:#dbe7f4;background:transparent;font:inherit;font-size:12px;font-weight:650;text-align:left;text-decoration:none;cursor:pointer}
.goriva-stations-nav-option+.goriva-stations-nav-option{margin-top:3px}
.goriva-stations-nav-option:hover,.goriva-stations-nav-option:focus-visible,.goriva-stations-nav-option.is-current{color:#fff;background:rgba(255,255,255,.06);outline:none}
.goriva-stations-nav-option[aria-disabled="true"]{cursor:default}
.goriva-stations-nav-option small{color:#64748b;font-size:10px;font-weight:700;letter-spacing:.02em}
.goriva-stations-nav-brand{display:inline-flex;min-width:0;align-items:center;gap:8px}
.goriva-stations-nav-brand-logo{width:26px;height:26px;flex:0 0 26px;padding:2px;border-radius:6px;background:#fff;object-fit:contain}
.goriva-stations-nav-brand-label{white-space:nowrap}
@media (min-width:901px){.goriva-stations-nav-item:hover .goriva-stations-nav-dropdown,.goriva-stations-nav-item:focus-within .goriva-stations-nav-dropdown{opacity:1;visibility:visible;transform:translateY(0)}}
@media (max-width:900px){.goriva-stations-nav-item{display:flex;width:100%;flex-direction:column}.goriva-stations-nav-toggle{width:100%;justify-content:flex-start}.goriva-stations-nav-dropdown{position:static;display:none;width:100%;min-width:0;margin:3px 0 4px;padding:6px 6px 6px 28px;border:0;border-radius:10px;background:rgba(255,255,255,.025);box-shadow:none;opacity:1;visibility:visible;transform:none;backdrop-filter:none;-webkit-backdrop-filter:none}.goriva-stations-nav-item.is-open .goriva-stations-nav-dropdown{display:block}.goriva-stations-nav-option{min-height:42px}}
`;
        document.head.appendChild(style);
    }

    function ekoMarkup() {
        return `<span class="goriva-stations-nav-brand"><img class="goriva-stations-nav-brand-logo" src="${EKO_LOGO_URL}" alt="" width="26" height="26" loading="lazy" decoding="async"><span class="goriva-stations-nav-brand-label">EKO</span></span><small>цени и обекти</small>`;
    }

    function closeDropdown(item) {
        if (!item) return;
        item.classList.remove("is-open");
        item.querySelector(".goriva-stations-nav-toggle")?.setAttribute("aria-expanded", "false");
    }

    function wireItem(item) {
        if (!item || item.dataset.stationsNavWired === "true") return;
        item.dataset.stationsNavWired = "true";
        const toggle = item.querySelector(".goriva-stations-nav-toggle");

        toggle?.addEventListener("click", event => {
            event.stopPropagation();
            const open = item.classList.toggle("is-open");
            toggle.setAttribute("aria-expanded", String(open));
        });

        item.addEventListener("click", event => {
            if (event.target.closest("a.goriva-stations-nav-option")) closeDropdown(item);
        });

        document.addEventListener("click", event => {
            if (item.isConnected && !item.contains(event.target)) closeDropdown(item);
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") closeDropdown(item);
        });
    }

    function findMenuAndHome() {
        const globalMenu = document.querySelector(".goriva-global-menu");
        if (globalMenu) {
            const home = Array.from(globalMenu.children).find(node => node.matches?.('a[href="/"]'));
            if (home) return { menu: globalMenu, home };
        }

        const legacyMenu = document.getElementById("nav-menu");
        if (legacyMenu) {
            const home = Array.from(legacyMenu.children).find(node => {
                if (!node.matches?.("a")) return false;
                const href = node.getAttribute("href") || "";
                return href === "index.html" || href === "../index.html" || href === "/" || href.endsWith("/index.html");
            });
            if (home) return { menu: legacyMenu, home };
        }

        return null;
    }

    function stationItemMarkup() {
        return `
            <button class="goriva-stations-nav-toggle" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="goriva-stations-dropdown">
                <span class="goriva-nav-symbol" aria-hidden="true">⛽</span>
                <span>Бензиностанции</span>
                <span class="goriva-stations-nav-caret" aria-hidden="true">▾</span>
            </button>
            <div id="goriva-stations-dropdown" class="goriva-stations-nav-dropdown" role="menu" aria-label="Бензиностанции">
                <button class="goriva-stations-nav-option" type="button" role="menuitem" aria-disabled="true"><span>Всички бензиностанции</span><small>скоро</small></button>
                <a class="goriva-stations-nav-option" href="${EKO_URL}" role="menuitem">${ekoMarkup()}</a>
            </div>`;
    }

    function ensureEkoLink(item) {
        if (!item) return;
        const options = Array.from(item.querySelectorAll(".goriva-stations-nav-option"));
        let eko = options.find(node => node.getAttribute?.("href") === EKO_URL || (node.textContent || "").toUpperCase().includes("EKO"));
        if (!eko) return;

        if (eko.tagName !== "A") {
            const link = document.createElement("a");
            link.className = "goriva-stations-nav-option";
            link.href = EKO_URL;
            link.setAttribute("role", "menuitem");
            link.innerHTML = ekoMarkup();
            eko.replaceWith(link);
            eko = link;
        } else if (!eko.querySelector(".goriva-stations-nav-brand-logo")) {
            eko.innerHTML = ekoMarkup();
        }

        const isCurrent = window.location.pathname === EKO_URL || window.location.pathname.startsWith(EKO_URL);
        item.classList.toggle("is-current", isCurrent);
        eko.classList.toggle("is-current", isCurrent);
        if (isCurrent) eko.setAttribute("aria-current", "page");
        else eko.removeAttribute("aria-current");
    }

    function install() {
        const target = findMenuAndHome();
        if (!target) return false;
        ensureStyles();

        let item = target.menu.querySelector(".goriva-stations-nav-item");
        if (!item) {
            item = document.createElement("div");
            item.className = "goriva-stations-nav-item";
            item.innerHTML = stationItemMarkup();
            target.home.after(item);
        }

        ensureEkoLink(item);
        wireItem(item);
        return true;
    }

    if (!install()) {
        const retry = () => {
            if (!install()) window.requestAnimationFrame(() => install());
        };
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", retry, { once: true });
        } else {
            retry();
        }
    }
})();