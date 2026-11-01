// (anim-joints J2, COVERAGE gap 2) Move and action rows: the row list (keyed by id, old ids unchanged), the pick per
// action from literal poses and from the real anim graph, the A5 composition (identity at w 0, the row at w 1, two rows
// at once), a move-row bake (a literal export, temp copies), the partner's team role from the wire, and the real rig
// (a vault row, a reload row while reloading and not after, nothing live = bit-identical).
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import type { Quaternion } from '../src/core/babylon';
import type { RigPose } from '../src/player/characterRig';
import '../src/anim/tune';
import '../src/anim/tuneV2Sections';
import { BODY_GROUPS } from '../src/anim/tune';
import { TEAM_MOVES, TRAV_KINDS } from '../src/anim/moveTune';
import { TUNE_EXPORT_MAGIC, TUNE_SECTIONS, TUNE_STATE_BAG, tuneImport, tuneLoad, tuneResetAll, tuneSnapshot } from '../src/anim/tuneRegistry';
import { HAND_GROUP_IDS, HAND_SECTION, IK_GROUP_IDS, IK_SECTION, JOINT_GROUP_IDS, WEAPON_GROUP_IDS, WEAPON_SECTION, tuneV2Frame, tuneV2JointRow, tuneV2SyncAll } from '../src/anim/tuneV2Sections';
import { bakeCatalogue, tuneBake, type BakeResult } from '../src/anim/tuneBake';
import { BAKE_RULES } from '../src/anim/tuneBakeTable';
import { BAKE_BASE_FILE, emptyBase, spliceAnimBase } from '../src/anim/tuneBakeBase';
import { ANIM_BASE } from '../src/anim/animBase';
import { J, JOINT_ROWS, eulerQuat, jointRowIndex, jointsBeginRigRows, jointsGet, jointsLoad, jointsLoadFrom, jointsRigState } from '../src/anim/tuneJoints';
import { HANDS_CUR, HP, handsBeginRigRows, handsGroupIndex, handsLoad, handsLoadFrom, handsRigState, handsWeaponIndex } from '../src/anim/tuneHands';
import { animBaseLoad } from '../src/anim/tuneJointsRig';
import {
  ACTION_ROWS,
  MOVE_TEAM_MOVES,
  MOVE_TRAV_KINDS,
  REMOVED_TUNE_ROWS,
  TEAM_WIRE_BITS,
  TUNE_MOVE_MAX,
  TUNE_ROW_IDS,
  TUNE_ROW_INDEX,
  emptyActionWeights,
  isRemovedTuneGroup,
  pickTuneRows,
  teamRowOfWire,
  tuneRowFollow,
  tuneRowPick,
  type TuneMovePoseIn,
} from '../src/anim/tuneMoveRows';
import { HANG_SUB, ROPE_SUB, THROW_SUB } from '../src/game/teamMoves';
import { ATTACH_SUB } from '../src/player/moveState';
import { groupForPath, levelOptions, sharedPrefix } from '../src/ui/tunerLayout';

const ROOT = path.join(__dirname, '..');
const CAT = bakeCatalogue(TUNE_SECTIONS.filter((s) => s.id !== 'keys'));
const TABLE_FILES = [...new Set(BAKE_RULES.flatMap((r) => r.edits.map((e) => e.file)))];
const dirs: string[] = [];
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});
afterEach(() => {
  animBaseLoad(ANIM_BASE);
  tuneResetAll();
  tuneV2SyncAll();
  jointsLoad(undefined);
  handsLoad(undefined);
});

const pose = (o: Partial<TuneMovePoseIn> = {}): TuneMovePoseIn => ({ grounded: true, traverse: 'none', landing: 0, melee: -1, reload: -1, swap: -1, grenade: -1, tuneTeam: '', ...o });
const rowsOf = (p: ReturnType<typeof tuneRowPick>): [string, number][] => Array.from({ length: p.n }, (_, k) => [p.ids[k]!, p.w[k]!]);

describe('anim-joints J2: the row list', () => {
  it('starts with the body states (indices unchanged), then the move rows, then the action rows; lists equal moveTune', () => {
    expect(TUNE_ROW_IDS.slice(0, BODY_GROUPS.length)).toEqual([...BODY_GROUPS]);
    expect(MOVE_TRAV_KINDS).toEqual([...TRAV_KINDS, 'brace']);
    expect(MOVE_TEAM_MOVES).toEqual([...TEAM_MOVES]);
    expect(TUNE_ROW_IDS).toContain('trav.vault');
    expect(TUNE_ROW_IDS).toContain('trav.brace');
    expect(TUNE_ROW_IDS).toContain('team.boost.b');
    expect(TUNE_ROW_IDS).toContain('team.revive.a');
    expect(TUNE_ROW_IDS.slice(-ACTION_ROWS.length)).toEqual(['air', 'land', 'melee', 'reload', 'swap', 'throw', 'hit']);
    // (anim-n3b) the dash-in slide's row is gone with its move
    expect(TUNE_ROW_IDS).not.toContain('slide');
    expect(new Set(TUNE_ROW_IDS).size).toBe(TUNE_ROW_IDS.length);
    // the prototype is null: 'constructor' is no row
    expect(TUNE_ROW_INDEX.constructor).toBeUndefined();
  });

  it('keys the four sections by row id: new group ids, the old ones unchanged and in place', () => {
    for (const g of ['joint.trav.vault', 'joint.team.boost.b', 'joint.reload', 'joint.air']) expect(JOINT_GROUP_IDS).toContain(g);
    for (const g of ['hand.rifle.reload', 'hand.none.trav.vault', 'hand.pistol.team.rope.a']) expect(HAND_GROUP_IDS.flat()).toContain(g);
    for (const g of ['ik.air', 'ik.trav.mantle', 'ik.team.hang.b']) expect(IK_GROUP_IDS).toContain(g);
    for (const g of ['weapon.pistol.throw', 'weapon.rifle.swap']) expect(WEAPON_GROUP_IDS.flat()).toContain(g);
    // old ids: the body states first, then the per-gun Joints rows, as before J2
    expect(JOINT_GROUP_IDS.slice(0, BODY_GROUPS.length)).toEqual(BODY_GROUPS.map((b) => `joint.${b}`));
    expect(JOINT_GROUP_IDS[BODY_GROUPS.length]).toBe('joint.rifle.lowReady');
    expect(IK_GROUP_IDS.slice(0, BODY_GROUPS.length)).toEqual(BODY_GROUPS.map((b) => `ik.${b}`));
    expect(HAND_GROUP_IDS[1]!.slice(0, BODY_GROUPS.length)).toEqual(BODY_GROUPS.map((b) => `hand.rifle.${b}`));
    // registered: the registry owns every new group (A's panel lists the registry's groups)
    const sec = (id: string) => TUNE_SECTIONS.find((s) => s.id === id)!;
    expect(sec('joint').groups).toContain('joint.team.boost.b');
    expect(sec('hand').groups).toContain('hand.rifle.reload');
    expect(sec('ik').groups).toContain('ik.air');
    expect(sec('weapon').groups).toContain('weapon.pistol.throw');
  });

  it("the panel's pickers reach a move row (tunerLayout: the levels split on the dots)", () => {
    const groups = TUNE_SECTIONS.find((s) => s.id === 'joint')!.groups;
    const pre = sharedPrefix(groups);
    expect(levelOptions(groups, pre, [], 0)).toEqual(expect.arrayContaining(['idle', 'rifle', 'trav', 'team', 'reload', 'air']));
    expect(levelOptions(groups, pre, ['team'], 1)).toEqual(['boost', 'relay', 'throw', 'hang', 'rope', 'revive']);
    expect(groupForPath(groups, pre, ['team', 'boost', 'b'])).toBe('joint.team.boost.b');
    expect(groupForPath(groups, pre, ['trav', 'vault'])).toBe('joint.trav.vault');
    expect(groupForPath(groups, pre, ['reload'])).toBe('joint.reload');
    const hands = TUNE_SECTIONS.find((s) => s.id === 'hand')!.groups;
    expect(groupForPath(hands, sharedPrefix(hands), ['rifle', 'reload'])).toBe('hand.rifle.reload');
  });
});

describe('anim-joints J2: the pick', () => {
  it('from literal poses (no graph): each move and action, swap apart from a grenade throw, the stance kept', () => {
    const p = tuneRowPick();
    expect(rowsOf(pickTuneRows(pose({ traverse: 'vault' }), null, '', p))).toEqual([['trav.vault', 1]]);
    expect(p.stance).toBe('');
    expect(rowsOf(pickTuneRows(pose({ traverse: 'brace', tuneTeam: 'team.boost.b' }), null, 'crouchIdle', p))).toEqual([
      ['trav.brace', 1],
      ['team.boost.b', 1],
    ]);
    expect(p.stance).toBe('crouchIdle');
    expect(p.stanceIdx).toBe(BODY_GROUPS.indexOf('crouchIdle'));
    expect(rowsOf(pickTuneRows(pose({ grounded: false }), null, 'run', p))).toEqual([['air', 1]]);
    expect(rowsOf(pickTuneRows(pose({ landing: 0.8 }), null, 'idle', p))).toEqual([['land', 1]]);
    expect(rowsOf(pickTuneRows(pose({ melee: 0.4 }), null, 'idle', p))).toEqual([['melee', 1]]);
    expect(rowsOf(pickTuneRows(pose({ reload: 0.1 }), null, 'lowReady', p))).toEqual([['reload', 1]]);
    expect(rowsOf(pickTuneRows(pose({ swap: 0.5 }), null, 'idle', p))).toEqual([['swap', 1]]);
    expect(rowsOf(pickTuneRows(pose({ grenade: 0.5 }), null, 'idle', p))).toEqual([['throw', 1]]);
    expect(rowsOf(pickTuneRows(pose(), null, 'walk', p))).toEqual([]);
    expect(tuneRowFollow(p)).toBe(BODY_GROUPS.indexOf('walk'));
    // a team role id that is no row, and a traversal kind with a body state (a ladder climb): no move row
    expect(rowsOf(pickTuneRows(pose({ traverse: 'climb', tuneTeam: 'team.nope.a' }), null, 'ladder', p))).toEqual([]);
    // a move row id passed as the stance: no stance
    pickTuneRows(pose(), null, 'reload', p);
    expect(p.stanceIdx).toBe(-1);
  });

  it("from the graph's weights: strongest first, at most 3, ties in row order; the follow from 0.5", () => {
    const p = tuneRowPick();
    const w = emptyActionWeights();
    w.reload = 0.3;
    pickTuneRows(pose({ reload: 0.1 }), w, 'aim', p);
    expect(rowsOf(p)).toEqual([['reload', 0.3]]);
    expect(tuneRowFollow(p)).toBe(BODY_GROUPS.indexOf('aim')); // below 0.5: the stance row
    w.reload = 0.6;
    pickTuneRows(pose(), w, 'aim', p);
    expect(tuneRowFollow(p)).toBe(TUNE_ROW_INDEX.reload);
    // five at once: the three strongest; a tie keeps the row order (air before land)
    Object.assign(w, { air: 0.4, land: 0.4, melee: 0.0005, reload: 0.9, swap: 0.1, throw: 0, hit: 0.7 });
    pickTuneRows(pose({ traverse: 'none' }), w, 'run', p);
    expect(rowsOf(p)).toEqual([
      ['reload', 0.9],
      ['hit', 0.7],
      ['air', 0.4],
    ]);
    expect(p.n).toBe(TUNE_MOVE_MAX);
    // the traversal and the team role (weight 1) go first
    pickTuneRows(pose({ traverse: 'mantle', tuneTeam: 'team.relay.a' }), w, '', p);
    expect(rowsOf(p)).toEqual([
      ['trav.mantle', 1],
      ['team.relay.a', 1],
      ['reload', 0.9],
    ]);
    // the unused slots are cleared
    pickTuneRows(pose(), emptyActionWeights(), 'idle', p);
    expect(p.n).toBe(0);
    expect(Array.from(p.idx)).toEqual([-1, -1, -1]);
    expect(p.ids).toEqual(['', '', '']);
  });

  it('allocates nothing: the result, its arrays and id strings are reused', () => {
    const p = tuneRowPick();
    const { idx, w, ids } = p;
    const wts = emptyActionWeights();
    const a = pose({ traverse: 'vault', reload: 0.2 });
    for (let k = 0; k < 1000; k++) {
      wts.reload = (k % 10) / 10;
      wts.hit = ((k * 7) % 10) / 10;
      expect(pickTuneRows(a, wts, 'idle', p)).toBe(p);
    }
    expect(p.idx).toBe(idx);
    expect(p.w).toBe(w);
    expect(p.ids).toBe(ids);
    expect(ids.length).toBe(TUNE_MOVE_MAX);
  });

  it("the co-op partner's team role from its move mode and sub on the wire (no wire change)", () => {
    expect(TEAM_WIRE_BITS).toEqual({ rope: ROPE_SUB, hang: HANG_SUB, throw: THROW_SUB, relay: ATTACH_SUB.relay });
    expect(teamRowOfWire('brace', 0)).toBe('team.boost.b');
    expect(teamRowOfWire('boost', 0)).toBe('team.boost.a');
    expect(teamRowOfWire('brace', THROW_SUB)).toBe('team.throw.b');
    expect(teamRowOfWire('boost', THROW_SUB)).toBe('team.throw.a');
    expect(teamRowOfWire('brace', HANG_SUB)).toBe('team.hang.b');
    expect(teamRowOfWire('boost', HANG_SUB)).toBe('team.hang.a');
    expect(teamRowOfWire('brace', ROPE_SUB)).toBe('team.rope.b');
    expect(teamRowOfWire('boost', ROPE_SUB)).toBe('team.rope.a');
    expect(teamRowOfWire('ledge', ATTACH_SUB.relay | 1)).toBe('team.relay.b');
    expect(teamRowOfWire('ledge', 1)).toBe('');
    expect(teamRowOfWire('ground', 0)).toBe('');
    for (const r of ['team.boost.a', 'team.boost.b', 'team.throw.a', 'team.relay.b']) expect(TUNE_ROW_INDEX[r]).toBeGreaterThan(0);
  });
});

/** The quaternion of [x, y, z] degrees. */
const qOf = (x: number, y: number, z: number): number[] => {
  const o = new Float64Array(4);
  eulerQuat((x * Math.PI) / 180, (y * Math.PI) / 180, (z * Math.PI) / 180, o, 0);
  return Array.from(o);
};
const mul = (a: number[], b: number[]): number[] => {
  const [ax, ay, az, aw] = a as [number, number, number, number];
  const [bx, by, bz, bw] = b as [number, number, number, number];
  return [aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx, aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz];
};
const nlerpI = (q: number[], w: number): number[] => {
  const s = q[3]! < 0 ? -w : w;
  const r = [q[0]! * s, q[1]! * s, q[2]! * s, q[3]! * s + (1 - w)];
  const l = Math.sqrt(r[0]! * r[0]! + r[1]! * r[1]! + r[2]! * r[2]! + r[3]! * r[3]!);
  return r.map((v) => v / l);
};
const curOf = (cur: Float64Array, j: number): number[] => Array.from(cur.slice(j * 4, j * 4 + 4));
const expectQ = (got: number[], want: number[]): void => {
  const d = Math.abs(got[0]! * want[0]! + got[1]! * want[1]! + got[2]! * want[2]! + got[3]! * want[3]!);
  expect(d).toBeGreaterThan(1 - 1e-12);
};

describe('anim-joints J2: the composition (A5)', () => {
  it('Joints: identity at w 0, the row exactly at w 1 over no stance, stance x nlerp per row, two rows at once', () => {
    animBaseLoad({ version: 1, joints: { idle: { elbowR: [10, 0, 0] }, 'trav.vault': { elbowR: [40, 0, 0], kneeL: [0, 0, 20] }, reload: { elbowR: [0, 30, 0] } }, hands: {}, ik: {} });
    const st = jointsRigState();
    const vault = jointRowIndex('trav.vault');
    const reload = jointRowIndex('reload');
    const idle = jointRowIndex('idle');
    const rows = new Int16Array([vault, reload, -1]);
    const w = new Float64Array([0, 0, 0]);
    // w 0, no stance: nothing applied, the window off
    jointsBeginRigRows(st, -1, rows, w, 2, Infinity);
    expect(st.any).toBe(false);
    // w 1, no stance (a traversal move): the row's quaternion exactly
    w[0] = 1;
    jointsBeginRigRows(st, -1, rows, w, 1, Infinity);
    expect(curOf(st.cur, J.elbowR)).toEqual(qOf(40, 0, 0));
    expect(curOf(st.cur, J.kneeL)).toEqual(qOf(0, 0, 20));
    expect(st.live[J.elbowL]).toBe(0);
    // over the idle stance at w 0: the stance row exactly (J1)
    w[0] = 0;
    jointsBeginRigRows(st, idle, rows, w, 2, Infinity);
    expect(curOf(st.cur, J.elbowR)).toEqual(qOf(10, 0, 0));
    expect(st.live[J.kneeL]).toBe(0);
    // stance x nlerp(I, vault, 0.5) x nlerp(I, reload, 0.25)
    w[0] = 0.5;
    w[1] = 0.25;
    jointsBeginRigRows(st, idle, rows, w, 2, Infinity);
    expectQ(curOf(st.cur, J.elbowR), mul(mul(qOf(10, 0, 0), nlerpI(qOf(40, 0, 0), 0.5)), nlerpI(qOf(0, 30, 0), 0.25)));
    expectQ(curOf(st.cur, J.kneeL), nlerpI(qOf(0, 0, 20), 0.5));
    // eased: one frame of dt moves part of the way toward the full rows
    const before = curOf(st.cur, J.elbowR);
    w[0] = 1;
    w[1] = 1;
    jointsBeginRigRows(st, idle, rows, w, 2, 1 / 60);
    const full = mul(mul(qOf(10, 0, 0), qOf(40, 0, 0)), qOf(0, 30, 0));
    const step = curOf(st.cur, J.elbowR);
    expect(step).not.toEqual(before);
    expect(Math.abs(step[0]! * full[0]! + step[1]! * full[1]! + step[2]! * full[2]! + step[3]! * full[3]!)).toBeLessThan(1 - 1e-6);
  });

  it('Hands & feet, Weapon and IK: offsets stance + w x move, gun scale and IK stance x lerp(1, move, w), the trigger from w 0.5', () => {
    animBaseLoad({
      version: 1,
      joints: {},
      hands: { rifle: { aim: { handRFwd: 0.1, gunScale: 1.5, trigger: 1 }, reload: { handRFwd: 0.2, gunScale: 2, trigger: -1 }, hit: { handRFwd: -0.04 } } },
      ik: { aim: [1, 0.5, 1, 1], reload: [0, 1, 1, 1] },
    });
    const st = handsRigState();
    const wi = handsWeaponIndex('rifle');
    const aim = handsGroupIndex('aim');
    const rows = new Int16Array([TUNE_ROW_INDEX.reload!, TUNE_ROW_INDEX.hit!, -1]);
    const w = new Float64Array([0.25, 1, 0]);
    handsBeginRigRows(st, aim, wi, rows, w, 2, Infinity);
    expect(st.cur[HP.handRFwd!]).toBeCloseTo(0.1 + 0.25 * 0.2 - 0.04, 12);
    expect(st.cur[HP.gunScale!]).toBeCloseTo(1.5 * (1 + (2 - 1) * 0.25), 12);
    expect(st.cur[HP.trigger!]).toBe(1); // reload at 0.25: the stance's trigger
    expect(st.ikCur[0]).toBeCloseTo(1 * (1 + (0 - 1) * 0.25), 12);
    expect(st.ikCur[1]).toBe(0.5);
    expect(HANDS_CUR.on).toBe(true);
    w[0] = 0.5;
    handsBeginRigRows(st, aim, wi, rows, w, 2, Infinity);
    expect(st.cur[HP.trigger!]).toBe(-1); // from 0.5 the move row's (not auto)
    // w 0: the stance row exactly
    w[0] = 0;
    w[1] = 0;
    handsBeginRigRows(st, aim, wi, rows, w, 2, Infinity);
    expect(st.cur[HP.handRFwd!]).toBe(0.1);
    expect(st.cur[HP.gunScale!]).toBe(1.5);
    expect(st.ikCur[0]).toBe(1);
    // a move row over no stance
    w[0] = 1;
    handsBeginRigRows(st, -1, wi, rows, w, 1, Infinity);
    expect(st.cur[HP.handRFwd!]).toBe(0.2);
    expect(st.cur[HP.gunScale!]).toBe(2);
    expect(st.ikCur[0]).toBe(0);
  });

  it("the panel follow: the strongest move row at 0.5 or more, the move rows synced every frame", () => {
    const p = tuneRowPick();
    pickTuneRows(pose({ traverse: 'vault' }), null, '', p);
    tuneV2Frame('', 'rifle', p);
    expect(TUNE_STATE_BAG.joint).toBe('joint.trav.vault');
    expect(TUNE_STATE_BAG.hand).toBe('hand.rifle.trav.vault');
    expect(TUNE_STATE_BAG.ik).toBe('ik.trav.vault');
    expect(TUNE_STATE_BAG.weapon).toBe('weapon.rifle.trav.vault');
    expect(tuneV2JointRow()).toBe('trav.vault');
    const w = emptyActionWeights();
    w.reload = 0.4;
    pickTuneRows(pose(), w, 'aimStill', p);
    tuneV2Frame('aimStill', 'pistol', p);
    expect(TUNE_STATE_BAG.joint).toBe('joint.pistol.aimStill'); // below 0.5: the stance (the gun's own row)
    w.reload = 0.9;
    pickTuneRows(pose(), w, 'aimStill', p);
    tuneV2Frame('aimStill', 'pistol', p);
    expect(TUNE_STATE_BAG.joint).toBe('joint.reload');
    expect(TUNE_STATE_BAG.hand).toBe('hand.pistol.reload');
    tuneV2Frame('aimStill', 'pistol', null);
    expect(TUNE_STATE_BAG.joint).toBe('joint.pistol.aimStill');
  });
});

// A literal export with move and action rows (as the tuner writes it, version 2).
const MOVE_EXPORT = JSON.parse(`{
  "magic": "night-shift-anim-tune",
  "version": 2,
  "exported": "2026-10-21T18:30:00.000Z",
  "changed": [
    { "group": "joint.trav.vault", "id": "elbowR_x", "label": "elbowR pitch", "kind": "add", "unit": "deg", "value": 35, "default": 0 },
    { "group": "hand.rifle.reload", "id": "handLFwd", "label": "handL IK target fwd", "kind": "add", "unit": "m", "value": 0.04, "default": 0 },
    { "group": "ik.air", "id": "footR", "label": "footR IK strength (0 = FK: rest + joint offsets)", "kind": "mul", "unit": "x", "value": 0.5, "default": 1 },
    { "group": "joint.team.boost.b", "id": "shoulderL_z", "label": "shoulderL roll", "kind": "add", "unit": "deg", "value": -12.5, "default": 0 },
    { "group": "weapon.pistol.throw", "id": "gunScale", "label": "gun scale (visual only)", "kind": "mul", "unit": "x", "value": 0.8, "default": 1 }
  ],
  "log": []
}`) as unknown;

const MOVE_BASE = `{
  "version": 1,
  "joints": {
    "team.boost.b": { "shoulderL": [0, 0, -12.5] },
    "trav.vault": { "elbowR": [35, 0, 0] }
  },
  "hands": {
    "pistol": {
      "throw": { "gunScale": 0.8 }
    },
    "rifle": {
      "reload": { "handLFwd": 0.04 }
    }
  },
  "ik": {
    "air": [1, 1, 1, 0.5]
  }
}
`;

describe('anim-joints J2: move rows bake like any row', () => {
  it('a literal export with move and action rows bakes into the base table, and loads back onto those rows', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'anim-move-'));
    dirs.push(dir);
    for (const f of [...TABLE_FILES, BAKE_BASE_FILE]) {
      mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
      cpSync(path.join(ROOT, f), path.join(dir, f));
      // (anim-bake-1022) the generated table is no longer empty: the literal MOVE_BASE assumes an untuned base
      if (f === BAKE_BASE_FILE) writeFileSync(path.join(dir, f), spliceAnimBase(readFileSync(path.join(dir, f), "utf8"), emptyBase()));
    }
    const read = (p: string): string | null => (existsSync(path.join(dir, p)) ? readFileSync(path.join(dir, p), 'utf8') : null);
    const r: BakeResult = tuneBake(MOVE_EXPORT, CAT, read);
    expect(r.ok, r.error).toBe(true);
    for (const w of r.writes) writeFileSync(path.join(dir, w.path), w.after);
    expect(r.rows.every((x) => x.result === 'baked (base table)')).toBe(true);
    expect(r.rows.find((x) => x.group === 'joint.trav.vault')!.target).toBe('src/anim/animBase.ts: joints.trav.vault.elbowR[0] + (deg, wrapped)');
    expect(r.rows.find((x) => x.group === 'hand.rifle.reload')!.target).toBe('src/anim/animBase.ts: hands.rifle.reload.handLFwd +');
    const text = read(BAKE_BASE_FILE)!.replace(/\r\n/g, '\n');
    const json = text.slice(text.indexOf('\n', text.indexOf('// @anim-base-begin')) + 1, text.lastIndexOf('\n', text.indexOf('// @anim-base-end')) + 1);
    expect(json).toBe(MOVE_BASE);
    // the runtime loads it with nothing unknown
    expect(animBaseLoad(JSON.parse(json))).toEqual([]);
  });
});

// ------------------------------------------------------------------------------------------
// The real rig
// ------------------------------------------------------------------------------------------

const NODES = ['hips', 'spine', 'torso', 'neck', 'headNode', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR'] as const;
type RigPoseLit = RigPose;
interface Run {
  /** Bone rotations per frame mark. */
  at: Record<number, Record<string, number[]>>;
  /** The rig's picked rows per frame mark. */
  rows: Record<number, string[]>;
}

/** One Wren rig (or not) animated for `frames` frames with `poseAt(frame)`, its bones and pick recorded at `marks`. */
async function runRig(wren: boolean, frames: number, poseAt: (f: number) => RigPoseLit, marks: readonly number[], hit = -1): Promise<Run> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { defaultLook } = await import('../src/player/avatarLook');
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const rg = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook(), 1.75, 'm0');
  rg.carrier = true;
  rg.tuneRows = wren;
  // (anim-bake-1022) both rigs hold Wren's ready poses, so only the tuner rows differ
  rg.graph.wrenReady = true;
  const out: Run = { at: {}, rows: {} };
  for (let f = 0; f <= frames; f++) {
    if (f === hit) rg.hit(1, 0);
    rg.animate(1 / 60, poseAt(f));
    if (marks.includes(f)) {
      const o: Record<string, number[]> = {};
      for (const n of NODES) {
        const q = (rg as unknown as Record<string, { rotationQuaternion: Quaternion }>)[n]!.rotationQuaternion;
        o[n] = [q.x, q.y, q.z, q.w];
      }
      out.at[f] = o;
      const p = rg.tuneSt?.pick;
      out.rows[f] = p ? Array.from({ length: p.n }, (_, k) => `${p.ids[k]}:${p.w[k]!.toFixed(2)}`) : [];
    }
  }
  rg.dispose();
  scene.dispose();
  vi.restoreAllMocks();
  return out;
}

const still = (o: Partial<RigPoseLit> = {}): RigPoseLit => ({ speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing', ...o });
const angle = (a: number[], b: number[]): number => (2 * Math.acos(Math.min(1, Math.abs(a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]! + a[3]! * b[3]!))) * 180) / Math.PI;

describe('anim-joints J2: the real rig', () => {
  // the vault (frames 0-59, the loop's clock), then standing (60-150)
  const vaultPose = (f: number): RigPoseLit => (f < 60 ? still({ traverse: 'vault', traverseT: f / 60 }) : still());
  // a reload (frames 0-89), then standing
  const reloadPose = (f: number): RigPoseLit => (f < 90 ? still({ reload: f / 90 }) : still());

  it('nothing live: a Wren rig through a vault and a reload is bit-identical to a rig without the flag', async () => {
    animBaseLoad(emptyBase()); // (anim-bake-1022) test-local: the generated table is no longer empty
    const a = await runRig(true, 150, (f) => (f < 75 ? vaultPose(f) : reloadPose(f - 75)), [30, 100, 150]);
    const b = await runRig(false, 150, (f) => (f < 75 ? vaultPose(f) : reloadPose(f - 75)), [30, 100, 150]);
    expect(a.at).toEqual(b.at);
    expect(a.rows[30]).toEqual(['trav.vault:1.00']);
  });

  it('a trav.vault base row turns the elbow during the vault and not after', async () => {
    animBaseLoad(emptyBase()); // (anim-bake-1022) the baseline from an empty base (the generated one has idle rows)
    const base = await runRig(true, 150, vaultPose, [30, 150]);
    animBaseLoad({ version: 1, joints: { 'trav.vault': { elbowR: [40, 0, 0] } }, hands: {}, ik: {} });
    const row = await runRig(true, 150, vaultPose, [30, 150]);
    expect(angle(row.at[30]!.elbowR!, base.at[30]!.elbowR!)).toBeGreaterThan(20);
    expect(row.at[30]!.elbowL).toEqual(base.at[30]!.elbowL);
    expect(row.at[150]).toEqual(base.at[150]); // after: eased back to identity, bit-exact
  });

  it('a reload base row shows while reloading (the graph\'s reload weight) and not after', async () => {
    animBaseLoad(emptyBase()); // (anim-bake-1022) the baseline from an empty base (the generated one has idle rows)
    const base = await runRig(true, 200, reloadPose, [45, 200]);
    expect(base.rows[45]).toEqual(['reload:1.00']);
    expect(base.rows[200]).toEqual([]);
    animBaseLoad({ version: 1, joints: { reload: { elbowL: [0, 35, 0] } }, hands: {}, ik: {} });
    const row = await runRig(true, 200, reloadPose, [45, 200]);
    expect(angle(row.at[45]!.elbowL!, base.at[45]!.elbowL!)).toBeGreaterThan(15);
    expect(row.at[200]).toEqual(base.at[200]);
  });

  it("the hit row: the flinch spring's weight, gone as it settles", async () => {
    const r = await runRig(true, 120, () => still(), [8, 120], 0);
    expect(r.rows[8]![0]).toMatch(/^hit:/);
    expect(Number(r.rows[8]![0]!.split(':')[1])).toBeGreaterThan(0.5);
    expect(r.rows[120]).toEqual([]);
  });

  it('JOINT_ROWS keeps the per-gun rows for the armed states only, the move rows once', () => {
    expect(JOINT_ROWS.filter((r) => r.startsWith('rifle.') || r.startsWith('pistol.')).length).toBe(10);
    expect(JOINT_ROWS.filter((r) => r === 'trav.vault').length).toBe(1);
    expect(JOINT_ROWS.some((r) => r.startsWith('rifle.reload'))).toBe(false);
  });
});

describe('anim-n3b: the deleted dash-in slide row', () => {
  it('names only the removed rows of the row tables (not the wall slide, not other sections)', () => {
    expect(REMOVED_TUNE_ROWS).toEqual(['slide']);
    for (const g of ['joint.slide', 'ik.slide', 'hand.rifle.slide', 'weapon.pistol.slide']) expect(isRemovedTuneGroup(g)).toBe(true);
    for (const g of ['joint.reload', 'joint.wallSlide', 'joint.rifle.aim', 'hand.rifle.reload', 'ik.air', 'step.walk', 'slide', 'joint.slide.x', 'body.slide']) expect(isRemovedTuneGroup(g)).toBe(false);
  });

  it('an old export and an old save that still carry the slide rows load: those rows are dropped, the rest applies', () => {
    const hp = HAND_SECTION.tunables[0]!.id;
    const wp = WEAPON_SECTION.tunables[0]!.id;
    const ik = IK_SECTION.tunables[0]!.id;
    // a literal export from before anim-n3b (version 2, the slide action row present)
    const OLD = {
      magic: TUNE_EXPORT_MAGIC,
      version: 2,
      exported: '2026-10-21T08:00:00.000Z',
      changed: [
        { group: 'joint.slide', id: 'elbowR_x', label: 'elbowR pitch', kind: 'add', unit: 'deg', value: 12, default: 0 },
        { group: 'ik.slide', id: ik, label: '', kind: 'mul', unit: 'x', value: 0.5, default: 1 },
        { group: 'hand.rifle.slide', id: hp, label: '', kind: 'add', unit: 'm', value: 0.01, default: 0 },
        { group: 'weapon.pistol.slide', id: wp, label: '', kind: 'add', unit: 'm', value: 0.01, default: 0 },
        { group: 'joint.reload', id: 'elbowR_x', label: 'elbowR pitch', kind: 'add', unit: 'deg', value: 7, default: 0 },
      ],
      log: [],
      joints: { version: 1, mirror: false, values: { slide: { elbowR: [12, 0, 0] }, reload: { elbowR: [7, 0, 0] } } },
      hands: { values: { rifle: { slide: { [hp]: 0.01 } } }, ik: { slide: [0.5, 1, 1, 1] } },
    };
    const r = tuneImport(JSON.parse(JSON.stringify(OLD)));
    expect(r).toMatchObject({ ok: true, error: '', applied: 1, pending: 0 });
    expect(() => jointsLoadFrom(OLD)).not.toThrow();
    expect(jointsGet('reload', J.elbowR, 0)).toBe(7);
    expect(() => handsLoadFrom(OLD)).not.toThrow();
    let snap = tuneSnapshot();
    expect(Object.keys(snap.values).some(isRemovedTuneGroup)).toBe(false);
    expect(snap.values['joint.reload']).toEqual({ elbowR_x: 7 });
    // a saved snapshot (IndexedDB) from before: the same
    tuneLoad({ version: 2, values: { 'joint.slide': { elbowR_x: 12 }, 'ik.slide': { [ik]: 0.5 }, 'joint.reload': { elbowR_x: 5 } }, log: [] });
    snap = tuneSnapshot();
    expect(Object.keys(snap.values).some(isRemovedTuneGroup)).toBe(false);
    expect(snap.values['joint.reload']).toEqual({ elbowR_x: 5 });
  });
});
