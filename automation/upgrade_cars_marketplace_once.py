from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
VERSION_OLD = "20260907-cars1"
VERSION_NEW = "20260907-cars2"


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def must_replace(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"Missing expected block: {label}")
    return text.replace(old, new, 1)


# 1) Expanded catalog filters.
path = "cars/index.html"
text = read(path)
old_form = re.search(r'<form id="cars-filter-form" class="cars-filter-grid">.*?</form>', text, flags=re.S)
if not old_form:
    raise SystemExit("cars filter form not found")
new_form = '''<form id="cars-filter-form" class="cars-filter-grid">
      <label class="cars-field search"><span>Марка, модел или заглавие</span><input id="cars-filter-q" type="search" placeholder="BMW 320d"></label>
      <label class="cars-field"><span>Състояние</span><select id="cars-filter-condition"><option value="">Всички</option><option value="new">Нов</option><option value="used">Употребяван</option><option value="damaged">Повреден / ударен</option></select></label>
      <label class="cars-field"><span>Марка</span><select id="cars-filter-make"><option value="">Всички марки</option></select></label>
      <label class="cars-field"><span>Модел</span><select id="cars-filter-model"><option value="">Всички модели</option></select></label>
      <label class="cars-field"><span>Година от</span><input id="cars-filter-year-min" type="number" min="1900" max="2100" step="1" placeholder="2015"></label>
      <label class="cars-field"><span>Година до</span><input id="cars-filter-year-max" type="number" min="1900" max="2100" step="1" placeholder="2026"></label>
      <label class="cars-field"><span>Макс. пробег, км</span><input id="cars-filter-mileage-max" type="number" min="0" step="1000" placeholder="150000"></label>
      <label class="cars-field"><span>Цвят</span><select id="cars-filter-color"><option value="">Всички цветове</option></select></label>
      <label class="cars-field"><span>Цена от €</span><input id="cars-filter-min" type="number" min="0" step="500" placeholder="0"></label>
      <label class="cars-field"><span>Цена до €</span><input id="cars-filter-max" type="number" min="0" step="500" placeholder="50000"></label>
      <label class="cars-field"><span>Категория / купе</span><select id="cars-filter-body"><option value="">Всички категории</option></select></label>
      <label class="cars-field"><span>Гориво</span><select id="cars-filter-fuel"><option value="">Всички типове</option><option>Бензин</option><option>Дизел</option><option>Електрически</option><option>Хибрид</option><option>Plug-in хибрид</option><option>LPG</option><option>Метан</option><option>Водород</option></select></label>
      <label class="cars-field"><span>Кубатура от, см³</span><input id="cars-filter-capacity-min" type="number" min="0" step="100" placeholder="1000"></label>
      <label class="cars-field"><span>Кубатура до, см³</span><input id="cars-filter-capacity-max" type="number" min="0" step="100" placeholder="3000"></label>
      <label class="cars-field"><span>Мощност от, к.с.</span><input id="cars-filter-power-min" type="number" min="0" step="10" placeholder="100"></label>
      <label class="cars-field"><span>Мощност до, к.с.</span><input id="cars-filter-power-max" type="number" min="0" step="10" placeholder="300"></label>
      <label class="cars-field"><span>Скоростна кутия</span><select id="cars-filter-transmission"><option value="">Без значение</option><option>Ръчна</option><option>Автоматична</option></select></label>
      <label class="cars-field"><span>Задвижване</span><select id="cars-filter-drivetrain"><option value="">Без значение</option><option>Предно</option><option>Задно</option><option>4x4</option></select></label>
      <label class="cars-field"><span>Област</span><select id="cars-filter-region"><option value="">Всички области</option></select></label>
      <label class="cars-field"><span>Град</span><select id="cars-filter-city"><option value="">Всички градове</option></select></label>
      <label class="cars-field wide"><span>Дилър / продавач</span><input id="cars-filter-seller" type="search" placeholder="Започнете да пишете име"></label>
      <label class="cars-field wide"><span>Сортиране</span><select id="cars-filter-sort"><option value="newest">Най-нови</option><option value="price-asc">Цена: ниска към висока</option><option value="price-desc">Цена: висока към ниска</option><option value="year-desc">Година: най-нови</option><option value="mileage-asc">Пробег: най-нисък</option><option value="make-asc">Марка / модел</option></select></label>
      <div class="cars-filter-actions"><button id="cars-filter-reset" class="cars-btn secondary" type="button">Изчисти филтрите</button></div>
    </form>'''
text = text[:old_form.start()] + new_form + text[old_form.end():]
write(path, text)

# 2) Richer catalog query/filter logic.
path = "cars/cars.js"
text = read(path)
text = must_replace(
    text,
    ".select('id,title,make,model,year,price,mileage,fuel_type,transmission,city,created_at,is_featured')",
    ".select('id,title,make,model,year,price,mileage,fuel_type,transmission,engine_capacity,power_hp,drivetrain,body_type,color,condition,region,city,seller_name,created_at,is_featured')",
    "catalog select columns",
)

catalog_pattern = re.compile(r"  function populateCatalogFilters\(\) \{.*?\n  function validateFiles\(files\) \{", re.S)
catalog_match = catalog_pattern.search(text)
if not catalog_match:
    raise SystemExit("catalog filter functions not found")
catalog_replacement = r'''  function populateCatalogFilters() {
    const make = $('#cars-filter-make');
    const model = $('#cars-filter-model');
    const region = $('#cars-filter-region');
    const city = $('#cars-filter-city');
    const color = $('#cars-filter-color');
    const body = $('#cars-filter-body');

    const uniqueSorted = values => [...new Set(values.filter(Boolean))]
      .sort((a, b) => String(a).localeCompare(String(b), 'bg'));

    const setOptions = (select, values) => {
      if (!select) return;
      while (select.options.length > 1) select.remove(1);
      values.forEach(value => select.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`));
    };

    setOptions(make, uniqueSorted(state.catalogRows.map(x => x.make)));
    setOptions(region, uniqueSorted(state.catalogRows.map(x => x.region)));
    setOptions(color, uniqueSorted(state.catalogRows.map(x => x.color)));
    setOptions(body, uniqueSorted(state.catalogRows.map(x => x.body_type)));

    const updateModels = () => {
      const selectedMake = make?.value || '';
      setOptions(model, uniqueSorted(state.catalogRows
        .filter(row => !selectedMake || row.make === selectedMake)
        .map(row => row.model)));
      if (model) model.value = '';
    };

    const updateCities = () => {
      const selectedRegion = region?.value || '';
      setOptions(city, uniqueSorted(state.catalogRows
        .filter(row => !selectedRegion || row.region === selectedRegion)
        .map(row => row.city)));
      if (city) city.value = '';
    };

    make?.addEventListener('change', updateModels);
    region?.addEventListener('change', updateCities);
    updateModels();
    updateCities();
  }

  function renderCatalog() {
    const grid = $('#cars-grid');
    if (!grid) return;

    const value = id => $(id)?.value || '';
    const numberValue = id => {
      const raw = value(id);
      return raw === '' ? null : Number(raw);
    };
    const textValue = id => value(id).trim().toLocaleLowerCase('bg-BG');
    const within = (raw, min, max) => {
      if (min == null && max == null) return true;
      if (raw == null || raw === '') return false;
      const numeric = Number(raw);
      return (min == null || numeric >= min) && (max == null || numeric <= max);
    };

    const make = value('#cars-filter-make');
    const model = value('#cars-filter-model');
    const region = value('#cars-filter-region');
    const city = value('#cars-filter-city');
    const fuel = value('#cars-filter-fuel');
    const condition = value('#cars-filter-condition');
    const body = value('#cars-filter-body');
    const color = value('#cars-filter-color');
    const transmission = value('#cars-filter-transmission');
    const drivetrain = value('#cars-filter-drivetrain');
    const q = textValue('#cars-filter-q');
    const seller = textValue('#cars-filter-seller');
    const priceMin = numberValue('#cars-filter-min');
    const priceMax = numberValue('#cars-filter-max');
    const yearMin = numberValue('#cars-filter-year-min');
    const yearMax = numberValue('#cars-filter-year-max');
    const mileageMax = numberValue('#cars-filter-mileage-max');
    const capacityMin = numberValue('#cars-filter-capacity-min');
    const capacityMax = numberValue('#cars-filter-capacity-max');
    const powerMin = numberValue('#cars-filter-power-min');
    const powerMax = numberValue('#cars-filter-power-max');
    const sort = value('#cars-filter-sort') || 'newest';

    const rows = state.catalogRows.filter(row => {
      const haystack = `${row.make || ''} ${row.model || ''} ${row.title || ''}`.toLocaleLowerCase('bg-BG');
      const sellerText = String(row.seller_name || '').toLocaleLowerCase('bg-BG');
      return (!make || row.make === make) &&
        (!model || row.model === model) &&
        (!region || row.region === region) &&
        (!city || row.city === city) &&
        (!fuel || row.fuel_type === fuel) &&
        (!condition || row.condition === condition) &&
        (!body || row.body_type === body) &&
        (!color || row.color === color) &&
        (!transmission || row.transmission === transmission) &&
        (!drivetrain || row.drivetrain === drivetrain) &&
        (!q || haystack.includes(q)) &&
        (!seller || sellerText.includes(seller)) &&
        within(row.price, priceMin, priceMax) &&
        within(row.year, yearMin, yearMax) &&
        (mileageMax == null || (row.mileage != null && Number(row.mileage) <= mileageMax)) &&
        within(row.engine_capacity, capacityMin, capacityMax) &&
        within(row.power_hp, powerMin, powerMax);
    }).slice();

    const featured = (a, b) => Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured));
    const comparators = {
      newest: (a, b) => featured(a, b) || new Date(b.created_at) - new Date(a.created_at),
      'price-asc': (a, b) => featured(a, b) || Number(a.price) - Number(b.price),
      'price-desc': (a, b) => featured(a, b) || Number(b.price) - Number(a.price),
      'year-desc': (a, b) => featured(a, b) || Number(b.year || 0) - Number(a.year || 0),
      'mileage-asc': (a, b) => featured(a, b) || Number(a.mileage ?? Infinity) - Number(b.mileage ?? Infinity),
      'make-asc': (a, b) => featured(a, b) || `${a.make || ''} ${a.model || ''}`.localeCompare(`${b.make || ''} ${b.model || ''}`, 'bg')
    };
    rows.sort(comparators[sort] || comparators.newest);

    const count = $('#cars-results-count');
    if (count) count.textContent = `${rows.length} ${rows.length === 1 ? 'обява' : 'обяви'}`;
    grid.innerHTML = rows.length
      ? rows.map(row => listingCard(row, row._images)).join('')
      : '<div class="cars-empty"><strong>Няма обяви по тези критерии.</strong><span>Променете филтрите или публикувайте първата обява.</span></div>';
  }

  function validateFiles(files) {'''
text = text[:catalog_match.start()] + catalog_replacement + text[catalog_match.end():]

# 3) Cumulative image picker: selecting more files no longer replaces prior selections.
preview_pattern = re.compile(r"  function previewFiles\(input, target\) \{.*?\n  async function uploadListingImages", re.S)
preview_match = preview_pattern.search(text)
if not preview_match:
    raise SystemExit("previewFiles block not found")
preview_replacement = r'''  function fileFingerprint(file) {
    return `${file.name}:${file.size}:${file.lastModified}`;
  }

  function renderSelectedFiles(input, target) {
    if (!input || !target) return;
    const files = input._carsSelectedFiles || [];
    target.innerHTML = '';
    files.forEach((file, index) => {
      const url = URL.createObjectURL(file);
      const item = document.createElement('div');
      item.className = 'cars-upload-preview-item';
      item.innerHTML = `<img src="${url}" alt="Преглед"><button class="cars-remove-upload" type="button" data-remove-file="${index}" aria-label="Премахни ${escapeHtml(file.name)}">×</button><span>${escapeHtml(file.name)}</span>`;
      target.appendChild(item);
    });
  }

  function previewFiles(input, target) {
    if (!input || !target) return;
    const previous = input._carsSelectedFiles || [];
    const incoming = [...input.files];
    const merged = new Map(previous.map(file => [fileFingerprint(file), file]));
    incoming.forEach(file => merged.set(fileFingerprint(file), file));
    const files = [...merged.values()];
    const problem = validateFiles(files);
    input.value = '';
    if (problem) {
      showToast(problem, 'error');
      renderSelectedFiles(input, target);
      return;
    }
    input._carsSelectedFiles = files;
    renderSelectedFiles(input, target);
  }

  function initImagePicker(input, target) {
    if (!input || !target) return;
    input._carsSelectedFiles = [];
    input.addEventListener('change', () => previewFiles(input, target));
    target.addEventListener('click', event => {
      const button = event.target.closest('[data-remove-file]');
      if (!button) return;
      const index = Number(button.dataset.removeFile);
      const files = [...(input._carsSelectedFiles || [])];
      if (!Number.isInteger(index) || index < 0 || index >= files.length) return;
      files.splice(index, 1);
      input._carsSelectedFiles = files;
      renderSelectedFiles(input, target);
    });
  }

  async function uploadListingImages'''
text = text[:preview_match.start()] + preview_replacement + text[preview_match.end():]

old_listener = "imagesInput?.addEventListener('change', () => previewFiles(imagesInput, preview));"
if text.count(old_listener) != 2:
    raise SystemExit(f"Expected 2 image listeners, found {text.count(old_listener)}")
text = text.replace(old_listener, "initImagePicker(imagesInput, preview);")
text = text.replace("const files = [...(imagesInput?.files || [])];", "const files = [...(imagesInput?._carsSelectedFiles || [])];")
write(path, text)

# 4) CSS fixes.
path = "cars/cars.css"
text = read(path)
text = must_replace(
    text,
    ".cars-account-chip strong { color:#166534; }",
    ".cars-account-chip small { display:block; margin-bottom:5px; }\n.cars-account-chip strong { display:block; color:#166534; }",
    "account email spacing",
)
text = must_replace(
    text,
    ".cars-filter-grid .cars-field { grid-column:span 2; }\n.cars-filter-grid .cars-field.search { grid-column:span 4; }\n.cars-filter-actions { display:flex; align-items:flex-end; gap:8px; grid-column:span 2; }",
    ".cars-filter-grid .cars-field { grid-column:span 3; }\n.cars-filter-grid .cars-field.search,\n.cars-filter-grid .cars-field.wide { grid-column:span 6; }\n.cars-filter-actions { display:flex; align-items:flex-end; gap:8px; grid-column:span 3; }",
    "desktop filter grid",
)
text = must_replace(
    text,
    ".cars-upload-preview-item span { display:block; overflow:hidden; padding:7px; color:#64748b; font-size:10px; text-overflow:ellipsis; white-space:nowrap; }",
    ".cars-upload-preview-item span { display:block; overflow:hidden; padding:7px 32px 7px 7px; color:#64748b; font-size:10px; text-overflow:ellipsis; white-space:nowrap; }\n.cars-remove-upload { position:absolute; right:6px; top:6px; width:28px; height:28px; display:grid; place-items:center; border:0; border-radius:999px; background:rgba(15,23,42,.84); color:#fff; cursor:pointer; font-size:20px; line-height:1; box-shadow:0 4px 12px rgba(15,23,42,.2); }\n.cars-remove-upload:hover { background:#b91c1c; }",
    "upload remove button",
)
text = must_replace(
    text,
    "  .cars-filter-grid .cars-field,\n  .cars-filter-grid .cars-field.search { grid-column:span 4; }",
    "  .cars-filter-grid .cars-field,\n  .cars-filter-grid .cars-field.search,\n  .cars-filter-grid .cars-field.wide { grid-column:span 4; }",
    "tablet filter grid",
)
text = must_replace(
    text,
    "  .cars-filter-grid .cars-field,\n  .cars-filter-grid .cars-field.search,\n  .cars-filter-actions,",
    "  .cars-filter-grid .cars-field,\n  .cars-filter-grid .cars-field.search,\n  .cars-filter-grid .cars-field.wide,\n  .cars-filter-actions,",
    "mobile filter grid",
)
write(path, text)

# 5) Clarify image picker behavior.
for form_path in ("cars/new/index.html", "cars/edit/index.html"):
    text = read(form_path)
    text = text.replace(
        "До 15 снимки, максимум 10 MB на файл. Позволени формати: JPG, PNG и WebP.",
        "До 15 снимки, максимум 10 MB на файл. Можеш да добавяш снимки на няколко пъти. Позволени формати: JPG, PNG и WebP.",
    )
    write(form_path, text)

# 6) Separate Stations and Cars hover hit areas on desktop.
path = "pages/styles/global-progress.css"
text = read(path)
anchor = '@media(min-width:901px){.goriva-stations-nav-item:hover .goriva-stations-nav-dropdown,.goriva-stations-nav-item:focus-within .goriva-stations-nav-dropdown{opacity:1;visibility:visible;pointer-events:auto;transform:translateY(0)}}'
if anchor not in text:
    raise SystemExit("desktop stations nav rule not found")
text = text.replace(
    anchor,
    '@media(min-width:901px){.goriva-stations-nav-item{margin-right:9px}.goriva-stations-nav-item:hover .goriva-stations-nav-dropdown,.goriva-stations-nav-item:focus-within .goriva-stations-nav-dropdown{opacity:1;visibility:visible;pointer-events:auto;transform:translateY(0)}}',
    1,
)
write(path, text)

# 7) Permanent cache-busting version bump.
path = "automation/unify_navigation.py"
text = read(path)
text = must_replace(text, f'NAV_VERSION = "{VERSION_OLD}"', f'NAV_VERSION = "{VERSION_NEW}"', "navigation version")
write(path, text)

for html_path in (ROOT / "cars").rglob("*.html"):
    source = html_path.read_text(encoding="utf-8")
    updated = source.replace(VERSION_OLD, VERSION_NEW)
    if updated != source:
        html_path.write_text(updated, encoding="utf-8")

for scratch in (ROOT / ".tmp", ROOT / ".tmp2"):
    if scratch.exists():
        scratch.unlink()

js = read("cars/cars.js")
assert js.count("initImagePicker(imagesInput, preview);") == 2
assert "#cars-filter-year-min" in js and "#cars-filter-year-max" in js
assert "#cars-filter-mileage-max" in js
assert "seller_name" in js and "engine_capacity" in js and "power_hp" in js
assert "cars-remove-upload" in read("cars/cars.css")
assert "margin-right:9px" in read("pages/styles/global-progress.css")
print("Cars marketplace upgrade applied")
