// (mixamo-retarget M2) Mixamo take adapter: a Blender dump of one Mixamo FBX (slice M1, `build/mocap/mixamo/raw/<slug>.json`,
// format in docs/mixamo-retarget/PLAN.md "Dump format") -> the take shape asfamc.mjs `loadTake` returns, so the CMU
// pipeline (retarget.mjs `retargetTake` / `buildSlot`, analyze.mjs `analyzeTake`) runs on it through its injected loader:
//   buildSlot(rig, pick, choice, '', null, { load: mixamoLoader(), licence: MIXAMO_LICENCE, inPlace })
//   node scripts/mocap/mixamoTake.mjs [slug ...]     self-check, report and direction check per dump (all when none
//                                                    named); exits 1 when a check fails or a segment is >= 8 deg off
// Direction check (A6, `mixamoDirCheck`): the take retargeted onto Wren, each Wren segment against the Mixamo segment
// measured from the dump's own heads (mixamoMap.mjs WREN_SPANS), at every source frame.
//
// Frames. The dump is in Blender world space (Z up, right-handed; the importer leaves the character facing -Y, but the
// facing is measured here, never assumed). The game frame is +X right, +Y up, +Z forward, left-handed. The rest pose
// gives the basis: right = the hip line (LeftUpLeg -> RightUpLeg heads), forward = up x right (Blender's cross), checked
// and averaged with the toe direction (Foot -> ToeBase heads). M = [right; up; forward] (rows) maps a Blender vector to
// the game: p_game = M p. det M = -1 (a right- to left-handed map is improper), so a rotation converts by matrices,
// R_game = M R M^T (a proper rotation again), never by permuting quaternion parts. The dump's rotations are
// rest-relative world rotations (W R W^-1, mapping a bone's rest world directions onto its posed ones), so after the
// change of basis a slot's quaternion maps its game rest segment onto its game posed segment, as a CMU take's does.
//
// Positions. Each slot (mixamoMap.mjs) is a rigid offset in its rotation bone's frame, measured at rest from the child
// bone heads; the posed tips are rebuilt by forward kinematics from the hips head and the rotations (so bone lengths
// are exactly constant, as selfCheck wants), and the report gives the largest distance between those tips and the
// dump's own posed heads (`fkErrMm`, a dump sanity check: near 0 when the file has no stretch or translation keys).
// Resample (A3): the dump's fps (30 as downloaded) -> 120 fps, quaternions by slerp, the hips path by Catmull-Rom.
// Floor: the 5th percentile of the lowest foot point (toe base and toe tip), as selfCheck measures it, moved to y = 0
// (`floor: 'zero'` keeps Blender's z = 0 instead, for clips that never touch the floor). In place (A4): hips travel
// (first to last frame, horizontal) under IN_PLACE_M.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, FPS, selfCheck } from './asfamc.mjs';
import { v3, q4, m3, R2D } from './math.mjs';
import { baseName, mixamoSlots, resolveMixamoBones, MIXAMO_FPS, WREN_SPANS } from './mixamoMap.mjs';
import { MAP, SEG_END, retargetTake } from './retarget.mjs';

export const MIXAMO_DIR = path.join(ROOT, 'build', 'mocap', 'mixamo');
export const MIXAMO_RAW = path.join(MIXAMO_DIR, 'raw');
/** Hips travel (m, first to last frame, horizontal) under which a clip counts as on the spot (A4). */
export const IN_PLACE_M = 0.05;
/** The source line an intermediate carries (retarget.mjs `buildSlot` `licence`). */
export const MIXAMO_LICENCE = 'Mixamo (mixamo.com, Adobe), royalty-free for commercial use (docs/art-credits.md)';
/** Toe-direction vs hip-line forward: averaged when within this angle, else the hip line alone is used. */
const TOE_AGREE_DEG = 45;
/** The direction check's limit (BRIEF A6): every retargeted Wren segment within this of its Mixamo segment. */
export const DIR_LIMIT_DEG = 8;

const r3 = (x) => Math.round(x * 1000) / 1000;
const r1 = (x) => Math.round(x * 10) / 10;

/** Quaternion [x, y, z, w] -> rotation matrix (row-major, column vectors; the inverse of math.mjs q4.fromMat). */
export function quatMat(q) {
  const [x, y, z, w] = q;
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
  ];
}

/**
 * The game basis from the rest heads (Blender world, `restOf(base name)` -> [x, y, z]). Returns { M, right, forward,
 * turnDeg (the forward's turn from Blender -Y about +Z, counter-clockwise seen from above), hipToeDeg, from }.
 */
export function measureFacing(restOf) {
  const flat = (v) => [v[0], v[1], 0];
  const right0 = flat(v3.sub(restOf('RightUpLeg'), restOf('LeftUpLeg')));
  if (v3.len(right0) < 1e-6) throw new Error('mixamo: the rest hip line is vertical (no facing)');
  const r = v3.norm(right0);
  const fHip = [-r[1], r[0], 0]; // up x right with up = +Z
  let toe = [0, 0, 0];
  for (const S of ['Left', 'Right']) {
    const d = flat(v3.sub(restOf(`${S}ToeBase`), restOf(`${S}Foot`)));
    if (v3.len(d) > 1e-6) toe = v3.add(toe, v3.norm(d));
  }
  let forward = fHip, hipToeDeg = null, from = 'hips';
  if (v3.len(toe) > 1e-6) {
    const t = v3.norm(toe);
    hipToeDeg = Math.acos(Math.max(-1, Math.min(1, v3.dot(t, fHip)))) * R2D;
    if (hipToeDeg < TOE_AGREE_DEG) { forward = v3.norm(v3.add(fHip, t)); from = 'hips+toes'; }
  }
  const right = [forward[1], -forward[0], 0]; // forward x up
  const M = [right[0], right[1], 0, 0, 0, 1, forward[0], forward[1], 0];
  return { M, right, forward, turnDeg: Math.atan2(forward[0], -forward[1]) * R2D, hipToeDeg, from };
}

function checkDump(d) {
  if (d?.version !== 1) throw new Error(`mixamo dump: version ${d?.version} (want 1)`);
  if (!Number.isInteger(d.frames) || d.frames < 2) throw new Error(`mixamo dump: frames ${d.frames}`);
  if (!(d.fps > 0)) throw new Error(`mixamo dump: fps ${d.fps}`);
  if (!Array.isArray(d.bones) || !d.bones.length) throw new Error('mixamo dump: no bones');
  for (const b of d.bones) {
    if (!Array.isArray(b.rest) || b.rest.length !== 3) throw new Error(`mixamo dump: bone ${b.name} has no rest head`);
    if (d.pos?.[b.name]?.length !== d.frames * 3) throw new Error(`mixamo dump: pos.${b.name} is not ${d.frames} x 3 numbers`);
    if (d.rot?.[b.name]?.length !== d.frames * 4) throw new Error(`mixamo dump: rot.${b.name} is not ${d.frames} x 4 numbers`);
  }
}

/** Catmull-Rom through p1 -> p2 at t (p0, p3 the neighbours). */
const cr = (p0, p1, p2, p3, t) => p1.map((_, c) => 0.5 * (2 * p1[c] + (p2[c] - p0[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t * t + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * t * t * t));

/**
 * One dump (parsed JSON) -> a take in the `loadTake` shape plus `source`, `inPlace`, `travel`, `facing` and `report`.
 * `rig` (retarget.mjs `wrenRig()`) adds Wren's bind lengths and the leg scale to the report.
 */
export function takeFromDump(dump, { rig = null, floor = 'feet', bytes = 0, slug = dump.slug } = {}) {
  checkDump(dump);
  const res = resolveMixamoBones(dump.bones);
  const slots = mixamoSlots(res);
  const full = (n) => res.full.get(n);
  const restB = new Map(dump.bones.map((b) => [baseName(b.name), b.rest]));
  const face = measureFacing((n) => restB.get(n));
  const M = face.M, MT = m3.T(face.M);
  const toG = (p) => m3.apply(M, p);
  const n0 = dump.frames;
  // rotations: Blender world (w, x, y, z) -> game [x, y, z, w] by R_game = M R M^T, sign-continuous
  const qSrc = new Map();
  for (const b of new Set(slots.flatMap((s) => (s.blend ? [s.rot, s.blend] : [s.rot])))) {
    const f = dump.rot[full(b)];
    const arr = [];
    for (let i = 0; i < n0; i++) {
      const R = quatMat(q4.norm([f[4 * i + 1], f[4 * i + 2], f[4 * i + 3], f[4 * i]]));
      const q = q4.fromMat(m3.mul(m3.mul(M, R), MT));
      arr.push(arr.length ? q4.align(q, arr[arr.length - 1]) : q);
    }
    qSrc.set(b, arr);
  }
  const headAt = (b, i) => { const f = dump.pos[full(b)]; return toG([f[3 * i], f[3 * i + 1], f[3 * i + 2]]); };
  // rest geometry (game frame): each slot's rigid offset from its parent slot's tip
  const restTip = new Map(), off = new Map(), fallbacks = [];
  const bySlot = new Map(slots.map((s) => [s.slot, s]));
  const restG = (b) => toG(restB.get(b));
  for (const s of slots) {
    if (s.slot === 'root') { restTip.set('root', restG('Hips')); off.set('root', [0, 0, 0]); continue; }
    const start = restTip.get(s.parent);
    let tip = start;
    if (s.end) tip = restG(s.end);
    else if (s.extend) {
      let p = s.parent;
      while (p && v3.len(off.get(p)) < 1e-9) p = bySlot.get(p).parent;
      tip = v3.add(start, v3.scale(p ? off.get(p) : [0, 0, 0], s.extend));
      fallbacks.push(s.slot);
    }
    off.set(s.slot, v3.sub(tip, start));
    restTip.set(s.slot, tip);
  }
  // blend slots (A6): the rot / blend slerp at 0.5 (the twist), swung by the smallest arc so the rest span (rot head ->
  // blend head -> tip) lands on the posed span the two bones make; a rotation channel of its own, keyed by `qKey`
  const qKey = (s) => (s.blend ? `${s.rot}>${s.blend}` : s.rot);
  for (const s of slots) {
    if (!s.blend || qSrc.has(qKey(s))) continue;
    const h1 = v3.sub(restG(s.blend), restG(s.rot)), h2 = v3.sub(restTip.get(s.slot), restG(s.blend)), h = v3.add(h1, h2);
    const q1 = qSrc.get(s.rot), q2 = qSrc.get(s.blend), arr = [];
    for (let i = 0; i < n0; i++) {
      const mid = q4.norm(q4.slerp(q1[i], q2[i], 0.5));
      const posed = v3.add(q4.rotate(q1[i], h1), q4.rotate(q2[i], h2));
      const q = q4.norm(q4.mul(q4.arc(q4.rotate(mid, h), posed), mid));
      arr.push(arr.length ? q4.align(q, arr[arr.length - 1]) : q);
    }
    qSrc.set(qKey(s), arr);
  }
  const fk = (rootP, qOf, pin = null) => {
    const P = new Map([['root', rootP]]);
    for (const s of slots) if (s.slot !== 'root') P.set(s.slot, pin?.(s) ?? v3.add(P.get(s.parent), q4.rotate(qOf(qKey(s)), off.get(s.slot))));
    return P;
  };
  // dump sanity: FK tips against the dump's own posed heads. A blend slot is rigid but the span its two bones make
  // bends and shortens: its direction is exact, its tip misses by that change of length (`stretchMm`, reported apart);
  // its measured tip is pinned here so the slots past it test the file alone.
  let fkErr = 0, fkErrSlot = '', stretch = 0, stretchSlot = '';
  for (let i = 0; i < n0; i++) {
    const qi = (b) => qSrc.get(b)[i];
    const P = fk(headAt('Hips', i), qi, (s) => (s.blend && s.end ? headAt(s.end, i) : null));
    for (const s of slots) {
      if (!s.end || s.slot === 'root') continue;
      if (s.blend) {
        const e = v3.dist(v3.add(P.get(s.parent), q4.rotate(qi(qKey(s)), off.get(s.slot))), headAt(s.end, i));
        if (e > stretch) { stretch = e; stretchSlot = s.slot; }
        continue;
      }
      const e = v3.dist(P.get(s.slot), headAt(s.end, i));
      if (e > fkErr) { fkErr = e; fkErrSlot = s.slot; }
    }
  }
  // resample to 120 fps: hips by Catmull-Rom, rotations by slerp, tips by FK
  const ratio = FPS / dump.fps;
  const n = Math.floor((n0 - 1) * ratio + 1e-9) + 1;
  const hips = Array.from({ length: n0 }, (_, i) => headAt('Hips', i));
  const pos = new Map(), quat = new Map();
  for (const s of slots) { pos.set(s.slot, []); quat.set(s.slot, []); }
  const qOut = new Map([...qSrc.keys()].map((b) => [b, []]));
  for (let k = 0; k < n; k++) {
    const u = k / ratio, i = Math.min(n0 - 2, Math.floor(u + 1e-9)), t = Math.max(0, Math.min(1, u - i));
    // end neighbours extrapolated linearly (a clamped end would bend a steady path at the first and last frames)
    const p0 = i > 0 ? hips[i - 1] : v3.sub(v3.scale(hips[0], 2), hips[1]);
    const p3 = i + 2 < n0 ? hips[i + 2] : v3.sub(v3.scale(hips[n0 - 1], 2), hips[n0 - 2]);
    const rootP = cr(p0, hips[i], hips[i + 1], p3, t);
    for (const [b, arr] of qSrc) {
      const out = qOut.get(b);
      const q = q4.norm(q4.slerp(arr[i], arr[i + 1], t));
      out.push(out.length ? q4.align(q, out[out.length - 1]) : q);
    }
    const P = fk(rootP, (b) => qOut.get(b)[k]);
    for (const s of slots) { pos.get(s.slot).push(P.get(s.slot)); quat.get(s.slot).push(qOut.get(qKey(s))[k]); }
  }
  // floor: 5th percentile of the lowest foot point per frame (selfCheck's measure), moved to y = 0
  const low = [];
  for (let k = 0; k < n; k++) low.push(Math.min(...['ltoes', 'rtoes', 'lfoot', 'rfoot'].map((s) => pos.get(s)[k][1])));
  const sorted = [...low].sort((a, b) => a - b);
  const floorFeet = sorted[Math.floor(sorted.length * 0.05)];
  const shift = floor === 'zero' ? 0 : floorFeet;
  for (const [, arr] of pos) for (const p of arr) p[1] -= shift;
  // travel (A4)
  const h = pos.get('root');
  const travel = v3.distXZ(h[0], h[n - 1]);
  let excursion = 0;
  for (const p of h) excursion = Math.max(excursion, v3.distXZ(h[0], p));
  // still rotations (report only: every Mixamo channel is keyed, so nothing is `dead` in the CMU sense)
  const still = slots.filter((s) => s.kind !== 'offset' && s.kind !== 'hub' && s.kind !== 'alias' && s.slot !== 'root')
    .filter((s) => qSrc.get(qKey(s)).every((q) => q4.between(q, qSrc.get(qKey(s))[0]) < 1e-4)).map((s) => s.slot);
  // the CMU-shaped skeleton: `dir` in the ASF file convention (x mirrored; consumers convert with asfamc toGameDir),
  // lengths in metres (`metres` 1), identity axes, so asfamc restPose / selfCheck run on it unchanged
  const I = m3.I();
  const skel = {
    name: slug, units: { mass: 1, length: 1, angle: 'deg' }, metres: 1,
    root: { order: [], axis: 'XYZ', position: [0, 0, 0], orientation: [0, 0, 0], C: I, Cinv: I },
    bones: new Map(), parent: new Map(), children: new Map(), order: ['root'],
  };
  slots.forEach((s, id) => {
    if (s.slot === 'root') return;
    const o = off.get(s.slot), len = v3.len(o);
    const d = len > 1e-9 ? v3.scale(o, 1 / len) : [0, 1, 0];
    skel.bones.set(s.slot, {
      id, name: s.slot, dof: s.kind === 'offset' || s.kind === 'hub' ? [] : ['rx', 'ry', 'rz'], axis: [0, 0, 0], axisOrder: 'XYZ',
      dir: [-d[0], d[1], d[2]], length: len, C: I, Cinv: I, mixamo: { rot: s.rot, end: s.end, kind: s.kind, ...(s.blend ? { blend: s.blend } : {}) },
    });
    skel.parent.set(s.slot, s.parent);
    skel.children.set(s.parent, [...(skel.children.get(s.parent) ?? []), s.slot]);
    skel.order.push(s.slot);
  });
  const take = {
    take: slug, subject: 'mixamo', source: 'mixamo', skel, frames: n, fps: FPS, pos, quat, dead: [], zeros: new Map(), bytes,
    inPlace: travel < IN_PLACE_M, travel, facing: face,
  };
  const lens = (slot) => skel.bones.get(slot)?.length ?? 0;
  take.report = {
    slug, file: dump.file ?? null, sha256: dump.sha256 ?? null, prefix: res.prefix,
    fpsIn: dump.fps, framesIn: n0, framesOut: n, seconds: r3((n0 - 1) / dump.fps),
    fpsNote: dump.fps === MIXAMO_FPS ? null : `scene fps ${dump.fps}, downloads expected at ${MIXAMO_FPS}`,
    facing: { turnDeg: r1(face.turnDeg), hipToeDeg: face.hipToeDeg === null ? null : r1(face.hipToeDeg), from: face.from },
    floorCm: r1(floorFeet * 100), floorMode: floor, travelCm: r1(travel * 100), excursionCm: r1(excursion * 100),
    inPlace: take.inPlace, fkErrMm: Math.round(fkErr * 1e5) / 100, fkErrSlot: fkErrSlot || null,
    stretchMm: Math.round(stretch * 1e4) / 10, stretchSlot: stretchSlot || null,
    unknownBones: res.unknown, missingFingers: res.missingFingers, missingEnds: res.missingEnds, fallbacks, still,
    segments: Object.fromEntries(Object.keys(SEG_END).map((j) => [j, { slot: MAP[j], mixamo: r3(lens(MAP[j])), wren: null, ratio: null }])),
    leg: { mixamo: r3(lens('lfemur') + lens('ltibia')), wren: null, scale: null },
  };
  if (rig) addWren(take.report, rig);
  return take;
}

/** Adds Wren's bind segment lengths, the ratios and the leg scale (retarget.mjs `scaleLeg`) to a report. */
export function addWren(report, rig) {
  for (const [j, e] of Object.entries(SEG_END)) {
    const s = report.segments[j], w = v3.dist(rig.bind[e], rig.bind[j]);
    s.wren = r3(w);
    s.ratio = s.mixamo > 0 ? r3(w / s.mixamo) : null;
  }
  report.leg.wren = r3(rig.leg);
  report.leg.scale = report.leg.mixamo > 0 ? r3(rig.leg / report.leg.mixamo) : null;
  return report;
}

/**
 * The direction check (A6). The take goes through retarget.mjs `retargetTake` (the path every Mixamo clip takes onto
 * Wren); at every source frame, each driven Wren segment's posed direction (its world rotation on its bind segment,
 * joint -> SEG_END child) is measured against the Mixamo segment WREN_SPANS names for it, taken from the dump's own
 * posed heads (child head minus head, in the game frame). Nothing is shared with the slots but the frame change, so a
 * slot on the wrong bone shows up here. `take` defaults to takeFromDump(dump). Returns { limitDeg, maxDeg, worst
 * ('<joint>@<source frame>'), segments: { joint: { span, deg, frame } | null (a span bone missing) }, over: [joint] }.
 */
export function mixamoDirCheck(rig, dump, { take = takeFromDump(dump) } = {}) {
  const res = resolveMixamoBones(dump.bones);
  const M = take.facing.M;
  const headAt = (b, i) => { const f = dump.pos[res.full.get(b)]; return m3.apply(M, [f[3 * i], f[3 * i + 1], f[3 * i + 2]]); };
  const R = retargetTake(rig, take.take, { load: () => take });
  const ratio = FPS / dump.fps;
  const out = { limitDeg: DIR_LIMIT_DEG, maxDeg: 0, worst: null, segments: {}, over: [] };
  for (const [j, [a, b]] of Object.entries(WREN_SPANS)) {
    if (!res.full.has(a) || !res.full.has(b)) { out.segments[j] = null; continue; }
    const bindSeg = v3.sub(rig.bind[SEG_END[j]], rig.bind[j]);
    let deg = 0, frame = 0;
    for (let i = 0; i < dump.frames; i++) {
      const k = Math.round(i * ratio);
      if (Math.abs(k - i * ratio) > 1e-6 || k >= R.qw[j].length) continue; // only the 120 fps frames on a source frame
      const w = v3.norm(q4.rotate(R.qw[j][k], bindSeg)), s = v3.norm(v3.sub(headAt(b, i), headAt(a, i)));
      const e = Math.acos(Math.max(-1, Math.min(1, v3.dot(w, s)))) * R2D;
      if (e > deg) { deg = e; frame = i; }
    }
    out.segments[j] = { span: `${a}->${b}`, deg: Math.round(deg * 100) / 100, frame };
    if (deg > out.maxDeg) { out.maxDeg = Math.round(deg * 100) / 100; out.worst = `${j}@${frame}`; }
    if (deg >= DIR_LIMIT_DEG) out.over.push(j);
  }
  return out;
}

/**
 * (mixamo-retarget I7) A take mirrored left <-> right (the recipe's `mirror`, e.g. a right-handed throw played with the
 * left hand): every slot's positions x -> -x, its rotations reflected in the same plane (q [x, y, z, w] -> [x, -y, -z, w]:
 * S R S with S = diag(-1, 1, 1)), and the `l*` / `r*` slots swapped. The rest skeleton is left as it is (Mixamo's is
 * symmetric to the millimetre). A new take; `take` is not touched. Mirroring twice gives the take back.
 */
export function mirrorTake(take) {
  const other = (s) => {
    const o = s[0] === 'l' ? `r${s.slice(1)}` : s[0] === 'r' ? `l${s.slice(1)}` : null;
    return o && take.pos.has(o) ? o : s;
  };
  const pos = new Map(), quat = new Map();
  for (const [s, arr] of take.pos) pos.set(other(s), arr.map((p) => [-p[0], p[1], p[2]]));
  for (const [s, arr] of take.quat) quat.set(other(s), arr.map((q) => [q[0], -q[1], -q[2], q[3]]));
  return { ...take, pos, quat, mirrored: !take.mirrored };
}

/** Travel headings (deg, + right of the facing) within this of an axis count as on it; past it a clip is a diagonal. */
export const AXIS_TOL_DEG = 22.5;
/** A path whose heading turns more than this between its first and second half is an arc. */
export const ARC_DEG = 20;

/**
 * (mixamo-retarget I7) The travel `auto` of a recipe: the hips' heading over the frames [a, b] (120 fps) against the
 * take's facing (+z; its reverse when the chest's mean yaw faces away, as faceTake), the nearest travel axis ('z',
 * '+x', '-z', '-x'; a tie goes to z / -z), and the flags: `diagonal` (more than AXIS_TOL_DEG off the axis) and `arc`
 * (the heading turns more than ARC_DEG between the halves). Returns { axis, headingDeg, offDeg, arcDeg, flags }.
 */
export function travelHeading(take, [a, b] = [0, take.frames - 1]) {
  const P = take.pos.get('root');
  const ia = Math.round(a), ib = Math.round(b), im = Math.round((ia + ib) / 2);
  let s = 0, c = 0;
  for (let i = ia; i <= ib; i++) {
    const f = q4.rotate(take.quat.get('thorax')[i], [0, 0, 1]);
    const y = Math.atan2(f[0], f[2]);
    s += Math.sin(y); c += Math.cos(y);
  }
  const face = Math.abs(Math.atan2(s, c)) > Math.PI / 2 ? Math.PI : 0;
  const wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));
  const hd = (i, j) => wrap(Math.atan2(P[j][0] - P[i][0], P[j][2] - P[i][2]) - face);
  const h = hd(ia, ib);
  const arc = wrap(hd(im, ib) - hd(ia, im));
  const axes = [['z', 0], ['+x', Math.PI / 2], ['-z', Math.PI], ['-x', -Math.PI / 2]];
  let axis = 'z', off = Infinity;
  for (const [n, ang] of axes) {
    const d = Math.abs(wrap(h - ang));
    if (d < off - 1e-9) { axis = n; off = d; }
  }
  const flags = [];
  if (off * R2D > AXIS_TOL_DEG) flags.push('diagonal');
  if (Math.abs(arc) * R2D > ARC_DEG) flags.push('arc');
  return { axis, headingDeg: r1(h * R2D), offDeg: r1(off * R2D), arcDeg: r1(arc * R2D), flags };
}

/** Reads `<dir>/<slug>.json` (default build/mocap/mixamo/raw) and adapts it (takeFromDump). */
export function loadMixamoTake(slug, { dir = MIXAMO_RAW, rig = null, floor = 'feet' } = {}) {
  const file = path.join(dir, `${slug}.json`);
  if (!existsSync(file)) throw new Error(`missing ${file} (the M1 dump: node scripts/mocap/mixamo.mjs)`);
  const dump = JSON.parse(readFileSync(file, 'utf8'));
  if (dump.slug && dump.slug !== slug) throw new Error(`mixamo dump ${file}: slug ${dump.slug}, want ${slug}`);
  return takeFromDump(dump, { rig, floor, bytes: statSync(file).size, slug });
}

/** A loader for retarget.mjs / analyze.mjs injection: `(slug) => take`. */
export const mixamoLoader = (opts = {}) => (slug) => loadMixamoTake(slug, opts);

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  let slugs = process.argv.slice(2);
  if (!slugs.length) slugs = existsSync(MIXAMO_RAW) ? readdirSync(MIXAMO_RAW).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)) : [];
  if (!slugs.length) { console.error(`no dumps in ${MIXAMO_RAW}`); process.exit(2); }
  const { wrenRig } = await import('./retarget.mjs');
  const rig = wrenRig();
  let bad = 0;
  for (const slug of slugs) {
    const dump = JSON.parse(readFileSync(path.join(MIXAMO_RAW, `${slug}.json`), 'utf8'));
    const t = takeFromDump(dump, { rig, bytes: statSync(path.join(MIXAMO_RAW, `${slug}.json`)).size, slug });
    const c = selfCheck(t), r = t.report;
    console.info(`${slug}: ${r.framesIn} f @${r.fpsIn} -> ${t.frames} f @${FPS} ${c.ok ? 'OK' : 'FAIL'} | facing ${r.facing.turnDeg} deg (${r.facing.from}) | floor ${r.floorCm} cm | travel ${r.travelCm} cm${r.inPlace ? ' (in place)' : ''} | fk ${r.fkErrMm} mm | blend stretch ${r.stretchMm} mm (${r.stretchSlot}) | leg ${r.leg.mixamo} m, scale ${r.leg.scale}`);
    for (const l of c.lines) console.info(`  ${l}`);
    console.info(`  ratio wren/mixamo: ${Object.entries(r.segments).map(([j, s]) => `${j} ${s.ratio}`).join(', ')}`);
    const dc = mixamoDirCheck(rig, dump, { take: t }), dd = (e) => (e ? `${e.deg}@${e.frame}` : '-');
    console.info(`  dir (retargeted Wren vs Mixamo heads, worst deg@frame): spine ${dd(dc.segments.spine)}, chest ${dd(dc.segments.chest)}, neck ${dd(dc.segments.neck)} | all ${dc.maxDeg} (${dc.worst})${dc.over.length ? ` OVER ${dc.limitDeg}: ${dc.over.join(', ')}` : ''}`);
    if (!c.ok) bad++;
    if (dc.over.length) bad++;
  }
  process.exit(bad ? 1 : 0);
}
