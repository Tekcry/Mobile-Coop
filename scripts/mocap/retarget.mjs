// (mocap-trial) Neutral intermediates: each chosen CMU cycle / segment (build/mocap/analysis.json picks) retargeted
// onto Wren's joints (the game rig's bind pose, read from src/operators/operatorBody.ts through
// scripts/operators/export-joints.mjs), resampled to 60 fps, root-relative, loops seamed, feet de-slid.
//   node scripts/mocap/retarget.mjs [slot ...]     -> build/mocap/<slot>.json (all picked slots when none named)
//
// Retarget: every Wren joint J takes the world rotation of the CMU bone that spans the same segment (MAP), times a
// fixed rest correction (the shortest arc from Wren's bind segment direction onto the CMU rest direction), so at
// every frame each Wren segment points where the performer's segment points; the lengths are Wren's. The pelvis is
// placed so Wren's hip midpoint follows the performer's, scaled by the leg-length ratio (`scaleLeg`), so the feet
// land where the performer's land at Wren's size; then a vertical offset puts the flat foot's ankle at Wren's bind
// ankle height. Rotations in the file are bind-relative: at the bind pose every rotation is the identity, and a
// joint's world rotation (root frame) maps its bind segment onto the posed segment.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadTake, selfCheck, ROOT } from './asfamc.mjs';
import { footContacts, runsOf, runSlide, facing, samplePos, sampleQuat } from './gait.mjs';
import { v3, q4, unwrap, wrapPi, mean, median, R2D } from './math.mjs';

export const OUT = path.join(ROOT, 'build', 'mocap');
export const WREN_JSON = path.join(OUT, 'wren-joints.json');
export const OUT_FPS = 60;
/** The source line a CMU intermediate carries (`buildSlot` `licence`; a Mixamo build passes its own). */
export const CMU_LICENCE = 'CMU Graphics Lab Motion Capture Database, mocap.cs.cmu.edu (SOURCES.md)';

/** Wren joint -> the CMU bone whose world rotation drives the segment that starts at the joint. */
export const MAP = {
  pelvis: 'root', spine: 'upperback', chest: 'thorax', neck: 'upperneck', head: 'head',
  shL: 'lhumerus', elL: 'lradius', wrL: 'lhand', shR: 'rhumerus', elR: 'rradius', wrR: 'rhand',
  hipL: 'lfemur', knL: 'ltibia', anL: 'lfoot', toeL: 'ltoes', hipR: 'rfemur', knR: 'rtibia', anR: 'rfoot', toeR: 'rtoes',
};
/** The child joint that ends each driven segment (the rest correction aims this direction). */
export const SEG_END = { spine: 'chest', chest: 'neck', neck: 'head', shL: 'elL', elL: 'wrL', wrL: 'handL', shR: 'elR', elR: 'wrR', wrR: 'handR', hipL: 'knL', knL: 'anL', anL: 'toeL', hipR: 'knR', knR: 'anR', anR: 'toeR' };

export function wrenRig() {
  if (!existsSync(WREN_JSON)) {
    mkdirSync(OUT, { recursive: true });
    const r = spawnSync(process.execPath, ['--import', './scripts/operators/ts-resolve.mjs', 'scripts/operators/export-joints.mjs', WREN_JSON], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
    if (r.status !== 0) throw new Error(`export-joints failed: ${r.stderr}`);
  }
  const data = JSON.parse(readFileSync(WREN_JSON, 'utf8'));
  const op = data.operators.find((o) => o.id === 'wren');
  const joints = op.joints.map((j) => ({ name: j.name, parent: j.parent, pos: j.pos }));
  const bind = Object.fromEntries(joints.map((j) => [j.name, j.pos]));
  const parent = Object.fromEntries(joints.map((j) => [j.name, j.parent]));
  const leg = v3.dist(bind.hipL, bind.knL) + v3.dist(bind.knL, bind.anL);
  return { height: op.height, joints, names: joints.map((j) => j.name), bind, parent, leg };
}

/** Two-bone IK: hip fixed, ankle target; keeps the knee in the plane of the old knee. Returns the new knee. */
function ik2(hip, knee, ankle, target) {
  const a = v3.dist(hip, knee), b = v3.dist(knee, ankle);
  let d = v3.sub(target, hip);
  let L = v3.len(d);
  const maxL = (a + b) * 0.9995, minL = Math.abs(a - b) * 1.01;
  const Lc = Math.max(minL, Math.min(maxL, L));
  const dir = v3.norm(d);
  // pole: old knee off the hip-target line
  const kp = v3.sub(knee, hip);
  let pole = v3.sub(kp, v3.scale(dir, v3.dot(kp, dir)));
  if (v3.len(pole) < 1e-6) pole = [0, 0, 1];
  pole = v3.norm(pole);
  const x = (a * a - b * b + Lc * Lc) / (2 * Lc);
  const h = Math.sqrt(Math.max(0, a * a - x * x));
  return { knee: v3.add(hip, v3.add(v3.scale(dir, x), v3.scale(pole, h))), reach: L - Lc };
}

const smoothstep = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** Moving average with a window that shrinks symmetrically at the ends (the ends keep their values). */
function smoothSym(arr, w) {
  const n = arr.length;
  return arr.map((_, i) => {
    const k = Math.min(w, i, n - 1 - i);
    let s = 0;
    for (let j = i - k; j <= i + k; j++) s += arr[j];
    return s / (2 * k + 1);
  });
}

/** Forward kinematics of Wren in the root frame from the pelvis position and the world (root-frame) rotations. */
export function fkWren(rig, pel, qw) {
  const pos = {};
  for (const j of rig.joints) {
    if (j.name === 'root') { pos.root = [0, 0, 0]; continue; }
    if (j.name === 'body') { pos.body = v3.add(pel, v3.sub(rig.bind.body, rig.bind.pelvis)); continue; }
    if (j.name === 'pelvis') { pos.pelvis = pel; continue; }
    const p = j.parent;
    pos[j.name] = v3.add(pos[p], q4.rotate(qw[p], v3.sub(rig.bind[j.name], rig.bind[p])));
  }
  return pos;
}

/** World (root-frame) rotations from local ones, along the Wren hierarchy (root and body are identity). */
export function worldOf(rig, loc) {
  const w = {};
  for (const n of rig.names) {
    const p = rig.parent[n];
    w[n] = p ? q4.norm(q4.mul(w[p], loc[n])) : loc[n];
  }
  return w;
}
export function localOf(rig, w) {
  const l = {};
  for (const n of rig.names) {
    const p = rig.parent[n];
    l[n] = p ? q4.norm(q4.mul(q4.conj(w[p]), w[n])) : w[n];
  }
  return l;
}

/**
 * Retarget a take at 120 fps: Wren world rotations (game frame, performer heading) and pelvis positions. `load` reads
 * the take (default the CMU `loadTake`; mixamoTake.mjs `mixamoLoader()` gives a Mixamo take in the same shape).
 */
export function retargetTake(rig, take, { load = loadTake } = {}) {
  const t = load(take);
  const chk = selfCheck(t);
  const sk = t.skel;
  const mt = sk.metres;
  const cmuLeg = (sk.bones.get('lfemur').length + sk.bones.get('ltibia').length) * mt;
  const scaleLeg = rig.leg / cmuLeg;
  // rest corrections
  const fix = {};
  for (const [j, b] of Object.entries(MAP)) {
    const end = SEG_END[j];
    if (!end || j === 'pelvis') { fix[j] = q4.I(); continue; }
    const dw = v3.sub(rig.bind[end], rig.bind[j]);
    const dc = [-sk.bones.get(b).dir[0], sk.bones.get(b).dir[1], sk.bones.get(b).dir[2]];
    fix[j] = q4.arc(dw, dc);
  }
  const n = t.frames;
  const qw = {};
  for (const name of rig.names) {
    if (name === 'root' || name === 'body') { qw[name] = Array.from({ length: n }, () => q4.I()); continue; }
    const b = MAP[name];
    if (b) {
      const src = t.quat.get(b);
      const arr = [];
      for (let i = 0; i < n; i++) {
        const q = q4.norm(q4.mul(src[i], fix[name]));
        arr.push(arr.length ? q4.align(q, arr[arr.length - 1]) : q);
      }
      qw[name] = arr;
    }
  }
  // the hands follow the wrist segment (no finger data worth using)
  qw.handL = qw.wrL; qw.handR = qw.wrR;
  const hipOff = v3.sub(v3.scale(v3.add(rig.bind.hipL, rig.bind.hipR), 0.5), rig.bind.pelvis);
  const lh = t.pos.get('lhipjoint'), rh = t.pos.get('rhipjoint');
  const pel = [];
  for (let i = 0; i < n; i++) {
    const mid = v3.scale(v3.add(lh[i], rh[i]), 0.5);
    const p = [mid[0] * scaleLeg, (mid[1] - chk.floor) * scaleLeg, mid[2] * scaleLeg];
    pel.push(v3.sub(p, q4.rotate(qw.pelvis[i], hipOff)));
  }
  // check: every driven Wren segment points along the performer's segment (degrees, worst over the take)
  let dirErrDeg = 0;
  for (const [j, e] of Object.entries(SEG_END)) {
    const b = MAP[j], pb = sk.parent.get(b);
    const dw0 = v3.norm(v3.sub(rig.bind[e], rig.bind[j]));
    for (let i = 0; i < n; i += 9) {
      const dw = q4.rotate(qw[j][i], dw0), dc = v3.norm(v3.sub(t.pos.get(b)[i], t.pos.get(pb)[i]));
      dirErrDeg = Math.max(dirErrDeg, Math.acos(Math.min(1, v3.dot(dw, dc))) * R2D);
    }
  }
  return { t, chk, qw, pel, scaleLeg, cmuLeg, fix, dirErrDeg: Math.round(dirErrDeg * 1000) / 1000 };
}

/** Contacts on Wren's feet (world positions), per foot. */
function wrenContacts(world, fps) {
  const out = {};
  for (const f of ['L', 'R']) {
    const ankle = world.map((p) => p[`an${f}`]), ball = world.map((p) => p[`toe${f}`]);
    out[f] = footContacts(ankle, ball, fps, { floor: 0 });
    out[f].ankle = ankle; out[f].ball = ball;
    out[f].runs = runsOf(out[f].flags);
  }
  return out;
}

/** Per-run weights and values: `val(i)` inside [a, b], eased to 0 over `ease` frames outside the run. */
function easeRun(n, a, b, ease, val, add) {
  for (let i = a - ease; i <= b + ease; i++) {
    if (i < 0 || i >= n) continue;
    const w = i < a ? smoothstep((i - (a - ease - 1)) / (ease + 1)) : i > b ? smoothstep(((b + ease + 1) - i) / (ease + 1)) : 1;
    add(i, val(Math.max(a, Math.min(b, i))), w);
  }
}

/**
 * Foot yaw lock: the CMU feet yaw a few degrees about the ankle while flat (marker noise), which drags the ball
 * sideways under a locked ankle. While the foot is flat (or the ball down when it never is) its heading is held at
 * the settled frame's, carried through the rest of the run and eased out; the toe rides along. A run whose foot turns
 * more than PIVOT_DEG while held is a real pivot (turns, turnarounds): its yaw is left alone and returned, and the
 * translation lock then pins the ball (the pivot point) instead of the ankle.
 */
const PIVOT_DEG = 15;
function lockFootYaw(rig, frames, rootAt, ease) {
  const n = frames.length;
  const world = frames.map((f, k) => toWorld(f.pos, rootAt(k)));
  const C = wrenContacts(world, OUT_FPS);
  const pivots = { L: [], R: [] };
  for (const f of ['L', 'R']) {
    const c = C[f];
    const yawOf = (k) => rootAt(k).yaw + facing(frames[k].qw[`an${f}`]);
    const corr = new Array(n).fill(0);
    for (const [a, b] of c.runs) {
      let held = [];
      for (let i = a; i <= b; i++) if (c.ay[i] < c.aRef + 0.02 && c.by[i] < c.bRef + 0.015) held.push(i);
      if (!held.length) for (let i = a; i <= b; i++) if (c.by[i] < c.bRef + 0.015) held.push(i);
      if (!held.length) continue;
      let best = held[0];
      for (const i of held) if (c.va[i] + c.vb[i] < c.va[best] + c.vb[best]) best = i;
      const y0 = yawOf(best), h0 = held[0], h1 = held[held.length - 1];
      const ys = held.map((i) => wrapPi(yawOf(i) - y0));
      if ((Math.max(...ys) - Math.min(...ys)) * R2D > PIVOT_DEG) { pivots[f].push([a, b]); continue; }
      const err = (i) => wrapPi(y0 - yawOf(Math.max(h0, Math.min(h1, i))));
      easeRun(n, a, b, ease, err, (i, v, w) => { corr[i] += v * w; });
    }
    for (let k = 0; k < n; k++) {
      if (Math.abs(corr[k]) < 1e-6) continue;
      const yq = q4.yaw(corr[k]);
      const fr = frames[k];
      fr.qw[`an${f}`] = q4.norm(q4.mul(yq, fr.qw[`an${f}`]));
      fr.qw[`toe${f}`] = q4.norm(q4.mul(yq, fr.qw[`toe${f}`]));
      fr.pos = fkWren(rig, fr.pel, fr.qw);
    }
  }
  return pivots;
}

/**
 * Foot lock: per contact run, a horizontal correction that holds the flat foot's ankle (then the ball after heel
 * off) where it settled, eased in and out over `ease` frames, plus a lift that keeps the ball on or above the floor;
 * the legs follow by two-bone IK (hip fixed, knee kept in its plane), the foot keeps its world orientation.
 */
function deslide(rig, frames, rootAt, ease = 4) {
  const n = frames.length;
  const pivots = lockFootYaw(rig, frames, rootAt, ease);
  const world = frames.map((f, k) => toWorld(f.pos, rootAt(k)));
  const C = wrenContacts(world, OUT_FPS);
  let worstReach = 0;
  let nPivots = 0;
  for (const f of ['L', 'R']) {
    const c = C[f];
    const delta = Array.from({ length: n }, () => null);
    const ankleLow = (i) => c.ay[i] < c.aRef + 0.02 && c.by[i] < c.bRef + 0.015;
    const ballLow = (i) => c.by[i] < c.bRef + 0.015;
    for (const [a, b] of c.runs) {
      const d = new Array(b - a + 1);
      const flat = [];
      const pivot = pivots[f].some(([p, q]) => p <= b && q >= a);
      if (pivot) nPivots++;
      else for (let i = a; i <= b; i++) if (ankleLow(i)) flat.push(i);
      if (flat.length) {
        let best = flat[0];
        for (const i of flat) if (c.va[i] < c.va[best]) best = i;
        const anchor = c.ankle[best];
        const f0 = flat[0], f1 = flat[flat.length - 1];
        for (let i = f0; i <= f1; i++) d[i - a] = [anchor[0] - c.ankle[i][0], anchor[2] - c.ankle[i][2]];
        for (let i = a; i < f0; i++) d[i - a] = d[f0 - a];
        const ballAnchor = [c.ball[f1][0] + d[f1 - a][0], c.ball[f1][2] + d[f1 - a][1]];
        for (let i = f1 + 1; i <= b; i++) d[i - a] = ballLow(i) ? [ballAnchor[0] - c.ball[i][0], ballAnchor[1] - c.ball[i][2]] : d[i - 1 - a];
      } else {
        const bl = [];
        for (let i = a; i <= b; i++) if (ballLow(i)) bl.push(i);
        if (!bl.length) continue;
        let best = bl[0];
        for (const i of bl) if (c.vb[i] < c.vb[best]) best = i;
        const anchor = c.ball[best];
        for (let i = a; i <= b; i++) d[i - a] = ballLow(i) ? [anchor[0] - c.ball[i][0], anchor[2] - c.ball[i][2]] : null;
        for (let i = a; i <= b; i++) if (!d[i - a]) d[i - a] = d[i - a - 1] ?? d.find(Boolean);
      }
      // ease in and out (the ramps reach outside the run, where the foot is still close to the floor)
      for (let i = a - ease; i <= b + ease; i++) {
        if (i < 0 || i >= n) continue;
        const di = i < a ? d[0] : i > b ? d[b - a] : d[i - a];
        const w = i < a ? smoothstep((i - (a - ease - 1)) / (ease + 1)) : i > b ? smoothstep(((b + ease + 1) - i) / (ease + 1)) : 1;
        const prev = delta[i];
        const v = [di[0] * w, di[1] * w];
        delta[i] = prev ? [prev[0] + v[0], prev[1] + v[1]] : v;
      }
    }
    // apply: translate the foot, solve the leg
    for (let k = 0; k < n; k++) {
      const fr = frames[k];
      const wp = world[k];
      let dx = delta[k]?.[0] ?? 0, dz = delta[k]?.[1] ?? 0;
      const lift = Math.max(0, -wp[`toe${f}`][1], 0.045 - wp[`an${f}`][1]);
      if (Math.abs(dx) < 1e-6 && Math.abs(dz) < 1e-6 && lift < 1e-6) continue;
      const r = rootAt(k);
      // world delta -> root frame
      const local = q4.rotate(q4.yaw(-r.yaw), [dx, lift, dz]);
      const hip = fr.pos[`hip${f}`], knee = fr.pos[`kn${f}`], ankle = fr.pos[`an${f}`];
      const target = v3.add(ankle, local);
      const { knee: knee2, reach } = ik2(hip, knee, ankle, target);
      worstReach = Math.max(worstReach, reach);
      const thigh0 = v3.norm(v3.sub(knee, hip)), thigh1 = v3.norm(v3.sub(knee2, hip));
      const hipW = q4.norm(q4.mul(q4.arc(thigh0, thigh1), fr.qw[`hip${f}`]));
      const ankle2 = v3.add(knee2, v3.scale(v3.norm(v3.sub(target, knee2)), v3.dist(knee, ankle)));
      const shin1 = v3.norm(v3.sub(ankle2, knee2));
      // the knee carries the hip's swing (its local rotation unchanged), then the smallest turn aims the shin
      const kneeC = q4.norm(q4.mul(q4.arc(thigh0, thigh1), fr.qw[`kn${f}`]));
      const shinC = q4.rotate(kneeC, v3.norm(v3.sub(rig.bind[`an${f}`], rig.bind[`kn${f}`])));
      const kneeW2 = q4.norm(q4.mul(q4.arc(shinC, shin1), kneeC));
      fr.qw[`hip${f}`] = hipW;
      fr.qw[`kn${f}`] = kneeW2;
      fr.pos = fkWren(rig, fr.pel, fr.qw);
    }
  }
  return { worstReach, nPivots };
}

/** Root-frame positions -> world given a root {x, z, yaw}. */
function toWorld(pos, r) {
  const yq = q4.yaw(r.yaw);
  const out = {};
  for (const [k, p] of Object.entries(pos)) { const w = q4.rotate(yq, p); out[k] = [w[0] + r.x, w[1], w[2] + r.z]; }
  return out;
}

/** Slide (cm) on Wren's feet: max per contact, median and max over the contacts not touching the ends. */
function slideStats(world, fps, lo = 0, hi = world.length) {
  const C = wrenContacts(world, fps);
  const sl = [];
  for (const f of ['L', 'R']) {
    const c = C[f];
    for (const run of c.runs) {
      if (!(run[0] > 0 && run[1] < world.length - 1 && run[0] >= lo && run[0] < hi)) continue;
      // a pivoting foot (turning more than PIVOT_DEG while down) slides only if its ball (the pivot point) moves
      const hs = [];
      for (let i = run[0]; i <= run[1]; i++) if (c.by[i] < c.bRef + 0.015) hs.push(Math.atan2(c.ball[i][0] - c.ankle[i][0], c.ball[i][2] - c.ankle[i][2]));
      const rel = hs.map((h) => wrapPi(h - (hs[0] ?? 0)));
      const pivot = hs.length > 1 && (Math.max(...rel) - Math.min(...rel)) * R2D > PIVOT_DEG;
      sl.push(runSlide(run, pivot ? c.ball : c.ankle, c.ball, c) * 100);
    }
  }
  return { med: Math.round(median(sl) * 10) / 10 || 0, max: Math.round(Math.max(0, ...sl) * 10) / 10, n: sl.length, C };
}

/**
 * One intermediate from a pick's choice. Options: `load` (the take reader handed to `retargetTake`), `licence` (the
 * source line written into `source.licence`), `inPlace` (the root fixed at the start pose's ground point and heading,
 * no travel yaw: for on-the-spot loops and one-shots such as idles and hangs, whose travel atan2 would be noise).
 * The defaults are the CMU ones.
 */
export function buildSlot(rig, pick, choice, suffix = '', takeInfo = null, { load = loadTake, licence = CMU_LICENCE, inPlace = false } = {}) {
  const R = retargetTake(rig, choice.take, { load });
  const [a, b] = choice.segment;
  const loop = !!choice.loop;
  const N = loop ? Math.max(8, Math.round((b - a) / (120 / OUT_FPS))) : Math.floor((b - a) / (120 / OUT_FPS)) + 1;
  const fAt = (k) => (loop ? a + (k * (b - a)) / N : a + k * (120 / OUT_FPS));
  const count = loop ? N + 1 : N;
  // sample pelvis + world rotations
  const S = [];
  for (let k = 0; k < count; k++) {
    const f = fAt(k);
    const qw = {};
    for (const name of rig.names) qw[name] = sampleQuat(R.qw[name], f);
    S.push({ pel: samplePos(R.pel, f), qw });
  }
  // root track
  let root;
  if (inPlace) {
    const yaw = facing(S[0].qw.pelvis);
    root = S.map(() => ({ x: S[0].pel[0], z: S[0].pel[2], yaw }));
  } else if (loop) {
    const D = v3.sub(S[N].pel, S[0].pel);
    const yaw = Math.atan2(D[0], D[2]);
    const cx = mean(S.slice(0, N).map((s) => s.pel[0])), cz = mean(S.slice(0, N).map((s) => s.pel[2]));
    root = S.map((_, k) => ({ x: cx + D[0] * (k / N - 0.5), z: cz + D[2] * (k / N - 0.5), yaw }));
  } else {
    const w = Math.round(0.45 * OUT_FPS);
    const xs = smoothSym(S.map((s) => s.pel[0]), w), zs = smoothSym(S.map((s) => s.pel[2]), w);
    const ys = smoothSym(unwrap(S.map((s) => facing(s.qw.pelvis))), w);
    root = S.map((_, k) => ({ x: xs[k], z: zs[k], yaw: ys[k] }));
  }
  // normalise: frame 0 root at the origin facing +Z
  const y0 = root[0].yaw, x0 = root[0].x, z0 = root[0].z;
  const nq = q4.yaw(-y0);
  root = root.map((r) => {
    const p = q4.rotate(nq, [r.x - x0, 0, r.z - z0]);
    return { x: p[0], z: p[2], yaw: r.yaw - y0 };
  });
  // root-frame data: pelvis offset and local rotations
  const frames = S.map((s, k) => {
    const r0 = q4.rotate(nq, [s.pel[0] - x0, s.pel[1], s.pel[2] - z0]);
    const yq = q4.yaw(-root[k].yaw);
    const pel = q4.rotate(yq, [r0[0] - root[k].x, r0[1], r0[2] - root[k].z]);
    const qw = {};
    for (const name of rig.names) qw[name] = q4.norm(q4.mul(yq, q4.mul(nq, s.qw[name])));
    qw.root = q4.I(); qw.body = q4.I();
    return { pel, loc: localOf(rig, qw) };
  });
  // loop seam: spread the end-to-start mismatch over the cycle
  const seam = { before: null };
  if (loop) {
    const e = v3.sub(frames[N].pel, frames[0].pel);
    let worst = 0, worstJ = '';
    const dq = {};
    for (const name of rig.names) {
      dq[name] = q4.norm(q4.mul(frames[N].loc[name], q4.conj(frames[0].loc[name])));
      const ang = q4.angle(dq[name]) * R2D;
      if (ang > worst) { worst = ang; worstJ = name; }
    }
    seam.before = { pelCm: Math.round(v3.len(e) * 1000) / 10, maxDeg: Math.round(worst * 10) / 10, joint: worstJ };
    for (let k = 0; k <= N; k++) {
      const u = k / N;
      frames[k].pel = v3.sub(frames[k].pel, v3.scale(e, u));
      for (const name of rig.names) frames[k].loc[name] = q4.norm(q4.mul(q4.conj(q4.slerp(q4.I(), dq[name], u)), frames[k].loc[name]));
    }
  }
  for (const fr of frames) { fr.qw = worldOf(rig, fr.loc); fr.pos = fkWren(rig, fr.pel, fr.qw); }
  // vertical offset: the flat foot's ankle at Wren's bind ankle height
  const rootAt0 = (k) => root[Math.min(root.length - 1, k)];
  {
    const world = frames.map((f, k) => toWorld(f.pos, rootAt0(k)));
    const C = wrenContacts(world, OUT_FPS);
    const hs = [];
    for (const f of ['L', 'R']) for (let k = 0; k < world.length; k++) if (C[f].flags[k] && C[f].by[k] < C[f].bRef + 0.015) hs.push(world[k][`an${f}`][1]);
    const off = hs.length ? rig.bind.anL[1] - median(hs) : 0;
    for (const fr of frames) { fr.pel = v3.add(fr.pel, [0, off, 0]); fr.pos = fkWren(rig, fr.pel, fr.qw); }
    seam.heightOffsetCm = Math.round(off * 1000) / 10;
  }
  const body = loop ? frames.slice(0, N) : frames;
  // de-slide (a loop is unrolled to three cycles so contacts across the seam stay whole)
  let reach, before, after, contact, nPivots;
  if (loop) {
    const D = [root[N].x - root[0].x, root[N].z - root[0].z];
    const un = [];
    for (let c = -1; c <= 1; c++) for (let k = 0; k < N; k++) {
      const f = body[k];
      un.push({ pel: [...f.pel], qw: { ...f.qw }, pos: f.pos, k, c });
    }
    const rootUn = (i) => { const u = un[i]; return { x: root[u.k].x + u.c * D[0], z: root[u.k].z + u.c * D[1], yaw: root[u.k].yaw }; };
    before = slideStats(un.map((f, i) => toWorld(f.pos, rootUn(i))), OUT_FPS, N, 2 * N);
    ({ worstReach: reach, nPivots } = deslide(rig, un, rootUn));
    for (let k = 0; k < N; k++) { body[k].qw = un[N + k].qw; body[k].pos = un[N + k].pos; }
    after = slideStats(un.map((f, i) => toWorld(f.pos, rootUn(i))), OUT_FPS, N, 2 * N);
    contact = body.map((_, k) => [after.C.L.flags[N + k] ? 1 : 0, after.C.R.flags[N + k] ? 1 : 0]);
  } else {
    before = slideStats(body.map((f, k) => toWorld(f.pos, rootAt0(k))), OUT_FPS);
    ({ worstReach: reach, nPivots } = deslide(rig, body, rootAt0));
    after = slideStats(body.map((f, k) => toWorld(f.pos, rootAt0(k))), OUT_FPS);
    contact = body.map((_, k) => [after.C.L.flags[k] ? 1 : 0, after.C.R.flags[k] ? 1 : 0]);
  }
  for (const fr of body) fr.loc = localOf(rig, fr.qw);
  // contacts, events, phase
  const strikesOf = (flags, f) => {
    const out = [];
    for (let k = 0; k < flags.length; k++) {
      const prev = loop ? flags[(k - 1 + flags.length) % flags.length] : k > 0 ? flags[k - 1] : 1;
      if (flags[k] && !prev) out.push(k);
    }
    return out;
  };
  let shift = 0;
  let outBody = body, outRoot = root.slice(0, body.length);
  if (loop) {
    // phase 0 at the left strike: rotate the cycle so it starts there
    const ls = strikesOf(contact.map((c) => c[0]), 'L');
    shift = ls.length ? ls[0] : 0;
    const rot = (arr) => arr.map((_, k) => arr[(k + shift) % arr.length]);
    outBody = rot(body);
    contact = rot(contact);
    const D = [root[N].x - root[0].x, root[N].z - root[0].z];
    outRoot = outBody.map((_, k) => ({ x: D[0] * (k / N), z: D[1] * (k / N), yaw: 0 }));
  }
  const events = [];
  if (!loop && takeInfo) {
    // segments: the performer's strike / toe-off events (analysis.json, 120 fps) mapped onto the 60 fps frames, so a
    // strike on the segment's first or last frame counts (the de-slid contact flags cannot see an edge strike)
    const map = (fr) => Math.round((fr - a) / (120 / OUT_FPS));
    for (const [ft, fr] of takeInfo.strikes) if (fr >= a && fr <= b) events.push({ frame: Math.min(outBody.length - 1, map(fr)), foot: ft.toUpperCase(), type: 'strike' });
    for (const [ft, fr] of takeInfo.offs) if (fr >= a && fr <= b) events.push({ frame: Math.min(outBody.length - 1, map(fr)), foot: ft.toUpperCase(), type: 'off' });
  } else for (const [fi, f] of [[0, 'L'], [1, 'R']]) {
    const fl = contact.map((c) => c[fi]);
    for (const k of strikesOf(fl, f)) events.push({ frame: k, foot: f, type: 'strike' });
    for (let k = 0; k < fl.length; k++) {
      const next = loop ? fl[(k + 1) % fl.length] : k < fl.length - 1 ? fl[k + 1] : 1;
      if (fl[k] && !next) events.push({ frame: k + 1 === fl.length && loop ? 0 : k + 1, foot: f, type: 'off' });
    }
  }
  events.sort((p, q) => p.frame - q.frame);
  const ls = events.filter((e) => e.foot === 'L' && e.type === 'strike').map((e) => e.frame);
  const phase = outBody.map((_, k) => {
    if (loop) return k / outBody.length;
    if (ls.length < 2) return null;
    let i = ls.findIndex((x) => x > k) - 1;
    if (i < 0) i = k < ls[0] ? 0 : ls.length - 2;
    i = Math.min(i, ls.length - 2);
    return (k - ls[i]) / (ls[i + 1] - ls[i]);
  });
  // seam check after: pose distance between the last and the first frame vs a typical frame step
  const poseStep = (p, q) => Math.sqrt(mean(rig.names.map((nm) => v3.dist(p.pos[nm], q.pos[nm]) ** 2)));
  let seamAfter = null;
  if (loop) {
    const steps = outBody.slice(1).map((f, k) => poseStep(outBody[k], f));
    seamAfter = { stepCm: Math.round(poseStep(outBody[outBody.length - 1], outBody[0]) * 1000) / 10, typicalStepCm: Math.round(median(steps) * 1000) / 10, maxStepCm: Math.round(Math.max(...steps) * 1000) / 10 };
  }
  const T = outBody.length / OUT_FPS;
  const dist = Math.hypot(outRoot[outRoot.length - 1].x - outRoot[0].x, outRoot[outRoot.length - 1].z - outRoot[0].z);
  const rd = (x) => Math.round(x * 1e5) / 1e5;
  const res = {
    format: 'mocap-intermediate/1',
    slot: pick.slot + suffix, kind: pick.kind, loop,
    source: { take: choice.take, frames120: [a, b], seconds: [Math.round(a / 120 * 1000) / 1000, Math.round(b / 120 * 1000) / 1000], foot: choice.foot ?? null, licence },
    fps: OUT_FPS, frames: outBody.length, duration: rd(T),
    frame: 'game: +X right, +Y up, +Z forward (metres); quaternions [x, y, z, w] act as v\' = q v q^-1 (Babylon applyRotationQuaternion)',
    wren: { height: rig.height, leg: rd(rig.leg), scaleLeg: rd(R.scaleLeg), performerLeg: rd(R.cmuLeg), scaleHeight: null },
    speed: loop ? rd(Math.hypot(root[N].x - root[0].x, root[N].z - root[0].z) / T) : null,
    distance: rd(dist),
    cycleDistance: loop ? rd(Math.hypot(root[N].x - root[0].x, root[N].z - root[0].z)) : null,
    joints: rig.names, parents: rig.names.map((nm) => rig.parent[nm]),
    bind: Object.fromEntries(rig.names.map((nm) => [nm, rig.bind[nm]])),
    notes: [
      'root: per frame [x, z, yaw] of the ground root (yaw radians, 0 = +Z, + turns right); loops: straight +Z at the cycle speed, the last frame joins frame 0 (the root advances cycleDistance per loop).',
      'pel: the pelvis joint position in the root frame (x right, y up from the floor, z forward).',
      'rot: per frame, per joint (order of `joints`) the LOCAL bind-relative rotation (parent frame); root and body are identity; the world (root-frame) rotation of a joint maps its bind segment onto the posed one.',
      'pos: per frame, per joint the root-frame position (Wren FK of pel + rot; redundant, for IK targets and checks).',
      'contact: per frame [left, right] 1 = foot planted (height + speed thresholds on Wren\'s feet after the de-slide).',
      'phase: loops k / frames with 0 at the left strike; segments interpolated between left strikes (below 0 before the first and above 1 after the last left-strike cycle; null without two left strikes).',
      'hands follow the wrist segment (no finger data); toes are CMU toe joints (noisy, see TAKES.md); clavicles are not carried (Wren has no clavicle joint in the bind export; the shoulders ride the chest).',
    ],
    quality: {
      seamBefore: seam.before, seamAfter, heightOffsetCm: seam.heightOffsetCm,
      slideBeforeCm: { med: before.med, max: before.max }, slideAfterCm: { med: after.med, max: after.max },
      legReachShortCm: Math.round(reach * 1000) / 10,
      pivotContacts: loop ? Math.round(nPivots / 3) : nPivots,
      retargetDirErrDeg: R.dirErrDeg,
    },
    events,
    root: outRoot.map((r) => [rd(r.x), rd(r.z), rd(r.yaw)]),
    pel: outBody.map((f) => f.pel.map(rd)),
    rot: outBody.map((f) => rig.names.map((nm) => f.loc[nm].map(rd))),
    pos: outBody.map((f) => rig.names.map((nm) => f.pos[nm].map(rd))),
    contact,
    phase: phase.map((p) => (p === null ? null : rd(p))),
  };
  if (inPlace) {
    res.inPlace = true;
    res.notes.push('in place: the root is fixed at the first frame\'s pelvis ground point and heading (no travel, speed 0).');
  }
  return res;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const want = process.argv.slice(2);
  const an = JSON.parse(readFileSync(path.join(OUT, 'analysis.json'), 'utf8'));
  const rig = wrenRig();
  const stature = Object.fromEntries(an.takes.map((t) => [t.take, t.stature]));
  const index = [];
  for (const pick of an.picks) {
    pick.chosen.forEach((choice, i) => {
      const slot = pick.slot + (i ? '_alt' : '');
      if (want.length && !want.includes(slot) && !want.includes(pick.slot)) return;
      const res = buildSlot(rig, pick, choice, i ? '_alt' : '', an.takes.find((t) => t.take === choice.take));
      res.wren.scaleHeight = Math.round(rig.height / stature[choice.take] * 1e4) / 1e4;
      writeFileSync(path.join(OUT, `${slot}.json`), JSON.stringify(res));
      const q = res.quality;
      index.push({ slot, take: choice.take, frames: res.frames, speed: res.speed, quality: q });
      console.log(`${slot}: ${choice.take} ${res.frames} f @60 ${res.loop ? `loop ${res.speed?.toFixed(2)} m/s` : 'segment'} | seam ${q.seamBefore ? `${q.seamBefore.pelCm} cm / ${q.seamBefore.maxDeg} deg (${q.seamBefore.joint}) -> step ${q.seamAfter.stepCm} cm (typ ${q.seamAfter.typicalStepCm})` : '-'} | slide ${q.slideBeforeCm.med}/${q.slideBeforeCm.max} -> ${q.slideAfterCm.med}/${q.slideAfterCm.max} cm | reach short ${q.legReachShortCm} cm | h ${q.heightOffsetCm} cm | pivots ${q.pivotContacts} | dir err ${q.retargetDirErrDeg} deg`);
    });
  }
  if (!want.length) {
    writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 1));
    const L = ['## Intermediates (build/mocap/<slot>.json, Wren 1.68 m, 60 fps)', '',
      'Format `mocap-intermediate/1`: root track, pelvis, local bind-relative rotations and FK positions of all 23 Wren joints,',
      'contacts, events and phase per frame (the `notes` field in each file). Slide is measured on Wren\'s de-slid feet (median /',
      'max per contact, cm); seam = the end-to-start mismatch spread over the loop, then the last-to-first frame step against',
      'the typical step. Contact sheets: `build/mocap/sheets/<slot>.svg` / `.png` (side, front, top).', '',
      '| Slot | Take | Frames | Loop speed m/s | Seam before cm / deg (joint) | Seam step after / typical cm | Slide before -> after cm | Pivot contacts | Leg short cm | Height offset cm |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'];
    for (const r of index) {
      const q = r.quality;
      L.push(`| ${r.slot} | ${r.take} | ${r.frames} | ${r.speed ?? '-'} | ${q.seamBefore ? `${q.seamBefore.pelCm} / ${q.seamBefore.maxDeg} (${q.seamBefore.joint})` : '-'} | ${q.seamAfter ? `${q.seamAfter.stepCm} / ${q.seamAfter.typicalStepCm}` : '-'} | ${q.slideBeforeCm.med}/${q.slideBeforeCm.max} -> ${q.slideAfterCm.med}/${q.slideAfterCm.max} | ${q.pivotContacts} | ${q.legReachShortCm} | ${q.heightOffsetCm} |`);
    }
    const { writeSection } = await import('./takesdoc.mjs');
    writeSection('intermediates', L.join('\n'));
  }
}
