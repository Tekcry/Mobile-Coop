/**
 * (LR16-5, Michael M13 2026-10-23 "Flicker + stutter") Lights that move on their own: a fire flickers, and one failing
 * tube per main map stutters. Pure (no Babylon, no DOM) and allocation-free: the value is a function of (the lamp's
 * seed, the synced sim time) only, so the host and a co-op client compute the same light with no wire change, and the
 * picture, the meter and the guards read the same number (`LightDef.flicker`, set by `LightRegistry.tickFlicker`).
 *
 * - Fire: smooth value noise, three octaves (about 2, 5 and 11 Hz), 0.75..1.0.
 * - Stutter: mostly on; in about half of the 4.5 s windows one burst, 0.25-1.4 s, at an irregular point in the window.
 *   A chatter burst snaps between off, dim and on every ~55 ms; a drop-out burst (3 in 10) holds the tube dead with the
 *   starter's brief blinks, then it catches. A burst always starts off and always ends on.
 *
 * The stutter tubes are a table here (by map id and lamp position), not in the map files: a map edit that moves the
 * fitting drops the stutter, and `tests/lampFlicker.test.ts` fails on it.
 */
import type { LightRegistry } from './lights';

/** Flicker modes (`LightRegistry.setFlicker`). */
export const FLICKER_NONE = 0;
export const FLICKER_FIRE = 1;
export const FLICKER_STUTTER = 2;
export type FlickerMode = typeof FLICKER_NONE | typeof FLICKER_FIRE | typeof FLICKER_STUTTER;

/** The sim's fixed step rate (`core/loop.ts` FIXED_DT = 1 / 60): `LightRegistry.tickFlicker` snaps its time to it. */
export const FLICKER_STEP_HZ = 60;

/** Fire: the lowest and highest multiplier. */
export const FIRE_MIN = 0.75;
export const FIRE_MAX = 1;
/** Fire noise: octave frequencies (Hz) and weights (sum 1). */
const FIRE_HZ0 = 2.3;
const FIRE_HZ1 = 5.3;
const FIRE_HZ2 = 11.1;
const FIRE_W0 = 0.55;
const FIRE_W1 = 0.3;
const FIRE_W2 = 0.15;

/** Stutter: the window (s), the chance of a burst in one, the chance a burst is a drop-out. */
export const STUTTER_WINDOW = 4.5;
const STUTTER_BURST_P = 0.55;
const STUTTER_DROPOUT_P = 0.3;
/** Chatter: length 0.25 + up to 0.9 s, a step every 1 / 18 s; per step off 40 %, dim 20 %, on 40 %. */
const CHATTER_MIN = 0.25;
const CHATTER_SPAN = 0.9;
const CHATTER_HZ = 18;
const CHATTER_OFF = 0.4;
const CHATTER_DIM_P = 0.2;
/** The dim level of a chattering tube. */
export const STUTTER_DIM = 0.35;
/** Drop-out: length 0.6 + up to 0.8 s, a step every 1 / 14 s, the starter blinks on 18 % of the steps. */
const DROP_MIN = 0.6;
const DROP_SPAN = 0.8;
const DROP_HZ = 14;
const DROP_BLINK_P = 0.18;
/** A starter blink's level. */
export const STUTTER_BLINK = 0.7;
/** The longest burst (s). */
export const STUTTER_BURST_MAX = DROP_MIN + DROP_SPAN;

/** Long-run means (measured over 2 h of sim time, `tests/lampFlicker.test.ts`): what a lamp gives on average. (For the
 *  LR16-1 bounce at the merge: the bounce should use the lamp's mean, or ignore the flicker; it must never follow it
 *  frame by frame.) */
export const FIRE_MEAN = 0.875;
export const STUTTER_MEAN = 0.94;

/** A 30-bit integer hash of two integers (lowbias32 mix, low 30 bits): always a small integer (Smi), so the call never
 *  boxes its result when V8 leaves it un-inlined (a uint32 above 2^30 is a 16 B HeapNumber: tickFlicker read 66-145 B a
 *  call on CI, hash2 x14 over the inline budget). */
export function hash2(a: number, b: number): number {
  let h = Math.imul(a | 0, 0x9e3779b1) ^ Math.imul((b | 0) ^ 0x5bd1e995, 0x85ebca77);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) & 0x3fffffff;
}

/** A map's flicker seed from its id and the match seed (both pages build the same map from the `start` message). */
export function mapFlickerSeed(mapId: string, seed: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < mapId.length; i++) h = Math.imul(h ^ mapId.charCodeAt(i), 0x01000193);
  return hash2(h, seed);
}

/** A lamp's own seed: the map's flicker seed and its registry id (30 bits: a small integer V8 never boxes). */
export function lampSeed(mapSeed: number, id: number): number {
  return hash2(mapSeed, id + 0x3c6ef372) & 0x3fffffff;
}

/** The evaluators' time in (s) and value out: V8 boxes a double passed to or returned from a call it does not inline
 *  (16 B); typed slots are read and written in place. `flickerAt` reads `FLICKER_T[0]` and writes `FLICKER_OUT[0]`. */
export const FLICKER_T = new Float64Array(1);
export const FLICKER_OUT = new Float64Array(1);

/** 2^-30: a `hash2` as a fraction 0..1 (exclusive). */
const U = 1 / 0x40000000;

/** A fire's multiplier at time `FLICKER_T[0]` (s) into `FLICKER_OUT[0]`: `FIRE_MIN`..`FIRE_MAX`, smooth, a few Hz. Three octaves of
 *  value noise (lattice values 0..1, smoothstep between), written out so nothing is boxed. */
function fireAt(seed: number): void {
  const t = FLICKER_T[0]!;
  const s1 = seed ^ 0x68e31da4;
  const s2 = seed ^ 0x1b56c4e9;
  let x = t * FIRE_HZ0;
  let i = Math.floor(x);
  let f = x - i;
  let a = hash2(seed, i) * U;
  let n = FIRE_W0 * (a + (hash2(seed, i + 1) * U - a) * (f * f * (3 - 2 * f)));
  x = t * FIRE_HZ1 + 17.3;
  i = Math.floor(x);
  f = x - i;
  a = hash2(s1, i) * U;
  n += FIRE_W1 * (a + (hash2(s1, i + 1) * U - a) * (f * f * (3 - 2 * f)));
  x = t * FIRE_HZ2 + 41.9;
  i = Math.floor(x);
  f = x - i;
  a = hash2(s2, i) * U;
  n += FIRE_W2 * (a + (hash2(s2, i + 1) * U - a) * (f * f * (3 - 2 * f)));
  FLICKER_OUT[0] = FIRE_MIN + (FIRE_MAX - FIRE_MIN) * n;
}

/** A failing tube's multiplier at time `FLICKER_T[0]` (s) into `FLICKER_OUT[0]`: 1 (on), `STUTTER_DIM`, `STUTTER_BLINK` or 0 (off);
 *  piecewise constant. */
function stutterAt(seed: number): void {
  const t = FLICKER_T[0]!;
  const k = Math.floor(t / STUTTER_WINDOW);
  const h = hash2(seed, k);
  const out = FLICKER_OUT;
  out[0] = 1;
  if (hash2(h, 1) * U >= STUTTER_BURST_P) return;
  const drop = hash2(h, 2) * U < STUTTER_DROPOUT_P;
  const len = drop ? DROP_MIN + DROP_SPAN * hash2(h, 3) * U : CHATTER_MIN + CHATTER_SPAN * hash2(h, 3) * U;
  const tau = t - (k * STUTTER_WINDOW + (STUTTER_WINDOW - len) * hash2(h, 4) * U);
  if (tau < 0 || tau >= len) return;
  if (drop) {
    const j = Math.floor(tau * DROP_HZ);
    // the last step: the tube catches
    if ((j + 1) / DROP_HZ >= len) return;
    out[0] = j > 0 && hash2(h ^ 0x2545f491, j) * U < DROP_BLINK_P ? STUTTER_BLINK : 0;
    return;
  }
  const j = Math.floor(tau * CHATTER_HZ);
  if (j === 0) {
    out[0] = 0;
    return;
  }
  const r = hash2(h ^ 0x6a09e667, j) * U;
  out[0] = r < CHATTER_OFF ? 0 : r < CHATTER_OFF + CHATTER_DIM_P ? STUTTER_DIM : 1;
}

/** A lamp in `mode` at time `FLICKER_T[0]` into `FLICKER_OUT[0]` (1 for `FLICKER_NONE`). No allocation (`LightRegistry.tickFlicker`). */
export function flickerAt(mode: number, seed: number): void {
  if (mode === FLICKER_FIRE) fireAt(seed);
  else if (mode === FLICKER_STUTTER) stutterAt(seed);
  else FLICKER_OUT[0] = 1;
}

/** A fire's multiplier at time `t` (tests, tools; `flickerAt` on the hot path). */
export function fireFlicker(t: number, seed: number): number {
  FLICKER_T[0] = t;
  fireAt(seed);
  return FLICKER_OUT[0]!;
}

/** A failing tube's multiplier at time `t` (tests, tools; `flickerAt` on the hot path). */
export function tubeStutter(t: number, seed: number): number {
  FLICKER_T[0] = t;
  stutterAt(seed);
  return FLICKER_OUT[0]!;
}

/** A lamp in `mode` at time `t` (tests, tools; `flickerAt` on the hot path). */
export function flickerValue(mode: number, t: number, seed: number): number {
  FLICKER_T[0] = t;
  flickerAt(mode, seed);
  return FLICKER_OUT[0]!;
}

/** The long-run mean of a mode (1 for `FLICKER_NONE`). */
export function flickerMean(mode: number): number {
  return mode === FLICKER_FIRE ? FIRE_MEAN : mode === FLICKER_STUTTER ? STUTTER_MEAN : 1;
}

/** A stutter tube: the fitting's light position and why it was chosen. */
export interface StutterTube {
  x: number;
  y: number;
  z: number;
  why: string;
}

/**
 * One stutter tube per main map (LR16-5; Michael M13). Each map lists candidates in order; the first that matches a
 * fixed light at its position (within `TUBE_TOL` on each axis) stutters. Fires (`kind: 'fire'`) flicker wherever they are.
 * Marlow Yard (`ctcourse`) lists the marlow-final layout first (on master: the A7 data hall), then the pre-marlow-final
 * one (this branch's base; it drops out at the master merge). Never in A2 / A4 / A6 / A8 (PR #257 owns those sets).
 */
export const STUTTER_TUBES: Readonly<Record<string, readonly StutterTube[]>> = {
  campusOps: [{ x: -25, y: 7.9, z: -26, why: 'HQ L1 breakout kitchen fitting (back room off the south ring, not on a player route); the two break guards loop under it' }],
  warehouseOps: [{ x: -3.4, y: 2.75, z: -12.3, why: 'Trade offices corridor panel, west half: the corridor guard walks under it and both section 1 routes pass it' }],
  warehouse: [{ x: 9, y: 5.05, z: -9, why: 'Service corridor strip (the corridor between the fire walls), over the corridor patrol' }],
  ctcourse: [
    { x: 81.6, y: 3.8, z: 57.4, why: "A7 data hall: the south aisle's rack-row strip, on the technician's loop between R0 and R1" },
    { x: 19, y: 3.05, z: 7, why: 'Pre-marlow-final layout: airlock 1 lamp (dropped at the master merge)' },
  ],
};

/** A stutter tube's match tolerance (m, each axis). */
export const TUBE_TOL = 0.05;

/** The registry id of the light at a tube's position (fixed lights only), or -1. Load time. */
export function findTube(reg: LightRegistry, t: StutterTube): number {
  const ls = reg.lights;
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i]!;
    if (l.kind === 'flashlight') continue;
    if (Math.abs(l.x - t.x) <= TUBE_TOL && Math.abs(l.y - t.y) <= TUBE_TOL && Math.abs(l.z - t.z) <= TUBE_TOL) return l.id;
  }
  return -1;
}

/**
 * Set a map's flicker up on its registry (`World.create`, after the map builds): the flicker seed from the map id and
 * the match seed, and the map's stutter tube (the first matching candidate). Fires enrolled themselves at `add`.
 * Returns the tube's registry id, or -1 when the map has none (or none of its candidates matched).
 */
export function applyMapFlicker(reg: LightRegistry, mapId: string, seed: number): number {
  reg.flickerSeed = mapFlickerSeed(mapId, seed);
  const list = STUTTER_TUBES[mapId];
  if (!list) return -1;
  for (const t of list) {
    const id = findTube(reg, t);
    if (id >= 0) {
      reg.setFlicker(id, FLICKER_STUTTER);
      return id;
    }
  }
  return -1;
}
