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

  const ICONS = {
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.6 1.6-1.6H17V4.8c-.4-.1-1.3-.2-2.4-.2-2.4 0-4.1 1.5-4.1 4.2V11H8v3h2.5v8h3z"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 3H22l-6.8 7.8L23 21h-6.1l-4.8-6.3L6.6 21H3.4l7.2-8.2L3 3h6.3l4.3 5.7L18.9 3zm-1.1 16h1.7L8.4 4.9H6.6L17.8 19z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.1 7.3A2.1 2.1 0 1 0 5.1 3a2.1 2.1 0 0 0 0 4.3zM3.3 21h3.6V9H3.3v12zM9.1 9v12h3.6v-6.7c0-1.8.3-3.5 2.5-3.5 2.2 0 2.2 2 2.2 3.6V21H21v-7.4c0-3.6-.8-6.3-4.9-6.3-2 0-3.3 1.1-3.8 2.1h-.1V9H9.1z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 1.9 17.8L.3 23.5l5.9-1.5a11.8 11.8 0 0 0 14.3-18.5zM12 20a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.5.9.9-3.4-.2-.4A9.8 9.8 0 1 1 12 20zm5.4-7.4c-.3-.1-1.8-.9-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.4.2-.7.1-2-.8-3.4-2.4-4.3-4.1-.2-.3 0-.5.1-.6l.5-.6.2-.5c.1-.2 0-.4 0-.6-.1-.2-.7-1.8-1-2.4-.3-.6-.6-.5-.8-.5h-.7c-.2 0-.6.1-.9.4-.3.4-1.2 1.2-1.2 2.9 0 1.7 1.2 3.3 1.4 3.5.2.2 2.4 3.7 5.8 5.2 2.1.9 2.9 1 3.9.9 1.2-.2 1.8-.8 2.1-1.6.3-.8.3-1.4.2-1.6-.1-.2-.3-.3-.6-.4z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.8 3.2 18.6 20c-.2 1.2-.9 1.5-1.8.9l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.1 13.8l-4.9-1.5c-1.1-.3-1.1-1.1.2-1.6L20.5 3.3c.9-.3 1.6.2 1.3 1.9z"/></svg>',
    viber: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.4 2 2 6 2 11c0 2.9 1.5 5.5 4 7.1V22l3.5-2.1c.8.2 1.7.3 2.5.3 5.6 0 10-4 10-9S17.6 2 12 2zm4.8 13.2c-.3.7-1.6 1.3-2.2 1.4-.6.1-1.4.2-4.1-1-3.4-1.5-5.5-5.2-5.7-5.5-.2-.3-1.3-1.8-1.3-3.4s.8-2.4 1.1-2.8c.3-.3.7-.4 1-.4h.7c.2 0 .5-.1.7.6.3.8 1 2.6 1.1 2.8.1.2.2.5 0 .8-.1.3-.2.5-.5.7l-.7.7c-.2.2-.5.5-.2.9.3.5 1.2 2 2.6 3.2 1.8 1.6 3.3 2.1 3.8 2.3.5.2.8.2 1-.1l1.3-1.5c.3-.3.5-.4.9-.2l2.5 1.2c.4.2.7.3.8.5.1.1.1.8-.2 1.5z"/></svg>',
    reddit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 12.1c-.1 0-.3 0-.4.1-1.1-1.6-3.1-2.7-5.5-3l1.1-5.1 3.5.8a1.8 1.8 0 1 0 .2-1l-4-.9a.5.5 0 0 0-.6.4l-1.2 5.6H12c-2.5 0-4.7.8-6 2.2-.2-.1-.4-.1-.6-.1a2.4 2.4 0 0 0-1.2 4.5v.6c0 3.4 3.5 6.2 7.8 6.2s7.8-2.8 7.8-6.2v-.5a2.4 2.4 0 0 0 .7-3.6zM8.1 15.2a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6zm6.9 3.4c-.8.8-2 .9-3 .9s-2.2-.1-3-.9a.5.5 0 1 1 .7-.7c.5.5 1.4.6 2.3.6s1.8-.1 2.3-.6a.5.5 0 1 1 .7.7zm.9-3.4a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6z"/></svg>',
    pinterest: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.2 2C6.7 2 3 6 3 10.8c0 3.6 2 5.7 3.3 5.7.5 0 .8-1.5.8-1.9 0-.5-1.2-1.5-1.2-3.6 0-3.9 3-6.7 6.8-6.7 3.7 0 5.7 2.1 5.7 5.4 0 2.5-1 7.2-4.3 7.2-1.2 0-2.2-.9-2.2-2.1 0-1.8 1.2-3.5 1.2-5.3 0-3.1-4.4-2.5-4.4 1.2 0 .8.1 1.6.5 2.3l-1.9 8c-.2.7 0 2.3.1 3 .5-.6 1.3-1.8 1.5-2.6l1-3.8c.5.9 1.8 1.7 3.2 1.7 4.2 0 7.1-3.8 7.1-8.8C20.2 5.6 16.4 2 12.2 2z"/></svg>',
    email: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2zm9 7.2L3.5 7h17L12 12.2zM3 17h18V8.5l-9 5.5-9-5.5V17z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3v3a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3h3zm2 0h4a3 3 0 0 1 3 3v4h3V4H10v3zm4 2H5a1 1 0 0 0-1 1v9c0 .6.4 1 1 1h9c.6 0 1-.4 1-1v-9c0-.6-.4-1-1-1z"/></svg>',
    native: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16a3 3 0 0 0-2.4 1.2l-7-4.1a3.2 3.2 0 0 0 0-2.2l7-4.1A3 3 0 1 0 15 5c0 .2 0 .4.1.6l-7 4.1a3 3 0 1 0 0 4.6l7 4.1A3 3 0 1 0 18 16z"/></svg>'
  };

  const SHARE_BUTTONS = [
    ['facebook', 'Facebook'], ['x', 'X'], ['linkedin', 'LinkedIn'], ['whatsapp', 'WhatsApp'],
    ['telegram', 'Telegram'], ['viber', 'Viber'], ['reddit', 'Reddit'], ['pinterest', 'Pinterest'],
    ['email', 'Email'], ['copy', 'Копирай линк'], ['native', 'Още']
  ];

  function readPublishedAt() {
    for (const node of qa('script[type="application/ld+json"]')) {
      const data = safeParse(node.textContent || '', null);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item && (item['@type'] === 'NewsArticle' || item['@type'] === 'Article') && item.datePublished) return item.datePublished;
      }
    }
    return null;
  }

  function formatPublished(value) {
    if (!value) return 'Дата не е налична';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('bg-BG', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date).replace(' г.', '');
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
    qa('[data-like-article]').forEach((button) => button.addEventListener('click', () => {
      liked = !liked;
      likes = Math.max(LIKE_BASE, likes + (liked ? 1 : -1));
      localStorage.setItem(countKey, String(likes));
      localStorage.setItem(likedKey, liked ? '1' : '0');
      sync();
    }));
    sync();
  }

  function shareUrl(network, url, title) {
    const u = encodeURIComponent(url);
    const t = encodeURIComponent(title);
    const text = encodeURIComponent(`${title} ${url}`);
    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      whatsapp: `https://wa.me/?text=${text}`,
      telegram: `https://t.me/share/url?url=${u}&text=${t}`,
      viber: `viber://forward?text=${text}`,
      reddit: `https://www.reddit.com/submit?url=${u}&title=${t}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${u}&description=${t}`,
      email: `mailto:?subject=${t}&body=${text}`
    }[network] || null;
  }

  function decorateShareButton(button, network, label) {
    button.dataset.shareNetwork = network;
    button.classList.add('article-share-button', `article-share-button--${network}`);
    if (network === 'native') button.classList.add('article-share-button--primary');
    button.setAttribute('aria-label', `Сподели чрез ${label}`);
    button.innerHTML = `<span class="article-share-icon">${ICONS[network] || ''}</span><span class="article-share-text">${label}</span>`;
  }

  function normalizeShareRows() {
    qa('.article-share-row').forEach((row) => {
      const labelNode = q('.article-share-label', row);
      const existing = new Map(qa('[data-share-network]', row).map((button) => [button.dataset.shareNetwork, button]));
      SHARE_BUTTONS.forEach(([network, label]) => {
        let button = existing.get(network);
        if (!button) {
          button = document.createElement('button');
          button.type = 'button';
          row.appendChild(button);
        }
        decorateShareButton(button, network, label);
      });
      if (labelNode && labelNode !== row.firstElementChild) row.prepend(labelNode);
    });
  }

  async function copyLink(button, url) {
    const label = q('.article-share-text', button);
    const original = label?.textContent || 'Копирай линк';
    try {
      await navigator.clipboard.writeText(url);
      if (label) label.textContent = 'Копирано ✓';
      setTimeout(() => { if (label) label.textContent = original; }, 1600);
    } catch {
      window.prompt('Копирай линка:', url);
    }
  }

  function initSharing() {
    normalizeShareRows();
    const url = q('link[rel="canonical"]')?.href || location.href;
    const title = q('h1')?.textContent?.trim() || document.title;
    qa('[data-share-network]').forEach((button) => button.addEventListener('click', async () => {
      const network = button.dataset.shareNetwork;
      if (network === 'copy') return copyLink(button, url);
      if (network === 'native') {
        if (navigator.share) {
          try { await navigator.share({ title, url }); } catch {}
        } else await copyLink(button, url);
        return;
      }
      const target = shareUrl(network, url, title);
      if (!target) return;
      if (target.startsWith('mailto:') || target.startsWith('viber:')) location.href = target;
      else window.open(target, '_blank', 'noopener,noreferrer,width=720,height=640');
    }));
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
