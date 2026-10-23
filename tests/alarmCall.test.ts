import { describe, expect, it, vi } from 'vitest';
import { EnemyManager, RADIO_ALARM } from '../src/ai/enemyManager';
import { ALARM_CALL, CommandCall } from '../src/ai/alarm';
import { DIFFICULTY } from '../src/ai/archetypes';
import { RADIO } from '../src/ai/radioNet';
import { ALERT, AlertMachine, emptyAlertInput } from '../src/ai/alertState';
import { BEHAVIOUR, P_AGGRESSIVE, P_STANDARD } from '../src/ai/squadRoles';
import { BARKS, RADIO_BARKS } from '../src/ai/barks';
import { Vector3, type Scene } from '../src/core/babylon';
import type { AiContext, Enemy } from '../src/ai/enemy';
import type { GuardAiLayout, ReinforceEntry } from '../src/ai/guardAiData';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (guard-ai S6, design 7, M4, M1) The alarm by radio and the reinforcements: a contact call that gets through starts the
// command call (RADIO.report x reaction; the officer in voice range takes it, else the caller); its completion raises
// the alarm with no panel. Cut the caller: the next guard in the fight takes it ALARM_CALL.retry s later; nobody left,
// no alarm. Cut the contact call first: nothing is owed. Reinforcements are aggressive, told by command, never calm.

interface FakeGuard {
  id: string;
  num: number;
  key: number;
  alive: boolean;
  alerted: boolean;
  passive: boolean;
  taken: boolean;
  blindT: number;
  runningAlarm: boolean;
  secure: boolean;
  dog: null;
  buff: boolean;
  level: string;
  incident: number;
  section: number;
  targetInView: boolean;
  aware: { fought: boolean };
  def: { melee: object | null; kind: string; scale: number };
  pos: Vector3;
  yaw: number;
  radio: ReturnType<typeof vi.fn>;
  bark: ReturnType<typeof vi.fn>;
  alert: ReturnType<typeof vi.fn>;
  joinAsReinforcement: ReturnType<typeof vi.fn>;
  /** (guard-ai S24) his intruder slot, and told of one. */
  hunt: number;
  tell: ReturnType<typeof vi.fn>;
}

let n = 0;
function guard(x: number, z: number, o: Partial<FakeGuard> = {}): FakeGuard {
  const num = 9000 + n++;
  return {
    id: `a${num}`,
    num,
    key: n % 32,
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
    aware: { fought: false },
    def: { melee: null, kind: 'grunt', scale: 1 },
    pos: new Vector3(x, 0, z),
    yaw: 0,
    radio: vi.fn(),
    bark: vi.fn(),
    alert: vi.fn(),
    joinAsReinforcement: vi.fn(),
    hunt: -1,
    tell: vi.fn(),
    ...o,
  };
}

/** A fighting guard (in combat). */
const fighter = (x: number, z: number, o: Partial<FakeGuard> = {}): FakeGuard => guard(x, z, { alerted: true, level: 'alert', aware: { fought: true }, ...o });

/** A stealth-mode manager on a stub world (open floor, no walls); `run(sec)` steps the 10 Hz radio net. */
function manager(gs: FakeGuard[], guardAi?: GuardAiLayout) {
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: [], guardAi },
    doors: { list: [] },
  };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: vi.fn(() => true) } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  em.stealth = true;
  for (const g of gs) em.enemies.push(g as unknown as Enemy);
  const priv = em as unknown as { ctx: AiContext; radioStep(dt: number): void };
  const onAlarm = vi.fn();
  em.onAlarm = onAlarm;
  let clock = 0;
  let raisedAt = -1;
  const run = (sec: number): number => {
    for (let k = 0; k < Math.round(sec / 0.1); k++) {
      clock += 0.1;
      priv.radioStep(0.1);
      if (raisedAt < 0 && em.alarmRaised) raisedAt = clock;
    }
    return raisedAt;
  };
  return { em, ctx: priv.ctx, run, onAlarm, now: () => clock };
}

const E = (g: FakeGuard) => g as unknown as Enemy;
const contact = (ctx: AiContext, g: FakeGuard): void => ctx.radioCall!(E(g), -1, 'contact');

describe('CommandCall (pure)', () => {
  it('owed once a contact gets through; one caller; cut -> the next after ALARM_CALL.retry; raised settles it', () => {
    const c = new CommandCall();
    expect(c.tick(0.1, false)).toBe(false);
    expect(c.owe()).toBe(true);
    c.start(7);
    expect(c.owe()).toBe(false);
    expect(c.tick(0.1, true)).toBe(false);
    // the call is gone without the alarm: cut
    expect(c.tick(0.1, false)).toBe(false);
    expect(c.lost).toBe(1);
    expect(c.caller).toBe(-1);
    let t = 0;
    while (!c.tick(0.1, false)) t += 0.1;
    expect(t + 0.1).toBeCloseTo(ALARM_CALL.retry, 5);
    c.start(8);
    c.raised();
    expect(c.owed).toBe(false);
    expect(c.tick(0.1, false)).toBe(false);
  });

  it('lapse: nobody left to call, nothing owed; refused: wait the retry', () => {
    const c = new CommandCall();
    c.owe();
    c.lapse();
    expect(c.owed).toBe(false);
    expect(c.lapsed).toBe(1);
    c.owe();
    c.refused();
    expect(c.tick(ALARM_CALL.retry - 0.5, false)).toBe(false);
    expect(c.tick(0.6, false)).toBe(true);
  });
});

describe('the alarm by radio (wired)', () => {
  it('RADIO_ALARM is on; a contact through -> the caller holds the command call RADIO.report s -> the alarm, no panel', () => {
    expect(RADIO_ALARM).toBe(true);
    const spotter = fighter(0, 0);
    const mate = guard(20, 0);
    const { em, ctx, run, onAlarm } = manager([spotter, mate]);
    contact(ctx, spotter);
    run(RADIO.callIn + 0.05);
    expect(em.command.caller).toBe(spotter.num);
    expect(spotter.bark).toHaveBeenCalledWith('command');
    expect(em.radioLeft(E(spotter))).toBeGreaterThan(RADIO.report - 0.2);
    expect(em.alarmRaised).toBe(false);
    const at = run(RADIO.report + 0.2);
    expect(at).toBeGreaterThanOrEqual(RADIO.callIn + RADIO.report - 0.01);
    expect(at).toBeLessThanOrEqual(RADIO.callIn + RADIO.report + 0.2);
    expect(em.alarmBy).toBe('radio');
    expect(onAlarm).toHaveBeenCalledTimes(1);
    expect(onAlarm.mock.calls[0]![0]).toBe(spotter);
    expect(onAlarm.mock.calls[0]![1]).toBeNull();
  });

  it('(stack-tip fix) the command call starting at the contact completion does not delay the section (call + staggerMax)', () => {
    // the e2e-stealth-ai 'radio' layout: a near mate (~11 m) and a far one (~24 m), out of voice range
    const spotter = fighter(0, 5);
    const near = guard(10, 9);
    const far = guard(-21, 17);
    const { em, ctx, run, now } = manager([spotter, near, far]);
    contact(ctx, spotter);
    let nearT = -1;
    let farT = -1;
    while (now() < RADIO.callIn + RADIO.staggerMax + 1) {
      run(0.1);
      if (nearT < 0 && near.radio.mock.calls.length) nearT = now();
      if (farT < 0 && far.radio.mock.calls.length) farT = now();
    }
    // his command call still ran on its own clock (callIn + report): the alarm by radio
    expect(em.alarmBy).toBe('radio');
    expect(spotter.bark).toHaveBeenCalledWith('command');
    expect(nearT).toBeGreaterThanOrEqual(RADIO.callIn - 1e-6);
    expect(farT).toBeGreaterThan(nearT);
    expect(farT).toBeLessThanOrEqual(RADIO.callIn + RADIO.staggerMax + 0.1 + 1e-6);
  });

  it('the caller cut during his contact call: nothing owed, no command call, no alarm', () => {
    const spotter = fighter(0, 0);
    const mate = fighter(5, 0);
    const { em, ctx, run } = manager([spotter, mate]);
    contact(ctx, spotter);
    run(1.5);
    ctx.radioCut!(E(spotter));
    spotter.alive = false;
    run(20);
    expect(em.command.started).toBe(0);
    expect(em.alarmRaised).toBe(false);
  });

  it('the commander cut, nobody else in the fight: the debt lapses, no alarm', () => {
    const spotter = fighter(0, 0);
    const calm = guard(8, 0);
    const { em, ctx, run } = manager([spotter, calm]);
    contact(ctx, spotter);
    run(RADIO.callIn + 1);
    expect(em.command.caller).toBe(spotter.num);
    ctx.radioCut!(E(spotter));
    spotter.alive = false;
    run(ALARM_CALL.retry + RADIO.report + 2);
    expect(em.alarmRaised).toBe(false);
    expect(em.command.lapsed).toBe(1);
    expect(calm.bark).not.toHaveBeenCalledWith('command');
  });

  it('the commander cut, a squadmate still fighting: he takes the call ALARM_CALL.retry s later and it gets through', () => {
    const spotter = fighter(0, 0);
    const mate = fighter(12, 0);
    const { em, ctx, run, now } = manager([spotter, mate]);
    contact(ctx, spotter);
    run(RADIO.callIn + 1);
    const cutAt = now();
    ctx.radioCut!(E(spotter));
    spotter.taken = true;
    run(ALARM_CALL.retry - 0.3);
    expect(em.command.caller).toBe(-1);
    run(0.5);
    expect(em.command.caller).toBe(mate.num);
    expect(mate.bark).toHaveBeenCalledWith('command');
    const at = run(RADIO.report + 1);
    expect(at - cutAt).toBeGreaterThanOrEqual(ALARM_CALL.retry + RADIO.report - 0.15);
    expect(at - cutAt).toBeLessThanOrEqual(ALARM_CALL.retry + RADIO.report + 0.35);
    expect(em.command.lost).toBe(1);
  });

  it('the officer in the caller voice range takes the command call; one out of it does not', () => {
    const spotter = fighter(0, 0);
    const officer = fighter(3, 0, { def: { melee: null, kind: 'officer', scale: 1 } });
    const m1 = manager([spotter, officer]);
    contact(m1.ctx, spotter);
    m1.run(RADIO.callIn + 0.05);
    expect(m1.em.command.caller).toBe(officer.num);
    const s2 = fighter(0, 0);
    const far = fighter(30, 0, { def: { melee: null, kind: 'officer', scale: 1 } });
    const m2 = manager([s2, far]);
    contact(m2.ctx, s2);
    m2.run(RADIO.callIn + 0.05);
    expect(m2.em.command.caller).toBe(s2.num);
  });

  it('the next caller: one out of the target sight first, then an officer, then the lower key; never a dog, melee, held or blind guard', () => {
    const spotter = fighter(0, 0);
    const sees = fighter(4, 0, { key: 1, targetInView: true });
    const hidden = fighter(9, 0, { key: 5 });
    const blind = fighter(6, 0, { key: 0, blindT: 2 });
    const runner = fighter(7, 0, { key: 0, def: { melee: {}, kind: 'runner', scale: 1 } });
    const { em, ctx, run } = manager([spotter, sees, hidden, blind, runner]);
    contact(ctx, spotter);
    run(RADIO.callIn + 1);
    ctx.radioCut!(E(spotter));
    spotter.alive = false;
    run(ALARM_CALL.retry + 0.2);
    expect(em.command.caller).toBe(hidden.num);
  });

  it('one command call per section: a second contact through while it is open starts no second one', () => {
    const a = fighter(0, 0);
    const b = fighter(30, 0);
    const { em, ctx, run } = manager([a, b]);
    contact(ctx, a);
    run(1);
    contact(ctx, b);
    run(RADIO.callIn);
    expect(em.command.started).toBe(1);
    expect(em.radioNet.refused).toBe(0);
    run(RADIO.report);
    expect(em.alarmRaised).toBe(true);
    expect(em.radioNet.alarms).toBe(1);
  });

  it('no command call outside stealth rules, in the parked modes, or once the alarm is up (a panel); resetAlarm clears the debt', () => {
    const s1 = fighter(0, 0);
    const m1 = manager([s1]);
    m1.em.stealth = false;
    contact(m1.ctx, s1);
    m1.run(RADIO.callIn + RADIO.report + 1);
    expect(m1.em.command.started).toBe(0);
    expect(m1.em.alarmRaised).toBe(false);
    const s2 = fighter(0, 0);
    const m2 = manager([s2]);
    m2.em.coordinated = false;
    m2.ctx.radioCall!(E(s2), -1, 'contact');
    expect(m2.em.radioNet.openCalls).toBe(0);
    const s3 = fighter(0, 0);
    const m3 = manager([s3]);
    m3.em.alarmRaised = true;
    contact(m3.ctx, s3);
    m3.run(RADIO.callIn + 0.2);
    expect(m3.em.command.started).toBe(0);
    const s4 = fighter(0, 0);
    const m4 = manager([s4]);
    contact(m4.ctx, s4);
    m4.run(RADIO.callIn + 0.2);
    expect(m4.em.command.owed).toBe(true);
    m4.em.resetAlarm();
    m4.em.radioNet.clear();
    expect(m4.em.command.owed).toBe(false);
    m4.run(RADIO.report + 1);
    expect(m4.em.alarmRaised).toBe(false);
  });

  it('setSection: the net serves the Sector index (the alarm reaches the sink with it)', () => {
    const s = fighter(0, 0);
    const { em } = manager([s]);
    em.setSection(2);
    expect(em.radioNet.section).toBe(2);
  });
});

describe('reinforcements (wired)', () => {
  it('joinReinforcement: coordinated -> aggressive, told by command, in his section, with the entry route; parked -> alerted', () => {
    const g = guard(0, 0);
    const { em } = manager([g]);
    const route: [number, number][] = [
      [1, 2],
      [3, 4],
    ];
    em.joinReinforcement(E(g), 3, route);
    expect(g.section).toBe(3);
    // (guard-ai S24) and told of the alarm caller's intruder (none raised here: -1)
    expect(g.joinAsReinforcement).toHaveBeenCalledWith(route, -1);
    expect(g.alert).not.toHaveBeenCalled();
    const h = guard(0, 0);
    em.coordinated = false;
    em.joinReinforcement(E(h), 1, null);
    expect(h.alert).toHaveBeenCalledTimes(1);
    expect(h.joinAsReinforcement).not.toHaveBeenCalled();
  });

  it("entriesFor: the map's entries of that section only", () => {
    const entries: ReinforceEntry[] = [
      { section: 0, at: [1, 1] },
      { section: 1, at: [2, 2], route: [[3, 3]] },
      { section: 1, at: [4, 4] },
    ];
    const { em } = manager([], { entries });
    const out: ReinforceEntry[] = [];
    expect(em.entriesFor(1, out).map((e) => e.at[0])).toEqual([2, 4]);
    expect(em.entriesFor(5, out)).toEqual([]);
  });

  it('Enemy.joinAsReinforcement: profile aggressive (the S5 string and S8 tacticsProfile), entering with a route, told (radio 0)', async () => {
    const { Enemy: EnemyClass } = await import('../src/ai/enemy');
    const radio = vi.fn();
    const e = Object.create(EnemyClass.prototype) as Enemy;
    Object.assign(e, { profile: 'standard', tacticsProfile: P_STANDARD, radio });
    e.joinAsReinforcement([[1, 1]]);
    expect(e.profile).toBe('aggressive');
    expect(e.tacticsProfile).toBe(P_AGGRESSIVE);
    expect(e.behaviour).toBe(BEHAVIOUR.aggressive);
    expect(e.entering).toBe(true);
    expect(radio).toHaveBeenCalledWith(0, -1);
    e.joinAsReinforcement([]);
    expect(e.entering).toBe(false);
  });
});

describe('behaviour profiles (keyed off the S8 numeric tacticsProfile)', () => {
  it('Enemy.behaviour is profileOf(tacticsProfile); standard keeps the old combat numbers, aggressive bounds fast and never calms', async () => {
    const { Enemy: EnemyClass } = await import('../src/ai/enemy');
    const e = Object.create(EnemyClass.prototype) as Enemy;
    e.tacticsProfile = P_STANDARD;
    expect(e.behaviour).toBe(BEHAVIOUR.standard);
    // today's guard: 2.5 s between bounds, 85% to cover on contact, walks the last stretch
    expect(e.behaviour.advanceHold).toBe(2.5);
    expect(e.behaviour.coverFirst).toBe(0.85);
    expect(e.behaviour.runToContact).toBe(false);
    expect(e.behaviour.neverCautious).toBe(false);
    e.tacticsProfile = P_AGGRESSIVE;
    expect(e.behaviour).toBe(BEHAVIOUR.aggressive);
    expect(e.behaviour.advanceHold).toBeLessThan(BEHAVIOUR.standard.advanceHold);
    expect(e.behaviour.coverFirst).toBeLessThan(BEHAVIOUR.standard.coverFirst);
    expect(e.behaviour.runToContact).toBe(true);
    expect(e.behaviour.knowsLkp).toBe(true);
    expect(e.behaviour.neverCautious).toBe(true);
  });

  it('a hunting (aggressive, fought) guard never ends his search; anyone else cools down at ALERT.searchTime', () => {
    for (const hunting of [false, true]) {
      const m = new AlertMachine();
      m.set('alert');
      m.set('searching');
      const i = emptyAlertInput();
      i.hunting = hunting;
      for (let t = 0; t < ALERT.searchTime * 3; t += 0.5) m.step(0.5, i);
      expect(m.level).toBe(hunting ? 'searching' : 'cooldown');
    }
  });

  it('the command line is a radio bark', () => {
    expect(BARKS.command.length).toBeGreaterThan(0);
    expect(RADIO_BARKS.has('command')).toBe(true);
  });
});
