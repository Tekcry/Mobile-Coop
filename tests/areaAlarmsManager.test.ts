import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnemyManager } from '../src/ai/enemyManager';
import { ALARM_CALL, ALARM_REPEAT, type AlarmPanel, type CommandCall } from '../src/ai/alarm';
import type { AreaBox } from '../src/ai/areaAlarms';
import { DIFFICULTY, type DifficultyDef } from '../src/ai/archetypes';
import { RADIO } from '../src/ai/radioNet';
import { ENEMIES, type EnemyKind } from '../src/ai/enemyDefs';
import { flags } from '../src/core/flags';
import { Enemy, type AiContext } from '../src/ai/enemy';
import { Vector3, type Scene } from '../src/core/babylon';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';
import { AlertMachine } from '../src/ai/alertState';

// (guard-ai-mission-hooks S3, D6, A9, A10; flag `areaAlarms`) Per-area alarm stages on the real manager. With areas set
// by the mission (`setAreas`, Campaign Build C5) each guard has the area holding the point he was placed at; a radio
// alarm raises only its caller's area (its own lock, count, command call and rearm on J15 S5's rule); a panel raises the
// site; `setAreaStage` gears only that area's guards (helmet rule `stage`); the carry rule reads max(site, his area).
// No areas or the flag off: J15's rule exactly. The harness is a copy of `tests/alarmRepeat.test.ts`'s (not imported
// across test files), with `area`, `zoneX`, `zoneZ` on the stand-in guard.

/** Private parts the tests drive. */
type Priv = {
  ctx: AiContext;
  areas: readonly AreaBox[] | null;
  areaCmd: readonly CommandCall[];
  areaCmdId: Int32Array;
  radioNet: { isOpen(id: number): boolean; commandOpen: boolean };
  radioStep(dt: number): void;
  repeatStep(dt: number): void;
  raiseAlarm(e: Enemy, p: AlarmPanel | null, area?: number): void;
  nextCaller(area?: number): Enemy | null;
};
const priv = (em: EnemyManager): Priv => em as unknown as Priv;

/** A stand-in guard: what the radio net, the command call, the placement, the stage gear and the team read. */
function fake(kind: EnemyKind = 'grunt', x = 0, z = 0, o: Record<string, unknown> = {}) {
  const num = 9700 + fake.n++;
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
    helmetSoaked: false,
    roleFlags: 0,
    area: -1,
    zoneX: x,
    zoneZ: z,
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
const fighter = (x: number, z: number, o: Record<string, unknown> = {}): Fake =>
  fake('grunt', x, z, { alerted: true, level: 'alert', aware: { level: 'alert', t: 0, fought: true }, ...o });

/** The real manager on a stub world (open floor); `spawn` makes stand-ins. */
function manager(gs: Fake[] = [], diff: DifficultyDef = DIFFICULTY.normal) {
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
    addShadowCaster: vi.fn(),
  };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: vi.fn(() => true) } as unknown as Ballistics, {} as Vfx, diff, () => []);
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

/** The mode's part of an alarm (`StealthSystems.onAlarm`): one response team (a stand-in member); and `alarmArea` as
 *  `onAlarm` reads it (C5). */
function teamOnAlarm(em: EnemyManager): { members: Fake[]; areas: number[] } {
  const members: Fake[] = [];
  const areas: number[] = [];
  em.onAlarm = () => {
    areas.push(em.alarmArea);
    const t = em.newTeam(0, null, [], []);
    const f = fake('grunt', 50, 0, { alerted: true, level: 'alert' });
    t.members.push(asE(f));
    members.push(f);
  };
  return { members, areas };
}

/** A contact call through, then the command call: the radio alarm (RADIO.callIn + RADIO.report and a margin). */
const radioAlarm = (ctx: AiContext, run: (s: number) => void, g: Fake): void => {
  ctx.radioCall!(asE(g), -1, 'contact');
  run(RADIO.callIn + RADIO.report + 0.6);
};

/** Area 0: x <= 0; area 1: x > 0 (both z -10..10). */
const BOXES: AreaBox[] = [{ boxes: [[-10, -10, 0, 10]] }, { boxes: [[0.01, -10, 10, 10]] }];

/** A manager with an area-0 fighter (-5, 0) and an area-1 fighter (5, 0), areas set. */
function twoAreas(o: { repeat?: boolean; diff?: DifficultyDef } = {}) {
  const g0 = fighter(-5, 0);
  const g1 = fighter(5, 0);
  const h = manager([g0, g1], o.diff);
  h.em.alarmRepeat = o.repeat ?? false;
  h.em.setAreas(BOXES);
  return { ...h, g0, g1 };
}

let saved = false;
beforeEach(() => {
  saved = flags.areaAlarms;
  flags.areaAlarms = true;
});
afterEach(() => {
  flags.areaAlarms = saved;
});

describe('per-area alarms (guard-ai-mission-hooks S3)', () => {
  it('flag off: setAreas stores nothing; the radio alarm is J15 (site, one lock)', () => {
    flags.areaAlarms = false;
    const { em, run, ctx, g0, g1 } = twoAreas();
    const rec = teamOnAlarm(em);
    expect(priv(em).areas).toBeNull();
    expect([g0.area, g1.area]).toEqual([-1, -1]);
    radioAlarm(ctx, run, g0);
    expect([rec.areas, em.guardAlarms, em.alarmRaised, em.alarmArea]).toEqual([[-1], 1, true, -1]);
    radioAlarm(ctx, run, g1);
    expect([rec.areas.length, em.guardAlarms, em.alarmsRaised]).toEqual([1, 1, 1]);
  });

  it("a radio alarm in area 0 raises area 0 only: the panels and area 1 stay free; area 1 raises its own", () => {
    const { em, run, ctx, g0, g1 } = twoAreas();
    const rec = teamOnAlarm(em);
    expect([g0.area, g1.area]).toEqual([0, 1]);
    radioAlarm(ctx, run, g0);
    expect(rec.areas).toEqual([0]);
    expect([em.areaSt.count[0], em.guardAlarms, em.alarmRaised, em.alarmBy]).toEqual([1, 0, false, 'radio']);
    expect([em.alarmOpen(), em.alarmOpenIn(0), em.alarmOpenIn(1)]).toEqual([true, false, true]);
    radioAlarm(ctx, run, g1);
    expect(rec.areas).toEqual([0, 1]);
    expect([em.areaSt.count[1], em.alarmsRaised, em.sectionCounts.radioAlarms]).toEqual([1, 2, 2]);
    expect([em.alarmOpenIn(1), em.alarmOpen()]).toEqual([false, true]);
  });

  it("each area its own command call: area 1's debt survives area 0's call and raise, then its own call raises it", () => {
    const { em, run, ctx, g0, g1 } = twoAreas();
    const rec = teamOnAlarm(em);
    const p = priv(em);
    ctx.radioCall!(asE(g0), -1, 'contact');
    run(RADIO.callIn + 0.2);
    // area 0's command call in flight, on the net by its id
    expect(p.areaCmd[0]!.caller).toBe(g0.num);
    expect(p.radioNet.isOpen(p.areaCmdId[0]!)).toBe(true);
    expect(em.command.owed).toBe(false);
    // area 1's contact gets through while it is open: area 1 owes its own (the net holds one command call at a time,
    // so its call waits for its retry), and area 0's call is untouched
    ctx.radioCall!(asE(g1), -1, 'contact');
    run(RADIO.callIn + 0.2);
    expect([p.areaCmd[1]!.owed, p.areaCmd[0]!.caller]).toEqual([true, g0.num]);
    // area 0's call completes: area 0 raises; area 1 still owed
    run(RADIO.report);
    expect(rec.areas).toEqual([0]);
    expect([p.areaCmd[0]!.owed, p.areaCmd[1]!.owed, em.areaSt.count[1]]).toEqual([false, true, 0]);
    // area 1's own call: its guard first, then it raises area 1
    run(ALARM_CALL.retry + RADIO.report + 0.6);
    expect(rec.areas).toEqual([0, 1]);
    expect([p.areaCmd[1]!.owed, em.areaSt.count[1], em.guardAlarms]).toEqual([false, 1, 0]);
    expect(em.command.started).toBe(0);
  });

  it('per-area repeat: its own team or rearm s, the other area untouched, max per area; resetAlarm clears both', () => {
    const { em, g0, g1 } = twoAreas({ repeat: true });
    const { members } = teamOnAlarm(em);
    const p = priv(em);
    const st = em.areaSt;
    p.raiseAlarm(asE(g0), null, 0);
    p.repeatStep(5);
    expect([em.alarmOpenIn(0), em.alarmOpenIn(1), st.ago[1]]).toEqual([false, true, 0]);
    // its team searching: area 0 opens
    members[0]!.level = 'searching';
    p.repeatStep(0.1);
    expect(em.alarmOpenIn(0)).toBe(true);
    p.raiseAlarm(asE(g1), null, 1);
    p.raiseAlarm(asE(g0), null, 0);
    expect([st.count[0], st.count[1], members.length]).toEqual([2, 1, 3]);
    // area 1's team searching opens area 1, not area 0
    members[1]!.level = 'searching';
    p.repeatStep(0.1);
    expect([em.alarmOpenIn(0), em.alarmOpenIn(1)]).toEqual([false, true]);
    // area 0 by time
    p.repeatStep(ALARM_REPEAT.rearm);
    expect(em.alarmOpenIn(0)).toBe(true);
    p.raiseAlarm(asE(g0), null, 0);
    expect(st.count[0]).toBe(ALARM_REPEAT.max);
    // never a fourth in area 0
    for (const m of members) m.level = 'searching';
    p.repeatStep(ALARM_REPEAT.rearm * 2);
    p.raiseAlarm(asE(g0), null, 0);
    expect([st.count[0], em.alarmOpenIn(0), em.guardAlarms, em.alarmsRaised]).toEqual([ALARM_REPEAT.max, false, 0, ALARM_REPEAT.max + 1]);
    // resetAlarm (a load / restart): both locks, counts and command calls; the area stages stay (the mission's)
    em.setAreaStage(1, 2);
    p.areaCmd[1]!.owe();
    em.resetAlarm();
    expect([st.count[0], st.count[1], em.alarmOpenIn(0), em.alarmOpenIn(1), p.areaCmd[1]!.owed, em.alarmArea]).toEqual([0, 0, true, true, false, -1]);
    expect(st.stage[1]).toBe(2);
  });

  it('a panel stays site-wide; a caller with no area raises the site lock', () => {
    const { em, g0 } = twoAreas();
    const rec = teamOnAlarm(em);
    em.alarms.push({ id: 'p1', x: -4, y: 0, z: 0, yaw: 0, disabled: false });
    priv(em).raiseAlarm(asE(g0), em.alarms[0]!);
    expect([rec.areas, em.guardAlarms, em.alarmBy, em.alarmRaised]).toEqual([[-1], 1, 'panel', true]);
    expect([em.alarmOpen(), em.alarmOpenIn(0), em.alarmOpenIn(1), em.areaSt.any()]).toEqual([false, true, true, false]);
    // a guard outside both areas: his radio alarm is the site's
    const out = fighter(50, 0);
    const h = twoAreas();
    h.em.enemies.push(asE(out));
    h.em.setAreas(BOXES);
    const rec2 = teamOnAlarm(h.em);
    expect(out.area).toBe(-1);
    radioAlarm(h.ctx, h.run, out);
    expect([rec2.areas, h.em.guardAlarms, h.em.alarmRaised, h.em.alarmOpenIn(0)]).toEqual([[-1], 1, true, true]);
  });

  it("gear (helmet rule stage): setAreaStage gears that area's guards, now and placed later; the site stage reaches all", () => {
    const { em, g0, g1 } = twoAreas();
    em.setAreaStage(0, 2);
    expect([g0.helmet, g0.armour, g1.helmet, g1.armour]).toEqual([true, true, false, false]);
    const a = fake('grunt', -3, 0);
    em.placeSlot(asE(a), { yaw: 0 }, 0);
    const b = fake('grunt', 3, 0);
    em.placeSlot(asE(b), { yaw: 0 }, 0);
    em.enemies.push(asE(a), asE(b));
    expect([a.area, a.helmet, a.armour, b.area, b.helmet, b.armour]).toEqual([0, true, true, 1, false, false]);
    em.setAlarmStage(2);
    expect([g1.helmet, g1.armour, b.helmet, b.armour]).toEqual([true, true, true, true]);
    // out of range: nothing
    em.setAreaStage(2, 3);
    em.setAreaStage(-1, 3);
    expect([em.areaSt.stage[0], em.areaSt.stage[1]]).toEqual([2, 0]);
  });

  it('gear (helmet rule always): an area stage adds no gear; the placement helmet is as J15', () => {
    const { em, g0 } = twoAreas({ diff: DIFFICULTY.realistic });
    em.useDifficultyHelmets();
    expect(em.helmetRule).toBe('always');
    em.setAreaStage(0, 2);
    expect([g0.helmet, g0.armour]).toEqual([false, false]);
    const a = fake('grunt', -3, 0);
    em.placeSlot(asE(a), { yaw: 0 }, 0);
    const j15 = manager([], DIFFICULTY.realistic).em;
    j15.useDifficultyHelmets();
    const c = fake('grunt', -3, 0);
    j15.placeSlot(asE(c), { yaw: 0 }, 0);
    expect([a.helmet, a.armour]).toEqual([c.helmet, c.armour]);
    expect([a.helmet, a.armour]).toEqual([true, false]);
  });

  it('areas at placement: spawn point (height band), reinforcement entry, setAreas from zoneX / zoneZ, kept by clear()', () => {
    const { em, spawned } = manager();
    em.setAreas([{ boxes: [[-10, -10, 0, 10]], y: [-1, 2] }, { boxes: [[0.01, -10, 10, 10]] }]);
    const low = fake('grunt', -5, 0);
    em.placeSlot(asE(low), { yaw: 0 }, 0);
    const high = fake('grunt', -5, 0, { pos: new Vector3(-5, 5, 0) });
    em.placeSlot(asE(high), { yaw: 0 }, 0);
    expect([low.area, high.area]).toEqual([0, -1]);
    const r = em.spawnReinforcement('grunt', new Vector3(5, 0, 0), 0, 0, null);
    expect(r).toBe(asE(spawned[0]!));
    expect(spawned[0]!.area).toBe(1);
    // setAreas again: a living guard's area from where he was placed, not where he stands now
    const moved = fake('grunt', -5, 0, { pos: new Vector3(5, 0, 0) });
    em.enemies.push(asE(moved));
    em.setAreas(BOXES);
    expect(moved.area).toBe(0);
    em.clear();
    expect(priv(em).areas).toBe(BOXES);
    const later = fake('grunt', 4, 0);
    em.placeSlot(asE(later), { yaw: 0 }, 0);
    expect(later.area).toBe(1);
  });

  it("the carry rule's reads: his area's alarm and max(site, his area); no areas = the site's; inherit keeps the area", () => {
    const { em, ctx, g0, g1 } = twoAreas();
    teamOnAlarm(em);
    priv(em).raiseAlarm(asE(g0), null, 0);
    expect([ctx.areaRaised!(asE(g0)), ctx.areaRaised!(asE(g1)), ctx.alarmRaised()]).toEqual([true, false, false]);
    em.setAreaStage(1, 2);
    expect([ctx.areaStage!(asE(g0)), ctx.areaStage!(asE(g1))]).toEqual([0, 2]);
    em.setAlarmStage(3);
    expect([ctx.areaStage!(asE(g0)), ctx.areaStage!(asE(g1))]).toEqual([3, 3]);
    // the real Enemy's carry rule on this ctx: area 0's alarm keeps its guard from calm, the area-1 guard is calm; an
    // area-1 stage takes his calm too
    em.setAlarmStage(0);
    em.setAreaStage(1, 0);
    const probe = (area: number) =>
      Object.assign(Object.create(Enemy.prototype) as Enemy, { ctx, area, aware: new AlertMachine(), caution: 0, incident: -1, camBody: null, responder: false, crew: null, postDef: null, taken: false }) as unknown as { carryCalm(): boolean };
    expect([probe(0).carryCalm(), probe(1).carryCalm()]).toEqual([false, true]);
    em.setAreaStage(1, 1);
    expect(probe(1).carryCalm()).toBe(false);
    // no areas: the site's
    const f = fighter(-5, 0);
    const h = manager([f]);
    const e = asE(f);
    priv(h.em).raiseAlarm(e, null, 0);
    h.em.setAlarmStage(2);
    expect([h.ctx.areaRaised!(e), h.ctx.areaStage!(e)]).toEqual([h.em.alarmRaised, h.em.alarmStage]);
    expect([h.em.alarmRaised, h.em.alarmArea]).toEqual([true, -1]);
    // a woken guard (a new Enemy) keeps his area
    const woken = Object.assign(Object.create(Enemy.prototype) as object, { post: [0, 0], pos: { x: 0, z: 0 }, setPost: vi.fn(), setCaution: vi.fn(), setGear: vi.fn() }) as unknown as Enemy;
    const old = { area: 1, post: [1, 2], walker: { tick: vi.fn(), rejoin: vi.fn() } } as unknown as Enemy;
    woken.inherit(old);
    expect(woken.area).toBe(1);
  });

  it("nextCaller(area): out of sight first, then the area's own guard over a lower key elsewhere; never a holder", () => {
    const a0 = fighter(-5, 0, { key: 30 });
    const a1 = fighter(5, 0, { key: 2 });
    const { em } = manager([a0, a1]);
    em.setAreas(BOXES);
    const p = priv(em);
    expect([p.nextCaller(0), p.nextCaller(1), p.nextCaller()]).toEqual([asE(a0), asE(a1), asE(a1)]);
    // in sight loses to out of sight, whatever his area
    a0.targetInView = true;
    expect(p.nextCaller(0)).toBe(asE(a1));
    a0.targetInView = false;
    // a guard who holds another command call is not picked
    (p.areaCmd[1] as CommandCall).start(a0.num);
    expect(p.nextCaller(0)).toBe(asE(a1));
  });

  it('no areas = J15: setAreas(null), one radio alarm and the second shut', () => {
    const { em, run, ctx, g0, g1 } = twoAreas();
    em.setAreas(null);
    const rec = teamOnAlarm(em);
    expect([g0.area, g1.area, priv(em).areas]).toEqual([-1, -1, null]);
    radioAlarm(ctx, run, g0);
    radioAlarm(ctx, run, g1);
    expect([rec.areas, em.guardAlarms, em.alarmRaised, em.alarmOpen(), em.alarmsRaised]).toEqual([[-1], 1, true, false, 1]);
  });

  it('no allocation: the area arrays and command calls keep their identity over 200 steps', () => {
    const { em, ctx, g0 } = twoAreas({ repeat: true });
    teamOnAlarm(em);
    const st = em.areaSt;
    const p = priv(em);
    const refs = [st.stage, st.raised, st.rearmed, st.count, st.ago, st.team0, st.teamN, p.areaCmd, p.areaCmd[0], p.areaCmd[1], p.areaCmdId];
    p.raiseAlarm(asE(g0), null, 0);
    ctx.radioCall!(asE(g0), -1, 'contact');
    for (let i = 0; i < 200; i++) {
      p.repeatStep(0.1);
      p.radioStep(0.1);
    }
    const now = [st.stage, st.raised, st.rearmed, st.count, st.ago, st.team0, st.teamN, p.areaCmd, p.areaCmd[0], p.areaCmd[1], p.areaCmdId];
    for (let i = 0; i < refs.length; i++) expect(now[i]).toBe(refs[i]);
  });
});
