/**
 * (guard-ai play pass, docs/guard-ai/PLAY-PASS.md Slice B) The guards Michael meets on /preview/ all spawn where they
 * are authored and can walk their routes: Marlow Yard as the re-planned yard (`ctcourseReplan`) and Tallow Wharf section 1
 * (`tallowWharf`), on the guards' runtime nav grid (`tests/helpers/runtimeNav.ts`), with the doors
 * locked at the start shut on a second grid. `tests/guardPlayProbe.test.ts` stays the report (`GUARD_PROBE=1`).
 *
 * Plus the mode side (P3-1 to P3-3): Course mode's alarm banner promises no reinforcements on a map that has none, one
 * failed squad slot no longer drops the rest of the squad, and Sector Ops' `fill` drops a slot with no nav cell instead
 * of stalling every pending guard behind it (it still waits at the live cap).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { flags } from '../src/core/flags';
import { hyp2 } from '../src/core/mathx';
import { runtimeNav } from './helpers/runtimeNav';
import { closeDoors, slotFaults } from './helpers/guardSlotChecks';
import { CourseMode } from '../src/game/modes/courseMode';
import { SectorMode } from '../src/game/modes/sectorMode';
import type { CourseLayout } from '../src/game/course/courseDef';
import type { GameState } from '../src/game/gameState';

// (one-game) flags default on now; the stub game has no `opts`, so this file runs Sector Ops as before: `?missions=0&campaign=0`
const missions0 = flags.missions;
const campaign0 = flags.campaign;
beforeAll(() => {
  flags.missions = false;
  flags.campaign = false;
});
afterAll(() => {
  flags.missions = missions0;
  flags.campaign = campaign0;
});

describe('guard play pass: every guard spawns and walks his route', () => {
  it('Marlow Yard re-plan (ctcourseReplan): every bay squad slot', { timeout: 300_000 }, async () => {
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const { buildCtcourse, ctcourse } = await import('../src/world/maps/ctcourse');
    const { CourseState } = await import('../src/game/course/courseState');
    const b = new LevelBuilder();
    const lay = buildCtcourse(b, { replan: true }).layout;
    const course = lay.course!;
    const nav = runtimeNav(b, lay.playerSpawns[0]!.pos, ctcourse.navLayers ?? 3, lay.navSeeds ?? []);
    const st = new CourseState(course.def, course.consoles);
    const locked = new Set<number>();
    for (const d of st.lockedDoors()) if (course.doors[d] !== undefined) locked.add(course.doors[d]!);
    for (const a of b.anchors.doors) if (a.locked) locked.add(a.id);
    const navL = runtimeNav(b, lay.playerSpawns[0]!.pos, ctcourse.navLayers ?? 3, lay.navSeeds ?? []);
    closeDoors(b, navL, locked);
    const faults: string[] = [];
    let n = 0;
    for (const bay of course.def.bays) {
      for (const id of bay.squad) {
        const s = course.squads[id];
        if (!s) {
          faults.push(`${bay.id} ${id}: no slot data`);
          continue;
        }
        n++;
        for (const f of slotFaults(b, nav, s)) faults.push(`${bay.id} ${id}: ${f}`);
        for (const f of slotFaults(b, navL, s)) faults.push(`${bay.id} ${id} (locked doors shut): ${f}`);
      }
    }
    expect(n).toBeGreaterThan(0);
    expect(faults).toEqual([]);
  });

  it('Tallow Wharf section 1: every guard slot, reinforce point and entry', { timeout: 300_000 }, async () => {
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const { tallowWharf } = await import('../src/world/maps/tallowWharf');
    const b = new LevelBuilder();
    const lay = tallowWharf.build(b, 0);
    const nav = runtimeNav(b, lay.playerSpawns[0]!.pos, tallowWharf.navLayers ?? 3, lay.navSeeds ?? []);
    const s = tallowWharf.sectors![0]!;
    // the doors shut at the section's start: locked anchors, and the door nearest each keypad, bolt and pair gate
    const locked = new Set<number>();
    for (const a of b.anchors.doors) if (a.locked) locked.add(a.id);
    const nearestDoor = (x: number, z: number): number => {
      let best = -1;
      let bd = 2.5;
      for (const a of b.anchors.doors) {
        const d = hyp2(a.hinge.x + Math.sin(a.yaw) * a.width * 0.5 - x, a.hinge.z + Math.cos(a.yaw) * a.width * 0.5 - z);
        if (d < bd) [best, bd] = [a.id, d];
      }
      return best;
    };
    for (const p of [...(s.keypads ?? []), ...(s.bolts ?? []), ...((s.pairGates ?? []) as readonly { at?: readonly [number, number] }[])]) {
      if (!p.at) continue;
      const id = nearestDoor(p.at[0], p.at[1]);
      if (id >= 0) locked.add(id);
    }
    const navL = runtimeNav(b, lay.playerSpawns[0]!.pos, tallowWharf.navLayers ?? 3, lay.navSeeds ?? []);
    closeDoors(b, navL, locked);
    expect(s.guards.length).toBeGreaterThan(0);
    const faults: string[] = [];
    s.guards.forEach((g, k) => {
      for (const f of slotFaults(b, nav, g)) faults.push(`guard ${k}: ${f}`);
      for (const f of slotFaults(b, navL, g)) faults.push(`guard ${k} (locked doors shut): ${f}`);
    });
    for (const [i, p] of s.reinforce.entries()) {
      if (nav.nearestWalkable(p[0], p[1], 8) < 0) faults.push(`reinforce ${i}: no cell`);
      else if (!nav.findPath([p[0], p[1]], [s.start.x, s.start.z], 200000)) faults.push(`reinforce ${i}: no path to the start`);
    }
    for (const [i, e] of (s.entries ?? []).entries()) {
      if (nav.nearestWalkable(e.at[0], e.at[1], 8, e.y ?? Number.NaN) < 0) faults.push(`entry ${i}: no cell`);
    }
    expect(faults).toEqual([]);
  });
});

// ---- the mode side (stub games) ----

interface StubEnemy {
  kind: string;
  alive: boolean;
  setPatrol: () => void;
}

describe('guard play pass: Course mode (P3-1, P3-2)', () => {
  afterEach(() => vi.restoreAllMocks());

  function course(layout: Record<string, unknown>, fail: ReadonlySet<string>) {
    const spawned: string[] = [];
    const em = {
      enemies: [] as StubEnemy[],
      spawn: (kind: string) => {
        if (fail.has(kind)) return null;
        spawned.push(kind);
        return { kind, alive: true, setPatrol: () => undefined };
      },
      despawn: () => undefined,
      // (gm-look-seeds) a set's look seeds (`spawnSquad`): none here, `spawn` picks

      pointLooks: () => [],

      placeSlot: () => undefined,
    };
    const g = {
      enemyMgr: em,
      takedown: { active: false, reset: () => undefined },
      net: null,
      world: { layout },
    } as unknown as GameState;
    const mode = new CourseMode(g);
    return { mode, spawned };
  }

  it('the alarm banner is quiet on a course with no reinforce points or entries (Marlow Yard), not otherwise', () => {
    expect(course({}, new Set()).mode.alarmQuiet()).toBe(true);
    expect(course({ reinforce: [] }, new Set()).mode.alarmQuiet()).toBe(true);
    expect(course({ reinforce: [{ x: 0, y: 0, z: 0 }] }, new Set()).mode.alarmQuiet()).toBe(false);
    expect(course({ guardAi: { entries: [{ section: 0, at: [0, 0] }] } }, new Set()).mode.alarmQuiet()).toBe(false);
  });

  it('a failed squad slot skips only that guard (said once); the rest of the squad spawns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { mode, spawned } = course({}, new Set(['heavy']));
    const lay = {
      squads: {
        a: { kind: 'grunt', x: 0, z: 0, yaw: 0 },
        b: { kind: 'heavy', x: 1, z: 0, yaw: 0 },
        c: { kind: 'officer', x: 2, z: 0, yaw: 0 },
      },
    } as unknown as CourseLayout;
    mode.layout = lay;
    const m = mode as unknown as { spawnSquad(ids: string[]): void; squadIds: string[] };
    m.spawnSquad(['a', 'b', 'c']);
    expect(spawned).toEqual(['grunt', 'officer']);
    expect(m.squadIds).toEqual(['a', 'c']);
    m.spawnSquad(['a', 'b', 'c']);
    expect(m.squadIds).toEqual(['a', 'c']);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('guard play pass: Sector Ops fill (P3-3)', () => {
  afterEach(() => vi.restoreAllMocks());

  function sector(maxAlive: number, fail: ReadonlySet<string>) {
    const em = {
      enemies: [] as StubEnemy[],
      maxAlive,
      coordinated: true,
      get alive(): number {
        return em.enemies.length;
      },
      spawn: (kind: string) => {
        if (em.enemies.length >= em.maxAlive || fail.has(kind)) return null;
        const e = { kind, alive: true, setPatrol: () => undefined };
        em.enemies.push(e);
        return e;
      },
      // (gm-look-seeds) a set's look seeds (`spawnSquad`): none here, `spawn` picks

      pointLooks: () => [],

      placeSlot: () => undefined,
    };
    const g = {
      world: { map: { sectors: [] }, layout: {}, doors: { list: [] } },
      enemyMgr: em,
      playerRefsInto: (out: unknown[]) => out,
      hud: { feedItem: () => undefined },
    } as unknown as GameState;
    const mode = new SectorMode(g);
    const m = mode as unknown as { fill(): void; pending: { k: number; slot: { kind: string; x: number; z: number }; alerted: boolean }[] };
    const slot = (k: number, kind: string) => ({ k, slot: { kind, x: k * 2, z: 0, yaw: 0 }, alerted: false });
    m.pending.push(slot(0, 'grunt'), slot(1, 'heavy'), slot(2, 'officer'), slot(3, 'grunt'));
    return { em, m };
  }

  it('a slot with no nav cell is dropped (said once); the guards behind it still spawn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { em, m } = sector(32, new Set(['heavy']));
    m.fill();
    expect(em.enemies.map((e) => e.kind)).toEqual(['grunt', 'officer', 'grunt']);
    expect(m.pending).toHaveLength(0);
    m.fill();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('at the live cap the rest wait (none dropped) and spawn once there is room', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { em, m } = sector(2, new Set());
    m.fill();
    expect(em.enemies).toHaveLength(2);
    expect(m.pending.map((p) => p.k)).toEqual([2, 3]);
    em.maxAlive = 4;
    m.fill();
    expect(em.enemies).toHaveLength(4);
    expect(m.pending).toHaveLength(0);
    expect(warn).not.toHaveBeenCalled();
  });
});
