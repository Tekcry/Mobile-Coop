/**
 * (anim-joints J1, COVERAGE gap 1) The bake's base table target: Joints, Hands & feet, IK strength and Weapon values of a
 * tuner export go into the generated `src/anim/animBase.ts` (A4), composed onto what is there by the A1 rules (the same
 * rules the runtime uses for base + delta: `wrapDeg`, `handCompose`, IK multiplied and clamped). Pure: no fs, no
 * Babylon. Keyed by row id, joint name and param id, never by index; the printed text is deterministic (sorted keys,
 * one row per line, about 4 significant digits, identity values dropped), so a re-bake of identity gives the same text.
 * (anim-gear) The Gear section (`gear.<socket>`, `gear.<socket>.crouch`) bakes into the table's `gear` key (offsets
 * add, angles wrapped), printed only when a row has an offset: a table without gear prints exactly as before.
 */
import type { AnimBaseData } from './animBase';
import { HAND_PARAMS, HP, IK_LIMBS, handCompose } from './tuneHands';
import { JOINTS, wrapDeg } from './tuneJoints';
import { GEAR_PARAMS, GEAR_ROWS, GP } from './tuneGear';

/** The generated file. */
export const BAKE_BASE_FILE = 'src/anim/animBase.ts';
/** The sections that bake into it (`joint.options`, the mirror lock, stays manual). */
export const BAKE_BASE_SECTIONS: readonly string[] = ['joint', 'hand', 'ik', 'weapon', 'gear'];
export const BASE_BEGIN = '// @anim-base-begin';
export const BASE_END = '// @anim-base-end';

/** About 4 significant digits, no -0. */
export function bakeFmt(v: number): string {
  if (!Number.isFinite(v)) throw new Error(`not a finite result (${v})`);
  const r = Number(v.toPrecision(4)) + 0;
  return String(r);
}
const round = (v: number): number => Number(bakeFmt(v));

export const emptyBase = (): AnimBaseData => ({ version: 1, joints: {}, hands: {}, ik: {} });

/** The marker lines' positions: [start of the JSON, end of the JSON] (the text between the two marker lines). */
function span(text: string): [number, number] {
  const a = text.indexOf(BASE_BEGIN);
  const b = text.indexOf(BASE_END);
  if (a < 0 || b < 0 || b < a || text.indexOf(BASE_BEGIN, a + 1) >= 0 || text.indexOf(BASE_END, b + 1) >= 0) throw new Error(`${BAKE_BASE_FILE}: the ${BASE_BEGIN} / ${BASE_END} lines must be there once each, in order`);
  const s = text.indexOf('\n', a);
  const e = text.lastIndexOf('\n', b);
  return [s + 1, e + 1];
}

/** Parse the base table out of the file's text (the JSON between the markers). Throws with the reason. */
export function parseAnimBase(text: string): AnimBaseData {
  const [s, e] = span(text);
  const j = JSON.parse(text.slice(s, e)) as Partial<AnimBaseData>;
  if (!j || typeof j !== 'object' || j.version !== 1) throw new Error(`${BAKE_BASE_FILE}: not a version 1 base table`);
  const b: AnimBaseData = { version: 1, joints: j.joints ?? {}, hands: j.hands ?? {}, ik: j.ik ?? {} };
  // (anim-gear) a table without the key (every one before anim-gear) has no gear offsets
  if (j.gear) b.gear = j.gear;
  return b;
}

const keys = (o: object): string[] => Object.keys(o).sort();
const DEF_BY_ID = new Map(HAND_PARAMS.map((p) => [p.id, p.def]));

/** The JSON text of a base table: sorted keys, one row per line, identity dropped, about 4 significant digits. */
export function printAnimBase(b: AnimBaseData): string {
  const q = JSON.stringify;
  const joints: string[] = [];
  for (const r of keys(b.joints)) {
    const row = b.joints[r]!;
    const parts: string[] = [];
    for (const j of keys(row)) {
      const v = row[j]!;
      const t = [0, 1, 2].map((a) => round(wrapDeg(v[a] ?? 0)));
      if (t.every((x) => x === 0)) continue;
      parts.push(`${q(j)}: [${t.map(bakeFmt).join(', ')}]`);
    }
    if (parts.length) joints.push(`    ${q(r)}: { ${parts.join(', ')} }`);
  }
  const weapons: string[] = [];
  for (const w of keys(b.hands)) {
    const rows: string[] = [];
    for (const r of keys(b.hands[w]!)) {
      const row = b.hands[w]![r]!;
      const parts: string[] = [];
      for (const id of keys(row)) {
        const v = round(row[id]!);
        if (v === (DEF_BY_ID.get(id) ?? 0)) continue;
        parts.push(`${q(id)}: ${bakeFmt(v)}`);
      }
      if (parts.length) rows.push(`      ${q(r)}: { ${parts.join(', ')} }`);
    }
    if (rows.length) weapons.push(`    ${q(w)}: {\n${rows.join(',\n')}\n    }`);
  }
  const ik: string[] = [];
  for (const r of keys(b.ik)) {
    const t = [0, 1, 2, 3].map((l) => round(b.ik[r]![l] ?? 1));
    if (t.every((x) => x === 1)) continue;
    ik.push(`    ${q(r)}: [${t.map(bakeFmt).join(', ')}]`);
  }
  // (anim-gear) row -> param id -> value (angles wrapped); the key only when a row has an offset
  const gear: string[] = [];
  const g = b.gear ?? {};
  for (const r of keys(g)) {
    const row = g[r]!;
    const parts: string[] = [];
    for (const id of keys(row)) {
      const p = GP[id];
      const v = round(p !== undefined && p >= 3 ? wrapDeg(row[id]!) : row[id]!);
      if (v === 0) continue;
      parts.push(`${q(id)}: ${bakeFmt(v)}`);
    }
    if (parts.length) gear.push(`    ${q(r)}: { ${parts.join(', ')} }`);
  }
  const block = (name: string, lines: string[]): string => (lines.length ? `  ${q(name)}: {\n${lines.join(',\n')}\n  }` : `  ${q(name)}: {}`);
  const tail = gear.length ? `,\n${block('gear', gear)}` : '';
  return `{\n  "version": 1,\n${block('joints', joints)},\n${block('hands', weapons)},\n${block('ik', ik)}${tail}\n}\n`;
}

/** The file's text with the JSON between the markers replaced (the rest kept; the file's line ends kept). */
export function spliceAnimBase(text: string, b: AnimBaseData): string {
  const [s, e] = span(text);
  const crlf = text.includes('\r\n');
  const json = printAnimBase(b);
  return text.slice(0, s) + (crlf ? json.replace(/\n/g, '\r\n') : json) + text.slice(e);
}

export interface BaseEntry {
  readonly group: string;
  readonly id: string;
  readonly value: number;
}

const AXIS: Readonly<Record<string, number>> = { x: 0, y: 1, z: 2 };
const JOINT_SET = new Set<string>(JOINTS);
const GEAR_ROW_SET = new Set<string>(GEAR_ROWS);

/** Where an entry goes in the base table and how (the bake's target column). Throws for an entry it cannot place. */
export function baseTarget(e: { group: string; id: string }): string {
  const [sec, ...rest] = e.group.split('.');
  if (sec === 'joint') {
    const m = /^(.+)_([xyz])$/.exec(e.id);
    if (!m || !JOINT_SET.has(m[1]!) || rest.length === 0) throw new Error(`${e.group} ${e.id}: not a joint axis`);
    return `${BAKE_BASE_FILE}: joints.${rest.join('.')}.${m[1]}[${AXIS[m[2]!]}] + (deg, wrapped)`;
  }
  if (sec === 'hand' || sec === 'weapon') {
    const i = HP[e.id];
    if (i === undefined || rest.length < 2) throw new Error(`${e.group} ${e.id}: not a hand / weapon param`);
    const u = HAND_PARAMS[i]!.unit;
    return `${BAKE_BASE_FILE}: hands.${rest[0]}.${rest.slice(1).join('.')}.${e.id} ${u === 'x' ? 'x' : u === 'mode' ? '= (when not 0)' : '+'}`;
  }
  if (sec === 'ik') {
    const l = (IK_LIMBS as readonly string[]).indexOf(e.id);
    if (l < 0 || rest.length === 0) throw new Error(`${e.group} ${e.id}: not an IK limb`);
    return `${BAKE_BASE_FILE}: ik.${rest.join('.')}[${l}] x (clamped 0..1)`;
  }
  if (sec === 'gear') {
    const p = GP[e.id];
    const row = rest.join('.');
    if (p === undefined || !GEAR_ROW_SET.has(row)) throw new Error(`${e.group} ${e.id}: not a gear socket param`);
    return `${BAKE_BASE_FILE}: gear.${row}.${e.id} + (${GEAR_PARAMS[p]!.unit}${p >= 3 ? ', wrapped' : ''})`;
  }
  throw new Error(`${e.group} ${e.id}: not a base table section`);
}

/**
 * The base table with the entries composed in (A1): joint degrees add, then wrap to -180..180; hand / weapon offsets
 * add, the gun scale multiplies, the trigger mode is the entry's when not 0 else the base's; IK strengths multiply,
 * clamped 0..1. Each result rounded as printed. Returns a new object; `base` is untouched. Throws for an entry it cannot
 * place.
 */
export function applyBaseEntries(base: AnimBaseData, entries: readonly BaseEntry[]): AnimBaseData {
  const b = JSON.parse(JSON.stringify(base)) as AnimBaseData;
  for (const e of entries) {
    baseTarget(e); // validates
    const [sec, ...rest] = e.group.split('.');
    if (sec === 'joint') {
      const m = /^(.+)_([xyz])$/.exec(e.id)!;
      const row = (b.joints[rest.join('.')] ??= {});
      const t = (row[m[1]!] ??= [0, 0, 0]);
      const a = AXIS[m[2]!]!;
      t[a] = round(wrapDeg((t[a] ?? 0) + e.value));
    } else if (sec === 'hand' || sec === 'weapon') {
      const i = HP[e.id]!;
      const row = ((b.hands[rest[0]!] ??= {})[rest.slice(1).join('.')] ??= {});
      const old = row[e.id] ?? HAND_PARAMS[i]!.def;
      row[e.id] = round(handCompose(i, old, e.value));
    } else if (sec === 'gear') {
      // (anim-gear) offsets add (angles wrapped to -180..180)
      const p = GP[e.id]!;
      const row = ((b.gear ??= {})[rest.join('.')] ??= {});
      const v = (row[e.id] ?? 0) + e.value;
      row[e.id] = round(p >= 3 ? wrapDeg(v) : v);
    } else {
      const l = (IK_LIMBS as readonly string[]).indexOf(e.id);
      const t = (b.ik[rest.join('.')] ??= [1, 1, 1, 1]);
      t[l] = round(Math.max(0, Math.min(1, (t[l] ?? 1) * e.value)));
    }
  }
  return b;
}
