(() => {
  const SUPABASE_URL = 'https://eaqvhxfvozhzatrnbkvx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH';
  const PAGE_SIZE = 9;
  const PRICE_LIMIT = 1600;
  const EKO_CARD_ICON = '/images/station_logos/eko-page-logo.png?v=20260906-2';

  const state = {
    stations: [],
    products: {},
    pricesByStation: new Map(),
    visible: PAGE_SIZE,
    search: '',
    fuel: 'all',
    latestDate: null
  };

  const dateFormatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Sofia', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const humanDateFormatter = new Intl.DateTimeFormat('bg-BG', {
    timeZone: 'Europe/Sofia', day: '2-digit', month: '2-digit', year: 'numeric'
  });

  const $ = selector => document.querySelector(selector);
  const normalize = value => (value || '').toString().trim().toLocaleLowerCase('bg-BG');
  const escapeHtml = value => (value || '').toString().replace(/[&<>'\"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[char]));

  function stationIdFromRow(row) {
    const text = [row.location, row.city, row.region, row.station].filter(Boolean).join(' ');
    const match = text.match(/(?:EKO|ЕКО)?\s*(1\d{3})\b/i);
    return match ? match[1] : null;
  }

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
    return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
  }

  function displayDateKey(value) {
    if (!value) return '';
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : String(value);
  }

  function formatPrice(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `${number.toFixed(2)}€` : '-';
  }

  async function loadJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  }

  async function loadStations() {
    const [registry, productData] = await Promise.all([
      loadJson('/data/eko_stations.json'),
      loadJson('/data/eko_products.json')
    ]);
    const stationsObject = registry.stations || {};
    state.stations = Object.values(stationsObject).sort((a, b) => String(a.station_id).localeCompare(String(b.station_id), 'bg'));
    state.products = productData.products_by_station || {};
    const count = $('#eko-station-count');
    if (count) count.textContent = String(state.stations.length);
  }

  async function loadPrices() {
    const query = new URLSearchParams({
      select: 'station,location,city,region,fuel,price,created_at',
      station: 'eq.ЕКО',
      order: 'created_at.desc',
      limit: String(PRICE_LIMIT)
    });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/fuel_prices?${query.toString()}`, {
      headers: { apikey: SUPABASE_KEY }, cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Supabase prices returned ${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const latestDate = priceDateKey(rows[0].created_at);
    state.latestDate = latestDate;
    return rows.filter(row => priceDateKey(row.created_at) === latestDate);
  }

  function indexPrices(rows) {
    state.pricesByStation = new Map();
    for (const row of rows) {
      const id = stationIdFromRow(row);
      if (!id) continue;
      if (!state.pricesByStation.has(id)) state.pricesByStation.set(id, new Map());
      const fuel = fuelLabel(row.fuel);
      const stationPrices = state.pricesByStation.get(id);
      if (!stationPrices.has(fuel)) stationPrices.set(fuel, row);
    }
  }

  function renderSummary(rows) {
    const cards = $('#eko-price-cards');
    const status = $('#eko-price-status');
    if (!cards || !status) return;

    const order = ['A95', 'Дизел', 'LPG', 'A100', 'Дизел +'];
    const grouped = new Map(order.map(fuel => [fuel, []]));
    rows.forEach(row => {
      const label = fuelLabel(row.fuel);
      const value = Number(row.price);
      if (grouped.has(label) && Number.isFinite(value)) grouped.get(label).push(value);
    });

    cards.innerHTML = order.map(fuel => {
      const values = grouped.get(fuel) || [];
      if (!values.length) return `<article class="eko-price-card"><span>${fuel}</span><strong>—</strong><small>няма налични данни</small></article>`;
      const average = values.reduce((sum, value) => sum + value, 0) / values.length;
      const minimum = Math.min(...values);
      const maximum = Math.max(...values);
      return `<article class="eko-price-card"><span>${fuel}</span><strong>${average.toFixed(2)} €</strong><small>средна цена</small><em>${minimum.toFixed(2)}–${maximum.toFixed(2)} € · ${values.length} записа</em></article>`;
    }).join('');

    if (state.latestDate && rows.length) {
      const representative = rows.find(row => priceDateKey(row.created_at) === state.latestDate);
      const dateText = representative ? humanDateFormatter.format(new Date(representative.created_at)) : state.latestDate;
      status.textContent = `Последни налични данни: ${dateText}`;
    } else {
      status.textContent = 'В момента няма налични EKO цени за визуализиране.';
    }
  }

  function priceMarkup(id) {
    const stationPrices = state.pricesByStation.get(String(id));
    const fuels = ['Дизел', 'A95', 'Дизел +', 'A100', 'LPG', 'Метан'];
    return `<div class="eko-station-prices">${fuels.map(fuel => {
      const row = stationPrices?.get(fuel);
      return `<div class="eko-station-price${row ? '' : ' is-missing'}"><span>${fuel}</span><strong>${row ? formatPrice(row.price) : '-'}</strong></div>`;
    }).join('')}</div>`;
  }

  function stationMatches(station) {
    const products = state.products[String(station.station_id)] || [];
    if (state.fuel !== 'all' && !products.includes(state.fuel)) return false;
    if (!state.search) return true;
    const haystack = normalize([station.station_id, station.name, station.address, station.phone].filter(Boolean).join(' '));
    return haystack.includes(state.search);
  }

  function stationCard(station) {
    const id = String(station.station_id);
    const phone = station.phone || '';
    const phoneDisplay = phone ? phone.replace(/^\+359/, '+359 ') : '';
    const hasPrices = state.pricesByStation.has(id);
    const dateLabel = hasPrices && state.latestDate ? `Цени към дата ${displayDateKey(state.latestDate)}` : 'Няма налични цени за последната дата';

    return `<article class="eko-station-card">
      <div class="eko-station-head">
        <span class="eko-station-logo"><img src="${EKO_CARD_ICON}" alt="EKO" loading="lazy" width="48" height="48" decoding="async"></span>
        <div><strong>${escapeHtml(station.name || `EKO ${id}`)}</strong><span>EKO ${escapeHtml(id)}</span></div>
      </div>
      <p class="eko-station-address">${escapeHtml(station.address || 'Адресът не е наличен')}</p>
      <div class="eko-station-status${hasPrices ? '' : ' is-missing'}" aria-label="${hasPrices ? 'Има налични цени' : 'Няма налични цени'}"><span aria-hidden="true"></span></div>
      ${priceMarkup(id)}
      <div class="eko-station-actions">
        ${phone ? `<a href="tel:${escapeHtml(phone)}">☎ ${escapeHtml(phoneDisplay)}</a>` : ''}
      </div>
      <div class="eko-station-date">${escapeHtml(dateLabel)}</div>
    </article>`;
  }

  function renderStations(resetVisible = false) {
    const grid = $('#eko-stations-grid');
    const count = $('#eko-results-count');
    const loadMore = $('#eko-load-more');
    if (!grid || !count || !loadMore) return;
    if (resetVisible) state.visible = PAGE_SIZE;

    const matches = state.stations.filter(stationMatches);
    count.textContent = `${matches.length} ${matches.length === 1 ? 'обект' : 'обекта'}`;
    if (!matches.length) {
      grid.innerHTML = '<div class="eko-empty-state">Няма EKO станции, които отговарят на избраните критерии.</div>';
      loadMore.hidden = true;
      return;
    }

    grid.innerHTML = matches.slice(0, state.visible).map(stationCard).join('');
    loadMore.hidden = matches.length <= state.visible;
    loadMore.textContent = `Покажи още станции (${matches.length - state.visible > 0 ? matches.length - state.visible : 0})`;
  }

  function bindFilters() {
    const search = $('#eko-search');
    const fuel = $('#eko-fuel-filter');
    const loadMore = $('#eko-load-more');
    search?.addEventListener('input', () => {
      state.search = normalize(search.value);
      renderStations(true);
    });
    fuel?.addEventListener('change', () => {
      state.fuel = fuel.value;
      renderStations(true);
    });
    loadMore?.addEventListener('click', () => {
      state.visible += PAGE_SIZE;
      renderStations(false);
    });
  }

  async function init() {
    bindFilters();
    try {
      await loadStations();
      renderStations(true);
    } catch (error) {
      console.error('[eko-hub] Failed to load station registry', error);
      const grid = $('#eko-stations-grid');
      if (grid) grid.innerHTML = '<div class="eko-empty-state">Каталогът на EKO станциите не може да бъде зареден в момента.</div>';
    }

    try {
      const rows = await loadPrices();
      indexPrices(rows);
      renderSummary(rows);
      renderStations(false);
    } catch (error) {
      console.warn('[eko-hub] Failed to load current EKO prices', error);
      renderSummary([]);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();