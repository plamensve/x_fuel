(() => {
  const page = document.body;
  if (!page?.classList.contains('city-prices-page')) return;

  const SUPABASE_URL = 'https://eaqvhxfvozhzatrnbkvx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH';
  const FUELS = ['Бензин A95', 'Дизел', 'Пропан Бутан', 'Бензин A100', 'Дизел премиум', 'Метан'];
  const LABELS = {'Бензин A95':'A95','Дизел':'Дизел','Пропан Бутан':'LPG','Бензин A100':'A100','Дизел премиум':'Дизел +','Метан':'Метан'};
  const LOGOS = [
    {match:['ECO PETROL','ЕКО ПЕТРОЛ'],src:'/images/station_logos/ecopetrol.svg'},
    {match:['ЕКО','EKO'],src:'/images/station_logos/eko-card-logo.png'},
    {match:['POWER OIL','POWERОIL','ПАУЪР ОЙЛ'],src:'/images/station_logos/power-oil.png'},
    {match:['ТОПЛИВО','TOPLIVO'],src:'/images/station_logos/toplivo-logo.png'},
    {match:['ПЕГАС','PEGAS'],src:'/images/station_logos/pegas-logo.png'},
    {match:['ROMPETROL','РОМПЕТРОЛ'],src:'/images/station_logos/rompetrol.svg'},
    {match:['PETROL','ПЕТРОЛ'],src:'/images/station_logos/petrol-logo.jpg'},
    {match:['INSA','ИНСА'],src:'/images/station_logos/insa-card-logo.png'},
    {match:['OMV'],src:'/images/station_logos/omv.svg'},
    {match:['SHELL','ШЕЛ'],src:'/images/station_logos/shell.svg'},
    {match:['LUKOIL','ЛУКОЙЛ'],src:'/images/station_logos/lukoil-card-logo.jpg'},
    {match:['KRUiz','КРУИЗ'],src:'/images/station_logos/kruiz.svg'},
    {match:['BULMARKET','БУЛМАРКЕТ'],src:'/images/station_logos/bulmarket.svg'},
    {match:['HIMOIL','ХИМОЙЛ'],src:'/images/station_logos/himoil.svg'},
    {match:['DIESELOR','DISELOR','DIESELER','ДИЗЕЛОР'],src:'/images/station_logos/dieselor-logo.jpg'}
  ];
  const logoFor = brand => {
    const normalized = normalize(brand);
    return LOGOS.find(item => item.match.some(token => normalized.includes(token)))?.src || '/images/station_logos/unknown.svg';
  };
  const logoMarkup = brand => { const src = logoFor(brand); return src ? '<img class="station-brand-logo" src="' + src + '" alt="' + escapeHtml(brand) + ' лого" loading="lazy" decoding="async">' : ''; };
  const normalize = value => String(value || '').trim().toLocaleUpperCase('bg-BG');
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const dateKey = value => new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Sofia',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
  const humanDate = value => new Intl.DateTimeFormat('bg-BG', {day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Sofia'}).format(new Date(`${value}T12:00:00+03:00`));
  const money = (value, fuel) => `${Number(value).toFixed(2).replace('.', ',')} ${fuel === 'Метан' ? '€/кг' : '€/л'}`;

  function initCitySwitcher() {
    const slider = document.querySelector('[data-city-switcher]');
    const viewport = slider?.querySelector('.city-switch-viewport');
    const track = slider?.querySelector('.city-switch-track');
    const previous = slider?.querySelector('.city-switch-arrow.is-prev');
    const next = slider?.querySelector('.city-switch-arrow.is-next');
    const status = slider?.querySelector('.city-switch-status');
    if (!slider || !viewport || !track || !previous || !next || !status) return;

    let frame = 0;
    const metrics = () => {
      const cards = [...track.querySelectorAll('.city-switch-link')];
      const cardWidth = cards[0]?.getBoundingClientRect().width || viewport.clientWidth;
      const itemsPerPage = Math.max(1, Math.round(viewport.clientWidth / Math.max(1, cardWidth + 9)));
      const pages = Math.max(1, Math.ceil(cards.length / itemsPerPage));
      const maxScroll = Math.max(0, track.scrollWidth - viewport.clientWidth);
      const pageIndex = maxScroll ? Math.round((viewport.scrollLeft / maxScroll) * (pages - 1)) : 0;
      return { cards, itemsPerPage, pages, maxScroll, pageIndex };
    };

    const update = () => {
      const { pages, maxScroll, pageIndex } = metrics();
      previous.disabled = pages <= 1;
      next.disabled = pages <= 1;
      status.textContent = `${pageIndex + 1} / ${pages}`;
      slider.dataset.page = String(pageIndex);
      slider.style.setProperty('--city-switch-progress', maxScroll ? viewport.scrollLeft / maxScroll : 0);
    };

    const requestUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    const goToPage = (pageIndex, behavior = 'smooth') => {
      const { pages, maxScroll } = metrics();
      const normalizedPage = pages > 1 ? (pageIndex + pages) % pages : 0;
      viewport.scrollTo({left: pages > 1 ? maxScroll * normalizedPage / (pages - 1) : 0, behavior});
    };

    const move = direction => {
      const { pageIndex } = metrics();
      goToPage(pageIndex + direction, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
    };

    const revealCurrentCity = () => {
      const { cards, itemsPerPage } = metrics();
      const activeIndex = Math.max(0, cards.findIndex(card => card.classList.contains('is-current')));
      goToPage(Math.floor(activeIndex / itemsPerPage), 'auto');
      requestUpdate();
    };

    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    viewport.addEventListener('scroll', requestUpdate, {passive:true});
    viewport.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    });
    window.addEventListener('resize', requestUpdate, {passive:true});
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(requestUpdate);
      observer.observe(viewport);
      observer.observe(track);
    }
    requestAnimationFrame(revealCurrentCity);
  }

  function summarize(rows) {
    const stations = new Map();
    const byFuel = new Map(FUELS.map(fuel => [fuel, []]));
    rows.forEach(row => {
      if (!FUELS.includes(row.fuel) || !Number.isFinite(Number(row.price))) return;
      const price = Number(row.price);
      const location = String(row.location || row.station || 'Бензиностанция').trim();
      const sourceDate = dateKey(row._source_created_at || row.created_at);
      const station = stations.get(location) || {location, brand:String(row.station || ''), phone:String(row.phone || ''), date:sourceDate, prices:{}};
      if (sourceDate > station.date) station.date = sourceDate;
      if (!(row.fuel in station.prices) || price < station.prices[row.fuel]) station.prices[row.fuel] = price;
      stations.set(location, station);
      byFuel.get(row.fuel).push({price, location});
    });
    const fuels = {};
    byFuel.forEach((items, fuel) => {
      if (!items.length) return;
      const values = items.map(item => item.price);
      fuels[fuel] = {average:values.reduce((a,b)=>a+b,0)/values.length, minimum:Math.min(...values), maximum:Math.max(...values), count:new Set(items.map(item=>item.location)).size};
    });
    return {records:rows.length, stationCount:stations.size, brands:[...new Set(rows.map(row=>row.station))].sort((a,b)=>String(a).localeCompare(String(b),'bg')), fuels, stations:[...stations.values()].sort((a,b)=>`${a.brand}|${a.location}`.localeCompare(`${b.brand}|${b.location}`,'bg'))};
  }


  let stationRows = [];
  let currentStationDate = '';
  const CONTACTS = new Map();
  let visibleStationCount = 9;
  async function loadContacts() {
    try {
      const response = await fetch('/data/eko_stations.json', {cache:'force-cache'});
      if (!response.ok) return;
      const payload = await response.json();
      Object.values(payload.stations || {}).forEach(station => {
        if (station.station_id && station.phone) CONTACTS.set(String(station.station_id), String(station.phone));
      });
    } catch (error) {
      console.warn('Station contacts unavailable', error);
    }
  }

  function contactFor(station) {
    const match = String(station.location || '').match(/(?:ЕКО|EKO)\s*(\d+)/i);
    return station.phone || (match ? CONTACTS.get(match[1]) || '' : '');
  }

  function renderDirectory(stations) {
    stationRows = stations;
    const section = document.querySelector('.city-stations');
    const tableWrap = section?.querySelector('.city-table-wrap');
    if (!section || !tableWrap) return;
    let directory = section.querySelector('.city-directory');
    if (!directory) {
      directory = document.createElement('div');
      directory.className = 'city-directory';
      directory.innerHTML = '<div class="city-directory-filters" role="search"><div class="city-directory-field"><label for="city-station-search">Търсене</label><input id="city-station-search" type="search" autocomplete="off" placeholder="Например: София, 1181, Сливница…"></div><div class="city-directory-field"><label for="city-fuel-filter">Налично гориво</label><select id="city-fuel-filter"><option value="all">Всички горива</option>'+FUELS.map(fuel => '<option value="'+escapeHtml(fuel)+'">'+escapeHtml(LABELS[fuel])+'</option>').join('')+'</select></div></div><div id="city-stations-grid" class="city-stations-grid"></div><div class="city-load-more-wrap"><button id="city-load-more" class="city-load-more" type="button">Зареди още карти</button></div>';
      tableWrap.parentNode.insertBefore(directory, tableWrap);
      document.getElementById('city-station-search').addEventListener('input', () => { visibleStationCount = 9; paintDirectory(); });
      document.getElementById('city-fuel-filter').addEventListener('change', () => { visibleStationCount = 9; paintDirectory(); });
      document.getElementById('city-load-more').addEventListener('click', () => { visibleStationCount += 9; paintDirectory(); });
    }
    visibleStationCount = 9;
    paintDirectory();
  }

  function paintDirectory() {
    const search = (document.getElementById('city-station-search')?.value || '').trim().toLocaleLowerCase('bg-BG');
    const fuel = document.getElementById('city-fuel-filter')?.value || 'all';
    const filtered = stationRows.filter(station => {
      const haystack = (station.brand+' '+station.location).toLocaleLowerCase('bg-BG');
      return (!search || haystack.includes(search)) && (fuel === 'all' || station.prices[fuel] != null);
    });
    const shown = filtered.slice(0, visibleStationCount);
    const grid = document.getElementById('city-stations-grid');
    if (!grid) return;
    grid.innerHTML = shown.map(station => '<article class="city-station-card"><div class="city-station-head"><div><strong>'+escapeHtml(station.brand)+'</strong><span>'+escapeHtml(station.location)+'</span></div>'+logoMarkup(station.brand).replace('station-brand-logo','city-station-logo')+'</div><div class="city-station-date">Цени към дата '+humanDate(station.date || currentStationDate)+'</div><div class="city-station-status" aria-label="Актуални данни"><i></i></div><div class="city-station-prices">'+FUELS.map(fuel => '<div class="city-station-price '+(station.prices[fuel] == null ? 'is-missing' : '')+'"><span>'+escapeHtml(LABELS[fuel])+'</span><strong>'+(station.prices[fuel] == null ? '-' : money(station.prices[fuel], fuel))+'</strong></div>').join('')+'</div>'+(contactFor(station) ? '<a class="city-station-phone" href="tel:'+escapeHtml(contactFor(station))+'">☎ '+escapeHtml(contactFor(station).replace(/^\\+359/, '+359 '))+'</a>' : '<div class="city-station-footer">Провери актуалната цена на място</div>')+'</article>').join('');
    const more = document.getElementById('city-load-more');
    if (more) more.hidden = filtered.length <= visibleStationCount;
  }

  function render(summary, date) {
    currentStationDate = date;
    document.getElementById('city-station-count').textContent = summary.stationCount;
    document.getElementById('city-record-count').textContent = summary.records;
    document.getElementById('city-source-summary').textContent = `Импорти: ${summary.brands.join(', ')}`;
    document.getElementById('city-price-date').textContent = humanDate(date);
    document.getElementById('city-loading-status').textContent = `Показани са последните публикувани данни към ${humanDate(date)}`;

    document.getElementById('city-price-cards').innerHTML = FUELS.filter(fuel => summary.fuels[fuel]).map(fuel => {
      const item = summary.fuels[fuel];
      return `<article class="city-price-card" data-fuel="${escapeHtml(fuel)}"><span class="city-price-label">${escapeHtml(LABELS[fuel])}</span><strong>${money(item.average, fuel)}</strong><span>средна цена</span><small>от ${money(item.minimum, fuel)} до ${money(item.maximum, fuel)} · ${item.count} обекта</small></article>`;
    }).join('');

    renderDirectory(summary.stations);
  }

  function applyFilter() {
    const fuel = document.getElementById('city-fuel-filter')?.value || 'all';
    const index = FUELS.indexOf(fuel);
    document.querySelectorAll('#city-prices-body tr').forEach(row => {
      row.hidden = index >= 0 && row.children[index + 1]?.textContent.trim() === '—';
    });
  }

  function selectPublishedSnapshot(rows) {
    const latest = rows.map(row => dateKey(row.created_at)).sort().at(-1);
    const latestRows = rows.filter(row => dateKey(row.created_at) === latest);
    const currentEkoStations = new Set(
      latestRows.filter(row => normalize(row.station) === 'ЕКО').map(row => normalize(row.location) || normalize(row.city))
    );
    const fallback = new Map();

    // Keep the homepage EKO fallback: when an EKO object has no record in the
    // latest import, include its newest published row for every fuel type.
    rows.forEach(row => {
      if (normalize(row.station) !== 'ЕКО' || dateKey(row.created_at) === latest) return;
      const station = normalize(row.location) || normalize(row.city);
      if (!station || currentEkoStations.has(station)) return;
      const key = `${station}|${normalize(row.fuel)}`;
      if (!fallback.has(key)) fallback.set(key, row);
    });

    return {latest, rows:[...latestRows, ...fallback.values()]};
  }

  async function loadLatest() {
    const city = page.dataset.city;
    const status = document.getElementById('city-loading-status');
    // Use the same published fuel_prices records as the homepage section.
    // City values arrive from different importers with different casing, while
    // PostgREST's `eq` operator is case-sensitive (e.g. София != СОФИЯ).
    const params = new URLSearchParams({select:'station,city,region,location,fuel,price,created_at', city:`ilike.${city}`, order:'created_at.desc', limit:'1000'});
    try {
      await loadContacts();
      const response = await fetch(`${SUPABASE_URL}/rest/v1/fuel_prices?${params}`, {headers:{apikey:SUPABASE_KEY}, cache:'no-store'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = (await response.json());
      if (!rows.length) throw new Error('Няма налични публикувани записи');
      const snapshot = selectPublishedSnapshot(rows);
      render(summarize(snapshot.rows), snapshot.latest);
    } catch (error) {
      status.textContent = `${status.textContent} Неуспешно онлайн обновяване; запазени са публикуваните данни от страницата.`;
      console.warn('City prices refresh skipped', error);
    }
  }

  initCitySwitcher();
  loadLatest();
})();
