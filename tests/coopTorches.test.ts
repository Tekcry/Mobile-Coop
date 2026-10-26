import { describe, expect, it, vi } from 'vitest';
import { AL_MAX, AL_SEIZED, AL_TORCH, packAlert, parseMessage, type EnemyState } from '../src/net/protocol';
import { TorchMirror, type TorchHolder } from '../src/net/torchMirror';
import { LightRegistry } from '../src/world/lights';
import { LightField } from '../src/world/lightField';
import { addTorchSlots, beamReach, FLASHLIGHTS, placeTorch, TORCH, type BeamHit } from '../src/world/torches';
import { EnemyManager } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { ENEMIES, type EnemyKind } from '../src/ai/enemyDefs';
import type { Enemy } from '../src/ai/enemy';
import type { Scene } from '../src/core/babylon';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (coop-torches) The guards' flashlights on the co-op wire: the torch bit in the snapshot's enemy `al`, the client's
// TorchMirror, and light parity between a torch built the host's way (EnemyManager + Enemy.placeTorch) and the
// client's way (wire state -> TorchMirror).

/** A dark registry with the world's torch slots. */
function darkRegistry(): LightRegistry {
  const reg = new LightRegistry();
  reg.ambient = 0.2;
  addTorchSlots(reg);
  return reg;
}

/** A wall 6 m from wherever a ray starts (the same stand-in geometry on both pages). */
const WALL = 6;
const hitXYZ: BeamHit = (ax, ay, az, bx, by, bz) => Math.min(WALL, Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2 + (bz - az) ** 2));

describe('coop-torches: the wire', () => {
  it('packAlert keeps the level and the seized bit and adds the torch bit', () => {
    expect(AL_SEIZED).toBe(4);
    expect(AL_TORCH).toBe(8);
    for (let lvl = 0; lvl < 4; lvl++) {
      for (const seized of [false, true]) {
        for (const torch of [false, true]) {
          const al = packAlert(lvl, seized, torch);
          expect(al & 3).toBe(lvl);
          expect((al & AL_SEIZED) !== 0).toBe(seized);
          expect((al & AL_TORCH) !== 0).toBe(torch);
        }
      }
    }
    // without a torch the wire value is what it was before (0-7); a lit guard is 8-11, or 12-15 seized: at most one
    // JSON byte more
    expect(packAlert(3, true, false)).toBe(7);
    expect(packAlert(0, false, true)).toBe(8);
    expect(packAlert(3, false, true)).toBe(11);
    expect(packAlert(3, true, true)).toBe(15);
  });

  it('a snapshot round-trips several guards with their torches on and off', () => {
    const mix: [number, boolean, boolean][] = [
      [0, false, false],
      [1, false, true],
      [2, false, true],
      [3, false, false],
      [2, true, true],
      [3, true, false],
      [1, false, false],
      [2, false, true],
    ];
    const enemies: EnemyState[] = mix.map(([lvl, seized, torch], i) => ({ id: `e${i}`, k: 'grunt', x: i, y: 0, z: -i, yaw: i * 0.3, st: i % 3, hp: 1, al: packAlert(lvl, seized, torch) }));
    const raw = JSON.parse(JSON.stringify({ t: 'snap', time: 5, players: [], enemies, obj: '', info: '', pk: 0 }));
    const m = parseMessage(raw);
    expect(m?.t).toBe('snap');
    const got = (m as Extract<typeof m, { t: 'snap' }>).enemies;
    expect(got.length).toBe(mix.length);
    got.forEach((e, i) => {
      const [lvl, seized, torch] = mix[i]!;
      expect(e.al & 3).toBe(lvl);
      expect((e.al & AL_SEIZED) !== 0).toBe(seized);
      expect((e.al & AL_TORCH) !== 0).toBe(torch);
      expect(e.st).toBe(i % 3);
    });
  });

  it('a bad al is clamped into the al bits (protocol 41: S9 and the A126 carry; G6n: the look seed), never past them', () => {
    const m = parseMessage({ t: 'snap', time: 1, players: [], enemies: [{ id: 'e1', k: 'grunt', x: 0, y: 0, z: 0, yaw: 0, st: 0, hp: 1, al: AL_MAX + 488 }, { id: 'e2', k: 'grunt', x: 0, y: 0, z: 0, yaw: 0, st: 0, hp: 1, al: -3 }], obj: '', info: '' });
    const es = (m as Extract<typeof m, { t: 'snap' }>).enemies;
    expect(es[0]!.al).toBe(AL_MAX);
    expect(es[1]!.al).toBe(0);
  });
});

/** A host guard: the real Enemy class's torch rule and placement on a stand-in (no meshes). */
async function hostGuard(kind: EnemyKind, x: number, y: number, z: number, yaw: number, crouch: number): Promise<Enemy> {
  const { Enemy: EnemyClass } = await import('../src/ai/enemy');
  return Object.assign(Object.create(EnemyClass.prototype) as Enemy, { id: `${kind}-${String(x).replace('.', '_')}`, health: { alive: true }, def: ENEMIES[kind], aware: { level: 'searching' }, los: false, pos: { x, y, z }, yaw, crouch });
}

/** The host side: an EnemyManager over a dark registry, the beam stopped by the stand-in wall. */
function hostManager(reg: LightRegistry): EnemyManager {
  const world = { level: { lights: reg, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] }, lightField: { levelAt: () => 0 } };
  const ballistics = { hitDistance: (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => hitXYZ(a.x, a.y, a.z, b.x, b.y, b.z) };
  return new EnemyManager({} as Scene, world as unknown as World, { walk: new Uint8Array(4) } as unknown as NavGrid, {} as DamageRegistry, ballistics as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
}

/** The host's wire state for a guard (as `CoopHost.snapshot` writes it), through JSON and `parseMessage`. */
function wire(em: EnemyManager, e: Enemy): EnemyState {
  const st = e.crouchBlend > 0.5 ? 2 : 0;
  const s: EnemyState = { id: e.id, k: e.def.kind, x: e.pos.x, y: e.pos.y, z: e.pos.z, yaw: e.yaw, st, hp: 1, al: packAlert(2, false, em.hasTorch(e)) };
  const m = parseMessage(JSON.parse(JSON.stringify({ t: 'snap', time: 1, players: [], enemies: [s], obj: '', info: '' })));
  return (m as Extract<typeof m, { t: 'snap' }>).enemies[0]!;
}

/** The client's guard as `EnemyPuppet` exposes it, from a wire state. */
function holder(s: EnemyState): TorchHolder {
  return { id: s.id, torch: (s.al & AL_TORCH) !== 0, torchCrouch: s.st === 2, pos: { x: s.x, y: s.y, z: s.z }, yaw: s.yaw, def: ENEMIES[s.k] };
}

describe('coop-torches: light parity (host torch vs client torch)', () => {
  it('the world gives a dark map FLASHLIGHTS slots with the torch values; a lit map none', () => {
    const reg = darkRegistry();
    const ts = reg.lights.filter((l) => l.kind === 'flashlight');
    expect(ts.length).toBe(FLASHLIGHTS);
    for (const l of ts) {
      expect(l.on).toBe(false);
      expect(l.radius).toBe(TORCH.radius);
      expect(l.intensity).toBe(TORCH.intensity);
      expect(l.cone!.cosOuter).toBeCloseTo(Math.cos(TORCH.outer), 12);
    }
    const lit = new LightRegistry();
    lit.ambient = 0.7;
    addTorchSlots(lit);
    expect(lit.lights.length).toBe(0);
  });

  it('a point receives the same light from the host torch and the client torch (standing, crouched, a big guard)', async () => {
    const hostReg = darkRegistry();
    const clientReg = darkRegistry();
    const em = hostManager(hostReg);
    const guards = [await hostGuard('grunt', 3.25, 0.2, -4.5, 0.7, 0), await hostGuard('heavy', -6, 0, 2, -2.4, 1), await hostGuard('runner', 10, 1.5, 10, 3.9, 0.8)];
    em.enemies.push(...guards);
    (em as unknown as { updateTorches(): void }).updateTorches();
    expect(em.torchesOn).toBe(3);
    // the client: the wire states, then the mirror
    const mirror = new TorchMirror(clientReg, hitXYZ);
    const hs = guards.map((g) => holder(wire(em, g)));
    expect(hs.every((h) => h.torch)).toBe(true);
    mirror.update(hs);
    const hostField = new LightField(null, hostReg);
    const clientField = new LightField(null, clientReg);
    for (const g of guards) {
      const hl = hostReg.lights.find((l) => l.kind === 'flashlight' && l.on && Math.abs(l.x - g.pos.x) < 1 && Math.abs(l.z - g.pos.z) < 1)!;
      const cl = mirror.slotOf(g.id)!;
      expect(cl).not.toBeNull();
      // the same light: position, aim, cone, range, level, colour, reach
      for (const k of ['x', 'y', 'z', 'radius', 'intensity', 'on', 'reach'] as const) expect(cl[k]).toBe(hl[k]);
      expect(cl.cone).toEqual(hl.cone);
      expect(cl.color).toEqual(hl.color);
      // and the same light on points around and in front of him (the meter's and perception's function)
      const yaw = g.yaw;
      for (let d = 0.5; d <= 12; d += 1.5) {
        for (const side of [-1.5, 0, 1.5]) {
          for (const h of [0.3, 1.0, 1.6]) {
            const x = g.pos.x + Math.sin(yaw) * d + Math.cos(yaw) * side;
            const z = g.pos.z + Math.cos(yaw) * d - Math.sin(yaw) * side;
            const y = g.pos.y + h;
            expect(clientField.totalAt(x, y, z)).toBe(hostField.totalAt(x, y, z));
            expect(clientField.dynamicAt(x, y, z)).toBe(hostField.dynamicAt(x, y, z));
          }
        }
      }
      // a point in his beam is lit by it
      const ax = g.pos.x + Math.sin(yaw) * 3;
      const az = g.pos.z + Math.cos(yaw) * 3;
      expect(clientField.dynamicAt(ax, g.pos.y + 0.6, az)).toBeGreaterThan(0.05);
    }
    // the reach stops at the stand-in wall on both pages
    expect(mirror.slotOf(guards[0]!.id)!.reach).toBeCloseTo(WALL + 0.4, 9);
  });

  it('a torch the host switches off goes off on the client, and the field agrees', async () => {
    const hostReg = darkRegistry();
    const clientReg = darkRegistry();
    const em = hostManager(hostReg);
    const g = await hostGuard('grunt', 0, 0, 0, 0, 0);
    em.enemies.push(g);
    const mirror = new TorchMirror(clientReg, hitXYZ);
    (em as unknown as { updateTorches(): void }).updateTorches();
    mirror.update([holder(wire(em, g))]);
    expect(mirror.slotOf(g.id)?.on).toBe(true);
    // calm again: the host's rule lets go, the next snapshot carries no bit
    (g as unknown as { aware: { level: string } }).aware.level = 'unaware';
    (em as unknown as { updateTorches(): void }).updateTorches();
    expect(em.hasTorch(g)).toBe(false);
    mirror.update([holder(wire(em, g))]);
    expect(mirror.slotOf(g.id)).toBeNull();
    expect(clientReg.lights.every((l) => !l.on)).toBe(true);
    const p = [0, 1, 3] as const;
    expect(new LightField(null, clientReg).totalAt(...p)).toBe(new LightField(null, hostReg).totalAt(...p));
  });

  it('the test hook forces a guard\'s torch on and off; a dog still carries none', async () => {
    const reg = darkRegistry();
    const em = hostManager(reg);
    const g = await hostGuard('grunt', 0, 0, 0, 0, 0);
    const dog = await hostGuard('dog', 4, 0, 0, 0, 0);
    (g as unknown as { aware: { level: string } }).aware.level = 'unaware';
    em.enemies.push(g, dog);
    g.torchOverride = true;
    dog.torchOverride = true;
    (em as unknown as { updateTorches(): void }).updateTorches();
    expect(em.hasTorch(g)).toBe(true);
    expect(em.hasTorch(dog)).toBe(false);
    g.torchOverride = false;
    (em as unknown as { updateTorches(): void }).updateTorches();
    expect(em.hasTorch(g)).toBe(false);
  });
});

describe('coop-torches: TorchMirror', () => {
  const mk = (id: string, torch = true): TorchHolder & { torch: boolean } => ({ id, torch, torchCrouch: false, pos: { x: 1, y: 0, z: 2 }, yaw: 0.5, def: { scale: 1 } });

  it('a guard missing from the snapshot loses his torch; back in it, the torch comes back from that snapshot', () => {
    const reg = darkRegistry();
    const m = new TorchMirror(reg, hitXYZ);
    const a = mk('a');
    m.update([a]);
    const lit = m.slotOf('a')!;
    expect(lit.on).toBe(true);
    // stale (the puppet reads torch false) or dropped from the list: off at once
    a.torch = false;
    m.update([a]);
    expect(m.slotOf('a')).toBeNull();
    expect(lit.on).toBe(false);
    a.torch = true;
    m.update([]);
    expect(m.slotOf('a')).toBeNull();
    // listed again with the bit: on, placed where he is shown
    m.update([a]);
    const back = m.slotOf('a')!;
    expect(back.on).toBe(true);
    const want = { ...back, cone: { ...back.cone! } };
    placeTorch(want, 1, 0, 2, 0.5, false, 1);
    expect(back.x).toBe(want.x);
    expect(back.y).toBe(want.y);
    expect(back.z).toBe(want.z);
    expect(back.cone).toEqual(want.cone);
    expect(back.reach).toBe(beamReach(back, hitXYZ));
  });

  it('never lights more than the world\'s slots, as the host never does; a freed slot goes to the next guard', () => {
    const reg = darkRegistry();
    const m = new TorchMirror(reg, hitXYZ);
    const gs = ['a', 'b', 'c', 'd', 'e'].map((id) => mk(id));
    m.update(gs);
    expect(reg.lights.filter((l) => l.on).length).toBe(FLASHLIGHTS);
    expect(m.slotOf('e')).toBeNull();
    gs[1]!.torch = false;
    m.update(gs);
    expect(m.slotOf('b')).toBeNull();
    expect(m.slotOf('e')?.on).toBe(true);
    m.clear();
    expect(reg.lights.every((l) => !l.on)).toBe(true);
  });

  it('(piano SO3) a map with 8 or 16 slots: the client builds the same count and lights that many', () => {
    for (const n of [8, 16]) {
      const reg = new LightRegistry();
      reg.ambient = 0.2;
      addTorchSlots(reg, n);
      const m = new TorchMirror(reg, hitXYZ);
      expect(m.slots.length).toBe(n);
      const gs = Array.from({ length: n + 2 }, (_, i) => mk(`g${i}`));
      m.update(gs);
      expect(reg.lights.filter((l) => l.on).length).toBe(n);
      expect(m.slotOf(`g${n - 1}`)?.on).toBe(true);
      expect(m.slotOf(`g${n}`)).toBeNull();
    }
  });

  it('a lit map has no slots: nothing to mirror', () => {
    const reg = new LightRegistry();
    reg.ambient = 0.8;
    addTorchSlots(reg);
    const m = new TorchMirror(reg, hitXYZ);
    m.update([mk('a')]);
    expect(m.slotOf('a')).toBeNull();
  });

  it('keeps its slot arrays and casts the beam rays round robin (not every slot every frame)', () => {
    const reg = darkRegistry();
    const hit = vi.fn(hitXYZ);
    const m = new TorchMirror(reg, hit);
    const gs = [mk('a'), mk('b')];
    m.update(gs);
    const slots = m.slots;
    const owner = m.owner;
    for (let i = 0; i < 20; i++) m.update(gs);
    expect(m.slots).toBe(slots);
    expect(m.owner).toBe(owner);
    // the beam's reach: once per new torch, then one slot a frame round robin (5 rays each)
    expect(hit.mock.calls.length).toBeLessThanOrEqual((2 + 21) * 5);
  });
});

describe('coop-torches: the puppet reads the bit', () => {
  it('torch: the bit while alive and in the snapshot; torchCrouch: st 2', async () => {
    const { EnemyPuppet } = await import('../src/net/enemyPuppet');
    const p = Object.assign(Object.create(EnemyPuppet.prototype), { torchBit: true, dead: false, stale: 0, st: 2 }) as InstanceType<typeof EnemyPuppet>;
    expect(p.torch).toBe(true);
    expect(p.torchCrouch).toBe(true);
    (p as unknown as { stale: number }).stale = 1 / 15;
    expect(p.torch).toBe(false);
    (p as unknown as { stale: number }).stale = 0;
    (p as unknown as { dead: boolean }).dead = true;
    expect(p.torch).toBe(false);
    (p as unknown as { st: number }).st = 1;
    expect(p.torchCrouch).toBe(false);
  });
});
