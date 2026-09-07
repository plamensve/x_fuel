from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NAV_VERSION = "20260907-cars3"
# This version also cache-busts the global navigation after consumer UX updates.


def normalize_html(path: Path) -> bool:
    source = path.read_text(encoding="utf-8")
    updated = source

    updated = re.sub(
        r'(<script\b[^>]*\bsrc=["\'])(?:\.\./|/)?scripts/script\.js(?:\?[^"\']*)?(["\'][^>]*></script>)',
        rf'\1/scripts/script.js?v={NAV_VERSION}\2',
        updated,
        flags=re.I,
    )

    if path == ROOT / "index.html" and "/scripts/eko-fallback-efficient.js" not in updated:
        marker = f'<script src="/scripts/script.js?v={NAV_VERSION}"></script>'
        replacement = (
            f'<script src="/scripts/eko-fallback-efficient.js?v={NAV_VERSION}"></script>\n'
            f'{marker}'
        )
        updated = updated.replace(marker, replacement, 1)

    updated = re.sub(
        r'(<script\b[^>]*\bsrc=["\'])(?:\.\./|/)?scripts/site-shell\.js(?:\?[^"\']*)?(["\'][^>]*></script>)',
        rf'\1/scripts/site-shell.js?v={NAV_VERSION}\2',
        updated,
        flags=re.I,
    )

    updated = re.sub(
        r'(<script\b[^>]*\bsrc=["\'])(?:\.\./|/)?scripts/article-engagement\.js(?:\?[^"\']*)?(["\'][^>]*></script>)',
        rf'\1/scripts/article-engagement.js?v={NAV_VERSION}\2',
        updated,
        flags=re.I,
    )

    updated = re.sub(
        r'(<script\b[^>]*\bsrc=["\'])(?:\.\./|/)?scripts/global-nav\.js(?:\?[^"\']*)?(["\'][^>]*></script>)',
        rf'\1/scripts/global-nav.js?v={NAV_VERSION}\2',
        updated,
        flags=re.I,
    )

    updated = re.sub(
        r'(<script\b[^>]*\bsrc=["\'])/scripts/eko-fallback-efficient\.js(?:\?[^"\']*)?(["\'][^>]*></script>)',
        rf'\1/scripts/eko-fallback-efficient.js?v={NAV_VERSION}\2',
        updated,
        flags=re.I,
    )

    updated = re.sub(
        r'\s*<script\b[^>]*\bsrc=["\'](?:\.\./|/)?scripts/stations-nav\.js(?:\?[^"\']*)?["\'][^>]*></script>',
        '',
        updated,
        flags=re.I,
    )

    if updated == source:
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def normalize_text_file(path: Path) -> bool:
    if not path.exists():
        return False
    source = path.read_text(encoding="utf-8")
    updated = source
    updated = re.sub(
        r'/scripts/global-nav\.js\?v=[A-Za-z0-9._-]+',
        f'/scripts/global-nav.js?v={NAV_VERSION}',
        updated,
    )
    updated = re.sub(
        r'/scripts/stations-nav\.js\?v=[A-Za-z0-9._-]+',
        f'/scripts/stations-nav.js?v={NAV_VERSION}',
        updated,
    )
    updated = re.sub(
        r'/scripts/article-engagement\.js\?v=[A-Za-z0-9._-]+',
        f'/scripts/article-engagement.js?v={NAV_VERSION}',
        updated,
    )
    updated = re.sub(
        r'/pages/styles/global-progress\.css\?v=[A-Za-z0-9._-]+',
        f'/pages/styles/global-progress.css?v={NAV_VERSION}',
        updated,
    )
    if updated == source:
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def update_text(path: Path, transform) -> bool:
    source = path.read_text(encoding="utf-8")
    updated = transform(source)
    if updated == source:
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def polish_car_marketplace() -> list[str]:
    changed: list[str] = []

    car_pages = [
        ROOT / "cars" / "index.html",
        ROOT / "cars" / "new" / "index.html",
        ROOT / "cars" / "my" / "index.html",
        ROOT / "cars" / "edit" / "index.html",
        ROOT / "cars" / "view" / "index.html",
    ]
    for path in car_pages:
        if path.exists() and update_text(path, lambda text: re.sub(r"20260907-cars\d+", NAV_VERSION, text)):
            changed.append(path.relative_to(ROOT).as_posix())

    my_path = ROOT / "cars" / "my" / "index.html"
    def update_my(text: str) -> str:
        old = '<div class="cars-hero-aside"><div class="cars-hero-stat"><strong>Сигурно управление</strong><span>Достъпът е свързан с твоя Supabase user ID</span></div></div>'
        new = '<div class="cars-hero-aside"><div class="cars-hero-stat"><strong>Всичко на едно място</strong><span>Редактирай обявите си, актуализирай информацията и отбелязвай продадените автомобили.</span></div><div class="cars-hero-stat"><strong>Бърз достъп</strong><span>Влизаш с еднократен код, без да помниш парола.</span></div></div>'
        return text.replace(old, new)
    if update_text(my_path, update_my):
        changed.append(my_path.relative_to(ROOT).as_posix())

    new_path = ROOT / "cars" / "new" / "index.html"
    def update_new(text: str) -> str:
        old = '<div class="cars-auth-copy"><span class="cars-kicker" style="color:#2563eb">Сигурен достъп</span><h2>Вход за публикуване</h2><p>Използваме email OTP вместо парола. По този начин разпознаваме собственика на обявата и позволяваме редактиране само от неговия профил.</p></div>'
        new = '<div class="cars-auth-copy"><span class="cars-kicker" style="color:#2563eb">Бърз и сигурен вход</span><h2>Вход за публикуване</h2><p>Въведи своя email и ще получиш еднократен код за вход. Не е нужно да създаваш или помниш парола.</p></div>'
        return text.replace(old, new)
    if update_text(new_path, update_new):
        changed.append(new_path.relative_to(ROOT).as_posix())

    catalog_path = ROOT / "cars" / "index.html"
    def update_catalog(text: str) -> str:
        old_heading = '''<section class="cars-panel">
    <div class="cars-panel-heading">
      <div><h2>Търси автомобил</h2><p>Филтрирай наличните обяви по основните критерии.</p></div>
    </div>'''
        new_heading = '''<section class="cars-panel cars-search-panel">
    <div class="cars-panel-heading cars-search-heading">
      <div class="cars-search-heading-copy"><span class="cars-search-eyebrow">Разширено търсене</span><h2>Търси автомобил</h2><p>Избери най-важните критерии и намери автомобилите, които отговарят на твоите изисквания.</p></div>
      <div class="cars-search-heading-badge" aria-hidden="true"><span>⌕</span><strong>Намери точния автомобил</strong></div>
    </div>'''
        text = text.replace(old_heading, new_heading)
        text = text.replace('      <label class="cars-field"><span>Цвят</span><select id="cars-filter-color"><option value="">Всички цветове</option></select></label>\n', '')
        return text
    if update_text(catalog_path, update_catalog):
        changed.append(catalog_path.relative_to(ROOT).as_posix())

    js_path = ROOT / "cars" / "cars.js"
    def update_cars_js(text: str) -> str:
        text = text.replace(
            ".select('id,title,make,model,year,price,mileage,fuel_type,transmission,engine_capacity,power_hp,drivetrain,body_type,color,condition,region,city,seller_name,created_at,is_featured')",
            ".select('id,title,make,model,year,price,mileage,fuel_type,transmission,engine_capacity,power_hp,drivetrain,body_type,condition,region,city,seller_name,created_at,is_featured')",
        )
        text = text.replace("    const color = $('#cars-filter-color');\n", '')
        text = text.replace("    setOptions(color, uniqueSorted(state.catalogRows.map(x => x.color)));\n", '')
        text = text.replace("    const color = value('#cars-filter-color');\n", '')
        text = text.replace("        (!color || row.color === color) &&\n", '')

        if 'cars-add-photo-tile' not in text:
            pattern = re.compile(r"  function renderSelectedFiles\(input, target\) \{.*?\n  \}\n\n  function previewFiles", re.S)
            replacement = '''  function renderSelectedFiles(input, target) {
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

    if (files.length < MAX_IMAGES) {
      const addTile = document.createElement('label');
      addTile.className = 'cars-add-photo-tile';
      addTile.htmlFor = input.id;
      addTile.innerHTML = `<span class="cars-add-photo-icon" aria-hidden="true">+</span><strong>Добави снимки</strong><small>${files.length}/${MAX_IMAGES}</small>`;
      target.appendChild(addTile);
    }
  }

  function previewFiles'''
            text = pattern.sub(replacement, text, count=1)
            text = text.replace(
                "    target.addEventListener('click', event => {\n",
                "    renderSelectedFiles(input, target);\n    target.addEventListener('click', event => {\n",
                1,
            )
        return text
    if update_text(js_path, update_cars_js):
        changed.append(js_path.relative_to(ROOT).as_posix())

    css_path = ROOT / "cars" / "cars.css"
    def update_cars_css(text: str) -> str:
        anchor = '''.cars-filter-grid .cars-field { grid-column:span 3; }
.cars-filter-grid .cars-field.search,
.cars-filter-grid .cars-field.wide { grid-column:span 6; }
.cars-filter-actions { display:flex; align-items:flex-end; gap:8px; grid-column:span 3; }
'''
        if '.cars-search-panel {' not in text:
            enhanced = anchor + '''
.cars-search-panel {
  position:relative;
  overflow:hidden;
  border-color:#cbd9ea;
  background:radial-gradient(circle at 100% 0,rgba(37,99,235,.10),transparent 30%),linear-gradient(180deg,#fff 0%,#f7faff 100%);
  box-shadow:0 24px 58px rgba(15,23,42,.10);
}
.cars-search-panel::before { content:""; position:absolute; top:0; left:0; right:0; height:4px; background:linear-gradient(90deg,#2563eb 0%,#0ea5e9 48%,#0f766e 100%); }
.cars-search-heading { position:relative; align-items:center; padding-bottom:20px; border-bottom:1px solid #e4ebf5; }
.cars-search-heading-copy { max-width:760px; }
.cars-search-eyebrow { display:inline-flex; margin-bottom:7px; color:#2563eb; font-size:11px; font-weight:950; letter-spacing:.12em; text-transform:uppercase; }
.cars-search-heading-badge { display:flex; align-items:center; gap:10px; padding:12px 16px; border:1px solid #d7e3f4; border-radius:14px; background:rgba(255,255,255,.82); color:#334155; box-shadow:0 8px 24px rgba(15,23,42,.06); white-space:nowrap; }
.cars-search-heading-badge span { display:grid; place-items:center; width:34px; height:34px; border-radius:10px; background:linear-gradient(135deg,#2563eb,#0f766e); color:#fff; font-size:22px; font-weight:900; }
.cars-search-heading-badge strong { font-size:13px; }
.cars-search-panel .cars-filter-grid { gap:16px 14px; }
.cars-search-panel .cars-field span { color:#475569; font-size:11px; letter-spacing:.055em; }
.cars-search-panel .cars-field input,
.cars-search-panel .cars-field select { min-height:50px; border-color:#c8d6e8; border-radius:13px; background:#fff; box-shadow:0 1px 2px rgba(15,23,42,.03); transition:border-color .16s ease,box-shadow .16s ease,transform .16s ease; }
.cars-search-panel .cars-field input:hover,
.cars-search-panel .cars-field select:hover { border-color:#9fb8d8; }
.cars-search-panel .cars-field input:focus,
.cars-search-panel .cars-field select:focus { border-color:#3b82f6; box-shadow:0 0 0 4px rgba(59,130,246,.10),0 8px 20px rgba(15,23,42,.05); }
.cars-search-panel .cars-filter-actions .cars-btn { min-height:50px; padding:0 22px; border-color:#b9c9de; background:#fff; box-shadow:0 6px 16px rgba(15,23,42,.05); }
'''
            text = text.replace(anchor, enhanced)

        text = text.replace(
            '.cars-upload-box input[type=file] { width:100%; }',
            '.cars-upload-box input[type=file] { position:absolute; width:1px; height:1px; overflow:hidden; opacity:0; pointer-events:none; }',
        )
        if '.cars-add-photo-tile {' not in text:
            anchor2 = '.cars-remove-upload:hover { background:#b91c1c; }\n'
            extra = anchor2 + '''.cars-add-photo-tile { min-height:0; aspect-ratio:4/3; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; border:2px dashed #7cb3f7; border-radius:12px; background:linear-gradient(145deg,#f8fbff,#edf5ff); color:#2563eb; cursor:pointer; text-align:center; transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease,background .16s ease; }
.cars-add-photo-tile:hover { transform:translateY(-2px); border-color:#2563eb; background:#fff; box-shadow:0 10px 24px rgba(37,99,235,.12); }
.cars-add-photo-icon { display:grid; place-items:center; width:48px; height:48px; border-radius:999px; background:linear-gradient(135deg,#2563eb,#0f766e); color:#fff; font-size:34px; font-weight:500; line-height:1; box-shadow:0 8px 18px rgba(37,99,235,.20); }
.cars-add-photo-tile strong { font-size:12px; }
.cars-add-photo-tile small { color:#64748b; font-size:10px; font-weight:800; }
'''
            text = text.replace(anchor2, extra)
        if '.cars-search-heading-badge { width:100%;' not in text:
            text = text.replace(
                '  .cars-panel-heading { flex-direction:column; }\n',
                '  .cars-panel-heading { flex-direction:column; }\n  .cars-search-heading-badge { width:100%; box-sizing:border-box; justify-content:flex-start; white-space:normal; }\n',
                1,
            )
        return text
    if update_text(css_path, update_cars_css):
        changed.append(css_path.relative_to(ROOT).as_posix())

    nav_css = ROOT / "pages" / "styles" / "global-progress.css"
    def update_nav_css(text: str) -> str:
        text = text.replace(
            '@media(min-width:901px){.goriva-stations-nav-item{margin-right:9px}',
            '@media(min-width:901px){.goriva-global-menu{gap:4px!important}.goriva-global-menu>a{margin:0 2px!important}.goriva-stations-nav-item{margin:0 8px 0 2px}',
        )
        if '.goriva-global-nav-shell{width:min(1480px' not in text:
            wide = '''@media(min-width:1200px){
  .goriva-global-nav-shell{width:min(1480px,calc(100% - 32px))!important;max-width:1480px!important;gap:18px!important;padding-left:8px!important;padding-right:8px!important}
  .goriva-global-menu{gap:7px!important}
  .goriva-global-menu>a{padding-left:12px!important;padding-right:12px!important}
  .goriva-stations-nav-toggle{padding-left:12px!important;padding-right:12px!important}
}
'''
            text = text.replace('@media(max-width:900px){\n', wide + '@media(max-width:900px){\n', 1)
        return text
    if update_text(nav_css, update_nav_css):
        changed.append(nav_css.relative_to(ROOT).as_posix())

    failed_workflow = ROOT / ".github" / "workflows" / "cars-consumer-ux-polish-once.yml"
    if failed_workflow.exists():
        failed_workflow.unlink()
        changed.append(failed_workflow.relative_to(ROOT).as_posix())

    return changed


def main() -> None:
    changed: list[str] = []

    html_files = [ROOT / "index.html"]
    for html_root in (ROOT / "pages", ROOT / "stations"):
        if html_root.exists():
            html_files.extend(sorted(html_root.rglob("*.html")))
    for path in html_files:
        if path.exists() and normalize_html(path):
            changed.append(path.relative_to(ROOT).as_posix())

    text_files = [
        ROOT / "scripts" / "article-engagement.js",
        ROOT / "scripts" / "script.js",
        ROOT / "scripts" / "site-shell.js",
        ROOT / "scripts" / "global-nav.js",
    ]
    text_files.extend(sorted((ROOT / "automation").glob("*.py")))
    for path in text_files:
        if normalize_text_file(path):
            changed.append(path.relative_to(ROOT).as_posix())

    changed.extend(polish_car_marketplace())

    unique_changed = list(dict.fromkeys(changed))
    print(f"Unified navigation references / polished UX in {len(unique_changed)} files")
    for item in unique_changed:
        print(f" - {item}")


if __name__ == "__main__":
    main()
