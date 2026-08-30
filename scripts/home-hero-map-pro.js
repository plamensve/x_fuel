(() => {
    const SUPABASE_URL = "https://eaqvhxfvozhzatrnbkvx.supabase.co";
    const SUPABASE_KEY = "sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH";

    function ensureStyles() {
        if (document.getElementById("home-hero-map-pro-css")) return;
        const link = document.createElement("link");
        link.id = "home-hero-map-pro-css";
        link.rel = "stylesheet";
        link.href = "/pages/styles/home-hero-map-pro.css?v=20260829-hero-map";
        document.head.appendChild(link);
    }

    function buildHero() {
        const hero = document.querySelector(".about-project");
        if (!hero || hero.dataset.proHeroReady === "1") return;

        hero.dataset.proHeroReady = "1";
        hero.classList.add("pro-home-hero");
        hero.innerHTML = `
            <div class="about-inner">
                <div class="pro-hero-kicker">Актуални цени от шофьори, за шофьори</div>
                <h1 class="about-title how-title">
                    Намери най-евтиното гориво
                    <span class="hero-gradient">близо до теб</span>
                </h1>
                <p class="about-desc">
                    goriva.online събира реални цени на горивата в България, подадени директно от шофьори.
                </p>
                <div class="about-points">
                    <div class="hero-benefit">
                        <span class="hero-benefit-icon">⛽</span>
                        <span><strong>Реални цени от потребители</strong><small>Актуална информация за деня</small></span>
                    </div>
                    <div class="hero-benefit">
                        <span class="hero-benefit-icon">⌖</span>
                        <span><strong>По области и градове</strong><small>Бензиностанции в цялата страна</small></span>
                    </div>
                    <div class="hero-benefit">
                        <span class="hero-benefit-icon">▥</span>
                        <span><strong>Средни и най-ниски стойности</strong><small>Сравни и избери по-добра цена</small></span>
                    </div>
                </div>
                <div class="about-cta">
                    <a href="#fuel-form" class="cta-primary">⛽ Сподели цена</a>
                    <a class="facebook-button-1" href="https://www.facebook.com/groups/960591129738525" target="_blank" rel="noopener noreferrer">f&nbsp;&nbsp;Facebook общност</a>
                    <a class="instagram-button-1" href="https://www.instagram.com/goriva.online/" target="_blank" rel="noopener noreferrer">◎&nbsp;&nbsp;Последвайте ни в Instagram</a>
                </div>
            </div>
        `;
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
            <div class="pro-map-heading">
                <span class="pro-map-pin">⌖</span>
                <div>
                    <h2>Карта на бензиностанциите</h2>
                    <p>Кликни върху клъстер или маркер за повече информация</p>
                </div>
            </div>
            <div class="pro-map-tools">
                <div class="pro-map-chip">Карта на България</div>
                <div class="pro-map-legend" aria-label="Легенда за клъстерите">
                    <span><i class="legend-dot low"></i> 1–20</span>
                    <span><i class="legend-dot mid"></i> 21–100</span>
                    <span><i class="legend-dot high"></i> 101+</span>
                </div>
            </div>
        `;

        const stats = document.createElement("aside");
        stats.className = "pro-map-stats";
        stats.innerHTML = `
            <div><h3>Обща статистика</h3><p>Данни за картата</p></div>
            <div class="map-stat-grid">
                <div class="map-stat-card">
                    <span class="map-stat-icon">⛽</span>
                    <div><span class="map-stat-label">Бензиностанции</span><strong class="map-stat-value" id="map-stat-stations">—</strong><span class="map-stat-note">На картата</span></div>
                </div>
                <div class="map-stat-card">
                    <span class="map-stat-icon">▤</span>
                    <div><span class="map-stat-label">Цени днес</span><strong class="map-stat-value" id="map-stat-prices">—</strong><span class="map-stat-note">Записи в базата</span></div>
                </div>
                <div class="map-stat-card">
                    <span class="map-stat-icon">⌖</span>
                    <div><span class="map-stat-label">Градове</span><strong class="map-stat-value" id="map-stat-cities">—</strong><span class="map-stat-note">Покритие на картата</span></div>
                </div>
                <div class="map-stat-card">
                    <span class="map-stat-icon">◷</span>
                    <div><span class="map-stat-label">Последна проверка</span><strong class="map-stat-value" id="map-stat-updated">сега</strong><span class="map-stat-note" id="map-stat-updated-note">Зареждане…</span></div>
                </div>
            </div>
            <a class="map-stats-link" href="#prices-container">Виж актуалните цени →</a>
        `;

        const layout = document.createElement("div");
        layout.className = "pro-map-layout";
        layout.appendChild(canvas);
        layout.appendChild(stats);

        section.innerHTML = "";
        section.appendChild(header);
        section.appendChild(layout);
    }

    function formatNumber(value) {
        return new Intl.NumberFormat("bg-BG").format(value);
    }

    async function loadMapStats() {
        const stationsEl = document.getElementById("map-stat-stations");
        const citiesEl = document.getElementById("map-stat-cities");
        const pricesEl = document.getElementById("map-stat-prices");
        const updatedEl = document.getElementById("map-stat-updated");
        const updatedNoteEl = document.getElementById("map-stat-updated-note");

        try {
            const response = await fetch("/data/export.geojson", {cache: "no-store"});
            if (!response.ok) throw new Error("GeoJSON request failed");
            const data = await response.json();
            const features = Array.isArray(data.features) ? data.features : [];
            const cities = new Set();

            features.forEach(feature => {
                const p = feature.properties || {};
                const city = p["addr:city"] || p["addr:place"] || p.city || "";
                if (String(city).trim()) cities.add(String(city).trim().toLocaleLowerCase("bg-BG"));
            });

            if (stationsEl) stationsEl.textContent = formatNumber(features.length);
            if (citiesEl) citiesEl.textContent = formatNumber(cities.size);
        } catch (error) {
            console.warn("Map stats unavailable", error);
        }

        try {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0).toISOString();
            const url = `${SUPABASE_URL}/rest/v1/fuel_prices?select=id&created_at=gte.${encodeURIComponent(start)}&created_at=lt.${encodeURIComponent(end)}&limit=1`;
            const response = await fetch(url, {
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    Prefer: "count=exact"
                }
            });
            const range = response.headers.get("content-range") || "";
            const total = Number(range.split("/")[1]);
            if (pricesEl && Number.isFinite(total)) pricesEl.textContent = formatNumber(total);
        } catch (error) {
            console.warn("Price stats unavailable", error);
        }

        const now = new Date();
        if (updatedEl) updatedEl.textContent = "сега";
        if (updatedNoteEl) {
            updatedNoteEl.textContent = now.toLocaleDateString("bg-BG", {day: "2-digit", month: "short"}) + ", " +
                now.toLocaleTimeString("bg-BG", {hour: "2-digit", minute: "2-digit"});
        }
    }

    function init() {
        ensureStyles();
        buildHero();
        buildMapShell();
        loadMapStats();
    }

    if (document.readyState === "loading") {
        init();
    } else {
        init();
    }
})();