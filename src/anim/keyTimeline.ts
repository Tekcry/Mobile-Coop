/**
 * (marlow-bays T1a, item 15) A keyed clip's keys on its cycle (pure, Babylon-free, no imports but the generated meta):
 * every key the bake poses (a mirrored clip's own keys, then its mirrored half at + 0.5), the key nearest a phase, the
 * next key back or forward from a phase (the Anim Studio's "< key" / "key >"), and the readout
 * "jog - key 2 of 8 (mirror of 6), frame 8". Key numbers in text count from 1.
 */
import { KEY_CLIPS, type KeyClipMeta } from './tuneKeysMeta';
import { KEY_SPAN, KEY_TIMES } from './tuneKeysTime';

/** The clip's meta by name, or null. */
export function keyClip(name: string): KeyClipMeta | null {
  for (let i = 0; i < KEY_CLIPS.length; i++) if (KEY_CLIPS[i]!.name === name) return KEY_CLIPS[i]!;
  return null;
}

/** Every key the bake poses (a mirrored clip: twice its own keys). */
export function keyCount(c: KeyClipMeta): number {
  return c.mirror ? c.phases.length * 2 : c.phases.length;
}

/**
 * Key `k`'s phase (0..1): an own key's, or (a mirrored clip, k >= n) the own key k - n's plus half a cycle.
 * (marlow-bays item 23) A clip with a timing edit: the key's retimed position (`KEY_TIMES`, bake frames).
 */
export function keyPhase(c: KeyClipMeta, k: number): number {
  if (KEY_TIMES.size > 0) {
    const t = KEY_TIMES.get(c.name);
    if (t && k < t.length) return t[k]! / KEY_SPAN;
  }
  const n = c.phases.length;
  if (k < n) return c.phases[k]!;
  return (c.phases[k - n]! + 0.5) % 1;
}

/** The key whose phase is nearest `phase` (wrapping). */
export function keyNearest(c: KeyClipMeta, phase: number): number {
  const p = ((phase % 1) + 1) % 1;
  let best = 0;
  let bd = Infinity;
  const total = keyCount(c);
  for (let k = 0; k < total; k++) {
    let d = Math.abs(keyPhase(c, k) - p);
    if (d > 0.5) d = 1 - d;
    if (d < bd - 1e-9) {
      bd = d;
      best = k;
    }
  }
  return best;
}

/**
 * The next key back (`dir` < 0) or forward from `phase`, wrapping: from a key, its neighbour in phase order; between
 * keys, the nearer one in that direction first. Returns the key index.
 */
export function keyStep(c: KeyClipMeta, phase: number, dir: number): number {
  const p = ((phase % 1) + 1) % 1;
  const total = keyCount(c);
  let best = -1;
  let bd = Infinity;
  for (let k = 0; k < total; k++) {
    const kp = keyPhase(c, k);
    // the distance from p to the key in the step's direction (0 < d <= 1; a key at p itself is a full cycle away)
    let d = dir > 0 ? kp - p : p - kp;
    d = ((d % 1) + 1) % 1;
    if (d < 1e-6) d = 1;
    if (d < bd) {
      bd = d;
      best = k;
    }
  }
  return best < 0 ? 0 : best;
}

/** Key `k` of a mirrored clip: the key it mirrors or is mirrored onto (-1 for a clip keyed in full). */
export function keyMirrorOf(c: KeyClipMeta, k: number): number {
  if (!c.mirror) return -1;
  const n = c.phases.length;
  return k < n ? k + n : k - n;
}

/** The key's frame in the clip (round(phase * frames)). */
export function keyFrame(c: KeyClipMeta, k: number): number {
  return Math.round(keyPhase(c, k) * c.frames) % c.frames;
}

/** "jog - key 2 of 8 (mirror of 6), frame 8": key k (from 0) of clip c. */
export function keyReadout(c: KeyClipMeta, k: number): string {
  const m = keyMirrorOf(c, k);
  return `${c.name} - key ${k + 1} of ${keyCount(c)}${m >= 0 ? ` (mirror of ${m + 1})` : ''}, frame ${keyFrame(c, k)}`;
}
