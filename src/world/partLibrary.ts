import {
  Color3,
  Color4,
  Vector4,
  CreateBox,
  CreateCylinder,
  CreateTorus,
  StandardMaterial,
  type InstancedMesh,
  type Mesh,
  type Scene,
} from '../core/babylon';

import { PatternPlugin } from '../cosmetics/patternPlugin';
import { CAPSULE, DOME, HELMET, ROUND_CYL, SPHERE, TORSO, limbProfile, revolve, superellipsoid } from './smoothMeshes';
import { PATTERN_ID, type PatternName } from '../cosmetics/patterns';

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

/**
 * Unit-sized base meshes shared by every character/prop part. Parts are InstancedMesh
 * with a per-instance colour, so N enemies of any mix cost one draw call per shape.
 */
export class PartLibrary {
  private bases = new Map<PartShape, Mesh>();
  private lods: Mesh[] = [];
  readonly material: StandardMaterial;

  constructor(private scene: Scene) {
    const m = new StandardMaterial('partMat', scene);
    m.diffuseColor = Color3.White();
    m.specularColor = new Color3(0.08, 0.08, 0.08);
    new PatternPlugin(m);
    m.freeze();
    this.material = m;
    const prep = (mesh: Mesh): Mesh => {
      mesh.material = m;
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

  base(shape: PartShape): Mesh {
    return this.bases.get(shape)!;
  }

  instance(shape: PartShape, hex: string, name = 'part', pattern?: PartPattern): InstancedMesh {
    const inst = this.bases.get(shape)!.createInstance(name);
    inst.instancedBuffers.color = hex4(hex);
    this.setPattern(inst, pattern);
    inst.isPickable = false;
    return inst;
  }

  setColor(inst: InstancedMesh, hex: string): void {
    inst.instancedBuffers.color = hex4(hex);
  }

  setPattern(inst: InstancedMesh, pattern?: PartPattern): void {
    if (!pattern || pattern.name === 'solid') {
      inst.instancedBuffers.pattern = new Vector4(0, 1, 0, 0);
      inst.instancedBuffers.color2 = new Color4(0, 0, 0, 1);
      return;
    }
    inst.instancedBuffers.pattern = new Vector4(PATTERN_ID[pattern.name], pattern.scale ?? 0.25, 0, 0);
    inst.instancedBuffers.color2 = hex4(pattern.color);
  }

  dispose(): void {
    for (const b of this.bases.values()) b.dispose();
    for (const l of this.lods) l.dispose();
    this.material.dispose();
    void this.scene;
  }
}
