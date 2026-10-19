import { HUD_WIDTHS, type HudWidth } from './display';
import { clamp, type CurveKind } from '../input/stickMath';
import { defaultBinds, sanitizeBinds, type KeyBinds } from '../input/keyBindings';
import { defaultPadBinds, sanitizePadBinds, type PadBinds } from '../input/padBinds';
import { BRIGHTNESS_MAX, BRIGHTNESS_MIN } from '../world/darkCurve';
import { FPS_CAPS, GRAPHICS_PRESETS, LIGHT_RANGE, PRESET_DISPLAY, PRESET_IDS, presetOf, type AaMode, type FixedPreset, type GraphicsFeatures, type GraphicsPreset, type ReflectionMode, type ShadowQuality, type TierQuality } from './quality';

export type AimAssistLevel = 'off' | 'low' | 'standard' | 'high';

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
  /** (locomotion step 18, D7) Controller bindings (`input/padBinds.ts`; local only, D8). */
  pad: PadBinds;
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
  gameplay: { defaultShoulder: 'right' | 'left'; adsToggle: boolean; crouchToggle: boolean; slowBeat: boolean; sprintHold: boolean; autoRecentre: boolean; wallToggle: boolean; /** (locomotion step 18, D7) the grab from behind: true = press grabs and keeps them, a fresh press finishes (the 3.2.0 behaviour); false = keep the button held, letting go knocks them out (A70). */ grabToggle: boolean; /** (locomotion step 17) rumble strength 0..1 (the rumble table; local only, D8). */ rumble: number;
    /** Training course: the next drill's marker (D19; default on). */
    courseMarkers: boolean };
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

/** (Playtest 2) Look speed while aiming = 0.3 of the explore speed (70% less). A saved old default (0.55 pad, 0.6 mouse) follows it. */
export const ADS_LOOK = 0.3;
const adsLook = (v: unknown, d: number, lo: number): number => {
  const n = num(v, d, lo, 1.5);
  return n === 0.55 || n === 0.6 ? ADS_LOOK : n;
};

export function defaultSettings(): Settings {
  return {
    gamepad: {
      lookSensitivityX: 1,
      lookSensitivityY: 0.8,
      adsMultiplier: ADS_LOOK,
      deadzoneLeft: 0.15,
      deadzoneRight: 0.12,
      triggerDeadzone: 0.08,
      curve: 'classic',
      invertY: false,
      aimAssist: 'standard',
      vibration: true,
    },
    mouse: { sensitivity: 1, invertY: false, adsMultiplier: ADS_LOOK, raw: true },
    keys: defaultBinds(),
    pad: defaultPadBinds(),
    video: { preset: 'epic', auto: true, device: { key: '', tier: null, source: 'none' }, gfx: { ...GRAPHICS_PRESETS.epic }, renderScale: 1, resolution: '', dynamicRes: false, adaptive: true, upscaler: 'off', panini: 0, fpsCap: 0, fovH: 75, maxFov: 120, hudWidth: 'auto', gpuNotice: false, showFps: false, vignette: true, filmGrain: false, brightness: 1, brightnessSet: false, avatarStyle: 'detailed', avatarStyleV: 2 },
    audio: { master: 0.8, sfx: 1, music: 0.15, ui: 0.7, musicV: 3 },
    gameplay: { defaultShoulder: 'right', adsToggle: false, crouchToggle: true, slowBeat: true, sprintHold: false, autoRecentre: true, wallToggle: true, grabToggle: true, rumble: 1, courseMarkers: true },
    access: { hudScale: 1, healthBar: true, ammoAlways: false, colorSafe: false, subtitles: true, holdToggle: false, shake: 1 },
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
      lookSensitivityY: num(g.lookSensitivityY, d.gamepad.lookSensitivityY, 0.1, 4),
      adsMultiplier: adsLook(g.adsMultiplier, d.gamepad.adsMultiplier, 0.1),
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
      adsMultiplier: adsLook(m.adsMultiplier, d.mouse.adsMultiplier, 0.2),
      raw: bool(m.raw, d.mouse.raw),
    },
    keys: sanitizeBinds(r.keys),
    pad: sanitizePadBinds(r.pad),
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
      music: musicKept(a.musicV, num(a.music, d.audio.music, 0, 1), d.audio.music),
      ui: num(a.ui, d.audio.ui, 0, 1),
      musicV: 3,
    },
    gameplay: {
      defaultShoulder: pick(gp.defaultShoulder, ['right', 'left'] as const, d.gameplay.defaultShoulder),
      adsToggle: bool(gp.adsToggle, d.gameplay.adsToggle),
      crouchToggle: bool(gp.crouchToggle, d.gameplay.crouchToggle),
      slowBeat: bool(gp.slowBeat, d.gameplay.slowBeat),
      wallToggle: bool(gp.wallToggle, d.gameplay.wallToggle),
      grabToggle: bool(gp.grabToggle, d.gameplay.grabToggle),
      sprintHold: bool(gp.sprintHold, d.gameplay.sprintHold),
      autoRecentre: bool(gp.autoRecentre, d.gameplay.autoRecentre),
      rumble: num(gp.rumble, d.gameplay.rumble, 0, 1),
      courseMarkers: bool(gp.courseMarkers, d.gameplay.courseMarkers),
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
