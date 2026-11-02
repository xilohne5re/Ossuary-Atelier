(() => {
  'use strict';

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const html = document.documentElement;

  const cards = qsa('.item-card');
  const pills = qsa('.filter-pill');
  const countEl = qs('#available-count');
  const langToggle = qs('#lang-toggle');
  const overlay = qs('#gallery-overlay');
  if (!overlay) return;

  const gallery = {
    open: false,
    images: [],
    index: 0,
    card: null,
    lastFocus: null,
    touchX: 0,
    touchY: 0,
    tracking: false,
    lightboxOpen: false,
    lightboxReturnFocus: null,
    suppressImageClickUntil: 0,
    lightboxTouchX: 0,
    lightboxTouchY: 0,
    lightboxTracking: false,
  };

  const els = {
    shell: qs('.gallery-shell'),
    stage: qs('.gallery-stage'),
    close: qs('.gallery-close'),
    closeLabel: qs('.gallery-close-label'),
    prev: qs('.gallery-prev'),
    next: qs('.gallery-next'),
    img: qs('#gallery-img'),
    index: qs('#gallery-index'),
    total: qs('#gallery-total'),
    thumbs: qs('#gallery-thumbs'),
    id: qs('#gallery-id'),
    name: qs('#gallery-name'),
    era: qs('#gallery-era'),
    desc: qs('#gallery-desc'),
    size: qs('#gallery-size'),
    price: qs('#gallery-price'),
    dm: qs('#gallery-dm'),
    story: qs('#gallery-story'),
    lightbox: qs('#gallery-lightbox'),
    lightboxClose: qs('.gallery-lightbox-close'),
    lightboxCloseLabel: qs('.gallery-lightbox-close-label'),
    lightboxImg: qs('#gallery-lightbox-img'),
    lightboxPrev: qs('.gallery-lightbox-prev'),
    lightboxNext: qs('.gallery-lightbox-next'),
    lightboxIndex: qs('#gallery-lightbox-index'),
    lightboxTotal: qs('#gallery-lightbox-total'),
  };

  const copy = {
    en: {
      shopTitle: 'Shop',
      dropDate: 'Drop 001 · March 2026',
      count: (n) => `${n} piece${n === 1 ? '' : 's'} available`,
      filterLabel: 'Filter items',
      filterAll: 'All',
      filterAvailable: 'Available',
      filterRelics: 'Relics',
      filterSold: 'Claimed',
      claimed: 'CLAIMED',
      claimedStatus: 'Claimed',
      close: 'Close gallery',
      closeImage: 'Close fullscreen image',
      imageViewer: 'Fullscreen image',
      prev: 'Previous image',
      next: 'Next image',
      image: 'Image',
      dm: 'DM to claim →',
      story: 'Read the story →',
      switchTo: 'Switch to Thai',
      title: 'Shop — Ossuary Atelier | Phuket Secondhand Clothing',
      view: 'View',
    },
    th: {
      shopTitle: 'ร้านค้า',
      dropDate: 'ดรอป 001 · มีนาคม 2026',
      count: (n) => `${n} ชิ้นพร้อมขาย`,
      filterLabel: 'กรองไอเท็ม',
      filterAll: 'ทั้งหมด',
      filterAvailable: 'พร้อมขาย',
      filterRelics: 'ของหายาก',
      filterSold: 'ขายแล้ว',
      claimed: 'ขายแล้ว',
      claimedStatus: 'ขายแล้ว',
      close: 'ปิดแกลเลอรี',
      closeImage: 'ปิดภาพเต็มจอ',
      imageViewer: 'ภาพเต็มจอ',
      prev: 'รูปก่อนหน้า',
      next: 'รูปถัดไป',
      image: 'รูปที่',
      dm: 'ทัก DM เพื่อจอง →',
      story: 'อ่านเรื่องราว →',
      switchTo: 'เปลี่ยนเป็นภาษาอังกฤษ',
      title: 'ร้านค้า — Ossuary Atelier | เสื้อผ้ามือสองภูเก็ต',
      view: 'ดู',
    },
  };

  const state = {
    lang: 'en',
    filter: 'all',
  };

  const saveLang = (lang) => {
    try {
      localStorage.setItem('oa-lang', lang);
    } catch {
      /* storage is optional */
    }
  };

  const nameFor = (card) => {
    if (state.lang === 'th') return card.dataset.nameTh || card.dataset.name || '';
    return card.dataset.name || card.dataset.nameTh || '';
  };

  const descFor = (card) => {
    if (state.lang === 'th') return card.dataset.descTh || card.dataset.desc || '';
    return card.dataset.desc || card.dataset.descTh || '';
  };

  const isMobileGallery = () => window.matchMedia('(max-width: 960px)').matches;

  const setText = (el, value) => {
    if (el && el.textContent !== value) el.textContent = value;
  };

  function applyLanguage(lang, persist = true) {
    state.lang = lang === 'th' ? 'th' : 'en';
    const t = copy[state.lang];
    html.lang = state.lang;
    if (persist) saveLang(state.lang);

    setText(qs('.drops-title'), t.shopTitle);
    setText(qs('.drops-date'), t.dropDate);
    qsa('[data-i18n]').forEach((el) => {
      const value = t[el.dataset.i18n];
      if (value) setText(el, value);
    });
    qsa('[data-i18n-label]').forEach((el) => {
      const value = t[el.dataset.i18nLabel];
      if (value) el.setAttribute('aria-label', value);
    });

    if (countEl) {
      const n = Number(countEl.dataset.count || 0);
      setText(countEl, t.count(n));
    }

    if (langToggle) {
      const current = qs('.lang-current', langToggle);
      const other = qs('.lang-other', langToggle);
      setText(current, state.lang === 'th' ? 'TH' : 'EN');
      setText(other, state.lang === 'th' ? 'EN' : 'TH');
      langToggle.setAttribute('aria-pressed', state.lang === 'th' ? 'true' : 'false');
      langToggle.setAttribute('aria-label', t.switchTo);
    }

    document.title = t.title;

    cards.forEach((card) => {
      const name = nameFor(card);
      setText(qs('.item-name', card), name);
      const img = qs('.item-photo-wrap img', card);
      if (img) img.alt = name;
      card.setAttribute('aria-label', `${t.view} ${name}`);
    });

    qsa('.sold-label-inner').forEach((el) => setText(el, t.claimed));
    setText(els.closeLabel, t.close);
    els.close?.setAttribute('aria-label', t.close);
    els.prev?.setAttribute('aria-label', t.prev);
    els.next?.setAttribute('aria-label', t.next);
    setText(els.lightboxCloseLabel, t.closeImage);
    els.lightboxClose?.setAttribute('aria-label', t.closeImage);
    els.lightboxPrev?.setAttribute('aria-label', t.prev);
    els.lightboxNext?.setAttribute('aria-label', t.next);
    els.lightbox?.setAttribute('aria-label', t.imageViewer);

    if (gallery.open) renderGallery();
  }

  function applyFilter(filter, updateHash = false) {
    state.filter = filter || 'all';
    pills.forEach((pill) => {
      const on = pill.dataset.filter === state.filter;
      pill.classList.toggle('active', on);
      pill.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    cards.forEach((card) => {
      const match = state.filter === 'all'
        || (state.filter === 'available' && card.dataset.filter === 'available')
        || (state.filter === 'relics' && card.classList.contains('relic'))
        || (state.filter === 'sold' && card.classList.contains('sold'));
      card.hidden = !match;
    });

    if (updateHash) {
      const hash = state.filter === 'all' ? '#all' : `#${state.filter}`;
      history.replaceState(null, '', hash);
    }
  }

  function filterFromHash() {
    const hash = location.hash.slice(1);
    if (hash === 'all' || hash === 'available' || hash === 'relics' || hash === 'claimed') {
      const filter = hash === 'claimed' ? 'sold' : hash;
      applyFilter(filter);
    }
  }

  function galleryImagesFor(card) {
    try {
      const list = JSON.parse(card.dataset.gallery || '[]');
      if (Array.isArray(list) && list.length) return list;
    } catch {
      /* fall through */
    }
    const hero = qs('.item-photo-wrap img', card)?.getAttribute('src');
    return hero ? [hero] : [];
  }

  function buildThumbs() {
    if (!els.thumbs) return;
    const t = copy[state.lang];
    els.thumbs.replaceChildren(...gallery.images.map((src, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gallery-thumb';
      button.dataset.index = String(i);
      button.setAttribute('aria-label', `${t.image} ${i + 1}`);
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.loading = i > 2 ? 'lazy' : 'eager';
      img.decoding = 'async';
      button.appendChild(img);
      return button;
    }));
  }

  function preloadAround(index) {
    [index - 1, index + 1].forEach((i) => {
      if (i < 0 || i >= gallery.images.length) return;
      const img = new Image();
      img.src = gallery.images[i];
    });
  }

  function renderGallery() {
    if (!gallery.card || !gallery.images.length) return;
    const t = copy[state.lang];
    const card = gallery.card;
    const name = nameFor(card);
    const sold = card.classList.contains('sold');

    els.img.src = gallery.images[gallery.index];
    els.img.alt = `${name} — ${t.image} ${gallery.index + 1}`;
    setText(els.index, String(gallery.index + 1));
    setText(els.total, String(gallery.images.length));
    setText(els.id, card.dataset.id || '');
    setText(els.name, name);
    setText(els.era, card.dataset.era || '');
    setText(els.desc, descFor(card));
    setText(els.size, card.dataset.size || '');
    setText(els.price, sold ? t.claimedStatus : (card.dataset.price || ''));
    setText(els.dm, t.dm);
    setText(els.story, t.story);

    const single = gallery.images.length < 2;
    if (els.prev) {
      els.prev.disabled = single;
      els.prev.setAttribute('aria-label', t.prev);
    }
    if (els.next) {
      els.next.disabled = single;
      els.next.setAttribute('aria-label', t.next);
    }

    qsa('.gallery-thumb', els.thumbs).forEach((thumb, i) => {
      thumb.setAttribute('aria-current', i === gallery.index ? 'true' : 'false');
      thumb.setAttribute('aria-label', `${t.image} ${i + 1}`);
    });

    if (els.dm) els.dm.style.display = sold ? 'none' : 'flex';
    if (els.story) {
      const url = card.dataset.storyUrl || '';
      els.story.href = url || '#';
      els.story.style.display = url ? 'flex' : 'none';
    }

    els.close?.setAttribute('aria-label', t.close);
    if (gallery.lightboxOpen) renderLightbox();
    preloadAround(gallery.index);
  }

  function renderLightbox() {
    if (!gallery.lightboxOpen || !els.lightbox || !els.lightboxImg || !gallery.card || !gallery.images.length) return;
    const t = copy[state.lang];
    const name = nameFor(gallery.card);
    const single = gallery.images.length < 2;

    els.lightboxImg.src = gallery.images[gallery.index];
    els.lightboxImg.alt = `${name} — ${t.image} ${gallery.index + 1}`;
    setText(els.lightboxIndex, String(gallery.index + 1));
    setText(els.lightboxTotal, String(gallery.images.length));

    if (els.lightboxPrev) {
      els.lightboxPrev.disabled = single;
      els.lightboxPrev.setAttribute('aria-label', t.prev);
    }
    if (els.lightboxNext) {
      els.lightboxNext.disabled = single;
      els.lightboxNext.setAttribute('aria-label', t.next);
    }
  }

  function openLightbox() {
    if (!gallery.open || gallery.lightboxOpen || !isMobileGallery()) return;
    gallery.lightboxReturnFocus = document.activeElement === document.body ? els.close : document.activeElement;
    gallery.lightboxOpen = true;
    renderLightbox();
    els.lightbox?.classList.add('open');
    els.lightbox?.setAttribute('aria-hidden', 'false');
    els.shell?.setAttribute('aria-hidden', 'true');
    requestAnimationFrame(() => els.lightboxClose?.focus());
  }

  function closeLightbox(restoreFocus = true) {
    if (!gallery.lightboxOpen) return;
    gallery.lightboxOpen = false;
    els.lightbox?.classList.remove('open');
    els.lightbox?.setAttribute('aria-hidden', 'true');
    els.shell?.removeAttribute('aria-hidden');

    const target = gallery.lightboxReturnFocus;
    gallery.lightboxReturnFocus = null;
    if (!restoreFocus) return;
    if (target && target !== document.body && target !== document.documentElement && target.isConnected) {
      target.focus();
    } else {
      els.close?.focus();
    }
  }

  function openGallery(card) {
    gallery.card = card;
    gallery.images = galleryImagesFor(card);
    gallery.index = 0;
    gallery.lastFocus = card;
    if (!gallery.images.length) return;

    closeLightbox(false);
    buildThumbs();
    renderGallery();
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('gallery-open');
    gallery.open = true;
    requestAnimationFrame(() => els.close?.focus());
  }

  function closeGallery() {
    if (!gallery.open) return;
    closeLightbox(false);
    gallery.open = false;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('gallery-open');
    if (gallery.lastFocus && typeof gallery.lastFocus.focus === 'function') {
      gallery.lastFocus.focus();
    }
  }

  function step(delta) {
    if (!gallery.images.length) return;
    gallery.index = (gallery.index + delta + gallery.images.length) % gallery.images.length;
    renderGallery();
  }

  function setIndex(index) {
    if (!gallery.images.length) return;
    gallery.index = Math.max(0, Math.min(index, gallery.images.length - 1));
    renderGallery();
  }

  function trapFocus(event) {
    const root = gallery.lightboxOpen && els.lightbox ? els.lightbox : overlay;
    const focusable = qsa('button, [href], [tabindex]:not([tabindex="-1"])', root)
      .filter((el) => !el.disabled && el.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  pills.forEach((pill) => {
    pill.addEventListener('click', () => applyFilter(pill.dataset.filter, true));
  });

  cards.forEach((card) => {
    card.addEventListener('click', () => openGallery(card));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openGallery(card);
      }
    });
  });

  if (langToggle) {
    langToggle.addEventListener('click', () => {
      applyLanguage(state.lang === 'th' ? 'en' : 'th');
    });
  }

  overlay.addEventListener('click', (event) => {
    if (event.target.closest('[data-lightbox-close]')) {
      closeLightbox();
      return;
    }
    const lightboxNav = event.target.closest('[data-lightbox-nav]');
    if (lightboxNav) {
      step(Number(lightboxNav.dataset.lightboxNav));
      return;
    }
    const closeTarget = event.target.closest('[data-gallery-close]');
    if (closeTarget) {
      closeGallery();
      return;
    }
    const thumb = event.target.closest('.gallery-thumb');
    if (thumb) {
      setIndex(Number(thumb.dataset.index));
      return;
    }
    if (event.target.closest('.gallery-prev')) {
      step(-1);
      return;
    }
    if (event.target.closest('.gallery-next')) {
      step(1);
    }
  });

  els.img?.addEventListener('click', () => {
    if (!gallery.open || gallery.lightboxOpen || !isMobileGallery()) return;
    if (Date.now() < gallery.suppressImageClickUntil) return;
    openLightbox();
  });

  document.addEventListener('keydown', (event) => {
    if (!gallery.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (gallery.lightboxOpen) closeLightbox();
      else closeGallery();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    } else if (event.key === 'Tab') {
      trapFocus(event);
    }
  });

  if (els.stage) {
    els.stage.addEventListener('touchstart', (event) => {
      if (event.touches.length !== 1) return;
      gallery.touchX = event.touches[0].clientX;
      gallery.touchY = event.touches[0].clientY;
      gallery.tracking = true;
    }, { passive: true });

    els.stage.addEventListener('touchend', (event) => {
      if (!gallery.tracking) return;
      gallery.tracking = false;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - gallery.touchX;
      const dy = touch.clientY - gallery.touchY;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        gallery.suppressImageClickUntil = Date.now() + 450;
      }
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        step(dx < 0 ? 1 : -1);
      }
    }, { passive: true });
  }

  if (els.lightboxImg) {
    els.lightboxImg.addEventListener('touchstart', (event) => {
      if (event.touches.length !== 1) return;
      gallery.lightboxTouchX = event.touches[0].clientX;
      gallery.lightboxTouchY = event.touches[0].clientY;
      gallery.lightboxTracking = true;
    }, { passive: true });

    els.lightboxImg.addEventListener('touchend', (event) => {
      if (!gallery.lightboxTracking) return;
      gallery.lightboxTracking = false;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - gallery.lightboxTouchX;
      const dy = touch.clientY - gallery.lightboxTouchY;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        step(dx < 0 ? 1 : -1);
      }
    }, { passive: true });
  }

  const initialLang = html.lang === 'th' ? 'th' : 'en';
  applyLanguage(initialLang, false);
  filterFromHash();
})();
