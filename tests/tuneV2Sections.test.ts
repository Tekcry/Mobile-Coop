import { beforeEach, describe, expect, it } from 'vitest';
import { BODY_GROUPS } from '../src/anim/tune';
import { HAND_PARAMS, HAND_WEAPONS, HANDS_HOOKS, HP, handsGet, handsLoad, ikGet } from '../src/anim/tuneHands';
import { J, JOINT_COUNT, jointsGet, jointsLoad, jointsMirror } from '../src/anim/tuneJoints';
import { TUNE_HOOKS, TUNE_SECTIONS, TUNE_STATE_BAG, tuneGet, tuneLoad, tuneSet, tuneSnapshot } from '../src/anim/tuneRegistry';
import { HAND_SECTION, IK_SECTION, JOINT_SECTION, WEAPON_SECTION, tuneV2Frame, tuneV2Mirror, tuneV2SyncAll } from '../src/anim/tuneV2Sections';

beforeEach(() => {
  TUNE_HOOKS.changed = null;
  HANDS_HOOKS.changed = null;
  tuneLoad({ version: 1, values: {}, log: [] });
  jointsLoad(undefined);
  handsLoad(undefined);
});

describe('tuner-v2 sections in the registry', () => {
  it('register after Body, Gun and Camera: Joints, Hands & feet, IK strength, Weapon; unique groups', () => {
    const ids = TUNE_SECTIONS.map((s) => s.id);
    expect(ids.slice(-4)).toEqual(['joint', 'hand', 'ik', 'weapon']);
    expect(ids.indexOf('joint')).toBeGreaterThan(2);
    const groups = TUNE_SECTIONS.flatMap((s) => s.groups);
    expect(new Set(groups).size).toBe(groups.length);
    expect(JOINT_SECTION.groups.length).toBe(BODY_GROUPS.length + 1);
    expect(HAND_SECTION.groups.length).toBe(HAND_WEAPONS.length * BODY_GROUPS.length);
    expect(JOINT_SECTION.tunables.length).toBe(JOINT_COUNT * 3 + 1);
    expect(HAND_SECTION.tunables.length + WEAPON_SECTION.tunables.length).toBe(HAND_PARAMS.length);
    expect(IK_SECTION.tunables.map((t) => t.id)).toEqual(['handL', 'handR', 'footL', 'footR']);
  });

  it('defaults are identity: a sync of every state and weapon leaves every table at its default', () => {
    tuneV2SyncAll();
    for (const b of BODY_GROUPS) {
      for (let j = 0; j < JOINT_COUNT; j++) for (const a of [0, 1, 2] as const) expect(jointsGet(b, j, a)).toBe(0);
      for (let l = 0; l < 4; l++) expect(ikGet(b, l as 0)).toBe(1);
      for (const w of HAND_WEAPONS) for (let p = 0; p < HAND_PARAMS.length; p++) expect(handsGet(w, b, p)).toBe(HAND_PARAMS[p]!.def);
    }
    expect(jointsMirror()).toBe(false);
  });

  it('follow: the frame writes the state bag; a panel value reaches the item 1-2 tables of that state / weapon only', () => {
    tuneSet('joint.walk', 'elbowR_x', 12);
    tuneSet('hand.rifle.aim', 'handRUp', 0.05);
    tuneSet('weapon.rifle.aim', 'gunScale', 1.3);
    tuneSet('ik.aim', 'handR', 0);
    tuneV2Frame('walk', 'none');
    expect(TUNE_STATE_BAG.joint).toBe('joint.walk');
    expect(TUNE_STATE_BAG.hand).toBe('hand.none.walk');
    expect(JOINT_SECTION.select!(TUNE_STATE_BAG)).toBe('joint.walk');
    expect(WEAPON_SECTION.select!(TUNE_STATE_BAG)).toBe('weapon.none.walk');
    expect(jointsGet('walk', J.elbowR, 0)).toBe(12);
    expect(handsGet('rifle', 'aim', HP.handRUp!)).toBe(0); // not active yet
    tuneV2Frame('aim', 'rifle');
    expect(handsGet('rifle', 'aim', HP.handRUp!)).toBe(0.05);
    expect(handsGet('rifle', 'aim', HP.gunScale!)).toBe(1.3);
    expect(handsGet('pistol', 'aim', HP.gunScale!)).toBe(1);
    expect(ikGet('aim', 1)).toBe(0);
    expect(jointsGet('aim', J.elbowR, 0)).toBe(0);
    tuneSet('ik.aim', 'handR', 1);
    tuneV2Frame('aim', 'rifle');
    expect(ikGet('aim', 1)).toBe(1);
    tuneV2Frame('', 'none');
    expect(TUNE_STATE_BAG.joint).toBe('');
    expect(TUNE_STATE_BAG.weapon).toBe('');
  });

  it('mirror lock: a panel edit of one side writes the partner mirrored (table and registry); a load is copied as is', () => {
    tuneSet('joint.options', 'mirror', 1);
    expect(tuneV2Mirror()).toBe(true);
    tuneSet('joint.walk', 'elbowL_y', 10);
    tuneV2Frame('walk', 'none');
    expect(jointsGet('walk', J.elbowL, 1)).toBe(10);
    expect(jointsGet('walk', J.elbowR, 1)).toBe(-10);
    expect(tuneGet('joint.walk', 'elbowR_y')).toBe(-10);
    tuneSet('joint.walk', 'elbowL_x', 6); // pitch is kept
    tuneV2Frame('walk', 'none');
    expect(tuneGet('joint.walk', 'elbowR_x')).toBe(6);
    expect(jointsMirror()).toBe(false); // item 1's own flag stays off (the sync mirrors)
    // an asymmetric save with the lock on loads as saved
    tuneLoad({ version: 1, values: { 'joint.options': { mirror: 1 }, 'joint.run': { kneeL_x: 20, kneeR_x: 4 } }, log: [] });
    tuneV2Frame('run', 'none');
    expect(jointsGet('run', J.kneeL, 0)).toBe(20);
    expect(jointsGet('run', J.kneeR, 0)).toBe(4);
    // a reset of the walk group (both sides at once) is copied as is
    tuneV2Frame('walk', 'none');
    expect(jointsGet('walk', J.elbowL, 1)).toBe(0);
    expect(jointsGet('walk', J.elbowR, 1)).toBe(0);
  });

  it('save / export: the new groups ride the registry snapshot; a literal 4.20 save still loads', () => {
    tuneSet('joint.idle', 'head_y', 15);
    tuneSet('weapon.pistol.aim', 'trigger', 1);
    const snap = JSON.parse(JSON.stringify(tuneSnapshot())) as { values: Record<string, Record<string, number>> };
    expect(snap.values['joint.idle']).toEqual({ head_y: 15 });
    expect(snap.values['weapon.pistol.aim']).toEqual({ trigger: 1 });
    tuneLoad({ version: 1, values: {}, log: [] });
    tuneLoad(snap);
    tuneV2Frame('aim', 'pistol');
    tuneV2Frame('idle', 'none');
    expect(jointsGet('idle', J.head, 1)).toBe(15);
    expect(handsGet('pistol', 'aim', HP.trigger!)).toBe(1);
    // the 4.20 shape (body / gun keys only)
    tuneLoad({ version: 1, values: { walk: { armSwingMul: 1.5 }, 'rifle.aim': {} }, log: [] });
    expect(tuneGet('walk', 'armSwingMul')).toBe(1.5);
    tuneV2SyncAll();
    expect(jointsGet('idle', J.head, 1)).toBe(0);
    expect(handsGet('pistol', 'aim', HP.trigger!)).toBe(0);
  });
});
