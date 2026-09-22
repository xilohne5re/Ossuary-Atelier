/* ═══════════════════════════════════════════════
   OSSUARY ATELIER — map.js
   Interactive Phuket Thrift Map (tools/phuket-map)
   Reads window.OA_MAP_LOCATIONS (inlined by the map
   build step) and renders markers + synced list.
   ═══════════════════════════════════════════════ */

(function () {
  'use strict';

  if (typeof L === 'undefined') {
    console.warn('[map] Leaflet not loaded');
    return;
  }

  const DATA = window.OA_MAP_LOCATIONS;
  const CATS = {
    thrift:   { label: 'Thrift',   color: '#C9B8E8' },
    beach:    { label: 'Beach',    color: '#56CCF2' },
    activity: { label: 'Activity', color: '#E8A020' },
  };
  const GOLD = '#E8C557';
  const STAR_GLYPH =
    '<svg viewBox="0 0 12 12" aria-hidden="true">' +
    '<path d="M6 1.2l1.45 3.05 3.35.42-2.45 2.3.6 3.3L6 8.9 3.05 10.27l.6-3.3-2.45-2.3 3.35-.42z"/></svg>';

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const mapEl   = document.getElementById('map');
  const listEl  = document.getElementById('map-list');
  const statusEl = document.getElementById('map-list-status');
  const chipsWrap = document.getElementById('map-chips');
  const nearBtn = document.getElementById('near-me');

  if (!Array.isArray(DATA)) {
    if (statusEl) statusEl.textContent = 'Map data missing — run the site build (steps=map).';
    if (listEl && !listEl.innerHTML) listEl.innerHTML = '<div class="map-empty">No location data found.</div>';
    return;
  }
  if (!mapEl || !listEl || !chipsWrap) return;

  // CARTO basemap key — a free, rate-limited client-side key. Obfuscated at
  // rest (XOR + base64). Cosmetic only: it must reach the browser to fetch
  // tiles, so DevTools/Network can still recover it. Not a secret credential.
  const CARTO_KEY = (() => {
    const enc = 'LCN+Hnw0fycQcBBzfXR6Inh1d3Z/dHl1fHUuICwge3V9cX0=';
    const mask = 'OA';
    const bin = atob(enc);
    let key = '';
    for (let i = 0; i < bin.length; i++) key += String.fromCharCode(bin.charCodeAt(i) ^ mask.charCodeAt(i % mask.length));
    return key;
  })();

  const map = L.map('map', { zoomControl: true }).setView([7.88, 98.34], 11);
  L.tileLayer(`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`, {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 18,
  }).addTo(map);

  const markers = new Map();
  const markerLayer = L.layerGroup().addTo(map);
  let userPos = null;
  let userMarker = null;
  let activeCat = 'all';
  const TIER = { low: 1, medium: 2, high: 3 };
  let priceSel = new Set(['low', 'medium', 'high']);

  const displayName = l =>
    l.thaiName
      ? `${esc(l.name)} <span class="map-thai">(${esc(l.thaiName)})</span>`
      : esc(l.name);

  const priceLabel = l => {
    const tags = Array.isArray(l.priceTags) ? l.priceTags.filter(t => TIER[t]) : [];
    if (!tags.length) return '';
    const min = Math.min(...tags.map(t => TIER[t]));
    const max = Math.max(...tags.map(t => TIER[t]));
    const lo = Object.keys(TIER).find(k => TIER[k] === min);
    const hi = Object.keys(TIER).find(k => TIER[k] === max);
    return lo === hi ? `${lo} price` : `${lo}\u2013${hi} price`;
  };

  const metaLine = l => {
    const cat = CATS[l.category] ? CATS[l.category].label : l.category;
    const tags = (l.tags || []).map(esc).join(' · ');
    const price = priceLabel(l);
    return [cat, tags, price, l.priceRange].filter(Boolean).join('  ·  ');
  };

  /* ── markers ─────────────────────────────────── */
  function pinIcon(category, featured, hasGuide) {
    const c = CATS[category] || CATS.activity;
    const fill = featured ? GOLD : c.color;
    const glyphs = {
      thrift:
        '<ellipse cx="12" cy="12" rx="5.4" ry="3.6"/><circle cx="12" cy="12" r="1.5" fill="#0d0b14"/>',
      beach:
        '<path d="M5.8 12.6c1.6 0 1.6-1.7 3.2-1.7s1.6 1.7 3.2 1.7 1.6-1.7 3.2-1.7 1.6 1.7 3.2 1.7"/>' +
        '<path d="M5.8 16.4c1.6 0 1.6-1.7 3.2-1.7s1.6 1.7 3.2 1.7 1.6-1.7 3.2-1.7 1.6 1.7 3.2 1.7"/>',
      activity:
        '<circle cx="12" cy="12" r="4.2"/>' +
        '<path d="M12 4v-2M12 22v-2M4 12H2M22 12h-2M6.2 6.2 4.8 4.8M19.2 19.2l-1.4-1.4M17.8 6.2l1.4-1.4M4.8 19.2l1.4-1.4"/>',
    };
    const glyph = glyphs[category] || glyphs.activity;
    const svg =
      `<svg viewBox="0 0 24 24" aria-hidden="true">` +
      `<path d="M12 1.8C7.7 1.8 4.2 5.2 4.2 9.5c0 5.9 7.8 12.7 7.8 12.7s7.8-6.8 7.8-12.7C19.8 5.2 16.3 1.8 12 1.8z" fill="${fill}"/>` +
      `<g stroke="#0d0b14" stroke-width="1.5" stroke-linecap="round" fill="none">${glyph}</g>` +
      `</svg>`;
    const star = hasGuide ? `<span class="oa-pin__star">${STAR_GLYPH}</span>` : '';
    return L.divIcon({
      className: '',
      iconSize: [26, 26],
      iconAnchor: [13, 24],
      popupAnchor: [0, -22],
      html: `<div class="oa-pin${featured ? ' oa-pin--featured' : ''}">${svg}${star}</div>`,
    });
  }

  /* ── starter spot markers (labels, not visit pins) ── */
  function labelIcon(category) {
    const c = CATS[category] || CATS.activity;
    const svg =
      `<svg viewBox="0 0 24 24" aria-hidden="true">` +
      `<circle cx="12" cy="12" r="8" fill="none" stroke="${c.color}" stroke-width="1.6"/>` +
      `<circle cx="12" cy="12" r="2.5" fill="${c.color}"/>` +
      `</svg>`;
    return L.divIcon({
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -13],
      html: `<div class="oa-label">${svg}</div>`,
    });
  }

  function popupHtml(l) {
    const meta = metaLine(l);
    const guide = l.guideSlug
      ? `<a class="map-pop-link" href="../../${esc(l.guideSlug)}">Read the full guide →</a>`
      : '';
    return (
      `<div class="map-pop">` +
      `<div class="map-pop-name">${displayName(l)}</div>` +
      (meta ? `<div class="map-pop-meta">${esc(meta)}</div>` : '') +
      (l.note ? `<div class="map-pop-desc">${esc(l.note)}</div>` : '') +
      (l.address ? `<div class="map-pop-desc">${esc(l.address)}</div>` : '') +
      guide +
      `</div>`
    );
  }

  /* ── list rows ───────────────────────────────── */
  function rowHtml(l) {
    const meta = metaLine(l);
    const guide = l.guideSlug
      ? `<a class="map-row-link" href="../../${esc(l.guideSlug)}">Read the full guide →</a>`
      : '';
    const badge = l.pin ? '' : '<span class="map-row-badge">starter</span>';
    const star = l.guideSlug ? '<span class="map-row-star">✦</span>' : '';
    const rowClass =
      'map-row' +
      (l.pin ? '' : ' map-row--starter') +
      (l.featured ? ' map-row--featured' : '');
    return (
      `<div class="${rowClass}"` +
      ` data-id="${esc(l.id)}" data-cat="${esc(l.category)}"` +
      ` role="${l.pin ? 'button' : 'listitem'}" tabindex="${l.pin ? '0' : '-1'}">` +
      `<div class="map-row-name">${star}${displayName(l)}${badge}</div>` +
      (meta ? `<div class="map-row-meta">${esc(meta)}</div>` : '') +
      (l.note ? `<div class="map-row-desc">${esc(l.note)}</div>` : '') +
      (l.address ? `<div class="map-row-desc">${esc(l.address)}</div>` : '') +
      guide +
      `</div>`
    );
  }

  function highlightRow(id) {
    document.querySelectorAll('.map-row').forEach(r =>
      r.classList.toggle('is-active', r.dataset.id === id));
    const row = listEl.querySelector(`.map-row[data-id="${esc(id)}"]`);
    if (row) revealInList(row);
  }

  function revealInList(row) {
    const panel = listEl.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    if (r.top < panel.top) {
      listEl.scrollBy({ top: r.top - panel.top, behavior: 'smooth' });
    } else if (r.bottom > panel.bottom) {
      listEl.scrollBy({ top: r.bottom - panel.bottom, behavior: 'smooth' });
    }
  }

  function focusRow(id) {
    const loc = DATA.find(l => l.id === id);
    const marker = markers.get(id);
    if (!loc) return;
    map.setView([loc.lat, loc.lng], Math.max(map.getZoom(), 14), { animate: true });
    if (marker) marker.openPopup();
    highlightRow(id);
  }

  /* ── distance (haversine) ────────────────────── */
  function distM(a, b) {
    const R = 6371000;
    const toRad = d => (d * Math.PI) / 180;
    const dLat = toRad(b[0] - a[0]);
    const dLng = toRad(b[1] - a[1]);
    const x = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  const ordered = () => {
    let list = DATA.slice();
    if (userPos) {
      list.sort((a, b) => distM(userPos, [a.lat, a.lng]) - distM(userPos, [b.lat, b.lng]));
    }
    return list;
  };

  const priceOk = l => {
    const tags = Array.isArray(l.priceTags) ? l.priceTags.filter(t => TIER[t]) : [];
    if (!tags.length) return true; // no price info (starters) is always shown
    return tags.some(t => priceSel.has(t));
  };

  const countFor = cat =>
    cat === 'all' ? DATA.length : DATA.filter(l => l.category === cat).length;

  /* ── render ──────────────────────────────────── */
  function renderAll() {
    const items = ordered().filter(l =>
      (activeCat === 'all' || l.category === activeCat) && priceOk(l));

    markerLayer.clearLayers();
    markers.clear();
    items.forEach(l => {
      const icon = l.pin
        ? pinIcon(l.category, !!l.featured, !!l.guideSlug)
        : labelIcon(l.category);
      const m = L.marker([l.lat, l.lng], {
        icon,
        title: l.name,
        alt: l.name,
      }).addTo(markerLayer);
      m.bindPopup(popupHtml(l));
      m.on('click', () => highlightRow(l.id));
      markers.set(l.id, m);
    });

    listEl.innerHTML = '';
    if (!items.length) {
      listEl.innerHTML = '<div class="map-empty">Nothing in this category yet.</div>';
    } else {
      const frag = document.createDocumentFragment();
      items.forEach(l => {
        const wrap = document.createElement('div');
        wrap.innerHTML = rowHtml(l);
        frag.appendChild(wrap.firstElementChild);
      });
      listEl.appendChild(frag);
    }

    document.querySelectorAll('.map-chip').forEach(chip => {
      const n = chip.querySelector('.chip-count');
      if (n) n.textContent = String(countFor(chip.dataset.cat));
    });

    updateStatus();
  }

  function updateStatus() {
    const shown = listEl.querySelectorAll('.map-row').length;
    const label = activeCat === 'all' ? 'All' : (CATS[activeCat] ? CATS[activeCat].label : activeCat);
    const priceNote = (priceSel.size === 3 || priceSel.size === 0)
      ? ''
      : ` · price: ${Object.keys(TIER).filter(t => priceSel.has(t)).join(' + ')}`;
    const note = userPos ? ' — sorted by distance' : '';
    statusEl.textContent = `${label} — ${shown} shown${priceNote}${note}`;
  }

  /* ── chips + deep-link ───────────────────────── */
  function setCat(cat) {
    activeCat = cat;
    document.querySelectorAll('.map-chip').forEach(c =>
      c.classList.toggle('is-active', c.dataset.cat === cat));
    renderAll();
    const url = new URL(window.location.href);
    if (cat === 'all') url.searchParams.delete('category');
    else url.searchParams.set('category', cat);
    history.replaceState(null, '', url);
  }

  chipsWrap.addEventListener('click', e => {
    const chip = e.target.closest('.map-chip');
    if (chip) setCat(chip.dataset.cat);
  });

  /* ── price filter: dropdown + checkmarks ────── */
  const priceBtn = document.getElementById('map-price-btn');
  const priceMenu = document.getElementById('map-price-menu');
  const priceWrap = document.getElementById('map-price');
  const priceValue = document.getElementById('map-price-value');
  const priceBoxes = priceMenu ? priceMenu.querySelectorAll('input[type="checkbox"]') : [];

  const syncPriceUI = () => {
    const allActive = priceSel.size === 3 || priceSel.size === 0;
    priceValue.textContent = allActive
      ? 'All'
      : Object.keys(TIER).filter(t => priceSel.has(t)).map(t => t[0].toUpperCase() + t.slice(1)).join(' · ');
    priceBoxes.forEach(cb => { cb.checked = priceSel.has(cb.value); });
  };

  const updatePriceUrl = () => {
    const url = new URL(window.location.href);
    if (priceSel.size === 3 || priceSel.size === 0) url.searchParams.delete('price');
    else url.searchParams.set('price', Object.keys(TIER).filter(t => priceSel.has(t)).join(','));
    history.replaceState(null, '', url);
  };

  if (priceBtn && priceMenu) {
    priceBtn.addEventListener('click', e => {
      e.stopPropagation();
      const open = priceWrap.classList.toggle('is-open');
      priceMenu.hidden = !open;
      priceBtn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', e => {
      if (!priceWrap.contains(e.target)) {
        priceWrap.classList.remove('is-open');
        priceMenu.hidden = true;
        priceBtn.setAttribute('aria-expanded', 'false');
      }
    });
    priceMenu.addEventListener('change', e => {
      const cb = e.target;
      if (!cb.matches('input[type="checkbox"]')) return;
      if (cb.checked) priceSel.add(cb.value);
      else {
        priceSel.delete(cb.value);
        if (priceSel.size === 0) priceSel = new Set(['low', 'medium', 'high']);
      }
      syncPriceUI();
      renderAll();
      updatePriceUrl();
    });
  }

  const qPrice = new URLSearchParams(window.location.search).get('price');
  if (qPrice) {
    const tiers = qPrice.split(',').filter(t => TIER[t]);
    if (tiers.length) priceSel = new Set(tiers);
  }
  syncPriceUI();

  listEl.addEventListener('click', e => {
    if (e.target.closest('.map-row-link')) return;
    const row = e.target.closest('.map-row');
    if (!row || row.classList.contains('map-row--starter')) return;
    focusRow(row.dataset.id);
  });

  const qCat = new URLSearchParams(window.location.search).get('category');
  if (qCat && CATS[qCat]) setCat(qCat);

  /* ── geolocation (enhancement only) ──────────── */
  nearBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      statusEl.textContent = 'Geolocation not supported on this browser.';
      return;
    }
    nearBtn.disabled = true;
    nearBtn.textContent = '◎ Locating…';
    navigator.geolocation.getCurrentPosition(
      pos => {
        userPos = [pos.coords.latitude, pos.coords.longitude];
        if (userMarker) map.removeLayer(userMarker);
        userMarker = L.circleMarker(userPos, {
          radius: 7,
          color: '#A184CD',
          weight: 2,
          fillColor: '#A184CD',
          fillOpacity: 0.35,
        }).addTo(map);
        map.setView(userPos, 12);
        renderAll();
        nearBtn.disabled = false;
        nearBtn.textContent = '◎ Find near me';
      },
      () => {
        statusEl.textContent = 'Location denied — showing default order.';
        nearBtn.disabled = false;
        nearBtn.textContent = '◎ Find near me';
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  });

  /* ── boot ────────────────────────────────────── */
  renderAll();
  const sizeFix = () => map.invalidateSize();
  setTimeout(sizeFix, 200);
  window.addEventListener('load', sizeFix);
  window.addEventListener('resize', sizeFix);
})();