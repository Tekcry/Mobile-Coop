import { describe, expect, it } from 'vitest';
import { capAllows, forPlatform, GRAPHICS_PRESETS, MOBILE_PRESET_IDS, PRESET_DISPLAY, PRESET_IDS, presetOf, qualityLevel, shadowSpec, VOXEL_TIER } from '../src/core/quality';
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
    setGfx(s, 'reflections', 'off');
    const back = sanitizeSettings(JSON.parse(JSON.stringify(s)));
    expect(back.video.preset).toBe('custom');
    expect(back.video.gfx.lights).toBe(44);
    expect(back.video.gfx.reflections).toBe('off');
    expect(sanitizeSettings({ video: { renderScale: 9, fpsCap: 77, fovH: 200 } }).video).toMatchObject({ renderScale: 2, fpsCap: 0, fovH: 120 });
  });
  it('3.1 ladder: one set of presets for every device, Epic and ray tracing only on PC', () => {
    expect(MOBILE_PRESET_IDS).toEqual(['low', 'medium', 'high', 'ultra']);
    expect(forPlatform('epic', GRAPHICS_PRESETS.epic, true)).toEqual({ name: 'ultra', features: GRAPHICS_PRESETS.ultra });
    expect(forPlatform('epic', GRAPHICS_PRESETS.epic, false).name).toBe('epic');
    const rt = forPlatform('custom', { ...GRAPHICS_PRESETS.ultra, reflections: 'rt' }, true);
    expect(rt.features.reflections).toBe('ssr');
    expect(forPlatform('custom', { ...GRAPHICS_PRESETS.ultra, reflections: 'rt' }, false).features.reflections).toBe('rt');
    // render scale falls with the preset; Epic is native
    for (let i = 1; i < PRESET_IDS.length; i++) expect(PRESET_DISPLAY[PRESET_IDS[i]!].renderScale).toBeGreaterThanOrEqual(PRESET_DISPLAY[PRESET_IDS[i - 1]!].renderScale);
    expect(PRESET_DISPLAY.epic).toEqual({ renderScale: 1, upscaler: 'off' });
    // the level's structure voxels are the same size on every preset (what hides a player looks the same)
    for (const p of PRESET_IDS) expect(VOXEL_TIER[p].size).toBe(VOXEL_TIER.epic.size);
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
