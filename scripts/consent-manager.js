(() => {
  if (window.__GORIVA_CONSENT_MANAGER__) return;
  window.__GORIVA_CONSENT_MANAGER__ = true;

  const STORAGE_KEY = 'goriva_consent_v1';
  const VERSION = 1;

  const defaults = { necessary: true, analytics: false, ads: false, functional: false, version: VERSION };
  const loadStored = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.version !== VERSION) return null;
      return { ...defaults, ...parsed, necessary: true };
    } catch (_) { return null; }
  };

  const ensureGtag = () => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
  };

  function updateGoogleConsent(state) {
    ensureGtag();
    window.gtag('consent', 'update', {
      analytics_storage: state.analytics ? 'granted' : 'denied',
      ad_storage: state.ads ? 'granted' : 'denied',
      ad_user_data: state.ads ? 'granted' : 'denied',
      ad_personalization: state.ads ? 'granted' : 'denied',
      functionality_storage: state.functional ? 'granted' : 'denied',
      personalization_storage: state.functional ? 'granted' : 'denied',
      security_storage: 'granted'
    });
  }

  function loadHotjarOnce() {
    const existingHotjar = [...document.scripts].some(script =>
      script.src && script.src.includes('static.hotjar.com/c/hotjar-')
    );

    if (window.__GORIVA_HOTJAR_LOADED__ || existingHotjar) {
      window.__GORIVA_HOTJAR_LOADED__ = true;
      return;
    }

    window.__GORIVA_HOTJAR_LOADED__ = true;
    window.hj = window.hj || function(){ (window.hj.q = window.hj.q || []).push(arguments); };
    window._hjSettings = { hjid: 6686373, hjsv: 6 };
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://static.hotjar.com/c/hotjar-${window._hjSettings.hjid}.js?sv=${window._hjSettings.hjsv}`;
    document.head.appendChild(script);
  }

  function persist(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, version: VERSION, savedAt: new Date().toISOString() }));
    updateGoogleConsent(state);
    if (state.analytics) loadHotjarOnce();
    window.dispatchEvent(new CustomEvent('goriva:consent-changed', { detail: state }));
  }

  function createModal() {
    if (document.getElementById('goriva-consent')) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'goriva-consent';
    wrapper.className = 'goriva-consent-backdrop';
    wrapper.setAttribute('role', 'dialog');
    wrapper.setAttribute('aria-modal', 'true');
    wrapper.setAttribute('aria-labelledby', 'goriva-consent-title');
    wrapper.innerHTML = `
      <div class="goriva-consent-modal">
        <section class="goriva-consent-brand">
          <div class="goriva-consent-logo"><img src="/media/2logo.png" alt=""><strong><span>goriva</span>.online</strong></div>
          <h2 id="goriva-consent-title">Вашата поверителност <span>е важна</span></h2>
          <p>Използваме бисквитки и сходни технологии, за да осигурим работата на сайта, да разбираме как се използва и, при ваше съгласие, да показваме реклами.</p>
          <div class="goriva-consent-benefits"><div class="goriva-consent-benefit"><b>▥</b>По-добро изживяване</div><div class="goriva-consent-benefit"><b>⌁</b>Защитени данни</div><div class="goriva-consent-benefit"><b>✓</b>Вие избирате</div></div>
        </section>
        <section class="goriva-consent-panel">
          <button class="goriva-consent-close" type="button" aria-label="Затвори">×</button>
          <div class="goriva-consent-tabs"><b>Категории</b><span>Подробности</span><span>За бисквитките</span></div>
          <div class="goriva-consent-category"><span class="goriva-consent-icon">⚙</span><div><strong>Необходими</strong><small>Нужни са за основната работа и сигурността на сайта.</small></div><label class="goriva-consent-switch"><input type="checkbox" checked disabled><span class="goriva-consent-slider"></span></label></div>
          <div class="goriva-consent-category"><span class="goriva-consent-icon">▥</span><div><strong>Аналитични</strong><small>Помагат ни да разбираме посещаемостта и използването на сайта.</small></div><label class="goriva-consent-switch"><input id="goriva-consent-analytics" type="checkbox"><span class="goriva-consent-slider"></span></label></div>
          <div class="goriva-consent-category"><span class="goriva-consent-icon">◁</span><div><strong>Рекламни</strong><small>Използват се за рекламни услуги и персонализиране, когато е приложимо.</small></div><label class="goriva-consent-switch"><input id="goriva-consent-ads" type="checkbox"><span class="goriva-consent-slider"></span></label></div>
          <div class="goriva-consent-category"><span class="goriva-consent-icon">☰</span><div><strong>Функционални</strong><small>Запомнят допълнителни предпочитания и настройки.</small></div><label class="goriva-consent-switch"><input id="goriva-consent-functional" type="checkbox"><span class="goriva-consent-slider"></span></label></div>
          <div class="goriva-consent-actions"><button class="goriva-consent-accept" type="button">Приемам всички</button><button class="goriva-consent-reject" type="button">Отказвам всички</button><button class="goriva-consent-save" type="button">Запази моите настройки</button></div>
          <div class="goriva-consent-meta">Можете да промените избора си по всяко време от footer-а.<br><a href="/pages/privacy.html">Политика за поверителност</a> · <a href="/pages/rules.html">Общи условия</a></div>
        </section>`;
    document.body.appendChild(wrapper);

    const panel = wrapper.querySelector('.goriva-consent-panel');
    const analytics = wrapper.querySelector('#goriva-consent-analytics');
    const ads = wrapper.querySelector('#goriva-consent-ads');
    const functional = wrapper.querySelector('#goriva-consent-functional');
    const switches = [analytics, ads, functional];

    const syncSaveButton = () => panel.classList.add('is-settings');
    switches.forEach(input => input.addEventListener('change', syncSaveButton));

    const close = () => wrapper.classList.remove('is-open');
    const apply = state => { persist(state); close(); };

    wrapper.querySelector('.goriva-consent-accept').addEventListener('click', () => apply({ necessary:true, analytics:true, ads:true, functional:true }));
    wrapper.querySelector('.goriva-consent-reject').addEventListener('click', () => apply({ necessary:true, analytics:false, ads:false, functional:false }));
    wrapper.querySelector('.goriva-consent-save').addEventListener('click', () => apply({ necessary:true, analytics:analytics.checked, ads:ads.checked, functional:functional.checked }));
    wrapper.querySelector('.goriva-consent-close').addEventListener('click', () => {
      if (loadStored()) close();
    });

    window.gorivaOpenPrivacySettings = () => {
      const state = loadStored() || defaults;
      analytics.checked = !!state.analytics;
      ads.checked = !!state.ads;
      functional.checked = !!state.functional;
      panel.classList.add('is-settings');
      wrapper.classList.add('is-open');
    };

    const stored = loadStored();
    if (stored) {
      updateGoogleConsent(stored);
      if (stored.analytics) loadHotjarOnce();
    } else {
      requestAnimationFrame(() => wrapper.classList.add('is-open'));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createModal, { once:true });
  else createModal();
})();