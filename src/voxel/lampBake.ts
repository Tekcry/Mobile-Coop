/**
 * Baked lamp visibility (3.2, pure; runs in the voxel workers). For every fixed light, how much of its fixture each
 * `LAMP_CELL` cell of its reach can see through the level (0 hidden .. 1 in full view). `LampPlugin` multiplies each
 * lamp's light by it: every lamp shades and shadows correctly - walls, racks, crates, doorways - for one 3D texture
 * tap per lamp per pixel, with no shadow maps and nothing per frame; switching or shooting a lamp only changes its
 * intensity. Strip lamps sample along their fixture (an area light: soft along the strip, sharper across it).
 *
 * Occupancy is conservative (every filling shape grown by half a cell, carves shrunk by it): thin shelves and roof
 * sheets always block and light never leaks through a wall; shadows sit up to half a cell (10 cm) larger. Solid cells
 * take the brightest air cell beside them, so a lookup just inside a lit surface stays lit.
 */
import { rasterise, SHAPE_STRIDE, ShapeKind, ShapeMode, shapeBounds } from './shapes';
import { BOUNCE_BOX_STRIDE, bounceLamp, type LampBounce } from './lampBounce';

/** Bake cell (m). One size on every device: what is lit looks the same everywhere. */
export const LAMP_CELL = 0.2;
/** Per light: x, y, z, radius, cone dx, dy, dz, cos outer (-2: a downward lamp, nothing above it), fixture sx, sz. */
export const LAMP_STRIDE = 10;
/** Per light in the result: box origin x, y, z, cells nx, ny, nz. */
export const BOX_STRIDE = 6;
/** Sample points along a fixture: one per this many metres (1 .. `MAX_SAMPLES`). */
const SAMPLE_SPACING = 0.5;
const MAX_SAMPLES = 6;
/** The march stops this short of the light (the fixture's own housing and mount). */
const NEAR_LIGHT = 0.25;

/**
 * (LR16e) Contact-hardening penumbra, baked into the visibility byte (bake-time PCSS): an area light's shadow edge is
 * `s x receiver-occluder / occluder-light` wide, so it stays sharp where the occluder touches the receiver and widens
 * with the gap. Per lamp, the cells near a visibility edge average the occluder distance of the blocked cells around
 * them, then filter the visibility with a tent of that width (walls stop the filter both ways). The atlas, the shaders
 * and the light field are unchanged and read the same bytes: the meter equals the picture by construction.
 * - `bulb`: the smallest fixture (m; a bare bulb or small downlight).
 * - `maxWidth` / `minWidth`: the widest / narrowest penumbra written (m); the tent's half-width in cells is width / cell
 *   (`maxWidth`: 3 cells, 7 taps; `minWidth`: half a cell, a single tap: contact stays as sharp as the grid).
 * - `search`: the blocker search radius and the most taps each side (cells, = maxWidth / LAMP_CELL).
 * - `nearOcc`: the smallest occluder-to-light distance used (m, = the march's stop short of the light).
 */
export const PENUMBRA = {
  bulb: 0.08,
  maxWidth: 0.6,
  minWidth: 0.1,
  search: 3,
  nearOcc: NEAR_LIGHT,
} as const;

export interface LampJob {
  kind: 'lamps';
  id: number;
  /** Packed shapes (`SHAPE_STRIDE`) of every rendered layer, in order (later shapes win). */
  shapes: Float32Array;
  lights: Float32Array;
  /** The map's bounds (boxes are clipped to them). */
  lo: [number, number, number];
  hi: [number, number, number];
}

export interface LampResult {
  kind: 'lamps';
  id: number;
  /** `BOX_STRIDE` per light. */
  boxes: Float32Array;
  /** Every light's cells (x fastest), one after another in light order: visibility x 255. */
  vis: Uint8Array;
  /** (LR16-1) Every light's one-bounce fill (`lampBounce.ts`), in light order. Absent only on hand-made test results. */
  bounce?: LampBounce;
  /** (LR16-1) Bake time of this job's visibility and of its bounce (ms; the bake-time check logs both). */
  ms?: { vis: number; bounce: number };
}

/**
 * A light's box: its reach, clipped to the map; a downward lamp stops a cell above itself. (LR16-L) The box's cell
 * planes run through the light point on all three axes (`alignedFrom`): a lamp hung up to a cell under its mount (a
 * ceiling, a shelf) then sits on a cell boundary under the mount's solid row, so rays from below never cross that row.
 * On a grid started at the map's `lo` the row could hold the lamp itself (5 cm under a 3.0 m slab: 0.15 m deep in the
 * slab's grown row), and every ray rising less than that over the march's last `NEAR_LIGHT` was blocked: upper walls lost
 * the lamp in front of them in hard 0.2 m teeth (walk 4.82 item 8). The meter, the guards and the picture read this box.
 */
export function lampBox(L: Float32Array, i: number, lo: readonly number[], hi: readonly number[], out: number[] = [0, 0, 0, 0, 0, 0]): number[] {
  const o = i * LAMP_STRIDE;
  const x = L[o]!;
  const y = L[o + 1]!;
  const z = L[o + 2]!;
  const r = L[o + 3]!;
  const c = LAMP_CELL;
  const down = L[o + 7]! < -1.5;
  const x0 = alignedFrom(x, Math.max(lo[0]!, x - r), c);
  const y0 = alignedFrom(y, Math.max(lo[1]!, y - r), c);
  const z0 = alignedFrom(z, Math.max(lo[2]!, z - r), c);
  const x1 = Math.min(hi[0]!, x + r);
  const y1 = Math.min(hi[1]!, down ? y + c : y + r);
  const z1 = Math.min(hi[2]!, z + r);
  out[0] = x0;
  out[1] = y0;
  out[2] = z0;
  // (the 1e-6: an aligned end such as the downward lamp's y + c lands on a whole count; rounding must not add a row)
  out[3] = Math.max(1, Math.ceil((x1 - x0) / c - 1e-6));
  out[4] = Math.max(1, Math.ceil((y1 - y0) / c - 1e-6));
  out[5] = Math.max(1, Math.ceil((z1 - z0) / c - 1e-6));
  return out;
}

/**
 * (LR16-L) The first cell plane through the light point `l` at or past `from` (`from <= origin < from + c`): the box
 * stays inside the old clip; the strip `[from, origin)` it drops is under a cell at the reach's end (falloff ~0) or at
 * the map's outer bound, where lookups clamp to the edge cell as before.
 */
function alignedFrom(l: number, from: number, c: number): number {
  return l - c * Math.floor((l - from) / c + 1e-9);
}

/** The fixture's sample points (x, y, z triples): along its longer horizontal side, a point for a bulb. */
export function lampSamples(L: Float32Array, i: number): Float32Array {
  const o = i * LAMP_STRIDE;
  const sx = L[o + 8]!;
  const sz = L[o + 9]!;
  const long = Math.max(sx, sz);
  const n = Math.max(1, Math.min(MAX_SAMPLES, Math.round(long / SAMPLE_SPACING)));
  const out = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    // (inset from the ends: the light leaves the tube, not its caps)
    const t = n === 1 ? 0 : ((k + 0.5) / n - 0.5) * long;
    out[k * 3] = L[o]! + (sx >= sz ? t : 0);
    out[k * 3 + 1] = L[o + 1]!;
    out[k * 3 + 2] = L[o + 2]! + (sx >= sz ? 0 : t);
  }
  return out;
}

/** Shapes grown (fills) / shrunk (carves) by `pad`, programs and paints dropped: conservative occupancy. */
export function occupancyShapes(sh: Float32Array, pad: number): Float32Array {
  const n = sh.length / SHAPE_STRIDE;
  const out = new Float32Array(sh.length);
  let k = 0;
  for (let i = 0; i < n; i++) {
    const o = i * SHAPE_STRIDE;
    const mode = sh[o + 1]!;
    if (mode === ShapeMode.Paint) continue;
    const d = k * SHAPE_STRIDE;
    out.set(sh.subarray(o, o + SHAPE_STRIDE), d);
    const g = mode === ShapeMode.Carve ? -pad : pad;
    out[d + 2] = 1;
    out[d + 11] = 0;
    if (sh[o] === ShapeKind.Cylinder) {
      out[d + 6] = Math.max(0, sh[o + 6]! + g);
      out[d + 7] = Math.max(0, sh[o + 7]! + g);
    } else {
      out[d + 6] = Math.max(0, sh[o + 6]! + g);
      out[d + 7] = Math.max(0, sh[o + 7]! + g);
      out[d + 8] = Math.max(0, sh[o + 8]! + g);
    }
    k++;
  }
  return out.slice(0, k * SHAPE_STRIDE);
}

/** Bake every light in the job. `penumbra` false: the LR16b bake, without the LR16e penumbra pass (tests compare).
 *  `pen`: the penumbra scratch to use (tests read its size; default a new one per bake). */
export function bakeLamps(job: LampJob, penumbra = true, pen?: PenumbraBuffers): LampResult {
  const L = job.lights;
  const count = L.length / LAMP_STRIDE;
  const c = LAMP_CELL;
  const occShapes = occupancyShapes(job.shapes, c * 0.5);
  const ns = occShapes.length / SHAPE_STRIDE;
  const sb: number[][] = [];
  for (let i = 0; i < ns; i++) sb.push(shapeBounds(occShapes, i));
  const boxes = new Float32Array(count * BOX_STRIDE);
  const parts: Uint8Array[] = [];
  let total = 0;
  const bx = [0, 0, 0, 0, 0, 0];
  const pb = penumbra ? (pen ?? new PenumbraBuffers()) : null;
  // (LR16-1) each light's one-bounce fill, from its own visibility (LR16e's filtered bytes: the penumbra pass runs in
  // bakeOne, so the bounce weights each patch by the direct light the picture shows)
  const bBoxes = new Int32Array(count * BOUNCE_BOX_STRIDE);
  const bParts: Uint16Array[] = [];
  const bitParts: Uint16Array[] = [];
  let bTotal = 0;
  let msVis = 0;
  let msBounce = 0;
  for (let li = 0; li < count; li++) {
    lampBox(L, li, job.lo, job.hi, bx);
    boxes.set(bx, li * BOX_STRIDE);
    const t0 = performance.now();
    const vis = bakeOne(L, li, bx, occShapes, sb, pb);
    const t1 = performance.now();
    parts.push(vis);
    total += vis.length;
    const b = bounceLamp(L, li * LAMP_STRIDE, bx, c, vis, occShapes, sb, job.lo, job.hi);
    msVis += t1 - t0;
    msBounce += performance.now() - t1;
    bBoxes.set(b.box, li * BOUNCE_BOX_STRIDE);
    bParts.push(b.data);
    bitParts.push(b.bits);
    bTotal += b.data.length;
  }
  const vis = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    vis.set(p, at);
    at += p.length;
  }
  const bData = new Uint16Array(bTotal);
  const bBits = new Uint16Array(bTotal);
  at = 0;
  for (let i = 0; i < bParts.length; i++) {
    bData.set(bParts[i]!, at);
    bBits.set(bitParts[i]!, at);
    at += bParts[i]!.length;
  }
  return { kind: 'lamps', id: job.id, boxes, vis, bounce: { boxes: bBoxes, data: bData, bits: bBits }, ms: { vis: msVis, bounce: msBounce } };
}

/** `bakeOne`'s occupancy values: `occupancyShapes` rasterise to material 1 (no programs) and carves to 0; the
 *  visibility loop marks the air cells out of the lamp's reach `FAR`. */
const SOLID = 1;
const FAR = 2;

function bakeOne(L: Float32Array, li: number, box: number[], occShapes: Float32Array, sb: number[][], pen: PenumbraBuffers | null): Uint8Array {
  const c = LAMP_CELL;
  const ox = box[0]!;
  const oy = box[1]!;
  const oz = box[2]!;
  const nx = box[3]!;
  const ny = box[4]!;
  const nz = box[5]!;
  // occupancy: the shapes touching the box (in order)
  const pick: number[] = [];
  const ex = ox + nx * c;
  const ey = oy + ny * c;
  const ez = oz + nz * c;
  for (let i = 0; i < sb.length; i++) {
    const b = sb[i]!;
    if (b[3]! < ox || b[0]! > ex || b[4]! < oy || b[1]! > ey || b[5]! < oz || b[2]! > ez) continue;
    pick.push(i);
  }
  const cells = nx * ny * nz;
  const occ = new Uint8Array(cells);
  rasterise(occShapes, occ, [ox, oy, oz], c, nx, ny, nz, pick);
  const o = li * LAMP_STRIDE;
  const lx = L[o]!;
  const ly = L[o + 1]!;
  const lz = L[o + 2]!;
  const r = L[o + 3]!;
  const S = lampSamples(L, li);
  const ns = S.length / 3;
  const vis = new Uint8Array(cells);
  const step = c * 0.5;
  const inv = 1 / c;
  // one sample: the march distance from the cell centre (px, py, pz) towards sample k to the first occupied cell; -1 clear
  const clear = (px: number, py: number, pz: number, k: number): number => {
    let dx = S[k * 3]! - px;
    let dy = S[k * 3 + 1]! - py;
    let dz = S[k * 3 + 2]! - pz;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < 1e-4) return -1;
    dx /= d;
    dy /= d;
    dz /= d;
    const end = d - NEAR_LIGHT;
    let lastX = -1;
    let lastY = -1;
    let lastZ = -1;
    for (let t = c * 0.75; t < end; t += step) {
      const qx = Math.floor((px + dx * t - ox) * inv);
      const qy = Math.floor((py + dy * t - oy) * inv);
      const qz = Math.floor((pz + dz * t - oz) * inv);
      if (qx === lastX && qy === lastY && qz === lastZ) continue;
      lastX = qx;
      lastY = qy;
      lastZ = qz;
      // (outside the box: nothing there to block)
      if (qx < 0 || qy < 0 || qz < 0 || qx >= nx || qy >= ny || qz >= nz) continue;
      if (occ[qx + nx * (qy + ny * qz)] === SOLID) return t;
    }
    return -1;
  };
  // (LR16e) per air cell in reach: dol = the light-to-occluder distance, its distance to the light less the mean march
  // distance to the occluder over its blocked samples (-1 when no sample was blocked). (LR16-POLISH C) An air cell out of
  // reach is marked `FAR` in `occ`, so the cells in reach (the penumbra pass's live cells) are the ones left at 0.
  pen?.take(cells);
  const dol = pen ? pen.dol : null;
  let hits = 0;
  let hitSum = 0;
  const seenBy = (t: number): boolean => {
    if (t < 0) return true;
    hits++;
    hitSum += t;
    return false;
  };
  const r2 = (r + c) * (r + c);
  for (let z = 0; z < nz; z++) {
    const pz = oz + (z + 0.5) * c;
    for (let y = 0; y < ny; y++) {
      const py = oy + (y + 0.5) * c;
      for (let x = 0; x < nx; x++) {
        const i = x + nx * (y + ny * z);
        if (occ[i]) continue;
        const px = ox + (x + 0.5) * c;
        const ddx = px - lx;
        const ddy = py - ly;
        const ddz = pz - lz;
        if (ddx * ddx + ddy * ddy + ddz * ddz > r2) {
          occ[i] = FAR;
          continue;
        }
        hits = 0;
        hitSum = 0;
        let seen = 0;
        if (ns <= 3) {
          for (let k = 0; k < ns; k++) if (seenBy(clear(px, py, pz, k))) seen++;
        } else {
          // the ends and the middle first: when they agree the cell is in full view or fully hidden
          const a = seenBy(clear(px, py, pz, 0));
          const b = seenBy(clear(px, py, pz, ns - 1));
          const m = seenBy(clear(px, py, pz, ns >> 1));
          if (a === b && b === m) seen = a ? ns : 0;
          else {
            seen = (a ? 1 : 0) + (b ? 1 : 0) + (m ? 1 : 0);
            for (let k = 1; k < ns - 1; k++) if (k !== ns >> 1 && seenBy(clear(px, py, pz, k))) seen++;
          }
        }
        vis[i] = Math.round((seen / ns) * 255);
        if (dol) dol[i] = hits > 0 ? Math.max(0, Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz) - hitSum / hits) : -1;
      }
    }
  }
  if (pen) penumbraPass(vis, occ, pen, box, lx, ly, lz, fixtureSize(L, li, ns));
  // solid cells: the brightest air cell beside them (a lookup just inside a lit face stays lit)
  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const i = x + nx * (y + ny * z);
        if (occ[i] !== SOLID) continue;
        let v = 0;
        if (x > 0 && occ[i - 1] !== SOLID) v = Math.max(v, vis[i - 1]!);
        if (x < nx - 1 && occ[i + 1] !== SOLID) v = Math.max(v, vis[i + 1]!);
        if (y > 0 && occ[i - nx] !== SOLID) v = Math.max(v, vis[i - nx]!);
        if (y < ny - 1 && occ[i + nx] !== SOLID) v = Math.max(v, vis[i + nx]!);
        if (z > 0 && occ[i - nx * ny] !== SOLID) v = Math.max(v, vis[i - nx * ny]!);
        if (z < nz - 1 && occ[i + nx * ny] !== SOLID) v = Math.max(v, vis[i + nx * ny]!);
        vis[i] = v;
      }
    }
  }
  return vis;
}

/** (LR16e) The fixture size that widens the penumbra (m): a strip already samples its long axis, so only its short side. */
export function fixtureSize(L: ArrayLike<number>, i: number, ns: number): number {
  const sx = L[i * LAMP_STRIDE + 8]!;
  const sz = L[i * LAMP_STRIDE + 9]!;
  return Math.max(PENUMBRA.bulb, ns > 1 ? Math.min(sx, sz) : Math.max(sx, sz));
}

/** (LR16e) Penumbra width (m) of a fixture of size `s` at a receiver `dRL` from the light whose occluders are `dOL` from
 *  it: s x receiver-occluder / occluder-light, clamped to [`minWidth`, `maxWidth`]. */
export function penumbraWidth(s: number, dRL: number, dOL: number): number {
  const w = (s * Math.max(0, dRL - dOL)) / Math.max(dOL, PENUMBRA.nearOcc);
  return w < PENUMBRA.minWidth ? PENUMBRA.minWidth : w > PENUMBRA.maxWidth ? PENUMBRA.maxWidth : w;
}

/** Cumulative tent of half-width h at x. */
function tentCdf(h: number, x: number): number {
  if (x <= -h) return 0;
  if (x >= h) return 1;
  const u = x <= 0 ? x + h : h - x;
  const a = (u * u) / (2 * h * h);
  return x <= 0 ? a : 1 - a;
}

/** (LR16e) Weight of the cell `j` cells off for a tent of half-width `h` cells, integrated over the cell (the last tap fractional). */
export function tentWeight(h: number, j: number): number {
  return tentCdf(h, j + 0.5) - tentCdf(h, j - 0.5);
}

/** Sliding sums of radius `R` across `n` slices of `w` consecutive values: slice q of `src` at `sBase + q x step` ->
 *  slice q of `dst` at `dBase + q x step`. `acc`: w scratch. */
function slideSlices(src: Float32Array, dst: Float32Array, acc: Float64Array, sBase: number, dBase: number, step: number, w: number, n: number, R: number): void {
  acc.fill(0, 0, w);
  for (let q = 0; q <= R && q < n; q++) for (let j = 0, o = sBase + q * step; j < w; j++) acc[j] = acc[j]! + src[o + j]!;
  for (let q = 0; q < n; q++) {
    const o = dBase + q * step;
    const ad = q + R + 1 < n ? sBase + (q + R + 1) * step : -1;
    const rm = q - R >= 0 ? sBase + (q - R) * step : -1;
    if (ad >= 0 && rm >= 0) {
      for (let j = 0; j < w; j++) {
        dst[o + j] = acc[j]!;
        acc[j] = acc[j]! + src[ad + j]! - src[rm + j]!;
      }
    } else if (ad >= 0) {
      for (let j = 0; j < w; j++) {
        dst[o + j] = acc[j]!;
        acc[j] = acc[j]! + src[ad + j]!;
      }
    } else if (rm >= 0) {
      for (let j = 0; j < w; j++) {
        dst[o + j] = acc[j]!;
        acc[j] = acc[j]! - src[rm + j]!;
      }
    } else {
      for (let j = 0; j < w; j++) dst[o + j] = acc[j]!;
    }
  }
}

/** Sums over the (2R + 1)^2 square about every cell of one nx x ny plane: x (`src` -> `xs`), then y (`xs` -> `dst` from
 *  `dBase`). `accY`: nx scratch. */
function sumXY(src: Float32Array, xs: Float32Array, dst: Float32Array, accY: Float64Array, dBase: number, nx: number, ny: number, R: number): void {
  for (let row = 0; row < ny; row++) {
    const base = row * nx;
    let s = 0;
    for (let q = 0; q <= R && q < nx; q++) s += src[base + q]!;
    for (let q = 0; q < nx; q++) {
      xs[base + q] = s;
      if (q + R + 1 < nx) s += src[base + q + R + 1]!;
      if (q - R >= 0) s -= src[base + q - R]!;
    }
  }
  slideSlices(xs, dst, accY, 0, dBase, nx, nx, ny, R);
}
/** Packed counts: edge cells x `EDGE` + blocked cells (each at most (2 x 3 + 1)^3 = 343: exact in a float). */
const EDGE = 1024;
/** Planes of x-y sums the streamed z sum keeps: plane p is added at plane p - R - 1 and taken off at p + R. */
const SUM_RING = 2 * PENUMBRA.search + 2;
/** Planes of x-y filtered values the z filter reads: plane q - R .. q + R. */
const XY_RING = 2 * PENUMBRA.search + 1;
/** Planes of band widths kept: plane q's, found R planes before its z filter runs. */
const H_RING = PENUMBRA.search + 1;

/**
 * (LR16e; LR16-POLISH C) The penumbra pass's scratch, grown to the largest lamp of a bake and reused (one allocation per
 * bake, not per lamp). It was a byte and five floats per cell of the box, 21 B (campusOps' largest lamp, 3.35 M cells:
 * 70 MB in each of the 12-16 workers of the first campus load). Now only the blocker distance is kept per cell (4 B);
 * everything else streams along z in rings of planes: the box sums (`SUM_RING` planes of x-y sums), the band's widths
 * (`H_RING`) and the filter (x and y run inside a plane, z over `XY_RING` x-y filtered planes). The arithmetic is the old
 * one step for step (the same Float32 stores and Float64 sums, in the same order), so the baked bytes are identical
 * (`lampBake.test.ts` hashes them).
 */
export class PenumbraBuffers {
  private raw = new Float32Array(0);
  private plane = 0;
  private row = 0;
  /** Per cell: the light-to-occluder distance (-1: none blocked). */
  dol = new Float32Array(0);
  // per plane: the packed counts and blocker distances, the x sums, the x-y sum rings, the z sums and their Float32 copies
  inC = new Float32Array(0);
  inB = new Float32Array(0);
  xs = new Float32Array(0);
  ringC = new Float32Array(0);
  ringB = new Float32Array(0);
  accC = new Float64Array(0);
  accB = new Float64Array(0);
  outC = new Float32Array(0);
  outB = new Float32Array(0);
  accY = new Float64Array(0);
  // the band's tent half-widths (cells; -1 off the band), the x pass's weighted sums and weights, the x-y filtered rings
  hRing = new Float64Array(0);
  numX = new Float32Array(0);
  denX = new Float32Array(0);
  numXY = new Float32Array(0);
  denXY = new Float32Array(0);
  /** One cell's tap weights. */
  readonly w = new Float64Array(PENUMBRA.search + 1);
  /** The most band cells of a lamp so far. */
  peakBand = 0;

  /** Size the per-cell buffer for a lamp of `cells`. */
  take(cells: number): void {
    if (cells > this.raw.length) this.raw = new Float32Array(cells);
    this.dol = this.raw.subarray(0, cells);
  }

  /** Size the plane buffers for planes of `plane` cells and rows of `row`. */
  planes(plane: number, row: number): void {
    if (plane > this.plane) {
      this.plane = plane;
      this.inC = new Float32Array(plane);
      this.inB = new Float32Array(plane);
      this.xs = new Float32Array(plane);
      this.ringC = new Float32Array(plane * SUM_RING);
      this.ringB = new Float32Array(plane * SUM_RING);
      this.accC = new Float64Array(plane);
      this.accB = new Float64Array(plane);
      this.outC = new Float32Array(plane);
      this.outB = new Float32Array(plane);
      this.hRing = new Float64Array(plane * H_RING);
      this.numX = new Float32Array(plane);
      this.denX = new Float32Array(plane);
      this.numXY = new Float32Array(plane * XY_RING);
      this.denXY = new Float32Array(plane * XY_RING);
    }
    if (row > this.row) {
      this.row = row;
      this.accY = new Float64Array(row);
    }
  }

  /** Bytes held now (the bake's high-water mark: every buffer only grows). */
  get bytes(): number {
    const a = [this.raw, this.inC, this.inB, this.xs, this.ringC, this.ringB, this.accC, this.accB, this.outC, this.outB, this.accY, this.hRing, this.numX, this.denX, this.numXY, this.denXY];
    let b = 0;
    for (let k = 0; k < a.length; k++) b += a[k]!.byteLength;
    return b;
  }
}

/** An air cell in reach (`occ` 0) with an air neighbour in reach of another visibility. */
function isEdge(vis: Uint8Array, occ: Uint8Array, i: number, x: number, y: number, z: number, nx: number, ny: number, nz: number, sxy: number): boolean {
  const v = vis[i];
  return (
    (x > 0 && occ[i - 1] === 0 && vis[i - 1] !== v) ||
    (x < nx - 1 && occ[i + 1] === 0 && vis[i + 1] !== v) ||
    (y > 0 && occ[i - nx] === 0 && vis[i - nx] !== v) ||
    (y < ny - 1 && occ[i + nx] === 0 && vis[i + nx] !== v) ||
    (z > 0 && occ[i - sxy] === 0 && vis[i - sxy] !== v) ||
    (z < nz - 1 && occ[i + sxy] === 0 && vis[i + sxy] !== v)
  );
}

/** A band cell's tap weights for half-width `h` (as Float32, their stored precision before LR16-POLISH C); returns the taps. */
function tapWeights(w: Float64Array, h: number): number {
  const t = Math.min(PENUMBRA.search, Math.ceil(h - 0.5));
  for (let j = 0; j <= t; j++) w[j] = Math.fround(tentWeight(h, j));
  return t;
}

/**
 * (LR16e) The penumbra pass on one lamp's cells (between the visibility loop and the solid-cell pass). Live cells: the air
 * cells in reach (`occ` 0); `pen.dol`: their light-to-occluder distance (-1: none blocked). Only the band within `search`
 * cells of a visibility edge changes; a fully lit or fully hidden cell away from every edge keeps its byte. Deterministic.
 * (LR16-POLISH C) Streamed along z, plane by plane: the box sums, then each plane's band, its x and y filter, and the z
 * filter of the plane R behind. A band cell's final byte is written once no later step reads its raw visibility.
 */
function penumbraPass(vis: Uint8Array, occ: Uint8Array, pen: PenumbraBuffers, box: number[], lx: number, ly: number, lz: number, s: number): void {
  const c = LAMP_CELL;
  const nx = box[3]!;
  const ny = box[4]!;
  const nz = box[5]!;
  const sxy = nx * ny;
  const R = PENUMBRA.search;
  // 1. no edge cell (an air cell with an air neighbour of another visibility): nothing changes
  let edge = false;
  for (let z = 0; z < nz && !edge; z++) {
    for (let y = 0; y < ny && !edge; y++) {
      for (let x = 0; x < nx; x++) {
        const i = x + nx * (y + ny * z);
        if (occ[i] === 0 && isEdge(vis, occ, i, x, y, z, nx, ny, nz, sxy)) {
          edge = true;
          break;
        }
      }
    }
  }
  if (!edge) return;
  pen.planes(sxy, nx);
  const { dol, inC, inB, xs, ringC, ringB, accC, accB, outC, outB, accY, hRing, numX, denX, numXY, denXY, w } = pen;
  // 2. the separable sums over the (2R + 1)^3 cube about every cell, streamed along z: per plane p, the edge and blocked
  // cells as packed counts and the blockers' distance to the light (PCSS' average blocker depth: one value for every cell
  // an edge shadows, where a receiver-to-occluder mean would shrink for the cells nearer the occluder), summed over x and
  // y into ring slot p; the z sum adds the plane R + 1 ahead and drops the one R behind
  const feed = (p: number): void => {
    const base = p * sxy;
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const j = x + nx * y;
        const i = base + j;
        let cv = 0;
        let bv = 0;
        if (occ[i] === 0) {
          const d = dol[i]!;
          if (d >= 0) {
            bv = d;
            cv = 1;
          }
          if (isEdge(vis, occ, i, x, y, p, nx, ny, nz, sxy)) cv += EDGE;
        }
        inC[j] = cv;
        inB[j] = bv;
      }
    }
    const slot = (p % SUM_RING) * sxy;
    sumXY(inC, xs, ringC, accY, slot, nx, ny, R);
    sumXY(inB, xs, ringB, accY, slot, nx, ny, R);
  };
  // 4c. the z filter of plane q (its x-y filtered planes q - R .. q + R are in the ring) and its final bytes; a tap past an
  // occupied cell (or one out of reach) weighs 0, so a wall neither darkens the air beside it nor lets light through
  const zPass = (q: number): void => {
    const base = q * sxy;
    const ho = (q % H_RING) * sxy;
    const xo = (q % XY_RING) * sxy;
    for (let j = 0; j < sxy; j++) {
      const h = hRing[ho + j]!;
      if (h < 0) continue;
      const i = base + j;
      const t = tapWeights(w, h);
      let a = w[0]! * numXY[xo + j]!;
      let b = w[0]! * denXY[xo + j]!;
      for (let k = 1; k <= t && q - k >= 0; k++) {
        if (occ[i - k * sxy] !== 0) break;
        const o = ((q - k) % XY_RING) * sxy + j;
        a += w[k]! * numXY[o]!;
        b += w[k]! * denXY[o]!;
      }
      for (let k = 1; k <= t && q + k < nz; k++) {
        if (occ[i + k * sxy] !== 0) break;
        const o = ((q + k) % XY_RING) * sxy + j;
        a += w[k]! * numXY[o]!;
        b += w[k]! * denXY[o]!;
      }
      // (the sums as Float32, their stored precision)
      const v = Math.round(Math.fround(a) / Math.fround(b));
      vis[i] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  };
  accC.fill(0, 0, sxy);
  accB.fill(0, 0, sxy);
  for (let q = 0; q <= R && q < nz; q++) {
    feed(q);
    const o = (q % SUM_RING) * sxy;
    for (let j = 0; j < sxy; j++) {
      accC[j] = accC[j]! + ringC[o + j]!;
      accB[j] = accB[j]! + ringB[o + j]!;
    }
  }
  let n = 0;
  for (let q = 0; q < nz; q++) {
    for (let j = 0; j < sxy; j++) {
      outC[j] = accC[j]!;
      outB[j] = accB[j]!;
    }
    const add = q + R + 1 < nz;
    const rm = q - R >= 0;
    if (add) feed(q + R + 1);
    const ao = ((q + R + 1) % SUM_RING) * sxy;
    const ro = ((q - R + SUM_RING) % SUM_RING) * sxy;
    if (add && rm) {
      for (let j = 0; j < sxy; j++) {
        accC[j] = accC[j]! + ringC[ao + j]! - ringC[ro + j]!;
        accB[j] = accB[j]! + ringB[ao + j]! - ringB[ro + j]!;
      }
    } else if (add) {
      for (let j = 0; j < sxy; j++) {
        accC[j] = accC[j]! + ringC[ao + j]!;
        accB[j] = accB[j]! + ringB[ao + j]!;
      }
    } else if (rm) {
      for (let j = 0; j < sxy; j++) {
        accC[j] = accC[j]! - ringC[ro + j]!;
        accB[j] = accB[j]! - ringB[ro + j]!;
      }
    }
    // 3. plane q's band cells (an edge within R) with a blocker in range: the width, as a tent's half-width in cells
    const base = q * sxy;
    const ho = (q % H_RING) * sxy;
    const pz = box[2]! + (q + 0.5) * c - lz;
    for (let y = 0; y < ny; y++) {
      const py = box[1]! + (y + 0.5) * c - ly;
      for (let x = 0; x < nx; x++) {
        const j = x + nx * y;
        const k = outC[j]!;
        if (occ[base + j] !== 0 || k < EDGE || k % EDGE === 0) {
          hRing[ho + j] = -1;
          continue;
        }
        const px = box[0]! + (x + 0.5) * c - lx;
        hRing[ho + j] = penumbraWidth(s, Math.sqrt(px * px + py * py + pz * pz), outB[j]! / (k % EDGE)) / c;
        n++;
      }
    }
    // 4a. x filter (weighted sums and their weights), each band cell with its own width; cells off the band hold (vis, 1)
    for (let j = 0; j < sxy; j++) {
      numX[j] = vis[base + j]!;
      denX[j] = 1;
    }
    for (let j = 0; j < sxy; j++) {
      const h = hRing[ho + j]!;
      if (h < 0) continue;
      const i = base + j;
      const x = j % nx;
      const t = tapWeights(w, h);
      let a = w[0]! * vis[i]!;
      let b = w[0]!;
      for (let k = 1; k <= t && x - k >= 0; k++) {
        if (occ[i - k] !== 0) break;
        a += w[k]! * vis[i - k]!;
        b += w[k]!;
      }
      for (let k = 1; k <= t && x + k < nx; k++) {
        if (occ[i + k] !== 0) break;
        a += w[k]! * vis[i + k]!;
        b += w[k]!;
      }
      numX[j] = a;
      denX[j] = b;
    }
    // 4b. y filter into the ring
    const xo = (q % XY_RING) * sxy;
    for (let j = 0; j < sxy; j++) {
      numXY[xo + j] = numX[j]!;
      denXY[xo + j] = denX[j]!;
    }
    for (let j = 0; j < sxy; j++) {
      const h = hRing[ho + j]!;
      if (h < 0) continue;
      const i = base + j;
      const y = Math.floor(j / nx);
      const t = tapWeights(w, h);
      let a = w[0]! * numX[j]!;
      let b = w[0]! * denX[j]!;
      for (let k = 1; k <= t && y - k >= 0; k++) {
        if (occ[i - k * nx] !== 0) break;
        a += w[k]! * numX[j - k * nx]!;
        b += w[k]! * denX[j - k * nx]!;
      }
      for (let k = 1; k <= t && y + k < ny; k++) {
        if (occ[i + k * nx] !== 0) break;
        a += w[k]! * numX[j + k * nx]!;
        b += w[k]! * denX[j + k * nx]!;
      }
      numXY[xo + j] = a;
      denXY[xo + j] = b;
    }
    // (plane q - R's x-y neighbours along z are all filtered now; its raw visibility is read by no later step: the feeds
    // read planes q + R .. and the x and y filters their own plane)
    if (q >= R) zPass(q - R);
  }
  for (let q = Math.max(0, nz - R); q < nz; q++) zPass(q);
  if (n > pen.peakBand) pen.peakBand = n;
}

/** Atlas layout for the lights' boxes: tiles side by side along x in rows along z; (lr-tex3d) when the rows pass
 *  `maxDepth` they continue on a new page stacked along y. */
export interface LampAtlas {
  /** Per light: tile offset in cells (x, z). */
  offsets: Int32Array;
  /** Per light: tile offset in cells along y (its page; 0 on a one-page atlas). */
  ys: Int32Array;
  /** Pages stacked along y (1: every tile at y = 0, the layout before lr-tex3d). */
  pages: number;
  dims: [number, number, number];
}

/** The atlas width the lamps have always packed to (cells): a map whose atlas fits keeps this layout exactly. */
export const LAMP_ATLAS_WIDTH = 1024;

/** Pure: shelf-pack the boxes (x across, z rows) within `maxWidth` cells; rows past `maxDepth` start a new page
 *  along y (each page as tall as its tallest box). `order`: the lights in packing order (default: light order). */
export function packLampAtlas(boxes: Float32Array, maxWidth = LAMP_ATLAS_WIDTH, maxDepth = Infinity, order?: Int32Array): LampAtlas {
  const n = boxes.length / BOX_STRIDE;
  const offsets = new Int32Array(n * 2);
  const ys = new Int32Array(n);
  let x = 0;
  let z = 0;
  let row = 0;
  let w = 1;
  let d = 1;
  // the page's y offset and height
  let py = 0;
  let ph = 1;
  let pages = 1;
  for (let k = 0; k < n; k++) {
    const i = order ? order[k]! : k;
    const bx = boxes[i * BOX_STRIDE + 3]!;
    const by = boxes[i * BOX_STRIDE + 4]!;
    const bz = boxes[i * BOX_STRIDE + 5]!;
    if (x > 0 && x + bx > maxWidth) {
      z += row;
      x = 0;
      row = 0;
    }
    if (z > 0 && z + bz > maxDepth) {
      py += ph;
      ph = 1;
      pages++;
      z = 0;
      x = 0;
      row = 0;
    }
    offsets[i * 2] = x;
    offsets[i * 2 + 1] = z;
    ys[i] = py;
    x += bx;
    row = Math.max(row, bz);
    ph = Math.max(ph, by);
    w = Math.max(w, x);
    d = Math.max(d, z + row);
  }
  return { offsets, ys, pages, dims: [w, py + ph, d] };
}

/**
 * (lr-tex3d) Pure: the atlas layout that fits a 3D texture of `maxSize` texels per axis (the GPU's
 * `MAX_3D_TEXTURE_SIZE`, read at runtime). Under LR13's 1.6x reach campusOps packed to 1023 x 90 x 2428 at the
 * 1024-cell width: past the 2048 most GPUs allow, the upload failed and every baked lamp read 0 on screen while the
 * light field (CPU, the bake itself) still lit the floor. The old 1024 width first (a map that fits keeps its layout
 * texel for texel); else the smallest of wider rows up to `maxSize` and pages along y. Every cell is copied exactly, so
 * the picture and the field read the same visibility (light parity; nothing is down-sampled, and the field never reads
 * the GPU limit). `fits` is false only when even the paged atlas passes `maxSize` (no WebGL2 GPU at 2048 for any map
 * today: campusOps Realistic needs 134 M cells against 8.6 G).
 */
export function fitLampAtlas(boxes: Float32Array, maxSize: number): LampAtlas & { fits: boolean } {
  const ok = (a: LampAtlas): boolean => a.dims[0] <= maxSize && a.dims[1] <= maxSize && a.dims[2] <= maxSize;
  const w0 = Math.min(LAMP_ATLAS_WIDTH, maxSize);
  const first = packLampAtlas(boxes, w0);
  if (ok(first)) return { ...first, fits: true };
  // past the old layout: tallest, then deepest boxes first (pages and rows of like boxes waste the fewest cells)
  const n = boxes.length / BOX_STRIDE;
  const order = Int32Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => boxes[b * BOX_STRIDE + 4]! - boxes[a * BOX_STRIDE + 4]! || boxes[b * BOX_STRIDE + 5]! - boxes[a * BOX_STRIDE + 5]! || a - b,
  );
  // the smallest that fits of: wider rows (one page), then pages along y of shrinking depth (short boxes on short pages)
  const vol = (a: LampAtlas): number => a.dims[0] * a.dims[1] * a.dims[2];
  let best: LampAtlas | null = null;
  for (let w = w0; ; w = Math.min(w * 2, maxSize)) {
    const a = packLampAtlas(boxes, w, Infinity, order);
    if (ok(a)) {
      best = a;
      break;
    }
    if (w >= maxSize) break;
  }
  for (let d = maxSize; d >= 64; d >>= 1) {
    const a = packLampAtlas(boxes, maxSize, d, order);
    if (ok(a) && (!best || vol(a) < vol(best))) best = a;
  }
  if (best) return { ...best, fits: true };
  const a = packLampAtlas(boxes, maxSize, maxSize, order);
  return { ...a, fits: false };
}

/** Pure: copy every light's cells into the atlas (R8, x fastest). */
export function fillLampAtlas(r: LampResult, a: LampAtlas): Uint8Array {
  const [ax, ay, az] = a.dims;
  const out = new Uint8Array(ax * ay * az);
  const n = r.boxes.length / BOX_STRIDE;
  let at = 0;
  for (let i = 0; i < n; i++) {
    const nx = r.boxes[i * BOX_STRIDE + 3]!;
    const ny = r.boxes[i * BOX_STRIDE + 4]!;
    const nz = r.boxes[i * BOX_STRIDE + 5]!;
    const tx = a.offsets[i * 2]!;
    const tz = a.offsets[i * 2 + 1]!;
    const ty = a.ys[i]!;
    for (let z = 0; z < nz; z++) {
      for (let y = 0; y < ny; y++) {
        const src = at + nx * (y + ny * z);
        out.set(r.vis.subarray(src, src + nx), tx + ax * (ty + y + ay * (tz + z)));
      }
    }
    at += nx * ny * nz;
  }
  return out;
}

/** Light grid cell (m): each cell lists the lights that can reach it. */
export const LAMP_GRID = 2;
/**
 * Lights listed per grid cell: `LAMP_GRID_TEXELS` RGBA texels of 4 ids. (LR16b; was 8 in two texels) With the
 * photometric reach (radius x 1.6, LR16a) a 2 m column has up to 17 lamps in reach (Sector Ops; Saltmarsh Park 16,
 * Fallow 11, Marlow Yard 9), and a lamp past the 8th lost its light in the meter and the picture alike. Every lamp in
 * a column's reach now gets a slot: nothing is dropped and nothing approximated (a residual or a shortened reach would
 * change what each lamp lights), the shaders' loop stops at the first empty slot so a column costs what it lists, and
 * the grid texels cost 16 B each (Saltmarsh Park: 5688 columns, 546 KB). `lampGrid` reports a column past the cap.
 */
export const LAMP_GRID_SLOTS = 24;
/** RGBA texels per grid cell (`LAMP_GRID_SLOTS` / 4). */
export const LAMP_GRID_TEXELS = LAMP_GRID_SLOTS / 4;
/** Index into `lampGrid(...).data` of column (q, r)'s first slot. */
export function lampGridBase(cols: number, q: number, r: number): number {
  return (r * cols + q) * LAMP_GRID_TEXELS * 4;
}

const clamp1 = (c: number): number => (c < -1 ? -1 : c > 1 ? 1 : c);

/**
 * Plan reach of light `i` of a `LAMP_STRIDE` array (sector-fixes L): how far from the light, in plan, its formula can be
 * above 0 (`lampMath`: 0 beyond the radius and outside a cone's outer angle), so a column it cannot light spends no slot
 * on it. `out` gets the disc radius and the bounding box's extents towards -x, +x, -z, +z: a lamp without a cone, the
 * radius each way; a cone, radius x cos(the angle from its axis to that direction less its outer angle) (0 behind it),
 * and a disc of radius x sin(its widest angle from straight down) when it stays under the horizon. Lossless.
 */
export function lampPlanReach(L: ArrayLike<number>, i: number, out: number[] | Float64Array): void {
  const o = i * LAMP_STRIDE;
  const r = L[o + 3]!;
  const cosOuter = L[o + 7]!;
  if (cosOuter < -1.5) {
    out[0] = out[1] = out[2] = out[3] = out[4] = r;
    return;
  }
  const th = Math.acos(clamp1(cosOuter));
  const down = Math.acos(clamp1(-L[o + 5]!)) + th;
  out[0] = down >= Math.PI / 2 ? r : Math.min(r, r * Math.sin(down) + 0.01);
  // (the extent towards a plan direction e: the cone's nearest direction to e makes max(0, angle(axis, e) - outer) with it)
  const ext = (c: number): number => {
    const a = Math.acos(clamp1(c)) - th;
    return a <= 0 ? r : a >= Math.PI / 2 ? 0.01 : Math.min(r, r * Math.cos(a) + 0.01);
  };
  out[1] = ext(-L[o + 4]!);
  out[2] = ext(L[o + 4]!);
  out[3] = ext(-L[o + 6]!);
  out[4] = ext(L[o + 6]!);
}

/** Plan distance from light `i` to the column [x0, x0 + g] x [z0, z0 + g] when its reach (`lampPlanReach`, in `reach`) touches it, else -1. */
export function lampColumnDist(L: ArrayLike<number>, i: number, reach: ArrayLike<number>, x0: number, z0: number, g: number): number {
  const o = i * LAMP_STRIDE;
  const x = L[o]!;
  const z = L[o + 2]!;
  if (x + reach[2]! <= x0 || x - reach[1]! >= x0 + g || z + reach[4]! <= z0 || z - reach[3]! >= z0 + g) return -1;
  const dx = Math.max(x0 - x, 0, x - (x0 + g));
  const dz = Math.max(z0 - z, 0, z - (z0 + g));
  const d = Math.sqrt(dx * dx + dz * dz);
  return d < reach[0]! ? d : -1;
}

/**
 * Pure: per `LAMP_GRID` column of the map, the ids (+1; 0 = none) of up to `LAMP_GRID_SLOTS` lights whose plan reach
 * (`lampPlanReach`) touches it, nearest first. `LAMP_GRID_TEXELS` RGBA texels per cell (`lampGridBase`),
 * `cols * LAMP_GRID_TEXELS` x `rows`. `worst`: the most lights any column has in reach (past `LAMP_GRID_SLOTS` the
 * farthest are dropped; the callers warn). Load time only.
 */
export function lampGrid(L: Float32Array, lo: readonly number[], hi: readonly number[]): { data: Uint8Array; cols: number; rows: number; worst: number } {
  const g = LAMP_GRID;
  const cols = Math.max(1, Math.ceil((hi[0]! - lo[0]!) / g));
  const rows = Math.max(1, Math.ceil((hi[2]! - lo[2]!) / g));
  const data = new Uint8Array(cols * LAMP_GRID_TEXELS * rows * 4);
  let worst = 0;
  const n = Math.min(255, L.length / LAMP_STRIDE);
  const near: { id: number; d: number }[] = [];
  const reach = new Float64Array(n * 5);
  const one = [0, 0, 0, 0, 0];
  for (let i = 0; i < n; i++) {
    lampPlanReach(L, i, one);
    reach.set(one, i * 5);
  }
  for (let r = 0; r < rows; r++) {
    for (let q = 0; q < cols; q++) {
      const x0 = lo[0]! + q * g;
      const z0 = lo[2]! + r * g;
      near.length = 0;
      for (let i = 0; i < n; i++) {
        const d = lampColumnDist(L, i, reach.subarray(i * 5, i * 5 + 5), x0, z0, g);
        if (d >= 0) near.push({ id: i, d });
      }
      near.sort((a, b) => a.d - b.d);
      if (near.length > worst) worst = near.length;
      const base = lampGridBase(cols, q, r);
      for (let k = 0; k < Math.min(LAMP_GRID_SLOTS, near.length); k++) data[base + k] = near[k]!.id + 1;
    }
  }
  return { data, cols, rows, worst };
}
