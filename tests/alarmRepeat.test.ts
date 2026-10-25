import { describe, expect, it, vi } from 'vitest';
import { EnemyManager } from '../src/ai/enemyManager';
import { ALARM_REPEAT, type AlarmPanel } from '../src/ai/alarm';
import { DIFFICULTY } from '../src/ai/archetypes';
import { RADIO } from '../src/ai/radioNet';
import { ENEMIES, type EnemyKind } from '../src/ai/enemyDefs';
import { SectorMode } from '../src/game/modes/sectorMode';
import { SECTOR, SectorRun, type SectorDef } from '../src/game/sectors';
import { SectorDesks } from '../src/game/sectorDesks';
import { StealthSystems } from '../src/game/stealthSystems';
import { Vector3, type Scene } from '../src/core/babylon';
import type { AiContext, Enemy } from '../src/ai/enemy';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (guard-rules S5, D5, A7; bible 5.7 "Each raised alarm adds one level") Repeat guard alarms. With `alarmRepeat` (Sector
// Ops and the campaign: `SectorMode` sets it on each section load) a new guard alarm may be raised once the last one's
// response is in (a member of a team it brought is searching) or `ALARM_REPEAT.rearm` s after it, at most
// `ALARM_REPEAT.max` per load; `alarmRaised` stays set for its readers; `resetAlarm` (every load) clears lock and count.
// Without it (Marlow Yard's `courseMode`, the parked modes) one guard alarm per load, as before.

/** Private parts the tests drive. */
type Priv = {
  ctx: AiContext;
  radioStep(dt: number): void;
  repeatStep(dt: number): void;
  raiseAlarm(e: Enemy, p: AlarmPanel | null): void;
  assignAlarm(): void;
};
const priv = (em: EnemyManager): Priv => em as unknown as Priv;

/** A stand-in guard: what the radio net, the command call, the panel runner, the stage gear and the team read. */
function fake(kind: EnemyKind = 'grunt', x = 0, z = 0, o: Record<string, unknown> = {}) {
  const num = 9500 + fake.n++;
  return {
    id: `p${num}`,
    num,
    key: num % 32,
    def: ENEMIES[kind],
    alive: true,
    alerted: false,
    passive: false,
    taken: false,
    blindT: 0,
    runningAlarm: false,
    secure: false,
    dog: null,
    buff: false,
    level: 'unaware',
    incident: -1,
    section: 0,
    targetInView: false,
    hunt: -1,
    helmet: false,
    armour: false,
    roleFlags: 0,
    pos: new Vector3(x, 0, z),
    yaw: 0,
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
    inLeash: () => true,
    runAlarm: vi.fn(),
    setPost: vi.fn(),
    setPatrol: vi.fn(),
    joinAsReinforcement: vi.fn(),
    alert: vi.fn(),
    radio: vi.fn(),
    bark: vi.fn(),
    tell: vi.fn(),
    dispose: vi.fn(),
    ...o,
  };
}
fake.n = 0;
type Fake = ReturnType<typeof fake>;
const asE = (f: Fake): Enemy => f as unknown as Enemy;
/** A fighting guard (in combat). */
const fighter = (x: number, z: number): Fake => fake('grunt', x, z, { alerted: true, level: 'alert', aware: { level: 'alert', t: 0, fought: true } });

/** The real manager on a stub world (open floor); `spawn` makes stand-ins. */
function manager(gs: Fake[] = []) {
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
    addShadowCaster: vi.fn(),
  };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: vi.fn(() => true) } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  em.stealth = true;
  for (const g of gs) em.enemies.push(asE(g));
  const spawned: Fake[] = [];
  em.spawn = vi.fn((kind: EnemyKind, pos: Vector3) => {
    const f = fake(kind, pos.x, pos.z);
    spawned.push(f);
    em.enemies.push(asE(f));
    return asE(f);
  }) as unknown as EnemyManager['spawn'];
  const run = (sec: number): void => {
    for (let k = 0; k < Math.round(sec / 0.1); k++) {
      priv(em).radioStep(0.1);
      priv(em).repeatStep(0.1);
    }
  };
  return { em, spawned, run, ctx: priv(em).ctx };
}

/** The mode's part of an alarm, as `StealthSystems.onAlarm` does it: one response team (a stand-in member). */
function teamOnAlarm(em: EnemyManager): Fake[] {
  const members: Fake[] = [];
  em.onAlarm = () => {
    const t = em.newTeam(0, null, [], []);
    const f = fake('grunt', 50, 0, { alerted: true, level: 'alert' });
    t.members.push(asE(f));
    members.push(f);
  };
  return members;
}

/** A contact call through, then the command call: the radio alarm (RADIO.callIn + RADIO.report and a margin). */
const radioAlarm = (ctx: AiContext, run: (s: number) => void, g: Fake): void => {
  ctx.radioCall!(asE(g), -1, 'contact');
  run(RADIO.callIn + RADIO.report + 0.6);
};

describe('ALARM_REPEAT (guard-rules S5, A7)', () => {
  it('on; at most 3 guard alarms a load; the lock opens 60 s after the alarm at the latest', () => {
    expect(ALARM_REPEAT.enabled).toBe(true);
    expect(ALARM_REPEAT.max).toBe(3);
    expect(ALARM_REPEAT.rearm).toBe(60);
    // the Sector Ops stage cap holds anyway
    expect(ALARM_REPEAT.max).toBeLessThanOrEqual(SECTOR.alarmMax);
  });
});

describe('the repeat lock (manager, radio alarms)', () => {
  it('second and third alarm once the response is in (a team member searching), never a fourth; alarmRaised stays set', () => {
    const spotter = fighter(0, 0);
    const { em, run, ctx } = manager([spotter, fake('grunt', 20, 0)]);
    em.alarmRepeat = true;
    const team = teamOnAlarm(em);
    radioAlarm(ctx, run, spotter);
    expect([em.guardAlarms, em.alarmRaised, em.alarmOpen()]).toEqual([1, true, false]);
    // the team still in combat on its way in: shut; a second contact through starts no command call
    run(5);
    const started = em.command.started;
    radioAlarm(ctx, run, spotter);
    expect(em.command.started).toBe(started);
    expect(em.guardAlarms).toBe(1);
    // a member searching: the response is in, the lock opens; the next contact raises the second alarm by radio
    team[0]!.level = 'searching';
    run(0.1);
    expect(em.alarmOpen()).toBe(true);
    expect(em.alarmRaised).toBe(true);
    radioAlarm(ctx, run, spotter);
    expect([em.guardAlarms, em.alarmOpen(), em.alarmBy]).toEqual([2, false, 'radio']);
    expect(em.sectionCounts.radioAlarms).toBe(2);
    // the first alarm's team searching does not open it for the second: only a team the second brought
    run(5);
    expect(em.alarmOpen()).toBe(false);
    team[1]!.level = 'searching';
    run(0.1);
    radioAlarm(ctx, run, spotter);
    expect(em.guardAlarms).toBe(3);
    // the third: never open again this load, whatever the teams do or the time
    for (const f of team) f.level = 'searching';
    run(ALARM_REPEAT.rearm + 5);
    expect(em.alarmOpen()).toBe(false);
    radioAlarm(ctx, run, spotter);
    expect([em.guardAlarms, em.sectionCounts.radioAlarms, team.length]).toEqual([3, 3, 3]);
  });

  it("a team made after the alarm (a camera or laser stage) searching does not open it; the alarm's own does", () => {
    const { em } = manager();
    em.alarmRepeat = true;
    const team = teamOnAlarm(em);
    priv(em).raiseAlarm(asE(fighter(0, 0)), null);
    // a later camera stage's team, already searching
    const later = em.newTeam(0, null, [], []);
    later.members.push(asE(fake('grunt', 40, 0, { level: 'searching' })));
    priv(em).repeatStep(1);
    expect(em.alarmOpen()).toBe(false);
    team[0]!.level = 'searching';
    priv(em).repeatStep(0.1);
    expect(em.alarmOpen()).toBe(true);
  });

  it('a member still entering, or a device responder not yet at his spot, does not open it', () => {
    const { em } = manager();
    em.alarmRepeat = true;
    const team = teamOnAlarm(em);
    priv(em).raiseAlarm(asE(fighter(0, 0)), null);
    const m = team[0]! as Fake & { entering?: boolean; responder?: boolean; atSearchSpot?: boolean };
    // searching on his run-in route: not in yet
    Object.assign(m, { level: 'searching', entering: true });
    priv(em).repeatStep(1);
    expect(em.alarmOpen()).toBe(false);
    // a device responder searches from the moment he spawns: only once he stands at his search spot
    Object.assign(m, { entering: false, responder: true, atSearchSpot: false });
    priv(em).repeatStep(1);
    expect(em.alarmOpen()).toBe(false);
    m.atSearchSpot = true;
    priv(em).repeatStep(0.1);
    expect(em.alarmOpen()).toBe(true);
  });

  it('no team member searching: the lock opens ALARM_REPEAT.rearm s after the alarm, not before', () => {
    const { em } = manager();
    em.alarmRepeat = true;
    teamOnAlarm(em);
    const g = fighter(0, 0);
    priv(em).raiseAlarm(asE(g), null);
    priv(em).repeatStep(ALARM_REPEAT.rearm - 0.5);
    expect(em.alarmOpen()).toBe(false);
    priv(em).repeatStep(0.6);
    expect(em.alarmOpen()).toBe(true);
    priv(em).raiseAlarm(asE(g), null);
    expect(em.guardAlarms).toBe(2);
    expect(em.alarmOpen()).toBe(false);
  });

  it('resetAlarm (every section load or restart) clears the lock and the count', () => {
    const { em } = manager();
    em.alarmRepeat = true;
    const g = fighter(0, 0);
    for (let i = 0; i < 3; i++) {
      priv(em).raiseAlarm(asE(g), null);
      priv(em).repeatStep(ALARM_REPEAT.rearm);
    }
    expect([em.guardAlarms, em.alarmOpen()]).toEqual([3, false]);
    em.resetAlarm();
    expect([em.guardAlarms, em.alarmRaised, em.alarmOpen()]).toEqual([0, false, true]);
    priv(em).raiseAlarm(asE(g), null);
    expect(em.guardAlarms).toBe(1);
  });

  it('an alarmRaised set from outside (no raise this load) stays shut', () => {
    const { em } = manager();
    em.alarmRepeat = true;
    em.alarmRaised = true;
    priv(em).repeatStep(ALARM_REPEAT.rearm * 3);
    expect(em.alarmOpen()).toBe(false);
    priv(em).raiseAlarm(asE(fighter(0, 0)), null);
    expect(em.guardAlarms).toBe(0);
  });

  it('the panel runner: none picked while shut, one once the lock opens', () => {
    const g = fighter(0, 0);
    const { em } = manager([g]);
    em.alarmRepeat = true;
    em.alarms.push({ id: 'p1', x: 4, y: 0, z: 0, yaw: 0, disabled: false });
    priv(em).raiseAlarm(asE(g), null);
    priv(em).assignAlarm();
    expect(g.runAlarm).not.toHaveBeenCalled();
    priv(em).repeatStep(ALARM_REPEAT.rearm);
    priv(em).assignAlarm();
    expect(g.runAlarm).toHaveBeenCalledTimes(1);
    // the context the guard reads to keep running (`Enemy.decide`): open now, shut once the panel raises it
    const ctx = priv(em).ctx;
    expect(ctx.alarmOpen()).toBe(true);
    priv(em).raiseAlarm(asE(g), em.alarms[0]!);
    expect([ctx.alarmOpen(), ctx.alarmRaised(), em.alarmBy, em.guardAlarms]).toEqual([false, true, 'panel', 2]);
  });
});

describe('one guard alarm per load without alarmRepeat (Marlow Yard: courseMode leaves it off)', () => {
  it('off by default; after its team arrives and searches, a second sighting raises none', () => {
    const spotter = fighter(0, 0);
    const { em, run, ctx } = manager([spotter, fake('grunt', 20, 0)]);
    expect(em.alarmRepeat).toBe(false);
    const team = teamOnAlarm(em);
    radioAlarm(ctx, run, spotter);
    expect(em.guardAlarms).toBe(1);
    team[0]!.level = 'searching';
    run(ALARM_REPEAT.rearm + 5);
    expect(em.alarmOpen()).toBe(false);
    const started = em.command.started;
    radioAlarm(ctx, run, spotter);
    expect([em.guardAlarms, em.command.started, team.length]).toEqual([1, started, 1]);
    em.alarms.push({ id: 'p1', x: 4, y: 0, z: 0, yaw: 0, disabled: false });
    priv(em).assignAlarm();
    expect(spotter.runAlarm).not.toHaveBeenCalled();
  });
});

describe('Sector Ops: the stage climbs with each guard alarm (sector harness)', () => {
  const pose = (x: number) => ({ x, y: 0, z: 0, yaw: 0 });
  const guardSlot = (x: number, z: number) => ({ kind: 'grunt' as const, x, z, yaw: 0, takedownSpot: [x, z] as [number, number] });
  const def = (id: string): SectorDef => ({
    id,
    name: id,
    start: pose(0),
    objective: { kind: 'hack', label: 'x', x: 0, y: 0, z: 0, yaw: 0 },
    extract: { label: 'out', box: [2, 2, 4, 4] as [number, number, number, number] },
    guards: [guardSlot(0, 0), guardSlot(0, 30)],
    reinforce: [[60, 0]],
    perStage: SECTOR.perStage,
    routes: [],
  });

  function sector() {
    const { em, spawned } = manager();
    const m = Object.create(SectorMode.prototype) as SectorMode;
    const ct = { alarm: 0, cams: [], setLive: vi.fn(), repair: vi.fn(), fixedUpdate: vi.fn() };
    const g = {
      world: {},
      enemyMgr: em,
      hud: { banner: vi.fn() },
      stealth: { setLiveAlarms: vi.fn() },
      playerRefsInto: (o: unknown[]) => {
        o.length = 0;
        return o;
      },
    };
    Object.assign(m, { g, run: new SectorRun([def('s1')]), ct, pending: [], reinforceK: 0, reinforced: 0, refs: [], tmp: new Vector3(), teamKinds: [], sweepSrc: new Map(), desks: new SectorDesks([]), deskIts: [], slotEnemy: [] });
    // the game wires the manager's alarm to the mode (`StealthSystems.onAlarm` -> `mode.onAlarm`)
    em.onAlarm = () => m.onAlarm();
    const load = () => (m as unknown as { loadSection(i: number): void }).loadSection(0);
    return { m, em, spawned, load };
  }

  it("a camera stage's team after the guard alarm does not open the lock; the guard alarm's team does", () => {
    const { m, em, load } = sector();
    load();
    priv(em).raiseAlarm(asE(fighter(0, 0)), null);
    expect([m.run.alarm, em.teams.length]).toEqual([1, 1]);
    // a camera has someone at full awareness: `CtDevices` raised its stage, the mode sends that stage's team
    const mm = m as unknown as { ct: { alarm: number }; cameraAlarm(): void };
    Object.assign(m, { camAlarms: 0, secStats: { camAlarms: 0, alarms: 0 } });
    mm.ct.alarm = 2;
    mm.cameraAlarm();
    expect([m.run.alarm, em.teams.length, em.guardAlarms]).toEqual([2, 2, 1]);
    (em.teams[1]!.members[0] as unknown as Fake).level = 'searching';
    priv(em).repeatStep(1);
    expect(em.alarmOpen()).toBe(false);
    (em.teams[0]!.members[0] as unknown as Fake).level = 'searching';
    priv(em).repeatStep(0.1);
    expect(em.alarmOpen()).toBe(true);
  });

  it('at the stage cap a repeat guard alarm sends no team: the banner is the plain alarm line (StealthSystems.onAlarm)', () => {
    const { m, em, load } = sector();
    load();
    const s = Object.create(StealthSystems.prototype) as StealthSystems;
    const banner = vi.fn();
    const g = {
      hud: { banner },
      events: { emit: vi.fn() },
      style: { record: vi.fn() },
      world: { layout: { reinforce: [new Vector3(60, 0, 0)] } },
      player: { position: new Vector3(0, 0, 0) },
      mode: m,
    };
    Object.assign(s, { g, em, panels: [], entryScratch: [], teamKinds: [], teamRoutes: [], teamPosts: [] });
    em.onAlarm = (e, p) => (s as unknown as { onAlarm(e: Enemy, p: AlarmPanel | null): void }).onAlarm(e, p);
    const raiser = asE(fighter(0, 0));
    priv(em).raiseAlarm(raiser, null);
    expect(banner).toHaveBeenLastCalledWith('ALARM', 'Reinforcements inbound', 2200);
    expect([m.run.alarm, em.teams.length]).toEqual([1, 1]);
    // cameras took it to the cap; the lock opens; the next guard alarm sends no one
    m.run.alarm = SECTOR.alarmMax;
    priv(em).repeatStep(ALARM_REPEAT.rearm);
    banner.mockClear();
    priv(em).raiseAlarm(raiser, null);
    expect(em.guardAlarms).toBe(2);
    expect(em.teams.length).toBe(1);
    expect(banner).toHaveBeenCalledWith('ALARM', '', 2200);
    expect(banner).not.toHaveBeenCalledWith('ALARM', 'Reinforcements inbound', 2200);
  });

  it('the section load turns repeats on; each guard alarm after its response is in adds a stage, up to 3; a restart clears it', () => {
    const { m, em, spawned, load } = sector();
    expect(em.alarmRepeat).toBe(false);
    load();
    expect(em.alarmRepeat).toBe(true);
    const raiser = spawned[0]!;
    priv(em).raiseAlarm(asE(raiser), null);
    expect([m.run.alarm, em.teams.length]).toEqual([1, 1]);
    // its team on the way in: a second guard alarm now is refused
    priv(em).repeatStep(1);
    priv(em).raiseAlarm(asE(raiser), null);
    expect([m.run.alarm, em.guardAlarms]).toEqual([1, 1]);
    // its team searching: the next stage
    (em.teams[0]!.members[0] as unknown as Fake).level = 'searching';
    priv(em).repeatStep(0.1);
    priv(em).raiseAlarm(asE(raiser), null);
    expect([m.run.alarm, em.teams.length]).toEqual([2, 2]);
    // stage 2 gear on the section's guards (guard-rules S1, A3: armour and helmet)
    expect(spawned.slice(0, 2).every((f) => f.helmet && f.armour)).toBe(true);
    priv(em).repeatStep(ALARM_REPEAT.rearm);
    priv(em).raiseAlarm(asE(raiser), null);
    expect([m.run.alarm, em.guardAlarms]).toEqual([3, 3]);
    priv(em).repeatStep(ALARM_REPEAT.rearm * 2);
    priv(em).raiseAlarm(asE(raiser), null);
    expect([m.run.alarm, em.guardAlarms]).toEqual([3, 3]);
    // a restart (the load's resetAlarm): the count and the lock start over
    m.run.restartSection();
    em.despawnAll();
    load();
    expect([em.guardAlarms, em.alarmOpen(), em.alarmRepeat]).toEqual([0, true, true]);
  });
});
