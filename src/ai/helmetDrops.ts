/**
 * (guard-ai S12) Dropped helmets: a helmet shot off a guard tumbles from his head to the floor beside his feet in
 * `HELMET_DROP.tumble` s and stays there as a clue. A small pool of part-library instances (A45: the rig's
 * combat-helmet part as the prop), built on the first drop (maps without gear build nothing) and reused oldest first.
 * Nothing is allocated per drop or per step. The arc is a pure function (`helmetArc`), unit-tested.
 */
import type { InstancedMesh } from '../core/babylon';
import type { PartLibrary } from '../world/partLibrary';

/** Pool size, tumble time (s), how far from his feet it lands (m), the arc's height (m). Prototype values (G4). */
export const HELMET_DROP = { pool: 8, tumble: 0.4, fling: 0.7, arc: 0.25 } as const;

/** Where a drop is at `u` (0..1 of the tumble) into `out` [x, y, z, pitch, roll]: from the head (`top` m above the
 *  feet) along (dx, dz) to `HELMET_DROP.fling` m away, on the floor (`y` + `rest`), up and over a short arc. */
export function helmetArc(x: number, y: number, z: number, top: number, rest: number, dx: number, dz: number, u: number, out: Float64Array | number[]): void {
  const k = u < 0 ? 0 : u > 1 ? 1 : u;
  const f = HELMET_DROP.fling * k;
  out[0] = x + dx * f;
  out[2] = z + dz * f;
  out[1] = y + top + (rest - top) * k * k + 4 * HELMET_DROP.arc * k * (1 - k);
  // over onto its side, crown towards the shot's way
  out[3] = 1.9 * k;
  out[4] = 0.5 * k;
}

interface Drop {
  m: InstancedMesh;
  /** Seconds since the drop (>= tumble: at rest). */
  t: number;
  x: number;
  y: number;
  z: number;
  top: number;
  rest: number;
  dx: number;
  dz: number;
}

/** The pool (one per `EnemyManager`). */
export class HelmetDrops {
  private drops: Drop[] = [];
  private next = 0;
  private readonly at = new Float64Array(5);

  constructor(
    private parts: PartLibrary,
    private shadow: (m: InstancedMesh) => void,
  ) {}

  /** Drops on the floor or falling (tests). */
  get shown(): number {
    let n = 0;
    for (let i = 0; i < this.drops.length; i++) if (this.drops[i]!.m.isVisible) n++;
    return n;
  }

  /** A helmet (colour `hex` on the first drop: one faction per map) of size `w` x `h` x `d` falls from `top` m above
   *  (x, y, z) along (dx, dz). The pool's oldest drop is reused once all `HELMET_DROP.pool` are out. */
  drop(x: number, y: number, z: number, top: number, dx: number, dz: number, hex: string, w: number, h: number, d: number): void {
    let i = this.next;
    // a new instance while the pool is short (after a `clear`, the hidden ones are reused first)
    if (this.drops.length < HELMET_DROP.pool && (i >= this.drops.length || this.drops[i]!.m.isVisible)) {
      const m = this.parts.instance('helmet', hex, 'helmet-drop');
      m.isPickable = false;
      this.shadow(m);
      i = this.drops.push({ m, t: 0, x: 0, y: 0, z: 0, top: 0, rest: 0, dx: 0, dz: 0 }) - 1;
    }
    this.next = (i + 1) % HELMET_DROP.pool;
    const o = this.drops[i]!;
    o.t = 0;
    o.x = x;
    o.y = y;
    o.z = z;
    o.top = top;
    o.rest = h * 0.45;
    o.dx = dx;
    o.dz = dz;
    o.m.scaling.set(w, h, d);
    o.m.rotation.set(0, Math.atan2(dx, dz), 0);
    this.place(o);
    o.m.isVisible = true;
  }

  private place(o: Drop): void {
    const a = this.at;
    helmetArc(o.x, o.y, o.z, o.top, o.rest, o.dx, o.dz, o.t / HELMET_DROP.tumble, a);
    o.m.position.set(a[0]!, a[1]!, a[2]!);
    o.m.rotation.x = a[3]!;
    o.m.rotation.z = a[4]!;
  }

  /** The tumbles (fixed step). */
  update(dt: number): void {
    for (let i = 0; i < this.drops.length; i++) {
      const o = this.drops[i]!;
      if (!o.m.isVisible || o.t >= HELMET_DROP.tumble) continue;
      o.t = Math.min(HELMET_DROP.tumble, o.t + dt);
      this.place(o);
    }
  }

  /** A new section: every dropped helmet goes. */
  clear(): void {
    for (let i = 0; i < this.drops.length; i++) this.drops[i]!.m.isVisible = false;
    this.next = 0;
  }
}
