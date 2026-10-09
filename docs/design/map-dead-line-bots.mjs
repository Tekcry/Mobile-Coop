// Dead Line: the two test bots, run against the plan (map-dead-line.json) with the engine's perception model.
//   sprint bot    : runs the main route M at sprint gear (5.0 m/s, noise 9 m) and never waits. It must be spotted or heard at
//                   least six times and trigger an alarm (a guard meter reaching 1) before Chapter 4.
//   timetable bot : follows the learned timings at the slow silent gear (crouch gear 4, 1.8 m/s, noise 0). It plans with perfect knowledge
//                   of the guard clock: it looks 15 s ahead and waits (only where waiting is itself safe) until the next stretch
//                   raises no guard's awareness meter above the suspicious threshold 0.3. It must reach the exit with zero alarms.
// Run: node docs/design/map-dead-line-bots.mjs [--json] [--drop=G13,G14]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hyp, noiseRadius, PERCEPTION } from './map-dead-line-core.mjs';
import { makeCtx, buildRoute, routePos, guardPosAt, sightOf, stepMeter, hears } from './map-dead-line-sim.mjs';
import { coverFlags } from './map-dead-line-checks.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
import { SURFACE_NOISE as FLOORMUL, HOLD_NOISE_RADIUS, landingKind, landingNoise } from './map-dead-line-engine.mjs';
const floorMul = (ctx, lv, x, z) => FLOORMUL[ctx.W.spaceAt(lv, x, z)?.floor || 'concrete'] ?? 1;

function playerState(ctx, segs, tau, mode, pace) {
  const p = routePos(segs, tau);
  const s = p.seg;
  let speed = s.speed || 0;
  let hidden = false;
  if (s.link) { speed = s.mode === 'ladder' ? 1.0 : s.mode === 'stairs-open' || s.mode === 'stairs-fire' ? 1.6 : s.speed || 1.8; hidden = !!s.hidden; }
  if (s.hold) speed = 0;
  const crouched = pace === 'crawl' || s.mode === 'crawl' || s.mode === 'ledge' || s.mode === 'beam';
  const sprinting = pace === 'sprint' && !s.link && !s.hold;
  return { lv: p.lv, x: p.x, z: p.z, speed, crouched, sprinting, hidden, seg: s };
}

// noise radius the player makes at route time tau: footsteps (noiseRadius x surface), a hold (HOLD_NOISE_RADIUS), a landing at the
// end of a drop link (landingNoise of its band). All from the engine.
function noiseOf(ctx, pl, tau) {
  const s = pl.seg;
  if (s.hold) return HOLD_NOISE_RADIUS;
  if (s.link && s.mode === 'drop' && tau >= s.t1 - 0.5) { const L = ctx.D.links.find((l) => l.id === s.link); const fall = Math.abs(ctx.W.Y[L.a[0]] - ctx.W.Y[L.b[0]]); return landingNoise(landingKind(fall)); }
  if (s.link) return 0;
  return noiseRadius(pl.speed, pl.crouched, pl.sprinting) * floorMul(ctx, pl.lv, pl.x, pl.z);
}

// ------------------------------------------------------------------------------------------------ sprint bot
export function sprintBot(ctx) {
  const D = ctx.D;
  const route = D.routes.find((r) => r.id === 'M');
  const rt = buildRoute(ctx.W, route, { pace: 'sprint' });
  const dt = 0.25;
  const meters = Object.fromEntries(ctx.guards.map((g) => [g.id, { m: 0, since: 0 }]));
  const spotted = []; // meter reached 1 (a guard is alerted)
  const suspicious = [];
  const heard = [];
  const lastHeard = {};
  const lastSpot = {};
  let alarmT = null, alarmCh = null;
  const ch4 = rt.segs.find((s) => s.chapter >= 4)?.t0 ?? Infinity;
  for (let T = 0; T <= rt.total + 0.001; T += dt) {
    const pl = playerState(ctx, rt.segs, T, 'sprint', 'sprint');
    if (pl.hidden) continue;
    const light = ctx.light(pl.lv, pl.x, pl.z);
    const radius = noiseOf(ctx, pl, T);
    for (const g of ctx.guards) {
      if (!ctx.isActive(g, pl.seg.chapter)) continue;
      const gp = guardPosAt(ctx, g, T);
      const sg = sightOf(ctx, g, gp, pl, light);
      const prev = meters[g.id];
      let m = stepMeter(prev, sg.rate, dt);
      if (sg.instant) m = { m: 1, since: 0 };
      if (prev.m < PERCEPTION.suspicious && m.m >= PERCEPTION.suspicious) suspicious.push({ g: g.id, t: +T.toFixed(2), ch: pl.seg.chapter, at: [pl.lv, +pl.x.toFixed(1), +pl.z.toFixed(1)] });
      if (prev.m < 1 && m.m >= 1) {
        if (T - (lastSpot[g.id] ?? -99) > 10) spotted.push({ g: g.id, t: +T.toFixed(2), ch: pl.seg.chapter, at: [pl.lv, +pl.x.toFixed(1), +pl.z.toFixed(1)] });
        lastSpot[g.id] = T;
        if (alarmT === null) { alarmT = T; alarmCh = pl.seg.chapter; }
      }
      const h = hears(ctx, g, gp, pl, radius);
      if (h.s > m.m) m = { m: h.s, since: m.since };
      meters[g.id] = m;
      if (h.heard && T - (lastHeard[g.id] ?? -99) > 5) { heard.push({ g: g.id, t: +T.toFixed(2), ch: pl.seg.chapter, d: +h.d.toFixed(1), muffled: !!h.muffled, radius: +radius.toFixed(1) }); lastHeard[g.id] = T; }
    }
  }
  const events = spotted.length + heard.length;
  const eventsBeforeCh4 = [...spotted, ...heard].filter((e) => e.t < ch4).length;
  return {
    name: 'sprint bot', routeS: +rt.total.toFixed(1), chapter4StartS: +ch4.toFixed(1),
    spotted, heard, suspiciousCount: suspicious.length, events, eventsBeforeCh4,
    alarmAtS: alarmT === null ? null : +alarmT.toFixed(1), alarmChapter: alarmCh,
    pass: events >= 6 && alarmT !== null && alarmT < ch4,
    byChapter: Object.fromEntries(Object.keys(rt.byChapter).map((c) => [c, { spotted: spotted.filter((e) => e.ch == c).length, heard: heard.filter((e) => e.ch == c).length }]))
  };
}

// ------------------------------------------------------------------------------------------------ timetable bot
// Plans stop to stop. Stops are cover samples (a hide spot within 3 m, or a dark pocket) along the route walked at the silent crawl gear.
// From a stop it takes the next stop at least 6 m ahead and waits (in cover, only if waiting is itself safe) for the first start time at
// which walking that hop raises no guard meter above the suspicious threshold 0.3. It knows the guard clock (that is what "learned" means).
export function timetableBot(ctx, opts = {}) {
  const D = ctx.D;
  const dt = 0.25;
  const route = D.routes.find((r) => r.id === (opts.route || 'M'));
  const rt = buildRoute(ctx.W, route, { pace: 'crawl' });
  const segs = rt.segs;
  const total = rt.total;
  const SUSP = PERCEPTION.suspicious;
  const MINHOP = opts.minHop ?? 6;
  // cover samples on the crawl route (every 0.5 m of path)
  const samples = [];
  {
    let s = 0, carry = 0;
    for (const seg of segs) {
      if (seg.link || seg.hold) continue;
      const len = hyp(seg.b[0] - seg.a[0], seg.b[1] - seg.a[1]);
      let d = carry;
      while (d <= len + 1e-9) { const f = len ? d / len : 0; samples.push({ s: s + d, t: seg.t0 + (seg.t1 - seg.t0) * f, lv: seg.lv, x: seg.a[0] + (seg.b[0] - seg.a[0]) * f, z: seg.a[1] + (seg.b[1] - seg.a[1]) * f, chapter: seg.chapter }); d += 0.5; }
      carry = d - len; s += len;
    }
  }
  for (const p of samples) p.light = ctx.light(p.lv, p.x, p.z);
  coverFlags(ctx, samples);
  // simulate: stand still for wait s, then move from route time tau0 to tau1; returns peak meter, who, end meters
  const TAIL = opts.tail ?? 6;
  const sim = (T0, tau0, tau1, m0, wait, tail = 0) => {
    let m = m0.map((x) => ({ ...x }));
    let peak = 0, peakG = null;
    let T = T0;
    const dur = tau1 - tau0;
    const nMove = Math.ceil(dur / dt);
    const nSteps = Math.ceil(wait / dt) + nMove + Math.ceil(tail / dt);
    for (let k = 0; k < nSteps; k++) {
      const waiting = k * dt < wait - 1e-9;
      const km = k - Math.ceil(wait / dt);
      const tau = waiting ? tau0 : Math.min(tau1, tau0 + (km + 1) * dt);
      const pl = playerState(ctx, segs, tau, 'crawl', 'crawl');
      if (waiting || km >= nMove) pl.speed = 0;
      if (!pl.hidden) {
        const light = ctx.light(pl.lv, pl.x, pl.z);
        const radius = waiting ? 0 : noiseOf(ctx, pl, tau);
        for (let g = 0; g < ctx.guards.length; g++) {
          const G = ctx.guards[g];
          if (!ctx.isActive(G, pl.seg.chapter)) { m[g] = stepMeter(m[g], 0, dt); continue; }
          const gp = guardPosAt(ctx, G, T);
          const sg = sightOf(ctx, G, gp, pl, light);
          m[g] = stepMeter(m[g], sg.rate, dt);
          if (sg.instant) m[g] = { m: 1, since: 0 };
          const h = hears(ctx, G, gp, pl, radius);
          if (h.s > m[g].m) m[g] = { m: h.s, since: m[g].since };
          if (m[g].m > peak) { peak = m[g].m; peakG = G.id; }
        }
      } else m = m.map((x) => stepMeter(x, 0, dt));
      T += dt;
    }
    return { peak, peakG, m, T };
  };
  let T = 0;
  let meters = ctx.guards.map(() => ({ m: 0, since: 0 }));
  let idx = 0;
  // the first stop is the start itself (the spawn pocket)
  const waits = [];
  const unsafe = [];
  let maxMeter = 0;
  const suspiciousEvents = [];
  const hopLog = [];
  const chapterTimes = {};
  while (idx < samples.length - 1) {
    // candidate stops: cover samples at least MINHOP ahead (nearest first, up to 6 of them within 30 m, then the end)
    const cands = [];
    for (let q = idx + 1; q < samples.length; q++) {
      if (samples[q].s - samples[idx].s > 30 && cands.length) break;
      if (q === samples.length - 1 || (samples[q].cover && samples[q].s - samples[idx].s >= MINHOP)) cands.push(q);
      if (cands.length >= 6) break;
    }
    let chosen = null, j = null;
    for (const q of cands) {
      const tau0 = samples[idx].t;
      const tau1 = q === samples.length - 1 ? total : samples[q].t;
      for (let w = 0; w <= 45; w += 0.5) {
        const r = sim(T, tau0, tau1, meters, w, q === samples.length - 1 ? 0 : TAIL);
        if (r.peak < SUSP) { chosen = { w, r, tau0, tau1 }; break; }
      }
      if (chosen) { j = q; break; }
    }
    if (!chosen) {
      j = cands[0];
      const tau0 = samples[idx].t, tau1 = j === samples.length - 1 ? total : samples[j].t;
      let best = null;
      for (let w = 0; w <= 40; w += 0.5) { const r = sim(T, tau0, tau1, meters, w, 0); if (!best || r.peak < best.r.peak) best = { w, r, tau0, tau1 }; }
      chosen = best;
      unsafe.push({ t: +T.toFixed(1), at: [samples[idx].lv, +samples[idx].x.toFixed(1), +samples[idx].z.toFixed(1)], to: [samples[j].lv, +samples[j].x.toFixed(1), +samples[j].z.toFixed(1)], peak: +best.r.peak.toFixed(2), g: best.r.peakG, ch: samples[idx].chapter });
    }
    const tau0 = chosen.tau0, tau1 = chosen.tau1;
    if (chosen.w > 0) waits.push({ startT: +T.toFixed(1), at: [samples[idx].lv, +samples[idx].x.toFixed(1), +samples[idx].z.toFixed(1)], s: chosen.w, ch: samples[idx].chapter });
    if (chosen.r.peak > maxMeter) maxMeter = chosen.r.peak;
    if (chosen.r.peak >= SUSP) suspiciousEvents.push({ t: +T.toFixed(1), g: chosen.r.peakG, peak: +chosen.r.peak.toFixed(2), at: [samples[idx].lv, +samples[idx].x.toFixed(1), +samples[idx].z.toFixed(1)], ch: samples[idx].chapter });
    chapterTimes[samples[idx].chapter] = (chapterTimes[samples[idx].chapter] || 0) + chosen.w + (tau1 - tau0);
    hopLog.push({ from: samples[idx].s, to: samples[j].s, wait: chosen.w });
    meters = chosen.r.m; T = chosen.r.T - (j === samples.length - 1 ? 0 : TAIL); idx = j;
  }
  const waitedTotal = waits.reduce((a, w) => a + w.s, 0);
  const waitByCh = {};
  for (const w of waits) waitByCh[w.ch] = (waitByCh[w.ch] || 0) + w.s;
  const longest = waits.reduce((a, w) => Math.max(a, w.s), 0);
  const res = {
    name: 'timetable bot', route: route.id, routeCrawlS: +total.toFixed(1), finishedAtS: +T.toFixed(1), finishedMin: +(T / 60).toFixed(2),
    waitedS: +waitedTotal.toFixed(1), waitShare: +(waitedTotal / T).toFixed(3), longestWaitS: +longest.toFixed(1), waits,
    waitByChapter: waitByCh, chapterTimesS: Object.fromEntries(Object.entries(chapterTimes).map(([c, v]) => [c, +v.toFixed(1)])),
    reached: idx >= samples.length - 1, maxMeter: +maxMeter.toFixed(3), suspiciousEvents, unsafeMoments: unsafe.length, unsafe, hops: hopLog.length, alarms: suspiciousEvents.filter((e) => e.peak >= 1).length
  };
  res.passParts = { reached: res.reached, noAlarm: res.alarms === 0, belowSuspicious: res.maxMeter < SUSP, waitShareOk: res.waitShare >= 0.3 && res.waitShare <= 0.4, longestWaitOk: res.longestWaitS <= 40, timeAbout12: res.finishedMin >= 11.5 && res.finishedMin <= 12.5 };
  res.pass = Object.values(res.passParts).every(Boolean);
  return res;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const D = JSON.parse(fs.readFileSync(path.join(here, 'map-dead-line.json'), 'utf8'));
  const drop = process.argv.find((a) => a.startsWith('--drop='))?.slice(7).split(',') ?? [];
  const ctx = makeCtx(D, { drop });
  const t0 = Date.now();
  const sp = sprintBot(ctx);
  console.log('SPRINT BOT', sp.pass ? 'PASS (fails the run, as required)' : 'FAIL', 'route', sp.routeS, 's; spotted', sp.spotted.length, 'heard', sp.heard.length, 'events', sp.events, 'before Ch4', sp.eventsBeforeCh4, 'alarm at', sp.alarmAtS, 's (ch' + sp.alarmChapter + '), Ch4 starts', sp.chapter4StartS, 's');
  console.log(JSON.stringify(sp.byChapter));
  const tt = timetableBot(ctx);
  console.log('TIMETABLE BOT', tt.pass ? 'PASS' : 'FAIL', JSON.stringify(tt.passParts));
  console.log(' hops', tt.hops, 'finished', tt.finishedAtS, 's (' + tt.finishedMin + ' min), crawl route', tt.routeCrawlS, 's, waited', tt.waitedS, 's (' + (tt.waitShare * 100).toFixed(1) + '%), longest wait', tt.longestWaitS, 's, max meter', tt.maxMeter, 'unsafe moments', tt.unsafeMoments);
  console.log(' waits by chapter', JSON.stringify(tt.waitByChapter), 'suspicious events', tt.suspiciousEvents.length);
  for (const e of tt.suspiciousEvents.slice(0, 10)) console.log('  susp', JSON.stringify(e));
  for (const u of tt.unsafe.slice(0, 8)) console.log('  unsafe', JSON.stringify(u));
  console.log('ms', Date.now() - t0);
  if (process.argv.includes('--json')) fs.writeFileSync(path.join(here, 'map-dead-line-bots.json'), JSON.stringify({ sprint: sp, timetable: tt, drop }, null, 1));
}
