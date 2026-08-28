let initFilters = () => {

    let filterGroups = document.querySelectorAll("[data-filter-group]");

    filterGroups.forEach(group => {

        let buttons = group.querySelectorAll(".filter-btn");
        let targetSelector = group.dataset.target;
        let items = document.querySelectorAll(targetSelector);

        buttons.forEach(btn => {
            btn.addEventListener("click", () => {

                let filter = btn.dataset.filter;

                // active state
                buttons.forEach(b => b.classList.remove("is-active"));
                btn.classList.add("is-active");

                items.forEach(item => {

                    let categories = item.dataset.cat || "";

                    let list = categories.split(",");

                    if (filter === "all" || list.includes(filter)) {
                        item.style.display = "";
                    } else {
                        item.style.display = "none";
                    }

                });

            });
        });

    });

};

document.addEventListener("DOMContentLoaded", initFilters);

/* =========================================================
   HOMEPAGE — TOP 10 LOWEST PRICES FOR TODAY
   Injected dynamically so the existing homepage markup remains
   stable while the new ranking is easy to evolve independently.
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
let homeTop10Rows = [];
let homeTop10Fuel = "A95";

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

    const anchor = document.querySelector(".about-project");
    if (!anchor) return;

    const section = document.createElement("section");
    section.id = "home-top10-prices";
    section.className = "home-top10-section";
    section.innerHTML = `
        <div class="home-top10-header">
            <div>
                <span class="home-top10-eyebrow">▥ Класация за днес</span>
                <h2>Топ 10 бензиностанции с най-ниски цени</h2>
                <p>Избери продукт, за да видиш десетте най-ниски налични цени за текущия ден. За една физическа станция се показва най-ниската подадена цена.</p>
            </div>
            <span class="home-top10-date" id="home-top10-date"></span>
        </div>

        <div class="home-top10-tabs" role="tablist" aria-label="Гориво за класацията">
            ${HOME_FUEL_ORDER.map((fuel, index) => `
                <button type="button" class="home-top10-tab ${index === 0 ? "is-active" : ""}" data-home-fuel="${homeEscapeHtml(fuel)}" role="tab" aria-selected="${index === 0 ? "true" : "false"}">
                    ${homeEscapeHtml(fuel)}
                </button>
            `).join("")}
        </div>

        <div id="home-top10-list" class="home-top10-list">
            <div class="home-top10-empty">Зареждане на днешните цени…</div>
        </div>
    `;

    anchor.insertAdjacentElement("afterend", section);

    const dateEl = document.getElementById("home-top10-date");
    if (dateEl) {
        dateEl.textContent = new Intl.DateTimeFormat("bg-BG", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }).format(new Date());
    }

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

        if (!response.ok) {
            throw new Error(`Top 10 fuel request failed: ${response.status}`);
        }

        const batch = await response.json();
        rows.push(...batch);

        if (batch.length < pageSize) break;
        offset += pageSize;
    }

    homeTop10Rows = rows
        .map(row => ({
            ...row,
            fuel: homeCanonicalFuel(row.fuel),
            price: Number(row.price)
        }))
        .filter(row => HOME_FUEL_ORDER.includes(row.fuel) && Number.isFinite(row.price));
}

function getHomeTop10ForFuel(fuel) {
    const byStation = new Map();

    homeTop10Rows
        .filter(row => row.fuel === fuel)
        .forEach(row => {
            const key = [row.station || "", row.city || "", row.location || ""].join("|").toLocaleUpperCase("bg-BG");
            const existing = byStation.get(key);

            if (!existing || row.price < existing.price) {
                byStation.set(key, row);
            }
        });

    return [...byStation.values()]
        .sort((a, b) => a.price - b.price || String(a.station || "").localeCompare(String(b.station || ""), "bg"))
        .slice(0, 10);
}

function renderHomeTop10() {
    const container = document.getElementById("home-top10-list");
    if (!container) return;

    const rows = getHomeTop10ForFuel(homeTop10Fuel);

    if (!rows.length) {
        container.innerHTML = `<div class="home-top10-empty">Няма налични цени за ${homeEscapeHtml(homeTop10Fuel)} за днешния ден.</div>`;
        return;
    }

    container.innerHTML = rows.map((row, index) => {
        const station = row.station || "Неизвестна бензиностанция";
        const city = row.city || "Неизвестен град";
        const location = row.location || "Без допълнителна локация";

        return `
            <article class="home-top10-row">
                <span class="home-top10-rank">${index + 1}</span>
                <div class="home-top10-station">
                    <strong>${homeEscapeHtml(station)}</strong>
                    <small>${homeEscapeHtml(city)}</small>
                </div>
                <div class="home-top10-location">
                    <strong>${homeEscapeHtml(location)}</strong>
                    <small>${homeEscapeHtml(homeTop10Fuel)}</small>
                </div>
                <div class="home-top10-price">${row.price.toFixed(2)} €</div>
            </article>
        `;
    }).join("");
}

async function initHomeTop10() {
    if (!document.querySelector(".about-project") || document.getElementById("home-top10-prices")) return;

    buildHomeTop10Section();

    try {
        await fetchHomeTodayPrices();
        renderHomeTop10();
    } catch (error) {
        console.error(error);
        const container = document.getElementById("home-top10-list");
        if (container) {
            container.innerHTML = `<div class="home-top10-empty">Неуспешно зареждане на класацията. Моля опитай отново по-късно.</div>`;
        }
    }
}

document.addEventListener("DOMContentLoaded", initHomeTop10);
