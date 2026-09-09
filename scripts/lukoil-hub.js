(() => {
  const SUPABASE_URL = 'https://eaqvhxfvozhzatrnbkvx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH';
  const PAGE_SIZE = 9;
  const PRICE_LIMIT = 2000;
  const LUKOIL_LOGO = '/images/station_logos/lukoil-card-logo.jpg?v=20260909-1';
  const FUELS = ['Дизел', 'A95', 'Дизел +', 'A100', 'LPG', 'Метан'];

  const state = { rows: [], stations: [], visible: PAGE_SIZE, search: '', fuel: 'all', latestDate: null };
  const $ = selector => document.querySelector(selector);
  const normalize = value => (value || '').toString().trim().toLocaleLowerCase('bg-BG');
  const escapeHtml = value => (value || '').toString().replace(/[&<>'\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;' }[char]));
  const dateKeyFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Sofia', year: 'numeric', month: '2-digit', day: '2-digit' });
  const humanDateFormatter = new Intl.DateTimeFormat('bg-BG', { timeZone: 'Europe/Sofia', day: '2-digit', month: '2-digit', year: 'numeric' });

  function fuelLabel(value) {
    const fuel = normalize(value);
    if (fuel.includes('a95')) return 'A95';
    if (fuel.includes('a100')) return 'A100';
    if (fuel.includes('пропан') || fuel.includes('lpg')) return 'LPG';
    if (fuel.includes('премиум') && fuel.includes('дизел')) return 'Дизел +';
    if (fuel.includes('дизел')) return 'Дизел';
    if (fuel.includes('метан')) return 'Метан';
    return value || 'Гориво';
  }

  function priceDateKey(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : dateKeyFormatter.format(date);
  }

  function displayDateKey(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : String(value || '');
  }

  function formatPrice(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `${number.toFixed(2)}€` : '-';
  }

  function stationKey(row) {
    return normalize([row.city, row.location].filter(Boolean).join('|'));
  }

  async function loadPrices() {
    const query = new URLSearchParams({
      select: 'station,location,city,region,fuel,price,created_at',
      station: 'ilike.*lukoil*',
      order: 'created_at.desc',
      limit: String(PRICE_LIMIT)
    });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/fuel_prices?${query}`, {
      headers: { apikey: SUPABASE_KEY }, cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Supabase prices returned ${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows) || !rows.length) return [];
    state.latestDate = priceDateKey(rows[0].created_at);
    return rows.filter(row => priceDateKey(row.created_at) === state.latestDate);
  }

  function buildStations(rows) {
    const stations = new Map();
    rows.forEach(row => {
      const key = stationKey(row);
      if (!key) return;
      if (!stations.has(key)) {
        stations.set(key, {
          key,
          city: row.city || 'Населено място не е посочено',
          region: row.region || '',
          location: row.location || 'Адресът не е наличен',
          prices: new Map()
        });
      }
      const fuel = fuelLabel(row.fuel);
      if (!stations.get(key).prices.has(fuel)) stations.get(key).prices.set(fuel, row);
    });
    state.stations = Array.from(stations.values()).sort((a, b) =>
      `${a.city} ${a.location}`.localeCompare(`${b.city} ${b.location}`, 'bg-BG')
    );
    const count = $('#lukoil-station-count');
    if (count) count.textContent = String(state.stations.length);
  }

  function renderSummary(rows) {
    const cards = $('#lukoil-price-cards');
    const status = $('#lukoil-price-status');
    if (!cards || !status) return;
    const order = ['A95', 'Дизел', 'LPG', 'A100', 'Дизел +'];
    const grouped = new Map(order.map(fuel => [fuel, []]));
    rows.forEach(row => {
      const fuel = fuelLabel(row.fuel);
      const price = Number(row.price);
      if (grouped.has(fuel) && Number.isFinite(price)) grouped.get(fuel).push(price);
    });
    cards.innerHTML = order.map(fuel => {
      const values = grouped.get(fuel);
      if (!values.length) return `<article class="eko-price-card"><span>${fuel}</span><strong>—</strong><small>няма налични данни</small></article>`;
      const average = values.reduce((sum, value) => sum + value, 0) / values.length;
      return `<article class="eko-price-card"><span>${fuel}</span><strong>${average.toFixed(2)} €</strong><small>средна цена</small><em>${Math.min(...values).toFixed(2)}–${Math.max(...values).toFixed(2)} € · ${values.length} записа</em></article>`;
    }).join('');
    if (state.latestDate && rows.length) {
      status.textContent = `Последни налични данни: ${humanDateFormatter.format(new Date(rows[0].created_at))}`;
    } else {
      status.textContent = 'В момента няма налични Lukoil цени за визуализиране.';
    }
  }

  function stationMatches(station) {
    if (state.fuel !== 'all' && !station.prices.has(state.fuel)) return false;
    if (!state.search) return true;
    return normalize([station.city, station.region, station.location].join(' ')).includes(state.search);
  }

  function priceMarkup(station) {
    return `<div class="eko-station-prices">${FUELS.map(fuel => {
      const row = station.prices.get(fuel);
      return `<div class="eko-station-price${row ? '' : ' is-missing'}"><span>${fuel}</span><strong>${row ? formatPrice(row.price) : '-'}</strong></div>`;
    }).join('')}</div>`;
  }

  function stationCard(station) {
    const subtitle = station.region && normalize(station.region) !== normalize(station.city)
      ? `${station.city}, обл. ${station.region}`
      : station.city;
    return `<article class="eko-station-card">
      <div class="eko-station-head">
        <span class="eko-station-logo"><img src="${LUKOIL_LOGO}" alt="Lukoil" loading="lazy" width="350" height="350" decoding="async"></span>
        <div><strong>Lukoil – ${escapeHtml(station.city)}</strong><span>${escapeHtml(station.location)}</span></div>
      </div>
      <p class="eko-station-address">Цени към дата ${escapeHtml(displayDateKey(state.latestDate))}</p>
      <div class="eko-station-status" aria-label="Има налични цени"><span aria-hidden="true"></span></div>
      ${priceMarkup(station)}
      <div class="eko-station-actions"><a href="/?city=${encodeURIComponent(station.city)}">⌖ ${escapeHtml(subtitle)}</a></div>
    </article>`;
  }

  function renderStations(resetVisible = false) {
    const grid = $('#lukoil-stations-grid');
    const count = $('#lukoil-results-count');
    const loadMore = $('#lukoil-load-more');
    if (!grid || !count || !loadMore) return;
    if (resetVisible) state.visible = PAGE_SIZE;
    const matches = state.stations.filter(stationMatches);
    count.textContent = `${matches.length} ${matches.length === 1 ? 'обект' : 'обекта'}`;
    if (!matches.length) {
      grid.innerHTML = '<div class="eko-empty-state">Няма Lukoil обекти, които отговарят на избраните критерии.</div>';
      loadMore.hidden = true;
      return;
    }
    grid.innerHTML = matches.slice(0, state.visible).map(stationCard).join('');
    loadMore.hidden = matches.length <= state.visible;
    loadMore.textContent = `Покажи още обекти (${Math.max(0, matches.length - state.visible)})`;
  }

  function bindFilters() {
    const search = $('#lukoil-search');
    const fuel = $('#lukoil-fuel-filter');
    const loadMore = $('#lukoil-load-more');
    search?.addEventListener('input', () => { state.search = normalize(search.value); renderStations(true); });
    fuel?.addEventListener('change', () => { state.fuel = fuel.value; renderStations(true); });
    loadMore?.addEventListener('click', () => { state.visible += PAGE_SIZE; renderStations(); });
  }

  async function init() {
    bindFilters();
    try {
      const rows = await loadPrices();
      state.rows = rows;
      buildStations(rows);
      renderSummary(rows);
      renderStations(true);
    } catch (error) {
      console.warn('[lukoil-hub] Failed to load Lukoil prices', error);
      renderSummary([]);
      const grid = $('#lukoil-stations-grid');
      if (grid) grid.innerHTML = '<div class="eko-empty-state">Данните за Lukoil не могат да бъдат заредени в момента.</div>';
      const count = $('#lukoil-results-count');
      if (count) count.textContent = 'Няма данни';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
