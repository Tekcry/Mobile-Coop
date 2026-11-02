import { afterEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import { flags, readMode } from '../src/core/flags';
import { loadRejoin, saveRejoin, clearRejoin, type RejoinRecord } from '../src/core/rejoin';
import { capacity, COOP_MAX, NET_MODES, parseMessage, PROTOCOL_VERSION } from '../src/net/protocol';
import { practiceMode } from '../src/game/modes/gameMode';
import { TestMode } from '../src/game/modes/testMode';
import type { GameState } from '../src/game/gameState';
import type { RoomDef, SquadSlot } from '../src/world/rooms';
import { PRACTICE_CLEAR_M, PRACTICE_RESPAWN_S, practiceDownTime, practiceDue } from '../src/game/modes/practiceGuards';
import { loadoutEntries } from '../src/weapons/loadout';
import { defaultSave } from '../src/save/schema';
import { LevelBuilder } from '../src/world/levelBuilder';
import { chamber } from '../src/world/maps/chamber';
import { getMap } from '../src/world/maps';

describe('G2a: the wire and the URL take mode "test"', () => {
  it('NET_MODES lists it, a room takes two players, and the lobby / start messages parse it', () => {
    expect(NET_MODES).toContain('test');
    expect(capacity('test')).toBe(COOP_MAX);
    const lobby = { t: 'lobby', players: [], mode: 'test', map: 'chamber', difficulty: 'normal', phase: 'lobby', mission: '', weather: 'clear' };
    expect(parseMessage(lobby)).toMatchObject({ t: 'lobby', mode: 'test', map: 'chamber' });
    expect(parseMessage({ t: 'start', mode: 'test', map: 'chamber', seed: 1, difficulty: 'normal' })).toMatchObject({ t: 'start', mode: 'test' });
    expect(parseMessage({ ...lobby, mode: 'tester' })).toBeNull();
  });
  it('the protocol is past the G1 number (read as a constant, never asserted exactly)', () => {
    expect(Number.isInteger(PROTOCOL_VERSION)).toBe(true);
    expect(PROTOCOL_VERSION).toBeGreaterThanOrEqual(87);
  });
  it('?mode=test reads as test; the removed modes and an unknown value are none', () => {
    expect(readMode('test')).toBe('test');
    for (const gone of ['hunter', 'clear', 'mission', 'infiltration']) expect(readMode(gone)).toBeNull();
    expect(readMode('sandbox')).toBe('sandbox');
    expect(readMode('tester')).toBeNull();
    expect(readMode(null)).toBeNull();
  });
  it('?guards=1 is a flag, off by default', () => {
    expect(flags.guards).toBe(false);
  });
  it('a rejoin record keeps the test mode', () => {
    const r: RejoinRecord = { code: 'ABCDE', role: 'host', at: Date.now(), mode: 'test', map: 'chamber', difficulty: 'normal', mission: '', weather: 'clear', bay: 1 };
    saveRejoin(r);
    expect(loadRejoin()?.mode).toBe('test');
    clearRejoin();
  });
});

describe('G2a: practiceMode (sandbox and test)', () => {
  it('only the two practice modes', () => {
    expect(practiceMode('sandbox')).toBe(true);
    expect(practiceMode('test')).toBe(true);
    for (const m of ['course', 'sector'] as const) expect(practiceMode(m)).toBe(false);
  });
  it('a test match issues the sandbox loadout', () => {
    const s = defaultSave();
    expect(loadoutEntries(s, 'test', false).map((e) => e.id)).toEqual(['rifle', 'pistolSd']);
  });
});

describe('G2a: the layout carries the dummies', () => {
  it('the Test Chamber takes the test mode as well as sandbox; the Chamber has its two (G2b)', () => {
    expect(chamber.modes).toEqual(['sandbox', 'test']);
    expect(getMap('chamber')).toBe(chamber);
    const d = chamber.build(new LevelBuilder(), 0).dummies!;
    expect(d.map((x) => [x.pos.x, x.pos.z, x.strafe ?? 0])).toEqual([[8, 12.5, 0], [8, 15, 2.5]]);
  });
});

interface FakeEnemy {
  hold: RoomDef | null;
  setPatrol: ReturnType<typeof vi.fn>;
  passive?: boolean;
  practice?: boolean;
  key?: number;
  alive?: boolean;
  id?: string;
}

/** A GameState with just what `TestMode` touches. */
function fake(rooms: RoomDef[] = [], aliveAtStart = false, practice?: SquadSlot[]) {
  let alive = aliveAtStart;
  const players: { feet: { x: number; z: number } }[] = [{ feet: { x: 14, z: 14 } }];
  const spawned: { kind: string; pos: Vector3; alerted: boolean; yaw: number; e: FakeEnemy }[] = [];
  const em = {
    alive: 0,
    stealth: false,
    coordinated: false,
    spawn: vi.fn((kind: string, pos: Vector3, alerted: boolean, yaw: number) => {
      const e: FakeEnemy = { hold: null, setPatrol: vi.fn(), alive: true, id: `e${spawned.length + 1}`, key: 3 };
      spawned.push({ kind, pos, alerted, yaw, e });
      em.alive++;
      return e;
    }),
    placeSlot: vi.fn(),
    despawn: vi.fn((e: FakeEnemy) => {
      if (e.alive) em.alive--;
      e.alive = false;
    }),
    bodies: [] as { enemyId: string; carried: boolean }[],
    joinSquad: vi.fn(),
  };
  const g = {
    enemyMgr: em,
    opts: { benchmark: undefined as unknown, practice: practice !== undefined },
    hud: { setObjective: vi.fn(), banner: vi.fn() },
    playerRefsInto: (out: unknown[]) => {
      out.length = 0;
      out.push(...players);
      return out;
    },
    world: { layout: { rooms, practice, playerSpawns: [{ pos: new Vector3(1, 0, 2), yaw: 0.5 }, { pos: new Vector3(3, 0, 2), yaw: 0.5 }, { pos: new Vector3(5, 0, 2), yaw: 0 }] } },
    anyPlayerAlive: () => alive,
    reviveAll: vi.fn(() => {
      alive = true;
    }),
    endSession: vi.fn(),
  };
  const mode = new TestMode(g as unknown as GameState);
  return { g, em, mode, spawned, players, setAlive: (v: boolean) => (alive = v) };
}

const ROOMS: RoomDef[] = [
  { id: 'a', name: 'A', minX: 0, maxX: 4, minZ: 0, maxZ: 4, squad: [{ kind: 'grunt', x: 1, z: 1, yaw: 0 }, { kind: 'heavy', x: 3, y: 1.2, z: 3, yaw: 1, route: [[3, 3], [3, 0]], wait: 2 }] },
  { id: 'b', name: 'B', minX: 5, maxX: 9, minZ: 0, maxZ: 4, squad: [{ kind: 'grunt', x: 6, z: 1, yaw: 2 }] },
];

describe('G2a: TestMode', () => {
  afterEach(() => {
    flags.guards = false;
  });
  it('is the "test" mode with no queue, no lose flow and no reinforcements', () => {
    const { mode } = fake();
    expect(mode.id).toBe('test');
    expect(mode.pending).toEqual([]);
    expect(mode.lives).toBe(Infinity);
    expect(mode.reinforce).toBe(false);
  });
  it('start() sets the stealth rules and spawns nobody (no ?guards=1)', () => {
    const { em, mode, g } = fake(ROOMS);
    mode.start();
    expect(em.stealth).toBe(true);
    expect(em.coordinated).toBe(true);
    expect(g.hud.setObjective).toHaveBeenCalledWith('');
    expect(em.spawn).not.toHaveBeenCalled();
  });
  it('?guards=1: start() populates the room squads', () => {
    flags.guards = true;
    const { em, mode } = fake(ROOMS);
    mode.start();
    expect(em.spawn).toHaveBeenCalledTimes(3);
  });
  it('populate() spawns calm, in room order, holding the room, with the route; NaN y when a slot has none', () => {
    const { em, mode, spawned } = fake(ROOMS);
    expect(mode.populate()).toBe(3);
    expect(spawned.map((s) => s.kind)).toEqual(['grunt', 'heavy', 'grunt']);
    expect(spawned.every((s) => !s.alerted)).toBe(true);
    expect(Number.isNaN(spawned[0]!.pos.y)).toBe(true);
    expect(spawned[1]!.pos.y).toBe(1.2);
    expect(spawned[0]!.e.hold).toBe(ROOMS[0]);
    expect(spawned[2]!.e.hold).toBe(ROOMS[1]);
    expect(em.joinSquad.mock.calls.map((c) => c[1])).toEqual([0, 0, 1]);
    expect(spawned[0]!.e.setPatrol).not.toHaveBeenCalled();
    expect(spawned[1]!.e.setPatrol).toHaveBeenCalledWith({ points: [[3, 3], [3, 0]], wait: 2 });
  });
  it('populate(max) stops at the alive cap; a map without rooms spawns none', () => {
    const a = fake(ROOMS);
    expect(a.mode.populate(2)).toBe(2);
    expect(a.em.alive).toBe(2);
    expect(fake().mode.populate()).toBe(0);
  });
  it('an alarm brings no one by default (true tells StealthSystems to skip its squad); reinforce hands it back', () => {
    const { mode } = fake();
    expect(mode.onAlarm()).toBe(true);
    mode.reinforce = true;
    expect(mode.onAlarm()).toBe(false);
    expect(mode.alarms).toBe(2);
  });
  it('everyone down: a banner, then a revive after 3 s (never twice for one wipe)', () => {
    const { mode, g } = fake();
    mode.onPlayerDeath();
    mode.onPlayerDeath();
    expect(g.hud.banner).toHaveBeenCalledTimes(1);
    mode.fixedUpdate(2.9);
    expect(g.reviveAll).not.toHaveBeenCalled();
    mode.fixedUpdate(0.2);
    expect(g.reviveAll).toHaveBeenCalledTimes(1);
    mode.fixedUpdate(5);
    expect(g.reviveAll).toHaveBeenCalledTimes(1);
    expect(g.endSession).not.toHaveBeenCalled();
  });
  it('a partner still up: no wipe', () => {
    const { mode, g } = fake([], true);
    mode.onPlayerDeath();
    mode.fixedUpdate(10);
    expect(g.hud.banner).not.toHaveBeenCalled();
    expect(g.reviveAll).not.toHaveBeenCalled();
  });
  it('lives = 1 ends the session as a DEFEAT on the first wipe', () => {
    const { mode, g } = fake();
    mode.lives = 1;
    mode.onPlayerDeath();
    expect(g.endSession).toHaveBeenCalledWith(false, 'Test over');
    mode.fixedUpdate(10);
    expect(g.reviveAll).not.toHaveBeenCalled();
  });
  it('past the revive window the downed player is back at once', () => {
    const { mode, g } = fake();
    mode.onPlayerOut();
    expect(g.reviveAll).toHaveBeenCalledTimes(1);
  });
  it('the checkpoint spawns are the first two player spawns (slot 0 the host)', () => {
    const { mode } = fake();
    expect(mode.checkpointSpawns()).toEqual([
      { x: 1, y: 0, z: 2, yaw: 0.5 },
      { x: 3, y: 0, z: 2, yaw: 0.5 },
    ]);
  });
  it('dispose() drops a pending respawn', () => {
    const { mode, g } = fake();
    mode.onPlayerDeath();
    mode.dispose();
    mode.fixedUpdate(10);
    expect(g.reviveAll).not.toHaveBeenCalled();
  });
});

describe('G2c: a passive slot makes a passive guard', () => {
  it('populate() sets passive on a slot that has it, and only on that one', () => {
    const rooms: RoomDef[] = [{ id: 'a', name: 'A', minX: 0, maxX: 4, minZ: 0, maxZ: 4, squad: [{ kind: 'grunt', x: 1, z: 1, yaw: 0, passive: true }, { kind: 'grunt', x: 3, z: 3, yaw: 0 }] }];
    const { mode, spawned } = fake(rooms);
    expect(mode.populate()).toBe(2);
    expect(spawned[0]!.e.passive).toBe(true);
    expect(spawned[1]!.e.passive).toBeUndefined();
  });
});

describe('G2c: the practice guards (decision N17)', () => {
  const SLOTS: SquadSlot[] = [
    { kind: 'grunt', x: 12.75, z: 16.75, yaw: 0, passive: true },
    { kind: 'grunt', x: 15.25, z: 16.75, yaw: 0, passive: true },
    { kind: 'grunt', x: 19.75, z: 16.25, yaw: -2, passive: true },
  ];
  it('the rule: the clock runs while he is down and starts over when he stands; due after 10 s with nobody within 2.5 m', () => {
    expect(PRACTICE_RESPAWN_S).toBe(10);
    expect(PRACTICE_CLEAR_M).toBe(2.5);
    expect(practiceDownTime(0, 0.5, true)).toBe(0.5);
    expect(practiceDownTime(7, 0.5, true)).toBe(7.5);
    expect(practiceDownTime(7, 0.5, false)).toBe(0);
    expect(practiceDue(9.99, 99)).toBe(false);
    expect(practiceDue(10, 99)).toBe(true);
    expect(practiceDue(30, 2.49)).toBe(false);
    expect(practiceDue(30, 2.5)).toBe(true);
  });
  it('without opts.practice nobody is placed; with it start() places the layout slots: passive, calm, outside the awareness roster', () => {
    const none = fake(ROOMS, false, SLOTS);
    none.g.opts.practice = false;
    none.mode.start();
    expect(none.em.spawn).not.toHaveBeenCalled();
    const { em, mode, spawned } = fake([], false, SLOTS);
    mode.start();
    expect(em.spawn).toHaveBeenCalledTimes(3);
    expect(spawned.every((s) => !s.alerted && s.kind === 'grunt')).toBe(true);
    expect(spawned.map((s) => [s.pos.x, s.pos.z, s.yaw])).toEqual(SLOTS.map((s) => [s.x, s.z, s.yaw]));
    expect(spawned.every((s) => s.e.passive === true && s.e.practice === true && s.e.key === -1)).toBe(true);
    expect(em.placeSlot).toHaveBeenCalledTimes(3);
  });
  it('?guards=1 does not place them (the room squads only)', () => {
    flags.guards = true;
    const { em, mode } = fake(ROOMS, false, SLOTS);
    mode.start();
    expect(em.spawn).toHaveBeenCalledTimes(6);
  });
  it('a downed guard comes back at his spot after 10 s and is a fresh passive guard', () => {
    const { em, mode, spawned } = fake([], false, SLOTS);
    mode.start();
    const first = spawned[0]!.e;
    first.alive = false;
    mode.fixedUpdate(9.5);
    expect(em.despawn).not.toHaveBeenCalled();
    mode.fixedUpdate(0.6);
    expect(em.despawn).toHaveBeenCalledWith(first);
    expect(spawned).toHaveLength(4);
    expect([spawned[3]!.pos.x, spawned[3]!.pos.z]).toEqual([12.75, 16.75]);
    expect(spawned[3]!.e.passive).toBe(true);
    // the next down starts a new 10 s
    spawned[3]!.e.alive = false;
    mode.fixedUpdate(9);
    expect(spawned).toHaveLength(4);
    mode.fixedUpdate(1.1);
    expect(spawned).toHaveLength(5);
  });
  it('a player within 2.5 m of the spot keeps him away until he steps off', () => {
    const { mode, spawned, players } = fake([], false, SLOTS);
    mode.start();
    spawned[1]!.e.alive = false;
    players[0]!.feet = { x: 15.25, z: 15.0 };
    mode.fixedUpdate(12);
    expect(spawned).toHaveLength(3);
    mode.fixedUpdate(5);
    expect(spawned).toHaveLength(3);
    players[0]!.feet = { x: 15.25, z: 14.2 };
    mode.fixedUpdate(0.1);
    expect(spawned).toHaveLength(4);
  });
  it('a body being carried is left alone; the guards that still stand are never replaced', () => {
    const { em, mode, spawned } = fake([], false, SLOTS);
    mode.start();
    spawned[0]!.e.alive = false;
    em.bodies.push({ enemyId: spawned[0]!.e.id!, carried: true });
    mode.fixedUpdate(30);
    expect(spawned).toHaveLength(3);
    em.bodies[0]!.carried = false;
    mode.fixedUpdate(0.1);
    expect(spawned).toHaveLength(4);
    expect(em.despawn).toHaveBeenCalledTimes(1);
  });
  it('a spawn the cap refuses is tried again after another 10 s, not every step', () => {
    const { em, mode, spawned } = fake([], false, SLOTS.slice(0, 1));
    em.spawn.mockReturnValueOnce(null as never);
    mode.start();
    expect(spawned).toHaveLength(0);
    mode.fixedUpdate(9);
    expect(em.spawn).toHaveBeenCalledTimes(1);
    mode.fixedUpdate(1.1);
    expect(em.spawn).toHaveBeenCalledTimes(2);
    expect(spawned).toHaveLength(1);
  });
  it('dispose() ends the rule', () => {
    const { mode, spawned } = fake([], false, SLOTS);
    mode.start();
    spawned[0]!.e.alive = false;
    mode.dispose();
    mode.fixedUpdate(30);
    expect(spawned).toHaveLength(3);
  });
});