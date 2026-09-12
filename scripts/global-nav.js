(() => {
    if (window.__GORIVA_GLOBAL_NAV__) return;
    window.__GORIVA_GLOBAL_NAV__ = true;

    function ensureConsentManager() {
        if (!document.getElementById('goriva-consent-css')) {
            const link = document.createElement('link');
            link.id = 'goriva-consent-css';
            link.rel = 'stylesheet';
            link.href = '/pages/styles/consent-manager.css?v=20260911-privacy-banner1';
            document.head.appendChild(link);
        }
        if (!document.getElementById('goriva-consent-js')) {
            const script = document.createElement('script');
            script.id = 'goriva-consent-js';
            script.src = '/scripts/consent-manager.js?v=20260911-privacy-banner1';
            script.defer = true;
            document.head.appendChild(script);
        }
    }
    ensureConsentManager();

    const navItems = [
        { href: "/", label: "Начало", symbol: "⌂", match: ["/", "/index.html"] },
        { href: "/cars/", label: "Автомобили", symbol: "▰", match: ["/cars", "/cars/"] },
        { href: "/pages/business-clients.html", label: "За бизнеса", symbol: "◆", match: ["/pages/business-clients.html"] },
        { href: "/pages/trends.html", label: "История на цените", symbol: "↗", match: ["/pages/trends.html"] },
        { href: "/pages/useful.html", label: "Полезно", symbol: "✦", match: ["/pages/useful.html"] },
        { href: "/pages/news.html", label: "Новини", symbol: "▤", match: ["/pages/news.html", "/pages/articles/"] },
    ];
    const normalizePath=value=>{const path=(value||"/").replace(/\/+/g,"/");return path!=="/"?path.replace(/\/$/,""):path;};
    const currentPath=normalizePath(window.location.pathname);
    const stationsCurrent=currentPath==="/stations"||currentPath.startsWith("/stations/");
    const ekoCurrent=currentPath==="/stations/eko"||currentPath.startsWith("/stations/eko/");
    const insaCurrent=currentPath==="/stations/insa-oil"||currentPath.startsWith("/stations/insa-oil/");
    const lukoilCurrent=currentPath==="/stations/lukoil"||currentPath.startsWith("/stations/lukoil/");
    const ekoIcon=`<img class="goriva-stations-nav-brand-logo" src="/images/station_logos/eko-page-logo.png?v=20260906-2" alt="" width="28" height="28" decoding="async">`;
    const insaIcon=`<img class="goriva-stations-nav-brand-logo" src="/images/station_logos/insa-oil.png?v=20260909-1" alt="" width="28" height="28" decoding="async">`;
    const lukoilIcon=`<img class="goriva-stations-nav-brand-logo" src="/images/station_logos/lukoil-card-logo.jpg?v=20260909-1" alt="" width="28" height="28" decoding="async">`;
    const stationsNavMarkup=`<div class="goriva-stations-nav-item${stationsCurrent?" is-current":""}"><button class="goriva-stations-nav-toggle" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="goriva-stations-dropdown"><span class="goriva-nav-symbol" aria-hidden="true">⛽</span><span>Бензиностанции</span><span class="goriva-stations-nav-caret" aria-hidden="true">▾</span></button><div id="goriva-stations-dropdown" class="goriva-stations-nav-dropdown" role="menu" aria-label="Бензиностанции"><button class="goriva-stations-nav-option" type="button" role="menuitem" aria-disabled="true"><span>Всички бензиностанции</span><small>скоро</small></button><a class="goriva-stations-nav-option${ekoCurrent?" is-current":""}" href="/stations/eko/" role="menuitem"${ekoCurrent?' aria-current="page"':""}><span class="goriva-stations-nav-brand">${ekoIcon}<span class="goriva-stations-nav-brand-label">EKO</span></span><small>цени и обекти</small></a><a class="goriva-stations-nav-option${insaCurrent?" is-current":""}" href="/stations/insa-oil/" role="menuitem"${insaCurrent?' aria-current="page"':""}><span class="goriva-stations-nav-brand">${insaIcon}<span class="goriva-stations-nav-brand-label">Insa Oil</span></span><small>цени и обекти</small></a><a class="goriva-stations-nav-option${lukoilCurrent?" is-current":""}" href="/stations/lukoil/" role="menuitem"${lukoilCurrent?' aria-current="page"':""}><span class="goriva-stations-nav-brand">${lukoilIcon}<span class="goriva-stations-nav-brand-label">Lukoil</span></span><small>цени и обекти</small></a></div></div>`;
    const isActive=item=>item.match.some(match=>match.endsWith("/")?currentPath.startsWith(match):currentPath===normalizePath(match));
    function renderNavigationItems(){return navItems.map((item,index)=>{const link=`<a href="${item.href}" data-symbol="${item.symbol}" ${isActive(item)?'class="is-active" aria-current="page"':""}><span class="goriva-nav-symbol" aria-hidden="true">${item.symbol}</span><span>${item.label}</span></a>`;return index===0?link+stationsNavMarkup:link;}).join("");}

    function ensureStyles() {
        const existing = document.getElementById("goriva-global-progress-css");
        if (existing) {
            if (existing.sheet) return Promise.resolve();
            return new Promise(resolve => {
                const finish = () => resolve();
                existing.addEventListener("load", finish, { once: true });
                existing.addEventListener("error", finish, { once: true });
            });
        }

        return new Promise(resolve => {
            const link = document.createElement("link");
            link.id = "goriva-global-progress-css";
            link.rel = "stylesheet";
            link.href = "/pages/styles/global-progress.css?v=20260911-privacy-banner1";
            const finish = () => resolve();
            link.addEventListener("load", finish, { once: true });
            link.addEventListener("error", finish, { once: true });
            document.head.appendChild(link);
        });
    }

    function buildScrollProgress(){if(!document.body||document.querySelector(".goriva-scroll-progress"))return;const progress=document.createElement("div");progress.className="goriva-scroll-progress";progress.setAttribute("aria-hidden","true");progress.innerHTML='<span class="goriva-scroll-progress-bar"></span>';document.body.prepend(progress);const bar=progress.firstElementChild;let ticking=false;const update=()=>{const doc=document.documentElement;const max=Math.max(1,doc.scrollHeight-window.innerHeight);bar.style.transform=`scaleX(${Math.min(1,Math.max(0,window.scrollY/max))})`;ticking=false;};const requestUpdate=()=>{if(ticking)return;ticking=true;requestAnimationFrame(update);};update();addEventListener("scroll",requestUpdate,{passive:true});addEventListener("resize",requestUpdate,{passive:true});}
    function buildHeader(){if(!document.body||document.querySelector(".goriva-global-header"))return;const legacyHeader=document.querySelector("body > .header-bar");const legacyNav=document.querySelector("body > .main-nav");const businessHeader=document.querySelector("body > .business-header");const articleHeader=document.querySelector("body > .site-header");const target=legacyHeader||businessHeader||articleHeader||legacyNav||document.body.firstElementChild;const header=document.createElement("header");header.className="goriva-global-header";header.innerHTML=`<div class="goriva-global-nav-shell"><a class="goriva-global-brand" href="/" aria-label="goriva.online — Начало"><img src="/media/2logo.png" alt="goriva.online logo" width="48" height="48" decoding="async"><span class="goriva-global-brand-copy"><strong>goriva.online</strong><span><i aria-hidden="true"></i>Актуални цени в България</span></span></a><nav class="goriva-global-nav" aria-label="Основна навигация"><button class="goriva-global-menu-toggle" type="button" aria-label="Отвори менюто" aria-expanded="false" aria-controls="goriva-global-menu"><span class="goriva-global-menu-icon" aria-hidden="true"><b></b><b></b><b></b></span></button><div id="goriva-global-menu" class="goriva-global-menu">${renderNavigationItems()}</div></nav><div class="goriva-global-actions" aria-label="Статус на данните"><span class="goriva-data-status" role="status"><span class="goriva-data-status-dot" aria-hidden="true"></span><span>Актуални данни днес</span></span></div></div>`;if(target)target.before(header);else document.body.prepend(header);[legacyHeader,legacyNav,businessHeader,articleHeader].forEach(node=>node?.remove());document.body.classList.add("has-goriva-global-nav");const toggle=header.querySelector(".goriva-global-menu-toggle"),menu=header.querySelector(".goriva-global-menu"),stationsItem=header.querySelector(".goriva-stations-nav-item"),stationsToggle=header.querySelector(".goriva-stations-nav-toggle");const closeStations=()=>{stationsItem?.classList.remove("is-open");stationsToggle?.setAttribute("aria-expanded","false");};const closeMenu=()=>{closeStations();menu?.classList.remove("is-open");toggle?.setAttribute("aria-expanded","false");document.body.classList.remove("goriva-menu-open");};toggle?.addEventListener("click",event=>{event.stopPropagation();const open=menu.classList.toggle("is-open");toggle.setAttribute("aria-expanded",String(open));document.body.classList.toggle("goriva-menu-open",open);if(!open)closeStations();});stationsToggle?.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();const open=stationsItem.classList.toggle("is-open");stationsToggle.setAttribute("aria-expanded",String(open));});menu?.addEventListener("click",event=>{if(event.target.closest("a"))closeMenu();});document.addEventListener("click",event=>{if(stationsItem?.classList.contains("is-open")&&!stationsItem.contains(event.target))closeStations();if(menu?.classList.contains("is-open")&&!menu.contains(event.target)&&!toggle?.contains(event.target))closeMenu();});document.addEventListener("keydown",event=>{if(event.key==="Escape")closeMenu();});let scrollTicking=false;const updateScrollState=()=>{header.classList.toggle("is-scrolled",window.scrollY>10);scrollTicking=false;};addEventListener("scroll",()=>{if(scrollTicking)return;scrollTicking=true;requestAnimationFrame(updateScrollState);},{passive:true});updateScrollState();}
    function buildFooter(){if(!document.body||document.querySelector("body > .goriva-global-footer"))return;const currentFooter=document.querySelector("body > .site-footer");const footer=document.createElement("footer");footer.className="site-footer goriva-global-footer";footer.innerHTML=`<div class="footer-container"><div class="footer-column footer-brand"><a href="/" class="footer-brand-link" aria-label="goriva.online - Начало"><img src="/media/footer-logo.png" alt="goriva.online logo" class="footer-logo" loading="lazy" decoding="async"></a><p class="footer-brand-copy">Практична платформа за актуални и исторически цени на горивата в България — по градове, бензиностанции и вид гориво.</p><div class="footer-data-note">Данните имат информационен характер и могат да се различават от цените на място.</div></div><div class="footer-column"><h4>Основни страници</h4><nav aria-label="Основни страници"><ul class="footer-links"><li><a href="/cities/sofia/">Цени в София</a></li><li><a href="/cities/plovdiv/">Цени в Пловдив</a></li><li><a href="/cities/varna/">Цени във Варна</a></li><li><a href="/cities/burgas/">Цени в Бургас</a></li><li><a href="/cities/ruse/">Цени в Русе</a></li><li><a href="/cities/stara-zagora/">Цени в Стара Загора</a></li><li><a href="/pages/news.html">Новини</a></li><li><a href="/pages/business-clients.html">За бизнеса</a></li><li><a href="/pages/trends.html">История на цените</a></li><li><a href="/">Текущи цени</a></li><li><a href="/pages/useful.html">Полезно</a></li><li><a href="/cars/">Автомобили</a></li><li><a href="/pages/weather.html">Прогноза за времето</a></li></ul></nav></div><div class="footer-column"><h4>goriva.online</h4><ul class="footer-links"><li><a href="/pages/about.html">За goriva.online</a></li><li><a href="/pages/news.html">Новини</a></li><li><a href="/pages/business-clients.html">За бизнеса</a></li><li><a href="/pages/rules.html">Общи условия</a></li><li><a href="/pages/privacy.html">Политика за поверителност</a></li><li><button type="button" class="goriva-privacy-settings-link">Настройки за поверителност</button></li><li><a href="/#fuel-form">Сподели цена</a></li></ul></div><div class="footer-column footer-contact-column"><h4>Контакт</h4><div class="footer-contact-list"><div class="contact-item"><span class="contact-icon" aria-hidden="true">☎</span><a href="tel:+359883427273">+359 883 427 273</a></div><div class="contact-item"><span class="contact-icon" aria-hidden="true">✉</span><a href="mailto:svetoslavov.plamen@gmail.com">svetoslavov.plamen@gmail.com</a></div></div><div class="social-icons" aria-label="Социални мрежи"><a href="https://www.facebook.com/plamen.sve" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/facebook.svg" alt="" width="20" height="20" loading="lazy"></a><a href="https://www.instagram.com/goriva.online/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/instagram.svg" alt="" width="20" height="20" loading="lazy"></a><a href="https://www.linkedin.com/in/plamen-svetoslavov/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/linkedin.svg" alt="" width="20" height="20" loading="lazy"></a><a href="https://wa.me/359883427273" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/whatsapp.svg" alt="" width="20" height="20" loading="lazy"></a></div></div></div><div class="footer-bottom"><div class="footer-bottom-meta"><span>© 2026 goriva.online</span><span class="footer-separator">•</span><span>Цени на горивата в България</span></div><span class="footer-status">Платформата е активна</span></div>`;if(currentFooter)currentFooter.replaceWith(footer);else document.body.appendChild(footer);footer.querySelector('.goriva-privacy-settings-link')?.addEventListener('click',()=>window.gorivaOpenPrivacySettings?.());}

    function buildGlobalShell() {
        buildHeader();
        buildFooter();
        buildScrollProgress();
    }

    function initGlobalShell() {
        ensureStyles()
            .then(buildGlobalShell)
            .catch(buildGlobalShell);
    }

    if(document.body&&(document.querySelector("body > .header-bar")||document.querySelector("body > .main-nav")||document.querySelector("body > .business-header")||document.querySelector("body > .site-header"))){initGlobalShell();}else if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",initGlobalShell,{once:true});}else{initGlobalShell();}
})();
