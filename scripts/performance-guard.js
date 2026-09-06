(() => {
  if (window.__GORIVA_PERFORMANCE_GUARD__) return;
  window.__GORIVA_PERFORMANCE_GUARD__ = true;

  const TICKER_LIMIT = 28;
  let installTimer = null;

  function installTickerFix() {
    if (typeof window.renderTicker !== 'function') return false;
    if (window.renderTicker.__gorivaOptimized) return true;

    const optimizedStartTickerLoop = function () {
      const track = document.querySelector('.ticker-track');
      if (!track) return;

      if (window.tickerAnimationId) {
        cancelAnimationFrame(window.tickerAnimationId);
        window.tickerAnimationId = null;
      }

      let offset = 0;
      let lastTime = 0;
      let loopWidth = Math.max(1, track.scrollWidth / 2);
      let resizeTimer = null;

      const refreshWidth = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          loopWidth = Math.max(1, track.scrollWidth / 2);
        }, 120);
      };

      const step = timestamp => {
        if (document.hidden) {
          lastTime = timestamp;
          window.tickerAnimationId = requestAnimationFrame(step);
          return;
        }

        if (!lastTime) lastTime = timestamp;
        const delta = Math.min(50, timestamp - lastTime);
        lastTime = timestamp;
        offset += delta * 0.03;
        if (offset >= loopWidth) offset -= loopWidth;
        track.style.transform = `translate3d(-${offset}px,0,0)`;
        window.tickerAnimationId = requestAnimationFrame(step);
      };

      window.addEventListener('resize', refreshWidth, { passive: true });
      window.tickerAnimationId = requestAnimationFrame(step);
    };

    const optimizedRenderTicker = function (data) {
      const container = document.getElementById('ticker-content');
      if (!container) return;

      if (window.tickerAnimationId) {
        cancelAnimationFrame(window.tickerAnimationId);
        window.tickerAnimationId = null;
      }

      if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = '<div class="ticker-empty">Все още няма подадени цени за днес</div>';
        return;
      }

      const seen = new Set();
      const compact = [];
      for (const row of data) {
        const price = Number(row?.price);
        if (!Number.isFinite(price)) continue;
        const key = `${row?.fuel || ''}|${row?.station || ''}|${row?.city || ''}|${price.toFixed(2)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        compact.push(row);
        if (compact.length >= TICKER_LIMIT) break;
      }

      const sequence = compact.map(row => {
        const price = Number(row.price);
        return `<span class="ticker-item">${row.fuel}: <strong>${price.toFixed(2)}€</strong> (${row.station}, ${row.city})</span>`;
      }).join('');

      container.innerHTML = `<div class="ticker-track">${sequence}${sequence}</div>`;
      optimizedStartTickerLoop();
    };

    optimizedRenderTicker.__gorivaOptimized = true;
    window.startTickerLoop = optimizedStartTickerLoop;
    window.renderTicker = optimizedRenderTicker;

    const existingTrack = document.querySelector('.ticker-track');
    if (existingTrack && existingTrack.children.length > TICKER_LIMIT * 2) {
      const rows = [...existingTrack.children].slice(0, TICKER_LIMIT).map(el => ({
        fuel: el.textContent || '', station: '', city: '', price: NaN
      }));
      existingTrack.replaceChildren(...[...existingTrack.children].slice(0, TICKER_LIMIT * 2));
    }

    return true;
  }

  function scheduleInstall() {
    if (installTickerFix()) return;
    let attempts = 0;
    installTimer = setInterval(() => {
      attempts += 1;
      if (installTickerFix() || attempts >= 120) {
        clearInterval(installTimer);
        installTimer = null;
      }
    }, 25);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleInstall, { once: true });
  } else {
    scheduleInstall();
  }
})();
