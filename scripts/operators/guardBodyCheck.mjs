// Guard base body check (docs/guard-models/PLAN.md G1 "Checks", PLAN 5 budgets, SPEC 1 / 6 / 7): reads the
// bodies/guard-<base>-body.json a bodies job writes and lists every way it misses the contract. Pure (no fs) apart from
// the CLI at the bottom; the lead runs it on the laptop bake's outputs:
//   node --import ./scripts/operators/ts-resolve.mjs scripts/operators/guardBodyCheck.mjs --kit <guards.json> <body.json>...
// Exit 1 when any report has a problem.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { guardJoints } from './guardJoints.mjs';

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
  if (ki < 0 || !argv[ki + 1]) { console.error('usage: guardBodyCheck.mjs --kit <guards.json> <body.json>...'); process.exit(2); }
  const kit = JSON.parse(readFileSync(argv[ki + 1], 'utf8'));
  const files = argv.filter((_, i) => i !== ki && i !== ki + 1);
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
