/**
 * (tuner-v2 item 4) Per-key edits <-> the scripts/anim-keys key JSON (pure, no imports: the game and the node script
 * `scripts/anim-keys/apply-tune.mjs` share it). A key edit is a delta on one field of one key of a keyed clip, in the
 * key file's own units, so an export bakes exactly what was typed: trunk segments pelvis / spine / chest / neck / head
 * (pitch, yaw, roll; deg), the pelvis offset (dx / dy / dz; cm), and per arm the shoulder (pitch, yaw, roll), the upper
 * arm (flex, abd, twistUpper), the elbow bend, the forearm (inward, twist) and the wrist frame (pitch, yaw, roll).
 * (marlow-bays T1a, item 17) head, shoulder, the two twists and the pelvis offset are new; a key file without them
 * reads 0 (as the bake reads it). The legs stay the foot planner's (rig gap R3).
 * Registry groups `key.<clip>.<key index>` (a mirrored clip: indexes 0 .. 2n-1, the second half the mirrored keys, used
 * only with its Mirror box off) and `key.<clip>.mirror` (the Mirror box, slider `mirror`: 1 on, 0 off); slider ids are
 * `KEY_FIELDS[].id`.
 */

export interface KeyField {
  /** Slider id (`spine_pitch`, `armL_flex`, `armR_wristYaw`, `armL_twist` ...). */
  readonly id: string;
  readonly label: string;
  /** The key object it edits (`pelvis`, `spine`, `chest`, `neck`, `head`, `armL`, `armR`). */
  readonly seg: string;
  /** The field in it (`pitch`, `flex`, ...); with `sub`, the field of the arm's `wrist` / `sh` object. */
  readonly field: string;
  /** The arm's sub-object ('' none, `wrist` the wrist frame, `sh` the shoulder). */
  readonly sub: '' | 'wrist' | 'sh';
  /** `sub === 'wrist'` (the older callers read this). */
  readonly wrist: boolean;
  /** 'deg' or 'cm' (the pelvis offset). */
  readonly unit: 'deg' | 'cm';
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

/** The trunk segments a key has (pelvis first: its child is counter-turned, as the bake's FK). */
export const KEY_TRUNK = ['pelvis', 'spine', 'chest', 'neck', 'head'] as const;
const TAXES = ['pitch', 'yaw', 'roll'] as const;
/** Slider range of an angle (deg, a delta on the key's value). */
export const KEY_RANGE = { min: -90, max: 90, step: 0.5 } as const;
/** (T1a) Slider range of the pelvis offset (cm). */
export const KEY_RANGE_CM = { min: -10, max: 10, step: 0.1 } as const;

function fields(): KeyField[] {
  const out: KeyField[] = [];
  const deg = (id: string, label: string, seg: string, field: string, sub: '' | 'wrist' | 'sh' = ''): void => {
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
  return out;
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
    if (f.seg === 'armL' || f.seg === 'armR') out[`arm${f.seg === 'armL' ? 'R' : 'L'}${f.id.slice(4)}`] = v;
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
  }
  return false;
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
  const full = !!file.mirror && !keyMirrorOn(values, file.name) && keyHalvesDiffer(values, file.name, file.keys.length);
  const out = full ? expandMirror(file) : (JSON.parse(JSON.stringify(file)) as KeyFile);
  out.keys.forEach((key, i) => {
    const vals = values[keyGroupId(file.name, i)];
    if (!vals) return;
    for (const f of KEY_FIELDS) {
      const d = vals[f.id];
      if (typeof d !== 'number' || !Number.isFinite(d) || d === 0) continue;
      let o = (key[f.seg] ??= {}) as Obj;
      if (f.sub) o = (o[f.sub] ??= { yaw: 0, pitch: 0, roll: 0 }) as Obj;
      const base = typeof o[f.field] === 'number' ? (o[f.field] as number) : 0;
      o[f.field] = r3(base + d);
    }
  });
  return out;
}

/** The file text as the key files are written (2-space JSON, trailing newline). */
export const keyFileText = (file: KeyFile): string => `${JSON.stringify(file, null, 2)}\n`;

/** The clips an edit set touches (non-zero deltas), sorted. */
export function editedClips(values: Values): string[] {
  const s = new Set<string>();
  for (const [g, vals] of Object.entries(values)) {
    const p = parseKeyGroup(g);
    if (p && Object.values(vals).some((v) => typeof v === 'number' && v !== 0)) s.add(p[0]);
  }
  return [...s].sort();
}

/** Registry export (`changed`) or snapshot (`values`) -> group -> slider -> value, `key.` groups (and Mirror boxes) only. */
export function keyValuesOf(rec: unknown): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  if (!rec || typeof rec !== 'object') return out;
  const isKey = (g: string): boolean => !!parseKeyGroup(g) || !!parseKeyMirror(g);
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
