/**
 * Scene music prototypes for the storm grain mill escape (Michael, 2026-10-26: "can you provide more realistic versions
 * of both songs"): two openings (the 38 s slow-motion shot that ends in a blackout) and two mission pieces (from the
 * blackout to the end of the scene, on the form Michael measured: 150 BPM, sections at 36.68 / 49.48 / 71.88 / 97.48 /
 * 110.28 / 123.08 s, an outro from 139.08 s, a fade to ~160.7 s). Original music, played offline on the CC0 VSCO 2 CE
 * recordings (`scripts/music/orch-samples.json`, plus the percussion in `scripts/music/samples.json`).
 *
 * Realism over the earlier sketches: every note is a recording (no oscillators, except a quiet sub under the mission
 * ostinato), velocity changes level and tone, round robins rotate, the piano is humanised and pedalled and keeps its
 * natural balance across the keyboard, sustains have real attacks and releases, onsets are aligned (each recording's
 * own pre-attack silence is removed), and each section of the orchestra has its own place and hall reverb.
 */
import { biquad } from '../../music/dsp';
import { Rng } from '../../music/rng';
import { addInto, place, RATE, secs, stereo, type Src, type Stereo } from '../../music/render/canvas';
import { monoLows, reverbWet } from '../../music/render/fx';
import { midi as n } from '../theory';
import type { Bank } from './bank';

export type Group = 'piano' | 'hiStr' | 'loStr' | 'horns' | 'lowBrass' | 'perc' | 'sub';
const GROUPS: readonly Group[] = ['piano', 'hiStr', 'loStr', 'horns', 'lowBrass', 'perc', 'sub'];

/** Each section's hall (wet level, decay, damping, send high-pass) and its place on the stage (left / right gain). */
const ROOM: Record<Group, { wet: number; rt60: number; damp: number; hp: number; l: number; r: number }> = {
  piano: { wet: 0.26, rt60: 2.3, damp: 7000, hp: 140, l: 1, r: 1 },
  hiStr: { wet: 0.36, rt60: 2.7, damp: 7500, hp: 150, l: 1, r: 0.78 },
  loStr: { wet: 0.27, rt60: 2.5, damp: 5000, hp: 110, l: 0.82, r: 1 },
  horns: { wet: 0.4, rt60: 2.9, damp: 5500, hp: 120, l: 1, r: 0.82 },
  lowBrass: { wet: 0.32, rt60: 2.7, damp: 4500, hp: 100, l: 0.84, r: 1 },
  perc: { wet: 0.3, rt60: 2.5, damp: 6000, hp: 70, l: 1, r: 1 },
  sub: { wet: 0, rt60: 1, damp: 1000, hp: 0, l: 1, r: 1 },
};

export interface PlayOpts {
  /** 0..1: chooses the loud or soft recording, sets level and tone. */
  vel: number;
  attack?: number;
  release?: number;
  /** Timing looseness, seconds either way (players are never exactly on the grid). */
  loose?: number;
  loud?: boolean;
  /** Extra low-pass (Hz). */
  lp?: number;
}

const gainOf = (vel: number): number => Math.pow(Math.max(0, vel), 1.5);

export class Scene {
  readonly c: Record<Group, Stereo>;
  readonly rng: Rng;
  private readonly onsets = new Map<string, number>();
  private readonly ends = new Map<string, number>();
  private readonly leads = new Map<string, number>();
  private pianoTurn = 0;
  /** Notes played far from their nearest recording (instrument and shift), for the render log. */
  readonly stretched = new Map<string, number>();

  constructor(
    readonly bank: Bank,
    /** The percussion kit (snares and the like) from scripts/music/samples.json. */
    readonly kit: Bank,
    /** Canvas length (s), longer than the piece so tails ring out in silence. */
    readonly len: number,
    readonly bpm: number,
    /** Time (s) of bar 0, beat 0. */
    readonly t0: number,
    seed: number,
  ) {
    this.rng = new Rng(seed);
    const c = {} as Record<Group, Stereo>;
    for (const g of GROUPS) c[g] = stereo(secs(len));
    this.c = c;
  }

  get beat(): number {
    return 60 / this.bpm;
  }

  t(bar: number, beat = 0): number {
    return this.t0 + (bar * 4 + beat) * this.beat;
  }

  d(beats: number): number {
    return beats * this.beat;
  }

  /** Seconds of near-silence before a recording's attack (removed so the attack lands on the beat). */
  private onset(id: string, s: Src): number {
    let o = this.onsets.get(id);
    if (o === undefined) {
      let pk = 0;
      for (let i = 0; i < s.mono.length; i++) pk = Math.max(pk, Math.abs(s.mono[i]!));
      let i = 0;
      while (i < s.mono.length && Math.abs(s.mono[i]!) < pk * 0.03) i++;
      o = Math.max(0, i / RATE - 0.002);
      this.onsets.set(id, o);
    }
    return o;
  }

  /**
   * How long a recording takes from its first sound to half its loudness (s, at most 60 ms): bowed strings speak
   * slowly, so short notes are placed this much early and are heard on the beat, as players do.
   */
  private lead(id: string, s: Src, on: number): number {
    let l = this.leads.get(id);
    if (l === undefined) {
      const blk = secs(0.005);
      const from = Math.round(on * RATE);
      const env: number[] = [];
      for (let b = from; b + blk <= Math.min(s.mono.length, from + secs(0.5)); b += blk) {
        let a = 0;
        for (let i = b; i < b + blk; i++) a += s.mono[i]! * s.mono[i]!;
        env.push(Math.sqrt(a / blk));
      }
      const top = Math.max(0, ...env);
      let k = 0;
      while (k < env.length && env[k]! < top * 0.5) k++;
      l = Math.min(0.06, (k * blk) / RATE);
      this.leads.set(id, l);
    }
    return l;
  }

  /**
   * Where a recording stops being steady (s into the source): the last 50 ms block still within -10 dB of its loudest.
   * Some sustains end with the player lifting the bow inside the file; a long note loops only the part before that.
   */
  private steadyEnd(id: string, s: Src): number {
    let e = this.ends.get(id);
    if (e === undefined) {
      const blk = secs(0.05);
      const rms: number[] = [];
      for (let b = 0; b + blk <= s.mono.length; b += blk) {
        let a = 0;
        for (let i = b; i < b + blk; i++) a += s.mono[i]! * s.mono[i]!;
        rms.push(Math.sqrt(a / blk));
      }
      const top = Math.max(...rms);
      let last = rms.length - 1;
      while (last > 0 && rms[last]! < top * 0.316) last--;
      e = ((last + 1) * blk) / RATE;
      this.ends.set(id, e);
    }
    return e;
  }

  private jit(loose: number): number {
    return (this.rng.next() * 2 - 1) * loose;
  }

  /** A pitched orchestral note: nearest recording, varispeed, a sustain extended by looping its steady middle. */
  play(g: Group, inst: string, m: number, t: number, dur: number, o: PlayOpts): void {
    const vel = Math.max(0.02, Math.min(1, o.vel * this.rng.jitter(0.05)));
    if (inst.startsWith('horn') && m > 62) m -= 12;
    const z = this.bank.pick(inst, m, o.loud ?? vel > 0.62);
    const s = this.bank.src(z);
    const semis = m - z.midi;
    if (Math.abs(semis) > 3) this.stretched.set(`${inst} ${m}`, semis);
    const rate = Math.pow(2, semis / 12);
    const on = this.onset(z.id, s);
    const att0 = o.attack ?? 0.006;
    const early = att0 < 0.05 ? this.lead(z.id, s, on) / rate : 0;
    const tt = Math.max(0, t - early + this.jit(o.loose ?? 0.005));
    const avail = (s.mono.length / RATE - on) / rate;
    const steady = Math.max(1, (this.steadyEnd(z.id, s) - on) / rate);
    const rel = o.release ?? 0.35;
    const att = att0;
    const gain = gainOf(vel);
    // soft playing is darker
    const lp = o.lp ?? (vel < 0.55 ? 2200 + 12000 * vel * vel : 0);
    const base = { semis, gain, ...(lp ? { lp } : {}) };
    const c = this.c[g];
    const total = dur + rel;
    if (total <= avail * 0.92 && (dur < 1 || total <= steady)) {
      place(c, s, { ...base, t: tt, start: on, dur: total, fadeIn: att, fadeOut: rel });
      return;
    }
    const xf = 0.35;
    const head = Math.min(avail * 0.88, steady);
    place(c, s, { ...base, t: tt, start: on, dur: head, fadeIn: att, fadeOut: xf });
    const skip = Math.min(head * 0.3, 1.2);
    const loopFrom = on + skip * rate;
    const loopLen = Math.max(0.8, head - skip);
    let at = tt + head - xf;
    const end = tt + total;
    while (at < end - 0.05) {
      const remain = end - at;
      const last = remain <= loopLen;
      const len = last ? remain : loopLen;
      place(c, s, { ...base, t: at, start: loopFrom, dur: len, fadeIn: Math.min(xf, len / 2), fadeOut: last ? Math.min(rel, len / 2) : xf });
      if (last) break;
      at += len - xf;
    }
  }

  /**
   * A piano note, pedalled for `dur` seconds then damped. The recordings are a major third apart: the nearest one is
   * used, and when two are equally near they take turns (a round robin). Level keeps the recorded balance across the
   * keyboard; soft notes are darker.
   */
  piano(t: number, m: number, vel: number, dur: number, loose = 0.012): void {
    const v = Math.max(0.03, Math.min(1, vel * this.rng.jitter(0.07)));
    const zs = this.bank.zones('piano');
    let best = Infinity;
    for (const z of zs) best = Math.min(best, Math.abs(z.midi - m));
    const near = zs.filter((z) => Math.abs(z.midi - m) <= best + 1e-6);
    const z = near[this.pianoTurn++ % near.length]!;
    const s = this.bank.src(z);
    const on = this.onset(z.id, s);
    const semis = m - z.midi;
    const rate = Math.pow(2, semis / 12);
    const avail = (s.mono.length / RATE - on) / rate;
    const len = Math.min(dur + 0.3, avail);
    const natural = Math.pow((z.rawPeak ?? 0.14) / 0.14, 0.6);
    place(this.c.piano, s, {
      t: Math.max(0, t + this.jit(loose)),
      start: on,
      semis,
      gain: Math.pow(v, 1.2) * natural,
      dur: len,
      fadeIn: 0.001,
      fadeOut: Math.min(0.3, len * 0.5),
      lp: Math.min(16000, 1300 + 15000 * v * v),
    });
  }

  /** A recording played whole (percussion), by index in the instrument's sorted list; optionally pitched. */
  hit(inst: string, which: number, t: number, gain: number, semis = 0, g: Group = 'perc', fromKit = false): void {
    const b = fromKit ? this.kit : this.bank;
    const z = b.pickHit(inst, which);
    const s = b.src(z);
    const on = this.onset(z.id, s);
    const early = this.lead(z.id, s, on) / Math.pow(2, semis / 12);
    place(this.c[g], s, { t: Math.max(0, t - early + this.jit(0.003)), start: on, gain: gain * this.rng.jitter(0.06), semis });
  }

  /** A tuned timpani stroke. */
  timp(m: number, t: number, vel: number): void {
    const z = this.bank.pick('timp', m, vel > 0.6);
    const s = this.bank.src(z);
    const on = this.onset(z.id, s);
    place(this.c.perc, s, { t: Math.max(0, t + this.jit(0.004)), start: on, gain: gainOf(vel), semis: m - z.midi });
  }

  /** A timpani roll that grows from nothing over `len` seconds and stops at `end` (the downbeat it leads into). */
  timpRoll(m: number, end: number, len: number, vel: number): void {
    const z = this.bank.pick('timpRoll', m, true);
    const s = this.bank.src(z);
    const semis = m - z.midi;
    const avail = s.mono.length / RATE / Math.pow(2, semis / 12);
    const l = Math.min(len, avail * 0.95);
    place(this.c.perc, s, { t: end - l, gain: gainOf(vel), semis, dur: l, fadeIn: l * 0.9, fadeOut: 0.04 });
  }

  /** A cymbal roll (or any swelling recording) whose loudest moment lands on `t`. */
  swellInto(inst: string, which: number, t: number, gain: number): void {
    const z = this.bank.pickHit(inst, which);
    const s = this.bank.src(z);
    let pk = 0;
    let at = 0;
    for (let i = 0; i < s.mono.length; i++) {
      const a = Math.abs(s.mono[i]!);
      if (a > pk) {
        pk = a;
        at = i;
      }
    }
    const peakT = at / RATE;
    const start = Math.max(0, peakT - (t - 0.05));
    place(this.c.perc, s, { t: Math.max(0, t - peakT), start, gain, dur: peakT - start + 0.2, fadeOut: 0.2 });
  }

  /** A deep sub bass under the low strings (a sine with a touch of second harmonic), soft-edged. */
  sub(t: number, dur: number, m: number, gain: number, attack = 0.02, release = 0.25): void {
    const f = 440 * Math.pow(2, (m - 69) / 12);
    const c = this.c.sub;
    const n0 = Math.round(t * RATE);
    const len = Math.round((dur + release) * RATE);
    const att = Math.max(1, Math.round(attack * RATE));
    const rel = Math.max(1, Math.round(release * RATE));
    for (let i = 0; i < len; i++) {
      const j = n0 + i;
      if (j < 0 || j >= c.l.length) continue;
      const env = Math.min(1, i / att) * (i > len - rel ? (len - i) / rel : 1);
      const ph = (2 * Math.PI * f * i) / RATE;
      const v = (Math.sin(ph) + 0.2 * Math.sin(2 * ph)) * env * gain;
      c.l[j]! += v;
      c.r[j]! += v;
    }
  }
}

/** Every section through its hall and onto its place, summed with per-section levels (dB). */
export function mixdown(s: Scene, levels: Partial<Record<Group, number>>): Stereo {
  const n = s.c.piano.l.length;
  const out = stereo(n);
  for (const g of GROUPS) {
    const x = s.c[g];
    let pk = 0;
    for (let i = 0; i < n; i += 64) pk = Math.max(pk, Math.abs(x.l[i]!), Math.abs(x.r[i]!));
    if (pk === 0) continue;
    const r = ROOM[g];
    if (r.wet > 0) {
      const wet = reverbWet(x, { rt60: r.rt60, damp: r.damp, size: 3, predelay: 0.024, hp: r.hp });
      addInto(x, wet, r.wet);
    }
    const k = Math.pow(10, (levels[g] ?? 0) / 20);
    for (let i = 0; i < n; i++) {
      out.l[i]! += x.l[i]! * k * r.l;
      out.r[i]! += x.r[i]! * k * r.r;
    }
  }
  biquad(out.l, 'highpass', 28, 0.707, RATE);
  biquad(out.r, 'highpass', 28, 0.707, RATE);
  return monoLows(out, 120);
}

// ------------------------------------------------------------------ the pieces

export interface ScenePiece {
  id: string;
  /** Output file name (no extension). */
  file: string;
  about: string;
  /** Final length (s) and the fade at the end (s, from .. to). */
  length: number;
  fade: [number, number];
  levels: Partial<Record<Group, number>>;
  render: (s: Scene) => void;
  bpm: number;
  t0: number;
}

type Chord = { bass: number; tones: number[] };
const ch = (bass: string, ...tones: string[]): Chord => ({ bass: n(bass), tones: tones.map((x) => n(x)) });

// ---------------------------------------------------------------- intro 1: the vigil (B minor, 64 BPM)

/**
 * Piano at the centre: a quiet rocking eighth-note figure (with a neighbour note that keeps it uneasy), low pedal
 * octaves, a slow melody from bar 4; low strings creep in under it, violas and violins join, the figure doubles to
 * sixteenths for the last two bars while everything swells into a full orchestral hit on the blackout at 38.0 s.
 */
function introVigil(s: Scene): void {
  // per bar: left-hand root, right-hand figure tones [low, mid, high, neighbour]
  const bars: [string, string[]][] = [
    ['B1', ['F#3', 'B3', 'D4', 'C#4']],
    ['B1', ['F#3', 'B3', 'D4', 'C#4']],
    ['G1', ['G3', 'B3', 'D4', 'F#4']],
    ['F#1', ['F#3', 'A#3', 'C#4', 'E4']],
    ['B1', ['F#3', 'B3', 'D4', 'C#4']],
    ['E1', ['G3', 'B3', 'E4', 'F#4']],
    ['C2', ['G3', 'C4', 'E4', 'F#4']],
    ['F#1', ['F#3', 'A#3', 'C#4', 'D4']],
  ];
  const fig = [0, 1, 2, 1, 0, 1, 3, 2];
  const grow = (b: number): number => 0.48 + 0.03 * b;
  for (let b = 0; b < 8; b++) {
    const [root, tones] = bars[b]!;
    const r = n(root);
    for (let i = 0; i < 8; i++) {
      const m = n(tones[fig[i]!]!);
      const accent = i === 0 ? 1.12 : i % 2 === 0 ? 1 : 0.86;
      s.piano(s.t(b, i / 2), m, grow(b) * accent, s.d(0.9));
    }
    if (b >= 1) {
      s.piano(s.t(b), r, 0.38 + 0.03 * b, s.d(4) - 0.05);
      s.piano(s.t(b) + 0.01, r + 12, 0.34 + 0.03 * b, s.d(4) - 0.05);
    }
    if (b >= 4) s.piano(s.t(b, 2.5), r + 7, 0.3 + 0.02 * b, s.d(1.5));
  }
  // the last two bars: the figure doubles to sixteenths, half a bar per chord, everything climbing
  const build: [string, string[]][] = [
    ['B1', ['F#3', 'B3', 'D4', 'C#4']],
    ['G1', ['G3', 'B3', 'D4', 'F#4']],
    ['C2', ['G3', 'C4', 'E4', 'F#4']],
    ['F#1', ['F#3', 'A#3', 'C#4', 'E4']],
  ];
  for (let h = 0; h < 4; h++) {
    const [root, tones] = build[h]!;
    const b = 8 + Math.floor(h / 2);
    const beat0 = (h % 2) * 2;
    for (let i = 0; i < 8; i++) {
      const k = h * 8 + i;
      s.piano(s.t(b, beat0 + i / 4), n(tones[fig[i]!]!) + (h >= 2 ? 12 : 0), 0.62 + 0.012 * k, s.d(0.4), 0.008);
    }
    s.piano(s.t(b, beat0), n(root), 0.7 + 0.05 * h, s.d(2) - 0.05);
    s.piano(s.t(b, beat0) + 0.01, n(root) + 12, 0.66 + 0.05 * h, s.d(2) - 0.05);
  }
  // the melody, from bar 4 (octaves in the last two bars)
  const mel: [number, string, number, number][] = [
    [4, 'B4', 0, 2.5],
    [4, 'C5', 2.5, 0.5],
    [4, 'B4', 3, 1],
    [5, 'G4', 0, 2],
    [5, 'F#4', 2, 1],
    [5, 'E4', 3, 1],
    [6, 'E4', 0, 1],
    [6, 'G4', 1, 1],
    [6, 'C5', 2, 2],
    [7, 'A#4', 0, 3],
    [7, 'F#4', 3, 1],
    [8, 'B4', 0, 1],
    [8, 'D5', 1, 1],
    [8, 'F#5', 2, 2],
    [9, 'G5', 0, 2],
    [9, 'F#5', 2, 2],
  ];
  for (const [b, name, beat, len] of mel) {
    const v = 0.52 + 0.04 * (b - 4);
    s.piano(s.t(b, beat), n(name), v, s.d(len));
    if (b >= 8) s.piano(s.t(b, beat) + 0.006, n(name) - 12, v * 0.85, s.d(len));
  }
  // low strings creep in under the piano, following its roots; violas from bar 4, violins from bar 6
  const roots = ['B1', 'B1', 'G1', 'F#1', 'B1', 'E1', 'C2', 'F#1', 'B1', 'C2'];
  for (let b = 2; b < 10; b++) {
    const r = n(roots[b]!);
    const v = 0.3 + 0.045 * (b - 2);
    s.play('loStr', 'bassSus', r, s.t(b) - 0.05, s.d(4) + 0.1, { vel: v, attack: b === 2 ? 2.5 : 0.5, release: 0.8 });
    s.play('loStr', 'celloSus', r + 12, s.t(b) - 0.05, s.d(4) + 0.1, { vel: v * 0.9, attack: b === 2 ? 2.5 : 0.5, release: 0.8 });
  }
  const viola: [number, string[]][] = [
    [4, ['D4', 'F#4']],
    [5, ['E4', 'G4']],
    [6, ['E4', 'G4']],
    [7, ['C#4', 'E4']],
    [8, ['D4', 'F#4']],
    [9, ['E4', 'F#4']],
  ];
  for (const [b, ms] of viola) for (const m of ms) s.play('hiStr', 'violaSus', n(m), s.t(b) - 0.08, s.d(4) + 0.12, { vel: 0.3 + 0.07 * (b - 4), attack: b === 4 ? 2 : 0.45, release: 0.9 });
  s.play('hiStr', 'violinSus', n('F#5'), s.t(6), s.d(8), { vel: 0.3, attack: s.d(6), release: 0.6 });
  s.play('hiStr', 'violinTrem', n('B5'), s.t(8), s.d(8) - 0.02, { vel: 0.7, attack: s.d(7.5), release: 0.08 });
  s.play('hiStr', 'violinTrem', n('F#5'), s.t(8), s.d(8) - 0.02, { vel: 0.65, attack: s.d(7.5), release: 0.08 });
  // low strings pulse into the hit
  for (let k = 0; k < 16; k++) {
    const t = s.t(8, k / 2);
    const r = k < 8 ? n('B1') : n('F#1');
    s.play('loStr', 'bassSpic', r, t, 0.3, { vel: 0.45 + 0.03 * k, release: 0.1 });
    s.play('loStr', 'celloSpic', r + 12, t, 0.3, { vel: 0.4 + 0.03 * k, release: 0.1 });
  }
  // the swell and the hit on the blackout (bar 10 = 38.0 s)
  const hitT = s.t(10);
  s.timpRoll(n('F#2'), hitT, s.d(6), 0.85);
  s.swellInto('cym', 1, hitT, 0.75);
  blackoutHit(s, hitT, 'B', n('B1'), ['D4', 'F#4', 'B4']);
  // after the blackout: a low drone thinning out, two high piano notes in the dark
  s.play('loStr', 'celloTrem', n('B2'), hitT + 1.2, 7, { vel: 0.45, attack: 1, release: 3 });
  s.piano(hitT + 4.5, n('F#5'), 0.32, 5);
  s.piano(hitT + 6.4, n('B4'), 0.28, 6);
}

/** The orchestral hit on the blackout, on `key` (power chord low, a minor triad up top), ringing out for ~10 s. */
function blackoutHit(s: Scene, t: number, _key: string, root: number, top: string[]): void {
  s.hit('giant', 1, t, 0.75);
  s.hit('giant', 2, t + 0.004, 0.55);
  s.hit('bdrum', 2, t, 0.7);
  s.hit('gong', 0, t, 0.65);
  s.timp(root + 12, t, 1);
  s.piano(t, root - 12, 0.95, 6, 0.002);
  s.piano(t + 0.004, root, 0.95, 6, 0.002);
  s.piano(t + 0.008, root + 7, 0.85, 6, 0.002);
  for (const [inst, m, v] of [
    ['bassSus', root + 12, 1],
    ['celloSus', root + 12, 1],
    ['celloSus', root + 19, 0.9],
    ['violaSus', root + 24, 0.85],
  ] as const) {
    s.play('loStr', inst, m, t, 1.6, { vel: v, attack: 0.012, release: 3, loose: 0.002 });
  }
  for (const m of top) s.play('hiStr', 'violinSus', n(m), t, 1.4, { vel: 0.8, attack: 0.02, release: 2.5, loose: 0.003 });
  s.play('lowBrass', 'tubaSus', root + 12, t, 1.5, { vel: 0.95, attack: 0.015, release: 2.5 });
  s.play('lowBrass', 'tbnSus', root + 24, t, 1.5, { vel: 0.95, attack: 0.015, release: 2.5 });
  s.play('lowBrass', 'tbnSus', root + 31, t, 1.5, { vel: 0.9, attack: 0.015, release: 2.5 });
  s.play('horns', 'hornSus', root + 24, t, 1.6, { vel: 0.9, attack: 0.02, release: 2.8 });
  s.play('horns', 'hornSus', root + 19, t, 1.6, { vel: 0.85, attack: 0.02, release: 2.8 });
}

// ---------------------------------------------------------------- intro 2: encircled (F# minor, 60 BPM)

/**
 * Slow motion: rolling left-hand piano arpeggios and a slow melody in octaves, cellos singing under it from bar 4,
 * a soft heartbeat on the bass drum, violas trembling; the last two bars climb in semitones over a timpani roll into
 * the hit on the blackout at 38.0 s.
 */
function introEncircled(s: Scene): void {
  const prog: Chord[] = [
    ch('F#1', 'F#2', 'C#3', 'A3'),
    ch('F#1', 'F#2', 'C#3', 'A3'),
    ch('D1', 'D2', 'A2', 'F#3'),
    ch('C#1', 'C#2', 'A2', 'E3'),
    ch('B0', 'B1', 'F#2', 'D3'),
    ch('C#1', 'C#2', 'F#2', 'A2'),
    ch('D1', 'D2', 'A2', 'F#3'),
    ch('E1', 'E2', 'B2', 'G#3'),
    ch('C#1', 'C#2', 'G#2', 'E#3'),
  ];
  // a low pedal octave before the first bar, so the shot does not open in silence
  s.piano(0.25, n('F#1'), 0.42, 1.65);
  s.piano(0.26, n('F#2'), 0.38, 1.65);
  // the arpeggio: up and back down through the chord, eighths (0.5 s)
  for (let b = 0; b < 9; b++) {
    const c = prog[b]!;
    const [a, b2, c3] = c.tones as [number, number, number];
    const arp = [a, b2, a + 12, c3, b2 + 12, c3, a + 12, b2];
    const base = b < 2 ? 0.34 : 0.38 + 0.03 * b;
    for (let i = 0; i < 8; i++) s.piano(s.t(b, i / 2), arp[i]!, base * (i === 0 ? 1.15 : i === 4 ? 1.05 : 0.9), s.d(i === 0 ? 4 : 1.2));
    if (b >= 2) s.piano(s.t(b) - 0.01, c.bass + 12, 0.4 + 0.03 * b, s.d(4) - 0.05);
  }
  // the melody in octaves (right hand)
  const mel: [number, string, number, number][] = [
    [1, 'C#5', 0, 2],
    [1, 'D5', 2, 1],
    [1, 'C#5', 3, 1],
    [2, 'A4', 0, 3],
    [2, 'F#4', 3, 1],
    [3, 'E4', 0, 2],
    [3, 'A4', 2, 2],
    [4, 'D5', 0, 3],
    [4, 'C#5', 3, 0.5],
    [4, 'B4', 3.5, 0.5],
    [5, 'C#5', 0, 2],
    [5, 'F#5', 2, 2],
    [6, 'E5', 0, 2.5],
    [6, 'D5', 2.5, 0.5],
    [6, 'A4', 3, 1],
    [7, 'B4', 0, 2],
    [7, 'G#4', 2, 2],
    [8, 'E#4', 0, 2],
    [8, 'G#4', 2, 1],
    [8, 'B4', 3, 1],
  ];
  for (const [b, name, beat, len] of mel) {
    const v = 0.48 + 0.035 * b;
    s.piano(s.t(b, beat), n(name), v, s.d(len) + 0.1);
    s.piano(s.t(b, beat) + 0.008, n(name) - 12, v * 0.82, s.d(len) + 0.1);
    // cellos sing the melody two octaves down from bar 4, legato
    if (b >= 4) s.play('loStr', 'celloSus', n(name) - 24, s.t(b, beat) - 0.06, s.d(len) + 0.1, { vel: 0.4 + 0.05 * (b - 4), attack: 0.18, release: 0.45 });
  }
  // basses on the roots from bar 2, violas trembling from bar 3
  for (let b = 2; b < 9; b++) {
    const c = prog[b]!;
    s.play('loStr', 'bassSus', c.bass + 12, s.t(b) - 0.06, s.d(4) + 0.1, { vel: 0.32 + 0.05 * (b - 2), attack: b === 2 ? 2.2 : 0.5, release: 0.8 });
  }
  for (let b = 3; b < 8; b++) {
    const c = prog[b]!;
    for (const m of [c.tones[1]! + 12, c.tones[2]! + 12]) s.play('hiStr', 'violaTrem', m, s.t(b) - 0.08, s.d(4) + 0.12, { vel: 0.26 + 0.05 * (b - 3), attack: b === 3 ? 2.5 : 0.6, release: 0.8 });
  }
  // a heartbeat on the bass drum (lub-dub), from bar 3, growing
  for (let b = 3; b < 9; b++) {
    for (const beat of [0, 2]) {
      const v = 0.4 + 0.07 * (b - 3);
      s.hit('bdrum', 3, s.t(b, beat), v * 0.9);
      s.hit('bdrum', 4, s.t(b, beat + 0.32), v * 0.6);
    }
  }
  // the climb: violins and violas tremolo, a semitone every half bar, through the last two bars
  for (let k = 0; k < 4; k++) {
    const t = s.t(7, k * 2);
    s.play('hiStr', 'violinTrem', n('C#5') + k, t - 0.05, s.d(2) + 0.1, { vel: 0.5 + 0.1 * k, attack: k === 0 ? 1.2 : 0.15, release: 0.25 });
    s.play('hiStr', 'violaTrem', n('G#4') + k, t - 0.05, s.d(2) + 0.1, { vel: 0.45 + 0.1 * k, attack: k === 0 ? 1.2 : 0.15, release: 0.25 });
  }
  for (let k = 0; k < 16; k++) s.play('loStr', 'celloSpic', n('C#3'), s.t(8, k / 4), 0.2, { vel: 0.4 + 0.035 * k, release: 0.08 });
  s.play('lowBrass', 'tbnSus', n('C#3'), s.t(7), s.d(8) - 0.03, { vel: 0.7, attack: s.d(7.5), release: 0.05 });
  s.play('horns', 'hornSus', n('G#3'), s.t(7), s.d(8) - 0.03, { vel: 0.7, attack: s.d(7.5), release: 0.05 });
  const hitT = s.t(9);
  s.timpRoll(n('C#3'), hitT, s.d(7), 0.9);
  s.swellInto('cym', 1, hitT, 0.75);
  blackoutHit(s, hitT, 'F#', n('F#1'), ['A4', 'C#5', 'F#5']);
  s.play('loStr', 'bassSus', n('F#2'), hitT + 1.4, 6, { vel: 0.4, attack: 1.5, release: 3 });
  s.piano(hitT + 3.6, n('A5'), 0.3, 5);
  s.piano(hitT + 5.2, n('F#5'), 0.27, 6);
}

// ---------------------------------------------------------------- the mission pieces (150 BPM, Michael's form)

/** Bar numbers of the sections (bars of 1.6 s from 1.48 s): 0 = opening, then 36.68 / 49.48 / 71.88 / 97.48 / 110.28 / 123.08, outro 139.08. */
const SEC = [0, 22, 30, 44, 60, 68, 76, 86, 99] as const;
const MISSION_T0 = 1.48;

/** The stalking rhythm: eighths in groups of 3 + 3 + 2 (accents on eighths 0, 3 and 6). */
const ACC = [0, 3, 6];

/** Harmony of a mission bar: the bass note under it and the chord tones (mid register). */
function missionChord(b: number): Chord {
  const P1: Chord[] = [ch('F#1', 'F#3', 'A3', 'C#4'), ch('F#1', 'F#3', 'A3', 'C#4'), ch('F#1', 'G3', 'B3', 'D4'), ch('F#1', 'F#3', 'A3', 'C#4')];
  const P2: Chord[] = [ch('F#1', 'F#3', 'A3', 'C#4'), ch('D1', 'F#3', 'A3', 'D4'), ch('B0', 'F#3', 'B3', 'D4'), ch('C#1', 'E#3', 'G#3', 'C#4')];
  const P3: Chord[] = [ch('D1', 'F#3', 'A3', 'D4'), ch('E1', 'G#3', 'B3', 'E4'), ch('F#1', 'F#3', 'A3', 'C#4'), ch('C#1', 'E#3', 'G#3', 'C#4')];
  const P5: Chord[] = [ch('B0', 'F#3', 'B3', 'D4'), ch('C#1', 'E#3', 'G#3', 'C#4'), ch('D1', 'F#3', 'A3', 'D4'), ch('E1', 'G#3', 'B3', 'E4')];
  const OUT: Chord[] = [ch('F#1', 'F#3', 'A3', 'C#4'), ch('D1', 'F#3', 'A3', 'D4'), ch('F#1', 'F#3', 'A3', 'C#4'), ch('F#1', 'G3', 'B3', 'D4')];
  if (b < SEC[1]) return P1[b % 4]!;
  if (b < SEC[2]) return P1[b % 4]!;
  if (b < SEC[3]) return P2[Math.floor((b - SEC[2]) / 2) % 4]!;
  if (b < SEC[4]) return P3[Math.floor((b - SEC[3]) / 2) % 4]!;
  if (b < SEC[5]) return P1[b % 4]!;
  if (b < SEC[6]) return P5[Math.floor((b - SEC[5]) / 2) % 4]!;
  if (b < SEC[7]) return P3[Math.floor((b - SEC[6]) / 2) % 4]!;
  return OUT[Math.floor((b - SEC[7]) / 2) % 4]!;
}

/** Bass note of the ostinato in bar `b`: the chord's bass, with a b2 (G) pickup at the end of every 4th pedal bar. */
function ostNote(b: number, eighth: number): number {
  const c = missionChord(b);
  const pedal = c.bass === n('F#1');
  if (pedal && b % 4 === 3 && eighth >= 6) return n('G1');
  return c.bass;
}

/** A bass note in the contrabass's low octave (E1 .. D#2): the recordings start at E1. */
const low = (m: number): number => {
  let x = m;
  while (x < 28) x += 12;
  while (x > 39) x -= 12;
  return x;
};

const sectionOf = (b: number): number => {
  let k = 0;
  for (let i = 0; i < SEC.length - 1; i++) if (b >= SEC[i]!) k = i;
  return k;
};

/** A melody written as [note, beats] laid from bar `at` on one instrument (legato: each note overlaps the next a little). */
function line(s: Scene, g: Group, inst: string, at: number, notes: [string, number][], vel: number, tr = 0, attack = 0.12): void {
  let beat = 0;
  for (const [name, len] of notes) {
    const t = s.t(at, beat);
    s.play(g, inst, n(name) + tr, t - 0.03, s.d(len) + 0.05, { vel: vel * (len >= 3 ? 1 : 0.94), attack, release: 0.4 });
    beat += len;
  }
}

/** Mission 1's theme (8 bars over D | E | F#m | C#, two bars each): long, tense, rising and falling back. */
const THEME1: [string, number][] = [
  ['F#3', 4],
  ['A3', 2],
  ['D4', 2],
  ['C#4', 3],
  ['B3', 1],
  ['G#3', 4],
  ['A3', 2],
  ['C#4', 2],
  ['F#4', 4],
  ['E#4', 2],
  ['C#4', 2],
  ['G#3', 4],
];

/** Mission 2's theme (8 bars over D | E | F#m | C#): dotted and military, for low brass. */
const THEME2: [string, number][] = [
  ['D3', 1.5],
  ['D3', 0.5],
  ['F#3', 1],
  ['A3', 1],
  ['A3', 3],
  ['F#3', 1],
  ['E3', 1.5],
  ['E3', 0.5],
  ['G#3', 1],
  ['B3', 1],
  ['B3', 3],
  ['G#3', 1],
  ['F#3', 1.5],
  ['F#3', 0.5],
  ['A3', 1],
  ['C#4', 1],
  ['C#4', 4],
  ['C#4', 2],
  ['B3', 1],
  ['G#3', 1],
  ['E#3', 4],
];

/** Mission 2's theme over F#m | D | Bm | C# (4 bars), for the second section. */
const THEME2A: [string, number][] = [
  ['F#3', 1.5],
  ['F#3', 0.5],
  ['A3', 1],
  ['C#4', 1],
  ['D4', 3],
  ['A3', 1],
  ['B3', 1.5],
  ['D4', 0.5],
  ['C#4', 1],
  ['B3', 1],
  ['C#4', 2],
  ['G#3', 2],
];

/** Mission fade and ending shared by both pieces. */
const MISSION_END = { length: 162, fade: [152, 160.7] as [number, number] };

/**
 * Mission 1: prowl. Close to the original's restrained suspense: a low 3 + 3 + 2 stalking pulse on basses and
 * cellos with a quiet sub under it, a heartbeat drum, a b2 rub that keeps tightening; a ticking viola figure, then a
 * slow theme on horns and cellos; a breakdown where a piano figure takes over; the theme again higher; an outro that
 * keeps stalking into the fade.
 */
function missionProwl(s: Scene): void {
  const last = SEC[8];
  // the swell into the first downbeat
  s.play('loStr', 'bassSus', n('F#1'), 0, s.t(0) + 0.05, { vel: 0.55, attack: 1.3, release: 0.15 });
  s.play('loStr', 'celloSus', n('F#2'), 0, s.t(0) + 0.05, { vel: 0.45, attack: 1.3, release: 0.15 });
  for (let b = 0; b < last; b++) {
    const sec = sectionOf(b);
    const c = missionChord(b);
    // the ostinato: accents always, the eighths between them from bar 8 (quieter in the breakdown)
    for (let e = 0; e < 8; e++) {
      const acc = ACC.includes(e);
      if (!acc && b < 8) continue;
      const m = low(ostNote(b, e));
      const base = sec === 4 ? 0.5 : 0.62 + 0.015 * Math.min(sec, 6);
      const v = acc ? base + (e === 0 ? 0.06 : 0) : base * 0.55;
      const t = s.t(b, e / 2);
      s.play('loStr', 'bassSpic', m, t, 0.22, { vel: v, release: 0.12 });
      s.play('loStr', 'celloSpic', m + 12, t, 0.22, { vel: v * 0.85, release: 0.12 });
      if (acc) s.sub(t, 0.32, m, sec === 4 ? 0.1 : 0.14);
    }
    // drones re-bowed every 4 bars
    if (b % 4 === 0) {
      const dur = s.d(16) + 0.15;
      s.play('loStr', 'bassSus', low(c.bass), s.t(b) - 0.05, dur, { vel: 0.42, attack: 0.6, release: 0.8 });
      s.play('loStr', 'celloSus', low(c.bass) + 12, s.t(b) - 0.05, dur, { vel: 0.36, attack: 0.6, release: 0.8 });
    }
    // heartbeat drum on the accents from bar 4
    if (b >= 4) {
      s.hit('bdrum', 3, s.t(b), 0.55 + (sec >= 3 ? 0.1 : 0));
      s.hit('bdrum', 4, s.t(b, 1.5), 0.42);
      if (sec >= 2 && sec !== 4) s.hit('bdrum', 4, s.t(b, 3), 0.38);
    }
    // a piano drip in the dark: a high C# on beat 3 of every other bar (opening and outro)
    if ((sec === 0 && b >= 4) || sec === 7) if (b % 2 === 1) s.piano(s.t(b, 2), n('C#6'), 0.3, s.d(2));
    // ticking violas (section 2 on, not in the breakdown)
    if (sec >= 1 && sec !== 4) {
      for (let e = 0; e < 8; e++) {
        const acc = ACC.includes(e);
        s.play('hiStr', 'violaSpic', n('C#5'), s.t(b, e / 2), 0.18, { vel: acc ? 0.42 : 0.28, release: 0.08 });
      }
    }
    // the sticks on the big drum join in the 3 + 3 + 2 (sections 3, 5, 6)
    if (sec === 3 || sec === 5 || sec === 6) {
      for (const [i, v] of [[0, 1], [3, 0.7], [6, 0.8], [7, 0.45]] as const) s.hit('giantStick', i === 0 ? 1 : 0, s.t(b, i / 2), 0.36 * v);
      if (b % 2 === 0) s.timp(c.bass + 12, s.t(b), 0.62);
    }
    // harmony pads from section 2 (violas and low violins), every 2 bars
    if (sec >= 2 && b % 2 === 0) {
      const v = sec === 4 ? 0.3 : 0.34 + 0.02 * sec;
      for (const [i, inst] of [[0, 'violaSus'], [1, 'violaSus'], [2, 'violinSus']] as const) s.play('hiStr', inst, c.tones[i]!, s.t(b) - 0.08, s.d(8) + 0.1, { vel: v, attack: 0.5, release: 0.7 });
    }
  }
  // the b2 rub: violas tremolo F# against G, swelling over the end of the opening
  for (const [m, v] of [['F#4', 0.45], ['G4', 0.38]] as const) s.play('hiStr', 'violaTrem', n(m), s.t(14), s.d(32) - 0.05, { vel: v, attack: s.d(28), release: 0.25 });
  // section 1: a long horn note swelling, the piano answering on the downbeats
  s.play('horns', 'hornSus', n('F#3'), s.t(26), s.d(16), { vel: 0.48, attack: s.d(12), release: 0.6 });
  s.play('horns', 'hornSus', n('C#4'), s.t(28), s.d(8), { vel: 0.4, attack: s.d(6), release: 0.6 });
  for (const b of [0, 8, 16, 22, 30, 60, 86]) {
    const r = low(missionChord(b).bass);
    s.piano(s.t(b), r, 0.62, s.d(6));
    s.piano(s.t(b) + 0.006, r + 12, 0.55, s.d(6));
  }
  // section 3: the theme on horns, cellos an octave below
  line(s, 'horns', 'hornSus', SEC[3], THEME1, 0.62, -12);
  line(s, 'loStr', 'celloSus', SEC[3], THEME1, 0.5, -12, 0.08);
  line(s, 'horns', 'hornSus', SEC[3] + 8, THEME1, 0.68, -12);
  line(s, 'loStr', 'celloSus', SEC[3] + 8, THEME1, 0.55, -12, 0.08);
  line(s, 'hiStr', 'violaSus', SEC[3] + 8, THEME1, 0.45, 0, 0.12);
  // section 4 (the breakdown): a piano figure over the pulse, a high tremolo rub swelling
  for (let b = SEC[4]; b < SEC[5]; b++) {
    const fig = b % 4 === 3 ? ['F#4', 'A4', 'D5', 'A4', 'G4', 'A4', 'D5', 'B4'] : ['F#4', 'A4', 'C#5', 'A4', 'F#4', 'A4', 'D5', 'C#5'];
    for (let e = 0; e < 8; e++) s.piano(s.t(b, e / 2), n(fig[e]!), (e === 0 ? 0.56 : 0.46) + 0.01 * (b - SEC[4]), s.d(0.6));
  }
  s.play('hiStr', 'violinTrem', n('F#5'), s.t(SEC[4]), s.d(32) - 0.05, { vel: 0.55, attack: s.d(24), release: 0.3 });
  s.play('hiStr', 'violinTrem', n('G5'), s.t(SEC[4] + 4), s.d(16) - 0.05, { vel: 0.45, attack: s.d(14), release: 0.3 });
  // section 5: low brass swells rising with the harmony
  for (let b = SEC[5]; b < SEC[6]; b += 2) {
    const c = missionChord(b);
    s.play('lowBrass', 'tbnSus', c.bass + 24, s.t(b), s.d(8) - 0.1, { vel: 0.5 + 0.04 * (b - SEC[5]) / 2, attack: s.d(5), release: 0.5 });
    s.play('horns', 'hornSus', c.tones[1]!, s.t(b), s.d(8) - 0.1, { vel: 0.45 + 0.04 * (b - SEC[5]) / 2, attack: s.d(5), release: 0.5 });
  }
  s.timpRoll(n('C#3'), s.t(SEC[6]), s.d(8), 0.7);
  // section 6: the theme higher, on violins and horns, cellos below
  line(s, 'hiStr', 'violinSus', SEC[6], THEME1, 0.6, 12, 0.15);
  line(s, 'hiStr', 'violaSus', SEC[6], THEME1, 0.5, 0, 0.12);
  line(s, 'horns', 'hornSus', SEC[6], THEME1, 0.7, -12);
  line(s, 'loStr', 'celloSus', SEC[6], THEME1, 0.55, -12, 0.08);
  for (const b of [SEC[3], SEC[3] + 8, SEC[6], SEC[6] + 8]) s.swellInto('cym', 1, s.t(b), 0.4);
  // the outro: a held F# minor chord, the first half of the theme on a far horn
  line(s, 'horns', 'hornSus', SEC[7] + 2, THEME1.slice(0, 4), 0.45, -12);
  for (const m of ['F#3', 'A3', 'C#4', 'F#4']) s.play('hiStr', m === 'F#3' ? 'violaSus' : 'violinSus', n(m), s.t(SEC[7] + 6), s.d(28), { vel: 0.38, attack: 2, release: 2 });
}

/**
 * Mission 2: onslaught. The same form as an epic hybrid orchestral score: driving sixteenth-note strings, big drums,
 * low brass. An opening hit, then the pulse; a military snare and a dotted low brass theme; a breakdown with a deep
 * brass blast and the piano; a snare roll and rising brass back into the theme at full size; brass chords into the fade.
 */
function missionOnslaught(s: Scene): void {
  const last = SEC[8];
  s.play('loStr', 'celloTrem', n('F#2'), 0, s.t(0) + 0.05, { vel: 0.6, attack: 1.35, release: 0.1 });
  s.timpRoll(n('F#2'), s.t(0), 1.45, 0.7);
  // the opening hit on the first downbeat
  s.hit('giant', 1, s.t(0), 0.95);
  s.hit('bdrum', 2, s.t(0), 0.85);
  s.hit('gong', 0, s.t(0), 0.5);
  for (const [inst, m, v] of [['tubaSus', 'F#1', 0.9], ['tbnSus', 'F#2', 0.9], ['tbnSus', 'C#3', 0.85], ['hornSus', 'F#3', 0.85]] as const) {
    s.play(inst === 'hornSus' ? 'horns' : 'lowBrass', inst, n(m), s.t(0), 1.2, { vel: v, attack: 0.015, release: 2 });
  }
  // a 3 + 3 + 2 accent shape on sixteenths: accents on sixteenths 0, 6, 12 of each bar
  const acc16 = [0, 6, 12];
  for (let b = 0; b < last; b++) {
    const sec = sectionOf(b);
    const c = missionChord(b);
    const breakdown = sec === 4;
    const energy = [0.92, 0.9, 0.9, 0.95, 0.7, 0.88, 1, 0.9][sec]!;
    // driving sixteenths: cellos and basses (violas an octave up from bar 8, violins in the big sections)
    for (let i = 0; i < 16; i++) {
      const acc = acc16.includes(i);
      if (breakdown && !acc && i % 2 === 1) continue;
      const m = low(ostNote(b, i / 2));
      const v = (acc ? 0.86 : 0.5 + (i % 4 === 0 ? 0.08 : 0)) * energy;
      const t = s.t(b, i / 4);
      s.play('loStr', 'celloSpic', m + 12, t, 0.13, { vel: v, release: 0.08, loose: 0.004 });
      if (acc || i % 2 === 0) s.play('loStr', 'bassSpic', m, t, 0.15, { vel: v * 0.95, release: 0.08, loose: 0.004 });
      if (b >= 4 && !breakdown) s.play('hiStr', 'violaSpic', m + 24, t, 0.12, { vel: v * 0.8, release: 0.07, loose: 0.004 });
      if ((sec === 3 || sec === 6) && i % 2 === 0) s.play('hiStr', 'violinSpic', c.tones[(i / 2) % 3]! + 24, t, 0.12, { vel: v * 0.72, release: 0.07, loose: 0.004 });
      if (acc) s.sub(t, 0.3, m, breakdown ? 0.12 : 0.17);
    }
    // big drums: the giant drum on the accents, sticks filling, the bass drum on the downbeat
    if (!breakdown) {
      for (const [i, v] of [[0, 1], [6, 0.8], [12, 0.85]] as const) s.hit('giant', v === 1 ? 1 + (b % 2) : 3, s.t(b, i / 4), 0.62 * v * energy);
      if (sec >= 1) for (const [i, v] of [[3, 0.5], [9, 0.55], [14, 0.6], [15, 0.7]] as const) s.hit('giantStick', i === 15 ? 1 : 2, s.t(b, i / 4), 0.5 * v * energy);
      if (b % 2 === 0) s.hit('bdrum', 1, s.t(b), 0.55 * energy);
      if (b % 2 === 0) s.timp(c.bass + 12, s.t(b), 0.7 * energy);
    } else {
      s.hit('bdrum', 3, s.t(b), 0.55);
      s.hit('bdrum', 4, s.t(b, 1.5), 0.4);
      if (b % 2 === 1) s.timp(n('F#2'), s.t(b, 3), 0.55);
    }
    // the military snare (sections 1, 2, 3, 6; alternating drums and soft ghosts)
    if (sec === 1 || sec === 2 || sec === 3 || sec === 6) {
      const pat = b % 2 === 0 ? 'X..g..x.g.X..gx.' : 'X..g..x.g.X.gxxg';
      for (let i = 0; i < 16; i++) {
        const k = pat[i];
        if (k === '.' || k === undefined) continue;
        const id = k === 'g' ? (i % 4 === 1 ? 'snare1pp' : 'snare2p') : i % 2 === 0 ? 'snare1' : 'snare2';
        const v = k === 'X' ? 0.5 : k === 'x' ? 0.36 : 0.2;
        s.hit(id, 0, s.t(b, i / 4), v * energy, 0, 'perc', true);
      }
    }
    // short horn stabs on the accents (opening from bar 12, sections 2, 5)
    if ((sec === 0 && b >= 12) || sec === 2 || sec === 5) {
      for (const i of acc16) for (const m of [c.tones[0]!, c.tones[2]!]) s.play('horns', 'hornStac', m, s.t(b, i / 4), 0.2, { vel: 0.66 * energy + 0.1, release: 0.1 });
    }
  }
  // the build into section 1: low brass crescendo, cymbal swell
  for (const [inst, m] of [['tbnSus', 'F#2'], ['tbnSus', 'C#3'], ['tubaSus', 'F#1']] as const) s.play('lowBrass', inst, n(m), s.t(18), s.d(16) - 0.05, { vel: 0.85, attack: s.d(15), release: 0.06 });
  s.swellInto('cym', 1, s.t(SEC[1]), 0.6);
  // section 1: the theme's first half on low brass, in unison
  line(s, 'lowBrass', 'tbnSus', SEC[1], THEME2A, 0.78, 0, 0.04);
  line(s, 'lowBrass', 'tubaSus', SEC[1], THEME2A, 0.7, -12, 0.04);
  line(s, 'lowBrass', 'tbnSus', SEC[1] + 4, THEME2A, 0.82, 0, 0.04);
  line(s, 'lowBrass', 'tubaSus', SEC[1] + 4, THEME2A, 0.74, -12, 0.04);
  // section 2: the same theme with horns an octave up, twice (and a half)
  for (const at of [SEC[2], SEC[2] + 4, SEC[2] + 8]) {
    line(s, 'lowBrass', 'tbnSus', at, THEME2A, 0.85, -12, 0.04);
    line(s, 'lowBrass', 'tubaSus', at, THEME2A, 0.78, -12, 0.04);
    line(s, 'horns', 'hornSus', at, THEME2A, 0.8, 0, 0.05);
  }
  for (const b of [SEC[2] + 12]) {
    for (const [inst, m] of [['tbnSus', 'C#3'], ['hornSus', 'G#3'], ['hornSus', 'E#4']] as const) s.play(inst === 'tbnSus' ? 'lowBrass' : 'horns', inst, n(m), s.t(b), s.d(8) - 0.05, { vel: 0.75, attack: s.d(4), release: 0.1 });
  }
  // section 3: the full theme, brass and cellos, violins holding a high line above
  for (const at of [SEC[3], SEC[3] + 8]) {
    line(s, 'lowBrass', 'tbnSus', at, THEME2, 0.9, -12, 0.03);
    line(s, 'lowBrass', 'tubaSus', at, THEME2, 0.8, -12, 0.03);
    line(s, 'horns', 'hornSus', at, THEME2, 0.88, 0, 0.04);
    line(s, 'loStr', 'celloSus', at, THEME2, 0.75, 0, 0.05);
    const high: [string, number][] = [['F#5', 8], ['G#5', 8], ['A5', 8], ['G#5', 8]];
    line(s, 'hiStr', 'violinSus', at, high, 0.62, 0, 0.4);
  }
  for (const b of [SEC[3], SEC[3] + 8, SEC[4], SEC[6], SEC[6] + 4, SEC[6] + 8]) s.swellInto('cym', 1, s.t(b), 0.65);
  s.timpRoll(n('F#2'), s.t(SEC[3] + 8), s.d(6), 0.75);
  // section 4 (the breakdown): a deep brass blast, then the piano and a tremolo over the pulse
  for (const [inst, m, v] of [['tubaSus', 'F#1', 1], ['tbnSus', 'F#2', 1], ['tbnSus', 'C#3', 0.9], ['bassSus', 'F#2', 0.9]] as const) {
    s.play(inst === 'bassSus' ? 'loStr' : 'lowBrass', inst, n(m), s.t(SEC[4]), s.d(10), { vel: v, attack: 0.02, release: 2.5 });
  }
  s.hit('giant', 1, s.t(SEC[4]), 0.9);
  s.hit('gong', 0, s.t(SEC[4]), 0.45);
  for (let b = SEC[4]; b < SEC[5]; b++) {
    const fig = ['F#2', 'C#3', 'F#3', 'A3', 'C#4', 'A3', 'F#3', 'C#3'];
    for (let e = 0; e < 8; e++) s.piano(s.t(b, e / 2), n(fig[e]!) + (b % 4 === 3 && e >= 4 ? 1 : 0), e === 0 ? 0.66 : 0.52, s.d(0.7));
  }
  s.play('hiStr', 'violinTrem', n('C#5'), s.t(SEC[4] + 2), s.d(24) - 0.05, { vel: 0.6, attack: s.d(16), release: 0.2 });
  s.play('hiStr', 'violinTrem', n('D5'), s.t(SEC[4] + 4), s.d(16) - 0.05, { vel: 0.5, attack: s.d(12), release: 0.2 });
  // section 5: a snare roll growing over 8 bars, rising brass swells, the sticks in sixteenths
  for (let b = SEC[5]; b < SEC[6]; b++) {
    const k = b - SEC[5];
    for (let i = 0; i < 16; i++) {
      const v = 0.12 + 0.045 * (k + i / 16);
      s.hit(i % 2 ? 'snare2p' : 'snare1pp', 0, s.t(b, i / 4), v, 0, 'perc', true);
      if (k >= 4) s.hit('giantStick', i % 4 === 0 ? 1 : 2, s.t(b, i / 4), 0.18 + 0.05 * (k - 4) + (i % 4 === 0 ? 0.1 : 0));
    }
  }
  for (let b = SEC[5]; b < SEC[6]; b += 2) {
    const c = missionChord(b);
    const k = (b - SEC[5]) / 2;
    s.play('lowBrass', 'tbnSus', c.bass + 24, s.t(b), s.d(8) - 0.08, { vel: 0.6 + 0.08 * k, attack: s.d(6), release: 0.15 });
    s.play('lowBrass', 'tubaSus', c.bass + 12, s.t(b), s.d(8) - 0.08, { vel: 0.55 + 0.08 * k, attack: s.d(6), release: 0.15 });
    for (const i of [0, 1, 2]) s.play('horns', 'hornSus', c.tones[i]!, s.t(b), s.d(8) - 0.08, { vel: 0.5 + 0.08 * k, attack: s.d(6), release: 0.15 });
  }
  s.timpRoll(n('C#3'), s.t(SEC[6]), s.d(8), 0.9);
  // section 6: the climax, the theme in brass with violins on top, a gong on the downbeat
  s.hit('gong', 0, s.t(SEC[6]), 0.55);
  s.hit('giant', 2, s.t(SEC[6]), 0.9);
  line(s, 'lowBrass', 'tbnSus', SEC[6], THEME2, 0.95, -12, 0.03);
  line(s, 'lowBrass', 'tubaSus', SEC[6], THEME2, 0.85, -12, 0.03);
  line(s, 'horns', 'hornSus', SEC[6], THEME2, 0.92, 0, 0.04);
  line(s, 'hiStr', 'violinSus', SEC[6], THEME2, 0.72, 24, 0.06);
  line(s, 'loStr', 'celloSus', SEC[6], THEME2, 0.8, 0, 0.05);
  // the last two bars of section 6: everything on the dominant
  for (const [inst, m] of [['tbnSus', 'C#3'], ['tubaSus', 'C#2'], ['hornSus', 'G#3'], ['hornSus', 'C#4']] as const) s.play(inst.startsWith('horn') ? 'horns' : 'lowBrass', inst, n(m), s.t(SEC[6] + 8), s.d(8) - 0.05, { vel: 0.85, attack: s.d(3), release: 0.1 });
  // the outro: brass chords, two bars each, softer each time, into the fade
  for (let b = SEC[7]; b < last; b += 2) {
    const c = missionChord(b);
    const k = (b - SEC[7]) / 2;
    const v = Math.max(0.4, 0.8 - 0.05 * k);
    s.play('lowBrass', 'tbnSus', c.bass + 24, s.t(b), s.d(8) - 0.05, { vel: v, attack: 0.25, release: 0.6 });
    s.play('lowBrass', 'tubaSus', c.bass + 12, s.t(b), s.d(8) - 0.05, { vel: v * 0.9, attack: 0.25, release: 0.6 });
    for (const i of [0, 1, 2]) s.play('horns', 'hornSus', c.tones[i]!, s.t(b), s.d(8) - 0.05, { vel: v * 0.9, attack: 0.3, release: 0.6 });
    for (const i of [1, 2]) s.play('hiStr', 'violinSus', c.tones[i]! + 12, s.t(b), s.d(8) - 0.05, { vel: v * 0.75, attack: 0.4, release: 0.6 });
  }
}

export const SCENE_PIECES: readonly ScenePiece[] = [
  {
    id: 'intro1',
    file: 'intro-1-vigil',
    about: 'Opening shot, B minor, 64 BPM: solo piano figure and melody, low strings creeping in, swell and full orchestral hit at 38.0 s, ring-out.',
    length: 52,
    fade: [47, 52],
    levels: { piano: 0, hiStr: -3, loStr: -2, horns: -5, lowBrass: -5, perc: -2, sub: -6 },
    bpm: 64,
    t0: 0.5,
    render: introVigil,
  },
  {
    id: 'intro2',
    file: 'intro-2-encircled',
    about: 'Opening shot, F# minor, 60 BPM: rolling piano arpeggios and an octave melody, cellos and a heartbeat drum, a semitone climb and hit at 38.0 s.',
    length: 52,
    fade: [47, 52],
    levels: { piano: 0, hiStr: -3, loStr: -2, horns: -5, lowBrass: -5, perc: -2, sub: -6 },
    bpm: 60,
    t0: 2,
    render: introEncircled,
  },
  {
    id: 'mission1',
    file: 'mission-1-prowl',
    about: 'Mission, F# minor, 150 BPM on the measured form: restrained stalking pulse, heartbeat drum, horn theme, piano breakdown.',
    ...MISSION_END,
    levels: { piano: -2, hiStr: -3, loStr: 0, horns: -2, lowBrass: -2, perc: 0, sub: -7 },
    bpm: 150,
    t0: MISSION_T0,
    render: missionProwl,
  },
  {
    id: 'mission2',
    file: 'mission-2-onslaught',
    about: 'Mission, F# minor, 150 BPM on the measured form: epic hybrid orchestra, driving short strings, big drums, military snare, low brass theme.',
    ...MISSION_END,
    levels: { piano: -1, hiStr: -2, loStr: 0, horns: -6, lowBrass: -2, perc: 6, sub: -7 },
    bpm: 150,
    t0: MISSION_T0,
    render: missionOnslaught,
  },
];
