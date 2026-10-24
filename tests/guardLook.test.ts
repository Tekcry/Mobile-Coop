import { describe, expect, it, vi } from 'vitest';
import {
  AL_ARMOUR,
  AL_CARRY,
  AL_CAUTION,
  AL_HELMET,
  AL_LOOK,
  AL_LOOK_SHIFT,
  AL_MAX,
  AL_SEIZED,
  AL_TORCH,
  alertCarry,
  alertLook,
  packAlert,
  parseMessage,
  PROTOCOL_VERSION,
  type EnemyState,
} from '../src/net/protocol';
import { LOOK_MAX, lookSeed, posLook, slotLook, teamLook } from '../src/ai/guardLook';
import { EnemyManager } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import type { EnemyDef } from '../src/ai/enemyDefs';
import { NetSession } from '../src/net/session';
import type { Transport } from '../src/net/transport';
import { defaultLook } from '../src/cosmetics/avatarLook';
import type { WeaponId } from '../src/weapons/weaponDefs';
import { Vector3, type Scene } from '../src/core/babylon';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (guard-models G6n, M3) The per-guard look seed: 7 bits in the enemy `al` (bits 9-15) over every older bit, kept by the
// parser; set once at spawn from the spawn slot (never `Enemy.num`), so a section restart gives each slot the same
// seed; response team members get distinct seeds. Version checks read PROTOCOL_VERSION, never a number.

// a stand-in guard for the real manager's `spawn` (a real one needs a scene and meshes; the e2e covers those)
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
    // (guard-ai S24, master) `spawn(..., alerted)` tells him command's intruder first (`sendIn`)
    tell(_slot: number): void {}
    dispose(): void {}
    setGear(g: { helmet: boolean; armour: boolean }): void {
      this.helmet = g.helmet;
      this.armour = g.armour;
    }
  }
  return { ...real, Enemy: StubEnemy };
});

/** Through JSON and the parser, as a client receives it. */
const snapEnemies = (enemies: EnemyState[]): EnemyState[] => {
  const m = parseMessage(JSON.parse(JSON.stringify({ t: 'snap', time: 1, players: [], enemies, obj: '', info: '' })));
  return m && m.t === 'snap' ? m.enemies : [];
};
const st = (i: number, al: number): EnemyState => ({ id: `e${i}`, k: 'grunt', x: 0, y: 0, z: 0, yaw: 0, st: 0, hp: 1, al });

/** The real manager on a stub world (map `mapId`) and nav (every point walkable at the origin cell). */
function manager(mapId = 'ctcourse') {
  const world = {
    map: { id: mapId },
    level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
  };
  const nav = { walk: new Uint8Array(4), height: new Float32Array(4), nearestWalkable: vi.fn(() => 0), center: vi.fn(() => [0, 0]) };
  return new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: vi.fn() } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
}

describe('G6n: the look seed in the enemy al', () => {
  it('bits 9-15 above every older bit; AL_MAX covers them all', () => {
    expect(AL_LOOK_SHIFT).toBe(9);
    expect(AL_LOOK).toBe(LOOK_MAX << AL_LOOK_SHIFT);
    expect(AL_LOOK & (3 | AL_SEIZED | AL_TORCH | AL_CAUTION | AL_HELMET | AL_ARMOUR | AL_CARRY)).toBe(0);
    expect(AL_MAX).toBe(3 | AL_SEIZED | AL_TORCH | AL_CAUTION | AL_HELMET | AL_ARMOUR | AL_CARRY | AL_LOOK);
    // old callers (no look) are unchanged: seed 0
    expect(alertLook(packAlert(3, true, true, true, true, true, 3))).toBe(0);
    expect(packAlert(3, true, true, true, true, true, 3)).toBe(511);
    expect(packAlert(0, false, false, false, false, false, 0, LOOK_MAX)).toBe(AL_LOOK);
    // a seed past 7 bits keeps its low 7 (never spills into a neighbour)
    expect(packAlert(0, false, false, false, false, false, 0, 128 + 5)).toBe(5 << AL_LOOK_SHIFT);
  });

  it('round trip for all 128 seeds with every level, seized, torch, cautious, helmet, armour and carry combination', () => {
    let n = 0;
    for (let look = 0; look <= LOOK_MAX; look++) {
      for (let carry = 0; carry < 4; carry++) {
        for (let lvl = 0; lvl < 4; lvl++) {
          for (let mask = 0; mask < 32; mask++) {
            const f = [(mask & 1) !== 0, (mask & 2) !== 0, (mask & 4) !== 0, (mask & 8) !== 0, (mask & 16) !== 0];
            const al = packAlert(lvl, f[0]!, f[1]!, f[2]!, f[3]!, f[4]!, carry, look);
            const back = (al & AL_SEIZED ? 1 : 0) | (al & AL_TORCH ? 2 : 0) | (al & AL_CAUTION ? 4 : 0) | (al & AL_HELMET ? 8 : 0) | (al & AL_ARMOUR ? 16 : 0);
            if (alertLook(al) !== look || alertCarry(al) !== carry || (al & 3) !== lvl || back !== mask || al < 0 || al > AL_MAX) {
              expect([alertLook(al), alertCarry(al), al & 3, back]).toEqual([look, carry, lvl, mask]);
            }
            n++;
          }
        }
      }
    }
    expect(n).toBe(128 * 4 * 4 * 32);
  });

  it('the parser keeps the seed with every other bit (through JSON, as a client receives it)', () => {
    const states: EnemyState[] = [];
    const want: number[] = [];
    for (let look = 0; look <= LOOK_MAX; look++) {
      const al = packAlert(look & 3, (look & 4) !== 0, (look & 8) !== 0, (look & 16) !== 0, (look & 32) !== 0, (look & 64) !== 0, look & 3, look);
      states.push(st(look, al));
      want.push(al);
    }
    // every bit set
    states.push(st(999, AL_MAX));
    want.push(AL_MAX);
    const got: EnemyState[] = [];
    for (let i = 0; i < states.length; i += 32) got.push(...snapEnemies(states.slice(i, i + 32)));
    expect(got.map((e) => e.al)).toEqual(want);
    expect(got.slice(0, 128).map((e) => alertLook(e.al))).toEqual(Array.from({ length: 128 }, (_, i) => i));
    expect(alertLook(got[128]!.al)).toBe(LOOK_MAX);
  });

  it('the parser clamps an out-of-range al into the bits (never past AL_MAX, never negative, whole)', () => {
    const got = snapEnemies([st(0, AL_MAX + 1), st(1, 1e9), st(2, -1), st(3, (77 << AL_LOOK_SHIFT) + 0.6)]);
    expect(got.map((e) => e.al)).toEqual([AL_MAX, AL_MAX, 0, 77 << AL_LOOK_SHIFT]);
    expect(got.map((e) => alertLook(e.al))).toEqual([LOOK_MAX, LOOK_MAX, 0, 77]);
    // not a number: 0 (no seed), the guard still parses
    const m = parseMessage({ t: 'snap', time: 1, players: [], enemies: [{ ...st(4, 0), al: 'x' }], obj: '', info: '' });
    expect(m && m.t === 'snap' ? m.enemies.map((e) => e.al) : null).toEqual([0]);
  });
});

describe('G6n: the seed function (guardLook.ts)', () => {
  it('deterministic and in 0-127', () => {
    for (let i = 0; i < 200; i++) {
      const a = slotLook('ctcourse', 's1', i);
      expect(a).toBe(slotLook('ctcourse', 's1', i));
      expect(Number.isInteger(a) && a >= 0 && a <= LOOK_MAX).toBe(true);
    }
    expect(posLook('ctcourse', 12.34, -5.67)).toBe(posLook('ctcourse', 12.34, -5.67));
    // quantised to 0.1 m: the same authored point (any float noise below that) gives the same seed
    expect(posLook('ctcourse', 12.3, -5.7)).toBe(posLook('ctcourse', 12.3 + 1e-9, -5.7 - 1e-9));
  });

  it('the slots of one section (up to 128) never share a seed; the members of one team neither', () => {
    for (const sec of ['s1', 's2', 'yard', 'bay-3']) {
      const seeds = new Set<number>();
      for (let k = 0; k < 128; k++) seeds.add(slotLook('campus', sec, k));
      expect(seeds.size).toBe(128);
    }
    for (let sec = 0; sec < 6; sec++) {
      for (let team = 0; team < 4; team++) {
        const seeds = new Set<number>();
        for (let m = 0; m < 8; m++) seeds.add(teamLook('campus', sec, team, m));
        expect(seeds.size).toBe(8);
      }
    }
  });

  it('the key matters: map, section and team move the seeds', () => {
    const row = (f: (k: number) => number) => Array.from({ length: 16 }, (_, k) => f(k));
    expect(row((k) => slotLook('ctcourse', 's1', k))).not.toEqual(row((k) => slotLook('campus', 's1', k)));
    expect(row((k) => slotLook('campus', 's1', k))).not.toEqual(row((k) => slotLook('campus', 's2', k)));
    expect(row((k) => teamLook('campus', 1, 0, k))).not.toEqual(row((k) => teamLook('campus', 1, 1, k)));
    expect(row((k) => teamLook('campus', 1, 0, k))).not.toEqual(row((k) => teamLook('campus', 2, 0, k)));
  });

  it('the distribution is not degenerate: first slots over many keys spread over 0-127', () => {
    const hist = new Array<number>(128).fill(0);
    const N = 128 * 40;
    for (let i = 0; i < N; i++) hist[lookSeed(`map${i % 7}|sec${i}`, 0)]!++;
    // every value is hit, none above 3x its share (40)
    expect(hist.every((h) => h > 0)).toBe(true);
    expect(Math.max(...hist)).toBeLessThan(120);
    // each of the 7 bits is set about half the time
    for (let b = 0; b < 7; b++) {
      let on = 0;
      for (let v = 0; v < 128; v++) if (v & (1 << b)) on += hist[v]!;
      expect(on / N).toBeGreaterThan(0.45);
      expect(on / N).toBeLessThan(0.55);
    }
    // authored points on a grid: no seed takes more than a few percent
    const g = new Array<number>(128).fill(0);
    for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) g[posLook('ctcourse', x * 1.5, z * 1.5)]!++;
    expect(Math.max(...g)).toBeLessThan(1600 * 0.03);
  });
});

describe('G6n: Enemy.look at spawn (EnemyManager), stable across a section restart', () => {
  const slots = [new Vector3(3, 0, 4), new Vector3(-12.5, 0, 30.2), new Vector3(40, 0, -7.25), new Vector3(3.05, 0, 4)];

  /** One section load: authored guards from their slots (`lookOfSlot`, as Sector Ops), course-style guards from their
   *  points (no key), then a response team of four. */
  function load(em: EnemyManager): { slot: number[]; point: number[]; team: number[]; nums: string[] } {
    const slot = slots.map((p, k) => em.spawn('grunt', p, false, 0, em.lookOfSlot('s1', k))!.look);
    const point = slots.map((p) => em.spawn('grunt', p, false, 0)!.look);
    const t = em.newTeam(1, null, [], []);
    const team: number[] = [];
    for (let i = 0; i < 4; i++) {
      const e = em.spawn(i === 0 ? 'enforcer' : 'grunt', new Vector3(60 + i * 1.3, 0, 0), true, 0)!;
      em.joinTeam(e, t);
      team.push(e.look);
    }
    return { slot, point, team, nums: em.enemies.map((e) => e.id) };
  }

  it('the same slot gets the same seed after despawnAll (a restart) and on a new manager (a reload), whatever the ids', () => {
    const em = manager();
    em.maxAlive = 64;
    const a = load(em);
    em.despawnAll();
    const b = load(em);
    expect(b.nums).not.toEqual(a.nums); // new guards, new ids
    expect(b.slot).toEqual(a.slot);
    expect(b.point).toEqual(a.point);
    expect(b.team).toEqual(a.team);
    const em2 = manager();
    em2.maxAlive = 64;
    const c = load(em2);
    expect([c.slot, c.point, c.team]).toEqual([a.slot, a.point, a.team]);
    // and the seeds are the slot keys' (not the spawn order's)
    expect(a.slot).toEqual(slots.map((_, k) => slotLook('ctcourse', 's1', k)));
    expect(a.point).toEqual(slots.map((p) => posLook('ctcourse', p.x, p.z)));
    expect(a.team).toEqual([0, 1, 2, 3].map((m) => teamLook('ctcourse', 1, 0, m)));
  });

  it('the spawn order does not move a slot seed', () => {
    const em = manager();
    em.maxAlive = 64;
    const fwd = slots.map((p, k) => em.spawn('grunt', p, false, 0, em.lookOfSlot('s1', k))!.look);
    em.despawnAll();
    const rev: number[] = [];
    for (let k = slots.length - 1; k >= 0; k--) rev[k] = em.spawn('grunt', slots[k]!, false, 0, em.lookOfSlot('s1', k))!.look;
    expect(rev).toEqual(fwd);
  });

  it('a response team: distinct seeds within the team; a second alarm\'s team is its own key', () => {
    const em = manager();
    em.maxAlive = 64;
    const a = load(em).team;
    expect(new Set(a).size).toBe(a.length);
    const t2 = em.newTeam(1, null, [], []);
    expect(t2.index).toBe(1);
    const second: number[] = [];
    for (let i = 0; i < 4; i++) {
      const e = em.spawn('grunt', new Vector3(60, 0, 0), true, 0)!;
      em.joinTeam(e, t2);
      second.push(e.look);
    }
    expect(new Set(second).size).toBe(4);
    expect(second).toEqual([0, 1, 2, 3].map((m) => teamLook('ctcourse', 1, 1, m)));
  });

  it('an explicit look keeps its 7 bits; a stub world without a map still spawns', () => {
    const em = manager();
    expect(em.spawn('grunt', slots[0]!, false, 0, 200)!.look).toBe(200 & LOOK_MAX);
    const bare = new EnemyManager(
      {} as Scene,
      { level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] } } as unknown as World,
      { walk: new Uint8Array(4), height: new Float32Array(4), nearestWalkable: () => 0, center: () => [0, 0] } as unknown as NavGrid,
      {} as DamageRegistry,
      {} as Ballistics,
      {} as Vfx,
      DIFFICULTY.normal,
      () => [],
    );
    expect(bare.spawn('grunt', slots[1]!, false, 0)!.look).toBe(posLook('', slots[1]!.x, slots[1]!.z));
  });
});

describe('G6n: version checks read PROTOCOL_VERSION only', () => {
  function hub() {
    const peers = new Map<string, Transport & { deliver(m: unknown, from: string): void }>();
    const make = (id: string) => {
      const t = {
        selfId: id,
        onMessage: null as Transport['onMessage'],
        onPeerJoin: null as Transport['onPeerJoin'],
        onPeerLeave: null as Transport['onPeerLeave'],
        send(msg: unknown, to?: string) {
          const raw = JSON.parse(JSON.stringify(msg)) as unknown;
          for (const [pid, p] of peers) if (pid !== id && (!to || to === pid)) p.deliver(raw, id);
        },
        deliver(m: unknown, from: string) {
          t.onMessage?.(m, from);
        },
        peers: () => [...peers.keys()].filter((p) => p !== id),
        async leave() {
          peers.delete(id);
          for (const p of peers.values()) p.onPeerLeave?.(id);
        },
      };
      for (const p of peers.values()) p.onPeerJoin?.(id);
      peers.set(id, t);
      return t;
    };
    return { make };
  }
  const prof = (name: string) => ({ name, tag: { title: 'Rookie', color: '#ff8a1e', emblem: 'chevron' }, look: defaultLook(), loadout: ['rifle', 'pistolSd'] as WeaponId[] });

  it('a peer one version back is refused; the current version joins', () => {
    const h = hub();
    const host = new NetSession(h.make('H'), 'host', 'ABCDE', prof('Host'));
    const peer = h.make('P');
    peer.send({ t: 'hello', v: PROTOCOL_VERSION - 1, name: 'Old', tag: {}, look: {} }, 'H');
    expect(host.players.has('P')).toBe(false);
    peer.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'New', tag: {}, look: {} }, 'H');
    expect(host.players.has('P')).toBe(true);
  });
});
