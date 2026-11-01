/**
 * (marlow-bays T1a, item 15) A keyed clip's keys on its cycle (pure, Babylon-free, no imports but the generated meta):
 * every key the bake poses (a mirrored clip's own keys, then its mirrored half at + 0.5), the key nearest a phase, the
 * next key back or forward from a phase (the Test Chamber's "< key" / "key >"), and the readout
 * "jog - key 2 of 8 (mirror of 6), frame 8". Key numbers in text count from 1.
 * (marlow-bays item 25) A clip with a key added or deleted (`KEY_LIVE`): keys are addressed by key id (the original
 * keys, then the added slots and their mirrors, `tuneKeysEdit.ts`); only live keys count, step and show, numbered in
 * phase order (the same numbers as before for a clip with no add / delete).
 */
import { KEY_CLIPS, type KeyClipMeta } from './tuneKeysMeta';
import { KEY_SPAN, KEY_TIMES } from './tuneKeysTime';
import { KEY_LIVE, keyLiveRank, type KeyLive } from './tuneKeysEdit';

/** The clip's meta by name, or null. */
export function keyClip(name: string): KeyClipMeta | null {
  for (let i = 0; i < KEY_CLIPS.length; i++) if (KEY_CLIPS[i]!.name === name) return KEY_CLIPS[i]!;
  return null;
}

/** (item 25) The clip's live key list (a key added or deleted), or undefined. */
function liveOf(c: KeyClipMeta): KeyLive | undefined {
  return KEY_LIVE.size > 0 ? KEY_LIVE.get(c.name) : undefined;
}

/** Every key the bake poses (a mirrored clip: twice its own keys); (item 25) the live keys when keys were added / deleted. */
export function keyCount(c: KeyClipMeta): number {
  const l = liveOf(c);
  if (l) return l.n;
  return c.mirror ? c.phases.length * 2 : c.phases.length;
}

/** (item 25) The key ids of the clip (0 .. this - 1): the original keys, with keys added / deleted the slots too. */
export function keyIdCount(c: KeyClipMeta): number {
  const l = liveOf(c);
  if (l) return l.at.length;
  return c.mirror ? c.phases.length * 2 : c.phases.length;
}

/** (item 25) Key id `k` is a key now (not deleted, not an empty slot). */
export function keyIsLive(c: KeyClipMeta, k: number): boolean {
  const l = liveOf(c);
  if (l) return k >= 0 && k < l.at.length && l.at[k]! >= 0;
  return k >= 0 && k < (c.mirror ? c.phases.length * 2 : c.phases.length);
}

/** (item 25) Key id `k` is an added key (or an added key's mirror). */
export function keyIsAdded(c: KeyClipMeta, k: number): boolean {
  const l = liveOf(c);
  return !!l && k >= l.T;
}

/**
 * Key `k`'s phase (0..1): an own key's, or (a mirrored clip, k >= n) the own key k - n's plus half a cycle.
 * (marlow-bays item 23) A clip with a timing edit: the key's retimed position (`KEY_TIMES`, bake frames).
 * (item 25) An added key: its place (`KEY_LIVE`).
 */
export function keyPhase(c: KeyClipMeta, k: number): number {
  if (KEY_LIVE.size > 0) {
    const l = KEY_LIVE.get(c.name);
    if (l && k >= l.T) {
      const p = k < l.at.length ? l.at[k]! : -1;
      return p >= 0 ? p / KEY_SPAN : 0;
    }
  }
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
  const total = keyIdCount(c);
  for (let k = 0; k < total; k++) {
    if (!keyIsLive(c, k)) continue;
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
  const total = keyIdCount(c);
  let best = -1;
  let bd = Infinity;
  for (let k = 0; k < total; k++) {
    if (!keyIsLive(c, k)) continue;
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

/** Key `k` of a mirrored clip: the key it mirrors or is mirrored onto (-1 for a clip keyed in full). (item 25) An added
 *  key: its mirror while the Mirror box is on, else -1. */
export function keyMirrorOf(c: KeyClipMeta, k: number): number {
  if (!c.mirror) return -1;
  const l = liveOf(c);
  if (l && k >= l.T) return !l.linked ? -1 : k < l.T + l.S ? k + l.S : k - l.S;
  const n = c.phases.length;
  return k < n ? k + n : k - n;
}

/** The key's frame in the clip (round(phase * frames)). */
export function keyFrame(c: KeyClipMeta, k: number): number {
  return Math.round(keyPhase(c, k) * c.frames) % c.frames;
}

/** (item 25) Key id `k`'s number (from 0) in phase order among the live keys (-1: not live); no add / delete: `k`. */
export function keyRank(c: KeyClipMeta, k: number): number {
  const l = liveOf(c);
  return l ? keyLiveRank(l, k) : k;
}

/** "jog - key 2 of 8 (mirror of 6), frame 8": key k (from 0) of clip c. (item 25) "(added)" / "(deleted)" marked. */
export function keyReadout(c: KeyClipMeta, k: number): string {
  const l = liveOf(c);
  if (!l) {
    const m = keyMirrorOf(c, k);
    return `${c.name} - key ${k + 1} of ${keyCount(c)}${m >= 0 ? ` (mirror of ${m + 1})` : ''}, frame ${keyFrame(c, k)}`;
  }
  const r = keyLiveRank(l, k);
  if (r < 0) return `${c.name} - a deleted key (${keyCount(c)} keys), frame ${keyFrame(c, k)}`;
  const m = keyMirrorOf(c, k);
  const mr = m >= 0 ? keyLiveRank(l, m) : -1;
  return `${c.name} - key ${r + 1} of ${l.n}${mr >= 0 ? ` (mirror of ${mr + 1})` : ''}${k >= l.T ? ' (added)' : ''}, frame ${keyFrame(c, k)}`;
}
