import { PhysicsRaycastResult, Vector3, type PhysicsEngine, type Scene } from '../core/babylon';
import { G } from '../physics/groups';
import type { Player } from '../player/player';
import type { CoverSegment } from './coverData';
import { doorSide, findDoorways, outsideCorners, pickLean, sliceSteer, type Doorway, type OutsideCorner } from './corners';

const Q = { membership: G.PLAYER, collideWith: G.STATIC };

/** Seconds to lean fully out / back, and for the doorway check sweep. */
export const LEAN_TIME = 0.25;
export const CHECK_TIME = 0.9;

/**
 * Close-quarters movement out of cover:
 *  - slicing the pie: approaching an outside corner along its wall eases the player out to a ~1 m
 *    standoff (wide arc) with the weapon compressed;
 *  - contextual lean: aiming with a wall or door frame blocking the aim line leans out to the clear
 *    side with the hips planted (creep speed), the camera swapping to that shoulder;
 *  - doorways: compressed ready when close, and a quick left-right check sweep when stepping through.
 */
export class CornerController {
  readonly doorways: Doorway[];
  readonly corners: OutsideCorner[];
  /** Current lean -1..1 (eased) and the side being leaned to. */
  lean = 0;
  leanSide = 0;
  checkT = -1;
  /** Nearest doorway within reach (for the HUD / tests), or null. */
  door: Doorway | null = null;
  private lastDoorSide = new Map<Doorway, number>();
  private eng: PhysicsEngine;
  private rr = new PhysicsRaycastResult();
  private a = new Vector3();
  private b = new Vector3();
  private probeT = 0;
  private savedShoulder: 1 | -1 | null = null;

  constructor(
    scene: Scene,
    private player: Player,
    segments: readonly CoverSegment[],
  ) {
    this.eng = scene.getPhysicsEngine() as PhysicsEngine;
    this.doorways = findDoorways(segments);
    this.corners = outsideCorners(segments);
  }

  private clear(x: number, y: number, z: number, dx: number, dz: number, len: number): boolean {
    this.rr.reset();
    this.eng.raycastToRef(this.a.set(x, y, z), this.b.set(x + dx * len, y, z + dz * len), this.rr, Q);
    return !this.rr.hasHit;
  }

  /** Fixed step. `active` is false while cover or traversal owns the player. */
  fixedUpdate(dt: number, active: boolean): void {
    const p = this.player;
    const c = p.controller;
    c.steer.x = c.steer.z = 0;
    c.stanceMul = 1;
    c.speedCap = Infinity;
    if (!active || !p.alive) {
      this.endLean(dt, true);
      this.checkT = -1;
      p.coverPose.check = -1;
      return;
    }
    const px = c.pos.x;
    const pz = c.pos.z;
    const w = c.wishDir;

    // slicing the pie + compressed ready near outside corners
    let nearCorner = false;
    let sx = 0;
    let sz = 0;
    for (const k of this.corners) {
      const dx = px - k.x;
      const dz = pz - k.z;
      if (dx * dx + dz * dz > 12) continue;
      if (dx * dx + dz * dz < 1.44) nearCorner = true;
      const push = sliceSteer(k, px, pz, w.x, w.z);
      if (push > 0) {
        sx += k.nx * push;
        sz += k.nz * push;
      }
    }
    if (!c.dashing) {
      c.steer.x = sx;
      c.steer.z = sz;
    }

    // doorways: compressed ready close by; crossing the plane plays the check sweep
    this.door = null;
    for (const d of this.doorways) {
      const ds = doorSide(d, px, pz);
      if (ds.dist < 1.6) this.door = d;
      if (ds.dist > 2.5) {
        this.lastDoorSide.delete(d);
        continue;
      }
      const prev = this.lastDoorSide.get(d);
      const side = Math.sign(ds.side) || 1;
      if (prev !== undefined && prev !== side && ds.inside && this.checkT < 0) this.checkT = 0;
      this.lastDoorSide.set(d, side);
    }
    p.context.doorway = this.door !== null;
    p.context.coverEdge = nearCorner;
    if (this.checkT >= 0) {
      this.checkT += dt;
      p.coverPose.check = Math.min(1, this.checkT / CHECK_TIME);
      if (this.checkT >= CHECK_TIME) this.checkT = -1;
    } else p.coverPose.check = -1;

    // contextual lean while aiming with the aim line blocked close in front
    // aim input only (the lean itself raises the weapon, so the raise cannot keep the lean alive)
    const aiming = p.ads || p.carryIn.fire;
    if (aiming) {
      this.probeT -= dt;
      if (this.probeT <= 0) {
        this.probeT = 0.1;
        const yaw = p.cam.yaw;
        const fx = Math.sin(yaw);
        const fz = Math.cos(yaw);
        const y = c.pos.y + (c.crouched ? 0.95 : 1.4);
        const off = 0.5;
        const centre = !this.clear(px, y, pz, fx, fz, 1.3);
        const left = this.clear(px - fz * off, y, pz + fx * off, fx, fz, 3);
        const right = this.clear(px + fz * off, y, pz - fx * off, fx, fz, 3);
        const side = pickLean(centre, left, right, p.cam.shoulder);
        // keep leaning while still blocked (hysteresis), switch only to a new clear side
        if (side !== 0 || !centre) this.leanSide = side;
      }
    } else this.leanSide = 0;

    if (this.leanSide !== 0) {
      this.lean = approach(this.lean, this.leanSide, dt / LEAN_TIME);
      c.speedCap = 0.45; // hips planted: only a shuffle while leaning
      const want: 1 | -1 = this.leanSide < 0 ? -1 : 1;
      if (p.cam.shoulder !== want) {
        if (this.savedShoulder === null) this.savedShoulder = p.cam.shoulder;
        p.cam.shoulder = want;
      }
    } else this.endLean(dt, false);
    // hips stay planted until the lean is back in, not just while the probe says "blocked"
    if (Math.abs(this.lean) > 0.05) c.speedCap = 0.45;
    p.coverPose.lean = this.lean;
    // lean out of the left side with the weapon in the left hand
    p.rig.leftHanded = this.leanSide < 0 || (this.leanSide === 0 && this.lean < -0.5);
  }

  private endLean(dt: number, hard: boolean): void {
    this.leanSide = 0;
    this.lean = hard ? 0 : approach(this.lean, 0, dt / LEAN_TIME);
    if (this.lean === 0 && this.savedShoulder !== null) {
      this.player.cam.shoulder = this.savedShoulder;
      this.savedShoulder = null;
    }
  }

  reset(): void {
    this.lean = 0;
    this.leanSide = 0;
    this.checkT = -1;
    this.lastDoorSide.clear();
    if (this.savedShoulder !== null) this.player.cam.shoulder = this.savedShoulder;
    this.savedShoulder = null;
  }
}

function approach(v: number, target: number, step: number): number {
  return v < target ? Math.min(target, v + step) : Math.max(target, v - step);
}
