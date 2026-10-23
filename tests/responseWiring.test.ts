import { describe, expect, it, vi } from 'vitest';
import { Enemy } from '../src/ai/enemy';
import { EnemyManager } from '../src/ai/enemyManager';
import { ENEMIES, type EnemyKind } from '../src/ai/enemyDefs';
import { DIFFICULTY } from '../src/ai/archetypes';
import { ALERT, AlertMachine, emptyAlertInput } from '../src/ai/alertState';
import { RESPONSE, SWEEP, sweepStart } from '../src/ai/gear';
import { SWEEP_NEAR, SweepTeam, type SweepMember } from '../src/ai/sweepTeam';
import { SectorMode } from '../src/game/modes/sectorMode';
import { StealthSystems } from '../src/game/stealthSystems';
import { SECTOR, SectorRun, type SectorDef } from '../src/game/sectors';
import { SectorDesks } from '../src/game/sectorDesks';
import { Vector3, type Scene } from '../src/core/babylon';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (guard-ai S13, stealth over shooting items 3, 4, 11; A37-A39) Response teams wired in: the alarm stage's gear on every
// living guard at the rise and on later spawns (a restart drops it with the stage); each stage's reinforcements are a
// response team, shield guard first (helmeted), same count; outside Sector Ops the alarm brings shield + 2; after the
// search the team sweeps the section's points (nearest the last known position first, the shield guard leading, the
// rest stacked behind, a look at each, again and again), a sighting stops it and the next full search starts it
// again; never calm; no camera touched. Stand-ins on the real classes' prototypes (no rig, no scene, no nav).

/** A stand-in guard: what placeSlot, the stage gear, the reinforcement and the team read. */
function fake(kind: EnemyKind = 'grunt', x = 0, z = 0) {
  const g = {
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
    setGear(gg: { helmet: boolean; armour: boolean }) {
      this.helmet = gg.helmet;
      this.armour = gg.armour;
    },
    setPost: vi.fn(),
    setPatrol: vi.fn(),
    joinAsReinforcement: vi.fn(),
    alert: vi.fn(),
    dispose: vi.fn(),
  };
  return g;
}
type Fake = ReturnType<typeof fake>;
const asE = (f: Fake): Enemy => f as unknown as Enemy;

/** The real manager on stand-in world and nav; `spawn` makes stand-in guards (in the list, at the spot). */
function manager() {
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
    addShadowCaster: vi.fn(),
  };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: vi.fn() } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  const spawned: Fake[] = [];
  em.spawn = vi.fn((kind: EnemyKind, pos: Vector3) => {
    const f = fake(kind, pos.x, pos.z);
    spawned.push(f);
    em.enemies.push(asE(f));
    return asE(f);
  }) as unknown as EnemyManager['spawn'];
  return { em, spawned };
}

const pose = (x: number) => ({ x, y: 0, z: 0, yaw: 0 });
const guardSlot = (x: number, z: number, route?: [number, number][]) => ({ kind: 'grunt' as const, x, z, yaw: 0, takedownSpot: [x, z] as [number, number], ...(route ? { route } : {}) });
const def = (id: string, i: number, last: boolean, o: Partial<SectorDef> = {}): SectorDef => ({
  id,
  name: id,
  start: pose(i * 100),
  objective: { kind: 'hack', label: 'x', x: 0, y: 0, z: 0, yaw: 0 },
  ...(last
    ? { extract: { label: 'out', box: [2, 2, 4, 4] as [number, number, number, number] } }
    : { connector: { label: 'on', box: [2, 2, 4, 4] as [number, number, number, number], nearAt: [2, 3] as [number, number], checkpoint: pose(i * 100 + 50) } }),
  guards: [guardSlot(0, 0, [[0, 0], [20, 0], [40, 0]]), guardSlot(0, 30)],
  reinforce: [[60, 0]],
  perStage: SECTOR.perStage,
  routes: [],
  ...o,
});

/** Sector Ops on its prototype: the run, a stand-in device set (one camera), the real manager. */
function sector(defs: SectorDef[]) {
  const { em, spawned } = manager();
  const m = Object.create(SectorMode.prototype) as SectorMode;
  const cams = [{ id: 'cam-1', on: true, state: 'sweep', yaw: 0.3, live: true }];
  const ct = { alarm: 0, cams, setLive: vi.fn(), repair: vi.fn(), fixedUpdate: vi.fn() };
  const g = {
    enemyMgr: em,
    hud: { banner: vi.fn() },
    stealth: { setLiveAlarms: vi.fn() },
    playerRefsInto: (o: unknown[]) => {
      o.length = 0;
      return o;
    },
  };
  Object.assign(m, { g, run: new SectorRun(defs), ct, pending: [], reinforceK: 0, reinforced: 0, refs: [], tmp: new Vector3(), teamKinds: [], sweepSrc: new Map(), desks: new SectorDesks([]), deskIts: [], slotEnemy: [] });
  const load = (i: number) => (m as unknown as { loadSection(i: number): void }).loadSection(i);
  return { m, em, spawned, ct, cams, load };
}

const kinds = (fs: readonly { def: { kind: string } }[]) => fs.map((f) => f.def.kind);

describe('stage gear (item 4, A37)', () => {
  it('a stage rise gives every living guard of the live section the stage gear at once, keeping his own', () => {
    const { em } = manager();
    const a = fake();
    const b = fake();
    const down = fake();
    down.alive = false;
    b.helmet = true;
    em.enemies.push(asE(a), asE(b), asE(down));
    em.setAlarmStage(1);
    expect([a.helmet, a.armour, b.helmet, b.armour]).toEqual([false, false, true, false]);
    em.setAlarmStage(2);
    expect([a.helmet, a.armour, b.helmet, b.armour]).toEqual([false, true, true, true]);
    em.setAlarmStage(3);
    expect([a.helmet, a.armour]).toEqual([true, true]);
    // a guard down when it rose gets nothing now (he gets it if he is woken)
    expect([down.helmet, down.armour]).toEqual([false, false]);
  });

  it('Sector Ops: the alarm stage rise reaches the section guards; later spawns get it after placeSlot; a restart drops it', () => {
    const { m, em, spawned, load } = sector([def('s1', 0, false), def('s2', 1, true)]);
    load(0);
    const section = spawned.slice();
    expect(section.length).toBe(2);
    expect(section.every((f) => !f.helmet && !f.armour)).toBe(true);
    m.onAlarm();
    expect(m.run.alarm).toBe(1);
    expect(section.every((f) => !f.helmet && !f.armour)).toBe(true);
    m.onAlarm();
    expect(m.run.alarm).toBe(2);
    expect(section.every((f) => !f.helmet && f.armour)).toBe(true);
    // the stage 2 team spawned after the rise: armour from placeSlot, and the shield guard's helmet
    const team2 = em.teams[1]!.members as unknown as Fake[];
    expect(team2.every((f) => f.armour)).toBe(true);
    expect(team2.map((f) => f.helmet)).toEqual([true, false]);
    m.onAlarm();
    expect(m.run.alarm).toBe(3);
    expect(spawned.filter((f) => f.alive).every((f) => f.helmet && f.armour)).toBe(true);
    // a restart: the stage back to the section's start (0), the section's guards again with no gear
    m.run.restartSection();
    em.despawnAll();
    expect(em.teams.length).toBe(0);
    const before = spawned.length;
    load(0);
    const fresh = spawned.slice(before);
    expect(fresh.length).toBe(2);
    expect(fresh.every((f) => !f.helmet && !f.armour)).toBe(true);
    expect(em.alarmStage).toBe(0);
  });

  it('the next section loads at the carried stage: its guards spawn with its gear; a woken guard gets it too', () => {
    const { m, em, spawned, load } = sector([def('s1', 0, false), def('s2', 1, true)]);
    load(0);
    m.onAlarm();
    m.onAlarm();
    em.despawnAll();
    (m.run as unknown as { index: number }).index = 1;
    const before = spawned.length;
    load(1);
    const next = spawned.slice(before);
    expect(next.length).toBe(2);
    expect(next.every((f) => f.armour && !f.helmet)).toBe(true);
    // the woken guard (a new Enemy on the body) gets the stage gear on top of what he went down in
    const give = (em as unknown as { giveStageGear(e: Enemy): void }).giveStageGear.bind(em);
    const woke = fake();
    give(asE(woke));
    expect([woke.helmet, woke.armour]).toEqual([false, true]);
  });

  it('no camera is added, woken or retuned by a stage rise (the devices only show the stage)', () => {
    const { m, ct, cams, load } = sector([def('s1', 0, true)]);
    load(0);
    const snap = JSON.stringify(cams);
    const n = cams.length;
    ct.setLive.mockClear();
    for (let i = 0; i < 4; i++) m.onAlarm();
    expect(cams.length).toBe(n);
    expect(JSON.stringify(cams)).toBe(snap);
    expect(ct.setLive).not.toHaveBeenCalled();
    expect(ct.repair).not.toHaveBeenCalled();
    expect(ct.fixedUpdate).not.toHaveBeenCalled();
    expect(ct.alarm).toBe(SECTOR.alarmMax);
  });
});

describe('response team (item 3, A38)', () => {
  it("each stage's reinforcements are a team: the shield guard first (helmeted), the rest armed guards, count perStage", () => {
    const { m, em, load } = sector([def('s1', 0, true, { perStage: 3 })]);
    load(0);
    m.onAlarm();
    expect(em.teams.length).toBe(1);
    const t = em.teams[0]!.members as unknown as Fake[];
    expect(kinds(t)).toEqual(['enforcer', 'grunt', 'grunt']);
    expect(t[0]!.helmet).toBe(RESPONSE.shieldHelmet);
    expect(t.slice(1).every((f) => !f.helmet)).toBe(true);
    expect(m.reinforced).toBe(3);
    // every member a reinforcement (aggressive, told by command) and on the team
    expect(t.every((f) => f.joinAsReinforcement.mock.calls.length === 1 && (f.crew as unknown) === em.teams[0])).toBe(true);
    m.onAlarm();
    m.onAlarm();
    expect(em.teams.map((x) => x.index)).toEqual([0, 1, 2]);
    // capped: no fourth team, no more guards
    m.onAlarm();
    expect(em.teams.length).toBe(3);
    expect(m.reinforced).toBe(9);
  });

  it('the team sweeps the section guard routes and posts (or the section sweep list)', () => {
    const { m, em, load } = sector([def('s1', 0, true, { sweep: [[5, 5], [50, 50]] }), def('s2', 1, true)]);
    load(0);
    m.onAlarm();
    const t = em.teams[0]!;
    expect(t.override).toEqual([[5, 5], [50, 50]]);
    t.begin(48, 48, 48, 40);
    expect(t.pts).toEqual([50, 50, 5, 5]);
    const u = sector([def('s1', 0, true)]);
    u.load(0);
    u.m.onAlarm();
    const v = u.em.teams[0]!;
    expect(v.override).toBeNull();
    expect(v.routes).toEqual([[[0, 0], [20, 0], [40, 0]]]);
    expect(v.posts).toEqual([[0, 30]]);
  });

  it('outside Sector Ops (live maps, StealthSystems.onAlarm): shield + 2 in place of grunt, grunt, heavy; stage 1, no gear', () => {
    const { em, spawned } = manager();
    const caller = fake('grunt', 0, 0);
    caller.routePoints = [[0, 0], [20, 0]];
    const post = fake('grunt', 0, 30);
    em.enemies.push(asE(caller), asE(post));
    const s = Object.create(StealthSystems.prototype) as StealthSystems;
    const g = {
      hud: { banner: vi.fn() },
      events: { emit: vi.fn() },
      style: { record: vi.fn() },
      world: { layout: { reinforce: [new Vector3(60, 0, 0)] } },
      player: { position: new Vector3(0, 0, 0) },
      mode: null,
    };
    Object.assign(s, { g, em, panels: [], entryScratch: [], teamKinds: [], teamRoutes: [], teamPosts: [] });
    (s as unknown as { onAlarm(e: Enemy, p: null): void }).onAlarm(asE(caller), null);
    expect(kinds(spawned)).toEqual(['enforcer', 'grunt', 'grunt']);
    expect(spawned.length).toBe(RESPONSE.liveTeam);
    expect(spawned.map((f) => [f.helmet, f.armour])).toEqual([[true, false], [false, false], [false, false]]);
    expect(em.teams.length).toBe(1);
    const t = em.teams[0]!;
    expect(t.members.length).toBe(3);
    expect(t.routes).toEqual([[[0, 0], [20, 0]]]);
    expect(t.posts).toEqual([[0, 30]]);
  });
});

/** A stand-in member (`SweepMember`). */
const member = (x = 0, z = 0): SweepMember & { pos: { x: number; z: number }; aware: { level: string; t: number }; alive: boolean } => ({
  alive: true,
  taken: false,
  pos: { x, z },
  aware: { level: 'searching', t: 0 },
  teamRank: -1,
});

/** A team over one straight route 0, 10, 20, 30 m along x (thinned at 8 m: all kept). */
const team = (index = 0, n = 3) => {
  const t = new SweepTeam(index, 0, null, [[[0, 0], [10, 0], [20, 0], [30, 0]]], []);
  const ms = Array.from({ length: n }, () => member(22, 0));
  for (const x of ms) t.add(x);
  return { t, ms };
};

describe('sweep (item 11, A39)', () => {
  it('starts only after the leader searched ALERT.searchTime, points nearest the LKP first', () => {
    const { t, ms } = team();
    ms[0]!.aware.t = ALERT.searchTime - 0.1;
    t.tick(true, 21, 0);
    expect(t.sweeping).toBe(false);
    ms[0]!.aware.t = ALERT.searchTime;
    t.tick(true, 21, 0);
    expect(t.sweeping).toBe(true);
    expect(t.count).toBe(4);
    expect(t.pts).toEqual([20, 0, 30, 0, 10, 0, 0, 0]);
    expect(t.point).toBe(0);
    expect(ms.map((x) => x.teamRank)).toEqual([0, 1, 2]);
    expect(t.leader).toBe(ms[0]);
  });

  it('the leader looks SWEEP.dwell s at each point, each once, then the same order again (loop)', () => {
    const { t, ms } = team();
    ms[0]!.aware.t = ALERT.searchTime;
    t.tick(true, 21, 0);
    const L = ms[0]!;
    const seen: number[] = [];
    const dt = 0.25;
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 0; k < t.count; k++) {
        const i = t.point;
        seen.push(t.pts[2 * i]!);
        // walking there: not at it, no dwell
        L.pos.x = t.pts[2 * i]! + SWEEP_NEAR + 2;
        expect(t.lead(dt, L.pos.x, 0)).toBe(false);
        expect(t.dwellT).toBe(0);
        L.pos.x = t.pts[2 * i]!;
        let s = 0;
        while (t.point === i && s < 200) {
          expect(t.lead(dt, L.pos.x, 0)).toBe(true);
          s++;
        }
        expect(s * dt).toBeCloseTo(SWEEP.dwell, 5);
      }
    }
    expect(seen).toEqual([20, 30, 10, 0, 20, 30, 10, 0]);
    expect(t.passes).toBe(2);
    expect(t.visited).toBe(8);
  });

  it('teams of later stages start at other points (sweepStart)', () => {
    const { t, ms } = team(1);
    ms[0]!.aware.t = ALERT.searchTime;
    t.tick(true, 21, 0);
    expect(t.start).toBe(sweepStart(1, 4));
    expect(t.start).not.toBe(0);
    expect(t.point).toBe(t.start);
  });

  it('the followers stack SWEEP.gap m apart behind the leader (away from the point he heads for)', () => {
    const { t, ms } = team();
    ms[0]!.aware.t = ALERT.searchTime;
    t.tick(true, 21, 0);
    // the leader at (25, 0) heading for the first point (20, 0): behind him is +x
    t.lead(0.1, 25, 0);
    const o: [number, number] = [0, 0];
    expect(t.follow(1, 25, 0, o)).toEqual([25 + SWEEP.gap, 0]);
    expect(t.follow(2, 25, 0, o)).toEqual([25 + 2 * SWEEP.gap, 0]);
    // a dead first follower: the next one moves up
    ms[1]!.alive = false;
    t.tick(true, 21, 0);
    expect(ms.map((x) => x.teamRank)).toEqual([0, -1, 1]);
    // the leader down: the next living member leads (the shield guard first while he stands)
    ms[0]!.alive = false;
    t.tick(true, 21, 0);
    expect(t.leader).toBe(ms[2]);
  });

  it('a sighting (the leader in combat) stops the sweep; the next full search starts it again from the new LKP', () => {
    const { t, ms } = team();
    ms[0]!.aware.t = ALERT.searchTime;
    t.tick(true, 21, 0);
    expect(t.switches).toBe(1);
    ms[0]!.aware.level = 'alert';
    ms[0]!.aware.t = 0;
    t.tick(true, 1, 0);
    expect(t.sweeping).toBe(false);
    ms[0]!.aware.level = 'searching';
    ms[0]!.aware.t = 30;
    t.tick(true, 1, 0);
    expect(t.sweeping).toBe(false);
    ms[0]!.aware.t = ALERT.searchTime;
    t.tick(true, 1, 0);
    expect(t.sweeping).toBe(true);
    expect(t.switches).toBe(2);
    expect(t.pts).toEqual([0, 0, 10, 0, 20, 0, 30, 0]);
  });

  it('SWEEP numbers', () => {
    expect([SWEEP.enabled, SWEEP.thin, SWEEP.dwell, SWEEP.gap]).toEqual([true, 8, 6, 2.5]);
  });

  it('never calm: a hunting guard searches on for good (S6), so the sweep never ends on its own', () => {
    const a = new AlertMachine();
    a.set('alert');
    a.set('searching');
    const i = emptyAlertInput();
    i.hunting = true;
    for (let k = 0; k < 600; k++) a.step(1, i);
    expect(a.level).toBe('searching');
  });

  it('the team ends only with the section (the manager clear: unload or restart)', () => {
    const { em, spawned } = manager();
    const t = em.newTeam(0, null, [[[0, 0], [20, 0]]], []);
    const e = em.spawn('enforcer', new Vector3(), true, 0)!;
    em.joinTeam(e, t);
    expect(spawned[0]!.helmet).toBe(true);
    for (let k = 0; k < 10; k++) t.tick(false, 0, 0);
    expect(em.teams.length).toBe(1);
    em.clear();
    expect(em.teams.length).toBe(0);
  });
});

/** Enemy's sweep step on its prototype (no rig, no scene; the nav sees every line clear). */
function sweeper(tm: SweepTeam<Enemy>, rank: number, x: number, z: number, yaw = 0) {
  const e = Object.create(Enemy.prototype) as Enemy;
  Object.assign(e, {
    def: ENEMIES.grunt,
    pos: new Vector3(x, 0, z),
    yaw,
    crew: tm,
    teamRank: rank,
    sweepP: [0, 0],
    sweepGoal: { point: null, speed: 0, face: null },
    ctx: { nav: { lineClear: () => true }, coordinated: () => true },
    combatSearch: true,
    routePath: [],
    meP: [0, 0],
    lookBase: 0,
    spotArrived: false,
  });
  return e;
}
type Goal = { point: [number, number] | null; speed: number; face: number | null };
const stepOf = (e: Enemy, tm: SweepTeam<Enemy>, dt = 0.1): Goal => (e as unknown as { sweepStep(dt: number, tm: SweepTeam<Enemy>): Goal }).sweepStep(dt, tm);

describe('Enemy.sweepStep (the shield guard leads, the rest follow)', () => {
  it('the leader walks to the point, then stands and looks round it; a follower holds his place behind', () => {
    const tm = new SweepTeam<Enemy>(0, 0, [[20, 0], [40, 0]], [], []);
    const L = sweeper(tm, 0, 30, 0);
    const F = sweeper(tm, 1, 34, 0, 1.2);
    tm.add(L);
    tm.add(F);
    tm.leader = L;
    tm.begin(21, 0, 30, 0);
    expect(tm.sweeping).toBe(true);
    const g = stepOf(L, tm);
    expect(g.point).toEqual([20, 0]);
    expect(g.speed).toBeGreaterThan(0);
    // the follower goes to his place 2.5 m behind the leader (away from the point)
    const f = stepOf(F, tm);
    expect(f.point).toEqual([30 + SWEEP.gap, 0]);
    // at the point: no move, the look-round, the dwell counts
    L.pos.x = 20.5;
    const g2 = stepOf(L, tm, 1);
    expect(g2.point).toBeNull();
    expect(g2.speed).toBe(0);
    expect(tm.dwellT).toBeCloseTo(1, 6);
    // the follower in place faces the way the leader faces
    F.pos.x = 30 + SWEEP.gap;
    L.pos.x = 30;
    const f2 = stepOf(F, tm);
    expect(f2.point).toBeNull();
    expect(f2.face).toBe(L.yaw);
  });

  it('calmDecide hands a searching team member to the sweep (not the LKP ring) while the team sweeps', () => {
    const tm = new SweepTeam<Enemy>(0, 0, [[20, 0]], [], []);
    const L = sweeper(tm, 0, 30, 0);
    Object.assign(L, { aware: { level: 'searching' }, reviving: null });
    tm.add(L);
    tm.leader = L;
    tm.begin(20, 0, 30, 0);
    const g = (L as unknown as { calmDecide(dt: number): Goal }).calmDecide(0.1);
    expect(g.point).toEqual([20, 0]);
  });
});
