/**
 * (marlow-bays item 24, track A) The bake's guard base table target: Guard joints, Guard stepping and Guard weight
 * values of a tuner export go into the generated `src/anim/animBaseGuard.ts`, composed onto what is there by the same
 * rules the guard rigs use for base + delta (`tuneGuard.ts`): joint degrees add (wrapped to -180..180), stepping
 * multipliers multiply, weight multipliers multiply and amounts add. Its own file and markers, so an export with no
 * guard rows never touches it, and Wren's table (`animBase.ts`, `tuneBakeBase.ts`) never takes a guard row. Pure: no
 * fs, no Babylon. The printed text is deterministic (sorted keys, one row per line, about 4 significant digits,
 * identity dropped).
 */
import type { AnimBaseGuardData } from './animBaseGuard';
import { bakeFmt, type BaseEntry } from './tuneBakeBase';
import { GUARD_ROWS, GUARD_WEIGHT_IDS } from './tuneGuard';
import { JOINTS, wrapDeg } from './tuneJoints';
import { STEP_GAITS, STEP_PARAMS } from './tuneStep';
import { WEIGHT_TUNABLES } from './weight';

/** The generated guard file. */
export const BAKE_GUARD_FILE = 'src/anim/animBaseGuard.ts';
/** The sections that bake into it. */
export const BAKE_GUARD_SECTIONS: readonly string[] = ['guardJoint', 'guardStep', 'guardWeight'];
export const GUARD_BEGIN = '// @anim-base-guard-begin';
export const GUARD_END = '// @anim-base-guard-end';

export const emptyGuardBase = (): AnimBaseGuardData => ({ version: 1, joints: {}, step: {}, weight: {} });

const round = (v: number): number => Number(bakeFmt(v));
const keys = (o: object): string[] => Object.keys(o).sort();
const AXIS: Readonly<Record<string, number>> = { x: 0, y: 1, z: 2 };
const JOINT_SET = new Set<string>(JOINTS);
const ROW_SET = new Set<string>(GUARD_ROWS);
const GAIT_SET = new Set<string>(STEP_GAITS);
const STEP_SET = new Set<string>(STEP_PARAMS.map((p) => p.id));
const WEIGHT_DEF = new Map(WEIGHT_TUNABLES.map((t) => [t.id as string, t]));

function span(text: string): [number, number] {
  const a = text.indexOf(GUARD_BEGIN);
  const b = text.indexOf(GUARD_END);
  if (a < 0 || b < 0 || b < a || text.indexOf(GUARD_BEGIN, a + 1) >= 0 || text.indexOf(GUARD_END, b + 1) >= 0) throw new Error(`${BAKE_GUARD_FILE}: the ${GUARD_BEGIN} / ${GUARD_END} lines must be there once each, in order`);
  return [text.indexOf('\n', a) + 1, text.lastIndexOf('\n', b) + 1];
}

/** Parse the guard base table out of the file's text. Throws with the reason. */
export function parseAnimBaseGuard(text: string): AnimBaseGuardData {
  const [s, e] = span(text);
  const j = JSON.parse(text.slice(s, e)) as Partial<AnimBaseGuardData>;
  if (!j || typeof j !== 'object' || j.version !== 1) throw new Error(`${BAKE_GUARD_FILE}: not a version 1 guard base table`);
  return { version: 1, joints: j.joints ?? {}, step: j.step ?? {}, weight: j.weight ?? {} };
}

/** The JSON text of a guard base table. */
export function printAnimBaseGuard(b: AnimBaseGuardData): string {
  const q = JSON.stringify;
  const joints: string[] = [];
  for (const r of keys(b.joints)) {
    const row = b.joints[r]!;
    const parts: string[] = [];
    for (const j of keys(row)) {
      const t = [0, 1, 2].map((a) => round(wrapDeg(row[j]![a] ?? 0)));
      if (t.every((x) => x === 0)) continue;
      parts.push(`${q(j)}: [${t.map(bakeFmt).join(', ')}]`);
    }
    if (parts.length) joints.push(`    ${q(r)}: { ${parts.join(', ')} }`);
  }
  const flat = (src: Record<string, Record<string, number>>, def: (id: string) => number): string[] => {
    const out: string[] = [];
    for (const r of keys(src)) {
      const row = src[r]!;
      const parts: string[] = [];
      for (const id of keys(row)) {
        const v = round(row[id]!);
        if (v === def(id)) continue;
        parts.push(`${q(id)}: ${bakeFmt(v)}`);
      }
      if (parts.length) out.push(`    ${q(r)}: { ${parts.join(', ')} }`);
    }
    return out;
  };
  const step = flat(b.step, () => 1);
  const weight = flat(b.weight, (id) => WEIGHT_DEF.get(id)?.def ?? 0);
  const block = (name: string, lines: string[]): string => (lines.length ? `  ${q(name)}: {\n${lines.join(',\n')}\n  }` : `  ${q(name)}: {}`);
  return `{\n  "version": 1,\n${block('joints', joints)},\n${block('step', step)},\n${block('weight', weight)}\n}\n`;
}

/** The guard file's text with the JSON between its markers replaced (the rest and the line ends kept). */
export function spliceAnimBaseGuard(text: string, b: AnimBaseGuardData): string {
  const [s, e] = span(text);
  const crlf = text.includes('\r\n');
  const json = printAnimBaseGuard(b);
  return text.slice(0, s) + (crlf ? json.replace(/\n/g, '\r\n') : json) + text.slice(e);
}

/** Where a guard entry goes in the guard table and how (the bake's target column). Throws for one it cannot place. */
export function guardBaseTarget(e: { group: string; id: string }): string {
  const [g, sec, ...rest] = e.group.split('.');
  const row = rest.join('.');
  if (g === 'guard' && sec === 'joint') {
    const m = /^(.+)_([xyz])$/.exec(e.id);
    if (!m || !JOINT_SET.has(m[1]!) || !ROW_SET.has(row)) throw new Error(`${e.group} ${e.id}: not a guard joint axis`);
    return `${BAKE_GUARD_FILE}: joints.${row}.${m[1]}[${AXIS[m[2]!]}] + (deg, wrapped)`;
  }
  if (g === 'guard' && sec === 'step') {
    if (!GAIT_SET.has(row) || !STEP_SET.has(e.id)) throw new Error(`${e.group} ${e.id}: not a guard stepping param`);
    return `${BAKE_GUARD_FILE}: step.${row}.${e.id} x`;
  }
  if (g === 'guard' && sec === 'weight') {
    const t = WEIGHT_DEF.get(e.id);
    if (!t || !GUARD_WEIGHT_IDS.includes(e.id) || !ROW_SET.has(row)) throw new Error(`${e.group} ${e.id}: not a guard weight slider`);
    return `${BAKE_GUARD_FILE}: weight.${row}.${e.id} ${t.kind === 'mul' ? 'x' : '+'}`;
  }
  throw new Error(`${e.group} ${e.id}: not a guard table section`);
}

/** The guard table with the entries composed in, each result rounded as printed. Returns a new object. */
export function applyGuardBaseEntries(base: AnimBaseGuardData, entries: readonly BaseEntry[]): AnimBaseGuardData {
  const b = JSON.parse(JSON.stringify(base)) as AnimBaseGuardData;
  for (const e of entries) {
    guardBaseTarget(e); // validates
    const [, sec, ...rest] = e.group.split('.');
    const row = rest.join('.');
    if (sec === 'joint') {
      const m = /^(.+)_([xyz])$/.exec(e.id)!;
      const t = ((b.joints[row] ??= {})[m[1]!] ??= [0, 0, 0]);
      const a = AXIS[m[2]!]!;
      t[a] = round(wrapDeg((t[a] ?? 0) + e.value));
    } else if (sec === 'step') {
      const r = (b.step[row] ??= {});
      r[e.id] = round((r[e.id] ?? 1) * e.value);
    } else {
      const t = WEIGHT_DEF.get(e.id)!;
      const r = (b.weight[row] ??= {});
      const old = r[e.id] ?? t.def;
      r[e.id] = round(t.kind === 'mul' ? old * e.value : old + e.value);
    }
  }
  return b;
}
