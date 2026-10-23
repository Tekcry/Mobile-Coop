import { describe, expect, it, vi } from 'vitest';
import { BREAKER } from '../src/ai/gear';
import { DIFFICULTY } from '../src/ai/archetypes';
import { EnemyManager } from '../src/ai/enemyManager';
import type { BreakerHost } from '../src/ai/breaker';
import type { AiContext, Enemy } from '../src/ai/enemy';
import { Vector3, type Scene } from '../src/core/babylon';
import { groupBaseOn, LightRegistry } from '../src/world/lights';
import type { BoardDef } from '../src/game/isolators';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

/**
 * (guard-ai LR16-4, "guards relight") The S15 breaker walk extended to the Sector Ops boards: a breaker board cut with
 * a guard watching is a fault, one walks over and switches it back (`IsolatorBoards.switchBack`, every circuit of it
 * on); a second cut inside `BREAKER.repeatT` is the S2 light check at the board; a shot lamp stays dark; a timed
 * isolator's running window is the player's (the guards look, the timer relights, nobody fights it). Wall switch cuts
 * are S15's (`breaker.test.ts`).
 */

// circuits 4 (two lamps) and 6 on the breaker board, 7 on the timed board (and a wall switch); 9 on no board
const BREAKER_AT = new Vector3(0, 0, 4);
const TIMED_AT = new Vector3(20, 0, 4);
const BOARDS: BoardDef[] = [
  { pos: BREAKER_AT, yaw: 0, groups: [4, 6] },
  { pos: TIMED_AT, yaw: 0, groups: [7], window: 20 },
];

function level(): LightRegistry {
  const reg = new LightRegistry();
  reg.add({ x: 0, y: 3, z: 0, group: 4 });
  reg.add({ x: 3, y: 3, z: 0, group: 4 });
  reg.add({ x: -3, y: 3, z: 0, group: 6 });
  reg.add({ x: 20, y: 3, z: 0, group: 7 });
  return reg;
}

async function systems(reg: LightRegistry) {
  const { StealthSystems } = await import('../src/game/stealthSystems');
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
  const layout = { switches: [{ pos: new Vector3(22, 1.2, 5), yaw: 0, group: 7 }], boards: BOARDS };
  const g = { world: { layout, level: { lights: reg }, doors: { list: [], onSound: null } }, events, hud: { feedItem() {} } };
  const em = { alarms: [], bodies: [], lightsOut: vi.fn(), breakers: null as BreakerHost | null };
  const ss = new StealthSystems(g as never, em as never, ints as never, () => {});
  const use = (id: string): void => items.find((i) => i.id === id)!.onUse!();
  return { ss, em, items, events, use, h: em.breakers! };
}

// ----- EnemyManager on stand-in guards (as breaker.test.ts) -----

function guard(num: number, x: number, z: number, yaw: number) {
  return {
    id: `r${num}`,
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
  };
}

function manager(reg: LightRegistry, host: BreakerHost) {
  const world = { level: { lights: reg, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] } };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const clear = vi.fn(() => true);
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  em.breakers = host;
  return em;
}

const ctxOf = (em: EnemyManager): AiContext => (em as unknown as { ctx: AiContext }).ctx;

describe('guard-ai LR16-4: a breaker board cut is a fault the guards put right', () => {
  it('the cut is reported on its circuit at the board; the breaker host finds it, and switchBack puts every circuit back', async () => {
    const reg = level();
    const { ss, em, items, events, use, h } = await systems(reg);
    use('board-0');
    expect(groupBaseOn(reg, 4) || groupBaseOn(reg, 6)).toBe(false);
    expect(em.lightsOut).toHaveBeenCalledWith(BREAKER_AT.x, BREAKER_AT.z, BREAKER_AT.y + 2.5, -1, 4);
    expect(h.isOff(4)).toBe(true);
    expect(h.isOff(6)).toBe(true);
    const p = new Float32Array(3);
    expect(h.switchOf(6, 10, 10, p)).toBe(true);
    expect(Array.from(p)).toEqual([BREAKER_AT.x, BREAKER_AT.y, BREAKER_AT.z]);
    expect(h.reset(4)).toBe(true);
    expect(ss.boards!.cut[0]).toBe(0);
    expect(groupBaseOn(reg, 4) && groupBaseOn(reg, 6)).toBe(true);
    expect(items.find((i) => i.id === 'board-0')!.label).toBe('Breaker off');
    expect(events.emit).toHaveBeenLastCalledWith('lightSwitch', { on: true });
    // nothing left to do; turning it on draws nobody
    expect(h.isOff(4)).toBe(false);
    expect(h.reset(4)).toBe(false);
    expect(em.lightsOut).toHaveBeenCalledTimes(1);
  });

  it('wiring: a guard who saw it walks to the board (MODE_BREAKER), his reset switches it back; a second cut inside repeatT is the S2 check at the board', async () => {
    const reg = level();
    const s = await systems(reg);
    const em = manager(reg, s.h);
    const a = guard(1, 0, -3, 0);
    const b = guard(2, 3, -3, -0.7);
    for (const g of [a, b]) em.enemies.push(g as unknown as Enemy);
    const cut = (): void => {
      s.em.lightsOut.mockClear();
      s.use('board-0');
      const args = s.em.lightsOut.mock.calls[0] as [number, number, number, number, number];
      em.lightsOut(...args);
    };
    cut();
    const sent = [a, b].filter((g) => g.resetBreaker.mock.calls.length === 1);
    expect(sent).toHaveLength(1);
    const call = sent[0]!.resetBreaker.mock.calls[0]!;
    expect(call.slice(0, 2)).toEqual([BREAKER_AT.x, BREAKER_AT.z]);
    expect(call[4]).toBe(4);
    expect(em.board.kindOf(call[3] as number)).toBe('breaker');
    expect(a.checkLight).not.toHaveBeenCalled();
    expect(b.checkLight).not.toHaveBeenCalled();
    // the walk's end: the context's reset runs the board's switch-back
    expect(ctxOf(em).breakerOff!(4)).toBe(true);
    ctxOf(em).breakerReset!(sent[0] as unknown as Enemy, 4);
    expect(em.breakerResets).toBe(1);
    expect(s.ss.boards!.cut[0]).toBe(0);
    expect(groupBaseOn(reg, 4) && groupBaseOn(reg, 6)).toBe(true);
    expect(ctxOf(em).breakerOff!(4)).toBe(false);
    // cut again 20 s later: tampering, the S2 light check at the board, nobody walks to reset it
    em.board.now += 20;
    cut();
    expect(a.resetBreaker.mock.calls.length + b.resetBreaker.mock.calls.length).toBe(1);
    const chk = a.checkLight.mock.calls[0] ?? b.checkLight.mock.calls[0];
    expect(chk).toBeDefined();
    expect(chk!.slice(0, 2)).toEqual([BREAKER_AT.x, BREAKER_AT.z]);
    expect(em.board.kindOf(chk![2] as number)).toBe('light');
    expect(BREAKER.repeatT).toBeGreaterThan(20);
  });

  it('a shot lamp of the circuit stays dark when the guard switches the board back', async () => {
    const reg = level();
    const { h, use } = await systems(reg);
    use('board-0');
    reg.destroy(0);
    expect(h.isOff(4)).toBe(true);
    expect(h.reset(4)).toBe(true);
    expect(reg.lights[0]!.on).toBe(false);
    expect(reg.lights[1]!.on).toBe(true);
    expect(reg.lights[2]!.on).toBe(true);
  });

  it('every lamp of the board shot out: its cut is the plain S2 look (no circuit to relight)', async () => {
    const reg = level();
    const { em, use } = await systems(reg);
    for (const id of [0, 1, 2]) reg.destroy(id);
    use('board-0');
    expect(em.lightsOut).toHaveBeenCalledWith(BREAKER_AT.x, BREAKER_AT.z);
  });

  it('late discovery: a cut nobody saw is found by the next calm guard who sees a dark lamp; he walks to the board', async () => {
    const reg = level();
    const s = await systems(reg);
    const em = manager(reg, s.h);
    const a = guard(1, 0, -3, Math.PI);
    em.enemies.push(a as unknown as Enemy);
    s.use('board-0');
    em.lightsOut(...(s.em.lightsOut.mock.calls[0] as [number, number, number, number, number]));
    expect(a.resetBreaker).not.toHaveBeenCalled();
    a.yaw = 0;
    for (let k = 0; k < 3; k++) (em as unknown as { lateStep(): void }).lateStep();
    expect(a.resetBreaker).toHaveBeenCalledTimes(1);
    expect(a.resetBreaker.mock.calls[0]!.slice(0, 2)).toEqual([BREAKER_AT.x, BREAKER_AT.z]);
    expect(em.lateFinds).toBe(1);
  });
});

describe('guard-ai LR16-4: a timed isolator window is the player\'s', () => {
  it('its cut stays the S2 look at the board; no guard switches it back (not at the board, not at a wall switch); the timer relights it', async () => {
    const reg = level();
    const s = await systems(reg);
    s.use('board-1');
    expect(groupBaseOn(reg, 7)).toBe(false);
    expect(s.em.lightsOut).toHaveBeenCalledWith(TIMED_AT.x, TIMED_AT.z);
    expect(s.ss.switchOn(7)).toBe(false);
    expect(s.h.isOff(7)).toBe(false);
    expect(s.h.reset(7)).toBe(false);
    expect(s.ss.boards!.switchBack(1)).toBe(false);
    expect(groupBaseOn(reg, 7)).toBe(false);
    // the guards see it go: the S2 light check at the board (the lure), never the reset walk
    const em = manager(reg, s.h);
    const a = guard(1, 20, -3, 0);
    em.enemies.push(a as unknown as Enemy);
    em.lightsOut(TIMED_AT.x, TIMED_AT.z);
    expect(a.resetBreaker).not.toHaveBeenCalled();
    expect(a.checkLight).toHaveBeenCalledTimes(1);
    expect(a.checkLight.mock.calls[0]!.slice(0, 2)).toEqual([TIMED_AT.x, TIMED_AT.z]);
    // a reset walk already going on its circuit ends (breakerOff false), as S15's isolator rule
    expect(ctxOf(em).breakerOff!(7)).toBe(false);
    for (let k = 0; k < 20 * 60 + 2; k++) s.ss.boards!.update(1 / 60);
    expect(groupBaseOn(reg, 7)).toBe(true);
    expect(s.ss.boards!.returns).toBe(1);
    expect(s.ss.switchOn(7)).toBe(true);
  });
});
