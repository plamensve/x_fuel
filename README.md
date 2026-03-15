A lightweight web app for tracking fuel prices in Bulgaria.

The site allows users to:
- view current fuel prices submitted by the community,
- filter by region and city,
- submit new fuel prices,
- browse station locations on a map.

## Features

- **Daily price table** with averages per station and fuel type.
- **Region and city filters** for quick lookup.
- **Community submission form** for adding new prices.
- **Station map** using GeoJSON + Leaflet marker clustering.
- **Responsive layout** with a mobile menu.
- **Dark/light theme toggle**.

## Tech Stack

- **HTML5** (`index.html`, `pages/rules.html`)
- **CSS3** (`styles.css`)
- **Vanilla JavaScript** (`scripts/script.js`)
- **Leaflet** + **Leaflet.markercluster** for maps
- **Supabase REST API** for reading/writing fuel price entries

## Project Structure

- `index.html` — main page with fuel prices, filters, maps, and submission form
- `pages/rules.html` — terms and conditions page
- `scripts/script.js` — client-side logic (fetching data, rendering, filters, form submit, map behavior)
- `styles.css` — site styles
- `data/export.geojson` — station location dataset
- `media/`, `images/` — branding and static assets

## How Data Works

The frontend fetches recent entries from Supabase and:
1. keeps only records from the current day,
2. groups by `city + station + fuel`,
3. calculates average prices,
4. renders a paginated table.

New submissions are posted directly from the client form to the same Supabase endpoint.

## Run Locally

Because this is a static project, you can run it with any local server.

### Option 1: Python

```bash
python3 -m http.server 8000
```

Then open: `http://localhost:8000`

### Option 2: VS Code Live Server

Open the folder and start **Live Server** from `index.html`.

## Deployment

The project is static and can be deployed to:
- GitHub Pages
- Netlify
- Vercel (static output)
- Any basic web hosting

Make sure paths to assets remain unchanged and HTTPS is enabled for external resources.

## Notes

- UI content is currently in Bulgarian.
- Price quality depends on user-submitted data.
- The app relies on external services (Supabase API, Leaflet CDN, Google services).
