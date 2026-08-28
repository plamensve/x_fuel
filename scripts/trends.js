const SUPABASE_URL = "https://eaqvhxfvozhzatrnbkvx.supabase.co"
const SUPABASE_KEY = "sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH"

const FUEL_ALIASES = {
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
}

const FUEL_ORDER = ["A95", "Дизел", "LPG", "A100", "Дизел +", "Метан"]

let currentPageTrend = 1
let itemsPerPageTrend = 12
let currentModalData = []
let currentModalDate = null

let modalList
let paginationEl
let paginationInfoEl
let calendar
let chart

let selectedFuel = "A95"
let dayCounts = {}
let allData = []
let filtersInitialized = false


document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("day-modal")
    const closeModal = document.getElementById("close-modal")

    modalList = document.getElementById("modal-list")
    paginationEl = document.getElementById("pagination")
    paginationInfoEl = document.getElementById("pagination-info")

    closeModal?.addEventListener("click", () => closeDayModal())

    modal?.addEventListener("click", event => {
        if (event.target === modal) closeDayModal()
    })

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeDayModal()
    })

    const calendarEl = document.getElementById("calendar")
    if (!calendarEl) return

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        locale: "bg",
        firstDay: 1,
        fixedWeekCount: false,
        height: "auto",
        dayMaxEvents: false,
        headerToolbar: {
            left: "prev,next today",
            center: "title",
            right: ""
        },
        buttonText: {
            today: "Днес"
        },
        dateClick: info => showDayData(info.dateStr),
        eventClick: info => {
            info.jsEvent.preventDefault()
            info.jsEvent.stopPropagation()
            showDayData(info.event.startStr)
        },
        datesSet: info => {
            const startDate = toDateOnly(info.start)
            const endDate = toDateOnly(info.end)
            loadData(startDate, endDate)
        },
        dayCellDidMount: () => setTimeout(injectCounts, 0)
    })

    calendar.render()
    injectFiltersIntoCalendar()
    bindChartFilters()
})

function canonicalFuel(value) {
    return FUEL_ALIASES[value] || value
}

function toDateOnly(date) {
    return date.toISOString().split("T")[0]
}

function formatDateBg(dateStr) {
    if (!dateStr) return ""
    const [year, month, day] = dateStr.split("-").map(Number)
    return new Intl.DateTimeFormat("bg-BG", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    }).format(new Date(year, month - 1, day))
}

function normalizeRow(row) {
    return {
        ...row,
        fuel: canonicalFuel(row.fuel),
        price: Number(row.price),
        dateOnly: row.created_at ? toDateOnly(new Date(row.created_at)) : null
    }
}

async function loadData(startDate, endDate) {
    setCalendarSummary("Зареждане на данните…")

    const pageSize = 1000
    let offset = 0
    let rows = []

    try {
        while (true) {
            const url = `${SUPABASE_URL}/rest/v1/fuel_prices?select=*&created_at=gte.${startDate}&created_at=lt.${endDate}&order=created_at.desc&limit=${pageSize}&offset=${offset}`
            const response = await fetch(url, {
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`
                }
            })

            if (!response.ok) {
                throw new Error(`Supabase request failed: ${response.status}`)
            }

            const batch = await response.json()
            rows.push(...batch)

            if (batch.length < pageSize) break
            offset += pageSize
        }

        allData = rows.map(normalizeRow).filter(row => row.dateOnly && Number.isFinite(row.price))

        populateFilters(allData)
        render()
        renderBestPricesForTodayOrLatest()
    } catch (error) {
        console.error(error)
        allData = []
        render()
        setCalendarSummary("Неуспешно зареждане на данните")
        renderBestPrices([])
    }
}

function populateFilters(data) {
    const regionFilter = document.getElementById("region-filter")
    const cityFilter = document.getElementById("city-filter")
    const stationFilter = document.getElementById("station-filter")

    if (!regionFilter || !cityFilter || !stationFilter) return

    const currentRegion = regionFilter.value || "all"
    const currentCity = cityFilter.value || "all"
    const currentStation = stationFilter.value || "all"

    const regions = uniqueSorted(data.map(row => row.region).filter(Boolean))
    fillSelect(regionFilter, regions, "Всички области", currentRegion)

    const cityRows = currentRegion === "all"
        ? data
        : data.filter(row => row.region === currentRegion)

    const cities = uniqueSorted(cityRows.map(row => row.city).filter(Boolean))
    fillSelect(cityFilter, cities, "Всички градове", currentCity)

    const stationRows = cityFilter.value === "all"
        ? cityRows
        : cityRows.filter(row => row.city === cityFilter.value)

    const stations = uniqueSorted(stationRows.map(row => row.station).filter(Boolean))
    fillSelect(stationFilter, stations, "Всички бензиностанции", currentStation)
}

function uniqueSorted(values) {
    return [...new Set(values)].sort((a, b) => a.localeCompare(b, "bg"))
}

function fillSelect(select, values, label, preferredValue = "all") {
    select.innerHTML = ""

    const allOption = document.createElement("option")
    allOption.value = "all"
    allOption.textContent = label
    select.appendChild(allOption)

    values.forEach(value => {
        const option = document.createElement("option")
        option.value = value
        option.textContent = value
        select.appendChild(option)
    })

    select.value = values.includes(preferredValue) ? preferredValue : "all"
}

function injectFiltersIntoCalendar() {
    if (document.querySelector(".calendar-filters")) return

    const calendarContainer = document.getElementById("calendar")
    if (!calendarContainer) return

    const filters = document.createElement("div")
    filters.className = "calendar-filters"
    filters.innerHTML = `
        <label class="filter-field">
            <span>Област</span>
            <select id="region-filter">
                <option value="all">Всички области</option>
            </select>
        </label>

        <label class="filter-field">
            <span>Град</span>
            <select id="city-filter">
                <option value="all">Всички градове</option>
            </select>
        </label>

        <label class="filter-field">
            <span>Гориво</span>
            <select id="fuel-filter">
                <option value="all">Всички горива</option>
                <option value="A95">A95</option>
                <option value="Дизел">Дизел</option>
                <option value="LPG">LPG</option>
                <option value="A100">A100</option>
                <option value="Дизел +">Дизел +</option>
                <option value="Метан">Метан</option>
            </select>
        </label>

        <label class="filter-field">
            <span>Бензиностанция</span>
            <select id="station-filter">
                <option value="all">Всички бензиностанции</option>
            </select>
        </label>

        <button type="button" id="clear-filters" class="clear-filters">Изчисти филтрите</button>
    `

    calendarContainer.before(filters)

    if (!filtersInitialized) {
        bindFilters()
        filtersInitialized = true
    }
}

function bindFilters() {
    const regionFilter = document.getElementById("region-filter")
    const cityFilter = document.getElementById("city-filter")
    const fuelFilter = document.getElementById("fuel-filter")
    const stationFilter = document.getElementById("station-filter")
    const clearFilters = document.getElementById("clear-filters")

    regionFilter?.addEventListener("change", () => {
        cityFilter.value = "all"
        stationFilter.value = "all"
        populateFilters(allData)
        render()
    })

    cityFilter?.addEventListener("change", () => {
        stationFilter.value = "all"
        populateFilters(allData)
        render()
    })

    fuelFilter?.addEventListener("change", render)
    stationFilter?.addEventListener("change", render)

    clearFilters?.addEventListener("click", () => {
        if (regionFilter) regionFilter.value = "all"
        if (cityFilter) cityFilter.value = "all"
        if (fuelFilter) fuelFilter.value = "all"
        if (stationFilter) stationFilter.value = "all"
        populateFilters(allData)
        render()
    })
}

function getFilteredData() {
    const fuelFilter = document.getElementById("fuel-filter")
    const regionFilter = document.getElementById("region-filter")
    const cityFilter = document.getElementById("city-filter")
    const stationFilter = document.getElementById("station-filter")

    return allData.filter(row => (
        (!fuelFilter || fuelFilter.value === "all" || row.fuel === fuelFilter.value) &&
        (!regionFilter || regionFilter.value === "all" || row.region === regionFilter.value) &&
        (!cityFilter || cityFilter.value === "all" || row.city === cityFilter.value) &&
        (!stationFilter || stationFilter.value === "all" || row.station === stationFilter.value)
    ))
}

function render() {
    const filtered = getFilteredData()

    if (calendar) {
        calendar.removeAllEvents()
        calendar.addEventSource(groupByDate(filtered))
        setTimeout(injectCounts, 0)
    }

    renderChart(filtered)
    updateCalendarSummary(filtered)
}

function getFuelClass(fuel) {
    if (fuel === "A95") return "fuel-a95"
    if (fuel === "A100") return "fuel-a100"
    if (fuel === "Дизел") return "fuel-diesel"
    if (fuel === "Дизел +") return "fuel-diesel-plus"
    if (fuel === "LPG") return "fuel-gas"
    if (fuel === "Метан") return "fuel-methane"
    return "fuel-default"
}

function groupByDate(data) {
    const groups = {}
    dayCounts = {}

    data.forEach(row => {
        if (!row.dateOnly) return

        if (!groups[row.dateOnly]) {
            groups[row.dateOnly] = {
                fuels: new Set(),
                count: 0
            }
        }

        groups[row.dateOnly].count += 1
        groups[row.dateOnly].fuels.add(row.fuel)
    })

    const events = []

    Object.entries(groups).forEach(([date, group]) => {
        dayCounts[date] = group.count

        group.fuels.forEach(fuel => {
            events.push({
                title: fuel,
                start: date,
                allDay: true,
                classNames: [getFuelClass(fuel)]
            })
        })
    })

    return events
}

function injectCounts() {
    document.querySelectorAll(".fc-daygrid-day").forEach(cell => {
        const date = cell.getAttribute("data-date")
        const frame = cell.querySelector(".fc-daygrid-day-frame")
        if (!frame) return

        frame.querySelector(".day-count")?.remove()

        if (dayCounts[date]) {
            const badge = document.createElement("div")
            badge.className = "day-count"
            badge.textContent = `${dayCounts[date]} записа`
            frame.appendChild(badge)
        }
    })
}

function renderBestPricesForTodayOrLatest() {
    const filtered = getFilteredData()
    const todayStr = toDateOnly(new Date())
    const todayData = filtered.filter(row => row.dateOnly === todayStr)

    if (todayData.length) {
        updateBestPricesHeading(todayStr, false)
        renderBestPrices(todayData)
        return
    }

    const latestDate = filtered
        .map(row => row.dateOnly)
        .filter(Boolean)
        .sort()
        .pop()

    const latestData = latestDate
        ? filtered.filter(row => row.dateOnly === latestDate)
        : []

    updateBestPricesHeading(latestDate, true)
    renderBestPrices(latestData)
}

function updateBestPricesHeading(dateStr, fallback) {
    const title = document.getElementById("best-prices-title")
    const dateChip = document.getElementById("best-prices-date")

    if (title) {
        title.textContent = fallback
            ? "Най-ниски цени за последния наличен ден"
            : "Най-ниски цени за днес"
    }

    if (dateChip) {
        dateChip.textContent = dateStr ? formatDateBg(dateStr) : "Няма данни"
    }
}

function renderBestPrices(data) {
    const container = document.getElementById("best-prices")
    if (!container) return

    if (!data.length) {
        container.innerHTML = `<div class="empty-state">Няма налични цени за избрания период.</div>`
        return
    }

    const bestByFuel = {}

    data.forEach(row => {
        if (!row.fuel || !Number.isFinite(row.price)) return

        if (!bestByFuel[row.fuel] || row.price < bestByFuel[row.fuel].price) {
            bestByFuel[row.fuel] = row
        }
    })

    container.innerHTML = FUEL_ORDER
        .filter(fuel => bestByFuel[fuel])
        .map(fuel => {
            const row = bestByFuel[fuel]
            return `
                <article class="best-price-card ${getFuelClass(fuel)}">
                    <div class="best-card-topline">
                        <span class="fuel-badge">${escapeHtml(fuel)}</span>
                        <span class="best-label">Най-ниска</span>
                    </div>
                    <div class="price">${row.price.toFixed(2)} €</div>
                    <div class="station">${escapeHtml(row.station || "Неизвестна бензиностанция")}</div>
                    <div class="city">${escapeHtml(row.city || "Неизвестен град")}</div>
                </article>
            `
        })
        .join("")
}

function showDayData(dateStr) {
    const filtered = getFilteredData().filter(row => row.dateOnly === dateStr)
    currentModalDate = dateStr

    currentModalData = filtered
        .slice()
        .sort((a, b) => {
            const fuelDiff = FUEL_ORDER.indexOf(a.fuel) - FUEL_ORDER.indexOf(b.fuel)
            if (fuelDiff !== 0) return fuelDiff
            return a.price - b.price
        })

    currentPageTrend = 1

    const modalDate = document.getElementById("modal-date")
    const modalMeta = document.getElementById("modal-meta")
    const modal = document.getElementById("day-modal")

    if (modalDate) modalDate.textContent = formatDateBg(dateStr)

    if (modalMeta) {
        const stationsCount = new Set(filtered.map(row => `${row.station}|${row.city}`)).size
        modalMeta.textContent = filtered.length
            ? `${filtered.length} цени от ${stationsCount} бензиностанции`
            : "Няма налични данни за този ден"
    }

    renderPage()

    if (modal) {
        modal.classList.add("show")
        modal.setAttribute("aria-hidden", "false")
        document.body.classList.add("modal-open")
    }
}

function closeDayModal() {
    const modal = document.getElementById("day-modal")
    if (!modal) return

    modal.classList.remove("show")
    modal.setAttribute("aria-hidden", "true")
    document.body.classList.remove("modal-open")
}

function renderPage() {
    if (!modalList) return

    const totalItems = currentModalData.length
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPageTrend))
    currentPageTrend = Math.min(currentPageTrend, totalPages)

    const start = (currentPageTrend - 1) * itemsPerPageTrend
    const pageItems = currentModalData.slice(start, start + itemsPerPageTrend)

    if (!pageItems.length) {
        modalList.innerHTML = `<div class="empty-state modal-empty">Няма цени за избраната дата и филтри.</div>`
        renderPagination(totalItems)
        return
    }

    let html = ""
    let lastFuel = null

    pageItems.forEach(item => {
        if (item.fuel !== lastFuel) {
            html += `<div class="modal-fuel-heading"><span class="dot ${getFuelClass(item.fuel)}"></span>${escapeHtml(item.fuel)}</div>`
            lastFuel = item.fuel
        }

        html += `
            <article class="modal-row">
                <div class="modal-station-copy">
                    <strong>${escapeHtml(item.station || "Неизвестна бензиностанция")}</strong>
                    <span>${escapeHtml(item.city || "Неизвестен град")}${item.region ? ` · ${escapeHtml(item.region)}` : ""}</span>
                    ${item.location ? `<small>${escapeHtml(item.location)}</small>` : ""}
                </div>
                <div class="modal-price-block">
                    <span>${item.price.toFixed(2)} €</span>
                    <small>${escapeHtml(item.fuel)}</small>
                </div>
            </article>
        `
    })

    modalList.innerHTML = html
    renderPagination(totalItems)
}

function renderPagination(totalItems) {
    if (!paginationEl || !paginationInfoEl) return

    paginationEl.innerHTML = ""

    if (!totalItems) {
        paginationInfoEl.textContent = "0 резултата"
        return
    }

    const totalPages = Math.ceil(totalItems / itemsPerPageTrend)
    const startItem = (currentPageTrend - 1) * itemsPerPageTrend + 1
    const endItem = Math.min(currentPageTrend * itemsPerPageTrend, totalItems)

    paginationInfoEl.textContent = `${startItem}–${endItem} от ${totalItems} резултата`

    const previous = paginationButton("← Предишна", currentPageTrend === 1, () => {
        currentPageTrend -= 1
        renderPage()
        scrollModalToTop()
    })

    paginationEl.appendChild(previous)

    getPaginationPages(currentPageTrend, totalPages).forEach(page => {
        if (page === "ellipsis") {
            const ellipsis = document.createElement("span")
            ellipsis.className = "pagination-ellipsis"
            ellipsis.textContent = "…"
            paginationEl.appendChild(ellipsis)
            return
        }

        const button = paginationButton(String(page), false, () => {
            currentPageTrend = page
            renderPage()
            scrollModalToTop()
        })

        if (page === currentPageTrend) {
            button.classList.add("active")
            button.setAttribute("aria-current", "page")
        }

        paginationEl.appendChild(button)
    })

    const next = paginationButton("Следваща →", currentPageTrend === totalPages, () => {
        currentPageTrend += 1
        renderPage()
        scrollModalToTop()
    })

    paginationEl.appendChild(next)
}

function paginationButton(label, disabled, onClick) {
    const button = document.createElement("button")
    button.type = "button"
    button.textContent = label
    button.disabled = disabled
    button.addEventListener("click", onClick)
    return button
}

function getPaginationPages(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)

    const pages = [1]
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)

    if (start > 2) pages.push("ellipsis")
    for (let page = start; page <= end; page += 1) pages.push(page)
    if (end < total - 1) pages.push("ellipsis")

    pages.push(total)
    return pages
}

function scrollModalToTop() {
    modalList?.scrollTo({ top: 0, behavior: "smooth" })
}

function bindChartFilters() {
    const buttons = document.querySelectorAll(".chart-filters button")

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            selectedFuel = canonicalFuel(button.dataset.fuel)

            buttons.forEach(item => item.classList.remove("active"))
            button.classList.add("active")

            renderChart(getFilteredData())
        })
    })
}

function buildChartData(data) {
    const grouped = {}

    data.forEach(row => {
        if (!Number.isFinite(row.price) || row.fuel !== selectedFuel || !row.dateOnly) return

        if (!grouped[row.dateOnly]) {
            grouped[row.dateOnly] = { sum: 0, count: 0 }
        }

        grouped[row.dateOnly].sum += row.price
        grouped[row.dateOnly].count += 1
    })

    const labels = Object.keys(grouped).sort()
    const values = labels.map(date => grouped[date].sum / grouped[date].count)

    return { labels, values }
}

function renderChart(data) {
    const ctx = document.getElementById("price-chart")
    if (!ctx) return

    const { labels, values } = buildChartData(data)

    if (chart) {
        chart.data.labels = labels
        chart.data.datasets[0].data = values
        chart.data.datasets[0].label = selectedFuel
        chart.update()
        return
    }

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: selectedFuel,
                data: values,
                tension: 0.28,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: "index"
            },
            scales: {
                y: {
                    ticks: {
                        callback: value => `${Number(value).toFixed(2)} €`
                    }
                }
            },
            plugins: {
                legend: {
                    display: true
                },
                tooltip: {
                    callbacks: {
                        label: context => `${context.dataset.label}: ${Number(context.raw).toFixed(2)} €`
                    }
                }
            }
        }
    })
}

function updateCalendarSummary(data) {
    const uniqueDates = new Set(data.map(row => row.dateOnly).filter(Boolean)).size
    const uniqueStations = new Set(data.map(row => `${row.station}|${row.city}`)).size

    setCalendarSummary(
        data.length
            ? `${data.length} цени · ${uniqueStations} станции · ${uniqueDates} дни`
            : "Няма резултати за избраните филтри"
    )
}

function setCalendarSummary(text) {
    const summary = document.getElementById("calendar-summary")
    if (summary) summary.textContent = text
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
}
