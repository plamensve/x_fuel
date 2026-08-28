const SHARE_SUPABASE_URL = "https://eaqvhxfvozhzatrnbkvx.supabase.co";
const SHARE_SUPABASE_KEY = "sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH";

const SHARE_FUEL_ALIASES = {
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

const SHARE_CITIES = ["София", "Пловдив", "Варна", "Бургас", "Русе"];
const SHARE_FUELS = ["A95", "Дизел", "LPG", "A100", "Дизел +", "Метан"];

function shareEscapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function shareCanonicalFuel(value) {
    return SHARE_FUEL_ALIASES[value] || value;
}

function shareSelection() {
    const params = new URLSearchParams(window.location.search);
    const rawCity = params.get("city") || "София";
    const rawFuel = shareCanonicalFuel(params.get("fuel") || "A95");

    return {
        city: SHARE_CITIES.includes(rawCity) ? rawCity : "София",
        fuel: SHARE_FUELS.includes(rawFuel) ? rawFuel : "A95"
    };
}

function shareTodayBounds() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    return {start: start.toISOString(), end: end.toISOString()};
}

async function fetchSharedTop4(city, fuel) {
    const {start, end} = shareTodayBounds();
    const pageSize = 1000;
    let offset = 0;
    const rows = [];

    while (true) {
        const url = `${SHARE_SUPABASE_URL}/rest/v1/fuel_prices?select=station,city,location,fuel,price,created_at&created_at=gte.${encodeURIComponent(start)}&created_at=lt.${encodeURIComponent(end)}&order=price.asc&limit=${pageSize}&offset=${offset}`;
        const response = await fetch(url, {
            headers: {
                apikey: SHARE_SUPABASE_KEY,
                Authorization: `Bearer ${SHARE_SUPABASE_KEY}`
            }
        });

        if (!response.ok) throw new Error(`Shared Top 4 request failed: ${response.status}`);

        const batch = await response.json();
        rows.push(...batch);
        if (batch.length < pageSize) break;
        offset += pageSize;
    }

    const byStation = new Map();

    rows
        .map(row => ({...row, fuel: shareCanonicalFuel(row.fuel), price: Number(row.price)}))
        .filter(row => row.fuel === fuel && Number.isFinite(row.price) && String(row.city || "").trim().toLocaleLowerCase("bg-BG") === city.toLocaleLowerCase("bg-BG"))
        .forEach(row => {
            const key = [row.station || "", row.city || "", row.location || ""].join("|").toLocaleUpperCase("bg-BG");
            const current = byStation.get(key);
            if (!current || row.price < current.price) byStation.set(key, row);
        });

    return [...byStation.values()]
        .sort((a, b) => a.price - b.price || String(a.station || "").localeCompare(String(b.station || ""), "bg"))
        .slice(0, 4);
}

function shareRankBadge(index) {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return "4";
}

function updateSharePageMetadata(city, fuel, rows) {
    const date = new Intl.DateTimeFormat("bg-BG", {day: "2-digit", month: "long", year: "numeric"}).format(new Date());
    const best = rows[0];
    const title = `Топ 4 най-ниски цени за ${fuel} в ${city} днес | goriva.online`;
    const description = best
        ? `Виж топ 4 най-ниски цени за ${fuel} в ${city} за ${date}. Най-ниската налична цена е ${best.price.toFixed(2)} €/л при ${best.station || "бензиностанция"}.`
        : `Виж актуалните най-ниски цени за ${fuel} в ${city} за ${date} в goriva.online.`;

    document.title = title;
    document.getElementById("share-page-title").textContent = `Топ 4 за ${fuel} в ${city}`;
    document.getElementById("share-page-description").textContent = description;
    document.getElementById("share-page-summary").textContent = `${city} · ${fuel} · ${date}`;

    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) descriptionMeta.content = description;

    const back = document.getElementById("share-back-link");
    if (back) back.href = `../index.html?city=${encodeURIComponent(city)}&fuel=${encodeURIComponent(fuel)}#home-top10-prices`;

    const shareUrl = window.location.href;
    const shareText = best
        ? `Топ 4 цени за ${fuel} в ${city} днес. №1: ${best.station || "бензиностанция"} – ${best.price.toFixed(2)} €/л.`
        : `Топ 4 цени за ${fuel} в ${city} днес.`;

    document.getElementById("share-page-facebook").href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    document.getElementById("share-page-linkedin").href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    document.getElementById("share-page-whatsapp").href = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `Топ 4 най-ниски цени за ${fuel} в ${city}`,
        itemListOrder: "https://schema.org/ItemListOrderAscending",
        numberOfItems: rows.length,
        itemListElement: rows.map((row, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: {
                "@type": "Offer",
                name: `${row.station || "Бензиностанция"} – ${fuel}`,
                price: row.price.toFixed(2),
                priceCurrency: "EUR",
                areaServed: city,
                seller: {
                    "@type": "Organization",
                    name: row.station || "Бензиностанция"
                }
            }
        }))
    };

    let script = document.getElementById("share-itemlist-jsonld");
    if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        script.id = "share-itemlist-jsonld";
        document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);
}

function renderSharedTop4(city, fuel, rows) {
    const container = document.getElementById("share-top4-list");

    if (!rows.length) {
        container.innerHTML = `<div class="home-top10-empty">Няма налични цени за ${shareEscapeHtml(fuel)} в ${shareEscapeHtml(city)} за днешния ден.</div>`;
        updateSharePageMetadata(city, fuel, rows);
        return;
    }

    const minPrice = rows[0].price;

    container.innerHTML = rows.map((row, index) => {
        const station = row.station || "Неизвестна бензиностанция";
        const location = row.location || city;
        const difference = row.price - minPrice;
        const podiumClass = index < 3 ? ` is-podium rank-${index + 1}` : "";

        return `
            <article class="home-top10-card${podiumClass}">
                <div class="home-top10-card-top">
                    <span class="home-top10-rank-badge">${shareRankBadge(index)}</span>
                    <span class="home-top10-fuel-pill">${shareEscapeHtml(fuel)}</span>
                </div>
                <div class="home-top10-card-copy">
                    <h3>${shareEscapeHtml(station)}</h3>
                    <p><span aria-hidden="true">⌖</span> ${shareEscapeHtml(location)}</p>
                </div>
                <div class="home-top10-card-price">
                    <strong>${row.price.toFixed(2)} €</strong>
                    <span>/ литър</span>
                </div>
                <div class="home-top10-card-footer">
                    <span>${shareEscapeHtml(city)}</span>
                    <span>${index === 0 ? "Най-ниска цена" : `+${difference.toFixed(2)} € спрямо №1`}</span>
                </div>
            </article>
        `;
    }).join("");

    updateSharePageMetadata(city, fuel, rows);
}

async function initSharedTop4() {
    const {city, fuel} = shareSelection();

    try {
        const rows = await fetchSharedTop4(city, fuel);
        renderSharedTop4(city, fuel, rows);
    } catch (error) {
        console.error(error);
        document.getElementById("share-top4-list").innerHTML = `<div class="home-top10-empty">Неуспешно зареждане на класацията. Моля опитай отново по-късно.</div>`;
    }
}

document.addEventListener("DOMContentLoaded", initSharedTop4);
