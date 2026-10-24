import { describe, expect, it } from 'vitest';
import { DARK_TARGETS } from '../src/world/darkCurve';
import {
  lumaFromRgba, fullMask, maskFromPolygon, erode, stats, emd, haze, blotch, arc, leak, measure, DARK, BAND_EDGES, parityRange, FLOORS, compare, checkRules,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/visual-gate/metrics.mjs';

interface Img { w: number; h: number; luma: Uint8Array }

const W = 256;
const H = 160;

/** A luma image from f(x, y) on 0..255 (rounded, clamped). */
function img(w: number, h: number, f: (x: number, y: number) => number): Img {
  const luma = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) luma[y * w + x] = Math.max(0, Math.min(255, Math.round(f(x, y))));
  return { w, h, luma };
}

/** Deterministic PRNG 0..1. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const count = (m: Uint8Array) => m.reduce((s, v) => s + v, 0);
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const flat = (v: number) => img(W, H, () => v);
const rectMask = (x0: number, y0: number, x1: number, y1: number) => maskFromPolygon(W, H, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);

describe('lumaFromRgba', () => {
  it('gives Rec. 709 luma of pure red / green / blue / white', () => {
    const rgba = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 0, 0, 0, 255, 128, 255, 255, 255, 255]);
    const out = lumaFromRgba(rgba, 4, 1);
    expect(out.w).toBe(4);
    expect(out.h).toBe(1);
    expect(Array.from(out.luma)).toEqual([54, 182, 18, 255]);
    expect(Array.from(lumaFromRgba(new Uint8ClampedArray(rgba), 2, 2).luma)).toEqual([54, 182, 18, 255]);
  });
});

describe('masks', () => {
  it('fullMask is all 1', () => {
    expect(count(fullMask(W, H))).toBe(W * H);
  });

  it('an axis-aligned rect gives exactly its pixel count', () => {
    expect(count(rectMask(10, 20, 50, 60))).toBe(40 * 40);
    expect(count(rectMask(10.2, 20.4, 50.4, 60.1))).toBe(40 * 40); // centres 10.5..49.5, 20.5..59.5
  });

  it('a 30 deg rotated square is within 2% of its area', () => {
    const c = Math.cos(Math.PI / 6);
    const s = Math.sin(Math.PI / 6);
    const half = 40;
    const pts = [[-half, -half], [half, -half], [half, half], [-half, half]].map(([x, y]) => [128 + x! * c - y! * s, 80 + x! * s + y! * c]);
    const n = count(maskFromPolygon(W, H, pts));
    expect(Math.abs(n - 80 * 80) / (80 * 80)).toBeLessThan(0.02);
  });

  it('a polygon half off-screen is clipped to its on-screen part', () => {
    expect(count(rectMask(-20, 10, 30, 50))).toBe(30 * 40);
    expect(count(rectMask(200, -40, 300, 20))).toBe(56 * 20);
    expect(count(rectMask(-100, -100, 1000, 1000))).toBe(W * H);
  });

  it('fewer than 3 points gives an empty mask', () => {
    expect(count(maskFromPolygon(W, H, [[0, 0], [100, 100]]))).toBe(0);
    expect(count(maskFromPolygon(W, H, []))).toBe(0);
  });

  it('erode shrinks a 20 x 20 square by 3 to 14 x 14; r 0 is identity; the image edge counts as outside', () => {
    const sq = rectMask(50, 50, 70, 70);
    const e = erode(sq, W, H, 3);
    expect(count(e)).toBe(14 * 14);
    expect(e[53 * W + 53]).toBe(1);
    expect(e[52 * W + 53]).toBe(0);
    expect(e[66 * W + 66]).toBe(1);
    expect(e[67 * W + 66]).toBe(0);
    expect(Array.from(erode(sq, W, H, 0))).toEqual(Array.from(sq));
    expect(count(erode(fullMask(W, H), W, H, 24))).toBe((W - 48) * (H - 48));
  });
});

describe('stats', () => {
  it('flat grey 128', () => {
    const s = stats(flat(128), fullMask(W, H));
    expect(s.n).toBe(W * H);
    expect(s.mean).toBeCloseTo(128 / 255, 9);
    expect(s.p5).toBe(s.p50);
    expect(s.p50).toBe(s.p95);
    expect(s.p50).toBeCloseTo(128 / 255, 9);
    expect(s.nearBlack).toBe(0);
    expect(s.hist).toHaveLength(32);
    expect(sum(s.hist)).toBeCloseTo(1, 9);
    expect(s.hist[16]).toBe(1);
  });

  it('25% of pixels at 5 -> nearBlack 0.25; percentiles by rank; hist sums to 1', () => {
    const s = stats(img(W, H, (x) => (x < W / 4 ? 5 : 200)), fullMask(W, H));
    expect(s.nearBlack).toBeCloseTo(0.25, 9);
    expect(s.p5).toBeCloseTo(5 / 255, 9);
    expect(s.p50).toBeCloseTo(200 / 255, 9);
    expect(sum(s.hist)).toBeCloseTo(1, 9);
    expect(s.hist[0]).toBeCloseTo(0.25, 9);
    expect(s.hist[31]).toBe(0); // 200 / 255 * 32 = 25.1
    expect(s.hist[25]).toBeCloseTo(0.75, 9);
  });

  it('counts mask pixels only; an empty mask gives n 0 and a zero hist', () => {
    const im = img(W, H, (x) => (x < 128 ? 0 : 255));
    const s = stats(im, rectMask(128, 0, 256, 160));
    expect(s.n).toBe(128 * 160);
    expect(s.mean).toBe(1);
    expect(s.hist[31]).toBe(1);
    const z = stats(im, new Uint8Array(W * H));
    expect(z.n).toBe(0);
    expect(sum(z.hist)).toBe(0);
  });
});

describe('emd', () => {
  const a = Array.from({ length: 32 }, (_, i) => (i < 10 ? 1 : 0));
  const b = Array.from({ length: 32 }, (_, i) => (i >= 20 ? 3 : 0));
  it('identical -> 0; all mass bin 0 vs bin 31 -> 1; symmetric; normalises first', () => {
    expect(emd(a, a)).toBe(0);
    expect(emd(a, a.map((v) => v * 7))).toBeCloseTo(0, 12);
    const first = Array.from({ length: 32 }, (_, i) => (i === 0 ? 1 : 0));
    const last = Array.from({ length: 32 }, (_, i) => (i === 31 ? 1 : 0));
    expect(emd(first, last)).toBeCloseTo(1, 12);
    expect(emd(a, b)).toBeCloseTo(emd(b, a), 12);
    expect(emd(a, b)).toBeGreaterThan(0);
  });
  it('throws on unequal lengths', () => {
    expect(() => emd([1, 0], [1, 0, 0])).toThrow();
  });
});

describe('haze', () => {
  it('flat grey -> veil = grey, contrast ~0', () => {
    const h = haze(flat(90), fullMask(W, H));
    expect(h.veil).toBeCloseTo(90 / 255, 9);
    expect(h.contrast).toBeLessThan(1e-6);
  });

  it('a 50% white fog over stripes lifts veil and drops contrast', () => {
    const stripes = (x: number) => (Math.floor(x / 4) % 2 ? 120 : 30);
    const clear = img(W, H, stripes);
    const fog = img(W, H, (x) => stripes(x) + (255 - stripes(x)) * 0.5);
    const m = fullMask(W, H);
    const a = haze(clear, m);
    const b = haze(fog, m);
    expect(b.veil).toBeGreaterThan(a.veil + 0.2);
    expect(a.contrast).toBeGreaterThan(0.1);
    expect(b.contrast).toBeLessThan(a.contrast * 0.5);
  });
});

describe('blotch', () => {
  const ramp = (x: number) => 40 + (x / (W - 1)) * 160;
  const lumps = (x: number, y: number) => {
    let v = 0;
    for (let cy = 20; cy < H; cy += 60) for (let cx = 20; cx < W; cx += 60) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / 20; // 40 px lumps
      v += 20 * (1 - smooth(d));
    }
    return v;
  };
  const m = fullMask(W, H);
  const rampB = blotch(img(W, H, ramp), m);
  const lumpB = blotch(img(W, H, (x, y) => ramp(x) + lumps(x, y)), m);
  const checker = blotch(img(W, H, (x, y) => ramp(x) + ((Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? 6 : -6)), m);

  it('flat -> ~0; a linear ramp -> ~0', () => {
    expect(blotch(flat(120), m)).toBeLessThan(0.002);
    expect(rampB).toBeLessThan(0.005);
  });

  it('soft 40 px lumps on the ramp -> clearly up; fine 2 px checker noise -> small', () => {
    expect(lumpB).toBeGreaterThan(5 * rampB);
    expect(lumpB).toBeGreaterThan(0.01);
    expect(checker).toBeLessThan(lumpB / 3);
  });

  it('an eroded-away mask -> 0', () => {
    expect(blotch(img(W, H, (x, y) => lumps(x, y)), rectMask(0, 0, 40, 40))).toBe(0);
  });
});

describe('arc', () => {
  const disc = (edge: number) => (x: number, y: number) => {
    const d = Math.sqrt((x - 128) ** 2 + (y - 80) ** 2) - 50;
    if (edge === 0) return d < 0 ? 140 : 40;
    return 40 + 100 * (1 - smooth(d / edge + 0.5));
  };
  const m = fullMask(W, H);
  const hard = arc(img(W, H, disc(0)), m);

  it('flat -> 0; a hard-edged disc -> > 0', () => {
    expect(arc(flat(100), m)).toBe(0);
    expect(hard).toBeGreaterThan(0.005);
  });

  it('a 40 px smoothstep edge -> ~0; uniform noise +-8 -> ~0', () => {
    expect(arc(img(W, H, disc(40)), m)).toBeLessThan(hard / 10);
    const r = rng(7);
    expect(arc(img(W, H, () => 100 + (r() * 2 - 1) * 8), m)).toBeLessThan(hard / 10);
  });

  it('an empty mask -> 0', () => {
    expect(arc(img(W, H, disc(0)), new Uint8Array(W * H))).toBe(0);
  });

  // a straight hard edge through the centre at `deg` from the x axis, S levels high (vg1-check polish 1)
  const line = (deg: number, s: number, soft = 0) => {
    const c = Math.cos((deg * Math.PI) / 180);
    const sn = Math.sin((deg * Math.PI) / 180);
    return img(W, H, (x, y) => {
      const d = -(x - 128) * sn + (y - 80) * c;
      if (soft === 0) return d < 0 ? 40 + s : 40;
      return 40 + s * (1 - smooth(d / soft + 0.5));
    });
  };

  it('a straight hard edge (S = 60) at 25 and 64 deg -> > 0 (no blind orientation sector)', () => {
    expect(arc(line(25, 60), m)).toBeGreaterThan(0.005);
    expect(arc(line(64, 60), m)).toBeGreaterThan(0.005);
    for (let deg = 0; deg <= 90; deg += 5) expect(arc(line(deg, 60), m)).toBeGreaterThan(0.005);
  });

  it('the same slanted edges soft (40 px smoothstep) -> 0', () => {
    expect(arc(line(25, 60, 40), m)).toBe(0);
    expect(arc(line(64, 60, 40), m)).toBe(0);
  });
});

describe('leak', () => {
  const off = img(W, H, (x) => 30 + (x % 7));
  const on = img(W, H, (x, y) => 30 + (x % 7) + (x >= 100 && x < 120 && y >= 60 && y < 80 ? 60 : 0) - (x < 20 ? 25 : 0));

  it('on = off -> 0 / 0', () => {
    expect(leak(off, off, fullMask(W, H))).toEqual({ mean: 0, p95: 0 });
  });

  it('a lit 20 x 20 patch: mean = share x 60/255, p95 by the share; negative differences count 0', () => {
    const all = leak(on, off, fullMask(W, H));
    expect(all.mean).toBeCloseTo((400 / (W * H)) * (60 / 255), 9);
    expect(all.p95).toBe(0); // the patch is under 5% of the frame
    const near = leak(on, off, rectMask(95, 55, 125, 85)); // 30 x 30 holding the patch: 44%
    expect(near.mean).toBeCloseTo((400 / 900) * (60 / 255), 9);
    expect(near.p95).toBeCloseTo(60 / 255, 9);
  });

  it('throws on a size mismatch', () => {
    expect(() => leak(on, img(W, H - 1, () => 0), fullMask(W, H))).toThrow();
  });
});

describe('measure', () => {
  it('whole and each region; haze adds veil / contrast only where asked', () => {
    const im = img(W, H, (x, y) => 40 + x / 2 + (y % 9));
    const out = measure(im, { wall: rectMask(0, 0, 256, 80), upper: rectMask(0, 80, 256, 160), floor: rectMask(50, 50, 100, 100) }, { wall: ['blotch', 'arc'], upper: ['haze'] });
    expect(Object.keys(out).sort()).toEqual(['regions', 'whole']);
    expect(out.whole.n).toBe(W * H);
    expect(Object.keys(out.regions).sort()).toEqual(['floor', 'upper', 'wall']);
    expect(typeof out.regions.upper.veil).toBe('number');
    expect(typeof out.regions.upper.contrast).toBe('number');
    expect(out.regions.wall.veil).toBeUndefined();
    expect(typeof out.regions.wall.blotch).toBe('number');
    expect(typeof out.regions.wall.arc).toBe('number');
    expect(out.regions.floor.veil).toBeUndefined();
    expect(out.regions.floor.blotch).toBeUndefined();
    expect(out.regions.floor.n).toBe(50 * 50);
    expect(out.leak).toBeUndefined();
  });
});

describe('parity', () => {
  it('DARK mirrors DARK_TARGETS; BAND_EDGES are LIGHT.shadow / LIGHT.lit', () => {
    expect(DARK).toEqual(DARK_TARGETS);
    expect(BAND_EDGES).toEqual([0.28, 0.6]);
    expect(Object.isFrozen(DARK)).toBe(true);
    expect(Object.isFrozen(FLOORS)).toBe(true);
  });

  it('the 4 table levels give their row +-0.02, clamped', () => {
    DARK_TARGETS.forEach((r, i) => {
      const p = parityRange(r.level);
      expect(p.row).toBe(i);
      expect(p.min).toBeCloseTo(Math.max(0, r.min - 0.02), 9);
      expect(p.max).toBeCloseTo(Math.min(1, r.max + 0.02), 9);
    });
    expect(parityRange(0.12)).toMatchObject({ min: 0, max: 0.06, band: 'dark', row: 0, skip: false });
    expect(parityRange(0.7)).toMatchObject({ min: 0.43, max: 1, band: 'lit', row: 3, skip: false });
    expect(parityRange(0.42)).toMatchObject({ row: 2 }); // within 0.03 of 0.4
  });

  it('off-row levels take the band union +-0.02; near a band edge they skip', () => {
    expect(parityRange(0.5)).toMatchObject({ min: 0.1, max: 0.37, band: 'mid', row: null, skip: false });
    expect(parityRange(0.2)).toMatchObject({ min: 0, max: 0.11, band: 'dark', row: null, skip: false });
    expect(parityRange(0.9)).toMatchObject({ min: 0.43, max: 1, band: 'lit', row: null, skip: false });
    expect(parityRange(0.27).skip).toBe(true);
    expect(parityRange(0.29).skip).toBe(true);
    expect(parityRange(0.61).skip).toBe(true);
    expect(parityRange(0.4).skip).toBe(false);
  });

  it('levels exactly 0.03 from a band edge never skip, on repeat and under +-1e-12 (1e-9 slack)', () => {
    for (const l of [0.25, 0.31, 0.57, 0.63]) {
      const p = parityRange(l);
      expect(p.skip).toBe(false);
      expect(parityRange(l)).toEqual(p);
      expect(parityRange(l + 1e-12)).toEqual(p);
      expect(parityRange(l - 1e-12)).toEqual(p);
    }
  });
});

describe('shared passes and the quantised arc median (vg1p cost)', () => {
  const m = fullMask(W, H);
  const ramp = (x: number) => 40 + (x / (W - 1)) * 160;
  const lumps = (x: number, y: number) => {
    let v = 0;
    for (let cy = 20; cy < H; cy += 60) for (let cx = 20; cx < W; cx += 60) v += 20 * (1 - smooth(Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / 20));
    return v;
  };
  const disc = (x: number, y: number) => (Math.sqrt((x - 128) ** 2 + (y - 80) ** 2) < 50 ? 140 : 40);
  const stripes = (x: number) => (Math.floor(x / 4) % 2 ? 120 : 30);
  const r = rng(11);
  // dense edges + noise: the arc median is far above the 1.5 / 255 floor bin, so the exact in-bin select runs
  const busy = img(W, H, (x, y) => disc(x, y) + 60 * Math.sin(x / 3) * Math.cos(y / 5) + (r() * 2 - 1) * 20);

  it('outputs match the pre-polish full-sort / separate-blur values within 1e-6', () => {
    expect(blotch(img(W, H, ramp), m)).toBeCloseTo(0.0004224105354699218, 6);
    expect(blotch(img(W, H, (x, y) => ramp(x) + lumps(x, y)), m)).toBeCloseTo(0.02554016879711311, 6);
    expect(arc(img(W, H, disc), m)).toBeCloseTo(0.02998046875, 6);
    expect(arc(busy, m)).toBeCloseTo(0.000244140625, 6);
    const hz = haze(img(W, H, stripes), m);
    expect(hz.veil).toBeCloseTo(0.11764705882352941, 6);
    expect(hz.contrast).toBeCloseTo(0.18148821543652005, 6);
    expect(haze(img(W, H, (x) => stripes(x) + (255 - stripes(x)) * 0.5), m).contrast).toBeCloseTo(0.04331504217710173, 6);
  });

  it('measure (one shared table / blur, veil from the region stats) equals the standalone metrics on 3 images', () => {
    const masks = { full: m, wall: rectMask(0, 0, 200, 120), upper: rectMask(30, 60, 256, 160), empty: new Uint8Array(W * H) };
    const want = { full: ['haze', 'blotch', 'arc'], wall: ['arc', 'blotch'], upper: ['haze', 'arc'], empty: ['haze', 'arc', 'blotch'] };
    for (const im of [img(W, H, (x, y) => ramp(x) + lumps(x, y)), img(W, H, disc), busy]) {
      const out = measure(im, masks, want);
      for (const [name, metrics] of Object.entries(want)) {
        const mask = masks[name as keyof typeof masks];
        const reg = out.regions[name];
        expect(reg).toMatchObject(stats(im, mask));
        for (const metric of metrics) {
          if (metric === 'haze') expect({ veil: reg.veil, contrast: reg.contrast }).toEqual(haze(im, mask));
          else if (metric === 'blotch') expect(reg.blotch).toBe(blotch(im, mask));
          else expect(reg.arc).toBe(arc(im, mask));
        }
      }
    }
  });
});

type Region = Record<string, unknown> & { mean: number; nearBlack: number; hist: number[] };
const hist = (bin: number) => Array.from({ length: 32 }, (_, i) => (i === bin ? 1 : 0));
const region = (extra: Partial<Region> = {}): Region => ({ n: 100, mean: 0.1, p5: 0, p50: 0.1, p95: 0.2, nearBlack: 0.1, hist: hist(3), ...extra });
const shot = (whole: Partial<Region> = {}, regions: Record<string, Region> = {}, lk?: { mean: number; p95: number }) => ({ whole: region(whole), regions, ...(lk ? { leak: lk } : {}) });

describe('compare', () => {
  it('identical -> []', () => {
    const s = shot({}, { wall: region({ blotch: 0.02, arc: 0.01, veil: 0.1, contrast: 0.5 }) });
    expect(compare('v@low', s, s)).toEqual([]);
  });

  it('mean: both the absolute and the relative floor', () => {
    const f = compare('v@low', shot({ mean: 0.1 }), shot({ mean: 0.15 }));
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ key: 'v@low', region: 'whole', metric: 'mean', base: 0.1, cur: 0.15, kind: 'drift', known: null });
    expect(f[0].delta).toBeCloseTo(0.05, 9);
    expect(f[0].tol).toBeCloseTo(0.03, 9);
    expect(compare('v@low', shot({ mean: 0.1 }), shot({ mean: 0.125 }))).toEqual([]);
    expect(compare('v@low', shot({ mean: 0.5 }), shot({ mean: 0.55 }))).toEqual([]); // 10% < 20%
  });

  it('nearBlack, veil, contrast drop', () => {
    expect(compare('k', shot({ nearBlack: 0.1 }), shot({ nearBlack: 0.2 }))[0]).toMatchObject({ metric: 'nearBlack', tol: 0.08 });
    const b = shot({}, { up: region({ veil: 0.1, contrast: 0.5 }) });
    const c = shot({}, { up: region({ veil: 0.13, contrast: 0.35 }) });
    const f = compare('k', b, c);
    expect(f.map((x: { metric: string }) => x.metric).sort()).toEqual(['contrast', 'veil']);
    expect(compare('k', b, shot({}, { up: region({ veil: 0.11, contrast: 0.4 }) }))).toEqual([]);
  });

  it('blotch x1.5 but +0.01 -> none; x1.5 and +0.03 -> flag; arc likewise', () => {
    expect(compare('k', shot({}, { w: region({ blotch: 0.02 }) }), shot({}, { w: region({ blotch: 0.03 }) }))).toEqual([]);
    expect(compare('k', shot({}, { w: region({ blotch: 0.06 }) }), shot({}, { w: region({ blotch: 0.09 }) }))[0]).toMatchObject({ metric: 'blotch', region: 'w' });
    expect(compare('k', shot({}, { w: region({ arc: 0.004 }) }), shot({}, { w: region({ arc: 0.008 }) }))).toEqual([]);
    expect(compare('k', shot({}, { w: region({ arc: 0.01 }) }), shot({}, { w: region({ arc: 0.03 }) }))[0]).toMatchObject({ metric: 'arc' });
  });

  it('hist emd >= 0.03 -> flag metric hist (base null, cur = the emd)', () => {
    const f = compare('k', shot({ hist: hist(3) }), shot({ hist: hist(4) }));
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ metric: 'hist', base: null, delta: null, tol: 0.03 });
    expect(f[0].cur).toBeCloseTo(1 / 31, 9);
  });

  it('a region missing on one side -> none; leak differences -> none', () => {
    expect(compare('k', shot({}, { w: region({ mean: 0.1 }) }), shot({}, {}))).toEqual([]);
    expect(compare('k', shot({}, {}), shot({}, { w: region({ mean: 0.9 }) }))).toEqual([]);
    expect(compare('k', shot({}, {}, { mean: 0, p95: 0 }), shot({}, {}, { mean: 0.5, p95: 0.9 }))).toEqual([]);
  });

  it('takes custom tolerances', () => {
    expect(compare('k', shot({ mean: 0.1 }), shot({ mean: 0.15 }), { ...FLOORS, meanAbs: 0.1 })).toEqual([]);
  });
});

describe('checkRules', () => {
  const cur = shot({ nearBlack: 0.3 }, { wall: region({ blotch: 0.06 }) }, { mean: 0.005, p95: 0.01 });

  it('a preset-limited rule flags only at its preset', () => {
    const item = { rules: { 'wall.blotch': { max: 0.05, presets: ['low'] } }, known: null };
    const f = checkRules('m-a3-lobby@low', item, cur, 'low');
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ key: 'm-a3-lobby@low', region: 'wall', metric: 'blotch', base: null, cur: 0.06, delta: null, tol: 0.05, kind: 'rule', known: null });
    expect(checkRules('m-a3-lobby@epic', item, cur, 'epic')).toEqual([]);
  });

  it('null / absent bounds -> none; a min bound flags low values', () => {
    expect(checkRules('k', { rules: { 'wall.blotch': { max: null } }, known: null }, cur, 'low')).toEqual([]);
    expect(checkRules('k', { rules: { 'wall.blotch': {} }, known: null }, cur, 'low')).toEqual([]);
    expect(checkRules('k', { rules: { 'whole.nearBlack': { min: 0.4, max: 0.5 } }, known: null }, cur, 'epic')[0]).toMatchObject({ region: 'whole', metric: 'nearBlack', tol: 0.4 });
  });

  it('leak.mean reads cur.leak and carries known through', () => {
    const f = checkRules('so-corner@epic', { rules: { 'leak.mean': { max: 0.004 } }, known: 'F5b' }, cur, 'epic');
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ region: 'leak', metric: 'mean', cur: 0.005, tol: 0.004, known: 'F5b', kind: 'rule' });
  });

  it('a missing region, metric or leak -> none', () => {
    expect(checkRules('k', { rules: { 'door.blotch': { max: 0 } }, known: null }, cur, 'low')).toEqual([]);
    expect(checkRules('k', { rules: { 'wall.arc': { max: 0 } }, known: null }, cur, 'low')).toEqual([]);
    expect(checkRules('k', { rules: { 'leak.mean': { max: 0 } }, known: null }, shot(), 'low')).toEqual([]);
  });
});
