/**
 * (guard-models G7) The guard figures wired into the game on a NullEngine: `buildEnemyRig` with the flag off is
 * today's S1 path; with it on a guard gets his `GuardBody` (the merged body until the first LOD is in), his look and
 * gear as G6's `applyGear` pieces (stale tails ignored, no-op on no change), the anim tier gate, despawn and the rig
 * fallback, the carried body keeping the variant, the helmet_std drop mesh and the figure-skinned shield; then the
 * host's `Enemy` and the client's `EnemyPuppet` gear sync (on stand-ins, as gearWiring.test.ts).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mesh, Scene } from '../src/core/babylon';
import type { GuardManifest } from '../src/operators/guards/gearMask';
import type { GuardAsset } from '../src/operators/guards/guardAssets';
import type * as GuardAssets from '../src/operators/guards/guardAssets';
import { guardGlb, type GuardTri } from './helpers/guardGlb';

const H = vi.hoisted(() => ({
  assets: new Map<string, unknown>(),
  shield: null as [string, string, string, string] | null,
}));

vi.mock('../src/operators/guards/guardAssets', async (orig) => {
  const actual = await orig<typeof GuardAssets>();
  return {
    ...actual,
    guardAsset: (base: string) => (H.assets.get(base) as GuardAsset | undefined) ?? actual.guardAsset(base as never),
    shieldUrls: () => H.shield,
  };
});

/** Every piece an average-base kind can show (G0 kit), one triangle each; the body on the left wrist. */
const AVG_PIECES = [
  'average', 'average-1', 'average-2', 'average-3', 'average-4', 'buzz', 'crop', 'sidepart', 'receding', 'fade',
  'cap', 'cap_officer', 'beanie', 'headset', 'glasses_clear', 'glasses_dark', 'helmet_std', 'vest_soft',
  'radio', 'pouch_belt', 'holster_thigh', 'flashlight_mount', 'uniform', 'uniform_jacket',
];
const BROAD_PIECES = ['broad', 'broad-1', 'balaclava', 'helmet_heavy', 'plate_heavy', 'pouch_belt', 'uniform'];
const tris = (pieces: readonly string[]): GuardTri[] =>
  pieces.map((p, i) => ({ piece: i, tint: i % 6, joint: i === 0 ? 'wrL' : p === 'vest_soft' || p === 'plate_heavy' ? 'chest' : 'head', at: [0.01 * i, 1.2 + 0.01 * i, 0.1] }));
const manifest = (id: string, base: 'average' | 'broad', pieces: string[]): GuardManifest => ({
  id, base, urls: ['', `/${id}-lod0.glb`, `/${id}-lod1.glb`, `/${id}-lod2.glb`], pieces, tintSlots: 6, refHeight: base === 'broad' ? 1.825 : 1.77,
});
const AVG = manifest('guard-average', 'average', AVG_PIECES);
const BROAD = manifest('guard-broad', 'broad', BROAD_PIECES);
/** The shield: two triangles skinned on the left forearm joints (as G3's elL / wrL build). */
const SHIELD_TRIS: GuardTri[] = [
  { piece: 0, tint: 0, joint: 'elL', at: [-0.3, 1.1, 0.3] },
  { piece: 0, tint: 0, joint: 'wrL', at: [-0.35, 0.95, 0.3] },
];

beforeEach(async () => {
  H.assets.set('average', { manifest: AVG, standIn: false, problems: [] });
  H.assets.set('broad', { manifest: BROAD, standIn: false, problems: [] });
  H.shield = null;
  const bin: Record<string, ArrayBuffer> = {};
  for (const l of ['lod0', 'lod1', 'lod2']) {
    bin[`/guard-average-${l}.glb`] = guardGlb(tris(AVG_PIECES));
    bin[`/guard-broad-${l}.glb`] = guardGlb(tris(BROAD_PIECES));
    bin[`/shield-${l}.glb`] = guardGlb(SHIELD_TRIS);
    bin[`/standin-${l}.glb`] = guardGlb(tris(['average']));
  }
  vi.stubGlobal('fetch', async (url: string) => (bin[url] ? new Response(bin[url]!.slice(0)) : new Response(null, { status: 404 })));
  const { forgetModels } = await import('../src/operators/runtime/figure');
  forgetModels();
  const { flags } = await import('../src/core/flags');
  flags.guardModels = true;
});

afterEach(async () => {
  vi.unstubAllGlobals();
  const { flags } = await import('../src/core/flags');
  flags.guardModels = false;
});

async function setup() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const B = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { buildEnemyRig } = await import('../src/ai/enemyRig');
  const GB = await import('../src/ai/guardBody');
  const { ENEMIES } = await import('../src/ai/enemyDefs');
  const V = await import('../src/operators/guards/guardVariant');
  const scene: Scene = new B.Scene(new NullEngine());
  const parts = new PartLibrary(scene);
  const casters: unknown[] = [];
  const world = { parts, map: { id: 'testmap', theme: { faction: 'urban' } }, addShadowCaster: (m: unknown) => casters.push(m) };
  const render = (): void => void scene.onBeforeRenderObservable.notifyObservers(scene);
  return { B, scene, world, casters, render, buildEnemyRig, GB, ENEMIES, V };
}

describe('flag off: today\'s S1 path', () => {
  it('buildEnemyRig builds no figure; the merged body draws; no guard body in the scene', async () => {
    const { scene, world, buildEnemyRig, GB, ENEMIES } = await setup();
    const { flags } = await import('../src/core/flags');
    flags.guardModels = false;
    const { rig, figure } = buildEnemyRig(scene, world as never, ENEMIES.grunt, 'g0');
    expect(figure).toBeNull();
    expect(GB.guardBodyOf(rig)).toBeNull();
    expect(GB.liveGuardBodies(scene).length).toBe(0);
    expect(rig.renderMeshes.length).toBeGreaterThan(0);
    expect(rig.renderMeshes.every((m) => m.isEnabled(false))).toBe(true);
    // the dog never gets one, flag on or off
    flags.guardModels = true;
    expect(buildEnemyRig(scene, world as never, ENEMIES.dog, 'd0').figure).toBeNull();
  });
});

describe('flag on: the guard figure over the rig', () => {
  it('the merged body draws until the first LOD is in, then goes; the figure shows from the next render, in the shadow list', async () => {
    const { scene, world, casters, render, buildEnemyRig, ENEMIES } = await setup();
    const { rig, figure } = buildEnemyRig(scene, world as never, ENEMIES.grunt, 'g1');
    expect(figure).not.toBeNull();
    const gb = figure!;
    expect(gb.standIn).toBe(false);
    expect(gb.shown).toBe(false);
    const merged = rig.renderMeshes;
    expect(merged.every((m) => m.isEnabled(false))).toBe(true);
    expect(gb.viewMesh).toBe(rig.voxel?.meshes[0] ?? null);
    await vi.waitFor(() => expect(gb.shown).toBe(true));
    expect(merged.every((m) => !m.isEnabled(false))).toBe(true);
    // A2: uniform scale from the base's bind height to his
    expect(gb.figure.root.scaling.x).toBeCloseTo(ENEMIES.grunt.height / AVG.refHeight, 9);
    expect(gb.figure.current).toBe(-1);
    render();
    expect(gb.figure.current).toBeGreaterThanOrEqual(1);
    const shown = gb.figure.lodMeshes(gb.figure.current);
    expect(shown.every((m) => m.isEnabled(false))).toBe(true);
    expect(gb.viewMesh).toBe(shown[0]);
    for (const m of gb.figure.renderMeshes) expect(casters).toContain(m);
  });

  it('look and gear: the shown pieces are exactly applyGear\'s list; a reused list with a stale tail; no change = no rewrite', async () => {
    const { scene, world, buildEnemyRig, ENEMIES, V } = await setup();
    const def = ENEMIES.grunt;
    const gb = buildEnemyRig(scene, world as never, def, 'g2').figure!;
    await vi.waitFor(() => expect(gb.shown).toBe(true));
    const v = V.createVariant();
    const p = V.createPieces();
    const check = (seed: number, helmet: boolean, armour: boolean): void => {
      V.guardVariant(seed, def.kind, 'testmap', v);
      V.applyGear(v, helmet, armour, def.plated, def.kind, p);
      for (const id of AVG_PIECES) expect([id, gb.figure.pieceShown(id)]).toEqual([id, id === 'average' || V.hasPiece(p, id)]);
      expect(gb.shownPieces()).toEqual(p.ids.slice(0, p.count));
    };
    gb.setLook(5);
    check(5, false, false);
    gb.setGear(true, true);
    expect(gb.figure.pieceShown('helmet_std')).toBe(true);
    expect(gb.figure.pieceShown('vest_soft')).toBe(true);
    check(5, true, true);
    // the helmet comes off (A6): his headwear / hair back
    gb.setGear(false, true);
    check(5, false, true);
    // a seed whose list shrinks when the gear goes: what the reused list held past `count` is stale, never shown
    let seed = 0;
    for (; seed < 128; seed++) {
      V.guardVariant(seed, def.kind, 'testmap', v);
      const n = V.applyGear(v, true, true, def.plated, def.kind, p).count;
      if (V.applyGear(v, false, false, def.plated, def.kind, p).count < n) break;
    }
    expect(seed).toBeLessThan(128);
    gb.setLook(seed);
    gb.setGear(true, true);
    gb.setGear(false, false);
    check(seed, false, false);
    const ids = (gb as unknown as { pieces: { ids: string[]; count: number } }).pieces;
    const live = ids.ids.slice(0, ids.count);
    const stale = ids.ids.slice(ids.count).filter((id) => id !== '' && !live.includes(id));
    expect(stale.length).toBeGreaterThan(0);
    for (const id of stale) expect([id, gb.figure.pieceShown(id)]).toEqual([id, false]);
    gb.setLook(5);
    gb.setGear(false, true);
    // same gear, same look: no new mask
    const spy = vi.spyOn(gb.figure, 'setPieces');
    gb.setGear(false, true);
    gb.setLook(5);
    expect(spy).not.toHaveBeenCalled();
    // another seed (the wire's arriving, a wake): the variant again
    gb.setLook(77);
    expect(spy).toHaveBeenCalledTimes(1);
    check(77, false, true);
  });

  it('the anim tier gate: a skipped solve skips the figure pose (but never its first show); flash and heat reach it', async () => {
    const { scene, world, render, buildEnemyRig, ENEMIES } = await setup();
    const { rig, figure } = buildEnemyRig(scene, world as never, ENEMIES.grunt, 'g3');
    const gb = figure!;
    await vi.waitFor(() => expect(gb.shown).toBe(true));
    const up = vi.spyOn(gb.figure, 'update');
    gb.skip = true;
    render();
    expect(up).toHaveBeenCalledTimes(1); // first show
    expect(gb.skip).toBe(false);
    gb.skip = true;
    render();
    expect(up).toHaveBeenCalledTimes(1);
    render();
    expect(up).toHaveBeenCalledTimes(2);
    const flash = vi.spyOn(gb.figure, 'setFlash');
    const heat = vi.spyOn(gb.figure, 'setHeat');
    gb.flash = 0.6;
    rig.setHeat(0.5);
    render();
    expect(flash).toHaveBeenLastCalledWith(0.6);
    expect(heat).toHaveBeenLastCalledWith(0.5);
  });

  it('(S11) the render freeze (rig root disabled): no figure update whatever `skip` says, its first show excepted; the thaw resumes it', async () => {
    const { render, buildEnemyRig, scene, world, ENEMIES } = await setup();
    const { rig, figure } = buildEnemyRig(scene, world as never, ENEMIES.grunt, 'g3f');
    const gb = figure!;
    await vi.waitFor(() => expect(gb.shown).toBe(true));
    const up = vi.spyOn(gb.figure, 'update');
    // frozen before the first show: the first show still picks a LOD
    rig.root.setEnabled(false);
    render();
    expect(up).toHaveBeenCalledTimes(1);
    expect(gb.figure.current).toBeGreaterThanOrEqual(1);
    // frozen, the owner's frame never set `skip` (master's `animate` returns first): still no update
    for (let i = 0; i < 3; i++) render();
    expect(up).toHaveBeenCalledTimes(1);
    // thawed: every frame again
    rig.root.setEnabled(true);
    render();
    render();
    expect(up).toHaveBeenCalledTimes(3);
  });

  it('(S11) the tier\'s own skipped state gates the figure: `GuardAnimTier.skipped` after each update', async () => {
    const { B, scene } = await setup();
    const { GuardAnimTier } = await import('../src/ai/animTierView');
    const { flags } = await import('../src/core/flags');
    const was = flags.animTier;
    flags.animTier = true;
    const body = new B.Mesh('tierbody', scene);
    const cam = new B.FreeCamera('tiercam', new B.Vector3(0, 1.6, 0), scene);
    scene.activeCamera = cam;
    const t = new GuardAnimTier(scene, body, 0);
    const pos = new B.Vector3(0, 0, 60); // far from the camera: half rate (the far tier)
    let frame = 0;
    const fid = vi.spyOn(scene, 'getFrameId').mockImplementation(() => frame);
    const got: boolean[] = [];
    for (frame = 1; frame <= 6; frame++) {
      // (seen every frame: the far tier, not the off-screen one)
      (t as unknown as { seen: { frame: number } }).seen.frame = frame;
      const dt = t.dt(1 / 60, pos, [], false);
      expect(t.skipped).toBe(dt < 0);
      got.push(t.skipped);
    }
    expect(got.filter(Boolean).length).toBe(3);
    expect(got.some((s) => !s)).toBe(true);
    fid.mockRestore();
    flags.animTier = was;
  });

  it('despawn: the owner frees the figure first; a rig disposed alone frees it too (the client ragdoll path)', async () => {
    const { scene, world, buildEnemyRig, GB, ENEMIES } = await setup();
    const a = buildEnemyRig(scene, world as never, ENEMIES.grunt, 'g4');
    const b = buildEnemyRig(scene, world as never, ENEMIES.droneOp, 'g5');
    await vi.waitFor(() => expect(a.figure!.shown && b.figure!.shown).toBe(true));
    expect(GB.liveGuardBodies(scene).length).toBe(2);
    a.figure!.dispose();
    a.rig.dispose();
    expect(a.figure!.figure.isDisposed).toBe(true);
    expect(GB.guardBodyOf(a.rig)).toBeNull();
    b.rig.dispose();
    expect(b.figure!.isDisposed).toBe(true);
    expect(b.figure!.figure.isDisposed).toBe(true);
    expect(GB.liveGuardBodies(scene).length).toBe(0);
  });

  it('a carried body keeps his variant: the body adopts the figure he fell in, a carried fresh rig gets one with his look and gear', async () => {
    const { B, scene, world, buildEnemyRig, GB, ENEMIES } = await setup();
    const { Body } = await import('../src/ai/body');
    const def = ENEMIES.grunt;
    const { rig, figure } = buildEnemyRig(scene, world as never, def, 'g6');
    const gb = figure!;
    gb.setLook(42);
    gb.setGear(true, false);
    await vi.waitFor(() => expect(gb.shown).toBe(true));
    const { newLie } = await import('../src/ai/bodyLie');
    const body = new Body(scene, world as never, def, true, rig, new B.Vector3(), false, newLie());
    expect(GB.guardBodyOf(rig)).toBe(gb);
    const before = gb.shownPieces();
    const chest = new B.TransformNode('carrier-chest', scene);
    const carried = body.pickUp(chest, 0.2, 0.1);
    expect(gb.isDisposed).toBe(true);
    const gb2 = GB.guardBodyOf(carried)!;
    expect(gb2).not.toBeNull();
    expect(gb2).not.toBe(gb);
    expect(gb2.gear({ look: 0, helmet: false, armour: false })).toEqual({ look: 42, helmet: true, armour: false });
    expect(gb2.shownPieces()).toEqual(before);
    body.hide();
    expect(gb2.isDisposed).toBe(true);
    expect(GB.liveGuardBodies(scene).length).toBe(0);
  });

  it('host and client build the same look from the same seed (the wire seed, M3)', async () => {
    const { scene, world, buildEnemyRig, ENEMIES } = await setup();
    const host = buildEnemyRig(scene, world as never, ENEMIES.officer, 'host').figure!;
    const client = buildEnemyRig(scene, world as never, ENEMIES.officer, 'client').figure!;
    for (const seed of [0, 9, 63, 127]) {
      host.setLook(seed);
      client.setLook(seed);
      host.setGear(seed % 2 === 1, false);
      client.setGear(seed % 2 === 1, false);
      expect(client.shownPieces()).toEqual(host.shownPieces());
      expect((client as unknown as { tints: Uint8Array }).tints).toEqual((host as unknown as { tints: Uint8Array }).tints);
    }
  });

  it('Wren stands in until the base has files: one body piece, untinted, the gear still tracked', async () => {
    const { scene, world, buildEnemyRig, ENEMIES } = await setup();
    H.assets.delete('average');
    const { guardStandInManifest } = await import('../src/operators/guards/gearMask');
    H.assets.set('average', { manifest: guardStandInManifest('average', ['', '/standin-lod0.glb', '/standin-lod1.glb', '/standin-lod2.glb']), standIn: true, problems: [] });
    const gb = buildEnemyRig(scene, world as never, ENEMIES.grunt, 'g7').figure!;
    expect(gb.standIn).toBe(true);
    gb.setGear(true, true);
    expect(gb.helmetOn).toBe(true);
    expect(Array.from((gb as unknown as { tints: Uint8Array }).tints)).toEqual([255, 255, 255]);
    await vi.waitFor(() => expect(gb.shown).toBe(true));
  });
});

describe("the dropped helmet's mesh (A6)", () => {
  it("helmet_std's triangles from the average base's LOD1, centred on their box, drawn as instances scaled to the asked box", async () => {
    const { scene, world } = await setup();
    const { helmetDropSource } = await import('../src/ai/guardHelmet');
    const { HelmetDrops } = await import('../src/ai/helmetDrops');
    expect(helmetDropSource(scene)).toBeNull(); // loading
    await vi.waitFor(() => expect(helmetDropSource(scene)).not.toBeNull());
    const src = helmetDropSource(scene)!;
    expect(src.mesh.getTotalVertices()).toBe(3);
    expect(src.w).toBeCloseTo(0.05, 5);
    const pos = src.mesh.getVerticesData('position')!;
    const cx = (Math.min(pos[0]!, pos[3]!, pos[6]!) + Math.max(pos[0]!, pos[3]!, pos[6]!)) / 2;
    expect(cx).toBeCloseTo(0, 6);
    expect(src.mesh.isVisible).toBe(false);
    const drops = new HelmetDrops(world.parts, () => {});
    drops.drop(0, 0, 0, 1.7, 0, 1, '#22262b', 0.1, 0.05, 0.05);
    const inst = (drops as unknown as { drops: { m: { sourceMesh: Mesh; scaling: { x: number } } }[] }).drops[0]!.m;
    expect(inst.sourceMesh).toBe(src.mesh);
    expect(inst.scaling.x).toBeCloseTo(0.1 / src.w, 6);
    expect(drops.shown).toBe(1);
  });

  it('no base with helmet_std (Wren stands in): the box, as with the flag off', async () => {
    const { scene, world } = await setup();
    H.assets.set('average', { manifest: AVG, standIn: true, problems: [] });
    H.assets.set('lean', { manifest: AVG, standIn: true, problems: [] });
    const { helmetDropSource } = await import('../src/ai/guardHelmet');
    const { HelmetDrops } = await import('../src/ai/helmetDrops');
    expect(helmetDropSource(scene)).toBeNull();
    const drops = new HelmetDrops(world.parts, () => {});
    drops.drop(0, 0, 0, 1.7, 0, 1, '#22262b', 0.25, 0.2, 0.26);
    const m = (drops as unknown as { drops: { m: { sourceMesh: Mesh; scaling: { x: number } } }[] }).drops[0]!.m;
    expect(m.sourceMesh.name).not.toBe('helmet-drop-src');
    expect(m.scaling.x).toBeCloseTo(0.25, 9);
    H.assets.delete('lean');
  });
});

describe("the enforcer's shield (shield_riot's own GLB)", () => {
  it('no shield files: none (the placeholder part); with them: skinned on the figure skeleton by joint name, following the LOD', async () => {
    const { scene, world, render, buildEnemyRig, ENEMIES } = await setup();
    const { guardShieldFor } = await import('../src/ai/guardShield');
    const gb = buildEnemyRig(scene, world as never, ENEMIES.enforcer, 'e1').figure!;
    expect(guardShieldFor(scene, gb, () => {})).toBeNull();
    H.shield = ['', '/shield-lod0.glb', '/shield-lod1.glb', '/shield-lod2.glb'];
    const caster = vi.fn();
    const sh = guardShieldFor(scene, gb, caster)!;
    expect(sh).not.toBeNull();
    gb.shield = sh;
    // not for other kinds, nor on a stand-in
    expect(guardShieldFor(scene, buildEnemyRig(scene, world as never, ENEMIES.heavy, 'h1').figure!, () => {})).toBeNull();
    await vi.waitFor(() => expect(gb.shown).toBe(true));
    await vi.waitFor(() => {
      render();
      expect(sh.ready).toBe(true);
    });
    const skel = gb.figure.lodSkeleton(gb.figure.current)!;
    const m = sh.renderMeshes[0]!;
    expect(m.skeleton).toBe(skel);
    expect(m.parent).toBe(gb.figure.lodMeshes(gb.figure.current)[0]!.parent);
    expect(caster).toHaveBeenCalledWith(m);
    const idx = m.getVerticesData('matricesIndices')!;
    expect(idx[0]).toBe(skel.getBoneIndexByName('elL'));
    expect(idx[12]).toBe(skel.getBoneIndexByName('wrL'));
    gb.dispose();
    expect(m.isDisposed()).toBe(true);
  });
});

describe('the anim tier follows what draws', () => {
  it('watch() swaps the tracked mesh (no new track)', async () => {
    const { B, scene } = await setup();
    const { GuardAnimTier } = await import('../src/ai/animTierView');
    const a = new B.Mesh('a', scene);
    const b = new B.Mesh('b', scene);
    const t = new GuardAnimTier(scene, a, 0);
    const seen = (t as unknown as { seen: { mesh: Mesh } }).seen;
    t.watch(b);
    expect(seen.mesh).toBe(b);
    t.watch(null);
    expect(seen.mesh).toBe(b);
    new GuardAnimTier(scene, null, 1).watch(a); // no body at build: stays untracked
  });
});

describe('gear sync on the host and the client (stand-ins)', () => {
  const fakeBody = () => ({ setGear: vi.fn(), setLook: vi.fn(), flash: 0, helmetOn: false, armourOn: false, shownPieces: () => [] as string[], shield: null });

  it("the host's Enemy: gear -> the figure's pieces (no placeholder parts); the knock-off hides it and drops helmet_std's box", async () => {
    const { Enemy } = await import('../src/ai/enemy');
    const { ENEMIES } = await import('../src/ai/enemyDefs');
    const { Vector3 } = await import('../src/core/babylon');
    const { guardHelmetDrop } = await import('../src/ai/helmetDrops');
    const gb = fakeBody();
    const parts = { instance: vi.fn() };
    const ctx = { dropHelmet: vi.fn(), world: { parts, addShadowCaster: vi.fn(), map: { theme: { faction: 'urban' } } } };
    const e = Object.create(Enemy.prototype) as InstanceType<typeof Enemy>;
    Object.assign(e, { ctx, def: ENEMIES.heavy, gbody: gb, dog: null, helmet: false, armour: false, helmetPart: null, armourParts: null, gearHex: '', pos: new Vector3(1, 0, 2), dropBox: [0, 0, 0], rig: { p: { head: { w: 0.2, h: 0.25, d: 0.22 } } } });
    e.setGear({ helmet: true, armour: true });
    expect(gb.setGear).toHaveBeenLastCalledWith(true, true);
    expect(parts.instance).not.toHaveBeenCalled();
    (e as unknown as { knockHelmetOff(h: unknown): void }).knockHelmetOff({ dir: new Vector3(0, 0, 2) });
    expect(gb.setGear).toHaveBeenLastCalledWith(false, true);
    const box = guardHelmetDrop(ENEMIES.heavy.height, [0, 0, 0]);
    const call = ctx.dropHelmet.mock.calls[0]!;
    expect(call.slice(4, 7)).toEqual([0, 1, '#14161a']);
    expect(call.slice(7)).toEqual(box);
  });

  it("the client's puppet: gear bits -> the figure's pieces; a helmet bit clearing drops helmet_std's box", async () => {
    const { EnemyPuppet } = await import('../src/net/enemyPuppet');
    const { AL_ARMOUR, AL_HELMET } = await import('../src/net/protocol');
    const { ENEMIES } = await import('../src/ai/enemyDefs');
    const { Vector3 } = await import('../src/core/babylon');
    const { guardHelmetDrop } = await import('../src/ai/helmetDrops');
    const gb = fakeBody();
    const p = Object.create(EnemyPuppet.prototype) as InstanceType<typeof EnemyPuppet>;
    const drop = vi.fn();
    Object.assign(p, {
      def: ENEMIES.grunt, gbody: gb, dog: null, gearAl: -1, rig: { p: { head: { w: 0.2, h: 0.25, d: 0.22 } } }, helmetPart: null, armourParts: null, gearHex: '',
      world: { parts: { instance: vi.fn() }, map: { theme: { faction: 'urban' } } }, pos: new Vector3(), yaw: 0, clock: 5, dropT: -9, dropDx: 0, dropDz: 0, dropBox: [0, 0, 0], onDropHelmet: drop,
    });
    const apply = (al: number): void => (p as unknown as { applyGear(al: number, j: number): void }).applyGear(al, 0);
    apply(AL_HELMET | AL_ARMOUR);
    expect(gb.setGear).toHaveBeenLastCalledWith(true, true);
    apply(AL_ARMOUR);
    expect(gb.setGear).toHaveBeenLastCalledWith(false, true);
    expect(drop).toHaveBeenCalledTimes(1);
    expect(drop.mock.calls[0]!.slice(7)).toEqual(guardHelmetDrop(ENEMIES.grunt.height, [0, 0, 0]));
    expect(p.gearShown.helmet).toBe(false);
  });
});
