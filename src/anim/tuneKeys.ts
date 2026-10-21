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
 */
import './tuneV2Sections'; // the tuner-v2 sections register first (the panel order ends Stepping, then Keys)
import type { KeyedClip, KeyedOffsets } from './keyed';
import { KEY_CLIPS } from './tuneKeysMeta';
import { KEY_FIELDS, KEY_FIELD_INDEX, keyGroupId, keyMirrorGroupId, mirrorDelta } from './tuneKeysFile';
import { registerTuneSection, TUNE_LOG, tuneSet, type TuneChange, type TuneTunable } from './tuneRegistry';
import { keyCount, keyPhase } from './keyTimeline';

const NF = KEY_FIELDS.length;
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

/** Group ids per clip (KEY_CLIPS order), then key (a mirrored clip: its 2n keys, the mirrored half last). */
export const KEY_GROUP_IDS: readonly (readonly string[])[] = KEY_CLIPS.map((c) => Array.from({ length: keyCount(c) }, (_, k) => keyGroupId(c.name, k)));
/** (T1a, item 18) The Mirror box group per clip ('' for a clip keyed in full). */
export const KEY_MIRROR_IDS: readonly string[] = KEY_CLIPS.map((c) => (c.mirror ? keyMirrorGroupId(c.name) : ''));
const ALL_KEY_GROUPS: readonly string[] = KEY_GROUP_IDS.flat();
const MIRROR_GROUPS: readonly string[] = KEY_MIRROR_IDS.filter((g) => g !== '');
const FIELD_IDS: readonly string[] = KEY_FIELDS.map((f) => f.id);

const sliders: TuneTunable[] = KEY_FIELDS.map((f) => ({
  id: f.id,
  label: `${f.label} (this key)`,
  kind: 'add' as const,
  def: 0,
  min: f.min,
  max: f.max,
  step: f.step,
  unit: f.unit,
  groups: ALL_KEY_GROUPS,
  hook: `keyed sampler: key ${f.seg}${f.sub ? `.${f.sub}` : ''}.${f.field} (+ ${f.unit}), baked by scripts/anim-keys/apply-tune.mjs`,
}));
sliders.push({ id: 'mirror', label: 'mirror the keys onto the other arm (1 on, 0 off)', kind: 'add', def: 1, min: 0, max: 1, step: 1, unit: '', groups: MIRROR_GROUPS, hook: 'tuneKeys: the mirrored half follows the own keys (off: every key its own; the bake writes the clip in full)' });

export const KEYS_SECTION = registerTuneSection({
  id: 'keys',
  label: 'Keys',
  groups: [...ALL_KEY_GROUPS, ...MIRROR_GROUPS],
  tunables: sliders,
  notes: (group, id) => {
    if (id !== FIELD_IDS[0]) return [];
    const ci = KEY_GROUP_IDS.findIndex((g) => g.includes(group));
    const c = KEY_CLIPS[ci];
    if (!c) return [];
    const k = KEY_GROUP_IDS[ci]!.indexOf(group);
    const ph = keyPhase(c, k);
    const n = c.phases.length;
    const mir = !c.mirror ? '' : k < n ? `, mirrored onto key ${k + n + 1}` : `, the mirror of key ${k - n + 1}`;
    return [`${c.name} key ${k + 1} of ${keyCount(c)}: phase ${ph.toFixed(3)} (frame ${Math.round(ph * c.frames)} of ${c.frames})${mir}`];
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

interface ClipEdit {
  readonly clip: KeyedClip;
  readonly meta: (typeof KEY_CLIPS)[number];
  /** The applied values, key (every key, a mirrored clip's 2n) x field. */
  readonly deg: Float64Array;
  /** The Mirror box applied (a mirrored clip; 1 for the others). */
  mirror: number;
  readonly off: KeyedOffsets;
}
const EDITS: (ClipEdit | null)[] = KEY_CLIPS.map(() => null);

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

/** The edit's values spread over the clip's frames, as offset tables (into the preallocated tables). */
function build(e: ClipEdit): void {
  const { meta, deg, off } = e;
  const nk = meta.phases.length;
  const N = meta.frames;
  const mirrorOn = e.mirror >= 0.5;
  // every key the bake poses (own keys, then the mirrored half), at its baked phase
  const total = keyCount(meta);
  const ph: number[] = [];
  const src: number[] = [];
  for (let i = 0; i < total; i++) {
    ph.push(Math.round((keyPhase(meta, i) % 1) * SPAN) / SPAN);
    src.push(i);
  }
  src.sort((a, b) => ph[a]! - ph[b]!);
  // the mirrored half: the own key mirrored (Mirror on) or its own row (off)
  const row = (i: number, j: number): number => (i >= nk && mirrorOn ? MIR_SGN[j]! * deg[(i - nk) * NF + MIR_IDX[j]!]! : deg[i * NF + j]!);
  for (let f = 0; f < N; f++) {
    const p = f / N;
    let a = src.length - 1;
    for (let s = 0; s < src.length; s++) if (ph[src[s]!]! <= p) a = s;
    const b = (a + 1) % src.length;
    let pa = ph[src[a]!]!;
    let pb = ph[src[b]!]!;
    if (pa > p) pa -= 1;
    if (pb <= pa) pb += 1;
    const t = pb > pa ? (p - pa) / (pb - pa) : 0;
    for (let j = 0; j < NF; j++) {
      const va = row(src[a]!, j);
      D[j] = va + (row(src[b]!, j) - va) * t;
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
  const live = (ids: readonly number[]): number => {
    for (let k = 0; k < total; k++) {
      if (k >= nk && mirrorOn) break;
      for (const j of ids) if (deg[k * NF + j] !== 0) return 1;
    }
    return 0;
  };
  const both = (f: (a: ArmIdx) => number[]): number[] => [...f(ARMS[0]!), ...f(ARMS[1]!)];
  off.wristOn = live(both((a) => [a.wp, a.wy, a.wr]));
  off.foreOn = live(both((a) => [a.tw]));
  off.shOn = live(both((a) => [a.sp, a.sy, a.sr]));
  off.twUOn = live(both((a) => [a.twU]));
  off.headOn = live(HEAD);
  off.pelOn = live(PEL);
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
  const e = EDITS[ci];
  const mir = mirrorOf(ci);
  const nk = meta.phases.length;
  let diff = !!e && e.mirror !== mir;
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
  if (!diff) return;
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
    ed = {
      clip,
      meta,
      deg: new Float64Array(groups.length * NF),
      mirror: mir,
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
  if (!any) {
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
 * (T1a, item 18) The Mirror box set. Off: the mirrored half takes the mirror image of the own keys' edits (so the pose
 * does not jump) and is edited on its own after. On: the mirrored half's own edits are dropped (it follows the own keys
 * again). One change log entry (the box); the values are saved with it. A clip keyed in full, or no change: false.
 */
export function tuneKeysMirror(clip: string, on: boolean): boolean {
  const ci = KEY_CLIPS.findIndex((c) => c.name === clip);
  const mg = ci < 0 ? '' : KEY_MIRROR_IDS[ci]!;
  if (!mg || (mirrorOf(ci) === 1) === on) return false;
  const meta = KEY_CLIPS[ci]!;
  const groups = KEY_GROUP_IDS[ci]!;
  const n = meta.phases.length;
  for (let j = 0; j < n; j++) {
    const own = KEYS_SECTION.values[groups[j]!] as Record<string, number>;
    const mine = KEYS_SECTION.values[groups[n + j]!] as Record<string, number>;
    const m = on ? {} : mirrorDelta(own);
    for (const id of FIELD_IDS) mine[id] = (m[id] ?? 0) + 0;
  }
  tuneSet(mg, 'mirror', on ? 1 : 0);
  syncClip(ci);
  return true;
}

/** The runtime clip by name (tests). */
export const keyedClipByName = (name: string): KeyedClip | undefined => CLIPS.get(name);
