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
  size: number[]; tension: number; tags: string[]; shadow_pct?: number; los_break_s?: number;
  vantage?: { from: string; sees_pct?: number }; guards?: Record<string, number>; phase?: string;
  measured?: Record<string, unknown>;
}
interface Link {
  from: string; to: string; kind: string; route: string; width?: number; height?: number; length?: number;
  time_s?: number; level_change?: number; shared?: boolean; one_way?: boolean; assist?: string;
  measured?: Record<string, unknown>;
}
interface Graph { meta: { map: string; name: string; mode: string; players: number[]; sections: string[]; measured?: Record<string, unknown> }; spaces: Space[]; links: Link[] }
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

/** Minimal valid map: S1 (a gate, an encounter court with a roof walk, the exit hut), one spine corridor, S2 (a hall
 *  that splits into dock (leg a) and walk (leg b, the overwatch) around the vault encounter, then the exfil yard). */
const base = (): Graph => ({
  meta: { map: 'testMap', name: 'Test Map', mode: 'campaign', players: [2], sections: ['S1', 'S2'] },
  spaces: [
    sp('a-gate', 'S1', 'exterior', 'yard', [14, 14, 12], 1, ['start', 'entry']),
    sp('a-court', 'S1', 'encounter', 'yard', [14, 20, 12], 3, [],
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
const check = (g: Graph, metrics: unknown = METRICS, requireMeasured = false): Report => validate(g, { metrics, requireMeasured }) as Report;
/** Infos other than the V6 "pending" lines (every encounter space with no `measured` prints one). */
const otherInfos = (r: Report): string[] => r.infos.filter((i) => !i.includes('pending V6'));
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
    expect(otherInfos(r)).toEqual([]);
    expect(r.infos).toEqual(['a-court: pending V6 (no measured values)', 'b-vault: pending V6 (no measured values)']);
  });

  it('the real metrics.json carries every key the validator reads (no missing-key WARN)', () => {
    const r = check(withKinds(), REAL_METRICS);
    expect(r.errors).toEqual([]);
    expect(r.warns).toEqual([]);
    expect(otherInfos(r)).toEqual([]);
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
    expect(otherInfos(r)).toEqual([]);
  });

  it('no metrics: one WARN, size and time checks skipped (presence checks still run)', () => {
    const g = base();
    link(g, 'a-hut', 'b-hall', 'corridor').width = 2.9;
    link(g, 'b-hall', 'b-dock', 'door').length = 200;
    const r = check(g, null);
    expect(r.errors).toEqual([]);
    expect(r.warns).toEqual([expect.stringContaining('size and time checks skipped')]);
    delete space(g, 'a-court').shadow_pct;
    expectErr(check(g, null), 'a-court: shadow_pct missing');
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
    g.meta.mode = 'sector';
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
  it('missing targets are errors', () => {
    const g = base();
    const s = space(g, 'a-court');
    delete s.shadow_pct;
    delete s.los_break_s;
    delete s.vantage;
    delete s.guards;
    expectErr(check(g), 'a-court: shadow_pct missing', 'a-court: los_break_s missing', 'a-court: vantage missing', 'a-court: guards missing');
  });

  it('declared values outside the metrics targets are errors', () => {
    const g = base();
    Object.assign(space(g, 'a-court'), { shadow_pct: 0.7, los_break_s: 6, vantage: { from: 'a-roof', sees_pct: 0.6 } });
    expectErr(check(g), 'a-court: shadow_pct 0.7 outside 0.4-0.6', 'a-court: los_break_s 6 above 5 s', 'a-court: vantage sees_pct 0.6 below 0.7');
  });
});

describe('level-validate: reach, references, rejoin (checker should-fix 2, 4)', () => {
  it('no softlock: a mandatory pair_gate flags its own target, not the co-op moves behind it that have a solo route', () => {
    const g: Graph = {
      meta: { map: 'probe', name: 'Probe', mode: 'campaign', players: [2], sections: ['S1'] },
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
    const g = base();
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
    const h = base();
    h.spaces.push(sp('a-stack', 'S1', 'connector', 'corridor', [3.5, 14, 3], 2));
    h.links.push(ln('a-court', 'a-stack', 'ledge', 'high', { length: 2 }), ln('a-stack', 'a-roof', 'ledge', 'high', { length: 3 }));
    expectErr(check(h), 'link a-court -> a-roof (coop_boost) has a solo twin: link a-court -> a-stack (ledge), then link a-stack -> a-roof (ledge)');
  });

  it('solo twin: a pair_gate is judged both ways; Sector Ops gets a WARN, not an ERR', () => {
    const g = base();
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
    const g = base();
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
      expect(ok.out.trim().split(/\r?\n/).pop()).toBe('0 error(s), 0 warning(s).');
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
    expect(parseArgs(['a.json', 'b.json', '--metrics', 'm.json'])).toEqual({ files: ['a.json', 'b.json'], metrics: 'm.json', requireMeasured: false });
    expect(parseArgs(['a.json'])).toEqual({ files: ['a.json'], metrics: null, requireMeasured: false });
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
      expect(lines.filter((l) => !l.startsWith('INFO:'))).toEqual(['\n0 error(s), 0 warning(s).']);

      expect(run([], { log, root: ROOT })).toBe(2);
      expect(run([path.join(dir, 'missing.json')], { log, root: ROOT })).toBe(2);
      fs.writeFileSync(path.join(dir, 'broken.json'), '{ nope');
      expect(run([path.join(dir, 'broken.json')], { log, root: ROOT })).toBe(2);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('level-validate: greybox measurements (V6d checkMeasured)', () => {
  /** base() with both encounter spaces measured at their declared values, and a measured split reach. */
  const measured = (): Graph => {
    const g = base();
    space(g, 'a-court').measured = { shadow_pct: 0.5, sees_pct: 0.75, los_break_s: 4, vantage_at: [1, 0, 2], cells: 800 };
    space(g, 'b-vault').measured = { shadow_pct: 0.45, sees_pct: 0.8, los_break_s: 3 };
    g.meta.measured = { tool: 'level-measure 1', splits: { x: { a_s: 40, b_s: 38, reach_s: 10 } } };
    return g;
  };

  it('measured values on target: no ERR, no WARN, no pending INFO', () => {
    const r = check(measured());
    expect(r.errors).toEqual([]);
    expect(r.warns).toEqual([]);
    expect(r.infos).toEqual([]);
    expect(check(measured(), METRICS, true).errors).toEqual([]);
  });

  it('shadow_pct outside the band is an ERR (below and above), read from the metrics', () => {
    const g = measured();
    space(g, 'a-court').measured = { shadow_pct: 0.31 };
    space(g, 'b-vault').measured = { shadow_pct: 0.72 };
    expectErr(check(g), 'a-court: measured shadow_pct 0.31 below 0.4 (declared 0.5)', 'b-vault: measured shadow_pct 0.72 above 0.6 (declared 0.45)');
    const m = fullMetrics();
    m.rules.shadow_min_frac = 0.2;
    m.rules.shadow_max_frac = 0.8;
    expect(check(g, m).errors).toEqual([]);
  });

  it('sees_pct below the vantage minimum is an ERR', () => {
    const g = measured();
    space(g, 'a-court').measured = { sees_pct: 0.55 };
    expectErr(check(g), 'a-court: measured sees_pct 0.55 below 0.7 (declared 0.75)');
    const m = fullMetrics();
    m.rules.vantage_min_frac = 0.5;
    expect(check(g, m).errors).toEqual([]);
  });

  it('los_break_s over the limit is an ERR', () => {
    const g = measured();
    space(g, 'b-vault').measured = { los_break_s: 6.5 };
    expectErr(check(g), 'b-vault: measured los_break_s 6.5 s above 5 s (declared 3 s)');
    space(g, 'b-vault').measured = { los_break_s: 5 };
    expect(check(g).errors).toEqual([]);
  });

  it('a split reach over the limit is an ERR; a null reach is a WARN, not an ERR', () => {
    const g = measured();
    g.meta.measured = { splits: { x: { reach_s: 17.2 } } };
    expectErr(check(g), 'split x: measured reach_s 17.2 s above 15 s');
    g.meta.measured = { splits: { x: { reach_s: 15 } } };
    expect(check(g).errors).toEqual([]);
    g.meta.measured = { splits: { x: { reach_s: null } } };
    const r = check(g);
    expect(r.errors).toEqual([]);
    expectWarn(r, 'split x: measured reach_s is null');
    g.meta.measured = { splits: { nope: { reach_s: 1 } } };
    expectWarn(check(g), 'meta.measured.splits.nope: names no split');
  });

  it('a non-number measured value is an ERR', () => {
    const g = measured();
    space(g, 'a-court').measured = { shadow_pct: '0.5' };
    expectErr(check(g), 'a-court: measured shadow_pct must be a number');
  });

  it('measured away from the declared target by more than 0.10 (fractions) or 1.5 s is a WARN; within it is silent', () => {
    const g = measured();
    space(g, 'a-court').measured = { shadow_pct: 0.57, sees_pct: 0.88, los_break_s: 2.4 };
    const r = check(g);
    expect(r.errors).toEqual([]);
    expectWarn(r, 'a-court: measured sees_pct 0.88 vs declared 0.75');
    expectWarn(r, 'a-court: measured los_break_s 2.4 s vs declared 4 s');
    expect(r.warns.some((w) => w.includes('shadow_pct'))).toBe(false);
    space(g, 'a-court').measured = { shadow_pct: 0.59, sees_pct: 0.85, los_break_s: 5 };
    expect(check(g).warns).toEqual([]);
    const l = link(g, 'a-gate', 'a-roof', 'ladder');
    l.measured = { time_s: 13.4 };
    expect(check(g).warns).toEqual([]);
    l.measured = { time_s: 13.7 };
    expectWarn(check(g), 'link a-gate -> a-roof (ladder): measured time_s 13.7 s vs declared 12 s');
    l.measured = { time_s: null, why: 'ladder not modelled' };
    expect(check(g).warns).toEqual([]);
  });

  it('INFO pending V6 per encounter space with no measured; only encounter spaces; none once measured', () => {
    const g = base();
    expect(check(g).infos).toEqual(['a-court: pending V6 (no measured values)', 'b-vault: pending V6 (no measured values)']);
    space(g, 'a-court').measured = { shadow_pct: 0.5 };
    expect(check(g).infos).toEqual(['b-vault: pending V6 (no measured values)']);
  });

  it('--require-measured turns pending into an ERR for each unmeasured encounter space', () => {
    const g = base();
    const r = check(g, METRICS, true);
    expectErr(r, 'a-court: no measured values (--require-measured)', 'b-vault: no measured values (--require-measured)');
    expect(r.infos.filter((i) => i.includes('pending V6'))).toEqual([]);
    space(g, 'a-court').measured = { shadow_pct: 0.5 };
    space(g, 'b-vault').measured = { shadow_pct: 0.5 };
    expect(check(g, METRICS, true).errors).toEqual([]);
  });

  it('split legs read measured.time_s before time_s: the 90 s limit and the 20% parity fail on the measurement', () => {
    const g = base();
    expect(check(g).errors).toEqual([]);
    // leg a runs hall -> dock (door) -> vault (door); a measured door time pushes it over the limit
    link(g, 'b-hall', 'b-dock', 'door').measured = { time_s: 95, path_m: 120 };
    expectErr(check(g), 'split x leg a:', 's over the 90 s limit');
    // a declared time_s alone is overridden by a measured one
    const h = base();
    link(h, 'b-hall', 'b-walk', 'fire_stair').time_s = 200;
    expectErr(check(h), 'split x leg b:');
    link(h, 'b-hall', 'b-walk', 'fire_stair').measured = { time_s: 8 };
    expect(check(h).errors).toEqual([]);
    // a measured time_s of null falls back to the declared time_s
    link(h, 'b-hall', 'b-walk', 'fire_stair').measured = { time_s: null, why: 'stair off the nav grid' };
    expectErr(check(h), 'split x leg b:');
    // parity: leg a far slower than leg b by measurement
    const p = base();
    link(p, 'b-hall', 'b-dock', 'door').measured = { time_s: 40 };
    expectErr(check(p), 'split x: legs');
  });

  it('measured link times also feed the partner reach path', () => {
    const g = base();
    expect(check(g).errors).toEqual([]);
    link(g, 'b-walk', 'b-vault', 'ladder').measured = { time_s: 30 };
    link(g, 'b-vault', 'b-walk', 'coop_boost').measured = { time_s: 30 };
    link(g, 'b-hall', 'b-dock', 'door').measured = { time_s: 30 };
    link(g, 'b-dock', 'b-vault', 'door').measured = { time_s: 30 };
    link(g, 'b-hall', 'b-walk', 'fire_stair').measured = { time_s: 30 };
    expectErr(check(g), 'a downed partner is');
  });

  it('CLI: --require-measured is parsed, listed in the usage line, and fails an unmeasured map (spawned node)', () => {
    expect(parseArgs(['g.json', '--require-measured'])).toMatchObject({ files: ['g.json'], requireMeasured: true });
    expect(parseArgs(['g.json'])).toMatchObject({ requireMeasured: false });
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'level-validate-measured-'));
    try {
      const lines: string[] = [];
      const log = (x: string): void => { lines.push(x); };
      expect(run([], { log, root: ROOT })).toBe(2);
      expect(lines.join('\n')).toContain('[--require-measured]');
      const file = path.join(dir, 'g.json');
      fs.writeFileSync(file, JSON.stringify(base()));
      const node = (...args: string[]) => spawnSync(process.execPath, [path.join(ROOT, 'scripts/level-validate.mjs'), file, ...args], { encoding: 'utf8' });
      const plain = node();
      expect(plain.status).toBe(0);
      expect(plain.stdout).toContain('INFO:  a-court: pending V6');
      const strict = node('--require-measured');
      expect(strict.status).toBe(1);
      expect(strict.stdout).toContain('ERROR: a-court: no measured values (--require-measured)');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
