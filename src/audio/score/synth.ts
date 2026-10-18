import { addMode, biquad, bitcrush, len, normalize, softClip, svfSweep, whiteNoise, brownNoise, pinkNoise, reversed } from '../music/dsp';
import type { Rng } from '../music/rng';
import type { Hit } from './arrange';

/**
 * Pure PCM generators for the V4 score (no Web Audio, so they run and test in node): the break kit and percussion
 * hits, the plucked double bass, and the noise beds. `render.ts` wraps them in AudioBuffers once per offline render.
 */

const TAU = Math.PI * 2;

function env(out: Float32Array, rate: number, attack: number, decay: number): void {
  const a = Math.max(1, attack * rate);
  const k = 1 / Math.max(1e-4, decay * rate);
  for (let i = 0; i < out.length; i++) out[i]! *= (i < a ? i / a : 1) * Math.exp(-Math.max(0, i - a) * k);
}

function noise(n: number, rng: Rng): Float32Array {
  const b = new Float32Array(n);
  whiteNoise(b, rng);
  return b;
}

/** A pitch-swept sine (kick and drum bodies): f(t) = f1 + (f0 - f1) * exp(-t / sweep). */
function sweptSine(out: Float32Array, rate: number, f0: number, f1: number, sweep: number, amp: number, decay: number): void {
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / rate;
    ph += (TAU * (f1 + (f0 - f1) * Math.exp(-t / sweep))) / rate;
    out[i]! += Math.sin(ph) * amp * Math.exp(-t / decay) * Math.min(1, i / (0.001 * rate));
  }
}

/** Six detuned square waves (the classic metallic hat source). */
function metallic(out: Float32Array, rate: number, base: number, amp: number): void {
  const ratios = [1, 1.483, 1.8, 2.546, 2.63, 3.897];
  for (const r of ratios) {
    const f = base * r;
    for (let i = 0; i < out.length; i++) out[i]! += (Math.sin((TAU * f * i) / rate) >= 0 ? 1 : -1) * amp;
  }
}

/** One percussion hit, rendered at `rate`. Levels are set so the kit balances at equal velocities. */
export function makeHit(h: Hit, rate: number, rng: Rng): Float32Array {
  const nyq = rate / 2 - 200;
  switch (h) {
    case 'kick': {
      const out = new Float32Array(len(0.55, rate));
      sweptSine(out, rate, 150, 46, 0.032, 1, 0.3);
      const click = noise(len(0.01, rate), rng);
      biquad(click, 'lowpass', Math.min(4000, nyq), 0.7, rate);
      env(click, rate, 0.0005, 0.003);
      for (let i = 0; i < click.length; i++) out[i]! += click[i]! * 0.35;
      softClip(out, 1.8);
      return normalize(out, 0.95);
    }
    case 'snare':
    case 'ghost': {
      const ghost = h === 'ghost';
      const out = new Float32Array(len(ghost ? 0.22 : 0.42, rate));
      sweptSine(out, rate, 230, 182, 0.012, 0.55, ghost ? 0.03 : 0.06);
      for (let i = 0; i < out.length; i++) out[i]! += Math.sin((TAU * 334 * i) / rate) * 0.22 * Math.exp(-i / (0.04 * rate));
      const n = noise(out.length, rng);
      biquad(n, 'highpass', 900, 0.7, rate);
      biquad(n, 'lowpass', Math.min(8000, nyq), 0.7, rate);
      env(n, rate, 0.001, ghost ? 0.05 : 0.14);
      for (let i = 0; i < out.length; i++) out[i]! += n[i]! * 0.85;
      softClip(out, 2.4);
      bitcrush(out, 10, rate > 30000 ? 2 : 1);
      return normalize(out, ghost ? 0.42 : 0.9);
    }
    case 'hat':
    case 'ohat': {
      const open = h === 'ohat';
      const out = new Float32Array(len(open ? 0.6 : 0.12, rate));
      metallic(out, rate, 410, 0.12);
      const n = noise(out.length, rng);
      for (let i = 0; i < out.length; i++) out[i]! += n[i]! * 0.5;
      biquad(out, 'highpass', Math.min(7000, nyq * 0.6), 0.7, rate);
      biquad(out, 'peaking', Math.min(10000, nyq * 0.8), 1, rate, 4);
      env(out, rate, 0.0008, open ? 0.24 : 0.028);
      bitcrush(out, 11, 1);
      return normalize(out, open ? 0.45 : 0.55);
    }
    case 'rim': {
      const out = new Float32Array(len(0.12, rate));
      for (let i = 0; i < out.length; i++) {
        const t = i / rate;
        out[i] = Math.sin(TAU * 1650 * t) * Math.exp(-t / 0.011) + Math.sin(TAU * 480 * t) * 0.6 * Math.exp(-t / 0.03);
      }
      const n = noise(out.length, rng);
      biquad(n, 'highpass', 2000, 0.7, rate);
      env(n, rate, 0.0003, 0.004);
      for (let i = 0; i < out.length; i++) out[i]! += n[i]! * 0.4;
      return normalize(out, 0.55);
    }
    case 'shaker': {
      const out = noise(len(0.14, rate), rng);
      biquad(out, 'bandpass', Math.min(6500, nyq * 0.7), 0.8, rate);
      env(out, rate, 0.007, 0.05);
      return normalize(out, 0.42);
    }
    case 'brush': {
      const out = noise(len(0.35, rate), rng);
      biquad(out, 'lowpass', Math.min(6000, nyq), 0.7, rate);
      biquad(out, 'highpass', 1400, 0.7, rate);
      env(out, rate, 0.016, 0.11);
      return normalize(out, 0.5);
    }
    case 'taiko': {
      const out = new Float32Array(len(1.8, rate));
      sweptSine(out, rate, 105, 60, 0.03, 1, 0.55);
      sweptSine(out, rate, 160, 95, 0.03, 0.3, 0.25);
      sweptSine(out, rate, 220, 128, 0.02, 0.12, 0.12);
      const skin = noise(len(0.12, rate), rng);
      biquad(skin, 'lowpass', 1200, 0.7, rate);
      env(skin, rate, 0.0005, 0.025);
      for (let i = 0; i < skin.length; i++) out[i]! += skin[i]! * 0.6;
      softClip(out, 1.4);
      return normalize(out, 0.95);
    }
    case 'metal': {
      // a struck pipe: non-harmonic partials of a free bar
      const out = new Float32Array(len(3, rate));
      const ratios = [1, 2.76, 5.4, 8.93, 13.34];
      const amps = [1, 0.6, 0.4, 0.25, 0.15];
      const decs = [2.4, 1.6, 1.0, 0.6, 0.35];
      for (let k = 0; k < ratios.length; k++) {
        const f = 196 * ratios[k]!;
        if (f < nyq) addMode(out, rate, f, amps[k]!, decs[k]!, 0, rng.next() * TAU);
      }
      const n = noise(len(0.01, rate), rng);
      biquad(n, 'bandpass', Math.min(3000, nyq), 1, rate);
      for (let i = 0; i < n.length; i++) out[i]! += n[i]! * 0.5 * (1 - i / n.length);
      return normalize(out, 0.7);
    }
    case 'plate': {
      const out = new Float32Array(len(2.5, rate));
      const ratios = [1, 1.47, 2.09, 2.56, 3.42, 4.1];
      for (let k = 0; k < ratios.length; k++) {
        const f = 410 * ratios[k]!;
        if (f < nyq) addMode(out, rate, f, 1 / (1 + k * 0.6), 1.6 / (1 + k * 0.5), 0, rng.next() * TAU);
      }
      return normalize(out, 0.6);
    }
    case 'crash': {
      const out = new Float32Array(len(2.4, rate));
      metallic(out, rate, 520, 0.08);
      const n = noise(out.length, rng);
      for (let i = 0; i < out.length; i++) out[i]! += n[i]! * 0.6;
      biquad(out, 'highpass', 3500, 0.7, rate);
      env(out, rate, 0.002, 0.65);
      bitcrush(out, 11, 1);
      return normalize(out, 0.55);
    }
  }
}

/**
 * A plucked double bass: a soft, low-passed finger excitation in a tuned delay loop (two-point average gives the
 * damping; linear interpolation keeps fractional periods in tune), a little thump at the fundamental, a body bump.
 */
export function pluck(rate: number, f: number, rng: Rng, seconds = 2.2, t60 = 1.8, bright = 0.35, lpHz = 1800, bodyHz = 110): Float32Array {
  const n = len(seconds, rate);
  const out = new Float32Array(n);
  const P = rate / f;
  const g = Math.pow(10, -3 / (t60 * f));
  // excitation: one period of noise, low-passed (darker for low `bright`), plucked a fifth of the way along the string
  const ex = new Float32Array(Math.ceil(P) + 2);
  whiteNoise(ex, rng);
  let lp = 0;
  const c = 0.08 + bright * 0.5;
  for (let i = 0; i < ex.length; i++) {
    lp += c * (ex[i]! - lp);
    ex[i] = lp;
  }
  const off = Math.max(1, Math.round(P * 0.2));
  for (let i = ex.length - 1; i >= off; i--) ex[i] = ex[i]! - ex[i - off]! * 0.8;
  const read = (pos: number): number => {
    if (pos < 0) return 0;
    const j = Math.floor(pos);
    const fr = pos - j;
    return (out[j] ?? 0) * (1 - fr) + (out[j + 1] ?? 0) * fr;
  };
  for (let i = 0; i < n; i++) {
    const e = i < ex.length ? ex[i]! * 0.9 : 0;
    const fb = i >= P ? 0.5 * (read(i - P + 0.5) + read(i - P - 0.5)) * g : 0;
    out[i] = e + fb;
  }
  // finger thump at the fundamental (felt on small speakers through the body bump)
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    out[i]! += Math.sin(TAU * f * t) * 0.35 * Math.exp(-t / 0.09) * Math.min(1, t / 0.003);
  }
  biquad(out, 'peaking', bodyHz, 1.2, rate, 3);
  biquad(out, 'lowpass', Math.min(rate / 2 - 300, lpHz), 0.7, rate);
  for (let i = 0; i < Math.min(n, len(0.002, rate)); i++) out[i]! *= i / len(0.002, rate);
  return normalize(out, 0.85);
}

/** A band-limited (polyBLEP) sawtooth added into `out`. */
function saw(out: Float32Array, rate: number, f: number, amp: number, phase: number): void {
  const dt = f / rate;
  let ph = phase;
  for (let i = 0; i < out.length; i++) {
    let v = 2 * ph - 1;
    if (ph < dt) {
      const x = ph / dt;
      v -= x + x - x * x - 1;
    } else if (ph > 1 - dt) {
      const x = (ph - 1) / dt;
      v -= x * x + x + x + 1;
    }
    out[i]! += v * amp;
    ph += dt;
    if (ph >= 1) ph -= 1;
  }
}

/**
 * A short (spiccato) string-section note: three detuned saws and a little bow noise through a 24 dB low-pass that
 * snaps open on the attack, a 6 ms attack and a fast decay. Peak about 0.5, like the live string voice.
 */
export function spiccato(rate: number, f: number, rng: Rng): Float32Array {
  const out = new Float32Array(len(0.45, rate));
  for (const c of [-7, 0, 6]) saw(out, rate, f * Math.pow(2, (c + (rng.next() - 0.5) * 3) / 1200), 1 / 3, rng.next());
  const bow = noise(out.length, rng);
  biquad(bow, 'bandpass', Math.min(5000, f * 4), 1.2, rate);
  for (let i = 0; i < out.length; i++) out[i]! += bow[i]! * 0.12;
  const cut = Math.min(3500, 600 + f * 5);
  const sweep = (i: number): number => cut * (1 + 0.8 * Math.exp(-i / (0.03 * rate)));
  svfSweep(out, rate, 'lp', 0.7, sweep);
  svfSweep(out, rate, 'lp', 0.7, (i) => sweep(i) * 1.3);
  const a = 0.006 * rate;
  for (let i = 0; i < out.length; i++) out[i]! *= 0.5 * (i < a ? i / a : Math.exp(-(i - a) / (0.08 * rate)));
  return out;
}

/**
 * A dark electric piano (tine and tone bar): a two-operator FM voice whose brightness falls fast after the strike, a
 * soft bell ping on the attack, a little bark, slightly driven. About 2.8 s.
 */
export function rhodes(rate: number, f: number, rng: Rng): Float32Array {
  const out = new Float32Array(len(2.8, rate));
  const ph = rng.next() * TAU;
  const decay = 1.4 * Math.pow(220 / f, 0.3);
  const ping = f * 14.3 < rate * 0.45;
  for (let i = 0; i < out.length; i++) {
    const t = i / rate;
    const index = 1.8 * Math.exp(-t / 0.18) + 0.35;
    const mod = Math.sin(TAU * f * t + ph);
    let v = Math.sin(TAU * f * t + index * mod);
    v += Math.sin(TAU * 2 * f * t) * 0.1 * Math.exp(-t / 0.35);
    if (ping) v += Math.sin(TAU * f * 14.3 * t) * 0.12 * Math.exp(-t / 0.015);
    out[i] = v * Math.exp(-t / decay) * Math.min(1, t / 0.002);
  }
  softClip(out, 1.4);
  biquad(out, 'lowpass', Math.min(4500, rate / 2 - 300), 0.7, rate);
  return normalize(out, 0.8);
}

/** Loopable noise beds. */
export function noiseBed(kind: 'white' | 'pink' | 'brown', seconds: number, rate: number, rng: Rng): Float32Array {
  const out = new Float32Array(len(seconds, rate));
  if (kind === 'white') whiteNoise(out, rng);
  else if (kind === 'pink') pinkNoise(out, rng);
  else brownNoise(out, rng);
  return normalize(out, 0.9);
}

/** Vinyl crackle: sparse clicks of varied size, high-passed. */
export function crackle(seconds: number, rate: number, rng: Rng): Float32Array {
  const out = new Float32Array(len(seconds, rate));
  const count = Math.round(seconds * 22);
  for (let k = 0; k < count; k++) {
    const at = rng.int(out.length - 40);
    const big = rng.chance(0.12);
    const a = (big ? 0.9 : 0.25) * rng.range(0.4, 1) * (rng.chance(0.5) ? 1 : -1);
    const l = big ? 24 : 6;
    for (let i = 0; i < l; i++) out[at + i]! += a * Math.exp(-i / (l / 3)) * (i % 2 ? -0.6 : 1);
  }
  biquad(out, 'highpass', 1500, 0.7, rate);
  biquad(out, 'lowpass', Math.min(9000, rate / 2 - 300), 0.7, rate);
  return normalize(out, 0.8);
}

/** A reversed cymbal wash (the classic swell into a downbeat), `seconds` long, peaking at its end. */
export function reverseCymbal(seconds: number, rate: number, rng: Rng): Float32Array {
  const out = noise(len(seconds, rate), rng);
  biquad(out, 'highpass', 3000, 0.7, rate);
  biquad(out, 'peaking', Math.min(7000, rate / 2 - 500), 1, rate, 3);
  env(out, rate, 0.001, seconds * 0.35);
  return reversed(out);
}

/** Gated loudness (dBFS): mean power of the 0.4 s blocks within 30 dB of the loudest block; silence does not count. */
export function gatedDb(channels: Float32Array[], rate: number): number {
  const block = Math.max(1, Math.round(rate * 0.4));
  const n = channels[0]?.length ?? 0;
  const powers: number[] = [];
  for (let s = 0; s < n; s += block) {
    let e = 0;
    let c = 0;
    for (const ch of channels) {
      const end = Math.min(n, s + block);
      for (let i = s; i < end; i++) e += ch[i]! * ch[i]!;
      c += end - s;
    }
    powers.push(e / Math.max(1, c));
  }
  const max = Math.max(...powers, 1e-12);
  const gated = powers.filter((p) => p > max * 1e-3 && p > 1e-9);
  if (!gated.length) return -120;
  const mean = gated.reduce((a, b) => a + b, 0) / gated.length;
  return 10 * Math.log10(mean);
}
