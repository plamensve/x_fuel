let chartInstance = null
let weatherMap = null
let weatherMarker = null

function translateWeather(desc) {
    let dictionary = {
        "clear sky": "Ясно",
        "few clouds": "Лека облачност",
        "scattered clouds": "Разкъсана облачност",
        "broken clouds": "Облачно",
        "overcast clouds": "Плътна облачност",
        "rain": "Дъжд",
        "light rain": "Слаб дъжд",
        "moderate rain": "Умерен дъжд",
        "thunderstorm": "Буря",
        "snow": "Сняг"
    }
    return dictionary[desc] || desc
}

/* =========================
   MAP
========================= */
function initMap(lat = 42.7339, lon = 25.4858) {

    if (!weatherMap) {
        weatherMap = L.map('map').setView([lat, lon], 7)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(weatherMap)
    } else {
        weatherMap.setView([lat, lon], 9)
    }

    if (weatherMarker) {
        weatherMarker.setLatLng([lat, lon])
    } else {
        weatherMarker = L.marker([lat, lon]).addTo(weatherMap)
    }
}

/* =========================
   LOAD WEATHER
========================= */
function loadWeather(city = null, lat = null, lon = null) {

    let query = ""

    if (city) {
        query = `city=${encodeURIComponent(city)}`
    } else if (lat && lon) {
        query = `lat=${lat}&lon=${lon}`
    } else {
        let input = document.getElementById("city")
        if (!input || !input.value) return
        query = `city=${encodeURIComponent(input.value)}`
    }

    let weatherEl = document.getElementById("weather")
    let detailsEl = document.getElementById("weather-details")
    let hourlyEl = document.getElementById("hourly")
    let dailyEl = document.getElementById("daily")

    if (!weatherEl || !detailsEl || !hourlyEl || !dailyEl) return

    weatherEl.innerHTML = "Loading..."
    detailsEl.innerHTML = ""
    hourlyEl.innerHTML = ""
    dailyEl.innerHTML = ""

    fetch(`https://eaqvhxfvozhzatrnbkvx.supabase.co/functions/v1/weather?${query}`)
        .then(res => {
            if (!res.ok) throw new Error("API error")
            return res.json()
        })
        .then(data => {

            if (!data || !data.current || !data.forecast) {
                weatherEl.innerHTML = "Няма данни"
                return
            }

            let current = data.current
            let forecast = data.forecast

            if (current.cod !== 200) {
                weatherEl.innerHTML = "Няма данни"
                return
            }

            let icon = current.weather[0].icon

            weatherEl.innerHTML = `
                <h2>
                    ${current.name} -
                    <span class="date">${new Date().toLocaleDateString("bg-BG", {
                        weekday: "long",
                        day: "numeric",
                        month: "long"
                    })}</span>
                </h2>
                <img src="https://openweathermap.org/img/wn/${icon}@2x.png">
                <div class="temp">${Math.round(current.main.temp)}°C</div>
                <p>${translateWeather(current.weather[0].description)}</p>
            `

            detailsEl.innerHTML = `
                <div>💧 Влажност<br><strong>${current.main.humidity}%</strong></div>
                <div>🌬 Вятър<br><strong>${current.wind.speed} m/s</strong></div>
                <div>🤚 Усеща се<br><strong>${Math.round(current.main.feels_like)}°C</strong></div>
                <div>📊 Налягане<br><strong>${current.main.pressure} hPa</strong></div>
            `

            initMap(current.coord.lat, current.coord.lon)

            if (forecast.cod !== "200") return

            // HOURLY
            hourlyEl.innerHTML = forecast.list.slice(0, 8).map(x => {
                let date = new Date(x.dt_txt)
                return `
                    <div class="hourly-item">
                        <div>${date.getHours()}:00</div>
                        <img src="https://openweathermap.org/img/wn/${x.weather[0].icon}.png">
                        <div>${Math.round(x.main.temp)}°</div>
                    </div>
                `
            }).join("")

            // DAILY
            let daily = {}
            forecast.list.forEach(x => {
                let date = x.dt_txt.split(" ")[0]
                if (!daily[date]) daily[date] = x
            })

            dailyEl.innerHTML = Object.values(daily).slice(0, 5).map(x => {
                let date = new Date(x.dt_txt)
                return `
                    <div class="daily-item">
                        <div>${date.toLocaleDateString("bg-BG",{weekday:"short"})}</div>
                        <img src="https://openweathermap.org/img/wn/${x.weather[0].icon}.png">
                        <div>${Math.round(x.main.temp)}°</div>
                    </div>
                `
            }).join("")

            // CHART
            let dailyAvg = {}
            forecast.list.forEach(x => {
                let date = x.dt_txt.split(" ")[0]
                if (!dailyAvg[date]) dailyAvg[date] = []
                dailyAvg[date].push(x.main.temp)
            })

            let labels = Object.keys(dailyAvg).map(d =>
                new Date(d).toLocaleDateString("bg-BG",{weekday:"short"})
            )

            let temps = Object.values(dailyAvg).map(arr =>
                (arr.reduce((a,b)=>a+b,0) / arr.length).toFixed(1)
            )

            drawChart(labels, temps)

            // ✅ ТУК Е ФИКСЪТ
            setStats(forecast)
        })
        .catch(() => {
            weatherEl.innerHTML = "Грешка при зареждане"
        })
}

/* =========================
   GEOLOCATION
========================= */
function loadByLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                loadWeather(null, position.coords.latitude, position.coords.longitude)
            },
            () => loadWeather("Sofia")
        )
    } else {
        loadWeather("Sofia")
    }
}

/* =========================
   CHART
========================= */
function drawChart(labels, temps) {

    let ctx = document.getElementById("chart")
    if (!ctx) return

    if (chartInstance) chartInstance.destroy()

    chartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Температура (°C)",
                data: temps,
                borderWidth: 2,
                tension: 0.3
            }]
        }
    })
}

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
    loadByLocation()
    loadPopularCities()
})

/* =========================
   STATS (FIXED DATE)
========================= */
let setStats = (forecast) => {

    let today = new Date()
    let todayStr =
        today.getFullYear() + "-" +
        String(today.getMonth() + 1).padStart(2, "0") + "-" +
        String(today.getDate()).padStart(2, "0")

    let todayData = forecast.list.filter(x => x.dt_txt.startsWith(todayStr))

    if (todayData.length === 0) return

    let avg = arr => arr.reduce((a,b)=>a+b,0) / arr.length

    document.getElementById("avg-temp").textContent =
        avg(todayData.map(x => x.main.temp)).toFixed(1) + "°C"

    document.getElementById("avg-wind").textContent =
        avg(todayData.map(x => x.wind.speed)).toFixed(1) + " m/s"

    document.getElementById("avg-humidity").textContent =
        avg(todayData.map(x => x.main.humidity)).toFixed(0) + "%"
}


/* =========================
   POPULAR CITIES
========================= */
let cities = ["Sofia", "Plovdiv", "Varna", "Burgas", "Ruse"]

let loadPopularCities = async () => {

    let container = document.getElementById("city-grid")
    if (!container) return // ✅ защита

    container.innerHTML = "Loading..."

    try {
        let requests = cities.map(city =>
            fetch(`https://eaqvhxfvozhzatrnbkvx.supabase.co/functions/v1/weather?city=${city}`)
                .then(res => res.json())
        )

        let results = await Promise.all(requests)

        let html = results.map((data, i) => {

            let city = cities[i]
            let temp = Math.round(data.current.main.temp)
            let icon = data.current.weather[0].icon

            return `
                <div class="city-card" onclick="loadWeather('${city}')">
                    <div class="city-name">${city}</div>
                    <img src="https://openweathermap.org/img/wn/${icon}.png">
                    <div class="city-temp">${temp}°C</div>
                </div>
            `
        }).join("")

        container.innerHTML = html

    } catch {
        container.innerHTML = "Грешка при зареждане"
    }
}