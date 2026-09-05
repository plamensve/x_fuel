/* =========================================================
   HOMEPAGE LEAFLET — EKO ONLY + LIVE SUPABASE PRICES
   ========================================================= */
(() => {
    if (window.__GORIVA_EKO_MAP_MODE__) return;
    window.__GORIVA_EKO_MAP_MODE__ = true;

    const SUPABASE_URL = "https://eaqvhxfvozhzatrnbkvx.supabase.co";
    const SUPABASE_KEY = "sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH";
    const EKO_STATION = "ЕКО";
    const PAGE_SIZE = 1000;

    const escapeHtml = value => String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const canonicalFuel = value => {
        const fuel = String(value || "").trim();
        if (fuel === "A95" || fuel === "Бензин A95") return "Бензин A95";
        if (fuel === "A100" || fuel === "Бензин A100") return "Бензин A100";
        if (fuel === "Дизел +" || fuel === "Дизел премиум") return "Дизел премиум";
        if (fuel === "LPG" || fuel === "Пропан Бутан") return "Пропан Бутан";
        if (fuel === "Дизел") return "Дизел";
        return fuel;
    };

    const fuelLabel = fuel => ({
        "Бензин A95": "A95",
        "Бензин A100": "A100",
        "Дизел": "Дизел",
        "Дизел премиум": "Дизел +",
        "Пропан Бутан": "LPG"
    })[fuel] || fuel;

    const fuelOrder = [
        "Бензин A95",
        "Бензин A100",
        "Дизел",
        "Дизел премиум",
        "Пропан Бутан"
    ];

    const extractStationId = location => {
        const match = String(location || "").match(/(?:ЕКО|EKO)\s+(\d{4})\b/i);
        return match ? match[1] : null;
    };

    const todayBounds = () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
        return { start: start.toISOString(), end: end.toISOString() };
    };

    async function fetchAllTodayEkoPrices() {
        const { start, end } = todayBounds();
        const rows = [];
        let offset = 0;

        while (true) {
            const url =
                `${SUPABASE_URL}/rest/v1/fuel_prices` +
                `?select=station,location,fuel,price,created_at` +
                `&station=eq.${encodeURIComponent(EKO_STATION)}` +
                `&created_at=gte.${encodeURIComponent(start)}` +
                `&created_at=lt.${encodeURIComponent(end)}` +
                `&order=created_at.desc` +
                `&limit=${PAGE_SIZE}` +
                `&offset=${offset}`;

            const response = await fetch(url, {
                headers: { apikey: SUPABASE_KEY }
            });

            if (!response.ok) {
                throw new Error(`EKO price request failed: ${response.status}`);
            }

            const batch = await response.json();
            rows.push(...batch);
            if (batch.length < PAGE_SIZE) break;
            offset += PAGE_SIZE;
        }

        return rows;
    }

    function buildLivePricesByStation(rows) {
        const result = {};

        rows.forEach(row => {
            const stationId = extractStationId(row.location);
            const fuel = canonicalFuel(row.fuel);
            const price = Number(row.price);

            if (!stationId || !fuel || !Number.isFinite(price) || price <= 0.1) return;

            result[stationId] ||= {};
            if (!result[stationId][fuel]) {
                result[stationId][fuel] = {
                    price,
                    created_at: row.created_at || null
                };
            }
        });

        return result;
    }

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

    function buildPriceRows(products, livePrices) {
        const offered = Array.isArray(products) ? products.map(canonicalFuel) : [];
        const allFuels = [...new Set([...offered, ...Object.keys(livePrices || {})])]
            .filter(Boolean)
            .sort((a, b) => {
                const ai = fuelOrder.indexOf(a);
                const bi = fuelOrder.indexOf(b);
                return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
            });

        if (!allFuels.length) {
            return `<div style="margin-top:8px;color:#64748b">Няма информация за предлаганите горива.</div>`;
        }

        return allFuels.map(fuel => {
            const current = livePrices?.[fuel];
            const value = current
                ? `<strong style="color:#0f766e">${Number(current.price).toFixed(2)} €/л</strong>`
                : `<span style="color:#94a3b8">няма актуална цена</span>`;

            return `
                <div style="display:flex;justify-content:space-between;gap:18px;padding:4px 0;border-bottom:1px solid rgba(148,163,184,.16)">
                    <span>⛽ ${escapeHtml(fuelLabel(fuel))}</span>
                    <span>${value}</span>
                </div>`;
        }).join("");
    }

    function latestPriceTimestamp(livePrices) {
        const timestamps = Object.values(livePrices || {})
            .map(item => item?.created_at)
            .filter(Boolean)
            .map(value => new Date(value))
            .filter(date => !Number.isNaN(date.getTime()))
            .sort((a, b) => b - a);

        if (!timestamps.length) return null;
        return timestamps[0];
    }

    function buildPopup(station, products, livePrices) {
        const updated = latestPriceTimestamp(livePrices);
        const updatedText = updated
            ? updated.toLocaleString("bg-BG", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
            : null;

        return `
            <div style="font-size:14px;line-height:1.5;min-width:255px;max-width:320px">
                <strong style="display:block;font-size:16px;margin-bottom:6px">${escapeHtml(station.name || `ЕКО ${station.station_id}`)}</strong>

                ${station.address ? `<div style="margin:5px 0">📍 ${escapeHtml(station.address)}</div>` : ""}
                ${station.phone ? `<div style="margin:5px 0">📞 <a href="tel:${escapeHtml(station.phone)}">${escapeHtml(station.phone)}</a></div>` : ""}

                <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(148,163,184,.25)">
                    <strong style="display:block;margin-bottom:4px">Актуални цени днес</strong>
                    ${buildPriceRows(products, livePrices)}
                </div>

                <div style="margin-top:8px;font-size:12px;color:#64748b">
                    ${updatedText ? `Последно обновяване: ${escapeHtml(updatedText)}` : "Няма импортнати актуални цени за днес."}
                </div>
            </div>`;
    }

    async function loadEkoMapData() {
        const [stationsResponse, productsResponse, priceRows] = await Promise.all([
            fetch("/data/eko_stations.json", { cache: "force-cache" }),
            fetch("/data/eko_products.json", { cache: "force-cache" }),
            fetchAllTodayEkoPrices()
        ]);

        if (!stationsResponse.ok) throw new Error(`EKO station registry request failed: ${stationsResponse.status}`);
        if (!productsResponse.ok) throw new Error(`EKO products request failed: ${productsResponse.status}`);

        const registry = await stationsResponse.json();
        const productData = await productsResponse.json();
        const productsByStation = productData?.products_by_station || {};
        const livePricesByStation = buildLivePricesByStation(priceRows);

        return {
            registry,
            productsByStation,
            livePricesByStation,
            priceRows
        };
    }

    const mapElement = document.getElementById("station-map");
    if (mapElement) mapElement.id = "station-map-eko";

    function updateMapHeader(stationCount, priceCount) {
        const section = document.querySelector(".station-map-section");
        if (!section) return;

        const proTitle = section.querySelector(".pro-map-heading h2");
        const proSubtitle = section.querySelector(".pro-map-heading p");
        const chip = section.querySelector(".pro-map-chip");
        const legacyTitle = section.querySelector(".section-title");

        if (proTitle) proTitle.textContent = "Карта на бензиностанциите EKO";
        if (proSubtitle) proSubtitle.textContent = "Картата показва само обектите на EKO в България. Натисни върху маркер за точен адрес, телефон, предлагани горива и актуални цени.";
        if (chip) chip.textContent = "Само обекти EKO";
        if (legacyTitle) legacyTitle.textContent = "Карта на бензиностанциите EKO";

        const stationValue = section.querySelector("#map-stat-stations");
        const priceValue = section.querySelector("#map-stat-prices");
        const cityValue = section.querySelector("#map-stat-cities");
        const updatedValue = section.querySelector("#map-stat-updated");
        const updatedNote = section.querySelector("#map-stat-updated-note");

        const stationLabel = stationValue?.closest(".map-stat-card")?.querySelector(".map-stat-label");
        const priceLabel = priceValue?.closest(".map-stat-card")?.querySelector(".map-stat-label");
        if (stationLabel) stationLabel.textContent = "EKO обекти";
        if (priceLabel) priceLabel.textContent = "EKO цени днес";
        if (stationValue) stationValue.textContent = new Intl.NumberFormat("bg-BG").format(stationCount);
        if (priceValue) priceValue.textContent = new Intl.NumberFormat("bg-BG").format(priceCount);

        if (updatedValue) updatedValue.textContent = "сега";
        if (updatedNote) updatedNote.textContent = new Date().toLocaleString("bg-BG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

        if (cityValue && window.__EKO_CITY_COUNT__) {
            cityValue.textContent = new Intl.NumberFormat("bg-BG").format(window.__EKO_CITY_COUNT__);
        }
    }

    async function initEkoMap() {
        const element = document.getElementById("station-map-eko") || document.getElementById("station-map");
        if (!element || typeof L === "undefined") return;

        element.id = "station-map";

        try {
            const { registry, productsByStation, livePricesByStation, priceRows } = await loadEkoMapData();
            const stations = Object.values(registry?.stations || {})
                .filter(station => Number.isFinite(Number(station?.latitude)) && Number.isFinite(Number(station?.longitude)));

            const cities = new Set(stations.map(guessCity).filter(Boolean).map(value => value.toLocaleLowerCase("bg-BG")));
            window.__EKO_CITY_COUNT__ = cities.size;

            const stationMap = L.map(element, { preferCanvas: true }).setView([42.7339, 25.4858], 7);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "&copy; OpenStreetMap contributors"
            }).addTo(stationMap);

            const markers = L.markerClusterGroup();

            stations.forEach(station => {
                const stationId = String(station.station_id || "").trim();
                const latlng = [Number(station.latitude), Number(station.longitude)];
                const icon = typeof getStationIcon === "function" ? getStationIcon("EKO") : undefined;
                const markerOptions = icon ? { icon } : {};
                const marker = L.marker(latlng, markerOptions);

                marker.bindPopup(buildPopup(
                    station,
                    productsByStation[stationId] || [],
                    livePricesByStation[stationId] || {}
                ));
                markers.addLayer(marker);
            });

            stationMap.addLayer(markers);
            updateMapHeader(stations.length, priceRows.length);
        } catch (error) {
            console.error("Failed to initialize EKO Leaflet map", error);
            updateMapHeader(0, 0);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initEkoMap, { once: true });
    } else {
        initEkoMap();
    }
})();

/* =========================================================
   EXISTING ECOPETROL PRICE WIDGET
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    let url = "https://eaqvhxfvozhzatrnbkvx.supabase.co/rest/v1/ecopetrol";
    let apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJlYXF2aHhmdm96aHp6YXRybmJrdngiLCJyZWYiOiJlYXF2aHhmdm96aHp6YXRybmJrdngiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc3MzE1MjQ2NiwiZXhwIjoyMDg4NzI4NDY2fQ.qOIGTFGZ6ojFA84G59LMtqoJZhVEvEmGBdoZj-ynMXI";

    let fuels = ["dizel", "benzin95", "benzin100", "lpg", "adblue"];

    fetch(url, {
        headers: {
            apikey: apiKey,
            Authorization: `Bearer ${apiKey}`
        }
    })
        .then(res => {
            if (!res.ok) throw new Error("Request failed: " + res.status);
            return res.json();
        })
        .then(data => {
            data.forEach(st => {
                let slug = (st.station_slug || "").trim().toLowerCase();

                fuels.forEach(fuel => {
                    let id = `${fuel}-${slug}`;
                    let el = document.getElementById(id);
                    if (!el) return;

                    let value = st[fuel];
                    el.textContent = value !== null && value !== undefined
                        ? Number(value).toFixed(2) + "€"
                        : "-";
                });
            });
        })
        .catch(err => {
            console.error("Supabase error:", err);
        });
});
