document.addEventListener("DOMContentLoaded", function () {

    console.log("Fuel price widget loaded")

    /* текуща дата */

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

    /* форма */

    const form = document.getElementById("fuel-form")
    const message = document.getElementById("success-message")
    const submitBtn = form.querySelector("button")

    function showMessage(text, type) {

        if (!message) return

        message.textContent = text
        message.className = "success-message " + type

        message.classList.add("show")

        setTimeout(function () {
            message.classList.remove("show")
        }, 3000)

    }

    /* countdown */

    function startCountdown() {

        let seconds = 3

        submitBtn.disabled = true
        submitBtn.textContent = "Изпращане... " + seconds

        let timer = setInterval(function () {

            seconds--

            if (seconds > 0) {
                submitBtn.textContent = "Изпращане... " + seconds
            } else {
                clearInterval(timer)
            }

        }, 1000)

    }

    if (form) {

        form.addEventListener("submit", function (e) {

            e.preventDefault()

            let city = document.getElementById("city").value.trim()

            /* форматиране на града */

            city = city
                .toLowerCase()
                .split(" ")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")

            let station = document.getElementById("station").value
            let fuelElement = document.querySelector('input[name="fuel"]:checked')
            let price = parseFloat(document.getElementById("price").value)

            /* проверки */

            if (city.length < 2) {
                showMessage("Моля въведете валиден град", "error")
                return
            }

            if (!station) {
                showMessage("Моля изберете бензиностанция", "error")
                return
            }

            if (!fuelElement) {
                showMessage("Моля изберете гориво", "error")
                return
            }

            if (isNaN(price) || price < 0.5 || price > 5) {
                showMessage("Моля въведете цена между 0.50 € и 5.00 €", "error")
                return
            }

            startCountdown()

            let fuel = fuelElement.value

            fetch("https://script.google.com/macros/s/AKfycbzMB6w-4YD1eHH3_fRxdmKwkNJZnO0jqZ7Mh76cOpi8Erz7_vwbdLZPWLGd1nGwYAnc/exec", {

                method: "POST",

                body: JSON.stringify({
                    city: city,
                    station: station,
                    fuel: fuel,
                    price: price
                })

            })
                .then(response => response.json())
                .then(data => {

                    showMessage("✔ Благодарим! Цената беше записана.", "success")

                    submitBtn.disabled = false
                    submitBtn.textContent = "Изпрати цена"

                    form.reset()

                })
                .catch(error => {

                    console.error(error)

                    showMessage("⚠ Възникна грешка при изпращането.", "error")

                    submitBtn.disabled = false
                    submitBtn.textContent = "Изпрати цена"

                })

        })

    }

})