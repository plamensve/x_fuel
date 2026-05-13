let currentPageTrend = 1
let itemsPerPageTrend = 10

let modalList
let paginationEl
let calendar
let chart

let selectedFuel = "Бензин A95"

let dayCounts = {}

let filtersInitialized = false

let allData = []

document.addEventListener("DOMContentLoaded", function () {

    let modal = document.getElementById("day-modal")

    modalList = document.getElementById("modal-list")
    paginationEl = document.getElementById("pagination")

    let modalDate = document.getElementById("modal-date")
    let closeModal = document.getElementById("close-modal")

    closeModal.onclick = () => {
        modal.classList.remove("show")
    }

    window.onclick = function (e) {
        if (e.target === modal) {
            modal.classList.remove("show")
        }
    }

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            modal.classList.remove("show")
        }
    })

    let calendarEl = document.getElementById("calendar")

    if (!calendarEl) {
        console.error("Calendar not found")
        return
    }

    calendar = new FullCalendar.Calendar(calendarEl, {

        initialView: 'dayGridMonth',
        height: 650,
        locale: 'bg',
        dayMaxEvents: false,

        dateClick: (info) => {
            showDayData(info.dateStr)
        },

        eventClick: (info) => {

            info.jsEvent.preventDefault()
            info.jsEvent.stopPropagation()

            showDayData(info.event.startStr)
        },

        datesSet: (info) => {

            let startDate = info.start
                .toISOString()
                .split("T")[0]

            let endDate = info.end
                .toISOString()
                .split("T")[0]

            loadData(startDate, endDate)
        },

        dayCellDidMount: () => {
            setTimeout(injectCounts, 0)
        }
    })

    calendar.render()

    setTimeout(() => {
        injectFiltersIntoCalendar()
    }, 100)

    let buttons = document.querySelectorAll(".chart-filters button")

    buttons.forEach(btn => {

        btn.addEventListener("click", function () {

            selectedFuel = this.dataset.fuel

            buttons.forEach(b => {
                b.classList.remove("active")
            })

            this.classList.add("active")

            render()
        })
    })
})

function loadData(startDate, endDate) {

    fetch(
        `https://eaqvhxfvozhzatrnbkvx.supabase.co/rest/v1/fuel_prices?select=*&created_at=gte.${startDate}&created_at=lt.${endDate}&order=created_at.asc`,
        {
            headers: {
                apikey: "sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH",
                Authorization: "Bearer sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH"
            }
        }
    )
        .then(res => res.json())
        .then(data => {

            allData = data.map(row => ({
                ...row,
                dateOnly: row.created_at
                    ? new Date(row.created_at)
                        .toISOString()
                        .split("T")[0]
                    : null
            }))

            let regionFilter = document.getElementById("region-filter")
            let cityFilter = document.getElementById("city-filter")
            let stationFilter = document.getElementById("station-filter")

            if (
                regionFilter &&
                cityFilter &&
                stationFilter
            ) {

                populateFilters(
                    allData,
                    regionFilter,
                    cityFilter,
                    stationFilter
                )
            }

            render()

            let todayStr = new Date()
                .toISOString()
                .split("T")[0]

            let todayData = allData.filter(row => {
                return row.dateOnly === todayStr
            })

            renderBestPrices(todayData)

            let title = document.querySelector(".best-prices-section h3")

            if (title) {
                title.textContent =
                    `Най-ниски цени за днес (${todayStr})`
            }
        })
        .catch(err => console.error(err))
}

function renderBestPrices(data) {

    let container = document.getElementById("best-prices")

    if (!container) return

    if (!data.length) {

        container.innerHTML = `
            <div class="empty">
                Няма данни за днес
            </div>
        `

        return
    }

    let stationGroups = {}

    data.forEach(row => {

        let key = `${row.fuel}|${row.station}|${row.city}`

        if (!stationGroups[key]) {

            stationGroups[key] = {
                fuel: row.fuel,
                station: row.station,
                city: row.city,
                sum: 0,
                count: 0
            }
        }

        stationGroups[key].sum += Number(row.price)
        stationGroups[key].count++
    })

    let averages = Object.values(stationGroups).map(s => ({
        fuel: s.fuel,
        station: s.station,
        city: s.city,
        avg: s.sum / s.count
    }))

    let grouped = {}

    averages.forEach(row => {

        if (!grouped[row.fuel]) {
            grouped[row.fuel] = []
        }

        grouped[row.fuel].push(row)
    })

    let html = ""

    Object.keys(grouped).forEach(fuel => {

        let sorted = grouped[fuel]
            .sort((a, b) => a.avg - b.avg)

        if (!sorted.length) return

        let best = sorted[0]

        html += `
            <div class="best-price-card">
                <div class="fuel">${fuel}</div>
                <div class="price">${best.avg.toFixed(2)} €</div>
                <div class="station">${best.station}</div>
                <div class="city">${best.city}</div>
            </div>
        `
    })

    container.innerHTML = html
}

function populateFilters(
    data,
    regionFilter,
    cityFilter,
    stationFilter
) {

    let regionCityMap = {}
    let stations = new Set()

    data.forEach(row => {

        if (row.region && row.city) {

            if (!regionCityMap[row.region]) {
                regionCityMap[row.region] = new Set()
            }

            regionCityMap[row.region].add(row.city)
        }

        if (row.station) {
            stations.add(row.station)
        }
    })

    fillSelect(
        regionFilter,
        Object.keys(regionCityMap),
        "ВСИЧКИ ОБЛАСТИ"
    )

    let allCities = new Set()

    Object.values(regionCityMap).forEach(set => {
        set.forEach(c => allCities.add(c))
    })

    fillSelect(
        cityFilter,
        allCities,
        "ВСИЧКИ ГРАДОВЕ"
    )

    fillSelect(
        stationFilter,
        stations,
        "ВСИЧКИ БЕНЗИНОСТАНЦИИ"
    )

    if (!regionFilter.dataset.bound) {

        regionFilter.addEventListener("change", function () {

            let selectedRegion = this.value

            if (selectedRegion === "all") {

                fillSelect(
                    cityFilter,
                    allCities,
                    "ВСИЧКИ ГРАДОВЕ"
                )

            } else {

                fillSelect(
                    cityFilter,
                    regionCityMap[selectedRegion],
                    "ВСИЧКИ ГРАДОВЕ"
                )
            }

            cityFilter.value = "all"

            render()
        })

        regionFilter.dataset.bound = "true"
    }
}

function fillSelect(select, values, label) {

    select.innerHTML = `
        <option value="all">${label}</option>
    `

    values = [...values].sort()

    values.forEach(v => {

        let option = document.createElement("option")

        option.value = v
        option.textContent = v

        select.appendChild(option)
    })
}

function getFuelClass(fuel) {

    if (fuel === "Бензин A95") return "fuel-a95"
    if (fuel === "Бензин A98") return "fuel-a98"
    if (fuel === "Бензин A100") return "fuel-a100"
    if (fuel === "Дизел") return "fuel-diesel"
    if (fuel === "Дизел премиум") return "fuel-diesel-plus"
    if (fuel === "Пропан Бутан") return "fuel-gas"
    if (fuel === "Метан") return "fuel-methane"

    return "fuel-default"
}

function groupByDate(data) {

    let groups = {}

    dayCounts = {}

    data.forEach(row => {

        if (!row.dateOnly) return

        if (!groups[row.dateOnly]) {

            groups[row.dateOnly] = {
                fuels: new Set(),
                count: 0
            }
        }

        groups[row.dateOnly].count++
        groups[row.dateOnly].fuels.add(row.fuel)
    })

    let events = []

    Object.keys(groups).forEach(date => {

        dayCounts[date] = groups[date].count

        groups[date].fuels.forEach(fuel => {

            events.push({
                title: " ",
                start: date,
                allDay: true,
                classNames: [getFuelClass(fuel)]
            })
        })
    })

    return events
}

function injectFiltersIntoCalendar() {

    if (document.querySelector(".calendar-filters")) return

    let toolbar = document.querySelector(".fc-header-toolbar")

    if (!toolbar) {
        console.error("Toolbar not found")
        return
    }

    let filters = document.createElement("div")

    filters.className = "calendar-filters"

    filters.innerHTML = `
        <select id="region-filter">
            <option value="all">Област</option>
        </select>

        <select id="city-filter">
            <option value="all">Град</option>
        </select>

        <select id="fuel-filter">
            <option value="all">ВСИЧКИ ГОРИВА</option>
            <option value="Бензин A95">A95</option>
            <option value="Бензин A100">A100</option>
            <option value="Дизел">Дизел</option>
            <option value="Дизел премиум">Дизел +</option>
            <option value="Пропан Бутан">Газ</option>
            <option value="Метан">Метан</option>
        </select>

        <select id="station-filter">
            <option value="all">Бензиностанция</option>
        </select>
    `

    toolbar.appendChild(filters)

    if (!filtersInitialized) {

        rebindFilters()

        filtersInitialized = true
    }
}

function rebindFilters() {

    let fuelFilter = document.getElementById("fuel-filter")
    let cityFilter = document.getElementById("city-filter")
    let stationFilter = document.getElementById("station-filter")

    if (fuelFilter) {
        fuelFilter.addEventListener("change", render)
    }

    if (cityFilter) {
        cityFilter.addEventListener("change", render)
    }

    if (stationFilter) {
        stationFilter.addEventListener("change", render)
    }
}

function getFilteredData() {

    let fuelFilter = document.getElementById("fuel-filter")
    let regionFilter = document.getElementById("region-filter")
    let cityFilter = document.getElementById("city-filter")
    let stationFilter = document.getElementById("station-filter")

    return allData.filter(row => {

        return (
            (!fuelFilter || fuelFilter.value === "all" ||
                row.fuel === fuelFilter.value) &&

            (!regionFilter || regionFilter.value === "all" ||
                row.region === regionFilter.value) &&

            (!cityFilter || cityFilter.value === "all" ||
                row.city === cityFilter.value) &&

            (!stationFilter || stationFilter.value === "all" ||
                row.station === stationFilter.value)
        )
    })
}

function render() {

    let filtered = getFilteredData()

    calendar.removeAllEvents()

    let events = groupByDate(filtered)

    calendar.addEventSource(events)

    setTimeout(injectCounts, 0)

    renderChart(filtered)
}

function showDayData(dateStr) {

    let filtered = getFilteredData().filter(row => {
        return row.dateOnly === dateStr
    })

    let modalDate = document.getElementById("modal-date")
    let modal = document.getElementById("day-modal")

    modalDate.textContent = filtered.length
        ? `Цени за ${dateStr}`
        : `Няма данни за ${dateStr}`

    let flatList = []

    let grouped = {}

    filtered.forEach(row => {

        if (!grouped[row.fuel]) {
            grouped[row.fuel] = []
        }

        grouped[row.fuel].push(row)
    })

    Object.keys(grouped).forEach(fuel => {

        grouped[fuel]
            .sort((a, b) => a.price - b.price)

        grouped[fuel]
            .forEach(row => flatList.push({fuel, row}))
    })

    window.currentModalData = flatList

    currentPageTrend = 1

    renderPage()

    modal.classList.add("show")
}

function injectCounts() {

    document
        .querySelectorAll('.fc-daygrid-day')
        .forEach(cell => {

            let date = cell.getAttribute('data-date')

            let frame = cell.querySelector(
                '.fc-daygrid-day-frame'
            )

            if (!frame) return

            let old = frame.querySelector('.day-count')

            if (old) old.remove()

            if (dayCounts[date]) {

                let div = document.createElement('div')

                div.className = 'day-count'

                div.textContent =
                    `Общо ${dayCounts[date]}+`

                frame.appendChild(div)
            }
        })
}

function renderPage() {

    let data = window.currentModalData || []

    let start =
        (currentPageTrend - 1) * itemsPerPageTrend

    let end = start + itemsPerPageTrend

    let pageItems = data.slice(start, end)

    modalList.innerHTML = ""

    let lastFuel = null

    pageItems.forEach(item => {

        if (item.fuel !== lastFuel) {

            let title = document.createElement("h4")

            title.textContent = item.fuel

            modalList.appendChild(title)

            lastFuel = item.fuel
        }

        let div = document.createElement("div")

        div.innerHTML = `
            <div class="modal-row">
                <div>
                    <strong>${item.row.station}</strong><br>
                    <span>${item.row.city}</span>
                </div>

                <div class="price">
                    ${Number(item.row.price).toFixed(2)} €
                </div>
            </div>
        `

        modalList.appendChild(div)
    })

    renderPagination(data.length)
}

function renderPagination(totalItems) {

    paginationEl.innerHTML = ""

    let totalPages = Math.ceil(
        totalItems / itemsPerPageTrend
    )

    for (let i = 1; i <= totalPages; i++) {

        let btn = document.createElement("button")

        btn.textContent = i

        if (i === currentPageTrend) {
            btn.classList.add("active")
        }

        btn.onclick = () => {

            currentPageTrend = i

            renderPage()
        }

        paginationEl.appendChild(btn)
    }
}

function buildChartData(data) {

    let grouped = {}

    data.forEach(row => {

        if (!row.price) return

        if (row.fuel !== selectedFuel) return

        if (!grouped[row.dateOnly]) {

            grouped[row.dateOnly] = {
                sum: 0,
                count: 0
            }
        }

        grouped[row.dateOnly].sum += Number(row.price)

        grouped[row.dateOnly].count++
    })

    let labels = Object.keys(grouped).sort()

    let values = labels.map(date => {

        let g = grouped[date]

        return g.sum / g.count
    })

    return {labels, values}
}

function renderChart(data) {

    let ctx = document.getElementById("price-chart")

    if (!ctx) return

    let {labels, values} = buildChartData(data)

    if (chart) {

        chart.data.labels = labels

        chart.data.datasets[0].data = values

        chart.data.datasets[0].label = selectedFuel

        chart.update()

        return
    }

    chart = new Chart(ctx, {

        type: 'line',

        data: {

            labels: labels,

            datasets: [{
                label: selectedFuel,
                data: values,
                tension: 0.3
            }]
        },

        options: {

            responsive: true,

            plugins: {
                legend: {
                    display: true
                }
            }
        }
    })
}