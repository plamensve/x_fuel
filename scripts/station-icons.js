function getStationIcon(name) {

    let lower = name.toLowerCase()

    if (
        lower.includes("lukoil") ||
        lower.includes("лукойл")
    ) {

        return L.icon({
            iconUrl: "../images/station_logos/lukoil.svg",
            iconSize: [55, 30],
            iconAnchor: [20, 26],
            popupAnchor: [0, -26]
        })

    }

    if (
        lower.includes("omv") ||
        lower.includes("омв")
    ) {

        return L.icon({
            iconUrl: "../images/station_logos/omv.svg",
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -36]
        })

    }

    if (
        lower.includes("petrol") ||
        lower.includes("петрол")
    ) {

        return L.icon({
            iconUrl: "../images/station_logos/petrol.svg",
            iconSize: [40, 26],
            iconAnchor: [20, 26],
            popupAnchor: [0, -26]
        })

    }

    if (
        lower.includes("eko") ||
        lower.includes("еко")
    ) {

        return L.icon({
            iconUrl: "../images/station_logos/eko.svg",
            iconSize: [40, 26],
            iconAnchor: [20, 26],
            popupAnchor: [0, -26]
        })

    }

    if (
        lower.includes("rompetrol") ||
        lower.includes("ромпетрол")
    ) {

        return L.icon({
            iconUrl: "../images/station_logos/rompetrol.svg",
            iconSize: [40, 26],
            iconAnchor: [20, 26],
            popupAnchor: [0, -26]
        })

    }

    if (
        lower.includes("insa-oil") ||
        lower.includes("инса-ойл")
    ) {

        return L.icon({
            iconUrl: "../images/station_logos/insa.svg",
            iconSize: [40, 26],
            iconAnchor: [20, 26],
            popupAnchor: [0, -26]
        })

    }

    if (
        lower.includes("shell") ||
        lower.includes("шел")
    ) {

        return L.icon({
            iconUrl: "../images/station_logos/shell.svg",
            iconSize: [40, 26],
            iconAnchor: [20, 26],
            popupAnchor: [0, -26]
        })

    }

    if (
        lower.includes("kruiz") ||
        lower.includes("круиз")
    ) {

        return L.icon({
            iconUrl: "../images/station_logos/kruiz.svg",
            iconSize: [40, 26],
            iconAnchor: [20, 26],
            popupAnchor: [0, -26]
        })

    }

    if (
        lower.includes("bulmarket") ||
        lower.includes("булмаркет")
    ) {

        return L.icon({
            iconUrl: "../images/station_logos/bulmarket.svg",
            iconSize: [40, 26],
            iconAnchor: [20, 26],
            popupAnchor: [0, -26]
        })

    }

    if (
        lower.includes("benita") ||
        lower.includes("бенита")
    ) {

        return L.icon({
            iconUrl: "../images/station_logos/benita.svg",
            iconSize: [40, 26],
            iconAnchor: [20, 26],
            popupAnchor: [0, -26]
        })

    }

    return L.icon({
        iconUrl: "../images/station_logos/unknown.svg",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
    })

}