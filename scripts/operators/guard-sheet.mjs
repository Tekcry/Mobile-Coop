// (guard-models G4s) The guard variety contact sheet: the `sheet` stage of the guard bake (PLAN G4).
//
//   node scripts/operators/guard-sheet.mjs --in <bake out dir> --out <png> [--kit guards.json] [--port 4189]
//        [--only bases,faces,hair,kinds,gear,helmet,lods,night] [--dry-run] [--no-build] [--allow-missing]
//   (bake driver: guard-bake.mjs --stage sheet runs it with `--kit <guards.json> --out <bake out dir>`; the PNG then goes
//   to <out>/sheet/guard-sheet.png)
//
// Laptop GPU run: E2E_GPU=1 (hardware GPU; without it the render is software GL and the sheet says so), port 4189 (E2E_PORT
// or --port). Builds guards.html alone (vite.operators.config.ts with GUARD_SHEET_ONLY=1, into build/guards-lab/), serves
// it with the bake out dir at /__guards/ (GUARD_SHEET_IN), drives `window.__guards` (src/operators/lab/guardSheet.ts:
// every tile drawn by the game's guard runtime) in headless Chromium, composes the tiles on a canvas and writes one PNG.
// The tile plan, labels and layout are guardSheetPlan.mjs (pure, tests/guardSheetPlan.test.ts).
//
// Missing bake inputs (GLBs, guard-<base>.json, reports) stop the run before any browser starts, exit 1, with the list;
// --allow-missing draws what exists and marks the rest. --dry-run prints the tile plan and the input check only (no
// build, no server, no browser), exit 1 when inputs are missing.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inputStatus, layoutSheet, pickSections, SHEET, sheetArgs, sheetPlan } from './guardSheetPlan.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const KIT_DEFAULT = path.join(ROOT, 'scripts', 'operators', 'data', 'guards.json');
const CONFIG = path.join(ROOT, 'vite.operators.config.ts');
const log = (s) => console.info(`guard-sheet: ${s}`);

/** Rejects after `ms` naming `what` (the page-ready wait and each tile's render), so a texture that never readies cannot hang the run. */
const TILE_TIMEOUT_MS = Number(process.env.GUARD_SHEET_TILE_TIMEOUT_MS) > 0 ? Number(process.env.GUARD_SHEET_TILE_TIMEOUT_MS) : 60000;
function withTimeout(promise, what, ms = TILE_TIMEOUT_MS) {
  let timer;
  const limit = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`timeout after ${ms / 1000} s: ${what}`)), ms); });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}

function fail(msg, code = 1) {
  console.error(`guard-sheet: ${msg}`);
  process.exit(code);
}

let opts;
try {
  opts = sheetArgs(process.argv.slice(2), process.env);
} catch (e) {
  fail(e.message, 2);
}
const kitPath = path.resolve(opts.kit ?? KIT_DEFAULT);
if (!existsSync(kitPath)) fail(`kit not found: ${kitPath}`);
const kit = JSON.parse(readFileSync(kitPath, 'utf8'));
const inDir = path.resolve(opts.inDir);
const png = path.resolve(opts.png);
if (!existsSync(inDir)) fail(`bake out dir not found: ${inDir}`);

// ---- the input check and the plan ----
const status = inputStatus(kit, (rel) => existsSync(path.join(inDir, rel)));
const reports = {};
for (const i of status.all) {
  if (i.what !== 'report' || !existsSync(path.join(inDir, i.rel))) continue;
  try { reports[i.owner] = JSON.parse(readFileSync(path.join(inDir, i.rel), 'utf8')); } catch (e) { log(`unreadable report ${i.rel}: ${e.message}`); }
}
let sections;
try {
  sections = pickSections(sheetPlan(kit, { reports, ready: status.ready }), opts.only);
} catch (e) {
  fail(e.message, 2);
}
printPlan(sections);
const missingNote = () => {
  const by = new Map();
  for (const m of status.missing) by.set(m.owner, [...(by.get(m.owner) ?? []), m.rel]);
  return [...by].map(([o, rels]) => `  ${o}: ${rels.join(', ')}`).join('\n');
};
log(`bake out dir ${inDir}: ${status.all.length - status.missing.length} of ${status.all.length} inputs present; ready: ${status.ready.join(', ') || 'none'}`);
if (status.missing.length) {
  console.error(`guard-sheet: ${status.missing.length} bake input(s) missing:\n${missingNote()}`);
  if (opts.dryRun) fail('dry run: inputs missing (a real run stops here; --allow-missing draws what exists)');
  if (!opts.allowMissing) fail('bake inputs missing: run the lods and check stages first (guard-bake.mjs --stage lods / check), or pass --allow-missing for a partial sheet');
  if (!status.ready.some((o) => kit.bases?.some((b) => b.id === o))) fail('no base is baked: nothing to draw');
}
if (opts.dryRun) {
  log(`dry run: every input present; the sheet would be ${png}`);
  process.exit(0);
}

// ---- the run ----
const { chromium } = await import('playwright-core');
const { GPU, launchOptions } = await import('../e2e-lib.mjs');
const vite = await import('vite');
if (!GPU) console.warn('guard-sheet: E2E_GPU is not 1: this is a software-GL render and must not be claimed as a GPU result.');
process.env.E2E_PORT = String(opts.port);
process.env.GUARD_SHEET_ONLY = '1';
process.env.GUARD_SHEET_IN = inDir;
const BASE = `http://127.0.0.1:${opts.port}`;

let server = null;
let browser = null;
const errors = [];
const notes = [];
try {
  if (opts.build) {
    log('building guards.html (build/guards-lab/)');
    await vite.build({ configFile: CONFIG, root: ROOT, logLevel: 'warn' });
  }
  server = await vite.preview({ configFile: CONFIG, root: ROOT, logLevel: 'warn' });
  browser = await chromium.launch(launchOptions());
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  await page.goto(`${BASE}/guards.html`);
  const st = await withTimeout(page.evaluate(() => window.__guardsReady), 'page ready (window.__guardsReady)');
  log(`renderer ${st.renderer}`);
  // the runtime's own verdict on each base (resolveGuardAsset: what the game would refuse)
  const refused = Object.entries(st.bases).filter(([b, x]) => !x.ok && status.ready.includes(b));
  for (const [b, x] of Object.entries(st.bases)) log(`  ${b}: ${x.ok ? `${x.pieces.length} pieces` : x.problems.join('; ')}`);
  if (refused.length && !opts.allowMissing) throw new Error(`the guard runtime refuses ${refused.map(([b]) => b).join(', ')} (see above)`);
  const ready = [...Object.entries(st.bases).filter(([, x]) => x.ok).map(([b]) => b), ...(st.shield ? status.ready.filter((o) => !st.bases[o]) : [])];
  sections = pickSections(sheetPlan(kit, { reports, ready }), opts.only);
  const lay = layoutSheet(sections);

  // tiles
  const shots = new Map();
  let n = 0;
  const total = lay.tiles.filter((t) => !t.tile.skip).length;
  for (const t of lay.tiles) {
    if (t.tile.skip) continue;
    await page.setViewportSize({ width: t.tile.size[0], height: t.tile.size[1] });
    const r = await withTimeout(page.evaluate((tile) => window.__guards.render(tile), t.tile), `tile ${t.tile.id}`);
    shots.set(t.tile.id, r.url);
    for (const x of r.notes) notes.push(`${t.tile.id}: ${x}`);
    if (++n % 10 === 0 || n === total) log(`  ${n} / ${total} tiles`);
  }

  // compose
  const compose = await ctx.newPage();
  await compose.setContent('<canvas id="c"></canvas>');
  const noteLines = notes.length ? ['Notes (what could not be drawn as asked):', ...notes] : [];
  const height = lay.height + (noteLines.length ? noteLines.length * 18 + 24 : 0);
  await compose.evaluate(({ w, h }) => {
    const cv = document.getElementById('c');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.fillStyle = '#101417'; g.fillRect(0, 0, w, h);
  }, { w: lay.width, h: height });
  const T = { title: '#e8eef0', dim: '#7f9aa3', text: '#cfd8dc', warn: '#d9a441' };
  const date = new Date().toISOString().slice(0, 10);
  const text = [
    { x: SHEET.margin, y: 14, size: 26, weight: '600', color: T.title, text: 'GUARD VARIETY SHEET' },
    { x: SHEET.margin, y: 50, size: 14, color: T.dim, maxWidth: lay.width - 2 * SHEET.margin, text: `Guard figures as the game draws them (GuardFigure, guardVariant, applyGear, guardTints; map ${SHEET.mapId}, faction ${SHEET.faction}, pose ${SHEET.pose}, preset ${SHEET.preset}). ${GPU ? 'Hardware GPU' : 'SOFTWARE GL (not a GPU result)'}: ${st.renderer}. Bake ${inDir}. ${date}.` },
  ];
  for (const h of lay.headers) {
    text.push({ x: h.x, y: h.y, size: 20, weight: '600', color: T.title, text: h.title });
    text.push({ x: h.x, y: h.y + 26, size: 13, color: T.dim, maxWidth: lay.width - 2 * SHEET.margin, text: h.note });
  }
  for (const t of lay.tiles) {
    const src = shots.get(t.tile.id);
    if (src) {
      await compose.evaluate(async ({ src, x, y, w, h, smooth }) => {
        const g = document.getElementById('c').getContext('2d');
        const im = new Image();
        im.src = src;
        await im.decode();
        g.imageSmoothingEnabled = smooth;
        g.imageSmoothingQuality = 'high';
        g.drawImage(im, x, y, w, h);
        g.strokeStyle = '#2c3f4a'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      }, { src, x: t.x, y: t.y, w: t.w, h: t.h, smooth: t.tile.smooth });
    } else {
      await compose.evaluate(({ x, y, w, h }) => {
        const g = document.getElementById('c').getContext('2d');
        g.fillStyle = '#1a1f23'; g.fillRect(x, y, w, h);
      }, { x: t.x, y: t.y, w: t.w, h: t.h });
      text.push({ x: t.x + 8, y: t.y + 8, size: 13, color: T.warn, maxWidth: t.w - 16, text: t.tile.skip || 'not drawn' });
    }
    text.push({ x: t.x, y: t.labelY, size: 13, color: T.text, maxWidth: t.w, text: t.tile.label });
    if (t.tile.sub) text.push({ x: t.x, y: t.labelY + SHEET.labelLine, size: 12, color: T.dim, maxWidth: t.w, text: t.tile.sub });
  }
  noteLines.forEach((s, i) => text.push({ x: SHEET.margin, y: lay.height + i * 18, size: i ? 12 : 14, color: i ? T.warn : T.title, maxWidth: lay.width - 2 * SHEET.margin, text: s }));
  const data = await compose.evaluate((items) => {
    const cv = document.getElementById('c');
    const g = cv.getContext('2d');
    g.textBaseline = 'top';
    for (const it of items) {
      g.fillStyle = it.color; g.font = `${it.weight ?? ''} ${it.size}px system-ui, sans-serif`;
      const maxW = it.maxWidth ?? cv.width;
      const lines = [];
      for (const para of String(it.text).split('\n')) {
        let line = '';
        for (const word of para.split(' ')) {
          const t = line ? `${line} ${word}` : word;
          if (g.measureText(t).width > maxW && line) { lines.push(line); line = word; } else line = t;
        }
        lines.push(line);
      }
      lines.forEach((ln, i) => g.fillText(ln, it.x, it.y + i * it.size * 1.3));
    }
    return cv.toDataURL('image/png');
  }, text);
  const buf = Buffer.from(data.split(',')[1], 'base64');
  mkdirSync(path.dirname(png), { recursive: true });
  writeFileSync(png, buf);
  log(`wrote ${png} (${lay.width} x ${height}, ${(buf.length / 1048576).toFixed(1)} MB, ${shots.size} tiles)`);
} catch (e) {
  errors.push(`run failed: ${e.message ?? e}`);
} finally {
  await browser?.close().catch(() => {});
  await server?.close().catch(() => {});
}
if (notes.length) log(`${notes.length} note(s):\n  ${notes.join('\n  ')}`);
if (errors.length) {
  console.error(`guard-sheet: ${errors.length} error(s), first:\n  ${errors[0]}`);
  process.exit(1);
}

/** The tile plan, as --dry-run shows it. */
function printPlan(secs) {
  const lay = layoutSheet(secs);
  log(`plan: ${secs.length} sections, ${lay.tiles.length} tiles, sheet ${lay.width} x ${lay.height} px (before notes)`);
  for (const s of secs) {
    log(`  [${s.id}] ${s.title}: ${s.tiles.length} tiles`);
    for (const t of s.tiles) {
      const v = t.view;
      const figs = t.figures.map((f) => `${f.kind}/${f.base}${f.lod === 'game' ? '' : ` lod${f.lod}`}${f.helmet ? ' +helmet' : ''}${f.armour ? ' +armour' : ''}${f.drop ? ' +drop' : ''}`).join(', ');
      const state = t.skip ? `  SKIP (${t.skip})` : t.missing?.length ? `  partial (missing ${t.missing.join(', ')})` : '';
      log(`    ${t.id.padEnd(30)} ${`${t.label}${t.sub ? ` | ${t.sub}` : ''}`.padEnd(58)} ${t.rig}${t.post !== 'none' ? `+${t.post}` : ''} ${v.target} ${v.distance} m fov ${v.fovDeg} | ${figs}${state}`);
    }
  }
}
