/**
 * The light check (guard-ai S2, M1 goal 4; pure: no Babylon / DOM), unit-tested. A guard the board sends to a light
 * that went out walks to its floor point (a pair's second stops `PAIR_SHORT` m short), looks at the fixture
 * `INCIDENT.lightLook` s, then walks `ringN` points round it (`lightRingPoint`, 2-6 m), `ringLook` s at each looking
 * outward, and is done (the guard stands down). Every stage is bounded: the walk in gives up after `LIGHT_WALK` s, a
 * ring point after `RING_WALK` s (an A* path still being followed included), and a ring point that is not in the
 * light's own space (no clear nav line from the light's floor point: behind a wall, in the next room) is pulled in
 * halfway, else skipped. (Fix round: a ring point snapped past a wall sent the first of a pair on a long detour; his
 * 8 s ring timeout only fired with no path left, so he stood investigating for good.)
 *
 * The guard supplies the nav queries and his walker (`Enemy.goTo` and its A* path); the check writes its output into
 * `point` / `face` and returns a status. No allocation per step.
 */
import { hyp2 } from '../core/mathx';
import { INCIDENT, lightRingPoint } from './incidents';
import type { P2 } from './navGrid';

/** Gives up walking to the light after this (s; then looks from where he is). */
export const LIGHT_WALK = 30;
/** Gives up on a ring point after this (s; the next point). Fix round: 12 (was 8): the walk from the 4.7 m point to
 *  the 6 m one is 7.6 m, ~10 s at a grunt's investigate pace (0.77 m/s), so the last point was always cut. */
export const RING_WALK = 12;
/** At the light: the first of a pair (or a lone checker) stops within this (m), the second `PAIR_SHORT` short. */
export const LIGHT_NEAR = 1.1;
export const PAIR_SHORT = 2.2;

/** The nav queries the check needs (`NavGrid`). */
export interface LightCheckNav {
  nearestWalkable(x: number, z: number, maxRing: number, y: number): number;
  center(c: number): P2;
  lineClear(a: P2, b: P2, ya?: number, yb?: number): boolean;
}

/** The guard's walker: `walkTo` heads for a floor point (the next waypoint, null when there or no path);
 *  `following` an A* path is still being followed; `dropPath` forgets it. */
export interface LightCheckWalker {
  walkTo(p: P2, dt: number): P2 | null;
  following(): boolean;
  dropPath(): void;
}

/** `step` results: walk to `point` (null: stand), stand facing `face`, or the check is done. */
export const LC_WALK = 0;
export const LC_FACE = 1;
export const LC_DONE = 2;

export class LightCheck {
  /** -1 idle; 0 walking to the light; 1 looking at it; 2 + k on ring point k. */
  k = -1;
  /** The light's floor point. */
  readonly c: P2 = [0, 0];
  /** The current ring point (snapped to the nav). */
  readonly spot: P2 = [0, 0];
  slot = 0;
  /** Output of the last `step`: the waypoint (LC_WALK) or the yaw (LC_FACE). */
  point: P2 | null = null;
  face = 0;
  private t = 0;
  private base = 0;
  private spotSet = false;
  private lookT = 0;
  private lookBase = 0;
  private readonly anchor: P2 = [0, 0];
  private anchorOk = false;
  private readonly half: P2 = [0, 0];

  get active(): boolean {
    return this.k >= 0;
  }

  start(x: number, z: number, slot: number): void {
    this.k = 0;
    this.t = 0;
    this.slot = slot;
    this.c[0] = x;
    this.c[1] = z;
    this.spotSet = false;
    this.anchorOk = false;
  }

  stop(): void {
    this.k = -1;
  }

  /** One step for a guard at (x, y, z) facing `yaw`: LC_WALK (`point`), LC_FACE (`face`) or LC_DONE. */
  step(dt: number, x: number, y: number, z: number, yaw: number, nav: LightCheckNav, w: LightCheckWalker): number {
    const L = INCIDENT;
    const cx = this.c[0];
    const cz = this.c[1];
    if (this.k === 0) {
      const d = hyp2(cx - x, cz - z);
      this.t += dt;
      if (d >= (this.slot ? PAIR_SHORT : LIGHT_NEAR) && this.t < LIGHT_WALK) {
        const wp = w.walkTo(this.c, dt);
        if (wp || w.following()) return this.walk(wp);
      }
      // there (or as near as he gets): the ring starts on the side he came from
      w.dropPath();
      this.k = 1;
      this.t = 0;
      this.base = d > 0.05 ? Math.atan2(x - cx, z - cz) : yaw + Math.PI;
      // the light's own space: the floor point (or the walkable cell nearest it); ring points must see it on the nav
      const a = nav.nearestWalkable(cx, cz, 4, y);
      this.anchorOk = a >= 0;
      if (this.anchorOk) {
        const ac = nav.center(a);
        this.anchor[0] = ac[0];
        this.anchor[1] = ac[1];
      }
    }
    if (this.k === 1) {
      this.t += dt;
      if (this.t >= L.lightLook) {
        this.k = 2;
        this.t = 0;
        this.spotSet = false;
      }
      return this.look(Math.atan2(cx - x, cz - z));
    }
    for (;;) {
      const k = this.k - 2;
      if (k >= L.ringN) {
        this.k = -1;
        return LC_DONE;
      }
      if (this.spotSet) break;
      if (this.pickRingPoint(k, y, nav)) {
        this.spotSet = true;
        this.lookT = 0;
        this.t = 0;
        break;
      }
      // not in the light's space: the next point
      this.k++;
    }
    const d = hyp2(this.spot[0] - x, this.spot[1] - z);
    if (d < LIGHT_NEAR) {
      if (this.lookT === 0) this.lookBase = Math.atan2(this.spot[0] - cx, this.spot[1] - cz);
      this.lookT += dt;
      if (this.lookT >= L.ringLook) this.next(w);
      // look outward from the light, a sweep either side
      return this.look(this.lookBase + Math.sin(this.lookT * 2.1) * 0.7);
    }
    this.t += dt;
    const wp = this.t < RING_WALK ? w.walkTo(this.spot, dt) : null;
    if (wp || (this.t < RING_WALK && w.following())) return this.walk(wp);
    // unreachable, or too long on the way (a path still being followed included): the next point
    this.next(w);
    return this.walk(null);
  }

  private next(w: LightCheckWalker): void {
    w.dropPath();
    this.k++;
    this.spotSet = false;
  }

  private walk(p: P2 | null): number {
    this.point = p;
    return LC_WALK;
  }

  private look(yaw: number): number {
    this.point = null;
    this.face = yaw;
    return LC_FACE;
  }

  /** Ring point `k` into `spot`, snapped to the nav; false when neither it nor the point halfway in has a clear nav
   *  line from the light (behind a wall, in the next room). */
  private pickRingPoint(k: number, y: number, nav: LightCheckNav): boolean {
    lightRingPoint(this.c[0], this.c[1], k, this.base, this.slot, this.spot);
    if (this.snapClear(this.spot, y, nav)) return true;
    this.half[0] = (this.spot[0] + this.c[0]) * 0.5;
    this.half[1] = (this.spot[1] + this.c[1]) * 0.5;
    if (!this.snapClear(this.half, y, nav)) return false;
    this.spot[0] = this.half[0];
    this.spot[1] = this.half[1];
    return true;
  }

  private snapClear(p: P2, y: number, nav: LightCheckNav): boolean {
    const c = nav.nearestWalkable(p[0], p[1], 4, y);
    if (c >= 0) {
      const cc = nav.center(c);
      p[0] = cc[0];
      p[1] = cc[1];
    }
    // no nav at the light at all: keep the old rule (any point; the walk timeout bounds it)
    return !this.anchorOk || nav.lineClear(this.anchor, p, y, y);
  }
}
