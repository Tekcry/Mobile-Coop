/**
 * (piano SO5) Lightning as sky light in the one lighting system: the flash timeline, and the light field adding
 * `sky visibility x flash` to its moon term, so a window lets a strike in, a closed room stays dark, a character
 * between shadows it, and the meter and guard sight read the same step's value. The bake comes from `bakeLevelLight`
 * on a moonless map (the moon job run inline here: no worker in node).
 */
import { describe, expect, it, vi } from 'vitest';
import type * as LampJobs from '../src/voxel/lampJobs';
import { bakeMoon, MOON_CELL } from '../src/voxel/skyBake';
import { packShapes, type VoxelShape } from '../src/voxel/shapes';
import { LightRegistry } from '../src/world/lights';
import { LightField } from '../src/world/lightField';
import { DEMO_LIGHTNING, FLASH_GAIN, FLASH_RISE, Lightning } from '../src/world/lightning';
import { CAPSULE, capsuleTransmit, CHAR_LIGHT, CharOccluders, OCC_KIND } from '../src/world/charOccluders';
import { lightFactor } from '../src/ai/perception';
import { bytesPerCall, HEAP_NUMBER, inputs, sink } from './helpers/allocPerCall';

vi.mock('../src/voxel/lampJobs', async (importOriginal) => ({
  ...(await importOriginal<typeof LampJobs>()),
  // the moon bake inline (the game runs it in a worker; the same `bakeMoon`)
  bakeLevelMoon: async (shapes: Float32Array, lo: [number, number, number], hi: [number, number, number], dir: [number, number, number]) => {
    const n: [number, number, number] = [Math.ceil((hi[0] - lo[0]) / MOON_CELL), Math.ceil((hi[1] - lo[1]) / MOON_CELL), Math.ceil((hi[2] - lo[2]) / MOON_CELL)];
    return bakeMoon({ kind: 'moon', id: 0, origin: lo, n, shapes, dir });
  },
}));

const { bakeLevelLight } = await import('../src/world/lightBake');

const box = (c: [number, number, number], s: [number, number, number]): VoxelShape => ({ kind: 'box', c, s, yaw: 0, pitch: 0, mat: 1 });

/** Room A (x -4..0, z -3..3) with a window in its east wall (y 0.8..2.4, z -1.5..1.5) facing the sky; room B
 *  (x -4..0, z 5..10) shut on every side; both roofed. The sky light comes from +x, 45 degrees up. */
const SHAPES = packShapes([
  box([0, -0.25, 3], [24, 0.5, 24]),
  // room A
  box([-4.1, 1.6, 0], [0.2, 3.2, 6.4]),
  box([-2, 1.6, -3.1], [4.4, 3.2, 0.2]),
  box([-2, 1.6, 3.1], [4.4, 3.2, 0.2]),
  box([0, 0.4, 0], [0.2, 0.8, 6.4]),
  box([0, 2.8, 0], [0.2, 0.8, 6.4]),
  box([0, 1.6, -2.35], [0.2, 1.6, 1.7]),
  box([0, 1.6, 2.35], [0.2, 1.6, 1.7]),
  box([-2, 3.3, 0], [4.6, 0.2, 6.6]),
  // room B
  box([-4.1, 1.6, 7.5], [0.2, 3.2, 5.4]),
  box([0, 1.6, 7.5], [0.2, 3.2, 5.4]),
  box([-2, 1.6, 4.9], [4.4, 3.2, 0.2]),
  box([-2, 1.6, 10.1], [4.4, 3.2, 0.2]),
  box([-2, 3.3, 7.5], [4.6, 0.2, 5.6]),
]);
const S = Math.SQRT1_2;
/** By the window, its sky ray through the opening (cell centre). */
const WIN = [-0.75, 0.75, 0.25] as const;
/** In the shut room. */
const SHUT = [-2.25, 1.25, 7.25] as const;
const AMB = 0.02;

async function field(): Promise<{ f: LightField; reg: LightRegistry }> {
  const reg = new LightRegistry();
  reg.ambient = AMB;
  // a moonless map (`moonLight` 0): the sky grid must still be baked for its lightning
  const bake = await bakeLevelLight({ mapId: 'so5-test', seed: 1, shapes: SHAPES, shapesHash: 'so5', lo: [-8, -1, -6], hi: [6, 6, 12], reg, sunDir: [-S, -S, 0], moonLight: 0 });
  expect(bake.moonLight).toBe(0);
  expect(bake.moon.vis.length).toBe(bake.moon.n[0] * bake.moon.n[1] * bake.moon.n[2]);
  return { f: new LightField(bake, reg), reg };
}

describe('lightning timeline (piano SO5)', () => {
  const lt = new Lightning({ flashes: [{ t: 5, peak: 0.5, len: 0.2 }, { t: 2, peak: 1, len: 0.25 }, { t: 2.2, peak: 0.7, len: 0.3 }] });

  it('dark before, between and after the strikes; a fast rise to the peak, then a fall over its length', () => {
    expect(lt.count).toBe(3);
    expect(lt.flashAt(0)).toBe(0);
    expect(lt.flashAt(1.99)).toBe(0);
    expect(lt.flashAt(2 + FLASH_RISE / 2)).toBeCloseTo(0.5, 12);
    expect(lt.flashAt(2 + FLASH_RISE)).toBeCloseTo(1, 12);
    // falling: each sample after the peak no brighter than the one before (until the double strike's own rise)
    let prev = 1;
    for (let t = 2 + FLASH_RISE; t < 2.2; t += 0.01) {
      const v = lt.flashAt(t);
      expect(v).toBeLessThanOrEqual(prev + 1e-12);
      prev = v;
    }
    // the double strike: the second entry lights it again
    expect(lt.flashAt(2.2 + FLASH_RISE)).toBeCloseTo(0.7, 12);
    expect(lt.flashAt(2.2 + FLASH_RISE + 0.301)).toBe(0);
    expect(lt.flashAt(4)).toBe(0);
    expect(lt.flashAt(5 + FLASH_RISE)).toBeCloseTo(0.5, 12);
    expect(lt.flashAt(5.3)).toBe(0);
    expect(lt.flashAt(1e6)).toBe(0);
  });

  it('deterministic: the same data and clock give the same bits; the level is flash x FLASH_GAIN at clock - t0', () => {
    const b = new Lightning({ flashes: [{ t: 2.2, peak: 0.7, len: 0.3 }, { t: 5, peak: 0.5, len: 0.2 }, { t: 2, peak: 1, len: 0.25 }] });
    for (let t = 0; t < 6; t += 0.0137) expect(Object.is(b.flashAt(t), lt.flashAt(t))).toBe(true);
    b.t0 = 100;
    expect(b.levelAt(102 + FLASH_RISE)).toBeCloseTo(FLASH_GAIN, 12);
    expect(b.levelAt(2 + FLASH_RISE)).toBe(0);
  });

  it('the demo loops on its period', () => {
    const d = new Lightning(DEMO_LIGHTNING);
    const t = DEMO_LIGHTNING.flashes[0]!.t + FLASH_RISE;
    expect(d.flashAt(t)).toBeGreaterThan(0.9);
    expect(d.flashAt(t + 3 * DEMO_LIGHTNING.period!)).toBeCloseTo(d.flashAt(t), 9);
    expect(d.flashAt(0.5)).toBe(0);
  });
});

describe('lightning in the light field (piano SO5)', async () => {
  const { f } = await field();
  const lt = new Lightning({ flashes: [{ t: 3, peak: 1, len: 0.25 }] });
  const peak = 3 + FLASH_RISE;

  it('by the window: dark, then lit at the peak, then dark again; a shut room stays dark at the peak', () => {
    const vis = f.moonAt(...WIN);
    expect(vis).toBeGreaterThan(0.5);
    expect(f.moonAt(...SHUT)).toBe(0);
    f.setFlash(lt.levelAt(1));
    const dark = f.levelAt(...WIN);
    const shut = f.levelAt(...SHUT);
    expect(dark).toBeCloseTo(AMB, 2);
    f.setFlash(lt.levelAt(peak));
    expect(f.flashLevel).toBeCloseTo(FLASH_GAIN, 12);
    expect(f.levelAt(...WIN)).toBeCloseTo(dark + FLASH_GAIN * vis, 12);
    expect(f.totalAt(...WIN)).toBeCloseTo(dark + FLASH_GAIN * vis, 12);
    expect(Object.is(f.levelAt(...SHUT), shut)).toBe(true);
    // the gameplay set lists the strike as the sky member (-1)
    expect(f.sourceAt(-1, ...WIN)).toBeCloseTo(FLASH_GAIN * vis, 12);
    f.setFlash(lt.levelAt(4));
    expect(Object.is(f.levelAt(...WIN), dark)).toBe(true);
  });

  it('the meter and guard sight read the flash in the same step', () => {
    f.setFlash(lt.levelAt(1));
    const meter0 = f.bodyLevel(WIN[0], 0, WIN[2], 1.0);
    const guard0 = lightFactor(f.totalAt(...WIN));
    // one step: the level set once, then both sample
    f.setFlash(lt.levelAt(peak));
    const meter1 = f.bodyLevel(WIN[0], 0, WIN[2], 1.0);
    const guard1 = lightFactor(f.totalAt(...WIN));
    expect(meter1).toBeGreaterThan(meter0 + 0.2);
    expect(guard1).toBeGreaterThan(guard0 * 2);
    expect(lightFactor(meter1)).toBeGreaterThanOrEqual(guard1 - 1e-12);
  });

  it('a character between the window and the point shadows the strike', () => {
    f.setFlash(lt.levelAt(1));
    const dark = f.totalAt(...WIN);
    f.setFlash(lt.levelAt(peak));
    const lit = f.totalAt(...WIN);
    const vis = f.moonAt(...WIN);
    // a guard 0.5 m towards the sky, lying across the ray (a horizontal capsule along z)
    const cx = WIN[0] + S * 0.5;
    const cy = WIN[1] + S * 0.5;
    const cz = WIN[2];
    const c = new CharOccluders();
    c.add(OCC_KIND.guard, 1, cx, cy, cz - 0.6, cx, cy, cz + 0.6, 0.3);
    const far = CHAR_LIGHT.moonFar;
    const T = capsuleTransmit(...WIN, WIN[0] + S * far, WIN[1] + S * far, WIN[2], cx, cy, cz - 0.6, cx, cy, cz + 0.6, 0.3);
    expect(T).toBe(CAPSULE.floor);
    const shaded = f.totalAt(...WIN, undefined, c, -1);
    expect(shaded).toBeLessThan(lit - 0.2);
    expect(shaded).toBeCloseTo(dark + FLASH_GAIN * vis * T, 12);
    f.setFlash(0);
  });

  it('allocation-free: flashAt, and the field step (setFlash + levelAt)', async () => {
    const T = inputs(2000, (k) => (k % 400) * 0.03);
    const X = inputs(2000, (k) => -3.75 + (k % 15) * 0.25);
    const fa = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) sink[0]! += lt.flashAt(T[i]!);
    }, 2 * HEAP_NUMBER);
    const st = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) {
        f.setFlash(lt.levelAt(T[i]!));
        sink[1]! += f.levelAt(X[i]!, 0.75, 0.25);
      }
    }, 6 * HEAP_NUMBER);
    f.setFlash(0);
    console.info(`bytes per flashAt ${fa.toFixed(1)}, per setFlash + levelAt ${st.toFixed(1)}`);
    // only V8 boxing doubles across calls it does not inline; one { x, y, z } would read 48 B or more
    expect(fa).toBeLessThanOrEqual(2 * HEAP_NUMBER);
    expect(st).toBeLessThanOrEqual(6 * HEAP_NUMBER);
  });
});
