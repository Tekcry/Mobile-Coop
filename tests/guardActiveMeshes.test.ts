/**
 * (guard-models perf S13) Active meshes per on-screen guard (NullEngine, no GPU): a host `Enemy` (stubbed hitboxes:
 * physics only) built and framed as the game does, the camera on him, every mesh Babylon makes active in the camera
 * pass counted by class. Flag off (the S1 merged body) and on (the figure), with his held gun, helmet and armour.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AbstractMesh, Scene } from '../src/core/babylon';
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
  return { B, scene, world, casters, guard, ENEMIES };
}

describe('S13: active meshes per on-screen guard', () => {
  it('flag off (S1 body): body, gun, helmet, armour', async () => {
    const { guard } = await setup();
    for (const kind of ['grunt', 'enforcer'] as const) {
      const g = await guard(kind);
      console.log(`S13 count flag off ${kind}: ${g.total} ${JSON.stringify(g.by)} [${g.names.join(', ')}]`);
      expect(g.by.body).toBe(1);
      expect(g.by.gun).toBe(1);
      g.e.dispose();
    }
  });

  it('flag on (figure): figure LOD, gun', async () => {
    const { flags } = await import('../src/core/flags');
    flags.guardModels = true;
    const { guard } = await setup();
    const g = await guard('grunt');
    console.log(`S13 count flag on grunt: ${g.total} ${JSON.stringify(g.by)} [${g.names.join(', ')}]`);
    expect(g.by.figure).toBe(1);
    expect(g.by.gun).toBe(1);
  });

  it('before perfg: a guard gun as its instanced parts', async () => {
    const { B, scene, world } = await setup();
    const { WeaponModel } = await import('../src/weapons/weaponModel');
    const { WEAPONS } = await import('../src/weapons/weaponDefs');
    const { ENEMIES } = await import('../src/ai/enemyDefs');
    const ids = new Set<string>();
    for (const d of Object.values(ENEMIES)) if (d.gun) ids.add(d.gun);
    const out: string[] = [];
    for (const id of ids) {
      const g = new WeaponModel(scene, world.parts as never, WEAPONS[id as keyof typeof WEAPONS], { body: '#2a2d31', grip: '#17191c', accent: '#3a3f45' }, new B.TransformNode(`h-${id}`, scene));
      out.push(`${id} ${g.parts.length}`);
      g.dispose();
    }
    console.log(`S13 gun parts per weapon (pre-perfg active meshes): ${out.join(', ')}`);
    expect(out.length).toBeGreaterThan(0);
  });
});
