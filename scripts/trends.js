let currentPageTrend = 1
let itemsPerPageTrend = 10

let modalList
let paginationEl
let calendar
let chart

let selectedFuel = "Бензин A95"

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

    window.onclick = function (e) {
        if (e.target === modal) modal.classList.remove("show")
    }

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") modal.classList.remove("show")
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
        dayMaxEvents: 3,

        dateClick: (info) => showDayData(info.dateStr),

        eventClick: (info) => {
            info.jsEvent.preventDefault()
            info.jsEvent.stopPropagation()
            showDayData(info.event.startStr)
        },

        datesSet: () => setTimeout(injectCounts, 0),
        dayCellDidMount: () => setTimeout(injectCounts, 0)
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

            let date = new Date(row.created_at).toISOString().split("T")[0]

            if (!groups[date]) {
                groups[date] = { fuels: new Set(), count: 0 }
            }

            groups[date].count++
            groups[date].fuels.add(row.fuel)
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

        calendar.removeAllEvents()
        groupByDate(filtered).forEach(e => calendar.addEvent(e))

        setTimeout(injectCounts, 0)

        renderChart(filtered)
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
            grouped[fuel].forEach(row => flatList.push({fuel, row}))
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

    // ✅ FIX: buttons трябва да са вътре тук
    let buttons = document.querySelectorAll(".chart-filters button")

    buttons.forEach(btn => {
        btn.addEventListener("click", function(){

            selectedFuel = this.dataset.fuel

            buttons.forEach(b => b.classList.remove("active"))
            this.classList.add("active")

            render()
        })
    })
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

        if (i === currentPageTrend) btn.classList.add("active")

        btn.onclick = () => {
            currentPageTrend = i
            renderPage()
        }

        paginationEl.appendChild(btn)
    }
}

function buildChartData(data){

    let grouped = {}

    data.forEach(row => {

        if (!row.created_at || !row.price) return
        if (row.fuel !== selectedFuel) return

        let date = new Date(row.created_at).toISOString().split("T")[0]

        if(!grouped[date]){
            grouped[date] = {sum:0, count:0}
        }

        grouped[date].sum += Number(row.price)
        grouped[date].count++
    })

    let labels = Object.keys(grouped).sort()

    let values = labels.map(date => {
        let g = grouped[date]
        return g.sum / g.count
    })

    return {labels, values}
}

function renderChart(data){

    let ctx = document.getElementById("price-chart")
    if(!ctx) return

    let {labels, values} = buildChartData(data)

    if(chart) chart.destroy()

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
            responsive:true,
            plugins:{
                legend:{display:true}
            }
        }
    })
}