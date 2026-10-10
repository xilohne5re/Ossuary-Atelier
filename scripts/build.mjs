#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════
   Ossuary Atelier — build.mjs
   Phase 0 scaffold: partials injection + link checks.
   Content steps (items/shops/posts/sitemap) are gated behind
   --enable-content until the review gate is cleared.
   ═══════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, resolve, dirname, relative, posix } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');

const PARTIALS_DIR = join(ROOT, '_partials');
const DATA_DIR = join(ROOT, '_data');
const CONTENT_DIR = join(ROOT, '_content');

/* ── site identity ───────────────────────────────────────────
   SITE_BASE drives canonical URLs, OG URLs, sitemap.xml, and
   robots.txt. Change this ONE value when the domain switches.
   RETIRED_BASES are previous live bases scrubbed from pages on
   every SEO rewrite so no stale host ever survives a switch. */
const SITE_BASE = 'https://ossuaryphuket.me';
const RETIRED_BASES = [
  'https://ossuaryphuket.me/Ossuary-Atelier',
  'https://ossuaryatelier.github.io',
  'https://xilohne5re.github.io/Ossuary-Atelier',
];

const IGNORE_DIRS = new Set(['node_modules', '_partials', '_data', '_content', '.git']);

/* ── args ─────────────────────────────────────────────────── */
const args = process.argv.slice(2);
const opts = {
  report: args.includes('--report'),
  strict: args.includes('--strict'),
  enableContent: args.includes('--enable-content'),
  steps: null,
};
const stepsArg = args.find(a => a.startsWith('--steps='));
if (stepsArg) opts.steps = stepsArg.slice(8).split(',').map(s => s.trim()).filter(Boolean);

const log = (msg) => console.log(msg);
const warn = (msg) => console.warn(`  ⚠ ${msg}`);

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* Reverse of esc(). Text lifted out of <title>/<meta> is already escaped, so
   re-running esc() on it produced doubled entities like `&amp;amp;` in the
   og:/twitter: tags. `&amp;` is decoded last so `&amp;lt;` survives intact. */
function unesc(s) {
  return String(s ?? '')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

const EYE_SVG = `<svg viewBox="-90 -58 180 116" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
        <path d="M -72 0 C -52 -48, 52 -48, 72 0 C 52 48, -52 48, -72 0 Z" fill="#C9B8E8"/>
        <ellipse cx="0" cy="0" rx="46" ry="36" fill="#1C1828"/>
        <circle cx="0" cy="0" r="36" fill="none" stroke="#C9B8E8" stroke-width="2.2"/>
        <circle cx="0" cy="0" r="18" fill="#C9B8E8"/>
        <circle cx="0" cy="0" r="10" fill="#1C1828"/>
        <circle cx="0" cy="0" r="5.5" fill="none" stroke="#C9B8E8" stroke-width="1.6"/>
        <line x1="-72" y1="0" x2="-86" y2="0" stroke="#C9B8E8" stroke-width="2.8" stroke-linecap="round"/>
        <line x1="-86" y1="-7" x2="-86" y2="7" stroke="#C9B8E8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="72"  y1="0" x2="86"  y2="0" stroke="#C9B8E8" stroke-width="2.8" stroke-linecap="round"/>
        <line x1="86"  y1="-7" x2="86"  y2="7" stroke="#C9B8E8" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`;

/* ── image intrinsic dimensions (for width/height attrs) ──── */
const IMAGE_DIMS = {
  'assets/images/ITEM-001.webp':         [896, 1195],
  'assets/images/ITEM-001 MODEL.webp':   [848, 1264],
  'assets/images/ITEM-002.webp':         [992, 1085],
  'assets/images/ITEM-003.webp':         [992, 1085],
  'assets/images/ITEM-004.webp':         [896, 1195],
  'assets/images/ITEM-005.webp':         [992, 1085],
  'assets/images/ITEM-005 MODEL.webp':   [848, 1264],
  'assets/images/ITEM-006.webp':         [992, 1085],
  'assets/images/ITEM-006 MODEL.webp':   [848, 1264],
};

function imgDims(path) {
  const d = IMAGE_DIMS[path];
  return d ? ` width="${d[0]}" height="${d[1]}"` : '';
}

/* ── file discovery ───────────────────────────────────────── */
function walkHtml(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkHtml(full, base));
    } else if (entry.name.endsWith('.html')) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

function relOf(abs) {
  return relative(ROOT, abs).split('\\').join('/');
}

/* ── partials step ────────────────────────────────────────── */
function renderPartial(name, tokens) {
  const tpl = readFileSync(join(PARTIALS_DIR, `${name}.html`), 'utf8');
  let out = tpl;
  for (const [k, v] of Object.entries(tokens)) {
    out = out.split(`@${k}@`).join(v);
  }
  return out;
}

function rootPrefix(relPath) {
  const dir = posix.dirname(relPath);
  const depth = dir === '.' ? 0 : dir.split('/').length;
  return '../'.repeat(depth);
}

function homeHref(relPath) {
  return rootPrefix(relPath) || './';
}

function journalHref(relPath) {
  const rel = posix.relative(posix.dirname(relPath), 'blog');
  return rel === '' ? './' : rel + '/';
}

function guideHref(relPath) {
  const rel = posix.relative(posix.dirname(relPath), 'guide');
  return rel === '' ? './' : rel + '/';
}

function findBalancedDiv(content, openPattern) {
  const openRe = new RegExp(openPattern);
  const openMatch = openRe.exec(content);
  if (!openMatch) return null;
  const start = openMatch.index;
  const endOfOpen = openMatch.index + openMatch[0].length;

  const tokenRe = /<\/?div\b[^>]*>/g;
  tokenRe.lastIndex = endOfOpen;
  let depth = 1;
  let m;
  while ((m = tokenRe.exec(content)) !== null) {
    const tag = m[0];
    if (tag.startsWith('</')) {
      depth--;
      if (depth <= 0) {
        return { start, end: tokenRe.lastIndex };
      }
    } else if (!tag.endsWith('/>')) {
      depth++;
    }
  }
  return null;
}

function findNavRegion(html) {
  const re = /<nav id="nav"[^>]*>[\s\S]*?<\/nav>\s*(?:<!--[\s\S]*?-->\s*)?<div id="nav-overlay"[^>]*>[\s\S]*?<\/div>/;
  const m = re.exec(html);
  if (m) return { start: m.index, end: m.index + m[0].length };
  // nav without overlay
  const m2 = /<nav id="nav"[^>]*>[\s\S]*?<\/nav>/.exec(html);
  if (m2) return { start: m2.index, end: m2.index + m2[0].length };
  return null;
}

function findFooterRegion(html) {
  const m = /<footer id="footer">[\s\S]*?<\/footer>/.exec(html);
  if (m) return { start: m.index, end: m.index + m[0].length };
  return null;
}

function topbarBackOrId(html, relPath) {
  const idMatch = /class="topbar-item-id">([^<]*)<\/span>/.exec(html);
  if (idMatch) {
    return `<span class="topbar-item-id">${idMatch[1]}</span>`;
  }
  if (/class="topbar-back"/.test(html)) {
    const root = rootPrefix(relPath);
    return `<a href="${root}contact.html" class="topbar-back">← Back</a>`;
  }
  const fname = posix.basename(relPath);
  const m = /^(ITEM-\d+)\.html$/.exec(fname);
  if (m) {
    return `<span class="topbar-item-id">${m[1]}</span>`;
  }
  return '';
}

function slotRegex(slot) {
  return new RegExp(`<!-- @@${slot}_SLOT@@ -->[\\s\\S]*?<!-- @@${slot}_END@@ -->`);
}

/* markers: NAV, TOPBAR, FOOTER */
function applySlot(html, slot, rendered) {
  const re = slotRegex(slot);
  const wrapped = `<!-- @@${slot}_SLOT@@ -->\n${rendered}\n<!-- @@${slot}_END@@ -->`;
  if (re.test(html)) return html.replace(re, wrapped);
  return null; // no markers yet
}

function migrateRegion(html, slot) {
  if (slot === 'NAV') return findNavRegion(html);
  if (slot === 'TOPBAR') return findBalancedDiv(html, '<div id="topbar">');
  if (slot === 'FOOTER') return findFooterRegion(html);
  return null;
}

function runPartials(report) {
  const files = walkHtml(ROOT);
  let changed = 0;

  for (const abs of files) {
    const relPath = relOf(abs);
    const original = readFileSync(abs, 'utf8');
    let html = original;
    const root = rootPrefix(relPath);
    const home = homeHref(relPath);
    const journal = journalHref(relPath);
    const guide = guideHref(relPath);

    const slots = [];
    if (/<nav id="nav"|@@NAV_SLOT@@/.test(html)) slots.push('NAV');
    if (/<div id="topbar">|@@TOPBAR_SLOT@@/.test(html)) slots.push('TOPBAR');
    if (/<footer id="footer">|@@FOOTER_SLOT@@/.test(html)) slots.push('FOOTER');

    for (const slot of slots) {
      let rendered = '';
      if (slot === 'NAV') {
        rendered = renderPartial('nav', { ROOT: root, HOME: home, JOURNAL: journal, GUIDE: guide });
      } else if (slot === 'TOPBAR') {
        const backOrId = topbarBackOrId(html, relPath);
        rendered = renderPartial('topbar', { ROOT: root, HOME: home, BACK_OR_ID: backOrId });
      } else if (slot === 'FOOTER') {
        const itemFooter = /class="footer-back"/.test(html);
        const name = itemFooter ? 'footer-item' : 'footer';
        rendered = renderPartial(name, { ROOT: root });
      }

      const withMarkers = applySlot(html, slot, rendered);
      if (withMarkers) {
        html = withMarkers;
        continue;
      }
      const region = migrateRegion(html, slot);
      if (region) {
        const wrapped = `<!-- @@${slot}_SLOT@@ -->\n${rendered}\n<!-- @@${slot}_END@@ -->`;
        html = html.slice(0, region.start) + wrapped + html.slice(region.end);
      } else {
        warn(`${relPath}: could not locate ${slot} region to migrate`);
      }
    }

    if (html !== original) {
      changed++;
      if (report) {
        log(`  [partials] ${relPath} — rewrite`);
      } else {
        writeFileSync(abs, html, 'utf8');
      }
    }
  }
  log(`[partials] ${changed} file(s) ${report ? 'would be rewritten (report only)' : 'rewritten'}`);
}

/* ── links step ───────────────────────────────────────────── */
const ATTR_RE = /(?:href|src|action)="([^"]+)"/g;
// item-template.html holds placeholder asset paths (with onerror
// fallbacks) and is excluded from SEO + sitemap — never checked.
// contact-sheet.html is a generated triage artifact that references
// old photos by design (the user's vetoed links); it is not a page.
const LINKS_SKIP = new Set(['item-template.html', 'tools/guess-the-beach/contact-sheet.html']);

function runLinks(strict) {
  const files = walkHtml(ROOT);
  let brokenTotal = 0;
  const externalish = (u) => /^(?:https?:|mailto:|tel:|data:|javascript:|\/\/|\/|#)/i.test(u);

  for (const abs of files) {
    const relPath = relOf(abs);
    if (LINKS_SKIP.has(relPath)) continue;
    const html = readFileSync(abs, 'utf8');
    const baseDir = dirname(abs);
    const broken = [];

    ATTR_RE.lastIndex = 0;
    let m;
    while ((m = ATTR_RE.exec(html)) !== null) {
      const raw = m[1].trim();
      if (!raw || externalish(raw)) continue;
      const clean = raw.split('#')[0].split('?')[0];
      if (!clean) continue;
      const target = resolve(baseDir, clean);
      const exists = existsSync(target);
      if (!exists) {
        broken.push(raw);
      }
    }

    if (broken.length > 0) {
      brokenTotal += broken.length;
      warn(`${relPath}: ${broken.join(', ')}`);
    }
  }

  log(`[links] ${brokenTotal} broken local reference(s) found`);
  if (strict && brokenTotal > 0) {
    log('[links] --strict: failing build');
    process.exitCode = 1;
  }
}

/* ── gated content steps (Phase 1+, require --enable-content) ── */
function gate(name) {
  if (!opts.enableContent) {
    throw new Error(
      `[${name}] is not enabled. This step is part of the Phase 1 content migration ` +
      `and is gated behind --enable-content. Run: node scripts/build.mjs --enable-content --steps=${name}`
    );
  }
}

function runItems() {
  gate('items');
  const file = join(DATA_DIR, 'items.json');
  if (!existsSync(file)) throw new Error('[items] _data/items.json missing');
  const { items } = JSON.parse(readFileSync(file, 'utf8'));
  log(`[items] loaded ${items.length} item(s) from _data/items.json`);

  const shopFile = join(ROOT, 'shop.html');
  if (!existsSync(shopFile)) throw new Error('[items] shop.html missing');
  let shop = readFileSync(shopFile, 'utf8');

  const cards = items.map((item, idx) => {
    const isRelic = existsSync(join(ROOT, `${item.id}.html`));
    const isSold = item.status === 'sold';
    const cls = ['item-card', isSold ? 'sold' : '', isRelic ? 'relic' : ''].filter(Boolean).join(' ');
    const eraLine = [item.era, item.origin, item.fabric].filter(Boolean).join(' · ');
    const price = isSold ? '\u2014' : item.price;
    const storyUrl = isRelic ? `${item.id}.html` : '';
    const hero = item.images?.hero || '';
    const meas = item.measurements || {};
    const sizeLine = [item.size_label, ...Object.entries(meas).map(([k, v]) => `${k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} ${v.split('/')[0].trim()}`)].join(' / ');

    return [
      `<article class="${cls}" data-id="${esc(item.id)}" data-filter="${esc(item.status)}" data-desc="${esc(item.desc || '')}" data-size="${esc(sizeLine)}" data-story-url="${esc(storyUrl)}" style="animation-delay: ${idx * 0.07}s">`,
      isRelic ? '  <div class="item-relic-star">\u2605</div>' : null,
      '  <div class="item-photo-wrap">',
      `    <img src="${esc(hero)}"${imgDims(hero)} alt="${esc(item.name)}" loading="lazy" onerror="this.parentElement.style.background='#1C1828';this.style.display='none'">`,
      '    <div class="sold-label">',
      '      <span class="sold-label-inner">CLAIMED</span>',
      '    </div>',
      '  </div>',
      '  <div class="item-body">',
      `    <div class="item-id">${esc(item.id)}</div>`,
      `    <div class="item-name">${esc(item.name)}</div>`,
      `    <div class="item-era">${esc(eraLine)}</div>`,
      '    <div class="item-footer">',
      `      <span class="item-price">${esc(price)}</span>`,
      `      <div class="item-eye-btn" aria-hidden="true">${EYE_SVG}</div>`,
      '    </div>',
      '  </div>',
      '</article>',
    ].filter(Boolean).join('\n');
  }).join('\n');

  shop = shop.replace(
    /<!-- DROPS_CARDS_BEGIN -->[\s\S]*?<!-- DROPS_CARDS_END -->/,
    `<!-- DROPS_CARDS_BEGIN -->\n${cards}\n<!-- DROPS_CARDS_END -->`
  );
  if (!shop.includes('<!-- DROPS_CARDS_BEGIN -->')) {
    shop = shop.replace('<!-- Cards injected by JS -->', `<!-- DROPS_CARDS_BEGIN -->\n${cards}\n<!-- DROPS_CARDS_END -->`);
  }

  const available = items.filter(i => i.status === 'available').length;
  shop = shop.replace(
    /id="available-count">[^<]*/,
    `id="available-count">${available} piece${available !== 1 ? 's' : ''} available`
  );

  const newScript = `  <script>
  document.addEventListener('DOMContentLoaded', () => {
    const pills = document.querySelectorAll('.filter-pill');
    const cards = document.querySelectorAll('.item-card');

    const applyFilter = (f) => {
      pills.forEach(p => p.classList.remove('active'));
      const active = Array.from(pills).find(p => p.dataset.filter === f);
      if (active) active.classList.add('active');
      cards.forEach(card => {
        const match = f === 'all' ||
          (f === 'available' && card.dataset.filter === 'available') ||
          (f === 'relics' && card.classList.contains('relic')) ||
          (f === 'sold' && card.classList.contains('sold'));
        card.style.display = match ? '' : 'none';
      });
    };

    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        applyFilter(pill.dataset.filter);
      });
    });

    const hashFilter = location.hash === '#claimed' ? 'sold' : null;
    if (hashFilter) applyFilter(hashFilter);

    function openModal(card) {
      document.getElementById('modal-img').src = card.querySelector('.item-photo-wrap img')?.src || '';
      document.getElementById('modal-img').alt = card.querySelector('.item-name')?.textContent || '';
      document.getElementById('modal-id-el').textContent = card.dataset.id + ' \\u00b7 ' + (card.querySelector('.item-era')?.textContent || '');
      document.getElementById('modal-name-el').textContent = card.querySelector('.item-name')?.textContent || '';
      document.getElementById('modal-desc-el').textContent = card.dataset.desc || '';
      document.getElementById('modal-meas-el').textContent = card.dataset.size || '';
      document.getElementById('modal-price-el').textContent = card.querySelector('.item-price')?.textContent || '';
      const url = card.dataset.storyUrl;
      document.getElementById('modal-story-btn').href = url || '#';
      document.getElementById('modal-story-btn').style.display = url ? 'flex' : 'none';
      document.getElementById('claim-modal').classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      document.getElementById('claim-modal').classList.remove('open');
      document.body.style.overflow = '';
    }

    cards.forEach(card => {
      if (!card.classList.contains('sold')) {
        card.addEventListener('click', () => openModal(card));
      }
    });

    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('claim-modal-backdrop').addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  });
  </script>`;

  shop = shop.replace(/  <script>\n  document\.addEventListener\('DOMContentLoaded'[\s\S]*?<\/script>/, newScript);

  writeFileSync(shopFile, shop, 'utf8');
  log(`[items] shop.html: ${items.length} item card(s) generated`);
}

function runShops() {
  gate('shops');
  const file = join(DATA_DIR, 'shops.json');
  if (!existsSync(file)) throw new Error('[shops] _data/shops.json missing');
  const { shops } = JSON.parse(readFileSync(file, 'utf8'));
  log(`[shops] loaded ${shops.length} shop(s) from _data/shops.json`);

  const guideFile = join(ROOT, 'blog/guide/index.html');
  if (!existsSync(guideFile)) throw new Error('[shops] blog/guide/index.html missing');
  let guide = readFileSync(guideFile, 'utf8');

  const cards = shops.map((shop, idx) => {
    const isLive = shop.status === 'live';
    const link = isLive ? `${shop.id}-phuket.html` : '#'; // review page per live shop
    const location = [shop.address, ['Phuket', 'Thailand'].filter(Boolean).join(', ')]
      .filter(Boolean).join(' · ');
    const cls = ['shop-card', isLive ? '' : 'coming-soon'].filter(Boolean).join(' ');
    const linkLabel = isLive ? 'Read the review' : 'Coming soon';
    const meta = [shop.price_range, shop.tags.slice(0, 3).join(' · ')].filter(Boolean).join(' — ');
    return [
      isLive
        ? `    <a href="${link}" class="${cls}" data-shop-id="${esc(shop.id)}" style="animation-delay: ${idx * 0.07}s">`
        : `    <div class="${cls}" data-shop-id="${esc(shop.id)}" style="animation-delay: ${idx * 0.07}s">`,
      `      <h2 class="shop-name">${esc(shop.name)}</h2>`,
      `      <span class="shop-location">${esc(location)}</span>`,
      `      ${meta ? `      <p class="shop-desc">${esc(meta)}</p>` : ''}`,
      `      <span class="shop-link">${isLive ? linkLabel + ' \u2192' : linkLabel}</span>`,
      isLive ? '    </a>' : '    </div>',
    ].join('\n');
  }).join('\n');

  const cardsBlock = `<!-- SHOPS_CARDS_BEGIN -->\n${cards}\n    <!-- SHOPS_CARDS_END -->`;
  if (/<!-- SHOPS_CARDS_BEGIN -->[\s\S]*?<!-- SHOPS_CARDS_END -->/.test(guide)) {
    guide = guide.replace(/<!-- SHOPS_CARDS_BEGIN -->[\s\S]*?<!-- SHOPS_CARDS_END -->/, cardsBlock);
  } else if (/<div id="shop-grid">[\s\S]*?<\/div>/.test(guide)) {
    // first-run: adopt the existing grid as the new card region
    guide = guide.replace(
      /<div id="shop-grid">[\s\S]*?<\/div>/,
      `<div id="shop-grid">\n${cardsBlock}\n  </div>`
    );
  } else {
    warn('[shops] no #shop-grid found in blog/guide/index.html — cards not injected');
  }

  // ItemList JSON-LD: shops with addresses (structured data for rich results)
  const listed = shops.filter(s => s.status === 'live' && s.address);
  const itemList = listed.map((s, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: s.name,
    url: `${SITE_BASE}/blog/guide/${s.id}-phuket.html`,
    description: [s.price_range, s.tags.join(', ')].filter(Boolean).join(' — ') || `${s.name} in Phuket.`,
  }));
  const jsonld = listed.length
    ? `<script type="application/ld+json">\n${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Phuket Thrift & Secondhand Directory',
        itemListElement: itemList,
      }, null, 2)}\n</script>`
    : '';
  const jsonldBlock = `<!-- SHOPS_JSONLD_BEGIN -->${jsonld}<!-- SHOPS_JSONLD_END -->`;
  if (/<!-- SHOPS_JSONLD_BEGIN -->[\s\S]*?<!-- SHOPS_JSONLD_END -->/.test(guide)) {
    guide = guide.replace(/<!-- SHOPS_JSONLD_BEGIN -->[\s\S]*?<!-- SHOPS_JSONLD_END -->/, jsonldBlock);
  } else if (listed.length && /<\/head>/.test(guide)) {
    guide = guide.replace('</head>', `  ${jsonldBlock}\n\n</head>`);
  }

  writeFileSync(guideFile, guide, 'utf8');
  log(`[shops] blog/guide/index.html: ${cards.length ? shops.length : 0} shop card(s) + ItemList rendered`);
}

/* ── map step ────────────────────────────────────────────────
   Reads the thrift-shop source (_data/shops.json) plus the
   standalone POI pins (_data/map-pins.json), validates every
   location, inlines the merged array into tools/phuket-map/
   index.html (window.OA_MAP_LOCATIONS), and regenerates the
   downloadable phuket.geojson export (documented pins only;
   starter labels are kept out of the map markers). */
const MAP_BOX = { minLat: 7.0, maxLat: 8.5, minLng: 97.8, maxLng: 98.8 };
const MAP_CATS = new Set(['thrift', 'furniture', 'beach', 'activity']);
const PRICE_TIERS = ['low', 'medium', 'high'];
function normalizePriceTags(raw) {
  if (!Array.isArray(raw)) return undefined;
  const out = raw.filter(t => PRICE_TIERS.includes(t));
  return out.length ? out : undefined;
}

function runMap() {
  gate('map');
  const shopsFile = join(DATA_DIR, 'shops.json');
  const pinsFile = join(DATA_DIR, 'map-pins.json');
  const pageFile = join(ROOT, 'tools/phuket-map/index.html');
  const geoFile = join(ROOT, 'tools/phuket-map/phuket.geojson');
  if (!existsSync(shopsFile)) throw new Error('[map] _data/shops.json missing');
  if (!existsSync(pinsFile)) throw new Error('[map] _data/map-pins.json missing');

  const { shops } = JSON.parse(readFileSync(shopsFile, 'utf8'));
  const { mapPins = [] } = JSON.parse(readFileSync(pinsFile, 'utf8'));

  const locations = [];
  const seen = new Set();
  const assertValid = (loc, src) => {
    if (!loc.id) throw new Error(`[map] ${src}: entry missing "id"`);
    if (seen.has(loc.id)) throw new Error(`[map] duplicate id "${loc.id}" (${src})`);
    seen.add(loc.id);
    if (!MAP_CATS.has(loc.category)) {
      throw new Error(`[map] "${loc.id}" has unknown category "${loc.category}" (want: ${[...MAP_CATS].join(', ')})`);
    }
    const { lat, lng } = loc;
    if (typeof lat !== 'number' || !Number.isFinite(lat) || typeof lng !== 'number' || !Number.isFinite(lng)) {
      throw new Error(`[map] "${loc.id}" has non-numeric coords (${lat}, ${lng})`);
    }
    if (lat < MAP_BOX.minLat || lat > MAP_BOX.maxLat || lng < MAP_BOX.minLng || lng > MAP_BOX.maxLng) {
      throw new Error(`[map] "${loc.id}" out of Phuket bounds (lat ${lat}, lng ${lng})`);
    }
  };

  // 1) shops with coordinates are thrift pins linked to their review page
  for (const s of shops) {
    if (s.lat == null || s.lng == null) continue;
    const loc = {
      id: s.id,
      name: s.name,
      thaiName: s.thai_name || undefined,
      category: 'thrift',
      lat: s.lat,
      lng: s.lng,
      address: s.address || undefined,
      priceTags: normalizePriceTags(s.price_tags),
      priceRange: s.price_range || undefined,
      tags: Array.isArray(s.tags) ? s.tags.slice(0, 4) : undefined,
      guideSlug: s.guide_slug || undefined,
      featured: s.featured === true,
      pin: true,
    };
    assertValid(loc, 'shops.json');
    locations.push(loc);
  }

  // 2) standalone POI pins (verified thrift spots + starter labels)
  for (const p of mapPins) {
    const loc = {
      id: p.id,
      name: p.name,
      thaiName: p.thaiName,
      category: p.category,
      lat: p.lat,
      lng: p.lng,
      note: p.note,
      tags: Array.isArray(p.tags) ? p.tags : undefined,
      guideSlug: p.guideSlug,
      priceTags: normalizePriceTags(p.price_tags),
      priceRange: p.priceRange || undefined,
      featured: p.featured === true,
      pin: p.pin !== false,
    };
    assertValid(loc, 'map-pins.json');
    locations.push(loc);
  }

  const pinCount = locations.filter(l => l.pin).length;
  log(`[map] ${pinCount} pin(s) + ${locations.length - pinCount} starter label(s) from shops.json + map-pins.json`);

  // 3) inject the merged array into the page (idempotent via the slot marker)
  if (!existsSync(pageFile)) throw new Error('[map] tools/phuket-map/index.html missing');
  const json = JSON.stringify(locations, null, 2);
  const dataBlock =
    `<!-- @@MAP_DATA_SLOT@@ -->\n` +
    `  <script>\n` +
    `  window.OA_MAP_LOCATIONS = /* @@MAP_DATA_BEGIN@@ */\n` +
    `${json}\n` +
    `  /* @@MAP_DATA_END@@ */;\n` +
    `  </script>`;

  let page = readFileSync(pageFile, 'utf8');
  const slot = '<!-- @@MAP_DATA_SLOT@@ -->';
  if (!page.includes(slot)) throw new Error(`[map] ${relOf(pageFile)} missing @@MAP_DATA_SLOT@@ marker`);
  const start = page.indexOf(slot);
  let next;
  const endMark = page.indexOf('/* @@MAP_DATA_END@@ */', start);
  if (endMark !== -1) {
    // already generated before: replace the whole prior data script (its own </script>)
    const close = page.indexOf('</script>', endMark);
    if (close === -1) throw new Error('[map] cannot locate the map data </script> in index.html');
    const end = close + '</script>'.length;
    next = page.slice(0, start) + dataBlock + page.slice(end);
  } else {
    // first run: live only a bare slot comment — drop it, then inject the script
    const afterSlot = page.indexOf('\n', start) + 1;
    const block = dataBlock.replace(slot + '\n', '');
    next = page.slice(0, afterSlot) + block + '\n' + page.slice(afterSlot);
  }
  if (next !== page) writeFileSync(pageFile, next, 'utf8');

  // 4) regenerate the open geojson export (documented pins only)
  const features = locations
    .filter(l => l.pin)
    .map(l => ({
      type: 'Feature',
      properties: {
        name: l.thaiName ? `${l.name} (${l.thaiName})` : l.name,
        category: l.category,
        ...(l.note ? { description: l.note } : {}),
        ...(l.guideSlug ? { url: l.guideSlug } : {}),
      },
      geometry: { type: 'Point', coordinates: [l.lng, l.lat] },
    }));
  const geojson = {
    type: 'FeatureCollection',
    name: 'phuket-map',
    description: 'Open map of Phuket thrift spots and documented visits. Regenerated from _data/shops.json + _data/map-pins.json by scripts/build.mjs --show the map pins only (starter labels are excluded).',
    features,
  };
  writeFileSync(geoFile, JSON.stringify(geojson, null, 2) + '\n', 'utf8');
  log(`[map] phuket.geojson regenerated: ${features.length} feature(s)`);
}

function runPosts() {
  gate('posts');
  if (!existsSync(CONTENT_DIR)) throw new Error('[posts] _content/ missing');
  log('[posts] markdown pipeline ready (marked + gray-matter)');
  // Phase 3: render _content/posts/*.md into blog pages.
}

/* ── glossary steps ──────────────────────────────────────────
   _data/glossary.json is the single source of truth for the
   Thai slang dictionary. Two build steps consume it:

   1. glossary  — inlines the dataset into the dictionary page
      as window.OA_GLOSSARY (the same slot-injection pattern the
      map step uses, so there is no runtime fetch) and emits a
      static <noscript> index so the page is never content-free.
   2. glossary-pages — writes one static HTML page per entry to
      tools/slang-glossary/terms/<id>.html for crawlers and
      direct links, and prunes pages for entries that no longer
      exist so a deleted term cannot leave a stale indexed URL.

   Both steps overwrite rather than append, because GitHub Pages
   deploys the repository as-is and never runs this build: the
   output is committed and must be stable across re-runs.

   `meta` and `sources` are developer-facing metadata. They are
   validated here but never ship to the client or the rendered
   pages — nothing visitor-facing cites them.                  */
const GLOSSARY_PAGE = 'tools/slang-glossary/index.html';
const GLOSSARY_TERMS_DIR = 'tools/slang-glossary/terms';
const GLOSSARY_SET_PATH = 'tools/slang-glossary/';
const GLOSSARY_CATS = new Set(['etiquette', 'general-slang', 'thrift-market', 'skate']);
const GLOSSARY_CAT_LABELS = {
  'etiquette': 'Etiquette',
  'general-slang': 'General slang',
  'thrift-market': 'Thrift market',
  'skate': 'Skate',
};
const GLOSSARY_DATA_SLOT = '<!-- @@GLOSSARY_DATA_SLOT@@ -->';
const GLOSSARY_DATA_END = '/* @@GLOSSARY_DATA_END@@ */';
const GLOSSARY_NOSCRIPT_SLOT = '<!-- @@GLOSSARY_NOSCRIPT_SLOT@@ -->';
const GLOSSARY_NOSCRIPT_END = '<!-- @@GLOSSARY_NOSCRIPT_END@@ -->';
const GLOSSARY_SETLD_BEGIN = '<!-- @@GLOSSARY_SETLD_BEGIN@@ -->';
const GLOSSARY_SETLD_END = '<!-- @@GLOSSARY_SETLD_END@@ -->';

/* One definition of each glossary URL, shared by the index's DefinedTermSet
   and the per-term DefinedTerm pages, so `hasDefinedTerm` resolves to exactly
   the `@id` each term page declares. */
const glossarySetUrl = () => `${SITE_BASE}/${GLOSSARY_SET_PATH}`;
const glossaryTermUrl = (id) => `${SITE_BASE}/${GLOSSARY_TERMS_DIR}/${id}.html`;
const glossaryTermId = (id) => `${glossaryTermUrl(id)}#term`;

/* GitHub Pages serves every file with `Cache-Control: max-age=600`, so a
   browser can hold the previous build's CSS/JS against the new HTML for ten
   minutes after a deploy. These files are hand-authored and no build step
   rewrites them, so hashing them once at startup is always accurate.

   The term-page template below has to emit the query itself: a later pass that
   added it to the generated files would fight the generator forever, since each
   run would regenerate the pages without it. runCacheBust covers the pages that
   are edited in place rather than generated. */
const GLOSSARY_ASSETS = ['style.css', 'script.js', 'speak.js'];
let _glossaryHashes = null;
function glossaryAssetHashes() {
  if (!_glossaryHashes) {
    _glossaryHashes = new Map();
    for (const name of GLOSSARY_ASSETS) {
      const abs = join(ROOT, 'tools', 'slang-glossary', name);
      if (!existsSync(abs)) continue;
      _glossaryHashes.set(name,
        createHash('sha256').update(readFileSync(abs)).digest('hex').slice(0, 8));
    }
  }
  return _glossaryHashes;
}
const bust = (name) => {
  const h = glossaryAssetHashes().get(name);
  return h ? `${name}?v=${h}` : name;
};

function loadGlossary() {
  const file = join(DATA_DIR, 'glossary.json');
  if (!existsSync(file)) throw new Error('[glossary] _data/glossary.json missing');
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const sources = data.sources || {};
  const entries = data.entries || [];
  if (!entries.length) throw new Error('[glossary] _data/glossary.json has no entries');

  const ids = new Set();
  for (const e of entries) {
    const at = `"${e.id || '<no id>'}"`;
    if (!e.id) throw new Error('[glossary] entry missing "id"');
    if (ids.has(e.id)) throw new Error(`[glossary] duplicate id "${e.id}"`);
    ids.add(e.id);
    if (!/^[a-z0-9-]+$/.test(e.id)) throw new Error(`[glossary] ${at} is not a kebab-case slug`);

    for (const field of ['term', 'thai_script', 'actual_meaning', 'category',
      'example_th', 'example_romanized', 'example_en']) {
      if (!e[field]) throw new Error(`[glossary] ${at} missing "${field}"`);
    }
    if (!GLOSSARY_CATS.has(e.category)) {
      throw new Error(`[glossary] ${at} has unknown category "${e.category}" ` +
        `(want: ${[...GLOSSARY_CATS].join(', ')})`);
    }
    for (const axis of ['usefulness', 'slanginess']) {
      const v = e[axis];
      if (!Number.isInteger(v) || v < 1 || v > 5) {
        throw new Error(`[glossary] ${at} has invalid ${axis} ${JSON.stringify(v)} (want an integer 1-5)`);
      }
    }
    if (e.alt_terms !== undefined && !Array.isArray(e.alt_terms)) {
      throw new Error(`[glossary] ${at} has a non-array "alt_terms"`);
    }

    // Sources never render, but a key that does not resolve is still a data
    // bug — fail the build rather than let it sit undetected in the JSON.
    const keys = Array.isArray(e.source) ? e.source : [e.source];
    if (!keys.length || keys.some((k) => !k || !(k in sources))) {
      throw new Error(`[glossary] ${at} has unresolved source key(s): ${JSON.stringify(e.source)}`);
    }
  }

  // Second pass: `related` may only name entries that exist.
  for (const e of entries) {
    for (const r of e.related || []) {
      if (!ids.has(r)) throw new Error(`[glossary] "${e.id}" relates to unknown id "${r}"`);
    }
  }

  return { meta: data.meta || {}, sources, entries };
}

/* Replace everything from `slot` through `endMark`, or the bare slot comment on
   first run. The block must itself contain both markers to stay idempotent.
   When the block also emits a closing tag, pass `closeTag` so the replaced
   region extends through the existing one — otherwise every run appends
   another copy of it. */
function replaceSlotRegion(html, slot, endMark, block, closeTag) {
  const start = html.indexOf(slot);
  if (start === -1) throw new Error(`missing slot ${slot}`);
  const endAt = html.indexOf(endMark, start);
  if (endAt !== -1) {
    let end = endAt + endMark.length;
    if (closeTag) {
      const close = html.indexOf(closeTag, end);
      if (close !== -1) end = close + closeTag.length;
    }
    return html.slice(0, start) + block + html.slice(end);
  }
  return html.slice(0, start) + block + html.slice(start + slot.length);
}

/* Write only when the bytes actually change. Pages output is committed and the
   sitemap derives <lastmod> from mtime, so an unconditional rewrite would
   produce a 50-file diff plus every lastmod bumped on every single run. */
function writeIfChanged(abs, content, stats) {
  if (existsSync(abs) && readFileSync(abs, 'utf8') === content) {
    if (stats) stats.unchanged++;
    return false;
  }
  writeFileSync(abs, content, 'utf8');
  if (stats) stats.written++;
  return true;
}

/* Generated pages are post-processed by the seo and legal steps, so the file on
   disk never byte-matches this step's output even when nothing changed. Strip
   those artifacts back out — mirroring each step's own insertion exactly —
   otherwise every run rewrites all 50 pages and bumps every <lastmod> in
   sitemap.xml for no reason. */
function stripBuildArtifacts(html) {
  return html
    // seo: '</title>' -> '</title>\n\n  ' + block(SEO_SLOT..SEO_END)
    .replace(/\n\n {2}<!-- @@SEO_SLOT@@ -->[\s\S]*?<!-- @@SEO_END@@ -->/, '')
    // seo: '</head>' -> '\n  ' + block(SITE_JSONLD_BEGIN..END) + '\n  </head>'
    .replace(
      /\n[ \t]*\n {2}<!-- @@SITE_JSONLD_BEGIN@@ -->[\s\S]*?<!-- @@SITE_JSONLD_END@@ -->\n {2}<\/head>/,
      '\n</head>'
    )
    // legal: '</body>\n</html>' -> '\n' + snippet(NOTICE_SLOT..</script>) + '\n</body>\n</html>'
    .replace(/\n\s*<!-- @@NOTICE_SLOT@@ -->[\s\S]*?<\/script>\n<\/body>\n<\/html>/, '\n\n</body>\n</html>');
}

function runGlossary() {
  gate('glossary');
  const { meta, entries } = loadGlossary();
  const pageFile = join(ROOT, GLOSSARY_PAGE);
  if (!existsSync(pageFile)) throw new Error(`[glossary] ${GLOSSARY_PAGE} missing`);

  // `meta.note` is a working note that points at /sources, so it stays behind.
  const clientMeta = { ...meta };
  delete clientMeta.note;

  // meta/sources stay behind: nothing visitor-facing cites them, so the client
  // payload is a projection of each entry with the source key removed.
  const clientEntries = entries.map(({ source, ...rest }) => rest);

  const dataBlock =
    `${GLOSSARY_DATA_SLOT}\n` +
    `  <script>\n` +
    `  window.OA_GLOSSARY = /* @@GLOSSARY_DATA_BEGIN@@ */\n` +
    `${JSON.stringify({ meta: clientMeta, entries: clientEntries }, null, 2)}\n` +
    `  ${GLOSSARY_DATA_END}\n` +
    `  </script>`;

  const items = entries
    .map((e) => `        <li><a href="terms/${esc(e.id)}.html">${esc(e.term)}</a>` +
      `<span class="th" lang="th">${esc(e.thai_script)}</span></li>`)
    .join('\n');
  const noscriptBlock =
    `${GLOSSARY_NOSCRIPT_SLOT}\n` +
    `    <div class="gl-noscript">\n` +
    `      <strong>${entries.length} terms in the OA Slang Glossary.</strong>\n` +
    `      <span>Search and filtering need JavaScript. Every term also has its own page.</span>\n` +
    `      <ul>\n${items}\n      </ul>\n` +
    `    </div>\n` +
    `    ${GLOSSARY_NOSCRIPT_END}`;

  let page = readFileSync(pageFile, 'utf8');
  page = replaceSlotRegion(page, GLOSSARY_DATA_SLOT, GLOSSARY_DATA_END, dataBlock, '</script>');
  page = replaceSlotRegion(page, GLOSSARY_NOSCRIPT_SLOT, GLOSSARY_NOSCRIPT_END, noscriptBlock);
  page = replaceSlotRegion(page, GLOSSARY_SETLD_BEGIN, GLOSSARY_SETLD_END,
    glossarySetLdBlock(entries));
  const stats = { written: 0, unchanged: 0 };
  writeIfChanged(pageFile, page, stats);

  log(`[glossary] ${GLOSSARY_PAGE}: ${entries.length} entries inlined + noscript index ` +
    `+ DefinedTermSet (${stats.written} rewritten, ${stats.unchanged} unchanged)`);
}

/* The set node every term page points at via `inDefinedTermSet`. Without it
   those 50 references dangle, so the index has to declare the set it owns. */
function glossarySetLdBlock(entries) {
  const setUrl = glossarySetUrl();
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'DefinedTermSet',
        '@id': `${setUrl}#definedtermset`,
        url: setUrl,
        name: 'Ossuary Atelier Thai Slang Glossary',
        description: SEO_DESC[GLOSSARY_PAGE],
        inLanguage: 'en',
        hasDefinedTerm: entries.map((e) => glossaryTermId(e.id)),
      },
      {
        '@type': 'ItemList',
        '@id': `${setUrl}#terms`,
        name: 'All terms in the Ossuary Atelier Thai Slang Glossary',
        numberOfItems: entries.length,
        itemListOrder: 'https://schema.org/ItemListUnordered',
        itemListElement: entries.map((e, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: e.term,
          url: glossaryTermUrl(e.id),
        })),
      },
    ],
  };
  return (
    `${GLOSSARY_SETLD_BEGIN}\n` +
    `  <script type="application/ld+json">\n` +
    `${JSON.stringify(graph, null, 2)}\n` +
    `  </script>\n` +
    `  ${GLOSSARY_SETLD_END}`
  );
}

/* ── guess-the-beach step ─────────────────────────────────
   Inlines the curated Phuket beach photo set into the game page
   as window.OA_BEACH_PHOTOS (the same projection the client reads),
   so the game works over file:// with zero runtime fetches — the
   same pattern as glossary. Records point at committed files in
   tools/guess-the-beach/images, and scraper-internal fields are
   stripped; photos that lost their image file are skipped.          */
const BEACH_PAGE = 'tools/guess-the-beach/index.html';
const BEACH_PAGE_DIR = 'tools/guess-the-beach';
const BEACH_JSON = 'tools/guess-the-beach/photos.json';
const BEACH_DATA_SLOT = '<!-- @@BEACH_DATA_SLOT@@ -->';
const BEACH_DATA_END = '/* @@BEACH_DATA_END@@ */';
const BEACH_CLIENT_FIELDS = [
  'id', 'answer', 'kind', 'hard', 'region', 'year',
  'author', 'license', 'credit', 'image', 'w', 'h', 'aliases',
];

function runBeachGame() {
  gate('beachgame');
  const pageFile = join(ROOT, BEACH_PAGE);
  if (!existsSync(pageFile)) throw new Error(`[beachgame] ${BEACH_PAGE} missing`);
  const src = join(ROOT, BEACH_JSON);
  if (!existsSync(src)) throw new Error(`[beachgame] ${BEACH_JSON} missing`);

  const records = JSON.parse(readFileSync(src, 'utf8'))
    .filter((r) => existsSync(join(ROOT, BEACH_PAGE_DIR, r.image)))
    .map((r) => BEACH_CLIENT_FIELDS.reduce((o, k) => { o[k] = r[k]; return o; }, {}));

  const dataBlock =
    `${BEACH_DATA_SLOT}\n` +
    `  <script>\n` +
    `  window.OA_BEACH_PHOTOS = /* @@BEACH_DATA_BEGIN@@ */\n` +
    `${JSON.stringify(records)}\n` +
    `  ${BEACH_DATA_END}\n` +
    `  </script>`;

  let page = readFileSync(pageFile, 'utf8');
  page = replaceSlotRegion(page, BEACH_DATA_SLOT, BEACH_DATA_END, dataBlock, '</script>');
  const stats = { written: 0, unchanged: 0 };
  writeIfChanged(pageFile, page, stats);

  const answers = new Set(records.map((r) => r.answer));
  log(`[beachgame] ${BEACH_PAGE}: ${records.length} photos, ` +
    `${answers.size} answers (${stats.written} rewritten, ${stats.unchanged} unchanged)`);
}

/* static per-term page (SEO surface area — not the browse UI) */
function glossaryTermPage(e, byId) {
  const root = rootPrefix(`${GLOSSARY_TERMS_DIR}/${e.id}.html`);
  const setUrl = glossarySetUrl();
  // This page lives in terms/, so sibling term pages are bare filenames.
  const setHref = '../';
  const catLabel = GLOSSARY_CAT_LABELS[e.category] || e.category;

  // alternateName must not restate name, and must not repeat itself: "555"
  // has Thai script "555" (its own name) and song tem sip lists "2/10" as both
  // its Thai script and an alt term. Order follows the source.
  const altKey = (s) => String(s).trim().replace(/[\s.]+$/, '').toLowerCase();
  const seenAlt = new Set([altKey(e.term)]);
  const alternateNames = [e.thai_script, e.alt_thai, ...(e.alt_terms || [])]
    .filter(Boolean)
    .filter((s) => {
      const k = altKey(s);
      if (seenAlt.has(k)) return false;
      seenAlt.add(k);
      return true;
    });

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    '@id': glossaryTermId(e.id),
    url: glossaryTermUrl(e.id),
    name: e.term,
    inDefinedTermSet: setUrl,
    // The term itself is Thai; the surrounding page copy is English.
    inLanguage: 'th',
    description: e.actual_meaning,
  };
  if (alternateNames.length) jsonld.alternateName = alternateNames;

  const dots = (n) => Array.from({ length: 5 }, (_, i) =>
    `<span class="dot${i < n ? ' on' : ''}"></span>`).join('');

  const altLine = [
    e.alt_terms && e.alt_terms.length ? `also ${esc(e.alt_terms.join(', '))}` : '',
    e.alt_thai ? `<span lang="th">${esc(e.alt_thai)}</span>` : '',
  ].filter(Boolean).join(' &middot; ');

  // Speak buttons ship disabled and stay that way unless speak.js finds a real
  // th-* voice, so a device without one shows a disabled control that explains
  // itself rather than one that silently does nothing.
  // speak_text wins over thai_script (e.g. "555" is voiced as its Thai spelling).
  const heroSpeak = e.speak_text || e.thai_script || '';

  const heroSayBtn =
    `      <div class="gl-hero-say">\n` +
    `        <button type="button" class="gl-say gl-say--lg" data-speak="${esc(heroSpeak)}"` +
    ` aria-label="Hear ${esc(e.term)} pronounced" disabled>&#128266;</button>\n` +
    `        <span class="gl-say-cap">hear the word</span>\n` +
    `      </div>`;

  const exampleSayBtn = e.example_th
    ? `        <div class="gl-sec-head">\n` +
      `          <h2>In a sentence</h2>\n` +
      `          <button type="button" class="gl-say gl-say--sm" data-speak="${esc(e.example_th)}"` +
      ` aria-label="Hear the example sentence" disabled>&#128266;</button>\n` +
      `        </div>`
    : '        <h2>In a sentence</h2>';

  const related = (e.related || [])
    .map((r) => byId.get(r))
    .filter(Boolean)
    .map((r) => `<li><a href="${esc(r.id)}.html">${esc(r.term)}</a>` +
      `<span class="th" lang="th">${esc(r.thai_script)}</span></li>`)
    .join('\n            ');

  const literal = (e.literal_meaning && e.literal_meaning !== '\u2014')
    ? `        <p class="gl-literal">Literally: ${esc(e.literal_meaning)}</p>\n` : '';

  const note = e.usage_note
    ? `        <h2>How it&rsquo;s used</h2>\n        <p class="gl-note">${esc(e.usage_note)}</p>\n` : '';

  const seeAlso = related
    ? `\n\n        <div class="gl-rail-block">\n` +
      `          <h2 class="gl-rail-h">See also</h2>\n` +
      `          <ul class="gl-see-list">\n            ${related}\n          </ul>\n` +
      `        </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(e.term)} (${esc(e.thai_script)}) \u2014 Thai Slang Glossary | Ossuary Atelier</title>
  <script type="application/ld+json">
${JSON.stringify(jsonld, null, 2)}
  </script>
  <link rel="stylesheet" href="../${bust('style.css')}">
  <script src="../${bust('speak.js')}" defer></script>
</head>
<body>

<div class="wrap">

  <header class="gl-top">
    <a href="${setHref}" class="gl-back">&larr; Back to the Glossary</a>
    <span class="gl-attrib">free tool &middot; built by Ossuary Atelier</span>
  </header>

  <article class="gl-term-page">

    <header class="gl-term-hero">
      <h1>${esc(e.term)}<span class="th" lang="th">${esc(e.thai_script)}</span></h1>
${heroSayBtn}
      ${altLine ? `<span class="alt">${altLine}</span>\n      ` : ''}<span class="gl-cat gl-cat--${esc(e.category)}">${esc(catLabel)}</span>
    </header>

    <div class="gl-term-cols">
      <div class="gl-term-main">
        <h2>Meaning</h2>
        <p class="gl-meaning">${esc(e.actual_meaning)}</p>
${literal}${exampleSayBtn}
        <div class="gl-example">
          <p class="gl-ex-th" lang="th">${esc(e.example_th)}</p>
          <p class="gl-ex-rom">${esc(e.example_romanized)}</p>
          <p class="gl-ex-en">${esc(e.example_en)}</p>
        </div>
${note}      </div>

      <aside class="gl-term-rail">
        <div class="gl-rail-block">
          <h2 class="gl-rail-h">The scores</h2>
          <p class="gl-score"><span class="gl-score-label">usefulness</span> <span class="dots" role="img" aria-label="Usefulness ${e.usefulness} of 5">${dots(e.usefulness)}</span></p>
          <p class="gl-score"><span class="gl-score-label">slanginess</span> <span class="dots" role="img" aria-label="Slanginess ${e.slanginess} of 5">${dots(e.slanginess)}</span></p>
          <p class="gl-axis-note">Usefulness runs from &ldquo;rarely needed, mostly colour&rdquo; to &ldquo;essential, daily use&rdquo;. Slanginess runs from a plain standard word up to deep-cut insider slang.</p>
        </div>${seeAlso}
      </aside>
    </div>

    <nav class="gl-term-nav">
      <a href="${setHref}">&larr; All terms</a>
      <a href="${root}guide/">The Guide Hub</a>
    </nav>

  </article>

  <footer class="gl-foot">
    <span>&copy; 2026 Ossuary Atelier</span>
    <span><a href="${root}privacy.html">Privacy</a> &middot; <a href="${root}tos.html">Terms</a></span>
  </footer>

</div>

</body>
</html>
`;
}

function runGlossaryPages() {
  gate('glossary');
  const { entries } = loadGlossary();
  const dir = join(ROOT, GLOSSARY_TERMS_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const byId = new Map(entries.map((e) => [e.id, e]));
  const stats = { written: 0, unchanged: 0 };
  for (const e of entries) {
    const abs = join(dir, `${e.id}.html`);
    const next = glossaryTermPage(e, byId);
    const current = existsSync(abs) ? stripBuildArtifacts(readFileSync(abs, 'utf8')) : null;
    if (current === next) {
      stats.unchanged++;
      continue;
    }
    writeFileSync(abs, next, 'utf8');
    stats.written++;
  }

  // A term removed from the JSON must not leave a stale indexed page behind.
  let pruned = 0;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.html')) continue;
    if (!byId.has(name.slice(0, -'.html'.length))) {
      unlinkSync(join(dir, name));
      pruned++;
    }
  }

  log(`[glossary-pages] ${entries.length} term page(s) in ${GLOSSARY_TERMS_DIR}/ ` +
    `(${stats.written} rewritten, ${stats.unchanged} unchanged)` +
    (pruned ? `, ${pruned} stale page(s) pruned` : ''));
}

/* ── seo step ──────────────────────────────────────────────── */
const SEO_SKIP = new Set(['404.html', 'googlecf73118a74657205.html', 'tools/guess-the-beach/contact-sheet.html']);

const SEO_NOINDEX = new Set(['internal-dm-scripts.html', 'item-template.html', 'craft.html', 'drops.html']);

const SEO_DESC = {
  'index.html': "Curated secondhand fashion from Phuket, with QR-verified provenance on every piece \u2014 plus a growing Phuket thrift guide and interactive map.",
  'guide/index.html': "The Phuket Thrift Guide — a living directory of secondhand shops, sourcing notes, and recovery tips across Phuket, plus maps, tools, and the Ossuary Atelier archive.",
  'shop.html': 'Shop curated secondhand clothing from Phuket, sourced piece by piece from local thrift shops. Every item carries a QR-verified story of where it\'s been.',
  'about.html': 'The story of Ossuary Atelier \u2014 a Phuket secondhand clothing brand that grew into a thrift guide, an interactive map, and a growing record of Phuket\u2019s secondhand culture.',
  'contact.html': 'Contact Ossuary Atelier \u2014 DM to claim a piece, ask about provenance, or begin a collaboration.',
  'tos.html': 'Ossuary Atelier purchase terms \u2014 payment, shipping, returns policy, and condition disclosure for all orders.',
  'privacy.html': 'Ossuary Atelier privacy notice \u2014 what this site collects (comments, purchase enquiries, technical logs), our cookie-free policy, and your data rights.',
  'partnership.html': 'Ossuary Atelier creator partnership agreement \u2014 what we offer, what we ask, and how it works.',
  'blog/index.html': "Ossuary Atelier's field journal \u2014 Phuket thrift guides, sourcing notes, and the study of found things.",
  'blog/guide/index.html': 'Phuket thrift & secondhand guide \u2014 honest shop reviews, price ranges, and what to look for when thrifting in Phuket.',
  'blog/guide/waanwaal-phuket.html': '317 Saensook Soi 2, Phuket Town. Curated vintage and thrifted clothing with a strong women\u2019s selection.',
  'blog/guide/chatuchak-phuket-guide.html': "Phuket's actual Chatuchak market \u2014 a 25-year secondhand institution with five buildings, plus the Vintage Market Phuket 77 weekend layer next door.",
  'blog/guide/owa-phuket.html': 'O-WA Second Hand, Phuket \u2014 a dense, well-stocked thrift shop worth visiting on weekday mornings. Source of the Michiko Koshino dress.',
  'blog/guide/secretthrift.html': "A review of Secret Thrift, a late-night Phuket thrift shop with 30-year-old bottles, rare metal tees and Thai amulets. Here's how to visit the right way.",
  'blog/field-notes/chatuchak-nov-24.html': 'Four hours in and nothing. Then a face-down Glad News hoodie on a folding table between sections 5 and 6.',
  'tools/phuket-map/index.html': 'Interactive map of second hand shops in Phuket \u2014 thrift stores, vintage dealers, and weekend markets with real reviews, price ranges, and addresses. Free to use.',
  'tools/fretboard-trainer/index.html': 'A free multi-tuning fretboard trainer for DAEAC#E open tuning \u2014 explore scales, modes, chord voicings, and progressions with live audio.',
  'tools/slang-glossary/index.html': 'A free Thai slang and etiquette glossary \u2014 search 50 everyday, market, and deep-cut Thai terms with pronunciation, examples, and plain-English meanings.',
  'tools/guess-the-beach/index.html': 'A free daily Phuket beach-guessing game \u2014 five photos, three tries each, a hint after your first wrong guess, and a shareable score grid.',
};

function stripSeoTags(html) {
  const re = [
    /<meta name="description"[^>]*>/gi,
    /<link rel="canonical"[^>]*>/gi,
    /<meta property="og:[^"]*"[^>]*>/gi,
    /<meta name="twitter:[^"]*"[^>]*>/gi,
    /<meta name="theme-color"[^>]*>/gi,
    /<link rel="(?:shortcut icon|icon|apple-touch-icon|mask-icon)"[^>]*>/gi,
  ];
  for (const r of re) html = html.replace(r, '');
  return html;
}

/* ── inline CSS (in seo slot) ─────────────────────────────────
   Every page's <link rel="stylesheet" href="css/x.css"> tags are
   replaced by a <style> element inside the SEO slot (the region
   runSeo rebuilds idempotently), so zero CSS sits in the critical
   path. The needed file list is remembered in a marker comment so
   rebuilds recompute the styles from current css/ files (always
   fresh) without depending on the stripped link tags. */
const CSS_CSS_LINK_RE = /[ \t]*\r?\n?[ \t]*<link[^>]*rel="stylesheet"[^>]*href="((?:\.\.\/)*css\/([A-Za-z0-9_-]+\.css))"[^>]*>\r?\n?[ \t]*/gi;
const CSS_FILES_MARKER = /<!-- @@CSS_FILES:([^@]+)@@ -->/;

const CSS_CACHE = new Map();
function cssContent(file) {
  if (!CSS_CACHE.has(file)) {
    const abs = join(ROOT, 'css', file);
    if (!existsSync(abs)) throw new Error(`[seo] referenced css file missing: ${file}`);
    CSS_CACHE.set(file, readFileSync(abs, 'utf8'));
  }
  return CSS_CACHE.get(file);
}

// file:media pairs from the page's live <link> tags (first run only)
function gatherPageCss(html) {
  const out = [];
  const re = /<link[^>]*rel="stylesheet"[^>]*href="((?:\.\.\/)*css\/([A-Za-z0-9_-]+\.css))"[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const media = /\bmedia="([^"]*)"/.exec(m[0]);
    out.push({ file: m[2], media: media ? media[1] : '' });
  }
  return out;
}

function serializeCssFiles(pairs) {
  return pairs.map(p => p.file + ':' + p.media).join(',');
}

function deserializeCssFiles(str) {
  return str.split(',').filter(Boolean).map(s => {
    const i = s.indexOf(':');
    const file = i === -1 ? s : s.slice(0, i);
    const media = i === -1 ? '' : s.slice(i + 1);
    return { file, media };
  });
}

/* Inlined <style> resolves url() against the *document*, not against css/.
   The source sheets author their font paths relative to css/ ('../assets/…'),
   which only holds while the file is served as a stylesheet. Rebase them to
   the page's own depth so the fonts resolve at any nesting level. */
function renderInlineCss(pairs, rel) {
  const prefix = rootPrefix(rel);
  return pairs.map(p => {
    const css = cssContent(p.file)
      .replace(/url\((['"])(?:\.\.\/)+assets\/fonts\//g, `url($1${prefix}assets/fonts/`);
    return p.media ? `@media ${p.media} {\n${css}\n}` : css;
  }).join('\n');
}

function runSeo(report) {
  gate('seo');
  const files = walkHtml(ROOT);
  const items = existsSync(join(DATA_DIR, 'items.json'))
    ? JSON.parse(readFileSync(join(DATA_DIR, 'items.json'), 'utf8')).items
    : [];
  const itemById = new Map(items.map(i => [i.id, i]));

  // Glossary entries drive per-term page descriptions. Loaded leniently: a
  // malformed dataset must not take the whole site build down with it.
  const glossaryById = new Map();
  const glossaryFile = join(DATA_DIR, 'glossary.json');
  if (existsSync(glossaryFile)) {
    try {
      for (const g of JSON.parse(readFileSync(glossaryFile, 'utf8')).entries || []) {
        glossaryById.set(g.id, g);
      }
    } catch (err) {
      warn(`[seo] could not read glossary descriptions: ${err.message}`);
    }
  }

  const GLOSSARY_TERM_RE = /^tools\/slang-glossary\/terms\/(.+)\.html$/;
  const trimEnd = (s) => String(s || '').replace(/[\s.]+$/, '');
  function glossaryDesc(g) {
    const meaning = trimEnd(g.actual_meaning);
    const eg = trimEnd(g.example_en);
    let d = `${g.term} (${g.thai_script}) is Thai for ${meaning.toLowerCase()}`;
    if (eg) d += ` \u2014 in a sentence, "${eg}"`;
    return d.length > 158 ? `${d.slice(0, 155).replace(/\s+\S*$/, '')}\u2026` : `${d}.`;
  }
  let changed = 0;

  const siteJsonLd = `<!-- @@SITE_JSONLD_BEGIN@@ -->\n  <script type="application/ld+json">\n${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_BASE}/#website`,
        url: `${SITE_BASE}/`,
        name: 'Ossuary Atelier',
        inLanguage: 'en',
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_BASE}/#organization`,
        url: `${SITE_BASE}/`,
        name: 'Ossuary Atelier',
        logo: {
          '@type': 'ImageObject',
          '@id': `${SITE_BASE}/#logo`,
          url: `${SITE_BASE}/assets/logo.png`,
          width: 512,
          height: 512,
        },
        sameAs: ['https://www.instagram.com/ossuary.atelier/'],
      },
    ],
  }, null, 2)}\n  </script>\n<!-- @@SITE_JSONLD_END@@ -->`;

  for (const abs of files) {
    const rel = relOf(abs);
    if (SEO_SKIP.has(rel)) continue;
    const original = readFileSync(abs, 'utf8');
    let html = original;

    // Determine this page's stylesheets: persisted marker (later runs) or
    // the live <link> tags (first run), then inline them and drop the links.
    let cssPairs = null;
    const cssMarker = CSS_FILES_MARKER.exec(html);
    if (cssMarker) cssPairs = deserializeCssFiles(cssMarker[1]);
    else cssPairs = gatherPageCss(html);
    html = html.replace(CSS_FILES_MARKER, '');
    html = html.replace(CSS_CSS_LINK_RE, '\n');
    const cssInline = cssPairs.length
      ? `  <!-- @@CSS_FILES:${serializeCssFiles(cssPairs)}@@ -->\n  <style>\n${renderInlineCss(cssPairs, rel)}\n  </style>\n`
      : '';

    const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(html);
    // unesc() so re-escaping below can't double-encode entities.
    const title = titleMatch ? unesc(titleMatch[1].trim()) : rel;

    let desc = SEO_DESC[rel];
    const idMatch = /^(ITEM-\d+)\.html$/.exec(rel);
    if (idMatch && itemById.has(idMatch[1])) {
      const it = itemById.get(idMatch[1]);
      desc = `${it.name} (${it.era}). Found at ${it.source_shop || 'a local market'}. ${it.price} \u2014 available at Ossuary Atelier.`;
    }
    const termMatch = GLOSSARY_TERM_RE.exec(rel);
    if (termMatch && glossaryById.has(termMatch[1])) {
      desc = glossaryDesc(glossaryById.get(termMatch[1]));
    }
    if (!desc) desc = 'Ossuary Atelier \u2014 secondhand fashion with verified stories.';

    const root = rootPrefix(rel);
    const preloads = fontPreloadsFor(rel, termMatch && glossaryById.get(termMatch[1]))
      .map((f) =>
        `  <link rel="preload" as="font" type="font/woff2" crossorigin="anonymous" href="${root}assets/fonts/${f}.woff2">\n`
      ).join('');
    // Canonical === the literal URL GitHub Pages serves (sitemap agrees):
    // - root index.html  -> SITE_BASE/            (directory form)
    // - */index.html     -> SITE_BASE/<dir>/      (directory form, matches GH's /path -> /path/ redirect)
    // - file pages       -> SITE_BASE/<file>.html (keep the real file path)
    const canonicalPath =
      rel === 'index.html' ? ''
      : /\/index\.html$/.test(rel) ? rel.slice(0, -'index.html'.length)
      : rel;
    const canonical = canonicalPath ? `${SITE_BASE}/${canonicalPath}` : `${SITE_BASE}/`;
    const ogType = rel.startsWith('blog/') ? 'article' : 'website';

    // Retire references to every previous live base (canonicals, JSON-LD, etc.)
    for (const base of RETIRED_BASES) html = html.split(base).join(SITE_BASE);

    // Drop a previous SEO block, then strip legacy hand-written SEO tags.
    html = html.replace(slotRegex('SEO'), '');
    html = stripSeoTags(html);

    // Normalise whitespace between </title> and the next non-whitespace
    // element so re-injection is deterministic run-over-run.
    html = html.replace(/<\/title>\s+/, '</title>\n  ');

    const noindex = SEO_NOINDEX.has(rel) ? '\n  <meta name="robots" content="noindex">' : '';
    const seoBlock =
      `<!-- @@SEO_SLOT@@ -->\n` +
      `  <link rel="canonical" href="${canonical}">\n` +
      `  <meta name="description" content="${esc(desc)}">\n` +
      `  <meta property="og:site_name" content="Ossuary Atelier">\n` +
      `  <meta property="og:locale" content="en_US">\n` +
      `  <meta property="og:title" content="${esc(title)}">\n` +
      `  <meta property="og:description" content="${esc(desc)}">\n` +
      `  <meta property="og:type" content="${ogType}">\n` +
      `  <meta property="og:url" content="${canonical}">\n` +
      `  <meta property="og:image" content="${SITE_BASE}/assets/og-image.png">\n` +
      `  <meta property="og:image:alt" content="Ossuary Atelier \u2014 secondhand fashion with verified stories.">\n` +
      `  <meta property="og:image:width" content="1200">\n` +
      `  <meta property="og:image:height" content="630">\n` +
      `  <meta name="twitter:card" content="summary_large_image">\n` +
      `  <meta name="twitter:site" content="@ossuaryatelier">\n` +
      `  <meta name="twitter:title" content="${esc(title)}">\n` +
      `  <meta name="twitter:description" content="${esc(desc)}">\n` +
      `  <meta name="twitter:image" content="${SITE_BASE}/assets/og-image.png">\n` +
      `  <meta name="theme-color" content="#080810">\n` +
      `  <link rel="icon" type="image/png" sizes="192x192" href="${SITE_BASE}/assets/favicon-192.png">\n` +
      `  <link rel="icon" type="image/svg+xml" href="${root}assets/favicon.svg">\n` +
      `  <link rel="apple-touch-icon" href="${root}assets/apple-touch-icon.png">\n` +
      `${preloads}` +
      `${cssInline}` +
      `${noindex}\n` +
      `<!-- @@SEO_END@@ -->`;

    html = html.replace('</title>', `</title>\n\n  ${seoBlock}`);

    // WebSite + Organization structured data (idempotent)
    html = html.replace(/\s*<!-- @@SITE_JSONLD_BEGIN@@ -->[\s\S]*?<!-- @@SITE_JSONLD_END@@ -->\s*/g, '\n');
    html = html.replace('</head>', `\n  ${siteJsonLd}\n  </head>`);

    if (html !== original) {
      changed++;
      if (report) {
        log(`  [seo] ${rel} \u2014 would rewrite`);
      } else {
        writeFileSync(abs, html, 'utf8');
      }
    }
  }
  log(`[seo] ${changed} file(s) ${report ? 'would be rewritten (report only)' : 'rewritten'}`);
}

/* ── fonts step ───────────────────────────────────────────────
   Removes the Google Fonts chain (preconnects + css2 stylesheet),
   which was the render-blocking bottleneck. Font preloads for the
   self-hosted variable fonts are injected by the seo step (inside
   the SEO slot, so ordering is deterministic and idempotent).

   A preload competes for the same bandwidth as the LCP font, so only
   preloading italic where the first viewport actually renders italic
   is worth its 38 KB. */
const FONT_FILES = ['cinzel', 'cormorant', 'cormorant-italic'];
const FONT_PRELOAD_BASE = ['cinzel', 'cormorant'];

/* Every non-glossary page keeps the italic preload: ~30 of them use italic
   body copy. Inside the glossary it is different — the browse UI only sets
   italic on card and example text (below the fold), and a term page only
   renders it in the hero for entries that carry alternate spellings. */
function fontPreloadsFor(rel, entry) {
  const isGlossary = rel === GLOSSARY_PAGE || rel.startsWith(`${GLOSSARY_TERMS_DIR}/`);
  if (!isGlossary) return FONT_FILES;
  if (!entry) return FONT_PRELOAD_BASE;            // the browse UI page
  const heroItalic = Boolean(entry.alt_terms?.length || entry.alt_thai);
  return heroItalic ? FONT_FILES : FONT_PRELOAD_BASE;
}

function stripGoogleFontLinks(html) {
  return html.replace(/[ \t]*\r?\n?\s*<link[^>]*fonts\.(?:googleapis|gstatic)\.com[^>]*>\s*/gi, '\n');
}

function runFonts(report) {
  gate('fonts');
  const files = walkHtml(ROOT);
  let changed = 0;

  for (const abs of files) {
    const rel = relOf(abs);
    const original = readFileSync(abs, 'utf8');
    let html = original;

    // Remove every Google Fonts <link> (stylesheet + preconnects)
    html = stripGoogleFontLinks(html);

    if (html !== original) {
      changed++;
      if (report) {
        log(`  [fonts] ${rel} \u2014 would rewrite`);
      } else {
        writeFileSync(abs, html, 'utf8');
      }
    }
  }
  log(`[fonts] ${changed} file(s) ${report ? 'would be rewritten (report only)' : 'rewritten'} \u2014 Google Fonts stripped`);
}

/* ── js step ──────────────────────────────────────────────────
   Moves every script off the critical path:
   • adds defer to each external <script src="...">
   • wraps parse-time inline gsap.registerPlugin(ScrollTrigger) in
     a DOMContentLoaded listener (deferred GSAP is not available at
     parse time)
   • drops redundant <link rel="preload" ... as="script"> hints
   Idempotent: each transform self-terminates on repeat runs. */
function runJs(report) {
  gate('js');
  const files = walkHtml(ROOT);
  let changed = 0;

  const scriptSrcRe = /<script\s+([^>]*\bsrc="[^"]+")>/g;
  const scriptPreloadRe = /[ \t]*\r?\n?[ \t]*<link[^>]*rel="preload"[^>]*\bas="script"[^>]*>\r?\n?[ \t]*/gi;
  const registerPluginRe = /<script>((?!(?:<\/script>))[\s\S])*?gsap\.registerPlugin\(ScrollTrigger\);((?!(?:<\/script>))[\s\S])*?<\/script>/g;

  for (const abs of files) {
    const rel = relOf(abs);
    const original = readFileSync(abs, 'utf8');
    let html = original;

    // 1. defer every external script
    html = html.replace(scriptSrcRe, (m, attrs) => {
      if (/\b(?:async|defer)\b/.test(attrs)) return m;
      return `<script ${attrs} defer>`;
    });

    // 2. drop as="script" preload hints
    html = html.replace(scriptPreloadRe, '\n');

    // 3. wrap inline registerPlugin so it runs after deferred GSAP loads
    html = html.replace(registerPluginRe, m => {
      if (m.includes('document.addEventListener')) return m;
      return `<script>document.addEventListener('DOMContentLoaded', () => { if (typeof gsap !== 'undefined') gsap.registerPlugin(ScrollTrigger); });\u003c/script>`;
    });

    if (html !== original) {
      changed++;
      if (report) {
        log(`  [js] ${rel} \u2014 would rewrite`);
      } else {
        writeFileSync(abs, html, 'utf8');
      }
    }
  }
  log(`[js] ${changed} file(s) ${report ? 'would be rewritten (report only)' : 'rewritten'} \u2014 scripts deferred, registerPlugin in DCL`);
}

/* ── legal notice step ────────────────────────────────────────
   Injects a small, auto-closing privacy notice on every page,
   anchored by a stacked marker so rebuilds are idempotent. The
   site uses no cookies and no analytics, so this is a transparency
   notice (not a consent wall). The notice shows once per browsing
   session (sessionStorage), auto-dismisses after 4 seconds, can be
   closed manually, and honours prefers-reduced-motion. */
const NOTICE_MARKER = '<!-- @@NOTICE_SLOT@@ -->';
const NOTICE_CSS = [
  '#notice-privacy{position:fixed;right:1rem;bottom:1rem;z-index:9900;max-width:20rem;',
  'background:rgba(8,8,16,.95);border:1px solid rgba(201,184,232,.18);border-left:3px solid #A184CD;',
  'color:#C9B8E8;font-size:.92rem;line-height:1.6;padding:.9rem 1.1rem;box-shadow:0 10px 30px rgba(0,0,0,.5);',
  'opacity:0;transform:translateY(6px);pointer-events:none;transition:opacity .5s ease,transform .5s ease}',
  '#notice-privacy.on{opacity:1;transform:translateY(0);pointer-events:auto}',
  '#notice-privacy p{margin:0}',
  '#notice-privacy a{color:#C9B8E8;text-decoration:underline;text-underline-offset:2px}',
  '#notice-privacy button{margin-top:.6rem;font-size:.65rem;letter-spacing:.35em;text-transform:uppercase;',
  'color:#C9B8E8;background:none;border:1px solid rgba(201,184,232,.25);padding:.45rem 1rem;cursor:pointer}',
  '#notice-privacy.off{opacity:0;transform:translateY(6px);pointer-events:none}',
  '@media(max-width:768px){#notice-privacy{right:.75rem;left:.75rem;bottom:.75rem;max-width:none}}'
].join('');

function noticeSnippet(prefix) {
  return `${NOTICE_MARKER}\n` +
    `<div id="notice-privacy" role="status">\n` +
    `  <style>${NOTICE_CSS}</style>\n` +
    `  <p>This site uses <strong>no tracking cookies</strong> and no analytics. Read our <a href="${prefix}privacy.html">privacy policy</a>.</p>\n` +
    `  <button type="button" class="notice-dismiss">Got it</button>\n` +
    `</div>\n` +
    `<script>\n` +
    `(function(){\n` +
    `  var KEY='noticeSeen';\n` +
    `  var el=document.getElementById('notice-privacy');\n` +
    `  if(!el)return;\n` +
    `  var seen=false;\n` +
    `  try{ seen=sessionStorage.getItem(KEY)==='true'; }catch(_){}\n` +
    `  if(seen){ el.remove(); return; }\n` +
    `  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){el.style.transition='none';}\n` +
    `  function dismiss(){\n` +
    `    el.classList.remove('on');\n` +
    `    el.classList.add('off');\n` +
    `  }\n` +
    `  var b=el.querySelector('.notice-dismiss');\n` +
    `  if(b)b.addEventListener('click',dismiss);\n` +
    `  try{ sessionStorage.setItem(KEY,'true'); }catch(_){}\n` +
    `  requestAnimationFrame(function(){ el.classList.add('on'); });\n` +
    `  setTimeout(dismiss,4000);\n` +
    `})();\n` +
    `</script>`;
}

function runLegalNotice(report) {
  gate('legal');
  const files = walkHtml(ROOT);
  let changed = 0;

  for (const abs of files) {
    const original = readFileSync(abs, 'utf8');
    if (original.includes(NOTICE_MARKER)) continue;
    const rel = relOf(abs);
    const prefix = rel.includes('/') ? '../'.repeat(rel.split('/').length - 1) : '';
    const html = original.replace(/<\/body>\s*<\/html>/i, `\n${noticeSnippet(prefix)}\n</body>\n</html>`);
    if (html !== original) {
      changed++;
      if (report) {
        log(`  [legal] ${rel} \u2014 would rewrite`);
      } else {
        writeFileSync(abs, html, 'utf8');
      }
    }
  }
  log(`[legal] ${changed} file(s) ${report ? 'would be rewritten (report only)' : 'rewritten'} \u2014 privacy notice injected`);
}

/* ── preferred-sources step ─────────────────────────────────
   Injects Google's "Add to preferred sources" library into the
   head of every page that presents the shared footer button.
   Only the article/promotional pages keep the script; internal
   and utility pages (craft/drops/internal scripts, the map and
   the verification file) are skipped since they carry no button. */
const PREF_EXCLUDE = new Set([
  'craft.html',
  'drops.html',
  'internal-dm-scripts.html',
  'googlecf73118a74657205.html',
  'tools/phuket-map/index.html',
  'tools/fretboard-trainer/index.html',
  'tools/slang-glossary/index.html',
  'tools/guess-the-beach/index.html',
]);
/* Prefixes cover the generated per-term pages (50+ paths) that must stay
   script-free alongside their parent tool page. */
const PREF_EXCLUDE_PREFIXES = ['tools/slang-glossary/terms/'];
const prefExcluded = (rel) =>
  PREF_EXCLUDE.has(rel) || PREF_EXCLUDE_PREFIXES.some((p) => rel.startsWith(p));
const PREF_SCRIPT = `<script async src="https://news.google.com/swg/js/v1/publisher.js"><\/script>`;

function runPreferred(report) {
  gate('preferred');
  const files = walkHtml(ROOT);
  let changed = 0;

  for (const abs of files) {
    const rel = relOf(abs);
    if (prefExcluded(rel)) continue;
    const original = readFileSync(abs, 'utf8');
    if (original.includes('news.google.com/swg/js/v1/publisher.js')) continue;
    const html = original.replace(/<\/head>/i, `\n${PREF_SCRIPT}\n</head>`);
    if (html !== original) {
      changed++;
      if (report) {
        log(`  [preferred] ${rel} \u2014 would rewrite`);
      } else {
        writeFileSync(abs, html, 'utf8');
      }
    }
  }
  log(`[preferred] ${changed} file(s) ${report ? 'would be rewritten (report only)' : 'rewritten'} \u2014 preferred-sources script injected`);
}

/* lastmod from the commit that last touched each file, not from its mtime.
   A fresh clone gives every file the checkout timestamp, so an mtime-derived
   sitemap claims all 71 URLs changed on every machine that builds it — which
   is exactly the kind of lastmod Google is documented to ignore. Commit dates
   are also stable across runs, so they keep the generated sitemap idempotent.

   Files not yet committed (a freshly generated term page) fall back to mtime,
   so their date settles once they are committed and the next build picks it
   up. Renames keep their new path out of the map and fall back to mtime too. */
function gitLastmodMap() {
  let out;
  try {
    out = execFileSync('git', ['log', '--name-only', '--format=%x1e%cs'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch {
    return new Map(); // git missing, or not a repo: callers fall back to mtime
  }

  const map = new Map();
  // Newest commit first, so the first sighting of a path is its latest date.
  for (const chunk of out.split('\x1e')) {
    const nl = chunk.indexOf('\n');
    if (nl === -1) continue;
    const date = chunk.slice(0, nl).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    for (const line of chunk.slice(nl + 1).split('\n')) {
      const p = line.trim();
      if (p && !map.has(p)) map.set(p, date);
    }
  }
  return map;
}

function runSitemap() {
  gate('sitemap');
  const EXCLUDE = new Set(['item-template.html', 'internal-dm-scripts.html', '404.html', 'craft.html', 'drops.html', 'googlecf73118a74657205.html', 'tools/guess-the-beach/contact-sheet.html']);
  const files = walkHtml(ROOT).filter(abs => !EXCLUDE.has(relOf(abs)));
  const lastmods = gitLastmodMap();

  // No <changefreq> and no <priority>: Google has ignored both since 2015 and
  // treats a stale changefreq as a signal to crawl less. <lastmod> is the only
  // hint here, so it is worth getting right (see gitLastmodMap).
  const urls = files
    .map(abs => {
      const rel = relOf(abs);
      const lastmod = lastmods.get(rel) || new Date(statSync(abs).mtime).toISOString().slice(0, 10);
      let loc;
      if (rel === 'index.html') loc = `${SITE_BASE}/`;
      else if (/\/index\.html$/.test(rel)) loc = `${SITE_BASE}/${rel.replace(/\/index\.html$/, '')}/`;
      else loc = `${SITE_BASE}/${rel}`;
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
    })
    .join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

  writeFileSync(join(ROOT, 'sitemap.xml'), sitemap, 'utf8');
  log(`[sitemap] sitemap.xml: ${files.length} urls`);

  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_BASE}/sitemap.xml\n`;
  writeFileSync(join(ROOT, 'robots.txt'), robots, 'utf8');
  log('[sitemap] robots.txt written');
}

/* ── cache-bust step ───────────────────────────────────────────
   GitHub Pages answers with `Cache-Control: max-age=600` for every file, so
   right after a deploy a browser can hold yesterday's CSS/JS against today's
   HTML. A content hash in the query string changes the URL exactly when the
   bytes change, which turns that ten-minute window into a hard bust.

   Applies the glossary hashes to the pages that are edited in place rather
   than generated (the browse UI page, mainly). Generated term pages already
   carry the query from their template; this pass is a no-op for them, which is
   what keeps it idempotent. Keyed by resolved path, not filename, because the
   fretboard trainer ships its own style.css and script.js.

   Ordering: this must stay after any step that rewrites the hashed files. None
   do today — they are hand-authored — so the hashes stay valid wherever it
   runs. Adding one would mean reordering stepOrder, not just adding a step. */
function runCacheBust(report) {
  gate('cachebust');
  const byAbs = new Map();
  for (const [name, hash] of glossaryAssetHashes()) {
    byAbs.set(resolve(ROOT, 'tools', 'slang-glossary', name), hash);
  }
  if (!byAbs.size) {
    log('[cachebust] no glossary assets found, nothing to bust');
    return;
  }

  // Matches any dir prefix, any existing query, any fragment, so index.html
  // (`style.css`) and terms/*.html (`../style.css`) both hit and a re-run
  // replaces the old ?v= instead of stacking another one.
  const re = new RegExp(
    `\\b(href|src)="((?:[^"?#]*\\/)?)(${GLOSSARY_ASSETS.join('|')})` +
    `(?:\\?[^"#]*)?(#[^"]*)?"`,
    'g'
  );

  let changed = 0;
  let tagged = 0;
  for (const abs of walkHtml(ROOT)) {
    const rel = relOf(abs);
    const original = readFileSync(abs, 'utf8');
    const baseDir = dirname(abs);
    let hits = 0;
    const html = original.replace(re, (m, attr, dir, name, frag) => {
      const hash = byAbs.get(resolve(baseDir, dir + name));
      if (!hash) return m;
      hits++;
      return `${attr}="${dir}${name}?v=${hash}${frag || ''}"`;
    });
    if (!hits || html === original) continue;
    tagged += hits;
    changed++;
    if (report) log(`  [cachebust] ${rel} — would rewrite (${hits})`);
    else writeFileSync(abs, html, 'utf8');
  }
  const summary = [...byAbs.values()].join(' ');
  log(`[cachebust] ${summary} — ${changed} file(s) ` +
    `${report ? 'would be rewritten' : 'rewritten'}, ${tagged} reference(s)`);
}

/* ── runner ───────────────────────────────────────────────── */
const STEPS = {
  partials: runPartials,
  links: runLinks,
  items: runItems,
  shops: runShops,
  map: runMap,
  posts: runPosts,
  glossary: runGlossary,
  'glossary-pages': runGlossaryPages,
  beachgame: runBeachGame,
  seo: runSeo,
  fonts: runFonts,
  js: runJs,
  preferred: runPreferred,
  legal: runLegalNotice,
  cachebust: runCacheBust,
  sitemap: runSitemap,
};

const stepOrder = ['items', 'shops', 'map', 'posts', 'glossary', 'glossary-pages', 'beachgame', 'partials', 'seo', 'fonts', 'js', 'preferred', 'legal', 'cachebust', 'links', 'sitemap'];
const toRun = opts.steps
  ? opts.steps
  : (opts.enableContent ? stepOrder : ['partials', 'links']);

const started = Date.now();
log(`ossuary-atelier build :: ${new Date().toISOString()}`);
log(`root: ${ROOT}`);
log(`steps: ${toRun.join(', ')}${opts.report ? ' (report only)' : ''}`);
log('─'.repeat(60));

for (const step of toRun) {
  const fn = STEPS[step];
  if (!fn) {
    warn(`unknown step "${step}"`);
    continue;
  }
  try {
    if (step === 'partials') {
      fn(opts.report);
    } else if (step === 'links') {
      fn(opts.strict);
    } else {
      fn();
    }
  } catch (err) {
    warn(err.message);
    process.exitCode = 1;
  }
}

log('─'.repeat(60));
log(`done in ${Date.now() - started}ms`);