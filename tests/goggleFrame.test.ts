import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GOGGLE_FRAME, GOGGLE_GLSL, goggleEdge, goggleFrame, goggleRim, goggleShade } from '../src/vfx/visionLook';

/** Share of a w x h pixel grid (pixel centres) whose frame factor is above `t`. */
function clearShare(aspect: number, w: number, h: number, t = 0.9): number {
  let n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (goggleFrame((x + 0.5) / w, (y + 0.5) / h, aspect) > t) n++;
  return n / (w * h);
}

describe('goggle frame (nv-pass slice 2: wide, thin, one goggle)', () => {
  it('shows most of the screen at 16:9 (was a 56%-wide circle)', () => {
    const s = clearShare(16 / 9, 320, 180);
    expect(s).toBeGreaterThanOrEqual(0.8);
    // still a frame, not nothing
    expect(s).toBeLessThan(0.97);
    // other desktop aspects keep most of the screen too
    expect(clearShare(4 / 3, 240, 180)).toBeGreaterThanOrEqual(0.8);
    expect(clearShare(21 / 9, 420, 180)).toBeGreaterThanOrEqual(0.8);
  });
  it('the centre is untouched and the corners never go near-black (was x0.06)', () => {
    expect(goggleFrame(0.5, 0.5, 16 / 9)).toBe(1);
    for (const [u, v] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
      const k = goggleFrame(u, v, 16 / 9);
      expect(k).toBeGreaterThanOrEqual(0.25);
      expect(k).toBeLessThan(0.5);
    }
    // the edge midpoints dim only softly
    expect(goggleFrame(0, 0.5, 16 / 9)).toBeGreaterThan(0.6);
    expect(goggleFrame(0.5, 0, 16 / 9)).toBeGreaterThan(0.6);
    // a portrait screen (phone test launch, G182) stays sane
    expect(goggleFrame(0.5, 0.5, 0.5)).toBe(1);
    expect(goggleFrame(0, 0, 0.5)).toBeGreaterThanOrEqual(0.25);
  });
  it('aspect-aware: the band is as wide at the sides as at the top, in screen heights', () => {
    const a = 16 / 9;
    // 0.03 screen heights in from the left edge vs from the top edge, at the middle of each side
    expect(goggleFrame(0.03 / a, 0.5, a)).toBeCloseTo(goggleFrame(0.5, 0.03, a), 6);
  });
  it('the falloff is monotone from the centre to a corner and lives only in the outer band', () => {
    let last = 2;
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const k = goggleFrame(0.5 - 0.5 * t, 0.5 - 0.5 * t, 16 / 9);
      expect(k).toBeLessThanOrEqual(last + 1e-9);
      last = k;
    }
    // full brightness until fadeIn inside the frame line
    expect(goggleShade(GOGGLE_FRAME.fadeIn)).toBe(1);
    expect(goggleShade(GOGGLE_FRAME.fadeOut)).toBe(GOGGLE_FRAME.floor);
    expect(GOGGLE_FRAME.floor).toBeGreaterThanOrEqual(0.25);
    expect(GOGGLE_FRAME.fadeIn).toBeLessThanOrEqual(0.1);
  });
  it('the rim is thin and faint', () => {
    expect(goggleRim(GOGGLE_FRAME.rimAt)).toBe(1);
    expect(goggleRim(GOGGLE_FRAME.rimAt + GOGGLE_FRAME.rimWidth)).toBe(0);
    expect(goggleRim(0.2)).toBe(0);
    expect(GOGGLE_FRAME.rimWidth).toBeLessThanOrEqual(0.006);
    expect(Math.max(...GOGGLE_FRAME.rimTint)).toBeLessThanOrEqual(0.06);
    // the screen-edge distance is 0 on the frame line at the edge midpoints (over 0)
    expect(goggleEdge(0, 0.5, 16 / 9)).toBeCloseTo(GOGGLE_FRAME.over === 0 ? 0 : GOGGLE_FRAME.over, 6);
  });
  it('the GLSL mirrors the constants and the cinematic pass uses it for every mode', () => {
    const f = (x: number): string => x.toFixed(4);
    for (const k of ['over', 'radius', 'floor', 'fadeIn', 'fadeOut', 'rimAt', 'rimWidth'] as const) expect(GOGGLE_GLSL).toContain(f(GOGGLE_FRAME[k]));
    expect(GOGGLE_GLSL).toContain(`vec3(${GOGGLE_FRAME.rimTint.map(f).join(', ')})`);
    const src = readFileSync(new URL('../src/vfx/cinematicPost.ts', import.meta.url), 'utf8');
    expect(src).toContain('${GOGGLE_GLSL}');
    expect(src).toContain('goggleShade(ge)');
    // the old round lens and eyepiece vignette are gone
    expect(src).not.toContain('smoothstep(0.8, 0.52');
    expect(src).not.toContain('0.455');
  });
});
