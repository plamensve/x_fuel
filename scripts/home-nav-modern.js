// Homepage-only enhancements. The shared global navigation remains authoritative.
(() => {
    const ensurePoll = () => {
        if (document.querySelector('script[data-home-fuel-poll]')) return;
        const pollScript = document.createElement("script");
        pollScript.src = "scripts/home-fuel-poll.js?v=20260831-perf2";
        pollScript.defer = true;
        pollScript.dataset.homeFuelPoll = "true";
        document.body.appendChild(pollScript);
    };

    const initHero = () => {
        const hero = document.querySelector('.about-project');
        const inner = hero?.querySelector('.about-inner');
        if (!hero || !inner || hero.dataset.heroV2 === 'true') return;

        hero.dataset.heroV2 = 'true';
        hero.classList.add('hero-v2');

        inner.innerHTML = `
            <div class="hero-v2-grid">
                <div class="hero-v2-visual" aria-hidden="true">
                    <img src="media/hero-woman-station.webp?v=20260902-clean2" alt="" class="hero-v2-model" decoding="async" fetchpriority="high">
                    <div class="hero-v2-visual-fade"></div>
                </div>

                <div class="hero-v2-content">
                    <div class="hero-v2-brand" aria-label="goriva.online - Актуални цени в България">
                        <img src="media/2logo.png" alt="" class="hero-v2-logo-mark">
                        <div class="hero-v2-brand-copy">
                            <strong>goriva.online</strong>
                            <span><i></i> Актуални цени в България</span>
                        </div>
                    </div>

                    <div class="hero-v2-badge"><span></span> АКТУАЛНИ ЦЕНИ ОТ ШОФЬОРИ, ЗА ШОФЬОРИ</div>

                    <h1 class="hero-v2-title">
                        Намери най-евтиното<br>
                        гориво<br>
                        близо до теб
                    </h1>

                    <p class="hero-v2-desc">goriva.online събира реални цени на горивата в България,<br>подадени директно от шофьори.</p>

                    <div class="hero-v2-features">
                        <div class="hero-v2-card">
                            <div class="hero-v2-icon hero-v2-icon-red">⛽</div>
                            <div><strong>Реални цени от потребители</strong><span>Актуална информация за деня</span></div>
                        </div>
                        <div class="hero-v2-card">
                            <div class="hero-v2-icon hero-v2-icon-orange">📍</div>
                            <div><strong>По области и градове</strong><span>Бензиностанции в цялата страна</span></div>
                        </div>
                        <div class="hero-v2-card">
                            <div class="hero-v2-icon hero-v2-icon-green">📊</div>
                            <div><strong>Средни и най-ниски стойности</strong><span>Сравни и избери по-добра цена</span></div>
                        </div>
                    </div>

                    <a class="hero-v2-instagram" href="https://www.instagram.com/goriva.online/" target="_blank" rel="noopener noreferrer">
                        <div class="hero-v2-instagram-icon">◎</div>
                        <div class="hero-v2-instagram-copy">
                            <strong>Искаш да си информиран за цените на горивата всеки ден?</strong>
                            <span>Следвай <b>@goriva.online</b> за актуални цени, най-евтини бензиностанции и кратки сравнения.</span>
                        </div>
                        <div class="hero-v2-instagram-btn">Instagram →</div>
                    </a>
                </div>
            </div>`;

        const style = document.createElement('style');
        style.id = 'hero-v2-styles';
        style.textContent = `
            .about-project.hero-v2{position:relative;padding:18px 10px 34px!important;text-align:left!important;color:#0f2747;overflow:hidden;background:linear-gradient(90deg,#f8fbff 0%,#fff 40%,#fbfffd 100%)}
            .about-project.hero-v2::before,.about-project.hero-v2::after{content:"";position:absolute;border-radius:50%;pointer-events:none;z-index:0}
            .about-project.hero-v2::before{width:380px;height:380px;left:-250px;top:-210px;border:24px solid rgba(59,130,246,.06)}
            .about-project.hero-v2::after{width:500px;height:500px;right:-330px;bottom:-270px;border:28px solid rgba(16,185,129,.05)}
            .hero-v2 .about-inner{max-width:1440px!important;margin:0 auto;position:relative;z-index:1}
            .hero-v2-grid{display:grid;grid-template-columns:minmax(390px,.9fr) minmax(0,1.5fr);gap:26px;align-items:stretch;min-height:620px}
            .hero-v2-visual{position:relative;min-height:620px;overflow:hidden;background:transparent;border:0;border-radius:0;box-shadow:none;isolation:isolate}
            .hero-v2-model{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 34%;display:block;border:0;border-radius:0;box-shadow:none;transform:none;z-index:1}
            .hero-v2-visual::before,.hero-v2-visual::after{content:none!important;display:none!important}
            .hero-v2-visual-fade{position:absolute;inset:0;z-index:2;background:linear-gradient(90deg,transparent 0 84%,rgba(255,255,255,.45) 94%,#fff 100%);pointer-events:none}
            .hero-v2-content{min-width:0;padding:10px 0 0;display:flex;flex-direction:column;align-items:center;text-align:center}
            .hero-v2-brand{display:flex;align-items:center;justify-content:center;gap:12px;margin:0 0 12px}
            .hero-v2-logo-mark{width:58px;height:72px;object-fit:contain;display:block}
            .hero-v2-brand-copy{text-align:left}.hero-v2-brand-copy strong{display:block;color:#0b2c52;font-size:31px;line-height:1;font-weight:900;letter-spacing:-.035em}.hero-v2-brand-copy span{display:flex;align-items:center;gap:7px;color:#5f7188;font-size:15px;margin-top:6px}.hero-v2-brand-copy i{width:10px;height:10px;border-radius:50%;background:#18b96a;box-shadow:0 0 0 3px rgba(24,185,106,.1)}
            .hero-v2-badge{display:inline-flex;align-items:center;gap:10px;padding:9px 18px;border-radius:999px;background:#eefaf3;border:1px solid #d9f2e2;color:#14633f;font-size:12px;font-weight:800;letter-spacing:.02em;margin:2px 0 18px;white-space:nowrap}
            .hero-v2-badge span{width:11px;height:11px;border-radius:50%;background:#13b866;box-shadow:0 0 0 5px rgba(19,184,102,.1)}
            .hero-v2-title{margin:0;color:#0f2747;font-size:clamp(48px,5.2vw,76px);line-height:.97;font-weight:900;letter-spacing:-.045em;background:linear-gradient(90deg,#2468e8 4%,#087db1 50%,#0f9c5d 100%);-webkit-background-clip:text;background-clip:text;color:transparent;position:relative}
            .hero-v2-title::after{content:"";position:absolute;width:150px;height:7px;border-radius:999px;background:#f6b61c;right:3%;top:31%;transform:rotate(-2deg)}
            .hero-v2-desc{margin:28px 0 26px;color:#52657d;font-size:17px;line-height:1.55}
            .hero-v2-features{width:100%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
            .hero-v2-card{min-width:0;display:grid;grid-template-columns:50px 1fr;gap:12px;align-items:center;padding:18px 16px;background:rgba(255,255,255,.96);border:1px solid #e7edf5;border-radius:18px;box-shadow:0 12px 30px rgba(15,39,71,.08);text-align:left}
            .hero-v2-icon{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;font-size:22px;font-weight:800}
            .hero-v2-icon-red{background:#fff0f4}.hero-v2-icon-orange{background:#fff1ed}.hero-v2-icon-green{background:#ecfaf2}
            .hero-v2-card strong{display:block;color:#102744;font-size:14px;line-height:1.22;margin-bottom:6px}.hero-v2-card span{display:block;color:#65768b;font-size:12.5px;line-height:1.35}
            .hero-v2-instagram{width:100%;margin-top:24px;display:grid;grid-template-columns:74px minmax(0,1fr) auto;gap:16px;align-items:center;padding:22px 26px;border-radius:24px;text-decoration:none;color:#fff;background:linear-gradient(102deg,#6f19e8 0%,#d51686 34%,#ff3e34 66%,#ffb319 100%);box-shadow:0 18px 40px rgba(182,42,91,.17)}
            .hero-v2-instagram-icon{width:62px;height:62px;border-radius:19px;display:grid;place-items:center;border:3px solid rgba(255,255,255,.9);font-size:42px;line-height:1;background:rgba(255,255,255,.08)}
            .hero-v2-instagram-copy{text-align:left;min-width:0}.hero-v2-instagram-copy strong{display:block;font-size:17px;line-height:1.32;margin-bottom:7px}.hero-v2-instagram-copy span{display:block;font-size:13px;line-height:1.45;color:rgba(255,255,255,.94)}
            .hero-v2-instagram-btn{min-width:170px;padding:15px 20px;border-radius:999px;background:#fff;color:#ec1e62;font-weight:900;text-align:center;box-shadow:0 8px 24px rgba(76,18,37,.12)}
            .hero-v2-instagram:hover{transform:translateY(-2px);box-shadow:0 22px 48px rgba(182,42,91,.23)}
            @media(max-width:1100px){.hero-v2-grid{grid-template-columns:minmax(320px,.82fr) minmax(0,1.35fr);min-height:560px}.hero-v2-visual{min-height:560px}.hero-v2-title{font-size:clamp(42px,5vw,60px)}.hero-v2-brand-copy strong{font-size:27px}.hero-v2-logo-mark{width:52px;height:66px}.hero-v2-card{grid-template-columns:44px 1fr;padding:15px 13px}.hero-v2-icon{width:44px;height:44px}.hero-v2-instagram{grid-template-columns:58px 1fr auto;padding:18px 20px}.hero-v2-instagram-icon{width:54px;height:54px;font-size:35px}.hero-v2-instagram-btn{min-width:145px}}
            @media(max-width:840px){.about-project.hero-v2{padding:16px 8px 28px!important}.hero-v2-grid{grid-template-columns:1fr;gap:18px;min-height:0}.hero-v2-content{order:1}.hero-v2-visual{order:2;min-height:500px;max-height:560px;border:0;border-radius:0;background:transparent}.hero-v2-model{object-position:center 28%;border-radius:0}.hero-v2-visual-fade{background:linear-gradient(0deg,#fff 0%,rgba(255,255,255,.03) 18%,transparent 42%)}.hero-v2-title{font-size:clamp(40px,10vw,58px)}.hero-v2-desc br{display:none}.hero-v2-features{grid-template-columns:1fr}.hero-v2-card{padding:15px 16px}.hero-v2-instagram{grid-template-columns:58px 1fr;margin-top:18px}.hero-v2-instagram-btn{grid-column:1/-1;width:100%;box-sizing:border-box}.hero-v2-badge{font-size:10.5px;padding:8px 13px}.hero-v2-brand-copy strong{font-size:25px}.hero-v2-brand-copy span{font-size:13px}.hero-v2-logo-mark{width:48px;height:60px}}
            @media(max-width:520px){.hero-v2-title{font-size:42px;line-height:1}.hero-v2-title::after{width:92px;height:5px;right:2%;top:32%}.hero-v2-desc{font-size:15px;margin:20px 0}.hero-v2-brand{margin-top:2px;gap:9px}.hero-v2-brand-copy strong{font-size:23px}.hero-v2-brand-copy span{font-size:12px}.hero-v2-logo-mark{width:44px;height:55px}.hero-v2-visual{min-height:430px}.hero-v2-card strong{font-size:14px}.hero-v2-card span{font-size:12px}.hero-v2-instagram{padding:18px 16px;gap:12px;border-radius:20px}.hero-v2-instagram-copy strong{font-size:15px}.hero-v2-instagram-copy span{font-size:12px}.hero-v2-instagram-icon{width:50px;height:50px}.hero-v2-badge{white-space:normal;text-align:center;justify-content:center}}
        `;
        document.head.appendChild(style);
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
