/**
 * Pure Float32 DSP for rendering the found-sound library. No Web Audio: it runs in node (tests) and in the page, and
 * the same seed always gives the same samples. Everything works on mono `Float32Array`s unless a name says stereo.
 */
import type { Rng } from './rng';

const TAU = Math.PI * 2;

export const len = (sec: number, rate: number): number => Math.max(1, Math.round(sec * rate));

/** Add a decaying sinusoid (a resonant mode) by a rotating phasor: a few multiplies per sample, no `sin` per sample. */
export function addMode(out: Float32Array, rate: number, freq: number, amp: number, decay: number, start = 0, phase = 0): void {
  if (freq <= 0 || freq >= rate * 0.45 || amp === 0) return;
  const r = Math.exp(-1 / (rate * decay));
  const w = (TAU * freq) / rate;
  const cr = r * Math.cos(w);
  const ci = r * Math.sin(w);
  let re = Math.cos(phase);
  let im = Math.sin(phase);
  // stop when the mode is 80 dB down
  const n = Math.min(out.length, start + Math.ceil(decay * rate * 9.2));
  for (let i = start; i < n; i++) {
    out[i]! += amp * im;
    const nr = re * cr - im * ci;
    im = re * ci + im * cr;
    re = nr;
  }
}

export function whiteNoise(out: Float32Array, rng: Rng): void {
  for (let i = 0; i < out.length; i++) out[i] = rng.next() * 2 - 1;
}

export type FilterKind = 'lowpass' | 'highpass' | 'bandpass' | 'peaking';

/** RBJ biquad, in place. `bandpass` is the constant 0 dB peak form. */
export function biquad(data: Float32Array, kind: FilterKind, freq: number, q: number, rate: number, gainDb = 0): void {
  const f = Math.min(freq, rate * 0.45);
  const w = (TAU * f) / rate;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
  if (kind === 'peaking') {
    const A = Math.pow(10, gainDb / 40);
    b0 = 1 + alpha * A;
    b1 = -2 * cos;
    b2 = 1 - alpha * A;
    a0 = 1 + alpha / A;
    a1 = -2 * cos;
    a2 = 1 - alpha / A;
  } else {
    if (kind === 'lowpass') {
      b0 = (1 - cos) / 2;
      b1 = 1 - cos;
      b2 = b0;
    } else if (kind === 'highpass') {
      b0 = (1 + cos) / 2;
      b1 = -(1 + cos);
      b2 = b0;
    } else {
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
    }
    a0 = 1 + alpha;
    a1 = -2 * cos;
    a2 = 1 - alpha;
  }
  run(data, b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0);
}

function run(d: Float32Array, b0: number, b1: number, b2: number, a1: number, a2: number): void {
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < d.length; i++) {
    const x = d[i]!;
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    d[i] = y;
  }
}

/**
 * State-variable filter with a per-sample cutoff (Hz) and fixed Q, for sweeps and resonators. Chamberlin form: stable
 * while fc < rate / 6, so the cutoff is clamped there. The bandpass output is scaled by 1 / Q to stay near unity.
 */
export function svfSweep(data: Float32Array, rate: number, mode: 'lp' | 'bp', q: number, cutoff: (i: number) => number): void {
  let low = 0;
  let band = 0;
  const damp = 1 / q;
  for (let i = 0; i < data.length; i++) {
    const fc = Math.min(cutoff(i), rate / 6.5);
    const f = 2 * Math.sin((Math.PI * fc) / rate);
    low += f * band;
    const high = data[i]! - low - damp * band;
    band += f * high;
    data[i] = mode === 'lp' ? low : band * damp;
  }
}

/** tanh-style soft clip with a drive; adds the harmonics a phone speaker needs. */
export function softClip(data: Float32Array, drive: number): void {
  const norm = 1 / Math.tanh(drive);
  for (let i = 0; i < data.length; i++) data[i] = Math.tanh(data[i]! * drive) * norm;
}

/** Quantise to `bits` and sample-and-hold every `hold` samples (glitch). */
export function bitcrush(data: Float32Array, bits: number, hold: number): void {
  const levels = Math.pow(2, bits - 1);
  let held = 0;
  for (let i = 0; i < data.length; i++) {
    if (i % hold === 0) held = Math.round(data[i]! * levels) / levels;
    data[i] = held;
  }
}

export function reversed(data: Float32Array): Float32Array {
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[data.length - 1 - i]!;
  return out;
}

export function peak(data: Float32Array): number {
  let p = 0;
  for (let i = 0; i < data.length; i++) {
    const a = Math.abs(data[i]!);
    if (a > p) p = a;
  }
  return p;
}

export function normalize(data: Float32Array, target = 0.9): Float32Array {
  const p = peak(data);
  if (p > 1e-9) {
    const g = target / p;
    for (let i = 0; i < data.length; i++) data[i]! *= g;
  }
  return data;
}

/** Linear fade in and out over the given sample counts (removes clicks at the buffer edges). */
export function fadeEdges(data: Float32Array, inS: number, outS: number): void {
  for (let i = 0; i < inS && i < data.length; i++) data[i]! *= i / inS;
  for (let i = 0; i < outS && i < data.length; i++) data[data.length - 1 - i]! *= i / outS;
}

/** dst += src * gain, with src starting at `offset` samples. */
export function mixInto(dst: Float32Array, src: Float32Array, offset = 0, gain = 1): void {
  for (let i = 0; i < src.length; i++) {
    const j = i + offset;
    if (j >= 0 && j < dst.length) dst[j]! += src[i]! * gain;
  }
}

/**
 * Seamless loop of the first `outLen` samples of `data` (which must be at least outLen + xf long): the tail's overflow
 * is crossfaded onto the head with an equal-power curve.
 */
export function loopCrossfade(data: Float32Array, outLen: number, xf: number): Float32Array {
  const out = data.slice(0, outLen);
  for (let i = 0; i < xf; i++) {
    const w = i / xf;
    out[i] = out[i]! * Math.sin(w * Math.PI * 0.5) + data[outLen + i]! * Math.cos(w * Math.PI * 0.5);
  }
  return out;
}

/** Brown noise (integrated white, leaky). */
export function brownNoise(out: Float32Array, rng: Rng): void {
  let acc = 0;
  for (let i = 0; i < out.length; i++) {
    acc = (acc + (rng.next() * 2 - 1) * 0.02) * 0.998;
    out[i] = acc * 3.5;
  }
}

/** Pink noise (a standard seven-pole approximation). */
export function pinkNoise(out: Float32Array, rng: Rng): void {
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  for (let i = 0; i < out.length; i++) {
    const w = rng.next() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
}

export interface IrSpec {
  sec: number;
  /** Early reflection times (s). */
  early: number[];
  /** Decay times (s) of the low, mid and high bands. */
  low: number;
  mid: number;
  high: number;
  /** Optional slap-back echo time (s). */
  slap?: number;
}

/**
 * Stereo impulse response: decaying noise in three bands (low / mid / high) with different decay times, plus a few early
 * reflections. Left and right use different noise so the tail is wide. Energy-normalised so a 100 % wet send is about unity.
 */
export function impulseResponse(rng: Rng, rate: number, o: IrSpec): [Float32Array, Float32Array] {
  const n = len(o.sec, rate);
  const chans: Float32Array[] = [];
  for (let c = 0; c < 2; c++) {
    const out = new Float32Array(n);
    const bands: [number, number, number][] = [
      [250, 0.7, o.low],
      [1500, 0.7, o.mid],
      [5500, 0.7, o.high],
    ];
    for (const [fc, q, t60] of bands) {
      const b = new Float32Array(n);
      whiteNoise(b, rng);
      biquad(b, 'bandpass', fc, q, rate);
      const k = 6.9 / (t60 * rate);
      for (let i = 0; i < n; i++) out[i]! += b[i]! * Math.exp(-k * i);
    }
    for (let e = 0; e < o.early.length; e++) {
      const at = Math.round((o.early[e]! + c * 0.0017) * rate);
      if (at < n) out[at]! += (rng.next() > 0.5 ? 1 : -1) * 0.5 * Math.pow(0.8, e);
    }
    if (o.slap) {
      const at = Math.round((o.slap + c * 0.004) * rate);
      if (at < n) out[at]! += 0.4;
    }
    fadeEdges(out, Math.round(rate * 0.002), 0);
    let e2 = 0;
    for (let i = 0; i < n; i++) e2 += out[i]! * out[i]!;
    const g = 1 / Math.sqrt(Math.max(e2, 1e-9));
    for (let i = 0; i < n; i++) out[i]! *= g;
    chans.push(out);
  }
  return [chans[0]!, chans[1]!];
}

/** A cheap checksum of a buffer, for determinism tests. */
export function checksum(data: Float32Array): number {
  let h = 0x811c9dc5;
  const step = Math.max(1, Math.floor(data.length / 4096));
  for (let i = 0; i < data.length; i += step) {
    h ^= Math.round(data[i]! * 32767) & 0xffff;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Linear-interpolation resample (used for convolver impulses when the context rate differs from the library's). */
export function resample(data: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return data;
  const n = Math.round((data.length * to) / from);
  const out = new Float32Array(n);
  const k = from / to;
  for (let i = 0; i < n; i++) {
    const x = i * k;
    const j = Math.floor(x);
    const f = x - j;
    out[i] = data[j]! * (1 - f) + (data[Math.min(j + 1, data.length - 1)] ?? 0) * f;
  }
  return out;
}
