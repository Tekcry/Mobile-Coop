import { HUD_WIDTHS, type HudWidth } from './display';
import { clamp, type CurveKind } from '../input/stickMath';
import { BINDS, defaultBinds, KEY_LAYOUT_V, keyName, migrateKeysV1, sanitizeBinds, type KeyBinds } from '../input/keyBindings';
import { findConflicts } from '../input/conflicts';
import { defaultPadBinds, migrateA3Dpad, PAD_BINDS, PAD_FIXED, PAD_LAYOUT_V, padButtonName, sanitizePadBinds, type PadBinds } from '../input/padBinds';
import { BRIGHTNESS_MAX, BRIGHTNESS_MIN } from '../world/darkCurve';
import { CHAR_SHADOW_MODES, type CharShadowMode } from '../world/charShadowSet';
import { FPS_CAPS, GRAPHICS_PRESETS, LIGHT_RANGE, PRESET_DISPLAY, PRESET_IDS, presetOf, type AaMode, type FixedPreset, type GraphicsFeatures, type GraphicsPreset, type ReflectionMode, type ShadowQuality, type TierQuality } from './quality';


export interface Settings {
  gamepad: {
    lookSensitivityX: number;
    lookSensitivityY: number;
    adsMultiplier: number;
    deadzoneLeft: number;
    deadzoneRight: number;
    triggerDeadzone: number;
    curve: CurveKind;
    invertY: boolean;
    vibration: boolean;
  };
  mouse: {
    sensitivity: number;
    invertY: boolean;
    /** Look while aiming x this. */
    adsMultiplier: number;
    /** Raw mouse input (`unadjustedMovement` pointer lock: no OS acceleration) where supported. */
    raw: boolean;
  };
  /** Keyboard / mouse bindings (`input/keyBindings.ts`). */
  keys: KeyBinds;
  /** (locomotion step 18, D7) Controller bindings (`input/padBinds.ts`; local only, D8). */
  pad: PadBinds;
  /** (F7) The stored pad binds' layout version (`PAD_LAYOUT_V`; A3 saves had the speed on left / right; anim-rework S1,
   *  3: no speed rocker, LT the held aim, X holster / draw and reload). */
  padV: number;
  /** (anim-rework S1) The stored key layout's version (`KEY_LAYOUT_V`; 1: Left Shift runs, Left Alt creeps, back to wall
   *  on Caps Lock). */
  keysV: number;
  /** (CT prototype G3) The camera defaults' version (`CAM_V`): 1 moved the FOV 75 -> 86 and the pad's vertical look
   *  0.8 -> 1.0; an untouched old default follows once. */
  camV: number;
  /** (mocap-trial-2, M4) The mocap default's version (`MOCAP_V`): 1 turned Mocap locomotion on by default; a save from
   *  before it (off was the default) takes the new default once. */
  mocapV: number;
  video: {
    /** Graphics preset; 'custom' once a feature is changed by hand. */
    preset: GraphicsPreset;
    /** 3.1 Auto: the preset follows the device (`device.tier`); picking a preset or changing a feature turns it off. */
    auto: boolean;
    /** 3.1: what the device detection found (`core/deviceTier.ts`); re-detected when `key` no longer matches. */
    device: DeviceDetection;
    /** The per-feature graphics settings (`core/quality.ts`). */
    gfx: GraphicsFeatures;
    /** Render resolution x native (above 1 supersamples). */
    renderScale: number;
    /** Desktop (3.2.1): the chosen resolution, "7680x2160" ('' = the native output / a scale set by hand). */
    resolution: string;
    /** Steps the render scale down when the GPU falls behind (3.0; replaced by `adaptive`, used only with it off). */
    dynamicRes: boolean;
    /** 3.1 Adaptive detail: the frame governor holds the frame rate in a match (`core/governor.ts`). */
    adaptive: boolean;
    /** Upscaler: off (the render scale is the canvas size) or TAAU (the scene at the render scale, resolved over
     *  frames to the display's full resolution). */
    upscaler: 'off' | 'taau';
    /** Panini projection strength 0..1 (0 = off): keeps wide fields of view from stretching at the sides. */
    panini: number;
    /** (LR14) Character silhouette shadows from the nearest lamps: 'auto' (the Shadows tier's: on from High), 'on' or
     *  'off' (capsule shadows). Rendering only; this machine only (nothing on the wire). */
    charShadows: CharShadowMode;
    /** Frame-rate cap (0 = the display's refresh rate). */
    fpsCap: number;
    /** Horizontal FOV (degrees) at a 16:9 reference; wider screens see more at the sides (Hor+). */
    fovH: number;
    /** Ultrawide: the widest horizontal FOV (degrees) Hor+ may reach before it turns Vert- (90 .. 150). */
    maxFov: number;
    /** Where the HUD panels sit on a wide screen (auto: a centred 16:9 above 21:9). */
    hudWidth: HudWidth;
    /** The integrated-GPU notice has been shown (once). */
    gpuNotice: boolean;
    showFps: boolean;
    /** Cinematic look: gentle vignette, film grain (one combined pass). */
    vignette: boolean;
    filmGrain: boolean;
    /** Brightness calibration (3.6 Step 4b, render only): the grade's exposure multiplier (`BRIGHTNESS_MIN` ..
     *  `BRIGHTNESS_MAX`), and whether the calibration screen has been shown (once, after the update). */
    brightness: number;
    brightnessSet: boolean;
    /** Characters drawn as the detailed smooth body (the 2.0 operator; default) or classic stick figures. */
    avatarStyle: 'stick' | 'detailed';
    /** 2: the 2.0 default (detailed) has been applied once to settings saved before it. */
    avatarStyleV: number;
  };
  /** `musicV` 3: the music default moved from 50 % to 30 % and then to 15 % (music V4, 2026-10-16); an untouched old
   *  default (50 % or 30 %) follows once. */
  audio: { master: number; sfx: number; music: number; ui: number; musicV: number };
  gameplay: { defaultShoulder: 'right' | 'left'; crouchToggle: boolean; slowBeat: boolean; sprintHold: boolean; autoRecentre: boolean; wallToggle: boolean; /** (locomotion step 18, D7) the grab from behind: true = press grabs and keeps them, a fresh press finishes (the 3.2.0 behaviour); false = keep the button held, letting go knocks them out (A70). */ grabToggle: boolean; /** (locomotion step 17) rumble strength 0..1 (the rumble table; local only, D8). */ rumble: number;
    /** Training course: the next drill's marker (D19; default on). */
    courseMarkers: boolean;
    /** (mission-framework EN3) Hints: a hint line under the current mission objective (default off). */
    hints: boolean;
    /** (mocap-trial) Mocap locomotion: Wren's holstered walk / jog / run (and the mocap turn / start / stop clips) from
     *  the CMU mocap set instead of the hand-keyed one (default on since mocap-trial-2, Michael M4; `?mocap=0/1` overrides it for a page; this machine
     *  only: the co-op partner drawn here follows it, nothing on the wire). */
    mocapLoco: boolean;
    /** (mixamo-retarget Toggle) The Animation source (`src/anim/animSource.ts`): hand-made, CMU (today's game, the
     *  default) or Mixamo on top of CMU. A look choice on this machine only (a co-op partner drawn here follows it). */
    animSource: 'hand' | 'cmu' | 'mixamo';
    /** (F45) The player picked the Animation source (Options or the Anim Studio). Until then /preview/ plays Mixamo
     *  (`settingAnimSource`, preview-flags "All on in preview"); the live game keeps the default. */
    animSourceSet: boolean };
  /** Accessibility and HUD. */
  access: {
    /** HUD size multiplier (0.8 .. 1.4). */
    hudScale: number;
    /** Health as bars (else only the screen-edge vignette, Blacklist style). */
    healthBar: boolean;
    /** Ammo and gadget count always shown (else on change / reload, then they fade). */
    ammoAlways: boolean;
    /** Colour-blind-safe awareness and alert colours (blue -> orange instead of white -> yellow -> red). */
    colorSafe: boolean;
    /** Enemy barks and radio as subtitles at the bottom. */
    subtitles: boolean;
    /** Held actions (downloads, alarm panels, revives, plants) start on a tap and keep going. */
    holdToggle: boolean;
    /** Camera shake strength (0 .. 1). */
    shake: number;
  };
}

/** (G3, AUDIT-CAMERA rows 18 and 19) The camera defaults' version: a save from before it that still holds the old
 *  default FOV (75) or pad vertical look (0.8) takes the new one (Michael 2026-10-20 "Match CT (86)"; CT's pitch rate
 *  137 deg/s); a value the player chose stays. */
export const CAM_V = 1;
/** (mocap-trial-2, M4: Michael ~01:25 "On by default") The mocap default's version: 1 turned Mocap locomotion on. */
export const MOCAP_V = 1;
const camKept = (v: unknown, n: number, old: number, d: number): number => (typeof v === 'number' && v >= CAM_V ? n : n === old ? d : n);

/** (Playtest 2) Look speed while aiming = 0.3 of the explore speed (70% less). A saved old default (0.55 pad, 0.6 mouse) follows it. */
export const ADS_LOOK = 0.3;
const adsLook = (v: unknown, d: number, lo: number): number => {
  const n = num(v, d, lo, 1.5);
  return n === 0.55 || n === 0.6 ? ADS_LOOK : n;
};

/**
 * (F45) The Animation source the stored setting asks for: the player's pick, or until they pick one, Mixamo on
 * /preview/ (`preview`: flags `PREVIEW_ON`; Michael 2026-10-26 ~13:55 "All on in preview") and the default elsewhere.
 */
export function settingAnimSource(g: Pick<Settings['gameplay'], 'animSource' | 'animSourceSet'>, preview: boolean): Settings['gameplay']['animSource'] {
  return !g.animSourceSet && preview ? 'mixamo' : g.animSource;
}

export function defaultSettings(): Settings {
  return {
    gamepad: {
      lookSensitivityX: 1,
      lookSensitivityY: 1,
      adsMultiplier: ADS_LOOK,
      deadzoneLeft: 0.15,
      deadzoneRight: 0.12,
      triggerDeadzone: 0.08,
      curve: 'classic',
      invertY: false,
      vibration: true,
    },
    mouse: { sensitivity: 1, invertY: false, adsMultiplier: ADS_LOOK, raw: true },
    keys: defaultBinds(),
    pad: defaultPadBinds(),
    padV: PAD_LAYOUT_V,
    keysV: KEY_LAYOUT_V,
    camV: CAM_V,
    mocapV: MOCAP_V,
    video: { preset: 'epic', auto: true, device: { key: '', tier: null, source: 'none' }, gfx: { ...GRAPHICS_PRESETS.epic }, renderScale: 1, resolution: '', dynamicRes: false, adaptive: true, upscaler: 'off', panini: 0, charShadows: 'auto', fpsCap: 0, fovH: 86, maxFov: 120, hudWidth: 'auto', gpuNotice: false, showFps: false, vignette: true, filmGrain: false, brightness: 1, brightnessSet: false, avatarStyle: 'detailed', avatarStyleV: 2 },
    audio: { master: 0.8, sfx: 1, music: 0.15, ui: 0.7, musicV: 3 },
    gameplay: { defaultShoulder: 'right', crouchToggle: true, slowBeat: true, sprintHold: false, autoRecentre: true, wallToggle: true, grabToggle: true, rumble: 1, courseMarkers: true, hints: false, mocapLoco: true, animSource: 'cmu', animSourceSet: false },
    access: { hudScale: 1, healthBar: true, ammoAlways: false, colorSafe: false, subtitles: true, holdToggle: false, shake: 1 },
  };
}

const CURVES: readonly CurveKind[] = ['linear', 'classic', 'precise', 'aggressive'];
const SHADOWS: readonly ShadowQuality[] = ['off', 'low', 'medium', 'high', 'ultra', 'epic'];
const TIERS: readonly TierQuality[] = ['low', 'medium', 'high', 'ultra', 'epic'];
const AA: readonly AaMode[] = ['fxaa', 'msaa', 'taa'];
const REFL: readonly ReflectionMode[] = ['off', 'ssr', 'rt'];

/** Per-feature graphics from untrusted data (defaults: the preset given). */
function sanitizeGfx(raw: Obj, base: GraphicsFeatures): GraphicsFeatures {
  return {
    shadows: pick(raw.shadows, SHADOWS, base.shadows),
    lights: Math.round(num(raw.lights, base.lights, LIGHT_RANGE.min, LIGHT_RANGE.max)),
    ao: bool(raw.ao, base.ao),
    bloom: bool(raw.bloom, base.bloom),
    // (before 3.0 phase 5: a screen-space on / off)
    reflections: pick(raw.reflections, REFL, raw.ssr === true ? 'ssr' : raw.ssr === false ? 'off' : base.reflections),
    rtRes: pick(raw.rtRes, ['half', 'full'] as const, base.rtRes),
    gi: bool(raw.gi, base.gi),
    volumetrics: bool(raw.volumetrics, base.volumetrics),
    volLights: Math.round(num(raw.volLights, base.volLights, 2, 12)),
    postRes: pick(raw.postRes, ['half', 'full'] as const, base.postRes),
    dof: bool(raw.dof, base.dof),
    motionBlur: bool(raw.motionBlur, base.motionBlur),
    lens: bool(raw.lens, base.lens),
    aa: pick(raw.aa, AA, base.aa),
    textures: pick(raw.textures, TIERS, base.textures),
    detail: pick(raw.detail, TIERS, base.detail),
    effects: pick(raw.effects, TIERS, base.effects),
  };
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, d: number, lo: number, hi: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : d;
/** The music volume through its default moves (50 % to 30 % to 15 %): a value still at the default of its time follows
 *  the new default once; anything a player chose stays. */
const musicKept = (v: unknown, music: number, d: number): number =>
  v === 3 ? music : (v === 2 ? music === 0.3 : music === 0.5) ? d : music;
const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);
const pick = <T>(v: unknown, allowed: readonly T[], d: T): T => (allowed.includes(v as T) ? (v as T) : d);
const sub = (o: Obj, k: string): Obj => (isObj(o[k]) ? (o[k] as Obj) : {});

/**
 * Preset + features: a named preset fills its features (3.1: the shared ladder - a 3.0 High / Ultra / Epic keeps its
 * name and takes the retuned values); 'custom' keeps the stored ones (over Epic, new features from Epic); settings
 * from before 3.0 (the phone quality levels) start on Epic.
 */
function videoGfx(v: Obj): { preset: GraphicsPreset; gfx: GraphicsFeatures } {
  const p = v.preset;
  if ((PRESET_IDS as readonly unknown[]).includes(p)) return { preset: p as FixedPreset, gfx: { ...GRAPHICS_PRESETS[p as FixedPreset] } };
  if (p === 'custom') {
    const gfx = sanitizeGfx(sub(v, 'gfx'), GRAPHICS_PRESETS.epic);
    return { preset: presetOf(gfx), gfx };
  }
  return { preset: 'epic', gfx: { ...GRAPHICS_PRESETS.epic } };
}

/** Set one graphics feature (the preset becomes Custom unless it now equals one; Auto turns off). */
export function setGfx<K extends keyof GraphicsFeatures>(s: Settings, k: K, v: GraphicsFeatures[K]): void {
  s.video.gfx[k] = v;
  s.video.preset = presetOf(s.video.gfx);
  s.video.auto = false;
}

export interface DeviceDetection {
  key: string;
  tier: FixedPreset | null;
  /** gpu: from the GPU's name; calibrated: measured on the menu stage; none: not yet. */
  source: 'gpu' | 'calibrated' | 'none';
}

function sanitizeDevice(raw: unknown): DeviceDetection {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Obj;
  const tier = (PRESET_IDS as readonly unknown[]).includes(r.tier) ? (r.tier as FixedPreset) : null;
  return { key: typeof r.key === 'string' ? r.key.slice(0, 160) : '', tier, source: tier ? pick(r.source, ['gpu', 'calibrated', 'none'] as const, 'none') : 'none' };
}

/** Auto on: the device's preset (High until it is known). */
export function setAuto(s: Settings, tier: FixedPreset | null): void {
  setPreset(s, tier ?? 'high');
  s.video.auto = true;
}

/** Apply a named preset: its features and its render resolution (scale + TAAU; the frame governor works within). */
export function setPreset(s: Settings, p: FixedPreset): void {
  const disp = PRESET_DISPLAY[p];
  s.video.preset = p;
  s.video.gfx = { ...GRAPHICS_PRESETS[p] };
  if (Math.abs(s.video.renderScale - disp.renderScale) > 1e-3) s.video.resolution = '';
  s.video.renderScale = disp.renderScale;
  s.video.upscaler = disp.upscaler;
  s.video.auto = false;
}

/** (F7) Stored pad binds, sanitized; a save from before pad layout 2 moves the A3 D-pad defaults to today's. */
function padMigrated(raw: unknown, v: unknown): PadBinds {
  const p = sanitizePadBinds(raw);
  // (anim-rework S1) the A3 D-pad move is layout 2's; a layout 2 save is past it (layout 3 only drops the speed verbs)
  if (!(typeof v === 'number' && v >= 2)) migrateA3Dpad(p);
  return p;
}

/** (anim-rework S1) Stored key binds, sanitized; a save from before `KEY_LAYOUT_V` 1 moves back to wall off Left Shift. */
function keysMigrated(raw: unknown, v: unknown): KeyBinds {
  const k = sanitizeBinds(raw);
  if (!(typeof v === 'number' && v >= KEY_LAYOUT_V)) migrateKeysV1(k);
  return k;
}

/**
 * (anim-rework S1) What the controls migration changed for a stored settings object, as short lines for a toast once
 * after the move (empty for a fresh profile or a current save): the speed now on the stick, back to wall moved, and every
 * binding that now shares an input with another (a remapped key or button that collides with the new layout; the
 * controls screen marks the same rows). Not on a hot path (once at boot).
 */
export function controlsMigrationNotes(raw: unknown, s: Settings): string[] {
  if (!isObj(raw)) return [];
  const out: string[] = [];
  const padOld = !(typeof raw.padV === 'number' && raw.padV >= PAD_LAYOUT_V);
  const keysOld = !(typeof raw.keysV === 'number' && raw.keysV >= KEY_LAYOUT_V);
  if (!padOld && !keysOld) return out;
  out.push('Controls updated: the left stick sets the speed (no speed buttons); LT aims (held), X holsters and draws.');
  const k = sub(raw, 'keys');
  if (keysOld && Array.isArray(k.wall) && k.wall.length === 1 && k.wall[0] === 'ShiftLeft') out.push('Back to wall moved to Caps Lock: Left Shift runs, Left Alt creeps.');
  const pl = (id: string): string => (id === 'aim' ? 'Aim' : id === 'fire' ? 'Fire' : (PAD_BINDS.find((b) => b.id === id)?.label ?? id));
  const kl = (id: string): string => BINDS.find((b) => b.id === id)?.label ?? id;
  for (const c of findConflicts({ ...s.pad, aim: PAD_FIXED.aim, fire: PAD_FIXED.fire })) out.push(`Controller: ${pl(c.a)} and ${pl(c.b)} share ${padButtonName(c.input as number)}.`);
  for (const c of findConflicts(s.keys)) out.push(`Keyboard: ${kl(c.a)} and ${kl(c.b)} share ${keyName(String(c.input))}.`);
  return out;
}

/** Merge untrusted data (old saves, imports) over defaults, clamping every field. */
export function sanitizeSettings(raw: unknown): Settings {
  const d = defaultSettings();
  const r = isObj(raw) ? raw : {};
  const g = sub(r, 'gamepad');
  const m = sub(r, 'mouse');
  const v = sub(r, 'video');
  const a = sub(r, 'audio');
  const gp = sub(r, 'gameplay');
  const ac = sub(r, 'access');
  return {
    gamepad: {
      lookSensitivityX: num(g.lookSensitivityX, d.gamepad.lookSensitivityX, 0.1, 4),
      lookSensitivityY: camKept(r.camV, num(g.lookSensitivityY, d.gamepad.lookSensitivityY, 0.1, 4), 0.8, d.gamepad.lookSensitivityY),
      adsMultiplier: adsLook(g.adsMultiplier, d.gamepad.adsMultiplier, 0.1),
      deadzoneLeft: num(g.deadzoneLeft, d.gamepad.deadzoneLeft, 0, 0.5),
      deadzoneRight: num(g.deadzoneRight, d.gamepad.deadzoneRight, 0, 0.5),
      triggerDeadzone: num(g.triggerDeadzone, d.gamepad.triggerDeadzone, 0, 0.5),
      curve: pick(g.curve, CURVES, d.gamepad.curve),
      invertY: bool(g.invertY, d.gamepad.invertY),
      vibration: bool(g.vibration, d.gamepad.vibration),
    },
    mouse: {
      sensitivity: num(m.sensitivity, d.mouse.sensitivity, 0.1, 5),
      invertY: bool(m.invertY, d.mouse.invertY),
      adsMultiplier: adsLook(m.adsMultiplier, d.mouse.adsMultiplier, 0.2),
      raw: bool(m.raw, d.mouse.raw),
    },
    keys: keysMigrated(r.keys, r.keysV),
    pad: padMigrated(r.pad, r.padV),
    padV: PAD_LAYOUT_V,
    keysV: KEY_LAYOUT_V,
    camV: CAM_V,
    mocapV: MOCAP_V,
    video: {
      ...videoGfx(v),
      // (3.0 settings: Auto when still on the 3.0 default, Epic; a preset picked by hand stays)
      auto: bool(v.auto, v.preset === undefined || v.preset === 'epic'),
      device: sanitizeDevice(v.device),
      renderScale: num(v.renderScale, d.video.renderScale, 0.5, 2),
      resolution: typeof v.resolution === 'string' && /^\d{3,5}x\d{3,5}$/.test(v.resolution) ? v.resolution : '',
      dynamicRes: bool(v.dynamicRes, d.video.dynamicRes),
      adaptive: bool(v.adaptive, d.video.adaptive),
      upscaler: pick(v.upscaler, ['off', 'taau'] as const, d.video.upscaler),
      panini: num(v.panini, d.video.panini, 0, 1),
      // (LR14) settings from before it: the preset's
      charShadows: pick(v.charShadows, CHAR_SHADOW_MODES, d.video.charShadows),
      fpsCap: pick(v.fpsCap, FPS_CAPS as readonly number[], d.video.fpsCap),
      fovH: camKept(r.camV, num(v.fovH, d.video.fovH, 60, 120), 75, d.video.fovH),
      maxFov: num(v.maxFov, d.video.maxFov, 90, 150),
      hudWidth: pick(v.hudWidth, HUD_WIDTHS, d.video.hudWidth),
      gpuNotice: bool(v.gpuNotice, d.video.gpuNotice),
      showFps: bool(v.showFps, d.video.showFps),
      vignette: bool(v.vignette, d.video.vignette),
      filmGrain: bool(v.filmGrain, d.video.filmGrain),
      brightness: num(v.brightness, d.video.brightness, BRIGHTNESS_MIN, BRIGHTNESS_MAX),
      brightnessSet: bool(v.brightnessSet, false),
      // settings from before 2.0 move to the operator once (the stick style stays a choice)
      avatarStyle: v.avatarStyleV === 2 ? pick(v.avatarStyle, ['stick', 'detailed'] as const, d.video.avatarStyle) : 'detailed',
      avatarStyleV: 2,
    },
    audio: {
      master: num(a.master, d.audio.master, 0, 1),
      sfx: num(a.sfx, d.audio.sfx, 0, 1),
      music: musicKept(a.musicV, num(a.music, d.audio.music, 0, 1), d.audio.music),
      ui: num(a.ui, d.audio.ui, 0, 1),
      musicV: 3,
    },
    gameplay: {
      defaultShoulder: pick(gp.defaultShoulder, ['right', 'left'] as const, d.gameplay.defaultShoulder),
      // (anim-rework S1, Michael 15:25 "Remove it") no Aim hold / toggle: LT is always held; a stored adsToggle is dropped
      crouchToggle: bool(gp.crouchToggle, d.gameplay.crouchToggle),
      slowBeat: bool(gp.slowBeat, d.gameplay.slowBeat),
      wallToggle: bool(gp.wallToggle, d.gameplay.wallToggle),
      grabToggle: bool(gp.grabToggle, d.gameplay.grabToggle),
      sprintHold: bool(gp.sprintHold, d.gameplay.sprintHold),
      autoRecentre: bool(gp.autoRecentre, d.gameplay.autoRecentre),
      rumble: num(gp.rumble, d.gameplay.rumble, 0, 1),
      courseMarkers: bool(gp.courseMarkers, d.gameplay.courseMarkers),
      hints: bool(gp.hints, d.gameplay.hints),
      // (mocap-trial-2, M4) a save from before MOCAP_V (off was the default) takes the new default (on) once
      mocapLoco: typeof r.mocapV === 'number' && r.mocapV >= MOCAP_V ? bool(gp.mocapLoco, d.gameplay.mocapLoco) : d.gameplay.mocapLoco,
      // (mixamo-retarget Toggle) a save from before the field (or a bad value) takes the default (CMU: today's game)
      animSource: pick(gp.animSource, ['hand', 'cmu', 'mixamo'] as const, d.gameplay.animSource),
      // (F45) a save from before the field: a stored 'cmu' was only the default (not picked); 'hand' / 'mixamo' could
      // only come from a pick
      animSourceSet: bool(gp.animSourceSet, gp.animSource === 'hand' || gp.animSource === 'mixamo'),
    },
    access: {
      hudScale: num(ac.hudScale, d.access.hudScale, 0.8, 1.4),
      healthBar: bool(ac.healthBar, d.access.healthBar),
      ammoAlways: bool(ac.ammoAlways, d.access.ammoAlways),
      colorSafe: bool(ac.colorSafe, d.access.colorSafe),
      subtitles: bool(ac.subtitles, d.access.subtitles),
      holdToggle: bool(ac.holdToggle, d.access.holdToggle),
      shake: num(ac.shake, d.access.shake, 0, 1),
    },
  };
}

/** Reactive settings holder. Persistence is injected so this stays testable. */
export class SettingsStore {
  private value: Settings = defaultSettings();
  private listeners = new Set<(s: Settings) => void>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private persist?: (s: Settings) => Promise<void>) {}

  get(): Settings {
    return this.value;
  }

  load(raw: unknown): void {
    this.value = sanitizeSettings(raw);
    this.notify();
  }

  /** Mutate via callback, then sanitise, notify and schedule a save. */
  update(fn: (s: Settings) => void): void {
    const draft = structuredClone(this.value);
    fn(draft);
    this.value = sanitizeSettings(draft);
    this.notify();
    if (this.persist) {
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => void this.persist?.(this.value), 250);
    }
  }

  reset(section?: keyof Settings): void {
    this.update((s) => {
      const d = defaultSettings();
      if (section) (s as unknown as Obj)[section] = d[section];
      else Object.assign(s, d);
    });
  }

  subscribe(fn: (s: Settings) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    for (const fn of this.listeners) fn(this.value);
  }
}

/** A value for a digest: numbers to 3 decimals, booleans on / off. */
function digestValue(v: unknown): string {
  if (typeof v === 'boolean') return v ? 'on' : 'off';
  if (typeof v === 'number') return String(Math.round(v * 1000) / 1000);
  return String(v);
}

/** `path=value` for every leaf of `o` (records under `whole`: one "custom" entry when they differ, else skipped). */
function digestLeaves(o: unknown, d: unknown, path: string, out: string[], onlyChanged: boolean, whole: ReadonlySet<string>): void {
  if (typeof o === 'object' && o !== null && !Array.isArray(o)) {
    if (whole.has(path)) {
      // (listed by the caller in full mode)
      if (onlyChanged && JSON.stringify(o) !== JSON.stringify(d)) out.push(`${path}=custom`);
      return;
    }
    const dd = typeof d === 'object' && d !== null ? (d as Record<string, unknown>) : {};
    for (const [k, v] of Object.entries(o)) digestLeaves(v, dd[k], path ? `${path}.${k}` : k, out, onlyChanged, whole);
    return;
  }
  if (onlyChanged && JSON.stringify(o) === JSON.stringify(d)) return;
  out.push(`${path}=${digestValue(o)}`);
}

/**
 * The settings as feedback context (3.1.7, pure): `video` - every graphics / display setting (the preset's features
 * included); `changed` - everything else that differs from the defaults (key bindings: "custom").
 */
export function settingsDigest(s: Settings): { video: string; changed: string } {
  const d = defaultSettings();
  const v: string[] = [];
  digestLeaves(s.video, d.video, '', v, false, new Set(['device']));
  v.push(`device=${s.video.device.tier ?? '-'} (${s.video.device.source})`);
  const c: string[] = [];
  const rest = { ...s, video: undefined } as Record<string, unknown>;
  const restD = { ...d, video: undefined } as Record<string, unknown>;
  digestLeaves(rest, restD, '', c, true, new Set(['keys', 'pad']));
  return { video: v.join(' '), changed: c.length ? c.join(' ') : 'defaults' };
}
