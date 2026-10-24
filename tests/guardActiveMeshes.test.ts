/**
 * (guard-models perf S13) Active meshes per on-screen guard (NullEngine, no GPU): a host `Enemy` (stubbed hitboxes:
 * physics only) built and framed as the game does, the camera on him, every mesh Babylon makes active in the camera
 * pass counted by class. Flag off (the S1 merged body) and on (the figure), with his held gun, helmet and armour.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AbstractMesh, Matrix, Mesh, Scene } from '../src/core/babylon';
import type { GuardManifest } from '../src/operators/guards/gearMask';
import type { GuardAsset } from '../src/operators/guards/guardAssets';
import type * as GuardAssets from '../src/operators/guards/guardAssets';
import type { EnemyKind } from '../src/ai/enemyDefs';
import { guardGlb, type GuardTri } from './helpers/guardGlb';

vi.mock('../src/ai/hitboxes', () => ({ Hitboxes: class { dispose(): void {} } }));
const H = vi.hoisted(() => ({ assets: new Map<string, unknown>() }));
vi.mock('../src/operators/guards/guardAssets', async (orig) => {
  const actual = await orig<typeof GuardAssets>();
  return { ...actual, guardAsset: (base: string) => (H.assets.get(base) as GuardAsset | undefined) ?? actual.guardAsset(base as never), shieldUrls: () => null };
});

const PIECES = ['average', 'helmet_std', 'vest_soft', 'radio', 'pouch_belt', 'holster_thigh', 'flashlight_mount', 'uniform'];
const tris = (pieces: readonly string[]): GuardTri[] => pieces.map((_, i) => ({ piece: i, tint: i % 6, joint: i === 0 ? 'wrL' : 'chest', at: [0.01 * i, 1.2 + 0.01 * i, 0.1] }));
const manifest = (base: 'average' | 'broad'): GuardManifest => ({
  id: `guard-${base}`, base, urls: ['', `/${base}-lod0.glb`, `/${base}-lod1.glb`, `/${base}-lod2.glb`], pieces: PIECES, tintSlots: 6, refHeight: 1.77,
});

beforeEach(() => {
  H.assets.set('average', { manifest: manifest('average'), standIn: false, problems: [] });
  H.assets.set('broad', { manifest: manifest('broad'), standIn: false, problems: [] });
  const bin: Record<string, ArrayBuffer> = {};
  for (const b of ['average', 'broad']) for (const l of ['lod0', 'lod1', 'lod2']) bin[`/${b}-${l}.glb`] = guardGlb(tris(PIECES));
  vi.stubGlobal('fetch', async (url: string) => (bin[url] ? new Response(bin[url]!.slice(0)) : new Response(null, { status: 404 })));
});

afterEach(async () => {
  vi.unstubAllGlobals();
  const { flags } = await import('../src/core/flags');
  flags.guardModels = false;
  flags.guardMerge = true;
});

/** The class of an active mesh by its name (as guard-cap's tally, plus the merged gear). */
function classOf(name: string): string {
  if (/-smooth(-lod)?$/.test(name)) return 'body';
  if (/-lod\d-\d+$/.test(name)) return 'figure';
  if (/-gun$/.test(name) || /^wpn-/.test(name)) return 'gun';
  if (/helmet/.test(name)) return 'helmet';
  if (/armour/.test(name)) return 'armour';
  if (/shield/.test(name)) return 'shield';
  return 'other';
}

async function setup() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const B = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { Enemy } = await import('../src/ai/enemy');
  const { ENEMIES, DIFFICULTY } = await import('../src/ai/enemyDefs');
  const scene: Scene = new B.Scene(new NullEngine());
  const cam = new B.FreeCamera('cam', new B.Vector3(0, 1.2, 6), scene);
  cam.setTarget(new B.Vector3(0, 1, 0));
  const parts = new PartLibrary(scene);
  const casters: AbstractMesh[] = [];
  const world = { parts, map: { id: 'testmap', theme: { faction: 'urban' } }, addShadowCaster: (m: AbstractMesh) => casters.push(m) };
  const ctx = {
    scene,
    world,
    diff: DIFFICULTY.normal,
    nav: { heightAt: (_x: number, _z: number, y: number) => y },
    registry: { removeTarget: () => {} },
    players: () => [],
    enemies: () => [],
    releaseCover: () => {},
  };
  scene.render();
  const level = new Set<AbstractMesh>();
  const am0 = scene.getActiveMeshes();
  for (let i = 0; i < am0.length; i++) level.add(am0.data[i]!);
  /** One guard of `kind` with gear, framed and rendered; his active meshes by class. */
  const guard = async (kind: EnemyKind, gear = true) => {
    const e = new Enemy(ctx as never, ENEMIES[kind], new B.Vector3(0, 0, 0), 0);
    e.setGear({ helmet: gear, armour: gear });
    const gb = (e as unknown as { gbody: { shown: boolean } | null }).gbody;
    if (gb) await vi.waitFor(() => expect(gb.shown).toBe(true));
    for (let i = 0; i < 4; i++) {
      e.frame(1 / 60, 1);
      scene.render();
    }
    const am = scene.getActiveMeshes();
    const by: Record<string, number> = {};
    const names: string[] = [];
    for (let i = 0; i < am.length; i++) {
      const m = am.data[i]!;
      if (level.has(m)) continue;
      names.push(m.name);
      const c = classOf(m.name);
      by[c] = (by[c] ?? 0) + 1;
    }
    return { e, by, names, total: names.length };
  };
  return { B, scene, world, casters, guard, level };
}

type Mtx = Matrix;
type AnyMesh = Mesh;

/** World box [min x, y, z, max x, y, z] of local `pos`, each vertex under matrix `w(v)`. */
async function boxOf(pos: ArrayLike<number>, w: (v: number) => Mtx, out = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]): Promise<number[]> {
  const { Vector3 } = await import('../src/core/babylon');
  const t = new Vector3();
  for (let v = 0; v < pos.length / 3; v++) {
    Vector3.TransformCoordinatesFromFloatsToRef(pos[v * 3]!, pos[v * 3 + 1]!, pos[v * 3 + 2]!, w(v), t);
    out[0] = Math.min(out[0]!, t.x);
    out[1] = Math.min(out[1]!, t.y);
    out[2] = Math.min(out[2]!, t.z);
    out[3] = Math.max(out[3]!, t.x);
    out[4] = Math.max(out[4]!, t.y);
    out[5] = Math.max(out[5]!, t.z);
  }
  return out;
}

/** The union of instances' world boxes (their source's full or low LOD). */
async function partsBox(parts: readonly AbstractMesh[], low: boolean, lib: { low(m: AnyMesh): AnyMesh }): Promise<number[]> {
  const { VertexBuffer } = await import('../src/core/babylon');
  const out = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    p.computeWorldMatrix(true);
    const src = (p as unknown as { sourceMesh: AnyMesh }).sourceMesh;
    const m = low ? lib.low(src) : src;
    const w = p.getWorldMatrix();
    await boxOf(m.getVerticesData(VertexBuffer.PositionKind)!, () => w, out);
  }
  return out;
}

function near(a: number[], b: number[], tol = 0.001): void {
  for (let i = 0; i < 6; i++) expect([i, Math.abs(a[i]! - b[i]!) <= tol, a[i], b[i]]).toEqual([i, true, a[i], b[i]]);
}

const ENEMY_GUN = { body: '#2a2d31', grip: '#17191c', accent: '#3a3f45' };

describe('S13: active meshes per on-screen guard', () => {
  it('flag off (S1 body): a grunt with gun + helmet + armour <= 4 (7 before S13, 23 as measured before perfg); enforcer 5 (9)', async () => {
    const { guard, scene, level } = await setup();
    const g = await guard('grunt');
    console.info(`S13 count flag off grunt: ${g.total} ${JSON.stringify(g.by)} [${g.names.join(', ')}]`);
    expect(g.total).toBeLessThanOrEqual(4);
    expect(g.by).toEqual({ body: 1, gun: 1, helmet: 1, armour: 1 });
    // gear off: the merged armour hides by the caller's `isVisible` loop, the helmet as before
    g.e.setGear({ helmet: false, armour: false });
    scene.render();
    expect(scene.getActiveMeshes().length).toBe(level.size + 2);
    g.e.dispose();
    const g2 = await guard('enforcer');
    console.info(`S13 count flag off enforcer: ${g2.total} ${JSON.stringify(g2.by)} [${g2.names.join(', ')}]`);
    expect(g2.by).toEqual({ body: 1, gun: 1, helmet: 1, armour: 1, shield: 1 });
    g2.e.dispose();
  });

  it('flag on (figure): figure LOD + gun = 2 (his gear is figure pieces)', async () => {
    const { flags } = await import('../src/core/flags');
    flags.guardModels = true;
    const { guard } = await setup();
    const g = await guard('grunt');
    console.info(`S13 count flag on grunt: ${g.total} ${JSON.stringify(g.by)} [${g.names.join(', ')}]`);
    expect(g.total).toBeLessThanOrEqual(4);
    expect(g.by).toEqual({ figure: 1, gun: 1 });
  });

  it('before: the parts paths (guns before perfg, as measured in g8 / g8c; armour and shield before S13)', async () => {
    const { B, scene, world } = await setup();
    const { WeaponModel } = await import('../src/weapons/weaponModel');
    const { WEAPONS } = await import('../src/weapons/weaponDefs');
    const { ENEMIES } = await import('../src/ai/enemyDefs');
    const { buildArmourParts, buildShieldPart } = await import('../src/ai/gearParts');
    const { CharacterRig } = await import('../src/player/characterRig');
    const counts: Record<string, number> = {};
    for (const d of Object.values(ENEMIES)) {
      if (!d.gun || counts[d.gun] !== undefined) continue;
      const g = new WeaponModel(scene, world.parts, WEAPONS[d.gun], ENEMY_GUN, new B.TransformNode(`h-${d.gun}`, scene));
      counts[d.gun] = g.parts.length;
      g.dispose();
    }
    // a rig with no merged body (`?guardmerge=0`): the 4 armour instances and the 2 shield parts stay
    const { flags } = await import('../src/core/flags');
    flags.guardMerge = false;
    const rig = new CharacterRig(scene, (shape, hex, slot) => world.parts.instance(shape, hex, `enemy-${slot}`), ENEMIES.grunt.look, ENEMIES.grunt.height, 'nm', { merge: true });
    expect(rig.voxel).toBeNull();
    counts.armour = buildArmourParts(world as never, rig, '#444').length;
    const sh = buildShieldPart(world as never, rig.root, 1);
    counts.shield = 1 + sh.getChildMeshes().length;
    console.info(`S13 before (parts): ${JSON.stringify(counts)}`);
    expect(counts.rifle).toBe(18);
    expect(counts.armour).toBe(4);
    expect(counts.shield).toBe(2);
  });

  it('visual parity: merged armour, shield and gun bounds equal their parts\' union within 1 mm (full and low LOD)', async () => {
    const { B, scene, world } = await setup();
    const { flags } = await import('../src/core/flags');
    const { buildEnemyRig } = await import('../src/ai/enemyRig');
    const { buildArmourParts, buildShieldPart } = await import('../src/ai/gearParts');
    const { mergeGun } = await import('../src/ai/enemyGunMerge');
    const { WeaponModel } = await import('../src/weapons/weaponModel');
    const { WEAPONS } = await import('../src/weapons/weaponDefs');
    const { ENEMIES } = await import('../src/ai/enemyDefs');
    const lib = world.parts;
    const { rig } = buildEnemyRig(scene, world as never, ENEMIES.grunt, 'par');
    rig.root.position.set(1.5, 0.2, -2);
    rig.root.rotation.y = 0.7;
    rig.root.computeWorldMatrix(true);
    const body = rig.voxel!;
    expect(body).not.toBeNull();
    // the parts as S1 drew them (merge off for this call only), then the merged mesh on the same rig
    flags.guardMerge = false;
    const parts = buildArmourParts(world as never, rig, '#556070');
    flags.guardMerge = true;
    expect(parts.length).toBe(4);
    const want = [await partsBox(parts, false, lib), await partsBox(parts, true, lib)];
    for (const p of parts) p.dispose();
    const merged = buildArmourParts(world as never, rig, '#556070');
    expect(merged.length).toBe(1);
    const hi = merged[0] as AnyMesh;
    const lo = hi.getLODLevels()[0]!.mesh!;
    expect(hi.skeleton).toBe(body.skeleton);
    expect(lo.skeleton).toBe(body.skeleton);
    expect(hi.material).toBe(lib.skinMaterial);
    expect(lib.skinMaterial.isFrozen).toBe(true);
    for (const n of body.nodes) n.computeWorldMatrix(true);
    for (const [i, m] of [hi, lo].entries()) {
      const mi = m.getVerticesData(B.VertexBuffer.MatricesIndicesKind)!;
      near(await boxOf(m.getVerticesData(B.VertexBuffer.PositionKind)!, (v) => body.nodes[mi[v * 4]!]!.getWorldMatrix()), want[i]!);
    }
    // the shield and its visor
    flags.guardMerge = false;
    const sh0 = buildShieldPart(world as never, rig.root, 1.1);
    flags.guardMerge = true;
    const shParts = [sh0, ...sh0.getChildMeshes()];
    expect(shParts.length).toBe(2);
    const shWant = [await partsBox(shParts, false, lib), await partsBox(shParts, true, lib)];
    sh0.dispose();
    const sh = buildShieldPart(world as never, rig.root, 1.1);
    expect(sh.getChildMeshes().length).toBe(0);
    sh.computeWorldMatrix(true);
    for (const [i, m] of [sh.sourceMesh, sh.sourceMesh.getLODLevels()[0]!.mesh!].entries()) {
      near(await boxOf(m.getVerticesData(B.VertexBuffer.PositionKind)!, () => sh.getWorldMatrix()), shWant[i]!);
    }
    // the guns (perfg's merge; the bounds as S13 asks)
    for (const id of ['rifle', 'pistolSd'] as const) {
      const hand = new B.TransformNode(`hand-${id}`, scene);
      hand.position.set(0.4, 1.3, -0.2);
      hand.rotation.set(0.3, -0.8, 0.1);
      const g = new WeaponModel(scene, lib, WEAPONS[id], ENEMY_GUN, hand);
      const gWant = [await partsBox(g.parts, false, lib), await partsBox(g.parts, true, lib)];
      const inst = mergeGun(scene, g, `par-${id}`)!;
      inst.computeWorldMatrix(true);
      for (const [i, m] of [inst.sourceMesh, inst.sourceMesh.getLODLevels()[0]!.mesh!].entries()) {
        near(await boxOf(m.getVerticesData(B.VertexBuffer.PositionKind)!, () => inst.getWorldMatrix()), gWant[i]!);
      }
    }
  });

  it('shared geometry per look; nothing new per frame (no observer, skeleton, mesh or geometry); a ragdoll frees it with the body', async () => {
    const { scene, world, casters } = await setup();
    const { buildEnemyRig } = await import('../src/ai/enemyRig');
    const { buildArmourParts } = await import('../src/ai/gearParts');
    const { ENEMIES } = await import('../src/ai/enemyDefs');
    const a = buildEnemyRig(scene, world as never, ENEMIES.grunt, 'sa').rig;
    const b = buildEnemyRig(scene, world as never, ENEMIES.grunt, 'sb').rig;
    const obs = scene.onBeforeRenderObservable.observers.length;
    const skels = scene.skeletons.length;
    const ma = buildArmourParts(world as never, a, '#445566')[0] as AnyMesh;
    const mb = buildArmourParts(world as never, b, '#445566')[0] as AnyMesh;
    expect(ma.geometry).toBe(mb.geometry);
    expect(ma.skeleton).not.toBe(mb.skeleton);
    expect(casters).toContain(ma);
    expect(casters).toContain(ma.getLODLevels()[0]!.mesh);
    expect(scene.onBeforeRenderObservable.observers.length).toBe(obs);
    expect(scene.skeletons.length).toBe(skels);
    scene.render();
    const meshes = scene.meshes.length;
    const geos = scene.geometries.length;
    for (let i = 0; i < 5; i++) scene.render();
    expect(scene.meshes.length).toBe(meshes);
    expect(scene.geometries.length).toBe(geos);
    expect(ma.alwaysSelectAsActiveMesh).toBe(false);
    // a ragdoll re-parents a joint: the body and its merged gear are always active from the next render
    a.voxel!.nodes[1]!.parent = null;
    scene.render();
    expect(a.voxel!.meshes[0]!.alwaysSelectAsActiveMesh).toBe(true);
    expect(ma.alwaysSelectAsActiveMesh).toBe(true);
    expect(mb.alwaysSelectAsActiveMesh).toBe(false);
    // the rig takes it with it; the other guard keeps the shared geometry
    a.dispose();
    expect(ma.isDisposed()).toBe(true);
    expect(mb.isDisposed()).toBe(false);
    expect(mb.getTotalVertices()).toBeGreaterThan(0);
  });
});
