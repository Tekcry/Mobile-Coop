import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { CreateBox, Matrix, Scene, Vector3 } from '../src/core/babylon';
import { GUARD_SUN_REACH, SunCascadeLists, inCascadeXY, keepNearCamera, useCascadeLists } from '../src/world/sunCascadeCull';

function cascade(): { t: Float32Array | number[]; dir: Vector3; right: Vector3 } {
  const dir = new Vector3(0.3, -1, 0.2).normalize();
  const centre = new Vector3(5, 0, 5);
  const view = Matrix.LookAtLHToRef(centre.subtract(dir.scale(50)), centre, Vector3.Up(), new Matrix());
  const proj = Matrix.OrthoOffCenterLHToRef(-10, 10, -10, 10, 0, 100, new Matrix());
  const m = view.multiply(proj);
  const right = new Vector3(view.m[0]!, view.m[4]!, view.m[8]!).normalize();
  return { t: Array.from(m.m), dir, right };
}

describe('inCascadeXY', () => {
  const { t, dir, right } = cascade();
  const c = new Vector3(5, 0, 5);
  const at = (p: Vector3, r: number): boolean => inCascadeXY(t, p.x, p.y, p.z, r);
  it('keeps the centre, the near edge, drops the far edge, ignores depth', () => {
    expect(at(c, 0.1)).toBe(true);
    expect(at(c.add(right.scale(9.9)), 0.1)).toBe(true);
    expect(at(c.add(right.scale(12)), 0.2)).toBe(false);
    expect(at(c.add(right.scale(12)), 2)).toBe(true);
    expect(at(c.subtract(dir.scale(80)), 0.1)).toBe(true);
  });

  it('never a false negative (500 seeded spheres)', () => {
    let seed = 7;
    const rnd = (): number => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const dirs: Vector3[] = [];
    for (let i = 0; i < 64; i++) dirs.push(new Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize());
    let outs = 0;
    for (let n = 0; n < 500; n++) {
      const p = new Vector3(rnd() * 60 - 25, rnd() * 20 - 5, rnd() * 60 - 25);
      const r = rnd() * 3;
      if (inCascadeXY(t, p.x, p.y, p.z, r)) continue;
      outs++;
      let xp = true, xn = true, yp = true, yn = true;
      for (const d of dirs) {
        const q = p.add(d.scale(r));
        const v = Vector3.TransformCoordinates(q, Matrix.FromArray(t as number[]));
        if (!(v.x > 1)) xp = false;
        if (!(v.x < -1)) xn = false;
        if (!(v.y > 1)) yp = false;
        if (!(v.y < -1)) yn = false;
      }
      expect(xp || xn || yp || yn).toBe(true);
    }
    expect(outs).toBeGreaterThan(50);
  });
});

describe('keepNearCamera', () => {
  it('reach and hysteresis', () => {
    expect(keepNearCamera(false, 1e9, Infinity)).toBe(true);
    expect(keepNearCamera(false, 39 * 39, GUARD_SUN_REACH)).toBe(true);
    expect(keepNearCamera(false, 41 * 41, GUARD_SUN_REACH)).toBe(false);
    expect(keepNearCamera(true, 41 * 41, GUARD_SUN_REACH)).toBe(true);
    expect(keepNearCamera(true, 43.5 * 43.5, GUARD_SUN_REACH)).toBe(false);
    expect(keepNearCamera(false, 40 * 40, GUARD_SUN_REACH)).toBe(true);
  });
});

describe('SunCascadeLists.fill', () => {
  it('filters in order, reuses the array, nulls out of range', () => {
    const scene = new Scene(new NullEngine());
    const { t } = cascade();
    const mk = (name: string, x: number, z: number) => {
      const b = CreateBox(name, { size: 1 }, scene);
      b.position.set(x, 0, z);
      b.computeWorldMatrix(true);
      return b;
    };
    const a = mk('a', 5, 5), far = mk('far', 200, 200), b = mk('b', 6, 4);
    const lists = new SunCascadeLists();
    const out = lists.fill(1, [a, far, b], t);
    expect(out).toEqual([a, b]);
    expect(lists.fill(1, [b, a], t)).toBe(out);
    expect(out).toEqual([b, a]);
    expect(lists.fill(0, [a], null)).toBeNull();
    expect(lists.fill(4, [a], t)).toBeNull();
    expect(lists.fill(2, [], t)).toEqual([]);
  });
});

describe('useCascadeLists', () => {
  it('only with the flag on and the baked moon (level not a sun caster)', () => {
    expect(useCascadeLists(true, true)).toBe(true);
    expect(useCascadeLists(true, false)).toBe(false);
    expect(useCascadeLists(false, true)).toBe(false);
    expect(useCascadeLists(false, false)).toBe(false);
  });
});
