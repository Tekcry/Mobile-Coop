import { describe, expect, it } from 'vitest';
import {
  attachGripWeight,
  emptyMovePose,
  emptyMoveState,
  isAttachedMode,
  MOVE_MODES,
  moveChanged,
  packAttachSub,
  packMoveState,
  poseFromMoveState,
  sanitizeMoveState,
  unpackAttachSub,
} from '../src/player/moveState';
import { parseMessage, wirePlayerState, type PlayerState } from '../src/net/protocol';
import { attachedClamp, MAX_FREE_SPEED, MOVE_TOLERANCE, moveSpeedCap } from '../src/net/validate';
import { traversePath } from '../src/player/traversePath';
import { AttachGrips } from '../src/player/attachGrips';
import { attachPose } from '../src/player/attach';
import { makeLedge, TraversalAnchors, type Ladder, type Ledge } from '../src/world/anchors';
import { GEARS } from '../src/config/movement';
import { killWarp, TAKEDOWN_BLOW } from '../src/anim/strikeBody';

const anchors = new TraversalAnchors();
const ladder = anchors.add<Ladder>({ kind: 'ladder', base: { x: 0, y: 0, z: 0 }, top: { x: 0, y: 4, z: 0.45 }, facing: 0, rung: 0.3, width: 0.5 });
const ledge = anchors.add<Ledge>(makeLedge(-3, 5, 3, 5, 2.4));

describe('move state (3.2.0 phase 1)', () => {
  it('modes are a fixed list; the wire carries the index and round-trips', () => {
    expect(MOVE_MODES[0]).toBe('ground');
    expect(MOVE_MODES.indexOf('takedown')).toBe(16);
    const mv = { ...emptyMoveState(), m: 'ledge' as const, a: ledge.id, s: 1.234567, sub: packAttachSub('on', 1, 'none'), ph: 1, g: 5, r: 0.5, ay: -0.4 };
    const wire = packMoveState(mv);
    expect(wire.m).toBe(MOVE_MODES.indexOf('ledge'));
    const back = sanitizeMoveState(JSON.parse(JSON.stringify(wire)), anchors.all.length)!;
    expect(back.m).toBe('ledge');
    expect(back.a).toBe(ledge.id);
    expect(back.s).toBeCloseTo(1.235, 3);
    expect(back.g).toBe(5);
    expect(back.ay).toBeCloseTo(-0.4);
  });

  it('rejects unknown modes and attached states without a valid anchor; clamps the rest', () => {
    expect(sanitizeMoveState({ m: 99 })).toBeNull();
    expect(sanitizeMoveState({ m: 'fly' })).toBeNull();
    expect(sanitizeMoveState(null)).toBeNull();
    expect(sanitizeMoveState({ m: 'ladder', a: 7 }, 3)).toBeNull();
    expect(sanitizeMoveState({ m: 'ladder', a: -1 })).toBeNull();
    const g = sanitizeMoveState({ m: 'ground', a: 2, g: 40, r: 9, ph: -3, sub: 1e9, tid: '<script>' })!;
    expect(g.a).toBe(-1);
    expect(g.g).toBe(5);
    expect(g.r).toBe(1);
    expect(g.ph).toBe(0);
    expect(g.sub).toBe(0xffff);
    expect(g.tid).toBe('');
    const c = sanitizeMoveState({ m: 'vault', c: { n: 300, x0: 1e9, v: 99, dur: 0 } })!;
    expect(c.c).toMatchObject({ n: 255, x0: 400, v: 12, dur: 0.05 });
    // a commit is only kept on committed modes
    expect(sanitizeMoveState({ m: 'ground', c: { n: 1 } })!.c).toBeUndefined();
  });

  it('pstate carries a sanitised move state; a bad one is dropped, not the message', () => {
    const ps: PlayerState = { id: 'peerA', x: 1, y: 0, z: 2, yaw: 0.5, pitch: 0.1, speed: 3, f: 16, w: 'rifle', hp: 80 } as PlayerState;
    const mv = { ...emptyMoveState(), m: 'wall' as const, a: 2, sub: 3, s: 1.1, ph: 0.75 };
    const m = parseMessage(JSON.parse(JSON.stringify({ t: 'pstate', s: wirePlayerState({ ...ps, mv }) })));
    expect(m && m.t === 'pstate' && m.s.mv).toMatchObject({ m: 'wall', a: 2, sub: 3, s: 1.1, ph: 0.75 });
    const bad = parseMessage({ t: 'pstate', s: { ...ps, mv: { m: 'teleport' } } });
    expect(bad && bad.t === 'pstate' && bad.s.mv).toBeUndefined();
  });

  it('attach sub bits pack phase, facing, the exit pose and the pipe sub-state', () => {
    for (const pipe of ['hands', 'legsUp', 'inverted'] as const)
      for (const to of [null, 'hands', 'legsUp', 'inverted'] as const) expect(unpackAttachSub(packAttachSub('on', -1, 'flip', pipe, to))).toEqual({ phase: 'on', face: -1, exit: 'flip', pipe, pipeTo: to });
    for (const phase of ['enter', 'on', 'exit'] as const)
      for (const face of [1, -1] as const)
        for (const exit of ['none', 'climbUp', 'mantle', 'ventDrop', 'drop'] as const) {
          const u = unpackAttachSub(packAttachSub(phase, face, exit));
          expect(u).toEqual({ phase, face, exit, pipe: 'hands', pipeTo: null });
        }
  });

  it('a new mode, sub-state, anchor, takedown or commit is a change; a position along it is not', () => {
    const a = { ...emptyMoveState(), m: 'ladder' as const, a: 0, s: 1 };
    expect(moveChanged(a, { ...a, s: 2, ph: 0.5 })).toBe(false);
    expect(moveChanged(a, { ...a, m: 'ledge' })).toBe(true);
    expect(moveChanged(a, { ...a, sub: 1 })).toBe(true);
    expect(moveChanged(a, { ...a, a: 1 })).toBe(true);
    expect(moveChanged(a, { ...a, tid: 'e3' })).toBe(true);
    const c = { n: 1, x0: 0, y0: 0, z0: 0, x1: 1, y1: 0, z1: 0, top: 1, v: 2, dur: 0.5 };
    expect(moveChanged({ ...a, c }, { ...a, c: { ...c, n: 2 } })).toBe(true);
  });

  it("slot 1 is 'wall' (A2: the old cover index, reserved for back-to-wall); it packs and sanitizes round trip", () => {
    expect(MOVE_MODES.indexOf('wall')).toBe(1);
    expect((MOVE_MODES as readonly string[]).includes('cover')).toBe(false);
    const mv = { ...emptyMoveState(), m: 'wall' as const, a: 7, sub: 5, s: 0.4, ph: 0.25, g: 2, r: 0.5, ay: 0.3 };
    const wire = JSON.parse(JSON.stringify(packMoveState(mv)));
    expect(wire.m).toBe(1);
    expect(sanitizeMoveState(wire)).toEqual(mv);
    // the retired cover-only fields are not carried
    expect(sanitizeMoveState({ ...wire, cu: 0.5, lf: 0.1, fp: [0, 0, 0, 0] })).toEqual(mv);
    // (step 11) the flat-back stance, facing along the slide (sub 2 = faceRight)
    const out = emptyMovePose();
    poseFromMoveState(mv, 0, out);
    expect(out).toMatchObject({ wall: true, wallSide: -1, lean: 0, traverse: 'none' });
    poseFromMoveState({ ...mv, sub: 2 }, 0, out);
    expect(out.wallSide).toBe(1);
    // (F4) at an edge the open side wins over the slide facing (edgeL 4 = left, edgeR 8 = right)
    poseFromMoveState({ ...mv, sub: 2 | 4 }, 0, out);
    expect(out.wallSide).toBe(-1);
    poseFromMoveState({ ...mv, sub: 8 }, 0, out);
    expect(out.wallSide).toBe(1);
  });

  it('poses: attached families and exits, committed moves and takedowns', () => {
    const out = emptyMovePose();
    poseFromMoveState({ ...emptyMoveState(), m: 'ladder', a: 0, sub: packAttachSub('on', 1, 'none') }, 0.3, out);
    expect(out).toMatchObject({ traverse: 'climb', traverseT: 0.3 });
    poseFromMoveState({ ...emptyMoveState(), m: 'ledge', a: 1, sub: packAttachSub('on', 1, 'none') }, 0.3, out);
    expect(out.traverse).toBe('hang');
    poseFromMoveState({ ...emptyMoveState(), m: 'ledge', a: 1, sub: packAttachSub('exit', 1, 'climbUp'), ph: 0.4 }, 0, out);
    expect(out).toMatchObject({ traverse: 'climbUp', traverseT: 0.4 });
    poseFromMoveState({ ...emptyMoveState(), m: 'duct', a: 1, sub: packAttachSub('on', 1, 'none') }, 0.6, out);
    expect(out.traverse).toBe('crawl');
    poseFromMoveState({ ...emptyMoveState(), m: 'roll', ph: 0.5 }, 0, out);
    expect(out).toMatchObject({ traverse: 'roll', traverseT: 0.5 });
    poseFromMoveState({ ...emptyMoveState(), m: 'takedown', ph: 0.7, sub: 1, tid: 'e1' }, 0, out); // (pose-parity) sub 1: the blow runs
    expect(out).toMatchObject({ traverse: 'none' });
    expect(out.melee).toBeCloseTo(killWarp(0.7, TAKEDOWN_BLOW), 12); // (anim-n4d) the blow's phase posed warped onto the kill
    poseFromMoveState(emptyMoveState(), 0, out);
    expect(out).toMatchObject({ wallSide: 0, traverse: 'none', melee: -1 });
    for (const m of MOVE_MODES) expect(isAttachedMode(m)).toBe(['ladder', 'pipeV', 'pipeH', 'ledge', 'duct', 'zipline', 'split', 'wallJump', 'rappel', 'fence'].includes(m));
  });

  it('grip weight eases in on enter, holds on, eases out on exit', () => {
    expect(attachGripWeight('enter', 0)).toBe(0);
    expect(attachGripWeight('enter', 1)).toBe(1);
    expect(attachGripWeight('on', 0)).toBe(1);
    expect(attachGripWeight('exit', 0)).toBe(1);
    expect(attachGripWeight('exit', 0.7)).toBe(0);
  });
  it('(F5, G4) climb-up: the hands hold until the knee is planted, then let go; crouched on top; no hop at the stand', async () => {
    const { sample } = await import('../src/anim/clip');
    const { CLIMB_UP, CLIMB_UP_CROUCH_K } = await import('../src/anim/clips/traverse');
    const { CLIMB_UP_TIME, CLIMB_UP_STAND } = await import('../src/player/attachController');
    // (G4, CT 110522 / 110616) crouched on top at 0.85 s, the stand another 0.45 s; the clip spans both
    expect(CLIMB_UP_TIME).toBeCloseTo(0.85);
    expect(CLIMB_UP_STAND).toBeCloseTo(0.45, 2);
    const full = CLIMB_UP_TIME + CLIMB_UP_STAND;
    // the knee is planted (the left shin flat on the top) by 0.36 (0.47 s, CT 0.4-0.5 s); the hands hold through it and
    // (traverse-fix-2) on until the right foot is on the top (0.474), off before the crouch (was off by 0.5: the palms left
    // the lip early; tests/climbHands.test.ts measures the palms, the foot and the release)
    expect(sample(CLIMB_UP, 'fLPitch', 0.36)).toBeCloseTo(1.2);
    expect(0.36 * full).toBeGreaterThan(0.4);
    expect(0.36 * full).toBeLessThan(0.5);
    for (const k of [0.2, 0.3, 0.36, 0.38, 0.45, 0.474]) expect(attachGripWeight('exit', k, true)).toBe(1);
    expect(attachGripWeight('exit', CLIMB_UP_CROUCH_K - 0.01, true)).toBe(0);
    // at the crouch mark the body is in the crouched stance (CROUCH_IDLE pelY -0.42), the feet under it
    expect(sample(CLIMB_UP, 'pelY', CLIMB_UP_CROUCH_K)).toBeCloseTo(-0.42);
    expect(sample(CLIMB_UP, 'fLPitch', CLIMB_UP_CROUCH_K)).toBeCloseTo(0);
    expect(sample(CLIMB_UP, 'fLZ', CLIMB_UP_CROUCH_K)).toBeCloseTo(0);
    // the stand from the crouch: the pelvis rises monotonically, never above standing, at most 2.5 m/s
    let prev = sample(CLIMB_UP, 'pelY', CLIMB_UP_CROUCH_K);
    let vMax = 0;
    for (let k = CLIMB_UP_CROUCH_K; k <= 1.0001; k += 0.01) {
      const y = sample(CLIMB_UP, 'pelY', k);
      expect(y).toBeGreaterThanOrEqual(prev - 1e-9);
      expect(y).toBeLessThanOrEqual(1e-9);
      vMax = Math.max(vMax, (y - prev) / (0.01 * full));
      prev = y;
    }
    expect(vMax).toBeLessThan(2.5);
  });

  it('(G4) poses: a drainpipe is the inchworm, a lip hang swings, a ladder top-out stops at the crouch, a vent crawl-out', () => {
    const out = emptyMovePose();
    poseFromMoveState({ ...emptyMoveState(), m: 'pipeV', a: 0, sub: packAttachSub('on', 1, 'none') }, 0.7, out);
    expect(out).toMatchObject({ traverse: 'pipeClimb', traverseT: 0.7 });
    // hanging from a lip the cadence is the pendulum's swing; a pipe hangs plumb
    poseFromMoveState({ ...emptyMoveState(), m: 'ledge', a: 1, sub: packAttachSub('on', 1, 'none') }, -0.2, out);
    expect(out).toMatchObject({ traverse: 'hang', traverseT: -0.2 });
    poseFromMoveState({ ...emptyMoveState(), m: 'pipeH', a: 1, sub: packAttachSub('on', 1, 'none') }, -0.2, out);
    expect(out).toMatchObject({ traverse: 'hang', traverseT: 0 });
    poseFromMoveState({ ...emptyMoveState(), m: 'ladder', a: 0, sub: packAttachSub('exit', 1, 'climbUp'), ph: 1 }, 0, out);
    expect(out.traverse).toBe('climbUp');
    expect(out.traverseT).toBeCloseTo(0.654);
    poseFromMoveState({ ...emptyMoveState(), m: 'duct', a: 2, sub: packAttachSub('exit', 1, 'none'), ph: 0.5 }, 0.3, out);
    expect(out).toMatchObject({ traverse: 'crawlOut', traverseT: 0.5 });
    // the crawl-out lets go of the duct floor early
    expect(attachGripWeight('exit', 0, 'crawlOut')).toBe(1);
    expect(attachGripWeight('exit', 0.25, 'crawlOut')).toBe(0);
  });
});

describe('host checks on networked movement (3.2.0 phase 1)', () => {
  it('free movement is capped by the claimed gear', () => {
    const g2 = { ...emptyMoveState(), g: 2 };
    expect(moveSpeedCap(g2, false, false, true)).toBeCloseTo(GEARS.stand[1]! * MOVE_TOLERANCE);
    expect(moveSpeedCap(g2, true, false, true)).toBeCloseTo(GEARS.crouch[1]! * MOVE_TOLERANCE);
    // (CT prototype M1) no sprint: the top gear's cap is the run
    expect(moveSpeedCap({ ...g2, g: 5 }, false, false, true)).toBeCloseTo(GEARS.stand[4]! * MOVE_TOLERANCE);
    // driven (cover / traversal), in the air or with no move state: the general cap
    expect(moveSpeedCap(g2, false, true, true)).toBe(MAX_FREE_SPEED);
    expect(moveSpeedCap(g2, false, false, false)).toBe(MAX_FREE_SPEED);
    expect(moveSpeedCap(undefined, false, false, true)).toBe(MAX_FREE_SPEED);
    expect(moveSpeedCap({ ...g2, m: 'ladder', a: 0 }, false, false, true)).toBe(MAX_FREE_SPEED);
  });

  it('an attached client is held on the anchor it claims', () => {
    const mv = { ...emptyMoveState(), m: 'ladder' as const, a: ladder.id, s: 1.5, sub: packAttachSub('on', 1, 'none') };
    const p = attachPose(ladder, 1.5, 1, 1.75, { x: 0, y: 0, z: 0, yaw: 0 });
    expect(attachedClamp(mv, anchors, { x: p.x, y: p.y, z: p.z })).toBeNull();
    expect(attachedClamp(mv, anchors, { x: p.x + 0.3, y: p.y, z: p.z })).toBeNull();
    const c = attachedClamp(mv, anchors, { x: p.x + 3, y: p.y + 2, z: p.z })!;
    expect(c.x).toBeCloseTo(p.x);
    expect(c.y).toBeCloseTo(p.y);
    // blending on / off: not clamped (the feet travel between the ground and the anchor)
    expect(attachedClamp({ ...mv, sub: packAttachSub('enter', 1, 'none') }, anchors, { x: 9, y: 9, z: 9 })).toBeNull();
    expect(attachedClamp(emptyMoveState(), anchors, { x: 9, y: 9, z: 9 })).toBeNull();
  });
});

describe('shared posing code (3.2.0 phase 1)', () => {
  it('a remote replaying a committed move from its start lands where the local path does', () => {
    const f = { x: 0, y: 0, z: 0 };
    const e = { x: 2, y: 0, z: 0 };
    const a = { x: 0, y: 0, z: 0 };
    const b = { x: 0, y: 0, z: 0 };
    for (const kind of ['step', 'vault', 'mantle', 'drop', 'hop', 'roll'] as const) {
      for (let k = 0; k <= 1; k += 0.125) {
        traversePath(kind, f, e, 1, 3, k, a);
        traversePath(kind, { ...f }, { ...e }, 1, 3, k, b);
        expect(b).toEqual(a);
      }
      traversePath(kind, f, e, 1, 3, 1, a);
      expect(a.x).toBeCloseTo(2, 1);
    }
    // the vault clears the top
    let top = 0;
    for (let k = 0; k <= 1; k += 0.05) top = Math.max(top, traversePath('vault', f, e, 1, 0.5, k, a).y);
    expect(top).toBeGreaterThan(1);
  });

  it('two grip sets fed the same body parameter put the hands on the same rungs', () => {
    const rig = (): { reachL: { x: number; y: number; z: number; w: number }; reachR: { x: number; y: number; z: number; w: number }; plantL: { x: number; y: number; z: number; w: number }; plantR: { x: number; y: number; z: number; w: number }; height: number } => ({
      reachL: { x: 0, y: 0, z: 0, w: 0 },
      reachR: { x: 0, y: 0, z: 0, w: 0 },
      plantL: { x: 0, y: 0, z: 0, w: 0 },
      plantR: { x: 0, y: 0, z: 0, w: 0 },
      height: 1.75,
    });
    const a = new AttachGrips();
    const b = new AttachGrips();
    const ra = rig();
    const rb = rig();
    a.setup(ladder, 0.5, 1, 1.75);
    b.setup(ladder, 0.5, 1, 1.75);
    let s = 0.5;
    const dt = 1 / 120;
    for (let i = 0; i < 240; i++) {
      s += 0.9 * dt;
      a.update(dt, ladder, s, 0.9, 1, 1, ra);
      b.update(dt, ladder, s, 0.9, 1, 1, rb);
    }
    expect(rb.reachL).toEqual(ra.reachL);
    expect(rb.plantR).toEqual(ra.plantR);
    // hands on rungs (a rung grid from the base)
    expect(ra.reachL.w).toBe(1);
    expect(a.cadence()).toBeGreaterThanOrEqual(0);
    expect(a.cadence()).toBeLessThanOrEqual(1);
  });
});

describe('the shoulder swap on the wire (anim-cleanup; pose-parity: now PF.aimLeft)', () => {
  it('a ground state no longer reads sub bit 128 (the player flag carries the aim side in every mode, tests/poseParity)', () => {
    const mv = emptyMoveState();
    mv.m = 'ground';
    mv.sub = 128;
    expect(poseFromMoveState(mv, 1, emptyMovePose()).leftHand).toBe(false);
  });
});

// (piano-knife S3) the knife takedown sub: its bit and the row's bits apart from the blow bit (every bit a `takedown` sub
// had before); row 7 the move without a row
describe('piano-knife S3: the knife takedown sub bits', () => {
  it('TAKEDOWN_SUB_KNIFE and the row bits are distinct from TAKEDOWN_SUB_BLOW', async () => {
    const M = await import('../src/player/moveState');
    expect(M.TAKEDOWN_SUB_KNIFE).not.toBe(M.TAKEDOWN_SUB_BLOW);
    expect(M.TAKEDOWN_SUB_KNIFE & M.TAKEDOWN_SUB_BLOW).toBe(0);
    expect(M.KNIFE_ROW_NONE).toBe(7);
    for (let r = -1; r < M.KNIFE_ROW_NONE; r++) expect(M.knifeSub(r) & M.TAKEDOWN_SUB_BLOW).toBe(0);
    // the whole knife sub fits the wire's sub clamp (0..0xffff)
    expect(M.knifeSub(-1) | M.TAKEDOWN_SUB_BLOW).toBeLessThanOrEqual(0xffff);
  });
});
