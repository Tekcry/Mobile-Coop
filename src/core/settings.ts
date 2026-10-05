import { clamp, type CurveKind } from '../input/stickMath';

export const TOUCH_CONTROL_IDS = [
  'move',
  'fire',
  'fireLeft',
  'ads',
  'reload',
  'jump',
  'crouch',
  'swap',
  'grenade',
  'interact',
  'cover',
  'dash',
  'shoulder',
  'pause',
] as const;
export type TouchControlId = (typeof TOUCH_CONTROL_IDS)[number];

/** Control centre in normalised screen space (0..1) and per-control scale. */
export interface ControlPlacement {
  x: number;
  y: number;
  scale: number;
}

export type AimAssistLevel = 'off' | 'low' | 'standard' | 'high';
export type QualityPreset = 'auto' | 'low' | 'medium' | 'high';

export interface Settings {
  touch: {
    lookSensitivity: number;
    adsMultiplier: number;
    opacity: number;
    scale: number;
    invertY: boolean;
    aimAssist: AimAssistLevel;
    haptics: boolean;
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
  };
  audio: { master: number; sfx: number; music: number; ui: number };
  gameplay: { defaultShoulder: 'right' | 'left'; adsToggle: boolean; crouchToggle: boolean; autoCover: boolean; coverDash: boolean };
}

export const DEFAULT_LAYOUT: Record<TouchControlId, ControlPlacement> = {
  move: { x: 0.16, y: 0.7, scale: 1 },
  fire: { x: 0.86, y: 0.62, scale: 1 },
  fireLeft: { x: 0.08, y: 0.36, scale: 0.8 },
  ads: { x: 0.74, y: 0.78, scale: 1 },
  reload: { x: 0.77, y: 0.45, scale: 0.85 },
  jump: { x: 0.93, y: 0.82, scale: 0.9 },
  crouch: { x: 0.84, y: 0.9, scale: 0.85 },
  swap: { x: 0.62, y: 0.88, scale: 0.85 },
  grenade: { x: 0.93, y: 0.42, scale: 0.8 },
  interact: { x: 0.62, y: 0.62, scale: 0.85 },
  cover: { x: 0.62, y: 0.42, scale: 0.85 },
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
    video: { quality: 'auto', renderScale: 1, shadows: true, fovH: 75, showFps: false },
    audio: { master: 0.8, sfx: 1, music: 0.5, ui: 0.7 },
    gameplay: { defaultShoulder: 'right', adsToggle: false, crouchToggle: true, autoCover: false, coverDash: true },
  };
}

const AIM: readonly AimAssistLevel[] = ['off', 'low', 'standard', 'high'];
const CURVES: readonly CurveKind[] = ['linear', 'classic', 'precise', 'aggressive'];
const QUALITY: readonly QualityPreset[] = ['auto', 'low', 'medium', 'high'];

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
  const lay = sub(t, 'layout');
  const layout = {} as Record<TouchControlId, ControlPlacement>;
  for (const id of TOUCH_CONTROL_IDS) {
    const p = sub(lay, id);
    const dp = d.touch.layout[id];
    layout[id] = { x: num(p.x, dp.x, 0, 1), y: num(p.y, dp.y, 0, 1), scale: num(p.scale, dp.scale, 0.5, 2) };
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
      autoCover: bool(gp.autoCover, d.gameplay.autoCover),
      coverDash: bool(gp.coverDash, d.gameplay.coverDash),
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
