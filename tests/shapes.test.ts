import { describe, expect, it } from 'vitest';
import { packShapes, rasterise, shapeBounds, ShapeMode } from '../src/voxel/shapes';

describe('light bake shapes', () => {
  it('rasterises a box by voxel centre: surfaces within half a voxel', () => {
    const sh = packShapes([{ kind: 'box', c: [0.5, 0.5, 0.5], s: [0.33, 0.21, 0.5], yaw: 0, pitch: 0, mat: 4 }]);
    const g = new Uint8Array(20 * 20 * 20);
    rasterise(sh, g, [0, 0, 0], 0.05, 20, 20, 20);
    let n = 0;
    let minX = 99;
    let maxX = -1;
    for (let z = 0; z < 20; z++) for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) if (g[x + 20 * (y + 20 * z)] === 4) {
      n++;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
    // x: 0.335 .. 0.665 -> centres 0.375 .. 0.625 (voxels 7 .. 12)
    expect(minX).toBe(7);
    expect(maxX).toBe(12);
    expect(Math.abs(minX * 0.05 - 0.335)).toBeLessThanOrEqual(0.025 + 1e-9);
    expect(n).toBe(6 * 4 * 10);
  });
  it('rotates like Babylon (yaw, then pitch)', async () => {
    const { Matrix, Quaternion, Vector3 } = await import('../src/core/babylon');
    const yaw = 0.7;
    const pitch = -0.4;
    const c: [number, number, number] = [1, 1, 1];
    const s: [number, number, number] = [0.8, 0.3, 0.5];
    const sh = packShapes([{ kind: 'box', c, s, yaw, pitch, mat: 2 }]);
    // Babylon's world matrix of the unit box
    const q = Quaternion.RotationYawPitchRoll(yaw, pitch, 0);
    const m = Matrix.Compose(new Vector3(...s), q, new Vector3(...c));
    // points inside in local space map inside; just outside map outside
    const bb = shapeBounds(sh, 0);
    for (const [lx, ly, lz, inside] of [
      [0.45, 0.45, 0.45, true],
      [-0.45, 0.2, -0.3, true],
      [0.55, 0, 0, false],
      [0, -0.55, 0, false],
      [0, 0, 0.55, false],
    ] as const) {
      const w = Vector3.TransformCoordinates(new Vector3(lx, ly, lz), m);
      expect(w.x).toBeGreaterThanOrEqual(bb[0]! - 1e-6);
      expect(w.x).toBeLessThanOrEqual(bb[3]! + 1e-6);
      // a 1-voxel grid centred on the point
      const size = 0.001;
      const g = new Uint8Array(1);
      rasterise(sh, g, [w.x - size / 2, w.y - size / 2, w.z - size / 2], size, 1, 1, 1);
      expect(g[0] === 2).toBe(inside);
    }
  });
  it('carves and paints', () => {
    const sh = packShapes([
      { kind: 'box', c: [0.5, 0.5, 0.5], s: [1, 1, 1], yaw: 0, pitch: 0, mat: 1 },
      { kind: 'box', c: [0.5, 0.5, 0.5], s: [0.2, 2, 0.2], yaw: 0, pitch: 0, mat: 0, mode: ShapeMode.Carve },
      { kind: 'cyl', c: [0.5, 1.2, 0.5], r: 0.3, h: 0.6, mat: 5, mode: ShapeMode.Paint },
      { kind: 'cyl', c: [0.5, 0.9, 0.5], r: 0.3, h: 0.2, mat: 6, mode: ShapeMode.Paint },
    ]);
    const g = new Uint8Array(10 * 10 * 10);
    rasterise(sh, g, [0, 0, 0], 0.1, 10, 10, 10);
    const at = (x: number, y: number, z: number): number => g[x + 10 * (y + 10 * z)]!;
    expect(at(0, 0, 0)).toBe(1);
    expect(at(5, 5, 5)).toBe(0);
    // the paint above the box touches nothing; the one at its top paints solid voxels only
    expect(at(2, 9, 5)).toBe(6);
    expect(at(5, 9, 5)).toBe(0);
  });
});
