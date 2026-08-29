(() => {
    const init = () => {
        if (!document.querySelector('.how-it-works') && !document.querySelector('.about-founder')) return;

        if (!document.querySelector('link[data-home-about-modern]')) {
            const style = document.createElement('link');
            style.rel = 'stylesheet';
            style.href = '/pages/styles/home-about-modern.css?v=20260829-1123';
            style.dataset.homeAboutModern = 'true';
            document.head.appendChild(style);
        }

        const how = document.querySelector('.how-it-works');
        if (how) {
            how.innerHTML = `
                <div class="container">
                    <div class="how-header">
                        <span class="how-eyebrow">Как работи платформата</span>
                        <h2 class="how-title">От реална цена до по-добро решение</h2>
                        <p class="how-subtitle">goriva.online събира, подрежда и сравнява актуална информация, за да можеш по-бързо да откриеш къде е изгодно да заредиш.</p>
                    </div>
                    <div class="steps">
                        <article class="step" data-step="01">
                            <div class="step-icon">⛽</div>
                            <span class="step-tag">Стъпка 1</span>
                            <h3>Получаваме актуални цени</h3>
                            <p>Цените се събират от потребителски сигнали и автоматизирано обновявани източници, след което се подреждат по станция, град и гориво.</p>
                        </article>
                        <article class="step" data-step="02">
                            <div class="step-icon">▥</div>
                            <span class="step-tag">Стъпка 2</span>
                            <h3>Данните се обработват</h3>
                            <p>Платформата сравнява наличните стойности и показва средни, най-ниски и исторически цени в удобен за преглед формат.</p>
                        </article>
                        <article class="step" data-step="03">
                            <div class="step-icon">⌖</div>
                            <span class="step-tag">Стъпка 3</span>
                            <h3>Избираш по-информирано</h3>
                            <p>Виждаш най-изгодните предложения, картата на станциите и полезни инструменти, за да планираш зареждането и пътуването си.</p>
                        </article>
                    </div>
                </div>`;
        }

        const founder = document.querySelector('.about-founder');
        if (founder) {
            founder.innerHTML = `
                <div class="founder-card">
                    <aside class="founder-left">
                        <div class="founder-image-wrapper"><img src="/media/plamen.jpg" alt="Пламен Светославов"></div>
                        <h2 class="founder-name">Пламен Светославов</h2>
                        <span class="founder-role">Създател на goriva.online</span>
                        <p class="founder-mini-copy">Развивам goriva.online като практична платформа за данни, сравнение и полезни инструменти за шофьори и бизнеси в България.</p>
                        <div class="founder-socials">
                            <a href="https://www.linkedin.com/in/plamen-svetoslavov/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                            <a href="https://www.facebook.com/groups/960591129738525" target="_blank" rel="noopener noreferrer">Facebook общност</a>
                        </div>
                    </aside>

                    <div class="founder-right">
                        <section class="founder-section">
                            <span class="section-label">ЗА ПРОЕКТА</span>
                            <h3>Независим проект с фокус върху полезни данни и реална стойност</h3>
                            <p>Създадох goriva.online, за да направя информацията за горивата по-достъпна, разбираема и практична. Целта е сайтът да помага както на хората, които търсят добра цена наблизо, така и на компании, които искат по-добра видимост върху пазара и разходите си.</p>
                        </section>

                        <div class="founder-grid">
                            <article class="founder-box"><span class="box-title">ДАННИ</span><p>Актуални, исторически и сравнителни данни за горива по градове, станции и вид гориво.</p></article>
                            <article class="founder-box"><span class="box-title">ПРАКТИЧНОСТ</span><p>Карта, сравнение на цени, история, прогноза за времето и инструменти за пътя.</p></article>
                            <article class="founder-box"><span class="box-title">ОБЩНОСТ</span><p>Платформата се развива с обратна връзка от потребители и реални нужди от ежедневието.</p></article>
                            <article class="founder-box"><span class="box-title">РАЗВИТИЕ</span><p>Добавям нови функционалности, автоматизация и бизнес решения, които разширяват полезността на сайта.</p></article>
                        </div>

                        <section class="founder-partnerships" id="partnerships">
                            <div class="founder-partnerships-top">
                                <div>
                                    <span class="partnership-badge">Реклама и партньорства</span>
                                    <h4>Имате бизнес, който е релевантен за аудиторията на goriva.online?</h4>
                                    <p>Предлагам възможности за реклама, брандирано присъствие, спонсорирано съдържание и други подходящи формати. Отворен съм и към технологични, медийни и бизнес колаборации, когато имат реална стойност за потребителите на платформата.</p>
                                </div>
                            </div>
                            <div class="partnership-actions">
                                <a class="partner-primary" href="mailto:svetoslavov.plamen@gmail.com?subject=Реклама%20или%20партньорство%20с%20goriva.online">Запитване за реклама / партньорство</a>
                                <a class="partner-secondary" href="/pages/business-clients.html">Решения за бизнеса</a>
                            </div>
                        </section>

                        <div class="founder-contact-section">
                            <div class="founder-contact-header">Контакт и идеи</div>
                            <p class="founder-contact-text">За предложения, обратна връзка, реклама или колаборации можеш да се свържеш директно с мен.</p>
                            <div class="founder-contact-grid">
                                <a href="mailto:svetoslavov.plamen@gmail.com" class="contact-card"><span class="contact-title">Email</span><span class="contact-value">svetoslavov.plamen@gmail.com</span></a>
                                <a href="tel:+359883427273" class="contact-card"><span class="contact-title">Телефон</span><span class="contact-value">+359 883 427 273</span></a>
                            </div>
                        </div>
                    </div>
                </div>`;
        }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
    else init();
})();
