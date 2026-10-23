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

/** A light's box: its reach, clipped to the map; a downward lamp stops a cell above itself. */
export function lampBox(L: Float32Array, i: number, lo: readonly number[], hi: readonly number[], out: number[] = [0, 0, 0, 0, 0, 0]): number[] {
  const o = i * LAMP_STRIDE;
  const x = L[o]!;
  const y = L[o + 1]!;
  const z = L[o + 2]!;
  const r = L[o + 3]!;
  const c = LAMP_CELL;
  const down = L[o + 7]! < -1.5;
  const x0 = Math.max(lo[0]!, x - r);
  const y0 = Math.max(lo[1]!, y - r);
  const z0 = Math.max(lo[2]!, z - r);
  const x1 = Math.min(hi[0]!, x + r);
  const y1 = Math.min(hi[1]!, down ? y + c : y + r);
  const z1 = Math.min(hi[2]!, z + r);
  out[0] = x0;
  out[1] = y0;
  out[2] = z0;
  out[3] = Math.max(1, Math.ceil((x1 - x0) / c));
  out[4] = Math.max(1, Math.ceil((y1 - y0) / c));
  out[5] = Math.max(1, Math.ceil((z1 - z0) / c));
  return out;
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

/** Bake every light in the job. `penumbra` false: the LR16b bake, without the LR16e penumbra pass (tests compare). */
export function bakeLamps(job: LampJob, penumbra = true): LampResult {
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
  const pen = penumbra ? new PenumbraBuffers() : null;
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
    const vis = bakeOne(L, li, bx, occShapes, sb, pen);
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
      if (occ[qx + nx * (qy + ny * qz)]) return t;
    }
    return -1;
  };
  // (LR16e) per air cell in reach: live = 1, and dol = the light-to-occluder distance, its distance to the light less the
  // mean march distance to the occluder over its blocked samples (-1 when no sample was blocked)
  pen?.take(cells, nx * ny);
  const live = pen ? pen.live : null;
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
        if (ddx * ddx + ddy * ddy + ddz * ddz > r2) continue;
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
        if (live) {
          live[i] = 1;
          if (hits > 0) dol![i] = Math.max(0, Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz) - hitSum / hits);
        }
      }
    }
  }
  if (pen) penumbraPass(vis, pen, box, lx, ly, lz, fixtureSize(L, li, ns));
  // solid cells: the brightest air cell beside them (a lookup just inside a lit face stays lit)
  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const i = x + nx * (y + ny * z);
        if (!occ[i]) continue;
        let v = 0;
        if (x > 0 && !occ[i - 1]) v = Math.max(v, vis[i - 1]!);
        if (x < nx - 1 && !occ[i + 1]) v = Math.max(v, vis[i + 1]!);
        if (y > 0 && !occ[i - nx]) v = Math.max(v, vis[i - nx]!);
        if (y < ny - 1 && !occ[i + nx]) v = Math.max(v, vis[i + nx]!);
        if (z > 0 && !occ[i - nx * ny]) v = Math.max(v, vis[i - nx * ny]!);
        if (z < nz - 1 && !occ[i + nx * ny]) v = Math.max(v, vis[i + nx * ny]!);
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

/** Sliding sums of radius `R` across `n` slices of `w` consecutive values (slice q at `base + q x step`): `src` -> `dst`. */
function slideSlices(src: Float32Array, dst: Float32Array, acc: Float64Array, base: number, step: number, w: number, n: number, R: number): void {
  acc.fill(0, 0, w);
  for (let q = 0; q <= R && q < n; q++) for (let j = 0, o = base + q * step; j < w; j++) acc[j] = acc[j]! + src[o + j]!;
  for (let q = 0; q < n; q++) {
    const o = base + q * step;
    const ad = q + R + 1 < n ? base + (q + R + 1) * step : -1;
    const rm = q - R >= 0 ? base + (q - R) * step : -1;
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

/** Separable sums over the (2R + 1)^3 cube about every cell: x (`a` -> `t`), y (`t` -> `a`, row by row), z (`a` -> `t`,
 *  plane by plane), so every pass walks memory in order. The sums end in `t`; `a` is overwritten. `acc`: nx x ny scratch. */
function boxSum3(a: Float32Array, t: Float32Array, acc: Float64Array, nx: number, ny: number, nz: number, R: number): void {
  const sxy = nx * ny;
  for (let row = 0; row < ny * nz; row++) {
    const base = row * nx;
    let s = 0;
    for (let q = 0; q <= R && q < nx; q++) s += a[base + q]!;
    for (let q = 0; q < nx; q++) {
      t[base + q] = s;
      if (q + R + 1 < nx) s += a[base + q + R + 1]!;
      if (q - R >= 0) s -= a[base + q - R]!;
    }
  }
  for (let z = 0; z < nz; z++) slideSlices(t, a, acc, z * sxy, nx, nx, ny, R);
  slideSlices(a, t, acc, 0, sxy, sxy, nz, R);
}

/** Packed counts: edge cells x `EDGE` + blocked cells (each at most (2 x 3 + 1)^3 = 343: exact in a float). */
const EDGE = 1024;

/** (LR16e) The penumbra pass's buffers: grown to the largest lamp of a bake and reused (one allocation per bake, not per
 *  lamp); `take` sizes the views to a lamp's cells and clears the ones read before they are written. */
class PenumbraBuffers {
  private size = -1;
  private plane = -1;
  private raw = { live: new Uint8Array(0), f: [new Float32Array(0)], acc: new Float64Array(0) };
  live = new Uint8Array(0);
  dol = new Float32Array(0);
  cnt = new Float32Array(0);
  bs = new Float32Array(0);
  tmp = new Float32Array(0);
  den2 = new Float32Array(0);
  acc = new Float64Array(0);

  take(cells: number, plane: number): void {
    if (cells > this.size) {
      this.size = cells;
      this.raw.live = new Uint8Array(cells);
      this.raw.f = [0, 1, 2, 3, 4].map(() => new Float32Array(cells));
    }
    if (plane > this.plane) {
      this.plane = plane;
      this.raw.acc = new Float64Array(plane);
    }
    const f = this.raw.f;
    this.live = this.raw.live.subarray(0, cells);
    this.dol = f[0]!.subarray(0, cells);
    this.cnt = f[1]!.subarray(0, cells);
    this.bs = f[2]!.subarray(0, cells);
    this.tmp = f[3]!.subarray(0, cells);
    this.den2 = f[4]!.subarray(0, cells);
    this.acc = this.raw.acc;
    this.live.fill(0);
    this.dol.fill(-1);
    this.cnt.fill(0);
    this.bs.fill(0);
  }
}

/**
 * (LR16e) The penumbra pass on one lamp's cells (between the visibility loop and the solid-cell pass). `pen.live`: air cells
 * in reach; `pen.dol`: their light-to-occluder distance (-1: none blocked). Only the band within `search` cells of a
 * visibility edge changes; a fully lit or fully hidden cell away from every edge keeps its byte. Deterministic.
 */
function penumbraPass(vis: Uint8Array, pen: PenumbraBuffers, box: number[], lx: number, ly: number, lz: number, s: number): void {
  const { live, dol, cnt, bs, tmp, acc } = pen;
  const c = LAMP_CELL;
  const nx = box[3]!;
  const ny = box[4]!;
  const nz = box[5]!;
  const sxy = nx * ny;
  const cells = nx * ny * nz;
  const R = PENUMBRA.search;
  // 1. edge cells (an air cell with an air neighbour of another visibility) and blocked cells, as packed counts; the
  // blockers' distance to the light (PCSS' average blocker depth: one value for every cell an edge shadows, where a
  // receiver-to-occluder mean would shrink for the cells nearer the occluder)
  let edges = 0;
  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const i = x + nx * (y + ny * z);
        if (!live[i]) continue;
        const d = dol[i]!;
        if (d >= 0) {
          bs[i] = d;
          cnt[i] = 1;
        }
        const v = vis[i];
        if (
          (x > 0 && live[i - 1] && vis[i - 1] !== v) ||
          (x < nx - 1 && live[i + 1] && vis[i + 1] !== v) ||
          (y > 0 && live[i - nx] && vis[i - nx] !== v) ||
          (y < ny - 1 && live[i + nx] && vis[i + nx] !== v) ||
          (z > 0 && live[i - sxy] && vis[i - sxy] !== v) ||
          (z < nz - 1 && live[i + sxy] && vis[i + sxy] !== v)
        ) {
          cnt[i] = cnt[i]! + EDGE;
          edges++;
        }
      }
    }
  }
  if (edges === 0) return;
  // 2. within R cells: the band (an edge in range) and the blockers' mean distance to the light
  const bsum = pen.den2;
  boxSum3(cnt, tmp, acc, nx, ny, nz, R);
  boxSum3(bs, bsum, acc, nx, ny, nz, R);
  // (the sums: packed counts in tmp, blocker distances in bsum)
  // 3. per band cell with a blocker in range: the width, as a tent's half-width in cells, and its R + 1 weights
  let n = 0;
  for (let i = 0; i < cells; i++) {
    const k = tmp[i]!;
    if (live[i] && k >= EDGE && k % EDGE > 0) n++;
  }
  const list = new Int32Array(n);
  const wts = new Float32Array(n * (R + 1));
  const taps = new Uint8Array(n);
  let m = 0;
  for (let z = 0; z < nz; z++) {
    const pz = box[2]! + (z + 0.5) * c - lz;
    for (let y = 0; y < ny; y++) {
      const py = box[1]! + (y + 0.5) * c - ly;
      for (let x = 0; x < nx; x++) {
        const i = x + nx * (y + ny * z);
        const k = tmp[i]!;
        if (!live[i] || k < EDGE || k % EDGE === 0) continue;
        const px = box[0]! + (x + 0.5) * c - lx;
        const h = penumbraWidth(s, Math.sqrt(px * px + py * py + pz * pz), bsum[i]! / (k % EDGE)) / c;
        const t = Math.min(R, Math.ceil(h - 0.5));
        list[m] = i;
        taps[m] = t;
        for (let j = 0; j <= t; j++) wts[m * (R + 1) + j] = tentWeight(h, j);
        m++;
      }
    }
  }
  // 4. filter x, y, z (weighted sums and their weights), each pass with the receiver's own width; a tap past an occupied
  // cell (or one out of reach) weighs 0, so a wall neither darkens the air beside it nor lets light through. Cells off the
  // band hold (vis, 1) in both buffers and are never written.
  let num = cnt;
  let den = bs;
  let num2 = tmp;
  let den2 = bsum;
  for (let i = 0; i < cells; i++) {
    num[i] = num2[i] = vis[i]!;
    den[i] = den2[i] = 1;
  }
  for (let axis = 0; axis < 3; axis++) {
    const stride = axis === 0 ? 1 : axis === 1 ? nx : sxy;
    const len = axis === 0 ? nx : axis === 1 ? ny : nz;
    for (let k = 0; k < n; k++) {
      const i = list[k]!;
      const q = axis === 0 ? i % nx : axis === 1 ? Math.floor(i / nx) % ny : Math.floor(i / sxy);
      const t = taps[k]!;
      const wo = k * (R + 1);
      let a = wts[wo]! * num[i]!;
      let b = wts[wo]! * den[i]!;
      for (let j = 1; j <= t && q - j >= 0; j++) {
        const i2 = i - j * stride;
        if (!live[i2]) break;
        a += wts[wo + j]! * num[i2]!;
        b += wts[wo + j]! * den[i2]!;
      }
      for (let j = 1; j <= t && q + j < len; j++) {
        const i2 = i + j * stride;
        if (!live[i2]) break;
        a += wts[wo + j]! * num[i2]!;
        b += wts[wo + j]! * den[i2]!;
      }
      num2[i] = a;
      den2[i] = b;
    }
    const sn = num;
    num = num2;
    num2 = sn;
    const sd = den;
    den = den2;
    den2 = sd;
  }
  for (let k = 0; k < n; k++) {
    const i = list[k]!;
    const v = Math.round(num[i]! / den[i]!);
    vis[i] = v < 0 ? 0 : v > 255 ? 255 : v;
  }
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
