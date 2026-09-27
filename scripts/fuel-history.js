(() => {
    const KEY = 'sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH';
    const API = 'https://eaqvhxfvozhzatrnbkvx.supabase.co/rest/v1/fuel_prices';
    const aliases = {
        A95: ['A95', 'Бензин A95'], Дизел: ['Дизел'], A100: ['A100', 'Бензин A100'],
        'Дизел +': ['Дизел +', 'Дизел премиум'], LPG: ['LPG', 'Пропан Бутан'], Метан: ['Метан']
    };
    const fuel = document.body.dataset.historyFuel;
    const period = document.body.dataset.historyPeriod;
    if (!aliases[fuel] || !['week', 'month', 'three-months', 'year'].includes(period)) return;
    const sofiaFormatter = new Intl.DateTimeFormat('en', {timeZone: 'Europe/Sofia', year: 'numeric', month: '2-digit', day: '2-digit'});
    const dateKey = value => {
        const parts = Object.fromEntries(sofiaFormatter.formatToParts(value).map(part => [part.type, part.value]));
        return `${parts.year}-${parts.month}-${parts.day}`;
    };
    const today = dateKey(new Date());
    const [y, m, d] = today.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, d, 12));
    if (period === 'week') start.setUTCDate(start.getUTCDate() - 6);
    else if (period === 'month') start.setUTCMonth(start.getUTCMonth() - 1);
    else if (period === 'three-months') start.setUTCMonth(start.getUTCMonth() - 3);
    else start.setUTCFullYear(start.getUTCFullYear() - 1);
    const startKey = dateKey(start);
    // Request one extra UTC day at each end: grouping below uses Europe/Sofia time.
    const from = new Date(`${startKey}T00:00:00Z`);
    from.setUTCDate(from.getUTCDate() - 1);
    const until = new Date(`${today}T00:00:00Z`);
    until.setUTCDate(until.getUTCDate() + 2);
    const status = document.getElementById('history-status');
    const formatPrice = number => `${number.toFixed(3)} €`;
    const formatDate = value => new Intl.DateTimeFormat('bg-BG', {day: 'numeric', month: 'long', year: 'numeric'}).format(new Date(`${value}T12:00:00Z`));
    const setText = (id, value) => { document.getElementById(id).textContent = value; };
    const stationKey = row => [row.station, row.city, row.location].map(v => String(v || '').trim().toLocaleLowerCase('bg-BG')).join('|');
    async function fetchRows() {
        const all = [];
        const batchSize = 1000;
        const query = new URLSearchParams({select: 'created_at,price,fuel,station,city,location', created_at: `gte.${from.toISOString()}`, order: 'created_at.asc', limit: String(batchSize)});
        query.append('created_at', `lt.${until.toISOString()}`);
        query.set('fuel', `in.(${aliases[fuel].map(value => `"${value}"`).join(',')})`);
        for (let offset = 0; ; offset += batchSize) {
            query.set('offset', String(offset));
            const response = await fetch(`${API}?${query}`, {headers: {apikey: KEY}});
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const batch = await response.json();
            all.push(...batch);
            if (batch.length < batchSize) break;
            status.textContent = `Обработени ${all.length.toLocaleString('bg-BG')} ценови записа…`;
        }
        return all;
    }
    function groupDaily(rows) {
        const latest = new Map();
        rows.forEach(row => {
            const time = Date.parse(row.created_at);
            const price = Number(row.price);
            if (!Number.isFinite(time) || !Number.isFinite(price) || price <= 0) return;
            const date = dateKey(new Date(time));
            if (date < startKey || date > today) return;
            const key = `${date}|${stationKey(row)}`;
            const prior = latest.get(key);
            if (!prior || time >= prior.time) latest.set(key, {date, time, price});
        });
        const grouped = new Map();
        latest.forEach(row => {
            if (!grouped.has(row.date)) grouped.set(row.date, []);
            grouped.get(row.date).push(row.price);
        });
        return [...grouped].sort(([a], [b]) => a.localeCompare(b)).map(([date, prices]) => ({date, count: prices.length, average: prices.reduce((a, b) => a + b, 0) / prices.length}));
    }
    async function main() {
        try {
            const data = groupDaily(await fetchRows());
            if (!data.length) {
                status.textContent = 'Няма публикувани цени за това гориво през избрания период.';
                return;
            }
            const first = data[0], last = data[data.length - 1];
            const difference = last.average - first.average;
            const roundedDifference = Math.round(difference * 1000) / 1000;
            const direction = roundedDifference > 0 ? 'up' : roundedDifference < 0 ? 'down' : 'flat';
            const changeCard = document.getElementById('history-change-card');
            changeCard.classList.add(`history-change-${direction}`);
            const directionIcon = changeCard.querySelector('.history-direction-icon');
            directionIcon.innerHTML = direction === 'flat'
                ? '<svg viewBox="0 0 24 24"><path d="M4 12h16"/></svg>'
                : '<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
            setText('history-direction-label', `${direction === 'up' ? 'Поскъпване' : direction === 'down' ? 'Поевтиняване' : 'Без промяна'} спрямо първия ден`);
            setText('history-latest', formatPrice(last.average));
            setText('history-date', `към ${formatDate(last.date)}`);
            setText('history-change', `${roundedDifference > 0 ? '+' : ''}${roundedDifference.toFixed(3)} €`);
            setText('history-days', String(data.length));
            setText('history-stations', String(last.count));
            status.textContent = `Показани ${data.length} дни с данни от ${formatDate(first.date)} до ${formatDate(last.date)}.`;
            if (typeof Chart !== 'function') {
                status.textContent += ' Графиката не може да се зареди в момента.';
                return;
            }
            const byDate = new Map(data.map(row => [row.date, row]));
            const series = [];
            for (const cursor = new Date(`${startKey}T12:00:00Z`); dateKey(cursor) <= today; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
                const key = dateKey(cursor);
                series.push({date: key, ...byDate.get(key)});
            }
            new Chart(document.getElementById('history-canvas'), {
                type: 'line',
                data: {labels: series.map(row => formatDate(row.date)), datasets: [{label: 'Средна цена, €/л', data: series.map(row => row.average ?? null), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.14)', fill: true, spanGaps: false, tension: .2, pointRadius: series.length > 100 ? 0 : 2, pointHoverRadius: 5}]},
                options: {responsive: true, maintainAspectRatio: false, interaction: {intersect: false, mode: 'index'}, plugins: {legend: {labels: {color: '#cbd5e1'}}, tooltip: {callbacks: {label: context => `${formatPrice(context.parsed.y)} /л · ${series[context.dataIndex].count} обекта`}}}, scales: {x: {ticks: {color: '#9fb0c5', maxTicksLimit: 9}, grid: {color: 'rgba(148,163,184,.08)'}}, y: {ticks: {color: '#9fb0c5', callback: value => `${Number(value).toFixed(2)} €`}, grid: {color: 'rgba(148,163,184,.1)'}}}}
            });
        } catch (error) {
            console.error('Fuel history unavailable', error);
            status.textContent = 'Цените не могат да се заредят сега. Опитай отново след малко.';
        }
    }
    main();
})();
