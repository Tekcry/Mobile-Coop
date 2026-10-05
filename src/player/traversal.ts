import { PhysicsRaycastResult, Vector3, type PhysicsEngine, type Scene } from '../core/babylon';
import { G } from '../physics/groups';
import { MOVEMENT } from '../config/movement';
import { pickTraversal, type Traversal } from './movement';
import type { Player } from './player';

const Q = { membership: G.PLAYER, collideWith: G.STATIC };
const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** Durations (s) of each committed traversal. */
export const TRAVERSE_TIME: Record<Exclude<Traversal, 'none'> | 'drop', number> = { step: 0.4, vault: 0.75, mantle: 1.1, drop: 0.35 };

/** Result of probing the space in front of the feet. */
export interface TraverseProbe {
  kind: Traversal | 'drop';
  /** Distance to the obstacle face (m), top height above the feet and depth. */
  front: number;
  height: number;
  depth: number;
  /** Feet position at the end of the move. */
  end: Vector3;
}

/**
 * Contextual "jump": there is no free jump. Pressing jump in front of an obstacle picks a step up,
 * vault (low and thin, clear landing) or mantle (up to chest height, room on top); at a ledge it is a
 * controlled drop. Each is a committed, eased kinematic move with the weapon at high ready. The
 * probe also runs a few times a second so the HUD can show what jump would do.
 */
export class TraversalController {
  kind: Traversal | 'drop' = 'none';
  t = 0;
  /** What jump would do right now (for the prompt), refreshed at 5 Hz. */
  hint: TraverseProbe | null = null;
  private eng: PhysicsEngine;
  private rr = new PhysicsRaycastResult();
  private a = new Vector3();
  private b = new Vector3();
  private from = new Vector3();
  private to = new Vector3();
  private kin = new Vector3();
  private dir = new Vector3(0, 0, 1);
  private top = 0;
  private probeT = 0;

  constructor(
    scene: Scene,
    private player: Player,
  ) {
    this.eng = scene.getPhysicsEngine() as PhysicsEngine;
  }

  get active(): boolean {
    return this.kind !== 'none';
  }

  private ray(from: Vector3, to: Vector3): number | null {
    this.rr.reset();
    this.eng.raycastToRef(from, to, this.rr, Q);
    return this.rr.hasHit ? Vector3.Distance(from, this.rr.hitPoint) : null;
  }

  /** Floor height under (x, z) between yFrom and yFrom - depth, or null. */
  private floor(x: number, z: number, yFrom: number, depth: number): number | null {
    this.rr.reset();
    this.eng.raycastToRef(this.a.set(x, yFrom, z), this.b.set(x, yFrom - depth, z), this.rr, Q);
    return this.rr.hasHit ? this.rr.hitPoint.y : null;
  }

  /** Look along `dir` from the feet and classify the obstacle (or ledge). */
  probe(feet: Vector3, dx: number, dz: number): TraverseProbe | null {
    const reach = 1.3;
    let front = Infinity;
    for (const h of [0.25, 0.6, 1.0, 1.4]) {
      const d = this.ray(this.a.set(feet.x, feet.y + h, feet.z), this.b.set(feet.x + dx * reach, feet.y + h, feet.z + dz * reach));
      if (d !== null) front = Math.min(front, d);
    }
    if (front === Infinity) {
      // nothing in front: a ledge?
      const ax = feet.x + dx * 0.75;
      const az = feet.z + dz * 0.75;
      const f = this.floor(ax, az, feet.y + 0.3, 4);
      if (f === null || feet.y - f > 0.6) {
        const land = f ?? feet.y - 4;
        // step out far enough that the capsule clears the edge
        const out = 0.75 + MOVEMENT.radius + 0.2;
        return { kind: 'drop', front: 0.75, height: land - feet.y, depth: 0, end: new Vector3(feet.x + dx * out, land, feet.z + dz * out) };
      }
      return null;
    }
    if (front < MOVEMENT.radius - 0.05) return null;
    // top of the obstacle just past its face
    const fx = feet.x + dx * (front + 0.12);
    const fz = feet.z + dz * (front + 0.12);
    const topY = this.floor(fx, fz, feet.y + 2.0, 2.0);
    if (topY === null) return null;
    const height = topY - feet.y;
    // depth: walk across the top until it ends
    let depth = 0.12;
    while (depth < 1.6) {
      const y = this.floor(feet.x + dx * (front + depth + 0.1), feet.z + dz * (front + depth + 0.1), topY + 0.3, 0.45);
      if (y === null || Math.abs(y - topY) > 0.12) break;
      depth += 0.1;
    }
    // landing beyond (vault): floor near the feet height, and the arc over the top is clear
    const lx = feet.x + dx * (front + depth + 0.55);
    const lz = feet.z + dz * (front + depth + 0.55);
    const landY = this.floor(lx, lz, topY + 0.3, height + 1.2);
    const arcY = topY + 0.45;
    const arcClear = this.ray(this.a.set(feet.x, arcY, feet.z), this.b.set(lx, arcY, lz)) === null;
    const landingClear = landY !== null && Math.abs(landY - feet.y) < 0.6 && arcClear;
    // standing room on top (mantle)
    const mx = feet.x + dx * (front + 0.4);
    const mz = feet.z + dz * (front + 0.4);
    const topClear = this.ray(this.a.set(mx, topY + 0.05, mz), this.b.set(mx, topY + MOVEMENT.standHeight, mz)) === null && this.ray(this.a.set(feet.x, topY + 0.5, feet.z), this.b.set(mx, topY + 0.5, mz)) === null;
    const kind = pickTraversal({ height, depth, landingClear, topClear });
    if (kind === 'none') return null;
    const end = kind === 'vault' ? new Vector3(lx, landY ?? feet.y, lz) : new Vector3(mx, topY, mz);
    return { kind, front, height, depth, end };
  }

  /** Movement direction to probe along: the stick if pushed, else where the body faces. */
  private probeDir(): { x: number; z: number } {
    const c = this.player.controller;
    const w = c.wishDir;
    const l = Math.hypot(w.x, w.z);
    if (l > 0.3) return { x: w.x / l, z: w.z / l };
    return { x: Math.sin(c.yaw), z: Math.cos(c.yaw) };
  }

  /**
   * Fixed step. `jumpPressed` is the contextual action; `blocked` while another system (cover) owns
   * the controller. Returns true while a traversal drives the player.
   */
  fixedUpdate(dt: number, jumpPressed: boolean, blocked: boolean): boolean {
    const p = this.player;
    const c = p.controller;
    const pose = p.coverPose;
    if (this.active) {
      this.t += dt;
      const dur = TRAVERSE_TIME[this.kind as keyof typeof TRAVERSE_TIME];
      const k = Math.min(1, this.t / dur);
      this.path(k);
      pose.traverse = this.kind === 'drop' ? 'step' : this.kind;
      pose.traverseT = k;
      c.override = { kinematic: this.kin, yaw: Math.atan2(this.dir.x, this.dir.z), crouch: this.kind === 'vault' };
      if (k >= 1) {
        if (this.kind === 'vault' || this.kind === 'mantle') c.landT = Math.max(c.landT, 0.2);
        this.kind = 'none';
        pose.traverse = 'none';
        pose.traverseT = 0;
        c.override = null;
      }
      return true;
    }
    if (blocked || !p.alive || !c.grounded || c.dashing) {
      this.hint = null;
      return false;
    }
    this.probeT -= dt;
    if (this.probeT <= 0 || jumpPressed) {
      this.probeT = 0.2;
      const d = this.probeDir();
      this.hint = this.probe(c.pos, d.x, d.z);
      if (this.hint) this.dir.set(d.x, 0, d.z);
    }
    if (jumpPressed && this.hint) {
      this.kind = this.hint.kind;
      this.t = 0;
      this.from.copyFrom(c.pos);
      this.to.copyFrom(this.hint.end);
      this.top = c.pos.y + Math.max(0, this.hint.height);
      this.hint = null;
      return this.fixedUpdate(0, false, false);
    }
    return false;
  }

  /** Feet position along the committed path at progress k. */
  private path(k: number): void {
    const f = this.from;
    const e = this.to;
    let h: number;
    let y: number;
    switch (this.kind) {
      case 'mantle': {
        // hands on top, pull up (rise first), then step onto it
        const up = smooth(k / 0.65);
        h = smooth((k - 0.35) / 0.65);
        y = f.y + (e.y + 0.04 - f.y) * up;
        break;
      }
      case 'vault': {
        // plant, swing the legs over the top, land
        h = smooth(k);
        const clear = this.top + 0.12;
        const arc = Math.sin(Math.PI * Math.min(1, k * 1.15));
        y = f.y + (e.y - f.y) * h + Math.max(0, clear - Math.max(f.y, e.y)) * arc;
        break;
      }
      case 'drop': {
        // step off the edge; gravity takes over after the release
        h = smooth(k);
        y = f.y - 0.05 * k;
        break;
      }
      default: {
        // step up: lift then forward
        const up = smooth(k / 0.6);
        h = smooth((k - 0.2) / 0.8);
        y = f.y + (e.y + 0.03 - f.y) * up;
      }
    }
    this.kin.set(f.x + (e.x - f.x) * h, y, f.z + (e.z - f.z) * h);
  }

  reset(): void {
    this.kind = 'none';
    this.hint = null;
  }
}
