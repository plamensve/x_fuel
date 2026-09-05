/* =========================================================
   HOMEPAGE LEAFLET — EKO ONLY
   =========================================================
   The legacy map still requests data/export.geojson. Instead of deleting
   the other brands from that historical file, intercept only that request
   and return a clean FeatureCollection built from the official EKO registry.
   Fuel availability is joined by the stable EKO/FS station ID.
*/
(() => {
    if (window.__GORIVA_EKO_MAP_MODE__ || typeof window.fetch !== "function") return;
    window.__GORIVA_EKO_MAP_MODE__ = true;

    const upstreamFetch = window.fetch.bind(window);
    let ekoGeoJsonPromise = null;

    const requestUrl = input => typeof input === "string" ? input : input?.url || "";

    const isLeafletGeoJsonRequest = url => {
        try {
            const parsed = new URL(url, window.location.origin);
            return parsed.pathname.endsWith("/data/export.geojson");
        } catch (_) {
            return String(url).includes("data/export.geojson");
        }
    };

    const isMapPriceStatsRequest = url => {
        return url.includes(".supabase.co/rest/v1/fuel_prices") &&
            url.includes("select=id") &&
            url.includes("created_at=gte.") &&
            url.includes("created_at=lt.") &&
            url.includes("limit=1");
    };

    const guessCity = station => {
        const address = String(station?.address || "").trim();
        const firstAddressPart = address.split(",")[0]?.trim() || "";
        if (firstAddressPart && !/^(АМ|AM|Главен път|8-ми км|Магистрала)/i.test(firstAddressPart)) {
            return firstAddressPart
                .replace(/^гр\.\s*/i, "")
                .replace(/^с\.\s*/i, "")
                .trim();
        }

        const name = String(station?.name || "")
            .replace(/^ЕКО\s+\d+\s*/i, "")
            .trim();
        return name.split(/[,-]/)[0]?.trim() || "";
    };

    async function buildEkoGeoJson() {
        const [stationsResponse, productsResponse] = await Promise.all([
            upstreamFetch("/data/eko_stations.json", { cache: "force-cache" }),
            upstreamFetch("/data/eko_products.json", { cache: "force-cache" })
        ]);

        if (!stationsResponse.ok) {
            throw new Error(`EKO station registry request failed: ${stationsResponse.status}`);
        }
        if (!productsResponse.ok) {
            throw new Error(`EKO products request failed: ${productsResponse.status}`);
        }

        const registry = await stationsResponse.json();
        const productData = await productsResponse.json();
        const productsByStation = productData?.products_by_station || {};

        const features = Object.values(registry?.stations || {})
            .filter(station => Number.isFinite(Number(station?.latitude)) && Number.isFinite(Number(station?.longitude)))
            .map(station => {
                const stationId = String(station.station_id || "").trim();
                const products = Array.isArray(productsByStation[stationId])
                    ? productsByStation[stationId]
                    : [];
                const city = guessCity(station);

                const properties = {
                    station_id: stationId,
                    brand: "EKO",
                    operator: "EKO Bulgaria",
                    name: station.name || `ЕКО ${stationId}`,
                    address: station.address || null,
                    phone: station.phone || null,
                    maps_url: station.maps_url || null,
                    city: city || null,
                    "addr:city": city || null,
                    products,
                    products_source_date: productData?.source_date || null
                };

                // Keep compatibility with the existing popup renderer.
                if (products.includes("Бензин A95")) properties["fuel:octane_95"] = "yes";
                if (products.includes("Бензин A100")) properties["fuel:octane_100"] = "yes";
                if (products.includes("Дизел")) properties["fuel:diesel"] = "yes";
                if (products.includes("Дизел премиум")) properties["fuel:diesel:premium"] = "yes";
                if (products.includes("Пропан Бутан")) properties["fuel:lpg"] = "yes";

                return {
                    type: "Feature",
                    id: `eko-${stationId}`,
                    geometry: {
                        type: "Point",
                        coordinates: [Number(station.longitude), Number(station.latitude)]
                    },
                    properties
                };
            });

        return {
            type: "FeatureCollection",
            source: registry?.source || "EKO Bulgaria",
            products_source_date: productData?.source_date || null,
            brand_filter: "EKO_ONLY",
            features
        };
    }

    window.fetch = async (input, init = {}) => {
        const url = requestUrl(input);

        if (isLeafletGeoJsonRequest(url)) {
            try {
                ekoGeoJsonPromise ||= buildEkoGeoJson();
                const data = await ekoGeoJsonPromise;
                return new Response(JSON.stringify(data), {
                    status: 200,
                    headers: { "Content-Type": "application/geo+json; charset=utf-8" }
                });
            } catch (error) {
                console.error("Failed to build EKO-only Leaflet data", error);
                return upstreamFetch(input, init);
            }
        }

        // The statistics card belongs to the EKO-only map, so its daily price
        // count must also be limited to EKO instead of all fuel-price records.
        if (isMapPriceStatsRequest(url)) {
            try {
                const parsed = new URL(url, window.location.origin);
                if (!parsed.searchParams.has("station")) {
                    parsed.searchParams.set("station", "eq.ЕКО");
                }
                return upstreamFetch(parsed.toString(), init);
            } catch (_) {
                // Fall through to the original request if URL parsing fails.
            }
        }

        return upstreamFetch(input, init);
    };

    const labelEkoMap = () => {
        const section = document.querySelector(".station-map-section");
        if (!section) return;

        const proTitle = section.querySelector(".pro-map-heading h2");
        const proSubtitle = section.querySelector(".pro-map-heading p");
        const chip = section.querySelector(".pro-map-chip");
        const legacyTitle = section.querySelector(".section-title");

        if (proTitle) proTitle.textContent = "Карта на бензиностанциите EKO";
        if (proSubtitle) proSubtitle.textContent = "Картата показва само обектите на EKO в България. Кликни върху маркер за адрес, телефон и предлагани горива.";
        if (chip) chip.textContent = "Само обекти EKO";
        if (legacyTitle) legacyTitle.textContent = "Карта на бензиностанциите EKO";

        const stationLabel = section.querySelector("#map-stat-stations")?.closest(".map-stat-card")?.querySelector(".map-stat-label");
        const priceLabel = section.querySelector("#map-stat-prices")?.closest(".map-stat-card")?.querySelector(".map-stat-label");
        if (stationLabel) stationLabel.textContent = "EKO обекти";
        if (priceLabel) priceLabel.textContent = "EKO цени днес";
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", labelEkoMap, { once: true });
    } else {
        labelEkoMap();
    }
})();


document.addEventListener("DOMContentLoaded", () => {

    let url = "https://eaqvhxfvozhzatrnbkvx.supabase.co/rest/v1/ecopetrol";
    let apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhcXZoeGZ2b3poemF0cm5ia3Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTI0NjYsImV4cCI6MjA4ODcyODQ2Nn0.qOIGTFGZ6ojFA84G59LMtqoJZhVEvEmGBdoZj-ynMXI";

    let fuels = ["dizel", "benzin95", "benzin100", "lpg", "adblue"]

    fetch(url, {
        headers: {
            apikey: apiKey,
            Authorization: `Bearer ${apiKey}`
        }
    })
        .then(res => {
            if (!res.ok) {
                throw new Error("Request failed: " + res.status);
            }
            return res.json();
        })
        .then(data => {

            console.log("DATA:", data);

            data.forEach(st => {

                let slug = (st.station_slug || "").trim().toLowerCase();

                fuels.forEach(fuel => {

                    let id = `${fuel}-${slug}`;
                    let el = document.getElementById(id);

                    if (!el) {
                        console.log("Missing element:", id);
                        return;
                    }

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