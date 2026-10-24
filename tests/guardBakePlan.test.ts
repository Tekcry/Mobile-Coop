// Guard bake driver, pure half (scripts/operators/guardBakePlan.mjs): stage graph, job split, input hashes, scheduler.
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs build script without types
import * as plan from '../scripts/operators/guardBakePlan.mjs';
import realKit from '../scripts/operators/data/guards.json';

interface Job {
  id: string; stage: string; runner: string; script: string; args: string[]; inputs: string[]; files: string[];
  needs: string[]; outputs: string[]; gpuBound: boolean; tags: string[]; kit: unknown; env: Record<string, string>;
}
const jobsFor = plan.jobsFor as (stage: string, kit: unknown, opts?: { only?: string | string[] }) => Job[];
const inputHash = plan.inputHash as (job: Job, files: Record<string, string>, up?: Record<string, string>) => string;
const parallelPlan = plan.parallelPlan as (jobs: Job[], o: { par: number; maxGpu?: number }) => Job[][];
const pickNext = plan.pickNext as (pending: Job[], running: Job[], o: { par: number; maxGpu?: number }) => Job | null;
const STAGES = plan.STAGES as { name: string; deps: string[] }[];

/** The id contract of gm-common.md as guards.json might hold it (budgets and such live in other sections). */
function fixtureKit() {
  return {
    version: 1,
    bases: [{ id: 'average', height: 1.82 }, { id: 'lean', height: 1.86 }, { id: 'broad', height: 1.8 }],
    heads: [
      ...[1, 2, 3, 4].map((n) => ({ id: `average-${n}`, base: 'average' })),
      ...[1, 2, 3, 4].map((n) => ({ id: `lean-${n}`, base: 'lean' })),
      { id: 'broad-1', base: 'broad' },
    ],
    hairCaps: ['buzz', 'crop', 'sidepart', 'receding', 'fade', 'bald'],
    outfits: ['uniform', 'uniform_rolled', 'work', 'uniform_jacket'],
    pieces: {
      headwear: ['cap', 'cap_officer', 'beanie', 'balaclava', 'headset', 'boonie'],
      eyewear: ['glasses_clear', 'glasses_dark'],
      gear: ['helmet_std', 'helmet_heavy', 'vest_soft', 'plate_heavy', 'shield_riot'],
      small: ['radio', 'pouch_belt', 'holster_thigh', 'flashlight_mount'],
    },
    budgets: { lod0Tris: 20000 },
  };
}

const FILES: Record<string, string> = {};
const hashesFor = (jobs: Job[], seed = 'a') => {
  const f: Record<string, string> = { ...FILES };
  for (const j of jobs) for (const p of [j.runner === 'node' ? j.script : `scripts/operators/py/${j.script}`, ...j.files]) f[p] ??= `${seed}:${p}`;
  return f;
};
const upstreamFor = (job: Job, v = '1') => Object.fromEntries(job.needs.map((n) => [n, `${v}:${n}`]));

describe('guard bake plan: stage graph', () => {
  it('lists the stages in dependency order with the planned deps', () => {
    expect(STAGES.map((s) => s.name)).toEqual(['prep', 'bodies', 'heads', 'garments', 'gear', 'lods', 'check', 'sheet']);
    const deps = Object.fromEntries(STAGES.map((s) => [s.name, s.deps]));
    expect(deps).toEqual({
      prep: [], bodies: ['prep'], heads: ['prep'], garments: ['bodies'], gear: ['bodies', 'heads'], lods: ['bodies', 'heads', 'garments', 'gear'], check: ['lods'], sheet: ['check'],
    });
    const seen = new Set<string>();
    for (const s of STAGES) { for (const d of s.deps) expect(seen.has(d)).toBe(true); seen.add(s.name); }
  });

  it('stagesBefore gives the transitive deps in run order', () => {
    expect(plan.stagesBefore('prep')).toEqual([]);
    expect(plan.stagesBefore('bodies')).toEqual(['prep']);
    expect(plan.stagesBefore('heads')).toEqual(['prep']);
    expect(plan.stagesBefore('gear')).toEqual(['prep', 'bodies', 'heads']);
    expect(plan.stagesBefore('garments')).toEqual(['prep', 'bodies']);
    expect(plan.stagesBefore('check')).toEqual(['prep', 'bodies', 'heads', 'garments', 'gear', 'lods']);
    expect(plan.stagesBefore('sheet')).toEqual(['prep', 'bodies', 'heads', 'garments', 'gear', 'lods', 'check']);
    expect(() => plan.stageDeps('nope')).toThrow(/unknown stage/);
  });

  it('every job of a stage depends only on jobs of that stage\'s upstream stages', () => {
    const idsByStage = new Map(STAGES.map((s) => [s.name, new Set(jobsFor(s.name, fixtureKit()).map((j) => j.id))]));
    for (const s of STAGES) {
      const allowed = new Set(s.deps.flatMap((d) => [...(idsByStage.get(d) ?? [])]));
      for (const j of jobsFor(s.name, fixtureKit())) for (const n of j.needs) expect(allowed.has(n), `${j.id} needs ${n}`).toBe(true);
    }
  });
});

describe('guard bake plan: job split', () => {
  const kit = fixtureKit();
  const count = (s: string) => jobsFor(s, kit).length;

  it('one job per base, head variant, (base, garment), (base, piece), prep, sheet', () => {
    expect(count('prep')).toBe(1);
    expect(count('bodies')).toBe(3);
    expect(count('heads')).toBe(9 + 3); // 9 head variants + one hair-cap job per base (no kinds: every base wears caps)
    expect(count('garments')).toBe(13); // shirt, trousers, boots, gloves on 3 bases + officer jacket on average
    expect(count('gear')).toBe(16 * 3 + 1); // 16 fitted pieces per base + the riot shield once
    expect(count('lods')).toBe(3 + 1); // three bases + the shield's own GLB
    expect(count('check')).toBe(3 + 1);
    expect(count('sheet')).toBe(1);
  });

  it('ids are unique across the whole bake and each job names a script, args and outputs', () => {
    const all = STAGES.flatMap((s) => jobsFor(s.name, kit)).filter((j) => !j.tags.includes('haircaps')); // haircaps-<base>: own test
    expect(new Set(all.map((j) => j.id)).size).toBe(all.length);
    for (const j of all) {
      expect(j.id.startsWith(['sheet', 'prep'].includes(j.stage) ? j.stage : `${j.stage}-`)).toBe(true);
      expect(j.script).toMatch(/\.(py|mjs)$/);
      expect(j.args).toContain(j.id);
      expect(j.outputs.length).toBeGreaterThan(0);
      expect(j.inputs).toEqual(expect.arrayContaining([...j.needs, ...j.files]));
    }
  });

  it('scripts match the plan: guard-prep, build_guard_body, build_head, garments/<g>, build_gear, guard-lods, guard-check', () => {
    expect(jobsFor('prep', kit)[0]?.script).toBe('scripts/operators/guard-prep.mjs');
    expect(jobsFor('prep', kit)[0]?.runner).toBe('node');
    expect(jobsFor('bodies', kit)[0]?.script).toBe('build_guard_body.py');
    expect(jobsFor('heads', kit)[0]?.script).toBe('build_head.py');
    expect(jobsFor('garments', kit).map((j) => j.script).every((s) => s.startsWith('garments/'))).toBe(true);
    expect(jobsFor('garments', kit).find((j) => j.id === 'garments-average-shirt')?.script).toBe('garments/combat_shirt.py');
    expect(jobsFor('gear', kit)[0]?.script).toBe('build_gear.py');
    expect(jobsFor('lods', kit)[0]?.script).toBe('scripts/operators/guard-lods.mjs'); // G4: node job, runs bake_lods.py --guard
    expect(jobsFor('lods', kit).every((j) => j.runner === 'node' && j.files.includes('scripts/operators/py/bake_lods.py'))).toBe(true);
    expect(jobsFor('check', kit).every((j) => j.runner === 'node' && j.script === 'scripts/operators/guard-check.mjs')).toBe(true);
  });

  it('wires the upstream jobs: garments need their base body, lods need everything of their base', () => {
    const g = jobsFor('garments', kit).find((j) => j.id === 'garments-lean-boots');
    expect(g?.needs).toEqual(['bodies-lean']);
    const jacket = jobsFor('garments', kit).filter((j) => j.tags.includes('jacket'));
    expect(jacket.map((j) => j.id)).toEqual(['garments-average-jacket']);
    const l = jobsFor('lods', kit).find((j) => j.id === 'lods-average');
    expect(l?.needs).toContain('bodies-average');
    expect(l?.needs.filter((n) => n.startsWith('heads-'))).toEqual(['heads-average-1', 'heads-average-2', 'heads-average-3', 'heads-average-4']);
    expect(l?.needs).toContain('haircaps-average');
    expect(l?.needs.filter((n) => n.startsWith('garments-average-'))).toHaveLength(5);
    expect(l?.needs.filter((n) => n.startsWith('gear-average-'))).toHaveLength(16);
    expect(jobsFor('lods', kit).find((j) => j.id === 'lods-broad')?.needs.filter((n) => n.startsWith('heads-'))).toEqual(['heads-broad-1']);
    expect(jobsFor('lods', kit).find((j) => j.id === 'lods-shield_riot')?.needs[0]).toBe('gear-shield_riot');
    expect(l?.outputs).toContain('lods/guard-average.json'); // G7's GuardFileData beside the GLBs
    expect(jobsFor('lods', kit).find((j) => j.id === 'lods-shield_riot')?.outputs.some((o) => /guard-shield_riot\.json$/.test(o))).toBe(false);
    expect(jobsFor('check', kit).find((j) => j.id === 'check-lean')?.needs).toEqual(['lods-lean']);
    expect(jobsFor('sheet', kit)[0]?.needs).toHaveLength(4);
    expect(jobsFor('heads', kit).every((j) => j.needs.join() === 'prep')).toBe(true);
    // per-base gear fits its base's body (G3 gear/fit.py load_body): a rebuilt body rebakes it; the shield is built on
    // broad's body (gear/pieces.py SHIELD_BASE; a kit without kinds falls back to it)
    for (const j of jobsFor('gear', kit)) expect(j.needs).toEqual(j.tags.length === 2 ? [`bodies-${j.tags[0]}`] : ['bodies-broad']);
    expect(jobsFor('gear', realKit).find((j) => j.id === 'gear-shield_riot')?.needs).toEqual(['bodies-broad']);
    expect(jobsFor('gear', realKit).find((j) => j.id === 'gear-shield_riot')?.inputs).toContain('bodies-broad');
    expect(jobsFor('bodies', kit).every((j) => j.needs.join() === 'prep')).toBe(true);
  });

  it('prep (G1): one node job for the joints of every base and the MakeHuman data; the game TS it reads joins its hash', () => {
    const [p] = jobsFor('prep', kit);
    expect(p?.id).toBe('prep');
    expect(p?.outputs).toEqual(['joints/guard-average.json', 'joints/guard-lean.json', 'joints/guard-broad.json', 'mpfb2/3dobjs/base.obj', 'prep/prep.json']);
    expect(p?.files).toEqual(expect.arrayContaining(['scripts/operators/guardJoints.mjs', 'src/player/proportions.ts', 'src/operators/operatorBody.ts', 'src/anim/clavicle.ts']));
    expect(p?.gpuBound).toBe(false);
    const f = hashesFor([p!]);
    expect(inputHash(p!, { ...f, 'src/player/proportions.ts': 'changed' })).not.toBe(inputHash(p!, f));
    // a body rebuilds when prep was rebuilt with other inputs (its upstream hash changes)
    const [b] = jobsFor('bodies', kit, { only: 'average' });
    const fb = hashesFor([b!]);
    expect(inputHash(b!, fb, { prep: 'p1' })).not.toBe(inputHash(b!, fb, { prep: 'p2' }));
    expect(b?.files).toContain('scripts/operators/py/guard_body.py');
    // the prep hash takes only what the joints read per base (id, refHeight, build): mounts, kinds, face tiles do not
    const rk = JSON.parse(JSON.stringify(realKit)) as { bases: Record<string, unknown>[] };
    const [rp] = jobsFor('prep', rk);
    expect(rp?.kit).toEqual({ bases: rk.bases.map((x) => ({ id: x.id, refHeight: x.refHeight, build: x.build })) });
    const fr = hashesFor([rp!]);
    rk.bases[0]!.mounts = { pistolHolster: [0.1, 0, 0] };
    rk.bases[0]!.faceTiles = ['x'];
    expect(inputHash(jobsFor('prep', rk)[0]!, fr)).toBe(inputHash(rp!, fr));
    rk.bases[0]!.refHeight = 1.8;
    expect(inputHash(jobsFor('prep', rk)[0]!, fr)).not.toBe(inputHash(rp!, fr));
  });

  it('marks only the Cycles stages gpuBound: heads, lods, sheet', () => {
    const gpu = STAGES.filter((s) => jobsFor(s.name, kit).some((j) => j.gpuBound)).map((s) => s.name);
    expect(gpu).toEqual(['heads', 'lods', 'sheet']);
    for (const s of ['heads', 'lods']) expect(jobsFor(s, kit).every((j) => j.gpuBound)).toBe(true);
  });

  it('derives a head variant\'s base from its id when the kit gives none, and refuses unknown bases', () => {
    const k = fixtureKit();
    k.heads = [{ id: 'lean-2' }] as typeof k.heads;
    expect(jobsFor('heads', k)[0]?.args).toContain('lean');
    k.heads = [{ id: 'huge-1' }] as typeof k.heads;
    expect(() => jobsFor('heads', k)).toThrow(/huge/);
    expect(() => jobsFor('bodies', { heads: ['a-1'] })).toThrow(/no bases/);
  });

  it('reads the kit tolerantly: arrays of ids, objects keyed by id, kit-listed garments', () => {
    const k = {
      bases: { average: { height: 1.8 }, lean: {} },
      heads: ['average-1', 'lean-1'],
      garments: [{ id: 'shirt' }, { id: 'jacket', bases: ['average'], script: 'garments/field_jacket.py' }],
      pieces: [{ id: 'cap' }, { id: 'shield_riot' }, { id: 'radio', script: 'garments/radio.py' }],
    };
    expect(jobsFor('bodies', k).map((j) => j.id)).toEqual(['bodies-average', 'bodies-lean']);
    expect(jobsFor('garments', k).map((j) => j.id)).toEqual(['garments-average-shirt', 'garments-average-jacket', 'garments-lean-shirt']);
    expect(jobsFor('garments', k)[0]?.script).toBe('garments/shirt.py');
    expect(jobsFor('gear', k).map((j) => j.id)).toEqual(['gear-average-cap', 'gear-average-radio', 'gear-lean-cap', 'gear-lean-radio', 'gear-shield_riot']);
    expect(jobsFor('gear', k).find((j) => j.id === 'gear-lean-radio')?.script).toBe('garments/radio.py');
  });
});

describe('guard bake plan: --only', () => {
  const kit = fixtureKit();
  it('keeps the named jobs by id, by id without the stage prefix, or by tag', () => {
    expect(jobsFor('heads', kit, { only: 'average-1,lean-2' }).map((j) => j.id)).toEqual(['heads-average-1', 'heads-lean-2']);
    expect(jobsFor('heads', kit, { only: ['heads-broad-1'] }).map((j) => j.id)).toEqual(['heads-broad-1']);
    expect(jobsFor('heads', kit, { only: 'lean' }).map((j) => j.id)).toEqual(['heads-lean-1', 'heads-lean-2', 'heads-lean-3', 'heads-lean-4', 'haircaps-lean']);
    expect(jobsFor('heads', kit, { only: 'haircaps' }).map((j) => j.id)).toEqual(['haircaps-average', 'haircaps-lean', 'haircaps-broad']);
    expect(jobsFor('garments', kit, { only: 'broad' })).toHaveLength(4);
    expect(jobsFor('garments', kit, { only: 'jacket' }).map((j) => j.id)).toEqual(['garments-average-jacket']);
    expect(jobsFor('gear', kit, { only: 'shield_riot' }).map((j) => j.id)).toEqual(['gear-shield_riot']);
    expect(jobsFor('lods', kit, { only: ' average , broad ' }).map((j) => j.id)).toEqual(['lods-average', 'lods-broad']);
  });
  it('an empty or missing filter keeps everything; unknownOnly names what matches nothing', () => {
    expect(jobsFor('bodies', kit, { only: '' })).toHaveLength(3);
    expect(jobsFor('bodies', kit, {})).toHaveLength(3);
    expect(plan.unknownOnly('bodies', kit, 'average,nope,huge')).toEqual(['nope', 'huge']);
    expect(plan.unknownOnly('bodies', kit, 'average')).toEqual([]);
  });
});

describe('guard bake plan: input hash', () => {
  const kit = fixtureKit();
  const job = () => jobsFor('lods', kit).find((j) => j.id === 'lods-average') as Job;

  it('is stable for the same inputs and does not depend on kit key order', () => {
    const j = job();
    const h = inputHash(j, hashesFor([j]), upstreamFor(j));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(inputHash(job(), hashesFor([j]), upstreamFor(j))).toBe(h);
    const reordered = Object.fromEntries(Object.entries(fixtureKit()).reverse());
    const j2 = jobsFor('lods', reordered).find((x) => x.id === 'lods-average') as Job;
    expect(inputHash(j2, hashesFor([j]), upstreamFor(j))).toBe(h);
  });

  it('changes when the script content changes', () => {
    const j = job();
    const base = hashesFor([j]);
    const h = inputHash(j, base, upstreamFor(j));
    expect(inputHash(j, { ...base, 'scripts/operators/py/bake_lods.py': 'edited' }, upstreamFor(j))).not.toBe(h);
  });

  it('changes when a shared library file changes', () => {
    const j = job();
    const base = hashesFor([j]);
    const h = inputHash(j, base, upstreamFor(j));
    expect(inputHash(j, { ...base, 'scripts/operators/py/materials.py': 'edited' }, upstreamFor(j))).not.toBe(h);
  });

  it('changes when the job\'s own kit data changes, not when another base\'s does', () => {
    const j = job();
    const f = hashesFor([j]);
    const h = inputHash(j, f, upstreamFor(j));
    const own = fixtureKit();
    (own.bases[0] as { height: number }).height = 1.9;
    const jOwn = jobsFor('lods', own).find((x) => x.id === 'lods-average') as Job;
    expect(inputHash(jOwn, f, upstreamFor(jOwn))).not.toBe(h);
    const other = fixtureKit();
    (other.bases[1] as { height: number }).height = 1.95;
    const jOther = jobsFor('lods', other).find((x) => x.id === 'lods-average') as Job;
    expect(inputHash(jOther, f, upstreamFor(jOther))).toBe(h);
    const shared = fixtureKit();
    shared.budgets.lod0Tris = 21000;
    const jShared = jobsFor('lods', shared).find((x) => x.id === 'lods-average') as Job;
    expect(inputHash(jShared, f, upstreamFor(jShared))).not.toBe(h);
  });

  it('changes when the args change', () => {
    const j = job();
    const f = hashesFor([j]);
    expect(inputHash({ ...j, args: [...j.args, '--extra'] }, f, upstreamFor(j))).not.toBe(inputHash(j, f, upstreamFor(j)));
  });

  it('changes when any upstream output hash changes, and when one is missing', () => {
    const j = job();
    const f = hashesFor([j]);
    const up = upstreamFor(j);
    const h = inputHash(j, f, up);
    const first = j.needs[0] as string;
    expect(inputHash(j, f, { ...up, [first]: 'rebuilt' })).not.toBe(h);
    const { [first]: _drop, ...rest } = up;
    expect(inputHash(j, f, rest)).not.toBe(h);
  });

  it('does not change for an unrelated file, an unrelated upstream, or the order of needs', () => {
    const j = job();
    const f = hashesFor([j]);
    const up = upstreamFor(j);
    const h = inputHash(j, f, up);
    expect(inputHash(j, { ...f, 'scripts/operators/py/unrelated.py': 'x' }, { ...up, 'heads-elsewhere': 'x' })).toBe(h);
    expect(inputHash({ ...j, needs: [...j.needs].reverse() }, f, up)).toBe(h);
  });

  it('two jobs of one stage never share a hash, and filesToHash lists each script and lib once', () => {
    const jobs = jobsFor('heads', kit);
    const f = hashesFor(jobs);
    expect(new Set(jobs.map((j) => inputHash(j, f))).size).toBe(jobs.length);
    const files = plan.filesToHash(jobs) as string[];
    expect(files).toContain('scripts/operators/py/build_head.py');
    expect(new Set(files).size).toBe(files.length);
  });
});

describe('guard bake plan: parallel plan', () => {
  const kit = fixtureKit();
  const mk = (n: number, gpu: boolean): Job[] => Array.from({ length: n }, (_, i) => ({ id: `${gpu ? 'g' : 'c'}${i}`, gpuBound: gpu } as Job));

  it('never runs more than par jobs, nor more than 2 gpuBound, in any wave', () => {
    for (const par of [1, 2, 3, 6, 12]) {
      const waves = parallelPlan(jobsFor('heads', kit), { par });
      expect(waves.flat()).toHaveLength(12);
      for (const w of waves) {
        expect(w.length).toBeLessThanOrEqual(par);
        expect(w.filter((j) => j.gpuBound).length).toBeLessThanOrEqual(2);
      }
    }
    expect(parallelPlan(jobsFor('heads', kit), { par: 6 }).map((w) => w.length)).toEqual([2, 2, 2, 2, 2, 2]);
  });

  it('lets cpu jobs fill the slots the gpu cap leaves free', () => {
    const jobs = [...mk(4, true), ...mk(4, false)];
    const waves = parallelPlan(jobs, { par: 4 });
    expect(waves[0]?.map((j) => j.id)).toEqual(['g0', 'g1', 'c0', 'c1']);
    for (const w of waves) expect(w.filter((j) => j.gpuBound).length).toBeLessThanOrEqual(2);
    expect(waves.flat()).toHaveLength(8);
  });

  it('keeps every job exactly once and respects a custom gpu cap', () => {
    const jobs = [...mk(5, true), ...mk(3, false)];
    const waves = parallelPlan(jobs, { par: 8, maxGpu: 1 });
    expect(new Set(waves.flat().map((j) => j.id)).size).toBe(8);
    for (const w of waves) expect(w.filter((j) => j.gpuBound).length).toBeLessThanOrEqual(1);
    expect(() => parallelPlan(jobs, { par: 0 })).toThrow();
  });

  it('pickNext follows the same caps as slots free', () => {
    const g = mk(3, true);
    const c = mk(1, false);
    expect(pickNext([...g, ...c], [], { par: 3 })?.id).toBe('g0');
    expect(pickNext([g[2] as Job, ...c], [g[0] as Job, g[1] as Job], { par: 3 })?.id).toBe('c0');
    expect(pickNext([g[2] as Job], [g[0] as Job, g[1] as Job], { par: 3 })).toBeNull();
    expect(pickNext(c, [g[0] as Job, g[1] as Job, c[0] as Job], { par: 3 })).toBeNull();
    expect(pickNext([], [], { par: 3 })).toBeNull();
  });

  it('a gpu job that does not fit never blocks a cpu job behind it (par 6 over the lods stage)', () => {
    const lods = jobsFor('lods', kit);
    const cpu = mk(3, false);
    const waves = parallelPlan([...lods, ...cpu], { par: 6 });
    expect(waves[0]?.filter((j) => j.gpuBound)).toHaveLength(2);
    expect(waves[0]).toHaveLength(5);
  });
});

describe('guard bake plan: the real guards.json', () => {
  const kit = realKit as unknown as {
    pieces: { id: string; kind: string }[];
    kinds: { id: string; base: string; outfit: string; hairCaps: string[]; [list: string]: unknown }[];
  };
  const ids = (s: string) => jobsFor(s, kit).map((j) => j.id);
  const LISTS = ['headwear', 'headwear2', 'eyewear', 'fixedGear', 'gameplayGear', 'kitPool'];

  it('job counts per stage', () => {
    const want = { bodies: 3, heads: 11, garments: 16, gear: 25, lods: 4, check: 4, sheet: 1 };
    for (const [s, n] of Object.entries(want)) expect(jobsFor(s, kit).length, s).toBe(n);
  });

  it('outfits are garment jobs per base, never gear jobs: jacket on average only, rolled sleeves and work on lean only', () => {
    const outfits = kit.pieces.filter((p) => p.kind === 'outfit').map((p) => p.id);
    expect(outfits).toHaveLength(4);
    for (const o of outfits) expect(ids('gear').some((j) => j.endsWith(`-${o}`)), o).toBe(false);
    expect(ids('garments').filter((j) => j.startsWith('garments-average-'))).toEqual(
      ['garments-average-shirt', 'garments-average-trousers', 'garments-average-boots', 'garments-average-gloves', 'garments-average-jacket']);
    expect(ids('garments').filter((j) => j.startsWith('garments-lean-')).sort()).toEqual([
      'garments-lean-boots', 'garments-lean-gloves', 'garments-lean-shirt_rolled', 'garments-lean-trousers',
      'garments-lean-work_gloves', 'garments-lean-work_jacket', 'garments-lean-work_trousers']);
    expect(ids('garments').filter((j) => j.startsWith('garments-broad-'))).toEqual(
      ['garments-broad-shirt', 'garments-broad-trousers', 'garments-broad-boots', 'garments-broad-gloves']);
    const g = jobsFor('garments', kit);
    expect(g.find((j) => j.id === 'garments-lean-shirt_rolled')?.args).toEqual(expect.arrayContaining(['--variant', 'rolled']));
    expect(g.find((j) => j.id === 'garments-lean-work_jacket')?.args).toEqual(expect.arrayContaining(['--variant', 'work']));
    expect(g.find((j) => j.id === 'garments-average-jacket')?.script).toBe('garments/field_jacket.py');
    expect(jobsFor('garments', kit, { only: 'uniform_jacket' }).map((j) => j.id)).toEqual(
      ['garments-average-shirt', 'garments-average-trousers', 'garments-average-boots', 'garments-average-gloves', 'garments-average-jacket']);
  });

  it('gear jobs per base are exactly the union of its kinds\' piece lists (shield once, no outfit, no piece a base never uses)', () => {
    for (const base of ['average', 'lean', 'broad']) {
      const want = new Set<string>();
      for (const k of kit.kinds.filter((x) => x.base === base)) for (const l of LISTS) for (const id of (k[l] as string[])) if (id !== 'shield_riot') want.add(id);
      const got = ids('gear').filter((j) => j.startsWith(`gear-${base}-`)).map((j) => j.slice(`gear-${base}-`.length));
      expect(new Set(got), base).toEqual(want);
    }
    expect(ids('gear').filter((j) => j.includes('shield_riot'))).toEqual(['gear-shield_riot']);
    expect(ids('gear')).not.toContain('gear-broad-helmet_std');
    expect(ids('gear')).toContain('gear-broad-helmet_heavy');
    expect(ids('gear')).not.toContain('gear-average-boonie');
  });

  it('ids are unique across the whole bake (hair caps included)', () => {
    const all = STAGES.flatMap((s) => jobsFor(s.name, kit)).map((j) => j.id);
    expect(new Set(all).size).toBe(all.length);
  });

  it('hair caps: one heads-stage job per base whose kinds wear a cap (not broad), gpu-bound', () => {
    const caps = jobsFor('heads', kit).filter((j) => j.tags.includes('haircaps'));
    expect(caps.map((j) => j.id)).toEqual(['haircaps-average', 'haircaps-lean']);
    for (const j of caps) {
      expect(j.script).toBe('build_head.py');
      expect(j.args).toEqual(['--stage', 'heads', '--job', j.id, '--haircaps', '--base', j.tags[0]]);
      expect(j.gpuBound).toBe(true);
      expect(j.needs).toEqual(['prep']);
    }
  });

  it('lods-<base> depends only on that base\'s jobs, hair caps included', () => {
    const all = new Set(STAGES.flatMap((s) => (s.name === 'lods' || s.name === 'check' || s.name === 'sheet' ? [] : ids(s.name))));
    for (const base of ['average', 'lean', 'broad']) {
      const l = jobsFor('lods', kit).find((j) => j.id === `lods-${base}`) as Job;
      for (const n of l.needs) {
        expect(all.has(n), n).toBe(true);
        expect(n.includes(`-${base}`), `${l.id} needs ${n}`).toBe(true);
      }
      const ofBase = [...all].filter((id) => id.startsWith(`bodies-${base}`) || id.startsWith(`heads-${base}-`) || id === `haircaps-${base}`
        || id.startsWith(`garments-${base}-`) || id.startsWith(`gear-${base}-`));
      expect(new Set(l.needs)).toEqual(new Set(ofBase));
    }
    expect(jobsFor('lods', kit).find((j) => j.id === 'lods-average')?.needs).toContain('haircaps-average');
    expect(jobsFor('lods', kit).find((j) => j.id === 'lods-broad')?.needs.some((n) => n.startsWith('haircaps-'))).toBe(false);
    expect(jobsFor('lods', kit).find((j) => j.id === 'lods-shield_riot')?.needs).toEqual(['gear-shield_riot', 'bodies-broad']); // G4: skinned on the enforcer's rig
  });
});

describe('guard bake plan: heads on G1\'s fit (G1h fix round)', () => {
  const kit = realKit as unknown as { bases: { id: string; macro: Record<string, number>; refHeight: number }[]; pieces: { id: string; fit?: string }[] };
  const heads = () => jobsFor('heads', kit);
  const byId = (jobs: Job[], id: string) => jobs.find((j) => j.id === id) as Job;

  it('heads and hair caps need prep, hash guard_body.py and guard_skin.py, and carry their base entry', () => {
    for (const j of heads()) {
      expect(j.needs).toEqual(['prep']);
      expect(j.files).toEqual(expect.arrayContaining(['scripts/operators/py/guard_body.py', 'scripts/operators/py/guard_skin.py']));
      const k = j.kit as { base: { id: string; macro: unknown; refHeight: number } };
      expect(k.base.id).toBe(j.tags[j.tags.includes('haircaps') ? 0 : 1]);
      expect(k.base.macro).toBeDefined();
      expect(k.base.refHeight).toBeGreaterThan(1.7);
    }
    const caps = byId(heads(), 'haircaps-lean').kit as { entry: { heads: { id: string }[] } };
    expect(caps.entry.heads.map((h) => h.id)).toEqual(['lean-1', 'lean-2', 'lean-3', 'lean-4']);
  });

  it('a base macro change rebakes that base\'s heads and caps only; a head recipe change its own head and its base\'s caps', () => {
    const f = hashesFor(heads());
    const hash = (k: unknown) => Object.fromEntries(jobsFor('heads', k).map((j) => [j.id, inputHash(j, f, upstreamFor(j))]));
    const h0 = hash(kit);
    const k1 = structuredClone(kit);
    (k1.bases.find((b) => b.id === 'lean') as { macro: Record<string, number> }).macro.weight = 0.4;
    const h1 = hash(k1);
    const changed = (h: Record<string, string>) => Object.keys(h0).filter((id) => h[id] !== h0[id]);
    expect(changed(h1)).toEqual(['heads-lean-1', 'heads-lean-2', 'heads-lean-3', 'heads-lean-4', 'haircaps-lean']);
    const k2 = structuredClone(realKit) as unknown as { heads: { id: string; targets: Record<string, number> }[] };
    const t = (k2.heads.find((h) => h.id === 'average-2') as { targets: Record<string, number> }).targets;
    t[Object.keys(t)[0] as string] = 0.123;
    expect(changed(hash(k2))).toEqual(['heads-average-2', 'haircaps-average']);
    expect(inputHash(byId(heads(), 'heads-lean-1'), f, { prep: 'rebuilt' })).not.toBe(h0['heads-lean-1']);
  });

  it('declares the face PNGs and the envelope + eye block on the job that writes them (= guardHeadCheck headJobOutputs)', () => {
    const j = byId(heads(), 'heads-average-3');
    expect(j.outputs).toEqual(['heads/guard-average-3-head.blend', 'heads/guard-average-3-head.json',
      'heads/guard-average-3-face-albedo.png', 'heads/guard-average-3-face-normal.png', 'heads/guard-average-3-face-orm.png']);
    expect(byId(heads(), 'heads-broad-1').outputs).toEqual(expect.arrayContaining(['heads/broad/envelope.json', 'heads/guard-broad-eyes-albedo.png']));
    const c = byId(heads(), 'haircaps-average').outputs;
    expect(c).toEqual(expect.arrayContaining(['heads/average/envelope.json', 'heads/guard-average-cap-sidepart-normal.png', 'heads/guard-average-eyes-orm.png']));
    expect(c.filter((o) => o.includes('envelope'))).toEqual(['heads/average/envelope.json']);
  });

  it('gear fitted on the head envelope needs the job that writes its base\'s envelope; other gear does not', () => {
    const fit = Object.fromEntries(kit.pieces.map((p) => [p.id, p.fit]));
    const gear = jobsFor('gear', kit).filter((j) => j.tags.length === 2);
    const env = { average: 'haircaps-average', lean: 'haircaps-lean', broad: 'heads-broad-1' } as Record<string, string>;
    for (const j of gear) {
      const [b, p] = j.tags as [string, string];
      expect(j.needs, j.id).toEqual(fit[p] === 'headEnvelope' ? [`bodies-${b}`, env[b]] : [`bodies-${b}`]);
    }
    expect(byId(jobsFor('gear', kit), 'gear-broad-helmet_heavy').needs).toEqual(['bodies-broad', 'heads-broad-1']);
    expect(gear.filter((j) => j.needs.length === 2).length).toBeGreaterThan(5);
  });
});

describe('guard bake plan: shippable outputs and the contract kit', () => {
  it('ships glb, ktx2, png, report.json and the base guard-<b>.json only', () => {
    for (const ok of ['lods/guard-average-lod0.glb', 'lods/a.ktx2', 'sheet/guard-sheet.png', 'lods/guard-average.report.json', 'check/guard-lean.check.report.json', 'lods/guard-broad.json']) expect(plan.shippable(ok), ok).toBe(true);
    for (const no of ['bodies/guard-average-body.blend', 'bodies/guard-average-body.json', 'logs/x.log', 'heads/x.hash', 'lods/guard-average.layout.json', 'lods/guard-average.bake.json']) expect(plan.shippable(no), no).toBe(false);
  });

  it('the built-in contract kit gives the same split as the fixture', () => {
    const ck = plan.contractKit();
    for (const s of ['prep', 'bodies', 'heads', 'garments', 'gear', 'lods', 'check', 'sheet']) expect(jobsFor(s, ck).map((j) => j.id)).toEqual(jobsFor(s, fixtureKit()).map((j) => j.id));
  });
});
