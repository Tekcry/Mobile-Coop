import { describe, expect, it } from 'vitest';
import { Conductor, STEMS, type MusicEvent, type PlayEvent } from '../src/audio/music/conductor';
import { checksum } from '../src/audio/music/dsp';
import { librarySeconds, LIB_RATE, renderLibrary, renderSound, SOUND_IDS } from '../src/audio/music/library';
import { MOTIF_CELL, MOTIF_INVERSION, MOTIF_RESOLVED, MOTIF_STATEMENT } from '../src/audio/music/motif';
import { Rng, scoreStreams } from '../src/audio/music/rng';
import { StepScheduler } from '../src/audio/music/scheduler';
import { encodeWav, levels } from '../src/audio/music/wav';
import { PRIO, VoicePool } from '../src/audio/music/voices';

const FAST = 16000;

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

describe('sound library', () => {
  it('renders the same samples from the same seed, and different ones from another', () => {
    const ids = ['pipe', 'plate', 'boom', 'kickTight', 'reese', 'air', 'relay0', 'bell'];
    const a = renderLibrary(1234, FAST, ids, false);
    const b = renderLibrary(1234, FAST, ids, false);
    const c = renderLibrary(4321, FAST, ids, false);
    for (const id of ids) {
      expect(checksum(a.get(id).data)).toBe(checksum(b.get(id).data));
    }
    // (seeded textures and modal jitter change with the seed)
    expect(checksum(a.get('plate').data)).not.toBe(checksum(c.get('plate').data));
    expect(checksum(a.get('air').data)).not.toBe(checksum(c.get('air').data));
  });

  it('renders one sound the same whatever else is rendered', () => {
    const alone = renderSound('chain', 99, FAST);
    renderSound('plate', 99, FAST);
    expect(checksum(renderSound('chain', 99, FAST).data)).toBe(checksum(alone.data));
  });

  it('renders every sound finite, non-silent and within range', () => {
    const lib = renderLibrary(5, FAST, SOUND_IDS, true);
    for (const id of SOUND_IDS) {
      const d = lib.get(id).data;
      let peak = 0;
      for (let i = 0; i < d.length; i++) {
        expect(Number.isFinite(d[i]!)).toBe(true);
        peak = Math.max(peak, Math.abs(d[i]!));
      }
      expect(peak, id).toBeGreaterThan(0.05);
      expect(peak, id).toBeLessThan(1.6);
    }
    for (const n of ['room', 'hall', 'street'] as const) expect(lib.irs[n][0].length).toBeGreaterThan(1000);
  });

  it('stays inside the 60 s mono budget at the real rate and lists the variants', () => {
    const lib = renderLibrary(0x4e53, LIB_RATE);
    expect(librarySeconds(lib)).toBeLessThan(60);
    expect(lib.variants('click')).toEqual(['click0', 'click1', 'click2']);
    expect(lib.variants('relay')).toEqual(['relay0', 'relay1']);
    expect(lib.variants('glass')).toEqual([]);
  }, 60000);

  it('loops are whole-cycle or crossfaded: the ends join without a jump', () => {
    const lib = renderLibrary(3, 48000, ['hum', 'sub', 'reese', 'drone', 'air'], false);
    for (const id of ['hum', 'sub', 'reese', 'drone', 'air']) {
      const s = lib.get(id);
      expect(s.loop).toBe(true);
      const d = s.data;
      const jump = Math.abs(d[0]! - d[d.length - 1]!);
      // the step across the loop point is no bigger than a typical sample-to-sample step plus a little
      let maxStep = 0;
      for (let i = 1; i < 4000; i++) maxStep = Math.max(maxStep, Math.abs(d[i]! - d[i - 1]!));
      expect(jump, id).toBeLessThan(maxStep * 2.5 + 0.02);
    }
  });
});

describe('motif', () => {
  it('is five notes with the tritone drop, and its forms keep the rhythm', () => {
    expect(MOTIF_STATEMENT.map((n) => n.semis)).toEqual([0, 3, 2, -4, -5]);
    expect(MOTIF_STATEMENT.map((n) => n.step)).toEqual([0, 3, 4, 6, 14]);
    expect(Math.abs(MOTIF_STATEMENT[2]!.semis - MOTIF_STATEMENT[3]!.semis)).toBe(6);
    expect(MOTIF_CELL.map((n) => n.semis)).toEqual([2, -4, -5]);
    expect(MOTIF_RESOLVED.map((n) => n.semis)).toEqual([0, 3, 2, -2, 0]);
    expect(MOTIF_INVERSION.map((n) => n.semis)).toEqual([0, -3, -2, 4, 5]);
    expect(MOTIF_INVERSION.map((n) => n.step)).toEqual([0, 3, 4, 6, 14]);
  });
});

describe('step scheduler', () => {
  it('schedules each step once, in order, at the right times', () => {
    const s = new StepScheduler(120); // 16th = 0.125 s
    s.start(1);
    const got: [number, number][] = [];
    s.advance(1, 1.5, (step, t) => got.push([step, t]));
    expect(got.map((g) => g[0])).toEqual([0, 1, 2, 3]);
    expect(got.map((g) => g[1])).toEqual([1, 1.125, 1.25, 1.375]);
    s.advance(1.4, 1.8, (step, t) => got.push([step, t]));
    expect(got.map((g) => g[0])).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(got[4]![1]).toBeCloseTo(1.5, 9);
    // asking again for the same horizon schedules nothing new
    expect(s.advance(1.4, 1.8, () => {})).toBe(0);
  });

  it('applies a tempo change to the steps not yet scheduled', () => {
    const s = new StepScheduler(120);
    s.start(0);
    const t: number[] = [];
    s.advance(0, 0.3, (_st, time) => t.push(time));
    s.setTempo(60); // 16th = 0.25 s
    s.advance(0.3, 1.2, (_st, time) => t.push(time));
    expect(t.slice(0, 3)).toEqual([0, 0.125, 0.25]);
    expect(t[3]! - t[2]!).toBeCloseTo(0.125, 9);
    expect(t[4]! - t[3]!).toBeCloseTo(0.25, 9);
  });

  it('glides tempo linearly over a number of steps', () => {
    const s = new StepScheduler(168);
    s.start(0);
    s.rampTempo(84, 32);
    const dur: number[] = [];
    s.advance(0, 100, (_st, _t, d) => dur.push(d), 1e9);
    expect(dur.length).toBeGreaterThan(40);
    expect(dur[0]!).toBeCloseTo(60 / 168 / 4, 6);
    expect(dur[32]!).toBeCloseTo(60 / 84 / 4, 6);
    for (let i = 1; i < 32; i++) expect(dur[i]!).toBeGreaterThan(dur[i - 1]!);
  });

  it('re-anchors after a stall without replaying what was missed, keeping bar alignment', () => {
    const s = new StepScheduler(120);
    s.start(0);
    s.advance(0, 0.2, () => {});
    // the tab was backgrounded for 30 s: no replay, the grid picks up a whole number of bars later
    const got: [number, number][] = [];
    s.advance(30, 30.6, (step, t) => got.push([step, t]));
    expect(got.length).toBeGreaterThan(0);
    expect(got.length).toBeLessThanOrEqual(5);
    expect(got[0]![1]).toBeGreaterThanOrEqual(30);
    // (it had played steps 0 and 1, so the next step is 2, and the skip is whole bars: 2 mod 16)
    expect(got[0]![0] % 16).toBe(2);
    expect(got[0]![0]).toBeGreaterThan(100);
  });
});

describe('voice cap', () => {
  it('never lets more than the cap sound at once, whatever is asked', () => {
    const pool = new VoicePool(24);
    const rng = new Rng(9);
    for (let i = 0; i < 400; i++) {
      const start = i * 0.05;
      pool.begin(Math.floor(rng.range(0, 6)), start, start + rng.range(0.1, 2));
      expect(pool.active(start)).toBeLessThanOrEqual(24);
    }
    expect(pool.peak).toBeLessThanOrEqual(24);
    expect(pool.refused + pool.stolen).toBeGreaterThan(0);
  });

  it('steals the oldest of the lowest priority, and refuses a less important newcomer', () => {
    const pool = new VoicePool(3);
    const cuts: string[] = [];
    pool.begin(PRIO.bass, 0, 10, () => cuts.push('bass'));
    pool.begin(PRIO.tex, 0.1, 10, () => cuts.push('tex'));
    pool.begin(PRIO.motif, 0.2, 10, () => cuts.push('motif'));
    // full: a stinger steals the texture
    expect(pool.begin(PRIO.stinger, 1, 5)).not.toBeNull();
    expect(cuts).toEqual(['tex']);
    // full again: a texture is refused (everything left is more important)
    expect(pool.begin(PRIO.tex, 2, 5)).toBeNull();
    expect(pool.refused).toBe(1);
    expect(pool.active(2)).toBe(3);
  });

  it('frees a slot when a sustained layer is finished', () => {
    const pool = new VoicePool(1);
    const bed = pool.begin(PRIO.bed, 0, Infinity)!;
    expect(pool.begin(PRIO.tex, 1, 2)).toBeNull();
    pool.finish(bed, 3);
    expect(pool.begin(PRIO.tex, 4, 5)).not.toBeNull();
  });
});

const pal = { variants: (b: string) => (b === 'click' ? ['click0', 'click1', 'click2'] : b === 'relay' ? ['relay0', 'relay1'] : []) };

function run(seed: number, state: 'calm' | 'combat', seconds: number): MusicEvent[] {
  const ev: MusicEvent[] = [];
  const c = new Conductor(seed, pal, (e) => ev.push(e));
  c.setState(state, 0);
  c.advance(0, seconds);
  return ev;
}

describe('conductor', () => {
  it('is deterministic: the same seed gives the same events, another seed differs', () => {
    expect(run(5, 'combat', 40)).toEqual(run(5, 'combat', 40));
    expect(run(5, 'calm', 120)).toEqual(run(5, 'calm', 120));
    expect(run(5, 'combat', 40)).not.toEqual(run(6, 'combat', 40));
    expect(run(5, 'calm', 120)).not.toEqual(run(6, 'calm', 120));
  });

  it('keeps combat on a 168 BPM grid and uses every event on a known stem', () => {
    const ev = run(1, 'combat', 20).filter((e): e is PlayEvent => e.k === 'play');
    const kicks = ev.filter((e) => e.id === 'kickTight');
    expect(kicks.length).toBeGreaterThan(10);
    const bar = (60 / 168) * 4;
    // every bar has a kick on the downbeat
    for (let b = 0; b < 8; b++) expect(kicks.some((k) => Math.abs(k.t - b * bar) < 1e-6)).toBe(true);
    const sixteenth = 60 / 168 / 4;
    for (const e of ev) {
      expect(STEMS).toContain(e.stem);
      expect(e.t).toBeGreaterThanOrEqual(0);
      expect(e.gain).toBeGreaterThan(0);
      // on the 16th grid (fills and notes included)
      const steps = e.t / sixteenth;
      expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-6);
    }
  });

  it('plays the motif in sixteenths once per 8 bars in combat', () => {
    const ev = run(2, 'combat', 40).filter((e): e is PlayEvent => e.k === 'play' && e.id === 'pipe');
    expect(ev.length).toBeGreaterThanOrEqual(MOTIF_STATEMENT.length * 3);
    expect(ev.length % MOTIF_STATEMENT.length).toBe(0);
    // the first statement starts on the downbeat of bar 4 (index 3)
    expect(ev[0]!.t).toBeCloseTo(3 * (60 / 168) * 4, 6);
  });

  it('keeps calm sparse (no beat), pans and pitches within range, and holds the motif back', () => {
    const ev = run(3, 'calm', 300).filter((e): e is PlayEvent => e.k === 'play');
    const tex = ev.filter((e) => e.stem === 'TEX');
    expect(tex.length).toBeGreaterThan(10);
    expect(tex.length).toBeLessThan(80);
    for (const e of tex) {
      expect(Math.abs(e.pan)).toBeLessThanOrEqual(0.6);
      expect(e.rate).toBeGreaterThan(0.7);
      expect(e.rate).toBeLessThan(1.4);
    }
    // gaps of 4 s or more between ticks
    for (let i = 1; i < tex.length; i++) expect(tex[i]!.t - tex[i - 1]!.t).toBeGreaterThanOrEqual(3.99);
    // the motif: never in the first 60 s, at most once per 90 s
    const motif = ev.filter((e) => e.id === 'motifbell' && e.stem === 'MOTIF');
    const starts = motif.filter((_e, i) => i % 5 === 0).map((e) => e.t);
    for (const t of starts) expect(t).toBeGreaterThan(60);
    for (let i = 1; i < starts.length; i++) expect(starts[i]! - starts[i - 1]!).toBeGreaterThan(90);
    // the beds are sustained layers
    expect(ev.filter((e) => e.layer === 'air' || e.layer === 'drone').length).toBe(2);
  });

  it('plays calm to combat and back: layers stop and start', () => {
    const ev: MusicEvent[] = [];
    const c = new Conductor(1, pal, (e) => ev.push(e));
    c.setState('calm', 0);
    c.setState('combat', 10);
    const stops = ev.filter((e) => e.k === 'stop');
    expect(stops.map((e) => (e as { layer: string }).layer)).toEqual(['bass', 'air', 'drone']);
    c.advance(10, 14);
    expect(ev.some((e) => e.k === 'play' && e.id === 'kickTight')).toBe(true);
    c.setState('calm', 20);
    expect(ev.filter((e) => e.k === 'stop').length).toBe(4);
    expect(c.sched.running).toBe(false);
  });

  it('never exceeds the voice cap when its events are played through the pool', () => {
    for (const state of ['calm', 'combat'] as const) {
      const pool = new VoicePool(24);
      const lib = renderLibrary(1, FAST, SOUND_IDS, false);
      for (const e of run(11, state, 120)) {
        if (e.k !== 'play') continue;
        const s = lib.get(e.id);
        const dur = e.dur !== undefined ? e.dur : s.loop ? 1e6 : s.data.length / lib.rate / e.rate;
        pool.begin(e.prio, e.t, e.t + dur);
      }
      expect(pool.peak, state).toBeLessThanOrEqual(24);
    }
  });

  it('only asks for sounds the library has', () => {
    const ids = new Set(SOUND_IDS);
    const check = (ev: MusicEvent[]): void => {
      for (const e of ev) if (e.k === 'play') expect(ids.has(e.id), e.id).toBe(true);
    };
    const lib = { variants: (b: string) => SOUND_IDS.filter((i) => new RegExp(`^${b}\\d+$`).test(i)) };
    for (const state of ['calm', 'combat'] as const) {
      const ev: MusicEvent[] = [];
      const c = new Conductor(8, lib, (e) => ev.push(e));
      c.setState(state, 0);
      c.advance(0, 200);
      c.playMotif(0, 'all');
      c.playMotif(0, 'resolved');
      check(ev);
    }
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
