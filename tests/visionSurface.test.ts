import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ELECTRO,
  electroSurfaceColor,
  heatOf,
  surfaceTemp,
  THERMAL,
  THERMAL_SURFACE,
  THERMAL_SURFACE_GLSL,
  thermalColor,
  thermalHotShare,
  thermalSurfaceColor,
} from '../src/vfx/visionLook';

/**
 * (thermal-read) Thermal's and electro's scene from the depth: readable with no light at all (Michael 2026-10-27: "i cant
 * see any surfaces and cant tell where i am"; "electronic vision is also poor"). Picture only.
 */
const luma = (c: readonly number[]): number => 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
const S = THERMAL_SURFACE;

describe('thermal surfaces (thermal-read)', () => {
  it('in a blackout (no scene light) floors, walls and ceilings still differ, and stairs read (floor vs riser)', () => {
    const floor = surfaceTemp(1, 1, -1.6, 3, 0, 0, 0);
    const wall = surfaceTemp(0, 1, 0, 3, 0, 0, 0);
    const ceil = surfaceTemp(-1, 1, 1.5, 3, 0, 0, 0);
    expect(floor).toBeLessThan(wall);
    expect(wall).toBeLessThan(ceil);
    // a visible step in brightness between a tread and its riser
    expect(luma(thermalSurfaceColor(wall)) - luma(thermalSurfaceColor(floor))).toBeGreaterThan(0.03);
  });

  it('edges brighten, grazing faces darken, height warms, far surfaces fade to a flat cool, lit surfaces warm', () => {
    const base = surfaceTemp(0, 1, 0, 3, 0, 0, 0);
    expect(surfaceTemp(0, 1, 0, 3, 1, 0, 0)).toBeGreaterThan(base + 0.3);
    expect(surfaceTemp(0, 0.1, 0, 3, 0, 0, 0)).toBeLessThan(base * 0.8);
    expect(surfaceTemp(0, 1, 4, 3, 0, 0, 0)).toBeGreaterThan(base);
    expect(surfaceTemp(0, 1, 0, 100, 0, 0, 0)).toBeCloseTo(S.farT, 6);
    expect(surfaceTemp(0, 1, 0, 3, 0, THERMAL.coldTo, 0)).toBeCloseTo(base + S.lit, 6);
    for (const t of [surfaceTemp(1, 0, -10, 0, 0, 0, -1), surfaceTemp(-1, 1, 20, 0, 1, 1, 1)]) {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(1);
    }
  });

  it('the cool palette climbs in brightness and stays well under a body on the hot ramp', () => {
    let prev = -1;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const l = luma(thermalSurfaceColor(t));
      expect(l).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = l;
    }
    const body = luma(thermalColor(0.85));
    expect(luma(thermalSurfaceColor(1))).toBeLessThan(body * 0.75);
    // cool: blue over red everywhere
    for (const t of [0, 0.3, 0.6, 1]) {
      const c = thermalSurfaceColor(t);
      expect(c[2]).toBeGreaterThan(c[0]);
    }
  });

  it('people and the door silhouette take over the cold surface; a cold pixel keeps it', () => {
    expect(thermalHotShare(heatOf(0.2))).toBe(0);
    expect(thermalHotShare(heatOf(THERMAL.doorGhost))).toBe(1);
    expect(thermalHotShare(heatOf(0.95))).toBe(1);
    // e2e-darkness: the silhouette's blue clears an ordinary door leaf's by well over 40 / 255
    const ghost = thermalColor(THERMAL.doorGhost);
    const leaf = thermalSurfaceColor(surfaceTemp(0, 1, 0, 2.2, 0, 0, S.big / 2));
    expect((ghost[2] - leaf[2]) * 255).toBeGreaterThan(60);
  });

  it('electro: its own navy palette, readable steps, well under a live device', () => {
    const lo = electroSurfaceColor(0.2);
    const hi = electroSurfaceColor(1);
    expect(luma(hi) - luma(lo)).toBeGreaterThan(0.2);
    expect(luma(hi)).toBeLessThan(luma(ELECTRO.glow) * 0.5);
    expect(hi[2]).toBeGreaterThan(hi[0]);
  });

  it('GLSL mirror: depth in highp, sine-free, both palettes', () => {
    expect(THERMAL_SURFACE_GLSL).toContain('float surfaceField(vec2 uv, float lit)');
    expect(THERMAL_SURFACE_GLSL).toContain('vec3 surfaceColor(float t)');
    expect(THERMAL_SURFACE_GLSL).toContain('vec3 electroSurfaceColor(float t)');
    expect(THERMAL_SURFACE_GLSL).toContain('highp float tsViewZ(highp float d)');
    expect(THERMAL_SURFACE_GLSL).not.toContain('sin(');
  });
});

const walk = (dir: string, acc: string[] = []): string[] => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (p.endsWith('.ts')) acc.push(p);
  }
  return acc;
};

describe('gameplay never reads the vision look (thermal-read)', () => {
  it('src/ai, src/net, the light field / bake / meter and the noise model never import the look or the post passes', () => {
    const files = [...walk('src/ai'), ...walk('src/net'), 'src/world/lightField.ts', 'src/world/lightBake.ts', 'src/config/noise.ts'];
    for (const f of files) {
      let src: string;
      try {
        src = readFileSync(f, 'utf8');
      } catch {
        continue;
      }
      expect(src, f).not.toMatch(/visionLook|cinematicPost|postStack|THERMAL_SURFACE|surfaceTemp|viewDepth/);
    }
  });
});
