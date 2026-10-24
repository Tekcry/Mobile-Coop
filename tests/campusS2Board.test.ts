import { describe, expect, it, vi } from 'vitest';
import { DIFFICULTY } from '../src/ai/archetypes';
import { EnemyManager } from '../src/ai/enemyManager';
import type { BreakerHost } from '../src/ai/breaker';
import type { AiContext, Enemy } from '../src/ai/enemy';
import { Vector3, type Scene } from '../src/core/babylon';
import { groupBaseOn, type LightRegistry } from '../src/world/lights';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';
import { LevelBuilder } from '../src/world/levelBuilder';
import { campusOps } from '../src/world/maps/campusOps';
import { S2_GROUPS } from '../src/world/maps/campusS2';
import { S4_GROUPS } from '../src/world/maps/campusS4';
import { S5_GROUPS } from '../src/world/maps/campusS5';

/**
 * (LR16-4) The S2 reception panel is an untimed breaker board on `s2-atrium` (group 50: the three pendants and the
 * reception downlight). Guard-ai #255's S15 breaker walk covers it: the cut is a fault reported at the board, the
 * reception officer (#1) walks over and switches it back (`IsolatorBoards.switchBack`); a shot pendant stays dark; the
 * timed S4 yard / S5 garden boards keep their windows. Harness as `guardRelight.test.ts`, on the real campusOps data.
 */

const ATRIUM = S2_GROUPS.atrium;

/** A fresh campusOps build: its layout, and its light registry (a test cuts and relights it, so none is shared). */
function build() {
  const b = new LevelBuilder();
  const lay = campusOps.build(b, 0);
  const k = lay.boards!.findIndex((q) => q.groups.includes(ATRIUM));
  return { lay, reg: b.lights as LightRegistry, k, board: lay.boards![k]! };
}

async function systems(lay: ReturnType<typeof build>['lay'], reg: LightRegistry) {
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
  const layout = { switches: lay.switches, boards: lay.boards };
  const g = { world: { layout, level: { lights: reg }, doors: { list: [], onSound: null } }, events, hud: { feedItem() {} } };
  const em = { alarms: [], bodies: [], lightsOut: vi.fn(), breakers: null as BreakerHost | null };
  const ss = new StealthSystems(g as never, em as never, ints as never, () => {});
  const use = (id: string): void => items.find((i) => i.id === id)!.onUse!();
  return { ss, em, items, events, use, h: em.breakers! };
}

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
const lampsOf = (reg: LightRegistry, group: number) => reg.lights.filter((l) => l.group === group && l.intensity > 0);

describe('(LR16-4) the S2 reception panel board', () => {
  it('(LR16-4) cutting the reception panel reports a breaker fault on s2-atrium at the board', async () => {
    const { lay, reg, k, board } = build();
    expect(k).toBeGreaterThanOrEqual(0);
    const { em, use, h } = await systems(lay, reg);
    expect(lampsOf(reg, ATRIUM)).toHaveLength(4);
    expect(lampsOf(reg, ATRIUM).every((l) => l.on)).toBe(true);
    use(`board-${k}`);
    expect(lampsOf(reg, ATRIUM).every((l) => !l.on)).toBe(true);
    expect(em.lightsOut).toHaveBeenCalledWith(board.pos.x, board.pos.z, board.pos.y + 2.5, -1, ATRIUM);
    expect(em.lightsOut).toHaveBeenCalledWith(-8.4, -28.5, 2.5, -1, 50);
    expect(h.isOff(ATRIUM)).toBe(true);
    const p = new Float32Array(3);
    expect(h.switchOf(ATRIUM, -20, -24.9, p)).toBe(true);
    expect(Array.from(p)).toEqual([board.pos.x, board.pos.y, board.pos.z].map(Math.fround));
  });

  it('(LR16-4) a guard sent to the cut board relights the atrium', async () => {
    const { lay, reg, k, board } = build();
    const s = await systems(lay, reg);
    const em = manager(reg, s.h);
    // #1 at his post (campusSectors: (-20, -24.9)), facing the panel's wall (east, a little south)
    const him = guard(1, -20, -24.9, Math.atan2(board.pos.x + 20, board.pos.z + 24.9));
    em.enemies.push(him as unknown as Enemy);
    s.use(`board-${k}`);
    em.lightsOut(...(s.em.lightsOut.mock.calls[0] as [number, number, number, number, number]));
    expect(him.resetBreaker).toHaveBeenCalledTimes(1);
    const call = him.resetBreaker.mock.calls[0]!;
    expect(call.slice(0, 2)).toEqual([board.pos.x, board.pos.z].map(Math.fround));
    expect(call[4]).toBe(ATRIUM);
    expect(em.board.kindOf(call[3] as number)).toBe('breaker');
    expect(him.checkLight).not.toHaveBeenCalled();
    expect(ctxOf(em).breakerOff!(ATRIUM)).toBe(true);
    // the walk's end: the context's reset runs the board's switch-back
    ctxOf(em).breakerReset!(him as unknown as Enemy, ATRIUM);
    expect(em.breakerResets).toBe(1);
    expect(s.ss.boards!.cut[k]).toBe(0);
    expect(lampsOf(reg, ATRIUM)).toHaveLength(4);
    expect(lampsOf(reg, ATRIUM).every((l) => l.on)).toBe(true);
    expect(s.items.find((i) => i.id === `board-${k}`)!.label).toBe('Breaker off');
    expect(s.events.emit).toHaveBeenLastCalledWith('lightSwitch', { on: true });
    expect(ctxOf(em).breakerOff!(ATRIUM)).toBe(false);
  });

  it('(LR16-4) a shot pendant stays dark after the switch-back', async () => {
    const { lay, reg, k } = build();
    const { h, use } = await systems(lay, reg);
    const pendants = lampsOf(reg, ATRIUM).filter((l) => l.y === 9);
    expect(pendants).toHaveLength(3);
    use(`board-${k}`);
    expect(reg.destroy(pendants[0]!.id)).toBe(true);
    expect(h.isOff(ATRIUM)).toBe(true);
    expect(h.reset(ATRIUM)).toBe(true);
    const lamps = lampsOf(reg, ATRIUM);
    expect(lamps.filter((l) => l.on)).toHaveLength(3);
    expect(lamps.find((l) => l.id === pendants[0]!.id)!.on).toBe(false);
    expect(groupBaseOn(reg, ATRIUM)).toBe(true);
  });

  it('(LR16-4) the timed boards keep their windows', async () => {
    const { lay, reg, k } = build();
    const s = await systems(lay, reg);
    expect(lay.boards).toHaveLength(3);
    const at = (g: number): number => lay.boards!.findIndex((q) => q.groups.includes(g));
    const yard = at(S4_GROUPS.yard);
    const garden = at(S5_GROUPS.garden);
    expect(yard).toBe(0);
    expect(garden).toBe(1);
    expect(k).toBe(2);
    for (const i of [yard, garden]) {
      expect(lay.boards![i]!.window).toBe(20);
      expect(s.ss.boards!.timed(i)).toBe(true);
    }
    expect(s.ss.boards!.timed(k)).toBe(false);
    s.use(`board-${yard}`);
    expect(s.h.isOff(S4_GROUPS.yard)).toBe(false);
    expect(s.ss.boards!.switchBack(yard)).toBe(false);
    expect(s.ss.boards!.holding(S4_GROUPS.yard)).toBe(true);
  });
});
