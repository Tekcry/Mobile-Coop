import { afterEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import { flags, readMode } from '../src/core/flags';
import { loadRejoin, saveRejoin, clearRejoin, type RejoinRecord } from '../src/core/rejoin';
import { capacity, COOP_MAX, NET_MODES, parseMessage, PROTOCOL_VERSION } from '../src/net/protocol';
import { emptyStats, practiceMode } from '../src/game/modes/gameMode';
import { TestMode } from '../src/game/modes/testMode';
import type { GameState } from '../src/game/gameState';
import type { RoomDef } from '../src/world/rooms';
import { applySession, loadoutEntries } from '../src/progression/profile';
import { computeRewards } from '../src/progression/rewards';
import { defaultSave } from '../src/save/schema';
import { LevelBuilder } from '../src/world/levelBuilder';
import { provingGrounds } from '../src/world/maps/provingGrounds';
import { studio } from '../src/world/maps/studio';
import { getMap } from '../src/world/maps';

describe('G2a: the wire and the URL take mode "test"', () => {
  it('NET_MODES lists it, a room takes two players, and the lobby / start messages parse it', () => {
    expect(NET_MODES).toContain('test');
    expect(capacity('test')).toBe(COOP_MAX);
    const lobby = { t: 'lobby', players: [], mode: 'test', map: 'studio', difficulty: 'normal', phase: 'lobby', mission: '', weather: 'clear' };
    expect(parseMessage(lobby)).toMatchObject({ t: 'lobby', mode: 'test', map: 'studio' });
    expect(parseMessage({ t: 'start', mode: 'test', map: 'studio', seed: 1, difficulty: 'normal' })).toMatchObject({ t: 'start', mode: 'test' });
    expect(parseMessage({ ...lobby, mode: 'tester' })).toBeNull();
  });
  it('the protocol is past the G1 number (read as a constant, never asserted exactly)', () => {
    expect(Number.isInteger(PROTOCOL_VERSION)).toBe(true);
    expect(PROTOCOL_VERSION).toBeGreaterThanOrEqual(87);
  });
  it('?mode=test reads as test; hunter is still clear; an unknown value is none', () => {
    expect(readMode('test')).toBe('test');
    expect(readMode('hunter')).toBe('clear');
    expect(readMode('sandbox')).toBe('sandbox');
    expect(readMode('tester')).toBeNull();
    expect(readMode(null)).toBeNull();
  });
  it('?guards=1 is a flag, off by default', () => {
    expect(flags.guards).toBe(false);
  });
  it('a rejoin record keeps the test mode', () => {
    const r: RejoinRecord = { code: 'ABCDE', role: 'host', at: Date.now(), mode: 'test', map: 'studio', difficulty: 'normal', mission: '', weather: 'clear', bay: 1 };
    saveRejoin(r);
    expect(loadRejoin()?.mode).toBe('test');
    clearRejoin();
  });
});

describe('G2a: practiceMode (sandbox and test save nothing)', () => {
  it('only the two practice modes', () => {
    expect(practiceMode('sandbox')).toBe(true);
    expect(practiceMode('test')).toBe(true);
    for (const m of ['mission', 'clear', 'infiltration', 'course', 'sector'] as const) expect(practiceMode(m)).toBe(false);
  });
  it('a test match pays nothing, counts no stats and no challenges, and issues the sandbox loadout', () => {
    const st = emptyStats('test', 'studio');
    st.won = true;
    st.kills = 20;
    st.knockouts = 30;
    st.headshots = 10;
    st.byKind.grunt = 20;
    st.time = 600;
    expect(computeRewards(st, 'normal')).toEqual({ lines: [], xp: 0, credits: 0 });
    const s = defaultSave();
    const before = JSON.stringify({ stats: s.profile.stats, challenges: s.challenges });
    const rep = applySession(s, st, 'normal');
    expect(rep.challenges).toEqual([]);
    expect(JSON.stringify({ stats: s.profile.stats, challenges: s.challenges })).toBe(before);
    expect(loadoutEntries(s, 'test', false).map((e) => e.id)).toEqual(['rifle', 'pistolSd']);
  });
});

describe('G2a: the layout carries the dummies', () => {
  it('Proving Grounds lists its four (the ones gameState built by hand before)', () => {
    const d = provingGrounds.build(new LevelBuilder(), 0).dummies!;
    expect(d.map((x) => [x.pos.x, x.pos.y, x.pos.z, x.yaw, x.strafe ?? 0])).toEqual([
      [-4, 0, 8, Math.PI, 0],
      [3, 0, 10, Math.PI, 2.5],
      [0, 0, 24, Math.PI, 4],
      [-14, 0, 14, Math.PI * 0.75, 0],
    ]);
  });
  it('Proving Grounds and the Test Chamber take the test mode as well as Free Roam; the Chamber has no dummies yet', () => {
    expect(provingGrounds.modes).toEqual(['sandbox', 'test']);
    expect(studio.modes).toEqual(['sandbox', 'test']);
    expect(getMap('studio')).toBe(studio);
    expect(studio.build(new LevelBuilder(), 0).dummies).toBeUndefined();
  });
});

interface FakeEnemy {
  hold: RoomDef | null;
  setPatrol: ReturnType<typeof vi.fn>;
}

/** A GameState with just what `TestMode` touches. */
function fake(rooms: RoomDef[] = [], aliveAtStart = false) {
  let alive = aliveAtStart;
  const spawned: { kind: string; pos: Vector3; alerted: boolean; yaw: number; e: FakeEnemy }[] = [];
  const em = {
    alive: 0,
    stealth: false,
    coordinated: false,
    spawn: vi.fn((kind: string, pos: Vector3, alerted: boolean, yaw: number) => {
      const e: FakeEnemy = { hold: null, setPatrol: vi.fn() };
      spawned.push({ kind, pos, alerted, yaw, e });
      em.alive++;
      return e;
    }),
    joinSquad: vi.fn(),
  };
  const g = {
    enemyMgr: em,
    opts: { benchmark: undefined as unknown },
    hud: { setObjective: vi.fn(), banner: vi.fn() },
    world: { layout: { rooms, playerSpawns: [{ pos: new Vector3(1, 0, 2), yaw: 0.5 }, { pos: new Vector3(3, 0, 2), yaw: 0.5 }, { pos: new Vector3(5, 0, 2), yaw: 0 }] } },
    anyPlayerAlive: () => alive,
    reviveAll: vi.fn(() => {
      alive = true;
    }),
    endSession: vi.fn(),
  };
  const mode = new TestMode(g as unknown as GameState);
  return { g, em, mode, spawned, setAlive: (v: boolean) => (alive = v) };
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
