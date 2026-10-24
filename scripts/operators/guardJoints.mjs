// Guard base joints for the bake (docs/guard-models/PLAN.md slice G1, SPEC section 6). Pure: no fs.
//
// A guard's game rig is a CharacterRig built from `proportions(def.build, def.height)` (src/ai/enemyRig.ts). A base's
// skeleton is that rig at the base's reference (height, build): the joint layout of `operatorJoints` (the same `n(...)`
// offsets as characterRig.ts) plus the clavicles at the sternoclavicular points (`clavPoint`, src/anim/clavicle.ts), so
// the 23 bones are exactly `RIG_JOINTS` (src/operators/runtime/pose.ts). `shL` / `shR` hang under the clavicles as on
// Wren's LOD files (anim-skeleton S1). `handL` / `handR` (fingertips) are not bones: they come out as `ends`, the
// direction of the wrist bone for the body fit. The output file has export-joints.mjs' shape, so common.load_operator
// reads it (operator id `guard-<base>`).
import { hitVolumes, proportions, BUILDS } from '../../src/player/proportions.ts';
import { operatorJoints, operatorProportions, OPERATORS } from '../../src/operators/operatorBody.ts';
import { CLAV_SC } from '../../src/anim/clavicle.ts';

export const GUARD_ID_PREFIX = 'guard-';

/** The 23 bones of a guard base, parents first (the set of RIG_JOINTS; order: the hierarchy walk the bake uses). */
export const GUARD_RIG_ORDER = [
  'root', 'body', 'pelvis', 'spine', 'chest', 'neck', 'head',
  'clavL', 'shL', 'elL', 'wrL', 'clavR', 'shR', 'elR', 'wrR',
  'hipL', 'knL', 'anL', 'toeL', 'hipR', 'knR', 'anR', 'toeR',
];

const round = (v) => Math.round(v * 1e5) / 1e5;

/** Checks a kit base entry (guards.json `bases[]`) and returns its (id, refHeight, build). */
export function baseRef(base) {
  if (!base || typeof base.id !== 'string' || !base.id) throw new Error('base without an id');
  const h = base.refHeight;
  if (typeof h !== 'number' || !(h >= 1.5 && h <= 2.1)) throw new Error(`base ${base.id}: refHeight ${h} is not a height in metres (1.5-2.1)`);
  if (!BUILDS.includes(base.build)) throw new Error(`base ${base.id}: build "${base.build}" is not one of ${BUILDS.join(', ')}`);
  return { id: base.id, refHeight: h, build: base.build };
}

/**
 * The clavicle weight split (scripts/anim-skeleton/skeleton.json `clavicle`: smoothstep bands in |x| and height, tuned
 * on Wren's bind) moved onto a guard: heights keep their offset from the SC point scaled by stature, the |x| band scales
 * with the shoulder joint's half width. Wren's own proportions give the file's numbers back.
 */
export function clavicleSplit(p, cfg) {
  const wren = operatorProportions(OPERATORS.wren);
  const sc = (q) => q.y.neck - CLAV_SC.belowNeck;
  const ky = p.height / wren.height;
  const kx = p.shoulderHalf / wren.shoulderHalf;
  return {
    x: cfg.x.map((x) => round(x * kx)),
    y: cfg.y.map((y) => round(sc(p) + (y - sc(wren)) * ky)),
    max: cfg.max,
  };
}

/** One base's skeleton entry: proportions, hit volumes, the 23 bind joints (game frame, rig rest: arms hanging). */
export function guardJoints(base, clavCfg) {
  const { id, refHeight, build } = baseRef(base);
  const p = proportions(build, refHeight);
  const op = Object.fromEntries(operatorJoints(p).map((j) => [j.name, j]));
  const chestY = op.chest.pos[1];
  const at = (name, parent, pos) => ({ name, parent, pos: pos.map(round) });
  const joints = GUARD_RIG_ORDER.map((name) => {
    const side = name.endsWith('L') ? -1 : 1;
    if (name === 'clavL' || name === 'clavR') {
      // clavPoint in the chest frame (rest identity): lateral of the midline, under the neck joint, forward of the chest
      return at(name, 'chest', [side * CLAV_SC.lateral, chestY + (p.y.neck - chestY) - CLAV_SC.belowNeck, CLAV_SC.forward]);
    }
    const j = op[name];
    if (!j) throw new Error(`operatorJoints has no ${name}`);
    const parent = name === 'shL' ? 'clavL' : name === 'shR' ? 'clavR' : j.parent;
    return at(name, parent, j.pos);
  });
  return {
    id: `${GUARD_ID_PREFIX}${id}`,
    base: id,
    height: refHeight,
    build,
    proportions: p,
    hitVolumes: hitVolumes(p),
    joints,
    ends: { handL: op.handL.pos.map(round), handR: op.handR.pos.map(round) },
    clavicleSplit: clavCfg ? clavicleSplit(p, clavCfg) : null,
  };
}

/** The joints file for one base (export-joints.mjs' shape: `operators[0]` is the base). */
export function guardJointsFile(base, clavCfg) {
  return {
    frame: 'game: +X right, +Y up, +Z forward (Babylon, left-handed); metres; feet on y = 0; rig rest (arms hanging)',
    operators: [guardJoints(base, clavCfg)],
  };
}

/** Repo-relative output path of a base's joints file under the bake's out dir. */
export const jointsRel = (baseId) => `joints/${GUARD_ID_PREFIX}${baseId}.json`;
