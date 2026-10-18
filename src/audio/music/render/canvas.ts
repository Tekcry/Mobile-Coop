/**
 * The offline stem renderer's core (music direction v3): recorded samples placed on a circular stereo canvas one loop
 * long, so anything that runs past the loop end (a tail, a reversed swell, a granular cloud) wraps to the start and the
 * loop joins without a seam. Pure Float32 code, no Web Audio: it runs in node on the PC and in the unit tests.
 */
import { biquad, softClip } from '../dsp';
import type { Rng } from '../rng';

export const RATE = 48000;

export interface Stereo {
  l: Float32Array;
  r: Float32Array;
}

/** A source sample, resampled to `RATE`. `mono` is the channel sum (for panned hits). */
export interface Src {
  id: string;
  l: Float32Array;
  r: Float32Array;
  mono: Float32Array;
  /** Fundamental in Hz for pitched sources (set by the sample table), else 0. */
  rootHz: number;
}

export const stereo = (n: number): Stereo => ({ l: new Float32Array(n), r: new Float32Array(n) });
export const secs = (s: number): number => Math.max(1, Math.round(s * RATE));
export const dbToGain = (db: number): number => Math.pow(10, db / 20);

/** 4-point Hermite read at a fractional index (0 outside the buffer). */
export function hermite(d: Float32Array, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const xm1 = d[i - 1] ?? 0;
  const x0 = d[i] ?? 0;
  const x1 = d[i + 1] ?? 0;
  const x2 = d[i + 2] ?? 0;
  const c = (x1 - xm1) * 0.5;
  const v = x0 - x1;
  const w = c + v;
  const a = w + v + (x2 - x0) * 0.5;
  const b = w + a;
  return ((a * f - b) * f + c) * f + x0;
}

/** Resample a channel by a rate ratio (Hermite). */
export function resampleTo(d: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return d.slice();
  const k = from / to;
  const out = new Float32Array(Math.floor(d.length / k));
  for (let i = 0; i < out.length; i++) out[i] = hermite(d, i * k);
  return out;
}

/** A source from decoded channels: resampled to `RATE` and peak-normalised to -1 dBFS, so every gain in a sketch is relative to a full-level recording (the libraries record from ppp to fff). */
export function makeSrc(id: string, channels: Float32Array[], rate: number, rootHz = 0): Src {
  const l = resampleTo(channels[0]!, rate, RATE);
  const r = channels[1] ? resampleTo(channels[1], rate, RATE) : l.slice();
  let p = 0;
  for (let i = 0; i < l.length; i++) p = Math.max(p, Math.abs(l[i]!), Math.abs(r[i]!));
  const k = p > 0 ? 0.89 / p : 1;
  const mono = new Float32Array(l.length);
  for (let i = 0; i < l.length; i++) {
    l[i]! *= k;
    r[i]! *= k;
    mono[i] = (l[i]! + r[i]!) * 0.5;
  }
  return { id, l, r, mono, rootHz };
}

/** Add `src` into `dst` at sample `at`, wrapping around the end. */
export function mixWrap(dst: Float32Array, src: Float32Array, at: number, gain = 1): void {
  const n = dst.length;
  let j = ((Math.round(at) % n) + n) % n;
  for (let i = 0; i < src.length; i++) {
    dst[j]! += src[i]! * gain;
    if (++j === n) j = 0;
  }
}

export interface Hit {
  /** Seconds into the loop. */
  t: number;
  gain?: number;
  /** Varispeed in semitones (pitch and length change together, like a sampler). */
  semis?: number;
  /** -1..1. Set: the mono sum is panned (equal power). Unset: the source's own stereo. */
  pan?: number;
  /** Seconds into the source to start from. */
  start?: number;
  /** Output length in seconds (cut with a fade). */
  dur?: number;
  fadeIn?: number;
  fadeOut?: number;
  reverse?: boolean;
  lp?: number;
  hp?: number;
  /** Band-pass centre and Q. */
  bp?: [number, number];
  /** Soft-clip drive (1 = none). */
  drive?: number;
  /** Bits for a crude quantise (dusty sampler grain). */
  bits?: number;
}

/** Render one hit (varispeed, cut, reverse, filter, drive, fades) and add it to the canvas. */
export function place(c: Stereo, s: Src, h: Hit): void {
  const rate = Math.pow(2, (h.semis ?? 0) / 12);
  const start = Math.round((h.start ?? 0) * RATE);
  const avail = Math.floor((s.mono.length - start) / rate);
  if (avail <= 1) return;
  const n = h.dur !== undefined ? Math.min(avail, secs(h.dur)) : avail;
  const panned = h.pan !== undefined;
  const chans: Float32Array[] = panned ? [s.mono] : [s.l, s.r];
  const outs = chans.map((ch) => {
    const o = new Float32Array(n);
    for (let i = 0; i < n; i++) o[i] = hermite(ch, start + i * rate);
    if (h.reverse) o.reverse();
    if (h.hp) biquad(o, 'highpass', h.hp, 0.707, RATE);
    if (h.lp) biquad(o, 'lowpass', h.lp, 0.707, RATE);
    if (h.bp) biquad(o, 'bandpass', h.bp[0], h.bp[1], RATE);
    if (h.drive && h.drive > 1) softClip(o, h.drive);
    if (h.bits) {
      const q = Math.pow(2, h.bits - 1);
      for (let i = 0; i < n; i++) o[i] = Math.round(o[i]! * q) / q;
    }
    const fi = secs(h.fadeIn ?? 0.002);
    const fo = secs(h.fadeOut ?? (h.dur !== undefined ? 0.03 : 0.005));
    for (let i = 0; i < Math.min(fi, n); i++) o[i]! *= i / fi;
    for (let i = 0; i < Math.min(fo, n); i++) o[n - 1 - i]! *= i / fo;
    return o;
  });
  const g = h.gain ?? 1;
  const at = h.t * RATE;
  if (panned) {
    const p = Math.max(-1, Math.min(1, h.pan!));
    const a = ((p + 1) * Math.PI) / 4;
    mixWrap(c.l, outs[0]!, at, g * Math.cos(a));
    mixWrap(c.r, outs[0]!, at, g * Math.sin(a));
  } else {
    mixWrap(c.l, outs[0]!, at, g);
    mixWrap(c.r, outs[1]!, at, g);
  }
}

/** Semitones that take a source's root to a MIDI note. */
export function semisTo(s: Src, midi: number): number {
  if (!s.rootHz) throw new Error(`${s.id} has no root`);
  return midi - (69 + 12 * Math.log2(s.rootHz / 440));
}

export interface GrainOpts {
  /** Output start and length (s). The cloud wraps around the loop end. */
  t: number;
  dur: number;
  /** Source region (s) the read point travels, there and back (a ping-pong, so a whole-loop cloud joins cleanly). */
  from: number;
  to: number;
  /** Grain length (s) and grains per second. */
  grain: number;
  density: number;
  semis?: number;
  /** Random pitch spread in cents and read-position jitter in s. */
  cents?: number;
  jitter?: number;
  /** Stereo spread 0..1. */
  spread?: number;
  gain?: number;
  /** Chance a grain plays backwards. */
  reverse?: number;
  /** Fade the cloud in and out over these seconds (0 for a whole-loop bed). */
  edge?: number;
}

/**
 * Granular time-stretch: Hann-windowed grains read from a slowly moving point in the source, pitched by varispeed.
 * Turns a two-second bowed note or a motor into a minute of drone; with short grains and jitter, into a smear.
 */
export function granular(c: Stereo, s: Src, o: GrainOpts, rng: Rng): void {
  const count = Math.max(1, Math.round(o.dur * o.density));
  const glen = secs(o.grain);
  const win = new Float32Array(glen);
  for (let i = 0; i < glen; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (glen - 1));
  // overlapping Hann windows sum to density * grain / 2: normalise to unity
  const norm = (o.gain ?? 1) / Math.max(1, (o.density * o.grain) / 2);
  const g = new Float32Array(glen);
  for (let k = 0; k < count; k++) {
    const u = (k + rng.next()) / count;
    const tri = u < 0.5 ? u * 2 : 2 - u * 2;
    const pos = o.from + (o.to - o.from) * tri + (rng.next() * 2 - 1) * (o.jitter ?? 0);
    const rate = Math.pow(2, ((o.semis ?? 0) + ((rng.next() * 2 - 1) * (o.cents ?? 0)) / 100) / 12);
    const p0 = Math.max(0, pos) * RATE;
    if (p0 + glen * rate >= s.mono.length) continue;
    const back = rng.next() < (o.reverse ?? 0);
    for (let i = 0; i < glen; i++) g[i] = hermite(s.mono, p0 + (back ? glen - 1 - i : i) * rate) * win[i]!;
    let amp = norm;
    if (o.edge) {
      const tt = u * o.dur;
      amp *= Math.min(1, tt / o.edge, (o.dur - tt) / o.edge);
    }
    const pan = (rng.next() * 2 - 1) * (o.spread ?? 0.6);
    const a = ((pan + 1) * Math.PI) / 4;
    const at = (o.t + u * o.dur) * RATE - glen / 2;
    mixWrap(c.l, g, at, amp * Math.cos(a) * Math.SQRT2);
    mixWrap(c.r, g, at, amp * Math.sin(a) * Math.SQRT2);
  }
}

/** Run `fn` over the loop with `pre` seconds of its own tail in front, so filters and tails start warm, and keep the loop. */
export function circular(c: Stereo, pre: number, fn: (x: Stereo) => Stereo): Stereo {
  const n = c.l.length;
  const p = Math.min(n, secs(pre));
  const ext = stereo(n + p);
  ext.l.set(c.l.subarray(n - p), 0);
  ext.l.set(c.l, p);
  ext.r.set(c.r.subarray(n - p), 0);
  ext.r.set(c.r, p);
  const y = fn(ext);
  return { l: y.l.slice(p, p + n), r: y.r.slice(p, p + n) };
}

export function filterStereo(c: Stereo, kind: 'lowpass' | 'highpass' | 'bandpass' | 'peaking', f: number, q = 0.707, gainDb = 0): Stereo {
  biquad(c.l, kind, f, q, RATE, gainDb);
  biquad(c.r, kind, f, q, RATE, gainDb);
  return c;
}

export function addInto(dst: Stereo, src: Stereo, gain = 1): void {
  for (let i = 0; i < dst.l.length; i++) {
    dst.l[i]! += src.l[i]! * gain;
    dst.r[i]! += src.r[i]! * gain;
  }
}

export function scale(c: Stereo, g: number): void {
  for (let i = 0; i < c.l.length; i++) {
    c.l[i]! *= g;
    c.r[i]! *= g;
  }
}

export function peakOf(c: Stereo): number {
  let p = 0;
  for (let i = 0; i < c.l.length; i++) p = Math.max(p, Math.abs(c.l[i]!), Math.abs(c.r[i]!));
  return p;
}

/** Fundamental estimate (Hz) by normalised autocorrelation over a window after the attack. For checking sample roots. */
export function detectPitch(d: Float32Array, lo = 30, hi = 1200): number {
  const start = Math.min(d.length - 1, secs(0.15));
  const n = Math.min(secs(0.25), d.length - start - secs(1 / lo) - 1);
  if (n < 256) return 0;
  const minLag = Math.floor(RATE / hi);
  const maxLag = Math.ceil(RATE / lo);
  let best = 0;
  let bestLag = 0;
  const corr = new Float32Array(maxLag + 2);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    let e1 = 0;
    let e2 = 0;
    for (let i = 0; i < n; i += 2) {
      const a = d[start + i]!;
      const b = d[start + i + lag]!;
      s += a * b;
      e1 += a * a;
      e2 += b * b;
    }
    corr[lag] = s / Math.sqrt(e1 * e2 + 1e-12);
  }
  for (let lag = minLag; lag <= maxLag; lag++) if (corr[lag]! > best) best = corr[lag]!;
  // the first peak within 90 % of the best (avoids octave-down errors)
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (corr[lag]! >= best * 0.9 && corr[lag]! >= corr[lag - 1]! && corr[lag]! >= corr[lag + 1]!) {
      bestLag = lag;
      break;
    }
  }
  if (!bestLag) return 0;
  const a = corr[bestLag - 1]!;
  const b = corr[bestLag]!;
  const cc = corr[bestLag + 1]!;
  const shift = (a - cc) / (2 * (a - 2 * b + cc) || 1);
  return RATE / (bestLag + shift);
}
