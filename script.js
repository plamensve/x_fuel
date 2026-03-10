document.addEventListener("DOMContentLoaded", function () {

    let today = new Date()

    let options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    }

    let dateElement = document.getElementById("current-date")

    if (dateElement) {
        dateElement.textContent = today.toLocaleDateString("bg-BG", options)
    }

    const form = document.getElementById("fuel-form")
    const message = document.getElementById("success-message")

    const regionSelect = document.getElementById("region-select")
    const citySelect = document.getElementById("city-select")

    let allPrices = []

    /* MESSAGE */

    function showMessage(text, type) {

        message.textContent = text
        message.className = "success-message " + type
        message.classList.add("show")

        setTimeout(function () {
            message.classList.remove("show")
        }, 3000)

    }

    /* LOAD DATA */

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

    /* REGIONS */

    function populateRegions() {

        let regions = [...new Set(allPrices.map(r => r.region))].sort()

        regionSelect.innerHTML = `<option value="all">Всички области</option>`

        regions.forEach(region => {

            let option = document.createElement("option")
            option.value = region
            option.textContent = region

            regionSelect.appendChild(option)

        })

    }

    /* CITIES */

    function populateCities(data) {

        let cities = [...new Set(data.map(r => r.city))].sort()

        citySelect.innerHTML = `<option value="all">Всички градове</option>`

        cities.forEach(city => {

            let option = document.createElement("option")
            option.value = city
            option.textContent = city
            citySelect.appendChild(option)

        })

    }

    /* BEST PRICES */

    function calculateBestPrices(data) {

        let fuels = {}

        data.forEach(row => {

            if (!fuels[row.fuel]) {
                fuels[row.fuel] = row
                return
            }

            if (row.price < fuels[row.fuel].price) {
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
<span class="best-price-value">${Number(row.price).toFixed(2)} €</span>
`

            container.appendChild(div)

        })

    }

    /* RENDER TABLE */

    function renderPrices() {

        let body = document.getElementById("prices-body")
        body.innerHTML = ""

        let filtered = [...allPrices]

        let region = regionSelect.value

        if (region !== "all") {
            filtered = filtered.filter(r => r.region === region)
        }

        populateCities(filtered)

        let city = citySelect.value

        if (city !== "all") {
            filtered = filtered.filter(r => r.city === city)
        }

        let grouped = {}

        filtered.forEach(row => {

            if (!grouped[row.station]) {

                grouped[row.station] = {
                    "A95": "-",
                    "A98": "-",
                    "Дизел": "-",
                    "Газ": "-",
                    "Метан": "-"
                }

            }

            if (row.fuel === "Бензин A95") grouped[row.station]["A95"] = Number(row.price).toFixed(2)
            if (row.fuel === "Бензин A98") grouped[row.station]["A98"] = Number(row.price).toFixed(2)
            if (row.fuel === "Дизел") grouped[row.station]["Дизел"] = Number(row.price).toFixed(2)
            if (row.fuel === "Газ") grouped[row.station]["Газ"] = Number(row.price).toFixed(2)
            if (row.fuel === "Метан") grouped[row.station]["Метан"] = Number(row.price).toFixed(2)

        })

        Object.keys(grouped).forEach(station => {

            let fuels = grouped[station]

            let row = document.createElement("tr")

            row.innerHTML = `
<td>${station}</td>
<td>${fuels["A95"]}</td>
<td>${fuels["A98"]}</td>
<td>${fuels["Дизел"]}</td>
<td>${fuels["Газ"]}</td>
<td>${fuels["Метан"]}</td>
`

            body.appendChild(row)

        })

        calculateBestPrices(filtered)

    }

    /* EVENTS */

    regionSelect.addEventListener("change", renderPrices)
    citySelect.addEventListener("change", renderPrices)

    /* FORM */

    if (form) {

        form.addEventListener("submit", function (e) {

            e.preventDefault()

            let region = document.getElementById("region").value
            let city = document.getElementById("city").value.trim()

            let station = document.getElementById("station").value
            let fuelElement = document.querySelector('input[name="fuel"]:checked')
            let price = parseFloat(document.getElementById("price").value)

            if (!region || !station || !fuelElement || !price) {

                showMessage("Моля попълнете всички полета.", "error")
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