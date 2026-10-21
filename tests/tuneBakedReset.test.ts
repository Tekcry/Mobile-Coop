// (anim-bake-1022) Reset baked: the sliders whose saved value is a ledger value go back to their defaults, once per bake.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import '../src/anim/tune';
import '../src/anim/tuneKeys';
import { TUNE_HOOKS, TUNE_LOG, tuneBakedApplied, tuneGet, tuneImport, tuneLoad, tuneResetAll, tuneSet, tuneSnapshot, TUNE_EXPORT_MAGIC } from '../src/anim/tuneRegistry';
import { bakeAppliedIds, bakedResetNotice, bakedResetPlan, readBakedLedger, tuneBakedReset } from '../src/anim/tuneBakedReset';
import { loadAnimTune, resetAnimTuneDb, saveAnimTune } from '../src/save/animTuneStore';

const T0 = Date.UTC(2026, 9, 22, 12, 0, 0);

/** A literal ledger as `tuneBake.ts` writes it (two bakes). */
const LEDGER = {
  note: 'anim-bake: exports baked into the code defaults (scripts/anim-tune-bake.mjs); a re-run of one is a no-op',
  bakes: [
    {
      hash: '20383670bf49817f',
      exported: '2026-10-21T14:01:52.215Z',
      at: '2026-10-21T14:08:33.622Z',
      baked: ['rifle.lowReady|gunPitch=0.07', 'rifle.lowReady|gunYaw=-0.41', 'joint.rifle.lowReady|upperArmL_z=-4', 'key.jog.0|armL_twist=15', 'key.jog.0|armR_twist=-139', 'key.jog.2|time=-5'],
    },
    { hash: 'aaaabbbbccccdddd', exported: '2026-10-25T09:00:00.000Z', at: '2026-10-25T09:10:00.000Z', baked: ['walk|kneeOutMul=1.25'] },
  ],
};

const ID0 = '20383670bf49817f@2026-10-21T14:08:33.622Z';
const ID1 = 'aaaabbbbccccdddd@2026-10-25T09:10:00.000Z';

/** Literal defaults for the pure plan (every slider here is an add 0, kneeOutMul a mul 1). */
const DEF = (g: string, id: string): number | undefined => (g === 'nope' ? undefined : id.endsWith('Mul') ? 1 : 0);

describe('Reset baked: the plan (pure)', () => {
  it('a literal version 2 store: baked values reset, the rest kept, defaults left out', () => {
    const store = {
      version: 2,
      values: {
        'rifle.lowReady': { gunPitch: 0.07, gunYaw: -0.4 },
        'key.jog.0': { armL_twist: 15, armR_twist: -139 },
        'key.jog.2': { time: -5 },
        walk: { kneeOutMul: 1.2, trackMul: 1 },
        nope: { x: 3 },
      },
      log: [],
    };
    const p = bakedResetPlan(LEDGER, store, DEF);
    expect(p.reset.map((r) => `${r.group}|${r.id}`)).toEqual(['rifle.lowReady|gunPitch', 'key.jog.0|armL_twist', 'key.jog.0|armR_twist', 'key.jog.2|time']);
    expect(p.reset[0]).toEqual({ group: 'rifle.lowReady', id: 'gunPitch', value: 0.07, def: 0 });
    // gunYaw -0.4 is not the baked -0.41; walk 1.2 is not 1.25; an unknown slider is kept; trackMul 1 is a default
    expect(p.kept).toBe(3);
    expect(p.fresh).toEqual([ID0, ID1]);
    expect(p.ids).toEqual([ID0, ID1]);
  });

  it('compares as the ledger formats numbers (exactly, no tolerance)', () => {
    const p = bakedResetPlan({ bakes: [{ hash: 'h', at: '', baked: ['g|a=0.3', 'g|b=-4'] }] }, { version: 2, values: { g: { a: 0.1 + 0.2, b: -4.0 } } }, DEF);
    expect(p.reset.map((r) => r.id)).toEqual(['b']);
    expect(p.kept).toBe(1);
  });

  it('a version 1 store is migrated first: the new per-gun Joints row takes the shared row value and matches', () => {
    const v1 = { version: 1, values: { 'joint.lowReady': { upperArmL_z: -4 } }, log: [] };
    const p = bakedResetPlan(LEDGER, v1, DEF);
    expect(p.reset.map((r) => `${r.group}|${r.id}=${r.value}`)).toEqual(['joint.rifle.lowReady|upperArmL_z=-4']);
    // the shared row and the pistol row were not baked
    expect(p.kept).toBe(2);
    // unversioned reads as version 1
    expect(bakedResetPlan(LEDGER, { values: v1.values }, DEF).reset.length).toBe(1);
  });

  it('bakes already applied are not compared; an empty or junk store or ledger does nothing', () => {
    const store = { version: 2, values: { 'rifle.lowReady': { gunPitch: 0.07 }, walk: { kneeOutMul: 1.25 } } };
    const p = bakedResetPlan(LEDGER, store, DEF, ['20383670bf49817f']);
    expect(p.reset.map((r) => r.group)).toEqual(['walk']);
    expect(p.kept).toBe(1);
    expect(p.fresh).toEqual([ID1]);
    expect(bakedResetPlan(LEDGER, undefined, DEF)).toMatchObject({ reset: [], kept: 0 });
    expect(bakedResetPlan(LEDGER, { version: 2, values: {} }, DEF)).toMatchObject({ reset: [], kept: 0 });
    expect(bakedResetPlan(null, store, DEF)).toMatchObject({ reset: [], kept: 2, fresh: [], ids: [] });
    expect(readBakedLedger({ bakes: [{ hash: 1 }, { hash: 'x', baked: ['a', 2] }, null] })).toEqual([{ hash: 'x', at: '', baked: ['a'] }]);
  });

  it('the notice', () => {
    expect(bakedResetNotice(61, 13)).toBe('61 values are now built in; your other 13 changes are kept.');
    expect(bakedResetNotice(1, 1)).toBe('1 value is now built in; your other 1 change is kept.');
    expect(bakedResetNotice(4, 0)).toBe('4 values are now built in; no other changes.');
    expect(bakedResetNotice(0, 3)).toBe('Reset baked: no tuned value matches a bake; your 3 changes are kept.');
    expect(bakedResetNotice(0, 0)).toBe('Reset baked: no tuned values.');
  });
});

describe('Reset baked: on the registry', () => {
  beforeEach(() => {
    tuneLoad({ version: 2, values: {}, log: [] });
  });

  it('runs once per bake: resets through the registry (logged, saved hook), records the bake ids, keeps a later re-tune', async () => {
    // the store as the panel saves it (tuneSnapshot), after Michael's tuning; -139 was tuned with the wide ranges on
    // (the Keys range is -90 .. 90), so the load clamps it and only the record as saved matches the ledger
    const store = {
      version: 2,
      values: { 'rifle.lowReady': { gunPitch: 0.07, gunYaw: -0.4 }, 'key.jog.0': { armR_twist: -139 }, walk: { kneeOutMul: 1.2 } },
      log: [{ t: '2026-10-21T13:00:00.000Z', group: 'walk', id: 'kneeOutMul', from: 1, to: 1.2 }],
    };
    tuneLoad(store);
    expect(tuneGet('key.jog.0', 'armR_twist')).toBe(-90);
    let saves = 0;
    const hook = TUNE_HOOKS.changed;
    TUNE_HOOKS.changed = () => saves++;
    try {
      const r = tuneBakedReset(LEDGER, { saved: store, now: T0 });
      expect(r).toMatchObject({ reset: 2, kept: 2, ran: true });
      expect(r.notice).toBe('2 values are now built in; your other 2 changes are kept.');
      expect(saves).toBe(2);
    } finally {
      TUNE_HOOKS.changed = hook;
    }
    expect(tuneGet('rifle.lowReady', 'gunPitch')).toBe(0);
    expect(tuneGet('key.jog.0', 'armR_twist')).toBe(0);
    expect(tuneGet('rifle.lowReady', 'gunYaw')).toBe(-0.4);
    expect(tuneGet('walk', 'kneeOutMul')).toBe(1.2);
    expect(TUNE_LOG.slice(1).map((c) => `${c.group}|${c.id} ${c.from}->${c.to}`)).toEqual(['rifle.lowReady|gunPitch 0.07->0', 'key.jog.0|armR_twist -90->0']);
    expect(tuneBakedApplied()).toEqual([ID0, ID1]);
    // the ids ride in the save and load back
    resetAnimTuneDb();
    expect(await saveAnimTune(tuneSnapshot())).toBe(true);
    tuneResetAll();
    tuneLoad(await loadAnimTune());
    expect(tuneBakedApplied()).toEqual([ID0, ID1]);
    // a deliberate re-tune to the baked value survives the next boot's auto step
    tuneSet('rifle.lowReady', 'gunPitch', 0.07, T0 + 5000);
    tuneLoad(JSON.parse(JSON.stringify(tuneSnapshot())));
    expect(tuneBakedReset(LEDGER, { saved: JSON.parse(JSON.stringify(tuneSnapshot())), now: T0 + 9000 })).toMatchObject({ reset: 0, ran: false, notice: '' });
    expect(tuneGet('rifle.lowReady', 'gunPitch')).toBe(0.07);
    // the manual "Reset baked" ignores the record
    expect(tuneBakedReset(LEDGER, { force: true, now: T0 + 12000 })).toMatchObject({ reset: 1, kept: 2, ran: true });
    expect(tuneGet('rifle.lowReady', 'gunPitch')).toBe(0);
  });

  it('an untouched store (no values) does nothing but record the bakes; an import and a reset keep the record', () => {
    let saves = 0;
    const hook = TUNE_HOOKS.changed;
    TUNE_HOOKS.changed = () => saves++;
    try {
      const r = tuneBakedReset(LEDGER, { saved: null, now: T0 });
      expect(r).toMatchObject({ reset: 0, kept: 0, ran: true });
      expect(saves).toBe(0);
      expect(TUNE_LOG).toEqual([]);
    } finally {
      TUNE_HOOKS.changed = hook;
    }
    expect(tuneBakedApplied().length).toBe(2);
    tuneImport({ magic: TUNE_EXPORT_MAGIC, version: 2, exported: '', changed: [], log: [] }, 'x', T0);
    tuneResetAll();
    expect(tuneSnapshot().baked).toEqual([ID0, ID1]);
    // an old save with no record loads with none
    tuneLoad({ version: 2, values: {}, log: [] });
    expect(tuneBakedApplied()).toEqual([]);
    expect(tuneSnapshot().baked).toBeUndefined();
  });
});

describe('Reset baked: two bakes of one export (the hash is the export\'s)', () => {
  /** A literal ledger as this job leaves it: PR #96's bake and the re-bake of the same export share the hash. */
  const LEDGER2 = {
    note: 'anim-bake: exports baked into the code defaults (scripts/anim-tune-bake.mjs); a re-run of one is a no-op',
    bakes: [
      {
        hash: '20383670bf49817f',
        exported: '2026-10-21T14:01:52.215Z',
        at: '2026-10-21T14:08:33.622Z',
        baked: ['rifle.lowReady|gunPitch=0.07', 'rifle.lowReady|gunYaw=-0.41', 'key.jog.0|armL_twist=15', 'key.run.3|time=-5'],
      },
      {
        hash: '20383670bf49817f',
        exported: '2026-10-21T14:01:52.215Z',
        at: '2026-10-21T15:59:38.629Z',
        baked: [
          'idle|trackMul=0.05',
          'idle|elbowOutAdd=0.03',
          'walk|trackMul=0.05',
          'walk|elbowOutAdd=0.03',
          'jog|armSwingMul=1.7',
          'jog|trackMul=0.05',
          'jog|elbowOutAdd=0.03',
          'run|armSwingMul=1.6',
          'run|trackMul=0.05',
          'run|kneeLiftMul=1.55',
          'lowReady|elbowPoleMul=2.25',
          'rifle.lowReady|tuckMul=0.75',
          'pistol.lowReady|tuckMul=0',
        ],
      },
    ],
  };
  const A0 = '20383670bf49817f@2026-10-21T14:08:33.622Z';
  const A1 = '20383670bf49817f@2026-10-21T15:59:38.629Z';
  /** A literal 4.46.x save: the first bake applied (its bare hash), the 13 at their exported values, one other change. */
  const OLD_SAVE = {
    version: 2,
    values: {
      idle: { trackMul: 0.05, elbowOutAdd: 0.03 },
      walk: { trackMul: 0.05, elbowOutAdd: 0.03, kneeOutMul: 1.2 },
      jog: { armSwingMul: 1.7, trackMul: 0.05, elbowOutAdd: 0.03 },
      run: { armSwingMul: 1.6, trackMul: 0.05, kneeLiftMul: 1.55 },
      lowReady: { elbowPoleMul: 2.25 },
      'rifle.lowReady': { tuckMul: 0.75 },
      'pistol.lowReady': { tuckMul: 0 },
    },
    log: [],
    baked: ['20383670bf49817f'],
  };

  it('each bake has its own id; a bare hash stands for the first bake with it only (pure)', () => {
    expect(bakeAppliedIds(readBakedLedger(LEDGER2))).toEqual([A0, A1]);
    // a hand-made ledger with equal times still gets distinct ids
    expect(bakeAppliedIds([{ hash: 'h', at: '', baked: [] }, { hash: 'h', at: '', baked: [] }])).toEqual(['h@', 'h@#1']);
    const DEF2 = (_g: string, id: string): number | undefined => (id.endsWith('Mul') ? 1 : 0);
    const p = bakedResetPlan(LEDGER2, OLD_SAVE, DEF2, OLD_SAVE.baked);
    expect(p.fresh).toEqual([A1]);
    expect(p.reset.length).toBe(13);
    expect(p.kept).toBe(1);
    // a deliberate re-tune to a first-bake value is not wiped by the bare hash (the first bake counts as applied)
    expect(bakedResetPlan(LEDGER2, { version: 2, values: { 'rifle.lowReady': { gunPitch: 0.07 } } }, DEF2, ['20383670bf49817f'])).toMatchObject({ reset: [], kept: 1 });
    // the new ids cover both; no record compares both
    expect(bakedResetPlan(LEDGER2, OLD_SAVE, DEF2, [A0, A1]).fresh).toEqual([]);
    expect(bakedResetPlan(LEDGER2, OLD_SAVE, DEF2).fresh).toEqual([A0, A1]);
  });

  beforeEach(() => {
    tuneLoad({ version: 2, values: {}, log: [] });
  });

  it('a literal 4.46.x save: the 13 reset once on the next load, the other change kept, the second load does nothing', () => {
    const saved = JSON.parse(JSON.stringify(OLD_SAVE));
    tuneLoad(saved);
    expect(tuneGet('jog', 'armSwingMul')).toBe(1.7);
    const r = tuneBakedReset(LEDGER2, { saved, now: T0 });
    expect(r).toMatchObject({ reset: 13, kept: 1, ran: true });
    expect(r.notice).toBe('13 values are now built in; your other 1 change is kept.');
    expect(tuneSnapshot().values).toEqual({ walk: { kneeOutMul: 1.2 } });
    expect(tuneBakedApplied()).toEqual(['20383670bf49817f', A0, A1]);
    // the next load: nothing compared, nothing reset, no notice
    const next = JSON.parse(JSON.stringify(tuneSnapshot()));
    tuneLoad(next);
    expect(tuneBakedReset(LEDGER2, { saved: next, now: T0 + 5000 })).toMatchObject({ reset: 0, kept: 1, ran: false, notice: '' });
    // a re-tune to a baked value survives the auto step; the manual "Reset baked" covers every bake
    tuneSet('jog', 'armSwingMul', 1.7, T0 + 6000);
    tuneSet('rifle.lowReady', 'gunPitch', 0.07, T0 + 7000);
    const again = JSON.parse(JSON.stringify(tuneSnapshot()));
    expect(tuneBakedReset(LEDGER2, { saved: again, now: T0 + 8000 })).toMatchObject({ reset: 0, ran: false });
    expect(tuneBakedReset(LEDGER2, { force: true, now: T0 + 9000 })).toMatchObject({ reset: 2, kept: 1, ran: true });
    expect(tuneSnapshot().values).toEqual({ walk: { kneeOutMul: 1.2 } });
  });
});
