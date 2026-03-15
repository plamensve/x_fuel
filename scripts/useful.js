let nearestMap
let stations = []

document.addEventListener("DOMContentLoaded", function () {

    initMap()
    loadStations()

    let button = document.getElementById("find-nearest-btn")

    if(button){
        button.addEventListener("click", getUserLocation)
    }

})

function initMap(){

    let mapElement = document.getElementById("nearest-map")

    if(!mapElement) return

    nearestMap = L.map("nearest-map").setView([42.7339, 25.4858], 7)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(nearestMap)

}

function loadStations(){

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

function getUserLocation(){

    if(!navigator.geolocation){

        alert("Вашият браузър не поддържа геолокация.")
        return

    }

    navigator.geolocation.getCurrentPosition(
        locationSuccess,
        locationError
    )

}

function locationSuccess(position){

    let latitude = position.coords.latitude
    let longitude = position.coords.longitude

    nearestMap.setView([latitude, longitude], 12)

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

    stationsWithDistance.sort((a,b)=>a.distance-b.distance)

    let nearest = stationsWithDistance.slice(0,5)

    renderStations(nearest)

    nearest.forEach(st => {

        let icon = getStationIcon(st.name)

        L.marker([st.lat, st.lon], {icon: icon})
            .addTo(nearestMap)
            .bindPopup(st.name + " - " + st.distance.toFixed(2) + " km")

    })

}

function locationError(){

    alert("Не успяхме да получим вашата локация.")

}

function getStationIcon(name){

    let lower = name.toLowerCase()

    if(
        lower.includes("lukoil") ||
        lower.includes("лукойл")
    ){

        return L.icon({
            iconUrl: "../images/station_logos/lukoil.svg",
            iconSize: [40,26],
            iconAnchor: [20,26],
            popupAnchor: [0,-26]
        })

    }

    if(
        lower.includes("omv") ||
        lower.includes("омв")
    ){

        return L.icon({
            iconUrl: "../images/station_logos/omv.svg",
            iconSize: [36,36],
            iconAnchor: [18,36],
            popupAnchor: [0,-36]
        })

    }

    if(
        lower.includes("petrol") ||
        lower.includes("петрол")
    ){

        return L.icon({
            iconUrl: "../images/station_logos/petrol.svg",
            iconSize: [40,26],
            iconAnchor: [20,26],
            popupAnchor: [0,-26]
        })

    }

    if(
        lower.includes("eko") ||
        lower.includes("еко")
    ){

        return L.icon({
            iconUrl: "../images/station_logos/eko.svg",
            iconSize: [40,26],
            iconAnchor: [20,26],
            popupAnchor: [0,-26]
        })

    }

    if(
        lower.includes("rompetrol") ||
        lower.includes("ромпетрол")
    ){

        return L.icon({
            iconUrl: "../images/station_logos/rompetrol.svg",
            iconSize: [40,26],
            iconAnchor: [20,26],
            popupAnchor: [0,-26]
        })

    }

    return L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconSize: [25,41],
        iconAnchor: [12,41],
        popupAnchor: [1,-34]
    })

}

function getDistance(lat1, lon1, lat2, lon2){

    let R = 6371

    let dLat = (lat2 - lat1) * Math.PI / 180
    let dLon = (lon2 - lon1) * Math.PI / 180

    let a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2)

    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c

}

function getStationLogo(name){

    let lower = name.toLowerCase()

    if(
        lower.includes("lukoil") ||
        lower.includes("лукойл")
    ){
        return "../images/station_logos/lukoil.svg"
    }
    if(
        lower.includes("omv") ||
        lower.includes("омв")
    ){
        return "../images/station_logos/omv.svg"
    }
    if(
        lower.includes("petrol") ||
        lower.includes("петрол")
    ){
        return "../images/station_logos/petrol.svg"
    }
    if(
        lower.includes("eko") ||
        lower.includes("еко")
    ){
        return "../images/station_logos/eko.svg"
    }
    if(
        lower.includes("rompetrol") ||
        lower.includes("ромпетрол")
    ){
        return "../images/station_logos/rompetrol.svg"
    }

    return null
}

function renderStations(stations){

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