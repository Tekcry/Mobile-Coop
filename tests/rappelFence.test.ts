import { describe, expect, it } from 'vitest';
import { ATTACH, attachKindOf, attachPose, attachRange } from '../src/player/attach';
import { reach, TraversalAnchors, type Fence, type RappelPoint } from '../src/world/anchors';
import { FENCE, RAPPEL } from '../src/config/movement';
import { emptyMoveState, packAttachSub, packMoveState, poseFromMoveState, emptyMovePose, sanitizeMoveState } from '../src/player/moveState';

const anchors = new TraversalAnchors();
// a 5 m roof edge along x at z 0, the rope hanging out towards -z
const rope = anchors.add<RappelPoint>({ kind: 'rappel', top: { x: 0, y: 5, z: 0 }, nx: 0, nz: -1, length: 5 });
const fence = anchors.add<Fence>({ kind: 'fence', a: { x: -3, y: 0, z: 10 }, b: { x: 3, y: 0, z: 10 }, height: 2.6, tx: 1, tz: 0, nx: 0, nz: -1, len: 6 });
const pose = { x: 0, y: 0, z: 0, yaw: 0 };

describe('rappel (3.2.0 phase 3)', () => {
  it('a vertical attach kind with the spec speeds; a sidearm from it', () => {
    expect(attachKindOf(rope)).toBe('rappel');
    expect(ATTACH.rappel.axis).toBe('vertical');
    expect(ATTACH.rappel.allow.sidearm).toBe(true);
    expect(RAPPEL.ascend).toBeCloseTo(1.0);
    expect(RAPPEL.descend).toBeCloseTo(1.6);
    expect(RAPPEL.descendSprint).toBeCloseTo(3.0);
    expect(RAPPEL.swingOut).toBeCloseTo(1.2);
    expect(RAPPEL.lateralMax).toBeCloseTo(1.5);
    expect(attachRange(rope)).toEqual({ min: RAPPEL.minOut, max: 5 });
  });

  it('offered on the roof at the point facing out over the edge', () => {
    expect(reach(rope, 0, 5, 0.5, 0, -1)).toMatchObject({ entry: 'above' });
    // facing back in, too far, a storey below, already out past the edge
    expect(reach(rope, 0, 5, 0.5, 0, 1)).toBeNull();
    expect(reach(rope, 2, 5, 0.5, 0, -1)).toBeNull();
    expect(reach(rope, 0, 2, 0.5, 0, -1)).toBeNull();
    expect(reach(rope, 0, 5, -0.5, 0, -1)).toBeNull();
  });

  it('the body hangs facing the wall, feet `s` under the edge, `u` along it', () => {
    const p = attachPose(rope, 2, 1, 1.75, pose, 'hands', 0.8);
    expect(p.y).toBeCloseTo(3);
    expect(p.z).toBeCloseTo(-RAPPEL.standoff);
    expect(Math.abs(p.x)).toBeCloseTo(0.8);
    expect(Math.cos(p.yaw)).toBeCloseTo(1);
  });
});

describe('fence (3.2.0 phase 3)', () => {
  it('an along attach kind: shimmy at 0.6 m/s, climb 0.9, flip 0.9 s, rattle 4 m above gear 3', () => {
    expect(attachKindOf(fence)).toBe('fence');
    expect(ATTACH.fence.axis).toBe('along');
    expect(ATTACH.fence.speed).toBeCloseTo(FENCE.shimmy);
    expect(FENCE.shimmy).toBeCloseTo(0.6);
    expect(FENCE.climb).toBeCloseTo(0.9);
    expect(FENCE.flipTime).toBeCloseTo(0.9);
    expect(FENCE.rattle).toBe(4);
    expect(FENCE.quietGear).toBe(3);
  });

  it('offered from either side facing it, clear of its ends', () => {
    // (the fence's normal points to -z: the south side is +1)
    expect(reach(fence, 0, 0, 9.4, 0, 1)).toMatchObject({ entry: 'side', face: 1 });
    expect(reach(fence, 0, 0, 10.6, 0, -1)).toMatchObject({ entry: 'side', face: -1 });
    expect(reach(fence, 0, 0, 9.4, 0, -1)).toBeNull();
    expect(reach(fence, 2.9, 0, 9.4, 0, 1)).toBeNull();
    expect(reach(fence, 0, 0, 8.5, 0, 1)).toBeNull();
  });

  it('the feet `u` up it on the side it was grabbed from, facing it', () => {
    const p = attachPose(fence, 3, 1, 1.75, pose, 'hands', 1.2);
    expect(p.y).toBeCloseTo(1.2);
    expect(p.z).toBeCloseTo(10 - FENCE.standoff);
    expect(Math.cos(p.yaw)).toBeCloseTo(1);
    const q = attachPose(fence, 3, -1, 1.75, pose, 'hands', 0);
    expect(q.z).toBeCloseTo(10 + FENCE.standoff);
  });
});

describe('net: rope and fence states (3.2.0 phase 3)', () => {
  it('carry the second axis; the remote poses the rope swing and the fence climb', () => {
    const mv = { ...emptyMoveState(), m: 'rappel' as const, a: rope.id, s: 2.5, u: 0.75, ph: 0.4, sub: packAttachSub('on', 1, 'none') };
    const back = sanitizeMoveState(JSON.parse(JSON.stringify(packMoveState(mv))), anchors.all.length)!;
    expect(back).toMatchObject({ m: 'rappel', a: rope.id, s: 2.5, u: 0.75, ph: 0.4 });
    const out = emptyMovePose();
    poseFromMoveState(back, 0, out);
    expect(out).toMatchObject({ traverse: 'rappel', traverseT: 0.4 });
    const fm = { ...emptyMoveState(), m: 'fence' as const, a: fence.id, s: 1, u: 0.5, sub: packAttachSub('on', -1, 'none') };
    poseFromMoveState(fm, 0, out);
    expect(out.traverse).toBe('climb');
    poseFromMoveState({ ...fm, sub: packAttachSub('exit', -1, 'fenceFlip'), ph: 0.5 }, 0, out);
    expect(out).toMatchObject({ traverse: 'vault', traverseT: 0.5 });
    // `u` only rides on rope / fence states
    expect(sanitizeMoveState({ m: 'ground', u: 3 })!.u).toBeUndefined();
  });
});
