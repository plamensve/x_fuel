(() => {
  if (window.__GORIVA_CONSENT_MANAGER__) return;
  window.__GORIVA_CONSENT_MANAGER__ = true;

  const STORAGE_KEY = 'goriva_consent_v1';
  const VERSION = 1;
  const GA_ID = 'G-F6YJNGGFR2';
  const ADSENSE_CLIENT = 'ca-pub-3478773231642095';
  const defaults = {
    necessary: true,
    analytics: false,
    ads: false,
    functional: false,
    version: VERSION
  };

  const loadStored = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.version !== VERSION) return null;
      return { ...defaults, ...parsed, necessary: true };
    } catch (_) {
      return null;
    }
  };

  const ensureGtag = () => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
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

  function loadGoogleAnalyticsOnce() {
    if (
      window.__GORIVA_GA_LOADED__ ||
      document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_ID}"]`)
    ) {
      window.__GORIVA_GA_LOADED__ = true;
      return;
    }

    window.__GORIVA_GA_LOADED__ = true;
    ensureGtag();
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
  }

  function loadAdsenseOnce() {
    if (
      window.__GORIVA_ADSENSE_LOADED__ ||
      document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')
    ) {
      window.__GORIVA_ADSENSE_LOADED__ = true;
      return;
    }

    window.__GORIVA_ADSENSE_LOADED__ = true;
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    document.head.appendChild(script);
  }

  function loadHotjarOnce() {
    const existingHotjar = [...document.scripts].some(
      script => script.src && script.src.includes('static.hotjar.com/c/hotjar-')
    );

    if (window.__GORIVA_HOTJAR_LOADED__ || existingHotjar) {
      window.__GORIVA_HOTJAR_LOADED__ = true;
      return;
    }

    window.__GORIVA_HOTJAR_LOADED__ = true;
    window.hj = window.hj || function () { (window.hj.q = window.hj.q || []).push(arguments); };
    window._hjSettings = { hjid: 6686373, hjsv: 6 };

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://static.hotjar.com/c/hotjar-${window._hjSettings.hjid}.js?sv=${window._hjSettings.hjsv}`;
    document.head.appendChild(script);
  }

  function activateGrantedServices(state) {
    if (state.analytics) {
      loadGoogleAnalyticsOnce();
      loadHotjarOnce();
    }
    if (state.ads) loadAdsenseOnce();
  }

  function scheduleGrantedServices(state) {
    if (!state.analytics && !state.ads) return;

    const runWhenIdle = () => {
      const run = () => activateGrantedServices(state);
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(run, { timeout: 2500 });
      } else {
        window.setTimeout(run, 350);
      }
    };

    if (document.readyState === 'complete') runWhenIdle();
    else window.addEventListener('load', runWhenIdle, { once: true });
  }

  function persist(state) {
    const normalized = { ...defaults, ...state, necessary: true, version: VERSION };

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...normalized, savedAt: new Date().toISOString() })
      );
    } catch (_) {
      // A blocked/unavailable localStorage must never trap the visitor in the modal.
    }

    updateGoogleConsent(normalized);
    scheduleGrantedServices(normalized);
    window.dispatchEvent(new CustomEvent('goriva:consent-changed', { detail: normalized }));
    return normalized;
  }

  function createModal() {
    if (document.getElementById('goriva-consent')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'goriva-consent';
    wrapper.className = 'goriva-consent-backdrop';
    wrapper.setAttribute('role', 'dialog');
    wrapper.setAttribute('aria-modal', 'false');
    wrapper.setAttribute('aria-labelledby', 'goriva-consent-title');
    wrapper.setAttribute('aria-hidden', 'true');

    wrapper.innerHTML = `
      <div class="goriva-consent-modal">
        <section class="goriva-consent-brand">
          <div class="goriva-consent-logo">
            <img src="/media/2logo.png" alt="">
            <strong><span>goriva</span>.online</strong>
          </div>
          <p id="goriva-consent-title" class="goriva-consent-title"><strong>Вашата поверителност</strong> <span>е важна</span></p>
          <p>Използваме бисквитки и сходни технологии, за да осигурим работата на сайта, да разбираме как се използва и, при ваше съгласие, да показваме реклами.</p>
          <div class="goriva-consent-brand-meta">
            <a href="/pages/privacy.html">Политика за поверителност</a>
            <span aria-hidden="true">·</span>
            <a href="/pages/rules.html">Общи условия</a>
          </div>
        </section>

        <section class="goriva-consent-panel">
          <button class="goriva-consent-close" type="button" aria-label="Затвори настройките за поверителност">×</button>

          <div class="goriva-consent-summary">
            <span class="goriva-consent-summary-label">ПОВЕРИТЕЛНОСТ И БИСКВИТКИ</span>
            <span class="goriva-consent-summary-text">Избери кои допълнителни услуги да използваме.</span>
          </div>

          <div class="goriva-consent-settings" hidden>
            <div class="goriva-consent-tabs">
              <b>Категории</b><span>Подробности</span><span>За бисквитките</span>
            </div>

            <div class="goriva-consent-options">
              <div class="goriva-consent-category">
                <span class="goriva-consent-icon">⚙</span>
                <div><strong>Необходими</strong><small>Нужни са за основната работа и сигурността на сайта.</small></div>
                <label class="goriva-consent-switch"><input type="checkbox" checked disabled><span class="goriva-consent-slider"></span></label>
              </div>
              <div class="goriva-consent-category">
                <span class="goriva-consent-icon">▥</span>
                <div><strong>Аналитични</strong><small>Помагат ни да разбираме посещаемостта и използването на сайта.</small></div>
                <label class="goriva-consent-switch"><input id="goriva-consent-analytics" type="checkbox"><span class="goriva-consent-slider"></span></label>
              </div>
              <div class="goriva-consent-category">
                <span class="goriva-consent-icon">◁</span>
                <div><strong>Рекламни</strong><small>Използват се за рекламни услуги и персонализиране, когато е приложимо.</small></div>
                <label class="goriva-consent-switch"><input id="goriva-consent-ads" type="checkbox"><span class="goriva-consent-slider"></span></label>
              </div>
              <div class="goriva-consent-category">
                <span class="goriva-consent-icon">☰</span>
                <div><strong>Функционални</strong><small>Запомнят допълнителни предпочитания и настройки.</small></div>
                <label class="goriva-consent-switch"><input id="goriva-consent-functional" type="checkbox"><span class="goriva-consent-slider"></span></label>
              </div>
            </div>
          </div>

          <div class="goriva-consent-actions">
            <button class="goriva-consent-accept" type="button">Приемам всички</button>
            <button class="goriva-consent-reject" type="button">Отказвам всички</button>
            <button class="goriva-consent-manage" type="button" aria-expanded="false">Настройки</button>
            <button class="goriva-consent-save" type="button" hidden>Запази моите настройки</button>
          </div>

          <div class="goriva-consent-meta">
            Можете да промените избора си по всяко време от footer-а.
          </div>
        </section>
      </div>`;

    document.body.appendChild(wrapper);

    const panel = wrapper.querySelector('.goriva-consent-panel');
    const settings = wrapper.querySelector('.goriva-consent-settings');
    const closeButton = wrapper.querySelector('.goriva-consent-close');
    const analytics = wrapper.querySelector('#goriva-consent-analytics');
    const ads = wrapper.querySelector('#goriva-consent-ads');
    const functional = wrapper.querySelector('#goriva-consent-functional');
    const manageButton = wrapper.querySelector('.goriva-consent-manage');
    const saveButton = wrapper.querySelector('.goriva-consent-save');
    const switches = [analytics, ads, functional];

    const setMode = settingsMode => {
      panel.classList.toggle('is-settings', settingsMode);
      settings.hidden = !settingsMode;
      manageButton.hidden = settingsMode;
      saveButton.hidden = !settingsMode;
      manageButton.setAttribute('aria-expanded', String(settingsMode));
    };

    const close = () => {
      wrapper.classList.remove('is-open');
      wrapper.setAttribute('aria-hidden', 'true');
      setMode(false);
    };

    const apply = state => {
      persist(state);
      close();
    };

    const closeWithoutOptionalConsent = () => {
      const stored = loadStored();
      if (stored) {
        close();
        return;
      }

      apply({ necessary: true, analytics: false, ads: false, functional: false });
    };

    const open = (settingsMode = false, shouldFocus = false) => {
      const state = loadStored() || defaults;
      analytics.checked = !!state.analytics;
      ads.checked = !!state.ads;
      functional.checked = !!state.functional;
      setMode(settingsMode);
      wrapper.removeAttribute('aria-hidden');
      wrapper.classList.add('is-open');

      if (shouldFocus) {
        window.requestAnimationFrame(() => {
          try { closeButton.focus({ preventScroll: true }); }
          catch (_) { closeButton.focus(); }
        });
      }
    };

    switches.forEach(input => {
      input.addEventListener('change', () => setMode(true));
    });

    manageButton.addEventListener('click', () => setMode(true));

    wrapper.querySelector('.goriva-consent-accept').addEventListener('click', () => {
      apply({ necessary: true, analytics: true, ads: true, functional: true });
    });

    wrapper.querySelector('.goriva-consent-reject').addEventListener('click', () => {
      apply({ necessary: true, analytics: false, ads: false, functional: false });
    });

    wrapper.querySelector('.goriva-consent-save').addEventListener('click', () => {
      apply({
        necessary: true,
        analytics: analytics.checked,
        ads: ads.checked,
        functional: functional.checked
      });
    });

    closeButton.addEventListener('click', closeWithoutOptionalConsent);

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && wrapper.classList.contains('is-open')) {
        closeWithoutOptionalConsent();
      }
    });

    window.gorivaOpenPrivacySettings = () => open(true, true);

    const stored = loadStored();
    if (stored) {
      updateGoogleConsent(stored);
      scheduleGrantedServices(stored);
      wrapper.setAttribute('aria-hidden', 'true');
    } else {
      // Keep the first visit unobstructed. Optional services remain denied
      // until the visitor explicitly changes them from the footer settings link.
      updateGoogleConsent(defaults);
      wrapper.setAttribute('aria-hidden', 'true');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createModal, { once: true });
  } else {
    createModal();
  }
})();
