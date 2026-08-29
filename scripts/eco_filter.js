let initFilters = () => {
    let filterGroups = document.querySelectorAll("[data-filter-group]");

    filterGroups.forEach(group => {
        let buttons = group.querySelectorAll(".filter-btn");
        let targetSelector = group.dataset.target;
        let items = document.querySelectorAll(targetSelector);

        buttons.forEach(btn => {
            btn.addEventListener("click", () => {
                let filter = btn.dataset.filter;
                buttons.forEach(b => b.classList.remove("is-active"));
                btn.classList.add("is-active");

                items.forEach(item => {
                    let categories = item.dataset.cat || "";
                    let list = categories.split(",");
                    item.style.display = filter === "all" || list.includes(filter) ? "" : "none";
                });
            });
        });
    });
};

document.addEventListener("DOMContentLoaded", initFilters);

/* =========================================================
   HOMEPAGE — TOP 4 LOWEST PRICES FOR TODAY
   ========================================================= */

const HOME_SUPABASE_URL = "https://eaqvhxfvozhzatrnbkvx.supabase.co";
const HOME_SUPABASE_KEY = "sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH";

const HOME_FUEL_ALIASES = {
    "A95": "A95",
    "Бензин A95": "A95",
    "Дизел": "Дизел",
    "LPG": "LPG",
    "Пропан Бутан": "LPG",
    "A100": "A100",
    "Бензин A100": "A100",
    "Дизел +": "Дизел +",
    "Дизел премиум": "Дизел +",
    "Метан": "Метан"
};

const HOME_FUEL_ORDER = ["A95", "Дизел", "LPG", "A100", "Дизел +", "Метан"];
const HOME_TOP10_CITIES = ["София", "Пловдив", "Варна", "Бургас", "Русе"];

const HOME_STATION_LOGOS = [
    {match: ["еко петрол", "екопетрол", "ecopetrol"], src: "images/station_logos/ecopetrol.svg"},
    {match: ["бенита", "benita"], src: "images/station_logos/benita.svg"},
    {match: ["лукойл", "lukoil"], src: "images/station_logos/lukoil.svg"},
    {match: ["omv", "омв"], src: "images/station_logos/omv.svg"},
    {match: ["shell", "шел"], src: "images/station_logos/shell.svg"},
    {match: ["rompetrol", "ромпетрол"], src: "images/station_logos/rompetrol.svg"},
    {match: ["insa", "инса"], src: "images/station_logos/insa.svg"},
    {match: ["kruiz", "cruise", "круиз"], src: "images/station_logos/kruiz.svg"},
    {match: ["bulmarket", "булмаркет"], src: "images/station_logos/bulmarket.svg"},
    {match: ["petrol", "петрол"], src: "images/station_logos/petrol.svg"},
    {match: ["eko", "еко"], src: "images/station_logos/eko.svg"},
    {match: ["dieselor", "diselor", "dieseler", "дизелор"], src: "images/station_logos/diselor.svg"},
    {match: ["himoil", "chimoil", "химойл"], src: "images/station_logos/himoil.svg"}
];

function homeStationLogo(name) {
    const normalized = String(name || "")
        .toLocaleLowerCase("bg-BG")
        .replace(/\s+/g, " ")
        .trim();

    const config = HOME_STATION_LOGOS.find(item => item.match.some(token => normalized.includes(token)));
    return config?.src || "images/station_logos/unknown.svg";
}

let homeTop10Rows = [];
let homeTop10Fuel = "A95";
let homeTop10City = "София";

function ensureHomeTop10Styles() {
    if (document.getElementById("home-top10-cards-css")) return;
    const link = document.createElement("link");
    link.id = "home-top10-cards-css";
    link.rel = "stylesheet";
    link.href = "pages/styles/home-top10-cards.css";
    document.head.appendChild(link);
}

function homeEscapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function homeCanonicalFuel(value) {
    return HOME_FUEL_ALIASES[value] || value;
}

function homeTodayBounds() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    return {start: start.toISOString(), end: end.toISOString()};
}

function readHomeTop4SelectionFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const city = params.get("city");
    const fuel = params.get("fuel");

    if (city && HOME_TOP10_CITIES.includes(city)) homeTop10City = city;
    if (fuel && HOME_FUEL_ORDER.includes(homeCanonicalFuel(fuel))) homeTop10Fuel = homeCanonicalFuel(fuel);
}

function syncHomeTop4SelectionToUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("city", homeTop10City);
    url.searchParams.set("fuel", homeTop10Fuel);
    url.hash = "home-top10-prices";
    window.history.replaceState({}, "", url);
}

function buildTop4ShareUrl() {
    const url = new URL("/pages/top-fuel-prices.html", window.location.origin);
    url.searchParams.set("city", homeTop10City);
    url.searchParams.set("fuel", homeTop10Fuel);
    return url.toString();
}

function buildTop4ShareText() {
    const rows = getHomeTop10ForFuelAndCity(homeTop10Fuel, homeTop10City);
    if (!rows.length) return `Топ 4 цени за ${homeTop10Fuel} в ${homeTop10City} днес – goriva.online`;

    const leader = rows[0];
    return `Топ 4 най-ниски цени за ${homeTop10Fuel} в ${homeTop10City} днес. №1: ${leader.station || "бензиностанция"} – ${leader.price.toFixed(2)} €/л. goriva.online`;
}

async function copyTop4ShareLink(button) {
    const url = buildTop4ShareUrl();
    try {
        await navigator.clipboard.writeText(url);
        const original = button.textContent;
        button.textContent = "Копирано";
        button.classList.add("is-copied");
        setTimeout(() => {
            button.textContent = original;
            button.classList.remove("is-copied");
        }, 1800);
    } catch (error) {
        window.prompt("Копирай линка:", url);
    }
}

function updateTop4ShareLinks() {
    const shareUrl = buildTop4ShareUrl();
    const shareText = buildTop4ShareText();
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);

    const facebook = document.getElementById("home-share-facebook");
    const linkedin = document.getElementById("home-share-linkedin");
    const whatsapp = document.getElementById("home-share-whatsapp");

    if (facebook) facebook.href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    if (linkedin) linkedin.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    if (whatsapp) whatsapp.href = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
}

function buildHomeTop10Section() {
    if (document.getElementById("home-top10-prices")) return;

    const mapSection = document.querySelector(".station-map-section");
    if (!mapSection) return;

    ensureHomeTop10Styles();
    readHomeTop4SelectionFromUrl();

    const section = document.createElement("section");
    section.id = "home-top10-prices";
    section.className = "home-top10-section home-top10-cards-section";
    section.innerHTML = `
        <div class="home-top10-header home-top10-header-v2">
            <div>
                <span class="home-top10-eyebrow">★ Най-добрите цени днес</span>
                <h2>Топ 4 най-изгодни бензиностанции</h2>
                <p>Сравни четирите най-ниски цени в избрания град. Избери град и продукт, за да видиш къде е най-изгодно да заредиш днес.</p>
            </div>
            <span class="home-top10-date" id="home-top10-date"></span>
        </div>

        <div class="home-top10-controls">
            <div class="home-top10-control-group">
                <span class="home-top10-control-label">Град</span>
                <div class="home-top10-city-tabs" role="tablist" aria-label="Избери град">
                    ${HOME_TOP10_CITIES.map(city => `
                        <button type="button" class="home-city-tab ${city === homeTop10City ? "is-active" : ""}" data-home-city="${homeEscapeHtml(city)}" role="tab" aria-selected="${city === homeTop10City ? "true" : "false"}">${homeEscapeHtml(city)}</button>
                    `).join("")}
                </div>
            </div>

            <div class="home-top10-control-group">
                <span class="home-top10-control-label">Гориво</span>
                <div class="home-top10-tabs" role="tablist" aria-label="Гориво за класацията">
                    ${HOME_FUEL_ORDER.map(fuel => `
                        <button type="button" class="home-top10-tab ${fuel === homeTop10Fuel ? "is-active" : ""}" data-home-fuel="${homeEscapeHtml(fuel)}" role="tab" aria-selected="${fuel === homeTop10Fuel ? "true" : "false"}">${homeEscapeHtml(fuel)}</button>
                    `).join("")}
                </div>
            </div>
        </div>

        <div class="home-top10-meta-row">
            <div class="home-top10-context" id="home-top10-context">${homeEscapeHtml(homeTop10City)} · ${homeEscapeHtml(homeTop10Fuel)}</div>
            <div class="home-top10-share" aria-label="Сподели класацията">
                <span class="home-top10-share-label">Сподели</span>
                <a id="home-share-facebook" class="home-share-btn" href="#" target="_blank" rel="noopener noreferrer" aria-label="Сподели във Facebook">Facebook</a>
                <a id="home-share-linkedin" class="home-share-btn" href="#" target="_blank" rel="noopener noreferrer" aria-label="Сподели в LinkedIn">LinkedIn</a>
                <a id="home-share-whatsapp" class="home-share-btn" href="#" target="_blank" rel="noopener noreferrer" aria-label="Сподели в WhatsApp">WhatsApp</a>
                <button id="home-share-copy" class="home-share-btn home-share-copy" type="button">Копирай линк</button>
            </div>
        </div>

        <div id="home-top10-list" class="home-top10-card-grid">
            <div class="home-top10-empty">Зареждане на днешните цени…</div>
        </div>
    `;

    mapSection.insertAdjacentElement("afterend", section);

    const dateEl = document.getElementById("home-top10-date");
    if (dateEl) {
        dateEl.textContent = new Intl.DateTimeFormat("bg-BG", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }).format(new Date());
    }

    section.querySelectorAll(".home-city-tab").forEach(button => {
        button.addEventListener("click", () => {
            homeTop10City = button.dataset.homeCity;
            section.querySelectorAll(".home-city-tab").forEach(item => {
                const active = item === button;
                item.classList.toggle("is-active", active);
                item.setAttribute("aria-selected", String(active));
            });
            syncHomeTop4SelectionToUrl();
            renderHomeTop10();
        });
    });

    section.querySelectorAll(".home-top10-tab").forEach(button => {
        button.addEventListener("click", () => {
            homeTop10Fuel = button.dataset.homeFuel;
            section.querySelectorAll(".home-top10-tab").forEach(item => {
                const active = item === button;
                item.classList.toggle("is-active", active);
                item.setAttribute("aria-selected", String(active));
            });
            syncHomeTop4SelectionToUrl();
            renderHomeTop10();
        });
    });

    document.getElementById("home-share-copy")?.addEventListener("click", event => copyTop4ShareLink(event.currentTarget));
    updateTop4ShareLinks();
}

async function fetchHomeTodayPrices() {
    const {start, end} = homeTodayBounds();
    const pageSize = 1000;
    let offset = 0;
    const rows = [];

    while (true) {
        const url = `${HOME_SUPABASE_URL}/rest/v1/fuel_prices?select=station,city,location,fuel,price,created_at&created_at=gte.${encodeURIComponent(start)}&created_at=lt.${encodeURIComponent(end)}&order=price.asc&limit=${pageSize}&offset=${offset}`;
        const response = await fetch(url, {
            headers: {
                apikey: HOME_SUPABASE_KEY,
                Authorization: `Bearer ${HOME_SUPABASE_KEY}`
            }
        });

        if (!response.ok) throw new Error(`Top 4 fuel request failed: ${response.status}`);

        const batch = await response.json();
        rows.push(...batch);
        if (batch.length < pageSize) break;
        offset += pageSize;
    }

    homeTop10Rows = rows
        .map(row => ({...row, fuel: homeCanonicalFuel(row.fuel), price: Number(row.price)}))
        .filter(row => HOME_FUEL_ORDER.includes(row.fuel) && Number.isFinite(row.price));
}

function getHomeTop10ForFuelAndCity(fuel, city) {
    const byStation = new Map();

    homeTop10Rows
        .filter(row => row.fuel === fuel && String(row.city || "").trim().toLocaleLowerCase("bg-BG") === city.toLocaleLowerCase("bg-BG"))
        .forEach(row => {
            const key = [row.station || "", row.city || "", row.location || ""].join("|").toLocaleUpperCase("bg-BG");
            const existing = byStation.get(key);
            if (!existing || row.price < existing.price) byStation.set(key, row);
        });

    return [...byStation.values()]
        .sort((a, b) => a.price - b.price || String(a.station || "").localeCompare(String(b.station || ""), "bg"))
        .slice(0, 4);
}

function getRankBadge(index) {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return String(index + 1);
}

function renderHomeTop10() {
    const container = document.getElementById("home-top10-list");
    const context = document.getElementById("home-top10-context");
    if (!container) return;

    if (context) context.textContent = `${homeTop10City} · ${homeTop10Fuel}`;

    const rows = getHomeTop10ForFuelAndCity(homeTop10Fuel, homeTop10City);

    if (!rows.length) {
        container.innerHTML = `<div class="home-top10-empty">Няма налични цени за ${homeEscapeHtml(homeTop10Fuel)} в ${homeEscapeHtml(homeTop10City)} за днешния ден.</div>`;
        updateTop4ShareLinks();
        return;
    }

    const minPrice = rows[0].price;

    container.innerHTML = rows.map((row, index) => {
        const station = row.station || "Неизвестна бензиностанция";
        const location = row.location || homeTop10City;
        const saving = row.price - minPrice;
        const podiumClass = index < 3 ? ` is-podium rank-${index + 1}` : "";
        const logo = homeStationLogo(station);

        return `
            <article class="home-top10-card${podiumClass}">
                <div class="home-top10-card-top">
                    <span class="home-top10-rank-badge">${getRankBadge(index)}</span>
                    <span class="home-top10-station-logo-wrap">
                        <img src="${homeEscapeHtml(logo)}"
                             class="home-top10-station-logo"
                             alt="${homeEscapeHtml(station)} лого"
                             loading="lazy"
                             onerror="this.onerror=null;this.src='images/station_logos/unknown.svg';">
                    </span>
                    <span class="home-top10-fuel-pill">${homeEscapeHtml(homeTop10Fuel)}</span>
                </div>

                <div class="home-top10-card-copy">
                    <h3>${homeEscapeHtml(station)}</h3>
                    <p><span aria-hidden="true">⌖</span> ${homeEscapeHtml(location)}</p>
                </div>

                <div class="home-top10-card-price">
                    <strong>${row.price.toFixed(2)} €</strong>
                    <span>/ литър</span>
                </div>

                <div class="home-top10-card-footer">
                    <span>${homeEscapeHtml(homeTop10City)}</span>
                    <span>${index === 0 ? "Най-ниска цена" : `+${saving.toFixed(2)} € спрямо №1`}</span>
                </div>
            </article>
        `;
    }).join("");

    updateTop4ShareLinks();
}

async function initHomeTop10() {
    if (!document.querySelector(".station-map-section") || document.getElementById("home-top10-prices")) return;

    buildHomeTop10Section();

    try {
        await fetchHomeTodayPrices();
        renderHomeTop10();
    } catch (error) {
        console.error(error);
        const container = document.getElementById("home-top10-list");
        if (container) container.innerHTML = `<div class="home-top10-empty">Неуспешно зареждане на класацията. Моля опитай отново по-късно.</div>`;
    }
}

document.addEventListener("DOMContentLoaded", initHomeTop10);