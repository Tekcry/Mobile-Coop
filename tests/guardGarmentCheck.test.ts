// Guard garment check (PLAN G2): scripts/operators/guardGarmentCheck.mjs against synthetic garments-job reports shaped
// like guard_garment.py's output (the smoke run's field names).
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs build script without types
import * as gc from '../scripts/operators/guardGarmentCheck.mjs';
import layers from '../scripts/operators/py/guard_garments.json';
// @ts-expect-error plain .mjs build script without types
import * as cf from '../scripts/operators/cliFiles.mjs';

type Report = Record<string, unknown> & { objects: { name: string; tris: number; shown: boolean }[] };
const check = gc.checkGarment as (r: unknown, l: unknown) => { problems: string[]; warnings: string[] };
const chainOf = gc.chainOf as (l: unknown, b: string, p: string) => string[];
const expandFileArgs = cf.expandFileArgs as (args: string[], o?: { dirMatch?: RegExp }) => string[];

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

  it("seam gaps before the weld only warn (Wren's 10 mm, large past 30 mm, chain copies too); a weld move past the relax cap fails", () => {
    const r = sewn('average', 'jacket', { seamGapBeforeWeldMm: 17.6 });
    expect(check(r, layers)).toEqual({ problems: [], warnings: [expect.stringContaining("jacket: seam gap before the weld 17.6 mm > 10 mm (Wren's limit)")] });
    (r.steps as { part: string; seamGapBeforeWeldMm?: number }[])[0]!.seamGapBeforeWeldMm = 40;
    r.seamGapBeforeWeldMm = 52.5;
    expect(check(r, layers)).toEqual({ problems: [], warnings: [
      expect.stringContaining('jacket: seam gap before the weld 52.5 mm > 30 mm (large, check the gusset'),
      expect.stringContaining('shirt (chain copy): seam gap before the weld 40 mm > 30 mm'),
    ] });
    // the bake's lean trousers (52.5 mm gap, weld move 49 mm) pass; past the 60 mm relax cap fails
    r.sim = { weldMoveMaxMm: 49 };
    expect(check(r, layers).problems).toEqual([]);
    r.sim = { weldMoveMaxMm: 61 };
    expect(check(r, layers).problems).toEqual([expect.stringContaining('jacket: weld moved a seam 61 mm > 60 mm')]);
    // only the part's own sim counts, never a chain copy's step
    r.sim = { weldMoveMaxMm: 12 };
    (r.steps as Record<string, unknown>[])[0]!.sim = { weldMoveMaxMm: 90 };
    expect(check(r, layers).problems).toEqual([]);
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

// The laptop bake runs each check step through cmd.exe (child_process shell: true on Windows), which passes
// `guard-*.json` literally: the CLIs expand it themselves (scripts/operators/cliFiles.mjs).
describe('check CLIs: file arguments without a shell glob', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'guard-cli-'));
  const garments = path.join(root, 'garments');
  mkdirSync(garments);
  const names = ['guard-average-trousers.json', 'guard-average-shirt.json', 'guard-lean-shirt_rolled.json'];
  writeFileSync(path.join(garments, names[0]!), JSON.stringify(sewn('average', 'trousers')));
  writeFileSync(path.join(garments, names[1]!), JSON.stringify(sewn('average', 'shirt')));
  writeFileSync(path.join(garments, names[2]!), JSON.stringify(sewn('lean', 'shirt_rolled', { rolled: { rolls: [['a', 1], ['b', 1]] } })));
  writeFileSync(path.join(garments, 'guard-average-trousers.blend'), '');
  writeFileSync(path.join(garments, 'notes.json'), '{}');
  const sorted = [...names].sort().map((n) => path.join(garments, n));
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('expands a * / ? in the file name, sorted, and keeps plain paths as given', () => {
    expect(expandFileArgs([`${garments}/guard-*.json`])).toEqual(sorted);
    expect(expandFileArgs([`${garments}/guard-average-*.json`])).toEqual(sorted.filter((f) => f.includes('average')));
    expect(expandFileArgs([`${garments}/guard-lean-shirt_rolle?.json`])).toEqual([path.join(garments, names[2]!)]);
    expect(expandFileArgs(['a/b.json', 'c.json'])).toEqual(['a/b.json', 'c.json']);
  });

  it('a folder stands for its guard-*.json reports; duplicates drop', () => {
    expect(expandFileArgs([garments])).toEqual(sorted);
    expect(expandFileArgs([garments, `${garments}/guard-*.json`])).toEqual(sorted);
    expect(expandFileArgs([garments], { dirMatch: /^guard-.+-trousers\.json$/ })).toEqual([path.join(garments, names[0]!)]);
  });

  it('a pattern or folder with no match, a missing folder, a wildcard folder: errors, never zero reports', () => {
    expect(() => expandFileArgs([`${garments}/guard-*.glb`])).toThrow(/no file matches/);
    expect(() => expandFileArgs([`${root}/nothere/guard-*.json`])).toThrow(/not found/);
    expect(() => expandFileArgs([`${root}/gar*/guard-*.json`])).toThrow(/wildcards only in the file name/);
    expect(() => expandFileArgs([root])).toThrow(/no file matches/);
  });

  it('guardGarmentCheck CLI checks every report a literal guard-*.json names', () => {
    const r = spawnSync(process.execPath, ['scripts/operators/guardGarmentCheck.mjs', `${garments}/guard-*.json`], { encoding: 'utf8', timeout: 30000 });
    expect(r.stderr).toBe('');
    expect(r.stdout.split(/\r?\n/).filter((l) => /^ok {3}/.test(l))).toHaveLength(3);
    expect(r.status).toBe(0);
    const none = spawnSync(process.execPath, ['scripts/operators/guardGarmentCheck.mjs', `${garments}/guard-*.glb`], { encoding: 'utf8', timeout: 30000 });
    expect(none.status).toBe(2);
    expect(none.stderr).toMatch(/no file matches/);
  });

  it('guardBodyCheck CLI loads the game TypeScript without a loader flag and expands its pattern', () => {
    const r = spawnSync(process.execPath, ['scripts/operators/guardBodyCheck.mjs', '--kit', 'scripts/operators/data/guards.json', `${garments}/guard-*-body.json`],
      { encoding: 'utf8', timeout: 30000 });
    expect(r.stderr).not.toMatch(/ERR_MODULE_NOT_FOUND/);
    expect(r.stderr).toMatch(/no file matches/);
    expect(r.status).toBe(2);
  });
});
