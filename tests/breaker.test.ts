import { describe, expect, it, vi } from 'vitest';
import { CMD_ACK, CMD_SEND, GuardView, GV_OFFICER, IncidentBoard, INCIDENT, LEVEL, MODE_BREAKER, MODE_LIGHT, type PathLen } from '../src/ai/incidents';
import { BREAKER, LATE } from '../src/ai/gear';
import { roleFlags } from '../src/ai/sectorTags';
import { BREAKER_WALK, CIRCUIT_KEY, DARK_CUT, DARK_NONE, DARK_SHOT, DarkList, darkState, type BreakerHost } from '../src/ai/breaker';
import { BARKS } from '../src/ai/barks';
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

// (guard-ai S15, stealth over shooting item 8, A42 / A43) breaker faults, lasting shot lamps, late discovery.

const straight: PathLen = { len: (ax, ay, az, bx, by, bz) => Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2 + (bz - az) ** 2) };

describe('the board: a breaker fault sends one, never a pair', () => {
  it('two witnesses close by: the nearer goes (MODE_BREAKER), the other acks; a second report merges', () => {
    const b = new IncidentBoard(straight);
    const v = new GuardView(4);
    v.n = 2;
    v.set(0, 1, 2, 0, 0, LEVEL.unaware, 0, -1);
    v.set(1, 2, 4, 0, 0, LEVEL.unaware, 0, -1);
    const id = b.report('breaker', 0, 0, 0, CIRCUIT_KEY + 4, new Int32Array([1, 2]), 2);
    b.tick(0, v);
    const o = b.out;
    const sends: [number, number][] = [];
    const acks: number[] = [];
    for (let k = 0; k < o.n; k++) {
      if (o.cmd[k] === CMD_SEND) sends.push([o.guard[k]!, o.mode[k]!]);
      if (o.cmd[k] === CMD_ACK) acks.push(o.guard[k]!);
    }
    // both inside lightPairR: a light would send two; the breaker sends the nearer only
    expect(4).toBeLessThan(INCIDENT.lightPairR);
    expect(sends).toEqual([[1, MODE_BREAKER]]);
    expect(acks).toEqual([2]);
    expect(b.kindOf(id)).toBe('breaker');
    expect(b.keyOf(id)).toBe(CIRCUIT_KEY + 4);
    o.n = 0;
    expect(b.report('breaker', 0, 0, 0, CIRCUIT_KEY + 4, new Int32Array([2]), 1)).toBe(id);
  });

  it('nobody saw it: nobody is sent and it lapses after mergeT', () => {
    const b = new IncidentBoard(straight);
    const v = new GuardView(4);
    v.n = 1;
    v.set(0, 1, 2, 0, 0, LEVEL.unaware, 0, -1);
    b.report('breaker', 0, 0, 0, CIRCUIT_KEY + 1, new Int32Array(0), 0);
    for (let t = 0; t < INCIDENT.mergeT + 1; t += 0.2) b.tick(0.2, v);
    expect(b.out.n).toBe(0);
    expect(b.openCount).toBe(0);
  });
});

// ----- EnemyManager on stand-in guards, a real light registry and a fake switch board -----

function guard(num: number, x: number, z: number, yaw: number, o: Record<string, unknown> = {}) {
  return {
    id: `b${num}`,
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
}

/** A switch board: circuit -> switch point and on / off (the registry's group follows, as `StealthSystems.toggle`). */
function host(reg: LightRegistry, sws: Record<number, [number, number, number]>) {
  const off = new Set<number>();
  const h: BreakerHost & { cut(g: number): void; off: Set<number> } = {
    off,
    switchOf: (g, _x, _z, out) => {
      const s = sws[g];
      if (!s) return false;
      out[0] = s[0];
      out[1] = s[1];
      out[2] = s[2];
      return true;
    },
    isOff: (g) => off.has(g),
    reset: (g) => {
      if (!off.delete(g)) return false;
      reg.setGroup(g, true);
      return true;
    },
    cut: (g) => {
      off.add(g);
      reg.setGroup(g, false);
    },
  };
  return h;
}

function manager(reg: LightRegistry, blocked: (x: number, z: number) => boolean = () => false) {
  const world = { level: { lights: reg, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] } };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const clear = vi.fn((a: Vector3, b: Vector3) => !blocked((a.x + b.x) / 2, (a.z + b.z) / 2));
  return new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
}

const late = (em: EnemyManager, n = 1): void => {
  for (let i = 0; i < n; i++) (em as unknown as { lateStep(): void }).lateStep();
};

describe('EnemyManager: a switch cut is a fault (A42)', () => {
  // the circuit's lamp 3 m up over (0, 0); its switch on the wall at (0, 1.2, 4)
  function setup() {
    const reg = new LightRegistry();
    reg.add({ x: 0, y: 3, z: 0, group: 4 });
    const h = host(reg, { 4: [0, 1.2, 4] });
    const em = manager(reg);
    em.breakers = h;
    // both facing the lamp a few metres off (they see it go): a pair for a light
    const a = guard(1, 0, -3, 0);
    const b = guard(2, 3, -3, -0.7);
    for (const g of [a, b]) em.enemies.push(g as unknown as Enemy);
    const cut = (): void => {
      h.cut(4);
      em.lightsOut(0, 4, 1.2 + 2.5, -1, 4);
    };
    return { reg, h, em, a, b, cut };
  }

  it('two guards see it go: exactly one walks to the switch, the other only looks (no light check, no pair)', () => {
    const { em, a, b, cut } = setup();
    cut();
    const sent = [a, b].filter((g) => g.resetBreaker.mock.calls.length === 1);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toBe(a);
    expect(a.resetBreaker.mock.calls[0]!.slice(0, 2)).toEqual([0, 4]);
    expect(a.resetBreaker.mock.calls[0]![4]).toBe(4);
    expect(b.resetBreaker).not.toHaveBeenCalled();
    expect(b.ack).toHaveBeenCalledTimes(1);
    expect(a.checkLight).not.toHaveBeenCalled();
    expect(b.checkLight).not.toHaveBeenCalled();
    expect(em.board.kindOf(a.resetBreaker.mock.calls[0]![3] as number)).toBe('breaker');
  });

  it(`a second cut of the circuit inside BREAKER.repeatT (${BREAKER.repeatT} s) is tampering: the S2 light incident at the switch; after it, a fault again`, () => {
    const { em, h, a, b, cut } = setup();
    cut();
    expect(a.resetBreaker).toHaveBeenCalledTimes(1);
    // he turned it back on; the player cuts it again 20 s later
    h.reset(4);
    em.board.now += 20;
    cut();
    expect(a.resetBreaker).toHaveBeenCalledTimes(1);
    expect(a.checkLight.mock.calls.length + b.checkLight.mock.calls.length).toBeGreaterThanOrEqual(1);
    const inc = (a.checkLight.mock.calls[0] ?? b.checkLight.mock.calls[0])![2] as number;
    expect(em.board.kindOf(inc)).toBe('light');
    // the check is at the switch (where the circuit went)
    expect((a.checkLight.mock.calls[0] ?? b.checkLight.mock.calls[0])!.slice(0, 2)).toEqual([0, 4]);
    // a cut a full repeatT after the last noticed one is a fault again
    h.reset(4);
    em.board.clear();
    a.checkLight.mockClear();
    b.checkLight.mockClear();
    em.board.now += BREAKER.repeatT + 1;
    cut();
    expect(a.resetBreaker.mock.calls.length + b.resetBreaker.mock.calls.length).toBe(2);
    expect(a.checkLight).not.toHaveBeenCalled();
    expect(b.checkLight).not.toHaveBeenCalled();
  });

  it('nobody saw the cut: nobody goes (and no repeat clock starts)', () => {
    const { em, a, b, cut } = setup();
    a.yaw = Math.PI;
    b.yaw = Math.PI;
    cut();
    expect(a.resetBreaker).not.toHaveBeenCalled();
    expect(b.resetBreaker).not.toHaveBeenCalled();
    expect(em.board.openCount).toBe(0);
  });

  it('no switch board (or a circuit cut some other way, its switch still on): the S2 light incident as before', () => {
    const { em, h, a, b } = setup();
    em.breakers = null;
    h.cut(4);
    em.lightsOut(0, 4, 3.7, -1, 4);
    expect(a.checkLight).toHaveBeenCalledTimes(1);
    expect(b.checkLight).toHaveBeenCalledTimes(1);
    const { em: em2, reg: reg2, a: a2 } = setup();
    reg2.setGroup(4, false);
    em2.lightsOut(0, 4, 3.7, -1, 4);
    expect(a2.resetBreaker).not.toHaveBeenCalled();
    expect(a2.checkLight).toHaveBeenCalledTimes(1);
  });

  it('a shot lamp is unchanged (the S2 check, 1-2 go) and stays dark: turning its circuit back on never relights it', () => {
    const { em, reg, h, a, b } = setup();
    reg.add({ x: 2, y: 3, z: 0, group: 4 });
    expect(reg.destroy(0)).toBe(true);
    em.lightsOut(0, 0, 3, 0);
    expect(a.checkLight).toHaveBeenCalledTimes(1);
    expect(b.checkLight).toHaveBeenCalledTimes(1);
    expect(a.resetBreaker).not.toHaveBeenCalled();
    h.cut(4);
    h.reset(4);
    expect(reg.lights[0]!.on).toBe(false);
    expect(reg.lights[0]!.destroyed).toBe(true);
    expect(reg.lights[1]!.on).toBe(true);
  });
});

describe('late discovery (A43)', () => {
  function setup() {
    const reg = new LightRegistry();
    // a lamp on circuit 4 (switch at (6, 1.2, 0)) and a lamp on no circuit
    reg.add({ x: 0, y: 3, z: 8, group: 4 });
    reg.add({ x: 0, y: 3, z: -8 });
    const h = host(reg, { 4: [6, 1.2, 0] });
    const em = manager(reg);
    em.breakers = h;
    return { reg, h, em };
  }

  it('a lamp shot out unseen: the next calm guard who has it in view within LATE.range checks it (the S2 check, one), once', () => {
    const { reg, em } = setup();
    expect(reg.destroy(1)).toBe(true);
    // facing it, 9 m off (in range)
    const a = guard(1, 0, 1, Math.PI);
    em.enemies.push(a as unknown as Enemy);
    late(em, 3);
    expect(a.checkLight).toHaveBeenCalledTimes(1);
    const inc = a.checkLight.mock.calls[0]![2] as number;
    expect(em.board.kindOf(inc)).toBe('light');
    expect(a.checkLight.mock.calls[0]!.slice(0, 2)).toEqual([0, -8]);
    expect(em.lateFinds).toBe(1);
    // once per state change: the same dark lamp is never found again
    em.board.clear();
    a.checkLight.mockClear();
    late(em, 10);
    expect(a.checkLight).not.toHaveBeenCalled();
  });

  it(`not beyond LATE.range (${LATE.range} m), not behind him, not through a wall, not while busy or not calm`, () => {
    const { reg, em } = setup();
    reg.destroy(1);
    const far = guard(1, 0, LATE.range - 8 + 1.5, Math.PI);
    const back = guard(2, 0, 1, 0);
    const busy = guard(3, 0.5, 1, Math.PI, { incident: 7 });
    const edgy = guard(4, -0.5, 1, Math.PI, { level: 'investigating' });
    const passive = guard(5, 1, 1, Math.PI, { passive: true });
    for (const g of [far, back, busy, edgy, passive]) em.enemies.push(g as unknown as Enemy);
    late(em, 20);
    for (const g of [far, back, busy, edgy, passive]) expect(g.checkLight).not.toHaveBeenCalled();
    // a wall between: facing it, in range, no line
    const { reg: r2 } = setup();
    r2.destroy(1);
    const em2 = manager(r2, (_x, z) => z < -2);
    const w = guard(6, 0, 1, Math.PI);
    em2.enemies.push(w as unknown as Enemy);
    late(em2, 3);
    expect(w.checkLight).not.toHaveBeenCalled();
  });

  it('a circuit switched off unseen: the guard who later sees its dark lamp takes the reset walk to its switch; once per cut', () => {
    const { em, h } = setup();
    h.cut(4);
    const a = guard(1, 0, 0, 0);
    em.enemies.push(a as unknown as Enemy);
    late(em, 3);
    expect(a.resetBreaker).toHaveBeenCalledTimes(1);
    // to the circuit's switch, its group
    expect(a.resetBreaker.mock.calls[0]!.slice(0, 2)).toEqual([6, 0]);
    expect(a.resetBreaker.mock.calls[0]![4]).toBe(4);
    expect(a.checkLight).not.toHaveBeenCalled();
    em.board.clear();
    late(em, 10);
    expect(a.resetBreaker).toHaveBeenCalledTimes(1);
    // turned back on, then cut again unseen (after repeatT): a new state, found again
    h.reset(4);
    late(em, 2);
    em.board.now += BREAKER.repeatT + 1;
    h.cut(4);
    late(em, 3);
    expect(a.resetBreaker).toHaveBeenCalledTimes(2);
  });

  it('a cut seen at the time by a guard who could not go, found later inside repeatT: the same cut, the reset walk (not tampering)', () => {
    const { em, h } = setup();
    // he sees it go but is on another task (the board sends nobody); the other has his back to it
    const busy = guard(1, 0, 0, 0, { incident: 7 });
    const b = guard(2, 1, 0, Math.PI);
    for (const g of [busy, b]) em.enemies.push(g as unknown as Enemy);
    h.cut(4);
    em.lightsOut(6, 0, 3.7, -1, 4);
    expect(busy.resetBreaker).not.toHaveBeenCalled();
    expect(b.resetBreaker).not.toHaveBeenCalled();
    // 10 s on he turns round and sees the dark lamp: the cut as it stands, a fault
    em.board.now += 10;
    b.yaw = 0;
    late(em, 3);
    expect(b.resetBreaker).toHaveBeenCalledTimes(1);
    expect(b.checkLight).not.toHaveBeenCalled();
    // he turned it back on; a new press 20 s later is a second cut inside repeatT: tampering
    h.reset(4);
    late(em, 2);
    em.board.clear();
    b.incident = -1;
    em.board.now += 20;
    h.cut(4);
    em.lightsOut(6, 0, 3.7, -1, 4);
    expect(b.resetBreaker).toHaveBeenCalledTimes(1);
    expect(b.checkLight).toHaveBeenCalledTimes(1);
  });

  it('a cut a witness reacted to at the time is not found again late', () => {
    const { em, h } = setup();
    const a = guard(1, 0, 0, 0);
    em.enemies.push(a as unknown as Enemy);
    h.cut(4);
    em.lightsOut(6, 0, 3.7, -1, 4);
    expect(a.resetBreaker).toHaveBeenCalledTimes(1);
    em.board.clear();
    late(em, 10);
    expect(a.resetBreaker).toHaveBeenCalledTimes(1);
    expect(em.lateFinds).toBe(0);
  });
});

describe('DarkList and darkState (pure)', () => {
  it('shot = DARK_SHOT, switched off and dark = DARK_CUT, lit or a torch = none; the list rebuilds on a registry change only', () => {
    const reg = new LightRegistry();
    reg.add({ x: 0, y: 3, z: 0, group: 2 });
    reg.add({ x: 4, y: 3, z: 0 });
    reg.add({ x: 8, y: 1.5, z: 0, kind: 'flashlight', on: false });
    const h = host(reg, { 2: [0, 1, 0] });
    expect(darkState(reg, reg.lights[0]!, h)).toBe(DARK_NONE);
    // off by some other means (no switch off): not a cut
    reg.setGroup(2, false);
    expect(darkState(reg, reg.lights[0]!, h)).toBe(DARK_NONE);
    reg.setGroup(2, true);
    h.cut(2);
    expect(darkState(reg, reg.lights[0]!, h)).toBe(DARK_CUT);
    reg.destroy(1);
    expect(darkState(reg, reg.lights[1]!, h)).toBe(DARK_SHOT);
    expect(darkState(reg, reg.lights[2]!, h)).toBe(DARK_NONE);
    const dl = new DarkList();
    dl.refresh(reg, h);
    expect(Array.from(dl.ids.subarray(0, dl.n))).toEqual([0, 1]);
    dl.markKey(reg, CIRCUIT_KEY + 2);
    dl.markKey(reg, 1);
    dl.refresh(reg, h);
    expect(dl.n).toBe(0);
    // relit: forgotten; cut again: listed again
    h.reset(2);
    dl.refresh(reg, h);
    h.cut(2);
    dl.refresh(reg, h);
    expect(Array.from(dl.ids.subarray(0, dl.n))).toEqual([0]);
  });

  it('no allocation smoke: 1000 refreshes and scans on the fixed arrays', () => {
    const reg = new LightRegistry();
    for (let i = 0; i < 40; i++) reg.add({ x: i, y: 3, z: 0, group: i % 4 });
    const h = host(reg, { 0: [0, 1, 0], 1: [1, 1, 0] });
    const dl = new DarkList();
    const ids = dl.ids;
    for (let k = 0; k < 1000; k++) {
      if (k % 2) h.cut(k % 4 < 2 ? 0 : 1);
      else h.reset(k % 4 < 2 ? 0 : 1);
      dl.refresh(reg, h);
    }
    expect(dl.ids).toBe(ids);
  });
});

// ----- the reset walk on an Enemy (prototype stand-in: the walk's own code) -----

describe('Enemy.resetBreaker: the walk at patrol pace, the reset, calm after', () => {
  async function walker(off: { v: boolean }, nav: unknown = { nearestWalkable: () => -1, center: () => [0, 0] }) {
    const { Enemy: EnemyClass, PACE } = await import('../src/ai/enemy');
    const reset = vi.fn();
    const barks: string[] = [];
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
      ctx: {
        nav,
        breakerOff: () => off.v,
        breakerReset: reset,
        coordinated: () => true,
        stealth: () => true,
      },
      walker: { rejoin: vi.fn() },
      lc: { stop() {} },
      lure: { cancel() {}, active: false },
      alertIn: { called: false },
      rng: { reseed() {} },
      bark: (ev: string) => barks.push(ev),
      setState() {},
      // straight at the goal (no nav)
      goTo: (p: [number, number]) => p,
    });
    type W = {
      resetBreaker(x: number, z: number, y: number, inc: number, group: number): void;
      breakerStep(dt: number): { point: [number, number] | null; speed: number; face: number | null };
      onLevel(a: AlertLevel, b: AlertLevel): void;
      aware: AlertMachine;
      breakerGroup: number;
      incident: number;
      pos: Vector3;
      walker: { rejoin: ReturnType<typeof vi.fn> };
    };
    return { e: e as unknown as W, reset, barks, PACE };
  }
  /** Run the walk: step toward its point at its speed; returns seconds until it ended (or `max`). */
  function run(e: { breakerStep(dt: number): { point: [number, number] | null; speed: number }; pos: Vector3; breakerGroup: number }, max: number, speeds: number[]): number {
    const dt = 1 / 30;
    let t = 0;
    while (e.breakerGroup >= 0 && t < max) {
      const g = e.breakerStep(dt);
      if (g.point && g.speed > 0) {
        speeds.push(g.speed);
        const dx = g.point[0] - e.pos.x;
        const dz = g.point[1] - e.pos.z;
        const d = Math.hypot(dx, dz);
        const s = Math.min(d, g.speed * dt);
        if (d > 1e-6) e.pos.addInPlaceFromFloats((dx / d) * s, 0, (dz / d) * s);
      }
      t += dt;
    }
    return t;
  }

  it(`walks at his patrol pace, works the switch BREAKER.resetT (${BREAKER.resetT} s), the circuit comes back on, calm and off the task`, async () => {
    const off = { v: true };
    const { e, reset, barks, PACE } = await walker(off);
    e.resetBreaker(0, 7, 0, 5, 4);
    expect(barks).toEqual(['breaker']);
    expect(BARKS.breaker).toEqual(["Breaker's gone again."]);
    expect(e.incident).toBe(5);
    expect(e.breakerGroup).toBe(4);
    const speeds: number[] = [];
    const t = run(e, 60, speeds);
    expect(new Set(speeds)).toEqual(new Set([1.4 * PACE.patrol]));
    // 7 m less the reach at the patrol pace, then the reset time
    const walk = (7 - BREAKER_WALK.reach) / (1.4 * PACE.patrol);
    expect(t).toBeGreaterThan(walk + BREAKER.resetT - 0.2);
    expect(t).toBeLessThan(walk + BREAKER.resetT + 0.5);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(reset.mock.calls[0]![1]).toBe(4);
    expect(e.incident).toBe(-1);
    expect(e.aware.level).toBe('unaware');
    expect(e.walker.rejoin).toHaveBeenCalled();
  });

  it('the circuit back on by other means (a timed isolator relighting itself, the player): the walk ends, no reset', async () => {
    const off = { v: true };
    const { e, reset } = await walker(off);
    e.resetBreaker(0, 20, 0, 5, 4);
    run(e, 3, []);
    expect(e.breakerGroup).toBe(4);
    off.v = false;
    e.breakerStep(1 / 30);
    expect(e.breakerGroup).toBe(-1);
    expect(e.incident).toBe(-1);
    expect(reset).not.toHaveBeenCalled();
  });

  it(`a switch he cannot reach: given up after BREAKER_WALK.giveUp (${BREAKER_WALK.giveUp} s)`, async () => {
    const { e, reset } = await walker({ v: true });
    e.resetBreaker(0, 7, 0, 5, 4);
    (e as unknown as { goTo: () => null }).goTo = () => null;
    const t = run(e, 60, []);
    expect(t).toBeGreaterThanOrEqual(BREAKER_WALK.giveUp - 0.1);
    expect(t).toBeLessThan(BREAKER_WALK.giveUp + 0.5);
    expect(reset).not.toHaveBeenCalled();
    expect(e.incident).toBe(-1);
  });

  it('suspicious at most: a glimpse that comes to nothing keeps the walk (no stand-down line); investigating drops it', async () => {
    const { e, barks } = await walker({ v: true });
    e.resetBreaker(0, 7, 0, 5, 4);
    e.aware.set('suspicious');
    e.onLevel('unaware', 'suspicious');
    e.aware.set('unaware');
    e.onLevel('suspicious', 'unaware');
    expect(e.breakerGroup).toBe(4);
    expect(e.incident).toBe(5);
    expect(barks).not.toContain('standDown');
    e.aware.set('investigating');
    e.onLevel('unaware', 'investigating');
    expect(e.breakerGroup).toBe(-1);
    expect(e.incident).toBe(-1);
  });

  it('never taken by a guard who is not calm (investigating, searching, in combat)', async () => {
    const { e } = await walker({ v: true });
    e.aware.set('investigating');
    e.resetBreaker(0, 7, 0, 5, 4);
    expect(e.breakerGroup).toBe(-1);
    expect(e.incident).toBe(-1);
  });
});

describe('EnemyManager: the breaker incident sits on the floor by the switch (laptop fix)', () => {
  it('a switch on a wall: the walker is sent with the stand cell floor, not the wall top', () => {
    const reg = new LightRegistry();
    reg.add({ x: 0, y: 3, z: 0, group: 4 });
    const h = host(reg, { 4: [0, 0, 4] });
    const world = { level: { lights: reg, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] } };
    // the switch's own column (0, 4) is the wall (top 3.2); the walkable cell beside it, 7, is the floor (0.02)
    const nav = {
      walk: new Uint8Array(8),
      nearestWalkable: vi.fn(() => 7),
      cellHeight: vi.fn((i: number) => (i === 7 ? 0.02 : 0)),
      center: vi.fn(() => [0, 3.5]),
      lineClear: vi.fn(() => true),
      findPath: vi.fn(() => null),
      heightAt: vi.fn((_x: number, z: number) => (z > 3.5 ? 3.2 : 0)),
    };
    const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: vi.fn(() => true) } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
    em.breakers = h;
    const a = guard(1, 0, -3, 0);
    em.enemies.push(a as unknown as Enemy);
    h.cut(4);
    em.lightsOut(0, 4, 0 + 2.5, -1, 4);
    expect(a.resetBreaker).toHaveBeenCalledTimes(1);
    expect(a.resetBreaker.mock.calls[0]![2]).toBeCloseTo(0.02, 5);
  });
});

// ----- (laptop fix, 884b89c0: e2e-sectorops:6) who walks to a cut switch: the witness nearest it by path -----

describe('the board: the breaker walker is the witness nearest the switch by path (laptop fix)', () => {
  /** Run one incident of `kind` at (x, y, z) with witnesses `ws` ([num, x, y, z, officer, role]); the sends in order. */
  function sends(paths: PathLen, kind: 'light' | 'breaker', at: readonly [number, number, number], ws: readonly (readonly [number, number, number, number, boolean, string])[]) {
    const b = new IncidentBoard(paths);
    const v = new GuardView(8);
    v.n = ws.length;
    const who = new Int32Array(ws.length);
    ws.forEach(([num, x, y, z, off, role], i) => {
      v.set(i, num, x, y, z, LEVEL.unaware, off ? GV_OFFICER : 0, -1);
      v.setTags(i, roleFlags(role), 0, 0, 0);
      who[i] = num;
    });
    b.report(kind, at[0], at[2], at[1], CIRCUIT_KEY + 50, who, ws.length);
    b.tick(0, v);
    const o = b.out;
    const out: [number, number][] = [];
    for (let k = 0; k < o.n; k++) if (o.cmd[k] === CMD_SEND) out.push([o.guard[k]!, o.mode[k]!]);
    return out;
  }

  it('a fixed-post officer 12 m off and a rover 16 m off: the light check sends the rover first (the officer as its pair); the fault sends the officer alone', () => {
    const ws = [
      [1, -12, 0, 0, true, 'reception'],
      [2, -16, 0, 0, false, 'patrol'],
    ] as const;
    expect(sends(straight, 'light', [0, 0, 0], ws)).toEqual([
      [2, MODE_LIGHT],
      [1, MODE_LIGHT],
    ]);
    expect(sends(straight, 'breaker', [0, 0, 0], ws)).toEqual([[1, MODE_BREAKER]]);
  });
});

// ----- StealthSystems: the guard's reset is the player's toggle (light parity) -----

describe("StealthSystems: the guards' switch board", () => {
  async function systems(course?: { def: { bays: { gates: { kind: string; group?: string }[] }[] }; groups: Record<string, number> }) {
    const { StealthSystems } = await import('../src/game/stealthSystems');
    const reg = new LightRegistry();
    reg.add({ x: 0, y: 3, z: 0, group: 4 });
    reg.add({ x: 3, y: 3, z: 0, group: 4 });
    const items: { id: string; label: string; onUse: (() => void) | null; pos: Vector3; reach: number }[] = [];
    const ints = {
      add: (id: string, _k: string, pos: Vector3, label: string) => {
        const it = { id, label, onUse: null, pos, reach: 0, enabled: false };
        items.push(it);
        return it;
      },
      setEnabled: () => {},
      setIndicator: () => {},
      nearest: () => null,
      remove: () => {},
    };
    const events = { emit: vi.fn() };
    const g = { world: { layout: { switches: [{ pos: new Vector3(2, 1.2, 5), yaw: 0, group: 4 }], ...(course ? { course } : {}) }, level: { lights: reg }, doors: { list: [], onSound: null } }, events, hud: { feedItem() {} } };
    const em = { alarms: [], bodies: [], lightsOut: vi.fn(), breakers: null as BreakerHost | null };
    const ss = new StealthSystems(g as never, em as never, ints as never, () => {});
    return { ss, reg, em, items, events };
  }

  it('the switch off: the manager is told with its circuit; the guard turns it back on through the same toggle (events, labels, the registry)', async () => {
    const { ss, reg, em, items, events } = await systems();
    expect(em.breakers).not.toBeNull();
    const h = em.breakers!;
    const sw = items.find((i) => i.id === 'switch-0')!;
    sw.onUse!();
    expect(em.lightsOut).toHaveBeenCalledWith(2, 5, 1.2 + 2.5, -1, 4);
    expect(h.isOff(4)).toBe(true);
    const p = new Float32Array(3);
    expect(h.switchOf(4, 0, 0, p)).toBe(true);
    expect(Array.from(p)).toEqual([2, Math.fround(1.2), 5]);
    expect(h.switchOf(9, 0, 0, p)).toBe(false);
    expect(h.reset(4)).toBe(true);
    expect(reg.lights.every((l) => l.on)).toBe(true);
    expect(sw.label).toBe('Lights off');
    expect(ss.switchOn(4)).toBe(true);
    expect(events.emit).toHaveBeenLastCalledWith('lightSwitch', { on: true });
    // turning it on wakes nobody
    expect(em.lightsOut).toHaveBeenCalledTimes(1);
    expect(h.reset(4)).toBe(false);
    expect(h.isOff(4)).toBe(false);
  });

  it('a lamp of the circuit lit again by other means (an isolator relighting itself): no longer a cut; a shot lamp stays dark', async () => {
    const { reg, em, items } = await systems();
    const h = em.breakers!;
    items.find((i) => i.id === 'switch-0')!.onUse!();
    reg.setGroup(4, true);
    expect(h.isOff(4)).toBe(false);
    reg.setGroup(4, false);
    reg.destroy(0);
    expect(h.isOff(4)).toBe(true);
    h.reset(4);
    expect(reg.lights[0]!.on).toBe(false);
    expect(reg.lights[1]!.on).toBe(true);
  });

  it('a course mains gate circuit (cutting it opens the gate): never a fault, no guard turns it back on (A63)', async () => {
    const { reg, em, items, ss } = await systems({ def: { bays: [{ gates: [{ kind: 'lever' }, { kind: 'mains', group: 'mains' }] }] }, groups: { mains: 4 } });
    const h = em.breakers!;
    items.find((i) => i.id === 'switch-0')!.onUse!();
    expect(em.lightsOut).toHaveBeenCalledWith(2, 5, 1.2 + 2.5, -1, 4);
    expect(h.isOff(4)).toBe(false);
    expect(h.reset(4)).toBe(false);
    expect(reg.lights.every((l) => !l.on)).toBe(true);
    expect(ss.switchOn(4)).toBe(false);
    // a course circuit no mains gate reads stays a fault
    const o = await systems({ def: { bays: [{ gates: [] }] }, groups: { other: 4 } });
    o.items.find((i) => i.id === 'switch-0')!.onUse!();
    expect(o.em.breakers!.isOff(4)).toBe(true);
    expect(o.em.breakers!.reset(4)).toBe(true);
  });
});
