import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
// @ts-expect-error plain .mjs process script without types
import { MAX_ROUTES, campaignRouteRules, checkTraining, sectionRoutes } from '../scripts/level-checks/training.mjs';
// @ts-expect-error plain .mjs process script without types
import { validate } from '../scripts/level-validate.mjs';

// validator-port S4 (docs/validator-port/PLAN.md; BRIEF A8, A9, A23, A26): the training checks. One fixture per A26
// route shape, the A23 split cases, `taught_by` and `teach`, the choke test, and the core route-rule lines the late
// sections keep (a reworded core message fails here instead of passing silently).
const ROOT = path.resolve(__dirname, '..');
const METRICS = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/design/metrics.json'), 'utf8')) as Record<string, unknown>;

interface Report { errors: string[]; warns: string[]; infos: string[] }
type Obj = Record<string, unknown>;
interface Link { from: string; to: string; kind: string; route: string; [k: string]: unknown }
interface Space { id: string; section: string; tags: string[]; [k: string]: unknown }
interface Graph { meta: Obj & { mode: string; sections: string[] }; spaces: Space[]; links: Link[] }

const sp = (id: string, section: string, tags: string[] = [], extra: Obj = {}): Space =>
  ({ id, section, type: 'connector', room_class: 'corridor', function: `${id} test space`, storey: 0, size: [3.5, 14, 3], tension: 2, tags, ...extra });
const ln = (from: string, to: string, kind = 'door', route = 'shadow', extra: Obj = {}): Link => ({ from, to, kind, route, ...extra });
const GUARDED = { type: 'encounter', guards: { 2: 3 } };
/** A training graph of the given sections (`taught_by` the first unless set; null: none). */
const graph = (sections: string[], spaces: Space[], links: Link[], taught: string | null = sections[0] ?? null): Graph => ({
  meta: { map: 'probe', name: 'Probe', mode: 'training', players: [2], sections, ...(taught === null ? {} : { taught_by: taught }) },
  spaces, links,
});
const routesOf = (g: Graph, sec: string): { count: number; paths: string[][] } => sectionRoutes(g, sec) as { count: number; paths: string[][] };
const train = (g: Graph): Report => checkTraining(g, METRICS, {}) as Report;
const has = (lines: string[], frag: string): boolean => lines.some((l) => l.includes(frag));

/** A26 shape: two openings between the same two spaces, and a boost plus a human ladder up the same wall. */
const sameWall = (): Graph => graph(['A1'], [
  sp('e', 'A1', ['entry', 'teach:boost']), sp('m', 'A1'), sp('top', 'A1', ['exit']),
], [
  ln('e', 'm', 'opening'), ln('e', 'm', 'opening', 'high'),
  ln('m', 'top', 'coop_boost', 'high'), ln('m', 'top', 'human_ladder', 'high'),
]);
/** J14's A1 shape: boost up to the wall top, drop on into the yard, a one-way door from the yard back to the apron. */
const j14A1 = (): Graph => graph(['A1'], [
  sp('lounge', 'A1', ['entry']), sp('apron', 'A1'), sp('walltop', 'A1', ['teach:boost']), sp('yard', 'A1'),
  sp('hold', 'A1', ['exit']),
], [
  ln('lounge', 'apron'), ln('apron', 'walltop', 'coop_boost', 'high'), ln('walltop', 'yard', 'drop', 'high'),
  ln('yard', 'apron', 'door', 'shadow', { one_way: true }), ln('yard', 'hold'),
]);
/** v7's A2 shape: one airlock door in, one out, a two-way loop between (the neck or the staging). */
const v7A2 = (): Graph => graph(['A2'], [
  sp('west', 'A2', ['entry']), sp('neck', 'A2'), sp('staging', 'A2'), sp('east', 'A2', ['teach:door']), sp('hold', 'A2', ['exit']),
], [
  ln('west', 'neck'), ln('neck', 'east'), ln('west', 'staging'), ln('staging', 'east'), ln('east', 'hold'),
]);
/** v7's A6 shape: four floor-to-gallery links, an objective loop floor > gallery > bridge > cage > floor. */
const v7A6 = (): Graph => graph(['A6'], [
  sp('sump', 'A6', ['entry']), sp('floor', 'A6', ['teach:rope']), sp('gallery', 'A6'), sp('bridge', 'A6'),
  sp('cage', 'A6', ['objective']), sp('hold', 'A6', ['exit']),
], [
  ln('sump', 'floor'), ln('floor', 'gallery', 'ladder', 'high'), ln('floor', 'gallery', 'team_rope', 'high'),
  ln('floor', 'gallery', 'coop_boost', 'high'), ln('floor', 'gallery', 'open_stair', 'high'),
  ln('gallery', 'bridge', 'opening', 'high'), ln('bridge', 'cage', 'opening', 'high'), ln('cage', 'floor', 'drop', 'high'),
  ln('floor', 'hold'),
]);
/** J14's A8 shape after `taught_by` A1 (a taught one-route A1 first): the hall into split `z` straight, or boosted up to
 *  the west gallery first; then the vault and the dock. `guard`: the vault is a guarded encounter space. */
const j14A8 = (guard: boolean): Graph => graph(['A1', 'A8'], [
  sp('a1-in', 'A1', ['entry', 'teach:door']), sp('a1-out', 'A1', ['exit']),
  sp('vestibule', 'A8', ['entry']), sp('hall', 'A8'), sp('gallery-west', 'A8'), sp('gallery', 'A8', ['split:z:a']),
  sp('office', 'A8', ['split:z:a']), sp('counters', 'A8', ['split:z:b']), sp('vault', 'A8', [], guard ? GUARDED : {}),
  sp('dock', 'A8', ['exit']),
], [
  ln('a1-in', 'a1-out'), ln('a1-out', 'vestibule', 'corridor', 'spine'),
  ln('vestibule', 'hall'), ln('hall', 'counters'), ln('hall', 'gallery-west', 'coop_boost', 'high'),
  ln('gallery-west', 'gallery', 'opening', 'high'), ln('gallery', 'office', 'door', 'high'), ln('counters', 'office', 'door'),
  ln('office', 'vault', 'door', 'high'), ln('counters', 'vault', 'door'), ln('vault', 'dock'),
]);

describe('validator-port S4: sectionRoutes, one fixture per A26 shape', () => {
  it('two openings and a boost plus a human ladder between the same two spaces: 1 route', () => {
    expect(routesOf(sameWall(), 'A1')).toEqual({ count: 1, paths: [['e', 'm', 'top']] });
  });

  it('a boost up and a drop back between two spaces: 1 route; J14 A1 (drop on, one-way door back): 1 route', () => {
    const g = graph(['A1'], [sp('e', 'A1', ['entry']), sp('low', 'A1'), sp('up', 'A1'), sp('x', 'A1', ['exit'])], [
      ln('e', 'low'), ln('low', 'up', 'coop_boost', 'high'), ln('up', 'low', 'drop', 'high'), ln('up', 'x'),
    ]);
    expect(routesOf(g, 'A1')).toEqual({ count: 1, paths: [['e', 'low', 'up', 'x']] });
    expect(routesOf(j14A1(), 'A1')).toEqual({ count: 1, paths: [['lounge', 'apron', 'walltop', 'yard', 'hold']] });
  });

  it('single airlock doors around a two-way loop (v7 A2): 2 routes, ERR up to taught_by', () => {
    expect(routesOf(v7A2(), 'A2')).toEqual({ count: 2, paths: [['west', 'neck', 'east', 'hold'], ['west', 'staging', 'east', 'hold']] });
    expect(train(v7A2()).errors).toEqual([
      'section A2: 2 routes (west > neck > east > hold | west > staging > east > hold) up to taught_by A2 (a side route; one guided route per section, A8)',
    ]);
  });

  it('a loop off one space that comes back to it (v7 A6 objective loop): 1 route', () => {
    expect(routesOf(v7A6(), 'A6')).toEqual({ count: 1, paths: [['sump', 'floor', 'hold']] });
    expect(train(v7A6()).errors).toEqual([]);
  });

  it("J14's A8 after taught_by: 2 routes; ERR without a guarded encounter space; the campaign route rules with one", () => {
    expect(routesOf(j14A8(false), 'A8')).toEqual({ count: 2, paths: [
      ['vestibule', 'hall', 'split:z', 'vault', 'dock'], ['vestibule', 'hall', 'gallery-west', 'split:z', 'vault', 'dock'],
    ] });
    expect(train(j14A8(false)).errors).toEqual([
      'section A8: 2 routes (vestibule > hall > split:z > vault > dock | vestibule > hall > gallery-west > split:z > vault > dock) after taught_by A1 but no guarded encounter space (a side route only when training against enemies, A9)',
    ]);
    const r = train(j14A8(true));
    expect(has(r.errors, 'no guarded encounter space')).toBe(false);
    const A9 = 'section A8 (side routes after taught_by: campaign route rules, A9): ';
    expect(r.errors).toContainEqual(`${A9}vault: 2 approaches (need 3+)`);
    expect(r.errors).toContainEqual(`${A9}vault: no loud approach`);
    expect(r.errors.every((e) => e.startsWith(A9))).toBe(true);
  });

  it('the count stops at 10; no single entry or exit is 0 routes; entry = exit is 1', () => {
    const mids = Array.from({ length: 12 }, (_, i) => `m${i}`);
    const g = graph(['A1'], [sp('e', 'A1', ['entry']), ...mids.map((m) => sp(m, 'A1')), sp('x', 'A1', ['exit'])],
      mids.flatMap((m) => [ln('e', m), ln(m, 'x')]));
    const r = routesOf(g, 'A1');
    expect(r.count).toBe(MAX_ROUTES);
    expect(r.paths).toHaveLength(10);
    expect(has(train(g).errors, 'section A1: 10+ routes (')).toBe(true);
    (g.spaces[0] as Space).tags = [];
    expect(routesOf(g, 'A1')).toEqual({ count: 0, paths: [] });
    const one = graph(['A1'], [sp('e', 'A1', ['entry', 'exit'])], []);
    expect(routesOf(one, 'A1')).toEqual({ count: 1, paths: [['e']] });
  });

  it('spine links and other sections never count', () => {
    const g = j14A8(false);
    g.links.push(ln('a1-in', 'hall', 'corridor', 'spine'), ln('a1-out', 'dock'));
    expect(routesOf(g, 'A8').count).toBe(2);
    expect(routesOf(g, 'A1').count).toBe(1);
  });
});

describe('validator-port S4: splits (A23)', () => {
  /** A late section (after taught_by A1) whose second way is split `q`; `side`: a real side route too; `guard`. */
  const late = (side: boolean, guard: boolean): Graph => graph(['A1', 'A2'], [
    sp('a1-in', 'A1', ['entry', 'teach:door']), sp('a1-out', 'A1', ['exit']),
    sp('e', 'A2', ['entry']), sp('qa', 'A2', ['split:q:a'], guard ? GUARDED : {}), sp('qb', 'A2', ['split:q:b']),
    sp('side', 'A2'), sp('x', 'A2', ['exit']),
  ], [
    ln('a1-in', 'a1-out'), ln('e', 'qa'), ln('e', 'qb'), ln('qa', 'x'), ln('qb', 'x'),
    ...(side ? [ln('e', 'side'), ln('side', 'x')] : []),
  ]);

  it('a late section whose only second way is a split, no guard: 1 route, no ERR', () => {
    expect(routesOf(late(false, false), 'A2')).toEqual({ count: 1, paths: [['e', 'split:q', 'x']] });
    expect(train(late(false, false)).errors).toEqual([]);
  });

  it('a late section with a split plus a real side route and no guard: ERR; with a guarded encounter space the rules run', () => {
    expect(routesOf(late(true, false), 'A2').count).toBe(2);
    expect(has(train(late(true, false)).errors, 'section A2: 2 routes (')).toBe(true);
    const r = train(late(true, true));
    expect(has(r.errors, 'no guarded encounter space')).toBe(false);
    expect(r.errors).toContainEqual('section A2 (side routes after taught_by: campaign route rules, A9): qa: 2 approaches (need 3+)');
  });

  it('up to taught_by a split is an ERR by its tag, once per split, even as one route', () => {
    const g = late(false, false);
    g.meta.taught_by = 'A2';
    (g.spaces[1] as Space).tags.push('teach:door');
    const errs = train(g).errors;
    expect(errs.filter((e) => e.includes("split 'q'"))).toEqual(["section A2: split 'q' up to taught_by A2 (no split until the last kit move is taught, A8)"]);
  });
});

describe('validator-port S4: taught_by and teach (A8)', () => {
  it('taught_by: ERR missing or not in meta.sections on training; ERR present on another mode', () => {
    expect(train(graph(['A1'], sameWall().spaces, sameWall().links, null)).errors).toEqual([
      'meta.taught_by: missing (the section where the last co-op kit move is taught on its own, BRIEF A8)',
    ]);
    expect(train(graph(['A1'], sameWall().spaces, sameWall().links, 'A9')).errors).toEqual(["meta.taught_by: 'A9' is not in meta.sections"]);
    const c = sameWall();
    c.meta.mode = 'campaign';
    expect(train(c).errors).toEqual(['meta.taught_by: only a training map has a taught_by section (this is a campaign map)']);
    delete c.meta.taught_by;
    expect(train(c)).toEqual({ errors: [], warns: [], infos: [] });
  });

  it('no teach element up to taught_by: ERR; a teach link field or a teach:<move> tag counts; after taught_by none needed', () => {
    const g = graph(['A1', 'A2'], [
      sp('a', 'A1', ['entry']), sp('b', 'A1', ['exit']), sp('c', 'A2', ['entry']), sp('d', 'A2', ['exit']),
    ], [ln('a', 'b'), ln('c', 'd')]);
    expect(train(g).errors).toEqual(["section A1: no teach element (a link 'teach' field or a 'teach:<move>' space tag) up to taught_by A1 (A8)"]);
    g.links[0]!.teach = 'quiet door';
    expect(train(g).errors).toEqual([]);
    g.links[0]!.teach = 3;
    expect(train(g).errors).toContainEqual('link a -> b (door): teach must name the move (text)');
  });

  it('the choke test: a teach element some entry-to-exit path avoids is an ERR (a parallel link, a loop space)', () => {
    expect(train(sameWall()).errors).toEqual([]);
    const link = sameWall();
    link.spaces[0]!.tags = ['entry'];
    link.links[2]!.teach = 'boost';
    expect(train(link).errors).toEqual([
      'section A1: teach \'boost\' at link m -> top (coop_boost) is avoided by an entry-to-exit path (without it top is still reached; the section does not force it, A8)',
    ]);
    const loop = v7A6();
    loop.spaces[1]!.tags = [];
    loop.spaces[2]!.tags = ['teach:rope'];
    expect(train(loop).errors).toEqual([
      "section A6: teach 'rope' at gallery is avoided by an entry-to-exit path (without it hold is still reached; the section does not force it, A8)",
    ]);
    expect(train(j14A1()).errors).toEqual([]);
  });
});

describe('validator-port S4: the campaign route rules kept from checkEncounters (A9)', () => {
  /** One section: two shadow doors into the guarded `v` (a one-way door out), the high way round by `w`. */
  const broken = (): Graph => graph(['A1'], [
    sp('e', 'A1', ['entry']), sp('v', 'A1', [], GUARDED), sp('w', 'A1'), sp('x', 'A1', ['exit']),
  ], [
    ln('e', 'v'), ln('e', 'v', 'opening'), ln('v', 'x', 'door', 'shadow', { one_way: true }),
    ln('e', 'w', 'ladder', 'high'), ln('w', 'x', 'ladder', 'high'),
  ]);

  it('a fixture breaking each kept rule prints each core line, and nothing else', () => {
    expect(campaignRouteRules(broken(), 'A1')).toEqual([
      'v: 2 approaches (need 3+)',
      'v: approaches use 1 route kind(s) (need 2+)',
      'v: no high approach',
      'v: no loud approach',
      'section A1: routes never cross (shadow and high share no space)',
    ]);
  });

  it('a section that keeps the rules prints nothing; the late side-route section reports them under A9', () => {
    const ok = broken();
    ok.links.push(ln('w', 'v', 'ladder', 'high'), ln('e', 'v', 'roller_door', 'loud'));
    expect(campaignRouteRules(ok, 'A1')).toEqual([]);
    const late = graph(['A0', 'A1'], [sp('p', 'A0', ['entry', 'exit', 'teach:door']), ...broken().spaces], broken().links, 'A0');
    const r = train(late);
    expect(r.errors).toContainEqual('section A1 (side routes after taught_by: campaign route rules, A9): v: no loud approach');
    expect(r.errors).toHaveLength(5);
  });
});

describe('validator-port S4: wiring', () => {
  it('validate() runs the training checks on a training map only', () => {
    const g = v7A2();
    g.spaces[0]!.tags.push('start');
    const r = validate(g, { metrics: METRICS }) as Report;
    expect(has(r.errors, 'section A2: 2 routes (')).toBe(true);
    g.meta.mode = 'sector';
    delete g.meta.taught_by;
    expect(has((validate(g, { metrics: METRICS }) as Report).errors, 'routes (')).toBe(false);
  });
});
