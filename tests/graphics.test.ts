import { describe, expect, it } from 'vitest';
import { capAllows, GRAPHICS_PRESETS, presetOf, qualityLevel, shadowSpec } from '../src/core/quality';
import { defaultSettings, sanitizeSettings, setGfx, setPreset } from '../src/core/settings';

describe('graphics settings (3.0)', () => {
  it('every device defaults to Epic at native resolution', () => {
    const s = defaultSettings();
    expect(s.video.preset).toBe('epic');
    expect(s.video.gfx).toEqual(GRAPHICS_PRESETS.epic);
    expect(s.video.renderScale).toBe(1);
    expect(s.video.dynamicRes).toBe(false);
  });
  it('presets climb in cost', () => {
    const l = (['high', 'ultra', 'epic'] as const).map((p) => qualityLevel(p, GRAPHICS_PRESETS[p]));
    for (let i = 1; i < l.length; i++) {
      expect(l[i]!.realLights).toBeGreaterThan(l[i - 1]!.realLights);
      expect(l[i]!.shadow.casters).toBeGreaterThan(l[i - 1]!.shadow.casters);
      expect(l[i]!.detailScale).toBeGreaterThan(l[i - 1]!.detailScale);
    }
    expect(shadowSpec('off').casters).toBe(0);
    expect(shadowSpec('epic').soft).toBe(true);
  });
  it('changing a feature makes it Custom; matching a preset names it again', () => {
    const s = defaultSettings();
    setGfx(s, 'bloom', false);
    expect(s.video.preset).toBe('custom');
    setGfx(s, 'bloom', true);
    expect(s.video.preset).toBe('epic');
    setPreset(s, 'high');
    expect(s.video.gfx).toEqual(GRAPHICS_PRESETS.high);
    expect(presetOf({ ...GRAPHICS_PRESETS.ultra, lights: 40 })).toBe('custom');
  });
  it('settings from the phone era move to Epic; custom features survive a round trip', () => {
    const old = sanitizeSettings({ video: { quality: 'low', shadows: false, renderScale: 0.7 } });
    expect(old.video.preset).toBe('epic');
    expect(old.video.renderScale).toBe(0.7);
    const s = defaultSettings();
    setGfx(s, 'lights', 44);
    setGfx(s, 'ssr', false);
    const back = sanitizeSettings(JSON.parse(JSON.stringify(s)));
    expect(back.video.preset).toBe('custom');
    expect(back.video.gfx.lights).toBe(44);
    expect(back.video.gfx.ssr).toBe(false);
    expect(sanitizeSettings({ video: { renderScale: 9, fpsCap: 77, fovH: 200 } }).video).toMatchObject({ renderScale: 2, fpsCap: 0, fovH: 120 });
  });
  it('the frame limiter renders every other frame for 60 on a 120 Hz display', () => {
    expect(capAllows(8.3, 60, 8.33)).toBe(false);
    expect(capAllows(16.6, 60, 8.33)).toBe(true);
    expect(capAllows(5, 0, 8.33)).toBe(true);
    expect(capAllows(6.9, 144, 6.94)).toBe(true);
  });
});
