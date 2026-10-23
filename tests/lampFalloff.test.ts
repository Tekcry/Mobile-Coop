/**
 * (lightrev LR13; the only lamp model since LR16a) The baked lamps' photometric falloff: inverse square referenced at
 * `PHOTO.ref`, windowed to 0 at the reach (radius x `PHOTO.reach`), and the light field reads the same function as the
 * shaders' GLSL (light parity). Flashlights keep the linear `lampFalloff` (`lampTerm`).
 */
import { describe, expect, it } from 'vitest';
import * as lampMath from '../src/world/lampMath';
import { coneFeather, LAMP_CONE_COS, LAMP_EXP, LAMP_FEATHER, LAMP_LEVEL_GAIN, LAMP_MATH_GLSL, lampCone, lampFalloff, lampReach, PHOTO, PHOTO_NEAR2, PHOTO_NUM, photoFalloff, photoTerm, SPOT_EXP, SPOT_FEATHER } from '../src/world/lampMath';
import { TORCH_DRAW_GLSL } from '../src/world/shadowAccuracy';
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

/** (LR16b) The GLSL `nsLampCone` body run as JS (clamp, pow, max as GLSL defines them). */
function glslCone(glsl: string): (ca: number, cut: number, e: number) => number {
  const m = /float nsLampCone\(float ca, float cut, float e\) \{ ([^\n]*) \}\n/.exec(glsl);
  if (!m) throw new Error('nsLampCone not found');
  const lib = 'const clamp = (x, a, b) => Math.min(b, Math.max(a, x)); const pow = Math.pow; const max = Math.max; ';
  return new Function('ca', 'cut', 'e', lib + m[1]!.replace(/\bfloat /g, 'let ')) as (ca: number, cut: number, e: number) => number;
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

  it('inverse square from the reference distance with a smooth near term, 0 at the reach, never rising', () => {
    const R = 5 * PHOTO.reach;
    // 1 at the reference distance (less the window's small dip)
    expect(photoFalloff(PHOTO.ref, R)).toBeCloseTo(1 * (1 - (PHOTO.ref / R) ** 4) ** 2, 9);
    // inverse square far from the lamp (the near term fades), well inside the window
    expect(photoFalloff(20, 1000) / photoFalloff(40, 1000)).toBeCloseTo(4, 1);
    // (LR16b) (ref^2 + near^2) / (d^2 + near^2): finite at the lamp and still falling inside `near` (no plateau)
    expect(PHOTO_NUM).toBe(PHOTO.ref ** 2 + PHOTO.near ** 2);
    expect(photoFalloff(0, R)).toBeCloseTo(PHOTO_NUM / PHOTO_NEAR2, 9);
    expect(photoFalloff(0.5, R)).toBeLessThan(photoFalloff(0.2, R));
    expect(photoFalloff(0.2, R)).toBeCloseTo((PHOTO_NUM / (0.04 + PHOTO_NEAR2)) * (1 - (0.2 / R) ** 4) ** 2, 9);
    expect(photoFalloff(R, R)).toBe(0);
    expect(photoFalloff(R + 1, R)).toBe(0);
    let last = Infinity;
    for (let d = 0; d < R; d += 0.05) {
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
      // the guards' sample (`levelAt`) is the same field: ambient 0 and no moon here, so the lamp and (LR16-1) its bounce
      expect(field.levelAt(x, y, z)).toBeCloseTo(Math.min(1, want + field.bounceAt(x, y, z)), 5);
    }
    expect(field.levelAt(2, 0.1, 1)).toBeGreaterThan(0.1);
  });

  it('the lamp loop and the volume mix hold LAMP_MATH_GLSL verbatim (no runtime swap)', () => {
    for (const src of [LAMP_GLSL, MIX_GLSL]) expect(src.includes(LAMP_MATH_GLSL)).toBe(true);
  });
});

describe('(LR16b) soft light edges: no step in falloff x cone', () => {
  it('the cone rises from 0 at the cut by a smoothstep over the feather band, with a bounded slope', () => {
    for (const [cut, e] of [[LAMP_CONE_COS, LAMP_EXP], [Math.cos(0.34), SPOT_EXP], [Math.cos(0.6), SPOT_EXP], [0.5, 3]] as const) {
      const band = coneFeather(e) * (1 - cut);
      expect(lampCone(cut, cut, e)).toBe(0);
      expect(lampCone(cut + 1e-9, cut, e)).toBeLessThan(1e-6);
      expect(lampCone(cut + band, cut, e)).toBeCloseTo((cut + band) ** e, 9);
      expect(lampCone(cut + band / 2, cut, e)).toBeCloseTo(0.5 * (cut + band / 2) ** e, 9);
      // slope in cos: the smoothstep's 1.5 / band x c^e plus the power's e x c^(e-1)
      const bound = 1.5 / band + e + 1e-6;
      const h = 1e-4;
      for (let c = cut - 0.05; c < 1 - h; c += h) expect(Math.abs(lampCone(c + h, cut, e) - lampCone(c, cut, e)) / h).toBeLessThanOrEqual(bound);
    }
    expect(coneFeather(LAMP_EXP)).toBe(LAMP_FEATHER);
    expect(coneFeather(SPOT_EXP)).toBe(SPOT_FEATHER);
  });

  it('the falloff is smooth from the lamp to the reach (bounded slope, no kink at near)', () => {
    for (const R of [4, 8.64, 13]) {
      const h = 1e-3;
      // d/dd of num / (d^2 + near^2) peaks at d = near / sqrt(3): 3 sqrt(3) / 8 x num / near^3; the window adds a little near the reach
      const bound = ((3 * Math.sqrt(3)) / 8) * (PHOTO_NUM / PHOTO.near ** 3) * 1.6;
      for (let d = 0; d < R; d += h) expect(Math.abs(photoFalloff(d + h, R) - photoFalloff(d, R)) / h).toBeLessThanOrEqual(bound);
    }
  });

  it('down a wall near a lamp, through its cut: a gradient that widens with the distance, no step (the 4.78 Workshop arch)', () => {
    const R = 6 * PHOTO.reach;
    const h = 1e-3;
    // the LR16a formula (hard cut x the 9x plateau inside 1 m), for the size of the step it drew
    const old = (w: number, y: number): number => { const d = Math.hypot(w, y); const ca = -y / d; return ca < LAMP_CONE_COS ? 0 : (9 / Math.max(d, 1) ** 2) * ca; };
    let last = Infinity;
    for (const wall of [0.4, 1, 2]) {
      let prev = photoTerm(wall, 0.3, 0, R, 0, -1, 0, LAMP_CONE_COS, LAMP_EXP);
      let worst = 0;
      for (let y = 0.3 - h; y > -3; y -= h) {
        const v = photoTerm(wall, y, 0, R, 0, -1, 0, LAMP_CONE_COS, LAMP_EXP);
        worst = Math.max(worst, Math.abs(v - prev));
        prev = v;
      }
      const yCut = (-wall * LAMP_CONE_COS) / Math.sqrt(1 - LAMP_CONE_COS ** 2);
      const step = Math.abs(old(wall, yCut - 1e-6) - old(wall, yCut + 1e-6));
      // the old step at the cut; now under a tenth of it per mm of wall, and softer the farther the wall
      expect(step).toBeGreaterThan(0.04);
      expect(worst).toBeLessThan(step / 10);
      expect(worst).toBeLessThan(last);
      last = worst;
    }
  });

  it('GLSL / TS parity: the shaders run the same cone and falloff, from the same constants', () => {
    const cone = glslCone(LAMP_MATH_GLSL);
    const fall = glslFalloff(LAMP_MATH_GLSL);
    for (const [cut, e] of [[LAMP_CONE_COS, LAMP_EXP], [Math.cos(0.34), SPOT_EXP], [Math.cos(0.6), SPOT_EXP]] as const) {
      for (let c = -0.2; c <= 1; c += 0.0137) expect(cone(c, cut, e)).toBeCloseTo(lampCone(c, cut, e), 9);
    }
    for (let d = 0; d < 14; d += 0.0371) expect(fall(d, 13)).toBeCloseTo(photoFalloff(d, 13), 9);
    const glf = (v: number): string => (Number.isInteger(v) ? `${v}.0` : `${v}`);
    for (const k of [PHOTO_NUM, PHOTO_NEAR2, LAMP_FEATHER, SPOT_FEATHER]) expect(LAMP_MATH_GLSL).toContain(glf(k));
    // the guard torches' draw runs the same feathered cone (soft beam edges)
    expect(TORCH_DRAW_GLSL).toContain('nsLampCone(ca, tb.w, 2.0)');
    expect(TORCH_DRAW_GLSL).not.toContain('ca * ca');
  });

  it('meter = shader formula at 200 seeded points, the feather band included', () => {
    const { field, reg, baked } = bayField();
    const l = reg.lights[0]!;
    const cone = glslCone(LAMP_MATH_GLSL);
    const fall = glslFalloff(LAMP_MATH_GLSL);
    let seed = 11;
    const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let band = 0;
    let lit = 0;
    for (let k = 0; k < 200; k++) {
      const x = -8 + rnd() * 16;
      const y = 0.05 + rnd() * 5.5;
      const z = -8 + rnd() * 16;
      const vx = x - l.x;
      const vy = y - l.y;
      const vz = z - l.z;
      const d = Math.sqrt(vx * vx + vy * vy + vz * vz);
      const ca = -vy / d;
      if (d < l.radius && ca > LAMP_CONE_COS && ca < LAMP_CONE_COS + LAMP_FEATHER * (1 - LAMP_CONE_COS)) band++;
      const vis = field.visAt(0, x, y, z);
      const shader = d >= baked.lights[3]! ? 0 : LAMP_LEVEL_GAIN * l.intensity * fall(d, baked.lights[3]!) * cone(ca, LAMP_CONE_COS, LAMP_EXP) * vis;
      const meter = field.lampAt(0, x, y, z);
      expect(meter, `${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}`).toBeCloseTo(shader, 6);
      expect(meter).toBeCloseTo(LAMP_LEVEL_GAIN * l.intensity * photoTerm(vx, vy, vz, baked.lights[3]!, 0, -1, 0, LAMP_CONE_COS, LAMP_EXP) * vis, 6);
      if (meter > 0.01) lit++;
    }
    expect(band).toBeGreaterThan(5);
    expect(lit).toBeGreaterThan(50);
  });
});
