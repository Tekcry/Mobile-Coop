// (pose-parity, spare job 6) What a player sees of their partner matches the partner's own page: the aim side on the
// wire in every mode (PF.aimLeft), the takedown's "no blow" (-1) reaching the partner, and the baked move sections and
// Body root offsets read by the partner's rig (base values only, never the viewer's live tuner).
import { afterEach, describe, expect, it } from 'vitest';
import '../src/anim/moveTune';
import { ANIM_BASE } from '../src/anim/animBase';
import { TUNE_FLAGS, tuneBaseLoad, tuneResetAll, tuneSet } from '../src/anim/tuneRegistry';
import { moveTuneBegin, moveTuneEnd, moveTuneRoot, moveTuneSelect, moveTuneSelectBase, teamContactKOfWire, trapezoid } from '../src/anim/moveTune';
import { bodyRigRoot, bodyRigState, bodyRigWallGap, BODY_BASE_FIELDS } from '../src/anim/tune';
import { teamRowOfWire } from '../src/anim/tuneMoveRows';
import { killWarp, TAKEDOWN_BLOW } from '../src/anim/strikeBody';
import { emptyMovePose, emptyMoveState, packMoveState, poseFromMoveState, sanitizeMoveState, TAKEDOWN_SUB_BLOW, type MoveState } from '../src/player/moveState';
import { localMoveState } from '../src/game/localMoveState';
import { localFlags } from '../src/net/netShared';
import { parseMessage, PF } from '../src/net/protocol';
import { WEAPON_IDS } from '../src/weapons/weaponDefs';
import type { GameState } from '../src/game/gameState';

afterEach(() => {
  TUNE_FLAGS.bypass = false;
  tuneBaseLoad(ANIM_BASE.sections);
  tuneResetAll();
  moveTuneSelect('', 0, 'none', false);
});

/** A GameState with only what localFlags / localMoveState read (the rest of the game is not needed). */
function fakeGame(o: { shoulder?: number; switchOk?: boolean; wall?: boolean; blowPh?: number; takedown?: boolean } = {}): GameState {
  const g = {
    player: {
      alive: true,
      ads: true,
      controller: { crouched: false, isRolling: false, grounded: true, steps: 'normal', override: null, paceBand: 0, yaw: 0, landT: 0, lastLanding: 'soft' },
      pose: { traverse: 'none', traverseT: 0 },
      carry: { raise: 1, w: { low: 0, high: 1, compressed: 0 } },
      cam: { yaw: 0, shoulder: o.shoulder ?? 1 },
    },
    weapons: { firingRecently: false, lastShotQuiet: false, handSwitchOk: o.switchOk ?? true, drawPhase: 2 },
    wallCore: o.wall ? { active: true, seg: 0, s: 0, sub: () => 0, leftHand: false, phase: 'on', t: 0, enterDur: 1 } : null,
    team: { mode: '' },
    takedown: { active: o.takedown ? { e: { id: 'e1' } } : null, hostage: false, blowPh: o.blowPh ?? -1 },
    strike: { active: false },
    doorPeek: { active: false },
    optic: { core: { active: false } },
    traversal: { attached: false, committed: null },
  };
  return g as unknown as GameState;
}

describe('the wire (protocol 36)', () => {
  it('PF.aimLeft reuses the free old sprint bit 64', () => {
    expect(PF.aimLeft).toBe(64);
    const others = Object.entries(PF).filter(([k]) => k !== 'aimLeft').map(([, v]) => v);
    for (const v of others) expect(v & PF.aimLeft).toBe(0);
  });

  it('the flag survives the player-state parse (flags clamp 0..2047)', () => {
    const m = parseMessage({ t: 'pstate', s: { id: 'P', x: 0, y: 0, z: 0, yaw: 0, pitch: 0, speed: 0, f: PF.aimLeft | PF.grounded, w: WEAPON_IDS[0], hp: 100 } });
    expect(m && m.t === 'pstate' ? m.s.f : -1).toBe(PF.aimLeft | PF.grounded);
  });
});

describe('gap 1: the aim side in every mode (PF.aimLeft)', () => {
  it('localFlags sets aimLeft by the owner\'s openLeft rule: left shoulder, hand switch allowed, off the wall', () => {
    expect(localFlags(fakeGame({ shoulder: -1 })) & PF.aimLeft).toBe(PF.aimLeft);
    expect(localFlags(fakeGame({ shoulder: 1 })) & PF.aimLeft).toBe(0);
    expect(localFlags(fakeGame({ shoulder: -1, switchOk: false })) & PF.aimLeft).toBe(0);
    // on the wall the edge's own left-hand bit decides (WALL_SUB.leftHand), as the owner's `w.leftHand || (!w.active && ...)`
    expect(localFlags(fakeGame({ shoulder: -1, wall: true })) & PF.aimLeft).toBe(0);
  });

  it('the flag is set in a mode that returns before the ground branch (a takedown), where the old sub bit never was', () => {
    const g = fakeGame({ shoulder: -1, takedown: true, blowPh: 0.5 });
    expect(localFlags(g) & PF.aimLeft).toBe(PF.aimLeft);
    const mv = localMoveState(g, emptyMoveState());
    expect(mv.m).toBe('takedown');
  });

  it('the ground MoveState no longer carries sub bit 128 (one source: the flag)', () => {
    const mv = localMoveState(fakeGame({ shoulder: -1 }), emptyMoveState());
    expect(mv.m).toBe('ground');
    expect(mv.sub & 128).toBe(0);
    expect(poseFromMoveState({ ...mv, sub: 128 }, 0, emptyMovePose()).leftHand).toBe(false);
  });
});

describe('gap 2: the takedown blow -1 reaches the partner', () => {
  const wire = (mv: MoveState): MoveState => sanitizeMoveState(JSON.parse(JSON.stringify(packMoveState(mv))))!;

  it('a choke / the lethal approach (blowPh -1): sub 0, the partner poses no arc (-1), as the owner', () => {
    const mv = localMoveState(fakeGame({ takedown: true, blowPh: -1 }), emptyMoveState());
    expect(mv.m).toBe('takedown');
    expect(mv.ph).toBe(0);
    expect(mv.sub & TAKEDOWN_SUB_BLOW).toBe(0);
    const got = wire(mv);
    expect(poseFromMoveState(got, 0, emptyMovePose()).melee).toBe(-1);
    expect(killWarp(-1, TAKEDOWN_BLOW)).toBe(-1); // the owner's pose.melee
  });

  it('the blow running: sub 1 and the phase, the partner poses the owner\'s killWarp', () => {
    for (const ph of [0, 0.3, 1]) {
      const mv = localMoveState(fakeGame({ takedown: true, blowPh: ph }), emptyMoveState());
      expect(mv.sub & TAKEDOWN_SUB_BLOW).toBe(TAKEDOWN_SUB_BLOW);
      const got = wire(mv);
      expect(got.sub & TAKEDOWN_SUB_BLOW).toBe(TAKEDOWN_SUB_BLOW);
      expect(poseFromMoveState(got, 0, emptyMovePose()).melee).toBeCloseTo(killWarp(ph, TAKEDOWN_BLOW), 6);
    }
  });
});

describe('gap 3: the baked sections on the partner (base only)', () => {
  it('untuned (today\'s base): the partner selects nothing and moves nothing (bit-identical)', () => {
    expect(moveTuneSelectBase('team.boost.a', 1, 'none')).toBe('');
    expect(moveTuneSelectBase('', 0, 'vault')).toBe('');
    const pos = { x: 1, y: 2, z: 3 };
    const rot = { y: 0.4 };
    moveTuneRoot(pos, rot);
    expect(pos).toEqual({ x: 1, y: 2, z: 3 });
    expect(rot.y).toBe(0.4);
  });

  it('a baked traversal / role offset moves the partner\'s root as the owner\'s', () => {
    tuneBaseLoad({ trav: { 'trav.vault': { bodyFwd: 0.1 } }, team_boost: { 'team.boost.a': { bodyUp: 0.05, crouch: 0.2 }, 'team.boost.contact': { cUp: 0.1 } } });
    expect(moveTuneSelectBase('', 0, 'vault')).toBe('trav.vault');
    const pos = { x: 0, y: 0, z: 0 };
    const rot = { y: 0 };
    moveTuneRoot(pos, rot);
    expect(pos.z).toBeCloseTo(0.1, 12);
    // the owner's select of the same group gives the same offset (untuned tuner: eff = base)
    const own = { x: 0, y: 0, z: 0 };
    moveTuneSelect('', 0, 'vault', false);
    moveTuneRoot(own, { y: 0 });
    expect(own).toEqual(pos);
    // a team role with the contact window from the wire phase
    const k = teamContactKOfWire('team.boost.a', 0.3);
    expect(k).toBe(1);
    expect(moveTuneSelectBase(teamRowOfWire('boost', 0), k, 'none')).toBe('team.boost.a');
    const p2 = { x: 0, y: 0, z: 0 };
    moveTuneRoot(p2, { y: 0 });
    expect(p2.y).toBeCloseTo(0.05 + 0.1, 12);
    // the pose window: crouch added, put back by End (grips)
    const t = (): { x: number; y: number; z: number } => ({ x: 0, y: 0, z: 0 });
    const rig = { reachL: t(), reachR: t(), plantL: t(), plantR: t(), root: { rotation: { y: 0 } } };
    const rp = { crouch: 0.1 };
    moveTuneBegin(rp, rig);
    expect(rp.crouch).toBeCloseTo(0.3, 12);
    moveTuneEnd(rig);
  });

  it('the viewer\'s live tuner values never reach the partner (they are the viewer\'s own role)', () => {
    tuneBaseLoad(undefined);
    expect(tuneSet('trav.vault', 'bodyFwd', 0.2)).toBe(true);
    // the owner (the local player) takes it
    expect(moveTuneSelect('', 0, 'vault', false)).toBe('trav.vault');
    // the partner does not
    expect(moveTuneSelectBase('', 0, 'vault')).toBe('');
    // with a base, the partner takes the base value only
    tuneBaseLoad({ trav: { 'trav.vault': { bodyFwd: 0.05 } } });
    expect(moveTuneSelectBase('', 0, 'vault')).toBe('trav.vault');
    const pos = { x: 0, y: 0, z: 0 };
    moveTuneRoot(pos, { y: 0 });
    expect(pos.z).toBeCloseTo(0.05, 12);
  });

  it('the contact weight from the wire phase follows teamContactK\'s windows', () => {
    expect(teamContactKOfWire('team.boost.a', 0)).toBe(0);
    expect(teamContactKOfWire('team.boost.a', 0.5)).toBeCloseTo(trapezoid(0.5, 0.1, 0.25, 0.4, 0.6), 12);
    expect(teamContactKOfWire('team.throw.a', 0.05)).toBe(1);
    expect(teamContactKOfWire('team.throw.a', 0.5)).toBe(0);
    expect(teamContactKOfWire('team.hang.a', 0.7)).toBe(1);
    expect(teamContactKOfWire('team.rope.a', 0)).toBe(1);
    expect(teamContactKOfWire('team.boost.b', 0.3)).toBe(0);
    expect(teamContactKOfWire('', 0.3)).toBe(0);
  });

  it('the Body base root offsets from the rig\'s own applied base: identity unless live, as tuneRoot otherwise', () => {
    const st = bodyRigState();
    const pos = { x: 1, y: 1, z: 1 };
    bodyRigRoot(st, pos, 0.7);
    expect(pos).toEqual({ x: 1, y: 1, z: 1 });
    expect(bodyRigWallGap(st)).toBe(0);
    const i = (f: string): number => BODY_BASE_FIELDS.indexOf(f as (typeof BODY_BASE_FIELDS)[number]);
    st.applied[i('bodyFwdAdd')] = 0.1;
    st.applied[i('bodyUpAdd')] = 0.02;
    st.applied[i('guardGapAdd')] = 0.03;
    st.applied[i('guardSideAdd')] = 0.04;
    st.applied[i('wallGapAdd')] = 0.05;
    st.live = true;
    const yaw = 0.7;
    const p = { x: 0, y: 0, z: 0 };
    bodyRigRoot(st, p, yaw);
    const f = 0.1 - 0.03;
    const r = -0.04;
    expect(p.x).toBeCloseTo(Math.sin(yaw) * f + Math.cos(yaw) * r, 12);
    expect(p.z).toBeCloseTo(Math.cos(yaw) * f - Math.sin(yaw) * r, 12);
    expect(p.y).toBeCloseTo(0.02, 12);
    expect(bodyRigWallGap(st)).toBe(0.05);
  });
});
