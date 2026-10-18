/**
 * Offline effects for the stem renderer (music direction v3): long dark reverb, dub delay, tape (saturation, wow,
 * hiss-free dulling), glitch edits on a rendered bar (stutter, reverse, tape-stop) and dust built from recorded grains.
 * Everything that has memory runs through `circular`, so a stem's tails wrap into its own start and the loop is seamless.
 */
import { biquad, softClip } from '../dsp';
import type { Rng } from '../rng';
import { circular, hermite, mixWrap, RATE, secs, stereo, type Src, type Stereo } from './canvas';

export interface ReverbOpts {
  /** Decay to -60 dB (s). */
  rt60: number;
  /** Damping: the loop's low-pass (Hz); lower is darker. */
  damp: number;
  /** Room size: scales the delay lines (1 = small room, 3 = hall). */
  size?: number;
  predelay?: number;
  /** High-pass on the send (Hz), keeps the low end dry and mono. */
  hp?: number;
}

const LINES = [0.0297, 0.0371, 0.0411, 0.0437, 0.0533, 0.0599, 0.0677, 0.0731];
const DIFFUSE = [0.0047, 0.0071, 0.0113, 0.0157];

/** Feedback-delay-network reverb, wet only. Eight lines, Householder mixing, one-pole damping in each line. */
export function reverbWet(input: Stereo, o: ReverbOpts): Stereo {
  return circular(input, Math.min(o.rt60 * 1.2, input.l.length / RATE), (x) => fdn(x, o));
}

function fdn(x: Stereo, o: ReverbOpts): Stereo {
  const n = x.l.length;
  const size = o.size ?? 1.5;
  const lens = LINES.map((s) => Math.round(s * size * RATE));
  const bufs = lens.map((l) => new Float32Array(l));
  const idx = new Int32Array(8);
  const lp = new Float32Array(8);
  const g = lens.map((l) => Math.pow(10, (-3 * l) / (o.rt60 * RATE)));
  const k = Math.exp((-2 * Math.PI * o.damp) / RATE);
  // input diffusion: four series allpasses per side
  const ap = DIFFUSE.map((s) => ({ l: new Float32Array(Math.round(s * size * RATE)), r: new Float32Array(Math.round(s * size * RATE * 1.13)), i: 0, j: 0 }));
  const pre = secs(o.predelay ?? 0.02);
  const inL = new Float32Array(n);
  const inR = new Float32Array(n);
  inL.set(x.l.subarray(0, n - pre), pre);
  inR.set(x.r.subarray(0, n - pre), pre);
  if (o.hp) {
    biquad(inL, 'highpass', o.hp, 0.707, RATE);
    biquad(inR, 'highpass', o.hp, 0.707, RATE);
  }
  const out = stereo(n);
  const sig = [1, -1, 1, -1, 1, -1, 1, -1];
  const v = new Float32Array(8);
  for (let t = 0; t < n; t++) {
    let a = inL[t]!;
    let b = inR[t]!;
    for (const d of ap) {
      const dl = d.l[d.i]!;
      const yl = dl - 0.6 * a;
      d.l[d.i] = a + 0.6 * yl;
      a = yl;
      if (++d.i >= d.l.length) d.i = 0;
      const dr = d.r[d.j]!;
      const yr = dr - 0.6 * b;
      d.r[d.j] = b + 0.6 * yr;
      b = yr;
      if (++d.j >= d.r.length) d.j = 0;
    }
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      const y = bufs[i]![idx[i]!]!;
      lp[i] = y + (lp[i]! - y) * k;
      v[i] = lp[i]! * g[i]!;
      sum += v[i]!;
    }
    sum *= 2 / 8;
    let ol = 0;
    let or = 0;
    for (let i = 0; i < 8; i++) {
      const fb = v[i]! - sum;
      const inp = i < 4 ? a : b;
      bufs[i]![idx[i]!] = fb + inp * sig[i]! * 0.5;
      if (++idx[i]! >= lens[i]!) idx[i] = 0;
      if (i & 1) or += v[i]! * sig[i]!;
      else ol += v[i]! * sig[(i + 3) & 7]!;
    }
    out.l[t] = ol * 0.5;
    out.r[t] = or * 0.5;
  }
  return out;
}

export interface DelayOpts {
  /** Delay time (s); ping-pong alternates sides. */
  time: number;
  feedback: number;
  /** Filters inside the loop: each repeat gets darker and thinner. */
  lp?: number;
  hp?: number;
  /** Saturation in the loop (1 = none). */
  drive?: number;
  pingpong?: boolean;
}

/** Dub-style feedback delay, wet only. */
export function delayWet(input: Stereo, o: DelayOpts): Stereo {
  const tail = Math.min(input.l.length / RATE, (o.time * Math.log(0.001)) / Math.log(Math.max(0.01, o.feedback)));
  return circular(input, tail, (x) => {
    const n = x.l.length;
    const d = secs(o.time);
    const out = stereo(n);
    const kl = o.lp ? Math.exp((-2 * Math.PI * o.lp) / RATE) : 0;
    const kh = o.hp ? Math.exp((-2 * Math.PI * o.hp) / RATE) : 1;
    let zl = 0;
    let zr = 0;
    let hl = 0;
    let hr = 0;
    for (let t = d; t < n; t++) {
      // the repeat is the input plus the feedback of the last repeat, filtered and (optionally) driven
      // ping-pong: the input enters on the left and each repeat crosses to the other side
      const el = o.pingpong ? (x.l[t - d]! + x.r[t - d]!) * 0.5 + out.r[t - d]! * o.feedback : x.l[t - d]! + out.l[t - d]! * o.feedback;
      const er = o.pingpong ? out.l[t - d]! * o.feedback : x.r[t - d]! + out.r[t - d]! * o.feedback;
      zl = el + (zl - el) * kl;
      zr = er + (zr - er) * kl;
      hl = zl + (hl - zl) * kh;
      hr = zr + (hr - zr) * kh;
      let yl = o.hp ? zl - hl : zl;
      let yr = o.hp ? zr - hr : zr;
      if (o.drive && o.drive > 1) {
        yl = Math.tanh(yl * o.drive) / o.drive;
        yr = Math.tanh(yr * o.drive) / o.drive;
      }
      out.l[t] = yl;
      out.r[t] = yr;
    }
    return out;
  });
}

export interface TapeOpts {
  drive?: number;
  /** Wow: depth (s of delay swing) and whole cycles per loop (so the loop stays seamless). */
  wow?: number;
  wowCycles?: number;
  /** Flutter depth (s), cycles per loop. */
  flutter?: number;
  flutterCycles?: number;
  /** Top end roll-off (Hz). */
  lp?: number;
}

/** Tape: a gently wandering pitch (wow, flutter), saturation and a soft top. Periodic in the loop length. */
export function tape(c: Stereo, o: TapeOpts): Stereo {
  const n = c.l.length;
  const out = stereo(n);
  const wow = (o.wow ?? 0) * RATE;
  const fl = (o.flutter ?? 0) * RATE;
  const wc = o.wowCycles ?? 3;
  const fc = o.flutterCycles ?? 360;
  const base = wow + fl + 4;
  // read from a copy padded by its own wrap, so the modulated read point can look back past the start
  const pad = Math.ceil(base * 2) + 4;
  const ext = (ch: Float32Array): Float32Array => {
    const e = new Float32Array(n + pad);
    e.set(ch.subarray(n - pad), 0);
    e.set(ch, pad);
    return e;
  };
  const el = ext(c.l);
  const er = ext(c.r);
  for (let t = 0; t < n; t++) {
    const ph = t / n;
    const d = base + wow * Math.sin(2 * Math.PI * wc * ph) + fl * Math.sin(2 * Math.PI * fc * ph + 1.3);
    out.l[t] = hermite(el, t + pad - d);
    out.r[t] = hermite(er, t + pad - d + 0.37);
  }
  const done = o.lp ? circular(out, 0.1, (x) => (biquad(x.l, 'lowpass', o.lp!, 0.6, RATE), biquad(x.r, 'lowpass', o.lp!, 0.6, RATE), x)) : out;
  if (o.drive && o.drive > 1) {
    softClip(done.l, o.drive);
    softClip(done.r, o.drive);
  }
  return done;
}

// ------------------------------------------------------------------ glitch edits (on a rendered stem, before the reverb)

/** Repeat the slice at `t` (length `slice` s) `repeats` times, each `decay` quieter: the classic chopped stutter. */
export function stutter(c: Stereo, t: number, slice: number, repeats: number, decay = 0.85, semisStep = 0): void {
  const n = c.l.length;
  const s0 = ((secs(t) % n) + n) % n;
  const len = secs(slice);
  const take = (ch: Float32Array): Float32Array => {
    const o = new Float32Array(len);
    for (let i = 0; i < len; i++) o[i] = ch[(s0 + i) % n]!;
    const f = Math.min(64, len >> 3);
    for (let i = 0; i < f; i++) {
      o[i]! *= i / f;
      o[len - 1 - i]! *= i / f;
    }
    return o;
  };
  const sl = take(c.l);
  const sr = take(c.r);
  for (let k = 1; k <= repeats; k++) {
    const at = s0 + k * len;
    const g = Math.pow(decay, k);
    // overwrite: the stutter replaces what was there
    for (let i = 0; i < len; i++) {
      const j = (at + i) % n;
      const r = Math.pow(2, (semisStep * k) / 12);
      c.l[j] = hermite(sl, i * r) * g;
      c.r[j] = hermite(sr, i * r) * g;
    }
  }
}

/** Reverse the region [t, t + dur) in place. */
export function reverseRegion(c: Stereo, t: number, dur: number): void {
  const n = c.l.length;
  const s0 = ((secs(t) % n) + n) % n;
  const len = secs(dur);
  for (const ch of [c.l, c.r]) {
    const tmp = new Float32Array(len);
    for (let i = 0; i < len; i++) tmp[i] = ch[(s0 + len - 1 - i) % n]!;
    const f = Math.min(96, len >> 3);
    for (let i = 0; i < f; i++) {
      tmp[i]! *= i / f;
      tmp[len - 1 - i]! *= i / f;
    }
    for (let i = 0; i < len; i++) ch[(s0 + i) % n] = tmp[i]!;
  }
}

/** Tape-stop over [t, t + dur): the read speed falls to zero; silence after it until the region ends. */
export function tapeStop(c: Stereo, t: number, dur: number): void {
  const n = c.l.length;
  const s0 = ((secs(t) % n) + n) % n;
  const len = secs(dur);
  for (const ch of [c.l, c.r]) {
    const src = new Float32Array(len);
    for (let i = 0; i < len; i++) src[i] = ch[(s0 + i) % n]!;
    let p = 0;
    for (let i = 0; i < len; i++) {
      const sp = Math.max(0, 1 - i / len);
      ch[(s0 + i) % n] = hermite(src, p) * Math.min(1, sp * 4);
      p += sp * sp;
    }
  }
}

/** Gate a region to silence (a drop-out). Short fades at both ends. */
export function dropOut(c: Stereo, t: number, dur: number): void {
  const n = c.l.length;
  const s0 = ((secs(t) % n) + n) % n;
  const len = secs(dur);
  const f = 120;
  for (const ch of [c.l, c.r]) {
    for (let i = 0; i < len; i++) {
      const g = i < f ? 1 - i / f : i > len - f ? (i - (len - f)) / f : 0;
      ch[(s0 + i) % n]! *= g;
    }
  }
}

// ------------------------------------------------------------------ dust

export interface DustOpts {
  /** Crackles per second. */
  rate: number;
  gain: number;
  /** Chance a crackle is a low, fat pop instead of a tick. */
  pops?: number;
}

/**
 * Record-surface crackle from recorded material: micro-grains (1-4 ms) cut from the transients of a source (an ocean
 * drum's beads, a shaker), high-passed into ticks, at random times and levels. No oscillators, no generated noise.
 */
export function dust(c: Stereo, s: Src, o: DustOpts, rng: Rng): void {
  const n = c.l.length;
  const count = Math.round((n / RATE) * o.rate);
  // candidate grain starts: the loudest moments of the source
  const peaks: number[] = [];
  const hop = 64;
  for (let i = hop; i < s.mono.length - 512; i += hop) if (Math.abs(s.mono[i]!) > 0.25 * maxAbs(s.mono)) peaks.push(i);
  if (!peaks.length) return;
  for (let k = 0; k < count; k++) {
    const pop = rng.next() < (o.pops ?? 0.1);
    const len = Math.round((pop ? rng.range(0.004, 0.012) : rng.range(0.0008, 0.003)) * RATE);
    const g = new Float32Array(len);
    const p0 = rng.pick(peaks);
    for (let i = 0; i < len; i++) g[i] = s.mono[p0 + i]! * Math.sin((Math.PI * i) / len);
    biquad(g, pop ? 'lowpass' : 'highpass', pop ? 900 : 2500, 0.7, RATE);
    const amp = o.gain * Math.pow(rng.next(), 2.5) * (pop ? 1.6 : 1) * (rng.next() < 0.5 ? -1 : 1);
    const at = rng.next() * n;
    const pan = rng.range(-0.7, 0.7);
    mixWrap(c.l, g, at, amp * (1 - pan) * 0.7);
    mixWrap(c.r, g, at, amp * (1 + pan) * 0.7);
  }
}

function maxAbs(d: Float32Array): number {
  let m = 0;
  for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]!));
  return m || 1;
}

/** Narrow the stereo image of the lows (below ~150 Hz): sum to mono there, keep the sides above. */
export function monoLows(c: Stereo, f = 150): Stereo {
  return circular(c, 0.2, (x) => {
    const n = x.l.length;
    const lowL = x.l.slice();
    const lowR = x.r.slice();
    biquad(lowL, 'lowpass', f, 0.707, RATE);
    biquad(lowR, 'lowpass', f, 0.707, RATE);
    for (let i = 0; i < n; i++) {
      const m = (lowL[i]! + lowR[i]!) * 0.5;
      x.l[i] = x.l[i]! - lowL[i]! + m;
      x.r[i] = x.r[i]! - lowR[i]! + m;
    }
    return x;
  });
}
