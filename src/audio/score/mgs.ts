import { drums, layer, roll, s16, Seq, type LayerDef, type Plan, type Voice } from './arrange';
import { parseHook } from './hooks';
import { midi, voicing, type Chord } from './theory';

/**
 * Round 5 (Michael, 2026-10-15): original Alert hooks in the spirit of Metal Gear Solid's alert music (fast, urgent,
 * a repeated-note pickup into a held note, a driving snare, a pulsing bass), each with an Evasion version (the drive
 * stays, the hook drops out). No melody, chord pattern or rhythm from any existing track: written for this project.
 * Lead notation: `note:length` in sixteenths, 4 bars; chords: one per bar.
 */

export interface AlertHook {
  id: string;
  name: string;
  blurb: string;
  bpm: number;
  lead: string;
  /** One chord per bar, as [root note, minor?]. */
  chords: [string, boolean][];
}

export const ALERT_HOOKS: readonly AlertHook[] = [
  {
    id: 'breach',
    name: 'Breach',
    blurb: 'Three quick repeated notes kick into a held high D, then the same figure a step lower; it climbs again and lands on a held note.',
    bpm: 152,
    lead: 'A4:1 A4:1 A4:2 D5:6 C5:2 Bb4:2 A4:2 | G4:1 G4:1 G4:2 C5:6 Bb4:2 A4:2 G4:2 | A4:1 A4:1 A4:2 D5:6 E5:2 F5:2 E5:2 | D5:8 -:4 A4:2 C#5:2',
    chords: [['D', true], ['C', false], ['Bb', false], ['A', false]],
  },
  {
    id: 'lockdown',
    name: 'Lockdown',
    blurb: 'A "DA DA da-DAAH" figure that climbs one step every bar, tightening like a net, then falls to the leading note.',
    bpm: 144,
    lead: 'D4:3 D4:3 D4:2 E4:2 F4:6 | E4:3 E4:3 E4:2 F4:2 G4:6 | F4:3 F4:3 F4:2 G4:2 A4:4 Bb4:2 | A4:8 G4:2 F4:2 E4:2 C#4:2',
    chords: [['D', true], ['C', false], ['Bb', false], ['A', false]],
  },
  {
    id: 'snapshot',
    name: 'Snapshot',
    blurb: 'A short, syncopated call that reaches the tritone (A-flat), answered by a falling reply. Punchy and quick.',
    bpm: 160,
    lead: 'D4:2 -:1 D4:1 F4:2 -:2 G4:3 Ab4:3 G4:2 | F4:2 -:1 F4:1 D4:2 -:2 C4:4 D4:4 | D4:2 -:1 D4:1 F4:2 -:2 G4:3 Ab4:3 G4:2 | F4:2 -:1 F4:1 D4:2 -:2 E4:4 C#4:4',
    chords: [['D', true], ['Bb', false], ['D', true], ['A', false]],
  },
  {
    id: 'countdown',
    name: 'Countdown',
    blurb: 'Four ticking repeated notes, then a turn around A; on the fourth bar it breaks out downwards through the tritone.',
    bpm: 150,
    lead: 'A4:1 A4:1 A4:1 A4:1 Bb4:2 A4:2 G4:2 A4:2 F4:4 | A4:1 A4:1 A4:1 A4:1 Bb4:2 A4:2 C5:2 Bb4:2 A4:4 | A4:1 A4:1 A4:1 A4:1 Bb4:2 A4:2 G4:2 A4:2 F4:4 | D5:4 C5:2 Bb4:2 A4:4 Ab4:2 A4:2',
    chords: [['D', true], ['F', false], ['D', true], ['Bb', false]],
  },
];

export type LeadKind = 'brass' | 'synth' | 'horns';
export type AlertMode = 'alert' | 'evade' | 'alone';

const BARS = 8;
const TONIC = midi('D2');

function chordOf(root: string, minor: boolean): Chord {
  const r = (((midi(`${root}2`) - TONIC) % 12) + 12) % 12;
  return { root: r, tones: minor ? [0, 3, 7] : [0, 4, 7] };
}

const LEAD_VOICE: Record<LeadKind, Voice> = { brass: 'brass', synth: 'leadSynth', horns: 'horn' };

export function alertHookPlan(h: AlertHook, lead: LeadKind, mode: AlertMode): Plan {
  const notes = parseHook(h.lead);
  const chords = h.chords.map(([r, m]) => chordOf(r, m));
  const id = `mgs-${h.id}-${mode}-${lead}`;
  const name = `${h.name}: ${mode === 'alert' ? `Alert (${lead})` : mode === 'evade' ? 'Evasion' : 'hook alone'}`;

  const ld = new Seq();
  if (mode !== 'evade') {
    for (let rep = 0; rep < 2; rep++) {
      for (const n of notes) {
        if (n.n === null) continue;
        const at = rep * 16 + n.at / 4;
        const v: Voice = mode === 'alone' ? 'melody' : LEAD_VOICE[lead];
        ld.add(at, (n.len / 4) * 0.9, v, n.n, n.len >= 4 ? 0.85 : 0.72, 0, v === 'horn' ? 3 : v === 'brass' ? 0.025 : 1);
      }
    }
  }
  if (mode === 'alone') {
    return {
      id,
      name,
      blurb: h.blurb,
      group: 'menu',
      bpm: h.bpm,
      bars: BARS,
      layers: [layer(`${id}-lead`, 'Hook (plain tone)', 'menu', h.bpm, BARS, ld, -24, { room: 0.25, hall: 0.1, far: 0 })],
    };
  }

  const alert = mode === 'alert';
  const dr = new Seq();
  const bs = new Seq();
  const st = new Seq();
  for (let b = 0; b < BARS; b++) {
    const c = chords[b % 4]!;
    const r = TONIC + c.root - (c.root > 6 ? 12 : 0);
    const fill = b % 4 === 3;
    if (alert) {
      const end = fill ? 12 : 16;
      drums(dr, b, 'kick', 'X.x...x.X.x...x.', 0.9, 0, 1, 0, 0, end);
      drums(dr, b, 'snare', '....X.......X...', 0.95, 0, 1, 0, 0, end);
      drums(dr, b, 'ghost', '..g..g.g..g..g.g', 1, 0, 1, -0.1, 0, end);
      drums(dr, b, 'hat', 'XoxoXoxoXoxoXoxo', 0.45, 0, 1, 0.25, 0, end);
      if (b % 4 === 0) dr.add(b * 4, 0, 'crash', 0, 0.6, 0.3);
      if (fill) roll(dr, b * 4 + 3, b * 4 + 4, 0.45, 1);
      // the bass pulses in eighths with octave pops
      for (let i = 0; i < 8; i++) bs.add(b * 4 + i * 0.5, 0.42, 'darkBass', r + (i === 2 || i === 6 ? 12 : 0), i % 4 === 0 ? 0.7 : 0.5);
      // brass stabs on beat 1 and the "and" of 2
      for (const sl of [0, 6]) for (const n of voicing(TONIC, c, TONIC + 10, TONIC + 26, 3)) st.add(s16(b, sl, 0), 0.4, 'brass', n, sl === 0 ? 0.65 : 0.5, 0, 0.012);
    } else {
      drums(dr, b, 'kick', 'X.......X.......', 0.75, 0);
      drums(dr, b, 'hat', 'x.o.x.o.x.o.x.o.', 0.35, 0, 1, 0.25);
      drums(dr, b, 'rim', '............x...', 0.5, 0, 1, 0.2);
      if (b === BARS - 1) roll(dr, b * 4 + 2, b * 4 + 4, 0.15, 0.5);
      for (let i = 0; i < 8; i++) bs.add(b * 4 + i * 0.5, 0.38, 'darkBass', r, i % 4 === 0 ? 0.55 : 0.38);
      if (b % 4 === 0) for (const n of voicing(TONIC, c, TONIC + 10, TONIC + 26, 3)) st.add(b * 4, 1.5, 'brass', n, 0.4, 0, 0.3);
    }
  }
  const layers: LayerDef[] = [
    layer(`${id}-dr`, 'Drums', 'menu', h.bpm, BARS, dr, alert ? -24 : -30, { room: 0.3, hall: 0.08, far: 0, drive: 1.6, lp: 10000 }),
    layer(`${id}-bass`, 'Bass pulse', 'menu', h.bpm, BARS, bs, alert ? -26 : -30, { room: 0.12, hall: 0, far: 0, lp: 1800 }, { rate: 24000 }),
    layer(`${id}-stab`, 'Brass stabs', 'menu', h.bpm, BARS, st, alert ? -28 : -34, { room: 0.12, hall: 0.3, far: 0 }, { rate: 24000 }),
  ];
  if (alert) layers.push(layer(`${id}-lead`, `Hook (${lead})`, 'menu', h.bpm, BARS, ld, -23, { room: 0.12, hall: 0.3, far: 0 }));
  return { id, name, blurb: h.blurb, group: 'menu', bpm: h.bpm, bars: BARS, layers };
}
