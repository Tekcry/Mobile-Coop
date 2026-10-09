/**
 * Composition helpers for the v3 sketches: a swung grid, drum patterns written as strings, a "recorded" break built
 * from single CC0 hits and then chopped and re-sequenced, and a mix helper. Pure; used by `sketches.ts`.
 */
import type { Rng } from '../rng';
import { addInto, place, secs, stereo, type Hit, type Src, type Stereo } from './canvas';
import { reverbWet } from './fx';
import { biquad, softClip } from '../dsp';

/** A tempo grid. `swing` delays every second sixteenth by that fraction of a sixteenth. */
export class Grid {
  constructor(
    readonly bpm: number,
    readonly bars: number,
    readonly swing = 0,
  ) {}

  get beat(): number {
    return 60 / this.bpm;
  }

  get bar(): number {
    return this.beat * 4;
  }

  get loop(): number {
    return this.bar * this.bars;
  }

  /** Seconds of sixteenth `i` (may exceed 15) in bar `bar`. */
  at(bar: number, i = 0): number {
    const s = this.beat / 4;
    return bar * this.bar + i * s + (i % 2 === 1 ? this.swing * s : 0);
  }

  /** Seconds of a beat position (beats may be fractional, unswung). */
  b(bar: number, beat: number): number {
    return bar * this.bar + beat * this.beat;
  }
}

/**
 * Play a pattern string: one char per sixteenth. 'X' accent, 'x' hit, 'g' ghost, '.' rest. `hit` builds each hit;
 * the timing is humanised by up to `loose` seconds either way (off-grid on purpose).
 */
export function pattern(c: Stereo, g: Grid, bar: number, pat: string, src: Src | ((rng: Rng, i: number) => Src), base: Omit<Hit, 't'>, rng: Rng, loose = 0.006, jit = 0.12): void {
  for (let i = 0; i < pat.length; i++) {
    const ch = pat[i];
    if (ch === '.' || ch === undefined) continue;
    const vel = ch === 'X' ? 1 : ch === 'x' ? 0.7 : 0.28;
    const s = typeof src === 'function' ? src(rng, i) : src;
    place(c, s, { ...base, t: g.at(bar, i) + (rng.next() * 2 - 1) * loose, gain: (base.gain ?? 1) * vel * rng.jitter(jit) });
  }
}

/** A stereo buffer as a source (so a rendered break can be chopped with `place`). */
export function asSrc(id: string, s: Stereo): Src {
  const mono = new Float32Array(s.l.length);
  for (let i = 0; i < mono.length; i++) mono[i] = (s.l[i]! + s.r[i]!) * 0.5;
  return { id, l: s.l, r: s.r, mono, rootHz: 0 };
}

export interface BreakParts {
  kick: string[];
  snare: string[];
  ghost: string[];
  hat: string[];
}

/**
 * Perform a two-bar break on a kit of single hits, glue it in a small room and drive it a little: the "record" the
 * chops are cut from. Returns exactly two bars (tails wrap).
 */
export function performBreak(g: Grid, kit: { kick: Src[]; snare: Src[]; ghost: Src[]; hat: Src[]; openHat?: Src }, p: BreakParts, rng: Rng, drive = 2.2): Src {
  const two = new Grid(g.bpm, 2, g.swing);
  const c = stereo(secs(two.loop));
  for (let bar = 0; bar < 2; bar++) {
    pattern(c, two, bar, p.kick[bar]!, (_r, i) => kit.kick[i === 0 ? 0 : 1 % kit.kick.length]!, { pan: 0, gain: 1, lp: 7000 }, rng, 0.002, 0.03);
    pattern(c, two, bar, p.snare[bar]!, (_r, i) => kit.snare[i < 14 ? 0 : 1 % kit.snare.length]!, { pan: 0.05, gain: 0.8 }, rng, 0.003, 0.03);
    pattern(c, two, bar, p.ghost[bar]!, (_r, i) => kit.ghost[i % kit.ghost.length]!, { pan: 0.1, gain: 0.45 }, rng, 0.004, 0.05);
    pattern(c, two, bar, p.hat[bar]!, (_r, i) => kit.hat[(i % 4 === 0 ? 0 : i % 2 === 0 ? 1 : 2) % kit.hat.length]!, { pan: -0.25, gain: 0.32, hp: 400, dur: 0.12 }, rng, 0.003, 0.05);
  }
  if (kit.openHat) place(c, kit.openHat, { t: two.at(1, 14), pan: -0.3, gain: 0.22, hp: 500, dur: 0.4 });
  const room = reverbWet(c, { rt60: 0.7, damp: 6000, size: 0.6, predelay: 0.004 });
  addInto(c, room, 0.22);
  softClip(c.l, drive);
  softClip(c.r, drive);
  return asSrc('break', c);
}

export interface Chop {
  /** Source slice (sixteenth index 0..31 of the two-bar break), or -1 for a rest. */
  s: number;
  rev?: boolean;
  semis?: number;
  gain?: number;
  /** Length in sixteenths (default 1). */
  len?: number;
}

/** Half the crossfade between chopped slices (s). */
const XF = 0.0015;

/** Re-sequence a performed break, a sixteenth at a time, into bar `bar` of the canvas. */
export function chopBar(c: Stereo, g: Grid, bar: number, brk: Src, seq: readonly (Chop | number)[], base: Omit<Hit, 't'> = {}): void {
  const two = new Grid(g.bpm, 2, g.swing);
  for (let i = 0; i < seq.length; i++) {
    const raw = seq[i]!;
    const ch: Chop = typeof raw === 'number' ? { s: raw } : raw;
    if (ch.s < 0) continue;
    const from = two.at(Math.floor(ch.s / 16), ch.s % 16);
    const to = two.at(Math.floor((ch.s + (ch.len ?? 1)) / 16), (ch.s + (ch.len ?? 1)) % 16);
    // each slice starts XF early and ends XF late with linear fades: in-order slices crossfade back into the original
    const rate = Math.pow(2, (ch.semis ?? 0) / 12);
    const dur = (to > from ? to - from : two.loop - from) + 2 * XF;
    place(c, brk, { ...base, t: g.at(bar, i) - XF / rate, start: Math.max(0, from - XF), dur: dur / rate, semis: ch.semis ?? 0, reverse: ch.rev ?? false, gain: (base.gain ?? 1) * (ch.gain ?? 1), fadeIn: (2 * XF) / rate, fadeOut: (2 * XF) / rate });
  }
}

/** The straight order of a bar of the break: slices 0..15 (bar 0) or 16..31 (bar 1). */
export const straight = (bar: 0 | 1): number[] => Array.from({ length: 16 }, (_, i) => i + bar * 16);

/** Sum stems with a gain each (for level checks). */
export function sum(...parts: [Stereo, number][]): Stereo {
  const n = parts[0]![0].l.length;
  const out = stereo(n);
  for (const [s, g] of parts) addInto(out, s, g);
  return out;
}

export function rms(s: Stereo): number {
  let a = 0;
  for (let i = 0; i < s.l.length; i++) a += s.l[i]! * s.l[i]! + s.r[i]! * s.r[i]!;
  return Math.sqrt(a / (2 * s.l.length));
}

export const db = (x: number): number => 20 * Math.log10(Math.max(1e-9, x));

/**
 * Loudness in dB, K-weighted and gated (in the spirit of BS.1770 / LUFS): a high-pass at 38 Hz and a presence lift,
 * mean power over 400 ms blocks, keeping only the blocks within 15 dB of the loud ones. So a layer that plays now and
 * then is measured while it plays, and sub energy counts the way ears count it.
 */
export function loudness(x: Stereo): number {
  const n = x.l.length;
  const m = new Float32Array(n);
  for (let i = 0; i < n; i++) m[i] = (x.l[i]! + x.r[i]!) * 0.5;
  biquad(m, 'highpass', 38, 0.5, 48000);
  biquad(m, 'peaking', 3000, 0.6, 48000, 4);
  const block = 19200;
  const pw: number[] = [];
  for (let b = 0; b + block <= n; b += block / 2) {
    let a = 0;
    for (let i = b; i < b + block; i++) a += m[i]! * m[i]!;
    pw.push(a / block);
  }
  if (!pw.length) return -180;
  const sorted = [...pw].sort((a, b) => a - b);
  const loud = sorted[Math.floor(sorted.length * 0.95)]!;
  const kept = pw.filter((p) => p >= loud / 31.6 && p > 1e-12);
  const mean = kept.reduce((a, b) => a + b, 0) / Math.max(1, kept.length);
  return 10 * Math.log10(Math.max(1e-18, mean));
}

/** The reference a layer at 0 dB is set to (gated K-weighted dB). */
export const LAYER_REF = -20;

/** Add `x` to `dst` at a loudness `rel` dB relative to LAYER_REF. Returns the gain used. */
export function lay(dst: Stereo, x: Stereo, rel: number): number {
  const g = Math.pow(10, (LAYER_REF + rel - loudness(x)) / 20);
  addInto(dst, x, g);
  return g;
}
