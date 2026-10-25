// guard-ai T1 look capture (test script only): the shadow of a guard just OUTSIDE the camera view, whose lamp shadow
// lands IN the view, frame by frame, in three passes on ONE build, same scene and frame timing: `tier` (the default URL:
// the anim tiers with the T1-SHADOW rule, A195, a guard whose shadow can be in view counts as seen), `full`
// (`&animtier=0`, every frame) and `cam` (`&animshadow=0`: camera-only seen, a pose solve every `ANIM_TIER_OFFSCREEN` th
// frame off-screen, which proves the spot stages the shadow's freeze-then-snap) (T1-CHECK-A / B item 1, T1-SHADOW-BRIEF).
// Usage (repo root, after `npm run build`; headless, never headed; laptop queue: E2E_GPU=1, its own E2E_PORT):
//   E2E_GPU=1 E2E_PORT=4189 node scripts/t1-shadow-look.mjs [outDir] [frames=24] [--fps=60,30] [--gfx=epic]
//     [--viewport=1280x720] [--map=autostart=ctcourse&mode=course] [--query=guardmodels=1] [--need=hip] [--select-only]
//   outDir: default C:/NightShift/scratch/t1-shadow-look/<sha8>/. Per fps: <fps>-tier.png, <fps>-full.png, <fps>-cam.png
//   (contact sheets, rows of frames, each tile labelled S = pose solved / . = skipped, a display gain for the dark map),
//   <fps>-compare.png (tier / full / cam rows), <fps>-shadow.png (his shadow alone: each frame against the view without
//   him, x8), <fps>-<pass>-view.png (the whole view, crop outlined), <fps>-<pass>-standin(-shadow).png (a stand-in guard
//   IN view at that spot: how his shadow looks there), raw crops and shadow masks in frames/, run.json (every number).
//   --select-only: the scene pick and the stand-in pictures only. Software GL (no E2E_GPU) is a dry run only.
//   --need=hip (T1-SHADOW): only legs whose hip shadow lands in view while he is culled (low lamps, long legs); with
//   none, the error lists the best hip-shadow offsets tried (R x 0.95 / (lh - 0.95), about 2.3 m needed).
//   run.json per frame: `drawn` (his tracked body drawn by the camera: `seen.camFrame`), `shadowSeen` (the shadow rule
//   counted him seen this frame).
// Scene: Marlow Yard (default), the map's guards removed, one passive grunt walking a straight 4 m patrol leg past a lit
// lamp 2.2-4.5 m over the floor; the 8 best lamps (this lamp's light where his chest and head shadows land, nav grid
// fit) are tried with a stand-in in view and the one whose shadow darkens the most pixels is kept. The player is parked
// on the lamp's far side (> 4 m from the guard: no near-player full rate). The camera is fixed, looking almost straight
// down from 2.6 m, slid sideways until no mesh of the guard is in its frustum over the capture. Babylon culls the
// merged body by its skinned bounding box (~2.5 m square round him), so only the part of his shadow ~1.5 m or more
// from his feet can be on screen while he is off it (chest, arms, head under these lamps; looking along the floor
// instead it would be ~2.7 m). The frames are driven by hand: the render loop is stopped and each frame runs the game
// loop's own frame (fixed steps, frame update, render) at 1000 / fps ms, then the canvas crop is copied in the same task.
// The tier pass picks the lamp and the camera; the full pass reuses them and the same warm-up frame count.
// Printed: the scene, per pass the frames his pose solved, whether his tracked body was drawn (must be never), the
// lamp's character-shadow slot, his shadow's pixels in the crop, the planted-foot slide (the ankle that moved least each
// frame, world) and the ankle-shadow step (lamp ray onto the floor).
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

if (!existsSync('node_modules/vite/bin/vite.js') || !existsSync('node_modules/playwright-core')) {
  console.error('t1-shadow-look: run from the repo root with node_modules installed');
  process.exit(2);
}
const { launch, launchOptions, GPU } = await import('./e2e-lib.mjs');
const { chromium } = await import('playwright-core');

const argv = process.argv.slice(2);
const pos = argv.filter((a) => !a.startsWith('--'));
const opt = (k, d) => argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
let sha8 = 'nosha';
try { sha8 = execSync('git rev-parse --short=8 HEAD', { encoding: 'utf8' }).trim(); } catch { /* not a checkout */ }
const OUT = pos[0] ?? `C:/NightShift/scratch/t1-shadow-look/${sha8}/`;
const N = Math.max(2, Math.min(240, Number(pos[1] ?? 24) | 0));
const FPS = opt('fps', '60,30').split(',').map(Number).filter((f) => f > 0 && f <= 240);
const GFX = opt('gfx', 'epic');
const [VW, VH] = opt('viewport', '1280x720').split('x').map(Number);
const QUERY = opt('query', '').replace(/^[?&]/, '');
const SELECT_ONLY = argv.includes('--select-only');
// (T1-SHADOW) --need=hip: only legs whose hip shadow is in view while he is culled
const NEED_HIP = opt('need', '') === 'hip';
const PORT = Number(process.env.E2E_PORT ?? 4179);
const URL = `http://127.0.0.1:${PORT}/`;
// --map=<query>: the map (default Marlow Yard); e.g. --map=autostart=warehouseOps&mode=sector&sectorGuards=0
const MAP = opt('map', 'autostart=ctcourse&mode=course');
const MAP_NAME = (MAP.match(/autostart=([^&]+)/) ?? [])[1] ?? MAP;
const BASE = `${MAP}&gfx=${GFX}${QUERY ? `&${QUERY}` : ''}`;
const log = (...a) => console.log(`[t1-shadow ${new Date().toISOString().slice(11, 19)}]`, ...a);
if (!FPS.length) { console.error('t1-shadow-look: bad --fps'); process.exit(2); }

// ---------- serve dist/ (the guard-cap pattern: reuse a server only when it serves this dist) ----------
let server = null;
let browser = null;
const stopServer = () => { try { server?.kill(); } catch { /* gone */ } };
process.on('exit', stopServer);
const fail = async (msg) => { console.error(`t1-shadow-look: ${msg}`); try { await browser?.close(); } catch { /* gone */ } stopServer(); process.exit(2); };
const distIndex = existsSync('dist/index.html') ? readFileSync('dist/index.html', 'utf8') : null;
if (!distIndex) await fail('dist/index.html missing (run `npm run build` first)');
const answering = await fetch(URL).then((r) => r.text(), () => null);
if (answering !== null) {
  if (answering !== distIndex) await fail(`port ${PORT} answers with another build: free it or pick another E2E_PORT`);
  log(`reusing the server on ${PORT} (serves this dist)`);
} else {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
  let up = false;
  for (let i = 0; i < 80 && !up; i++) {
    try { up = (await fetch(URL)).ok; } catch { await new Promise((r) => setTimeout(r, 250)); }
  }
  if (!up || server.exitCode !== null) await fail('preview server did not start (port taken? dist built?)');
  if ((await (await fetch(URL)).text()) !== distIndex) await fail('served index.html is not this dist');
  log(`serving dist/ on ${PORT}`);
}
const KILL_S = GPU ? 1800 : 3600;
const kill = setTimeout(() => fail(`timed out after ${KILL_S} s`), KILL_S * 1000);

// ---------- in-page code (each function is serialised into the page: self-contained) ----------

/** Pick the lamp, the guard's leg, the player's spot and a first camera (no guard yet); park the player; install the
 *  camera override (`window.__t1cam`, applied after the player's frame update and before every render). */
function pageSelect([vw, vh, camGiven, choice, needHip]) {
  const g = window.__app.current;
  const em = g.enemyMgr;
  const L = g.world.lamps;
  const cs = g.world.charShadows;
  if (!em || !L || !L.count) throw new Error(`no enemy manager or baked lamps (em ${!!em}, lamps ${L?.count ?? 0})`);
  g.target.damageMul = 0;
  em.stealth = true;
  for (const e of [...em.enemies]) em.despawn(e);
  em.maxAlive = 1;
  const nav = em.nav;
  // (the map's start, kept: later calls run after the player was moved)
  const p0 = (window.__t1p0 ??= g.player.position.clone());
  const V = p0.constructor;
  const cam = g.player.cam.camera;
  // the camera looks almost straight down (85 deg) from CAM_H over the floor: the side planes then meet his box and his
  // shadow at about the same depth, so the least of the shadow that can be in view while he is culled is ~1.5 m from
  // his feet (looking along the floor it is ~2.7 m: the box's far corners sit deeper, where the frustum is wider)
  const FOV = 0.75;
  const CAM_H = 2.6;
  const SIDE0 = 1.4;
  const walk = (x, z, y, r = 0.35) => {
    const c = nav.nearestWalkable(x, z, r, y);
    if (c < 0) return null;
    const cc = nav.center(c);
    if (Math.hypot(cc[0] - x, cc[1] - z) > r + 0.3 || Math.abs(nav.height[c] - y) > 0.25) return null;
    return nav.height[c];
  };
  const clear = (a, b, y) => nav.lineClear(a, b, y, y);
  // the four side planes of a camera pose (Babylon's Frustum.GetPlanesToRef on view x projection); outside: < 0
  const planes = (c) => {
    cam.position.set(c.pos[0], c.pos[1], c.pos[2]);
    cam.setTarget(new V(c.target[0], c.target[1], c.target[2]));
    cam.fov = c.fov;
    const m = cam.getViewMatrix(true).multiply(cam.getProjectionMatrix(true)).m;
    return [[m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]], [m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]], [m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]], [m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]]];
  };
  const boxOut = (P, x, y, z) => {
    for (const q of P) {
      let all = true;
      for (const dx of [-BOX, BOX]) for (const dy of [-0.3, 2.1]) for (const dz of [-BOX, BOX]) if (q[0] * (x + dx) + q[1] * (y + dy) + q[2] * (z + dz) + q[3] >= 0) all = false;
      if (all) return true;
    }
    return false;
  };
  const ptIn = (P, x, y, z) => P.every((q) => q[0] * x + q[1] * y + q[2] * z + q[3] >= 0);
  const camAt = (pl, side) => {
    const { M, s, t, fy } = pl;
    const bx = M[0] + s[0] * side + t[0] * 0.6, bz = M[1] + s[1] * side + t[1] * 0.6;
    const h = Math.min(CAM_H, pl.roof - pl.fy - 0.3);
    // (the view's up is +s: his side of it is the bottom edge, where the vertical fov's narrower half-angle cuts)
    return { pos: [bx - s[0] * 0.1, fy + h, bz - s[1] * 0.1], target: [bx + s[0] * 0.1, fy, bz + s[1] * 0.1], fov: FOV, side };
  };
  // the guard's box: the skinned merged body's bounding box, ~2.5 m square round him standing and more walking (Babylon culls with it; the
  // first runs needed ~1.9 m half-width: the camera was nudged that far after the warm-up)
  const BOX = 1.9;
  const outOver = (P, pl) => {
    for (let v = -0.2; v <= 1.6; v += 0.2) if (!boxOut(P, pl.M[0] + pl.t[0] * v, pl.fy, pl.M[1] + pl.t[1] * v)) return false;
    return true;
  };
  // the lamp's ray through a standing guard's joint at height h (leg middle) onto the floor
  const shadowAt = (pl, h, v = 0.6) => {
    const gx = pl.M[0] + pl.t[0] * v, gz = pl.M[1] + pl.t[1] * v;
    const k = (pl.L[1] - pl.fy) / (pl.L[1] - pl.fy - h);
    return [pl.L[0] + (gx - pl.L[0]) * k, pl.fy, pl.L[2] + (gz - pl.L[2]) * k];
  };
  // every lit lamp 2.2-4.5 m over its floor within 60 m of the start, 8 directions, the leg 4.5 .. 2.2 m out: the
  // first leg that fits the nav grid (leg, shadow floor, camera, player) per direction; the best lit shadow floor wins
  const tried = { lamps: 0, legs: 0, fit: 0 };
  const top = [];
  // (T1-SHADOW) every leg's hip-shadow offset beyond his feet, R x 0.95 / (lh - 0.95): [offset, lamp, R, lh]
  const hipOffs = [];
  const best = new Map();
  for (let i = 0; i < L.count; i++) {
    const lx = L.spheres[i * 4], ly = L.spheres[i * 4 + 1], lz = L.spheres[i * 4 + 2], reach = L.spheres[i * 4 + 3];
    if (Math.hypot(lx - p0.x, lz - p0.z) > 60 || !L.lampLit(i)) continue;
    tried.lamps++;
    for (let k = 0; k < 16; k++) {
      const a = (k * Math.PI) / 8;
      const s = [Math.sin(a), Math.cos(a)];
      const t = [s[1], -s[0]];
      // the floor under the guard's leg (the lamp's own foot may stand on a table)
      const fy = (() => { for (const r of [3.2, 2.6, 4.0]) { const h = walk(lx + s[0] * r, lz + s[1] * r, Math.max(0, ly - 3.5), 1.2); if (h !== null) return h; } return null; })();
      if (fy === null) continue;
      const lh = ly - fy;
      if (lh < 2.2 || lh > 4.5) break;
      const rMax = Math.sqrt(Math.max(0, reach * reach - (lh - 1) * (lh - 1))) - 0.8;
      for (const R of [6.5, 5.5, 4.5, 3.8, 3.2, 2.6]) {
        if (R > rMax) continue;
        tried.legs++;
        hipOffs.push([(R * 0.95) / (lh - 0.95), i, R, lh]);
        const M = [lx + s[0] * R, lz + s[1] * R];
        const at = (u, v) => [M[0] + s[0] * u + t[0] * v, M[1] + s[1] * u + t[1] * v];
        let ok = true;
        // the leg (A0 -1.0 .. B +3.2 along t, u 0) and the floor his chest and head shadows land on (u 1.6 .. 3.6)
        for (let v = -1.0; v <= 3.21 && ok; v += 0.6) { const q = at(0, v); if (walk(q[0], q[1], fy) === null) ok = false; }
        for (let v = -0.4; v <= 1.61 && ok; v += 1.0) {
          for (const u of [1.6, 2.6, 3.6]) {
            const q = at(u, v);
            if (walk(q[0], q[1], fy, 0.6) === null) { ok = false; break; }
          }
        }
        if (!ok || !clear(at(0, -1.0), at(0, 3.2), fy) || !clear(at(0, 0.6), at(3.6, 0.6), fy) || !clear([lx + s[0] * 0.6, lz + s[1] * 0.6], M, fy)) continue;
        const roofAt = typeof g.world.roofAt === 'function' ? g.world.roofAt(M[0] + s[0] * 2.5, M[1] + s[1] * 2.5) : Infinity;
        const roof = Number.isFinite(roofAt) && roofAt > fy + 1 ? roofAt : fy + 10;
        if (roof - fy < 2.3) continue;
        const pl = { lamp: i, L: [lx, ly, lz], reach, fy, lh, R, s, t, M, A0: at(0, -1.0), B: at(0, 3.2), roof };
        // the camera: slide sideways (along s) until his box is out over the capture (0.2 m before .. 1.6 m past M)
        let c = null;
        for (let side = SIDE0; side < SIDE0 + 5; side += 0.05) {
          const q = camAt(pl, side);
          if (outOver(planes(q), pl)) { c = q; break; }
        }
        if (!c) continue;
        const P = planes(c);
        const hip = ptIn(P, ...shadowAt(pl, 0.95)), knee = ptIn(P, ...shadowAt(pl, 0.5)), chest = ptIn(P, ...shadowAt(pl, 1.35));
        if (needHip && !hip) continue;
        // how much of his silhouette's shadow can be in view: hips, waist, chest, shoulders, head (of 5)
        const parts = [0.95, 1.15, 1.35, 1.45, 1.7].filter((h) => ptIn(P, ...shadowAt(pl, h))).length;
        const cf = at(c.side, 0.6);
        if (parts < 2 || walk(cf[0], cf[1], fy, 0.5) === null || !clear(cf, at(1.0, 0.6), fy)) continue;
        // the player on the lamp's far side, > 4.6 m from the leg
        let pp = null;
        for (const r of [2.2, 1.6, 2.8, 1.0, 3.4]) {
          const q = [lx - s[0] * r, lz - s[1] * r];
          const h = walk(q[0], q[1], fy, 0.5);
          if (h !== null && Math.hypot(q[0] - M[0], q[1] - M[1]) > 4.6) { pp = [q[0], h, q[1]]; break; }
        }
        if (!pp) continue;
        tried.fit++;
        // this lamp's own light where his chest and head shadows land (the shadow takes away only this lamp's share)
        const lf = g.world.lightField;
        const f1 = shadowAt(pl, 1.15), f2 = shadowAt(pl, 1.45);
        const lit = (q) => (lf ? (typeof lf.lampAt === 'function' ? lf.lampAt(i, q[0], fy + 0.05, q[2]) : lf.levelAt(q[0], fy + 0.05, q[2])) : 0);
        const light = (lit(f1) + lit(f2)) / 2;
        // and its share of all the light there: a floor lit mostly by another lamp shows that lamp's shadow instead
        let all = 0;
        if (lf && typeof lf.lampAt === 'function') for (let j = 0; j < L.count; j++) all += (lf.lampAt(j, f1[0], fy + 0.05, f1[2]) + lf.lampAt(j, f2[0], fy + 0.05, f2[2])) / 2;
        else all = light;
        const share = all > 0 ? Math.min(1, light / all) : 0;
        const score = light * parts;
        const cand = { ...pl, player: pp, cam0: c, hipShadowInView: hip, kneeShadowInView: knee, parts, light, share, score };
        top.push([score, i, R, k]);
        if (!best.has(i) || score > best.get(i).score) best.set(i, cand);
      }
    }
  }
  // the best leg per lamp, the 8 best lamps: the run tries each with a stand-in and keeps the darkest shadow
  const cands = [...best.values()].sort((p, q) => q.score - p.score).slice(0, 8);
  if (!cands.length) {
    const hipTop = hipOffs.sort((p, q) => q[0] - p[0]).slice(0, 5).map((q) => `#${q[1]} R ${q[2]} lh ${q[3].toFixed(2)}: ${q[0].toFixed(2)} m`);
    throw new Error(`no lamp fits (${tried.lamps} lamps, ${tried.legs} legs tried)${needHip ? `; --need=hip: best hip-shadow offsets tried (need ~2.3 m) ${hipTop.join(', ') || 'none'}` : ''}`);
  }
  const pick = cands[Math.min(cands.length - 1, Math.max(0, choice | 0))];
  pick.choice = Math.min(cands.length - 1, Math.max(0, choice | 0));
  pick.cands = cands.map((q) => `#${q.lamp} R ${q.R} (${q.score.toFixed(2)})`);
  pick.tried = tried;
  pick.top = top.sort((p, q) => q[0] - p[0]).slice(0, 5).map((q) => `#${q[1]} R ${q[2]} dir ${q[3]}: ${q[0].toFixed(3)}`);
  g.player.controller.teleport(new V(pick.player[0], pick.player[1] + 0.02, pick.player[2]), Math.atan2(-pick.s[0], -pick.s[1]));
  const c = camGiven ?? pick.cam0;
  window.__t1cam = c;
  const apply = () => {
    const q = window.__t1cam;
    if (!q) return;
    cam.position.set(q.pos[0], q.pos[1], q.pos[2]);
    cam.setTarget(new V(q.target[0], q.target[1], q.target[2]));
    cam.fov = q.fov;
  };
  const pl = g.player;
  if (!pl.__t1wrap) {
    const orig = pl.frameUpdate;
    pl.frameUpdate = function (...a) { const r = orig.apply(this, a); apply(); return r; };
    pl.__t1wrap = true;
    g.scene.onBeforeRenderObservable.add(apply);
  }
  apply();
  pick.cam = c;
  pick.viewport = [vw, vh];
  pick.slots = cs ? cs.slotCount : 0;
  return pick;
}

/** A stand-in guard in the middle of the view (shaders and shadow-map effects compile while the loop runs); returns
 *  whether his tracked body was drawn (the seen test works on this build). */
function pageDummy([pick, phase]) {
  const g = window.__app.current;
  const em = g.enemyMgr;
  const V = g.player.position.constructor;
  if (phase === 'spawn') {
    const c = window.__t1cam;
    // in view, 1 m in from his side's edge, on the line of his capture: his shadow where the real guard's will be
    const k = c.side - 1.0;
    const x = pick.M[0] + pick.s[0] * k + pick.t[0] * 0.6, z = pick.M[1] + pick.s[1] * k + pick.t[1] * 0.6;
    const e = em.spawn('grunt', new V(x, pick.fy, z), false, Math.atan2(pick.s[0], pick.s[1]));
    if (!e) throw new Error('the stand-in guard did not spawn');
    e.passive = true;
    window.__t1dummy = e;
    return { at: [x, z] };
  }
  const e = window.__t1dummy;
  const cv = window.__app.engine.getRenderingCanvas();
  // (T1-SHADOW) camera-drawn, not "seen" (which the shadow rule also sets): `camFrame`, `frame` on older builds
  const sd = e?.animTier?.seen;
  const seen = !!sd && (sd.camFrame ?? sd.frame) === g.scene.getFrameId();
  const mesh = e?.animTier?.seen?.mesh?.name ?? null;
  // the stand-in in view: what a guard's shadow looks like at this spot (render one frame, copy it in the same task)
  g.scene.render();
  const c2 = document.createElement('canvas');
  c2.width = Math.round(cv.width / 2); c2.height = Math.round(cv.height / 2);
  const x2 = c2.getContext('2d', { willReadFrequently: true });
  x2.drawImage(cv, 0, 0, c2.width, c2.height);
  const view = c2.toDataURL('image/png');
  // and his shadow alone: the same frame with him hidden, the difference (white = unchanged, x8; 3+ levels counted)
  const withHim = x2.getImageData(0, 0, c2.width, c2.height);
  let shadowPx = 0;
  let shadowView = null;
  if (e) {
    e.rig.root.setEnabled(false);
    g.scene.render();
    x2.drawImage(cv, 0, 0, c2.width, c2.height);
    const without = x2.getImageData(0, 0, c2.width, c2.height);
    e.rig.root.setEnabled(true);
    const d = x2.createImageData(c2.width, c2.height);
    const L = (q, k) => 0.2126 * q[k] + 0.7152 * q[k + 1] + 0.0722 * q[k + 2];
    for (let k = 0; k < d.data.length; k += 4) {
      const dl = L(without.data, k) - L(withHim.data, k);
      if (dl >= 3) shadowPx++;
      const v = Math.max(0, Math.min(255, 255 - Math.abs(dl) * 8));
      d.data[k] = v; d.data[k + 1] = v; d.data[k + 2] = v; d.data[k + 3] = 255;
    }
    x2.putImageData(d, 0, 0);
    shadowView = c2.toDataURL('image/png');
  }
  if (e) em.despawn(e);
  window.__t1dummy = null;
  return { seen, mesh, ready: g.scene.isReady(), view, shadowView, shadowPx };
}

/** Stop the render loop, spawn the guard at A0 walking to B, step `warm` frames (or until he walks: 0.9 m and 0.7 m/s),
 *  then (no camera given) push the camera sideways until no enabled mesh of his is in its frustum. */
async function pageStart([pick, fps, warmGiven]) {
  const app = window.__app;
  const g = app.current;
  const em = g.enemyMgr;
  const scene = g.scene;
  const V = g.player.position.constructor;
  app.engine.stopRenderLoop();
  // the view without him (the baseline): his shadow is what a capture frame has darker than this
  scene.render();
  {
    const cv = app.engine.getRenderingCanvas();
    const b = document.createElement('canvas');
    b.width = cv.width; b.height = cv.height;
    const bx = b.getContext('2d', { willReadFrequently: true });
    bx.drawImage(cv, 0, 0);
    window.__t1base = bx.getImageData(0, 0, cv.width, cv.height);
  }
  const e = em.spawn('grunt', new V(pick.A0[0], pick.fy, pick.A0[1]), false, Math.atan2(pick.t[0], pick.t[1]));
  if (!e) throw new Error('the guard did not spawn');
  e.passive = true;
  e.setPatrol({ points: [pick.B, pick.A0], wait: 2, pingPong: true });
  window.__t1guard = e;
  const ms = 1000 / fps;
  const along = () => (e.pos.x - pick.A0[0]) * pick.t[0] + (e.pos.z - pick.A0[1]) * pick.t[1];
  let w = 0;
  const max = warmGiven ?? Math.round(fps * 6);
  for (; w < max; w++) {
    if (warmGiven === null && along() >= 0.9 && Math.hypot(e.vel.x, e.vel.z) > 0.7) break;
    app.loop.frame(ms);
    await new Promise((r) => setTimeout(r, 0));
  }
  const meshes = () => e.rig.root.getChildMeshes(false).filter((m) => m.isEnabled() && m.isVisible && m.getTotalVertices() > 0);
  const cam = scene.activeCamera;
  const inView = () => meshes().filter((m) => cam.isInFrustum(m)).map((m) => m.name);
  let nudged = 0;
  if (!pick.camFixed) {
    const c = window.__t1cam;
    for (let k = 0; k < 40 && inView().length; k++) {
      c.pos[0] += pick.s[0] * 0.05; c.pos[2] += pick.s[1] * 0.05;
      c.target[0] += pick.s[0] * 0.05; c.target[2] += pick.s[1] * 0.05;
      c.side += 0.05;
      cam.position.set(c.pos[0], c.pos[1], c.pos[2]);
      cam.setTarget(new V(c.target[0], c.target[1], c.target[2]));
      cam.getViewMatrix(true);
      nudged++;
    }
  }
  const tracked = e.animTier?.seen?.mesh;
  return { warm: w, along: along(), speed: Math.hypot(e.vel.x, e.vel.z), pos: [e.pos.x, e.pos.y, e.pos.z], num: e.num, kind: e.def?.id ?? e.def?.name ?? 'grunt', tracked: tracked?.name ?? null, inViewNow: inView(), nudged, cam: window.__t1cam, meshes: meshes().length };
}

/** n frames by hand: the loop's own frame at 1000 / fps ms, then the crop and the numbers; returns per frame data. */
async function pageCapture([pick, fps, n, crop]) {
  const app = window.__app;
  const g = app.current;
  const scene = g.scene;
  const e = window.__t1guard;
  const canvas = app.engine.getRenderingCanvas();
  const cs = g.world.charShadows;
  const cam = scene.activeCamera;
  const proj = () => cam.getViewMatrix().multiply(cam.getProjectionMatrix()).m;
  const toScreen = (m, x, y, z) => {
    const cx = x * m[0] + y * m[4] + z * m[8] + m[12], cy = x * m[1] + y * m[5] + z * m[9] + m[13], cw = x * m[3] + y * m[7] + z * m[11] + m[15];
    return cw > 0 ? [(cx / cw + 1) / 2, (1 - cy / cw) / 2] : null;
  };
  // the crop: the floor his shadow can cover over the capture (from the lamp's side of his feet to the head's shadow)
  if (!crop) {
    const m = proj();
    const lh = pick.L[1] - pick.fy;
    const headLen = Math.min(4.5, (pick.R * 1.8) / Math.max(0.3, lh - 1.8));
    const travel = (1.1 * n) / fps + 0.3;
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (const u of [-0.4, 0, 1, 2, 3, headLen]) {
      for (const v of [-0.6, travel + 0.6]) {
        const q = toScreen(m, e.pos.x + pick.s[0] * u + pick.t[0] * v, pick.fy, e.pos.z + pick.s[1] * u + pick.t[1] * v);
        if (!q) continue;
        x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]);
      }
    }
    const pad = 0.03;
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(1, x1 + pad); y1 = Math.min(1, y1 + pad);
    if (!(x1 - x0 > 0.05 && y1 - y0 > 0.05)) { x0 = 0; y0 = 0; x1 = 1; y1 = 1; }
    crop = [x0, y0, x1, y1];
  }
  const sx = Math.round(crop[0] * canvas.width), sy = Math.round(crop[1] * canvas.height);
  const sw = Math.max(8, Math.round((crop[2] - crop[0]) * canvas.width)), sh = Math.max(8, Math.round((crop[3] - crop[1]) * canvas.height));
  const c2 = document.createElement('canvas');
  c2.width = sw; c2.height = sh;
  const x2 = c2.getContext('2d', { willReadFrequently: true });
  const base = window.__t1base;
  const cd = document.createElement('canvas');
  cd.width = sw; cd.height = sh;
  const xd = cd.getContext('2d');
  const dimg = xd.createImageData(sw, sh);
  const lum = (d, k) => 0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2];
  const ms = 1000 / fps;
  const rig = e.rig;
  const J = { hipL: rig.hipL, hipR: rig.hipR, kneeL: rig.kneeL, kneeR: rig.kneeR, ankleL: rig.ankleL, ankleR: rig.ankleR, shoulderL: rig.shoulderL, shoulderR: rig.shoulderR, neck: rig.neck };
  const ly = pick.L[1];
  const shadowOf = (p) => {
    const k = (ly - pick.fy) / Math.max(0.05, ly - p.y);
    return [pick.L[0] + (p.x - pick.L[0]) * k, pick.fy, pick.L[2] + (p.z - pick.L[2]) * k];
  };
  const out = [];
  let view = null;
  for (let i = 0; i < n; i++) {
    app.loop.frame(ms);
    const fid = scene.getFrameId();
    x2.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    const png = c2.toDataURL('image/png');
    // his shadow alone: how much darker than the baseline (white = unchanged, x8), and the pixels 3+ levels darker
    let shadowPx = 0;
    if (base) {
      const cur = x2.getImageData(0, 0, sw, sh).data;
      const bd = base.data, dd = dimg.data;
      for (let yy = 0; yy < sh; yy++) {
        for (let xx = 0; xx < sw; xx++) {
          const k = (yy * sw + xx) * 4, kb = ((sy + yy) * base.width + sx + xx) * 4;
          const dl = lum(bd, kb) - lum(cur, k);
          if (dl >= 3) shadowPx++;
          const v = Math.max(0, Math.min(255, 255 - Math.max(0, dl) * 8));
          dd[k] = v; dd[k + 1] = v; dd[k + 2] = v; dd[k + 3] = 255;
        }
      }
      xd.putImageData(dimg, 0, 0);
    }
    const diff = base ? cd.toDataURL('image/png') : null;
    if (i === 0) {
      // the whole view (half size) with the crop outlined: where the sheet's tiles come from
      const cv = document.createElement('canvas');
      cv.width = Math.round(canvas.width / 2); cv.height = Math.round(canvas.height / 2);
      const xv = cv.getContext('2d');
      xv.drawImage(canvas, 0, 0, cv.width, cv.height);
      xv.strokeStyle = '#ffb040'; xv.lineWidth = 2;
      xv.strokeRect(sx / 2, sy / 2, sw / 2, sh / 2);
      view = cv.toDataURL('image/png');
    }
    rig.root.computeWorldMatrix(true);
    const j = {};
    const m = proj();
    let shIn = 0;
    for (const [k, node] of Object.entries(J)) {
      node.computeWorldMatrix(true);
      const p = node.getAbsolutePosition();
      const s = shadowOf(p);
      const q = toScreen(m, s[0], s[1], s[2]);
      if (q && q[0] >= 0 && q[0] <= 1 && q[1] >= 0 && q[1] <= 1) shIn++;
      j[k] = [p.x, p.y, p.z, s[0], s[2]];
    }
    const seen = e.animTier.seen;
    out.push({
      i,
      fid,
      solved: !e.animTier.skipped,
      // (T1-SHADOW) drawn by the camera (`camFrame`; `frame` on older builds), and seen by the shadow rule
      drawn: !!seen && (seen.camFrame ?? seen.frame) === fid,
      shadowSeen: !!seen && seen.shadowFrame === fid,
      inFrustum: e.rig.root.getChildMeshes(false).filter((mm) => mm.isEnabled() && mm.isVisible && mm.getTotalVertices() > 0 && cam.isInFrustum(mm)).length,
      slot: cs ? cs.picker.slotOf(pick.lamp) : -1,
      pos: [e.pos.x, e.pos.y, e.pos.z],
      root: [rig.root.position.x, rig.root.position.z],
      j,
      shadowPtsInView: shIn,
      shadowPx,
      png,
      diff,
    });
    await new Promise((r) => setTimeout(r, 0));
  }
  return { crop, size: [sw, sh], canvas: [canvas.width, canvas.height], frames: out, view };
}

/** Contact sheet in a blank page: rows of tiles with labels; `rows` = [{ label, tiles: [{ png, tag }] }]. */
async function pageSheet([title, rows, perRow, tileW, gain]) {
  const load = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  const first = await load(rows[0].tiles[0].png);
  const tw = Math.min(tileW, first.width), th = Math.round((first.height * tw) / first.width);
  const lab = 150, head = 30, gap = 4, tag = 16;
  const lines = [];
  for (const r of rows) for (let k = 0; k < r.tiles.length; k += perRow) lines.push({ label: k === 0 ? r.label : '', tiles: r.tiles.slice(k, k + perRow), k, sep: r.sep && k === 0 });
  const W = lab + perRow * (tw + gap) + gap, Hh = head + lines.length * (th + tag + gap) + gap;
  const c = document.createElement('canvas');
  c.width = W; c.height = Hh;
  const x = c.getContext('2d');
  x.fillStyle = '#111'; x.fillRect(0, 0, W, Hh);
  x.fillStyle = '#eee'; x.font = 'bold 15px sans-serif'; x.fillText(title, 8, 20);
  let y = head;
  for (const ln of lines) {
    if (ln.sep) { x.fillStyle = '#555'; x.fillRect(0, y - 3, W, 1); }
    x.fillStyle = '#ddd'; x.font = '13px sans-serif';
    ln.label.split('\n').forEach((t, q) => x.fillText(t, 6, y + 16 + q * 16));
    for (let k = 0; k < ln.tiles.length; k++) {
      const t = ln.tiles[k];
      const im = await load(t.png);
      const px = lab + gap + k * (tw + gap);
      x.filter = gain > 1.01 ? `brightness(${gain})` : 'none';
      x.drawImage(im, px, y + tag, tw, th);
      x.filter = 'none';
      x.fillStyle = t.hot ? '#ffb040' : '#9ab';
      x.font = '12px monospace';
      x.fillText(t.tag, px + 2, y + 12);
      if (t.hot) { x.strokeStyle = '#ffb040'; x.lineWidth = 2; x.strokeRect(px + 1, y + tag + 1, tw - 2, th - 2); }
    }
    y += th + tag + gap;
  }
  return c.toDataURL('image/png');
}

/** A display gain for the sheets (Marlow Yard is dark): the 98th percentile of the tile's luminance to 200, at most x6. */
async function pageGain(png) {
  const im = await new Promise((res, rej) => { const q = new Image(); q.onload = () => res(q); q.onerror = rej; q.src = png; });
  const c = document.createElement('canvas');
  c.width = im.width; c.height = im.height;
  const x = c.getContext('2d');
  x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  const h = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) h[Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2])]++;
  let n = 0, p98 = 255;
  for (let v = 0; v < 256; v++) { n += h[v]; if (n >= 0.98 * (d.length / 4)) { p98 = v; break; } }
  return Math.max(1, Math.min(6, 200 / Math.max(1, p98)));
}

/** The image with the display gain applied (whole-view pictures). */
async function pageGained([png, gain]) {
  const im = await new Promise((res, rej) => { const q = new Image(); q.onload = () => res(q); q.onerror = rej; q.src = png; });
  const c = document.createElement('canvas');
  c.width = im.width; c.height = im.height;
  const x = c.getContext('2d');
  x.filter = `brightness(${gain})`;
  x.drawImage(im, 0, 0);
  return c.toDataURL('image/png');
}

/** Where two frames differ (the tier pass against the full pass): mean |difference| (levels) and pixels 3+ levels apart. */
async function pageDiffPair([a, b]) {
  const ld = (src) => new Promise((res, rej) => { const q = new Image(); q.onload = () => res(q); q.onerror = rej; q.src = src; });
  const [A, B] = [await ld(a), await ld(b)];
  const c = document.createElement('canvas');
  c.width = A.width; c.height = A.height;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(A, 0, 0);
  const da = x.getImageData(0, 0, c.width, c.height).data;
  x.drawImage(B, 0, 0);
  const db = x.getImageData(0, 0, c.width, c.height).data;
  let sum = 0, big = 0;
  for (let i = 0; i < da.length; i += 4) {
    const d = Math.abs(da[i] + da[i + 1] + da[i + 2] - db[i] - db[i + 1] - db[i + 2]) / 3;
    sum += d;
    if (d >= 3) big++;
  }
  return { mean: sum / (da.length / 4), big };
}

// ---------- the run ----------
const savePng = (file, dataUrl) => writeFileSync(file, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
const hyp = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
mkdirSync(join(OUT, 'frames'), { recursive: true });
const run = { sha: sha8, gfx: GFX, viewport: [VW, VH], gpu: GPU, frames: N, fps: FPS, query: BASE, passes: [] };
if (!GPU) log('E2E_GPU is not 1: software GL, a dry run (the picture is not a look result)');

let SCENE_CHOICE = null;
async function pass(fps, mode, shared) {
  const params = mode === 'full' ? `${BASE}&animtier=0` : mode === 'cam' ? `${BASE}&animshadow=0` : BASE;
  log(`${fps} fps ${mode}: boot (${params})`);
  const l = await launch({ url: URL, params, viewport: { width: VW, height: VH } });
  browser = l.browser;
  const page = l.page;
  try {
    await page.waitForFunction(() => window.__app?.current?.player && window.__app.current.enemyMgr && window.__app.current.world?.lamps, null, { timeout: 180_000 });
    await page.waitForTimeout(1500);
    // the scene: the first pass tries the 8 best lamps with a stand-in in view and keeps the one whose shadow darkens
    // the most pixels; the later passes take that choice
    let choice = shared?.choice ?? SCENE_CHOICE;
    if (choice === null) {
      const n = (await page.evaluate(pageSelect, [VW, VH, null, 0, NEED_HIP])).cands.length;
      let bestPx = -1;
      const tried = [];
      for (let k = 0; k < n; k++) {
        const pk = await page.evaluate(pageSelect, [VW, VH, null, k, NEED_HIP]);
        await page.evaluate(pageDummy, [pk, 'spawn']);
        await page.waitForTimeout(GPU ? 1500 : 4000);
        const d = await page.evaluate(pageDummy, [pk, 'check']);
        // the stand-in's shadow pixels weighted by how much of the silhouette's shadow the real capture can show
        const w = d.shadowPx * pk.parts;
        tried.push(`#${pk.lamp} R ${pk.R}: ${d.shadowPx} px x ${pk.parts}`);
        if (w > bestPx) { bestPx = w; choice = k; }
      }
      SCENE_CHOICE = choice;
      log(`${fps} fps ${mode}: stand-in shadow per lamp (body + shadow px at half size): ${tried.join(', ')}; keeps ${choice}`);
    }
    const pick = await page.evaluate(pageSelect, [VW, VH, shared?.cam ?? null, choice, NEED_HIP]);
    if (shared) pick.camFixed = true;
    log(`${fps} fps ${mode}: lamp #${pick.lamp} leg ${pick.R} m out, lamp light on the shadow ${pick.light.toFixed(2)}, ${Math.round(pick.share * 100)}% of the lamps' light there (${pick.tried.fit} legs fit of ${pick.tried.legs}, ${pick.tried.lamps} lamps; candidates ${pick.cands.join(', ')}; this ${pick.choice}; ${pick.parts}/5 silhouette parts' shadows in view), camera ${pick.cam0.side.toFixed(2)} m to the side; hip / knee shadow in view ${pick.hipShadowInView} / ${pick.kneeShadowInView}`);
    await page.evaluate(pageDummy, [pick, 'spawn']);
    // compile: the real loop runs with the stand-in in view until the scene is ready (40 s cap), then 1.5 s more
    await page.waitForFunction(() => window.__app.current.scene.isReady(), null, { timeout: 20_000, polling: 250 }).catch(() => log('scene not ready after 20 s (going on)'));
    await page.waitForTimeout(1500);
    const dummy = await page.evaluate(pageDummy, [pick, 'check']);
    if (SELECT_ONLY) {
      // --select-only: the scene pick and the stand-in's view, nothing captured
      const gain = await page.evaluate(pageGain, dummy.view);
      savePng(join(OUT, 'standin.png'), await page.evaluate(pageGained, [dummy.view, gain]));
      if (dummy.shadowView) savePng(join(OUT, 'standin-shadow.png'), dummy.shadowView);
      log(`select only: stand-in body drawn ${dummy.seen}, his shadow + body ${dummy.shadowPx} px; ${join(OUT, 'standin.png')}`);
      return null;
    }
    const start = await page.evaluate(pageStart, [pick, fps, shared?.warm ?? null]);
    const cap = await page.evaluate(pageCapture, [pick, fps, N, shared?.crop ?? null]);
    const errs = l.errors.filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
    return { pick, dummy, start, cap, errors: errs.slice(0, 5) };
  } finally {
    await browser.close().catch(() => {});
    browser = null;
  }
}

/** The planted-foot slide (cm): per frame the ankle that moved least (world, horizontal); and the ankle-shadow step. */
function footStats(frames) {
  const slide = [], shStep = [];
  for (let k = 1; k < frames.length; k++) {
    const a = frames[k - 1].j, b = frames[k].j;
    const dL = hyp([a.ankleL[0], a.ankleL[2]], [b.ankleL[0], b.ankleL[2]]), dR = hyp([a.ankleR[0], a.ankleR[2]], [b.ankleR[0], b.ankleR[2]]);
    slide.push(Math.min(dL, dR) * 100);
    shStep.push(Math.max(hyp([a.ankleL[3], a.ankleL[4]], [b.ankleL[3], b.ankleL[4]]), hyp([a.ankleR[3], a.ankleR[4]], [b.ankleR[3], b.ankleR[4]])) * 100);
  }
  const mean = (x) => (x.length ? x.reduce((p, q) => p + q, 0) / x.length : 0);
  const solvedSteps = shStep.filter((_, k) => frames[k + 1].solved), skipSteps = shStep.filter((_, k) => !frames[k + 1].solved);
  return { slideMean: mean(slide), slideMax: Math.max(0, ...slide), shadowStepMean: mean(shStep), shadowStepMax: Math.max(0, ...shStep), shadowStepOnSolve: mean(solvedSteps), shadowStepOnSkip: mean(skipSteps) };
}

const sheets = [];
try {
  for (const fps of FPS) {
    let tier = await pass(fps, 'tier', null);
    if (!tier) { stopServer(); process.exit(0); }
    // the camera moved after the warm-up (his real meshes were in its frustum): run the tier pass again with that camera
    // from the start, so both passes warm up and capture under one camera
    if (tier.start.nudged) {
      log(`${fps} fps tier: camera nudged ${tier.start.nudged} x 5 cm after the warm-up; again with the final camera`);
      tier = await pass(fps, 'tier', { cam: tier.start.cam, warm: tier.start.warm, crop: null, choice: tier.pick.choice });
    }
    const full = await pass(fps, 'full', { cam: tier.start.cam, warm: tier.start.warm, crop: tier.cap.crop, choice: tier.pick.choice });
    // (T1-SHADOW) the camera-only rule (`&animshadow=0`): the same spot must reproduce the slide
    const camOnly = await pass(fps, 'cam', { cam: tier.start.cam, warm: tier.start.warm, crop: tier.cap.crop, choice: tier.pick.choice });
    for (const [mode, r] of [['tier', tier], ['full', full], ['cam', camOnly]]) {
      const f = r.cap.frames;
      f.forEach((fr, k) => {
        savePng(join(OUT, 'frames', `${fps}-${mode}-${String(k).padStart(3, '0')}.png`), fr.png);
        if (fr.diff) savePng(join(OUT, 'frames', `${fps}-${mode}-${String(k).padStart(3, '0')}-shadow.png`), fr.diff);
      });
      const st = footStats(f);
      const solved = f.filter((fr) => fr.solved).map((fr) => fr.i);
      const drawn = f.filter((fr) => fr.drawn || fr.inFrustum).map((fr) => fr.i);
      const shadowSeen = f.filter((fr) => fr.shadowSeen).map((fr) => fr.i);
      const p = r.pick;
      if (mode === 'tier') {
        log(`scene: ${MAP_NAME}, lamp #${p.lamp} at (${p.L.map((v) => v.toFixed(2)).join(', ')}), ${p.lh.toFixed(2)} m over the floor, reach ${p.reach.toFixed(2)} m, lamp light on the shadow ${p.light.toFixed(2)} (${Math.round(p.share * 100)}% of the lamps' light there); guard leg ${p.R.toFixed(2)} m out, walking (${p.t.map((v) => v.toFixed(2)).join(', ')}); player at (${p.player.map((v) => v.toFixed(1)).join(', ')}); char-shadow slots ${p.slots}`);
        log(`camera (${r.start.cam.pos.map((v) => v.toFixed(2)).join(', ')}) -> (${r.start.cam.target.map((v) => v.toFixed(2)).join(', ')}), fov ${r.start.cam.fov}, ${r.start.cam.side.toFixed(2)} m to the shadow side of his line (nudged ${r.start.nudged} x 5 cm); hip / knee shadow in view (geometry) ${p.hipShadowInView} / ${p.kneeShadowInView}`);
        log(`stand-in guard in view: body drawn ${r.dummy.seen} (${r.dummy.mesh}; the seen test works), his body + shadow ${r.dummy.shadowPx} px at half size, scene ready ${r.dummy.ready}`);
      }
      log(`${fps} fps ${mode}: guard #${r.start.num} (${r.start.kind}, tracked mesh ${r.start.tracked}), warm-up ${r.start.warm} frames, at ${r.start.along.toFixed(2)} m along his leg, ${r.start.speed.toFixed(2)} m/s, pos (${r.start.pos.map((v) => v.toFixed(3)).join(', ')}); his meshes in the frustum at the start: ${r.start.inViewNow.length ? r.start.inViewNow.join(' ') : 'none'}`);
      log(`${fps} fps ${mode}: ${f.length} frames, pose solved on [${solved.join(' ')}]; body drawn on [${drawn.join(' ') || 'none'}]; shadow-seen on [${shadowSeen.join(' ') || 'none'}]; lamp slot ${[...new Set(f.map((fr) => fr.slot))].join('/')}; ankle/knee/hip shadow points in view ${Math.min(...f.map((fr) => fr.shadowPtsInView))}-${Math.max(...f.map((fr) => fr.shadowPtsInView))} of ${Object.keys(f[0]?.j ?? {}).length} (ankles, knees, hips, shoulders, neck); his shadow in the crop ${Math.min(...f.map((fr) => fr.shadowPx))}-${Math.max(...f.map((fr) => fr.shadowPx))} px (3+ levels darker than the view without him)`);
      log(`${fps} fps ${mode}: planted-foot slide mean ${st.slideMean.toFixed(1)} cm, max ${st.slideMax.toFixed(1)} cm per frame; ankle-shadow step mean ${st.shadowStepMean.toFixed(1)} cm, max ${st.shadowStepMax.toFixed(1)} cm (on solve frames ${st.shadowStepOnSolve.toFixed(1)}, on skipped ${st.shadowStepOnSkip.toFixed(1)})`);
      if (r.errors.length) log(`${fps} fps ${mode}: console errors: ${r.errors.join(' | ').slice(0, 400)}`);
      run.passes.push({ fps, mode, pick: r.pick, dummy: { ...r.dummy, view: undefined, shadowView: undefined }, start: r.start, crop: r.cap.crop, size: r.cap.size, canvas: r.cap.canvas, stats: st, solved, drawn, shadowSeen, errors: r.errors, frames: f.map(({ png, diff, ...rest }) => rest) });
    }
    sheets.push({ fps, tier, full, cam: camOnly });
  }
  // the sheets (one blank page)
  const lo = launchOptions();
  browser = await chromium.launch(lo);
  const sp = await browser.newPage();
  await sp.setContent('<html><body></body></html>');
  const perRow = Math.min(12, N);
  for (const { fps, tier, full, cam } of sheets) {
    const tiles = (r) => r.cap.frames.map((fr) => ({ png: fr.png, tag: `${String(fr.i).padStart(2, '0')} ${fr.solved ? 'S' : '.'}${fr.drawn || fr.inFrustum ? ' DRAWN' : ''}`, hot: fr.solved }));
    const gain = await sp.evaluate(pageGain, tier.cap.frames[0].png);
    // the two passes frame by frame: where the tier rule's picture differs from full rate (his stale pose, nothing else)
    const pair = [];
    for (let k = 0; k < Math.min(tier.cap.frames.length, full.cap.frames.length); k++) pair.push(await sp.evaluate(pageDiffPair, [tier.cap.frames[k].png, full.cap.frames[k].png]));
    log(`${fps} fps: tier vs full, pixels 3+ levels apart per frame [${pair.map((q) => q.big).join(' ')}] of ${tier.cap.size[0] * tier.cap.size[1]} (mean ${(pair.reduce((p, q) => p + q.mean, 0) / Math.max(1, pair.length)).toFixed(3)} levels)`);
    run.passes.filter((q) => q.fps === fps).forEach((q) => { q.tierVsFull = pair; });
    const head = `guard-ai T1 shadow look, ${sha8}, ${MAP_NAME}, ${GFX} ${VW}x${VH}, ${fps} fps, guard #${tier.start.num} off-view (S = pose solved, . = skipped), display gain x${gain.toFixed(1)}${GPU ? '' : ', SOFTWARE GL DRY RUN'}`;
    for (const [mode, r] of [['tier', tier], ['full', full], ['cam', cam]]) {
      if (r.cap.view) savePng(join(OUT, `${fps}-${mode}-view.png`), await sp.evaluate(pageGained, [r.cap.view, gain]));
      if (r.dummy.view) savePng(join(OUT, `${fps}-${mode}-standin.png`), await sp.evaluate(pageGained, [r.dummy.view, gain]));
      if (r.dummy.shadowView) savePng(join(OUT, `${fps}-${mode}-standin-shadow.png`), r.dummy.shadowView);
    }
    for (const [mode, r] of [['tier', tier], ['full', full], ['cam', cam]]) {
      const label = mode === 'tier' ? 'tier rule\n(default URL)' : mode === 'full' ? 'full rate\n(&animtier=0)' : 'camera only\n(&animshadow=0)';
      savePng(join(OUT, `${fps}-${mode}.png`), await sp.evaluate(pageSheet, [head, [{ label, tiles: tiles(r) }], perRow, 240, gain]));
    }
    // compare: tier row over full row, per chunk of frames
    const rows = [];
    for (let k = 0; k < N; k += perRow) {
      rows.push({ label: `tier rule\nframes ${k}-${Math.min(N, k + perRow) - 1}`, tiles: tiles(tier).slice(k, k + perRow), sep: true });
      rows.push({ label: 'full rate', tiles: tiles(full).slice(k, k + perRow) });
      rows.push({ label: 'camera only', tiles: tiles(cam).slice(k, k + perRow) });
    }
    savePng(join(OUT, `${fps}-compare.png`), await sp.evaluate(pageSheet, [head, rows, perRow, 240, gain]));
    // the shadow alone (each frame against the view without him, x8): the freeze and the snap without the floor
    const dtiles = (r) => r.cap.frames.map((fr) => ({ png: fr.diff ?? fr.png, tag: `${String(fr.i).padStart(2, '0')} ${fr.solved ? 'S' : '.'}`, hot: fr.solved }));
    const drows = [];
    for (let k = 0; k < N; k += perRow) {
      drows.push({ label: `tier rule
frames ${k}-${Math.min(N, k + perRow) - 1}`, tiles: dtiles(tier).slice(k, k + perRow), sep: true });
      drows.push({ label: 'full rate', tiles: dtiles(full).slice(k, k + perRow) });
      drows.push({ label: 'camera only', tiles: dtiles(cam).slice(k, k + perRow) });
    }
    savePng(join(OUT, `${fps}-shadow.png`), await sp.evaluate(pageSheet, [`${head.replace(/, display gain x[0-9.]+/, '')}: his shadow alone (darker than the view without him, x8)`, drows, perRow, 240, 1]));
  }
  await browser.close();
  browser = null;
} catch (e) {
  writeFileSync(join(OUT, 'run.json'), JSON.stringify(run, null, 1));
  await fail(String(e?.stack ?? e));
}
writeFileSync(join(OUT, 'run.json'), JSON.stringify(run, null, 1));
clearTimeout(kill);
log(`wrote ${FPS.map((f) => `${f}-tier.png ${f}-full.png ${f}-cam.png ${f}-compare.png ${f}-shadow.png`).join(' ')}, frames/ and run.json to ${OUT}`);
stopServer();
process.exit(0);
