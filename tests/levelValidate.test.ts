import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  checkCoop, checkDimensions, checkEncounters, checkPacing, checkReach, checkRedundancy, checkSpine, checkStructure,
  edgeDisjointPaths, mergeGraphs, parseArgs, run, validate,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/level-validate.mjs';

// level-validator V1: the graph validator (docs/level-validator/graph-schema.md) against docs/design/metrics.json.
const ROOT = path.resolve(__dirname, '..');

interface Report { errors: string[]; warns: string[]; infos: string[] }
interface Space {
  id: string; section: string; type: string; room_class: string; function: string; storey: number;
  size: number[]; tension: number; tags: string[]; shadow_pct?: number; los_break_s?: number; drill_s?: number;
  vantage?: { from: string; sees_pct?: number }; guards?: Record<string, number>; phase?: string;
}
interface Link {
  from: string; to: string; kind: string; route: string; width?: number; height?: number; length?: number;
  time_s?: number; level_change?: number; shared?: boolean; one_way?: boolean; assist?: string; bolted?: boolean;
}
interface Graph { meta: { map: string; name: string; mode: string; players: number[]; sections: string[] }; spaces: Space[]; links: Link[] }
type Metrics = Record<string, unknown> & { sizes: Record<string, unknown>; rules: Record<string, unknown>; rooms: Record<string, Record<string, unknown>> };

const REAL_METRICS = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/design/metrics.json'), 'utf8')) as Metrics;
/** A fresh copy of the real sheet numbers (tests mutate their own copy). */
const fullMetrics = (): Metrics => structuredClone(REAL_METRICS);
const METRICS = fullMetrics();

const sp = (id: string, section: string, type: string, room_class: string, size: number[], tension: number, tags: string[] = [], extra: Partial<Space> = {}): Space =>
  ({ id, section, type, room_class, function: `${id} test space`, storey: 0, size, tension, tags, ...extra });
const ln = (from: string, to: string, kind: string, route: string, extra: Partial<Link> = {}): Link => ({ from, to, kind, route, ...extra });
const DOOR = { width: 1.2, height: 2.1 };
const DDOOR = { width: 2.0, height: 2.1 };
const DUCT = { width: 1.2, height: 1.5 };

/** Minimal valid map (Sector Ops profile, two players): S1 (a gate, an encounter court with a roof walk, the exit hut),
 *  one spine corridor, S2 (a hall that splits into dock (leg a) and walk (leg b, the overwatch) around the vault
 *  encounter, then the exfil yard). */
const base = (): Graph => ({
  meta: { map: 'testMap', name: 'Test Map', mode: 'sector', players: [2], sections: ['S1', 'S2'] },
  spaces: [
    sp('a-gate', 'S1', 'exterior', 'yard', [14, 14, 12], 1, ['start', 'entry']),
    sp('a-court', 'S1', 'encounter', 'yard', [14, 20, 12], 3, ['unavoidable'],
      { shadow_pct: 0.5, los_break_s: 4, vantage: { from: 'a-roof', sees_pct: 0.75 }, guards: { 2: 4 } }),
    sp('a-roof', 'S1', 'connector', 'corridor', [3.5, 14, 3], 2),
    sp('a-hut', 'S1', 'utility', 'security_room', [5.5, 7, 3], 2, ['exit']),
    sp('b-hall', 'S2', 'hub', 'lobby', [14, 17, 4.5], 2, ['entry']),
    sp('b-dock', 'S2', 'exterior', 'yard', [14, 14, 12], 3, ['split:x:a']),
    sp('b-walk', 'S2', 'connector', 'corridor', [3.5, 14, 3], 3, ['split:x:b', 'overwatch:x']),
    sp('b-vault', 'S2', 'encounter', 'loading_dock', [21, 28, 8], 4, ['objective'],
      { shadow_pct: 0.45, los_break_s: 3, vantage: { from: 'b-walk', sees_pct: 0.8 }, guards: { 2: 7 } }),
    sp('b-out', 'S2', 'exterior', 'yard', [14, 14, 12], 2, ['exit', 'exfil']),
  ],
  links: [
    ln('a-gate', 'a-court', 'opening', 'shadow', { width: 3, height: 2.1, length: 17 }),
    ln('a-gate', 'a-court', 'roller_door', 'loud', { width: 3, height: 3, length: 17 }),
    ln('a-gate', 'a-court', 'duct', 'secret', { ...DUCT, length: 17, time_s: 20 }),
    ln('a-gate', 'a-roof', 'ladder', 'high', { level_change: 4.5, length: 10, time_s: 12 }),
    ln('a-roof', 'a-court', 'ladder', 'high', { level_change: 4.5, length: 10, time_s: 12 }),
    ln('a-court', 'a-roof', 'coop_boost', 'high', { level_change: 4.5, length: 6, time_s: 5 }),
    ln('a-court', 'a-hut', 'door', 'shadow', { ...DOOR, length: 13 }),
    ln('a-court', 'a-hut', 'double_door', 'loud', { ...DDOOR, length: 13 }),
    ln('a-hut', 'b-hall', 'corridor', 'spine', { width: 3.5, height: 3, length: 20, shared: true }),
    ln('b-hall', 'b-dock', 'door', 'shadow', { ...DOOR, length: 15 }),
    ln('b-dock', 'b-vault', 'door', 'shadow', { ...DOOR, length: 15 }),
    ln('b-hall', 'b-walk', 'fire_stair', 'high', { width: 1.3, level_change: 4.5, length: 10, time_s: 8 }),
    ln('b-walk', 'b-vault', 'ladder', 'high', { level_change: 4.5, length: 10, time_s: 12, assist: 'x' }),
    ln('b-vault', 'b-walk', 'coop_boost', 'high', { level_change: 4.5, length: 6, time_s: 5 }),
    ln('b-hall', 'b-vault', 'double_door', 'loud', { ...DDOOR, length: 20 }),
    ln('b-hall', 'b-vault', 'duct', 'secret', { ...DUCT, length: 20, time_s: 20 }),
    ln('b-vault', 'b-out', 'roller_door', 'loud', { width: 3, height: 3, length: 18 }),
    ln('b-vault', 'b-out', 'door', 'shadow', { ...DOOR, length: 18 }),
  ],
});

/** base() plus one valid link of each kind the base lacks, at the sheet sizes. */
const withKinds = (): Graph => {
  const g = base();
  g.links.push(
    ln('a-court', 'a-hut', 'tunnel', 'secret', { width: 2.5, height: 2.4, length: 13 }),
    ln('a-gate', 'a-roof', 'open_stair', 'high', { width: 2.4, level_change: 4.5, length: 10 }),
    // Longer than the 6 m coop_boost beside them, so they are other ways up, not its solo twin.
    ln('a-court', 'a-roof', 'wall_jump', 'high', { level_change: 3.5, length: 8, time_s: 4 }),
    ln('a-court', 'a-roof', 'split_jump', 'high', { width: 1.5, height: 4, level_change: 4.5, length: 8, time_s: 6 }),
    ln('a-roof', 'a-court', 'drop', 'high', { level_change: 4.5, length: 4, time_s: 2 }),
  );
  return g;
};

/** base() as a campaign map: each section's exit is behind forced co-op gates (level-design 11.10): S1's hut doors are
 *  team doors (pair_gate), S2's yard is reached by a throw over the dock pit or the team door the thrown partner opens. */
const campaignBase = (): Graph => {
  const g = base();
  g.meta.mode = 'campaign';
  for (const l of g.links) {
    if (l.from === 'a-court' && l.to === 'a-hut') l.kind = 'pair_gate';
  }
  g.links = g.links.filter((l) => !(l.from === 'b-vault' && l.to === 'b-out'));
  g.links.push(
    ln('b-vault', 'b-out', 'pair_gate', 'shadow', { ...DOOR, length: 18 }),
    ln('b-vault', 'b-out', 'team_throw', 'loud', { width: 2.5, length: 18, time_s: 4 }),
  );
  return g;
};

const space = (g: Graph, id: string): Space => {
  const s = g.spaces.find((x) => x.id === id);
  if (!s) throw new Error(`no space ${id}`);
  return s;
};
const link = (g: Graph, from: string, to: string, kind: string): Link => {
  const l = g.links.find((x) => x.from === from && x.to === to && x.kind === kind);
  if (!l) throw new Error(`no link ${from} -> ${to} ${kind}`);
  return l;
};
const drop = (g: Graph, from: string, to: string, kind: string): void => {
  g.links = g.links.filter((x) => !(x.from === from && x.to === to && x.kind === kind));
};
const check = (g: Graph, metrics: unknown = METRICS): Report => validate(g, { metrics }) as Report;
const expectErr = (r: Report, ...frags: string[]): void => {
  for (const f of frags) expect(r.errors, `no ERROR containing "${f}"`).toContainEqual(expect.stringContaining(f));
};
const expectWarn = (r: Report, frag: string): void => {
  expect(r.warns, `no WARN containing "${frag}"`).toContainEqual(expect.stringContaining(frag));
};

describe('level-validate: passing graphs', () => {
  it('the inline minimal graph passes with 0 errors and 0 warnings', () => {
    const r = check(base());
    expect(r.errors).toEqual([]);
    expect(r.warns).toEqual([]);
    expect(r.infos).toEqual([]);
  });

  it('the real metrics.json carries every key the validator reads (no missing-key WARN)', () => {
    const r = check(withKinds(), REAL_METRICS);
    expect(r.errors).toEqual([]);
    expect(r.warns).toEqual([]);
    expect(r.infos).toEqual([]);
  });

  it('every link kind with a size rule passes at the sheet sizes (tunnel, open stair, wall jump, split jump, drop)', () => {
    const r = check(withKinds());
    expect(r.errors).toEqual([]);
    expect(r.warns).toEqual([]);
  });

  it('docs/level-validator/example.graph.json passes with the real metrics (V0 smoke fixture)', () => {
    const g = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/level-validator/example.graph.json'), 'utf8')) as Graph;
    const r = check(g, REAL_METRICS);
    expect(r.errors).toEqual([]);
    expect(r.warns.filter((w) => w.startsWith('metrics:'))).toEqual([]);
    expect(r.infos).toEqual([]);
  });

  it('no metrics: one WARN, size and time checks skipped (presence checks still run)', () => {
    const g = base();
    link(g, 'a-hut', 'b-hall', 'corridor').width = 2.9;
    link(g, 'b-hall', 'b-dock', 'door').length = 200;
    const r = check(g, null);
    expect(r.errors).toEqual([]);
    expect(r.warns).toEqual([expect.stringContaining('size and time checks skipped')]);
    delete space(g, 'a-court').los_break_s;
    expectErr(check(g, null), 'a-court: los_break_s missing');
  });

  it('a missing metrics key: one WARN and that check is skipped', () => {
    const m = fullMetrics();
    delete m.rules.split_max_s;
    const g = base();
    link(g, 'b-dock', 'b-vault', 'door').length = 120;
    const r = check(g, m);
    expect(r.errors.some((e) => e.includes('over the'))).toBe(false);
    expect(r.warns.filter((w) => w.includes('rules.split_max_s'))).toHaveLength(1);
  });
});

describe('level-validate: failing fixtures (PLAN V1 list)', () => {
  it('unreachable space', () => {
    const g = base();
    g.spaces.push(sp('a-lost', 'S1', 'utility', 'storage', [4, 4, 3], 2));
    expectErr(check(g), "unreachable from start 'a-gate': a-lost");
  });

  it('co-op-only space with no other route (no softlock)', () => {
    const g = base();
    g.spaces.push(sp('a-ledge', 'S1', 'reward', 'storage', [4, 4, 3], 2, ['reward']));
    g.links.push(ln('a-court', 'a-ledge', 'coop_boost', 'high', { level_change: 4.5, length: 6, time_s: 5 }));
    expectErr(check(g), 'a-ledge: reached only through co-op links (coop_boost)');
    expectErr(checkReach(g) as Report, 'a-ledge: reached only through co-op links');
  });

  it('a pair_gate counts as a co-op link for no-softlock', () => {
    const g = base();
    g.spaces.push(sp('a-cage', 'S1', 'reward', 'storage', [4, 4, 3], 2, ['reward']));
    g.links.push(ln('a-court', 'a-cage', 'pair_gate', 'shadow', { ...DOOR, length: 8 }));
    expectErr(check(g), 'a-cage: reached only through co-op links (pair_gate)');
  });

  it('a section skipped on the spine', () => {
    const g = base();
    g.meta.sections = ['S1', 'SM', 'S2'];
    g.spaces.splice(4, 0, sp('m-link', 'SM', 'hub', 'lobby', [14, 17, 4.5], 1, ['entry', 'exit']));
    link(g, 'a-hut', 'b-hall', 'corridor').to = 'm-link';
    g.links.push(ln('m-link', 'b-hall', 'corridor', 'spine', { width: 3.5, height: 3, length: 20 }));
    expect(checkSpine(g).errors).toEqual([]);
    g.links.push(ln('a-hut', 'b-hall', 'corridor', 'spine', { width: 3.5, height: 3, length: 40 }));
    expectErr(check(g), 'a route from start to exfil skips section SM', 'joins S1 and S2, not consecutive sections');
  });

  it('a non-spine link between sections and a spine link off exit -> entry', () => {
    const g = base();
    g.links.push(ln('a-court', 'b-dock', 'door', 'shadow', { ...DOOR, length: 30 }));
    link(g, 'a-hut', 'b-hall', 'corridor').from = 'a-court';
    expectErr(check(g), "crosses S1 -> S2 but its route is not 'spine'", "must join S1's exit to S2's entry");
  });

  it('encounter with 2 approaches', () => {
    const g = base();
    g.links = g.links.filter((l) => !(l.to === 'a-court' || l.from === 'a-court') || l.kind === 'opening' || l.kind === 'door');
    expectErr(check(g), 'a-court: 2 approaches (need 3+)');
  });

  it('encounter approaches of one route kind', () => {
    const g = base();
    for (const l of g.links) if (l.from === 'a-court' || l.to === 'a-court') l.route = 'shadow';
    expectErr(checkEncounters(g, METRICS) as Report, 'a-court: approaches use 1 route kind(s) (need 2+)');
  });

  it('missing loud route', () => {
    const g = base();
    drop(g, 'a-gate', 'a-court', 'roller_door');
    drop(g, 'a-court', 'a-hut', 'double_door');
    expectErr(check(g), 'a-court: no loud approach');
  });

  it('1 independent route (per section, entry -> exit)', () => {
    const g = base();
    drop(g, 'a-court', 'a-hut', 'double_door');
    expectErr(check(g), "section S1: 1 independent route(s) from entry 'a-gate' to exit 'a-hut'");
  });

  it('dead end on a route', () => {
    const g = base();
    g.spaces.push(sp('a-closet', 'S1', 'utility', 'storage', [4, 4, 3], 2));
    g.links.push(ln('a-roof', 'a-closet', 'door', 'shadow', { ...DOOR, length: 8 }));
    expectErr(check(g), 'a-closet: dead end (one way out) not tagged reward or objective');
    // A one-way drop in is no second way out.
    g.links.push(ln('a-roof', 'a-closet', 'drop', 'high', { level_change: 3, length: 4 }));
    expectErr(check(g), 'a-closet: dead end (one way out)');
  });

  it('dead ends count links, not neighbours: two ladders to one hall are a loop (campus s3-walkway)', () => {
    const g = base();
    g.spaces.push(sp('a-catwalk', 'S1', 'connector', 'corridor', [3.5, 14, 3], 2));
    g.links.push(ln('a-court', 'a-catwalk', 'ladder', 'high', { level_change: 4.5, length: 8 }));
    g.links.push(ln('a-court', 'a-catwalk', 'ladder', 'high', { level_change: 4.5, length: 8 }));
    expect(check(g).errors.filter((e) => e.includes('dead end'))).toEqual([]);
    g.links.pop();
    expectErr(check(g), 'a-catwalk: dead end (one way out)');
  });

  it('rule of three counts only links that can enter the space (one-way links leaving it do not; campus s5-roof)', () => {
    const g = base();
    g.links = g.links.filter((l) => !(l.to === 'a-court' || l.from === 'a-court') || l.kind === 'opening' || l.kind === 'door');
    const out = (kind: string, route: string): Link => ln('a-court', 'a-hut', kind, route, { ...DOOR, length: 13, one_way: true });
    g.links.push(out('door', 'loud'), out('door', 'high'), out('door', 'secret'));
    expectErr(checkEncounters(g, METRICS) as Report, 'a-court: 2 approaches (need 3+)');
    // The same three links turned to lead in are approaches.
    for (const l of g.links.slice(-3)) [l.from, l.to] = [l.to, l.from];
    const r = checkEncounters(g, METRICS) as Report;
    expect(r.errors.filter((e) => e.startsWith('a-court:'))).toEqual([]);
  });

  it('rule of three: a door from a side room entered only from this space is no approach', () => {
    const g = base();
    g.links = g.links.filter((l) => !(l.to === 'a-court' || l.from === 'a-court') || l.kind === 'opening' || l.kind === 'door');
    g.spaces.push(sp('a-store', 'S1', 'reward', 'storage', [4, 4, 3], 2, ['reward']));
    g.links.push(ln('a-court', 'a-store', 'door', 'loud', { ...DOOR, length: 8 }));
    expectErr(checkEncounters(g, METRICS) as Report, 'a-court: 2 approaches (need 3+)');
    // A second way into the side room (from the roof) makes its door a real approach.
    g.links.push(ln('a-roof', 'a-store', 'hatch', 'high', { length: 6 }));
    expect((checkEncounters(g, METRICS) as Report).errors).not.toContainEqual(expect.stringContaining('a-court: 2 approaches'));
  });

  it('a reward dead end deeper than the limit', () => {
    const g = base();
    g.spaces.push(sp('a-cache', 'S1', 'reward', 'storage', [4, 16, 3], 2, ['reward']));
    g.links.push(ln('a-roof', 'a-cache', 'door', 'shadow', { ...DOOR, length: 10 }));
    expectErr(check(g), 'a-cache: dead end 16 m deep, over 15 m');
  });

  it('corridor 2.9', () => {
    const g = base();
    link(g, 'a-hut', 'b-hall', 'corridor').width = 2.9;
    expectErr(check(g), 'link a-hut -> b-hall (corridor): corridor width 2.9 m below 3 m');
  });

  it('door 0.9 (and 1.1 under the 1.2 target is a WARN)', () => {
    const g = base();
    link(g, 'a-court', 'a-hut', 'door').width = 0.9;
    expectErr(check(g), 'link a-court -> a-hut (door): width 0.9 m below 1 m');
    link(g, 'a-court', 'a-hut', 'door').width = 1.1;
    const r = check(g);
    expect(r.errors).toEqual([]);
    expectWarn(r, 'width 1.1 m under the 1.2 m target');
  });

  it('step 0.42', () => {
    const g = base();
    link(g, 'a-gate', 'a-roof', 'ladder').level_change = 0.42;
    expectErr(check(g), 'level change 0.42 m in the forbidden step band, over 0.4 up to 0.45 m');
    link(g, 'a-gate', 'a-roof', 'ladder').level_change = 0.45;
    expectErr(check(g), 'level change 0.45 m in the forbidden step band');
    link(g, 'a-gate', 'a-roof', 'ladder').level_change = 0.4; // a curb: the sheet allows 0.15 - 0.40
    expect(check(g).errors).toEqual([]);
  });

  // Per-kind sizes (checker should-fix 4): each fails just past the sheet number; withKinds() is the pass case.
  const KIND_FAILS: [string, (g: Graph) => void, string][] = [
    ['roller door 2.5', (g) => { link(g, 'a-gate', 'a-court', 'roller_door').width = 2.5; }, 'link a-gate -> a-court (roller_door): width 2.5 m below 3 m'],
    ['duct 1.0 wide', (g) => { link(g, 'a-gate', 'a-court', 'duct').width = 1.0; }, 'link a-gate -> a-court (duct): width 1 m below 1.2 m'],
    ['duct 1.3 high', (g) => { link(g, 'a-gate', 'a-court', 'duct').height = 1.3; }, 'link a-gate -> a-court (duct): height 1.3 m below 1.5 m'],
    ['tunnel 2.0 high', (g) => { link(g, 'a-court', 'a-hut', 'tunnel').height = 2.0; }, 'link a-court -> a-hut (tunnel): height 2 m below 2.1 m'],
    ['fire stair 1.2', (g) => { link(g, 'b-hall', 'b-walk', 'fire_stair').width = 1.2; }, 'link b-hall -> b-walk (fire_stair): width 1.2 m below 1.3 m'],
    ['double door 1.6', (g) => { link(g, 'a-court', 'a-hut', 'double_door').width = 1.6; }, 'link a-court -> a-hut (double_door): width 1.6 m below 1.8 m'],
    ['door 1.9 high', (g) => { link(g, 'a-court', 'a-hut', 'door').height = 1.9; }, 'link a-court -> a-hut (door): height 1.9 m below 2 m'],
    ['door 2.4 high', (g) => { link(g, 'a-court', 'a-hut', 'door').height = 2.4; }, 'link a-court -> a-hut (door): height 2.4 m above 2.2 m'],
    ['wall jump 4.0', (g) => { link(g, 'a-court', 'a-roof', 'wall_jump').level_change = 4; }, 'link a-court -> a-roof (wall_jump): level change 4 m above the 3.8 m solo reach'],
    ['co-op lip 5.0', (g) => { link(g, 'a-court', 'a-roof', 'coop_boost').level_change = 5; }, 'link a-court -> a-roof (coop_boost): lip 5 m above the 4.5 m co-op reach'],
    ['split jump gap 2.2', (g) => { link(g, 'a-court', 'a-roof', 'split_jump').width = 2.2; }, 'link a-court -> a-roof (split_jump): gap 2.2 m outside 1.2-1.95 m'],
    ['split jump face 3.0', (g) => { link(g, 'a-court', 'a-roof', 'split_jump').height = 3; }, 'link a-court -> a-roof (split_jump): face height 3 m below 3.6 m'],
    ['door width missing', (g) => { delete link(g, 'a-court', 'a-hut', 'door').width; }, 'link a-court -> a-hut (door): width missing'],
  ];
  for (const [name, mutate, frag] of KIND_FAILS) {
    it(`kind size: ${name}`, () => {
      const g = withKinds();
      mutate(g);
      expectErr(check(g), frag);
    });
  }

  it('kind size WARNs: open stair 2.0, opening 4.0, drop 5.0 (no fall damage), co-op lip 4.0', () => {
    const g = withKinds();
    link(g, 'a-gate', 'a-roof', 'open_stair').width = 2;
    link(g, 'a-gate', 'a-court', 'opening').width = 4;
    link(g, 'a-roof', 'a-court', 'drop').level_change = 5;
    link(g, 'a-court', 'a-roof', 'coop_boost').level_change = 4;
    const r = check(g);
    expect(r.errors).toEqual([]);
    expectWarn(r, 'link a-gate -> a-roof (open_stair): width 2 m below 2.4 m');
    expectWarn(r, 'link a-gate -> a-court (opening): width 4 m outside 2.5-3.5 m');
    expectWarn(r, 'link a-roof -> a-court (drop): drop 5 m above the 4.5 m safe drop');
    expectWarn(r, 'link a-court -> a-roof (coop_boost): lip 4 m under the 4.3-4.5 m co-op band');
  });

  it('ceiling 2.3', () => {
    const g = base();
    space(g, 'a-hut').size = [5.5, 7, 2.3];
    const r = check(g);
    expectErr(r, 'a-hut: ceiling 2.3 m below 2.4 m');
    expectWarn(r, 'a-hut: ceiling 2.3 m outside security_room 3-3 m');
  });

  it('open ceilings and exterior spaces skip the ceiling checks', () => {
    const g = base();
    space(g, 'a-gate').size = [14, 14, 2];
    space(g, 'a-court').size = [14, 20, 2];
    const r = check(g);
    expect(r.errors.filter((e) => e.includes('ceiling'))).toEqual([]);
    expect(r.warns.filter((w) => w.includes('ceiling'))).toEqual([]);
  });

  it('off-grid 3.3 (WARN)', () => {
    const g = base();
    space(g, 'b-walk').size = [3.3, 14, 3];
    const r = check(g);
    expect(r.errors).toEqual([]);
    expectWarn(r, 'b-walk: size 3.3 is off the 0.5 m grid');
  });

  it('split 120 m', () => {
    const g = base();
    link(g, 'b-dock', 'b-vault', 'door').length = 120;
    expectErr(check(g), 'split x leg a: 103.8 s over the 90 s limit');
  });

  it('split parity 30% (summed link time, not room length)', () => {
    const g = base();
    link(g, 'b-walk', 'b-vault', 'ladder').time_s = 25;
    expectErr(check(g), 'split x: legs 23.1 s vs 33.0 s differ by 30% (max 20%)');
  });

  it('a climb on a split leg with no time_s: WARN, parity not judged', () => {
    const g = base();
    delete link(g, 'b-walk', 'b-vault', 'ladder').time_s;
    const r = check(g);
    expectWarn(r, 'split x leg b: link b-walk -> b-vault (ladder) has no time_s and no walking speed');
    expect(r.errors.filter((e) => e.includes('differ by'))).toEqual([]);
  });

  it('no overwatch', () => {
    const g = base();
    space(g, 'b-walk').tags = ['split:x:b'];
    expectErr(check(g), 'split x: no space tagged overwatch:x');
  });

  it('no assist', () => {
    const g = base();
    delete link(g, 'b-walk', 'b-vault', 'ladder').assist;
    expectErr(check(g), 'split x: no link carries assist "x"');
  });

  it('partner 50 m', () => {
    const g = base();
    link(g, 'b-hall', 'b-dock', 'door').length = 50;
    expectErr(checkCoop(g, METRICS) as Report, 'split x: a downed partner is 17.0 s away (from b-dock to the other leg; max 15 s)');
  });

  it('partner reach: a link with no time_s is never a free shortcut (WARN, not a pass or an ERR)', () => {
    const g = base();
    link(g, 'b-hall', 'b-dock', 'door').length = 50;
    delete link(g, 'b-hall', 'b-vault', 'duct').time_s;
    const r = checkCoop(g, METRICS) as Report;
    expect(r.errors.filter((e) => e.includes('downed partner'))).toEqual([]);
    expectWarn(r, 'split x: partner reach from b-dock is 17.0 s on timed links; only links with no time_s bring it under 15 s');
  });

  it('shared 1.8', () => {
    const g = base();
    Object.assign(link(g, 'b-hall', 'b-vault', 'double_door'), { width: 1.8, shared: true });
    expectErr(check(g), 'shared link b-hall -> b-vault (double_door): width 1.8 m below 2 m');
  });

  it('3 high beats', () => {
    const g = base();
    for (const id of ['a-court', 'a-roof', 'a-hut']) space(g, id).tension = 4;
    expectErr(check(g), 'pacing: three high beats (4+) in a row: a-court, a-roof, a-hut');
  });

  it('pacing WARNs: opening above 2, no release after a peak; a spine link is a release', () => {
    const g = base();
    space(g, 'a-gate').tension = 3;
    space(g, 'b-out').tension = 3;
    const r = checkPacing(g) as Report;
    expectWarn(r, 'pacing: the map opens at tension 3');
    expectWarn(r, 'pacing: no release (1-2) after the peak at b-vault');
    const g2 = base();
    space(g2, 'a-hut').tension = 4;
    for (const id of ['b-hall', 'b-dock', 'b-walk']) space(g2, id).tension = 3;
    expect((checkPacing(g2) as Report).warns.filter((w) => w.includes('a-hut'))).toEqual([]);
  });

  it('guards 11: no upper limit', () => {
    const g = base();
    space(g, 'b-vault').guards = { 2: 11 };
    const r = check(g);
    expect(r.errors).toEqual([]);
    expect(r.warns).toEqual([]);
  });

  it('co-op guards below the 2-player count', () => {
    const g = base();
    g.meta.players = [2, 3];
    space(g, 'a-court').guards = { 2: 5, 3: 4 };
    expectErr(check(g), 'a-court: 4 guards at 3 players, fewer than 5 at 2');
  });

  it('guard bands (3-6 early, 6-10 late) WARN only below', () => {
    const g = base();
    space(g, 'a-court').guards = { 2: 2 };
    space(g, 'b-vault').guards = { 2: 4 };
    const r = check(g);
    expect(r.errors).toEqual([]);
    expect(r.warns).toEqual([
      'a-court: 2 guards (2 players) below the early band 3-6',
      'b-vault: 4 guards (2 players) below the late band 6-10',
    ]);
    space(g, 'b-vault').phase = 'early';
    expect(check(g).warns).toHaveLength(1);
    space(g, 'a-court').guards = { 2: 9 };
    expect(check(g).warns).toEqual([]);
  });

  it('room-class too small (real table, and an inline table)', () => {
    const g = base();
    space(g, 'a-hut').size = [5, 7, 3];
    expectErr(check(g), 'a-hut: 5 x 7 m below security_room minimum 5.5 x 7');
    const m = fullMetrics();
    m.rooms = { ...m.rooms, lobby: { ...m.rooms.lobby, minW: 15 } };
    expectErr(checkDimensions(base(), m) as Report, 'b-hall: 14 x 17 m below lobby minimum 15 x 17');
  });

  it('room classes: unknown class ERR, custom WARN, encounter in a "no" class or under the camera floor ERR', () => {
    const g = base();
    space(g, 'a-hut').room_class = 'broom_cupboard';
    space(g, 'a-roof').room_class = 'custom';
    expectErr(check(g), "a-hut: room_class 'broom_cupboard' is not in the room table");
    expectWarn(check(g), 'a-roof: room_class custom');
    const g2 = base();
    Object.assign(space(g2, 'a-court'), { room_class: 'security_room', size: [5.5, 7, 3] });
    expectErr(check(g2), 'a-court: encounter space 5.5 m on its short side, under the 6 m camera floor');
    Object.assign(space(g2, 'a-court'), { room_class: 'private_office', size: [5.5, 7, 3] });
    expectErr(check(g2), 'a-court: an encounter space cannot be a private_office');
  });
});

describe('level-validate: declared targets (M4)', () => {
  it('missing targets are errors; shadow_pct is optional (the light band is the target, G329)', () => {
    const g = base();
    const s = space(g, 'a-court');
    delete s.shadow_pct;
    delete s.los_break_s;
    delete s.vantage;
    delete s.guards;
    const r = check(g);
    expectErr(r, 'a-court: los_break_s missing', 'a-court: vantage missing', 'a-court: guards missing');
    expect(r.errors.some((e) => e.includes('shadow_pct'))).toBe(false);
  });

  it('declared values outside the metrics targets are errors; shadow share outside its band is INFO only', () => {
    const g = base();
    Object.assign(space(g, 'a-court'), { shadow_pct: 0.7, los_break_s: 6, vantage: { from: 'a-roof', sees_pct: 0.6 } });
    const r = check(g);
    expectErr(r, 'a-court: los_break_s 6 above 5 s', 'a-court: vantage sees_pct 0.6 below 0.7');
    expect(r.errors.some((e) => e.includes('shadow_pct'))).toBe(false);
    expect(r.infos).toContainEqual(expect.stringContaining('a-court: shadow_pct 0.7 outside 0.4-0.6 (information'));
  });
});

describe('level-validate: reach, references, rejoin (checker should-fix 2, 4)', () => {
  it('no softlock: a mandatory pair_gate flags its own target, not the co-op moves behind it that have a solo route', () => {
    const g: Graph = {
      meta: { map: 'probe', name: 'Probe', mode: 'sector', players: [2], sections: ['S1'] },
      spaces: [
        sp('s', 'S1', 'exterior', 'yard', [14, 14, 12], 1, ['start', 'entry']),
        sp('a', 'S1', 'hub', 'lobby', [14, 17, 4.5], 2),
        sp('b', 'S1', 'hub', 'lobby', [14, 17, 4.5], 2),
        sp('c', 'S1', 'exterior', 'yard', [14, 14, 12], 2, ['exit', 'exfil']),
      ],
      links: [
        ln('s', 'a', 'door', 'shadow', DOOR),
        ln('a', 'b', 'pair_gate', 'shadow', DOOR),
        ln('b', 'c', 'open_stair', 'high', { width: 2.4 }),
        ln('b', 'c', 'coop_boost', 'high', { level_change: 4.5 }),
      ],
    };
    const errs = (checkReach(g) as Report).errors;
    expect(errs).toEqual(['b: reached only through co-op links (pair_gate); add a route without one (no softlock)']);
  });

  it('objective cannot reach exfil', () => {
    const g = base();
    g.spaces.push(sp('a-pit', 'S1', 'objective', 'storage', [4, 4, 3], 2, ['objective']));
    g.links.push(ln('a-roof', 'a-pit', 'drop', 'high', { level_change: 3, length: 4 }));
    expectErr(check(g), 'a-pit: no way from this objective to exfil');
  });

  it('duplicate space id', () => {
    const g = base();
    g.spaces.push({ ...space(g, 'a-hut') });
    expectErr(check(g), 'a-hut: duplicate space id');
  });

  it('assist and overwatch naming no split', () => {
    const g = base();
    link(g, 'a-court', 'a-hut', 'door').assist = 'y';
    space(g, 'a-roof').tags = ['overwatch:y'];
    expectErr(check(g), "link a-court -> a-hut (door): assist 'y' names no split", 'a-roof: overwatch:y names no split');
  });

  it('split legs never rejoin', () => {
    const g = base();
    drop(g, 'b-walk', 'b-vault', 'ladder');
    expectErr(checkCoop(g, METRICS) as Report, 'split x: legs never rejoin (no space both b-dock and b-walk lead to)');
  });
});

describe('level-validate: coverage, routes, structure', () => {
  it('co-op coverage: half the encounters and every section', () => {
    const g = base();
    drop(g, 'a-court', 'a-roof', 'coop_boost');
    expectErr(check(g), 'section S1 has no co-op link');
    drop(g, 'b-vault', 'b-walk', 'coop_boost');
    expectErr(check(g), 'co-op links reach 0 of 2 encounter spaces (need at least half)');
  });

  it('solo twin: a co-op move one player can make by a solo link or path on its route, no longer (campus CR7)', () => {
    const twin = 'link a-court -> a-roof (coop_boost) has a solo twin: link a-court -> a-roof (ladder)';
    const g = campaignBase();
    g.links.push(ln('a-court', 'a-roof', 'ladder', 'high', { level_change: 4.5, length: 6, time_s: 6 }));
    expectErr(check(g), twin);
    // A longer solo way up, or one on another route kind, is the no-softlock alternative, not a twin.
    link(g, 'a-court', 'a-roof', 'ladder').length = 8;
    expect(check(g).errors.filter((e) => e.includes('solo twin'))).toEqual([]);
    const l = link(g, 'a-court', 'a-roof', 'ladder');
    l.length = 6;
    l.route = 'loud';
    expect(check(g).errors.filter((e) => e.includes('solo twin'))).toEqual([]);
    // A two-link solo path that does not pass the target counts; the message names every link.
    const h = campaignBase();
    h.spaces.push(sp('a-stack', 'S1', 'connector', 'corridor', [3.5, 14, 3], 2));
    h.links.push(ln('a-court', 'a-stack', 'ledge', 'high', { length: 2 }), ln('a-stack', 'a-roof', 'ledge', 'high', { length: 3 }));
    expectErr(check(h), 'link a-court -> a-roof (coop_boost) has a solo twin: link a-court -> a-stack (ledge), then link a-stack -> a-roof (ledge)');
  });

  it('solo twin: a pair_gate is judged both ways; Sector Ops gets a WARN, not an ERR', () => {
    const g = base();
    g.meta.mode = 'campaign';
    g.links.push(ln('a-court', 'a-hut', 'pair_gate', 'shadow', { ...DOOR, length: 13 }));
    expectErr(check(g), 'link a-court -> a-hut (pair_gate) has a solo twin: link a-court -> a-hut (door)',
      'link a-court -> a-hut (pair_gate) (a-hut -> a-court) has a solo twin: link a-court -> a-hut (door)');
    // A one-way solo door out of the hut only twins the way back.
    const door = link(g, 'a-court', 'a-hut', 'door');
    Object.assign(door, { from: 'a-hut', to: 'a-court', one_way: true });
    const back = check(g).errors.filter((e) => e.includes('solo twin'));
    expect(back).toEqual(['link a-court -> a-hut (pair_gate) (a-hut -> a-court) has a solo twin: link a-hut -> a-court (door); one player makes this move alone (make the co-op move the only way at this spot, or remove the solo link)']);
    g.meta.mode = 'sector';
    const r = checkCoop(g, METRICS) as Report;
    expect(r.errors.filter((e) => e.includes('solo twin'))).toEqual([]);
    expectWarn(r, 'link a-court -> a-hut (pair_gate) (a-hut -> a-court) has a solo twin');
  });

  it('routes cross: route kinds in a section that share no space', () => {
    const g = base();
    g.spaces.push(sp('a-side', 'S1', 'connector', 'corridor', [3.5, 14, 3], 2));
    g.links.push(ln('a-gate', 'a-side', 'corridor', 'loud', { width: 3.5, height: 3, length: 10 }));
    g.links.push(ln('a-side', 'a-hut', 'corridor', 'loud', { width: 3.5, height: 3, length: 10 }));
    for (const l of g.links) if (l.from === 'a-court' || l.to === 'a-court') l.route = l.kind === 'roller_door' || l.kind === 'double_door' ? 'shadow' : l.route;
    const r = checkEncounters(g, METRICS) as Report;
    expectErr(r, 'section S1: routes never cross');
  });

  it('structure: missing function, unknown section, unknown link end stop the run', () => {
    const g = base();
    space(g, 'a-hut').function = ' ';
    space(g, 'a-roof').section = 'S9';
    g.links.push(ln('a-hut', 'nowhere', 'door', 'shadow', DOOR));
    const r = check(g);
    expectErr(r, 'a-hut: function missing', "a-roof: section 'S9' is not in meta.sections", "unknown space 'nowhere'");
    expect(r.errors).toEqual((checkStructure(g) as Report).errors);
  });

  it('structure: a campaign is two players; one start; an exfil', () => {
    const g = campaignBase();
    g.meta.players = [1, 2];
    space(g, 'a-gate').tags = ['entry'];
    space(g, 'b-out').tags = ['exit'];
    expectErr(checkStructure(g) as Report, 'a campaign map is two players', "needs exactly one space tagged 'start' (has 0)", "no space tagged 'exfil'");
  });

  it('edgeDisjointPaths: parallel links, a shared bottleneck, one-way links', () => {
    const L = (from: string, to: string, extra: Partial<Link> = {}): Link => ln(from, to, 'door', 'shadow', extra);
    expect(edgeDisjointPaths([L('a', 'b'), L('a', 'b'), L('b', 'c'), L('b', 'c')], 'a', 'c')).toBe(2);
    expect(edgeDisjointPaths([L('a', 'b'), L('a', 'b'), L('b', 'c')], 'a', 'c')).toBe(1);
    expect(edgeDisjointPaths([L('a', 'b'), L('b', 'c'), L('a', 'd'), L('d', 'c'), L('a', 'c')], 'a', 'c')).toBe(3);
    expect(edgeDisjointPaths([L('c', 'a', { one_way: true }), L('a', 'c')], 'a', 'c')).toBe(1);
    expect(edgeDisjointPaths([{ ...L('c', 'a'), kind: 'drop' }], 'a', 'c')).toBe(0);
  });

  it('checkRedundancy: each section needs one entry and one exit', () => {
    const g = base();
    space(g, 'b-out').tags = ['exfil'];
    expectErr(checkRedundancy(g) as Report, "section S2: needs exactly one space tagged 'exit' (has 0)");
  });
});

describe('level-validate: mode profiles (level-design "Modes and tags")', () => {
  it('campaign: the forced-gate fixture passes clean', () => {
    const r = check(campaignBase());
    expect(r.errors).toEqual([]);
    expect(r.warns).toEqual([]);
    expect(r.infos).toEqual([]);
  });

  it('campaign: a section whose exit solo links reach has no forced co-op gate (ERR); sector and training skip it', () => {
    const g = campaignBase();
    g.links.push(ln('a-court', 'a-hut', 'door', 'shadow', { ...DOOR, length: 13 }));
    expectErr(check(g), "section S1: exit 'a-hut' is reached from entry 'a-gate' by solo links alone");
    expect(check(g).errors.filter((e) => e.includes('section S2: exit'))).toEqual([]);
    expect(check(base()).errors).toEqual([]);
    const t = base();
    t.meta.mode = 'training';
    expect(check(t).errors.filter((e) => e.includes('solo links alone'))).toEqual([]);
  });

  it('campaign gate reach: a co-op move needs a solo way back within the revive reach (an opened pair_gate counts)', () => {
    // Too slow: the roof's way down to the court is 20 s; via the gate ladder and the gap it is 17.7 s.
    const slow = campaignBase();
    link(slow, 'a-roof', 'a-court', 'ladder').time_s = 20;
    expectErr(check(slow), 'link a-court -> a-roof (coop_boost): the way back from a-roof to a-court takes 17.7 s, over the 15 s revive reach');
    // Only an untimed link brings it under: WARN.
    const loose = campaignBase();
    delete link(loose, 'a-roof', 'a-court', 'ladder').time_s;
    expectWarn(check(loose), 'link a-court -> a-roof (coop_boost): the way back from a-roof is 17.7 s on timed links');
    // No way back at all.
    const none = campaignBase();
    drop(none, 'a-roof', 'a-court', 'ladder');
    link(none, 'a-gate', 'a-roof', 'ladder').one_way = true;
    expectErr(check(none), 'link a-court -> a-roof (coop_boost): no solo way back from a-roof to a-court');
    // The throw's way back is the team door it opened.
    expect(check(campaignBase()).errors.filter((e) => e.includes('team_throw'))).toEqual([]);
    // Sector Ops runs no softlock instead: no gate-reach line.
    const sector = campaignBase();
    sector.meta.mode = 'sector';
    expect(check(sector).errors.filter((e) => e.includes('way back'))).toEqual([]);
  });

  it('campaign does not run no-softlock; a co-op-only reward is fine when its way back holds', () => {
    const g = campaignBase();
    g.spaces.push(sp('a-ledge', 'S1', 'reward', 'storage', [4, 4, 3], 2, ['reward']));
    g.links.push(ln('a-court', 'a-ledge', 'coop_boost', 'high', { level_change: 4.5, length: 6, time_s: 5 }));
    g.links.push(ln('a-ledge', 'a-court', 'drop', 'high', { level_change: 4.5, length: 4, time_s: 2 }));
    expect(check(g).errors).toEqual([]);
  });

  it('team_throw is a co-op kind (no softlock on Sector Ops, coverage)', () => {
    const g = base();
    g.spaces.push(sp('a-ledge', 'S1', 'reward', 'storage', [4, 4, 3], 2, ['reward']));
    g.links.push(ln('a-court', 'a-ledge', 'team_throw', 'high', { width: 2.5, length: 6, time_s: 4 }));
    expectErr(check(g), 'a-ledge: reached only through co-op links (team_throw)');
  });

  it('bolted: one player opens it only from its to end (forced gate, solo twin); unbolted it stays open (gate reach)', () => {
    // S2 by a bolted fire door: the thrown partner unbolts it from the yard side; solo play cannot open it from the hall.
    // It replaces the team door; unbolted, it is also the throw's way back (gate reach).
    const g = campaignBase();
    drop(g, 'b-vault', 'b-out', 'pair_gate');
    g.links.push(ln('b-vault', 'b-out', 'door', 'shadow', { ...DOOR, length: 18, bolted: true }));
    expect(check(g).errors).toEqual([]);
    // Beside a team door it twins the team door from the far side, where one player can open it.
    const t = campaignBase();
    t.links.push(ln('b-vault', 'b-out', 'door', 'shadow', { ...DOOR, length: 18, bolted: true }));
    expectErr(check(t), 'link b-vault -> b-out (pair_gate) (b-out -> b-vault) has a solo twin: link b-vault -> b-out (door)');
    // Bolted the other way round, the near side opens it: no forced gate in S2.
    const h = campaignBase();
    h.links.push(ln('b-out', 'b-vault', 'door', 'shadow', { ...DOOR, length: 18, bolted: true }));
    expectErr(check(h), "section S2: exit 'b-out' is reached from entry 'b-hall' by solo links alone");
    expectErr(checkStructure({ ...g, links: [...g.links, ln('b-vault', 'b-out', 'door', 'shadow', { ...DOOR, bolted: 'yes' as unknown as boolean })] }) as Report,
      'bolted must be true or false');
  });

  it('shutter: a co-op kind judged both ways, its own way back, door minimum width', () => {
    const g = campaignBase();
    drop(g, 'b-vault', 'b-out', 'pair_gate');
    g.links.push(ln('b-vault', 'b-out', 'shutter', 'shadow', { width: 1.2, length: 18, time_s: 8 }));
    expect(check(g).errors).toEqual([]);
    g.links.push(ln('b-out', 'b-vault', 'door', 'shadow', { ...DOOR, length: 18, one_way: true }));
    expectErr(check(g), 'link b-vault -> b-out (shutter) (b-out -> b-vault) has a solo twin');
    const h = campaignBase();
    h.links.push(ln('b-vault', 'b-out', 'shutter', 'shadow', { width: 0.8, length: 18, time_s: 8 }));
    expectErr(check(h), 'link b-vault -> b-out (shutter): width 0.8 m below 1 m');
  });

  it('campaign: a section whose entry is its exit has no forced gate (ERR); other modes WARN', () => {
    const g = campaignBase();
    space(g, 'b-hall').tags = ['entry', 'exit'];
    space(g, 'b-out').tags = ['exfil'];
    link(g, 'a-hut', 'b-hall', 'corridor');
    expectErr(checkRedundancy(g) as Report, "section S2: entry and exit are the same space 'b-hall', so no forced co-op gate stands between them");
    g.meta.mode = 'sector';
    expect((checkRedundancy(g) as Report).errors).toEqual([]);
    expectWarn(checkRedundancy(g) as Report, "section S2: entry and exit are the same space 'b-hall'");
  });

  it('training: one route is fine (no route-count, redundancy, softlock or gate checks); guard bands are INFO', () => {
    const g = base();
    g.meta.mode = 'training';
    // One way through S1: the opening into the court and one door to the hut.
    g.links = g.links.filter((l) => !(l.from === 'a-gate' && l.to === 'a-court' && l.kind !== 'opening')
      && !(l.from === 'a-court' && l.to === 'a-hut' && l.kind !== 'door'));
    space(g, 'a-court').guards = { 2: 2 };
    g.spaces.push(sp('a-ledge', 'S1', 'reward', 'storage', [4, 4, 3], 2, ['reward']));
    g.links.push(ln('a-court', 'a-ledge', 'coop_boost', 'high', { level_change: 4.5, length: 6, time_s: 5 }));
    const r = check(g);
    expect(r.errors).toEqual([]);
    expect(r.warns).toEqual([]);
    expect(r.infos).toContainEqual('a-court: 2 guards (2 players) below the early band 3-6');
    g.meta.mode = 'sector';
    expectErr(check(g), 'a-court: no loud approach', "section S1: 1 independent route(s)", 'a-ledge: reached only through co-op links');
  });

  it('sector: 1-4 players; the alive ceiling per section and player count (sector_alive_max 32)', () => {
    const g = base();
    g.meta.players = [1, 2, 3, 4];
    space(g, 'a-court').guards = { 1: 10, 4: 33 };
    space(g, 'b-vault').guards = { 1: 20, 3: 30 };
    const r = check(g);
    expectErr(r, 'section S1: 33 guards at 4 players, over the 32 alive ceiling (sector_alive_max)');
    expect(r.errors.filter((e) => e.includes('alive ceiling'))).toHaveLength(1);
    space(g, 'b-vault').guards = { 1: 20, 3: 40 };
    expectErr(check(g), 'section S2: 40 guards at 3 players', 'section S2: 40 guards at 4 players');
    g.meta.players = [2, 5];
    expectErr(checkStructure(g) as Report, 'Sector Ops is 1-4 players');
    // The campaign runs on the Sector Ops runtime: the same ceiling (Michael 2026-10-25 ~11:35, "32 alive").
    const c = campaignBase();
    space(c, 'b-vault').guards = { 2: 32 };
    expect(check(c).errors).toEqual([]);
    space(c, 'b-vault').guards = { 2: 40 };
    expectErr(check(c), 'section S2: 40 guards at 2 players, over the 32 alive ceiling (sector_alive_max)');
    const t = base();
    t.meta.mode = 'training';
    space(t, 'b-vault').guards = { 2: 40 };
    expect(check(t).errors.filter((e) => e.includes('alive ceiling'))).toEqual([]);
  });

  it('no softlock reads a bolted door as solo only from its to side', () => {
    // A side store behind a door bolted on the store side: one player cannot open it from the court; the boost is
    // the only way in, so it is a softlock. Bolted the other way round, the court side opens it: no softlock.
    const g = base();
    g.spaces.push(sp('a-store', 'S1', 'reward', 'storage', [4, 4, 3], 2, ['reward']));
    g.links.push(ln('a-court', 'a-store', 'door', 'shadow', { ...DOOR, length: 8, bolted: true }));
    g.links.push(ln('a-court', 'a-store', 'coop_boost', 'high', { level_change: 4.5, length: 6, time_s: 5 }));
    expectErr(check(g), 'a-store: reached only through co-op links (coop_boost)');
    const h = base();
    h.spaces.push(sp('a-store', 'S1', 'reward', 'storage', [4, 4, 3], 2, ['reward']));
    h.links.push(ln('a-store', 'a-court', 'door', 'shadow', { ...DOOR, length: 8, bolted: true }));
    h.links.push(ln('a-court', 'a-store', 'coop_boost', 'high', { level_change: 4.5, length: 6, time_s: 5 }));
    expect(check(h).errors.filter((e) => e.includes('a-store: reached only'))).toEqual([]);
  });

  it('co-op kit bands: pull-up and relay lips, rope span, throw gap, shutter gap (scale-sheet section 3)', () => {
    const g = campaignBase();
    g.spaces.push(sp('a-ledge', 'S1', 'reward', 'storage', [4, 4, 3], 2, ['reward']));
    g.links.push(
      ln('a-ledge', 'a-court', 'drop', 'high', { level_change: 4.5, length: 4, time_s: 2 }),
      ln('a-court', 'a-ledge', 'team_pull', 'high', { level_change: 4.4, length: 6, time_s: 5 }),
      ln('a-court', 'a-ledge', 'team_hang', 'high', { level_change: 4.6, length: 6, time_s: 6 }),
      ln('a-court', 'a-ledge', 'team_rope', 'high', { level_change: 6.0, length: 6, time_s: 8 }),
    );
    expect(check(g).errors).toEqual([]);
    link(g, 'a-court', 'a-ledge', 'team_pull').level_change = 4.6;
    link(g, 'a-court', 'a-ledge', 'team_hang').level_change = 4.7;
    link(g, 'a-court', 'a-ledge', 'team_rope').level_change = 6.5;
    link(g, 'b-vault', 'b-out', 'team_throw').width = 3.0;
    expectErr(check(g), 'link a-court -> a-ledge (team_pull): lip 4.6 m above the 4.5 m pull-up reach',
      'link a-court -> a-ledge (team_hang): lip 4.7 m above the 4.6 m relay reach',
      'link a-court -> a-ledge (team_rope): rope climb 6.5 m outside 2.2-6 m',
      'link b-vault -> b-out (team_throw): gap 3 m above the 2.7 m throw');
    link(g, 'a-court', 'a-ledge', 'team_pull').level_change = 4.0;
    expectWarn(check(g), 'link a-court -> a-ledge (team_pull): lip 4 m under the 4.3-4.5 m co-op band');
    link(g, 'a-court', 'a-ledge', 'team_rope').level_change = 2.0;
    expectErr(check(g), 'rope climb 2 m outside 2.2-6 m');
    const s = campaignBase();
    drop(s, 'b-vault', 'b-out', 'pair_gate');
    s.links.push(ln('b-vault', 'b-out', 'shutter', 'shadow', { width: 1.2, height: 0.6, length: 18, time_s: 8 }));
    expectErr(check(s), 'link b-vault -> b-out (shutter): held gap 0.6 m below 0.9 m');
    delete link(s, 'b-vault', 'b-out', 'team_throw').width;
    expectErr(check(s), 'link b-vault -> b-out (team_throw): width missing');
  });

  it('timed drills: drill_s only on a training map (soft windows only elsewhere)', () => {
    const t = base();
    t.meta.mode = 'training';
    space(t, 'a-court').drill_s = 60;
    expect((checkStructure(t) as Report).errors).toEqual([]);
    space(t, 'a-court').drill_s = 0;
    expectErr(checkStructure(t) as Report, 'a-court: drill_s must be seconds > 0');
    const g = base();
    space(g, 'a-court').drill_s = 60;
    expectErr(checkStructure(g) as Report, 'a-court: drill_s on a sector map (timed drills are Marlow Yard only');
  });

  it('unavoidable guards (G303): the tagged space stands on every way to the exit; Sector Ops needs one', () => {
    expect(check(base()).warns).toEqual([]);
    const none = base();
    space(none, 'a-court').tags = [];
    expectWarn(check(none), 'no space tagged unavoidable');
    const c = campaignBase();
    space(c, 'a-court').tags = [];
    expect(check(c).warns).toEqual([]);
    // A way round the court: the roof walk reaches the hut.
    const round = base();
    round.links.push(ln('a-roof', 'a-hut', 'ladder', 'high', { level_change: 4.5, length: 10, time_s: 12 }));
    expectWarn(check(round), "a-court: tagged unavoidable, but section S1's exit and objectives are reached around it");
    const empty = base();
    space(empty, 'a-roof').tags = ['unavoidable'];
    expectWarn(check(empty), 'a-roof: tagged unavoidable but is not a guarded encounter space');
  });

  it('structure: training is two players; an unknown mode is named', () => {
    const g = base();
    g.meta.mode = 'training';
    g.meta.players = [1, 2];
    expectErr(checkStructure(g) as Report, 'a training map is two players');
    g.meta.mode = 'arena';
    expectErr(checkStructure(g) as Report, "meta.mode: 'arena' is not campaign, sector or training");
  });
});

describe('level-validate: merge and CLI', () => {
  it('merges per-section files: meta from the first, spaces / links concatenated, sections unioned', () => {
    const g = base();
    const s1 = { meta: { ...g.meta, sections: ['S1'] }, spaces: g.spaces.filter((s) => s.section === 'S1'), links: g.links.slice(0, 9) };
    const s2 = { meta: { ...g.meta, name: 'ignored', sections: ['S1', 'S2'] }, spaces: g.spaces.filter((s) => s.section === 'S2'), links: g.links.slice(9) };
    const merged = mergeGraphs([s1, s2]) as Graph;
    expect(merged).toEqual(g);
    expect(check(merged).errors).toEqual([]);
    expect(() => mergeGraphs([])).toThrow();
  });

  it('CLI (spawned node) on two per-section files: the cross-file spine link resolves; exit 0, then 1 on an error', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'level-validate-cli-'));
    try {
      const write = (g: Graph): [string, string] => {
        const s1 = path.join(dir, 'S1.json');
        const s2 = path.join(dir, 'S2.json');
        fs.writeFileSync(s1, JSON.stringify({ meta: { ...g.meta, sections: ['S1'] }, spaces: g.spaces.filter((s) => s.section === 'S1'), links: g.links.slice(0, 9) }));
        fs.writeFileSync(s2, JSON.stringify({ meta: { ...g.meta, sections: ['S2'] }, spaces: g.spaces.filter((s) => s.section === 'S2'), links: g.links.slice(9) }));
        return [s1, s2];
      };
      const cli = (files: string[]): { status: number | null; out: string } => {
        const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/level-validate.mjs'), ...files], { cwd: ROOT, encoding: 'utf8', timeout: 30000 });
        return { status: r.status, out: r.stdout };
      };
      const ok = cli(write(base()));
      expect(ok.status).toBe(0);
      expect(ok.out.trim()).toBe('0 error(s), 0 warning(s).');
      const bad = base();
      link(bad, 'b-hall', 'b-dock', 'door').width = 0.9;
      const fail = cli(write(bad));
      expect(fail.status).toBe(1);
      expect(fail.out).toContain('ERROR: link b-hall -> b-dock (door): width 0.9 m below 1 m');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('parseArgs: files, --metrics, usage errors', () => {
    expect(parseArgs(['a.json', 'b.json', '--metrics', 'm.json'])).toEqual({ files: ['a.json', 'b.json'], metrics: 'm.json' });
    expect(parseArgs(['a.json'])).toEqual({ files: ['a.json'], metrics: null });
    expect(parseArgs([])).toEqual({ error: 'no graph file given' });
    expect(parseArgs(['a.json', '--metrics'])).toEqual({ error: '--metrics needs a file' });
    expect(parseArgs(['a.json', '--rooms', 'x.md'])).toEqual({ error: 'unknown flag --rooms' });
  });

  it('run: exit 0 on the example, 1 on errors, 2 on bad usage; no metrics file is one WARN', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'level-validate-'));
    try {
      const lines: string[] = [];
      const log = (s: string): void => { lines.push(s); };
      const example = path.join(ROOT, 'docs/level-validator/example.graph.json');
      expect(run([example], { log, root: ROOT })).toBe(0);
      expect(lines[lines.length - 1]).toMatch(/^\n0 error\(s\), \d+ warning\(s\)\.$/);

      const bad = base();
      link(bad, 'a-court', 'a-hut', 'door').width = 0.9;
      const badPath = path.join(dir, 'bad.json');
      fs.writeFileSync(badPath, JSON.stringify(bad));
      lines.length = 0;
      expect(run([badPath], { log, root: ROOT })).toBe(1);
      expect(lines).toContainEqual(expect.stringMatching(/^ERROR: link a-court -> a-hut \(door\): width 0\.9 m below 1 m$/));
      expect(lines[lines.length - 1]).toMatch(/^\n1 error\(s\), \d+ warning\(s\)\.$/);

      lines.length = 0;
      expect(run([badPath, '--metrics', path.join(dir, 'none.json')], { log, root: ROOT })).toBe(0);
      expect(lines.filter((l) => l.startsWith('WARN:'))).toEqual([expect.stringContaining('size and time checks skipped')]);

      lines.length = 0;
      const metricsPath = path.join(dir, 'metrics.json');
      fs.writeFileSync(metricsPath, JSON.stringify(METRICS));
      const okPath = path.join(dir, 'ok.json');
      fs.writeFileSync(okPath, JSON.stringify(base()));
      expect(run([okPath, '--metrics', metricsPath], { log, root: ROOT })).toBe(0);
      expect(lines).toEqual(['\n0 error(s), 0 warning(s).']);

      expect(run([], { log, root: ROOT })).toBe(2);
      expect(run([path.join(dir, 'missing.json')], { log, root: ROOT })).toBe(2);
      fs.writeFileSync(path.join(dir, 'broken.json'), '{ nope');
      expect(run([path.join(dir, 'broken.json')], { log, root: ROOT })).toBe(2);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
