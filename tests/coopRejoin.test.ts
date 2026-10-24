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
    host.setSettings('infiltration', 'warehouse', 'normal');
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

describe('coop4 N1: slots across join, leave, drop and rejoin (A18, A19)', () => {
  const hello = (s: NetSession, name: string, tok = '') => s.transport.send({ t: 'hello', v: PROTOCOL_VERSION, name, tag: {}, look: {}, tok }, 'H');
  const four = () => {
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    host.setSettings('sector', 'campusOps', 'normal', '');
    const a = sess(h.make('A'), 'client', 'ABCDE', prof('A'), 'tokA');
    const b = sess(h.make('B'), 'client', 'ABCDE', prof('B'), 'tokB');
    const c = sess(h.make('C'), 'client', 'ABCDE', prof('C'), 'tokC');
    return { h, host, a, b, c };
  };

  it('four players take slots 0-3; slots 2 and 3 drop mid-match and come back with their tokens into the same slots', async () => {
    const { h, host, b, c } = four();
    expect([host.slotOf('H'), host.slotOf('A'), host.slotOf('B'), host.slotOf('C')]).toEqual([0, 1, 2, 3]);
    host.startMatch();
    await b.transport.leave();
    await c.transport.leave();
    expect(host.players.get('B')?.away).toBe(true);
    expect(host.players.get('C')?.away).toBe(true);
    // held: their slots stay theirs
    expect(host.slotOf('B')).toBe(2);
    expect(host.slotOf('C')).toBe(3);
    // C comes back first on a new connection (its token), then B
    const c2 = sess(h.make('C2'), 'client', 'ABCDE', prof('C'), 'tokC');
    hello(c2, 'C', 'tokC');
    const b2 = sess(h.make('B2'), 'client', 'ABCDE', prof('B'), 'tokB');
    hello(b2, 'B', 'tokB');
    expect(c2.selfId).toBe('C');
    expect(b2.selfId).toBe('B');
    expect(host.players.get('B')?.away).toBe(false);
    expect(host.players.get('C')?.away).toBe(false);
    expect(host.slotOf('B')).toBe(2);
    expect(host.slotOf('C')).toBe(3);
    expect(b2.selfSlot).toBe(2);
    expect(c2.selfSlot).toBe(3);
    expect(host.players.size).toBe(4);
  });

  it('a tokenless hello in a full room with two slots held is refused ("Room is full"); with one held it takes that slot', async () => {
    const { h, host, b, c } = four();
    host.startMatch();
    await b.transport.leave();
    await c.transport.leave();
    const x = sess(h.make('X'), 'client', 'ABCDE', prof('X'));
    let full = false;
    x.events.on('full', () => (full = true));
    hello(x, 'X');
    expect(full).toBe(true);
    expect(x.mode).toBe('sector');
    expect(host.players.has('X')).toBe(false);
    // both holds end: slots 2 and 3 are free again and the next joiner takes slot 2
    host.expireAway(Date.now() + 11 * 60 * 1000);
    expect(host.players.size).toBe(2);
    const z = sess(h.make('Z'), 'client', 'ABCDE', prof('Z'));
    expect(z.selfSlot).toBe(2);
  });

  it('one slot held in a full room: a tokenless hello takes it (slot and player id)', async () => {
    const { h, host, b } = four();
    host.startMatch();
    await b.transport.leave();
    const y = sess(h.make('Y'), 'client', 'ABCDE', prof('Y'));
    hello(y, 'Y');
    expect(y.selfId).toBe('B');
    expect(y.selfSlot).toBe(2);
    expect(host.players.size).toBe(4);
  });

  it('a lobby leave frees slot 1 for the next joiner (the lowest free); slots compact at the match start', async () => {
    const { h, host, a } = four();
    await a.leave();
    expect(host.players.has('A')).toBe(false);
    expect(host.slotOf('A')).toBe(-1);
    const d = sess(h.make('D'), 'client', 'ABCDE', prof('D'));
    expect(host.slotOf('D')).toBe(1);
    expect(d.selfSlot).toBe(1);
    // a gap: B (2) leaves; C keeps 3 in the lobby, then the start closes the gap (slot order kept, host 0)
    const bs = sessions.find((s) => s.selfId === 'B')!;
    await bs.leave();
    expect(host.slotOf('C')).toBe(3);
    // (pol, net-batch P2) the client already holds its compacted slot when its `start` fires (the lobby goes first)
    const cs0 = sessions.find((s) => s.selfId === 'C')!;
    const atStart: number[] = [];
    cs0.events.on('start', () => atStart.push(cs0.selfSlot));
    host.startMatch();
    expect(atStart).toEqual([2]);
    expect([host.slotOf('H'), host.slotOf('D'), host.slotOf('C')]).toEqual([0, 1, 2]);
    const cs = sessions.find((s) => s.selfId === 'C')!;
    expect(cs.selfSlot).toBe(2);
    // the lobby list is in slot order
    expect([...cs.players.values()].map((p) => p.id)).toEqual(['H', 'D', 'C']);
    void h;
  });

  it('course: the join gate stays 2 (a third hello is refused, the refused page reads the course cap)', () => {
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    host.setSettings('course', 'ctcourse', 'normal', '');
    sess(h.make('A'), 'client', 'ABCDE', prof('A'));
    const b = sess(h.make('B'), 'client', 'ABCDE', prof('B'));
    let full = false;
    b.events.on('full', () => (full = true));
    hello(b, 'B');
    expect(full).toBe(true);
    expect(b.mode).toBe('course');
    expect(host.players.size).toBe(2);
    expect(host.slotOf('A')).toBe(1);
  });
});
