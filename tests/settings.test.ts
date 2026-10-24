// (locomotion step 18, D7 / A3) remap and hold / toggle options persist in Settings (IndexedDB kv/settings), no save bump
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { controlsMigrationNotes, defaultSettings, sanitizeSettings, SettingsStore } from '../src/core/settings';
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
    // (anim-rework S1, Michael 15:25 on the aim toggle: "Remove it") the stored Aim choice is dropped: LT is always held
    expect('adsToggle' in s.gameplay).toBe(false);
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
    expect(s.gamepad).toMatchObject({ lookSensitivityX: 1.4, lookSensitivityY: 1.1, deadzoneLeft: 0.2, invertY: true, vibration: false });
    // no aim assist (G16): the retired pad setting is dropped from an old settings object
    expect(s.gamepad).not.toHaveProperty('aimAssist');
    expect(s.mouse).toMatchObject({ sensitivity: 1.7, invertY: true });
    expect(s.audio).toMatchObject({ master: 0.6, sfx: 0.9, music: 0.25, ui: 0.7 });
    // (anim-rework S1, Michael 15:25) no aim toggle: the stored adsToggle is dropped
    expect(s.gameplay).toMatchObject({ defaultShoulder: 'left', wallToggle: false, grabToggle: false, rumble: 0.5 });
    expect('adsToggle' in s.gameplay).toBe(false);
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
  it('moves vision to left and the gadget to right (the speed verbs are gone since padV 3); padV 3', () => {
    const s = sanitizeSettings(structuredClone(A3_SAVE));
    expect(s.pad).not.toHaveProperty('gearUp');
    expect(s.pad).not.toHaveProperty('gearDown');
    expect(s.pad.vision).toEqual([PAD.LEFT]);
    expect(s.pad.throwCam).toEqual([PAD.RIGHT]);
    expect(s.pad.crouch).toEqual([PAD.B]);
    expect(s.padV).toBe(3);
  });
  it('keeps a verb the player remapped, and never migrates the D-pad of a padV 2 save again', () => {
    const custom = sanitizeSettings({ ...structuredClone(A3_SAVE), pad: { ...A3_SAVE.pad, vision: [PAD.RB] } });
    expect(custom.pad.vision).toEqual([PAD.RB]);
    expect(custom.pad.throwCam).toEqual([PAD.RIGHT]);
    const chosen = sanitizeSettings({ ...structuredClone(A3_SAVE), padV: 2 });
    expect(chosen.pad.vision).toEqual([PAD.UP]);
    expect(chosen.pad.throwCam).toEqual([PAD.DOWN]);
  });
});

// (anim-rework S1, BRIEF section 1: "the settings migration (old saves with speed gears or the old LT / X layout move to
// the new defaults)") pad layout 3 and key layout 1
describe('settings: the analogue speed and weapon state layout (anim-rework S1, padV 3, keysV 1)', () => {
  /** Settings as a 4.13 build stored them: padV 2, no keysV, the speed rocker on D-pad up / down, the = / - gear keys,
   *  back to wall on Left Shift, the (unused) Aim row on Toggle. */
  const OLD_413 = {
    pad: { interact: [0], crouch: [1], jump: [3], draw: [2], wall: [10], coop: [5], quick: [4], zoom: [11], vision: [14], throwCam: [15], gearDown: [13], gearUp: [12], device: [8], pause: [9] },
    padV: 2,
    keys: { forward: ['KeyW'], back: ['KeyS'], left: ['KeyA'], right: ['KeyD'], wall: ['ShiftLeft'], crouch: ['KeyC', 'ControlLeft'], speedUp: ['Equal'], speedDown: ['Minus'], jump: ['Space'], interact: ['KeyE'], reload: ['KeyR'], draw: ['KeyX'], knockout: ['KeyZ'] },
    camV: 1,
    gameplay: { defaultShoulder: 'right', adsToggle: true, crouchToggle: true, slowBeat: true, sprintHold: false, autoRecentre: true, wallToggle: true, grabToggle: true, rumble: 1 },
  };
  it('drops the speed verbs and keys, keeps X and LT, moves back to wall to Caps Lock, Aim back to hold', () => {
    const s = sanitizeSettings(structuredClone(OLD_413));
    expect(s.padV).toBe(3);
    expect(s.keysV).toBe(1);
    expect(s.pad).not.toHaveProperty('gearUp');
    expect(s.pad.draw).toEqual([PAD.X]);
    expect(s.pad.vision).toEqual([PAD.LEFT]);
    expect(s.keys).not.toHaveProperty('speedUp');
    expect(s.keys).not.toHaveProperty('speedDown');
    expect(s.keys.wall).toEqual(['CapsLock']);
    expect(s.keys.run).toEqual(['ShiftLeft']);
    expect(s.keys.creep).toEqual(['AltLeft']);
    expect(s.keys.draw).toEqual(['KeyX']);
    expect('adsToggle' in s.gameplay).toBe(false);
    // a current save is never moved again: a wall key on Left Shift stays (a conflict); a stored aim toggle is dropped
    // whatever the version (Michael 15:25: the toggle is removed, LT is always held)
    const now = sanitizeSettings({ ...structuredClone(OLD_413), padV: 3, keysV: 1 });
    expect('adsToggle' in now.gameplay).toBe(false);
    expect(now.keys.wall).toEqual(['ShiftLeft']);
  });
  it('keeps a remapped binding and reports the ones that now collide', () => {
    const raw = { ...structuredClone(OLD_413), keys: { ...OLD_413.keys, wall: ['KeyH'], crouch: ['AltLeft'] }, pad: { ...OLD_413.pad, coop: [PAD.LT] } };
    const s = sanitizeSettings(structuredClone(raw));
    expect(s.keys.wall).toEqual(['KeyH']);
    expect(s.keys.crouch).toEqual(['AltLeft']);
    const notes = controlsMigrationNotes(raw, s);
    expect(notes[0]).toMatch(/left stick sets the speed/);
    expect(notes).toContain('Keyboard: Creep (hold) and Crouch share Alt.');
    expect(notes.some((n) => /Controller: Co-op action .* and Aim share LT/.test(n))).toBe(true);
    // the plain old layout: what moved; (optic-coop M2, "contextual") Zoom and Ping on R3 are an allowed pair: no clash named
    const plain = controlsMigrationNotes(OLD_413, sanitizeSettings(structuredClone(OLD_413)));
    expect(plain).toHaveLength(2);
    expect(plain[1]).toMatch(/Caps Lock/);
    expect(plain.some((n) => /Zoom|Ping/.test(n))).toBe(false);
    // a fresh profile or a current save: nothing to say
    expect(controlsMigrationNotes(undefined, defaultSettings())).toEqual([]);
    expect(controlsMigrationNotes(defaultSettings(), defaultSettings())).toEqual([]);
  });
});

describe('settings: the CT camera defaults (G3, camV 1)', () => {
  /** Settings as stored before G3: the old defaults FOV 75 and pad vertical look 0.8, no `camV`. */
  const PRE_G3 = {
    gamepad: { lookSensitivityX: 1, lookSensitivityY: 0.8, adsMultiplier: 0.3, deadzoneLeft: 0.15, deadzoneRight: 0.12, triggerDeadzone: 0.08, curve: 'classic', invertY: false, aimAssist: 'standard', vibration: true },
    padV: 2,
    video: { preset: 'epic', auto: true, renderScale: 1, upscaler: 'off', panini: 0, fpsCap: 0, fovH: 75, maxFov: 120, hudWidth: 'auto' },
  };
  it('new defaults: FOV 86 (Michael "Match CT (86)"), pad vertical look 1.0', () => {
    const d = defaultSettings();
    expect(d.video.fovH).toBe(86);
    expect(d.gamepad.lookSensitivityY).toBe(1);
    expect(d.camV).toBe(1);
  });
  it('an old save on the old defaults moves to the new ones once', () => {
    const s = sanitizeSettings(structuredClone(PRE_G3));
    expect(s.video.fovH).toBe(86);
    expect(s.gamepad.lookSensitivityY).toBe(1);
    expect(s.camV).toBe(1);
    // migrated settings stay put on the next load
    expect(sanitizeSettings(structuredClone(s)).video.fovH).toBe(86);
  });
  it('a value the player chose stays, and a camV 1 save is never migrated again', () => {
    const chosen = sanitizeSettings({ ...structuredClone(PRE_G3), video: { ...PRE_G3.video, fovH: 90 }, gamepad: { ...PRE_G3.gamepad, lookSensitivityY: 1.3 } });
    expect(chosen.video.fovH).toBe(90);
    expect(chosen.gamepad.lookSensitivityY).toBe(1.3);
    const later = sanitizeSettings({ ...structuredClone(PRE_G3), camV: 1 });
    expect(later.video.fovH).toBe(75);
    expect(later.gamepad.lookSensitivityY).toBe(0.8);
  });
});

describe('(LR16a) one light model: no Gameplay > Lamp falloff', () => {
  it('the defaults have no lampFalloff; an old stored key is dropped on load (whitelist parse, no migration)', () => {
    expect('lampFalloff' in defaultSettings().gameplay).toBe(false);
    for (const lf of ['linear', 'photometric', 'bright']) {
      const s = sanitizeSettings({ gameplay: { lampFalloff: lf, crouchToggle: false } });
      expect('lampFalloff' in s.gameplay).toBe(false);
      // the rest of the stored gameplay block is kept
      expect(s.gameplay.crouchToggle).toBe(false);
    }
  });
  it('an old IndexedDB kv/settings record with lampFalloff loads without it (no save bump)', async () => {
    resetDbCache();
    const st = new SettingsStore();
    await dbPut('kv', 'settings', { ...st.get(), gameplay: { ...st.get().gameplay, lampFalloff: 'photometric' } });
    const back = sanitizeSettings(await dbGet('kv', 'settings'));
    expect('lampFalloff' in back.gameplay).toBe(false);
    expect(back).toEqual(sanitizeSettings(st.get()));
  });
});

describe('(LR14) Graphics > Character shadows', () => {
  it('defaults to Auto; settings from before it read Auto; junk is dropped; On / Off are kept; Auto follows the preset', () => {
    expect(defaultSettings().video.charShadows).toBe('auto');
    expect(sanitizeSettings(PRE_STEP_18).video.charShadows).toBe('auto');
    expect(sanitizeSettings({ video: { charShadows: 'maybe' } }).video.charShadows).toBe('auto');
    for (const m of ['on', 'off'] as const) {
      const s = sanitizeSettings({ video: { charShadows: m } });
      expect(s.video.charShadows).toBe(m);
      expect(sanitizeSettings(structuredClone(s)).video.charShadows).toBe(m);
    }
    // (render only: it lives with the graphics settings, never in gameplay)
    expect('charShadows' in defaultSettings().gameplay).toBe(false);
  });
});
