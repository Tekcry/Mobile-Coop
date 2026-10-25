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
    // the example has no measured values yet: 2 encounter spaces, split hall, 5 campaign way backs (S3, BRIEF A5)
    expect(run([example, '--require-measured'], { log: (s: string) => { lines.push(s); }, root: ROOT })).toBe(1);
    expect(lines.filter((s) => s.startsWith('ERROR:'))).toHaveLength(8);
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
    expect(checkMeasured.length).toBe(2);
    for (const f of [checkTraining, checkPerfect, checkEngine, checkMission]) {
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
