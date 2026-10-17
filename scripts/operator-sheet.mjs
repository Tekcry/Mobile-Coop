// npm run operators:sheet [wren|moth] [--only turnaround,closeups,menu,context,compare,lods,wire,colourblind,rim,goggle] [--no-build]
// SHEET_CLOSEUPS=collar,ptt limits the close-ups (iteration).
// Headless contact sheets of the Operator Lab (BRIEF Stage 2.2), E2E_GPU=1 on Michael's PC (hardware GPU), E2E_PORT=4191.
// Builds the Lab (build/operators-lab/), serves it with the pipeline output, drives `window.__lab`, composes each sheet on a
// canvas (labels, scale bar, callouts, colour-blind simulation) and writes WebP into docs/operators/mockups/<operator>/.
// A sheet whose subject is not built yet is skipped and listed in the summary; nothing is faked.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { GPU, launchOptions } from './e2e-lib.mjs';
import { OUT_DIR, ROOT } from './operators/paths.mjs';
import { GARMENTS } from './operators/export-gltf.mjs';

const { KITS } = await import('../src/operators/kit.ts');
const { CLOSEUPS, TURNAROUND, GLOWS, REFERENCE_LIGHTS, COLOUR_BLIND, SUIT_FEATURES, builtSuitFeatures, calloutsFor, simulate } = await import('../src/operators/lab/labData.ts');

const argv = process.argv.slice(2);
const operators = argv.filter((a) => !a.startsWith('-') && ['wren', 'moth'].includes(a));
const onlyArg = argv.find((a) => a.startsWith('--only='))?.split('=')[1] ?? (argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : '');
const ALL = ['turnaround', 'closeups', 'menu', 'context', 'compare', 'lods', 'wire', 'colourblind', 'rim', 'goggle'];
// not in ALL: `--only diag` prints the turnaround's front / back value diagnosis (fix round 2, item 7), no sheet
const only = onlyArg ? onlyArg.split(',') : ALL;
const PORT = Number(process.env.E2E_PORT ?? 4191);
const BASE = `http://127.0.0.1:${PORT}`;
const DEST_ROOT = path.join(ROOT, 'docs', 'operators', 'mockups');
const skipped = [];
const written = [];
const ktxDiffs = [];

if (!GPU) console.warn('operator-sheet: E2E_GPU is not 1: this is a software-GL render and must not be claimed as a GPU result.');

// ---- server ----
if (!argv.includes('--no-build')) {
  const b = spawnSync('npx', ['vite', 'build', '--config', 'vite.operators.config.ts'], { cwd: ROOT, stdio: 'inherit', shell: true });
  if (b.status !== 0) throw new Error('Lab build failed');
}
const server = spawn('npx', ['vite', 'preview', '--config', 'vite.operators.config.ts', '--open', 'false'], { cwd: ROOT, stdio: 'ignore', shell: true });
const killServer = () => { try { spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* gone */ } };
process.on('exit', killServer);
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`${BASE}/operators.html`)).ok) break; } catch { /* not up yet */ }
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch(launchOptions());
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text().slice(0, 300)); });
await page.goto(`${BASE}/operators.html?clean`);
await page.evaluate(() => window.__labReady);
const gpuName = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); const e = gl?.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
console.log(`operator-sheet: renderer ${gpuName}`);

const compose = await ctx.newPage();
await compose.setContent('<canvas id="c"></canvas>');

// ---- helpers ----
/** Render one view in the Lab and return a PNG data URL. cfg: { op, rig, pose, preset, debug, ortho, silhouette, gameRig, offsets, view: [target, radius, yaw, pitch] | { closeup } | { turnaround }, size: [w, h], frames, lod } */
async function render(cfg) {
  const [w, h] = cfg.size;
  await page.setViewportSize({ width: w, height: h });
  return page.evaluate(async (c) => {
    const l = window.__lab;
    if (l.loadedId !== c.op) { await l.load(c.op); }
    if (c.lod && l.state.lod !== c.lod) { l.state.lod = c.lod; await l.load(c.op); }
    l.engine.resize();
    if (l.state.gameRig !== !!c.gameRig) l.setGameRig(!!c.gameRig);
    l.setOffsets(c.offsets?.[0] ?? 0, c.offsets?.[1] ?? 0);
    if (l.state.silhouette !== !!c.silhouette) l.setSilhouette(!!c.silhouette);
    if (l.state.ortho !== !!c.ortho) l.setOrtho(!!c.ortho);
    // only what changed: a new post pipeline needs a few frames before it draws
    if (l.state.preset !== (c.preset ?? 'epic')) l.setPreset(c.preset ?? 'epic');
    if (l.state.rig !== (c.rig ?? 'studio')) l.setRig(c.rig ?? 'studio');
    if (l.state.debug !== (c.debug ?? 'none')) l.setDebug(c.debug ?? 'none');
    if (l.state.pose !== (c.pose ?? 'apose')) l.setPose(c.pose ?? 'apose');
    l.setExposureBoost(c.ev ?? 0);
    if (c.view.closeup) l.closeUp(c.view.closeup);
    else if (c.view.joint) {
      const j = l.jointPos(c.view.joint[0]);
      const o = c.view.joint[1];
      l.look([j[0] + o[0], j[1] + o[1], j[2] + o[2]], c.view.radius, c.view.yaw, c.view.pitch);
    } else if (c.view.turnaround) l.turnaround(c.view.turnaround, c.view.radius);
    else l.look(c.view.target, c.view.radius, c.view.yaw, c.view.pitch);
    if (c.view.after) await c.view.after(l);
    await l.frames(c.frames ?? 24);
    return l.canvas.toDataURL('image/png');
  }, serialisable(cfg));
}
function serialisable(cfg) { return JSON.parse(JSON.stringify(cfg)); }
/** Fix round 2 (item 4): the operator-only mask of the view just rendered (lab.maskShot), for figureStats. */
const maskOf = () => page.evaluate(() => window.__lab.maskShot());

/** Draws a sheet: spec = { width, height, background, items: [{ type: 'image'|'text'|'rect'|'bar', ... }], filter }. Returns a WebP buffer. */
async function sheet(spec, quality = 0.9) {
  const data = await compose.evaluate(async (s) => {
    const cv = document.getElementById('c');
    cv.width = s.width; cv.height = s.height;
    const g = cv.getContext('2d');
    g.fillStyle = s.background ?? '#101417'; g.fillRect(0, 0, s.width, s.height);
    const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
    for (const it of s.items) {
      if (it.type === 'image') {
        const img = await load(it.src);
        if (it.filter) {
          const t = document.createElement('canvas'); t.width = it.w; t.height = it.h;
          const tg = t.getContext('2d'); tg.drawImage(img, 0, 0, it.w, it.h);
          const d = tg.getImageData(0, 0, it.w, it.h);
          const m = it.filter; const lin = (v) => Math.pow(v / 255, 2.2); const enc = (v) => Math.round(255 * Math.pow(Math.max(0, Math.min(1, v)), 1 / 2.2));
          for (let i = 0; i < d.data.length; i += 4) {
            const r = lin(d.data[i]), gg = lin(d.data[i + 1]), b = lin(d.data[i + 2]);
            d.data[i] = enc(m[0] * r + m[1] * gg + m[2] * b); d.data[i + 1] = enc(m[3] * r + m[4] * gg + m[5] * b); d.data[i + 2] = enc(m[6] * r + m[7] * gg + m[8] * b);
          }
          tg.putImageData(d, 0, 0); g.drawImage(t, it.x, it.y);
        } else if (it.fit === 'contain') {
          const k = Math.min(it.w / img.width, it.h / img.height); const w = img.width * k, h = img.height * k;
          g.drawImage(img, it.x + (it.w - w) / 2, it.y + (it.h - h) / 2, w, h);
        } else g.drawImage(img, it.x, it.y, it.w, it.h);
        if (it.border) { g.strokeStyle = it.border; g.lineWidth = 1; g.strokeRect(it.x + 0.5, it.y + 0.5, it.w - 1, it.h - 1); }
      } else if (it.type === 'text') {
        g.fillStyle = it.color ?? '#cfd8dc'; g.font = `${it.weight ?? ''} ${it.size ?? 18}px system-ui, sans-serif`; g.textBaseline = 'top';
        const lines = []; const maxW = it.maxWidth ?? s.width;
        for (const para of String(it.text).split('\n')) {
          let line = '';
          for (const word of para.split(' ')) {
            const t = line ? `${line} ${word}` : word;
            if (g.measureText(t).width > maxW && line) { lines.push(line); line = word; } else line = t;
          }
          lines.push(line);
        }
        lines.forEach((ln, i) => g.fillText(ln, it.x, it.y + i * (it.size ?? 18) * 1.35));
      } else if (it.type === 'rect') {
        g.fillStyle = it.color; g.fillRect(it.x, it.y, it.w, it.h);
      } else if (it.type === 'swatch') {
        g.fillStyle = it.color; g.beginPath(); g.arc(it.x, it.y, it.r, 0, Math.PI * 2); g.fill();
      }
    }
    return cv.toDataURL('image/webp', s.quality);
  }, { ...spec, quality });
  return Buffer.from(data.split(',')[1], 'base64');
}

function save(op, name, buf) {
  const dir = path.join(DEST_ROOT, op);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${op}-${name}.webp`);
  writeFileSync(file, buf);
  written.push(path.relative(ROOT, file));
  console.log(`  wrote ${path.relative(ROOT, file)} (${(buf.length / 1024).toFixed(0)} KB)`);
}

const builtKit = (op) => {
  const ids = new Set();
  for (const g of GARMENTS[op] ?? []) {
    const f = path.join(OUT_DIR, op, `${op}-${g}-sim.json`);
    if (!existsSync(f)) continue;
    const r = JSON.parse(readFileSync(f, 'utf8'));
    ids.add(r.kit);
    for (const p of r.details?.patches ?? []) if (p.kit) ids.add(p.kit);
  }
  // fix round 1 (item 4): the suit's zip and thumb loops are kit items built as part of the suit
  const suit = builtSuit(op);
  if (suit.has('zip')) ids.add('suitZip');
  if (suit.has('thumbLoops')) ids.add('thumbLoops');
  return ids;
};
/** Material names in a GLB's JSON chunk. */
const glbMaterials = (f) => {
  if (!existsSync(f)) return [];
  const b = readFileSync(f);
  const len = b.readUInt32LE(12);
  return (JSON.parse(b.subarray(20, 20 + len).toString('utf8')).materials ?? []).map((m) => m.name ?? '');
};
/** The suit zones the build has (labData SUIT_FEATURES), from the suit's sim report and the source GLB's materials. */
const builtSuit = (op) => {
  const f = path.join(OUT_DIR, op, `${op}-suit-sim.json`);
  if (!existsSync(f)) return new Set();
  return builtSuitFeatures(JSON.parse(readFileSync(f, 'utf8')), glbMaterials(path.join(OUT_DIR, op, `${op}-lab.glb`)));
};
/** sRGB value of an 18 % grey card facing the rig's key (lab.greyCard), measured once per rig and run. */
const cards = new Map();
async function greyCard(rig) {
  if (!cards.has(rig)) cards.set(rig, await page.evaluate(async (r) => { const l = window.__lab; if (l.state.rig !== r) l.setRig(r); return (await l.greyCard()).toFixed(2); }, rig));
  return cards.get(rig);
}

const T = { title: '#e8eef0', dim: '#7f9aa3', text: '#cfd8dc', warn: '#d9a441' };
const titleBar = (op, title, w, note = '') => [
  { type: 'text', x: 24, y: 14, size: 26, weight: '600', color: T.title, text: `${op.toUpperCase()} - ${title}` },
  { type: 'text', x: 24, y: 48, size: 14, color: T.dim, maxWidth: w - 48, text: `${note}${note ? '   ' : ''}Lab render, ${GPU ? 'hardware GPU' : 'SOFTWARE GL (not a GPU result)'}: ${gpuName}. ${new Date().toISOString().slice(0, 10)}.` },
];
const label = (x, y, text, size = 15, color = T.text) => ({ type: 'text', x, y, size, color, text });

/**
 * Value spread of the operator in a render, sRGB luma percentiles over her pixels only (fix round 2, item 4: the mask is
 * lab.maskShot() of the same view, so floor, backdrop, grey human and scale bar never count; shadowed figure pixels do).
 * `band` = [top, bottom] fractions of the mask's bounding box height (e.g. legs, torso).
 */
async function figureStats(src, mask, band = [0, 1]) {
  return compose.evaluate(async ({ src, mask, band }) => {
    const px = async (u) => {
      const im = new Image();
      im.src = u;
      await im.decode();
      const c = document.createElement('canvas');
      c.width = 960; c.height = Math.round((960 * im.height) / im.width);
      const g = c.getContext('2d');
      g.drawImage(im, 0, 0, c.width, c.height);
      return { d: g.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
    };
    const a = await px(src), m = await px(mask);
    const on = (i) => Math.max(m.d[i], m.d[i + 1], m.d[i + 2]) > 24;
    let y0 = m.h, y1 = -1;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (on((y * m.w + x) * 4)) { if (y < y0) y0 = y; y1 = y; break; }
    const top = y0 + band[0] * (y1 - y0), bot = y0 + band[1] * (y1 - y0);
    const ys = [];
    for (let y = Math.max(0, Math.floor(top)); y <= Math.min(m.h - 1, Math.ceil(bot)); y++) {
      for (let x = 0; x < m.w; x++) {
        const i = (y * m.w + x) * 4;
        if (on(i)) ys.push((0.2126 * a.d[i] + 0.7152 * a.d[i + 1] + 0.0722 * a.d[i + 2]) / 255);
      }
    }
    ys.sort((x, y) => x - y);
    const q = (f) => (ys.length ? ys[Math.min(ys.length - 1, Math.floor(f * ys.length))].toFixed(2) : 'n/a');
    return { p10: q(0.1), p50: q(0.5), p90: q(0.9), share: (ys.length / (m.w * m.h)).toFixed(2) };
  }, { src, mask, band });
}

/** A WebP / PNG file as a data URL (earlier Cycles renders placed on a sheet, labelled as such). */
const fileUrl = (f) => `data:image/${f.endsWith('.png') ? 'png' : 'webp'};base64,${readFileSync(f).toString('base64')}`;

// ---- the sheets ----
async function turnaround(op) {
  const tw = 560, th = 780, gap = 12, top = 90;
  const card = await greyCard('figure');
  const frontBack = [];
  const items = titleBar(op, 'Turnaround at Epic, hero LOD, calibrated whole-figure light', tw * 5 + gap * 6 + 312, `Top: orthographic. Bottom: perspective, 50 mm equivalent, with her masked sRGB luma medians (torso, legs). Grey figure: 1.75 m human at real proportions; bar ticks every 0.25 m. Light 'figure' (A78): front key, cool back rim, no bloom; an 18 % grey card facing the key renders sRGB ${card}. Right: an 18 % grey sphere in her place under the same light, front and back.`);
  let row = 0;
  for (const ortho of [true, false]) {
    let col = 0;
    for (const v of TURNAROUND) {
      const src = await render({ op, rig: 'figure', pose: 'apose', preset: 'epic', lod: 'hero', ortho, silhouette: true, view: { turnaround: v, radius: ortho ? 4.2 : 6.2 }, size: [tw, th], frames: 30 });
      const x = gap + col * (tw + gap), y = top + row * (th + 34);
      items.push({ type: 'image', src, x, y, w: tw, h: th, border: '#2c3f4a' });
      // fix round 2 (item 7): her own pixels only, torso and legs, so front and back can be compared
      let vals = '';
      if (!ortho) {
        const mask = await maskOf();
        const torso = await figureStats(src, mask, [0.18, 0.42]), legs = await figureStats(src, mask, [0.55, 0.92]);
        vals = `: torso ${torso.p50}, legs ${legs.p50}`;
        frontBack.push(`${v.label} torso ${torso.p50} legs ${legs.p50}`);
      }
      items.push(label(x + 8, y + th + 6, `${v.label} - ${ortho ? 'orthographic' : 'perspective 50 mm'}${vals}`));
      col++;
    }
    row++;
  }
  // fix round 2 (item 7): the rig itself, on a grey sphere in her place, from the front and the back
  const sx = gap + 5 * (tw + gap), sw = 300;
  for (const [k, v] of [TURNAROUND[0], TURNAROUND[4]].entries()) {
    await page.evaluate(() => window.__lab.probeSphere(true));
    const src = await render({ op, rig: 'figure', pose: 'apose', preset: 'epic', lod: 'hero', ortho: false, silhouette: false, view: { target: [0, 1.1, 0], radius: 2.2, yaw: v.yaw, pitch: 0 }, size: [sw * 2, sw * 2], frames: 20 });
    const st = await figureStats(src, await maskOf());
    await page.evaluate(() => window.__lab.probeSphere(false));
    const y = top + k * (sw + 60);
    items.push({ type: 'image', src, x: sx, y, w: sw, h: sw, border: '#2c3f4a' }, label(sx + 8, y + sw + 6, `Grey sphere, ${v.label}: median ${st.p50}`));
    frontBack.push(`sphere ${v.label} ${st.p50}`);
  }
  console.log(`  turnaround masked medians: ${frontBack.join('; ')}`);
  save(op, 'sheet-turnaround', await sheet({ width: sx + sw + gap, height: top + 2 * (th + 34) + 10, items }, 0.88));
}

async function closeups(op) {
  const kit = KITS[op];
  const built = builtKit(op);
  const suitBuilt = builtSuit(op);
  const W = 1920, H = 1080, panel = 520;
  const pick = process.env.SHEET_CLOSEUPS?.split(',');
  for (const c of CLOSEUPS) {
    if (c.id === 'harness' && op !== 'moth') continue;
    if (pick && !pick.includes(c.id)) continue;
    // step 11 (A78): the calibrated close-up rig - near-black reads near-black; the caption gives the figure's values
    // fix round 1 (item 1, D21): the hero LOD, whose baked normal / ORM maps carry the emboss, perforations, pebble,
    // weave, fibre and wear; the unbaked source is flat factors
    const rig = c.rig ?? (Math.abs(c.yaw) > Math.PI / 2 ? 'detailRear' : 'detail');
    const lod = 'hero';
    const src = await render({ op, rig, pose: 'apose', preset: 'epic', lod, view: { closeup: c.id }, size: [3840, 2160], frames: 40 });
    const st = await figureStats(src, await maskOf());
    // fix round 2 (item 6): the same view, same LOD, exposure lifted +2 EV, so relief and material steps can be judged
    const lift = await render({ op, rig, pose: 'apose', preset: 'epic', lod, ev: 2, view: { closeup: c.id }, size: [3840, 2160], frames: 30 });
    await page.evaluate(() => window.__lab.setExposureBoost(0));
    const card = await greyCard(rig);
    const here = calloutsFor(kit.items, built, c);
    // fix round 2 (item 3): a suit zone that is also a kit item (the zip, the thumb loops) is called out once, as the kit item
    const asKit = { zip: 'suitZip', thumbLoops: 'thumbLoops' };
    const suitHere = SUIT_FEATURES.filter((f) => (c.suit ?? []).includes(f.id) && suitBuilt.has(f.id) && !here.some((i) => i.id === asKit[f.id]));
    const zone = kit.items.filter((i) => c.include?.includes(i.id) || (c.zones.includes(i.zone) && (c.match.length === 0 || c.match.some((m) => `${i.where} ${i.name}`.toLowerCase().includes(m)))));
    const pending = zone.filter((i) => !built.has(i.id) && !c.exclude?.includes(i.id));
    const items = [
      ...titleBar(op, `Close-up: ${c.label}`, W + panel, `Hero LOD (baked maps, KTX2 through Babylon's transcoder). Top: calibrated close-up light '${rig}' (A78): an 18 % grey card facing the key renders sRGB ${card} (measured this run); generated studio environment for the metals. Bottom: detail read, the same view and LOD with the exposure lifted +2 EV (relief and material steps; not the calibrated value). ${c.distance} m, 4K source scaled to ${W}x${H}. Her pixels (operator mask, sRGB luma, calibrated panel): median ${st.p50}, p10 ${st.p10}, p90 ${st.p90}.`),
      { type: 'image', src, x: 0, y: 90, w: W, h: H, border: '#2c3f4a' },
      label(12, 90 + H + 6, `Calibrated ('${rig}', grey card sRGB ${card})`, 16),
      { type: 'image', src: lift, x: 0, y: 120 + H, w: W, h: H, border: '#2c3f4a' },
      label(12, 120 + 2 * H + 6, 'Detail read: same view, exposure +2 EV', 16, T.warn),
      { type: 'rect', x: W, y: 90, w: panel, h: 2 * H + 30, color: '#0b0f11' },
    ];
    let y = 106;
    items.push({ type: 'text', x: W + 16, y, size: 17, weight: '600', color: T.title, text: 'What is visible' });
    y += 32;
    for (const f of suitHere) {
      const t = `${f.name}\n${f.where}. ${f.job}. Attached: part of the suit (bonded).`;
      items.push({ type: 'text', x: W + 16, y, size: 14, color: T.text, maxWidth: panel - 32, text: t });
      y += 18 * 1.35 * (2 + Math.ceil(t.length / 62)) * 0.8 + 12;
    }
    if (!here.length && !suitHere.length) {
      items.push({ type: 'text', x: W + 16, y, size: 14, color: T.dim, maxWidth: panel - 32, text: 'No separate kit item in this view.' });
      y += 56;
    }
    for (const i of here) {
      const t = `${i.name}${i.count ? ` x${i.count}` : ''}\n${i.where}. ${i.job}. Attached: ${i.attach}.`;
      items.push({ type: 'text', x: W + 16, y, size: 14, color: T.text, maxWidth: panel - 32, text: t });
      y += 18 * 1.35 * (2 + Math.ceil(t.length / 62)) * 0.8 + 12;
    }
    if (pending.length) {
      y += 8;
      items.push({ type: 'text', x: W + 16, y, size: 15, weight: '600', color: T.warn, text: 'Not built yet (later steps)' });
      y += 26;
      for (const i of pending.slice(0, 14)) { items.push({ type: 'text', x: W + 16, y, size: 13, color: T.dim, maxWidth: panel - 32, text: `${i.name}: ${i.job}` }); y += 34; }
    }
    save(op, `sheet-closeup-${c.id}`, await sheet({ width: W + panel, height: 2 * H + 160, items }, 0.86));
  }
}

async function menu(op) {
  const W = 1280, H = 720;
  const main = await render({ op, rig: 'menu', pose: 'idle', preset: 'epic', view: { target: [0, 1.0, 0], radius: 2.6, yaw: 0.25, pitch: 0.03 }, size: [W, H], frames: 40 });
  const items = titleBar(op, 'Menu test: the menu scene framing and lighting, plus three close camera moves', 1900, 'Menu framing: target 1.0 m, radius 2.6 m (scripts/rig-shot.mjs). Idle pose from the game rig.');
  items.push({ type: 'image', src: main, x: 12, y: 90, w: 960, h: 540, border: '#2c3f4a' }, label(20, 636, 'Menu framing'));
  const moves = [
    ['Dolly in to the chest', (i, n) => ({ target: [0, 1.25, 0], radius: 2.6 - 1.9 * (i / (n - 1)), yaw: 0.25, pitch: 0.03 })],
    ['Orbit the head', (i, n) => ({ joint: ['head', [0, 0.02, 0.02]], radius: 0.9, yaw: -0.9 + 1.8 * (i / (n - 1)), pitch: 0.06 })],
    ['Tilt down to the boots', (i, n) => ({ target: [0, 1.3 - 1.1 * (i / (n - 1)), 0], radius: 1.8 - 0.7 * (i / (n - 1)), yaw: 0.3, pitch: 0.03 - 0.12 * (i / (n - 1)) })],
  ];
  const n = 5, tw = 384, th = 216;
  for (let m = 0; m < moves.length; m++) {
    items.push(label(12, 660 + m * (th + 40), moves[m][0], 15, T.dim));
    for (let i = 0; i < n; i++) {
      const src = await render({ op, rig: 'menu', pose: 'idle', preset: 'epic', view: { ...moves[m][1](i, n) }, size: [tw * 2, th * 2], frames: 24 });
      items.push({ type: 'image', src, x: 12 + i * (tw + 6), y: 684 + m * (th + 40), w: tw, h: th, border: '#2c3f4a' });
    }
  }
  items.push({ type: 'rect', x: 980, y: 90, w: 920, h: 540, color: '#0b0f11' });
  items.push({ type: 'text', x: 996, y: 106, size: 15, color: T.dim, maxWidth: 890, text: 'The strips show that the detail holds as the camera moves: silhouette, fabric sheen and edge wear keep their shape from 2.6 m to the close-up distance.' });
  save(op, 'sheet-menu', await sheet({ width: 1912, height: 684 + 3 * (th + 40) + 10, items }, 0.88));
}

async function context(op) {
  const W = 1280, H = 720;
  const a = await render({ op, rig: 'hollowmere', pose: 'crouch', preset: 'epic', view: { target: [0, 0.65, 0], radius: 5, yaw: 0.6, pitch: 0.06 }, size: [W, H], frames: 40 });
  const b = await render({ op, rig: 'dark', pose: 'idle', preset: 'epic', view: { target: [0, 1.3, 0], radius: 20, yaw: 0.2, pitch: 0.02 }, size: [W, H], frames: 40 });
  const items = [
    ...titleBar(op, 'In context: Hollowmere night and full darkness', 2600, 'Left: crouched in shadow at 5 m, sodium orange against blue moon. Right: full darkness at 20 m, the identity test: silhouette and goggle glow only (the built lenses glow; their spill light lights the scene ahead, never her).'),
    { type: 'image', src: a, x: 12, y: 100, w: W, h: H, border: '#2c3f4a' }, label(20, 100 + H + 6, 'Hollowmere night, crouched, 5 m'),
    { type: 'image', src: b, x: W + 24, y: 100, w: W, h: H, border: '#2c3f4a' }, label(W + 32, 100 + H + 6, 'Full darkness, 20 m'),
  ];
  save(op, 'sheet-context', await sheet({ width: W * 2 + 36, height: 100 + H + 40, items }, 0.88));
}

async function compare(op) {
  const W = 1000, H = 900;
  const ba = await render({ op, rig: 'figure', pose: 'idle', preset: 'epic', lod: 'hero', gameRig: true, offsets: [-0.6, 0.6], view: { target: [0, 0.9, 0], radius: 6.6, yaw: 0.2, pitch: 0.04 }, size: [W, H], frames: 30 });
  const card = await greyCard('figure');
  const items = [
    ...titleBar(op, 'Before / after: the new operator beside the current game operator', W * 2 + 36, `The current operator is the game rig built in the Lab (flat-colour parts), read-only. Hero LOD, calibrated whole-figure light (18 % grey card = sRGB ${card}, no bloom).`),
    { type: 'image', src: ba, x: 12, y: 100, w: W, h: H, border: '#2c3f4a' }, label(20, 100 + H + 6, `${op} (left)  |  current game operator (right)`),
  ];
  const other = op === 'wren' ? 'moth' : 'wren';
  // an operator counts as built once its garments exist (moth-lab.glb alone is step 05's bare body)
  const otherBuilt = (GARMENTS[other] ?? []).length > 0 && existsSync(path.join(OUT_DIR, other, `${other}-lab.glb`));
  items.push({ type: 'rect', x: W + 24, y: 100, w: W, h: H, color: '#0b0f11' });
  items.push({ type: 'text', x: W + 44, y: 120, size: 17, color: otherBuilt ? T.text : T.warn, maxWidth: W - 40, text: otherBuilt ? `${other} is built: the two-operator frame is rendered by the sheet run that has both.` : `${other} is not built yet (see PLAN.md), so the two-operator frame waits. This tile will hold ${op} and ${other} side by side in one frame once both exist.` });
  save(op, 'sheet-compare', await sheet({ width: W * 2 + 36, height: 100 + H + 40, items }, 0.88));
  if (!otherBuilt) skipped.push(`${op}: both operators side by side (${other} not built)`);
}

async function lods(op) {
  const lodList = await page.evaluate(async (o) => { const l = window.__lab; if (l.loadedId !== o) await l.load(o); return l.lods; }, op);
  const W = 520, H = 820;
  const cols = [];
  for (const lod of lodList) cols.push({ lod, preset: lod === 'phone' ? 'phone' : 'epic', name: lod === 'source' ? 'Build (unbaked), Epic' : lod === 'hero' ? 'Hero (baked), Epic' : lod === 'phone' ? 'Phone LOD, phone look' : `In-game ${lod}, Epic` });
  const shots = [];
  const paths = [];
  for (let i = 0; i < cols.length; i++) {
    shots.push(await render({ op, rig: 'hollowmere', pose: 'sneak', preset: cols[i].preset, lod: cols[i].lod, view: { target: [0, 0.9, 0], radius: 7, yaw: 0.5, pitch: 0.08 }, size: [W, H], frames: 40 }));
    paths.push(await page.evaluate(() => window.__lab.ktx2Path));
  }
  const ktx = paths.includes('decoded') ? ' Baked LODs: KTX2 textures (KHR_texture_basisu) shown as the reference transcoder decoded them.' : paths.includes('babylon') ? ' Baked LODs: KTX2 (KHR_texture_basisu) transcoded by Babylon on load from the bundled @babylonjs/ktx2decoder (D27; BC7 on this GPU, no network).' : '';
  const items = titleBar(op, 'Each in-game LOD and the phone look at gameplay distance (7 m)', W * cols.length + 12 * (cols.length + 1), `LODs: ${lodList.join(', ')} (step 10: npm run operators:lods).${ktx}`);
  for (let i = 0; i < cols.length; i++) items.push({ type: 'image', src: shots[i], x: 12 + i * (W + 12), y: 100, w: W, h: H, border: '#2c3f4a' }, label(20 + i * (W + 12), 100 + H + 6, `${cols[i].name}${paths[i] === 'none' ? '' : ` (${paths[i] === 'decoded' ? 'KTX2, decoded' : 'KTX2'})`}`));
  save(op, 'sheet-lods', await sheet({ width: W * cols.length + 12 * (cols.length + 1), height: 100 + H + 40, items }, 0.88));
  if (lodList.length === 1) { skipped.push(`${op}: baked LODs (npm run operators:lods)`); return; }
  // Step 10 fix round 1: the baked maps as Babylon draws them, raking light (a dent must read as a dent, no seams along
  // UV islands), and the torso bent in the sneak pose (the rib segments must not gap at LOD0 / LOD1).
  const baked = lodList.filter((l) => l !== 'source');
  const rows = [
    { name: 'Chest, raking light', pose: 'apose', view: { closeup: 'chestFront' } },
    { name: 'Boot, raking light', pose: 'apose', view: { closeup: 'boots' } },
    { name: 'Torso bent (sneak), ribs', pose: 'sneak', view: { joint: ['chest', [0, -0.15, 0]], radius: 0.9, yaw: 0.35, pitch: -0.35 } },
  ];
  const S = 560;
  const cw = S * baked.length + 12 * (baked.length + 1);
  const it2 = titleBar(op, 'Baked LODs in Babylon: close-ups under a raking light and the torso bent', cw, `Columns: ${baked.join(', ')} (glTF tangents, ORM, tangent normal maps as shipped).`);
  for (let r = 0; r < rows.length; r++) {
    for (let i = 0; i < baked.length; i++) {
      const src = await render({ op, rig: 'raking', pose: rows[r].pose, preset: baked[i] === 'phone' ? 'phone' : 'epic', lod: baked[i], view: rows[r].view, size: [S * 2, S * 2], frames: 30 });
      const y = 100 + r * (S + 40);
      it2.push({ type: 'image', src, x: 12 + i * (S + 12), y, w: S, h: S, border: '#2c3f4a' }, label(20 + i * (S + 12), y + S + 6, `${baked[i]}: ${rows[r].name}`));
    }
  }
  save(op, 'sheet-lods-closeups', await sheet({ width: cw, height: 100 + rows.length * (S + 40), items: it2 }, 0.9));
  // Fix round 1 (D27): Babylon's own KTX2 transcode against the reference decode, same view, per baked LOD
  const it3 = titleBar(op, 'KTX2: Babylon transcode on the GPU vs the reference decode', cw, 'Top: KTX2 transcoded by Babylon (bundled @babylonjs/ktx2decoder, BC7). Bottom: the same KTX2 decoded by ktx extract --transcode rgba8, level 0, as PNG. Chest under the raking light. Under each pair: mean absolute difference of the two renders (sRGB, 0-255).');
  for (let i = 0; i < baked.length; i++) {
    const pair = [];
    for (const mode of ['babylon', 'decoded']) {
      await page.evaluate(async ({ m, o, lod }) => { const l = window.__lab; l.state.ktx2 = m; l.state.lod = lod; await l.load(o); }, { m: mode, o: op, lod: baked[i] });
      pair.push(await render({ op, rig: 'raking', pose: 'apose', preset: baked[i] === 'phone' ? 'phone' : 'epic', lod: baked[i], view: { closeup: 'chestFront' }, size: [S * 2, S * 2], frames: 30 }));
    }
    await page.evaluate(async (o) => { const l = window.__lab; l.state.ktx2 = 'babylon'; await l.load(o); }, op);
    const diff = await compose.evaluate(async ([a, b]) => {
      const px = async (u) => { const im = new Image(); im.src = u; await im.decode(); const c = document.createElement('canvas'); c.width = 280; c.height = 280; const g = c.getContext('2d'); g.drawImage(im, 0, 0, 280, 280); return g.getImageData(0, 0, 280, 280).data; };
      const x = await px(a), y = await px(b);
      let t = 0; for (let k = 0; k < x.length; k += 4) t += (Math.abs(x[k] - y[k]) + Math.abs(x[k + 1] - y[k + 1]) + Math.abs(x[k + 2] - y[k + 2])) / 3;
      return (t / (x.length / 4)).toFixed(2);
    }, pair);
    ktxDiffs.push(`${baked[i]} ${diff}`);
    it3.push({ type: 'image', src: pair[0], x: 12 + i * (S + 12), y: 100, w: S, h: S, border: '#2c3f4a' }, label(20 + i * (S + 12), 100 + S + 6, `${baked[i]}: Babylon transcode`));
    it3.push({ type: 'image', src: pair[1], x: 12 + i * (S + 12), y: 140 + S, w: S, h: S, border: '#2c3f4a' }, label(20 + i * (S + 12), 140 + 2 * S + 6, `${baked[i]}: reference decode (mean abs diff ${diff})`));
  }
  save(op, 'sheet-ktx2-compare', await sheet({ width: cw, height: 180 + 2 * S + 10, items: it3 }, 0.9));
  console.log(`  KTX2 Babylon vs decoded, mean abs diff: ${ktxDiffs.join(', ')}`);
}

async function wire(op) {
  const W = 560, H = 780;
  const lodList = await page.evaluate(async (o) => { const l = window.__lab; if (l.loadedId !== o) await l.load(o); return l.lods; }, op);
  const stats = [];
  const items = titleBar(op, 'Wireframe and LOD strip with triangle counts and texture sizes', W * 2 + 36, '');
  let x = 12;
  for (const lod of lodList) {
    const src = await render({ op, rig: 'studio', pose: 'apose', preset: 'epic', debug: 'wire', lod, view: { turnaround: TURNAROUND[1], radius: 5.5 }, size: [W, H], frames: 30 });
    const s = await page.evaluate(() => window.__lab.stats());
    stats.push(s);
    items.push({ type: 'image', src, x, y: 100, w: W, h: H, border: '#2c3f4a' }, label(x + 8, 100 + H + 6, `${lod}: ${s.triangles.toLocaleString()} triangles, ${s.meshes} meshes, ${s.materials} materials`));
    x += W + 12;
  }
  // fix round 2 (item 8): the in-game LOD0, whose wire reads (the source is 2.5 M triangles)
  const wireLod = lodList.includes('lod0') ? 'lod0' : lodList[0];
  const close = await render({ op, rig: 'studio', pose: 'apose', preset: 'epic', debug: 'wire', lod: wireLod, view: { joint: ['chest', [0, 0.02, 0.1]], radius: 0.5, yaw: 0.3, pitch: 0.05 }, size: [W, H], frames: 30 });
  items.push({ type: 'image', src: close, x, y: 100, w: W, h: H, border: '#2c3f4a' }, label(x + 8, 100 + H + 6, `Wireframe, ${wireLod}, chest at 0.5 m`));
  x += W + 12;
  const nrm = await render({ op, rig: 'studio', pose: 'apose', preset: 'epic', debug: 'normals', lod: 'source', view: { turnaround: TURNAROUND[1], radius: 5.5 }, size: [W, H], frames: 20 });
  const mid = await render({ op, rig: 'studio', pose: 'apose', preset: 'epic', debug: 'matid', lod: 'source', view: { turnaround: TURNAROUND[1], radius: 5.5 }, size: [W, H], frames: 20 });
  items.push({ type: 'image', src: nrm, x, y: 100, w: W, h: H, border: '#2c3f4a' }, label(x + 8, 100 + H + 6, 'Normals (bind space)'));
  x += W + 12;
  items.push({ type: 'image', src: mid, x, y: 100, w: W, h: H, border: '#2c3f4a' }, label(x + 8, 100 + H + 6, 'Material IDs'));
  // fix round 2 (item 8): the measured texture sets, KTX2 sizes and VRAM per LOD (step 10 / A79 report.json)
  const repFile = path.join(OUT_DIR, op, 'export', 'report.json');
  const lines = [];
  if (existsSync(repFile)) {
    const r = JSON.parse(readFileSync(repFile, 'utf8'));
    for (const [lod, e] of Object.entries(r.lods ?? {})) {
      const sets = (e.materialNames ?? []).filter((n) => !/glow$/.test(n)).map((n) => n.replace(`${op}-${lod}-`, ''));
      const sizes = [...new Set((e.textures ?? []).map((t) => t.size))].sort((a, b) => b - a).join(' / ');
      const k = e.ktx2;
      lines.push(`${lod}: ${(e.triangles ?? 0).toLocaleString()} tris, ${e.draws ?? '?'} draws; ${sets.length} texture sets (${sets.join(', ')}), albedo / normal / ORM each, ${sizes} px; KTX2 UASTC + Zstd ${k ? `${k.diskMB} MB on disk, VRAM ${k.vramMB.bc7} MB as BC7 / ASTC (RGBA8 fallback ${k.vramMB.rgba8Fallback} MB), GLB ${k.glbMB} MB` : 'not packed'}.`);
    }
  } else lines.push('No report.json yet (npm run operators:lods).');
  items.push({ type: 'text', x: 12, y: 100 + H + 36, size: 15, color: T.dim, maxWidth: x + W - 12, text: `Textures and costs, measured (build/operators/${op}/export/report.json):\n${lines.join('\n')}` });
  save(op, 'sheet-wireframe', await sheet({ width: x + W + 12, height: 100 + H + 70 + lines.length * 21 + 30, items }, 0.88));
}

async function colourblind(op) {
  const W = 480, H = 480;
  const src = await render({ op, rig: 'dark', pose: 'idle', preset: 'epic', view: { joint: ['head', [0, 0.03, 0.08]], radius: 0.6, yaw: 0.15, pitch: 0.02 }, size: [W, H], frames: 40 });
  const kinds = Object.keys(COLOUR_BLIND);
  const items = titleBar(op, 'Colour-blind simulation of the goggle glow', W * kinds.length + 12 * (kinds.length + 1), 'Machado 2009 matrices, severity 1.0. Top: the built goggle lens glow as rendered in full darkness (its spill light never lights her). Bottom: swatches against Hollowmere sodium light and moon.');
  kinds.forEach((k, i) => {
    items.push({ type: 'image', src, x: 12 + i * (W + 12), y: 100, w: W, h: H, filter: COLOUR_BLIND[k], border: '#2c3f4a' }, label(20 + i * (W + 12), 100 + H + 6, k));
  });
  let y = 100 + H + 52;
  const all = [...GLOWS.map((g) => ({ ...g, kind: 'glow' })), ...REFERENCE_LIGHTS.map((g) => ({ ...g, kind: 'ref' }))];
  all.forEach((g, r) => {
    items.push(label(20, y + r * 70 + 18, `${g.label}${g.kind === 'ref' ? ' (reference)' : ' glow'}`, 15));
    kinds.forEach((k, i) => {
      const c = simulate(k, g.rgb).map((v) => Math.round(255 * v ** (1 / 2.2)));
      items.push({ type: 'swatch', x: 12 + i * (W + 12) + 280, y: y + r * 70 + 28, r: 24, color: `rgb(${c.join(',')})` });
    });
  });
  save(op, 'sheet-colourblind', await sheet({ width: W * kinds.length + 12 * (kinds.length + 1), height: y + all.length * 70 + 20, items }, 0.9));
}

// Step 11: the rim-light silhouette (ART-DIRECTION 2: head with optic, the plate's shoulder line and slim straps, the
// thigh holster and sleeves, the narrow belt) - back rims only, no front light
async function rim(op) {
  const W = 900, H = 1300;
  const views = [{ name: 'Front', yaw: 0 }, { name: '3/4 front', yaw: 0.75 }, { name: 'Side', yaw: Math.PI / 2 }, { name: '3/4 back', yaw: 2.4 }];
  const items = titleBar(op, 'Rim-light silhouette', W * views.length + 12 * (views.length + 1), 'Hero LOD. Two back rims, no front light, a faint ambient; the goggle lenses glow, their spill light is off for this sheet: the identity read in near-darkness (ART-DIRECTION 2, render check 1). Rims: two flat side rims from behind and one from above behind. Under each view her own pixels (operator mask): sRGB luma median / p90.');
  for (const [i, v] of views.entries()) {
    const src = await render({ op, rig: 'rim', pose: 'idle', preset: 'epic', lod: 'hero', view: { target: [0, 0.86, 0], radius: 3.4, yaw: v.yaw, pitch: 0.03 }, size: [W, H], frames: 40 });
    const st = await figureStats(src, await maskOf());
    const x = 12 + i * (W + 12);
    items.push({ type: 'image', src, x, y: 100, w: W, h: H, border: '#2c3f4a' }, label(x + 8, 100 + H + 6, `${v.name} - median ${st.p50}, p90 ${st.p90}`));
  }
  save(op, 'sheet-rim-silhouette', await sheet({ width: W * views.length + 12 * (views.length + 1), height: 100 + H + 40, items }, 0.9));
}

// Step 11: the goggle in use (Lab, calibrated close-up and full darkness) and stowed. The Lab model is the in-use build
// (the stowed pose is a Blender-only variant, A29): the stowed panels are the step 09 chain's Cycles renders, labelled.
async function goggle(op) {
  const W = 1280, H = 860;
  const a = await render({ op, rig: 'detail', pose: 'apose', preset: 'epic', lod: 'source', view: { closeup: 'head' }, size: [W * 2, H * 2], frames: 40 });
  const b = await render({ op, rig: 'dark', pose: 'apose', preset: 'epic', lod: 'source', view: { closeup: 'head' }, size: [W * 2, H * 2], frames: 40 });
  const tests = path.join(ROOT, 'docs', 'operators', 'mockups', 'tests');
  const stowed = [`${op}-head_kit-h-closeup-goggle-stowed.webp`, `${op}-head_kit-j-closeup-stowed-side.webp`].map((f) => path.join(tests, f)).filter((f) => existsSync(f));
  const items = [
    ...titleBar(op, 'Goggle in use and stowed', W * 2 + 36, 'Top: in use, Lab (calibrated close-up light; full darkness, glow only). Bottom: stowed on the brow (D19, A29), Cycles renders from the head-kit build (render_garment_test.py), not the Lab.'),
    { type: 'image', src: a, x: 12, y: 100, w: W, h: H, border: '#2c3f4a' }, label(20, 100 + H + 6, 'In use, close-up light (Lab)'),
    { type: 'image', src: b, x: W + 24, y: 100, w: W, h: H, border: '#2c3f4a' }, label(W + 32, 100 + H + 6, 'In use, full darkness: glow only (Lab)'),
  ];
  for (const [i, f] of stowed.entries()) {
    items.push({ type: 'image', src: fileUrl(f), x: 12 + i * (W + 12), y: 140 + H, w: W, h: H, border: '#2c3f4a', fit: 'contain' }, label(20 + i * (W + 12), 140 + 2 * H + 6, `Stowed, Cycles: ${path.basename(f)}`));
  }
  save(op, 'sheet-goggle', await sheet({ width: W * 2 + 36, height: 180 + 2 * H + 40, items }, 0.9));
}

// Fix round 2 (item 7): why the turnaround's back reads lighter than its front. Her masked torso / leg medians under
// 'figure', front and back, with one Lab feature switched off at a time (printed, no sheet).
async function diag(op) {
  const variants = [
    ['baseline', ''],
    ['no shadows', 'for (const li of l.scene.lights) li.shadowEnabled = false;'],
    ['no sheen', 'for (const m of l.scene.materials) if (m.sheen) m.sheen.isEnabled = false;'],
    ['no normal maps', 'for (const m of l.scene.materials) if (m.bumpTexture) m.bumpTexture = null;'],
    ['no environment', 'l.scene.environmentTexture = null;'],
    ['no ambient', 'l.scene.lights.find((x) => x.name === "hemi").setEnabled(false);'],
    ['shadow bias 0.004', 'for (const li of l.scene.lights) { const g = li.getShadowGenerator && li.getShadowGenerator(); if (g) g.bias = 0.004; }'],
    ['shadow normal bias 0.05', 'for (const li of l.scene.lights) { const g = li.getShadowGenerator && li.getShadowGenerator(); if (g) g.normalBias = 0.05; }'],
    ['shadow no PCF', 'for (const li of l.scene.lights) { const g = li.getShadowGenerator && li.getShadowGenerator(); if (g) g.usePercentageCloserFiltering = false; }'],
  ];
  for (const lod of (process.env.DIAG_LODS ?? 'hero,source').split(',')) {
    for (const [name, code] of variants) {
      const out = [];
      for (const v of [TURNAROUND[0], TURNAROUND[4]]) {
        await page.evaluate(async ({ o, lod }) => { const l = window.__lab; l.state.lod = lod; await l.load(o); l.scene.lights.find((x) => x.name === 'hemi').setEnabled(true); l.setPreset('epic'); l.setRig('studio'); }, { o: op, lod });
        await render({ op, rig: 'figure', pose: 'apose', preset: 'epic', lod, view: { turnaround: v, radius: 6.2 }, size: [560, 780], frames: 4 });
        const src = await page.evaluate(async (c) => { const l = window.__lab; new Function('l', c)(l); await l.frames(20); return l.canvas.toDataURL('image/png'); }, code);
        const mask = await maskOf();
        const t = await figureStats(src, mask, [0.18, 0.42]), g = await figureStats(src, mask, [0.55, 0.92]);
        out.push(`${v.label}: torso ${t.p50} legs ${g.p50}`);
      }
      console.log(`  diag ${lod} ${name}: ${out.join(' | ')}`);
    }
  }
}

const runners = { turnaround, closeups, menu, context, compare, lods, wire, colourblind, rim, goggle, diag };
for (const op of operators.length ? operators : ['wren', 'moth']) {
  const built = existsSync(path.join(OUT_DIR, op, `${op}-lab.glb`));
  if (!built) { skipped.push(`${op}: not built (no ${op}-lab.glb)`); console.log(`operator-sheet: ${op} is not built yet, skipped`); continue; }
  console.log(`operator-sheet: ${op}`);
  for (const name of only) await runners[name](op);
}

await browser.close();
killServer();
console.log(`operator-sheet: ${written.length} sheets written`);
if (skipped.length) console.log(`operator-sheet: skipped\n  ${skipped.join('\n  ')}`);
if (errors.length) { console.log(`operator-sheet: ${errors.length} console errors, first:\n  ${errors[0]}`); process.exitCode = 1; }
