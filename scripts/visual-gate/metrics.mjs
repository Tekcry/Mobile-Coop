/** Rec. 709 Y' of sRGB bytes, row-major, length w * h, 0..255. @typedef {{ w: number, h: number, luma: Uint8Array }} LumaImage */
/** 0 / 1 per pixel, row-major, length w * h. @typedef {Uint8Array} Mask */
/** Screen pixels: x right, y down, origin top-left (Playwright screenshot space). @typedef {[number, number]} Pt2 */
/** Luma 0..1; hist: 32 bins over 0..1, normalised to sum 1 (all zero when n = 0). @typedef {{ n: number, mean: number, p5: number, p50: number, p95: number, nearBlack: number, hist: number[] }} Stats */
/** @typedef {{ veil: number, contrast: number }} Haze */
/** Per region: Stats plus whichever extra metrics were asked. @typedef {Stats & { veil?: number, contrast?: number, blotch?: number, arc?: number }} RegionMetrics */
/** One shot's measures (a rig shot adds `leak`). @typedef {{ whole: RegionMetrics, regions: Record<string, RegionMetrics>, leak?: { mean: number, p95: number } }} ShotMetrics */
/** @typedef {'haze' | 'blotch' | 'arc'} MetricName */
/** A rule (VG3's Rule is the same shape). @typedef {{ min?: number | null, max?: number | null, presets?: ('low' | 'epic')[] }} Rule */
/** @typedef {{ key: string, region: string, metric: string, base: number | null, cur: number, delta: number | null, tol: number, kind: 'drift' | 'rule', known: string | null }} Flag */
/** @typedef {typeof FLOORS} Tolerances */

/*
 * visual-gate picture metrics (VG1; docs/visual-gate/PLAN.md section 4, briefs/VG1.md).
 * Plain ESM, no imports: runs in Node 22 and in the page. Pure and deterministic. Images are luma bytes 0..255; every
 * returned metric is on 0..1. Whole-image passes allocate a few scratch arrays per call, never per pixel.
 */

/** nearBlack: luma <= 10 (0.04 x 255 = 10.2, bible L5 dark target). */
const NEAR_BLACK = 10;
const HIST_BINS = 32;

/**
 * Rec. 709 luma of RGBA bytes (alpha ignored), the weights of e2e-darkness.mjs `readLuma`.
 * @param {Uint8Array | Uint8ClampedArray} rgba
 * @param {number} w
 * @param {number} h
 * @returns {LumaImage}
 */
export function lumaFromRgba(rgba, w, h) {
  const n = w * h;
  if (rgba.length < n * 4) throw new Error(`lumaFromRgba: ${rgba.length} bytes for ${w} x ${h}`);
  const luma = new Uint8Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    luma[i] = Math.round(0.2126 * rgba[j] + 0.7152 * rgba[j + 1] + 0.0722 * rgba[j + 2]);
  }
  return { w, h, luma };
}

/**
 * @param {number} w
 * @param {number} h
 * @returns {Mask} all 1
 */
export function fullMask(w, h) {
  return new Uint8Array(w * h).fill(1);
}

/**
 * Even-odd scanline fill sampled at pixel centres (x + 0.5, y + 0.5). Points may lie off-screen (clipped by the raster);
 * fewer than 3 points gives an empty mask.
 * @param {number} w
 * @param {number} h
 * @param {Pt2[]} pts
 * @returns {Mask}
 */
export function maskFromPolygon(w, h, pts) {
  const mask = new Uint8Array(w * h);
  const m = pts.length;
  if (m < 3) return mask;
  const xs = new Float64Array(m); // crossings of one row, reused
  for (let y = 0; y < h; y++) {
    const yc = y + 0.5;
    let k = 0;
    for (let i = 0; i < m; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % m];
      const ay = a[1];
      const by = b[1];
      if ((ay <= yc) === (by <= yc)) continue; // half-open: a vertex on the line counts once
      const x = a[0] + ((yc - ay) * (b[0] - a[0])) / (by - ay);
      // insertion sort as we go (crossings per row are few)
      let j = k++;
      while (j > 0 && xs[j - 1] > x) {
        xs[j] = xs[j - 1];
        j--;
      }
      xs[j] = x;
    }
    const row = y * w;
    for (let i = 0; i + 1 < k; i += 2) {
      // pixel centres x + 0.5 in [xa, xb)
      const x0 = Math.max(0, Math.ceil(xs[i] - 0.5));
      const x1 = Math.min(w, Math.ceil(xs[i + 1] - 0.5));
      for (let x = x0; x < x1; x++) mask[row + x] = 1;
    }
  }
  return mask;
}

/**
 * Erosion by a (2r + 1) square: a pixel stays 1 only if every pixel of the square is 1 and inside the image.
 * Separable sliding-window min, O(w h) per pass.
 * @param {Mask} mask
 * @param {number} w
 * @param {number} h
 * @param {number} r
 * @returns {Mask}
 */
export function erode(mask, w, h, r) {
  r = Math.floor(r);
  if (!(r > 0)) return Uint8Array.from(mask);
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  const span = 2 * r + 1;
  // rows: count ones in [x - r, x + r]
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let ones = 0;
    for (let x = 0; x < w; x++) {
      ones += mask[row + x];
      if (x >= span) ones -= mask[row + x - span];
      const c = x - r; // centre whose window ends at x
      if (c >= r && ones === span) tmp[row + c] = 1;
    }
  }
  // columns
  for (let x = 0; x < w; x++) {
    let ones = 0;
    for (let y = 0; y < h; y++) {
      ones += tmp[y * w + x];
      if (y >= span) ones -= tmp[(y - span) * w + x];
      const c = y - r;
      if (c >= r && ones === span) out[c * w + x] = 1;
    }
  }
  return out;
}

/**
 * Nearest-rank percentile of a 256-level count table.
 * @param {Uint32Array | Float64Array} counts
 * @param {number} n
 * @param {number} p 0..1
 */
function levelAt(counts, n, p) {
  const rank = Math.max(1, Math.ceil(p * n));
  let cum = 0;
  for (let v = 0; v < 256; v++) {
    cum += counts[v];
    if (cum >= rank) return v;
  }
  return 255;
}

/**
 * Luma statistics over the mask (counting sort on the 256 levels; nearest-rank percentiles).
 * @param {LumaImage} img
 * @param {Mask} mask
 * @returns {Stats}
 */
export function stats(img, mask) {
  const { luma } = img;
  const counts = new Uint32Array(256);
  const len = luma.length;
  for (let i = 0; i < len; i++) if (mask[i]) counts[luma[i]]++;
  let n = 0;
  let sum = 0;
  let dark = 0;
  /** @type {number[]} */
  const hist = new Array(HIST_BINS).fill(0);
  for (let v = 0; v < 256; v++) {
    const c = counts[v];
    if (!c) continue;
    n += c;
    sum += c * v;
    if (v <= NEAR_BLACK) dark += c;
    hist[Math.min(HIST_BINS - 1, Math.floor((v * HIST_BINS) / 255))] += c; // 32 bins over 0..1 (v >> 3 for v < 255)
  }
  if (n === 0) return { n: 0, mean: 0, p5: 0, p50: 0, p95: 0, nearBlack: 0, hist };
  for (let b = 0; b < HIST_BINS; b++) hist[b] /= n;
  return {
    n,
    mean: sum / n / 255,
    p5: levelAt(counts, n, 0.05) / 255,
    p50: levelAt(counts, n, 0.5) / 255,
    p95: levelAt(counts, n, 0.95) / 255,
    nearBlack: dark / n,
    hist,
  };
}

/**
 * 1-D earth mover's distance of two equal-length histograms, each normalised to sum 1 first:
 * sum |cdfA - cdfB| / (bins - 1), 0..1. A histogram summing to 0 counts as all zero.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
export function emd(a, b) {
  if (a.length !== b.length) throw new Error(`emd: histogram lengths ${a.length} and ${b.length}`);
  const bins = a.length;
  if (bins < 2) return 0;
  let sa = 0;
  let sb = 0;
  for (let i = 0; i < bins; i++) {
    sa += a[i];
    sb += b[i];
  }
  const ka = sa > 0 ? 1 / sa : 0;
  const kb = sb > 0 ? 1 / sb : 0;
  let ca = 0;
  let cb = 0;
  let d = 0;
  for (let i = 0; i < bins; i++) {
    ca += a[i] * ka;
    cb += b[i] * kb;
    d += Math.abs(ca - cb);
  }
  return d / (bins - 1);
}

/**
 * Summed-area table of the luma, (w + 1) x (h + 1).
 * @param {LumaImage} img
 */
function sat(img) {
  const { w, h, luma } = img;
  const W = w + 1;
  const s = new Float64Array(W * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    const src = y * w;
    const dst = (y + 1) * W;
    for (let x = 0; x < w; x++) {
      rowSum += luma[src + x];
      s[dst + x + 1] = s[dst - W + x + 1] + rowSum;
    }
  }
  return s;
}

/**
 * Box mean of radius r at (x, y) from a summed-area table, the window clamped to the image (edges clamped), 0..255.
 * @param {Float64Array} s
 * @param {number} w
 * @param {number} h
 * @param {number} x
 * @param {number} y
 * @param {number} r
 */
function boxAt(s, w, h, x, y, r) {
  const W = w + 1;
  const x0 = x - r < 0 ? 0 : x - r;
  const y0 = y - r < 0 ? 0 : y - r;
  const x1 = x + r >= w ? w : x + r + 1;
  const y1 = y + r >= h ? h : y + r + 1;
  const sum = s[y1 * W + x1] - s[y0 * W + x1] - s[y1 * W + x0] + s[y0 * W + x0];
  return sum / ((x1 - x0) * (y1 - y0));
}

/**
 * Box blur of radius r (summed-area table, edges clamped), luma 0..1.
 * @param {LumaImage} img
 * @param {number} r
 * @param {Float64Array} [s] the image's summed-area table when the caller already has it
 */
function boxBlur(img, r, s = sat(img)) {
  const { w, h } = img;
  const out = new Float32Array(w * h);
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) out[i] = boxAt(s, w, h, x, y, r) / 255;
  return out;
}

/**
 * Mean luma (0..1) over a mask; 0 when empty.
 * @param {Uint8Array} luma
 * @param {Mask} mask
 */
function maskMean(luma, mask) {
  let n = 0;
  let sum = 0;
  for (let i = 0; i < luma.length; i++) {
    if (!mask[i]) continue;
    n++;
    sum += luma[i];
  }
  return n ? sum / n / 255 : 0;
}

/**
 * Haze: `veil` = p5 of the mask (lifted blacks); `contrast` = mean |4-neighbour Laplacian| of a box blur r 1 over the
 * mask eroded by 2, / (mean luma of that eroded mask + 0.03), luma 0..1. An empty eroded mask gives contrast 0.
 * @param {LumaImage} img
 * @param {Mask} mask
 * @returns {Haze}
 */
export function haze(img, mask) {
  return hazeWith(img, mask, stats(img, mask).p5, boxBlur(img, 1));
}

/**
 * `haze` on a prebuilt r 1 blur and the mask's p5 (measure shares both).
 * @param {LumaImage} img
 * @param {Mask} mask
 * @param {number} veil the mask's p5
 * @param {Float32Array} b box blur r 1 of img, luma 0..1
 * @returns {Haze}
 */
function hazeWith(img, mask, veil, b) {
  const { w, h, luma } = img;
  const inner = erode(mask, w, h, 2);
  let n = 0;
  let lap = 0;
  let sum = 0;
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const i = y * w + x;
      if (!inner[i]) continue;
      n++;
      sum += luma[i];
      lap += Math.abs(4 * b[i] - b[i - 1] - b[i + 1] - b[i - w] - b[i + w]);
    }
  }
  if (n === 0) return { veil, contrast: 0 };
  return { veil, contrast: lap / n / (sum / n / 255 + 0.03) };
}

/**
 * Blotch (low-frequency wall noise): D = boxBlur(r 3) - boxBlur(r 24), luma 0..1, summed-area table, edges clamped;
 * std of D over the mask eroded by 24 px, / (mean luma of the eroded mask + 0.03). Eroded mask empty -> 0.
 * @param {LumaImage} img
 * @param {Mask} mask
 * @returns {number}
 */
export function blotch(img, mask) {
  return blotchWith(img, mask, sat(img));
}

/**
 * `blotch` on a prebuilt summed-area table (measure shares it).
 * @param {LumaImage} img
 * @param {Mask} mask
 * @param {Float64Array} s summed-area table of img
 * @returns {number}
 */
function blotchWith(img, mask, s) {
  const { w, h, luma } = img;
  const inner = erode(mask, w, h, 24);
  let n = 0;
  let sumL = 0;
  let mean = 0; // Welford on D
  let m2 = 0;
  for (let y = 0, i = 0; y < h; y++) {
    for (let x = 0; x < w; x++, i++) {
      if (!inner[i]) continue;
      const d = (boxAt(s, w, h, x, y, 3) - boxAt(s, w, h, x, y, 24)) / 255;
      n++;
      sumL += luma[i];
      const dm = d - mean;
      mean += dm / n;
      m2 += dm * (d - mean);
    }
  }
  if (n === 0) return 0;
  return Math.sqrt(m2 / n) / (sumL / n / 255 + 0.03);
}

/** Ridge run: a pixel is a ridge pixel in a run of at least this many above-threshold pixels along its edge. */
const ARC_RUN = 12;
/** Median histogram: 256 bins of G x ARC_Q (1/16 level of slope each); bins below ARC_FLOOR_BIN hold G < 1.5 / 255. */
const ARC_BINS = 256;
const ARC_Q = 255 * 16;
const ARC_FLOOR_BIN = 24;

/**
 * Hard light arcs: G = Sobel magnitude (divided by 8, so G is the per-pixel luma slope 0..1) of a box blur r 1;
 * T = max(6 / 255, 4 x the median G over the mask); a ridge pixel has G > T and lies in a run of >= 12 consecutive
 * G > T samples along its edge's tangent (perpendicular to its gradient; sample k = round(p + k x unit tangent),
 * k = +-1..11, both ways, inside the image). Returns ridge pixels / mask pixels (0 when the mask is empty).
 * @param {LumaImage} img
 * @param {Mask} mask
 * @returns {number}
 */
export function arc(img, mask) {
  return arcWith(img, mask, null);
}

/**
 * `arc` on a prebuilt r 1 blur (measure shares it), or null to build it here (after the empty-mask early out).
 * @param {LumaImage} img
 * @param {Mask} mask
 * @param {Float32Array | null} blur box blur r 1 of img, luma 0..1
 * @returns {number}
 */
function arcWith(img, mask, blur) {
  const { w, h } = img;
  const len = w * h;
  let n = 0;
  for (let i = 0; i < len; i++) if (mask[i]) n++;
  if (n === 0 || w < 3 || h < 3) return 0;
  const b = blur ?? boxBlur(img, 1);
  const g = new Float32Array(len); // border pixels stay 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = b[i - w + 1] + 2 * b[i + 1] + b[i + w + 1] - b[i - w - 1] - 2 * b[i - 1] - b[i + w - 1];
      const gy = b[i + w - 1] + 2 * b[i + w] + b[i + w + 1] - b[i - w - 1] - 2 * b[i - w] - b[i - w + 1];
      g[i] = Math.sqrt(gx * gx + gy * gy) / 8;
    }
  }
  const t = Math.max(6 / 255, 4 * arcMedian(g, mask, n));
  let ridge = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!mask[i] || !(g[i] > t)) continue;
      const gx = b[i - w + 1] + 2 * b[i + 1] + b[i + w + 1] - b[i - w - 1] - 2 * b[i - 1] - b[i + w - 1];
      const gy = b[i + w - 1] + 2 * b[i + w] + b[i + w + 1] - b[i - w - 1] - 2 * b[i - w] - b[i - w + 1];
      const m = Math.sqrt(gx * gx + gy * gy);
      const tx = -gy / m; // unit tangent = gradient turned 90 degrees
      const ty = gx / m;
      let run = 1;
      for (let sgn = 1; sgn >= -1 && run < ARC_RUN; sgn -= 2) {
        // exact tangent, accumulated position rounded per step (no rounded unit step: that walks off slanted edges)
        for (let k = 1; run < ARC_RUN; k++) {
          const px = Math.round(x + sgn * k * tx);
          const py = Math.round(y + sgn * k * ty);
          if (px < 0 || py < 0 || px >= w || py >= h || !(g[py * w + px] > t)) break;
          run++;
        }
      }
      if (run >= ARC_RUN) ridge++;
    }
  }
  return ridge / n;
}

/**
 * Exact lower median (rank max(1, ceil(n / 2))) of g over the mask, by a 256-bin histogram: when the median's bin lies
 * below 1.5 / 255 the threshold is the 6 / 255 floor anyway, so 0 is returned; else only that bin is sorted.
 * @param {Float32Array} g
 * @param {Mask} mask
 * @param {number} n mask pixels (> 0)
 */
function arcMedian(g, mask, n) {
  const len = g.length;
  const counts = new Uint32Array(ARC_BINS);
  for (let i = 0; i < len; i++) {
    if (!mask[i]) continue;
    const q = (g[i] * ARC_Q) | 0;
    counts[q < ARC_BINS ? q : ARC_BINS - 1]++;
  }
  const rank = Math.max(1, Math.ceil(n / 2));
  let bin = 0;
  let before = 0;
  while (before + counts[bin] < rank) before += counts[bin++];
  if (bin < ARC_FLOOR_BIN) return 0; // median < 1.5 / 255, so 4 x median < 6 / 255
  const vals = new Float32Array(counts[bin]);
  for (let i = 0, k = 0; i < len; i++) {
    if (!mask[i]) continue;
    const q = (g[i] * ARC_Q) | 0;
    if ((q < ARC_BINS ? q : ARC_BINS - 1) === bin) vals[k++] = g[i];
  }
  vals.sort();
  return vals[rank - before - 1];
}

/**
 * Torch leak (rig shots): per pixel max(0, on - off) / 255 over the mask; mean and nearest-rank p95.
 * @param {LumaImage} on
 * @param {LumaImage} off
 * @param {Mask} mask
 * @returns {{ mean: number, p95: number }}
 */
export function leak(on, off, mask) {
  if (on.w !== off.w || on.h !== off.h || on.luma.length !== off.luma.length) {
    throw new Error(`leak: size mismatch ${on.w} x ${on.h} vs ${off.w} x ${off.h}`);
  }
  const counts = new Uint32Array(256);
  const a = on.luma;
  const b = off.luma;
  let n = 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    if (!mask[i]) continue;
    const d = a[i] > b[i] ? a[i] - b[i] : 0;
    counts[d]++;
    sum += d;
    n++;
  }
  if (n === 0) return { mean: 0, p95: 0 };
  return { mean: sum / n / 255, p95: levelAt(counts, n, 0.95) / 255 };
}

/**
 * One shot's measures: `whole` = stats of the full frame; each region = stats + the metrics asked for it in `want`
 * (`haze` adds `veil` and `contrast`).
 * @param {LumaImage} img
 * @param {Record<string, Mask>} masks
 * @param {Record<string, MetricName[]>} want
 * @returns {ShotMetrics}
 */
export function measure(img, masks, want) {
  const whole = stats(img, fullMask(img.w, img.h));
  /** @type {Record<string, RegionMetrics>} */
  const regions = {};
  // one summed-area table and one r 1 blur per call, built on first use and shared by every region
  /** @type {Float64Array | null} */
  let s = null;
  /** @type {Float32Array | null} */
  let b = null;
  for (const name of Object.keys(masks)) {
    const mask = masks[name];
    /** @type {RegionMetrics} */
    const r = stats(img, mask);
    for (const metric of want[name] ?? []) {
      if (metric === 'haze') {
        s ??= sat(img);
        b ??= boxBlur(img, 1, s);
        const hz = hazeWith(img, mask, r.p5, b);
        r.veil = hz.veil;
        r.contrast = hz.contrast;
      } else if (metric === 'blotch') {
        s ??= sat(img);
        r.blotch = blotchWith(img, mask, s);
      } else if (metric === 'arc') {
        s ??= sat(img);
        b ??= boxBlur(img, 1, s);
        r.arc = arcWith(img, mask, b);
      } else throw new Error(`measure: unknown metric ${metric}`);
    }
    regions[name] = r;
  }
  return { whole, regions };
}

/** Frozen copy of `src/world/darkCurve.ts` DARK_TARGETS (bible L5; a unit test keeps it equal). */
export const DARK = Object.freeze([
  Object.freeze({ level: 0.12, band: 'dark', min: 0, max: 0.04 }),
  Object.freeze({ level: 0.27, band: 'dark', min: 0, max: 0.09 }),
  Object.freeze({ level: 0.4, band: 'mid', min: 0.12, max: 0.35 }),
  Object.freeze({ level: 0.7, band: 'lit', min: 0.45, max: 1 }),
]);

/** The band edges: `LIGHT.shadow`, `LIGHT.lit` (src/world/lights.ts). */
export const BAND_EDGES = Object.freeze([0.28, 0.6]);

const PARITY_ROW = 0.03;
const PARITY_PAD = 0.02;
const PARITY_EDGE = 0.03;
/** @param {number} x */
const clean = (x) => Math.round(x * 1e9) / 1e9;

/**
 * The display range a grey card at gameplay `level` must read in (BRIEF A15): within 0.03 of a DARK row's level, that
 * row's min / max +-0.02 (`row` = its index); otherwise the band's union range +-0.02 (`row` null). `skip` when the level
 * is within 0.03 (strictly, less a 1e-9 slack, so exactly 0.03 never skips) of a band edge. min clamped at 0, max at 1.
 * No interpolation.
 * @param {number} level
 * @returns {{ min: number, max: number, band: 'dark' | 'mid' | 'lit', row: number | null, skip: boolean }}
 */
export function parityRange(level) {
  const lo = /** @type {number} */ (BAND_EDGES[0]);
  const hi = /** @type {number} */ (BAND_EDGES[1]);
  /** @type {'dark' | 'mid' | 'lit'} */
  const band = level < lo ? 'dark' : level < hi ? 'mid' : 'lit';
  /** @type {number | null} */
  let row = null;
  let best = Infinity;
  DARK.forEach((r, i) => {
    const d = Math.abs(level - r.level);
    if (d <= PARITY_ROW + 1e-9 && d < best) {
      best = d;
      row = i;
    }
  });
  let min = Infinity;
  let max = -Infinity;
  if (row !== null) {
    min = DARK[row].min;
    max = DARK[row].max;
  } else {
    for (const r of DARK) {
      if (r.band !== band) continue;
      min = Math.min(min, r.min);
      max = Math.max(max, r.max);
    }
  }
  // 1e-9 slack: a level exactly 0.03 from an edge (0.25, 0.31, 0.57, 0.63) never skips, whatever the float rounding
  const skip = Math.abs(level - lo) < PARITY_EDGE - 1e-9 || Math.abs(level - hi) < PARITY_EDGE - 1e-9;
  return {
    min: clean(Math.max(0, min - PARITY_PAD)),
    max: clean(Math.min(1, max + PARITY_PAD)),
    band,
    row,
    skip,
  };
}

/** Spec tolerance floors (PLAN section 4; A13: final = max(floor, 4 x the VG7 spread)). */
export const FLOORS = Object.freeze({
  meanAbs: 0.03,
  meanRel: 0.2,
  nearBlack: 0.08,
  emd: 0.03,
  veil: 0.02,
  contrastDrop: 0.25,
  blotchRatio: 1.4,
  blotchAbs: 0.02,
  arcRatio: 1.5,
  arcAbs: 0.01,
});

/**
 * @param {string} key
 * @param {string} region
 * @param {string} metric
 * @param {number | null} base
 * @param {number} cur
 * @param {number | null} delta
 * @param {number} tol
 * @param {'drift' | 'rule'} kind
 * @param {string | null} known
 * @returns {Flag}
 */
function flag(key, region, metric, base, cur, delta, tol, kind, known) {
  return { key, region, metric, base, cur, delta, tol, kind, known };
}

/**
 * Drift flags of one region. `tol` on a flag is the |delta| threshold that was crossed (for `hist`, the emd floor).
 * @param {Flag[]} out
 * @param {string} key
 * @param {string} region
 * @param {RegionMetrics} b
 * @param {RegionMetrics} c
 * @param {Tolerances} tol
 */
function compareRegion(out, key, region, b, c, tol) {
  const dMean = c.mean - b.mean;
  const meanTol = Math.max(tol.meanAbs, tol.meanRel * b.mean);
  if (Math.abs(dMean) >= tol.meanAbs && Math.abs(dMean) >= tol.meanRel * b.mean) {
    out.push(flag(key, region, 'mean', b.mean, c.mean, dMean, meanTol, 'drift', null));
  }
  const dBlack = c.nearBlack - b.nearBlack;
  if (Math.abs(dBlack) >= tol.nearBlack) out.push(flag(key, region, 'nearBlack', b.nearBlack, c.nearBlack, dBlack, tol.nearBlack, 'drift', null));
  if (Array.isArray(b.hist) && Array.isArray(c.hist) && b.hist.length === c.hist.length) {
    const e = emd(b.hist, c.hist);
    if (e >= tol.emd) out.push(flag(key, region, 'hist', null, e, null, tol.emd, 'drift', null));
  }
  if (typeof b.veil === 'number' && typeof c.veil === 'number') {
    const d = c.veil - b.veil;
    if (Math.abs(d) >= tol.veil) out.push(flag(key, region, 'veil', b.veil, c.veil, d, tol.veil, 'drift', null));
  }
  if (typeof b.contrast === 'number' && typeof c.contrast === 'number') {
    if (c.contrast < b.contrast * (1 - tol.contrastDrop)) {
      out.push(flag(key, region, 'contrast', b.contrast, c.contrast, c.contrast - b.contrast, b.contrast * tol.contrastDrop, 'drift', null));
    }
  }
  if (typeof b.blotch === 'number' && typeof c.blotch === 'number') {
    const d = c.blotch - b.blotch;
    if (c.blotch > b.blotch * tol.blotchRatio && d > tol.blotchAbs) {
      out.push(flag(key, region, 'blotch', b.blotch, c.blotch, d, Math.max(b.blotch * (tol.blotchRatio - 1), tol.blotchAbs), 'drift', null));
    }
  }
  if (typeof b.arc === 'number' && typeof c.arc === 'number') {
    const d = c.arc - b.arc;
    if (c.arc > b.arc * tol.arcRatio && d > tol.arcAbs) {
      out.push(flag(key, region, 'arc', b.arc, c.arc, d, Math.max(b.arc * (tol.arcRatio - 1), tol.arcAbs), 'drift', null));
    }
  }
}

/**
 * Drift of one shot against its baseline: `whole` and every region present on both sides (a region missing on either
 * side is skipped). `leak` is never compared (absolute rules only).
 * @param {string} key
 * @param {ShotMetrics} base
 * @param {ShotMetrics} cur
 * @param {Tolerances} [tol]
 * @returns {Flag[]}
 */
export function compare(key, base, cur, tol = FLOORS) {
  /** @type {Flag[]} */
  const out = [];
  if (base.whole && cur.whole) compareRegion(out, key, 'whole', base.whole, cur.whole, tol);
  const br = base.regions ?? {};
  const cr = cur.regions ?? {};
  for (const name of Object.keys(br)) {
    const b = br[name];
    const c = cr[name];
    if (!b || !c) continue;
    compareRegion(out, key, name, b, c, tol);
  }
  return out;
}

/**
 * Absolute rules of one view. Rule key `<region>.<metric>`: region `whole`, `leak` (reads `cur.leak`) or a region
 * name. A rule whose `presets` lacks `preset` is skipped; null / absent bounds are skipped; a missing region or metric
 * is skipped (VG5 reports it).
 * @param {string} key
 * @param {{ rules: Record<string, Rule>, known: string | null }} item
 * @param {ShotMetrics} cur
 * @param {'low' | 'epic'} preset
 * @returns {Flag[]}
 */
export function checkRules(key, item, cur, preset) {
  /** @type {Flag[]} */
  const out = [];
  const known = item.known ?? null;
  for (const [rk, rule] of Object.entries(item.rules ?? {})) {
    if (!rule) continue;
    if (Array.isArray(rule.presets) && !rule.presets.includes(preset)) continue;
    const dot = rk.lastIndexOf('.');
    if (dot <= 0) continue;
    const region = rk.slice(0, dot);
    const metric = rk.slice(dot + 1);
    /** @type {Record<string, unknown> | undefined} */
    const src = region === 'whole' ? cur.whole : region === 'leak' ? cur.leak : cur.regions?.[region];
    if (!src) continue;
    const v = src[metric];
    if (typeof v !== 'number') continue;
    if (rule.min != null && v < rule.min) out.push(flag(key, region, metric, null, v, null, rule.min, 'rule', known));
    else if (rule.max != null && v > rule.max) out.push(flag(key, region, metric, null, v, null, rule.max, 'rule', known));
  }
  return out;
}
