/**
 * ON15: the editor's Moon and time panel (View tab): the time-of-night slider's simple sky path for the site, the moon's
 * bearing, height and brightness steps, the brief's night, and the panel's words. The numbers are facts (`moon`); the
 * theme the setting makes is the game's own (`src/world/maps/kestrelNight.ts`). Babylon- and DOM-free
 * (tests/editor/night.test.ts).
 */
import facts from '../../scripts/kestrel/facts.json';
import { MOON_BRIGHTNESS, readNight, type MoonBrightness, type NightSetting } from '../world/maps/kestrelNight';

const F = facts.moon;
export const MOON = {
  latitude: F.latitude.value,
  declination: F.declination.value,
  dusk: F.dusk.value,
  dawn: F.dawn.value,
  timeStep: F.timeStep.value,
  bearingStep: F.bearingStep.value,
  heightStep: F.heightStep.value,
  heightMin: F.heightMin.value,
  heightMax: F.heightMax.value,
  briefTime: F.briefTime.value,
  briefBrightness: F.briefBrightness.value as MoonBrightness,
} as const;

const D2R = Math.PI / 180;
const DAY = 1440;

/** Minutes after midnight to "HH:MM". */
export function clock(m: number): string {
  const t = ((Math.round(m) % DAY) + DAY) % DAY;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** "HH:MM" to minutes after midnight (NaN when it is not a time). */
export function minutesOf(s: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}

/** Minutes since dusk (0 at dusk, the night's length at dawn): the slider's position. */
export function sinceDusk(m: number): number {
  return (((m - MOON.dusk) % DAY) + DAY) % DAY;
}

/** The night's length in minutes, dusk to dawn. */
export const NIGHT_LENGTH = sinceDusk(MOON.dawn);

/**
 * The simple sky path (Overnight choice: the site at facts `moon.latitude`, northern hemisphere): the moon is treated as
 * a star of declination `moon.declination` that crosses the meridian in the south at midnight (as a full moon does), its
 * hour angle 15 degrees an hour. Returns the compass bearing (clockwise from north) and the height above the horizon,
 * both whole degrees, the height kept within the bake's limits.
 */
export function skyAt(minutes: number): { bearing: number; height: number } {
  const rel = ((((minutes + DAY / 2) % DAY) + DAY) % DAY) - DAY / 2; // minutes from midnight, -720..720
  const H = (rel / 4) * D2R;
  const phi = MOON.latitude * D2R;
  const dec = MOON.declination * D2R;
  const sinAlt = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / D2R;
  const az = Math.atan2(-Math.cos(dec) * Math.sin(H), Math.sin(dec) * Math.cos(phi) - Math.cos(dec) * Math.cos(H) * Math.sin(phi)) / D2R;
  return { bearing: Math.round(((az % 360) + 360) % 360) % 360, height: Math.round(Math.min(MOON.heightMax, Math.max(MOON.heightMin, alt))) };
}

/** The night at a time (minutes after midnight) and brightness: bearing and height from the sky path. */
export function nightAt(minutes: number, brightness: MoonBrightness): NightSetting {
  return { ...skyAt(minutes), brightness, time: clock(minutes) };
}

/** The mission brief's night (01-mission-brief.md section 2): 01:10, a thin moon behind cloud. The panel's default. */
export function briefNight(): NightSetting {
  return nightAt(MOON.briefTime, MOON.briefBrightness);
}

/** The panel's setting: the map's own (`meta.night`) when it has one, else the brief's night. */
export function panelNight(meta: { readonly [k: string]: unknown }): NightSetting {
  return readNight(meta.night) ?? briefNight();
}

/** The next whole step beyond a value (a value between steps goes to the step on that side). */
const nextStep = (v: number, st: number, dir: 1 | -1): number => (dir > 0 ? Math.floor(v / st + 1e-9) * st + st : Math.ceil(v / st - 1e-9) * st - st);

export type NightRow = 'time' | 'bearing' | 'height' | 'brightness';

/**
 * One step of a row (left / right, the hub's - / +): the time by `moon.timeStep` within dusk to dawn (the bearing and
 * height follow the sky path); the bearing by `moon.bearingStep` round the compass; the height by `moon.heightStep`
 * within its limits; the brightness through new, quarter, half, full. A hand-set bearing or height keeps the time's
 * words but marks it hand set ("time" empty).
 */
export function stepNight(n: NightSetting, row: NightRow, dir: 1 | -1): NightSetting {
  if (row === 'time') {
    const at = minutesOf(n.time);
    const pos = at === at ? sinceDusk(at) : sinceDusk(MOON.briefTime);
    const s = Math.round(pos / MOON.timeStep) * MOON.timeStep + dir * MOON.timeStep;
    const next = Math.max(0, Math.min(NIGHT_LENGTH, s));
    return nightAt(MOON.dusk + next, n.brightness);
  }
  if (row === 'bearing') {
    const st = MOON.bearingStep;
    const b = nextStep(n.bearing, st, dir);
    return { ...n, bearing: ((b % 360) + 360) % 360, time: '' };
  }
  if (row === 'height') {
    const st = MOON.heightStep;
    const h = nextStep(n.height, st, dir);
    return { ...n, height: Math.min(MOON.heightMax, Math.max(MOON.heightMin, h)), time: '' };
  }
  const i = MOON_BRIGHTNESS.findIndex((m) => m.id === n.brightness);
  const j = Math.min(MOON_BRIGHTNESS.length - 1, Math.max(0, i + dir));
  return { ...n, brightness: MOON_BRIGHTNESS[j]!.id };
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

/** "225 (SW)". */
export function bearingWords(b: number): string {
  return `${Math.round(b)} (${COMPASS[Math.round(b / 45) % 8]})`;
}

export function brightnessName(b: MoonBrightness): string {
  return MOON_BRIGHTNESS.find((m) => m.id === b)?.name ?? b;
}

/** The time row's value: "01:10 Brief" at the brief's time, "hand set" after a bearing or height step. */
export function timeWords(n: NightSetting): string {
  if (!n.time) return 'hand set';
  return n.time === clock(MOON.briefTime) ? `${n.time} Brief` : n.time;
}

/** Where the time sits on the slider (0 dusk .. 1 dawn), and the brief's marker. */
export function timeFrac(n: NightSetting): number {
  const m = minutesOf(n.time);
  return m === m ? sinceDusk(m) / NIGHT_LENGTH : NaN;
}
export const BRIEF_FRAC = sinceDusk(MOON.briefTime) / NIGHT_LENGTH;

/** "Moon 205 (SW), 54 degrees high, new, 01:10". */
export function nightWords(n: NightSetting): string {
  return `Moon ${bearingWords(n.bearing)}, ${Math.round(n.height)} degrees high, ${brightnessName(n.brightness).toLowerCase()}${n.time ? `, ${n.time}` : ''}`;
}

/** Two settings the same (what the map has against what the panel shows). */
export function sameNight(a: NightSetting | null, b: NightSetting | null): boolean {
  return !!a && !!b && a.bearing === b.bearing && a.height === b.height && a.brightness === b.brightness && a.time === b.time;
}

/** Where the moon's shadow falls from a point: the plan direction the light travels (x east, z north), unit length. */
export function shadowWay(n: Pick<NightSetting, 'bearing'>): [number, number] {
  const b = n.bearing * D2R;
  return [-Math.sin(b), -Math.cos(b)];
}
