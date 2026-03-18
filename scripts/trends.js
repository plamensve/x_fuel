let currentPageTrend = 1
let itemsPerPageTrend = 10

let modalList
let paginationEl
let calendar

let dayCounts = {}

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

    let calendarEl = document.getElementById("calendar")

    if (!calendarEl) {
        console.error("Calendar not found")
        return
    }

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        height: 650,
        locale: 'bg',

        dayMaxEvents: 3,

        dateClick: (info) => showDayData(info.dateStr),

        eventClick: (info) => {
            info.jsEvent.stopPropagation()
            showDayData(info.event.startStr)
        },

        datesSet: () => {
            setTimeout(injectCounts, 0)
        },

        dayCellDidMount: () => {
            setTimeout(injectCounts, 0)
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
                render()
            })
            .catch(err => console.error(err))
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

            if (!row.created_at) return

            let dateObj = new Date(row.created_at)
            if (isNaN(dateObj)) return

            let date = dateObj.toISOString().split("T")[0]

            if (!groups[date]) {
                groups[date] = {
                    fuels: new Set(),
                    count: 0
                }
            }

            groups[date].count++
            groups[date].fuels.add(row.fuel)
        })

        let events = []

        Object.keys(groups).forEach(date => {

            let day = groups[date]
            dayCounts[date] = day.count

            day.fuels.forEach(fuel => {

                let className = getFuelClass(fuel)

                events.push({
                    title: " ",
                    start: date,
                    allDay: true,
                    classNames: [className]
                })
            })
        })

        return events
    }

function injectCounts() {

    document.querySelectorAll('.fc-daygrid-day').forEach(cell => {

        let date = cell.getAttribute('data-date')
        let frame = cell.querySelector('.fc-daygrid-day-frame')

        if (!frame) return

        let old = frame.querySelector('.day-count')
        if (old) old.remove()

        if (dayCounts[date]) {

            let div = document.createElement('div')
            div.className = 'day-count'
            div.textContent = "Общо " + dayCounts[date] + "+"

            frame.appendChild(div)
        }
    })
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

        let filtered = getFilteredData()

        let events = groupByDate(filtered)

        calendar.removeAllEvents()

        events.forEach(e => calendar.addEvent(e))

        setTimeout(injectCounts, 0)
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
                flatList.push({fuel, row})
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