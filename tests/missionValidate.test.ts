import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
// @ts-expect-error plain .mjs process script without types
import { checkMission } from '../scripts/mission-validate.mjs';
// @ts-expect-error plain .mjs process script without types
import { mergeGraphs, validate } from '../scripts/level-validate.mjs';

// mission-framework VAL: the mission checks (docs/level-validator/mission-schema.md) against docs/design/metrics.json.
// One pass and one fail fixture per check; the campaign fixture is docs/level-validator/example.mission.json, the
// Sector Ops fixture is the same map run as a two-team op with sync nodes.
const ROOT = path.resolve(__dirname, '..');

interface Report { errors: string[]; warns: string[]; infos: string[] }
type Obj = Record<string, unknown>;
interface Space extends Obj { id: string; section: string; tags: string[] }
interface Link extends Obj { from: string; to: string; kind: string; route: string }
interface Objective extends Obj { id: string; section: string; space: string; team: string; kind: string; minutes: number; after?: string[] }
interface Rule extends Obj { kind: string; scope: string; text?: string }
interface Sync extends Obj { id: string; kind: string; space: string; src?: string; lead?: string; solo?: number | string }
interface Mission extends Obj { id: string; mode: string; players: number[]; start?: string; budget?: number }
interface Graph {
  meta: { map: string; name: string; mode: string; players: number[]; sections: string[] };
  spaces: Space[]; links: Link[]; mission?: Mission | Mission[]; objectives?: Objective[]; rules?: Rule[]; syncs?: Sync[];
}
type Metrics = Record<string, unknown> & { rules: Record<string, unknown> };

const METRICS = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/design/metrics.json'), 'utf8')) as Metrics;
const EXAMPLE = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/level-validator/example.mission.json'), 'utf8')) as Graph;

const campaign = (): Graph => structuredClone(EXAMPLE);
/** The example map as a Sector Ops op for 1-4 players: no bolts (one player completes it), team a on the high track
 *  (awning, loft), team b on the ground (office, strongroom), five sync nodes, a rule per team. */
const sector = (): Graph => {
  const g = campaign();
  g.meta.mode = 'sector';
  g.meta.players = [1, 2, 3, 4];
  for (const l of g.links) delete l.bolted;
  g.mission = { id: 'exampleSplit', mode: 'sector', players: [1, 2, 3, 4], start: 's1-quay', budget: 12 };
  g.objectives = [
    { id: 'a-lamps', section: 'S1', space: 's1-awning', team: 'a', kind: 'interact', lead: 's1-quay', seen_from: 's1-market', minutes: 4 },
    { id: 'a-stash', section: 'S1', space: 's1-awning', team: 'a', kind: 'interact', lead: 's1-quay', seen_from: 's1-market', minutes: 2, optional: { reward: 'gadget' } },
    { id: 'b-code', section: 'S1', space: 's1-office', team: 'b', kind: 'intel', gives: 'code', lead: 's1-quay', seen_from: 's1-market', minutes: 4 },
    { id: 'a-cams', section: 'S2', space: 's2-loft', team: 'a', kind: 'sync', after: ['a-lamps'], twist: true, lead: 's2-arcade', seen_from: 's2-strong', minutes: 4 },
    { id: 'b-vault', section: 'S2', space: 's2-strong', team: 'b', kind: 'exploit', needs: 'code', after: ['b-code'], lead: 's2-arcade', seen_from: 's2-loft', minutes: 4 },
    { id: 'out', section: 'S2', space: 's2-yard', team: 'all', kind: 'extract', after: ['a-cams', 'b-vault'], minutes: 2 },
  ];
  g.rules = [
    { kind: 'noKills', scope: 'a', text: 'Team A: no kills' },
    { kind: 'ghost', scope: 'b', text: 'Team B: nobody sees you' },
  ];
  g.syncs = [
    { id: 'sync-s1-lamps', kind: 'power_cut', space: 's1-awning', src: 'planned', lead: 's1-quay' },
    { id: 'sync-s1-door', kind: 'pair_door', space: 's1-office', src: 'planned', lead: 's1-market', solo: 20 },
    { id: 'sync-s2-cams', kind: 'camera_loop', space: 's2-loft', src: 'planned', lead: 's2-arcade' },
    { id: 'sync-s2-clerk', kind: 'code_source', space: 's2-arcade', src: 'planned', lead: 's2-arcade' },
    { id: 'sync-s2-keypad', kind: 'code_sink', space: 's2-strong', src: 'planned', lead: 's2-loft' },
  ];
  return g;
};

const obj = (g: Graph, id: string): Objective => {
  const o = g.objectives?.find((x) => x.id === id);
  if (!o) throw new Error(`no objective ${id}`);
  return o;
};
const lnk = (g: Graph, from: string, to: string, kind: string): Link => {
  const l = g.links.find((x) => x.from === from && x.to === to && x.kind === kind);
  if (!l) throw new Error(`no link ${from} -> ${to} ${kind}`);
  return l;
};
const mis = (g: Graph): Mission => g.mission as Mission;
const full = (g: Graph, metrics: unknown = METRICS): Report => validate(g, { metrics }) as Report;
const mc = (g: Graph, metrics: unknown = METRICS): Report => checkMission(g, metrics) as Report;
const expectErr = (r: Report, ...frags: string[]): void => {
  for (const f of frags) expect(r.errors, `no ERROR containing "${f}"`).toContainEqual(expect.stringContaining(f));
};
const expectWarn = (r: Report, ...frags: string[]): void => {
  for (const f of frags) expect(r.warns, `no WARN containing "${f}"`).toContainEqual(expect.stringContaining(f));
};
const noErr = (r: Report, frag: string): void => {
  expect(r.errors.filter((e) => e.includes(frag))).toEqual([]);
};

describe('mission-validate: passing fixtures', () => {
  it('docs/level-validator/example.mission.json passes the whole validator with 0 errors and 0 warnings', () => {
    const r = full(campaign());
    expect(r.errors).toEqual([]);
    expect(r.warns).toEqual([]);
    expect(r.infos.filter((i) => !i.includes('pending V6'))).toEqual([]);
  });

  it('the Sector Ops fixture passes with 0 errors and 0 warnings; the solo run is an INFO', () => {
    const r = full(sector());
    expect(r.errors).toEqual([]);
    expect(r.warns).toEqual([]);
    expect(r.infos).toContainEqual('mission exampleSplit: a solo player runs all 6 steps, 20 min planned');
  });

  it('no mission node: no mission output (the map-only example and the five campus graphs are unchanged)', () => {
    const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/level-validator/example.graph.json'), 'utf8')) as Graph;
    expect(mc(map)).toEqual({ errors: [], warns: [], infos: [] });
    const campus = [1, 2, 3, 4, 5].map((n) => JSON.parse(fs.readFileSync(path.join(ROOT, `docs/sector-redesign/graph/campusOps-S${n}.json`), 'utf8')) as Graph);
    expect(mc(mergeGraphs(campus) as Graph)).toEqual({ errors: [], warns: [], infos: [] });
  });

  it('CLI: the example mission with the spawned node exits 0 with 0 errors and 0 warnings', () => {
    const file = path.join(ROOT, 'docs/level-validator/example.mission.json');
    const ok = spawnSync(process.execPath, [path.join(ROOT, 'scripts/level-validate.mjs'), file], { cwd: ROOT, encoding: 'utf8', timeout: 30000 });
    expect(ok.status).toBe(0);
    expect(ok.stdout.trim().split(/\r?\n/).pop()).toBe('0 error(s), 0 warning(s).');
  });

  it('a mission file merged with its map files: objectives / rules / syncs concatenate, one mission node', () => {
    const g = sector();
    const mapPart = { meta: g.meta, spaces: g.spaces, links: g.links, syncs: g.syncs?.slice(0, 2) };
    const missionPart = { meta: g.meta, spaces: [], links: [], mission: g.mission, objectives: g.objectives, rules: g.rules, syncs: g.syncs?.slice(2) };
    const merged = mergeGraphs([mapPart, missionPart]) as Graph;
    expect(merged.syncs).toEqual(g.syncs);
    expect(merged.mission).toEqual(g.mission);
    expect(full(merged).errors).toEqual([]);
  });
});

describe('mission-validate: fields and structure', () => {
  it('two mission nodes in one run', () => {
    const g = campaign();
    const merged = mergeGraphs([g, { meta: g.meta, spaces: [], links: [], mission: { ...mis(g), id: 'other' } }]) as Graph;
    expectErr(mc(merged), 'mission: 2 mission nodes in one run');
  });

  it('objectives and rules without a mission node; syncs alone are layout data (field checks only)', () => {
    const g = campaign();
    delete g.mission;
    expectErr(mc(g), 'objectives: given without a mission node', 'rules: given without a mission node');
    const s = sector();
    delete s.mission;
    delete s.objectives;
    delete s.rules;
    expect(mc(s)).toEqual({ errors: [], warns: [], infos: [] });
  });

  it('mission fields: mode, mode vs meta.mode, players, start, budget', () => {
    const g = campaign();
    Object.assign(mis(g), { mode: 'arena', players: [1, 2], start: 'nowhere' });
    delete mis(g).budget;
    expectErr(mc(g), "mission exampleLedger: mode 'arena' is not campaign or sector", "start 'nowhere' is not a space", 'budget missing');
    const h = campaign();
    mis(h).mode = 'sector';
    expectErr(mc(h), "mode 'sector' differs from the map's meta.mode 'campaign'");
    const p = campaign();
    mis(p).players = [1, 2];
    expectErr(mc(p), 'a campaign mission is two players, [2]');
    const q = sector();
    mis(q).players = [2, 5];
    expectErr(mc(q), 'Sector Ops is 1-4 players');
    const w = sector();
    w.meta.players = [2];
    expectWarn(mc(w), 'players 1, 3, 4 not in meta.players [2]');
  });

  it('a training map carries no mission (M1)', () => {
    const g = campaign();
    g.meta.mode = 'training';
    expectErr(mc(g), 'a training map carries no mission (M1');
  });

  it('objective fields: id, section, space, team, kind, after, minutes, new_mechanic, twist, optional', () => {
    const g = campaign();
    Object.assign(obj(g, 'page'), { space: 's2-loft', team: 'a', kind: 'steal', new_mechanic: 3, twist: 'yes', optional: { reward: 'cash' } });
    Object.assign(obj(g, 'stash'), { section: 'S9' });
    delete (obj(g, 'clerk') as Obj).minutes;
    g.objectives?.push({ ...obj(g, 'out') });
    expectErr(mc(g),
      "objective page: space 's2-loft' is in S2, not S1",
      "objective page: a campaign mission moves as one team (team 'all', M3), not 'a'",
      "objective page: kind 'steal' is not",
      'objective page: new_mechanic must name the mechanic',
      'objective page: twist must be true or false',
      'objective page: optional must be { "reward": gadget | syringe | medkit }',
      "objective stash: section 'S9' is not in meta.sections",
      'objective clerk: minutes missing',
      'objective out: duplicate objective id');
  });

  it('rule fields: kind, scope (campaign: mission only), text, window seconds', () => {
    const g = campaign();
    g.rules = [
      { kind: 'pacifist', scope: 'mission', text: 'x' },
      { kind: 'noAlarms', scope: 'a', text: 'x' },
      { kind: 'noBodies', scope: 'mission' },
      { kind: 'window', scope: 'mission', text: 'Thirty seconds' },
    ];
    expectErr(mc(g), "rule 1 (pacifist): kind 'pacifist' is not", "rule 2 (noAlarms): a campaign rule has scope 'mission'",
      'rule 3 (noBodies): text missing', 'rule 4 (window): a window rule needs seconds');
  });
});

describe('mission-validate: steps (DAG, extraction, intel -> exploit, twist, optional, new mechanic)', () => {
  it('after: unknown step, itself, a cycle', () => {
    const g = campaign();
    obj(g, 'page').after = ['nope'];
    expectErr(mc(g), "objective page: after 'nope' is not an objective");
    const h = campaign();
    obj(h, 'page').after = ['clerk'];
    expectErr(mc(h), 'mission exampleLedger: steps form a cycle (');
  });

  it('extraction: none, two, optional, not the last step; a WARN when its space is not tagged exfil', () => {
    const g = campaign();
    obj(g, 'out').kind = 'reach';
    expectErr(mc(g), 'no extract step');
    const h = campaign();
    obj(h, 'clerk').kind = 'extract';
    expectErr(mc(h), '2 extract steps (clerk, out)');
    const k = campaign();
    obj(k, 'out').after = ['strongroom'];
    expectErr(mc(k), 'objective out: the extraction is not after clerk');
    const o = campaign();
    Object.assign(obj(o, 'out'), { optional: { reward: 'medkit' } });
    expectErr(mc(o), 'objective out: the extraction cannot be optional');
    const x = campaign();
    obj(x, 'out').space = 's2-strong';
    expectWarn(mc(x), "objective out: extraction space 's2-strong' is not tagged exfil");
  });

  it('intel -> exploit: a need with no giver, a giver not before it, no pair at all', () => {
    const g = campaign();
    obj(g, 'strongroom').needs = 'keys';
    expectErr(mc(g), "objective strongroom: needs 'keys' but no step gives it", 'no intel -> exploit pair');
    const h = campaign();
    obj(h, 'strongroom').after = [];
    obj(h, 'clerk').after = ['strongroom', 'page'];
    expectErr(mc(h), "objective strongroom: needs 'strongroom-code' from page, which is not before it");
  });

  it('twist: none is an ERR, two a WARN; optional: none is an ERR, two a WARN; two new mechanics in a step', () => {
    const g = campaign();
    delete obj(g, 'clerk').twist;
    delete obj(g, 'stash').optional;
    obj(g, 'page').new_mechanic = ['coop_boost', 'shutter'];
    expectErr(mc(g), 'mission exampleLedger: no twist step', 'no optional objective', 'objective page: 2 new mechanics (coop_boost, shutter)');
    const h = campaign();
    obj(h, 'page').twist = true;
    obj(h, 'clerk').optional = { reward: 'gadget' };
    const r = mc(h);
    expectWarn(r, '2 twist steps (page, clerk)', '2 optional objectives (stash, clerk)');
  });
});

describe('mission-validate: step budget (metrics rules.mission_*)', () => {
  it('steps per track outside 3-6', () => {
    const g = campaign();
    const extra = (n: number): Objective => ({ id: `x${n}`, section: 'S2', space: 's2-loft', team: 'all', kind: 'reach', after: ['page'], lead: 's2-arcade', seen_from: 's2-arcade', minutes: 2 });
    g.objectives?.push(extra(1), extra(2));
    obj(g, 'out').after = ['clerk', 'x1', 'x2'];
    expectErr(mc(g), 'mission exampleLedger: 7 steps, outside 3-6');
    const m = structuredClone(METRICS);
    m.rules.mission_steps = [3, 8];
    m.rules.mission_total_min = [10, 40];
    noErr(mc(g, m), 'steps, outside');
  });

  it('a step outside 2-5 min; required steps under 10 min; every step over 30 min', () => {
    const g = campaign();
    obj(g, 'strongroom').minutes = 6;
    expectErr(mc(g), 'objective strongroom: 6 min outside the 2-5 min step');
    const h = campaign();
    for (const o of h.objectives ?? []) o.minutes = 2;
    expectErr(mc(h), 'mission exampleLedger: required steps 8 min, under 10 min');
    const m = structuredClone(METRICS);
    m.rules.mission_total_min = [10, 13];
    expectErr(mc(campaign(), m), 'mission exampleLedger: every step 14 min, over 13 min');
  });

  it('budget outside 10-30 min is an ERR; a budget off the steps is a WARN', () => {
    const g = campaign();
    mis(g).budget = 35;
    expectErr(mc(g), 'mission exampleLedger: budget 35 min outside 10-30 min');
    mis(g).budget = 20;
    expectWarn(mc(g), 'mission exampleLedger: budget 20 min, but the steps add up to 12-14 min');
  });

  it('Sector Ops counts each team track (its steps plus the shared ones)', () => {
    const g = sector();
    g.objectives = g.objectives?.filter((o) => o.id !== 'b-code');
    delete obj(g, 'b-vault').needs;
    obj(g, 'b-vault').after = [];
    obj(g, 'a-lamps').gives = 'code';
    obj(g, 'a-cams').needs = 'code';
    const r = mc(g);
    expectErr(r, 'mission exampleSplit (team b): 2 steps, outside 3-6', 'mission exampleSplit (team b): required steps 6 min, under 10 min');
    noErr(r, '(team a)');
  });

  it('Sector Ops: parallel team steps count once per team; the solo sum past 30 min is an INFO, not an ERR (lead note)', () => {
    const g = sector();
    for (const id of ['a-lamps', 'b-code', 'a-cams', 'b-vault']) obj(g, id).minutes = 5;
    obj(g, 'a-stash').minutes = 5;
    obj(g, 'out').minutes = 5;
    // team a 5 + 5 + 5 (+ 5 optional) = 15-20 min, team b 15 min, both within 10-25; the solo player runs all six, 30 min
    mis(g).budget = 20;
    const m = structuredClone(METRICS);
    m.rules.mission_total_min = [10, 25];
    const r = mc(g, m);
    expect(r.errors).toEqual([]);
    expect(r.warns).toEqual([]);
    expect(r.infos).toContainEqual('mission exampleSplit: a solo player runs all 6 steps, 30 min planned (over 25 min: allowed solo)');
  });

  it('a missing metrics key: one WARN, that check skipped', () => {
    const m = structuredClone(METRICS);
    delete m.rules.mission_steps;
    const g = campaign();
    g.objectives = g.objectives?.filter((o) => o.id !== 'stash');
    obj(g, 'clerk').optional = { reward: 'syringe' };
    obj(g, 'strongroom').twist = true;
    delete obj(g, 'clerk').twist;
    const r = mc(g, m);
    expect(r.warns.filter((w) => w.includes('rules.mission_steps'))).toHaveLength(1);
    noErr(r, 'steps, outside');
  });
});

describe('mission-validate: rules (metrics rules.mission_rules_max)', () => {
  it('three rules for one team; the same rule twice', () => {
    const g = campaign();
    g.rules?.push({ kind: 'noAlarms', scope: 'mission', text: 'No alarms' });
    expectErr(mc(g), 'mission exampleLedger: 3 rules for mission (ghost, noKills, noAlarms); at most 2');
    const h = campaign();
    h.rules = [{ kind: 'ghost', scope: 'mission', text: 'a' }, { kind: 'ghost', scope: 'mission', text: 'b' }];
    expectErr(mc(h), 'rule ghost given twice for mission');
  });

  it('Sector Ops: mission scope counts for both teams; a solo player carrying 3+ rules is a WARN', () => {
    const g = sector();
    g.rules?.push({ kind: 'noAlarms', scope: 'mission', text: 'No alarms' }, { kind: 'noGadgets', scope: 'b', text: 'No gadgets' });
    const r = mc(g);
    expectErr(r, 'mission exampleSplit: 3 rules for team b (ghost, noAlarms, noGadgets); at most 2');
    noErr(r, 'rules for team a');
    expectWarn(r, 'a solo player carries 4 rules');
  });

  it('a named target names an interrogate step; oneChance is an INFO; plantNotTake with no plant step a WARN', () => {
    const g = campaign();
    g.rules = [{ kind: 'namedTarget', scope: 'mission', text: 'Only the clerk', step: 'clerk' }, { kind: 'oneChance', scope: 'mission', text: 'One chance' }];
    const r = mc(g);
    expectErr(r, 'rule 1 (namedTarget): step must name an interrogate objective');
    expect(r.infos).toContainEqual(expect.stringContaining('rule 2 (oneChance): opt-in only'));
    obj(g, 'clerk').kind = 'interrogate';
    noErr(mc(g), 'namedTarget');
    g.rules = [{ kind: 'plantNotTake', scope: 'mission', text: 'Leave it' }];
    expectWarn(mc(g), 'rule 1 (plantNotTake): no plant step');
  });
});

describe('mission-validate: leads and goals seen before reach', () => {
  it('lead and seen_from: missing, unknown, the objective space itself, only past the objective', () => {
    const g = campaign();
    delete obj(g, 'page').lead;
    obj(g, 'page').seen_from = 'nowhere';
    obj(g, 'strongroom').lead = 's2-strong';
    // the yard is reached only through the strongroom
    obj(g, 'strongroom').seen_from = 's2-yard';
    expectErr(mc(g),
      'objective page: lead missing (the space of its in-world lead)',
      "objective page: seen_from 'nowhere' is not a space",
      "objective strongroom: lead is the objective's own space",
      "objective strongroom: seen_from 's2-yard' is not reachable from s1-quay before s2-strong");
  });

  it('the extraction needs neither', () => {
    const g = campaign();
    expect(obj(g, 'out').lead).toBeUndefined();
    expect(mc(g).errors).toEqual([]);
  });
});

describe('mission-validate: ghost and pacifist runs', () => {
  it('ghost: an objective reached only over a loud link', () => {
    const g = campaign();
    lnk(g, 's2-arcade', 's2-strong', 'opening').route = 'loud';
    lnk(g, 's2-arcade', 's2-strong', 'duct').route = 'loud';
    lnk(g, 's2-loft', 's2-strong', 'drop').route = 'loud';
    expectErr(mc(g), 'ghost run: objective strongroom (s2-strong) is not reachable from s1-quay without a \'loud\' link');
  });

  it('ghost: no way on to the extraction without a loud link', () => {
    const g = campaign();
    lnk(g, 's2-strong', 's2-yard', 'shutter').route = 'loud';
    expectErr(mc(g), "ghost run: no way from objective strongroom (s2-strong) to the extraction s2-yard without a 'loud' link");
  });

  it('pacifist: a requires_kill link on the only way', () => {
    const g = campaign();
    lnk(g, 's1-office', 's2-arcade', 'corridor').requires_kill = true;
    const r = mc(g);
    expectErr(r, 'pacifist run: objective strongroom (s2-strong) is not reachable from s1-quay without a requires_kill link');
    noErr(r, 'ghost run');
  });
});

describe('mission-validate: sections (choke node, forced co-op M3)', () => {
  it('choke node: a section with a way around every space and link is a WARN', () => {
    const g = campaign();
    expect(mc(g).warns).toEqual([]);
    g.links.push({ from: 's2-arcade', to: 's2-yard', kind: 'door', route: 'shadow', width: 1.2, height: 2.1, length: 20, bolted: true });
    expectWarn(mc(g), "section S2: no choke node (no space or link that every route from 's2-arcade' to 's2-yard' passes)");
  });

  it('forced co-op: a campaign section one player crosses alone is an ERR; a bolted door is opened only from its far side', () => {
    const g = campaign();
    delete lnk(g, 's1-market', 's1-office', 'door').bolted;
    expectErr(mc(g), "section S1: one player gets from 's1-quay' to 's1-office' with no co-op move (M3");
    noErr(mc(g), 'section S2: one player');
    // The same door bolted on the near side (from the market) is a solo way through.
    const h = campaign();
    const d = lnk(h, 's1-market', 's1-office', 'door');
    Object.assign(d, { from: 's1-office', to: 's1-market' });
    expectErr(mc(h), 'section S1: one player gets from');
  });

  it('forced co-op is a campaign rule: Sector Ops sections are not judged', () => {
    const r = mc(sector());
    noErr(r, 'one player gets from');
  });
});

describe('mission-validate: Sector Ops (parallel objectives, syncs, solo)', () => {
  it('parallel objectives: team b waits on team a at every step', () => {
    const g = sector();
    obj(g, 'b-code').after = ['a-cams'];
    expectErr(mc(g), 'mission exampleSplit: 0 parallel objectives');
    const m = structuredClone(METRICS);
    m.rules.sector_parallel_min = 0;
    noErr(mc(g, m), 'parallel objectives');
  });

  it('sync nodes: fewer than 2 in the op is an ERR, fewer than 2 in a section a WARN', () => {
    const g = sector();
    g.syncs = g.syncs?.filter((s) => s.id === 'sync-s2-cams');
    const r = mc(g);
    expectErr(r, 'mission exampleSplit: 1 sync nodes in its sections; need 2+');
    expectWarn(r, 'section S1: 0 sync nodes (A16: 2+ per section)', 'section S2: 1 sync nodes');
  });

  it('a pair sync with no solo fallback; a code sink with no source; a sync step with no node', () => {
    const g = sector();
    g.syncs = g.syncs?.filter((s) => s.id !== 'sync-s2-clerk');
    for (const s of g.syncs ?? []) if (s.kind === 'pair_door') delete s.solo;
    obj(g, 'a-cams').space = 's2-arcade';
    obj(g, 'a-cams').seen_from = 's2-loft';
    expectErr(mc(g), 'sync sync-s1-door: a pair sync needs solo', 'sync sync-s2-keypad: code sink with no code_source in S2',
      "objective a-cams: a sync step with no sync node in 's2-arcade'");
  });

  it('solo: an objective behind a co-op move or a near-side bolt is an ERR; a pair gate at a pair sync with solo passes', () => {
    const g = sector();
    lnk(g, 's1-market', 's1-office', 'door').bolted = true;
    expectErr(mc(g), 'solo: objective b-code (s1-office) is not reachable by one player from s1-quay');
    const h = sector();
    lnk(h, 's1-market', 's1-office', 'door').kind = 'pair_gate';
    noErr(mc(h), 'solo:');
    for (const s of h.syncs ?? []) if (s.kind === 'pair_door') s.space = 's1-market';
    noErr(mc(h), 'solo:');
    h.syncs = h.syncs?.filter((s) => s.kind !== 'pair_door');
    expectErr(mc(h), 'solo: objective b-code (s1-office) is not reachable by one player');
    // A 2-4 player op has no solo run.
    mis(h).players = [2, 3, 4];
    noErr(mc(h), 'solo:');
  });

  it('sync fields (A16): id, kind, space, src, lead, solo; a section number off the id is a WARN', () => {
    const g = sector();
    g.syncs?.push(
      { id: 'sync-2-x', kind: 'power_cut', space: 's2-loft', src: 'planned', lead: 's2-arcade' },
      { id: 'sync-s2-cams', kind: 'camera_loop', space: 's2-loft', src: 'planned', lead: 's2-arcade' },
      { id: 'sync-s2-y', kind: 'laser_off', space: 'nowhere', src: '', lead: 'nowhere', solo: -1 },
      { id: 'sync-s1-z', kind: 'power_cut', space: 's2-loft', src: 'planned' },
    );
    const r = mc(g);
    expectErr(r, "sync sync-2-x: id 'sync-2-x' is not sync-s<N>-<name>", 'sync sync-s2-cams: duplicate sync id',
      "sync sync-s2-y: kind 'laser_off' is not", "sync sync-s2-y: space 'nowhere' is not a space", 'sync sync-s2-y: src missing',
      "sync sync-s2-y: lead 'nowhere' is not a space", 'sync sync-s2-y: solo must be', 'sync sync-s1-z: lead missing');
    expectWarn(r, "sync sync-s1-z: id names section 1 but its space 's2-loft' is in S2");
  });
});
