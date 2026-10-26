import { describe, expect, it, vi } from 'vitest';
import { EnemyManager } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { BLACKOUT_SEARCH, ringPoint, SEARCH, SEARCH_BLACKOUT, SEARCH_PLAIN, searchSpec } from '../src/ai/response';
import { hyp2 } from '../src/core/mathx';
import type { Enemy } from '../src/ai/enemy';
import type { Scene } from '../src/core/babylon';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (piano escape GA1, GA3; docs/piano-escape/PLAN.md "Guard AI Build asks" on feature/piano-escape) The scene blackout:
// every guard who carries a torch has it on in every state (GA1), and the scene's one reaction is a ~6 m search round
// the intro wall by the guards it names (GA3). Off the scene (`sceneDark` false) nothing changes. Stand-in guards on
// the real class (no meshes), as tests/enemyManagerDespawn.test.ts.

function manager(level = 1) {
  const setOn = vi.fn();
  const torches = [
    { id: 'torch-0', kind: 'flashlight', x: 0, y: -50, z: 0, radius: 13, on: false },
    { id: 'torch-1', kind: 'flashlight', x: 0, y: -50, z: 0, radius: 13, on: false },
    { id: 'torch-2', kind: 'flashlight', x: 0, y: -50, z: 0, radius: 13, on: false },
  ];
  const world = {
    level: { lights: { lights: torches, setOn }, cover: [], coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
    // `level` everywhere (1: brightly lit, so the torch rule as built says no)
    lightField: { levelAt: () => level },
  };
  const em = new EnemyManager({} as Scene, world as unknown as World, { walk: new Uint8Array(4), heightAt: () => 0 } as unknown as NavGrid, {} as DamageRegistry, {} as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  return { em, world, setOn };
}

async function standIn(em: EnemyManager, kind: 'grunt' | 'officer' | 'dog', level: 'unaware' | 'searching' = 'unaware'): Promise<Enemy> {
  const { Enemy: EnemyClass } = await import('../src/ai/enemy');
  const { ENEMIES } = await import('../src/ai/enemyDefs');
  const ctx = (em as unknown as { ctx: unknown }).ctx;
  return Object.assign(Object.create(EnemyClass.prototype) as Enemy, {
    id: kind,
    health: { alive: true },
    def: ENEMIES[kind],
    aware: { level, calmNow: level === 'unaware' },
    caution: 0,
    los: false,
    taken: false,
    torchOverride: null,
    pos: { x: 0, y: 0, z: 0 },
    yaw: 0,
    crouch: 0,
    ctx,
  });
}

const torchesOf = (em: EnemyManager) => (em as unknown as { torchOwner: (Enemy | null)[]; updateTorches(): void });

describe('GA1: torches on in every state during the scene blackout', () => {
  it('calm guards in a lit spot have none as built; with sceneDark every carrier takes one, a dog never', async () => {
    const { em } = manager(1);
    const grunt = await standIn(em, 'grunt');
    const officer = await standIn(em, 'officer');
    const dog = await standIn(em, 'dog');
    em.enemies.push(grunt, officer, dog);
    const t = torchesOf(em);
    t.updateTorches();
    expect(em.torchesOn).toBe(0);
    em.sceneDark = true;
    t.updateTorches();
    expect(t.torchOwner).toContain(grunt);
    expect(t.torchOwner).toContain(officer);
    expect(t.torchOwner).not.toContain(dog);
    expect(em.torchesOn).toBe(2);
    // the blackout over (the scene left): the rule as built releases them
    em.sceneDark = false;
    t.updateTorches();
    expect(em.torchesOn).toBe(0);
  });

  it('a guard held in a takedown or down drops his; the rule as built is untouched with sceneDark off', async () => {
    const { em } = manager(0);
    const a = await standIn(em, 'grunt');
    const b = await standIn(em, 'grunt');
    em.enemies.push(a, b);
    em.sceneDark = true;
    const t = torchesOf(em);
    t.updateTorches();
    expect(em.torchesOn).toBe(2);
    (a as unknown as { taken: boolean }).taken = true;
    (b as unknown as { health: { alive: boolean } }).health.alive = false;
    t.updateTorches();
    expect(em.torchesOn).toBe(0);
    // off: a calm guard in the pitch dark has none (the rule: only while looking for something)
    em.sceneDark = false;
    (a as unknown as { taken: boolean }).taken = false;
    t.updateTorches();
    expect(t.torchOwner).not.toContain(a);
    // and a searching one in the dark has his, as built
    const c = await standIn(em, 'grunt', 'searching');
    em.enemies.push(c);
    t.updateTorches();
    expect(t.torchOwner).toContain(c);
  });
});

describe('GA3: one blackout reaction', () => {
  it('the blackout search kind rings out to ~6 m with the plain length; the other kinds are unchanged', () => {
    const s = searchSpec(SEARCH_BLACKOUT);
    expect(SEARCH.length).toBe(4);
    expect(s.time).toBe(searchSpec(SEARCH_PLAIN).time);
    expect(s.max).toBe(BLACKOUT_SEARCH.max);
    expect(s.max).toBe(6);
    const p: [number, number] = [0, 0];
    for (let k = 0; k < 16; k++)
      for (let slot = 0; slot < 4; slot++) {
        ringPoint(5, 3, k, slot, s, p);
        expect(hyp2(p[0] - 5, p[1] - 3)).toBeLessThanOrEqual(6 + 1e-9);
      }
  });

  it('blackoutSearch starts the named guards searching round the point; the down, the alerted and the held are skipped', () => {
    const { em } = manager();
    const g = (o: Partial<{ alive: boolean; alerted: boolean; taken: boolean }> = {}) => ({ alive: true, alerted: false, taken: false, ...o, searchAt: vi.fn() });
    const ok1 = g();
    const ok2 = g();
    const down = g({ alive: false });
    const fighting = g({ alerted: true });
    const held = g({ taken: true });
    const list = [ok1, down, ok2, fighting, held] as unknown as Enemy[];
    expect(em.blackoutSearch(list, 4, -2)).toBe(2);
    expect(ok1.searchAt).toHaveBeenCalledWith(4, -2, null, SEARCH_BLACKOUT);
    expect(ok2.searchAt).toHaveBeenCalledWith(4, -2, null, SEARCH_BLACKOUT);
    for (const e of [down, fighting, held]) expect(e.searchAt).not.toHaveBeenCalled();
  });

  it("blackoutSearchSlots takes the live section's slot indices (the plan's mill:0-mill:3); an empty slot is skipped", () => {
    const { em } = manager();
    const g = () => ({ alive: true, alerted: false, taken: false, searchAt: vi.fn() });
    const s0 = g();
    const s2 = g();
    const s3 = g();
    (em as unknown as { slotGuard: unknown[] }).slotGuard.push(s0, null, s2, s3);
    expect(em.blackoutSearchSlots([0, 1, 2, 7], 5.5, 5.25)).toBe(2);
    expect(s0.searchAt).toHaveBeenCalledWith(5.5, 5.25, null, SEARCH_BLACKOUT);
    expect(s2.searchAt).toHaveBeenCalledWith(5.5, 5.25, null, SEARCH_BLACKOUT);
    expect(s3.searchAt).not.toHaveBeenCalled();
  });

  it('in a scene blackout a lights-out sends nobody (the scene reaction is the only one); off, the board runs as built', () => {
    const { em } = manager();
    const room = vi.fn();
    (em as unknown as { hearRoom: (n: number) => void }).hearRoom = room;
    em.sceneDark = true;
    em.lightsOut(1, 1);
    expect(room).not.toHaveBeenCalled();
    em.sceneDark = false;
    em.lightsOut(1, 1, 2.5);
    expect(room).toHaveBeenCalled();
  });
});

describe('GA7: rain masks hearing over the whole map', () => {
  it('a map-wide source gives its level at every listener, near and far, and halves the reach at 6 dB', async () => {
    const { ambientDb, effectiveReach, mapWideNoise } = await import('../src/ai/hearing');
    const rain = mapWideNoise('rain', 6);
    for (const [x, z] of [[0, 0], [40, -25], [-300, 900]] as const) expect(ambientDb([rain], x, z)).toBe(6);
    expect(effectiveReach(10, 0, ambientDb([rain], 12, 3))).toBeCloseTo(10 * 10 ** (-6 / 20), 9);
    expect(effectiveReach(10, 0, ambientDb([rain], 12, 3))).toBeCloseTo(5, 0);
    // a louder local source still wins where it is louder; the rain is the floor elsewhere
    const gen = { id: 'gen', x: 0, z: 0, radius: 10, db: 12 };
    expect(ambientDb([rain, gen], 1, 0)).toBeGreaterThan(6);
    expect(ambientDb([rain, gen], 30, 0)).toBe(6);
  });
});
