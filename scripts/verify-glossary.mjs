/* Static checks over the generated glossary output. No jsdom, no network —
   this reads the committed HTML the way a crawler would and asserts the
   invariants that are easy to break and expensive to notice.

   Run: node scripts/verify-glossary.mjs            (add --quiet for pass/fail) */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'tools', 'slang-glossary');
const TERMS = join(DIR, 'terms');
const SITE = 'https://ossuaryphuket.me/Ossuary-Atelier';
const quiet = process.argv.includes('--quiet');

let pass = 0;
const fails = [];
const ok = (cond, msg) => {
  if (cond) pass++;
  else fails.push(msg);
};
const read = (p) => readFileSync(p, 'utf8');

/* the 8 hex chars the build stamps into ?v=, so a stale hash is caught here
   rather than as a cache-busted URL that still serves the old bytes */
const hashOf = (name) =>
  createHash('sha256').update(readFileSync(join(DIR, name))).digest('hex').slice(0, 8);
const HASH = { 'style.css': hashOf('style.css'), 'speak.js': hashOf('speak.js') };

/* every JSON-LD block on a page must actually parse */
const jsonLdBlocks = (html) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => m[1]);

const parseAll = (html, where) => {
  const out = [];
  jsonLdBlocks(html).forEach((raw, i) => {
    try {
      out.push(JSON.parse(raw));
    } catch (e) {
      fails.push(`${where}: JSON-LD block ${i + 1} does not parse (${e.message})`);
    }
  });
  return out;
};

/* ── the browse page ─────────────────────────────────────────── */
const indexPath = join(DIR, 'index.html');
const index = read(indexPath);
const setUrl = `${SITE}/tools/slang-glossary/`;

ok(index.includes('<h2 class="gl-sr-h">'), 'index: results region has no h2 heading');
// The cards are <h3>, injected by script.js into .gl-grid. The h3s that do exist
// in the static source sit under "How the two scores work", so the rule is that
// none of them may come before the results heading.
const resultsAt = index.indexOf('<h2 class="gl-sr-h">');
const firstStaticH3 = index.search(/<h3[\s>]/);
ok(firstStaticH3 === -1 || firstStaticH3 > resultsAt,
  `index: a static h3 (at ${firstStaticH3}) precedes the results h2 (at ${resultsAt})`);

// canonical / og:url must agree with the sitemap's directory form
const canon = /<link rel="canonical" href="([^"]+)">/.exec(index)?.[1];
const ogUrl = /<meta property="og:url" content="([^"]+)">/.exec(index)?.[1];
ok(canon === setUrl, `index: canonical is ${canon}, want ${setUrl}`);
ok(ogUrl === canon, `index: og:url (${ogUrl}) != canonical (${canon})`);

// DefinedTermSet is what the 50 term pages point at, so it has to exist
const setNodes = parseAll(index, 'index').flatMap((d) => d['@graph'] || [d]);
const dts = setNodes.find((n) => n['@type'] === 'DefinedTermSet');
const list = setNodes.find((n) => n['@type'] === 'ItemList');
ok(!!dts, 'index: no DefinedTermSet node');
ok(!!list, 'index: no ItemList node');
ok(dts?.url === setUrl, `index: DefinedTermSet.url is ${dts?.url}, want ${setUrl}`);

const termFiles = readdirSync(TERMS).filter((f) => f.endsWith('.html'));
ok(termFiles.length === 50, `terms: ${termFiles.length} pages, want 50`);

for (const name of ['style.css', 'speak.js']) {
  ok(index.includes(`"${name}?v=${HASH[name]}"`),
    `index: ${name} hash does not match the file`);
}
ok(index.includes(`"script.js?v=${hashOf('script.js')}"`),
  'index: script.js hash does not match the file');

const declared = new Set(dts?.hasDefinedTerm || []);
ok(declared.size === 50, `index: hasDefinedTerm lists ${declared.size}, want 50`);
ok(list?.numberOfItems === 50, `index: numberOfItems is ${list?.numberOfItems}, want 50`);
ok((list?.itemListElement || []).length === 50,
  `index: itemListElement has ${list?.itemListElement?.length}, want 50`);

/* ── every term page ─────────────────────────────────────────── */
const titles = new Map();
const descs = new Map();

for (const f of termFiles) {
  const rel = `tools/slang-glossary/terms/${f}`;
  const html = read(join(TERMS, f));
  const id = f.replace(/\.html$/, '');
  const url = `${SITE}/${rel}`;
  const where = `terms/${f}`;

  // no development-only citation data may reach a visitor
  ok(!/"source[s]?"\s*:/.test(html), `${where}: leaked a source citation`);
  ok(!/meta\.note|"note"\s*:\s*"http/.test(html), `${where}: leaked meta.note`);

  const c = /<link rel="canonical" href="([^"]+)">/.exec(html)?.[1];
  const o = /<meta property="og:url" content="([^"]+)">/.exec(html)?.[1];
  ok(c === url, `${where}: canonical is ${c}, want ${url}`);
  ok(o === c, `${where}: og:url != canonical`);

  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1];
  const desc = /<meta name="description" content="([^"]*)">/.exec(html)?.[1];
  ok(!!title, `${where}: no title`);
  ok(!!desc, `${where}: no description`);
  if (titles.has(title)) fails.push(`${where}: duplicate title with ${titles.get(title)}`);
  if (descs.has(desc)) fails.push(`${where}: duplicate description with ${descs.get(desc)}`);
  titles.set(title, f);
  descs.set(desc, f);
  ok(!/&(?![a-z][a-z0-9]*;|#\d+;|#x[0-9a-f]+;)/i.test(desc || ''),
    `${where}: bare & in description (not a well-formed entity)`);

  // DefinedTerm must resolve back into the set
  const dt = parseAll(html, where).find((d) => d['@type'] === 'DefinedTerm');
  ok(!!dt, `${where}: no DefinedTerm`);
  ok(dt?.['@id'] === `${url}#term`, `${where}: DefinedTerm @id is ${dt?.['@id']}`);
  ok(dt?.url === url, `${where}: DefinedTerm.url is ${dt?.url}`);
  ok(dt?.inDefinedTermSet === setUrl, `${where}: inDefinedTermSet is ${dt?.inDefinedTermSet}`);
  ok(declared.has(dt?.['@id']), `${where}: @id is not in the set's hasDefinedTerm`);
  ok(/^[a-z]{2}(-[A-Za-z0-9]+)*$/.test(dt?.inLanguage || ''),
    `${where}: inLanguage is ${dt?.inLanguage}`);

  // alternateName must not restate the name or repeat itself
  const alt = dt && 'alternateName' in dt ? [].concat(dt.alternateName) : [];
  const keys = alt.map((a) => String(a).trim().toLowerCase());
  ok(!keys.includes(String(dt?.name).trim().toLowerCase()),
    `${where}: alternateName restates name`);
  ok(new Set(keys).size === keys.length, `${where}: duplicate alternateName entries`);

  // cached assets are busted, and the hash matches the file on disk
  ok(html.includes(`href="../style.css?v=${HASH['style.css']}"`),
    `${where}: style.css hash does not match the file`);
  ok(html.includes(`src="../speak.js?v=${HASH['speak.js']}"`),
    `${where}: speak.js hash does not match the file`);
}

/* ── italic preload only where the first viewport renders italic ── */
const preloadsItalic = (p) => /cormorant-italic\.woff2/.test(read(p));
ok(!preloadsItalic(indexPath), 'index: preloads italic, but only cards use it');
for (const f of termFiles) {
  const html = read(join(TERMS, f));
  const hasAlt = /class="alt"/.test(html);
  if (hasAlt !== preloadsItalic(join(TERMS, f))) {
    fails.push(`terms/${f}: italic preload (${preloadsItalic(join(TERMS, f))}) ` +
      `does not match hero italic (${hasAlt})`);
  }
}

/* ── the site-wide sitemaps agree with the files ─────────────── */
const sitemap = read(join(ROOT, 'sitemap.xml'));
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const lastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
ok(locs.length === 70, `sitemap: ${locs.length} urls, want 70`);
ok(lastmods.length === locs.length, 'sitemap: every url needs a lastmod');
ok(!/<changefreq>/.test(sitemap), 'sitemap: changefreq present (Google ignores it)');
ok(!/<priority>/.test(sitemap), 'sitemap: priority present (Google ignores it)');
ok(locs.length === new Set(locs).size, 'sitemap: duplicate loc');
ok([...sitemap.matchAll(/<url>/g)].length === locs.length, 'sitemap: url/loc count mismatch');
for (const d of lastmods) {
  ok(/^\d{4}-\d{2}-\d{2}$/.test(d), `sitemap: bad lastmod "${d}"`);
}
ok(read(join(ROOT, 'robots.txt')).includes(`${SITE}/sitemap.xml`),
  'robots.txt: sitemap not declared');

for (const f of termFiles) {
  ok(locs.includes(`${SITE}/tools/slang-glossary/terms/${f}`),
    `sitemap: missing terms/${f}`);
}
ok(locs.includes(setUrl), 'sitemap: missing the glossary index');

/* ── report ──────────────────────────────────────────────────── */
if (!quiet) {
  for (const m of fails) console.error(`  FAIL  ${m}`);
  console.log(`[verify] ${pass} passed, ${fails.length} failed`);
}
process.exitCode = fails.length ? 1 : 0;