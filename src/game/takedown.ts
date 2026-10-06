/**
 * Takedowns (pure), unit-tested: which takedown the geometry allows, where the attacker must stand (aligned to
 * the victim within a few cm), how long each part takes. Blacklist rules: on the ground from behind or the
 * front at any awareness, from the side only on an unaware / suspicious enemy; over low cover; from above (a
 * ledge, pipe, zipline, a ceiling vent or any drop onto them); from below (pull a guard standing at a lip over
 * it while hanging); through a window (pull them through). Tap = non-lethal, hold = lethal.
 */
import { hyp2 } from '../core/mathx';

export type TakedownKind = 'behind' | 'front' | 'side' | 'overCover' | 'corner' | 'above' | 'below' | 'window';

/** Where the attacker is. */
export type AttackerState = 'ground' | 'lowCover' | 'highCover' | 'hang' | 'climb' | 'zipline' | 'duct' | 'window';

export const TAKEDOWN = {
  /** Ground reach (feet to feet, m) and height tolerance. */
  reach: 1.6,
  dy: 0.45,
  /** Over low cover: reach across it. */
  coverReach: 1.9,
  /** From above: height of the drop (m) and horizontal reach. */
  aboveMin: 1.1,
  aboveMax: 4.6,
  aboveReach: 2.2,
  /** From below (hanging at a lip): the victim stands within this of the hands, up to this far along. */
  belowReach: 1.4,
  /** Through a window: across the sill. */
  windowReach: 1.7,
  /** Attacker stand-off from the victim when aligned (m). */
  standoff: 0.55,
  /** Times (s): approach / align, then the strike; the hold that makes it lethal. */
  approach: 0.22,
  strike: 0.7,
  dropTime: 0.5,
  pullTime: 0.55,
  lethalHold: 0.3,
  /** Behind / front cones (rad from the victim's facing). */
  behindCone: (2 * Math.PI) / 3,
  frontCone: Math.PI / 3,
} as const;

export interface TakedownInput {
  state: AttackerState;
  ax: number;
  ay: number;
  az: number;
  vx: number;
  vy: number;
  vz: number;
  /** Victim facing (rad, 0 = +Z). */
  vyaw: number;
  /** Victim awareness: not in combat and not searching hard (side takedowns only then). */
  vCalm: boolean;
  /** Line of sight attacker -> victim (caller ray). */
  los: boolean;
  /** Low cover face normal (outward, towards the attacker) when `state` is lowCover. */
  coverNx?: number;
  coverNz?: number;
  /** Window: its plane normal (any sign) when `state` is window. */
  winNx?: number;
  winNz?: number;
}

export interface TakedownPlan {
  kind: TakedownKind;
  /** Where the attacker's feet end up and the facing (towards the victim). */
  alignX: number;
  alignY: number;
  alignZ: number;
  faceYaw: number;
  /** Seconds to get there (with `arc` m of lift on the way: vault / drop), then the strike. */
  approach: number;
  arc: number;
  strike: number;
  /** The victim moves (pulled over a lip / through a window) to here during the approach (null = stays). */
  victimTo: { x: number; y: number; z: number } | null;
}

function wrap(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/** The takedown the geometry allows, or null. */
export function pickTakedown(i: TakedownInput): TakedownPlan | null {
  if (!i.los) return null;
  const T = TAKEDOWN;
  const dx = i.vx - i.ax;
  const dz = i.vz - i.az;
  const d = hyp2(dx, dz);
  const dy = i.vy - i.ay;
  const face = Math.atan2(dx, dz);
  // the attacker relative to the victim's facing (0 = in front of them)
  const rel = Math.abs(wrap(Math.atan2(-dx, -dz) - i.vyaw));
  const behind = rel > T.behindCone;
  const front = rel < T.frontCone;
  const ux = d > 1e-3 ? dx / d : 0;
  const uz = d > 1e-3 ? dz / d : 1;
  const ground = (kind: TakedownKind): TakedownPlan => ({
    kind,
    alignX: i.vx - ux * T.standoff,
    alignY: i.vy,
    alignZ: i.vz - uz * T.standoff,
    faceYaw: face,
    approach: T.approach,
    arc: 0,
    strike: T.strike,
    victimTo: null,
  });
  switch (i.state) {
    case 'ground':
    case 'highCover': {
      if (Math.abs(dy) <= T.dy && d <= T.reach) {
        const kind: TakedownKind | null = behind ? 'behind' : front ? 'front' : i.vCalm ? 'side' : null;
        if (!kind) return null;
        return ground(i.state === 'highCover' ? 'corner' : kind);
      }
      // a drop onto someone below
      if (i.state === 'ground' && -dy >= T.aboveMin && -dy <= T.aboveMax && d <= T.aboveReach) return above(i, face, ux, uz);
      return null;
    }
    case 'lowCover': {
      if (Math.abs(dy) > T.dy || d > T.coverReach) return null;
      // the victim is across the cover (on the far side of the face)
      const nx = i.coverNx ?? 0;
      const nz = i.coverNz ?? 0;
      if (dx * nx + dz * nz > -0.2) {
        if (d <= T.reach) return ground(behind ? 'behind' : front ? 'front' : 'side');
        return null;
      }
      const p = ground('overCover');
      p.approach = T.approach + 0.2;
      p.arc = 0.6;
      return p;
    }
    case 'hang': {
      // a guard standing at the lip above the hands: pull them over and down
      if (dy < 0.8 || dy > 2.6 || d > T.belowReach) return null;
      return {
        kind: 'below',
        alignX: i.ax,
        alignY: i.ay,
        alignZ: i.az,
        faceYaw: face,
        approach: 0,
        arc: 0,
        strike: T.pullTime + 0.35,
        victimTo: { x: i.ax + ux * 0.3, y: i.ay - 0.2, z: i.az + uz * 0.3 },
      };
    }
    case 'climb':
    case 'zipline':
    case 'duct':
      if (-dy >= T.aboveMin * 0.6 && -dy <= T.aboveMax && d <= T.aboveReach * (i.state === 'zipline' ? 1.3 : 1)) return above(i, face, ux, uz);
      return null;
    case 'window': {
      if (Math.abs(dy) > 0.6 || d > T.windowReach) return null;
      const nx = i.winNx ?? 0;
      const nz = i.winNz ?? 0;
      // across the window plane only
      const sa = (i.ax * nx + i.az * nz) - (i.vx * nx + i.vz * nz);
      if (Math.abs(sa) < 0.15) return null;
      return {
        kind: 'window',
        alignX: i.ax,
        alignY: i.ay,
        alignZ: i.az,
        faceYaw: face,
        approach: 0,
        arc: 0,
        strike: T.pullTime + 0.4,
        victimTo: { x: i.ax + ux * 0.6, y: i.ay, z: i.az + uz * 0.6 },
      };
    }
  }
  return null;
}

function above(i: TakedownInput, face: number, ux: number, uz: number): TakedownPlan {
  const T = TAKEDOWN;
  return {
    kind: 'above',
    alignX: i.vx - ux * T.standoff * 0.8,
    alignY: i.vy,
    alignZ: i.vz - uz * T.standoff * 0.8,
    faceYaw: face,
    approach: T.dropTime,
    arc: 0.25,
    strike: T.strike * 0.8,
    victimTo: null,
  };
}

/** Attacker feet along the approach at progress k (0..1): eased, with an arc lift (vault / drop). */
export function approachPoint(fromX: number, fromY: number, fromZ: number, p: TakedownPlan, k: number, out: { x: number; y: number; z: number }): void {
  const e = k < 0 ? 0 : k > 1 ? 1 : k;
  const s = e * e * (3 - 2 * e);
  out.x = fromX + (p.alignX - fromX) * s;
  out.z = fromZ + (p.alignZ - fromZ) * s;
  // a drop falls (accelerating), a vault lifts over
  const fall = p.kind === 'above' ? e * e : s;
  out.y = fromY + (p.alignY - fromY) * fall + p.arc * Math.sin(Math.PI * e);
}

/** Tap = non-lethal; held past `lethalHold` = lethal. */
export function lethalFromHold(heldSeconds: number): boolean {
  return heldSeconds >= TAKEDOWN.lethalHold;
}
