import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GEARS } from '../src/config/movement';
import { TORCH_DARK } from '../src/ai/archetypes';
import { COURSE_DARK } from '../src/config/course';
import { LIGHT } from '../src/world/lights';
import { MARLOW_LEVEL } from '../src/world/lighting/levels';
import {
  circuitOf,
  LURE_RANGE,
  MARLOW_CIRCUITS,
  MARLOW_LAMP_BUDGET,
  MARLOW_POCKETS,
  MARLOW_ROOMS,
  MARLOW_TIMED,
  MARLOW_ZONES,
  marlowCourseGroups,
  marlowWallSwitches,
  SILENT_PACE,
  validateMarlowCircuits,
  type MarlowCircuit,
} from '../src/world/lighting/marlowCircuits';
import { CircuitSchedule } from '../src/world/lighting/circuitSchedule';

describe('Marlow Yard circuit table (LIGHTING-PLAN section 3)', () => {
  it('passes every plan rule', () => {
    expect(validateMarlowCircuits()).toEqual([]);
  });

  it('every live circuit is in the course groups (the client mirrors only those); dead ones are not', () => {
    const g = marlowCourseGroups();
    for (const c of MARLOW_CIRCUITS) {
      if (c.kind === 'dead') expect(g[c.key]).toBeUndefined();
      else expect(g[c.key]).toBe(c.group);
    }
  });

  it('wall switches list only plain switches, each on its circuit', () => {
    const ws = marlowWallSwitches();
    expect(ws.length).toBeGreaterThan(20);
    for (const s of ws) expect(circuitOf(s.group)?.kind).toBe('switch');
    expect(new Set(ws.map((s) => s.id)).size).toBe(ws.length);
  });

  it('the timed circuits are A2 neck (15 s) and the A8 night circuit (25 s), and the schedule takes their timings', () => {
    const timed = MARLOW_CIRCUITS.filter((c) => c.timed);
    expect(timed.map((c) => [c.key, c.timed!.seconds])).toEqual([['a2-neck', 15], ['a8-night', 25]]);
    expect(() => new CircuitSchedule(timed.map((c) => c.timed!))).not.toThrow();
    expect(MARLOW_TIMED.map((t) => t.key).sort()).toEqual(timed.map((c) => c.key).sort());
  });

  it('A2: the window covers the neck crossing, one player cannot isolate and reach cover', () => {
    const neck = circuitOf(21)!;
    const t = MARLOW_TIMED.find((x) => x.key === 'a2-neck')!;
    expect(t.crossM / SILENT_PACE).toBeLessThan(neck.timed!.seconds - 5);
    expect(t.soloM / SILENT_PACE).toBeGreaterThan(neck.timed!.seconds);
  });

  it('the plan reads its numbers from the game (silent pace, lure range, thresholds)', () => {
    expect(SILENT_PACE).toBe(GEARS.crouch[2]);
    expect(readFileSync('src/ai/enemyManager.ts', 'utf8')).toMatch(new RegExp(`lightsOut[\\s\\S]{0,200}let bd = ${LURE_RANGE};`));
    expect(MARLOW_LEVEL.torchDark).toBe(TORCH_DARK);
    expect(MARLOW_LEVEL.cutMax).toBeLessThan(COURSE_DARK);
    expect(MARLOW_LEVEL.cutMax).toBeLessThan(LIGHT.shadow);
    expect(MARLOW_LEVEL.pocketMax).toBeLessThanOrEqual(MARLOW_LEVEL.cutMax);
    expect(MARLOW_LEVEL.standby).toBeCloseTo(LIGHT.shadow * 0.5, 9);
    expect(MARLOW_LEVEL.poolMin).toBe(LIGHT.lit);
    expect(MARLOW_LEVEL.readMin).toBeGreaterThan(LIGHT.shadow);
  });

  it('zones: every set at standby, the lounge at the house level and smaller than A1 (the smallest zone wins)', () => {
    const sets = MARLOW_ZONES.filter((z) => z.id !== 'lounge');
    expect(sets.map((z) => z.id).sort()).toEqual(Object.keys(MARLOW_ROOMS).sort());
    for (const z of sets) expect(z.ambient).toBe(MARLOW_LEVEL.standby);
    const lounge = MARLOW_ZONES.find((z) => z.id === 'lounge')!;
    expect(lounge.ambient).toBe(MARLOW_LEVEL.house);
    const area = (b: number[]): number => (b[2]! - b[0]!) * (b[3]! - b[1]!);
    expect(area(lounge.box)).toBeLessThan(area(MARLOW_ROOMS.A1));
  });

  it('every set has at least one pocket or cut circuit to make dark, and the budget holds', () => {
    for (const room of Object.keys(MARLOW_ROOMS)) {
      const cs = MARLOW_CIRCUITS.filter((c) => c.room === room);
      const cuttable = cs.some((c) => c.cutBy.some((w) => w !== 'shot'));
      expect(cuttable, room).toBe(true);
      expect(cs.reduce((n, c) => n + c.lamps, 0), room).toBeLessThanOrEqual(MARLOW_LAMP_BUDGET.perSet);
    }
    expect(MARLOW_POCKETS.length).toBeGreaterThanOrEqual(6);
  });

  it('the validator catches the mistakes the plan warns about', () => {
    const base = circuitOf(21)!;
    const bad = (c: Partial<MarlowCircuit>): string[] => validateMarlowCircuits([...MARLOW_CIRCUITS.filter((x) => x.group !== 21), { ...base, ...c }]);
    expect(bad({ switches: [...base.switches, { id: 'x', kind: 'wall', x: 50, z: 10, y: 0, by: 'test' }] }).join()).toMatch(/plain wall switch/);
    expect(bad({ timed: { seconds: 5, rearm: 3 } }).join()).toMatch(/does not cover/);
    expect(bad({ timed: { seconds: 40, rearm: 3 } }).join()).toMatch(/one player can/);
    expect(bad({ lure: { guard: 'a2-shunter', from: [66, 10] }, switches: [base.switches[0]!] }).join()).toMatch(/out of lure range/);
    expect(bad({ cutBy: ['shot'] }).join()).toMatch(/two ways/);
    expect(bad({ group: 31 }).join()).toMatch(/used twice/);
    expect(bad({ electric: false }).join()).toMatch(/only electric/);
    expect(validateMarlowCircuits([...MARLOW_CIRCUITS, { ...circuitOf(90)!, group: 99, key: 'f-x', electric: true, cutBy: ['jam'] }]).join()).toMatch(/90-98|decor/);
  });
});
