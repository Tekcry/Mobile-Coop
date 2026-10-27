import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ILLUM_GLSL,
  NV_ILLUM,
  illumCone,
  illumFalloff,
  illumLitFade,
  illumNear,
  illumWrap,
  nvIllumLevel,
} from '../src/vfx/nvIlluminator';

/** (nv-illuminator) The goggles' IR illuminator: its shape, and that it stays picture only (Michael 2026-10-27). */

const deg = (a: number): number => Math.cos((a * Math.PI) / 180);

const walk = (dir: string, acc: string[] = []): string[] => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (p.endsWith('.ts')) acc.push(p.replace(/\\/g, '/'));
  }
  return acc;
};

describe('nv illuminator shape', () => {
  it('falls off softly over its reach', () => {
    expect(illumFalloff(0)).toBe(1);
    expect(illumFalloff(NV_ILLUM.reach / 2)).toBeCloseTo(0.5625, 4);
    expect(illumFalloff(NV_ILLUM.reach)).toBe(0);
    expect(illumFalloff(NV_ILLUM.reach + 5)).toBe(0);
    let prev = 2;
    for (let d = 0; d <= NV_ILLUM.reach; d += 0.5) {
      const v = illumFalloff(d);
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
  });

  it('starts past the operator (nothing on their own body)', () => {
    expect(illumNear(0)).toBe(0);
    expect(illumNear(NV_ILLUM.nearFrom)).toBe(0);
    expect(illumNear(NV_ILLUM.nearTo)).toBe(1);
    expect(nvIllumLevel(1, 0.2, 1, 1, 0)).toBe(0);
  });

  it('a brighter centre, a wide fill round it, nothing behind', () => {
    expect(illumCone(1)).toBe(1);
    expect(illumCone(deg(10))).toBe(1);
    expect(illumCone(deg(50))).toBeCloseTo(NV_ILLUM.wide, 3);
    expect(illumCone(deg(25))).toBeGreaterThan(NV_ILLUM.wide);
    expect(illumCone(deg(25))).toBeLessThan(1);
    expect(illumCone(deg(90))).toBe(0);
    expect(illumCone(-1)).toBe(0);
  });

  it('wrapped N.L: a grazing floor still catches some, a back face none', () => {
    expect(illumWrap(1)).toBe(1);
    expect(illumWrap(0)).toBeCloseTo(1 / 3, 6);
    expect(illumWrap(-1)).toBe(0);
  });

  it('fades out where the bake is lit (lit areas keep their look)', () => {
    expect(illumLitFade(0)).toBe(1);
    expect(illumLitFade(NV_ILLUM.litFrom)).toBe(1);
    expect(illumLitFade(NV_ILLUM.litTo)).toBe(0);
    expect(illumLitFade(0.7)).toBe(0);
    for (const d of [1, 3, 6, 10]) expect(nvIllumLevel(1, d, 1, 1, 0.7)).toBe(0);
  });

  it('off with the goggles off, scaled by the night-vision blend', () => {
    expect(nvIllumLevel(0, 5, 1, 1, 0)).toBe(0);
    expect(nvIllumLevel(0.5, 5, 1, 1, 0)).toBeCloseTo(nvIllumLevel(1, 5, 1, 1, 0) / 2, 6);
  });

  it('total darkness: a wall ahead reads as a dim room, the floor never zero within reach', () => {
    // a wall facing the operator 6 m ahead in the centre: about a dark room's level (0.12 reads 10-45% under the goggles)
    const wall = nvIllumLevel(1, 6, 1, 1, 0);
    expect(wall).toBeGreaterThan(0.08);
    expect(wall).toBeLessThan(0.2);
    // never past the peak + floor
    for (let d = 0; d < 40; d += 0.25) for (const c of [1, deg(30), deg(60)]) expect(nvIllumLevel(1, d, c, 1, 0)).toBeLessThanOrEqual(NV_ILLUM.peak + NV_ILLUM.floor + 1e-9);
    // past the beam's reach only the floor is left
    expect(nvIllumLevel(1, 16, 1, 1, 0)).toBeCloseTo(NV_ILLUM.floor, 6);
    // the screen's edge (50 deg off the axis) at 4 m: the wide fill
    expect(nvIllumLevel(1, 4, deg(50), 1, 0)).toBeGreaterThan(0.05);
  });

  it('the GLSL mirror carries the same constants and the gate', () => {
    for (const k of [NV_ILLUM.reach, NV_ILLUM.peak, NV_ILLUM.wide, NV_ILLUM.floor, NV_ILLUM.litFrom, NV_ILLUM.litTo, NV_ILLUM.nearFrom, NV_ILLUM.nearTo]) {
      expect(ILLUM_GLSL).toContain(k.toFixed(4));
    }
    expect(ILLUM_GLSL).toMatch(/float nvIllum\(vec3 p, vec3 n, float s, vec4 o, vec4 dir\)/);
  });
});

describe('nv illuminator is picture only and local only', () => {
  it('only the lit materials and the render frame import it', () => {
    const allowed = new Set(['src/vfx/nvIlluminator.ts', 'src/world/bakedLamps.ts', 'src/game/gameState.ts']);
    const importers = walk('src').filter((f) => /from\s+['"][./]*(vfx\/)?nvIlluminator['"]/.test(readFileSync(f, 'utf8')));
    for (const f of importers) expect(allowed.has(f), f).toBe(true);
    expect(importers.sort()).toEqual(['src/game/gameState.ts', 'src/world/bakedLamps.ts']);
  });

  it('the light field, the bake, the meter, perception, AI and the wire never read it', () => {
    const bad = /nvIllum|NV_ILLUM|ILLUM_GLSL|setIlluminator|lampIllum|\.illum\b/;
    const files = [...walk('src/ai'), ...walk('src/net'), 'src/world/lightField.ts', 'src/world/lightBake.ts', 'src/world/lights.ts'];
    for (const f of walk('src')) if (/light(Meter|Field|Bake|Parity)|perception|ambientGrid|bounceGrid/i.test(f)) files.push(f);
    for (const f of files) {
      let src: string;
      try {
        src = readFileSync(f, 'utf8');
      } catch {
        continue;
      }
      expect(src, f).not.toMatch(bad);
    }
  });

  it('a shader term behind its gate, never a scene light', () => {
    const lamps = readFileSync('src/world/bakedLamps.ts', 'utf8');
    expect(lamps).toMatch(/if \(lampIllum\.w > 0\.0\) nsStat \+= nvIllum\(/);
    const gs = readFileSync('src/game/gameState.ts', 'utf8');
    expect(gs).toMatch(/setIlluminator\(v\.night,/);
    const own = readFileSync('src/vfx/nvIlluminator.ts', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(own).not.toMatch(/import|Light\(|LightRegistry|addLight/);
  });
});
