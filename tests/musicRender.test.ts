import { describe, expect, it } from 'vitest';
import { granular, hermite, makeSrc, mixWrap, place, RATE, semisTo, secs, stereo, type Src, type Stereo } from '../src/audio/music/render/canvas';
import { delayWet, reverbWet, reverseRegion, stutter, tape, tapeStop } from '../src/audio/music/render/fx';
import { chopBar, Grid, lay, loudness, performBreak, straight } from '../src/audio/music/render/kit';
import { readWav } from '../src/audio/music/render/wavRead';
import { loopSeconds, SKETCHES } from '../src/audio/music/render/sketches';
import { Rng } from '../src/audio/music/rng';
import { encodeWav } from '../src/audio/music/wav';
import { FADE_DOWN, FADE_UP, fadeTime, loopRegion, STATE_GAINS, threatGains } from '../src/audio/music/stemMix';

/** A decaying 110 Hz tone with a sharp onset: a stand-in for a recorded hit. */
function hitSrc(sec = 0.5, hz = 110): Src {
  const n = secs(sec);
  const d = new Float32Array(n);
  for (let i = 0; i < n; i++) d[i] = Math.sin((2 * Math.PI * hz * i) / RATE) * Math.exp((-6 * i) / n);
  return makeSrc('hit', [d, d], RATE, hz);
}

/** A steady tone (no decay): for level tests. */
function steadySrc(sec = 1, hz = 300): Src {
  const n = secs(sec);
  const d = new Float32Array(n);
  for (let i = 0; i < n; i++) d[i] = Math.sin((2 * Math.PI * hz * i) / RATE);
  return makeSrc('steady', [d, d], RATE, hz);
}

/** Largest jump across the loop point compared with the largest jump inside the loop. */
function seam(c: Stereo): number {
  let inside = 1e-9;
  for (let i = 1; i < c.l.length; i++) inside = Math.max(inside, Math.abs(c.l[i]! - c.l[i - 1]!));
  return Math.abs(c.l[0]! - c.l[c.l.length - 1]!) / inside;
}

describe('wav reader', () => {
  it('reads back what the encoder wrote (16-bit stereo)', () => {
    const l = new Float32Array([0, 0.5, -0.5, 0.25]);
    const r = new Float32Array([0, -0.25, 0.75, -1]);
    const w = readWav(encodeWav([l, r], 44100));
    expect(w.rate).toBe(44100);
    expect(w.channels.length).toBe(2);
    for (let i = 0; i < 4; i++) {
      expect(w.channels[0]![i]).toBeCloseTo(l[i]!, 3);
      expect(w.channels[1]![i]).toBeCloseTo(r[i]!, 3);
    }
  });

  it('reads 24-bit PCM', () => {
    const b = new Uint8Array(44 + 6);
    const v = new DataView(b.buffer);
    const s = (o: number, t: string): void => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    s(0, 'RIFF');
    v.setUint32(4, 36 + 6, true);
    s(8, 'WAVEfmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, 48000, true);
    v.setUint16(34, 24, true);
    s(36, 'data');
    v.setUint32(40, 6, true);
    // +0.5 and -0.5 as 24-bit little-endian
    b.set([0x00, 0x00, 0x40, 0x00, 0x00, 0xc0], 44);
    const w = readWav(b);
    expect(w.channels[0]![0]).toBeCloseTo(0.5, 6);
    expect(w.channels[0]![1]).toBeCloseTo(-0.5, 6);
  });
});

describe('render canvas', () => {
  it('normalises sources to -1 dBFS and keeps the root', () => {
    const s = hitSrc();
    let p = 0;
    for (const x of s.l) p = Math.max(p, Math.abs(x));
    expect(p).toBeCloseTo(0.89, 2);
    expect(semisTo(s, 45)).toBeCloseTo(0, 6);
    expect(semisTo(s, 57)).toBeCloseTo(12, 6);
  });

  it('interpolates smoothly between samples', () => {
    const d = new Float32Array([0, 1, 2, 3, 4]);
    expect(hermite(d, 2.5)).toBeCloseTo(2.5, 6);
  });

  it('wraps what runs past the loop end to the start', () => {
    const c = new Float32Array(10);
    mixWrap(c, new Float32Array([1, 1, 1, 1]), 8);
    expect([...c]).toEqual([1, 1, 0, 0, 0, 0, 0, 0, 1, 1]);
  });

  it('varispeed: up an octave plays twice as fast', () => {
    const c = stereo(secs(2));
    place(c, hitSrc(0.5), { t: 0, semis: 12, pan: 0 });
    let last = 0;
    for (let i = 0; i < c.l.length; i++) if (Math.abs(c.l[i]!) > 1e-6) last = i;
    expect(last / RATE).toBeCloseTo(0.25, 2);
  });

  it('a granular bed over the whole loop joins without a seam', () => {
    const c = stereo(secs(2));
    granular(c, hitSrc(1, 147), { t: 0, dur: 2, from: 0.1, to: 0.8, grain: 0.12, density: 40, jitter: 0.02, spread: 0.5 }, new Rng(3));
    expect(seam(c)).toBeLessThan(1);
  });
});

describe('render effects', () => {
  it('reverb and delay tails wrap into the start: the loop is seamless', () => {
    const c = stereo(secs(2));
    place(c, hitSrc(0.3), { t: 1.9, pan: 0 });
    const wet = reverbWet(c, { rt60: 3, damp: 3000, size: 1.5 });
    expect(Math.abs(wet.l[100]!)).toBeGreaterThan(1e-4);
    expect(seam(wet)).toBeLessThan(1);
    const d = delayWet(c, { time: 0.25, feedback: 0.5, lp: 3000 });
    expect(seam(d)).toBeLessThan(1);
  });

  it('tape wow and flutter are periodic in the loop', () => {
    const c = stereo(secs(2));
    granular(c, hitSrc(1, 220), { t: 0, dur: 2, from: 0.1, to: 0.8, grain: 0.1, density: 50 }, new Rng(5));
    const t = tape(c, { wow: 0.001, wowCycles: 2, flutter: 0.0001, flutterCycles: 30, drive: 1.5, lp: 8000 });
    expect(t.l.length).toBe(c.l.length);
    expect(seam(t)).toBeLessThan(1);
  });

  it('glitch edits keep the length and stay finite', () => {
    const c = stereo(secs(1));
    granular(c, hitSrc(1), { t: 0, dur: 1, from: 0.1, to: 0.8, grain: 0.1, density: 40 }, new Rng(9));
    stutter(c, 0.2, 0.05, 3);
    reverseRegion(c, 0.6, 0.1);
    tapeStop(c, 0.8, 0.15);
    expect(c.l.length).toBe(secs(1));
    expect(c.l.every(Number.isFinite)).toBe(true);
  });
});

describe('composition helpers', () => {
  it('the swung grid delays every second sixteenth', () => {
    const g = new Grid(120, 4, 0.2);
    expect(g.loop).toBeCloseTo(8, 6);
    expect(g.at(1, 0)).toBeCloseTo(2, 6);
    expect(g.at(0, 1) - 0.125).toBeCloseTo(0.2 * 0.125, 6);
    expect(g.at(0, 2)).toBeCloseTo(0.25, 6);
  });

  it('a performed break re-sequenced in order is close to the original', () => {
    const g = new Grid(96, 2, 0.1);
    const kit = { kick: [hitSrc(0.3, 60)], snare: [hitSrc(0.2, 200)], ghost: [hitSrc(0.1, 200)], hat: [hitSrc(0.05, 4000)] };
    const brk = performBreak(g, kit, { kick: ['X.......X.......', 'X.......X.......'], snare: ['....X.......X...', '....X.......X...'], ghost: ['................', '................'], hat: ['x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.x.x.'] }, new Rng(1));
    expect(brk.l.length).toBe(secs(g.loop));
    const c = stereo(secs(g.loop));
    chopBar(c, g, 0, brk, straight(0));
    chopBar(c, g, 1, brk, straight(1));
    let num = 0;
    let den = 0;
    for (let i = 0; i < c.l.length; i++) {
      num += (c.l[i]! - brk.l[i]!) ** 2;
      den += brk.l[i]! ** 2;
    }
    expect(num / den).toBeLessThan(0.1);
  });

  it('places layers at a gated loudness, so a sparse layer is measured while it plays', () => {
    const dense = stereo(secs(4));
    granular(dense, steadySrc(), { t: 0, dur: 4, from: 0.1, to: 0.8, grain: 0.1, density: 40 }, new Rng(2));
    const sparse = stereo(secs(4));
    granular(sparse, steadySrc(), { t: 1, dur: 1, from: 0.1, to: 0.8, grain: 0.1, density: 40 }, new Rng(2));
    expect(Math.abs(loudness(dense) - loudness(sparse))).toBeLessThan(2);
    const dst = stereo(secs(4));
    lay(dst, dense, -6);
    expect(loudness(dst)).toBeCloseTo(-26, 0);
  });

  it('every sketch loop is a whole number of bars and about 60 s', () => {
    for (const s of SKETCHES) {
      expect(loopSeconds(s)).toBeGreaterThan(59);
      expect(loopSeconds(s)).toBeLessThan(61);
      expect(s.bpm).toBeGreaterThanOrEqual(80);
      expect(s.bpm).toBeLessThanOrEqual(100);
    }
  });
});

describe('stem mix', () => {
  it('stacks: calm always, caution over it, alert over both; evasion thins alert', () => {
    expect(STATE_GAINS.calm).toEqual([1, 0, 0]);
    expect(STATE_GAINS.caution).toEqual([1, 1, 0]);
    expect(STATE_GAINS.alert).toEqual([1, 1, 1]);
    expect(STATE_GAINS.evasion[2]).toBeGreaterThan(0);
    expect(STATE_GAINS.evasion[2]).toBeLessThan(0.5);
  });

  it('threat fades caution in before alert, monotonically', () => {
    expect(threatGains(0)).toEqual([1, 0, 0]);
    expect(threatGains(1)).toEqual([1, 1, 1]);
    expect(threatGains(0.5)[1]).toBeCloseTo(1, 6);
    expect(threatGains(0.5)[2]).toBe(0);
    let prev = threatGains(0);
    for (let x = 0.05; x <= 1; x += 0.05) {
      const g = threatGains(x);
      expect(g[1]).toBeGreaterThanOrEqual(prev[1] - 1e-9);
      expect(g[2]).toBeGreaterThanOrEqual(prev[2] - 1e-9);
      prev = g;
    }
  });

  it('rises fast and falls slowly', () => {
    expect(fadeTime(STATE_GAINS.calm, STATE_GAINS.alert)).toBe(FADE_UP);
    expect(fadeTime(STATE_GAINS.alert, STATE_GAINS.calm)).toBe(FADE_DOWN);
    expect(FADE_DOWN).toBeGreaterThan(FADE_UP);
    expect(loopRegion(0.5, 60)).toEqual({ start: 0.5, end: 60.5 });
  });
});
