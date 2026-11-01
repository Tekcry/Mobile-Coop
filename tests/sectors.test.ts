import { describe, expect, it } from 'vitest';
import {
  CONN_LOAD,
  CONN_LOCK_NEAR,
  CONN_UNLOAD,
  CONN_UNLOCK_FAR,
  CONN_UNLOCK_NEAR,
  ConnectorMachine,
  SECTOR,
  SectorRun,
  alarmStep,
  checkSectors,
  checkSectorGuards,
  SECTOR_REINFORCE_KIND,
  exitZone,
  fmtTime,
  inDoorway,
  inZone,
  sectorResult,
  type ConnectorInput,
  type SectorDef,
} from '../src/game/sectors';
import { DIFFICULTIES } from '../src/ai/archetypes';
import type { GearTag } from '../src/ai/gear';
import { MAX_ENEMIES } from '../src/net/protocol';
import { ENEMIES } from '../src/ai/enemyDefs';

const pose = (x: number) => ({ x, y: 0, z: 0, yaw: 0 });
const def = (id: string, i: number, last: boolean, kind: SectorDef['objective']['kind'] = 'hack'): SectorDef => ({
  id,
  name: id,
  start: pose(i * 100),
  objective: { kind, label: 'x', x: 0, y: 0, z: 0, yaw: 0 },
  ...(last
    ? { extract: { label: 'out', box: [2, 2, 4, 4] as [number, number, number, number] } }
    : { connector: { label: 'on', box: [2, 2, 4, 4] as [number, number, number, number], nearAt: [2, 3] as [number, number], checkpoint: pose(i * 100 + 50) } }),
  guards: [],
  reinforce: [[0, 0]],
  perStage: SECTOR.perStage,
  routes: [],
});
const three = (): SectorDef[] => [def('s1', 0, false), def('s2', 1, false, 'download'), def('s3', 2, true, 'grab')];
const IN: ConnectorInput = { allInside: true, doorwayClear: true };
const OUT: ConnectorInput = { allInside: false, doorwayClear: true };
const BLOCKED: ConnectorInput = { allInside: true, doorwayClear: false };

/** Step the run's connector `s` seconds in 1/60 s steps; the OR of every step's events. */
function stepFor(r: SectorRun, s: number, input: ConnectorInput): number {
  let ev = 0;
  for (let t = 0; t < s - 1e-9; t += 1 / 60) ev |= r.step(1 / 60, input);
  return ev;
}

describe('ConnectorMachine', () => {
  it('locked -> open -> cycling -> sealed, events in order', () => {
    const c = new ConnectorMachine();
    expect(c.step(1, IN)).toBe(0);
    expect(c.state).toBe('locked');
    expect(c.open()).toBe(true);
    expect(c.open()).toBe(false);
    // the unlock goes out on the next step
    expect(c.step(0.5, IN)).toBe(CONN_UNLOCK_NEAR);
    expect(c.state).toBe('open');
    expect(c.step(0.5, IN)).toBe(CONN_LOCK_NEAR | CONN_UNLOAD);
    expect(c.state).toBe('cycling');
    expect(c.step(SECTOR.connectorLoadAt - 0.1, OUT)).toBe(0);
    expect(c.step(0.1, OUT)).toBe(CONN_LOAD);
    expect(c.step(SECTOR.connectorCycle - SECTOR.connectorLoadAt - 0.1, OUT)).toBe(0);
    expect(c.step(0.1, OUT)).toBe(CONN_UNLOCK_FAR);
    expect(c.state).toBe('sealed');
    expect(c.step(5, IN)).toBe(0);
  });

  it('waits for every player inside for the hold, and for the near doorway to clear', () => {
    const c = new ConnectorMachine();
    c.open();
    c.step(0, OUT);
    c.step(0.9, IN);
    // someone steps out: the hold starts again
    c.step(0.1, OUT);
    expect(c.step(0.9, IN)).toBe(0);
    expect(c.state).toBe('open');
    // the hold is met but someone stands in the doorway: no lock, no cycle
    expect(c.step(0.5, BLOCKED)).toBe(0);
    expect(c.step(3, BLOCKED)).toBe(0);
    expect(c.state).toBe('open');
    expect(c.step(1 / 60, IN)).toBe(CONN_LOCK_NEAR | CONN_UNLOAD);
  });

  it('finish owes the rest of a started cycle; reset goes back to locked', () => {
    const c = new ConnectorMachine();
    expect(c.finish()).toBe(0);
    c.open();
    c.step(0, IN);
    c.step(SECTOR.connectorHold, IN);
    expect(c.finish()).toBe(CONN_LOAD | CONN_UNLOCK_FAR);
    expect(c.state).toBe('sealed');
    c.reset();
    expect(c.state).toBe('locked');
    expect(c.step(1, IN)).toBe(0);
  });
});

describe('SectorRun', () => {
  it('runs 3 sections through 2 connectors to the extraction', () => {
    const r = new SectorRun(three());
    expect(r.checkpoint).toEqual(pose(0));
    expect(r.step(1, IN)).toBe(0);
    expect(r.extractStep(1, true)).toBe(false);
    expect(r.objectiveDone()).toBe(true);
    expect(r.objectiveDone()).toBe(false);
    expect(r.phase).toBe('connector');
    expect(r.next?.id).toBe('s2');
    let ev = stepFor(r, SECTOR.connectorHold + 0.05, IN);
    expect(ev).toBe(CONN_UNLOCK_NEAR | CONN_LOCK_NEAR | CONN_UNLOAD);
    expect(r.index).toBe(0);
    ev = stepFor(r, SECTOR.connectorCycle, OUT);
    expect(ev).toBe(CONN_LOAD | CONN_UNLOCK_FAR);
    expect(r.index).toBe(1);
    expect(r.phase).toBe('objective');
    expect(r.current?.id).toBe('s2');
    // the connector is the new checkpoint
    expect(r.checkpoint).toEqual(pose(50));
    // section 2: a download
    expect(r.download(SECTOR.downloadTime)).toBe(false);
    r.downloading = true;
    expect(r.download(SECTOR.downloadTime / 2)).toBe(false);
    expect(r.download(SECTOR.downloadTime / 2)).toBe(true);
    expect(r.phase).toBe('connector');
    stepFor(r, SECTOR.connectorHold + SECTOR.connectorCycle + 0.1, IN);
    expect(r.index).toBe(2);
    expect(r.checkpoint).toEqual(pose(150));
    expect(r.progress).toBe(0);
    // the last section: the extraction, no connector
    r.objectiveDone();
    expect(r.phase).toBe('extract');
    expect(r.step(5, IN)).toBe(0);
    expect(r.extractStep(SECTOR.extractHold / 2, true)).toBe(false);
    expect(r.extractStep(SECTOR.extractHold / 2, false)).toBe(false);
    expect(r.extractStep(SECTOR.extractHold, true)).toBe(true);
    expect(r.phase).toBe('done');
    expect(r.current).toBeNull();
  });

  it('carries the alarm over between sections', () => {
    const r = new SectorRun(three());
    expect(r.raiseAlarm()).toBe(SECTOR.perStage);
    r.objectiveDone();
    stepFor(r, SECTOR.connectorHold + SECTOR.connectorCycle + 0.1, IN);
    expect(r.index).toBe(1);
    expect(r.alarm).toBe(1);
    expect(r.alarmAtStart).toBe(1);
  });

  it('restartSection: the objective, download, connector and alarm go back to the section start (no lives)', () => {
    const r = new SectorRun(three());
    r.raiseAlarm();
    r.objectiveDone();
    stepFor(r, SECTOR.connectorHold + SECTOR.connectorCycle + 0.1, IN);
    // section 2: the alarm went up twice, the download half done, then everyone is down
    r.raiseAlarm();
    r.raiseAlarm();
    r.downloading = true;
    r.download(4);
    expect(r.restartSection()).toBe(0);
    expect(r.index).toBe(1);
    expect(r.phase).toBe('objective');
    expect(r.progress).toBe(0);
    expect(r.downloading).toBe(false);
    expect(r.alarm).toBe(1);
    expect(r.alarmsRaised).toBe(3); // (sector-batch, G146) a restart puts the stage back, not the alarms raised
    expect(r.checkpoint).toEqual(pose(50));
    // any number of restarts (no lives): the run never fails
    for (let i = 0; i < 10; i++) r.restartSection();
    expect(r.phase).toBe('objective');
    // objective done, the near door unlocked: a restart locks it again
    r.downloading = true;
    r.download(SECTOR.downloadTime);
    expect(r.phase).toBe('connector');
    r.step(0, OUT);
    expect(r.restartSection()).toBe(CONN_LOCK_NEAR);
    expect(r.conn.state).toBe('locked');
    expect(r.phase).toBe('objective');
  });

  it('a restart during a running cycle finishes it: the next section restarts at the connector', () => {
    const r = new SectorRun(three());
    r.objectiveDone();
    stepFor(r, SECTOR.connectorHold + 0.05, IN);
    expect(r.conn.state).toBe('cycling');
    r.raiseAlarm();
    expect(r.restartSection()).toBe(CONN_LOAD | CONN_UNLOCK_FAR);
    expect(r.index).toBe(1);
    expect(r.phase).toBe('objective');
    expect(r.checkpoint).toEqual(pose(50));
    expect(r.alarm).toBe(1);
  });

  it('a restart in the first section goes back to its start; done is final', () => {
    const r = new SectorRun([def('only', 0, true)]);
    r.objectiveDone();
    expect(r.phase).toBe('extract');
    r.restartSection();
    expect(r.phase).toBe('objective');
    expect(r.checkpoint).toEqual(pose(0));
    r.objectiveDone();
    r.extractStep(1, true);
    expect(r.restartSection()).toBe(0);
    expect(r.phase).toBe('done');
    expect(new SectorRun([]).phase).toBe('done');
  });
});

describe('sector rules', () => {
  it('zones by box and floor; the near doorway', () => {
    const d = def('a', 0, false);
    const z = exitZone(d)!;
    expect(inZone(z, 3, 0, 3)).toBe(true);
    expect(inZone(z, 5, 0, 3)).toBe(false);
    expect(inZone(z, 3, 3, 3)).toBe(false);
    expect(inDoorway(d.connector!, 2.2, 3)).toBe(true);
    expect(inDoorway(d.connector!, 3.5, 3)).toBe(false);
    expect(exitZone(def('b', 0, true))?.label).toBe('out');
  });

  it('data check: a connector on every section but the last, an extraction on the last', () => {
    expect(checkSectors(three())).toEqual([]);
    expect(checkSectors([def('a', 0, true), def('b', 1, true)])).toEqual(['a: no connector', 'a: an extraction before the last section']);
    expect(checkSectors([def('a', 0, false)])).toEqual(['a: the last section has no extraction', 'a: a connector after the last section']);
  });

  it('(sector-redesign G3 / G20) guards: everyone armed, no heavies, dogs only by the section allowance and with a handler', () => {
    const g = (kind: SectorDef['guards'][number]['kind'], handler?: number): SectorDef['guards'][number] => ({ kind, x: 0, z: 0, yaw: 0, takedownSpot: [0, 0], ...(handler !== undefined ? { handler } : {}) });
    const sec = (guards: SectorDef['guards'], dogs?: number): SectorDef => ({ ...def('s', 0, true), guards, ...(dogs !== undefined ? { dogs } : {}) });
    // every armed kind passes but the riot shield (guard-rules S1: shields only lead alert response teams, G307 (3))
    for (const k of ['grunt', 'officer', 'sniper', 'droneOp', 'runner'] as const) expect(checkSectorGuards(sec([g(k)])), k).toEqual([]);
    expect(checkSectorGuards(sec([g('grunt'), g('enforcer')]))).toEqual(['s: guard 1 is a riot shield (only in alert response teams, G307)']);
    // M1: no melee-only guards; G155: no heavies
    // (guard-ai runner-armed) no shipped human kind lacks a gun since G298: a stand-in def keeps the M1 rule tested
    const keep = ENEMIES.runner;
    ENEMIES.runner = { ...keep, weapon: null, gun: null };
    try {
      expect(checkSectorGuards(sec([g('runner')]))).toEqual(['s: guard 0 (runner) carries no gun (M1)']);
      expect(checkSectorGuards(sec([g('runner'), g('dog', 0)], 1))).toEqual(['s: guard 0 (runner) carries no gun (M1)', "s: dog 1's handler 0 is not an armed human guard"]);
      // checkSectors runs it on every section
      expect(checkSectors([sec([g('runner')])])).toContain('s: guard 0 (runner) carries no gun (M1)');
    } finally {
      ENEMIES.runner = keep;
    }
    expect(checkSectorGuards(sec([g('heavy')]))).toEqual(['s: guard 0 is a heavy (G155)']);
    // dogs: none by default; allowed by `dogs`, each with an armed human handler of the section
    expect(checkSectorGuards(sec([g('grunt'), g('dog', 0)]))).toEqual(['s: 1 dogs, the section allows 0']);
    expect(checkSectorGuards(sec([g('grunt'), g('dog', 0)], 1))).toEqual([]);
    expect(checkSectorGuards(sec([g('grunt'), g('dog', 0), g('dog', 0)], 1))).toEqual(['s: 2 dogs, the section allows 1']);
    expect(checkSectorGuards(sec([g('grunt'), g('dog')], 1))).toEqual(['s: dog 1 has no handler']);
    expect(checkSectorGuards(sec([g('grunt'), g('dog', 5)], 1))).toEqual(['s: dog 1 has no handler']);
    expect(checkSectorGuards(sec([g('dog', 1), g('dog', 0)], 2))).toEqual(["s: dog 0's handler 1 is not an armed human guard", "s: dog 1's handler 0 is not an armed human guard"]);
    // the reinforcements are armed guards, not heavies (G155)
    expect(SECTOR_REINFORCE_KIND).toBe('grunt');
    expect(ENEMIES[SECTOR_REINFORCE_KIND].weapon).toBeTruthy();
    expect(ENEMIES[SECTOR_REINFORCE_KIND].melee).toBeNull();
  });

  it('(guard-rules S1, A15) gear tags: a helmet never comes from data (slot or section); armour passes', () => {
    const g = (gear?: GearTag): SectorDef['guards'][number] => ({ kind: 'grunt', x: 0, z: 0, yaw: 0, takedownSpot: [0, 0], ...(gear ? { gear } : {}) });
    const sec = (guards: SectorDef['guards'], gear?: GearTag): SectorDef => ({ ...def('s', 0, true), guards, ...(gear ? { gear } : {}) });
    expect(checkSectorGuards(sec([g('helmet')]))).toEqual(["s: guard 0 gear 'helmet' names a helmet (helmets come from difficulty and stage, G350)"]);
    expect(checkSectorGuards(sec([g(), g('both')]))).toEqual(["s: guard 1 gear 'both' names a helmet (helmets come from difficulty and stage, G350)"]);
    expect(checkSectorGuards(sec([g()], 'helmet'))).toEqual(["s: section gear 'helmet' names a helmet (helmets come from difficulty and stage, G350)"]);
    expect(checkSectorGuards(sec([g()], 'both'))).toEqual(["s: section gear 'both' names a helmet (helmets come from difficulty and stage, G350)"]);
    expect(checkSectorGuards(sec([g('armour'), g()], 'armour'))).toEqual([]);
    expect(checkSectorGuards(sec([g(), g()]))).toEqual([]);
    // checkSectors runs it on every section
    expect(checkSectors([sec([g('helmet')])])).toContain("s: guard 0 gear 'helmet' names a helmet (helmets come from difficulty and stage, G350)");
  });

  it('alarm stages cap and send reinforcements per stage (the section perStage)', () => {
    expect(alarmStep(0, 3)).toEqual({ stage: 1, send: 3 });
    expect(alarmStep(SECTOR.alarmMax, 3)).toEqual({ stage: SECTOR.alarmMax, send: 0 });
    let s = 0;
    let sent = 0;
    for (let i = 0; i < 5; i++) {
      const a = alarmStep(s);
      s = a.stage;
      sent += a.send;
    }
    expect(s).toBe(SECTOR.alarmMax);
    expect(sent).toBe(SECTOR.alarmMax * SECTOR.perStage);
  });

  it('Ghost needs no kills and never spotted', () => {
    expect(sectorResult({ time: 125, kills: 0, spotted: 0 })).toEqual({ ghost: true, perfect: false, line: 'Time 2:05  ·  Kills 0  ·  Spotted 0  ·  GHOST' });
    expect(sectorResult({ time: 60, kills: 1, spotted: 0 }).ghost).toBe(false);
    expect(sectorResult({ time: 60, kills: 0, spotted: 2 }).ghost).toBe(false);
    expect(fmtTime(59.9)).toBe('0:59');
  });

  it('difficulty numbers: syringes per preset (A10), the live cap within the wire cap, no lives (M7)', () => {
    expect(DIFFICULTIES.map((d) => SECTOR.syringes[d])).toEqual([3, 2, 1, 1]);
    expect(SECTOR.maxAlive).toBe(32);
    expect(SECTOR.maxAlive).toBeLessThanOrEqual(MAX_ENEMIES);
    expect('lives' in SECTOR).toBe(false);
  });
});

