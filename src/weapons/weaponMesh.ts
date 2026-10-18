/**
 * Weapon meshes in the game (feature/weapons; render side only). Each kit item's GLB (weaponMeshData.ts) is fetched
 * from the bundle once (same origin, the operators' GLB reader: KTX2 textures through the bundled transcoder), built
 * once per scene into a hidden source mesh and a PBR material, and every weapon of that kind in the scene shares its
 * geometry and material. Gameplay never reads these meshes (muzzle, hand points and extents come from weapons.json).
 */
import { Color3, Mesh, PBRMaterial, VertexData, type Scene, type TransformNode } from '../core/babylon';
import type { GlbModel } from '../operators/lab/glb';
import { loadModel, texture } from '../operators/runtime/figure';
import { pageLeaving } from '../operators/runtime/offline';
import { meshUrl } from './weaponMeshData';

const FILES = import.meta.glob<string>('./assets/*.glb', { query: '?url', import: 'default', eager: true });

/** The bundled GLB URL of a kit item ('' when it has no mesh). */
export function weaponMeshUrl(id: string): string {
  return meshUrl(id, FILES);
}

interface WeaponAsset {
  source: Mesh;
  material: PBRMaterial;
}

const ASSETS = new WeakMap<Scene, Map<string, Promise<WeaponAsset>>>();

function build(scene: Scene, model: GlbModel, id: string): WeaponAsset {
  const g = model.meshes[0];
  const m = model.materials[0];
  if (!g || !m) throw new Error(`weapon mesh ${id}: empty file`);
  const mat = new PBRMaterial(`wpn-mesh-${id}`, scene);
  mat.albedoColor = new Color3(1, 1, 1);
  const albedo = texture(scene, m.baseTex, true);
  if (albedo) mat.albedoTexture = albedo;
  const orm = texture(scene, m.ormTex, false);
  if (orm) {
    mat.metallicTexture = orm;
    mat.useAmbientOcclusionFromMetallicTextureRed = true;
    mat.useRoughnessFromMetallicTextureGreen = true;
    mat.useMetallnessFromMetallicTextureBlue = true;
  }
  mat.metallic = 1;
  mat.roughness = 1;
  const nrm = texture(scene, m.normalTex, false);
  if (nrm) {
    mat.bumpTexture = nrm;
    // as the operators' LODs (the reader mirrors x)
    mat.invertNormalMapX = true;
    mat.invertNormalMapY = true;
  }
  // as the operator's kit (figure.ts: 0.25 on her hard parts), a little more for the metal: the guns sit in the same
  // light as the body that carries them
  mat.environmentIntensity = 0.3;
  mat.directIntensity = Math.PI;
  mat.backFaceCulling = false;
  mat.twoSidedLighting = true;
  const source = new Mesh(`wpn-mesh-${id}-src`, scene);
  const vd = new VertexData();
  vd.positions = g.positions;
  vd.normals = g.normals;
  vd.uvs = g.uvs;
  if (g.tangents) vd.tangents = g.tangents;
  vd.indices = g.indices as unknown as number[];
  vd.applyToMesh(source, false);
  source.setEnabled(false);
  source.isPickable = false;
  scene.onDisposeObservable.addOnce(() => mat.dispose(false, true));
  return { source, material: mat };
}

function asset(scene: Scene, id: string): Promise<WeaponAsset> | null {
  const url = weaponMeshUrl(id);
  if (!url) return null;
  let per = ASSETS.get(scene);
  if (!per) {
    per = new Map();
    ASSETS.set(scene, per);
  }
  let p = per.get(id);
  if (!p) {
    p = loadModel(url).then((model) => build(scene, model, id));
    p.catch(() => per.delete(id));
    per.set(id, p);
  }
  return p;
}

/**
 * Starts loading a kit item's mesh for one weapon: once ready, `ready` gets a mesh under `parent` (sharing the scene's
 * geometry and material). Returns false when the item has no mesh in the bundle. A failed load is logged once and the
 * weapon keeps its proxy parts; `alive()` false (the weapon was disposed meanwhile) drops the result.
 */
export function loadWeaponMesh(scene: Scene, id: string, parent: TransformNode, alive: () => boolean, ready: (m: Mesh) => void): boolean {
  const p = asset(scene, id);
  if (!p) return false;
  p.then((a) => {
    if (!alive() || scene.isDisposed) return;
    const m = new Mesh(`wpn-mesh-${id}`, scene);
    a.source.geometry!.applyToMesh(m);
    m.material = a.material;
    m.parent = parent;
    m.isPickable = false;
    m.receiveShadows = true;
    ready(m);
  }).catch((e: unknown) => {
    if (!pageLeaving() && !scene.isDisposed) console.warn(`[weapons] ${id} mesh failed to load`, e);
  });
  return true;
}
