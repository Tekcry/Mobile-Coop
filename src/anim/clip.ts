/**
 * Animation clips (pure): keyed channel curves plus metadata. Cycle clips are keyed over the gait
 * phase (0..1, left heel strike at 0, right at 0.5) and carry contact timing (duty) and swing lift;
 * timed clips are keyed in seconds. Clip values are absolute channel values; evaluating a clip into a
 * pose adds `weight * (value - neutral)` so layers blend and stack without allocation.
 */
import { curve, evalCurve, type Curve } from './curves';
import { CH, CHANNELS, NCH, newPose, type Channel, type Pose } from './pose';

export interface ClipDef {
  name: string;
  /** Seconds for timed clips; 1 for cycles (keys are in phase). */
  duration?: number;
  loop?: boolean;
  /** Keyed over the gait phase. */
  cycle?: boolean;
  /** Fraction of the cycle each foot is on the ground (cycles). */
  duty?: number;
  /** Swing lift height (m at 1.75 m) (cycles). */
  liftH?: number;
  /** Channel keys as flat [t0, v0, t1, v1, ...]. */
  keys: Partial<Record<Channel, readonly number[]>>;
  /** Named event times (s or phase), e.g. 'magOut', 'release'. */
  events?: Record<string, number>;
}

export interface Clip {
  name: string;
  duration: number;
  loop: boolean;
  cycle: boolean;
  duty: number;
  liftH: number;
  /** Channel index -> curve (null = not keyed). */
  curves: (Curve | null)[];
  keyed: number[];
  events: Record<string, number>;
}

/** Neutral value per channel (what an unkeyed channel means). */
export const NEUTRAL: Pose = newPose();

export function makeClip(d: ClipDef): Clip {
  const duration = d.cycle ? 1 : (d.duration ?? 1);
  const loop = d.cycle ? true : (d.loop ?? false);
  const curves: (Curve | null)[] = new Array(NCH).fill(null);
  const keyed: number[] = [];
  for (const [name, kv] of Object.entries(d.keys) as [Channel, readonly number[]][]) {
    const i = CH[name];
    curves[i] = curve(kv, loop, duration);
    keyed.push(i);
  }
  return { name: d.name, duration, loop, cycle: !!d.cycle, duty: d.duty ?? 0.62, liftH: d.liftH ?? 0.07, curves, keyed, events: d.events ?? {} };
}

/** Accumulate `weight * (clip(t) - neutral)` into `out` for the clip's keyed channels. */
export function addClip(out: Pose, c: Clip, t: number, weight: number, scale = 1): void {
  if (weight === 0) return;
  for (let k = 0; k < c.keyed.length; k++) {
    const i = c.keyed[k]!;
    out[i] = out[i]! + weight * (evalCurve(c.curves[i]!, t) - NEUTRAL[i]!) * scale;
  }
}

/** Override blend: keyed channels move towards the clip's values by `weight` (pose layers). */
export function overClip(out: Pose, c: Clip, t: number, weight: number): void {
  if (weight === 0) return;
  for (let k = 0; k < c.keyed.length; k++) {
    const i = c.keyed[k]!;
    const v = evalCurve(c.curves[i]!, t);
    out[i] = out[i]! + weight * (v - out[i]!);
  }
}

/** Single channel of a clip at t (neutral if unkeyed). */
export function sample(c: Clip, ch: Channel, t: number): number {
  const cv = c.curves[CH[ch]];
  return cv ? evalCurve(cv, t) : NEUTRAL[CH[ch]]!;
}

/** Left/right mirror of a clip (strafe left from strafe right, left-foot-first starts). */
export function mirrorClip(c: Clip, name = `${c.name}-m`): Clip {
  const neg = new Set<Channel>(['pelX', 'pelRoll', 'pelYaw', 'spYaw', 'spRoll', 'hdYaw', 'hdRoll', 'wpX', 'wpYaw', 'wpRoll']);
  const swap: Partial<Record<Channel, Channel>> = {
    fLX: 'fRX',
    fRX: 'fLX',
    fLZ: 'fRZ',
    fRZ: 'fLZ',
    fLY: 'fRY',
    fRY: 'fLY',
    fLPitch: 'fRPitch',
    fRPitch: 'fLPitch',
    hLX: 'hRX',
    hRX: 'hLX',
    hLY: 'hRY',
    hRY: 'hLY',
    hLZ: 'hRZ',
    hRZ: 'hLZ',
  };
  const curves: (Curve | null)[] = new Array(NCH).fill(null);
  const keyed: number[] = [];
  for (const i of c.keyed) {
    const name = CHANNELS[i]!;
    const to = swap[name] ?? name;
    const src = c.curves[i]!;
    const flip = neg.has(name) || name === 'fLX' || name === 'fRX' || name === 'hLX' || name === 'hRX';
    // a cycle's left foot leads at phase 0; mirrored, the right foot does: shift by half a cycle
    const shift = c.cycle ? 0.5 : 0;
    const kv: number[] = [];
    const n = src.t.length;
    const pairs: [number, number][] = [];
    for (let j = 0; j < n; j++) pairs.push([(src.t[j]! + shift) % (c.cycle ? 1 : Infinity), flip ? -src.v[j]! : src.v[j]!]);
    pairs.sort((a, b) => a[0] - b[0]);
    for (const [t, v] of pairs) kv.push(t, v);
    const j = CH[to];
    curves[j] = curve(kv, c.loop, c.duration);
    keyed.push(j);
  }
  return { ...c, name, curves, keyed };
}
