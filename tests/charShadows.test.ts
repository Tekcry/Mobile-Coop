/**
 * (lr16pol E, lrpolish 4 + 5) `CharShadows`: the atlas copy shader reads `gl_FragCoord` only (`copy()` skips the
 * wrapper's `scale` uniform, which feeds only `vUV`), and `covers` - which capsule a slot's copied map takes over - on a
 * null engine with a fake slot (the snapshot `copy()` leaves: `ready`, `spReady`, `kReady`, `fitReady`).
 */
import { describe, expect, it } from 'vitest';
import { CHAR_SHADOW, coneCovers, FIT, fitCone, fittedSpheres } from '../src/world/charShadowSet';
import { COPY_GLSL, type CharShadowLamps, type CharShadows } from '../src/world/charShadows';

describe('the atlas copy shader (lrpolish 4)', () => {
  it('reads gl_FragCoord, never vUV (the skipped scale uniform feeds only vUV)', () => {
    expect(COPY_GLSL).toContain('gl_FragCoord');
    expect(COPY_GLSL).not.toContain('vUV');
    expect(COPY_GLSL).not.toContain('scale');
  });
});

/** What `covers` reads of a slot (the rest of `CsSlot` is GPU state). */
interface FakeSlot {
  ready: number;
  spReady: Float32Array;
  kReady: number;
  fitReady: Float32Array;
}

/** One lamp at (0, 4, 0), reach 10; casters' spheres at (2, 1, 0) and (-2, 1, 1), r 0.4. */
const LAMP = [0, 4, 0] as const;
const CASTERS = new Float32Array([2, 1, 0, 0.4, -2, 1, 1, 0.4]);

async function shadows(): Promise<{ cs: CharShadows; slot: FakeSlot; dispose: () => void }> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { CharShadows: Cs } = await import('../src/world/charShadows');
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const lamps: CharShadowLamps = { count: 1, spheres: new Float32Array([LAMP[0], LAMP[1], LAMP[2], 10]), lampLit: () => true };
  const cs = new Cs(scene, lamps, []);
  // (as `copy()` leaves it: the fit and the fitted spheres of the map in the tile)
  const fitReady = new Float32Array(FIT.size);
  expect(fitCone(LAMP[0], LAMP[1], LAMP[2], CASTERS, 2, fitReady)).toBe(true);
  const spReady = new Float32Array(CASTERS.length);
  const kReady = fittedSpheres(LAMP[0], LAMP[1], LAMP[2], CASTERS, 2, spReady);
  expect(kReady).toBe(2);
  const slot: FakeSlot = { ready: 0, spReady, kReady, fitReady };
  (cs as unknown as { slots: FakeSlot[] }).slots = [slot];
  return { cs, slot, dispose: () => engine.dispose() };
}

describe('CharShadows.covers (lrpolish 5)', () => {
  it('a capsule midpoint inside a fitted sphere: covered (a full fit), else the cone test as today (a partial fit)', async () => {
    const { cs, slot, dispose } = await shadows();
    expect(slot.fitReady[FIT.partial]).toBe(0);
    expect(cs.covers(0, 2, 1, 0)).toBe(true);
    expect(cs.covers(0, -2, 1.2, 1)).toBe(true);
    // (inside the sphere + margin, off its centre)
    expect(cs.covers(0, 2 + 0.4 + CHAR_SHADOW.sphereMargin * 0.5, 1, 0)).toBe(true);
    // a partial fit (the cone capped): the answer is `coneCovers` with the 0.9 m capsule reach, as the code had it
    slot.fitReady[FIT.partial] = 1;
    for (const [x, y, z] of [[2, 1, 0], [-2, 1.2, 1]] as const) {
      expect(cs.covers(0, x, y, z)).toBe(coneCovers(slot.fitReady, LAMP[0], LAMP[1], LAMP[2], x, y, z, 0.9));
    }
    // a narrowed cone that misses the second caster: that capsule stays
    slot.fitReady[FIT.half] = 0.05;
    slot.fitReady[FIT.dx] = 2 / Math.sqrt(13);
    slot.fitReady[FIT.dy] = -3 / Math.sqrt(13);
    slot.fitReady[FIT.dz] = 0;
    expect(cs.covers(0, -2, 1, 1)).toBe(false);
    dispose();
  });

  it('a capsule midpoint outside every fitted sphere: not covered (it keeps its capsule)', async () => {
    const { cs, dispose } = await shadows();
    // newly in reach since the copy, between the two casters, and right under the lamp
    expect(cs.covers(0, 0, 1, 0.5)).toBe(false);
    expect(cs.covers(0, 4, 1, 0)).toBe(false);
    expect(cs.covers(0, 2, 2.5, 0)).toBe(false);
    dispose();
  });

  it('kReady 0 (nothing fitted, the spheres still in the array): not covered', async () => {
    const { cs, slot, dispose } = await shadows();
    slot.kReady = 0;
    expect(cs.covers(0, 2, 1, 0)).toBe(false);
    expect(cs.covers(0, -2, 1, 1)).toBe(false);
    dispose();
  });

  it('a caster whose sphere holds the lamp is skipped by the fit, so its capsule stays', async () => {
    const { cs, slot, dispose } = await shadows();
    // (a guard right under the lamp: his sphere reaches the light point)
    const sp = new Float32Array([0, 3.6, 0, 0.6, 2, 1, 0, 0.4]);
    slot.kReady = fittedSpheres(LAMP[0], LAMP[1], LAMP[2], sp, 2, slot.spReady);
    expect(slot.kReady).toBe(1);
    expect(cs.covers(0, 0, 3.6, 0)).toBe(false);
    expect(cs.covers(0, 2, 1, 0)).toBe(true);
    dispose();
  });

  it('no map in the tile (ready -1) or no such slot: not covered', async () => {
    const { cs, slot, dispose } = await shadows();
    slot.ready = -1;
    expect(cs.covers(0, 2, 1, 0)).toBe(false);
    slot.ready = 0;
    expect(cs.covers(1, 2, 1, 0)).toBe(false);
    dispose();
  });
});
