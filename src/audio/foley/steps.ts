/**
 * Movement foley planner (pure, allocation-free per call, unit-tested). Turns a foot plant, a landing or a committed
 * move into a short list of sprite layers to play: which take of which bank, when, how loud, at what rate.
 *
 * A step is a heel strike then a toe roll-off from separately chosen takes; the gap between them shrinks with pace
 * (a crouched step rolls slowly, a sprint slaps). Each layer gets its own random rate and level, the two feet are
 * pitched a touch apart and no take repeats until its bank has cycled. The suit is silent (no gear layer) and damps
 * impacts (`SUIT`). Surfaces mix a boot layer with the surface's own character (deck plate ring, grate rattle,
 * gravel crunch, board thump).
 *
 * Purely cosmetic: guards hear the noise model in `GameState` (`noiseRadius` x `SURFACE_NOISE`), never this.
 */
import type { Surface } from '../../world/surfaces';
import type { Rng } from '../music/rng';
import type { FoleyBank, FoleyIndex } from './sprite';

export type Gait = 'crouch' | 'walk' | 'run' | 'sprint';
export type FoleyLanding = 'soft' | 'roll' | 'heavy';
export type FoleyMove = 'vault' | 'mantle' | 'hop' | 'drop' | 'roll';

/** Pace (m/s) from which a standing step is a run (between the walk 1.4 and the jog 2.8). */
export const RUN_FROM = 2.1;

export function gaitOf(speed: number, crouched: boolean, sprinting: boolean): Gait {
  if (sprinting) return 'sprint';
  if (crouched) return 'crouch';
  return speed >= RUN_FROM ? 'run' : 'walk';
}

export interface GaitMix {
  /** Overall step level. */
  gain: number;
  /** Heel and toe levels (x gain). */
  heel: number;
  toe: number;
  /** Heel-to-toe gap range (s). */
  gap: readonly [number, number];
  /** Low-pass on the step layers (Hz, 0 = none): a soft-soled crouch loses the click. */
  lowpass: number;
  /** Speed (m/s) at which the step reaches full level within the gait. */
  top: number;
}

/** Live-tunable by ear (Michael). */
export const GAITS: Record<Gait, GaitMix> = {
  crouch: { gain: 0.34, heel: 0.65, toe: 0.7, gap: [0.09, 0.13], lowpass: 1800, top: 2.6 },
  walk: { gain: 0.55, heel: 1, toe: 0.5, gap: [0.055, 0.08], lowpass: 5500, top: 2.1 },
  run: { gain: 0.8, heel: 1, toe: 0.4, gap: [0.03, 0.05], lowpass: 0, top: 3.4 },
  sprint: { gain: 1, heel: 1, toe: 0.32, gap: [0.016, 0.03], lowpass: 0, top: 5 },
};

/**
 * The suit (Michael, 2026-10-16): built not to make noise and to soak up impacts. Nothing on it rustles or jingles, so
 * steps carry no gear layer; landings and moves are damped: duller (low-passed), quieter, short. A faint low-passed
 * fabric brush is left only where the body slides over something (a roll, a vault, a mantle).
 */
export const SUIT = { impactLowpass: 1600, impactGain: 0.6, impactTail: 0.25, brushGain: 0.12, brushLowpass: 1400 };

export interface SurfaceExtra {
  bank: FoleyBank;
  gain: number;
  /** Longest it plays (s). */
  dur: number;
}

export interface SurfaceMix {
  heel: FoleyBank;
  toe: FoleyBank;
  /** Overall level of this surface's steps. */
  gain: number;
  /** How long the toe layer plays (s). */
  toeDur: number;
  extras: readonly SurfaceExtra[];
}

export const SURFACES: Record<Surface, SurfaceMix> = {
  concrete: { heel: 'concrete', toe: 'concrete', gain: 1, toeDur: 0.07, extras: [] },
  carpet: { heel: 'carpet', toe: 'carpet', gain: 0.7, toeDur: 0.08, extras: [] },
  wood: { heel: 'bootHeel', toe: 'bootToe', gain: 0.9, toeDur: 0.12, extras: [{ bank: 'board', gain: 0.45, dur: 0.12 }] },
  gravel: { heel: 'gravel', toe: 'gravel', gain: 0.85, toeDur: 0.12, extras: [{ bank: 'concrete', gain: 0.3, dur: 0.1 }] },
  metal: { heel: 'concrete', toe: 'concrete', gain: 1, toeDur: 0.06, extras: [{ bank: 'plate', gain: 0.3, dur: 0.3 }, { bank: 'ring', gain: 0.1, dur: 0.15 }] },
  grate: { heel: 'concrete', toe: 'concrete', gain: 1, toeDur: 0.06, extras: [{ bank: 'tin', gain: 0.35, dur: 0.18 }] },
};

/** Master levels by kind (into the sfx bus). */
export const FOLEY_MIX = { step: 0.24, landing: 0.32, move: 0.3 };

/** Random variation per layer. */
export const VARY = { rate: 0.04, gain: 0.15, footRate: 0.012, footPan: 0.05 };

export interface Layer {
  bank: FoleyBank;
  take: number;
  /** Delay from now (s). */
  at: number;
  gain: number;
  /** Playback rate (pitch and speed). */
  rate: number;
  /** Offset into the take (s, sprite time). */
  offset: number;
  /** How long it plays (s, real time). */
  dur: number;
  /** Fade in (s): 0 for a take played from its onset, a few ms for a slice from inside a take. */
  fadeIn: number;
  lowpass: number;
  pan: number;
}

export const MAX_LAYERS = 14;

export interface FoleyPlan {
  layers: Layer[];
  n: number;
}

export function newPlan(): FoleyPlan {
  const layers: Layer[] = [];
  for (let i = 0; i < MAX_LAYERS; i++) layers.push({ bank: 'concrete', take: 0, at: 0, gain: 0, rate: 1, offset: 0, dur: 0, fadeIn: 0, lowpass: 0, pan: 0 });
  return { layers, n: 0 };
}

/**
 * Picks takes from a bank without repeats: a take is not picked again until `memory` other picks have passed
 * (memory = half the bank, at least 1 when the bank has two or more takes).
 */
export class TakePicker {
  private recent: number[] = [];
  private readonly memory: number;

  constructor(
    readonly count: number,
    private rng: Rng,
  ) {
    this.memory = count <= 1 ? 0 : Math.max(1, Math.floor(count / 2));
  }

  next(): number {
    if (this.count <= 1) return 0;
    // the free takes are those not in `recent`; pick the k-th free one
    let k = this.rng.int(this.count - this.recent.length);
    let pick = 0;
    for (let i = 0; i < this.count; i++) {
      if (this.recent.indexOf(i) >= 0) continue;
      if (k-- === 0) {
        pick = i;
        break;
      }
    }
    this.recent.push(pick);
    if (this.recent.length > this.memory) this.recent.shift();
    return pick;
  }
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

export class FoleyPlanner {
  private pickers = new Map<FoleyBank, TakePicker>();

  constructor(
    private index: FoleyIndex,
    private rng: Rng,
  ) {}

  private pick(bank: FoleyBank): number {
    let p = this.pickers.get(bank);
    if (!p) {
      p = new TakePicker(this.index.banks[bank]?.length ?? 0, this.rng);
      this.pickers.set(bank, p);
    }
    return p.next();
  }

  private takeDur(bank: FoleyBank, take: number): number {
    return this.index.banks[bank]?.[take]?.[1] ?? 0;
  }

  /** Append a layer (dropped past MAX_LAYERS or when the bank is empty). `slice` > 0 plays that long from a random point inside the take. */
  private add(plan: FoleyPlan, bank: FoleyBank, at: number, gain: number, maxDur: number, rate = 1, lowpass = 0, pan = 0, slice = 0): void {
    if (plan.n >= MAX_LAYERS || !this.index.banks[bank]?.length || gain <= 0) return;
    const take = this.pick(bank);
    const r = rate * this.rng.jitter(VARY.rate);
    const len = this.takeDur(bank, take);
    const L = plan.layers[plan.n++]!;
    L.bank = bank;
    L.take = take;
    L.at = Math.max(0, at);
    L.gain = gain * this.rng.jitter(VARY.gain);
    L.rate = r;
    L.lowpass = lowpass;
    L.pan = pan;
    if (slice > 0 && len > slice) {
      L.offset = this.rng.range(0, len - slice);
      L.dur = slice / r;
      L.fadeIn = 0.012;
    } else {
      L.offset = 0;
      L.dur = Math.min(maxDur, len) / r;
      L.fadeIn = 0;
    }
  }

  /** One foot plant. `side` -1 left, 1 right; `scale` multiplies the level (cover glides and the like are softer). */
  step(plan: FoleyPlan, surface: Surface, gait: Gait, speed: number, side: number, scale = 1, at = 0): FoleyPlan {
    plan.n = 0;
    this.addStep(plan, surface, gait, speed, side, scale * FOLEY_MIX.step, at);
    return plan;
  }

  private addStep(plan: FoleyPlan, surface: Surface, gait: Gait, speed: number, side: number, level: number, at: number, damp = 0): void {
    const G = GAITS[gait];
    const lp = damp > 0 ? (G.lowpass > 0 ? Math.min(G.lowpass, damp) : damp) : G.lowpass;
    const S = SURFACES[surface];
    const g = level * G.gain * S.gain * (0.85 + 0.25 * clamp01(speed / G.top));
    const foot = 1 + side * VARY.footRate;
    const pan = side * VARY.footPan;
    this.add(plan, S.heel, at, g * G.heel, 0.3, foot, lp, pan);
    const gap = this.rng.range(G.gap[0], G.gap[1]);
    this.add(plan, S.toe, at + gap, g * G.toe, S.toeDur, foot * 1.05, lp, pan);
    for (let i = 0; i < S.extras.length; i++) {
      const e = S.extras[i]!;
      // a damped impact keeps little of a surface's ring
      this.add(plan, e.bank, at, g * e.gain * (damp > 0 ? 0.5 : 1), damp > 0 ? Math.min(e.dur, 0.12) : e.dur, foot, lp, pan);
    }
  }

  /** A damped body impact (the suit soaks it up): low-passed, quieter, the tail cut short. */
  private impact(plan: FoleyPlan, bank: FoleyBank, at: number, gain: number, rate = 1): void {
    this.add(plan, bank, at, gain * SUIT.impactGain, SUIT.impactTail, rate, SUIT.impactLowpass);
  }

  /** The faint fabric brush of the body sliding over something (`len` s). */
  private brush(plan: FoleyPlan, at: number, len: number): void {
    this.add(plan, 'cloth', at, FOLEY_MIX.move * SUIT.brushGain, 1, 1, SUIT.brushLowpass, 0, len);
  }

  /** A landing from a fall: both feet and a body thump, all damped by the suit (a heavy one is still the loudest). */
  landing(plan: FoleyPlan, surface: Surface, kind: FoleyLanding): FoleyPlan {
    plan.n = 0;
    const m = FOLEY_MIX.landing;
    const heavy = kind === 'heavy';
    const feet = (heavy ? 1.3 : 1.1) * SUIT.impactGain;
    const lp = SUIT.impactLowpass * 1.5;
    this.addStep(plan, surface, 'run', 3.4, -1, m * feet, 0, lp);
    this.addStep(plan, surface, 'run', 3.4, 1, m * feet * 0.8, this.rng.range(heavy ? 0.015 : 0.03, heavy ? 0.03 : 0.06), lp);
    this.impact(plan, heavy ? 'thumpHeavy' : 'thump', 0, m * (heavy ? 0.7 : kind === 'roll' ? 0.45 : 0.35));
    return plan;
  }

  /** A committed move lasting `dur` s: gloved hands on the ledge, a faint brush where the body slides, feet back down. */
  move(plan: FoleyPlan, surface: Surface, kind: FoleyMove, dur: number): FoleyPlan {
    plan.n = 0;
    const m = FOLEY_MIX.move;
    switch (kind) {
      case 'vault':
        this.impact(plan, 'hand', 0.05, m * 0.35);
        this.brush(plan, 0.1, 0.3);
        this.addStep(plan, surface, 'run', 3, 1, m * 0.8 * SUIT.impactGain, dur * 0.92, SUIT.impactLowpass * 1.5);
        break;
      case 'mantle':
        this.impact(plan, 'hand', 0, m * 0.35);
        this.impact(plan, 'hand', 0.09, m * 0.3);
        this.brush(plan, 0.15, 0.45);
        this.impact(plan, SURFACES[surface].toe, dur * 0.45, m * 0.4, 0.95);
        this.addStep(plan, surface, 'walk', 1.4, 1, m * 0.6 * SUIT.impactGain, dur * 0.9, SUIT.impactLowpass * 1.5);
        break;
      case 'hop':
        this.addStep(plan, surface, 'run', 3, -1, m * 0.8 * SUIT.impactGain, dur * 0.9, SUIT.impactLowpass * 1.5);
        break;
      case 'drop':
        // silent going over the edge: the landing sounds through `landing`
        break;
      case 'roll':
        this.brush(plan, 0.02, 0.45);
        this.impact(plan, 'thump', 0.12, m * 0.35);
        this.impact(plan, 'thump', 0.3, m * 0.25, 0.9);
        this.addStep(plan, surface, 'run', 3, -1, m * 0.7 * SUIT.impactGain, dur * 0.85, SUIT.impactLowpass * 1.5);
        break;
    }
    return plan;
  }
}
