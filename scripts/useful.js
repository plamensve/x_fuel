let nearestMap
let stations = []
let nearestMarkers = []

document.addEventListener("DOMContentLoaded", function () {
    initMap()
    loadStations()

    const button = document.getElementById("find-nearest-btn")
    if (button) button.addEventListener("click", getUserLocation)

    const resetButton = document.getElementById("calculator-reset")
    if (resetButton) resetButton.addEventListener("click", resetCalculator)
})

function initMap() {
    const mapElement = document.getElementById("nearest-map")
    if (!mapElement) return

    nearestMap = L.map("nearest-map", { preferCanvas: true }).setView([42.7339, 25.4858], 7)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(nearestMap)
}

function loadStations() {
    setNearestStatus("Зареждаме базата с бензиностанции…", "loading")

    fetch("../data/export.geojson")
        .then(response => {
            if (!response.ok) throw new Error("Stations request failed")
            return response.json()
        })
        .then(data => {
            stations = (data.features || [])
                .filter(st => st?.geometry?.coordinates?.length >= 2)
                .map(st => ({
                    name: st.properties?.name || st.properties?.brand || "Бензиностанция",
                    brand: st.properties?.brand || "",
                    city: st.properties?.["addr:city"] || st.properties?.["addr:place"] || "",
                    lat: Number(st.geometry.coordinates[1]),
                    lon: Number(st.geometry.coordinates[0])
                }))
                .filter(st => Number.isFinite(st.lat) && Number.isFinite(st.lon))

            setNearestStatus(`Заредени са ${stations.length.toLocaleString("bg-BG")} бензиностанции. Готово за търсене.`, "ready")
        })
        .catch(() => {
            setNearestStatus("Не успяхме да заредим бензиностанциите. Опитай отново след малко.", "error")
        })
}

function getUserLocation() {
    if (!navigator.geolocation) {
        setNearestStatus("Браузърът ти не поддържа геолокация.", "error")
        return
    }

    if (!stations.length) {
        setNearestStatus("Базата с бензиностанции още се зарежда. Опитай след секунда.", "loading")
        return
    }

    const button = document.getElementById("find-nearest-btn")
    if (button) {
        button.disabled = true
        button.textContent = "Определяме локацията…"
    }

    setNearestStatus("Изчакваме разрешение за достъп до локацията…", "loading")

    navigator.geolocation.getCurrentPosition(locationSuccess, locationError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
    })
}

function locationSuccess(position) {
    const latitude = position.coords.latitude
    const longitude = position.coords.longitude

    clearNearestMarkers()
    nearestMap.setView([latitude, longitude], 12)

    const userMarker = L.circleMarker([latitude, longitude], {
        radius: 8,
        color: "#2563eb",
        fillColor: "#60a5fa",
        fillOpacity: 1,
        weight: 3
    }).addTo(nearestMap).bindPopup("Твоята локация")
    nearestMarkers.push(userMarker)

    const nearest = stations
        .map(st => ({...st, distance: getDistance(latitude, longitude, st.lat, st.lon)}))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5)

    renderStations(nearest)

    nearest.forEach(st => {
        const icon = getStationIcon(st.name || st.brand)
        const marker = L.marker([st.lat, st.lon], {icon})
            .addTo(nearestMap)
            .bindPopup(`<strong>${escapeHtml(st.name)}</strong><br>${st.distance.toFixed(2)} km${st.city ? `<br>${escapeHtml(st.city)}` : ""}`)
        nearestMarkers.push(marker)
    })

    const bounds = L.latLngBounds([[latitude, longitude], ...nearest.map(st => [st.lat, st.lon])])
    nearestMap.fitBounds(bounds, {padding: [35, 35], maxZoom: 13})

    setNearestStatus(`Показваме 5-те най-близки станции. Най-близката е на ${nearest[0]?.distance.toFixed(2) || "—"} km.`, "ready")
    restoreNearestButton()
}

function locationError(error) {
    let message = "Не успяхме да получим локацията ти."
    if (error?.code === 1) message = "Достъпът до локацията е отказан. Разреши го от настройките на браузъра и опитай отново."
    if (error?.code === 2) message = "Локацията не е налична в момента."
    if (error?.code === 3) message = "Определянето на локацията отне твърде дълго. Опитай отново."
    setNearestStatus(message, "error")
    restoreNearestButton()
}

function restoreNearestButton() {
    const button = document.getElementById("find-nearest-btn")
    if (button) {
        button.disabled = false
        button.textContent = "⌖ Използвай моята локация"
    }
}

function clearNearestMarkers() {
    nearestMarkers.forEach(marker => nearestMap?.removeLayer(marker))
    nearestMarkers = []
}

function setNearestStatus(text, type = "ready") {
    const el = document.getElementById("nearest-status")
    if (!el) return
    el.dataset.state = type
    el.innerHTML = `<span class="status-dot"></span>${escapeHtml(text)}`
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

function getStationLogo(name) {
    const lower = String(name || "").toLowerCase()

    if (lower.includes("еко петрол") || lower.includes("ecopetrol")) return "../images/station_logos/ecopetrol.svg"
    if (lower.includes("бенита") || lower.includes("benita")) return "../images/station_logos/benita.svg"
    if (lower.includes("lukoil") || lower.includes("лукойл")) return "../images/station_logos/lukoil.svg"
    if (lower.includes("omv") || lower.includes("омв")) return "../images/station_logos/omv.svg"
    if (lower.includes("shell") || lower.includes("шел")) return "../images/station_logos/shell.svg"
    if (lower.includes("rompetrol") || lower.includes("ромпетрол")) return "../images/station_logos/rompetrol.svg"
    if (lower.includes("insa") || lower.includes("инса")) return "../images/station_logos/insa.svg"
    if (lower.includes("kruiz") || lower.includes("круиз")) return "../images/station_logos/kruiz.svg"
    if (lower.includes("bulmarket") || lower.includes("булмаркет")) return "../images/station_logos/bulmarket.svg"
    if (lower.includes("dieselor") || lower.includes("diselor") || lower.includes("дизелор")) return "../images/station_logos/diselor.svg"
    if (lower.includes("himoil") || lower.includes("химойл")) return "../images/station_logos/himoil.svg"
    if (lower.includes("petrol") || lower.includes("петрол")) return "../images/station_logos/petrol.svg"
    if (lower.includes("eko") || lower.includes("еко")) return "../images/station_logos/eko.svg"

    return "../images/station_logos/unknown.svg"
}

function renderStations(items) {
    const container = document.getElementById("nearest-stations-list")
    const count = document.getElementById("nearest-count")
    if (!container) return

    if (count) count.textContent = `${items.length} станции`
    container.innerHTML = ""

    items.forEach((st, index) => {
        const logo = getStationLogo(st.name || st.brand)
        const card = document.createElement("button")
        card.type = "button"
        card.className = "station-card"
        card.innerHTML = `
            <div class="station-header">
                <img src="${logo}" class="station-logo" alt="" onerror="this.src='../images/station_logos/unknown.svg'">
                <div>
                    <div class="station-name">${escapeHtml(st.name)}</div>
                    ${st.city ? `<div class="station-city">${escapeHtml(st.city)}</div>` : ""}
                </div>
            </div>
            <div class="station-distance">${st.distance.toFixed(2)} km</div>
        `

        card.addEventListener("click", () => {
            nearestMap.setView([st.lat, st.lon], 16)
            const marker = nearestMarkers[index + 1]
            if (marker?.openPopup) marker.openPopup()
        })

        container.appendChild(card)
    })
}

const calculateBtn = document.getElementById("calculate-btn")
if (calculateBtn) {
    calculateBtn.addEventListener("click", function () {
        const consumption = parseFloat(document.getElementById("consumption")?.value)
        const price = parseFloat(document.getElementById("fuel-price")?.value)
        const distance = parseFloat(document.getElementById("distance")?.value)
        const resultBox = document.getElementById("fuel-result")

        if (!resultBox) return

        if (![consumption, price, distance].every(value => Number.isFinite(value) && value > 0)) {
            resultBox.classList.add("show")
            resultBox.innerHTML = `<div class="result-placeholder"><span>!</span><strong>Попълни валидни стойности</strong><p>Всички полета трябва да съдържат положителни числа.</p></div>`
            return
        }

        const fuelUsed = (distance * consumption) / 100
        const totalCost = fuelUsed * price
        const pricePer100 = consumption * price
        const pricePerKm = pricePer100 / 100

        resultBox.classList.add("show")
        resultBox.innerHTML = `
            <div class="result-grid">
                <div class="result-item"><span>Необходимо гориво</span><strong>${fuelUsed.toFixed(2)} л</strong></div>
                <div class="result-item primary"><span>Обща цена</span><strong>${totalCost.toFixed(2)} €</strong></div>
                <div class="result-item"><span>Цена за 100 км</span><strong>${pricePer100.toFixed(2)} €</strong></div>
                <div class="result-item"><span>Цена за 1 км</span><strong>${pricePerKm.toFixed(3)} €</strong></div>
            </div>
        `
    })
}

function resetCalculator() {
    ;["consumption", "fuel-price", "distance"].forEach(id => {
        const input = document.getElementById(id)
        if (input) input.value = ""
    })

    const result = document.getElementById("fuel-result")
    if (result) {
        result.classList.remove("show")
        result.innerHTML = `<div class="result-placeholder"><span>€</span><strong>Резултатът ще се появи тук</strong><p>Ще видиш необходимите литри, общата цена, цена за 100 км и цена за 1 км.</p></div>`
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
}
