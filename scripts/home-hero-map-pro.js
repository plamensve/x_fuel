(() => {
    const SUPABASE_URL = "https://eaqvhxfvozhzatrnbkvx.supabase.co";
    const SUPABASE_KEY = "sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH";

    function ensureStyles() {
        if (!document.getElementById("home-hero-map-pro-css")) {
            const link = document.createElement("link");
            link.id = "home-hero-map-pro-css";
            link.rel = "stylesheet";
            link.href = "/pages/styles/home-hero-map-pro.css?v=20260905-eko-redesign";
            document.head.appendChild(link);
        }

        if (!document.getElementById("eko-map-redesign-css")) {
            const style = document.createElement("style");
            style.id = "eko-map-redesign-css";
            style.textContent = `
                .header-bar .facebook-button { display: none !important; }

                .pro-home-hero .about-cta {
                    justify-content: center;
                }

                .pro-home-hero .eko-map-promo {
                    position: relative;
                    overflow: hidden;
                    max-width: 850px;
                    margin: 18px auto 0;
                    padding: 2px;
                    display: block;
                    border-radius: 17px;
                    background: linear-gradient(120deg, #833ab4 0%, #c13584 28%, #e1306c 50%, #fd1d1d 70%, #f77737 86%, #fcb045 100%);
                    text-decoration: none;
                    box-shadow: 0 14px 34px rgba(131, 58, 180, .18);
                    transition: transform .2s ease, box-shadow .2s ease;
                }

                .pro-home-hero .eko-map-promo:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 18px 42px rgba(193, 53, 132, .24);
                }

                .eko-map-promo-inner {
                    min-height: 82px;
                    padding: 14px 15px;
                    display: grid;
                    grid-template-columns: 46px minmax(0, 1fr) auto;
                    align-items: center;
                    gap: 15px;
                    border-radius: 15px;
                    background: rgba(255,255,255,.97);
                    text-align: left;
                }

                .eko-map-promo-icon {
                    width: 46px;
                    height: 46px;
                    display: grid;
                    place-items: center;
                    border-radius: 13px;
                    color: #fff;
                    background: linear-gradient(135deg, #833ab4, #e1306c 58%, #f77737);
                    font-size: 21px;
                    font-weight: 900;
                    box-shadow: 0 8px 18px rgba(193,53,132,.22);
                }

                .eko-map-promo-copy strong,
                .eko-map-promo-copy small { display: block; }

                .eko-map-promo-copy strong {
                    color: #172033;
                    font-size: 15px;
                    line-height: 1.3;
                }

                .eko-map-promo-copy small {
                    margin-top: 4px;
                    color: #64748b;
                    font-size: 11px;
                    line-height: 1.5;
                }

                .eko-map-promo-action {
                    min-height: 42px;
                    padding: 0 16px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                    border-radius: 12px;
                    color: #fff;
                    background: linear-gradient(120deg, #833ab4 0%, #c13584 35%, #e1306c 62%, #f77737 100%);
                    box-shadow: 0 9px 20px rgba(193,53,132,.22);
                    font-size: 12px;
                    font-weight: 850;
                    white-space: nowrap;
                    transition: transform .18s ease, box-shadow .18s ease;
                }

                .eko-map-promo:hover .eko-map-promo-action {
                    transform: translateX(2px);
                    box-shadow: 0 11px 24px rgba(193,53,132,.28);
                }

                .station-map-section.pro-station-map {
                    border: 2px solid transparent !important;
                    background:
                        linear-gradient(145deg, #0b1b30 0%, #071424 100%) padding-box,
                        linear-gradient(125deg, #833ab4 0%, #c13584 28%, #e1306c 52%, #fd1d1d 72%, #f77737 88%, #fcb045 100%) border-box !important;
                    box-shadow: 0 20px 50px rgba(131,58,180,.17), 0 16px 42px rgba(15,23,42,.18) !important;
                    scroll-margin-top: 14px;
                }

                .pro-map-layout {
                    align-items: stretch;
                }

                .pro-map-stats {
                    display: flex !important;
                    flex-direction: column;
                    gap: 14px;
                    padding: 16px !important;
                }

                .eko-panel-head {
                    margin: 0;
                    padding: 0 1px 2px;
                }

                .eko-panel-eyebrow {
                    display: block;
                    margin-bottom: 5px;
                    color: #f0abfc;
                    font-size: 9px;
                    font-weight: 850;
                    letter-spacing: .1em;
                    text-transform: uppercase;
                }

                .eko-panel-head h3 {
                    margin: 0 0 5px;
                    font-size: 15px;
                    color: #f8fafc;
                }

                .eko-panel-head p {
                    margin: 0;
                    color: #8fa2b8;
                    font-size: 10px;
                    line-height: 1.45;
                }

                .map-stat-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 8px !important;
                    margin: 0;
                }

                .map-stat-card {
                    min-height: 64px !important;
                    margin: 0 !important;
                    padding: 10px 11px !important;
                }

                .eko-map-help {
                    margin: 0;
                    padding: 12px;
                    border: 1px solid rgba(244,114,182,.16);
                    border-radius: 12px;
                    background: linear-gradient(145deg, rgba(131,58,180,.11), rgba(225,48,108,.06));
                }

                .eko-map-help strong {
                    display: block;
                    margin: 0 0 8px;
                    color: #f8fafc;
                    font-size: 11px;
                }

                .eko-map-help-list {
                    display: grid;
                    gap: 7px;
                    margin: 0;
                    padding: 0;
                    list-style: none;
                }

                .eko-map-help-list li {
                    display: grid;
                    grid-template-columns: 22px minmax(0, 1fr);
                    gap: 7px;
                    align-items: start;
                    color: #b8c5d4;
                    font-size: 10px;
                    line-height: 1.4;
                }

                .eko-map-help-list i {
                    width: 22px;
                    height: 22px;
                    display: grid;
                    place-items: center;
                    border-radius: 7px;
                    background: rgba(255,255,255,.06);
                    font-style: normal;
                    font-size: 11px;
                }

                .eko-map-freshness {
                    margin-top: auto;
                    padding-top: 11px;
                    border-top: 1px solid rgba(148,163,184,.12);
                    color: #8091a6;
                    font-size: 9px;
                    line-height: 1.45;
                }

                .eko-map-freshness strong {
                    color: #d9e4ef;
                    font-weight: 750;
                }

                @media (max-width: 980px) {
                    .pro-map-stats { display: block !important; }
                    .eko-panel-head { margin-bottom: 12px; }
                    .map-stat-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
                    .eko-map-help { margin-top: 12px; }
                    .eko-map-freshness { margin-top: 12px; }
                }

                @media (max-width: 760px) {
                    .pro-home-hero .eko-map-promo { max-width: 520px; }
                    .eko-map-promo-inner {
                        grid-template-columns: 42px minmax(0, 1fr);
                        gap: 12px;
                    }
                    .eko-map-promo-icon { width: 42px; height: 42px; }
                    .eko-map-promo-action {
                        grid-column: 2;
                        width: fit-content;
                        min-height: 38px;
                        margin-top: 2px;
                        padding: 0 13px;
                    }
                    .map-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                    .map-stat-card:last-child { grid-column: 1 / -1; }
                }

                @media (max-width: 460px) {
                    .eko-map-promo-inner { padding: 12px; }
                    .eko-map-promo-copy strong { font-size: 13px; }
                    .eko-map-promo-copy small { font-size: 10px; }
                    .map-stat-grid { grid-template-columns: 1fr; }
                    .map-stat-card:last-child { grid-column: auto; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    function simplifyHeader() {
        document.querySelector(".header-bar .facebook-button")?.remove();
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
                </div>
                <a class="eko-map-promo" href="#station-map" aria-label="Разгледай картата на бензиностанциите EKO">
                    <span class="eko-map-promo-inner">
                        <span class="eko-map-promo-icon" aria-hidden="true">⌖</span>
                        <span class="eko-map-promo-copy">
                            <strong><span id="eko-promo-count">102</span> EKO бензиностанции на едно място</strong>
                            <small>Виж къде се намират обектите, какви горива предлагат и какви са актуалните им цени.</small>
                        </span>
                        <span class="eko-map-promo-action">Разгледай картата <span aria-hidden="true">→</span></span>
                    </span>
                </a>
            </div>`;

        hero.querySelector(".eko-map-promo")?.addEventListener("click", event => {
            event.preventDefault();
            const section = document.querySelector(".station-map-section");
            if (!section) return;

            const rect = section.getBoundingClientRect();
            const viewport = window.innerHeight || document.documentElement.clientHeight;
            const sectionHeight = rect.height;
            const topPadding = sectionHeight <= viewport - 24 ? 12 : 8;
            const targetTop = window.scrollY + rect.top - topPadding;

            window.scrollTo({
                top: Math.max(0, targetTop),
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
            });
        });
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
            <div class="pro-map-heading"><span class="pro-map-pin">⌖</span><div><h2>Карта на бензиностанциите EKO</h2><p>Кликни върху маркер за точен адрес, предлагани горива и актуални цени за деня.</p></div></div>
            <div class="pro-map-tools"><div class="pro-map-legend" aria-label="Легенда за клъстерите"><span><i class="legend-dot low"></i> 1–20</span><span><i class="legend-dot mid"></i> 21–100</span><span><i class="legend-dot high"></i> 101+</span></div></div>`;

        const stats = document.createElement("aside");
        stats.className = "pro-map-stats";
        stats.innerHTML = `
            <div class="eko-panel-head">
                <span class="eko-panel-eyebrow">EKO · България</span>
                <h3>Полезна информация</h3>
                <p>Актуален преглед на обектите и ценовите записи, които виждаш на картата.</p>
            </div>
            <div class="map-stat-grid">
                <div class="map-stat-card"><span class="map-stat-icon">⛽</span><div><span class="map-stat-label">EKO обекти</span><strong class="map-stat-value" id="map-stat-stations">—</strong><span class="map-stat-note">Проверени локации</span></div></div>
                <div class="map-stat-card"><span class="map-stat-icon">€</span><div><span class="map-stat-label">Ценови записи днес</span><strong class="map-stat-value" id="map-stat-prices">—</strong><span class="map-stat-note">Динамично от базата</span></div></div>
                <div class="map-stat-card"><span class="map-stat-icon">⌖</span><div><span class="map-stat-label">Покрити локации</span><strong class="map-stat-value" id="map-stat-cities">—</strong><span class="map-stat-note">Градове и райони</span></div></div>
            </div>
            <div class="eko-map-help">
                <strong>Какво ще видиш при клик?</strong>
                <ul class="eko-map-help-list">
                    <li><i>📍</i><span>Точния адрес на избрания EKO обект.</span></li>
                    <li><i>⛽</i><span>Горивата, които се предлагат на конкретната бензиностанция.</span></li>
                    <li><i>€</i><span>Актуалните импортнати цени за днешния ден.</span></li>
                </ul>
            </div>
            <div class="eko-map-freshness">Последна проверка: <strong id="map-stat-updated">сега</strong><br><span id="map-stat-updated-note">Данните се обновяват при зареждане на картата.</span></div>`;

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
        const promoCountEl = document.getElementById("eko-promo-count");

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
            if (promoCountEl) promoCountEl.textContent = formatNumber(stations.length);
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
        if (updatedNoteEl) {
            updatedNoteEl.textContent = now.toLocaleDateString("bg-BG", { day: "2-digit", month: "short" }) + ", " + now.toLocaleTimeString("bg-BG", { hour: "2-digit", minute: "2-digit" });
        }
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
        simplifyHeader();
        buildHero();
        buildMapShell();
        scheduleMapStats();
    }

    init();
})();
