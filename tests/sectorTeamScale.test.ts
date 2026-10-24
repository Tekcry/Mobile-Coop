import { describe, expect, it, vi } from 'vitest';
import { EnemyManager } from '../src/ai/enemyManager';
import { ENEMIES, type EnemyKind } from '../src/ai/enemyDefs';
import { DIFFICULTIES, DIFFICULTY } from '../src/ai/archetypes';
import type { Enemy, PlayerRef } from '../src/ai/enemy';
import { SectorMode, refSlot, slotOfId, teamSizeOf } from '../src/game/modes/sectorMode';
import { SECTOR, SectorRun, alarmStep, capReinforce, extraPlayers, guardForTeam, responseTeamSize, syringesFor, type SectorDef, type SectorResponseOut } from '../src/game/sectors';
import { SectorDesks } from '../src/game/sectorDesks';
import { SyncedDetector, newSectionStats } from '../src/game/rating/sectionRating';
import { Vector3, type Scene } from '../src/core/babylon';
import type { GameState } from '../src/game/gameState';
import type { HitInfo } from '../src/game/damage';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (coop4 SM, A4 / A8 / A9 / A10 / A13) Sector Ops rules for 3-4 players: the syringe pool, the alarm extras within the
// live cap, the `minPlayers` guards at a section load or restart, the attacker's and the jammer's slot.

describe('team scale: the pure rules', () => {
  it('syringes: the preset + 1 per player beyond 2 (rookie 3/4/5, normal 2/3/4, realistic and perfectionist 1/2/3)', () => {
    const at = (n: number) => DIFFICULTIES.map((d) => syringesFor(d, n));
    expect(at(1)).toEqual([3, 2, 1, 1]);
    expect(at(2)).toEqual([3, 2, 1, 1]);
    expect(at(3)).toEqual([4, 3, 2, 2]);
    expect(at(4)).toEqual([5, 4, 3, 3]);
    // the default is the 2-player preset (coopHost before N1, the existing callers)
    expect(DIFFICULTIES.map((d) => syringesFor(d))).toEqual([3, 2, 1, 1]);
    expect(syringesFor(undefined, 4)).toBe(SECTOR.syringes.normal + 2 * SECTOR.syringeExtra);
  });

  it('extra players: 0 for 0-2, then one per player; junk is 0', () => {
    expect([0, 1, 2, 3, 4].map(extraPlayers)).toEqual([0, 0, 0, 1, 2]);
    expect(extraPlayers(Number.NaN)).toBe(0);
    expect(extraPlayers(Infinity)).toBe(0);
  });

  it('reinforcements per stage: perStage + 1 per player beyond 2; 0 once the stage is capped', () => {
    for (const per of [2, 3]) {
      expect([1, 2, 3, 4].map((n) => alarmStep(0, per, n).send)).toEqual([per, per, per + 1, per + 2]);
      expect(alarmStep(SECTOR.alarmMax, per, 4)).toEqual({ stage: SECTOR.alarmMax, send: 0 });
    }
    // the 2-arg form is today's
    expect(alarmStep(0, 3)).toEqual({ stage: 1, send: 3 });
  });

  it('SectorRun.raiseAlarm reads its teamSize', () => {
    const r = new SectorRun([sec('a', 0, true)]);
    r.teamSize = 4;
    expect(r.raiseAlarm()).toBe(SECTOR.perStage + 2 * SECTOR.reinforcePerExtra);
    r.teamSize = 3;
    expect(r.raiseAlarm()).toBe(SECTOR.perStage + SECTOR.reinforcePerExtra);
    r.teamSize = 2;
    expect(r.raiseAlarm()).toBe(SECTOR.perStage);
    expect(r.raiseAlarm()).toBe(0);
  });

  it('capReinforce: the base always goes, the extras only within the headroom', () => {
    expect(capReinforce(4, 2, 10)).toBe(4);
    expect(capReinforce(4, 2, 3)).toBe(3);
    expect(capReinforce(4, 2, 2)).toBe(2);
    expect(capReinforce(4, 2, 0)).toBe(2);
    expect(capReinforce(4, 2, -5)).toBe(2);
    expect(capReinforce(2, 2, 0)).toBe(2);
    expect(capReinforce(0, 2, 10)).toBe(0);
  });

  it('guardForTeam: untagged always, tagged from minPlayers up', () => {
    expect([1, 2, 3, 4].map((n) => guardForTeam({}, n))).toEqual([true, true, true, true]);
    expect([1, 2, 3, 4].map((n) => guardForTeam({ minPlayers: 3 }, n))).toEqual([false, false, true, true]);
    expect([1, 2, 3, 4].map((n) => guardForTeam({ minPlayers: 4 }, n))).toEqual([false, false, false, true]);
  });
});

describe('SyncedDetector over 4 slots (A13)', () => {
  it('any two slots pair: 0+2, 1+3', () => {
    const d = new SyncedDetector();
    expect(d.onTakedown(0, 10)).toBe(false);
    expect(d.onTakedown(2, 10.4)).toBe(true);
    expect(d.onTakedown(1, 20)).toBe(false);
    expect(d.onTakedown(3, 20.2)).toBe(true);
    expect(d.synced).toBe(2);
  });
});

/* ---- SectorMode on its prototype (the responseWiring harness): stand-in guards, the real manager ---- */

function fake(kind: EnemyKind, x: number, z: number) {
  return {
    def: ENEMIES[kind],
    alive: true,
    taken: false,
    dog: null,
    helmet: false,
    armour: false,
    pos: new Vector3(x, 0, z),
    yaw: 0,
    section: 0,
    key: -1,
    squad: -1,
    aware: { level: 'unaware', t: 0, fought: false },
    crew: null,
    teamRank: -1,
    routePoints: null as [number, number][] | null,
    postPoint: [x, z] as [number, number],
    setGear: vi.fn(),
    setPost: vi.fn(),
    setPatrol: vi.fn(),
    joinAsReinforcement: vi.fn(),
    alert: vi.fn(),
    dispose: vi.fn(),
  };
}

function manager() {
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
    addShadowCaster: vi.fn(),
  };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: vi.fn() } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  const spawned: ReturnType<typeof fake>[] = [];
  em.spawn = vi.fn((kind: EnemyKind, pos: Vector3) => {
    if (em.alive >= em.maxAlive) return null;
    const f = fake(kind, pos.x, pos.z);
    spawned.push(f);
    em.enemies.push(f as unknown as Enemy);
    return f as unknown as Enemy;
  }) as unknown as EnemyManager['spawn'];
  return { em, spawned };
}

const pose = (x: number) => ({ x, y: 0, z: 0, yaw: 0 });
const guard = (x: number, z: number, minPlayers?: number) => ({ kind: 'grunt' as const, x, z, yaw: 0, takedownSpot: [x, z] as [number, number], ...(minPlayers ? { minPlayers } : {}) });
function sec(id: string, i: number, last: boolean, o: Partial<SectorDef> = {}): SectorDef {
  return {
    id,
    name: id,
    start: pose(i * 100),
    objective: { kind: 'hack', label: 'x', x: 0, y: 0, z: 0, yaw: 0 },
    ...(last
      ? { extract: { label: 'out', box: [2, 2, 4, 4] as [number, number, number, number] } }
      : { connector: { label: 'on', box: [2, 2, 4, 4] as [number, number, number, number], nearAt: [2, 3] as [number, number], checkpoint: pose(i * 100 + 50) } }),
    guards: [guard(0, 30), guard(10, 30, 3), guard(20, 30), guard(30, 30, 4)],
    reinforce: [[60, 0]],
    perStage: SECTOR.perStage,
    routes: [],
    ...o,
  };
}

/** A listed player: `slot` set as N1's TeamRef will (undefined: the pre-N1 list index). */
const player = (id: string, slot?: number) => ({ id, feet: new Vector3(500, 0, 500), target: { alive: true }, speed: 0, crouched: false, ...(slot === undefined ? {} : { slot }) }) as unknown as PlayerRef;

function sector(defs: SectorDef[], players: PlayerRef[], teamSize?: () => number) {
  const { em, spawned } = manager();
  const m = Object.create(SectorMode.prototype) as SectorMode;
  const ct = { alarm: 0, setLive: vi.fn(), repair: vi.fn(), fixedUpdate: vi.fn(), onRemoteJam: vi.fn() };
  const g = {
    enemyMgr: em,
    hud: { banner: vi.fn() },
    stats: { score: 0 },
    stealth: { setLiveAlarms: vi.fn() },
    playerRefsInto: (o: PlayerRef[]) => {
      o.length = 0;
      for (const p of players) o.push(p);
      return o;
    },
    ...(teamSize ? { teamSize } : {}),
  };
  Object.assign(m, {
    g,
    run: new SectorRun(defs),
    ct,
    pending: [],
    reinforceK: 0,
    reinforced: 0,
    refs: [],
    tmp: new Vector3(),
    teamKinds: [],
    sweepSrc: new Map(),
    desks: new SectorDesks([]),
    deskIts: [],
    slotEnemy: [],
    secStats: newSectionStats(),
    syncDet: new SyncedDetector(),
    t: 0,
  });
  const load = (i: number) => (m as unknown as { loadSection(i: number): void }).loadSection(i);
  const priv = m as unknown as { pending: unknown[]; slotEnemy: (Enemy | null)[]; t: number };
  return { m, em, spawned, ct, g, load, priv };
}

describe('team size (A10) and the helpers', () => {
  it('teamSizeOf: GameState.teamSize() when it has one (N1), else the players listed', () => {
    const a = sector([sec('s', 0, true)], [player('local'), player('b')]);
    expect(teamSizeOf(a.g as unknown as GameState, [])).toBe(2);
    const b = sector([sec('s', 0, true)], [player('local')], () => 4);
    expect(teamSizeOf(b.g as unknown as GameState, [])).toBe(4);
  });

  it('refSlot / slotOfId: TeamRef.slot when set, else the list index; local and "" are this machine; unknown -> none', () => {
    expect(refSlot(player('x'), 2)).toBe(2);
    expect(refSlot(player('x', 3), 1)).toBe(3);
    const { g } = sector([sec('s', 0, true)], [player('local', 0), player('b', 2), player('c', 1)]);
    const gs = g as unknown as GameState;
    expect(slotOfId(gs, [], 'local', -1)).toBe(0);
    expect(slotOfId(gs, [], '', -1)).toBe(0);
    expect(slotOfId(gs, [], 'b', -1)).toBe(2);
    expect(slotOfId(gs, [], 'c', -1)).toBe(1);
    expect(slotOfId(gs, [], 'gone', 1)).toBe(1);
  });
});

describe('minPlayers guards (A8) at a section load and a restart', () => {
  it('a team of 2 spawns the untagged list; 3 adds minPlayers 3; 4 adds both; indexes stay the guard list', () => {
    let size = 2;
    const { m, spawned, load, priv, em } = sector([sec('s1', 0, false), sec('s2', 1, true)], [player('local')], () => size);
    load(0);
    expect(m.run.teamSize).toBe(2);
    expect(spawned.map((f) => f.pos.x)).toEqual([0, 20]);
    expect(priv.slotEnemy[1]).toBeUndefined();
    // a restart (unload and load again) reads the team again: a late joiner counts now
    em.despawnAll();
    spawned.length = 0;
    size = 3;
    load(0);
    expect(m.run.teamSize).toBe(3);
    expect(spawned.map((f) => f.pos.x)).toEqual([0, 10, 20]);
    expect(priv.slotEnemy[1]).toBe(spawned[1]);
    em.despawnAll();
    spawned.length = 0;
    size = 4;
    load(0);
    expect(spawned.map((f) => f.pos.x)).toEqual([0, 10, 20, 30]);
    expect(priv.slotEnemy[3]).toBe(spawned[3]);
  });

  it('solo: no tagged guard', () => {
    const { spawned, load } = sector([sec('s1', 0, true)], [player('local')], () => 1);
    load(0);
    expect(spawned.length).toBe(2);
  });

  it('tagged guards count against the live cap: past it they wait in pending', () => {
    const { spawned, load, priv, em } = sector([sec('s1', 0, true)], [player('local')], () => 4);
    em.maxAlive = 3;
    load(0);
    expect(spawned.length).toBe(3);
    expect(priv.pending.length).toBe(1);
  });
});

describe('alarm extras within the live cap (A9, lead decision 1)', () => {
  it('4 players: perStage + 2 per stage while there is room', () => {
    const { m, load, em } = sector([sec('s1', 0, true)], [player('local')], () => 4);
    load(0);
    expect(em.alive).toBe(4);
    m.onAlarm();
    expect(m.reinforced).toBe(SECTOR.perStage + 2);
    expect(em.alive).toBe(4 + SECTOR.perStage + 2);
  });

  it('2 players: today exactly', () => {
    const { m, load, em } = sector([sec('s1', 0, true)], [player('local'), player('b')]);
    load(0);
    m.onAlarm();
    m.onAlarm();
    expect(m.reinforced).toBe(2 * SECTOR.perStage);
    expect(em.alive).toBe(2 + 2 * SECTOR.perStage);
  });

  it('at the cap the extras are refused (logged), the base still goes (pending), maxAlive holds', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const { m, load, em, priv } = sector([sec('s1', 0, true)], [player('local')], () => 4);
    em.maxAlive = 5;
    load(0);
    expect(em.alive).toBe(4);
    m.onAlarm();
    // headroom 1 < base 2: the base only (one spawns, one waits), both extras refused
    expect(m.reinforced).toBe(SECTOR.perStage);
    expect(em.alive).toBe(5);
    expect(priv.pending.length).toBe(1);
    expect(info).toHaveBeenCalledTimes(1);
    // partial room: 3 headroom at the default cap with 4 + 2 alive... fill the rest of the stages and the cap never breaks
    m.onAlarm();
    m.onAlarm();
    expect(em.alive).toBeLessThanOrEqual(em.maxAlive);
    info.mockRestore();
  });

  it('partial headroom: base + as many extras as fit', () => {
    const { m, load, em } = sector([sec('s1', 0, true)], [player('local')], () => 4);
    em.maxAlive = 4 + SECTOR.perStage + 1;
    load(0);
    m.onAlarm();
    expect(m.reinforced).toBe(SECTOR.perStage + 1);
    expect(em.alive).toBe(em.maxAlive);
  });
});

describe('slots: the attacker (A13) and the jammer (D1)', () => {
  const hit = (attackerId: string) => ({ attackerId, part: 'body' }) as unknown as HitInfo;
  const ko = () => ({ def: ENEMIES.grunt, ko: true }) as unknown as Enemy;

  it('two knock-outs by slots 2 and 3 within the window are synced; local + a teammate too', () => {
    const { m, priv } = sector([sec('s1', 0, true)], [player('local', 0), player('b', 1), player('c', 2), player('d', 3)]);
    priv.t = 5;
    m.onEnemyKilled(ko(), hit('c'));
    priv.t = 5.5;
    m.onEnemyKilled(ko(), hit('d'));
    expect(m.secStats.synced).toBe(1);
    priv.t = 9;
    m.onEnemyKilled(ko(), hit('local'));
    priv.t = 9.3;
    m.onEnemyKilled(ko(), hit('c'));
    expect(m.secStats.synced).toBe(2);
  });

  it('pre-N1 (no slot on the refs): the list index, so 2 players read 0 and 1 as before', () => {
    const { m, priv } = sector([sec('s1', 0, true)], [player('local'), player('b')]);
    priv.t = 1;
    m.onEnemyKilled(ko(), hit(''));
    priv.t = 1.2;
    m.onEnemyKilled(ko(), hit('b'));
    expect(m.secStats.synced).toBe(1);
    // the same player twice is not synced
    priv.t = 4;
    m.onEnemyKilled(ko(), hit('b'));
    priv.t = 4.2;
    m.onEnemyKilled(ko(), hit('b'));
    expect(m.secStats.synced).toBe(1);
  });

  it('onRemoteJam passes the sender slot (unknown sender: 1)', () => {
    const { m, ct } = sector([sec('s1', 0, true)], [player('local', 0), player('b', 1), player('c', 3)]);
    const eye = [1, 2, 3] as const;
    m.onRemoteJam('c', 'cam-1', eye);
    expect(ct.onRemoteJam).toHaveBeenLastCalledWith('cam-1', eye, 3);
    m.onRemoteJam('gone', 'cam-1');
    expect(ct.onRemoteJam).toHaveBeenLastCalledWith('cam-1', undefined, 1);
  });
});

describe('Guard AI AI5 response shape, wired optionally (coop4 AI5)', () => {
  type Hooked = EnemyManager & { shapeResponse?: (st: number, per: number, out: SectorResponseOut) => SectorResponseOut; setResponseShape?: (o: unknown) => void };
  const crewOf = (f: unknown) => (f as { crew: unknown }).crew;

  it('responseTeamSize: an even split, the first teams one more', () => {
    expect([0, 1].map((k) => responseTeamSize(k, 4, 2))).toEqual([2, 2]);
    expect([0, 1].map((k) => responseTeamSize(k, 5, 2))).toEqual([3, 2]);
    expect(responseTeamSize(0, 3, 1)).toBe(3);
    expect(responseTeamSize(2, 4, 2)).toBe(0);
    expect(responseTeamSize(0, 0, 1)).toBe(0);
    expect(responseTeamSize(0, 4, 0)).toBe(0);
  });

  it('fallback (no shapeResponse): today\'s path, one team of perStage + our extras, newTeam without a spread', () => {
    const { m, load, em, spawned } = sector([sec('s1', 0, true)], [player('local')], () => 4);
    const nt = vi.spyOn(em, 'newTeam');
    load(0);
    const placed = spawned.length;
    m.onAlarm();
    expect(m.reinforced).toBe(SECTOR.perStage + 2);
    expect(nt).toHaveBeenCalledTimes(1);
    expect(nt.mock.calls[0]!.length).toBe(4);
    const crews = spawned.slice(placed).map(crewOf);
    expect(new Set(crews).size).toBe(1);
    // 2 players: perStage, one team (master)
    const two = sector([sec('s1', 0, true)], [player('local'), player('b')]);
    const nt2 = vi.spyOn(two.em, 'newTeam');
    two.load(0);
    two.m.onAlarm();
    expect(two.m.reinforced).toBe(SECTOR.perStage);
    expect(nt2).toHaveBeenCalledTimes(1);
  });

  it('with shapeResponse: the UNSCALED base goes in, its size comes out (no double count), one team per shape team, members together', () => {
    const { m, load, em, spawned } = sector([sec('s1', 0, true)], [player('local')], () => 4);
    const hem = em as Hooked;
    const shape = vi.fn((_st: number, per: number, out: SectorResponseOut) => {
      out.size = per + 2;
      out.teams = 2;
      return out;
    });
    hem.shapeResponse = shape;
    const nt = vi.spyOn(em, 'newTeam');
    load(0);
    const placed = spawned.length;
    m.onAlarm();
    expect(shape).toHaveBeenCalledTimes(1);
    expect(shape.mock.calls[0]![0]).toBe(1);
    expect(shape.mock.calls[0]![1]).toBe(SECTOR.perStage);
    // perStage + 2 from the shape, not perStage + 2 + our own 2
    expect(m.reinforced).toBe(SECTOR.perStage + 2);
    expect(nt).toHaveBeenCalledTimes(2);
    for (const c of nt.mock.calls) expect((c as unknown[])[4]).toBe(SECTOR.alarmMax * 2);
    const got = spawned.slice(placed);
    expect(got.length).toBe(4);
    const crews = got.map(crewOf);
    expect(crews[0]).toBe(crews[1]);
    expect(crews[2]).toBe(crews[3]);
    expect(crews[0]).not.toBe(crews[2]);
    // a shield lead per team (the same kinds in each team)
    expect(got[0]!.def.kind).toBe(got[2]!.def.kind);
    expect(got[1]!.def.kind).toBe(got[3]!.def.kind);
  });

  it('with shapeResponse: size 0 sends nobody and makes no team; a capped stage never asks', () => {
    const { m, load, em, spawned } = sector([sec('s1', 0, true)], [player('local')], () => 4);
    const hem = em as Hooked;
    const shape = vi.fn((_st: number, _per: number, out: SectorResponseOut) => {
      out.size = 0;
      out.teams = 0;
      return out;
    });
    hem.shapeResponse = shape;
    const nt = vi.spyOn(em, 'newTeam');
    load(0);
    const placed = spawned.length;
    m.onAlarm();
    expect(m.reinforced).toBe(0);
    expect(spawned.length).toBe(placed);
    expect(nt).not.toHaveBeenCalled();
    m.onAlarm();
    m.onAlarm();
    shape.mockClear();
    m.onAlarm(); // past alarmMax: nothing to send, the hook is not asked
    expect(shape).not.toHaveBeenCalled();
  });

  it('with shapeResponse: the live cap still holds the extras (capReinforce on the shape size)', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const { m, load, em } = sector([sec('s1', 0, true)], [player('local')], () => 4);
    (em as Hooked).shapeResponse = (_st, per, out) => {
      out.size = per + 2;
      out.teams = 2;
      return out;
    };
    em.maxAlive = 4 + SECTOR.perStage + 1;
    load(0);
    m.onAlarm();
    expect(m.reinforced).toBe(SECTOR.perStage + 1);
    expect(em.alive).toBe(em.maxAlive);
    info.mockRestore();
  });

  it('setResponseShape on every section load and restart: the section override, else null', () => {
    const over = { splitAt: 3 };
    const { load, em } = sector([sec('s1', 0, false, { responseShape: over }), sec('s2', 1, true)], [player('local')], () => 3);
    const set = vi.fn();
    (em as Hooked).setResponseShape = set;
    load(0);
    expect(set).toHaveBeenLastCalledWith(over);
    em.despawnAll();
    load(0);
    expect(set).toHaveBeenCalledTimes(2);
    expect(set).toHaveBeenLastCalledWith(over);
    em.despawnAll();
    load(1);
    expect(set).toHaveBeenLastCalledWith(null);
  });
});

describe('sweep source by team size (coop4 data check polish)', () => {
  it('a 2-player alarm team sweeps only the spawned guards\' points; a restart at 4 adds the tagged ones', () => {
    let size = 2;
    const routed = (x: number, minPlayers?: number) => ({ ...guard(x, 30, minPlayers), route: [[x, 30], [x, 40]] as [number, number][] });
    const d = sec('s1', 0, true, { guards: [routed(0), routed(10, 3), routed(20), routed(30, 4)] });
    const { m, load, em } = sector([d], [player('local')], () => size);
    const nt = vi.spyOn(em, 'newTeam');
    load(0);
    m.onAlarm();
    expect((nt.mock.calls[0]![2] as unknown[]).length).toBe(2);
    em.despawnAll();
    size = 4;
    m.run.restartSection();
    load(0);
    m.onAlarm();
    expect((nt.mock.calls[1]![2] as unknown[]).length).toBe(4);
  });
});
