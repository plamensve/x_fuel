document.addEventListener("DOMContentLoaded", () => {
    const menuButton = document.getElementById("menu-toggle")
    const menu = document.getElementById("nav-menu")

    const closeMenu = () => {
        if (!menu || !menuButton) return
        menu.classList.remove("open")
        menuButton.setAttribute("aria-expanded", "false")
    }

    if (menuButton && menu) {
        menuButton.setAttribute("aria-expanded", "false")
        menuButton.setAttribute("aria-controls", "nav-menu")

        menuButton.addEventListener("click", event => {
            event.stopPropagation()
            const isOpen = menu.classList.toggle("open")
            menuButton.setAttribute("aria-expanded", String(isOpen))
        })

        menu.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu))

        document.addEventListener("click", event => {
            if (!menu.classList.contains("open")) return
            if (menu.contains(event.target) || menuButton.contains(event.target)) return
            closeMenu()
        })

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") closeMenu()
        })

        window.addEventListener("resize", () => {
            if (window.innerWidth > 900) closeMenu()
        })
    }

    const normalizePath = path => {
        let value = path || "/"
        value = value.replace(/\/index\.html$/, "/")
        value = value.replace(/\/$/, "") || "/"
        return value
    }

    const currentPath = normalizePath(window.location.pathname)

    const navVisuals = [
        {match: /(^|\/)index\.html$|^\/$/, label: "Начало", symbol: "⌂"},
        {match: /useful\.html$/, label: "Полезно", symbol: "✦"},
        {match: /trends\.html$/, label: "История", symbol: "↗"},
        {match: /weather\.html$/, label: "Времето", symbol: "☼"},
        {match: /business-clients\.html$/, label: "За бизнеса", symbol: "◆"},
        {match: /news\.html$/, label: "Новини", symbol: "▤"},
        {match: /rules\.html$/, label: "Условия", symbol: "✓"}
    ]

    document.querySelectorAll("#nav-menu a").forEach(link => {
        const linkUrl = new URL(link.href, window.location.href)
        const targetPath = normalizePath(linkUrl.pathname)
        const visual = navVisuals.find(item => item.match.test(linkUrl.pathname))

        if (visual) {
            link.textContent = visual.label
            link.dataset.navSymbol = visual.symbol
        }

        if (targetPath === currentPath) {
            link.classList.add("is-active")
            link.setAttribute("aria-current", "page")
        } else {
            link.classList.remove("is-active")
            link.removeAttribute("aria-current")
        }
    })

    /* Match the homepage right-side actions on business-shell pages. */
    const businessShell = document.querySelector(".business-header .business-nav-shell")
    const navCta = businessShell?.querySelector(".nav-cta")

    if (businessShell && navCta && !businessShell.querySelector(".home-nav-actions")) {
        const actions = document.createElement("div")
        actions.className = "home-nav-actions"

        const submit = document.createElement("a")
        submit.className = "home-nav-submit"
        submit.href = "../index.html#fuel-form"
        submit.textContent = "Сподели цена"
        submit.setAttribute("aria-label", "Сподели актуална цена на гориво")

        navCta.href = "https://www.facebook.com/groups/960591129738525"
        navCta.target = "_blank"
        navCta.rel = "noopener noreferrer"
        navCta.textContent = "Facebook"
        navCta.classList.add("facebook-nav-cta")
        navCta.setAttribute("aria-label", "Отвори Facebook общността на goriva.online")

        actions.appendChild(submit)
        actions.appendChild(navCta)
        businessShell.appendChild(actions)
    }

    /* The history dashboard's “Най-ниски цени за днес” block is intentionally strict. */
    if (currentPath === "/pages/trends.html" &&
        typeof window.getFilteredData === "function" &&
        typeof window.toDateOnly === "function" &&
        typeof window.renderBestPrices === "function" &&
        typeof window.updateBestPricesHeading === "function") {

        window.renderBestPricesForTodayOrLatest = () => {
            const todayStr = window.toDateOnly(new Date())
            const todayData = window.getFilteredData().filter(row => row.dateOnly === todayStr)

            window.updateBestPricesHeading(todayStr, false)
            window.renderBestPrices(todayData)
        }
    }
})
