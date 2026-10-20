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
  for (const f of [...TABLE_FILES, 'scripts/anim-keys/keys/walk.json']) {
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
  entry('walk', 'trackMul', 'mul', 1.2), // body: manual, no code target
  entry('rifle.lowReady', 'gunFwd', 'add', 0.02), // gun: per weapon x state
  entry('cam.climb', 'camBoomAdd', 'add', 0.3), // cam: every climb preset
  entry('cam.wall', 'camPivotAdd', 'add', 0.1), // cam: shared by wall and peek, equal: baked
  entry('cam.peek', 'camPivotAdd', 'add', 0.1),
  entry('spd.stand', 'runMul', 'mul', 1.1), // speed
  entry('spd.aim', 'glideFwdMul', 'mul', 1.2), // manual (fix round B2)
  entry('spd.aim', 'glideStrafeMul', 'mul', 0.8),
  entry('spd.climb', 'ladderMul', 'mul', 1.2), // a NAME * n form
  entry('joint.walk', 'elbowR_x', 'add', 5), // joints: manual
  entry('hand.rifle.aim', 'handLFwd', 'add', 0.01), // hands & feet: manual
  entry('ik.walk', 'handL', 'mul', 0.5), // IK: manual
  entry('weapon.rifle.aim', 'gunScale', 'mul', 1.1), // weapon: manual
  entry('step.idle', 'lift', 'mul', 1.4), // stepping
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

  it('covers every slider of every section and group exactly once (a rule, or a manual entry)', () => {
    for (const s of TUNE_SECTIONS) {
      if (s.id === 'keys') continue;
      for (const t of s.tunables) {
        for (const g of t.groups) {
          const r = BAKE_RULES.some((x) => x.section === s.id && x.id === t.id && x.groups.includes(g));
          const m = BAKE_MANUAL.filter((x) => x.section === s.id && (x.id === t.id || x.id === '*') && (x.groups ? x.groups.includes(g) : !r));
          expect(r || m.length > 0, `${s.id} ${t.id} ${g}`).toBe(true);
          if (r) expect(BAKE_MANUAL.some((x) => x.section === s.id && x.id === t.id && x.groups?.includes(g)), `${s.id} ${t.id} ${g}: rule and manual`).toBe(false);
        }
      }
    }
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

  it('declares the sections plain Node cannot load as the registry has them (speed; weight from weight.ts)', () => {
    for (const id of ['speed', 'weight']) {
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
    close(num(old(G), 'READY_POSES.low.z'), num(before[G]!, 'READY_POSES.low.z') + 0.02);
    for (const p of ['hang', 'ladder', 'pipe', 'fence', 'rappel']) close(num(old(C), `ATTACH_FRAMING.${p}.boom`), num(before[C]!, `ATTACH_FRAMING.${p}.boom`) + 0.3);
    close(num(old(C), 'ATTACH_FRAMING.wall.pivot'), num(before[C]!, 'ATTACH_FRAMING.wall.pivot') + 0.1);
    // speed: the point; the aimed glide's strafe share (the glide forward is manual: it scales the whole glide)
    close(num(old(M), 'GEARS.stand[4]'), num(before[M]!, 'GEARS.stand[4]') * 1.1);
    close(num(old(M), 'MOVEMENT.strafeMult'), num(before[M]!, 'MOVEMENT.strafeMult') * 0.8);
    expect(num(old(M), 'MOVEMENT.adsSpeed')).toBe(num(before[M]!, 'MOVEMENT.adsSpeed'));
    expect(num(old(M), 'ENEMY_MOTION.strafeMult')).toBe(num(before[M]!, 'ENEMY_MOTION.strafeMult'));
    expect(res('spd.aim', 'glideFwdMul')).toBe('manual: no code target');
    expect(r.rows.find((x) => x.id === 'glideFwdMul')!.target).toMatch(/adsSpeed only caps it/);
    expect(locate(old('src/player/attach.ts'), 'ATTACH.ladder.speed').text).toBe('LADDER_RUNG_RATE * 0.36');
    // stepping, weight (all five groups equal: once, not five times)
    close(num(old('src/anim/footPlanner.ts'), 'PLANNER.idleLift'), num(before['src/anim/footPlanner.ts']!, 'PLANNER.idleLift') * 1.4);
    close(num(old(M), 'CT.startTime'), num(before[M]!, 'CT.startTime') * 1.2);
    expect(num(old('src/anim/weight.ts'), 'WEIGHT_BASE.chestHz')).toBe(num(before['src/anim/weight.ts']!, 'WEIGHT_BASE.chestHz'));
    // results per section
    expect(res('wallPeek', 'peekLeanMul')).toBe('baked');
    expect(res('walk', 'trackMul')).toBe('manual: no code target');
    for (const [g, id] of [
      ['joint.walk', 'elbowR_x'],
      ['hand.rifle.aim', 'handLFwd'],
      ['ik.walk', 'handL'],
      ['weapon.rifle.aim', 'gunScale'],
    ]) expect(res(g!, id!)).toBe('manual: no code target');
    expect(res('weight.walk', 'chestHzMul')).toMatch(/^manual: shared target \(weight\.walk 1\.3, weight\.jog 1, /);
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
    // the manual ones are still reported (nothing to write for them)
    expect(r2.rows.find((x) => x.id === 'trackMul')!.result).toBe('manual: no code target');
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
    expect(JSON.parse(t.read(BAKE_LEDGER)!).bakes[0].baked).toEqual(['wallPeek|peekLeanMul=1.5']);
    // a different value for the same slider is a new tune: baked
    const r3 = tuneBake(exportOf([entry('wallPeek', 'peekLeanMul', 'mul', 1.1)]), SCRIPT_CAT, t.read);
    expect(r3.rows[0]!.result).toBe('baked');
  });
});

describe('anim-bake tuckMul (fix round B1)', () => {
  const RIG = 'src/player/characterRig.ts';
  const GRAPH = 'src/anim/animGraph.ts';
  const GUN6 = ['rifle.lowReady', 'rifle.aim', 'rifle.aimCrouch', 'pistol.lowReady', 'pistol.aim', 'pistol.aimCrouch'];
  /** characterRig.ts:2577: max(AIM_ELBOW_TUCK x aimK, READY + (READY_CROUCH - READY) x cr). */
  const tuck = (rig: string, graph: string, aimK: number, cr: number): number => {
    const R = num(rig, 'READY_ELBOW_TUCK');
    return Math.max(num(graph, 'AIM_ELBOW_TUCK') * aimK, R + (num(rig, 'READY_ELBOW_TUCK_CROUCH') - R) * cr);
  };

  it('the 4 aim groups at 0.6 (low ready at 1): manual, nothing written', () => {
    const t = tempTree();
    const r = tuneBake(exportOf(GUN6.filter((g) => !g.endsWith('lowReady')).map((g) => entry(g, 'tuckMul', 'mul', 0.6))), SCRIPT_CAT, t.read);
    expect(r.rows.every((x) => x.result.startsWith('manual: shared target'))).toBe(true);
    expect(r.writes).toEqual([]);
  });

  it('all 6 at 0.6: baked, and the max for aim, crouched aim and low ready is the old max x 0.6', () => {
    const t = tempTree();
    const r = tuneBake(exportOf(GUN6.map((g) => entry(g, 'tuckMul', 'mul', 0.6))), SCRIPT_CAT, t.read);
    expect(r.rows.every((x) => x.result === 'baked')).toBe(true);
    t.write(r);
    const [rig0, graph0, rig1, graph1] = [real(RIG), real(GRAPH), t.read(RIG)!, t.read(GRAPH)!];
    for (const [aimK, cr] of [
      [1, 0], // aim
      [1, 1], // crouched aim
      [0, 0], // low ready
      [0, 1], // crouched low ready
    ] as const) expect(tuck(rig1, graph1, aimK, cr), `aimK ${aimK} cr ${cr}`).toBeCloseTo(tuck(rig0, graph0, aimK, cr) * 0.6, 3);
  });
});

describe('anim-bake shared targets', () => {
  it('one group of a shared constant: manual with the values per group; --allow-shared bakes it and warns', () => {
    const t = tempTree();
    const C = 'src/config/camera.ts';
    const exp = exportOf([entry('cam.explore', 'camBoomAdd', 'add', 0.2)]);
    const r = tuneBake(exp, SCRIPT_CAT, t.read);
    expect(r.ok).toBe(true);
    expect(r.rows[0]!.result).toBe('manual: shared target (cam.explore 0.2, cam.exploreCrouch 0, cam.lowReady 0, cam.hold 0)');
    expect(r.writes).toEqual([]);
    const s = tuneBake(exp, SCRIPT_CAT, t.read, { allowShared: true });
    expect(s.rows[0]!.result).toMatch(/^baked \(--allow-shared: changes cam\.explore, cam\.exploreCrouch, cam\.lowReady, cam\.hold/);
    expect(s.warnings.join('\n')).toMatch(/now applies to every state reading it/);
    t.write(s);
    expect(num(t.read(C)!, 'CAMERA.boomHip')).toBeCloseTo(num(real(C), 'CAMERA.boomHip') + 0.2, 6);
    expect(num(t.read(C)!, 'CAMERA.boomOpen')).toBeCloseTo(num(real(C), 'CAMERA.boomOpen') + 0.2, 6);
  });

  it('every group equal: baked once; two of four changed: manual, and the slider\'s other rules wait too', () => {
    const t = tempTree();
    const C = 'src/config/camera.ts';
    const all = tuneBake(exportOf(['cam.explore', 'cam.exploreCrouch', 'cam.lowReady', 'cam.hold'].map((g) => entry(g, 'camSideAdd', 'add', 0.05))), SCRIPT_CAT, t.read);
    expect(all.rows.every((x) => x.result === 'baked')).toBe(true);
    expect(locate(all.writes.find((w) => w.path === C)!.after, 'CAMERA.shoulderHip').text).toBe(bakeFmt(num(real(C), 'CAMERA.shoulderHip') + 0.05));
    // exploreCrouch has its own rule (boomCrouchOpen) but shares boomHip: with explore at another value nothing bakes
    const two = tuneBake(exportOf([entry('cam.explore', 'camBoomAdd', 'add', 0.2), entry('cam.exploreCrouch', 'camBoomAdd', 'add', 0.2)]), SCRIPT_CAT, t.read, { allowShared: true });
    expect(two.rows.every((x) => x.result.startsWith('manual: shared target'))).toBe(true);
    expect(two.writes).toEqual([]);
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
    refused({ ...SAMPLE, version: 2 }, /unsupported version 2/);
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
