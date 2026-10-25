/**
 * (tuner-v2 item 4) Per-key edits <-> the scripts/anim-keys key JSON (pure; imports only tuneKeysTime and tuneKeysEdit: the game and the node script
 * `scripts/anim-keys/apply-tune.mjs` share it). A key edit is a delta on one field of one key of a keyed clip, in the
 * key file's own units, so an export bakes exactly what was typed: trunk segments pelvis / spine / chest / neck / head
 * (pitch, yaw, roll; deg), the pelvis offset (dx / dy / dz; cm), and per arm the shoulder (pitch, yaw, roll), the upper
 * arm (flex, abd, twistUpper), the elbow bend, the forearm (inward, twist) and the wrist frame (pitch, yaw, roll).
 * (marlow-bays T1a, item 17) head, shoulder, the two twists and the pelvis offset are new; a key file without them
 * reads 0 (as the bake reads it). The legs stay the foot planner's (rig gap R3).
 * (anim-skeleton S4) Appended on every keyed clip: per arm the clavicle `clav` (pitch, yaw, roll; deg), per hand
 * `handX.<finger>` curl (fingers.ts units) and spread (deg), per leg the deltas on the IK leg `legX.d` (hip pitch / yaw /
 * roll, knee, ankle pitch / roll, toe; (tuner-clarity S2) ankle yaw, shin twist; deg, anatomical) and the FK weight
 * `legX.w` (shown on `legs` clips only). The bake (key_clip.py) opts a clip into the matching channel as soon as one of
 * these is non-zero.
 * Registry groups `key.<clip>.<key index>` (a mirrored clip: indexes 0 .. 2n-1, the second half the mirrored keys, used
 * only with its Mirror box off) and `key.<clip>.mirror` (the Mirror box, slider `mirror`: 1 on, 0 off); slider ids are
 * `KEY_FIELDS[].id`.
 * (marlow-bays item 23) Key timing: the slider `time` (bake frames, 1/48 of the cycle, + later) in a key's group moves
 * that key's `phase` (the field the key files already have; the bake keys at round(phase * 48)). A file is written with
 * new phases only for keys that moved; no timing edit leaves every phase as it was. Clamp rules: `tuneKeysTime.ts`.
 * (marlow-bays item 25) Add / delete keys: the slider `del` in a key's group removes the key; an added-key group
 * `key.<clip>.a<s>` (slider `at`, bake frames, and the field deltas) adds a key: the original keys' blended pose at
 * that time plus its deltas (every numeric field of the two keys either side, so fields added later flow in). A file
 * with keys added or removed is written with its keys in phase order; with the Mirror box off a mirrored file is
 * written in full first. Rules: `tuneKeysEdit.ts`. No add / delete leaves the file as before.
 */
import { KEY_SPAN, KEY_TIME_ID, keyBasePos, keyTimeCount, keyTimeSolve } from './tuneKeysTime';
import { KEY_ADD_SLOTS, KEY_AT_ID, KEY_DEL_ID, KEY_MIN, keyAddedGroupId, keyLiveSolve, newKeyLive, parseKeyAdded, type KeyLive } from './tuneKeysEdit';

export interface KeyField {
  /** Slider id (`spine_pitch`, `armL_flex`, `armR_wristYaw`, `armL_twist` ...). */
  readonly id: string;
  readonly label: string;
  /** The key object it edits (`pelvis`, `spine`, `chest`, `neck`, `head`, `armL`, `armR`). */
  readonly seg: string;
  /** The field in it (`pitch`, `flex`, ...); with `sub`, the field of the arm's `wrist` / `sh` object. */
  readonly field: string;
  /** The arm's sub-object ('' none, `wrist` the wrist frame, `sh` the shoulder; (anim-skeleton S4) `clav` the
   *  clavicle, a hand's finger `thumb` .. `little`, a leg's `d` deltas on the IK leg). */
  readonly sub: KeySub;
  /** `sub === 'wrist'` (the older callers read this). */
  readonly wrist: boolean;
  /** 'deg' or 'cm' (the pelvis offset); (S4) '' a plain number (a finger's curl, 1 = closed; a leg's FK weight). */
  readonly unit: 'deg' | 'cm' | '';
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

/** (anim-skeleton S4) The fingers of a key's `handL` / `handR` (key_clip.py `FINGER_NAMES`). */
export const KEY_FINGERS = ['thumb', 'index', 'middle', 'ring', 'little'] as const;
/**
 * (S4) A leg's `d` deltas on the IK leg (src/anim/keyed.ts `LEGD_FIELDS`, the same order). (tuner-clarity S2) The ankle
 * yaw and the shin twist appended: their slider ids come after every older field (`KEY_LEGD_S4` = the first 7 keep
 * their old loop and indexes).
 */
export const KEY_LEGD = ['hipPitch', 'hipYaw', 'hipRoll', 'knee', 'anklePitch', 'ankleRoll', 'toe', 'ankleYaw', 'shinTwist'] as const;
/** (tuner-clarity S2) The count of the S4 leg delta fields (laid out before the FK weight; the twists after the legs). */
export const KEY_LEGD_S4 = 7;
export type KeySub = '' | 'wrist' | 'sh' | 'clav' | 'd' | (typeof KEY_FINGERS)[number];
/** (S4) The finger curl slider (fingers.ts units, + closes) and the FK leg weight slider. */
export const KEY_RANGE_CURL = { min: -1, max: 1, step: 0.01 } as const;
export const KEY_RANGE_W = { min: -1, max: 1, step: 0.05 } as const;
/** (S4) A finger spread's slider range (deg; fingers.ts SPREAD_MAX_DEG, spread 1 = 30 deg). */
const KEY_RANGE_SPREAD = 30;

/** The trunk segments a key has (pelvis first: its child is counter-turned, as the bake's FK). */
export const KEY_TRUNK = ['pelvis', 'spine', 'chest', 'neck', 'head'] as const;
const TAXES = ['pitch', 'yaw', 'roll'] as const;
/** Slider range of an angle (deg, a delta on the key's value). */
export const KEY_RANGE = { min: -90, max: 90, step: 0.5 } as const;
/** (T1a) Slider range of the pelvis offset (cm). */
export const KEY_RANGE_CM = { min: -10, max: 10, step: 0.1 } as const;

function fields(): KeyField[] {
  const out: KeyField[] = [];
  const deg = (id: string, label: string, seg: string, field: string, sub: KeySub = ''): void => {
    out.push({ id, label, seg, field, sub, wrist: sub === 'wrist', unit: 'deg', min: KEY_RANGE.min, max: KEY_RANGE.max, step: KEY_RANGE.step });
  };
  for (const s of KEY_TRUNK) {
    for (const a of TAXES) deg(`${s}_${a}`, `${s} ${a}`, s, a);
    if (s === 'pelvis') {
      for (const [f, l] of [['dx', 'right'], ['dy', 'up'], ['dz', 'forward']] as const) {
        out.push({ id: `pelvis_${f}`, label: `pelvis shift ${l} (cm)`, seg: 'pelvis', field: f, sub: '', wrist: false, unit: 'cm', min: KEY_RANGE_CM.min, max: KEY_RANGE_CM.max, step: KEY_RANGE_CM.step });
      }
    }
  }
  for (const side of ['L', 'R'] as const) {
    const seg = `arm${side}`;
    for (const a of TAXES) deg(`${seg}_sh${a[0]!.toUpperCase()}${a.slice(1)}`, `${side} shoulder ${a}`, seg, a, 'sh');
    deg(`${seg}_flex`, `${side} upper arm flex (+ forward)`, seg, 'flex');
    deg(`${seg}_abd`, `${side} upper arm abd (+ out)`, seg, 'abd');
    deg(`${seg}_twistUpper`, `${side} upper arm twist (+ the elbow out)`, seg, 'twistUpper');
    deg(`${seg}_elbow`, `${side} elbow bend (+ bent)`, seg, 'elbow');
    deg(`${seg}_inward`, `${side} forearm inward (+ in)`, seg, 'inward');
    deg(`${seg}_twist`, `${side} forearm twist (+ the palm in)`, seg, 'twist');
    for (const a of TAXES) deg(`${seg}_wrist${a[0]!.toUpperCase()}${a.slice(1)}`, `${side} wrist ${a}`, seg, a, 'wrist');
  }
  // (anim-skeleton S4) appended (every older field keeps its index), on every keyed clip: the clavicles, the fingers,
  // the leg deltas on the planner's IK leg; the FK leg weight (the Keys section shows it only on a `legs` clip)
  const CLAV_WORD = { pitch: 'tilt', yaw: '- forward', roll: '+ shrug' } as const;
  for (const side of ['L', 'R'] as const) {
    const seg = `arm${side}`;
    for (const a of TAXES) deg(`${seg}_clav${a[0]!.toUpperCase()}${a.slice(1)}`, `${side} clavicle ${a} (${CLAV_WORD[a]})`, seg, a, 'clav');
  }
  for (const side of ['L', 'R'] as const) {
    const seg = `hand${side}`;
    for (const fn of KEY_FINGERS) {
      out.push({ id: `${seg}_${fn}Curl`, label: `${side} ${fn} curl (+ closed, 1 = fist)`, seg, field: 'curl', sub: fn, wrist: false, unit: '', min: KEY_RANGE_CURL.min, max: KEY_RANGE_CURL.max, step: KEY_RANGE_CURL.step });
      out.push({ id: `${seg}_${fn}Spread`, label: `${side} ${fn} spread (+ away from the middle finger)`, seg, field: 'spread', sub: fn, wrist: false, unit: 'deg', min: -KEY_RANGE_SPREAD, max: KEY_RANGE_SPREAD, step: KEY_RANGE.step });
    }
  }
  const LEGD_WORD = {
    hipPitch: '+ thigh forward',
    hipYaw: '+ knee out',
    hipRoll: '+ thigh out',
    knee: '+ bent',
    anklePitch: '+ toes up',
    ankleRoll: '+ sole in',
    toe: '+ up',
    ankleYaw: '+ toes out',
    shinTwist: '+ shin turned out',
  } as const;
  for (const side of ['L', 'R'] as const) {
    const seg = `leg${side}`;
    for (let i = 0; i < KEY_LEGD_S4; i++) {
      const f = KEY_LEGD[i]!;
      deg(`${seg}_${f}`, `${side} leg ${f} delta (${LEGD_WORD[f]}; a planted foot stays on its plant)`, seg, f, 'd');
    }
    out.push({ id: `${seg}_w`, label: `${side} leg FK weight (FK-leg clips only, KEY_CLIPS legs; 0 the planner's IK leg, 1 the key's FK leg)`, seg, field: 'w', sub: '', wrist: false, unit: '', min: KEY_RANGE_W.min, max: KEY_RANGE_W.max, step: KEY_RANGE_W.step });
  }
  // (tuner-clarity S2) appended after every older field (older indexes unchanged): the foot twist and the shin twist
  for (const side of ['L', 'R'] as const) {
    const seg = `leg${side}`;
    for (let i = KEY_LEGD_S4; i < KEY_LEGD.length; i++) {
      const f = KEY_LEGD[i]!;
      deg(`${seg}_${f}`, `${side} leg ${f} delta (${LEGD_WORD[f]}; a planted foot stays on its plant)`, seg, f, 'd');
    }
  }
  return out;
}

/** (anim-skeleton S4) A sided key segment's mirror partner (`armL` <-> `armR`, `handL`, `legL` ...), or '' (the trunk). */
export function keySidePartner(seg: string): string {
  const m = /^(arm|hand|leg)([LR])$/.exec(seg);
  return m ? `${m[1]}${m[2] === 'L' ? 'R' : 'L'}` : '';
}

export const KEY_FIELDS: readonly KeyField[] = fields();
/** The field index by id. */
export const KEY_FIELD_INDEX: Readonly<Record<string, number>> = Object.freeze(Object.fromEntries(KEY_FIELDS.map((f, i) => [f.id, i])));

export const keyGroupId = (clip: string, key: number): string => `key.${clip}.${key}`;
/** (T1a, item 18) The Mirror box's group of a mirrored clip. */
export const keyMirrorGroupId = (clip: string): string => `key.${clip}.mirror`;

/** Group id -> [clip, key index], or null. */
export function parseKeyGroup(g: string): [string, number] | null {
  const m = /^key\.([a-z0-9_]+)\.(\d+)$/.exec(g);
  return m ? [m[1]!, Number(m[2])] : null;
}

/** (T1a) A Mirror box group -> its clip, or null. */
export function parseKeyMirror(g: string): string | null {
  const m = /^key\.([a-z0-9_]+)\.mirror$/.exec(g);
  return m ? m[1]! : null;
}

type Obj = Record<string, unknown>;
export interface KeyFile {
  name: string;
  mirror?: boolean;
  frames?: number;
  keys: Obj[];
  [k: string]: unknown;
}

type Values = Readonly<Record<string, Readonly<Record<string, number>>>>;

const r3 = (v: number): number => Math.round(v * 1000) / 1000 + 0;

/**
 * (T1a, item 18) One key's deltas mirrored (the other arm half a cycle later, key_clip.py `mirror_key`): the arm fields
 * swapped side for side, the trunk yaw / roll and the pelvis dx negated.
 */
export function mirrorDelta(vals: Readonly<Record<string, number>> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (!vals) return out;
  for (const f of KEY_FIELDS) {
    const v = vals[f.id];
    if (typeof v !== 'number' || v === 0) continue;
    // (anim-skeleton S4) hands and legs swap like the arms (their fields read the same on both sides)
    const p = keySidePartner(f.seg);
    if (p) out[`${p}${f.id.slice(f.seg.length)}`] = v;
    else out[f.id] = f.field === 'yaw' || f.field === 'roll' || f.field === 'dx' ? -v : v;
  }
  return out;
}

/** (T1a, item 18) The Mirror box of `clip` in an edit set: true (on) unless its group holds `mirror` < 0.5. */
export function keyMirrorOn(values: Values, clip: string): boolean {
  const v = values[keyMirrorGroupId(clip)]?.mirror;
  return !(typeof v === 'number' && v < 0.5);
}

/** The key file's mirrored key (key_clip.py `mirror_key`), deep copied: sides swapped, lateral offsets, yaws, rolls negated. */
function mirrorKey(k: Obj): Obj {
  const m: Obj = JSON.parse(JSON.stringify(k)) as Obj;
  m.phase = (k.phase as number) + 0.5;
  for (const s of KEY_TRUNK) {
    const e = m[s] as Obj | undefined;
    if (!e) continue;
    for (const a of ['dx', 'yaw', 'roll']) if (typeof e[a] === 'number') e[a] = (e[a] as number) === 0 ? 0 : -(e[a] as number);
  }
  for (const [a, b] of [['armL', 'armR'], ['legL', 'legR']] as const) {
    const t = m[a];
    m[a] = m[b];
    m[b] = t;
  }
  // (anim-skeleton S4) the hands too (key_clip.py `mirror_key`, S3b), only when the key has one
  if ('handL' in k || 'handR' in k) {
    const t = m.handL ?? {};
    m.handL = m.handR ?? {};
    m.handR = t;
  }
  return m;
}

/**
 * (T1a, item 18) A mirrored key file written out in full: every key, the mirrored half after the own keys (key index
 * n + j is key j mirrored), `mirror: false`. Any other file: unchanged (a copy).
 */
export function expandMirror(file: KeyFile): KeyFile {
  const out = JSON.parse(JSON.stringify(file)) as KeyFile;
  if (!file.mirror) return out;
  out.keys = [...out.keys, ...file.keys.map(mirrorKey)];
  out.mirror = false;
  return out;
}

/** True when the edits of a mirrored clip's second half differ from its own keys' edits mirrored (the arms differ). */
export function keyHalvesDiffer(values: Values, clip: string, n: number): boolean {
  for (let j = 0; j < n; j++) {
    const own = mirrorDelta(values[keyGroupId(clip, j)]);
    const mine = values[keyGroupId(clip, n + j)] ?? {};
    for (const f of KEY_FIELDS) if ((own[f.id] ?? 0) !== (mine[f.id] ?? 0)) return true;
    // (item 23) a mirrored key moved apart from its own key (the first key is fixed: its own time counts as 0)
    const ot = j === 0 ? 0 : (values[keyGroupId(clip, j)]?.[KEY_TIME_ID] ?? 0);
    if (ot !== (mine[KEY_TIME_ID] ?? 0)) return true;
  }
  return false;
}

/**
 * (marlow-bays item 23) The key times of an edit set onto `out` (the file being written; `full`: written in full, every
 * key its own time): each moved key's phase is its solved position / 48. No timing edit: nothing changes.
 */
function applyKeyTimes(name: string, out: KeyFile, values: Values, full: boolean): void {
  const c = { phases: out.keys.map((k) => k.phase as number), mirror: !!out.mirror };
  const total = keyTimeCount(c);
  const offs: number[] = [];
  let any = false;
  for (let i = 0; i < total; i++) {
    const v = values[keyGroupId(name, i)]?.[KEY_TIME_ID];
    const o = typeof v === 'number' && Number.isFinite(v) ? v : 0;
    if (o !== 0) any = true;
    offs.push(o);
  }
  if (!any) return;
  const pos: number[] = [];
  // a file the bake mirrors: its own keys move and the mirrored half follows them (written in full: every key its own)
  if (!keyTimeSolve(c, offs, !full, pos)) return;
  out.keys.forEach((k, i) => {
    if (pos[i] !== keyBasePos(c, i)) k.phase = pos[i]! / KEY_SPAN;
  });
}

/**
 * The key file with the edits added (a new object; `file` untouched). `values`: group id -> slider id -> delta (deg,
 * cm); groups of other clips and zero deltas are ignored. A missing field counts as 0 (as the bake reads it); a wrist or
 * shoulder frame, a head segment, is added only for a non-zero delta. Key order, every other field and the note are kept.
 * (T1a, item 18) A mirrored clip with its Mirror box off whose two halves were edited apart is written in full
 * (`expandMirror`: every key, `mirror: false`) with each key's own edits; with the box on (or the halves still mirror
 * images) the mirrored half's groups are ignored, as the bake mirrors the own keys.
 */
export function applyKeyEdits(file: KeyFile, values: Values): KeyFile {
  const full = keyWrittenFull(file, values);
  const out = full ? expandMirror(file) : (JSON.parse(JSON.stringify(file)) as KeyFile);
  applyKeyTimes(file.name, out, values, full);
  out.keys.forEach((key, i) => addDeltas(key, values[keyGroupId(file.name, i)]));
  applyKeyAddDel(file, out, values); // (item 25)
  return out;
}

/** One key's field deltas added in place (a missing field counts as 0; a wrist / shoulder frame added when needed). */
function addDeltas(key: Obj, vals: Readonly<Record<string, number>> | undefined): void {
  if (!vals) return;
  for (const f of KEY_FIELDS) {
    const d = vals[f.id];
    if (typeof d !== 'number' || !Number.isFinite(d) || d === 0) continue;
    let o = (key[f.seg] ??= {}) as Obj;
    // (anim-skeleton S4) a finger or a leg's `d` object starts empty (only the fields edited)
    if (f.sub) o = (o[f.sub] ??= f.sub === 'wrist' || f.sub === 'sh' || f.sub === 'clav' ? { yaw: 0, pitch: 0, roll: 0 } : {}) as Obj;
    const base = typeof o[f.field] === 'number' ? (o[f.field] as number) : 0;
    o[f.field] = r3(base + d);
  }
}

/**
 * (T1a, item 18; item 25) A mirrored file is written in full (every key, `mirror: false`) when its Mirror box is off and
 * its halves were edited apart, or (item 25) a key is really added or deleted with the box off (the solved list: a
 * refused `del` or `at` forces nothing).
 */
export function keyWrittenFull(file: KeyFile, values: Values): boolean {
  if (!file.mirror || keyMirrorOn(values, file.name)) return false;
  const n = file.keys.length;
  return keyHalvesDiffer(values, file.name, n) || planAs(file, values, true).live.edited;
}

/** (marlow-bays item 25) What an edit set does to a key file's keys: the solved original positions and the live list. */
export interface KeyEditPlan {
  /** Written in full (`keyWrittenFull`). */
  full: boolean;
  /** The original keys' positions (bake frames, every key the bake poses, `keyTimeSolve`). */
  pos: number[];
  live: KeyLive;
}

/** (marlow-bays item 25) The plan of an edit set on a key file (as read from disk, before the edits). */
export function keyEditPlan(file: KeyFile, values: Values): KeyEditPlan {
  return planAs(file, values, keyWrittenFull(file, values));
}

/** The plan with the file written in full (every key its own) or not (a mirrored file's own keys move their mirrors). */
function planAs(file: KeyFile, values: Values, full: boolean): KeyEditPlan {
  const c = { phases: file.keys.map((k) => k.phase as number), mirror: !!file.mirror };
  const T = keyTimeCount(c);
  const offs: number[] = [];
  const del: number[] = [];
  for (let i = 0; i < T; i++) {
    const g = values[keyGroupId(file.name, i)];
    const o = g?.[KEY_TIME_ID];
    offs.push(typeof o === 'number' && Number.isFinite(o) ? o : 0);
    const d = g?.[KEY_DEL_ID];
    del.push(typeof d === 'number' && Number.isFinite(d) ? d : 0);
  }
  const at: number[] = [];
  for (let s = 0; s < KEY_ADD_SLOTS; s++) {
    const v = values[keyAddedGroupId(file.name, s)]?.[KEY_AT_ID];
    at.push(typeof v === 'number' && Number.isFinite(v) ? v : 0);
  }
  const pos: number[] = [];
  keyTimeSolve(c, offs, !full, pos);
  const live = newKeyLive(T);
  keyLiveSolve(c, pos, !full, del, at, live);
  return { full, pos, live };
}

/**
 * (marlow-bays item 25) The bake's row for an add / delete slider or a field of an added or deleted key of `file`
 * (`plan`: `keyEditPlan` of the same edits; `path` the key file's path), or null: any other row (the usual rules).
 */
export function keyEditRow(file: KeyFile, plan: KeyEditPlan, group: string, id: string, path: string): { target: string; result: string; baked: boolean } | null {
  const T = plan.live.T;
  const n = file.keys.length;
  const f = KEY_FIELDS.find((x) => x.id === id);
  const what = f ? `${f.seg}${f.sub ? `.${f.sub}` : ''}.${f.field} + (${f.unit})` : id;
  const a = parseKeyAdded(group);
  if (a) {
    if (a[0] !== file.name) return null;
    const p = plan.live.at[T + a[1]]!;
    if (p < 0) {
      const why = id === KEY_AT_ID ? 'it sits on another key or outside the cycle (with the Mirror box on: the own half, frames 1-23)' : 'its added key is not placed';
      return { target: `${path} added key ${a[1]} ${what}`, result: `skipped: ${why}`, baked: false };
    }
    return { target: `${path} added key ${a[1]} at bake frame ${p} ${id === KEY_AT_ID ? '(phase = frame / 48)' : what}`, result: 'baked (key added to the key JSON; rebake the clip)', baked: true };
  }
  const k = parseKeyGroup(group);
  if (!k || k[0] !== file.name || k[1] >= T) return null;
  const i = k[1];
  if (id === KEY_DEL_ID) {
    const target = `${path} key ${i} deleted`;
    if (plan.live.dead[i]) return { target, result: 'baked (key removed from the key JSON; rebake the clip)', baked: true };
    const why = i === 0 ? 'the first key is never deleted' : plan.live.linked && i >= n ? `the Mirror box is on (key ${i} follows key ${i - n})` : `a cycle keeps at least ${KEY_MIN} keys`;
    return { target, result: `skipped: ${why}`, baked: false };
  }
  if (plan.live.dead[i] && (f || id === KEY_TIME_ID)) return { target: `${path} key ${i} ${what}`, result: 'baked (the key is deleted: its edits go with it)', baked: true };
  return null;
}

/**
 * (marlow-bays item 25) A key blended between the two keys either side of bake position `p` (`keys` with their phases,
 * any order, wrapping): every numeric field of either key (a missing one counts as 0, as the bake reads it), linear in
 * time, rounded to 3 decimals; sub-objects blended the same way. Its phase is `p / 48`.
 */
export function keyBlendAt(keys: readonly Obj[], p: number): Obj {
  const ph = keys.map((k) => ((Math.round((k.phase as number) * KEY_SPAN) % KEY_SPAN) + KEY_SPAN) % KEY_SPAN);
  const order = keys.map((_, i) => i).sort((x, y) => ph[x]! - ph[y]!);
  let a = order[order.length - 1]!;
  for (const i of order) if (ph[i]! <= p) a = i;
  const b = order[(order.indexOf(a) + 1) % order.length]!;
  let pa = ph[a]!;
  let pb = ph[b]!;
  if (pa > p) pa -= KEY_SPAN;
  if (pb <= pa) pb += KEY_SPAN;
  const t = pb > pa ? (p - pa) / (pb - pa) : 0;
  const mix = (x: unknown, y: unknown): unknown => {
    const xo = x && typeof x === 'object' ? (x as Obj) : null;
    const yo = y && typeof y === 'object' ? (y as Obj) : null;
    if (xo || yo) {
      const o: Obj = {};
      for (const k of [...Object.keys(xo ?? {}), ...Object.keys(yo ?? {})]) if (!(k in o)) o[k] = mix(xo?.[k], yo?.[k]);
      return o;
    }
    if (typeof x === 'number' || typeof y === 'number') {
      const u = typeof x === 'number' ? x : 0;
      const v = typeof y === 'number' ? y : 0;
      return r3(u + (v - u) * t);
    }
    return x ?? y;
  };
  const out: Obj = { phase: p / KEY_SPAN };
  const ka = keys[a]!;
  const kb = keys[b]!;
  for (const k of [...Object.keys(ka), ...Object.keys(kb)]) if (k !== 'phase' && !(k in out)) out[k] = mix(ka[k], kb[k]);
  return out;
}

/**
 * (marlow-bays item 25) The adds and deletes of an edit set onto `out` (the file being written, its times and field
 * deltas already on, written in full or not). An added key is the original keys' blended pose at its time (`keyBlendAt`
 * on the file as read, at the solved times, its mirrored half included) plus its deltas; a deleted key is removed (with
 * the Mirror box on the bake drops its mirror with it). Then the keys in phase order. No add / delete: no change.
 */
function applyKeyAddDel(file: KeyFile, out: KeyFile, values: Values): void {
  const { live, pos } = keyEditPlan(file, values);
  if (!live.edited) return;
  const T = live.T;
  const ref = expandMirror(file).keys.map((k, i) => ({ ...k, phase: pos[i]! / KEY_SPAN }));
  const added: Obj[] = [];
  for (let s = 0; s < live.S; s++) {
    const p = live.at[T + s]!;
    if (p < 0) continue;
    const k = keyBlendAt(ref, p);
    addDeltas(k, values[keyAddedGroupId(file.name, s)]);
    added.push(k);
  }
  // out.keys: every key (full) or the own keys (the bake mirrors them); key i is original key i either way
  const kept = out.keys.filter((_, i) => !live.dead[i]);
  out.keys = [...kept, ...added]
    .map((k, i) => ({ k, i }))
    .sort((x, y) => (x.k.phase as number) - (y.k.phase as number) || x.i - y.i)
    .map((x) => x.k);
}

/** The file text as the key files are written (2-space JSON, trailing newline). */
export const keyFileText = (file: KeyFile): string => `${JSON.stringify(file, null, 2)}\n`;

/** The clips an edit set touches (non-zero deltas), sorted. */
export function editedClips(values: Values): string[] {
  const s = new Set<string>();
  for (const [g, vals] of Object.entries(values)) {
    const p = parseKeyGroup(g) ?? parseKeyAdded(g); // (item 25) an added-key group too
    if (p && Object.values(vals).some((v) => typeof v === 'number' && v !== 0)) s.add(p[0]);
  }
  return [...s].sort();
}

/** Registry export (`changed`) or snapshot (`values`) -> group -> slider -> value, `key.` groups (and Mirror boxes) only. */
export function keyValuesOf(rec: unknown): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  if (!rec || typeof rec !== 'object') return out;
  const isKey = (g: string): boolean => !!parseKeyGroup(g) || !!parseKeyMirror(g) || !!parseKeyAdded(g); // (item 25) added keys
  const r = rec as { changed?: unknown; values?: unknown };
  if (Array.isArray(r.changed)) {
    for (const c of r.changed as { group?: unknown; id?: unknown; value?: unknown }[]) {
      if (typeof c?.group === 'string' && typeof c.id === 'string' && typeof c.value === 'number' && isKey(c.group)) (out[c.group] ??= {})[c.id] = c.value;
    }
  } else if (r.values && typeof r.values === 'object') {
    for (const [g, vals] of Object.entries(r.values as Obj)) {
      if (!isKey(g) || !vals || typeof vals !== 'object') continue;
      for (const [id, v] of Object.entries(vals as Obj)) if (typeof v === 'number') (out[g] ??= {})[id] = v;
    }
  }
  return out;
}

/** One key as the bake reads it (scripts/anim-keys/py/key_clip.py: `.get(field, 0)`, the optional wrist / shoulder frame). */
export interface ReadKey {
  phase: number;
  /** `KEY_FIELDS` order, the value the bake uses (missing = 0). */
  v: number[];
}

/**
 * A port of the bake's key reader (key_clip.py: the json load, `mirror_key`, the phase sort): every key the bake poses,
 * the mirrored half included (sides swapped; trunk yaw and roll and the pelvis dx negated). Test use: an export read back
 * gives the edited values.
 */
export function readKeys(file: KeyFile): ReadKey[] {
  const get = (k: Obj, f: KeyField): number => {
    let o = k[f.seg] as Obj | undefined;
    if (o && f.sub) o = o[f.sub] as Obj | undefined;
    const v = o?.[f.field];
    return typeof v === 'number' ? v : 0;
  };
  const keys = file.keys.map((k) => ({ phase: k.phase as number, v: KEY_FIELDS.map((f) => get(k, f)) }));
  if (file.mirror) for (const k of file.keys) keys.push({ phase: (k.phase as number) + 0.5, v: KEY_FIELDS.map((f) => get(mirrorKey(k), f)) });
  return keys.sort((a, b) => a.phase - b.phase);
}

/**
 * (marlow-bays item 23) The text of `src/anim/tuneKeysMeta.ts` for the key files (any order; written in name order):
 * each clip's frames, mirror flag and own key phases. A key file's phases change with a timing edit, so whatever writes
 * key files writes this too (`scripts/anim-keys/meta.mjs`, apply-tune.mjs). Byte-identical for unchanged files.
 */
export function keyMetaText(files: readonly KeyFile[]): string {
  const rows = [...files]
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .map((k) => `  { name: '${k.name}', frames: ${k.frames ?? 32}, mirror: ${!!k.mirror}, phases: [${k.keys.map((x) => String(x.phase)).join(', ')}]${k.legs ? ', legs: true' : ''} },`);
  return `// GENERATED from scripts/anim-keys/keys/*.json (tuner-v2 item 4): each keyed clip's own keys (the mirrored half is
// made by the bake). tests/tuneKeys.test.ts checks it against the JSON files; regenerate when a key file changes.
export interface KeyClipMeta {
  readonly name: string;
  readonly frames: number;
  readonly mirror: boolean;
  readonly phases: readonly number[];
  /** (anim-skeleton S4) The key file sets \`legs\` (FK legs: the Keys section shows the FK weight). */
  readonly legs?: boolean;
}

export const KEY_CLIPS: readonly KeyClipMeta[] = [
${rows.join('\n')}
];
`;
}
