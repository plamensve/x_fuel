(() => {
  const SUPABASE_URL = 'https://eaqvhxfvozhzatrnbkvx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH';
  const BUCKET = 'car-images';
  const MAX_IMAGES = 15;
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

  if (!window.supabase?.createClient) {
    console.error('Supabase client library is not available.');
    return;
  }

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  const page = document.body.dataset.carsPage || '';
  const state = {
    session: null,
    user: null,
    catalogRows: [],
    currentListing: null,
    currentImages: []
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const formatPrice = value => new Intl.NumberFormat('bg-BG', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0
  }).format(Number(value || 0));

  const formatNumber = value => new Intl.NumberFormat('bg-BG').format(Number(value || 0));
  const formatDate = value => value ? new Intl.DateTimeFormat('bg-BG', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(new Date(value)) : '';

  function publicImageUrl(path) {
    if (!path) return '';
    return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl || '';
  }

  function showToast(message, type = 'info') {
    let toast = $('#cars-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cars-toast';
      toast.className = 'cars-toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.dataset.type = type;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 3600);
  }

  function setBusy(button, busy, label = 'Моля, изчакайте…') {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.textContent = label;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalText || button.textContent;
      button.disabled = false;
    }
  }

  function slugify(value) {
    return String(value || '')
      .toLocaleLowerCase('bg-BG')
      .normalize('NFKD')
      .replace(/[^a-z0-9а-я]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 70);
  }

  async function refreshSession() {
    const { data, error } = await db.auth.getSession();
    if (error) console.warn('Could not read auth session', error);
    state.session = data?.session || null;
    state.user = state.session?.user || null;
    renderAuthState();
    return state.user;
  }

  function renderAuthState() {
    const loggedIn = Boolean(state.user);
    $$('.cars-auth-only').forEach(el => el.hidden = !loggedIn);
    $$('.cars-guest-only').forEach(el => el.hidden = loggedIn);
    $$('.cars-user-email').forEach(el => el.textContent = state.user?.email || '');
  }

  function initAuthForms() {
    $$('.cars-auth-box').forEach(box => {
      const emailForm = $('.cars-email-form', box);
      const otpForm = $('.cars-otp-form', box);
      const emailInput = $('input[type="email"]', emailForm || box);
      const otpInput = $('input[name="otp"]', otpForm || box);
      const back = $('.cars-otp-back', box);

      emailForm?.addEventListener('submit', async event => {
        event.preventDefault();
        const button = $('button[type="submit"]', emailForm);
        const email = emailInput?.value.trim();
        if (!email) return;
        setBusy(button, true, 'Изпращане…');
        const { error } = await db.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true }
        });
        setBusy(button, false);
        if (error) {
          showToast(error.message || 'Не успяхме да изпратим код.', 'error');
          return;
        }
        box.dataset.authEmail = email;
        emailForm.hidden = true;
        if (otpForm) otpForm.hidden = false;
        otpInput?.focus();
        const hint = $('.cars-otp-hint', box);
        if (hint) hint.textContent = `Изпратихме код на ${email}`;
        showToast('Кодът за вход е изпратен.', 'success');
      });

      otpForm?.addEventListener('submit', async event => {
        event.preventDefault();
        const button = $('button[type="submit"]', otpForm);
        const email = box.dataset.authEmail || emailInput?.value.trim();
        const token = otpInput?.value.trim();
        if (!email || !token) return;
        setBusy(button, true, 'Проверка…');
        const { error } = await db.auth.verifyOtp({ email, token, type: 'email' });
        setBusy(button, false);
        if (error) {
          showToast('Кодът е невалиден или е изтекъл.', 'error');
          return;
        }
        if (otpForm) otpForm.hidden = true;
        if (emailForm) emailForm.hidden = false;
        if (otpInput) otpInput.value = '';
        await refreshSession();
        showToast('Влязохте успешно.', 'success');
        document.dispatchEvent(new CustomEvent('cars:auth-ready'));
      });

      back?.addEventListener('click', () => {
        if (otpForm) otpForm.hidden = true;
        if (emailForm) emailForm.hidden = false;
      });
    });

    $$('.cars-signout').forEach(button => button.addEventListener('click', async () => {
      await db.auth.signOut();
      await refreshSession();
      showToast('Излязохте от профила.', 'success');
      document.dispatchEvent(new CustomEvent('cars:auth-ready'));
    }));
  }

  async function fetchImagesForListings(ids) {
    if (!ids.length) return new Map();
    const { data, error } = await db
      .from('car_listing_images')
      .select('listing_id,storage_path,position')
      .in('listing_id', ids)
      .order('position', { ascending: true });
    if (error) {
      console.warn('Could not load car images', error);
      return new Map();
    }
    const grouped = new Map();
    (data || []).forEach(image => {
      if (!grouped.has(image.listing_id)) grouped.set(image.listing_id, []);
      grouped.get(image.listing_id).push(image);
    });
    return grouped;
  }

  function listingCard(listing, images = []) {
    const cover = images[0]?.storage_path ? publicImageUrl(images[0].storage_path) : '';
    const title = listing.title || `${listing.make} ${listing.model}`;
    return `
      <article class="car-card">
        <a class="car-card-media" href="/cars/view/?id=${encodeURIComponent(listing.id)}" aria-label="${escapeHtml(title)}">
          ${cover ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async">` : '<div class="car-card-placeholder"><span>🚘</span><small>Няма снимка</small></div>'}
          ${listing.is_featured ? '<span class="car-card-featured">TOP</span>' : ''}
        </a>
        <div class="car-card-body">
          <div class="car-card-heading">
            <div><span class="car-card-make">${escapeHtml(listing.make || '')}</span><h2>${escapeHtml(title)}</h2></div>
            <strong>${formatPrice(listing.price)}</strong>
          </div>
          <div class="car-card-meta">
            <span>${escapeHtml(listing.year || '—')} г.</span>
            <span>${listing.mileage != null ? `${formatNumber(listing.mileage)} км` : '—'}</span>
            <span>${escapeHtml(listing.fuel_type || '—')}</span>
            <span>${escapeHtml(listing.transmission || '—')}</span>
          </div>
          <div class="car-card-foot">
            <span>📍 ${escapeHtml(listing.city || '')}</span>
            <span>${formatDate(listing.created_at)}</span>
          </div>
        </div>
      </article>`;
  }

  async function initCatalog() {
    const grid = $('#cars-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="cars-loading">Зареждане на обявите…</div>';
    const { data, error } = await db
      .from('car_listings')
      .select('id,title,make,model,year,price,mileage,fuel_type,transmission,city,created_at,is_featured')
      .eq('status', 'active')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error(error);
      grid.innerHTML = '<div class="cars-empty"><strong>Не успяхме да заредим обявите.</strong><span>Опитайте отново след малко.</span></div>';
      return;
    }

    state.catalogRows = data || [];
    const images = await fetchImagesForListings(state.catalogRows.map(row => row.id));
    state.catalogRows = state.catalogRows.map(row => ({ ...row, _images: images.get(row.id) || [] }));
    populateCatalogFilters();
    renderCatalog();
    $('#cars-filter-form')?.addEventListener('input', renderCatalog);
    $('#cars-filter-form')?.addEventListener('change', renderCatalog);
    $('#cars-filter-reset')?.addEventListener('click', () => {
      $('#cars-filter-form')?.reset();
      renderCatalog();
    });
  }

  function populateCatalogFilters() {
    const make = $('#cars-filter-make');
    const city = $('#cars-filter-city');
    const addOptions = (select, values) => {
      if (!select) return;
      values.forEach(value => select.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`));
    };
    addOptions(make, [...new Set(state.catalogRows.map(x => x.make).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'bg')));
    addOptions(city, [...new Set(state.catalogRows.map(x => x.city).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'bg')));
  }

  function renderCatalog() {
    const grid = $('#cars-grid');
    if (!grid) return;
    const make = $('#cars-filter-make')?.value || '';
    const city = $('#cars-filter-city')?.value || '';
    const fuel = $('#cars-filter-fuel')?.value || '';
    const q = ($('#cars-filter-q')?.value || '').trim().toLocaleLowerCase('bg-BG');
    const min = Number($('#cars-filter-min')?.value || 0);
    const maxRaw = $('#cars-filter-max')?.value;
    const max = maxRaw ? Number(maxRaw) : Infinity;

    const rows = state.catalogRows.filter(row => {
      const haystack = `${row.make || ''} ${row.model || ''} ${row.title || ''}`.toLocaleLowerCase('bg-BG');
      return (!make || row.make === make) &&
        (!city || row.city === city) &&
        (!fuel || row.fuel_type === fuel) &&
        (!q || haystack.includes(q)) &&
        Number(row.price || 0) >= min && Number(row.price || 0) <= max;
    });

    const count = $('#cars-results-count');
    if (count) count.textContent = `${rows.length} ${rows.length === 1 ? 'обява' : 'обяви'}`;
    grid.innerHTML = rows.length
      ? rows.map(row => listingCard(row, row._images)).join('')
      : '<div class="cars-empty"><strong>Няма обяви по тези критерии.</strong><span>Променете филтрите или публикувайте първата обява.</span></div>';
  }

  function validateFiles(files) {
    if (files.length > MAX_IMAGES) return `Можете да качите максимум ${MAX_IMAGES} снимки.`;
    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) return 'Позволени са JPG, PNG и WebP снимки.';
      if (file.size > MAX_FILE_SIZE) return `Файлът ${file.name} е по-голям от 10 MB.`;
    }
    return '';
  }

  function previewFiles(input, target) {
    if (!input || !target) return;
    const files = [...input.files];
    const problem = validateFiles(files);
    if (problem) {
      showToast(problem, 'error');
      input.value = '';
      target.innerHTML = '';
      return;
    }
    target.innerHTML = '';
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      const item = document.createElement('div');
      item.className = 'cars-upload-preview-item';
      item.innerHTML = `<img src="${url}" alt="Преглед"><span>${escapeHtml(file.name)}</span>`;
      target.appendChild(item);
    });
  }

  async function uploadListingImages(listingId, files, startPosition = 0) {
    if (!files.length) return [];
    const rows = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `${state.user.id}/${listingId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await db.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600', upsert: false, contentType: file.type
      });
      if (uploadError) throw uploadError;
      rows.push({
        listing_id: listingId,
        user_id: state.user.id,
        storage_path: path,
        position: startPosition + index
      });
    }
    const { error: rowError } = await db.from('car_listing_images').insert(rows);
    if (rowError) {
      await db.storage.from(BUCKET).remove(rows.map(row => row.storage_path));
      throw rowError;
    }
    return rows;
  }

  function readListingForm(form) {
    const value = name => form.elements[name]?.value?.trim() || '';
    const numberOrNull = name => {
      const raw = value(name);
      return raw === '' ? null : Number(raw);
    };
    const title = value('title');
    return {
      title,
      make: value('make'),
      model: value('model'),
      generation: value('generation') || null,
      modification: value('modification') || null,
      year: Number(value('year')),
      price: Number(value('price')),
      currency: 'EUR',
      mileage: numberOrNull('mileage'),
      fuel_type: value('fuel_type') || null,
      transmission: value('transmission') || null,
      engine_capacity: numberOrNull('engine_capacity'),
      power_hp: numberOrNull('power_hp'),
      drivetrain: value('drivetrain') || null,
      body_type: value('body_type') || null,
      color: value('color') || null,
      doors: numberOrNull('doors'),
      seats: numberOrNull('seats'),
      vin: value('vin') || null,
      condition: value('condition') || 'used',
      region: value('region') || null,
      city: value('city'),
      description: value('description') || null,
      seller_name: value('seller_name'),
      seller_phone: value('seller_phone'),
      seller_email: value('seller_email') || state.user?.email || null
    };
  }

  function fillListingForm(form, listing) {
    if (!form || !listing) return;
    Object.entries(listing).forEach(([key, value]) => {
      const field = form.elements[key];
      if (field && value != null) field.value = value;
    });
  }

  async function initNewListing() {
    const form = $('#car-listing-form');
    const imagesInput = $('#car-images');
    const preview = $('#car-images-preview');
    imagesInput?.addEventListener('change', () => previewFiles(imagesInput, preview));

    form?.addEventListener('submit', async event => {
      event.preventDefault();
      if (!state.user) {
        showToast('Първо влезте с email код.', 'error');
        return;
      }
      const files = [...(imagesInput?.files || [])];
      const problem = validateFiles(files);
      if (problem) return showToast(problem, 'error');
      const button = $('button[type="submit"]', form);
      setBusy(button, true, 'Публикуване…');
      try {
        const payload = readListingForm(form);
        payload.user_id = state.user.id;
        payload.status = 'draft';
        payload.slug = `${slugify(`${payload.make}-${payload.model}-${payload.year}`)}-${crypto.randomUUID().slice(0, 8)}`;
        const { data, error } = await db.from('car_listings').insert(payload).select('id').single();
        if (error) throw error;
        if (files.length) await uploadListingImages(data.id, files, 0);
        const { error: publishError } = await db.from('car_listings').update({ status: 'active' }).eq('id', data.id);
        if (publishError) throw publishError;
        showToast('Обявата е публикувана успешно.', 'success');
        window.location.href = `/cars/view/?id=${encodeURIComponent(data.id)}`;
      } catch (error) {
        console.error(error);
        showToast(error.message || 'Не успяхме да публикуваме обявата.', 'error');
      } finally {
        setBusy(button, false);
      }
    });
  }

  async function loadMyListings() {
    const grid = $('#my-cars-grid');
    if (!grid) return;
    if (!state.user) {
      grid.innerHTML = '';
      return;
    }
    grid.innerHTML = '<div class="cars-loading">Зареждане на вашите обяви…</div>';
    const { data, error } = await db
      .from('car_listings')
      .select('*')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending: false });
    if (error) {
      grid.innerHTML = '<div class="cars-empty">Не успяхме да заредим обявите.</div>';
      return;
    }
    const rows = data || [];
    const images = await fetchImagesForListings(rows.map(row => row.id));
    grid.innerHTML = rows.length ? rows.map(row => {
      const cover = images.get(row.id)?.[0]?.storage_path;
      return `
        <article class="my-car-card" data-listing-id="${escapeHtml(row.id)}">
          <div class="my-car-media">${cover ? `<img src="${escapeHtml(publicImageUrl(cover))}" alt="${escapeHtml(row.title)}" loading="lazy">` : '<span>🚘</span>'}</div>
          <div class="my-car-info">
            <div class="my-car-title-row"><div><span class="status-pill status-${escapeHtml(row.status)}">${escapeHtml(statusLabel(row.status))}</span><h2>${escapeHtml(row.title)}</h2></div><strong>${formatPrice(row.price)}</strong></div>
            <p>${escapeHtml(row.make)} ${escapeHtml(row.model)} · ${escapeHtml(row.year)} г. · ${row.mileage != null ? `${formatNumber(row.mileage)} км` : 'без пробег'}</p>
            <div class="my-car-actions">
              <a class="cars-btn secondary" href="/cars/view/?id=${encodeURIComponent(row.id)}">Преглед</a>
              <a class="cars-btn secondary" href="/cars/edit/?id=${encodeURIComponent(row.id)}">Редактирай</a>
              ${row.status !== 'active' ? `<button class="cars-btn secondary" data-action="active" type="button">Активирай</button>` : `<button class="cars-btn secondary" data-action="sold" type="button">Маркирай като продадена</button>`}
              <button class="cars-btn danger" data-action="delete" type="button">Изтрий</button>
            </div>
          </div>
        </article>`;
    }).join('') : '<div class="cars-empty"><strong>Все още нямате обяви.</strong><a class="cars-btn primary" href="/cars/new/">Публикувай първата обява</a></div>';
  }

  function statusLabel(status) {
    return ({ active: 'Активна', draft: 'Чернова', sold: 'Продадена', hidden: 'Скрита' })[status] || status;
  }

  async function initMyListings() {
    $('#my-cars-grid')?.addEventListener('click', async event => {
      const button = event.target.closest('button[data-action]');
      if (!button || !state.user) return;
      const card = button.closest('[data-listing-id]');
      const id = card?.dataset.listingId;
      const action = button.dataset.action;
      if (!id) return;
      if (action === 'delete') {
        if (!window.confirm('Сигурни ли сте, че искате да изтриете обявата?')) return;
        setBusy(button, true, 'Изтриване…');
        const { data: imageRows } = await db.from('car_listing_images').select('storage_path').eq('listing_id', id);
        if (imageRows?.length) await db.storage.from(BUCKET).remove(imageRows.map(row => row.storage_path));
        const { error } = await db.from('car_listings').delete().eq('id', id);
        setBusy(button, false);
        if (error) return showToast(error.message, 'error');
        showToast('Обявата е изтрита.', 'success');
        await loadMyListings();
        return;
      }
      const { error } = await db.from('car_listings').update({ status: action }).eq('id', id);
      if (error) return showToast(error.message, 'error');
      showToast(action === 'active' ? 'Обявата е активирана.' : 'Обявата е маркирана като продадена.', 'success');
      await loadMyListings();
    });
    document.addEventListener('cars:auth-ready', loadMyListings);
    if (state.user) await loadMyListings();
  }

  async function initViewListing() {
    const root = $('#car-detail');
    if (!root) return;
    const id = new URLSearchParams(location.search).get('id');
    if (!id) {
      root.innerHTML = '<div class="cars-empty">Липсва идентификатор на обявата.</div>';
      return;
    }
    const { data: listing, error } = await db.from('car_listings').select('*').eq('id', id).single();
    if (error || !listing) {
      root.innerHTML = '<div class="cars-empty"><strong>Обявата не е налична.</strong><a href="/cars/">Към всички обяви</a></div>';
      return;
    }
    const images = await fetchImagesForListings([id]);
    const imageRows = images.get(id) || [];
    const urls = imageRows.map(row => publicImageUrl(row.storage_path));
    document.title = `${listing.title} | goriva.online`;
    root.innerHTML = `
      <div class="car-detail-grid">
        <section class="car-gallery">
          <div class="car-gallery-main">${urls[0] ? `<img id="car-main-image" src="${escapeHtml(urls[0])}" alt="${escapeHtml(listing.title)}">` : '<div class="car-detail-placeholder">🚘</div>'}</div>
          ${urls.length > 1 ? `<div class="car-gallery-thumbs">${urls.map((url, index) => `<button type="button" data-image="${escapeHtml(url)}" class="${index === 0 ? 'is-active' : ''}"><img src="${escapeHtml(url)}" alt="Снимка ${index + 1}" loading="lazy"></button>`).join('')}</div>` : ''}
        </section>
        <aside class="car-detail-summary">
          <span class="detail-eyebrow">${escapeHtml(listing.make)} · ${escapeHtml(listing.model)}</span>
          <h1>${escapeHtml(listing.title)}</h1>
          <div class="detail-price">${formatPrice(listing.price)}</div>
          <div class="detail-location">📍 ${escapeHtml(listing.city)}${listing.region ? `, ${escapeHtml(listing.region)}` : ''}</div>
          <div class="detail-contact">
            <strong>${escapeHtml(listing.seller_name)}</strong>
            <a class="cars-btn primary" href="tel:${escapeHtml(listing.seller_phone)}">☎ ${escapeHtml(listing.seller_phone)}</a>
            ${listing.seller_email ? `<a class="cars-btn secondary" href="mailto:${escapeHtml(listing.seller_email)}">✉ Email</a>` : ''}
          </div>
        </aside>
      </div>
      <section class="car-detail-section">
        <h2>Характеристики</h2>
        <div class="car-spec-grid">
          ${spec('Година', listing.year ? `${listing.year} г.` : '')}
          ${spec('Пробег', listing.mileage != null ? `${formatNumber(listing.mileage)} км` : '')}
          ${spec('Гориво', listing.fuel_type)}
          ${spec('Скоростна кутия', listing.transmission)}
          ${spec('Мощност', listing.power_hp ? `${listing.power_hp} к.с.` : '')}
          ${spec('Кубатура', listing.engine_capacity ? `${listing.engine_capacity} см³` : '')}
          ${spec('Задвижване', listing.drivetrain)}
          ${spec('Купе', listing.body_type)}
          ${spec('Цвят', listing.color)}
          ${spec('Състояние', conditionLabel(listing.condition))}
        </div>
      </section>
      <section class="car-detail-section">
        <h2>Описание</h2>
        <p class="car-description">${escapeHtml(listing.description || 'Няма добавено описание.')}</p>
      </section>`;

    $$('.car-gallery-thumbs button', root).forEach(button => button.addEventListener('click', () => {
      const main = $('#car-main-image', root);
      if (main) main.src = button.dataset.image;
      $$('.car-gallery-thumbs button', root).forEach(x => x.classList.toggle('is-active', x === button));
    }));
  }

  function spec(label, value) {
    if (!value) return '';
    return `<div class="car-spec"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }

  function conditionLabel(value) {
    return ({ new: 'Нов', used: 'Употребяван', damaged: 'Повреден' })[value] || value || '';
  }

  async function initEditListing() {
    const form = $('#car-listing-form');
    const id = new URLSearchParams(location.search).get('id');
    const existing = $('#existing-images');
    const imagesInput = $('#car-images');
    const preview = $('#car-images-preview');
    imagesInput?.addEventListener('change', () => previewFiles(imagesInput, preview));

    async function load() {
      if (!state.user || !id || !form) return;
      const { data: listing, error } = await db.from('car_listings').select('*').eq('id', id).single();
      if (error || !listing || listing.user_id !== state.user.id) {
        form.hidden = true;
        showToast('Нямате достъп до тази обява.', 'error');
        return;
      }
      state.currentListing = listing;
      fillListingForm(form, listing);
      const images = await fetchImagesForListings([id]);
      state.currentImages = images.get(id) || [];
      renderExistingImages(existing);
    }

    existing?.addEventListener('click', async event => {
      const button = event.target.closest('[data-delete-image]');
      if (!button || !state.user) return;
      const path = button.dataset.deleteImage;
      if (!window.confirm('Да изтрием ли тази снимка?')) return;
      const { error: storageError } = await db.storage.from(BUCKET).remove([path]);
      if (storageError) return showToast(storageError.message, 'error');
      const { error: rowError } = await db.from('car_listing_images').delete().eq('listing_id', id).eq('storage_path', path);
      if (rowError) return showToast(rowError.message, 'error');
      state.currentImages = state.currentImages.filter(row => row.storage_path !== path);
      renderExistingImages(existing);
      showToast('Снимката е изтрита.', 'success');
    });

    form?.addEventListener('submit', async event => {
      event.preventDefault();
      if (!state.user || !id) return;
      const files = [...(imagesInput?.files || [])];
      if (state.currentImages.length + files.length > MAX_IMAGES) return showToast(`Максимум ${MAX_IMAGES} снимки общо.`, 'error');
      const problem = validateFiles(files);
      if (problem) return showToast(problem, 'error');
      const button = $('button[type="submit"]', form);
      setBusy(button, true, 'Запазване…');
      try {
        const payload = readListingForm(form);
        const { error } = await db.from('car_listings').update(payload).eq('id', id);
        if (error) throw error;
        if (files.length) await uploadListingImages(id, files, state.currentImages.length);
        showToast('Промените са запазени.', 'success');
        window.location.href = `/cars/view/?id=${encodeURIComponent(id)}`;
      } catch (error) {
        console.error(error);
        showToast(error.message || 'Не успяхме да запазим промените.', 'error');
      } finally {
        setBusy(button, false);
      }
    });

    document.addEventListener('cars:auth-ready', load);
    if (state.user) await load();
  }

  function renderExistingImages(target) {
    if (!target) return;
    target.innerHTML = state.currentImages.length ? state.currentImages.map(row => `
      <div class="cars-existing-image">
        <img src="${escapeHtml(publicImageUrl(row.storage_path))}" alt="Снимка на обявата" loading="lazy">
        <button type="button" data-delete-image="${escapeHtml(row.storage_path)}">Изтрий</button>
      </div>`).join('') : '<p class="cars-muted">Няма качени снимки.</p>';
  }

  async function boot() {
    initAuthForms();
    await refreshSession();
    db.auth.onAuthStateChange((_event, session) => {
      state.session = session;
      state.user = session?.user || null;
      renderAuthState();
    });

    if (page === 'catalog') await initCatalog();
    if (page === 'new') await initNewListing();
    if (page === 'my') await initMyListings();
    if (page === 'view') await initViewListing();
    if (page === 'edit') await initEditListing();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
