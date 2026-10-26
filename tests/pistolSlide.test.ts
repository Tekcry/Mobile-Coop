// (piano-knife S4a) The empty pistol: the slide is a mesh of its own in pistolSd.glb and WeaponModel.slideLock moves it
// back SLIDE_LOCK_BACK along the bore (render only). Nothing calls slideLock until S4b's introPose.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TRI_BUDGET } from '../src/weapons/weaponMeshData';

interface Accessor {
  bufferView: number;
  byteOffset?: number;
  count: number;
  min?: number[];
  max?: number[];
}
interface GlbJson {
  meshes: { name: string; primitives: { attributes: { POSITION: number }; indices: number }[] }[];
  accessors: Accessor[];
  bufferViews: { byteOffset?: number; byteLength: number }[];
}

/** The JSON chunk and the BIN chunk's data of a .glb. */
function readGlb(path: string): { json: GlbJson; bin: Buffer } {
  const buf = readFileSync(path);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8')) as GlbJson;
  const binStart = 20 + jsonLen + 8;
  return { json, bin: buf.subarray(binStart) };
}

/** A mesh's first primitive's POSITION floats (a copy: the buffer slice may be unaligned). GLB y and z are the weapon frame's. */
function positions(json: GlbJson, bin: Buffer, meshName: string): Float32Array {
  const mesh = json.meshes.find((m) => m.name === meshName);
  if (!mesh) throw new Error(`no mesh ${meshName}`);
  const a = json.accessors[mesh.primitives[0]!.attributes.POSITION]!;
  const start = (json.bufferViews[a.bufferView]!.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const bytes = bin.subarray(start, start + a.count * 12);
  const out = new Float32Array(a.count * 3);
  new Uint8Array(out.buffer).set(bytes);
  return out;
}

interface Report {
  triangles: number;
  partBounds: Record<string, [number[], number[]]>;
  split: { slide: string[]; mag: string[] };
  glb: { meshes: string[] };
}

const MESHES = ['pistolSd', 'pistolSd-mag', 'pistolSd-slide'];
const report = JSON.parse(readFileSync('src/weapons/assets/pistolSd.json', 'utf8')) as Report;

describe('pistolSd GLB: the slide is its own mesh (piano-knife S4a)', () => {
  const { json, bin } = readGlb('src/weapons/assets/pistolSd.glb');

  it('the meshes are the body, the magazine and the slide', () => {
    expect(json.meshes.map((m) => m.name)).toEqual(MESHES);
  });

  it('the slide mesh is the slide and its sights, nothing of the frame, barrel or suppressor', () => {
    const a = json.accessors[json.meshes[2]!.primitives[0]!.attributes.POSITION]!;
    expect(a.min![1]!).toBeGreaterThanOrEqual(0.0205);
    expect(a.max![1]!).toBeLessThanOrEqual(0.0545);
    expect(a.min![2]!).toBeGreaterThanOrEqual(-0.031);
    expect(a.max![2]!).toBeLessThanOrEqual(0.1525);
  });

  it('the slide mesh has at least 200 triangles', () => {
    const idx = json.accessors[json.meshes[2]!.primitives[0]!.indices]!;
    expect(idx.count / 3).toBeGreaterThanOrEqual(200);
  });

  it('the slide top and sights left the body: no body vertex above y 0.0500 behind the suppressor', () => {
    const p = positions(json, bin, 'pistolSd');
    let bad = 0;
    for (let i = 0; i < p.length; i += 3) if (p[i + 1]! > 0.05 && p[i + 2]! < 0.1525) bad++;
    expect(bad).toBe(0);
  });

  it('the report names the split parts and the meshes, inside the triangle budget', () => {
    expect(report.split.slide).toEqual(['slide', 'extractor', 'rear-sight', 'front-sight']);
    expect(report.split.mag).toEqual(['mag-plate', 'mag']);
    expect(report.glb.meshes).toEqual(MESHES);
    expect(report.triangles).toBeLessThanOrEqual(TRI_BUDGET.pistolSd);
  });
});

describe('WeaponModel.slideLock (piano-knife S4a)', () => {
  /** A scene with a pistol and a rifle model (no baked mesh fetched) and the stand-in meshes for useMesh. */
  async function setup() {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, Mesh } = await import('../src/core/babylon');
    const { TransformNode } = await import('@babylonjs/core/Meshes/transformNode');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { WeaponModel, DEFAULT_WEAPON_COLORS, SLIDE_LOCK_BACK } = await import('../src/weapons/weaponModel');
    const { WEAPONS } = await import('../src/weapons/weaponDefs');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const parent = new TransformNode('parent', scene);
    const make = (id: 'pistolSd' | 'rifle') => new WeaponModel(scene, lib, WEAPONS[id], DEFAULT_WEAPON_COLORS, parent);
    type Use = { useMesh(m: InstanceType<typeof Mesh>, mag: InstanceType<typeof Mesh> | null, slide: InstanceType<typeof Mesh> | null): void };
    /** The body and slide stand-ins, the slide parented to the body as loadWeaponMesh does, handed to useMesh. */
    const load = (p: InstanceType<typeof WeaponModel>, withSlide = true) => {
      const body = new Mesh('body', scene);
      const slide = withSlide ? new Mesh('slide', scene) : null;
      if (slide) slide.parent = body;
      (p as unknown as Use).useMesh(body, null, slide);
      return { body, slide };
    };
    return { make, load, SLIDE_LOCK_BACK };
  }

  it('SLIDE_LOCK_BACK is positive and at most a quarter of the slide length', async () => {
    const { SLIDE_LOCK_BACK } = await setup();
    const [lo, hi] = report.partBounds.slide!;
    expect(SLIDE_LOCK_BACK).toBeGreaterThan(0);
    expect(SLIDE_LOCK_BACK).toBeLessThanOrEqual(0.25 * (hi![2]! - lo![2]!));
  });

  it('a lock set before the mesh arrives is applied when it does', async () => {
    const { make, load, SLIDE_LOCK_BACK } = await setup();
    const p = make('pistolSd');
    p.slideLock(true);
    const { slide } = load(p);
    expect(slide!.position.x).toBe(0);
    expect(slide!.position.y).toBe(0);
    expect(slide!.position.z).toBe(-SLIDE_LOCK_BACK);
    expect(p.slideLocked).toBe(true);
  });

  it('slideLock(false) puts the slide forward and slideLock(true) back again', async () => {
    const { make, load, SLIDE_LOCK_BACK } = await setup();
    const p = make('pistolSd');
    const { slide } = load(p);
    p.slideLock(true);
    expect(slide!.position.z).toBe(-SLIDE_LOCK_BACK);
    p.slideLock(false);
    expect(slide!.position.z).toBe(0);
    expect(slide!.position.x).toBe(0);
    expect(slide!.position.y).toBe(0);
    expect(p.slideLocked).toBe(false);
    p.slideLock(true);
    expect(slide!.position.z).toBe(-SLIDE_LOCK_BACK);
  });

  it('with no lock the slide stays at the origin (today\'s look)', async () => {
    const { make, load } = await setup();
    const p = make('pistolSd');
    const { slide } = load(p);
    expect(slide!.position.x).toBe(0);
    expect(slide!.position.y).toBe(0);
    expect(slide!.position.z).toBe(0);
    expect(p.slideLocked).toBe(false);
  });

  it('a gun without a separate slide ignores the lock', async () => {
    const { make, load } = await setup();
    const r = make('rifle');
    load(r, false);
    expect(() => r.slideLock(true)).not.toThrow();
    expect(r.slideMesh).toBeNull();
    const bare = make('rifle');
    expect(() => bare.slideLock(true)).not.toThrow();
    expect(bare.slideMesh).toBeNull();
  });

  it('dispose() disposes the slide mesh', async () => {
    const { make, load } = await setup();
    const p = make('pistolSd');
    const { slide } = load(p);
    expect(slide!.isDisposed()).toBe(false);
    p.dispose();
    expect(slide!.isDisposed()).toBe(true);
  });
});
