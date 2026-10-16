/**
 * Playing recorded orchestral notes onto a stereo canvas (node, offline). A note picks the nearest recorded pitch and
 * varispeeds it (sampler style). A sustained note longer than its recording is extended by looping the steady middle
 * of the recording with crossfades. The attack time doubles as a crescendo (a long fade-in is a swell).
 */
import { place, RATE, type Stereo } from '../../music/render/canvas';
import type { Bank } from './bank';

export interface NoteOpts {
  /** 0..1: chooses the loud or soft recording and sets the gain. */
  vel: number;
  /** Force the loud or soft recording. */
  loud?: boolean;
  attack?: number;
  release?: number;
  /** Pan the mono sum (unset: the recording's own stereo image). */
  pan?: number;
  lp?: number;
}

const gainOf = (vel: number): number => Math.pow(Math.max(0, vel), 1.4);

export function note(c: Stereo, bank: Bank, inst: string, midi: number, t: number, dur: number, o: NoteOpts): void {
  const z = bank.pick(inst, midi, o.loud ?? o.vel > 0.62);
  const s = bank.src(z);
  const semis = midi - z.midi;
  const rate = Math.pow(2, semis / 12);
  const avail = s.mono.length / RATE / rate;
  const rel = o.release ?? 0.35;
  const att = o.attack ?? 0.006;
  const gain = gainOf(o.vel);
  const total = dur + rel;
  const base = { semis, gain, ...(o.pan !== undefined ? { pan: o.pan } : {}), ...(o.lp ? { lp: o.lp } : {}) };
  if (total <= avail * 0.92) {
    place(c, s, { ...base, t, dur: total, fadeIn: att, fadeOut: rel });
    return;
  }
  // sustain: the first part of the recording, then its steady middle looped with crossfades
  const xf = 0.35;
  const head = avail * 0.88;
  place(c, s, { ...base, t, dur: head, fadeIn: att, fadeOut: xf });
  const loopFrom = Math.min(avail * 0.3, 1.2);
  const loopLen = Math.max(0.8, head - loopFrom);
  let tt = t + head - xf;
  const end = t + total;
  while (tt < end - 0.05) {
    const remain = end - tt;
    const last = remain <= loopLen;
    const len = last ? remain : loopLen;
    place(c, s, { ...base, t: tt, start: loopFrom * rate, dur: len, fadeIn: Math.min(xf, len / 2), fadeOut: last ? Math.min(rel, len / 2) : xf });
    if (last) break;
    tt += len - xf;
  }
}

/** A percussion hit (or any recording played whole), optionally pitched. */
export function hit(c: Stereo, bank: Bank, inst: string, which: number, t: number, gain: number, semis = 0, pan?: number): void {
  const z = bank.pickHit(inst, which);
  place(c, bank.src(z), { t, gain, semis, ...(pan !== undefined ? { pan } : {}) });
}

/** A tuned timpani hit: the recorded drum nearest the note, pitched to it. */
export function timp(c: Stereo, bank: Bank, midi: number, t: number, vel: number, roll = false): void {
  const inst = roll ? 'timpRoll' : 'timp';
  const z = bank.pick(inst, midi, vel > 0.6);
  place(c, bank.src(z), { t, gain: gainOf(vel), semis: midi - z.midi });
}

/**
 * A recording that swells INTO time `t` (a cymbal roll crescendo ending on a downbeat): its loudest point lands on `t`.
 */
export function swellInto(c: Stereo, bank: Bank, inst: string, which: number, t: number, gain: number): void {
  const z = bank.pickHit(inst, which);
  const s = bank.src(z);
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
  place(c, s, { t: t - peakT, gain, dur: peakT + 0.25, fadeOut: 0.25 });
}
