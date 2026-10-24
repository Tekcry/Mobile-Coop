/**
 * (rig-pose-fix S5, audit G8 / G9) Where a downed guard lies, from sim state only: Babylon-free. `Body.pos` (the pelvis)
 * and the lie the carrier steps in to (the chest point, the way the head points) come from here, never from the ragdoll
 * or the rig: at death from the guard's feet and yaw plus a settle offset along the fall, on a put down from the drop
 * point. The ragdoll is visual and is snapped to this lie when it settles (`Ragdoll.snapTo`). The co-op client computes
 * the same lie from the puppet's last host state (`coopClient.ts`, kill event).
 */
import type { Proportions } from '../player/proportions';

/** The body dimensions the lie needs (a rig's static proportions, `CharacterRig.p`). */
export type LieBody = Pick<Proportions, 'height' | 'chest'> & { y: Pick<Proportions['y'], 'hip' | 'waist'> };

export interface BodyLie {
  /** The pelvis on the floor (`Body.pos`). */
  x: number;
  y: number;
  z: number;
  /** The chest point (the carrier steps in beside it). */
  cx: number;
  cy: number;
  cz: number;
  /** The way the head points from the pelvis (rad, 0 = +Z). */
  headYaw: number;
}

export const LIE = {
  /** The pelvis settles this share of the hip height from the feet along the fall (a ragdoll crumples, it does not
   *  pivot stiff on its feet). */
  settle: 0.5,
  /** The pelvis and chest lie this share of the chest depth off the floor (the ragdoll torso capsule's radius). */
  lift: 0.55,
  /** The ray for the room along the fall starts this high over the feet. */
  rayY: 0.3,
} as const;

export function newLie(): BodyLie {
  return { x: 0, y: 0, z: 0, cx: 0, cy: 0, cz: 0, headYaw: 0 };
}

/** The chest point's distance from the pelvis along the body (the rig's chest node over its hips). */
export function chestOffset(p: LieBody): number {
  return p.y.waist + 0.13 * (p.height / 1.75) - p.y.hip;
}

/** The pelvis's height off the floor lying down. */
export function lieLift(p: LieBody): number {
  return p.chest.d * LIE.lift;
}

/** The farthest the settle moves the pelvis, and the body's reach past the pelvis (the head's top). */
export function settleMax(p: LieBody): number {
  return p.y.hip * LIE.settle;
}
export function headReach(p: LieBody): number {
  return p.height - p.y.hip;
}

/** The fall's way (rad, 0 = +Z): along the horizontal impulse, or backward from his facing when it has none. */
export function fallYaw(yaw: number, dirX: number, dirZ: number): number {
  return dirX * dirX + dirZ * dirZ > 1e-6 ? Math.atan2(dirX, dirZ) : yaw + Math.PI;
}

/** Lying straight with the pelvis at (x, floorY + lift, z) and the head toward `headYaw`: fills `out`. */
export function lieAt(out: BodyLie, x: number, floorY: number, z: number, headYaw: number, p: LieBody): BodyLie {
  const y = floorY + lieLift(p);
  const c = chestOffset(p);
  out.x = x;
  out.y = y;
  out.z = z;
  out.cx = x + Math.sin(headYaw) * c;
  out.cy = y;
  out.cz = z + Math.cos(headYaw) * c;
  out.headYaw = headYaw;
  return out;
}

/**
 * At death: the guard's sim feet (x, y, z) and yaw, the death impulse's horizontal direction (dirX, dirZ; zero: he falls
 * backward), and `room`, the clear distance from his feet along the fall (a wall: the pelvis stays back so the body fits;
 * Infinity: open floor). The head points along the fall; the pelvis settles `settleMax` along it, less any shortfall of
 * room for the body past it.
 */
export function deathLie(out: BodyLie, x: number, y: number, z: number, yaw: number, dirX: number, dirZ: number, p: LieBody, room = Infinity): BodyLie {
  const h = fallYaw(yaw, dirX, dirZ);
  const s = Math.max(0, Math.min(settleMax(p), room - headReach(p)));
  return lieAt(out, x + Math.sin(h) * s, y, z + Math.cos(h) * s, h, p);
}

/** On a put down: the pelvis at the drop point `at` (its floor), the head toward `headYaw`. */
export function dropLie(out: BodyLie, ax: number, ay: number, az: number, headYaw: number, p: LieBody): BodyLie {
  return lieAt(out, ax, ay, az, headYaw, p);
}

/**
 * (G7) The shoulder the body goes on: 1 right (CT 110936, 052704), -1 left when its head lies to the carrier's left
 * (`liftYaw`: the way he faces the chest; a hoist over the right shoulder swung the head through his back).
 */
export function carrySide(headYaw: number, liftYaw: number): number {
  return Math.sin(headYaw) * Math.cos(liftYaw) - Math.cos(headYaw) * Math.sin(liftYaw) >= 0 ? 1 : -1;
}
