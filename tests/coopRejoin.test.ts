import { afterEach, describe, expect, it } from 'vitest';
import type { WeaponId } from '../src/weapons/weaponDefs';
import { NetSession, type StartInfo } from '../src/net/session';
import type { Transport } from '../src/net/transport';
import { defaultLook } from '../src/cosmetics/avatarLook';
import { PROTOCOL_VERSION } from '../src/net/protocol';
import { clearRejoin } from '../src/core/rejoin';
import { courseSlotPoints, courseStartCheckpoint } from '../src/game/modes/courseMode';
import type { GameState } from '../src/game/gameState';
import { SectorRun, SECTOR, type ConnectorInput, type SectorDef } from '../src/game/sectors';
import { LevelBuilder } from '../src/world/levelBuilder';
import { buildCtcourse } from '../src/world/maps/ctcourse';
import { layoutKnownIds, validateCourse, type CourseDef } from '../src/game/course/courseDef';
import { startSlotPoints } from '../src/game/spawnPlace';
import { clearOfBodies, joinSpawn, slotSpawn, SPAWN, type SlotPoint, type SpawnProbe } from '../src/game/spawnSlots';
import { SightWorld } from '../src/game/sectorCheck';
import { hyp2 } from '../src/core/mathx';

/** (coop-rejoin, walk item 7) The host's side of a mid-run join: the `late` event, the start at the current bay, which
 *  checkpoint a (re)joining client gets, the partner's slot in map data. */

function hub() {
  const peers = new Map<string, Transport & { deliver(m: unknown, from: string): void }>();
  const make = (id: string) => {
    const t = {
      selfId: id,
      onMessage: null as Transport['onMessage'],
      onPeerJoin: null as Transport['onPeerJoin'],
      onPeerLeave: null as Transport['onPeerLeave'],
      send(msg: unknown, to?: string) {
        const raw = JSON.parse(JSON.stringify(msg)) as unknown;
        for (const [pid, p] of peers) if (pid !== id && (!to || to === pid)) p.deliver(raw, id);
      },
      deliver(m: unknown, from: string) {
        t.onMessage?.(m, from);
      },
      peers: () => [...peers.keys()].filter((p) => p !== id),
      async leave() {
        peers.delete(id);
        for (const p of peers.values()) p.onPeerLeave?.(id);
      },
    };
    for (const p of peers.values()) p.onPeerJoin?.(id);
    peers.set(id, t);
    return t;
  };
  return { make };
}
const prof = (name: string) => ({ name, tag: { title: 'Rookie', color: '#ff8a1e', emblem: 'chevron' }, look: defaultLook(), loadout: ['rifle', 'pistolSd'] as WeaponId[] });
const sessions: NetSession[] = [];
const sess = (...a: ConstructorParameters<typeof NetSession>): NetSession => {
  const s = new NetSession(...a);
  sessions.push(s);
  return s;
};
afterEach(async () => {
  for (const s of sessions.splice(0)) await s.leave();
  clearRejoin();
});

describe('the match going to one client again (late)', () => {
  it('a late join: the host hears `late`; a course start goes at the current bay (lateBay), the room start unchanged', () => {
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    host.setSettings('course', 'ctcourse', 'normal', '');
    const first = host.startMatch();
    expect(first?.bay).toBe(1);
    const late: string[] = [];
    host.events.on('late', (e) => late.push(e.id));
    host.lateBay = () => 3;
    const c = sess(h.make('C1'), 'client', 'ABCDE', prof('Cli'), 'tokA');
    let got: StartInfo | null = null;
    c.events.on('start', (s) => (got = s));
    // its tokenless hello reached the host on join (the hub delivers at once); the token hello is the same player
    c.transport.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'Cli', tag: {}, look: {}, tok: 'tokA' }, 'H');
    expect(late.length).toBeGreaterThanOrEqual(1);
    expect(late.every((id) => id === 'C1')).toBe(true);
    expect(got).not.toBeNull();
    expect(got!.bay).toBe(3);
    expect(got!.mode).toBe('course');
  });

  it('no lateBay (or not the course): the match start as it was', () => {
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    host.setSettings('test', 'chamber', 'normal');
    host.lateBay = () => 4;
    host.startMatch();
    const c = sess(h.make('C1'), 'client', 'ABCDE', prof('Cli'), 'tokA');
    let got: StartInfo | null = null;
    c.events.on('start', (s) => (got = s));
    c.transport.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'Cli', tag: {}, look: {}, tok: 'tokA' }, 'H');
    expect(got!.bay).toBe(1);
  });

  it('a held joiner coming back: `rejoin` then `late` for the same player id', async () => {
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    host.setSettings('course', 'ctcourse', 'normal', '');
    const c1 = sess(h.make('C1'), 'client', 'ABCDE', prof('Cli'), 'tokA');
    host.startMatch();
    const seen: string[] = [];
    host.events.on('rejoin', (e) => seen.push(`rejoin:${e.id}`));
    host.events.on('late', (e) => seen.push(`late:${e.id}`));
    await c1.transport.leave();
    expect(host.players.get('C1')?.away).toBe(true);
    const c2 = sess(h.make('C2'), 'client', 'ABCDE', prof('Cli'), 'tokA');
    c2.transport.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'Cli', tag: {}, look: {}, tok: 'tokA' }, 'H');
    expect(seen).toContain('rejoin:C1');
    expect(seen.indexOf('rejoin:C1')).toBeLessThan(seen.lastIndexOf('late:C1'));
    expect(seen.some((e) => e === 'late:C2')).toBe(false);
  });

  it('nothing in the lobby: no `late`', () => {
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    const late: string[] = [];
    host.events.on('late', (e) => late.push(e.id));
    sess(h.make('C1'), 'client', 'ABCDE', prof('Cli'), 'tokA');
    expect(late).toEqual([]);
  });
});

describe('which checkpoint a (re)joining client gets', () => {
  const b = new LevelBuilder();
  const lay = buildCtcourse(b).layout;
  const def = lay.course!.def;
  const fake = (yaw = 0.4): GameState => ({ world: { layout: lay }, player: { cam: { yaw } } }) as unknown as GameState;

  it('Course: the start checkpoint is the map spawns (two slots); an airlock checkpoint is that airlock (one point: its middle)', () => {
    const g = fake();
    const s = courseSlotPoints(g, 'start');
    expect(s.length).toBe(2);
    expect(s[0]).toMatchObject({ x: lay.playerSpawns[0]!.pos.x, z: lay.playerSpawns[0]!.pos.z });
    expect(s[1]).toMatchObject({ x: lay.playerSpawns[1]!.pos.x, z: lay.playerSpawns[1]!.pos.z });
    const a = def.airlocks[2]!;
    const p = courseSlotPoints(g, a.id);
    expect(p[0]!.x).toBeCloseTo((a.box[0] + a.box[2]) / 2, 5);
    expect(p[0]!.z).toBeCloseTo((a.box[1] + a.box[3]) / 2, 5);
    expect(p[0]!.y).toBeCloseTo(a.floorY + 0.05, 5);
    expect(p[0]!.yaw).toBe(0.4);
  });

  it('Course: a bay-N start (and so a late load at the current bay) begins at that bay\'s entry airlock, bay 1 at the start', () => {
    const g = fake();
    expect(courseStartCheckpoint(g, 1)).toBe('start');
    expect(courseStartCheckpoint(g, 3)).toBe(def.bays[2]!.entry);
    expect(courseStartCheckpoint(g, 99)).toBe(def.bays[def.bays.length - 1]!.entry);
  });

  it('Course: an airlock with two map slots gives both (Marlow Build places the second)', () => {
    const a = def.airlocks[1]!;
    const cx = (a.box[0] + a.box[2]) / 2;
    const cz = (a.box[1] + a.box[3]) / 2;
    const spawns = [{ x: cx - 0.8, z: cz, yaw: 1 }, { x: cx + 0.8, z: cz }];
    const def2: CourseDef = { ...def, airlocks: def.airlocks.map((x) => (x.id === a.id ? { ...x, spawns } : x)) };
    expect(() => validateCourse(def2, layoutKnownIds(lay.course!))).not.toThrow();
    const g = ({ world: { layout: { ...lay, course: { ...lay.course!, def: def2 } } }, player: { cam: { yaw: 2 } } }) as unknown as GameState;
    const p = courseSlotPoints(g, a.id);
    expect(p.map((q) => [q.x, q.z, q.yaw])).toEqual([[cx - 0.8, cz, 1], [cx + 0.8, cz, 2]]);
  });

  it('Course: the map data check refuses three slots, a slot outside the box and two slots on top of each other', () => {
    const a = def.airlocks[1]!;
    const cx = (a.box[0] + a.box[2]) / 2;
    const cz = (a.box[1] + a.box[3]) / 2;
    const bad = (spawns: { x: number; z: number }[]): CourseDef => ({ ...def, airlocks: def.airlocks.map((x) => (x.id === a.id ? { ...x, spawns } : x)) });
    const k = layoutKnownIds(lay.course!);
    expect(() => validateCourse(bad([{ x: cx, z: cz }, { x: cx + 1, z: cz }, { x: cx - 1, z: cz }]), k)).toThrow(/at most 2/);
    expect(() => validateCourse(bad([{ x: cx + 50, z: cz }]), k)).toThrow(/outside its box/);
    // (fix round, check B polish 3) a point on the box edge (or under a body radius in) stands in the wall
    const hi = Math.max(a.box[0], a.box[2]);
    expect(() => validateCourse(bad([{ x: hi, z: cz }]), k)).toThrow(/outside its box/);
    expect(() => validateCourse(bad([{ x: hi - 0.1, z: cz }]), k)).toThrow(/outside its box/);
    expect(() => validateCourse(bad([{ x: hi - 0.35, z: cz }]), k)).not.toThrow();
    expect(() => validateCourse(bad([{ x: cx, z: cz }, { x: cx + 0.3, z: cz }]), k)).toThrow(/overlap/);
  });

  it('Sector Ops: the run\'s checkpoint and the partner slot (`start2`, then the connector\'s `checkpoint2`) follow the section', () => {
    const pose = (x: number) => ({ x, y: 0, z: 0, yaw: 0 });
    const def = (id: string, i: number, last: boolean): SectorDef => ({
      id,
      name: id,
      start: pose(i * 100),
      ...(i === 0 ? { start2: pose(1.5) } : {}),
      objective: { kind: 'hack', label: 'x', x: 0, y: 0, z: 0, yaw: 0 },
      ...(last
        ? { extract: { label: 'out', box: [2, 2, 4, 4] as [number, number, number, number] } }
        : { connector: { label: 'on', box: [2, 2, 4, 4] as [number, number, number, number], nearAt: [2, 3] as [number, number], checkpoint: pose(i * 100 + 50), ...(i === 0 ? {} : { checkpoint2: pose(i * 100 + 51.5) }) } }),
      guards: [],
      reinforce: [[0, 0]],
      perStage: SECTOR.perStage,
      routes: [],
    });
    const r = new SectorRun([def('s1', 0, false), def('s2', 1, false), def('s3', 2, true)]);
    expect(r.checkpoint).toEqual(pose(0));
    expect(r.checkpoint2).toEqual(pose(1.5));
    const IN: ConnectorInput = { allInside: true, doorwayClear: true };
    const OUT: ConnectorInput = { allInside: false, doorwayClear: true };
    const step = (s: number, input: ConnectorInput): void => {
      for (let t = 0; t < s - 1e-9; t += 1 / 60) r.step(1 / 60, input);
    };
    r.objectiveDone();
    step(SECTOR.connectorHold + 0.05, IN);
    step(SECTOR.connectorCycle, OUT);
    // section 2 began at s1's connector, which gives no partner slot: the host places the partner beside it
    expect(r.index).toBe(1);
    expect(r.checkpoint).toEqual(pose(50));
    expect(r.checkpoint2).toBeNull();
    r.objectiveDone();
    step(SECTOR.connectorHold + SECTOR.connectorCycle + 0.1, IN);
    expect(r.index).toBe(2);
    expect(r.checkpoint).toEqual(pose(150));
    expect(r.checkpoint2).toEqual(pose(151.5));
  });
});

describe('X4 (walk item 4): the client never starts or rejoins on the host', () => {
  const b = new LevelBuilder();
  const lay = buildCtcourse(b).layout;
  const w = new SightWorld(b.boxes, b.cylinders);
  // the level pieces as the game's probe reads them (floor and line: open ground in these areas)
  const probe: SpawnProbe = { blocked: (x, y, z) => w.blocked(x, y, z, 0.3), open: () => true, floor: () => true };
  const fake = (bay: number): GameState => ({ opts: { mode: 'course', courseBay: bay }, world: { layout: lay, map: {} }, player: { cam: { yaw: 0 } } }) as unknown as GameState;
  const o = (): SlotPoint => ({ x: 0, y: 0, z: 0, yaw: 0 });

  it('(a) the bay-1 start: the host on slot 0 = playerSpawns[0] (2, 10), the client on slot 1 = playerSpawns[1] (2, 12)', () => {
    const pts = startSlotPoints(fake(1));
    expect(pts.map((p) => [p.x, p.z])).toEqual([[2, 10], [2, 12]]);
    const host = o();
    const cli = o();
    expect(slotSpawn(pts, 0, [], probe, host)).toBe('slot');
    expect(slotSpawn(pts, 1, [host], probe, cli)).toBe('slot');
    expect([host.x, host.z]).toEqual([lay.playerSpawns[0]!.pos.x, lay.playerSpawns[0]!.pos.z]);
    expect([cli.x, cli.z]).toEqual([2, 12]);
    expect(hyp2(cli.x - host.x, cli.z - host.z)).toBeGreaterThanOrEqual(SPAWN.minGap);
  });

  it('(a) a bay-N start: slot 0 the airlock point, slot 1 a clear spot beside it (no map slot yet)', () => {
    for (let n = 2; n <= lay.course!.def.bays.length; n++) {
      const pts = startSlotPoints(fake(n));
      expect(pts.length, String(n)).toBeGreaterThanOrEqual(1);
      const cli = o();
      expect(slotSpawn(pts, 1, [pts[0]!], probe, cli), String(n)).not.toBe('base');
      expect(hyp2(cli.x - pts[0]!.x, cli.z - pts[0]!.z), String(n)).toBeGreaterThanOrEqual(SPAWN.minGap);
      expect(w.blocked(cli.x, cli.y, cli.z, 0.3), String(n)).toBe(false);
    }
  });

  it('(b) a (re)joining client goes to a free slot: the host standing on slot 1 sends it beside, clear of the host', () => {
    const pts = startSlotPoints(fake(1));
    const host: SlotPoint = { ...pts[1]! };
    const cli = o();
    const k = joinSpawn({ sectioned: true, checkpoint: pts, reachable: () => true, host, others: [host], probe }, 1, null, cli);
    expect(k).toBe('checkpoint');
    expect(clearOfBodies(cli.x, cli.y, cli.z, [host])).toBe(true);
    expect(w.blocked(cli.x, cli.y, cli.z, 0.3)).toBe(false);
    // the host off the slots: the client takes slot 1 itself
    const away: SlotPoint = { x: 30, y: 0, z: 30, yaw: 0 };
    expect(joinSpawn({ sectioned: true, checkpoint: pts, reachable: () => true, host: away, others: [away], probe }, 1, null, cli)).toBe('checkpoint');
    expect([cli.x, cli.z]).toEqual([2, 12]);
  });
});
