// (marlow-bays item 24, track A) Guard tuning: the guard rows apart from Wren's (both ways, on real rigs), the guard
// base table under the deltas, the row pick, persistence (save, export, import, presets, undo; literal old records) and
// the bake into the guard table (an export with no guard rows bakes as before).
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import type { Quaternion } from '../src/core/babylon';
import '../src/anim/tune';
import '../src/player/weightTune';
import { tuneV2SyncAll } from '../src/anim/tuneV2Sections';
import { TUNE_SECTIONS, tuneBaseLoad, tuneExport, tuneGet, tuneImport, tuneLoad, tuneResetAll, tuneSet, tuneSnapshot } from '../src/anim/tuneRegistry';
import { presetFile, presetParse, presetPut, TuneHistory, tuneApplyValues, tuneValues } from '../src/anim/tuneHistory';
import { GUARD_JOINT_GROUPS, GUARD_ROW_LIVE, GUARD_STEP_GROUPS, GUARD_STEP_ROWS, GUARD_WEIGHT_GROUPS, GUARD_WEIGHT_LIVE, guardBaseLoad, guardJointEffective, guardRowOf, guardStepGet, guardTuneResetTables, tuneGuardFrame } from '../src/anim/tuneGuard';
import { guardRigBegin, guardRigState } from '../src/anim/tuneGuardRig';
import { ANIM_BASE_GUARD } from '../src/anim/animBaseGuard';
import { J, JOINTS_CUR } from '../src/anim/tuneJoints';
import { STEP_GAITS, STEP_IDENTITY_ROWS, STEP_N, SP, stepGaitIndex, stepRowGet } from '../src/anim/tuneStep';
import { bakeCatalogue, tuneBake } from '../src/anim/tuneBake';
import { BAKE_BASE_FILE, parseAnimBase } from '../src/anim/tuneBakeBase';
import { ANIM_BASE } from '../src/anim/animBase';
import '../src/anim/tuneClipSpeed'; // (anim-bake-all merge) the Clip speed section in the catalogue
import { applyGuardBaseEntries, BAKE_GUARD_FILE, emptyGuardBase, guardBaseTarget, parseAnimBaseGuard, printAnimBaseGuard, spliceAnimBaseGuard } from '../src/anim/tuneBakeGuard';
import { BAKE_RULES } from '../src/anim/tuneBakeTable';
import { buildTabs, guardLoopGroups, levelName, loopForGroup, plainGroupWord, plainLabel, plainLoop, plainSection, tabOfSection, whoSections } from '../src/ui/tunerLayout';
import { tuneTarget } from '../src/ui/tunerTarget';
import { CHAMBER_ENTRIES, chamberBodyPin, chamberEntry, chamberInput } from '../src/anim/chamber';

const ROOT = path.join(__dirname, '..');

afterEach(() => {
  tuneResetAll();
  tuneV2SyncAll();
  tuneGuardFrame();
  guardTuneResetTables();
});

const NODES = ['hips', 'spine', 'torso', 'neck', 'headNode', 'elbowL', 'elbowR', 'wristL', 'wristR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR'] as const;

/** A Wren rig, a guard rig and a plain rig animated in turn walking (90 frames): each rig's bones at the end. */
async function runRigs(): Promise<Record<string, number[]>[]> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { defaultLook } = await import('../src/cosmetics/avatarLook');
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const kinds = ['wren', 'guard', 'plain'] as const;
  const rigs = kinds.map((k, i) => {
    const rg = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook(), 1.75, `r${i}`);
    if (k === 'wren') rg.tuneRows = true;
    if (k === 'guard') rg.guardRows = true;
    rg.root.position.x = i * 3;
    return rg;
  });
  const poses = kinds.map(() => ({ speed: 1.4, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing' as const, velZ: 1.4 }));
  for (let f = 0; f < 90; f++) {
    for (let k = 0; k < rigs.length; k++) {
      const rg = rigs[k]!;
      rg.root.position.z += 1.4 / 60;
      rg.animate(1 / 60, poses[k]!);
    }
  }
  const out = rigs.map((rg) => {
    const o: Record<string, number[]> = {};
    for (const n of NODES) {
      const node = (rg as unknown as Record<string, { rotationQuaternion: Quaternion; position: { x: number; y: number; z: number } }>)[n]!;
      const q = node.rotationQuaternion;
      o[n] = [q.x, q.y, q.z, q.w, node.position.x, node.position.y, node.position.z];
    }
    // the planner's own values (the VIP's, the dummy's: a plain rig)
    const pl = rg.planner;
    o.planner = [pl.L.x, pl.L.y, pl.L.z, pl.R.x, pl.R.y, pl.R.z, Number(pl.L.contact), Number(pl.R.contact)];
    return o;
  });
  for (const rg of rigs) rg.dispose();
  scene.dispose();
  vi.restoreAllMocks();
  return out;
}

describe('item 24: guard rows apart from Wren\'s', () => {
  it('registers the guard sections with additive group ids', () => {
    const ids = TUNE_SECTIONS.map((s) => s.id);
    for (const id of ['guardJoint', 'guardStep', 'guardWeight']) expect(ids).toContain(id);
    expect(GUARD_JOINT_GROUPS).toEqual(['guard.joint.idle', 'guard.joint.walk', 'guard.joint.run', 'guard.joint.aim', 'guard.joint.crouch', 'guard.joint.cover']);
    expect(GUARD_STEP_GROUPS[0]).toBe('guard.step.idle');
    expect(GUARD_WEIGHT_GROUPS[1]).toBe('guard.weight.walk');
    // no momentum or camera slider on a guard (its motion is its brain's)
    const w = TUNE_SECTIONS.find((s) => s.id === 'guardWeight')!;
    expect(w.keys).not.toContain('startMul');
    expect(w.keys).not.toContain('camLag');
    expect(w.keys).toContain('chestLag');
  });

  it('picks the guard row from the pose', () => {
    const p = (o: Partial<Parameters<typeof guardRowOf>[0]>) => guardRowOf({ speed: 0, crouch: 0, aim: 0.2, ...o });
    expect(p({})).toBe(0);
    expect(p({ speed: 1 })).toBe(1);
    expect(p({ speed: 2, dash: 1 })).toBe(2);
    expect(p({ speed: 3.2 })).toBe(2);
    expect(p({ aim: 1 })).toBe(3);
    expect(p({ crouch: 1, aim: 1 })).toBe(4);
    expect(p({ wall: true, aim: 1 })).toBe(5);
    expect(p({ traverse: 'climb' })).toBe(-1);
  });

  it('untuned, a guard rig opens no window (bit-identical path)', () => {
    tuneGuardFrame();
    const st = guardRigState();
    const rig = { root: { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 } }, planner: { L: { landed: false }, R: { landed: false } } };
    expect(guardRigBegin(st, { speed: 1.4, crouch: 0, aim: 0.2, grounded: true }, rig, 1 / 60)).toBe(false);
    expect(JOINTS_CUR.on).toBe(false);
    expect(GUARD_WEIGHT_LIVE.on).toBe(false);
    expect([...GUARD_ROW_LIVE].every((v) => v === 0)).toBe(true);
    expect([...GUARD_STEP_ROWS].every((v) => v === 1)).toBe(true);
  });

  it('Wren\'s rows never touch a guard, and the guard rows never touch Wren (real rigs, both ways)', async () => {
    const base = await runRigs();
    // Wren's Joints and Stepping rows of the walk
    tuneSet('joint.walk', 'elbowR_x', 25);
    tuneSet('step.walk', 'lift', 2);
    tuneV2SyncAll();
    tuneGuardFrame();
    const wren = await runRigs();
    expect(wren[0]).not.toEqual(base[0]);
    expect(wren[1]).toEqual(base[1]);
    // the plain rig (the VIP, the dummy, a carried body: neither Wren's nor a guard's) reads the identity stepping table
    expect(wren[2]).toEqual(base[2]);
    tuneResetAll();
    tuneV2SyncAll();
    // the guard's Joints, Stepping and Weight rows of the walk
    tuneSet('guard.joint.walk', 'elbowR_x', 25);
    tuneSet('guard.step.walk', 'lift', 2);
    tuneSet('guard.weight.walk', 'chestLag', 6);
    tuneGuardFrame();
    tuneV2SyncAll();
    expect(GUARD_ROW_LIVE[1]).toBe(1);
    expect(GUARD_WEIGHT_LIVE.on).toBe(true);
    const guard = await runRigs();
    expect(guard[0]).toEqual(base[0]);
    expect(guard[1]).not.toEqual(base[1]);
    expect(guard[1]!.elbowR).not.toEqual(base[1]!.elbowR);
    expect(guard[2]).toEqual(base[2]);
  }, 60_000);

  it('the guard base table sits under the deltas (joints add, stepping multiplies, weight composes)', () => {
    const bad = guardBaseLoad({ version: 1, joints: { walk: { elbowR: [10, 0, 0], nope: [1, 1, 1] }, bogus: {} }, step: { walk: { lift: 1.5 } }, weight: { walk: { chestLag: 2, chestHzMul: 2 } } });
    expect(bad).toEqual(['joints.walk.nope', 'joints.bogus']);
    tuneSet('guard.joint.walk', 'elbowR_x', 5);
    tuneSet('guard.step.walk', 'lift', 2);
    tuneSet('guard.weight.walk', 'chestLag', 1);
    tuneSet('guard.weight.walk', 'chestHzMul', 1.5);
    tuneGuardFrame();
    expect(guardJointEffective('walk', J.elbowR, 0)).toBe(15);
    expect(guardStepGet('walk', 'lift')).toBe(3);
    expect(GUARD_STEP_ROWS[1 * STEP_N + SP.lift]).toBe(3);
    // Wren's tables are untouched by a guard base or row
    expect(tuneGet('joint.walk', 'elbowR_x')).toBe(0);
    tuneResetAll();
    tuneGuardFrame();
    expect(guardJointEffective('walk', J.elbowR, 0)).toBe(10);
    expect(guardStepGet('walk', 'lift')).toBe(1.5);
  });
});

describe('item 24: persistence carries the guard rows', () => {
  it('a literal version 2 save from before guard tuning loads, guard rows at identity', () => {
    tuneLoad({ version: 2, values: { walk: { strideMul: 1.2 }, 'joint.walk': { elbowR_x: 4 } }, log: [] });
    expect(tuneGet('walk', 'strideMul')).toBe(1.2);
    for (const g of GUARD_JOINT_GROUPS) expect(tuneGet(g, 'elbowR_x')).toBe(0);
    for (const g of GUARD_STEP_GROUPS) expect(tuneGet(g, 'lift')).toBe(1);
  });

  it('save, export and import round-trip the guard rows (a literal export)', () => {
    tuneSet('guard.joint.aim', 'headNode_x', 1);
    tuneSet('guard.joint.aim', 'neck_y', -8);
    tuneSet('guard.step.run', 'stride2', 1.2);
    const snap = tuneSnapshot();
    expect(snap.values['guard.joint.aim']).toEqual({ neck_y: -8 });
    expect(snap.values['guard.step.run']).toEqual({ stride2: 1.2 });
    tuneResetAll();
    tuneLoad(snap);
    expect(tuneGet('guard.joint.aim', 'neck_y')).toBe(-8);
    expect(tuneExport().changed.some((c) => c.group === 'guard.step.run' && c.id === 'stride2' && c.value === 1.2)).toBe(true);
    const res = tuneImport(
      {
        magic: 'night-shift-anim-tune',
        version: 2,
        exported: '2026-10-22T10:00:00.000Z',
        changed: [
          { group: 'guard.weight.run', id: 'bank', label: 'bank', kind: 'add', unit: '', value: 0.5, default: 0 },
          { group: 'joint.walk', id: 'elbowL_x', label: 'elbowL pitch', kind: 'add', unit: 'deg', value: 3, default: 0 },
        ],
        log: [],
      },
      'literal',
    );
    expect(res.ok).toBe(true);
    expect(res.applied).toBe(2);
    expect(tuneGet('guard.weight.run', 'bank')).toBe(0.5);
    expect(tuneGet('guard.step.run', 'stride2')).toBe(1);
  });

  it('presets and undo carry the guard rows; a literal old presets file still parses', () => {
    tuneSet('guard.joint.idle', 'spine_x', 6);
    const list = presetPut([], 'g', tuneValues());
    const parsed = presetParse(JSON.parse(JSON.stringify(presetFile(list))));
    expect(parsed[0]!.values['guard.joint.idle']).toEqual({ spine_x: 6 });
    expect(presetParse({ version: 2, presets: [{ name: 'old', saved: '', values: { walk: { strideMul: 1.1 } } }] })[0]!.values).toEqual({ walk: { strideMul: 1.1 } });
    tuneResetAll();
    tuneApplyValues(parsed[0]!.values);
    expect(tuneGet('guard.joint.idle', 'spine_x')).toBe(6);
    const h = new TuneHistory();
    h.reset();
    tuneSet('guard.joint.idle', 'spine_x', 9, 1000);
    h.note(1000);
    h.settle(5000, true);
    expect(h.undo(6000)).toBe(true);
    expect(tuneGet('guard.joint.idle', 'spine_x')).toBe(6);
  });
});

describe('item 24: the bake writes the guard table', () => {
  const dirs: string[] = [];
  afterAll(() => {
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
  });
  const tree = (): ((p: string) => string | null) => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'guard-bake-'));
    dirs.push(dir);
    const files = [...new Set([...BAKE_RULES.flatMap((r) => r.edits.map((e) => e.file)), BAKE_BASE_FILE, BAKE_GUARD_FILE])];
    for (const f of files) {
      mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
      cpSync(path.join(ROOT, f), path.join(dir, f));
    }
    return (p: string) => {
      try {
        return readFileSync(path.join(dir, p), 'utf8');
      } catch {
        return null;
      }
    };
  };
  const cat = () => bakeCatalogue(TUNE_SECTIONS.filter((s) => s.id !== 'keys'));
  const exp = (changed: unknown[]) => ({ magic: 'night-shift-anim-tune', version: 2, exported: '2026-10-22T10:00:00.000Z', changed, log: [] });

  it('prints the generated table as it is (identity re-bake is a no-op)', () => {
    const text = readFileSync(path.join(ROOT, BAKE_GUARD_FILE), 'utf8');
    const b = parseAnimBaseGuard(text);
    expect(b).toEqual(ANIM_BASE_GUARD);
    expect(spliceAnimBaseGuard(text, b)).toBe(text);
    expect(printAnimBaseGuard(emptyGuardBase())).toBe('{\n  "version": 1,\n  "joints": {},\n  "step": {},\n  "weight": {}\n}\n');
  });

  it('a guard export bakes into animBaseGuard.ts only (composed by the runtime rules)', () => {
    const read = tree();
    const res = tuneBake(
      exp([
        { group: 'guard.joint.walk', id: 'elbowR_x', kind: 'add', value: 6 },
        { group: 'guard.step.walk', id: 'lift', kind: 'mul', value: 1.3 },
        { group: 'guard.weight.run', id: 'chestLag', kind: 'add', value: 2 },
        { group: 'guard.weight.run', id: 'chestHzMul', kind: 'mul', value: 1.5 },
      ]),
      cat(),
      read,
    );
    expect(res.ok, res.error).toBe(true);
    expect(res.baked).toBe(4);
    expect(res.writes.map((w) => w.path).sort()).toEqual([BAKE_GUARD_FILE, 'src/anim/tuneBakeLog.json'].sort());
    const after = parseAnimBaseGuard(res.writes.find((w) => w.path === BAKE_GUARD_FILE)!.after);
    expect(after.joints).toEqual({ walk: { elbowR: [6, 0, 0] } });
    expect(after.step).toEqual({ walk: { lift: 1.3 } });
    expect(after.weight).toEqual({ run: { chestLag: 2, chestHzMul: 1.5 } });
    // the runtime reads the baked table as the tune: base + identity delta = the tuned value
    guardBaseLoad(after);
    tuneGuardFrame();
    expect(guardJointEffective('walk', J.elbowR, 0)).toBe(6);
    expect(guardStepGet('walk', 'lift')).toBe(1.3);
    // composing again adds / multiplies on what is there
    const twice = applyGuardBaseEntries(after, [{ group: 'guard.step.walk', id: 'lift', value: 2 }, { group: 'guard.joint.walk', id: 'elbowR_x', value: 178 }]);
    expect(twice.step.walk!.lift).toBe(2.6);
    expect(twice.joints.walk!.elbowR![0]).toBe(-176);
    expect(() => guardBaseTarget({ group: 'guard.weight.run', id: 'startMul' })).toThrow();
  });

  it('an export with no guard rows never touches the guard file (bakes as before)', () => {
    const read = tree();
    const res = tuneBake(exp([{ group: 'joint.walk', id: 'elbowR_x', kind: 'add', value: 5 }, { group: 'step.idle', id: 'lift', kind: 'mul', value: 1.4 }]), cat(), read);
    expect(res.ok, res.error).toBe(true);
    expect(res.writes.some((w) => w.path === BAKE_GUARD_FILE)).toBe(false);
    expect(res.rows.every((r) => !r.target.includes(BAKE_GUARD_FILE))).toBe(true);
  });

  it('(anim-bake-all merge) guard rows, Wren\'s generic rows and Clip speed bake apart: each into its own target, once', () => {
    const read = tree();
    const res = tuneBake(
      exp([
        { group: 'guard.step.walk', id: 'lift', kind: 'mul', value: 1.3 }, // the guard table
        { group: 'step.walk', id: 'lift', kind: 'mul', value: 1.2 }, // Wren's moving lift: no code value, the generic table
        { group: 'clip.gun', id: 'rifleDraw', kind: 'mul', value: 1.25 }, // Clip speed: its code rule
      ]),
      cat(),
      read,
    );
    expect(res.ok, res.error).toBe(true);
    expect(res.baked).toBe(3);
    expect(res.writes.map((w) => w.path).sort()).toEqual([BAKE_BASE_FILE, BAKE_GUARD_FILE, 'src/anim/tuneBakeLog.json', 'src/weapons/drawState.ts'].sort());
    const row = (g: string) => res.rows.find((r) => r.group === g)!;
    expect(row('guard.step.walk').result).toBe('baked (guard base table)');
    expect(row('step.walk').target).toMatch(/sections\.step\.step\.walk\.lift/);
    expect(row('clip.gun').target).toMatch(/DRAW_TIME_PRIMARY/);
    expect(row('clip.gun').target).not.toMatch(/sections\./);
    const guard = parseAnimBaseGuard(res.writes.find((w) => w.path === BAKE_GUARD_FILE)!.after);
    expect(guard.step).toEqual({ walk: { lift: 1.3 } });
    const wren = parseAnimBase(res.writes.find((w) => w.path === BAKE_BASE_FILE)!.after);
    expect(wren.sections).toEqual({ step: { 'step.walk': { lift: 1.2 } } });
    // the runtime: Wren's rows take her base, the guards' theirs, the identity table neither
    const w = STEP_GAITS.indexOf('walk');
    try {
      tuneBaseLoad(wren.sections);
      guardBaseLoad(guard);
      tuneGuardFrame();
      expect(stepRowGet(w, SP.lift)).toBe(1.2);
      expect(guardStepGet('walk', 'lift')).toBe(1.3);
      expect(GUARD_STEP_ROWS[w * STEP_N + SP.lift]).toBe(1.3);
      expect([...STEP_IDENTITY_ROWS].every((v) => v === 1)).toBe(true);
    } finally {
      tuneBaseLoad(ANIM_BASE.sections);
    }
  });
});

describe('item 24: the panel and the chamber (pure parts)', () => {
  it('Who shows the guard sections in their tabs, Wren\'s otherwise; plain labels and targets as the mirrored section', () => {
    expect(tabOfSection('guardJoint')).toBe('body');
    expect(tabOfSection('guardStep')).toBe('stepping');
    expect(tabOfSection('guardWeight')).toBe('weight');
    const tabs = buildTabs(['body', 'joint', 'guardJoint', 'step', 'guardStep', 'speed', 'hand'], (id) => id);
    const body = tabs.find((t) => t.id === 'body')!;
    expect(whoSections(body.sections, 'guard')).toEqual(['guardJoint']);
    expect(whoSections(body.sections, 'wren')).toEqual(['body', 'joint']);
    // a tab with no guard rows keeps Wren's
    expect(whoSections(tabs.find((t) => t.id === 'hands')!.sections, 'guard')).toEqual(['hand']);
    expect(plainSection('guardJoint', 'Guard joints')).toBe('Guard joints');
    expect(levelName('guardJoint', 0)).toBe('Guard state');
    expect(plainGroupWord('guardJoint', 0, 'aim')).toBe('Aim');
    expect(plainGroupWord('guardWeight', 0, 'cover')).toBe('Wall cover');
    expect(plainLabel('guardJoint', 'elbowR_x', 'elbowR pitch')).toBe('Right elbow bend');
    expect(plainLabel('guardStep', 'lift', 'foot lift height')).toBe('Foot lift');
    expect(plainLabel('guardWeight', 'chestLag', 'chest spring: lag')).toBe('Chest lag');
    expect(tuneTarget('guardJoint', 'elbowR_x')).toMatchObject(tuneTarget('joint', 'elbowR_x'));
    expect(tuneTarget('guardStep', 'lift').label).toBe('Feet (stepping)');
  });

  it('the guard loops: on the guard puppet, no input to Wren, their rows; a guard row picked plays its loop', () => {
    const ids = CHAMBER_ENTRIES.filter((e) => e.kind === 'guard').map((e) => e.id);
    expect(ids).toEqual(['guard:idle', 'guard:patrol', 'guard:alert', 'guard:run', 'guard:aim', 'guard:crouchAim', 'guard:cover']);
    const e = chamberEntry('guard:patrol');
    expect(e.gloop?.speed).toBeGreaterThan(0.5);
    expect(chamberBodyPin(e)).toBe('');
    const o = chamberInput(e, false, { x: 0, y: 0, turn: 0, ads: false, crouch: false, drawn: false }, true);
    expect([o.x, o.y, o.turn, o.ads, o.crouch, o.drawn]).toEqual([0, 0, 0, false, false, false]);
    expect(plainLoop('guard:patrol', e.label)).toBe('Guard: patrol walk');
    // the run at 3.2 m/s steps in the jog gait (the planner's jog / run split is 3.5 m/s)
    expect(guardLoopGroups('guard:run')).toEqual({ joint: 'guard.joint.run', step: 'guard.step.jog', weight: 'guard.weight.run' });
    for (const en of CHAMBER_ENTRIES.filter((x) => x.gloop)) {
      const g = en.gloop!;
      expect(guardLoopGroups(en.id).step, en.id).toBe(`guard.step.${STEP_GAITS[stepGaitIndex(g.speed > 0, g.speed, g.crouch ? 1 : 0)]}`);
    }
    expect(guardLoopGroups('guard:crouchAim').joint).toBe('guard.joint.crouch');
    expect(loopForGroup('guardJoint', 'guard.joint.aim', 'guard:idle')).toBe('guard:aim');
    expect(loopForGroup('guardJoint', 'guard.joint.walk', 'guard:alert')).toBe('');
    expect(loopForGroup('guardStep', 'guard.step.jog', 'state:idle')).toBe('guard:run');
    expect(loopForGroup('guardStep', 'guard.step.run', 'state:idle')).toBe('');
    expect(loopForGroup('guardStep', 'guard.step.crouchRun', 'guard:idle')).toBe('');
  });
});
