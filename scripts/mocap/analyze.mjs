// (mocap-trial) Take analysis: per CMU take the speed, cadence, stride, foot contacts, clean cycles, foot slide, noise /
// pops, turns, stops and starts; ranks the takes per slot and picks the best one or two with reasons.
//   node scripts/mocap/analyze.mjs            -> docs/mocap-trial/TAKES.md + build/mocap/analysis.json (the picks
//                                               and segments retarget.mjs reads)
// Numbers are measured on the performer at their own size (metres, the game frame); the Wren-scaled numbers are in
// the intermediates (retarget.mjs). Thresholds are listed in TAKES.md "Method".
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadTake, selfCheck, restPose, CACHE, ROOT, FPS } from './asfamc.mjs';
import { hSpeed, footContacts, runsOf, runSlide, headingTrack, pops, jitter } from './gait.mjs';
import { v3, q4, median, mean, pct, smooth, R2D } from './math.mjs';
import { wrenRig } from './retarget.mjs';
import { writeSection, TAKES_MD } from './takesdoc.mjs';
import { readFileSync } from 'node:fs';

/**
 * The game's stride per cycle (m, Wren) at the middle of each loop's speed band (docs/mocap-trial/CLIP-FORMAT.md:
 * walk 1.4-2.1 m/s -> 1.16-1.44 m, jog ~3.0 m/s -> 2.04 m, run 4.2-4.4 m/s -> ~2.55 m). The runtime scales the clip's
 * stride to the game's, which looks right between 0.8 and 1.25; a take whose Wren stride is near the middle wins.
 */
export const GAME_STRIDE = { walk: 1.29, jog: 2.04, run: 2.55 };

/** The candidate takes (docs/mocap-trial/SOURCES.md) with the site's description and the slots they may fill. */
export const CATALOGUE = [
  ...['16_15', '16_16', '16_21', '16_22', '16_31', '16_32'].map((t) => ({ take: t, desc: 'walk', kind: 'loop' })),
  ...['35_01', '35_02', '35_03'].map((t) => ({ take: t, desc: 'walk (second performer)', kind: 'loop' })),
  ...['16_35', '16_36', '16_45', '16_46', '16_56'].map((t) => ({ take: t, desc: 'run/jog', kind: 'loop' })),
  { take: '16_55', desc: 'run', kind: 'loop' },
  ...['35_17', '35_18', '35_19'].map((t) => ({ take: t, desc: 'run/jog (second performer)', kind: 'loop' })),
  ...['16_17', '16_18'].map((t) => ({ take: t, desc: 'walk, 90-degree left turn', kind: 'turn' })),
  ...['16_19', '16_20'].map((t) => ({ take: t, desc: 'walk, 90-degree right turn', kind: 'turn' })),
  ...['16_41', '16_42'].map((t) => ({ take: t, desc: 'run/jog, 90-degree left turn', kind: 'turn' })),
  ...['16_43', '16_44'].map((t) => ({ take: t, desc: 'run/jog, 90-degree right turn', kind: 'turn' })),
  ...['16_51', '16_52'].map((t) => ({ take: t, desc: 'run, 90-degree left turn', kind: 'turn' })),
  ...['16_53', '16_54'].map((t) => ({ take: t, desc: 'run, 90-degree right turn', kind: 'turn' })),
  ...['16_08', '16_57'].map((t) => ({ take: t, desc: 'run/jog, sudden stop', kind: 'stop' })),
  ...['16_33', '16_34'].map((t) => ({ take: t, desc: 'slow walk, stop', kind: 'stop' })),
  ...['69_13', '69_14'].map((t) => ({ take: t, desc: 'walk, turn in place (repeated)', kind: 'pivot' })),
];

/** Gait class by steady speed (m/s, performer size). */
export const gaitOf = (v) => (v < 1.9 ? 'walk' : v < 3.6 ? 'jog' : 'run');

const CORE = ['lowerback', 'upperback', 'thorax', 'lowerneck', 'upperneck', 'head', 'lclavicle', 'rclavicle', 'lhumerus', 'lradius', 'rhumerus', 'rradius', 'lfemur', 'ltibia', 'lfoot', 'rfemur', 'rtibia', 'rfoot'];
const EXTREM = ['ltoes', 'rtoes', 'lwrist', 'lhand', 'lfingers', 'lthumb', 'rwrist', 'rhand', 'rfingers', 'rthumb'];
const SEAM_JOINTS = ['lfemur', 'rfemur', 'ltibia', 'rtibia', 'lfoot', 'rfoot', 'lhumerus', 'rhumerus', 'lradius', 'rradius', 'thorax', 'head'];

const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const r3 = (x) => Math.round(x * 1000) / 1000;
const s = (f) => f / FPS;

/** Root-relative pose (pelvis horizontal origin, heading frame, height above floor) of a frame, for seam distances. */
function relPose(t, i, heading, floor) {
  const pel = t.pos.get('root')[i];
  const yaw = q4.yaw(-heading);
  return SEAM_JOINTS.map((b) => {
    const p = t.pos.get(b)[i];
    const r = q4.rotate(yaw, [p[0] - pel[0], 0, p[2] - pel[2]]);
    return [r[0], p[1] - floor, r[2]];
  });
}
const poseDist = (a, b) => Math.sqrt(mean(a.map((p, k) => v3.dist(p, b[k]) ** 2)));

/** `load` reads the take (default the CMU `loadTake`; mixamoTake.mjs `mixamoLoader()` for a Mixamo dump). */
export function analyzeTake(entry, { load = loadTake } = {}) {
  const t = load(entry.take);
  const chk = selfCheck(t);
  const floor = chk.floor;
  const n = t.frames;
  const pel = t.pos.get('root');
  const vRaw = hSpeed(pel, FPS, 6);
  const v = smooth(vRaw, 30);
  const head = headingTrack(t.quat.get('root'), 30);
  const rate = head.map((_, i) => (head[Math.min(n - 1, i + 6)] - head[Math.max(0, i - 6)]) / ((Math.min(n - 1, i + 6) - Math.max(0, i - 6)) / FPS));
  // performer size
  const rest = restPose(t.skel);
  const bl = (b) => t.skel.bones.get(b).length * t.skel.metres;
  const legLen = bl('lfemur') + bl('ltibia');
  // contacts and events
  const feet = {};
  const events = [];
  for (const f of ['l', 'r']) {
    const ankle = t.pos.get(`${f}tibia`), ball = t.pos.get(`${f}foot`);
    const c = footContacts(ankle, ball, FPS, { floor });
    const runs = runsOf(c.flags);
    const slides = runs.filter(([a, b]) => a > 0 && b < n - 1).map((r) => runSlide(r, ankle, ball, c));
    feet[f] = { c, runs, slides, ankle, ball };
    for (const [a, b] of runs) {
      if (a > 0) events.push({ foot: f, type: 'strike', frame: a });
      if (b < n - 1) events.push({ foot: f, type: 'off', frame: b + 1 });
    }
  }
  events.sort((a, b) => a.frame - b.frame);
  const strikes = events.filter((e) => e.type === 'strike');
  const ankleRef = (feet.l.c.aRef + feet.r.c.aRef) / 2;
  const stature = (rest.get('head')[1] - (rest.get('lhipjoint')[1] + rest.get('rhipjoint')[1]) / 2) + legLen + ankleRef;
  // local rotations, pops and jitter
  const localOf = (b) => {
    const p = t.skel.parent.get(b);
    const wp = t.quat.get(p), wb = t.quat.get(b);
    return wb.map((q, i) => q4.mul(q4.conj(wp[i]), q));
  };
  const popList = [];
  const popCount = { core: 0, extrem: 0 };
  const popFrames = new Set();
  for (const b of [...CORE, ...EXTREM]) {
    if (t.dead.includes(b)) continue;
    const { out } = pops(localOf(b));
    for (const p of out) {
      popList.push({ bone: b, frame: p.frame, deg: r1(p.deg) });
      if (CORE.includes(b)) { popCount.core++; popFrames.add(p.frame); } else popCount.extrem++;
    }
  }
  const { out: rootPops } = pops(t.quat.get('root'));
  for (const p of rootPops) { popList.push({ bone: 'root', frame: p.frame, deg: r1(p.deg) }); popCount.core++; popFrames.add(p.frame); }
  const jit = {
    core: r2(median(['ltibia', 'rtibia', 'lradius', 'rradius', 'head'].map((b) => jitter(t.pos.get(b))))),
    extrem: r2(median(['ltoes', 'rtoes', 'lhand', 'rhand', 'lthumb', 'rthumb'].map((b) => jitter(t.pos.get(b))))),
  };
  const zeroFrames = new Set();
  for (const [, z] of t.zeros) for (const f of z) zeroFrames.add(f);
  // cycles: same-foot strike to strike with exactly one other-foot strike in between
  const cycles = [];
  const durs = [];
  for (const f of ['l', 'r']) {
    const st = strikes.filter((e) => e.foot === f).map((e) => e.frame);
    for (let k = 0; k + 1 < st.length; k++) {
      const a = st[k], b = st[k + 1];
      const other = strikes.filter((e) => e.foot !== f && e.frame > a && e.frame < b).length;
      if (other !== 1) continue;
      durs.push(b - a);
      cycles.push({ foot: f, a, b });
    }
  }
  const medDur = median(durs);
  for (const cy of cycles) {
    const { a, b, foot } = cy;
    cy.T = r3(s(b - a));
    cy.ok = (b - a) > 0.6 * medDur && (b - a) < 1.5 * medDur;
    cy.speed = r2(v3.distXZ(pel[a], pel[b]) / s(b - a));
    const anchor = (i) => feet[foot].ball[Math.min(n - 1, i + Math.round(0.06 * FPS))];
    cy.stride = r2(v3.distXZ(anchor(a), anchor(b)));
    cy.cadence = r2(2 / s(b - a));
    cy.dHeading = r1((head[b] - head[a]) * R2D);
    let sl = 0;
    for (const ft of ['l', 'r']) for (const run of feet[ft].runs) {
      if (run[0] > 0 && run[1] < n - 1 && run[0] < b && run[1] > a) sl = Math.max(sl, runSlide(run, feet[ft].ankle, feet[ft].ball, feet[ft].c));
    }
    cy.slide = r1(sl * 100);
    cy.pops = [...popFrames].filter((f) => f >= a && f <= b).length;
    cy.zeros = [...zeroFrames].filter((f) => f >= a && f <= b).length;
    cy.seam = r1(poseDist(relPose(t, a, head[a], floor), relPose(t, b, head[b], floor)) * 100);
    cy.dHeight = r1((pel[b][1] - pel[a][1]) * 100);
  }
  const okCycles = cycles.filter((c) => c.ok);
  const speedPlateau = median(okCycles.map((c) => c.speed)) || pct(v, 0.8);
  for (const cy of okCycles) {
    cy.steady = Math.abs(cy.speed - speedPlateau) / speedPlateau < 0.12 && Math.abs(cy.dHeading) < 10;
    cy.score = r1(cy.seam + 2 * cy.slide + 5 * cy.pops + 0.5 * Math.abs(cy.dHeading) + (cy.zeros ? 20 : 0) +
      30 * Math.abs(cy.speed - speedPlateau) / speedPlateau);
  }
  const steadyCycles = okCycles.filter((c) => c.steady);
  const slidesAll = [...feet.l.slides, ...feet.r.slides].map((x) => x * 100);
  const res = {
    take: entry.take, subject: t.subject, desc: entry.desc, kind: entry.kind, frames: n, dur: r2(s(n)), bytes: t.bytes,
    dead: t.dead, zeros: Object.fromEntries([...t.zeros].map(([k, z]) => [k, z.length])), floorCm: r1(floor * 100),
    stature: r2(stature), legLen: r3(legLen), selfCheck: chk.ok,
    speedPlateau: r2(speedPlateau), gait: gaitOf(speedPlateau),
    cadence: r2(median(steadyCycles.map((c) => c.cadence)) || median(okCycles.map((c) => c.cadence))),
    stride: r2(median(steadyCycles.map((c) => c.stride)) || median(okCycles.map((c) => c.stride))),
    slideMed: r1(median(slidesAll)), slideMax: r1(Math.max(0, ...slidesAll)), contacts: slidesAll.length,
    pops: popCount, popList: popList.slice(0, 30), jitter: jit,
    strikes: strikes.map((e) => [e.foot, e.frame]), offs: events.filter((e) => e.type === 'off').map((e) => [e.foot, e.frame]),
    cycles: okCycles, nSteady: steadyCycles.length,
    vStart: r2(v[Math.min(n - 1, 18)]), vEnd: r2(v[Math.max(0, n - 19)]),
    headingTotal: r1((mean(head.slice(n - 30)) - mean(head.slice(0, 30))) * R2D),
    profile: Array.from({ length: Math.floor(n / 30) }, (_, k) => [r2(v[k * 30]), Math.round(head[k * 30] * R2D)]),
  };
  const leftStrikes = strikes.filter((e) => e.foot === 'l').map((e) => e.frame);
  const lastLBefore = (f) => leftStrikes.filter((x) => x <= f).pop() ?? 0;
  const firstLAfter = (f) => leftStrikes.find((x) => x >= f) ?? n - 1;
  // turn on the move
  if (entry.kind === 'turn') {
    let pk = 0;
    for (let i = 0; i < n; i++) if (Math.abs(rate[i]) > Math.abs(rate[pk])) pk = i;
    const thr = 0.25 * Math.abs(rate[pk]);
    let a = pk, b = pk;
    while (a > 0 && Math.abs(rate[a - 1]) > thr && Math.sign(rate[a - 1]) === Math.sign(rate[pk])) a--;
    while (b < n - 1 && Math.abs(rate[b + 1]) > thr && Math.sign(rate[b + 1]) === Math.sign(rate[pk])) b++;
    const truncated = a <= 6 || b >= n - 7;
    const win = v.slice(a, b + 1);
    res.turn = {
      angle: r1((head[Math.min(n - 1, b + 12)] - head[Math.max(0, a - 12)]) * R2D), total: res.headingTotal,
      peakRate: Math.round(rate[pk] * R2D), t0: r2(s(a)), t1: r2(s(b)), dur: r2(s(b - a)),
      vBefore: r2(mean(v.slice(0, 36))), vMin: r2(Math.min(...win)), vAfter: r2(mean(v.slice(n - 36))),
      steps: strikes.filter((e) => e.frame >= a && e.frame <= b).length,
      radius: r2(mean(win) / Math.max(1e-3, Math.abs(mean(rate.slice(a, b + 1))))), truncated,
      pops: [...popFrames].filter((f) => f >= a && f <= b).length,
    };
    const segA = lastLBefore(Math.max(0, a - Math.round(0.15 * FPS)));
    const segB = firstLAfter(Math.min(n - 1, b + Math.round(0.15 * FPS)));
    res.turn.segment = [segA, segB];
    res.turn.score = r1(0.5 * Math.abs(Math.abs(res.turn.angle) - 90) + 2 * res.slideMed + 5 * res.turn.pops +
      (truncated ? 10 : 0) + (Object.keys(res.zeros).length ? 5 : 0));
  }
  // stop
  if (entry.kind === 'stop' || res.vEnd < 0.3) {
    const v0 = mean(v.slice(0, 36));
    let a = 0;
    for (let i = 0; i < n; i++) if (v[i] >= 0.9 * v0) a = i;
    let b = a;
    while (b < n - 1 && v[b] > 0.1) b++;
    let dist = 0;
    for (let i = a + 1; i <= b; i++) dist += v3.distXZ(pel[i - 1], pel[i]);
    res.stop = {
      v0: r2(v0), t0: r2(s(a)), t1: r2(s(b)), time: r2(s(b - a)), dist: r2(dist), reached: v[b] <= 0.1,
      vFinal: r2(v[n - 1]), steps: strikes.filter((e) => e.frame > a && e.frame <= b).length,
      decel: r2(v0 / Math.max(1e-3, s(b - a))), tail: r2(s(n - 1 - b)),
    };
    const segA = lastLBefore(Math.max(0, a - Math.round(0.1 * FPS)));
    res.stop.segment = [segA, Math.min(n - 1, b + Math.round(0.4 * FPS))];
    res.stop.score = r1((res.stop.reached ? 0 : 15) + 2 * res.slideMed + 5 * [...popFrames].filter((f) => f >= a).length +
      (res.stop.tail < 0.3 ? 5 : 0) + (Object.keys(res.zeros).length ? 5 : 0));
  }
  // start from standing (or an acceleration from a walk)
  if (res.vStart < 0.25 || (entry.kind === 'loop' && res.vEnd > 1.8 * res.vStart && res.vStart < 1.6)) {
    const top = pct(v, 0.9);
    let a = 0;
    if (res.vStart < 0.25) { while (a < n - 1 && v[a] < 0.1) a++; }
    let b = a;
    while (b < n - 1 && v[b] < 0.9 * top) b++;
    let dist = 0;
    for (let i = a + 1; i <= b; i++) dist += v3.distXZ(pel[i - 1], pel[i]);
    res.start = {
      fromRest: res.vStart < 0.25, v0: r2(v[a]), vTop: r2(top), t0: r2(s(a)), t1: r2(s(b)), time: r2(s(b - a)), dist: r2(dist),
      steps: strikes.filter((e) => e.frame >= a && e.frame <= b).length, reachedTop: b < n - 1,
      firstFoot: strikes.find((e) => e.frame >= a)?.foot ?? '-',
    };
    res.start.segment = [Math.max(0, a - Math.round(0.3 * FPS)), firstLAfter(b)];
    res.start.score = r1((res.start.fromRest ? 0 : 10) + (res.start.reachedTop ? 0 : 8) + 2 * res.slideMed +
      5 * [...popFrames].filter((f) => f <= b).length + (Object.keys(res.zeros).length ? 5 : 0));
  }
  // pivots: sharp heading changes at low speed (the 69_* takes)
  if (entry.kind === 'pivot') {
    const piv = [];
    let i = 0;
    while (i < n) {
      if (Math.abs(rate[i]) > 80 / R2D) {
        let a = i, b = i;
        const sg = Math.sign(rate[i]);
        while (a > 0 && Math.sign(rate[a - 1]) === sg && Math.abs(rate[a - 1]) > 40 / R2D) a--;
        while (b < n - 1 && Math.sign(rate[b + 1]) === sg && Math.abs(rate[b + 1]) > 40 / R2D) b++;
        const win = v.slice(a, b + 1);
        const angle = (head[b] - head[a]) * R2D;
        if (Math.abs(angle) > 60 && a > 12 && b < n - 13) {
          const popsIn = [...popFrames].filter((f) => f >= a && f <= b).length;
          const zIn = [...zeroFrames].filter((f) => f >= a - 60 && f <= b + 60).length;
          let sl = 0;
          for (const ft of ['l', 'r']) for (const run of feet[ft].runs) {
            // a pivoting foot turns about its ball: only the ball counts as slide
            if (run[0] > 0 && run[1] < n - 1 && run[0] < b && run[1] > a) sl = Math.max(sl, runSlide(run, feet[ft].ball, feet[ft].ball, feet[ft].c));
          }
          const p = {
            dir: angle < 0 ? 'L' : 'R', angle: r1(angle), t0: r2(s(a)), t1: r2(s(b)), dur: r2(s(b - a)),
            vMin: r2(Math.min(...win)), vMean: r2(mean(win)), peakRate: Math.round(Math.max(...rate.slice(a, b + 1).map(Math.abs)) * R2D),
            steps: strikes.filter((e) => e.frame >= a && e.frame <= b).length, slide: r1(sl * 100), pops: popsIn, zeros: zIn,
            travel: r2(v3.distXZ(pel[a], pel[b])),
          };
          p.score = r1(10 * p.vMean + 2 * p.slide + 5 * p.pops + (p.zeros ? 20 : 0) + 0.1 * Math.abs(180 - Math.abs(p.angle)));
          // segment: from just before the slowdown to just after the turn, left strike to left strike where possible
          p.segment = [Math.max(0, lastLBefore(a - Math.round(0.4 * FPS))), Math.min(n - 1, firstLAfter(b + Math.round(0.2 * FPS)))];
          piv.push(p);
        }
        i = b + 1;
      } else i++;
    }
    res.pivots = piv;
  }
  return res;
}

/** Slots and their picks: the best one or two per use, with reasons. */
const LEG = wrenRig().leg;

export function pickSlots(all) {
  const by = (k) => all.filter((a) => a.kind === k);
  const picks = [];
  const fmtCycle = (a, c) => `${a.take} ${c.foot.toUpperCase()}-strike cycle ${s(c.a).toFixed(2)}-${s(c.b).toFixed(2)} s`;
  // loops by measured gait
  for (const gait of ['walk', 'jog', 'run']) {
    const cands = [];
    for (const a of by('loop')) {
      for (const c of a.cycles) {
        if (gaitOf(c.speed) !== gait || !c.steady) continue;
        const wrenStride = c.speed * c.T * (LEG / a.legLen);
        const fit = wrenStride / GAME_STRIDE[gait];
        cands.push({ a, c, wrenStride, fit, score: c.score - Math.min(3, a.nSteady) + (c.zeros ? 20 : 0) + 20 * Math.abs(Math.log(fit)) });
      }
    }
    // the best cycle per take, then the best takes
    const best = new Map();
    for (const x of cands) if (!best.has(x.a.take) || best.get(x.a.take).score > x.score) best.set(x.a.take, x);
    const ranked = [...best.values()].sort((p, q) => p.score - q.score);
    picks.push({
      slot: `${gait}_loop`, kind: 'loop', ranked: ranked.map((x) => ({ take: x.a.take, score: r1(x.score), what: fmtCycle(x.a, x.c), wrenStride: r2(x.wrenStride), strideScale: r2(1 / x.fit), speed: x.c.speed, cadence: x.c.cadence, stride: x.c.stride, slide: x.c.slide, seam: x.c.seam, pops: x.c.pops, dHeading: x.c.dHeading })),
      chosen: ranked.slice(0, 2).map((x) => ({ take: x.a.take, segment: [x.c.a, x.c.b], foot: x.c.foot, loop: true })),
    });
  }
  // turns on the move per gait and side
  for (const gait of ['walk', 'jog', 'run']) {
    for (const side of ['L', 'R']) {
      const cands = by('turn').filter((a) => a.turn && gaitOf(a.turn.vBefore) === gait && (a.turn.angle < 0 ? 'L' : 'R') === side);
      // the CMU 'run' turn takes measure as jogs before the turn; keep the site's label for the slot
      const label = (a) => (a.desc.startsWith('run,') ? 'run' : a.desc.startsWith('run/jog') ? 'jog' : 'walk');
      const c2 = by('turn').filter((a) => a.turn && label(a) === gait && (a.turn.angle < 0 ? 'L' : 'R') === side);
      const list = (cands.length ? cands : c2).filter((a) => label(a) === gait);
      const ranked = [...list].sort((p, q) => p.turn.score - q.turn.score);
      if (!ranked.length) continue;
      picks.push({
        slot: `${gait}_turn90_${side}`, kind: 'turn',
        ranked: ranked.map((a) => ({ take: a.take, score: a.turn.score, what: `${a.take} turn ${a.turn.angle} deg over ${a.turn.dur} s`, ...a.turn })),
        chosen: ranked.slice(0, 1).map((a) => ({ take: a.take, segment: a.turn.segment, loop: false })),
      });
    }
  }
  // pivot turns (69_*): best per direction
  for (const side of ['L', 'R']) {
    const list = [];
    for (const a of by('pivot')) for (const p of a.pivots ?? []) if (p.dir === side) list.push({ a, p });
    list.sort((x, y) => x.p.score - y.p.score);
    if (!list.length) continue;
    picks.push({
      slot: `pivot180_${side}`, kind: 'pivot',
      ranked: list.slice(0, 6).map(({ a, p }) => ({ take: a.take, score: p.score, what: `${a.take} ${p.angle} deg at ${p.t0}-${p.t1} s`, ...p })),
      chosen: list.slice(0, 1).map(({ a, p }) => ({ take: a.take, segment: p.segment, loop: false })),
    });
  }
  // stops
  for (const gait of ['walk', 'jog']) {
    const list = by('stop').filter((a) => a.stop && (gait === 'walk' ? a.stop.v0 < 1.9 : a.stop.v0 >= 1.9)).sort((p, q) => p.stop.score - q.stop.score);
    if (!list.length) continue;
    picks.push({
      slot: `${gait}_stop`, kind: 'stop',
      ranked: list.map((a) => ({ take: a.take, score: a.stop.score, what: `${a.take} stop from ${a.stop.v0} m/s`, ...a.stop })),
      chosen: list.slice(0, 1).map((a) => ({ take: a.take, segment: a.stop.segment, loop: false })),
    });
  }
  // starts: from rest (walk) and the walk-to-run acceleration
  const starts = all.filter((a) => a.start);
  const st = [
    ['walk_start', starts.filter((a) => a.start.fromRest)],
    ['run_start_from_walk', starts.filter((a) => !a.start.fromRest && a.start.vTop > 3)],
  ];
  for (const [slot, list0] of st) {
    const list = [...list0].sort((p, q) => p.start.score - q.start.score);
    if (!list.length) continue;
    picks.push({
      slot, kind: 'start',
      ranked: list.map((a) => ({ take: a.take, score: a.start.score, what: `${a.take} ${a.start.v0} -> ${a.start.vTop} m/s`, ...a.start })),
      chosen: list.slice(0, 1).map((a) => ({ take: a.take, segment: a.start.segment, loop: false })),
    });
  }
  return picks;
}

const HEADER = `# mocap-trial - takes, picks and the pipeline

GENERATED in sections by scripts/mocap/analyze.mjs (findings, analysis, method), retarget.mjs (intermediates) and
emit.mjs (clips) from the CMU takes in \`.mocap-cache/\` (raw ASF / AMC, gitignored, never copied into tracked files: the
licence bans redistributing it). Edit the scripts, not this file. Source, URLs and licence: SOURCES.md. Clip format:
CLIP-FORMAT.md.`;

/** The findings: what the reader and the analysis found, partly from the data. */
function findings(all) {
  const L = [];
  const by = Object.fromEntries(all.map((a) => [a.take, a]));
  const fails = all.filter((a) => !a.selfCheck).map((a) => a.take);
  const deadAll = ['lclavicle', 'rclavicle'].every((b) => all.every((a) => a.dead.includes(b)));
  const drop = all.filter((a) => Object.keys(a.zeros).length).map((a) => `${a.take} (${Object.entries(a.zeros).map(([k, c]) => `${k} ${c}`).join(', ')})`);
  const pv = all.filter((a) => a.pivots);
  const subj = [...new Map(all.map((a) => [a.subject, a])).values()];
  L.push('## Findings');
  L.push('');
  L.push(`- Reader: ${all.length} takes parsed; self-check (bone lengths constant to under 0.001 mm, unit rotations, floor within 8 cm) ${fails.length ? `FAILS on ${fails.join(', ')}` : 'passes on every take'}. Floor (5th percentile of the lowest foot point): ${Math.min(...all.map((a) => a.floorCm))} to ${Math.max(...all.map((a) => a.floorCm))} cm, so the CMU floor is y = 0 within about 2 cm.`);
  L.push(`- Performers: ${subj.map((a) => `subject ${a.subject} about ${a.stature} m (rest skeleton to the head-bone tip; the real stature is a few cm more), hip-ankle leg ${a.legLen} m`).join('; ')}. Wren's leg is 0.782 m, so the motion is scaled by 0.90-0.94 (leg ratio) onto her 1.68 m.`);
  L.push(`- Missing data: ${deadAll ? 'the clavicle channels never move in any take (no shrug data; Wren has no clavicle joint in the bind export anyway); ' : ''}the finger channels are dead in almost every take and the thumbs / hands / toes carry little real motion (CMU captures no fingers). Dropout frames (a bone's channels written as exact zeros: the joint snaps to its rest pose for those frames): ${drop.join('; ') || 'none'}. The picks keep clear of them.`);
  L.push('- Glitches (a core joint over 8 deg in one 1/120 s frame and 4x its neighbourhood): 35_01 left foot frames 96-102 (20-38 deg per frame); 16_17 at its end (frames 474-475: lower back 28 deg, femurs 34 deg); 16_43 frames 114-115 (16-20 deg); short settling pops in the first 0.15 s of 16_22, 16_34, 16_35, 16_46, 16_56 (neck and upper arms 9-14 deg). Extremity pops (toes, hands, thumbs) run 3-71 per take against 0-13 core: the toes and hands are noisy (CMU caveat), so the clips take the hands from the wrist segment and the feet from the ankle-ball segment; the toe joint is carried in the intermediates but not used by the clips.');
  L.push('- Walks: every walk take is clean and steady (1.0-1.7 m/s, all cycles steady, slide 1.5-2.5 cm on the performer). 16_15 has the left arm zeroed in its first 8 frames (outside the picked cycle).');
  L.push(`- Jogs and runs: the "run/jog" loops are short (1.1-1.6 s), one or two full cycles each. 16_45 / 16_46 are the only steady runs (${by['16_45']?.speedPlateau} / ${by['16_46']?.speedPlateau} m/s), each with one right-strike cycle only (the loop is re-phased to start at the left strike). 16_55 ("run") and 16_56 ("run/jog") are accelerations from a walk (about 1 to 4.2 m/s in 1 s) with no steady cycle: unusable as loops, used as a run start from a walk.`);
  L.push('- Turns on the move: 16_17-16_20 (walk) and 16_41-16_44 (jog) are clean 87-92 deg turns over 0.85-1.5 s with 1-3 steps. The "run" turns 16_51-16_54 are performed at jog speed (2.3-3.5 m/s) and are cut by the take edges (still turning at the start or the end): 16_53 / 16_54 capture only 64-73 deg; 16_17 ends in a glitch.');
  L.push(`- Turn in place: 69_13 and 69_14 are NOT idle turns in place. They are walks back and forth along curved paths (the heading drifts about 90 deg over 3 s of walking) with a 160-190 deg turnaround every 4-5 s, slowing to 0.1-0.25 m/s (${pv.reduce((s, a) => s + a.pivots.length, 0)} turnarounds found). The picks use the cleanest turnaround per side (pivot180_L / pivot180_R); the first 90 deg of the right one stands in for the turn-in-place slot, but it is a walking pivot (mean 0.4 m/s), not a standing turn. 69_13 / 69_14 also have knee dropout frames (ltibia, rtibia). No idle 90 deg turn in place exists in the downloaded set.`);
  L.push('- Starts: only 16_31 and 16_32 start from standing (walk, 0.1 to 1.3 m/s in 1.3-1.4 s). No standing jog or run start.');
  L.push('- Stops: 16_33 / 16_34 walk to a standstill (1.2 m/s, 1.7-1.9 s, about 1.2 m, 3 steps); 16_57 and 16_08 jog to a standstill (3.0-3.3 m/s, about 1.6 s, 1.9 m, 3-4 steps; 16_08 holds still only 0.04 s before the take ends).');
  L.push('- Unusable for their listed use: 16_55 / 16_56 as loops (accelerating), 16_53 / 16_54 as 90 deg turns (cut at 64-73 deg), 69_13 / 69_14 as idle turns in place (walking turnarounds), 16_17 past 3.9 s (glitch).');
  return L.join('\n');
}

const METHOD = `## Method and thresholds

- Reader (\`asfamc.mjs\`): ASF units length 0.45 (metres = value / 0.45 x 0.0254), degrees; per bone C = Euler(axis) in
  the axis order, motion M from the AMC dofs in their order (rx ry rz -> Rz Ry Rx), L = C M C^-1, world W = W_parent L,
  tip = tip_parent + length W direction. Game frame = (-x, y, z) (CMU left is +x). A partial last frame is dropped.
- Contacts: ankle (tibia tip) below its 5th-percentile height + 4.5 cm, or ball (foot tip) below its 5th percentile
  + 3.5 cm, and horizontally slower than 0.7 m/s; gaps under 0.04 s filled, contacts under 0.05 s dropped. Strike = a
  contact starting, toe-off = one ending.
- Cycles: same-foot strike to strike with exactly one other-foot strike between, 0.6-1.5 x the median length; steady
  = speed within 12 % of the take's median cycle speed and heading drift under 10 deg.
- Slide: per contact, the largest horizontal travel of the ankle while the foot is flat (ankle within 2 cm and ball
  within 1.5 cm of their low heights) and of the ball while it is down, from the slowest frame's position. A foot that
  turns over 15 deg while down (a pivot) counts its ball only.
- Seam: RMS distance (cm) of 12 joints between the cycle's first and last frame, pelvis-relative in the heading frame.
- Pops: a joint's local rotation stepping over 8 deg in one frame and over 4x its +-10-frame median. Jitter: the median
  second difference of joint positions (mm per frame^2 at 120 fps; real acceleration included).
- Turns: smoothed pelvis heading (+-0.25 s); the turn spans the peak rate down to 25 % of it each side; the angle is
  measured 0.1 s outside that span. Stops: from the last frame at 90 % of the starting speed to under 0.1 m/s. Starts:
  from over 0.1 m/s to 90 % of the take's top speed.
- Retarget (\`retarget.mjs\`): each Wren joint takes the world rotation of the CMU bone spanning the same segment
  (pelvis root, spine upperback, chest thorax, neck upperneck, head head, shoulder humerus, elbow radius, wrist hand,
  hip femur, knee tibia, ankle foot, toe toes; the hands ride the wrist) times a fixed rest correction (the shortest arc
  from Wren's bind segment onto the CMU rest direction), so every Wren segment points exactly where the performer's does
  (checked per slot: 0.000 deg) with Wren's lengths. The pelvis follows the performer's hip midpoint x the leg ratio; a
  vertical offset sets the flat foot's ankle at Wren's bind ankle height (6.6 cm). Resampled to 60 fps (slerp).
- Loops: the cycle from a strike to the same foot's next strike, the root moving straight at the cycle's mean velocity,
  the end-to-start mismatch spread linearly over the cycle (pelvis offset and every local rotation), re-phased so frame
  0 is the left strike; the last frame joins frame 0 (no repeated end frame).
- De-slide: per contact, the foot's heading is held while flat (unless it pivots over 15 deg), then the ankle is pinned
  while flat and the ball after heel-off (the ball through a pivot), eased in and out over 4 frames; the leg follows by
  two-bone IK (hip fixed, knee in its plane). Loops are de-slid unrolled over three cycles so a contact across the seam
  stays whole.

## Rerun

Node only (no Blender, no heavy lock needed), from the repo root:

\`\`\`
node scripts/mocap/asfamc.mjs 16_15 35_01 69_13      # reader self-check on any takes
node scripts/mocap/analyze.mjs                       # analysis -> build/mocap/analysis.json + this file
node scripts/mocap/retarget.mjs                      # intermediates -> build/mocap/<slot>.json
node scripts/mocap/sheets.mjs --png                  # stick contact sheets -> build/mocap/sheets/
node --import ./scripts/operators/ts-resolve.mjs scripts/mocap/emit.mjs   # clips -> build/mocap/clips/
\`\`\``;

function markdown(all, picks) {
  const L = [];
  const fx = (x, d = 2) => (x === undefined || x === null || Number.isNaN(x) ? '-' : typeof x === 'number' ? x.toFixed(d) : String(x));
  L.push('## Picks per slot');
  L.push('');
  L.push('Numbers in this and the next tables are the performer at their own size (metres, 120 fps).');
  L.push('');
  L.push('| Slot | Pick | Runner-up | Why |');
  L.push('| --- | --- | --- | --- |');
  for (const p of picks) {
    const a = p.ranked[0], b = p.ranked[1];
    let why = '';
    if (p.kind === 'loop') why = `Wren stride ${a.wrenStride} m (game / clip ${a.strideScale} at the band middle), ${a.speed} m/s, ${a.cadence} steps/s, stride ${a.stride} m, slide ${a.slide} cm, seam ${a.seam} cm, ${a.pops} pops, heading drift ${a.dHeading} deg`;
    if (p.kind === 'turn') why = `${a.angle} deg in ${a.dur} s (peak ${a.peakRate} deg/s), ${a.vBefore} -> min ${a.vMin} -> ${a.vAfter} m/s, ${a.steps} steps${a.truncated ? ', turn cut by the take edge' : ''}`;
    if (p.kind === 'pivot') why = `${a.angle} deg in ${a.dur} s, mean ${a.vMean} m/s (min ${a.vMin}), travel ${a.travel} m, ${a.steps} steps, slide ${a.slide} cm, ${a.pops} pops`;
    if (p.kind === 'stop') why = `${a.v0} m/s to standstill in ${a.time} s over ${a.dist} m, ${a.steps} steps${a.reached ? '' : ', standstill not reached in the take'}`;
    if (p.kind === 'start') why = `${a.v0} -> ${a.vTop} m/s in ${a.time} s over ${a.dist} m, ${a.steps} steps, first foot ${a.firstFoot}`;
    L.push(`| ${p.slot} | ${a.what} | ${b ? `${b.take} (score ${b.score})` : '-'} | ${why} |`);
  }
  L.push('');
  L.push('Score: lower is better (loops: seam cm + 2 x slide cm + 5 x pops + 0.5 x heading drift deg + 30 x speed deviation +');
  L.push('20 if a dropout frame falls in the cycle, minus up to 3 for steady cycles in the take; turns: 0.5 x |angle - 90| + 2 x');
  L.push('median slide + 5 x pops + 10 if the turn is cut by the take edge; pivots: 10 x mean speed + 2 x slide + 5 x pops + 20 for');
  L.push('dropouts + 0.1 x |180 - angle|; stops / starts: missing standstill or top speed, slide, pops, dropouts).');
  L.push('');
  L.push('## All takes');
  L.push('');
  L.push('| Take | Site label | Dur s | Gait | Speed m/s | Cadence steps/s | Stride m | Clean cycles | Slide cm med / max | Pops core / extr | Jitter mm core / extr | Dropouts | Notes |');
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const a of all) {
    const notes = [];
    if (a.turn) notes.push(`turn ${a.turn.angle} deg${a.turn.truncated ? ' (cut)' : ''}`);
    if (a.stop) notes.push(`stop ${a.stop.v0}->0 in ${a.stop.time} s / ${a.stop.dist} m${a.stop.reached ? '' : ' (no standstill)'}`);
    if (a.start) notes.push(`${a.start.fromRest ? 'start' : 'accel'} ${a.start.v0}->${a.start.vTop} in ${a.start.time} s`);
    if (a.pivots) notes.push(`${a.pivots.length} pivots`);
    if (!a.selfCheck) notes.push('SELF-CHECK FAIL');
    const z = Object.entries(a.zeros).map(([k, c]) => `${k} ${c}`).join(', ') || '-';
    L.push(`| ${a.take} | ${a.desc} | ${fx(a.dur)} | ${a.gait} | ${fx(a.speedPlateau)} | ${fx(a.cadence)} | ${fx(a.stride)} | ${a.nSteady} / ${a.cycles.length} | ${fx(a.slideMed, 1)} / ${fx(a.slideMax, 1)} | ${a.pops.core} / ${a.pops.extrem} | ${fx(a.jitter.core)} / ${fx(a.jitter.extrem)} | ${z} | ${notes.join('; ')} |`);
  }
  L.push('');
  L.push('Performers (rest skeleton, legs straight, head-bone tip): ' + [...new Map(all.map((a) => [a.subject, a])).values()].map((a) => `subject ${a.subject} about ${a.stature} m tall, leg (hip-ankle) ${a.legLen} m`).join('; ') + '.');
  L.push('');
  L.push('## Cycles of the loop takes');
  L.push('');
  L.push('| Take | Cycle | s | T s | Speed | Cadence | Stride | Slide cm | Seam cm | Height pop cm | Heading drift deg | Pops | Dropouts | Steady | Score |');
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const a of all.filter((x) => x.kind === 'loop')) {
    for (const c of a.cycles) {
      L.push(`| ${a.take} | ${c.foot.toUpperCase()} | ${s(c.a).toFixed(2)}-${s(c.b).toFixed(2)} | ${c.T} | ${c.speed} | ${c.cadence} | ${c.stride} | ${c.slide} | ${c.seam} | ${c.dHeight} | ${c.dHeading} | ${c.pops} | ${c.zeros} | ${c.steady ? 'yes' : 'no'} | ${c.score} |`);
    }
    if (!a.cycles.length) L.push(`| ${a.take} | none: under one full stride in the take | | | | | | | | | | | | | |`);
  }
  L.push('');
  L.push('## Turns on the move');
  L.push('');
  L.push('| Take | Angle deg | Turn s | Peak deg/s | Speed before / min / after | Steps in turn | Radius m | Cut by take edge | Score |');
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const a of all.filter((x) => x.turn)) {
    const t = a.turn;
    L.push(`| ${a.take} | ${t.angle} | ${t.t0}-${t.t1} (${t.dur}) | ${t.peakRate} | ${t.vBefore} / ${t.vMin} / ${t.vAfter} | ${t.steps} | ${t.radius} | ${t.truncated ? 'yes' : 'no'} | ${t.score} |`);
  }
  L.push('');
  L.push('## Pivot turns (69_13, 69_14)');
  L.push('');
  L.push('| Take | Dir | Angle deg | s | Mean / min speed | Travel m | Steps | Slide cm | Pops | Score |');
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const a of all.filter((x) => x.pivots)) {
    for (const p of a.pivots) L.push(`| ${a.take} | ${p.dir} | ${p.angle} | ${p.t0}-${p.t1} | ${p.vMean} / ${p.vMin} | ${p.travel} | ${p.steps} | ${p.slide} | ${p.pops} | ${p.score} |`);
  }
  L.push('');
  L.push('## Stops and starts');
  L.push('');
  L.push('| Take | What | From m/s | To m/s | s | Time s | Distance m | Steps | Notes | Score |');
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const a of all) {
    if (a.stop && a.kind === 'stop') L.push(`| ${a.take} | stop | ${a.stop.v0} | ${a.stop.reached ? '0' : a.stop.vFinal} | ${a.stop.t0}-${a.stop.t1} | ${a.stop.time} | ${a.stop.dist} | ${a.stop.steps} | ${a.stop.reached ? `standstill, ${a.stop.tail} s of hold after` : 'no standstill in the take'} | ${a.stop.score} |`);
    if (a.start) L.push(`| ${a.take} | ${a.start.fromRest ? 'start from rest' : 'acceleration'} | ${a.start.v0} | ${a.start.vTop} | ${a.start.t0}-${a.start.t1} | ${a.start.time} | ${a.start.dist} | ${a.start.steps} | first foot ${a.start.firstFoot}${a.start.reachedTop ? '' : ', top speed at the take end'} | ${a.start.score} |`);
  }
  return L.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const all = [];
  for (const e of CATALOGUE) {
    if (!existsSync(path.join(CACHE, `${e.take}.amc`))) { console.warn(`skip ${e.take}: not in .mocap-cache`); continue; }
    const a = analyzeTake(e);
    all.push(a);
    console.log(`${a.take}: ${a.gait} ${a.speedPlateau} m/s, ${a.nSteady}/${a.cycles.length} cycles, slide ${a.slideMed} cm, pops ${a.pops.core}/${a.pops.extrem}`);
  }
  const picks = pickSlots(all);
  const out = path.join(ROOT, 'build', 'mocap');
  mkdirSync(out, { recursive: true });
  writeFileSync(path.join(out, 'analysis.json'), JSON.stringify({ takes: all, picks }, null, 1));
  if (!existsSync(TAKES_MD) || !readFileSync(TAKES_MD, 'utf8').includes('<!-- mocap:analysis -->')) {
    writeFileSync(TAKES_MD, [HEADER, ...['findings', 'analysis', 'intermediates', 'clips', 'method'].map((n) => `<!-- mocap:${n} -->\n<!-- /mocap:${n} -->`)].join('\n\n') + '\n');
  }
  writeSection('findings', findings(all));
  writeSection('analysis', markdown(all, picks));
  writeSection('method', METHOD);
  for (const p of picks) console.log(`${p.slot}: ${p.chosen.map((c) => `${c.take} [${c.segment}]`).join(', ')}`);
}
