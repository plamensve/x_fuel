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

    let allPrices = []

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

    function calculateBestPrices(data) {

        let fuels = {}

        data.forEach(row => {

            if (!fuels[row.fuel]) {
                fuels[row.fuel] = row
                return
            }

            if (Number(row.avg_price) < Number(fuels[row.fuel].avg_price)) {
                fuels[row.fuel] = row
            }

        })

        let container = document.getElementById("best-prices-container")

        container.innerHTML = ""

        Object.values(fuels).forEach(row => {

            let div = document.createElement("div")

            div.className = "best-price-row"

            div.innerHTML = `
<span class="best-price-fuel">${row.fuel}</span>
<span>${row.station} – ${row.city}</span>
<span class="best-price-value">${row.avg_price} €</span>
`

            container.appendChild(div)

        })

    }

    function calculateAveragePrices(data) {

        let groups = {}

        data.forEach(row => {

            let key = row.city + "_" + row.station + "_" + row.fuel

            if (!groups[key]) {
                groups[key] = {
                    city: row.city,
                    station: row.station,
                    fuel: row.fuel,
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
                avg_price: (g.sum / g.count).toFixed(2)
            })

        })

        return averages
    }

    function renderPrices() {

        let body = document.getElementById("prices-body")
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

        let averages = calculateAveragePrices(filtered)

        let grouped = {}

        averages.forEach(row => {

            let key = row.city + "_" + row.station

            if (!grouped[key]) {

                grouped[key] = {
                    city: row.city,
                    station: row.station,
                    "A95": "-",
                    "A98": "-",
                    "Дизел": "-",
                    "Пропан Бутан": "-",
                    "Метан": "-"
                }

            }

            if (row.fuel === "Бензин A95") grouped[key]["A95"] = row.avg_price
            if (row.fuel === "Бензин A98") grouped[key]["A98"] = row.avg_price
            if (row.fuel === "Дизел") grouped[key]["Дизел"] = row.avg_price
            if (row.fuel === "Пропан Бутан") grouped[key]["Пропан Бутан"] = row.avg_price
            if (row.fuel === "Метан") grouped[key]["Метан"] = row.avg_price

        })

        Object.values(grouped).forEach(item => {

            let row = document.createElement("tr")

            row.innerHTML = `
<td>${item.station} – ${item.city}</td>
<td>${item["A95"]}</td>
<td>${item["A98"]}</td>
<td>${item["Дизел"]}</td>
<td>${item["Пропан Бутан"]}</td>
<td>${item["Метан"]}</td>
`

            body.appendChild(row)

        })

        calculateBestPrices(averages)

    }

    regionSelect.addEventListener("change", renderPrices)
    citySelect.addEventListener("change", renderPrices)

    if (form) {

        form.addEventListener("submit", function (e) {

            e.preventDefault()

            let region = document.getElementById("region").value
            let city = document.getElementById("city").value.trim().toUpperCase()

            let station = document.getElementById("station").value
            let fuelElement = document.querySelector('input[name="fuel"]:checked')

            let rawPrice = document.getElementById("price").value.trim()
            rawPrice = rawPrice.replace(",", ".")

            let price = parseFloat(rawPrice)

            if (!region || !station || !fuelElement || isNaN(price)) {

                showMessage("Моля попълнете всички полета.", "error")
                return

            }

            if (price < 0.2 || price > 5) {

                showMessage("Моля въведете валидна цена.", "error")
                return

            }

            let fuel = fuelElement.value

            fetch("https://eaqvhxfvozhzatrnbkvx.supabase.co/rest/v1/fuel_prices", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    apikey: "sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH",
                    Authorization: "Bearer sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH"
                },

                body: JSON.stringify({
                    region: region,
                    city: city,
                    station: station,
                    fuel: fuel,
                    price: price
                })

            })
                .then(() => {

                    showMessage("✔ Благодарим! Цената беше записана.", "success")

                    form.reset()

                    loadPrices()

                })

        })

    }

    loadPrices()

})



let themeToggle = document.getElementById("theme-toggle")

if(localStorage.getItem("theme") === "light"){
    document.body.classList.add("light")
    themeToggle.textContent = "☀️"
}else{
    themeToggle.textContent = "🌙"
}

themeToggle.addEventListener("click", function(){

    document.body.classList.toggle("light")

    if(document.body.classList.contains("light")){

        localStorage.setItem("theme","light")
        themeToggle.textContent = "☀️"

    }else{

        localStorage.setItem("theme","dark")
        themeToggle.textContent = "🌙"

    }

})

let menuToggle = document.querySelector(".menu-toggle")
let nav = document.querySelector(".nav-container")

menuToggle.addEventListener("click", function(){
    nav.classList.toggle("active")
})