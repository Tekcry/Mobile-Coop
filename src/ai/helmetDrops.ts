/**
 * (guard-ai S12) Dropped helmets: a helmet shot off a guard tumbles from his head to the floor beside his feet in
 * `HELMET_DROP.tumble` s and stays there as a clue. A small pool of part-library instances (A45: the rig's
 * combat-helmet part as the prop), built on the first drop (maps without gear build nothing) and reused oldest first.
 * Nothing is allocated per drop or per step. The arc is a pure function (`helmetArc`), unit-tested.
 */
import type { InstancedMesh } from '../core/babylon';
import { flags } from '../core/flags';
import type { PartLibrary } from '../world/partLibrary';
import { helmetDropInstance, helmetDropSource, setHelmetDropColour, type HelmetMeshSource } from './guardHelmet';

/** Pool size, tumble time (s), how far from his feet it lands (m), the arc's height (m). Prototype values (G4). */
export const HELMET_DROP = { pool: 8, tumble: 0.4, fling: 0.7, arc: 0.25 } as const;

/**
 * (guard-models G7, A6) helmet_std's drop box (`anchors.drop`, G3-REPORT: w x h x d m on the average base at its 1.77 m
 * reference height): the dropped helmet's size for a guard figure, every kind (helmet_heavy has no drop anchor, so a
 * heavy's or enforcer's knocked-off helmet drops as helmet_std too). The placeholder box (`HELMET_FIT` x the rig's
 * head) stays with `?guardmodels=0`.
 */
export const HELMET_STD_DROP = { w: 0.253, h: 0.202, d: 0.2605, refHeight: 1.77 } as const;

/** The figure's dropped-helmet box for a guard `height` m tall, into `out` [w, h, d]. */
export function guardHelmetDrop(height: number, out: number[]): number[] {
  const k = height / HELMET_STD_DROP.refHeight;
  out[0] = HELMET_STD_DROP.w * k;
  out[1] = HELMET_STD_DROP.h * k;
  out[2] = HELMET_STD_DROP.d * k;
  return out;
}

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
  /** (guard-models G7) The helmet_std mesh it is an instance of (null: the part library's helmet box). */
  src: HelmetMeshSource | null;
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

  /** A helmet (colour `hex`: the box keeps the colour of the drop that made it; a helmet_std drop takes it on every
   *  drop, G7b) of size `w` x `h` x `d` falls from `top` m above (x, y, z) along (dx, dz). The pool's oldest drop is
   *  reused once all `HELMET_DROP.pool` are out. */
  drop(x: number, y: number, z: number, top: number, dx: number, dz: number, hex: string, w: number, h: number, d: number): void {
    let i = this.next;
    // (guard-models G7, A6) with the guard figures: helmet_std's own LOD1 geometry once a base file with it is in (the
    // box until then, and with Wren standing in)
    const src = flags.guardModels ? this.helmetSource() : null;
    // a new instance while the pool is short (after a `clear`, the hidden ones are reused first)
    if (this.drops.length < HELMET_DROP.pool && (i >= this.drops.length || this.drops[i]!.m.isVisible)) {
      i = this.drops.push({ m: this.make(src, hex), src, t: 0, x: 0, y: 0, z: 0, top: 0, rest: 0, dx: 0, dz: 0 }) - 1;
    }
    this.next = (i + 1) % HELMET_DROP.pool;
    const o = this.drops[i]!;
    if (o.src !== src) {
      // the helmet mesh arrived after this one was made: the reused drop becomes one of it
      o.m.dispose();
      o.m = this.make(src, hex);
      o.src = src;
    }
    // (G7b) a helmet_std drop takes this guard's colour, reused or not (per instance: no bleed between kinds)
    if (src) setHelmetDropColour(o.m, hex);
    o.t = 0;
    o.x = x;
    o.y = y;
    o.z = z;
    o.top = top;
    o.rest = h * 0.45;
    o.dx = dx;
    o.dz = dz;
    if (src) o.m.scaling.set(w / src.w, h / src.h, d / src.d);
    else o.m.scaling.set(w, h, d);
    o.m.rotation.set(0, Math.atan2(dx, dz), 0);
    this.place(o);
    o.m.isVisible = true;
  }

  private make(src: HelmetMeshSource | null, hex: string): InstancedMesh {
    const m = src ? helmetDropInstance(src, hex, 'helmet-drop') : this.parts.instance('helmet', hex, 'helmet-drop');
    m.isPickable = false;
    this.shadow(m);
    return m;
  }

  /** The scene's helmet_std drop mesh (null: not loaded, or no guard file with it: the box). Load time only. */
  private helmetSource(): HelmetMeshSource | null {
    const scene = (this.parts as Partial<PartLibrary>).material?.getScene();
    return scene ? helmetDropSource(scene) : null;
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
