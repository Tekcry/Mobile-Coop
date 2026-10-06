import { clamp, type CurveKind } from '../input/stickMath';

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
] as const;
/** Touch layout format version (2: camera stick, contextual action button; 3: takedown button). */
export const TOUCH_LAYOUT_VERSION = 3;
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
export type QualityPreset = 'auto' | 'low' | 'medium' | 'high' | 'ultra';

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
  mouse: { sensitivity: number; invertY: boolean };
  video: {
    quality: QualityPreset;
    renderScale: number;
    shadows: boolean;
    /** Horizontal FOV (degrees) at a 16:9 reference; wider screens see more at the sides (Hor+). */
    fovH: number;
    showFps: boolean;
    /** Cinematic look: gentle vignette, film grain (one combined pass). */
    vignette: boolean;
    filmGrain: boolean;
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
    mouse: { sensitivity: 1, invertY: false },
    video: { quality: 'auto', renderScale: 1, shadows: true, fovH: 75, showFps: false, vignette: true, filmGrain: false, avatarStyle: 'detailed', avatarStyleV: 2 },
    audio: { master: 0.8, sfx: 1, music: 0.5, ui: 0.7 },
    gameplay: { defaultShoulder: 'right', adsToggle: false, crouchToggle: true, coverDash: true, slowBeat: true, sprintHold: false, autoRecentre: true },
    access: { hudScale: 1, healthBar: false, ammoAlways: false, colorSafe: false, subtitles: true, holdToggle: false, shake: 1 },
  };
}

const AIM: readonly AimAssistLevel[] = ['off', 'low', 'standard', 'high'];
const CURVES: readonly CurveKind[] = ['linear', 'classic', 'precise', 'aggressive'];
const QUALITY: readonly QualityPreset[] = ['auto', 'low', 'medium', 'high', 'ultra'];

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, d: number, lo: number, hi: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : d;
const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);
const pick = <T>(v: unknown, allowed: readonly T[], d: T): T => (allowed.includes(v as T) ? (v as T) : d);
const sub = (o: Obj, k: string): Obj => (isObj(o[k]) ? (o[k] as Obj) : {});

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
  // (v2 -> v3 only adds controls: every stored placement is kept)
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
    },
    video: {
      quality: pick(v.quality, QUALITY, d.video.quality),
      renderScale: num(v.renderScale, d.video.renderScale, 0.5, 1),
      shadows: bool(v.shadows, d.video.shadows),
      fovH: num(v.fovH, d.video.fovH, 60, 100),
      showFps: bool(v.showFps, d.video.showFps),
      vignette: bool(v.vignette, d.video.vignette),
      filmGrain: bool(v.filmGrain, d.video.filmGrain),
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
