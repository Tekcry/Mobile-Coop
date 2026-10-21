/**
 * (anim-joints J1, COVERAGE gap 1) The bake's base table target: Joints, Hands & feet, IK strength and Weapon values of a
 * tuner export go into the generated `src/anim/animBase.ts` (A4), composed onto what is there by the A1 rules (the same
 * rules the runtime uses for base + delta: `wrapDeg`, `handCompose`, IK multiplied and clamped). Pure: no fs, no
 * Babylon. Keyed by row id, joint name and param id, never by index; the printed text is deterministic (sorted keys,
 * one row per line, about 4 significant digits, identity values dropped), so a re-bake of identity gives the same text.
 * (anim-gear) The Gear section (`gear.<socket>`, `gear.<socket>.crouch`) bakes into the table's `gear` key (offsets
 * add, angles wrapped), printed only when a row has an offset: a table without gear prints exactly as before.
 * (anim-bake-targets, BT-A1 / A3) The Body section's sliders without a code value of their own (`tune.ts`
 * BODY_BASE_FIELDS; every Body slider and group no rule in `tuneBakeTable.ts` covers) bake into the `body` key: row = the
 * Body group id, param = the slider id, mul sliders multiply, add sliders add; printed only when a row is set.
 * (anim-bake-all, BA-A1) Every other slider with no code value of its own bakes into the generic `sections` key
 * (section id -> group -> slider id -> value; mul multiplies, add adds, identity dropped), which the registry composes
 * with the tuner's value for every consumer (`tuneRegistry.ts` `eff`); printed only when a value is set.
 */
import type { AnimBaseData } from './animBase';
import { HAND_PARAMS, HP, IK_LIMBS, handCompose } from './tuneHands';
import { JOINTS, wrapDeg } from './tuneJoints';
import { GEAR_PARAMS, GEAR_ROWS, GP } from './tuneGear';
import { BODY_BASE_FIELDS, BODY_GROUPS, bodyCompose, tunable, type BodyField } from './tune';

/** The generated file. */
export const BAKE_BASE_FILE = 'src/anim/animBase.ts';
/** The sections that bake into it (`joint.options`, the mirror lock, stays manual). */
export const BAKE_BASE_SECTIONS: readonly string[] = ['joint', 'hand', 'ik', 'weapon', 'gear', 'body'];
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
  // (anim-bake-targets) likewise the Body base
  if (j.body) b.body = j.body;
  // (anim-bake-all) and the generic table
  if (j.sections) b.sections = j.sections;
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
  // (anim-bake-targets) row -> Body slider id -> value (identity dropped); the key only when a row is set
  const body: string[] = [];
  const bd = b.body ?? {};
  for (const r of keys(bd)) {
    const row = bd[r]!;
    const parts: string[] = [];
    for (const id of keys(row)) {
      const v = round(row[id]!);
      if (v === bodyDef(id)) continue;
      parts.push(`${q(id)}: ${bakeFmt(v)}`);
    }
    if (parts.length) body.push(`    ${q(r)}: { ${parts.join(', ')} }`);
  }
  // (anim-bake-all) section -> group -> slider id -> value (one group per line); the key only when a value is set
  const secs: string[] = [];
  const sc = b.sections ?? {};
  for (const s of keys(sc)) {
    const rows: string[] = [];
    for (const g of keys(sc[s]!)) {
      const row = sc[s]![g]!;
      const parts = keys(row).map((id) => `${q(id)}: ${bakeFmt(round(row[id]!))}`);
      if (parts.length) rows.push(`      ${q(g)}: { ${parts.join(', ')} }`);
    }
    if (rows.length) secs.push(`    ${q(s)}: {\n${rows.join(',\n')}\n    }`);
  }
  const block = (name: string, lines: string[]): string => (lines.length ? `  ${q(name)}: {\n${lines.join(',\n')}\n  }` : `  ${q(name)}: {}`);
  const tail = (gear.length ? `,\n${block('gear', gear)}` : '') + (body.length ? `,\n${block('body', body)}` : '') + (secs.length ? `,\n${block('sections', secs)}` : '');
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
  /** The registry section (the Body section's groups have no prefix). */
  readonly section?: string;
  readonly group: string;
  readonly id: string;
  readonly value: number;
}

const AXIS: Readonly<Record<string, number>> = { x: 0, y: 1, z: 2 };
const JOINT_SET = new Set<string>(JOINTS);
const GEAR_ROW_SET = new Set<string>(GEAR_ROWS);
const BODY_ROW_SET = new Set<string>(BODY_GROUPS);
const BODY_FIELD_SET = new Set<string>(BODY_BASE_FIELDS);
/** A Body base param's identity (1 for mul, 0 for add; an unknown id 0). */
const bodyDef = (id: string): number => (BODY_FIELD_SET.has(id) ? tunable(id as BodyField).def : 0);

/** Where an entry goes in the base table and how (the bake's target column). Throws for an entry it cannot place. */
export function baseTarget(e: { section?: string; group: string; id: string }): string {
  if (e.section === 'body') {
    if (!BODY_ROW_SET.has(e.group) || !BODY_FIELD_SET.has(e.id)) throw new Error(`${e.group} ${e.id}: not a Body base param (it has a code rule or is unknown)`);
    return `${BAKE_BASE_FILE}: body.${e.group}.${e.id} ${tunable(e.id as BodyField).kind === 'mul' ? 'x' : '+'}`;
  }
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
    if (e.section === 'body') {
      // (anim-bake-targets) mul sliders multiply, add sliders add (as bodyRigBegin composes base and tuner)
      const row = ((b.body ??= {})[e.group] ??= {});
      const id = e.id as BodyField;
      row[id] = round(bodyCompose(id, row[id] ?? tunable(id).def, e.value));
    } else if (sec === 'joint') {
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

// ------------------------------------------------------------------------------------------
// (anim-bake-all, BA-A1) The generic table: `sections.<section>.<group>.<id>`
// ------------------------------------------------------------------------------------------

/** Sections that never bake into the generic table (their own base keys, or the Keys section's key JSONs). */
export const GENERIC_REFUSED: readonly string[] = ['joint', 'hand', 'ik', 'weapon', 'gear', 'keys'];

export interface SectionEntry {
  readonly section: string;
  readonly group: string;
  readonly id: string;
  readonly value: number;
  /** The slider's kind and identity (a mul 1, an add 0). */
  readonly kind: 'mul' | 'add';
  readonly def: number;
}

/** Where a generic entry goes (the bake's target column). Throws for an entry it cannot place. */
export function sectionTarget(e: Omit<SectionEntry, 'value'>): string {
  if (GENERIC_REFUSED.includes(e.section)) throw new Error(`${e.section} ${e.group} ${e.id}: the ${e.section} section has its own base key`);
  if (e.section === 'body' && BODY_FIELD_SET.has(e.id)) throw new Error(`${e.group} ${e.id}: a Body base param bakes into the body key`);
  if (e.def !== (e.kind === 'mul' ? 1 : 0)) throw new Error(`${e.section} ${e.group} ${e.id}: the default ${e.def} is not identity`);
  for (const k of [e.section, e.group, e.id]) if (k === '__proto__' || k === 'constructor' || k === 'prototype' || k === '') throw new Error(`${e.section} ${e.group} ${e.id}: not a key`);
  return `${BAKE_BASE_FILE}: sections.${e.section}.${e.group}.${e.id} ${e.kind === 'mul' ? 'x' : '+'}`;
}

/**
 * The base table with the generic entries composed in: a mul slider's value multiplies the base, an add slider's adds
 * (as the registry composes `eff`), rounded as printed; a result at identity is dropped (and an emptied group or
 * section with it). Returns a new object; `base` is untouched. Throws for an entry it cannot place.
 */
export function applySectionEntries(base: AnimBaseData, entries: readonly SectionEntry[]): AnimBaseData {
  const b = JSON.parse(JSON.stringify(base)) as AnimBaseData;
  for (const e of entries) {
    sectionTarget(e); // validates
    const sec = ((b.sections ??= {})[e.section] ??= {});
    const row = (sec[e.group] ??= {});
    const old = row[e.id] ?? e.def;
    const v = round(e.kind === 'mul' ? old * e.value : old + e.value);
    if (v === e.def) delete row[e.id];
    else row[e.id] = v;
    if (Object.keys(row).length === 0) delete sec[e.group];
    if (Object.keys(sec).length === 0) delete b.sections![e.section];
  }
  if (b.sections && Object.keys(b.sections).length === 0) delete b.sections;
  return b;
}
