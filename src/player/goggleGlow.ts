import { Color3, Color4, CreateSphere, StandardMaterial, type InstancedMesh, type Mesh, type Scene, type TransformNode } from '../core/babylon';

/**
 * The goggle glow (3.6 Phase 1 Step 4b, bible L7 and 5.14): the operator's tri-lens lenses as small emissive points,
 * so a player finds their own operator in darkness (and team-mates find each other), as in Chaos Theory. Visual only:
 * not a light, not in the light field, it lights no surface and guards never react to it. Green for every operator
 * until per-operator colours (Phase 5). One shared unlit mesh per scene: every lens is an instance of it (one draw).
 */
const BASES = new WeakMap<Scene, Mesh>();

/** Lens glow colours: always on (dim), brighter while a vision mode is on. */
export const GLOW_IDLE = new Color4(0.16, 0.62, 0.2, 1);
export const GLOW_VISION = new Color4(0.42, 1, 0.36, 1);

function base(scene: Scene): Mesh {
  let b = BASES.get(scene);
  if (b && !b.isDisposed()) return b;
  b = CreateSphere('goggleGlow', { diameter: 1, segments: 4 }, scene);
  const m = new StandardMaterial('goggleGlow', scene);
  m.disableLighting = true;
  m.diffuseColor = Color3.Black();
  m.specularColor = Color3.Black();
  m.emissiveColor = Color3.White();
  m.fogEnabled = false;
  b.material = m;
  b.registerInstancedBuffer('color', 4);
  b.instancedBuffers.color = GLOW_IDLE;
  b.isVisible = false;
  b.isPickable = false;
  b.doNotSyncBoundingInfo = true;
  BASES.set(scene, b);
  return b;
}

/** A glow point on a lens: parented to the lens's node, just in front of it. */
export function addGlow(scene: Scene, parent: TransformNode, x: number, y: number, z: number, size: number): InstancedMesh {
  const g = base(scene).createInstance('goggleGlow');
  g.parent = parent;
  g.position.set(x, y, z);
  g.scaling.setAll(size);
  g.isPickable = false;
  g.instancedBuffers.color = GLOW_IDLE;
  return g;
}
