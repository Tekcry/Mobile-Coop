// Guard heads, pure half (scripts/operators/guardHeadCheck.mjs): budgets, job outputs, report and envelope checks.
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs build script without types
import * as hc from '../scripts/operators/guardHeadCheck.mjs';

type Kit = Record<string, unknown>;
type Fn<A extends unknown[], R> = (...a: A) => R;
const eyeTris = hc.eyeTris as Fn<[string], number>;
const headBudgets = hc.headBudgets as Fn<[Kit, string], {
  head: Record<string, number>; target: Record<string, number>; eyesLod0: number; eyesPerLod: Record<string, number>;
}>;
const capStyles = hc.capStyles as Fn<[Kit, string], string[]>;
const envelopeJob = hc.envelopeJob as Fn<[Kit, string], string | null>;
const headJobOutputs = hc.headJobOutputs as Fn<[Kit, string], string[]>;
const checkHeadReport = hc.checkHeadReport as Fn<[Record<string, unknown>, Kit], string[]>;
const checkCapsReport = hc.checkCapsReport as Fn<[Record<string, unknown>, Kit], string[]>;
const checkEnvelope = hc.checkEnvelope as Fn<[Record<string, unknown>, Kit], string[]>;

const CAPS = ['buzz', 'crop', 'sidepart', 'receding', 'fade', 'bald'];
/** The kit sections build_head.py reads (shape of scripts/operators/data/guards.json, SPEC 7). */
function kit(): Kit {
  const tris = [4000, 1200, 400];
  return {
    atlas: { faceTile: [1024, 512, 128] },
    face: { envelopeOffset: 0.015, eyes: { tris: [500, 0, 0] }, irises: ['brown', 'darkbrown', 'hazel', 'bluegrey'] },
    bases: [{ id: 'average', refHeight: 1.77 }, { id: 'lean', refHeight: 1.76 }, { id: 'broad', refHeight: 1.825 }],
    heads: [
      ...[1, 2, 3, 4].map((i) => ({ id: `average-${i}`, base: 'average', tris, iris: 'brown' })),
      ...[1, 2, 3, 4].map((i) => ({ id: `lean-${i}`, base: 'lean', tris, iris: 'hazel' })),
      { id: 'broad-1', base: 'broad', tris, iris: 'darkbrown' },
    ],
    hairCaps: [
      { id: 'buzz', tris: [500, 200, 0], offset: 0.002 }, { id: 'crop', tris: [800, 250, 0], offset: 0.006 },
      { id: 'sidepart', tris: [1000, 300, 0], offset: 0.012 }, { id: 'receding', tris: [800, 250, 0], offset: 0.006 },
      { id: 'fade', tris: [700, 250, 0], offset: 0.003 }, { id: 'bald', tris: [0, 0, 0], offset: 0 },
    ],
    kinds: [
      { id: 'grunt', base: 'average', hairCaps: CAPS }, { id: 'runner', base: 'lean', hairCaps: ['buzz', 'bald'] },
      { id: 'sniper', base: 'lean', hairCaps: ['fade', 'buzz'] }, { id: 'heavy', base: 'broad', hairCaps: [] },
    ],
  };
}

function headReport(over: Record<string, unknown> = {}) {
  return {
    head: 'average-1', base: 'average', iris: 'brown',
    tris: { head: { lod0: 4000, lod1: 1196, lod2: 400 }, eyes: { lod0: 448, lod1: 96, lod2: 48 } },
    seam: { loopVerts: 42, keptVerts: { lod0: 42, lod1: 42, lod2: 42 } },
    faceTile: { size: 1024, png: { albedo: 'a', normal: 'n', orm: 'o' }, albedoMeanLinear: [0.76, 0.74, 0.73],
      uv: { tris: 4000, flippedTris: 0 } },
    craniumLock: { shiftMaxMm: 0 },
    bounds: { min: [-0.09, -0.17, 1.53], max: [0.09, 0.05, 1.77] },
    ...over,
  };
}

function envelope(over: Record<string, unknown> = {}) {
  return {
    base: 'average', offset: 0.015, thickestCap: 0.012, clearance: 0.003, crownZ: 1.785,
    maxRadii: { x: 0.105, yFront: 0.13, yBack: 0.12, zAboveEyes: 0.126 },
    landmarks: { scalpCrownZ: 1.77, browZ: 1.68, eyeMid: [0, -0.13, 1.659] },
    mesh: { tris: 1, verts: [[0, 0, 0], [1, 0, 0], [0, 1, 0]], faces: [[0, 1, 2]] },
    ...over,
  };
}

describe('budgets (PLAN 5)', () => {
  it('eye spheres fit the LOD0 pair budget and the merged LOD1 / LOD2 heads', () => {
    expect(eyeTris('lod0')).toBe(224);
    expect(2 * eyeTris('lod0')).toBeLessThanOrEqual(500);
    const b = headBudgets(kit(), 'lean-2');
    expect(b.head).toEqual({ lod0: 4000, lod1: 1200, lod2: 400 });
    expect(b.target.lod1 + b.eyesPerLod.lod1).toBe(1200);
    expect(b.target.lod2 + b.eyesPerLod.lod2).toBe(400);
    expect(b.target.lod2).toBeGreaterThan(300);
  });
  it('unknown head throws', () => {
    expect(() => headBudgets(kit(), 'broad-2')).toThrow(/not in the kit/);
  });
});

describe('hair caps per base and the envelope job', () => {
  it('styles are the kinds\' worn caps with a mesh, in kit order; bald never has one', () => {
    expect(capStyles(kit(), 'average')).toEqual(['buzz', 'crop', 'sidepart', 'receding', 'fade']);
    expect(capStyles(kit(), 'lean')).toEqual(['buzz', 'fade']);
    expect(capStyles(kit(), 'broad')).toEqual([]);
  });
  it('the cap job writes the envelope; a capless one-head base gets it from its head job', () => {
    expect(envelopeJob(kit(), 'average')).toBe('haircaps-average');
    expect(envelopeJob(kit(), 'broad')).toBe('heads-broad-1');
    const k = kit();
    (k.heads as { id: string; base: string }[]).push({ id: 'broad-2', base: 'broad' });
    expect(envelopeJob(k, 'broad')).toBeNull();
  });
  it('job outputs: declared blend + json first, then pngs and the named envelope', () => {
    const cap = headJobOutputs(kit(), 'haircaps-lean');
    expect(cap.slice(0, 2)).toEqual(['heads/guard-lean-haircaps.blend', 'heads/guard-lean-haircaps.json']);
    expect(cap).toContain('heads/guard-lean-cap-fade-normal.png');
    expect(cap).not.toContain('heads/guard-lean-cap-crop-normal.png');
    expect(cap).toContain('heads/lean/envelope.json');
    const h = headJobOutputs(kit(), 'heads-average-3');
    expect(h).toEqual(['heads/guard-average-3-head.blend', 'heads/guard-average-3-head.json',
      'heads/guard-average-3-face-albedo.png', 'heads/guard-average-3-face-normal.png', 'heads/guard-average-3-face-orm.png']);
    expect(headJobOutputs(kit(), 'heads-broad-1')).toContain('heads/broad/envelope.json');
    expect(() => headJobOutputs(kit(), 'gear-average-cap')).toThrow();
  });
});

describe('head report check', () => {
  it('a report inside every budget passes', () => {
    expect(checkHeadReport(headReport(), kit())).toEqual([]);
  });
  it('flags triangles, eyes, seam, tile, albedo, flips, cranium and crown', () => {
    const f = checkHeadReport(headReport({
      tris: { head: { lod0: 4100, lod1: 1200, lod2: 401 }, eyes: { lod0: 504 } },
      seam: { loopVerts: 42, keptVerts: { lod0: 40 } },
      faceTile: { size: 512, png: { albedo: 'a' }, albedoMeanLinear: [0.3, 0.3, 0.3], uv: { tris: 100, flippedTris: 5 } },
      craniumLock: { shiftMaxMm: 2 }, bounds: { max: [0, 0, 1.70] }, iris: 'green',
    }), kit());
    for (const re of [/lod0: 4100/, /lod2: 401/, /eyes lod0: 504/, /40 of 42/, /face tile 512/, /no face normal/,
      /albedo mean 0.300/, /flipped/, /cranium moved/, /crown z/, /iris green/]) expect(f.some((x) => re.test(x))).toBe(true);
    expect(f.some((x) => /lod1/.test(x))).toBe(false);
  });
});

describe('hair cap report check', () => {
  const cap = (tris: number[], mm: number) => ({ tris: { lod0: tris[0], lod1: tris[1] }, thicknessMm: [0.4, mm],
    png: { albedo: 'a', normal: 'n', orm: 'o' } });
  it('passes the base\'s styles inside budget', () => {
    const r = { base: 'lean', caps: { buzz: cap([500, 200], 2), fade: cap([690, 240], 3) },
      variantPush: { 'lean-1': { capRegionMaxAbsMm: 0 } }, envelope: { json: 'heads/lean/envelope.json' } };
    expect(checkCapsReport(r, kit())).toEqual([]);
  });
  it('flags missing / extra styles, budgets, thickness, push under the cap, no envelope', () => {
    const r = { base: 'lean', caps: { buzz: cap([520, 210], 2.5), crop: cap([10, 10], 1) },
      variantPush: { 'lean-3': { capRegionMaxAbsMm: 4 } } };
    const f = checkCapsReport(r, kit());
    for (const re of [/cap fade missing/, /crop not worn/, /buzz lod0: 520/, /buzz lod1: 210/, /thickness/, /lean-3/, /no envelope/]) {
      expect(f.some((x) => re.test(x))).toBe(true);
    }
  });
});

describe('envelope check (SPEC 7)', () => {
  it('passes a plausible envelope', () => {
    expect(checkEnvelope(envelope(), kit())).toEqual([]);
  });
  it('flags offset, clearance, crown, mesh and radii', () => {
    const f = checkEnvelope(envelope({ offset: 0.01, clearance: 0.001, crownZ: 1.771,
      maxRadii: { x: 0.5, yFront: 0.13, yBack: 0.12, zAboveEyes: 0.1 },
      mesh: { tris: 2, verts: [[0, 0, 0]], faces: [[0, 1, 2]] } }), kit());
    for (const re of [/offset 0.01/, /clearance/, /crown/, /1 tris/, /bad index/, /radius x/]) expect(f.some((x) => re.test(x))).toBe(true);
  });
});
