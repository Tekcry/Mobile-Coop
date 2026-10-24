// Guard base body check (docs/guard-models/PLAN.md G1 "Checks", PLAN 5 budgets, SPEC 1 / 6 / 7): reads the
// bodies/guard-<base>-body.json a bodies job writes and lists every way it misses the contract. Pure (no fs) apart from
// the CLI at the bottom; the lead runs it on the laptop bake's outputs (no loader flag needed):
//   node scripts/operators/guardBodyCheck.mjs --kit <guards.json> <bodies/guard-*-body.json | body.json | bodies folder>...
// The `*` is expanded here (cliFiles.mjs; cmd.exe, which runs the laptop bake's steps, passes it literally).
// Exit 1 when any report has a problem, 2 on a bad argument or when no report is found.
//
// The game's TypeScript (guardJoints.mjs -> src/operators/operatorBody.ts -> '../player/proportions', extensionless)
// needs ts-resolve.mjs's resolve hook. A static import graph is resolved before any module body runs, so the hook is
// registered first (the side-effect import below) and the modules that reach the TypeScript load after it, by dynamic
// import (as check-guards.mjs does). Running under `node --import ./scripts/operators/ts-resolve.mjs` too is harmless.
import './ts-resolve.mjs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandFileArgs } from './cliFiles.mjs';

const { guardJoints } = await import('./guardJoints.mjs');
const { FING_LEN, FING_L, FING_R, fingerPose, fingerRig } = await import('../../src/anim/fingers.ts');

/** Limits (metres unless named). */
export const LIMITS = {
  jointRoundTrip: 1e-4, // PLAN G1: round-trip joints < 0.1 mm
  boneLength: 1e-4, // bind bone lengths = the game rig's
  dimension: 0.010, // every solved body dimension within 10 mm of its target
  stature: 0.012, // not solved: the A-pose legs move the soles a few mm
  kindScale: 0.02, // SPEC 1 / A2: each kind's figure scales from its base's reference height within +-2 %
  rigJoint: 1e-4, // the report's rig rest joints = the game rig at the base's (height, build)
};
export const RIG_BONES = 23;
export const FINGER_BONES = 10;

const close = (a, b, eps) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= eps);

/** Wren's finger joint names (src/anim/fingers.ts FINGER_RE) with one segment: `finger<S>_<f>_1`. */
export const FINGER_NAME = /^finger([LR])_([1-5])_1$/;

const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit3 = (a) => { const l = Math.sqrt(dot3(a, a)); return [a[0] / l, a[1] / l, a[2] / l]; };

/** Unit quaternion (x, y, z, w) of the rotation whose columns are the axes x, y, z. */
function quatFromAxes(x, y, z) {
  const t = x[0] + y[1] + z[2];
  let q;
  if (t > 0) { const s = Math.sqrt(t + 1) * 2; q = [(y[2] - z[1]) / s, (z[0] - x[2]) / s, (x[1] - y[0]) / s, s / 4]; }
  else if (x[0] > y[1] && x[0] > z[2]) { const s = Math.sqrt(1 + x[0] - y[1] - z[2]) * 2; q = [s / 4, (y[0] + x[1]) / s, (z[0] + x[2]) / s, (y[2] - z[1]) / s]; }
  else if (y[1] > z[2]) { const s = Math.sqrt(1 + y[1] - x[0] - z[2]) * 2; q = [(y[0] + x[1]) / s, s / 4, (z[1] + y[2]) / s, (z[0] - x[2]) / s]; }
  else { const s = Math.sqrt(1 + z[2] - x[0] - y[1]) * 2; q = [(z[0] + x[2]) / s, (z[1] + y[2]) / s, s / 4, (x[1] - y[0]) / s]; }
  return q;
}

function rotq(q, v) {
  const [qx, qy, qz, qw] = q;
  const tx = 2 * (qy * v[2] - qz * v[1]), ty = 2 * (qz * v[0] - qx * v[2]), tz = 2 * (qx * v[1] - qy * v[0]);
  return [v[0] + qw * tx + (qy * tz - qz * ty), v[1] + qw * ty + (qz * tx - qx * tz), v[2] + qw * tz + (qx * ty - qy * tx)];
}

/**
 * The guard's finger bones through the game's own finger drive (src/anim/fingers.ts): bind frames from the report
 * (local Y along the bone, Z = `zAxis`, game frame), `fingerRig` must find all ten, and a full curl must close every
 * finger (2..5) toward the palm on both hands. The thumb's roll is the bake's (`fingerAxes.thumbFlexDot`, the match
 * of THUMB_AXES[0] to Wren's opposition axis). Problems as strings.
 */
export function checkFingerAxes(report) {
  const p = [];
  const fb = report.fingerBones ?? {};
  const names = Object.keys(fb);
  const bad = names.filter((n) => !FINGER_NAME.test(n));
  if (bad.length) p.push(`finger bones not in Wren's scheme finger<S>_<f>_1: ${bad.join(' ')}`);
  if (names.length !== FINGER_BONES) p.push(`${names.length} finger bones in fingerBones, want ${FINGER_BONES}`);
  const bindPos = new Float64Array(names.length * 3);
  const bindRot = new Float64Array(names.length * 4);
  const ok = names.map((n, s) => {
    const b = fb[n];
    if (!b?.head || !b?.tail || !b?.zAxis || !b?.palm) { p.push(`${n}: head / tail / zAxis / palm missing`); return false; }
    const y = unit3(sub3(b.tail, b.head));
    const z = unit3(b.zAxis);
    if (Math.abs(dot3(y, z)) > 2e-3) { p.push(`${n}: zAxis not normal to the bone (${dot3(y, z).toFixed(4)})`); return false; }
    bindPos.set(b.head, s * 3);
    bindRot.set(quatFromAxes(cross3(y, z), y, z), s * 4);
    return true;
  });
  if (p.length) return p;
  const r = fingerRig(names, bindPos, bindRot);
  if (!r || r.slot.length !== names.length) return [...p, `fingerRig found ${r?.slot.length ?? 0} of ${names.length} finger joints`];
  const v = new Float64Array(FING_LEN);
  for (let f = 0; f < 5; f++) { v[FING_L + f * 2] = 1; v[FING_R + f * 2] = 1; }
  const q = new Float64Array(names.length * 4);
  const on = new Uint8Array(names.length);
  fingerPose(r, v, q, on);
  names.forEach((n, s) => {
    if (!ok[s] || n.split('_')[1] === '1') return;
    const b = fb[n];
    const bone = sub3(b.tail, b.head);
    const d = sub3(rotq([q[s * 4], q[s * 4 + 1], q[s * 4 + 2], q[s * 4 + 3]], bone), bone);
    // the palm direction normal to the bone: a clean curl by a gives cos(a / 2) (80 deg MCP: 0.77)
    const y = unit3(bone);
    const pl = unit3(b.palm);
    const pp = unit3(sub3(pl, y.map((c) => c * dot3(pl, y))));
    const toward = dot3(unit3(d), pp);
    if (!(toward > 0.5)) p.push(`${n}: a curl moves the tip ${toward.toFixed(2)} toward the palm (want > 0.5)`);
  });
  for (const [n, d] of Object.entries(report.fingerAxes?.thumbFlexDot ?? {})) {
    if (!(d >= 0.95)) p.push(`${n}: THUMB_AXES[0] off Wren's opposition axis (dot ${d})`);
  }
  if (Object.keys(report.fingerAxes?.thumbFlexDot ?? {}).length !== 2) p.push('fingerAxes.thumbFlexDot needs both thumbs');
  return p;
}

/**
 * Problems with one body report (empty: it passes).
 * @param report parsed bodies/guard-<base>-body.json
 * @param kit parsed guards.json
 * @param kindHeights optional { kind: height } (src/config/enemies.json); checks the uniform scale of the base's kinds
 */
export function checkGuardBody(report, kit, kindHeights) {
  const p = [];
  const base = (kit.bases ?? []).find((b) => b.id === report.base);
  if (!base) return [`base "${report.base}" is not in the kit`];
  if (report.refHeight !== base.refHeight) p.push(`refHeight ${report.refHeight} != kit ${base.refHeight}`);
  if (report.build !== base.build) p.push(`build ${report.build} != kit ${base.build}`);

  // bones (PLAN 5: 33 at LOD0 = 23 rig joints + 10 fingers, no face bones; 23 at LOD1 / LOD2)
  const rig = kit.bones?.rig ?? [];
  const fingers = kit.bones?.fingers ?? [];
  const names = new Set(report.boneNames ?? []);
  if (report.bones !== RIG_BONES + FINGER_BONES) p.push(`${report.bones} bones, want ${RIG_BONES + FINGER_BONES}`);
  const missing = [...rig, ...fingers].filter((n) => !names.has(n));
  if (missing.length) p.push(`bones missing: ${missing.join(' ')}`);
  const extra = [...names].filter((n) => !rig.includes(n) && !fingers.includes(n));
  if (extra.length) p.push(`bones not in the kit: ${extra.join(' ')}`);
  const lb = report.lodBones;
  if (!lb) p.push('no lodBones');
  else {
    if (lb.lod0?.length !== RIG_BONES + FINGER_BONES) p.push(`lod0 keeps ${lb.lod0?.length} bones`);
    for (const l of ['lod1', 'lod2']) {
      if (lb[l]?.length !== RIG_BONES || lb[l].some((n) => !rig.includes(n))) p.push(`${l} must keep exactly the ${RIG_BONES} rig joints`);
    }
    for (const f of fingers) {
      const want = kit.bones?.fingerParent?.[f.split('_')[0]];
      if (lb.fold?.[f] !== want) p.push(`${f} folds into ${lb.fold?.[f]}, want ${want}`);
    }
  }

  // fingers: Wren's names and curl axes, so src/anim/fingers.ts drives them unchanged (SPEC 6)
  p.push(...checkFingerAxes(report));
  // G2's reused garment scripts read `height` and the fingertip ends
  if (report.height !== base.refHeight) p.push(`height ${report.height} != refHeight ${base.refHeight}`);
  for (const k of ['handL', 'handR']) if (report.bindJoints?.[k]?.length !== 3) p.push(`bindJoints.${k} missing`);

  // skin (PLAN 5: 4 influences at LOD0; every vertex weighted)
  const maxInf = kit.bones?.influences?.[0] ?? 4;
  if (!(report.maxInfluences >= 1 && report.maxInfluences <= maxInf)) p.push(`${report.maxInfluences} influences, limit ${maxInf}`);
  if (report.unweightedVerts !== 0) p.push(`${report.unweightedVerts} unweighted vertices`);
  if (!(report.deformCheck?.maxMove < 0.8)) p.push(`deform check moved ${report.deformCheck?.maxMove} m`);

  // joints
  if (!(report.jointRoundTripMaxError < LIMITS.jointRoundTrip)) p.push(`joint round trip ${report.jointRoundTripMaxError} m`);
  if (!(report.boneLengthMaxError < LIMITS.boneLength)) p.push(`bone lengths off by ${report.boneLengthMaxError} m`);
  const game = guardJoints(base);
  for (const j of game.joints) {
    const got = report.rigRestJoints?.[j.name];
    if (!got || !close(got, j.pos, LIMITS.rigJoint)) p.push(`rig rest ${j.name} ${JSON.stringify(got)} != game ${JSON.stringify(j.pos)}`);
  }
  // hit volumes come from the sim's proportions and must stay the game's (BRIEF: gameplay never reads graphics state)
  for (const [k, v] of Object.entries(game.hitVolumes)) {
    if (Math.abs((report.hitVolumes?.[k] ?? NaN) - v) > 1e-6) p.push(`hit volume ${k} ${report.hitVolumes?.[k]} != game ${v}`);
  }

  // dimensions against targets
  for (const [k, t] of Object.entries(report.target ?? {})) {
    const m = report.measured?.[k];
    const lim = k === 'stature' ? LIMITS.stature : LIMITS.dimension;
    if (!Number.isFinite(m) || Math.abs(m - t) > lim) p.push(`${k} ${m} vs target ${t} (limit ${lim * 1000} mm)`);
  }

  // the neck seam (SPEC 7): a closed loop, rings -2..2 for the blend
  const seam = report.neckSeam;
  if (!seam || !(seam.mhVerts?.length >= 12) || seam.bodyVerts?.length !== seam.mhVerts.length) p.push('neck seam loop missing');
  else {
    for (const r of ['-2', '-1', '0', '1', '2']) if (!seam.rings?.[r]?.length) p.push(`neck seam ring ${r} empty`);
    if (seam.at !== kit.face?.neckSeam?.at) p.push(`neck seam at ${seam.at} != kit ${kit.face?.neckSeam?.at}`);
  }

  // each kind of the base scales uniformly from the reference height within +-2 %
  if (kindHeights) {
    for (const k of base.kinds ?? []) {
      const h = kindHeights[k];
      if (typeof h !== 'number') { p.push(`kind ${k}: no height`); continue; }
      const s = h / base.refHeight - 1;
      if (Math.abs(s) > LIMITS.kindScale) p.push(`kind ${k} ${h} m scales ${(s * 100).toFixed(1)} % from ${base.refHeight} m`);
    }
  }
  return p;
}

/** One line of numbers for the report: tris, bones, influences, the worst dimension error, stature, seconds. */
export function summary(report) {
  const errs = Object.entries(report.errorsMm ?? {}).filter(([k]) => k !== 'stature').map(([, v]) => Math.abs(v));
  const m = report.measured ?? {};
  return `${report.base}: ${report.tris} tris, ${report.vertices} verts, ${report.bones} bones, ${report.maxInfluences} influences, `
    + `stature ${m.stature?.toFixed(3)} m (${report.errorsMm?.stature} mm), shoulders ${m.shoulderWidth?.toFixed(3)}, `
    + `chest girth ${m.chestGirth?.toFixed(3)}, neck girth ${m.neckGirth?.toFixed(3)} m, dims worst ${Math.max(0, ...errs).toFixed(2)} mm, `
    + `round trip ${report.jointRoundTripMaxError?.toExponential(1)} m, ${report.seconds} s`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const ki = argv.indexOf('--kit');
  const usage = 'usage: guardBodyCheck.mjs --kit <guards.json> <bodies/guard-<base>-body.json | bodies/guard-*-body.json | bodies folder>...';
  if (ki < 0 || !argv[ki + 1]) { console.error(usage); process.exit(2); }
  const kit = JSON.parse(readFileSync(argv[ki + 1], 'utf8'));
  let files = [];
  try { files = expandFileArgs(argv.filter((_, i) => i !== ki && i !== ki + 1), { dirMatch: /^guard-.+-body\.json$/ }); } catch (e) { console.error(`${e.message}\n${usage}`); process.exit(2); }
  if (!files.length) { console.error(usage); process.exit(2); }
  const here = path.dirname(fileURLToPath(import.meta.url));
  const enemies = JSON.parse(readFileSync(path.join(here, '..', '..', 'src', 'config', 'enemies.json'), 'utf8'));
  const heights = Object.fromEntries(Object.entries(enemies).map(([k, v]) => [k, v.height]));
  let bad = 0;
  for (const f of files) {
    const r = JSON.parse(readFileSync(f, 'utf8'));
    const probs = checkGuardBody(r, kit, heights);
    console.info(`${probs.length ? 'FAIL' : 'ok  '} ${summary(r)}`);
    for (const q of probs) console.info(`     ${q}`);
    if (probs.length) bad++;
  }
  process.exitCode = bad ? 1 : 0;
}
