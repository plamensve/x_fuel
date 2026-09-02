// Homepage-only enhancements. The shared global navigation remains authoritative.
(() => {
    const HERO_PARTS = Array.from({ length: 6 }, (_, i) =>
        `media/hero-hq/part${String(i).padStart(2, '0')}.txt?v=20260902-final`
    );

    const ensurePoll = () => {
        if (document.querySelector('script[data-home-fuel-poll]')) return;
        const pollScript = document.createElement('script');
        pollScript.src = 'scripts/home-fuel-poll.js?v=20260831-perf2';
        pollScript.defer = true;
        pollScript.dataset.homeFuelPoll = 'true';
        document.body.appendChild(pollScript);
    };

    const loadHeroImage = async (img) => {
        try {
            const responses = await Promise.all(HERO_PARTS.map((url) => fetch(url, { cache: 'force-cache' })));
            if (responses.some((response) => !response.ok)) throw new Error('Hero image part failed to load');

            const parts = await Promise.all(responses.map((response) => response.text()));
            const base64 = parts.join('').replace(/\s+/g, '');
            if (!base64.startsWith('UklG')) throw new Error('Invalid WebP payload');

            img.src = `data:image/webp;base64,${base64}`;
            img.classList.add('is-loaded');
        } catch (error) {
            console.error('Hero image could not be assembled:', error);
            img.classList.add('is-error');
        }
    };

    const initHero = () => {
        const hero = document.querySelector('.about-project');
        const inner = hero?.querySelector('.about-inner');
        if (!hero || !inner || hero.dataset.heroV3 === 'true') return;

        hero.dataset.heroV3 = 'true';
        hero.classList.add('hero-v3');

        inner.innerHTML = `
            <div class="hero-v3-grid">
                <div class="hero-v3-visual">
                    <img alt="Представител на goriva.online пред бензиностанция" class="hero-v3-model" decoding="async">
                </div>

                <div class="hero-v3-content">
                    <div class="hero-v3-brand" aria-label="goriva.online - Актуални цени в България">
                        <img src="media/2logo.png" alt="" class="hero-v3-logo-mark">
                        <div class="hero-v3-brand-copy">
                            <strong>goriva.online</strong>
                            <span><i></i> Актуални цени в България</span>
                        </div>
                    </div>

                    <div class="hero-v3-badge"><span></span> АКТУАЛНИ ЦЕНИ ОТ ШОФЬОРИ, ЗА ШОФЬОРИ</div>

                    <h1 class="hero-v3-title">Намери най-евтиното<br>гориво<br>близо до теб</h1>

                    <p class="hero-v3-desc">goriva.online събира реални цени на горивата в България,<br>подадени директно от шофьори.</p>

                    <div class="hero-v3-features">
                        <div class="hero-v3-card">
                            <div class="hero-v3-icon hero-v3-icon-red">⛽</div>
                            <div><strong>Реални цени от потребители</strong><span>Актуална информация за деня</span></div>
                        </div>
                        <div class="hero-v3-card">
                            <div class="hero-v3-icon hero-v3-icon-orange">📍</div>
                            <div><strong>По области и градове</strong><span>Бензиностанции в цялата страна</span></div>
                        </div>
                        <div class="hero-v3-card">
                            <div class="hero-v3-icon hero-v3-icon-green">📊</div>
                            <div><strong>Средни и най-ниски стойности</strong><span>Сравни и избери по-добра цена</span></div>
                        </div>
                    </div>

                    <a class="hero-v3-instagram" href="https://www.instagram.com/goriva.online/" target="_blank" rel="noopener noreferrer">
                        <div class="hero-v3-instagram-icon">◎</div>
                        <div class="hero-v3-instagram-copy">
                            <strong>Искаш да си информиран за цените на горивата всеки ден?</strong>
                            <span>Следвай <b>@goriva.online</b> за актуални цени, най-евтини бензиностанции и кратки сравнения.</span>
                        </div>
                        <div class="hero-v3-instagram-btn">Instagram →</div>
                    </a>
                </div>
            </div>`;

        const style = document.createElement('style');
        style.id = 'hero-v3-styles';
        style.textContent = `
            .about-project.hero-v3{position:relative;padding:18px 10px 34px!important;text-align:left!important;color:#0f2747;overflow:hidden;background:linear-gradient(90deg,#f8fbff 0%,#fff 40%,#fbfffd 100%)}
            .about-project.hero-v3::before,.about-project.hero-v3::after{content:none!important;display:none!important}
            .hero-v3 .about-inner{max-width:1440px!important;margin:0 auto;position:relative;z-index:1}
            .hero-v3-grid{display:grid;grid-template-columns:minmax(390px,.9fr) minmax(0,1.5fr);gap:26px;align-items:stretch;min-height:620px}
            .hero-v3-visual{position:relative;min-height:620px;overflow:hidden;background:#eef7ff;border:0;border-radius:0;box-shadow:none}
            .hero-v3-visual::before,.hero-v3-visual::after{content:none!important;display:none!important}
            .hero-v3-model{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 34%;display:block;border:0;border-radius:0;box-shadow:none;opacity:0;transition:opacity .18s ease}
            .hero-v3-model.is-loaded{opacity:1}.hero-v3-model.is-error{display:none}
            .hero-v3-content{min-width:0;padding:10px 0 0;display:flex;flex-direction:column;align-items:center;text-align:center}
            .hero-v3-brand{display:flex;align-items:center;justify-content:center;gap:12px;margin:0 0 12px}
            .hero-v3-logo-mark{width:58px;height:72px;object-fit:contain;display:block}
            .hero-v3-brand-copy{text-align:left}.hero-v3-brand-copy strong{display:block;color:#0b2c52;font-size:31px;line-height:1;font-weight:900;letter-spacing:-.035em}.hero-v3-brand-copy span{display:flex;align-items:center;gap:7px;color:#5f7188;font-size:15px;margin-top:6px}.hero-v3-brand-copy i{width:10px;height:10px;border-radius:50%;background:#18b96a;box-shadow:0 0 0 3px rgba(24,185,106,.1)}
            .hero-v3-badge{display:inline-flex;align-items:center;gap:10px;padding:9px 18px;border-radius:999px;background:#eefaf3;border:1px solid #d9f2e2;color:#14633f;font-size:12px;font-weight:800;letter-spacing:.02em;margin:2px 0 18px;white-space:nowrap}
            .hero-v3-badge span{width:11px;height:11px;border-radius:50%;background:#13b866;box-shadow:0 0 0 5px rgba(19,184,102,.1)}
            .hero-v3-title{margin:0;font-size:clamp(48px,5.2vw,76px);line-height:.97;font-weight:900;letter-spacing:-.045em;background:linear-gradient(90deg,#2468e8 4%,#087db1 50%,#0f9c5d 100%);-webkit-background-clip:text;background-clip:text;color:transparent;position:relative}
            .hero-v3-title::after{content:"";position:absolute;width:150px;height:7px;border-radius:999px;background:#f6b61c;right:3%;top:31%;transform:rotate(-2deg)}
            .hero-v3-desc{margin:28px 0 26px;color:#52657d;font-size:17px;line-height:1.55}
            .hero-v3-features{width:100%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
            .hero-v3-card{min-width:0;display:grid;grid-template-columns:50px 1fr;gap:12px;align-items:center;padding:18px 16px;background:rgba(255,255,255,.96);border:1px solid #e7edf5;border-radius:18px;box-shadow:0 12px 30px rgba(15,39,71,.08);text-align:left}
            .hero-v3-icon{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;font-size:22px;font-weight:800}.hero-v3-icon-red{background:#fff0f4}.hero-v3-icon-orange{background:#fff1ed}.hero-v3-icon-green{background:#ecfaf2}
            .hero-v3-card strong{display:block;color:#102744;font-size:14px;line-height:1.22;margin-bottom:6px}.hero-v3-card span{display:block;color:#65768b;font-size:12.5px;line-height:1.35}
            .hero-v3-instagram{width:100%;margin-top:24px;display:grid;grid-template-columns:74px minmax(0,1fr) auto;gap:16px;align-items:center;padding:22px 26px;border-radius:24px;text-decoration:none;color:#fff;background:linear-gradient(102deg,#6f19e8 0%,#d51686 34%,#ff3e34 66%,#ffb319 100%);box-shadow:0 18px 40px rgba(182,42,91,.17)}
            .hero-v3-instagram-icon{width:62px;height:62px;border-radius:19px;display:grid;place-items:center;border:3px solid rgba(255,255,255,.9);font-size:42px;line-height:1;background:rgba(255,255,255,.08)}
            .hero-v3-instagram-copy{text-align:left;min-width:0}.hero-v3-instagram-copy strong{display:block;font-size:17px;line-height:1.32;margin-bottom:7px}.hero-v3-instagram-copy span{display:block;font-size:13px;line-height:1.45;color:rgba(255,255,255,.94)}
            .hero-v3-instagram-btn{min-width:170px;padding:15px 20px;border-radius:999px;background:#fff;color:#ec1e62;font-weight:900;text-align:center;box-shadow:0 8px 24px rgba(76,18,37,.12)}
            .hero-v3-instagram:hover{transform:translateY(-2px);box-shadow:0 22px 48px rgba(182,42,91,.23)}
            @media(max-width:1100px){.hero-v3-grid{grid-template-columns:minmax(320px,.82fr) minmax(0,1.35fr);min-height:560px}.hero-v3-visual{min-height:560px}.hero-v3-title{font-size:clamp(42px,5vw,60px)}.hero-v3-brand-copy strong{font-size:27px}.hero-v3-logo-mark{width:52px;height:66px}.hero-v3-card{grid-template-columns:44px 1fr;padding:15px 13px}.hero-v3-icon{width:44px;height:44px}.hero-v3-instagram{grid-template-columns:58px 1fr auto;padding:18px 20px}.hero-v3-instagram-icon{width:54px;height:54px;font-size:35px}.hero-v3-instagram-btn{min-width:145px}}
            @media(max-width:840px){.about-project.hero-v3{padding:16px 8px 28px!important}.hero-v3-grid{grid-template-columns:1fr;gap:18px;min-height:0}.hero-v3-content{order:1}.hero-v3-visual{order:2;min-height:500px;max-height:560px;border:0;border-radius:0;background:#eef7ff}.hero-v3-model{object-position:center 28%;border-radius:0}.hero-v3-title{font-size:clamp(40px,10vw,58px)}.hero-v3-desc br{display:none}.hero-v3-features{grid-template-columns:1fr}.hero-v3-card{padding:15px 16px}.hero-v3-instagram{grid-template-columns:58px 1fr;margin-top:18px}.hero-v3-instagram-btn{grid-column:1/-1;width:100%;box-sizing:border-box}.hero-v3-badge{font-size:10.5px;padding:8px 13px}.hero-v3-brand-copy strong{font-size:25px}.hero-v3-brand-copy span{font-size:13px}.hero-v3-logo-mark{width:48px;height:60px}}
            @media(max-width:520px){.hero-v3-title{font-size:42px;line-height:1}.hero-v3-title::after{width:92px;height:5px;right:2%;top:32%}.hero-v3-desc{font-size:15px;margin:20px 0}.hero-v3-brand{margin-top:2px;gap:9px}.hero-v3-brand-copy strong{font-size:23px}.hero-v3-brand-copy span{font-size:12px}.hero-v3-logo-mark{width:44px;height:55px}.hero-v3-visual{min-height:430px}.hero-v3-card strong{font-size:14px}.hero-v3-card span{font-size:12px}.hero-v3-instagram{padding:18px 16px;gap:12px;border-radius:20px}.hero-v3-instagram-copy strong{font-size:15px}.hero-v3-instagram-copy span{font-size:12px}.hero-v3-instagram-icon{width:50px;height:50px}.hero-v3-badge{white-space:normal;text-align:center;justify-content:center}}
        `;
        document.head.appendChild(style);

        const img = inner.querySelector('.hero-v3-model');
        if (img) loadHeroImage(img);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initHero();
            ensurePoll();
        }, { once: true });
    } else {
        initHero();
        ensurePoll();
    }
})();
