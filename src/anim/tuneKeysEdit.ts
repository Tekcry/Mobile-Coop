/**
 * (marlow-bays item 25) Add / delete keys (pure, Babylon-free; imports only tuneKeysTime): the live key list of a keyed
 * clip with keys inserted or removed in the tuner.
 *
 * The state is plain sliders (no store version bump):
 * - `del` (0 / 1) in an original key's group `key.<clip>.<k>`: the key is deleted. Never the first key (the cycle
 *   start). With a mirrored clip's Mirror box on, an own key's `del` deletes its mirrored key too (the mirrored half's
 *   `del` is ignored while on); off, every key on its own.
 * - Per clip `KEY_ADD_SLOTS` added-key groups `key.<clip>.a<s>`: the slider `at` (bake frames, 1/48 of the cycle; 0 the
 *   slot is empty) and the key field sliders (deltas on the pose the original keys blend to at that time, so a key
 *   added with the deltas the live preview shows there leaves the pose unchanged). With the Mirror box on an added key
 *   sits in the own half (1 .. 23) and the bake mirrors it half a cycle on; off, anywhere in the cycle (1 .. 47).
 * Rules (`keyLiveSolve`): an added key never sits on another key (an original key, deleted or not, or an earlier
 * slot); at least `KEY_MIN` keys a cycle stay (2 own keys with the Mirror box on): deletes past it are ignored.
 *
 * Key ids (the tuner, the chamber and the key timeline index keys by them): 0 .. T-1 the original keys (a mirrored
 * clip's own keys, then its mirrored half), T + s added slot s, T + S + s the mirror of slot s (Mirror box on).
 */
import { KEY_SPAN, keyTimeCount, type KeyTimeClip } from './tuneKeysTime';

/** Added-key groups per clip. */
export const KEY_ADD_SLOTS = 8;
/** The slider that deletes an original key (0 / 1). */
export const KEY_DEL_ID = 'del';
/** The slider that places an added key (bake frames; 0 the slot is empty). */
export const KEY_AT_ID = 'at';
/** The fewest keys a cycle (with the Mirror box on: 2 own keys and their mirrors). */
export const KEY_MIN = 4;

export const keyAddedGroupId = (clip: string, s: number): string => `key.${clip}.a${s}`;

/** An added-key group -> [clip, slot], or null. */
export function parseKeyAdded(g: string): [string, number] | null {
  const m = /^key\.([a-z0-9_]+)\.a(\d+)$/.exec(g);
  if (!m) return null;
  const s = Number(m[2]);
  return s < KEY_ADD_SLOTS ? [m[1]!, s] : null;
}

/** One clip's live keys (preallocate with `newKeyLive`; `keyLiveSolve` fills it). */
export interface KeyLive {
  /** Original keys (every key the bake poses) and added slots. */
  readonly T: number;
  readonly S: number;
  /** The Mirror box the list was solved with (a mirrored clip: the added keys' mirrors are live ids T + S + s). */
  linked: boolean;
  /** Live keys, in phase order: their ids and positions (bake frames). */
  n: number;
  readonly ids: Int16Array;
  readonly pos: Int16Array;
  /** Per id (T + 2S): its position (bake frames), -1 when not live (deleted, an empty slot). */
  readonly at: Int16Array;
  /** Per original key: 1 deleted. */
  readonly dead: Uint8Array;
  /** Any key added or deleted. */
  edited: boolean;
}

export function newKeyLive(T: number, S = KEY_ADD_SLOTS): KeyLive {
  const cap = T + 2 * S;
  return { T, S, linked: false, n: 0, ids: new Int16Array(cap), pos: new Int16Array(cap), at: new Int16Array(cap).fill(-1), dead: new Uint8Array(T), edited: false };
}

/** Whose sliders edit key `id`: a mirrored key (Mirror box on) its own key, an added key's mirror its slot. */
export function keyLiveOwner(c: KeyTimeClip, live: KeyLive, id: number): number {
  const n = c.phases.length;
  if (id >= live.T + live.S) return id - live.S;
  if (id < live.T && live.linked && c.mirror && id >= n) return id - n;
  return id;
}

/** The key id's partner on the other half (a mirrored clip with its Mirror box on), or -1. */
export function keyLivePartner(c: KeyTimeClip, live: KeyLive, id: number): number {
  if (!c.mirror || !live.linked) return -1;
  const n = c.phases.length;
  if (id < live.T) return id < n ? id + n : id - n;
  return id < live.T + live.S ? id + live.S : id - live.S;
}

/**
 * The live key list from the original keys' solved positions `origPos` (bake frames, `keyTimeSolve`), the `del` values
 * per original key and the `at` values per slot, into `out`. True when any key is added or deleted. No allocation.
 */
export function keyLiveSolve(c: KeyTimeClip, origPos: ArrayLike<number>, mirrorOn: boolean, del: ArrayLike<number>, at: ArrayLike<number>, out: KeyLive): boolean {
  const n = c.phases.length;
  const T = keyTimeCount(c);
  const S = out.S;
  const linked = c.mirror && mirrorOn;
  const U = linked ? KEY_SPAN / 2 : KEY_SPAN;
  const own = linked ? n : T;
  out.linked = linked;
  out.at.fill(-1);
  out.dead.fill(0);
  let count = T;
  let edited = false;
  for (let s = 0; s < S; s++) {
    const v = at[s];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    const p = Math.round(v);
    if (p < 1 || p > U - 1) continue;
    let hit = false;
    for (let i = 0; i < own && !hit; i++) if (origPos[i] === p) hit = true;
    for (let s2 = 0; s2 < s && !hit; s2++) if (out.at[T + s2] === p) hit = true;
    if (hit) continue;
    out.at[T + s] = p;
    if (linked) out.at[T + S + s] = p + U;
    count += linked ? 2 : 1;
    edited = true;
  }
  const step = linked ? 2 : 1;
  for (let i = 1; i < own; i++) {
    const v = del[i];
    if (typeof v !== 'number' || !(v >= 0.5) || count - step < KEY_MIN) continue;
    out.dead[i] = 1;
    if (linked) out.dead[i + n] = 1;
    count -= step;
    edited = true;
  }
  for (let i = 0; i < T; i++) if (!out.dead[i]) out.at[i] = origPos[i]!;
  // the live ids in phase order (insertion sort: at most T + 2S keys)
  let m = 0;
  for (let id = 0; id < T + 2 * S; id++) {
    const p = out.at[id]!;
    if (p < 0) continue;
    let j = m++;
    while (j > 0 && out.pos[j - 1]! > p) {
      out.pos[j] = out.pos[j - 1]!;
      out.ids[j] = out.ids[j - 1]!;
      j--;
    }
    out.pos[j] = p;
    out.ids[j] = id;
  }
  out.n = m;
  out.edited = edited;
  return edited;
}

/** The live rank (0 ..) of key id `id`, or -1 when it is not live. */
export function keyLiveRank(live: KeyLive, id: number): number {
  for (let r = 0; r < live.n; r++) if (live.ids[r] === id) return r;
  return -1;
}

/**
 * Where a key added after live key `id` lands (bake frames): midway (rounded down) to the next live key, in the own
 * half with the Mirror box on (the mirror of the first key ends it), else in the cycle (the first key again ends it);
 * never on an original key's position (a deleted key's included) or another added key. -1: no room (keys one frame
 * apart) or `id` is not live.
 */
export function keyInsertPos(c: KeyTimeClip, live: KeyLive, origPos: ArrayLike<number>, id: number): number {
  const T = live.T;
  if (id < 0 || id >= live.at.length || live.at[id]! < 0) return -1;
  const U = live.linked ? KEY_SPAN / 2 : KEY_SPAN;
  let cur = live.at[id]!;
  if (cur >= U) cur -= U;
  const own = live.linked ? c.phases.length : T;
  const taken = (p: number): boolean => {
    for (let i = 0; i < own; i++) if (origPos[i] === p) return true;
    for (let s = 0; s < live.S; s++) if (live.at[T + s] === p) return true;
    return false;
  };
  let next = U;
  for (let r = 0; r < live.n; r++) {
    let p = live.pos[r]!;
    if (live.linked && p >= U) p -= U;
    if (p > cur && p < next) next = p;
  }
  if (next - cur < 2) return -1;
  const mid = cur + Math.floor((next - cur) / 2);
  for (let d = 0; d < next - cur; d++) {
    for (const p of [mid - d, mid + d]) if (p > cur && p < next && !taken(p)) return p;
  }
  return -1;
}

/**
 * Knot values at position `x` (0 .. `span`, wraps; bake frames by default): linear between the knots (positions `pos`, sorted, `n` of them,
 * `nf` values each in `vals`, knot-major), the last knot to the first a cycle on, as the live preview spreads key edits
 * (tuneKeys `build`) and the bake's linear key read (key_clip.py `lerp_key`). Into `out`. No allocation.
 */
export function keyKnotsAt(pos: ArrayLike<number>, vals: ArrayLike<number>, n: number, nf: number, x: number, out: { [i: number]: number }, span: number = KEY_SPAN): void {
  if (n <= 0) {
    for (let j = 0; j < nf; j++) out[j] = 0;
    return;
  }
  const p = ((x % span) + span) % span;
  let a = n - 1;
  for (let s = 0; s < n; s++) if (pos[s]! <= p) a = s;
  const b = (a + 1) % n;
  let pa = pos[a]!;
  let pb = pos[b]!;
  if (pa > p) pa -= span;
  if (pb <= pa) pb += span;
  const t = pb > pa ? (p - pa) / (pb - pa) : 0;
  for (let j = 0; j < nf; j++) {
    const va = vals[a * nf + j]!;
    out[j] = va + (vals[b * nf + j]! - va) * t;
  }
}

/**
 * The live key lists per clip name, written by `tuneKeys` while a clip has a key added or deleted; no entry: the clip's
 * keys are the baked ones (`KEY_TIMES` for their times). `keyTimeline` reads it.
 */
export const KEY_LIVE = new Map<string, KeyLive>();
