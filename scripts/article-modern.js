(() => {
    if (!window.location.pathname.includes('/pages/articles/')) return;

    const loadStyles = () => {
        if (document.getElementById('article-modern-css')) return;
        const link = document.createElement('link');
        link.id = 'article-modern-css';
        link.rel = 'stylesheet';
        link.href = '/pages/styles/article-modern.css?v=20260829-newsroom1';
        document.head.appendChild(link);
    };

    const articleCategory = () => {
        const path = window.location.pathname;
        const text = document.title.toLowerCase();
        if (path.includes('fuel-cards') || text.includes('бизнес')) return 'Бизнес';
        if (path.includes('fuel-analysis') || text.includes('анализ')) return 'Пазарен анализ';
        return 'Цени на горивата';
    };

    const initArticle = () => {
        let article = document.querySelector('.article-page');
        if (!article) {
            const analysis = document.querySelector('.analysis-article');
            if (analysis) {
                article = analysis.closest('main') || analysis.parentElement;
                article.classList.add('article-page');
            }
        }
        if (!article || document.body.classList.contains('article-modern-page')) return;

        document.body.classList.add('article-modern-page');
        loadStyles();

        const title = article.querySelector('.article-title, .page-title, h1');
        const textRoot = article.querySelector('.article-content-full, .analysis-article, .article-container') || article;
        const wordCount = (textRoot.innerText || '').trim().split(/\s+/).filter(Boolean).length;
        const minutes = Math.max(1, Math.round(wordCount / 210));

        const topLine = document.createElement('div');
        topLine.className = 'article-modern-topline';
        topLine.innerHTML = `<a class="article-back-link" href="/pages/news.html">← Новини и анализи</a><span class="article-reading-time">${minutes} мин четене</span>`;
        article.insertBefore(topLine, title || article.firstChild);

        if (title) {
            const kicker = document.createElement('div');
            kicker.className = 'article-news-kicker';
            kicker.textContent = articleCategory();
            title.before(kicker);
        }

        const content = article.querySelector('.article-content-full');
        if (content) {
            const firstParagraph = content.querySelector(':scope > p');
            if (firstParagraph && title) {
                const deck = document.createElement('p');
                deck.className = 'article-news-deck';
                deck.textContent = firstParagraph.textContent.trim();
                const meta = article.querySelector('.article-meta');
                (meta || title).after(deck);
                firstParagraph.remove();
            }

            const paragraphs = [...content.querySelectorAll(':scope > p')];
            if (paragraphs.length >= 5 && !content.querySelector('.article-pullquote')) {
                const source = paragraphs[Math.min(2, paragraphs.length - 1)];
                const quote = document.createElement('aside');
                quote.className = 'article-pullquote';
                quote.textContent = source.textContent.trim();
                source.after(quote);
            }

            const layout = document.createElement('div');
            layout.className = 'article-news-layout';
            const main = document.createElement('div');
            main.className = 'article-news-main';
            const side = document.createElement('aside');
            side.className = 'article-news-side';
            side.innerHTML = `<strong>Още от goriva.online</strong><a href="/pages/news.html">Последни новини и анализи</a><a href="/pages/trends.html">История на цените</a><a href="/">Актуални цени днес</a><a href="/pages/business-clients.html">Решения за бизнеса</a>`;

            content.before(layout);
            main.appendChild(content);
            const shareBottom = article.querySelector('.share-section-2');
            if (shareBottom) main.appendChild(shareBottom);
            layout.append(main, side);
        }

        const image = article.querySelector('.article-image-main, .article-main-img');
        if (image && !article.querySelector('.article-image-caption')) {
            const caption = document.createElement('p');
            caption.className = 'article-image-caption';
            caption.textContent = 'Илюстрация: goriva.online';
            image.after(caption);
        }

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
        end.innerHTML = `<div><strong>Следи пазара с реални данни</strong><p>Сравни текущите цени или виж как са се променяли във времето.</p></div><a href="/pages/trends.html">История на цените →</a>`;
        article.appendChild(end);
    };

    loadStyles();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initArticle, {once:true});
    else initArticle();
})();
