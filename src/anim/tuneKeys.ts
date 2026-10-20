/**
 * (tuner-v2 item 4) Per-key editing of the keyed clips: the registry section "Keys" (groups `key.<clip>.<key>`, every
 * key of every clip in `scripts/anim-keys/keys`, picker order clip then key; sliders `KEY_FIELDS`, degree deltas on the
 * key's own fields), and its live preview: an edited clip gets per-frame offset tables (`KeyedClip.keyOff`, allocated
 * on its first edit, rewritten in place after) that `sampleKeyed` blends exactly as it blends the clip. A key's offset
 * spreads linearly to its neighbouring keys (the mirrored half of a mirrored clip follows, as the bake makes it).
 * No edits: every `keyOff` is null and the sampler is bit-identical. Export: `tuneKeysClipValues` + `applyKeyEdits`, or
 * the panel's Export file through `scripts/anim-keys/apply-tune.mjs` (docs/tuner-v2/ITEM4.md).
 */
import './tuneV2Sections'; // the tuner-v2 sections register first (the panel order ends Stepping, then Keys)
import type { KeyedClip, KeyedOffsets } from './keyed';
import { KEY_CLIPS } from './tuneKeysMeta';
import { KEY_FIELDS, KEY_RANGE, keyGroupId } from './tuneKeysFile';
import { registerTuneSection, TUNE_LOG, type TuneChange, type TuneTunable } from './tuneRegistry';

const NF = KEY_FIELDS.length;
/** The bake keys at round(phase * 48) of a 48-frame span (key_clip.py `SPAN`). */
const SPAN = 48;

/** Every runtime clip by name (the generated `clips/keyed/*.ts`, the same modules the game imports). */
const CLIPS = new Map<string, KeyedClip>();
for (const mod of Object.values(import.meta.glob('./clips/keyed/*.ts', { eager: true }) as Record<string, Record<string, unknown>>)) {
  for (const v of Object.values(mod)) {
    const c = v as Partial<KeyedClip> | null;
    if (c && typeof c === 'object' && typeof c.name === 'string' && c.pel instanceof Float32Array) CLIPS.set(c.name, c as KeyedClip);
  }
}

/** Group ids per clip (KEY_CLIPS order), then key. */
export const KEY_GROUP_IDS: readonly (readonly string[])[] = KEY_CLIPS.map((c) => c.phases.map((_, k) => keyGroupId(c.name, k)));
const ALL_GROUPS: readonly string[] = KEY_GROUP_IDS.flat();
const FIELD_IDS: readonly string[] = KEY_FIELDS.map((f) => f.id);

const sliders: TuneTunable[] = KEY_FIELDS.map((f) => ({
  id: f.id,
  label: `${f.label} (this key)`,
  kind: 'add' as const,
  def: 0,
  min: KEY_RANGE.min,
  max: KEY_RANGE.max,
  step: KEY_RANGE.step,
  unit: 'deg',
  groups: ALL_GROUPS,
  hook: `keyed sampler: key ${f.seg}${f.wrist ? '.wrist' : ''}.${f.field} (+ deg), baked by scripts/anim-keys/apply-tune.mjs`,
}));

export const KEYS_SECTION = registerTuneSection({
  id: 'keys',
  label: 'Keys',
  groups: ALL_GROUPS,
  tunables: sliders,
  notes: (group, id) => {
    if (id !== FIELD_IDS[0]) return [];
    const ci = KEY_GROUP_IDS.findIndex((g) => g.includes(group));
    const c = KEY_CLIPS[ci];
    if (!c) return [];
    const k = KEY_GROUP_IDS[ci]!.indexOf(group);
    const ph = c.phases[k]!;
    return [`${c.name} key ${k} of ${c.phases.length}: phase ${ph.toFixed(3)} (frame ${Math.round(ph * c.frames)} of ${c.frames})${c.mirror ? `, mirrored onto ${(ph + 0.5).toFixed(3)}` : ''}`];
  },
});

// mirrored key: trunk yaw / roll negated, the arms swapped side for side (key_clip.py `mirror_key`)
const MIR_IDX = new Int32Array(NF);
const MIR_SGN = new Float64Array(NF);
KEY_FIELDS.forEach((f, j) => {
  const arm = f.seg === 'armL' || f.seg === 'armR';
  const partner = arm ? KEY_FIELDS.findIndex((g) => g.seg === (f.seg === 'armL' ? 'armR' : 'armL') && g.field === f.field && g.wrist === f.wrist) : j;
  MIR_IDX[j] = partner;
  MIR_SGN[j] = !arm && (f.field === 'yaw' || f.field === 'roll') ? -1 : 1;
});
const ARM_L = FIELD_IDS.indexOf('armL_flex');
const ARM_R = FIELD_IDS.indexOf('armR_flex');

interface ClipEdit {
  readonly clip: KeyedClip;
  readonly meta: (typeof KEY_CLIPS)[number];
  /** The applied degrees, key x field. */
  readonly deg: Float64Array;
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

const D = new Float64Array(NF);

/** The edit's degrees spread over the clip's frames, as offset quaternions (into the preallocated tables). */
function build(e: ClipEdit): void {
  const { meta, deg, off } = e;
  const nk = meta.phases.length;
  const N = meta.frames;
  // every key the bake poses (own keys, then the mirrored half), at its baked phase
  const total = meta.mirror ? nk * 2 : nk;
  const ph: number[] = [];
  const src: number[] = [];
  for (let i = 0; i < total; i++) {
    const k = i % nk;
    ph.push(Math.round(((meta.phases[k]! + (i >= nk ? 0.5 : 0)) % 1) * SPAN) / SPAN);
    src.push(i);
  }
  src.sort((a, b) => ph[a]! - ph[b]!);
  const row = (i: number, j: number): number => {
    const k = i % nk;
    return i >= nk ? MIR_SGN[j]! * deg[k * NF + MIR_IDX[j]!]! : deg[k * NF + j]!;
  };
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
    for (let s = 0; s < 4; s++) eul(off.trunk, f * 16 + s * 4, D[s * 3 + 1]!, D[s * 3]!, D[s * 3 + 2]!);
    for (let side = 0; side < 2; side++) {
      const b0 = side === 0 ? ARM_L : ARM_R;
      const sg = side === 0 ? -1 : 1;
      const fl = D[b0]!;
      const ab = D[b0 + 1]!;
      const el = D[b0 + 2]!;
      const inw = D[b0 + 3]!;
      eul(off.arm, f * 16 + side * 8, 0, -fl, sg * ab);
      eul(off.arm, f * 16 + side * 8 + 4, -sg * inw, -(fl + el), sg * ab);
      eul(off.wrist, f * 8 + side * 4, sg * D[b0 + 5]!, D[b0 + 4]!, sg * D[b0 + 6]!);
    }
  }
  meanInto(off.trunk, N, 16, off.trunkMean);
  meanInto(off.arm, N, 16, off.armMean);
  meanInto(off.wrist, N, 8, off.wristMean);
  let w = 0;
  for (let k = 0; k < nk; k++) for (let j = ARM_L + 4; j < ARM_L + 7; j++) if (deg[k * NF + j] !== 0 || deg[k * NF + j + (ARM_R - ARM_L)] !== 0) w = 1;
  off.wristOn = w;
}

/** Registry -> one clip's table where they differ; allocates only on the clip's first edit. */
function syncClip(ci: number): void {
  const meta = KEY_CLIPS[ci]!;
  const groups = KEY_GROUP_IDS[ci]!;
  const e = EDITS[ci];
  let diff = false;
  let any = false;
  for (let k = 0; k < groups.length; k++) {
    const vals = KEYS_SECTION.values[groups[k]!] as Record<string, number>;
    for (let j = 0; j < NF; j++) {
      const v = vals[FIELD_IDS[j]!]!;
      if (v !== 0) any = true;
      if (e ? v !== e.deg[k * NF + j] : v !== 0) diff = true;
    }
  }
  if (!diff) return;
  const clip = CLIPS.get(meta.name);
  if (!clip) return;
  let ed = e;
  if (!ed) {
    const N = meta.frames;
    ed = {
      clip,
      meta,
      deg: new Float64Array(groups.length * NF),
      off: {
        trunk: new Float32Array(N * 16),
        trunkMean: new Float32Array(16),
        arm: new Float32Array(N * 16),
        armMean: new Float32Array(16),
        wrist: new Float32Array(N * 8),
        wristMean: new Float32Array(8),
        wristOn: 0,
      },
    };
    EDITS[ci] = ed;
  }
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

/** One clip's edits (group -> slider -> deg, non-zero only), for `applyKeyEdits`. */
export function tuneKeysClipValues(clip: string): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  const ci = KEY_CLIPS.findIndex((c) => c.name === clip);
  for (const g of KEY_GROUP_IDS[ci] ?? []) {
    const vals = KEYS_SECTION.values[g] as Record<string, number>;
    for (const id of FIELD_IDS) if (vals[id] !== 0) (out[g] ??= {})[id] = vals[id]!;
  }
  return out;
}

/** The runtime clip by name (tests). */
export const keyedClipByName = (name: string): KeyedClip | undefined => CLIPS.get(name);
