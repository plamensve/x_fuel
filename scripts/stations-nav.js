(() => {
    if (window.__GORIVA_STATIONS_NAV__) return;
    window.__GORIVA_STATIONS_NAV__ = true;

    const STYLE_ID = "goriva-stations-nav-css";

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
.goriva-stations-nav-item{position:relative;display:inline-flex;align-items:stretch}
.goriva-stations-nav-toggle{min-height:40px;padding:0 10px;display:inline-flex;align-items:center;gap:7px;border:0;border-radius:10px;color:#cbd5e1;background:transparent;font:inherit;font-size:12px;font-weight:650;white-space:nowrap;cursor:pointer}
.goriva-stations-nav-toggle:hover,.goriva-stations-nav-toggle:focus-visible,.goriva-stations-nav-item.is-open>.goriva-stations-nav-toggle{color:#fff;background:rgba(255,255,255,.065);outline:none}
.goriva-stations-nav-toggle .goriva-nav-symbol{font-size:13px;opacity:.82}
.goriva-stations-nav-caret{font-size:10px;line-height:1;transition:transform .18s ease}
.goriva-stations-nav-item.is-open .goriva-stations-nav-caret{transform:rotate(180deg)}
.goriva-stations-nav-dropdown{position:absolute;top:calc(100% + 8px);left:0;z-index:7000;min-width:230px;padding:8px;border:1px solid rgba(148,163,184,.16);border-radius:14px;background:rgba(8,17,31,.98);box-shadow:0 18px 42px rgba(2,6,23,.36);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);opacity:0;visibility:hidden;transform:translateY(-4px);transition:opacity .16s ease,transform .16s ease,visibility .16s ease}
.goriva-stations-nav-item.is-open .goriva-stations-nav-dropdown{opacity:1;visibility:visible;transform:translateY(0)}
.goriva-stations-nav-option{width:100%;min-height:42px;padding:0 12px;display:flex;align-items:center;justify-content:space-between;gap:12px;border:0;border-radius:9px;color:#dbe7f4;background:transparent;font:inherit;font-size:12px;font-weight:650;text-align:left}
.goriva-stations-nav-option+.goriva-stations-nav-option{margin-top:3px}
.goriva-stations-nav-option:hover,.goriva-stations-nav-option:focus-visible{color:#fff;background:rgba(255,255,255,.06);outline:none}
.goriva-stations-nav-option[aria-disabled="true"]{cursor:default}
.goriva-stations-nav-option small{color:#64748b;font-size:10px;font-weight:700;letter-spacing:.02em}
@media (min-width:901px){.goriva-stations-nav-item:hover .goriva-stations-nav-dropdown,.goriva-stations-nav-item:focus-within .goriva-stations-nav-dropdown{opacity:1;visibility:visible;transform:translateY(0)}}
@media (max-width:900px){.goriva-stations-nav-item{display:flex;width:100%;flex-direction:column}.goriva-stations-nav-toggle{width:100%;justify-content:flex-start}.goriva-stations-nav-dropdown{position:static;display:none;width:100%;min-width:0;margin:3px 0 4px;padding:6px 6px 6px 28px;border:0;border-radius:10px;background:rgba(255,255,255,.025);box-shadow:none;opacity:1;visibility:visible;transform:none;backdrop-filter:none;-webkit-backdrop-filter:none}.goriva-stations-nav-item.is-open .goriva-stations-nav-dropdown{display:block}.goriva-stations-nav-option{min-height:38px}}
`;
        document.head.appendChild(style);
    }

    function closeDropdown(item) {
        if (!item) return;
        item.classList.remove("is-open");
        item.querySelector(".goriva-stations-nav-toggle")?.setAttribute("aria-expanded", "false");
    }

    function install() {
        const menu = document.querySelector(".goriva-global-menu");
        if (!menu || menu.querySelector(".goriva-stations-nav-item")) return false;

        const homeLink = Array.from(menu.children).find(node => node.matches?.('a[href="/"]'));
        if (!homeLink) return false;

        ensureStyles();

        const item = document.createElement("div");
        item.className = "goriva-stations-nav-item";
        item.innerHTML = `
            <button class="goriva-stations-nav-toggle" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="goriva-stations-dropdown">
                <span class="goriva-nav-symbol" aria-hidden="true">⛽</span>
                <span>Бензиностанции</span>
                <span class="goriva-stations-nav-caret" aria-hidden="true">▾</span>
            </button>
            <div id="goriva-stations-dropdown" class="goriva-stations-nav-dropdown" role="menu" aria-label="Бензиностанции">
                <button class="goriva-stations-nav-option" type="button" role="menuitem" aria-disabled="true"><span>Всички бензиностанции</span><small>скоро</small></button>
                <button class="goriva-stations-nav-option" type="button" role="menuitem" aria-disabled="true"><span>EKO</span><small>скоро</small></button>
            </div>`;

        homeLink.after(item);

        const toggle = item.querySelector(".goriva-stations-nav-toggle");
        toggle.addEventListener("click", event => {
            event.stopPropagation();
            const open = item.classList.toggle("is-open");
            toggle.setAttribute("aria-expanded", String(open));
        });

        document.addEventListener("click", event => {
            if (!item.contains(event.target)) closeDropdown(item);
        });
        document.addEventListener("keydown", event => {
            if (event.key === "Escape") closeDropdown(item);
        });

        return true;
    }

    if (!install()) {
        const observer = new MutationObserver(() => {
            if (install()) observer.disconnect();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        window.setTimeout(() => observer.disconnect(), 10000);
    }
})();
