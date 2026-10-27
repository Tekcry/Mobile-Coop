/**
 * (LR16-1) The one-bounce fill at runtime (pure, gameplay-owned; the picture reads the same bytes). The bake
 * (`voxel/lampBounce.ts`) gives each fixed lamp a box of 1 m cells on the ambient grid and its bounce per unit
 * intensity in `BOUNCE.q` steps; this sums the lit lamps' boxes:
 *
 *   acc = sum over lit lamps of q x round(intensity x 1024)   (integers, exact in a Float64Array)
 *   g   = round(min(1, acc x BOUNCE.q / 1024 x LAMP_LEVEL_GAIN) x 255)
 *
 * A lamp switched off, shot, jammed dark or EMP'd takes its bounce with it at the next `sync` (the registry's version
 * moved), and back on returns the very same bytes. `LightField.levelInto` adds `g` read by `sampleInto` beside the ambient
 * fill (the meter and the guards); `BakedLamps` packs `g` into the fill texture's green channel and the static wall
 * bits (`bits`) into its blue and alpha (the picture's `nsGrid2`, the same arithmetic).
 *
 * (LR16-1 fix round) The read never blends across a wall: a plain trilinear between 1 m cell centres let a lit cell's
 * light up to a metre past a wall that is not in the middle of its cell (a dark room 0.15 m behind it read +0.22).
 * `sampleInto`: the cell holding the point is its home, or the neighbour on the point's side when a wall inside the cell
 * parts the point from the centre (`BOUNCE_T_SHIFT`); then the 8 corners are blended trilinearly over the ones the home
 * reaches through open faces (the edge bits), the weights renormalised. Allocation-free after construction.
 */
import { BOUNCE, BOUNCE_BOX_STRIDE, BOUNCE_T_SHIFT, BOUNCE_T_STEP, type LampBounce } from '../voxel/lampBounce';
import { AMBIENT_CELL } from './ambientGrid';
import { LAMP_LEVEL_GAIN } from './lampMath';
import type { LightRegistry } from './lights';

/** Intensity is weighted in 1 / this steps (integer weights keep the sums exact). */
export const BOUNCE_WEIGHT = 1024;

/** The registry as `sync` reads it. */
export type BounceRegistry = Pick<LightRegistry, 'version' | 'lights'>;

export class BounceGrid {
  /** The ambient grid's origin and counts (the bounce shares its cells). */
  readonly origin: [number, number, number];
  readonly n: [number, number, number];
  /** Per cell, the bounce level (0..1) x 255, x fastest: what the field and the fill texture's green channel read. */
  g: Uint8Array = new Uint8Array(1);
  /** (fix round) Per cell, the static wall bits (`bounceBits`; 0 where no lamp's box reaches): blue + alpha x 256. */
  bits: Uint16Array = new Uint16Array(1);
  /** `sampleInto`'s result (a field, not a return: V8 boxes a returned double). */
  out = 0;
  /** `sampleInto`'s scratch: the 8 corners' bytes, bits and reach. */
  private readonly sv = new Float64Array(8);
  private readonly se = new Int32Array(8);
  private readonly sc = new Uint8Array(8);
  /** Per cell, sum of q x weight over the lit lamps. */
  private acc: Float64Array = new Float64Array(1);
  private boxes: Int32Array = new Int32Array(0);
  private data: Uint16Array = new Uint16Array(0);
  /** Per lamp, where its cells start in `data`. */
  private readonly at: Float64Array;
  /** Registry ids of the baked lamps, in bake order. */
  private readonly ids: Int32Array;
  /** Per lamp, the weight its cells are in `acc` with (0: not lit). */
  private readonly w: Int32Array;
  /** Bumped whenever `g` changed. */
  version = 0;
  /** Cells changed since the last `clearDirty` (the picture's re-pack): x0, y0, z0, x1, y1, z1, the ends exclusive;
   *  empty when x1 <= x0. */
  readonly dirty = new Int32Array(6);
  /** Tests: cells re-quantised by the last `sync` that moved the registry. */
  lastCells = 0;
  /** The registry version last synced (-1: never). */
  private seen = -1;
  /** The bake gave some bounce (else the field skips the read and `g` is one empty cell). */
  active = false;

  constructor(bounce: LampBounce | null | undefined, ids: ArrayLike<number>, grid: { origin: readonly number[]; n: readonly number[] }) {
    this.origin = [grid.origin[0]!, grid.origin[1]!, grid.origin[2]!];
    this.n = [grid.n[0]!, grid.n[1]!, grid.n[2]!];
    const count = bounce ? Math.min(ids.length, bounce.boxes.length / BOUNCE_BOX_STRIDE) : 0;
    this.ids = new Int32Array(count);
    this.w = new Int32Array(count);
    this.at = new Float64Array(count);
    for (let i = 0; i < count; i++) this.ids[i] = ids[i]!;
    this.load(bounce);
  }

  /**
   * The bake's boxes, cells and wall bits (the constructor; `adopt`). (a copy of the boxes: a box that does not fit this
   * grid - a bake over other bounds - is dropped, never written past the grid)
   */
  private load(bounce: LampBounce | null | undefined): void {
    const count = this.ids.length;
    const cells = this.n[0] * this.n[1] * this.n[2];
    this.boxes = bounce ? bounce.boxes.slice(0, count * BOUNCE_BOX_STRIDE) : new Int32Array(0);
    this.data = bounce ? bounce.data : new Uint16Array(0);
    let s = 0;
    for (let i = 0; i < count; i++) {
      this.at[i] = s;
      const o = i * BOUNCE_BOX_STRIDE;
      const B = this.boxes;
      s += B[o + 3]! * B[o + 4]! * B[o + 5]!;
      let fits = true;
      for (let k = 0; k < 3; k++) if (B[o + k]! < 0 || B[o + k]! + B[o + 3 + k]! > this.n[k]!) fits = false;
      if (!fits || s > this.data.length) B[o + 3] = B[o + 4] = B[o + 5] = 0;
    }
    const any = count > 0 && this.data.length > 0;
    if (!any || this.g.length !== cells) {
      this.g = new Uint8Array(any ? cells : 1);
      this.acc = new Float64Array(any ? cells : 1);
      this.bits = new Uint16Array(any ? cells : 1);
    } else this.bits.fill(0);
    this.active = any;
    // (fix round) the walls: static, from every lamp's box (OR: two lamps give a cell the same bits)
    const bits = bounce?.bits;
    if (any && bits && bits.length === this.data.length) {
      const B = this.boxes;
      for (let i = 0; i < count; i++) {
        const o = i * BOUNCE_BOX_STRIDE;
        const nx = B[o + 3]!;
        const ny = B[o + 4]!;
        const nz = B[o + 5]!;
        let s2 = this.at[i]!;
        for (let z = 0; z < nz; z++) {
          for (let y = 0; y < ny; y++) {
            const row = B[o]! + this.n[0] * (B[o + 1]! + y + this.n[1] * (B[o + 2]! + z));
            for (let x = 0; x < nx; x++) this.bits[row + x] = this.bits[row + x]! | bits[s2++]!;
          }
        }
      }
    }
  }

  /**
   * (section-bake) The bake grew (more lamps landed; `SectionBaker` joins every landed lamp's bounce again in light
   * order): read the new boxes, cells and wall bits and add the lamps `fresh[0 .. k)` that landed (their box was empty
   * until now) at their weights; only their boxes are re-quantised and marked dirty. When the grid had no bounce yet
   * (its arrays are made now) or no list is given, every lit lamp is summed again. The sums are exact integers, so the
   * grid equals the one a full bake makes once every lamp is in. Landing time only (one batch), never per frame.
   */
  adopt(bounce: LampBounce, fresh?: ArrayLike<number>, k = 0): void {
    const was = this.active ? this.g : null;
    const empty = new Uint8Array(fresh ? k : 0);
    const B0 = this.boxes;
    for (let j = 0; j < empty.length; j++) {
      const o = fresh![j]! * BOUNCE_BOX_STRIDE;
      empty[j] = o + 5 >= B0.length || B0[o + 3]! * B0[o + 4]! * B0[o + 5]! === 0 ? 1 : 0;
    }
    this.load(bounce);
    if (!this.active) return;
    if (fresh && was === this.g) {
      for (let j = 0; j < k; j++) {
        const i = fresh[j]!;
        // (weight 0 too: its wall bits are new, the box goes to the dirty box)
        if (i >= 0 && i < this.ids.length && empty[j]) this.apply(i, this.w[i]!);
      }
    } else {
      this.acc.fill(0);
      this.g.fill(0);
      for (let i = 0; i < this.ids.length; i++) if (this.w[i]! !== 0) this.apply(i, this.w[i]!);
      const d = this.dirty;
      d[0] = d[1] = d[2] = 0;
      d[3] = this.n[0];
      d[4] = this.n[1];
      d[5] = this.n[2];
    }
    this.version++;
  }

  /** Lamps in the grid. */
  get count(): number {
    return this.ids.length;
  }

  /** Lamp `i`'s weight now (0: its bounce is out). */
  weight(i: number): number {
    return this.w[i]!;
  }

  /**
   * Follow the registry: when its version moved, each lamp whose lit state or intensity changed adds or takes out its
   * box (exact integers) and only that box is re-quantised. One compare when nothing changed. Allocation-free.
   */
  sync(reg: BounceRegistry): void {
    if (reg.version === this.seen) return;
    this.seen = reg.version;
    this.lastCells = 0;
    let changed = false;
    const ls = reg.lights;
    for (let i = 0; i < this.ids.length; i++) {
      const l = ls[this.ids[i]!];
      // (lit as `LightField.lampInto` reads it; (piano SO5b) a lightning opening's flash light gives no bounce: the grid
      // follows `version` only, never the flash)
      const want = l && l.on && !l.destroyed && l.intensity > 0 && !l.flash ?Math.round(l.intensity * BOUNCE_WEIGHT) : 0;
      const had = this.w[i]!;
      if (want === had) continue;
      this.w[i] = want;
      this.apply(i, want - had);
      changed = true;
    }
    if (changed) this.version++;
  }

  /**
   * (fix round) The bounce at a point (0..1) into `out`, never blended across a wall: the home cell (the one holding the
   * point, or its neighbour when a wall inside the cell parts the point from the centre), then the trilinear weights of
   * the 8 corners the home reaches through open faces, renormalised. Clamped to the grid as the trilinear read was. The
   * shader's `nsGrid2` is this, step for step (`tests/bounceGrid.test.ts`). Allocation-free.
   */
  sampleInto(x: number, y: number, z: number): void {
    const q = this.q;
    q[0] = x;
    q[1] = y;
    q[2] = z;
    this.sampleQ();
  }

  /** (F57) The point `sampleQ` reads: x, y, z. `LightField` writes it and calls `sampleQ`, so no double crosses the
   *  call (passed as arguments to this out-of-line read they boxed 3 HeapNumbers a light-field query: 1296 B a
   *  3-player cue fill, 128 B a 3-player meter tick). */
  readonly q = new Float64Array(3);

  /** `sampleInto` at the point in `q`, into `out`. */
  sampleQ(): void {
    const x = this.q[0]!;
    const y = this.q[1]!;
    const z = this.q[2]!;
    const nx = this.n[0];
    const ny = this.n[1];
    const nz = this.n[2];
    let u = (x - this.origin[0]) / AMBIENT_CELL - 0.5;
    let w = (y - this.origin[1]) / AMBIENT_CELL - 0.5;
    let s = (z - this.origin[2]) / AMBIENT_CELL - 0.5;
    u = u < 0 ? 0 : u > nx - 1 ? nx - 1 : u;
    w = w < 0 ? 0 : w > ny - 1 ? ny - 1 : w;
    s = s < 0 ? 0 : s > nz - 1 ? nz - 1 : s;
    const x0 = Math.floor(u);
    const y0 = Math.floor(w);
    const z0 = Math.floor(s);
    const x1 = x0 + 1 < nx ? x0 + 1 : x0;
    const y1 = y0 + 1 < ny ? y0 + 1 : y0;
    const z1 = z0 + 1 < nz ? z0 + 1 : z0;
    const fx = u - x0;
    const fy = w - y0;
    const fz = s - z0;
    const V = this.sv;
    const E = this.se;
    const C = this.sc;
    let lit = 0;
    let walls = 0;
    for (let k = 0; k < 8; k++) {
      const i = ((k & 1) !== 0 ? x1 : x0) + nx * (((k & 2) !== 0 ? y1 : y0) + ny * ((k & 4) !== 0 ? z1 : z0));
      V[k] = this.g[i]!;
      E[k] = this.bits[i]!;
      lit |= V[k]!;
      walls |= E[k]!;
    }
    if (lit === 0) {
      this.out = 0;
      return;
    }
    // the home corner: the cell holding the point (the nearer centre), crossed to the neighbour on the point's side when
    // the point is past a wall inside the cell (its code x BOUNCE_T_STEP from the centre or more: lampBounce.ts)
    const hx = fx >= 0.5 ? 1 : 0;
    const hy = fy >= 0.5 ? 1 : 0;
    const hz = fz >= 0.5 ? 1 : 0;
    let h = hx + hy * 2 + hz * 4;
    const eh = E[h]!;
    const tx = (eh >> BOUNCE_T_SHIFT[hx]!) & 3;
    const ty = (eh >> BOUNCE_T_SHIFT[2 + hy]!) & 3;
    const tz = (eh >> BOUNCE_T_SHIFT[4 + hz]!) & 3;
    if (tx > 0 && (hx === 1 ? 1 - fx : fx) >= tx * BOUNCE_T_STEP) h ^= 1;
    if (ty > 0 && (hy === 1 ? 1 - fy : fy) >= ty * BOUNCE_T_STEP) h ^= 2;
    if (tz > 0 && (hz === 1 ? 1 - fz : fz) >= tz * BOUNCE_T_STEP) h ^= 4;
    // the corners the home reaches through open faces (edge bit a of the lower corner: the face to its +a neighbour)
    const open = (walls & 7) === 0 ? 1 : 0;
    for (let k = 0; k < 8; k++) C[k] = k === h || open === 1 ? 1 : 0;
    for (let r = 0; r < 7 && open === 0; r++) {
      let grew = 0;
      for (let k = 0; k < 8; k++) {
        for (let a = 1; a < 8; a <<= 1) {
          if ((k & a) !== 0 || (E[k]! & a) !== 0) continue;
          const k2 = k | a;
          if (C[k] !== C[k2]) {
            C[k] = 1;
            C[k2] = 1;
            grew = 1;
          }
        }
      }
      if (grew === 0) break;
    }
    let sw = 0;
    let sv = 0;
    for (let k = 0; k < 8; k++) {
      if (C[k] === 0) continue;
      const wk = ((k & 1) !== 0 ? fx : 1 - fx) * ((k & 2) !== 0 ? fy : 1 - fy) * ((k & 4) !== 0 ? fz : 1 - fz);
      sw += wk;
      sv += wk * V[k]!;
    }
    this.out = (sw > 0 ? sv / sw : V[h]!) / 255;
  }

  /** The picture re-packed the dirty box. */
  clearDirty(): void {
    this.dirty[0] = this.dirty[1] = this.dirty[2] = 0;
    this.dirty[3] = this.dirty[4] = this.dirty[5] = 0;
  }

  /** Add lamp `i`'s cells x `delta` and re-quantise its box. */
  private apply(i: number, delta: number): void {
    const o = i * BOUNCE_BOX_STRIDE;
    const B = this.boxes;
    const bx = B[o]!;
    const by = B[o + 1]!;
    const bz = B[o + 2]!;
    const nx = B[o + 3]!;
    const ny = B[o + 4]!;
    const nz = B[o + 5]!;
    if (nx <= 0 || ny <= 0 || nz <= 0) return;
    const gx = this.n[0];
    const gy = this.n[1];
    const acc = this.acc;
    const g = this.g;
    const D = this.data;
    const k = (BOUNCE.q / BOUNCE_WEIGHT) * LAMP_LEVEL_GAIN;
    let s = this.at[i]!;
    for (let z = 0; z < nz; z++) {
      for (let y = 0; y < ny; y++) {
        const row = bx + gx * (by + y + gy * (bz + z));
        for (let x = 0; x < nx; x++) {
          const c = row + x;
          const a = acc[c]! + D[s++]! * delta;
          acc[c] = a;
          const v = a * k;
          g[c] = Math.round((v < 1 ? v : 1) * 255);
        }
      }
    }
    this.lastCells += nx * ny * nz;
    // the dirty box grows to hold this one
    const d = this.dirty;
    if (d[3]! <= d[0]!) {
      d[0] = bx;
      d[1] = by;
      d[2] = bz;
      d[3] = bx + nx;
      d[4] = by + ny;
      d[5] = bz + nz;
      return;
    }
    if (bx < d[0]!) d[0] = bx;
    if (by < d[1]!) d[1] = by;
    if (bz < d[2]!) d[2] = bz;
    if (bx + nx > d[3]!) d[3] = bx + nx;
    if (by + ny > d[4]!) d[4] = by + ny;
    if (bz + nz > d[5]!) d[5] = bz + nz;
  }
}

/**
 * (LR16-1, the picture) The fill texture's texels, RGBA8: R the ambient grid (unchanged), G the bounce `g`, B and A the
 * wall bits (fix round: low byte, high byte), over the box x0..x1 (ends exclusive; null: every cell). Same cells, same
 * order: the shader's `nsGrid2` reads R with one linear tap and G, B, A with 8 texel fetches.
 */
export function packFillRGBA(amb: Uint8Array, g: Uint8Array | null, bits: Uint16Array | null, out: Uint8Array, n: readonly number[], box: ArrayLike<number> | null = null): void {
  const nx = n[0]!;
  const ny = n[1]!;
  const nz = n[2]!;
  const x0 = box ? box[0]! : 0;
  const y0 = box ? box[1]! : 0;
  const z0 = box ? box[2]! : 0;
  const x1 = box ? box[3]! : nx;
  const y1 = box ? box[4]! : ny;
  const z1 = box ? box[5]! : nz;
  const hasG = !!g && g.length === nx * ny * nz;
  const hasB = !!bits && bits.length === nx * ny * nz;
  for (let z = z0; z < z1; z++) {
    for (let y = y0; y < y1; y++) {
      const row = nx * (y + ny * z);
      for (let x = x0; x < x1; x++) {
        const c = row + x;
        const e = hasB ? bits[c]! : 0;
        out[c * 4] = amb[c]!;
        out[c * 4 + 1] = hasG ? g[c]! : 0;
        out[c * 4 + 2] = e & 255;
        out[c * 4 + 3] = e >> 8;
      }
    }
  }
}

/**
 * (LR16-1) The bounce's colour: the baked lamps' colours averaged by intensity, normalised to a brightest channel of 1
 * (fix round: the level is the brightest channel, `nsS`), so the picture's bounce has the map's lamp tint at the level the
 * field reads, no channel over it. White without lamps.
 */
export function bounceColor(lights: readonly { color: readonly number[]; intensity: number }[]): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  let w = 0;
  for (const l of lights) {
    const k = Math.max(0, l.intensity);
    r += l.color[0]! * k;
    g += l.color[1]! * k;
    b += l.color[2]! * k;
    w += k;
  }
  if (w <= 0) return [1, 1, 1];
  const y = Math.max(r, g, b) / w;
  return y > 1e-6 ? [r / w / y, g / w / y, b / w / y] : [1, 1, 1];
}
