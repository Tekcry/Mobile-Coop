/**
 * (LR16-1) The one-bounce fill at runtime (pure, gameplay-owned; the picture reads the same bytes). The bake
 * (`voxel/lampBounce.ts`) gives each fixed lamp a box of 1 m cells on the ambient grid and its bounce per unit
 * intensity in `BOUNCE.q` steps; this sums the lit lamps' boxes:
 *
 *   acc = sum over lit lamps of q x round(intensity x 1024)   (integers, exact in a Float64Array)
 *   g   = round(min(1, acc x BOUNCE.q / 1024 x LAMP_LEVEL_GAIN) x 255)
 *
 * A lamp switched off, shot, jammed dark or EMP'd takes its bounce with it at the next `sync` (the registry's version
 * moved), and back on returns the very same bytes. `LightField.levelInto` adds `g` read trilinearly beside the ambient
 * fill (the meter and the guards); `BakedLamps` packs `g` into the fill texture's green channel (the picture).
 * Allocation-free after construction.
 */
import { BOUNCE, BOUNCE_BOX_STRIDE, type LampBounce } from '../voxel/lampBounce';
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
  readonly g: Uint8Array;
  /** Per cell, sum of q x weight over the lit lamps. */
  private readonly acc: Float64Array;
  private readonly boxes: Int32Array;
  private readonly data: Uint16Array;
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
  readonly active: boolean;

  constructor(bounce: LampBounce | null | undefined, ids: ArrayLike<number>, grid: { origin: readonly number[]; n: readonly number[] }) {
    this.origin = [grid.origin[0]!, grid.origin[1]!, grid.origin[2]!];
    this.n = [grid.n[0]!, grid.n[1]!, grid.n[2]!];
    const cells = this.n[0] * this.n[1] * this.n[2];
    const count = bounce ? Math.min(ids.length, bounce.boxes.length / BOUNCE_BOX_STRIDE) : 0;
    // (a copy: a box that does not fit this grid - a bake over other bounds - is dropped, never written past the grid)
    this.boxes = bounce ? bounce.boxes.slice(0, count * BOUNCE_BOX_STRIDE) : new Int32Array(0);
    this.data = bounce ? bounce.data : new Uint16Array(0);
    this.ids = new Int32Array(count);
    this.w = new Int32Array(count);
    this.at = new Float64Array(count);
    let s = 0;
    for (let i = 0; i < count; i++) {
      this.ids[i] = ids[i]!;
      this.at[i] = s;
      const o = i * BOUNCE_BOX_STRIDE;
      const B = this.boxes;
      s += B[o + 3]! * B[o + 4]! * B[o + 5]!;
      let fits = true;
      for (let k = 0; k < 3; k++) if (B[o + k]! < 0 || B[o + k]! + B[o + 3 + k]! > this.n[k]!) fits = false;
      if (!fits || s > this.data.length) B[o + 3] = B[o + 4] = B[o + 5] = 0;
    }
    const any = count > 0 && this.data.length > 0;
    this.g = new Uint8Array(any ? cells : 1);
    this.acc = new Float64Array(any ? cells : 1);
    this.active = any;
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
      // (lit as `LightField.lampInto` reads it)
      const want = l && l.on && !l.destroyed && l.intensity > 0 ? Math.round(l.intensity * BOUNCE_WEIGHT) : 0;
      const had = this.w[i]!;
      if (want === had) continue;
      this.w[i] = want;
      this.apply(i, want - had);
      changed = true;
    }
    if (changed) this.version++;
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
 * (LR16-1, the picture) The fill texture's texels, RG8: R the ambient grid (unchanged), G the bounce `g`, over the box
 * x0..x1 (ends exclusive; null: every cell). Same cells, same order: the shader's `nsGrid2` reads both with one tap.
 */
export function packFillRG(amb: Uint8Array, g: Uint8Array | null, out: Uint8Array, n: readonly number[], box: ArrayLike<number> | null = null): void {
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
  for (let z = z0; z < z1; z++) {
    for (let y = y0; y < y1; y++) {
      const row = nx * (y + ny * z);
      for (let x = x0; x < x1; x++) {
        const c = row + x;
        out[c * 2] = amb[c]!;
        out[c * 2 + 1] = hasG ? g[c]! : 0;
      }
    }
  }
}

/**
 * (LR16-1) The bounce's colour: the baked lamps' colours averaged by intensity, luminance-normalised (Rec. 709), so the
 * picture's bounce has the map's lamp tint at the level the field reads. White without lamps.
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
  const y = (0.2126 * r + 0.7152 * g + 0.0722 * b) / w;
  return y > 1e-6 ? [r / w / y, g / w / y, b / w / y] : [1, 1, 1];
}
