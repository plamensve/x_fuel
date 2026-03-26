let currentPage = 1
let rowsPerPage = 5

let map
let marker

document.addEventListener("DOMContentLoaded", function () {

    let today = new Date()

    let todayISO =
        today.getFullYear() + "-" +
        String(today.getMonth() + 1).padStart(2, "0") + "-" +
        String(today.getDate()).padStart(2, "0")

    function isToday(row) {

        if (!row.created_at) return false

        let rowDate = new Date(row.created_at)

        let rowDateLocal =
            rowDate.getFullYear() + "-" +
            String(rowDate.getMonth() + 1).padStart(2, "0") + "-" +
            String(rowDate.getDate()).padStart(2, "0")

        return rowDateLocal === todayISO

    }

    let options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    }

    let dateElement = document.getElementById("current-date")
    let pricesDate = document.getElementById("prices-date")

    if (dateElement) {
        dateElement.textContent = today.toLocaleDateString("bg-BG", options)
    }

    if (pricesDate) {
        pricesDate.textContent = " (" + today.toLocaleDateString("bg-BG") + ")"
    }

    const form = document.getElementById("fuel-form")
    const message = document.getElementById("success-message")

    const regionSelect = document.getElementById("region-select")
    const citySelect = document.getElementById("city-select")
    const stationSelect = document.getElementById("station-select")

    let allPrices = []

    let cityCoords = {
        "БЛАГОЕВГРАД": [42.0209, 23.0943],
        "БУРГАС": [42.5048, 27.4626],
        "ВАРНА": [43.2141, 27.9147],
        "ВЕЛИКО ТЪРНОВО": [43.0757, 25.6172],
        "ВИДИН": [43.9900, 22.8725],
        "ВРАЦА": [43.2102, 23.5626],
        "ГАБРОВО": [42.8747, 25.3342],
        "ДОБРИЧ": [43.5667, 27.8333],
        "КЪРДЖАЛИ": [41.6500, 25.3667],
        "КЮСТЕНДИЛ": [42.2833, 22.6833],
        "ЛОВЕЧ": [43.1360, 24.7140],
        "МОНТАНА": [43.4083, 23.2250],
        "ПАЗАРДЖИК": [42.1928, 24.3336],
        "ПЕРНИК": [42.6050, 23.0340],
        "ПЛЕВЕН": [43.4170, 24.6067],
        "ПЛОВДИВ": [42.1354, 24.7453],
        "РАЗГРАД": [43.5333, 26.5167],
        "РУСЕ": [43.8356, 25.9657],
        "СИЛИСТРА": [44.1167, 27.2667],
        "СЛИВЕН": [42.6818, 26.3220],
        "СМОЛЯН": [41.5774, 24.7128],
        "СОФИЯ": [42.6977, 23.3219],
        "СОФИЯ ОБЛАСТ": [42.6977, 23.3219],
        "СТАРА ЗАГОРА": [42.4258, 25.6345],
        "ТЪРГОВИЩЕ": [43.2512, 26.5721],
        "ХАСКОВО": [41.9344, 25.5550],
        "ШУМЕН": [43.2712, 26.9361],
        "ЯМБОЛ": [42.4840, 26.5030]
    }

    function showMessage(text, type) {

        message.textContent = text
        message.className = "success-message " + type
        message.classList.add("show")

        setTimeout(function () {
            message.classList.remove("show")
        }, 3000)

    }

    function loadPrices() {

        fetch("https://eaqvhxfvozhzatrnbkvx.supabase.co/rest/v1/fuel_prices?select=*&order=created_at.desc&limit=200", {

            headers: {
                apikey: "sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH",
                Authorization: "Bearer sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH"
            }

        })
            .then(res => res.json())
            .then(data => {

                allPrices = data

                populateRegions()
                renderPrices()

            })

    }

    function populateRegions() {

        let todayData = allPrices.filter(isToday)

        let regions = [...new Set(todayData.map(r => r.region))].sort()

        regionSelect.innerHTML = `<option value="all">Всички области</option>`

        regions.forEach(region => {

            let option = document.createElement("option")
            option.value = region
            option.textContent = region

            regionSelect.appendChild(option)

        })

    }

    function populateCities(data, selectedCity = "all") {

        let cities = [...new Set(data.map(r => r.city))].sort()

        citySelect.innerHTML = `<option value="all">Всички градове</option>`

        cities.forEach(city => {

            let option = document.createElement("option")
            option.value = city
            option.textContent = city

            if (city === selectedCity) {
                option.selected = true
            }

            citySelect.appendChild(option)

        })

    }

    function populateStations(data, selectedStation = "all") {

        let stations = [...new Set(data.map(r => r.station))].sort()

        stationSelect.innerHTML = `<option value="all">Всички бензиностанции</option>`

        stations.forEach(st => {

            let option = document.createElement("option")
            option.value = st
            option.textContent = st

            if (st === selectedStation) {
                option.selected = true
            }

            stationSelect.appendChild(option)

        })

    }

    function normalizeLocation(loc) {
        return (loc || "")
            .toUpperCase()
            .trim()
    }

    function calculateAveragePrices(data) {

        let groups = {}

        data.forEach(row => {

            let loc = normalizeLocation(row.location)

            let key = row.city + "_" + row.station + "_" + row.fuel + "_" + loc

            if (!groups[key]) {
                groups[key] = {
                    city: row.city,
                    station: row.station,
                    fuel: row.fuel,
                    location: loc || null,
                    sum: 0,
                    count: 0
                }
            }

            let price = Number(row.price)

            if (!isNaN(price)) {
                groups[key].sum += price
                groups[key].count += 1
            }

        })

        let averages = []

        Object.values(groups).forEach(g => {

            averages.push({
                city: g.city,
                station: g.station,
                fuel: g.fuel,
                location: g.location,
                avg_price: (g.sum / g.count).toFixed(2)
            })

        })

        return averages
    }

    function renderPagination(totalPages) {

        let container = document.getElementById("pagination")
        if (!container) return

        container.innerHTML = ""

        // PREV
        let prev = document.createElement("button")
        prev.textContent = "←"
        prev.disabled = currentPage === 1

        prev.addEventListener("click", function () {
            currentPage--
            renderPrices()
        })

        container.appendChild(prev)

        let maxVisible = 5
        let start = Math.max(1, currentPage - 2)
        let end = Math.min(totalPages, currentPage + 2)

        // fix when near edges
        if (currentPage <= 3) {
            start = 1
            end = Math.min(5, totalPages)
        }

        if (currentPage >= totalPages - 2) {
            start = Math.max(1, totalPages - 4)
            end = totalPages
        }

        // FIRST + ...
        if (start > 1) {

            let first = document.createElement("button")
            first.textContent = 1

            first.addEventListener("click", function () {
                currentPage = 1
                renderPrices()
            })

            container.appendChild(first)

            let dots = document.createElement("span")
            dots.textContent = "..."
            container.appendChild(dots)
        }

        // MIDDLE PAGES
        for (let i = start; i <= end; i++) {

            let btn = document.createElement("button")
            btn.textContent = i

            if (i === currentPage) {
                btn.classList.add("active-page")
            }

            btn.addEventListener("click", function () {
                currentPage = i
                renderPrices()
            })

            container.appendChild(btn)
        }

        // ... + LAST
        if (end < totalPages) {

            let dots = document.createElement("span")
            dots.textContent = "..."
            container.appendChild(dots)

            let last = document.createElement("button")
            last.textContent = totalPages

            last.addEventListener("click", function () {
                currentPage = totalPages
                renderPrices()
            })

            container.appendChild(last)
        }

        // NEXT
        let next = document.createElement("button")
        next.textContent = "→"
        next.disabled = currentPage === totalPages

        next.addEventListener("click", function () {
            currentPage++
            renderPrices()
        })

        container.appendChild(next)
    }

    function renderPrices() {

        let body = document.getElementById("prices-body")

        if (!body) return

        body.innerHTML = ""

        let filtered = [...allPrices]

        filtered = filtered.filter(isToday)

        let region = regionSelect.value

        if (region !== "all") {
            filtered = filtered.filter(r => r.region === region)
        }

        let selectedCity = citySelect.value

        populateCities(filtered, selectedCity)

        if (selectedCity !== "all") {
            filtered = filtered.filter(r => r.city === selectedCity)
        }

        populateStations(filtered)

        let selectedStation = stationSelect.value

        if (selectedStation !== "all") {
            filtered = filtered.filter(r => r.station === selectedStation)
        }

        let averages = calculateAveragePrices(filtered)

        let grouped = {}

        averages.forEach(row => {

            let loc = normalizeLocation(row.location)

            let key = row.city + "_" + row.station + "_" + loc

            if (!grouped[key]) {

                grouped[key] = {
                    city: row.city,
                    station: row.station,
                    location: loc || "-",
                    "A95": "-",
                    "A100": "-",
                    "Дизел": "-",
                    "Дизел +": "-",
                    "Пропан Бутан": "-",
                    "Метан": "-"
                }

            } else {

                if (!grouped[key].location && row.location) {
                    grouped[key].location = row.location
                }

            }

            if (row.fuel === "Бензин A95") grouped[key]["A95"] = row.avg_price
            if (row.fuel === "Бензин A100") grouped[key]["A100"] = row.avg_price
            if (row.fuel === "Дизел") grouped[key]["Дизел"] = row.avg_price
            if (row.fuel === "Дизел премиум") grouped[key]["Дизел +"] = row.avg_price
            if (row.fuel === "Пропан Бутан") grouped[key]["Пропан Бутан"] = row.avg_price
            if (row.fuel === "Метан") grouped[key]["Метан"] = row.avg_price

        })

        let items = Object.values(grouped)

        let totalPages = Math.ceil(items.length / rowsPerPage)

        if (currentPage > totalPages) {
            currentPage = 1
        }

        let start = (currentPage - 1) * rowsPerPage
        let end = start + rowsPerPage

        let pageItems = items.slice(start, end)

        pageItems.forEach(item => {

            let row = document.createElement("tr")

            row.innerHTML = `
<td>${item.station} – ${item.city}</td>
<td>${item.location || "-"}</td>
<td>${item["A95"]}</td>
<td>${item["A100"]}</td>
<td>${item["Дизел"]}</td>
<td>${item["Дизел +"]}</td>
<td>${item["Пропан Бутан"]}</td>
<td>${item["Метан"]}</td>
`

            body.appendChild(row)

        })

        if (typeof renderPagination === "function") {
            renderPagination(totalPages)
        }

    }

    function updateMap(city) {

        if (!map || !marker) return

        let cityUpper = city.toUpperCase()

        if (cityCoords[cityUpper]) {

            let coords = cityCoords[cityUpper]

            map.setView(coords, 12)

            marker.setLatLng(coords)

            marker.bindPopup("Цени на горивата в " + city).openPopup()

        }

    }

    if (regionSelect) {
        regionSelect.addEventListener("change", renderPrices)
    }

    if (citySelect) {

        citySelect.addEventListener("change", function () {

            renderPrices()

            let city = citySelect.value

            if (city !== "all") {
                updateMap(city)
            }

        })

    }
    if (stationSelect) {
        stationSelect.addEventListener("change", function () {
            currentPage = 1
            renderPrices()
        })
    }

    if (regionSelect && citySelect) {
        loadPrices()
    }

    if (form) {

        form.addEventListener("submit", function (e) {

            e.preventDefault()

            let region = document.getElementById("region").value
            let city = document.getElementById("city").value.trim().toUpperCase()
            let station = document.getElementById("station").value

            let fuelElement = document.querySelector('input[name="fuel"]:checked')

            let price = parseFloat(
                document.getElementById("price").value.replace(",", ".")
            )

            let location = document.getElementById("location").value.trim().toUpperCase()

            if (!region || !city || !station || !fuelElement || !price) {

                showMessage("Моля попълнете всички полета.", "error")
                return

            }

            let fuel = fuelElement.value

            fetch("https://eaqvhxfvozhzatrnbkvx.supabase.co/rest/v1/fuel_prices", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    apikey: "sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH",
                    Authorization: "Bearer sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH",
                    Prefer: "return=minimal"
                },

                body: JSON.stringify({
                    region: region,
                    city: city,
                    station: station,
                    fuel: fuel,
                    price: price,
                    location: location || null
                })

            })

                .then(res => {

                    if (!res.ok) {
                        throw new Error("Insert failed")
                    }

                    showMessage("Цената беше изпратена успешно.", "success")

                    form.reset()

                    loadPrices()

                })

                .catch(err => {

                    showMessage("Грешка при изпращане.", "error")

                })

        })

    }

    /* FUEL MAP */

    let fuelMapElement = document.getElementById("fuel-map")

    if (fuelMapElement) {

        map = L.map('fuel-map').setView([42.7339, 25.4858], 7)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map)

        marker = L.marker([42.7339, 25.4858]).addTo(map)

        marker.bindPopup("Изберете град за да видите цените")

    }

    /* STATION MAP */

    let stationMapElement = document.getElementById("station-map")

    if (stationMapElement) {

        let stationMap = L.map("station-map", {
            preferCanvas: true
        }).setView([42.7339, 25.4858], 7)

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(stationMap)

        fetch("data/export.geojson")
            .then(res => res.json())
            .then(data => {

                let markers = L.markerClusterGroup()

                let geo = L.geoJSON(data, {
                    pointToLayer: function (feature, latlng) {

                        let name = feature.properties.name || ""

                        let icon = getStationIcon(name)

                        return L.marker(latlng, {icon: icon})
                    }
                })

                markers.addLayer(geo)

                stationMap.addLayer(markers)

            })

    }

    let themeButton = document.getElementById("theme-toggle")

    if (themeButton) {

        themeButton.addEventListener("click", function () {

            let body = document.body

            body.classList.toggle("light-theme")

            if (body.classList.contains("light-theme")) {
                themeButton.textContent = "☀️"
            } else {
                themeButton.textContent = "🌙"
            }

        })

    }

    let menuButton = document.getElementById("menu-toggle")
    let menu = document.getElementById("nav-menu")

    if (menuButton && menu) {

        menuButton.addEventListener("click", function () {

            menu.classList.toggle("open")

        })

    }

    let cityInput = document.getElementById("city")

    if (cityInput) {
        cityInput.addEventListener("input", function () {

            let value = cityInput.value

            // auto-clean
            cityInput.value = value.replace(/[^А-Яа-я\s\-]/g, "")

            let regex = /^[А-Яа-я\s\-]+$/

            if (!regex.test(cityInput.value)) {
                cityInput.setCustomValidity("Моля използвайте само български букви")
            } else {
                cityInput.setCustomValidity("")
            }

        })
    }
})


