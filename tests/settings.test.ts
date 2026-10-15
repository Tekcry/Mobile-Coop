// (locomotion step 18, D7 / A3) remap and hold / toggle options persist in Settings (IndexedDB kv/settings), no save bump
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { defaultSettings, sanitizeSettings, SettingsStore } from '../src/core/settings';
import { defaultPadBinds } from '../src/input/padBinds';
import { dbGet, dbPut, resetDbCache } from '../src/save/db';
import { PAD } from '../src/input/gamepadMapping';

/** A settings object as stored before step 18 (no `pad`, no `gameplay.grabToggle`). */
const PRE_STEP_18 = {
  gamepad: { lookSensitivityX: 1.4, lookSensitivityY: 1, adsMultiplier: 0.5, deadzoneLeft: 0.15, deadzoneRight: 0.12, triggerDeadzone: 0.05, curve: 'classic', invertY: false, aimAssist: 'standard', vibration: true },
  mouse: { sensitivity: 1.2, invertY: false, adsMultiplier: 0.6, raw: true },
  keys: { reload: ['KeyT'], crouch: ['KeyC', 'ControlLeft'] },
  audio: { master: 0.6, sfx: 1, music: 0.5, ui: 0.7 },
  gameplay: { defaultShoulder: 'left', adsToggle: true, crouchToggle: false, slowBeat: true, sprintHold: true, autoRecentre: true, wallToggle: false, rumble: 0.5 },
  access: { hudScale: 1, healthBar: true, ammoAlways: false, colorSafe: false, subtitles: true, holdToggle: false, shake: 1 },
};

describe('settings: remap and hold / toggle (step 18)', () => {
  beforeEach(() => resetDbCache());

  it('a pre-step settings object sanitizes to the defaults for the new fields and keeps the rest', () => {
    const s = sanitizeSettings(structuredClone(PRE_STEP_18));
    expect(s.pad).toEqual(defaultPadBinds());
    expect(s.gameplay.grabToggle).toBe(true);
    expect(s.gameplay.wallToggle).toBe(false);
    expect(s.gameplay.adsToggle).toBe(true);
    expect(s.gameplay.sprintHold).toBe(true);
    expect(s.gameplay.crouchToggle).toBe(false);
    expect(s.keys.reload).toEqual(['KeyT']);
    expect(defaultSettings().gameplay.wallToggle).toBe(true);
  });

  it('garbage button indices are dropped', () => {
    const s = sanitizeSettings({ ...PRE_STEP_18, pad: { reload: [99, 'X', 1.5, PAD.RB], crouch: [-1], cover: null } });
    expect(s.pad.reload).toEqual([PAD.RB]);
    expect(s.pad.crouch).toEqual([]);
    expect(s.pad.cover).toEqual([PAD.A]);
    const g = sanitizeSettings({ ...PRE_STEP_18, gameplay: { ...PRE_STEP_18.gameplay, grabToggle: 'yes' } });
    expect(g.gameplay.grabToggle).toBe(true);
  });

  it('round trip through SettingsStore and fake-indexeddb kv/settings', async () => {
    const st = new SettingsStore((v) => dbPut('kv', 'settings', v));
    st.load(await dbGet('kv', 'settings'));
    expect(st.get().pad).toEqual(defaultPadBinds());
    st.update((d) => {
      d.pad.reload = [PAD.RS];
      d.gameplay.grabToggle = false;
      d.gameplay.wallToggle = false;
    });
    await dbPut('kv', 'settings', st.get());
    const back = new SettingsStore();
    back.load(await dbGet('kv', 'settings'));
    expect(back.get().pad.reload).toEqual([PAD.RS]);
    expect(back.get().gameplay.grabToggle).toBe(false);
    expect(back.get().gameplay.wallToggle).toBe(false);
  });
});

describe('settings: custom difficulty (step 19)', () => {
  it('a literal settings object without customDifficulty sanitizes to Normal sliders', () => {
    const s = sanitizeSettings(structuredClone(PRE_STEP_18));
    expect(s.gameplay.customDifficulty).toEqual({ base: 'normal', perception: 1, aim: 1, alarm: 1 });
    expect(defaultSettings().gameplay.customDifficulty).toEqual({ base: 'normal', perception: 1, aim: 1, alarm: 1 });
  });

  it('stored sliders clamp to 0.5-2.0 and a bad base reads Normal', () => {
    const s = sanitizeSettings({ ...PRE_STEP_18, gameplay: { ...PRE_STEP_18.gameplay, customDifficulty: { base: 'godlike', perception: 0.1, aim: 9, alarm: 'x' } } });
    expect(s.gameplay.customDifficulty).toEqual({ base: 'normal', perception: 0.5, aim: 2, alarm: 1 });
    const r = sanitizeSettings({ ...PRE_STEP_18, gameplay: { ...PRE_STEP_18.gameplay, customDifficulty: { base: 'rookie', perception: 0.5, aim: 1.3, alarm: 2 } } });
    expect(r.gameplay.customDifficulty).toEqual({ base: 'rookie', perception: 0.5, aim: 1.3, alarm: 2 });
  });
});
