import { Color3, CreateDisc, Matrix, StandardMaterial, VertexBuffer, type Mesh, type Scene } from '../core/babylon';
import { hyp2 } from '../core/mathx';

/** Characters with a contact shadow at once (the rest go without). */
export const MAX_BLOBS = 32;
/** Darkness at the centre (0..1). */
const BLOB_ALPHA = 0.42;

/**
 * Soft contact shadows under characters: one thin-instanced disc (radial vertex alpha, alpha blended, no depth
 * write), refilled each render frame with `begin` / `add` / `end`. Grounds characters in dark maps where the sun's
 * shadow map is weak or off, at one draw call. Allocation-free per frame.
 */
export class BlobShadows {
  private mesh: Mesh;
  private mtx = new Float32Array(MAX_BLOBS * 16);
  private n = 0;

  constructor(scene: Scene) {
    const disc = CreateDisc('blobShadows', { radius: 1, tessellation: 20 }, scene);
    disc.bakeTransformIntoVertices(Matrix.RotationX(Math.PI / 2));
    const pos = disc.getVerticesData(VertexBuffer.PositionKind)!;
    const cols = new Float32Array((pos.length / 3) * 4);
    for (let i = 0; i < pos.length / 3; i++) {
      const r = Math.min(1, hyp2(pos[i * 3]!, pos[i * 3 + 2]!));
      const a = BLOB_ALPHA * (1 - r * r) * (1 - r * r);
      cols[i * 4 + 3] = a;
    }
    disc.setVerticesData(VertexBuffer.ColorKind, cols);
    disc.hasVertexAlpha = true;
    const mat = new StandardMaterial('blobShadowMat', scene);
    mat.disableLighting = true;
    mat.diffuseColor = Color3.Black();
    mat.specularColor = Color3.Black();
    mat.emissiveColor = Color3.Black();
    mat.disableDepthWrite = true;
    mat.zOffset = -2;
    mat.freeze();
    disc.material = mat;
    disc.isPickable = false;
    for (let i = 0; i < MAX_BLOBS; i++) this.mtx[i * 16 + 15] = 1;
    disc.thinInstanceSetBuffer('matrix', this.mtx, 16, false);
    disc.thinInstanceCount = 0;
    disc.alwaysSelectAsActiveMesh = true;
    this.mesh = disc;
  }

  begin(): void {
    this.n = 0;
  }

  /** A shadow of radius `r` (m) on the floor under (x, y, z). */
  add(x: number, y: number, z: number, r: number): void {
    if (this.n >= MAX_BLOBS) return;
    const o = this.n * 16;
    const m = this.mtx;
    m[o] = r;
    m[o + 5] = 1;
    m[o + 10] = r;
    m[o + 12] = x;
    m[o + 13] = y + 0.025;
    m[o + 14] = z;
    this.n++;
  }

  end(): void {
    this.mesh.thinInstanceCount = this.n;
    this.mesh.thinInstanceBufferUpdated('matrix');
  }

  dispose(): void {
    this.mesh.material?.dispose();
    this.mesh.dispose();
  }
}
