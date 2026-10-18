/**
 * Operator bodies for the offline operator pipeline (docs/operators/SPEC.md Section 4). Pure data, no Babylon.
 *
 * The ANSUR II corrections (SPEC 4.3: A1, A3-A7) are in `proportions.ts` since step 11e (G72, every character);
 * they are restated here as absolute values (so the pipeline's bodies did not change), then each operator's build mods
 * (SPEC 4.4) are applied.
 */
import { hitVolumes, proportions, STANDARD_HEIGHT } from '../player/proportions';
import type { HitVolumes, Proportions } from '../player/proportions';

export const OPERATOR_IDS = ['wren', 'moth'] as const;
export type OperatorId = (typeof OPERATOR_IDS)[number];

/** SPEC 4.4 build mods, relative to the corrected base. */
export interface OperatorBuild {
  shoulders: number;
  chest: number;
  waist: number;
  hips: number;
  girth: number;
}

export interface OperatorDef {
  id: OperatorId;
  callsign: string;
  height: number;
  build: OperatorBuild;
}

export const OPERATORS: Record<OperatorId, OperatorDef> = {
  wren: { id: 'wren', callsign: 'Wren', height: 1.68, build: { shoulders: 0.97, chest: 1.03, waist: 0.96, hips: 1.08, girth: 0.98 } },
  moth: { id: 'moth', callsign: 'Moth', height: 1.78, build: { shoulders: 1.03, chest: 0.98, waist: 0.96, hips: 0.97, girth: 0.96 } },
};

/** SPEC 4.3 base corrections at 1.75 m (ANSUR II). A2 is withdrawn. */
export const BASE_CORRECTIONS = {
  /** A1: shoulder joint centre ~3.5 cm below the acromion. */
  shoulderY: 1.4,
  /** A3 */
  handLen: 0.19,
  /** A4 */
  pelvisW: 0.35,
  waistW: 0.3,
  waistD: 0.215,
  chestD: 0.24,
  /** A5 */
  headD: 0.2,
  /** A6: bideltoid width. */
  shoulderWidth: 0.49,
  /** A7: hip joint (y.hip - 0.03) to knee axis 0.495; with the calf, the straight leg puts the ankle at 0.07. */
  thighLen: 0.39,
} as const;

/** Corrected proportions for an operator: base 'average' at their height, then A1, A3-A7, then their build. */
export function operatorProportions(def: OperatorDef): Proportions {
  const base = proportions('average', def.height);
  const k = def.height / STANDARD_HEIGHT;
  const c = BASE_CORRECTIONS;
  const b = def.build;
  const g = b.girth;
  const limb = (l: Proportions['thigh']) => ({ len: l.len, r0: l.r0 * g, r1: l.r1 * g });
  const upperArm = limb(base.upperArm);
  const shoulderWidth = c.shoulderWidth * b.shoulders * k;
  const chest = { w: base.chest.w * b.chest, d: c.chestD * b.chest * k };
  return {
    ...base,
    head: { ...base.head, d: c.headD * k },
    neck: { len: base.neck.len, r: base.neck.r * g },
    y: { ...base.y, shoulder: c.shoulderY * k },
    // Same rule as proportions(): the joint sits inside the deltoid.
    shoulderHalf: shoulderWidth / 2 - upperArm.r0 * 1.1,
    hipHalf: base.hipHalf * Math.sqrt(b.hips),
    shoulderWidth,
    chest,
    waist: { w: c.waistW * b.waist * k, d: c.waistD * b.waist * k },
    pelvis: { w: c.pelvisW * b.hips * k, d: base.pelvis.d * b.hips, h: base.pelvis.h },
    upperArm,
    forearm: limb(base.forearm),
    hand: { len: c.handLen * k, w: base.hand.w * g, t: base.hand.t * g },
    thigh: { ...limb(base.thigh), len: c.thighLen * k },
    calf: limb(base.calf),
    foot: { ...base.foot, w: base.foot.w * g },
    capsuleRadius: Math.max(0.26, Math.min(0.34, shoulderWidth * 0.62)),
    bodyDepthHalf: chest.d / 2 + 0.03 * k,
  };
}

export const JOINT_NAMES = [
  'root', 'body', 'pelvis', 'spine', 'chest', 'neck', 'head',
  'shL', 'elL', 'wrL', 'handL',
  'shR', 'elR', 'wrR', 'handR',
  'hipL', 'knL', 'anL', 'toeL',
  'hipR', 'knR', 'anR', 'toeR',
] as const;
export type JointName = (typeof JOINT_NAMES)[number];

export interface Joint {
  name: JointName;
  parent: JointName | null;
  /** Bind-pose position, feet on y = 0, in the game frame: +X right, +Y up, +Z forward (Babylon, left-handed). */
  pos: [number, number, number];
}

/**
 * Bind-pose joints. Mirrors the hierarchy and offsets of the game rig (`characterRig.ts`, the `n(...)` calls):
 * standing, arms hanging straight down. `handL/R` (fingertip) and `toeL/R` (ball of the foot) are pipeline-only
 * end points for the hero hands and feet.
 */
export function operatorJoints(p: Proportions): Joint[] {
  const k = p.height / STANDARD_HEIGHT;
  const Y = p.y;
  const chestY = Y.waist + 0.13 * k;
  const out: Joint[] = [];
  const at = (name: JointName, parent: JointName | null, x: number, y: number, z: number) => {
    out.push({ name, parent, pos: [x, y, z] });
  };
  const bodyPivot = Y.hip * 0.62;
  at('root', null, 0, 0, 0);
  at('body', 'root', 0, bodyPivot, 0);
  at('pelvis', 'body', 0, Y.hip, 0);
  at('spine', 'pelvis', 0, Y.waist, 0);
  at('chest', 'spine', 0, chestY, 0);
  at('neck', 'chest', 0, Y.neck, 0);
  at('head', 'neck', 0, Y.neck + p.neck.len + p.head.h * 0.42, 0.01);
  for (const [s, side] of [['L', -1], ['R', 1]] as const) {
    const x = side * p.shoulderHalf;
    at(`sh${s}`, 'chest', x, Y.shoulder, -0.01);
    at(`el${s}`, `sh${s}`, x, Y.shoulder - p.upperArm.len, -0.01);
    at(`wr${s}`, `el${s}`, x, Y.shoulder - p.upperArm.len - p.forearm.len, -0.01);
    at(`hand${s}`, `wr${s}`, x, Y.shoulder - p.upperArm.len - p.forearm.len - p.hand.len, -0.01);
  }
  for (const [s, side] of [['L', -1], ['R', 1]] as const) {
    const x = side * p.hipHalf;
    const hipY = Y.hip - 0.03;
    at(`hip${s}`, 'pelvis', x, hipY, 0);
    at(`kn${s}`, `hip${s}`, x, hipY - p.thigh.len, 0);
    at(`an${s}`, `kn${s}`, x, hipY - p.thigh.len - p.calf.len, 0);
    // Ball of the foot: about 70 % of the foot length ahead of the heel, the heel ~25 % behind the ankle.
    at(`toe${s}`, `an${s}`, x, 0, p.foot.len * 0.45);
  }
  return out;
}

export interface OperatorBodyExport {
  id: OperatorId;
  callsign: string;
  height: number;
  build: OperatorBuild;
  proportions: Proportions;
  hitVolumes: HitVolumes;
  joints: Joint[];
}

export function operatorBodyExport(def: OperatorDef): OperatorBodyExport {
  const p = operatorProportions(def);
  return {
    id: def.id,
    callsign: def.callsign,
    height: def.height,
    build: def.build,
    proportions: p,
    hitVolumes: hitVolumes(p),
    joints: operatorJoints(p),
  };
}
