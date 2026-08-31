(() => {
    if (!window.location.pathname.includes('/pages/articles/')) return;

    const normalizeLegacyCurrency = root => {
        if (!window.location.pathname.includes('/pages/articles/daily/')) return;
        const replaceCurrency = value => String(value || '')
            .replace(/(\d[\d\s.,]*)\s*(?:лв\.?|лева|левове|BGN)\b/gi, '$1 €')
            .replace(/\b(?:лв\.?|лева|левове|BGN)\s*\/\s*(литър|л|кг|kg)/gi, '€ / $1');

        const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(node => {
            const updated = replaceCurrency(node.nodeValue);
            if (updated !== node.nodeValue) node.nodeValue = updated;
        });

        document.querySelectorAll('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]').forEach(meta => {
            const updated = replaceCurrency(meta.content);
            if (updated !== meta.content) meta.content = updated;
        });
    };

    const loadStyles = () => {
        if (!document.getElementById('article-modern-css')) {
            const link = document.createElement('link');
            link.id = 'article-modern-css';
            link.rel = 'stylesheet';
            link.href = '/pages/styles/article-modern.css?v=20260829-newsroom2';
            document.head.appendChild(link);
        }
        if (window.location.pathname.includes('/pages/articles/daily/') && !document.getElementById('daily-article-css')) {
            const daily = document.createElement('link');
            daily.id = 'daily-article-css';
            daily.rel = 'stylesheet';
            daily.href = '/pages/styles/daily-article.css?v=20260829-daily2';
            document.head.appendChild(daily);
        }
    };

    const articleCategory = () => {
        const path = window.location.pathname;
        const text = document.title.toLowerCase();
        if (path.includes('/daily/')) return 'Дневен обзор';
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

        normalizeLegacyCurrency(article);
        document.body.classList.add('article-modern-page');
        if (window.location.pathname.includes('/pages/articles/daily/')) document.body.classList.add('daily-article-page');
        loadStyles();

        const title = article.querySelector('.article-title, .page-title, h1');
        const textRoot = article.querySelector('.article-content-full, .analysis-article, .article-container') || article;
        const wordCount = (textRoot.innerText || '').trim().split(/\s+/).filter(Boolean).length;
        const minutes = Math.max(1, Math.round(wordCount / 210));

        if (!article.querySelector('.article-modern-topline')) {
            const topLine = document.createElement('div');
            topLine.className = 'article-modern-topline';
            topLine.innerHTML = `<a class="article-back-link" href="/pages/news.html">← Новини и анализи</a><span class="article-reading-time">${minutes} мин четене</span>`;
            article.insertBefore(topLine, title || article.firstChild);
        }

        if (title && !article.querySelector('.article-news-kicker')) {
            const kicker = document.createElement('div');
            kicker.className = 'article-news-kicker';
            kicker.textContent = articleCategory();
            title.before(kicker);
        }

        const content = article.querySelector('.article-content-full');
        if (content) {
            const existingDeck = article.querySelector('.article-news-deck');
            const firstParagraph = content.querySelector(':scope > p');
            if (!existingDeck && firstParagraph && title) {
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

            if (!article.querySelector('.article-news-layout')) {
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

        if (!article.querySelector('.article-modern-end')) {
            const end = document.createElement('aside');
            end.className = 'article-modern-end';
            end.innerHTML = `<div><strong>Следи пазара с реални данни</strong><p>Сравни текущите цени или виж как са се променяли във времето.</p></div><a href="/pages/trends.html">История на цените →</a>`;
            article.appendChild(end);
        }
    };

    loadStyles();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initArticle, {once:true});
    else initArticle();
})();
