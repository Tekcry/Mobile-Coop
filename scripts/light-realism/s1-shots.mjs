#!/usr/bin/env node
// light-realism: the S1 staff car park on the GPU (laptop alone slot). Read-only on the game: it boots Saltmarsh Park
// (`?autostart=campusOps&mode=sector&sectorGuards=0`) at Low and at Epic (one browser each, in turn), samples the light
// field the meter and guards read (`world.lightField`: levelAt at y 0.1 and 1.0, bodyLevel standing) on the same 1 m
// grid as `s1-grid.mjs`, reads the real meter (`GameState.lightLevel`) after a teleport at the named points, then pins the
// sim (the visual-gate harness's pin: loop timeScale 0, flicker 1, photo mode, rigs hidden) and writes a PNG per view
// with the pixel luma at the projected grid points. Output: <out>/s1-shots.json + <out>/<preset>-<view>.png.
// Needs dist/ served on E2E_PORT (the laptop queue's `serve ` step prefix: scripts/laptop-queue/serve.mjs). GPU:
// E2E_GPU=1 (the queue sets it). Never headed.
//   E2E_GPU=1 E2E_PORT=4189 node scripts/laptop-queue/serve.mjs scripts/light-realism/s1-shots.mjs --out C:/NightShift/scratch/light-realism/s1 [--presets low,epic] [--push shots/light-realism-s1]
//   node scripts/light-realism/s1-shots.mjs --dry-run [--out <dir>] [--push shots/light-realism-s1]   (no browser, no server)
// --push <branch>: after the run, commit <out> onto that branch (shots/light-realism-<name> only) under
// <prefix>/ with git plumbing (a temp index; HEAD, index and working tree untouched), as the visual-gate VG7 pusher
// (origin/feature/visual-gate scripts/visual-gate/push-results.mjs) does; copied, not imported (it refuses other branches).
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argv = process.argv.slice(2);
const opt = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const DRY = argv.includes('--dry-run');
const OUT = path.resolve(opt('--out', DRY ? path.join(os.tmpdir(), `light-realism-s1-dry-${process.pid}`) : 'C:/NightShift/scratch/light-realism/s1'));
const PRESETS = opt('--presets', 'low,epic').split(',').filter(Boolean);
const PUSH = opt('--push', '');
const PREFIX = opt('--prefix', `s1-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`);
const PORT = Number(process.env.E2E_PORT ?? 4189);
const URL = `http://127.0.0.1:${PORT}/`;
const QUERY = 'autostart=campusOps&mode=sector&sectorGuards=0';
const VIEWPORT = { width: 1280, height: 720 };

/** The car park footprint (`S1_ROOMS` 'park', src/world/maps/campusS1.ts) and the grid step (m). */
export const PARK = { minX: -36, maxX: 6, minZ: -76, maxZ: -52 };
export const STEP = 1;
/** The 14 columns (campusS1.ts PARK_COLUMNS_W / _E), lamp at y 6.0. */
export const COLUMNS = [[-34, -62], [-28, -62], [-22, -62], [-16, -62], [-34, -53], [-28, -53], [-22, -53], [-16, -53], [-10, -62], [-4, -62], [2, -62], [-10, -53], [-4, -53], [2, -53]];
/** The named meter points (s1Grid.ts `named`): a teleport each, the real meter read after the sim runs. */
export const POINTS = [
  ['under column', -28, -62],
  ['between 2 columns', -25, -62],
  ['between rows', -28, -57.5],
  ['middle of 4', -25, -57.5],
  ['circuit seam', -13, -57.5],
  ['south aisle', -25, -68],
  ['south edge', -25, -75],
  ['north row column', -22, -53],
  ['north edge', -25, -52],
  ['far east', 5, -60],
];
/** Views: name, camera [x, y, z], target [x, y, z]. Player height wide, overhead-ish, the z -53 column row, the aisle. */
export const VIEWS = [
  ['wide-sw', [-35, 1.7, -75], [-10, 1.0, -58]],
  ['overhead-s', [-15, 22, -86], [-15, 0, -63]],
  ['row-z53', [-35.5, 1.7, -51.6], [0, 0.6, -54]],
  ['aisle-e', [5, 1.7, -64.5], [-30, 0.6, -64]],
];

/** A world point to screen px through a row-vector view x projection (Babylon `toArray()`); null behind the camera. */
export function projectPoint(m, p, W, H) {
  const [x, y, z] = p;
  const cx = x * m[0] + y * m[4] + z * m[8] + m[12];
  const cy = x * m[1] + y * m[5] + z * m[9] + m[13];
  const cw = x * m[3] + y * m[7] + z * m[11] + m[15];
  if (cw <= 1e-4) return null;
  return [(cx / cw * 0.5 + 0.5) * W, (1 - (cy / cw * 0.5 + 0.5)) * H];
}

/** The grid points (x, z) over the footprint. */
export function gridPoints() {
  const out = [];
  for (let z = PARK.maxZ; z >= PARK.minZ; z -= STEP) for (let x = PARK.minX; x <= PARK.maxX; x += STEP) out.push([x, z]);
  return out;
}

/** min / mean / max / U0 of a list (nulls skipped). */
export function stats(a) {
  const v = a.filter((q) => typeof q === 'number' && Number.isFinite(q));
  if (!v.length) return { n: 0 };
  const mean = v.reduce((p, q) => p + q, 0) / v.length;
  const min = Math.min(...v);
  const r = (q) => Math.round(q * 1000) / 1000;
  return { n: v.length, min: r(min), mean: r(mean), max: r(Math.max(...v)), u0: r(min / mean) };
}

// ---- results pusher (scripts/visual-gate/push-results.mjs pushFolder, copied; branch rule shots/light-realism-*) ----
const BRANCH_RE = /^shots\/light-realism-[a-z0-9.-]+$/;
const gitc = (args, { cwd = ROOT, env = {}, input, soft = false } = {}) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, ...env }, input, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, timeout: 120_000 }).trim();
  } catch (e) {
    if (soft) return '';
    throw e;
  }
};
function listFiles(dir) {
  const out = [];
  const walk = (abs, rel) => {
    for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
      const a = path.join(abs, ent.name);
      const r = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) walk(a, r);
      else if (ent.isFile()) out.push({ rel: r, abs: a, size: fs.statSync(a).size });
    }
  };
  walk(dir, '');
  return out.sort((x, y) => (x.rel < y.rel ? -1 : x.rel > y.rel ? 1 : 0));
}
export function pushFolder({ dir, branch, prefix, dryRun = false, cwd = ROOT, remote = 'origin' }) {
  if (!BRANCH_RE.test(branch) || branch.includes('..')) throw new Error(`refused branch ${branch}: only shots/light-realism-<name>`);
  if (!prefix || prefix.includes('..') || prefix.startsWith('/') || prefix.includes('\\')) throw new Error(`refused prefix ${prefix}`);
  const list = listFiles(dir);
  if (!list.length) throw new Error(`empty folder ${dir}`);
  const bytes = list.reduce((p, f) => p + f.size, 0);
  if (bytes > 150 * 1024 * 1024) throw new Error(`folder is ${(bytes / 1048576).toFixed(1)} MB (max 150)`);
  const tracking = `refs/remotes/${remote}/${branch}`;
  const fetch = () => gitc(['fetch', '-q', remote, `+refs/heads/${branch}:${tracking}`], { cwd, soft: true });
  const tmpIndex = path.join(os.tmpdir(), `lr-results-index-${process.pid}-${randomBytes(4).toString('hex')}`);
  const anon = !gitc(['config', 'user.name'], { cwd, soft: true }) || !gitc(['config', 'user.email'], { cwd, soft: true });
  const env = { GIT_INDEX_FILE: tmpIndex, ...(anon ? { GIT_AUTHOR_NAME: 'light-realism (laptop)', GIT_AUTHOR_EMAIL: 'light-realism@localhost', GIT_COMMITTER_NAME: 'light-realism (laptop)', GIT_COMMITTER_EMAIL: 'light-realism@localhost' } : {}) };
  const buildCommit = () => {
    const parent = gitc(['rev-parse', '--verify', '-q', `${tracking}^{commit}`], { cwd, soft: true });
    fs.rmSync(tmpIndex, { force: true });
    gitc(parent ? ['read-tree', parent] : ['read-tree', '--empty'], { cwd, env });
    let infos = [];
    const flush = () => {
      if (infos.length) gitc(['update-index', '--add', ...infos], { cwd, env });
      infos = [];
    };
    for (const f of list) {
      const blob = gitc(['hash-object', '-w', '--stdin'], { cwd, input: fs.readFileSync(f.abs) });
      infos.push('--cacheinfo', `100644,${blob},${prefix}/${f.rel}`);
      if (infos.length >= 200) flush();
    }
    flush();
    const tree = gitc(['write-tree'], { cwd, env });
    return gitc(['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', `light-realism S1 results ${prefix} (${list.length} files)`], { cwd, env });
  };
  try {
    fetch();
    for (let attempt = 1; attempt <= 5; attempt++) {
      const commit = buildCommit();
      if (dryRun) return { commit, files: list.map((f) => `${prefix}/${f.rel}`), bytes, pushed: false };
      try {
        gitc(['push', '-q', remote, `${commit}:refs/heads/${branch}`], { cwd });
        return { commit, files: list.map((f) => `${prefix}/${f.rel}`), bytes, pushed: true };
      } catch (e) {
        if (attempt === 5) throw new Error(`push failed after 5 tries: ${String(e.stderr ?? e.message).split('\n')[0]}`);
        fetch();
      }
    }
    throw new Error('unreachable');
  } finally {
    fs.rmSync(tmpIndex, { force: true });
  }
}

// ---- in-page steps (serialised with their source text) ----

/** Sample the light field on the grid (y 0.1, 1.0, standing body) - no sim needed. */
function fieldInPage(pts) {
  const f = window.__app.current.world.lightField;
  const r = (v) => Math.round(v * 1000) / 1000;
  return pts.map(([x, z]) => [r(f.levelAt(x, 0.1, z)), r(f.levelAt(x, 1.0, z)), r(f.bodyLevel(x, 0, z, 1.7))]);
}

/** Teleport the player to a point, run the sim ~0.6 s, read the meter (`GameState.lightLevel`). */
async function meterInPage([x, z]) {
  const app = window.__app;
  const g = app.current;
  const V = g.player.position.constructor;
  app.loop.timeScale = 1;
  g.photoFreeze(false);
  document.body.classList.remove('photo-mode');
  g.vision.set('off');
  g.player.controller.teleport(new V(x, 0, z), 0);
  const t0 = g.time;
  const w0 = performance.now();
  while (g.time - t0 < 0.6 && performance.now() - w0 < 15000) await new Promise((res) => setTimeout(res, 50));
  const p = g.player.position;
  return { meter: Math.round(g.lightLevel * 1000) / 1000, at: [Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100, Math.round(p.z * 100) / 100] };
}

/** The visual-gate pin (harness.mjs pinInPage): sim stopped, flicker 1, photo mode, the player's rig hidden. */
function pinInPage() {
  const app = window.__app;
  const g = app.current;
  app.loop.timeScale = 0;
  const reg = g.world.level.lights;
  // (master keeps the ids in the registry's `flickIds`; the visual-gate branch exposes `flickering`)
  for (const id of reg.flickering ?? reg.flickIds ?? []) {
    const l = reg.lights[typeof id === 'number' ? id : id?.id];
    if (l) l.flicker = 1;
  }
  reg.flickerVersion++;
  g.photoFreeze(true);
  document.body.classList.add('photo-mode');
  g.player.rig?.setEnabled?.(false);
  for (const e of g.enemyMgr?.enemies ?? []) e.bodyRig?.setEnabled?.(false);
  return true;
}

/** Aim the photo camera; return its view x projection (row-vector order) once the scene is ready. */
async function aimInPage([cam, target]) {
  const g = window.__app.current;
  const V = g.player.position.constructor;
  const c = g.photoCamera();
  c.position.set(cam[0], cam[1], cam[2]);
  c.setTarget(new V(target[0], target[1], target[2]));
  for (let i = 0; i < 120 && !g.scene.isReady(); i++) await new Promise((res) => setTimeout(res, 250));
  // TAAU jitters each frame: let the history settle (60 frames)
  await new Promise((res) => { let k = 0; const f = () => (++k >= 60 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  return Array.from(c.getViewMatrix(true).multiply(c.getProjectionMatrix(true)).toArray());
}

/** Occlusion of each ground point from the camera by a pick ray (null when picking is unavailable). */
function occlusionInPage([cam, pts]) {
  const g = window.__app.current;
  const c = g.photoCamera();
  let Ray;
  try {
    Ray = c.getForwardRay(1).constructor;
  } catch {
    return pts.map(() => null);
  }
  const V = g.player.position.constructor;
  return pts.map(([x, y, z]) => {
    try {
      const d = new V(x - cam[0], y - cam[1], z - cam[2]);
      const len = d.length();
      d.normalize();
      const hit = g.scene.pickWithRay(new Ray(new V(cam[0], cam[1], cam[2]), d, len), (m) => m.isPickable !== false && m.isVisible && m.isEnabled());
      return hit && hit.hit ? hit.distance < len - 0.15 : false;
    } catch {
      return null;
    }
  });
}

/** Mean sRGB Rec. 709 luma (0..1) in a 5 x 5 px patch round each screen point, from the PNG (decoded in the page). */
function lumaExpr(b64, spots) {
  return `(async () => {
    const img = await createImageBitmap(await (await fetch('data:image/png;base64,${b64}')).blob());
    const c = new OffscreenCanvas(img.width, img.height);
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    const w = img.width, h = img.height;
    const px = x.getImageData(0, 0, w, h).data;
    const spots = ${JSON.stringify(spots)};
    let all = 0;
    for (let i = 0; i < px.length; i += 4) all += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
    const out = spots.map(([sx, sy]) => {
      let s = 0, n = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const X = Math.round(sx) + dx, Y = Math.round(sy) + dy;
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
        const k = (Y * w + X) * 4;
        s += 0.2126 * px[k] + 0.7152 * px[k + 1] + 0.0722 * px[k + 2];
        n++;
      }
      return n ? Math.round((s / n / 255) * 1000) / 1000 : null;
    });
    return { w, h, frameMean: Math.round((all / (w * h) / 255) * 1000) / 1000, spots: out };
  })()`;
}

async function runPreset(launch, preset) {
  const res = { preset, query: `${QUERY}&gfx=${preset}&weather=clear`, errors: [] };
  const l = await launch({ url: URL, params: res.query, viewport: VIEWPORT });
  const { browser, page } = l;
  try {
    await page.waitForFunction(() => !!window.__app?.current?.player && !!window.__app.current.world?.lightField, null, { timeout: 180_000 });
    await page.waitForFunction(() => { const s = window.__app?.current?.world?.lightBake?.sections; return !s || s.done || s.disposed; }, null, { timeout: 240_000, polling: 500 });
    res.renderer = await page.evaluate(() => String(window.__app?.engine?.getGlInfo?.()?.renderer ?? ''));
    const pts = gridPoints();
    const f = await page.evaluate(`(${fieldInPage})(${JSON.stringify(pts)})`);
    res.grid = { step: STEP, park: PARK, points: pts.map((p, i) => ({ x: p[0], z: p[1], y01: f[i][0], y10: f[i][1], body: f[i][2] })) };
    res.gridStats = { y01: stats(f.map((q) => q[0])), y10: stats(f.map((q) => q[1])), body: stats(f.map((q) => q[2])) };
    res.meter = [];
    for (const [name, x, z] of POINTS) {
      const m = await page.evaluate(`(${meterInPage})(${JSON.stringify([x, z])})`);
      const lv = await page.evaluate(([x, z]) => { const fl = window.__app.current.world.lightField; return [fl.levelAt(x, 0.1, z), fl.bodyLevel(x, 0, z, 1.7)]; }, [x, z]);
      res.meter.push({ name, x, z, ...m, fieldY01: Math.round(lv[0] * 1000) / 1000, fieldBody: Math.round(lv[1] * 1000) / 1000 });
      console.log(`  ${preset} meter ${name} (${x}, ${z}): ${m.meter} (field body ${lv[1].toFixed(3)})`);
    }
    // park the player out of the views, then pin
    await page.evaluate(`(${meterInPage})(${JSON.stringify([-25, -80])})`);
    await page.evaluate(`(${pinInPage})()`);
    res.views = [];
    for (const [name, cam, target] of VIEWS) {
      const m = await page.evaluate(`(${aimInPage})(${JSON.stringify([cam, target])})`);
      const png = await page.screenshot({ timeout: 120_000 });
      const file = `${preset}-${name}.png`;
      fs.writeFileSync(path.join(OUT, file), png);
      // the grid's ground points (y 0.02) in frame
      const inFrame = [];
      for (const p of res.grid.points) {
        const s = projectPoint(m, [p.x, 0.02, p.z], VIEWPORT.width, VIEWPORT.height);
        if (s && s[0] >= 3 && s[1] >= 3 && s[0] < VIEWPORT.width - 3 && s[1] < VIEWPORT.height - 3) inFrame.push({ p, s });
      }
      const occ = await page.evaluate(`(${occlusionInPage})(${JSON.stringify([cam, inFrame.map((q) => [q.p.x, 0.02, q.p.z])])})`);
      const lum = await page.evaluate(lumaExpr(png.toString('base64'), inFrame.map((q) => q.s)));
      const spots = inFrame.map((q, i) => ({ x: q.p.x, z: q.p.z, px: Math.round(q.s[0]), py: Math.round(q.s[1]), luma: lum.spots[i], level: q.p.y01, occluded: occ[i] }));
      const open = spots.filter((q) => q.occluded !== true && q.luma !== null);
      const band = (lo, hi) => stats(open.filter((q) => q.level >= lo && q.level < hi).map((q) => q.luma));
      res.views.push({ name, cam, target, file, frameMean: lum.frameMean, spots, lumaByLevel: { dark: band(0, 0.28), mid: band(0.28, 0.6), lit: band(0.6, 9) }, lumaAll: stats(open.map((q) => q.luma)) });
      console.log(`  ${preset} ${name}: frame mean luma ${lum.frameMean}, ground spots ${open.length} (luma mean ${res.views.at(-1).lumaAll.mean})`);
    }
    res.errors = l.errors.slice(0, 10);
  } finally {
    await browser.close().catch(() => {});
  }
  return res;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const plan = { url: URL, query: QUERY, presets: PRESETS, viewport: VIEWPORT, park: PARK, step: STEP, gridPoints: gridPoints().length, points: POINTS, views: VIEWS, out: OUT, push: PUSH || null, prefix: PREFIX };
  if (DRY) {
    // the pure parts: the grid, a projection through a known camera, the stats; and the pusher's commit (not pushed)
    const m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0]; // x, y pass through, w = z: a point at z 2 lands at (x / 2, y / 2) NDC
    const check = projectPoint(m, [1, 0.5, 2], 1280, 720);
    if (!check || Math.abs(check[0] - 960) > 1e-6 || Math.abs(check[1] - 270) > 1e-6) throw new Error(`projectPoint self-check failed: ${check}`);
    if (projectPoint(m, [0, 0, -1], 1280, 720) !== null) throw new Error('projectPoint: a point behind the camera must be null');
    const st = stats([0.1, 0.2, 0.3, null]);
    if (st.n !== 3 || st.mean !== 0.2 || st.u0 !== 0.5) throw new Error(`stats self-check failed: ${JSON.stringify(st)}`);
    fs.writeFileSync(path.join(OUT, 'plan.json'), JSON.stringify(plan, null, 1));
    console.log(`dry-run: ${plan.gridPoints} grid points, ${POINTS.length} meter points, ${VIEWS.length} views x ${PRESETS.join(' + ')}; query ${QUERY}&gfx=<preset>&weather=clear on ${URL}`);
    console.log(`dry-run: projection and stats self-checks ok; wrote ${path.join(OUT, 'plan.json')}`);
    if (PUSH) {
      const r = pushFolder({ dir: OUT, branch: PUSH, prefix: PREFIX, dryRun: true });
      console.log(`dry-run: would push ${r.commit.slice(0, 10)} to ${PUSH}: ${r.files.join(', ')}`);
    }
    return 0;
  }
  if (!(await fetch(URL).then(() => true, () => false))) {
    console.error(`s1-shots: nothing serves ${URL} (run it through scripts/laptop-queue/serve.mjs)`);
    return 2;
  }
  const { launch } = await import(pathToFileURL(path.join(ROOT, 'scripts/e2e-lib.mjs')).href);
  const out = { plan, started: new Date().toISOString(), sha: gitc(['rev-parse', 'HEAD'], { soft: true }), runs: [] };
  let code = 0;
  const kill = setTimeout(() => { console.error('s1-shots: timed out after 1500 s'); process.exit(2); }, 1_500_000);
  for (const preset of PRESETS) {
    console.log(`s1-shots: ${preset}`);
    try {
      out.runs.push(await runPreset(launch, preset));
    } catch (e) {
      console.error(`s1-shots: ${preset} failed: ${String(e?.message ?? e)}`);
      out.runs.push({ preset, error: String(e?.message ?? e) });
      code = 1;
    }
    fs.writeFileSync(path.join(OUT, 's1-shots.json'), JSON.stringify(out, null, 1));
  }
  clearTimeout(kill);
  console.log(`s1-shots: wrote ${OUT}`);
  for (const f of listFiles(OUT)) console.log(`  ${f.abs}`);
  if (PUSH) {
    try {
      const r = pushFolder({ dir: OUT, branch: PUSH, prefix: PREFIX });
      console.log(`s1-shots: pushed ${r.files.length} files to ${PUSH} ${r.commit.slice(0, 10)} under ${PREFIX}/`);
    } catch (e) {
      console.error(`s1-shots: push failed: ${String(e?.message ?? e)} (results stay in ${OUT})`);
      code = code || 1;
    }
  }
  return code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().then((c) => process.exit(c), (e) => { console.error(`s1-shots: ${String(e?.stack ?? e)}`); process.exit(2); });
}
