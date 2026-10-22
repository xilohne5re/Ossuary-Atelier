#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════
   ossuary-atelier — optimize-images.mjs
   ═══════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const safety = JSON.parse(readFileSync(join(ROOT, 'assets/photos-safety.json'), 'utf8'));
const safetyTargets = [...new Set(safety.map(r => 'assets/' + r.image))].filter(p => /\.(jpg|jpeg|png)$/i.test(p)).sort();

const TARGETS = [
  'assets/images/ITEM-013.jpg',
  'assets/images/ITEM-013 back.jpg',
  'assets/images/ITEM-014.jpg',
  ...safetyTargets,
];

async function main() {
  const converted = [];
  for (const rel of TARGETS) {
    const src = join(ROOT, rel);
    if (!existsSync(src)) {
      console.warn(`[optimize] missing source: ${rel}`);
      continue;
    }
    const out = src.replace(/\.jpe?g$/i, '.webp');
    if (existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs) {
      console.log(`[optimize] up to date: ${rel.slice('assets/'.length)}`);
      continue;
    }
    const before = statSync(src).size;
    await sharp(src, { failOn: 'none' })
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(out);
    const after = statSync(out).size;
    console.log(`[optimize] ${rel.slice('assets/'.length)}: ` +
      `${Math.round(before / 1024)} KiB -> ${Math.round(after / 1024)} KiB WebP`);
    converted.push(rel);
  }

  const swaps = TARGETS.map((rel) => [rel, rel.replace(/\.jpe?g$/i, '.webp')])
    .filter(([from, to]) => from !== to);
  let touched = 0;
  let refs = 0;
  for (const rel of walk(ROOT)) {
    const abs = join(ROOT, rel);
    const original = readFileSync(abs, 'utf8');
    let next = original;
    for (const [from, to] of swaps) {
      const n = next.split(from).join(to);
      refs += n.length !== next.length ? 1 : 0;
      next = n;
    }
    if (next !== original) {
      writeFileSync(abs, next, 'utf8');
      touched++;
    }
  }
  console.log(`[optimize] ${converted.length} image(s) converted, ` +
    `${touched} file(s) with references updated (${refs} reference count)`);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(html|json|md)$/i.test(entry.name)) out.push(relative(ROOT, full).split('\\').join('/'));
  }
  return out;
}

const IGNORED = new Set(['node_modules', '.git', '_partials']);

main().catch((e) => { console.error(e); process.exit(1); });
