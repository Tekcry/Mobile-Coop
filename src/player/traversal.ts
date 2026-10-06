import { PhysicsRaycastResult, Vector3, type PhysicsEngine, type Scene } from '../core/babylon';
import { G } from '../physics/groups';
import { MOVEMENT } from '../config/movement';
import { pickTraversal, type Traversal } from './movement';
import type { Player } from './player';
import { hyp2 } from '../core/mathx';

const Q = { membership: G.PLAYER, collideWith: G.STATIC };
const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** Durations (s) of each committed traversal from a standstill; quicker in stride (see `duration`). */
export const TRAVERSE_TIME: Record<Exclude<Traversal, 'none'> | 'drop' | 'hop', number> = { step: 0.4, vault: 0.7, mantle: 1.0, drop: 0.35, hop: 0.5 };

/** Fastest each move gets at speed (s). */
const MIN_TIME: Record<keyof typeof TRAVERSE_TIME, number> = { step: 0.22, vault: 0.42, mantle: 0.75, drop: 0.25, hop: 0.38 };

/** Committed duration at an entry speed: in stride the move takes about as long as covering it. */
export function traverseDuration(kind: keyof typeof TRAVERSE_TIME, speed: number, length: number): number {
  const base = TRAVERSE_TIME[kind];
  if (speed < 1) return base;
  return Math.max(MIN_TIME[kind], Math.min(base, (length / speed) * 1.15));
}

/** Result of probing the space in front of the feet. */
export interface TraverseProbe {
  kind: Traversal | 'drop' | 'hop';
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
  kind: Traversal | 'drop' | 'hop' = 'none';
  t = 0;
  /** Committed duration of the current move, entry speed and whether a sprint carried into it. */
  private dur = 1;
  private speed0 = 0;
  private sprint0 = false;
  /** What jump would do right now (for the prompt), refreshed at 5 Hz. */
  hint: TraverseProbe | null = null;
  /** Where the hint's obstacle face (or ledge) is: on the ground under it, at the feet height. */
  readonly hintAt = new Vector3();
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
      if ((f === null || feet.y - f > 0.6) && this.player.controller.sprinting) {
        // sprinting at a gap: a quick hop if there is floor at about the same height beyond it
        for (let d = 1.4; d <= 3.2; d += 0.3) {
          const g = this.floor(feet.x + dx * d, feet.z + dz * d, feet.y + 0.5, 1.0);
          if (g !== null && Math.abs(g - feet.y) < 0.35) {
            const out = d + 0.5;
            const clear = this.ray(this.a.set(feet.x, feet.y + 0.9, feet.z), this.b.set(feet.x + dx * out, feet.y + 0.9, feet.z + dz * out)) === null;
            if (clear) return { kind: 'hop', front: d, height: 0, depth: d, end: new Vector3(feet.x + dx * out, g, feet.z + dz * out) };
          }
        }
      }
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
    const l = hyp2(w.x, w.z);
    if (l > 0.3) return { x: w.x / l, z: w.z / l };
    return { x: Math.sin(c.yaw), z: Math.cos(c.yaw) };
  }

  /**
   * Fixed step. `jumpPressed` is the contextual action; `blocked` while another system (cover) owns
   * the controller. Returns true while a traversal drives the player.
   */
  fixedUpdate(dt: number, jumpPressed: boolean, blocked: boolean, dir: { x: number; z: number } | null = null): boolean {
    const p = this.player;
    const c = p.controller;
    const pose = p.coverPose;
    if (this.active) {
      this.t += dt;
      const k = Math.min(1, this.t / this.dur);
      this.path(k);
      pose.traverse = this.kind;
      pose.traverseT = k;
      c.override = { kinematic: this.kin, yaw: Math.atan2(this.dir.x, this.dir.z), crouch: this.kind === 'vault' };
      if (k >= 1) {
        const inStride = this.speed0 >= 1;
        // a standing climb settles; in stride the move lands straight into the gait it came from
        if ((this.kind === 'vault' || this.kind === 'mantle') && !inStride) c.landT = Math.max(c.landT, 0.2);
        c.override = null;
        if (inStride && this.kind !== 'mantle') {
          c.motion.carry(this.dir.x * this.speed0, this.dir.z * this.speed0);
          if (this.sprint0) c.resumeSprint();
        }
        this.kind = 'none';
        pose.traverse = 'none';
        pose.traverseT = 0;
      }
      return true;
    }
    if (blocked || !p.alive || !c.grounded) {
      this.hint = null;
      return false;
    }
    this.probeT -= dt;
    if (this.probeT <= 0 || jumpPressed) {
      this.probeT = 0.2;
      const d = dir ?? this.probeDir();
      this.hint = this.probe(c.pos, d.x, d.z);
      if (this.hint) {
        this.dir.set(d.x, 0, d.z);
        const f = this.hint.kind === 'hop' || this.hint.kind === 'drop' ? 0.6 : this.hint.front;
        this.hintAt.set(c.pos.x + d.x * f, c.pos.y, c.pos.z + d.z * f);
      }
    }
    if (jumpPressed && this.hint) {
      this.kind = this.hint.kind;
      this.t = 0;
      this.speed0 = c.speed;
      this.sprint0 = c.sprinting;
      this.dur = traverseDuration(this.kind as keyof typeof TRAVERSE_TIME, this.speed0, hyp2(this.hint.end.x - c.pos.x, this.hint.end.z - c.pos.z));
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
        // plant, swing the legs over the top, land; in stride the momentum carries straight through
        const run = Math.min(1, Math.max(0, (this.speed0 - 1) / 2));
        h = smooth(k) * (1 - run) + k * run;
        const clear = this.top + 0.12;
        const arc = Math.sin(Math.PI * Math.min(1, k * 1.15));
        y = f.y + (e.y - f.y) * h + Math.max(0, clear - Math.max(f.y, e.y)) * arc;
        break;
      }
      case 'hop': {
        // a low, quick leap: carried by momentum (near linear), a short arc
        h = k;
        y = f.y + (e.y - f.y) * smooth(k) + 0.45 * Math.sin(Math.PI * k);
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
