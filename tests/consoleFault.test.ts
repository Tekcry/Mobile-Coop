import { describe, expect, it, vi } from 'vitest';
import { CONSOLE_FAULT, CONSOLE_GROUP, ConsoleFaults, consoleInView, isConsoleGroup, V_FAULT, V_TAMPER, type ConsoleHost } from '../src/ai/consoleFault';
import { CIRCUIT_KEY } from '../src/ai/breaker';
import { BREAKER } from '../src/ai/gear';
import { BARKS, RADIO_BARKS } from '../src/ai/barks';
import { AlertMachine, type AlertLevel } from '../src/ai/alertState';
import { EnemyManager } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { Vector3, type Scene } from '../src/core/babylon';
import { LightRegistry } from '../src/world/lights';
import type { Enemy } from '../src/ai/enemy';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (guard-ai S22, Michael's walk of 4.72 G6) "if i turn it off while hes distracted, he should notice when he sees it and
// turn it back on also."

describe('ConsoleFaults and consoleInView (pure)', () => {
  it('a switch-off is a fresh cut; on again is not; consoles are found by id and by their pseudo circuit', () => {
    const c = new ConsoleFaults();
    const i = c.set('con', 1, 0, 2, true);
    expect(c.fresh).toBe(false);
    expect(c.isOff(i)).toBe(false);
    expect(c.set('con', 1, 0, 2, false)).toBe(i);
    expect(c.fresh).toBe(true);
    expect(c.isOff(i)).toBe(true);
    c.set('con', 1, 0, 2, false);
    expect(c.fresh).toBe(false);
    expect(c.cut[i]).toBe(1);
    // a console first reported off counts as a cut
    const j = c.set('other', 0, 0, 0, false);
    expect(c.fresh).toBe(true);
    expect(c.indexOf('other')).toBe(j);
    expect(c.ofGroup(c.group(j))).toBe(j);
    expect(isConsoleGroup(c.group(j))).toBe(true);
    expect(isConsoleGroup(4)).toBe(false);
    expect(c.ofGroup(CONSOLE_GROUP + 9)).toBe(-1);
    // grows past its first arrays
    for (let k = 0; k < 9; k++) c.set(`c${k}`, k, 0, 0, true);
    expect(c.n).toBe(11);
    expect(c.isOff(i)).toBe(true);
    c.clear();
    expect(c.n).toBe(0);
    expect(c.indexOf('con')).toBe(-1);
  });

  it(`the verdict: a cut noticed inside BREAKER.repeatT (${BREAKER.repeatT} s) of the last is tampering; the same cut again is the reset walk`, () => {
    const c = new ConsoleFaults();
    const i = c.set('con', 0, 0, 0, false);
    expect(c.pending(i, 0, false)).toBe(true);
    expect(c.pending(i, 0, true)).toBe(false);
    expect(c.notice(i, 0)).toBe(V_FAULT);
    // held `retry` s after a notice
    expect(c.pending(i, CONSOLE_FAULT.retry - 0.1, false)).toBe(false);
    expect(c.pending(i, CONSOLE_FAULT.retry, false)).toBe(true);
    // the same cut noticed again (the walk was dropped): the walk again, its clock unchanged
    expect(c.notice(i, 10)).toBe(V_FAULT);
    expect(c.lastFault[i]).toBe(0);
    // back on, cut again 20 s on: tampering; that cut noticed again after its check: the reset walk
    c.set('con', 0, 0, 0, true);
    expect(c.pending(i, 20, false)).toBe(false);
    c.set('con', 0, 0, 0, false);
    expect(c.pending(i, 20, false)).toBe(true);
    expect(c.notice(i, 20)).toBe(V_TAMPER);
    expect(c.notice(i, 40)).toBe(V_FAULT);
    // a cut a full repeatT after the last noticed one: a fault
    c.set('con', 0, 0, 0, true);
    c.set('con', 0, 0, 0, false);
    expect(c.notice(i, 20 + BREAKER.repeatT + 1)).toBe(V_FAULT);
  });

  it(`in view: the focused cone to ${CONSOLE_FAULT.range} m, the peripheral field to ${CONSOLE_FAULT.near} m, never behind`, () => {
    // eye 1.6 m, facing +z (yaw 0); the screens 1.1 m up
    expect(consoleInView(0, 1.6, 0, 0, 0, 1.1, CONSOLE_FAULT.range - 0.5)).toBe(true);
    expect(consoleInView(0, 1.6, 0, 0, 0, 1.1, CONSOLE_FAULT.range + 0.5)).toBe(false);
    // 60 degrees off his heading: outside the focused cone, inside the peripheral field
    const s = Math.sin(Math.PI / 3);
    const co = Math.cos(Math.PI / 3);
    expect(consoleInView(0, 1.6, 0, 0, s * (CONSOLE_FAULT.near - 1), 1.1, co * (CONSOLE_FAULT.near - 1))).toBe(true);
    expect(consoleInView(0, 1.6, 0, 0, s * (CONSOLE_FAULT.near + 2), 1.1, co * (CONSOLE_FAULT.near + 2))).toBe(false);
    expect(consoleInView(0, 1.6, 0, 0, 0, 1.1, -2)).toBe(false);
  });
});

// ----- EnemyManager on stand-in guards and a fake console -----

function guard(num: number, x: number, z: number, yaw: number, o: Record<string, unknown> = {}) {
  const g = {
    id: `c${num}`,
    num,
    alive: true,
    alerted: false,
    passive: false,
    taken: false,
    dog: false,
    secure: false,
    runningAlarm: false,
    level: 'unaware',
    incident: -1,
    breakerGroup: -1,
    def: { melee: null, kind: 'grunt', scale: 1 },
    pos: new Vector3(x, 0, z),
    yaw,
    checkLight: vi.fn(),
    resetBreaker: vi.fn(),
    ack: vi.fn(),
    notice: vi.fn(),
    hear: vi.fn(),
    sendTo: vi.fn(),
    ...o,
  };
  // sent: he is on the walk (off it again with `done`)
  g.resetBreaker.mockImplementation((_x: number, _z: number, _y: number, inc: number, group: number) => {
    g.incident = inc;
    g.breakerGroup = group;
  });
  g.checkLight.mockImplementation((_x: number, _z: number, inc: number) => {
    g.incident = inc;
    g.level = 'investigating';
  });
  return g;
}
type G = ReturnType<typeof guard>;
const done = (g: G): void => {
  g.incident = -1;
  g.breakerGroup = -1;
  g.level = 'unaware';
};

function manager(blocked: (x: number, z: number) => boolean = () => false) {
  const reg = new LightRegistry();
  const world = { level: { lights: reg, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] } };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const clear = vi.fn((a: Vector3, b: Vector3) => !blocked((a.x + b.x) / 2, (a.z + b.z) / 2));
  return new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
}

/** The console at (0, floor 0, 4); the game's toggle: `press(on)` reports it, the host's reset turns it back on. */
function setup(blocked?: (x: number, z: number) => boolean) {
  const em = manager(blocked);
  let on = true;
  const press = (v: boolean): void => {
    on = v;
    em.consoleState('con', 0, 0, 4, v);
  };
  const host: ConsoleHost & { reset: ReturnType<typeof vi.fn> } = {
    reset: vi.fn((id: string) => {
      if (id !== 'con' || on) return false;
      press(true);
      return true;
    }),
  };
  em.consoleHost = host;
  press(true);
  const ctx = (em as unknown as { ctx: { breakerOff(g: number): boolean; breakerReset(e: unknown, g: number): void } }).ctx;
  const scan = (n = 1): void => {
    for (let i = 0; i < n; i++) (em as unknown as { consoleStep(): void }).consoleStep();
  };
  const add = (...gs: G[]): void => {
    for (const g of gs) em.enemies.push(g as unknown as Enemy);
  };
  return { em, host, press, ctx, scan, add, isOn: () => on };
}

const G0 = CONSOLE_GROUP;

describe('EnemyManager: a console switched off in view is a fault, one guard turns it back on', () => {
  it('a guard who sees it go off walks over (the breaker walk on its pseudo circuit), works it, it is back on', () => {
    const { em, host, press, ctx, add, isOn } = setup();
    // facing it 4 m off, and a second watcher close by: one goes, the other only looks
    const a = guard(1, 0, 0, 0);
    const b = guard(2, 1.5, 0, -0.3);
    add(a, b);
    press(false);
    expect(a.resetBreaker).toHaveBeenCalledTimes(1);
    expect(b.resetBreaker).not.toHaveBeenCalled();
    expect(b.ack).toHaveBeenCalledTimes(1);
    const [x, z, y, inc, group] = a.resetBreaker.mock.calls[0]! as number[];
    expect([x, z, y]).toEqual([0, 4, 0]);
    expect(group).toBe(G0);
    expect(em.board.kindOf(inc!)).toBe('breaker');
    expect(em.board.keyOf(inc!)).toBe(CIRCUIT_KEY + G0);
    expect(a.checkLight).not.toHaveBeenCalled();
    expect(em.consoleFinds).toBe(1);
    // the walk's own checks: still off; he works it -> the game's own toggle path, back on
    expect(ctx.breakerOff(G0)).toBe(true);
    ctx.breakerReset(a, G0);
    expect(host.reset).toHaveBeenCalledWith('con');
    expect(isOn()).toBe(true);
    expect(ctx.breakerOff(G0)).toBe(false);
    expect(em.consoleResets).toBe(1);
    // a breaker circuit is untouched by the console routing
    expect(ctx.breakerOff(4)).toBe(true);
  });

  it('switched back on by other means (a timed loop running out, the player): the walk sees it on', () => {
    const { ctx, press, add } = setup();
    const a = guard(1, 0, 0, 0);
    add(a);
    press(false);
    expect(ctx.breakerOff(G0)).toBe(true);
    press(true);
    expect(ctx.breakerOff(G0)).toBe(false);
  });

  it('turned off while he is distracted: nothing then; he notices once the distraction is over and he sees it', () => {
    const { em, press, scan, add } = setup();
    // sent to a noise (a board task, investigating), facing the console the whole time
    const a = guard(1, 0, 0, 0, { incident: 7, level: 'investigating' });
    add(a);
    expect(em.watchesConsole(a as unknown as Enemy, 0, 0, 4)).toBe(false);
    press(false);
    scan(30);
    expect(a.resetBreaker).not.toHaveBeenCalled();
    // the distraction ends, but he walks back with his back to it: still nothing
    a.incident = -1;
    a.level = 'unaware';
    a.yaw = Math.PI;
    scan(30);
    expect(a.resetBreaker).not.toHaveBeenCalled();
    // he turns round at his post: he sees it off and goes to turn it back on
    a.yaw = 0;
    expect(em.watchesConsole(a as unknown as Enemy, 0, 0, 4)).toBe(true);
    scan(3);
    expect(a.resetBreaker).toHaveBeenCalledTimes(1);
    expect(a.resetBreaker.mock.calls[0]![4]).toBe(G0);
    expect(a.checkLight).not.toHaveBeenCalled();
  });

  it('nobody has it in sight (behind them, through a wall, too far): nothing happens', () => {
    const { em, press, scan, add } = setup((_x, z) => z > 1 && z < 2);
    const back = guard(1, 0, 0, Math.PI);
    const walled = guard(2, 0.5, 0, 0);
    const far = guard(3, 0, 4 - CONSOLE_FAULT.range - 1, 0);
    // a dog, a held guard and one in combat never notice it
    const dog = guard(4, -0.5, 3, 0, { dog: true });
    const held = guard(5, 0.5, 3, 0, { taken: true });
    const fighting = guard(6, -1, 3, 0, { alerted: true, level: 'alert' });
    add(back, walled, far, dog, held, fighting);
    press(false);
    scan(40);
    for (const g of [back, walled, far, dog, held, fighting]) {
      expect(g.resetBreaker).not.toHaveBeenCalled();
      expect(g.checkLight).not.toHaveBeenCalled();
    }
    expect(em.board.openCount).toBe(0);
    expect(em.consoleFinds).toBe(0);
  });

  it(`a second switch-off inside BREAKER.repeatT (${BREAKER.repeatT} s): the S2 check at the console, then one turns it back on`, () => {
    const { em, press, ctx, scan, add, isOn } = setup();
    const a = guard(1, 0, 0, 0);
    add(a);
    press(false);
    expect(a.resetBreaker).toHaveBeenCalledTimes(1);
    ctx.breakerReset(a, G0);
    done(a);
    expect(isOn()).toBe(true);
    // 20 s later, off again in front of him: tampering
    em.board.now += 20;
    press(false);
    expect(a.resetBreaker).toHaveBeenCalledTimes(1);
    expect(a.checkLight).toHaveBeenCalledTimes(1);
    const [x, z, inc, , line] = a.checkLight.mock.calls[0]! as [number, number, number, number, string];
    expect([x, z]).toEqual([0, 4]);
    expect(em.board.kindOf(inc)).toBe('light');
    expect(line).toBe('consoleCheck');
    // while the check is on nobody else is sent to the console
    scan(20);
    expect(a.resetBreaker).toHaveBeenCalledTimes(1);
    // the check is over (the incident closed), he stands down facing it: the reset walk, not another check
    em.board.clear();
    done(a);
    em.board.now += CONSOLE_FAULT.retry;
    scan(3);
    expect(a.resetBreaker).toHaveBeenCalledTimes(2);
    expect(a.checkLight).toHaveBeenCalledTimes(1);
    ctx.breakerReset(a, G0);
    done(a);
    expect(isOn()).toBe(true);
    // a cut a full repeatT after the last noticed one: a fault again
    em.board.clear();
    em.board.now += BREAKER.repeatT + 1;
    press(false);
    expect(a.resetBreaker).toHaveBeenCalledTimes(3);
    expect(a.checkLight).toHaveBeenCalledTimes(1);
  });

  it('the walk dropped on the way (he was drawn off again): the next time he sees it off he goes again', () => {
    const { em, press, scan, add } = setup();
    const a = guard(1, 0, 0, 0);
    add(a);
    press(false);
    expect(a.resetBreaker).toHaveBeenCalledTimes(1);
    // on the walk: not noticed again
    scan(10);
    expect(a.resetBreaker).toHaveBeenCalledTimes(1);
    // drawn off (the walk ends, the board's task closes), then back and calm, facing it
    em.board.clear();
    done(a);
    em.board.now += CONSOLE_FAULT.retry;
    scan(3);
    expect(a.resetBreaker).toHaveBeenCalledTimes(2);
    expect(a.checkLight).not.toHaveBeenCalled();
  });

  it('no host: he still walks over (nothing to turn back on); the parked modes ignore consoles', () => {
    const { em, press, ctx, add } = setup();
    em.consoleHost = null;
    const a = guard(1, 0, 0, 0);
    add(a);
    press(false);
    expect(a.resetBreaker).toHaveBeenCalledTimes(1);
    ctx.breakerReset(a, G0);
    expect(em.consoleResets).toBe(0);
    expect(ctx.breakerOff(G0)).toBe(true);
    const em2 = manager();
    em2.coordinated = false;
    const b = guard(2, 0, 0, 0);
    em2.enemies.push(b as unknown as Enemy);
    em2.consoleState('con', 0, 0, 4, false);
    expect(b.resetBreaker).not.toHaveBeenCalled();
    expect(em2.consoles.n).toBe(0);
  });

  it('a restart forgets the consoles (the game reports each again)', () => {
    const { em, press } = setup();
    press(false);
    expect(em.consoles.n).toBe(1);
    em.clear();
    expect(em.consoles.n).toBe(0);
  });
});

describe('Enemy.resetBreaker on a console: its own line, patrol pace, the reset, calm after', () => {
  it('says the console line, walks at his patrol pace, works it BREAKER.resetT s, calls the reset, back to calm', async () => {
    const { Enemy: EnemyClass, PACE } = await import('../src/ai/enemy');
    const reset = vi.fn();
    const barks: string[] = [];
    const off = { v: true };
    const e = Object.assign(Object.create(EnemyClass.prototype) as Enemy, {
      aware: new AlertMachine(),
      health: { alive: true },
      passive: false,
      taken: false,
      incident: -1,
      incMode: 0,
      turnT: 0,
      caution: 0,
      brkGroup: -1,
      brkSw: [0, 0],
      brkAt: [0, 0],
      brkY: 0,
      brkT: 0,
      brkWalkT: 0,
      brkGoal: { point: null, speed: 0, face: null },
      routePath: [],
      pos: new Vector3(0, 0, 0),
      def: { walkSpeed: 1.4, kind: 'grunt', scale: 1 },
      ctx: { nav: { nearestWalkable: () => -1, center: () => [0, 0] }, breakerOff: () => off.v, breakerReset: reset, coordinated: () => true, stealth: () => true },
      walker: { rejoin: vi.fn() },
      lc: { stop() {} },
      lure: { cancel() {}, active: false },
      alertIn: { called: false },
      rng: { reseed() {} },
      bark: (ev: string) => barks.push(ev),
      setState() {},
      goTo: (p: [number, number]) => p,
    }) as unknown as {
      resetBreaker(x: number, z: number, y: number, inc: number, group: number): void;
      breakerStep(dt: number): { point: [number, number] | null; speed: number };
      onLevel(a: AlertLevel, b: AlertLevel): void;
      aware: AlertMachine;
      breakerGroup: number;
      incident: number;
      pos: Vector3;
    };
    e.resetBreaker(0, 4, 0, 9, G0);
    expect(barks).toEqual(['console']);
    expect(BARKS.console.length).toBeGreaterThan(0);
    expect(BARKS.consoleCheck.length).toBeGreaterThan(0);
    expect(RADIO_BARKS.has('consoleCheck')).toBe(true);
    expect(RADIO_BARKS.has('console')).toBe(false);
    const speeds = new Set<number>();
    const dt = 1 / 30;
    let t = 0;
    while (e.breakerGroup >= 0 && t < 30) {
      const g = e.breakerStep(dt);
      if (g.point && g.speed > 0) {
        speeds.add(g.speed);
        const dx = g.point[0] - e.pos.x;
        const dz = g.point[1] - e.pos.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        const s = Math.min(d, g.speed * dt);
        if (d > 1e-6) e.pos.addInPlaceFromFloats((dx / d) * s, 0, (dz / d) * s);
      }
      t += dt;
    }
    expect([...speeds]).toEqual([1.4 * PACE.patrol]);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(reset.mock.calls[0]![1]).toBe(G0);
    expect(t).toBeGreaterThan(BREAKER.resetT);
    expect(e.incident).toBe(-1);
    expect(e.aware.level).toBe('unaware');
  });
});
