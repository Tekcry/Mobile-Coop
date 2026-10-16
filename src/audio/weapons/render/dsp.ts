/**
 * Offline signal work for the weapon sprite (pure, run by `npm run sfx:render-weapons`, unit-tested): WAV reading,
 * resampling, filters, shot cutting, the suppressed shot and the modelled brass and crossbow.
 */
import type { Rng } from '../../music/rng';
import { envelope, fadeOut, peakOf } from '../../foley/render/process';

export const RATE = 48000;

/** A PCM WAV (16, 24 or 32 bit, or 32-bit float) as mono Float32 (channels averaged) and its rate. */
export function readWav(b: Uint8Array): { s: Float32Array; rate: number } {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const tag = (o: number): string => String.fromCharCode(b[o]!, b[o + 1]!, b[o + 2]!, b[o + 3]!);
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('not a WAV');
  let o = 12;
  let ch = 0;
  let rate = 0;
  let bits = 0;
  let fmt = 0;
  let data = -1;
  let size = 0;
  while (o + 8 <= b.length) {
    const id = tag(o);
    const sz = v.getUint32(o + 4, true);
    if (id === 'fmt ') {
      fmt = v.getUint16(o + 8, true);
      ch = v.getUint16(o + 10, true);
      rate = v.getUint32(o + 12, true);
      bits = v.getUint16(o + 22, true);
    } else if (id === 'data') {
      data = o + 8;
      size = Math.min(sz, b.length - data);
      break;
    }
    o += 8 + sz + (sz & 1);
  }
  if (data < 0 || !ch) throw new Error('WAV without fmt or data');
  const bps = bits / 8;
  const n = Math.floor(size / (bps * ch));
  const s = new Float32Array(n);
  const float = fmt === 3;
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let c = 0; c < ch; c++) {
      const q = data + (i * ch + c) * bps;
      let x: number;
      if (bits === 16) x = v.getInt16(q, true) / 32768;
      else if (bits === 24) {
        let w = b[q]! | (b[q + 1]! << 8) | (b[q + 2]! << 16);
        if (w & 0x800000) w |= ~0xffffff;
        x = w / 8388608;
      } else if (float) x = v.getFloat32(q, true);
      else x = v.getInt32(q, true) / 2147483648;
      acc += x;
    }
    s[i] = acc / ch;
  }
  return { s, rate };
}

/** RBJ biquad, run in place. */
export function biquad(s: Float32Array, rate: number, type: 'lowpass' | 'highpass' | 'bandpass', f: number, q = 0.707): Float32Array {
  const w = (2 * Math.PI * Math.min(f, rate * 0.49)) / rate;
  const cw = Math.cos(w);
  const al = Math.sin(w) / (2 * q);
  let b0: number;
  let b1: number;
  let b2: number;
  if (type === 'lowpass') {
    b0 = (1 - cw) / 2;
    b1 = 1 - cw;
    b2 = b0;
  } else if (type === 'highpass') {
    b0 = (1 + cw) / 2;
    b1 = -(1 + cw);
    b2 = b0;
  } else {
    b0 = al;
    b1 = 0;
    b2 = -al;
  }
  const a0 = 1 + al;
  const a1 = -2 * cw;
  const a2 = 1 - al;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < s.length; i++) {
    const x = s[i]!;
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    s[i] = y;
  }
  return s;
}

/** Resample to `to` Hz: low-passed first when going down, then linear interpolation. */
export function resample(s: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return s.slice();
  let x = s.slice();
  if (to < from) {
    biquad(x, from, 'lowpass', to * 0.45);
    biquad(x, from, 'lowpass', to * 0.45);
  }
  const n = Math.floor((x.length * to) / from);
  const out = new Float32Array(n);
  const k = from / to;
  for (let i = 0; i < n; i++) {
    const p = i * k;
    const j = Math.floor(p);
    const f = p - j;
    out[i] = (x[j] ?? 0) * (1 - f) + (x[j + 1] ?? x[j] ?? 0) * f;
  }
  x = out;
  return x;
}

/** Shot onsets (s): a 5 ms frame above `minRel` of the peak that jumps `rise` times over the 20 ms before it. */
export function shotOnsets(s: Float32Array, rate: number, minRel = 0.25, rise = 2.5, minGap = 0.04): { t: number; level: number }[] {
  const hop = Math.round(rate * 0.005);
  const env = envelope(s, hop);
  const pk = peakOf(s);
  const out: { t: number; level: number }[] = [];
  for (let k = 4; k < env.length; k++) {
    let prev = 0;
    for (let q = k - 4; q < k; q++) prev = Math.max(prev, env[q]!);
    const t = (k * hop) / rate;
    if (env[k]! > minRel * pk && env[k]! > rise * prev && (out.length === 0 || t - out[out.length - 1]!.t >= minGap)) out.push({ t, level: env[k]! });
  }
  return out;
}

/**
 * The shots in a recording worth a take each: onsets grouped into clusters (closer than `cluster` s). A single-shot
 * file gives each cluster's first onset (the rest are its echoes); a burst gives each cluster's last strong onset (the
 * last round, whose tail rings out). Each shot runs to the next cluster (or `maxDur`).
 */
export function pickShots(s: Float32Array, rate: number, burst: boolean, maxDur: number, cluster = 0.6): [start: number, end: number][] {
  const on = shotOnsets(s, rate);
  const groups: { t: number; level: number }[][] = [];
  for (const o of on) {
    const g = groups[groups.length - 1];
    if (g && o.t - g[g.length - 1]!.t < cluster) g.push(o);
    else groups.push([o]);
  }
  const out: [number, number][] = [];
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i]!;
    let pick = g[0]!;
    if (burst) {
      const top = Math.max(...g.map((x) => x.level));
      for (const x of g) if (x.level >= top * 0.5) pick = x;
    }
    const next = groups[i + 1]?.[0]?.t ?? s.length / rate;
    const start = Math.max(0, pick.t - 0.006);
    out.push([start, Math.min(start + maxDur, next - 0.03)]);
  }
  return out;
}

/** The slice [a, b) s, with its sound trimmed at -50 dB under its peak and a fade out. */
export function cut(s: Float32Array, rate: number, a: number, b: number, fade = 0.15): Float32Array {
  const x = s.slice(Math.round(a * rate), Math.round(b * rate));
  const pk = peakOf(x);
  const hop = Math.round(rate * 0.005);
  const env = envelope(x, hop);
  let k = env.length - 1;
  while (k > 0 && env[k]! < pk * 0.0032) k--;
  const y = x.slice(0, Math.min(x.length, (k + 2) * hop));
  fadeOut(y, rate, Math.min(fade, (y.length / rate) * 0.4));
  return y;
}

/** RMS over the loudest `win` s window (the shot's body). */
export function bodyRms(s: Float32Array, rate: number, win = 0.15): number {
  const n = Math.min(s.length, Math.round(win * rate));
  let acc = 0;
  for (let i = 0; i < n; i++) acc += s[i]! * s[i]!;
  return Math.sqrt(acc / Math.max(1, n));
}

/** Scale every take of a bank by one factor so their mean body RMS hits `rms` (dB), peaks kept under `peak`. */
export function levelBank(takes: Float32Array[], rate: number, rmsDb: number, peak: number): void {
  if (!takes.length) return;
  let mean = 0;
  for (const t of takes) mean += bodyRms(t, rate);
  mean /= takes.length;
  let k = Math.pow(10, rmsDb / 20) / Math.max(1e-6, mean);
  let pk = 0;
  for (const t of takes) pk = Math.max(pk, peakOf(t));
  k = Math.min(k, peak / Math.max(1e-6, pk));
  for (const t of takes) for (let i = 0; i < t.length; i++) t[i] = t[i]! * k;
}

/** Add `src` x `gain` into `dst` from `at` s (clipped to dst). */
export function mixInto(dst: Float32Array, src: Float32Array, rate: number, at: number, gain: number): void {
  const o = Math.round(at * rate);
  for (let i = 0; i < src.length && o + i < dst.length; i++) if (o + i >= 0) dst[o + i] = dst[o + i]! + src[i]! * gain;
}

export interface SdSpec {
  /** Body low-pass (Hz). */
  lowpass: number;
  /** Body decay after the first 4 ms (s). */
  tau: number;
  /** Gas puff level against the body. */
  puff: number;
  /** Mechanism (slide or bolt clack) level against the body, and its delay (s). */
  mech: number;
  mechAt: number;
}

export const SD_SPECS: Record<'sdPistol' | 'sdSmg' | 'sdRifle' | 'sdHeavy', SdSpec> = {
  sdPistol: { lowpass: 1700, tau: 0.028, puff: 0.35, mech: 0.85, mechAt: 0.006 },
  sdSmg: { lowpass: 1500, tau: 0.032, puff: 0.3, mech: 0.6, mechAt: 0.005 },
  sdRifle: { lowpass: 1300, tau: 0.04, puff: 0.32, mech: 0.55, mechAt: 0.007 },
  sdHeavy: { lowpass: 1100, tau: 0.055, puff: 0.3, mech: 0.5, mechAt: 0.009 },
};

/**
 * A suppressed shot from a near take: the blast and its outdoor tail cut away (a fast decay after 4 ms), the body
 * low-passed into a dull thump, a short burst of gas, the action's clack on top, and a few early reflections so it
 * sits in a room rather than a field.
 */
export function suppress(shot: Float32Array, mech: Float32Array, spec: SdSpec, rng: Rng, rate = RATE): Float32Array {
  const len = Math.min(shot.length, Math.round(0.32 * rate));
  const body = shot.slice(0, len);
  biquad(body, rate, 'highpass', 110);
  biquad(body, rate, 'lowpass', spec.lowpass, 0.6);
  biquad(body, rate, 'lowpass', spec.lowpass * 1.4, 0.6);
  const h = Math.round(0.004 * rate);
  for (let i = h; i < len; i++) body[i] = body[i]! * Math.exp(-(i - h) / (spec.tau * rate));
  const bp = peakOf(body) || 1;
  const out = new Float32Array(len);
  mixInto(out, body, rate, 0, 1);
  // the gas: band-passed noise, a few ms
  const puff = new Float32Array(Math.round(0.06 * rate));
  for (let i = 0; i < puff.length; i++) puff[i] = (rng.next() * 2 - 1) * Math.exp(-i / (0.014 * rate));
  biquad(puff, rate, 'bandpass', 2600, 0.9);
  mixInto(out, puff, rate, 0.001, (spec.puff * bp) / (peakOf(puff) || 1));
  mixInto(out, mech, rate, spec.mechAt, (spec.mech * bp) / (peakOf(mech) || 1));
  // early reflections (a room, not a field)
  const dry = out.slice();
  biquad(dry, rate, 'lowpass', 3000);
  const refl: [number, number][] = [
    [0.009, 0.28],
    [0.017, 0.2],
    [0.029, 0.14],
    [0.043, 0.09],
  ];
  for (const [d, g] of refl) mixInto(out, dry, rate, d, g * rng.jitter(0.15));
  fadeOut(out, rate, 0.08);
  return out;
}

export interface CaseSpec {
  /** Lowest ring (Hz, range) and the other modes as ratios with their levels. */
  base: [number, number];
  ratios: number[];
  amps: number[];
  /** Ring decay (s). */
  tau: number;
  bounces: [number, number];
  /** First bounce gap (s, range). */
  gap: [number, number];
  /** Contact click level. */
  click: number;
}

export const CASE_SPECS: Record<'pistol' | 'rifle' | 'shell', CaseSpec> = {
  pistol: { base: [4800, 5900], ratios: [1, 1.48, 2.13, 2.92], amps: [1, 0.6, 0.38, 0.2], tau: 0.05, bounces: [4, 6], gap: [0.1, 0.15], click: 0.5 },
  rifle: { base: [2900, 3700], ratios: [1, 1.55, 2.31, 3.2], amps: [1, 0.7, 0.48, 0.28], tau: 0.085, bounces: [4, 6], gap: [0.11, 0.17], click: 0.45 },
  shell: { base: [850, 1300], ratios: [1, 2.21, 3.43], amps: [1, 0.45, 0.2], tau: 0.014, bounces: [3, 4], gap: [0.08, 0.12], click: 1.1 },
};

/** Brass (or a shell) dropping and bouncing on a floor: modal rings per bounce, a contact click, the floor's own colour. */
export function casing(spec: CaseSpec, floor: 'hard' | 'metal' | 'wood', rng: Rng, rate = RATE): Float32Array {
  const out = new Float32Array(Math.round(1.1 * rate));
  const base = rng.range(spec.base[0], spec.base[1]);
  const tauK = floor === 'metal' ? 1.35 : floor === 'wood' ? 0.55 : 0.9;
  const n = Math.round(rng.range(spec.bounces[0], spec.bounces[1] + 0.99));
  let t = 0.005;
  let gap = rng.range(spec.gap[0], spec.gap[1]);
  let a = 1;
  for (let b = 0; b < n; b++) {
    hit(out, rate, t, a * rng.range(0.7, 1), base * rng.jitter(0.02), spec, tauK, floor, rng);
    t += gap;
    gap *= rng.range(0.55, 0.72);
    a *= rng.range(0.42, 0.62);
  }
  // brass sometimes rolls to a stop: a run of tiny ticks
  if (spec !== CASE_SPECS.shell && rng.chance(0.5)) {
    const m = 5 + rng.int(6);
    for (let i = 0; i < m; i++) {
      hit(out, rate, t, a * rng.range(0.15, 0.35), base * rng.jitter(0.03), spec, tauK * 0.4, floor, rng);
      t += rng.range(0.012, 0.022);
    }
  }
  if (floor === 'wood') biquad(out, rate, 'lowpass', 6500);
  const end = Math.min(out.length, Math.round((t + 0.25) * rate));
  const y = out.slice(0, end);
  fadeOut(y, rate, 0.06);
  return y;
}

function hit(out: Float32Array, rate: number, t: number, a: number, base: number, spec: CaseSpec, tauK: number, floor: 'hard' | 'metal' | 'wood', rng: Rng): void {
  const o = Math.round(t * rate);
  const n = Math.round(0.35 * rate);
  for (let m = 0; m < spec.ratios.length; m++) {
    const f = base * spec.ratios[m]! * rng.jitter(0.01);
    const tau = spec.tau * tauK * (1 - m * 0.12);
    const amp = a * spec.amps[m]! * rng.range(0.6, 1);
    const ph = rng.next() * Math.PI * 2;
    const w = (2 * Math.PI * f) / rate;
    for (let i = 0; i < n && o + i < out.length; i++) out[o + i] = out[o + i]! + amp * Math.sin(ph + w * i) * Math.exp(-i / (tau * rate));
  }
  // contact click
  const cl = new Float32Array(Math.round(0.006 * rate));
  for (let i = 0; i < cl.length; i++) cl[i] = (rng.next() * 2 - 1) * Math.exp(-i / (0.0012 * rate));
  biquad(cl, rate, 'highpass', floor === 'wood' ? 900 : 2000);
  mixInto(out, cl, rate, t, a * spec.click * (floor === 'wood' ? 0.6 : 1));
  if (floor === 'metal') {
    // the deck plate answers
    const fl = [720, 1650, 2870];
    for (let k = 0; k < fl.length; k++) {
      const w = (2 * Math.PI * fl[k]! * rng.jitter(0.03)) / rate;
      for (let i = 0; i < n && o + i < out.length; i++) out[o + i] = out[o + i]! + a * 0.18 * Math.sin(w * i) * Math.exp(-i / (0.09 * rate));
    }
  } else if (floor === 'wood') {
    const kn = new Float32Array(Math.round(0.06 * rate));
    for (let i = 0; i < kn.length; i++) kn[i] = (rng.next() * 2 - 1) * Math.exp(-i / (0.012 * rate));
    biquad(kn, rate, 'bandpass', rng.range(500, 800), 1.4);
    mixInto(out, kn, rate, t, a * 1.6);
  }
}

/** The crossbow: the string's twang, the limbs' thunk, the bolt leaving (a short whoosh). */
export function bow(rng: Rng, rate = RATE): Float32Array {
  const n = Math.round(0.45 * rate);
  const out = new Float32Array(n);
  const f0 = rng.range(105, 125);
  for (let h = 1; h <= 7; h++) {
    const amp = 0.6 / h;
    const tau = 0.12 / Math.sqrt(h);
    let ph = rng.next() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const t = i / rate;
      // the string's pitch sags a touch as it settles
      ph += (2 * Math.PI * f0 * h * (1 + 0.04 * Math.exp(-t / 0.02))) / rate;
      out[i] = out[i]! + amp * Math.sin(ph) * Math.exp(-t / tau);
    }
  }
  const thunk = new Float32Array(Math.round(0.08 * rate));
  for (let i = 0; i < thunk.length; i++) thunk[i] = (rng.next() * 2 - 1) * Math.exp(-i / (0.014 * rate));
  biquad(thunk, rate, 'lowpass', 380, 1.2);
  mixInto(out, thunk, rate, 0, 4);
  const slap = new Float32Array(Math.round(0.01 * rate));
  for (let i = 0; i < slap.length; i++) slap[i] = (rng.next() * 2 - 1) * Math.exp(-i / (0.0015 * rate));
  biquad(slap, rate, 'highpass', 1800);
  mixInto(out, slap, rate, 0, 0.5);
  const whoosh = new Float32Array(Math.round(0.14 * rate));
  for (let i = 0; i < whoosh.length; i++) {
    const t = i / whoosh.length;
    whoosh[i] = (rng.next() * 2 - 1) * Math.sin(Math.PI * t) * 0.25;
  }
  biquad(whoosh, rate, 'bandpass', 1600, 0.7);
  mixInto(out, whoosh, rate, 0.01, 1);
  fadeOut(out, rate, 0.1);
  return out;
}
