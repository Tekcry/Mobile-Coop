import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
// @ts-expect-error plain .mjs tool script without types
import { planRuns, walkedBy, sectionRouteCount, ROUTE_KINDS } from '../scripts/route-run/plan.mjs';

// route-runs R1 (docs/route-runs/PLAN.md "R1 Route planner" on feature/route-runs-2): which runs the robot pair walks.
const ROOT = path.resolve(__dirname, '..');
const FIX = path.join(ROOT, 'tests/fixtures/route-run');
const read = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;
const load = <T = Graph>(name: string): T => read<T>(path.join(FIX, name));
const metrics = read<{ rules: { split_speed_mps: number } }>(path.join(ROOT, 'docs/design/metrics.json'));

// Graph files (docs/level-validator/graph-schema.md) and the points table, as far as these tests read them.
interface GSpace { id: string; section: string; type: string; tags: string[]; area?: number[][]; [k: string]: unknown }
interface GLink { from: string; to: string; kind: string; route: string; [k: string]: unknown }
interface Graph { meta: { sections: string[]; taught_by?: string; [k: string]: unknown }; spaces: GSpace[]; links: GLink[] }
interface Points { geom: string; spaces: unknown[]; links: { at: number[] | null; [k: string]: unknown }[] }
interface PlanOpts { metrics?: unknown; speed?: number }

interface WalkStep { type: 'walk'; to: number[] | null; space: string; link: number | null }
interface ObjectiveStep { type: 'objective'; space: string }
interface SplitStep { type: 'split'; id: string; fork: string; a: Step[]; b: Step[]; rejoin: string }
type Step = WalkStep | LinkStep | ObjectiveStep | SplitStep;
interface LinkStep { type: 'link'; index: number; kind: string; route: string; from: string; to: string; reverse: boolean;
  at: number[] | null; action: string; limit_s: number | null; hold_s: number; holdFrom: string }
interface Run { id: string; section: string | null; kind: string | null; covers: [string, string][];
  unplannable: string | null; cost: number | null; steps: Step[]; parts?: { section: string; start: number; end: number }[] }
interface Plan { map: string; mode: string; sections: string[]; notes: string[]; pairs: [string, string][];
  kinds: Record<string, string[]>; runs: Run[]; candidates: { section: string; kind: string; covers: [string, string][] }[] }

const plan = (graphs: Graph[], points: Points | null, opts: PlanOpts = { metrics }): Plan => planRuns(graphs, points, opts);
const objectives = (steps: Step[]) => steps.flatMap((s) => (s.type === 'objective' ? [s.space] : []));
const linksOf = (steps: Step[]) => steps.filter((s): s is LinkStep => s.type === 'link');
const key = (p: [string, string]) => `${p[0]}|${p[1]}`;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/** Pairs a run really enters (a link step into the space with the pair's route kind), from its steps alone. */
function enteredPairs(run: Run, pairs: [string, string][]): Set<string> {
  const want = new Set(pairs.map(key));
  const out = new Set<string>();
  for (const s of walkedBy(run) as LinkStep[]) if (want.has(`${s.to}|${s.route}`)) out.add(`${s.to}|${s.route}`);
  return out;
}

/** The run's steps form one walk: every link leaves the space the robots are in (split legs from the fork, both ending
 *  at the rejoin), and the run ends in `end`. */
function expectContinuous(steps: Step[], start: string, end: string) {
  let at = start;
  const walk = (list: Step[], from: string): string => {
    let here = from;
    for (const s of list) {
      if (s.type === 'link') {
        expect(s.from, `link ${s.index} leaves ${s.from}, robots are in ${here}`).toBe(here);
        here = s.to;
      } else if (s.type === 'split') {
        expect(s.fork).toBe(here);
        expect(walk(s.a, s.fork)).toBe(s.rejoin);
        expect(walk(s.b, s.fork)).toBe(s.rejoin);
        here = s.rejoin;
      } else if (s.type === 'objective') {
        expect(s.space).toBe(here);
      }
    }
    return here;
  };
  at = walk(steps, at);
  expect(at).toBe(end);
  const last = steps[steps.length - 1];
  expect(last).toMatchObject({ type: 'walk', space: end, link: null });
}

/** Every declared pair is covered, every claimed cover is really walked, every section route kind is walked. */
function expectFullCoverage(p: Plan, sections: string[]) {
  const claimed = new Set<string>();
  for (const r of p.runs.filter((x) => x.section !== null)) {
    const entered = enteredPairs(r, p.pairs);
    for (const c of r.covers) {
      expect(entered.has(key(c)), `${r.id} claims ${key(c)} but never enters it that way`).toBe(true);
      claimed.add(key(c));
    }
  }
  expect([...claimed].sort()).toEqual(p.pairs.map(key).sort());
  for (const s of sections) {
    const walked = new Set(p.runs.filter((r) => r.section === s).flatMap((r) => (walkedBy(r) as LinkStep[]).map((l) => l.route)));
    for (const k of p.kinds[s] ?? []) expect(walked.has(k), `${s}: no run walks a ${k} link`).toBe(true);
  }
}

/** Smallest number of candidate runs that covers every pair (brute force; fixtures are small). */
function minimumCover(p: Plan): number {
  const cands = p.candidates.map((c) => new Set(c.covers.map(key)));
  const all = p.pairs.map(key);
  for (let n = 1; n <= cands.length; n++) {
    const pick = (from: number, left: number, got: Set<string>): boolean => {
      if (left === 0) return all.every((k) => got.has(k));
      for (let i = from; i < cands.length; i++) if (pick(i + 1, left - 1, new Set([...got, ...cands[i]!]))) return true;
      return false;
    };
    if (pick(0, n, new Set())) return n;
  }
  return Infinity;
}

describe('route-run plan: campaign fixture (two sections, split, co-op gate)', () => {
  const graph = load('plan-campaign.graph.json');
  const points = load<Points>('plan-campaign.points.json');
  const p = plan([graph], points);

  it('declares the pairs and kinds of both sections', () => {
    expect(p.sections).toEqual(['S1', 'S2']);
    expect(p.pairs).toEqual([
      ['s1-yard', 'shadow'], ['s1-yard', 'high'], ['s1-yard', 'loud'],
      ['s2-hall', 'shadow'], ['s2-hall', 'high'], ['s2-hall', 'loud'],
    ]);
    expect(p.kinds).toEqual({ S1: ROUTE_KINDS, S2: ROUTE_KINDS });
  });

  it('covers every (encounter space, kind) pair and every section kind with exactly the runs printed', () => {
    expectFullCoverage(p, ['S1', 'S2']);
    expect(p.runs.map((r) => r.id).sort()).toEqual(['S1-high', 'S1-loud', 'S1-shadow', 'S2-high', 'S2-loud', 'S2-shadow']);
    for (const r of p.runs) expect(r.unplannable).toBeNull();
  });

  it('walks each run entry -> objective -> exit without a jump', () => {
    for (const r of p.runs) {
      if (r.section === 'S1') expectContinuous(r.steps, 's1-street', 's1-dock');
      else expectContinuous(r.steps, 's2-lobby', 's2-exit');
      const objective = r.section === 'S1' ? 's1-office' : 's2-control';
      expect(objectives(r.steps)).toEqual([objective]);
    }
  });

  it('walks the split as one route: leader leg a, follower leg b, rejoined at the control room', () => {
    for (const r of p.runs.filter((x) => x.section === 'S2')) {
      const splits = r.steps.filter((s): s is SplitStep => s.type === 'split');
      expect(splits).toHaveLength(1);
      const sp = splits[0]!;
      expect(sp).toMatchObject({ id: 'x', fork: 's2-hall', rejoin: 's2-control' });
      expect(linksOf(sp.a).map((s) => s.to)).toEqual(['s2-east', 's2-control']);
      expect(linksOf(sp.b).map((s) => s.to)).toEqual(['s2-west', 's2-control']);
    }
  });

  it('stubs the co-op gate with its declared time and gives solo links their A4 limits', () => {
    const steps = p.runs.flatMap((r) => walkedBy(r) as LinkStep[]);
    const gate = steps.find((s) => s.kind === 'pair_gate');
    expect(gate).toMatchObject({ action: 'stub', hold_s: 5, holdFrom: 'declared', at: [26, 0, 30], limit_s: null });
    const ladder = steps.find((s) => s.kind === 'ladder' && s.index === 1);
    expect(ladder).toMatchObject({ action: 'ladder', limit_s: 15 + 4.5 });
    expect(steps.find((s) => s.kind === 'drop')).toMatchObject({ action: 'drop', limit_s: 5 });
    expect(steps.find((s) => s.kind === 'door')).toMatchObject({ action: 'door', limit_s: 5 });
    for (const s of steps) if (s.kind === 'drop') expect(s.reverse).toBe(false);
  });

  it('takes link points from the points table, by merged link index', () => {
    for (const r of p.runs) {
      for (const s of walkedBy(r) as LinkStep[]) expect(s.at).toEqual(points.links[s.index]!.at);
    }
  });

  it('plans the same runs from one file per section (validator file order)', () => {
    const s1 = { meta: { ...graph.meta, sections: ['S1'] }, spaces: graph.spaces.filter((s) => s.section === 'S1'),
      links: graph.links.slice(0, 9) };
    const s2 = { meta: { ...graph.meta, sections: ['S2'] }, spaces: graph.spaces.filter((s) => s.section === 'S2'),
      links: graph.links.slice(9) };
    expect(plan([s1, s2], points).runs).toEqual(p.runs);
  });

  it('reads the pace from metrics rules.split_speed_mps and refuses to plan without one', () => {
    expect(plan([graph], points, { speed: metrics.rules.split_speed_mps }).runs).toEqual(p.runs);
    expect(() => plan([graph], points, {})).toThrow(/split speed/);
  });
});

describe('route-run plan: unplannable runs (BRIEF A8)', () => {
  const graph = load('plan-campaign.graph.json');
  const points = load<Points>('plan-campaign.points.json');

  it('a removed area makes the run through that space unplannable, naming it', () => {
    const g = clone(graph);
    delete g.spaces.find((s) => s.id === 's1-alley')!.area;
    const p = plan([g], points);
    const shadow = p.runs.find((r) => r.id === 'S1-shadow')!;
    expect(shadow.unplannable).toMatch(/space s1-alley has no area/);
    for (const r of p.runs.filter((x) => x.id !== 'S1-shadow')) expect(r.unplannable).toBeNull();
    expectFullCoverage(p, ['S1', 'S2']);
  });

  it('a link with no point makes its run unplannable, naming the link', () => {
    const pts = clone(points);
    pts.links[4]!.at = null;
    const p = plan([graph], pts);
    expect(p.runs.find((r) => r.id === 'S1-loud')!.unplannable).toMatch(/link 4 \(s1-street -> s1-yard, roller_door\) has no point/);
    expect(p.runs.filter((r) => r.unplannable).map((r) => r.id)).toEqual(['S1-loud']);
  });
});

describe('route-run plan: training fixture (three sections, taught_by on the second)', () => {
  const graph = load('plan-training.graph.json');
  const points = load<Points>('plan-training.points.json');
  const p = plan([graph], points);
  const a3 = new Set(graph.spaces.filter((s) => s.section === 'A3').map((s) => s.id));

  it('gives the start-to-exfil run, cut per section', () => {
    const full = p.runs.find((r) => r.id === 'full')!;
    expect(full).toMatchObject({ section: null, kind: null, unplannable: null });
    expectContinuous(full.steps, 'a1-gate', 'a3-hold');
    expect(objectives(full.steps)).toEqual(['a2-pit']);
    expect(full.parts!.map((x) => x.section)).toEqual(['A1', 'A2', 'A3']);
    expect(full.parts![0]!.start).toBe(0);
    expect(full.parts![2]!.end).toBe(full.steps.length);
    for (let i = 1; i < full.parts!.length; i++) expect(full.parts![i]!.start).toBe(full.parts![i - 1]!.end);
    expect(p.notes).toEqual([]);
  });

  it('adds runs covering the late section\'s three kinds, none in the first two sections', () => {
    const side = p.runs.filter((r) => r.id !== 'full');
    expect(side.map((r) => r.section)).toEqual(side.map(() => 'A3'));
    expect(p.pairs).toEqual([['a3-strong', 'shadow'], ['a3-strong', 'loud']]);
    expect(p.kinds).toEqual({ A3: ['shadow', 'high', 'loud'] });
    expectFullCoverage(p, ['A3']);
    for (const r of side) {
      expectContinuous(r.steps, 'a3-hall', 'a3-hold');
      for (const s of walkedBy(r) as LinkStep[]) {
        expect(a3.has(s.from) && a3.has(s.to), `${r.id} leaves A3 at link ${s.index}`).toBe(true);
      }
    }
    // The high route ends at a connector (the public gallery): no encounter pair, still walked by its own run.
    const high = side.find((r) => r.kind === 'high')!;
    expect(high.covers).toEqual([]);
    expect((walkedBy(high) as LinkStep[]).map((s) => s.kind)).toEqual(['open_stair', 'door']);
  });

  it('stubs the taught boost in the full run', () => {
    const boost = (walkedBy(p.runs[0]!) as LinkStep[]).find((s) => s.kind === 'coop_boost');
    expect(boost).toMatchObject({ action: 'stub', hold_s: 6, holdFrom: 'declared', at: [5, 0, 20] });
  });

  it('counts routes per section as J12 A26 does', () => {
    expect(sectionRouteCount([graph], 'A1')).toBe(1);
    expect(sectionRouteCount([graph], 'A2')).toBe(1);
    expect(sectionRouteCount([graph], 'A3')).toBe(3);
  });

  it('without taught_by gives the one run and the note', () => {
    const g = clone(graph);
    delete g.meta.taught_by;
    const q = plan([g], points);
    expect(q.runs.map((r) => r.id)).toEqual(['full']);
    expect(q.runs[0]!.steps).toEqual(p.runs[0]!.steps);
    expect(q.notes).toEqual(['side routes not run: the graph has no meta.taught_by']);
  });

  it('with taught_by on the last section gives the one run and no side routes', () => {
    const g = clone(graph);
    g.meta.taught_by = 'A3';
    const q = plan([g], points);
    expect(q.runs.map((r) => r.id)).toEqual(['full']);
    expect(q.notes).toEqual([]);
  });
});

describe('route-run plan: campus S1 (copy of the V6 graph)', () => {
  const graph = load('campusOps-S1.graph.json');
  const points = load<Points>('campusOps-S1.points.json');
  const p = plan([graph], points);

  it('covers every pair and kind with the minimum number of runs', () => {
    expect(p.pairs).toHaveLength(9);
    expectFullCoverage(p, ['S1']);
    for (const r of p.runs) {
      expect(r.unplannable).toBeNull();
      expectContinuous(r.steps, 's1-verge', 's1-forecourt');
      expect(objectives(r.steps)).toEqual(['s1-gatehouse']);
    }
    const min = minimumCover(p);
    expect(min).toBeLessThan(Infinity);
    expect(p.runs.length).toBe(min);
  });

  it('never walks a boost backwards and never walks the secret door on its own', () => {
    for (const r of p.runs) {
      for (const s of walkedBy(r) as LinkStep[]) {
        if (s.kind === 'coop_boost' || s.kind === 'drop') expect(s.reverse).toBe(false);
        expect(s.route).not.toBe('spine');
      }
      expect(r.kind).not.toBe('secret');
    }
  });
});

describe('route-run plan: identical step lists merge', () => {
  it('two pairs walked by the same path become one candidate and one run', () => {
    const sp = (id: string, type: string, tags: string[] = []) => ({ id, section: 'S1', type, room_class: 'custom',
      function: id, storey: 0, size: [4, 4, 3], area: [[0, 0, 4, 4]], tension: 1, tags });
    const g: Graph = {
      meta: { map: 'merge', name: 'merge', mode: 'campaign', players: [2], sections: ['S1'] },
      spaces: [sp('in', 'exterior', ['start', 'entry']), sp('e1', 'encounter'), sp('e2', 'encounter'), sp('out', 'exterior', ['exit', 'exfil'])],
      links: [
        { from: 'in', to: 'e1', kind: 'opening', route: 'shadow', length: 10, at: [0, 0, 0] },
        { from: 'e1', to: 'e2', kind: 'opening', route: 'shadow', length: 10, at: [0, 0, 0] },
        { from: 'e2', to: 'out', kind: 'opening', route: 'shadow', length: 10, at: [0, 0, 0] },
        { from: 'in', to: 'out', kind: 'corridor', route: 'spine', length: 100, at: [0, 0, 0] },
      ],
    };
    const q = plan([g], null, { speed: 1.3 });
    expect(q.pairs).toEqual([['e1', 'shadow'], ['e2', 'shadow']]);
    expect(q.candidates).toHaveLength(1);
    expect(q.runs).toHaveLength(1);
    expect(q.runs[0]!.covers).toEqual([['e1', 'shadow'], ['e2', 'shadow']]);
    expect((walkedBy(q.runs[0]!) as LinkStep[]).map((s) => s.index)).toEqual([0, 1, 2]);
  });
});

describe('route-run plan: a split rejoined, then a path back through a leg space (Marlow re-plan A7)', () => {
  const graph = read<Graph>(path.join(ROOT, 'docs/marlow-replan/graph.json'));
  const p = plan([graph], null);
  const full = p.runs.find((r) => r.id === 'full')!;

  it('starts each split once: the A7 data hall split is not forked again after its rejoin at the cage', () => {
    const ids = full.steps.filter((s): s is SplitStep => s.type === 'split').map((s) => s.id);
    expect(ids.filter((id) => id === 'a7')).toHaveLength(1);
    expect(String(full.unplannable ?? '')).not.toMatch(/split a7/);
  });
});

describe('route-run plan: a split entered through a co-op link (Marlow re-plan A8 high, A28)', () => {
  const graph = read<Graph>(path.join(ROOT, 'docs/marlow-replan/graph.json'));
  // the declared graph has no `at` on a few walk links (the route-run's --points auto table measures them): fill them so
  // the run is judged on its plan alone
  const filled = clone(graph);
  for (const l of filled.links) if (!Array.isArray(l.at)) l.at = [0, 0, 0];
  const p = plan([filled], null);
  const high = p.runs.find((r) => r.id === 'A8-high')!;
  const indices = (steps: Step[]) => linksOf(steps).map((s) => s.index);
  const linkIndex = (from: string, to: string, kind: string) =>
    graph.links.findIndex((l) => l.from === from && l.to === to && l.kind === kind);

  it('plans A8-high with one a8 split, forked at the hall where B boosts A up and keeps to the counters', () => {
    expect(high.unplannable).toBeNull();
    const splits = high.steps.filter((s): s is SplitStep => s.type === 'split');
    expect(splits.map((s) => s.id)).toEqual(['a8']);
    const sp = splits[0]!;
    expect(sp.fork).toBe('a8-hall');
    expect(sp.rejoin).toBe('a8-lobby-outer');
    // leg a (leader): the leg-up onto the gallery's west return, round to the gallery, the office, its stair down
    expect(indices(sp.a)).toEqual([
      linkIndex('a8-hall', 'a8-gallery-west', 'coop_boost'),
      linkIndex('a8-gallery-west', 'a8-gallery', 'opening'),
      linkIndex('a8-gallery', 'a8-office', 'door'),
      linkIndex('a8-office', 'a8-lobby-outer', 'fire_stair'),
    ]);
    expect(linksOf(sp.a)[0]).toMatchObject({ action: 'stub', from: 'a8-hall', to: 'a8-gallery-west' });
    // leg b (follower): stays on the floor, behind the counters to the board, through the grille
    expect(linksOf(sp.b).map((s) => [s.from, s.to])).toEqual([
      ['a8-hall', 'a8-counters'], ['a8-counters', 'a8-board'], ['a8-board', 'a8-lobby-outer'],
    ]);
    expect(linksOf(sp.b).every((s) => s.action !== 'stub')).toBe(true);
    expectContinuous(high.steps, 'a8-vestibule', 'a8-dock');
  });

  it('keeps A8-loud and the full run forking at the hall, the A7 split once', () => {
    for (const id of ['A8-loud', 'full']) {
      const r = p.runs.find((x) => x.id === id)!;
      const forks = r.steps.filter((s): s is SplitStep => s.type === 'split').map((s) => `${s.id}@${s.fork}`);
      expect(forks.filter((f) => f.startsWith('a8@'))).toEqual(['a8@a8-hall']);
      expect(String(r.unplannable ?? '')).not.toMatch(/split/);
    }
  });

  it('never walks back past a second co-op link: only the leg\'s first link may be co-op', () => {
    const g: Graph = {
      meta: { sections: ['S'], mode: 'campaign' },
      spaces: [
        { id: 'in', section: 'S', type: 'connector', tags: ['entry'], area: [[0, 0, 1, 1]] },
        { id: 'f', section: 'S', type: 'connector', tags: [], area: [[0, 0, 1, 1]] },
        { id: 'u1', section: 'S', type: 'connector', tags: [], area: [[0, 0, 1, 1]] },
        { id: 'u2', section: 'S', type: 'connector', tags: [], area: [[0, 0, 1, 1]] },
        { id: 'la', section: 'S', type: 'encounter', tags: ['split:x:a'], area: [[0, 0, 1, 1]] },
        { id: 'lb', section: 'S', type: 'connector', tags: ['split:x:b'], area: [[0, 0, 1, 1]] },
        { id: 'r', section: 'S', type: 'connector', tags: ['exit'], area: [[0, 0, 1, 1]] },
      ],
      links: [
        { from: 'in', to: 'f', kind: 'opening', route: 'shadow', length: 5, at: [0, 0, 0] },
        { from: 'f', to: 'u1', kind: 'coop_boost', route: 'high', time_s: 6, at: [0, 0, 0] },
        { from: 'u1', to: 'u2', kind: 'coop_boost', route: 'high', time_s: 6, at: [0, 0, 0] },
        { from: 'u2', to: 'la', kind: 'opening', route: 'high', length: 5, at: [0, 0, 0] },
        { from: 'f', to: 'lb', kind: 'opening', route: 'shadow', length: 5, at: [0, 0, 0] },
        { from: 'la', to: 'r', kind: 'opening', route: 'high', length: 5, at: [0, 0, 0] },
        { from: 'lb', to: 'r', kind: 'opening', route: 'shadow', length: 5, at: [0, 0, 0] },
      ],
    };
    const run = plan([g], null, { speed: 1.3 }).runs.find((r) => r.kind === 'high')!;
    expect(run.unplannable).toMatch(/split x leg b: no solo link from u2 to lb/);
    // one co-op link back to a fork with a solo way into the other leg: planned
    const one = clone(g);
    one.links[1] = { from: 'f', to: 'u2', kind: 'coop_boost', route: 'high', time_s: 6, at: [0, 0, 0] };
    one.links.splice(2, 1);
    const ok = plan([one], null, { speed: 1.3 }).runs.find((r) => r.kind === 'high')!;
    expect(ok.unplannable).toBeNull();
    const sp = ok.steps.find((s): s is SplitStep => s.type === 'split')!;
    expect(sp.fork).toBe('f');
    expect(linksOf(sp.a).map((s) => s.action)).toEqual(['stub', 'walk', 'walk']);
    expect(linksOf(sp.b).map((s) => s.to)).toEqual(['lb', 'r']);
    expectContinuous(ok.steps, 'in', 'r');
  });
});
