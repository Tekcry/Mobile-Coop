// Guard cap, co-op measure (feature/guard-cap, slice M1): what a co-op CLIENT pays for the host's guards (frame CPU,
// render() CPU, GPU, draws, active meshes, puppets alive) and what the host's snapshots cost on the wire. Report only:
// no game change. guard-cap.mjs (M0) measures the solo / host page; this script is its co-op counterpart. Every timer is
// a page-side wrapper installed by this script (a wrapped scene.render / loop.onFrameEnd / transport.send), never src
// instrumentation.
//
// Per (map, players, N) (a fresh browser each): the host opens a room over `?net=local` and the other players join it
// (e2e-net-lib's hostAndJoin pattern, one browser context, all pages headless), `?sectorGuards=0&gfx=epic` on every page;
// Sector Ops starts on map `warehouseOps` (sectorops) or `campusOps` (campus), as e2e-sectorops.mjs does. The host page
// removes its guards and spawns exactly N awake `grunt`s in a wedge in front of its camera (guard-cap's pageSpawn,
// copied), then every client page is turned to face the guards' centroid (the worst case for its render). Cells:
//   patrol : the guards on a short 2-point patrol, `passive` (never alerted); every page facing the guards
//   away   : the same guards, every page's camera turned 180 degrees (render only: the guards off screen on all pages)
//   alert  : every guard alerted (stealth rules: they chase, take cover, shoot; nobody takes damage)
// Each cell: warm up --warm real seconds, then --secs real seconds of the real rAF loop on ALL pages at once (they
// compete for the one GPU, as in play), then 2 s counted (draw calls, active meshes). Per page (host, client1..3):
//   frame CPU (the loop's own per-frame CPU: sim + update + render submit) median / p95, with and without a sim step,
//   scene.render() CPU, GPU ms (EXT_disjoint_timer_query_webgl2 around scene.render, when the driver exposes it),
//   draws, active meshes, the client's puppets (`CoopClient.puppetList.length`, private: read as a property of
//   `__app.current.net`, which is the CoopClient on a client page and the CoopHost on the host page).
// Host wire (the clean sample only): `transport.send` of the host's session is wrapped and `JSON.stringify(msg).length`
// (characters, not bytes: the same string the local transport posts) is recorded per message type (`snap`, `ev`,
// `lamps`, `sector`, everything else as `other`): per message median / mean / max, messages per second, bytes per
// second median / max (a "burst" is the max second). A broadcast is one send: a transport that sends to each peer (the
// shipped Trystero one) costs the host that many times the figure, shown as the "x clients" column. The wrapper's own
// stringify time is reported (ms per second), since it lands in the host's frame CPU.
//
// Usage (the laptop, port 4189, after `npm ci` + `npm run build`, from the repo root; headless, never headed; the
// GPU smoke: --maps=campus --counts=0,12 --players=2 --secs=3):
//   E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap-coop.mjs [--maps=campus,sectorops] [--counts=0,12,24,32]
//     [--cells=patrol,away,alert] [--players=2,4] [--warm=5] [--secs=10] [--out=docs/guard-cap/coop] [--gfx=epic]
//     [--viewport=1280x720] [--kind=grunt]
//   --maps also takes a bare map id (`warehouseOps`, run in Sector Ops mode). Exits at once (code 2) without E2E_GPU=1
//   or with E2E_HEADED=1. --warm is raised to at least 5 s. The snapshot lists at most 32 guards (`MAX_ENEMIES`), so a
//   client shows at most 32 puppets however many the host runs. Each page's viewport is --viewport (default 1280x720,
//   what e2e-coop-gpu uses); four pages at 1080p would not fit one GPU's budget.
// Serves dist/ itself with `vite preview` on E2E_PORT (as scripts/guard-cap.mjs) when nothing answers there; reuses a
// server only when it serves this dist/index.html. E2E_UNCAP=1 is set by default (no vsync / frame-rate cap: a frame's
// cost is not hidden by the display rate); E2E_UNCAP=0 keeps the cap.
// Writes <out>/guard-cap-coop.json (every number), <out>/guard-cap-coop.csv (one row per cell, columns per page role),
// <out>/RESULTS.md (tables). A failing cell or run is logged, recorded with its error, and the run goes on.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

if (process.env.E2E_UNCAP === undefined) process.env.E2E_UNCAP = '1';
// run from the repo root with its packages installed (the preview server and Playwright come from node_modules)
if (!existsSync('node_modules/vite/bin/vite.js') || !existsSync('node_modules/playwright-core')) {
  console.error('guard-cap-coop: run from the repo root after `npm ci` (node_modules/vite or node_modules/playwright-core missing)');
  process.exit(2);
}
if (process.env.E2E_HEADED === '1') {
  console.error('guard-cap-coop: headless only (unset E2E_HEADED): a headed window would take the desktop focus');
  process.exit(2);
}
const { launch, openPage, GPU, waitOperator } = await import('./e2e-lib.mjs');
const { until, setSimPages, startMode, LOAD_MS } = await import('./e2e-net-lib.mjs');

const argv = process.argv.slice(2);
const opt = (k, d) => argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const MAPS = opt('maps', 'campus,sectorops').split(',').filter(Boolean);
const COUNTS = opt('counts', '0,12,24,32').split(',').filter(Boolean).map(Number);
const PLAYERS = opt('players', '2,4').split(',').filter(Boolean).map(Number);
const CELLS = opt('cells', 'patrol,away,alert').split(',').filter(Boolean);
const WARM_ASKED = Number(opt('warm', '5'));
const WARM = Math.max(5, WARM_ASKED);
const SECS = Number(opt('secs', '10'));
const OUT = opt('out', 'docs/guard-cap/coop');
const GFX = opt('gfx', 'epic');
const [VW, VH] = opt('viewport', '1280x720').split('x').map(Number);
const KIND = opt('kind', 'grunt');
const PORT = Number(process.env.E2E_PORT ?? 4189);
const URL = `http://127.0.0.1:${PORT}/`;
const PAGE_TIMEOUT = 20 * 60_000;
const ROLES = ['host', 'client1', 'client2', 'client3'];
const TYPES = ['snap', 'ev', 'lamps', 'sector', 'other'];
if (COUNTS.some((n) => !Number.isInteger(n) || n < 0 || n > 40)) throw new Error(`bad --counts ${COUNTS}`);
if (PLAYERS.some((n) => !Number.isInteger(n) || n < 2 || n > 4)) throw new Error(`bad --players ${PLAYERS} (2 to 4)`);
if (CELLS.some((c) => !['patrol', 'away', 'alert'].includes(c))) throw new Error(`bad --cells ${CELLS}`);
if (!(SECS > 0) || !(WARM_ASKED >= 0) || !(VW > 0) || !(VH > 0)) throw new Error('bad --secs / --warm / --viewport');
// a perf run needs the hardware GPU: software GL numbers are not a result
if (!GPU) {
  console.error('guard-cap-coop: set E2E_GPU=1 (hardware GPU, the laptop): software GL numbers are not a perf result');
  process.exit(2);
}

/** Map aliases -> the map id the host starts in Sector Ops; a bare map id is taken as it is. */
const MAP_ID = { sectorops: 'warehouseOps', campus: 'campusOps' };
const mapId = (m) => MAP_ID[m] ?? m;
// every page: the local transport, no section guards (the page spawns its own), the epic preset (not the saved settings)
const roomParams = () => `net=local&sectorGuards=0&gfx=${GFX}`;

const log = (...a) => console.log(`[guard-cap-coop ${new Date().toISOString().slice(11, 19)}]`, ...a);

// ---------- the server (as guard-cap.mjs: reuse a server that serves this dist) ----------
let server = null;
const stopServer = () => { try { server?.kill(); } catch { /* gone */ } };
process.on('exit', stopServer);
const distIndex = existsSync('dist/index.html') ? readFileSync('dist/index.html', 'utf8') : null;
if (!distIndex) { console.error('guard-cap-coop: dist/index.html missing (run `npm run build` first)'); process.exit(2); }
const answering = await fetch(URL).then((r) => r.text(), () => null);
if (answering !== null) {
  if (answering !== distIndex) { console.error(`guard-cap-coop: port ${PORT} answers with another build: free it or pick another E2E_PORT`); process.exit(2); }
  log(`reusing the server on ${PORT} (serves this dist)`);
} else {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
  let up = false;
  for (let i = 0; i < 80 && !up; i++) {
    try { up = (await fetch(URL)).ok; } catch { await new Promise((r) => setTimeout(r, 250)); }
  }
  if (!up || server.exitCode !== null) { console.error('guard-cap-coop: preview server did not start (port taken? dist built?)'); stopServer(); process.exit(2); }
  if ((await (await fetch(URL)).text()) !== distIndex) { console.error('guard-cap-coop: served index.html is not this dist'); stopServer(); process.exit(2); }
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

/** Alert every guard (not passive any more, combat, told where the player is). Copied from guard-cap.mjs (:475). */
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

/** The host's live guards: mean x / z and the count (null when none). */
function pageCentroid() {
  const em = window.__app.current.enemyMgr;
  let x = 0, z = 0, n = 0;
  for (const e of em.enemies) {
    if (!e.alive) continue;
    x += e.pos.x;
    z += e.pos.z;
    n++;
  }
  return n ? [x / n, z / n, n] : null;
}

/** Turn this page's camera to face the point [x, z] (render only: the client's own view). */
function pageAim(c) {
  const g = window.__app.current;
  const p = g.player.position;
  const cam = g.player.cam;
  cam.yaw = Math.atan2(c[0] - p.x, c[1] - p.z);
  if (typeof cam.snap === 'function') cam.snap();
  return cam.yaw;
}

function pageTurn(by) {
  const cam = window.__app.current.player.cam;
  cam.yaw += by;
  if (typeof cam.snap === 'function') cam.snap();
  return cam.yaw;
}

/** The co-op client's puppets (`CoopClient.puppetList`, a private field read as a property): count and alive; null on the host. */
function pagePuppets() {
  const l = window.__app.current?.net?.puppetList;
  return Array.isArray(l) ? { n: l.length, alive: l.filter((p) => p.alive).length } : null;
}

/**
 * Real frames for `secs` on this page: per frame [interval, loop CPU, sim ms, physics ms, steps, scene.render() CPU ms],
 * the client's puppet count per frame, GPU ms (when the driver exposes the timer), and (counted) draws, triangles and
 * active meshes per frame. `wireOn` (the host, the clean pass): the host session transport's `send` wrapped for the
 * sample, `JSON.stringify(msg).length` per message type, per message and per second. Copied from guard-cap.mjs pageRender.
 */
async function pageSample([secs, counted, wireOn]) {
  const app = window.__app;
  const g = app.current;
  const scene = g.scene;
  const engine = app.engine;
  const loop = app.loop;
  const net = g.net;
  const frames = [];
  const puppets = [];
  const gpu = [];
  const sim0 = g.time;
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
    const pl = net?.puppetList;
    if (Array.isArray(pl)) puppets.push(pl.length);
  };
  // counted: every draw and its triangles; active meshes
  let draws = 0;
  let tris = 0;
  const counts = [];
  let de = null;
  let da = null;
  let o3 = null;
  if (counted) {
    de = engine.drawElementsType;
    da = engine.drawArraysType;
    engine.drawElementsType = function (fill, start, count, inst) {
      draws++;
      if (fill === 0) tris += (count / 3) * Math.max(1, inst ?? 1);
      return de.call(this, fill, start, count, inst);
    };
    engine.drawArraysType = function (fill, start, count, inst) {
      draws++;
      if (fill === 0 || fill === 7) tris += (count / 3) * Math.max(1, inst ?? 1);
      return da.call(this, fill, start, count, inst);
    };
    o3 = scene.onAfterRenderObservable.add(() => {
      counts.push([draws, tris, scene.getActiveMeshes().length]);
      draws = 0;
      tris = 0;
    });
  }
  // the host's wire: the session's transport.send, wrapped for this sample only (restored in `finally` and right after the wait)
  const WT = ['snap', 'ev', 'lamps', 'sector'];
  let wire = null;
  let tr = null;
  let origSend = null;
  const t0 = performance.now();
  if (wireOn) {
    tr = window.__coop?.session?.transport ?? null;
    if (tr && typeof tr.send === 'function') {
      origSend = tr.send;
      wire = { types: {}, stringifyMs: 0, realSecs: 0 };
      for (const k of [...WT, 'other']) wire.types[k] = { n: 0, bytes: 0, targeted: 0, sizes: [], bins: {}, extra: [] };
      tr.send = function (msg, to) {
        const t = performance.now();
        let len = 0;
        try { len = JSON.stringify(msg).length; } catch { len = 0; }
        wire.stringifyMs += performance.now() - t;
        const k = msg && WT.includes(msg.t) ? msg.t : 'other';
        const d = wire.types[k];
        d.n++;
        d.bytes += len;
        if (to !== undefined) d.targeted++;
        if (d.sizes.length < 5000) d.sizes.push(len);
        const s = Math.floor((t - t0) / 1000);
        const b = d.bins[s] ?? (d.bins[s] = [0, 0]);
        b[0] += len;
        b[1]++;
        if (k === 'ev' && d.extra.length < 5000) d.extra.push(msg.events?.length ?? 0);
        return origSend.call(this, msg, to);
      };
    }
  }
  let realSecs = 0;
  try {
    await new Promise((res) => {
      // (a hard stop 30 s past the sample: a loop that stopped rendering returns its few frames instead of hanging)
      const tick = () => ((performance.now() - t0 >= secs * 1000 && frames.length >= 3) || performance.now() - t0 >= secs * 1000 + 30_000 ? res() : setTimeout(tick, 50));
      tick();
    });
    realSecs = (performance.now() - t0) / 1000;
    if (tr && origSend) { tr.send = origSend; origSend = null; }
    if (wire) wire.realSecs = realSecs;
    // the last query's result
    for (let i = 0; i < 10 && qBusy; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      pollQuery();
    }
  } finally {
    if (tr && origSend) tr.send = origSend;
    scene.render = origRender;
    loop.onFrameEnd = origEnd;
    if (counted) {
      engine.drawElementsType = de;
      engine.drawArraysType = da;
      scene.onAfterRenderObservable.remove(o3);
    }
    if (q) gl.deleteQuery(q);
  }
  const pl = net?.puppetList;
  return {
    frames,
    puppets,
    puppetsEnd: Array.isArray(pl) ? { n: pl.length, alive: pl.filter((p) => p.alive).length } : null,
    simAdvanced: g.time - sim0,
    realSecs,
    gpu,
    gpuTimer: !!ext,
    counts,
    wire,
    state: { guardsAlive: g.enemyMgr?.alive ?? null, meshes: scene.meshes.length, renderW: engine.getRenderWidth(), renderH: engine.getRenderHeight() },
  };
}

// ---------- stats ----------
const sorted = (a) => a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
const pct = (s, p) => (s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null);
const r3 = (x) => (x === null || x === undefined || !Number.isFinite(x) ? null : +x.toFixed(3));
function summary(a) {
  const s = sorted(a);
  return { med: r3(pct(s, 0.5)), p95: r3(pct(s, 0.95)), mean: r3(s.length ? s.reduce((x, y) => x + y, 0) / s.length : null), max: r3(s.length ? s[s.length - 1] : null), n: s.length };
}

/** One page's sample (clean + counted) as the numbers the tables show. */
function pageSummary(clean, counted) {
  const col = (rows, i) => rows.map((r) => r[i]);
  const simRows = clean.frames.filter((f) => f[4] > 0);
  const med = summary(col(clean.frames, 0)).med;
  return {
    frames: clean.frames.length,
    framesWithSim: simRows.length,
    realSecs: r3(clean.realSecs),
    simAdvanced: r3(clean.simAdvanced),
    frameMs: summary(col(clean.frames, 0)),
    fps: med ? +(1000 / med).toFixed(1) : null,
    frameCpuMs: summary(col(clean.frames, 1)),
    frameCpuMsWithSim: summary(col(simRows, 1)),
    renderCpuMs: summary(col(clean.frames, 5)),
    gpuMs: clean.gpuTimer ? summary(clean.gpu) : null,
    gpuTimer: clean.gpuTimer,
    draws: summary(col(counted.counts, 0)),
    trisM: summary(col(counted.counts, 1).map((t) => t / 1e6)),
    activeMeshes: summary(col(counted.counts, 2)),
    puppets: clean.puppets.length ? summary(clean.puppets) : null,
    puppetsEnd: clean.puppetsEnd,
    state: clean.state,
  };
}

/** The host's wire sample as per-type message and per-second figures; `clients` = players - 1. */
function wireSummary(w, clients) {
  if (!w) return null;
  const nb = Math.max(1, Math.floor(w.realSecs));
  const total = new Array(nb).fill(0);
  const types = {};
  for (const t of TYPES) {
    const d = w.types[t];
    const bps = new Array(nb).fill(0);
    const cnt = new Array(nb).fill(0);
    for (const [s, [bytes, n]] of Object.entries(d.bins)) {
      const i = Number(s);
      if (i >= nb) continue; // the partial last second
      bps[i] = bytes;
      cnt[i] = n;
      total[i] += bytes;
    }
    types[t] = { n: d.n, bytes: d.bytes, targeted: d.targeted, perS: r3(d.n / w.realSecs), msg: summary(d.sizes), bps: summary(bps), msgsPerSecMax: Math.max(...cnt), events: t === 'ev' ? summary(d.extra) : null };
  }
  const tot = summary(total);
  return { realSecs: r3(w.realSecs), types, totalBps: tot, totalBpsXClients: { med: r3(tot.med * clients), max: r3(tot.max * clients) }, clients, stringifyMsPerS: r3(w.stringifyMs / w.realSecs) };
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
  secs: SECS,
  port: PORT,
  maps: MAPS,
  counts: COUNTS,
  players: PLAYERS,
  cells: [],
  errors: [],
  flags: [],
};
try { results.version = JSON.parse(readFileSync('package.json', 'utf8')).version; } catch { results.version = null; }

const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${what} timed out after ${Math.round(ms / 1000)} s`)), ms))]);

// a cell's budget: warm-up, two samples, with a wide margin (a hung page call ends the cell, not the run)
const CELL_TIMEOUT = (WARM + SECS * 2 + 120) * 1000;

/**
 * hostAndJoin (e2e-net-lib.mjs) with the room's params on EVERY page: its clients open `?net=local` only, so they would
 * run the saved graphics preset, not `gfx=epic`. Page A hosts, the others join by code; same menu clicks and waits.
 */
async function joinRoom(players, ctl) {
  const params = roomParams();
  const { browser, ctx, page: A, errors: eA } = await launch({ url: URL, params, viewport: { width: VW, height: VH } });
  ctl.browser = browser;
  const pages = [A];
  const errors = [eA];
  await A.click('.main-menu .btn:has-text("Co-op")');
  await A.click('.btn:has-text("Host a room")');
  await until(A, () => !!document.querySelector('.lobby-screen') && !!window.__coop, null, 15000, 'host lobby');
  const code = await A.evaluate(() => window.__coop.session.code);
  for (let i = 1; i < players; i++) {
    const { page, errors: e } = await openPage(ctx, URL, params);
    await page.click('.main-menu .btn:has-text("Co-op")');
    await page.click('.btn:has-text("Join with code")');
    await page.keyboard.type(code.toLowerCase());
    await page.keyboard.press('Enter');
    await until(A, (k) => window.__coop.session.players.size === k, i + 1, 15000, 'host sees client');
    pages.push(page);
    errors.push(e);
  }
  setSimPages(pages);
  return { browser, pages, errors };
}

async function runPage(map, players, n, ctl) {
  const id = mapId(map);
  const tag = `${map} x ${players}p x ${n}`;
  const base = { map, mapId: id, players, count: n };
  log(`${tag}: boot (${roomParams()})`);
  const { browser, pages, errors } = await joinRoom(players, ctl);
  const clients = pages.slice(1);
  try {
    await startMode(pages, 'sector', id);
    await pages[0].waitForFunction(() => window.__app?.current?.player && window.__app.current.enemyMgr, null, { timeout: LOAD_MS });
    for (const P of clients) await P.waitForFunction(() => window.__app?.current?.player && window.__app.current.net, null, { timeout: LOAD_MS });
    const ops = await Promise.all(pages.map((P) => waitOperator(P, GFX === 'min' ? 3 : 1, 120_000)));
    if (ops.some((t) => t < 0)) log(`${tag}: Wren's LOD did not load in 120 s on page(s) ${ops.map((t, i) => (t < 0 ? ROLES[i] : null)).filter(Boolean).join(', ')} (measuring anyway; noted)`);
    await pages[0].waitForTimeout(1500);
    const spawn = await pages[0].evaluate(pageSpawn, [n, KIND]);
    log(`${tag}: spawned ${spawn.spawned} (alive ${spawn.alive}, ${spawn.inSight} in nav sight, mean ${spawn.meanDist.toFixed(1)} m)`);
    if (spawn.alive !== n) results.errors.push(`${tag}: asked for ${n} awake guards, got ${spawn.alive}`);
    // every client faces the guards (the worst case for its render); then wait for the snapshots to build the puppets
    const centroid = await pages[0].evaluate(pageCentroid);
    if (centroid) for (const P of clients) await P.evaluate(pageAim, centroid);
    const want = Math.min(spawn.alive, 32); // MAX_ENEMIES: the snapshot lists at most 32 guards
    const puppetFlags = [];
    if (want > 0) {
      const t0 = Date.now();
      let seen = [];
      while (Date.now() - t0 < 40_000) {
        seen = await Promise.all(clients.map((P) => P.evaluate(pagePuppets)));
        if (seen.every((s) => s && s.alive >= want)) break;
        await pages[0].waitForTimeout(250);
      }
      if (seen.some((s) => s === null)) puppetFlags.push('CoopClient.puppetList is not readable on a client page (renamed?): puppet counts are blank');
      else if (!seen.every((s) => s.alive >= want)) puppetFlags.push(`puppets after the 40 s wait: ${seen.map((s, i) => `${ROLES[i + 1]} ${s.alive}`).join(', ')} of ${want} wanted`);
    }
    for (const f of puppetFlags) { log(`${tag}: FLAG ${f}`); results.flags.push(`${tag}: ${f}`); }
    const cell = async (name, fn) => {
      const rec = { ...base, cell: name, spawn, wrenLoaded: ops.every((t) => t >= 0), puppetFlags };
      try {
        Object.assign(rec, await withTimeout(fn(), CELL_TIMEOUT, `${tag} ${name}`));
        const h = rec.pages.host;
        const cl = ROLES.slice(1, players).map((r) => rec.pages[r]);
        const w = rec.wire?.types.snap;
        log(`${tag} ${name}: host frame cpu ${h.frameCpuMs.med}/${h.frameCpuMs.p95}, gpu ${h.gpuMs?.med ?? 'n/a'}, draws ${h.draws.med}; clients cpu p95 ${cl.map((c) => c.frameCpuMs.p95).join('/')}, gpu ${cl.map((c) => c.gpuMs?.med ?? 'n/a').join('/')}, puppets ${cl.map((c) => c.puppets?.med ?? 'n/a').join('/')}; snap ${w ? `${w.msg.med}/${w.msg.max} chars, ${w.perS}/s` : 'n/a'}`);
        for (const fl of rec.flags ?? []) {
          log(`${tag} ${name}: FLAG ${fl}`);
          results.flags.push(`${tag} ${name}: ${fl}`);
        }
      } catch (e) {
        rec.error = String(e?.message ?? e).split('\n')[0];
        results.errors.push(`${tag} ${name}: ${rec.error}`);
        log(`${tag} ${name}: FAILED ${rec.error}`);
      }
      results.cells.push(rec);
    };
    // `prep` (the alert cell re-alerts the host's guards before each sample); every page is sampled at once
    const measure = async (prep = null) => {
      const flags = [];
      await pages[0].waitForTimeout(WARM * 1000);
      const doPrep = async () => { if (prep) await pages[0].evaluate(prep); };
      await doPrep();
      const clean = await Promise.all(pages.map((P, i) => P.evaluate(pageSample, [SECS, false, i === 0])));
      await doPrep();
      const counted = await Promise.all(pages.map((P) => P.evaluate(pageSample, [2, true, false])));
      const out = { pages: {}, wire: null, flags };
      pages.forEach((_, i) => {
        if (clean[i].frames.length < 3) throw new Error(`${ROLES[i]} rendered ${clean[i].frames.length} frame(s) in ${SECS} s`);
        out.pages[ROLES[i]] = pageSummary(clean[i], counted[i]);
      });
      out.wire = wireSummary(clean[0].wire, players - 1);
      if (!out.wire) flags.push('the host transport was not wrapped (window.__coop.session.transport.send missing): no wire numbers');
      else if (out.wire.types.snap.n === 0) flags.push('the host sent no snapshot in the sample');
      const h = clean[0];
      if (!(h.simAdvanced >= h.realSecs * 0.9)) flags.push(`host sim clock moved ${r3(h.simAdvanced)} s in ${r3(h.realSecs)} real s (the loop fell behind or paused; MAX_STEPS drops)`);
      for (const [i, c] of clean.entries()) if (!c.gpuTimer) { flags.push(`${ROLES[i]}: GPU timer not exposed`); break; }
      return out;
    };
    if (CELLS.includes('patrol')) await cell('patrol', () => measure());
    if (CELLS.includes('away')) {
      // (every page turned and turned back inside the cell: a failure there is this cell's error, the alert cell still runs)
      await cell('away', async () => {
        await Promise.all(pages.map((P) => P.evaluate(pageTurn, Math.PI)));
        try {
          return await measure();
        } finally {
          await Promise.all(pages.map((P) => P.evaluate(pageTurn, -Math.PI).catch(() => {})));
        }
      });
    }
    if (CELLS.includes('alert')) {
      await cell('alert', async () => {
        const alerted = await pages[0].evaluate(pageAlert);
        return { alerted, ...(await measure(pageAlert)) };
      });
    }
    errors.forEach((es, i) => {
      const pageErrors = es.filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
      if (pageErrors.length) results.errors.push(`${tag}: ${ROLES[i]}: ${pageErrors.length} console error(s), first: ${pageErrors[0].slice(0, 300)}`);
    });
  } finally {
    await browser.close().catch(() => {});
  }
}

mkdirSync(OUT, { recursive: true });
const tStart = Date.now();
for (const map of MAPS) {
  for (const players of PLAYERS) {
    for (const n of COUNTS) {
      const ctl = { browser: null };
      try {
        await withTimeout(runPage(map, players, n, ctl), PAGE_TIMEOUT, `${map} x ${players}p x ${n}`);
      } catch (e) {
        const msg = `${map} x ${players}p x ${n}: ${String(e?.message ?? e).split('\n')[0]}`;
        results.errors.push(msg);
        results.cells.push({ map, players, count: n, cell: 'boot', error: msg });
        log(`FAILED ${msg}`);
        // a timed-out run is still going: its browser goes now (runPage's own close waits on the hung call)
        await ctl.browser?.close().catch(() => {});
      }
      writeOutputs();
    }
  }
}
results.finished = new Date().toISOString();
results.minutes = +((Date.now() - tStart) / 60000).toFixed(1);
writeOutputs();
log(`done in ${results.minutes} min: ${results.cells.filter((c) => !c.error).length} cells ok, ${results.errors.length} error(s); ${join(OUT, 'RESULTS.md')}`);
stopServer();
process.exit(0);

// ---------- outputs: guard-cap-coop.json (every number), guard-cap-coop.csv (one row per cell), RESULTS.md ----------
function writeOutputs() {
  // each output on its own: one failing write never loses the others
  const put = (name, fn) => {
    try {
      fn();
    } catch (e) {
      console.error(`guard-cap-coop: writing ${name} failed: ${e?.message ?? e}`);
    }
  };
  put('guard-cap-coop.json', () => writeFileSync(join(OUT, 'guard-cap-coop.json'), JSON.stringify(results, null, 1)));
  put('guard-cap-coop.csv', () => writeFileSync(join(OUT, 'guard-cap-coop.csv'), resultsCsv(results)));
  put('RESULTS.md', () => writeFileSync(join(OUT, 'RESULTS.md'), resultsMd(results)));
}

// (a function, not a const: the run above calls the writers before a top-level const below it would be initialised)
function csvCols() {
  const cols = [
    ['map', (c) => c.map],
    ['players', (c) => c.players],
    ['count', (c) => c.count],
    ['cell', (c) => c.cell],
    ['error', (c) => c.error ?? ''],
    ['spawned', (c) => c.spawn?.spawned],
    ['alive', (c) => c.spawn?.alive],
    ['in_sight', (c) => c.spawn?.inSight],
    ['mean_dist_m', (c) => r3(c.spawn?.meanDist)],
  ];
  for (const role of ROLES) {
    const p = (get) => (c) => get(c.pages?.[role]);
    cols.push(
      [`${role}_frames`, p((x) => x?.frames)],
      [`${role}_fps`, p((x) => x?.fps)],
      [`${role}_frame_med_ms`, p((x) => x?.frameMs.med)],
      [`${role}_frame_p95_ms`, p((x) => x?.frameMs.p95)],
      [`${role}_frame_cpu_med_ms`, p((x) => x?.frameCpuMs.med)],
      [`${role}_frame_cpu_p95_ms`, p((x) => x?.frameCpuMs.p95)],
      [`${role}_frame_cpu_sim_med_ms`, p((x) => x?.frameCpuMsWithSim.med)],
      [`${role}_frame_cpu_sim_p95_ms`, p((x) => x?.frameCpuMsWithSim.p95)],
      [`${role}_render_cpu_med_ms`, p((x) => x?.renderCpuMs.med)],
      [`${role}_render_cpu_p95_ms`, p((x) => x?.renderCpuMs.p95)],
      [`${role}_gpu_med_ms`, p((x) => x?.gpuMs?.med)],
      [`${role}_gpu_p95_ms`, p((x) => x?.gpuMs?.p95)],
      [`${role}_draws_med`, p((x) => x?.draws.med)],
      [`${role}_tris_m_med`, p((x) => x?.trisM.med)],
      [`${role}_active_meshes_med`, p((x) => x?.activeMeshes.med)],
      [`${role}_puppets_med`, p((x) => x?.puppets?.med)],
      [`${role}_puppets_max`, p((x) => x?.puppets?.max)],
      [`${role}_puppets_alive_end`, p((x) => x?.puppetsEnd?.alive)],
    );
  }
  for (const t of TYPES) {
    const w = (get) => (c) => get(c.wire?.types[t]);
    cols.push(
      [`wire_${t}_n`, w((x) => x?.n)],
      [`wire_${t}_msg_med_chars`, w((x) => x?.msg.med)],
      [`wire_${t}_msg_mean_chars`, w((x) => x?.msg.mean)],
      [`wire_${t}_msg_max_chars`, w((x) => x?.msg.max)],
      [`wire_${t}_per_s`, w((x) => x?.perS)],
      [`wire_${t}_chars_per_s_med`, w((x) => x?.bps.med)],
      [`wire_${t}_chars_per_s_max`, w((x) => x?.bps.max)],
    );
  }
  cols.push(
    ['wire_ev_events_med', (c) => c.wire?.types.ev.events?.med],
    ['wire_ev_events_max', (c) => c.wire?.types.ev.events?.max],
    ['wire_total_chars_per_s_med', (c) => c.wire?.totalBps.med],
    ['wire_total_chars_per_s_max', (c) => c.wire?.totalBps.max],
    ['wire_total_x_clients_med', (c) => c.wire?.totalBpsXClients.med],
    ['wire_total_x_clients_max', (c) => c.wire?.totalBpsXClients.max],
    ['wire_stringify_ms_per_s', (c) => c.wire?.stringifyMsPerS],
    ['flags', (c) => (c.flags ?? []).join(' | ')],
  );
  return cols;
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

// ---------- RESULTS.md ----------
function resultsMd(R) {
  const f = (s, k = 'med') => (s && s[k] !== null && s[k] !== undefined ? String(s[k]) : '-');
  const mp = (s) => (s ? `${f(s)} / ${f(s, 'p95')}` : '-');
  const mm = (s) => (s ? `${f(s)} / ${f(s, 'max')}` : '-');
  const L = [];
  L.push('# Guard cap, co-op: results', '');
  L.push(`Run ${R.started} - ${R.finished ?? '?'} (${R.minutes ?? '?'} min), version ${R.version ?? '?'}, hardware GPU (E2E_GPU=1), ${R.uncapped ? 'frame rate uncapped' : 'display-capped'}, gfx=${R.gfx}, ${R.viewport.join('x')} per page, guards: ${R.kind}, warm ${R.warm} s${R.warmAsked !== R.warm ? ` (asked ${R.warmAsked}, raised to the 5 s minimum)` : ''}, sample ${R.secs} s on every page at once.`);
  L.push('Medians / p95 in ms unless named. Script: `scripts/guard-cap-coop.mjs`; method and decision rule: `docs/guard-cap/PLAN.md`. Guards are spawned on the host page; every client page faces them (the `away` cell turns every page 180 degrees). Frame CPU is the loop\'s own per-frame CPU (sim + update + render submit); uncapped, most frames run no 60 Hz step, so the frames that ran one are shown too. Wire sizes are `JSON.stringify(msg).length` characters.', '');
  const ok = R.cells.filter((c) => !c.error && c.pages);
  const groups = [];
  for (const c of R.cells) if (!groups.some((g) => g.map === c.map && g.players === c.players)) groups.push({ map: c.map, players: c.players });
  const roleList = (players) => ROLES.slice(0, players);
  for (const { map, players } of groups) {
    const cs = ok.filter((x) => x.map === map && x.players === players);
    if (!cs.length) continue;
    L.push(`## ${map}, ${players} players`, '');
    L.push('### Per page', '');
    L.push('| N | cell | page | frame ms med / p95 | fps | frame CPU med / p95 | frame CPU, sim frames med / p95 | render() CPU med / p95 | GPU ms med / p95 | draws | tris M | active meshes | puppets med (alive at end) |');
    L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const c of cs) {
      for (const role of roleList(players)) {
        const p = c.pages[role];
        if (!p) continue;
        L.push(`| ${c.count} | ${c.cell} | ${role} | ${mp(p.frameMs)} | ${p.fps ?? '-'} | ${mp(p.frameCpuMs)} | ${mp(p.frameCpuMsWithSim)} | ${mp(p.renderCpuMs)} | ${p.gpuMs ? mp(p.gpuMs) : 'n/a'} | ${f(p.draws)} | ${f(p.trisM)} | ${f(p.activeMeshes)} | ${p.puppets ? `${f(p.puppets)} (${p.puppetsEnd?.alive ?? '-'})` : '-'} |`);
      }
    }
    L.push('');
    L.push('### Host wire (characters per message / per second; a broadcast counts once)', '');
    L.push('| N | cell | snap med / max | snaps per s | snap per s med / max | ev med / max | ev events per msg med / max | ev per s max | lamps n, max | sector n, max | other n, per s max | all types per s med / max | x clients (med / max) | stringify ms per s |');
    L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const c of cs) {
      const w = c.wire;
      if (!w) { L.push(`| ${c.count} | ${c.cell} | no wire data | | | | | | | | | | | |`); continue; }
      const t = w.types;
      L.push(`| ${c.count} | ${c.cell} | ${mm(t.snap.msg)} | ${t.snap.perS} | ${mm(t.snap.bps)} | ${mm(t.ev.msg)} | ${mm(t.ev.events)} | ${f(t.ev.bps, 'max')} | ${t.lamps.n}, ${f(t.lamps.msg, 'max')} | ${t.sector.n}, ${f(t.sector.msg, 'max')} | ${t.other.n}, ${f(t.other.bps, 'max')} | ${mm(w.totalBps)} | ${w.totalBpsXClients.med} / ${w.totalBpsXClients.max} (x${w.clients}) | ${w.stringifyMsPerS} |`);
    }
    L.push('');
    // the A3 readings at 24 and 32 (the worst cell of the run; the repeats' median is the reader's)
    const big = [...new Set(cs.filter((c) => c.count >= 24).map((c) => c.count))].sort((a, b) => a - b);
    if (big.length) {
      L.push('### Decision-rule readings (worst cell at each N; host sim p95 is M0\'s)', '');
      L.push('| N | host frame CPU p95 (<= 12) | host GPU p95 (<= 15) | worst client frame CPU p95 (<= 12) | worst client GPU p95 | snap max chars (<= 6144 at 4 players) | snap med chars |');
      L.push('| --- | --- | --- | --- | --- | --- | --- |');
      const mx = (a) => { const v = a.filter((x) => x !== null && x !== undefined && Number.isFinite(x)); return v.length ? Math.max(...v) : null; };
      const mk = (v, lim) => (v === null ? '-' : `${v}${lim !== undefined && v > lim ? ' OVER' : ''}`);
      for (const n of big) {
        const at = cs.filter((c) => c.count === n);
        const clientsOf = (c) => roleList(players).slice(1).map((r) => c.pages[r]).filter(Boolean);
        const hostCpu = mx(at.map((c) => c.pages.host?.frameCpuMs.p95));
        const hostGpu = mx(at.map((c) => c.pages.host?.gpuMs?.p95));
        const cliCpu = mx(at.flatMap((c) => clientsOf(c).map((p) => p.frameCpuMs.p95)));
        const cliGpu = mx(at.flatMap((c) => clientsOf(c).map((p) => p.gpuMs?.p95)));
        const snapMax = mx(at.map((c) => c.wire?.types.snap.msg.max));
        const snapMed = mx(at.map((c) => c.wire?.types.snap.msg.med));
        L.push(`| ${n} | ${mk(hostCpu, 12)} | ${mk(hostGpu, 15)} | ${mk(cliCpu, 12)} | ${mk(cliGpu)} | ${mk(snapMax, players === 4 ? 6144 : undefined)} | ${mk(snapMed)} |`);
      }
      L.push('');
    }
  }
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
