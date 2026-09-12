(() => {
    const moveWeatherToFooter = () => {
        document.querySelectorAll('.main-nav a[href$="pages/weather.html"], .main-nav a[href="/pages/weather.html"]').forEach(link => link.remove());

        const footerLinks = document.querySelector('.site-footer .footer-links');
        if (footerLinks && !footerLinks.querySelector('a[href="/pages/weather.html"]')) {
            const item = document.createElement('li');
            item.innerHTML = '<a href="/pages/weather.html">Прогноза за времето</a>';
            const useful = footerLinks.querySelector('a[href="/pages/useful.html"]')?.closest('li');
            if (useful) useful.insertAdjacentElement('afterend', item);
            else footerLinks.appendChild(item);
        }
    };

    const polishEkoMap = () => {
        const section = document.querySelector('.station-map-section.pro-station-map');
        const header = section?.querySelector('.pro-map-header');
        const heading = header?.querySelector('.pro-map-heading > div');
        if (!section || !header || !heading || section.dataset.livePolish === '1') return;
        section.dataset.livePolish = '1';

        const eyebrow = document.createElement('div');
        eyebrow.className = 'eko-live-eyebrow';
        eyebrow.innerHTML = '<span class="eko-live-dot" aria-hidden="true"></span><span>ИНТЕРАКТИВНА КАРТА · EKO БЪЛГАРИЯ</span>';
        heading.insertBefore(eyebrow, heading.firstChild);

        const actions = document.createElement('div');
        actions.className = 'eko-map-header-actions';
        actions.innerHTML = '<span class="eko-map-live-status"><span class="eko-live-dot" aria-hidden="true"></span>Актуални локации</span><a class="eko-map-chain-link" href="/stations/eko/">Всички EKO цени <span aria-hidden="true">→</span></a>';
        header.appendChild(actions);

        const style = document.createElement('style');
        style.id = 'goriva-home-map-polish-v1';
        style.textContent = `
            .station-map-section.pro-station-map{position:relative;overflow:hidden}
            .station-map-section.pro-station-map::before{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,#22c55e,#3b82f6,#60a5fa);opacity:.95;z-index:2}
            .pro-map-header{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:24px!important;padding:24px 24px 20px!important}
            .eko-live-eyebrow{display:flex;align-items:center;gap:8px;margin:0 0 7px;color:#93c5fd;font-size:10px;font-weight:850;letter-spacing:.11em}
            .eko-live-dot{width:8px;height:8px;flex:0 0 8px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.12),0 0 18px rgba(34,197,94,.42)}
            .eko-map-header-actions{display:flex;align-items:center;gap:10px;flex:0 0 auto}
            .eko-map-live-status{min-height:38px;padding:0 13px;display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(34,197,94,.18);border-radius:11px;background:rgba(34,197,94,.07);color:#bbf7d0;font-size:11px;font-weight:750;white-space:nowrap}
            .eko-map-chain-link{min-height:40px;padding:0 15px;display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(96,165,250,.2);border-radius:11px;background:linear-gradient(135deg,rgba(37,99,235,.22),rgba(14,165,233,.13));color:#eff6ff!important;font-size:11px;font-weight:800;text-decoration:none!important;white-space:nowrap;transition:transform .18s ease,border-color .18s ease,background .18s ease}
            .eko-map-chain-link:hover{transform:translateY(-1px);border-color:rgba(96,165,250,.42);background:linear-gradient(135deg,rgba(37,99,235,.32),rgba(14,165,233,.2))}
            .pro-map-canvas{position:relative}
            .pro-map-canvas::after{content:"Избери маркер за детайли и цени";position:absolute;left:14px;bottom:14px;z-index:500;pointer-events:none;padding:8px 11px;border:1px solid rgba(255,255,255,.42);border-radius:10px;background:rgba(15,23,42,.82);backdrop-filter:blur(8px);color:#f8fafc;font-size:10px;font-weight:700;box-shadow:0 8px 20px rgba(15,23,42,.18)}
            @media(max-width:900px){.pro-map-header{align-items:flex-start!important;flex-direction:column!important}.eko-map-header-actions{width:100%;flex-wrap:wrap}.eko-map-chain-link,.eko-map-live-status{flex:1 1 auto;justify-content:center}}
            @media(max-width:560px){.pro-map-header{padding:20px 16px 16px!important;gap:14px!important}.eko-map-header-actions{display:grid;grid-template-columns:1fr;width:100%}.eko-map-live-status,.eko-map-chain-link{width:100%;box-sizing:border-box}.pro-map-canvas::after{right:12px;left:12px;text-align:center}}
        `;
        document.head.appendChild(style);
    };

    moveWeatherToFooter();

    const core = document.createElement('script');
    core.src = '/scripts/home-hero-map-pro-core.js?v=20260912-map-polish1';
    core.defer = true;
    core.onload = () => {
        polishEkoMap();
        moveWeatherToFooter();
    };
    document.head.appendChild(core);
})();
