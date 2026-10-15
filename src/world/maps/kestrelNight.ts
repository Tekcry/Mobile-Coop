/**
 * ON15: the Kestrel map's own night (`meta.night` in the campus file): the moon's compass bearing, its height above the
 * horizon, its brightness and the time of night the editor's slider set. The one copy shared by the editor (light view,
 * darkness map) and the game (the map's theme, dev and build): it only turns the setting into the theme fields the game
 * already reads (`sunDir`, `sunIntensity`, `lightLevel`); the light model and the theme code are unchanged (RULES 11).
 * Without `meta.night` the map keeps its own theme exactly. Pure, import-free but for types.
 */
import type { MapTheme } from '../mapDef';

export type MoonBrightness = 'new' | 'quarter' | 'half' | 'full';

/** The campus file's `meta.night` (schema.md). Degrees: bearing clockwise from north (+Z), height above the horizon. */
export interface NightSetting {
  bearing: number;
  height: number;
  brightness: MoonBrightness;
  /** The time of night the slider set, "HH:MM" (display only; the bearing and height are what the game reads). */
  time: string;
}

/**
 * The brightness steps as a share of the theme's own moon. The theme's moon is the game's night-map moon (Embassy's 0.14
 * against a 0.28 sky fill), so "full" is today's Kestrel moon and the scale never goes past what the game's night maps use.
 */
export const MOON_BRIGHTNESS: readonly { id: MoonBrightness; name: string; share: number; src: string }[] = [
  { id: 'new', name: 'New', share: 0, src: 'ON15 brief decision 1: no moon light (the sky fill only)' },
  { id: 'quarter', name: 'Quarter', share: 0.25, src: 'editor default: a thin moon, a quarter of the full moon light (lit fraction)' },
  { id: 'half', name: 'Half', share: 0.5, src: 'editor default: a half moon, half the full moon light (lit fraction)' },
  { id: 'full', name: 'Full', share: 1, src: "the game's night-map moon (src/world/maps/embassy.ts sunIntensity 0.14), today's Kestrel moon" },
];

const D2R = Math.PI / 180;

/** The light's travel direction (the theme's `sunDir`) for a moon at this bearing and height: down and away from it. */
export function moonTravel(bearing: number, height: number): [number, number, number] {
  const b = bearing * D2R;
  const h = height * D2R;
  const c = Math.cos(h);
  return [-Math.sin(b) * c, -Math.sin(h), -Math.cos(b) * c];
}

/** A `meta.night` as read from a file: the setting, or null when it is missing or malformed (the map keeps its moon). */
export function readNight(v: unknown): NightSetting | null {
  if (!v || typeof v !== 'object') return null;
  const n = v as Record<string, unknown>;
  const b = n.bearing;
  const h = n.height;
  if (typeof b !== 'number' || typeof h !== 'number' || !isFinite(b) || !isFinite(h) || h <= 0 || h >= 90) return null;
  const br = MOON_BRIGHTNESS.find((m) => m.id === n.brightness);
  if (!br) return null;
  return { bearing: ((b % 360) + 360) % 360, height: h, brightness: br.id, time: typeof n.time === 'string' ? n.time : '' };
}

/**
 * The map's theme under its own night: the moon's direction from the bearing and height; its light the brightness's share
 * of the theme's moon, the sky fill unchanged (`lampMath.moonLight` then gives the moon exactly that share of the theme's
 * moon level, and the open sky's level is the fill plus it). No setting: the theme itself.
 */
export function nightTheme(base: MapTheme, night: unknown): MapTheme {
  const n = readNight(night);
  if (!n) return base;
  const share = MOON_BRIGHTNESS.find((m) => m.id === n.brightness)!.share;
  const level = base.lightLevel ?? 0.75;
  const fill = base.ambient + base.sunIntensity > 0 ? (level * base.ambient) / (base.ambient + base.sunIntensity) : level;
  const sun = base.sunIntensity * share;
  return { ...base, sunDir: moonTravel(n.bearing, n.height), sunIntensity: sun, lightLevel: base.ambient > 0 ? (fill * (base.ambient + sun)) / base.ambient : level };
}
