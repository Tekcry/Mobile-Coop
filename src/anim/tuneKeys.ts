/**
 * (tuner-v2 item 4) Per-key editing of the keyed clips: the registry section "Keys" (groups `key.<clip>.<key>`, every
 * key of every clip in `scripts/anim-keys/keys`, picker order clip then key; sliders `KEY_FIELDS`, deltas on the key's
 * own fields), and its live preview: an edited clip gets per-frame offset tables (`KeyedClip.keyOff`, allocated on its
 * first edit, rewritten in place after) that `sampleKeyed` blends exactly as it blends the clip. A key's offset spreads
 * linearly to its neighbouring keys (the mirrored half of a mirrored clip follows, as the bake makes it).
 * No edits: every `keyOff` is null and the sampler is bit-identical. Export: `tuneKeysClipValues` + `applyKeyEdits`, or
 * the panel's Export file through `scripts/anim-keys/apply-tune.mjs` (docs/tuner-v2/ITEM4.md).
 * (marlow-bays T1a) Item 17: head, shoulder, upper arm and forearm twist and the pelvis shift per key. Item 18: a
 * mirrored clip has groups for its mirrored half too (`key.<clip>.<n .. 2n-1>`) and a Mirror box (`key.<clip>.mirror`,
 * slider `mirror`, 1 on by default): on, the mirrored half follows the own keys (an edit shows on both arms half a cycle
 * apart); off, every key is its own (`tuneKeysMirror` copies the mirror image in when it goes off, so nothing jumps).
 * (marlow-bays item 25) Add / delete keys (`tuneKeysEdit.ts`): per clip `KEY_ADD_SLOTS` added-key groups
 * `key.<clip>.a<s>` (slider `at` + the field sliders) and a `del` slider per key; the live key list goes to `KEY_LIVE`
 * (the key timeline reads it). Live: an added key is one more knot of the offset tables (its deltas: zero change at
 * its time when added with the offset the preview shows there, `tuneKeysAdd`); a deleted key's knot takes the pose its
 * live neighbours blend to there minus its own (the key files' field values, loaded on the clip's first delete).
 */
import './tuneV2Sections'; // the tuner-v2 sections register first (the panel order ends Stepping, then Keys)
import type { KeyedClip, KeyedOffsets, KeyedTime } from './keyed';
import { KEY_CLIPS } from './tuneKeysMeta';
import { KEY_FIELDS, KEY_FIELD_INDEX, keyGroupId, keyMirrorGroupId, mirrorDelta, parseKeyGroup, readKeys, type KeyFile } from './tuneKeysFile';
import { registerTuneSection, TUNE_LOG, tuneSet, type TuneChange, type TuneTunable } from './tuneRegistry';
import { keyCount, keyPhase, keyRank } from './keyTimeline';
import { KEY_SPAN, KEY_TIME_ID, KEY_TIME_MAX, KEY_TIMES, keyBasePos, keyRetimeRange, keyTimeCount, keyTimeSolve, type KeyRetimeRange } from './tuneKeysTime';
import { KEY_ADD_SLOTS, KEY_AT_ID, KEY_DEL_ID, KEY_LIVE, KEY_MIN, keyAddedGroupId, keyInsertPos, keyKnotsAt, keyLivePartner, keyLiveSolve, newKeyLive, parseKeyAdded, type KeyLive } from './tuneKeysEdit';

const NF = KEY_FIELDS.length;
const S = KEY_ADD_SLOTS;
/** The bake keys at round(phase * 48) of a 48-frame span (key_clip.py `SPAN`). */
const SPAN = 48;
/** (T1a) Wren's height in the bake (the generated clips' header): a pelvis cm in the 1.75 m body frame. */
const WREN_H = 1.68;
const CM = (0.01 * 1.75) / WREN_H;

/** Every runtime clip by name (the generated `clips/keyed/*.ts`, the same modules the game imports). */
const CLIPS = new Map<string, KeyedClip>();
for (const mod of Object.values(import.meta.glob('./clips/keyed/*.ts', { eager: true }) as Record<string, Record<string, unknown>>)) {
  for (const v of Object.values(mod)) {
    const c = v as Partial<KeyedClip> | null;
    if (c && typeof c === 'object' && typeof c.name === 'string' && c.pel instanceof Float32Array) CLIPS.set(c.name, c as KeyedClip);
  }
}
/** (item 25) The key files, loaded on a clip's first delete (a deleted key's live pose needs the keys' field values). */
const KEY_FILES = import.meta.glob('../../scripts/anim-keys/keys/*.json', { import: 'default' }) as Record<string, () => Promise<unknown>>;

/** Group ids per clip (KEY_CLIPS order), then key (a mirrored clip: its 2n keys, the mirrored half last). */
export const KEY_GROUP_IDS: readonly (readonly string[])[] = KEY_CLIPS.map((c) => Array.from({ length: keyTimeCount(c) }, (_, k) => keyGroupId(c.name, k)));
/** (item 25) The added-key groups per clip (KEY_CLIPS order), slot 0 .. KEY_ADD_SLOTS - 1. */
export const KEY_ADDED_IDS: readonly (readonly string[])[] = KEY_CLIPS.map((c) => Array.from({ length: S }, (_, s) => keyAddedGroupId(c.name, s)));
/** (T1a, item 18) The Mirror box group per clip ('' for a clip keyed in full). */
export const KEY_MIRROR_IDS: readonly string[] = KEY_CLIPS.map((c) => (c.mirror ? keyMirrorGroupId(c.name) : ''));
const ALL_KEY_GROUPS: readonly string[] = KEY_GROUP_IDS.flat();
const ADDED_GROUPS: readonly string[] = KEY_ADDED_IDS.flat();
const MIRROR_GROUPS: readonly string[] = KEY_MIRROR_IDS.filter((g) => g !== '');
const FIELD_IDS: readonly string[] = KEY_FIELDS.map((f) => f.id);
/** The picker order: per clip its keys, then its added keys. */
const PICK_GROUPS: readonly string[] = KEY_CLIPS.flatMap((_, ci) => [...KEY_GROUP_IDS[ci]!, ...KEY_ADDED_IDS[ci]!]);

const sliders: TuneTunable[] = KEY_FIELDS.map((f) => ({
  id: f.id,
  label: `${f.label} (this key)`,
  kind: 'add' as const,
  def: 0,
  min: f.min,
  max: f.max,
  step: f.step,
  unit: f.unit,
  groups: PICK_GROUPS,
  hook: `keyed sampler: key ${f.seg}${f.sub ? `.${f.sub}` : ''}.${f.field} (+ ${f.unit}), baked by scripts/anim-keys/apply-tune.mjs`,
}));
// (marlow-bays item 23) the key's time: bake frames (1/48 of the cycle), + later. The Keys tab's timing control sets it
// (clamped between the neighbouring keys, `tuneKeysRetime`); the panel shows no plain slider row for it.
sliders.push({ id: KEY_TIME_ID, label: 'key time (bake frames, 1/48 of the cycle; + later)', kind: 'add', def: 0, min: -KEY_TIME_MAX, max: KEY_TIME_MAX, step: 1, unit: 'fr', groups: ALL_KEY_GROUPS, hook: 'tuneKeys: the key slid in its clip (keyed sampler keyTime), baked by scripts/anim-keys/apply-tune.mjs into the key phase' });
sliders.push({ id: 'mirror', label: 'mirror the keys onto the other arm (1 on, 0 off)', kind: 'add', def: 1, min: 0, max: 1, step: 1, unit: '', groups: MIRROR_GROUPS, hook: 'tuneKeys: the mirrored half follows the own keys (off: every key its own; the bake writes the clip in full)' });
// (marlow-bays item 25) delete a key (1) and an added key's time (bake frames; 0 the slot is empty). The Keys tab's
// "Add key" / "Delete key" buttons set them (`tuneKeysAdd`, `tuneKeysDelete`); the panel shows no slider row for them.
sliders.push({ id: KEY_DEL_ID, label: 'key deleted (1 deleted, 0 kept)', kind: 'add', def: 0, min: 0, max: 1, step: 1, unit: '', groups: ALL_KEY_GROUPS, hook: 'tuneKeys: the key removed from its clip (key timeline KEY_LIVE), baked by scripts/anim-keys/apply-tune.mjs' });
sliders.push({ id: KEY_AT_ID, label: 'added key time (bake frames, 1/48 of the cycle; 0 none)', kind: 'add', def: 0, min: 0, max: KEY_SPAN - 1, step: 1, unit: 'fr', groups: ADDED_GROUPS, hook: 'tuneKeys: a key added to its clip at this time (key timeline KEY_LIVE), baked by scripts/anim-keys/apply-tune.mjs' });

export const KEYS_SECTION = registerTuneSection({
  id: 'keys',
  label: 'Keys',
  groups: [...PICK_GROUPS, ...MIRROR_GROUPS],
  tunables: sliders,
  notes: (group, id) => {
    if (id !== FIELD_IDS[0]) return [];
    const at = tuneKeysIdOf(group);
    const ci = at ? KEY_CLIPS.findIndex((c) => c.name === at[0]) : -1;
    const c = KEY_CLIPS[ci];
    if (!c || !at) return [];
    const k = at[1];
    const ph = keyPhase(c, k);
    const r = keyRank(c, k);
    if (r < 0) return [`${c.name}: ${k >= keyTimeCount(c) ? 'an empty added-key slot' : 'a deleted key'}`];
    const n = c.phases.length;
    const T = keyTimeCount(c);
    const mir = !c.mirror || k >= T ? (k >= T ? ' (added)' : '') : k < n ? `, mirrored onto key ${keyRank(c, k + n) + 1}` : `, the mirror of key ${keyRank(c, k - n) + 1}`;
    return [`${c.name} key ${r + 1} of ${keyCount(c)}: phase ${ph.toFixed(3)} (frame ${Math.round(ph * c.frames) % c.frames} of ${c.frames})${mir}`];
  },
});

// mirrored key: trunk (and head) yaw / roll and the pelvis dx negated, the arms swapped side for side (key_clip.py `mirror_key`)
const MIR_IDX = new Int32Array(NF);
const MIR_SGN = new Float64Array(NF);
KEY_FIELDS.forEach((f, j) => {
  const arm = f.seg === 'armL' || f.seg === 'armR';
  const partner = arm ? KEY_FIELD_INDEX[`arm${f.seg === 'armL' ? 'R' : 'L'}${f.id.slice(4)}`]! : j;
  MIR_IDX[j] = partner;
  MIR_SGN[j] = !arm && (f.field === 'yaw' || f.field === 'roll' || f.field === 'dx') ? -1 : 1;
});
const FI = (id: string): number => KEY_FIELD_INDEX[id]!;
const TRUNK4 = ['pelvis', 'spine', 'chest', 'neck'] as const;
const T_IDX = TRUNK4.map((s) => [FI(`${s}_yaw`), FI(`${s}_pitch`), FI(`${s}_roll`)] as const);
const HEAD = [FI('head_yaw'), FI('head_pitch'), FI('head_roll')] as const;
const PEL = [FI('pelvis_dx'), FI('pelvis_dy'), FI('pelvis_dz')] as const;
interface ArmIdx {
  fl: number;
  ab: number;
  el: number;
  inw: number;
  tw: number;
  twU: number;
  wp: number;
  wy: number;
  wr: number;
  sp: number;
  sy: number;
  sr: number;
}
const armIdx = (s: 'L' | 'R'): ArmIdx => ({
  fl: FI(`arm${s}_flex`),
  ab: FI(`arm${s}_abd`),
  el: FI(`arm${s}_elbow`),
  inw: FI(`arm${s}_inward`),
  tw: FI(`arm${s}_twist`),
  twU: FI(`arm${s}_twistUpper`),
  wp: FI(`arm${s}_wristPitch`),
  wy: FI(`arm${s}_wristYaw`),
  wr: FI(`arm${s}_wristRoll`),
  sp: FI(`arm${s}_shPitch`),
  sy: FI(`arm${s}_shYaw`),
  sr: FI(`arm${s}_shRoll`),
});
const ARMS: readonly ArmIdx[] = [armIdx('L'), armIdx('R')];
const both = (f: (a: ArmIdx) => number[]): number[] => [...f(ARMS[0]!), ...f(ARMS[1]!)];
const ON_WRIST = both((a) => [a.wp, a.wy, a.wr]);
const ON_FORE = both((a) => [a.tw]);
const ON_SH = both((a) => [a.sp, a.sy, a.sr]);
const ON_TWU = both((a) => [a.twU]);
/** The mirror image of field row `src` (at `so`) into `dst` (at `d0`). */
function mirrorRow(src: ArrayLike<number>, so: number, dst: Float64Array, d0: number): void {
  for (let j = 0; j < NF; j++) dst[d0 + j] = MIR_SGN[j]! * src[so + MIR_IDX[j]!]!;
}

interface ClipEdit {
  readonly clip: KeyedClip;
  readonly meta: (typeof KEY_CLIPS)[number];
  /** The applied values, key (every key, a mirrored clip's 2n) x field. */
  readonly deg: Float64Array;
  /** (item 25) The applied added-key deltas, slot x field. */
  readonly add: Float64Array;
  /** The Mirror box applied (a mirrored clip; 1 for the others). */
  mirror: number;
  /** (item 25) The knots of the offset tables: count, phases (sorted), values (knot x field). */
  kn: number;
  readonly kph: Float64Array;
  readonly kval: Float64Array;
  readonly off: KeyedOffsets;
}
const EDITS: (ClipEdit | null)[] = KEY_CLIPS.map(() => null);

/** (marlow-bays item 23) One clip's key timing: the registry moves, the solved positions and the sampler's knots. */
interface ClipTime {
  readonly offs: Float64Array;
  readonly pos: Int16Array;
  readonly kt: KeyedTime;
  /** The Mirror box the positions were solved with (-1: never). */
  mirror: number;
  /** A key sits off its baked position. */
  on: boolean;
}
const TIMES: (ClipTime | null)[] = KEY_CLIPS.map(() => null);

/** (marlow-bays item 25) One clip's added / deleted keys: the registry values, the original positions, the live list. */
interface ClipLive {
  readonly del: Float64Array;
  readonly at: Float64Array;
  readonly opos: Int16Array;
  readonly live: KeyLive;
  /** The Mirror box solved with (-1 never) and the key files' load state applied. */
  mirror: number;
  fileVer: number;
}
const LIVES: (ClipLive | null)[] = KEY_CLIPS.map(() => null);
/** (item 25) The key files' field values per clip (every key the bake poses x field), null until loaded. */
const FVALS: (Float64Array | null)[] = KEY_CLIPS.map(() => null);
const FLOADS: (Promise<void> | null)[] = KEY_CLIPS.map(() => null);
let fileVer = 0;

/**
 * Registry -> one clip's key positions (`KEY_TIMES`, `KeyedClip.keyTime`); allocates only on the clip's first retime.
 * True when the positions moved (the per-key offsets are rebuilt on them).
 */
function syncTime(ci: number, clip: KeyedClip | undefined, mir: number): boolean {
  const meta = KEY_CLIPS[ci]!;
  const groups = KEY_GROUP_IDS[ci]!;
  let t = TIMES[ci];
  if (!t) {
    let any = false;
    for (let k = 0; k < groups.length; k++) if (KEYS_SECTION.values[groups[k]!]![KEY_TIME_ID] !== 0) any = true;
    if (!any) return false;
    const total = groups.length;
    const oldPos = new Float64Array(total);
    for (let k = 0; k < total; k++) oldPos[k] = keyBasePos(meta, k);
    t = { offs: new Float64Array(total), pos: new Int16Array(total), kt: { n: total, newPos: Float64Array.from(oldPos), oldPos }, mirror: -1, on: false };
    TIMES[ci] = t;
  }
  let diff = t.mirror !== mir;
  for (let k = 0; k < groups.length; k++) {
    const v = KEYS_SECTION.values[groups[k]!]![KEY_TIME_ID]!;
    if (v !== t.offs[k]) {
      t.offs[k] = v;
      diff = true;
    }
  }
  if (!diff) return false;
  t.mirror = mir;
  const moved = keyTimeSolve(meta, t.offs, mir === 1, t.pos);
  let changed = moved !== t.on;
  for (let k = 0; k < t.pos.length; k++) {
    if (t.kt.newPos[k] !== t.pos[k]) {
      t.kt.newPos[k] = t.pos[k]!;
      changed = true;
    }
  }
  t.on = moved;
  if (moved) KEY_TIMES.set(meta.name, t.pos);
  else KEY_TIMES.delete(meta.name); // back to the keys as baked: the sampler reads the clip bit for bit
  if (clip) clip.keyTime = moved ? t.kt : null;
  return changed;
}

/** (item 25) The original keys' positions now (bake frames): retimed, else as baked. */
function origPosInto(ci: number, out: Int16Array): void {
  const meta = KEY_CLIPS[ci]!;
  const t = TIMES[ci];
  for (let k = 0; k < out.length; k++) out[k] = t && t.on ? t.pos[k]! : keyBasePos(meta, k);
}

/** (item 25) Load a clip's key file (once; a deleted key's live pose needs its field values). */
function needFile(ci: number): void {
  if (FVALS[ci] || FLOADS[ci]) return;
  const meta = KEY_CLIPS[ci]!;
  const path = Object.keys(KEY_FILES).find((p) => p.endsWith(`/${meta.name}.json`));
  if (!path) return;
  FLOADS[ci] = KEY_FILES[path]!()
    .then((f) => {
      const keys = readKeys(f as KeyFile); // phase order = key order for the files as baked (own keys, then the mirrored half)
      if (keys.length !== keyTimeCount(meta)) return;
      const v = new Float64Array(keys.length * NF);
      keys.forEach((k, i) => v.set(k.v, i * NF));
      FVALS[ci] = v;
      fileVer++;
      syncClip(ci);
    })
    .catch(() => undefined);
}

/** (item 25) Every key file a delete asked for is loaded (tests, the e2e). */
export async function tuneKeysFilesReady(): Promise<void> {
  await Promise.all(FLOADS.filter((p): p is Promise<void> => !!p));
}

/**
 * (item 25) Registry -> one clip's live key list (`KEY_LIVE`); allocates only on the clip's first add / delete. True
 * when the list (or what its offsets need) changed.
 */
function syncLive(ci: number, mir: number, timeMoved: boolean): boolean {
  const meta = KEY_CLIPS[ci]!;
  const groups = KEY_GROUP_IDS[ci]!;
  const added = KEY_ADDED_IDS[ci]!;
  let L = LIVES[ci];
  if (!L) {
    let any = false;
    for (let k = 0; k < groups.length; k++) if (KEYS_SECTION.values[groups[k]!]![KEY_DEL_ID] !== 0) any = true;
    for (let s = 0; s < S; s++) if (KEYS_SECTION.values[added[s]!]![KEY_AT_ID] !== 0) any = true;
    if (!any) return false;
    const T = groups.length;
    L = { del: new Float64Array(T), at: new Float64Array(S), opos: new Int16Array(T), live: newKeyLive(T), mirror: -1, fileVer: -1 };
    LIVES[ci] = L;
  }
  let diff = timeMoved || L.mirror !== mir || L.fileVer !== fileVer;
  for (let k = 0; k < groups.length; k++) {
    const v = KEYS_SECTION.values[groups[k]!]![KEY_DEL_ID]!;
    if (v !== L.del[k]) {
      L.del[k] = v;
      diff = true;
    }
  }
  for (let s = 0; s < S; s++) {
    const v = KEYS_SECTION.values[added[s]!]![KEY_AT_ID]!;
    if (v !== L.at[s]) {
      L.at[s] = v;
      diff = true;
    }
  }
  if (!diff) return false;
  const was = L.live.edited;
  L.mirror = mir;
  L.fileVer = fileVer;
  origPosInto(ci, L.opos);
  const on = keyLiveSolve(meta, L.opos, mir === 1, L.del, L.at, L.live);
  let dead = false;
  for (let k = 0; k < L.live.dead.length; k++) if (L.live.dead[k]) dead = true;
  if (dead) needFile(ci);
  if (on) KEY_LIVE.set(meta.name, L.live);
  else KEY_LIVE.delete(meta.name);
  return on || was;
}

const D2R = Math.PI / 180;
/** Ry(yaw) * Rx(pitch) * Rz(roll) (deg) into o[t] (Babylon's RotationYawPitchRoll). */
function eul(o: Float32Array, t: number, yaw: number, pitch: number, roll: number): void {
  const hy = yaw * D2R * 0.5;
  const hp = pitch * D2R * 0.5;
  const hr = roll * D2R * 0.5;
  const cy = Math.cos(hy);
  const sy = Math.sin(hy);
  const cp = Math.cos(hp);
  const sp = Math.sin(hp);
  const cr = Math.cos(hr);
  const sr = Math.sin(hr);
  o[t] = cy * sp * cr + sy * cp * sr;
  o[t + 1] = sy * cp * cr - cy * sp * sr;
  o[t + 2] = cy * cp * sr - sy * sp * cr;
  o[t + 3] = cy * cp * cr + sy * sp * sr;
}

function meanInto(q: Float32Array, N: number, stride: number, m: Float32Array): void {
  m.fill(0);
  for (let f = 0; f < N; f++) for (let c = 0; c < stride; c++) m[c]! += q[f * stride + c]! / N;
  for (let s = 0; s < stride; s += 4) {
    const l = Math.sqrt(m[s]! ** 2 + m[s + 1]! ** 2 + m[s + 2]! ** 2 + m[s + 3]! ** 2) || 1;
    for (let c = 0; c < 4; c++) m[s + c] = m[s + c]! / l;
  }
}

function meanLin(v: Float32Array, N: number, stride: number, m: Float32Array): void {
  m.fill(0);
  for (let f = 0; f < N; f++) for (let c = 0; c < stride; c++) m[c]! += v[f * stride + c]! / N;
}

const D = new Float64Array(NF);
const D2 = new Float64Array(NF);

/**
 * The offset tables' knots (`e.kn`, `e.kph`, `e.kval`): every original key at its time (the mirrored half the own key
 * mirrored with the Mirror box on) and (item 25) every live added key; a deleted key's knot takes its live neighbours'
 * blended pose minus its own (0 until the key file is loaded). True when any knot is off zero.
 */
function knots(e: ClipEdit, ci: number): boolean {
  const { meta, deg, add } = e;
  const nk = meta.phases.length;
  const mirrorOn = e.mirror >= 0.5;
  const total = keyTimeCount(meta);
  const L = LIVES[ci];
  const live = L && L.live.edited ? L.live : null;
  const kph = e.kph;
  const kv = e.kval;
  // the knot ids (sorted by phase): every original key, then the live added keys
  let m = 0;
  const ids = KNOT_IDS;
  const put = (id: number, ph: number): void => {
    let j = m++;
    while (j > 0 && kph[j - 1]! > ph) {
      kph[j] = kph[j - 1]!;
      ids[j] = ids[j - 1]!;
      j--;
    }
    kph[j] = ph;
    ids[j] = id;
  };
  for (let i = 0; i < total; i++) put(i, Math.round((keyPhase(meta, i) % 1) * SPAN) / SPAN);
  if (live) for (let id = total; id < live.at.length; id++) if (live.at[id]! >= 0) put(id, live.at[id]! / SPAN);
  e.kn = m;
  let nonzero = false;
  for (let r = 0; r < m; r++) {
    const id = ids[r]!;
    const o = r * NF;
    if (id >= total) {
      const s = id - total;
      if (s < S) for (let j = 0; j < NF; j++) kv[o + j] = add[s * NF + j]!;
      else mirrorRow(add, (s - S) * NF, kv, o);
    } else if (id >= nk && mirrorOn) mirrorRow(deg, (id - nk) * NF, kv, o);
    else for (let j = 0; j < NF; j++) kv[o + j] = deg[id * NF + j]!;
  }
  // (item 25) a deleted key: the live neighbours' blended pose (key file values + offsets) minus its own
  const F = FVALS[ci];
  if (live) {
    for (let r = 0; r < m; r++) {
      const id = ids[r]!;
      if (id >= total || !live.dead[id]) continue;
      const o = r * NF;
      if (!F) {
        for (let j = 0; j < NF; j++) kv[o + j] = 0;
        continue;
      }
      let a = r;
      do a = (a + m - 1) % m;
      while (a !== r && ids[a]! < total && live.dead[ids[a]!]);
      let b = r;
      do b = (b + 1) % m;
      while (b !== r && ids[b]! < total && live.dead[ids[b]!]);
      let pa = kph[a]!;
      let pb = kph[b]!;
      const p = kph[r]!;
      if (pa > p) pa -= 1;
      if (pb < p) pb += 1;
      const t = pb > pa ? (p - pa) / (pb - pa) : 0;
      absInto(ci, live, ids[a]!, kph[a]!, a, kv, F, D);
      absInto(ci, live, ids[b]!, kph[b]!, b, kv, F, D2);
      for (let j = 0; j < NF; j++) kv[o + j] = D[j]! + (D2[j]! - D[j]!) * t - F[id * NF + j]!;
    }
  }
  for (let i = 0; i < m * NF && !nonzero; i++) if (kv[i] !== 0) nonzero = true;
  return nonzero;
}
/** Knot id scratch (the most knots a clip can have: 24 keys + 16 added). */
const KNOT_IDS = new Int16Array(64);
const OPOS = new Float64Array(64);
const FB = new Float64Array(64 * NF);

/** (item 25) A live knot's absolute pose (key file value + offset) into `out`: an added key's base is the original keys' blend. */
function absInto(ci: number, live: KeyLive, id: number, ph: number, r: number, kv: Float64Array, F: Float64Array, out: Float64Array): void {
  const T = live.T;
  if (id < T) {
    for (let j = 0; j < NF; j++) out[j] = F[id * NF + j]! + kv[r * NF + j]!;
    return;
  }
  // the original keys (deleted ones too: the clip as baked) in phase order, blended at the added key's time
  const meta = KEY_CLIPS[ci]!;
  let m = 0;
  for (let i = 0; i < T; i++) {
    const p = Math.round((keyPhase(meta, i) % 1) * SPAN);
    let j = m++;
    while (j > 0 && OPOS[j - 1]! > p) {
      OPOS[j] = OPOS[j - 1]!;
      FB.copyWithin(j * NF, (j - 1) * NF, j * NF);
      j--;
    }
    OPOS[j] = p;
    for (let f = 0; f < NF; f++) FB[j * NF + f] = F[i * NF + f]!;
  }
  keyKnotsAt(OPOS, FB, m, NF, ph * SPAN, out);
  for (let j = 0; j < NF; j++) out[j] = out[j]! + kv[r * NF + j]!;
}

/** The edit's values spread over the clip's frames, as offset tables (into the preallocated tables). */
function build(e: ClipEdit): void {
  const { meta, off } = e;
  const N = meta.frames;
  const kph = e.kph;
  const kv = e.kval;
  const m = e.kn;
  for (let f = 0; f < N; f++) {
    const p = f / N;
    let a = m - 1;
    for (let s = 0; s < m; s++) if (kph[s]! <= p) a = s;
    const b = (a + 1) % m;
    let pa = kph[a]!;
    let pb = kph[b]!;
    if (pa > p) pa -= 1;
    if (pb <= pa) pb += 1;
    const t = pb > pa ? (p - pa) / (pb - pa) : 0;
    for (let j = 0; j < NF; j++) {
      const va = kv[a * NF + j]!;
      D[j] = va + (kv[b * NF + j]! - va) * t;
    }
    for (let s = 0; s < 4; s++) {
      const ix = T_IDX[s]!;
      eul(off.trunk, f * 16 + s * 4, D[ix[0]]!, D[ix[1]]!, D[ix[2]]!);
    }
    eul(off.head, f * 4, D[HEAD[0]]!, D[HEAD[1]]!, D[HEAD[2]]!);
    off.pel[f * 3] = D[PEL[0]]! * CM;
    off.pel[f * 3 + 1] = D[PEL[1]]! * CM;
    off.pel[f * 3 + 2] = D[PEL[2]]! * CM;
    for (let side = 0; side < 2; side++) {
      const A = ARMS[side]!;
      const sg = side === 0 ? -1 : 1;
      const fl = D[A.fl]!;
      const ab = D[A.ab]!;
      const el = D[A.el]!;
      const inw = D[A.inw]!;
      eul(off.arm, f * 16 + side * 8, 0, -fl, sg * ab);
      eul(off.arm, f * 16 + side * 8 + 4, -sg * inw, -(fl + el), sg * ab);
      eul(off.wrist, f * 8 + side * 4, sg * D[A.wy]!, D[A.wp]!, sg * D[A.wr]!);
      // (T1a) the forearm twist about the bone (the elbow node's y), the shoulder in the chest frame (+ pitch forward,
      // as the flex), the upper arm twist about the shoulder-elbow line
      eul(off.fore, f * 8 + side * 4, sg * D[A.tw]!, 0, 0);
      eul(off.sh, f * 8 + side * 4, sg * D[A.sy]!, -D[A.sp]!, sg * D[A.sr]!);
      off.twU[f * 2 + side] = sg * D[A.twU]! * D2R;
    }
  }
  meanInto(off.trunk, N, 16, off.trunkMean);
  meanInto(off.arm, N, 16, off.armMean);
  meanInto(off.wrist, N, 8, off.wristMean);
  meanInto(off.fore, N, 8, off.foreMean);
  meanInto(off.head, N, 4, off.headMean);
  meanInto(off.sh, N, 8, off.shMean);
  meanLin(off.pel, N, 3, off.pelMean);
  meanLin(off.twU, N, 2, off.twUMean);
  const on = (ix: readonly number[]): number => {
    for (let r = 0; r < m; r++) for (const j of ix) if (kv[r * NF + j] !== 0) return 1;
    return 0;
  };
  off.wristOn = on(ON_WRIST);
  off.foreOn = on(ON_FORE);
  off.shOn = on(ON_SH);
  off.twUOn = on(ON_TWU);
  off.headOn = on(HEAD);
  off.pelOn = on(PEL);
}

/** (T1a) The Mirror box of clip `ci` in the registry (1 on, 0 off; a clip keyed in full: 1). */
function mirrorOf(ci: number): number {
  const g = KEY_MIRROR_IDS[ci]!;
  if (!g) return 1;
  return (KEYS_SECTION.values[g]!.mirror ?? 1) >= 0.5 ? 1 : 0;
}

/** Registry -> one clip's table where they differ; allocates only on the clip's first edit. */
function syncClip(ci: number): void {
  const meta = KEY_CLIPS[ci]!;
  const groups = KEY_GROUP_IDS[ci]!;
  const added = KEY_ADDED_IDS[ci]!;
  const e = EDITS[ci];
  const mir = mirrorOf(ci);
  const nk = meta.phases.length;
  // (item 23) the key timing first: moved keys move the per-key offsets with them
  const timeMoved = syncTime(ci, CLIPS.get(meta.name), mir);
  // (item 25) then the added / deleted keys (on the retimed positions)
  const liveMoved = syncLive(ci, mir, timeMoved);
  const L = LIVES[ci];
  const structural = !!L && L.live.edited;
  let diff = timeMoved || liveMoved || (!!e && e.mirror !== mir);
  let any = false;
  for (let k = 0; k < groups.length; k++) {
    const vals = KEYS_SECTION.values[groups[k]!] as Record<string, number>;
    // with the Mirror box on the mirrored half is ignored (it follows the own keys)
    const used = k < nk || mir === 0;
    for (let j = 0; j < NF; j++) {
      const v = vals[FIELD_IDS[j]!]!;
      if (used && v !== 0) any = true;
      if (e ? v !== e.deg[k * NF + j] : v !== 0) diff = true;
    }
  }
  for (let s = 0; s < S; s++) {
    const vals = KEYS_SECTION.values[added[s]!] as Record<string, number>;
    for (let j = 0; j < NF; j++) {
      const v = vals[FIELD_IDS[j]!]!;
      if (e ? v !== e.add[s * NF + j] : v !== 0) diff = true;
    }
  }
  if (!diff || (!e && !any && !structural)) return;
  const clip = CLIPS.get(meta.name);
  if (!clip) return;
  let ed = e;
  if (!ed) {
    const N = meta.frames;
    const idq = (n: number): Float32Array => {
      const q = new Float32Array(n);
      for (let s = 3; s < n; s += 4) q[s] = 1;
      return q;
    };
    const cap = groups.length + 2 * S;
    ed = {
      clip,
      meta,
      deg: new Float64Array(groups.length * NF),
      add: new Float64Array(S * NF),
      mirror: mir,
      kn: 0,
      kph: new Float64Array(cap),
      kval: new Float64Array(cap * NF),
      off: {
        trunk: new Float32Array(N * 16),
        trunkMean: new Float32Array(16),
        arm: new Float32Array(N * 16),
        armMean: new Float32Array(16),
        wrist: new Float32Array(N * 8),
        wristMean: new Float32Array(8),
        wristOn: 0,
        pel: new Float32Array(N * 3),
        pelMean: new Float32Array(3),
        pelOn: 0,
        fore: idq(N * 8),
        foreMean: idq(8),
        foreOn: 0,
        head: idq(N * 4),
        headMean: idq(4),
        headOn: 0,
        sh: idq(N * 8),
        shMean: idq(8),
        shOn: 0,
        twU: new Float32Array(N * 2),
        twUMean: new Float32Array(2),
        twUOn: 0,
      },
    };
    EDITS[ci] = ed;
  }
  ed.mirror = mir;
  for (let k = 0; k < groups.length; k++) {
    const vals = KEYS_SECTION.values[groups[k]!] as Record<string, number>;
    for (let j = 0; j < NF; j++) ed.deg[k * NF + j] = vals[FIELD_IDS[j]!]!;
  }
  for (let s = 0; s < S; s++) {
    const vals = KEYS_SECTION.values[added[s]!] as Record<string, number>;
    for (let j = 0; j < NF; j++) ed.add[s * NF + j] = vals[FIELD_IDS[j]!]!;
  }
  // the knots (no added key, no delete: the original keys alone, as before item 25)
  const nonzero = knots(ed, ci);
  if (!(any || structural) || !nonzero) {
    clip.keyOff = null; // back to the baked clip, bit for bit (the tables stay for the next edit)
    return;
  }
  build(ed);
  clip.keyOff = ed.off;
}

/** Every clip, registry -> tables (loads, tests). */
export function tuneKeysSync(): void {
  for (let ci = 0; ci < KEY_CLIPS.length; ci++) syncClip(ci);
}

let sigN = -1;
let sigLast: TuneChange | undefined;
let sigTo = Number.NaN;
let tick = 0;

/**
 * Once a frame (player.ts, beside `tuneV2Frame`): a full registry check when the change log moved (an edit, a reset,
 * a load) and once a second regardless; otherwise three compares. No allocation after a clip's first edit.
 */
export function tuneKeysFrame(): void {
  const n = TUNE_LOG.length;
  const last = n > 0 ? TUNE_LOG[n - 1] : undefined;
  const to = last ? last.to : Number.NaN;
  if (++tick < 60 && n === sigN && last === sigLast && Object.is(to, sigTo)) return;
  tick = 0;
  sigN = n;
  sigLast = last;
  sigTo = to;
  tuneKeysSync();
}

/** One clip's edits (group -> slider -> value, non-default only, the Mirror box included), for `applyKeyEdits`. */
export function tuneKeysClipValues(clip: string): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  const ci = KEY_CLIPS.findIndex((c) => c.name === clip);
  for (const g of KEY_GROUP_IDS[ci] ?? []) {
    const vals = KEYS_SECTION.values[g] as Record<string, number>;
    for (const id of FIELD_IDS) if (vals[id] !== 0) (out[g] ??= {})[id] = vals[id]!;
    if (vals[KEY_TIME_ID] !== 0) (out[g] ??= {})[KEY_TIME_ID] = vals[KEY_TIME_ID]!;
    if (vals[KEY_DEL_ID] !== 0) (out[g] ??= {})[KEY_DEL_ID] = vals[KEY_DEL_ID]!; // (item 25)
  }
  // (item 25) the added keys
  for (const g of KEY_ADDED_IDS[ci] ?? []) {
    const vals = KEYS_SECTION.values[g] as Record<string, number>;
    for (const id of [KEY_AT_ID, ...FIELD_IDS]) if (vals[id] !== 0) (out[g] ??= {})[id] = vals[id]!;
  }
  const mg = KEY_MIRROR_IDS[ci];
  if (mg && KEYS_SECTION.values[mg]!.mirror !== 1) out[mg] = { mirror: KEYS_SECTION.values[mg]!.mirror! };
  return out;
}

/** (T1a, item 18) The Mirror box of a clip (true: on, or a clip keyed in full). */
export function tuneKeysMirrorOn(clip: string): boolean {
  const ci = KEY_CLIPS.findIndex((c) => c.name === clip);
  return ci < 0 || mirrorOf(ci) === 1;
}

/**
 * (T1a, item 18) The Mirror box set. Off: a mirrored-half key with no edits of its own takes the mirror image of its own
 * key's edits (so the pose does not jump) and is edited on its own after; one that kept edits from an earlier "off"
 * keeps them. On: the mirrored half's values stay where they are (ignored while on: it follows the own keys), so turning
 * it off again brings them back. One change log entry (the box); the values are saved with it. A clip keyed in full, or
 * no change: false.
 * (item 25) Off: a deleted own key's mirror is deleted too, and each added own key gets its mirror image as an added
 * key half a cycle on (a free slot; none free: it goes, the flash says so through the caller's readout).
 */
export function tuneKeysMirror(clip: string, on: boolean): boolean {
  const ci = KEY_CLIPS.findIndex((c) => c.name === clip);
  const mg = ci < 0 ? '' : KEY_MIRROR_IDS[ci]!;
  if (!mg || (mirrorOf(ci) === 1) === on) return false;
  const meta = KEY_CLIPS[ci]!;
  const groups = KEY_GROUP_IDS[ci]!;
  const n = meta.phases.length;
  if (!on) {
    for (let j = 0; j < n; j++) {
      const mine = KEYS_SECTION.values[groups[n + j]!] as Record<string, number>;
      const own = KEYS_SECTION.values[groups[j]!] as Record<string, number>;
      // (item 25) the mirror of a deleted key goes with it
      if (j > 0 && own[KEY_DEL_ID]! >= 0.5) mine[KEY_DEL_ID] = 1;
      if (FIELD_IDS.some((id) => mine[id] !== 0) || mine[KEY_TIME_ID] !== 0) continue;
      const m = mirrorDelta(own);
      for (const id of FIELD_IDS) mine[id] = (m[id] ?? 0) + 0;
      // (item 23) the mirrored key keeps its place half a cycle after its own key (the first key is fixed)
      mine[KEY_TIME_ID] = j === 0 ? 0 : own[KEY_TIME_ID]! + 0;
    }
    // (item 25) each added own key's mirror becomes an added key of its own
    const added = KEY_ADDED_IDS[ci]!;
    const atOf = (s: number): number => KEYS_SECTION.values[added[s]!]![KEY_AT_ID]!;
    for (let s = 0; s < S; s++) {
      const p = atOf(s);
      if (!(p >= 1 && p < KEY_SPAN / 2)) continue;
      const q = p + KEY_SPAN / 2;
      let has = false;
      for (let s2 = 0; s2 < S; s2++) if (atOf(s2) === q) has = true;
      if (has) continue;
      let free = -1;
      for (let s2 = 0; s2 < S && free < 0; s2++) if (atOf(s2) === 0) free = s2;
      if (free < 0) break;
      const own = KEYS_SECTION.values[added[s]!] as Record<string, number>;
      const mine = KEYS_SECTION.values[added[free]!] as Record<string, number>;
      const m = mirrorDelta(own);
      for (const id of FIELD_IDS) mine[id] = (m[id] ?? 0) + 0;
      mine[KEY_AT_ID] = q;
    }
  }
  tuneSet(mg, 'mirror', on ? 1 : 0);
  syncClip(ci);
  return true;
}

/**
 * (marlow-bays item 23) Key `k`'s timing now, in its own positions (a mirrored key half a cycle after its own key): where
 * it is, where it was baked, how far it can move (`lo` .. `hi`); whose `time` value moves it; its clip's frames.
 */
export interface KeyTimeInfo extends KeyRetimeRange {
  /** The clip's runtime frames. */
  frames: number;
  /** The key's phase (0..1) and runtime frame. */
  phase: number;
  frame: number;
  /** The key that moves with it (the mirror partner while the Mirror box is on; -1 none). */
  partner: number;
  /** (item 25) An added key (its `owner` is its own key id; `base` its place). */
  added: boolean;
}

/** (item 25) A clip's live key list solved from the registry now (UI rate: allocates), with the original positions. */
function liveNow(ci: number): { live: KeyLive; opos: Int16Array } {
  const meta = KEY_CLIPS[ci]!;
  const groups = KEY_GROUP_IDS[ci]!;
  const added = KEY_ADDED_IDS[ci]!;
  const on = mirrorOf(ci) === 1;
  const offs = groups.map((g) => KEYS_SECTION.values[g]![KEY_TIME_ID]!);
  const opos = new Int16Array(groups.length);
  keyTimeSolve(meta, offs, on, opos);
  const live = newKeyLive(groups.length);
  keyLiveSolve(
    meta,
    opos,
    on,
    groups.map((g) => KEYS_SECTION.values[g]![KEY_DEL_ID]!),
    added.map((g) => KEYS_SECTION.values[g]![KEY_AT_ID]!),
    live,
  );
  return { live, opos };
}

/** Key `k` (a key id: every key the bake poses, then the added keys) of `clip`: its timing from the registry (null: not a key). UI rate. */
export function tuneKeysTimeInfo(clip: string, k: number): KeyTimeInfo | null {
  const ci = KEY_CLIPS.findIndex((c) => c.name === clip);
  const meta = KEY_CLIPS[ci];
  if (!meta || k < 0) return null;
  const groups = KEY_GROUP_IDS[ci]!;
  const T = groups.length;
  const on = mirrorOf(ci) === 1;
  const { live, opos } = liveNow(ci);
  if (k >= live.at.length || (k >= T && live.at[k]! < 0)) return null;
  const n = meta.phases.length;
  const U = live.linked ? KEY_SPAN / 2 : KEY_SPAN;
  // (item 25) the added keys (and the other knots) bound a key's move: positions in the own half when linked
  const own = (p: number): number => (live.linked && p >= U ? p - U : p);
  const bound = (q: number, lo: number, hi: number, self: number): [number, number] => {
    let a = lo;
    let b = hi;
    for (let s = 0; s < S; s++) {
      const id = T + s;
      if (id === self || live.at[id]! < 0) continue;
      const p = live.at[id]!;
      if (p < q) a = Math.max(a, p + 1);
      if (p > q) b = Math.min(b, p - 1);
    }
    return [a, b];
  };
  if (k >= T) {
    const s = k >= T + S ? k - T - S : k - T;
    const self = T + s;
    const q = live.at[self]!;
    let lo = 1;
    let hi = U - 1;
    const m = live.linked ? n : T;
    for (let i = 0; i < m; i++) {
      const p = opos[i]!;
      if (p < q) lo = Math.max(lo, p + 1);
      if (p > q) hi = Math.min(hi, p - 1);
    }
    [lo, hi] = bound(q, lo, hi, self);
    const sh = live.at[k]! - q;
    const phase = live.at[k]! / KEY_SPAN;
    return { owner: self, pos: live.at[k]!, base: live.at[k]!, lo: lo + sh, hi: hi + sh, fixed: false, frames: meta.frames, phase, frame: Math.round(phase * meta.frames) % meta.frames, partner: keyLivePartner(meta, live, k), added: true };
  }
  const r = keyRetimeRange(meta, opos, on, k);
  const [lo, hi] = r.fixed ? [r.lo, r.hi] : bound(own(r.pos), r.lo, r.hi, -1);
  const sh = opos[k]! - r.pos; // a mirrored key: half a cycle after the own key that moves it
  const phase = opos[k]! / KEY_SPAN;
  return {
    ...r,
    pos: opos[k]!,
    base: keyBasePos(meta, k),
    lo: lo + sh,
    hi: hi + sh,
    frames: meta.frames,
    phase,
    frame: Math.round(phase * meta.frames) % meta.frames,
    partner: meta.mirror && on ? (k < n ? k + n : k - n) : -1,
    added: false,
  };
}

/**
 * (marlow-bays item 23) Slide key `k` of `clip` by `delta` bake frames (1/48 of the cycle; + later), clamped between
 * its neighbours (`tuneKeysTime.ts`: the first key fixed; with the Mirror box on its mirror key moves with it). One
 * change log entry, the live preview at once. False: nothing moved (the first key, at a neighbour, not a key).
 * (item 25) An added key moves its `at`; every key stays between its live neighbours, added keys included.
 */
export function tuneKeysRetime(clip: string, k: number, delta: number): boolean {
  const info = tuneKeysTimeInfo(clip, k);
  if (!info || info.fixed || !Number.isFinite(delta)) return false;
  const p = Math.max(info.lo, Math.min(info.hi, info.pos + Math.round(delta)));
  if (p === info.pos) return false;
  const ci = KEY_CLIPS.findIndex((c) => c.name === clip);
  const T = KEY_GROUP_IDS[ci]!.length;
  if (info.added) {
    const g = KEY_ADDED_IDS[ci]![info.owner - T]!;
    tuneSet(g, KEY_AT_ID, KEYS_SECTION.values[g]![KEY_AT_ID]! + p - info.pos);
  } else tuneSet(KEY_GROUP_IDS[ci]![info.owner]!, KEY_TIME_ID, p - info.base);
  syncClip(ci);
  return true;
}

/** (marlow-bays item 25) The group whose sliders edit key `k` (a key id) of `clip` ('' none). */
export function tuneKeysGroupOf(clip: string, k: number): string {
  const ci = KEY_CLIPS.findIndex((c) => c.name === clip);
  const meta = KEY_CLIPS[ci];
  if (!meta || k < 0) return '';
  const T = keyTimeCount(meta);
  const n = meta.phases.length;
  if (k >= T) return KEY_ADDED_IDS[ci]![(k - T) % S] ?? '';
  return KEY_GROUP_IDS[ci]![meta.mirror && mirrorOf(ci) === 1 && k >= n ? k - n : k] ?? '';
}

/** (marlow-bays item 25) A Keys group -> [clip, key id] (an added group: id T + slot), or null. */
export function tuneKeysIdOf(group: string): [string, number] | null {
  const p = parseKeyGroup(group);
  if (p) return p;
  const a = parseKeyAdded(group);
  if (!a) return null;
  const meta = KEY_CLIPS.find((c) => c.name === a[0]);
  return meta ? [a[0], keyTimeCount(meta) + a[1]] : null;
}

/** (marlow-bays item 25) What "Add key" / "Delete key" would do on key `k` of `clip` now. UI rate. */
export interface KeyEditInfo {
  /** Where an added key would land (bake frames; -1: it cannot). */
  addAt: number;
  /** Why not ('' when it can). */
  addWhy: string;
  canDelete: boolean;
  delWhy: string;
  /** Keys a cycle now, and the fewest allowed. */
  count: number;
  min: number;
}

export function tuneKeysEditInfo(clip: string, k: number): KeyEditInfo | null {
  const ci = KEY_CLIPS.findIndex((c) => c.name === clip);
  const meta = KEY_CLIPS[ci];
  if (!meta || k < 0) return null;
  const { live, opos } = liveNow(ci);
  if (k >= live.at.length || live.at[k]! < 0) return null;
  const T = live.T;
  const n = meta.phases.length;
  const added = KEY_ADDED_IDS[ci]!;
  let free = false;
  for (let s = 0; s < S; s++) if (!(KEYS_SECTION.values[added[s]!]![KEY_AT_ID]! >= 1)) free = true;
  const at = keyInsertPos(meta, live, opos, k);
  const addWhy = !free ? `${KEY_ADD_SLOTS} added keys is the most a clip takes` : at < 0 ? 'no room: the next key is one bake frame on' : '';
  const owner = k >= T ? k : live.linked && k >= n ? k - n : k;
  const step = live.linked ? 2 : 1;
  const delWhy = owner === 0 ? 'key 1 starts the cycle: it is never deleted' : live.n - step < KEY_MIN ? `a cycle keeps at least ${KEY_MIN} keys${live.linked ? ' (2 own keys with Mirror on)' : ''}` : '';
  return { addAt: free ? at : -1, addWhy, canDelete: !delWhy, delWhy, count: live.n, min: KEY_MIN };
}

/**
 * (marlow-bays item 25) "Add key": a key midway (in time) between key `k` and the next key (wrapping; with the Mirror
 * box on in the own half, and the bake mirrors it), its pose the blended pose the clip shows there now (its deltas: the
 * live preview's offset at that time, so play looks unchanged). Returns the new key's id (-1: no room or no free slot).
 * The change log gets the slot's `at`; the live preview at once.
 */
export function tuneKeysAdd(clip: string, k: number): number {
  const info = tuneKeysEditInfo(clip, k);
  if (!info || info.addAt < 0) return -1;
  const ci = KEY_CLIPS.findIndex((c) => c.name === clip);
  syncClip(ci);
  const added = KEY_ADDED_IDS[ci]!;
  let s = 0;
  while (s < S && KEYS_SECTION.values[added[s]!]![KEY_AT_ID]! >= 1) s++;
  if (s >= S) return -1;
  const e = EDITS[ci];
  const clipObj = CLIPS.get(KEY_CLIPS[ci]!.name);
  // the offset the preview shows at that time (no table live: none)
  if (e && clipObj?.keyOff && e.kn > 0) keyKnotsAt(e.kph, e.kval, e.kn, NF, info.addAt / KEY_SPAN, D, 1);
  else D.fill(0);
  const vals = KEYS_SECTION.values[added[s]!] as Record<string, number>;
  for (let j = 0; j < NF; j++) vals[FIELD_IDS[j]!] = Math.round(D[j]! * 1000) / 1000 + 0;
  tuneSet(added[s]!, KEY_AT_ID, info.addAt);
  syncClip(ci);
  return KEY_GROUP_IDS[ci]!.length + s;
}

/**
 * (marlow-bays item 25) "Delete key": key `k` removed (an added key: its slot emptied; an original key: `del` on, with
 * the Mirror box on its mirror goes too). Never the first key, never below `KEY_MIN` keys. Undoable (a slider change).
 */
export function tuneKeysDelete(clip: string, k: number): boolean {
  const info = tuneKeysEditInfo(clip, k);
  if (!info || !info.canDelete) return false;
  const ci = KEY_CLIPS.findIndex((c) => c.name === clip);
  const meta = KEY_CLIPS[ci]!;
  const T = keyTimeCount(meta);
  if (k >= T) {
    const g = KEY_ADDED_IDS[ci]![(k - T) % S]!;
    const vals = KEYS_SECTION.values[g] as Record<string, number>;
    for (const id of FIELD_IDS) vals[id] = 0;
    tuneSet(g, KEY_AT_ID, 0);
  } else {
    const n = meta.phases.length;
    const owner = meta.mirror && mirrorOf(ci) === 1 && k >= n ? k - n : k;
    tuneSet(KEY_GROUP_IDS[ci]![owner]!, KEY_DEL_ID, 1);
  }
  syncClip(ci);
  return true;
}

/** The runtime clip by name (tests). */
export const keyedClipByName = (name: string): KeyedClip | undefined => CLIPS.get(name);
