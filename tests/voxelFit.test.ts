import { describe, expect, it } from 'vitest';
import { generateLedges } from '../src/world/anchors';
import { buildCoverSegments } from '../src/cover/coverData';
import { levelVoxels } from '../src/voxel/levelVoxels';
import { packShapes, rasterise, shapeBounds, SHAPE_STRIDE } from '../src/voxel/shapes';

/**
 * Voxel fit (3.0): on every cover face, ledge lip and walkable top the voxel surface sits within 3 cm of the
 * blockout's (inside 3 cm is solid wherever the blockout is solid, outside 3 cm is air wherever it is air), and
 * turning a map into voxels changes nothing gameplay reads (cover faces, ledges, the solid set). Faces off the
 * grid's axes (round pillars) step: a 5 cm staircase strays up to half a voxel's diagonal (3.6 cm), plus the
 * curve's sag over half a voxel on a thin pillar.
 */
const TOL = 0.03;
const TOL_DIAGONAL = 0.036;

describe('voxel fit and parity (3.0)', () => {
  it('Warehouse and Proving Grounds at 5 cm', async () => {
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const { MAPS } = await import('../src/world/maps');
    for (const map of MAPS) {
      const b = new LevelBuilder();
      map.build(b, 1);
      const snapshot = JSON.stringify([b.boxes, b.cylinders]);
      const coverBefore = JSON.stringify(buildCoverSegments(b.boxes, b.cylinders));
      const ledgesBefore = JSON.stringify(generateLedges(b.boxes).ledges.map((l) => [l.a, l.b, l.top, l.canHang]));
      const size = 0.05;
      const lv = levelVoxels(b.boxes, b.cylinders, b.surfaces, 'concrete', size);
      // parity: nothing gameplay reads has changed
      expect(JSON.stringify([b.boxes, b.cylinders]), map.id).toBe(snapshot);
      expect(JSON.stringify(buildCoverSegments(b.boxes, b.cylinders)), map.id).toBe(coverBefore);
      expect(JSON.stringify(generateLedges(b.boxes).ledges.map((l) => [l.a, l.b, l.top, l.canHang])), map.id).toBe(ledgesBefore);
      expect(lv.shapes.length, map.id).toBeGreaterThan(50);
      expect(lv.palette.length).toBeLessThanOrEqual(256);

      const packed = packShapes(lv.shapes);
      const n = packed.length / SHAPE_STRIDE;
      const bb = Array.from({ length: n }, (_, i) => shapeBounds(packed, i));
      const near = (x: number, y: number, z: number, r: number): number[] => {
        const out: number[] = [];
        for (let i = 0; i < n; i++) {
          const q = bb[i]!;
          if (x >= q[0]! - r && x <= q[3]! + r && y >= q[1]! - r && y <= q[4]! + r && z >= q[2]! - r && z <= q[5]! + r) out.push(i);
        }
        return out;
      };
      const g = new Uint8Array(1);
      /** The voxel containing a point (on the map's grid). */
      const voxelSolid = (x: number, y: number, z: number): boolean => {
        const o = lv.origin;
        const cx = o[0] + Math.floor((x - o[0]) / size) * size;
        const cy = o[1] + Math.floor((y - o[1]) / size) * size;
        const cz = o[2] + Math.floor((z - o[2]) / size) * size;
        g[0] = 0;
        rasterise(packed, g, [cx, cy, cz], size, 1, 1, 1, near(x, y, z, size));
        return g[0] !== 0;
      };
      /** The blockout itself at a point (a grid of one tiny voxel centred on it). */
      const tiny = 1e-4;
      const blockSolid = (x: number, y: number, z: number): boolean => {
        g[0] = 0;
        rasterise(packed, g, [x - tiny / 2, y - tiny / 2, z - tiny / 2], tiny, 1, 1, 1, near(x, y, z, tiny));
        return g[0] !== 0;
      };
      let checks = 0;
      const bad: string[] = [];
      const check = (what: string, px: number, py: number, pz: number, nx: number, ny: number, nz: number, curve = 0): void => {
        const axial = Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz)) > 0.999;
        // (a curved face also bends away from a voxel's centre: half a voxel's offset squared over twice the radius)
        const tol = (axial ? TOL : TOL_DIAGONAL) + (curve > 0 ? (size * size) / (4 * curve) : 0);
        for (const s of [-1, 1]) {
          const x = px + nx * tol * s;
          const y = py + ny * tol * s;
          const z = pz + nz * tol * s;
          const want = blockSolid(x, y, z);
          // (a probe is only meaningful where the blockout is the same all the way from the face to past the probe's
          // voxel: another piece's face within reach, or a probe on a piece's edge, is skipped)
          let clear = true;
          for (const d of [0.006, 0.015, 0.045, 0.06]) if (blockSolid(px + nx * d * s, py + ny * d * s, pz + nz * d * s) !== want) clear = false;
          const e = 2e-3;
          if (blockSolid(x + e, y, z) !== want || blockSolid(x - e, y, z) !== want || blockSolid(x, y + e, z) !== want || blockSolid(x, y - e, z) !== want || blockSolid(x, y, z + e) !== want || blockSolid(x, y, z - e) !== want) clear = false;
          if (!clear) continue;
          checks++;
          if (voxelSolid(x, y, z) !== want && bad.length < 8) bad.push(`${what} @ ${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)} (${want ? 'solid' : 'air'})`);
        }
      };
      const voxelPiece = (piece: number): boolean => (piece < b.boxes.length ? lv.voxelBox[piece]! : lv.voxelCyl[piece - b.boxes.length]!);
      for (const sg of buildCoverSegments(b.boxes, b.cylinders)) {
        // (pillars: their cover faces are an octagon round the round column - measured on the column below)
        if (!voxelPiece(sg.piece) || sg.piece >= b.boxes.length) continue;
        const y = sg.y + Math.min(sg.height / 2, 0.6);
        for (const t of [0.2, 0.5, 0.8]) check(`cover ${sg.id}`, sg.ax + (sg.bx - sg.ax) * t, y, sg.az + (sg.bz - sg.az) * t, sg.nx, 0, sg.nz);
      }
      b.cylinders.forEach((c, i) => {
        if (!lv.voxelCyl[i] || !c.collide) return;
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2;
          const nx = Math.cos(a);
          const nz = Math.sin(a);
          check(`pillar ${i}`, c.c[0] + nx * c.r, c.c[1], c.c[2] + nz * c.r, Math.abs(nx) < 1e-9 ? 0 : nx, 0, Math.abs(nz) < 1e-9 ? 0 : nz, c.r);
        }
      });
      for (const l of generateLedges(b.boxes).ledges) {
        if (!l.canHang && !l.canClimbUp) continue;
        // just inside the lip, on the top
        check('ledge', (l.a.x + l.b.x) / 2 - l.nx * 0.1, l.top, (l.a.z + l.b.z) / 2 - l.nz * 0.1, 0, 1, 0);
      }
      b.boxes.forEach((p, i) => {
        if (!lv.voxelBox[i] || !p.collide || p.s[1] > 0.6 || p.s[0] * p.s[2] < 4 || Math.abs(p.yaw) > 1e-3 || Math.abs(p.pitch) > 1e-3) return;
        const top = p.c[1] + p.s[1] / 2;
        for (const [u, w] of [[0, 0], [0.3, 0.3], [-0.3, 0.2]] as const) check('floor', p.c[0] + u * p.s[0], top, p.c[2] + w * p.s[2], 0, 1, 0);
      });
      expect(bad, `${map.id}: ${checks} checks`).toEqual([]);
      expect(checks, map.id).toBeGreaterThan(300);
    }
  });
});
