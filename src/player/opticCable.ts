/**
 * (ct-toolkit 3.2, G97) The optic cable under a door, Babylon-free: the refusal, the kneel spot, the tip point and its
 * look limits, and the feed in / view / pull out states. The scene glue is `game/opticSystem.ts`.
 *
 * Gameplay facts: the tip is never perceived (it is not a body); the player's own body kneels on the near side and is
 * perceived as any crouched, still body. The cable is silent and has no light. The view is local (co-op: never sent).
 * The tip is placed from the door anchor and a collision ray only, never from graphics state.
 */
import { OPTIC } from '../config/tools';

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
export type OpticRefusal = 'Sealed' | 'Locked' | 'Door open' | 'No gap' | null;

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
}

export function emptyOpticPlace(): OpticPlace {
  return { side: 1, kx: 0, kz: 0, tx: 0, ty: 0, tz: 0, yaw: 0, gx: 0, gz: 0 };
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
  return out;
}

/** The tip's yaw kept within +-`OPTIC.yaw` of the centre `base`. */
export function clampTipYaw(yaw: number, base: number): number {
  const d = Math.atan2(Math.sin(yaw - base), Math.cos(yaw - base));
  return Math.abs(d) <= OPTIC.yaw ? base + d : base + Math.sign(d) * OPTIC.yaw;
}

/** The tip's pitch kept within `OPTIC.pitchMin` .. `OPTIC.pitchMax` (+ up). */
export function clampTipPitch(pitch: number): number {
  return Math.max(OPTIC.pitchMin, Math.min(OPTIC.pitchMax, pitch));
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
  /** The door's index (-1: none). */
  door = -1;
  /** The look's centre yaw and the tip's look now. */
  baseYaw = 0;
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

  /** Start at door `door` (the place already filled by `opticPlace`). False while already running. */
  start(door: number): boolean {
    if (this.phase !== 'idle') return false;
    this.phase = 'feed';
    this.t = 0;
    this.door = door;
    this.baseYaw = this.place.yaw;
    this.yaw = this.baseYaw;
    this.pitch = 0;
    return true;
  }

  /** Turn the tip (radians, the camera's look convention: + yaw right, + pitch up). Only in the view. */
  look(dYaw: number, dPitch: number): void {
    if (this.phase !== 'view') return;
    this.yaw = clampTipYaw(this.yaw + dYaw, this.baseYaw);
    this.pitch = clampTipPitch(this.pitch + dPitch);
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
  }
}
