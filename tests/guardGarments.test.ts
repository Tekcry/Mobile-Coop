// Guard garments (PLAN G2): the garment jobs of the bake plan resolve to G2's scripts, and the layer data the job runner
// reads (scripts/operators/py/guard_garments.json) agrees with the kit: outfits, variants, and the chains of parts each
// job rebuilds under its own part.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs build script without types
import * as plan from '../scripts/operators/guardBakePlan.mjs';
import kit from '../scripts/operators/data/guards.json';
import layers from '../scripts/operators/py/guard_garments.json';

interface Job { id: string; script: string; args: string[]; tags: string[]; needs: string[] }
interface Part { module: string; variant?: string; method: 'sewn' | 'fitted'; layer: number; tint: string; under: string[] }
const jobsFor = plan.jobsFor as (stage: string, kit: unknown) => Job[];
const PY = 'scripts/operators/py';
const parts = layers.parts as Record<string, Part>;
const outfits = layers.outfits as Record<string, string[]>;
const chains = layers.chains as Record<string, Record<string, string[]>>;
const order = layers.order as string[];

const jobs = jobsFor('garments', kit);
const arg = (j: Job, name: string) => { const i = j.args.indexOf(name); return i >= 0 ? j.args[i + 1] : undefined; };
const baseOf = (j: Job) => arg(j, '--base') as string;
const partOf = (j: Job) => arg(j, '--garment') as string;
const kinds = kit.kinds as { base: string; outfit: string }[];
const outfitsOn = (base: string) => [...new Set(kinds.filter((k) => k.base === base).map((k) => k.outfit))];

/** The parts worn with `part` on `base` (every outfit there that has it), filtered to its `under` list, in layer order. */
function chainOf(base: string, part: string): string[] {
  const withIt = outfitsOn(base).filter((o) => outfits[o]?.includes(part));
  const worn = new Set(withIt.flatMap((o) => outfits[o] ?? []));
  return order.filter((q) => (parts[part]?.under ?? []).includes(q) && worn.has(q));
}

describe('guard garment jobs (G2)', () => {
  it('16 jobs: average 5, lean 7, broad 4, each needing only its body', () => {
    expect(jobs).toHaveLength(16);
    const per = (b: string) => jobs.filter((j) => baseOf(j) === b).map(partOf).sort();
    expect(per('average')).toEqual(['boots', 'gloves', 'jacket', 'shirt', 'trousers']);
    expect(per('lean')).toEqual(['boots', 'gloves', 'shirt_rolled', 'trousers', 'work_gloves', 'work_jacket', 'work_trousers']);
    expect(per('broad')).toEqual(['boots', 'gloves', 'shirt', 'trousers']);
    for (const j of jobs) expect(j.needs).toEqual([`bodies-${baseOf(j)}`]);
  });

  it("every job's script exists, is the part's module, hands over to guard_garment and takes the part's variant", () => {
    for (const j of jobs) {
      const p = parts[partOf(j)];
      expect(p, partOf(j)).toBeDefined();
      expect(j.script).toBe(`garments/${p!.module}.py`);
      expect(existsSync(`${PY}/${j.script}`), j.script).toBe(true);
      const src = readFileSync(`${PY}/${j.script}`, 'utf8');
      expect(src).toMatch(/\ndef configure\(part, variant=None, prefix=None/);
      expect(src).toMatch(/if __name__ == '__main__':[^\n]*\n {4}import guard_garment\r?\n {4}guard_garment\.main\(\)\s*$/);
      expect(arg(j, '--variant')).toBe(p!.variant);
    }
    expect(existsSync(`${PY}/guard_garment.py`)).toBe(true);
  });

  it("the layer data's outfits are the bake plan's (by the jobs' outfit tags) and name only known parts", () => {
    for (const [o, list] of Object.entries(outfits)) for (const q of list) expect(parts[q], `${o}: ${q}`).toBeDefined();
    for (const b of ['average', 'lean', 'broad']) {
      for (const o of outfitsOn(b)) {
        const tagged = jobs.filter((j) => baseOf(j) === b && j.tags.includes(o)).map(partOf).sort();
        expect(tagged, `${b} ${o}`).toEqual([...(outfits[o] ?? [])].sort());
      }
    }
    expect([...order].sort()).toEqual(Object.keys(parts).sort());
  });

  it('chains match the kit, use only parts baked on the same base, and come out the same in every job', () => {
    for (const j of jobs) {
      const b = baseOf(j), p = partOf(j);
      const want = chainOf(b, p);
      expect(chains[b]?.[p] ?? [], `${b} ${p}`).toEqual(want);
      const baked = new Set(jobs.filter((k) => baseOf(k) === b).map(partOf));
      want.forEach((q, i) => {
        expect(baked.has(q), `${b} ${p}: ${q}`).toBe(true);
        expect(order.indexOf(q)).toBeLessThan(order.indexOf(p));
        // a sewn chain part is built over exactly its own job's chain; a fitted one (boots, gloves) takes none
        expect(parts[q]!.method === 'sewn' ? want.slice(0, i) : [], `${b} ${p}: ${q}'s layers`).toEqual(chainOf(b, q));
      });
    }
    for (const [b, map] of Object.entries(chains)) for (const p of Object.keys(map)) {
      expect(jobs.some((j) => baseOf(j) === b && partOf(j) === p), `${b} ${p} has a job`).toBe(true);
    }
  });

  it('shared parts and tint slots: lean bakes one boots part for uniform_rolled and work; boots and gloves are untinted', () => {
    const lean = jobs.find((j) => baseOf(j) === 'lean' && partOf(j) === 'boots')!;
    expect(lean.tags).toEqual(expect.arrayContaining(['uniform_rolled', 'work']));
    expect(Object.entries(parts).filter(([, p]) => p.tint === 'none').map(([q]) => q).sort())
      .toEqual(['boots', 'gloves', 'work_gloves']);
    for (const p of Object.values(parts)) expect(['uniform', 'none']).toContain(p.tint);
  });
});
