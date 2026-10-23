// Guard garment check (PLAN G2): scripts/operators/guardGarmentCheck.mjs against synthetic garments-job reports shaped
// like guard_garment.py's output (the smoke run's field names).
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs build script without types
import * as gc from '../scripts/operators/guardGarmentCheck.mjs';
import layers from '../scripts/operators/py/guard_garments.json';

type Report = Record<string, unknown> & { objects: { name: string; tris: number; shown: boolean }[] };
const check = gc.checkGarment as (r: unknown, l: unknown) => { problems: string[]; warnings: string[] };
const chainOf = gc.chainOf as (l: unknown, b: string, p: string) => string[];

function sewn(base: string, part: string, over: Partial<Report> = {}): Report {
  const p = (layers.parts as Record<string, { module: string; variant?: string; method: string; layer: number; tint: string }>)[part]!;
  const stem = `guard-${base}-${part}`;
  const chain = chainOf(layers, base, part);
  return {
    base, part, module: p.module, variant: p.variant ?? null, method: p.method, layer: p.layer, tint: p.tint, chain,
    outfits: Object.entries(layers.outfits).filter(([, l]) => (l as string[]).includes(part)).map(([o]) => o).slice(0, 1),
    steps: [...chain.map((q) => ({ part: q, seamGapBeforeWeldMm: (layers.parts as Record<string, { method: string }>)[q]!.method === 'sewn' ? 6 : undefined })), { part, seamGapBeforeWeldMm: 7 }],
    objects: [{ name: stem, tris: 22000, shown: false }, { name: `${stem}-hero`, tris: 900000, shown: true }, { name: `${stem}-stitches`, tris: 100000, shown: true }],
    shownTris: 1000000, seamGapBeforeWeldMm: 7, seconds: 300,
    drafted: { height: 1.77, ...(chain.includes('boots') ? { boot_top_girth: 0.33 } : {}) },
    ...over,
  };
}

function boots(base: string, girth: number): Report {
  const stem = `guard-${base}-boots`;
  return {
    base, part: 'boots', module: 'boots', variant: null, method: 'fitted', layer: 1, tint: 'none', chain: [], outfits: ['uniform'],
    steps: [{ part: 'boots' }], objects: [{ name: `${stem}-hero`, tris: 60000, shown: true }, { name: `${stem}-laces`, tris: 8000, shown: true }],
    shownTris: 68000, seamGapBeforeWeldMm: 0, seconds: 20,
    drafted: { height: 1.77, L: { topHeightM: 0.1844, topGirthM: girth }, R: { topHeightM: 0.1844, topGirthM: girth } },
  };
}

describe('guardGarmentCheck', () => {
  it('passes well-formed sewn, rolled and fitted reports', () => {
    for (const [b, p] of [['average', 'shirt'], ['average', 'trousers'], ['average', 'jacket'], ['lean', 'work_jacket'], ['broad', 'trousers']] as const) {
      expect(check(sewn(b, p), layers), `${b} ${p}`).toEqual({ problems: [], warnings: [] });
    }
    const rolled = sewn('lean', 'shirt_rolled', { rolled: { rolls: [['guard-lean-shirt_rolled-roll', 2]] } });
    expect(check(rolled, layers).problems).toEqual([]);
    expect(check(boots('average', 0.31), layers).problems).toEqual([]);
  });

  it('flags foreign objects, a missing or hidden hero, a rendering shell and a wrong chain or variant', () => {
    const r = sewn('average', 'trousers');
    r.objects.push({ name: 'guard-average-shirt-hero', tris: 1, shown: true });
    r.objects[0]!.shown = true;
    r.chain = ['boots'];
    r.variant = 'work';
    const { problems } = check(r, layers);
    expect(problems.some((q) => q.includes('guard-average-shirt-hero'))).toBe(true);
    expect(problems.some((q) => q.startsWith('shell'))).toBe(true);
    expect(problems.some((q) => q.startsWith('chain'))).toBe(true);
    expect(problems.some((q) => q.startsWith('variant'))).toBe(true);
    const noHero = sewn('average', 'shirt');
    noHero.objects = noHero.objects.filter((o) => !o.name.endsWith('-hero'));
    expect(check(noHero, layers).problems).toContain('no guard-average-shirt-hero');
  });

  it("seam gaps: over Wren's 10 mm warns (chain copies too), a torn seam fails", () => {
    const r = sewn('average', 'jacket', { seamGapBeforeWeldMm: 17.6 });
    expect(check(r, layers)).toEqual({ problems: [], warnings: [expect.stringContaining('jacket: seam gap before the weld 17.6 mm')] });
    (r.steps as { part: string; seamGapBeforeWeldMm?: number }[])[0]!.seamGapBeforeWeldMm = 40;
    expect(check(r, layers).problems).toEqual([expect.stringContaining('shirt (chain copy): seam gap before the weld 40 mm')]);
  });

  it('a boot top with no measured girth fails the boots and every part drafted over them', () => {
    expect(check(boots('average', 0), layers).problems).toHaveLength(2);
    // the smoke's jacket: 2 pi (gap + layer) = 0.0697 m with nothing under it
    const r = sewn('average', 'jacket', { drafted: { height: 1.77, boot_top_girth: 0.0697 } });
    expect(check(r, layers).problems).toEqual([expect.stringContaining('top girth is 0.0697 m')]);
  });

  it('rolled sleeves need both cuff edges rolled', () => {
    expect(check(sewn('lean', 'shirt_rolled', { rolled: { rolls: [['x', 1]] } }), layers).problems).toEqual(['rolled: 1 rolled cuff edges, want 2']);
    expect(check(sewn('lean', 'shirt_rolled', { rolled: null }), layers).problems).toHaveLength(1);
  });
});
