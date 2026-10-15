import { layer, Seq, type LayerDef, type Plan, type Voice } from './arrange';
import { midi } from './theory';

/**
 * Round 4 (Michael, 2026-10-15): "not sure it's working for the feel of this game; give me various hooks to decide
 * between". Ten bass hooks of different character, each written for this project, played alone and quietly on either
 * the soft upright or a dark round synth bass. Notation: `note:length` in sixteenths, `-` = rest, `|` = bar line.
 */

export interface HookDef {
  id: string;
  name: string;
  blurb: string;
  bpm: number;
  /** Swing of the off sixteenths (fraction of a sixteenth). */
  swing: number;
  notes: string;
}

export const HOOKS: readonly HookDef[] = [
  {
    id: 'a',
    name: 'Hook A (round 1)',
    blurb: 'The walk-up riff you liked, for comparison: "DUM . dum DUM . da . da", then a chromatic climb home.',
    bpm: 92,
    swing: 0.12,
    notes: 'D2:4 D3:2 D2:4 C3:4 A2:2 | D2:4 D3:2 D2:2 F2:2 G2:2 Ab2:2 A2:2',
  },
  {
    id: 'creep',
    name: 'Creep',
    blurb: 'Slow and minimal: the bass edges up a semitone and back, waits, then crawls home chromatically. Pure sneaking.',
    bpm: 84,
    swing: 0.1,
    notes: 'D2:4 -:4 Eb2:2 D2:6 | -:4 D2:2 -:2 C2:4 -:4 | D2:4 -:4 Eb2:2 D2:6 | -:4 A1:2 -:2 Bb1:2 B1:2 C2:2 C#2:2',
  },
  {
    id: 'tripwire',
    name: 'Tripwire',
    blurb: 'A 3 + 3 + 2 pulse on one note with octave pops, then a short fall. Tense and driving, easy to speed up for Alert.',
    bpm: 96,
    swing: 0.08,
    notes: 'D2:3 D2:3 D3:2 D2:3 D2:3 C3:2 | D2:3 D2:3 D3:2 F2:2 Eb2:2 D2:2 A1:2',
  },
  {
    id: 'walk',
    name: 'Walking noir',
    blurb: 'A jazz walking line through the tritone (A-flat) and back via C-sharp. Film-noir detective.',
    bpm: 88,
    swing: 0.18,
    notes: 'D2:4 F2:4 Ab2:4 A2:4 | Bb2:4 A2:4 E2:2 F2:2 C#2:4',
  },
  {
    id: 'pulse',
    name: 'Pulse',
    blurb: 'Steady eighths on D with octave jumps, then a dark turn through the tritone. Hypnotic, like a machine.',
    bpm: 100,
    swing: 0.05,
    notes: 'D2:2 D2:2 D3:2 D2:2 D2:2 D2:2 C3:2 D2:2 | D2:2 D2:2 D3:2 D2:2 Ab1:2 A1:2 C2:2 Eb2:2',
  },
  {
    id: 'displaced',
    name: 'Off-kilter',
    blurb: 'Notes in groups of three sixteenths running across the bar lines, so the riff never sits where you expect.',
    bpm: 92,
    swing: 0.08,
    notes: 'D2:3 F2:3 D2:3 A1:3 D2:3 Ab1:3 D2:3 C2:3 D2:3 Eb2:3 -:2',
  },
  {
    id: 'two',
    name: 'Two notes',
    blurb: 'Almost nothing: a long D, a pickup, a long B-flat; then the same with the tritone. Very quiet sneaking.',
    bpm: 76,
    swing: 0,
    notes: 'D2:8 -:6 A1:2 | Bb1:12 -:4 | D2:8 -:6 A1:2 | Ab1:12 -:2 A1:2',
  },
  {
    id: 'spy',
    name: 'Phrygian spy',
    blurb: 'A snapped D, E-flat, D figure with the flat second rubbing against the key note. Cool, catchy espionage.',
    bpm: 90,
    swing: 0.12,
    notes: 'D2:3 Eb2:1 D2:2 -:2 C2:2 D2:2 -:4 | D2:3 Eb2:1 D2:2 F2:2 Eb2:2 C2:2 Bb1:2 A1:2',
  },
  {
    id: 'adark',
    name: 'Hook A, darker',
    blurb: 'Hook A with its answer notes bent down (E-flat and A-flat instead of C and A). Same shape, colder.',
    bpm: 92,
    swing: 0.12,
    notes: 'D2:4 D3:2 D2:4 Eb3:4 Ab2:2 | D2:4 D3:2 D2:2 F2:2 G2:2 Ab2:2 A2:2',
  },
  {
    id: 'steel',
    name: 'Cold steel',
    blurb: 'Short, clipped octave stabs with gaps, then a chromatic slide down. Electronic and precise; best on the synth.',
    bpm: 98,
    swing: 0.06,
    notes: 'D2:1 -:1 D3:1 -:1 D2:2 -:2 D2:1 D3:1 -:2 C3:2 A2:2 | D2:1 -:1 D3:1 -:1 D2:2 -:2 Ab2:2 G2:2 F2:2 E2:2',
  },
];

/** Parse a hook into notes: start and length in sixteenths, MIDI (null = rest). */
export function parseHook(src: string): { at: number; len: number; n: number | null }[] {
  const out: { at: number; len: number; n: number | null }[] = [];
  let t = 0;
  for (const tok of src.split(/\s+/)) {
    if (!tok || tok === '|') continue;
    const [name, l] = tok.split(':');
    const len = Number(l);
    if (!name || !Number.isInteger(len) || len <= 0) throw new Error(`bad hook token: ${tok}`);
    out.push({ at: t, len, n: name === '-' ? null : midi(name) });
    t += len;
  }
  return out;
}

/** Length of a hook in bars (it must fill whole bars). */
export function hookBars(src: string): number {
  const notes = parseHook(src);
  const last = notes[notes.length - 1]!;
  return (last.at + last.len) / 16;
}

export type HookVoice = 'upright' | 'synth';

const BARS = 8;

/** One hook as an 8-bar loop on the chosen bass, quiet (the "Soft fingers" level). */
export function hookPlan(h: HookDef, voice: HookVoice): Plan {
  const s = new Seq();
  const notes = parseHook(h.notes);
  const span = hookBars(h.notes) * 16;
  const v: Voice = voice === 'upright' ? 'pizzSoft' : 'subBass';
  for (let rep = 0; rep * span < BARS * 16; rep++) {
    for (const note of notes) {
      if (note.n === null) continue;
      const at16 = rep * span + note.at;
      const beat = at16 / 4 + (at16 % 2 === 1 ? h.swing * 0.25 : 0);
      const first = note.at % 16 === 0;
      s.add(beat, (note.len / 4) * 0.92, v, note.n, first ? 0.8 : 0.6);
    }
  }
  const id = `hook-${h.id}-${voice}`;
  const L: LayerDef = layer(id, `${h.name} (${voice === 'upright' ? 'upright' : 'synth bass'})`, 'menu', h.bpm, BARS, s, -28, {
    room: 0.22,
    hall: 0.08,
    far: 0,
  }, { rate: 24000 });
  return { id, name: h.name, blurb: h.blurb, group: 'menu', bpm: h.bpm, bars: BARS, layers: [L] };
}
