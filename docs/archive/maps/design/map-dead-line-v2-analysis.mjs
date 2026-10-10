// Dead Line v2, Area 1 (D1): every check on map-dead-line-v2.json, written to map-dead-line-v2-validation.md.
// Reuses the D1 tooling (core: geometry, nav, LOS, light; sim: routes and perception; checks; bots), with the engine
// numbers imported from src/ by map-dead-line-engine.mjs. Run: node docs/design/map-dead-line-v2-analysis.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hyp, LIGHT, PERCEPTION, loadWorld, guardAt } from './map-dead-line-core.mjs';
import { makeCtx, buildRoute, guardPosAt, sightOf, stepMeter, hears } from './map-dead-line-sim.mjs';
import { lightShares, sightedBy, withState } from './map-dead-line-checks.mjs';
import { sprintBot, timetableBot, playerState, noiseOf } from './map-dead-line-bots.mjs';
import { CAMERA, noiseRadius } from './map-dead-line-engine.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const D = JSON.parse(fs.readFileSync(path.join(here, 'map-dead-line-v2.json'), 'utf8'));
const ctx = makeCtx(D);
const FAST = process.argv.includes('--fast');
const W = ctx.W;
const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
const f2 = (n) => (Math.round(n * 100) / 100).toFixed(2);
const pc = (n) => `${Math.round(n * 100)}%`;
const out = [];
const P = (s = '') => out.push(s);
const rows = []; // summary: [check, result, note]
const result = (check, ok, note) => rows.push([check, typeof ok === 'string' ? ok : ok ? 'PASS' : 'FAIL', note]);
const guardById = Object.fromEntries(ctx.guards.map((g) => [g.id, g]));
const ENC = Object.fromEntries(D.encounters.map((e) => [e.id, e]));
const t0All = Date.now();

// ---------------------------------------------------------------------------------------------- 1. integrity and register
const unwalk = [];
const chk = (kind, id, lv, x, z, rad = 0.6) => { if (!W.grid.nearest(lv, x, z, rad)) unwalk.push(`${kind} ${id} ${lv} (${f1(x)}, ${f1(z)})`); };
for (const s of D.spawns) chk('spawn', s.id, 'G', s.x, s.z);
for (const v of D.vantage) chk('vantage', v.id, v.level, v.x, v.z);
for (const g of D.guards) if (!g.seated) g.wps.forEach((w, k) => chk('guard wp', `${g.id}.${k}`, g.level, w.x, w.z));
for (const h of D.hides) chk('hide', h.id, h.level, (h.rect[0] + h.rect[2]) / 2, (h.rect[1] + h.rect[3]) / 2, 1.0);
for (const k of D.checkpoints) chk('checkpoint', k.id, k.level, k.x, k.z);
const routeErr = Object.values(ctx.routes).filter((r) => r.error).map((r) => r.error);
const regIds = new Map(D.register.map((r) => [r.id, r]));
const needReg = [
  ...D.spaces.map((x) => x.id), ...D.blocks.map((x) => x.id), ...D.openings.map((x) => x.id), ...D.links.map((x) => x.id), ...D.lamps.map((x) => x.id),
  ...D.circuits.map((x) => x.id), ...D.circuits.filter((c) => c.switch && c.switch.id !== 'FP1').map((c) => c.switch.id), ...D.hides.map((x) => x.id), ...D.vantage.map((x) => x.id),
  ...D.spawns.map((x) => x.id), ...D.guards.map((x) => x.id), ...D.encounters.map((x) => x.id), ...D.toys.map((x) => x.id), ...D.locks.map((x) => `lock-${x.id}`),
  ...D.acoustic.map((x) => x.id), ...D.meta.slabs.map((x) => x.id), ...D.checkpoints.map((x) => x.id), ...D.regroup.map((x) => x.id), ...D.extraction.map((x) => x.id), ...D.routes.map((x) => `route-${x.id}`),
];
const missingReg = needReg.filter((id) => !regIds.has(id));
const badReason = D.register.filter((r) => !r.reason || /^so the player/i.test(r.reason.trim()));

// ---------------------------------------------------------------------------------------------- 2. routes and timing
const RIDS = ['M', 'UP', 'UPQ', 'BELOW', 'FP1'];
const spanOf = (id) => ENC[id].span;
const segTimeIn = (rt, x0, x1) => { let t = 0; for (const s of rt.segs) { const mx = (s.a[0] + s.b[0]) / 2; if (mx >= x0 && mx < x1) t += s.t1 - s.t0; } return t; };
const routeLen = (rt) => rt.segs.reduce((a, s) => a + (s.link || s.hold ? 0 : hyp(s.b[0] - s.a[0], s.b[1] - s.a[1])), 0);
const crawl = Object.fromEntries(RIDS.map((id) => [id, buildRoute(W, D.routes.find((r) => r.id === id), { pace: 'crawl' })]));

// ---------------------------------------------------------------------------------------------- 3. light share
const lightOn = lightShares(ctx, 'M');
const lightOff = lightShares(ctx, 'M', ['CA1']);
for (const p of lightOn.samples) p.by = sightedBy(ctx, p);
const shareIn = (samples, x0, x1, f) => { const ss = samples.filter((p) => p.x >= x0 && p.x < x1); return ss.length ? ss.filter(f).length / ss.length : 0; };

// ---------------------------------------------------------------------------------------------- 7. FP1 / CA1 dark window (GA2 resets the fuse)
// GA1 radios it in (2 s); GA2 walks from where he is to FP1 at the investigate pace (walk 0.9 x 1.2), resets (3 s hold), lamps on;
// then walks back to his west stop and rejoins his loop at its next west-stop start.
const GA2 = guardById.GA2;
const INV = 0.9 * 1.2;
const FP1 = D.circuits.find((c) => c.id === 'CA1').switch;
const pathLen = (lv, a, b) => { const n = W.findPath([lv, a[0], a[1]], [lv, b[0], b[1]], { pace: 1 }); if (!n) return { len: Infinity, poly: [] }; const legs = W.pathToLegs(n).filter((l) => !l.link); const poly = [a, ...legs.flatMap((l) => l.pts), b]; let len = 0; for (let q = 1; q < poly.length; q++) len += hyp(poly[q][0] - poly[q - 1][0], poly[q][1] - poly[q - 1][1]); return { len, poly }; };
const along = (poly, d) => { for (let q = 1; q < poly.length; q++) { const l = hyp(poly[q][0] - poly[q - 1][0], poly[q][1] - poly[q - 1][1]); if (d <= l || q === poly.length - 1) { const k = l ? Math.min(1, d / l) : 1; const dx = poly[q][0] - poly[q - 1][0], dz = poly[q][1] - poly[q - 1][1], dl = hyp(dx, dz) || 1; return { x: poly[q - 1][0] + dx * k, z: poly[q - 1][1] + dz * k, face: [dx / dl, dz / dl] }; } d -= l; } const e = poly[poly.length - 1]; return { x: e[0], z: e[1], face: [-1, 0] }; };
function fp1Plan(Toff) {
  const T1 = Toff + 2;
  const p1 = guardPosAt(ctx, GA2, T1);
  const go = pathLen('G', [p1.x, p1.z], [FP1.x, FP1.z + 0.5]);
  const tArrive = T1 + go.len / INV;
  const tOn = tArrive + 3;
  const w = GA2.wps[0];
  const back = pathLen('G', [FP1.x, FP1.z + 0.5], [w.x, w.z]);
  const tBack = tOn + back.len / INV;
  // rejoin: next time his own loop is at the west stop start
  const wStart = ctx.TL.GA2.segs.filter((s) => s.kind === 'dwell')[0].t0 - (GA2.phase || 0);
  let tRe = tBack; const per = 40; { let k = Math.ceil((tBack - wStart) / per); tRe = wStart + k * per; }
  const posOf = (G, T) => {
    if (G.id !== 'GA2' || T < T1 || T >= tRe) return guardPosAt(ctx, G, T);
    if (T < tArrive) return { ...along(go.poly, (T - T1) * INV), moving: true };
    if (T < tOn) return { x: FP1.x, z: FP1.z + 0.5, face: [0, -1], moving: false };
    if (T < tBack) return { ...along(back.poly, (T - tOn) * INV), moving: true };
    return { x: w.x, z: w.z, face: w.face, moving: false };
  };
  return { Toff, dark: tOn - Toff, tOn, go: go.len, posOf };
}
const planCache = new Map();
const planAt = (ev) => { const k = Math.round(ev * 4) / 4; if (!planCache.has(k)) planCache.set(k, fp1Plan(k)); return planCache.get(k); };
const offLight = (pl) => withState(ctx, ['CA1'], [], () => ctx.light(pl.lv, pl.x, pl.z));
// the FP1 hold is a route event: lamps CA1 out until GA2 has reset them, GA2 on his way to FP1 and back
ctx.dyn = { posOf: (G, T, ev) => planAt(ev).posOf(G, T), lightAt: (pl, T, ev) => (T < planAt(ev).tOn ? offLight(pl) : ctx.light(pl.lv, pl.x, pl.z)) };

// ---------------------------------------------------------------------------------------------- 4. timing windows per encounter and route
// cross the encounter span on the route at the silent gear (crouch 1.8 m/s; links, holds as built), starting at each 0.5 s of the 40 s
// cycle: peak awareness of any guard (sight and hearing, engine model). A start is safe when the peak stays under suspicious (0.3).
function crossing(rt, x0, x1) {
  let a = null, b = null;
  for (const s of rt.segs) {
    const xa = s.a[0], xb = s.b[0];
    if (a === null && (Math.max(xa, xb) >= x0)) a = s.t0;
    if (a !== null && Math.max(xa, xb) >= x1) { b = s.t0; break; }
  }
  return a === null ? null : [a, b ?? rt.total];
}
function simRun(rt, tauA, tauB, T0, opts = {}) {
  const dt = 0.25;
  let m = ctx.guards.map(() => ({ m: 0, since: 0 }));
  const by = {};
  let peak = 0, peakG = null, peakAt = null;
  let ev = opts.ev ?? null;
  for (let tau = tauA, T = T0; tau <= tauB + 1e-9; tau += dt, T += dt) {
    const pl = playerState(ctx, rt.segs, tau, 'crawl', 'crawl');
    if (!opts.posOf && ev === null && pl.seg.event && tau >= pl.seg.t1 - 1e-9) ev = T;
    if (pl.hidden) continue;
    const light = opts.lightAt ? opts.lightAt(pl, T) : ev !== null ? ctx.dyn.lightAt(pl, T, ev) : ctx.light(pl.lv, pl.x, pl.z);
    const radius = noiseOf(ctx, pl, tau);
    for (let g = 0; g < ctx.guards.length; g++) {
      const G = ctx.guards[g];
      const gp = opts.posOf ? opts.posOf(G, T) : ev !== null ? ctx.dyn.posOf(G, T, ev) : guardPosAt(ctx, G, T);
      const sg = sightOf(ctx, G, gp, pl, light);
      m[g] = stepMeter(m[g], sg.rate, dt);
      if (sg.instant) m[g] = { m: 1, since: 0 };
      const h = hears(ctx, G, gp, pl, radius);
      if (h.s > m[g].m) m[g] = { m: h.s, since: m[g].since };
      if (m[g].m > (by[G.id] || 0)) by[G.id] = m[g].m;
      if (m[g].m > peak) { peak = m[g].m; peakG = G.id; peakAt = [pl.lv, pl.x, pl.z]; }
    }
  }
  return { peak, peakG, peakAt, by };
}
function windows(rt, x0, x1, opts = {}) {
  const c = crossing(rt, x0, x1);
  if (!c) return null;
  const N = 80, ok = [], blockers = {};
  let best = null;
  for (let k = 0; k < N; k++) {
    const r = simRun(rt, c[0], c[1], k * 0.5, opts);
    ok.push(r.peak < PERCEPTION.suspicious);
    if (!best || r.peak < best.peak) best = { ...r, start: k * 0.5 };
    if (r.peak >= PERCEPTION.suspicious) for (const [g, v] of Object.entries(r.by)) if (v >= PERCEPTION.suspicious) blockers[g] = (blockers[g] || 0) + 1;
  }
  const safeN = ok.filter(Boolean).length;
  let longest = 0, runs = 0;
  if (safeN === N) { longest = 40; runs = 1; } else if (safeN) {
    const start = ok.findIndex((v, i) => !v && ok[(i + 1) % N]);
    let cur = 0;
    for (let k = 1; k <= N; k++) { const i = (start + k) % N; if (ok[i]) cur++; else { if (cur) { runs++; longest = Math.max(longest, cur); } cur = 0; } }
    if (cur) { runs++; longest = Math.max(longest, cur); }
    longest *= 0.5;
  }
  // safe start intervals on the master clock (start of the crossing)
  const iv = [];
  for (let k = 0; k < N; k++) if (ok[k] && !ok[(k + N - 1) % N]) { let e = k; while (ok[(e + 1) % N] && (e + 1) % N !== k) e = (e + 1) % N; iv.push(`${f1(k * 0.5)}-${f1(e * 0.5 + 0.5)}`); }
  return { time: c[1] - c[0], safeShare: safeN / N, longest, runs, blockers, best, intervals: safeN === N ? 'any' : iv.join(', ') || 'none' };
}
const ENCS = ['E1.2', 'E1.4', 'E1.5', 'E1.7', 'E1.8'];
// --json-only: the ground route windows with the engine and with the proposed dim-light rule (map-dead-line-v2-perception.mjs)
if (process.argv.includes('--json-only')) {
  const { proposedRate } = await import('./map-dead-line-v2-dimnear.mjs');
  const res = { engine: {}, proposal: {} };
  for (const e of ENCS) res.engine[e] = windows(crawl.M, ...spanOf(e)).safeShare;
  ctx.sightRateFn = proposedRate; ctx.lightCache = new Map();
  for (const e of ENCS) res.proposal[e] = windows(crawl.M, ...spanOf(e)).safeShare;
  console.log(JSON.stringify(res));
  process.exit(0);
}
const WIN = {};
for (const e of ENCS) { WIN[e] = {}; for (const id of RIDS) WIN[e][id] = windows(crawl[id], ...spanOf(e)); }

// ---------------------------------------------------------------------------------------------- 5. sight cones: what each guard covers
// 1 m cells of Area 1 (x 0 to 192) on G and U, crouched and standing still: seen (rate above the leak) at some moment of the cycle
function coverage(G, lv, x0, x1, z0, z1, step = 1, crouched = true) {
  const per = ctx.TL[G.id].period;
  const cells = [];
  for (let x = x0 + step / 2; x < x1; x += step) for (let z = z0 + step / 2; z < z1; z += step) { const [i, j] = W.grid.cellOf(x, z); if (W.grid.walk(lv, i, j)) cells.push([x, z]); }
  let seen = 0, seenSec = 0, maxRate = 0;
  const seenCells = [];
  for (const [x, z] of cells) {
    let any = false, secs = 0, mr = 0;
    for (let t = 0; t < per; t += 1) {
      const gp = guardAt(G, ctx.TL[G.id], t);
      if (hyp(gp.x - x, gp.z - z) > 26) continue;
      const sg = sightOf(ctx, G, gp, { lv, x, z, crouched, speed: 0 }, ctx.light(lv, x, z));
      if (sg.rate > PERCEPTION.leak) { any = true; secs++; mr = Math.max(mr, sg.rate); }
    }
    if (any) { seen++; seenSec += secs; seenCells.push([x, z, secs, mr]); }
    maxRate = Math.max(maxRate, mr);
  }
  return { cells: cells.length, seen, share: cells.length ? seen / cells.length : 0, meanSec: seen ? seenSec / seen : 0, maxRate, seenCells };
}
const COV = {};
if (!FAST) for (const G of ctx.guards) if (G.id !== 'SN') COV[G.id] = { G: coverage(G, 'G', 0, 192, 4, 38, 1), U: coverage(G, 'U', 0, 192, 21, 26, 1) };

// ---------------------------------------------------------------------------------------------- 6. roof exposure at E1.2 and E1.5 (and every guard on the lean-tos)
const ROOFX = { 'E1.2': [22, 46], 'E1.4': [46, 82], 'E1.5': [82, 100], 'E1.7': [142, 172] };
const roofExp = {};
for (const [e, [x0, x1]] of Object.entries(ROOFX)) {
  roofExp[e] = {};
  for (const G of ctx.guards) {
    if (G.id === 'SN' || G.id === 'GB1') continue;
    const c = coverage(G, 'U', x0, x1, 21, 26, 0.5);
    const cs = coverage(G, 'U', x0, x1, 21, 26, 0.5, false);
    if (c.seen || cs.seen) roofExp[e][G.id] = { crouched: c, standing: cs };
  }
}

const fp1 = { plans: [] };
{
  const rt = crawl.FP1;
  const hold = rt.segs.find((s) => s.hold && s.label?.startsWith('FP1'));
  const xEnd = 100; // run on to the A9 recess (K2)
  const tauEnd = rt.segs.find((s) => Math.max(s.a[0], s.b[0]) >= xEnd)?.t0 ?? rt.total;
  for (let k = 0; k < (FAST ? 0 : 80); k++) {
    const Toff = k * 0.5; // master time when the fuse comes out (end of the 3 s hold)
    // the hold itself (3 s before Toff) with the lamps still on
    const h = simRun(rt, hold.t0, hold.t1, Toff - 3);
    const plan = fp1Plan(Toff);
    const lightAt = (pl, T) => (T < plan.tOn ? withState(ctx, ['CA1'], [], () => ctx.light(pl.lv, pl.x, pl.z)) : ctx.light(pl.lv, pl.x, pl.z));
    // after the throw: wait w s in the FX1 recess (K1) then go on; pick the wait with the lowest peak
    let best = null;
    const tauK1 = rt.segs.find((s) => s.label === undefined && s.a[0] >= 46 && !s.hold)?.t0 ?? hold.t1;
    for (let wv = 0; wv <= 30; wv += 2) {
      const r1 = simRun(rt, hold.t1, tauK1, Toff, { posOf: plan.posOf, lightAt });
      const T2 = Toff + (tauK1 - hold.t1);
      const rw = simRun({ segs: [{ ...rt.segs.find((s) => s.t0 <= tauK1 && s.t1 >= tauK1), t0: 0, t1: wv, speed: 0, hold: true }] }, 0, wv, T2, { posOf: plan.posOf, lightAt: (pl, T) => lightAt(pl, T) });
      const r2 = simRun(rt, tauK1, tauEnd, T2 + wv, { posOf: plan.posOf, lightAt });
      const peak = Math.max(r1.peak, rw.peak, r2.peak);
      const g = [r1, rw, r2].reduce((a, b) => (b.peak > a.peak ? b : a)).peakG;
      if (!best || peak < best.peak) best = { wait: wv, peak, g, darkLeftAtEnd: plan.tOn - (T2 + wv + (tauEnd - tauK1)) };
    }
    fp1.plans.push({ Toff, holdPeak: h.peak, holdG: h.peakG, dark: plan.dark, go: plan.go, best });
  }
  const legal = fp1.plans.filter((p) => p.holdPeak < PERCEPTION.suspicious);
  fp1.legal = legal;
  const ds = legal.map((p) => p.dark).sort((a, b) => a - b);
  fp1.darkMin = ds[0]; fp1.darkMax = ds[ds.length - 1]; fp1.darkMed = ds[Math.floor(ds.length / 2)];
  fp1.safeRuns = legal.filter((p) => p.best.peak < PERCEPTION.suspicious);
}

// ---------------------------------------------------------------------------------------------- 8. the vent grating VG
const VG = D.acoustic[0];
const vg = [];
for (const [label, speed, crouched, sprint] of [['crouch gear 4 (1.8)', 1.8, true, false], ['crouch gear 5 (2.3)', 2.3, true, false], ['crouch gear 6 (2.8)', 2.8, true, false], ['stand gear 2 (1.3)', 1.3, false, false], ['stand gear 3 (2.0)', 2.0, false, false], ['stand gear 4 jog (2.8)', 2.8, false, false], ['stand gear 5 run (3.8)', 3.8, false, false], ['sprint (5.0)', 5.0, false, true]]) {
  const radius = noiseRadius(speed, crouched, sprint);
  let heardStarts = 0, maxS = 0;
  for (let k = 0; k < 80; k++) {
    const T0 = k * 0.5;
    const dur = (VG.rect[2] - VG.rect[0]) / speed;
    let heard = false;
    for (let t = 0; t <= dur; t += 0.25) {
      const pl = { lv: 'B', x: VG.rect[0] + speed * t, z: 16.3, crouched, speed };
      for (const G of ctx.guards) { const h = hears(ctx, G, guardPosAt(ctx, G, T0 + t), pl, radius); if (h.heard) { heard = true; maxS = Math.max(maxS, h.s); } }
    }
    if (heard) heardStarts++;
  }
  // the same pass elsewhere in the tunnel (no grating): muffled through the 2 m of ground
  let heardElse = 0;
  for (let k = 0; k < 80; k++) {
    const T0 = k * 0.5;
    let heard = false;
    for (let t = 0; t <= 3 / speed; t += 0.25) { const pl = { lv: 'B', x: 61 + speed * t, z: 16.3, crouched, speed }; for (const G of ctx.guards) if (hears(ctx, G, guardPosAt(ctx, G, T0 + t), pl, radius).heard) heard = true; }
    if (heard) heardElse++;
  }
  vg.push({ label, radius, share: heardStarts / 80, maxS, elseShare: heardElse / 80 });
}

// ---------------------------------------------------------------------------------------------- 9. the sniper's reach and the eaves
const snPositions = [['brief position (212, -20)', [212, -20]], ['JSON loop, east stop (212, -13)', [212, -13]], ['JSON loop, west stop (207, -13)', [207, -13]], ['A block NW corner (196.5, -12.5), worst case', [196.5, -12.5]]];
const area1Cells = [];
for (const lv of ['G', 'U']) for (let x = 0.5; x < 192; x += 1) for (let z = 4.5; z < 38; z += 1) { const [i, j] = W.grid.cellOf(x, z); if (W.grid.walk(lv, i, j)) area1Cells.push([lv, x, z]); }
const snReach = snPositions.map(([label, [sx, sz]]) => {
  let inRange = 0, visible = 0; const pts = [];
  for (const [lv, x, z] of area1Cells) {
    const d = Math.sqrt((x - sx) ** 2 + (z - sz) ** 2 + (W.Y[lv] + 1.05 - (W.Y.R + 1.6)) ** 2);
    if (d > PERCEPTION.focusRange) continue;
    inRange++;
    if (W.los({ l: 'R', x: sx, z: sz, h: 1.6 }, { l: lv, x, z, h: 1.05 })) { visible++; pts.push([lv, x, z]); }
  }
  const nearest = area1Cells.reduce((a, [lv, x, z]) => Math.min(a, Math.sqrt((x - sx) ** 2 + (z - sz) ** 2 + (W.Y[lv] + 1.05 - (W.Y.R + 1.6)) ** 2)), 1e9);
  return { label, inRange, visible, nearest, xs: pts.length ? [Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[1]))] : null };
});
// eaves: does the 0.6 m overhang at 3.0 shade the north strip (z 20.5) from any viewer in Area 1? Compare LOS with and without the eave slabs
const noEaves = loadWorld({ ...D, meta: { ...D.meta, slabs: D.meta.slabs.filter((s) => !s.id.startsWith('EAV')) } });
let eaveDiff = 0, eaveTests = 0;
const viewers = [...ctx.guards.filter((g) => g.id !== 'SN').map((g) => ({ id: g.id, l: g.level, pts: Array.from({ length: 40 }, (_, t) => guardPosAt(ctx, g, t)) })), { id: 'SN worst case', l: 'R', pts: [{ x: 196.5, z: -12.5 }] }];
if (!FAST) for (const v of viewers) for (const gp of v.pts) for (let x = 12.5; x < 172; x += 1) {
  if (hyp(gp.x - x, gp.z - 20.6) > 26 && v.id !== 'SN worst case') continue;
  for (const h of [1.05, 1.6]) { eaveTests++; const a = W.los({ l: v.l, x: gp.x, z: gp.z, h: 1.6 }, { l: 'G', x, z: 20.6, h }); const b = noEaves.los({ l: v.l, x: gp.x, z: gp.z, h: 1.6 }, { l: 'G', x, z: 20.6, h }); if (a !== b) eaveDiff++; }
}

// ---------------------------------------------------------------------------------------------- 10. bots
const sprint = sprintBot(ctx);
const TT = Object.fromEntries(RIDS.map((id) => [id, timetableBot(ctx, { route: id })]));
// Area 1 targets (Michael, D1 revision): ground route 4 to 5 min, 35 to 45% waiting, longest wait 45 s; every route within 20% of it
const TT_LO = 240, TT_HI = 300;

// ---------------------------------------------------------------------------------------------- 11. rule 27 camera
const cam = []; let camN = 0;
for (const id of RIDS) {
  const rtc = ctx.routes[id];
  if (!rtc || rtc.error) continue;
  const ends = rtc.segs.filter((q) => q.link).flatMap((q) => { const L = D.links.find((l) => l.id === q.link); return L ? [L.a, L.b] : []; });
  // facing: the route heading over 2 m behind to 2 m ahead (a half-metre diagonal grid step is not a turn of the view)
  const walk = [];
  for (const sg of rtc.segs) { if (sg.link || sg.hold) { walk.push(null); continue; } const len = hyp(sg.b[0] - sg.a[0], sg.b[1] - sg.a[1]); for (let d = 0; d < len; d += 0.25) walk.push([sg.lv, sg.a[0] + ((sg.b[0] - sg.a[0]) * d) / len, sg.a[1] + ((sg.b[1] - sg.a[1]) * d) / len]); }
  for (let k = 0; k < walk.length; k += 4) {
    const p = walk[k];
    if (!p) continue;
    let a = k, b = k;
    while (a > 0 && walk[a - 1] && walk[a - 1][0] === p[0] && k - a < 8) a--;
    while (b < walk.length - 1 && walk[b + 1] && walk[b + 1][0] === p[0] && b - k < 8) b++;
    const fx = walk[b][1] - walk[a][1], fz = walk[b][2] - walk[a][2];
    if (hyp(fx, fz) < 1e-6) continue;
    const [lv, x, z] = p;
    if (ends.some((e) => e[0] === lv && hyp(e[1] - x, e[2] - z) < 1.5)) continue;
    for (const crouch of [false, true]) { camN++; const c = W.cameraClear(lv, x, z, fx, fz, CAMERA, crouch); if (!c.ok) cam.push(`${id} ${lv} (${f1(x)}, ${f1(z)}) ${crouch ? 'crouched' : 'standing'} ${c.part}`); }
  }
}

// ---------------------------------------------------------------------------------------------- write the report
P('# Dead Line v2, Area 1: D1 validation');
P();
P(`Generated by \`map-dead-line-v2-analysis.mjs\` from \`map-dead-line-v2.json\` (${new Date().toISOString().slice(0, 10)}). Engine numbers (perception, light, lamp formula, noise, muffling, surfaces, camera) are imported from \`src/\`; nothing below is hand-edited. Model notes: 0.5 m nav grid, agent 0.32; lean-to roofs walked at 3.3 (mean of 3.0 and 3.6) with the gutter edge at its real 3.0; eaves 0.6 m at 3.0; ambient 0.10 outdoors, 0.06 in the tunnel; detection at the suspicious threshold ${PERCEPTION.suspicious}.`);
P();
P('## Summary');
P();
P('| Check | Result | Note |');
P('| --- | --- | --- |');
const SUMMARY_AT = out.length;
P();
P('## 1. Data and the element register');
P();
P(`- Points off the nav grid: ${unwalk.length ? unwalk.join('; ') : 'none'}.`);
P(`- Route build errors: ${routeErr.length ? routeErr.join('; ') : 'none'}.`);
P(`- Register: ${D.register.length} rows; elements without a row: ${missingReg.length ? missingReg.join(', ') : 'none'}; rows without a real reason: ${badReason.length ? badReason.map((r) => r.id).join(', ') : 'none'}.`);
result('Element register covers every Area 1 element (16.9)', missingReg.length === 0 && badReason.length === 0, `${D.register.length} rows, ${missingReg.length} missing`);
// rule 16 (hide spots fit the camera and are dark) and rule 1 (vantages are dark)
const litHides = D.hides.filter((h) => W.lightAt(h.level, (h.rect[0] + h.rect[2]) / 2, (h.rect[1] + h.rect[3]) / 2, 0.6) >= LIGHT.shadow).map((h) => h.id);
const smallHides = D.hides.filter((h) => Math.min(h.rect[2] - h.rect[0], h.rect[3] - h.rect[1]) < 1.0 - 1e-6 || Math.max(h.rect[2] - h.rect[0], h.rect[3] - h.rect[1]) < 1.2 - 1e-6).map((h) => h.id);
const litVantage = D.vantage.filter((v) => W.lightAt(v.level, v.x, v.z, 0.6) >= LIGHT.shadow).map((v) => v.id);
result('Hide spots dark and at least 1.2 x 1.0; vantages dark (rules 16 and 1)', !litHides.length && !smallHides.length && !litVantage.length, `${D.hides.length} hides, lit: ${litHides.join(', ') || 'none'}, undersized: ${smallHides.join(', ') || 'none'}; ${D.vantage.length} vantages, lit: ${litVantage.join(', ') || 'none'}`);
result('Every spawn, vantage, guard stop, hide and checkpoint is on the nav grid', unwalk.length === 0 && routeErr.length === 0, unwalk.length ? unwalk.slice(0, 4).join('; ') : 'all walkable; all 5 routes build');
P();
P('## 2. Route timing');
P();
P('Ideal walk: each route at its own gears (ground at gear 3 standing 2.0 m/s, roofs and tunnel crouched at gear 4 1.8 m/s), links at their travel time, holds as listed, no waiting. Crawl: the whole route at the silent crouched gear 4 (what the windows and the timetable bot use).');
P();
P('| Route | Length m | Ideal walk s | Crawl s | E1.2 | E1.4 | E1.5 | E1.7 | E1.8 |');
P('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const id of RIDS) { const rt = ctx.routes[id], rc = crawl[id]; P(`| ${id} | ${f1(routeLen(rt))} | ${f1(rt.total)} | ${f1(rc.total)} | ${ENCS.map((e) => f1(segTimeIn(rc, ...spanOf(e)))).join(' | ')} |`); }
P();
P(`Encounter columns: crawl seconds spent inside each encounter's x span (E1.2 x ${spanOf('E1.2').join(' to ')}, E1.4 ${spanOf('E1.4').join(' to ')}, E1.5 ${spanOf('E1.5').join(' to ')}, E1.7 ${spanOf('E1.7').join(' to ')}, E1.8 ${spanOf('E1.8').join(' to ')}).`);
const ideal = ctx.routes.M.total;
result('Ground route ideal walk', 'INFO', `${f1(ideal)} s over ${f1(routeLen(ctx.routes.M))} m`);
P();
P('## 3. Light share along the ground route');
P();
P('| Stretch | Lit (all lamps on) | Lit and in a guard sightline | Lit with CA1 off |');
P('| --- | --- | --- | --- |');
const stretches = [['Whole route', 0, 200], ...ENCS.map((e) => [e, ...spanOf(e)]), ['E1.6 (A13)', ...spanOf('E1.6')]];
for (const [n, x0, x1] of stretches) P(`| ${n} | ${pc(shareIn(lightOn.samples, x0, x1, (p) => p.lit))} | ${pc(shareIn(lightOn.samples, x0, x1, (p) => p.lit && p.by.length))} | ${pc(shareIn(lightOff.samples, x0, x1, (p) => p.lit))} |`);
const litAll = shareIn(lightOn.samples, 0, 200, (p) => p.lit);
const litSighted = shareIn(lightOn.samples, 0, 200, (p) => p.lit && p.by.length);
P();
P(`Lit means light >= ${LIGHT.shadow} (LIGHT.shadow). For information only: Michael removed the 60% target and L1 for Area 1 (D1 revision); lamps stand where guards face. Whole route ${pc(litAll)} lit, ${pc(litSighted)} lit and in a sightline.`);
P();
P('## 4. Sight cones: what each guard covers');
P();
P('1 m cells of Area 1, a still player, at every second of the guard\'s 40 s loop, counted as seen when the engine sight rate is above the leak (0.2/s). Lane = ground cells x 0 to 192; roofs = the lean-to roofs.');
P();
P('| Guard | Lane cells seen (crouched) | Share | Mean s seen per cycle | Roof cells seen (crouched) | Max fill rate /s |');
P('| --- | --- | --- | --- | --- | --- |');
for (const [id, c] of Object.entries(COV)) P(`| ${id} | ${c.G.seen} of ${c.G.cells} | ${pc(c.G.share)} | ${f1(c.G.meanSec)} | ${c.U.seen} of ${c.U.cells} | ${f2(Math.max(c.G.maxRate, c.U.maxRate))} |`);
P();
P('## 5. Timing windows per encounter and route');
P();
P('Crossing each encounter\'s span at the silent crouched gear 4 starting at every 0.5 s of the 40 s cycle; a start is safe when no guard\'s meter (sight and hearing) reaches 0.3. Safe share = safe starts / 80; longest = the longest run of safe starts.');
P();
P('| Encounter | Route | Crossing s | Safe share | Longest window s | Safe starts (master s) | Who closes the others |');
P('| --- | --- | --- | --- | --- | --- | --- |');
for (const e of ENCS) for (const id of RIDS) { const w = WIN[e][id]; if (!w) continue; P(`| ${e} | ${id} | ${f1(w.time)} | ${pc(w.safeShare)} | ${f1(w.longest)} | ${w.intervals} | ${Object.entries(w.blockers).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} (${n})`).join(', ') || '-'} |`); }
// Michael's encounter rules (D1 revision)
const gShare = ENCS.map((e) => [e, WIN[e].M]);
result('Ground route: safe share 25 to 45% at every guarded encounter', gShare.every(([, w]) => w.safeShare >= 0.25 - 1e-9 && w.safeShare <= 0.45 + 1e-9), gShare.map(([e, w]) => `${e} ${pc(w.safeShare)}`).join(', '));
result('Ground route: a guard whose position matters at every encounter', gShare.every(([, w]) => Object.keys(w.blockers).length > 0), gShare.map(([e, w]) => `${e} ${Object.keys(w.blockers).join('+') || 'none'}`).join(', '));
const full = [];
for (const e of ENCS) for (const id of RIDS) { const w = WIN[e][id]; if (w && w.safeShare >= 1 - 1e-9) full.push(`${id} at ${e}`); }
result('No route 100% safe at any guarded encounter (every route has a timed exposure)', full.length === 0, full.length ? full.join(', ') : 'every route has a timed exposure at every guarded encounter');
const cheap = [];
// safer = a safe share more than 5 points above the ground route (two routes on one path differ by a start step or two)
for (const e of ENCS) for (const id of RIDS.filter((r) => r !== 'M')) { const w = WIN[e][id], g = WIN[e].M; if (w && w.safeShare > g.safeShare + 0.05 + 1e-9 && w.time < g.time + 15 - 1e-9) cheap.push(`${id} at ${e} (${pc(w.safeShare)} vs ${pc(g.safeShare)}, +${f1(w.time - g.time)} s)`); }
result('A route safer than the ground route costs at least 15 s more there', cheap.length === 0, cheap.length ? cheap.join('; ') : 'none cheaper and safer');
P();
P('## 6. Roof exposure at E1.2 and E1.5 (and the other roof stretches)');
P();
P('Roof cells (0.5 m) over each stretch seen by each guard at some moment of his loop, crouched and standing; GA3 is measured from his cab seat and his rear stop.');
P();
P('| Stretch | Guard | Crouched: cells seen | Share | Mean s per cycle | Standing: share | Max fill /s |');
P('| --- | --- | --- | --- | --- | --- | --- |');
for (const [e, m] of Object.entries(roofExp)) { const ent = Object.entries(m); if (!ent.length) P(`| ${e} roofs x ${ROOFX[e].join(' to ')} | none | 0 | 0% | - | 0% | - |`); for (const [g, c] of ent) P(`| ${e} roofs x ${ROOFX[e].join(' to ')} | ${g} | ${c.crouched.seen} of ${c.crouched.cells} | ${pc(c.crouched.share)} | ${f1(c.crouched.meanSec)} | ${pc(c.standing.share)} | ${f2(Math.max(c.crouched.maxRate, c.standing.maxRate))} |`); }
P();
P('Dominance test: a roof route (UP or UPQ, counted only where it spends at least half of the crossing on the roofs) is "both the fastest and the lowest-risk way past" when no other route is more than 1 s faster and the roof route is more than 5 points safer than every other route (the same 5-point tolerance as rule 3).');
P();
P('| Encounter | Fastest (crawl s) | Safest (safe share) | Roof dominant? |');
P('| --- | --- | --- | --- |');
const dominant = [];
for (const e of ENCS) {
  const cand = RIDS.map((id) => [id, WIN[e][id]]).filter(([, w]) => w);
  const fastest = cand.reduce((a, b) => (b[1].time < a[1].time ? b : a));
  const safest = cand.reduce((a, b) => (b[1].safeShare > a[1].safeShare ? b : a));
  // the roof counts only where the roof route is on the roofs for at least half of the crossing; a tie within 1 s or 5 points counts against the roof
  const onRoof = (id) => { const rt = crawl[id]; const [x0, x1] = spanOf(e); let tot = 0, u = 0; for (const s of rt.segs) { const mx = (s.a[0] + s.b[0]) / 2; if (mx >= x0 && mx < x1) { tot += s.t1 - s.t0; if (s.lv === 'U') u += s.t1 - s.t0; } } return tot > 0 && u / tot >= 0.5; };
  const roofs = cand.filter(([id]) => ['UP', 'UPQ'].includes(id) && onRoof(id));
  const others = cand.filter(([id]) => !roofs.some(([r]) => r === id));
  // dominant: no slower than any other route by more than 1 s and safer than all of them by more than 5 points (the rule 3 tolerance)
  const roofDom = roofs.some(([, w]) => others.every(([, o]) => w.time <= o.time + 1 && w.safeShare > o.safeShare + 0.05 + 1e-9));
  if (roofDom) dominant.push(e);
  P(`| ${e} | ${fastest[0]} ${f1(fastest[1].time)} | ${safest[0]} ${pc(safest[1].safeShare)} | ${roofDom ? 'YES' : 'no'} |`);
}
result('No encounter where the roof is both fastest and lowest-risk (item 6)', dominant.length === 0, dominant.length ? `dominant at ${dominant.join(', ')}` : 'roof never dominates');
P();
P('## 7. FP1 and CA1: the dark window');
P();
P(`GA1 radios the lamps out (2 s); GA2 walks from where he is to FP1 at the investigate pace (${f2(INV)} m/s = walk 0.9 x 1.2), resets the fuse (3 s) and the lamps come back on; he walks back to his west stop and rejoins his loop. The player holds FP1 for 3 s with the lamps still on (that hold is checked against every guard), then crawls on through the row and the bay to K2, choosing the wait in the FX1 recess (0 to 30 s) that keeps the meters lowest.`);
P();
P(`- Throw times (of 80 per cycle) at which the 3 s hold itself stays under suspicious: ${fp1.legal.length}.`);
P(`- Dark window for those throws: ${f1(fp1.darkMin)} to ${f1(fp1.darkMax)} s, median ${f1(fp1.darkMed)} s (target about 25 s).`);
P(`- Throws after which the run from FP1 to K2 stays under suspicious: ${fp1.safeRuns.length}.`);
P();
P('| Throw at master s | Hold peak | Dark window s | GA2 walk m | Best wait at FX1 s | Run peak | Closed by |');
P('| --- | --- | --- | --- | --- | --- | --- |');
for (const p of fp1.plans.filter((_, k) => k % 4 === 0)) P(`| ${f1(p.Toff)} | ${f2(p.holdPeak)}${p.holdPeak >= PERCEPTION.suspicious ? ' (' + p.holdG + ')' : ''} | ${f1(p.dark)} | ${f1(p.go)} | ${p.best.wait} | ${f2(p.best.peak)} | ${p.best.peak >= PERCEPTION.suspicious ? p.best.g : '-'} |`);
result('FP1 dark window about 25 s (GA2 resets the fuse)', fp1.legal.length && Math.abs(fp1.darkMed - 25) <= 5 ? 'PASS' : 'FAIL', fp1.legal.length ? `median ${f1(fp1.darkMed)} s (${f1(fp1.darkMin)} to ${f1(fp1.darkMax)}) over ${fp1.legal.length} usable throw times` : 'no safe moment to hold FP1');
result('FP1 is a usable trade (some throw lets the player through the row and bay unseen)', fp1.safeRuns.length > 0, `${fp1.safeRuns.length} of ${fp1.legal.length} usable throws`);
P();
P('## 8. The tunnel ventilation grating VG');
P();
P(`${VG.note}. A pass under it (x ${VG.rect[0]} to ${VG.rect[2]}) at each gear, started at every 0.5 s of the cycle; "heard" = a guard inside the noise reach (engine noiseRadius x floor; unmuffled from the grating, the 0.45 muffle elsewhere). For comparison the same pass 4 m east, away from the grating.`);
P();
P('| Gear | Noise radius m | Starts heard under VG | Peak suspicion | Starts heard elsewhere in the tunnel |');
P('| --- | --- | --- | --- | --- |');
for (const r of vg) P(`| ${r.label} | ${f2(r.radius)} | ${pc(r.share)} | ${f2(r.maxS)} | ${pc(r.elseShare)} |`);
const vgSilent = vg.find((r) => r.label.startsWith('crouch gear 4'));
const vgWalk = vg.find((r) => r.label.startsWith('stand gear 3'));
result('Vent grating: crouched and slow passes, faster gears are heard (E1.4 cost)', vgSilent.share === 0 && vgWalk.share > 0, `crouch gear 4 heard ${pc(vgSilent.share)}; standing gear 3 heard ${pc(vgWalk.share)} of starts`);
P();
P('## 9. The sniper\'s reach at the east end, and the eaves');
P();
P(`Every archetype sees out to the same ${PERCEPTION.focusRange} m focus range (ai/perception.ts; the sniper's 70 m is its weapon range once engaged, and its laser only shows while it aims). Area 1 cells (G and roofs, 1 m) within ${PERCEPTION.focusRange} m of a crouched player's head, and of those, the ones with a clear line from the sniper's eye on A block's roof (+12.6, eye +1.6):`);
P();
P('| Sniper position | Nearest Area 1 cell m | Cells in range | Cells in range and in sight | x range seen |');
P('| --- | --- | --- | --- | --- |');
for (const s of snReach) P(`| ${s.label} | ${f1(s.nearest)} | ${s.inRange} | ${s.visible} | ${s.xs ? s.xs.map(f1).join(' to ') : '-'} |`);
P();
P(`Eaves: ${eaveTests} sight lines from every Area 1 guard (each second of his loop, within 26 m) and the sniper's worst-case corner to the north strip (z 20.6, x 12 to 172, head heights 1.05 and 1.6) were tested with and without the 0.6 m eaves. Lines whose result changes: ${eaveDiff}.`);
const snBrief = snReach[0];
result("Sniper's range at the east end (open item)", 'INFO', `brief position: nearest Area 1 cell ${f1(snBrief.nearest)} m, ${snBrief.visible} cells seen; worst case (NW corner): ${snReach[3].visible} cells seen`);
result('Eaves shade the north strip (open item)', 'INFO', eaveDiff ? `${eaveDiff} of ${eaveTests} lines change` : `no: 0 of ${eaveTests} lines change`);
P();
P('## 10. Bots');
P();
P(`**Sprint bot** (ground route M at sprint, 5.0 m/s, noise 9 m, never waits): route ${f1(sprint.routeS)} s; spotted ${sprint.spotted.length}, heard ${sprint.heard.length}, events ${sprint.events}; first alarm at ${sprint.alarmAtS === null ? 'none' : f1(sprint.alarmAtS) + ' s'}. Spotted by: ${sprint.spotted.map((e) => `${e.g} at ${e.t} s (${e.at[1]}, ${e.at[2]})`).join('; ') || 'nobody'}. Heard by: ${sprint.heard.map((e) => `${e.g} at ${e.t} s`).join('; ') || 'nobody'}.`);
P();
result('Sprint bot: alarm in the first 15 s', sprint.alarmAtS !== null && sprint.alarmAtS <= 15, `alarm ${sprint.alarmAtS === null ? 'none' : 'at ' + f1(sprint.alarmAtS) + ' s'}, ${sprint.events} events`);
P('**Timetable bot** (silent crouched gear 4, perfect knowledge of the guard clock, stop to stop between cover samples, waits only where waiting is safe). Targets (Michael, D1 revision): ground route 4 to 5 min with 35 to 45% waiting and no wait over 45 s; every route within 20% of the ground route. The FP1 route plays the fuse event: lamps out until GA2 has reset them, GA2 walking to FP1 and back.');
P();
P('| Route | Reached | Alarms | Max meter | Finished s (min) | Waited s (share) | Longest wait s | Unsafe moments |');
P('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const [id, t] of Object.entries(TT)) P(`| ${id} | ${t.reached ? 'yes' : 'no'} | ${t.alarms} | ${f2(t.maxMeter)} | ${f1(t.finishedAtS)} (${f2(t.finishedMin)}) | ${f1(t.waitedS)} (${pc(t.waitShare)}) | ${f1(t.longestWaitS)} | ${t.unsafeMoments}${t.unsafe.length ? ': ' + t.unsafe.slice(0, 3).map((u) => `${u.g} ${u.peak} at (${u.at[1]}, ${u.at[2]})`).join('; ') : ''} |`);
const ttM = TT.M;
result('Timetable bot, ground route: reaches K4 and SD with no alarm, under suspicious', ttM.reached && ttM.alarms === 0 && ttM.maxMeter < PERCEPTION.suspicious, `max meter ${f2(ttM.maxMeter)}, ${f1(ttM.finishedAtS)} s`);
result('Timetable bot, ground route: 4 to 5 min', ttM.finishedAtS >= TT_LO && ttM.finishedAtS <= TT_HI, `${f1(ttM.finishedAtS)} s (${f2(ttM.finishedMin)} min)`);
result('Timetable bot, ground route: 35 to 45% waiting', ttM.waitShare >= 0.35 - 1e-9 && ttM.waitShare <= 0.45 + 1e-9, `${pc(ttM.waitShare)} (${f1(ttM.waitedS)} s)`);
result('Timetable bot, ground route: longest single wait 45 s or less', ttM.longestWaitS <= 45, `${f1(ttM.longestWaitS)} s`);
for (const id of RIDS.filter((r) => r !== 'M')) { const t = TT[id]; const dv = (t.finishedAtS - ttM.finishedAtS) / ttM.finishedAtS; result(`Timetable bot, ${id}: reaches the exit unseen, within 20% of the ground route`, t.reached && t.alarms === 0 && t.maxMeter < PERCEPTION.suspicious && Math.abs(dv) <= 0.2 + 1e-9, `${f1(t.finishedAtS)} s (${dv >= 0 ? '+' : ''}${pc(dv)}), max meter ${f2(t.maxMeter)}, waited ${pc(t.waitShare)}`); }
P();
P('## 11. Rule 27: the camera');
P();
P(`${camN} camera tests (every 1 m along the five routes, standing and crouched, facing the route heading over 4 m (2 m behind to 2 m ahead; the D1 script used each 1 m grid piece, which turns the view 45 degrees on half-metre grid steps), shoulder ${CAMERA.shoulderHip} m, boom ${CAMERA.boomHip} m from config/camera.ts; walls, blocks and props): ${cam.length} collisions${cam.length ? ': ' + cam.slice(0, 12).join('; ') : ''}.`);
result('Rule 27: the camera boom never collides along any route', cam.length === 0, `${camN} tests, ${cam.length} hits`);
P();
P(`Run time ${f1((Date.now() - t0All) / 1000)} s.`);
out.splice(SUMMARY_AT, 0, ...rows.map(([c, r, n]) => `| ${c} | ${r} | ${n} |`));
fs.writeFileSync(path.join(here, 'map-dead-line-v2-validation.md'), out.join('\n') + '\n');
const json = { rows, WIN: Object.fromEntries(Object.entries(WIN).map(([e, m]) => [e, Object.fromEntries(Object.entries(m).map(([id, w]) => [id, w && { time: w.time, safeShare: w.safeShare, longest: w.longest, blockers: w.blockers }]))])), roofExp: Object.fromEntries(Object.entries(roofExp).map(([e, m]) => [e, Object.fromEntries(Object.entries(m).map(([g, c]) => [g, { crouched: c.crouched.share, standing: c.standing.share, maxRate: Math.max(c.crouched.maxRate, c.standing.maxRate) }]))])), fp1: { darkMin: fp1.darkMin, darkMed: fp1.darkMed, darkMax: fp1.darkMax, legal: fp1.legal.length, safeRuns: fp1.safeRuns.length }, vg, snReach, eaveDiff, sprint: { events: sprint.events, alarmAtS: sprint.alarmAtS }, timetable: Object.fromEntries(Object.entries(TT).map(([k, t]) => [k, { reached: t.reached, alarms: t.alarms, maxMeter: t.maxMeter, finishedAtS: t.finishedAtS, waitShare: t.waitShare, longestWaitS: t.longestWaitS, unsafe: t.unsafe.slice(0, 5) }])), cam: { n: camN, hits: cam.length } };
fs.writeFileSync(path.join(here, 'map-dead-line-v2-results.json'), JSON.stringify(json, null, 1) + '\n');
// the element register table in the area design doc (rule 16.9), between its markers
const AREA = path.join(here, 'dead-line-v2-area1.md');
const esc = (t) => String(t ?? '').replace(/\|/g, '/');
const regTable = ['| Id | Element | Real-world reason | Gameplay use | Rule |', '| --- | --- | --- | --- | --- |', ...D.register.map((r) => `| ${esc(r.id)} | ${esc(r.element)} | ${esc(r.reason)} | ${esc(r.use)} | ${esc(r.rule)} |`)].join('\n');
const area = fs.readFileSync(AREA, 'utf8');
const a0 = area.indexOf('<!-- register:start -->'), a1 = area.indexOf('<!-- register:end -->');
if (a0 >= 0 && a1 > a0) fs.writeFileSync(AREA, area.slice(0, a0) + '<!-- register:start -->\n' + regTable + '\n' + area.slice(a1));
for (const [c, r, n] of rows) console.log(r.padEnd(5), c, '-', n);
