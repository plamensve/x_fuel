let chartInstance = null
let weatherMap = null
let weatherMarker = null

function translateWeather(desc) {
    const dictionary = {
        "clear sky": "Ясно", "few clouds": "Лека облачност", "scattered clouds": "Разкъсана облачност",
        "broken clouds": "Облачно", "overcast clouds": "Плътна облачност", "rain": "Дъжд",
        "light rain": "Слаб дъжд", "moderate rain": "Умерен дъжд", "heavy intensity rain": "Силен дъжд",
        "thunderstorm": "Буря", "snow": "Сняг", "mist": "Мъгла", "fog": "Мъгла"
    }
    return dictionary[desc] || desc
}

function initMap(lat = 42.7339, lon = 25.4858) {
    if (!weatherMap) {
        weatherMap = L.map('map', { zoomControl: true }).setView([lat, lon], 7)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(weatherMap)
    } else {
        weatherMap.setView([lat, lon], 9)
    }

    if (weatherMarker) weatherMarker.setLatLng([lat, lon])
    else weatherMarker = L.marker([lat, lon]).addTo(weatherMap)

    setTimeout(() => weatherMap?.invalidateSize(), 80)
}

function loadWeather(city = null, lat = null, lon = null) {
    let query = ""
    if (city) query = `city=${encodeURIComponent(city)}`
    else if (lat && lon) query = `lat=${lat}&lon=${lon}`
    else {
        const input = document.getElementById("city")
        if (!input || !input.value.trim()) return
        query = `city=${encodeURIComponent(input.value.trim())}`
    }

    const weatherEl = document.getElementById("weather")
    const detailsEl = document.getElementById("weather-details")
    const hourlyEl = document.getElementById("hourly")
    const dailyEl = document.getElementById("daily")
    if (!weatherEl || !detailsEl || !hourlyEl || !dailyEl) return

    weatherEl.innerHTML = '<div class="weather-loading">Зареждане на актуалните данни…</div>'
    detailsEl.innerHTML = ""
    hourlyEl.innerHTML = '<div class="weather-loading">Зареждане…</div>'
    dailyEl.innerHTML = '<div class="weather-loading">Зареждане…</div>'

    fetch(`https://eaqvhxfvozhzatrnbkvx.supabase.co/functions/v1/weather?${query}`)
        .then(res => { if (!res.ok) throw new Error("API error"); return res.json() })
        .then(data => {
            if (!data?.current || !data?.forecast || data.current.cod !== 200) {
                weatherEl.innerHTML = '<div class="weather-loading">Няма налични данни за това място.</div>'
                return
            }

            const current = data.current
            const forecast = data.forecast
            const icon = current.weather[0].icon
            const currentName = current.name || city || "Избраното място"

            weatherEl.innerHTML = `
                <h2>${currentName} <span class="date">${new Date().toLocaleDateString("bg-BG", {weekday:"long", day:"numeric", month:"long"})}</span></h2>
                <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${translateWeather(current.weather[0].description)}">
                <div class="temp">${Math.round(current.main.temp)}°C</div>
                <p>${translateWeather(current.weather[0].description)}</p>`

            detailsEl.innerHTML = `
                <div>💧 Влажност<strong>${current.main.humidity}%</strong></div>
                <div>↝ Вятър<strong>${current.wind.speed} m/s</strong></div>
                <div>◌ Усеща се<strong>${Math.round(current.main.feels_like)}°C</strong></div>
                <div>▥ Налягане<strong>${current.main.pressure} hPa</strong></div>`

            initMap(current.coord.lat, current.coord.lon)
            if (forecast.cod !== "200") return

            hourlyEl.innerHTML = forecast.list.slice(0, 8).map(x => {
                const date = new Date(x.dt_txt)
                return `<div class="hourly-item"><div>${String(date.getHours()).padStart(2,"0")}:00</div><img src="https://openweathermap.org/img/wn/${x.weather[0].icon}.png" alt=""><div><strong>${Math.round(x.main.temp)}°</strong></div></div>`
            }).join("")

            const daily = {}
            forecast.list.forEach(x => { const date = x.dt_txt.split(" ")[0]; if (!daily[date]) daily[date] = x })
            dailyEl.innerHTML = Object.values(daily).slice(0, 5).map(x => {
                const date = new Date(x.dt_txt)
                return `<div class="daily-item"><div><strong>${date.toLocaleDateString("bg-BG",{weekday:"short"})}</strong></div><img src="https://openweathermap.org/img/wn/${x.weather[0].icon}.png" alt=""><div>${Math.round(x.main.temp)}°C</div><small>${translateWeather(x.weather[0].description)}</small></div>`
            }).join("")

            const dailyAvg = {}
            forecast.list.forEach(x => { const date = x.dt_txt.split(" ")[0]; (dailyAvg[date] ||= []).push(x.main.temp) })
            const labels = Object.keys(dailyAvg).map(d => new Date(d).toLocaleDateString("bg-BG",{weekday:"short"}))
            const temps = Object.values(dailyAvg).map(arr => (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1))
            drawChart(labels, temps)
            setStats(forecast)
        })
        .catch(() => {
            weatherEl.innerHTML = '<div class="weather-loading">Не успяхме да заредим прогнозата. Опитай отново.</div>'
            hourlyEl.innerHTML = ""
            dailyEl.innerHTML = ""
        })
}

function loadByLocation() {
    if (!navigator.geolocation) return loadWeather("Sofia")
    navigator.geolocation.getCurrentPosition(
        position => loadWeather(null, position.coords.latitude, position.coords.longitude),
        () => loadWeather("Sofia"),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    )
}

function drawChart(labels, temps) {
    const ctx = document.getElementById("chart")
    if (!ctx) return
    if (chartInstance) chartInstance.destroy()
    chartInstance = new Chart(ctx, {
        type: "line",
        data: { labels, datasets: [{ label: "Температура (°C)", data: temps, borderColor: "#60a5fa", backgroundColor: "rgba(96,165,250,.10)", pointBackgroundColor: "#22c55e", pointBorderColor: "#0b1728", pointRadius: 4, borderWidth: 2, tension: .35, fill: true }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: "rgba(148,163,184,.08)" }, ticks: { color: "#8fa2b8" } },
                y: { grid: { color: "rgba(148,163,184,.08)" }, ticks: { color: "#8fa2b8", callback: value => `${value}°` } }
            }
        }
    })
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("city")?.addEventListener("keydown", event => { if (event.key === "Enter") loadWeather() })
    loadByLocation()
    loadPopularCities()
})

function setStats(forecast) {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`
    const todayData = forecast.list.filter(x => x.dt_txt.startsWith(todayStr))
    if (!todayData.length) return
    const avg = arr => arr.reduce((a,b)=>a+b,0)/arr.length
    const temp = document.getElementById("avg-temp"), wind = document.getElementById("avg-wind"), humidity = document.getElementById("avg-humidity")
    if (temp) temp.textContent = avg(todayData.map(x=>x.main.temp)).toFixed(1)+"°C"
    if (wind) wind.textContent = avg(todayData.map(x=>x.wind.speed)).toFixed(1)+" m/s"
    if (humidity) humidity.textContent = avg(todayData.map(x=>x.main.humidity)).toFixed(0)+"%"
}

const cities = [
    {api:"Sofia",label:"София"},{api:"Plovdiv",label:"Пловдив"},{api:"Varna",label:"Варна"},{api:"Burgas",label:"Бургас"},{api:"Ruse",label:"Русе"}
]

async function loadPopularCities() {
    const container = document.getElementById("city-grid")
    if (!container) return
    container.innerHTML = '<div class="weather-loading">Зареждане на градовете…</div>'
    try {
        const results = await Promise.all(cities.map(city => fetch(`https://eaqvhxfvozhzatrnbkvx.supabase.co/functions/v1/weather?city=${city.api}`).then(res => res.json())))
        container.innerHTML = results.map((data,i) => {
            const city = cities[i], temp = Math.round(data.current.main.temp), icon = data.current.weather[0].icon
            return `<button type="button" class="city-card" onclick="loadWeather('${city.api}')"><div class="city-name">${city.label}</div><img src="https://openweathermap.org/img/wn/${icon}.png" alt=""><div class="city-temp">${temp}°C</div><small>${translateWeather(data.current.weather[0].description)}</small></button>`
        }).join("")
    } catch {
        container.innerHTML = '<div class="weather-loading">Не успяхме да заредим градовете.</div>'
    }
}
