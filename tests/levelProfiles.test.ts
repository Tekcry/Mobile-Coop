import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  COOP_KINDS as LIB_COOP_KINDS, LINK_KINDS as LIB_LINK_KINDS, MODES, PROFILES, isOneWay as libIsOneWay, linkTime,
  mergeGraphs as libMergeGraphs, soloArcsOf,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/level-graph-lib.mjs';
import {
  COOP_KINDS, LINK_KINDS, checkCoop, checkDimensions, checkStructure, isOneWay, mergeGraphs, parseArgs, run, validate,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/level-validate.mjs';
// @ts-expect-error plain .mjs process script without types
import { checkMeasured } from '../scripts/level-checks/measured.mjs';
// @ts-expect-error plain .mjs process script without types
import { checkTraining } from '../scripts/level-checks/training.mjs';
// @ts-expect-error plain .mjs process script without types
import { checkPerfect, perfectPaths } from '../scripts/level-checks/perfect.mjs';
// @ts-expect-error plain .mjs process script without types
import { checkEngine } from '../scripts/level-checks/engine.mjs';
// @ts-expect-error plain .mjs process script without types
import { checkMission } from '../scripts/mission-validate.mjs';

// validator-port S0 (docs/validator-port/PLAN.md): the mode profiles (BRIEF A3, A7, Q29), the A25 link kinds, the
// lib split's seams (J13 imports `mergeGraphs`, `COOP_KINDS`, `isOneWay` from either file), the mission-node merge,
// `--require-measured`, measured link times (A6) and the module stubs.
const ROOT = path.resolve(__dirname, '..');
const METRICS = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/design/metrics.json'), 'utf8')) as Record<string, unknown>;

interface Report { errors: string[]; warns: string[]; infos: string[] }
type Obj = Record<string, unknown>;
interface Link { from: string; to: string; kind: string; route: string; [k: string]: unknown }
interface Graph { meta: Obj & { mode: string; sections: string[] }; spaces: Obj[]; links: Link[] }

const sp = (id: string, type: string, room_class: string, size: number[], tension: number, tags: string[], extra: Obj = {}): Obj =>
  ({ id, section: 'S1', type, room_class, function: `${id} test space`, storey: 0, size, tension, tags, ...extra });
const ln = (from: string, to: string, kind: string, route: string, extra: Obj = {}): Link => ({ from, to, kind, route, ...extra });
const DOOR = { width: 1.2, height: 2.1 };

/** One section on Sector Ops: a gate yard, the guarded court (unavoidable) under a roof walk, the exit hut (exfil).
 *  Its one co-op link is the boost from the court to the roof. */
const mini = (mode = 'sector'): Graph => ({
  meta: { map: 'probe', name: 'Probe', mode, players: [2], sections: ['S1'] },
  spaces: [
    sp('gate', 'exterior', 'yard', [14, 14, 12], 1, ['start', 'entry']),
    sp('court', 'encounter', 'yard', [14, 20, 12], 3, ['unavoidable'],
      { los_break_s: 4, vantage: { from: 'roof', sees_pct: 0.75 }, guards: { 2: 4 } }),
    sp('roof', 'connector', 'corridor', [3.5, 14, 3], 2, []),
    sp('hut', 'utility', 'security_room', [5.5, 7, 3], 2, ['exit', 'exfil']),
  ],
  links: [
    ln('gate', 'court', 'opening', 'shadow', { width: 3, height: 2.1, length: 17 }),
    ln('gate', 'court', 'roller_door', 'loud', { width: 3, height: 3, length: 17 }),
    ln('gate', 'court', 'duct', 'secret', { width: 1.2, height: 1.5, length: 17, time_s: 20 }),
    ln('gate', 'roof', 'ladder', 'high', { level_change: 4.5, length: 10, time_s: 12 }),
    ln('roof', 'court', 'ladder', 'high', { level_change: 4.5, length: 10, time_s: 12 }),
    ln('court', 'roof', 'coop_boost', 'high', { level_change: 4.5, length: 6, time_s: 5 }),
    ln('court', 'hut', 'door', 'shadow', { ...DOOR, length: 13 }),
    ln('court', 'hut', 'double_door', 'loud', { width: 2, height: 2.1, length: 13 }),
  ],
});
/** mini() as a campaign: the hut is behind team doors (a forced co-op gate). */
const miniCampaign = (): Graph => {
  const g = mini('campaign');
  for (const l of g.links) if (l.from === 'court' && l.to === 'hut') l.kind = 'pair_gate';
  return g;
};
const without = (g: Graph, from: string, to: string, kind: string): Graph => {
  g.links = g.links.filter((l) => !(l.from === from && l.to === to && l.kind === kind));
  return g;
};
const check = (g: Graph): Report => validate(g, { metrics: METRICS }) as Report;
const has = (lines: string[], frag: string): boolean => lines.some((l) => l.includes(frag));

/** The six kinds of A25 with their stand-ins' needed fields. */
const A25: [string, Obj][] = [
  ['vent_unlock', { ...DOOR, length: 6 }],
  ['plank_bridge', { ...DOOR, length: 6 }],
  ['deadweight', { width: 1.2, length: 6 }],
  ['chimney_pair', { level_change: 4, length: 6, time_s: 8 }],
  ['swing_pass', { width: 2.5, length: 6, time_s: 4 }],
  ['drop_catch', { level_change: 4, length: 6, time_s: 3 }],
];

describe('validator-port S0: the profile table (A3)', () => {
  it('one row per mode, as BRIEF A3, A7 and A10 set them', () => {
    expect([...MODES]).toEqual(['campaign', 'sector', 'training']);
    expect(PROFILES).toEqual({
      campaign: { twoPlayers: true, maxPlayers: 2, needsExfil: true, routeRules: true, guardBand: 'warn', coverage: true,
        soloTwin: 'err', forcedGate: true, gateReach: true, noSoftlock: false, aliveCeiling: true, needsUnavoidable: false,
        drills: false, marks: 'err', ghostPath: 'err' },
      sector: { twoPlayers: false, maxPlayers: 4, needsExfil: false, routeRules: true, guardBand: 'warn', coverage: true,
        soloTwin: 'warn', forcedGate: false, gateReach: false, noSoftlock: true, aliveCeiling: true, needsUnavoidable: true,
        drills: false, marks: 'err', ghostPath: 'err' },
      training: { twoPlayers: true, maxPlayers: 2, needsExfil: false, routeRules: false, guardBand: 'info', coverage: false,
        soloTwin: 'info', forcedGate: false, gateReach: false, noSoftlock: false, aliveCeiling: false,
        needsUnavoidable: false, drills: true, marks: 'info', ghostPath: 'info' },
    });
    expect(Object.isFrozen(PROFILES) && Object.isFrozen(PROFILES.training)).toBe(true);
  });

  it('the probe passes clean on Sector Ops and as a campaign', () => {
    for (const g of [mini(), miniCampaign()]) {
      const r = check(g);
      expect(r.errors).toEqual([]);
      expect(r.warns).toEqual([]);
    }
  });

  it('Q29: training skips co-op coverage; campaign and Sector Ops keep it', () => {
    for (const mode of ['sector', 'campaign']) {
      const g = without(mode === 'campaign' ? miniCampaign() : mini(), 'court', 'roof', 'coop_boost');
      if (mode === 'campaign') for (const l of g.links) if (l.kind === 'pair_gate') l.kind = 'door';
      const r = check(g);
      expect(r.errors).toContainEqual('section S1 has no co-op link');
      expect(r.errors).toContainEqual('co-op links reach 0 of 1 encounter spaces (need at least half)');
    }
    const t = without(mini('training'), 'court', 'roof', 'coop_boost');
    const r = check(t);
    expect(has(r.errors, 'co-op link')).toBe(false);
  });

  it('solo twin: ERR on a campaign, WARN on Sector Ops, INFO on training (A7)', () => {
    const twin = 'link court -> roof (coop_boost) has a solo twin: link court -> roof (ladder)';
    const add = (g: Graph): Graph => {
      g.links.push(ln('court', 'roof', 'ladder', 'high', { level_change: 4.5, length: 6, time_s: 6 }));
      return g;
    };
    const c = check(add(miniCampaign()));
    expect(has(c.errors, twin)).toBe(true);
    const s = check(add(mini()));
    expect(has(s.errors, twin)).toBe(false);
    expect(has(s.warns, twin)).toBe(true);
    const t = check(add(mini('training')));
    expect(has(t.errors, twin) || has(t.warns, twin)).toBe(false);
    expect(has(t.infos, twin)).toBe(true);
  });
});

describe('validator-port S0: the A25 kinds', () => {
  it('all six are link kinds and co-op kinds, from either import path (one set)', () => {
    expect(LINK_KINDS).toBe(LIB_LINK_KINDS);
    expect(COOP_KINDS).toBe(LIB_COOP_KINDS);
    for (const [kind] of A25) {
      expect(LINK_KINDS.has(kind), kind).toBe(true);
      expect(COOP_KINDS.has(kind), kind).toBe(true);
    }
  });

  it('each counts as co-op coverage of its section', () => {
    for (const [kind, fields] of A25) {
      const g = without(mini(), 'court', 'roof', 'coop_boost');
      g.links.push(ln('court', 'roof', kind, 'high', fields));
      const r = check(g);
      expect(has(r.errors, 'co-op link'), kind).toBe(false);
    }
  });

  it('drop_catch is one-way unless one_way: false; chimney_pair and swing_pass go both ways', () => {
    expect(isOneWay).toBe(libIsOneWay);
    expect(isOneWay({ kind: 'drop_catch' })).toBe(true);
    expect(isOneWay({ kind: 'drop_catch', one_way: false })).toBe(false);
    expect(isOneWay({ kind: 'chimney_pair' })).toBe(false);
    expect(isOneWay({ kind: 'swing_pass' })).toBe(false);
    expect(isOneWay({ kind: 'swing_pass', one_way: true })).toBe(true);
  });

  it('vent_unlock: one player passes it only from its to end (a bolted door); its reverse twins nothing', () => {
    const vent = ln('a', 'b', 'vent_unlock', 'shadow', DOOR);
    expect(soloArcsOf([vent]).map((a: { from: string; to: string }) => `${a.from}>${a.to}`)).toEqual(['b>a']);
    expect(soloArcsOf([ln('a', 'b', 'pair_gate', 'shadow', DOOR)])).toEqual([]);
    // The hut behind a vent door (from the court side) and a team door: a forced gate, the vent door its own way back.
    const g = miniCampaign();
    g.links = g.links.filter((l) => l.kind !== 'pair_gate');
    g.links.push(ln('court', 'hut', 'vent_unlock', 'shadow', { ...DOOR, length: 13 }),
      ln('court', 'hut', 'pair_gate', 'loud', { width: 2, height: 2.1, length: 13 }));
    expect(check(g).errors).toEqual([]);
    // Unlocked from the court side instead, one player walks through: no forced gate.
    const h = miniCampaign();
    h.links = h.links.filter((l) => !(l.kind === 'pair_gate' && l.route === 'shadow'));
    h.links.push(ln('hut', 'court', 'vent_unlock', 'shadow', { ...DOOR, length: 13 }));
    expect(check(h).errors).toContainEqual(expect.stringContaining("section S1: exit 'hut' is reached from entry 'gate' by solo links alone"));
  });

  it('a split leg walks a vent_unlock alone from its to end only', () => {
    // Legs: the court (a) and the roof (b) from the gate, rejoining at the hut; the court's only way on is a vent door.
    const legs = (from: string, to: string): Report => {
      const g = mini();
      (g.spaces[1] as Obj).tags = ['unavoidable', 'split:x:a'];
      (g.spaces[2] as Obj).tags = ['split:x:b', 'overwatch:x'];
      g.links = g.links.filter((l) => !(l.from === 'court' && l.to === 'hut'));
      g.links.push(ln('roof', 'hut', 'door', 'shadow', { ...DOOR, length: 10, assist: 'x' }),
        ln(from, to, 'vent_unlock', 'shadow', { ...DOOR, length: 13 }));
      return checkCoop(g, METRICS) as Report;
    };
    const apart = 'split x: legs never rejoin';
    expect(has(legs('hut', 'court').errors, apart)).toBe(false);
    expect(has(legs('court', 'hut').errors, apart)).toBe(true);
  });

  it("J14's A3 shape on a campaign: a section whose only co-op link is a vent_unlock behind a duct has a co-op link", () => {
    const shape = (doorKind: string): Graph => {
      const g = without(miniCampaign(), 'court', 'roof', 'coop_boost');
      g.links = g.links.filter((l) => l.kind !== 'pair_gate');
      g.links.push(ln('court', 'hut', 'duct', 'shadow', { width: 1.2, height: 1.5, length: 12, time_s: 14, one_way: true }),
        ln('court', 'hut', doorKind, 'shadow', { ...DOOR, length: 4, ...(doorKind === 'door' ? { bolted: true } : {}) }));
      return g;
    };
    expect(check(shape('vent_unlock')).errors).not.toContainEqual('section S1 has no co-op link');
    // As J14 draws it today (a bolted door), the section has none.
    expect(check(shape('door')).errors).toContainEqual('section S1 has no co-op link');
  });

  it('dimensions: one INFO per unbanded move kind; vent_unlock reads the door rows', () => {
    const g = mini();
    for (const [kind, fields] of A25) g.links.push(ln('court', 'roof', kind, 'high', fields));
    g.links.push(ln('court', 'roof', 'plank_bridge', 'high', { ...DOOR, length: 7 }));
    const r = checkDimensions(g, METRICS) as Report;
    expect(r.infos).toEqual(['plank_bridge', 'deadweight', 'chimney_pair', 'swing_pass', 'drop_catch']
      .map((k) => `${k}: no size band yet; the scale-sheet row comes with the move's coop-kit PR`));
    expect(r.errors).toEqual([]);
    const v = mini();
    v.links.push(ln('court', 'hut', 'vent_unlock', 'shadow', { width: 0.9, height: 2.4, length: 6 }));
    expect((checkDimensions(v, METRICS) as Report).errors).toEqual([
      'link court -> hut (vent_unlock): width 0.9 m below 1 m', 'link court -> hut (vent_unlock): height 2.4 m above 2.2 m']);
    const w = mini();
    w.links.push(ln('court', 'roof', 'plank_bridge', 'high', { length: 6 }), ln('court', 'roof', 'swing_pass', 'high', { length: 6 }));
    expect((checkDimensions(w, METRICS) as Report).errors).toEqual(['link court -> roof (plank_bridge): width missing',
      'link court -> roof (plank_bridge): height missing', 'link court -> roof (swing_pass): width missing']);
  });

  it('a plank bridge or deadweight door stays open once passed: its own way back (gate reach)', () => {
    for (const kind of ['plank_bridge', 'deadweight']) {
      const g = miniCampaign();
      g.links = g.links.filter((l) => !(l.kind === 'pair_gate' && l.route === 'shadow'));
      g.links.push(ln('court', 'hut', kind, 'shadow', { ...DOOR, length: 13, time_s: 9 }));
      expect(check(g).errors, kind).toEqual([]);
    }
  });
});

describe('validator-port S0: lib seams, merge, flag, link times, modules', () => {
  it('a teach:<move> space tag is a known tag (A8); other tags still WARN', () => {
    const g = mini('training');
    (g.spaces[1] as Obj).tags = ['unavoidable', 'teach:boost', 'teech:boost'];
    expect((checkStructure(g) as Report).warns).toEqual(["court: unknown tag 'teech:boost'"]);
  });

  it('mergeGraphs is one function from either file (J13 imports it); link order is file order', () => {
    expect(mergeGraphs).toBe(libMergeGraphs);
    const a = { meta: { map: 'm', sections: ['S1'] }, spaces: [{ id: 'x' }], links: [{ from: 'x', to: 'x', kind: 'door' }] };
    const b = { meta: { map: 'ignored', sections: ['S2'] }, spaces: [{ id: 'y' }], links: [{ from: 'y', to: 'y', kind: 'duct' }] };
    expect(mergeGraphs([a, b]).links.map((l: Link) => l.kind)).toEqual(['door', 'duct']);
  });

  it('mission nodes: objectives, rules and syncs (sync read as syncs) concatenated; mission and tracks kept', () => {
    const base = (sec: string, extra: Obj): Obj => ({ meta: { map: 'm', sections: [sec] }, spaces: [], links: [], ...extra });
    const merged = mergeGraphs([
      base('S1', { mission: { id: 'm1' }, objectives: [{ id: 'o1' }], rules: [{ kind: 'ghost' }], sync: [{ id: 's1' }], tracks: { A: {} } }),
      base('S2', { objectives: [{ id: 'o2' }], syncs: [{ id: 's2' }] }),
      base('S3', {}),
    ]);
    expect(merged.mission).toEqual({ id: 'm1' });
    expect(merged.objectives).toEqual([{ id: 'o1' }, { id: 'o2' }]);
    expect(merged.rules).toEqual([{ kind: 'ghost' }]);
    expect(merged.syncs).toEqual([{ id: 's1' }, { id: 's2' }]);
    expect(merged.tracks).toEqual({ A: {} });
    const two = mergeGraphs([base('S1', { mission: { id: 'a' }, tracks: [1] }), base('S2', { mission: { id: 'b' }, tracks: [2] })]);
    expect(two.mission).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(two.tracks).toEqual([[1], [2]]);
    const plain = mergeGraphs([base('S1', {})]);
    expect(Object.keys(plain)).toEqual(['meta', 'spaces', 'links']);
  });

  it('--require-measured parses and runs', () => {
    expect(parseArgs(['a.json', '--require-measured'])).toEqual({ files: ['a.json'], metrics: null, requireMeasured: true });
    expect(parseArgs(['--require-measured'])).toEqual({ error: 'no graph file given' });
    const lines: string[] = [];
    const example = path.join(ROOT, 'docs/level-validator/example.graph.json');
    expect(run([example, '--require-measured'], { log: (s: string) => { lines.push(s); }, root: ROOT })).toBe(0);
  });

  it('linkTime: measured path_m / speed first (A6), else time_s, else a walked length; null path_m falls through', () => {
    expect(linkTime({ kind: 'ladder', time_s: 12, measured: { path_m: 9, time_s: 6 } }, 1.5)).toEqual({ t: 6, untimed: false });
    expect(linkTime({ kind: 'ladder', time_s: 12, measured: { path_m: null } }, 1.5)).toEqual({ t: 12, untimed: false });
    expect(linkTime({ kind: 'door', length: 6 }, 1.5)).toEqual({ t: 4, untimed: false });
    expect(linkTime({ kind: 'vent_unlock', length: 6 }, 1.5)).toEqual({ t: 4, untimed: false });
    expect(linkTime({ kind: 'ladder', length: 6 }, 1.5)).toEqual({ t: 0, untimed: true });
  });

  it('a measured path_m re-times a split leg (checkCoop reads linkTime)', () => {
    const g = mini();
    const court = g.spaces[1] as Obj;
    court.tags = ['unavoidable', 'split:x:a'];
    (g.spaces[2] as Obj).tags = ['split:x:b', 'overwatch:x'];
    g.links.push(ln('roof', 'hut', 'door', 'shadow', { ...DOOR, length: 10, assist: 'x' }));
    const slow = structuredClone(g);
    for (const l of slow.links) if (l.from === 'court' && l.to === 'hut') l.measured = { path_m: 200 };
    expect(has(check(g).errors, 'split x leg a:')).toBe(false);
    expect(has(check(slow).errors, 'split x leg a:')).toBe(true);
  });

  it('the check modules are wired with (graph, metrics, opts) and start empty; perfectPaths walks kept links', () => {
    const empty = { errors: [], warns: [], infos: [] };
    for (const f of [checkMeasured, checkTraining, checkPerfect, checkEngine, checkMission]) {
      expect(f.length, f.name).toBe(2);
      expect(f(mini(), METRICS, { requireMeasured: true })).toEqual(empty);
    }
    const g = mini();
    g.spaces.push(sp('vault', 'objective', 'storage', [4, 4, 3], 2, ['objective']));
    g.links.push(ln('court', 'vault', 'door', 'loud', DOOR));
    const quiet = (l: Link): boolean => l.route !== 'loud';
    expect(perfectPaths(g, { start: 'gate', targets: ['vault', 'hut'], exfil: 'hut' })).toEqual({ unreached: [], stranded: [] });
    expect(perfectPaths(g, { start: 'gate', targets: ['vault', 'hut'], exfil: 'hut', keep: quiet }))
      .toEqual({ unreached: ['vault'], stranded: [] });
    g.links.push(ln('court', 'vault', 'drop', 'shadow', { level_change: 2 }));
    expect(perfectPaths(g, { start: 'gate', targets: ['vault'], exfil: 'hut', keep: quiet }))
      .toEqual({ unreached: [], stranded: ['vault'] });
  });
});

// validator-port S7b (docs/validator-port/PLAN.md; BRIEF A12, A27): the nav-floor WARN, ropes both ways, no ladder-grab
// read, and the long-throw exception. The metrics FIXTURE adds the two sheet rows S7a writes (`rules.nav_floor_depth_m`,
// `sizes.throw_long`) to the base metrics, so these cases hold before and after S7a's branch merges.
const S7 = (): Obj => {
  const m = structuredClone(METRICS) as Obj & { rules: Obj; sizes: Obj };
  m.rules.nav_floor_depth_m = 1.5;
  m.sizes.throw_long = {
    max: 4.9, spots: ['tallowWharf:w2-pawn-loft>w2-reading-room', 'tallowWharf:w2-arcade-roof>w3-roof'],
  };
  return m;
};
const engine = (g: Graph, m: Obj | null = S7()): Report => checkEngine(g, m, {}) as Report;
const NAV = 'nav floor';

describe('validator-port S7b: engine facts (A12)', () => {
  it('nav floor: an encounter space at storey -2 WARNs; a guarded space at -1.6 WARNs; a plain one at -2 does not', () => {
    const g = mini();
    (g.spaces[1] as Obj).storey = -2;
    expect(engine(g).warns).toEqual([
      "court: an encounter space at storey -2 m, deeper than the 1.5 m nav floor (off the guards' nav grid, level-design 12.1)",
    ]);
    const h = mini();
    Object.assign(h.spaces[3] as Obj, { storey: -1.6, guards: { 2: 1 } });
    expect(engine(h).warns).toEqual([
      "hut: a space with guards at storey -1.6 m, deeper than the 1.5 m nav floor (off the guards' nav grid, level-design 12.1)",
    ]);
    const p = mini();
    (p.spaces[3] as Obj).storey = -2;
    expect(engine(p).warns).toEqual([]);
    const zero = mini();
    Object.assign(zero.spaces[3] as Obj, { storey: -2, guards: { 2: 0 } });
    expect(engine(zero).warns).toEqual([]);
    const edge = mini();
    (edge.spaces[1] as Obj).storey = -1.5;
    expect(engine(edge).warns).toEqual([]);
  });

  it('nav floor: a missing key is one WARN and the check is skipped; nothing underground asks for no key', () => {
    const m = S7() as Obj & { rules: Obj };
    delete m.rules.nav_floor_depth_m;
    const g = mini();
    (g.spaces[1] as Obj).storey = -2;
    Object.assign(g.spaces[3] as Obj, { storey: -3, guards: { 2: 1 } });
    expect(engine(g, m).warns).toEqual(['metrics: rules.nav_floor_depth_m is missing from the metrics; the nav floor check skipped']);
    expect(engine(mini(), m)).toEqual({ errors: [], warns: [], infos: [] });
    expect(engine(g, null)).toEqual({ errors: [], warns: [], infos: [] });
    expect(has(check(g).warns, NAV)).toBe(has(engine(g, METRICS).warns, NAV));
  });

  it('a team_rope from an upper storey down to storey 0 inside the rope_span band gives no ERR (ropes go both ways)', () => {
    const g = mini();
    g.spaces.push(sp('loft', 'connector', 'corridor', [3.5, 14, 3], 2, [], { storey: 4.5 }));
    g.links.push(ln('court', 'loft', 'ladder', 'high', { level_change: 4.5, length: 10, time_s: 12 }));
    g.links.push(ln('loft', 'court', 'team_rope', 'high', { level_change: 4.5, length: 6, time_s: 8 }));
    const r = validate(g, { metrics: S7() }) as Report;
    expect(r.errors.filter((e) => e.includes('team_rope'))).toEqual([]);
    expect(engine(g)).toEqual({ errors: [], warns: [], infos: [] });
  });

  it('no validator module or test reads TEAM.ladderGrab (A12, the coop-kit seam)', () => {
    const files = ['scripts/level-checks/engine.mjs', 'scripts/level-validate.mjs', 'scripts/level-graph-lib.mjs'];
    for (const f of files) expect(fs.readFileSync(path.join(ROOT, f), 'utf8'), f).not.toMatch(/ladderGrab/);
    for (const t of ['tests/levelProfiles.test.ts', 'tests/levelValidate.test.ts']) {
      expect(fs.readFileSync(path.join(ROOT, t), 'utf8'), t).not.toMatch(/from '\.\.\/src\/config\/movement/);
    }
  });
});

describe('validator-port S7b: the long-throw exception (A27)', () => {
  /** One throw link on a map: two lofts in one section, the throw between them. */
  const throwGraph = (map: string, from: string, to: string, width: number, extra: Obj = {}): Graph => ({
    meta: { map, name: 'Throw probe', mode: 'campaign', players: [2], sections: ['S1'] },
    spaces: [
      sp(from, 'connector', 'corridor', [3.5, 14, 3], 2, ['start']),
      sp(to, 'connector', 'corridor', [3.5, 14, 3], 2, ['exfil']),
    ],
    links: [ln(from, to, 'team_throw', 'high', { width, length: 6, time_s: 4, ...extra })],
  });
  const dims = (g: Graph, m: Obj = S7()): Report => checkDimensions(g, m) as Report;
  const LONG = { exception: 'long_throw' };
  const throwErrs = (r: Report): string[] => r.errors.filter((e) => e.includes('(team_throw)'));

  it('the pawn loft to the reading room at 4.9 m with the field passes, with an INFO naming the approval', () => {
    const r = dims(throwGraph('tallowWharf', 'w2-pawn-loft', 'w2-reading-room', 4.9, LONG));
    expect(throwErrs(r)).toEqual([]);
    expect(r.infos).toContainEqual(
      "link w2-pawn-loft -> w2-reading-room (team_throw): long throw at an approved spot (tallowWharf:w2-pawn-loft>w2-reading-room, the scale sheet's Long throw row, Michael's approval), gap up to 4.9 m",
    );
    expect(throwErrs(dims(throwGraph('tallowWharf', 'w2-arcade-roof', 'w3-roof', 4.9, LONG)))).toEqual([]);
  });

  it('the plank spot (pie loft to clock loft) at 4.9 m with the field ERRs: not listed', () => {
    const r = dims(throwGraph('tallowWharf', 'w2-pie-loft', 'w2-clock-loft', 4.9, LONG));
    expect(throwErrs(r)).toEqual([
      "link w2-pie-loft -> w2-clock-loft (team_throw): not an approved long-throw spot (tallowWharf:w2-pie-loft>w2-clock-loft is not in the scale sheet's Long throw row)",
    ]);
  });

  it('the listed spot at 4.9 m without the field ERRs on the 2.7 m throw gap row', () => {
    const r = dims(throwGraph('tallowWharf', 'w2-pawn-loft', 'w2-reading-room', 4.9));
    expect(throwErrs(r)).toEqual(['link w2-pawn-loft -> w2-reading-room (team_throw): gap 4.9 m above the 2.7 m throw']);
  });

  it('the listed spot at 5.0 m with the field ERRs: over the 4.9 m long throw', () => {
    const r = dims(throwGraph('tallowWharf', 'w2-pawn-loft', 'w2-reading-room', 5, LONG));
    expect(throwErrs(r)).toEqual(['link w2-pawn-loft -> w2-reading-room (team_throw): gap 5 m above the 4.9 m long throw']);
  });

  it('the same ids on another meta.map ERR: not listed', () => {
    const r = dims(throwGraph('campusOps', 'w2-pawn-loft', 'w2-reading-room', 4.9, LONG));
    expect(throwErrs(r)).toEqual([
      "link w2-pawn-loft -> w2-reading-room (team_throw): not an approved long-throw spot (campusOps:w2-pawn-loft>w2-reading-room is not in the scale sheet's Long throw row)",
    ]);
  });

  it('another exception value ERRs; the field on another kind ERRs', () => {
    const r = dims(throwGraph('tallowWharf', 'w2-pawn-loft', 'w2-reading-room', 2, { exception: 'long_jump' }));
    expect(throwErrs(r)).toEqual([
      "link w2-pawn-loft -> w2-reading-room (team_throw): exception 'long_jump' unknown (a team_throw takes only \"long_throw\")",
    ]);
    const g = throwGraph('tallowWharf', 'w2-pawn-loft', 'w2-reading-room', 2);
    g.links.push(ln('w2-pawn-loft', 'w2-reading-room', 'door', 'shadow', { ...DOOR, length: 6, exception: 'long_throw' }));
    expect(engine(g).errors).toEqual([
      "link w2-pawn-loft -> w2-reading-room (door): exception 'long_throw' on a door (only a team_throw takes an exception, A27)",
    ]);
    expect(has((validate(g, { metrics: S7() }) as Report).errors, 'only a team_throw takes an exception')).toBe(true);
    expect(engine(throwGraph('tallowWharf', 'w2-pawn-loft', 'w2-reading-room', 4.9, LONG)).errors).toEqual([]);
  });

  it('a missing sizes.throw_long is one WARN and the link falls back to the 2.7 m row', () => {
    const m = S7() as Obj & { sizes: Obj };
    delete m.sizes.throw_long;
    const g = throwGraph('tallowWharf', 'w2-pawn-loft', 'w2-reading-room', 4.9, LONG);
    g.links.push(ln('w2-reading-room', 'w2-pawn-loft', 'team_throw', 'high', { width: 4.9, length: 6, time_s: 4, ...LONG }));
    const r = dims(g, m);
    expect(r.warns.filter((w) => w.includes('throw_long'))).toEqual([
      'metrics: sizes.throw_long is missing from the metrics; the long-throw check (falls back to the throw gap row) skipped',
    ]);
    expect(throwErrs(r)).toEqual([
      'link w2-pawn-loft -> w2-reading-room (team_throw): gap 4.9 m above the 2.7 m throw',
      'link w2-reading-room -> w2-pawn-loft (team_throw): gap 4.9 m above the 2.7 m throw',
    ]);
    const bad = S7() as Obj & { sizes: Obj };
    bad.sizes.throw_long = { max: '4.9', spots: [] };
    const b = dims(throwGraph('tallowWharf', 'w2-pawn-loft', 'w2-reading-room', 4.9, LONG), bad);
    expect(has(b.warns, 'sizes.throw_long is not { max, spots }')).toBe(true);
    expect(throwErrs(b)).toEqual(['link w2-pawn-loft -> w2-reading-room (team_throw): gap 4.9 m above the 2.7 m throw']);
  });
});
