import { describe, expect, it } from 'vitest';
import { capAllows, capNext, GRAPHICS_PRESETS, PRESET_DISPLAY, PRESET_IDS, presetOf, qualityLevel, MAX_SHADOW_CASTERS, shadowSpec } from '../src/core/quality';
import { defaultSettings, sanitizeSettings, setAuto, setGfx, setPreset } from '../src/core/settings';

describe('graphics settings (3.0)', () => {
  it('every device defaults to Epic at native resolution', () => {
    const s = defaultSettings();
    expect(s.video.preset).toBe('epic');
    expect(s.video.gfx).toEqual(GRAPHICS_PRESETS.epic);
    expect(s.video.renderScale).toBe(1);
    expect(s.video.dynamicRes).toBe(false);
  });
  it('presets climb in cost', () => {
    const l = PRESET_IDS.map((p) => qualityLevel(p, GRAPHICS_PRESETS[p]));
    for (let i = 1; i < l.length; i++) {
      expect(l[i]!.realLights).toBeGreaterThan(l[i - 1]!.realLights);
      expect(l[i]!.shadow.casters).toBeGreaterThanOrEqual(l[i - 1]!.shadow.casters);
      // (3.1.7: never past the 16 textures a shader may use)
      expect(l[i]!.shadow.casters).toBeLessThanOrEqual(MAX_SHADOW_CASTERS);
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
    setGfx(s, 'reflections', 'off');
    const back = sanitizeSettings(JSON.parse(JSON.stringify(s)));
    expect(back.video.preset).toBe('custom');
    expect(back.video.gfx.lights).toBe(44);
    expect(back.video.gfx.reflections).toBe('off');
    expect(sanitizeSettings({ video: { renderScale: 9, fpsCap: 77, fovH: 200 } }).video).toMatchObject({ renderScale: 2, fpsCap: 0, fovH: 120 });
    const ph = defaultSettings();
    setPreset(ph, 'ultra');
    expect(ph.video.renderScale).toBe(PRESET_DISPLAY.ultra.renderScale);
  });
  it('3.1 ladder: one set of presets', () => {
    // render scale falls with the preset; Epic is native
    for (let i = 1; i < PRESET_IDS.length; i++) expect(PRESET_DISPLAY[PRESET_IDS[i]!].renderScale).toBeGreaterThanOrEqual(PRESET_DISPLAY[PRESET_IDS[i - 1]!].renderScale);
    expect(PRESET_DISPLAY.epic).toEqual({ renderScale: 1, upscaler: 'off' });
    const s = defaultSettings();
    setPreset(s, 'medium');
    expect(s.video.gfx).toEqual(GRAPHICS_PRESETS.medium);
    expect(s.video.renderScale).toBe(PRESET_DISPLAY.medium.renderScale);
    expect(s.video.upscaler).toBe('taau');
  });
  it('3.0 settings migrate: a preset takes the 3.1 values, a Custom set keeps its choices and gains the new fields', () => {
    const v30 = {
      video: {
        platform: 'auto', preset: 'high', renderScale: 1, upscaler: 'off', panini: 0, fpsCap: 0, fovH: 75, maxFov: 120,
        gfx: { shadows: 'high', lights: 24, ao: true, bloom: true, reflections: 'ssr', rtRes: 'half', gi: true, volumetrics: true, dof: true, motionBlur: false, lens: true, aa: 'taa', textures: 'high', detail: 'high', effects: 'high' },
      },
    };
    const a = sanitizeSettings(v30);
    expect(a.video.preset).toBe('high');
    expect(a.video.gfx).toEqual(GRAPHICS_PRESETS.high);
    expect(a.video.renderScale).toBe(1);
    const b = sanitizeSettings({ ...v30, video: { ...v30.video, preset: 'custom' } });
    expect(b.video.preset).toBe('custom');
    expect(b.video.gfx.lights).toBe(24);
    expect(b.video.gfx.volLights).toBe(GRAPHICS_PRESETS.epic.volLights);
    expect(b.video.gfx.postRes).toBe(GRAPHICS_PRESETS.epic.postRes);
    expect(sanitizeSettings({ video: { preset: 'low' } }).video.gfx).toEqual(GRAPHICS_PRESETS.low);
  });
  it('Auto (3.1): on by default and for 3.0 installs still on Epic; a hand-picked preset or feature turns it off', () => {
    expect(defaultSettings().video.auto).toBe(true);
    expect(sanitizeSettings({ video: { preset: 'epic' } }).video.auto).toBe(true);
    expect(sanitizeSettings({ video: { preset: 'high' } }).video.auto).toBe(false);
    expect(sanitizeSettings({ video: { preset: 'custom', gfx: { ...GRAPHICS_PRESETS.high, lights: 44 } } }).video.auto).toBe(false);
    const s = defaultSettings();
    setAuto(s, null);
    expect(s.video).toMatchObject({ auto: true, preset: 'high' });
    setAuto(s, 'medium');
    expect(s.video).toMatchObject({ auto: true, preset: 'medium', renderScale: PRESET_DISPLAY.medium.renderScale });
    setPreset(s, 'ultra');
    expect(s.video.auto).toBe(false);
    setAuto(s, 'low');
    setGfx(s, 'bloom', true);
    expect(s.video.auto).toBe(false);
    const d = sanitizeSettings({ video: { auto: true, device: { key: 'k', tier: 'ultra', source: 'calibrated' } } }).video.device;
    expect(d).toEqual({ key: 'k', tier: 'ultra', source: 'calibrated' });
    expect(sanitizeSettings({ video: { device: { key: 5, tier: 'mega', source: 'x' } } }).video.device).toEqual({ key: '', tier: null, source: 'none' });
  });
  it('the frame limiter renders every other frame for 60 on a 120 Hz display', () => {
    expect(capAllows(8.3, 60, 8.33)).toBe(false);
    expect(capAllows(16.6, 60, 8.33)).toBe(true);
    expect(capAllows(5, 0, 8.33)).toBe(true);
    expect(capAllows(6.9, 144, 6.94)).toBe(true);
  });
});

describe('capNext (frame limiter by deadline)', () => {
  const rate = (hz: number, cap: number): number => {
    let next = 0;
    let drawn = 0;
    for (let i = 0; i < hz * 4; i++) {
      const n = capNext(i * (1000 / hz), next, cap);
      if (n >= 0) {
        next = n;
        drawn++;
      }
    }
    return drawn / 4;
  };
  it('holds a 60 cap on 60, 90, 120 and 144 Hz displays', () => {
    for (const hz of [60, 90, 120, 144]) expect(Math.abs(rate(hz, 60) - 60)).toBeLessThanOrEqual(1);
  });
  it('a 30 cap on 60 Hz draws every other frame', () => {
    expect(rate(60, 30)).toBe(30);
  });
  it('restarts the clock after a long stall', () => {
    expect(capNext(1000, 16.7, 60)).toBeCloseTo(1016.67, 1);
  });
});
