/**
 * The orchestral and band voices (direction v2 Section 4): muted horn, upright bass, chopped string stabs, synth-strings,
 * a soft dark bell, timpani, big synth drums and the distorted mid bass. Rendered once into the library like the found
 * sounds, in pure Float32 DSP, from the library's seeded sub-streams. Every pitched voice is rooted on a D, so a motif note
 * plays at `semis(n)`.
 */
import { addMode, biquad, fadeEdges, len, loopCrossfade, mixInto, normalize, reversed, softClip, svfSweep, whiteNoise } from './dsp';
import type { Sound } from './library';
import type { Rng } from './rng';

const TAU = Math.PI * 2;
const D2 = 73.416;
const D3 = 146.832;
const D4 = 293.665;

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

// ---------------------------------------------------------------- horn

/**
 * Soft, breathy horn (a muted flugel in a far room): mellow additive harmonics falling off as 1/n^2, a slow 220 ms
 * swell with no strike, breath noise riding the tone, a gentle late vibrato and a dark low-pass. No FM, no clipping:
 * nothing in the attack that could read as a hammer. Root D3.
 */
function horn(c: Ctx): Sound {
  const rate = c.rate;
  const sec = 2.6;
  const n = len(sec, rate);
  const attack = 0.22;
  const env = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    // a smooth (raised-cosine) swell, then a slow fade
    const a = t < attack ? 0.5 - 0.5 * Math.cos((Math.PI * t) / attack) : 1;
    env[i] = a * (1 - 0.3 * Math.min(1, t / sec));
  }
  const out = new Float32Array(n);
  const amps = [1, 0.32, 0.14, 0.07, 0.035, 0.018];
  const phases = amps.map(() => c.rng.range(0, TAU));
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const vib = t > 0.6 ? 6 * Math.min(1, (t - 0.6) / 0.6) * Math.sin(TAU * 4.8 * t) : 0;
    ph += (TAU * D3 * cents(vib)) / rate;
    let s = 0;
    for (let k = 0; k < amps.length; k++) s += amps[k]! * Math.sin((k + 1) * ph + phases[k]!);
    out[i] = s;
  }
  // breath: band-passed noise following the tone's envelope, a little stronger on the swell
  const breath = new Float32Array(n);
  whiteNoise(breath, c.rng);
  biquad(breath, 'bandpass', 900, 0.8, rate);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    out[i] = (out[i]! + breath[i]! * (0.05 + 0.08 * Math.exp(-t / 0.3))) * env[i]!;
  }
  biquad(out, 'lowpass', 1100, 0.6, rate);
  fadeEdges(out, 16, Math.round(rate * 0.3));
  return snd(normalize(out, 0.7), D3);
}

// ---------------------------------------------------------------- upright bass

/**
 * Soft plucked double bass (Karplus-Strong), played with the flesh of the finger: a dark, low-passed excitation in a
 * delay line with a damping filter, a gentle 3 ms onset (no click), a warm body resonance, and a low-pass at 700 Hz.
 * Root D2; the figure's bass voice.
 */
function upright(c: Ctx): Sound {
  const rate = c.rate;
  const n = len(1.8, rate);
  const out = new Float32Array(n);
  // integer delay: within 3 cents of D2 at 48 kHz
  const p = Math.round(rate / D2);
  const line = new Float32Array(p);
  // excitation: noise low-passed twice (a soft finger, not a pick), then smoothed into a single hump
  let lp1 = 0;
  let lp2 = 0;
  for (let i = 0; i < p; i++) {
    lp1 += 0.15 * (c.rng.next() * 2 - 1 - lp1);
    lp2 += 0.15 * (lp1 - lp2);
    line[i] = lp2 * 6 * Math.sin((Math.PI * i) / p);
  }
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const y = line[idx]!;
    // damping: an averaging low-pass plus a loss per pass (about 1.6 s to -60 dB at D2)
    line[idx] = 0.945 * 0.5 * (y + line[(idx + 1) % p]!);
    idx = (idx + 1) % p;
    out[i] = y;
  }
  biquad(out, 'peaking', 95, 1.2, rate, 3);
  biquad(out, 'lowpass', 700, 0.6, rate);
  biquad(out, 'highpass', 40, 0.7, rate);
  // a gentle onset: no click
  const on = Math.round(rate * 0.003);
  for (let i = 0; i < on; i++) out[i]! *= i / on;
  softClip(out, 1.15);
  fadeEdges(out, 0, Math.round(rate * 0.2));
  return snd(normalize(out, 0.8), D2);
}

// ---------------------------------------------------------------- string stab

/**
 * A chopped string-section stab, as if cut from an old orchestral record and pitched down: an open fifth with the
 * octave (D3 A3 D4), a soft 12 ms attack, short decay, dark, lightly crushed to 12 bits. `swell` is a longer one,
 * reversed, so it rises into a downbeat.
 */
function stabData(c: Ctx, sec: number, decay: number): Float32Array {
  const rate = c.rate;
  const n = len(sec, rate);
  const out = new Float32Array(n);
  for (const [mul, amp] of [[1, 1], [1.4983, 0.7], [2, 0.55]] as const) {
    for (let v = 0; v < 4; v++) {
      const det = -10 + (20 * v) / 3;
      addSaw(out, rate, amp / 4, () => D3 * mul * cents(det), c.rng.next());
    }
  }
  svfSweep(out, rate, 'lp', 0.8, (i) => 550 + 650 * Math.exp(-i / (rate * 0.08)));
  biquad(out, 'highpass', 110, 0.7, rate);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    out[i]! *= Math.min(1, t / 0.012) * Math.exp(-t / decay);
  }
  // the "sampled" grain: 12 bits, held every second sample
  const levels = 2048;
  for (let i = 0; i < n; i += 2) {
    const q = Math.round(out[i]! * levels) / levels;
    out[i] = q;
    if (i + 1 < n) out[i + 1] = q;
  }
  biquad(out, 'lowpass', 3000, 0.7, rate);
  softClip(out, 1.15);
  fadeEdges(out, 8, Math.round(rate * 0.05));
  return normalize(out, 0.85);
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

// ---------------------------------------------------------------- dark bell

/**
 * A soft, dark bell for distant fragments: harmonic FM (1:2) with a low index, a gentle 6 ms attack and a low-pass, so it
 * reads as a far-off tone rather than a strike. Root D4.
 */
function darkbell(c: Ctx): Sound {
  const rate = c.rate;
  const n = len(2.6, rate);
  const out = new Float32Array(n);
  const w = (TAU * D4) / rate;
  let pc = 0;
  let pm = c.rng.range(0, TAU);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const idx = 0.1 + 1.1 * Math.exp(-t / 0.3);
    pc += w;
    pm += w * 2;
    out[i] = Math.min(1, t / 0.006) * Math.exp(-t / 0.7) * Math.sin(pc + idx * Math.sin(pm));
  }
  biquad(out, 'lowpass', 1800, 0.7, rate);
  fadeEdges(out, 8, Math.round(rate * 0.2));
  return snd(normalize(out, 0.7), D4);
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
  horn,
  upright,
  stab: (c) => snd(stabData(c, 0.6, 0.15), D3),
  swell: (c) => snd(reversed(stabData(c, 1.6, 0.45)), D3),
  darkbell,
  strings,
  timp,
  kickBig,
  snareGated,
  midbass,
};
