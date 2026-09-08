(() => {
  const page = document.body;
  if (!page?.classList.contains('city-prices-page')) return;

  const SUPABASE_URL = 'https://eaqvhxfvozhzatrnbkvx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH';
  const OFFICIAL_STATIONS = new Set(['ЕКО', 'PETROL']);
  const FUELS = ['Бензин A95', 'Дизел', 'Пропан Бутан', 'Бензин A100', 'Дизел премиум', 'Метан'];
  const LABELS = {'Бензин A95':'A95','Дизел':'Дизел','Пропан Бутан':'LPG','Бензин A100':'A100','Дизел премиум':'Дизел +','Метан':'Метан'};
  const LOGOS = {'ЕКО':'/media/logos/eko.svg','PETROL':'/media/logos/petrol.svg'};
  const logoFor = brand => LOGOS[normalize(brand)] || '';
  const logoMarkup = brand => { const src = logoFor(brand); return src ? '<img class="station-brand-logo" src="' + src + '" alt="' + escapeHtml(brand) + ' лого" loading="lazy" decoding="async">' : ''; };
  const normalize = value => String(value || '').trim().toLocaleUpperCase('bg-BG');
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const dateKey = value => new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Sofia',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
  const humanDate = value => new Intl.DateTimeFormat('bg-BG', {day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Sofia'}).format(new Date(`${value}T12:00:00+03:00`));
  const money = (value, fuel) => `${Number(value).toFixed(2).replace('.', ',')} ${fuel === 'Метан' ? '€/кг' : '€/л'}`;

  function summarize(rows) {
    const stations = new Map();
    const byFuel = new Map(FUELS.map(fuel => [fuel, []]));
    rows.forEach(row => {
      if (!FUELS.includes(row.fuel) || !Number.isFinite(Number(row.price))) return;
      const price = Number(row.price);
      const location = String(row.location || row.station || 'Бензиностанция').trim();
      const station = stations.get(location) || {location, brand:String(row.station || ''), prices:{}};
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

  function render(summary, date) {
    document.getElementById('city-station-count').textContent = summary.stationCount;
    document.getElementById('city-record-count').textContent = summary.records;
    document.getElementById('city-source-summary').textContent = `Импорти: ${summary.brands.join(', ')}`;
    document.getElementById('city-price-date').textContent = humanDate(date);
    document.getElementById('city-loading-status').textContent = `Показани са последните публикувани данни към ${humanDate(date)}`;

    document.getElementById('city-price-cards').innerHTML = FUELS.filter(fuel => summary.fuels[fuel]).map(fuel => {
      const item = summary.fuels[fuel];
      return `<article class="city-price-card" data-fuel="${escapeHtml(fuel)}"><span class="city-price-label">${escapeHtml(LABELS[fuel])}</span><strong>${money(item.average, fuel)}</strong><span>средна цена</span><small>от ${money(item.minimum, fuel)} до ${money(item.maximum, fuel)} · ${item.count} обекта</small></article>`;
    }).join('');

    document.getElementById('city-prices-body').innerHTML = summary.stations.map(station => `<tr><th scope="row"><div class="station-brand">${logoMarkup(station.brand)}<span><strong>${escapeHtml(station.brand)}</strong><span>${escapeHtml(station.location)}</span></span></div></th>${FUELS.map(fuel => `<td data-label="${escapeHtml(LABELS[fuel])}">${station.prices[fuel] == null ? '—' : money(station.prices[fuel], fuel)}</td>`).join('')}</tr>`).join('');
    applyFilter();
  }

  function applyFilter() {
    const fuel = document.getElementById('city-fuel-filter')?.value || 'all';
    const index = FUELS.indexOf(fuel);
    document.querySelectorAll('#city-prices-body tr').forEach(row => {
      row.hidden = index >= 0 && row.children[index + 1]?.textContent.trim() === '—';
    });
  }

  async function loadLatest() {
    const city = page.dataset.city;
    const status = document.getElementById('city-loading-status');
    const params = new URLSearchParams({select:'station,city,region,location,fuel,price,created_at', city:`eq.${city}`, order:'created_at.desc', limit:'1000'});
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/fuel_prices?${params}`, {headers:{apikey:SUPABASE_KEY}, cache:'no-store'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = (await response.json()).filter(row => OFFICIAL_STATIONS.has(normalize(row.station)));
      if (!rows.length) throw new Error('Няма налични публикувани записи');
      const latest = rows.map(row => dateKey(row.created_at)).sort().at(-1);
      render(summarize(rows.filter(row => dateKey(row.created_at) === latest)), latest);
    } catch (error) {
      status.textContent = `${status.textContent} Неуспешно онлайн обновяване; запазени са публикуваните данни от страницата.`;
      console.warn('City prices refresh skipped', error);
    }
  }

  document.getElementById('city-fuel-filter')?.addEventListener('change', applyFilter);
  loadLatest();
})();
