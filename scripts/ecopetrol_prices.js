document.addEventListener("DOMContentLoaded", () => {

    let url = "https://eaqvhxfvozhzatrnbkvx.supabase.co/rest/v1/ecopetrol";
    let apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhcXZoeGZ2b3poemF0cm5ia3Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTI0NjYsImV4cCI6MjA4ODcyODQ2Nn0.qOIGTFGZ6ojFA84G59LMtqoJZhVEvEmGBdoZj-ynMXI";

    let fuels = ["dizel", "benzin95", "benzin100", "lpg", "adblue"]

    fetch(url, {
        headers: {
            apikey: apiKey,
            Authorization: `Bearer ${apiKey}`
        }
    })
    .then(res => {
        if (!res.ok) {
            throw new Error("Request failed: " + res.status);
        }
        return res.json();
    })
    .then(data => {

        console.log("DATA:", data);

        data.forEach(st => {

            let slug = (st.station_slug || "").trim().toLowerCase();

            fuels.forEach(fuel => {

                let id = `${fuel}-${slug}`;
                let el = document.getElementById(id);

                if (!el) {
                    console.log("Missing element:", id);
                    return;
                }

                let value = st[fuel];

                el.textContent = value !== null && value !== undefined
                    ? value + "€"
                    : "-";
            });

        });

    })
    .catch(err => {
        console.error("Supabase error:", err);
    });

});