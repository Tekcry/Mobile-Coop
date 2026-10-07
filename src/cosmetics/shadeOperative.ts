import { SHADE_PALETTE, type ShadeColor } from '../config/shade';
import type { Proportions } from '../player/proportions';
import type { Paint, Prim, PrimShape, V3 } from '../voxel/voxelModelBuilder';

/**
 * SHADE OPERATIVE (3.2, pure): the default avatar - a human body in a fitted tactical suit, no equipment (armour and
 * gear come later as customisation). The body is rounded primitives in the spaces of the shared rig's joints, sized
 * from its proportions (`proportions.ts`), blended into one continuous skin by `VoxelModelBuilder`: ribcage, waist,
 * pelvis and glutes, pecs, trapezius, deltoids, biceps and forearms, quads, knees and calves, a head and jaw under
 * a hood; gloved hands and boots. The suit is colour regions on the skin: smooth panels (chest, back
 * yoke, shoulders, forearms, knees, thigh fronts) over a matte base, woven mesh down the sides and the inner arms, a
 * hood with the skin round the eyes showing, gloves, boots with a sole.
 *
 * It is modelled in a bind pose with the arms out 35 deg and the legs out 6 deg (`SHADE_BIND`) so no limb touches the
 * body except where it joins; the rig is posed like that while the skin binds.
 */

/** Palette slots in index order (colour value = index + 1). */
export const SHADE_SLOTS: readonly ShadeColor[] = ['suit', 'panel', 'mesh', 'glove', 'boot', 'sole', 'skin', 'eye'];
const C = Object.fromEntries(SHADE_SLOTS.map((k, i) => [k, i + 1])) as Record<ShadeColor, number>;

/** sRGB hex per colour value (index 0 unused). */
export function shadeColors(): string[] {
  return ['#000000', ...SHADE_SLOTS.map((k) => SHADE_PALETTE[k])];
}

/** The joints the skin binds to, in bone order. */
export const SHADE_JOINTS = ['pelvis', 'spine', 'chest', 'neck', 'head', 'shoulderL', 'elbowL', 'wristL', 'shoulderR', 'elbowR', 'wristR', 'hipL', 'kneeL', 'ankleL', 'hipR', 'kneeR', 'ankleR'] as const;
export type ShadeJoint = (typeof SHADE_JOINTS)[number];
const J = Object.fromEntries(SHADE_JOINTS.map((k, i) => [k, i])) as Record<ShadeJoint, number>;

/** Bind pose: the arms swing out about the body's forward axis, the legs a little (rad). */
export const SHADE_BIND = { arm: (35 * Math.PI) / 180, leg: (6 * Math.PI) / 180 } as const;

const E = (c: V3, r: V3): PrimShape => ({ kind: 'ellipsoid', c, r });
const K = (a: V3, b: V3, ra: number, rb: number): PrimShape => ({ kind: 'cone', a, b, ra, rb });
const B = (c: V3, h: V3, round: number): PrimShape => ({ kind: 'box', c, h, round });

/** The body for a set of proportions: primitives (in blend order) and the suit's colour regions. */
export function shadeBody(p: Proportions): { prims: Prim[]; paints: Paint[] } {
  const prims: Prim[] = [];
  const paints: Paint[] = [];
  const k = p.height / 1.75;
  const add = (joint: ShadeJoint, shape: PrimShape, blend: number, color: number = C.suit, clipBelow?: number): void => {
    prims.push({ shape, joint: J[joint], color, blend, clipBelow });
  };
  const paint = (joint: ShadeJoint, shape: PrimShape, color: number): void => {
    paints.push({ shape, joint: J[joint], color });
  };
  const Y = p.y;
  const chestY = Y.waist + 0.13 * k;

  // ---- trunk: pelvis and glutes (pelvis joint), waist (spine), ribcage, pecs, upper back, trapezius (chest)
  const pw = p.pelvis.w / 2;
  const pd = p.pelvis.d / 2;
  add('pelvis', E([0, -0.01 * k, 0.005 * k], [pw * 0.93, 0.105 * k, pd * 0.95]), 0);
  for (const s of [-1, 1]) add('pelvis', E([s * 0.06 * k, -0.055 * k, -0.045 * k], [0.068 * k, 0.085 * k, 0.065 * k]), 0.03 * k);
  add('spine', E([0, 0.02 * k, 0.0], [(p.waist.w / 2) * 0.98, 0.13 * k, (p.waist.d / 2) * 0.98]), 0.05 * k);
  const cw = p.chest.w / 2;
  const cd = p.chest.d / 2;
  add('chest', E([0, 0.1 * k, -0.005 * k], [cw * 0.97, 0.175 * k, cd * 0.95]), 0.05 * k);
  for (const s of [-1, 1]) add('chest', E([s * 0.062 * k, 0.15 * k, 0.055 * k], [0.072 * k, 0.06 * k, 0.05 * k]), 0.03 * k);
  add('chest', E([0, 0.19 * k, -0.035 * k], [cw * 0.82, 0.09 * k, cd * 0.75]), 0.04 * k);
  add('chest', E([0, Y.neck - chestY - 0.02 * k, -0.02 * k], [p.shoulderHalf * 0.92, 0.055 * k, 0.07 * k]), 0.05 * k);

  // ---- neck and head: a hood over the skull and the jaw (features finer than the field's voxels - a nose, a brow -
  // would alias into spikes, so the hood stays smooth)
  add('neck', K([0, -0.03 * k, -0.01 * k], [0, p.neck.len + 0.05 * k, 0.005 * k], p.neck.r * 1.08, p.neck.r * 0.92), 0.04 * k);
  const H = p.head;
  add('head', E([0, 0.022 * k, -0.008 * k], [H.w * 0.5, H.h * 0.44, H.d * 0.5]), 0.03 * k);
  add('head', E([0, -0.045 * k, 0.022 * k], [H.w * 0.39, H.h * 0.3, H.d * 0.36]), 0.025 * k);

  // ---- arms: deltoid, upper arm with the biceps / triceps, elbow, forearm, a gloved hand (palm in, fingers down,
  // thumb forward); right authored, the left mirrors x
  const ua = p.upperArm;
  const fa = p.forearm;
  for (const [s, sh, el, wr] of [
    [1, 'shoulderR', 'elbowR', 'wristR'],
    [-1, 'shoulderL', 'elbowL', 'wristL'],
  ] as const) {
    add(sh, E([s * 0.012 * k, -0.025 * k, 0], [ua.r0 * 1.32, 0.085 * k, ua.r0 * 1.25]), 0.04 * k);
    add(sh, K([0, 0, 0], [0, -ua.len, 0], ua.r0, ua.r1 * 1.05), 0.03 * k);
    add(sh, E([0, -ua.len * 0.45, 0.012 * k], [ua.r0 * 0.92, ua.len * 0.3, ua.r0 * 0.98]), 0.025 * k);
    add(sh, E([0, -ua.len * 0.4, -0.014 * k], [ua.r0 * 0.88, ua.len * 0.32, ua.r0 * 0.9]), 0.025 * k);
    add(el, K([0, 0.01 * k, 0], [0, -fa.len, 0], fa.r0 * 1.02, fa.r1), 0.03 * k);
    add(el, E([s * 0.004 * k, -fa.len * 0.28, 0.004 * k], [fa.r0 * 1.12, fa.len * 0.3, fa.r0 * 1.02]), 0.025 * k);
    const hl = p.hand.len;
    const ht = p.hand.t;
    const hw = p.hand.w;
    add(wr, E([0, -hl * 0.28, 0.002 * k], [ht * 0.72, hl * 0.3, hw * 0.52]), 0.02 * k, C.glove);
    add(wr, E([s * 0.002 * k, -hl * 0.66, -0.004 * k], [ht * 0.66, hl * 0.26, hw * 0.48]), 0.015 * k, C.glove);
    add(wr, K([-s * 0.004 * k, -hl * 0.22, hw * 0.36], [-s * 0.002 * k, -hl * 0.5, hw * 0.46], 0.018 * k, 0.016 * k), 0.015 * k, C.glove);
  }

  // ---- legs: hip, thigh with the quads and hamstrings, knee, shin with the calf, a boot (flat sole)
  const th = p.thigh;
  const cf = p.calf;
  for (const [s, hp, kn, an] of [
    [1, 'hipR', 'kneeR', 'ankleR'],
    [-1, 'hipL', 'kneeL', 'ankleL'],
  ] as const) {
    add(hp, K([0, 0.02 * k, 0], [0, -th.len, 0], th.r0 * 1.02, th.r1), 0.035 * k);
    add(hp, E([s * 0.006 * k, -th.len * 0.42, 0.018 * k], [th.r0 * 0.92, th.len * 0.36, th.r0 * 0.88]), 0.03 * k);
    add(hp, E([s * 0.004 * k, -th.len * 0.5, -0.02 * k], [th.r0 * 0.82, th.len * 0.32, th.r0 * 0.8]), 0.03 * k);
    add(kn, E([0, 0.005 * k, 0.012 * k], [th.r1 * 0.98, 0.05 * k, th.r1 * 0.95]), 0.025 * k);
    add(kn, K([0, 0, 0], [0, -cf.len + 0.04 * k, 0], cf.r0, cf.r1), 0.03 * k);
    add(kn, E([s * 0.004 * k, -cf.len * 0.3, -0.022 * k], [cf.r0 * 0.95, cf.len * 0.24, cf.r0 * 0.88]), 0.03 * k);
    // boot: shaft round the ankle, the foot forward, cut flat at the sole
    const sole = -Y.ankle;
    add(an, K([0, 0.09 * k, 0], [0, sole + 0.03 * k, -0.005 * k], cf.r1 * 1.3, cf.r1 * 1.45), 0.02 * k, C.boot, sole);
    add(an, E([0, sole + 0.035 * k, p.foot.len * 0.22], [p.foot.w * 0.5, 0.05 * k, p.foot.len * 0.5]), 0.03 * k, C.boot, sole);
  }

  // ---- the suit: colour regions over the skin
  // woven mesh down the torso's sides (ribs to hips) and the inner arms
  for (const s of [-1, 1]) {
    paint('chest', B([s * cw * 0.95, 0.06 * k, 0], [0.035 * k, 0.16 * k, cd * 0.7], 0.01), C.mesh);
    paint('spine', B([s * (p.waist.w / 2) * 0.95, 0.02 * k, 0], [0.03 * k, 0.14 * k, (p.waist.d / 2) * 0.7], 0.01), C.mesh);
  }
  // smooth panels: chest, back yoke; per side shoulder caps, outer forearms, thigh fronts, knees; gloves over the wrists
  paint('chest', B([0, 0.17 * k, cd * 0.75], [cw * 0.72, 0.085 * k, 0.07 * k], 0.02), C.panel);
  paint('chest', B([0, 0.2 * k, -cd * 0.75], [cw * 0.8, 0.08 * k, 0.07 * k], 0.02), C.panel);
  for (const [s, sh, el, hp, kn, an] of [
    [1, 'shoulderR', 'elbowR', 'hipR', 'kneeR', 'ankleR'],
    [-1, 'shoulderL', 'elbowL', 'hipL', 'kneeL', 'ankleL'],
  ] as const) {
    paint(sh, B([-s * ua.r0 * 0.9, -ua.len * 0.55, 0], [ua.r0 * 0.45, ua.len * 0.38, ua.r0 * 1.1], 0.005), C.mesh);
    paint(el, B([-s * fa.r0 * 0.9, -fa.len * 0.5, 0], [fa.r0 * 0.45, fa.len * 0.36, fa.r0 * 1.1], 0.005), C.mesh);
    paint(sh, E([s * 0.012 * k, 0.0, 0], [ua.r0 * 1.6, 0.075 * k, ua.r0 * 1.6]), C.panel);
    paint(el, B([s * fa.r0 * 0.9, -fa.len * 0.45, 0], [fa.r0 * 0.5, fa.len * 0.3, fa.r0 * 0.9], 0.005), C.panel);
    paint(hp, B([0, -th.len * 0.45, th.r0 * 0.8], [th.r0 * 0.7, th.len * 0.3, th.r0 * 0.5], 0.01), C.panel);
    paint(kn, E([0, 0.0, th.r1 * 0.9], [th.r1 * 0.85, 0.06 * k, 0.04 * k]), C.panel);
    paint(el, B([0, -fa.len + 0.01 * k, 0], [0.06 * k, 0.022 * k, 0.06 * k], 0.005), C.glove);
    // boots up the shins, soles
    paint(kn, B([0, -cf.len + 0.05 * k, 0], [0.08 * k, 0.05 * k, 0.08 * k], 0.005), C.boot);
    paint(an, B([0, -Y.ankle + 0.008 * k, 0.05 * k], [0.08 * k, 0.012 * k, 0.2 * k], 0.002), C.sole);
  }
  // the hood's opening: an almond of skin round the eyes, the eyes
  paint('head', E([0, 0.008 * k, H.d * 0.46], [H.w * 0.36, 0.014 * k, 0.04 * k]), C.skin);
  for (const s of [-1, 1]) paint('head', E([s * 0.03 * k, 0.008 * k, H.d * 0.48], [0.01 * k, 0.006 * k, 0.012 * k]), C.eye);
  return { prims, paints };
}
