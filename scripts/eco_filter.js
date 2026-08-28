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
   HOMEPAGE — TOP 10 LOWEST PRICES FOR TODAY
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

let homeTop10Rows = [];
let homeTop10Fuel = "A95";
let homeTop10City = "София";

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

function buildHomeTop10Section() {
    if (document.getElementById("home-top10-prices")) return;

    const mapSection = document.querySelector(".station-map-section");
    if (!mapSection) return;

    const section = document.createElement("section");
    section.id = "home-top10-prices";
    section.className = "home-top10-section home-top10-cards-section";
    section.innerHTML = `
        <div class="home-top10-header home-top10-header-v2">
            <div>
                <span class="home-top10-eyebrow">★ Най-добрите цени днес</span>
                <h2>Топ 10 най-изгодни бензиностанции</h2>
                <p>Сравни най-ниските цени в избрания град. Избери град и продукт, за да видиш къде е най-изгодно да заредиш днес.</p>
            </div>
            <span class="home-top10-date" id="home-top10-date"></span>
        </div>

        <div class="home-top10-controls">
            <div class="home-top10-control-group">
                <span class="home-top10-control-label">Град</span>
                <div class="home-top10-city-tabs" role="tablist" aria-label="Избери град">
                    ${HOME_TOP10_CITIES.map((city, index) => `
                        <button type="button" class="home-city-tab ${index === 0 ? "is-active" : ""}" data-home-city="${homeEscapeHtml(city)}" role="tab" aria-selected="${index === 0 ? "true" : "false"}">${homeEscapeHtml(city)}</button>
                    `).join("")}
                </div>
            </div>

            <div class="home-top10-control-group">
                <span class="home-top10-control-label">Гориво</span>
                <div class="home-top10-tabs" role="tablist" aria-label="Гориво за класацията">
                    ${HOME_FUEL_ORDER.map((fuel, index) => `
                        <button type="button" class="home-top10-tab ${index === 0 ? "is-active" : ""}" data-home-fuel="${homeEscapeHtml(fuel)}" role="tab" aria-selected="${index === 0 ? "true" : "false"}">${homeEscapeHtml(fuel)}</button>
                    `).join("")}
                </div>
            </div>
        </div>

        <div class="home-top10-context" id="home-top10-context">София · A95</div>

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
            renderHomeTop10();
        });
    });
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

        if (!response.ok) throw new Error(`Top 10 fuel request failed: ${response.status}`);

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
        .slice(0, 10);
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
        return;
    }

    const minPrice = rows[0].price;

    container.innerHTML = rows.map((row, index) => {
        const station = row.station || "Неизвестна бензиностанция";
        const location = row.location || homeTop10City;
        const saving = row.price - minPrice;
        const podiumClass = index < 3 ? ` is-podium rank-${index + 1}` : "";

        return `
            <article class="home-top10-card${podiumClass}">
                <div class="home-top10-card-top">
                    <span class="home-top10-rank-badge">${getRankBadge(index)}</span>
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
