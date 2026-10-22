// (mocap-trial) Mocap side-by-side proof sheets: the same scenario driven twice, `?mocap=0` (the hand-keyed set) and
// `?mocap=1` (the CMU mocap set), sim-time stepped (`loop.manual`, `stepHeadless`) so both runs show Wren at the same sim
// times, each frame shot from three cameras (side, front, 3/4) that follow her (the turns: fixed to her start heading).
//   E2E_GPU=1 E2E_PORT=4192 node scripts/mocap-sheets.mjs [--rows=walk,jog,...] [--views=side,front,34] [--frames=10]
//     [--fps=30] [--out=docs/mocap-trial/sheets] [--gfx=high] [--no-video] [--keep-frames] [--note=<text>] [--url=http://127.0.0.1:4192/]
// Rows: walk (1.4 m/s), jog (2.5), run (4.0) straight over one gait cycle (the hand-keyed run's cycle, measured);
// turn90walk, turn90jog (stick swung 90 deg right), turn180walk (stick reversed), start (standing -> walk), stop (walk ->
// release). Writes <out>/<row>-{side,front,34}.png (the mocap=0 strip above the mocap=1 strip, same sim times),
// <out>/<row>.webm (3 views x 2 sets, looped / held), <out>/sheets.json (per row: the commit, the per-frame pixel diff
// mocap=1 vs mocap=0) and <out>/index.md (generated from sheets.json; a partial --rows run keeps the other rows).
// Serves dist/ itself (vite preview on E2E_PORT) when nothing answers: run `npm run build` first. Headless only.
import { chromium } from 'playwright-core';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { launchOptions, fakePointerLock, openPage, waitOperator, frames, GPU } from './e2e-lib.mjs';

const ARGS = Object.fromEntries(process.argv.slice(2).map((a) => { const m = /^--([^=]+)(?:=(.*))?$/.exec(a); return m ? [m[1], m[2] ?? '1'] : [a, '1']; }));
const PORT = process.env.E2E_PORT ?? '4173';
const url = ARGS.url ?? process.env.URL ?? `http://127.0.0.1:${PORT}/`;
const OUT = ARGS.out ?? 'docs/mocap-trial/sheets';
const NF = Number(ARGS.frames ?? 10);
const FPS = Number(ARGS.fps ?? 30);
const GFX = ARGS.gfx ?? 'high';
const VIDEO = !ARGS['no-video'];
const KEEP = !!ARGS['keep-frames']; // also write every raw frame to test-results/mocap-sheets/<row>/m<m>-<view>-<step>.png
const FFMPEG = process.env.FFMPEG ?? [
  'C:/Users/Micha/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe',
].find((p) => existsSync(p)) ?? 'ffmpeg';
const VIEWS = (ARGS.views ?? 'side,front,34').split(',');
const STEP = 1 / 60; // the sim's fixed step (core/loop.ts FIXED_DT): every capture time is a whole number of steps

// stick magnitudes for the asked speeds (player/speedGears.ts stickMagFor, config/movement.ts GEARS / STICK_SPEED:
// standing 1.4 = the sneak point at 0.45 of the travel, 2.5 between the walk 2.1 (0.8) and the jog 3.0 (0.9), 4.0 the run)
const DEAD = 0.05;
const mag = (u) => DEAD + (1 - DEAD) * u;
const W = mag(0.45);
const J = mag(0.8 + 0.1 * ((2.5 - 2.1) / (3.0 - 2.1)));
const R = 1;

/** Rows: `cycle` rows capture one gait cycle (mocap=0's, measured in the warm-up) at a steady stick; `event` rows switch
 *  the stick from `preIn` to `ev` at t = 0 and capture `win` s. `fix`: the cameras keep the start heading. */
const ROWS = {
  walk: { what: 'walk 1.4 m/s straight, one cycle', kind: 'cycle', pos: [0, -14], pre: 2.5, preIn: { y: W } },
  jog: { what: 'jog 2.5 m/s straight, one cycle', kind: 'cycle', pos: [-8, -14], pre: 2.0, preIn: { y: J } },
  run: { what: 'run 4.0 m/s straight, one cycle', kind: 'cycle', pos: [-16, -14], pre: 1.6, preIn: { y: R } },
  turn90walk: { what: '90 deg turn right at a walk (1.4 m/s; stick swung 90 deg at t = 0)', kind: 'event', pos: [0, -14], pre: 2.0, preIn: { y: W }, ev: { x: W }, win: 1.5, fix: true },
  turn90jog: { what: '90 deg turn right at a jog (2.5 m/s; stick swung 90 deg at t = 0)', kind: 'event', pos: [-8, -14], pre: 1.5, preIn: { y: J }, ev: { x: J }, win: 1.2, fix: true },
  turn180walk: { what: '180 deg turn at a walk (1.4 m/s; stick reversed at t = 0)', kind: 'event', pos: [0, -14], pre: 2.0, preIn: { y: W }, ev: { y: -W }, win: 1.8, fix: true },
  start: { what: 'start from standing to a walk (stick to 1.4 m/s at t = 0)', kind: 'event', pos: [0, -14], pre: 1.0, preIn: {}, ev: { y: W }, win: 1.2 },
  stop: { what: 'stop from a walk (1.4 m/s; stick released at t = 0)', kind: 'event', pos: [0, -14], pre: 2.5, preIn: { y: W }, ev: {}, win: 1.4 },
};
const rowNames = (ARGS.rows ?? Object.keys(ROWS).join(',')).split(',');
for (const r of rowNames) if (!ROWS[r]) throw new Error(`unknown row ${r} (rows: ${Object.keys(ROWS).join(', ')})`);
for (const v of VIEWS) if (!['side', 'front', '34'].includes(v)) throw new Error(`unknown view ${v}`);
if (!GPU) console.warn('mocap-sheets: E2E_GPU is not 1 (software GL): fine for a dry run, not a visual result');

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const COMMIT = git('rev-parse', '--short', 'HEAD');
const DIRTY_SRC = git('status', '--porcelain', '--', 'src') !== '';

// ---------------------------------------------------------------- server (only when nothing answers)
let server = null;
const up = async () => { try { return (await fetch(url)).ok; } catch { return false; } };
if (!(await up())) {
  if (ARGS.url) throw new Error(`${url} is not reachable`);
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', PORT, '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
  process.on('exit', () => server?.kill());
  let ok = false;
  for (let i = 0; i < 60 && !ok; i++) { await new Promise((r) => setTimeout(r, 250)); ok = await up(); }
  if (!ok) { server.kill(); console.error('mocap-sheets: preview server did not start (run `npm run build` first)'); process.exit(2); }
}

/** A seeded Math.random in every page (both runs draw the same "random" numbers). */
function seededRandom() {
  let s = 0x9e3779b9;
  Math.random = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * One run: boot Proving with `?mocap=<m>`, warm up, then step to each capture step (whole sim steps from t = 0) and
 * shoot every view. `period` (cycle rows, mocap=1): mocap=0's measured cycle in steps. Returns the frames and labels.
 */
async function capture(rowName, m, captureSteps, measure) {
  const row = ROWS[rowName];
  const lo = launchOptions();
  const browser = await chromium.launch(lo);
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 640 } });
    await ctx.addInitScript(fakePointerLock);
    await ctx.addInitScript(seededRandom);
    const { page, errors } = await openPage(ctx, url, `autostart=proving&mocap=${m}&gfx=${GFX}`);
    await page.waitForFunction(() => window.__app.current?.player, null, { timeout: 300000 });
    if ((await waitOperator(page)) < 0) throw new Error('Wren not loaded (LOD0 never reached the screen within 120 s)');
    await page.addStyleTag({ content: 'body > :not(#game), .hud, .screens, .toasts, .toast { display: none !important; }' });
    // steady renders: no frame governor, no dynamic resolution, no TAAU (the gfx preset's AA is FXAA, no motion blur)
    await page.evaluate(() => window.__app.settings.update((s) => { s.video.adaptive = false; s.video.dynamicRes = false; s.video.upscaler = 'off'; }));
    await frames(page, 10);
    await page.evaluate(({ pos, yaw, fix }) => {
      const a = window.__app;
      const g = a.current;
      const p = g.player;
      a.loop.manual = true;
      // the range's training dummies hidden: the strafing ones move on the real-time frames before manual mode, so they
      // stood in a different place in each run (the only pixels that differed in the first placeholder trial)
      for (const d of g.dummies ?? []) d.rig.root.setEnabled(false);
      const V = p.controller.pos.constructor;
      p.controller.teleport(new V(pos[0], 0, pos[1]), yaw);
      p.cam.yaw = yaw;
      p.cam.pitch = 0;
      // the graph's idle clock (the standing idle's 12 s cycle, the ready stance) counts the real-time frames of the boot
      // too: zeroed so both runs stand in the same idle pose (the start and stop rows differed there)
      if (p.rig.graph && 'idleT' in p.rig.graph) p.rig.graph.idleT = 0;
      window.__camHold = true;
      window.__view = 'side';
      // the sheet cameras (anim-sheet.mjs's side / front / front34 framings), following her root
      const place = () => {
        const v = window.__view;
        const c = p.cam.camera;
        const r = p.rig.root.position;
        const fy = fix ? yaw : p.controller.renderYaw;
        const fx = Math.sin(fy);
        const fz = Math.cos(fy);
        const D = 3;
        const off = v === 'front' ? [fx * D, fz * D] : v === '34' ? [(fx + fz) * D * 0.7071, (fz - fx) * D * 0.7071] : [fz * D * 1.033, -fx * D * 1.033];
        c.position.set(r.x + off[0], r.y + 1.05, r.z + off[1]);
        c.setTarget(new r.constructor(r.x + fx * 0.15, r.y + 0.85, r.z + fz * 0.15));
      };
      window.__place = place;
      const origUpdate = p.cam.update.bind(p.cam);
      p.cam.update = (dt, feet, crouch) => { origUpdate(dt, feet, crouch); place(); };
      // n sim steps with the stick at `inp` (world-fixed: the camera yaw the stick reads is held at the start heading)
      window.__steps = (n, inp) => {
        const s = a.input.state;
        const r = p.rig;
        const ph = [];
        for (let i = 0; i < n; i++) {
          s.move.x = inp.x ?? 0;
          s.move.y = inp.y ?? 0;
          p.cam.yaw = yaw;
          a.loop.stepHeadless(1 / 60, 120);
          ph.push(r.lastTargets ? r.lastTargets.gait.phase : -1);
        }
        return ph;
      };
      a.loop.stepHeadless(0.3);
    }, { pos: row.pos, yaw: Math.PI / 2, fix: !!row.fix });
    // warm-up (pre s at preIn); the phases it logs give the cycle
    const preSteps = Math.round(row.pre / STEP);
    const ph = await page.evaluate(([n, inp]) => window.__steps(n, inp), [preSteps, row.preIn]);
    let period = null;
    if (measure) {
      const wraps = [];
      for (let i = 1; i < ph.length; i++) if (ph[i] < ph[i - 1] - 0.5) wraps.push(i);
      if (wraps.length >= 2) period = wraps[wraps.length - 1] - wraps[wraps.length - 2];
    }
    const steps = captureSteps ?? (() => { throw new Error('no capture plan'); })();
    const plan = typeof steps === 'function' ? steps(period) : steps;
    const shots = [];
    let at = 0;
    const inp = row.ev ?? row.preIn;
    for (const k of plan) {
      if (k > at) await page.evaluate(([n, inp]) => window.__steps(n, inp), [k - at, inp]);
      at = k;
      const info = await page.evaluate(() => {
        const g = window.__app.current;
        const c = g.player.controller;
        const r = g.player.rig;
        const T = r.lastTargets;
        return { state: c.motion.state, speed: c.speed, L: !!r.planner.L.contact, R: !!r.planner.R.contact, phase: T ? T.gait.phase : -1, keyMocap: T?.keyMocap ?? 0, clipFeet: !!T?.clipFeet?.valid };
      });
      const views = {};
      for (const v of VIEWS) {
        await page.evaluate((v) => { window.__view = v; window.__place(); }, v);
        await frames(page, 3);
        const vp = page.viewportSize();
        const w = Math.round(vp.height * 0.75);
        views[v] = await page.screenshot({ clip: { x: Math.round(vp.width / 2 - w / 2), y: 0, width: w, height: vp.height } });
      }
      shots.push({ k, t: k * STEP, info, views });
    }
    const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
    if (real.length) console.log(`  [${rowName} m${m}] page errors:\n  ${real.slice(0, 5).join('\n  ')}`);
    return { shots, period, plan };
  } finally {
    await browser.close();
  }
}

/** The capture steps: the video frames (every 1/FPS s, whole sim steps) and the sheet frames (NF over the window). */
function planFor(row, periodSteps) {
  const winSteps = row.kind === 'cycle' ? periodSteps : Math.round(row.win / STEP);
  const per = Math.max(1, Math.round(1 / FPS / STEP));
  const video = [];
  for (let k = 0; k < winSteps + (row.kind === 'cycle' ? 0 : 1); k += per) video.push(k);
  const sheet = [];
  for (let i = 0; i < NF; i++) sheet.push(row.kind === 'cycle' ? Math.round((i * winSteps) / NF) : Math.round((i * winSteps) / (NF - 1)));
  const all = [...new Set([...video, ...sheet])].sort((a, b) => a - b);
  return { all, video, sheet, winSteps, per };
}

// ---------------------------------------------------------------- composing (canvas in a blank page)
const composer = await chromium.launch(launchOptions());
const cpage = await composer.newPage();
await cpage.setContent('<body></body>');
const b64 = (buf) => `data:image/png;base64,${buf.toString('base64')}`;
const fromData = (d) => Buffer.from(d.split(',')[1], 'base64');

/** Per-pixel diff of two shots (max channel difference 0..255, pixels differing by more than 8, mean). */
const diff = (a, b) => cpage.evaluate(async ([a, b]) => {
  const load = (s) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = s; });
  const [ia, ib] = await Promise.all([load(a), load(b)]);
  const get = (i) => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height).data; };
  const da = get(ia);
  const db = get(ib);
  let max = 0;
  let over = 0;
  let sum = 0;
  for (let p = 0; p < da.length; p += 4) {
    const d = Math.max(Math.abs(da[p] - db[p]), Math.abs(da[p + 1] - db[p + 1]), Math.abs(da[p + 2] - db[p + 2]));
    if (d > max) max = d;
    if (d > 8) over++;
    sum += d;
  }
  return { max, over, mean: sum / (da.length / 4) };
}, [b64(a), b64(b)]);

const label = (s, m) => `t ${s.t.toFixed(2)}s  ${s.info.state} ${s.info.speed.toFixed(2)}  ${s.info.L ? 'L' : '-'}${s.info.R ? 'R' : '-'}  ph ${s.info.phase.toFixed(2)}${m ? `  mc ${s.info.keyMocap.toFixed(2)}${s.info.clipFeet ? ' cf' : ''}` : ''}`;

/** The contact sheet of one view: the mocap=0 strip above the mocap=1 strip. */
const sheet = (title, cells0, cells1, diffs) => cpage.evaluate(async ({ title, cells0, cells1, diffs }) => {
  const load = (s) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = s; });
  const CW = 192, CH = 256, HEAD = 26, BAND = 20;
  const n = cells0.length;
  const c = document.createElement('canvas');
  c.width = n * CW;
  c.height = HEAD + 2 * (BAND + CH);
  const x = c.getContext('2d');
  x.fillStyle = '#111';
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#eee';
  x.font = 'bold 14px monospace';
  x.fillText(title, 6, 18);
  const strip = async (cells, y, name, col) => {
    x.fillStyle = col;
    x.fillRect(0, y, c.width, BAND);
    x.fillStyle = '#000';
    x.font = 'bold 13px monospace';
    x.fillText(name, 6, y + 15);
    for (let i = 0; i < n; i++) {
      const im = await load(cells[i].src);
      x.drawImage(im, i * CW, y + BAND, CW, CH);
      x.font = '10px monospace';
      const lines = cells[i].label.split('  ');
      x.fillStyle = '#000b';
      x.fillRect(i * CW, y + BAND, CW, 12 * lines.length + 4);
      x.fillStyle = '#ddd';
      lines.forEach((l, j) => x.fillText(l, i * CW + 3, y + BAND + 11 + 12 * j));
      if (diffs && y > HEAD) {
        const d = diffs[i];
        x.fillStyle = '#000b';
        x.fillRect(i * CW, y + BAND + CH - 14, CW, 14);
        x.fillStyle = d.max === 0 ? '#7f7' : '#fc6';
        x.fillText(`vs top: max ${d.max}  >8: ${d.over}px`, i * CW + 3, y + BAND + CH - 3);
      }
    }
  };
  await strip(cells0, HEAD, 'mocap=0  hand-keyed (current)', '#9cf');
  await strip(cells1, HEAD + BAND + CH, 'mocap=1  mocap set', '#fc9');
  return c.toDataURL('image/png');
}, { title, cells0, cells1, diffs });

/** One video frame: views across, mocap=0 above mocap=1. */
const vframe = (title, s0, s1) => cpage.evaluate(async ({ title, s0, s1, views }) => {
  const load = (s) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = s; });
  const CW = 240, CH = 320, HEAD = 22;
  const c = document.createElement('canvas');
  c.width = CW * views.length;
  c.height = HEAD + 2 * CH;
  const x = c.getContext('2d');
  x.fillStyle = '#111';
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#eee';
  x.font = 'bold 13px monospace';
  x.fillText(title, 6, 16);
  for (const [j, s, name, col] of [[0, s0, 'mocap=0 hand-keyed', '#9cf'], [1, s1, 'mocap=1 mocap', '#fc9']]) {
    for (let i = 0; i < views.length; i++) {
      const im = await load(s[views[i]]);
      x.drawImage(im, i * CW, HEAD + j * CH, CW, CH);
      x.fillStyle = '#000b';
      x.fillRect(i * CW, HEAD + j * CH, CW, 15);
      x.fillStyle = col;
      x.font = '11px monospace';
      x.fillText(`${name}  ${views[i]}`, i * CW + 3, HEAD + j * CH + 11);
    }
  }
  return c.toDataURL('image/png');
}, { title, s0, s1, views: VIEWS });

// ---------------------------------------------------------------- run
mkdirSync(OUT, { recursive: true });
const jsonPath = join(OUT, 'sheets.json');
const db = existsSync(jsonPath) ? JSON.parse(readFileSync(jsonPath, 'utf8')) : { rows: {} };

function writeIndex() {
  const L = [];
  L.push('# Mocap trial - side-by-side sheets');
  L.push('');
  L.push('Generated by `scripts/mocap-sheets.mjs` (do not edit by hand: rerun it). Each sheet: the `?mocap=0` strip (the');
  L.push('hand-keyed set, the game as it is) above the `?mocap=1` strip (the mocap set), the same sim times frame for frame');
  L.push('(sim-time stepped, `loop.manual`), Proving, `gfx=high`, holstered, standing. Views: `side`, `front`, `34` (front');
  L.push('three-quarter, her right); the turn rows keep the cameras on her start heading. Each cell: sim time, motion state,');
  L.push('speed (m/s), planted feet, gait phase; mocap=1 cells also `mc` (the mocap share of the keyed pose) and `cf` when');
  L.push('clip feet are on; the lower strip prints its pixel difference from the frame above it. The `.webm` per row shows');
  L.push('the 3 views x 2 sets at real speed (the cycle rows loop 3 times; the event rows hold their last frame).');
  L.push('');
  L.push('Rerun (desktop GPU, port 4192, after `npm run build`): `E2E_GPU=1 E2E_PORT=4192 node scripts/mocap-sheets.mjs`');
  L.push('(`--rows=walk,stop` for some rows only; the others keep their entries).');
  L.push('');
  L.push('| Row | What | Sheets | Video | Commit | mocap=1 vs mocap=0 (max channel diff / pixels > 8, worst frame) |');
  L.push('| --- | --- | --- | --- | --- | --- |');
  for (const name of Object.keys(ROWS)) {
    const r = db.rows[name];
    if (!r) { L.push(`| ${name} | ${ROWS[name].what} | not run yet | | | |`); continue; }
    const sheets = r.views.map((v) => `[${v}](${name}-${v}.png)`).join(' ');
    const vid = r.video ? `[webm](${name}.webm)` : '-';
    L.push(`| ${name} | ${r.what} | ${sheets} | ${vid} | ${r.commit}${r.dirtySrc ? ' (+ uncommitted src)' : ''} | ${r.diff.max} / ${r.diff.over} px${r.diff.max === 0 ? ' (identical)' : ''} |`);
  }
  L.push('');
  L.push('## Capture vs old limit (for Michael to judge by eye)');
  L.push('');
  L.push('CT Core (2026-10-22): the capture is not bent to the old limits; keeping or bending it is the orchestrator\'s call.');
  L.push('');
  L.push('- walk: pelvis bob, capture 5.5-6.6 cm vs the bible D2 limit 4 cm (hand-keyed 0.9 cm).');
  L.push('- walk: knee-out, capture 3.5 cm vs the 3.5 cm line.');
  L.push('- run: wrist swing, capture 24 cm vs Michael\'s hand-keyed tune 85 cm.');
  L.push('');
  L.push('## Identity check');
  const runs = Object.values(db.rows);
  const notes = [...new Set(runs.map((r) => r.note).filter(Boolean))];
  for (const n of notes) L.push(n);
  if (!notes.length) L.push('Not run yet.');
  L.push('');
  L.push('Per row: the cycle (mocap=0 measured / mocap=1 measured, sim steps of 1/60 s) and the mocap share seen in the');
  L.push('mocap=1 run (max `mc`).');
  L.push('');
  for (const name of Object.keys(ROWS)) {
    const r = db.rows[name];
    if (r) L.push(`- ${name}: ${r.kind === 'cycle' ? `cycle ${r.period0} / ${r.period1} steps, ` : ''}window ${(r.winSteps * STEP).toFixed(2)} s, ${r.sheetFrames} sheet frames, ${r.videoFrames} video frames; mc max ${r.mcMax.toFixed(2)}${r.clipFeet ? ', clip feet on' : ''}; worst pixel diff ${r.diff.max} (${r.diff.worst})`);
  }
  L.push('');
  writeFileSync(join(OUT, 'index.md'), L.join('\n'));
}

const NOTE = ARGS.note ?? null;
try {
  for (const name of rowNames) {
    const row = ROWS[name];
    const t0 = Date.now();
    console.log(`${name}: mocap=0 ...`);
    // mocap=0 first: its measured cycle sets the window for both runs
    let plan = null;
    const r0 = await capture(name, 0, (period) => {
      if (row.kind === 'cycle' && !period) throw new Error(`${name}: no gait cycle measured in the warm-up`);
      plan = planFor(row, period);
      return plan.all;
    }, row.kind === 'cycle');
    console.log(`${name}: mocap=1 ...`);
    const r1 = await capture(name, 1, plan.all, row.kind === 'cycle');
    // diffs per view per sheet frame (and the worst over every captured frame)
    const diffs = {};
    let worst = { max: -1, over: 0, where: '' };
    for (const v of VIEWS) {
      diffs[v] = [];
      for (let i = 0; i < r0.shots.length; i++) {
        const d = await diff(r0.shots[i].views[v], r1.shots[i].views[v]);
        if (plan.sheet.includes(r0.shots[i].k)) diffs[v].push(d);
        if (d.max > worst.max || (d.max === worst.max && d.over > worst.over)) worst = { ...d, where: `${v} t ${r0.shots[i].t.toFixed(2)}s` };
      }
    }
    if (KEEP) {
      const kd = join('test-results', 'mocap-sheets', name);
      mkdirSync(kd, { recursive: true });
      for (const [m, r] of [[0, r0], [1, r1]]) for (const s of r.shots) for (const v of VIEWS) writeFileSync(join(kd, `m${m}-${v}-${String(s.k).padStart(3, '0')}.png`), s.views[v]);
    }
    const pick = (r) => plan.sheet.map((k) => r.shots.find((s) => s.k === k));
    for (const v of VIEWS) {
      const c0 = pick(r0).map((s) => ({ src: b64(s.views[v]), label: label(s, false) }));
      const c1 = pick(r1).map((s) => ({ src: b64(s.views[v]), label: label(s, true) }));
      const title = `${name} - ${v} - ${row.what} - commit ${COMMIT}${DIRTY_SRC ? '+' : ''}`;
      writeFileSync(join(OUT, `${name}-${v}.png`), fromData(await sheet(title, c0, c1, diffs[v])));
    }
    let video = false;
    if (VIDEO) {
      const dir = join('test-results', 'mocap-sheets', 'video', name);
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(dir, { recursive: true });
      const vf = [];
      for (const k of plan.video) {
        const s0 = r0.shots.find((s) => s.k === k);
        const s1 = r1.shots.find((s) => s.k === k);
        const f = join(dir, `src-${String(vf.length).padStart(4, '0')}.png`);
        const toB = (s) => Object.fromEntries(VIEWS.map((v) => [v, b64(s.views[v])]));
        writeFileSync(f, fromData(await vframe(`${name}  t ${s0.t.toFixed(2)}s  commit ${COMMIT}`, toB(s0), toB(s1))));
        vf.push(f);
      }
      // the cycle rows loop 3 times, the event rows hold their last frame 0.6 s
      const seq = row.kind === 'cycle' ? [...vf, ...vf, ...vf] : [...vf, ...Array(Math.round(0.6 * FPS)).fill(vf[vf.length - 1])];
      seq.forEach((f, i) => copyFileSync(f, join(dir, `seq-${String(i).padStart(4, '0')}.png`)));
      const res = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(dir, 'seq-%04d.png'), '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0', '-pix_fmt', 'yuv420p', '-an', join(OUT, `${name}.webm`)], { windowsHide: true, encoding: 'utf8', timeout: 300000 });
      if (res.status === 0) video = true;
      else console.log(`  ${name}: ffmpeg failed: ${res.error ?? res.stderr}`);
    }
    const all1 = r1.shots.map((s) => s.info);
    db.rows[name] = {
      what: row.what, kind: row.kind, commit: COMMIT, dirtySrc: DIRTY_SRC, views: VIEWS, video,
      period0: r0.period, period1: r1.period, winSteps: plan.winSteps, sheetFrames: plan.sheet.length, videoFrames: plan.video.length,
      mcMax: Math.max(...all1.map((i) => i.keyMocap)), clipFeet: all1.some((i) => i.clipFeet),
      diff: { max: worst.max, over: worst.over, worst: worst.where }, note: NOTE, at: new Date().toISOString(),
    };
    writeFileSync(jsonPath, JSON.stringify(db, null, 1));
    writeIndex();
    console.log(`${name}: done in ${((Date.now() - t0) / 1000).toFixed(0)} s; mocap=1 vs mocap=0 worst max ${worst.max} (${worst.over} px > 8, ${worst.where}); cycle ${r0.period}/${r1.period}; mc max ${db.rows[name].mcMax.toFixed(2)}`);
  }
} finally {
  await composer.close();
  server?.kill();
}
