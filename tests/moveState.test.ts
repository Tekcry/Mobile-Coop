import { describe, expect, it } from 'vitest';
import {
  attachGripWeight,
  COVER_SUB,
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
    expect(g.g).toBe(6);
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
    const ps: PlayerState = { id: 'peerA', x: 1, y: 0, z: 2, yaw: 0.5, pitch: 0.1, speed: 3, f: 16, w: 'rifle', hp: 80, sh: 20 } as PlayerState;
    const mv = { ...emptyMoveState(), m: 'cover' as const, sub: COVER_SUB.low | COVER_SUB.wallRight, s: 1.1, ph: 0.75 };
    const m = parseMessage(JSON.parse(JSON.stringify({ t: 'pstate', s: wirePlayerState({ ...ps, mv }) })));
    expect(m && m.t === 'pstate' && m.s.mv).toMatchObject({ m: 'cover', sub: 3, s: 1.1, ph: 0.75 });
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

  it('poses: cover bits, attached families and exits, committed moves and takedowns', () => {
    const out = emptyMovePose();
    poseFromMoveState({ ...emptyMoveState(), m: 'cover', sub: COVER_SUB.low | COVER_SUB.over | COVER_SUB.edgeL | COVER_SUB.kneel, s: 1.1, ph: 1 }, 0, out);
    expect(out).toMatchObject({ cover: 'low', wallSide: -1, lean: 1, peekOver: 1, coverTop: 1.1, coverMode: 'over', edgeLook: -1, kneel: true, peekClear: 0 });
    poseFromMoveState({ ...emptyMoveState(), m: 'cover', sub: COVER_SUB.wallRight | COVER_SUB.gunClear, ph: 0.5 }, 0, out);
    expect(out).toMatchObject({ cover: 'high', wallSide: 1, lean: 0, coverMode: 'none', peekClear: 1 });
    poseFromMoveState({ ...emptyMoveState(), m: 'ladder', a: 0, sub: packAttachSub('on', 1, 'none') }, 0.3, out);
    expect(out).toMatchObject({ cover: 'none', traverse: 'climb', traverseT: 0.3 });
    poseFromMoveState({ ...emptyMoveState(), m: 'ledge', a: 1, sub: packAttachSub('on', 1, 'none') }, 0.3, out);
    expect(out.traverse).toBe('hang');
    poseFromMoveState({ ...emptyMoveState(), m: 'ledge', a: 1, sub: packAttachSub('exit', 1, 'climbUp'), ph: 0.4 }, 0, out);
    expect(out).toMatchObject({ traverse: 'climbUp', traverseT: 0.4 });
    poseFromMoveState({ ...emptyMoveState(), m: 'duct', a: 1, sub: packAttachSub('on', 1, 'none') }, 0.6, out);
    expect(out.traverse).toBe('crawl');
    poseFromMoveState({ ...emptyMoveState(), m: 'roll', ph: 0.5 }, 0, out);
    expect(out).toMatchObject({ traverse: 'roll', traverseT: 0.5 });
    poseFromMoveState({ ...emptyMoveState(), m: 'takedown', ph: 0.7, tid: 'e1' }, 0, out);
    expect(out).toMatchObject({ traverse: 'none', melee: 0.7 });
    poseFromMoveState(emptyMoveState(), 0, out);
    expect(out).toMatchObject({ cover: 'none', traverse: 'none', melee: -1 });
    for (const m of MOVE_MODES) expect(isAttachedMode(m)).toBe(['ladder', 'pipeV', 'pipeH', 'ledge', 'duct', 'zipline', 'split', 'wallJump'].includes(m));
  });

  it('grip weight eases in on enter, holds on, eases out on exit', () => {
    expect(attachGripWeight('enter', 0)).toBe(0);
    expect(attachGripWeight('enter', 1)).toBe(1);
    expect(attachGripWeight('on', 0)).toBe(1);
    expect(attachGripWeight('exit', 0)).toBe(1);
    expect(attachGripWeight('exit', 0.7)).toBe(0);
  });
});

describe('host checks on networked movement (3.2.0 phase 1)', () => {
  it('free movement is capped by the claimed gear, not the sprint for everyone', () => {
    const g2 = { ...emptyMoveState(), g: 2 };
    expect(moveSpeedCap(g2, false, false, false, true)).toBeCloseTo(GEARS.stand[1]! * MOVE_TOLERANCE);
    expect(moveSpeedCap(g2, true, false, false, true)).toBeCloseTo(GEARS.crouch[1]! * MOVE_TOLERANCE);
    expect(moveSpeedCap(g2, false, true, false, true)).toBeCloseTo(5 * MOVE_TOLERANCE);
    // driven (cover / traversal), in the air or with no move state: the general cap
    expect(moveSpeedCap(g2, false, false, true, true)).toBe(MAX_FREE_SPEED);
    expect(moveSpeedCap(g2, false, false, false, false)).toBe(MAX_FREE_SPEED);
    expect(moveSpeedCap(undefined, false, false, false, true)).toBe(MAX_FREE_SPEED);
    expect(moveSpeedCap({ ...g2, m: 'ladder', a: 0 }, false, false, false, true)).toBe(MAX_FREE_SPEED);
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
