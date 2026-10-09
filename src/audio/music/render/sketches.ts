/**
 * The three V3 sketches (music direction v3 Section 8): 60-second loops, each as three stacked stems (calm, caution,
 * alert) that the player crossfades by threat. Texture and rhythm first; harmony from drones, sub, bowed and plucked
 * bass and processed pads; no lead line. Everything is built from the CC0 recordings in `scripts/music/samples.json`.
 *
 * Each stem is a set of layers placed at a loudness relative to the stem (`lay`, gated K-weighted dB), so the balance
 * below reads as a mix sheet: 0 is the stem's main layer, -10 is clearly underneath it.
 *
 * A "Drift": sparse and ambient. B "Breakline": breakbeat-led. C "Foundry": heavy and industrial.
 * Written for this project; no track, riff, beat or sample from any game or record is reproduced.
 */
import { Rng } from '../rng';
import { addInto, circular, dbToGain, filterStereo, granular, place, semisTo, stereo, secs, type Src, type Stereo } from './canvas';
import { chopBar, Grid, lay, performBreak, straight, type Chop } from './kit';
import { delayWet, dropOut, dust, monoLows, reverbWet, reverseRegion, stutter, tape, tapeStop, type ReverbOpts } from './fx';

export type StemId = 'calm' | 'caution' | 'alert';
export const STEM_IDS: readonly StemId[] = ['calm', 'caution', 'alert'];
export type SketchId = 'A' | 'B' | 'C';

export interface SketchMeta {
  id: SketchId;
  name: string;
  bpm: number;
  bars: number;
  about: string;
}

export const SKETCHES: readonly SketchMeta[] = [
  { id: 'A', name: 'Drift', bpm: 80, bars: 20, about: 'Sparse and ambient. Bowed-bass drone, sub, motor hum and dust, far-off metal in a long reverb. Caution adds plucked bass through a dub delay and a soft half-time pulse. Alert adds a brushed, chopped break and distorted bowed bass.' },
  { id: 'B', name: 'Breakline', bpm: 96, bars: 24, about: 'Breakbeat-led. The break is always there: muffled behind a wall at calm, half-time and filtered at caution, fully chopped with stutters and a tape-stop at alert, over sub and gritty bowed bass.' },
  { id: 'C', name: 'Foundry', bpm: 84, bars: 21, about: 'Heavy and industrial. Motor drone, chain grind and a frozen metal ring. Caution adds a slow pulse of big drum and anvil, creaks and a tritone tremolo. Alert adds a crushed, layered break, a distorted bass riff and timpani.' },
];

/** The sample bank: source by id (throws on an unknown id). */
export type Bank = (id: string) => Src;

/** Roots (Hz) of the pitched sources, measured (`detectPitch`) and named. VSCO bass and cello names run an octave low. */
export const ROOTS: Record<string, number> = {
  bassPizzD: 73.42, bassPizzD2: 73.42, bassPizzC: 65.41, bassPizzG: 49.0, bassPizzA: 110.0, bassPizzBb: 58.27, bassPizzE: 82.41,
  bassArcoD: 73.42, bassArcoDf: 73.42, bassArcoBb: 58.27, bassArcoG: 49.0, bassArcoA: 110.0,
  bassTremC: 65.9, bassTremGs: 102.5, bassTremE: 81.9,
  celloD2: 146.83, celloA2: 220.0, celloD4: 587.33, celloTremD2: 146.83, celloTremA2: 220.0,
  pianoC2: 65.41, pianoG2: 98.0, pianoC3: 130.81, pianoG3: 196.0, pianoC4: 261.63, pianoG1: 49.0,
  glassD5: 587.33, glassDs4: 632.7, timpD: 59.8,
};

/** MIDI note numbers used below (D minor / D Phrygian). */
const N = { D1: 26, Eb1: 27, C2: 36, D2: 38, Eb2: 39, F2: 41, Ab2: 44, A2: 45, Bb2: 46, D3: 50, F3: 53 };

export interface Rendered {
  meta: SketchMeta;
  stems: Record<StemId, Stereo>;
}

/** Shared finishing: rumble cut, lows to mono, tape (wow whole cycles per loop, saturation, soft top). */
function finish(s: Stereo, tapeDrive: number, lp: number, wowCycles: number): Stereo {
  const clean = circular(s, 0.5, (x) => filterStereo(x, 'highpass', 32, 0.7));
  return tape(monoLows(clean), { drive: tapeDrive, wow: 0.0009, wowCycles, flutter: 0.00006, flutterCycles: 600, lp });
}

/** Dry plus its own reverb at `wet`. */
function verb(dry: Stereo, wet: number, o: ReverbOpts): Stereo {
  addInto(dry, reverbWet(dry, o), wet);
  return dry;
}

/**
 * The alert stem's tension layer, shared by all three sketches: a dissonant tremolo-string cluster (root, minor second,
 * tritone), an accelerating tick and timpani roll into every fourth bar line, a relentless distorted pulse, a two-note
 * tritone alarm in metal, and electrical crackle. Rhythm and cluster, no tune.
 */
function tension(g: Grid, bank: Bank, rng: Rng, o: { pedal: boolean; bars: number; riserBars: number[] }): Stereo {
  const out = stereo(secs(g.loop));
  const L = (): Stereo => stereo(secs(g.loop));
  // cluster: D, Eb and Ab together on the bowed-tremolo cello, an octave up for the shriek
  const cl = L();
  const tr = bank('celloTremD2');
  for (const [semis, gain] of [[-12, 1], [-11, 0.8], [-6, 0.7], [0, 0.5], [1, 0.4], [6, 0.35]] as [number, number][]) {
    granular(cl, tr, { t: 0, dur: g.loop, from: 0.8, to: 5.5, grain: 0.3, density: 16, semis, cents: 14, jitter: 0.25, spread: 1, gain }, rng);
  }
  filterStereo(cl, 'highpass', 90, 0.7);
  addInto(out, filterStereo(cl, 'lowpass', 3600, 0.7), dbToGain(-5));
  // risers: reversed bowed cymbal, then ticks and a timpani roll that accelerate into the bar line
  const rs = L();
  const bow = bank('cymbBow3');
  const tick = [bank('woodClick'), bank('hatClose'), bank('snareClick')];
  const timp = bank('timpD');
  for (const bar of o.riserBars) {
    const T = g.b(bar, 0);
    place(rs, bow, { t: T - g.bar * 2, dur: g.bar * 2, reverse: true, semis: -3, lp: 5000, fadeIn: g.bar * 1.5, gain: 0.9 });
    const gaps = [...Array<number>(4).fill(g.beat / 2), ...Array<number>(4).fill(g.beat / 4), ...Array<number>(8).fill(g.beat / 8)];
    let t = T;
    for (let i = gaps.length - 1; i >= 0; i--) {
      t -= gaps[i]!;
      const k = i / gaps.length;
      place(rs, tick[i % 3]!, { t, pan: rng.range(-0.5, 0.5), semis: k * 7, hp: 1200, gain: 0.35 + 0.65 * k, dur: 0.15 });
      if (i % 2 === 0) place(rs, timp, { t, pan: 0, semis: semisTo(timp, N.D2) + k * 3, lp: 1500, gain: 0.45 + 0.55 * k, dur: 0.5 });
    }
  }
  addInto(out, verb(rs, 0.25, { rt60: 1.8, damp: 4500, size: 1.2, hp: 250 }), dbToGain(-6));
  // pulse: a distorted pizzicato root on every eighth, the engine under the break
  if (o.pedal) {
    const pd = L();
    const pz = bank('bassPizzD2');
    for (let bar = 0; bar < o.bars; bar++) for (let e = 0; e < 8; e++) place(pd, pz, { t: g.at(bar, e * 2), pan: 0, semis: semisTo(pz, bar % 4 === 3 && e > 5 ? N.Eb2 : N.D2), drive: 8, lp: 2200, hp: 50, gain: e % 2 ? 0.45 : 0.8, dur: g.beat * 0.35 });
    addInto(out, pd, dbToGain(-5));
  }
  // alarm: two metal notes a tritone apart, on the off-beats, the second a little quieter
  const al = L();
  const m = bank('metal3');
  for (let bar = 0; bar < o.bars; bar++) {
    place(al, m, { t: g.at(bar, 4), pan: -0.3, semis: -5, hp: 500, lp: 6000, drive: 2, gain: 0.8, dur: 0.35 });
    place(al, m, { t: g.at(bar, 12), pan: 0.3, semis: 1, hp: 500, lp: 6000, drive: 2, gain: 0.65, dur: 0.35 });
  }
  addInto(out, verb(al, 0.4, { rt60: 1.4, damp: 5000, size: 1, hp: 400 }), dbToGain(-12));
  // crackle
  const zp = L();
  const zaps = ['zap1', 'zap5', 'zap9', 'zap12'].map(bank);
  for (let bar = 0; bar < o.bars; bar++) for (let i = 0; i < 16; i++) if (i % 2 && rng.chance(0.13)) place(zp, rng.pick(zaps), { t: g.at(bar, i), pan: rng.range(-0.9, 0.9), semis: rng.range(-7, 0), hp: 1500, gain: rng.range(0.4, 0.8), dur: 0.25 });
  addInto(out, zp, dbToGain(-14));
  return out;
}

// ---------------------------------------------------------------------------------------------------------- A Drift

function sketchA(bank: Bank, seed: number): Record<StemId, Stereo> {
  const g = new Grid(80, 20, 0.16);
  const n = secs(g.loop);
  const rng = new Rng(seed).fork('A');
  const L = (): Stereo => stereo(n);

  // calm: bowed-bass drone with a sub under it, a cello bed leaning to Eb and A and back, motor hum, dust, far metal
  const calm = L();
  const arco = bank('bassArcoDf');
  const drone = L();
  granular(drone, arco, { t: 0, dur: g.loop, from: 2.5, to: 11, grain: 0.42, density: 16, cents: 5, jitter: 0.2, spread: 0.5 }, rng);
  lay(calm, filterStereo(drone, 'lowpass', 1400, 0.7), 0);
  const sub = L();
  granular(sub, arco, { t: 0, dur: g.loop, from: 3, to: 9, grain: 0.6, density: 10, semis: -12, cents: 2, jitter: 0.3, spread: 0.1 }, rng);
  lay(calm, filterStereo(sub, 'lowpass', 110, 0.8), -15);
  const cello = bank('celloD2');
  const bed = L();
  granular(bed, cello, { t: 0, dur: g.loop, from: 1.2, to: 7.5, grain: 0.5, density: 12, semis: -12, cents: 8, jitter: 0.3, spread: 0.9 }, rng);
  granular(bed, cello, { t: g.b(6, 0), dur: g.bar * 5, from: 1.5, to: 6, grain: 0.5, density: 10, semis: -11, cents: 8, jitter: 0.3, spread: 0.9, gain: 0.6, edge: g.bar * 2 }, rng);
  granular(bed, cello, { t: g.b(14, 0), dur: g.bar * 5, from: 1.5, to: 6, grain: 0.5, density: 10, semis: semisTo(cello, N.A2), cents: 8, jitter: 0.3, spread: 0.9, gain: 0.5, edge: g.bar * 2 }, rng);
  lay(calm, filterStereo(bed, 'lowpass', 1100, 0.7), -5);
  const hum = L();
  granular(hum, bank('blower'), { t: 0, dur: g.loop, from: 4, to: 30, grain: 0.7, density: 8, semis: -5, jitter: 1, spread: 0.7 }, rng);
  filterStereo(hum, 'highpass', 70, 0.7);
  filterStereo(hum, 'lowpass', 900, 0.9);
  filterStereo(hum, 'peaking', 220, 3, 8);
  lay(calm, hum, -14);
  const far = L();
  const metals = ['metal3', 'metal6', 'metal9', 'metal13'].map(bank);
  for (const t of [g.b(2, 1.5), g.b(9, 2.75), g.b(13, 0.5), g.b(18, 3.25)]) place(far, rng.pick(metals), { t, pan: rng.range(-0.8, 0.8), semis: rng.range(-12, -6), lp: 2800, gain: rng.range(0.6, 1) });
  const bow = bank('cymbBow1');
  const bowLen = bow.mono.length / 48000;
  for (const bar of [8, 16]) place(far, bow, { t: g.b(bar, 0) - 5, dur: 5, start: Math.max(0, bowLen - 5), reverse: true, lp: 3200, gain: 0.7, fadeIn: 1.5 });
  const pianoC3 = bank('pianoC3');
  place(far, pianoC3, { t: g.b(5, 0) - 3.2, dur: 3.2, reverse: true, semis: semisTo(pianoC3, N.D3), lp: 2000, gain: 0.8, fadeIn: 1, pan: -0.3 });
  const pianoG2 = bank('pianoG2');
  place(far, pianoG2, { t: g.b(12, 2), semis: semisTo(pianoG2, N.A2), lp: 1600, gain: 0.8, pan: 0.35 });
  place(far, pianoG2, { t: g.b(12, 2.5), semis: semisTo(pianoG2, N.Bb2), lp: 1400, gain: 0.4, pan: 0.5 });
  lay(calm, verb(far, 2.5, { rt60: 8, damp: 2600, size: 2.8, predelay: 0.06, hp: 120 }), -8);
  verb(calm, 0.3, { rt60: 6, damp: 2600, size: 2.5, predelay: 0.04, hp: 150 });
  const ocean = bank('ocean1');
  const dustA = L();
  dust(dustA, ocean, { rate: 9, pops: 0.12, gain: 1 }, rng.fork('dust'));
  lay(calm, dustA, -18);
  const hiss = L();
  granular(hiss, ocean, { t: 0, dur: g.loop, from: 1, to: 6, grain: 0.3, density: 12, jitter: 0.5, spread: 1 }, rng);
  lay(calm, filterStereo(hiss, 'highpass', 3500, 0.7), -30);

  // caution: plucked bass (few notes, low, through a dub delay), a soft half-time pulse, a tremolo swell
  const caution = L();
  const pizz = bank('bassPizzD');
  const pizz2 = bank('bassPizzD2');
  const bass = L();
  const phrase: [number, number, number, number][] = [
    [0, 0, N.D2, 1], [0, 2.75, N.D2, 0.35], [1, 1.5, N.C2, 0.7], [2, 0, N.D2, 0.9], [3, 2.5, N.Eb2, 0.65], [3, 3.5, N.D2, 0.3],
  ];
  for (let p = 0; p < 5; p++) {
    for (const [bar, beat, note, gain] of phrase) {
      if (p === 2 && bar === 1) continue;
      const s = rng.chance(0.5) ? pizz : pizz2;
      place(bass, s, { t: g.b(p * 4 + bar, beat) + rng.range(-0.01, 0.015), pan: 0, semis: semisTo(s, note), lp: 1500, drive: 2, gain, dur: 2.2 });
    }
  }
  addInto(bass, delayWet(bass, { time: g.beat * 0.75, feedback: 0.42, lp: 1400, hp: 220, pingpong: true, drive: 1.5 }), 0.5);
  lay(caution, bass, 0);
  const pulse = L();
  const kick = bank('kickMuted');
  const rim = bank('snareRim');
  const shaker = [bank('shakerDown'), bank('shakerUp')];
  for (let bar = 0; bar < g.bars; bar++) {
    place(pulse, kick, { t: g.at(bar, 0) + rng.range(-0.004, 0.004), pan: 0, lp: 2400, gain: 1 });
    if (bar % 4 === 3) place(pulse, kick, { t: g.at(bar, 10), pan: 0, lp: 2000, gain: 0.45 });
    place(pulse, rim, { t: g.at(bar, 8) + rng.range(0, 0.012), pan: 0.15, lp: 5000, gain: 0.55 });
    for (const i of [3, 7, 11, 15]) if (rng.chance(0.55)) place(pulse, rng.pick(shaker), { t: g.at(bar, i) + rng.range(-0.01, 0.01), pan: rng.range(-0.5, 0.2), hp: 2500, gain: 0.3 * rng.jitter(0.4) });
  }
  lay(caution, verb(pulse, 0.5, { rt60: 3.5, damp: 3500, size: 2, predelay: 0.03, hp: 200 }), -3);
  const trem = L();
  granular(trem, bank('celloTremD2'), { t: g.b(8, 0), dur: g.bar * 8, from: 0.8, to: 5.5, grain: 0.35, density: 14, semis: -12, jitter: 0.2, spread: 0.8, edge: g.bar * 3 }, rng);
  lay(caution, filterStereo(trem, 'lowpass', 1400, 0.7), -9);

  // alert: a brushed, chopped break, sub under the kicks, distorted bowed bass, metal in the gaps
  const alert = L();
  const brk = performBreak(g, {
    kick: [bank('kickMuted'), bank('kickVcsl')],
    snare: [bank('snareOld'), bank('snare1')],
    ghost: [bank('snare1pp'), bank('snareGhost'), bank('snareOldP')],
    hat: [bank('hatC1'), bank('hatC2'), bank('hatC3')],
    openHat: bank('hatLoose'),
  }, {
    kick: ['X.....x...x.....', 'X..x......x..x..'],
    snare: ['........X.......', '........X.....g.'],
    ghost: ['..g...g.....g..g', '.g....g...g.g...'],
    hat: ['x.xgx.xgx.xgx.xg', 'x.xgx.xgx.xgxgxg'],
  }, rng.fork('breakA'), 1.8);
  const drums = L();
  const variants: (Chop | number)[][] = [
    straight(0),
    straight(1),
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, { s: 8, gain: 0.6 }, 15],
    [16, 17, 18, 3, 4, 5, 22, 23, 8, 9, 10, 11, 28, 29, { s: 24, rev: true, len: 2 }, -1],
  ];
  for (let bar = 0; bar < g.bars; bar++) chopBar(drums, g, bar, brk, bar % 4 === 3 ? variants[bar % 8 === 7 ? 3 : 2]! : variants[bar % 2]!);
  stutter(drums, g.at(7, 12), g.beat / 4, 3, 0.8);
  stutter(drums, g.at(15, 14), g.beat / 8, 3, 0.85);
  dropOut(drums, g.at(19, 8), g.beat * 2);
  lay(alert, filterStereo(drums, 'lowpass', 8000, 0.7), 0);
  const subA = L();
  for (let bar = 0; bar < g.bars; bar++) {
    for (const i of bar % 2 === 0 ? [0, 6, 10] : [0, 3, 10, 13]) place(subA, pizz, { t: g.at(bar, i), pan: 0, semis: semisTo(pizz, N.D1) + (bar % 8 >= 6 && i === 10 ? 1 : 0), lp: 160, drive: 3, gain: i === 0 ? 1 : 0.6, dur: g.beat * 1.2 });
  }
  lay(alert, subA, -13);
  const grit = L();
  const arcoDrv = bank('bassArcoD');
  for (let p = 0; p < 5; p++) {
    place(grit, arcoDrv, { t: g.b(p * 4, 0), dur: g.bar * 3, pan: 0, drive: 5, bp: [420, 0.7], fadeIn: 0.4, fadeOut: 0.8 });
    place(grit, arcoDrv, { t: g.b(p * 4 + 3, 0), dur: g.bar, semis: 1, pan: 0, drive: 5, bp: [420, 0.7], gain: 0.9, fadeIn: 0.2, fadeOut: 0.4 });
  }
  lay(alert, grit, -7);
  const metal = L();
  const kitMetal = ['metal1', 'metal2', 'metal4', 'metal7', 'metal11', 'brake1'].map(bank);
  for (let bar = 0; bar < g.bars; bar++) for (const i of [5, 13]) if (rng.chance(0.45)) place(metal, rng.pick(kitMetal), { t: g.at(bar, i) + rng.range(0, 0.02), pan: rng.range(-0.8, 0.8), semis: rng.range(-8, 0), hp: 400, lp: 6500, gain: rng.range(0.6, 1), dur: 0.5 });
  lay(alert, verb(metal, 0.5, { rt60: 2, damp: 4000, size: 1.4, hp: 300 }), -11);
  lay(alert, tension(g, bank, rng.fork('tensionA'), { pedal: true, bars: g.bars, riserBars: [4, 8, 12, 16] }), -4);

  return { calm: finish(calm, 1.3, 9500, 2), caution: finish(caution, 1.4, 9000, 2), alert: finish(alert, 2.4, 10500, 2) };
}

// ---------------------------------------------------------------------------------------------------------- B Breakline

function sketchB(bank: Bank, seed: number): Record<StemId, Stereo> {
  const g = new Grid(96, 24, 0.12);
  const n = secs(g.loop);
  const rng = new Rng(seed).fork('B');
  const L = (): Stereo => stereo(n);

  const brk = performBreak(g, {
    kick: [bank('kickBig'), bank('kickVcsl'), bank('kickMuted')],
    snare: [bank('snareM5'), bank('snareM7'), bank('snare2')],
    ghost: [bank('snareGhost'), bank('snare1pp'), bank('snare2p')],
    hat: [bank('hatC1'), bank('hatC2'), bank('hatC3'), bank('hatClose')],
    openHat: bank('hatOpen'),
  }, {
    kick: ['X.x.......X..x..', 'X.x...x...x.....'],
    snare: ['....X.......X...', '....X.......X..g'],
    ghost: ['.g.....g.g....g.', '..g..g.g.g...g..'],
    hat: ['xgxgxgxgxgxgxgxg', 'xgxgxgxgxgxgxgXg'],
  }, rng.fork('breakB'), 2.6);

  // the chop plan: 24 bars; edits on bars 3 and 5 of each eight, a pitched fill on bar 7
  const s0 = straight(0);
  const s1 = straight(1);
  const half: (Chop | number)[] = [0, 1, 2, 3, -1, -1, 6, 7, 4, 5, -1, 3, -1, -1, 14, 15];
  const edit1: (Chop | number)[] = [0, 1, 2, 3, 4, 5, 6, 7, 26, 27, 10, 11, 4, { s: 4, gain: 0.7 }, { s: 4, gain: 0.5 }, 15];
  const edit2: (Chop | number)[] = [16, 17, 2, 3, 20, 21, 22, { s: 23, semis: -3 }, 0, 1, 26, 27, 12, 13, { s: 28, rev: true, len: 2 }, -1];
  const fill: (Chop | number)[] = [0, 1, 4, 5, 4, 5, 12, 12, { s: 12, semis: 2 }, { s: 12, semis: 4 }, { s: 12, semis: 6 }, { s: 28, gain: 0.8 }, { s: 28, semis: -5 }, { s: 28, semis: -10 }, -1, -1];
  const full = L();
  const halfT = L();
  for (let bar = 0; bar < g.bars; bar++) {
    const k = bar % 8;
    chopBar(full, g, bar, brk, k === 7 ? fill : k === 3 ? edit1 : k === 5 ? edit2 : bar % 2 ? s1 : s0);
    chopBar(halfT, g, bar, brk, k === 7 ? half.map((x, i) => (i > 11 ? -1 : x)) : half);
  }
  stutter(full, g.at(7, 14), g.beat / 8, 3, 0.8);
  stutter(full, g.at(11, 12), g.beat / 4, 2, 0.9, -2);
  stutter(full, g.at(19, 13), g.beat / 8, 2, 0.8, 3);
  tapeStop(full, g.at(23, 8), g.beat * 2);
  reverseRegion(full, g.at(15, 12), g.beat);

  // calm: drone, dust, sub, and the break muffled behind a wall
  const calm = L();
  const drone = L();
  granular(drone, bank('celloD2'), { t: 0, dur: g.loop, from: 1, to: 7.5, grain: 0.45, density: 14, semis: -12, cents: 6, jitter: 0.3, spread: 0.8 }, rng);
  granular(drone, bank('celloA2'), { t: 0, dur: g.loop, from: 1, to: 7, grain: 0.5, density: 8, semis: -12, cents: 6, jitter: 0.3, spread: 0.9, gain: 0.45 }, rng);
  lay(calm, filterStereo(drone, 'lowpass', 1000, 0.7), 0);
  const wall = L();
  addInto(wall, halfT, 1);
  lay(calm, filterStereo(wall, 'lowpass', 320, 1.1), -7);
  const sub = L();
  granular(sub, bank('bassArcoD'), { t: 0, dur: g.loop, from: 3, to: 10, grain: 0.6, density: 10, semis: -12, cents: 2, jitter: 0.3, spread: 0.1 }, rng);
  lay(calm, filterStereo(sub, 'lowpass', 100, 0.8), -16);
  const piano = bank('pianoC3');
  const keys = L();
  for (const bar of [6, 18]) place(keys, piano, { t: g.b(bar, 0) - 2.5, dur: 2.5, reverse: true, semis: semisTo(piano, bar === 6 ? N.D3 : N.F3) - 12, lp: 1500, fadeIn: 0.8, pan: -0.2 });
  lay(calm, keys, -9);
  verb(calm, 0.35, { rt60: 5, damp: 2400, size: 2.4, predelay: 0.04, hp: 180 });
  const dustB = L();
  dust(dustB, bank('ocean1'), { rate: 12, pops: 0.15, gain: 1 }, rng.fork('dust'));
  lay(calm, dustB, -17);

  // caution: the half-time break, band-limited; a plucked bass rhythm cut into pieces
  const caution = L();
  const ht = L();
  addInto(ht, halfT, 1);
  filterStereo(ht, 'highpass', 160, 0.7);
  lay(caution, filterStereo(ht, 'lowpass', 4500, 0.7), 0);
  const pizz = bank('bassPizzD');
  const pizzC = bank('bassPizzC');
  const riff = L();
  // a rhythm, not a tune: the root with one neighbour each side, pushed off the beat
  const cells: [number, number, number][] = [[0, N.D2, 1], [3, N.D2, 0.5], [6, N.D2, 0.8], [10, N.C2, 0.7], [11, N.D2, 0.4], [14, N.Eb2, 0.6]];
  for (let bar = 0; bar < g.bars; bar++) {
    if (bar % 8 === 7) continue;
    for (const [i, note, gain] of cells) {
      if (bar % 4 === 2 && i > 9) continue;
      const s = note === N.C2 ? pizzC : pizz;
      place(riff, s, { t: g.at(bar, i), pan: 0, semis: semisTo(s, note), drive: 2.5, lp: 1800, gain, dur: g.beat * (i === 6 ? 1.5 : 0.7) });
    }
  }
  stutter(riff, g.at(15, 12), g.beat / 4, 3, 0.8);
  addInto(riff, delayWet(riff, { time: g.beat * 0.75, feedback: 0.3, lp: 1500, hp: 250, pingpong: true }), 0.35);
  lay(caution, riff, -2);

  // alert: the full chopped break, sub on the kicks, a distorted bowed figure, metal stabs, a little room
  const alert = L();
  lay(alert, filterStereo(full, 'highpass', 50, 0.7), 0);
  const subA = L();
  for (let bar = 0; bar < g.bars; bar++) {
    if (bar % 8 === 7) continue;
    for (const i of [0, 2, 10, 13]) place(subA, pizz, { t: g.at(bar, i), pan: 0, semis: semisTo(pizz, bar % 8 === 6 && i > 9 ? N.Eb1 : N.D1), lp: 150, drive: 3.5, gain: i === 0 ? 1 : 0.65, dur: g.beat * 0.9 });
  }
  lay(alert, subA, -13);
  const grit = L();
  const arco = bank('bassArcoDf');
  for (let bar = 0; bar < g.bars; bar += 2) {
    place(grit, arco, { t: g.at(bar, 0), dur: g.bar * 1.5, pan: 0, drive: 7, bp: [480, 0.8], fadeIn: 0.05, fadeOut: 0.5 });
    place(grit, arco, { t: g.at(bar + 1, 8), dur: g.beat * 2, pan: 0, semis: bar % 8 === 6 ? 1 : -2, drive: 7, bp: [480, 0.8], gain: 0.85, fadeIn: 0.02, fadeOut: 0.3 });
  }
  lay(alert, grit, -9);
  const metal = L();
  const m = ['metal5', 'metal8', 'metal10', 'anvil', 'brake2'].map(bank);
  for (let bar = 0; bar < g.bars; bar++) for (const i of [7, 15]) if (rng.chance(0.4)) place(metal, rng.pick(m), { t: g.at(bar, i), pan: rng.range(-0.9, 0.9), semis: rng.range(-7, 2), hp: 500, gain: rng.range(0.6, 1), dur: 0.4 });
  lay(alert, verb(metal, 0.6, { rt60: 1.6, damp: 5000, size: 1.2, hp: 400 }), -12);
  lay(alert, tension(g, bank, rng.fork('tensionB'), { pedal: true, bars: g.bars, riserBars: [4, 8, 12, 16, 20] }), -4);
  verb(alert, 0.12, { rt60: 1.2, damp: 5000, size: 1, hp: 250 });

  return { calm: finish(calm, 1.3, 9000, 3), caution: finish(caution, 1.6, 9500, 3), alert: finish(alert, 2.6, 11000, 3) };
}

// ---------------------------------------------------------------------------------------------------------- C Foundry

function sketchC(bank: Bank, seed: number): Record<StemId, Stereo> {
  // 21 bars: five four-bar phrases and one turnaround bar
  const g = new Grid(84, 21, 0.1);
  const n = secs(g.loop);
  const rng = new Rng(seed).fork('C');
  const L = (): Stereo => stereo(n);

  // calm: motor drone, chain grind, a frozen metal ring, sub hum, gong scrapes
  const calm = L();
  const motor = L();
  granular(motor, bank('blower'), { t: 0, dur: g.loop, from: 3, to: 40, grain: 0.5, density: 12, semis: -9, jitter: 1.5, spread: 0.8 }, rng);
  filterStereo(motor, 'highpass', 60, 0.7);
  filterStereo(motor, 'lowpass', 1000, 0.8);
  filterStereo(motor, 'peaking', 147, 4, 8);
  lay(calm, motor, -2);
  const chain = L();
  granular(chain, bank('chainGrindLoop'), { t: 0, dur: g.loop, from: 0.2, to: 7.5, grain: 0.25, density: 10, semis: -14, jitter: 0.5, spread: 0.9, reverse: 0.3 }, rng);
  lay(calm, filterStereo(chain, 'lowpass', 1800, 0.7), -9);
  // a ringing plate frozen into a pad, a second one a tritone away fading in and out
  const ring = L();
  const plate = bank('metal6');
  granular(ring, plate, { t: 0, dur: g.loop, from: 0.05, to: 0.6, grain: 0.18, density: 30, semis: -10, cents: 4, jitter: 0.04, spread: 1 }, rng);
  granular(ring, plate, { t: g.b(8, 0), dur: g.bar * 6, from: 0.05, to: 0.6, grain: 0.18, density: 24, semis: -4, cents: 4, jitter: 0.04, spread: 1, gain: 0.5, edge: g.bar * 2 }, rng);
  lay(calm, filterStereo(ring, 'lowpass', 2800, 0.7), -6);
  const subHum = L();
  granular(subHum, bank('bassArcoD'), { t: 0, dur: g.loop, from: 3, to: 12, grain: 0.7, density: 9, semis: -12, cents: 1, jitter: 0.4, spread: 0.05 }, rng);
  lay(calm, filterStereo(subHum, 'lowpass', 95, 0.9), -15);
  const scrape = L();
  place(scrape, bank('gongScrape'), { t: g.b(3, 2), semis: -7, lp: 2400, pan: -0.5 });
  place(scrape, bank('gongScrapePp'), { t: g.b(12, 1), semis: -5, reverse: true, lp: 2200, pan: 0.5 });
  place(scrape, bank('cymbScrape2'), { t: g.b(17, 0), semis: -12, lp: 1800, gain: 0.8, pan: 0.2 });
  lay(calm, verb(scrape, 1.6, { rt60: 9, damp: 2000, size: 3, predelay: 0.08, hp: 150 }), -7);
  verb(calm, 0.3, { rt60: 5, damp: 2200, size: 2.6, hp: 150 });
  const dustC = L();
  dust(dustC, bank('ocean1'), { rate: 7, pops: 0.25, gain: 1 }, rng.fork('dust'));
  lay(calm, dustC, -18);

  // caution: a slow industrial pulse, creaks, a tritone tremolo creeping under it, bowed cymbal swells
  const caution = L();
  const pulse = L();
  const big = bank('kickBig');
  const anvil = bank('anvil');
  const brake = bank('brake1');
  for (let bar = 0; bar < g.bars; bar++) {
    place(pulse, big, { t: g.at(bar, 0), pan: 0, lp: 3000 });
    if (bar !== 20) place(pulse, rng.chance(0.5) ? anvil : brake, { t: g.at(bar, 8) + rng.range(0, 0.01), pan: rng.range(-0.2, 0.2), semis: -6, lp: 5500, gain: 0.6 });
    if (bar % 4 === 2) place(pulse, big, { t: g.at(bar, 11), pan: 0, lp: 2200, gain: 0.5 });
  }
  lay(caution, verb(pulse, 0.45, { rt60: 3.2, damp: 2800, size: 2.2, predelay: 0.02, hp: 120 }), 0);
  const creak = L();
  const creaks = ['ratchetSlow', 'guiroSlow', 'brickScrape', 'brickScrape2'].map(bank);
  for (let bar = 1; bar < g.bars; bar += 2) place(creak, rng.pick(creaks), { t: g.at(bar, rng.pick([5, 6, 13])), pan: rng.range(-0.7, 0.7), semis: rng.range(-10, -4), dur: 0.7, hp: 300, lp: 3500 });
  lay(caution, verb(creak, 0.4, { rt60: 2.5, damp: 3000, size: 1.8, hp: 300 }), -10);
  const tremo = L();
  const gsh = bank('bassTremGs');
  granular(tremo, gsh, { t: g.b(4, 0), dur: g.bar * 7, from: 0.6, to: 5, grain: 0.3, density: 14, semis: semisTo(gsh, N.Ab2) - 12, jitter: 0.15, spread: 0.6, edge: g.bar * 3 }, rng);
  const tc = bank('bassTremC');
  granular(tremo, tc, { t: g.b(13, 0), dur: g.bar * 7, from: 0.6, to: 7, grain: 0.3, density: 14, semis: semisTo(tc, N.D2), jitter: 0.15, spread: 0.6, edge: g.bar * 3 }, rng);
  lay(caution, filterStereo(tremo, 'lowpass', 1200, 0.7), -6);
  const bowC = L();
  const bow = bank('cymbBow3');
  place(bowC, bow, { t: g.b(8, 0) - 3, dur: 3, reverse: true, semis: -5, lp: 2600, fadeIn: 1 });
  place(bowC, bow, { t: g.b(16, 0) - 3, dur: 3, reverse: true, semis: -7, lp: 2600, fadeIn: 1 });
  lay(caution, bowC, -10);

  // alert: crushed, layered break; distorted bass riff; sub; timpani and gong; chain swells
  const alert = L();
  const brk = performBreak(g, {
    kick: [bank('kickBig2'), bank('kickBig')],
    snare: [bank('snare2'), bank('timpSnare'), bank('snareM7')],
    ghost: [bank('snareStick'), bank('snareClick'), bank('cajonHi')],
    hat: [bank('hatClose'), bank('hatC3'), bank('woodClick')],
  }, {
    kick: ['X..x......x.....', 'X.....x..x..x...'],
    snare: ['........X.......', '........X..g....'],
    ghost: ['...g.g......g.g.', '.g...g.g....g..g'],
    hat: ['x.x.x.x.x.x.x.x.', 'x.x.xgx.x.x.xgx.'],
  }, rng.fork('breakC'), 4);
  const drums = L();
  const s0 = straight(0);
  const s1 = straight(1);
  const crush: (Chop | number)[] = [0, 1, 2, 3, 0, 1, 2, 3, 8, 9, 26, 27, { s: 8, semis: -4 }, { s: 8, semis: -8 }, 30, 31];
  const back: (Chop | number)[] = [16, 17, 18, 19, 20, 21, { s: 22, rev: true, len: 2 }, -1, 24, 25, 10, 11, 12, 13, 14, 15];
  for (let bar = 0; bar < g.bars; bar++) {
    if (bar === 20) {
      chopBar(drums, g, bar, brk, [0, 1, 2, 3, 4, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]);
      continue;
    }
    const k = bar % 4;
    chopBar(drums, g, bar, brk, k === 3 ? crush : k === 1 ? back : bar % 2 ? s1 : s0);
  }
  stutter(drums, g.at(7, 12), g.beat / 4, 3, 0.85, -1);
  stutter(drums, g.at(15, 14), g.beat / 8, 4, 0.8);
  // metal layered on the half-time snare
  const plates = ['metal2', 'metal4', 'metal14', 'anvil'].map(bank);
  for (let bar = 0; bar < 20; bar++) place(drums, rng.pick(plates), { t: g.at(bar, 8) + 0.004, pan: rng.range(-0.3, 0.3), semis: -9, hp: 250, lp: 6000, gain: 0.45, dur: 0.6 });
  const crushed = L();
  addInto(crushed, drums, 1);
  // a coarse quantise: the gritty, sampled-down top
  for (let i = 0; i < n; i++) {
    crushed.l[i] = Math.round(crushed.l[i]! * 48) / 48;
    crushed.r[i] = Math.round(crushed.r[i]! * 48) / 48;
  }
  addInto(crushed, reverbWet(drums, { rt60: 1.8, damp: 3500, size: 1.6, hp: 300 }), 0.25);
  lay(alert, filterStereo(crushed, 'lowpass', 7000, 0.7), 0);
  const riff = L();
  const pz = bank('bassPizzD2');
  // syncopated root, the minor second above it and the flat seventh under it, very distorted
  const r16: [number, number][] = [[0, N.D2], [3, N.D2], [6, N.Eb2], [10, N.D2], [12, N.D2], [14, N.C2]];
  for (let bar = 0; bar < 20; bar++) for (const [i, note] of r16) if (!(bar % 4 === 3 && i > 8)) place(riff, pz, { t: g.at(bar, i), pan: 0, semis: semisTo(pz, note), drive: 9, lp: 2600, hp: 50, dur: g.beat * 0.6 });
  lay(alert, riff, -4);
  const subC = L();
  for (let bar = 0; bar < 20; bar++) for (const i of [0, 3, 10]) place(subC, pz, { t: g.at(bar, i), pan: 0, semis: semisTo(pz, N.D1), lp: 130, drive: 4, dur: g.beat });
  lay(alert, subC, -13);
  const boom = L();
  const timp = bank('timpD');
  for (const bar of [0, 4, 8, 12, 16]) place(boom, timp, { t: g.at(bar, 0), pan: 0, semis: semisTo(timp, N.D2), lp: 1800 });
  place(boom, bank('gongP'), { t: g.at(0, 0), semis: -5, lp: 3000, gain: 0.7, pan: 0.2 });
  // the turnaround bar: a reversed gong swells into the top of the loop
  place(boom, bank('gongP'), { t: g.at(20, 0) + 0.2, dur: g.bar - 0.2, start: 0.5, reverse: true, semis: -5, lp: 3000, gain: 0.7, fadeIn: 0.8 });
  lay(alert, verb(boom, 0.5, { rt60: 4, damp: 2500, size: 2.4, hp: 100 }), -6);
  const grind = L();
  place(grind, bank('chainGrind'), { t: g.at(7, 8), semis: -5, lp: 3500, hp: 200, pan: -0.4 });
  place(grind, bank('chainGrind'), { t: g.at(15, 8), semis: -8, lp: 3500, hp: 200, pan: 0.4, reverse: true });
  lay(alert, verb(grind, 0.5, { rt60: 2.5, damp: 3000, size: 2, hp: 200 }), -10);
  lay(alert, tension(g, bank, rng.fork('tensionC'), { pedal: false, bars: 20, riserBars: [4, 8, 12, 16, 20] }), -4);

  return { calm: finish(calm, 1.4, 8500, 3), caution: finish(caution, 1.8, 9000, 3), alert: finish(alert, 3, 10000, 3) };
}

const BUILDERS: Record<SketchId, (bank: Bank, seed: number) => Record<StemId, Stereo>> = { A: sketchA, B: sketchB, C: sketchC };

export function renderSketch(id: SketchId, bank: Bank, seed = 1): Rendered {
  const meta = SKETCHES.find((s) => s.id === id)!;
  return { meta, stems: BUILDERS[id](bank, seed) };
}

export const loopSeconds = (m: SketchMeta): number => (m.bars * 4 * 60) / m.bpm;
