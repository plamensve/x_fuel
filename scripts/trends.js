let currentPageTrend = 1
let itemsPerPageTrend = 10

let modalList
let paginationEl
let calendar

document.addEventListener("DOMContentLoaded", function () {

    let allData = []

    let fuelFilter = document.getElementById("fuel-filter")
    let regionFilter = document.getElementById("region-filter")
    let cityFilter = document.getElementById("city-filter")
    let stationFilter = document.getElementById("station-filter")

    let modal = document.getElementById("day-modal")
    modalList = document.getElementById("modal-list")
    paginationEl = document.getElementById("pagination")

    let modalDate = document.getElementById("modal-date")
    let closeModal = document.getElementById("close-modal")

    closeModal.onclick = () => modal.classList.remove("show")

    window.onclick = function (e) {
        if (e.target === modal) modal.classList.remove("show")
    }

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") modal.classList.remove("show")
    })

    let calendarEl = document.getElementById("calendar")

    if (!calendarEl) {
        console.error("Calendar element not found")
        return
    }

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        height: 650,
        locale: 'bg',

        eventColor: '#2563eb',

        buttonText: {
            today: 'Днес',
            month: 'Месец'
        },

        dateClick: function (info) {
            showDayData(info.dateStr)
        },

        eventClick: function (info) {
            info.jsEvent.stopPropagation()
            showDayData(info.event.startStr)
        }
    })

    calendar.render()

    loadData()

    function loadData() {
        fetch("https://eaqvhxfvozhzatrnbkvx.supabase.co/rest/v1/fuel_prices?select=*&order=created_at.asc", {
            headers: {
                apikey: "sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH",
                Authorization: "Bearer sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH"
            }
        })
            .then(res => res.json())
            .then(data => {
                allData = data
                populateRegions()
                render()
            })
            .catch(err => console.error("Fetch error:", err))
    }

    function populateRegions() {
        let regions = [...new Set(allData.map(r => r.region))].sort()

        regionFilter.innerHTML = `<option value="all">Всички области</option>`

        regions.forEach(r => {
            let option = document.createElement("option")
            option.value = r
            option.textContent = r
            regionFilter.appendChild(option)
        })
    }

    function populateCities(filtered) {
        let selected = cityFilter.value
        let cities = [...new Set(filtered.map(r => r.city))].sort()

        if (!cities.includes(selected)) selected = "all"

        cityFilter.innerHTML = `<option value="all">Всички градове</option>`

        cities.forEach(c => {
            let option = document.createElement("option")
            option.value = c
            option.textContent = c
            if (c === selected) option.selected = true
            cityFilter.appendChild(option)
        })
    }

    function populateStations(filtered) {
        let selected = stationFilter.value
        let stations = [...new Set(filtered.map(r => r.station))].sort()

        if (!stations.includes(selected)) selected = "all"

        stationFilter.innerHTML = `<option value="all">Всички бензиностанции</option>`

        stations.forEach(s => {
            let option = document.createElement("option")
            option.value = s
            option.textContent = s
            if (s === selected) option.selected = true
            stationFilter.appendChild(option)
        })
    }

    function groupByDate(data) {

        let groups = {}

        let citySelected = cityFilter.value !== "all"
        let stationSelected = stationFilter.value !== "all"

        data.forEach(row => {

            if (!row.created_at) return

            let dateObj = new Date(row.created_at)
            if (isNaN(dateObj)) return

            let date = dateObj.toISOString().split("T")[0]

            let fuel = row.fuel
            let price = parseFloat(row.price)

            if (isNaN(price)) return

            if (!groups[date]) groups[date] = {}
            if (!groups[date][fuel]) groups[date][fuel] = {}

            let key = stationSelected
                ? row.station
                : citySelected
                    ? row.city
                    : row.city + "_" + row.station

            if (!groups[date][fuel][key]) {
                groups[date][fuel][key] = { sum: 0, count: 0 }
            }

            groups[date][fuel][key].sum += price
            groups[date][fuel][key].count++
        })

        let events = []

        Object.keys(groups).forEach(date => {

            Object.keys(groups[date]).forEach(fuel => {

                let entries = groups[date][fuel]

                let totalSum = 0
                let totalCount = 0

                Object.values(entries).forEach(e => {
                    totalSum += (e.sum / e.count)
                    totalCount++
                })

                if (totalCount === 0) return

                let avg = totalSum / totalCount

                events.push({
                    title: `${fuel}: ${avg.toFixed(2)} €`,
                    start: date,
                    allDay: true
                })
            })
        })

        return events
    }

    function getFilteredData() {
        let filtered = [...allData]

        if (fuelFilter.value !== "all")
            filtered = filtered.filter(r => r.fuel === fuelFilter.value)

        if (regionFilter.value !== "all")
            filtered = filtered.filter(r => r.region === regionFilter.value)

        if (cityFilter.value !== "all")
            filtered = filtered.filter(r => r.city === cityFilter.value)

        if (stationFilter.value !== "all")
            filtered = filtered.filter(r => r.station === stationFilter.value)

        return filtered
    }

    function render() {

        let filtered = [...allData]

        if (fuelFilter.value !== "all")
            filtered = filtered.filter(r => r.fuel === fuelFilter.value)

        if (regionFilter.value !== "all")
            filtered = filtered.filter(r => r.region === regionFilter.value)

        populateCities(filtered)

        if (cityFilter.value !== "all")
            filtered = filtered.filter(r => r.city === cityFilter.value)

        populateStations(filtered)

        if (stationFilter.value !== "all")
            filtered = filtered.filter(r => r.station === stationFilter.value)

        let events = groupByDate(filtered)

        calendar.removeAllEvents()

        events.forEach(e => calendar.addEvent(e))
    }

    function showDayData(dateStr) {

        let filtered = getFilteredData().filter(row => {
            let d = new Date(row.created_at).toISOString().split("T")[0]
            return d === dateStr
        })

        modalDate.textContent = filtered.length
            ? "Цени за " + dateStr
            : "Няма данни за " + dateStr

        let flatList = []

        let grouped = {}

        filtered.forEach(row => {
            if (!grouped[row.fuel]) grouped[row.fuel] = []
            grouped[row.fuel].push(row)
        })

        Object.keys(grouped).forEach(fuel => {
            grouped[fuel].sort((a, b) => a.price - b.price)

            grouped[fuel].forEach(row => {
                flatList.push({ fuel, row })
            })
        })

        window.currentModalData = flatList
        currentPageTrend = 1

        renderPage()

        modal.classList.add("show")
    }

    fuelFilter.addEventListener("change", render)
    regionFilter.addEventListener("change", render)
    cityFilter.addEventListener("change", render)
    stationFilter.addEventListener("change", render)
})

function renderPage() {

    let data = window.currentModalData || []

    let start = (currentPageTrend - 1) * itemsPerPageTrend
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

    let totalPages = Math.ceil(totalItems / itemsPerPageTrend)

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