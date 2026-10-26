/**
 * (gm-mc-polish: GM-PERF-CHECK 6, S11-CHECK P2) A guard figure thawed from the render freeze, or killed while frozen,
 * is posed from the current rig at once (the figure's `poseNow`), not at the skeleton's next compute: Babylon computes
 * a skeleton once per render id, so a pose asked for after this render's compute would draw a frame late, and a death
 * while frozen was never posed before the ragdoll's first frame. NullEngine, a host `Enemy` with stubbed hitboxes.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AbstractMesh, Scene } from '../src/core/babylon';
import type { GuardManifest } from '../src/operators/guards/gearMask';
import type { GuardAsset } from '../src/operators/guards/guardAssets';
import type * as GuardAssets from '../src/operators/guards/guardAssets';
import type { HitInfo } from '../src/game/damage';
import { guardGlb, type GuardTri } from './helpers/guardGlb';

vi.mock('../src/ai/hitboxes', () => ({ Hitboxes: class { sync(): void {} setSolid(): void {} dispose(): void {} } }));
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


interface Fig { poses: number; current: number }

async function frozenGuard() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const B = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { Enemy } = await import('../src/ai/enemy');
  const { ENEMIES, DIFFICULTY } = await import('../src/ai/enemyDefs');
  const { flags } = await import('../src/core/flags');
  flags.guardModels = true;
  const scene: Scene = new B.Scene(new NullEngine());
  const cam = new B.FreeCamera('cam', new B.Vector3(0, 1.2, 6), scene);
  cam.setTarget(new B.Vector3(0, 1, 0));
  const parts = new PartLibrary(scene);
  const world = { parts, map: { id: 'testmap', theme: { faction: 'urban' } }, addShadowCaster: (_m: AbstractMesh) => {} };
  const bodies: unknown[] = [];
  const ctx = {
    scene,
    world,
    diff: DIFFICULTY.normal,
    nav: { heightAt: (_x: number, _z: number, y: number) => y },
    registry: { removeTarget: () => {} },
    players: () => [],
    enemies: () => [],
    releaseCover: () => {},
    addBody: (...a: unknown[]) => bodies.push(a),
    onKilled: () => {},
  };
  const e = new Enemy(ctx as never, ENEMIES.grunt, new B.Vector3(0, 0, 0), 0);
  const gb = (e as unknown as { gbody: { shown: boolean; figure: Fig } | null }).gbody!;
  expect(gb).not.toBeNull();
  await vi.waitFor(() => expect(gb.shown).toBe(true));
  for (let i = 0; i < 4; i++) {
    e.frame(1 / 60, 1);
    scene.render();
  }
  expect(gb.figure.current).toBeGreaterThanOrEqual(0);
  // the render freeze: his rig root disabled; frames go on, the figure is not posed
  e.bodyRig.root.setEnabled(false);
  for (let i = 0; i < 3; i++) {
    e.frame(1 / 60, 1);
    scene.render();
  }
  return { B, scene, e, fig: gb.figure, bodies };
}

describe('guard figure posed at once out of the render freeze', () => {
  it('thaw: thawPose poses the figure in the call (after this render id\'s compute), not at the next render', async () => {
    const { scene, e, fig } = await frozenGuard();
    const p0 = fig.poses;
    scene.render();
    expect(fig.poses).toBe(p0);
    // the freeze's thaw (the camera evaluation, after his frame)
    e.bodyRig.root.setEnabled(true);
    e.thawPose();
    expect(fig.poses).toBe(p0 + 1);
    scene.dispose();
  });

  it('killed while frozen: the figure is posed in the death call, before the body\'s first frame', async () => {
    const { B, scene, e, fig, bodies } = await frozenGuard();
    const p0 = fig.poses;
    const hit: HitInfo = { amount: 999, point: new B.Vector3(0, 1, 0), dir: new B.Vector3(0, 0, 1), part: 'body', kind: 'melee', attackerTeam: 'player', attackerId: 'p1' } as HitInfo;
    e.killOutright(hit);
    expect(e.alive).toBe(false);
    expect(bodies.length).toBe(1);
    expect(fig.poses).toBe(p0 + 1);
    scene.dispose();
  });
});
