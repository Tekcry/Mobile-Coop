#!/usr/bin/env node
// light-realism L0: a section's light on the GPU (laptop alone slot; replaces s1-shots.mjs). Read-only on the game: it
// boots the map at Low and at Epic (one browser each, in turn), samples the light field the meter and guards read
// (`world.lightField`: levelAt at each space's plane and at floor + 1.0, bodyLevel standing) on the 1 m grid of every
// space of the section in `docs/light-realism/spaces/<map>.json` (the grid `lux-grid.mjs` reads on the CPU), reads the
// real meter (`GameState.lightLevel`) after a teleport at the named points, then pins the sim (the visual-gate
// harness's pin: loop timeScale 0, flicker 1, photo mode, rigs hidden) and writes a PNG per view with the pixel luma at
// the projected grid points and the bible L5 display-target check. `--video <s>`: after the presets, one more Epic
// browser records a headless fly-through of the section's views (the look video each lighting PR carries).
// Output: <out>/shots.json, <out>/<preset>-<view>.png, <out>/flythrough-<preset>.webm.
// Needs dist/ served on E2E_PORT (scripts/serve-dist.mjs serves it and runs this script). GPU:
// E2E_GPU=1. Never headed.
//   E2E_GPU=1 E2E_PORT=4189 node scripts/serve-dist.mjs scripts/light-realism/shots.mjs --map campusOps --section 1 --label before [--presets low,epic] [--video 90] [--push shots/light-realism-s1]
//   node scripts/light-realism/shots.mjs --dry-run [--map campusOps --section 1] [--push shots/light-realism-s1]   (no browser, no server)
// --push <branch>: after the run, commit <out> onto that branch (shots/light-realism-<name> only) under
// <prefix>/ with git plumbing (a temp index; HEAD, index and working tree untouched), as the visual-gate VG7 pusher
// (origin/feature/visual-gate scripts/visual-gate/push-results.mjs) does; copied, not imported (it refuses other branches).
// A meter-field split over 0.02 or a band mismatch is reported (`meterSplits`, `targets`), not fixed here: J11's triage.
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
const MAP = opt('--map', 'campusOps');
const SECTION = opt('--section', '1');
const LABEL = opt('--label', 'run');
const TAG = `${MAP}-s${SECTION}`;
const OUT = path.resolve(opt('--out', DRY ? path.join(os.tmpdir(), `light-realism-${TAG}-dry-${process.pid}`) : `C:/NightShift/scratch/light-realism/${TAG}-${LABEL}`));
const PRESETS = opt('--presets', 'low,epic').split(',').filter(Boolean);
const VIDEO_S = Number(opt('--video', '0'));
const VIDEO_PRESET = opt('--video-preset', 'epic');
const PUSH = opt('--push', '');
const PREFIX = opt('--prefix', `${LABEL}-${TAG}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`);
const PORT = Number(process.env.E2E_PORT ?? 4189);
const URL = `http://127.0.0.1:${PORT}/`;
const VIEWPORT = { width: 1280, height: 720 };
/** Bible L5 display targets (`src/world/darkCurve.ts` DARK_TARGETS, the e2e-darkness cards): luma of a 50% grey card at
 *  each level. The ground is not a grey card, so on these shots the check is advisory (reported, never failed here). */
export const L5_TARGETS = [
  { level: 0.12, min: 0, max: 0.04 },
  { level: 0.27, min: 0, max: 0.09 },
  { level: 0.4, min: 0.12, max: 0.35 },
  { level: 0.7, min: 0.45, max: 1 },
];
/** A meter reading this far from the field at the same point goes to J11 (PLAN L0). */
export const SPLIT = 0.02;

/** The section's spaces and shot plan from the spaces file. */
export function loadPlan(map = MAP, section = SECTION) {
  const file = JSON.parse(fs.readFileSync(path.join(ROOT, `docs/light-realism/spaces/${map}.json`), 'utf8'));
  const spaces = file.spaces.filter((s) => String(s.section ?? '') === String(section) || (section === '' && s.section === undefined));
  const shots = file.shots?.[String(section)];
  if (!spaces.length) throw new Error(`no spaces for ${map} section ${section}`);
  if (!shots) throw new Error(`no "shots" entry for ${map} section ${section}`);
  return { spaces, ...shots };
}

/** A world point to screen px through a row-vector view x projection (Babylon `toArray()`); null behind the camera. */
export function projectPoint(m, p, W, H) {
  const [x, y, z] = p;
  const cx = x * m[0] + y * m[4] + z * m[8] + m[12];
  const cy = x * m[1] + y * m[5] + z * m[9] + m[13];
  const cw = x * m[3] + y * m[7] + z * m[11] + m[15];
  if (cw <= 1e-4) return null;
  return [(cx / cw * 0.5 + 0.5) * W, (1 - (cy / cw * 0.5 + 0.5)) * H];
}

/** A space's grid points [x, z] (1 m, edges included, north row first: `luxGrid.ts`'s order). */
export function gridPoints(sp, step = 1) {
  const out = [];
  for (let z = sp.rect.maxZ; z >= sp.rect.minZ - 1e-9; z -= step) for (let x = sp.rect.minX; x <= sp.rect.maxX + 1e-9; x += step) out.push([x, z]);
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

/** The L5 check of one view's open ground spots: per target, the spots within 0.03 of its level and their mean luma. */
export function targetCheck(spots) {
  return L5_TARGETS.map((t) => {
    const near = spots.filter((q) => Math.abs(q.level - t.level) <= 0.03);
    const s = stats(near.map((q) => q.luma));
    return { ...t, n: s.n, luma: s.n ? s.mean : null, inBand: s.n ? s.mean >= t.min && s.mean <= t.max : null };
  });
}

/** Camera pose at time u (0..1) along a list of [name, cam, target] views (smoothstep per leg). */
export function flyPose(views, u) {
  const legs = Math.max(1, views.length - 1);
  if (views.length === 1) return { cam: views[0][1], target: views[0][2] };
  const t = Math.min(0.999999, Math.max(0, u)) * legs;
  const k = Math.floor(t);
  const e = t - k;
  const s = e * e * (3 - 2 * e);
  const a = views[k];
  const b = views[k + 1];
  const mix = (p, q) => p.map((v, i) => v + (q[i] - v) * s);
  return { cam: mix(a[1], b[1]), target: mix(a[2], b[2]) };
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
    return gitc(['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', `light-realism ${TAG} results ${prefix} (${list.length} files)`], { cwd, env });
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

/** Sample the light field at the given [x, y, z] points (plane and meter height) and the standing body - no sim. */
function fieldInPage(pts) {
  const f = window.__app.current.world.lightField;
  const r = (v) => Math.round(v * 1000) / 1000;
  return pts.map(([x, yp, ym, fl, z]) => [r(f.levelAt(x, yp, z)), r(f.levelAt(x, ym, z)), r(f.bodyLevel(x, fl, z, 1.7))]);
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

/** Fly the photo camera along the views for `ms` (the pose function's source is passed in as text). */
async function flyInPage([views, ms, poseSrc]) {
  const g = window.__app.current;
  const V = g.player.position.constructor;
  const c = g.photoCamera();
  const pose = new Function(`return (${poseSrc})`)();
  await new Promise((res) => {
    const t0 = performance.now();
    const f = () => {
      const u = (performance.now() - t0) / ms;
      const p = pose(views, u);
      c.position.set(p.cam[0], p.cam[1], p.cam[2]);
      c.setTarget(new V(p.target[0], p.target[1], p.target[2]));
      if (u >= 1) res();
      else requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  return true;
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

async function waitReady(page) {
  await page.waitForFunction(() => !!window.__app?.current?.player && !!window.__app.current.world?.lightField, null, { timeout: 180_000 });
  await page.waitForFunction(() => { const s = window.__app?.current?.world?.lightBake?.sections; return !s || s.done || s.disposed; }, null, { timeout: 240_000, polling: 500 });
}

async function runPreset(launch, plan, preset) {
  const res = { preset, query: `${plan.query}&gfx=${preset}&weather=clear`, errors: [] };
  const l = await launch({ url: URL, params: res.query, viewport: VIEWPORT });
  const { browser, page } = l;
  try {
    await waitReady(page);
    res.renderer = await page.evaluate(() => String(window.__app?.engine?.getGlInfo?.()?.renderer ?? ''));
    // every space's grid: plane, meter height, standing body
    res.spaces = [];
    const ground = [];
    for (const sp of plan.spaces) {
      const fl = sp.floor ?? 0;
      const pts = gridPoints(sp);
      const f = await page.evaluate(`(${fieldInPage})(${JSON.stringify(pts.map(([x, z]) => [x, fl + sp.plane, fl + 1.0, fl, z]))})`);
      const points = pts.map((p, i) => ({ x: p[0], z: p[1], plane: f[i][0], y10: f[i][1], body: f[i][2] }));
      res.spaces.push({ id: sp.id, floor: fl, plane: sp.plane, stats: { plane: stats(f.map((q) => q[0])), y10: stats(f.map((q) => q[1])), body: stats(f.map((q) => q[2])) }, points });
      for (const q of points) ground.push({ ...q, y: fl + 0.02 });
    }
    res.meter = [];
    for (const [name, x, z] of plan.points) {
      const m = await page.evaluate(`(${meterInPage})(${JSON.stringify([x, z])})`);
      const lv = await page.evaluate(([x, z]) => { const fl = window.__app.current.world.lightField; return [fl.levelAt(x, 0.1, z), fl.bodyLevel(x, 0, z, 1.7)]; }, [x, z]);
      res.meter.push({ name, x, z, ...m, fieldY01: Math.round(lv[0] * 1000) / 1000, fieldBody: Math.round(lv[1] * 1000) / 1000, split: Math.round((m.meter - lv[1]) * 1000) / 1000 });
      console.log(`  ${preset} meter ${name} (${x}, ${z}): ${m.meter} (field body ${lv[1].toFixed(3)})`);
    }
    res.meterSplits = res.meter.filter((q) => Math.abs(q.split) > SPLIT).map((q) => q.name);
    // park the player out of the views, then pin
    await page.evaluate(`(${meterInPage})(${JSON.stringify(plan.park)})`);
    await page.evaluate(`(${pinInPage})()`);
    res.views = [];
    for (const [name, cam, target] of plan.views) {
      const m = await page.evaluate(`(${aimInPage})(${JSON.stringify([cam, target])})`);
      const png = await page.screenshot({ timeout: 120_000 });
      const file = `${preset}-${name}.png`;
      fs.writeFileSync(path.join(OUT, file), png);
      const inFrame = [];
      for (const p of ground) {
        const s = projectPoint(m, [p.x, p.y, p.z], VIEWPORT.width, VIEWPORT.height);
        if (s && s[0] >= 3 && s[1] >= 3 && s[0] < VIEWPORT.width - 3 && s[1] < VIEWPORT.height - 3) inFrame.push({ p, s });
      }
      const occ = await page.evaluate(`(${occlusionInPage})(${JSON.stringify([cam, inFrame.map((q) => [q.p.x, q.p.y, q.p.z])])})`);
      const lum = await page.evaluate(lumaExpr(png.toString('base64'), inFrame.map((q) => q.s)));
      const spots = inFrame.map((q, i) => ({ x: q.p.x, z: q.p.z, px: Math.round(q.s[0]), py: Math.round(q.s[1]), luma: lum.spots[i], level: q.p.plane, occluded: occ[i] }));
      const open = spots.filter((q) => q.occluded !== true && q.luma !== null);
      const band = (lo, hi) => stats(open.filter((q) => q.level >= lo && q.level < hi).map((q) => q.luma));
      res.views.push({ name, cam, target, file, frameMean: lum.frameMean, spots, lumaByLevel: { dark: band(0, 0.28), mid: band(0.28, 0.6), lit: band(0.6, 9) }, lumaAll: stats(open.map((q) => q.luma)), targets: targetCheck(open) });
      console.log(`  ${preset} ${name}: frame mean luma ${lum.frameMean}, ground spots ${open.length} (luma mean ${res.views.at(-1).lumaAll.mean})`);
    }
    res.errors = l.errors.slice(0, 10);
  } finally {
    await browser.close().catch(() => {});
  }
  return res;
}

async function runVideo(launch, plan) {
  const preset = VIDEO_PRESET;
  const tmp = path.join(OUT, '.video');
  fs.mkdirSync(tmp, { recursive: true });
  const l = await launch({ url: URL, params: `${plan.query}&gfx=${preset}&weather=clear`, viewport: VIEWPORT, context: { recordVideo: { dir: tmp, size: VIEWPORT } } });
  const { browser, ctx, page } = l;
  let file = null;
  try {
    await waitReady(page);
    await page.evaluate(`(${meterInPage})(${JSON.stringify(plan.park)})`);
    await page.evaluate(`(${pinInPage})()`);
    await page.evaluate(`(${aimInPage})(${JSON.stringify([plan.views[0][1], plan.views[0][2]])})`);
    await page.evaluate(`(${flyInPage})(${JSON.stringify([plan.views, VIDEO_S * 1000, flyPose.toString()])})`);
    const video = page.video();
    await ctx.close();
    if (video) {
      file = `flythrough-${preset}.webm`;
      fs.renameSync(await video.path(), path.join(OUT, file));
    }
  } finally {
    await browser.close().catch(() => {});
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return { preset, seconds: VIDEO_S, file };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const shotPlan = loadPlan();
  const grid = shotPlan.spaces.reduce((p, sp) => p + gridPoints(sp).length, 0);
  const plan = { url: URL, map: MAP, section: SECTION, label: LABEL, query: shotPlan.query, presets: PRESETS, viewport: VIEWPORT, spaces: shotPlan.spaces.map((s) => s.id), gridPoints: grid, points: shotPlan.points, views: shotPlan.views, video: VIDEO_S ? { seconds: VIDEO_S, preset: VIDEO_PRESET } : null, out: OUT, push: PUSH || null, prefix: PREFIX };
  if (DRY) {
    // the pure parts: the grid, a projection through a known camera, the stats, the fly-through poses; and the
    // pusher's commit (not pushed)
    const m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0]; // x, y pass through, w = z: a point at z 2 lands at (x / 2, y / 2) NDC
    const check = projectPoint(m, [1, 0.5, 2], 1280, 720);
    if (!check || Math.abs(check[0] - 960) > 1e-6 || Math.abs(check[1] - 270) > 1e-6) throw new Error(`projectPoint self-check failed: ${check}`);
    if (projectPoint(m, [0, 0, -1], 1280, 720) !== null) throw new Error('projectPoint: a point behind the camera must be null');
    const st = stats([0.1, 0.2, 0.3, null]);
    if (st.n !== 3 || st.mean !== 0.2 || st.u0 !== 0.5) throw new Error(`stats self-check failed: ${JSON.stringify(st)}`);
    const v = shotPlan.views;
    const p0 = flyPose(v, 0);
    const p1 = flyPose(v, 1);
    if (p0.cam.some((q, i) => Math.abs(q - v[0][1][i]) > 1e-9) || p1.cam.some((q, i) => Math.abs(q - v.at(-1)[1][i]) > 1e-3)) throw new Error('flyPose self-check failed');
    const tc = targetCheck([{ level: 0.12, luma: 0.02 }, { level: 0.7, luma: 0.3 }]);
    if (tc[0].inBand !== true || tc[3].inBand !== false || tc[1].n !== 0) throw new Error(`targetCheck self-check failed: ${JSON.stringify(tc)}`);
    const park = shotPlan.spaces.find((s) => s.id === 'park');
    if (park && gridPoints(park).length !== 43 * 25) throw new Error('gridPoints: the S1 car park is 43 x 25 points');
    fs.writeFileSync(path.join(OUT, 'plan.json'), JSON.stringify(plan, null, 1));
    console.log(`dry-run: ${MAP} section ${SECTION}: ${plan.spaces.length} spaces, ${grid} grid points, ${plan.points.length} meter points, ${plan.views.length} views x ${PRESETS.join(' + ')}${VIDEO_S ? `, ${VIDEO_S} s video (${VIDEO_PRESET})` : ''}; query ${plan.query}&gfx=<preset>&weather=clear on ${URL}`);
    console.log(`dry-run: projection, stats, fly-through and target self-checks ok; wrote ${path.join(OUT, 'plan.json')}`);
    if (PUSH) {
      const r = pushFolder({ dir: OUT, branch: PUSH, prefix: PREFIX, dryRun: true });
      console.log(`dry-run: would push ${r.commit.slice(0, 10)} to ${PUSH}: ${r.files.join(', ')}`);
    }
    return 0;
  }
  if (!(await fetch(URL).then(() => true, () => false))) {
    console.error(`shots: nothing serves ${URL} (run it through scripts/serve-dist.mjs)`);
    return 2;
  }
  const { launch } = await import(pathToFileURL(path.join(ROOT, 'scripts/e2e-lib.mjs')).href);
  const out = { plan, started: new Date().toISOString(), sha: gitc(['rev-parse', 'HEAD'], { soft: true }), runs: [], video: null };
  let code = 0;
  const kill = setTimeout(() => { console.error('shots: timed out'); process.exit(2); }, 1_500_000 + VIDEO_S * 2000);
  for (const preset of PRESETS) {
    console.log(`shots: ${preset}`);
    try {
      out.runs.push(await runPreset(launch, shotPlan, preset));
    } catch (e) {
      console.error(`shots: ${preset} failed: ${String(e?.message ?? e)}`);
      out.runs.push({ preset, error: String(e?.message ?? e) });
      code = 1;
    }
    fs.writeFileSync(path.join(OUT, 'shots.json'), JSON.stringify(out, null, 1));
  }
  if (VIDEO_S > 0) {
    console.log(`shots: ${VIDEO_S} s fly-through (${VIDEO_PRESET})`);
    try {
      out.video = await runVideo(launch, shotPlan);
    } catch (e) {
      console.error(`shots: video failed: ${String(e?.message ?? e)}`);
      out.video = { error: String(e?.message ?? e) };
      code = 1;
    }
  }
  out.splits = out.runs.flatMap((r) => (r.meterSplits ?? []).map((n) => `${r.preset}: ${n}`));
  fs.writeFileSync(path.join(OUT, 'shots.json'), JSON.stringify(out, null, 1));
  clearTimeout(kill);
  console.log(`shots: wrote ${OUT}${out.splits.length ? `; meter-field splits over ${SPLIT} (to J11): ${out.splits.join(', ')}` : ''}`);
  for (const f of listFiles(OUT)) console.log(`  ${f.abs}`);
  if (PUSH) {
    try {
      const r = pushFolder({ dir: OUT, branch: PUSH, prefix: PREFIX });
      console.log(`shots: pushed ${r.files.length} files to ${PUSH} ${r.commit.slice(0, 10)} under ${PREFIX}/`);
    } catch (e) {
      console.error(`shots: push failed: ${String(e?.message ?? e)} (results stay in ${OUT})`);
      code = code || 1;
    }
  }
  return code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().then((c) => process.exit(c), (e) => { console.error(`shots: ${String(e?.stack ?? e)}`); process.exit(2); });
}
