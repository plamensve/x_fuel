(() => {
  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const safeParse = (value, fallback) => { try { return JSON.parse(value); } catch { return fallback; } };

  const SUPABASE_URL = 'https://eaqvhxfvozhzatrnbkvx.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_u4ymkO5tFBauze0rVOkf-Q_kvbiIdwH';
  const articleKey = q('link[rel="canonical"]')?.href || `${location.origin}${location.pathname}`;
  const storageKey = (suffix) => `goriva:article:${articleKey}:${suffix}`;

  const ICONS = {
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.025 4.388 11.02 10.125 11.927v-8.437H7.078v-3.49h3.047V9.414c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971h-1.513c-1.49 0-1.956.932-1.956 1.887v2.262h3.328l-.532 3.49h-2.796V24C19.612 23.093 24 18.098 24 12.073z"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26L22.827 21.75h-6.657l-5.214-6.817-5.967 6.817H1.68l7.73-8.835L1.254 2.25h6.826l4.713 6.231 5.451-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.94v5.666H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.966-.273-.099-.471-.149-.67.149-.198.297-.767.966-.94 1.164-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.496.099-.198.05-.372-.025-.521-.074-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.009-.372-.011-.57-.011-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.693.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.004 21.785h-.004a9.78 9.78 0 0 1-4.986-1.365l-.358-.213-3.708.973.99-3.614-.233-.371a9.76 9.76 0 1 1 8.299 4.59zm8.287-17.837A11.853 11.853 0 0 0 12.005.522C5.548.522.298 5.772.295 12.229c0 2.149.561 4.246 1.626 6.092L.195 24l5.833-1.53a11.75 11.75 0 0 0 5.972 1.521h.005c6.456 0 11.707-5.251 11.71-11.708a11.636 11.636 0 0 0-3.424-8.335z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.953 4.57a.832.832 0 0 0-1.172-.771L.995 12.208c-.94.367-.929.89-.16 1.126l5.588 1.743 2.15 6.729c.254.703.129.982.865.982.568 0 .818-.259 1.136-.568l2.735-2.66 5.692 4.204c1.048.578 1.803.278 2.064-.973L24 4.57h-.047zM8.793 14.676l10.93-6.897c.546-.331 1.045-.153.635.211l-9.02 8.142-.351 3.764-2.194-5.22z"/></svg>',
    email: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/></svg>',
    native: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>'
  };

  const SHARE_BUTTONS = [
    ['facebook', 'Facebook'], ['x', 'X'], ['linkedin', 'LinkedIn'], ['whatsapp', 'WhatsApp'],
    ['telegram', 'Telegram'], ['email', 'Email'], ['copy', 'Копирай линк'], ['native', 'Още']
  ];

  function readPublishedAt() {
    for (const node of qa('script[type="application/ld+json"]')) {
      const data = safeParse(node.textContent || '', null);
      for (const item of (Array.isArray(data) ? data : [data])) {
        if (item && (item['@type'] === 'NewsArticle' || item['@type'] === 'Article') && item.datePublished) return item.datePublished;
      }
    }
    return null;
  }

  function formatPublished(value) {
    if (!value) return 'Дата не е налична';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('bg-BG', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(date).replace(' г.', '');
  }

  function statsMarkup() {
    return `<div class="article-engagement-stats">
      <span class="article-engagement-stat article-engagement-stat--date">Публикувана: <strong><time data-article-published>—</time></strong></span>
      <span class="article-engagement-dot" aria-hidden="true"></span>
      <span class="article-engagement-stat"><strong data-article-views>—</strong> прочитания</span>
      <span class="article-engagement-dot" aria-hidden="true"></span>
      <span class="article-engagement-stat"><strong data-article-likes>—</strong> харесвания</span>
    </div>`;
  }

  function likeButtonMarkup() {
    return '<button class="article-like-button" type="button" data-like-article aria-pressed="false"><span class="heart" aria-hidden="true">♡</span><span class="article-like-label">Харесай</span></button>';
  }

  function ensureMatchingBlocks() {
    qa('.article-engagement, .article-engagement-footer').forEach((block) => {
      block.classList.add('article-engagement-shell');
      let top = q('.article-engagement-top', block);
      if (!top) {
        top = document.createElement('div');
        top.className = 'article-engagement-top';
        top.innerHTML = statsMarkup() + likeButtonMarkup();
        block.prepend(top);
      } else {
        if (!q('.article-engagement-stats', top)) top.insertAdjacentHTML('afterbegin', statsMarkup());
        if (!q('[data-like-article]', top)) top.insertAdjacentHTML('beforeend', likeButtonMarkup());
      }
      const row = q('.article-share-row', block);
      if (row) {
        q('.article-share-row > .article-like-button', block)?.remove();
        let label = q('.article-share-label', row);
        if (!label) {
          label = document.createElement('span');
          label.className = 'article-share-label';
          row.prepend(label);
        }
        label.textContent = 'Сподели статията:';
      }
    });
  }

  function initPublished() {
    const publishedAt = readPublishedAt();
    qa('[data-article-published]').forEach((node) => {
      node.textContent = formatPublished(publishedAt);
      if (publishedAt && node.tagName === 'TIME') node.dateTime = publishedAt;
    });
  }

  function setCounts(views, likes) {
    const validViews = Number.isFinite(Number(views));
    const validLikes = Number.isFinite(Number(likes));
    const safeViews = validViews ? Math.max(0, Number(views)) : null;
    const safeLikes = validLikes && safeViews !== null ? Math.max(0, Math.min(safeViews, Number(likes))) : null;
    qa('[data-article-views]').forEach((node) => { node.textContent = safeViews === null ? '—' : safeViews.toLocaleString('bg-BG'); });
    qa('[data-article-likes]').forEach((node) => { node.textContent = safeLikes === null ? '—' : safeLikes.toLocaleString('bg-BG'); });
  }

  function setLikedState(liked) {
    qa('[data-like-article]').forEach((button) => {
      button.classList.toggle('is-liked', liked);
      button.setAttribute('aria-pressed', liked ? 'true' : 'false');
      const label = q('.article-like-label', button);
      const heart = q('.heart', button);
      if (label) label.textContent = liked ? 'Харесано' : 'Харесай';
      if (heart) heart.textContent = liked ? '♥' : '♡';
    });
  }

  async function rpc(functionName) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ p_article_key: articleKey }),
      cache: 'no-store'
    });
    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(`Supabase RPC ${functionName} failed: ${response.status}${details ? ` ${details}` : ''}`);
    }
    const payload = await response.json();
    return Array.isArray(payload) ? payload[0] : payload;
  }

  async function initRealtimeEngagement() {
    const likedKey = storageKey('liked');
    let liked = localStorage.getItem(likedKey) === '1';
    setLikedState(liked);
    setCounts(null, null);

    try {
      const row = await rpc('register_article_view');
      if (row) setCounts(row.views, row.likes);
    } catch (error) {
      setCounts(null, null);
      console.warn('[article-engagement] Could not load global counters.', error);
    }

    qa('[data-like-article]').forEach((button) => button.addEventListener('click', async () => {
      const nextLiked = !liked;
      qa('[data-like-article]').forEach((item) => { item.disabled = true; });
      try {
        const row = await rpc(nextLiked ? 'like_article' : 'unlike_article');
        liked = nextLiked;
        localStorage.setItem(likedKey, liked ? '1' : '0');
        setLikedState(liked);
        if (row) setCounts(row.views, row.likes);
      } catch (error) {
        console.warn('[article-engagement] Could not update like.', error);
      } finally {
        qa('[data-like-article]').forEach((item) => { item.disabled = false; });
      }
    }));
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
      email: `mailto:?subject=${t}&body=${text}`
    }[network] || null;
  }

  function decorateShareButton(button, network, label) {
    button.dataset.shareNetwork = network;
    button.className = `article-share-button article-share-button--${network}`;
    button.setAttribute('aria-label', network === 'copy' ? 'Копирай линка към статията' : network === 'native' ? 'Още опции за споделяне' : `Сподели чрез ${label}`);
    button.innerHTML = `<span class="article-share-icon">${ICONS[network] || ''}</span><span class="article-share-text">${label}</span>`;
  }

  function normalizeShareRows() {
    qa('.article-share-row').forEach((row) => {
      const labelNode = q('.article-share-label', row);
      qa('[data-share-network]', row).forEach((button) => button.remove());
      SHARE_BUTTONS.forEach(([network, label]) => {
        const button = document.createElement('button');
        button.type = 'button';
        decorateShareButton(button, network, label);
        row.appendChild(button);
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
      if (target.startsWith('mailto:')) location.href = target;
      else window.open(target, '_blank', 'noopener,noreferrer,width=720,height=640');
    }));
  }

  function init() {
    if (!q('.article-engagement') && !q('.article-engagement-footer')) return;
    ensureMatchingBlocks();
    initPublished();
    initSharing();
    initRealtimeEngagement();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
