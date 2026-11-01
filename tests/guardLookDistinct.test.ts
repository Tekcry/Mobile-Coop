import { describe, expect, it, vi } from 'vitest';
import { distinctLooks, freeLook, LOOK_MAX, posLook, slotLook } from '../src/ai/guardLook';
import { EnemyManager } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import type { EnemyDef } from '../src/ai/enemyDefs';
import { Vector3, type Scene } from '../src/core/babylon';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (gm-look-seeds) No two guards of a section share a look seed (up to 128): authored guards keep the same seed on every
// load and restart whatever the spawn order; runtime spawns (teams, reinforcements) move on to a free seed.

// a stand-in guard for the real manager's `spawn` (as tests/guardLook.test.ts)
vi.mock('../src/ai/enemy', async (orig) => {
  const real = await orig<object>();
  class StubEnemy {
    static n = 0;
    readonly id = `s${StubEnemy.n++}`;
    look = 0;
    key = -1;
    alive = true;
    dog = null;
    crew: unknown = null;
    helmet = false;
    armour = false;
    section = 0;
    constructor(
      _ctx: unknown,
      readonly def: EnemyDef,
      readonly pos: Vector3,
      readonly yaw: number,
    ) {}
    alert(): void {}
    tell(_slot: number): void {}
    joinAsResponder(): void {}
    joinAsReinforcement(): void {}
    dispose(): void {}
    setGear(g: { helmet: boolean; armour: boolean }): void {
      this.helmet = g.helmet;
      this.armour = g.armour;
    }
  }
  return { ...real, Enemy: StubEnemy };
});

/** The real manager on a stub world (map `mapId`) and nav (every point walkable at the origin cell). */
function manager(mapId = 'ctcourse'): EnemyManager {
  const world = {
    map: { id: mapId },
    level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
  };
  const nav = { walk: new Uint8Array(4), height: new Float32Array(4), nearestWalkable: vi.fn(() => 0), center: vi.fn(() => [0, 0]) };
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: vi.fn() } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  em.maxAlive = 200;
  return em;
}

const at = (x: number, z: number): Vector3 => new Vector3(x, 0, z);

/** The most guards given one seed. */
const maxUse = (seeds: readonly number[]): number => {
  const n = new Array<number>(LOOK_MAX + 1).fill(0);
  for (const s of seeds) n[s]!++;
  return Math.max(...n);
};

/** Two points on a small grid that share one `posLook` (a clash the old rule kept). */
function clashPair(map: string): [{ x: number; z: number }, { x: number; z: number }] {
  const seen = new Map<number, { x: number; z: number }>();
  for (let i = 0; i < 400; i++) {
    const p = { x: (i % 20) * 1.7, z: Math.floor(i / 20) * 2.3 };
    const s = posLook(map, p.x, p.z);
    const q = seen.get(s);
    if (q) return [q, p];
    seen.set(s, p);
  }
  throw new Error('no clash found');
}

describe('gm-look-seeds: freeLook / distinctLooks', () => {
  it('freeLook: the preferred seed when free, else the next free one (mod 128); all taken: the preferred', () => {
    const use = new Uint16Array(LOOK_MAX + 1);
    expect(freeLook(40, use)).toBe(40);
    use[40] = 1;
    use[41] = 2;
    expect(freeLook(40, use)).toBe(42);
    use[127] = 1;
    expect(freeLook(127, use)).toBe(0);
    use.fill(1);
    expect(freeLook(77, use)).toBe(77);
    expect(freeLook(200, use)).toBe(200 & LOOK_MAX);
  });

  it('20 points: 20 distinct seeds, the same output for the same input, the first claimer keeps its seed', () => {
    const [a, b] = clashPair('ctcourse');
    const pts = [a, b];
    for (let i = 0; pts.length < 20; i++) pts.push({ x: 100 + i * 3.1, z: -40 + i * 1.9 });
    const pref = pts.map((p) => posLook('ctcourse', p.x, p.z));
    expect(pref[0]).toBe(pref[1]);
    const out = distinctLooks([...pref]);
    expect(new Set(out).size).toBe(20);
    expect(distinctLooks([...pref])).toEqual(out);
    expect(out[0]).toBe(pref[0]);
    expect(out[1]).not.toBe(pref[1]);
    // a seed nobody before it claimed stays its own
    for (let i = 0; i < 20; i++) if (!pref.slice(0, i).includes(pref[i]!) && !out.slice(0, i).includes(pref[i]!)) expect(out[i]).toBe(pref[i]);
  });

  it('200 seeds: no throw, every seed used, none more than twice', () => {
    const seeds = Array.from({ length: 200 }, (_, i) => posLook('campusOps', i * 0.7, -i * 1.3));
    const out = distinctLooks(seeds);
    expect(out).toBe(seeds); // in place
    expect(new Set(out.slice(0, 128)).size).toBe(128);
    expect(new Set(out).size).toBe(128);
    expect(maxUse(out)).toBeLessThanOrEqual(2);
  });
});

describe('gm-look-seeds: EnemyManager', () => {
  it('Course-style: pointLooks gives 20 distinct seeds; spawned in reverse order the same per point; the same after a restart', () => {
    const em = manager();
    const [a, b] = clashPair('ctcourse');
    const pts = [a, b];
    for (let i = 0; pts.length < 20; i++) pts.push({ x: -60 + i * 2.7, z: 15 + i * 0.9 });
    const seeds = em.pointLooks(pts);
    expect(new Set(seeds).size).toBe(20);
    const rev: number[] = [];
    for (let i = pts.length - 1; i >= 0; i--) rev[i] = em.spawn('grunt', at(pts[i]!.x, pts[i]!.z), false, 0, seeds[i])!.look;
    expect(rev).toEqual(seeds);
    // a restart (Course `bayRestart` -> `resetMemory`): the same set gives the same seeds
    em.resetMemory();
    const again = em.pointLooks(pts);
    expect(again).toEqual(seeds);
    expect(pts.map((p, i) => em.spawn('grunt', at(p.x, p.z), false, 0, again[i])!.look)).toEqual(seeds);
  });

  /** A Sector Ops load: the 12 slot seeds up front, 4 slot guards, a team of 4, 3 lone reinforcements at one entry
   *  point, the other 8 slot guards. */
  function sectorLoad(em: EnemyManager) {
    const slotSeeds = Array.from({ length: 12 }, (_, k) => em.lookOfSlot('s2', k));
    em.beginLooks(slotSeeds);
    const slot: number[] = [];
    for (let k = 0; k < 4; k++) slot[k] = em.spawn('grunt', at(k * 4, 0), false, 0, slotSeeds[k])!.look;
    const t = em.newTeam(2, null, [], []);
    const team: number[] = [];
    for (let i = 0; i < 4; i++) {
      const e = em.spawn(i === 0 ? 'enforcer' : 'grunt', at(50 + i, 5), true, 0)!;
      em.joinTeam(e, t);
      team.push(e.look);
    }
    const reinf: number[] = [];
    for (let i = 0; i < 3; i++) reinf.push(em.spawnReinforcement('grunt', at(-30, 12), 0, 2)!.look);
    for (let k = 4; k < 12; k++) slot[k] = em.spawn('grunt', at(k * 4, 0), false, 0, slotSeeds[k])!.look;
    return { slot, team, reinf };
  }

  it('Sector-style: 19 distinct seeds, slot seeds exactly slotLook, a second team distinct; despawnAll + the same sequence: identical', () => {
    const em = manager();
    const a = sectorLoad(em);
    expect(a.slot).toEqual(Array.from({ length: 12 }, (_, k) => slotLook('ctcourse', 's2', k)));
    const all = [...a.slot, ...a.team, ...a.reinf];
    expect(new Set(all).size).toBe(19);
    // the three lone reinforcements share one entry point (one posLook) and still get three seeds
    expect(new Set(a.reinf).size).toBe(3);
    const t2 = em.newTeam(2, null, [], []);
    const second: number[] = [];
    for (let i = 0; i < 4; i++) {
      const e = em.spawn('grunt', at(50, 5), true, 0)!;
      em.joinTeam(e, t2);
      second.push(e.look);
    }
    expect(new Set([...all, ...second]).size).toBe(23);
    em.despawnAll();
    expect(sectorLoad(em)).toEqual(a);
  });

  it('joinTeam gives back the seed spawn gave: with 126 seeds taken a member still gets a free one, and the freed one is reusable', () => {
    const em = manager();
    const taken = Array.from({ length: 126 }, (_, i) => i);
    em.beginLooks(taken); // 126 and 127 free
    const t = em.newTeam(0, null, [], []);
    const e = em.spawn('grunt', at(3, 3), true, 0)!;
    const given = e.look;
    expect(given).toBeGreaterThanOrEqual(126);
    em.joinTeam(e, t);
    expect(e.look).toBeGreaterThanOrEqual(126);
    // one of 126 / 127 is still free (the spawn's seed went back): the next guard takes it, not a repeat
    const f = em.spawn('grunt', at(9, 9), false, 0)!;
    expect(f.look).toBeGreaterThanOrEqual(126);
    expect(f.look).not.toBe(e.look);
  });

  it('over 128 in a section: 140 spawns, no throw, every seed used, none more than twice', () => {
    const em = manager();
    const seeds: number[] = [];
    for (let i = 0; i < 140; i++) seeds.push(em.spawn('grunt', at(i * 0.9, (i % 7) * 2.2), false, 0)!.look);
    expect(new Set(seeds).size).toBe(128);
    expect(maxUse(seeds)).toBeLessThanOrEqual(2);
  });
});
