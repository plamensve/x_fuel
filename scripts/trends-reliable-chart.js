(() => {
    const TREND_DAYS = 90
    const SOFIA_TIME_ZONE = "Europe/Sofia"
    const PAGE_SIZE = 1000

    let reliableTrendData = []
    let trendLoadPromise = null

    function sofiaDateOnly(value) {
        const date = value instanceof Date ? value : new Date(value)
        if (Number.isNaN(date.getTime())) return null

        const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: SOFIA_TIME_ZONE,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(date)

        const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
        return `${values.year}-${values.month}-${values.day}`
    }

    function addDays(date, days) {
        const copy = new Date(date)
        copy.setUTCDate(copy.getUTCDate() + days)
        return copy
    }

    function normalizeText(value) {
        return String(value ?? "")
            .trim()
            .replace(/\s+/g, " ")
            .toLocaleLowerCase("bg-BG")
    }

    function stationKey(row) {
        return [row.station, row.city, row.location]
            .map(normalizeText)
            .join("|")
    }

    function normalizeTrendRow(row) {
        return {
            ...row,
            fuel: canonicalFuel(row.fuel),
            price: Number(row.price),
            dateOnly: row.created_at ? sofiaDateOnly(row.created_at) : null,
            timestamp: row.created_at ? Date.parse(row.created_at) : Number.NaN
        }
    }

    function activeFilterValue(id) {
        const element = document.getElementById(id)
        return element?.value || "all"
    }

    function getReliableFilteredData() {
        const region = activeFilterValue("region-filter")
        const city = activeFilterValue("city-filter")
        const station = activeFilterValue("station-filter")
        const fuelFilter = activeFilterValue("fuel-filter")

        return reliableTrendData.filter(row => (
            (region === "all" || row.region === region) &&
            (city === "all" || row.city === city) &&
            (station === "all" || row.station === station) &&
            (fuelFilter === "all" || row.fuel === fuelFilter)
        ))
    }

    async function fetchTrendRows(startDate, endDate) {
        let offset = 0
        const rows = []

        while (true) {
            const select = "created_at,price,fuel,region,city,station,location"
            const url = `${SUPABASE_URL}/rest/v1/fuel_prices?select=${select}&created_at=gte.${startDate}&created_at=lt.${endDate}&order=created_at.asc&limit=${PAGE_SIZE}&offset=${offset}`
            const response = await fetch(url, {
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`
                }
            })

            if (!response.ok) {
                throw new Error(`Trend data request failed: ${response.status}`)
            }

            const batch = await response.json()
            rows.push(...batch)

            if (batch.length < PAGE_SIZE) break
            offset += PAGE_SIZE
        }

        return rows
    }

    async function loadReliableTrendData() {
        if (trendLoadPromise) return trendLoadPromise

        trendLoadPromise = (async () => {
            const now = new Date()
            const start = addDays(now, -(TREND_DAYS + 1))
            const end = addDays(now, 2)
            const startDate = sofiaDateOnly(start)
            const endDate = sofiaDateOnly(end)

            const rows = await fetchTrendRows(startDate, endDate)
            reliableTrendData = rows
                .map(normalizeTrendRow)
                .filter(row => (
                    row.dateOnly &&
                    Number.isFinite(row.price) &&
                    row.price > 0 &&
                    FUEL_ORDER.includes(row.fuel)
                ))

            const cutoff = sofiaDateOnly(addDays(now, -(TREND_DAYS - 1)))
            reliableTrendData = reliableTrendData.filter(row => row.dateOnly >= cutoff)

            updateTrendMethodologyCopy()
            renderChart(getFilteredData())
        })().catch(error => {
            console.error("Reliable trend data unavailable", error)
            reliableTrendData = []
            updateTrendMethodologyCopy(true)
            renderChart(getFilteredData())
        })

        return trendLoadPromise
    }

    function buildReliableChartData(data) {
        const source = reliableTrendData.length ? getReliableFilteredData() : data
        const latestByStationAndDay = new Map()

        source.forEach(row => {
            if (!Number.isFinite(row.price) || row.price <= 0 || row.fuel !== selectedFuel || !row.dateOnly) return

            const key = `${row.dateOnly}|${stationKey(row)}`
            const existing = latestByStationAndDay.get(key)
            const timestamp = Number.isFinite(row.timestamp)
                ? row.timestamp
                : (row.created_at ? Date.parse(row.created_at) : Number.NaN)

            if (!existing || !Number.isFinite(existing.timestamp) || (Number.isFinite(timestamp) && timestamp >= existing.timestamp)) {
                latestByStationAndDay.set(key, {
                    dateOnly: row.dateOnly,
                    price: row.price,
                    timestamp
                })
            }
        })

        const grouped = {}
        latestByStationAndDay.forEach(item => {
            if (!grouped[item.dateOnly]) grouped[item.dateOnly] = []
            grouped[item.dateOnly].push(item.price)
        })

        const labels = Object.keys(grouped).sort()
        const values = labels.map(date => {
            const prices = grouped[date]
            return prices.reduce((sum, price) => sum + price, 0) / prices.length
        })
        const counts = labels.map(date => grouped[date].length)

        const byDate = new Map(labels.map((date, index) => [date, values[index]]))
        const trendValues = labels.map(date => {
            const current = new Date(`${date}T12:00:00Z`)
            const windowValues = []

            for (let offset = 6; offset >= 0; offset -= 1) {
                const windowDate = addDays(current, -offset).toISOString().slice(0, 10)
                const value = byDate.get(windowDate)
                if (Number.isFinite(value)) windowValues.push(value)
            }

            if (!windowValues.length) return null
            return windowValues.reduce((sum, value) => sum + value, 0) / windowValues.length
        })

        return { labels, values, counts, trendValues }
    }

    function renderReliableChart(fallbackData = []) {
        const ctx = document.getElementById("price-chart")
        if (!ctx || typeof Chart === "undefined") return

        const { labels, values, counts, trendValues } = buildReliableChartData(fallbackData)
        const color = FUEL_COLORS[selectedFuel] || "#3b82f6"

        if (chart) {
            chart.destroy()
            chart = null
        }

        chart = new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [
                    {
                        label: `${selectedFuel} · дневна средна`,
                        data: values,
                        stationCounts: counts,
                        borderColor: `${color}88`,
                        backgroundColor: `${color}10`,
                        fill: false,
                        borderWidth: 1.5,
                        tension: 0.18,
                        pointRadius: 2.2,
                        pointHoverRadius: 5,
                        pointBackgroundColor: color
                    },
                    {
                        label: `${selectedFuel} · 7-дневен тренд`,
                        data: trendValues,
                        borderColor: color,
                        backgroundColor: `${color}12`,
                        fill: true,
                        borderWidth: 3,
                        tension: 0.28,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        spanGaps: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: "index"
                },
                scales: {
                    x: {
                        grid: { color: "rgba(148,163,184,0.07)" },
                        ticks: { color: "#8094aa", maxTicksLimit: 9 }
                    },
                    y: {
                        grid: { color: "rgba(148,163,184,0.07)" },
                        ticks: {
                            color: "#8094aa",
                            callback: value => `${Number(value).toFixed(2)} €`
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: "#b8c8d9",
                            usePointStyle: true,
                            boxWidth: 8
                        }
                    },
                    tooltip: {
                        backgroundColor: "rgba(8,17,31,0.96)",
                        borderColor: "rgba(148,163,184,0.14)",
                        borderWidth: 1,
                        titleColor: "#ffffff",
                        bodyColor: "#cbd5e1",
                        callbacks: {
                            label: context => `${context.dataset.label}: ${Number(context.raw).toFixed(3)} €`,
                            afterLabel: context => {
                                if (!Array.isArray(context.dataset.stationCounts)) return ""
                                const count = context.dataset.stationCounts[context.dataIndex]
                                return `${count} ${count === 1 ? "уникална станция" : "уникални станции"}`
                            }
                        }
                    }
                }
            }
        })
    }

    function updateTrendMethodologyCopy(fallback = false) {
        const description = document.querySelector(".chart-description")
        const tip = document.querySelector(".chart-tip span")

        if (description) {
            description.textContent = fallback
                ? "Графиката показва средната цена по дни за избраното гориво и активните филтри."
                : `Последните ${TREND_DAYS} дни: за всяка уникална станция се използва последната цена за деня, след което се изчислява дневна средна.`
        }

        if (tip && !fallback) {
            tip.textContent = "Плътната линия е 7-дневна подвижна средна и показва по-надеждно посоката на тренда."
        }
    }

    buildChartData = buildReliableChartData
    renderChart = renderReliableChart

    updateTrendMethodologyCopy()
    loadReliableTrendData()
})()
