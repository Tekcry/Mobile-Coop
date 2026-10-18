// Dead Line map: timed routes, the context (world + guards + light cache) and the perception model for the bots and the checks.
import { loadWorld, guardTimeline, guardAt, hyp, PERCEPTION, MUFFLE, fieldFactor, sightRate } from './map-dead-line-core.mjs';
import { stepMeter as engineStepMeter, seenAt, instantDetect, noiseSuspicion } from './map-dead-line-engine.mjs';
export { noiseSuspicion };

// ---------------------------------------------------------------------------------------------------------------------
// routes: key points -> timed segments. Pace per key point m: walk (2.0) | jog (2.8 where no guard path is within 3.44 m)
// | crawl (1.8). opts.pace overrides the pace for every ground leg (the bots: 'crawl' or 'sprint'). A key point's chapter
// applies to the segments after it (and after its hold).
export const SPEED = { walk: 2.0, jog: 2.8, crawl: 1.8, sprint: 5.0 };
const JOG_NOISE = 3.44;
const nearGuard = (guardPts, lv, x, z) => { for (const g of guardPts?.[lv] || []) if (hyp(g[0] - x, g[1] - z) < JOG_NOISE) return true; return false; };
export function buildRoute(W, route, opts = {}) {
  const segs = [];
  let t = 0;
  let chapter = route.pts[0].chapter ?? 1;
  const push = (s) => { segs.push(s); t = s.t1; };
  for (let k = 0; k < route.pts.length; k++) {
    const p = route.pts[k];
    if (k === 0) {
      if (p.hold) push({ lv: p.lv, a: [p.x, p.z], b: [p.x, p.z], t0: t, t1: t + p.hold, speed: 0, mode: 'hold', chapter, label: p.label, hold: true, enc: p.enc, holdNoise: p.holdNoise, event: p.event });
      continue;
    }
    const q = route.pts[k - 1];
    let legs;
    if (p.via) {
      // forced link: walk to the near end of the link, take it, walk on to the key point
      const L = W.D.links.find((l) => l.id === p.via);
      const dA = hyp(q.x - L.a[1], q.z - L.a[2]) + (q.lv === L.a[0] ? 0 : 99);
      const dB = hyp(q.x - L.b[1], q.z - L.b[2]) + (q.lv === L.b[0] ? 0 : 99);
      const [near, far] = dA <= dB ? [L.a, L.b] : [L.b, L.a];
      const n1 = W.findPath([q.lv, q.x, q.z], near, { camera: true });
      const n2 = W.findPath(far, [p.lv, p.x, p.z], { camera: true });
      if (!n1 || !n2) return { error: `no path via ${p.via} ${route.id}` };
      legs = [...W.pathToLegs(n1, true), { lv: near[0], pts: [[near[1], near[2]]], link: L }, ...W.pathToLegs(n2, true)];
    } else {
      const nodes = W.findPath([q.lv, q.x, q.z], [p.lv, p.x, p.z], { camera: true });
      if (!nodes) return { error: `no path ${route.id} ${k - 1}->${k} (${q.lv} ${q.x},${q.z} -> ${p.lv} ${p.x},${p.z})` };
      legs = W.pathToLegs(nodes, true);
    }
    for (const leg of legs) {
      if (leg.link) {
        const l = leg.link;
        const from = [leg.pts[0][0], leg.pts[0][1]];
        push({ lv: leg.lv, a: from, b: from, t0: t, t1: t + l.travel, speed: 0, mode: l.kind, link: l.id, chapter, hidden: !!l.hidden, path: l.path, linkEnd: [l.b[0], l.b[1], l.b[2]] });
        continue;
      }
      for (let i = 1; i < leg.pts.length; i++) {
        const a = leg.pts[i - 1], b = leg.pts[i];
        const d = hyp(b[0] - a[0], b[1] - a[1]);
        if (d < 1e-6) continue;
        const n = Math.max(1, Math.round(d / 1.0));
        for (let c = 0; c < n; c++) {
          const a2 = [a[0] + ((b[0] - a[0]) * c) / n, a[1] + ((b[1] - a[1]) * c) / n];
          const b2 = [a[0] + ((b[0] - a[0]) * (c + 1)) / n, a[1] + ((b[1] - a[1]) * (c + 1)) / n];
          const mid = [(a2[0] + b2[0]) / 2, (a2[1] + b2[1]) / 2];
          let mode = opts.pace || p.m || 'walk';
          if (!opts.pace && mode === 'jog' && nearGuard(opts.guardPts, leg.lv, mid[0], mid[1])) mode = 'walk';
          const spd = SPEED[mode] ?? 2.0;
          push({ lv: leg.lv, a: a2, b: b2, t0: t, t1: t + hyp(b2[0] - a2[0], b2[1] - a2[1]) / spd, speed: spd, mode, chapter });
        }
      }
    }
    if (p.hold) push({ lv: p.lv, a: [p.x, p.z], b: [p.x, p.z], t0: t, t1: t + p.hold, speed: 0, mode: 'hold', chapter, label: p.label, hold: true, enc: p.enc, holdNoise: p.holdNoise, event: p.event });
    if (p.chapter) chapter = p.chapter;
  }
  const byChapter = {};
  for (const s of segs) {
    const c = (byChapter[s.chapter] ||= { t: 0, len: 0, holds: 0, links: 0, jogM: 0 });
    const d = s.t1 - s.t0;
    c.t += d;
    if (s.hold) c.holds += d;
    else if (s.link) c.links += d;
    else { const l = hyp(s.b[0] - s.a[0], s.b[1] - s.a[1]); c.len += l; if (s.mode === 'jog') c.jogM += l; }
  }
  return { id: route.id, segs, total: t, byChapter };
}
// player position at route time tau: { lv, x, z, seg }
export function routePos(segs, tau) {
  let lo = 0, hi = segs.length - 1;
  if (tau <= 0) return { lv: segs[0].lv, x: segs[0].a[0], z: segs[0].a[1], seg: segs[0] };
  if (tau >= segs[hi].t1) { const s = segs[hi]; return { lv: s.lv, x: s.b[0], z: s.b[1], seg: s }; }
  while (lo < hi) { const m = (lo + hi) >> 1; if (segs[m].t1 <= tau) lo = m + 1; else hi = m; }
  const s = segs[lo];
  const f = s.t1 > s.t0 ? (tau - s.t0) / (s.t1 - s.t0) : 0;
  if (s.link) {
    if (s.path && s.path.length > 1) {
      const pts = s.path;
      const ls = [];
      let len = 0;
      for (let q = 1; q < pts.length; q++) { const l = hyp(pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1]); ls.push(l); len += l; }
      let target = f * len;
      for (let q = 1; q < pts.length; q++) {
        if (target <= ls[q - 1] || q === pts.length - 1) { const k = ls[q - 1] ? Math.min(1, target / ls[q - 1]) : 1; return { lv: s.lv, x: pts[q - 1][0] + (pts[q][0] - pts[q - 1][0]) * k, z: pts[q - 1][1] + (pts[q][1] - pts[q - 1][1]) * k, seg: s }; }
        target -= ls[q - 1];
      }
    }
    if (f > 0.5 && s.linkEnd) return { lv: s.linkEnd[0], x: s.linkEnd[1], z: s.linkEnd[2], seg: s };
    return { lv: s.lv, x: s.a[0], z: s.a[1], seg: s };
  }
  return { lv: s.lv, x: s.a[0] + (s.b[0] - s.a[0]) * f, z: s.a[1] + (s.b[1] - s.a[1]) * f, seg: s };
}

// ---------------------------------------------------------------------------------------------------------------------
// context: world, guard timelines, guard sample points (for jog legality), routes, a light cache
export function makeCtx(D, opts = {}) {
  const W = loadWorld(D);
  const TL = {};
  const guardPts = { B: [], G: [], U: [], R: [], T: [] };
  const active = D.guards.filter((g) => !g.reinforcement && g.wps.length && !(opts.drop && opts.drop.includes(g.id)));
  for (const g of active) {
    TL[g.id] = guardTimeline(W, g);
    const per = TL[g.id].period;
    for (let t = 0; t < per; t += 0.5) { const p = guardAt(g, TL[g.id], t); guardPts[g.level].push([p.x, p.z]); }
  }
  const routes = {};
  for (const r of D.routes) routes[r.id] = buildRoute(W, r, { guardPts });
  const ctx = { D, W, TL, guardPts, routes, guards: active, lightCache: new Map(), state: { off: new Set(), shot: new Set() } };
  // guard activation by chapter (Michael, D1 revision): a guard is active while its chapter list meets the current or the next
  // chapter of the furthest-behind or the furthest-ahead player. One player: chapters c and c + 1.
  ctx.activeSet = (chs) => { const want = new Set(); for (const c of chs) { want.add(c); want.add(c + 1); } return new Set(active.filter((g) => (g.ch || []).some((c) => want.has(c))).map((g) => g.id)); };
  ctx.isActive = (g, ch) => (g.ch || []).some((c) => c === ch || c === ch + 1);
  ctx.light = (lv, x, z) => {
    const k = `${lv}|${Math.round(x * 2)}|${Math.round(z * 2)}`;
    let v = ctx.lightCache.get(k);
    if (v === undefined) { v = W.lightAt(lv, Math.round(x * 2) / 2, Math.round(z * 2) / 2, 1.0, ctx.state); ctx.lightCache.set(k, v); }
    return v;
  };
  return ctx;
}

// ---------------------------------------------------------------------------------------------------------------------
// perception model: one tick of one guard against one player. pl: { lv, x, z, crouched, speed }
const wrapA = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
export const guardPosAt = (ctx, g, T) => guardAt(g, ctx.TL[g.id], T + (g.phase || 0));
export function sightOf(ctx, g, gp, pl, light) {
  const W = ctx.W;
  const dx = pl.x - gp.x, dz = pl.z - gp.z;
  const eyeH = g.eyeH ?? 1.6;
  const dyv = W.Y[pl.lv] + (pl.crouched ? 1.05 : 1.6) - (W.Y[g.level] + eyeH);
  const dist = Math.sqrt(dx * dx + dz * dz + dyv * dyv);
  if (dist > PERCEPTION.focusRange) return { rate: 0, dist, seen: false, exposure: 0 };
  const yaw = Math.atan2(gp.face[0], gp.face[1]);
  const ang = wrapA(Math.atan2(dx, dz) - yaw);
  const [, range] = fieldFactor(ang);
  if (dist >= Math.max(range, PERCEPTION.closeRange)) return { rate: 0, dist, seen: false, exposure: 0, angle: ang };
  const eye = { l: g.level, x: gp.x, z: gp.z, h: eyeH };
  let hits = 0;
  if (W.los(eye, { l: pl.lv, x: pl.x, z: pl.z, h: pl.crouched ? 1.05 : 1.6 })) hits++;
  if (W.los(eye, { l: pl.lv, x: pl.x, z: pl.z, h: pl.crouched ? 0.6 : 1.0 })) hits++;
  if (W.los(eye, { l: pl.lv, x: pl.x, z: pl.z, h: 0.3 })) hits++;
  const exposure = hits / 3;
  if (!exposure) return { rate: 0, dist, seen: false, exposure: 0, angle: ang };
  // ctx.sightRateFn: a proposed perception rule measured by the design scripts (default: the engine's)
  const rate = (ctx.sightRateFn ?? sightRate)({ dist, angle: ang, light, crouched: pl.crouched, speed: pl.speed, exposure, sensitivity: 1 });
  const instant = instantDetect({ dist, angle: ang, light, crouched: pl.crouched, speed: pl.speed, exposure, sensitivity: 1 });
  return { rate, dist, seen: seenAt(rate), exposure, angle: ang, instant };
}
// awareness meter step: the engine's stepMeter (ai/perception.ts), with sinceSeen kept as Enemy does (seenAt resets it)
export function stepMeter(m, rate, dt) {
  const since = seenAt(rate) ? 0 : m.since + dt;
  return { m: engineStepMeter(m.m, rate, dt, since), since };
}
// does a noise of radius r (m) from the player reach the guard? a wall between (or another floor) muffles it to 0.45
export function hears(ctx, g, gp, pl, radius) {
  if (radius <= 0) return { heard: false, d: 99, s: 0 };
  // a guard in a closed vehicle (windows up, heater on) hears less: g.hearMul
  if (g.hearMul) radius *= g.hearMul;
  const W = ctx.W;
  // a vent (D.acoustic, Dead Line v2): noise made in the zone under it comes out at its grating, unmuffled
  const v = ctx.D.acoustic?.find((a) => a.level === pl.lv && pl.x >= a.rect[0] && pl.x <= a.rect[2] && pl.z >= a.rect[1] && pl.z <= a.rect[3]);
  if (v) {
    const [elv, ex, ez] = v.emit;
    const d = Math.sqrt((ex - gp.x) ** 2 + (ez - gp.z) ** 2 + (W.Y[elv] - W.Y[g.level]) ** 2);
    if (d > radius) return { heard: false, d, s: 0, vent: v.id };
    const clear = elv === g.level && W.los({ l: elv, x: ex, z: ez, h: 0.2 }, { l: g.level, x: gp.x, z: gp.z, h: 1.6 });
    const r = clear ? radius : radius * MUFFLE;
    return { heard: d <= r, d, muffled: !clear, s: d <= r ? noiseSuspicion(hyp(ex - gp.x, ez - gp.z), r) : 0, vent: v.id };
  }
  const d = Math.sqrt((pl.x - gp.x) ** 2 + (pl.z - gp.z) ** 2 + (W.Y[pl.lv] - W.Y[g.level]) ** 2);
  if (d > radius) return { heard: false, d, s: 0 };
  const clear = pl.lv === g.level && W.los({ l: pl.lv, x: pl.x, z: pl.z, h: 1.6 }, { l: g.level, x: gp.x, z: gp.z, h: 1.6 });
  const r = clear ? radius : radius * MUFFLE;
  const d2 = hyp(pl.x - gp.x, pl.z - gp.z);
  // Enemy.hear: the meter rises to noiseSuspicion(2D distance, the reach after muffling)
  return { heard: d <= r, d, muffled: !clear, s: d <= r ? noiseSuspicion(d2, r) : 0 };
}
