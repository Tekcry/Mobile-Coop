import { describe, expect, it } from 'vitest';
import { checkMission, type MissionDef, type MissionEvent, type MissionRule } from '../../src/game/mission/missionDef';
import { RULE_HOLD, TEAM_A_BIT, TEAM_B_BIT, TEAM_BOTH } from '../../src/game/mission/ruleTracker';
import {
  MISSION_FAILED_TITLE,
  RULE_BROKEN_TITLE,
  SectorMission,
  parseGuardId,
  pickMission,
  sectorGuardId,
  sectorGuardIds,
  type MissionGuard,
  type SectorMissionHost,
} from '../../src/game/mission/sectorMission';
import { SectorMode } from '../../src/game/modes/sectorMode';
import type { SectorDef, SectorPhase } from '../../src/game/sectors';
import { CAMPUS_SECTORS } from '../../src/world/maps/campusSectors';
import { CAMPUS_MISSION_TEST } from '../../src/world/maps/campusMissionTest';

// (mission-framework EN2) the Sector Ops adapter over a fake mode: lifecycle, the exit gate, a rule break's restart (whole
// and per team), spook across a restart, per-area alarm stages with the height band, Guard AI events, no blips

interface FakeGuard {
  id: string;
  alive: boolean;
  alerted: boolean;
  passive: boolean;
  zone?: string;
  ko: boolean;
}

let guardSeq = 0;
const guard = (zone?: string): FakeGuard => ({ id: `e${++guardSeq}`, alive: true, alerted: false, passive: false, zone, ko: false });

function sec(id: string, guards: number, extra: Partial<SectorDef> = {}): SectorDef {
  return { id, guards: Array.from({ length: guards }, () => ({ kind: 'grunt', x: 0, z: 0, yaw: 0, takedownSpot: [0, 0] })), ...extra } as unknown as SectorDef;
}

/** A fake SectorMode: SectorRun's index and phase, codes, guards; a restart respawns the guards and drops the codes. */
class FakeHost implements SectorMissionHost {
  idx = 0;
  ph: SectorPhase = 'objective';
  cyc = false;
  n = 1;
  det = 0;
  readonly codes = new Set<string>();
  readonly keys: boolean[][];
  slots: FakeGuard[] = [];
  readonly log: string[] = [];
  readonly emitted: MissionEvent[] = [];
  readonly restarts: ('a' | 'b' | undefined)[] = [];
  readonly regranted: string[] = [];
  bolts: { k: number; at: readonly number[] }[] = [];
  m!: SectorMission;

  constructor(readonly defs: SectorDef[]) {
    this.keys = defs.map((d) => (d.keypads ?? []).map(() => false));
    this.spawn();
  }

  spawn(): void {
    this.slots = this.defs[this.idx]!.guards.map((g) => guard((g as { zone?: string }).zone));
  }

  /** The mode's section begin (start, a connector seal). */
  enter(i: number): void {
    this.idx = i;
    this.ph = 'objective';
    this.spawn();
    this.m.begin(i);
  }

  index(): number {
    return this.idx;
  }
  phase(): SectorPhase {
    return this.ph;
  }
  cycling(): boolean {
    return this.cyc;
  }
  players(): number {
    return this.n;
  }
  slotOf(id: string): number {
    return id === 'local' || id === '' ? 0 : Number(id.slice(1));
  }
  detections(): number {
    return this.det;
  }
  guards(): readonly FakeGuard[] {
    return this.slots;
  }
  slotGuard(k: number): MissionGuard | null {
    return this.slots[k] ?? null;
  }
  hasCode(flag: string): boolean {
    return this.codes.has(flag);
  }
  keypadOpen(sec: number, k: number): boolean {
    return this.keys[sec]?.[k] === true;
  }
  gateOpen(): boolean {
    return false;
  }
  boltOpen(): boolean {
    return false;
  }
  regrant(flag: string): void {
    this.regranted.push(flag);
    this.codes.add(flag);
  }
  openExit(): void {
    // the mode's objectiveDone: the gate first, then the connector (or the extraction in the last section)
    if (this.m.gate()) return;
    this.log.push('exit');
    this.ph = this.idx === this.defs.length - 1 ? 'extract' : 'connector';
  }
  /** The objective's item used (its onUse -> objectiveDone). */
  useObjective(): void {
    this.openExit();
  }
  restart(team?: 'a' | 'b'): void {
    // SectorMode.restartSection: the world restarts whole (guards, the section's codes and keypads), then the hooks
    this.restarts.push(team);
    this.ph = 'objective';
    this.codes.clear();
    for (const row of this.keys) row.fill(false);
    this.spawn();
    this.m.restarted(team);
    this.m.begin(this.idx);
  }
  finish(): void {
    this.log.push('finish');
    this.m.extracted();
  }
  fail(line: string): void {
    this.log.push(`fail ${line}`);
  }
  say(line: string): void {
    this.log.push(`say ${line}`);
  }
  banner(title: string): void {
    this.log.push(`banner ${title}`);
  }
  bolt(k: number, at: readonly [number, number, number]): MissionGuard {
    const g = guard();
    this.slots[k] = g;
    this.bolts.push({ k, at });
    return g;
  }
  emit(ev: MissionEvent): void {
    this.emitted.push(ev);
  }
}

function make(def: MissionDef, defs: SectorDef[], players = 1): FakeHost {
  const h = new FakeHost(defs);
  h.n = players;
  h.m = new SectorMission(def, h);
  h.m.begin(0);
  return h;
}

/** Run the adapter's tick for `s` seconds in 0.1 s steps. */
function run(h: FakeHost, s: number): void {
  for (let t = 0; t < s - 1e-9; t += 0.1) h.m.tick(0.1);
}

const noKills: MissionRule = { kind: 'noKills', scope: 'mission', text: 'Kill nobody.' };

function twoSections(rules: MissionRule[] = [noKills]): MissionDef {
  return {
    id: 'op',
    mode: 'sector',
    players: [1, 2, 3, 4],
    sections: ['s1', 's2'],
    briefing: [],
    steps: [
      { id: 'read', section: 's1', team: 'all', kind: 'intel', text: 'Read the board', gives: 'code1', events: [{ name: 'boardRead', guardTag: 'gate', postId: 'gate-post' }] },
      { id: 'door', section: 's1', team: 'all', kind: 'exploit', text: 'Open the keypad door', needs: 'code1', done: { flag: 's1-key0' } },
      { id: 'out', section: 's2', team: 'all', kind: 'extract', text: 'Out' },
    ],
    rules,
  };
}

const DEFS = (): SectorDef[] => [sec('s1', 3, { keypads: [{ at: [0, 0], code: 'code1' }], intel: [{ kind: 'board', grants: 'code1', line: 'x', at: [0, 0, 0] }] }), sec('s2', 2)];

describe('SectorMission helpers', () => {
  it('guard ids are <section>:<index>; parse, list, pick', () => {
    const defs = DEFS();
    expect(sectorGuardId('s1', 2)).toBe('s1:2');
    expect([...sectorGuardIds(defs)]).toEqual(['s1:0', 's1:1', 's1:2', 's2:0', 's2:1']);
    expect(parseGuardId(defs, 's2:1')).toEqual({ sec: 1, k: 1 });
    expect(parseGuardId(defs, 's2:5')).toBeNull();
    expect(parseGuardId(defs, 'nope')).toBeNull();
    expect(pickMission([twoSections()], 'op')?.id).toBe('op');
    expect(pickMission([twoSections()], null)).toBeNull();
    expect(pickMission(undefined, 'op')).toBeNull();
  });

  it('the campus test mission passes checkMission on the real sectors (3 steps, one rule, intel -> exploit, extraction)', () => {
    expect(checkMission(CAMPUS_MISSION_TEST, sectorGuardIds(CAMPUS_SECTORS))).toEqual([]);
    const kinds = CAMPUS_MISSION_TEST.steps.map((s) => s.kind);
    expect(kinds).toEqual(['intel', 'exploit', 'extract']);
    expect(CAMPUS_MISSION_TEST.rules.length).toBe(1);
  });
});

describe('SectorMission (adapter over the mode)', () => {
  it('a section begin snapshots; flags from codes and keypads do the steps; the exit waits for the steps; extraction', () => {
    const h = make(twoSections(), DEFS());
    const m = h.m;
    expect(m.runner.section).toBe(0);
    expect(m.runner.isOpen(0)).toBe(true);
    // the objective used early: held (`s1-obj` set), the exit stays shut
    h.useObjective();
    expect(h.log).not.toContain('exit');
    h.codes.add('code1');
    run(h, 0.2);
    expect(m.runner.isDone(0)).toBe(true);
    expect(m.runner.isOpen(1)).toBe(true);
    expect(h.emitted).toEqual([{ name: 'boardRead', guardTag: 'gate', postId: 'gate-post' }]);
    h.keys[0]![0] = true;
    run(h, 0.2);
    expect(m.runner.isDone(1)).toBe(true);
    // the section's steps done: the tick opens its exit (the gate lets it through)
    expect(h.log).toContain('exit');
    expect(h.ph).toBe('connector');
    h.enter(1);
    expect(m.runner.section).toBe(1);
    expect(m.runner.isOpen(2)).toBe(true);
    run(h, 0.2);
    expect(h.ph).toBe('extract');
    h.finish();
    expect(m.finished).toBe(true);
    expect(m.over).toBe(true);
  });

  it('the extraction in a section that is not the run\'s last: everyone in its connector (cycling) ends the op', () => {
    const defs = [...DEFS(), sec('s3', 1)];
    const h = make(twoSections(), defs);
    h.codes.add('code1');
    h.keys[0]![0] = true;
    run(h, 0.2);
    h.enter(1);
    run(h, 0.2);
    expect(h.ph).toBe('connector');
    h.cyc = true;
    run(h, 0.1);
    expect(h.log).toContain('finish');
    expect(h.m.finished).toBe(true);
  });

  it('a broken rule: the radio line and banner, a restart after RULE_HOLD s, the section back to its snapshot, events again', () => {
    const h = make(twoSections(), DEFS());
    const m = h.m;
    h.codes.add('code1');
    run(h, 0.2);
    expect(m.runner.isDone(0)).toBe(true);
    expect(h.emitted.length).toBe(1);
    m.kill(false, 'local');
    run(h, 0.1);
    expect(h.log).toContain('say No kills broken. Back to the section checkpoint.');
    expect(h.log).toContain(`banner ${RULE_BROKEN_TITLE}`);
    expect(h.restarts).toEqual([]);
    run(h, RULE_HOLD + 0.1);
    expect(h.restarts).toEqual([undefined]);
    expect(m.ruleRestarts).toBe(1);
    // back to the snapshot: the board's step and its fact gone; the tracker holds while the players respawn
    expect(m.runner.isDone(0)).toBe(false);
    expect(m.runner.hasFlag('code1')).toBe(false);
    expect(m.tracker.held).toBe(true);
    m.kill(false, 'local');
    run(h, 0.5);
    expect(h.restarts.length).toBe(1);
    // done again: its Guard AI event is raised again
    h.codes.add('code1');
    run(h, RULE_HOLD);
    expect(m.runner.isDone(0)).toBe(true);
    expect(h.emitted.length).toBe(2);
    // a knock-out is not a kill
    m.kill(true, 'local');
    run(h, 0.5);
    expect(h.restarts.length).toBe(1);
  });

  it('per team (2 players): a team rule restarts that team\'s mission state only; the kept team\'s codes are held again', () => {
    const def: MissionDef = {
      id: 'teams',
      mode: 'sector',
      players: [1, 2, 3, 4],
      sections: ['s1', 's2'],
      briefing: [],
      steps: [
        { id: 'aRead', section: 's1', team: 'a', kind: 'intel', text: 'A reads the board', gives: 'code1' },
        { id: 'bRoof', section: 's1', team: 'b', kind: 'reach', text: 'B on the roof', done: { flag: 's1-key0' } },
        { id: 'meet', section: 's1', team: 'all', kind: 'reach', text: 'Meet', after: ['aRead', 'bRoof'], done: { flag: 's1-obj' } },
        { id: 'out', section: 's2', team: 'all', kind: 'extract', text: 'Out' },
      ],
      rules: [{ kind: 'noKills', scope: 'b', text: 'Team B kills nobody.' }],
      tracks: [
        { team: 'a', zones: ['up'], boxes: [[0, 0, 10, 10]] },
        { team: 'b', zones: ['down'], boxes: [[20, 0, 30, 10]] },
      ],
    };
    const h = make(def, DEFS(), 2);
    const m = h.m;
    h.codes.add('code1');
    h.keys[0]![0] = true;
    run(h, 0.2);
    expect(m.runner.isDone(0) && m.runner.isDone(1)).toBe(true);
    // team A's player (slot 0) kills: not team B's rule
    m.kill(false, 'p0');
    run(h, 0.2);
    expect(h.log.some((l) => l.startsWith('say'))).toBe(false);
    // team B's player (slot 1) kills: B's rule breaks, B alone goes back
    m.kill(false, 'p1');
    run(h, 0.1 + RULE_HOLD + 0.1);
    expect(h.restarts).toEqual(['b']);
    expect(m.runner.isDone(0)).toBe(true);
    expect(m.runner.hasFlag('code1')).toBe(true);
    expect(m.runner.isDone(1)).toBe(false);
    // the world restart dropped the section's codes: team A's code is held again
    expect(h.regranted).toEqual(['code1']);
    expect(h.codes.has('code1')).toBe(true);
    // one player carries both teams: the same rule restarts everyone
    const solo = make(def, DEFS(), 1);
    solo.codes.add('code1');
    run(solo, 0.2);
    solo.m.kill(false, 'local');
    run(solo, 0.1 + RULE_HOLD + 0.1);
    expect(solo.restarts).toEqual([undefined]);
    expect(solo.m.runner.isDone(0)).toBe(false);
  });

  it('spook: a decoy read bolts the real target and breaks the named-target rule; he stays spooked across the restart', () => {
    const def: MissionDef = {
      id: 'spook',
      mode: 'sector',
      players: [1, 2, 3, 4],
      sections: ['s1', 's2'],
      briefing: [],
      steps: [
        { id: 'ask', section: 's1', team: 'all', kind: 'interrogate', text: 'Question the officer', target: 's1:0', decoys: ['s1:1'], bolt: [5, 0, 6], gives: 'route' },
        { id: 'go', section: 's1', team: 'all', kind: 'exploit', text: 'Take his route', needs: 'route', done: { flag: 's1-obj' } },
        { id: 'out', section: 's2', team: 'all', kind: 'extract', text: 'Out' },
      ],
      rules: [{ kind: 'namedTarget', scope: 'mission', text: 'Question only the officer.', step: 'ask' }],
    };
    expect(checkMission(def, sectorGuardIds(DEFS()))).toEqual([]);
    const h = make(def, DEFS());
    const m = h.m;
    const target = h.slots[0]!;
    // a guard of no step: nothing
    m.intel(h.slots[2]!.id);
    expect(m.runner.spookStep).toBe(-1);
    // the decoy: the target is bolted at once, the rule breaks
    m.intel(h.slots[1]!.id);
    expect(m.runner.spookStep).toBe(0);
    expect(h.bolts).toEqual([{ k: 0, at: [5, 0, 6] }]);
    expect(h.slots[0]).not.toBe(target);
    run(h, 0.1);
    expect(h.log).toContain('say Named target broken. Back to the section checkpoint.');
    run(h, RULE_HOLD + 0.1);
    expect(h.restarts).toEqual([undefined]);
    // the restart spawned him at his post again: still spooked, the next tick bolts him again
    expect(m.runner.spookStep).toBe(0);
    run(h, 0.1);
    expect(h.bolts.length).toBe(2);
    run(h, 0.5);
    expect(h.bolts.length).toBe(2);
    // the real target read (at his bolt point): the step is done, the spook over
    m.intel(h.slots[0]!.id);
    expect(m.runner.isDone(0)).toBe(true);
    expect(m.runner.spookStep).toBe(-1);
  });

  it('one chance (A12): a break ends the mission instead of a restart; so does everyone down', () => {
    const rules: MissionRule[] = [noKills, { kind: 'oneChance', scope: 'mission', text: 'One try.' }];
    const h = make(twoSections(rules), DEFS());
    h.m.kill(false, 'local');
    run(h, 0.1);
    expect(h.log).toContain(`banner ${MISSION_FAILED_TITLE}`);
    run(h, RULE_HOLD + 0.1);
    expect(h.restarts).toEqual([]);
    expect(h.log).toContain('fail No kills broken. The mission is over.');
    expect(h.m.over).toBe(true);
    // everyone down (a restart the mission did not ask for)
    const d = make(twoSections(rules), DEFS());
    d.restart();
    run(d, RULE_HOLD + 0.2);
    expect(d.log.some((l) => l.startsWith('fail One chance broken'))).toBe(true);
  });

  it('per-area alarm stages: a device in a track\'s box (and height band) raises that track; a guard alarm both; onAlarm hears it', () => {
    const def = twoSections([{ kind: 'noAlarms', scope: 'a', text: 'No alarms upstairs.' }]);
    def.tracks = [
      { team: 'a', zones: [], boxes: [[0, 0, 10, 10]], y: [3, 14] },
      { team: 'b', zones: [], boxes: [[0, 0, 10, 10]], y: [-2, 3] },
    ];
    expect(checkMission(def, sectorGuardIds(DEFS()))).toEqual([]);
    const h = make(def, DEFS(), 2);
    const m = h.m;
    const heard: number[][] = [];
    m.onAlarm = (teams, a, b, camera) => heard.push([teams, a, b, camera ? 1 : 0]);
    // the height band: the same x / z on the first floor is team A's, on the ground team B's, no height both
    expect(m.tracker.teamsAt(5, 5, 7)).toBe(TEAM_A_BIT);
    expect(m.tracker.teamsAt(5, 5, 0.5)).toBe(TEAM_B_BIT);
    expect(m.tracker.teamsAt(5, 5)).toBe(TEAM_A_BIT | TEAM_B_BIT);
    expect(m.tracker.teamsAt(50, 5, 7)).toBe(TEAM_BOTH);
    // a ground-floor laser: team B's area stage, not A's; team A's rule holds
    m.deviceAt(5, 0.5, 5);
    m.cameraAlarm(true);
    expect([...m.stages]).toEqual([0, 1]);
    run(h, 0.1);
    expect(h.log.length).toBe(0);
    // a first-floor camera that did not raise the stage: no stage, no alarm
    m.deviceAt(5, 7, 5);
    m.cameraAlarm(false);
    expect([...m.stages]).toEqual([0, 1]);
    // a guard's alarm: both tracks
    m.guardAlarm();
    expect([...m.stages]).toEqual([1, 2]);
    expect(heard).toEqual([
      [TEAM_B_BIT, 0, 1, 1],
      [TEAM_BOTH, 1, 2, 0],
    ]);
    run(h, 0.1);
    expect(h.log).toContain('say No alarms broken. Back to the section checkpoint.');
    // team A's restart puts A's stage back to the section's start, B's stays
    run(h, RULE_HOLD + 0.1);
    expect(h.restarts).toEqual(['a']);
    expect([...m.stages]).toEqual([0, 2]);
  });

  it('feeds: detections (mission ghost), a body found, gadgets by slot; the wire packs the state', () => {
    const def = twoSections([{ kind: 'ghost', scope: 'mission', text: 'Unseen.' }, { kind: 'noGadgets', scope: 'mission', text: 'No gadgets.' }]);
    const h = make(def, DEFS());
    h.det = 2;
    run(h, 0.1);
    expect(h.log).toContain('say Ghost broken. Back to the section checkpoint.');
    run(h, RULE_HOLD + 0.1);
    run(h, RULE_HOLD + 0.1);
    h.m.gadget(0);
    run(h, 0.1);
    expect(h.log).toContain('say No gadgets broken. Back to the section checkpoint.');
    const w = h.m.wire();
    expect(w.id).toBe('op');
    expect(w.rb).toBe(2);
    expect(w.rl).toBe('No gadgets broken. Back to the section checkpoint.');
    expect(w.rk[0]).toBe(0);
  });
});

describe('SectorMode with a mission', () => {
  it('no compass / minimap objective blip while a mission runs (A10); without one, the objective blip as before', () => {
    const it0 = { enabled: true, done: false, pos: { x: 1, z: 2 } };
    expect(SectorMode.prototype.blips.call({ mission: {}, its: [it0] } as unknown as SectorMode)).toEqual([]);
    expect(SectorMode.prototype.blips.call({ mission: null, its: [it0] } as unknown as SectorMode)).toEqual([{ x: 1, z: 2, kind: 'objective' }]);
  });
});
