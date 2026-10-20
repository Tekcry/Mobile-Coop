/**
 * (tuner-v2 item 4) Per-key edits <-> the scripts/anim-keys key JSON (pure, no imports: the game and the node script
 * `scripts/anim-keys/apply-tune.mjs` share it). A key edit is a degree delta on one field of one key of a keyed clip,
 * in the key file's own units, so an export bakes exactly what was typed: trunk segments pelvis / spine / chest / neck
 * (pitch, yaw, roll), and per arm flex, abd, elbow, inward and the wrist frame (pitch, yaw, roll). The rest of item 1's
 * joint list has no key channel (the head rides the neck, the legs are the foot planner's, no shoulder or toe key).
 * Registry groups `key.<clip>.<key index>`; slider ids are `KEY_FIELDS[].id`.
 */

export interface KeyField {
  /** Slider id (`spine_pitch`, `armL_flex`, `armR_wristYaw` ...). */
  readonly id: string;
  readonly label: string;
  /** The key object it edits (`pelvis`, `spine`, `chest`, `neck`, `armL`, `armR`). */
  readonly seg: string;
  /** The field in it (`pitch`, `flex`, ...); with `wrist`, the field of the arm's `wrist` object. */
  readonly field: string;
  readonly wrist: boolean;
}

const TRUNK = ['pelvis', 'spine', 'chest', 'neck'] as const;
const TAXES = ['pitch', 'yaw', 'roll'] as const;
const ARM = [
  ['flex', 'upper arm flex (+ forward)'],
  ['abd', 'upper arm abd (+ out)'],
  ['elbow', 'elbow bend (+ bent)'],
  ['inward', 'forearm inward (+ in)'],
] as const;

function fields(): KeyField[] {
  const out: KeyField[] = [];
  for (const s of TRUNK) for (const a of TAXES) out.push({ id: `${s}_${a}`, label: `${s} ${a}`, seg: s, field: a, wrist: false });
  for (const side of ['L', 'R'] as const) {
    const seg = `arm${side}`;
    for (const [f, l] of ARM) out.push({ id: `${seg}_${f}`, label: `${side} ${l}`, seg, field: f, wrist: false });
    for (const a of TAXES) out.push({ id: `${seg}_wrist${a[0]!.toUpperCase()}${a.slice(1)}`, label: `${side} wrist ${a}`, seg, field: a, wrist: true });
  }
  return out;
}

export const KEY_FIELDS: readonly KeyField[] = fields();
/** Slider range (deg, a delta on the key's value). */
export const KEY_RANGE = { min: -90, max: 90, step: 0.5 } as const;

export const keyGroupId = (clip: string, key: number): string => `key.${clip}.${key}`;

/** Group id -> [clip, key index], or null. */
export function parseKeyGroup(g: string): [string, number] | null {
  const m = /^key\.([a-z0-9_]+)\.(\d+)$/.exec(g);
  return m ? [m[1]!, Number(m[2])] : null;
}

type Obj = Record<string, unknown>;
export interface KeyFile {
  name: string;
  mirror?: boolean;
  frames?: number;
  keys: Obj[];
  [k: string]: unknown;
}

const r3 = (v: number): number => Math.round(v * 1000) / 1000 + 0;

/**
 * The key file with the edits added (a new object; `file` untouched). `values`: group id -> slider id -> delta (deg);
 * groups of other clips and zero deltas are ignored. A missing field counts as 0 (as the bake reads it); a wrist frame
 * is added to an arm only for a non-zero wrist delta. Key order, every other field and the note are kept.
 */
export function applyKeyEdits(file: KeyFile, values: Readonly<Record<string, Readonly<Record<string, number>>>>): KeyFile {
  const out = JSON.parse(JSON.stringify(file)) as KeyFile;
  out.keys.forEach((key, i) => {
    const vals = values[keyGroupId(file.name, i)];
    if (!vals) return;
    for (const f of KEY_FIELDS) {
      const d = vals[f.id];
      if (typeof d !== 'number' || !Number.isFinite(d) || d === 0) continue;
      let o = (key[f.seg] ??= {}) as Obj;
      if (f.wrist) o = (o.wrist ??= { yaw: 0, pitch: 0, roll: 0 }) as Obj;
      const base = typeof o[f.field] === 'number' ? (o[f.field] as number) : 0;
      o[f.field] = r3(base + d);
    }
  });
  return out;
}

/** The file text as the key files are written (2-space JSON, trailing newline). */
export const keyFileText = (file: KeyFile): string => `${JSON.stringify(file, null, 2)}\n`;

/** The clips an edit set touches (non-zero deltas), sorted. */
export function editedClips(values: Readonly<Record<string, Readonly<Record<string, number>>>>): string[] {
  const s = new Set<string>();
  for (const [g, vals] of Object.entries(values)) {
    const p = parseKeyGroup(g);
    if (p && Object.values(vals).some((v) => typeof v === 'number' && v !== 0)) s.add(p[0]);
  }
  return [...s].sort();
}

/** Registry export (`changed`) or snapshot (`values`) -> group -> slider -> value, `key.` groups only. */
export function keyValuesOf(rec: unknown): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  if (!rec || typeof rec !== 'object') return out;
  const r = rec as { changed?: unknown; values?: unknown };
  if (Array.isArray(r.changed)) {
    for (const c of r.changed as { group?: unknown; id?: unknown; value?: unknown }[]) {
      if (typeof c?.group === 'string' && typeof c.id === 'string' && typeof c.value === 'number' && parseKeyGroup(c.group)) (out[c.group] ??= {})[c.id] = c.value;
    }
  } else if (r.values && typeof r.values === 'object') {
    for (const [g, vals] of Object.entries(r.values as Obj)) {
      if (!parseKeyGroup(g) || !vals || typeof vals !== 'object') continue;
      for (const [id, v] of Object.entries(vals as Obj)) if (typeof v === 'number') (out[g] ??= {})[id] = v;
    }
  }
  return out;
}

/** One key as the bake reads it (scripts/anim-keys/py/key_clip.py: `.get(field, 0)`, the optional wrist frame). */
export interface ReadKey {
  phase: number;
  /** `KEY_FIELDS` order, the value the bake uses (missing = 0). */
  v: number[];
}

/**
 * A port of the bake's key reader (key_clip.py: the json load, `mirror_key`, the phase sort): every key the bake poses,
 * the mirrored half included (sides swapped; pelvis / spine / chest / neck yaw and roll negated). Test use: an export
 * read back gives the edited values.
 */
export function readKeys(file: KeyFile): ReadKey[] {
  const get = (k: Obj, f: KeyField): number => {
    let o = k[f.seg] as Obj | undefined;
    if (o && f.wrist) o = o.wrist as Obj | undefined;
    const v = o?.[f.field];
    return typeof v === 'number' ? v : 0;
  };
  const keys = file.keys.map((k) => ({ phase: k.phase as number, v: KEY_FIELDS.map((f) => get(k, f)) }));
  if (file.mirror) {
    for (const k of file.keys) {
      const m: Obj = { phase: (k.phase as number) + 0.5 };
      for (const s of TRUNK) {
        const e = { ...(k[s] as Obj) };
        for (const a of ['dx', 'yaw', 'roll']) if (typeof e[a] === 'number') e[a] = -(e[a] as number);
        m[s] = e;
      }
      m.armL = k.armR;
      m.armR = k.armL;
      keys.push({ phase: m.phase as number, v: KEY_FIELDS.map((f) => get(m, f)) });
    }
  }
  return keys.sort((a, b) => a.phase - b.phase);
}
