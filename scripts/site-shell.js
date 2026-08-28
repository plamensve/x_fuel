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

        menu.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", closeMenu)
        })

        document.addEventListener("click", event => {
            if (!menu.classList.contains("open")) return
            if (menu.contains(event.target) || menuButton.contains(event.target)) return
            closeMenu()
        })

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") closeMenu()
        })

        window.addEventListener("resize", () => {
            if (window.innerWidth > 860) closeMenu()
        })
    }

    const normalizePath = path => {
        let value = path || "/"
        value = value.replace(/\/index\.html$/, "/")
        value = value.replace(/\/$/, "") || "/"
        return value
    }

    const currentPath = normalizePath(window.location.pathname)

    document.querySelectorAll("#nav-menu a").forEach(link => {
        const targetPath = normalizePath(new URL(link.href, window.location.href).pathname)

        if (targetPath === currentPath) {
            link.classList.add("is-active")
            link.setAttribute("aria-current", "page")
        } else {
            link.classList.remove("is-active")
            link.removeAttribute("aria-current")
        }
    })

    /* The history dashboard's "Най-ниски цени за днес" block is intentionally
       strict: it must never fall back to a previous date. */
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
