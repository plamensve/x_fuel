(() => {
    if (!window.location.pathname.includes('/pages/articles/')) return;

    const loadStyles = () => {
        if (document.getElementById('article-modern-css')) return;
        const link = document.createElement('link');
        link.id = 'article-modern-css';
        link.rel = 'stylesheet';
        link.href = '/pages/styles/article-modern.css?v=20260829-article3';
        document.head.appendChild(link);
    };

    const initArticle = () => {
        const article = document.querySelector('.article-page');
        if (!article || document.body.classList.contains('article-modern-page')) return;

        document.body.classList.add('article-modern-page');
        loadStyles();

        const progress = document.createElement('div');
        progress.className = 'article-reading-progress';
        document.body.appendChild(progress);

        const title = article.querySelector('.article-title, h1');
        const textRoot = article.querySelector('.article-content-full') || article.querySelector('.article-container') || article;
        const wordCount = (textRoot.innerText || '').trim().split(/\s+/).filter(Boolean).length;
        const minutes = Math.max(1, Math.round(wordCount / 210));

        const topLine = document.createElement('div');
        topLine.className = 'article-modern-topline';
        topLine.innerHTML = `<a class="article-back-link" href="/pages/news.html">← Всички новини и анализи</a><span class="article-reading-time">${minutes} мин четене</span>`;
        article.insertBefore(topLine, title || article.firstChild);

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
        end.innerHTML = `<div><strong>Продължи с данните</strong><p>Сравни текущите цени или проследи движението им във времето.</p></div><a href="/pages/trends.html">История на цените →</a>`;
        article.appendChild(end);

        const updateProgress = () => {
            const doc = document.documentElement;
            const max = Math.max(1, doc.scrollHeight - window.innerHeight);
            progress.style.width = `${Math.min(100, Math.max(0, (window.scrollY / max) * 100))}%`;
        };
        updateProgress();
        window.addEventListener('scroll', updateProgress, {passive:true});
    };

    loadStyles();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initArticle, {once:true});
    else initArticle();
})();
