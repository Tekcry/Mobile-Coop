import { deflateSync, inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { darkPatches, decodePng, DARK_DIFF, type Rgba } from '../src/operators/bakeDiff';
import { BACKFACE_VIEWS, bakeDiffCheck, DARK_PATCH_LIMIT, darkPatchLimit, lodReportChecks, SHELL_DARK_LIMIT, staleViews, type BackFaceView, type DarkPatchView } from '../src/operators/lodChecks';

/** A w x h figure of grey `g` (fully covered, alpha 255) with a transparent 4 px border. */
function figure(w: number, h: number, g: number): Rgba {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const inside = x >= 4 && y >= 4 && x < w - 4 && y < h - 4;
      data.set(inside ? [g, g, g, 255] : [0, 0, 0, 0], i);
    }
  }
  return { width: w, height: h, data };
}

function paint(im: Rgba, pts: [number, number][], g: number): Rgba {
  const data = im.data.slice();
  for (const [x, y] of pts) data.set([g, g, g, 255], (y * im.width + x) * 4);
  return { ...im, data };
}

/** An 8-bit RGBA PNG of `im`, every row with filter `filter` (0 none, 1 sub, 2 up). */
function png(im: Rgba, filter: number): Uint8Array {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const chunk = (tag: string, body: Uint8Array): Uint8Array => {
    const out = new Uint8Array(12 + body.length);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, body.length);
    out.set([...tag].map((c) => c.charCodeAt(0)), 4);
    out.set(body, 8);
    let c = 0xffffffff;
    for (const b of out.subarray(4, 8 + body.length)) c = crcTable[(c ^ b) & 255]! ^ (c >>> 8);
    dv.setUint32(8 + body.length, (c ^ 0xffffffff) >>> 0);
    return out;
  };
  const ihdr = new Uint8Array(13);
  const hv = new DataView(ihdr.buffer);
  hv.setUint32(0, im.width);
  hv.setUint32(4, im.height);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const stride = im.width * 4;
  const raw = new Uint8Array((stride + 1) * im.height);
  for (let y = 0; y < im.height; y++) {
    raw[y * (stride + 1)] = filter;
    for (let x = 0; x < stride; x++) {
      const v = im.data[y * stride + x]!;
      const a = x >= 4 ? im.data[y * stride + x - 4]! : 0;
      const b = y > 0 ? im.data[(y - 1) * stride + x]! : 0;
      raw[y * (stride + 1) + 1 + x] = (v - (filter === 1 ? a : filter === 2 ? b : 0)) & 255;
    }
  }
  const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', new Uint8Array(deflateSync(raw))), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

const inflate = (b: Uint8Array): Uint8Array => new Uint8Array(inflateSync(b));

describe('decodePng', () => {
  const im = paint(figure(12, 10, 120), [[5, 5], [6, 6]], 30);
  for (const f of [0, 1, 2]) {
    it(`round-trips an RGBA PNG (filter ${f})`, () => {
      const d = decodePng(png(im, f), inflate);
      expect(d.width).toBe(12);
      expect(d.height).toBe(10);
      expect([...d.data]).toEqual([...im.data]);
    });
  }
});

describe('darkPatches (A76)', () => {
  const hero = figure(64, 64, 128);
  it('counts nothing for the same render, or one a little lighter or darker', () => {
    expect(darkPatches(hero, hero).largest).toBe(0);
    expect(darkPatches(hero, figure(64, 64, 128 - Math.floor(DARK_DIFF * 255) + 4)).px).toBe(0);
  });
  it('finds a dark diagonal slash as one patch', () => {
    const slash: [number, number][] = [];
    for (let i = 10; i < 50; i++) slash.push([i, i], [i + 1, i]);
    const r = darkPatches(hero, paint(hero, slash, 20));
    expect(r.largest).toBe(80);
    expect(r.at).toEqual([10, 10]);
  });
  it('tolerates a dark crease that moved a few pixels (the radius)', () => {
    const crease = (x: number): [number, number][] => Array.from({ length: 40 }, (_, i) => [x, 12 + i] as [number, number]);
    const h = paint(hero, crease(30), 20);
    expect(darkPatches(h, paint(hero, crease(33), 20)).largest).toBe(0);
    expect(darkPatches(h, paint(hero, crease(40), 20)).largest).toBe(40);
  });
  it('ignores pixels the hero does not cover around (the outline is IoU work)', () => {
    expect(darkPatches(hero, paint(hero, [[5, 5], [5, 6]], 0)).px).toBe(0);
  });
});

describe('bakeDiffCheck (A76)', () => {
  const views = (largest: number): Record<string, DarkPatchView> =>
    Object.fromEntries(BACKFACE_VIEWS.map((v) => [v, { px: largest, largest, at: [0, 0] as [number, number] }]));
  it('passes within every view limit and skips the hero', () => {
    expect(bakeDiffCheck('hero', undefined)).toEqual([]);
    expect(bakeDiffCheck('lod1', views(20))[0]!.pass).toBe(true);
  });
  it('fails the round-2 holster slashes and radio wedge (side 31-40 px, back 146-151 px)', () => {
    const side = { ...views(10), side: { px: 76, largest: 32, at: [228, 514] as [number, number] } };
    const back = { ...views(10), back: { px: 221, largest: 146, at: [200, 248] as [number, number] } };
    expect(bakeDiffCheck('lod2', side)[0]!.pass).toBe(false);
    expect(bakeDiffCheck('lod2', back)[0]!.pass).toBe(false);
    expect(DARK_PATCH_LIMIT.side).toBeLessThan(31);
    expect(DARK_PATCH_LIMIT.back).toBeLessThan(146);
  });
  it('fails a view that was not measured', () => {
    const { side: _side, ...rest } = views(5);
    const c = bakeDiffCheck('lod0', rest)[0]!;
    expect(c.pass).toBe(false);
    expect(c.value).toEqual(['side: not measured']);
  });
  it('holds the shells to 24 px in every view; the loose limits are LOD0 only (fix round 3)', () => {
    expect(SHELL_DARK_LIMIT).toBe(24);
    for (const v of BACKFACE_VIEWS) {
      for (const lod of ['lod1', 'lod2']) expect(darkPatchLimit(lod, v)).toBe(24);
      expect(darkPatchLimit('lod0', v)).toBe(DARK_PATCH_LIMIT[v]);
    }
    // round-2 shell defects the old per-view limits let through: LOD1 chest notch 36, LOD2 pouch tear 47
    expect(bakeDiffCheck('lod1', { ...views(10), chest: { px: 40, largest: 36, at: [404, 347] } })[0]!.pass).toBe(false);
    expect(bakeDiffCheck('lod2', { ...views(10), chest: { px: 60, largest: 47, at: [255, 273] } })[0]!.pass).toBe(false);
    // the LOD0 toe streaks (367 px; 431 after the 08a retry) fail since the step 10 retry: every LOD0 view is 24 px
    expect(bakeDiffCheck('lod0', { ...views(10), boot: { px: 400, largest: 367, at: [189, 373] } })[0]!.pass).toBe(false);
    expect(bakeDiffCheck('lod0', { ...views(10), boot: { px: 30, largest: 24, at: [189, 373] } })[0]!.pass).toBe(true);
    expect(bakeDiffCheck('lod2', { ...views(10), boot: { px: 400, largest: 367, at: [189, 373] } })[0]!.pass).toBe(false);
    expect(BACKFACE_VIEWS.filter((v) => DARK_PATCH_LIMIT[v] > 24)).toEqual([]);
    expect(bakeDiffCheck('lod2', views(25))[0]!.pass).toBe(false);
    expect(bakeDiffCheck('lod2', views(24))[0]!.pass).toBe(true);
  });
  it('measures the holster close-up and holds it to 24 px at every level', () => {
    expect(BACKFACE_VIEWS).toContain('holster');
    expect(DARK_PATCH_LIMIT.holster).toBe(24);
    const c = bakeDiffCheck('lod0', { ...views(10), holster: { px: 30, largest: 25, at: [300, 280] } })[0]!;
    expect(c.pass).toBe(false);
    const { holster: _h, ...rest } = views(5);
    expect(bakeDiffCheck('lod1', rest)[0]!.value).toEqual(['holster: not measured']);
  });
  it('fails "stale" when a render is older than its GLB (bakeDiff and backFaces)', () => {
    const t = (ms: number) => Object.fromEntries(BACKFACE_VIEWS.map((v) => [v, ms]));
    expect(staleViews(1000, 1000, t(2000), t(2000))).toEqual([]);
    expect(staleViews(3000, 1000, t(2000), t(2000))).toEqual([...BACKFACE_VIEWS]);
    expect(staleViews(1000, 3000, t(2000), { ...t(4000), side: 2000 })).toEqual(['side']);
    expect(staleViews(1000, 1000, { front: 500 }, {})).toEqual(['front']);
    const bd = bakeDiffCheck('lod1', views(5), ['front'])[0]!;
    expect(bd.pass).toBe(false);
    expect(String((bd.value as string[])[0])).toMatch(/^front: stale/);
    const bv = (px: number): Record<string, BackFaceView> => Object.fromEntries(BACKFACE_VIEWS.map((v) => [v, { px, figurePx: 100_000 }]));
    const bf = lodReportChecks('lod1', { openEdgeM: 1 }, { openEdgeM: 35 }, { hero: bv(0), lod1: bv(0) }, ['back']).find((c) => c.name === 'backFaces')!;
    expect(bf.pass).toBe(false);
    expect(lodReportChecks('lod1', { openEdgeM: 1 }, { openEdgeM: 35 }, { hero: bv(0), lod1: bv(0) }).find((c) => c.name === 'backFaces')!.pass).toBe(true);
  });
});
