import { describe, expect, it, vi } from 'vitest';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { CascadedShadowGenerator, CreateBox, DirectionalLight, FreeCamera, Matrix, Scene, TransformNode, Vector3 } from '../src/core/babylon';
import {
  GUARD_SUN_REACH,
  SHADOW_DROP,
  SHADOW_LEN_CAP,
  SunCascadeLists,
  cascadeFar,
  cascadeNear,
  csmSplitLen,
  csmSplitZ,
  inCascadeXY,
  keepNearCamera,
  moonShadowLen,
  shadowInDepth,
  sunCasterDrawn,
  useCascadeLists,
} from '../src/world/sunCascadeCull';

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

// (guard-render S9) depth-split culling. 4 cascades: far splits at 6 / 15 / 35 / 90 m, blend 8 %.
const SZ = [6, 15, 35, 90];
const SL = [5.9, 9, 20, 55];
const BL = 0.08;
// a camera at the origin looking down +z (left-handed view: view z = depth)
const VIEW = Array.from(Matrix.LookAtLHToRef(Vector3.Zero(), new Vector3(0, 0, 1), Vector3.Up(), new Matrix()).m);
// a light-space square wide enough that the x / y test keeps everything
const WIDE = Array.from(Matrix.Scaling(1e-3, 1e-3, 1e-3).m);

describe('depth-split culling (S9)', () => {
  const scene = new Scene(new NullEngine());
  const mk = (name: string, z: number) => {
    const b = CreateBox(name, { size: 0.2 }, scene);
    b.position.set(0, 1, z);
    b.computeWorldMatrix(true);
    return b;
  };
  const layersOf = (lists: SunCascadeLists, m: ReturnType<typeof mk>): number[] => {
    const ks: number[] = [];
    for (let k = 0; k < 4; k++) if (lists.fill(k, [m], WIDE)!.includes(m)) ks.push(k);
    return ks;
  };

  it('layer ranges: split +- the blend band, open at both ends', () => {
    expect(cascadeNear(SZ, SL, BL, 0)).toBe(-Infinity);
    expect(cascadeNear(SZ, SL, BL, 2)).toBeCloseTo(15 - 0.72);
    expect(cascadeFar(SZ, SL, BL, 1, 4)).toBeCloseTo(15 + 0.72);
    expect(cascadeFar(SZ, SL, BL, 3, 4)).toBe(Infinity);
  });

  it('a near guard is out of the far layers, a far guard out of the near ones (moon straight down)', () => {
    const lists = new SunCascadeLists();
    lists.setDepth(VIEW, SZ, SL, BL, 0, -1, 0);
    expect(layersOf(lists, mk('near', 3))).toEqual([0]);
    expect(layersOf(lists, mk('mid', 25))).toEqual([2]);
    expect(layersOf(lists, mk('far', 50))).toEqual([3]);
  });

  it('a shadow crossing a split is kept in both layers', () => {
    const lists = new SunCascadeLists();
    const g = mk('cross', 13);
    lists.setDepth(VIEW, SZ, SL, BL, 0, -1, 0);
    expect(layersOf(lists, g)).toEqual([1]);
    // the moon behind the camera: the shadow runs away from it, over the 15 m split
    lists.setDepth(VIEW, SZ, SL, BL, 0, -0.5, 0.866);
    expect(layersOf(lists, g)).toEqual([1, 2]);
    // the moon ahead: the shadow runs towards the camera, over the 6 m split
    lists.setDepth(VIEW, SZ, SL, BL, 0, -0.5, -0.866);
    const g2 = mk('cross2', 8);
    expect(layersOf(lists, g2)).toEqual([0, 1]);
  });

  it('a caster in the blend band is kept in both layers', () => {
    // layer 1 blends into 2 over 15 - 0.72 .. 15
    expect(shadowInDepth(14.6, 0.1, 0, cascadeNear(SZ, SL, BL, 1), cascadeFar(SZ, SL, BL, 1, 4))).toBe(true);
    expect(shadowInDepth(14.6, 0.1, 0, cascadeNear(SZ, SL, BL, 2), cascadeFar(SZ, SL, BL, 2, 4))).toBe(true);
    expect(shadowInDepth(13.9, 0.1, 0, cascadeNear(SZ, SL, BL, 2), cascadeFar(SZ, SL, BL, 2, 4))).toBe(false);
    const lists = new SunCascadeLists();
    lists.setDepth(VIEW, SZ, SL, BL, 0, -1, 0);
    expect(layersOf(lists, mk('band', 14.8))).toEqual([1, 2]);
  });

  it('a steep moon shortens the reach, a low one lengthens it (capped)', () => {
    expect(moonShadowLen(-1)).toBeCloseTo(SHADOW_DROP);
    expect(moonShadowLen(-0.5)).toBeCloseTo(2 * SHADOW_DROP);
    expect(moonShadowLen(-0.1)).toBe(SHADOW_LEN_CAP);
    expect(moonShadowLen(0)).toBe(SHADOW_LEN_CAP);
    // at 11 m, a moon behind the camera: steep (60 deg down) stays in layer 1, low (~17 deg) reaches layer 2
    const lists = new SunCascadeLists();
    const g = mk('elev', 9);
    lists.setDepth(VIEW, SZ, SL, BL, 0, -0.866, 0.5);
    expect(layersOf(lists, g)).toEqual([1]);
    lists.setDepth(VIEW, SZ, SL, BL, 0, -0.3, 0.954);
    expect(layersOf(lists, g)).toEqual([1, 2]);
  });

  it('no depth inputs: the x / y test only (as S6)', () => {
    const lists = new SunCascadeLists();
    lists.setDepth(null, SZ, SL, BL, 0, -1, 0);
    expect(layersOf(lists, mk('nodepth', 3))).toEqual([0, 1, 2, 3]);
    lists.setDepth(VIEW, null, null, BL, 0, -1, 0);
    expect(layersOf(lists, mk('nosplits', 3))).toEqual([0, 1, 2, 3]);
  });

  it('the per-frame fill allocates nothing (by structure)', () => {
    const src = SunCascadeLists.prototype.fill.toString() + SunCascadeLists.prototype.setDepth.toString();
    expect(src).not.toMatch(/\bnew\b|=>|\bfunction\b|\[\]|\{\s*\w+\s*:| of |\.(map|filter|slice|concat|forEach)\(/);
  });
});

describe('CSM split accessors (Babylon private fields)', () => {
  it('reads the split depths and lengths; fails if Babylon renames them', () => {
    const engine = new NullEngine();
    // (the null engine reports no CSM support; the split maths needs no GPU)
    (engine as unknown as { _features: { supportCSM: boolean } })._features.supportCSM = true;
    const spy = vi.spyOn(RenderTargetTexture.prototype, 'createDepthStencilTexture').mockImplementation(() => {});
    const scene = new Scene(engine);
    const cam = new FreeCamera('c', new Vector3(0, 2, 0), scene);
    cam.minZ = 0.1;
    cam.maxZ = 200;
    scene.activeCamera = cam;
    const sun = new DirectionalLight('s', new Vector3(0.3, -1, 0.2).normalize(), scene);
    const g = new CascadedShadowGenerator(256, sun);
    g.numCascades = 4;
    g.shadowMaxZ = 90;
    const z = csmSplitZ(g);
    const len = csmSplitLen(g);
    expect(z).not.toBeNull();
    expect(len).not.toBeNull();
    (g as unknown as { _splitFrustum(): void })._splitFrustum();
    const zs = Array.from(csmSplitZ(g)!);
    const ls = Array.from(csmSplitLen(g)!);
    expect(zs.length).toBe(4);
    expect(ls.length).toBe(4);
    for (let i = 1; i < 4; i++) expect(zs[i]!).toBeGreaterThan(zs[i - 1]!);
    expect(zs[3]!).toBeCloseTo(90, 0);
    for (const l of ls) expect(l).toBeGreaterThan(0);
    expect(zs[1]! - zs[0]!).toBeCloseTo(ls[1]!, 3);
    spy.mockRestore();
  });
});

describe('sunCasterDrawn (S9b: the moon list keeps only what Babylon draws from an entry)', () => {
  const scene = new Scene(new NullEngine());
  const cam = new FreeCamera('c', new Vector3(0, 2, -5), scene);
  scene.activeCamera = cam;
  const drawn = (ms: ReturnType<typeof CreateBox>[]): string[] => ms.filter(sunCasterDrawn).map((m) => m.name);

  it('skips a disabled mesh and one under a disabled parent; re-enabled comes back, and the change is observed', () => {
    const root = new TransformNode('guard', scene);
    const a = CreateBox('a', { size: 1 }, scene);
    const b = CreateBox('b', { size: 1 }, scene);
    a.parent = root;
    b.parent = root;
    let dirty = 0;
    const mark = (): void => {
      dirty++;
    };
    a.onEffectiveEnabledStateChangedObservable.add(mark);
    b.onEffectiveEnabledStateChangedObservable.add(mark);
    expect(drawn([a, b])).toEqual(['a', 'b']);
    b.setEnabled(false);
    expect(drawn([a, b])).toEqual(['a']);
    expect(dirty).toBe(1);
    b.setEnabled(true);
    expect(drawn([a, b])).toEqual(['a', 'b']);
    expect(dirty).toBe(2);
    // (a frozen guard: the root goes, every mesh under it is out and each notifies)
    root.setEnabled(false);
    expect(drawn([a, b])).toEqual([]);
    expect(dirty).toBe(4);
    root.setEnabled(true);
    expect(drawn([a, b])).toEqual(['a', 'b']);
    expect(dirty).toBe(6);
  });

  it('skips an invisible mesh', () => {
    const m = CreateBox('inv', { size: 1 }, scene);
    m.isVisible = false;
    expect(sunCasterDrawn(m)).toBe(false);
    m.isVisible = true;
    expect(sunCasterDrawn(m)).toBe(true);
  });

  it('LOD: the low level is out (blocked, drawn from its master), the master stays and picks the low level far away', () => {
    const hi = CreateBox('hi', { size: 1 }, scene);
    const lo = CreateBox('lo', { size: 1 }, scene);
    hi.addLODLevel(10, lo);
    expect(lo.isBlocked).toBe(true);
    expect(drawn([hi, lo])).toEqual(['hi']);
    hi.position.set(0, 0, 40);
    hi.computeWorldMatrix(true);
    expect(hi.getLOD(cam)).toBe(lo);
    // (the Detail setting re-registers the level: unblocked in between, blocked again after)
    hi.removeLODLevel(lo);
    expect(drawn([hi, lo])).toEqual(['hi', 'lo']);
    hi.addLODLevel(10, lo);
    expect(drawn([hi, lo])).toEqual(['hi']);
  });

  it('allocates nothing (by structure)', () => {
    expect(sunCasterDrawn.toString()).not.toMatch(/\bnew\b|=>|\bfunction\b\s*\(|\[\]/);
  });
});
