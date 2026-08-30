(() => {
  const VIEW_BASE = 225;
  const LIKE_BASE = 85;

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const safeParse = (value, fallback) => {
    try { return JSON.parse(value); } catch { return fallback; }
  };

  const articleKey = (() => {
    const canonical = q('link[rel="canonical"]')?.href;
    return canonical || `${location.origin}${location.pathname}`;
  })();

  const storageKey = (suffix) => `goriva:article:${articleKey}:${suffix}`;

  function readPublishedAt() {
    for (const node of qa('script[type="application/ld+json"]')) {
      const data = safeParse(node.textContent || '', null);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item && (item['@type'] === 'NewsArticle' || item['@type'] === 'Article') && item.datePublished) {
          return item.datePublished;
        }
      }
    }
    return null;
  }

  function formatPublished(value) {
    if (!value) return 'Дата не е налична';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('bg-BG', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(date).replace(' г.', '');
  }

  function initPublished() {
    const publishedAt = readPublishedAt();
    qa('[data-article-published]').forEach((node) => {
      node.textContent = formatPublished(publishedAt);
      if (publishedAt && node.tagName === 'TIME') node.dateTime = publishedAt;
    });
  }

  function initViews() {
    const viewedKey = storageKey('viewed');
    const countKey = storageKey('views');
    let views = Number(localStorage.getItem(countKey) || VIEW_BASE);
    if (!localStorage.getItem(viewedKey)) {
      views += 1;
      localStorage.setItem(countKey, String(views));
      localStorage.setItem(viewedKey, '1');
    }
    qa('[data-article-views]').forEach((node) => { node.textContent = views.toLocaleString('bg-BG'); });
  }

  function initLikes() {
    const likedKey = storageKey('liked');
    const countKey = storageKey('likes');
    let likes = Number(localStorage.getItem(countKey) || LIKE_BASE);
    let liked = localStorage.getItem(likedKey) === '1';

    const sync = () => {
      qa('[data-article-likes]').forEach((node) => { node.textContent = likes.toLocaleString('bg-BG'); });
      qa('[data-like-article]').forEach((button) => {
        button.classList.toggle('is-liked', liked);
        button.setAttribute('aria-pressed', liked ? 'true' : 'false');
        const label = q('.article-like-label', button);
        if (label) label.textContent = liked ? 'Харесано' : 'Харесай';
      });
    };

    qa('[data-like-article]').forEach((button) => {
      button.addEventListener('click', () => {
        liked = !liked;
        likes = Math.max(LIKE_BASE, likes + (liked ? 1 : -1));
        localStorage.setItem(countKey, String(likes));
        localStorage.setItem(likedKey, liked ? '1' : '0');
        sync();
      });
    });
    sync();
  }

  function shareUrl(network, url, title) {
    const u = encodeURIComponent(url);
    const t = encodeURIComponent(title);
    const text = encodeURIComponent(`${title} ${url}`);
    const links = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      whatsapp: `https://wa.me/?text=${text}`,
      telegram: `https://t.me/share/url?url=${u}&text=${t}`,
      viber: `viber://forward?text=${text}`,
      reddit: `https://www.reddit.com/submit?url=${u}&title=${t}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${u}&description=${t}`,
      email: `mailto:?subject=${t}&body=${text}`
    };
    return links[network] || null;
  }

  async function copyLink(button, url) {
    try {
      await navigator.clipboard.writeText(url);
      const original = button.textContent;
      button.textContent = 'Копирано ✓';
      setTimeout(() => { button.textContent = original; }, 1600);
    } catch {
      window.prompt('Копирай линка:', url);
    }
  }

  function initSharing() {
    const url = q('link[rel="canonical"]')?.href || location.href;
    const title = q('h1')?.textContent?.trim() || document.title;

    qa('[data-share-network]').forEach((button) => {
      button.addEventListener('click', async () => {
        const network = button.dataset.shareNetwork;
        if (network === 'copy') return copyLink(button, url);
        if (network === 'native') {
          if (navigator.share) {
            try { await navigator.share({ title, url }); } catch {}
          } else {
            await copyLink(button, url);
          }
          return;
        }
        const target = shareUrl(network, url, title);
        if (!target) return;
        if (target.startsWith('mailto:') || target.startsWith('viber:')) {
          location.href = target;
        } else {
          window.open(target, '_blank', 'noopener,noreferrer,width=720,height=640');
        }
      });
    });
  }

  function init() {
    if (!q('.article-engagement')) return;
    initPublished();
    initViews();
    initLikes();
    initSharing();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
