import { describe, expect, it } from 'vitest';
import { Rng, scoreStreams } from '../src/audio/music/rng';
import { encodeWav, levels } from '../src/audio/music/wav';

describe('seeded generator', () => {
  it('gives the same sequence for the same seed and different for another', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    const c = new Rng(43);
    const sa = Array.from({ length: 20 }, () => a.next());
    expect(Array.from({ length: 20 }, () => b.next())).toEqual(sa);
    expect(Array.from({ length: 20 }, () => c.next())).not.toEqual(sa);
    expect(sa.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it('forks independent, repeatable sub-streams', () => {
    const s1 = scoreStreams(7);
    const s2 = scoreStreams(7);
    expect(s1.library.next()).toBe(s2.library.next());
    expect(s1.patterns.next()).not.toBe(s1.calm.next());
  });
});

describe('wav', () => {
  it('writes a valid 16-bit stereo header and clamps', () => {
    const l = new Float32Array([0, 0.5, -0.5, 2]);
    const r = new Float32Array([0, -1, 1, -2]);
    const w = encodeWav([l, r], 48000);
    expect(w.length).toBe(44 + 4 * 2 * 2);
    expect(String.fromCharCode(...w.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...w.slice(8, 12))).toBe('WAVE');
    const v = new DataView(w.buffer);
    expect(v.getUint16(22, true)).toBe(2);
    expect(v.getUint32(24, true)).toBe(48000);
    expect(v.getUint32(40, true)).toBe(16);
    expect(v.getInt16(44 + 3 * 4, true)).toBe(32767);
    expect(v.getInt16(44 + 3 * 4 + 2, true)).toBe(-32768);
  });

  it('measures peak and RMS in dBFS', () => {
    const x = new Float32Array(1000).fill(0.5);
    const { peakDb, rmsDb } = levels([x]);
    expect(peakDb).toBeCloseTo(-6.02, 1);
    expect(rmsDb).toBeCloseTo(-6.02, 1);
    expect(levels([new Float32Array(10)]).peakDb).toBeLessThan(-100);
  });
});
