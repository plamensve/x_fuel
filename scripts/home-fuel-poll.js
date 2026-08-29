(() => {
    const STORAGE_KEY = "goriva_fuel_preference";
    const EVENT_NAME = "fuel_preference_click";

    const fuels = [
        {value: "a95", label: "A95"},
        {value: "diesel", label: "Дизел"},
        {value: "lpg", label: "LPG"},
        {value: "a100", label: "A100"},
        {value: "diesel_plus", label: "Дизел +"}
    ];

    const hero = document.querySelector(".about-project");
    if (!hero || document.querySelector(".fuel-poll")) return;

    const style = document.createElement("style");
    style.textContent = `
        .fuel-poll {
            margin: 22px 0 28px;
        }

        .fuel-poll-card {
            position: relative;
            overflow: hidden;
            padding: 26px 28px;
            border: 1px solid rgba(15, 23, 42, 0.10);
            border-radius: 22px;
            background: rgba(255, 255, 255, 0.94);
            box-shadow: 0 14px 36px rgba(15, 23, 42, 0.08);
            text-align: center;
        }

        .fuel-poll-card::before {
            content: "";
            position: absolute;
            inset: 0 0 auto 0;
            height: 4px;
            background: linear-gradient(90deg, #f59e0b, #f97316);
        }

        .fuel-poll-kicker {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            margin-bottom: 8px;
            color: #b45309;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: .08em;
            text-transform: uppercase;
        }

        .fuel-poll-title {
            margin: 0;
            color: #111827;
            font-size: clamp(21px, 3vw, 29px);
            line-height: 1.2;
        }

        .fuel-poll-subtitle {
            max-width: 640px;
            margin: 9px auto 0;
            color: #64748b;
            font-size: 15px;
            line-height: 1.55;
        }

        .fuel-poll-options {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 10px;
            margin-top: 20px;
        }

        .fuel-poll-option {
            appearance: none;
            border: 1px solid #dbe2ea;
            border-radius: 999px;
            background: #fff;
            color: #1f2937;
            padding: 11px 18px;
            font: inherit;
            font-weight: 700;
            cursor: pointer;
            transition: transform .15s ease, border-color .15s ease, background .15s ease, box-shadow .15s ease;
        }

        .fuel-poll-option:hover {
            transform: translateY(-1px);
            border-color: #f59e0b;
            box-shadow: 0 7px 18px rgba(245, 158, 11, 0.14);
        }

        .fuel-poll-option:focus-visible {
            outline: 3px solid rgba(245, 158, 11, 0.28);
            outline-offset: 2px;
        }

        .fuel-poll-option.is-selected {
            border-color: #f59e0b;
            background: #fff7ed;
            color: #9a3412;
        }

        .fuel-poll-result {
            display: none;
            margin-top: 18px;
            color: #334155;
            font-size: 14px;
        }

        .fuel-poll-result.is-visible {
            display: block;
        }

        .fuel-poll-result strong {
            color: #111827;
        }

        .fuel-poll-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-top: 12px;
            padding: 10px 16px;
            border-radius: 12px;
            background: #111827;
            color: #fff;
            font-weight: 700;
            text-decoration: none;
        }

        .fuel-poll-link:hover {
            background: #0f172a;
        }

        @media (max-width: 640px) {
            .fuel-poll {
                margin: 16px 0 22px;
            }

            .fuel-poll-card {
                padding: 22px 16px;
                border-radius: 18px;
            }

            .fuel-poll-options {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 9px;
            }

            .fuel-poll-option {
                width: 100%;
                padding: 11px 10px;
            }

            .fuel-poll-option:last-child:nth-child(odd) {
                grid-column: 1 / -1;
            }
        }
    `;
    document.head.appendChild(style);

    const section = document.createElement("section");
    section.className = "fuel-poll";
    section.setAttribute("aria-labelledby", "fuel-poll-title");

    section.innerHTML = `
        <div class="fuel-poll-card">
            <div class="fuel-poll-kicker">⛽ 1 клик</div>
            <h2 class="fuel-poll-title" id="fuel-poll-title">Кое гориво зареждаш най-често?</h2>
            <p class="fuel-poll-subtitle">Помогни ни да разберем коя информация е най-полезна за шофьорите в goriva.online.</p>
            <div class="fuel-poll-options" role="group" aria-label="Избери гориво"></div>
            <div class="fuel-poll-result" aria-live="polite"></div>
        </div>
    `;

    hero.insertAdjacentElement("afterend", section);

    const options = section.querySelector(".fuel-poll-options");
    const result = section.querySelector(".fuel-poll-result");

    const getStoredPreference = () => {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (error) {
            return null;
        }
    };

    const storePreference = value => {
        try {
            localStorage.setItem(STORAGE_KEY, value);
        } catch (error) {
            // The poll still works when storage is unavailable.
        }
    };

    const showResult = fuel => {
        result.innerHTML = `
            Благодаря! Избра <strong>${fuel.label}</strong>. Така ни помагаш да правим сайта по-полезен.
            <br>
            <a class="fuel-poll-link" href="#top-stations">Виж топ бензиностанциите</a>
        `;
        result.classList.add("is-visible");
    };

    result.addEventListener("click", event => {
        const link = event.target.closest(".fuel-poll-link");
        if (!link) return;

        const topStations = document.querySelector(".home-top10-cards-section");
        if (!topStations) return;

        event.preventDefault();
        if (!topStations.id) topStations.id = "top-stations";
        topStations.scrollIntoView({behavior: "smooth", block: "start"});
    });

    const selectButton = value => {
        options.querySelectorAll(".fuel-poll-option").forEach(button => {
            const selected = button.dataset.fuel === value;
            button.classList.toggle("is-selected", selected);
            button.setAttribute("aria-pressed", selected ? "true" : "false");
        });
    };

    fuels.forEach(fuel => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "fuel-poll-option";
        button.dataset.fuel = fuel.value;
        button.textContent = fuel.label;
        button.setAttribute("aria-pressed", "false");

        button.addEventListener("click", () => {
            const previousPreference = getStoredPreference();

            storePreference(fuel.value);
            selectButton(fuel.value);
            showResult(fuel);

            if (typeof window.gtag === "function") {
                window.gtag("event", EVENT_NAME, {
                    fuel_type: fuel.value,
                    fuel_label: fuel.label,
                    poll_location: "home_after_hero",
                    preference_changed: previousPreference && previousPreference !== fuel.value ? "yes" : "no"
                });
            }
        });

        options.appendChild(button);
    });

    const storedPreference = getStoredPreference();
    const storedFuel = fuels.find(fuel => fuel.value === storedPreference);

    if (storedFuel) {
        selectButton(storedFuel.value);
        showResult(storedFuel);
    }
})();