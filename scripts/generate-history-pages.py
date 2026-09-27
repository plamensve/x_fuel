"""Generate the static, crawlable fuel and period history pages."""
from pathlib import Path
from html import escape
import json

ROOT = Path(__file__).resolve().parents[1]
FUELS = {
    'benzin-a95': ('Бензин А95', 'A95', 'бензин А95'),
    'dizel': ('Дизел', 'Дизел', 'дизел'),
    'benzin-a100': ('Бензин А100', 'A100', 'бензин А100'),
    'dizel-plus': ('Дизел +', 'Дизел +', 'премиум дизел'),
    'lpg': ('LPG', 'LPG', 'пропан-бутан (LPG)'),
    'metan': ('Метан', 'Метан', 'метан'),
}
FUEL_CONTEXT = {
    'benzin-a95': 'А95 е стандартен бензин. При сравнение на цени проверявай дали избраната станция публикува точно този вид, тъй като премиум бензинът е отделна категория.',
    'dizel': 'Тук се проследяват записите за обикновен дизел. Цените на премиум дизел се разглеждат отделно в страницата за Дизел +.',
    'benzin-a100': 'Бензин А100 е отделен от А95 в изчисленията. Броят станции с публикувана цена за А100 може да е различен от този за масовия бензин.',
    'dizel-plus': 'Дизел + обединява публикуваните записи за премиум дизел. Имената на продукта могат да се различават между веригите, затова сравнявай и конкретната оферта на обекта.',
    'lpg': 'LPG означава пропан-бутан за автомобили. На сайта категорията включва и записи, обозначени като „Пропан Бутан“.',
    'metan': 'Метанът се отчита като отделен вид гориво. При сравнение с бензин или дизел имай предвид, че единиците за продажба и разходът на автомобила може да са различни.',
}
PERIOD_CONTEXT = {
    'week': 'Седмичният изглед е подходящ за проверка на последните промени. При резки движения виж и колко обекта участват във всяка дневна средна стойност.',
    'month': 'Месечният изглед помага да различиш еднодневните колебания от по-устойчива промяна. Графиката показва само дни, за които има действително публикувани цени.',
    'three-months': 'Изгледът за три месеца дава по-дълъг контекст за движението на цените. Ако наблюдаваните обекти се променят, средните стойности за различните дни не са напълно съпоставими.',
    'year': 'Годишният изглед обхваща наличната история през последните дванадесет месеца. Ако събирането на данни е започнало по-късно, графиката показва само реално наличните дни.',
}
PERIODS = {
    'week': ('последната седмица', '7 дни'),
    'month': ('последния месец', '30 дни'),
    'three-months': ('последните 3 месеца', '3 месеца'),
    'year': ('последната година', '1 година'),
}
for slug, (fuel, normalized, natural) in FUELS.items():
    for period, (period_text, period_label) in PERIODS.items():
        url = f'https://goriva.online/pages/history/{slug}/{period}/'
        title = f'История на цената на {fuel} за {period_text} | goriva.online'
        description = f'Виж движението на цената на {natural} в България за {period_text}: графика, средни стойности по дни и брой наблюдавани обекти.'
        period_links = ''.join(f'<a href="/pages/history/{slug}/{key}/" {"aria-current=\"page\"" if key == period else ""}>{label}</a>' for key, (_, label) in PERIODS.items())
        fuel_links = ''.join(f'<a href="/pages/history/{key}/{period}/" {"aria-current=\"page\"" if key == slug else ""}>{label}</a>' for key, (label, _, _) in FUELS.items())
        schema = {'@context': 'https://schema.org', '@graph': [
            {'@type': 'WebPage', '@id': url+'#webpage', 'url': url, 'name': title, 'description': description, 'inLanguage': 'bg-BG'},
            {'@type': 'BreadcrumbList', 'itemListElement': [
                {'@type': 'ListItem', 'position': 1, 'name': 'Начало', 'item': 'https://goriva.online/'},
                {'@type': 'ListItem', 'position': 2, 'name': 'История на цените', 'item': 'https://goriva.online/pages/trends.html'},
                {'@type': 'ListItem', 'position': 3, 'name': fuel, 'item': f'https://goriva.online/pages/history/{slug}/week/'},
                {'@type': 'ListItem', 'position': 4, 'name': period_label, 'item': url},
            ]},
        ]}
        html = f'''<!doctype html>
<html lang="bg"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="index,follow,max-image-preview:large">
<title>{escape(title)}</title><meta name="description" content="{escape(description)}">
<link rel="canonical" href="{url}"><link rel="icon" type="image/svg+xml" href="/media/fav.svg">
<meta property="og:type" content="website"><meta property="og:locale" content="bg_BG"><meta property="og:site_name" content="goriva.online">
<meta property="og:title" content="{escape(title)}"><meta property="og:description" content="{escape(description)}"><meta property="og:url" content="{url}"><meta property="og:image" content="https://goriva.online/media/og-3.png">
<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/pages/styles/useful.css"><link rel="stylesheet" href="/pages/styles/trends.css"><link rel="stylesheet" href="/pages/styles/fuel-history.css">
<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
<script src="https://cdn.jsdelivr.net/npm/chart.js" defer></script><script src="/scripts/site-shell.js" defer></script><script src="/scripts/fuel-history.js" defer></script>
</head><body id="top" data-history-fuel="{escape(normalized)}" data-history-period="{period}">
<div class="background"></div>
<main class="container trends-page fuel-history-page">
<nav class="history-breadcrumbs" aria-label="Път на страницата"><a href="/">Начало</a><span>›</span><a href="/pages/trends.html">История на цените</a><span>›</span><span>{escape(fuel)} · {escape(period_label)}</span></nav>
<section class="history-hero" aria-labelledby="history-title"><div class="history-hero-copy">
<div class="hero-label">Анализ на пазара · {escape(period_label)}</div>
<h1 id="history-title">История на цената на {escape(fuel)} за {escape(period_text)}</h1>
<p class="history-lead">Проследи средната публикувана цена на {escape(natural)} в България по дни. Графиката и обобщението използват наличните записи от наблюдаваните бензиностанции за избрания период.</p>
<div class="hero-actions"><a class="history-primary-action" href="#history-chart">Виж графиката</a><a class="history-secondary-action" href="/pages/trends.html">Календар на всички горива</a></div>
</div><aside class="hero-guide-card"><div class="guide-card-header"><div><span>Как да четеш данните</span><strong>Сравнявай равни периоди</strong></div></div>
<ol class="guide-steps"><li><span>1</span><div><strong>Избери период</strong><small>Всеки бутон има собствен адрес.</small></div></li><li><span>2</span><div><strong>Следи средната цена</strong><small>Всяка точка е ден с налични записи.</small></div></li><li><span>3</span><div><strong>Провери обхвата</strong><small>Броят обекти може да се мени между дните.</small></div></li></ol></aside></section>
<nav class="history-switches" aria-label="Избери гориво"><strong>Гориво</strong><div>{fuel_links}</div></nav>
<nav class="history-switches" aria-label="Избери период"><strong>Период</strong><div>{period_links}</div></nav>
<section class="overview-grid" aria-label="Обобщение за периода">
<article class="overview-card overview-blue"><div><span>Последна средна цена</span><strong id="history-latest">—</strong><small id="history-date">Изчакване на данните</small></div></article>
<article class="overview-card overview-green"><div><span>Промяна в периода</span><strong id="history-change">—</strong><small>спрямо първия наличен ден</small></div></article>
<article class="overview-card overview-violet"><div><span>Дни с данни</span><strong id="history-days">—</strong><small>от избрания период</small></div></article>
<article class="overview-card overview-amber"><div><span>Наблюдавани обекти</span><strong id="history-stations">—</strong><small>на последната дата</small></div></article></section>
<section id="history-chart" class="chart-section dashboard-panel" aria-labelledby="chart-heading"><div class="chart-header-layout"><div class="chart-copy"><span class="section-eyebrow">Исторически данни</span><h2 id="chart-heading" class="chart-title">Средна цена на {escape(fuel)} · {escape(period_label)}</h2><p class="chart-description">Средна цена в евро за литър от последната публикувана стойност за всеки обект за деня. Дните без данни не се свързват с измислени стойности.</p></div></div>
<p id="history-status" role="status">Зареждане на цените…</p><div class="chart-container"><canvas id="history-canvas" role="img" aria-label="Графика на средната цена на {escape(fuel)} за {escape(period_text)}"></canvas></div></section>
<section class="history-explainer dashboard-panel"><h2>Как се изчислява историята на {escape(natural)}?</h2>
<p>За всяка дата използваме последната налична публикувана цена за отделен обект и изчисляваме аритметична средна стойност на наблюдаваните обекти в България. Това е средна цена от наличната извадка, а не официална средна за всички бензиностанции. Когато липсват записи за ден, в графиката няма точка.</p>
<p>Периодът „{escape(period_label)}“ завършва с днешния ден по часовата зона на България. При сравнението между първата и последната стойност отчитай и броя обекти: различният обхват на наблюдение може да повлияе на средната цена. За конкретна бензиностанция провери последната публикувана цена преди зареждане; цените на място могат да се различават.</p>
<p>Разгледай <a href="/pages/trends.html">календара с всички горива</a> или избери друго гориво и период от бутоните по-горе. Така можеш да сравниш кратките колебания с по-дългото развитие на цените, без да смесваш различните видове гориво.</p></section>
<section class="history-explainer dashboard-panel"><h2>Какво да имаш предвид за {escape(fuel)}?</h2><p>{escape(FUEL_CONTEXT[slug])}</p><p>{escape(PERIOD_CONTEXT[period])} Средната стойност е ориентир за наблюдаваните обекти, а преди пътуване е полезно да провериш цената и местоположението на конкретната бензиностанция.</p></section>
</main></body></html>'''
        target = ROOT / 'pages' / 'history' / slug / period / 'index.html'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(html, encoding='utf-8')
