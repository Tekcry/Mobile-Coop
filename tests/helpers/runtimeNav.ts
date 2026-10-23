/**
 * The guards' runtime nav grid in a unit test: `navGridFromLevel` (the code `buildNavGrid` runs in the game) fed by an
 * analytic down-cast over the level's collision pieces in place of Havok's (boxes with their yaw and pitch, so the stair
 * ramps are the 0.3 slabs the game collides with; cylinders; a ray starting inside a piece misses it, as Havok's does).
 * Doors are left out: they get their bodies only after the grid is built (`Doors.arm`).
 */
import { Matrix, Quaternion, Vector3 } from '../../src/core/babylon';
import { navGridFromLevel, type NavDownHit } from '../../src/ai/navBuild';
import type { NavGrid } from '../../src/ai/navGrid';
import type { LevelBuilder } from '../../src/world/levelBuilder';
import { hyp2 } from '../../src/core/mathx';

interface Obb {
  c: [number, number, number];
  h: [number, number, number];
  /** World -> local rotation (the inverse of the piece's yaw-pitch-roll). */
  inv: Matrix;
  rot: Matrix;
  r: number;
}

/** The analytic down-cast over the level's collision pieces (Havok's `raycastToRef` straight down to y -2, first hit). */
export function downCast(b: LevelBuilder): (x: number, y: number, z: number) => NavDownHit | null {
  const obbs: Obb[] = [];
  for (const p of b.boxes) {
    if (!p.collide) continue;
    const q = Quaternion.RotationYawPitchRoll(p.yaw, p.pitch, 0);
    const rot = new Matrix();
    q.toRotationMatrix(rot);
    const inv = rot.clone().transpose();
    obbs.push({ c: [p.c[0], p.c[1], p.c[2]], h: [p.s[0] / 2, p.s[1] / 2, p.s[2] / 2], inv, rot, r: hyp2(hyp2(p.s[0], p.s[2]), p.s[1]) / 2 });
  }
  const cyls = b.cylinders.filter((c) => c.collide);
  const bd = b.bounds;
  const B = 4;
  const nbx = Math.ceil((bd.maxX - bd.minX) / B) + 1;
  const nbz = Math.ceil((bd.maxZ - bd.minZ) / B) + 1;
  const buckets: Obb[][] = Array.from({ length: nbx * nbz }, () => []);
  const bi = (v: number, o: number, n: number): number => Math.min(n - 1, Math.max(0, Math.floor((v - o) / B)));
  for (const o of obbs) {
    for (let i = bi(o.c[0] - o.r, bd.minX, nbx); i <= bi(o.c[0] + o.r, bd.minX, nbx); i++) {
      for (let k = bi(o.c[2] - o.r, bd.minZ, nbz); k <= bi(o.c[2] + o.r, bd.minZ, nbz); k++) buckets[k * nbx + i]!.push(o);
    }
  }
  const lo = new Vector3();
  const ld = new Vector3();
  const n = new Vector3();
  const down = new Vector3(0, -1, 0);
  const hit: NavDownHit = { y: 0, ny: 0 };
  const castDown = (x: number, y: number, z: number): NavDownHit | null => {
    let best = -Infinity;
    let bestNy = 0;
    const len = y + 2;
    for (const o of buckets[bi(z, bd.minZ, nbz) * nbx + bi(x, bd.minX, nbx)]!) {
      Vector3.TransformNormalToRef(new Vector3(x - o.c[0], y - o.c[1], z - o.c[2]), o.inv, lo);
      Vector3.TransformNormalToRef(down, o.inv, ld);
      const po = [lo.x, lo.y, lo.z];
      const pd = [ld.x, ld.y, ld.z];
      let t0 = -Infinity;
      let t1 = Infinity;
      let axis = -1;
      let sign = 0;
      let inside = true;
      for (let a = 0; a < 3; a++) {
        const hA = o.h[a]!;
        if (Math.abs(po[a]!) > hA) inside = false;
        if (Math.abs(pd[a]!) < 1e-12) {
          if (Math.abs(po[a]!) > hA) {
            t0 = Infinity;
            break;
          }
          continue;
        }
        let ta = (-hA - po[a]!) / pd[a]!;
        let tb = (hA - po[a]!) / pd[a]!;
        let s = -1;
        if (ta > tb) {
          const w = ta;
          ta = tb;
          tb = w;
          s = 1;
        }
        if (ta > t0) {
          t0 = ta;
          axis = a;
          sign = s;
        }
        t1 = Math.min(t1, tb);
      }
      if (inside || axis < 0 || t0 > t1 || t0 < 0 || t0 > len) continue;
      const hy = y - t0;
      if (hy > best) {
        n.set(axis === 0 ? sign : 0, axis === 1 ? sign : 0, axis === 2 ? sign : 0);
        Vector3.TransformNormalToRef(n, o.rot, n);
        best = hy;
        bestNy = n.y;
      }
    }
    for (const c of cyls) {
      const topY = c.c[1] + c.h / 2;
      if (hyp2(x - c.c[0], z - c.c[2]) > c.r || y <= topY || topY < -2) continue;
      if (topY > best) {
        best = topY;
        bestNy = 1;
      }
    }
    if (best === -Infinity) return null;
    hit.y = best;
    hit.ny = bestNy;
    return hit;
  };
  return castDown;
}

/** The runtime nav grid of a built level (`buildNavGrid`'s inputs: the map's nav layers, the player spawn as the seed, the nav seeds). */
export function runtimeNav(b: LevelBuilder, seed: { x: number; z: number }, layers: number, extraSeeds: readonly { x: number; y: number; z: number }[]): NavGrid {
  return navGridFromLevel(b, seed, layers, extraSeeds, downCast(b));
}
