function getStationIcon(name) {

    let lower = (name || "")
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/-/g, "")
        .trim()

    let defaultConfig = {
        iconSize: [42, 42],
        iconAnchor: [21, 42],
        popupAnchor: [0, -42]
    }

    if (lower.includes("ecopetrol") || lower.includes("екопетрол")) {
        return L.icon({iconUrl: "../images/station_logos/ecopetrol.svg", ...defaultConfig})
    }

    if (lower.includes("benita") || lower.includes("бенита")) {
        return L.icon({iconUrl: "../images/station_logos/benita.svg", ...defaultConfig})
    }

    if (lower.includes("lukoil") || lower.includes("лукойл")) {
        return L.icon({iconUrl: "../images/station_logos/lukoil.svg", ...defaultConfig})
    }

    if (lower.includes("omv") || lower.includes("омв")) {
        return L.icon({iconUrl: "../images/station_logos/omv.svg", ...defaultConfig})
    }

    if (lower.includes("shell") || lower.includes("шел")) {
        return L.icon({iconUrl: "../images/station_logos/shell.svg", ...defaultConfig})
    }

    if (lower.includes("rompetrol") || lower.includes("ромпетрол")) {
        return L.icon({iconUrl: "../images/station_logos/rompetrol.svg", ...defaultConfig})
    }

    if (lower.includes("insa") || lower.includes("инса")) {
        return L.icon({iconUrl: "../images/station_logos/insa.svg", ...defaultConfig})
    }

    if (lower.includes("kruiz") || lower.includes("cruise") || lower.includes("круиз")) {
        return L.icon({iconUrl: "../images/station_logos/kruiz.svg", ...defaultConfig})
    }

    if (lower.includes("bulmarket") || lower.includes("булмаркет")) {
        return L.icon({iconUrl: "../images/station_logos/bulmarket.svg", ...defaultConfig})
    }

    if (lower.includes("petrol") || lower.includes("петрол")) {
        return L.icon({iconUrl: "../images/station_logos/petrol.svg", ...defaultConfig})
    }

    if (lower.includes("eko") || lower.includes("еко")) {
        return L.icon({iconUrl: "../images/station_logos/eko.svg", ...defaultConfig})
    }

    if (lower.includes("diselor") || lower.includes("дизелор") || lower.includes("diesoler")) {
        return L.icon({iconUrl: "../images/station_logos/diselor.svg", ...defaultConfig})
    }

    if (lower.includes("chimoil") || lower.includes("химойл") || lower.includes("himoil")) {
        return L.icon({iconUrl: "../images/station_logos/himoil.svg", ...defaultConfig})
    }

    if (lower.includes("avia")) {
        return L.icon({iconUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/AVIA_International_logo.svg", ...defaultConfig})
    }

    if (lower.includes("gazprom") || lower.includes("газпром")) {
        return L.icon({iconUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Gazprom_logo.svg", ...defaultConfig})
    }

    if (lower.includes("зара") || lower.includes("zara")) {
        return L.icon({iconUrl: "https://zara.bg/favicon.ico", ...defaultConfig})
    }

    if (lower.includes("топливо") || lower.includes("toplivo")) {
        return L.icon({iconUrl: "https://toplivo.bg/favicon.ico", ...defaultConfig})
    }

    return L.icon({
        iconUrl: "../images/station_logos/unknown.svg",
        ...defaultConfig
    })
}
