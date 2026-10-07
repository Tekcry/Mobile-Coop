/**
 * Human proportions for the shared rig. Pure data (no Babylon), unit-tested.
 *
 * Average build at 1.75 m is about 7.5 heads tall, shoulders (outer deltoids) about two head
 * heights wide, chest wider and deeper than the waist, limbs tapering thigh -> knee -> ankle and
 * shoulder -> elbow -> wrist. Builds only vary girth/shoulder/waist within a believable range.
 */
export const BUILDS = ['average', 'lean', 'athletic', 'broad'] as const;
export type Build = (typeof BUILDS)[number];

export interface Limb {
  /** Joint-to-joint length (m). */
  len: number;
  /** Radius at the proximal joint and at the distal joint (m). */
  r0: number;
  r1: number;
}

export interface Proportions {
  height: number;
  build: Build;
  head: { h: number; w: number; d: number };
  neck: { len: number; r: number };
  /** Joint heights above the feet (m). */
  y: { hip: number; waist: number; chest: number; shoulder: number; neck: number; knee: number; ankle: number };
  /** Half distance between shoulder joints / hip joints (m). */
  shoulderHalf: number;
  hipHalf: number;
  /** Outer shoulder width including the deltoids (m). */
  shoulderWidth: number;
  chest: { w: number; d: number };
  waist: { w: number; d: number };
  pelvis: { w: number; d: number; h: number };
  upperArm: Limb;
  forearm: Limb;
  hand: { len: number; w: number; t: number };
  thigh: Limb;
  calf: Limb;
  foot: { len: number; w: number; h: number };
  /** Hit volumes / controller capsule derived from the body (m). */
  capsuleRadius: number;
  /** Half the torso depth plus clothing: how far the body sticks out from the spine. */
  bodyDepthHalf: number;
}

interface BuildMods {
  girth: number;
  shoulder: number;
  waist: number;
  chest: number;
}

export const BUILD_MODS: Record<Build, BuildMods> = {
  average: { girth: 1, shoulder: 1, waist: 1, chest: 1 },
  lean: { girth: 0.88, shoulder: 0.95, waist: 0.9, chest: 0.92 },
  athletic: { girth: 1.05, shoulder: 1.07, waist: 0.95, chest: 1.07 },
  broad: { girth: 1.15, shoulder: 1.1, waist: 1.14, chest: 1.13 },
};

export const STANDARD_HEIGHT = 1.75;

/** Proportions for a build at a height (default 1.75 m). Everything scales with height. */
export function proportions(build: Build = 'average', height = STANDARD_HEIGHT): Proportions {
  const m = BUILD_MODS[build];
  const k = height / STANDARD_HEIGHT;
  const g = m.girth * k;
  const headH = (height / 7.5) * 0.98;
  const shoulderWidth = 0.46 * m.shoulder * k;
  const upperArmR0 = 0.05 * g;
  const shoulderHalf = shoulderWidth / 2 - upperArmR0 * 1.1;
  const chest = { w: 0.34 * m.chest * k, d: 0.22 * m.chest * k };
  return {
    height,
    build,
    head: { h: headH, w: 0.158 * k, d: 0.19 * k },
    neck: { len: 0.06 * k, r: 0.058 * g },
    y: {
      hip: 0.915 * k,
      waist: 1.05 * k,
      chest: 1.26 * k,
      shoulder: 1.435 * k,
      neck: 1.48 * k,
      knee: 0.5 * k,
      ankle: 0.075 * k,
    },
    shoulderHalf,
    hipHalf: 0.09 * k * Math.sqrt(m.waist),
    shoulderWidth,
    chest,
    waist: { w: 0.28 * m.waist * k, d: 0.185 * m.waist * k },
    pelvis: { w: 0.31 * m.waist * k, d: 0.2 * m.waist * k, h: 0.2 * k },
    upperArm: { len: 0.3 * k, r0: upperArmR0, r1: 0.038 * g },
    forearm: { len: 0.26 * k, r0: 0.04 * g, r1: 0.028 * g },
    hand: { len: 0.17 * k, w: 0.085 * g, t: 0.035 * g },
    thigh: { len: 0.415 * k, r0: 0.082 * g, r1: 0.054 * g },
    calf: { len: 0.425 * k, r0: 0.057 * g, r1: 0.036 * g },
    foot: { len: 0.27 * k, w: 0.1 * g, h: 0.085 * k },
    capsuleRadius: Math.max(0.26, Math.min(0.34, shoulderWidth * 0.62)),
    bodyDepthHalf: chest.d / 2 + 0.03 * k,
  };
}

/** Head height divided into the standing height. */
export function headsTall(p: Proportions): number {
  return p.height / p.head.h;
}

export interface HitVolumes {
  /** Body capsule segment (feet-relative heights) and radius; head sphere centre height and radius. */
  bodyY0: number;
  bodyY1: number;
  bodyR: number;
  headY: number;
  headR: number;
}

/** Hit volumes fitted to the body: the capsule spans shins to shoulders, the head sphere the skull (or `headR`
 *  when headgear reaches further: SHADE's helmet). */
export function hitVolumes(p: Proportions, headR?: number): HitVolumes {
  const bodyR = Math.min(p.capsuleRadius * 0.85, Math.max(p.chest.w * 0.62, 0.18 * (p.height / STANDARD_HEIGHT)));
  return {
    bodyY0: p.y.knee * 0.45 + bodyR,
    bodyY1: p.y.shoulder + 0.02 - bodyR,
    bodyR,
    headY: p.y.neck + p.neck.len + p.head.h * 0.42,
    headR: Math.max(headR ?? 0, (Math.max(p.head.w, p.head.d) / 2) * 1.15),
  };
}
