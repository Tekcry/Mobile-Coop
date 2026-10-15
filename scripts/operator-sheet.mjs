// npm run operators:sheet [wren|moth] [--only turnaround,closeups,menu,context,compare,lods,wire,colourblind] [--no-build]
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
const { CLOSEUPS, TURNAROUND, GLOWS, REFERENCE_LIGHTS, COLOUR_BLIND, calloutsFor, simulate } = await import('../src/operators/lab/labData.ts');

const argv = process.argv.slice(2);
const operators = argv.filter((a) => !a.startsWith('-') && ['wren', 'moth'].includes(a));
const onlyArg = argv.find((a) => a.startsWith('--only='))?.split('=')[1] ?? (argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : '');
const ALL = ['turnaround', 'closeups', 'menu', 'context', 'compare', 'lods', 'wire', 'colourblind'];
const only = onlyArg ? onlyArg.split(',') : ALL;
const PORT = Number(process.env.E2E_PORT ?? 4191);
const BASE = `http://127.0.0.1:${PORT}`;
const DEST_ROOT = path.join(ROOT, 'docs', 'operators', 'mockups');
const skipped = [];
const written = [];

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
  return ids;
};

const T = { title: '#e8eef0', dim: '#7f9aa3', text: '#cfd8dc', warn: '#d9a441' };
const titleBar = (op, title, w, note = '') => [
  { type: 'text', x: 24, y: 14, size: 26, weight: '600', color: T.title, text: `${op.toUpperCase()} - ${title}` },
  { type: 'text', x: 24, y: 48, size: 14, color: T.dim, maxWidth: w - 48, text: `${note}${note ? '   ' : ''}Lab render, ${GPU ? 'hardware GPU' : 'SOFTWARE GL (not a GPU result)'}: ${gpuName}. ${new Date().toISOString().slice(0, 10)}.` },
];
const label = (x, y, text, size = 15, color = T.text) => ({ type: 'text', x, y, size, color, text });

// ---- the sheets ----
async function turnaround(op) {
  const tw = 560, th = 780, gap = 12, top = 90;
  const items = titleBar(op, 'Turnaround at Epic, hero LOD, neutral light', tw * 5 + gap * 6, 'Top: orthographic. Bottom: perspective, 50 mm equivalent. Grey figure: 1.75 m human at real proportions; bar ticks every 0.25 m.');
  let row = 0;
  for (const ortho of [true, false]) {
    let col = 0;
    for (const v of TURNAROUND) {
      const src = await render({ op, rig: 'studio', pose: 'apose', preset: 'epic', ortho, silhouette: true, view: { turnaround: v, radius: ortho ? 4.2 : 6.2 }, size: [tw, th], frames: 30 });
      const x = gap + col * (tw + gap), y = top + row * (th + 34);
      items.push({ type: 'image', src, x, y, w: tw, h: th, border: '#2c3f4a' });
      items.push(label(x + 8, y + th + 6, `${v.label} - ${ortho ? 'orthographic' : 'perspective 50 mm'}`));
      col++;
    }
    row++;
  }
  save(op, 'sheet-turnaround', await sheet({ width: tw * 5 + gap * 6, height: top + 2 * (th + 34) + 10, items }, 0.88));
}

async function closeups(op) {
  const kit = KITS[op];
  const built = builtKit(op);
  const W = 1920, H = 1080, panel = 520;
  for (const c of CLOSEUPS) {
    if (c.id === 'harness' && op !== 'moth') continue;
    const src = await render({ op, rig: 'raking', pose: 'apose', preset: 'epic', view: { closeup: c.id }, size: [3840, 2160], frames: 40 });
    const here = calloutsFor(kit.items, built, c);
    const zone = kit.items.filter((i) => c.zones.includes(i.zone) && (c.match.length === 0 || c.match.some((m) => `${i.where} ${i.name}`.toLowerCase().includes(m))));
    const pending = zone.filter((i) => !built.has(i.id));
    const items = [
      ...titleBar(op, `Close-up: ${c.label}`, W + panel, `Raking light, ${c.distance} m, 4K source scaled to ${W}x${H}.`),
      { type: 'image', src, x: 0, y: 90, w: W, h: H, border: '#2c3f4a' },
      { type: 'rect', x: W, y: 90, w: panel, h: H, color: '#0b0f11' },
    ];
    let y = 106;
    items.push({ type: 'text', x: W + 16, y, size: 17, weight: '600', color: T.title, text: 'What is visible' });
    y += 32;
    if (!here.length) {
      items.push({ type: 'text', x: W + 16, y, size: 14, color: T.dim, maxWidth: panel - 32, text: 'Nothing of the kit is built in this view yet: the bare mannequin body shows.' });
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
    save(op, `sheet-closeup-${c.id}`, await sheet({ width: W + panel, height: H + 100, items }, 0.86));
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
    ...titleBar(op, 'In context: Hollowmere night and full darkness', 2600, 'Left: crouched in shadow at 5 m, sodium orange against blue moon. Right: full darkness at 20 m, the identity test: silhouette and goggle glow only (the glow is a stand-in until the head kit exists).'),
    { type: 'image', src: a, x: 12, y: 100, w: W, h: H, border: '#2c3f4a' }, label(20, 100 + H + 6, 'Hollowmere night, crouched, 5 m'),
    { type: 'image', src: b, x: W + 24, y: 100, w: W, h: H, border: '#2c3f4a' }, label(W + 32, 100 + H + 6, 'Full darkness, 20 m'),
  ];
  save(op, 'sheet-context', await sheet({ width: W * 2 + 36, height: 100 + H + 40, items }, 0.88));
}

async function compare(op) {
  const W = 1000, H = 900;
  const ba = await render({ op, rig: 'studio', pose: 'idle', preset: 'epic', gameRig: true, offsets: [-0.6, 0.6], view: { target: [0, 0.9, 0], radius: 5.6, yaw: 0.2, pitch: 0.04 }, size: [W, H], frames: 30 });
  const items = [
    ...titleBar(op, 'Before / after: the new operator beside the current game operator', W * 2 + 36, 'The current operator is the game rig built in the Lab (flat-colour parts), read-only.'),
    { type: 'image', src: ba, x: 12, y: 100, w: W, h: H, border: '#2c3f4a' }, label(20, 100 + H + 6, `${op} (left)  |  current game operator (right)`),
  ];
  const other = op === 'wren' ? 'moth' : 'wren';
  const otherBuilt = existsSync(path.join(OUT_DIR, other, `${other}-lab.glb`));
  items.push({ type: 'rect', x: W + 24, y: 100, w: W, h: H, color: '#0b0f11' });
  items.push({ type: 'text', x: W + 44, y: 120, size: 17, color: otherBuilt ? T.text : T.warn, maxWidth: W - 40, text: otherBuilt ? `${other} is built: the two-operator frame is rendered by the sheet run that has both.` : `${other} is not built yet (see PLAN.md), so the two-operator frame waits. This tile will hold ${op} and ${other} side by side in one frame once both exist.` });
  save(op, 'sheet-compare', await sheet({ width: W * 2 + 36, height: 100 + H + 40, items }, 0.88));
  if (!otherBuilt) skipped.push(`${op}: both operators side by side (${other} not built)`);
}

async function lods(op) {
  const lodList = await page.evaluate(async (o) => { const l = window.__lab; if (l.loadedId !== o) await l.load(o); return l.lods; }, op);
  const W = 520, H = 820;
  const cols = [];
  for (const lod of lodList) cols.push({ lod, preset: lod === 'phone' ? 'phone' : 'epic', name: lod === 'hero' ? 'Hero LOD, Epic' : lod === 'phone' ? 'Phone LOD, phone look' : `In-game ${lod}` });
  cols.push({ lod: 'hero', preset: 'phone', name: 'Hero mesh, phone look (render only)' });
  const items = titleBar(op, 'Each in-game LOD and the phone look at gameplay distance (7 m)', W * cols.length + 12 * (cols.length + 1), `LODs built so far: ${lodList.join(', ')}. In-game LODs 1-2 and the phone LOD arrive in step 10.`);
  for (let i = 0; i < cols.length; i++) {
    const src = await render({ op, rig: 'hollowmere', pose: 'sneak', preset: cols[i].preset, lod: cols[i].lod, view: { target: [0, 0.9, 0], radius: 7, yaw: 0.5, pitch: 0.08 }, size: [W, H], frames: 40 });
    items.push({ type: 'image', src, x: 12 + i * (W + 12), y: 100, w: W, h: H, border: '#2c3f4a' }, label(20 + i * (W + 12), 100 + H + 6, cols[i].name));
  }
  save(op, 'sheet-lods', await sheet({ width: W * cols.length + 12 * (cols.length + 1), height: 100 + H + 40, items }, 0.88));
  if (lodList.length === 1) skipped.push(`${op}: in-game LOD 1, LOD 2 and phone LOD (step 10)`);
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
  const close = await render({ op, rig: 'studio', pose: 'apose', preset: 'epic', debug: 'wire', lod: 'hero', view: { joint: ['chest', [0, 0.02, 0.1]], radius: 0.5, yaw: 0.3, pitch: 0.05 }, size: [W, H], frames: 30 });
  items.push({ type: 'image', src: close, x, y: 100, w: W, h: H, border: '#2c3f4a' }, label(x + 8, 100 + H + 6, 'Wireframe, chest at 0.5 m'));
  x += W + 12;
  const nrm = await render({ op, rig: 'studio', pose: 'apose', preset: 'epic', debug: 'normals', lod: 'hero', view: { turnaround: TURNAROUND[1], radius: 5.5 }, size: [W, H], frames: 20 });
  const mid = await render({ op, rig: 'studio', pose: 'apose', preset: 'epic', debug: 'matid', lod: 'hero', view: { turnaround: TURNAROUND[1], radius: 5.5 }, size: [W, H], frames: 20 });
  items.push({ type: 'image', src: nrm, x, y: 100, w: W, h: H, border: '#2c3f4a' }, label(x + 8, 100 + H + 6, 'Normals (bind space)'));
  x += W + 12;
  items.push({ type: 'image', src: mid, x, y: 100, w: W, h: H, border: '#2c3f4a' }, label(x + 8, 100 + H + 6, 'Material IDs'));
  items.push(label(12, 100 + H + 40, `Textures: ${stats[0]?.textures ?? 'n/a'}. Costs and budgets are measured in step 10.`, 15, T.dim));
  save(op, 'sheet-wireframe', await sheet({ width: x + W + 12, height: 100 + H + 80, items }, 0.88));
}

async function colourblind(op) {
  const W = 480, H = 480;
  const src = await render({ op, rig: 'dark', pose: 'idle', preset: 'epic', view: { joint: ['head', [0, 0.03, 0.08]], radius: 0.6, yaw: 0.15, pitch: 0.02 }, size: [W, H], frames: 40 });
  const kinds = Object.keys(COLOUR_BLIND);
  const items = titleBar(op, 'Colour-blind simulation of the goggle glow', W * kinds.length + 12 * (kinds.length + 1), 'Machado 2009 matrices, severity 1.0. Top: the glow as rendered (stand-in housing until the head kit exists). Bottom: swatches against Hollowmere sodium light and moon.');
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

const runners = { turnaround, closeups, menu, context, compare, lods, wire, colourblind };
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
