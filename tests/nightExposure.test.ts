import { describe, expect, it } from 'vitest';
import { EXPOSURE_GLSL, easeExposure, exposureBand, exposureK, NO_EXPOSURE, NV_EXPOSURE, nvExposure } from '../src/vfx/nightExposure';
import { luma709, nvColor, nvDrive, NV_TONE } from '../src/vfx/nightVision';

const H = NV_EXPOSURE.hdr;
const L = NV_EXPOSURE.ldr;
/** The tube's display luma (0..255) for an input luma (no glow, no veil, no grain). */
const tube = (a: number, lift = 1): number => luma709(nvColor(nvDrive(a, 0, lift))) * 255;
/** The input that gives a display luma `v` (0..255): the tube inverted by bisection. */
function input(v: number, lift = 1): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (tube(m, lift) < v) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}
/** CPU model of the measure on a half-float scene: the tube's input is display-encoded (the post stack's tone map is
 *  near identity below 0.8), the measure sees linear light compressed (l / (1 + l)). */
const hdrMean = (a: number): number => {
  const s = Math.pow(a, 2.2);
  return s / (1 + s);
};

describe('night vision frame auto-gain (nv-pass fix round)', () => {
  it('is 1 inside the band, lifts below it, pulls down above it, clamped to [min, max]', () => {
    expect(nvExposure(0.1, H.lo, H.hi)).toBe(1);
    expect(nvExposure(H.lo, H.lo, H.hi)).toBe(1);
    expect(nvExposure(H.hi, H.lo, H.hi)).toBe(1);
    expect(nvExposure(H.lo / 2, H.lo, H.hi)).toBeCloseTo(2, 12);
    expect(nvExposure(H.hi * 1.25, H.lo, H.hi)).toBeCloseTo(0.8, 12);
    expect(nvExposure(0, H.lo, H.hi)).toBe(NV_EXPOSURE.max);
    expect(nvExposure(1, H.lo, H.hi)).toBe(NV_EXPOSURE.min);
    expect(NV_EXPOSURE.min).toBe(0.6);
    // the off band gives 1 for any mean
    for (const m of [0, 0.01, 0.5, 1, 50]) expect(nvExposure(m, NO_EXPOSURE[0], NO_EXPOSURE[1], NO_EXPOSURE[2], NO_EXPOSURE[3])).toBe(1);
    expect(exposureBand(true)).toEqual([H.lo, H.hi, NV_EXPOSURE.min, NV_EXPOSURE.max]);
    expect(exposureBand(false)).toEqual([L.lo, L.hi, NV_EXPOSURE.min, NV_EXPOSURE.max]);
    expect(exposureBand(true)).toBe(exposureBand(true));
  });

  it('eases over about half a second, frame rate independent', () => {
    expect(NV_EXPOSURE.ease).toBe(0.5);
    expect(exposureK(0)).toBe(0);
    expect(exposureK(-1)).toBe(0);
    expect(exposureK(0.5)).toBeCloseTo(1 - Math.exp(-1), 12);
    // 60 fps and 30 fps reach the same value after 0.5 s
    let a = 0;
    let b = 0;
    for (let i = 0; i < 30; i++) a = easeExposure(a, 1, 1 / 60);
    for (let i = 0; i < 15; i++) b = easeExposure(b, 1, 1 / 30);
    expect(a).toBeCloseTo(b, 9);
    expect(a).toBeCloseTo(0.632, 3);
    for (let i = 0; i < 300; i++) a = easeExposure(a, 1, 1 / 60);
    expect(a).toBeCloseTo(1, 4);
  });

  it('the GLSL mirrors the formula', () => {
    expect(EXPOSURE_GLSL).toContain('float nvExposure(float m, vec4 e)');
    expect(EXPOSURE_GLSL).toContain('clamp(clamp(x, e.x, e.y) / x, e.z, e.w)');
    expect(EXPOSURE_GLSL).toContain('max(m, 0.0001)');
  });

  it('CPU model on Epic (CHECK-S12 means): lit rooms keep their look, yard-look reads, wh-yard does not clip', () => {
    // slices 1-2 centre means (0..255): lit rooms within 15%
    for (const v of [84, 71, 59, 68, 71, 49]) {
      const a = input(v);
      const g = nvExposure(hdrMean(a), H.lo, H.hi);
      expect(Math.abs(tube(a * g) / v - 1), `${v}`).toBeLessThan(0.15);
    }
    // yard-look: 14 -> at least 30
    const look = input(14);
    expect(tube(look * nvExposure(hdrMean(look), H.lo, H.hi))).toBeGreaterThanOrEqual(30);
    // wh-yard Epic (mean 196, 67% above 224): pulled down; even a full-white input stays far under 224
    const yard = input(196);
    const g = nvExposure(hdrMean(yard), H.lo, H.hi);
    expect(g).toBeLessThan(0.7);
    expect(tube(1 * g)).toBeLessThan(224);
  });

  it('CPU model on ?gfx=min: lit rooms sit in the 8-bit band, the post lift keeps NV at least as bright as off', () => {
    // [off, NV at postLift 2] centre means (CHECK-S12 table)
    const views: [number, number][] = [[40.3, 37.6], [34, 35.4], [45.8, 40.9], [22.6, 27.8], [40.1, 48.3], [39, 45.3], [49.6, 50.4], [29, 35.5]];
    for (const [off, nv2] of views) {
      expect(nvExposure(off / 255, L.lo, L.hi), `${off}`).toBe(1);
      const a = input(nv2, 2);
      expect(tube(a, NV_TONE.postLift), `${off}`).toBeGreaterThanOrEqual(off);
    }
  });
});
