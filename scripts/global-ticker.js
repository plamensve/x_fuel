(() => {
    if (window.__GORIVA_GLOBAL_TICKER__) return;
    window.__GORIVA_GLOBAL_TICKER__ = true;
    window.__GORIVA_GLOBAL_TICKER_OWNER__ = true;

    const tickerSpeed = 0.3;
    const pageSize = 1000;
    const apiUrl = "https://eaqvhxfvozhzatrnbkvx.supabase.co/rest/v1/fuel_prices";
    const apiKey = "sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH";
    let tickerAnimationId = null;
    let tickerOffset = 0;

    const sofiaDateFormatter = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Sofia",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });

    const dateOnly = value => {
        const date = value instanceof Date ? value : new Date(value);
        return Number.isNaN(date.getTime()) ? "" : sofiaDateFormatter.format(date);
    };

    async function loadLatestPrices() {
        const loaded = [];
        let latestDate = "";
        let offset = 0;

        while (true) {
            const url = apiUrl +
                "?select=*" +
                "&order=created_at.desc" +
                "&limit=" + pageSize +
                "&offset=" + offset;

            const response = await window.fetch(url, {
                headers: {
                    apikey: apiKey
                }
            });
            if (!response.ok) throw new Error("Prices request failed: " + response.status);

            const batch = await response.json();
            if (!Array.isArray(batch)) throw new Error("Prices response was not an array");

            if (!latestDate && batch.length > 0) {
                latestDate = dateOnly(batch[0].created_at);
            }

            loaded.push(...batch.filter(row => dateOnly(row.created_at) === latestDate));

            const reachedOlderDate = batch.some(row => dateOnly(row.created_at) !== latestDate);
            if (batch.length < pageSize || reachedOlderDate) break;
            offset += pageSize;
        }

        return loaded;
    }

    function renderTicker(data) {
        const container = document.getElementById("ticker-content");
        if (!container) return;

        if (!data || data.length === 0) {
            if (tickerAnimationId) {
                cancelAnimationFrame(tickerAnimationId);
                tickerAnimationId = null;
            }
            container.innerHTML = '<div class="ticker-empty">Все още няма подадени цени за днес</div>';
            return;
        }

        const items = data.map(row => {
            const price = Number(row.price);
            return '<span class="ticker-item">' +
                row.fuel + ': <strong>' + price.toFixed(2) + '€</strong>' +
                ' (' + row.station + ', ' + row.city + ')' +
                '</span>';
        });

        container.innerHTML = '<div class="ticker-track">' + items.join("").repeat(10) + '</div>';
        startTickerLoop();
    }

    function startTickerLoop() {
        const container = document.getElementById("ticker-content");
        const track = container?.querySelector(".ticker-track");
        if (!track) return;

        if (tickerAnimationId) cancelAnimationFrame(tickerAnimationId);
        tickerOffset = 0;

        function step() {
            tickerOffset += tickerSpeed;
            track.style.transform = "translateX(-" + tickerOffset + "px)";

            const first = track.firstElementChild;
            if (first) {
                const firstWidth = first.offsetWidth + 50;
                if (tickerOffset >= firstWidth) {
                    tickerOffset -= firstWidth;
                    track.appendChild(first);
                }
            }

            tickerAnimationId = requestAnimationFrame(step);
        }

        step();
    }

    function initGlobalTicker() {
        if (!document.getElementById("ticker-content")) return;
        loadLatestPrices()
            .then(renderTicker)
            .catch(error => {
                console.error("Failed to load global daily fuel ticker", error);
                renderTicker([]);
            });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initGlobalTicker, { once: true });
    } else {
        initGlobalTicker();
    }
})();
