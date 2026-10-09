// Dead Line: the checks (light, sightlines, windows, cover, doors, anti-sprint, co-op). Pure functions over a context from map-dead-line-sim.mjs.
import { hyp, LIGHT, PERCEPTION, noiseRadius, MUFFLE, f1 } from './map-dead-line-core.mjs';
import { buildRoute, routePos, guardPosAt, sightOf, stepMeter, hears } from './map-dead-line-sim.mjs';

export const FLOORMUL = { concrete: 1, metal: 1.6, grate: 1.4, wood: 1.15, gravel: 1.3, carpet: 0.6 };
export const floorMul = (ctx, lv, x, z) => FLOORMUL[ctx.W.spaceAt(lv, x, z)?.floor || 'concrete'] ?? 1;
const rectDist = (r, x, z) => hyp(Math.max(r[0] - x, 0, x - r[2]), Math.max(r[1] - z, 0, z - r[3]));
const rr = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

// samples along a route every `step` metres (not links): { s, t, lv, x, z, chapter, mode }
export function routeSamples(ctx, routeId, step = 0.5) {
  const rt = ctx.routes[routeId];
  const out = [];
  let s = 0, carry = 0;
  for (const seg of rt.segs) {
    if (seg.link || seg.hold) continue;
    const len = hyp(seg.b[0] - seg.a[0], seg.b[1] - seg.a[1]);
    let d = carry;
    while (d <= len + 1e-9) {
      const f = len ? d / len : 0;
      out.push({ s: s + d, t: seg.t0 + (seg.t1 - seg.t0) * f, lv: seg.lv, x: seg.a[0] + (seg.b[0] - seg.a[0]) * f, z: seg.a[1] + (seg.b[1] - seg.a[1]) * f, chapter: seg.chapter, mode: seg.mode });
      d += step;
    }
    carry = d - len;
    s += len;
  }
  return out;
}
// ground state: guards that can see a standing player at the point at some moment of their cycle (geometry and cone only)
export function sightedBy(ctx, pt, crouched = false) {
  const ids = [];
  const pl = { lv: pt.lv, x: pt.x, z: pt.z, crouched, speed: 1.4 };
  for (const g of ctx.guards) {
    const per = ctx.TL[g.id].period;
    for (let t = 0; t < per; t += 1.0) {
      const gp = guardPosAt(ctx, g, t - (g.phase || 0));
      if (hyp(gp.x - pt.x, gp.z - pt.z) > 25.5) continue;
      const sg = sightOf(ctx, g, gp, pl, 1.0);
      if (sg.exposure > 0 && sg.rate > 0) { ids.push(g.id); break; }
    }
  }
  return ids;
}
export function withState(ctx, off, shot, fn) {
  const saved = ctx.state, savedCache = ctx.lightCache;
  ctx.state = { off: new Set(off), shot: new Set(shot) };
  ctx.lightCache = new Map();
  try { return fn(); } finally { ctx.state = saved; ctx.lightCache = savedCache; }
}
export function lightShares(ctx, routeId, off = [], shot = []) {
  return withState(ctx, off, shot, () => {
    const sm = routeSamples(ctx, routeId, 0.5);
    for (const p of sm) { p.light = ctx.light(p.lv, p.x, p.z); p.lit = p.light >= LIGHT.shadow; p.bright = p.light >= LIGHT.lit; }
    const by = {};
    for (const p of sm) { const c = (by[p.chapter] ||= { n: 0, lit: 0, bright: 0 }); c.n++; if (p.lit) c.lit++; if (p.bright) c.bright++; }
    return { samples: sm, by };
  });
}

// ---- cover: hide spots and dark pockets along a route
export function coverFlags(ctx, samples) {
  const hides = ctx.D.hides;
  const W = ctx.W;
  const darkAt = (lv, x, z) => ctx.light(lv, x, z) < LIGHT.shadow;
  const pocket = (lv, x, z) => {
    const [i, j] = W.grid.cellOf(x, z);
    if (!W.grid.walk(lv, i, j)) return false;
    return darkAt(lv, x, z) && darkAt(lv, x + 0.6, z) && darkAt(lv, x - 0.6, z) && darkAt(lv, x, z + 0.6) && darkAt(lv, x, z - 0.6);
  };
  for (const p of samples) {
    p.hide = null;
    for (const h of hides) if (h.level === p.lv && rectDist(h.rect, p.x, p.z) <= 3.0) { p.hide = h.id; break; }
    p.dark = p.light < LIGHT.shadow && pocket(p.lv, p.x, p.z);
    // a dark pocket (a dark cell with a dark 1.2 m neighbourhood) within 3 m of the route also counts: a step off the route
    p.darkNear = false;
    if (!p.dark && !p.hide) {
      for (const r of [1.5, 3.0]) { for (let k = 0; k < 12 && !p.darkNear; k++) { const a = (k / 12) * 2 * Math.PI; if (pocket(p.lv, p.x + Math.cos(a) * r, p.z + Math.sin(a) * r)) p.darkNear = true; } if (p.darkNear) break; }
    }
    p.cover = !!p.hide || p.dark || p.darkNear;
  }
}
// longest distance to the next cover, longest uncovered straight, longest dark run
export function coverStats(samples, step = 0.5) {
  let gapMax = 0, gapAt = null, run = 0, startI = 0;
  let lastCover = -1;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i].cover) { const gap = (i - lastCover) * step; if (lastCover >= 0 && gap > gapMax) { gapMax = gap; gapAt = [samples[lastCover], samples[i]]; } lastCover = i; }
  }
  // dark runs
  let darkMax = 0, darkAt = null, dr = 0, ds = 0;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i].light < LIGHT.shadow) { if (!dr) ds = i; dr++; if (dr * step > darkMax) { darkMax = dr * step; darkAt = samples[ds]; } } else dr = 0;
  }
  // straight runs (direction change over 25 degrees breaks) without cover
  let straightMax = 0, straightAt = null;
  let sStart = 0, dir = null;
  const dirOf = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    if (a.lv !== b.lv) { sStart = i; dir = null; continue; }
    const d = dirOf(a, b);
    if (dir === null) dir = d;
    let dd = Math.abs(d - dir); if (dd > Math.PI) dd = 2 * Math.PI - dd;
    if (dd > 0.45 || samples[i].cover) { sStart = i; dir = d; continue; }
    const len = (i - sStart) * step;
    if (len > straightMax) { straightMax = len; straightAt = samples[sStart]; }
  }
  return { gapMax, gapAt, darkMax, darkAt, straightMax, straightAt };
}

// ---- hops: stretches between two cover samples that are longer than 6 m (the exposed stretches). Windows per 40 s cycle.
export function findHops(samples, minLen = 6, step = 0.5) {
  const hops = [];
  let last = -1;
  for (let i = 0; i < samples.length; i++) {
    if (!samples[i].cover) continue;
    if (last >= 0 && samples[i].lv === samples[last].lv && (i - last) * step > minLen) hops.push({ i0: last, i1: i, a: samples[last], b: samples[i], len: (i - last) * step, chapter: samples[last].chapter });
    last = i;
  }
  return hops;
}
// walk the hop at `speed` (stand) starting at cycle time t0; peak awareness meter and who raised it
export function simHop(ctx, samples, hop, t0, speed = 2.0, crouched = false) {
  let m = ctx.guards.map(() => ({ m: 0, since: 0 }));
  const dt = 0.25;
  const per = (hop.i1 - hop.i0) * 0.5;
  const n = Math.ceil(per / speed / dt);
  let peak = 0, peakG = null;
  const by = {};
  for (let k = 0; k <= n; k++) {
    const f = Math.min(1, (k * dt * speed) / per);
    const i = Math.min(hop.i1, hop.i0 + Math.round(f * (hop.i1 - hop.i0)));
    const p = samples[i];
    const pl = { lv: p.lv, x: p.x, z: p.z, crouched, speed };
    const light = ctx.light(p.lv, p.x, p.z);
    for (let g = 0; g < ctx.guards.length; g++) {
      const G = ctx.guards[g];
      const gp = guardPosAt(ctx, G, t0 + k * dt);
      if (hyp(gp.x - p.x, gp.z - p.z) > 26 && p.lv === G.level) continue;
      const sg = sightOf(ctx, G, gp, pl, light);
      m[g] = stepMeter(m[g], sg.rate, dt);
      if (sg.instant) m[g] = { m: 1, since: 0 };
      if (m[g].m > (by[G.id] || 0)) by[G.id] = m[g].m;
      if (m[g].m > peak) { peak = m[g].m; peakG = G.id; }
    }
  }
  return { peak, peakG, by };
}
// windows: start times (0.5 s steps over the 40 s cycle) with peak < 0.3; returns longest cyclic run of safe starts in seconds, number of runs, and the guards that make the other starts unsafe
export function hopWindows(ctx, samples, hop, speed = 2.0, crouched = false) {
  const N = 80;
  const ok = [];
  const blockers = {};
  for (let k = 0; k < N; k++) {
    const r = simHop(ctx, samples, hop, k * 0.5, speed, crouched);
    const safe = r.peak < PERCEPTION.suspicious;
    ok.push(safe);
    if (!safe) for (const [g, v] of Object.entries(r.by)) if (v >= PERCEPTION.suspicious) blockers[g] = (blockers[g] || 0) + 1;
  }
  // cyclic runs
  const safeN = ok.filter(Boolean).length;
  if (safeN === N) return { longest: 40, runs: 1, safeShare: 1, blockers, all: true };
  if (safeN === 0) return { longest: 0, runs: 0, safeShare: 0, blockers, all: false };
  let start = ok.findIndex((v, i) => !v && ok[(i + 1) % N]); // a position where an unsafe is followed by safe
  let runs = 0, longest = 0, cur = 0;
  for (let k = 1; k <= N; k++) {
    const i = (start + k) % N;
    if (ok[i]) cur++; else { if (cur) { runs++; longest = Math.max(longest, cur); } cur = 0; }
  }
  if (cur) { runs++; longest = Math.max(longest, cur); }
  return { longest: longest * 0.5, runs, safeShare: safeN / N, blockers, all: false };
}
