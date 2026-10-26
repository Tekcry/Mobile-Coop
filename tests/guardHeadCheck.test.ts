// Guard heads, pure half (scripts/operators/guardHeadCheck.mjs): budgets, job outputs, report and envelope checks.
import { readFileSync } from 'node:fs';
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
type Rep = Record<string, unknown>;
const checkBaseSeam = hc.checkBaseSeam as Fn<[string, Rep[], Rep | null, Rep | null], string[]>;
const checkComplete = hc.checkComplete as Fn<[Kit, { heads: Set<string>; caps: Set<string>; envelopes: Set<string> }], string[]>;
const faceAlbedo = hc.faceAlbedo as Fn<[Rep], number | null>;

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

/** A seam loop of `n` verts: a 0.4 m-ish ring at z (Blender), hm08 indices 100.. */
function ring(n = 42, z = 1.55, r = 0.0633) {
  const positions = Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n), z]);
  return { mhIndex: Array.from({ length: n }, (_, i) => 100 + i), positions };
}
const ringPerimeter = (p: number[][]) => p.reduce((s, a, i) => {
  const b = p[(i + 1) % p.length] as number[];
  return s + Math.hypot((b[0] ?? 0) - (a[0] ?? 0), (b[1] ?? 0) - (a[1] ?? 0), (b[2] ?? 0) - (a[2] ?? 0));
}, 0);

function headReport(over: Record<string, unknown> = {}) {
  return {
    head: 'average-1', base: 'average', iris: 'brown',
    tris: { head: { lod0: 4000, lod1: 1196, lod2: 400 }, eyes: { lod0: 448, lod1: 96, lod2: 48 } },
    seam: { loopVerts: 42, keptVerts: { lod0: 42, lod1: 42, lod2: 42 }, bodyGapMaxMm: 0, ...ring() },
    faceTile: { size: 1024, png: { albedo: 'a', normal: 'n', orm: 'o' }, albedoMeanLinear: [0.70, 0.68, 0.68],
      faceIslandAlbedoMeanLinear: [0.77, 0.74, 0.73], uv: { tris: 4000, flippedTris: 0 } },
    craniumLock: { shiftMaxMm: 0 }, seamLock: { shiftMaxMm: 0 },
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
    expect((b.target.lod1 ?? 0) + (b.eyesPerLod.lod1 ?? 0)).toBe(1200);
    expect((b.target.lod2 ?? 0) + (b.eyesPerLod.lod2 ?? 0)).toBe(400);
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
      seam: { loopVerts: 42, keptVerts: { lod0: 40, lod1: 42, lod2: 41 } },
      faceTile: { size: 512, png: { albedo: 'a' }, albedoMeanLinear: [0.3, 0.3, 0.3], uv: { tris: 100, flippedTris: 5 } },
      craniumLock: { shiftMaxMm: 2 }, bounds: { max: [0, 0, 1.70] }, iris: 'green',
    }), kit());
    for (const re of [/lod0: 4100/, /lod2: 401/, /eyes lod0: 504/, /LOD0 keeps 40 of 42/, /LOD2 keeps 41 of 42/, /face tile 512/,
      /no face normal/, /albedo mean 0.300/, /flipped/, /cranium moved/, /crown z/, /iris green/, /seam mhIndex missing/,
      /seam positions missing/, /off G1's body seam/]) expect(f.some((x) => re.test(x)), String(re)).toBe(true);
    expect(f.some((x) => /lod1|LOD1/.test(x))).toBe(false);
  });
  it('flags a moved seam ring and a face island outside the neutral range; the tile mean is not the neutral', () => {
    const r = headReport({ seamLock: { shiftMaxMm: 3 } });
    (r.faceTile as Record<string, unknown>).faceIslandAlbedoMeanLinear = [0.4, 0.4, 0.4];
    const f = checkHeadReport(r, kit());
    expect(f.some((x) => /seam rings moved 3/.test(x))).toBe(true);
    expect(f.some((x) => /face-island albedo mean 0.400/.test(x))).toBe(true);
    expect(faceAlbedo(headReport())).toBeCloseTo(0.7467, 3);
  });
  it('a short beard (kit facialHair beard) lowers the albedo floor; its means from the first full bake pass, skin ones still fail', () => {
    const k = kit();
    const heads = k.heads as { id: string; facialHair?: string }[];
    heads.find((h) => h.id === 'average-3')!.facialHair = 'beard';
    heads.find((h) => h.id === 'average-2')!.facialHair = 'stubble';
    // a8ff2d45 average-3: tile 0.546, face island 0.498
    const beard = headReport({ head: 'average-3' });
    Object.assign(beard.faceTile as Record<string, unknown>, { albedoMeanLinear: [0.55, 0.545, 0.543], faceIslandAlbedoMeanLinear: [0.5, 0.497, 0.497] });
    expect(checkHeadReport(beard, k)).toEqual([]);
    expect((hc.skinAlbedoBand as Fn<[Kit, Rep], number[]>)(k, beard)).toEqual(hc.SKIN_ALBEDO_BY_FACIAL_HAIR.beard);
    // the same means on a stubble or clean head are a skin fault
    for (const id of ['average-2', 'average-1']) {
      const f = checkHeadReport({ ...beard, head: id }, k);
      expect(f.some((x) => /neutral albedo mean 0.546 outside 0.55-0.9/.test(x)), id).toBe(true);
      expect(f.some((x) => /face-island albedo mean 0.498 outside 0.55-0.9/.test(x)), id).toBe(true);
    }
    // a beard head still has a floor
    Object.assign(beard.faceTile as Record<string, unknown>, { faceIslandAlbedoMeanLinear: [0.4, 0.4, 0.4] });
    expect(checkHeadReport(beard, k)).toEqual(['average-3: face-island albedo mean 0.400 outside 0.45-0.9']);
    // the kit's facialHair wins; the report's is the fallback for a head the kit does not list that way
    heads.find((h) => h.id === 'average-3')!.facialHair = 'clean';
    expect(checkHeadReport({ ...beard, facialHair: 'beard' }, k).some((x) => /outside 0.55-0.9/.test(x))).toBe(true);
    delete heads.find((h) => h.id === 'average-3')!.facialHair;
    expect(checkHeadReport({ ...beard, facialHair: 'beard' }, k).some((x) => /outside 0.45-0.9/.test(x))).toBe(true);
  });
  it('the shipped kit marks exactly the beard heads (average-3, lean-3), so the band follows its data', () => {
    const shipped = JSON.parse(readFileSync('scripts/operators/data/guards.json', 'utf8')) as { heads: { id: string; facialHair: string }[] };
    expect(shipped.heads.filter((h) => hc.SKIN_ALBEDO_BY_FACIAL_HAIR[h.facialHair]).map((h) => h.id)).toEqual(['average-3', 'lean-3']);
  });
});

describe('seam per base (G1h fix round) and completeness', () => {
  const body = () => {
    const { mhIndex, positions } = ring();
    return { neckSeam: { mhVerts: [...mhIndex].reverse(), perimeter: ringPerimeter(positions), meanY: 1.55 }, bindJoints: { head: [0, 1.65, 0.01] } };
  };
  const env = (hj: number[]) => ({ landmarks: { headJoint: hj } });
  it('passes the same G1 seam on every head, the body\'s loop, perimeter and height, and the rig head joint', () => {
    const heads = [headReport(), headReport({ head: 'average-2' })];
    expect(checkBaseSeam('average', heads, body(), env([0, -0.01, 1.65]))).toEqual([]);
    expect(checkBaseSeam('average', heads, null, null)).toEqual([]);
  });
  it('flags seams that differ between heads or from the body, and an envelope off the rig head joint', () => {
    const moved = ring();
    (moved.positions[3] as number[])[2] = 1.56;
    const other = headReport({ head: 'average-2', seam: { loopVerts: 42, keptVerts: {}, ...moved } });
    const f = checkBaseSeam('average', [headReport(), other], body(), env([0, -0.05, 1.62]));
    expect(f.some((x) => /average-2 seam positions differ/.test(x))).toBe(true);
    expect(f.some((x) => /average-2 seam perimeter/.test(x))).toBe(true);
    expect(f.some((x) => /head joint/.test(x))).toBe(true);
    const wrongSet = headReport({ seam: { ...ring(), mhIndex: Array.from({ length: 42 }, (_, i) => 200 + i) } });
    expect(checkBaseSeam('average', [wrongSet], body(), null).some((x) => /not G1's neckSeam.mhVerts/.test(x))).toBe(true);
    const low = headReport({ seam: { ...ring(42, 1.53) } });
    expect(checkBaseSeam('average', [low], body(), null).some((x) => /seam height/.test(x))).toBe(true);
  });
  it('completeness: every kit head, each capped base\'s hair caps, every base\'s envelope', () => {
    const k = kit();
    const all = { heads: new Set((k.heads as { id: string }[]).map((h) => h.id)), caps: new Set(['average', 'lean']), envelopes: new Set(['average', 'lean', 'broad']) };
    expect(checkComplete(k, all)).toEqual([]);
    all.heads.delete('lean-3');
    all.caps.delete('lean');
    all.envelopes.delete('broad');
    const f = checkComplete(k, all);
    expect(f).toEqual(['lean-3: no head report', 'lean: no hair-cap report', 'broad: no envelope (heads/broad/envelope.json, written by heads-broad-1)']);
  });
});

describe('hair cap report check', () => {
  const line = (dev: number, turn: number) => ({ boundaryVerts: 120, maxDevMm: dev, maxTurnDeg: turn });
  const cap = (tris: number[], mm: number) => ({ tris: { lod0: tris[0], lod1: tris[1] }, thicknessMm: [0.4, mm],
    png: { albedo: 'a', normal: 'n', orm: 'o' }, hairline: { lod0: line(0.4, 38), lod1: line(1.2, 52) } });
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
  // (G10a D4) the hairline after decimation: snapped onto the dense contour, no sawtooth
  it('hairline: passes at the limits, flags a tooth, a deviation and a missing measure', () => {
    const ok = (lean: Record<string, unknown>) => ({ base: 'lean', caps: lean, variantPush: {}, envelope: { json: 'e' } });
    const at = { ...cap([500, 200], 2), hairline: { lod0: line(1.5, 75), lod1: line(3, 75) } };
    expect(checkCapsReport(ok({ buzz: at, fade: cap([690, 240], 3) }), kit())).toEqual([]);
    const tooth = { ...cap([500, 200], 2), hairline: { lod0: line(0.3, 151), lod1: line(1, 40) } };
    expect(checkCapsReport(ok({ buzz: tooth, fade: cap([690, 240], 3) }), kit())).toEqual(['lean buzz lod0: hairline turns 151 deg > 75 (sawtooth)']);
    const dev = { ...cap([500, 200], 2), hairline: { lod0: line(1.6, 30), lod1: line(3.4, 30) } };
    expect(checkCapsReport(ok({ buzz: dev, fade: cap([690, 240], 3) }), kit())).toEqual([
      'lean buzz lod0: hairline 1.6 mm off the contour > 1.5', 'lean buzz lod1: hairline 3.4 mm off the contour > 3']);
    const none = { ...cap([500, 200], 2), hairline: { lod0: line(0.3, 30) } };
    const bare = cap([690, 240], 3) as Record<string, unknown>;
    delete bare.hairline;
    expect(checkCapsReport(ok({ buzz: none, fade: bare }), kit())).toEqual([
      'lean buzz lod1: no hairline measure (boundaryVerts, maxDevMm, maxTurnDeg)',
      'lean fade lod0: no hairline measure (boundaryVerts, maxDevMm, maxTurnDeg)',
      'lean fade lod1: no hairline measure (boundaryVerts, maxDevMm, maxTurnDeg)']);
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
