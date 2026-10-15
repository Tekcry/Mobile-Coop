import { layer, Seq, swing8Of, type Fx, type LayerDef, type Plan, type Voice } from './arrange';
import { SKETCH_A } from './themes';
import { midi } from './theory';

/**
 * Round 3 (Michael, 2026-10-15): Hook A is the keeper but "very loud"; of the round 2 partners only the guitar (5) was
 * OK, and still a little too aggressive. Everything here is quieter and gentler: subtle versions of Hook A on their
 * own, and subtle takes on Hook A with the guitar. No drums, no sustained strings, no noise "air".
 */

const SK = SKETCH_A;
const BPM = SK.lowBpm; // 92
const BARS = 16;
/** The hook's two bars as absolute MIDI per eighth (null = rest). */
const RIFF = SK.hook;

function plan(id: string, name: string, blurb: string, bpm: number, layers: LayerDef[]): Plan {
  return { id, name, blurb, group: 'menu', bpm, bars: BARS, layers };
}

const e8 = (bar: number, i: number, sw8: number): number => bar * 4 + i * 0.5 + (i % 2 === 1 ? sw8 * 0.5 : 0);

interface HookStyle {
  voice: Voice;
  /** Level of the downbeat note, of the other notes, and of the walk-up's first note (it rises a little from there). */
  down: number;
  rest: number;
  walk: number;
  /** Semitones (an octave up for the guitar). */
  tr?: number;
  /** Which eighths of each bar to play (default: all of the riff). */
  keep?: (bar: number, i: number) => boolean;
  /** Note length factor (1 = until the next note). */
  legato?: number;
  sw8?: number;
}

/** Hook A with a gentle accent shape: the first note leads, the rest stay soft, the walk-up rises only slightly. */
function softHook(s: Seq, bar: number, st: HookStyle): void {
  const half = bar % 2;
  const sw8 = st.sw8 ?? swing8Of(SK);
  for (let i = 0; i < 8; i++) {
    const n = RIFF[half * 8 + i];
    if (n === null || n === undefined) continue;
    if (st.keep && !st.keep(bar, i)) continue;
    let gap = (8 - i) * 0.5;
    for (let j = i + 1; j < 8; j++) {
      if (RIFF[half * 8 + j] !== null && (!st.keep || st.keep(bar, j))) {
        gap = (j - i) * 0.5;
        break;
      }
    }
    const vel = i === 0 ? st.down : half === 1 && i >= 4 ? st.walk * (1 + 0.05 * (i - 4)) : st.rest;
    s.add(e8(bar, i, sw8), Math.min(gap * (st.legato ?? 0.9), 1.6), st.voice, n + (st.tr ?? 0), vel);
  }
}

function hookLayer(id: string, name: string, st: HookStyle, level: number, fx: Fx, bpm = BPM): LayerDef {
  const s = new Seq();
  for (let b = 0; b < BARS; b++) softHook(s, b, st);
  return layer(id, name, 'menu', bpm, BARS, s, level, fx, { rate: 24000 });
}

const SOFT: HookStyle = { voice: 'pizzSoft', down: 0.8, rest: 0.55, walk: 0.5 };
const ROOM: Fx = { room: 0.22, hall: 0.08, far: 0 };

/** Subtle versions of Hook A on its own. */
export function subtleHooks(): Plan[] {
  return [
    plan('h-orig', 'Original Hook A (for comparison)', 'The round 1 hook at its round 1 level. Everything below is quieter.', BPM, [
      (() => {
        const s = new Seq();
        for (let b = 0; b < BARS; b++) softHook(s, b, { voice: 'pizz', down: 0.9, rest: 0.65, walk: 0.62 });
        return layer('h-orig-b', 'Hook A (original)', 'menu', BPM, BARS, s, -22, { room: 0.2, hall: 0.05, far: 0, lp: 2200 }, { rate: 24000 });
      })(),
    ]),
    plan('h-soft', 'Soft fingers', 'The same riff played gently: a darker string, a softer finger attack, small accents, 8 dB quieter.', BPM, [
      hookLayer('h-soft-b', 'Hook A (soft)', SOFT, -30, ROOM),
    ]),
    plan('h-ghost', 'Ghosted', 'Only the first note of each bar is really played; the rest are ghosted, felt more than heard.', BPM, [
      hookLayer('h-ghost-b', 'Hook A (ghosted)', { voice: 'pizzSoft', down: 0.85, rest: 0.3, walk: 0.32, legato: 0.98 }, -31, ROOM),
    ]),
    plan('h-sparse', 'Sparse', 'Just the opening "DUM . dum DUM" in most bars; the full walk-up only every 4th bar. Lots of space.', BPM, [
      hookLayer(
        'h-sparse-b',
        'Hook A (sparse)',
        { ...SOFT, keep: (bar, i) => (bar % 2 === 0 ? i <= 3 : bar % 4 === 3 ? true : i === 0) },
        -31,
        ROOM,
      ),
    ]),
    plan('h-slow', 'Slower', 'Soft fingers at 80 BPM with longer notes and a little more room. Calmer, more noir.', 80, [
      hookLayer('h-slow-b', 'Hook A (slow)', { ...SOFT, legato: 0.98, sw8: 0.1 }, -30, { room: 0.25, hall: 0.18, far: 0 }, 80),
    ]),
    plan('h-far', 'From another room', 'Soft fingers, muffled and far away, as if the bass is playing behind a wall.', BPM, [
      hookLayer('h-far-b', 'Hook A (far)', SOFT, -33, { room: 0.1, hall: 0.2, far: 0.55, lp: 450 }),
    ]),
    plan('h-gtr', 'On a soft guitar', 'The riff an octave up on a gently palm-muted, clean guitar instead of the bass.', BPM, [
      hookLayer('h-gtr-b', 'Hook A (soft guitar)', { voice: 'guitarMuteSoft', down: 0.75, rest: 0.55, walk: 0.55, tr: 12 }, -31, {
        room: 0.2,
        hall: 0.2,
        far: 0,
        delay: { beats: 0.75, fb: 0.25, wet: 0.15 },
      }),
    ]),
  ];
}

/** Gentler takes on round 2's loop 5 (Hook A with a guitar answer). */
export function subtleGuitar(): Plan[] {
  const sw8 = swing8Of(SK);
  const WALK = ['F3', 'G3', 'Ab3', 'A3'].map(midi);
  const gFx: Fx = { room: 0.2, hall: 0.3, far: 0, delay: { beats: 0.75, fb: 0.25, wet: 0.16 } };

  // a: the round 2 guitar part, clean and soft, under a soft hook
  const a = new Seq();
  for (let b = 0; b < BARS; b++) {
    if (b % 2 === 1) WALK.forEach((n, k) => a.add(e8(b, 4 + k, sw8), 0.4, 'guitarMuteSoft', n, 0.5 + 0.04 * k, 0.2));
    else if (b >= 4) {
      a.add(e8(b, 1, sw8), 0.4, 'guitarSoft', midi('D4'), 0.45, -0.2);
      a.add(e8(b, 4, sw8), 0.45, 'guitarSoft', midi('C4'), 0.5, -0.2);
      a.add(e8(b, 6, sw8), 0.9, 'guitarSoft', midi('A3'), 0.48, -0.2);
    }
  }

  // b: sparser: the answer only every 4th bar, the walk-up doubled only at the end of each 8
  const bq = new Seq();
  for (let b = 0; b < BARS; b++) {
    if (b % 8 === 7) WALK.forEach((n, k) => bq.add(e8(b, 4 + k, sw8), 0.4, 'guitarMuteSoft', n, 0.45 + 0.04 * k, 0.2));
    else if (b % 4 === 2) {
      bq.add(e8(b, 4, sw8), 0.45, 'guitarSoft', midi('C4'), 0.45, -0.25);
      bq.add(e8(b, 6, sw8), 1.2, 'guitarSoft', midi('A3'), 0.42, -0.25);
    }
  }

  // c: one long, distant answer every 4 bars (C4 then A3, left ringing into a big space)
  const c = new Seq();
  for (let b = 2; b < BARS; b += 4) {
    c.add(e8(b, 4, sw8), 0.9, 'guitarSoft', midi('C4'), 0.5, 0.3);
    c.add(e8(b, 6, sw8), 2.5, 'guitarSoft', midi('A3'), 0.45, 0.3);
  }

  const hook = (id: string): LayerDef => hookLayer(`${id}-b`, 'Hook A (soft)', SOFT, -30, ROOM);
  return [
    plan('g-a', 'Guitar, softer', 'The loop 5 guitar part played clean and gently (no drive), quieter, under the soft hook.', BPM, [
      hook('g-a'),
      layer('g-a-g', 'Guitar', 'menu', BPM, BARS, a, -34, gFx, { rate: 32000 }),
    ]),
    plan('g-b', 'Guitar, sparser', 'The guitar answers only every 4th bar and doubles the walk-up only at the end of each 8 bars.', BPM, [
      hook('g-b'),
      layer('g-b-g', 'Guitar', 'menu', BPM, BARS, bq, -34, gFx, { rate: 32000 }),
    ]),
    plan('g-c', 'Guitar, distant', 'One slow two-note answer every 4 bars, left ringing into a big, far-away space.', BPM, [
      hook('g-c'),
      layer('g-c-g', 'Guitar', 'menu', BPM, BARS, c, -35, { room: 0.1, hall: 0.3, far: 0.6, delay: { beats: 1.5, fb: 0.3, wet: 0.2 } }, { rate: 32000 }),
    ]),
  ];
}
