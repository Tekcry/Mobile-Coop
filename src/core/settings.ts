import { HUD_WIDTHS, type HudWidth } from './display';
import { clamp, type CurveKind } from '../input/stickMath';
import { defaultBinds, sanitizeBinds, type KeyBinds } from '../input/keyBindings';
import { BRIGHTNESS_MAX, BRIGHTNESS_MIN } from '../world/darkCurve';
import { FPS_CAPS, GRAPHICS_PRESETS, LIGHT_RANGE, PHONE_OUTPUT_DEFAULT, PHONE_OUTPUTS, PRESET_IDS, presetDisplay, presetOf, type AaMode, type FixedPreset, type GraphicsFeatures, type GraphicsPreset, type ReflectionMode, type ShadowQuality, type TierQuality } from './quality';
import type { PlatformChoice } from './platform';

export const TOUCH_CONTROL_IDS = [
  'move',
  'look',
  'fire',
  'fireLeft',
  'ads',
  'reload',
  'action',
  'crouch',
  'swap',
  'grenade',
  'dash',
  'shoulder',
  'pause',
  'vision',
  'mark',
  'execute',
  'gadgets',
  'takedown',
  'ping',
  'speed',
  'jump',
] as const;
/** Touch layout format version (2: camera stick, contextual action button; 3: takedown button; 4: speed rocker; 5: jump
 *  button). */
export const TOUCH_LAYOUT_VERSION = 5;
export type TouchControlId = (typeof TOUCH_CONTROL_IDS)[number];

/** Control centre in normalised screen space (0..1) and per-control scale. */
export interface ControlPlacement {
  x: number;
  y: number;
  scale: number;
  /** Per-control opacity multiplier (1 = the global opacity). */
  alpha?: number;
}

export type AimAssistLevel = 'off' | 'low' | 'standard' | 'high';

export interface Settings {
  touch: {
    lookSensitivity: number;
    adsMultiplier: number;
    opacity: number;
    scale: number;
    invertY: boolean;
    aimAssist: AimAssistLevel;
    haptics: boolean;
    /** Camera stick: look speed at full deflection (rad/s), dead zone, acceleration when held out. */
    lookSpeed: number;
    lookDeadzone: number;
    lookAccel: boolean;
    /** Dragging anywhere in the empty upper right also turns the camera. */
    dragLook: boolean;
    /** Extra fire button on the left. */
    fireLeft: boolean;
    /** Dragging from the fire button also turns the camera (off: fire never moves the view). */
    fireDragLook: boolean;
    /** Flicking the move stick past its rim dashes. */
    dashFlick: boolean;
    layoutVersion: number;
    layout: Record<TouchControlId, ControlPlacement>;
  };
  gamepad: {
    lookSensitivityX: number;
    lookSensitivityY: number;
    adsMultiplier: number;
    deadzoneLeft: number;
    deadzoneRight: number;
    triggerDeadzone: number;
    curve: CurveKind;
    invertY: boolean;
    aimAssist: AimAssistLevel;
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
  video: {
    /** UI and input platform (auto-detected; never changes rendering). */
    platform: PlatformChoice;
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
    /** Phones: the output's most device pixels per CSS pixel (0: native; `PHONE_OUTPUTS`). */
    phoneOutput: number;
    /** Phones: the 3.1.9 defaults (60 fps target, Ultra native) were applied once (`App.phoneDefaults`). */
    phoneSetup: boolean;
    /** Steps the render scale down when the GPU falls behind (3.0; replaced by `adaptive`, used only with it off). */
    dynamicRes: boolean;
    /** 3.1 Adaptive detail: the frame governor holds the frame rate in a match (`core/governor.ts`). */
    adaptive: boolean;
    /** Upscaler: off (the render scale is the canvas size) or TAAU (the scene at the render scale, resolved over
     *  frames to the display's full resolution). */
    upscaler: 'off' | 'taau';
    /** Panini projection strength 0..1 (0 = off): keeps wide fields of view from stretching at the sides. */
    panini: number;
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
  audio: { master: number; sfx: number; music: number; ui: number };
  gameplay: { defaultShoulder: 'right' | 'left'; adsToggle: boolean; crouchToggle: boolean; coverDash: boolean; slowBeat: boolean; sprintHold: boolean; autoRecentre: boolean };
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

/**
 * Default layout (landscape phone): floating move stick on the left; on the right the camera stick
 * sits where the thumb rests, fire above-left of it (the thumb rolls up from the stick), aim above it,
 * the contextual action button to its left, the rest further out.
 */
export const DEFAULT_LAYOUT: Record<TouchControlId, ControlPlacement> = {
  move: { x: 0.16, y: 0.7, scale: 1 },
  look: { x: 0.86, y: 0.71, scale: 1 },
  fire: { x: 0.71, y: 0.52, scale: 1 },
  fireLeft: { x: 0.08, y: 0.36, scale: 0.8 },
  ads: { x: 0.885, y: 0.36, scale: 1 },
  reload: { x: 0.78, y: 0.27, scale: 1 },
  action: { x: 0.6, y: 0.8, scale: 1 },
  crouch: { x: 0.965, y: 0.53, scale: 1 },
  swap: { x: 0.49, y: 0.88, scale: 1 },
  grenade: { x: 0.585, y: 0.5, scale: 1 },
  dash: { x: 0.35, y: 0.88, scale: 1 },
  shoulder: { x: 0.68, y: 0.09, scale: 1 },
  pause: { x: 0.79, y: 0.09, scale: 1 },
  vision: { x: 0.655, y: 0.27, scale: 1 },
  mark: { x: 0.965, y: 0.3, scale: 1 },
  execute: { x: 0.44, y: 0.42, scale: 1 },
  gadgets: { x: 0.515, y: 0.62, scale: 1 },
  takedown: { x: 0.6, y: 0.62, scale: 1 },
  ping: { x: 0.57, y: 0.09, scale: 1 },
  // 3.2.0 speed rocker (gear up / down): just right of the move stick's zone
  speed: { x: 0.445, y: 0.67, scale: 1 },
  // 3.2.0 jump (the action button beside it does what the world prompts show)
  jump: { x: 0.7, y: 0.78, scale: 1 },
};

/** Claw: fire and aim move up to the top-right (index finger), the right thumb stays on the camera. */
export const CLAW_LAYOUT: Record<TouchControlId, ControlPlacement> = {
  ...DEFAULT_LAYOUT,
  fire: { x: 0.9, y: 0.2, scale: 1 },
  ads: { x: 0.76, y: 0.2, scale: 1 },
  reload: { x: 0.64, y: 0.2, scale: 1 },
  grenade: { x: 0.69, y: 0.48, scale: 1 },
  shoulder: { x: 0.5, y: 0.09, scale: 1 },
  pause: { x: 0.585, y: 0.09, scale: 1 },
  vision: { x: 0.57, y: 0.33, scale: 1 },
  mark: { x: 0.9, y: 0.36, scale: 1 },
  gadgets: { x: 0.6, y: 0.62, scale: 1 },
};

/** Left-handed: everything mirrored. */
export const LEFTY_LAYOUT: Record<TouchControlId, ControlPlacement> = Object.fromEntries(
  Object.entries(DEFAULT_LAYOUT).map(([k, p]) => [k, { ...p, x: 1 - p.x }]),
) as Record<TouchControlId, ControlPlacement>;

export const LAYOUT_PRESETS = { default: DEFAULT_LAYOUT, claw: CLAW_LAYOUT, lefty: LEFTY_LAYOUT } as const;

/** Version-1 defaults: a stored placement equal to these was never customised (migration). */
const V1_DEFAULT_LAYOUT: Record<string, ControlPlacement> = {
  move: { x: 0.16, y: 0.7, scale: 1 },
  fire: { x: 0.86, y: 0.62, scale: 1 },
  fireLeft: { x: 0.08, y: 0.36, scale: 0.8 },
  ads: { x: 0.74, y: 0.78, scale: 1 },
  reload: { x: 0.77, y: 0.45, scale: 0.85 },
  crouch: { x: 0.84, y: 0.9, scale: 0.85 },
  swap: { x: 0.62, y: 0.88, scale: 0.85 },
  grenade: { x: 0.93, y: 0.42, scale: 0.8 },
  dash: { x: 0.3, y: 0.88, scale: 0.8 },
  shoulder: { x: 0.7, y: 0.09, scale: 0.75 },
  pause: { x: 0.79, y: 0.09, scale: 0.75 },
};

export function defaultSettings(): Settings {
  return {
    touch: {
      lookSensitivity: 1,
      adsMultiplier: 0.6,
      opacity: 0.6,
      scale: 1,
      invertY: false,
      aimAssist: 'standard',
      haptics: true,
      lookSpeed: 2.6,
      lookDeadzone: 0.1,
      lookAccel: true,
      dragLook: true,
      fireLeft: false,
      fireDragLook: false,
      dashFlick: false,
      layoutVersion: TOUCH_LAYOUT_VERSION,
      layout: structuredClone(DEFAULT_LAYOUT),
    },
    gamepad: {
      lookSensitivityX: 1,
      lookSensitivityY: 0.8,
      adsMultiplier: 0.55,
      deadzoneLeft: 0.15,
      deadzoneRight: 0.12,
      triggerDeadzone: 0.08,
      curve: 'classic',
      invertY: false,
      aimAssist: 'standard',
      vibration: true,
    },
    mouse: { sensitivity: 1, invertY: false, adsMultiplier: 0.6, raw: true },
    keys: defaultBinds(),
    video: { platform: 'auto', preset: 'epic', auto: true, device: { key: '', tier: null, source: 'none' }, gfx: { ...GRAPHICS_PRESETS.epic }, renderScale: 1, resolution: '', phoneOutput: PHONE_OUTPUT_DEFAULT, phoneSetup: false, dynamicRes: false, adaptive: true, upscaler: 'off', panini: 0, fpsCap: 0, fovH: 75, maxFov: 120, hudWidth: 'auto', gpuNotice: false, showFps: false, vignette: true, filmGrain: false, brightness: 1, brightnessSet: false, avatarStyle: 'detailed', avatarStyleV: 2 },
    audio: { master: 0.8, sfx: 1, music: 0.5, ui: 0.7 },
    gameplay: { defaultShoulder: 'right', adsToggle: false, crouchToggle: true, coverDash: true, slowBeat: true, sprintHold: false, autoRecentre: true },
    access: { hudScale: 1, healthBar: false, ammoAlways: false, colorSafe: false, subtitles: true, holdToggle: false, shake: 1 },
  };
}

const AIM: readonly AimAssistLevel[] = ['off', 'low', 'standard', 'high'];
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
export function setAuto(s: Settings, tier: FixedPreset | null, mobile = false): void {
  setPreset(s, tier ?? 'high', mobile);
  s.video.auto = true;
}

/** Apply a named preset: its features and its render resolution (scale + TAAU; the frame governor works within). */
export function setPreset(s: Settings, p: FixedPreset, mobile = false): void {
  const disp = presetDisplay(p, mobile);
  s.video.preset = p;
  s.video.gfx = { ...GRAPHICS_PRESETS[p] };
  if (Math.abs(s.video.renderScale - disp.renderScale) > 1e-3) s.video.resolution = '';
  s.video.renderScale = disp.renderScale;
  s.video.upscaler = disp.upscaler;
  s.video.auto = false;
}

/** Merge untrusted data (old saves, imports) over defaults, clamping every field. */
export function sanitizeSettings(raw: unknown): Settings {
  const d = defaultSettings();
  const r = isObj(raw) ? raw : {};
  const t = sub(r, 'touch');
  const g = sub(r, 'gamepad');
  const m = sub(r, 'mouse');
  const v = sub(r, 'video');
  const a = sub(r, 'audio');
  const gp = sub(r, 'gameplay');
  const ac = sub(r, 'access');
  const lay = sub(t, 'layout');
  const layout = {} as Record<TouchControlId, ControlPlacement>;
  // layouts from before the camera stick: keep customised placements of controls that still exist;
  // untouched (v1 default) ones and the new controls take the new defaults
  // (v2 -> v3, v3 -> v4 and v4 -> v5 only add controls: every stored placement is kept, the new one takes its default spot)
  const fromV1 = num(t.layoutVersion, 1, 1, 99) < 2;
  for (const id of TOUCH_CONTROL_IDS) {
    const p = sub(lay, id);
    const dp = d.touch.layout[id];
    const v1 = V1_DEFAULT_LAYOUT[id];
    // v1 "fire" was the right aim-and-fire stick; its spot now belongs to the camera stick, so it resets
    const isNew = !isObj(lay[id]);
    const untouched = isNew || (fromV1 && (!v1 || id === 'fire' || (p.x === v1.x && p.y === v1.y && p.scale === v1.scale)));
    const place: ControlPlacement = untouched ? { ...dp } : { x: num(p.x, dp.x, 0, 1), y: num(p.y, dp.y, 0, 1), scale: num(p.scale, dp.scale, 0.5, 2) };
    if (!untouched && typeof p.alpha === 'number') place.alpha = num(p.alpha, 1, 0.2, 1.6);
    layout[id] = place;
  }
  return {
    touch: {
      lookSensitivity: num(t.lookSensitivity, d.touch.lookSensitivity, 0.1, 4),
      adsMultiplier: num(t.adsMultiplier, d.touch.adsMultiplier, 0.1, 1.5),
      opacity: num(t.opacity, d.touch.opacity, 0.1, 1),
      scale: num(t.scale, d.touch.scale, 0.5, 2),
      invertY: bool(t.invertY, d.touch.invertY),
      aimAssist: pick(t.aimAssist, AIM, d.touch.aimAssist),
      haptics: bool(t.haptics, d.touch.haptics),
      lookSpeed: num(t.lookSpeed, d.touch.lookSpeed, 0.5, 8),
      lookDeadzone: num(t.lookDeadzone, d.touch.lookDeadzone, 0, 0.5),
      lookAccel: bool(t.lookAccel, d.touch.lookAccel),
      dragLook: bool(t.dragLook, d.touch.dragLook),
      fireLeft: bool(t.fireLeft, d.touch.fireLeft),
      fireDragLook: bool(t.fireDragLook, d.touch.fireDragLook),
      dashFlick: bool(t.dashFlick, d.touch.dashFlick),
      layoutVersion: TOUCH_LAYOUT_VERSION,
      layout,
    },
    gamepad: {
      lookSensitivityX: num(g.lookSensitivityX, d.gamepad.lookSensitivityX, 0.1, 4),
      lookSensitivityY: num(g.lookSensitivityY, d.gamepad.lookSensitivityY, 0.1, 4),
      adsMultiplier: num(g.adsMultiplier, d.gamepad.adsMultiplier, 0.1, 1.5),
      deadzoneLeft: num(g.deadzoneLeft, d.gamepad.deadzoneLeft, 0, 0.5),
      deadzoneRight: num(g.deadzoneRight, d.gamepad.deadzoneRight, 0, 0.5),
      triggerDeadzone: num(g.triggerDeadzone, d.gamepad.triggerDeadzone, 0, 0.5),
      curve: pick(g.curve, CURVES, d.gamepad.curve),
      invertY: bool(g.invertY, d.gamepad.invertY),
      aimAssist: pick(g.aimAssist, AIM, d.gamepad.aimAssist),
      vibration: bool(g.vibration, d.gamepad.vibration),
    },
    mouse: {
      sensitivity: num(m.sensitivity, d.mouse.sensitivity, 0.1, 5),
      invertY: bool(m.invertY, d.mouse.invertY),
      adsMultiplier: num(m.adsMultiplier, d.mouse.adsMultiplier, 0.2, 1.5),
      raw: bool(m.raw, d.mouse.raw),
    },
    keys: sanitizeBinds(r.keys),
    video: {
      platform: pick(v.platform, ['auto', 'desktop', 'mobile'] as const, d.video.platform),
      ...videoGfx(v),
      // (3.0 settings: Auto when still on the 3.0 default, Epic; a preset picked by hand stays)
      auto: bool(v.auto, v.preset === undefined || v.preset === 'epic'),
      device: sanitizeDevice(v.device),
      renderScale: num(v.renderScale, d.video.renderScale, 0.5, 2),
      resolution: typeof v.resolution === 'string' && /^\d{3,5}x\d{3,5}$/.test(v.resolution) ? v.resolution : '',
      phoneOutput: pick(v.phoneOutput, PHONE_OUTPUTS as readonly number[], d.video.phoneOutput),
      phoneSetup: bool(v.phoneSetup, false),
      dynamicRes: bool(v.dynamicRes, d.video.dynamicRes),
      adaptive: bool(v.adaptive, d.video.adaptive),
      upscaler: pick(v.upscaler, ['off', 'taau'] as const, d.video.upscaler),
      panini: num(v.panini, d.video.panini, 0, 1),
      fpsCap: pick(v.fpsCap, FPS_CAPS as readonly number[], d.video.fpsCap),
      fovH: num(v.fovH, d.video.fovH, 60, 120),
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
      music: num(a.music, d.audio.music, 0, 1),
      ui: num(a.ui, d.audio.ui, 0, 1),
    },
    gameplay: {
      defaultShoulder: pick(gp.defaultShoulder, ['right', 'left'] as const, d.gameplay.defaultShoulder),
      adsToggle: bool(gp.adsToggle, d.gameplay.adsToggle),
      crouchToggle: bool(gp.crouchToggle, d.gameplay.crouchToggle),
      coverDash: bool(gp.coverDash, d.gameplay.coverDash),
      slowBeat: bool(gp.slowBeat, d.gameplay.slowBeat),
      sprintHold: bool(gp.sprintHold, d.gameplay.sprintHold),
      autoRecentre: bool(gp.autoRecentre, d.gameplay.autoRecentre),
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
 * included); `changed` - everything else that differs from the defaults (touch layout / key bindings: "custom").
 */
export function settingsDigest(s: Settings): { video: string; changed: string } {
  const d = defaultSettings();
  const v: string[] = [];
  digestLeaves(s.video, d.video, '', v, false, new Set(['device']));
  v.push(`device=${s.video.device.tier ?? '-'} (${s.video.device.source})`);
  const c: string[] = [];
  const rest = { ...s, video: undefined } as Record<string, unknown>;
  const restD = { ...d, video: undefined } as Record<string, unknown>;
  digestLeaves(rest, restD, '', c, true, new Set(['touch.layout', 'keys']));
  return { video: v.join(' '), changed: c.length ? c.join(' ') : 'defaults' };
}
