(() => {
    const SUPABASE_URL = "https://eaqvhxfvozhzatrnbkvx.supabase.co";
    const SUPABASE_KEY = "sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH";

    function ensureStyles() {
        if (document.getElementById("home-hero-map-pro-css")) return;
        const link = document.createElement("link");
        link.id = "home-hero-map-pro-css";
        link.rel = "stylesheet";
        link.href = "/pages/styles/home-hero-map-pro.css?v=20260831-perf1";
        document.head.appendChild(link);

        if (!document.getElementById("eko-map-promo-css")) {
            const promoStyle = document.createElement("style");
            promoStyle.id = "eko-map-promo-css";
            promoStyle.textContent = `
                .pro-home-hero .eko-map-promo {
                    max-width: 850px;
                    margin: 16px auto 0;
                    padding: 15px 17px;
                    display: grid;
                    grid-template-columns: 42px minmax(0, 1fr) auto;
                    align-items: center;
                    gap: 14px;
                    border: 1px solid rgba(37, 99, 235, .14);
                    border-radius: 14px;
                    background: linear-gradient(135deg, rgba(239, 246, 255, .96), rgba(240, 253, 244, .92));
                    color: #172033;
                    text-align: left;
                    text-decoration: none;
                    box-shadow: 0 10px 28px rgba(15, 23, 42, .07);
                    transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
                }
                .pro-home-hero .eko-map-promo:hover {
                    transform: translateY(-2px);
                    border-color: rgba(37, 99, 235, .26);
                    box-shadow: 0 14px 32px rgba(15, 23, 42, .11);
                }
                .eko-map-promo-icon {
                    width: 42px;
                    height: 42px;
                    display: grid;
                    place-items: center;
                    border-radius: 12px;
                    background: #e8f1ff;
                    color: #2563eb;
                    font-size: 21px;
                    font-weight: 800;
                }
                .eko-map-promo-copy strong,
                .eko-map-promo-copy small {
                    display: block;
                }
                .eko-map-promo-copy strong {
                    font-size: 14px;
                    line-height: 1.3;
                }
                .eko-map-promo-copy small {
                    margin-top: 4px;
                    color: #64748b;
                    font-size: 11px;
                    line-height: 1.45;
                }
                .eko-map-promo-action {
                    color: #2563eb;
                    font-size: 12px;
                    font-weight: 850;
                    white-space: nowrap;
                }
                @media (max-width: 760px) {
                    .pro-home-hero .eko-map-promo {
                        max-width: 520px;
                        grid-template-columns: 40px minmax(0, 1fr);
                    }
                    .eko-map-promo-action {
                        grid-column: 2;
                        white-space: normal;
                    }
                }
            `;
            document.head.appendChild(promoStyle);
        }
    }

    function buildHero() {
        const hero = document.querySelector(".about-project");
        if (!hero || hero.dataset.proHeroReady === "1") return;
        hero.dataset.proHeroReady = "1";
        hero.classList.add("pro-home-hero");
        hero.innerHTML = `
            <div class="about-inner">
                <div class="pro-hero-kicker">Актуални цени от шофьори, за шофьори</div>
                <h1 class="about-title how-title">Намери най-евтиното гориво <span class="hero-gradient">близо до теб</span></h1>
                <p class="about-desc">goriva.online събира реални цени на горивата в България, подадени директно от шофьори.</p>
                <div class="about-points">
                    <div class="hero-benefit"><span class="hero-benefit-icon">⛽</span><span><strong>Реални цени от потребители</strong><small>Актуална информация за деня</small></span></div>
                    <div class="hero-benefit"><span class="hero-benefit-icon">⌖</span><span><strong>По области и градове</strong><small>Бензиностанции в цялата страна</small></span></div>
                    <div class="hero-benefit"><span class="hero-benefit-icon">▥</span><span><strong>Средни и най-ниски стойности</strong><small>Сравни и избери по-добра цена</small></span></div>
                </div>
                <div class="about-cta">
                    <a href="#fuel-form" class="cta-primary">⛽ Сподели цена</a>
                    <a class="facebook-button-1" href="https://www.facebook.com/groups/960591129738525" target="_blank" rel="noopener noreferrer">f&nbsp;&nbsp;Facebook общност</a>
                </div>
                <a class="eko-map-promo" href="#station-map">
                    <span class="eko-map-promo-icon" aria-hidden="true">⌖</span>
                    <span class="eko-map-promo-copy">
                        <strong>102 EKO бензиностанции на едно място</strong>
                        <small>Виж къде се намират обектите, какви горива предлагат и какви са актуалните им цени.</small>
                    </span>
                    <span class="eko-map-promo-action">Разгледай картата →</span>
                </a>
            </div>`;
    }

    function buildMapShell() {
        const section = document.querySelector(".station-map-section");
        const map = document.getElementById("station-map");
        if (!section || !map || section.dataset.proMapReady === "1") return;
        section.dataset.proMapReady = "1";
        section.classList.add("pro-station-map");

        const canvas = document.createElement("div");
        canvas.className = "pro-map-canvas";
        map.parentNode.insertBefore(canvas, map);
        canvas.appendChild(map);

        const header = document.createElement("div");
        header.className = "pro-map-header";
        header.innerHTML = `
            <div class="pro-map-heading"><span class="pro-map-pin">⌖</span><div><h2>Карта на бензиностанциите EKO</h2><p>Картата показва само обектите на EKO в България. Кликни върху маркер за адрес, телефон, предлагани горива и актуални цени.</p></div></div>
            <div class="pro-map-tools"><div class="pro-map-legend" aria-label="Легенда за клъстерите"><span><i class="legend-dot low"></i> 1–20</span><span><i class="legend-dot mid"></i> 21–100</span><span><i class="legend-dot high"></i> 101+</span></div></div>`;

        const stats = document.createElement("aside");
        stats.className = "pro-map-stats";
        stats.innerHTML = `
            <div><h3>Обща статистика</h3></div>
            <div class="map-stat-grid">
                <div class="map-stat-card"><span class="map-stat-icon">⛽</span><div><span class="map-stat-label">EKO обекти</span><strong class="map-stat-value" id="map-stat-stations">—</strong><span class="map-stat-note">На картата</span></div></div>
                <div class="map-stat-card"><span class="map-stat-icon">▤</span><div><span class="map-stat-label">EKO цени днес</span><strong class="map-stat-value" id="map-stat-prices">—</strong><span class="map-stat-note">Записи в базата</span></div></div>
                <div class="map-stat-card"><span class="map-stat-icon">⌖</span><div><span class="map-stat-label">Градове</span><strong class="map-stat-value" id="map-stat-cities">—</strong><span class="map-stat-note">Покритие на картата</span></div></div>
                <div class="map-stat-card"><span class="map-stat-icon">◷</span><div><span class="map-stat-label">Последна проверка</span><strong class="map-stat-value" id="map-stat-updated">—</strong><span class="map-stat-note" id="map-stat-updated-note">Зареждане при показване…</span></div></div>
            </div>`;

        const layout = document.createElement("div");
        layout.className = "pro-map-layout";
        layout.appendChild(canvas);
        layout.appendChild(stats);
        section.innerHTML = "";
        section.appendChild(header);
        section.appendChild(layout);
    }

    const formatNumber = value => new Intl.NumberFormat("bg-BG").format(value);

    const guessCity = station => {
        const address = String(station?.address || "").trim();
        const firstAddressPart = address.split(",")[0]?.trim() || "";
        if (firstAddressPart && !/^(АМ|AM|Главен път|8-ми км|Магистрала)/i.test(firstAddressPart)) {
            return firstAddressPart.replace(/^гр\.\s*/i, "").replace(/^с\.\s*/i, "").trim();
        }
        return String(station?.name || "")
            .replace(/^ЕКО\s+\d+\s*/i, "")
            .split(/[,-]/)[0]
            .trim();
    };

    async function loadMapStats() {
        if (window.__GORIVA_MAP_STATS_LOADING__) return;
        window.__GORIVA_MAP_STATS_LOADING__ = true;
        const stationsEl = document.getElementById("map-stat-stations");
        const citiesEl = document.getElementById("map-stat-cities");
        const pricesEl = document.getElementById("map-stat-prices");
        const updatedEl = document.getElementById("map-stat-updated");
        const updatedNoteEl = document.getElementById("map-stat-updated-note");

        try {
            const response = await fetch("/data/eko_stations.json", { cache: "force-cache" });
            if (!response.ok) throw new Error("EKO registry request failed");
            const data = await response.json();
            const stations = Object.values(data?.stations || {});
            const cities = new Set(
                stations
                    .map(guessCity)
                    .filter(Boolean)
                    .map(city => city.toLocaleLowerCase("bg-BG"))
            );
            if (stationsEl) stationsEl.textContent = formatNumber(stations.length);
            if (citiesEl) citiesEl.textContent = formatNumber(cities.size);
        } catch (error) {
            console.warn("EKO map stats unavailable", error);
        }

        try {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0).toISOString();
            const url = `${SUPABASE_URL}/rest/v1/fuel_prices?select=id&station=eq.${encodeURIComponent("ЕКО")}&created_at=gte.${encodeURIComponent(start)}&created_at=lt.${encodeURIComponent(end)}&limit=1`;
            const response = await fetch(url, { headers: { apikey: SUPABASE_KEY, Prefer: "count=exact" } });
            const total = Number((response.headers.get("content-range") || "").split("/")[1]);
            if (pricesEl && Number.isFinite(total)) pricesEl.textContent = formatNumber(total);
        } catch (error) {
            console.warn("EKO price stats unavailable", error);
        }

        const now = new Date();
        if (updatedEl) updatedEl.textContent = "сега";
        if (updatedNoteEl) updatedNoteEl.textContent = now.toLocaleDateString("bg-BG", { day: "2-digit", month: "short" }) + ", " + now.toLocaleTimeString("bg-BG", { hour: "2-digit", minute: "2-digit" });
    }

    function scheduleMapStats() {
        const section = document.querySelector(".station-map-section");
        if (!section) return;
        if (!("IntersectionObserver" in window)) {
            window.setTimeout(loadMapStats, 1200);
            return;
        }
        const observer = new IntersectionObserver(entries => {
            if (!entries.some(entry => entry.isIntersecting)) return;
            observer.disconnect();
            if ("requestIdleCallback" in window) requestIdleCallback(loadMapStats, { timeout: 1000 });
            else setTimeout(loadMapStats, 0);
        }, { rootMargin: "450px 0px" });
        observer.observe(section);
    }

    function init() {
        ensureStyles();
        buildHero();
        buildMapShell();
        scheduleMapStats();
    }

    init();
})();
