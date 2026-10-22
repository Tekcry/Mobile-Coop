// (mocap-trial) Phase 2: the neutral intermediates (build/mocap/<slot>.json) -> Wren clips in the keyed-clip format
// (docs/mocap-trial/CLIP-FORMAT.md), written as TS modules matching src/anim/clips/mocap/<name>.ts into
// build/mocap/clips/ (the job lead moves them into src). Extra slots the format has no file for go to clips/extra/,
// the runner-up loops to clips/alt/.
//   node --import ./scripts/operators/ts-resolve.mjs scripts/mocap/emit.mjs [--no-check]
// The check builds every clip through the game's own `keyedClip` (src/anim/keyed.ts; read only) and verifies the
// loops close, the planted feet fall back at exactly the clip's stride and the arrays have the right lengths.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUT, wrenRig, fkWren, worldOf } from './retarget.mjs';
import { v3, q4, R2D, wrapPi } from './math.mjs';

const CLIPS = path.join(OUT, 'clips');
const BODY_H = 1.75;
const K_BODY = 1.68 / BODY_H;
const CYCLE_FRAMES = 48;
const ONESHOT_FPS = 40;
const KNEE_OUT = { walk: -0.03, jog: -0.045, run: -0.045 };
/** The game's stride per cycle (m) at its speeds (CLIP-FORMAT.md), for the per-clip scale report. */
const GAME_STRIDE = [[1.4, 1.16], [2.1, 1.44], [3.0, 2.04], [3.8, 2.42], [4.4, 2.6]];
const BANDS = { walk: [1.4, 2.1], jog: [2.6, 3.3], run: [4.2, 4.4] };
const gameStride = (v) => {
  const t = GAME_STRIDE;
  if (v <= t[0][0]) return t[0][1] * v / t[0][0];
  for (let i = 1; i < t.length; i++) if (v <= t[i][0]) { const u = (v - t[i - 1][0]) / (t[i][0] - t[i - 1][0]); return t[i - 1][1] + u * (t[i][1] - t[i - 1][1]); }
  return t[t.length - 1][1];
};

/** Which intermediate fills which clip file. */
export const FILES = [
  { file: 'walk.ts', slot: 'walk_loop', name: 'walk', kind: 'cycle', gait: 'walk' },
  { file: 'jog.ts', slot: 'jog_loop', name: 'jog', kind: 'cycle', gait: 'jog' },
  { file: 'run.ts', slot: 'run_loop', name: 'run', kind: 'cycle', gait: 'run' },
  { file: 'turn_in_place.ts', slot: 'pivot180_R', name: 'turn_in_place', kind: 'turn', turnDeg: 90, typed: true },
  { file: 'turn_move_l.ts', slot: 'walk_turn90_L', name: 'turn_move_l', kind: 'turn', typed: true },
  { file: 'turn_move_r.ts', slot: 'walk_turn90_R', name: 'turn_move_r', kind: 'turn', typed: true },
  { file: 'start.ts', slot: 'walk_start', name: 'start', kind: 'start', typed: true, seconds: 'MOCAP_START_SECONDS' },
  { file: 'stop.ts', slot: 'walk_stop', name: 'stop', kind: 'stop', typed: true, seconds: 'MOCAP_STOP_SECONDS' },
  // runner-up loops and the slots the format has no file for yet
  { file: 'alt/walk.ts', slot: 'walk_loop_alt', name: 'walk', kind: 'cycle', gait: 'walk' },
  { file: 'alt/jog.ts', slot: 'jog_loop_alt', name: 'jog', kind: 'cycle', gait: 'jog' },
  { file: 'alt/run.ts', slot: 'run_loop_alt', name: 'run', kind: 'cycle', gait: 'run' },
  { file: 'extra/turn_jog_l.ts', slot: 'jog_turn90_L', name: 'turn_jog_l', kind: 'turn', typed: true },
  { file: 'extra/turn_jog_r.ts', slot: 'jog_turn90_R', name: 'turn_jog_r', kind: 'turn', typed: true },
  { file: 'extra/turn_run_l.ts', slot: 'run_turn90_L', name: 'turn_run_l', kind: 'turn', typed: true },
  { file: 'extra/turn_run_r.ts', slot: 'run_turn90_R', name: 'turn_run_r', kind: 'turn', typed: true },
  { file: 'extra/turn_in_place_l.ts', slot: 'pivot180_L', name: 'turn_in_place_l', kind: 'turn', turnDeg: -90, typed: true },
  { file: 'extra/turnaround_r.ts', slot: 'pivot180_R', name: 'turnaround_r', kind: 'turn', typed: true },
  { file: 'extra/turnaround_l.ts', slot: 'pivot180_L', name: 'turnaround_l', kind: 'turn', typed: true },
  { file: 'extra/stop_jog.ts', slot: 'jog_stop', name: 'stop_jog', kind: 'stop', typed: true, seconds: 'MOCAP_STOP_JOG_SECONDS' },
  { file: 'extra/start_run.ts', slot: 'run_start_from_walk', name: 'start_run', kind: 'start', typed: true, seconds: 'MOCAP_START_RUN_SECONDS' },
];

/** Sampler over an intermediate: fractional frame -> pelvis, local rotations, root (cyclic for loops). */
function sampler(d, rig) {
  const n = d.frames;
  const J = d.joints;
  return (f) => {
    let i0 = Math.floor(f), u = f - i0;
    let i1 = i0 + 1;
    let lap0 = 0, lap1 = 0;
    if (d.loop) {
      lap0 = Math.floor(i0 / n); i0 -= lap0 * n;
      lap1 = Math.floor(i1 / n); i1 -= lap1 * n;
    } else {
      i0 = Math.max(0, Math.min(n - 1, i0)); i1 = Math.max(0, Math.min(n - 1, i1));
      if (i0 === i1) u = 0;
    }
    const pel = v3.lerp(d.pel[i0], d.pel[i1], u);
    const loc = {};
    J.forEach((nm, j) => { loc[nm] = q4.slerp(d.rot[i0][j], d.rot[i1][j], u); });
    let root;
    if (d.loop) {
      const z0 = d.cycleDistance * (i0 + lap0 * n) / n, z1 = d.cycleDistance * (i1 + lap1 * n) / n;
      root = { x: 0, z: z0 + (z1 - z0) * u, yaw: 0 };
    } else {
      const a = d.root[i0], b = d.root[i1];
      root = { x: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u, yaw: a[2] + (b[2] - a[2]) * u };
    }
    const contact = [d.contact[Math.round(f) % n]?.[0] ?? 0, d.contact[Math.round(f) % n]?.[1] ?? 0];
    if (!d.loop) { const k = Math.max(0, Math.min(n - 1, Math.round(f))); contact[0] = d.contact[k][0]; contact[1] = d.contact[k][1]; }
    return { pel, loc, root, contact };
  };
}

/** One output frame from a pose (root-frame pelvis and local rotations). */
function frameOut(rig, K, pel, loc, prev) {
  const qw = worldOf(rig, loc);
  const pos = fkWren(rig, pel, qw);
  const keepHemi = (key, q) => (prev?.[key] ? q4.align(q, prev[key]) : q);
  const q = {};
  for (const nm of ['pelvis', 'spine', 'chest', 'neck', 'head']) q[nm] = keepHemi(nm, q4.norm(loc[nm]));
  const cinv = q4.conj(qw.chest);
  const arm = [];
  for (const s of ['L', 'R']) for (const j of ['el', 'wr']) arm.push(...v3.scale(q4.rotate(cinv, v3.sub(pos[j + s], pos['sh' + s])), 1 / K));
  const pl = q4.rotate(qw.pelvis, [1, 0, 0]);
  const bindFoot = v3.sub(rig.bind.toeL, rig.bind.anL);
  const pitch0 = Math.atan2(-bindFoot[1], Math.hypot(bindFoot[0], bindFoot[2]));
  const foot = {};
  for (const s of ['L', 'R']) {
    const dvec = v3.sub(pos['toe' + s], pos['an' + s]);
    foot[s] = { an: pos['an' + s], pitch: Math.atan2(-dvec[1], Math.hypot(dvec[0], dvec[2])) - pitch0 };
  }
  return {
    pel: v3.scale(v3.sub(pel, rig.bind.pelvis), 1 / K), q, arm, foot, pos,
    yaw: Math.atan2(-pl[2], pl[0]), anRel: [v3.sub(pos.anL, pos.pelvis), v3.sub(pos.anR, pos.pelvis)],
  };
}

function halfOf(frames, K) {
  const my = Math.atan2(frames.reduce((s, f) => s + Math.sin(f.yaw), 0), frames.reduce((s, f) => s + Math.cos(f.yaw), 0));
  let h = 0;
  for (const f of frames) {
    const un = q4.yaw(-(f.yaw - my));
    h += (q4.rotate(un, f.anRel[1])[0] - q4.rotate(un, f.anRel[0])[0]) / 2 / K;
  }
  return h / frames.length;
}

/** A walk / jog / run cycle: phase-warped halves, root linear in phase, clip feet. */
export function emitCycle(d, rig, spec) {
  const K = rig.height / BODY_H;
  const n = d.frames;
  const rStrike = d.events.find((e) => e.foot === 'R' && e.type === 'strike')?.frame;
  if (!(rStrike > 0) || d.events.find((e) => e.foot === 'L' && e.type === 'strike')?.frame !== 0) throw new Error(`${d.slot}: needs a left strike at 0 and a right strike`);
  const S = d.cycleDistance;
  const at = sampler(d, rig);
  const P0 = [d.pel[0][0], 0, d.pel[0][2]];
  const N = CYCLE_FRAMES;
  const frames = [];
  const warp = (p) => (p < 0.5 ? (p / 0.5) * rStrike : rStrike + ((p - 0.5) / 0.5) * (n - rStrike));
  // contact shares from the take (frame flags), then the runtime's duty windows
  let cl = 0, cr = 0;
  for (let k = 0; k < n; k++) { cl += d.contact[k][0]; cr += d.contact[k][1]; }
  // the share after the warp: count on the warped samples
  let wl = 0, wr = 0;
  for (let i = 0; i < N; i++) { const s = at(warp(i / N)); wl += s.contact[0]; wr += s.contact[1]; }
  const duty = (wl + wr) / (2 * N);
  let prev = null;
  for (let i = 0; i < N; i++) {
    const p = i / N;
    const f = warp(p);
    const s = at(f);
    const pel = [s.pel[0] - P0[0], s.pel[1], s.pel[2] + S * (f / n - p) - P0[2]];
    const fr = frameOut(rig, K, pel, s.loc, prev);
    prev = fr.q;
    fr.p = p;
    fr.contact = { L: p < duty ? 1 : 0, R: ((p - 0.5 + 1) % 1) < duty ? 1 : 0 };
    frames.push(fr);
  }
  const ankleRest = rig.bind.anL[1];
  let liftH = 0;
  const feet = [];
  for (const fr of frames) {
    for (const s of ['L', 'R']) {
      const a = fr.foot[s].an;
      const lift = Math.max(0, a[1] - ankleRest);
      if (!fr.contact[s]) liftH = Math.max(liftH, lift);
      feet.push(a[0] / K, fr.contact[s] ? 0 : lift / K, a[2] / K, fr.foot[s].pitch, fr.contact[s]);
    }
  }
  const T = n / d.fps;
  const speed = S / T;
  const band = BANDS[spec.gait];
  const scales = band.map((v) => gameStride(v) / S);
  return {
    def: {
      name: `mocap_${spec.name}`, frames: N, duty, liftH: liftH / K, kneeOut: KNEE_OUT[spec.gait], half: halfOf(frames, K),
      pel: frames.flatMap((f) => f.pel), q: frames.flatMap((f) => [...f.q.pelvis, ...f.q.spine, ...f.q.chest, ...f.q.neck]),
      arm: frames.flatMap((f) => f.arm), head: frames.flatMap((f) => f.q.head), feet, stride: S / K,
    },
    report: {
      take: d.source.take, seconds: d.source.seconds, cycle: T, speed, stride: S, rStrikePhaseTake: rStrike / n,
      takeDuty: [cl / n, cr / n], strideScale: scales, liftH, pelvisYawMeanDeg: Math.atan2(frames.reduce((s, f) => s + Math.sin(f.yaw), 0), frames.reduce((s, f) => s + Math.cos(f.yaw), 0)) * R2D,
    },
    frames,
  };
}

/** A one-shot: sampled by the turned yaw (turns) or by time (starts, stops); root-relative, no feet. */
export function emitOneShot(d, rig, spec, an) {
  const K = rig.height / BODY_H;
  const n = d.frames;
  const at = sampler(d, rig);
  const fs = [];
  let seconds = null;
  if (spec.kind === 'turn') {
    const yaw = d.root.map((r) => r[2]);
    const total = yaw[n - 1] - yaw[0];
    const sgn = Math.sign(spec.turnDeg ?? total);
    // monotone envelope of the smoothed root yaw (the stride wobble is gone; this guards the inversion)
    const mono = [];
    for (let k = 0; k < n; k++) mono.push(k ? (sgn > 0 ? Math.max(mono[k - 1], yaw[k]) : Math.min(mono[k - 1], yaw[k])) : yaw[0]);
    const eps = 2 / R2D;
    let k0 = 0;
    while (k0 < n - 1 && Math.abs(mono[k0] - mono[0]) < eps) k0++;
    k0 = Math.max(0, k0 - 1);
    const goal = spec.turnDeg !== undefined ? mono[k0] + spec.turnDeg / R2D : mono[n - 1];
    let k1 = k0;
    if (spec.turnDeg !== undefined) { while (k1 < n - 1 && sgn * (mono[k1] - goal) < 0) k1++; }
    else { k1 = n - 1; while (k1 > k0 && Math.abs(mono[k1] - mono[n - 1]) < eps) k1--; k1 = Math.min(n - 1, k1 + 1); }
    const y0 = mono[k0], y1 = spec.turnDeg !== undefined ? Math.min(Math.abs(goal - y0), Math.abs(mono[k1] - y0)) * sgn + y0 : mono[k1];
    const N = Math.max(16, Math.round(((k1 - k0) / d.fps) * ONESHOT_FPS));
    for (let i = 0; i < N; i++) {
      const target = y0 + (y1 - y0) * (i / (N - 1));
      let k = k0;
      while (k < k1 && sgn * (mono[k + 1] - target) < 0) k++;
      const a = mono[k], b = mono[Math.min(n - 1, k + 1)];
      const u = Math.abs(b - a) > 1e-9 ? Math.max(0, Math.min(1, (target - a) / (b - a))) : 0;
      fs.push(k + u);
    }
    spec._turn = { turnedDeg: (y1 - y0) * R2D, takeSeconds: (k1 - k0) / d.fps };
  } else {
    // start: from the first push (the pace leaving rest); stop: from the braking; to the end of the segment
    const ta = an.takes.find((t) => t.take === d.source.take);
    const ev = spec.kind === 'start' ? ta.start : ta.stop;
    const k0 = Math.max(0, Math.round((ev.t0 * 120 - d.source.frames120[0]) / (120 / d.fps)));
    const k1 = n - 1;
    seconds = (k1 - k0) / d.fps;
    const N = Math.max(16, Math.round(seconds * ONESHOT_FPS) + 1);
    for (let i = 0; i < N; i++) fs.push(k0 + (k1 - k0) * (i / (N - 1)));
  }
  const frames = [];
  let prev = null;
  for (const f of fs) {
    const s = at(f);
    const fr = frameOut(rig, K, s.pel, s.loc, prev);
    prev = fr.q;
    fr.contact = { L: s.contact[0], R: s.contact[1] };
    frames.push(fr);
  }
  const ankleRest = rig.bind.anL[1];
  let liftH = 0, c = 0;
  for (const fr of frames) for (const s of ['L', 'R']) { c += fr.contact[s]; if (!fr.contact[s]) liftH = Math.max(liftH, fr.foot[s].an[1] - ankleRest); }
  return {
    def: {
      name: `mocap_${spec.name}`, frames: frames.length, duty: c / (2 * frames.length), liftH: Math.max(0, liftH) / K,
      kneeOut: KNEE_OUT.walk, half: halfOf(frames, K),
      pel: frames.flatMap((f) => f.pel), q: frames.flatMap((f) => [...f.q.pelvis, ...f.q.spine, ...f.q.chest, ...f.q.neck]),
      arm: frames.flatMap((f) => f.arm), head: frames.flatMap((f) => f.q.head),
    },
    seconds,
    report: { take: d.source.take, seconds: d.source.seconds, ...(spec._turn ?? {}), clipSeconds: seconds },
    frames,
  };
}

const r5 = (v) => Math.round(v * 1e5) / 1e5 || 0;

export function moduleSource(spec, d, out) {
  const def = out.def;
  const flat = (a) => a.map(r5).join(', ');
  const constName = `MOCAP_${spec.name.toUpperCase()}`;
  const head = `// GENERATED by scripts/mocap/emit.mjs from build/mocap/${d.slot}.json (no Blender: node retarget). Do not edit: rerun the
// pipeline (docs/mocap-trial/TAKES.md "Rerun"). Source: CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu),
// take ${d.source.take}, ${d.source.seconds[0]}-${d.source.seconds[1]} s (120 fps frames ${d.source.frames120[0]}-${d.source.frames120[1]}), converted onto Wren (${d.wren.height} m, leg scale
// ${d.wren.scaleLeg}). Body frame at 1.75 m (x right, y up, z forward), one row per frame. docs/mocap-trial/CLIP-FORMAT.md.
`;
  const body = `  name: '${def.name}',
  frames: ${def.frames},
  duty: ${r5(def.duty)},
  liftH: ${r5(def.liftH)},
  kneeOut: ${def.kneeOut},
  half: ${r5(def.half)},
  // pelvis offset from rest (x, y, z)
  pel: [${flat(def.pel)}],
  // local quaternions (x, y, z, w) of pelvis, spine, chest, neck
  q: [${flat(def.q)}],
  // elbow L, wrist L, elbow R, wrist R from the shoulder joint, chest frame
  arm: [${flat(def.arm)}],
  // head turn: the local quaternion (x, y, z, w) on the neck
  head: [${flat(def.head)}],
${def.feet ? `  // clip feet L then R: ankle x, lift y, z (root frame), foot pitch (rad, + heel up), contact
  feet: [${flat(def.feet)}],
  // the root's travel over one cycle
  stride: ${r5(def.stride)},
` : ''}`;
  if (!spec.typed) return `${head}import { keyedClip } from '../../keyed';\n\nexport const ${constName} = keyedClip({\n${body}});\n`;
  const secs = spec.seconds ? `/** The take's length (s): the clip plays over it from ${spec.kind === 'start' ? 'the first push' : 'the braking'}. */\nexport const ${spec.seconds} = ${r5(out.seconds)};\n` : '';
  return `${head}import { keyedClip } from '../../keyed';\nimport type { KeyedClip } from '../../keyed';\n\nexport const ${constName}: KeyedClip | null = keyedClip({\n${body}});\n${secs}`;
}

/** Checks on an emitted cycle: closure, planted-foot travel, ranges. */
function checkCycle(out) {
  const { def, frames } = out;
  const N = def.frames, F = def.feet;
  const notes = [];
  // closure: frame N-1 -> frame 0 step vs the median step (positions of the rig)
  const step = (a, b) => Math.sqrt(Object.keys(a.pos).reduce((s, k) => s + v3.dist(a.pos[k], b.pos[k]) ** 2, 0) / Object.keys(a.pos).length);
  const steps = frames.map((f, i) => step(f, frames[(i + 1) % N]));
  const seam = steps[N - 1], med = [...steps].sort((x, y) => x - y)[N >> 1], mx = Math.max(...steps.slice(0, N - 1));
  notes.push(`seam step ${(seam * 100).toFixed(1)} cm (median ${(med * 100).toFixed(1)}, max inside ${(mx * 100).toFixed(1)})`);
  // planted feet: z falls back at stride per cycle (per frame stride / N)
  const errs = [];
  for (let s = 0; s < 2; s++) for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    if (!F[i * 10 + s * 5 + 4] || !F[j * 10 + s * 5 + 4]) continue;
    // the clip is periodic in the root frame: a foot planted across the seam keeps falling back through it
    const dz = F[j * 10 + s * 5 + 2] - F[i * 10 + s * 5 + 2];
    const dx = F[j * 10 + s * 5] - F[i * 10 + s * 5];
    errs.push(Math.hypot(dz + def.stride / N, dx) * K_BODY * 100);
  }
  errs.sort((x, y) => x - y);
  notes.push(`planted foot vs the moving root: median ${errs[errs.length >> 1].toFixed(2)} / max ${errs[errs.length - 1].toFixed(2)} cm per frame over ${errs.length} planted frame pairs`);
  return notes;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const noCheck = process.argv.includes('--no-check');
  const rig = wrenRig();
  const an = JSON.parse(readFileSync(path.join(OUT, 'analysis.json'), 'utf8'));
  let keyedClip = null;
  if (!noCheck) {
    try { ({ keyedClip } = await import('../../src/anim/keyed.ts')); } catch (e) { console.warn(`check skipped (run with --import ./scripts/operators/ts-resolve.mjs): ${e.message}`); }
  }
  const report = [];
  for (const spec of FILES) {
    const src = path.join(OUT, `${spec.slot}.json`);
    if (!existsSync(src)) { console.warn(`skip ${spec.file}: no ${spec.slot}.json`); continue; }
    const d = JSON.parse(readFileSync(src, 'utf8'));
    const out = spec.kind === 'cycle' ? emitCycle(d, rig, spec) : emitOneShot(d, rig, { ...spec }, an);
    const file = path.join(CLIPS, spec.file);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, moduleSource(spec, d, out));
    const notes = [];
    if (keyedClip) {
      const clip = keyedClip(out.def);
      notes.push(`keyedClip ok (${clip.frames} frames${clip.feet ? ', feet' : ''})`);
    }
    if (spec.kind === 'cycle') notes.push(...checkCycle(out));
    const r = out.report;
    const line = spec.kind === 'cycle'
      ? `${spec.file}: ${d.slot} ${r.take} ${r.seconds.join('-')} s, Wren ${r.speed.toFixed(2)} m/s, stride ${r.stride.toFixed(2)} m, cycle ${r.cycle.toFixed(3)} s, R strike at ${r.rStrikePhaseTake.toFixed(3)} of the take cycle (warped to 0.5), duty ${out.def.duty.toFixed(3)}, liftH ${(r.liftH * 100).toFixed(1)} cm, half ${out.def.half.toFixed(3)}, game/clip stride ${r.strideScale.map((x) => x.toFixed(2)).join('-')} over the band, mean pelvis yaw ${r.pelvisYawMeanDeg.toFixed(1)} deg`
      : `${spec.file}: ${d.slot} ${r.take} ${r.seconds.join('-')} s, ${out.def.frames} frames${r.turnedDeg !== undefined ? `, turned ${r.turnedDeg.toFixed(1)} deg over ${r.takeSeconds.toFixed(2)} s of the take` : ''}${out.seconds ? `, ${out.seconds.toFixed(2)} s` : ''}`;
    report.push({ file: spec.file, line, notes });
    console.log(line);
    for (const nt of notes) console.log(`   ${nt}`);
  }
  writeFileSync(path.join(CLIPS, 'report.json'), JSON.stringify(report, null, 1));
  const L = ['## Clips (build/mocap/clips/, CLIP-FORMAT.md)', '',
    'Emitted by `emit.mjs` as TS modules matching `src/anim/clips/mocap/<name>.ts` (the job lead moves them into src);',
    '`alt/` holds the runner-up loops, `extra/` the slots the format has no file for yet. Each clip passed the game\'s',
    `own \`keyedClip\` (src/anim/keyed.ts)${keyedClip ? '' : ' (NOT checked on this run: run with the ts-resolve import)'}. Cycles: ${CYCLE_FRAMES} frames, phase-warped halves (left strike 0, right 0.5), the root`,
    'linear in phase (planted feet fall back at exactly `stride` per cycle), contacts written on the runtime\'s duty windows.',
    `One-shots: ${ONESHOT_FPS} samples per second of take, turns sampled by the turned heading, no \`feet\` (ignored for one-shots).`, ''];
  for (const r of report) L.push(`- \`${r.file}\`: ${r.line.replace(/^[^:]+: /, '')}${r.notes.length ? `. ${r.notes.join('; ')}` : ''}.`);
  const { writeSection } = await import('./takesdoc.mjs');
  writeSection('clips', L.join('\n'));
}
