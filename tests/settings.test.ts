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
    const s = sanitizeSettings({ ...PRE_STEP_18, pad: { draw: [99, 'X', 1.5, PAD.RB], crouch: [-1], wall: null } });
    expect(s.pad.draw).toEqual([PAD.RB]);
    expect(s.pad.crouch).toEqual([]);
    expect(s.pad.wall).toEqual([PAD.LS]);
    const g = sanitizeSettings({ ...PRE_STEP_18, gameplay: { ...PRE_STEP_18.gameplay, grabToggle: 'yes' } });
    expect(g.gameplay.grabToggle).toBe(true);
  });

  it('round trip through SettingsStore and fake-indexeddb kv/settings', async () => {
    let saved!: () => void;
    const done = new Promise<void>((r) => (saved = r));
    const st = new SettingsStore(async (v) => {
      await dbPut('kv', 'settings', v);
      saved();
    });
    st.load(await dbGet('kv', 'settings'));
    expect(st.get().pad).toEqual(defaultPadBinds());
    st.update((d) => {
      d.pad.draw = [PAD.RS];
      d.gameplay.grabToggle = false;
      d.gameplay.wallToggle = false;
    });
    await dbPut('kv', 'settings', st.get());
    const back = new SettingsStore();
    back.load(await dbGet('kv', 'settings'));
    expect(back.get().pad.draw).toEqual([PAD.RS]);
    expect(back.get().gameplay.grabToggle).toBe(false);
    expect(back.get().gameplay.wallToggle).toBe(false);
    // the debounced save (250 ms) lands inside this test: under load it fired during a later test and overwrote kv/settings
    await done;
  });
});describe('settings: removed fields load (consolidation: custom difficulty G106, carried medkit G98)', () => {
  it('a literal old record with customDifficulty and a medkit key binding loads without them', () => {
    const OLD = {
      ...structuredClone(PRE_STEP_18),
      keys: { reload: ['KeyT'], medkit: ['KeyJ'] },
      gameplay: { ...PRE_STEP_18.gameplay, grabToggle: false, customDifficulty: { base: 'rookie', perception: 0.5, aim: 1.3, alarm: 2 }, courseMarkers: false },
    };
    const s = sanitizeSettings(OLD);
    expect('customDifficulty' in s.gameplay).toBe(false);
    expect('customDifficulty' in defaultSettings().gameplay).toBe(false);
    expect('medkit' in s.keys).toBe(false);
    // the rest of the record survives
    expect(s.keys.reload).toEqual(['KeyT']);
    expect(s.gameplay.defaultShoulder).toBe('left');
    expect(s.gameplay.grabToggle).toBe(false);
    expect(s.gameplay.courseMarkers).toBe(false);
    expect(s.gameplay.rumble).toBe(0.5);
  });
});

// (consolidation 3b, desktop only) touch input is gone: a stored `touch` section is read and ignored (no SAVE_VERSION
// bump). The sanitizer builds a fresh object, so the old key is dropped and every other value survives. The same holds
// for the phone-only video fields (`platform`, `phoneOutput`, `phoneSetup`; the phone look and platform detection
// are gone too).
describe('settings: an old record with a touch section (touch input removed)', () => {
  /** A literal settings record as stored before the touch removal (touch layout v7, custom values elsewhere). */
  const OLD_WITH_TOUCH = {
    touch: {
      lookSensitivity: 1.6,
      adsMultiplier: 0.4,
      opacity: 0.8,
      scale: 1.2,
      invertY: true,
      aimAssist: 'high',
      haptics: false,
      lookSpeed: 3.2,
      lookDeadzone: 0.2,
      lookAccel: false,
      dragLook: false,
      fireLeft: true,
      fireDragLook: true,
      dashFlick: true,
      layoutVersion: 7,
      layout: {
        move: { x: 0.16, y: 0.7, scale: 1 },
        look: { x: 0.86, y: 0.71, scale: 1 },
        fire: { x: 0.3, y: 0.4, scale: 1.1, alpha: 0.5 },
        jump: { x: 0.7, y: 0.78, scale: 1 },
      },
    },
    gamepad: { lookSensitivityX: 1.4, lookSensitivityY: 1.1, adsMultiplier: 0.5, deadzoneLeft: 0.2, deadzoneRight: 0.12, triggerDeadzone: 0.05, curve: 'classic', invertY: true, aimAssist: 'low', vibration: false },
    mouse: { sensitivity: 1.7, invertY: true, adsMultiplier: 0.6, raw: true },
    keys: { reload: ['KeyT'], crouch: ['KeyC', 'ControlLeft'] },
    pad: { draw: [PAD.RS] },
    audio: { master: 0.6, sfx: 0.9, music: 0.25, ui: 0.7, musicV: 3 },
    video: { platform: 'mobile', phoneOutput: 2, phoneSetup: true, preset: 'high', auto: false, renderScale: 0.85, upscaler: 'taau', fpsCap: 144, fovH: 90, hudWidth: '21:9', showFps: true },
    gameplay: { defaultShoulder: 'left', adsToggle: true, crouchToggle: false, slowBeat: true, sprintHold: true, autoRecentre: true, wallToggle: false, grabToggle: false, rumble: 0.5 },
  };

  it('drops the touch key and keeps the keyboard, pad, mouse and audio values', () => {
    const s = sanitizeSettings(structuredClone(OLD_WITH_TOUCH));
    expect('touch' in s).toBe(false);
    expect(Object.keys(s)).toEqual(Object.keys(defaultSettings()));
    expect(s.keys.reload).toEqual(['KeyT']);
    expect(s.keys.crouch).toEqual(['KeyC', 'ControlLeft']);
    expect(s.pad.draw).toEqual([PAD.RS]);
    expect(s.gamepad).toMatchObject({ lookSensitivityX: 1.4, lookSensitivityY: 1.1, deadzoneLeft: 0.2, invertY: true, aimAssist: 'low', vibration: false });
    expect(s.mouse).toMatchObject({ sensitivity: 1.7, invertY: true });
    expect(s.audio).toMatchObject({ master: 0.6, sfx: 0.9, music: 0.25, ui: 0.7 });
    expect(s.gameplay).toMatchObject({ defaultShoulder: 'left', adsToggle: true, wallToggle: false, grabToggle: false, rumble: 0.5 });
  });

  it('drops the phone-only video fields and keeps the desktop video values', () => {
    const s = sanitizeSettings(structuredClone(OLD_WITH_TOUCH));
    for (const k of ['platform', 'phoneOutput', 'phoneSetup']) expect(k in s.video).toBe(false);
    expect(Object.keys(s.video).sort()).toEqual(Object.keys(defaultSettings().video).sort());
    expect(s.video).toMatchObject({ preset: 'high', auto: false, renderScale: 0.85, upscaler: 'taau', fpsCap: 144, fovH: 90, hudWidth: '21:9', showFps: true });
  });

  it('loads through SettingsStore from kv/settings without the touch key', async () => {
    resetDbCache();
    await dbPut('kv', 'settings', structuredClone(OLD_WITH_TOUCH));
    const st = new SettingsStore();
    st.load(await dbGet('kv', 'settings'));
    expect('touch' in st.get()).toBe(false);
    expect(st.get().keys.reload).toEqual(['KeyT']);
    expect(st.get().audio.music).toBe(0.25);
  });
});

describe('settings: the A3 D-pad layout (F7, playtest 2 "D pad left and right is speed?")', () => {
  /** The pad binds as an A3 build stored them (speed on D-pad left / right, vision up, gadget down; no `padV`). */
  const A3_SAVE = {
    gamepad: { lookSensitivityX: 1, lookSensitivityY: 1, adsMultiplier: 0.3, deadzoneLeft: 0.15, deadzoneRight: 0.12, triggerDeadzone: 0.08, curve: 'classic', invertY: false, aimAssist: 'standard', vibration: true },
    pad: { interact: [0], crouch: [1], jump: [3], reload: [2], wall: [10], coop: [5], quick: [4], shoulder: [11], vision: [12], throwCam: [13], gearDown: [14], gearUp: [15], device: [8], pause: [9] },
    gameplay: { defaultShoulder: 'right', adsToggle: false, crouchToggle: true, slowBeat: true, sprintHold: false, autoRecentre: true, wallToggle: true, grabToggle: true, rumble: 1 },
  };
  it('moves the speed to D-pad up / down, vision to left and the gadget to right; padV 2', () => {
    const s = sanitizeSettings(structuredClone(A3_SAVE));
    expect(s.pad.gearUp).toEqual([PAD.UP]);
    expect(s.pad.gearDown).toEqual([PAD.DOWN]);
    expect(s.pad.vision).toEqual([PAD.LEFT]);
    expect(s.pad.throwCam).toEqual([PAD.RIGHT]);
    expect(s.pad.crouch).toEqual([PAD.B]);
    expect(s.padV).toBe(2);
  });
  it('keeps a verb the player remapped, and never migrates a padV 2 save again', () => {
    const custom = sanitizeSettings({ ...structuredClone(A3_SAVE), pad: { ...A3_SAVE.pad, gearUp: [PAD.RB] } });
    expect(custom.pad.gearUp).toEqual([PAD.RB]);
    expect(custom.pad.gearDown).toEqual([PAD.DOWN]);
    const chosen = sanitizeSettings({ ...structuredClone(A3_SAVE), padV: 2 });
    expect(chosen.pad.gearDown).toEqual([PAD.LEFT]);
    expect(chosen.pad.gearUp).toEqual([PAD.RIGHT]);
  });
});
