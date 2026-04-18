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
                <h2>${current.name}</h2>
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

            /* FORECAST */
            if (forecast.cod !== "200") return

            // HOURLY
            let hourlyHTML = forecast.list.slice(0, 8).map(x => {
                let date = new Date(x.dt_txt)

                return `
                    <div class="hourly-item">
                        <div>${date.getHours()}:00</div>
                        <img src="https://openweathermap.org/img/wn/${x.weather[0].icon}.png">
                        <div>${Math.round(x.main.temp)}°</div>
                    </div>
                `
            }).join("")

            hourlyEl.innerHTML = hourlyHTML

            // DAILY
            let daily = {}

            forecast.list.forEach(x => {
                let date = x.dt_txt.split(" ")[0]
                if (!daily[date]) daily[date] = x
            })

            let dailyHTML = Object.values(daily).slice(0, 5).map(x => {
                let date = new Date(x.dt_txt)

                return `
                    <div class="daily-item">
                        <div>${date.toLocaleDateString("bg-BG",{weekday:"short"})}</div>
                        <img src="https://openweathermap.org/img/wn/${x.weather[0].icon}.png">
                        <div>${Math.round(x.main.temp)}°</div>
                    </div>
                `
            }).join("")

            dailyEl.innerHTML = dailyHTML

            // CHART
            let dailyAvg = {}

            forecast.list.forEach(x => {
                let date = x.dt_txt.split(" ")[0]
                if (!dailyAvg[date]) dailyAvg[date] = []
                dailyAvg[date].push(x.main.temp)
            })

            let labels = Object.keys(dailyAvg).map(d => {
                let date = new Date(d)
                return date.toLocaleDateString("bg-BG",{weekday:"short"})
            })

            let temps = Object.values(dailyAvg).map(arr => {
                return (arr.reduce((a,b)=>a+b,0) / arr.length).toFixed(1)
            })

            drawChart(labels, temps)
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
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true }
            }
        }
    })
}

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {

    let cityInput = document.getElementById("city")

    if (cityInput) {
        cityInput.addEventListener("keypress", function(e){
            if (e.key === "Enter") {
                loadWeather()
            }
        })
    }

    loadByLocation()
})