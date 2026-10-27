import { describe, expect, it } from 'vitest';
import { checkMission, missionSpawnsGuard, spookFact, type MissionDef, type MissionEvent, type MissionRule } from '../../src/game/mission/missionDef';
import { MissionRunner } from '../../src/game/mission/missionRunner';
import { objectiveRows, PROTECTED_LINE } from '../../src/game/mission/missionText';
import { applyMissionWire } from '../../src/game/mission/missionWire';
import { RULE_HOLD, SCOPE_MISSION, TEAM_A_BIT, TEAM_B_BIT, TEAM_BOTH } from '../../src/game/mission/ruleTracker';
import {
  MISSION_RESTART_HOLD,
  RULE_BROKEN_TITLE,
  SECTION_RESTART_TITLE,
  SectorMission,
  applyMissionStart,
  missionStartIndex,
  missionStartSector,
  parseGuardId,
  pickMission,
  sectorGuardId,
  sectorGuardIds,
  sectorGuardTalkers,
  type MissionGuard,
  type SectorMissionHost,
} from '../../src/game/mission/sectorMission';
import { SectorMode } from '../../src/game/modes/sectorMode';
import { SectorRun, type SectorDef, type SectorPhase } from '../../src/game/sectors';
import { CAMPUS_SECTORS } from '../../src/world/maps/campusSectors';
import { CAMPUS_MISSION_TEST } from '../../src/world/maps/campusMissionTest';
import { THREE_GREY_COATS } from '../../src/world/maps/tallowWharfMissions';
import { WHARF_SECTORS } from '../../src/world/maps/tallowWharfSectors';

// (mission-framework EN2) the Sector Ops adapter over a fake mode: lifecycle, the exit gate, a rule break's restart (whole
// and per team), spook across a restart, per-area alarm stages with the height band, Guard AI events, no blips

interface FakeGuard {
  id: string;
  alive: boolean;
  alerted: boolean;
  passive: boolean;
  zone?: string;
  ko: boolean;
  taken: boolean;
}

let guardSeq = 0;
const guard = (zone?: string): FakeGuard => ({ id: `e${++guardSeq}`, alive: true, alerted: false, passive: false, zone, ko: false, taken: false });
/** A knock-out as the engine does it (`Enemy.knockOut`): `ko` set, then hp drained, so the guard is not alive either. */
const knockOut = (g: FakeGuard): void => {
  g.ko = true;
  g.alive = false;
};

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

  /** Guards spawned held by a player (the spook waits while one holds the target). */
  held = false;

  spawn(): void {
    this.slots = this.defs[this.idx]!.guards.map((g) => ({ ...guard((g as { zone?: string }).zone), taken: this.held }));
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
    // (fix round) a target or decoy with no GuardInfo lines could never be interrogated
    expect(sectorGuardTalkers(DEFS()).size).toBe(0);
    expect(checkMission(def, sectorGuardIds(DEFS()), sectorGuardTalkers(DEFS()))).toEqual([
      'mission spook step ask: target s1:0 has no GuardInfo lines (he cannot be interrogated)',
      'mission spook step ask: decoy s1:1 has no GuardInfo lines (he cannot be interrogated)',
    ]);
    expect(checkMission(def, sectorGuardIds(DEFS()), new Set(['s1:0', 's1:1']))).toEqual([]);
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
    // (fix round) the restart spawns him held by a player: he stays put while held
    h.held = true;
    run(h, RULE_HOLD + 0.1);
    h.held = false;
    expect(h.restarts).toEqual([undefined]);
    // the restart spawned him at his post again: still spooked; let go, the next tick bolts him again
    expect(m.runner.spookStep).toBe(0);
    run(h, 0.3);
    expect(h.bolts.length).toBe(1);
    h.slots[0]!.taken = false;
    run(h, 0.1);
    expect(h.bolts.length).toBe(2);
    run(h, 0.5);
    expect(h.bolts.length).toBe(2);
    // the real target read (at his bolt point): the step is done, the spook over
    m.intel(h.slots[0]!.id);
    expect(m.runner.isDone(0)).toBe(true);
    expect(m.runner.spookStep).toBe(-1);
  });

  it('(fix round) a decoy read breaks a team named-target rule only for the team of the one who asked (A9)', () => {
    const def: MissionDef = {
      id: 'teamAsk',
      mode: 'sector',
      players: [1, 2, 3, 4],
      sections: ['s1', 's2'],
      briefing: [],
      steps: [
        { id: 'ask', section: 's1', team: 'a', kind: 'interrogate', text: 'A questions the officer', target: 's1:0', decoys: ['s1:1', 's1:2'], bolt: [5, 0, 6] },
        { id: 'out', section: 's2', team: 'all', kind: 'extract', text: 'Out' },
      ],
      rules: [{ kind: 'namedTarget', scope: 'a', text: 'Team A questions only the officer.', step: 'ask' }],
      tracks: [
        { team: 'a', zones: [], boxes: [[0, 0, 10, 10]] },
        { team: 'b', zones: [], boxes: [[20, 0, 30, 10]] },
      ],
    };
    const h = make(def, DEFS(), 2);
    h.m.intel(h.slots[1]!.id, 'p1');
    run(h, 0.2);
    expect(h.log.some((l) => l.startsWith('say'))).toBe(false);
    h.m.intel(h.slots[2]!.id);
    run(h, 0.1);
    expect(h.log).toContain('say Named target broken. Back to the section checkpoint.');
    // (fix round) the exits hold while the restart waits out its hold
    expect(h.m.holding).toBe(true);
    run(h, RULE_HOLD + 0.1);
    expect(h.restarts).toEqual(['a']);
    expect(h.m.holding).toBe(false);
  });

  it('(mission-rules R1, G290) no break ends the mission; a restart the adapter did not ask for only restores', () => {
    const h = make(twoSections(), DEFS());
    h.codes.add('code1');
    run(h, 0.2);
    expect(h.m.runner.isDone(0)).toBe(true);
    // everyone down (the mode's restart, not the mission's): the section's state goes back, nothing is said
    h.restart();
    expect(h.m.runner.isDone(0)).toBe(false);
    run(h, RULE_HOLD + 0.2);
    expect(h.restarts).toEqual([undefined]);
    expect(h.m.ruleRestarts).toBe(0);
    expect(h.m.tracker.breaks).toBe(0);
    expect(h.log.some((l) => l.startsWith('say') || l.startsWith('banner'))).toBe(false);
    expect(h.m.over).toBe(false);
    // a rule's break: a restart, the mission goes on
    h.m.kill(false, 'local');
    run(h, 0.1 + RULE_HOLD + 0.1);
    expect(h.restarts.length).toBe(2);
    expect(h.m.ruleRestarts).toBe(1);
    expect(h.m.over).toBe(false);
  });

  it('(fix round) a restart that lands on a pending team restart keeps it that team\'s', () => {
    const def = twoSections([{ kind: 'noKills', scope: 'b', text: 'Team B kills nobody.' }]);
    def.tracks = [
      { team: 'a', zones: [], boxes: [[0, 0, 10, 10]] },
      { team: 'b', zones: [], boxes: [[20, 0, 30, 10]] },
    ];
    def.steps[0]!.team = 'a';
    const h = make(def, DEFS(), 2);
    h.codes.add('code1');
    run(h, 0.2);
    expect(h.m.runner.isDone(0)).toBe(true);
    h.m.kill(false, 'p1');
    run(h, 0.5);
    // everyone down meanwhile: the mode's restart (not the mission's) comes first
    h.restart();
    expect(h.m.runner.isDone(0)).toBe(true);
    run(h, RULE_HOLD + 0.5);
    expect(h.restarts).toEqual([undefined]);
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

// (mission-rules R1) Three Grey Coats' protected courier: a knock-out before he talks restarts the section with him at his
// table (A2, Michael ~20:25 "Restart the section (Recommended)", BRIEF M6); a kill before he talks breaks the named-target
// rule and he moves to the clock-mender's back loft, as a decoy read does (the page Michael signed, "He moves")

const TEALE = 6;
const FENN = 7;
const GARROW = 8;
const TGC3 = THREE_GREY_COATS.steps.findIndex((s) => s.id === 'tgc-3');
const TGC3_STEP = THREE_GREY_COATS.steps[TGC3]!;
const BOLT_AT = [65, 4.5, 76.75];

/** A TGC run on the real Tallow sections, W1 done, entered W2 (tgc-3 open). */
function tgcAtW2(def: MissionDef = THREE_GREY_COATS): FakeHost {
  const h = make(def, WHARF_SECTORS, 2);
  for (const c of ['tgc-1', 'tgc-tally', 'tgc-tea']) h.codes.add(c);
  run(h, 0.2);
  h.enter(1);
  run(h, 0.2);
  return h;
}

/** Tick until `cond` holds (at most `s` seconds); true when it did. */
function until(h: FakeHost, cond: () => boolean, s = 10): boolean {
  for (let t = 0; t < s; t += 0.1) {
    if (cond()) return true;
    h.m.tick(0.1);
  }
  return cond();
}

const tgc3Row = (r: MissionRunner): string | undefined => objectiveRows(r, 'all', false).find((x) => x.step === TGC3)?.text;
const banners = (h: FakeHost): string[] => h.log.filter((l) => l.startsWith('banner'));

/** A client page's runner fed the host's wire (the fact bits carry the spook fact). */
function clientRow(h: FakeHost): string | undefined {
  const c = new MissionRunner(h.m.def, 2);
  c.snapshot(h.m.runner.section, 0);
  applyMissionWire(c, h.m.wire());
  return tgc3Row(c);
}

describe('SectorMission (mission-rules R1): Three Grey Coats, Teale before he talks', () => {
  it('the base: tgc-3 open in W2 with its reading-room line; the spook fact is kept on restore and never polled', () => {
    const h = tgcAtW2();
    expect(h.m.runner.section).toBe(1);
    expect(h.m.runner.isOpen(TGC3)).toBe(true);
    expect(tgc3Row(h.m.runner)).toBe(TGC3_STEP.text);
    expect(TGC3_STEP.bolt).toEqual(BOLT_AT);
    const polled = (h.m as unknown as { pollFlag: string[] }).pollFlag;
    expect(polled).not.toContain(spookFact(TGC3_STEP));
    expect(h.m.runner.flags).toContain(spookFact(TGC3_STEP));
  });

  it('knocked out -> SECTION RESTART, PROTECTED_LINE, no break counted, no move; W2 restarts with him at his table', () => {
    const h = tgcAtW2();
    const m = h.m;
    knockOut(h.slots[TEALE]!);
    run(h, 0.1);
    expect(banners(h)).toEqual([`banner ${SECTION_RESTART_TITLE}`]);
    expect(h.log).toContain(`say ${PROTECTED_LINE}`);
    expect(m.tracker.breaks).toBe(0);
    expect(m.tracker.protectedBreaks).toBe(1);
    expect(m.tracker.kept(SCOPE_MISSION) & 1).toBe(1);
    expect(m.runner.spookStep).toBe(-1);
    expect(m.holding).toBe(true);
    expect(h.restarts).toEqual([]);
    // he lies there through the hold: one restart only
    expect(until(h, () => h.restarts.length > 0, MISSION_RESTART_HOLD + 0.5)).toBe(true);
    expect(h.restarts).toEqual([undefined]);
    expect(m.ruleRestarts).toBe(1);
    run(h, 1);
    expect(banners(h).length).toBe(1);
    expect(h.bolts).toEqual([]);
    expect(h.slots[TEALE]!.ko).toBe(false);
    expect(m.runner.isOpen(TGC3)).toBe(true);
    expect(m.runner.hasFlag(spookFact(TGC3_STEP))).toBe(false);
    expect(tgc3Row(m.runner)).toBe(TGC3_STEP.text);
    expect(clientRow(h)).toBe(TGC3_STEP.text);
    expect(m.tracker.breaks).toBe(0);
  });

  it('killed -> RULE BROKEN, breaks 1, he bolts to the back loft after the restart and tgc-3 names it on host and client', () => {
    const h = tgcAtW2();
    const m = h.m;
    h.slots[TEALE]!.alive = false;
    run(h, 0.1);
    expect(banners(h)).toEqual([`banner ${RULE_BROKEN_TITLE}`]);
    expect(h.log).toContain('say Named target broken. Back to the section checkpoint.');
    expect(m.tracker.breaks).toBe(1);
    expect(m.tracker.protectedBreaks).toBe(0);
    expect(m.tracker.kept(SCOPE_MISSION) & 1).toBe(0);
    expect(m.runner.spookStep).toBe(TGC3);
    // the spook fact at once (the wire tells the client during the hold); nothing bolts a dead man
    expect(m.runner.hasFlag(spookFact(TGC3_STEP))).toBe(true);
    expect(h.bolts).toEqual([]);
    // one break however many ticks he lies dead
    run(h, 1);
    expect(m.tracker.breaks).toBe(1);
    expect(until(h, () => h.restarts.length > 0, MISSION_RESTART_HOLD)).toBe(true);
    expect(h.restarts).toEqual([undefined]);
    run(h, 0.2);
    expect(h.bolts).toEqual([{ k: TEALE, at: BOLT_AT }]);
    expect(m.runner.hasFlag(spookFact(TGC3_STEP))).toBe(true);
    expect(m.runner.isOpen(TGC3)).toBe(true);
    expect(tgc3Row(m.runner)).toBe(TGC3_STEP.boltText);
    expect(clientRow(h)).toBe("Take the grey coat with the black umbrella in the clock-mender's back loft");
    run(h, 3);
    expect(m.tracker.breaks).toBe(1);
    expect(banners(h).length).toBe(1);
    expect(h.bolts.length).toBe(1);
  });

  it('killed while the mission scope is held (just after a restart): nothing that tick; the break and the move once the hold ends', () => {
    const h = tgcAtW2();
    const m = h.m;
    knockOut(h.slots[TEALE]!);
    run(h, 0.1);
    expect(until(h, () => h.restarts.length > 0, MISSION_RESTART_HOLD + 0.5)).toBe(true);
    expect(m.tracker.held).toBe(true);
    h.slots[TEALE]!.alive = false;
    run(h, 0.1);
    expect(m.tracker.breaks).toBe(0);
    expect(m.runner.spookStep).toBe(-1);
    expect(banners(h).length).toBe(1);
    expect(until(h, () => m.tracker.breaks > 0, RULE_HOLD + 0.5)).toBe(true);
    expect(m.tracker.held).toBe(false);
    expect(m.runner.spookStep).toBe(TGC3);
    expect(banners(h)).toEqual([`banner ${SECTION_RESTART_TITLE}`, `banner ${RULE_BROKEN_TITLE}`]);
    expect(m.tracker.protectedBreaks).toBe(1);
  });

  it('a decoy read (Garrow) -> the same RULE BROKEN, bolt and moved row as the kill; the bolt is no protected break', () => {
    const h = tgcAtW2();
    const m = h.m;
    m.intel(h.slots[GARROW]!.id);
    expect(m.runner.spookStep).toBe(TGC3);
    expect(h.bolts).toEqual([{ k: TEALE, at: BOLT_AT }]);
    expect(m.runner.hasFlag(spookFact(TGC3_STEP))).toBe(true);
    run(h, 0.1);
    expect(banners(h)).toEqual([`banner ${RULE_BROKEN_TITLE}`]);
    expect(m.tracker.breaks).toBe(1);
    expect(clientRow(h)).toBe(TGC3_STEP.boltText);
    expect(until(h, () => h.restarts.length > 0, MISSION_RESTART_HOLD + 0.5)).toBe(true);
    run(h, 0.2);
    expect(h.bolts.length).toBe(2);
    expect(h.bolts[1]).toEqual({ k: TEALE, at: BOLT_AT });
    expect(tgc3Row(m.runner)).toBe(TGC3_STEP.boltText);
    expect(clientRow(h)).toBe(TGC3_STEP.boltText);
    run(h, 3);
    expect(m.tracker.protectedBreaks).toBe(0);
    expect(m.tracker.breaks).toBe(1);
  });

  it('a decoy read, then Teale knocked out at the bolt point: a protected restart, the move kept; then killed there: a second break', () => {
    const h = tgcAtW2();
    const m = h.m;
    m.intel(h.slots[FENN]!.id);
    run(h, 0.1);
    expect(until(h, () => h.restarts.length > 0, MISSION_RESTART_HOLD + 0.5)).toBe(true);
    run(h, RULE_HOLD + 0.2);
    expect(h.bolts.length).toBe(2);
    // knocked out at the bolt point
    knockOut(h.slots[TEALE]!);
    run(h, 0.1);
    expect(banners(h)[1]).toBe(`banner ${SECTION_RESTART_TITLE}`);
    expect(m.tracker.breaks).toBe(1);
    expect(m.runner.spookStep).toBe(TGC3);
    expect(until(h, () => h.restarts.length > 1, MISSION_RESTART_HOLD + 0.5)).toBe(true);
    run(h, RULE_HOLD + 0.2);
    expect(h.bolts.length).toBe(3);
    expect(tgc3Row(m.runner)).toBe(TGC3_STEP.boltText);
    // killed at the bolt point
    h.slots[TEALE]!.alive = false;
    run(h, 0.1);
    expect(banners(h)[2]).toBe(`banner ${RULE_BROKEN_TITLE}`);
    expect(m.tracker.breaks).toBe(2);
    expect(until(h, () => h.restarts.length > 2, MISSION_RESTART_HOLD + 0.5)).toBe(true);
    run(h, 0.2);
    expect(h.bolts.length).toBe(4);
    expect(tgc3Row(m.runner)).toBe(TGC3_STEP.boltText);
    expect(m.tracker.protectedBreaks).toBe(1);
  });

  it('after tgc-3 is done he is fair game: killed or knocked out -> nothing', () => {
    for (const how of ['ko', 'kill'] as const) {
      const h = tgcAtW2();
      h.m.intel(h.slots[TEALE]!.id);
      expect(h.m.runner.isDone(TGC3)).toBe(true);
      if (how === 'ko') knockOut(h.slots[TEALE]!);
      else h.slots[TEALE]!.alive = false;
      run(h, 1);
      expect(banners(h)).toEqual([]);
      expect(h.m.tracker.breaks + h.m.tracker.protectedBreaks).toBe(0);
    }
  });

  it('knocked out in the same tick his intel completes the step -> nothing', () => {
    const h = tgcAtW2();
    h.m.intel(h.slots[TEALE]!.id);
    knockOut(h.slots[TEALE]!);
    run(h, 0.5);
    expect(banners(h)).toEqual([]);
  });

  it('a step no named-target rule covers (rules: []): his kill is the protected restart, no move', () => {
    const h = tgcAtW2({ ...THREE_GREY_COATS, rules: [] });
    h.slots[TEALE]!.alive = false;
    run(h, 0.1);
    expect(banners(h)).toEqual([`banner ${SECTION_RESTART_TITLE}`]);
    expect(h.log).toContain(`say ${PROTECTED_LINE}`);
    expect(h.m.tracker.breaks).toBe(0);
    expect(h.m.runner.spookStep).toBe(-1);
    expect(until(h, () => h.restarts.length > 0, MISSION_RESTART_HOLD + 0.5)).toBe(true);
    run(h, 1);
    expect(h.bolts).toEqual([]);
    expect(tgc3Row(h.m.runner)).toBe(TGC3_STEP.text);
  });

  it('Fenn or Garrow knocked out or killed, or no Teale spawned (slotGuard null) -> no restart', () => {
    const h = tgcAtW2();
    knockOut(h.slots[FENN]!);
    h.slots[GARROW]!.alive = false;
    run(h, 1);
    expect(banners(h)).toEqual([]);
    (h.slots as (FakeGuard | undefined)[])[TEALE] = undefined;
    run(h, 1);
    expect(banners(h)).toEqual([]);
    expect(h.m.tracker.breaks + h.m.tracker.protectedBreaks).toBe(0);
  });
});

// (mission-framework EN4, A23) a mission that starts at a later section, and per-mission guard lists

const pose = (x: number): { x: number; y: number; z: number; yaw: number } => ({ x, y: 0, z: 0, yaw: x / 10 });

function threeRun(): SectorDef[] {
  return [
    sec('s1', 3, { start: pose(1), connector: { checkpoint: pose(11) } as SectorDef['connector'] }),
    sec('s2', 4, { start: pose(2), start2: pose(22), connector: { checkpoint: pose(12) } as SectorDef['connector'] }),
    sec('s3', 2, { start: pose(3) }),
  ];
}

/** Two-Key Ledger's shape: the mission runs s2 -> s3 and starts at s2; its guards: s2's 0, 1 and 3, all of s3's. */
function lateStart(extra: Partial<MissionDef> = {}): MissionDef {
  return {
    id: 'late',
    mode: 'sector',
    players: [1, 2, 3, 4],
    sections: ['s2', 's3'],
    start: 's2',
    guards: [{ section: 's2', slots: [0, 1, 3] }, { section: 's3' }],
    briefing: [],
    steps: [
      { id: 'look', section: 's2', team: 'all', kind: 'reach', text: 'The loft' },
      { id: 'ask', section: 's2', team: 'all', kind: 'interrogate', text: 'Ask the clerk', target: 's2:3' },
      { id: 'out', section: 's3', team: 'all', kind: 'extract', text: 'Out' },
    ],
    rules: [],
    ...extra,
  };
}

describe('SectorMission EN4: the start section (A23)', () => {
  it('the run starts at the mission\'s start: index, checkpoint and partner point at that section\'s start', () => {
    const defs = threeRun();
    expect(missionStartIndex(lateStart(), defs)).toBe(1);
    expect(missionStartIndex(lateStart({ start: undefined }), defs)).toBe(0);
    expect(missionStartIndex(null, defs)).toBe(0);
    expect(missionStartSector(defs, [lateStart()], 'late')?.id).toBe('s2');
    expect(missionStartSector(defs, [lateStart()], null)?.id).toBe('s1');
    const run = new SectorRun(defs);
    applyMissionStart(run, 1);
    expect(run.index).toBe(1);
    expect(run.current?.id).toBe('s2');
    expect(run.phase).toBe('objective');
    expect({ ...run.checkpoint }).toEqual(pose(2));
    expect(run.checkpoint2).toEqual(pose(22));
    // a restart stays in the start section, at its start
    run.restartSection();
    expect(run.index).toBe(1);
    expect({ ...run.checkpoint }).toEqual(pose(2));
    // the earlier section is never rated
    expect(run.marks[0]).toBe(-1);
    // no mission start (0): the run as before
    const plain = new SectorRun(defs);
    applyMissionStart(plain, 0);
    expect(plain.index).toBe(0);
    expect({ ...plain.checkpoint }).toEqual(pose(1));
  });

  it('the adapter begins at the start section: the runner is on the mission\'s first section, the exit gate works there', () => {
    const defs = threeRun();
    const h = new FakeHost(defs);
    h.m = new SectorMission(lateStart(), h);
    expect(h.m.startIndex).toBe(1);
    h.enter(h.m.startIndex);
    expect(h.m.runner.section).toBe(0);
    expect(h.m.runner.isOpen(0)).toBe(true);
    h.useObjective();
    expect(h.log).not.toContain('exit');
  });
});

describe('SectorMission EN4: per-mission guard lists (A23)', () => {
  it('only the listed guards spawn; a section the list does not name spawns none; no list: every guard', () => {
    const defs = threeRun();
    const h = new FakeHost(defs);
    const m = new SectorMission(lateStart(), h);
    const spawned = (sec: number): number[] => defs[sec]!.guards.map((_, k) => k).filter((k) => m.spawns(sec, k));
    expect(spawned(0)).toEqual([]);
    expect(spawned(1)).toEqual([0, 1, 3]);
    expect(spawned(2)).toEqual([0, 1]);
    expect(missionSpawnsGuard(lateStart(), 's2:2')).toBe(false);
    expect(missionSpawnsGuard(lateStart(), 's3:1')).toBe(true);
    const all = new SectorMission(lateStart({ guards: undefined }), h);
    expect(defs.every((d, sec) => d.guards.every((_, k) => all.spawns(sec, k)))).toBe(true);
  });

  it('SectorMode.loadSection queues only the mission\'s guards (no mission: all of them)', () => {
    const defs = threeRun();
    const m = new SectorMission(lateStart(), new FakeHost(defs));
    const load = (mission: SectorMission | null): number[] => {
      const self = {
        run: { defs, alarm: 0 },
        // (coop4 merge 16) coop4's team size at load (`teamSizeOf`): an empty team list, every guard for a team of 0-2
        g: { world: {}, interactables: null, stealth: null, enemyMgr: null, playerRefsInto: (o: unknown[]) => ((o.length = 0), o) },
        refs: [] as unknown[],
        ct: null,
        desks: { reset: () => undefined },
        deskApply: () => undefined,
        slotEnemy: [] as unknown[],
        pending: [] as { k: number }[],
        fill: () => undefined,
        mission,
      };
      (SectorMode.prototype as unknown as { loadSection(this: unknown, i: number): void }).loadSection.call(self, 1);
      return self.pending.map((p) => p.k);
    };
    expect(load(m)).toEqual([0, 1, 3]);
    expect(load(null)).toEqual([0, 1, 2, 3]);
  });
});

describe('checkMission EN4: start and guard list', () => {
  const ids = (): Set<string> => sectorGuardIds(threeRun());
  it('a good start and guard list pass', () => {
    expect(checkMission(lateStart(), ids())).toEqual([]);
  });
  it('rejects a start outside sections, or a step before the start', () => {
    expect(checkMission(lateStart({ start: 's1' }), ids()).some((e) => e.includes('start s1 is not in sections'))).toBe(true);
    const errs = checkMission(lateStart({ start: 's3' }), ids());
    expect(errs.some((e) => e.includes('step look: section s2 is before the start s3'))).toBe(true);
  });
  it('rejects a bad guard list: an unknown or repeated section, a slot that is no guard or repeated, a section with no entry, a target not spawned', () => {
    const bad = (guards: MissionDef['guards']): string[] => checkMission(lateStart({ guards }), ids());
    expect(bad([{ section: 's2', slots: [0, 3] }, { section: 's3' }, { section: 's1' }]).some((e) => e.includes('guards s1: section is not in sections'))).toBe(true);
    expect(bad([{ section: 's2', slots: [3] }, { section: 's2', slots: [3] }, { section: 's3' }]).some((e) => e.includes('section listed twice'))).toBe(true);
    expect(bad([{ section: 's2', slots: [3, 4] }, { section: 's3' }]).some((e) => e.includes('slot 4 is not a guard of the section'))).toBe(true);
    expect(bad([{ section: 's2', slots: [3, 3] }, { section: 's3' }]).some((e) => e.includes('slot 3 listed twice'))).toBe(true);
    expect(bad([{ section: 's2', slots: [3] }]).some((e) => e.includes('section s3 has no entry'))).toBe(true);
    expect(bad([{ section: 's2', slots: [0] }, { section: 's3' }]).some((e) => e.includes('guard s2:3 is not in the mission\'s guard list'))).toBe(true);
  });
  it('(POL1) rejects an interrogate decoy the guard list does not spawn; a spawned decoy passes', () => {
    const ask = (decoys: string[]): MissionDef['steps'][number] => ({ id: 'ask', section: 's2', team: 'all', kind: 'interrogate', text: 'Ask the clerk', target: 's2:3', decoys, bolt: [1, 0, 2] });
    const steps = (decoys: string[]): MissionDef['steps'] => [lateStart().steps[0]!, ask(decoys), lateStart().steps[2]!];
    expect(checkMission(lateStart({ steps: steps(['s2:1']) }), ids())).toEqual([]);
    const errs = checkMission(lateStart({ steps: steps(['s2:2']) }), ids());
    expect(errs.some((e) => e.includes('step ask: guard s2:2 is not in the mission\'s guard list'))).toBe(true);
  });
});
