/**
 * The synth-orchestral voices (direction v2 Section 4): synth-brass, synth-strings, bells and mallets, timpani, big
 * synth drums and the distorted mid bass. Rendered once into the library like the found sounds, in pure Float32 DSP, from
 * the library's seeded sub-streams. Every pitched voice is rooted on a D, so a motif note plays at `semis(n)`.
 */
import { addMode, biquad, fadeEdges, len, loopCrossfade, mixInto, normalize, softClip, svfSweep, whiteNoise } from './dsp';
import type { Sound } from './library';
import type { Rng } from './rng';

const TAU = Math.PI * 2;
const D2 = 73.416;
const D3 = 146.832;
const D4 = 293.665;
const D5 = 587.33;

interface Ctx {
  rate: number;
  rng: Rng;
}

const snd = (data: Float32Array, root = 0, loop = false): Sound => ({ data, root, loop });

/** PolyBLEP correction for a naive saw (removes most of the aliasing). */
function blep(t: number, dt: number): number {
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
}

/** Add a band-limited saw whose frequency follows `freq(i)` (Hz). */
function addSaw(out: Float32Array, rate: number, amp: number, freq: (i: number) => number, phase0 = 0): void {
  let ph = phase0;
  for (let i = 0; i < out.length; i++) {
    const dt = freq(i) / rate;
    out[i]! += amp * (2 * ph - 1 - blep(ph, dt));
    ph += dt;
    if (ph >= 1) ph -= 1;
  }
}

const cents = (c: number): number => Math.pow(2, c / 1200);

// ---------------------------------------------------------------- brass

/**
 * FM synth-brass: two detuned saws and a 1:1 FM pair whose index follows the envelope (brighter as it gets louder), a
 * low-pass that bites open on the attack, a pitch scoop up into the note, a delayed vibrato and a breath of noise.
 * `attack` 0.03 s is the hook; 0.18 s is the swell for held notes.
 */
function brass(c: Ctx, attack: number, sec: number): Sound {
  const rate = c.rate;
  const n = len(sec, rate);
  const env = new Float32Array(n);
  const bite = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const a = t < attack ? t / attack : 1;
    // a small overshoot after the attack, settling to the sustain
    const d = t < attack ? 1 : 0.78 + 0.22 * Math.exp(-(t - attack) / 0.12);
    env[i] = a * d * (1 - 0.12 * Math.min(1, t / sec));
    bite[i] = t < attack ? a : Math.exp(-(t - attack) / 0.05);
  }
  const f = (i: number): number => {
    const t = i / rate;
    const scoop = -30 * Math.exp(-t / 0.012);
    const vib = t > 0.35 ? 8 * Math.min(1, (t - 0.35) / 0.4) * Math.sin(TAU * 5.4 * t) : 0;
    return D4 * cents(scoop + vib);
  };
  const out = new Float32Array(n);
  addSaw(out, rate, 0.5, (i) => f(i) * cents(6), c.rng.next());
  addSaw(out, rate, 0.5, (i) => f(i) * cents(-6), c.rng.next());
  // the FM pair (ratio 1:1)
  let pc = 0;
  let pm = c.rng.range(0, TAU);
  for (let i = 0; i < n; i++) {
    const w = (TAU * f(i)) / rate;
    pm += w;
    pc += w;
    out[i]! += 0.35 * Math.sin(pc + (0.5 + 2.5 * env[i]!) * Math.sin(pm));
  }
  svfSweep(out, rate, 'lp', 1.1, (i) => 450 + 1350 * env[i]! + 2600 * bite[i]!);
  // breath at the attack
  const breath = new Float32Array(len(0.06, rate));
  whiteNoise(breath, c.rng);
  biquad(breath, 'bandpass', 1800, 1.2, rate);
  for (let i = 0; i < breath.length; i++) breath[i]! *= Math.exp(-i / (rate * 0.02));
  mixInto(out, breath, Math.round(attack * rate * 0.3), 0.06);
  for (let i = 0; i < n; i++) out[i]! *= env[i]!;
  softClip(out, 1.6);
  fadeEdges(out, 16, Math.round(rate * 0.15));
  return snd(normalize(out), D4);
}

// ---------------------------------------------------------------- strings

/** Synth-strings: seven saws spread +-14 cents, each drifting slowly, low-passed; a seamless loop (attack via fadeIn). */
function strings(c: Ctx): Sound {
  const rate = c.rate;
  const sec = 2;
  const xf = Math.round(rate * 0.3);
  const n = len(sec, rate) + xf;
  const out = new Float32Array(n);
  for (let v = 0; v < 7; v++) {
    const det = -14 + (28 * v) / 6;
    const drift = c.rng.range(0.1, 0.3);
    const dph = c.rng.range(0, TAU);
    addSaw(out, rate, 1 / 7, (i) => D3 * cents(det + 3 * Math.sin(TAU * drift * (i / rate) + dph)), c.rng.next());
  }
  biquad(out, 'lowpass', 2200, 0.8, rate);
  biquad(out, 'lowpass', 3200, 0.6, rate);
  biquad(out, 'highpass', 90, 0.7, rate);
  return snd(normalize(loopCrossfade(out, n - xf, xf), 0.8), D3, true);
}

// ---------------------------------------------------------------- bells and mallets

/** Glassy FM bell (ratio 1:3.5): the index falls from 4 to 0.3 over 1.5 s; rings 3 s. Root D5. */
function bellFM(c: Ctx): Sound {
  const rate = c.rate;
  const n = len(3, rate);
  const out = new Float32Array(n);
  const w = (TAU * D5) / rate;
  let pc = 0;
  let pm = c.rng.range(0, TAU);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const idx = 0.3 + 3.7 * Math.exp(-t / 0.45);
    pc += w;
    pm += w * 3.5;
    out[i] = Math.exp(-t / 0.55) * Math.sin(pc + idx * Math.sin(pm));
  }
  // a quiet octave partial for body
  addMode(out, rate, D5 * 2, 0.12, 0.8);
  fadeEdges(out, 8, Math.round(rate * 0.1));
  return snd(normalize(out, 0.85), D5);
}

/** Vibraphone-like modal bar (1 : 4 : 10) with a 5 Hz tremolo. Root D4. */
function vibes(c: Ctx): Sound {
  const rate = c.rate;
  const out = new Float32Array(len(2.6, rate));
  addMode(out, rate, D4, 1, 1.1, 0, c.rng.range(0, TAU));
  addMode(out, rate, D4 * 4, 0.25, 0.25, 0, c.rng.range(0, TAU));
  addMode(out, rate, D4 * 10, 0.07, 0.06, 0, c.rng.range(0, TAU));
  const strike = new Float32Array(len(0.004, rate));
  whiteNoise(strike, c.rng);
  biquad(strike, 'lowpass', 3000, 0.7, rate);
  mixInto(out, strike, 0, 0.15);
  for (let i = 0; i < out.length; i++) out[i]! *= 1 - 0.2 * (0.5 + 0.5 * Math.sin(TAU * 5 * (i / rate)));
  fadeEdges(out, 8, Math.round(rate * 0.2));
  return snd(normalize(out, 0.85), D4);
}

// ---------------------------------------------------------------- drums

/** Timpani-like boom: a membrane's modes, a 3 % pitch fall over 0.3 s, a felt mallet. Root D2. */
function timp(c: Ctx): Sound {
  const rate = c.rate;
  const n = len(2.6, rate);
  const out = new Float32Array(n);
  const ratios = [1, 1.5, 1.98, 2.44, 2.94];
  const amps = [1, 0.6, 0.45, 0.3, 0.2];
  const decays = [2.5, 1.6, 1.1, 0.8, 0.6];
  for (let m = 0; m < ratios.length; m++) {
    let ph = c.rng.range(0, TAU);
    const f0 = D2 * ratios[m]!;
    const k = 6.9 / decays[m]!;
    for (let i = 0; i < n; i++) {
      const t = i / rate;
      ph += (TAU * f0 * (1 + 0.03 * Math.exp(-t / 0.1))) / rate;
      out[i]! += amps[m]! * Math.exp(-k * t) * Math.sin(ph);
    }
  }
  const felt = new Float32Array(len(0.04, rate));
  whiteNoise(felt, c.rng);
  biquad(felt, 'lowpass', 800, 0.7, rate);
  for (let i = 0; i < felt.length; i++) felt[i]! *= Math.exp(-i / (rate * 0.01));
  mixInto(out, felt, 0, 0.8);
  softClip(out, 1.5);
  fadeEdges(out, 8, Math.round(rate * 0.2));
  return snd(normalize(out), D2);
}

/** Big synth kick: sine 180 to 48 Hz, a click, soft clip for the phone. */
function kickBig(c: Ctx): Sound {
  const rate = c.rate;
  const n = len(0.45, rate);
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    ph += (TAU * (48 + 132 * Math.exp(-t / 0.025))) / rate;
    out[i] = Math.exp(-t / 0.16) * Math.sin(ph);
  }
  const click = new Float32Array(len(0.003, rate));
  whiteNoise(click, c.rng);
  biquad(click, 'highpass', 3000, 0.7, rate);
  mixInto(out, click, 0, 0.3);
  softClip(out, 2.5);
  fadeEdges(out, 4, Math.round(rate * 0.03));
  return snd(normalize(out));
}

/** Gated-reverb snare: two drum modes, a crack, and a dense noise "room" cut hard at 220 ms. */
function snareGated(c: Ctx): Sound {
  const rate = c.rate;
  const n = len(0.26, rate);
  const out = new Float32Array(n);
  addMode(out, rate, 185, 0.8, 0.08);
  addMode(out, rate, 330, 0.5, 0.06);
  const crack = new Float32Array(n);
  whiteNoise(crack, c.rng);
  biquad(crack, 'highpass', 1000, 0.7, rate);
  biquad(crack, 'lowpass', 6000, 0.7, rate);
  const room = new Float32Array(n);
  whiteNoise(room, c.rng);
  biquad(room, 'bandpass', 1800, 0.5, rate);
  const gate = Math.round(0.22 * rate);
  const rel = Math.round(0.015 * rate);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const g = i < gate ? 1 : Math.max(0, 1 - (i - gate) / rel);
    out[i]! += crack[i]! * 0.7 * Math.exp(-t / 0.05) + room[i]! * 0.55 * Math.exp(-t / 0.4) * g;
    if (i >= gate) out[i]! *= g;
  }
  softClip(out, 1.4);
  fadeEdges(out, 4, 8);
  return snd(normalize(out));
}

// ---------------------------------------------------------------- bass

/** Distorted mid bass: saw plus a square an octave up, a plucked filter, tanh drive, band-limited. Root D2. */
function midbass(c: Ctx): Sound {
  const rate = c.rate;
  const n = len(0.6, rate);
  const out = new Float32Array(n);
  addSaw(out, rate, 0.8, () => D2, c.rng.next());
  // square an octave up from two saws (saw(t) - saw(t + 1/2))
  const sq = new Float32Array(n);
  addSaw(sq, rate, 1, () => D2 * 2, 0);
  addSaw(sq, rate, -1, () => D2 * 2, 0.5);
  mixInto(out, sq, 0, 0.25);
  svfSweep(out, rate, 'lp', 1.4, (i) => 400 + 2100 * Math.exp(-i / (rate * 0.03)));
  for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i]! * 4);
  biquad(out, 'highpass', 120, 0.7, rate);
  biquad(out, 'lowpass', 2000, 0.7, rate);
  for (let i = 0; i < n; i++) out[i]! *= Math.exp(-i / (rate * 0.35));
  fadeEdges(out, 16, Math.round(rate * 0.05));
  return snd(normalize(out), D2);
}

export const ORCHESTRA_RECIPES: Record<string, (c: Ctx) => Sound> = {
  brass: (c) => brass(c, 0.03, 2.4),
  brassSwell: (c) => brass(c, 0.18, 3),
  strings,
  bellFM,
  vibes,
  timp,
  kickBig,
  snareGated,
  midbass,
};
