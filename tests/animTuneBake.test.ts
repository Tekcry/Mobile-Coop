// (anim-bake) The bake of a tuner export into the code defaults: the table covers every slider, every target is found
// exactly once, a sample export baked into temp copies (never the real tree), refusals, shared targets, the re-run
// no-op and the Keys section through the apply-tune functions.
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import '../src/player/weightTune';
import '../src/anim/tuneV2Sections';
import '../src/anim/tuneKeys';
import { TUNE_SECTIONS } from '../src/anim/tuneRegistry';
import { SPEED_SECTION } from '../src/player/speedTune';
import { WEIGHT_GROUPS, WEIGHT_TUNABLES } from '../src/anim/weight';
import { bakeCatalogue, bakeDiff, bakeFmt, bakeTable, editValue, locate, tuneBake, wideRange, type BakeResult } from '../src/anim/tuneBake';
import { BAKE_CATALOGUE_MODULES, BAKE_LEDGER, BAKE_MANUAL, BAKE_OTHER_SECTION_FILES, BAKE_RULES, DECLARED_SECTIONS, type BakeRule } from '../src/anim/tuneBakeTable';
import { readKeys, type KeyFile } from '../src/anim/tuneKeysFile';
import { BAKE_BASE_FILE, BAKE_BASE_SECTIONS, parseAnimBase, sectionTarget } from '../src/anim/tuneBakeBase';
import { BAKE_GUARD_FILE, BAKE_GUARD_SECTIONS } from '../src/anim/tuneBakeGuard';
import { BODY_BASE_FIELDS, type BodyField } from '../src/anim/tune';
import { WREN_TUCK, wrenTuckMul } from '../src/anim/animGraph';

const ROOT = path.join(__dirname, '..');
const real = (p: string): string => readFileSync(path.join(ROOT, p), 'utf8');

/** (fix round S4) Every file under src/ that registers a tuner section (the registry itself excepted). */
function registeringFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const d of readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${d.name}`;
      if (d.isDirectory()) walk(rel);
      else if (d.name.endsWith('.ts') && rel !== 'src/anim/tuneRegistry.ts' && /registerTuneSection\s*[<(]/.test(real(rel))) out.push(rel);
    }
  };
  walk('src');
  return out.sort();
}
const SECTION_FILES = registeringFiles();
// load them all, so a section a new file registers is in TUNE_SECTIONS and the coverage test sees it
for (const f of SECTION_FILES) await import(/* @vite-ignore */ pathToFileURL(path.join(ROOT, f)).href);

/** The catalogue as the script builds it (the loadable sections, weight from weight.ts, speed declared). */
const SCRIPT_CAT = bakeCatalogue([
  ...TUNE_SECTIONS.filter((s) => s.id !== 'keys' && s.id !== 'speed' && s.id !== 'weight'),
  { id: 'weight', tunables: WEIGHT_TUNABLES.map((t) => ({ ...t, groups: WEIGHT_GROUPS })) },
  ...DECLARED_SECTIONS,
]);
/** The catalogue straight from the registry. */
const CAT = bakeCatalogue(TUNE_SECTIONS.filter((s) => s.id !== 'keys'));

const TABLE_FILES = [...new Set(BAKE_RULES.flatMap((r) => r.edits.map((e) => e.file)))];
const dirs: string[] = [];
/** A temp copy of every file the table names plus the walk key JSON; read / write inside it only. */
function tempTree(): { dir: string; read: (p: string) => string | null; write: (r: BakeResult) => void } {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'anim-bake-'));
  dirs.push(dir);
  for (const f of [...TABLE_FILES, BAKE_BASE_FILE, BAKE_GUARD_FILE, 'scripts/anim-keys/keys/walk.json']) {
    mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    cpSync(path.join(ROOT, f), path.join(dir, f));
  }
  const read = (p: string): string | null => (existsSync(path.join(dir, p)) ? readFileSync(path.join(dir, p), 'utf8') : null);
  const write = (r: BakeResult): void => {
    for (const w of r.writes) {
      mkdirSync(path.dirname(path.join(dir, w.path)), { recursive: true });
      writeFileSync(path.join(dir, w.path), w.after);
    }
  };
  return { dir, read, write };
}
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

const entry = (group: string, id: string, kind: 'mul' | 'add', value: number) => ({ group, id, label: id, kind, unit: '', value, default: kind === 'mul' ? 1 : 0 });
const exportOf = (changed: unknown[], exported = '2026-10-21T10:00:00.000Z') => ({ magic: 'night-shift-anim-tune', version: 1, exported, changed, log: [] });
const WEIGHT5 = ['weight.walk', 'weight.jog', 'weight.run', 'weight.crouch', 'weight.drawn'];

/** One slider (or more) per section. */
const SAMPLE = exportOf([
  entry('wallPeek', 'peekLeanMul', 'mul', 1.5), // body: per state
  entry('walk', 'trackMul', 'mul', 1.2), // body: (anim-bake-targets) the base table's body key
  entry('rifle.lowReady', 'gunFwd', 'add', 0.02), // gun: per weapon x state
  entry('cam.climb', 'camBoomAdd', 'add', 0.3), // cam: every climb preset
  entry('cam.wall', 'camPivotAdd', 'add', 0.1), // cam: shared by wall and peek, equal: baked
  entry('cam.peek', 'camPivotAdd', 'add', 0.1),
  entry('spd.stand', 'runMul', 'mul', 1.1), // speed
  entry('spd.aim', 'glideFwdMul', 'mul', 1.2), // manual (fix round B2)
  entry('spd.aim', 'glideStrafeMul', 'mul', 0.8),
  entry('spd.climb', 'ladderMul', 'mul', 1.2), // a NAME * n form
  entry('joint.walk', 'elbowR_x', 'add', 5), // joints: the base table (anim-joints J1)
  entry('hand.rifle.aim', 'handLFwd', 'add', 0.01), // hands & feet: the base table
  entry('ik.walk', 'handL', 'mul', 0.5), // IK: the base table
  entry('weapon.rifle.aim', 'gunScale', 'mul', 1.1), // weapon: the base table
  entry('step.idle', 'lift', 'mul', 1.4), // stepping
  entry('step.jog', 'turnTwist', 'mul', 1.2), // (anim-natural N1) stepping: a per gait table entry
  entry('key.walk.0', 'spine_pitch', 'add', 2), // keys
  ...WEIGHT5.map((g) => entry(g, 'startMul', 'mul', 1.2)), // weight: shared by every group, equal
  entry('weight.walk', 'chestHzMul', 'mul', 1.3), // weight: shared, one group: manual
]);

const num = (text: string, p: string): number => Number(locate(text, p).text);

describe('anim-bake table', () => {
  it('knows every file that registers a section, and the script catalogue sees every registered section', () => {
    expect(SECTION_FILES.length).toBeGreaterThanOrEqual(5);
    for (const f of SECTION_FILES) expect(BAKE_CATALOGUE_MODULES.includes(f) || f in BAKE_OTHER_SECTION_FILES, `${f}: add it to BAKE_CATALOGUE_MODULES or BAKE_OTHER_SECTION_FILES`).toBe(true);
    for (const s of TUNE_SECTIONS) if (s.id !== 'keys') expect(SCRIPT_CAT.bySection.has(s.id), `section ${s.id}`).toBe(true);
  });

  it('covers every slider of every section and group (a rule, a pure option, a base key or the generic table); manual = pure options only', () => {
    // (anim-bake-all) BAKE_MANUAL holds the pure options only (the Joints mirror lock; the Keys Mirror box is built in)
    expect(BAKE_MANUAL.map((m) => `${m.section}.${m.id}`)).toEqual(['joint.mirror']);
    for (const s of TUNE_SECTIONS) {
      if (s.id === 'keys') continue;
      for (const t of s.tunables) {
        for (const g of t.groups) {
          const r = BAKE_RULES.some((x) => x.section === s.id && x.id === t.id && x.groups.includes(g));
          const m = BAKE_MANUAL.filter((x) => x.section === s.id && (x.id === t.id || x.id === '*') && (x.groups ? x.groups.includes(g) : !r));
          // (anim-joints J1) Joints, Hands & feet, IK and Weapon bake into the base table (no rule; joint.options manual)
          // (anim-bake-targets) and every Body slider and group no rule covers (the `body` key);
          // (item 24, track A) the guard sections bake into the guard base table the same way
          const guard = BAKE_GUARD_SECTIONS.includes(s.id);
          const base = (BAKE_BASE_SECTIONS.includes(s.id) || guard) && !r && m.length === 0
            && (s.id !== 'body' || BODY_BASE_FIELDS.includes(t.id as BodyField));
          // (anim-bake-all) anything else: the generic table (a section with no base key of its own, or Body's strideMul);
          // a guard section never reaches it (the guard table takes every guard row) and the generic target refuses one
          // (clip-speed, track A) every Clip speed slider has its code rule (never the generic table, which it does not read)
          // (anim-n4) and every Holds and carries slider its CQ_GAIT rule
          if (s.id === 'clip' || s.id === 'cq') expect(r, `${s.id} ${t.id} ${g}: a ${s.id} slider has a code rule`).toBe(true);
          if (guard) expect(r, `${s.id} ${t.id} ${g}: a guard section has no code rule`).toBe(false);
          if (guard || s.id === 'clip' || s.id === 'cq') expect(() => sectionTarget({ section: s.id, group: g, id: t.id, kind: t.kind, def: t.def }), `${s.id} ${t.id} ${g}: never the generic table`).toThrow();
          let generic = false;
          if (!r && !base && m.length === 0) {
            expect(() => sectionTarget({ section: s.id, group: g, id: t.id, kind: t.kind, def: t.def }), `${s.id} ${t.id} ${g}`).not.toThrow();
            generic = true;
          }
          expect(r || m.length > 0 || base || generic, `${s.id} ${t.id} ${g}`).toBe(true);
          if (BAKE_BASE_SECTIONS.includes(s.id) && s.id !== 'body') expect(r, `${s.id} ${t.id} ${g}: a base table section has no code rule`).toBe(false);
          if (s.id !== 'joint') expect(m.length, `${s.id} ${t.id} ${g}: only the Joints mirror lock is manual`).toBe(0);
          if (r) expect(BAKE_MANUAL.some((x) => x.section === s.id && x.id === t.id && x.groups?.includes(g)), `${s.id} ${t.id} ${g}: rule and manual`).toBe(false);
        }
      }
    }
    // (anim-bake-all, BA-A2) strideMul has no code rule: the 13 moving states bake apart
    expect(BAKE_RULES.some((x) => x.id === 'strideMul')).toBe(false);
  });

  it('names only real sliders and groups, with ops that fit the slider kind', () => {
    for (const r of BAKE_RULES) {
      const t = CAT.bySection.get(r.section)?.get(r.id);
      expect(t, `${r.section} ${r.id}`).toBeDefined();
      for (const g of r.groups) expect(t!.groups.includes(g), `${r.section} ${r.id} ${g}`).toBe(true);
      for (const e of r.edits) expect(t!.kind === 'mul' ? e.op === 'mul' || e.op === 'div' : e.op === 'add' || e.op === 'sub', `${r.id} ${e.path}`).toBe(true);
    }
    for (const m of BAKE_MANUAL) if (m.id !== '*') expect(CAT.bySection.get(m.section)?.get(m.id), `${m.section} ${m.id}`).toBeDefined();
  });

  it('finds every target exactly once in the real tree, in a form it can edit', () => {
    for (const r of BAKE_RULES) {
      for (const e of r.edits) {
        const text = real(e.file);
        const at = locate(text, e.path);
        expect(() => editValue(at.text, [{ op: e.op, v: e.op === 'mul' || e.op === 'div' ? 1.1 : 0.01 }]), `${e.file} ${e.path}`).not.toThrow();
      }
    }
  });

  it('declares the sections plain Node cannot load as the registry has them (speed, the moveTune sections; weight from weight.ts)', () => {
    for (const id of ['speed', 'weight', 'team_boost', 'team_relay', 'team_throw', 'team_hang', 'team_rope', 'team_revive', 'trav']) {
      const a = SCRIPT_CAT.bySection.get(id)!;
      const b = CAT.bySection.get(id)!;
      expect([...a.keys()].sort()).toEqual([...b.keys()].sort());
      for (const [k, t] of a) {
        const u = b.get(k)!;
        expect([t.kind, t.def, t.min, t.max, [...t.groups]], `${id} ${k}`).toEqual([u.kind, u.def, u.min, u.max, [...u.groups]]);
      }
    }
    expect(SPEED_SECTION.tunables.length).toBe(DECLARED_SECTIONS[0]!.tunables.length);
  });
});

describe('anim-bake locate / edit', () => {
  const SRC = [
    '// const FOO = 9 (a comment)',
    'export const FOO = { a: 1.5, b: [0.85, 1.3, 2.6], "c": { d: -0.02 }, s: \'x, y\', e: NAME * 0.3, f: OTHER.h - 0.07, g: OTHER.k }; // tail',
    'const BAR = 0.0;',
    'export const TYPED: Record<string, { v: number }> = { one: { v: 2 } };',
  ].join('\n');

  it('walks object keys, array indexes and type annotations, skipping comments and strings', () => {
    expect(locate(SRC, 'FOO.a').text).toBe('1.5');
    expect(locate(SRC, 'FOO.b[2]').text).toBe('2.6');
    expect(locate(SRC, 'FOO.c.d').text).toBe('-0.02');
    expect(locate(SRC, 'FOO.e').text).toBe('NAME * 0.3');
    expect(locate(SRC, 'BAR').text).toBe('0.0');
    expect(locate(SRC, 'TYPED.one.v').text).toBe('2');
    expect(() => locate(SRC, 'FOO.zz')).toThrow(/found 0 times/);
    expect(() => locate(SRC, 'NOPE')).toThrow(/found 0 times/);
    expect(() => locate(`${SRC}\nfunction f() { const BAR = 1; }`, 'BAR')).toThrow(/found 2 times/);
    expect(() => locate(SRC, 'FOO.b[5]')).toThrow(/out of 3/);
  });

  it('edits literals and the simple forms, about 4 significant digits', () => {
    expect(editValue('1.5', [{ op: 'mul', v: 1.1 }])).toBe('1.65');
    expect(editValue('0.5', [{ op: 'div', v: 1.2 }])).toBe('0.4167');
    expect(editValue('-0.02', [{ op: 'add', v: 0.02 }])).toBe('0');
    expect(editValue('0.0', [{ op: 'add', v: 0 }])).toBe('0.0'); // unchanged text kept
    expect(editValue('NAME * 0.3', [{ op: 'mul', v: 1.2 }])).toBe('NAME * 0.36');
    expect(editValue('OTHER.h - 0.07', [{ op: 'add', v: 0.05 }])).toBe('OTHER.h - 0.02');
    expect(editValue('OTHER.h - 0.07', [{ op: 'add', v: 0.1 }])).toBe('OTHER.h + 0.03');
    expect(editValue('OTHER.k', [{ op: 'mul', v: 1.25 }])).toBe('OTHER.k * 1.25');
    expect(editValue('OTHER.k', [{ op: 'sub', v: 0.2 }])).toBe('OTHER.k - 0.2');
    expect(() => editValue('NAME * 0.3', [{ op: 'add', v: 1 }])).toThrow(/not a number literal/);
    expect(() => editValue('(18 * Math.PI) / 180', [{ op: 'mul', v: 2 }])).toThrow(/not a number literal/);
    expect(bakeFmt(1.4 * 1.07)).toBe('1.498');
    expect(bakeFmt(-0)).toBe('0');
  });

  it('diffs old line -> new line', () => {
    expect(bakeDiff('src/x.ts', 'a\nb: 1,\nc', 'a\nb: 2,\nc')).toBe('--- a/src/x.ts\n+++ b/src/x.ts\n@@ -2 +2 @@\n-b: 1,\n+b: 2,\n');
    expect(bakeDiff('k.json', 'a\nb\nc', 'a\nb\nx\nc')).toContain('+x');
  });
});

describe('anim-bake on a sample export (temp copies)', () => {
  it('dry run: the diff and the table, nothing written', () => {
    const t = tempTree();
    const r = tuneBake(SAMPLE, SCRIPT_CAT, t.read);
    expect(r.ok, r.error).toBe(true);
    expect(r.diff).toContain('-  peekLean: 0.2,\n+  peekLean: 0.3,');
    expect(r.diff).toContain('+  stand: [0.75, 1.4, 2.1, 3.0, 4.4],');
    expect(r.diff).toContain('speed: LADDER_RUNG_RATE * 0.36,');
    expect(r.diff).toContain(`--- a/${BAKE_LEDGER}`);
    const table = bakeTable(r.rows);
    expect(table.split('\n')[0]).toMatch(/^section\s+group\s+id\s+value\s+result\s+target$/);
    // the temp tree is untouched until the caller writes
    expect(t.read('src/player/wallController.ts')).toBe(real('src/player/wallController.ts'));
    expect(t.read(BAKE_LEDGER)).toBeNull();
  });

  it('writes the tuned values: old code value x or + the slider value, in the code units; identity after bake', () => {
    const t = tempTree();
    const old = (f: string): string => t.read(f)!;
    const before = Object.fromEntries(TABLE_FILES.map((f) => [f, old(f)]));
    const r = tuneBake(SAMPLE, SCRIPT_CAT, t.read, { now: new Date('2026-10-21T12:00:00Z') });
    expect(r.ok, r.error).toBe(true);
    t.write(r);
    const res = (g: string, id: string): string => r.rows.find((x) => x.group === g && x.id === id)!.result;
    const W = 'src/player/wallController.ts';
    const G = 'src/anim/animGraph.ts';
    const C = 'src/config/camera.ts';
    const M = 'src/config/movement.ts';
    const close = (a: number, b: number): void => expect(a).toBeCloseTo(b, 3);
    // body (mul), gun (add, metres), camera (add, metres) every climb preset, the shared wall pivot once
    close(num(old(W), 'WALL.peekLean'), num(before[W]!, 'WALL.peekLean') * 1.5);
    close(num(old(G), 'WREN_READY_LOW.z'), num(before[G]!, 'WREN_READY_LOW.z') + 0.02);
    // (anim-bake-1022) the guards' low ready is never a bake target
    expect(num(old(G), 'READY_POSES.low.z')).toBe(num(before[G]!, 'READY_POSES.low.z'));
    for (const p of ['hang', 'ladder', 'pipe', 'fence', 'rappel']) close(num(old(C), `ATTACH_FRAMING.${p}.boom`), num(before[C]!, `ATTACH_FRAMING.${p}.boom`) + 0.3);
    close(num(old(C), 'ATTACH_FRAMING.wall.pivot'), num(before[C]!, 'ATTACH_FRAMING.wall.pivot') + 0.1);
    // speed: the point; the aimed glide's strafe share (the glide forward scales the whole glide: no code value, the
    // generic table, anim-bake-all)
    close(num(old(M), 'GEARS.stand[4]'), num(before[M]!, 'GEARS.stand[4]') * 1.1);
    close(num(old(M), 'MOVEMENT.strafeMult'), num(before[M]!, 'MOVEMENT.strafeMult') * 0.8);
    expect(num(old(M), 'MOVEMENT.adsSpeed')).toBe(num(before[M]!, 'MOVEMENT.adsSpeed'));
    expect(num(old(M), 'ENEMY_MOTION.strafeMult')).toBe(num(before[M]!, 'ENEMY_MOTION.strafeMult'));
    expect(res('spd.aim', 'glideFwdMul')).toBe('baked (base table)');
    expect(r.rows.find((x) => x.id === 'glideFwdMul')!.target).toMatch(/^src\/anim\/animBase\.ts: sections\.speed\.spd\.aim\.glideFwdMul x/);
    expect(parseAnimBase(old(BAKE_BASE_FILE)).sections?.speed?.['spd.aim']?.glideFwdMul).toBe(1.2);
    expect(locate(old('src/player/attach.ts'), 'ATTACH.ladder.speed').text).toBe('LADDER_RUNG_RATE * 0.36');
    // stepping, weight (all five groups equal: once, not five times)
    close(num(old('src/anim/footPlanner.ts'), 'PLANNER.idleLift'), num(before['src/anim/footPlanner.ts']!, 'PLANNER.idleLift') * 1.4);
    // (anim-natural N1) the jog's turn step allowance: its own entry of the per gait table, the other gaits' kept
    close(num(old('src/anim/footPlanner.ts'), 'FOOT_TURN_STEP.twist[2]'), num(before['src/anim/footPlanner.ts']!, 'FOOT_TURN_STEP.twist[2]') * 1.2);
    expect(num(old('src/anim/footPlanner.ts'), 'FOOT_TURN_STEP.twist[3]')).toBe(num(before['src/anim/footPlanner.ts']!, 'FOOT_TURN_STEP.twist[3]'));
    expect(res('step.jog', 'turnTwist')).toBe('baked');
    close(num(old(M), 'CT.startTime'), num(before[M]!, 'CT.startTime') * 1.2);
    expect(num(old('src/anim/weight.ts'), 'WEIGHT_BASE.chestHz')).toBe(num(before['src/anim/weight.ts']!, 'WEIGHT_BASE.chestHz'));
    // results per section
    expect(res('wallPeek', 'peekLeanMul')).toBe('baked');
    // (anim-bake-targets) the base table's body key: the old base value x 1.2
    expect(res('walk', 'trackMul')).toBe('baked (base table)');
    expect(r.rows.find((x) => x.id === 'trackMul')!.target).toBe(`${BAKE_BASE_FILE}: body.walk.trackMul x`);
    expect(parseAnimBase(old(BAKE_BASE_FILE)).body?.walk?.trackMul).toBeCloseTo((parseAnimBase(real(BAKE_BASE_FILE)).body?.walk?.trackMul ?? 1) * 1.2, 6);
    for (const [g, id] of [
      ['joint.walk', 'elbowR_x'],
      ['hand.rifle.aim', 'handLFwd'],
      ['ik.walk', 'handL'],
      ['weapon.rifle.aim', 'gunScale'],
    ]) expect(res(g!, id!)).toBe('baked (base table)');
    // (anim-bake-all) a shared value whose groups differ: the shared constant stays, the state's value goes per state
    expect(res('weight.walk', 'chestHzMul')).toBe('baked (base table)');
    expect(r.rows.find((x) => x.id === 'chestHzMul')!.target).toMatch(/sections\.weight\.weight\.walk\.chestHzMul x \[per state: the shared src\/anim\/weight\.ts: WEIGHT_BASE\.chestHz x has differing groups \(weight\.walk 1\.3, weight\.jog 1, /);
    expect(parseAnimBase(old(BAKE_BASE_FILE)).sections?.weight?.['weight.walk']?.chestHzMul).toBe(1.3);
    expect(res('weight.jog', 'startMul')).toBe('baked');
    expect(res('key.walk.0', 'spine_pitch')).toMatch(/^baked \(key JSON/);
    // only the rows' files changed, the file's formatting kept (one line per edit)
    const w = r.writes.find((x) => x.path === W)!;
    expect(w.after.split('\n').length).toBe(w.before.split('\n').length);
    expect(r.writes.every((x) => x.path.startsWith('src/') || x.path.startsWith('scripts/anim-keys/keys/'))).toBe(true);
  });

  it('Keys: the key JSON gets the delta (the apply-tune functions) and the rebake command is printed', () => {
    const t = tempTree();
    const f = 'scripts/anim-keys/keys/walk.json';
    const before = JSON.parse(t.read(f)!) as KeyFile;
    const r = tuneBake(SAMPLE, SCRIPT_CAT, t.read, { only: ['keys'] });
    expect(r.ok, r.error).toBe(true);
    t.write(r);
    const after = JSON.parse(t.read(f)!) as KeyFile;
    const sp = (k: KeyFile): number => ((k.keys[0]!.spine as Record<string, number> | undefined)?.pitch ?? 0);
    expect(sp(after)).toBeCloseTo(sp(before) + 2, 6);
    expect(readKeys(after).length).toBe(readKeys(before).length);
    expect(r.rebake).toEqual(['node --import ./scripts/operators/ts-resolve.mjs scripts/anim-keys/build.mjs walk']);
    // --only keys: nothing else written
    expect(r.writes.map((x) => x.path).sort()).toEqual([BAKE_LEDGER, f].sort());
  });

  it('a re-run of the same export is a no-op (the ledger), and so is a re-export after the reset', () => {
    const t = tempTree();
    const r1 = tuneBake(SAMPLE, SCRIPT_CAT, t.read);
    t.write(r1);
    const r2 = tuneBake(SAMPLE, SCRIPT_CAT, t.read);
    expect(r2.ok).toBe(true);
    expect(r2.writes).toEqual([]);
    expect(r2.rows.find((x) => x.id === 'peekLeanMul')!.result).toMatch(/^already baked/);
    // (anim-bake-targets) the body key is in the ledger too
    expect(r2.rows.find((x) => x.id === 'trackMul')!.result).toMatch(/^already baked/);
    // (anim-bake-all) and the generic table
    expect(r2.rows.find((x) => x.id === 'glideFwdMul')!.result).toMatch(/^already baked/);
    const r3 = tuneBake(exportOf([]), SCRIPT_CAT, t.read);
    expect(r3.ok).toBe(true);
    expect(r3.writes).toEqual([]);
    expect(r3.rows).toEqual([]);
  });

  it('--only bakes the named sections; a later run bakes the rest of the same export', () => {
    const t = tempTree();
    const r1 = tuneBake(SAMPLE, SCRIPT_CAT, t.read, { only: ['speed'] });
    expect(r1.rows.every((x) => x.section === 'speed')).toBe(true);
    t.write(r1);
    const r2 = tuneBake(SAMPLE, SCRIPT_CAT, t.read);
    expect(r2.rows.find((x) => x.id === 'runMul')!.result).toMatch(/^already baked/);
    expect(r2.rows.find((x) => x.id === 'peekLeanMul')!.result).toBe('baked');
  });

  it('(fix round S3) a later export that still carries a baked value never bakes it twice', () => {
    const t = tempTree();
    const W = 'src/player/wallController.ts';
    const r1 = tuneBake(exportOf([entry('wallPeek', 'peekLeanMul', 'mul', 1.5)]), SCRIPT_CAT, t.read, { now: new Date('2026-10-21T12:00:00Z') });
    t.write(r1);
    const lean = num(t.read(W)!, 'WALL.peekLean');
    // Michael did not reset the slider and tuned one more: a new export, a new hash
    const r2 = tuneBake(exportOf([entry('wallPeek', 'peekLeanMul', 'mul', 1.5), entry('spd.wall', 'slideStandMul', 'mul', 1.2)], '2026-10-22T09:00:00.000Z'), SCRIPT_CAT, t.read);
    expect(r2.rows.find((x) => x.id === 'peekLeanMul')!.result).toBe('already baked (same value as the bake of 2026-10-21T12:00:00.000Z; reset this slider in the tuner)');
    expect(r2.rows.find((x) => x.id === 'slideStandMul')!.result).toBe('baked');
    t.write(r2);
    expect(num(t.read(W)!, 'WALL.peekLean')).toBe(lean);
    expect(num(t.read(W)!, 'WALL.slideStand')).toBeCloseTo(num(real(W), 'WALL.slideStand') * 1.2, 6);
    // the ledger keeps group|id=value
    // the ledger keeps group|id=value (marlow-bays T1a: a version 1 export gives the crouched peek, which shared the row, the same value)
    expect(JSON.parse(t.read(BAKE_LEDGER)!).bakes[0].baked).toEqual(['wallPeek|peekLeanMul=1.5', 'wallCrouchPeek|peekLeanMul=1.5']);
    // a different value for the same slider is a new tune: baked
    const r3 = tuneBake(exportOf([entry('wallPeek', 'peekLeanMul', 'mul', 1.1)]), SCRIPT_CAT, t.read);
    expect(r3.rows[0]!.result).toBe('baked');
  });
});

describe('anim-bake tuckMul per gun state (anim-bake-targets, BT-A2; was fix round B1)', () => {
  const RIG = 'src/player/characterRig.ts';
  const GRAPH = 'src/anim/animGraph.ts';
  const GUN6 = ['rifle.lowReady', 'rifle.aim', 'rifle.aimCrouch', 'pistol.lowReady', 'pistol.aim', 'pistol.aimCrouch'];
  const at = (g: string): [boolean, number, number] => [g.startsWith('pistol'), g.endsWith('lowReady') ? 0 : 1, g.endsWith('aimCrouch') ? 1 : 0];
  /** characterRig solveArm: max(AIM_ELBOW_TUCK x aimK, READY + (READY_CROUCH - READY) x cr), times WREN_TUCK on a Wren rig. */
  const tuck = (rig: string, graph: string, g: string): number => {
    const [pistol, aimK, cr] = at(g);
    const R = num(rig, 'READY_ELBOW_TUCK');
    const w = num(graph, `WREN_TUCK.${pistol ? 'pistol' : 'rifle'}.${aimK === 0 ? 'lowReady' : cr === 1 ? 'aimCrouch' : 'aim'}`);
    return Math.max(num(graph, 'AIM_ELBOW_TUCK') * aimK, R + (num(rig, 'READY_ELBOW_TUCK_CROUCH') - R) * cr) * w;
  };

  it('the six named constants (Michael\'s 2026-10-22 low readies baked, the aims 1); wrenTuckMul reads the one per steady state, exactly 1 untuned', () => {
    const want: Record<string, number> = { 'rifle.lowReady': 0.75, 'rifle.aim': 1, 'rifle.aimCrouch': 1, 'pistol.lowReady': 0, 'pistol.aim': 1, 'pistol.aimCrouch': 1 };
    const saved: Record<string, number> = {};
    for (const g of GUN6) {
      const [w, s] = g.split('.') as ['rifle' | 'pistol', 'lowReady' | 'aim' | 'aimCrouch'];
      expect(num(real(GRAPH), `WREN_TUCK.${w}.${s}`), g).toBe(want[g]);
      expect(WREN_TUCK[w][s], g).toBe(want[g]);
      const [pistol, aimK, cr] = at(g);
      expect(wrenTuckMul(pistol, aimK, cr), g).toBe(want[g]);
      saved[g] = WREN_TUCK[w][s];
      WREN_TUCK[w][s] = 1;
    }
    try {
      // untuned (every constant 1): exactly 1 at any blend, so the rig is bit-identical
      for (const pistol of [false, true]) for (const aimK of [0, 0.37, 1]) for (const cr of [0, 0.5, 1]) expect(wrenTuckMul(pistol, aimK, cr)).toBe(1);
    } finally {
      for (const g of GUN6) {
        const [w, s] = g.split('.') as ['rifle' | 'pistol', 'lowReady' | 'aim' | 'aimCrouch'];
        WREN_TUCK[w][s] = saved[g]!;
      }
    }
  });

  it('one gun state at 0.6: baked into its own constant only; the guards\' constants never move', () => {
    for (const g of GUN6) {
      const t = tempTree();
      const r = tuneBake(exportOf([entry(g, 'tuckMul', 'mul', 0.6)]), SCRIPT_CAT, t.read);
      expect(r.ok, r.error).toBe(true);
      expect(r.rows.find((x) => x.group === g)!.result, g).toBe('baked');
      t.write(r);
      const [rig0, graph0, rig1, graph1] = [real(RIG), real(GRAPH), t.read(RIG)!, t.read(GRAPH)!];
      for (const o of GUN6) expect(tuck(rig1, graph1, o), `${g} -> ${o}`).toBeCloseTo(tuck(rig0, graph0, o) * (o === g ? 0.6 : 1), 6);
      expect(num(graph1, 'AIM_ELBOW_TUCK')).toBe(num(graph0, 'AIM_ELBOW_TUCK'));
      expect(num(rig1, 'READY_ELBOW_TUCK')).toBe(num(rig0, 'READY_ELBOW_TUCK'));
      expect(num(rig1, 'READY_ELBOW_TUCK_CROUCH')).toBe(num(rig0, 'READY_ELBOW_TUCK_CROUCH'));
    }
  });
});

describe('anim-bake shared targets (anim-bake-all: groups that differ bake per state into the generic table)', () => {
  it('one group of a shared constant: per state into the generic table (the constant stays); --allow-shared bakes the constant and warns', () => {
    const t = tempTree();
    const C = 'src/config/camera.ts';
    const exp = exportOf([entry('cam.explore', 'camBoomAdd', 'add', 0.2)]);
    const r = tuneBake(exp, SCRIPT_CAT, t.read);
    expect(r.ok).toBe(true);
    expect(r.manual).toBe(0);
    expect(r.rows[0]!.result).toBe('baked (base table)');
    expect(r.rows[0]!.target).toMatch(/^src\/anim\/animBase\.ts: sections\.cam\.cam\.explore\.camBoomAdd \+ \[per state: the shared src\/config\/camera\.ts: CAMERA\.boomHip \+ has differing groups \(cam\.explore 0\.2, cam\.exploreCrouch 0, cam\.lowReady 0, cam\.hold 0\)\]$/);
    expect(r.writes.map((w) => w.path).sort()).toEqual([BAKE_BASE_FILE, BAKE_LEDGER].sort());
    t.write(r);
    expect(parseAnimBase(t.read(BAKE_BASE_FILE)!).sections).toEqual({ cam: { 'cam.explore': { camBoomAdd: 0.2 } } });
    expect(t.read(C)).toBe(real(C));
    const t2 = tempTree();
    const s = tuneBake(exp, SCRIPT_CAT, t2.read, { allowShared: true });
    expect(s.rows[0]!.result).toMatch(/^baked \(--allow-shared: changes cam\.explore, cam\.exploreCrouch, cam\.lowReady, cam\.hold/);
    expect(s.warnings.join('\n')).toMatch(/now applies to every state reading it/);
    t2.write(s);
    expect(num(t2.read(C)!, 'CAMERA.boomHip')).toBeCloseTo(num(real(C), 'CAMERA.boomHip') + 0.2, 6);
    expect(num(t2.read(C)!, 'CAMERA.boomOpen')).toBeCloseTo(num(real(C), 'CAMERA.boomOpen') + 0.2, 6);
  });

  it('every group equal: baked once into the code; two of four changed: both per state, and the slider\'s other rules wait too', () => {
    const t = tempTree();
    const C = 'src/config/camera.ts';
    const all = tuneBake(exportOf(['cam.explore', 'cam.exploreCrouch', 'cam.lowReady', 'cam.hold'].map((g) => entry(g, 'camSideAdd', 'add', 0.05))), SCRIPT_CAT, t.read);
    expect(all.rows.every((x) => x.result === 'baked')).toBe(true);
    expect(locate(all.writes.find((w) => w.path === C)!.after, 'CAMERA.shoulderHip').text).toBe(bakeFmt(num(real(C), 'CAMERA.shoulderHip') + 0.05));
    // exploreCrouch has its own rule (boomCrouchOpen) but shares boomHip: with explore at another value no code value moves
    const two = tuneBake(exportOf([entry('cam.explore', 'camBoomAdd', 'add', 0.2), entry('cam.exploreCrouch', 'camBoomAdd', 'add', 0.2)]), SCRIPT_CAT, t.read);
    expect(two.rows.every((x) => x.result === 'baked (base table)')).toBe(true);
    expect(two.writes.some((w) => w.path === C)).toBe(false);
    expect(parseAnimBase(two.writes.find((w) => w.path === BAKE_BASE_FILE)!.after).sections?.cam).toEqual({ 'cam.explore': { camBoomAdd: 0.2 }, 'cam.exploreCrouch': { camBoomAdd: 0.2 } });
  });

  // (anim-bake-all, BA-A2) strideMul: no shared MOVEMENT rule any more; each moving state bakes apart (one path)
  it('Body strideMul: each of the 13 moving states bakes apart into sections.body; MOVEMENT never moves', () => {
    const t = tempTree();
    const MOVING13 = ['walk', 'jog', 'run', 'sneak', 'crouchWalk', 'crouchRun', 'aim', 'aimCrouch', 'aimCrouchMove', 'wallSlide', 'wallCrouchSlide', 'hold', 'carry'];
    const M = 'src/config/movement.ts';
    const two = tuneBake(exportOf([entry('walk', 'strideMul', 'mul', 1.1), entry('jog', 'strideMul', 'mul', 1.2)]), SCRIPT_CAT, t.read);
    expect(two.ok, two.error).toBe(true);
    expect(two.manual).toBe(0);
    expect(two.rows.map((x) => x.target)).toEqual(['src/anim/animBase.ts: sections.body.walk.strideMul x [no code value of its own]', 'src/anim/animBase.ts: sections.body.jog.strideMul x [no code value of its own]']);
    expect(two.writes.some((w) => w.path === M)).toBe(false);
    // a version 2 export, every moving state at its own value
    const all = tuneBake({ ...exportOf(MOVING13.map((g, i) => entry(g, 'strideMul', 'mul', 0.82 + i * 0.05))), version: 2 }, SCRIPT_CAT, t.read);
    expect(all.rows.length).toBe(13);
    expect(all.rows.every((x) => x.result === 'baked (base table)')).toBe(true);
    expect(all.writes.some((w) => w.path === M)).toBe(false);
    const body = parseAnimBase(all.writes.find((w) => w.path === BAKE_BASE_FILE)!.after).sections?.body ?? {};
    MOVING13.forEach((g, i) => expect(body[g]?.strideMul, g).toBeCloseTo(0.82 + i * 0.05, 6));
  });
});

describe('anim-bake refusals (nothing written)', () => {
  const t = tempTree();
  const refused = (data: unknown, re: RegExp, rules?: readonly BakeRule[]): void => {
    const r = tuneBake(data, SCRIPT_CAT, t.read, rules ? { rules } : {});
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(re);
    expect(r.writes).toEqual([]);
  };

  it('a wrong magic or version, a malformed or doubled entry', () => {
    refused({ ...SAMPLE, magic: 'shoulder-strike-save' }, /wrong file/);
    refused({ ...SAMPLE, version: 3 }, /unsupported version 3/); // (T1a: 2 is the rows' version)
    refused(null, /not an animation tuner export/);
    refused({ ...SAMPLE, changed: 'x' }, /no values/);
    refused(exportOf([{ group: 'walk', id: 'trackMul', value: 'big' }]), /malformed entry/);
    refused(exportOf([entry('walk', 'trackMul', 'mul', 1.1), entry('walk', 'trackMul', 'mul', 1.2)]), /twice/);
  });

  it('a value beyond the slider\'s wide range, or a kind that differs', () => {
    expect(wideRange({ kind: 'mul', def: 1, min: 0.3, max: 2 })).toEqual([0.05, 3]);
    refused(exportOf([entry('spd.stand', 'runMul', 'mul', 3.5)]), /outside the slider's wide range/);
    refused(exportOf([entry('spd.stand', 'runMul', 'mul', 0.01)]), /outside the slider's wide range/);
    refused(exportOf([entry('key.walk.0', 'spine_pitch', 'add', 200)]), /outside/);
    refused(exportOf([{ ...entry('spd.stand', 'runMul', 'mul', 1.1), kind: 'add' }]), /kind add in the export, mul in this build/);
  });

  it('a target not found exactly once, a file outside the write roots', () => {
    const exp = exportOf([entry('wallPeek', 'peekLeanMul', 'mul', 1.5)]);
    refused(exp, /WALL\.nope: .*found 0 times.*exactly once/, [{ section: 'body', id: 'peekLeanMul', groups: ['wallPeek'], edits: [{ file: 'src/player/wallController.ts', path: 'WALL.nope', op: 'mul' }] }]);
    refused(exp, /outside the write roots/, [{ section: 'body', id: 'peekLeanMul', groups: ['wallPeek'], edits: [{ file: 'docs/ROADMAP.md', path: 'X', op: 'mul' }] }]);
    refused(exp, /outside the write roots/, [{ section: 'body', id: 'peekLeanMul', groups: ['wallPeek'], edits: [{ file: 'src/../package.json', path: 'X', op: 'mul' }] }]);
    refused(exp, /is a mul slider/, [{ section: 'body', id: 'peekLeanMul', groups: ['wallPeek'], edits: [{ file: 'src/player/wallController.ts', path: 'WALL.peekLean', op: 'add' }] }]);
  });

  it('a slider this build does not know is skipped, not baked (PR #71 sections before their table entries)', () => {
    const r = tuneBake(exportOf([entry('team.boost', 'reachMul', 'mul', 1.2)]), SCRIPT_CAT, t.read);
    expect(r.ok).toBe(true);
    expect(r.rows[0]!.result).toMatch(/^skipped: no bake rule/);
    expect(r.manual).toBe(1); // counted in the summary's "manual or skipped"
    expect(r.writes).toEqual([]);
  });
});

describe('anim-bake-targets: Michael\'s 13 values that were manual (the literal 2026-10-22 entries)', () => {
  // the literal export entries (docs/archive/anim-tuner/exports/anim-tune-2026-10-22.json), version 2
  const LITERAL = {
    magic: 'night-shift-anim-tune',
    version: 2,
    exported: '2026-10-21T14:01:52.215Z',
    changed: [
      entry('idle', 'trackMul', 'mul', 0.05),
      entry('idle', 'elbowOutAdd', 'add', 0.03),
      entry('walk', 'trackMul', 'mul', 0.05),
      entry('walk', 'elbowOutAdd', 'add', 0.03),
      entry('jog', 'armSwingMul', 'mul', 1.7),
      entry('jog', 'trackMul', 'mul', 0.05),
      entry('jog', 'elbowOutAdd', 'add', 0.03),
      entry('run', 'armSwingMul', 'mul', 1.6),
      entry('run', 'trackMul', 'mul', 0.05),
      entry('run', 'kneeLiftMul', 'mul', 1.55),
      entry('lowReady', 'elbowPoleMul', 'mul', 2.25),
      entry('rifle.lowReady', 'tuckMul', 'mul', 0.75),
      entry('pistol.lowReady', 'tuckMul', 'mul', 0),
    ],
    log: [],
  };

  it('0 manual: 11 into the body key, 2 into WREN_TUCK, composed onto the tree\'s values', () => {
    const t = tempTree();
    const r = tuneBake(LITERAL, SCRIPT_CAT, t.read);
    expect(r.ok, r.error).toBe(true);
    expect(r.manual).toBe(0);
    expect(r.baked).toBe(13);
    expect(r.rows.filter((x) => x.result === 'baked (base table)').length).toBe(11);
    t.write(r);
    const b0 = parseAnimBase(real(BAKE_BASE_FILE)).body ?? {};
    const b1 = parseAnimBase(t.read(BAKE_BASE_FILE)!).body ?? {};
    for (const c of LITERAL.changed.slice(0, 11)) {
      const old = b0[c.group]?.[c.id] ?? c.default;
      expect(b1[c.group]?.[c.id], `${c.group} ${c.id}`).toBeCloseTo(c.kind === 'mul' ? old * c.value : old + c.value, 3); // (4 significant digits)
    }
    const G = 'src/anim/animGraph.ts';
    expect(num(t.read(G)!, 'WREN_TUCK.rifle.lowReady')).toBeCloseTo(num(real(G), 'WREN_TUCK.rifle.lowReady') * 0.75, 6);
    expect(num(t.read(G)!, 'WREN_TUCK.pistol.lowReady')).toBe(0);
    expect(num(t.read(G)!, 'WREN_TUCK.rifle.aim')).toBe(num(real(G), 'WREN_TUCK.rifle.aim'));
  });

  it('the real tree has them baked: the real ledger reports every one "already baked"', () => {
    const r = tuneBake(LITERAL, SCRIPT_CAT, (p) => (existsSync(path.join(ROOT, p)) ? real(p) : null));
    expect(r.ok, r.error).toBe(true);
    expect(r.writes).toEqual([]);
    expect(r.rows.every((x) => x.result.startsWith('already baked'))).toBe(true);
  });
});

describe('anim-bake-all: every slider of every section bakes (0 manual, pure options excepted)', () => {
  /** A non-default value on the slider's step grid inside its normal range (n steps off the default, either side). */
  const off = (t: { def: number; min: number; max: number; step: number }, n: number): number => {
    const up = Math.min(t.max, t.def + t.step * n);
    const v = up !== t.def ? up : Math.max(t.min, t.def - t.step * n);
    return Number(v.toFixed(6));
  };
  /** Every slider and group of every registered section (Keys excepted: its key JSONs have their own tests). */
  const everySlider = (perGroup: boolean) =>
    TUNE_SECTIONS.filter((s) => s.id !== 'keys').flatMap((s) => s.tunables.flatMap((t) => t.groups.map((g, gi) => entry(g, t.id, t.kind, off(t, perGroup ? 1 + (gi % 3) : 1)))));

  for (const perGroup of [true, false]) {
    it(`one non-default value for every slider and group (${perGroup ? 'the groups differ' : 'every group equal'}): 0 manual on a temp tree, a re-run spent`, () => {
      const t = tempTree();
      const changed = everySlider(perGroup);
      expect(changed.length).toBeGreaterThan(1000);
      const r = tuneBake({ ...exportOf(changed), version: 2 }, SCRIPT_CAT, t.read, { now: new Date('2026-10-22T09:00:00Z') });
      expect(r.ok, r.error).toBe(true);
      const manual = r.rows.filter((x) => !x.result.startsWith('baked'));
      // the one pure option: the Joints mirror lock
      expect(manual.map((x) => `${x.group}|${x.id}|${x.result}`)).toEqual(['joint.options|mirror|manual: no code target']);
      expect(r.manual).toBe(1);
      expect(r.baked).toBe(changed.length - 1);
      t.write(r);
      // every generic entry landed composed on identity (the temp tree's table has no sections yet)
      const sec = parseAnimBase(t.read(BAKE_BASE_FILE)!).sections ?? {};
      for (const x of r.rows.filter((y) => y.target.includes(': sections.'))) {
        const v = sec[x.section]?.[x.group]?.[x.id];
        expect(v, `${x.section} ${x.group} ${x.id}`).toBe(Number(bakeFmt(x.value)));
      }
      // the previously manual sliders (backlog item 29) are among them
      for (const [s, g, id] of [
        ['gun', 'rifle.aim', 'gunUp'],
        ['gun', 'pistol.aimCrouch', 'gunCant'],
        ['cam', 'cam.explore', 'camFovAdd'],
        ['cam', 'cam.aimRifle', 'camZoomMul'],
        ['cam', 'cam.aimPistol', 'camBlendMul'],
        ['speed', 'spd.aim', 'glideFwdMul'],
        ['step', 'step.walk', 'lift'],
        // (anim-natural N1) the idle lock has a code rule now (the aimed turn on the spot); the idle landTurn is generic
        ['step', 'step.idle', 'landTurn'],
        ['step', 'step.run', 'replant'],
        ['weight', 'weight.jog', 'chestDampMul'],
        ['weight', 'weight.drawn', 'camDip'],
        ['team_boost', 'team.boost.contact', 'cFwd'],
        ['team_revive', 'team.revive.b', 'handUp'],
        ['trav', 'trav.vault', 'time'],
        ['body', 'walk', 'strideMul'],
      ] as const) expect(sec[s]?.[g]?.[id], `${s} ${g} ${id}`).toBeDefined();
      const again = tuneBake({ ...exportOf(changed), version: 2 }, SCRIPT_CAT, t.read);
      expect(again.ok, again.error).toBe(true);
      expect(again.writes).toEqual([]);
      expect(again.rows.filter((x) => !x.result.startsWith('already baked')).map((x) => x.id)).toEqual(['mirror']);
    }, 60_000);
  }

  // a literal export (the style of the tuner's own file): one value per backlog item 29 bullet
  const LITERAL = {
    magic: 'night-shift-anim-tune',
    version: 2,
    exported: '2026-10-22T09:30:00.000Z',
    changed: [
      entry('walk', 'strideMul', 'mul', 1.08),
      entry('jog', 'strideMul', 'mul', 0.95),
      entry('rifle.aim', 'gunUp', 'add', 0.01),
      entry('pistol.aim', 'gunPitch', 'add', -0.05),
      entry('cam.explore', 'camFovAdd', 'add', -4),
      entry('cam.aimRifle', 'camZoomMul', 'mul', 0.9),
      entry('cam.aimRifle', 'camBlendMul', 'mul', 1.5),
      entry('spd.aim', 'glideFwdMul', 'mul', 1.1),
      entry('step.walk', 'stride1', 'mul', 1.2),
      entry('step.idle', 'lock', 'mul', 2),
      entry('weight.walk', 'chestDampMul', 'mul', 0.8),
      entry('weight.run', 'bank', 'add', 0.5),
      entry('team.boost.a', 'bodyFwd', 'add', 0.05),
      entry('trav.mantle', 'time', 'mul', 1.25),
    ],
    log: [],
  };

  it('the literal export: 0 manual, the generic table printed sorted, one group per line', () => {
    const t = tempTree();
    const r = tuneBake(LITERAL, SCRIPT_CAT, t.read);
    expect(r.ok, r.error).toBe(true);
    expect(r.manual).toBe(0);
    expect(r.baked).toBe(14);
    expect(r.writes.map((w) => w.path).sort()).toEqual([BAKE_BASE_FILE, BAKE_LEDGER].sort());
    t.write(r);
    const text = t.read(BAKE_BASE_FILE)!.replace(/\r\n/g, '\n');
    expect(text).toContain(
      [
        '  "sections": {',
        '    "body": {',
        '      "jog": { "strideMul": 0.95 },',
        '      "walk": { "strideMul": 1.08 }',
        '    },',
        '    "cam": {',
        '      "cam.aimRifle": { "camBlendMul": 1.5, "camZoomMul": 0.9 },',
        '      "cam.explore": { "camFovAdd": -4 }',
        '    },',
        '    "gun": {',
        '      "pistol.aim": { "gunPitch": -0.05 },',
        '      "rifle.aim": { "gunUp": 0.01 }',
        '    },',
        '    "speed": {',
        '      "spd.aim": { "glideFwdMul": 1.1 }',
        '    },',
        '    "step": {',
        '      "step.idle": { "lock": 2 },',
        '      "step.walk": { "stride1": 1.2 }',
        '    },',
        '    "team_boost": {',
        '      "team.boost.a": { "bodyFwd": 0.05 }',
        '    },',
        '    "trav": {',
        '      "trav.mantle": { "time": 1.25 }',
        '    },',
        '    "weight": {',
        '      "weight.run": { "bank": 0.5 },',
        '      "weight.walk": { "chestDampMul": 0.8 }',
        '    }',
        '  }',
        '}',
      ].join('\n'),
    );
    // the rest of the table is as it was (the generic key is appended last)
    const b0 = parseAnimBase(real(BAKE_BASE_FILE));
    const b1 = parseAnimBase(text);
    expect({ ...b1, sections: undefined }).toEqual({ ...b0, sections: undefined });
    // an export of the opposite add values (the bank's range has no negative side) composes them back to identity:
    // dropped from the key, an emptied group or section with it
    const back = { ...LITERAL, exported: '2026-10-22T10:00:00.000Z', changed: LITERAL.changed.filter((c) => c.kind === 'add' && c.id !== 'bank').map((c) => ({ ...c, value: -c.value })) };
    const r2 = tuneBake(back, SCRIPT_CAT, t.read);
    expect(r2.ok, r2.error).toBe(true);
    t.write(r2);
    const left = parseAnimBase(t.read(BAKE_BASE_FILE)!).sections ?? {};
    expect(left.gun).toBeUndefined();
    expect(left.cam).toEqual({ 'cam.aimRifle': { camBlendMul: 1.5, camZoomMul: 0.9 } });
    expect(left.team_boost).toBeUndefined();
    expect(left.weight).toEqual({ 'weight.run': { bank: 0.5 }, 'weight.walk': { chestDampMul: 0.8 } });
  });

  it('refuses a generic entry for a section with its own base key, or a non-identity default', () => {
    expect(() => sectionTarget({ section: 'joint', group: 'joint.walk', id: 'elbowR_x', kind: 'add', def: 0 })).toThrow(/own base key/);
    expect(() => sectionTarget({ section: 'body', group: 'walk', id: 'trackMul', kind: 'mul', def: 1 })).toThrow(/body key/);
    expect(() => sectionTarget({ section: 'cam', group: 'cam.explore', id: 'camFovAdd', kind: 'add', def: 1 })).toThrow(/not identity/);
    expect(sectionTarget({ section: 'cam', group: 'cam.explore', id: 'camFovAdd', kind: 'add', def: 0 })).toBe('src/anim/animBase.ts: sections.cam.cam.explore.camFovAdd +');
  });
});
