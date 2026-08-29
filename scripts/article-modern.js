(() => {
    if (!window.location.pathname.includes('/pages/articles/')) return;

    const loadStyles = () => {
        let link = document.getElementById('article-modern-css');
        if (!link) {
            link = document.createElement('link');
            link.id = 'article-modern-css';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        link.href = '/pages/styles/article-modern.css?v=20260829-article4';
    };

    const getArticleRoot = () => document.querySelector('.article-page, .analysis-article');

    const addClassOnce = (node, className) => {
        if (node && !node.classList.contains(className)) node.classList.add(className);
    };

    const initArticle = () => {
        const article = getArticleRoot();
        if (!article || document.body.classList.contains('article-modern-page')) return;

        document.body.classList.add('article-modern-page');
        loadStyles();

        const dataArticle = article.classList.contains('analysis-article');
        if (dataArticle) document.body.classList.add('article-data-story');

        const main = article.closest('main') || document.querySelector('main');
        if (main) main.classList.add('article-modern-main');

        const progress = document.createElement('div');
        progress.className = 'article-reading-progress';
        progress.setAttribute('aria-hidden', 'true');
        document.body.appendChild(progress);

        let title = article.querySelector('.article-title, h1');
        const pageHeader = document.querySelector('.page-header');
        if (dataArticle && pageHeader) title = pageHeader.querySelector('h1') || title;

        const textRoot = article.querySelector('.article-content-full') || article.querySelector('.article-container') || article;
        const words = (textRoot.innerText || '').trim().split(/\s+/).filter(Boolean).length;
        const minutes = Math.max(1, Math.ceil(words / 220));

        const topLine = document.createElement('div');
        topLine.className = 'article-modern-topline';
        topLine.innerHTML = `
            <a class="article-back-link" href="/pages/news.html"><span aria-hidden="true">←</span> Новини и анализи</a>
            <div class="article-top-meta"><span class="article-reading-time">${minutes} мин четене</span><span class="article-content-type">${dataArticle ? 'Данни и анализ' : 'Статия'}</span></div>
        `;

        if (dataArticle && pageHeader) pageHeader.prepend(topLine);
        else article.insertBefore(topLine, title || article.firstChild);

        const meta = article.querySelector('.article-meta');
        if (meta) addClassOnce(meta, 'article-modern-meta');

        const heroImage = article.querySelector('.article-image-main, .article-main-img');
        if (heroImage) {
            const media = document.createElement('div');
            media.className = 'article-hero-media';
            heroImage.parentNode.insertBefore(media, heroImage);
            media.appendChild(heroImage);
        }

        const source = document.querySelector('.data-source');
        if (source) source.classList.add('article-source-card');

        const infoNote = document.querySelector('.info-note');
        if (infoNote) infoNote.classList.add('article-info-chip');

        article.querySelectorAll('h2').forEach((heading, index) => {
            heading.dataset.sectionIndex = String(index + 1).padStart(2, '0');
        });

        const shareTitle = encodeURIComponent(document.title);
        const shareUrl = encodeURIComponent(window.location.href);
        article.querySelectorAll('.share-btn').forEach(link => {
            const classes = link.className;
            if (classes.includes('facebook')) link.href = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
            else if (classes.includes('linkedin')) link.href = `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`;
            else if (classes.includes('twitter')) link.href = `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`;
            link.rel = 'noopener noreferrer';
        });

        const end = document.createElement('aside');
        end.className = 'article-modern-end';
        end.innerHTML = `
            <div class="article-end-copy">
                <span>goriva.online</span>
                <strong>Продължи с актуалните данни</strong>
                <p>Сравни текущите цени по градове и бензиностанции или проследи движението им във времето.</p>
            </div>
            <div class="article-end-actions">
                <a class="article-end-secondary" href="/">Текущи цени</a>
                <a class="article-end-primary" href="/pages/trends.html">История на цените →</a>
            </div>
        `;
        article.appendChild(end);

        const updateProgress = () => {
            const doc = document.documentElement;
            const max = Math.max(1, doc.scrollHeight - window.innerHeight);
            progress.style.width = `${Math.min(100, Math.max(0, (window.scrollY / max) * 100))}%`;
        };
        updateProgress();
        window.addEventListener('scroll', updateProgress, { passive: true });
    };

    loadStyles();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initArticle, { once: true });
    else initArticle();
})();