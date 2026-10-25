/**
 * (anim-bake) Bake an animation tuner export (`anim-tune-<date>.json`) into the code defaults: each changed slider's
 * value is written into the code value its bake rule names (`tuneBakeTable.ts`), so after the bake (and a reset of the
 * baked sliders) every slider reads identity again with the same look. Pure: no fs, no Babylon; the caller passes a
 * file reader and writes the returned texts (`scripts/anim-tune-bake.mjs`; tests on temp copies).
 *
 * Refuses (nothing is written): a wrong magic or version, a malformed entry, a value outside its slider's wide range, a
 * kind that differs from the slider's, a target file outside the write roots, a code value not found exactly once, or a
 * code value that is not a number literal (or a simple `NAME * n` / `NAME + n` form).
 *
 * Per slider and group the result is one of: baked (a code value); baked (base table) (the generated `animBase.ts`:
 * the Joints / Hands / IK / Weapon / Gear / Body keys, or (anim-bake-all, BA-A1) the generic `sections` key for every
 * slider and group no rule covers, and for every group of a shared rule whose groups differ: per state, so nothing is
 * left in the tuner; `allowShared` instead bakes a single changed group into the shared value and warns); manual: no code
 * target (a pure option, the Joints mirror lock); Keys (the key JSONs via the apply-tune functions, then a rebake per
 * clip); already baked (the ledger: this group and slider were baked before at this same value, in this export or an
 * earlier one); skipped (no bake rule: a slider this build does not know). `docs/archive/anim-tuner/BAKE.md`.
 */
import { applyKeyEdits, editedClips, KEY_FIELDS, keyEditPlan, keyEditRow, keyFileText, keyMetaText, keyMirrorOn, keyWrittenFull, parseKeyGroup, parseKeyMirror, type KeyFile } from './tuneKeysFile'; // (item 25, track A) keyEditPlan, keyEditRow, keyWrittenFull
import { KEY_TIME_ID, KEY_TIME_MAX } from './tuneKeysTime';
import { KEY_AT_ID, KEY_DEL_ID, parseKeyAdded } from './tuneKeysEdit'; // (item 25, track A)
import { aliasTuneChanged, migrateTuneChanged } from './tuneRows';
import { BODY_BASE_FIELDS } from './tune';
import { applyBaseEntries, applySectionEntries, BAKE_BASE_FILE, BAKE_BASE_SECTIONS, baseTarget, bakeFmt, parseAnimBase, sectionTarget, spliceAnimBase, type SectionEntry } from './tuneBakeBase';
import { applyGuardBaseEntries, BAKE_GUARD_FILE, BAKE_GUARD_SECTIONS, guardBaseTarget, parseAnimBaseGuard, spliceAnimBaseGuard } from './tuneBakeGuard'; // (item 24, track A)
import { BAKE_KEYS_DIR, BAKE_LEDGER, BAKE_MANUAL, BAKE_RULES, BAKE_WRITE_ROOTS, type BakeOp, type BakeRule, type DeclaredSection, type DeclaredTunable, type ManualRule } from './tuneBakeTable';

export const BAKE_MAGIC = 'night-shift-anim-tune';

// ------------------------------------------------------------------------------------------
// Catalogue: every slider the build knows (from the registry's sections, or declared)
// ------------------------------------------------------------------------------------------

export interface CatTunable extends DeclaredTunable {
  readonly section: string;
}
export interface Catalogue {
  /** group -> slider id -> the slider. */
  readonly byGroup: ReadonlyMap<string, ReadonlyMap<string, CatTunable>>;
  /** section -> slider id -> the slider. */
  readonly bySection: ReadonlyMap<string, ReadonlyMap<string, CatTunable>>;
}

/** The catalogue from section-like objects (the registry's `TUNE_SECTIONS`, `DECLARED_SECTIONS`, ...). Keys are built in. */
export function bakeCatalogue(sections: readonly DeclaredSection[]): Catalogue {
  const byGroup = new Map<string, Map<string, CatTunable>>();
  const bySection = new Map<string, Map<string, CatTunable>>();
  for (const s of sections) {
    const ids = bySection.get(s.id) ?? new Map<string, CatTunable>();
    bySection.set(s.id, ids);
    for (const t of s.tunables) {
      const c: CatTunable = { section: s.id, id: t.id, kind: t.kind, def: t.def, min: t.min, max: t.max, groups: t.groups.slice() };
      ids.set(t.id, c);
      for (const g of t.groups) {
        const row = byGroup.get(g) ?? new Map<string, CatTunable>();
        byGroup.set(g, row);
        row.set(t.id, c);
      }
    }
  }
  return { byGroup, bySection };
}

/** The Keys section's slider (every `key.<clip>.<n>` group): a delta (deg, or cm for the pelvis shift), identity 0. */
const KEY_BY_ID = new Map(KEY_FIELDS.map((f) => [f.id, f]));
const KEY_TUNABLE = (id: string): CatTunable => {
  const f = KEY_BY_ID.get(id)!;
  return { section: 'keys', id, kind: 'add', def: 0, min: f.min, max: f.max, groups: [] };
};
const KEY_IDS = new Set(KEY_FIELDS.map((f) => f.id));
/** (item 23, track A) A key's timing slider (`time`, bake frames, + later): bakes into the key's `phase`. */
const KEY_TIME_TUNABLE: CatTunable = { section: 'keys', id: KEY_TIME_ID, kind: 'add', def: 0, min: -KEY_TIME_MAX, max: KEY_TIME_MAX, groups: [] };
/** (item 23, track A) The tuner's key meta (each clip's own key phases), regenerated when a bake moves a key. */
const BAKE_KEYS_META = 'src/anim/tuneKeysMeta.ts';
/** (T1a, item 18) The Keys section's Mirror box (`key.<clip>.mirror`): 1 on (identity), 0 off. */
const KEY_MIRROR_TUNABLE: CatTunable = { section: 'keys', id: 'mirror', kind: 'add', def: 1, min: 0, max: 1, groups: [] };
/** The catalogue entry of a Keys group's slider, or undefined (an unknown slider, or not a Keys group). */
/** (item 25, track A) A key's delete slider (`del`, 1 deleted) and an added key's time (`at`, bake frames; 0 none). */
const KEY_DEL_TUNABLE: CatTunable = { section: 'keys', id: KEY_DEL_ID, kind: 'add', def: 0, min: 0, max: 1, groups: [] };
const KEY_AT_TUNABLE: CatTunable = { section: 'keys', id: KEY_AT_ID, kind: 'add', def: 0, min: 0, max: KEY_TIME_MAX, groups: [] };
const keyTunable = (group: string, id: string): CatTunable | undefined => {
  if (parseKeyGroup(group)) return KEY_IDS.has(id) ? KEY_TUNABLE(id) : id === KEY_TIME_ID ? KEY_TIME_TUNABLE : id === KEY_DEL_ID ? KEY_DEL_TUNABLE : undefined; // (item 23, track A) time; (item 25, track A) del
  if (parseKeyMirror(group)) return id === 'mirror' ? KEY_MIRROR_TUNABLE : undefined;
  if (parseKeyAdded(group)) return KEY_IDS.has(id) ? KEY_TUNABLE(id) : id === KEY_AT_ID ? KEY_AT_TUNABLE : undefined; // (item 25, track A) an added key
  return undefined;
};
const isKeyGroup = (g: string): boolean => !!parseKeyGroup(g) || !!parseKeyMirror(g) || !!parseKeyAdded(g); // (item 25, track A) added keys

/** The registry's wide range (`tuneMin` / `tuneMax` with "wide ranges" on): doubled about the default, a multiplier never below its floor. */
export function wideRange(t: Pick<DeclaredTunable, 'kind' | 'def' | 'min' | 'max'>): [number, number] {
  const lo = t.def - 2 * (t.def - t.min);
  const floor = t.min > 0 ? Math.min(0.05, t.min) : Math.max(0, t.min);
  return [t.kind === 'mul' ? Math.max(floor, lo) : lo, t.def + 2 * (t.max - t.def)];
}

// ------------------------------------------------------------------------------------------
// Locating a code value: `CONST.key[i]...` in a TypeScript file
// ------------------------------------------------------------------------------------------

/** Per character: 0 code, 1 inside a comment, 2 inside a string. */
function codeMask(text: string): Uint8Array {
  const m = new Uint8Array(text.length);
  let i = 0;
  while (i < text.length) {
    const c = text[i]!;
    const n = text[i + 1];
    if (c === '/' && n === '/') {
      while (i < text.length && text[i] !== '\n') m[i++] = 1;
    } else if (c === '/' && n === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end < 0 ? text.length : end + 2;
      while (i < stop) m[i++] = 1;
    } else if (c === '"' || c === "'" || c === '`') {
      m[i++] = 2;
      while (i < text.length && text[i] !== c) {
        if (text[i] === '\\') m[i++] = 2;
        m[i++] = 2;
      }
      if (i < text.length) m[i++] = 2;
    } else i++;
  }
  return m;
}

const OPEN = '([{';
const CLOSE = ')]}';

/** Skip whitespace and comments from `i`. */
function skipWs(text: string, mask: Uint8Array, i: number): number {
  while (i < text.length && (mask[i] === 1 || (mask[i] === 0 && /\s/.test(text[i]!)))) i++;
  return i;
}

/**
 * The end of the expression starting at `i` (exclusive): the first `,` `;` or closing bracket at depth 0, or (`top`, a
 * top-level const) a newline at depth 0. Trailing whitespace and comments are left out.
 */
function exprEnd(text: string, mask: Uint8Array, i: number, top: boolean): number {
  let depth = 0;
  let last = i;
  for (let k = i; k < text.length; k++) {
    if (mask[k] === 1) continue;
    if (mask[k] === 2) {
      last = k + 1;
      continue;
    }
    const c = text[k]!;
    if (OPEN.includes(c)) depth++;
    else if (CLOSE.includes(c)) {
      if (depth === 0) return last;
      depth--;
    } else if (depth === 0 && (c === ',' || c === ';')) return last;
    else if (depth === 0 && top && c === '\n' && last > i) return last;
    if (!/\s/.test(c)) last = k + 1;
  }
  return last;
}

/** The entries of an object / array literal opening at `i`: [start, end) of each, trimmed. */
function entries(text: string, mask: Uint8Array, i: number): [number, number][] {
  const out: [number, number][] = [];
  let depth = 0;
  let start = i + 1;
  const push = (a: number): void => {
    const s = skipWs(text, mask, a);
    const e = exprEnd(text, mask, s, false);
    if (e > s) out.push([s, e]);
  };
  for (let k = i; k < text.length; k++) {
    if (mask[k] !== 0) continue;
    const c = text[k]!;
    if (OPEN.includes(c)) depth++;
    else if (CLOSE.includes(c)) {
      depth--;
      if (depth === 0) {
        push(start);
        return out;
      }
    } else if (c === ',' && depth === 1) {
      push(start);
      start = k + 1;
    }
  }
  throw new Error('unclosed literal');
}

export interface Located {
  start: number;
  end: number;
  text: string;
}

/** Find the code value at `path` (`NAME`, `NAME.a.b`, `NAME.list[2]`) in a TypeScript file. Throws with the reason. */
export function locate(text: string, path: string): Located {
  const segs = path.split(/(?=[.[])/);
  const name = segs.shift()!;
  if (!/^[A-Za-z_$][\w$]*$/.test(name)) throw new Error(`bad path ${path}`);
  const mask = codeMask(text);
  const re = new RegExp(`(^|[^\\w$.])const\\s+${name.replace(/\$/g, '\\$')}(?![\\w$])`, 'g');
  const hits: number[] = [];
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const at = m.index + m[1]!.length;
    if (mask[at] === 0) hits.push(at + m[0].length - m[1]!.length);
  }
  if (hits.length !== 1) throw new Error(`const ${name} found ${hits.length} times`);
  // past the type annotation to the `=`
  let k = hits[0]!;
  let depth = 0;
  for (; k < text.length; k++) {
    if (mask[k] !== 0) continue;
    const c = text[k]!;
    if (c === '<' || OPEN.includes(c)) depth++;
    else if ((c === '>' && text[k - 1] !== '=') || CLOSE.includes(c)) depth--;
    else if (c === '=' && depth === 0 && text[k + 1] !== '>' && text[k + 1] !== '=') break;
  }
  if (k >= text.length) throw new Error(`const ${name} has no value`);
  let start = skipWs(text, mask, k + 1);
  let top = true;
  for (const seg of segs) {
    const isIndex = seg.startsWith('[');
    const opener = text[start];
    if (isIndex) {
      const idx = Number(seg.slice(1, -1));
      if (opener !== '[' || !Number.isInteger(idx)) throw new Error(`${path}: ${seg} is not an array element`);
      const es = entries(text, mask, start);
      if (idx < 0 || idx >= es.length) throw new Error(`${path}: index ${idx} out of ${es.length}`);
      start = es[idx]![0];
    } else {
      const key = seg.slice(1);
      if (opener !== '{') throw new Error(`${path}: ${key} is not in an object literal`);
      const found: number[] = [];
      for (const [a, b] of entries(text, mask, start)) {
        const m = /^(['"]?)([A-Za-z_$][\w$]*)\1\s*:/.exec(text.slice(a, b));
        if (m && m[2] === key) found.push(skipWs(text, mask, a + m[0].length));
      }
      if (found.length !== 1) throw new Error(`${path}: key ${key} found ${found.length} times`);
      start = found[0]!;
    }
    top = false;
  }
  const end = exprEnd(text, mask, start, top);
  return { start, end, text: text.slice(start, end) };
}

// ------------------------------------------------------------------------------------------
// Editing a value
// ------------------------------------------------------------------------------------------

const NUM = '-?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][-+]?\\d+)?';
const IDENT = '[A-Za-z_$][\\w$.]*';
const RE_NUM = new RegExp(`^${NUM}$`);
const RE_MUL = new RegExp(`^(${IDENT}\\s*\\*\\s*)(${NUM})$`);
const RE_MUL2 = new RegExp(`^(${NUM})(\\s*\\*\\s*${IDENT})$`);
const RE_ADD = new RegExp(`^(${IDENT})(\\s*)([+-])(\\s*)(${NUM})$`);
const RE_ID = new RegExp(`^${IDENT}$`);

/** About 4 significant digits, no -0 (`tuneBakeBase.ts`, shared with the base table). */
export { bakeFmt };

interface PendingOp {
  op: BakeOp;
  /** The operand (an add / sub already in the code's unit). */
  v: number;
}
const multiplicative = (o: PendingOp): boolean => o.op === 'mul' || o.op === 'div';
function applyOp(x: number, o: PendingOp): number {
  switch (o.op) {
    case 'mul':
      return x * o.v;
    case 'div':
      return x / o.v;
    case 'add':
      return x + o.v;
    default:
      return x - o.v;
  }
}

/** The new text of a value under the ops, or the same text when nothing changes. Throws on a form it cannot edit. */
export function editValue(src: string, ops: readonly PendingOp[]): string {
  const t = src.trim();
  if (RE_NUM.test(t)) {
    const old = Number(t);
    let v = old;
    for (const o of ops) v = applyOp(v, o);
    const out = bakeFmt(v);
    return Number(out) === old ? src : out;
  }
  const allMul = ops.every(multiplicative);
  const allAdd = ops.every((o) => !multiplicative(o));
  if (!allMul && !allAdd) throw new Error(`"${t}" is not a number literal and the ops mix x and +`);
  let m: RegExpExecArray | null;
  if (allMul && (m = RE_MUL.exec(t))) {
    const old = Number(m[2]);
    const v = ops.reduce(applyOp, old);
    return bakeFmt(v) === bakeFmt(old) ? src : `${m[1]}${bakeFmt(v)}`;
  }
  if (allMul && (m = RE_MUL2.exec(t))) {
    const old = Number(m[1]);
    const v = ops.reduce(applyOp, old);
    return bakeFmt(v) === bakeFmt(old) ? src : `${bakeFmt(v)}${m[2]}`;
  }
  if (allAdd && (m = RE_ADD.exec(t))) {
    const old = (m[3] === '-' ? -1 : 1) * Number(m[5]);
    const v = Number(bakeFmt(ops.reduce(applyOp, old)));
    if (v === Number(bakeFmt(old))) return src;
    if (v === 0) return m[1]!;
    return `${m[1]}${m[2]}${v < 0 ? '-' : '+'}${m[4]}${bakeFmt(Math.abs(v))}`;
  }
  if (RE_ID.test(t)) {
    if (allMul) {
      const v = ops.reduce(applyOp, 1);
      return Number(bakeFmt(v)) === 1 ? src : `${t} * ${bakeFmt(v)}`;
    }
    const v = Number(bakeFmt(ops.reduce(applyOp, 0)));
    return v === 0 ? src : `${t} ${v < 0 ? '-' : '+'} ${bakeFmt(Math.abs(v))}`;
  }
  throw new Error(`"${t}" is not a number literal (or NAME * n, NAME + n)`);
}

// ------------------------------------------------------------------------------------------
// The diff (old line -> new line)
// ------------------------------------------------------------------------------------------

export function bakeDiff(path: string, before: string, after: string): string {
  if (before === after) return '';
  // (CRLF working trees: the edits keep the file's line ends; the diff shows the lines without them)
  const a = before.split(/\r?\n/);
  const b = after.split(/\r?\n/);
  const out = [`--- a/${path}`, `+++ b/${path}`];
  if (a.length === b.length) {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(`@@ -${i + 1} +${i + 1} @@`, `-${a[i]}`, `+${b[i]}`);
    return `${out.join('\n')}\n`;
  }
  // different line counts (a key JSON gained a wrist frame): common prefix / suffix, then an LCS of the middle
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let s = 0;
  while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  const am = a.slice(p, a.length - s);
  const bm = b.slice(p, b.length - s);
  out.push(`@@ -${p + 1},${am.length} +${p + 1},${bm.length} @@`);
  if (am.length * bm.length > 4e6) {
    for (const l of am) out.push(`-${l}`);
    for (const l of bm) out.push(`+${l}`);
    return `${out.join('\n')}\n`;
  }
  const n = am.length;
  const m = bm.length;
  const L = new Uint32Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i * (m + 1) + j] = am[i] === bm[j] ? L[(i + 1) * (m + 1) + j + 1]! + 1 : Math.max(L[(i + 1) * (m + 1) + j]!, L[i * (m + 1) + j + 1]!);
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && am[i] === bm[j]) {
      out.push(` ${am[i]}`);
      i++;
      j++;
    } else if (j < m && (i >= n || L[i * (m + 1) + j + 1]! >= L[(i + 1) * (m + 1) + j]!)) out.push(`+${bm[j++]}`);
    else out.push(`-${am[i++]}`);
  }
  return `${out.join('\n')}\n`;
}

// ------------------------------------------------------------------------------------------
// The ledger (a re-run of the same export is a no-op)
// ------------------------------------------------------------------------------------------

interface LedgerEntry {
  hash: string;
  exported: string;
  at: string;
  /** `group|id=value` of every baked value (fix round S3: a later export with that value is never baked again). */
  baked: string[];
}
interface Ledger {
  note?: string;
  bakes: LedgerEntry[];
}

/** FNV-1a, two seeds (64 bits as 16 hex digits): the export's changed values, order-free. */
export function bakeHash(changed: readonly { group: string; id: string; value: number }[]): string {
  const s = changed
    .map((c) => `${c.group}|${c.id}|${c.value}`)
    .sort()
    .join('\n');
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x01000193) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

function readLedger(text: string | null): Ledger {
  if (!text) return { bakes: [] };
  const j = JSON.parse(text) as Partial<Ledger>;
  return { ...j, bakes: Array.isArray(j.bakes) ? j.bakes : [] };
}

// ------------------------------------------------------------------------------------------
// The bake
// ------------------------------------------------------------------------------------------

export interface BakeOptions {
  /** Section ids to bake (others are left in the export). */
  only?: readonly string[];
  /** Bake a shared target when exactly one group changed (warns: it changes every state reading it). */
  allowShared?: boolean;
  /** The ledger's time stamp. */
  now?: Date;
  /** The table (tests). */
  rules?: readonly BakeRule[];
  manual?: readonly ManualRule[];
}

export interface BakeRow {
  section: string;
  group: string;
  id: string;
  value: number;
  /** Where it goes (file and path, op), or the manual reason. */
  target: string;
  result: string;
}

export interface BakeWrite {
  path: string;
  before: string;
  after: string;
}

export interface BakeResult {
  ok: boolean;
  /** Why it was refused ('' when ok). */
  error: string;
  rows: BakeRow[];
  /** The files to write (with the ledger when anything was baked); empty on a refusal or a no-op. */
  writes: BakeWrite[];
  /** Unified-style diff of every write. */
  diff: string;
  /** The rebake command per key clip touched. */
  rebake: string[];
  warnings: string[];
  baked: number;
  manual: number;
}

interface Entry {
  section: string;
  group: string;
  id: string;
  value: number;
  t: CatTunable;
  key: string;
  row: BakeRow;
}

/** (anim-bake-targets) The Body sliders the base table's `body` key holds. */
const BODY_BASE_IDS = new Set<string>(BODY_BASE_FIELDS);
const fail = (error: string): BakeResult => ({ ok: false, error, rows: [], writes: [], diff: '', rebake: [], warnings: [], baked: 0, manual: 0 });
const opText = (op: BakeOp, scale?: number): string => (op === 'mul' ? 'x' : op === 'div' ? '/' : op === 'add' ? '+' : '-') + (scale !== undefined && scale !== 1 ? ` (x${scale})` : '');
/** The rule's edits, the file named once per run of edits in it: `src/config/camera.ts: CAMERA.boomHip +, ...`. */
const editText = (r: BakeRule): string => {
  const out: string[] = [];
  let file = '';
  for (const e of r.edits) {
    const t = `${e.path} ${opText(e.op, e.scale)}`;
    if (e.file === file) out[out.length - 1] += `, ${t}`;
    else out.push(`${e.file}: ${t}`);
    file = e.file;
  }
  return out.join('; ');
};

/** A safe repo-relative path under one of the write roots. */
export function bakeWritable(p: string): boolean {
  return !p.includes('..') && !p.includes('\\') && !p.startsWith('/') && !/^[A-Za-z]:/.test(p) && BAKE_WRITE_ROOTS.some((r) => p.startsWith(r));
}

/**
 * Bake an export. `read(path)` returns a repo-relative file's text (null: missing). Returns the rows, the writes and the
 * diff; writes nothing itself.
 */
export function tuneBake(data: unknown, cat: Catalogue, read: (path: string) => string | null, opts: BakeOptions = {}): BakeResult {
  const RULES = opts.rules ?? BAKE_RULES;
  const MANUAL = opts.manual ?? BAKE_MANUAL;
  if (!data || typeof data !== 'object') return fail('not an animation tuner export');
  const exp = data as { magic?: unknown; version?: unknown; changed?: unknown; exported?: unknown };
  if (exp.magic !== BAKE_MAGIC) return fail(`wrong file (magic ${String(exp.magic)})`);
  if (exp.version !== 1 && exp.version !== 2) return fail(`unsupported version ${String(exp.version)}`);
  if (!Array.isArray(exp.changed)) return fail('no values in the file');

  // 1. the entries: well formed, known kind, inside the wide range
  const all: { group: string; id: string; value: number }[] = [];
  const seen = new Set<string>();
  // (marlow-bays T1a) a version 1 export (before the shared states' own rows): each new row takes its old row's values,
  // as the tuner's import does
  const raw = exp.changed as unknown[];
  const valid = raw.filter((c): c is { group: string } => !!c && typeof c === 'object' && typeof (c as { group?: unknown }).group === 'string');
  // (anim-natural N3) a split slider's old id (clip.gun holster) fills its new ids, at any version
  const list = aliasTuneChanged(exp.version === 1 ? [...raw, ...migrateTuneChanged(valid).slice(valid.length)] : raw);
  for (const c of list) {
    const x = (c ?? {}) as { group?: unknown; id?: unknown; value?: unknown; kind?: unknown };
    if (typeof x.group !== 'string' || typeof x.id !== 'string' || typeof x.value !== 'number' || !Number.isFinite(x.value)) return fail(`malformed entry ${JSON.stringify(c)}`);
    const k = `${x.group}|${x.id}`;
    if (seen.has(k)) return fail(`${k} twice in the export`);
    seen.add(k);
    all.push({ group: x.group, id: x.id, value: x.value });
    const t = isKeyGroup(x.group) ? keyTunable(x.group, x.id) : cat.byGroup.get(x.group)?.get(x.id);
    if (!t) continue;
    if (typeof x.kind === 'string' && x.kind !== t.kind) return fail(`${k}: kind ${x.kind} in the export, ${t.kind} in this build`);
    const [lo, hi] = wideRange(t);
    if (x.value < lo - 1e-9 || x.value > hi + 1e-9) return fail(`${k}: ${x.value} is outside the slider's wide range ${lo} .. ${hi}`);
  }
  const hash = bakeHash(all);
  const ledgerText = read(BAKE_LEDGER);
  let ledger: Ledger;
  try {
    ledger = readLedger(ledgerText);
  } catch (err) {
    return fail(`${BAKE_LEDGER}: ${(err as Error).message}`);
  }
  // (fix round S3) group|id=value -> when it was baked: any export (not only this one) that still carries a baked value
  // (the tuner's save keeps it until the slider is reset) is never baked twice
  const doneAt = new Map<string, string>();
  for (const b of ledger.bakes) if (Array.isArray(b.baked)) for (const k of b.baked) if (typeof k === 'string' && k.includes('=')) doneAt.set(k, typeof b.at === 'string' ? b.at : '?');
  const ledgerKey = (group: string, id: string, v: number): string => `${group}|${id}=${v}`;

  // 2. the rows
  const rows: BakeRow[] = [];
  const warnings: string[] = [];
  let skippedN = 0;
  const entries: Entry[] = [];
  const only = opts.only && opts.only.length ? new Set(opts.only) : null;
  for (const a of all) {
    const t = isKeyGroup(a.group) ? keyTunable(a.group, a.id) : cat.byGroup.get(a.group)?.get(a.id);
    const row: BakeRow = { section: t?.section ?? '?', group: a.group, id: a.id, value: a.value, target: '', result: '' };
    if (!t) {
      row.result = 'skipped: no bake rule (a slider this build does not know)';
      rows.push(row);
      skippedN++;
      continue;
    }
    if (a.value === t.def) continue;
    if (only && !only.has(t.section)) continue;
    rows.push(row);
    const key = ledgerKey(a.group, a.id, a.value);
    const at = doneAt.get(key);
    if (at !== undefined) {
      // counted as identity below: the code already holds it
      row.result = `already baked (same value as the bake of ${at}; reset this slider in the tuner)`;
      continue;
    }
    entries.push({ section: t.section, group: a.group, id: a.id, value: a.value, t, key, row });
  }

  // 3. the rules and manual entries per entry
  const live = new Map<string, Entry>();
  for (const en of entries) live.set(`${en.section}|${en.group}|${en.id}`, en);
  const value = (section: string, group: string, id: string, def: number): number => live.get(`${section}|${group}|${id}`)?.value ?? def;
  interface RuleState {
    r: BakeRule;
    changed: Entry[];
    vals: number[];
    status: 'bake' | 'shared' | 'manual' | 'blocked';
    v: number;
  }
  const states: RuleState[] = [];
  const byEntry = new Map<Entry, RuleState[]>();
  for (const r of RULES) {
    const changed: Entry[] = [];
    for (const g of r.groups) {
      const en = live.get(`${r.section}|${g}|${r.id}`);
      if (en) changed.push(en);
    }
    if (changed.length === 0) continue;
    const def = changed[0]!.t.def;
    const vals = r.groups.map((g) => value(r.section, g, r.id, def));
    const same = vals.every((v) => v === vals[0]);
    const st: RuleState = { r, changed, vals, status: same ? 'bake' : changed.length === 1 && opts.allowShared ? 'shared' : 'manual', v: same ? vals[0]! : changed[0]!.value };
    states.push(st);
    for (const en of changed) {
      const l = byEntry.get(en) ?? [];
      l.push(st);
      byEntry.set(en, l);
    }
  }
  // a value bakes only when every rule of its slider and group bakes (never half in the code, half in the tuner)
  for (let again = true; again; ) {
    again = false;
    for (const st of states) {
      if (st.status === 'manual' || st.status === 'blocked') continue;
      if (st.changed.some((en) => (byEntry.get(en) ?? []).some((o) => o.status === 'manual' || o.status === 'blocked'))) {
        st.status = 'blocked';
        again = true;
      }
    }
  }

  // 4. the rows' results; the edits of the baking rules
  const pending = new Map<string, Map<string, PendingOp[]>>();
  let baked = 0;
  let manualN = skippedN;
  // (anim-joints J1) Joints, Hands & feet, IK strength and Weapon: the generated base table (`animBase.ts`);
  // (anim-bake-targets) also every Body slider and group no code rule covers (the `body` key)
  const isBase = (en: Entry): boolean => BAKE_BASE_SECTIONS.includes(en.section) && !(byEntry.get(en)?.length) && (en.section !== 'body' || BODY_BASE_IDS.has(en.id)) && !MANUAL.some((x) => x.section === en.section && (x.id === en.id || x.id === '*') && (x.groups ? x.groups.includes(en.group) : true));
  const baseEntries: Entry[] = [];
  // (anim-bake-all, BA-A1) the generic table: every entry no rule covers (pure options excepted), and every entry whose
  // rules cannot all bake (a shared target whose groups differ): per state, composed as the registry composes `eff`
  const genericEntries: SectionEntry[] = [];
  const generic = (en: Entry, why: string): BakeResult | null => {
    try {
      en.row.target = sectionTarget({ section: en.section, group: en.group, id: en.id, kind: en.t.kind, def: en.t.def });
    } catch (err) {
      return fail((err as Error).message);
    }
    if (why) en.row.target += ` [${why}]`;
    en.row.result = 'baked (base table)';
    genericEntries.push({ section: en.section, group: en.group, id: en.id, value: en.value, kind: en.t.kind, def: en.t.def });
    baked++;
    return null;
  };
  // (item 24, track A) Guard joints, Guard stepping, Guard weight: the generated guard table (`animBaseGuard.ts`), taken
  // first in the loop below, so a guard row never reaches the generic table (Wren's)
  const guardEntries: Entry[] = [];
  for (const en of entries) {
    const row = en.row;
    if (en.section === 'keys') continue;
    if (BAKE_GUARD_SECTIONS.includes(en.section)) {
      try {
        row.target = guardBaseTarget(en);
      } catch (err) {
        return fail((err as Error).message);
      }
      row.result = 'baked (guard base table)';
      guardEntries.push(en);
      baked++;
      continue;
    }
    if (isBase(en)) {
      try {
        row.target = baseTarget(en);
      } catch (err) {
        return fail((err as Error).message);
      }
      row.result = 'baked (base table)';
      baseEntries.push(en);
      baked++;
      continue;
    }
    const sts = byEntry.get(en);
    if (!sts || sts.length === 0) {
      const m = MANUAL.find((x) => x.section === en.section && (x.id === en.id || x.id === '*') && (x.groups ? x.groups.includes(en.group) : !RULES.some((r) => r.section === en.section && r.id === en.id && r.groups.includes(en.group))));
      if (m) {
        row.target = m.reason;
        row.result = 'manual: no code target';
        manualN++;
        continue;
      }
      const f = generic(en, 'no code value of its own');
      if (f) return f;
      continue;
    }
    const bad = sts.find((s) => s.status === 'manual' || s.status === 'blocked');
    if (bad) {
      // (anim-bake-all) the shared code value stays; this state's value goes per state: a Body base param into the
      // body key (as every other group of it), anything else into the generic table
      const m = sts.find((s) => s.status === 'manual') ?? bad;
      const why = `per state: the shared ${editText(m.r)} has differing groups (${m.r.groups.map((g, i) => `${g} ${m.vals[i]}`).join(', ')})`;
      if (en.section === 'body' && BODY_BASE_IDS.has(en.id)) {
        try {
          row.target = `${baseTarget(en)} [${why}]`;
        } catch (err) {
          return fail((err as Error).message);
        }
        row.result = 'baked (base table)';
        baseEntries.push(en);
        baked++;
        continue;
      }
      const f = generic(en, why);
      if (f) return f;
      continue;
    }
    row.target = sts.map((s) => editText(s.r)).join(' | ');
    const shared = sts.filter((s) => s.status === 'shared');
    row.result = shared.length ? `baked (--allow-shared: changes ${[...new Set(shared.flatMap((s) => s.r.groups))].join(', ')})` : 'baked';
    const notes = sts.map((s) => s.r.note).filter((n): n is string => !!n);
    if (notes.length) row.target += ` [${[...new Set(notes)].join('; ')}]`;
    baked++;
  }
  for (const st of states) {
    if (st.status !== 'bake' && st.status !== 'shared') continue;
    if (st.status === 'shared') warnings.push(`--allow-shared: ${st.r.section} ${st.r.id} = ${st.v} (changed in ${st.changed[0]!.group} only) now applies to every state reading it: ${st.r.groups.join(', ')}`);
    const kind = st.changed[0]!.t.kind;
    for (const e of st.r.edits) {
      if ((kind === 'mul') !== (e.op === 'mul' || e.op === 'div')) return fail(`table: ${st.r.section} ${st.r.id} is a ${kind} slider, edit ${e.path} is ${e.op}`);
      if (!bakeWritable(e.file)) return fail(`table: ${e.file} is outside the write roots (${BAKE_WRITE_ROOTS.join(', ')})`);
      const v = kind === 'mul' ? st.v : st.v * (e.scale ?? 1);
      if (e.op === 'div' && v === 0) return fail(`${st.r.section} ${st.r.id}: 0 cannot divide ${e.path}`);
      const f = pending.get(e.file) ?? new Map<string, PendingOp[]>();
      pending.set(e.file, f);
      const l = f.get(e.path) ?? [];
      l.push({ op: e.op, v });
      f.set(e.path, l);
    }
  }

  // 5. the source edits
  const writes: BakeWrite[] = [];
  for (const [file, targets] of [...pending].sort((a, b) => a[0].localeCompare(b[0]))) {
    const before = read(file);
    if (before === null) return fail(`${file}: not found`);
    const reps: { start: number; end: number; text: string }[] = [];
    for (const [p, ops] of targets) {
      try {
        const at = locate(before, p);
        const t = editValue(at.text, ops);
        if (t !== at.text) reps.push({ start: at.start, end: at.end, text: t });
      } catch (err) {
        return fail(`${file} ${p}: ${(err as Error).message} (the target must be found exactly once)`);
      }
    }
    reps.sort((a, b) => b.start - a.start);
    let after = before;
    for (const r of reps) after = after.slice(0, r.start) + r.text + after.slice(r.end);
    if (after !== before) writes.push({ path: file, before, after });
  }
  // (anim-joints J1) the base table: one write, the entries composed in by the A1 rules (anim-bake-all: and the generic table)
  if (baseEntries.length || genericEntries.length) {
    const before = read(BAKE_BASE_FILE);
    if (before === null) return fail(`${BAKE_BASE_FILE}: not found`);
    try {
      const after = spliceAnimBase(before, applySectionEntries(applyBaseEntries(parseAnimBase(before), baseEntries), genericEntries));
      if (after !== before) writes.push({ path: BAKE_BASE_FILE, before, after });
    } catch (err) {
      return fail((err as Error).message);
    }
  }
  // (item 24, track A) the guard table: one write, only when the export has guard rows
  if (guardEntries.length) {
    const before = read(BAKE_GUARD_FILE);
    if (before === null) return fail(`${BAKE_GUARD_FILE}: not found`);
    try {
      const after = spliceAnimBaseGuard(before, applyGuardBaseEntries(parseAnimBaseGuard(before), guardEntries));
      if (after !== before) writes.push({ path: BAKE_GUARD_FILE, before, after });
    } catch (err) {
      return fail((err as Error).message);
    }
  }

  // 6. Keys: the key JSONs (the apply-tune functions), then a rebake per clip
  const keyVals: Record<string, Record<string, number>> = {};
  for (const en of entries) if (en.section === 'keys') (keyVals[en.group] ??= {})[en.id] = en.value;
  const rebake: string[] = [];
  const keyAfter = new Map<string, string>(); // (item 23, track A) clip -> its key file as written
  for (const clip of editedClips(keyVals)) {
    const file = `${BAKE_KEYS_DIR}${clip}.json`;
    const before = read(file);
    if (before === null) return fail(`${file}: not found (Keys group of an unknown clip)`);
    let kf: KeyFile;
    try {
      kf = JSON.parse(before) as KeyFile;
    } catch (err) {
      return fail(`${file}: ${(err as Error).message}`);
    }
    if (kf.name !== clip || !Array.isArray(kf.keys)) return fail(`${file}: not the key file of ${clip}`);
    // (T1a, item 18) a mirrored clip with its Mirror box off and its halves edited apart is written in full
    const n = kf.keys.length;
    const full = keyWrittenFull(kf, keyVals); // (item 25, track A) also a key added / deleted with the box off
    const plan = keyEditPlan(kf, keyVals); // (item 25, track A) the added and deleted keys
    for (const en of entries) {
      if (en.section !== 'keys') continue;
      if (parseKeyMirror(en.group) === clip) {
        en.row.target = `${file} mirror`;
        en.row.result = full ? 'baked (key JSON written in full, mirror: false; rebake the clip)' : 'baked (no change: the halves still mirror each other)';
        baked++;
        continue;
      }
      // (item 25, track A) an added key's sliders, a key's delete, a deleted key's edits
      const er = keyEditRow(kf, plan, en.group, en.id, file);
      if (er) {
        en.row.target = er.target;
        en.row.result = er.result;
        if (er.baked) baked++;
        else manualN++;
        continue;
      }
      const pk = parseKeyGroup(en.group);
      if (!pk || pk[0] !== clip) continue;
      const f = KEY_FIELDS.find((x) => x.id === en.id);
      // (item 23, track A) the timing slider moves the key's phase (frame / 48, clamped by tuneKeysTime's rules)
      en.row.target = f ? `${file} key ${pk[1]} ${f.seg}${f.sub ? `.${f.sub}` : ''}.${f.field} + (${f.unit})` : `${file} key ${pk[1]} phase + (bake frames / 48)`;
      if (!f && pk[1] === 0) {
        en.row.result = 'skipped: the first key is fixed (phase 0)';
        manualN++;
        continue;
      }
      if (pk[1] >= (full ? 2 * n : n)) {
        // Mirror off with the halves still mirror images: the mirrored own key carries this value (baked through it)
        if (kf.mirror && pk[1] < 2 * n && !keyMirrorOn(keyVals, clip)) {
          en.row.result = `baked (the halves still mirror: key ${pk[1]} is key ${pk[1] - n} mirrored; rebake the clip)`;
          baked++;
          continue;
        }
        en.row.result = kf.mirror && pk[1] < 2 * n ? `skipped: the Mirror box is on (key ${pk[1]} follows key ${pk[1] - n})` : `skipped: ${clip} has ${n} keys`;
        manualN++;
        continue;
      }
      en.row.result = 'baked (key JSON; rebake the clip)';
      baked++;
    }
    const after = keyFileText(applyKeyEdits(kf, keyVals));
    if (after !== before) writes.push({ path: file, before, after });
    keyAfter.set(clip, after);
    rebake.push(`node --import ./scripts/operators/ts-resolve.mjs scripts/anim-keys/build.mjs ${clip}`);
  }
  // (T1a) a Mirror box set off on a clip with no key edits changes nothing in the file
  for (const en of entries) {
    if (en.section !== 'keys' || en.row.result) continue;
    en.row.target = `${BAKE_KEYS_DIR}${parseKeyMirror(en.group) ?? '?'}.json mirror`;
    en.row.result = 'skipped: no key edits on this clip (the Mirror box alone changes nothing)';
    manualN++;
  }

  // (item 23, track A) regenerate the tuner's key meta (as scripts/anim-keys/meta.mjs does) from every key file the meta
  // lists, the written ones as written. (item 25, track A) whenever a key file is written (a timing edit, an add /
  // delete, a file written in full: the meta holds each clip's mirror flag and own key phases); keyMetaText is
  // byte-identical for unchanged files, so a field-only bake writes no meta.
  const keyListBaked = entries.some((en) => en.section === 'keys' && (en.id === KEY_TIME_ID || en.id === KEY_DEL_ID || en.id === KEY_AT_ID) && en.row.result.startsWith('baked'));
  const metaBefore = writes.some((w) => w.path.startsWith(BAKE_KEYS_DIR)) ? read(BAKE_KEYS_META) : null;
  // the meta must exist when the key times or the key list change; otherwise a tree without it (a partial copy) skips it
  if (keyListBaked && metaBefore === null) return fail(`${BAKE_KEYS_META}: not found`);
  if (metaBefore === null && writes.some((w) => w.path.startsWith(BAKE_KEYS_DIR))) warnings.push(`${BAKE_KEYS_META}: not found, not regenerated`);
  if (metaBefore !== null) {
    const before = metaBefore;
    const files: KeyFile[] = [];
    for (const m of before.matchAll(/name: '([^']+)'/g)) {
      const text = keyAfter.get(m[1]!) ?? read(`${BAKE_KEYS_DIR}${m[1]!}.json`);
      if (text === null) return fail(`${BAKE_KEYS_DIR}${m[1]!}.json: not found (listed in ${BAKE_KEYS_META})`);
      try {
        files.push(JSON.parse(text) as KeyFile);
      } catch (err) {
        return fail(`${BAKE_KEYS_DIR}${m[1]!}.json: ${(err as Error).message}`);
      }
    }
    let after = keyMetaText(files);
    if (before.includes('\r\n')) after = after.replace(/\n/g, '\r\n');
    if (after !== before) writes.push({ path: BAKE_KEYS_META, before, after });
  }

  // 7. the ledger
  const bakedKeys = entries.filter((en) => en.row.result.startsWith('baked')).map((en) => ledgerKey(en.group, en.id, en.value));
  if (bakedKeys.length && writes.length) {
    const next: Ledger = { note: ledger.note ?? 'anim-bake: exports baked into the code defaults (scripts/anim-tune-bake.mjs); a re-run of one is a no-op', bakes: [...ledger.bakes, { hash, exported: typeof exp.exported === 'string' ? exp.exported : '', at: (opts.now ?? new Date()).toISOString(), baked: bakedKeys }] };
    writes.push({ path: BAKE_LEDGER, before: ledgerText ?? '', after: `${JSON.stringify(next, null, 2)}\n` });
  }
  if (bakedKeys.length && !writes.length) warnings.push('every baked value rounds to the code value it had: nothing to write');
  for (const w of writes) if (!bakeWritable(w.path)) return fail(`${w.path} is outside the write roots`);
  const diff = writes.map((w) => bakeDiff(w.path, w.before, w.after)).join('');
  return { ok: true, error: '', rows, writes, diff, rebake, warnings, baked, manual: manualN };
}

/** The rows as a plain text table (section, group, id, value, result, target: the long one last). */
export function bakeTable(rows: readonly BakeRow[]): string {
  const head = ['section', 'group', 'id', 'value', 'result', 'target'];
  const cells = rows.map((r) => [r.section, r.group, r.id, String(r.value), r.result, r.target]);
  const w = head.map((h, i) => Math.max(h.length, ...cells.map((c) => c[i]!.length)));
  const line = (c: readonly string[]): string => c.map((x, i) => (i === c.length - 1 ? x : x.padEnd(w[i]!))).join('  ');
  return [line(head), ...cells.map(line)].join('\n');
}
