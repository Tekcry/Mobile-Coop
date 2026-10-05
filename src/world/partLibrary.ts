import {
  Color3,
  Color4,
  CreateBox,
  CreateCylinder,
  CreateSphere,
  StandardMaterial,
  type InstancedMesh,
  type Mesh,
  type Scene,
} from '../core/babylon';

export type PartShape = 'box' | 'cyl' | 'sphere' | 'cone' | 'hex';

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

  instance(shape: PartShape, hex: string, name = 'part'): InstancedMesh {
    const inst = this.bases.get(shape)!.createInstance(name);
    inst.instancedBuffers.color = Color4.FromHexString(hex.length === 7 ? hex + 'ff' : hex);
    inst.isPickable = false;
    return inst;
  }

  setColor(inst: InstancedMesh, hex: string): void {
    inst.instancedBuffers.color = Color4.FromHexString(hex.length === 7 ? hex + 'ff' : hex);
  }

  dispose(): void {
    for (const b of this.bases.values()) b.dispose();
    this.material.dispose();
    void this.scene;
  }
}
