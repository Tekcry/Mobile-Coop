// Guard cap measure (feature/guard-cap, ROADMAP "Guard cap"): what each AWAKE guard costs per frame, sim vs render, so
// the cap option can be picked from numbers (dormant guards / AI LOD + shared raycasts / guard LOD + fewer shadows).
// Report only: no game change. Every timer is a page-side wrapper installed by this script (monkey-patched methods with
// performance.now() accumulators), never src instrumentation.
//
// Per map x count (a fresh browser each): boot the map, remove its own guards, spawn exactly N awake guards (kind
// `grunt` unless --kind) in walkable cells spread over a wedge in front of the camera (5-24 m, nav line of sight from
// the player preferred, any walkable cell round the player as the fallback, so a map with few or no guard slots still
// gets N: the guards are spawned, not taken from the map's slots), raise the live cap to N, then measure four cells:
//   patrol / facing : every guard on a short 2-point patrol, `passive` (the full perception runs every think: the three
//                     line-of-sight rays, the light read, the body check; the meter never fills, so they stay unaware)
//   patrol / away   : the same guards, the camera turned 180 degrees (render only: the guards culled from the main pass)
//   alert  / facing : every guard alerted (stealth rules: they chase, take cover, shoot; the player takes no damage)
// Each cell: warm up --warm real seconds, then
//   sim    : `loop.stepHeadless(1/60)` x (--secs x 60) twice: clean (no wrappers: the true step cost) and instrumented
//            (the split below); per step median / p95 / mean of each bucket
//   render : --secs real seconds of the real rAF loop, clean (frame interval, frame CPU, the loop's own sim / physics
//            ms, scene.render() CPU ms, GPU ms from EXT_disjoint_timer_query_webgl2 around scene.render when the driver
//            exposes it), then 2 s counted (draw calls and triangles over every pass, shadow-map passes per frame,
//            active meshes, active-mesh evaluation ms). Skipped for patrol/away's sim (identical to facing).
// Sim buckets (inclusive; a nested one is part of its parent): step.total, step.fixed (GameState.fixedUpdate),
// step.physics (Havok step), step.frame (frameUpdate: animation, camera); ai.manager (EnemyManager.update) > ai.brain
// (Enemy.update, all guards) > ai.perceive / ai.decide / ai.move; ai.torches (flashlight hand-out and beam rays);
// ai.anim (EnemyManager.frameUpdate: the guards' rigs); nav.findPath / nav.lineClear / nav.flowField; ray.perceive /
// ray.torch / ray.ai (other guard rays) / ray.other (player, weapons): physics raycastToRef calls and ms; light.totalAt.
// Render extras: the light rig's shadow pool size and the shadow casters lit, flashlights on, guards per alert level.
//
// Usage (the laptop, port 4189, after `npm ci` + `npm run build`, from the repo root; headless, never headed; ~2 min per
// map x count):
//   E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap.mjs [--maps=sectorops,ctcourse] [--counts=12,16,24] [--warm=5]
//     [--secs=10] [--out=docs/guard-cap] [--gfx=epic] [--viewport=1920x1080] [--kind=grunt] [--cells=patrol,away,alert]
//   --counts=0,12,16,24 adds the no-guard baseline (recommended: per-guard cost = slope). --maps also takes `<mapId>:<mode>`.
//   Exits at once without E2E_GPU=1 unless --software is given (a software-GL dry run: not a perf result). --warm is
//   raised to at least 5 s. The live cap `em.maxAlive` is set to N for the measure (MAX_ALIVE 12 / Sector Ops 32).
// Serves dist/ itself with `vite preview` on E2E_PORT (as scripts/run-e2e.mjs) when nothing answers there; reuses a
// server only when it serves this dist/index.html. Browser: e2e-lib's `launch` (headless, the e2e runner's GPU flags).
// E2E_UNCAP=1 is set by default (no vsync / frame-rate cap: a frame's cost is not hidden by the display rate);
// E2E_UNCAP=0 keeps the cap. Uncapped, most frames run no 60 Hz step: the render stats are split into frames with and
// without a sim step, plus the CPU ms per 1/60 s of sim (all frame CPU over the steps run), which holds the AI cost.
// Writes <out>/guard-cap.json (every number), <out>/guard-cap.csv (one row per cell), <out>/RESULTS.md (tables) and
// fills the marked results block of <out>/REPORT.md. A failing cell or map is logged, recorded with its error, and the
// run goes on; data-quality notes (sim clock off, shadow counter suspect) are recorded as per-cell flags.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

if (process.env.E2E_UNCAP === undefined) process.env.E2E_UNCAP = '1';
// run from the repo root with its packages installed (the preview server and Playwright come from node_modules)
if (!existsSync('node_modules/vite/bin/vite.js') || !existsSync('node_modules/playwright-core')) {
  console.error('guard-cap: run from the repo root after `npm ci` (node_modules/vite or node_modules/playwright-core missing)');
  process.exit(2);
}
const { launch, GPU, waitOperator } = await import('./e2e-lib.mjs');

const argv = process.argv.slice(2);
const opt = (k, d) => argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const MAPS = opt('maps', 'sectorops,ctcourse').split(',').filter(Boolean);
const COUNTS = opt('counts', '12,16,24').split(',').filter(Boolean).map(Number);
// (review G6) at least 5 s of warm-up before every cell (JIT, shader compiles, the guards settling on their beats)
const WARM_ASKED = Number(opt('warm', '5'));
const WARM = Math.max(5, WARM_ASKED);
const SECS = Number(opt('secs', '10'));
const OUT = opt('out', 'docs/guard-cap');
const GFX = opt('gfx', 'epic');
const [VW, VH] = opt('viewport', '1920x1080').split('x').map(Number);
const KIND = opt('kind', 'grunt');
const CELLS = opt('cells', 'patrol,away,alert').split(',');
const PORT = Number(process.env.E2E_PORT ?? 4189);
const URL = `http://127.0.0.1:${PORT}/`;
const PAGE_TIMEOUT = 15 * 60_000;
if (COUNTS.some((n) => !Number.isInteger(n) || n < 0 || n > 40)) throw new Error(`bad --counts ${COUNTS}`);
if (!(SECS > 0) || !(WARM_ASKED >= 0)) throw new Error('bad --secs / --warm');
// (review G4) a perf run needs the hardware GPU: software GL numbers are not a result unless asked for (--software)
const SOFTWARE = argv.includes('--software');
if (!GPU && !SOFTWARE) {
  console.error('guard-cap: set E2E_GPU=1 (hardware GPU, the laptop) or pass --software for a software-GL dry run (its numbers are not a perf result)');
  process.exit(2);
}

/** Map aliases: the URL query (each map's own guards are removed after boot). */
const MAP_Q = {
  // Sector Ops (warehouseOps): no section guards spawn (`sectorGuards=0`); section 1's start
  sectorops: 'autostart=warehouseOps&mode=sector&sectorGuards=0',
  // Marlow Yard, the co-op training course, solo page (its two passive squad guards are removed)
  ctcourse: 'autostart=ctcourse&mode=course',
  // (sector-redesign ART-KIT) Saltmarsh Park (campusOps), no section guards spawn; section 1's start
  campus: 'autostart=campusOps&mode=sector&sectorGuards=0',
};
const mapQuery = (m) => MAP_Q[m] ?? (m.includes(':') ? `autostart=${m.split(':')[0]}&mode=${m.split(':')[1]}` : `autostart=${m}&mode=sandbox`);

const log = (...a) => console.log(`[guard-cap ${new Date().toISOString().slice(11, 19)}]`, ...a);

// ---------- the server (the lamps-shots / shots pattern, but reuse a server that serves this dist) ----------
let server = null;
const stopServer = () => { try { server?.kill(); } catch { /* gone */ } };
process.on('exit', stopServer);
const distIndex = existsSync('dist/index.html') ? readFileSync('dist/index.html', 'utf8') : null;
if (!distIndex) { console.error('guard-cap: dist/index.html missing (run `npm run build` first)'); process.exit(2); }
const answering = await fetch(URL).then((r) => r.text(), () => null);
if (answering !== null) {
  if (answering !== distIndex) { console.error(`guard-cap: port ${PORT} answers with another build: free it or pick another E2E_PORT`); process.exit(2); }
  log(`reusing the server on ${PORT} (serves this dist)`);
} else {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
  let up = false;
  for (let i = 0; i < 80 && !up; i++) {
    try { up = (await fetch(URL)).ok; } catch { await new Promise((r) => setTimeout(r, 250)); }
  }
  if (!up || server.exitCode !== null) { console.error('guard-cap: preview server did not start (port taken? dist built?)'); stopServer(); process.exit(2); }
  if ((await (await fetch(URL)).text()) !== distIndex) { console.error('guard-cap: served index.html is not this dist'); stopServer(); process.exit(2); }
  log(`serving dist/ on ${PORT}`);
}

// ---------- in-page code (each function is serialised into the page: self-contained) ----------

/** Remove the map's guards, raise the cap to n, spawn n awake guards spread in front of the camera. */
function pageSpawn([n, kind]) {
  const app = window.__app;
  const g = app.current;
  const em = g.enemyMgr;
  if (!em) throw new Error('no enemy manager on this map');
  g.target.damageMul = 0;
  em.stealth = true;
  for (const e of [...em.enemies]) em.despawn(e);
  const capBefore = em.maxAlive;
  // exactly n (0 included: the mode's own spawns, e.g. Sector Ops reinforcements or a Marlow bay squad, are refused)
  em.maxAlive = n;
  const nav = em.nav;
  const p = g.player.position;
  const V = p.constructor;
  const yaw = g.player.cam.yaw;
  const me = [p.x, p.z];
  const used = new Set();
  const picks = [];
  const far = (x, z) => picks.every((q) => Math.hypot(q.x - x, q.z - z) >= 1.6);
  const tryAt = (x, z, needSight) => {
    const c = nav.nearestWalkable(x, z, 4, p.y);
    if (c < 0 || used.has(c)) return false;
    const cc = nav.center(c);
    const cx = cc[0], cz = cc[1];
    if (Math.abs(nav.height[c] - p.y) > 1.5) return false;
    const d = Math.hypot(cx - p.x, cz - p.z);
    if (d < 4.5 || !far(cx, cz)) return false;
    const sight = nav.lineClear(me, [cx, cz], p.y, nav.height[c]);
    if (needSight && !sight) return false;
    used.add(c);
    picks.push({ x: cx, y: nav.height[c], z: cz, sight, d });
    return true;
  };
  // pass 1: the wedge in front of the camera (+-60 deg, 5-24 m), nav line of sight; pass 2: the wedge, any; pass 3: the ring
  const passes = [[1, true], [1, false], [3, false]];
  for (const [wide, sight] of passes) {
    for (let r = 5; r <= 24 && picks.length < n; r += 1.5) {
      const steps = Math.max(4, Math.round(r * wide));
      for (let k = 0; k <= steps && picks.length < n; k++) {
        // interleave the angles so a short n still spreads across the wedge
        const kk = k % 2 === 0 ? k / 2 : steps - (k - 1) / 2;
        const a = yaw + (kk / steps - 0.5) * (wide === 1 ? (2 * Math.PI) / 3 : 2 * Math.PI);
        tryAt(p.x + Math.sin(a) * r, p.z + Math.cos(a) * r, sight);
      }
    }
    if (picks.length >= n) break;
  }
  const got = [];
  let patrols = 0;
  for (let i = 0; i < picks.length && got.length < n; i++) {
    const s = picks[i];
    const face = Math.atan2(p.x - s.x, p.z - s.z) + (i % 3 - 1) * 0.6;
    // the cell's own height: `spawn` re-picks the nearest walkable cell on that storey (a NaN height could pick another)
    const e = em.spawn(kind, new V(s.x, s.y, s.z), false, face);
    if (!e) continue;
    got.push(s);
    e.passive = true;
    // a short beat across the line of sight (3 m) when the nav says it is clear, else a post
    const ox = Math.cos(face) * 3, oz = -Math.sin(face) * 3;
    const q = [s.x + ox, s.z + oz];
    if (nav.lineClear([s.x, s.z], q, s.y, s.y)) {
      e.setPatrol({ points: [[s.x, s.z], q], wait: 1.2 });
      patrols++;
    }
  }
  return { spawned: got.length, alive: em.alive, capBefore, cap: em.maxAlive, candidates: picks.length, patrols, inSight: got.filter((s) => s.sight).length, meanDist: got.length ? got.reduce((a, s) => a + s.d, 0) / got.length : 0, playerAt: [p.x, p.y, p.z], yaw };
}

/** Install the wrappers once (gated by __gc.on: off, a wrapper is one flag check). */
function pageInstall() {
  if (window.__gc) return window.__gc.info;
  const app = window.__app;
  const g = app.current;
  const em = g.enemyMgr;
  const scene = g.scene;
  const S = { on: false, scope: 0, acc: Object.create(null), info: {} };
  window.__gc = S;
  const KEYS = ['step.fixed', 'step.physics', 'step.frame', 'ai.manager', 'ai.brain', 'ai.perceive', 'ai.decide', 'ai.move', 'ai.torches', 'ai.anim', 'nav.findPath', 'nav.lineClear', 'nav.flowField', 'ray.perceive', 'ray.torch', 'ray.ai', 'ray.other', 'light.totalAt'];
  for (const k of KEYS) S.acc[k] = { ms: 0, n: 0 };
  S.keys = KEYS;
  const SCOPE_RAY = ['ray.other', 'ray.perceive', 'ray.torch', 'ray.ai'];
  const wrapped = [];
  const wrap = (obj, name, key, scope) => {
    const orig = obj?.[name];
    if (typeof orig !== 'function') { wrapped.push(`MISSING ${key} (${name})`); return; }
    const r = S.acc[key];
    obj[name] = function (a, b, c, d, e) {
      if (!S.on) return orig.call(this, a, b, c, d, e);
      const prev = S.scope;
      if (scope) S.scope = scope;
      const t = performance.now();
      try {
        return orig.call(this, a, b, c, d, e);
      } finally {
        r.ms += performance.now() - t;
        r.n++;
        S.scope = prev;
      }
    };
    wrapped.push(key);
  };
  // the guards' prototype from a live guard (classes are bundled, not global)
  const any = em.enemies[0];
  if (any) {
    const EP = Object.getPrototypeOf(any);
    wrap(EP, 'update', 'ai.brain', 3);
    wrap(EP, 'perceive', 'ai.perceive', 1);
    wrap(EP, 'decide', 'ai.decide', 0);
    wrap(EP, 'move', 'ai.move', 0);
  } else wrapped.push('MISSING Enemy prototype (no guard alive)');
  wrap(em, 'update', 'ai.manager', 0);
  wrap(em, 'updateTorches', 'ai.torches', 2);
  wrap(em, 'frameUpdate', 'ai.anim', 0);
  wrap(em.nav, 'findPath', 'nav.findPath', 0);
  wrap(em.nav, 'lineClear', 'nav.lineClear', 0);
  wrap(em.nav, 'flowField', 'nav.flowField', 0);
  wrap(g.world.lightField, 'totalAt', 'light.totalAt', 0);
  wrap(g, 'fixedUpdate', 'step.fixed', 0);
  wrap(g, 'frameUpdate', 'step.frame', 0);
  // every physics ray (ballistics.ray / clear / hitDistance and the player's own), charged to the scope it runs in
  const pe = scene.getPhysicsEngine();
  if (pe && typeof pe.raycastToRef === 'function') {
    const orig = pe.raycastToRef;
    pe.raycastToRef = function (a, b, c, d) {
      if (!S.on) return orig.call(this, a, b, c, d);
      const t = performance.now();
      try {
        return orig.call(this, a, b, c, d);
      } finally {
        const r = S.acc[SCOPE_RAY[S.scope] ?? 'ray.other'];
        r.ms += performance.now() - t;
        r.n++;
      }
    };
    wrapped.push('ray.*');
  } else wrapped.push('MISSING physics raycastToRef');
  let tp = 0;
  scene.onBeforePhysicsObservable.add(() => { if (S.on) tp = performance.now(); });
  scene.onAfterPhysicsObservable.add(() => {
    if (!S.on) return;
    const r = S.acc['step.physics'];
    r.ms += performance.now() - tp;
    r.n++;
  });
  // timer resolution (Chrome coarsens performance.now() unless cross-origin isolated): the smallest step seen
  let res = Infinity;
  for (let i = 0; i < 200; i++) {
    const a = performance.now();
    let b = a;
    while (b === a) b = performance.now();
    res = Math.min(res, b - a);
  }
  S.info = { wrapped, timerResMs: res, crossOriginIsolated: !!window.crossOriginIsolated };
  return S.info;
}

/** Headless sim steps: per-step wall ms (clean or instrumented) and, instrumented, each bucket's ms and calls per step. */
function pageSim([steps, instrumented]) {
  const app = window.__app;
  const S = window.__gc;
  const keys = S.keys;
  for (const k of keys) { S.acc[k].ms = 0; S.acc[k].n = 0; }
  const total = new Array(steps);
  const per = {};
  for (const k of keys) per[k] = new Array(steps);
  const prevMs = new Float64Array(keys.length);
  // `stepHeadless` skips the step while the state is paused (pause menu, results): those numbers would be empty steps
  const g = app.current;
  const sim0 = g.time;
  S.on = instrumented;
  try {
    for (let i = 0; i < steps; i++) {
      if (instrumented) for (let k = 0; k < keys.length; k++) prevMs[k] = S.acc[keys[k]].ms;
      const t = performance.now();
      app.loop.stepHeadless(1 / 60, 60);
      total[i] = performance.now() - t;
      if (instrumented) for (let k = 0; k < keys.length; k++) per[keys[k]][i] = S.acc[keys[k]].ms - prevMs[k];
    }
  } finally {
    S.on = false;
  }
  const advanced = g.time - sim0;
  if (!(advanced > (steps / 60) * 0.5)) throw new Error(`the sim did not advance (${advanced} s over ${steps} steps; paused: ${app.loop.paused}, simulating: ${g.simulating})`);
  const calls = {};
  for (const k of keys) calls[k] = S.acc[k].n / steps;
  // (review G5) the node side flags a sample whose sim clock moved other than steps / 60
  return instrumented ? { total, per, calls, advanced } : { total, advanced };
}

/** Real frames for `secs`: clean timings, or (counted) draws / passes / active meshes. */
async function pageRender([secs, counted]) {
  const app = window.__app;
  const g = app.current;
  const scene = g.scene;
  const engine = app.engine;
  const loop = app.loop;
  const frames = [];
  const gpu = [];
  // (review G5) the match clock over the sample: an uncapped loop should simulate about the real time it ran
  const sim0 = g.time;
  const em0 = g.enemyMgr;
  const levelsStart = {};
  for (const e of em0.enemies) if (e.alive) levelsStart[e.level] = (levelsStart[e.level] ?? 0) + 1;
  // GPU time: one TIME_ELAPSED query at a time around scene.render (no nesting), read back frames later
  const gl = engine._gl;
  const ext = gl && gl.getExtension && gl.getExtension('EXT_disjoint_timer_query_webgl2');
  let q = null;
  let qBusy = false;
  const pollQuery = () => {
    if (!ext || !q || !qBusy) return;
    if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) return;
    const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
    const ns = gl.getQueryParameter(q, gl.QUERY_RESULT);
    if (!disjoint) gpu.push(ns / 1e6);
    qBusy = false;
  };
  if (ext) q = gl.createQuery();
  let renderMs = 0;
  const origRender = scene.render;
  scene.render = function (a, b) {
    pollQuery();
    const startQ = !!ext && !qBusy;
    if (startQ) gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
    const t = performance.now();
    try {
      return origRender.call(this, a, b);
    } finally {
      renderMs = performance.now() - t;
      if (startQ) { gl.endQuery(ext.TIME_ELAPSED_EXT); qBusy = true; }
    }
  };
  const origEnd = loop.onFrameEnd;
  loop.onFrameEnd = (interval, cpu, raf) => {
    origEnd?.(interval, cpu, raf);
    const s = loop.stats;
    frames.push([interval, cpu, s.simMs, s.physicsMs, s.steps, renderMs]);
  };
  // counted: every draw, its pass (render target), triangles; active meshes; active-mesh evaluation
  let draws = 0;
  let tris = 0;
  const passes = new Map();
  const shadowRts = new Set();
  const counts = [];
  let evalMs = 0;
  let evalT = 0;
  let de = null;
  let da = null;
  let o1 = null, o2 = null, o3 = null;
  // (review G3) shadow-map renders counted a second way, from each light's shadow map itself (not its RT label)
  let smRenders = 0;
  const smObs = [];
  if (counted) {
    for (const l of scene.lights) {
      try {
        const sm = l.getShadowGenerator?.()?.getShadowMap?.();
        if (sm?.onBeforeRenderObservable) smObs.push([sm, sm.onBeforeRenderObservable.add(() => { smRenders++; })]);
      } catch { /* a light without one */ }
    }
    de = engine.drawElementsType;
    da = engine.drawArraysType;
    const pass = () => {
      const rt = engine._currentRenderTarget;
      const k = rt ? String(rt.label || rt.texture?.name || rt.texture?.label || 'rt') : 'canvas';
      passes.set(k, (passes.get(k) ?? 0) + 1);
      if (/shadow/i.test(k)) shadowRts.add(rt);
    };
    engine.drawElementsType = function (fill, start, count, inst) {
      draws++;
      pass();
      if (fill === 0) tris += (count / 3) * Math.max(1, inst ?? 1);
      return de.call(this, fill, start, count, inst);
    };
    engine.drawArraysType = function (fill, start, count, inst) {
      draws++;
      pass();
      if (fill === 0 || fill === 7) tris += (count / 3) * Math.max(1, inst ?? 1);
      return da.call(this, fill, start, count, inst);
    };
    o1 = scene.onBeforeActiveMeshesEvaluationObservable.add(() => { evalT = performance.now(); });
    o2 = scene.onAfterActiveMeshesEvaluationObservable.add(() => { evalMs += performance.now() - evalT; });
    o3 = scene.onAfterRenderObservable.add(() => {
      counts.push([draws, tris, shadowRts.size, scene.getActiveMeshes().length, evalMs, smRenders]);
      smRenders = 0;
      draws = 0;
      tris = 0;
      evalMs = 0;
      shadowRts.clear();
    });
  }
  const t0 = performance.now();
  try {
    await new Promise((res) => {
      // (a hard stop 30 s past the sample: a loop that stopped rendering returns its few frames instead of hanging)
      const tick = () => ((performance.now() - t0 >= secs * 1000 && frames.length >= 3) || performance.now() - t0 >= secs * 1000 + 30_000 ? res() : setTimeout(tick, 50));
      tick();
    });
    // the last query's result
    for (let i = 0; i < 10 && qBusy; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      pollQuery();
    }
  } finally {
    scene.render = origRender;
    loop.onFrameEnd = origEnd;
    if (counted) {
      engine.drawElementsType = de;
      engine.drawArraysType = da;
      scene.onBeforeActiveMeshesEvaluationObservable.remove(o1);
      scene.onAfterActiveMeshesEvaluationObservable.remove(o2);
      scene.onAfterRenderObservable.remove(o3);
      for (const [sm, o] of smObs) sm.onBeforeRenderObservable.remove(o);
    }
    if (q) gl.deleteQuery(q);
  }
  const em = g.enemyMgr;
  const rig = g.world.lightRig;
  const levels = {};
  for (const e of em.enemies) if (e.alive) levels[e.level] = (levels[e.level] ?? 0) + 1;
  const nf = Math.max(1, counts.length);
  const byPass = counted ? [...passes].map(([k, v]) => [k.replace(/[0-9]+/g, '#'), v]).reduce((m, [k, v]) => m.set(k, (m.get(k) ?? 0) + v / nf), new Map()) : new Map();
  const realSecs = (performance.now() - t0) / 1000;
  return {
    frames,
    simAdvanced: g.time - sim0,
    realSecs,
    levelsStart,
    gpu,
    gpuTimer: !!ext,
    counts,
    passes: [...byPass].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => [k, +v.toFixed(1)]),
    state: {
      alive: em.alive,
      levels,
      torchesOn: em.torchesOn,
      torchSlots: em.torches?.length ?? null,
      shadowPool: rig?.shadowPool?.length ?? null,
      shadowLit: rig?.shadowed ?? null,
      rigLights: rig?.active ?? null,
      meshes: scene.meshes.length,
      skeletons: scene.skeletons.length,
      renderW: engine.getRenderWidth(),
      renderH: engine.getRenderHeight(),
    },
  };
}

/** Alert every guard (not passive any more, combat, told where the player is). */
function pageAlert() {
  const g = window.__app.current;
  const em = g.enemyMgr;
  // (guard-ai S24, A146/A148) one last known position per player, and no walk to the real feet without one: the
  // player is reported seen where he stands (his slot, the mirrored lkp) and every guard is told of him before combat,
  // so they chase as before S24 (the old direct `em.lkp` write gave no guard an intruder: they stood still)
  const slot = em.ctx.reportSighting({ id: g.localRef.id, feet: g.player.position.clone(), spotted: false });
  for (const e of em.enemies) {
    if (!e.alive) continue;
    e.passive = false;
    e.tell(slot);
    e.alert();
  }
  return em.alive;
}

function pageTurn(by) {
  const cam = window.__app.current.player.cam;
  cam.yaw += by;
  return cam.yaw;
}

// ---------- stats ----------
const sorted = (a) => a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
const pct = (s, p) => (s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null);
const r3 = (x) => (x === null || x === undefined || !Number.isFinite(x) ? null : +x.toFixed(3));
function summary(a) {
  const s = sorted(a);
  return { med: r3(pct(s, 0.5)), p95: r3(pct(s, 0.95)), mean: r3(s.length ? s.reduce((x, y) => x + y, 0) / s.length : null), n: s.length };
}

function simSummary(clean, inst) {
  const out = { stepClean: summary(clean.total), stepInstrumented: summary(inst.total), buckets: {}, callsPerStep: {} };
  for (const k of Object.keys(inst.per)) {
    out.buckets[k] = summary(inst.per[k]);
    out.callsPerStep[k] = r3(inst.calls[k]);
  }
  return out;
}

function renderSummary(clean, counted) {
  const col = (rows, i) => rows.map((r) => r[i]);
  // real frames that ran at least one sim step: the loop's sim ms per step
  const simRows = clean.frames.filter((f) => f[4] > 0);
  const noSimRows = clean.frames.filter((f) => !(f[4] > 0));
  // (review G1) uncapped, most frames run no 60 Hz step: the all-frame medians leave the AI out. Split by steps > 0 /
  // steps == 0, and the CPU cost of one 1/60 s of sim: all frame CPU time over the steps those frames ran
  const sum = (a) => a.reduce((x, y) => x + (Number.isFinite(y) ? y : 0), 0);
  const steps = sum(col(clean.frames, 4));
  return {
    frames: clean.frames.length,
    framesWithSim: simRows.length,
    framesNoSim: noSimRows.length,
    simSteps: steps,
    cpuMsPerSimStep: steps > 0 ? r3(sum(col(clean.frames, 1)) / steps) : null,
    frameMsWithSim: summary(col(simRows, 0)),
    frameCpuMsWithSim: summary(col(simRows, 1)),
    frameMsNoSim: summary(col(noSimRows, 0)),
    frameCpuMsNoSim: summary(col(noSimRows, 1)),
    simAdvanced: r3(clean.simAdvanced),
    realSecs: r3(clean.realSecs),
    levelsStart: clean.levelsStart,
    frameMs: summary(col(clean.frames, 0)),
    fps: (() => { const m = summary(col(clean.frames, 0)).med; return m ? +(1000 / m).toFixed(1) : null; })(),
    frameCpuMs: summary(col(clean.frames, 1)),
    loopSimMsPerStep: summary(simRows.map((f) => f[2] / f[4])),
    loopPhysicsMsPerStep: summary(simRows.map((f) => f[3] / f[4])),
    renderCpuMs: summary(col(clean.frames, 5)),
    gpuMs: clean.gpuTimer ? summary(clean.gpu) : null,
    gpuTimer: clean.gpuTimer,
    draws: counted ? summary(col(counted.counts, 0)) : null,
    trisM: counted ? summary(col(counted.counts, 1).map((t) => t / 1e6)) : null,
    shadowPasses: counted ? summary(col(counted.counts, 2)) : null,
    activeMeshes: counted ? summary(col(counted.counts, 3)) : null,
    evalMs: counted ? summary(col(counted.counts, 4)) : null,
    shadowMapRenders: counted ? summary(col(counted.counts, 5)) : null,
    passes: counted?.passes ?? [],
    state: clean.state,
  };
}

// ---------- the run ----------
const results = {
  started: new Date().toISOString(),
  gpu: GPU,
  uncapped: process.env.E2E_UNCAP === '1',
  gfx: GFX,
  viewport: [VW, VH],
  kind: KIND,
  warm: WARM,
  warmAsked: WARM_ASKED,
  software: SOFTWARE,
  secs: SECS,
  port: PORT,
  build: (distIndex.match(/build[-_ ]?sha[^"']*["']([0-9a-f]{7,40})/i) ?? [])[1] ?? null,
  cells: [],
  errors: [],
  flags: [],
};
let pkgVersion = null;
try { pkgVersion = JSON.parse(readFileSync('package.json', 'utf8')).version; } catch { /* none */ }
results.version = pkgVersion;
if (!GPU) log('WARNING: E2E_GPU is not 1: software GL, the render numbers are not a perf result');

const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${what} timed out after ${Math.round(ms / 1000)} s`)), ms))]);

// a cell's budget: warm-up, three sim passes and two render samples, with a wide margin (a hung page call ends the cell,
// not the run)
const CELL_TIMEOUT = (WARM + SECS * 4 + 120) * 1000;

async function runPage(map, n, ctl) {
  const params = `${mapQuery(map)}&gfx=${GFX}`;
  log(`${map} x ${n}: boot (${params})`);
  const l = await launch({ url: URL, params, viewport: { width: VW, height: VH } });
  const { browser, page, errors } = l;
  ctl.browser = browser;
  const base = { map, count: n, params };
  try {
    await page.waitForFunction(() => window.__app?.current?.player && window.__app.current.enemyMgr, null, { timeout: 180_000 });
    const opT = await waitOperator(page, GFX === 'min' ? 3 : 1, 120_000);
    if (opT < 0) log(`${map} x ${n}: Wren's LOD did not load in 120 s (measuring anyway; noted)`);
    await page.waitForTimeout(1500);
    const spawn = await page.evaluate(pageSpawn, [n, KIND]);
    log(`${map} x ${n}: spawned ${spawn.spawned} (alive ${spawn.alive}, ${spawn.inSight} in nav sight, mean ${spawn.meanDist.toFixed(1)} m)`);
    if (spawn.alive !== n) results.errors.push(`${map} x ${n}: asked for ${n} awake guards, got ${spawn.alive}`);
    const info = await page.evaluate(pageInstall);
    if (info.wrapped.some((w) => w.startsWith('MISSING'))) log(`${map} x ${n}: ${info.wrapped.filter((w) => w.startsWith('MISSING')).join('; ')}`);
    const steps = Math.round(SECS * 60);
    const cell = async (name, fn) => {
      const rec = { ...base, cell: name, spawn, wrenLoaded: opT >= 0, timer: info };
      try {
        Object.assign(rec, await withTimeout(fn(), CELL_TIMEOUT, `${map} x ${n} ${name}`));
        log(`${map} x ${n} ${name}: ${rec.sim ? `sim step med ${rec.sim.stepClean.med} p95 ${rec.sim.stepClean.p95} ms (ai ${rec.sim.buckets['ai.manager'].med}); ` : ''}frame med ${rec.render.frameMs.med} ms (${rec.render.fps} fps), cpu ${rec.render.frameCpuMs.med} (sim frames ${rec.render.frameCpuMsWithSim.med}, ${rec.render.cpuMsPerSimStep} per 1/60 s of sim), gpu ${rec.render.gpuMs?.med ?? 'n/a'}, draws ${rec.render.draws?.med}, shadow passes ${rec.render.shadowPasses?.med} / maps ${rec.render.shadowMapRenders?.med}`);
        for (const fl of rec.flags ?? []) {
          log(`${map} x ${n} ${name}: FLAG ${fl}`);
          results.flags.push(`${map} x ${n} ${name}: ${fl}`);
        }
      } catch (e) {
        rec.error = String(e?.message ?? e);
        results.errors.push(`${map} x ${n} ${name}: ${rec.error}`);
        log(`${map} x ${n} ${name}: FAILED ${rec.error}`);
      }
      results.cells.push(rec);
    };
    // `prep` runs before every sample (review G2: the alert cell re-alerts its guards, so each sample is all-alert, not
    // just the first); `flags` collects the cell's data-quality notes (review G3, G5)
    const measure = async (withSim, prep = null) => {
      const flags = [];
      await page.waitForTimeout(WARM * 1000);
      let sim = null;
      const alerts = [];
      const doPrep = async () => { if (prep) alerts.push(await page.evaluate(prep)); };
      const checkSim = (r, what) => {
        const want = steps / 60;
        if (Math.abs(r.advanced - want) > want * 0.05) flags.push(`${what}: sim clock moved ${r3(r.advanced)} s over ${steps} steps (expected ${r3(want)})`);
      };
      if (withSim) {
        await doPrep();
        await page.evaluate(pageSim, [Math.min(steps, 120), false]); // JIT warm
        await doPrep();
        const clean = await page.evaluate(pageSim, [steps, false]);
        checkSim(clean, 'sim clean');
        await doPrep();
        const inst = await page.evaluate(pageSim, [steps, true]);
        checkSim(inst, 'sim instrumented');
        sim = simSummary(clean, inst);
        sim.advancedClean = r3(clean.advanced);
        sim.advancedInstrumented = r3(inst.advanced);
        await page.waitForTimeout(500);
      }
      await doPrep();
      const rc = await page.evaluate(pageRender, [SECS, false]);
      if (rc.frames.length < 3) throw new Error(`the loop rendered ${rc.frames.length} frame(s) in ${SECS} s`);
      if (!(rc.simAdvanced >= rc.realSecs * 0.9)) flags.push(`render: sim clock moved ${r3(rc.simAdvanced)} s in ${r3(rc.realSecs)} real s (the loop fell behind or paused; MAX_STEPS drops)`);
      await doPrep();
      const rk = await page.evaluate(pageRender, [2, true]);
      const render = renderSummary(rc, rk);
      // (review G3) a label-based shadow pass count of 0 while the rig has shadowed lights lit is the counter, not the scene
      if (render.shadowPasses && render.shadowPasses.med === 0 && (render.state.shadowLit ?? 0) > 0) {
        render.shadowPassesSuspect = true;
        flags.push(`shadow passes read 0 by RT label with ${render.state.shadowLit} shadowed light(s) lit: counter bug, use shadowMapRenders (${render.shadowMapRenders?.med ?? '-'})`);
      }
      return { sim, render, flags, ...(prep ? { alerts } : {}) };
    };
    if (CELLS.includes('patrol')) await cell('patrol/facing', () => measure(true));
    if (CELLS.includes('away')) {
      // (turn and turn back inside the cell: a failure there is this cell's error, the alert cell still runs)
      await cell('patrol/away', async () => {
        await page.evaluate(pageTurn, Math.PI);
        try {
          return await measure(false);
        } finally {
          await page.evaluate(pageTurn, -Math.PI).catch(() => {});
        }
      });
    }
    if (CELLS.includes('alert')) {
      await cell('alert/facing', async () => {
        const alerted = await page.evaluate(pageAlert);
        return { alerted, ...(await measure(true, pageAlert)) };
      });
    }
    const pageErrors = errors.filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
    if (pageErrors.length) results.errors.push(`${map} x ${n}: ${pageErrors.length} console error(s), first: ${pageErrors[0].slice(0, 300)}`);
  } finally {
    await browser.close().catch(() => {});
  }
}

mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
for (const map of MAPS) {
  for (const n of COUNTS) {
    const ctl = { browser: null };
    try {
      await withTimeout(runPage(map, n, ctl), PAGE_TIMEOUT, `${map} x ${n}`);
    } catch (e) {
      const msg = `${map} x ${n}: ${String(e?.message ?? e).split('\n')[0]}`;
      results.errors.push(msg);
      results.cells.push({ map, count: n, cell: 'boot', error: msg });
      log(`FAILED ${msg}`);
      // a timed-out page is still running: its browser goes now (runPage's own close waits on the hung call)
      await ctl.browser?.close().catch(() => {});
    }
    writeOutputs(false);
  }
}
results.finished = new Date().toISOString();
results.minutes = +((Date.now() - t0) / 60000).toFixed(1);
writeOutputs(true);
log(`done in ${results.minutes} min: ${results.cells.filter((c) => !c.error).length} cells ok, ${results.errors.length} error(s); ${join(OUT, 'RESULTS.md')}`);
stopServer();
process.exit(0);

// ---------- outputs: guard-cap.json (every number), guard-cap.csv (one row per cell), RESULTS.md, REPORT.md's table ----------
function writeOutputs(final) {
  // each output on its own: one failing write never loses the others
  const put = (name, fn) => {
    try {
      fn();
    } catch (e) {
      console.error(`guard-cap: writing ${name} failed: ${e?.message ?? e}`);
    }
  };
  put('guard-cap.json', () => writeFileSync(join(OUT, 'guard-cap.json'), JSON.stringify(results, null, 1)));
  put('guard-cap.csv', () => writeFileSync(join(OUT, 'guard-cap.csv'), resultsCsv(results)));
  put('RESULTS.md', () => writeFileSync(join(OUT, 'RESULTS.md'), resultsMd(results)));
  if (final) put('REPORT.md', () => fillReport(join(OUT, 'REPORT.md'), results));
}

// (a function, not a const: the run above calls the writers before a top-level const below it would be initialised)
function csvCols() {
  return [
  ['map', (c) => c.map],
  ['count', (c) => c.count],
  ['cell', (c) => c.cell],
  ['error', (c) => c.error ?? ''],
  ['spawned', (c) => c.spawn?.spawned],
  ['alive', (c) => c.spawn?.alive],
  ['in_sight', (c) => c.spawn?.inSight],
  ['mean_dist_m', (c) => r3(c.spawn?.meanDist)],
  ['sim_step_clean_med_ms', (c) => c.sim?.stepClean.med],
  ['sim_step_clean_p95_ms', (c) => c.sim?.stepClean.p95],
  ['sim_step_instr_med_ms', (c) => c.sim?.stepInstrumented.med],
  ...['step.fixed', 'step.physics', 'step.frame', 'ai.manager', 'ai.brain', 'ai.perceive', 'ai.decide', 'ai.move', 'ai.torches', 'ai.anim', 'nav.findPath', 'nav.lineClear', 'nav.flowField', 'ray.perceive', 'ray.torch', 'ray.ai', 'ray.other', 'light.totalAt'].flatMap((k) => [
    [`${k}_mean_ms`, (c) => c.sim?.buckets[k]?.mean],
    [`${k}_p95_ms`, (c) => c.sim?.buckets[k]?.p95],
    [`${k}_calls_per_step`, (c) => c.sim?.callsPerStep[k]],
  ]),
  ['frame_med_ms', (c) => c.render?.frameMs.med],
  ['frame_p95_ms', (c) => c.render?.frameMs.p95],
  ['fps', (c) => c.render?.fps],
  ['frame_cpu_med_ms', (c) => c.render?.frameCpuMs.med],
  ['frame_cpu_p95_ms', (c) => c.render?.frameCpuMs.p95],
  ['frames', (c) => c.render?.frames],
  ['frames_with_sim', (c) => c.render?.framesWithSim],
  ['frames_no_sim', (c) => c.render?.framesNoSim],
  ['cpu_ms_per_sim_step', (c) => c.render?.cpuMsPerSimStep],
  ['frame_with_sim_med_ms', (c) => c.render?.frameMsWithSim.med],
  ['frame_cpu_with_sim_med_ms', (c) => c.render?.frameCpuMsWithSim.med],
  ['frame_cpu_with_sim_p95_ms', (c) => c.render?.frameCpuMsWithSim.p95],
  ['frame_no_sim_med_ms', (c) => c.render?.frameMsNoSim.med],
  ['frame_cpu_no_sim_med_ms', (c) => c.render?.frameCpuMsNoSim.med],
  ['render_sim_advanced_s', (c) => c.render?.simAdvanced],
  ['render_real_s', (c) => c.render?.realSecs],
  ['loop_sim_per_step_med_ms', (c) => c.render?.loopSimMsPerStep.med],
  ['loop_physics_per_step_med_ms', (c) => c.render?.loopPhysicsMsPerStep.med],
  ['render_cpu_med_ms', (c) => c.render?.renderCpuMs.med],
  ['render_cpu_p95_ms', (c) => c.render?.renderCpuMs.p95],
  ['gpu_med_ms', (c) => c.render?.gpuMs?.med],
  ['gpu_p95_ms', (c) => c.render?.gpuMs?.p95],
  ['draws_med', (c) => c.render?.draws?.med],
  ['tris_m_med', (c) => c.render?.trisM?.med],
  ['shadow_passes_med', (c) => c.render?.shadowPasses?.med],
  ['shadow_passes_suspect', (c) => (c.render ? (c.render.shadowPassesSuspect ? 1 : 0) : '')],
  ['shadow_map_renders_med', (c) => c.render?.shadowMapRenders?.med],
  ['active_meshes_med', (c) => c.render?.activeMeshes?.med],
  ['eval_med_ms', (c) => c.render?.evalMs?.med],
  ['shadow_pool', (c) => c.render?.state.shadowPool],
  ['shadow_lit', (c) => c.render?.state.shadowLit],
  ['torches_on', (c) => c.render?.state.torchesOn],
  ['torch_slots', (c) => c.render?.state.torchSlots],
  ['levels_start', (c) => (c.render?.levelsStart ? Object.entries(c.render.levelsStart).map(([k, v]) => `${k}:${v}`).join(' ') : '')],
  ['levels', (c) => (c.render ? Object.entries(c.render.state.levels).map(([k, v]) => `${k}:${v}`).join(' ') : '')],
  ['flags', (c) => (c.flags ?? []).join(' | ')],
  ];
}

function resultsCsv(R) {
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const COLS = csvCols();
  const rows = [COLS.map(([h]) => h).join(',')];
  for (const c of R.cells) rows.push(COLS.map(([, get]) => esc((() => { try { return get(c); } catch { return ''; } })())).join(','));
  return rows.join('\n') + '\n';
}

/** REPORT.md's results table, between its markers (added under "## Results" when missing). */
function fillReport(path, R) {
  const START = '<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->';
  const END = '<!-- guard-cap:results:end -->';
  const f = (s, k = 'med') => (s && s[k] !== null && s[k] !== undefined ? String(s[k]) : '-');
  const mp = (s) => (s ? `${f(s)} / ${f(s, 'p95')}` : '-');
  const L = [START, ''];
  L.push(`Filled ${R.finished ?? new Date().toISOString()} (version ${R.version ?? '?'}, ${R.gpu ? 'hardware GPU' : 'SOFTWARE GL: not a perf result'}, ${R.uncapped ? 'uncapped' : 'display-capped'}, gfx=${R.gfx}, ${R.viewport.join('x')}). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: \`guard-cap.json\`, \`guard-cap.csv\`, \`RESULTS.md\`.`, '');
  L.push('| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |');
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const c of R.cells) {
    if (c.error || !c.render) {
      L.push(`| ${c.map} | ${c.count} | ${c.cell} | ERROR: ${String(c.error ?? 'no render data').replace(/\|/g, '/').slice(0, 160)} | | | | | | | | | | | | | | | |`);
      continue;
    }
    const b = c.sim?.buckets;
    const cl = c.sim?.callsPerStep;
    const rays = cl ? r3(['ray.perceive', 'ray.torch', 'ray.ai', 'ray.other'].reduce((a, k) => a + (cl[k] ?? 0), 0)) : null;
    const r = c.render;
    L.push(`| ${c.map} | ${c.count} | ${c.cell} | ${c.sim ? mp(c.sim.stepClean) : '-'} | ${b ? f(b['ai.manager'], 'mean') : '-'} | ${b ? f(b['ai.perceive'], 'mean') : '-'} | ${rays ?? '-'} | ${cl?.['nav.findPath'] ?? '-'} | ${b ? f(b['step.physics'], 'mean') : '-'} | ${mp(r.frameMs)} | ${r.fps ?? '-'} | ${mp(r.frameCpuMs)} | ${mp(r.frameCpuMsWithSim)} | ${r.cpuMsPerSimStep ?? '-'} | ${r.gpuMs ? mp(r.gpuMs) : 'n/a'} | ${f(r.draws)} | ${r.shadowPassesSuspect ? `? (maps ${f(r.shadowMapRenders)})` : f(r.shadowPasses)} | ${f(r.activeMeshes)} | ${(c.flags ?? []).length || ''} |`);
  }
  L.push('', 'Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).', '');
  // per added guard: the slope between the smallest and largest N measured, per map and cell
  const ok = R.cells.filter((c) => !c.error && c.render);
  for (const m of [...new Set(ok.map((c) => c.map))]) {
    for (const cellName of ['patrol/facing', 'alert/facing']) {
      const cs = ok.filter((x) => x.map === m && x.cell === cellName).sort((a, b) => a.count - b.count);
      if (cs.length < 2) continue;
      const a = cs[0], z = cs[cs.length - 1];
      const dn = z.count - a.count;
      if (dn <= 0) continue;
      const sl = (get) => { const va = get(a), vz = get(z); return va === null || vz === null || va === undefined || vz === undefined ? '-' : ((vz - va) / dn).toFixed(3); };
      L.push(`Per added guard, ${m} ${cellName} (N ${a.count} -> ${z.count}): sim ${sl((c) => c.sim?.stepClean.med)} ms, of it AI ${sl((c) => c.sim?.buckets['ai.manager'].mean)} (perceive ${sl((c) => c.sim?.buckets['ai.perceive'].mean)}), frame CPU (sim frames) ${sl((c) => c.render.frameCpuMsWithSim?.med)}, CPU per 1/60 s sim ${sl((c) => c.render.cpuMsPerSimStep)}, GPU ${sl((c) => c.render.gpuMs?.med)}, draws ${sl((c) => c.render.draws?.med)}.`, '');
    }
  }
  if (R.errors.length) L.push(`${R.errors.length} error(s): see \`RESULTS.md\` "Errors".`, '');
  L.push(END);
  const block = L.join('\n');
  let text = existsSync(path) ? readFileSync(path, 'utf8') : '# Guard cap: report\n';
  const i = text.indexOf(START);
  const j = text.indexOf(END);
  if (i >= 0 && j > i) text = text.slice(0, i) + block + text.slice(j + END.length);
  else {
    const h = text.indexOf('\n## Results');
    if (h >= 0) {
      const eol = text.indexOf('\n', h + 1);
      text = text.slice(0, eol + 1) + '\n' + block + '\n' + text.slice(eol + 1);
    } else text = `${text.trimEnd()}\n\n## Results\n\n${block}\n`;
  }
  writeFileSync(path, text);
}

// ---------- RESULTS.md ----------
function resultsMd(R) {
  const f = (s, k = 'med') => (s && s[k] !== null && s[k] !== undefined ? String(s[k]) : '-');
  const mp = (s) => (s ? `${f(s)} / ${f(s, 'p95')}` : '-');
  const L = [];
  L.push('# Guard cap: results', '');
  L.push(`Run ${R.started} - ${R.finished ?? '?'} (${R.minutes ?? '?'} min), version ${R.version ?? '?'}, ${R.gpu ? 'hardware GPU (E2E_GPU=1)' : 'SOFTWARE GL: not a perf result'}, ${R.uncapped ? 'frame rate uncapped' : 'display-capped'}, gfx=${R.gfx}, ${R.viewport.join('x')}, guards: ${R.kind}, warm ${R.warm} s${R.warmAsked !== R.warm ? ` (asked ${R.warmAsked}, raised to the 5 s minimum)` : ''}, sample ${R.secs} s.`);
  L.push('Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.', '');
  const ok = R.cells.filter((c) => !c.error && c.render);
  const maps = [...new Set(R.cells.map((c) => c.map))];
  for (const m of maps) {
    L.push(`## ${m}`, '');
    L.push('### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)', '');
    L.push('| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |');
    L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const c of ok.filter((x) => x.map === m && x.sim)) {
      const b = c.sim.buckets;
      const cl = c.sim.callsPerStep;
      const bc = (k) => `${f(b[k], 'mean')} (${cl[k] ?? '-'})`;
      L.push(`| ${c.count} | ${c.cell} | ${mp(c.sim.stepClean)} | ${f(b['step.fixed'], 'mean')} | ${f(b['step.physics'], 'mean')} | ${f(b['step.frame'], 'mean')} | ${mp(b['ai.manager'])} | ${f(b['ai.brain'], 'mean')} | ${f(b['ai.perceive'], 'mean')} | ${f(b['ai.decide'], 'mean')} | ${f(b['ai.move'], 'mean')} | ${f(b['ai.torches'], 'mean')} | ${f(b['ai.anim'], 'mean')} | ${bc('nav.findPath')} | ${f(b['nav.flowField'], 'mean')} | ${bc('ray.perceive')} | ${bc('ray.torch')} | ${bc('ray.ai')} | ${bc('ray.other')} | ${bc('light.totalAt')} |`);
    }
    L.push('', '(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)', '');
    L.push('### Render (real frames)', '');
    L.push('| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |');
    L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const c of ok.filter((x) => x.map === m)) {
      const r = c.render;
      const s = r.state;
      L.push(`| ${c.count} | ${c.cell} | ${mp(r.frameMs)} | ${r.fps ?? '-'} | ${mp(r.frameCpuMs)} | ${r.framesWithSim} / ${r.framesNoSim} | ${mp(r.frameMsWithSim)} | ${mp(r.frameCpuMsWithSim)} | ${mp(r.frameCpuMsNoSim)} | ${r.cpuMsPerSimStep ?? '-'} | ${f(r.loopSimMsPerStep)} | ${mp(r.renderCpuMs)} | ${r.gpuMs ? mp(r.gpuMs) : 'n/a'} | ${f(r.draws)} | ${f(r.trisM)} | ${f(r.shadowPasses)}${r.shadowPassesSuspect ? ' (suspect)' : ''} | ${f(r.shadowMapRenders)} | ${f(r.activeMeshes)} | ${f(r.evalMs)} | ${s.shadowPool ?? '-'} / ${s.shadowLit ?? '-'} | ${s.torchesOn ?? '-'} of ${s.torchSlots ?? '-'} | ${Object.entries(r.levelsStart ?? {}).map(([k, v]) => `${k} ${v}`).join(', ')} -> ${Object.entries(s.levels).map(([k, v]) => `${k} ${v}`).join(', ')} |`);
    }
    L.push('');
    // per-guard slopes between the smallest and largest count measured (patrol/facing and alert/facing)
    for (const cellName of ['patrol/facing', 'alert/facing']) {
      const cs = ok.filter((x) => x.map === m && x.cell === cellName).sort((a, b) => a.count - b.count);
      if (cs.length < 2) continue;
      const a = cs[0], z = cs[cs.length - 1];
      const dn = z.count - a.count;
      const sl = (get) => { const va = get(a), vz = get(z); return va === null || vz === null || va === undefined || vz === undefined ? '-' : ((vz - va) / dn).toFixed(3); };
      L.push(`Per added guard, ${cellName}, N ${a.count} -> ${z.count}: sim step ${sl((c) => c.sim?.stepClean.med)} ms, AI manager ${sl((c) => c.sim?.buckets['ai.manager'].mean)} ms, perceive ${sl((c) => c.sim?.buckets['ai.perceive'].mean)} ms, frame ${sl((c) => c.render.frameMs.med)} ms, frame CPU ${sl((c) => c.render.frameCpuMs.med)} ms, frame CPU (sim frames) ${sl((c) => c.render.frameCpuMsWithSim?.med)} ms, CPU per 1/60 s sim ${sl((c) => c.render.cpuMsPerSimStep)} ms, GPU ${sl((c) => c.render.gpuMs?.med)} ms, draws ${sl((c) => c.render.draws?.med)}.`);
    }
    L.push('');
    const passes = ok.filter((x) => x.map === m && x.render.passes.length);
    if (passes.length) {
      L.push('Draws per pass (last cell of each count):', '');
      for (const n of [...new Set(passes.map((c) => c.count))]) {
        const c = passes.filter((x) => x.count === n).pop();
        L.push(`- N ${n} ${c.cell}: ${c.render.passes.map(([k, v]) => `${k} ${v}`).join(', ')}`);
      }
      L.push('');
    }
  }
  const t = ok[0]?.timer;
  if (t) L.push(`Timer resolution in the page: ${t.timerResMs} ms (cross-origin isolated: ${t.crossOriginIsolated}). Wrapped: ${t.wrapped.join(', ')}.`, '');
  if (R.flags?.length) {
    L.push('## Flags (data-quality notes: read the flagged numbers with care)', '');
    for (const e of R.flags) L.push(`- ${e}`);
    L.push('');
  }
  if (R.errors.length) {
    L.push('## Errors', '');
    for (const e of R.errors) L.push(`- ${e}`);
    L.push('');
  }
  return L.join('\n');
}
