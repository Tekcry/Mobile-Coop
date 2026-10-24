/**
 * (ct-toolkit 3.2, G97) The optic cable under a door, Babylon-free: the refusal, the kneel spot, the tip point and its
 * look limits, and the feed in / view / pull out states. The scene glue is `game/opticSystem.ts`. (optic-coop) Also
 * the other gaps (map field `optic`: hatches, ceiling panels, grilles, shaft tops: `OpticPoint`), the wire sub
 * (`OPTIC_SUBS`, MoveState mode `optic`) and the cable prop's ends (hand -> tip), the same for the owner and a partner.
 *
 * Gameplay facts: the tip is never perceived (it is not a body); the player's own body kneels on the near side and is
 * perceived as any crouched, still body. The cable is silent and has no light. The view is local (co-op: never sent;
 * the kneel and the cable are, through MoveState mode `optic`).
 * The tip is placed from the door anchor and a collision ray only, never from graphics state.
 */
import { OPTIC } from '../config/tools';
import { hyp2 } from '../core/mathx';

/** The door fields the cable reads (a `Door` anchor). */
export interface OpticDoorAnchor {
  hinge: { x: number; y: number; z: number };
  yaw: number;
  width: number;
  locked: boolean;
  /** (map tag `seal`) a sealed door (drop seal, gas suppression): refuses the cable. */
  seal?: boolean;
}

/** Why the cable cannot go under this door (the HUD line), or null. */
export type OpticRefusal = 'Sealed' | 'Locked' | 'Door open' | 'No gap' | 'Too far' | null;

/** The refusal at door `a` (`target`: the door's swing goal, 1 = opening / open; `gapClear`: the collision check from
 *  the far face to the tip point found nothing). Sealed first: a sealed door refuses whatever else holds. */
export function opticRefusal(a: OpticDoorAnchor, target: number, gapClear: boolean): OpticRefusal {
  if (a.seal) return 'Sealed';
  if (target !== 0) return 'Door open';
  if (a.locked) return 'Locked';
  if (!gapClear) return 'No gap';
  return null;
}

/** Where the body kneels and where the tip sits, for a body on the `side` (+1 / -1) of the leaf plane. */
export interface OpticPlace {
  side: number;
  /** The kneel spot (feet, XZ) and the facing (toward the door). */
  kx: number;
  kz: number;
  /** The tip (world) and the look's centre yaw (away from the body, through the door). */
  tx: number;
  ty: number;
  tz: number;
  yaw: number;
  /** The gap point: the leaf's far face under its middle (world, at the tip's height). */
  gx: number;
  gz: number;
  /** (optic-coop) The look's centre pitch (+ up; 0 under a door, +-`OPTIC.vertPitch` through a floor / ceiling gap). */
  pitch: number;
  /** (optic-coop) The feeding hand (world): the cable prop runs from here to the tip. */
  hx: number;
  hy: number;
  hz: number;
  /** (optic-coop) Kneeling (crouched); false: standing under a ceiling panel. */
  crouch: boolean;
}

export function emptyOpticPlace(): OpticPlace {
  return { side: 1, kx: 0, kz: 0, tx: 0, ty: 0, tz: 0, yaw: 0, gx: 0, gz: 0, pitch: 0, hx: 0, hy: 0, hz: 0, crouch: true };
}

/** The side of door `a`'s leaf plane a body at (px, pz) is on (+1 / -1). */
export function opticSide(a: OpticDoorAnchor, px: number, pz: number): number {
  const nx = Math.cos(a.yaw);
  const nz = -Math.sin(a.yaw);
  return (px - a.hinge.x) * nx + (pz - a.hinge.z) * nz >= 0 ? 1 : -1;
}

/** The kneel spot and tip at door `a` for a body at (px, pz); `halfLeaf`: half the leaf's thickness (m). No allocation. */
export function opticPlace(a: OpticDoorAnchor, px: number, pz: number, halfLeaf: number, out: OpticPlace): OpticPlace {
  const tx = Math.sin(a.yaw);
  const tz = Math.cos(a.yaw);
  const nx = tz;
  const nz = -tx;
  const side = opticSide(a, px, pz);
  const mx = a.hinge.x + tx * a.width * 0.5;
  const mz = a.hinge.z + tz * a.width * 0.5;
  out.side = side;
  out.kx = mx + nx * side * OPTIC.kneel;
  out.kz = mz + nz * side * OPTIC.kneel;
  out.gx = mx - nx * side * halfLeaf;
  out.gz = mz - nz * side * halfLeaf;
  out.tx = mx - nx * side * (halfLeaf + OPTIC.past);
  out.tz = mz - nz * side * (halfLeaf + OPTIC.past);
  out.ty = a.hinge.y + OPTIC.height;
  // the far side's normal: away from the body
  out.yaw = Math.atan2(-nx * side, -nz * side);
  out.pitch = 0;
  // (optic-coop) the hand on the floor in front of the near face, feeding the cable under the leaf
  out.hx = mx + nx * side * (halfLeaf + OPTIC.hand);
  out.hz = mz + nz * side * (halfLeaf + OPTIC.hand);
  out.hy = out.ty;
  out.crouch = true;
  return out;
}

/** (optic-coop) The wire sub of mode `optic` (ct-toolkit 3.2 Co-op row): 0 a door, 1 a hatch, 2 a panel, 3 a grille. */
export const OPTIC_SUBS = ['door', 'hatch', 'panel', 'grille'] as const;
export type OpticSub = (typeof OPTIC_SUBS)[number];

/** (ct-toolkit 5, map field `optic`) The gaps other than doors. A shaft top is fed down through its grille. */
export type OpticKind = 'hatch' | 'panel' | 'grille' | 'shaft';

/**
 * (optic-coop) A gap the cable goes through (map field `optic: true` on a hatch, ceiling panel, grille or shaft top):
 * `gap` the point in the opening (a hatch or panel edge, between a grille's slats), `n` the unit normal into the space
 * beyond (a floor hatch or shaft top (0, -1, 0), a ceiling panel (0, 1, 0), a wall grille horizontal), `tip` the
 * builder's checked tip point (default: `OPTIC.into` along `n` past the gap).
 */
export interface OpticPoint {
  kind: OpticKind;
  gap: { x: number; y: number; z: number };
  nx: number;
  ny: number;
  nz: number;
  tip?: { x: number; y: number; z: number };
}

/** The wire sub of a gap kind (a shaft top is a grille). */
export function opticSubOf(kind: OpticKind): number {
  return kind === 'hatch' ? 1 : kind === 'panel' ? 2 : 3;
}

/** A gap's normal is vertical (a floor or ceiling gap) rather than a wall's. */
const vertical = (p: OpticPoint): boolean => Math.abs(p.ny) >= 0.5;

/**
 * (optic-coop) The kneel (or stand) spot, the tip and the look's centre at gap `p` for a body at (px, pz). A wall
 * grille: kneel `OPTIC.kneel` back from it, looking along its normal. A floor or ceiling gap: on the body's side of it
 * (`OPTIC.kneel`; a ceiling panel standing under it, `OPTIC.stand`), the look's yaw away from the body and its pitch
 * `OPTIC.vertPitch` down (floor) or up (ceiling). No allocation.
 */
export function opticPointPlace(p: OpticPoint, px: number, pz: number, out: OpticPlace): OpticPlace {
  const g = p.gap;
  out.side = 1;
  out.gx = g.x;
  out.gz = g.z;
  if (p.tip) {
    out.tx = p.tip.x;
    out.ty = p.tip.y;
    out.tz = p.tip.z;
  } else {
    out.tx = g.x + p.nx * OPTIC.into;
    out.ty = g.y + p.ny * OPTIC.into;
    out.tz = g.z + p.nz * OPTIC.into;
  }
  if (!vertical(p)) {
    const h = hyp2(p.nx, p.nz) || 1;
    const ux = p.nx / h;
    const uz = p.nz / h;
    out.kx = g.x - ux * OPTIC.kneel;
    out.kz = g.z - uz * OPTIC.kneel;
    out.yaw = Math.atan2(ux, uz);
    out.pitch = 0;
  } else {
    let bx = px - g.x;
    let bz = pz - g.z;
    const l = hyp2(bx, bz);
    if (l < 1e-3) {
      bx = 0;
      bz = -1;
    } else {
      bx /= l;
      bz /= l;
    }
    const d = p.kind === 'panel' ? OPTIC.stand : OPTIC.kneel;
    out.kx = g.x + bx * d;
    out.kz = g.z + bz * d;
    out.yaw = Math.atan2(-bx, -bz);
    out.pitch = Math.sign(p.ny) * OPTIC.vertPitch;
  }
  out.hx = g.x - p.nx * OPTIC.hand;
  out.hy = g.y - p.ny * OPTIC.hand;
  out.hz = g.z - p.nz * OPTIC.hand;
  out.crouch = p.kind !== 'panel';
  return out;
}

/** (optic-coop) Why the cable cannot go through gap `p` for a body with feet at (px, py, pz), or null: out of reach
 *  first (`OPTIC.reach` horizontally, the gap `OPTIC.reachDown` under to `OPTIC.reachUp` over the feet), then a
 *  blocked far side (`gapClear`: the collision check from the gap to the tip found something, a wall behind). */
export function opticPointRefusal(p: OpticPoint, px: number, py: number, pz: number, gapClear: boolean): OpticRefusal {
  const dy = p.gap.y - py;
  if (hyp2(p.gap.x - px, p.gap.z - pz) > OPTIC.reach || dy < -OPTIC.reachDown || dy > OPTIC.reachUp) return 'Too far';
  if (!gapClear) return 'No gap';
  return null;
}

/**
 * (optic-coop) The place a MoveState `optic` (sub, anchor) poses for a body at (px, pz): the door's (sub 0, `door`)
 * or the gap's (`point`, whose kind must match the sub), else null (no kneel spot or cable: a stale or bad index).
 * The owner and every partner run this, so both draw the same cable.
 */
export function opticPlaceOf(sub: number, door: OpticDoorAnchor | null | undefined, point: OpticPoint | null | undefined, px: number, pz: number, halfLeaf: number, out: OpticPlace): OpticPlace | null {
  if (sub === 0) return door ? opticPlace(door, px, pz, halfLeaf, out) : null;
  if (!point || opticSubOf(point.kind) !== sub) return null;
  return opticPointPlace(point, px, pz, out);
}

/** (optic-coop) The cable prop's far end at feed extension `ext` (0 at the hand .. 1 at the tip). */
export function opticCableEnd(pl: OpticPlace, ext: number, out: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const k = ext <= 0 ? 0 : ext >= 1 ? 1 : ext;
  out.x = pl.hx + (pl.tx - pl.hx) * k;
  out.y = pl.hy + (pl.ty - pl.hy) * k;
  out.z = pl.hz + (pl.tz - pl.hz) * k;
  return out;
}

/** The tip's yaw kept within +-`OPTIC.yaw` of the centre `base`. */
export function clampTipYaw(yaw: number, base: number): number {
  const d = Math.atan2(Math.sin(yaw - base), Math.cos(yaw - base));
  return Math.abs(d) <= OPTIC.yaw ? base + d : base + Math.sign(d) * OPTIC.yaw;
}

/** The tip's pitch kept within `OPTIC.pitchMin` .. `OPTIC.pitchMax` (+ up) of the centre `base` (0 under a door). */
export function clampTipPitch(pitch: number, base = 0): number {
  return base + Math.max(OPTIC.pitchMin, Math.min(OPTIC.pitchMax, pitch - base));
}

export type OpticPhase = 'idle' | 'feed' | 'view' | 'retract';

/**
 * The cable's states: `feed` (kneel and feed it in, `OPTIC.feedIn`), `view` (the camera at the tip; the look turns the
 * tip within its limits), `retract` (pull it out, `OPTIC.feedOut`, the camera back on the body), then `idle`. The leave
 * input or an abort (hurt, the door opening, death) during the feed or the view pulls it out.
 */
export class OpticCore {
  phase: OpticPhase = 'idle';
  /** Seconds in the phase. */
  t = 0;
  /** The door's index (-1: none); (optic-coop) with `sub` > 0 the gap's index (the level's `opticPoints`). */
  door = -1;
  /** (optic-coop) The wire sub (`OPTIC_SUBS`: 0 a door). */
  sub = 0;
  /** The look's centre yaw and pitch, and the tip's look now. */
  baseYaw = 0;
  basePitch = 0;
  yaw = 0;
  pitch = 0;
  readonly place = emptyOpticPlace();
  /** Times the view was entered (tests). */
  views = 0;

  get active(): boolean {
    return this.phase !== 'idle';
  }

  /** The camera is at the tip. */
  get viewing(): boolean {
    return this.phase === 'view';
  }

  /** (optic-coop) The cable fed out (0..1): the feed's progress, 1 in the view, back to 0 over the pull out (the wire
   *  `ph`, the cable prop's length). */
  get extension(): number {
    if (this.phase === 'feed') return Math.min(1, this.t / OPTIC.feedIn);
    if (this.phase === 'view') return 1;
    if (this.phase === 'retract') return Math.max(0, 1 - this.t / OPTIC.feedOut);
    return 0;
  }

  /** Start at door `door` (the place already filled by `opticPlace`; optic-coop: or at gap `door` with `sub` > 0, the
   *  place filled by `opticPointPlace`). False while already running. */
  start(door: number, sub = 0): boolean {
    if (this.phase !== 'idle') return false;
    this.phase = 'feed';
    this.t = 0;
    this.door = door;
    this.sub = sub;
    this.baseYaw = this.place.yaw;
    this.basePitch = this.place.pitch;
    this.yaw = this.baseYaw;
    this.pitch = this.basePitch;
    return true;
  }

  /** Turn the tip (radians, the camera's look convention: + yaw right, + pitch up). Only in the view. */
  look(dYaw: number, dPitch: number): void {
    if (this.phase !== 'view') return;
    this.yaw = clampTipYaw(this.yaw + dYaw, this.baseYaw);
    this.pitch = clampTipPitch(this.pitch + dPitch, this.basePitch);
  }

  /** One fixed step (`leave`: the leave input this step; `abort`: hurt, the door opening, dead). */
  update(dt: number, leave: boolean, abort: boolean): void {
    if (this.phase === 'idle') return;
    this.t += dt;
    if ((this.phase === 'feed' || this.phase === 'view') && (leave || abort)) {
      this.phase = 'retract';
      this.t = 0;
      return;
    }
    if (this.phase === 'feed' && this.t >= OPTIC.feedIn) {
      this.phase = 'view';
      this.t = 0;
      this.views++;
    } else if (this.phase === 'retract' && this.t >= OPTIC.feedOut) this.reset();
  }

  reset(): void {
    this.phase = 'idle';
    this.t = 0;
    this.door = -1;
    this.sub = 0;
  }
}
