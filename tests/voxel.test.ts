import { describe, expect, it } from 'vitest';
import { BRICK_VOXELS, Brickmap, EMPTY, UNIFORM_BASE } from '../src/voxel/brickmap';
import { packShapes, rasterise, shapeBounds, ShapeMode } from '../src/voxel/shapes';
import { greedyMesh } from '../src/voxel/mesher';
import { buildChunk } from '../src/voxel/chunk';

describe('brickmap', () => {
  it('stores empty, uniform and explicit bricks', () => {
    const m = new Brickmap([0, 0, 0], 0.05, [16, 16, 16]);
    expect(m.bx).toBe(2);
    expect(m.get(3, 3, 3)).toBe(0);
    m.fillBrick(0, 0, 0, 7);
    expect(m.get(3, 3, 3)).toBe(7);
    expect(m.index[0]).toBe(UNIFORM_BASE - 7);
    // one voxel changed: the brick becomes explicit, the rest keep the uniform value
    m.set(1, 2, 3, 9);
    expect(m.get(1, 2, 3)).toBe(9);
    expect(m.get(4, 4, 4)).toBe(7);
    expect(m.index[0]).toBe(0);
    expect(m.slots).toBe(1);
    // set back: fold returns it to uniform
    m.set(1, 2, 3, 7);
    expect(m.fold()).toBe(1);
    expect(m.index[0]).toBe(UNIFORM_BASE - 7);
    expect(m.slots).toBe(0);
    expect(m.get(20, 0, 0)).toBe(0);
    expect(m.index[1]).toBe(EMPTY);
  });
  it('grows its pool', () => {
    const m = new Brickmap([0, 0, 0], 0.1, [80, 80, 80]);
    for (let z = 0; z < 10; z++) for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) m.set(x * 8, y * 8, z * 8, 3);
    expect(m.slots).toBe(1000);
    expect(m.pool.length).toBeGreaterThanOrEqual(1000 * BRICK_VOXELS);
    expect(m.get(72, 72, 72)).toBe(3);
    expect(m.get(73, 72, 72)).toBe(0);
  });
});

describe('voxel shapes', () => {
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

describe('greedy mesher', () => {
  it('a single voxel is six quads facing out (Babylon winding)', async () => {
    const g = new Uint8Array(27);
    g[13] = 1;
    const m = greedyMesh(g, 1, 1, 1, [0, 0, 0], 1);
    expect(m.quads).toBe(6);
    const { VertexData } = await import('../src/core/babylon');
    const computed = new Float32Array(m.normals.length);
    VertexData.ComputeNormals(m.positions, m.indices, computed);
    for (let i = 0; i < m.normals.length; i++) expect(computed[i]).toBeCloseTo(m.normals[i]!, 5);
    // normals point away from the voxel centre
    for (let v = 0; v < 24; v++) {
      const d = (m.positions[v * 3]! - 0.5) * m.normals[v * 3]! + (m.positions[v * 3 + 1]! - 0.5) * m.normals[v * 3 + 1]! + (m.positions[v * 3 + 2]! - 0.5) * m.normals[v * 3 + 2]!;
      expect(d).toBeGreaterThan(0);
    }
  });
  it('merges a slab into six quads and culls faces against the apron', () => {
    const n = 8;
    const X = n + 2;
    const g = new Uint8Array(X * X * X);
    for (let z = 0; z < n; z++) for (let y = 0; y < 2; y++) for (let x = 0; x < n; x++) g[x + 1 + X * (y + 1 + X * (z + 1))] = 1 + ((x + z) % 3);
    expect(greedyMesh(g, n, n, n, [0, 0, 0], 0.1).quads).toBe(6);
    // solid apron on -x: that side has no face
    for (let z = 0; z < n; z++) for (let y = 0; y < 2; y++) g[0 + X * (y + 1 + X * (z + 1))] = 1;
    expect(greedyMesh(g, n, n, n, [0, 0, 0], 0.1).quads).toBe(5);
  });
});

describe('chunk jobs', () => {
  it('meshes and cuts bricks (uniform inside, explicit at the surface)', () => {
    // a slab 0 .. 0.6 m tall over a 0.8 m chunk at 5 cm (16 voxels): bricks 0-0.4 m uniform, 0.4-0.8 m split
    const shapes = packShapes([{ kind: 'box', c: [0.4, 0.15, 0.4], s: [2, 0.9, 2], yaw: 0, pitch: 0, mat: 3 }]);
    const r = buildChunk({ id: 1, origin: [0, 0, 0], size: 0.05, n: [16, 16, 16], shapes, bricks: true });
    expect(r.codes!.length).toBe(8);
    expect(r.codes![0]).toBe(UNIFORM_BASE - 3);
    expect(r.codes![2]).toBeGreaterThanOrEqual(0);
    expect(r.data!.length).toBe(4 * BRICK_VOXELS);
    // only the top is a face inside the chunk (the slab continues past every side: the apron is solid)
    expect(r.mesh.quads).toBe(1);
    expect(r.solid).toBe(16 * 12 * 16);
  });
});

describe('mesh voxelizer (characters / weapons)', () => {
  it('a box and a sphere fill their volume; anisotropic cells', async () => {
    const { voxeliseMesh } = await import('../src/voxel/meshVoxels');
    const { VertexData } = await import('../src/core/babylon');
    const box = VertexData.CreateBox({ size: 1 });
    const g = voxeliseMesh(box.positions!, box.indices!, [0.1, 0.1, 0.1]);
    expect([g.nx, g.ny, g.nz]).toEqual([10, 10, 10]);
    expect(g.solid.reduce((a, b) => a + b, 0)).toBe(1000);
    const sph = VertexData.CreateSphere({ diameter: 1, segments: 24 });
    const s = voxeliseMesh(sph.positions!, sph.indices!, [0.05, 0.05, 0.05]);
    const vol = s.solid.reduce((a, b) => a + b, 0) * 0.05 ** 3;
    expect(vol).toBeGreaterThan(0.48);
    expect(vol).toBeLessThan(0.54);
    // a long thin limb scaled (0.08, 0.42, 0.08) voxelised at 2 cm world: cells 0.25 x 0.0476 x 0.25 of the unit mesh
    const a = voxeliseMesh(box.positions!, box.indices!, [0.02 / 0.08, 0.02 / 0.42, 0.02 / 0.08]);
    expect([a.nx, a.ny, a.nz]).toEqual([4, 21, 4]);
  });
});

describe('voxel characters: the voxelised parts stay within one voxel of the smooth shapes', () => {
  it('every smooth shape at body-part scales, 2 cm voxels', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, VertexBuffer } = await import('../src/core/babylon');
    const { PartLibrary, SMOOTH_SHAPES } = await import('../src/world/partLibrary');
    const { voxeliseMesh } = await import('../src/voxel/meshVoxels');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const size = 0.02;
    // (a head, a chest, an upper arm, a thigh, a hand-sized part)
    const scales: [number, number, number][] = [[0.158, 0.229, 0.19], [0.34, 0.45, 0.22], [0.1, 0.3, 0.1], [0.164, 0.415, 0.164], [0.06, 0.17, 0.09]];
    for (const shape of SMOOTH_SHAPES) {
      const src = lib.instance(shape, '#ffffff').sourceMesh;
      const pos = src.getVerticesData(VertexBuffer.PositionKind)!;
      const idx = src.getIndices()!;
      for (const [sx, sy, sz] of scales) {
        const cell: [number, number, number] = [size / sx, size / sy, size / sz];
        const g = voxeliseMesh(pos, idx, cell);
        const solid = (i: number, j: number, k: number): boolean => i >= 0 && j >= 0 && k >= 0 && i < g.nx && j < g.ny && k < g.nz && g.solid[i + g.nx * (j + g.ny * k)] === 1;
        let worst = 0;
        for (let v = 0; v < pos.length; v += 3) {
          // the vertex's cell, then the nearest solid and the nearest empty cell within two voxels (world distance)
          const c = [0, 1, 2].map((a) => (pos[v + a]! - g.origin[a]!) / cell[a]!);
          let dIn = Infinity;
          let dOut = Infinity;
          for (let dk = -2; dk <= 2; dk++)
            for (let dj = -2; dj <= 2; dj++)
              for (let di = -2; di <= 2; di++) {
                const i = Math.floor(c[0]!) + di;
                const j = Math.floor(c[1]!) + dj;
                const k = Math.floor(c[2]!) + dk;
                const d = Math.hypot(i + 0.5 - c[0]!, j + 0.5 - c[1]!, k + 0.5 - c[2]!) * size;
                if (solid(i, j, k)) dIn = Math.min(dIn, d);
                else dOut = Math.min(dOut, d);
              }
          worst = Math.max(worst, dIn, dOut);
        }
        // every surface point has a solid and an empty voxel within one voxel diagonal of it
        expect(worst, `${shape} ${sx}x${sy}x${sz}`).toBeLessThanOrEqual(size * Math.sqrt(3));
      }
    }
    lib.dispose();
    scene.dispose();
  });
});
