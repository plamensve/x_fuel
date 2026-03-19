let nearestMap
let stations = []

document.addEventListener("DOMContentLoaded", function () {

    initMap()
    loadStations()

    let button = document.getElementById("find-nearest-btn")

    if (button) {
        button.addEventListener("click", getUserLocation)
    }

})

function initMap() {

    let mapElement = document.getElementById("nearest-map")

    if (!mapElement) return

    nearestMap = L.map("nearest-map").setView([42.7339, 25.4858], 7)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(nearestMap)

}

function loadStations() {

    fetch("../data/export.geojson")
        .then(response => response.json())
        .then(data => {

            stations = data.features.map(st => {

                return {

                    name: st.properties.name || "Fuel station",
                    lat: st.geometry.coordinates[1],
                    lon: st.geometry.coordinates[0]

                }

            })

            console.log("Stations loaded:", stations.length)

        })

}

function getUserLocation() {

    if (!navigator.geolocation) {

        alert("Вашият браузър не поддържа геолокация.")
        return

    }

    navigator.geolocation.getCurrentPosition(
        locationSuccess,
        locationError
    )

}

function locationSuccess(position) {

    let latitude = position.coords.latitude
    let longitude = position.coords.longitude

    nearestMap.setView([latitude, longitude], 12)

    nearestMap.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            nearestMap.removeLayer(layer)
        }
    })

    let stationsWithDistance = stations.map(st => {

        let distance = getDistance(
            latitude,
            longitude,
            st.lat,
            st.lon
        )

        return {
            ...st,
            distance: distance
        }

    })

    stationsWithDistance.sort((a, b) => a.distance - b.distance)

    let nearest = stationsWithDistance.slice(0, 5)

    renderStations(nearest)

    nearest.forEach(st => {

        let icon = getStationIcon(st.name)

        L.marker([st.lat, st.lon], {icon: icon})
            .addTo(nearestMap)
            .bindPopup(st.name + " - " + st.distance.toFixed(2) + " km")

    })

}

function locationError() {

    alert("Не успяхме да получим вашата локация.")

}



function getDistance(lat1, lon1, lat2, lon2) {

    let R = 6371

    let dLat = (lat2 - lat1) * Math.PI / 180
    let dLon = (lon2 - lon1) * Math.PI / 180

    let a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)

    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c

}

function getStationLogo(name) {

    let lower = name.toLowerCase()

    if (
        lower.includes("lukoil") ||
        lower.includes("лукойл")
    ) {
        return "../images/station_logos/lukoil.svg"
    }
    if (
        lower.includes("omv") ||
        lower.includes("омв")
    ) {
        return "../images/station_logos/omv.svg"
    }
    if (
        lower.includes("petrol") ||
        lower.includes("петрол")
    ) {
        return "../images/station_logos/petrol.svg"
    }
    if (
        lower.includes("eko") ||
        lower.includes("еко")
    ) {
        return "../images/station_logos/eko.svg"
    }
    if (
        lower.includes("rompetrol") ||
        lower.includes("ромпетрол")
    ) {
        return "../images/station_logos/rompetrol.svg"
    }

    return null
}

function renderStations(stations) {

    let container = document.getElementById("nearest-stations-list")

    container.innerHTML = ""

    stations.forEach(st => {

        let logo = getStationLogo(st.name)

        let card = document.createElement("div")

        card.className = "station-card"

        card.innerHTML = `
            <div class="station-header">
                ${logo ? `<img src="${logo}" class="station-logo" alt="station-logo">` : ""}
                <div class="station-name">${st.name}</div>
            </div>

            <div class="station-distance">
                ${st.distance.toFixed(2)} km
            </div>
        `

        container.appendChild(card)

    })

}

let calculateBtn = document.getElementById("calculate-btn")

if (calculateBtn) {

    calculateBtn.addEventListener("click", function () {

        let consumption = parseFloat(document.getElementById("consumption").value)
        let price = parseFloat(document.getElementById("fuel-price").value)
        let distance = parseFloat(document.getElementById("distance").value)

        if (isNaN(consumption) || isNaN(price) || isNaN(distance)) return

        let fuelUsed = (distance * consumption) / 100
        let totalCost = fuelUsed * price

        let pricePer100 = consumption * price
        let pricePerKm = pricePer100 / 100

        let resultBox = document.getElementById("fuel-result")

        resultBox.innerHTML = `
        Гориво необходимо: <strong>${fuelUsed.toFixed(2)} Л.</strong><br>
        Цена на пътуването: <strong>${totalCost.toFixed(2)} €</strong><br><br>

        Цена за 100 км: <strong>${pricePer100.toFixed(2)} €</strong><br>
        Цена за 1 км: <strong>${pricePerKm.toFixed(2)} €</strong>
        `

        resultBox.classList.add("show")

    })

}


async function geocode(city) {

    let url =
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=bg&q=${city}`

    let response = await fetch(url, {
        headers: {
            "Accept": "application/json"
        }
    })

    let data = await response.json()

    return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
    }

}































