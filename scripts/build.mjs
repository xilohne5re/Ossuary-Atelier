#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════
   Ossuary Atelier — build.mjs
   Phase 0 scaffold: partials injection + link checks.
   Content steps (items/shops/posts/sitemap) are gated behind
   --enable-content until the review gate is cleared.
   ═══════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative, posix } from 'node:path';
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
const SITE_BASE = 'https://ossuaryphuket.me/Ossuary-Atelier';
const RETIRED_BASES = [
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

function journalHref(relPath) {
  const dir = posix.dirname(relPath);
  if (dir === '.') return 'blog/index.html';
  return posix.relative(dir, 'blog/index.html');
}

function guideHref(relPath) {
  const dir = posix.dirname(relPath);
  if (dir === '.') return 'guide/index.html';
  return posix.relative(dir, 'guide/index.html');
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
    const journal = journalHref(relPath);
    const guide = guideHref(relPath);

    const slots = [];
    if (/<nav id="nav"|@@NAV_SLOT@@/.test(html)) slots.push('NAV');
    if (/<div id="topbar">|@@TOPBAR_SLOT@@/.test(html)) slots.push('TOPBAR');
    if (/<footer id="footer">|@@FOOTER_SLOT@@/.test(html)) slots.push('FOOTER');

    for (const slot of slots) {
      let rendered = '';
      if (slot === 'NAV') {
        rendered = renderPartial('nav', { ROOT: root, JOURNAL: journal, GUIDE: guide });
      } else if (slot === 'TOPBAR') {
        const backOrId = topbarBackOrId(html, relPath);
        rendered = renderPartial('topbar', { ROOT: root, BACK_OR_ID: backOrId });
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

function runLinks(strict) {
  const files = walkHtml(ROOT);
  let brokenTotal = 0;
  const externalish = (u) => /^(?:https?:|mailto:|tel:|data:|javascript:|\/\/|#)/i.test(u);

  for (const abs of files) {
    const relPath = relOf(abs);
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

function runPosts() {
  gate('posts');
  if (!existsSync(CONTENT_DIR)) throw new Error('[posts] _content/ missing');
  log('[posts] markdown pipeline ready (marked + gray-matter)');
  // Phase 3: render _content/posts/*.md into blog pages.
}

/* ── seo step ──────────────────────────────────────────────── */
const SEO_SKIP = new Set(['404.html']);

const SEO_NOINDEX = new Set(['internal-dm-scripts.html', 'item-template.html', 'craft.html', 'drops.html']);

const SEO_DESC = {
  'index.html': "Curated secondhand fashion. Every piece carries proof of where it's been.",
  'guide/index.html': "The Phuket Thrift Guide — a living directory of secondhand shops, sourcing notes, and recovery tips across Phuket, plus maps, tools, and the Ossuary Atelier archive.",
  'shop.html': 'Shop current and archived pieces from Ossuary Atelier. Every item carries a QR-verified story.',
  'about.html': 'The story of Ossuary Atelier \u2014 a Phuket secondhand clothing brand that grew into a thrift guide, an interactive map, and a growing record of Phuket\u2019s secondhand culture.',
  'contact.html': 'Contact Ossuary Atelier \u2014 DM to claim a piece, ask about provenance, or begin a collaboration.',
  'tos.html': 'Ossuary Atelier purchase terms \u2014 payment, shipping, returns policy, and condition disclosure for all orders.',
  'partnership.html': 'Ossuary Atelier creator partnership agreement \u2014 what we offer, what we ask, and how it works.',
  'blog/index.html': "Ossuary Atelier's field journal \u2014 thrift guides, sourcing notes, and the study of found things.",
  'blog/guide/index.html': 'Phuket thrift & secondhand guide \u2014 honest shop reviews, price ranges, and what to look for when thrifting in Phuket.',
  'blog/guide/waanwaal-phuket.html': '317 Saensook Soi 2, Phuket Town. Curated vintage and thrifted clothing with a strong women\u2019s selection.',
  'blog/guide/owa-phuket.html': 'O-WA Second Hand, Phuket \u2014 a dense, well-stocked thrift shop worth visiting on weekday mornings. Source of the Michiko Koshino dress.',
  'blog/field-notes/chatuchak-nov-24.html': 'Four hours in and nothing. Then a face-down Glad News hoodie on a folding table between sections 5 and 6.',
  'tools/phuket-map/index.html': 'An interactive map of Phuket thrift shops, beaches, and activity spots \u2014 open, editable, and free to reuse.',
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

function runSeo(report) {
  gate('seo');
  const files = walkHtml(ROOT);
  const items = existsSync(join(DATA_DIR, 'items.json'))
    ? JSON.parse(readFileSync(join(DATA_DIR, 'items.json'), 'utf8')).items
    : [];
  const itemById = new Map(items.map(i => [i.id, i]));
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

    const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(html);
    const title = titleMatch ? titleMatch[1].trim() : rel;

    let desc = SEO_DESC[rel];
    const idMatch = /^(ITEM-\d+)\.html$/.exec(rel);
    if (idMatch && itemById.has(idMatch[1])) {
      const it = itemById.get(idMatch[1]);
      desc = `${it.name} (${it.era}). Found at ${it.source_shop || 'a local market'}. ${it.price} \u2014 available at Ossuary Atelier.`;
    }
    if (!desc) desc = 'Ossuary Atelier \u2014 secondhand fashion with verified stories.';

    const root = rootPrefix(rel);
    const canonicalPath = rel === 'index.html' ? '' : rel.replace(/\/index\.html$/, '');
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
      `  <link rel="icon" type="image/png" sizes="32x32" href="${root}assets/favicon-32.png">\n` +
      `  <link rel="icon" type="image/svg+xml" href="${root}assets/favicon.svg">\n` +
      `  <link rel="apple-touch-icon" href="${root}assets/apple-touch-icon.png">` +
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

function runSitemap() {
  gate('sitemap');
  const EXCLUDE = new Set(['item-template.html', 'internal-dm-scripts.html', '404.html', 'craft.html', 'drops.html']);
  const files = walkHtml(ROOT).filter(abs => !EXCLUDE.has(relOf(abs)));
  const priorities = {
    'index.html': '1.0',
    'guide/index.html': '1.0',
    'shop.html': '0.9',
    'blog/index.html': '0.9',
    'blog/guide/index.html': '0.9',
    'tools/phuket-map/index.html': '0.8',
    'contact.html': '0.7',
    'about.html': '0.7',
  };
  const changefreqs = {
    'index.html': 'weekly',
    'guide/index.html': 'weekly',
    'shop.html': 'weekly',
    'blog/index.html': 'weekly',
    'blog/guide/index.html': 'weekly',
    'tools/phuket-map/index.html': 'monthly',
    'about.html': 'monthly',
  };

  const urls = files
    .map(abs => {
      const rel = relOf(abs);
      const lastmod = new Date(statSync(abs).mtime).toISOString().slice(0, 10);
      let loc;
      if (rel === 'index.html') loc = `${SITE_BASE}/`;
      else if (/\/index\.html$/.test(rel)) loc = `${SITE_BASE}/${rel.replace(/\/index\.html$/, '')}/`;
      else loc = `${SITE_BASE}/${rel}`;
      const pri = priorities[rel] || (rel.startsWith('blog/') ? '0.8' : rel.startsWith('ITEM-') ? '0.7' : '0.5');
      const freq = changefreqs[rel] || 'monthly';
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${pri}</priority>\n  </url>`;
    })
    .join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

  writeFileSync(join(ROOT, 'sitemap.xml'), sitemap, 'utf8');
  log(`[sitemap] sitemap.xml: ${files.length} urls`);

  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_BASE}/sitemap.xml\n`;
  writeFileSync(join(ROOT, 'robots.txt'), robots, 'utf8');
  log('[sitemap] robots.txt written');
}

/* ── runner ───────────────────────────────────────────────── */
const STEPS = {
  partials: runPartials,
  links: runLinks,
  items: runItems,
  shops: runShops,
  posts: runPosts,
  seo: runSeo,
  sitemap: runSitemap,
};

const stepOrder = ['items', 'shops', 'posts', 'partials', 'seo', 'links', 'sitemap'];
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