import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  mergeGraphs, run, validate,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/level-validate.mjs';
// @ts-expect-error plain .mjs process script without types
import { COOP_KINDS } from '../scripts/level-graph-lib.mjs';
// @ts-expect-error plain .mjs process script without types
import { checkMeasured } from '../scripts/level-checks/measured.mjs';

// validator-port S3 (docs/validator-port/PLAN.md): the greybox measured checks, V6's checkMeasured (v6 8f551e18
// tests/levelValidate.test.ts "greybox measurements (V6d checkMeasured)") ported, plus shadow share as INFO (V1, A4) and
// the presence gate under --require-measured (V2, A5: split legs and reach, campaign way backs, null as WARN).
const ROOT = path.resolve(__dirname, '..');

interface Report { errors: string[]; warns: string[]; infos: string[] }
type Obj = Record<string, unknown>;
interface Space {
  id: string; section: string; type: string; room_class: string; function: string; storey: number;
  size: number[]; tension: number; tags: string[]; shadow_pct?: number; los_break_s?: number;
  vantage?: { from: string; sees_pct?: number }; guards?: Record<string, number>; measured?: Obj;
}
interface Link {
  from: string; to: string; kind: string; route: string; width?: number; height?: number; length?: number;
  time_s?: number; level_change?: number; shared?: boolean; one_way?: boolean; assist?: string; measured?: Obj;
}
interface Graph {
  meta: { map: string; name: string; mode: string; players: number[]; sections: string[]; measured?: Obj };
  spaces: Space[]; links: Link[];
}
type Metrics = Record<string, unknown> & { rules: Record<string, unknown> };

const REAL_METRICS = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/design/metrics.json'), 'utf8')) as Metrics;
const fullMetrics = (): Metrics => structuredClone(REAL_METRICS);
const METRICS = fullMetrics();

const sp = (id: string, section: string, type: string, room_class: string, size: number[], tension: number, tags: string[] = [], extra: Partial<Space> = {}): Space =>
  ({ id, section, type, room_class, function: `${id} test space`, storey: 0, size, tension, tags, ...extra });
const ln = (from: string, to: string, kind: string, route: string, extra: Partial<Link> = {}): Link => ({ from, to, kind, route, ...extra });
const DOOR = { width: 1.2, height: 2.1 };
const DDOOR = { width: 2.0, height: 2.1 };
const DUCT = { width: 1.2, height: 1.5 };

/** tests/levelValidate.test.ts base() (Sector Ops, two players): S1 gate, encounter court under a roof walk, exit hut;
 *  a spine corridor; S2 hall splitting into dock (leg a) and walk (leg b, overwatch) round the vault encounter, exfil. */
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

/** tests/levelValidate.test.ts campaignBase(): S1's hut doors are team doors, S2's yard is behind a team door or a
 *  throw. Co-op links: two boosts, three pair_gates, one team_throw. */
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

/** base() with both encounter spaces measured at their declared values, and a measured split. */
const measured = (g: Graph = base()): Graph => {
  space(g, 'a-court').measured = { shadow_pct: 0.5, sees_pct: 0.75, los_break_s: 4, vantage_at: [1, 0, 2], cells: 800 };
  space(g, 'b-vault').measured = { shadow_pct: 0.45, sees_pct: 0.8, los_break_s: 3 };
  g.meta.measured = { tool: 'level-measure 1', splits: { x: { a_s: 40, b_s: 38, reach_s: 10 } } };
  return g;
};
type WayBack = { from: string; to: string; kind: string; back_s: number | null; why?: string; path_m?: number };
/** One way back per co-op link, in graph order (S1's `meta.measured.ways_back` shape), each `back_s` seconds. */
const waysBack = (g: Graph, back_s = 5): WayBack[] => g.links.filter((l) => COOP_KINDS.has(l.kind))
  .map((l) => ({ from: l.from, to: l.to, kind: l.kind, back_s, path_m: back_s * 3 }));
/** campaignBase() fully measured: spaces, the split and every way back. */
const campaignMeasured = (): Graph => {
  const g = measured(campaignBase());
  (g.meta.measured as Obj).ways_back = waysBack(g);
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
const check = (g: Graph, metrics: unknown = METRICS, requireMeasured = false): Report => validate(g, { metrics, requireMeasured }) as Report;
const only = (g: Graph, requireMeasured = false, metrics: unknown = METRICS): Report => checkMeasured(g, metrics, { requireMeasured }) as Report;
const splits = (g: Graph): Obj => (g.meta.measured as { splits: Obj }).splits;
const expectErr = (r: Report, ...frags: string[]): void => {
  for (const f of frags) expect(r.errors, `no ERROR containing "${f}"`).toContainEqual(expect.stringContaining(f));
};
const expectWarn = (r: Report, frag: string): void => {
  expect(r.warns, `no WARN containing "${frag}"`).toContainEqual(expect.stringContaining(frag));
};
const expectInfo = (r: Report, frag: string): void => {
  expect(r.infos, `no INFO containing "${frag}"`).toContainEqual(expect.stringContaining(frag));
};

describe('level-checks/measured: V6d checkMeasured, ported', () => {
  it('measured values on target: no ERR, no WARN, no pending INFO', () => {
    const r = check(measured());
    expect(r.errors).toEqual([]);
    expect(r.warns).toEqual([]);
    expect(r.infos).toEqual([]);
    expect(check(measured(), METRICS, true).errors).toEqual([]);
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

  it('a split reach over the limit is an ERR; a null reach is a WARN, not an ERR; an unknown split id WARNs', () => {
    const g = measured();
    g.meta.measured = { splits: { x: { reach_s: 17.2 } } };
    expectErr(check(g), 'split x: measured reach_s 17.2 s above 15 s');
    g.meta.measured = { splits: { x: { reach_s: 15 } } };
    expect(check(g).errors).toEqual([]);
    g.meta.measured = { splits: { x: { reach_s: null } } };
    const r = check(g);
    expect(r.errors).toEqual([]);
    expectWarn(r, 'split x: measured reach_s is null');
    expectWarn(r, 'the declared reach is checked');
    g.meta.measured = { splits: { nope: { reach_s: 1 } } };
    expectWarn(check(g), 'meta.measured.splits.nope: names no split');
  });

  it('a non-number measured value is an ERR', () => {
    const g = measured();
    space(g, 'a-court').measured = { sees_pct: '0.75' };
    expectErr(check(g), 'a-court: measured sees_pct must be a number');
    splits(g).x = { a_s: '40', b_s: 38, reach_s: 10 };
    expectErr(check(g), 'split x: measured a_s must be a number');
  });

  it('measured away from the declared target by more than 0.10 (fractions) or 1.5 s is a WARN; within it is silent', () => {
    const g = measured();
    space(g, 'a-court').measured = { shadow_pct: 0.5, sees_pct: 0.88, los_break_s: 2.4 };
    const r = check(g);
    expect(r.errors).toEqual([]);
    expectWarn(r, 'a-court: measured sees_pct 0.88 vs declared 0.75');
    expectWarn(r, 'a-court: measured los_break_s 2.4 s vs declared 4 s');
    space(g, 'a-court').measured = { shadow_pct: 0.59, sees_pct: 0.85, los_break_s: 5 };
    expect(check(g).warns).toEqual([]);
    const l = link(g, 'a-gate', 'a-roof', 'ladder');
    l.measured = { time_s: 13.4, path_m: 17.4 };
    expect(check(g).warns).toEqual([]);
    l.measured = { time_s: 13.7, path_m: 17.8 };
    expectWarn(check(g), 'link a-gate -> a-roof (ladder): measured time_s 13.7 s vs declared 12 s');
    l.measured = { time_s: null, why: 'ladder not modelled' };
    expect(check(g).warns).toEqual([]);
  });

  it('INFO pending V6 per encounter space with no measured; only encounter spaces; none once measured', () => {
    const g = base();
    expect(check(g).infos).toEqual(['a-court: pending V6 (no measured values)', 'b-vault: pending V6 (no measured values)']);
    space(g, 'a-court').measured = { sees_pct: 0.75 };
    expect(check(g).infos).toEqual(['b-vault: pending V6 (no measured values)']);
  });

  it('--require-measured turns pending into an ERR for each unmeasured encounter space', () => {
    const g = base();
    const r = check(g, METRICS, true);
    expectErr(r, 'a-court: no measured values (--require-measured)', 'b-vault: no measured values (--require-measured)');
    expect(r.infos.filter((i) => i.includes('pending V6'))).toEqual([]);
    space(g, 'a-court').measured = { sees_pct: 0.75 };
    space(g, 'b-vault').measured = { sees_pct: 0.8 };
    g.meta.measured = { splits: { x: { a_s: 40, b_s: 38, reach_s: 10 } } };
    expect(check(g, METRICS, true).errors).toEqual([]);
  });

  it('split legs read measured.path_m before time_s (A6): the 90 s limit and the 20% parity fail on the measurement', () => {
    const g = base();
    expect(check(g).errors).toEqual([]);
    // leg a runs hall -> dock (door) -> vault (door); a measured door path (120 m at 1.3 m/s) pushes it over the limit
    link(g, 'b-hall', 'b-dock', 'door').measured = { time_s: 92.3, path_m: 120 };
    expectErr(check(g), 'split x leg a:', 's over the 90 s limit');
    // a declared time_s alone is overridden by a measured path
    const h = base();
    link(h, 'b-hall', 'b-walk', 'fire_stair').time_s = 200;
    expectErr(check(h), 'split x leg b:');
    link(h, 'b-hall', 'b-walk', 'fire_stair').measured = { time_s: 8, path_m: 10.4 };
    expect(check(h).errors).toEqual([]);
    // a measured path_m of null falls back to the declared time_s
    link(h, 'b-hall', 'b-walk', 'fire_stair').measured = { time_s: null, why: 'stair off the nav grid' };
    expectErr(check(h), 'split x leg b:');
    // parity: leg a far slower than leg b by measurement
    const p = base();
    link(p, 'b-hall', 'b-dock', 'door').measured = { time_s: 40, path_m: 52 };
    expectErr(check(p), 'split x: legs');
  });

  it('measured link paths also feed the partner reach path, re-timed at the reach speed', () => {
    const g = base();
    expect(check(g).errors).toEqual([]);
    const retime = (pathM: number): void => {
      for (const [from, to, kind] of [['b-walk', 'b-vault', 'ladder'], ['b-vault', 'b-walk', 'coop_boost'], ['b-hall', 'b-dock', 'door'], ['b-dock', 'b-vault', 'door'], ['b-hall', 'b-walk', 'fire_stair']] as const) {
        link(g, from, to, kind).measured = { time_s: 30, path_m: pathM };
      }
    };
    // 39 m at 3 m/s = 13 s a link: dock -> vault -> walk is 26 s
    retime(39);
    expectErr(check(g), 'a downed partner is 26.0 s away (from b-dock');
    retime(21);
    expect(check(g).errors.filter((e) => e.includes('downed partner'))).toEqual([]);
  });

  it('target checks are encounter rules: a measured non-encounter space only drift-WARNs where it declares a target', () => {
    const g = measured();
    const hall = space(g, 'b-hall');
    expect(hall.type).not.toBe('encounter');
    hall.measured = { shadow_pct: 0, sees_pct: 0.1, los_break_s: 20 };
    let r = check(g);
    expect(r.errors).toEqual([]);
    expect(r.warns).toEqual([]);
    expect(r.infos).toEqual([]);
    hall.los_break_s = 4;
    r = check(g);
    expect(r.errors).toEqual([]);
    expectWarn(r, 'b-hall: measured los_break_s 20 s vs declared 4 s');
  });

  it('CLI: an unmeasured map prints pending INFO and passes; --require-measured fails it (spawned node)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'level-measured-'));
    try {
      const lines: string[] = [];
      expect(run([], { log: (x: string) => { lines.push(x); }, root: ROOT })).toBe(2);
      expect(lines.join('\n')).toContain('[--require-measured]');
      const file = path.join(dir, 'g.json');
      fs.writeFileSync(file, JSON.stringify(base()));
      const node = (...args: string[]) => spawnSync(process.execPath, [path.join(ROOT, 'scripts/level-validate.mjs'), file, ...args], { encoding: 'utf8', timeout: 60000 });
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

describe('level-checks/measured: shadow share is INFO everywhere (V1, A4, G329)', () => {
  it('a measured shadow_pct outside the band is an INFO, never an ERR, on every mode and under --require-measured', () => {
    for (const mode of ['campaign', 'sector', 'training']) {
      const g = measured();
      g.meta.mode = mode;
      (g.meta.measured as Obj).ways_back = waysBack(g);
      space(g, 'a-court').measured = { shadow_pct: 0.31 };
      space(g, 'b-vault').measured = { shadow_pct: 0.72 };
      for (const req of [false, true]) {
        const r = only(g, req);
        expect(r.errors, mode).toEqual([]);
        expect(r.warns, mode).toEqual([]);
        expectInfo(r, 'a-court: measured shadow_pct 0.31 outside 0.4-0.6, declared 0.5 (information; the light band is the target)');
        expectInfo(r, 'b-vault: measured shadow_pct 0.72 outside 0.4-0.6, declared 0.45');
      }
    }
  });

  it('the band is read from the metrics; a missing band key is one INFO, not a WARN', () => {
    const g = measured();
    space(g, 'a-court').measured = { shadow_pct: 0.31 };
    const m = fullMetrics();
    m.rules.shadow_min_frac = 0.2;
    m.rules.shadow_max_frac = 0.8;
    expect(only(g, false, m)).toEqual({ errors: [], warns: [], infos: [expect.stringContaining('a-court: measured shadow_pct 0.31 vs declared 0.5')] });
    delete m.rules.shadow_min_frac;
    const r = only(g, false, m);
    expect(r.warns).toEqual([]);
    expectInfo(r, 'metrics: rules.shadow_min_frac is missing from the metrics');
  });

  it('shadow drift from the declared value is an INFO (0.10 tolerance), on any space that declares one', () => {
    const g = measured();
    space(g, 'b-vault').measured = { shadow_pct: 0.58 };
    let r = only(g);
    expect(r.warns).toEqual([]);
    expect(r.infos).toEqual(['b-vault: measured shadow_pct 0.58 vs declared 0.45 (apart by more than 0.1; update the declared target)']);
    space(g, 'b-vault').measured = { shadow_pct: 0.54 };
    expect(only(g).infos).toEqual([]);
    const hall = space(g, 'b-hall');
    hall.shadow_pct = 0.5;
    hall.measured = { shadow_pct: 0 };
    r = only(g);
    expect(r.warns).toEqual([]);
    expectInfo(r, 'b-hall: measured shadow_pct 0 vs declared 0.5');
  });
});

describe('level-checks/measured: the presence gate and measured splits (V2, A5)', () => {
  it('a measured leg over split_max_s is an ERR; legs apart by more than split_parity_pct are an ERR', () => {
    const g = measured();
    splits(g).x = { a_s: 95, b_s: 88, reach_s: 10 };
    expect(only(g).errors).toEqual(['split x: measured a_s 95.0 s over the 90 s limit']);
    splits(g).x = { a_s: 60, b_s: 40, reach_s: 10 };
    expect(only(g).errors).toEqual(['split x: measured legs 60.0 s vs 40.0 s differ by 33% (max 20%)']);
    splits(g).x = { a_s: 50, b_s: 40, reach_s: 10 };
    expect(only(g).errors).toEqual([]);
    const m = fullMetrics();
    m.rules.split_max_s = 100;
    m.rules.split_parity_pct = 40;
    splits(g).x = { a_s: 95, b_s: 60, reach_s: 10 };
    expect(only(g, false, m).errors).toEqual([]);
  });

  it('--require-measured: a declared split with no measurement, or no a_s / b_s / reach_s, is an ERR; without it, silent', () => {
    const g = measured();
    g.meta.measured = { splits: {} };
    expect(only(g).errors).toEqual([]);
    expect(only(g, true).errors).toEqual(['split x: no measured legs and reach (meta.measured.splits.x; --require-measured)']);
    delete g.meta.measured;
    expect(only(g, true).errors).toEqual(['split x: no measured legs and reach (meta.measured.splits.x; --require-measured)']);
    g.meta.measured = { splits: { x: { a_s: null, b_s: 38 } } };
    expect(only(g).errors).toEqual([]);
    expect(only(g, true).errors).toEqual(['split x: no measured a_s (--require-measured)', 'split x: no measured reach_s (--require-measured)']);
  });

  it('a null reach stays a WARN under --require-measured, and the declared reach is still checked by the core', () => {
    const g = measured();
    splits(g).x = { a_s: 40, b_s: 38, reach_s: null };
    const r = check(g, METRICS, true);
    expect(r.errors).toEqual([]);
    expectWarn(r, 'split x: measured reach_s is null');
    // the declared links make the reach too long: the core partner reach check still ERRs
    link(g, 'b-hall', 'b-walk', 'fire_stair').time_s = 30;
    expectErr(check(g, METRICS, true), 'split x: a downed partner is 17.0 s away');
  });

  it('campaign way backs: under --require-measured every co-op link needs one; present and on time passes', () => {
    const g = campaignMeasured();
    expect(only(g, true)).toEqual({ errors: [], warns: [], infos: [] });
    expect(check(g, METRICS, true).errors).toEqual([]);
    delete (g.meta.measured as Obj).ways_back;
    expect(only(g).errors).toEqual([]);
    const coop = g.links.filter((l) => COOP_KINDS.has(l.kind));
    expect(coop).toHaveLength(6);
    expect(only(g, true).errors).toEqual(coop.map((l) => `link ${l.from} -> ${l.to} (${l.kind}): no measured way back (meta.measured.ways_back; --require-measured)`));
    // one missing: matched by from / to / kind, so two pair_gates between the same spaces each need their own entry
    const back = waysBack(g);
    const i = back.findIndex((w) => w.kind === 'pair_gate' && w.from === 'a-court');
    back.splice(i, 1);
    (g.meta.measured as Obj).ways_back = back;
    expect(only(g, true).errors).toEqual(['link a-court -> a-hut (pair_gate): no measured way back (meta.measured.ways_back; --require-measured)']);
  });

  it('a measured way back over reach_max_s is an ERR, except across a two-way gate (its own way back)', () => {
    const g = campaignMeasured();
    const back = waysBack(g);
    for (const w of back) if (w.kind === 'coop_boost' && w.from === 'a-court') w.back_s = 16.4;
    for (const w of back) if (w.kind === 'pair_gate' && w.from === 'b-vault') w.back_s = 40;
    (g.meta.measured as Obj).ways_back = back;
    expect(only(g).errors).toEqual(['link a-court -> a-roof (coop_boost): measured way back from a-roof to a-court 16.4 s, over the 15 s revive reach']);
  });

  it('a null way back is a WARN with its why, under --require-measured too; the declared way back is still checked', () => {
    const g = campaignMeasured();
    const back = waysBack(g);
    const throwBack = back.find((w) => w.kind === 'team_throw');
    if (!throwBack) throw new Error('no team_throw way back');
    throwBack.back_s = null;
    throwBack.why = 'no nav path from every b-out floor cell to b-vault';
    (g.meta.measured as Obj).ways_back = back;
    const r = only(g, true);
    expect(r.errors).toEqual([]);
    expect(r.warns).toEqual(['link b-vault -> b-out (team_throw): measured way back is null (no nav path from every b-out floor cell to b-vault); the declared way back is checked (justify it in the design doc)']);
    expect(check(g, METRICS, true).errors).toEqual([]);
    // a two-way gate is its own way back: a null there is no WARN (its entry still counts for presence)
    for (const w of back) if (w.kind === 'pair_gate') w.back_s = null;
    expect(only(g, true).warns).toEqual([expect.stringContaining('link b-vault -> b-out (team_throw): measured way back is null')]);
  });

  it('a multi-file map (S2 layout: each file its own splits and way backs) is measured as one merged graph', () => {
    const g = campaignMeasured();
    const back = waysBack(g);
    const cut = (sec: string, own: Link[]): Graph => ({
      meta: { ...g.meta, sections: [sec], measured: { tool: 'level-measure 1', geom: 'g', splits: sec === 'S2' ? splits(g) : {},
        ways_back: back.filter((w) => own.some((l) => l.from === w.from && l.to === w.to && l.kind === w.kind)) } },
      spaces: g.spaces.filter((s) => s.section === sec), links: own,
    });
    const files = [cut('S1', g.links.slice(0, 9)), cut('S2', g.links.slice(9))];
    expect((files[1]!.meta.measured as { ways_back: unknown[] }).ways_back).toHaveLength(3);
    const merged = mergeGraphs(files) as Graph;
    expect(merged.meta.measured).toEqual({ tool: 'level-measure 1', geom: 'g', splits: splits(g), ways_back: back });
    // only file 2 measured: its block is the map's
    expect(mergeGraphs([{ ...files[0], meta: { ...files[0]!.meta, measured: null } }, files[1]]).meta.measured).toBe(files[1]!.meta.measured);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'level-measured-files-'));
    try {
      const paths = files.map((f, i) => {
        const p = path.join(dir, `S${i + 1}.json`);
        fs.writeFileSync(p, JSON.stringify(f));
        return p;
      });
      const lines: string[] = [];
      const log = (x: string): void => { lines.push(x); };
      expect(run([...paths, '--require-measured'], { log, root: ROOT })).toBe(0);
      expect(lines.filter((l) => l.startsWith('ERROR:'))).toEqual([]);
      // a too-long way back owned by file 2 still ERRs
      for (const w of (files[1]!.meta.measured as { ways_back: WayBack[] }).ways_back) if (w.kind === 'coop_boost') w.back_s = 16.4;
      fs.writeFileSync(paths[1]!, JSON.stringify(files[1]));
      lines.length = 0;
      expect(run([...paths, '--require-measured'], { log, root: ROOT })).toBe(1);
      expect(lines.filter((l) => l.startsWith('ERROR:'))).toEqual(['ERROR: link b-vault -> b-walk (coop_boost): measured way back from b-walk to b-vault 16.4 s, over the 15 s revive reach']);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a way back naming no co-op link WARNs; a bad entry or list ERRs; non-campaign maps need none', () => {
    const g = campaignMeasured();
    const back: unknown[] = waysBack(g);
    back.push({ from: 'a-gate', to: 'a-court', kind: 'coop_boost', back_s: 3 }, 7);
    (g.meta.measured as Obj).ways_back = back;
    const r = only(g);
    expect(r.errors).toEqual(['meta.measured.ways_back[7] must be an object']);
    expect(r.warns).toEqual(['meta.measured.ways_back: a-gate -> a-court (coop_boost) names no co-op link']);
    (g.meta.measured as Obj).ways_back = { a: 1 };
    expect(only(g).errors[0]).toBe('meta.measured.ways_back must be a list');
    (g.meta.measured as Obj).ways_back = waysBack(g).map((w) => ({ ...w, back_s: 'slow' }));
    expectErr(only(g), 'link a-court -> a-roof (coop_boost) way back: measured back_s must be a number');
    for (const mode of ['sector', 'training']) {
      const h = measured();
      h.meta.mode = mode;
      expect(only(h, true).errors, mode).toEqual([]);
    }
  });

  it('the example graph (no measured yet) prints "pending V6" INFO only; --require-measured ERRs each', () => {
    const g = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/level-validator/example.graph.json'), 'utf8')) as Graph;
    const enc = g.spaces.filter((s) => s.type === 'encounter').map((s) => s.id);
    expect(enc.length).toBeGreaterThan(0);
    expect(only(g)).toEqual({ errors: [], warns: [], infos: enc.map((id) => `${id}: pending V6 (no measured values)`) });
    const strict = only(g, true);
    expect(strict.errors.filter((e) => !e.includes('--require-measured'))).toEqual([]);
    expect(strict.errors.length).toBeGreaterThanOrEqual(enc.length);
  });

  it('the campus graphs (measured by S10) carry measured on every encounter; their only ERRs are sees_pct target misses', () => {
    const read = (p: string): Graph => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')) as Graph;
    const g = mergeGraphs([1, 2, 3, 4, 5].map((i) => read(`docs/sector-redesign/graph/campusOps-S${i}.json`))) as Graph;
    const enc = g.spaces.filter((s) => s.type === 'encounter');
    expect(enc.length).toBeGreaterThan(0);
    expect(enc.filter((s) => !s.measured).map((s) => s.id)).toEqual([]);
    // Before S10 the campus had no ERR here; the as-built campus misses only the vantage target (PLAN section 6).
    const miss = /^[\w-]+: measured sees_pct [\d.]+ below 0\.7 \(declared [\d.]+\)$/;
    for (const strict of [false, true]) {
      const r = only(g, strict);
      expect(r.errors.filter((e) => !miss.test(e)), `requireMeasured ${strict}`).toEqual([]);
    }
  });
});
