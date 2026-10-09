/**
 * The found-sound library (direction Section 3): one-shots and loops rendered once from a seeded generator, in pure
 * Float32 DSP (no Web Audio, so the same code runs in node tests and in the page). The sequencer plays these at run
 * time; chopping, pitch shifting and reversing happen at play time or in the recipes.
 *
 * Every recipe gets its own sub-stream (`rng.fork(id)`), so a sound renders identically whatever else is rendered.
 */
import {
  addMode,
  bitcrush,
  biquad,
  brownNoise,
  fadeEdges,
  impulseResponse,
  len,
  loopCrossfade,
  mixInto,
  normalize,
  pinkNoise,
  reversed,
  softClip,
  svfSweep,
  whiteNoise,
  type IrSpec,
} from './dsp';
import { ORCHESTRA_RECIPES } from './orchestra';
import { Rng } from './rng';

const TAU = Math.PI * 2;

/** The render sample rate of the library. Buffers resample to the context's rate at play time. */
export const LIB_RATE = 48000;

/** Hz of the pitches the recipes use (equal temperament, A4 = 440). */
export const D1 = 36.708;
export const D2 = 73.416;
export const D4 = 293.665;
export const D5 = 587.33;
export const semis = (n: number): number => Math.pow(2, n / 12);

export interface Sound {
  data: Float32Array;
  /** Pitch (Hz) the buffer was rendered at; 0 = unpitched. Pitched play uses `playbackRate = target / root`. */
  root: number;
  /** True for seamless loops (drones, beds, sustained bass). */
  loop: boolean;
}

export type ReverbName = 'room' | 'hall' | 'street';

export interface Library {
  rate: number;
  seed: number;
  sounds: Map<string, Sound>;
  irs: Record<ReverbName, [Float32Array, Float32Array]>;
  /** Total render time (ms), measured. */
  renderMs: number;
  /** Variant ids by base name (`click` -> click0, click1, click2). */
  variants(base: string): string[];
  get(id: string): Sound;
}

interface Ctx {
  rate: number;
  rng: Rng;
}

const snd = (data: Float32Array, root = 0, loop = false): Sound => ({ data, root, loop });

/** A band-limited noise burst, `sec` long with an exponential decay `tau`. */
function noiseBurst(c: Ctx, sec: number, tau: number, lo: number, hi: number): Float32Array {
  const out = new Float32Array(len(sec, c.rate));
  whiteNoise(out, c.rng);
  if (lo > 0) biquad(out, 'highpass', lo, 0.7, c.rate);
  if (hi > 0) biquad(out, 'lowpass', hi, 0.7, c.rate);
  for (let i = 0; i < out.length; i++) out[i]! *= Math.exp(-i / (c.rate * tau));
  return out;
}

// ---------------------------------------------------------------- metal

/** Struck pipe: six inharmonic modes (free-bar ratios), higher modes die sooner. */
function pipeData(c: Ctx, root: number, sec: number, modes: number, decayMul: number): Float32Array {
  const out = new Float32Array(len(sec, c.rate));
  const ratios = [1, 2.76, 5.4, 8.93, 13.3, 18.6];
  const decays = [2.0, 1.3, 0.8, 0.5, 0.3, 0.15];
  const amps = [1, 0.6, 0.4, 0.25, 0.15, 0.1];
  for (let m = 0; m < modes; m++) addMode(out, c.rate, root * ratios[m]! * c.rng.jitter(0.01), amps[m]!, decays[m]! * decayMul, 0, c.rng.range(0, TAU));
  const strike = noiseBurst(c, 0.003, 0.001, 1500, 4500);
  mixInto(out, strike, 0, 0.35);
  return out;
}

function plateData(c: Ctx, sec: number, modes: number): Float32Array {
  const out = new Float32Array(len(sec, c.rate));
  for (let m = 0; m < modes; m++) {
    const f = c.rng.logRange(180, 6000);
    const decay = 1.2 - 0.9 * (Math.log(f / 180) / Math.log(6000 / 180));
    addMode(out, c.rate, f, c.rng.range(0.3, 1), Math.max(0.25, decay) * (sec / 1.4), 0, c.rng.range(0, TAU));
  }
  mixInto(out, noiseBurst(c, 0.004, 0.0015, 1800, 5000), 0, 0.5);
  return out;
}

function boom(c: Ctx): Sound {
  const f0 = c.rng.chance(0.5) ? D1 : 55;
  const out = new Float32Array(len(2.6, c.rate));
  const modes: { f: number; a: number; d: number }[] = [{ f: f0, a: 1, d: 3.6 }];
  for (let m = 1; m < 12; m++) {
    const f = Math.min(300, f0 * (1 + m * 0.62 + c.rng.range(0, 0.4)));
    modes.push({ f, a: c.rng.range(0.15, 0.7) / Math.sqrt(m), d: Math.max(1.4, 3.4 - m * 0.18) });
  }
  // a slight downward bend (-30 cents over the first second)
  for (const m of modes) {
    let ph = c.rng.range(0, TAU);
    const w0 = (TAU * m.f) / c.rate;
    for (let i = 0; i < out.length; i++) {
      const t = i / c.rate;
      const bend = 1 - 0.0172 * Math.min(t, 1);
      ph += w0 * bend;
      out[i]! += m.a * Math.exp((-6.9 * t) / m.d) * Math.sin(ph);
    }
  }
  // mallet thump
  let ph = 0;
  for (let i = 0; i < c.rate * 0.25; i++) {
    const t = i / c.rate;
    ph += (TAU * (35 + 25 * Math.exp(-t / 0.05))) / c.rate;
    out[i]! += 1.4 * Math.exp(-t / 0.07) * Math.sin(ph);
  }
  biquad(out, 'lowpass', 1200, 0.7, c.rate);
  softClip(out, 2.6);
  fadeEdges(out, 8, Math.round(c.rate * 0.2));
  return snd(normalize(out), f0);
}

function rail(c: Ctx): Sound {
  const f = D5;
  const out = new Float32Array(len(1.6, c.rate));
  for (let i = 0; i < out.length; i++) {
    const t = i / c.rate;
    const idx = 6 * Math.max(0, 1 - t / 0.4);
    out[i] = Math.exp((-6.9 * t) / 1.5) * Math.sin(TAU * f * t + idx * Math.sin(TAU * f * 1.414 * t));
  }
  fadeEdges(out, 16, 64);
  return snd(normalize(out), f);
}

/** British mains hum: 50 Hz and its harmonics, two copies half a hertz apart so it beats; whole cycles, loops. */
function hum(c: Ctx): Sound {
  const out = new Float32Array(len(2, c.rate));
  const partials: [number, number][] = [[50, 1], [100, 0.5], [150, 0.3], [250, 0.15]];
  const ph = [c.rng.range(0, TAU), c.rng.range(0, TAU)];
  for (const [f, a] of partials) {
    for (let copy = 0; copy < 2; copy++) {
      const w = (TAU * (f + copy * 0.5)) / c.rate;
      for (let i = 0; i < out.length; i++) out[i]! += a * Math.sin(w * i + ph[copy]! * (f / 50));
    }
  }
  softClip(out, 1.8);
  return snd(normalize(out, 0.8), 0, true);
}

function scrapeData(c: Ctx): Float32Array {
  const n = len(1.2, c.rate);
  const sum = new Float32Array(n);
  for (const [lo, hi, g] of [[300, 3000, 1], [520, 2100, 0.7]] as const) {
    const b = new Float32Array(n);
    whiteNoise(b, c.rng);
    svfSweep(b, c.rate, 'bp', 8, (i) => lo * Math.pow(hi / lo, i / n));
    mixInto(sum, b, 0, g);
  }
  for (let i = 0; i < n; i++) {
    const t = i / c.rate;
    sum[i]! *= (0.7 + 0.3 * Math.sin(TAU * 9 * t)) * Math.pow(i / n, 1.4);
  }
  fadeEdges(sum, 0, Math.round(c.rate * 0.02));
  return normalize(sum);
}

function chainData(c: Ctx, sec: number, hits: number): Float32Array {
  const out = new Float32Array(len(sec, c.rate));
  for (let k = 0; k < hits; k++) {
    const t = sec * 0.95 * Math.pow(c.rng.next(), 1.8);
    const start = Math.round(t * c.rate);
    const lvl = (1 - t / sec) * 0.7 + 0.3;
    const dec = c.rng.range(0.005, 0.02);
    for (let m = 0; m < 3; m++) addMode(out, c.rate, c.rng.logRange(900, 5000), c.rng.range(0.3, 1) * lvl, dec, start, c.rng.range(0, TAU));
  }
  return out;
}

// ---------------------------------------------------------------- glass, clicks, bells

function glass(c: Ctx, scale = 1): Float32Array {
  const out = new Float32Array(len(0.2, c.rate));
  for (let m = 0; m < 4; m++) addMode(out, c.rate, c.rng.range(3000, 9000) * scale, c.rng.range(0.4, 1), c.rng.range(0.03, 0.08), 0, c.rng.range(0, TAU));
  mixInto(out, noiseBurst(c, 0.002, 0.0006, 3000, 0), 0, 0.4);
  return out;
}

function clickData(c: Ctx, lo: number, hi: number): Float32Array {
  const out = new Float32Array(len(0.03, c.rate));
  out[2] = 1;
  biquad(out, 'bandpass', c.rng.range(lo, hi), 4, c.rate);
  return out;
}

function relayData(c: Ctx, release: boolean): Float32Array {
  const out = new Float32Array(len(0.12, c.rate));
  const gap = Math.round(c.rng.range(0.008, 0.015) * c.rate);
  const lo = release ? 3500 : 2000;
  const hi = release ? 6500 : 4200;
  mixInto(out, clickData(c, lo, hi), 0, release ? 0.6 : 1);
  mixInto(out, clickData(c, lo, hi), gap, release ? 0.4 : 0.7);
  addMode(out, c.rate, release ? 260 : 180, release ? 0.25 : 0.9, release ? 0.008 : 0.02, 0, 0);
  return out;
}

/** Additive telephone bell: partial ratios, amplitudes and decays of the strike note. */
function bellData(c: Ctx, root: number, parts: [number, number, number][], sec: number, hammer: number): Float32Array {
  const out = new Float32Array(len(sec, c.rate));
  for (const [r, a, d] of parts) addMode(out, c.rate, root * r * c.rng.jitter(0.002), a, d, 0, c.rng.range(0, TAU));
  mixInto(out, noiseBurst(c, 0.003, 0.001, 3000, 7000), 0, hammer);
  return out;
}

const BELL_PARTS: [number, number, number][] = [
  [0.5, 0.6, 3],
  [1, 1, 3],
  [1.19, 0.5, 0.9],
  [1.5, 0.4, 0.7],
  [2, 0.5, 0.6],
  [2.52, 0.25, 0.5],
  [3, 0.2, 0.4],
];

/** Wood-ish tick plus a tiny glass ring (the call-board clock). */
function tickData(c: Ctx, tock: boolean): Float32Array {
  const out = new Float32Array(len(0.1, c.rate));
  const k = tock ? 0.75 : 1;
  addMode(out, c.rate, 800 * k, 0.8, 0.004);
  addMode(out, c.rate, 2300 * k, 0.6, 0.003);
  mixInto(out, glass(c, 0.8 * k), 0, 0.25);
  return out;
}

// ---------------------------------------------------------------- pitched voices

function bellpiano(c: Ctx): Sound {
  const f = D4;
  const out = new Float32Array(len(2.5, c.rate));
  for (let i = 0; i < out.length; i++) {
    const t = i / c.rate;
    const idx = 0.2 + 1.3 * Math.exp(-t / 0.2);
    const amp = Math.exp((-6.9 * t) / 3);
    out[i] = amp * (Math.sin(TAU * f * t + idx * Math.sin(TAU * f * t)) + 0.063 * Math.exp(-t / 0.4) * Math.sin(TAU * f * 3.5 * t));
  }
  biquad(out, 'lowpass', 2500, 0.7, c.rate);
  fadeEdges(out, Math.round(c.rate * 0.002), Math.round(c.rate * 0.05));
  return snd(normalize(out), f);
}

// ---------------------------------------------------------------- machines

function thumpData(c: Ctx, sec = 0.45): Float32Array {
  const out = new Float32Array(len(sec, c.rate));
  let ph = 0;
  for (let i = 0; i < c.rate * 0.2; i++) {
    const t = i / c.rate;
    ph += (TAU * (40 + 30 * Math.exp(-t / 0.04))) / c.rate;
    out[i]! += Math.exp(-t / 0.08) * Math.sin(ph);
  }
  const body = noiseBurst(c, 0.12, 0.03, 0, 0);
  biquad(body, 'bandpass', 200, 1.2, c.rate);
  mixInto(out, body, 0, 0.9);
  mixInto(out, chainData(c, Math.min(0.35, sec), 8), Math.round(c.rate * 0.03), 0.12);
  softClip(out, 2.2);
  fadeEdges(out, 6, Math.round(c.rate * 0.04));
  return out;
}

function pistonData(c: Ctx): Float32Array {
  const n = len(0.3, c.rate);
  const out = new Float32Array(n);
  whiteNoise(out, c.rng);
  svfSweep(out, c.rate, 'bp', 2, (i) => 2000 - 1000 * (i / n));
  for (let i = 0; i < n; i++) out[i]! *= Math.exp(-i / (c.rate * 0.08)) * Math.min(1, i / (c.rate * 0.001));
  return out;
}

function motorData(c: Ctx): Float32Array {
  const n = len(0.9, c.rate);
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    ph += (90 + 50 * (i / n)) / c.rate;
    out[i] = 2 * (ph - Math.floor(ph)) - 1;
  }
  svfSweep(out, c.rate, 'lp', 1.2, () => 700);
  for (let i = 0; i < n; i++) out[i]! *= Math.min(1, i / (c.rate * 0.05));
  fadeEdges(out, 0, Math.round(c.rate * 0.05));
  return normalize(out);
}

function pressData(c: Ctx): Float32Array {
  const out = thumpData(c, 0.7);
  mixInto(out, plateData(c, 0.6, 12), 0, 0.5);
  const burst = noiseBurst(c, 0.04, 0.02, 0, 0);
  bitcrush(burst, 6, 3);
  mixInto(out, burst, 0, 0.5);
  softClip(out, 1.6);
  return out;
}

// ---------------------------------------------------------------- drums

function kickData(c: Ctx, round: boolean): Float32Array {
  const out = new Float32Array(len(round ? 0.6 : 0.35, c.rate));
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / c.rate;
    const f = round ? 42 + 50 * Math.exp(-t / 0.25) + 25 * Math.exp(-t / 0.04) : 45 + 60 * Math.exp(-t / 0.2) + 45 * Math.exp(-t / 0.03);
    ph += (TAU * f) / c.rate;
    out[i] = Math.exp(-t / (round ? 0.22 : 0.12)) * Math.sin(ph);
  }
  mixInto(out, noiseBurst(c, 0.002, 0.0007, 1000, 6000), 0, 0.5);
  softClip(out, round ? 1.6 : 2.2);
  fadeEdges(out, 4, Math.round(c.rate * 0.03));
  return out;
}

function snareData(c: Ctx, tail: number): Float32Array {
  const out = new Float32Array(len(0.3, c.rate));
  addMode(out, c.rate, 185, 0.6, 0.08, 0, 0);
  addMode(out, c.rate, 330, 0.5, 0.08, 0, 0);
  mixInto(out, noiseBurst(c, 0.3, tail, 1000, 6000), 0, 0.9);
  softClip(out, 1.3);
  fadeEdges(out, 3, Math.round(c.rate * 0.03));
  return out;
}

function hat(c: Ctx, sec: number, tau: number): Float32Array {
  const out = new Float32Array(len(sec, c.rate));
  for (const f of [205.3, 304.4, 369.6, 522.7, 540, 800]) {
    const w = f / c.rate;
    let ph = c.rng.next();
    for (let i = 0; i < out.length; i++) {
      ph += w;
      ph -= Math.floor(ph);
      out[i]! += ph < 0.5 ? 1 : -1;
    }
  }
  biquad(out, 'highpass', 7000, 0.8, c.rate);
  for (let i = 0; i < out.length; i++) out[i]! *= Math.exp(-i / (c.rate * tau)) * Math.min(1, i / 24);
  fadeEdges(out, 0, Math.round(c.rate * 0.004));
  return out;
}

// ---------------------------------------------------------------- bass

function saw(out: Float32Array, rate: number, f: number, phase = 0): void {
  let ph = phase;
  for (let i = 0; i < out.length; i++) {
    out[i]! += 2 * (ph - Math.floor(ph)) - 1;
    ph += f / rate;
  }
}

/** Sine plus 2nd and 3rd harmonics, soft clipped so the phone speaker has something to play; 147 whole cycles, loops. */
function sub(c: Ctx): Sound {
  const out = new Float32Array(len(2, c.rate));
  const w = (TAU * 73.5) / c.rate;
  for (let i = 0; i < out.length; i++) out[i] = Math.sin(w * i) + 0.25 * Math.sin(2 * w * i) + 0.1 * Math.sin(3 * w * i);
  softClip(out, 1.5);
  return snd(normalize(out, 0.9), 73.5, true);
}

/** Combat bass: two detuned saws through a low-pass with a slow cutoff LFO, plus a sub octave. 4 s, whole cycles, loops. */
function reese(c: Ctx): Sound {
  const n = len(4, c.rate);
  const out = new Float32Array(n);
  saw(out, c.rate, 74.0, c.rng.next());
  saw(out, c.rate, 73.0, c.rng.next());
  const lfoCycles = c.rng.pick([1, 2]);
  // two passes (the second starts from a settled filter), keep the second: the loop point is continuous
  const two = new Float32Array(n * 2);
  two.set(out, 0);
  two.set(out, n);
  svfSweep(two, c.rate, 'lp', 1.1, (i) => 520 + 280 * Math.sin((TAU * lfoCycles * (i % n)) / n));
  const kept = two.slice(n);
  const w = (TAU * 36.75) / c.rate;
  for (let i = 0; i < n; i++) kept[i] = kept[i]! * 0.7 + 0.6 * Math.sin(w * i);
  softClip(kept, 1.7);
  return snd(normalize(kept, 0.9), 73.5, true);
}

function sawbass(c: Ctx): Sound {
  const n = len(0.6, c.rate);
  const out = new Float32Array(n);
  saw(out, c.rate, D2);
  svfSweep(out, c.rate, 'lp', 1.4, (i) => 300 + 1700 * Math.exp(-i / (c.rate * 0.03)));
  for (let i = 0; i < n; i++) out[i]! *= Math.exp(-i / (c.rate * 0.3)) * Math.min(1, i / (c.rate * 0.003));
  softClip(out, 1.8);
  fadeEdges(out, 0, Math.round(c.rate * 0.05));
  return snd(normalize(out), D2);
}

// ---------------------------------------------------------------- pads, drones, textures

/** Render a texture that must loop: render a bit longer and crossfade the overflow onto the head. */
function looped(c: Ctx, sec: number, xfSec: number, fill: (out: Float32Array) => void): Float32Array {
  const raw = new Float32Array(len(sec + xfSec, c.rate));
  fill(raw);
  return loopCrossfade(raw, len(sec, c.rate), len(xfSec, c.rate));
}

function drone(c: Ctx): Sound {
  const sec = 4;
  const n = len(sec, c.rate);
  const out = new Float32Array(n * 2);
  // whole cycles per 6 s (73.5 Hz, 110 Hz); a slow phase wobble that is periodic over the loop
  const partials: [number, number, number][] = [[73.5, 1, 1], [147, 0.45, 2], [110, 0.8, 1], [220, 0.3, 2]];
  for (const [f, a, k] of partials) {
    const ph0 = c.rng.range(0, TAU);
    const wob = c.rng.range(0.05, 0.14);
    for (let i = 0; i < out.length; i++) {
      const t = i / c.rate;
      out[i]! += a * Math.sin(TAU * f * t + wob * Math.sin((TAU * k * t) / sec + ph0) + ph0);
    }
  }
  biquad(out, 'lowpass', 900, 0.7, c.rate);
  return snd(normalize(out.slice(n), 0.9), 0, true);
}

/** Bowed metal: the pipe's modes excited by continuous noise through narrow resonators. A singing, unstable tone. */
function bowed(c: Ctx, f0: number): Sound {
  const data = looped(c, 2.4, 0.4, (out) => {
    const noise = new Float32Array(out.length);
    whiteNoise(noise, c.rng);
    for (const [r, a] of [[1, 1], [2.76, 0.45], [5.4, 0.2]] as const) {
      const band = noise.slice();
      biquad(band, 'bandpass', f0 * r * c.rng.jitter(0.004), 60, c.rate);
      for (let i = 0; i < out.length; i++) out[i]! += band[i]! * a * (1 + 0.25 * Math.sin((TAU * i) / (c.rate * 2.4) + r));
    }
  });
  return snd(normalize(data, 0.8), f0, true);
}

function air(c: Ctx): Sound {
  const data = looped(c, 4, 0.5, (out) => {
    brownNoise(out, c.rng);
    biquad(out, 'lowpass', 400, 0.7, c.rate);
    const pink = new Float32Array(out.length);
    pinkNoise(pink, c.rng);
    mixInto(out, pink, 0, 0.06);
  });
  return snd(normalize(data, 0.8), 0, true);
}

function rainbed(c: Ctx): Sound {
  const data = looped(c, 4, 0.5, (out) => {
    pinkNoise(out, c.rng);
    biquad(out, 'highpass', 800, 0.7, c.rate);
    biquad(out, 'lowpass', 8000, 0.7, c.rate);
    normalize(out, 0.5);
    const drops = Math.round((out.length / c.rate) * 30);
    for (let d = 0; d < drops; d++) {
      const start = c.rng.int(out.length);
      const f = c.rng.range(2000, 5000);
      addMode(out, c.rate, f, c.rng.range(0.05, 0.4), c.rng.range(0.003, 0.01), start, 0);
    }
  });
  return snd(normalize(data, 0.8), 0, true);
}

function lineStatic(c: Ctx): Sound {
  const data = looped(c, 2, 0.2, (out) => {
    const perSec = 50;
    const hits = Math.round((out.length / c.rate) * perSec);
    for (let h = 0; h < hits; h++) out[c.rng.int(out.length)]! += (c.rng.next() > 0.5 ? 1 : -1) * c.rng.range(0.3, 1);
    biquad(out, 'highpass', 300, 0.7, c.rate);
    biquad(out, 'lowpass', 3400, 0.7, c.rate);
  });
  return snd(normalize(data, 0.8), 0, true);
}

// ---------------------------------------------------------------- recipes

type Recipe = (c: Ctx) => Sound;

const RECIPES: Record<string, Recipe> = {
  // metal
  pipe: (c) => snd(normalize(pipeData(c, D4, 1.8, 6, 1)), D4),
  plate: (c) => snd(normalize(plateData(c, 1.4, 20)), 0),
  boom,
  rail,
  hum,
  scrape: (c) => snd(scrapeData(c)),
  scrapeRev: (c) => snd(reversed(scrapeData(c))),
  chain: (c) => snd(normalize(chainData(c, 0.8, 30))),
  // glass, clicks, bells
  glass: (c) => snd(normalize(glass(c))),
  click0: (c) => snd(normalize(clickData(c, 2000, 5000))),
  click1: (c) => snd(normalize(clickData(c, 2000, 5000))),
  click2: (c) => snd(normalize(clickData(c, 2000, 5000))),
  relay0: (c) => snd(normalize(relayData(c, false))),
  relay1: (c) => snd(normalize(relayData(c, false))),
  relayRel0: (c) => snd(normalize(relayData(c, true))),
  relayRel1: (c) => snd(normalize(relayData(c, true))),
  dial: (c) => {
    const out = new Float32Array(len(1, c.rate));
    for (let p = 0; p < 9; p++) mixInto(out, relayData(c, true), Math.round(p * 0.1 * c.rate), c.rng.range(0.8, 1));
    return snd(normalize(out));
  },
  bell: (c) => snd(normalize(bellData(c, D5, BELL_PARTS, 2.8, 0.3)), D5),
  motifbell: (c) =>
    snd(
      normalize(
        bellData(
          c,
          D4,
          [[0.5, 0.3, 2.5], [1, 1, 2.8], [1.19, 0.15, 0.7], [2, 0.55, 1.8], [3, 0.12, 0.5]],
          2.6,
          0.2,
        ),
      ),
      D4,
    ),
  ring: (c) => {
    const out = new Float32Array(len(1.4, c.rate));
    const bell = bellData(c, D5, BELL_PARTS, 1.0, 0.3);
    const strikeLen = len(0.14, c.rate);
    const rateHz = c.rng.range(18, 22);
    const dur = c.rng.range(0.5, 0.8);
    for (let t = 0; t < dur; t += 1 / rateHz) {
      const part = bell.slice(0, strikeLen);
      fadeEdges(part, 0, Math.round(c.rate * 0.02));
      mixInto(out, part, Math.round(t * c.rate), c.rng.range(0.5, 1));
    }
    mixInto(out, bell, Math.round(dur * c.rate), 0.7);
    return snd(normalize(out), D5);
  },
  tick0: (c) => snd(normalize(tickData(c, false))),
  tick1: (c) => snd(normalize(tickData(c, true))),
  // pitched voices
  bellpiano,
  // machines
  thump: (c) => snd(normalize(thumpData(c))),
  piston: (c) => snd(normalize(pistonData(c))),
  motor: (c) => snd(motorData(c)),
  motorDown: (c) => snd(reversed(motorData(c))),
  press: (c) => snd(normalize(pressData(c))),
  // drums
  kickTight: (c) => snd(normalize(kickData(c, false))),
  kickRound: (c) => snd(normalize(kickData(c, true))),
  snare: (c) => snd(normalize(snareData(c, 0.05))),
  snareMetal: (c) => {
    const out = snareData(c, 0.05);
    mixInto(out, plateData(c, 0.3, 14), 0, 0.55);
    return snd(normalize(out));
  },
  ghost: (c) => snd(normalize(snareData(c, 0.025))),
  brushTap: (c) => snd(normalize(noiseBurst(c, 0.05, 0.012, 2000, 8000))),
  brushSwish: (c) => {
    const n = len(0.35, c.rate);
    const out = new Float32Array(n);
    whiteNoise(out, c.rng);
    svfSweep(out, c.rate, 'bp', 1.2, (i) => 1500 + 1500 * (i / n));
    const a = Math.round(c.rate * 0.12);
    const r = Math.round(c.rate * 0.2);
    for (let i = 0; i < n; i++) out[i]! *= Math.min(1, i / a) * Math.min(1, (n - i) / r);
    return snd(normalize(out));
  },
  hatC: (c) => snd(normalize(hat(c, 0.08, 0.015))),
  hatO: (c) => snd(normalize(hat(c, 0.4, 0.09))),
  rim: (c) => {
    const out = new Float32Array(len(0.08, c.rate));
    addMode(out, c.rate, 1100, 0.8, 0.03);
    addMode(out, c.rate, 2900, 0.5, 0.02);
    mixInto(out, noiseBurst(c, 0.002, 0.0008, 2000, 7000), 0, 0.5);
    return snd(normalize(out));
  },
  // bass
  sub,
  reese,
  sawbass,
  bassmetal: (c) => {
    const out = pipeData(c, D2, 2, 2, 1.1);
    softClip(out, 2);
    return snd(normalize(out), D2);
  },
  // pads, drones, textures
  drone,
  bowedD: (c) => bowed(c, 146.83),
  bowedAb: (c) => bowed(c, 207.65),
  air,
  rainbed,
  static: lineStatic,
  // the synth-orchestral voices (direction v2 Section 4)
  ...ORCHESTRA_RECIPES,
};

export const SOUND_IDS: string[] = Object.keys(RECIPES);

const IR_SPECS: Record<ReverbName, IrSpec> = {
  room: { sec: 0.6, early: [0.004, 0.009, 0.013, 0.021], low: 0.6, mid: 0.5, high: 0.35 },
  hall: { sec: 2.8, early: [0.012, 0.021, 0.034, 0.05], low: 2.8, mid: 2.4, high: 1.4 },
  street: { sec: 1.6, early: [], low: 1.2, mid: 1.5, high: 1.6, slap: 0.09 },
};

export const REVERB_NAMES: ReverbName[] = ['room', 'hall', 'street'];

/** Render one sound. The same (seed, id, rate) always gives the same samples. */
export function renderSound(id: string, seed: number, rate: number): Sound {
  const recipe = RECIPES[id];
  if (!recipe) throw new Error(`music library: unknown sound "${id}"`);
  return recipe({ rate, rng: new Rng(seed).fork(`library/${id}`) });
}

export function renderIr(name: ReverbName, seed: number, rate: number): [Float32Array, Float32Array] {
  return impulseResponse(new Rng(seed).fork(`ir/${name}`), rate, IR_SPECS[name]);
}

function makeLibrary(seed: number, rate: number): Library {
  const sounds = new Map<string, Sound>();
  const byBase = new Map<string, string[]>();
  const lib: Library = {
    rate,
    seed,
    sounds,
    irs: {} as Library['irs'],
    renderMs: 0,
    variants(base) {
      let v = byBase.get(base);
      if (!v) {
        const re = new RegExp(`^${base}\\d+$`);
        v = [...sounds.keys()].filter((k) => re.test(k));
        byBase.set(base, v);
      }
      return v;
    },
    get(id) {
      const s = sounds.get(id);
      if (!s) throw new Error(`music library: "${id}" not rendered`);
      return s;
    },
  };
  return lib;
}

/** Render the whole library (or a subset) synchronously. Used by tests and the offline export. */
export function renderLibrary(seed: number, rate = LIB_RATE, ids: readonly string[] = SOUND_IDS, withIrs = true): Library {
  const t0 = nowMs();
  const lib = makeLibrary(seed, rate);
  for (const id of ids) lib.sounds.set(id, renderSound(id, seed, rate));
  if (withIrs) for (const n of REVERB_NAMES) lib.irs[n] = renderIr(n, seed, rate);
  lib.renderMs = nowMs() - t0;
  return lib;
}

/**
 * Render the library in chunks, yielding to the event loop between sounds so the menu and the game stay responsive.
 * `onProgress(done, total)` fires after each sound.
 */
export async function renderLibraryAsync(seed: number, rate = LIB_RATE, onProgress?: (done: number, total: number) => void): Promise<Library> {
  const t0 = nowMs();
  const lib = makeLibrary(seed, rate);
  const total = SOUND_IDS.length + REVERB_NAMES.length;
  let done = 0;
  const yieldNow = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
  for (const id of SOUND_IDS) {
    lib.sounds.set(id, renderSound(id, seed, rate));
    onProgress?.(++done, total);
    await yieldNow();
  }
  for (const n of REVERB_NAMES) {
    lib.irs[n] = renderIr(n, seed, rate);
    onProgress?.(++done, total);
    await yieldNow();
  }
  lib.renderMs = nowMs() - t0;
  return lib;
}

const nowMs = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Total mono seconds in a library (the budget is 100 s, direction v2 4.8). */
export function librarySeconds(lib: Library): number {
  let n = 0;
  for (const s of lib.sounds.values()) n += s.data.length;
  return n / lib.rate;
}
