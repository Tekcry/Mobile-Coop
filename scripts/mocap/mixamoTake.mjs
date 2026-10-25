// (mixamo-retarget M2) Mixamo take adapter: a Blender dump of one Mixamo FBX (slice M1, `build/mocap/mixamo/raw/<slug>.json`,
// format in docs/mixamo-retarget/PLAN.md "Dump format") -> the take shape asfamc.mjs `loadTake` returns, so the CMU
// pipeline (retarget.mjs `retargetTake` / `buildSlot`, analyze.mjs `analyzeTake`) runs on it through its injected loader:
//   buildSlot(rig, pick, choice, '', null, { load: mixamoLoader(), licence: MIXAMO_LICENCE, inPlace })
//   node scripts/mocap/mixamoTake.mjs [slug ...]     self-check + report per dump (all dumps when none named)
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
import { baseName, mixamoSlots, resolveMixamoBones, MIXAMO_FPS } from './mixamoMap.mjs';
import { MAP, SEG_END } from './retarget.mjs';

export const MIXAMO_DIR = path.join(ROOT, 'build', 'mocap', 'mixamo');
export const MIXAMO_RAW = path.join(MIXAMO_DIR, 'raw');
/** Hips travel (m, first to last frame, horizontal) under which a clip counts as on the spot (A4). */
export const IN_PLACE_M = 0.05;
/** The source line an intermediate carries (retarget.mjs `buildSlot` `licence`). */
export const MIXAMO_LICENCE = 'Mixamo (mixamo.com, Adobe), royalty-free for commercial use (docs/art-credits.md)';
/** Toe-direction vs hip-line forward: averaged when within this angle, else the hip line alone is used. */
const TOE_AGREE_DEG = 45;

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
  for (const b of new Set(slots.map((s) => s.rot))) {
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
  for (const s of slots) {
    if (s.slot === 'root') { restTip.set('root', toG(restB.get('Hips'))); off.set('root', [0, 0, 0]); continue; }
    const start = restTip.get(s.parent);
    let tip = start;
    if (s.end) tip = toG(restB.get(s.end));
    else if (s.extend) {
      let p = s.parent;
      while (p && v3.len(off.get(p)) < 1e-9) p = bySlot.get(p).parent;
      tip = v3.add(start, v3.scale(p ? off.get(p) : [0, 0, 0], s.extend));
      fallbacks.push(s.slot);
    }
    off.set(s.slot, v3.sub(tip, start));
    restTip.set(s.slot, tip);
  }
  const fk = (rootP, qOf) => {
    const P = new Map([['root', rootP]]);
    for (const s of slots) if (s.slot !== 'root') P.set(s.slot, v3.add(P.get(s.parent), q4.rotate(qOf(s.rot), off.get(s.slot))));
    return P;
  };
  // dump sanity: FK tips against the dump's own posed heads
  let fkErr = 0, fkErrSlot = '';
  for (let i = 0; i < n0; i++) {
    const P = fk(headAt('Hips', i), (b) => qSrc.get(b)[i]);
    for (const s of slots) {
      if (!s.end || s.slot === 'root') continue;
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
    for (const s of slots) { pos.get(s.slot).push(P.get(s.slot)); quat.get(s.slot).push(qOut.get(s.rot)[k]); }
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
    .filter((s) => qSrc.get(s.rot).every((q) => q4.between(q, qSrc.get(s.rot)[0]) < 1e-4)).map((s) => s.slot);
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
      dir: [-d[0], d[1], d[2]], length: len, C: I, Cinv: I, mixamo: { rot: s.rot, end: s.end, kind: s.kind },
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
    const t = loadMixamoTake(slug, { rig });
    const c = selfCheck(t), r = t.report;
    console.info(`${slug}: ${r.framesIn} f @${r.fpsIn} -> ${t.frames} f @${FPS} ${c.ok ? 'OK' : 'FAIL'} | facing ${r.facing.turnDeg} deg (${r.facing.from}) | floor ${r.floorCm} cm | travel ${r.travelCm} cm${r.inPlace ? ' (in place)' : ''} | fk ${r.fkErrMm} mm | leg ${r.leg.mixamo} m, scale ${r.leg.scale}`);
    for (const l of c.lines) console.info(`  ${l}`);
    if (!c.ok) bad++;
  }
  process.exit(bad ? 1 : 0);
}
