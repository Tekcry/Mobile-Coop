import { drums, fullBar, halfBar, hook, impact, layer, roll, s16, Seq, stutter, swing8Of, taiko, type LayerDef, type Plan } from './arrange';
import { SKETCH_A } from './themes';
import { midi } from './theory';

/**
 * Round 2 (Michael, 2026-10-15): he loves Hook A alone and nothing else. Every loop here is Hook A on the upright bass
 * plus ONE partner, so each ingredient can be judged on its own before a full score is written again. No sustained
 * strings, no noise "air". 16 bars each; Hook A's walk-up bar closes the loop.
 */

const SK = SKETCH_A;
const LOW = SK.lowBpm; // 92
const FAST = SK.alertBpm; // 138
const BARS = 16;

function hookLayer(id: string, bpm: number, fast: boolean): LayerDef {
  const s = new Seq();
  const sw8 = swing8Of(SK, fast);
  for (let b = 0; b < BARS; b++) {
    hook(s, SK, b, (b % 2) as 0 | 1, 'pizz', 0.9, 0, sw8);
    if (fast) hook(s, SK, b, (b % 2) as 0 | 1, 'darkBass', 0.55, 0, sw8);
  }
  return layer(`${id}-hook`, 'Hook A (upright bass)', 'menu', bpm, BARS, s, fast ? -20 : -22, { room: 0.2, hall: 0.05, far: 0, lp: 2200, drive: fast ? 1.4 : 1 }, {
    rate: 24000,
  });
}

function plan(id: string, name: string, blurb: string, bpm: number, layers: LayerDef[]): Plan {
  return { id, name, blurb, group: 'menu', bpm, bars: BARS, layers };
}

/** Eighth-note position with the hook's swing. */
const e8 = (bar: number, i: number, sw8: number): number => bar * 4 + i * 0.5 + (i % 2 === 1 ? sw8 * 0.5 : 0);

export function hookPartners(): Plan[] {
  const sw = SK.swing;
  const sw8 = swing8Of(SK);
  const out: Plan[] = [];

  // 1. heartbeat kick and brushes
  {
    const s = new Seq();
    for (let b = 0; b < BARS; b++) {
      s.add(b * 4, 0, 'kick', 0, 0.6);
      s.add(b * 4 + 2, 0, 'kick', 0, 0.42);
      if (b >= 4) {
        drums(s, b, 'brush', '....X.......X...', 0.75, sw);
        drums(s, b, 'brush', '..g...g...g...g.', 0.9, sw, 1.1, 0.3);
      }
      if (b % 4 === 3) s.add(s16(b, 15, sw), 0, 'rim', 0, 0.35, 0.3);
    }
    out.push(
      plan('p-brush', 'Heartbeat and brushes', 'A soft kick on 1 and 3 like a heartbeat; brushes join after 4 bars. The quiet, sneaking end.', LOW, [
        hookLayer('p-brush', LOW, false),
        layer('p-brush-dr', 'Kick and brushes', 'menu', LOW, BARS, s, -27, { room: 0.35, hall: 0.05, far: 0, lp: 8000 }),
      ]),
    );
  }

  // 2. chopped half-time break
  {
    const s = new Seq();
    for (let b = 0; b < BARS; b++) {
      halfBar(s, SK, b, sw, 0.85, b, b === 7);
      if (b === BARS - 1) stutter(s, b * 4 + 3, 1, 8, 'snare', 0.5, 0.5);
    }
    out.push(
      plan('p-half', 'Chopped half-time break', 'Swung breakbeat with the snare on beat 3, written fills and a beat-repeat. Tense, not busy.', LOW, [
        hookLayer('p-half', LOW, false),
        layer('p-half-dr', 'Half-time break', 'menu', LOW, BARS, s, -25, { room: 0.35, hall: 0, far: 0, drive: 1.8, lp: 7500, hp: 35 }),
      ]),
    );
  }

  // 3. full downtempo break
  {
    const s = new Seq();
    for (let b = 0; b < BARS; b++) fullBar(s, SK, b, sw, 0.85, b % 8);
    out.push(
      plan('p-full', 'Downtempo breakbeat', 'The same tempo with a full backbeat (snare on 2 and 4), ghost notes and 16th hats. Moving, grooving.', LOW, [
        hookLayer('p-full', LOW, false),
        layer('p-full-dr', 'Full break', 'menu', LOW, BARS, s, -24, { room: 0.35, hall: 0, far: 0, drive: 1.8, lp: 9000, hp: 35 }),
      ]),
    );
  }

  // 4. dark electric piano
  {
    const s = new Seq();
    const DM9 = ['F3', 'A3', 'C4', 'E4'].map(midi);
    const BB7 = ['Ab3', 'D4', 'E4'].map(midi);
    const chord = (at: number, notes: number[], dur: number, vel: number): void => {
      notes.forEach((n, k) => s.add(at + k * 0.02, dur, 'rhodes', n, vel * (k === notes.length - 1 ? 1 : 0.85), k % 2 ? 0.25 : -0.25));
    };
    for (let b = 0; b < BARS; b++) {
      if (b % 2 === 0) {
        chord(e8(b, 3, sw8), DM9, 1.2, 0.55);
        chord(e8(b, 7, sw8), DM9, 0.35, 0.4);
      } else chord(e8(b, 1, sw8), b % 4 === 3 ? BB7 : DM9, 1.3, 0.5);
    }
    out.push(
      plan('p-keys', 'Dark electric piano', 'Minor-ninth chords on the off-beats, a darker chord under every second walk-up. Late-night jazz-noir.', LOW, [
        hookLayer('p-keys', LOW, false),
        layer('p-keys-k', 'Electric piano', 'menu', LOW, BARS, s, -27, { room: 0.2, hall: 0.25, far: 0, lp: 5000 }, { rate: 32000 }),
      ]),
    );
  }

  // 5. guitar: muted doubling of the walk-up, then a twangy answer in the riff's gaps
  {
    const s = new Seq();
    for (let b = 0; b < BARS; b++) {
      if (b % 2 === 1) {
        const walk = ['F3', 'G3', 'Ab3', 'A3'].map(midi);
        walk.forEach((n, k) => s.add(e8(b, 4 + k, sw8), 0.4, 'guitarMute', n, 0.7 + 0.08 * k, 0.2));
      } else if (b >= 4) {
        s.add(e8(b, 1, sw8), 0.4, 'guitar', midi('D4'), 0.6, -0.2);
        s.add(e8(b, 4, sw8), 0.45, 'guitar', midi('C4'), 0.7, -0.2);
        s.add(e8(b, 6, sw8), 0.9, 'guitar', midi('A3'), 0.65, -0.2);
      }
    }
    out.push(
      plan('p-gtr', 'Muted guitar answer', 'A palm-muted guitar doubles the walk-up; after 4 bars it answers the riff in its gaps. Spy twang, kept low.', LOW, [
        hookLayer('p-gtr', LOW, false),
        layer('p-gtr-g', 'Guitar', 'menu', LOW, BARS, s, -26, { room: 0.2, hall: 0.3, far: 0, delay: { beats: 0.75, fb: 0.3, wet: 0.22 } }, { rate: 32000 }),
      ]),
    );
  }

  // 6. metal percussion
  {
    const s = new Seq();
    for (let b = 0; b < BARS; b++) {
      s.add(b * 4, 0, 'kick', 0, 0.5);
      if (b % 4 === 0) s.add(b * 4, 0, 'metal', 0, 0.6, -0.4, 0.5);
      s.add(s16(b, 6, sw), 0, 'plate', 0, 0.45, 0.4, 0.8);
      s.add(s16(b, 12, sw), 0, 'rim', 0, 0.5, 0.2, 0.8);
      if (b % 2 === 1) s.add(s16(b, 10, sw), 0, 'plate', 0, 0.3, -0.3, 1.2);
      if (b % 4 === 3) stutter(s, b * 4 + 3.5, 0.5, 6, 'plate', 0.4, 0.8);
      if (b % 8 === 7) for (const beat of [1, 2]) s.add(b * 4 + beat, 0, 'metal', 0, 0.45, beat === 1 ? -0.5 : 0.5, beat === 1 ? 1 : 1.4142);
    }
    out.push(
      plan('p-metal', 'Metal percussion', 'Struck pipes and plates instead of a drum kit, with a tritone clang every 8 bars. Industrial, Chaos Theory grit.', LOW, [
        hookLayer('p-metal', LOW, false),
        layer('p-metal-m', 'Metal percussion', 'menu', LOW, BARS, s, -27, { room: 0.3, hall: 0.2, far: 0, drive: 1.3 }),
      ]),
    );
  }

  // 7. Alert tempo: hook doubled by a dark bass over a driving break
  const fastDrums = (): Seq => {
    const s = new Seq();
    for (let b = 0; b < BARS; b++) {
      fullBar(s, SK, b, sw * 0.5, 0.95, b % 8);
      if (b % 2 === 0) taiko(s, b * 4, 0.7);
    }
    impact(s, 0, 1);
    impact(s, 32, 0.9);
    roll(s, 63, 64, 0.35, 0.95);
    return s;
  };
  const fastFx = { room: 0.35, hall: 0.1, far: 0, drive: 2.2, lp: 10000, hp: 30 };
  out.push(
    plan('p-alert', 'Alert speed: hook and drums', 'The hook at 138 BPM, doubled by a dark driven bass, over a driving break with low drums. Spotted.', FAST, [
      hookLayer('p-alert', FAST, true),
      layer('p-alert-dr', 'Driving break', 'menu', FAST, BARS, fastDrums(), -20, fastFx),
    ]),
  );

  // 8. Alert tempo plus guitar and piano stabs
  {
    const g = new Seq();
    const sw8f = swing8Of(SK, true);
    for (let b = 0; b < BARS; b++) {
      if (b < 8) continue;
      for (let i = 0; i < 8; i++) {
        const n = SK.hook[(b % 2) * 8 + i];
        if (n === null || n === undefined) continue;
        g.add(e8(b, i, sw8f), 0.3, 'guitarMute', n + 12, i === 0 ? 0.8 : 0.6, 0.25);
      }
    }
    const k = new Seq();
    for (let b = 0; b < BARS; b += 2) for (const [n, i] of [[midi('F3'), 0], [midi('A3'), 1], [midi('C4'), 2], [midi('E4'), 3]] as const) k.add(b * 4 + i * 0.015, 0.6, 'rhodes', n, 0.6, i % 2 ? 0.3 : -0.3);
    out.push(
      plan('p-alert2', 'Alert speed: plus guitar and piano', 'As 7, with a stab of electric piano every 2 bars and, from bar 9, a muted guitar doubling the hook an octave up.', FAST, [
        hookLayer('p-alert2', FAST, true),
        layer('p-alert2-dr', 'Driving break', 'menu', FAST, BARS, fastDrums(), -20, fastFx),
        layer('p-alert2-g', 'Guitar', 'menu', FAST, BARS, g, -24, { room: 0.2, hall: 0.2, far: 0 }, { rate: 32000 }),
        layer('p-alert2-k', 'Electric piano', 'menu', FAST, BARS, k, -25, { room: 0.2, hall: 0.25, far: 0 }, { rate: 32000 }),
      ]),
    );
  }

  return out;
}
