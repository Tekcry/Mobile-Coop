// LR16-8 showcase sheets (Sector Ops Build's request): one headless GPU run over campusOps (S1-S5), warehouseOps (the
// Workshop + the whole map), ctcourse, warehouse, kestrel and proving: ten shots per unit (110), named
// <map>-<unit>-<nn>.png, plus per map the parity probe (5 seeded points), bake time / atlas MB at Epic and Low, and on
// campus the frame time p95 at S2 and S5-worst with 24 guards. Writes report.json beside the images.
//
// Run model (the laptop queue): cwd = a built worktree of the tested commit (`npm run build` done), env E2E_PORT and
// E2E_GPU=1:   node C:/NightShift/scratch/work/lr16-8/sheets.mjs
// It serves dist/ itself with `vite preview` on E2E_PORT (reuses a server only when it serves this dist/index.html),
// launches the preinstalled Chromium headless with e2e-lib's flags (E2E_GPU=1: ANGLE D3D11), one browser per map, and
// stops both at the end. Exit 0 when report.json is written (flagged shots are data); 2 = setup (no dist, port taken by
// another build); 1 = a crash or the whole-run cap.
// Optional env: LR8_OUT (default C:/NightShift/scratch/lighting/lr16-8), LR8_ONLY=campusOps:s2,warehouse (maps or
// map:unit), LR8_SKIP=coop,bake,perf,probe,epic, LR8_CAP_MIN (whole-run cap, default 170).
// Modelled on scripts/sector-lights-shots.mjs, lamps-shots.mjs, nv-shots.mjs, campus-art-shots.mjs (photo freeze
// views), lamp-audit.mjs (the framing method), e2e-darkness.mjs (the grey card read-back), shots-ctcourse.mjs (meter vs
// field), guard-cap.mjs (guard spawn, frame timing) and e2e-net-lib.mjs (the two-page pair).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MAPS, parseAudit, pickDark, lumaBand, fnv, pct } from './pure.mjs';

const T0 = Date.now();
const ROOT = process.cwd();
const OUT = (process.env.LR8_OUT ?? 'C:/NightShift/scratch/lighting/lr16-8').replaceAll('\\', '/');
const FR = `${OUT}/frames`;
const PORT = Number(process.env.E2E_PORT ?? 4189);
const URL = `http://127.0.0.1:${PORT}/`;
const ONLY = (process.env.LR8_ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const SKIP = new Set((process.env.LR8_SKIP ?? '').split(',').map((s) => s.trim()).filter(Boolean));
const CAP_MIN = Number(process.env.LR8_CAP_MIN ?? 170);
const VIEW = { width: 1280, height: 720 };
/** Display luma (Rec. 709 of the sRGB pixel, 0..1) of a "lit pool" pixel and a "dark" pixel: the L5 bands of the
 *  audit's field lines (lit > 0.45 -> about 0.2 on screen; dark < 0.28 -> under 0.09, e2e-darkness TARGETS). */
const LIT_LUMA = 0.2;
const DARK_LUMA = 0.09;
/** A frame holds a pool / a dark when that share of its pixels is lit / dark (the audit's VIEW_MIN_SHARE). */
const MIN_SHARE = 0.05;
const D2R = Math.PI / 180;
const r3 = (x) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : x);
const pc = (x) => `${Math.round(x * 100)}%`;
const nn2 = (n) => String(n).padStart(2, '0');
const log = (...a) => console.log(`[lr16-8 ${new Date().toISOString().slice(11, 19)} +${((Date.now() - T0) / 60000).toFixed(1)}m]`, ...a);

// ---------- setup: the repo's helpers, dist, the server ----------
if (!existsSync(path.join(ROOT, 'scripts/e2e-lib.mjs')) || !existsSync(path.join(ROOT, 'node_modules/vite/bin/vite.js'))) {
  console.error(`lr16-8: run with cwd = a built repo worktree (scripts/e2e-lib.mjs, node_modules: ${ROOT})`);
  process.exit(2);
}
if (!existsSync(path.join(ROOT, 'dist/index.html'))) {
  console.error('lr16-8: dist/index.html missing (run `npm run build` first)');
  process.exit(2);
}
// (two pages build and bake a big map: the pair's match load gets 5 min, read by e2e-net-lib at import)
process.env.E2E_LOAD_MS ??= '300000';
const lib = await import(pathToFileURL(path.join(ROOT, 'scripts/e2e-lib.mjs')).href);
const net = await import(pathToFileURL(path.join(ROOT, 'scripts/e2e-net-lib.mjs')).href);
const { launch, openPage, fakePointerLock, waitOperator, GPU } = lib;
if (!GPU) log('WARNING: E2E_GPU is not 1: software GL (the images and numbers are not a look or perf result)');

const distIndex = readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');
let server = null;
const browsers = new Set();
const stopServer = () => { try { server?.kill(); } catch { /* gone */ } };
process.on('exit', stopServer);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { log(`${sig}: stopping`); for (const b of browsers) b.close().catch(() => {}); stopServer(); process.exit(1); });
{
  const answering = await fetch(URL).then((r) => r.text(), () => null);
  if (answering !== null) {
    if (answering !== distIndex) { console.error(`lr16-8: port ${PORT} answers with another build: free it or pick another E2E_PORT`); process.exit(2); }
    log(`reusing the server on ${PORT} (serves this dist)`);
  } else {
    server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore', cwd: ROOT });
    let up = false;
    for (let i = 0; i < 80 && !up; i++) {
      try { up = (await fetch(URL)).ok; } catch { await new Promise((r) => setTimeout(r, 250)); }
    }
    if (!up || server.exitCode !== null) { console.error('lr16-8: preview server did not start (port taken? dist built?)'); stopServer(); process.exit(2); }
    if ((await (await fetch(URL)).text()) !== distIndex) { console.error('lr16-8: served index.html is not this dist'); stopServer(); process.exit(2); }
    log(`serving dist/ on ${PORT}`);
  }
}
mkdirSync(FR, { recursive: true });

// ---------- the report ----------
const AUDIT_PATH = path.join(ROOT, 'docs/sector-redesign/checks/lr16-lamp-audit.md');
const AUDIT = existsSync(AUDIT_PATH) ? parseAudit(readFileSync(AUDIT_PATH, 'utf8')) : {};
let head = null;
try { head = (await import('node:child_process')).execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { /* not a git tree */ }
const HOOKS = {
  '01-03': 'window.__app.current (GameState): player.controller.teleport, photoFreeze / photoCamera (photo mode), vision.set("off"); the spot planner: nav (NavGrid cells), ballistics.cast + world.lightField.levelAt (the lamp-audit framing rays); screenshot luma histograms',
  '04': 'world.level.lights (LightRegistry), ballistics.cast (the nearest wall face and the ceiling over the lamp), photo camera; ceiling luma',
  '05': 'player teleport with the rig shown, world.charShadows (silhouette slots, stats()), Epic pass: app.quality.setOverride({ preset: "epic" })',
  '06': 'world.level.boxes / world.layout.props (crate / rack), world.doors.setOpen (the leaf open), the lamp registry',
  '07': 'enemyMgr.spawn (passive grunts), Enemy.torchOverride (the coop-torches test hook), enemyMgr.torchesOn, world.doors.setOpen(false); on / off screenshot diff',
  '08': 'stealth.shotRay (the round on the fitting; shootLight fallback), the circuit wall switch item (StealthSystems switch onUse = the player toggle; LightRegistry.setGroup fallback), GameState.lightLevel (the HUD meter), LightRegistry.restore',
  '09': 'vision.set("night" / "thermal"), enemyMgr.spawn (a warm body in view); the darkest room from the audit file',
  '10': 'two pages over ?net=local in one context (the host / join menu flow of e2e-net-lib hostAndJoin, startMode, until), RemotePlayer.allowTeleport, the remote avatar rig headNode, Vector3.TransformCoordinates for the crop',
  probe: 'GameState.lightLevel (the meter) vs world.lightField.bodyLevel (shots-ctcourse parity); World.addLightProbe grey card + centre display-luma read-back against the L5 band (e2e-darkness)',
  bake: 'World.lightInfo() (bake ms, lamp visibility bytes), BakedLamps.atlasDims (R8 atlas), a fresh context per preset (?gfx=epic / ?gfx=low: a cold bake)',
  perf: 'guard-cap pageSpawn (24 passive grunts in a wedge in front of the camera) + loop.onFrameEnd frame intervals + EXT_disjoint_timer_query_webgl2 GPU ms, in an E2E_UNCAP=1 browser, 1920x1080',
};
const DEVIATIONS = [
  'No `__game` hook exists on this commit: `window.__app.current` is the game (every shot script uses it); `__course` is not needed (no course-only shot).',
  'campusOps has no Workshop room: the Workshop unit is the Sector Ops Workshop on warehouseOps (room `workshop`, the 4.78 wall-arc room). Maps without sectors are one unit, `all`.',
  'Parity probe: there is no hook reading the shader light level back on this commit (BakedLamps.volumeAt needs the editor-only volume; the e2e-lightbake parity probe named in lr16-5b-build.md is not in the script). The probe is the meter vs the light field (shots-ctcourse, |diff| < 0.02) plus the grey card display luma checked against the L5 band of its field level (e2e-darkness).',
  'Auto graphics = `?gfx=user&detect=1` (the saved defaults; automation skips the detection without detect=1). The starred shots (05, 07) are taken again at Epic through app.quality.setOverride, skipped when Auto already is Epic.',
  'Realistic is the only light model (LR16a removed the switch): nothing to set.',
  'Each map\'s own guards are removed and its security cameras paused (security.fixedUpdate replaced), so no alarm stage changes the lights mid-shot; the guards of shots 07 / 09 and the perf cells are spawned passive grunts.',
  'Free Roam (sandbox) builds no nav grid or EnemyManager (gameState.ts:667): warehouse boots `mode=clear` (e2e-stealth-ai) and proving `mode=mission` (e2e-tactics), their mode fixedUpdate replaced so it spawns, alarms and ends nothing; their co-op pair runs `clear` (Mission is no NetMode). Kestrel boots only in sandbox: its shots and probe are "not possible", its bakes run. A boot without a nav grid after 30 s is recorded as "no nav grid in <mode>" and the map moves on.',
  'Shot 09: the thermal ghost through a shut door is LR16-6 (not built): the note says what thermal shows (a warm guard is placed in view).',
  'Shot 10: vision is never sent to the partner (D8): what A sees of B\'s goggles is the same in every mode of B.',
  'Pass / flag: 01-03, 04, 07, 08, 09, 10 and the probe have cheap automated checks; 05 and 06 (shadow softness) are "review": the sheet is the result.',
];
const report = {
  script: 'C:/NightShift/scratch/work/lr16-8/sheets.mjs',
  commit: head,
  cwd: ROOT,
  started: new Date().toISOString(),
  gpu: GPU,
  port: PORT,
  thresholds: { LIT_LUMA, DARK_LUMA, MIN_SHARE, fieldLit: 0.45, fieldDark: 0.28, parity: 0.02 },
  hooks: HOOKS,
  deviations: DEVIATIONS,
  auditFile: existsSync(AUDIT_PATH) ? 'docs/sector-redesign/checks/lr16-lamp-audit.md' : 'MISSING',
  maps: {},
  probeTable: [],
  bakeTable: [],
  perf: [],
  errors: [],
};
const writeReport = () => {
  try {
    report.updated = new Date().toISOString();
    report.minutes = +((Date.now() - T0) / 60000).toFixed(1);
    writeFileSync(`${OUT}/report.json`, JSON.stringify(report, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? null : v), 1));
  } catch (e) {
    console.error(`lr16-8: writing report.json failed: ${e?.message ?? e}`);
  }
};
const runCap = setTimeout(() => {
  log(`whole-run cap ${CAP_MIN} min reached: writing the report and stopping`);
  report.errors.push(`whole-run cap ${CAP_MIN} min reached`);
  writeReport();
  for (const b of browsers) b.close().catch(() => {});
  stopServer();
  process.exit(1);
}, CAP_MIN * 60_000);

const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${what} timed out after ${Math.round(ms / 1000)} s`)), ms))]);
const wanted = (mapId, unit) => !ONLY.length || ONLY.includes(mapId) || (unit !== undefined && ONLY.includes(`${mapId}:${unit}`)) || (unit === undefined && ONLY.some((o) => o.startsWith(`${mapId}:`)));

// ---------- in-page code (serialised into the page: self-contained) ----------

/** The page library: `window.__lr8`. Geometry through the game's own physics rays, nav grid and light field. */
function pageLib() {
  if (window.__lr8) return true;
  const A = () => window.__app;
  const G = () => window.__app.current;
  const STATIC = 1;
  const D2R = Math.PI / 180;
  const VC = () => G().player.position.constructor;
  const v3 = (a) => new (VC())(a[0], a[1], a[2]);
  const r3 = (x) => Math.round(x * 1000) / 1000;
  const P = (a) => a.map(r3);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const yawDir = (yaw, pitch = 0) => [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
  const yawTo = (a, b) => Math.atan2(b[0] - a[0], b[2] - a[2]);
  const L = { hide: true };
  L.cast = (a, b) => {
    const r = G().ballistics.cast(v3(a), v3(b), STATIC);
    if (!r.hasHit) return null;
    const p = r.hitPoint;
    const n = r.hitNormal;
    const hp = [p.x, p.y, p.z];
    return { p: hp, n: [n.x, n.y, n.z], d: dist(a, hp) };
  };
  L.clear = (a, b) => G().ballistics.clear(v3(a), v3(b), STATIC);
  L.nav = () => G().nav ?? G().enemyMgr?.nav;
  L.floorAt = (x, z, y = NaN, ring = 4) => {
    const nav = L.nav();
    const c = nav.nearestWalkable(x, z, ring, y);
    if (c < 0) return null;
    const q = nav.center(c);
    return [q[0], nav.height[c], q[1]];
  };
  /** A walkable floor point at p (within 0.9 m in plan) on p's storey (within ytol). */
  L.standAt = (p, ytol = 0.6) => {
    const f = L.floorAt(p[0], p[2], p[1], 3);
    if (!f || dist2(f, p) > 0.9 || Math.abs(f[1] - p[1]) > ytol) return null;
    return f;
  };
  L.inRoom = (r, x, z, y) => !(y === y && ((r.minY !== undefined && y < r.minY - 0.5) || (r.maxY !== undefined && y >= r.maxY))) && x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;
  L.unitRooms = (u) => {
    const rooms = G().world.layout?.rooms ?? [];
    if (u.all) return rooms;
    if (u.rooms) return rooms.filter((r) => u.rooms.includes(r.id));
    if (u.prefix) return rooms.filter((r) => r.id.startsWith(u.prefix));
    return [];
  };
  L.inUnit = (u, x, y, z) => {
    if (u.all) {
      const b = G().world.level.bounds;
      return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
    }
    return L.unitRooms(u).some((r) => L.inRoom(r, x, z, y));
  };
  /** Walkable nav cells of the unit on a `step` m lattice, every storey: [x, floor y, z]. */
  L.cells = (u, step) => {
    const nav = L.nav();
    const k = Math.max(1, Math.round(step / nav.cell));
    const rooms = u.all ? null : L.unitRooms(u);
    const b = G().world.level.bounds;
    const out = [];
    for (let l = 0; l < nav.layers; l++) {
      for (let iz = 0; iz < nav.h; iz += k) {
        for (let ix = 0; ix < nav.w; ix += k) {
          const i = l * nav.cols + iz * nav.w + ix;
          if (nav.walk[i] !== 1) continue;
          const c = nav.center(i);
          const y = nav.height[i];
          const ok = rooms ? rooms.some((r) => L.inRoom(r, c[0], c[1], y)) : c[0] >= b.minX && c[0] <= b.maxX && c[1] >= b.minZ && c[1] <= b.maxZ;
          if (ok) out.push([c[0], y, c[1]]);
        }
      }
    }
    return out;
  };
  /** Lit fixed lamps (and spots) over the unit, by id, with the floor under them. */
  L.lamps = (u) => {
    const out = [];
    for (const l of G().world.level.lights.lights) {
      if ((l.kind !== 'lamp' && l.kind !== 'spot') || l.destroyed || !l.on || !(l.radius > 0) || !(l.intensity > 0)) continue;
      const f = L.floorAt(l.x, l.z, l.y - 2.6, 6);
      if (!f || dist2(f, [l.x, 0, l.z]) > 2.5 || f[1] > l.y - 0.5) continue;
      if (u && !L.inUnit(u, l.x, f[1], l.z)) continue;
      out.push({ id: l.id, x: l.x, y: l.y, z: l.z, floor: f, base: l.fixture?.base ?? null, model: l.fixture?.model ?? null, oy: l.fixture?.oy ?? 0, group: l.group, radius: l.radius, intensity: l.intensity, kind: l.kind, destructible: !!l.destructible });
    }
    return out.sort((a, b) => a.id - b.id);
  };
  /** The audit's framing rays for one view (5 yaws x 3 pitches, 25 m): lit / dark shares of the field at the hits. */
  L.viewShares = (eye, yaw) => {
    const f = G().world.lightField;
    let lit = 0;
    let dark = 0;
    let n = 0;
    for (const dy of [-28, -14, 0, 14, 28]) {
      for (const pt of [-25, -10, 5]) {
        const d = yawDir(yaw + dy * D2R, pt * D2R);
        const h = L.cast(eye, add(eye, d, 25));
        if (!h) continue;
        const q = add(h.p, d, -0.05);
        const lv = f.levelAt(q[0], q[1], q[2]);
        n++;
        if (lv > 0.45) lit++;
        else if (lv < 0.28) dark++;
      }
    }
    return { lit: n ? lit / n : 0, dark: n ? dark / n : 0, n };
  };
  /** Shots 1-3: three standing spots 8 m apart whose four views (N +z, E +x, S, W) each see a pool and a dark. */
  L.spinSpots = (u) => {
    let step = 2;
    let cells = L.cells(u, step);
    while (cells.length > 700) {
      step *= 1.4;
      cells = L.cells(u, step);
    }
    const scored = [];
    for (const c of cells) {
      const eye = [c[0], c[1] + 1.6, c[2]];
      const ys = [0, 90, 180, 270].map((y) => L.viewShares(eye, y * D2R));
      if (ys.some((s) => s.n < 6)) continue;
      const mins = ys.map((s) => Math.min(s.lit, s.dark));
      scored.push({ p: c, score: Math.min(...mins), mean: mins.reduce((a, b) => a + b, 0) / 4, yaws: ys.map((s) => [r3(s.lit), r3(s.dark)]) });
    }
    scored.sort((a, b) => b.score - a.score || b.mean - a.mean || a.p[0] - b.p[0] || a.p[2] - b.p[2] || a.p[1] - b.p[1]);
    const pick = [];
    for (const s of scored) {
      if (pick.every((q) => dist(q.p, s.p) >= 8)) pick.push(s);
      if (pick.length === 3) break;
    }
    for (const s of scored) {
      if (pick.length >= 3) break;
      if (!pick.includes(s)) pick.push(s);
    }
    return { step: r3(step), cells: cells.length, scored: scored.length, spots: pick.map((s) => ({ p: P(s.p), score: r3(s.score), mean: r3(s.mean), yaws: s.yaws })) };
  };
  /** Shot 4: the lamp nearest a wall face (ceiling fittings first), the view of that wall and of the ceiling over it. */
  L.wallLamp = (lamps) => {
    let best = null;
    const order = [...lamps.filter((l) => l.base !== 'wall'), ...lamps.filter((l) => l.base === 'wall')];
    for (const l of order) {
      if (best && l.base === 'wall' && best.base !== 'wall') break;
      const o = [l.x, l.y - 0.3, l.z];
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const h = L.cast(o, add(o, [Math.sin(a), 0, Math.cos(a)], 6));
        if (!h || Math.abs(h.n[1]) > 0.5 || h.d < 0.12 || (l.base === 'wall' && h.d < 0.45)) continue;
        if (!best || h.d < best.d - 1e-6) best = { lamp: l, d: h.d, W: h.p, n: norm([h.n[0], 0, h.n[2]]), base: l.base };
      }
    }
    if (!best) return null;
    const l = best.lamp;
    const W = best.W;
    const n = best.n;
    const tgt = [W[0], (l.floor[1] + l.y) / 2 + 0.2, W[2]];
    let cam = null;
    for (const k of [3.2, 2.6, 2.0, 1.5]) {
      const f = L.standAt([W[0] + n[0] * k, l.floor[1], W[2] + n[2] * k]);
      if (!f) continue;
      const eye = [f[0], f[1] + 1.6, f[2]];
      if (L.clear(eye, add(tgt, n, 0.1))) { cam = eye; break; }
    }
    const up = L.cast([l.x, l.y + 0.1, l.z], [l.x, l.y + 10, l.z]);
    const ceilY = up ? up.p[1] : null;
    let ccam = null;
    for (const k of [1.8, 1.2, 2.5, 0.6]) {
      const f = L.standAt([l.x + n[0] * k, l.floor[1], l.z + n[2] * k]);
      if (f) { ccam = [f[0], f[1] + 1.5, f[2]]; break; }
    }
    return { lamp: l.id, lampPos: P([l.x, l.y, l.z]), model: l.model, base: l.base, wallDist: r3(best.d), wall: P(W), normal: P(n), cam: cam && P(cam), target: P(tgt), ceilY: ceilY === null ? null : r3(ceilY), ccam: ccam && P(ccam), ctarget: P([(l.x + W[0]) / 2, ceilY ?? l.y + 3, (l.z + W[2]) / 2]) };
  };
  /** Shot 5: a ceiling lamp with open floor 1 m and 4 m off it in one direction, a side-on camera for each. */
  L.charLamp = (lamps) => {
    const all = L.lamps(null);
    for (const l of lamps.filter((q) => q.base !== 'wall')) {
      const F = l.floor;
      if (dist2(F, [l.x, 0, l.z]) > 0.8) continue;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const d = [Math.sin(a), 0, Math.cos(a)];
        const p1 = L.standAt(add(F, d, 1), 0.3);
        const p4 = L.standAt(add(F, d, 4), 0.3);
        if (!p1 || !p4 || !L.clear([F[0], F[1] + 1, F[2]], [p4[0], p4[1] + 1, p4[2]])) continue;
        const s = [-d[2], 0, d[0]];
        const frames = [];
        for (const [m, p] of [[1, p1], [4, p4]]) {
          let cam = null;
          for (const side of [1, -1]) {
            for (const k2 of [3.2, 2.5]) {
              if (cam) break;
              const c = L.standAt(add(add(p, s, side * k2), d, 0.6), 0.4);
              if (!c) continue;
              const eye = [c[0], c[1] + 1.35, c[2]];
              if (L.clear(eye, [p[0], p[1] + 0.9, p[2]]) && L.clear(eye, [p[0], p[1] + 0.1, p[2]])) cam = eye;
            }
          }
          if (!cam) break;
          // the lamp nearest the character (the request: "from the nearest lamp")
          let near = null;
          for (const q of all) {
            const dd = dist2(p, [q.x, 0, q.z]);
            if (!near || dd < near.d) near = { id: q.id, d: dd };
          }
          frames.push({ m, feet: P(p), yaw: r3(yawTo(p, cam)), cam: P(cam), target: P([p[0], p[1] + 0.85, p[2]]), nearest: { id: near?.id ?? null, d: r3(near?.d ?? NaN) } });
        }
        if (frames.length === 2) return { lamp: l.id, lampPos: P([l.x, l.y, l.z]), floor: P(F), dir: P(d), frames };
      }
    }
    return null;
  };
  /** The door's plan normal (floor on both sides along it), or null. */
  L.doorNormal = (d, fy) => {
    for (const a of [d.anchor.yaw, d.anchor.yaw + Math.PI / 2]) {
      const n = [Math.sin(a), 0, Math.cos(a)];
      if (L.standAt([d.cx + n[0] * 1.2, fy, d.cz + n[2] * 1.2], 0.5) && L.standAt([d.cx - n[0] * 1.2, fy, d.cz - n[2] * 1.2], 0.5)) return n;
    }
    return null;
  };
  L.doorFloor = (d) => L.floorAt(d.cx, d.cz, d.anchor.hinge?.y ?? NaN, 3);
  /** Shot 6: a crate / rack box standing on the floor under a lamp (props first), viewed at its base. */
  L.crate = (u, lamps) => {
    const w = G().world;
    const cands = [];
    for (const p of w.layout?.props ?? []) {
      if (!['crate', 'smallCrate', 'box'].includes(p.kind) || !Number.isFinite(p.pos?.x)) continue;
      const x = p.pos.x;
      const y = p.pos.y;
      const z = p.pos.z;
      const f = L.floorAt(x, z, y, 4);
      if (!f || !L.inUnit(u, x, f[1], z)) continue;
      cands.push({ kind: `prop ${p.kind}`, c: [x, f[1] + 0.4, z], half: 0.45, lo: 0.6, bottom: f[1], h: 0.8 });
    }
    w.level.boxes.forEach((b, i) => {
      if (!b.collide || b.visible === false || b.glass || b.detail || b.pitch) return;
      const h = b.s[1];
      const lo = Math.min(b.s[0], b.s[2]);
      const hi = Math.max(b.s[0], b.s[2]);
      if (h < 0.35 || h > 3.2 || lo < 0.3 || hi > 4 || (h > 2.4 && lo < 0.45)) return;
      const bottom = b.c[1] - h / 2;
      const f = L.floorAt(b.c[0] + (lo / 2 + 0.5), b.c[2], bottom, 4) ?? L.floorAt(b.c[0], b.c[2], bottom, 6);
      if (!f || Math.abs(f[1] - bottom) > 0.08 || !L.inUnit(u, b.c[0], bottom, b.c[2])) return;
      cands.push({ kind: `box ${i}`, c: [b.c[0], b.c[1], b.c[2]], half: hi / 2, lo, bottom, h });
    });
    let best = null;
    for (const c of cands) {
      for (const l of lamps) {
        const d = dist2(c.c, [l.x, 0, l.z]);
        if (d > 4.5 || l.y < c.bottom + c.h + 0.3) continue;
        if (!best || d < best.d - 1e-6) best = { c, l, d };
      }
    }
    if (!best) return null;
    const { c, l } = best;
    let ux = c.c[0] - l.x;
    let uz = c.c[2] - l.z;
    const ul = Math.hypot(ux, uz) || 1;
    ux /= ul;
    uz /= ul;
    if (!(best.d > 0.05)) { ux = 1; uz = 0; }
    const base = Math.atan2(ux, uz);
    for (const off of [35, -35, 0, 70, -70, 110, -110]) {
      const d = yawDir(base + off * D2R);
      const f = L.standAt([c.c[0] + d[0] * (c.half + 2.2), c.bottom, c.c[2] + d[2] * (c.half + 2.2)], 0.3);
      if (!f) continue;
      const eye = [f[0], f[1] + 1.3, f[2]];
      const side = [c.c[0] + d[0] * (c.lo / 2 + 0.05), c.bottom + 0.15, c.c[2] + d[2] * (c.lo / 2 + 0.05)];
      if (!L.clear(eye, side)) continue;
      return { what: c.kind, at: P(c.c), size: [r3(c.lo), r3(c.h)], lamp: l.id, lampDist: r3(best.d), cam: P(eye), target: P([c.c[0], c.bottom + 0.2, c.c[2]]) };
    }
    return null;
  };
  /** Shot 6: a door within 3.5 m (plan) of a lit lamp over its floor; the camera on the lamp's side. */
  L.doorLamp = (u, lamps) => {
    let best = null;
    for (const d of G().world.doors.list) {
      const f = L.doorFloor(d);
      if (!f || !L.inUnit(u, d.cx, f[1], d.cz)) continue;
      for (const l of lamps) {
        const dd = dist2([d.cx, 0, d.cz], [l.x, 0, l.z]);
        if (dd > 3.5 || l.y < f[1] + 1.5 || Math.abs(l.floor[1] - f[1]) > 1) continue;
        if (!best || dd < best.dd - 1e-6) best = { d, l, dd, f };
      }
    }
    if (!best) return null;
    const { d, l, f } = best;
    const n = L.doorNormal(d, f[1]);
    if (!n) return null;
    const side0 = Math.sign((l.x - d.cx) * n[0] + (l.z - d.cz) * n[2]) || 1;
    for (const side of [side0, -side0]) {
      for (const k of [3.0, 2.4, 3.6]) {
        const c = L.standAt([d.cx + n[0] * side * k, f[1], d.cz + n[2] * side * k], 0.4);
        if (!c) continue;
        const eye = [c[0], c[1] + 1.5, c[2]];
        if (!L.clear(eye, [d.cx + n[0] * side * 0.3, f[1] + 1, d.cz + n[2] * side * 0.3])) continue;
        return { door: d.index, at: P([d.cx, f[1], d.cz]), lamp: l.id, lampDist: r3(best.dd), cam: P(eye), target: P([d.cx, f[1] + 0.7, d.cz]), lampSide: side === side0 };
      }
    }
    return null;
  };
  /** Shot 7a: a camera with a wall 1-3.2 m ahead and a guard standing 0.8 m+ behind it. */
  L.torchWall = (cells, starts) => {
    for (const P0 of starts) {
      const pe = [P0[0], P0[1] + 1.6, P0[2]];
      for (const c of cells) {
        if (Math.abs(c[1] - P0[1]) > 0.3) continue;
        const dd = dist2(c, P0);
        if (dd < 2.5 || dd > 5.5) continue;
        const ge = [c[0], c[1] + 1.6, c[2]];
        const h = L.cast(pe, ge);
        if (!h || h.d < 1.0 || h.d > 3.2 || dd - h.d < 0.8 || dist2(h.p, c) < 0.6 || !L.cast(ge, pe)) continue;
        return { cam: P(pe), target: P([h.p[0], P0[1] + 1.2, h.p[2]]), guard: P(c), yaw: r3(yawTo(c, P0)), wallAt: P(h.p) };
      }
    }
    return null;
  };
  /** Shot 7b: a door in the unit, the guard 1.5 m on one side facing it, the camera 3 m on the other. */
  L.torchDoor = (u) => {
    for (const d of G().world.doors.list) {
      const f = L.doorFloor(d);
      if (!f || !L.inUnit(u, d.cx, f[1], d.cz)) continue;
      const n = L.doorNormal(d, f[1]);
      if (!n) continue;
      const g1 = L.standAt([d.cx + n[0] * 1.5, f[1], d.cz + n[2] * 1.5], 0.4);
      const c1 = L.standAt([d.cx - n[0] * 3.0, f[1], d.cz - n[2] * 3.0], 0.4);
      if (!g1 || !c1) continue;
      const eye = [c1[0], c1[1] + 1.6, c1[2]];
      if (!L.clear(eye, [d.cx - n[0] * 0.3, f[1] + 1.2, d.cz - n[2] * 0.3])) continue;
      return { door: d.index, cam: P(eye), target: P([d.cx, f[1] + 1.1, d.cz]), guard: P(g1), yaw: r3(yawTo(g1, [d.cx, 0, d.cz])) };
    }
    return null;
  };
  /** Shot 7c: a guard out of sight (no line to his head or feet) whose beam lands where the camera sees it. */
  L.torchCorner = (cells, starts) => {
    for (const P0 of starts) {
      const pe = [P0[0], P0[1] + 1.6, P0[2]];
      for (const c of cells) {
        if (Math.abs(c[1] - P0[1]) > 0.3) continue;
        const dd = dist2(c, P0);
        if (dd < 3 || dd > 8) continue;
        const ge = [c[0], c[1] + 1.55, c[2]];
        if (L.clear(pe, ge) || L.clear(pe, [c[0], c[1] + 0.3, c[2]])) continue;
        for (let k = 0; k < 16; k++) {
          const yaw = (k / 16) * Math.PI * 2;
          const dir = yawDir(yaw, -0.16);
          const h = L.cast(ge, add(ge, dir, 10));
          if (!h || h.d < 2.2) continue;
          const t = add(h.p, dir, -0.15);
          if (dist(pe, t) < 2 || !L.clear(pe, t)) continue;
          return { cam: P(pe), target: P(h.p), guard: P(c), yaw: r3(yaw), beamAt: P(h.p) };
        }
      }
    }
    return null;
  };
  /** Shot 7d: four guards 4-9.5 m in front of a spot, each turned 0.9 rad off the camera so the beams cross the view. */
  L.torchFour = (spots) => {
    for (const P0 of spots) {
      const pe = [P0[0], P0[1] + 1.6, P0[2]];
      for (let k = 0; k < 8; k++) {
        const vy = (k / 8) * Math.PI * 2;
        const gs = [];
        for (const [dd, ang] of [[4, -22], [5.5, 18], [7, -8], [8.5, 26], [6, 0], [9.5, -30], [5, 30]]) {
          if (gs.length === 4) break;
          const g = L.standAt(add(P0, yawDir(vy + ang * D2R), dd), 0.3);
          if (!g || !L.clear(pe, [g[0], g[1] + 1.2, g[2]]) || gs.some((q) => dist2(q, g) < 1.6)) continue;
          gs.push(g);
        }
        if (gs.length === 4) return { cam: P(pe), target: P(add(pe, yawDir(vy, -0.2), 10)), viewYaw: r3(vy), guards: gs.map((g, i) => ({ p: P(g), yaw: r3(vy + Math.PI + (i % 2 ? 1 : -1) * 0.9) })) };
      }
    }
    return null;
  };
  /** Shot 8: a destructible ceiling lamp (one with a wall switch and a group of several first), the player in its pool. */
  L.shootPlan = (lamps) => {
    const st = G().stealth;
    const sws = st?.switches ?? [];
    const reg = G().world.level.lights;
    const groupSize = (gr) => reg.lights.filter((l) => l.group === gr && (l.kind === 'lamp' || l.kind === 'spot')).length;
    const cands = lamps.filter((l) => l.destructible && l.base !== 'wall').map((l) => ({ l, sw: l.group >= 0 && sws.some((s) => s.group === l.group) ? 1 : 0, n: l.group >= 0 ? groupSize(l.group) : 0 }));
    cands.sort((a, b) => b.sw - a.sw || Math.min(b.n, 4) - Math.min(a.n, 4) || a.l.id - b.l.id);
    for (const { l, sw, n } of cands) {
      const F = l.floor;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const d = [Math.sin(a), 0, Math.cos(a)];
        const s = L.standAt(add(F, d, 0.8), 0.3);
        const c = L.standAt(add(F, d, 4.2), 0.3);
        if (!s || !c) continue;
        const eye = [c[0], c[1] + 1.6, c[2]];
        const lp = [l.x, l.y + l.oy, l.z];
        if (!L.clear(eye, add(lp, norm([eye[0] - lp[0], eye[1] - lp[1], eye[2] - lp[2]]), 0.3))) continue;
        return { lamp: l.id, lampPos: P([l.x, l.y, l.z]), group: l.group, groupLamps: n, hasSwitch: !!sw, stand: P(s), cam: P(eye), target: P([F[0], (F[1] + l.y) / 2, F[2]]), from: P([s[0], s[1] + 1.5, s[2]]) };
      }
    }
    return null;
  };
  /** The yaw (0 / 90 / 180 / 270) with the longest mean free view from an eye. */
  L.openYaw = (eye) => {
    let best = 0;
    let bd = -1;
    for (const y of [0, 90, 180, 270]) {
      let s = 0;
      for (const dy of [-20, 0, 20]) {
        const d = yawDir((y + dy) * D2R, -0.1);
        const h = L.cast(eye, add(eye, d, 20));
        s += h ? h.d : 20;
      }
      if (s > bd + 1e-6) { bd = s; best = y; }
    }
    return best * D2R;
  };
  /** Shots 9 and 10: the darkest spot (the audit's view, else the darkest walkable point of its room / the unit), and a
   *  warm guard 3-6 m in front of it for the thermal frame. */
  L.darkSpot = (u, pick) => {
    const f = G().world.lightField;
    let spot = null;
    if (pick?.view) {
      const v = pick.view;
      const s = L.standAt([v.x, v.y, v.z], 0.8) ?? L.floorAt(v.x, v.z, v.y, 6);
      if (s) spot = { p: s, yaw: v.yaw * D2R, source: 'audit view' };
    }
    if (!spot) {
      let cells = L.cells(u, 1.0);
      if (pick?.room) {
        const rr = L.unitRooms({ all: true }).filter((r) => r.id === pick.room);
        const inr = cells.filter((c) => rr.some((r) => L.inRoom(r, c[0], c[2], c[1])));
        if (inr.length) cells = inr;
      }
      let best = null;
      for (const c of cells) {
        const lv = f.levelAt(c[0], c[1] + 1, c[2]);
        if (!best || lv < best.lv - 1e-6) best = { c, lv };
      }
      if (!best) return null;
      spot = { p: best.c, yaw: L.openYaw([best.c[0], best.c[1] + 1.6, best.c[2]]), source: pick?.room ? `darkest point of room ${pick.room}` : 'darkest point of the unit' };
    }
    const p = spot.p;
    const eye = [p[0], p[1] + 1.6, p[2]];
    let guard = null;
    for (const k of [4, 3, 5, 6]) {
      const g = L.standAt(add(p, yawDir(spot.yaw), k), 0.3);
      if (g && L.clear(eye, [g[0], g[1] + 1.2, g[2]])) { guard = { p: P(g), yaw: r3(yawTo(g, p)) }; break; }
    }
    return { p: P(p), yaw: r3(spot.yaw), source: spot.source, room: pick?.room ?? null, level: r3(f.levelAt(p[0], p[1] + 1, p[2])), cam: P(eye), target: P(add(eye, yawDir(spot.yaw, -0.12), 10)), guard };
  };
  /** Shot 10: where player A stands, `R` m (20 first) in front of B's spot with a clear line to B's head. */
  L.find20 = (D, yaw) => {
    const he = [D[0], D[1] + 1.6, D[2]];
    for (const R of [20, 19, 21, 18, 22, 16, 14, 12, 10, 8]) {
      for (let k = 0; k < 24; k++) {
        const a = yaw + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 12);
        const p = L.floorAt(D[0] + Math.sin(a) * R, D[2] + Math.cos(a) * R, D[1], 3);
        if (!p || Math.abs(dist2(p, D) - R) > 1.2 || Math.abs(p[1] - D[1]) > 1.5) continue;
        const e = [p[0], p[1] + 1.6, p[2]];
        if (!L.clear(e, he)) continue;
        return { p: P(p), dist: r3(dist(e, he)), yaw: r3(yawTo(p, D)), bYaw: r3(yawTo(D, p)) };
      }
    }
    return null;
  };
  /** Everything a unit's shots need, from the map data (deterministic: the same build gives the same plan). */
  L.plan = (u, pick) => {
    const t0 = performance.now();
    const out = { rooms: L.unitRooms(u).map((r) => r.id), lamps: 0, errors: [] };
    const tryIt = (k, fn) => {
      try {
        return fn();
      } catch (e) {
        out.errors.push(`${k}: ${String(e?.message ?? e)}`);
        return null;
      }
    };
    const lamps = tryIt('lamps', () => L.lamps(u)) ?? [];
    out.lamps = lamps.length;
    out.lampIds = lamps.map((l) => l.id);
    const spin = tryIt('spin', () => L.spinSpots(u)) ?? { spots: [] };
    out.spin = spin;
    const cells = tryIt('cells', () => L.cells(u, 1.0)) ?? [];
    out.cells = cells.length;
    const starts = [...spin.spots.map((s) => s.p), ...cells.filter((_, i) => i % 37 === 0).slice(0, 30)];
    out.wall = tryIt('wall', () => L.wallLamp(lamps));
    out.char = tryIt('char', () => L.charLamp(lamps));
    out.crate = tryIt('crate', () => L.crate(u, lamps));
    out.door = tryIt('door', () => L.doorLamp(u, lamps));
    out.torch = {
      wall: tryIt('torch wall', () => L.torchWall(cells, starts)),
      door: tryIt('torch door', () => L.torchDoor(u)),
      corner: tryIt('torch corner', () => L.torchCorner(cells, starts)),
      four: tryIt('torch four', () => L.torchFour(spin.spots.map((s) => s.p))),
    };
    out.shoot = tryIt('shoot', () => L.shootPlan(lamps));
    out.dark = tryIt('dark', () => L.darkSpot(u, pick));
    out.ms = Math.round(performance.now() - t0);
    return out;
  };
  // ---- actions ----
  L.applyHide = () => { try { G().player.rig.setEnabled(!L.hide); } catch { /* no rig */ } };
  L.free = () => { const g = G(); g.photoFreeze(false); document.body.classList.remove('photo-mode'); };
  L.freeze = (cam, tgt) => {
    const g = G();
    g.photoFreeze(true);
    document.body.classList.add('photo-mode');
    L.applyHide();
    const c = g.photoCamera();
    c.position.set(cam[0], cam[1], cam[2]);
    // (a camera straight over its target: nudge it, a vertical view has no up)
    if (Math.hypot(cam[0] - tgt[0], cam[2] - tgt[2]) < 0.02) c.position.x += 0.03;
    c.setTarget(v3(tgt));
    return true;
  };
  L.tp = (p, yaw = 0) => {
    const g = G();
    g.team?.end?.(true);
    g.player.controller.teleport(v3(p), yaw);
    try { g.player.cam.yaw = yaw; } catch { /* no orbit cam */ }
    return true;
  };
  L.prep = () => {
    const g = G();
    try { g.target.damageMul = 0; } catch { /* none */ }
    const em = g.enemyMgr;
    if (em) {
      em.stealth = true;
      for (const e of [...em.enemies]) em.despawn(e);
      em.maxAlive = 0;
    }
    // no alarm stage may change the lights mid-shot: the cameras stop thinking (the map's guards are gone already)
    if (g.security && !g.security.__lr8) {
      g.security.__lr8 = true;
      g.security.fixedUpdate = () => {};
    }
    // (warehouse / proving boot in the parked Hunter `clear` / Mission modes for their nav grid: the mode stops thinking,
    // so no squad refill, alarm wave, reinforcement or "operation complete" changes the map mid-run)
    if (g.mode && (g.mode.id === 'clear' || g.mode.id === 'mission') && !g.mode.__lr8) {
      g.mode.__lr8 = true;
      g.mode.fixedUpdate = () => {};
    }
    L.applyHide();
    return L.settings();
  };
  L.settings = () => {
    const g = G();
    const s = A().settings.get().video;
    return { preset: s.preset, auto: s.auto, device: s.device, renderScale: s.renderScale, upscaler: s.upscaler, governor: A().quality.governor.level, override: A().quality.override ?? null, bakedLamps: !!g.world.lamps, charShadows: !!g.world.charShadows?.on, torchSlots: g.enemyMgr?.torches?.length ?? 0, mode: g.mode?.id ?? null, ambient: g.world.map.theme.lightLevel ?? null, gpu: A().gpu?.renderer ?? null, canvas: [A().engine.getRenderWidth(), A().engine.getRenderHeight()] };
  };
  L.spawn = (p, yaw, torch) => {
    const em = G().enemyMgr;
    if (!em) return false;
    em.maxAlive = em.alive + 1;
    const e = em.spawn('grunt', v3(p), false, yaw);
    em.maxAlive = em.alive;
    if (!e) return false;
    e.passive = true;
    e.torchOverride = torch;
    return true;
  };
  L.torch = (on) => { for (const e of G().enemyMgr?.enemies ?? []) if (e.alive) e.torchOverride = on; };
  L.guards = () => { const em = G().enemyMgr; return { alive: em?.alive ?? 0, torchesOn: em?.torchesOn ?? 0, slots: em?.torches?.length ?? 0 }; };
  L.clearGuards = () => {
    const em = G().enemyMgr;
    if (!em) return;
    for (const e of [...em.enemies]) em.despawn(e);
    em.maxAlive = 0;
  };
  L.door = (i, open) => {
    const ds = G().world.doors;
    const d = ds.list.find((x) => x.index === i);
    if (!d) return null;
    ds.setOpen(d, open);
    return d.open;
  };
  L.doorOpen = (i) => G().world.doors.list.find((x) => x.index === i)?.open ?? null;
  L.vision = (m) => { G().vision.set(m); return G().vision.mode; };
  L.meter = () => {
    const g = G();
    const q = g.player.position;
    return { meter: g.lightLevel, field: g.world.lightField.bodyLevel(q.x, q.y, q.z, g.player.rig?.height ?? 1.68, g.lightOccluder, 0, 0), at: P([q.x, q.y, q.z]), t: g.time };
  };
  L.shoot = (id, from) => {
    const g = G();
    const reg = g.world.level.lights;
    const l = reg.lights[id];
    const lp = [l.x, l.y + (l.fixture?.oy ?? 0), l.z];
    const dir = norm([lp[0] - from[0], lp[1] - from[1], lp[2] - from[2]]);
    const far = add(from, dir, 80);
    const h = L.cast(add(from, dir, 0.2), far);
    const to = h ? h.p : far;
    let how = 'stealth.shotRay';
    if (g.stealth) {
      g.stealth.shotRay(v3(from), v3(to));
      if (!l.destroyed) {
        g.stealth.shootLight(id);
        how = l.destroyed ? 'stealth.shootLight (the ray missed the fitting box)' : 'failed';
      }
    } else {
      reg.destroy(id);
      how = l.destroyed ? 'LightRegistry.destroy (no stealth systems in this mode)' : 'failed';
    }
    return { how, destroyed: !!l.destroyed };
  };
  L.groupOff = (group) => {
    const g = G();
    if (group < 0) return 'no circuit group';
    const sw = (g.stealth?.switches ?? []).find((s) => s.group === group);
    if (sw && sw.on) { sw.it.onUse(); return 'wall switch (the player toggle)'; }
    if (sw) return 'wall switch already off';
    g.world.level.lights.setGroup(group, false);
    return 'LightRegistry.setGroup (no wall switch on this circuit)';
  };
  L.restore = (id, group) => {
    const g = G();
    const reg = g.world.level.lights;
    const sw = group >= 0 ? (g.stealth?.switches ?? []).find((s) => s.group === group) : null;
    if (sw && !sw.on) sw.it.onUse();
    else if (group >= 0) reg.setGroup(group, true);
    reg.restore(id);
    g.stealth?.syncSwitches?.();
    return !reg.lights[id].destroyed && reg.lights[id].on;
  };
  L.project = (p) => {
    const g = G();
    const q = VC().TransformCoordinates(v3(p), g.scene.getTransformMatrix());
    return [q.x, q.y, q.z];
  };
  L.remoteHead = () => {
    const r = G().net?.remotes?.values().next().value;
    const rig = r?.avatar?.rig;
    const n = rig?.headNode;
    if (!n) return null;
    n.computeWorldMatrix(true);
    const p = n.getAbsolutePosition();
    const root = rig.root?.position;
    return { head: P([p.x, p.y, p.z]), root: root ? P([root.x, root.y, root.z]) : null };
  };
  L.csStats = () => { try { return G().world.charShadows?.stats?.() ?? null; } catch { return null; } };
  /** The probe's seeded points: 5 walkable cells (inside the map's rooms when it has them). */
  L.probePoints = (seed, n) => {
    let s = seed >>> 0;
    const rnd = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const rooms = G().world.layout?.rooms ?? [];
    const all = L.cells({ all: true }, 1.0);
    const inside = rooms.length ? all.filter((c) => rooms.some((r) => L.inRoom(r, c[0], c[2], c[1]))) : all;
    const pool = inside.length >= n ? inside : all;
    const out = [];
    const used = new Set();
    while (out.length < n && used.size < pool.length) {
      const i = Math.floor(rnd() * pool.length);
      if (used.has(i)) continue;
      used.add(i);
      out.push(P(pool[i]));
    }
    return out;
  };
  /** The grey card (e2e-darkness): at feet + 1 m, facing its strongest light; the camera 0.8 m in front. */
  L.card = (p) => {
    const w = G().world;
    const f = w.lightField;
    const x = p[0];
    const y = p[1] + 1.0;
    const z = p[2];
    const B = w.lightBake?.lamps;
    const Lt = B ? B.baked.lights : null;
    const n = B ? B.baked.ids.length : 0;
    let dir = null;
    let top = 0.02;
    for (let i = 0; i < n; i++) {
      const c = f.lampAt(i, x, y, z);
      if (c <= top) continue;
      const lx = Lt[i * 10] - x;
      const ly = Lt[i * 10 + 1] - y;
      const lz = Lt[i * 10 + 2] - z;
      const d = Math.hypot(lx, ly, lz);
      top = c;
      dir = [lx / d, ly / d, lz / d];
    }
    const sun = w.map.theme.sunDir;
    const sl = Math.hypot(sun[0], sun[1], sun[2]);
    const moon = (w.lightBake?.moonLight ?? 0) * f.moonAt(x, y, z);
    let light = top > 0.02 ? 'lamp' : 'fill';
    if (moon > top) { dir = [-sun[0] / sl, -sun[1] / sl, -sun[2] / sl]; light = 'moon'; }
    if (!dir) dir = [0, 1, 0];
    let cam = [x + dir[0] * 0.8, y + dir[1] * 0.8, z + dir[2] * 0.8];
    if (!L.clear([x, y, z], cam)) { dir = [0, 1, 0]; cam = [x, y + 0.8, z]; }
    window.__lr8card?.dispose();
    window.__lr8card = w.addLightProbe(x, y, z, dir[0], dir[1], dir[2]);
    return { level: r3(f.levelAt(x, y, z)), light, cam: P(cam), target: P([x, y, z]), dir: P(dir) };
  };
  L.cardOff = () => { window.__lr8card?.dispose(); window.__lr8card = null; };
  window.__lr8 = L;
  return true;
}

/** (from scripts/guard-cap.mjs `pageSpawn`) Remove the map's guards, raise the cap to n, spawn n passive grunts spread
 *  over a wedge in front of the camera (5-24 m, nav line of sight first), each on a short patrol when the nav allows. */
function pageSpawn([n, kind]) {
  const app = window.__app;
  const g = app.current;
  const em = g.enemyMgr;
  if (!em) throw new Error('no enemy manager on this map');
  g.target.damageMul = 0;
  em.stealth = true;
  for (const e of [...em.enemies]) em.despawn(e);
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
    const cx = cc[0];
    const cz = cc[1];
    if (Math.abs(nav.height[c] - p.y) > 1.5) return false;
    const d = Math.hypot(cx - p.x, cz - p.z);
    if (d < 4.5 || !far(cx, cz)) return false;
    const sight = nav.lineClear(me, [cx, cz], p.y, nav.height[c]);
    if (needSight && !sight) return false;
    used.add(c);
    picks.push({ x: cx, y: nav.height[c], z: cz, sight, d });
    return true;
  };
  for (const [wide, sight] of [[1, true], [1, false], [3, false]]) {
    for (let r = 5; r <= 24 && picks.length < n; r += 1.5) {
      const steps = Math.max(4, Math.round(r * wide));
      for (let k = 0; k <= steps && picks.length < n; k++) {
        const kk = k % 2 === 0 ? k / 2 : steps - (k - 1) / 2;
        const a = yaw + (kk / steps - 0.5) * (wide === 1 ? (2 * Math.PI) / 3 : 2 * Math.PI);
        tryAt(p.x + Math.sin(a) * r, p.z + Math.cos(a) * r, sight);
      }
    }
    if (picks.length >= n) break;
  }
  let got = 0;
  for (let i = 0; i < picks.length && got < n; i++) {
    const s = picks[i];
    const face = Math.atan2(p.x - s.x, p.z - s.z) + ((i % 3) - 1) * 0.6;
    const e = em.spawn(kind, new V(s.x, s.y, s.z), false, face);
    if (!e) continue;
    got++;
    e.passive = true;
    const q = [s.x + Math.cos(face) * 3, s.z - Math.sin(face) * 3];
    if (nav.lineClear([s.x, s.z], q, s.y, s.y)) e.setPatrol({ points: [[s.x, s.z], q], wait: 1.2 });
  }
  return { spawned: got, alive: em.alive, inSight: picks.slice(0, got).filter((s) => s.sight).length };
}

/** (after scripts/guard-cap.mjs `pageRender`) Real frames for `secs`: frame interval, frame CPU, GPU ms (timer query). */
async function pagePerf(secs) {
  const app = window.__app;
  const g = app.current;
  const scene = g.scene;
  const engine = app.engine;
  const loop = app.loop;
  const frames = [];
  const gpu = [];
  const gl = engine._gl;
  const ext = gl && gl.getExtension && gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const q = ext ? gl.createQuery() : null;
  let busy = false;
  const poll = () => {
    if (!ext || !q || !busy) return;
    if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) return;
    const dj = gl.getParameter(ext.GPU_DISJOINT_EXT);
    const ns = gl.getQueryParameter(q, gl.QUERY_RESULT);
    if (!dj) gpu.push(ns / 1e6);
    busy = false;
  };
  const orig = scene.render;
  scene.render = function (a, b) {
    poll();
    const s = !!ext && !busy;
    if (s) gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
    try {
      return orig.call(this, a, b);
    } finally {
      if (s) { gl.endQuery(ext.TIME_ELAPSED_EXT); busy = true; }
    }
  };
  const oe = loop.onFrameEnd;
  loop.onFrameEnd = (interval, cpu, raf) => {
    oe?.(interval, cpu, raf);
    frames.push([interval, cpu]);
  };
  const t0 = performance.now();
  try {
    await new Promise((res) => {
      const tick = () => ((performance.now() - t0 >= secs * 1000 && frames.length >= 3) || performance.now() - t0 >= secs * 1000 + 30000 ? res() : setTimeout(tick, 50));
      tick();
    });
    for (let i = 0; i < 10 && busy; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      poll();
    }
  } finally {
    scene.render = orig;
    loop.onFrameEnd = oe;
    if (q) gl.deleteQuery(q);
  }
  const pc = (a, p) => {
    const s = a.filter(Number.isFinite).sort((x, y) => x - y);
    return s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(3) : null;
  };
  const iv = frames.map((f) => f[0]);
  const cpu = frames.map((f) => f[1]);
  return { frames: frames.length, frameMs: { p50: pc(iv, 0.5), p95: pc(iv, 0.95), p99: pc(iv, 0.99) }, fps: pc(iv, 0.5) ? +(1000 / pc(iv, 0.5)).toFixed(1) : null, cpuMs: { p50: pc(cpu, 0.5), p95: pc(cpu, 0.95) }, gpuMs: ext ? { p50: pc(gpu, 0.5), p95: pc(gpu, 0.95), n: gpu.length } : null, alive: g.enemyMgr?.alive ?? 0, governor: app.quality.governor.level, render: [engine.getRenderWidth(), engine.getRenderHeight()] };
}

/** The bake's numbers on a page: lightInfo + the R8 atlas. */
function pageBake() {
  const w = window.__app.current.world;
  const i = w.lightInfo();
  const d = w.lamps?.atlasDims ?? null;
  return { ms: Math.round(i.ms), lights: i.lights, visMB: +(i.lampBytes / 1e6).toFixed(2), atlasDims: d, atlasMB: d ? +((d[0] * d[1] * d[2]) / 1e6).toFixed(2) : null, moonCells: i.moonCells, hash: i.hash, bakedLampsDrawn: !!w.lamps };
}

// ---------- node-side helpers ----------
const L8 = (page, fn, arg) => page.evaluate(([src, a]) => (0, eval)(`(${src})`)(window.__lr8, a), [fn.toString(), arg]);

async function waitReady(page, ms = 60000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if (await page.evaluate(() => window.__app.current.scene.isReady()).catch(() => true)) return true;
    await page.waitForTimeout(250);
  }
  return false;
}
async function simWait(page, sec, cap = 20000) {
  const now = () => page.evaluate(() => window.__app.current.time);
  const t0 = await now();
  const w0 = Date.now();
  while (Date.now() - w0 < cap) {
    if ((await now()) - t0 >= sec) return true;
    await page.waitForTimeout(50);
  }
  return false;
}
/** Freeze the view at `cam` -> `tgt` and take the screenshot (the HUD hidden by photo mode). */
async function snap(page, cam, tgt, file, { hide = true, settle = 1100 } = {}) {
  await L8(page, (L, [c, t, h]) => { L.hide = h; return L.freeze(c, t); }, [cam, tgt, hide]);
  await waitReady(page);
  await page.waitForTimeout(settle);
  return page.screenshot({ path: file, timeout: 120_000 });
}
const free = (page) => L8(page, (L) => L.free());

/** Display luma statistics of a PNG (optionally a pixel crop [x, y, w, h]), decoded in the tool page. */
function lumaStats(tool, buf, crop = null) {
  return tool.evaluate(async ([b64, crop, LIT, DARK]) => {
    const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const [x0, y0, w, h] = crop ?? [0, 0, img.width, img.height];
    const c = new OffscreenCanvas(Math.max(1, w), Math.max(1, h));
    const x = c.getContext('2d');
    x.drawImage(img, -x0, -y0);
    const px = x.getImageData(0, 0, c.width, c.height).data;
    const n = c.width * c.height;
    const ls = new Float32Array(n);
    let s = 0;
    let lit = 0;
    let dark = 0;
    let black = 0;
    for (let i = 0; i < n; i++) {
      const l = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
      ls[i] = l;
      s += l;
      if (l >= LIT) lit++;
      if (l <= DARK) dark++;
      if (l <= 0.01) black++;
    }
    ls.sort();
    const q = (p) => ls[Math.min(n - 1, Math.floor(p * n))];
    // rows as 6 horizontal bands (top to bottom): the vertical gradient
    const bands = [];
    for (let b = 0; b < 6; b++) {
      let t = 0;
      let k = 0;
      for (let yy = Math.floor((b * c.height) / 6); yy < Math.floor(((b + 1) * c.height) / 6); yy++) {
        for (let xx = 0; xx < c.width; xx += 2) {
          const i = (yy * c.width + xx) * 4;
          t += (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
          k++;
        }
      }
      bands.push(k ? +(t / k).toFixed(3) : 0);
    }
    return { mean: s / n, lit: lit / n, dark: dark / n, black: black / n, p50: q(0.5), p99: q(0.99), p995: q(0.995), max: ls[n - 1], bands, w: c.width, h: c.height };
  }, [buf.toString('base64'), crop, LIT_LUMA, DARK_LUMA]);
}
/** Per-pixel luma difference of two same-size PNGs: the mean |d| and the share of pixels changed by more than 0.05. */
function lumaDiff(tool, a, b) {
  return tool.evaluate(async ([ab, bb]) => {
    const dec = async (b64) => {
      const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
      const c = new OffscreenCanvas(img.width, img.height);
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      return x.getImageData(0, 0, img.width, img.height).data;
    };
    const A = await dec(ab);
    const B = await dec(bb);
    const n = Math.min(A.length, B.length) / 4;
    let s = 0;
    let big = 0;
    for (let i = 0; i < n; i++) {
      const la = (0.2126 * A[i * 4] + 0.7152 * A[i * 4 + 1] + 0.0722 * A[i * 4 + 2]) / 255;
      const lb = (0.2126 * B[i * 4] + 0.7152 * B[i * 4 + 1] + 0.0722 * B[i * 4 + 2]) / 255;
      const d = Math.abs(la - lb);
      s += d;
      if (d > 0.05) big++;
    }
    return { meanAbs: +(s / n).toFixed(4), changed: +(big / n).toFixed(4) };
  }, [a.toString('base64'), b.toString('base64')]);
}
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
/** A labelled grid of PNG files on the tool page, saved as one PNG. */
async function sheet(tool, cells, cols, file, title = '', width = 1600) {
  const html = cells.map((c) => `<figure>${c.file && existsSync(c.file) ? `<img src="data:image/png;base64,${readFileSync(c.file).toString('base64')}">` : `<div class="miss">${esc(c.miss ?? 'not possible')}</div>`}<figcaption>${esc(c.label)}</figcaption></figure>`).join('');
  await tool.setViewportSize({ width, height: 400 });
  await tool.setContent(`<style>body{margin:0;background:#111;color:#ddd;font:14px sans-serif}h1{font-size:15px;margin:6px 8px;font-weight:600}main{display:grid;grid-template-columns:repeat(${cols},1fr);gap:6px;padding:6px}figure{margin:0}img{width:100%;display:block;image-rendering:auto}figcaption{padding:2px 4px}.miss{aspect-ratio:16/9;background:#300;display:flex;align-items:center;justify-content:center;padding:8px;text-align:center}</style>${title ? `<h1>${esc(title)}</h1>` : ''}<main>${html}</main>`);
  await tool.waitForTimeout(150);
  await tool.screenshot({ path: file, fullPage: true });
}
async function newCtx(browser, viewport = VIEW) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true });
  await ctx.addInitScript(fakePointerLock);
  ctx.setDefaultNavigationTimeout(120000);
  return ctx;
}

// ---------- the shots of one unit ----------
async function unitShots(M, unit) {
  const { page, tool, map, rep } = M;
  const tag = `${map.id}-${unit.name}`;
  const U = (rep.units[unit.name] ??= { unit: { ...unit }, shots: {} });
  const set = (nn, status, note, extra = {}) => {
    U.shots[nn] = { file: `${tag}-${nn}.png`, status, note, ...extra };
    log(`${tag} ${nn} ${status.toUpperCase()}: ${note}`);
    writeReport();
  };
  const notPossible = async (nn, why, title) => {
    await sheet(tool, [{ miss: `not possible: ${why}`, label: '' }], 1, `${OUT}/${tag}-${nn}.png`, title, 800).catch(() => {});
    set(nn, 'not-possible', `not possible: ${why}`);
  };
  // (a unit past its time cap is abandoned: its flow stops at the next shot instead of driving the page beside the next unit)
  const token = {};
  M.token = token;
  const pick = pickDark(AUDIT[map.id], unit);
  U.darkPick = pick;
  log(`${tag}: planning`);
  const plan = await withTimeout(L8(page, (L, [u, p]) => L.plan(u, p), [unit, pick]), 240_000, `${tag} plan`);
  U.plan = plan;
  M.plans[unit.name] = plan;
  log(`${tag}: plan in ${plan.ms} ms: ${plan.lamps} lamps, ${plan.cells} cells, spots ${plan.spin?.spots?.length ?? 0}${plan.errors.length ? `, errors: ${plan.errors.join('; ')}` : ''}`);
  await L8(page, (L) => { L.clearGuards(); L.vision('off'); L.hide = true; return true; });
  const guard = async (nn, fn) => {
    if (M.token !== token) throw new Error(`${tag} abandoned (time cap)`);
    try {
      await fn();
    } catch (e) {
      set(nn, 'error', String(e?.message ?? e).split('\n')[0]);
      await free(page).catch(() => {});
      await L8(page, (L) => { L.clearGuards(); L.vision('off'); L.cardOff(); return true; }).catch(() => {});
      if (page.isClosed()) throw e;
    }
  };

  // 01-03: the 4-way spin from three spots
  for (let s = 0; s < 3; s++) {
    const nn = nn2(s + 1);
    await guard(nn, async () => {
      const sp = plan.spin?.spots?.[s];
      if (!sp) return notPossible(nn, 'no standing spot with 4 framed views in the unit', `${tag}-${nn}`);
      await free(page);
      await L8(page, (L, p) => L.tp(p, 0), sp.p);
      await page.waitForTimeout(300);
      const frames = [];
      for (const [k, yd] of [['N (+z)', 0], ['E (+x)', 90], ['S (-z)', 180], ['W (-x)', 270]]) {
        const eye = [sp.p[0], sp.p[1] + 1.6, sp.p[2]];
        const y = yd * D2R;
        const tgt = [eye[0] + Math.sin(y) * 10, eye[1] - 1.8, eye[2] + Math.cos(y) * 10];
        const f = `${FR}/${tag}-${nn}-${k[0]}.png`;
        const buf = await snap(page, eye, tgt, f, { settle: 900 });
        const st = await lumaStats(tool, buf);
        frames.push({ dir: k, yaw: yd, file: f, lit: r3(st.lit), dark: r3(st.dark), black: r3(st.black), mean: r3(st.mean), pool: st.lit >= MIN_SHARE, darkOk: st.dark >= MIN_SHARE, field: sp.yaws[yd / 90] });
      }
      await sheet(tool, frames.map((fr) => ({ file: fr.file, label: `${fr.dir}: lit ${pc(fr.lit)}, dark ${pc(fr.dark)} (field ${pc(fr.field[0])} / ${pc(fr.field[1])})${fr.pool ? '' : ' - NO POOL'}${fr.darkOk ? '' : ' - NO DARK'}` })), 2, `${OUT}/${tag}-${nn}.png`, `${tag}-${nn}: 4-way spin at (${sp.p.join(', ')}), eye 1.6 m`);
      const bad = frames.filter((f) => !f.pool || !f.darkOk);
      set(nn, bad.length ? 'flag' : 'pass', bad.length ? `${bad.map((f) => `${f.dir.split(' ')[0]}${f.pool ? '' : ' no pool'}${f.darkOk ? '' : ' no dark'}`).join(', ')} (lit ${frames.map((f) => pc(f.lit)).join('/')}, dark ${frames.map((f) => pc(f.dark)).join('/')})` : `every frame holds a pool and a dark (lit ${frames.map((f) => pc(f.lit)).join('/')}, dark ${frames.map((f) => pc(f.dark)).join('/')})`, { spot: sp, frames: frames.map(({ file, ...r }) => ({ ...r, file: path.basename(file) })) });
    });
  }

  // 04: the wall behind a lamp and the ceiling over it
  await guard('04', async () => {
    const w = plan.wall;
    if (!w || !w.cam) return notPossible('04', plan.lamps ? 'no lamp with a wall face in reach and a standing spot facing it' : 'no lit fixed lamp in the unit', `${tag}-04`);
    await free(page);
    await L8(page, (L, p) => L.tp(p, 0), [w.cam[0], w.cam[1] - 1.6, w.cam[2]]);
    await page.waitForTimeout(300);
    const fw = `${FR}/${tag}-04-wall.png`;
    const fc = `${FR}/${tag}-04-ceiling.png`;
    const bw = await snap(page, w.cam, w.target, fw);
    const sw = await lumaStats(tool, bw);
    let sc = null;
    if (w.ccam) {
      const bc = await snap(page, w.ccam, w.ctarget, fc);
      sc = await lumaStats(tool, bc, [0, 0, VIEW.width, Math.round(VIEW.height * 0.45)]);
    }
    await sheet(tool, [
      { file: fw, label: `wall ${w.wallDist} m behind lamp ${w.lampId ?? w.lamp} (${w.model ?? 'box'}): bands top->bottom ${sw.bands.join(' / ')}` },
      { file: w.ccam ? fc : null, miss: 'no standing spot under the lamp', label: w.ceilY === null ? 'no ceiling over the lamp (open)' : `ceiling y ${w.ceilY}: top 45% mean luma ${sc ? r3(sc.mean) : '-'}` },
    ], 2, `${OUT}/${tag}-04.png`, `${tag}-04: wall behind lamp ${w.lamp} at (${w.lampPos.join(', ')}) and the ceiling over it`);
    const ceilOk = !!sc && sc.mean > 0.03;
    const what = w.ceilY === null ? 'open above the lamp (no ceiling)' : !sc ? 'no standing spot under the lamp for the ceiling view' : ceilOk ? 'ceiling not black' : 'ceiling reads black';
    set('04', w.ceilY === null || !sc ? 'review' : ceilOk ? 'pass' : 'flag', `${what} (top mean ${sc ? r3(sc.mean) : '-'}); wall ${w.wallDist} m, gradient bands ${sw.bands.join('/')}`, { plan: w, wallBands: sw.bands, ceilMean: sc ? r3(sc.mean) : null });
  });

  // 05 (Auto) and 06
  await guard('05', () => shot05(M, unit, ''));
  await guard('06', async () => {
    const c = plan.crate;
    const d = plan.door;
    if (!c && !d) return notPossible('06', 'no crate / rack box and no door under a lit lamp in the unit', `${tag}-06`);
    await free(page);
    const fc = `${FR}/${tag}-06-crate.png`;
    const fd = `${FR}/${tag}-06-door.png`;
    if (c) {
      await L8(page, (L, p) => L.tp(p, 0), [c.cam[0], c.cam[1] - 1.3, c.cam[2]]);
      await page.waitForTimeout(300);
      await snap(page, c.cam, c.target, fc);
      await free(page);
    }
    let open = null;
    if (d) {
      await L8(page, (L, [i]) => L.door(i, true), [d.door]);
      const t = Date.now();
      while (Date.now() - t < 6000 && ((open = await L8(page, (L, i) => L.doorOpen(i), d.door)) ?? 1) < 0.95) await page.waitForTimeout(150);
      await L8(page, (L, p) => L.tp(p, 0), [d.cam[0], d.cam[1] - 1.5, d.cam[2]]);
      await page.waitForTimeout(400);
      await snap(page, d.cam, d.target, fd);
      await free(page);
      await L8(page, (L, i) => L.door(i, false), d.door);
    }
    await sheet(tool, [
      { file: c ? fc : null, miss: 'no crate / rack under a lit lamp', label: c ? `${c.what} (${c.size.join(' x ')} m) ${c.lampDist} m from lamp ${c.lamp}` : '' },
      { file: d ? fd : null, miss: 'no door under a lit lamp', label: d ? `door ${d.door} open ${r3(open)} , lamp ${d.lamp} ${d.lampDist} m off${d.lampSide ? '' : ' (camera on the far side)'}` : '' },
    ], 2, `${OUT}/${tag}-06.png`, `${tag}-06: contact shadow (crate / rack) and an open door leaf under a lamp`);
    set('06', 'review', `${c ? `${c.what} at ${c.lampDist} m from lamp ${c.lamp}` : 'no crate'}; ${d ? `door ${d.door} open ${r3(open)} under lamp ${d.lamp}` : 'no door'}: sharp at contact, soft with distance is a visual check`, { crate: c, door: d });
  });

  // 07 (Auto)
  await guard('07', () => shot07(M, unit, ''));

  // 08: shoot a lamp, then its circuit off
  await guard('08', async () => {
    const s = plan.shoot;
    if (!s) return notPossible('08', plan.lamps ? 'no destructible ceiling lamp with a standing spot in its pool' : 'no lit fixed lamp in the unit', `${tag}-08`);
    await free(page);
    await L8(page, (L, [p, y]) => L.tp(p, y), [s.stand, 0]);
    await simWait(page, 0.45);
    const m0 = await L8(page, (L) => L.meter());
    const f0 = `${FR}/${tag}-08-a-lit.png`;
    const f1 = `${FR}/${tag}-08-b-shot.png`;
    const f2 = `${FR}/${tag}-08-c-off.png`;
    const b0 = await snap(page, s.cam, s.target, f0);
    const shotRes = await L8(page, (L, [id, from]) => L.shoot(id, from), [s.lamp, s.from]);
    await simWait(page, 0.45);
    await page.waitForTimeout(500);
    const m1 = await L8(page, (L) => L.meter());
    const b1 = await page.screenshot({ path: f1, timeout: 120_000 });
    const how = await L8(page, (L, g) => L.groupOff(g), s.group);
    await simWait(page, 0.45);
    await page.waitForTimeout(500);
    const m2 = await L8(page, (L) => L.meter());
    const b2 = await page.screenshot({ path: f2, timeout: 120_000 });
    const back = await L8(page, (L, [id, g]) => L.restore(id, g), [s.lamp, s.group]);
    await free(page);
    const [s0, s1, s2] = [await lumaStats(tool, b0), await lumaStats(tool, b1), await lumaStats(tool, b2)];
    await sheet(tool, [
      { file: f0, label: `lit: meter ${r3(m0.meter)} (field ${r3(m0.field)}), frame mean ${r3(s0.mean)}` },
      { file: f1, label: `lamp ${s.lamp} shot (${shotRes.how}): meter ${r3(m1.meter)}, frame mean ${r3(s1.mean)}` },
      { file: f2, label: `circuit ${s.group} off (${how}): meter ${r3(m2.meter)}, frame mean ${r3(s2.mean)}` },
    ], 3, `${OUT}/${tag}-08.png`, `${tag}-08: shoot lamp ${s.lamp} at (${s.lampPos.join(', ')}), then switch circuit ${s.group} off (${s.groupLamps} lamps); the player stands in its pool`);
    const drop1 = m0.meter - m1.meter;
    const ok = shotRes.destroyed && drop1 > 0.02 && m2.meter <= m1.meter + 0.005 && s1.mean < s0.mean;
    set('08', ok ? 'pass' : 'flag', `meter ${r3(m0.meter)} -> ${r3(m1.meter)} (shot) -> ${r3(m2.meter)} (circuit off); frame mean ${r3(s0.mean)} -> ${r3(s1.mean)} -> ${r3(s2.mean)}${shotRes.destroyed ? '' : '; the lamp did not break'}${drop1 > 0.02 ? '' : '; the meter did not drop on the shot'}${back ? '' : '; lamp not restored'}`, { plan: s, meter: [r3(m0.meter), r3(m1.meter), r3(m2.meter)], field: [r3(m0.field), r3(m1.field), r3(m2.field)], frameMean: [r3(s0.mean), r3(s1.mean), r3(s2.mean)], shot: shotRes, switch: how, restored: back });
  });

  // 09: night vision and thermal in the darkest room
  await guard('09', async () => {
    const d = plan.dark;
    if (!d) return notPossible('09', 'no dark spot found', `${tag}-09`);
    await free(page);
    await L8(page, (L, [p, y]) => { L.clearGuards(); return L.tp(p, y); }, [d.p, d.yaw]);
    let warm = false;
    if (d.guard) warm = await L8(page, (L, g) => L.spawn(g.p, g.yaw, false), d.guard);
    const fn = `${FR}/${tag}-09-night.png`;
    const ft = `${FR}/${tag}-09-thermal.png`;
    await L8(page, (L) => L.vision('night'));
    await page.waitForTimeout(1000);
    const bn = await snap(page, d.cam, d.target, fn, { settle: 1400 });
    await free(page);
    await L8(page, (L) => L.vision('thermal'));
    await page.waitForTimeout(1000);
    const bt = await snap(page, d.cam, d.target, ft, { settle: 1400 });
    await free(page);
    await L8(page, (L) => { L.vision('off'); L.clearGuards(); return true; });
    const sn = await lumaStats(tool, bn);
    const st = await lumaStats(tool, bt);
    await sheet(tool, [
      { file: fn, label: `night vision: mean ${r3(sn.mean)}, p99.5 ${r3(sn.p995)}, black ${pc(sn.black)}` },
      { file: ft, label: `thermal: mean ${r3(st.mean)}, p99.5 ${r3(st.p995)}${warm ? ', a guard 3-6 m ahead' : ', no guard in view'}` },
    ], 2, `${OUT}/${tag}-09.png`, `${tag}-09: darkest spot (${d.source}${d.room ? `, room ${d.room}` : ''}) at (${d.p.join(', ')}), field ${d.level}`);
    const nvOk = sn.mean >= 0.06 && sn.p995 >= 0.25;
    set('09', nvOk ? 'pass' : 'flag', `night vision ${nvOk ? 'reads' : 'too dark to read'} (mean ${r3(sn.mean)}, p99.5 ${r3(sn.p995)}); thermal: mean ${r3(st.mean)}, hottest p99.5 ${r3(st.p995)}${warm ? ' with a warm guard in view' : ', no warm body in view'}; the door ghost (LR16-6) is not built`, { plan: d, night: { mean: r3(sn.mean), p995: r3(sn.p995), black: r3(sn.black) }, thermal: { mean: r3(st.mean), p995: r3(st.p995), max: r3(st.max) }, warmGuard: warm });
  });
}

/** Shot 05: the character 1 m and 4 m from the lamp (suffix '' Auto, '-epic' the Epic pass). */
async function shot05(M, unit, sfx) {
  const { page, tool, map, rep } = M;
  const tag = `${map.id}-${unit.name}`;
  const U = rep.units[unit.name];
  const c = M.plans[unit.name]?.char;
  const key = `05${sfx}`;
  const file = `${OUT}/${tag}-05${sfx}.png`;
  if (!c) {
    await sheet(tool, [{ miss: 'not possible: no ceiling lamp with open floor 1 m and 4 m off it', label: '' }], 1, file, `${tag}-05${sfx}`, 800);
    U.shots[key] = { file: path.basename(file), status: 'not-possible', note: `not possible: ${M.plans[unit.name]?.lamps ? 'no ceiling lamp with open floor 1 m and 4 m off it' : 'no lit fixed lamp in the unit'}` };
    log(`${tag} ${key} NOT-POSSIBLE`);
    return;
  }
  const cells = [];
  const cs = [];
  for (const fr of c.frames) {
    await free(page);
    await L8(page, (L, [p, y]) => { L.hide = false; L.applyHide(); return L.tp(p, y); }, [fr.feet, fr.yaw]);
    await page.waitForTimeout(1300);
    const f = `${FR}/${tag}-05${sfx}-${fr.m}m.png`;
    await snap(page, fr.cam, fr.target, f, { hide: false, settle: 1300 });
    cs.push(await L8(page, (L) => L.csStats()));
    cells.push({ file: f, label: `${fr.m} m from lamp ${c.lamp}${fr.nearest.id !== c.lamp ? ` (nearest lamp is ${fr.nearest.id} at ${fr.nearest.d} m)` : ''}` });
  }
  await free(page);
  await L8(page, (L) => { L.hide = true; L.applyHide(); return true; });
  await sheet(tool, cells, 2, file, `${tag}-05${sfx}: the character 1 m and 4 m from lamp ${c.lamp} at (${c.lampPos.join(', ')})${sfx ? ' - Epic' : ' - Auto'}`);
  const slots = cs.map((s) => (Array.isArray(s) ? s.filter((x) => (x?.casters ?? 0) > 0).length : null));
  U.shots[key] = { file: path.basename(file), status: 'review', note: `silhouette shadow slots with casters ${slots.join(' / ')} (1 m / 4 m); shape, sharp feet, soft head is a visual check`, plan: c, charShadowSlots: cs };
  log(`${tag} ${key} REVIEW: slots ${slots.join('/')}`);
  writeReport();
}

/** Shot 07: guard torches behind a wall, a shut door, round a corner, then four at once. */
async function shot07(M, unit, sfx) {
  const { page, tool, map, rep } = M;
  const tag = `${map.id}-${unit.name}`;
  const U = rep.units[unit.name];
  const t = M.plans[unit.name]?.torch ?? {};
  const key = `07${sfx}`;
  const file = `${OUT}/${tag}-07${sfx}.png`;
  const slots = (await L8(page, (L) => L.guards())).slots;
  if (!slots) {
    await sheet(tool, [{ miss: 'not possible: no guard flashlight slots (the map is not dark: theme light >= 0.5)', label: '' }], 1, file, `${tag}-07${sfx}`, 800);
    U.shots[key] = { file: path.basename(file), status: 'not-possible', note: 'not possible: the map has no guard flashlight slots (not a dark map)' };
    log(`${tag} ${key} NOT-POSSIBLE`);
    return;
  }
  const cells = [];
  const parts = {};
  const flags = [];
  for (const [k, p] of [['wall', t.wall], ['door', t.door], ['corner', t.corner]]) {
    if (!p) {
      cells.push({ miss: `no ${k} layout found in the unit`, label: `${k}: not possible` });
      parts[k] = { status: 'not-possible' };
      continue;
    }
    await free(page);
    await L8(page, (L) => L.clearGuards());
    if (k === 'door') {
      await L8(page, (L, i) => L.door(i, false), p.door);
      const t0 = Date.now();
      while (Date.now() - t0 < 5000 && ((await L8(page, (L, i) => L.doorOpen(i), p.door)) ?? 0) > 0.001) await page.waitForTimeout(150);
    }
    await L8(page, (L, c) => L.tp([c[0], c[1] - 1.6, c[2]], 0), p.cam);
    const ok = await L8(page, (L, [g, y]) => L.spawn(g, y, true), [p.guard, p.yaw]);
    await page.waitForTimeout(1200);
    const on = await L8(page, (L) => L.guards());
    const fOn = `${FR}/${tag}-07${sfx}-${k}-on.png`;
    const fOff = `${FR}/${tag}-07${sfx}-${k}-off.png`;
    const bOn = await snap(page, p.cam, p.target, fOn);
    await L8(page, (L) => L.torch(false));
    await simWait(page, 0.3);
    await page.waitForTimeout(700);
    const bOff = await page.screenshot({ path: fOff, timeout: 120_000 });
    const d = await lumaDiff(tool, bOn, bOff);
    const seen = d.changed > 0.005 || d.meanAbs > 0.004;
    const want = k === 'corner';
    const st = !ok || on.torchesOn < 1 ? 'flag' : seen === want ? 'pass' : 'flag';
    const note = !ok ? 'guard not spawned' : on.torchesOn < 1 ? 'the torch did not come on' : want ? (seen ? `beam reads round the corner (${pc(d.changed)} of pixels changed)` : 'beam not seen round the corner') : seen ? `light through the ${k} (${pc(d.changed)} of pixels changed, mean ${d.meanAbs})` : `nothing through the ${k}`;
    if (st === 'flag') flags.push(`${k}: ${note}`);
    parts[k] = { status: st, note, diff: d, plan: p };
    cells.push({ file: fOn, label: `${k}: ${note}` });
  }
  // four at once
  const f4 = t.four;
  if (!f4) {
    cells.push({ miss: 'no open floor for four guards in view', label: 'four torches: not possible' });
    parts.four = { status: 'not-possible' };
  } else {
    await free(page);
    await L8(page, (L) => L.clearGuards());
    await L8(page, (L, c) => L.tp([c[0], c[1] - 1.6, c[2]], 0), f4.cam);
    let n = 0;
    for (const g of f4.guards) if (await L8(page, (L, [p, y]) => L.spawn(p, y, true), [g.p, g.yaw])) n++;
    await page.waitForTimeout(1500);
    const on = await L8(page, (L) => L.guards());
    const fF = `${FR}/${tag}-07${sfx}-four.png`;
    await snap(page, f4.cam, f4.target, fF, { settle: 1400 });
    const st = on.torchesOn >= Math.min(4, slots) ? 'pass' : 'flag';
    const note = `${on.torchesOn} of ${n} torches on (slots ${slots}); soft beam rim is a visual check`;
    if (st === 'flag') flags.push(`four: ${note}`);
    parts.four = { status: st, note, plan: f4, torchesOn: on.torchesOn };
    cells.push({ file: fF, label: `four torches: ${note}` });
  }
  await free(page);
  await L8(page, (L) => L.clearGuards());
  await sheet(tool, cells, 2, file, `${tag}-07${sfx}: guard torches${sfx ? ' - Epic' : ' - Auto'}`);
  const any = Object.values(parts).some((p) => p.status === 'pass' || p.status === 'flag');
  U.shots[key] = { file: path.basename(file), status: !any ? 'not-possible' : flags.length ? 'flag' : 'pass', note: !any ? 'not possible: no wall / door / corner / open-floor layout found' : flags.length ? flags.join('; ') : 'nothing through walls or the shut door; the beam reads round the corner; four torches on', parts };
  log(`${tag} ${key} ${U.shots[key].status.toUpperCase()}: ${U.shots[key].note}`);
  writeReport();
}

/** Shot 10 for every unit of the map: a co-op pair in one context, B in the dark spot, A 20 m away. */
async function pairPass(browser, M, units) {
  const { map, rep, tool } = M;
  const ctx = await newCtx(browser);
  try {
    log(`${map.id}: co-op pair (host A, client B over ?net=local)`);
    const { page: A, errors: eA } = await openPage(ctx, URL, `net=local&gfx=user&detect=1${map.mode === 'sector' ? '&sectorGuards=0' : ''}`);
    await A.click('.main-menu .btn:has-text("Co-op")');
    await A.click('.btn:has-text("Host a room")');
    await net.until(A, () => !!document.querySelector('.lobby-screen') && !!window.__coop, null, 15000, 'host lobby');
    const code = await A.evaluate(() => window.__coop.session.code);
    const { page: B, errors: eB } = await openPage(ctx, URL, 'net=local&gfx=min');
    await B.click('.main-menu .btn:has-text("Co-op")');
    await B.click('.btn:has-text("Join with code")');
    await B.keyboard.type(code.toLowerCase());
    await B.keyboard.press('Enter');
    await net.until(A, (k) => window.__coop.session.players.size === k, 2, 15000, 'host sees client');
    net.setSimPages([A, B]);
    await net.startMode([A, B], map.mode, map.id);
    for (const P of [A, B]) await P.evaluate(pageLib);
    await L8(A, (L) => L.prep());
    await A.bringToFront();
    await waitOperator(A, 1, 120000);
    await A.waitForTimeout(2000);
    for (const unit of units) {
      const tag = `${map.id}-${unit.name}`;
      const U = (rep.units[unit.name] ??= { unit: { ...unit }, shots: {} });
      const set = (status, note, extra = {}) => {
        U.shots['10'] = { file: `${tag}-10.png`, status, note, ...extra };
        log(`${tag} 10 ${status.toUpperCase()}: ${note}`);
        writeReport();
      };
      try {
        let d = M.plans[unit.name]?.dark;
        if (!d) d = await L8(A, (L, [u, p]) => L.darkSpot(u, p), [unit, pickDark(AUDIT[map.id], unit)]);
        if (!d) {
          await sheet(tool, [{ miss: 'not possible: no dark spot', label: '' }], 1, `${OUT}/${tag}-10.png`, `${tag}-10`, 800);
          set('not-possible', 'not possible: no dark spot found');
          continue;
        }
        const a = await L8(A, (L, [p, y]) => L.find20(p, y), [d.p, d.yaw]);
        if (!a) {
          await sheet(tool, [{ miss: 'not possible: no standing spot 8-22 m away with a clear line to B', label: '' }], 1, `${OUT}/${tag}-10.png`, `${tag}-10`, 800);
          set('not-possible', 'not possible: no standing spot 8-22 m from the dark spot with a clear line');
          continue;
        }
        await free(A);
        await net.allowTeleport(A, 8);
        await L8(B, (L, [p, y]) => { L.vision('night'); return L.tp(p, y); }, [d.p, a.bYaw]);
        await L8(A, (L, [p, y]) => L.tp(p, y), [a.p, a.yaw]);
        let near = false;
        const t0 = Date.now();
        while (Date.now() - t0 < 25000 && !near) {
          const h = await L8(A, (L) => L.remoteHead()).catch(() => null);
          near = !!h?.root && Math.hypot(h.root[0] - d.p[0], h.root[2] - d.p[2]) < 0.8;
          if (!near) await A.waitForTimeout(250);
        }
        await A.waitForTimeout(1500);
        const h = await L8(A, (L) => L.remoteHead());
        if (!h) throw new Error('no remote avatar for B on the host page');
        const eye = [a.p[0], a.p[1] + 1.6, a.p[2]];
        const full = `${FR}/${tag}-10-full.png`;
        const buf = await snap(A, eye, h.head, full, { settle: 1500 });
        const ndc = await L8(A, (L, p) => L.project(p), h.head);
        const sx = Math.round(((ndc[0] + 1) / 2) * VIEW.width);
        const sy = Math.round(((1 - ndc[1]) / 2) * VIEW.height);
        const R = 48;
        const crop = [Math.max(0, Math.min(VIEW.width - 2 * R, sx - R)), Math.max(0, Math.min(VIEW.height - 2 * R, sy - R)), 2 * R, 2 * R];
        const cropFile = `${OUT}/${tag}-10-crop.png`;
        await A.screenshot({ path: cropFile, clip: { x: crop[0], y: crop[1], width: crop[2], height: crop[3] } });
        const st = await lumaStats(tool, buf, crop);
        const onScreen = ndc[2] > 0 && ndc[2] < 1 && Math.abs(ndc[0]) < 1 && Math.abs(ndc[1]) < 1;
        const readable = onScreen && st.p995 >= 0.18 && st.p995 - st.p50 >= 0.1;
        await free(A);
        await sheet(tool, [
          { file: full, label: `A at ${a.dist} m from B (B at (${d.p.join(', ')}), field ${d.level})` },
          { file: cropFile, label: `crop ${crop[2]} px around B's head: peak ${r3(st.p995)}, median ${r3(st.p50)} -> ${readable ? 'READABLE' : 'NOT readable'}` },
        ], 2, `${OUT}/${tag}-10.png`, `${tag}-10: partner beacon at ${a.dist} m (${d.source}${d.room ? `, room ${d.room}` : ''})`);
        set(readable ? 'pass' : 'flag', `${readable ? 'yes' : 'no'}: B's goggle beacon ${readable ? 'is' : 'is not'} readable at ${a.dist} m (crop peak ${r3(st.p995)}, median ${r3(st.p50)}${onScreen ? '' : ', B off screen'}${a.dist < 19 ? `; no clear 20 m line, nearest ${a.dist} m` : ''})`, { readable, distance: a.dist, a: a.p, b: d.p, crop, ndc: ndc.map(r3), peak: r3(st.p995), median: r3(st.p50) });
      } catch (e) {
        set('error', String(e?.message ?? e).split('\n')[0]);
        await free(A).catch(() => {});
      }
    }
    const errs = [...eA, ...eB].filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
    if (errs.length) rep.coopConsoleErrors = errs.slice(0, 5).map((e) => e.slice(0, 300));
  } finally {
    net.setSimPages([]);
    await ctx.close().catch(() => {});
  }
}

/** The parity probe: 5 seeded points per map, meter vs field and the grey card's display luma vs the L5 band. */
async function probe(M) {
  const { page, tool, map, rep } = M;
  const pts = await L8(page, (L, [s, n]) => L.probePoints(s, n), [fnv(map.id), 5]);
  rep.probe = [];
  for (const [i, p] of pts.entries()) {
    try {
      await free(page);
      await L8(page, (L, q) => L.tp(q, 0), p);
      await simWait(page, 0.4);
      const m = await L8(page, (L) => L.meter());
      const c = await L8(page, (L, q) => L.card(q), p);
      const f = `${FR}/${map.id}-probe-${i + 1}.png`;
      await snap(page, c.cam, c.target, f, { settle: 1500 });
      const vp = VIEW;
      const buf = await page.screenshot({ clip: { x: vp.width / 2 - 5, y: vp.height / 2 - 5, width: 10, height: 10 } });
      const st = await lumaStats(tool, buf);
      await L8(page, (L) => L.cardOff());
      const band = lumaBand(c.level);
      const diff = Math.abs(m.meter - m.field);
      const row = { map: map.id, point: i + 1, at: m.at, meter: r3(m.meter), field: r3(m.field), diff: r3(diff), pass: diff < 0.02, cardLevel: c.level, cardLight: c.light, cardLuma: r3(st.mean), band: band.map(r3), inBand: st.mean >= band[0] && st.mean <= band[1], file: path.basename(f) };
      rep.probe.push(row);
      report.probeTable.push(row);
      log(`${map.id} probe ${i + 1} (${m.at.join(', ')}): meter ${row.meter} field ${row.field} |diff| ${row.diff} ${row.pass ? 'ok' : 'FAIL'}; card level ${c.level} luma ${row.cardLuma} band ${row.band.join('-')} ${row.inBand ? 'in' : 'OUT'}`);
    } catch (e) {
      rep.probe.push({ map: map.id, point: i + 1, at: p, error: String(e?.message ?? e).split('\n')[0] });
      await L8(page, (L) => L.cardOff()).catch(() => {});
    }
  }
  await free(page);
  writeReport();
}

/** A cold bake of the map at a preset in a fresh context: bake ms and atlas MB. */
async function bakeAt(browser, map, preset) {
  const ctx = await newCtx(browser, { width: 960, height: 540 });
  try {
    const { page } = await openPage(ctx, URL, `${map.q}&gfx=${preset}`);
    await page.waitForFunction(() => window.__app?.current?.world && window.__app.current.player, null, { timeout: 300_000 });
    return { preset, ...(await page.evaluate(pageBake)) };
  } finally {
    await ctx.close().catch(() => {});
  }
}

/** Campus frame time p95 with 24 guards: S2's start and S5-worst, at Auto and Epic. */
async function perfPass() {
  const prev = process.env.E2E_UNCAP;
  process.env.E2E_UNCAP = '1';
  let l;
  try {
    l = await launch({ url: URL, params: 'autostart=campusOps&mode=sector&sectorGuards=0&gfx=user&detect=1', viewport: { width: 1920, height: 1080 } });
  } finally {
    if (prev === undefined) delete process.env.E2E_UNCAP;
    else process.env.E2E_UNCAP = prev;
  }
  browsers.add(l.browser);
  const page = l.page;
  try {
    await page.waitForFunction(() => window.__app?.current?.player && window.__app.current.world && window.__app.current.enemyMgr, null, { timeout: 300_000 });
    await waitOperator(page, 1, 120000);
    await page.waitForTimeout(3000);
    await page.evaluate(pageLib);
    const settings = await L8(page, (L) => L.prep());
    const s2 = await page.evaluate(() => window.__app.current.world.map.sectors?.[1]?.start ?? null);
    const spots = [
      ['campus S2 (section 2 start)', s2 ? [s2.x, s2.y, s2.z] : null, s2 ? s2.yaw : 0],
      ['campus S5-worst', [-50.25, 3.0, 62.25], 158 * D2R],
    ];
    for (const preset of ['auto', 'epic']) {
      await page.evaluate((p) => window.__app.quality.setOverride(p === 'epic' ? { preset: 'epic', scale: null } : null), preset);
      await waitReady(page, 90_000);
      for (const [name, p, yaw] of spots) {
        if (!p) {
          report.perf.push({ name, preset, error: 'no section 2 start in the map data' });
          continue;
        }
        try {
          await free(page);
          await L8(page, (L, [q, y]) => { L.clearGuards(); return L.tp(q, y); }, [p, yaw]);
          await page.waitForTimeout(1500);
          const sp = await page.evaluate(pageSpawn, [24, 'grunt']);
          await waitReady(page, 60_000);
          await page.waitForTimeout(5000);
          const r = await page.evaluate(pagePerf, 10);
          const row = { name, preset, at: p, yawDeg: Math.round(yaw / D2R), guards: sp, ...r, settings: preset === 'auto' ? settings : undefined };
          report.perf.push(row);
          log(`perf ${name} ${preset}: frame p50 ${r.frameMs.p50} p95 ${r.frameMs.p95} p99 ${r.frameMs.p99} ms (${r.fps} fps), cpu p95 ${r.cpuMs.p95}, gpu p95 ${r.gpuMs?.p95 ?? 'n/a'}, ${sp.alive} guards (${sp.inSight} in nav sight), governor ${r.governor}`);
        } catch (e) {
          report.perf.push({ name, preset, error: String(e?.message ?? e).split('\n')[0] });
        }
        await L8(page, (L) => L.clearGuards()).catch(() => {});
        writeReport();
      }
    }
  } finally {
    await l.browser.close().catch(() => {});
    browsers.delete(l.browser);
  }
}

// ---------- the run ----------
log(`out ${OUT}; commit ${head ?? '?'}; ${GPU ? 'hardware GPU' : 'software GL'}; maps ${MAPS.filter((m) => wanted(m.id)).map((m) => m.id).join(', ')}`);
writeReport();
for (const map of MAPS) {
  if (!wanted(map.id)) continue;
  const units = map.units.filter((u) => wanted(map.id, u.name));
  const rep = (report.maps[map.id] = { query: map.q, mode: map.mode, units: {}, probe: [], bake: {}, errors: [], settings: null });
  let browser = null;
  const tMap = Date.now();
  try {
    await withTimeout((async () => {
      log(`${map.id}: boot at Auto graphics (${map.q}&gfx=user&detect=1)`);
      const l = await launch({ url: URL, params: `${map.q}&gfx=user&detect=1`, viewport: VIEW });
      browser = l.browser;
      browsers.add(browser);
      const page = l.page;
      await page.waitForFunction(() => window.__app?.current?.player && window.__app.current.world, null, { timeout: 60_000 });
      const bootMode = /(?:^|&)mode=([^&]+)/.exec(map.q)?.[1] ?? 'sandbox';
      const hasNav = await page.waitForFunction(() => !!(window.__app.current.nav ?? window.__app.current.enemyMgr?.nav), null, { timeout: 30_000 }).then(() => true, () => false);
      const noNav = hasNav ? null : (map.noNav ?? `no nav grid in ${bootMode}`);
      if (!hasNav) {
        const msg = `${map.id}: no nav grid in ${bootMode}${map.noNav ? ` (${map.noNav})` : ''}: shots, probe and co-op skipped, bakes run`;
        rep.errors.push(msg);
        if (!map.noNav) report.errors.push(msg);
        log(`ERROR ${msg}`);
      }
      const op = await waitOperator(page, 1, 120_000);
      await page.waitForTimeout(3000);
      await page.evaluate(pageLib);
      rep.settings = await L8(page, (L) => L.prep());
      rep.bake.auto = { preset: `auto (${rep.settings.preset})`, ...(await page.evaluate(pageBake)) };
      log(`${map.id}: Auto = ${rep.settings.preset} (auto ${rep.settings.auto}, device ${JSON.stringify(rep.settings.device)}), baked lamps ${rep.settings.bakedLamps}, torch slots ${rep.settings.torchSlots}, Wren LOD0 ${op >= 0 ? 'loaded' : 'NOT loaded'}`);
      const toolCtx = await browser.newContext({ viewport: { width: 1600, height: 400 } });
      const tool = await toolCtx.newPage();
      const M = { page, tool, map, rep, plans: {} };
      if (noNav) {
        for (const unit of units) {
          const tag = `${map.id}-${unit.name}`;
          const U = (rep.units[unit.name] ??= { unit: { ...unit }, shots: {} });
          for (let i = 1; i <= 10; i++) {
            const nn = nn2(i);
            await sheet(tool, [{ miss: `not possible: ${noNav}`, label: '' }], 1, `${OUT}/${tag}-${nn}.png`, `${tag}-${nn}`, 800).catch(() => {});
            U.shots[nn] = { file: `${tag}-${nn}.png`, status: 'not-possible', note: `not possible: ${noNav}` };
          }
          log(`${tag} 01-10 NOT-POSSIBLE: ${noNav}`);
        }
        rep.probe = [{ map: map.id, status: 'not-possible', note: `not possible: ${noNav}` }];
        writeReport();
      }
      for (const unit of noNav ? [] : units) {
        try {
          await withTimeout(unitShots(M, unit), 20 * 60_000, `${map.id}-${unit.name}`);
        } catch (e) {
          M.token = null;
          const msg = `${map.id}-${unit.name}: ${String(e?.message ?? e).split('\n')[0]}`;
          rep.errors.push(msg);
          log(`ERROR ${msg}`);
          if (page.isClosed()) throw e;
          await free(page).catch(() => {});
        }
      }
      // the starred shots at Epic (one switch per map)
      if (!SKIP.has('epic') && !noNav) {
        if (rep.settings.preset === 'epic' && !rep.settings.override) {
          for (const unit of units) for (const k of ['05-epic', '07-epic']) {
            const U = rep.units[unit.name];
            if (U) U.shots[k] = { status: 'same-as-auto', note: 'Auto is Epic on this device: the Auto shot is the Epic shot' };
          }
          log(`${map.id}: Auto is Epic: no second pass for 05 / 07`);
        } else {
          log(`${map.id}: Epic pass for the starred shots (05, 07)`);
          await page.evaluate(() => window.__app.quality.setOverride({ preset: 'epic', scale: null }));
          await waitReady(page, 120_000);
          await page.waitForTimeout(2000);
          rep.settingsEpic = await L8(page, (L) => L.settings());
          for (const unit of units) {
            if (!M.plans[unit.name]) continue;
            for (const [k, fn] of [['05-epic', shot05], ['07-epic', shot07]]) {
              try {
                await withTimeout(fn(M, unit, '-epic'), 6 * 60_000, `${map.id}-${unit.name} ${k}`);
              } catch (e) {
                rep.units[unit.name].shots[k] = { status: 'error', note: String(e?.message ?? e).split('\n')[0] };
                await free(page).catch(() => {});
              }
            }
          }
          await page.evaluate(() => window.__app.quality.setOverride(null));
          await waitReady(page, 120_000);
        }
      }
      if (!SKIP.has('probe') && !noNav) await probe(M);
      const errs = l.errors.filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
      if (errs.length) rep.consoleErrors = errs.slice(0, 5).map((e) => e.slice(0, 300));
      await l.ctx.close().catch(() => {});
      if (!SKIP.has('coop') && !noNav) {
        try {
          await withTimeout(pairPass(browser, M, units), 25 * 60_000, `${map.id} co-op pair`);
        } catch (e) {
          const msg = `${map.id} co-op: ${String(e?.message ?? e).split('\n')[0]}`;
          rep.errors.push(msg);
          log(`ERROR ${msg}`);
          for (const unit of units) {
            const U = (rep.units[unit.name] ??= { unit: { ...unit }, shots: {} });
            U.shots['10'] ??= { file: `${map.id}-${unit.name}-10.png`, status: 'error', note: msg };
          }
        }
      }
      if (!SKIP.has('bake')) {
        for (const preset of ['epic', 'low']) {
          try {
            log(`${map.id}: cold bake at ${preset}`);
            rep.bake[preset] = await withTimeout(bakeAt(browser, map, preset), 8 * 60_000, `${map.id} bake ${preset}`);
            report.bakeTable.push({ map: map.id, ...rep.bake[preset] });
            log(`${map.id} bake ${preset}: ${rep.bake[preset].ms} ms, atlas ${rep.bake[preset].atlasMB ?? '-'} MB (visibility ${rep.bake[preset].visMB} MB, ${rep.bake[preset].lights} lamps)`);
          } catch (e) {
            rep.bake[preset] = { preset, error: String(e?.message ?? e).split('\n')[0] };
          }
          writeReport();
        }
      }
      await toolCtx.close().catch(() => {});
    })(), map.capMin * 60_000, map.id);
  } catch (e) {
    const msg = `${map.id}: ${String(e?.message ?? e).split('\n')[0]}`;
    rep.errors.push(msg);
    report.errors.push(msg);
    log(`ERROR ${msg}`);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
      browsers.delete(browser);
    }
    rep.minutes = +((Date.now() - tMap) / 60000).toFixed(1);
    writeReport();
  }
}
if (!SKIP.has('perf') && wanted('campusOps')) {
  try {
    log('perf: campus S2 and S5-worst, 24 guards, Auto and Epic (uncapped browser, 1920x1080)');
    await withTimeout(perfPass(), 15 * 60_000, 'perf');
  } catch (e) {
    report.errors.push(`perf: ${String(e?.message ?? e).split('\n')[0]}`);
  }
}

// ---------- summary ----------
const all = Object.values(report.maps).flatMap((m) => Object.values(m.units ?? {}).flatMap((u) => Object.entries(u.shots)));
const count = (s) => all.filter(([, x]) => x.status === s).length;
report.summary = { shots: all.length, pass: count('pass'), flag: count('flag'), review: count('review'), notPossible: count('not-possible'), error: count('error'), sameAsAuto: count('same-as-auto'), probeFails: report.probeTable.filter((r) => r.pass === false).length, probeMaxDiff: r3(Math.max(0, ...report.probeTable.filter((r) => Number.isFinite(r.diff)).map((r) => r.diff))), perfP95: report.perf.filter((r) => r.frameMs).map((r) => `${r.name} ${r.preset}: ${r.frameMs.p95} ms`) };
report.finished = new Date().toISOString();
writeReport();
log(`done in ${report.minutes} min: ${JSON.stringify(report.summary)}; ${OUT}/report.json`);
clearTimeout(runCap);
stopServer();
process.exit(0);
