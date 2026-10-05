import {
  Color3,
  Color4,
  Vector4,
  CreateBox,
  CreateCylinder,
  CreateSphere,
  StandardMaterial,
  type InstancedMesh,
  type Mesh,
  type Scene,
} from '../core/babylon';

import { PatternPlugin } from '../cosmetics/patternPlugin';
import { PATTERN_ID, type PatternName } from '../cosmetics/patterns';

export type PartShape = 'box' | 'cyl' | 'sphere' | 'cone' | 'hex';

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
  readonly material: StandardMaterial;

  constructor(private scene: Scene) {
    const m = new StandardMaterial('partMat', scene);
    m.diffuseColor = Color3.White();
    m.specularColor = new Color3(0.08, 0.08, 0.08);
    new PatternPlugin(m);
    m.freeze();
    this.material = m;
    const make = (shape: PartShape): Mesh => {
      let mesh: Mesh;
      switch (shape) {
        case 'box':
          mesh = CreateBox('part-box', { size: 1 }, scene);
          break;
        case 'cyl':
          mesh = CreateCylinder('part-cyl', { diameter: 1, height: 1, tessellation: 10 }, scene);
          break;
        case 'hex':
          mesh = CreateCylinder('part-hex', { diameter: 1, height: 1, tessellation: 6 }, scene);
          break;
        case 'cone':
          mesh = CreateCylinder('part-cone', { diameterTop: 0, diameterBottom: 1, height: 1, tessellation: 8 }, scene);
          break;
        case 'sphere':
          mesh = CreateSphere('part-sphere', { diameter: 1, segments: 6 }, scene);
          mesh.convertToFlatShadedMesh();
          break;
      }
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
    for (const s of ['box', 'cyl', 'sphere', 'cone', 'hex'] as const) this.bases.set(s, make(s));
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
    this.material.dispose();
    void this.scene;
  }
}
