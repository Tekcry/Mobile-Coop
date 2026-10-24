// (sector-redesign perf, fix round) The guard freeze's see-through rule: its occlusion rays step past a door leaf drawn
// not shut, an unbroken breakable glass pane and a roof sheet (all G.STATIC, all drawn see-through), and stop on a
// solid wall. Real Havok rays (NullEngine) through the same `Ballistics.cast` the game wires. Also: a frozen guard
// dropped from the list or disposed (section unload, restart) is released; a camera cut tests at most
// `TESTS_PER_EVAL` guards per evaluation.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { Enemy } from '../src/ai/enemy';
import { Doors, leafSeeThrough, type DoorState } from '../src/world/doors';
import { inSheet, type SheetPiece } from '../src/world/roofSheets';
import { FREEZE_TEST_RAYS } from '../src/game/sectorGuardFreeze';

async function physicsScene() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const B = await import('../src/core/babylon');
  const HavokPhysics = (await import('@babylonjs/havok')).default;
  const wasm = readFileSync(path.resolve(__dirname, '../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm'));
  const hk = await HavokPhysics({ wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) } as never);
  const scene = new B.Scene(new NullEngine());
  scene.enablePhysics(new B.Vector3(0, -9.8, 0), new B.HavokPlugin(true, hk));
  return { B, scene };
}

function door(body: unknown): { ds: Doors; d: DoorState } {
  const ds = Object.create(Doors.prototype) as Doors;
  const d = { open: 0, target: 0, rate: 0, cracked: false, ajar: 0, held: false, cx: 0, cz: 0, body, node: null, index: 0 } as unknown as DoorState;
  Object.assign(ds, { list: [d], viewClear: new Uint8Array(0), viewV: 0 });
  return { ds, d };
}

const SHEET: SheetPiece = { x0: -2, x1: 2, z0: 6, z1: 8, y: 6.15, y0: 6.03, y1: 6.28 };

describe('sector-redesign perf fix: see-through rules (pure)', () => {
  it('a leaf is see-through cracked, ajar or swung; shut it is not', () => {
    expect(leafSeeThrough({ cracked: false, ajar: 0, open: 0 })).toBe(false);
    expect(leafSeeThrough({ cracked: true, ajar: 0, open: 0 })).toBe(true);
    expect(leafSeeThrough({ cracked: false, ajar: 0.05, open: 0 })).toBe(true);
    expect(leafSeeThrough({ cracked: false, ajar: 0, open: 0.3 })).toBe(true);
    const body = {};
    const { ds, d } = door(body);
    expect(ds.seeThrough(body)).toBe(false);
    ds.crack(Object.assign(d, { anchor: { locked: false } }), true);
    expect(ds.seeThrough(body)).toBe(true);
    expect(ds.seeThrough({})).toBe(false);
  });

  it('a point on a roof sheet box is see-through; off it is not', () => {
    expect(inSheet([SHEET], 0, 6.03, 7)).toBe(true);
    expect(inSheet([SHEET], 0, 6.28, 7)).toBe(true);
    expect(inSheet([SHEET], 0, 5.5, 7)).toBe(false);
    expect(inSheet([SHEET], 3, 6.1, 7)).toBe(false);
    expect(inSheet([], 0, 6.1, 7)).toBe(false);
  });
});

describe('sector-redesign perf fix: seeThroughRay (Havok)', () => {
  it('steps past a cracked door, a glass pane and a roof sheet; a shut door and a solid wall still occlude', async () => {
    const { B, scene } = await physicsScene();
    const { G } = await import('../src/physics/groups');
    const { Ballistics } = await import('../src/weapons/ballistics');
    const { Breakables } = await import('../src/world/breakables');
    const { seeThroughRay } = await import('../src/game/sectorGuardFreezeView');
    const box = (name: string, c: [number, number, number], s: [number, number, number]) => {
      const n = new B.TransformNode(name, scene);
      n.position.set(c[0], c[1], c[2]);
      const body = new B.PhysicsBody(n, B.PhysicsMotionType.STATIC, false, scene);
      const shape = new B.PhysicsShapeBox(B.Vector3.Zero(), B.Quaternion.Identity(), new B.Vector3(s[0], s[1], s[2]), scene);
      shape.filterMembershipMask = G.STATIC;
      shape.filterCollideMask = 0xffffffff & ~G.STATIC;
      body.shape = shape;
      return body;
    };
    // x = -10: a door leaf at z 5; x = 0: a breakable pane at z 5; x = 10: a wall at z 5; x = 20: a roof sheet box
    const leaf = box('leaf', [-10, 1.05, 5], [1, 2.1, 0.05]);
    box('wall', [10, 1.5, 5], [2, 3, 0.2]);
    box('sheet', [20, 6.15, 7], [4, 0.25, 2]);
    const anchors = { windows: [{ kind: 'window', id: 'w', c: { x: 0, y: 1.5, z: 5 }, w: 1.2, h: 1, yaw: 0, sillHeight: 1, breakable: true, open: false }], ducts: [] };
    const br = new Breakables(scene, anchors as never);
    const { ds, d } = door(leaf);
    Object.assign(d, { anchor: { locked: false } });
    const sheets: SheetPiece[] = [{ x0: 18, x1: 22, z0: 6, z1: 8, y: 6.15, y0: 6.03, y1: 6.28 }];
    const bal = new Ballistics(scene, {} as never, {} as never, {} as never);
    const see = (body: unknown, x: number, y: number, z: number): boolean => ds.seeThrough(body) || br.seeThrough(body) || inSheet(sheets, x, y, z);
    const ray = seeThroughRay((a, b) => bal.cast(a, b, G.STATIC), see);
    const len = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => ray(new B.Vector3(ax, ay, az), new B.Vector3(bx, by, bz));
    // shut door: stops at the leaf (~4.975 m); cracked: through to the guard (10 m)
    expect(len(-10, 1.5, 0, -10, 1.5, 10)).toBeLessThan(5.1);
    ds.crack(d, true);
    expect(len(-10, 1.5, 0, -10, 1.5, 10)).toBeCloseTo(10, 3);
    // the pane: through while unbroken (and after it breaks, its body is gone)
    expect(len(0, 1.5, 0, 0, 1.5, 10)).toBeCloseTo(10, 3);
    // the solid wall occludes
    expect(len(10, 1.5, 0, 10, 1.5, 10)).toBeLessThan(5);
    // the roof sheet: from above, down through it to a guard on the floor
    expect(len(20, 10, 7, 20, 1.5, 7)).toBeCloseTo(8.5, 3);
    // gameplay's plain static ray still stops on the pane and the cracked leaf (masks unchanged)
    expect(bal.hitDistance(new B.Vector3(0, 1.5, 0), new B.Vector3(0, 1.5, 10), G.STATIC)).toBeLessThan(5.1);
    expect(bal.hitDistance(new B.Vector3(-10, 1.5, 0), new B.Vector3(-10, 1.5, 10), G.STATIC)).toBeLessThan(5.1);
    scene.dispose();
  });

  it('the freeze: a guard behind a shut door is frozen; the door cracked, he is drawn at the next evaluation (frzpol view epoch)', async () => {
    const { B, scene } = await physicsScene();
    const { G } = await import('../src/physics/groups');
    const { Ballistics } = await import('../src/weapons/ballistics');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { ENEMIES } = await import('../src/ai/enemyDefs');
    const { SectorGuardFreeze, seeThroughRay } = await import('../src/game/sectorGuardFreezeView');
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const cam = new B.FreeCamera('cam', new B.Vector3(0, 1.6, 0), scene);
    cam.setTarget(new B.Vector3(0, 1.6, 10));
    // a wall with a doorway at z = 5 (the leaf fills it), the guard 6 m beyond, straight ahead
    const box = (name: string, c: [number, number, number], s: [number, number, number]) => {
      const n = new B.TransformNode(name, scene);
      n.position.set(c[0], c[1], c[2]);
      const body = new B.PhysicsBody(n, B.PhysicsMotionType.STATIC, false, scene);
      const shape = new B.PhysicsShapeBox(B.Vector3.Zero(), B.Quaternion.Identity(), new B.Vector3(s[0], s[1], s[2]), scene);
      shape.filterMembershipMask = G.STATIC;
      shape.filterCollideMask = 0xffffffff & ~G.STATIC;
      body.shape = shape;
      return body;
    };
    box('wallL', [-20.5, 2, 5], [40, 4, 0.2]);
    box('wallR', [20.5, 2, 5], [40, 4, 0.2]);
    box('lintel', [0, 3.05, 5], [1, 1.9, 0.2]);
    const leaf = box('leaf', [0, 1.05, 5], [1, 2.1, 0.05]);
    const { ds, d } = door(leaf);
    Object.assign(d, { anchor: { locked: false } });
    const bal = new Ballistics(scene, {} as never, {} as never, {} as never);
    const lib = new PartLibrary(scene);
    const def = ENEMIES.grunt;
    const rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, `enemy-${sl}`), def.look, def.height, 'g', { build: def.build, armor: def.plated, merge: true });
    rig.root.position.set(0, 0, 11);
    const e = { alive: true, taken: false, dog: null, def, bodyRig: rig, thawPose: vi.fn() } as unknown as Enemy;
    const f = new SectorGuardFreeze(scene, { enemies: [e] }, seeThroughRay((a, b) => bal.cast(a, b, G.STATIC), (body) => ds.seeThrough(body)), () => ds.viewVersion());
    scene.render();
    expect(rig.root.isEnabled(false)).toBe(false);
    ds.crack(d, true);
    scene.render();
    expect(rig.root.isEnabled(false)).toBe(true);
    f.dispose();
    scene.dispose();
  });
});

async function freezeScene() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const B = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { ENEMIES } = await import('../src/ai/enemyDefs');
  const V = await import('../src/game/sectorGuardFreezeView');
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  const scene = new B.Scene(new NullEngine());
  const cam = new B.FreeCamera('cam', new B.Vector3(0, 1.6, 0), scene);
  cam.setTarget(new B.Vector3(0, 1.6, 10));
  const lib = new PartLibrary(scene);
  const def = ENEMIES.grunt;
  const guard = (name: string, x: number, z: number) => {
    const rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, `enemy-${sl}`), def.look, def.height, name, { build: def.build, armor: def.plated, merge: true });
    rig.root.position.set(x, 0, z);
    return { alive: true, taken: false, dog: null, def, bodyRig: rig, thawPose: vi.fn() } as unknown as Enemy;
  };
  // a wall across z = 10, 3 m high (rays stop on it)
  let rays = 0;
  const ray = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number => {
    rays++;
    const full = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
    if ((a.z - 10) * (b.z - 10) >= 0) return full;
    const t = (10 - a.z) / (b.z - a.z);
    return a.y + (b.y - a.y) * t < 3 ? full * t : full;
  };
  return { B, V, scene, cam, guard, ray, rays: () => rays };
}

describe('sector-redesign perf fix: release on unload, ray budget', () => {
  it('a frozen guard removed from the list (section unload) or disposed (restart) is released', async () => {
    const { V, scene, guard, ray } = await freezeScene();
    const a = guard('a', 0, 15);
    const b = guard('b', 1, 15);
    const mgr = { enemies: [a, b] };
    const f = new V.SectorGuardFreeze(scene, mgr, ray);
    for (let k = 0; k < 4; k++) scene.render();
    expect(a.bodyRig.root.isEnabled(false)).toBe(false);
    expect(b.bodyRig.root.isEnabled(false)).toBe(false);
    const frozen = (f as unknown as { frozen: Enemy[] }).frozen;
    expect(frozen.length).toBe(2);
    // a leaves the list alive (unload); b is disposed in place (Enemy.dispose keeps `alive`)
    mgr.enemies = [b];
    b.bodyRig.root.dispose();
    scene.render();
    expect(frozen.length).toBe(0);
    expect(a.bodyRig.root.isEnabled(false)).toBe(true);
    f.dispose();
  });

  it('a camera cut tests at most TESTS_PER_EVAL guards per evaluation; the rest are drawn until their test', async () => {
    const { B, V, scene, cam, guard, ray, rays } = await freezeScene();
    const list: Enemy[] = [];
    for (let i = 0; i < 20; i++) list.push(guard(`g${i}`, -5 + (i % 10), 14 + Math.floor(i / 10)));
    const f = new V.SectorGuardFreeze(scene, { enemies: list }, ray);
    for (let k = 0; k < 8; k++) scene.render();
    expect(f.count).toBe(20);
    cam.position.set(0.5, 1.6, -3);
    cam.setTarget(new B.Vector3(0.5, 1.6, 10));
    const r0 = rays();
    scene.render();
    expect(f.rays).toBeLessThanOrEqual(V.TESTS_PER_EVAL * FREEZE_TEST_RAYS);
    expect(rays() - r0).toBeLessThanOrEqual(V.TESTS_PER_EVAL * FREEZE_TEST_RAYS);
    expect(f.count).toBeLessThan(20);
    // within a few evaluations every guard is tested and frozen again
    for (let k = 0; k < 3; k++) scene.render();
    expect(f.count).toBe(20);
    f.dispose();
  });
});

describe('sector-redesign artnext C6: the rays counter counts the see-through recasts', () => {
  it('a pane before the wall: each sample ray is cast twice, and `rays` says so', async () => {
    const { B, V, scene, guard } = await freezeScene();
    // unbounded planes: a see-through pane at z = 5, a solid wall at z = 10 (rays toward +z)
    const hit = { hasHit: false, body: null as unknown, hitPoint: new B.Vector3() };
    let pane = true;
    const cast = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => {
      hit.hasHit = false;
      for (const [z, body] of [[5, 'pane'], [10, 'wall']] as const) {
        if (z === 5 && !pane) continue;
        if (a.z < z && b.z >= z) {
          const t = (z - a.z) / (b.z - a.z);
          hit.hasHit = true;
          hit.body = body;
          hit.hitPoint.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, z);
          break;
        }
      }
      return hit;
    };
    const ray = V.seeThroughRay(cast, (body) => body === 'pane');
    const e = guard('g', 0, 15);
    const f = new V.SectorGuardFreeze(scene, { enemies: [e] }, ray);
    scene.render();
    expect(e.bodyRig.root.isEnabled(false)).toBe(false);
    // 5 body points (head, chest, two sides, knee), all hidden: 5 primary casts + 5 recasts past the pane
    expect(ray.recasts).toBe(5);
    expect(f.rays).toBe(10);
    f.dispose();
    // no pane: primaries only
    pane = false;
    const f2 = new V.SectorGuardFreeze(scene, { enemies: [e] }, ray);
    scene.render();
    expect(ray.recasts).toBe(5);
    expect(f2.rays).toBe(5);
    f2.dispose();
  });
});
