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
  exitZone,
  fmtTime,
  inDoorway,
  inZone,
  sectorResult,
  type ConnectorInput,
  type SectorDef,
} from '../src/game/sectors';
import { DIFFICULTIES } from '../src/ai/archetypes';
import { MAX_ENEMIES } from '../src/net/protocol';
import { WAREHOUSE_OPS_LASERS, WAREHOUSE_OPS_SECURITY, WAREHOUSE_SECTORS } from '../src/world/maps/warehouseSectors';
import { warehouseOps } from '../src/world/maps/warehouseOps';
import { LevelBuilder } from '../src/world/levelBuilder';
import { validateSecurity } from '../src/security/data';
import { SightWorld, distToGuard, spotSeenBy, CHECK_RANGE } from '../src/game/sectorCheck';
import { hyp2 } from '../src/core/mathx';

// (feature/sector-ops slice 2 step 1) sections, connectors, the run, no lives (M7)

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
    expect(sectorResult({ time: 125, kills: 0, spotted: 0 })).toEqual({ ghost: true, line: 'Time 2:05  ·  Kills 0  ·  Spotted 0  ·  GHOST' });
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

// (feature/sector-ops slice 2 step 2) the Warehouse in three sections (A12), M8: routes and out-of-sight takedowns
describe('the Warehouse sections (A12, M8)', () => {
  const S = WAREHOUSE_SECTORS;
  const b = new LevelBuilder();
  warehouseOps.build(b, 0);
  const world = new SightWorld(b.boxes, b.cylinders);

  it('three sections: valid data, each objective kind once, guard counts rise or hold', () => {
    expect(S.map((s) => s.id)).toEqual(['service', 'racking', 'floor']);
    expect(checkSectors(S)).toEqual([]);
    expect(S.map((s) => s.objective.kind).sort()).toEqual(['download', 'grab', 'hack']);
    for (let i = 1; i < S.length; i++) expect(S[i]!.guards.length).toBeGreaterThanOrEqual(S[i - 1]!.guards.length);
    // a later section starts at the previous connector's checkpoint
    for (let i = 1; i < S.length; i++) expect(S[i]!.start).toEqual(S[i - 1]!.connector!.checkpoint);
    for (const s of S) {
      expect(s.guards.length).toBeGreaterThanOrEqual(8);
      // the live cap holds a section's guards and every alarm stage's reinforcements
      expect(s.guards.length + SECTOR.alarmMax * s.perStage).toBeLessThanOrEqual(SECTOR.maxAlive);
      expect(s.reinforce.length).toBeGreaterThan(0);
    }
    expect(S.map((s) => s.perStage)).toEqual([2, 2, 3]);
  });

  it('every guard slot is at least 7 m from its section start (SPAWN_MIN_DIST)', () => {
    for (const s of S) for (const g of s.guards) expect(hyp2(g.x - s.start.x, g.z - s.start.z), `${s.id} ${g.x},${g.z}`).toBeGreaterThanOrEqual(7);
  });

  it('every section has at least 2 routes (M8): from the start, past the objective, into the exit', () => {
    for (const s of S) {
      expect(s.routes.length, s.id).toBeGreaterThanOrEqual(2);
      const exit = exitZone(s)!;
      const reach = s.objective.kind === 'download' ? SECTOR.downloadRange : 1.6;
      for (const r of s.routes) {
        const first = r.pts[0]!;
        const last = r.pts[r.pts.length - 1]!;
        const at = r.pts[r.obj]!;
        expect(hyp2(first[0] - s.start.x, first[1] - s.start.z), r.name).toBeLessThan(0.5);
        expect(hyp2(at[0] - s.objective.x, at[1] - s.objective.z), r.name).toBeLessThanOrEqual(reach);
        expect(inZone(exit, last[0], last[2] ?? exit.floorY ?? 0, last[1]), r.name).toBe(true);
        for (const k of r.climbs ?? []) expect(k >= 0 && k + 1 < r.pts.length, r.name).toBe(true);
      }
      // the routes are different ways (no two the same list of points)
      expect(new Set(s.routes.map((r) => JSON.stringify(r.pts))).size).toBe(s.routes.length);
    }
  });

  it('M8: every guard has a takedown spot by its post or route that no other guard sees within 15 m', () => {
    for (const s of S) {
      for (let i = 0; i < s.guards.length; i++) {
        const g = s.guards[i]!;
        const [x, z] = g.takedownSpot;
        const tag = `${s.id} guard ${i} (${g.x}, ${g.z})`;
        expect(distToGuard(g, x, z), tag).toBeLessThanOrEqual(1.6);
        expect(world.blocked(x, g.y ?? 0, z, 0.3), tag).toBe(false);
        const seen = spotSeenBy(world, x, g.y ?? 0, z, s.guards, i, CHECK_RANGE);
        expect(seen, `${tag}: seen by guard ${seen}`).toBe(-1);
      }
    }
  });

  it('devices by section: cameras 2 / 2 / 3, lasers 2 / 1 / 2, valid camera data', () => {
    expect(validateSecurity(WAREHOUSE_OPS_SECURITY)).toEqual([]);
    const cams = [0, 1, 2].map((k) => WAREHOUSE_OPS_SECURITY.devices.filter((d) => d.section === k).length);
    const lasers = [0, 1, 2].map((k) => WAREHOUSE_OPS_LASERS.filter((l) => l.section === k).length);
    expect(cams).toEqual([2, 2, 3]);
    expect(lasers).toEqual([2, 1, 2]);
    expect(WAREHOUSE_OPS_SECURITY.devices.every((d) => d.section !== undefined)).toBe(true);
    expect(WAREHOUSE_OPS_LASERS.every((l) => l.section !== undefined)).toBe(true);
  });

  it('the connector rooms: a door at each near and far doorway, and the side door off C3', () => {
    const doors = (b as unknown as { anchors: { doors: { hinge: { x: number; z: number }; width: number; yaw: number; locked: boolean }[] } }).anchors.doors;
    const at = (x: number, z: number): number =>
      doors.filter((d) => hyp2(d.hinge.x + Math.sin(d.yaw) * d.width * 0.5 - x, d.hinge.z + Math.cos(d.yaw) * d.width * 0.5 - z) < 0.3).length;
    for (const s of S) {
      const c = s.connector;
      if (!c) continue;
      expect(at(c.nearAt![0], c.nearAt![1]), `${s.id} near`).toBe(1);
      expect(at(c.farAt![0], c.farAt![1]), `${s.id} far`).toBe(1);
      for (const k of c.sealUnlocks ?? []) expect(at(k[0], k[1])).toBe(1);
      // the checkpoint is inside the room, clear of the near doorway
      expect(inZone(c, c.checkpoint.x, c.checkpoint.y, c.checkpoint.z)).toBe(true);
      expect(inDoorway(c, c.checkpoint.x, c.checkpoint.z)).toBe(false);
    }
  });
});
