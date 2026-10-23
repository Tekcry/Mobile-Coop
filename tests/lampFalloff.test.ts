/**
 * (lightrev LR13; the only lamp model since LR16a) The baked lamps' photometric falloff: inverse square referenced at
 * `PHOTO.ref`, windowed to 0 at the reach (radius x `PHOTO.reach`), and the light field reads the same function as the
 * shaders' GLSL (light parity). Flashlights keep the linear `lampFalloff` (`lampTerm`).
 */
import { describe, expect, it } from 'vitest';
import * as lampMath from '../src/world/lampMath';
import { LAMP_LEVEL_GAIN, LAMP_MATH_GLSL, lampFalloff, lampReach, PHOTO, photoFalloff } from '../src/world/lampMath';
import { LightRegistry } from '../src/world/lights';
import { LevelBuilder } from '../src/world/levelBuilder';
import { canonicalLightSet } from '../src/voxel/lightShapes';
import { bakeLamps } from '../src/voxel/lampBake';
import { bakedLights, type LightBake } from '../src/world/lightBake';
import { buildAmbientGrid } from '../src/world/ambientGrid';
import { LightField } from '../src/world/lightField';
import { LAMP_GLSL, MIX_GLSL } from '../src/world/bakedLamps';

/** The GLSL `nsLampFalloff` body run as JS (float -> let, max -> Math.max): the shaders' own formula, evaluated. */
function glslFalloff(glsl: string): (d: number, r: number) => number {
  const m = /float nsLampFalloff\(float d, float r\) \{ ([^\n]*) \}\n/.exec(glsl);
  if (!m) throw new Error('nsLampFalloff not found');
  return new Function('d', 'r', m[1]!.replace(/\bfloat /g, 'let ').replace(/\bmax\(/g, 'Math.max(')) as (d: number, r: number) => number;
}

/** One lamp 5.58 m over a floor (the Sector Ops S1 strip, old radius 5.4), baked. */
function bayField(): { field: LightField; reg: LightRegistry; baked: ReturnType<typeof bakedLights> } {
  const b = new LevelBuilder();
  b.box(0, -0.25, 0, 30, 0.5, 30, '#777');
  b.light({ x: 0, y: 5.58, z: 0, radius: 5.4, intensity: 0.7 });
  const set = canonicalLightSet(b.boxes, b.cylinders, 'falloffTest', false);
  const reg = b.lights;
  reg.ambient = 0;
  const baked = bakedLights(reg);
  const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi });
  const ambient = buildAmbientGrid({ ambientAt: () => 0 }, set.lo, set.hi);
  const bake = { lo: set.lo, hi: set.hi, lampKey: 't', moonKey: 't', lamps: { baked, r }, moon: null, ambient, moonLight: 0, ms: 0 } as unknown as LightBake;
  return { field: new LightField(bake, reg), reg, baked };
}

describe('lamp falloff: one model (LR16a)', () => {
  it('no mode switch is left: no setter, no mode getter, no second GLSL', () => {
    const names = Object.keys(lampMath);
    for (const gone of ['setLampFalloff', 'lampFalloffMode', 'matchLampFalloff', 'bakedFalloff', 'lampMathGlsl', 'LAMP_MATH_GLSL_PHOTO', 'LAMP_FALLOFFS']) expect(names).not.toContain(gone);
    expect(lampReach(5.4)).toBeCloseTo(5.4 * PHOTO.reach, 9);
  });

  it('inverse square from the reference distance, 0 at the reach, never rising', () => {
    const R = 5 * PHOTO.reach;
    // 1 at the reference distance (less the window's small dip)
    expect(photoFalloff(PHOTO.ref, R)).toBeCloseTo(1 * (1 - (PHOTO.ref / R) ** 4) ** 2, 9);
    // inverse square between two distances well inside the window
    expect(photoFalloff(2, 100) / photoFalloff(4, 100)).toBeCloseTo(4, 3);
    // clamped inside `near`, 0 at and past the reach
    expect(photoFalloff(0.2, R)).toBeCloseTo(photoFalloff(PHOTO.near, R) / (1 - (PHOTO.near / R) ** 4) ** 2 * (1 - (0.2 / R) ** 4) ** 2, 9);
    expect(photoFalloff(R, R)).toBe(0);
    expect(photoFalloff(R + 1, R)).toBe(0);
    let last = Infinity;
    for (let d = PHOTO.near; d < R; d += 0.05) {
      const f = photoFalloff(d, R);
      expect(f).toBeLessThanOrEqual(last + 1e-12);
      last = f;
    }
    expect(LAMP_MATH_GLSL).toContain('float nsLampFalloff(float d, float r)');
  });

  it('the registry scales fixed lamps to the reach, never flashlights', () => {
    const reg = new LightRegistry();
    expect(reg.add({ x: 0, y: 5, z: 0, radius: 5, intensity: 0.7 }).radius).toBeCloseTo(5 * PHOTO.reach, 9);
    expect(reg.add({ kind: 'flashlight', x: 0, y: 1, z: 0, radius: 13, intensity: 0.85 }).radius).toBe(13);
  });

  it('the light field reads the photometric formula with the baked visibility', () => {
    const { field, reg } = bayField();
    const l = reg.lights[0]!;
    expect(l.radius).toBeCloseTo(5.4 * PHOTO.reach, 9);
    for (const [x, y, z] of [[0, 0.1, 0], [0, 1.02, 0], [2, 0.1, 1], [3, 1.5, -2]] as const) {
      const d = Math.sqrt((x - l.x) ** 2 + (y - l.y) ** 2 + (z - l.z) ** 2);
      const cone = (l.y - y) / d; // the lamp hemisphere: cos from straight down, exponent 1
      const want = LAMP_LEVEL_GAIN * l.intensity * photoFalloff(d, l.radius) * cone * field.visAt(0, x, y, z);
      expect(field.lampAt(0, x, y, z)).toBeCloseTo(want, 6);
    }
    // the floor under it is lit (the old linear model with radius 5.4: 0)
    expect(lampFalloff(5.58 - 0.1, 5.4)).toBe(0);
    expect(field.lampAt(0, 0, 0.1, 0)).toBeGreaterThan(0.15);
  });
});

describe('meter, perception and shaders read one source', () => {
  it('the GLSL evaluates to the TS formula the field uses', () => {
    const pho = glslFalloff(LAMP_MATH_GLSL);
    for (const r of [4, 8.64, 13]) {
      for (let d = 0; d <= r + 1; d += 0.37) expect(pho(d, r)).toBeCloseTo(photoFalloff(d, r), 6);
    }
  });

  it("the field (the meter's bodyLevel and the guards' levelAt) = the shaders' GLSL formula x the shaders' lamp data", () => {
    const { field, reg, baked } = bayField();
    const l = reg.lights[0]!;
    // one reach for all: the registry, the shaders' lamp data (`bakedLights`, column 3) and the falloff
    expect(baked.lights[3]).toBeCloseTo(l.radius, 5);
    const glsl = glslFalloff(LAMP_MATH_GLSL);
    for (const [x, y, z] of [[0, 0.1, 0], [0, 1.02, 0], [2, 0.1, 1], [3, 1.5, -2], [4.5, 0.1, 0]] as const) {
      const d = Math.sqrt((x - l.x) ** 2 + (y - l.y) ** 2 + (z - l.z) ** 2);
      const cone = (l.y - y) / d;
      const want = LAMP_LEVEL_GAIN * l.intensity * glsl(d, baked.lights[3]!) * cone * field.visAt(0, x, y, z);
      expect(field.lampAt(0, x, y, z)).toBeCloseTo(want, 6);
      // the guards' sample (`levelAt`) is the same field: ambient 0 and no moon here, so the lamp alone
      expect(field.levelAt(x, y, z)).toBeCloseTo(Math.min(1, want), 5);
    }
    expect(field.levelAt(2, 0.1, 1)).toBeGreaterThan(0.1);
  });

  it('the lamp loop and the volume mix hold LAMP_MATH_GLSL verbatim (no runtime swap)', () => {
    for (const src of [LAMP_GLSL, MIX_GLSL]) expect(src.includes(LAMP_MATH_GLSL)).toBe(true);
  });
});
