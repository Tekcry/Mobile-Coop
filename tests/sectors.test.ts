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
import { MAX_ENEMIES } from '../src/net/protocol';
import { WAREHOUSE_OPS_LASERS, WAREHOUSE_OPS_SECURITY, WAREHOUSE_SECTORS } from '../src/world/maps/warehouseSectors';
import { warehouseOps } from '../src/world/maps/warehouseOps';
import { warehouse } from '../src/world/maps/warehouse';
import { LevelBuilder } from '../src/world/levelBuilder';
import { validateSecurity } from '../src/security/data';
import { SightWorld, distToGuard, spotSeenBy, longestIsolation, isolatedInTime, worstIsolationOverPhases, CHECK_RANGE, CHECK_ISOLATION, CHECK_PATROL_PACE, CHECK_SPOT, type CheckGuard } from '../src/game/sectorCheck';
import { ENEMIES } from '../src/ai/enemyDefs';
import { S1_ROOMS } from '../src/world/maps/warehouseS1';
import { S2_ROOMS } from '../src/world/maps/warehouseS2';
import { S3_ROOMS } from '../src/world/maps/warehouseS3';
import { roomAt } from '../src/world/rooms';
import { hyp2 } from '../src/core/mathx';
import { PATROL } from '../src/ai/patrol';

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
    // every armed kind passes
    for (const k of ['grunt', 'officer', 'enforcer', 'sniper', 'droneOp'] as const) expect(checkSectorGuards(sec([g(k)])), k).toEqual([]);
    // M1: no melee-only guards; G155: no heavies
    expect(checkSectorGuards(sec([g('runner')]))).toEqual(['s: guard 0 (runner) carries no gun (M1)']);
    expect(checkSectorGuards(sec([g('heavy')]))).toEqual(['s: guard 0 is a heavy (G155)']);
    // dogs: none by default; allowed by `dogs`, each with an armed human handler of the section
    expect(checkSectorGuards(sec([g('grunt'), g('dog', 0)]))).toEqual(['s: 1 dogs, the section allows 0']);
    expect(checkSectorGuards(sec([g('grunt'), g('dog', 0)], 1))).toEqual([]);
    expect(checkSectorGuards(sec([g('grunt'), g('dog', 0), g('dog', 0)], 1))).toEqual(['s: 2 dogs, the section allows 1']);
    expect(checkSectorGuards(sec([g('grunt'), g('dog')], 1))).toEqual(['s: dog 1 has no handler']);
    expect(checkSectorGuards(sec([g('grunt'), g('dog', 5)], 1))).toEqual(['s: dog 1 has no handler']);
    expect(checkSectorGuards(sec([g('dog', 1), g('dog', 0)], 2))).toEqual(["s: dog 0's handler 1 is not an armed human guard", "s: dog 1's handler 0 is not an armed human guard"]);
    expect(checkSectorGuards(sec([g('runner'), g('dog', 0)], 1))).toEqual(['s: guard 0 (runner) carries no gun (M1)', "s: dog 1's handler 0 is not an armed human guard"]);
    // checkSectors runs it on every section
    expect(checkSectors([sec([g('runner')])])).toContain('s: guard 0 (runner) carries no gun (M1)');
    // the reinforcements are armed guards, not heavies (G155)
    expect(SECTOR_REINFORCE_KIND).toBe('grunt');
    expect(ENEMIES[SECTOR_REINFORCE_KIND].weapon).toBeTruthy();
    expect(ENEMIES[SECTOR_REINFORCE_KIND].melee).toBeNull();
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

  /** The section's guards as the time check reads them: walk speed from the archetype table, the patrol pace on top. */
  const timed = (guards: SectorDef['guards']): CheckGuard[] => guards.map((g) => ({ ...g, speed: ENEMIES[g.kind].walkSpeed * CHECK_PATROL_PACE }));

  it('M8: every guard has a takedown spot by its post or route that no other guard sees within 15 m, or 3 s of isolation in a row on its timed patrol (A2)', () => {
    for (const s of S) {
      const gs = timed(s.guards);
      for (let i = 0; i < s.guards.length; i++) {
        const g = s.guards[i]!;
        const [x, z] = g.takedownSpot;
        const tag = `${s.id} guard ${i} (${g.x}, ${g.z})`;
        expect(distToGuard(g, x, z), tag).toBeLessThanOrEqual(CHECK_SPOT);
        expect(world.blocked(x, g.y ?? 0, z, 0.3), tag).toBe(false);
        const seen = spotSeenBy(world, x, g.y ?? 0, z, s.guards, i, CHECK_RANGE);
        // the static check (sections 2 and 3) or isolation in time at the spot (section 1, SPEC 6 C1)
        expect(seen === -1 || isolatedInTime(world, gs, i, g.takedownSpot), `${tag}: seen by guard ${seen} and no ${CHECK_ISOLATION} s of isolation at its spot (${longestIsolation(world, gs, i, CHECK_RANGE, g.takedownSpot)} s)`).toBe(true);
      }
    }
  });

  it('sections 1-3 A2 survive patrol phase drift: every guard keeps CHECK_ISOLATION s at its spot under 30 random start phases', () => {
    for (const s of S) {
      const gs = timed(s.guards);
      for (let i = 0; i < gs.length; i++) {
        const g = s.guards[i]!;
        if (spotSeenBy(world, g.takedownSpot[0], g.y ?? 0, g.takedownSpot[1], s.guards, i, CHECK_RANGE) === -1) continue;
        expect(worstIsolationOverPhases(world, gs, i, g.takedownSpot, 30, 7), `${s.id} guard ${i} (${g.x}, ${g.z})`).toBeGreaterThanOrEqual(CHECK_ISOLATION);
      }
    }
  });

  it('time model: the default pause is PATROL.wait (as in play), start sets the phase, a mezzanine 2.6 m up is another floor', () => {
    const open = new SightWorld([], []);
    // a walker that goes 40 m out and back: with no wait the default pause (PATROL.wait) is 9 s; the watcher sees 0..15 m
    const base: CheckGuard = { x: 0, z: 0, route: [[0, 0], [40, 0]], speed: 10 };
    const watcher: CheckGuard = { x: 0, z: 0.5 };
    const dflt = longestIsolation(open, [base, watcher], 0);
    const explicit = longestIsolation(open, [{ ...base, wait: PATROL.wait }, watcher], 0);
    expect(dflt).toBe(explicit);
    expect(longestIsolation(open, [{ ...base, wait: 2.5 }, watcher], 0)).not.toBe(dflt);
    // start: pausing at the far point with 8 s to go: isolated from t = 0, so the first run is longer than from the first point
    const late = longestIsolation(open, [{ ...base, wait: 9, start: { idx: 1, wait: 8 } }, watcher], 0, CHECK_RANGE, null, 12);
    const early = longestIsolation(open, [{ ...base, wait: 9 }, watcher], 0, CHECK_RANGE, null, 12);
    expect(late).toBeGreaterThan(early);
    // floors: a watcher 2.6 m above never sees; 1.5 m above does
    expect(longestIsolation(open, [{ x: 0, z: 0 }, { x: 3, z: 0, y: 2.6 }], 0)).toBeGreaterThanOrEqual(180);
    expect(longestIsolation(open, [{ x: 0, z: 0 }, { x: 3, z: 0, y: 1.5 }], 0)).toBe(0);
  });

  it('M8 in time (A2): the model walks routes with waits, ping-pongs two points, loops three, and needs 3 s in a row', () => {
    const open = new SightWorld([], []);
    const wall = new SightWorld([{ c: [0, 1.5, 0], s: [0.2, 3, 40], yaw: 0, pitch: 0, collide: true }], []);
    // a post 13 m from a lone guard, no wall: never isolated; behind a wall: always
    const post: CheckGuard = { x: 5, z: 0 };
    const lone: CheckGuard = { x: -8, z: 0 };
    expect(longestIsolation(open, [lone, post], 0)).toBe(0);
    expect(longestIsolation(wall, [lone, post], 0)).toBeGreaterThanOrEqual(180);
    // out of range is isolated too
    expect(longestIsolation(open, [lone, { x: 30, z: 0 }], 0)).toBeGreaterThanOrEqual(180);
    // a walker that leaves a watcher's 15 m range: 10 m/s east from x 0, watcher at the origin, wait 10 s at each end
    const walker: CheckGuard = { x: 0, z: 0, route: [[0, 0], [40, 0]], wait: 10, speed: 10 };
    const watcher: CheckGuard = { x: 0, z: 0.5 };
    // it stands 10 s at the start (seen), runs out of range in 1.5 s, pauses 10 s at x 40 and walks back in: about 15 s of isolation
    const run = longestIsolation(open, [walker, watcher], 0);
    expect(run).toBeGreaterThan(10);
    expect(run).toBeLessThan(20);
    expect(isolatedInTime(open, [walker, watcher], 0)).toBe(true);
    // the same walker, held to a spot at the start: always seen
    expect(isolatedInTime(open, [walker, watcher], 0, [0, 0])).toBe(false);
    // three points loop (the way back is the first point), two ping-pong: both cycle within the horizon
    const loop: CheckGuard = { x: 0, z: 0, route: [[0, 0], [40, 0], [40, 40]], wait: 1, speed: 10 };
    expect(longestIsolation(open, [loop, watcher], 0)).toBeGreaterThan(3);
  });

  it('section 1 (warehouse-redesign): the start and spawns in the yard corner, the DVR reachable, eight guards in the first-four order', () => {
    const s = S[0]!;
    expect(s.start).toEqual({ x: -20, y: 0, z: -24.6, yaw: 0.5 });
    const lay = warehouseOps.build(new LevelBuilder(), 0);
    expect(lay.playerSpawns.length).toBe(4);
    for (const sp of lay.playerSpawns) {
      expect(hyp2(sp.pos.x - s.start.x, sp.pos.z - s.start.z), 'spawn near the start').toBeLessThan(1.5);
      expect(world.blocked(sp.pos.x, 0, sp.pos.z, 0.35)).toBe(false);
    }
    // the e2e stands 0.9 m east of the DVR: free floor, inside the download range, and nothing else to take the A press
    // (the context menu: no door within 1.6 m, no guard within the takedown reach 1.8 m)
    const sx = s.objective.x + 0.9;
    for (const d of (b as unknown as { anchors: { doors: { hinge: { x: number; z: number } }[] } }).anchors.doors) expect(hyp2(d.hinge.x - sx, d.hinge.z - s.objective.z), 'door by the DVR stand').toBeGreaterThan(1.6);
    for (const g of s.guards.slice(0, 4)) expect(hyp2(g.x - sx, g.z - s.objective.z), 'guard by the DVR stand').toBeGreaterThan(1.8);
    expect(world.blocked(s.objective.x + 0.9, 0, s.objective.z, 0.3)).toBe(false);
    expect(0.9).toBeLessThan(SECTOR.downloadRange);
    expect(s.guards.length).toBe(8);
    // ?sectorGuards=4 takes the first four: the gate officer, the yard patrol, the checker and the CCTV operator (no heavies, G155;
    // the yard patrol was a melee runner, armed as a grunt by sector-redesign G3)
    expect(s.guards.slice(0, 4).map((g) => g.kind)).toEqual(['officer', 'grunt', 'officer', 'officer']);
    // (sector-redesign G3 / G20) everyone armed, no heavies (G155), no sniper here, dogs only where the section allows them
    expect(s.guards.some((g) => g.kind === 'sniper')).toBe(false);
    expect(checkSectorGuards(s)).toEqual([]);
    // the rooms: none of the old south band's, none overlapping the section 3 floor
    const ids = (lay.rooms ?? []).map((r) => r.id);
    for (const gone of ['dock', 'dispatch', 'corridor']) expect(ids).not.toContain(gone);
    expect(ids.filter((id) => id === 'workshop').length).toBe(1);
    for (const r of S1_ROOMS) expect(ids, r.id).toContain(r.id);
    expect(lay.objectives.some((o) => o.id === 'termB' || o.id === 'extract')).toBe(false);
  });

  it('section 2 (warehouse-s23): starts at the C2 checkpoint, eight guards in the first-four order, the cage objective reachable', () => {
    const s = S[1]!;
    expect(s.id).toBe('racking');
    expect(s.start).toEqual(S[0]!.connector!.checkpoint);
    expect(s.guards.length).toBe(8);
    // ?sectorGuards=4 takes the checker, the reach driver, the stocktaker and the cage officer (no heavies, G155)
    expect(s.guards.slice(0, 4).map((g) => g.kind)).toEqual(['grunt', 'grunt', 'officer', 'officer']);
    // (sector-redesign G3 / G20) everyone armed, no heavies (G155), no sniper here, dogs only where the section allows them
    expect(s.guards.some((g) => g.kind === 'sniper')).toBe(false);
    expect(checkSectorGuards(s)).toEqual([]);
    // the e2e stands 0.9 m east of the case: free floor, no door within 1.6 m (the context menu), no first-four guard within 1.8 m
    const sx = s.objective.x + 0.9;
    expect(world.blocked(sx, 0, s.objective.z, 0.3)).toBe(false);
    for (const d of (b as unknown as { anchors: { doors: { hinge: { x: number; z: number } }[] } }).anchors.doors) expect(hyp2(d.hinge.x - sx, d.hinge.z - s.objective.z), 'door by the case stand').toBeGreaterThan(1.6);
    for (const g of s.guards.slice(0, 4)) expect(hyp2(g.x - sx, g.z - s.objective.z), 'guard by the case stand').toBeGreaterThan(1.8);
    // the rooms: the old racking is gone, the storage hall and the cage are in, the case is inside the cage
    const lay = warehouseOps.build(new LevelBuilder(), 0);
    const ids = (lay.rooms ?? []).map((r) => r.id);
    expect(ids).not.toContain('racking');
    for (const r of S2_ROOMS) expect(ids, r.id).toContain(r.id);
    expect(ids).toContain('storage');
    expect(ids).toContain('hvCage');
    const cage = S2_ROOMS.find((r) => r.id === 'hvCage')!;
    expect(s.objective.x >= cage.minX && s.objective.x <= cage.maxX && s.objective.z >= cage.minZ && s.objective.z <= cage.maxZ).toBe(true);
    // every route's grab point is the same free floor spot inside the cage
    for (const r of s.routes) expect(world.blocked(r.pts[r.obj]![0], 0, r.pts[r.obj]![1], 0.3), r.name).toBe(false);
  });

  it('section 3 (warehouse-s23): starts at the C3 checkpoint, nine guards in the first-four order, the terminal and the lobby reachable', () => {
    const s = S[2]!;
    expect(s.id).toBe('floor');
    expect(s.start).toEqual(S[1]!.connector!.checkpoint);
    expect(s.extract?.label).toBe('Extract by the east fire exit');
    expect(s.extract?.box).toEqual([21.4, -8.5, 23.7, -5.9]);
    expect(s.guards.length).toBe(9);
    // ?sectorGuards=4 takes the porter, the loader, the clerk and the tour guard (no heavies, G155; the tour guard armed, G3)
    expect(s.guards.slice(0, 4).map((g) => g.kind)).toEqual(['grunt', 'grunt', 'officer', 'grunt']);
    // (sector-redesign G3 / G20) everyone armed, no heavies (G155), no sniper here, dogs only where the section allows them
    expect(s.guards.some((g) => g.kind === 'sniper')).toBe(false);
    expect(checkSectorGuards(s)).toEqual([]);
    // the e2e stands 0.9 m east of the terminal, on the deck: free, no door within 1.6 m, no first-four guard within 1.8 m
    const sx = s.objective.x + 0.9;
    expect(world.blocked(sx, 3.3, s.objective.z, 0.3)).toBe(false);
    for (const d of (b as unknown as { anchors: { doors: { hinge: { x: number; z: number } }[] } }).anchors.doors) expect(hyp2(d.hinge.x - sx, d.hinge.z - s.objective.z), 'door by the terminal stand').toBeGreaterThan(1.6);
    for (const g of s.guards.slice(0, 4)) expect(hyp2(g.x - sx, g.z - s.objective.z), 'guard by the terminal stand').toBeGreaterThan(1.8);
    // the extraction: the box centre is free floor with no guard slot within 1.8 m
    const bx = s.extract!.box;
    const ex = (bx[0] + bx[2]) / 2;
    const ez = (bx[1] + bx[3]) / 2;
    expect(world.blocked(ex, 0, ez, 0.3)).toBe(false);
    for (const g of s.guards) expect(hyp2(g.x - ex, g.z - ez), 'guard by the extraction').toBeGreaterThan(1.8);
    // the rooms: every section 3 room is in, the old mezzanine is not; the terminal is on the production office's storey, the exit in the lobby
    const lay = warehouseOps.build(new LevelBuilder(), 0);
    const rooms = lay.rooms ?? [];
    const ids = rooms.map((r) => r.id);
    for (const r of S3_ROOMS) expect(ids, r.id).toContain(r.id);
    expect(ids).not.toContain('mezz');
    expect(rooms[roomAt(rooms, s.objective.x, s.objective.z, s.objective.y)]?.id).toBe('prodOffice');
    expect(rooms[roomAt(rooms, ex, ez, 0)]?.id).toBe('fireLobby');
    // every route's grab point is the same free deck spot
    for (const r of s.routes) expect(world.blocked(r.pts[r.obj]![0], 3.3, r.pts[r.obj]![1], 0.3), r.name).toBe(false);
  });

  it('the plain Warehouse is unchanged by the south band switch (318 boxes, 14 cylinders, 5 doors; captured before)', () => {
    const w = new LevelBuilder();
    warehouse.build(w, 0);
    expect(w.boxes.length).toBe(318);
    expect(w.cylinders.length).toBe(14);
    expect(w.anchors.doors.length).toBe(5);
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
