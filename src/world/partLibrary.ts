import { renderOpts } from './renderOpts';
import {
  Color3,
  Color4,
  Vector4,
  CreateBox,
  CreateCylinder,
  CreateTorus,
  PBRMaterial,
  StandardMaterial,
  type InstancedMesh,
  type Mesh,
  type Scene,
} from '../core/babylon';

import { PatternPlugin } from '../cosmetics/patternPlugin';
import { CAPSULE, DOME, HELMET, ROUND_CYL, SPHERE, TORSO, limbProfile, revolve, superellipsoid } from './smoothMeshes';
import { PATTERN_ID, type PatternName } from '../cosmetics/patterns';
import { SURFACE_ID, type SurfaceAtlas } from './surfaceAtlas';
import { SurfacePlugin } from './surfacePlugin';
import { VoxelBodyPlugin } from '../voxel/voxelBodyPlugin';
import { hsv, pieceKind } from './surfaceKinds';

/** Hard-edged shapes are for world props only; characters, gear and weapons use the smooth set. */
export type HardShape = 'box' | 'cyl' | 'cone' | 'hex';
export type SmoothShape = 'sphere' | 'capsule' | 'limbA' | 'limbL' | 'torso' | 'dome' | 'helmet' | 'rcyl' | 'rbox' | 'pill' | 'torus';
export type PartShape = HardShape | SmoothShape;
export const SMOOTH_SHAPES: readonly SmoothShape[] = ['sphere', 'capsule', 'limbA', 'limbL', 'torso', 'dome', 'helmet', 'rcyl', 'rbox', 'pill', 'torus'];
/** Distance (m) beyond which smooth shapes switch to their low-tessellation LOD. */
export const LOD_DISTANCE = 16;

/** Optional per-instance pattern (camo, stripes...) over the base colour. */
export interface PartPattern {
  name: PatternName;
  color: string;
  /** Pattern cell size in metres. */
  scale?: number;
}

const hex4 = (hex: string): Color4 => Color4.FromHexString(hex.length === 7 ? hex + 'ff' : hex);
/** sRGB -> linear (PBR parts). */
const lin4 = (c: Color4): Color4 => new Color4(c.r ** 2.2, c.g ** 2.2, c.b ** 2.2, c.a);

/**
 * The surface a part wears (3.0, object-space procedural surfaces): weapons - blue-grey / pale steel brushed, the
 * rest polymer; characters - skin and dark gear smooth rubber, everything else fabric; props by colour like the
 * level; small gadgets polymer.
 */
export function partSurface(name: string, hex: string): number {
  const [h, s, v] = hsv(hex);
  if (name.startsWith('wpn-')) return SURFACE_ID[(h >= 180 && h <= 240 && s < 0.35 && v > 0.3) || (s < 0.12 && v > 0.45) ? 'brushed' : 'rubber'];
  if (name.startsWith('prop-') || name.startsWith('pickup') || name.startsWith('int-')) return SURFACE_ID[pieceKind(hex, 1, 1, 1, null)];
  if (/^(enemy-|player|preview|vip|dummy|remote|body)/.test(name)) {
    if (h >= 8 && h <= 40 && s > 0.2 && s < 0.65 && v > 0.35) return SURFACE_ID.rubber; // skin
    if (v < 0.16) return SURFACE_ID.rubber;
    return SURFACE_ID.fabric;
  }
  return SURFACE_ID.rubber;
}
/**
 * Unit-sized base meshes shared by every character/prop part. Parts are InstancedMesh
 * with a per-instance colour, so N enemies of any mix cost one draw call per shape.
 */
export class PartLibrary {
  private bases = new Map<PartShape, Mesh>();
  private lods: Mesh[] = [];
  readonly material: StandardMaterial | PBRMaterial;
  readonly skinMaterial: StandardMaterial | PBRMaterial;
  /** PBR with procedural surfaces (3.0; an atlas given): colours go in linear. */
  private readonly pbr: boolean;

  constructor(
    private scene: Scene,
    atlas: SurfaceAtlas | null = null,
  ) {
    const make = (name: string): StandardMaterial | PBRMaterial => {
      if (atlas) {
        const pm = new PBRMaterial(name, scene);
        pm.albedoColor = Color3.White();
        pm.metallic = 0;
        pm.roughness = 1;
        pm.usePhysicalLightFalloff = false;
        // PBR divides diffuse by pi: the lights were authored for the standard material
        pm.directIntensity = Math.PI;
        pm.environmentIntensity = 0.5;
        pm.realTimeFiltering = renderOpts.iblFilter;
        new PatternPlugin(pm);
        new SurfacePlugin(pm, atlas, 'object');
        return pm;
      }
      const sm = new StandardMaterial(name, scene);
      sm.diffuseColor = Color3.White();
      sm.specularColor = new Color3(0.08, 0.08, 0.08);
      new PatternPlugin(sm);
      return sm;
    };
    const m = make('partMat');
    m.freeze();
    this.material = m;
    // voxel characters (3.0): merged skinned meshes with per-vertex colour, pattern and voxel grid (not frozen)
    this.skinMaterial = make('partSkinMat');
    new VoxelBodyPlugin(this.skinMaterial);
    // (frozen too: an unfrozen material re-checks its defines on every mesh, every frame - garbage and CPU)
    this.skinMaterial.freeze();
    this.pbr = !!atlas;
    const prep = (mesh: Mesh): Mesh => {
      mesh.material = m;
      mesh.metadata = { skinMaterial: this.skinMaterial };
      mesh.registerInstancedBuffer('color', 4);
      mesh.instancedBuffers.color = new Color4(1, 1, 1, 1);
      mesh.registerInstancedBuffer('pattern', 4);
      mesh.instancedBuffers.pattern = new Vector4(0, 1, 0, 0);
      mesh.registerInstancedBuffer('color2', 4);
      mesh.instancedBuffers.color2 = new Color4(0, 0, 0, 1);
      mesh.isPickable = false;
      // The base itself is never drawn; only its instances.
      mesh.setEnabled(true);
      mesh.isVisible = false;
      mesh.alwaysSelectAsActiveMesh = false;
      return mesh;
    };
    const hard = (shape: HardShape): Mesh => {
      switch (shape) {
        case 'box':
          return CreateBox('part-box', { size: 1 }, scene);
        case 'cyl':
          return CreateCylinder('part-cyl', { diameter: 1, height: 1, tessellation: 10 }, scene);
        case 'hex':
          return CreateCylinder('part-hex', { diameter: 1, height: 1, tessellation: 6 }, scene);
        case 'cone':
          return CreateCylinder('part-cone', { diameterTop: 0, diameterBottom: 1, height: 1, tessellation: 8 }, scene);
      }
    };
    // hi / lo tessellation (segments around, profile subdivisions)
    const smooth = (shape: SmoothShape, lo: boolean): Mesh => {
      const n = `part-${shape}${lo ? '-lo' : ''}`;
      const d = lo ? { segments: 8, sub: 1 } : { segments: 16, sub: 2 };
      switch (shape) {
        case 'sphere':
          return revolve(n, scene, SPHERE, lo ? { segments: 8, sub: 1 } : { segments: 16, sub: 1 });
        case 'capsule':
          return revolve(n, scene, CAPSULE, d);
        case 'limbA':
          return revolve(n, scene, limbProfile(0.76, 0.05, 0.3), lo ? { segments: 8, sub: 1 } : { segments: 14, sub: 1 });
        case 'limbL':
          return revolve(n, scene, limbProfile(0.64, 0.06, 0.28), lo ? { segments: 8, sub: 1 } : { segments: 14, sub: 1 });
        case 'torso':
          return revolve(n, scene, TORSO, d, 2.25);
        case 'dome':
          return revolve(n, scene, DOME, d);
        case 'helmet':
          return revolve(n, scene, HELMET, d);
        case 'rcyl':
          return revolve(n, scene, ROUND_CYL, lo ? { segments: 8, sub: 1 } : { segments: 12, sub: 1 });
        case 'rbox':
          return superellipsoid(n, scene, 5, lo ? 6 : 10, lo ? 8 : 16);
        case 'pill':
          return superellipsoid(n, scene, 2.6, lo ? 6 : 10, lo ? 8 : 16);
        case 'torus':
          return CreateTorus(n, { diameter: 1, thickness: 0.12, tessellation: lo ? 12 : 24 }, scene);
      }
    };
    for (const s of ['box', 'cyl', 'cone', 'hex'] as const) this.bases.set(s, prep(hard(s)));
    for (const s of SMOOTH_SHAPES) {
      const hi = prep(smooth(s, false));
      const lo = prep(smooth(s, true));
      hi.addLODLevel(LOD_DISTANCE, lo);
      this.bases.set(s, hi);
      this.lods.push(lo);
    }
  }

  /** Detail setting (3.0): the smooth shapes switch to their low LOD at `LOD_DISTANCE` x k. */
  setLodScale(k: number): void {
    for (let i = 0; i < SMOOTH_SHAPES.length; i++) {
      const hi = this.bases.get(SMOOTH_SHAPES[i]!)!;
      const lo = this.lods[i]!;
      hi.removeLODLevel(lo);
      hi.addLODLevel(LOD_DISTANCE * k, lo);
    }
  }

  base(shape: PartShape): Mesh {
    return this.bases.get(shape)!;
  }

  instance(shape: PartShape, hex: string, name = 'part', pattern?: PartPattern): InstancedMesh {
    const inst = this.bases.get(shape)!.createInstance(name);
    inst.instancedBuffers.color = this.col(hex);
    // (pattern.z = the procedural surface, kept by setPattern)
    inst.instancedBuffers.pattern = new Vector4(0, 1, partSurface(name, hex), 0);
    this.setPattern(inst, pattern);
    inst.isPickable = false;
    return inst;
  }

  private col(hex: string): Color4 {
    const c = hex4(hex);
    return this.pbr ? lin4(c) : c;
  }

  setColor(inst: InstancedMesh, hex: string): void {
    inst.instancedBuffers.color = this.col(hex);
  }

  setPattern(inst: InstancedMesh, pattern?: PartPattern): void {
    const surf = (inst.instancedBuffers.pattern as Vector4 | undefined)?.z ?? 0;
    if (!pattern || pattern.name === 'solid') {
      inst.instancedBuffers.pattern = new Vector4(0, 1, surf, 0);
      inst.instancedBuffers.color2 = new Color4(0, 0, 0, 1);
      return;
    }
    inst.instancedBuffers.pattern = new Vector4(PATTERN_ID[pattern.name], pattern.scale ?? 0.25, surf, 0);
    inst.instancedBuffers.color2 = this.col(pattern.color);
  }

  dispose(): void {
    for (const b of this.bases.values()) b.dispose();
    for (const l of this.lods) l.dispose();
    this.material.dispose();
    this.skinMaterial.dispose();
    void this.scene;
  }
}
