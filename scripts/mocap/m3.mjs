// (mocap-trial M3) The takes downloaded for BRIEF M3 (SOURCES.md "Downloaded 2026-10-23 (M3)"): crouch walk / sneak,
// sprint, strafe and the back-to-wall stand-ins. Runs analyze.mjs's per-take analysis (analyzeTake) plus what these moves
// need (travel direction against the facing, crouch depth, the look-arounds), picks a take per game clip, builds the
// intermediates with retarget.mjs (buildSlot) and emits the clips the existing emitter can express (emit.mjs).
//   node --import ./scripts/operators/ts-resolve.mjs scripts/mocap/m3.mjs
//     -> build/mocap/m3/analysis.json, build/mocap/m3/<slot>.json (intermediates), build/mocap/clips/m3/*.ts (+ report.json)
//        and the TAKES.md section "m3". analyze.mjs / retarget.mjs / emit.mjs outputs and their TAKES.md sections are not
//        touched (their catalogue and picks stay as they are).
// Numbers are the performer at their own size (metres, 120 fps) unless marked Wren.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadTake, selfCheck, restPose, CACHE, FPS } from './asfamc.mjs';
import { footContacts, headingTrack, facing } from './gait.mjs';
import { v3, q4, mean, R2D, wrapPi } from './math.mjs';
import { analyzeTake } from './analyze.mjs';
import { wrenRig, buildSlot, OUT } from './retarget.mjs';
import { emitCycle, emitOneShot, moduleSource } from './emit.mjs';
import { writeSection } from './takesdoc.mjs';

const M3_OUT = path.join(OUT, 'm3');
const M3_CLIPS = path.join(OUT, 'clips', 'm3');

/** The M3 takes with the site's description and the game clip family they were fetched for. */
export const M3 = [
  { take: '136_09', desc: 'Walk Crouched', cat: 'crouch' },
  { take: '136_10', desc: 'Walk Crouched', cat: 'crouch' },
  { take: '139_29', desc: 'Sneaking', cat: 'sneak' },
  { take: '139_32', desc: 'Sneaking', cat: 'sneak' },
  { take: '139_34', desc: 'Sneaking', cat: 'sneak' },
  { take: '139_11', desc: 'Run To Sneak', cat: 'sneak' },
  { take: '127_06', desc: 'Run', cat: 'sprint' },
  { take: '127_07', desc: 'Run', cat: 'sprint' },
  { take: '127_08', desc: 'Run', cat: 'sprint' },
  { take: '143_42', desc: 'Run', cat: 'sprint' },
  { take: '127_03', desc: 'Run', cat: 'sprintStart' },
  { take: '127_04', desc: 'Walk to Run', cat: 'sprintStart' },
  { take: '143_40', desc: 'Walk Sideways', cat: 'strafe' },
  { take: '69_56', desc: 'walk sideways and turn (opposite direction)', cat: 'strafe' },
  { take: '69_59', desc: 'walk sideways and turn', cat: 'strafe' },
  { take: '127_13', desc: 'Run Side Step Left', cat: 'strafeRun' },
  { take: '127_14', desc: 'Run Side Step Right', cat: 'strafeRun' },
  { take: '139_14', desc: 'Sneak Sideways', cat: 'wallStep' },
  { take: '139_15', desc: 'Sneak Sideways', cat: 'wallStep' },
  { take: '139_01', desc: 'Looking Around', cat: 'wallPeek' },
  { take: '139_04', desc: 'Looking Around', cat: 'wallPeek' },
].map((e) => ({ ...e, kind: 'loop' }));

const CAT_LABEL = {
  crouch: 'crouch walk', sneak: 'sneak', sprint: 'sprint', sprintStart: 'sprint start', strafe: 'strafe (walk)',
  strafeRun: 'strafe (run)', wallStep: 'wall side-step', wallPeek: 'wall peek (stand-in)',
};

/** Standing hip height = the rest skeleton's + this (m): see motionOf. */
const STAND_FIX = 0.05;
/**
 * The game's speeds (m/s, Wren) each clip plays at (src/config/movement.ts, src/player/wallController.ts): the crouched
 * sneak 0.8 (crouch walk 1.8, crouch run 2.6), the sprint 5.0, the aimed strafe 1.4 x strafeMult 0.5 = 0.7 (the body
 * faces where it goes unless aiming), the wall slide 0.35 standing / 0.5 crouched at full stick.
 */
const TARGET = { sneak: 0.8, crouchWalk: 1.8, sprint: 5.0, strafe: 0.7, wallStand: 0.35, wallCrouch: 0.5 };
const D = 1 / R2D;
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const s = (f) => f / FPS;
/** Travel direction against the facing (rad, + = to the right) -> class. */
const dirOf = (v, rel) => (v < 0.25 ? 'still' : Math.abs(rel) < 35 * D ? 'fwd' : Math.abs(rel) > 145 * D ? 'back' : rel >= 55 * D && rel <= 125 * D ? 'R' : rel <= -55 * D && rel >= -125 * D ? 'L' : 'diag');
const circMean = (arr) => Math.atan2(mean(arr.map(Math.sin)), mean(arr.map(Math.cos)));

/**
 * The extra per-take measures: per frame the hip-midpoint velocity over +-0.5 s (one step pair, so the sway is gone),
 * its direction against the pelvis facing, the crouch drop (rest hip height above the lowest foot point minus the
 * hip height above the floor), the head's yaw against the pelvis, the chest's sideways / forward lean and both feet's
 * contacts; then the bouts (one direction class held for 0.6 s or more) and the look-arounds.
 */
function motionOf(take) {
  const t = loadTake(take);
  const floor = selfCheck(t).floor;
  const n = t.frames;
  const lh = t.pos.get('lhipjoint'), rh = t.pos.get('rhipjoint');
  const hip = lh.map((p, i) => v3.scale(v3.add(p, rh[i]), 0.5));
  const head = headingTrack(t.quat.get('root'), 30);
  const W = 60;
  const vel = hip.map((_, i) => {
    const a = Math.max(0, i - W), b = Math.min(n - 1, i + W);
    return [(hip[b][0] - hip[a][0]) / s(b - a), (hip[b][2] - hip[a][2]) / s(b - a)];
  });
  const speed = vel.map((d) => Math.hypot(d[0], d[1]));
  const rel = vel.map((d, i) => wrapPi(Math.atan2(d[0], d[1]) - head[i]));
  const rest = restPose(t.skel);
  // the rest skeleton's hip height above its lowest foot point reads 4-7 cm under the standing frames of 16_15, 136_09
  // and 139_01 (the rest feet point down), so standing = rest + STAND_FIX
  const restHip = (rest.get('lhipjoint')[1] + rest.get('rhipjoint')[1]) / 2 - Math.min(...[...rest.values()].map((p) => p[1])) + STAND_FIX;
  const drop = hip.map((p) => (restHip - (p[1] - floor)) * 100);
  // the feet's side-by-side gap in the facing frame (+ = left foot left of the right foot; under 0 the feet cross)
  const la = t.pos.get('ltibia'), ra = t.pos.get('rtibia');
  const sep = la.map((p, i) => q4.rotate(q4.yaw(-head[i]), v3.sub(ra[i], p))[0] * 100);
  const rootQ = t.quat.get('root'), headQ = t.quat.get('head'), thQ = t.quat.get('thorax');
  const headYaw = headQ.map((q, i) => wrapPi(facing(q) - facing(rootQ[i])) * R2D);
  const chest = thQ.map((q, i) => {
    const up = q4.rotate(q4.yaw(-facing(rootQ[i])), q4.rotate(q, [0, 1, 0]));
    return [Math.atan2(up[0], up[1]) * R2D, Math.atan2(up[2], up[1]) * R2D];
  });
  const cl = footContacts(t.pos.get('ltibia'), t.pos.get('lfoot'), FPS, { floor }).flags;
  const cr = footContacts(t.pos.get('rtibia'), t.pos.get('rfoot'), FPS, { floor }).flags;
  const cls = speed.map((v, i) => dirOf(v, rel[i]));
  const bouts = [];
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && cls[j + 1] === cls[i]) j++;
    if (j - i + 1 >= 0.6 * FPS) {
      const span = (arr) => arr.slice(i, j + 1);
      bouts.push({
        dir: cls[i], t0: r2(s(i)), t1: r2(s(j)), dur: r2(s(j - i)), a: i, b: j,
        v: r2(mean(span(speed))), relDeg: Math.round(circMean(span(rel)) * R2D), turnDeg: Math.round((head[j] - head[i]) * R2D),
        dropCm: r1(mean(span(drop))), headYaw: [Math.round(Math.min(...span(headYaw))), Math.round(Math.max(...span(headYaw)))],
        planted: r2(mean(span(cl).map((c, k) => (c && cr[i + k] ? 1 : 0)))),
      });
    }
    i = j + 1;
  }
  return { n, hip, head, speed, rel, drop, sep, headYaw, chest, cl, cr, cls, bouts, restHipCm: r1(restHip * 100) };
}

/**
 * Look-arounds (the peek stand-ins): the head turned over 35 deg off the pelvis while the hips move under 0.35 m/s. Per
 * turn: from 0.3 s before the head passes 15 deg to 0.3 s after it is back under 15 deg (3 s at most), the peak, the
 * chest lean at the peak, the feet (share of frames with both down) and a score (lower is better: a big, quick,
 * planted look with the chest leaning into it).
 */
function lookArounds(m) {
  const out = [];
  let i = 0;
  while (i < m.n) {
    if (Math.abs(m.headYaw[i]) > 35 && m.speed[i] < 0.35) {
      const sg = Math.sign(m.headYaw[i]);
      let a = i, b = i;
      while (a > 0 && sg * m.headYaw[a - 1] > 15) a--;
      while (b < m.n - 1 && sg * m.headYaw[b + 1] > 15) b++;
      let pk = a;
      for (let k = a; k <= b; k++) if (sg * m.headYaw[k] > sg * m.headYaw[pk]) pk = k;
      const a0 = Math.max(0, a - Math.round(0.3 * FPS)), b0 = Math.min(m.n - 1, b + Math.round(0.3 * FPS), a0 + 3 * FPS);
      const planted = mean(m.cl.slice(a0, b0 + 1).map((c, k) => (c && m.cr[a0 + k] ? 1 : 0)));
      const v = mean(m.speed.slice(a0, b0 + 1));
      const p = {
        side: sg > 0 ? 'R' : 'L', t0: r2(s(a0)), t1: r2(s(b0)), dur: r2(s(b0 - a0)), segment: [a0, b0],
        peakYaw: Math.round(m.headYaw[pk]), roll: Math.round(m.chest[pk][0]), pitch: Math.round(m.chest[pk][1]),
        dropCm: r1(m.drop[pk]), v: r2(v), planted: r2(planted), back: b < m.n - 1 && b0 > b,
      };
      p.score = r1(Math.max(0, 90 - Math.abs(p.peakYaw)) * 0.3 + 10 * p.v + 15 * (1 - p.planted) + 3 * Math.max(0, p.dur - 1.5) +
        (p.back ? 0 : 10) - Math.min(10, Math.max(0, sg * p.roll)) * 0.5);
      out.push(p);
      i = b + 1;
    } else i++;
  }
  return out;
}

/** Per cycle (analyzeTake's ok cycles): direction against the facing, crouch drop, speed change, and the score. */
function tagCycles(a, m) {
  for (const c of a.cycles) {
    const span = (arr) => arr.slice(c.a, c.b + 1);
    c.relDeg = Math.round(circMean(span(m.rel)) * R2D);
    c.dir = dirOf(c.speed, c.relDeg * D);
    c.dropCm = r1(mean(span(m.drop)));
    const mid = (c.a + c.b) >> 1;
    const v1 = v3.distXZ(m.hip[c.a], m.hip[mid]) / s(mid - c.a), v2 = v3.distXZ(m.hip[mid], m.hip[c.b]) / s(c.b - mid);
    c.accel = r2((v2 - v1) / Math.max(0.1, c.speed));
    c.minSepCm = r1(Math.min(...span(m.sep)));
    c.wrenSpeed = r2(c.speed * LEG / a.legLen);
  }
}
const LEG = wrenRig().leg;
/** Speed fit against the game's speed (Wren): 20 x |ln(clip / game)| (0 at the game's speed, 4.5 at 1.25x). */
const speedFit = (c, target) => 20 * Math.abs(Math.log(c.wrenSpeed / target));

/** The best ok cycle per take for one game clip, ranked; `fit` returns an extra score or null to drop the cycle. */
function rankCycles(all, cats, fit) {
  const best = new Map();
  for (const a of all) {
    if (!cats.includes(a.cat)) continue;
    for (const c of a.cycles) {
      const extra = fit(c, a);
      if (extra === null) continue;
      const score = r1(c.score + extra);
      if (!best.has(a.take) || best.get(a.take).score > score) best.set(a.take, { a, c, score });
    }
  }
  return [...best.values()].sort((p, q) => p.score - q.score);
}

/** Left / right pair from one performer where possible: the subject with the lowest summed best scores. */
function pairBySubject(L, R) {
  const subj = new Set([...L, ...R].map((x) => x.a.subject));
  let pick = null;
  for (const sj of subj) {
    const l = L.find((x) => x.a.subject === sj), r = R.find((x) => x.a.subject === sj);
    if (l && r && (!pick || l.score + r.score < pick.l.score + pick.r.score)) pick = { l, r };
  }
  return pick ?? { l: L[0], r: R[0] };
}

/**
 * A lateral loop with its root turned to the body's facing: buildSlot points a loop's root along the travel, so a
 * sideways cycle comes out with the body turned ~90 deg off its root. Here the whole cycle is turned by the mean
 * pelvis facing: the root faces where the body faces (yaw 0) and travels along x (+x right).
 */
function faceRoot(d) {
  const pi = d.joints.indexOf('pelvis');
  const off = circMean(d.rot.map((r) => facing(r[pi])));
  const R = q4.yaw(-off);
  const rot3 = (p) => q4.rotate(R, p);
  d.root = d.root.map((r) => { const p = rot3([r[0], 0, r[1]]); return [p[0], p[2], r[2]]; });
  d.pel = d.pel.map(rot3);
  d.pos = d.pos.map((f) => f.map(rot3));
  d.rot = d.rot.map((f) => f.map((q, j) => (j === pi ? q4.norm(q4.mul(R, q)) : q)));
  const last = d.root[d.root.length - 1], step = d.cycleDistance / d.frames;
  const dir = Math.atan2(last[0], last[1]);
  d.travel = { headingDeg: r1(dir * R2D), perFrame: [r2(Math.sin(dir) * step * 1000) / 1000, r2(Math.cos(dir) * step * 1000) / 1000], bodyTurnedDeg: r1(off * R2D) };
  d.notes.push(`(M3) facing root: the cycle was turned by ${r1(-off * R2D)} deg so the root faces where the body faces; the root travels at heading ${r1(dir * R2D)} deg (+90 = right), cycleDistance per loop along it.`);
  return d;
}

/** Seam check on an emitted cycle (emit.mjs checkCycle's closure part). */
function seamNote(out) {
  const fr = out.frames, N = fr.length;
  const step = (a, b) => Math.sqrt(Object.keys(a.pos).reduce((acc, k) => acc + v3.dist(a.pos[k], b.pos[k]) ** 2, 0) / Object.keys(a.pos).length);
  const steps = fr.map((f, i) => step(f, fr[(i + 1) % N]));
  const med = [...steps].sort((x, y) => x - y)[N >> 1];
  return `seam step ${(steps[N - 1] * 100).toFixed(1)} cm (median ${(med * 100).toFixed(1)}, max inside ${(Math.max(...steps.slice(0, N - 1)) * 100).toFixed(1)})`;
}

function markdown(all, clips, built) {
  const L = [];
  const by = Object.fromEntries(all.map((a) => [a.take, a]));
  const fx = (x, d = 2) => (x === undefined || x === null || Number.isNaN(x) ? '-' : typeof x === 'number' ? x.toFixed(d) : String(x));
  L.push('## M3 takes: crouch walk / sneak, sprint, strafe, back-to-wall (downloaded 2026-10-23)');
  L.push('');
  L.push('GENERATED by `scripts/mocap/m3.mjs` (the same per-take analysis as analyze.mjs, plus the travel direction against');
  L.push('the facing, the crouch drop and the look-arounds). The sections above (analyze / retarget / emit) are unchanged.');
  L.push('Performer size, metres, 120 fps unless marked Wren. Rerun: `node --import ./scripts/operators/ts-resolve.mjs scripts/mocap/m3.mjs`.');
  L.push('');
  L.push('### Recommended take per game clip');
  L.push('');
  L.push('| Game clip | Pick | Runner-up | Usable | Built | Why / notes |');
  L.push('| --- | --- | --- | --- | --- | --- |');
  for (const c of clips) L.push(`| ${c.clip} | ${c.pick ?? 'none'} | ${c.runner ?? '-'} | ${c.usable ?? '-'} | ${c.built ?? '-'} | ${c.why} |`);
  L.push('');
  L.push('Scores: lower is better. Cycles: analyze.mjs\'s loop score (seam cm + 2 x slide cm + 5 x pops + 0.5 x heading drift');
  L.push('deg + 30 x speed deviation + 20 for a dropout) + 20 x |ln(Wren speed / the game\'s speed)| (the game\'s: sneak');
  L.push(`${TARGET.sneak}, sprint ${TARGET.sprint}, aimed strafe ${TARGET.strafe}, wall slide ${TARGET.wallStand} standing / ${TARGET.wallCrouch} crouched m/s), plus per clip: crouch walk +2 per cm`);
  L.push('of crouch drop under 12 cm (unsteady cycles and cycles under 8 cm dropped); sprint +30 x the speed change across the');
  L.push('cycle (share; cycles under 0.55 s dropped: a missed strike); strafe / side-steps +0.3 per deg the travel is off 90 deg');
  L.push('from the facing, +10 when the feet cross (standing clips take cycles under 8 cm of crouch drop, crouched clips 8 cm or');
  L.push('more). L / R pairs come from one performer where both sides exist. Look-arounds: 0.3 x (90 - |peak head yaw|) + 10 x');
  L.push('hip speed + 15 x (share of frames without both feet down) + 3 per s over 1.5 s + 10 if the head does not come back -');
  L.push('0.5 x the chest lean into the look (up to 10 deg).');
  L.push('');
  L.push('### All M3 takes');
  L.push('');
  L.push('| Take | Site label | For | Dur s | Gait (plateau m/s) | Cadence steps/s | Stride m | Cycles steady / ok | Slide cm med / max | Pops core / extr | Dropouts | Bouts (s, direction, m/s, crouch drop cm) | Notes |');
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const a of all) {
    const z = Object.entries(a.zeros).map(([k, c]) => `${k} ${c}`).join(', ') || '-';
    const bouts = a.m3.bouts.filter((b) => b.dir !== 'still').map((b) => `${b.t0}-${b.t1} ${b.dir} ${b.v} (${b.dropCm})`).join('; ') || 'none';
    const notes = [...a.m3.notes];
    if (a.start) notes.push(`${a.start.fromRest ? 'start' : 'accel'} ${a.start.v0}->${a.start.vTop} m/s in ${a.start.time} s`);
    if (a.stop) notes.push(`stop ${a.stop.v0}->0 in ${a.stop.time} s${a.stop.reached ? '' : ' (no standstill)'}`);
    if (!a.selfCheck) notes.push('SELF-CHECK FAIL');
    L.push(`| ${a.take} | ${a.desc} | ${CAT_LABEL[a.cat]} | ${fx(a.dur)} | ${a.gait} (${fx(a.speedPlateau)}) | ${fx(a.cadence)} | ${fx(a.stride)} | ${a.nSteady} / ${a.cycles.length} | ${fx(a.slideMed, 1)} / ${fx(a.slideMax, 1)} | ${a.pops.core} / ${a.pops.extrem} | ${z} | ${bouts} | ${notes.join('; ')} |`);
  }
  L.push('');
  L.push(`Crouch drop: the performer's standing hip height (the rest skeleton's hip height above its lowest foot point + 5 cm: the rest pose reads 4-7 cm under the standing frames of 16_15, 136_09 and 139_01: ${[...new Map(all.map((a) => [a.subject, a])).values()].map((a) => `subject ${a.subject} ${a.m3.restHipCm} cm`).join(', ')}) minus the hip height above the floor; standing reads about -2 to 2 cm. Feet gap: the right ankle's offset from the left across the facing (under 0 the feet cross). Wren speed: the performer's x Wren's leg / theirs. Direction: the hip travel over +-0.5 s against the pelvis facing (fwd under 35 deg, L / R 55-125 deg, back over 145 deg, still under 0.25 m/s); bouts hold one class for 0.6 s or more.`);
  L.push('');
  L.push('### Cycles of the M3 takes');
  L.push('');
  L.push('| Take | Cycle | s | T s | Speed (Wren) | Direction (deg vs facing) | Crouch drop cm | Speed change % | Feet gap min cm | Cadence | Stride | Slide cm | Seam cm | Heading drift deg | Pops | Steady | Score |');
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const a of all.filter((x) => x.cat !== 'wallPeek')) {
    for (const c of a.cycles) L.push(`| ${a.take} | ${c.foot.toUpperCase()} | ${s(c.a).toFixed(2)}-${s(c.b).toFixed(2)} | ${c.T} | ${c.speed} (${c.wrenSpeed}) | ${c.dir} (${c.relDeg}) | ${c.dropCm} | ${Math.round(c.accel * 100)} | ${c.minSepCm} | ${c.cadence} | ${c.stride} | ${c.slide} | ${c.seam} | ${c.dHeading} | ${c.pops} | ${c.steady ? 'yes' : 'no'} | ${c.score} |`);
    if (!a.cycles.length) L.push(`| ${a.take} | none: no full stride with clean contacts | | | | | | | | | | | | | | | |`);
  }
  L.push('');
  L.push('### Look-arounds (wall peek stand-ins)');
  L.push('');
  L.push('| Take | Side | s | Peak head yaw deg | Chest lean sideways / forward deg | Crouch drop cm | Hip speed m/s | Both feet down | Head back | Score |');
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const a of all.filter((x) => x.m3.looks)) for (const p of a.m3.looks) L.push(`| ${a.take} | ${p.side} | ${p.t0}-${p.t1} | ${p.peakYaw} | ${p.roll} / ${p.pitch} | ${p.dropCm} | ${p.v} | ${p.planted} | ${p.back ? 'yes' : 'no'} | ${p.score} |`);
  L.push('');
  L.push('### Intermediates and clips (build/mocap/m3/, build/mocap/clips/m3/)');
  L.push('');
  L.push('Intermediates: `build/mocap/m3/<slot>.json` (format `mocap-intermediate/1`, as retarget.mjs; the lateral loops carry');
  L.push('a facing root and a `travel` field, see "faceRoot" in m3.mjs). Clips: `build/mocap/clips/m3/<name>.ts` in the');
  L.push('CLIP-FORMAT.md shape, checked through the game\'s `keyedClip`; nothing is in src/ yet.');
  L.push('');
  for (const b of built) L.push(`- \`${b.slot}\` (${b.take} ${b.seconds.join('-')} s, ${b.frames} frames @60): slide ${b.slide}${b.seam ? `, seam ${b.seam}` : ''}${b.travel ? `, travel heading ${b.travel.headingDeg} deg, body turned ${b.travel.bodyTurnedDeg} deg off the travel root before faceRoot` : ''}${b.clip ? ` -> \`${b.clip}\`: ${b.clipNote}` : ' -> intermediate only'}.`);
  L.push('');
  L.push('### Findings');
  L.push('');
  for (const f of FINDINGS(by)) L.push(`- ${f}`);
  return L.join('\n');
}

/** Findings written from the numbers of this run (the takes are fixed; the numbers come from the analysis). */
function FINDINGS(by) {
  const F = [];
  const b = (t, dir) => by[t]?.m3.bouts.filter((x) => x.dir === dir) ?? [];
  const fmtB = (x) => `${x.t0}-${x.t1} s at ${x.v} m/s`;
  const drops = (t, dirs) => by[t]?.m3.bouts.filter((x) => dirs.includes(x.dir)).map((x) => x.dropCm).join(' / ') || '-';
  F.push(`Crouch walk: 136_09 / 136_10 ("Walk Crouched") are steady, straight crouch walks (${b('136_09', 'fwd').map(fmtB).join(', ') || '-'}; ${b('136_10', 'fwd').map(fmtB).join(', ') || '-'}), hips ${drops('136_09', ['fwd'])} / ${drops('136_10', ['fwd'])} cm under standing, 0 core pops in 136_09. 136_09 starts standing and crouches at about 1.3 s; 136_10 starts crouched and stands up and turns at its end (10-11 s). At 0.75-0.85 m/s (Wren about the same) they fit the game's crouched sneak (0.8 m/s); the crouch walk (1.8) and crouch run (2.6 m/s) have no capture: played there, the stride would scale over 2x.`);
  F.push(`Sneak: the 139 "Sneaking" takes are a slow, wandering sneak (0.4-0.8 m/s), hips ${drops('139_29', ['fwd'])} cm (139_29) and ${drops('139_32', ['fwd'])} cm (139_32) down, the facing turning through large angles between pauses (139_32: ${by['139_32']?.m3.bouts.filter((x) => x.dir !== 'still').map((x) => x.turnDeg).join(' / ')} deg over its bouts). 139_32 has no steady cycle; 139_29 and 139_34 have a few (scores 12-17 against 136's 4-5). A second choice for the sneak, not the loop. 139_11 ("Run To Sneak") runs up to about 4 m/s and slows into a sneak within a second: too short for either loop.`);
  F.push(`Sprint: no take is named "sprint". The 127 "Run" takes are 1.2-1.4 s, one or two cycles, and still accelerating (top hip speed ${['127_06', '127_07', '127_08'].map((t) => `${t} ${by[t]?.m3.notes.find((n) => n.startsWith('top'))?.replace('top hip speed ', '')}`).join(', ')}); on Wren their cycles run 3.35-4.35 m/s; the pick and runner-up (4.0 / 4.35) play at 1.25 / 1.15x at the game's 5.0 m/s sprint. The lfoot / rfoot "pops" in 127_07 / 127_08 are the heel strike's slap (8-10 deg per frame for 3-4 frames), not glitches. 143_42 (two 4.6 m/s straights with a 180 deg turn) reads 0.26-0.49 s "cycles" (5-8 steps/s): its strikes are missed, so it is out.`);
  F.push(`Sprint start: ${['127_03', '127_04', '143_42'].filter((t) => by[t]?.start).map((t) => `${t} ${by[t].start.v0} -> ${by[t].start.vTop} m/s in ${by[t].start.time} s over ${by[t].start.dist} m, first foot ${by[t].start.firstFoot}`).join('; ')}. 127_03 is a clean standing start into a run (0 core pops); 127_04 walks first, then runs.`);
  F.push(`Strafe (walk): 143_40 walks sideways left (${b('143_40', 'L').map(fmtB).join(', ') || '-'}) then right (${b('143_40', 'R').map(fmtB).join(', ') || '-'}) facing one way, but crosses its feet every step (feet gap down to -24 to -30 cm: a crossover side walk) and runs at 1.4-1.5 m/s on Wren, twice the game's aimed strafe (0.7 m/s), whose glide never crosses the feet. 69_56 (right) and 69_59 (left) step sideways without crossing (gap 8.6-13.7 cm) at 0.4-0.55 m/s on Wren in a step-together rhythm (the hip speed pulses 30-70 % within a cycle) and turn their facing about 90 deg in the middle of the take: one performer for both sides, played at about 1.35-1.45x for the strafe. No jogging strafe exists on the site: 127_13 / 127_14 "Run Side Step Left / Right" travel forward (${by['127_13']?.cycles.map((c) => c.relDeg).join(', ')} / ${by['127_14']?.cycles.map((c) => c.relDeg).join(', ')} deg off the facing): a sidestep dodge inside a run, not a strafe.`);
  F.push(`Wall side-step, standing: no wall take exists; the 69 sideways steps (0.45-0.5 m/s on Wren) are the nearest to the game's standing wall slide (0.35 m/s at full stick), played at about 0.75x. Crouched: 139_14 / 139_15 ("Sneak Sideways") side-step in a crouch (139_15 hips ${drops('139_15', ['L', 'R'])} cm down), right then left, the travel 60-70 deg off the facing (a diagonal sidestep, not square to the body), the left run crossing the feet (gap down to -8 cm); 0.8-0.9 m/s, so at the game's crouched 0.5 m/s they play at about 0.6x (under the 0.8 the stride scale looks right at). Both are free-standing (no wall behind the performer): the arms are the performer's own, not a wall pose.`);
  F.push('Wall peek: nothing on the site is a back-to-wall peek. 139_04 (standing, dipping 10-16 cm in the bigger looks) and 139_01 (crouched, 10-28 cm) turn the head 64-113 deg off the pelvis with the feet planted, the chest bent 30-70 deg forward and leaning up to 40 deg sideways into the look: a look-around, not a lean past a corner. Usable only as a head / chest turn stand-in; the lean out past the edge stays hand-keyed or procedural.');
  F.push('Slide on the sideways cycles stays 2.3-3.2 cm after the de-slide (the forward cycles 0.7-0.9): the de-slide pins the ankle while the foot is flat, and side-steps land and push off on the ball / edge of the foot. Frame rate: every M3 take is 120 fps (the subject 77 creeping takes were skipped at 60 fps).');
  return F;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const rig = wrenRig();
  mkdirSync(M3_OUT, { recursive: true });
  mkdirSync(M3_CLIPS, { recursive: true });
  let keyedClip = null;
  try { ({ keyedClip } = await import('../../src/anim/keyed.ts')); } catch (e) { console.warn(`keyedClip check skipped (run with --import ./scripts/operators/ts-resolve.mjs): ${e.message}`); }
  // 1. analysis
  const all = [];
  for (const e of M3) {
    if (!existsSync(path.join(CACHE, `${e.take}.amc`))) { console.warn(`skip ${e.take}: not in .mocap-cache`); continue; }
    const a = analyzeTake(e);
    a.cat = e.cat;
    const m = motionOf(e.take);
    tagCycles(a, m);
    a.m3 = { bouts: m.bouts, restHipCm: m.restHipCm, notes: [] };
    if (e.cat === 'wallPeek') a.m3.looks = lookArounds(m);
    a.m3.motion = m;
    all.push(a);
    console.log(`${a.take}: ${a.gait} ${a.speedPlateau} m/s, cycles ${a.nSteady}/${a.cycles.length} [${a.cycles.map((c) => `${c.dir}${c.relDeg} ${c.speed}`).join(', ')}], bouts ${m.bouts.map((b) => `${b.t0}-${b.t1} ${b.dir} ${b.v} d${b.dropCm}`).join('; ')}`);
  }
  // per-take notes on what makes a take unusable for its family
  for (const a of all) {
    const moving = a.m3.bouts.filter((b) => b.dir !== 'still');
    const want = { crouch: 'fwd', sneak: 'fwd', sprint: 'fwd', sprintStart: 'fwd', strafe: 'L|R', strafeRun: 'L|R', wallStep: 'L|R' }[a.cat];
    if (want) {
      const ok = a.cycles.filter((c) => want.split('|').includes(c.dir));
      if (!ok.length) a.m3.notes.push(`no clean ${want === 'fwd' ? 'forward' : 'sideways'} cycle`);
      if (a.cat === 'strafeRun' && a.cycles.every((c) => c.dir === 'fwd')) a.m3.notes.push('travels forward: a run with a sidestep dodge, not a strafe');
    }
    if (a.cat === 'sprint' || a.cat === 'sprintStart') a.m3.notes.push(`top hip speed ${r2(Math.max(...a.m3.motion.speed))} m/s`);
    if (moving.length && ['sneak', 'wallStep'].includes(a.cat)) a.m3.notes.push(`facing turns ${moving.map((b) => b.turnDeg).join(' / ')} deg over the bouts`);
  }
  // 2. picks per game clip
  const clips = [];
  const crouch = rankCycles(all, ['crouch', 'sneak'], (c) => (c.dir !== 'fwd' || c.dropCm < 8 || !c.steady ? null : 2 * Math.max(0, 12 - c.dropCm) + speedFit(c, TARGET.sneak)));
  // a sprint cycle under 0.55 s is a missed strike (two steps read as one cycle: 143_42's 0.39 s "cycles"); one the game
  // would play over 1.3x its speed is dropped; the foot's 8-10 deg frames at a sprint's heel strike (127_07 / 127_08,
  // 3-4 frames in a row on lfoot / rfoot) are the strike's slap, not glitches, so they do not count as pops here
  const strikePops = (a, c) => new Set(a.popList.filter((p) => /foot$/.test(p.bone) && p.deg < 10.5 && p.frame >= c.a && p.frame <= c.b).map((p) => p.frame)).size;
  const sprint = rankCycles(all, ['sprint', 'sprintStart'], (c, a) => (c.dir !== 'fwd' || c.T < 0.55 || c.wrenSpeed * 1.3 < TARGET.sprint ? null
    : 30 * Math.abs(c.accel) + speedFit(c, TARGET.sprint) - 5 * strikePops(a, c)));
  // sideways: off 90 deg, the game's speed, feet crossing (the game's aimed glide never crosses them), crouched or not
  const lat = (cats, side, target, crouched) => rankCycles(all, cats, (c) => (c.dir !== side || (crouched !== undefined && (c.dropCm >= 8) !== crouched) ? null
    : 0.3 * Math.abs(Math.abs(c.relDeg) - 90) + speedFit(c, target) + (c.minSepCm < 0 ? 10 : 0)));
  const strafeL = lat(['strafe'], 'L', TARGET.strafe, false), strafeR = lat(['strafe'], 'R', TARGET.strafe, false);
  const strafe = pairBySubject(strafeL, strafeR);
  const wallL = lat(['strafe', 'wallStep'], 'L', TARGET.wallStand, false), wallR = lat(['strafe', 'wallStep'], 'R', TARGET.wallStand, false);
  const wall = pairBySubject(wallL, wallR);
  const wallCL = lat(['strafe', 'wallStep'], 'L', TARGET.wallCrouch, true), wallCR = lat(['strafe', 'wallStep'], 'R', TARGET.wallCrouch, true);
  const wallC = pairBySubject(wallCL, wallCR);
  const looks = [];
  for (const a of all.filter((x) => x.m3.looks)) for (const p of a.m3.looks) looks.push({ a, p });
  looks.sort((x, y) => x.p.score - y.p.score);
  const starts = all.filter((a) => a.start?.fromRest && ['sprintStart', 'sprint'].includes(a.cat) && a.start.vTop > 3.5).sort((p, q) => p.start.score - q.start.score);
  const cyc = (x) => (x ? `${x.a.take} ${x.c.foot.toUpperCase()}-strike cycle ${s(x.c.a).toFixed(2)}-${s(x.c.b).toFixed(2)} s (score ${x.score})` : null);
  const other = (list, x) => list.find((y) => y !== x);
  const usableCycle = (x) => (x ? `${x.c.T} s cycle (loop); ${x.a.m3.bouts.filter((b) => b.dir === x.c.dir).map((b) => `${b.dur} s bout`).join(', ') || 'one cycle'}` : null);
  const cycWhy = (x) => (x ? `${x.c.speed} m/s (Wren ${x.c.wrenSpeed}), ${x.c.cadence} steps/s, stride ${x.c.stride} m, direction ${x.c.relDeg} deg off the facing, crouch drop ${x.c.dropCm} cm, speed change ${Math.round(x.c.accel * 100)} %, feet gap min ${x.c.minSepCm} cm${x.c.minSepCm < 0 ? ' (cross)' : ''}, slide ${x.c.slide} cm, seam ${x.c.seam} cm, ${x.c.pops} pops, heading drift ${x.c.dHeading} deg` : '');
  const plan = [];
  const addLoop = (clip, list, x, slot, emitAs, note = '') => {
    clips.push({ clip, pick: cyc(x), runner: cyc(other(list, x)), usable: usableCycle(x), why: (x ? cycWhy(x) : 'no candidate cycle') + note, slot });
    if (x) plan.push({ slot, kind: 'loop', choice: { take: x.c ? x.a.take : null, segment: [x.c.a, x.c.b], foot: x.c.foot, loop: true }, a: x.a, emitAs });
  };
  addLoop(`crouch walk loop (fits the crouched sneak, ${TARGET.sneak} m/s)`, crouch, crouch[0], 'crouch_walk', { file: 'crouch_walk.ts', name: 'crouch_walk', kind: 'cycle', gait: 'walk', ownTrack: true },
    `. Game: sneak ${TARGET.sneak}, crouch walk ${TARGET.crouchWalk}, crouch run 2.6 m/s; no crouched capture is faster than about 1 m/s, so the crouch walk / run bands would need a stride scale over 2 (only the sneak band fits). Emitted with the capture's own track half (not the walk's 0.0425), the walk's knee pole and planner lift`);
  addLoop(`sprint loop (game ${TARGET.sprint} m/s)`, sprint, sprint[0], 'sprint', { file: 'sprint.ts', name: 'sprint', kind: 'cycle', gait: 'run' },
    '. The run takes are still accelerating: the loop seam carries the speed change; emitted with the run\'s track half / knee pole / planner lift (emit.mjs run values)');
  {
    const x = starts[0];
    clips.push({ clip: 'sprint start (from standing)', pick: x ? `${x.take} ${x.start.v0} -> ${x.start.vTop} m/s, ${x.start.t0}-${x.start.t1} s (score ${x.start.score})` : null, runner: starts[1] ? `${starts[1].take} (score ${starts[1].start.score})` : '-', usable: x ? `${r2(s(x.start.segment[1] - x.start.segment[0]))} s one-shot` : null, why: x ? `${x.start.time} s over ${x.start.dist} m, ${x.start.steps} steps, first foot ${x.start.firstFoot}` : 'none', slot: 'sprint_start' });
    if (x) plan.push({ slot: 'sprint_start', kind: 'start', choice: { take: x.take, segment: x.start.segment, loop: false }, a: x, emitAs: { file: 'sprint_start.ts', name: 'sprint_start', kind: 'start', typed: true, gait: 'run', seconds: 'MOCAP_SPRINT_START_SECONDS' } });
  }
  const latNote = '. Lateral cycle: the clip format has no sideways cycle yet (CLIP-FORMAT cycles travel along +z): intermediate only, root turned to the body facing (faceRoot)';
  // (mocap-trial-2, strafe) the strafe pair is emitted as sideways cycles (CLIP-FORMAT `travel` -x / +x); the wall side-steps stay intermediates
  const strafeNote = '. Sideways cycle: root turned to the body facing (faceRoot), then its travel onto the x axis (emit.mjs `travel`)';
  const STRAFE_EMIT = {
    strafe_walk_L: { file: 'strafe_l.ts', name: 'strafe_l', kind: 'cycle', gait: 'strafe', travel: '-x' },
    strafe_walk_R: { file: 'strafe_r.ts', name: 'strafe_r', kind: 'cycle', gait: 'strafe', travel: '+x' },
  };
  for (const [clip, list, x, slot] of [[`strafe left (aimed, ${TARGET.strafe} m/s)`, strafeL, strafe.l, 'strafe_walk_L'], [`strafe right (aimed, ${TARGET.strafe} m/s)`, strafeR, strafe.r, 'strafe_walk_R'],
    [`wall side-step left, standing (${TARGET.wallStand} m/s)`, wallL, wall.l, 'wall_step_L'], [`wall side-step right, standing (${TARGET.wallStand} m/s)`, wallR, wall.r, 'wall_step_R'],
    [`wall side-step left, crouched (${TARGET.wallCrouch} m/s)`, wallCL, wallC.l, 'wall_crouch_step_L'], [`wall side-step right, crouched (${TARGET.wallCrouch} m/s)`, wallCR, wallC.r, 'wall_crouch_step_R']]) {
    clips.push({ clip, pick: cyc(x), runner: cyc(other(list, x)), usable: usableCycle(x), why: (x ? cycWhy(x) : 'no candidate cycle') + (x ? (STRAFE_EMIT[slot] ? strafeNote : latNote) : ''), slot });
    if (x) plan.push({ slot, kind: 'loop', lateral: true, choice: { take: x.a.take, segment: [x.c.a, x.c.b], foot: x.c.foot, loop: true }, a: x.a, ...(STRAFE_EMIT[slot] ? { emitAs: STRAFE_EMIT[slot] } : {}) });
  }
  clips.push({ clip: 'strafe left / right (jog)', pick: null, runner: '-', usable: '-', why: 'no jogging strafe on the site; 127_13 / 127_14 are forward runs with a dodge (see findings): mirror / speed up the walk strafe or keep the procedural strafe', slot: null });
  for (const side of ['L', 'R']) {
    const list = looks.filter((x) => x.p.side === side);
    const x = list[0];
    const slot = `wall_peek_${side}`;
    clips.push({ clip: `wall peek ${side === 'L' ? 'left' : 'right'} (stand-in)`, pick: x ? `${x.a.take} look ${side} ${x.p.t0}-${x.p.t1} s (score ${x.p.score})` : null, runner: list[1] ? `${list[1].a.take} ${list[1].p.t0}-${list[1].p.t1} s (score ${list[1].p.score})` : '-', usable: x ? `${x.p.dur} s one-shot` : null, why: x ? `head ${x.p.peakYaw} deg off the pelvis, chest lean ${x.p.roll} deg sideways / ${x.p.pitch} forward, crouch drop ${x.p.dropCm} cm, hips ${x.p.v} m/s, both feet down ${Math.round(x.p.planted * 100)} %. A look-around, not a lean past a corner` : 'none', slot });
    if (x) plan.push({ slot, kind: 'start', choice: { take: x.a.take, segment: x.p.segment, loop: false }, a: x.a, peek: x.p, emitAs: { file: `wall_peek_${side.toLowerCase()}.ts`, name: `wall_peek_${side.toLowerCase()}`, kind: 'start', typed: true, gait: 'walk', seconds: `MOCAP_WALL_PEEK_${side}_SECONDS` } });
  }
  // 3. intermediates and clips
  const built = [];
  const report = [];
  for (const p of plan) {
    const d = buildSlot(rig, { slot: p.slot, kind: p.kind }, p.choice, '', p.a);
    d.wren.scaleHeight = Math.round(rig.height / p.a.stature * 1e4) / 1e4;
    if (p.lateral) faceRoot(d);
    writeFileSync(path.join(M3_OUT, `${p.slot}.json`), JSON.stringify(d));
    const q = d.quality;
    const b = { slot: p.slot, take: p.choice.take, seconds: d.source.seconds, frames: d.frames, slide: `${q.slideBeforeCm.med}/${q.slideBeforeCm.max} -> ${q.slideAfterCm.med}/${q.slideAfterCm.max} cm`, seam: q.seamAfter ? `${q.seamBefore.pelCm} cm / ${q.seamBefore.maxDeg} deg (${q.seamBefore.joint}) -> step ${q.seamAfter.stepCm} cm (typical ${q.seamAfter.typicalStepCm})` : null, travel: d.travel ?? null };
    if (p.emitAs) {
      const spec = { ...p.emitAs };
      const an = p.peek ? { takes: [{ take: p.choice.take, start: { t0: p.choice.segment[0] / FPS } }] } : { takes: all };
      const out = spec.kind === 'cycle' ? emitCycle(d, rig, spec) : emitOneShot(d, rig, spec, an);
      if (spec.ownTrack) {
        // emitCycle moves the feet to the gait's TRACK_HALF (the walk's 0.0425, set against the knee-gap rule for takes
        // landing on the midline); a crouch walk's own track is wider, so it is put back as captured
        const dh = out.def.half - out.report.takeHalf;
        for (let i = 0; i < out.def.feet.length; i += 10) { out.def.feet[i] += dh; out.def.feet[i + 5] -= dh; }
        out.def.half = out.report.takeHalf;
      }
      let src = moduleSource(spec, d, out).replace(`by scripts/mocap/emit.mjs from build/mocap/${d.slot}.json`, `by scripts/mocap/m3.mjs (emit.mjs) from build/mocap/m3/${d.slot}.json`)
        .replace('(docs/mocap-trial/TAKES.md "Rerun")', '(docs/mocap-trial/TAKES.md "M3 takes")');
      if (p.peek) src = src.replace('from the first push', 'from the segment start');
      const file = path.join(M3_CLIPS, spec.file);
      writeFileSync(file, src);
      const notes = [];
      if (keyedClip) { const clip = keyedClip(out.def); notes.push(`keyedClip ok (${clip.frames} frames${clip.feet ? ', feet' : ''})`); }
      if (spec.kind === 'cycle') {
        const r = out.report;
        const gameV = p.slot === 'sprint' ? TARGET.sprint : spec.travel ? TARGET.strafe : TARGET.sneak;
        notes.push(`Wren ${r.speed.toFixed(2)} m/s, stride ${r.stride.toFixed(2)} m, cycle ${r.cycle.toFixed(3)} s, duty ${out.def.duty.toFixed(3)} (the take's contact ${r.warpedDuty.toFixed(3)}), capture lift ${(r.liftH * 100).toFixed(1)} cm (liftH written ${out.def.liftH}), the take's half ${r.takeHalf.toFixed(3)} (written ${r2(out.def.half * 1000) / 1000}), knee pole ${out.def.kneeOut}; at the game's ${gameV} m/s the clip plays at ${(gameV / r.speed).toFixed(2)}x its captured speed`);
        if (spec.travel) notes.push(`travel ${spec.travel} (the take's travel turned ${r.travelTurnDeg.toFixed(1)} deg onto the axis), game / clip stride ${r.strideScale.map((x) => x.toFixed(2)).join('-')} over 0.4-0.9 m/s`);
        notes.push(seamNote(out));
      } else notes.push(`${out.def.frames} frames, ${out.seconds.toFixed(2)} s`);
      b.clip = `clips/m3/${spec.file}`;
      b.clipNote = notes.join('; ');
      report.push({ file: `m3/${spec.file}`, slot: p.slot, notes });
    }
    built.push(b);
    const c = clips.find((x) => x.slot === p.slot);
    if (c) c.built = b.clip ? `\`${b.clip}\`` : `\`m3/${p.slot}.json\``;
    console.log(`${p.slot}: ${b.take} ${b.frames} f | slide ${b.slide}${b.seam ? ` | seam ${b.seam}` : ''}${b.clip ? ` | ${b.clip}: ${b.clipNote}` : ''}`);
  }
  writeFileSync(path.join(M3_CLIPS, 'report.json'), JSON.stringify(report, null, 1));
  for (const a of all) delete a.m3.motion;
  writeFileSync(path.join(M3_OUT, 'analysis.json'), JSON.stringify({ takes: all, clips }, null, 1));
  writeSection('m3', markdown(all, clips, built));
  for (const c of clips) console.log(`${c.clip}: ${c.pick ?? 'none'} | ${c.usable ?? '-'}`);
}
