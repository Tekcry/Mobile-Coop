/**
 * Takedowns (pure), unit-tested: which takedown the geometry allows, where the attacker must stand (aligned to
 * the victim within a few cm), how long each part takes. Blacklist rules: on the ground from behind or the
 * front at any awareness, from the side only on an unaware / suspicious enemy; over low cover; from above (a
 * ledge, pipe, zipline, a ceiling vent or any drop onto them); from below (pull a guard standing at a lip over
 * it while hanging); through a window (pull them through). Tap = non-lethal, hold = lethal. (hang-down) From the
 * co-op hang-down (head-first under the partner's hands): a guard by the hanging head is grabbed (lifted) or neck-snapped.
 */
import { hyp2 } from '../core/mathx';

export type TakedownKind = 'behind' | 'front' | 'side' | 'overCover' | 'corner' | 'above' | 'below' | 'window' | 'drop' | 'inverted' | 'hangDown' | 'assist';

/** Where the attacker is. (3.2.0 phase 4: `split`, `pipe` (a horizontal pipe, hands / legs up), `inverted`, `rappel`.) */
export type AttackerState = 'ground' | 'wallLow' | 'wall' | 'hang' | 'climb' | 'zipline' | 'duct' | 'window' | 'split' | 'pipe' | 'inverted' | 'rappel' | 'hangDown';

export const TAKEDOWN = {
  /** Ground reach (feet to feet, m) and height tolerance. */
  reach: 1.8,
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
  behindCone: Math.PI * 0.56,
  frontCone: Math.PI / 3,
  /** (3.2.0) Drop attack from an anchor (hang, pipe, split, zipline, rope): the victim this far below (m) and within
   *  `dropReach` of the landing point (under the attacker's feet). */
  dropMin: 1.2,
  dropMax: 5,
  dropReach: 1.0,
  /** Hanging inverted: a guard right beneath (horizontal reach, m; the victim's feet this far below the attacker's
   *  root, m). */
  invertedReach: 0.9,
  invertedMin: 0.6,
  invertedMax: 2.8,
  /** (hang-down) From the co-op hang-down: the guard's neck (`HANG_GRAB.neck` over his feet) within this under / over
   *  the hanging head (m) and within `hangReach` across of it (m). */
  hangReach: 0.9,
  hangBelow: 0.75,
  hangAbove: 0.35,
} as const;

/** (hang-down) The grab and the neck snap from the hang-down (the guard lifted to the hanging player's hands). */
export const HANG_GRAB = {
  /** A guard's neck over his feet (m, 1.75 m body). */
  neck: 1.5,
  /** The hands hold the neck this far under the hanging head (m). */
  hands: 0.35,
  /** The guard is lifted at most this far off his floor (m). */
  liftMax: 0.6,
  /** The guard held this far from the hanging head across (m), in front of the chest. */
  hold: 0.3,
  /** Seconds from the press to the hands on him (his struggle starts there), then the lift. */
  reach: 0.3,
  lift: 0.5,
  /** The quick takedown's strike (s): the choke (tap) / the neck snap (held). */
  strike: 0.6,
} as const;

/** (hang-down) The guard's feet when his neck is at the hanging hands (the head at `headY`), lifted at most
 *  `HANG_GRAB.liftMax` off his floor `floorY` and never under it. */
export function hangLiftY(headY: number, floorY: number): number {
  const y = headY - HANG_GRAB.hands - HANG_GRAB.neck;
  return Math.max(floorY, Math.min(floorY + HANG_GRAB.liftMax, y));
}

/** (hang-down) Where a guard grabbed from the hang is held: `HANG_GRAB.hold` from the hang point (`ax`, `az`) along
 *  `yaw` (the way to him at the grab), lifted (`hangLiftY`). Writes `out`. */
export function hangHoldPoint(ax: number, az: number, headY: number, yaw: number, floorY: number, out: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  out.x = ax + Math.sin(yaw) * HANG_GRAB.hold;
  out.z = az + Math.cos(yaw) * HANG_GRAB.hold;
  out.y = hangLiftY(headY, floorY);
  return out;
}

/** (hang-down) A guard is in reach of the hanging hands: the head at `headY` over (`ax`, `az`), his feet at (`vx`,
 *  `vy`, `vz`). */
export function hangInReach(ax: number, az: number, headY: number, vx: number, vy: number, vz: number): boolean {
  const dn = vy + HANG_GRAB.neck - headY;
  return hyp2(vx - ax, vz - az) <= TAKEDOWN.hangReach && dn >= -TAKEDOWN.hangBelow && dn <= TAKEDOWN.hangAbove;
}

/** (3.2.0) The grab from behind and the human shield. */
export const GRAB = {
  /** (G7, AUDIT-WALLS row 11, 110936 @ 22.0-23.0) The hostage walk's speed cap (m/s; the speed, not the gear: CT's
   *  0.7 m/s +- 0.2 against the old gear 2 cap of 1.4 m/s). A slower gear stays slower. */
  speedCap: 0.75,
  /** (G7, row 5, 110936 @ 5.9-7.1) Stepping in from behind (s; was the shared 0.22 s snap: 1.5 m in 0.35-0.45 s),
   *  rising out of a crouch on the way; then the pull-in (s): the guard eased from where he stood back against the
   *  chest, the hold settled ~1.0 s after the press (CT ~1.2 s, 052607 ~1 s). */
  approach: 0.42,
  pull: 0.6,
  /** The hostage held this far in front, pelvis to pelvis (m; row 11: about 0.3 m, was 0.42 held loose); the sidearm's
   *  spread while holding (x). */
  hold: 0.32,
  /** (G7 fix round) ...and this far to the operator's side (m, + right): his feet walk between hers (straight in front
   *  the two pairs of feet shared their lanes and her lead foot met his rear leg; tests/g7CloseQuarters sweeps the gait
   *  phases). To her left: her right (pistol) side stays clear. */
  side: -0.1,
  spreadMul: 1.2,
  /** (G43, row 21: kill from the hold is not in the footage) The lethal finisher from the hold (s), kept. */
  killTime: 0.5,
  /** A shove: the guard staggers this long, then is alert. */
  shoveStagger: 1.0,
  /** Guards who see the operator with a hostage hold their fire this long, then aim at the exposed head only. */
  hesitate: 1.5,
} as const;

/** (locomotion step 18, D7) The grab's deciding moment while holding a hostage (pure): toggle (`gameplay.grabToggle`,
 *  the 3.2.0 behaviour) = a fresh press (released before `lethalHold` knocks out, held through kills); hold = letting
 *  go of the button (a knockout, A70). */
export function grabDecides(toggle: boolean, pressed: boolean, holding: boolean): boolean {
  return toggle ? pressed : !holding;
}

/** Kinds that start a grab (held, then knocked out / killed / shoved / let go) instead of a strike. (hang-down) The grab
 *  from the hang-down too (lifted, then the held rules). */
export const GRAB_KINDS: readonly TakedownKind[] = ['behind', 'hangDown'];

/**
 * (G7) Seconds from a takedown's press to the attacker's contact (the victim's struggle starts there, not at the press):
 * from behind on a guard on two legs the grab's `GRAB.approach`, else the ground takedown's `TAKEDOWN.approach`. Derived
 * from the attacker's place against the victim's facing (`vyaw`), so the co-op host poses a client's victim the same
 * way without wire data.
 */
export function contactDelay(ax: number, az: number, vx: number, vz: number, vyaw: number, quadruped: boolean): number {
  const rel = Math.abs(wrap(Math.atan2(ax - vx, az - vz) - vyaw));
  return !quadruped && rel > TAKEDOWN.behindCone ? GRAB.approach : TAKEDOWN.approach;
}

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
  /** Wall face normal (outward, towards the attacker) when `state` is wall / wallLow. */
  coverNx?: number;
  coverNz?: number;
  /** (step 12) Back to a wall at an edge: the outside end on the face (x, z) and the direction past it (unit). */
  edgeX?: number;
  edgeZ?: number;
  edgeTx?: number;
  edgeTz?: number;
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

/**
 * (coop-walk-fixes P6) The co-op team takedown on a guard the partner holds as a hostage (Michael 4.72: "should trigger
 * coop takedown"): from the ground within `TAKEDOWN.reach` across and `TAKEDOWN.dy` up / down, with line of sight, from
 * any side (he cannot turn: he is held). The attacker stays where he stands facing the guard (approach 0; the holder
 * keeps moving him), then the strike (tap = knockout, held = kill). Null when out of reach.
 */
export function assistPlan(ax: number, ay: number, az: number, vx: number, vy: number, vz: number, los: boolean): TakedownPlan | null {
  const dx = vx - ax;
  const dz = vz - az;
  if (!los || Math.abs(vy - ay) > TAKEDOWN.dy || hyp2(dx, dz) > TAKEDOWN.reach) return null;
  return { kind: 'assist', alignX: ax, alignY: ay, alignZ: az, faceYaw: Math.atan2(dx, dz), approach: 0, arc: 0, strike: TAKEDOWN.strike, victimTo: null };
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
    case 'wall': {
      if (Math.abs(dy) <= T.dy && d <= T.reach) {
        const kind: TakedownKind | null = behind ? 'behind' : front ? 'front' : i.vCalm ? 'side' : null;
        if (!kind) return null;
        if (i.state === 'wall') {
          // (step 12) back to a wall: a guard round the edge (past the outside end) is the corner takedown; one in
          // front of the face is an ordinary one; one behind the wall is out of reach
          if (i.edgeTx !== undefined && (i.vx - (i.edgeX ?? 0)) * i.edgeTx + (i.vz - (i.edgeZ ?? 0)) * (i.edgeTz ?? 0) > 0) return ground('corner');
          if (dx * (i.coverNx ?? 0) + dz * (i.coverNz ?? 0) < -0.2) return null;
        }
        return ground(kind);
      }
      // a drop onto someone below
      if (i.state === 'ground' && -dy >= T.aboveMin && -dy <= T.aboveMax && d <= T.aboveReach) return above(i, face, ux, uz);
      return null;
    }
    case 'wallLow': {
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
    case 'split':
    case 'pipe':
    case 'rappel':
      return drop(i, dx, dz, dy, face, ux, uz);
    case 'inverted': {
      // a guard right beneath the hanging head: choke them up (neck snap held)
      if (d > T.invertedReach || -dy < T.invertedMin || -dy > T.invertedMax) return null;
      return {
        kind: 'inverted',
        alignX: i.ax,
        alignY: i.ay,
        alignZ: i.az,
        faceYaw: face,
        approach: 0,
        arc: 0,
        strike: T.strike + 0.2,
        victimTo: { x: i.ax, y: i.vy + 0.12, z: i.az },
      };
    }
    case 'hangDown': {
      // (hang-down) head-first under the partner's hands (`ay`: the hanging HEAD's height, the caller's root less
      // `HANG_HEAD`): a guard by the head is grabbed (lifted) or neck-snapped where the hanger hangs; he comes up to
      // the hands
      const headY = i.ay;
      if (!hangInReach(i.ax, i.az, headY, i.vx, i.vy, i.vz)) return null;
      const yaw = d > 1e-3 ? face : i.vyaw + Math.PI;
      const to = { x: 0, y: 0, z: 0 };
      hangHoldPoint(i.ax, i.az, headY, yaw, i.vy, to);
      return { kind: 'hangDown', alignX: i.ax, alignY: i.ay, alignZ: i.az, faceYaw: yaw, approach: 0, arc: 0, strike: HANG_GRAB.strike, victimTo: to };
    }
    case 'hang': {
      // (3.2.0) a guard below: drop on them
      if (dy < 0) return drop(i, dx, dz, dy, face, ux, uz);
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
    case 'zipline': {
      const p = drop(i, dx, dz, dy, face, ux, uz);
      if (p) return p;
      if (-dy >= T.aboveMin * 0.6 && -dy <= T.aboveMax && d <= T.aboveReach * 1.3) return above(i, face, ux, uz);
      return null;
    }
    case 'climb':
    case 'duct':
      if (-dy >= T.aboveMin * 0.6 && -dy <= T.aboveMax && d <= T.aboveReach) return above(i, face, ux, uz);
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

/**
 * (3.2.0) Drop attack from an anchor: a guard 1.2-5 m below, within a metre of where the feet would land (straight
 * down from the attacker). The attacker falls onto them (accelerating, timed by the height).
 */
function drop(i: TakedownInput, dx: number, dz: number, dy: number, face: number, ux: number, uz: number): TakedownPlan | null {
  const T = TAKEDOWN;
  if (-dy < T.dropMin || -dy > T.dropMax || hyp2(dx, dz) > T.dropReach) return null;
  return {
    kind: 'drop',
    alignX: i.vx - ux * T.standoff * 0.6,
    alignY: i.vy,
    alignZ: i.vz - uz * T.standoff * 0.6,
    faceYaw: face,
    approach: Math.max(0.3, Math.sqrt((2 * -dy) / 9.81)),
    arc: 0,
    strike: T.strike * 0.8,
    victimTo: null,
  };
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
  const fall = p.kind === 'above' || p.kind === 'drop' ? e * e : s;
  out.y = fromY + (p.alignY - fromY) * fall + p.arc * Math.sin(Math.PI * e);
}

/** Tap = non-lethal; held past `lethalHold` = lethal. */
export function lethalFromHold(heldSeconds: number): boolean {
  return heldSeconds >= TAKEDOWN.lethalHold;
}
