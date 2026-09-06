(() => {
    const STYLE_ID = "goriva-stations-nav-css";
    const EKO_URL = "/stations/eko/";

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
.goriva-stations-nav-brand-logo{display:block;width:28px;height:28px;flex:0 0 28px;background:transparent}
.goriva-stations-nav-brand-label{white-space:nowrap}
@media (min-width:901px){.goriva-stations-nav-item:hover .goriva-stations-nav-dropdown,.goriva-stations-nav-item:focus-within .goriva-stations-nav-dropdown{opacity:1;visibility:visible;transform:translateY(0)}}
@media (max-width:900px){.goriva-stations-nav-item{display:flex!important;width:100%!important;flex-direction:column!important;align-items:stretch!important}.goriva-stations-nav-toggle{width:100%!important;justify-content:flex-start!important}.goriva-stations-nav-dropdown{position:static!important;display:none!important;width:100%!important;min-width:0!important;margin:3px 0 4px!important;padding:6px 6px 6px 28px!important;border:0!important;border-radius:10px!important;background:rgba(255,255,255,.025)!important;box-shadow:none!important;opacity:1!important;visibility:visible!important;transform:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}.goriva-stations-nav-item.is-open>.goriva-stations-nav-dropdown{display:block!important}.goriva-stations-nav-option{min-height:42px}}
`;
        document.head.appendChild(style);
    }

    function ekoIcon() {
        return `<svg class="goriva-stations-nav-brand-logo" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="30" fill="#e52329"/><path d="M15 19h24v7H22v6h15v7H22v6h17v7H15z" fill="#fff"/><path d="M43 20l7 5-7 7 7 7-7 5-11-12z" fill="#fff"/></svg>`;
    }

    function ekoMarkup() {
        return `<span class="goriva-stations-nav-brand">${ekoIcon()}<span class="goriva-stations-nav-brand-label">EKO</span></span><small>цени и обекти</small>`;
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

    function findTarget() {
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

    function setOpen(item, open) {
        if (!item) return;
        item.classList.toggle("is-open", open);
        item.querySelector(".goriva-stations-nav-toggle")?.setAttribute("aria-expanded", String(open));
    }

    function install() {
        const target = findTarget();
        if (!target) return false;
        ensureStyles();
        let item = target.menu.querySelector(".goriva-stations-nav-item");
        if (!item) {
            item = document.createElement("div");
            item.className = "goriva-stations-nav-item";
            item.innerHTML = stationItemMarkup();
            target.home.after(item);
        }
        let eko = item.querySelector(`a[href="${EKO_URL}"]`);
        if (!eko) {
            const candidates = Array.from(item.querySelectorAll(".goriva-stations-nav-option"));
            const old = candidates.find(node => (node.textContent || "").toUpperCase().includes("EKO"));
            if (old) {
                eko = document.createElement("a");
                eko.className = "goriva-stations-nav-option";
                eko.href = EKO_URL;
                eko.setAttribute("role", "menuitem");
                old.replaceWith(eko);
            }
        }
        if (eko) eko.innerHTML = ekoMarkup();
        const current = window.location.pathname === EKO_URL || window.location.pathname.startsWith(EKO_URL);
        item.classList.toggle("is-current", current);
        eko?.classList.toggle("is-current", current);
        if (current) eko?.setAttribute("aria-current", "page");
        return true;
    }

    if (!window.__GORIVA_STATIONS_NAV_EVENTS__) {
        window.__GORIVA_STATIONS_NAV_EVENTS__ = true;
        document.addEventListener("click", event => {
            const toggle = event.target.closest?.(".goriva-stations-nav-toggle");
            if (toggle) {
                event.preventDefault();
                event.stopPropagation();
                const item = toggle.closest(".goriva-stations-nav-item");
                const willOpen = !item?.classList.contains("is-open");
                document.querySelectorAll(".goriva-stations-nav-item.is-open").forEach(node => setOpen(node, false));
                setOpen(item, willOpen);
                return;
            }
            const option = event.target.closest?.("a.goriva-stations-nav-option");
            if (option) {
                setOpen(option.closest(".goriva-stations-nav-item"), false);
                return;
            }
            document.querySelectorAll(".goriva-stations-nav-item.is-open").forEach(node => {
                if (!node.contains(event.target)) setOpen(node, false);
            });
        });
        document.addEventListener("keydown", event => {
            if (event.key !== "Escape") return;
            document.querySelectorAll(".goriva-stations-nav-item.is-open").forEach(node => setOpen(node, false));
        });
    }

    const boot = () => {
        if (install()) return;
        requestAnimationFrame(() => install());
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
    else boot();
})();