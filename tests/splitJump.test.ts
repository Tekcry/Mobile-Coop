import { describe, expect, it } from 'vitest';
import { buildCoverSegments, type CoverBox } from '../src/cover/coverData';
import { findSplitGaps, PIPE, PipeHang, SPLIT, splitReach, WALL_JUMP, wallJumpReach } from '../src/player/splitJump';
import { makeLedge, TraversalAnchors, type Ledge, type PipeHorizontal, type SplitAnchor } from '../src/world/anchors';
import { ATTACH, attachKindOf, attachPose, axisInput, PIPE_TUMBLE } from '../src/player/attach';

const wall = (cx: number, cz: number, len: number, h: number, yaw = 0, thick = 0.3): CoverBox => ({ c: [cx, h / 2, cz], s: [len, h, thick], yaw, pitch: 0, collide: true });
/** Two walls along x, `gap` apart (face to face), `h` tall (the second `h2`). */
const corridor = (gap: number, h = 4.3, h2 = h, len = 4): CoverBox[] => [wall(0, 0, len, h), wall(0, gap + 0.3, len, h2)];

describe('split jump gaps (3.2.0)', () => {
  it('two tall walls 0.9-1.7 m apart facing each other make one gap along the corridor', () => {
    const gaps = findSplitGaps(buildCoverSegments(corridor(1.3)));
    expect(gaps.length).toBe(1);
    const g = gaps[0]!;
    expect(g.width).toBeCloseTo(1.3);
    expect(Math.abs(g.tx)).toBeCloseTo(1);
    expect(g.a.z).toBeCloseTo(0.15 + 0.65);
    expect(g.len).toBeCloseTo(4 - 2 * SPLIT.endMargin);
    expect(g.height).toBeCloseTo(4.3);
  });

  it('too narrow, too wide, too short, a short wall or angled walls make none', () => {
    expect(findSplitGaps(buildCoverSegments(corridor(0.8)))).toHaveLength(0);
    expect(findSplitGaps(buildCoverSegments(corridor(1.8)))).toHaveLength(0);
    expect(findSplitGaps(buildCoverSegments(corridor(1.3, 4.3, 2.4)))).toHaveLength(0);
    expect(findSplitGaps(buildCoverSegments(corridor(1.3, 4.3, 4.3, 1.2)))).toHaveLength(0);
    // the second wall turned 20 degrees
    expect(findSplitGaps(buildCoverSegments([wall(0, 0, 4, 4.3), wall(0, 1.6, 4, 4.3, 0.35)]))).toHaveLength(0);
    // a wall on a raised floor (a different storey)
    const up: CoverBox = { c: [0, 1.0 + 2.15, 1.6], s: [4, 4.3, 0.3], yaw: 0, pitch: 0, collide: true };
    expect(findSplitGaps(buildCoverSegments([wall(0, 0, 4, 4.3), up]))).toHaveLength(0);
  });

  it('only where the walls overlap along the corridor', () => {
    const g = findSplitGaps(buildCoverSegments([wall(0, 0, 4, 4.3), wall(2, 1.6, 4, 4.3)]))[0]!;
    expect(g.len).toBeCloseTo(2 - 2 * SPLIT.endMargin);
    expect(Math.min(g.a.x, g.b.x)).toBeCloseTo(0 + SPLIT.endMargin);
  });

  it('offered between the walls on the floor, facing along the corridor (40 deg)', () => {
    const g = findSplitGaps(buildCoverSegments(corridor(1.3)))[0]!;
    const mz = g.a.z;
    expect(splitReach(g, 0, 0, mz, g.tx, g.tz)).toMatchObject({ face: 1 });
    expect(splitReach(g, 0, 0, mz, -g.tx, -g.tz)).toMatchObject({ face: -1 });
    const c35 = Math.cos((35 * Math.PI) / 180);
    const s35 = Math.sin((35 * Math.PI) / 180);
    expect(splitReach(g, 0, 0, mz, c35, s35)).not.toBeNull();
    expect(splitReach(g, 0, 0, mz, Math.cos(0.8), Math.sin(0.8))).toBeNull();
    // against a wall, outside the corridor, on another floor
    expect(splitReach(g, 0, 0, mz - 0.6, 1, 0)).toBeNull();
    expect(splitReach(g, 3, 0, mz, 1, 0)).toBeNull();
    expect(splitReach(g, 0, 1, mz, 1, 0)).toBeNull();
  });

  it('is an attach kind with no travel; the body braces at the feet line facing along it', () => {
    const anchors = new TraversalAnchors();
    const g = findSplitGaps(buildCoverSegments(corridor(1.3)))[0]!;
    const a = anchors.add<SplitAnchor>({ kind: 'split', ...g });
    expect(attachKindOf(a)).toBe('split');
    expect(ATTACH.split.axis).toBe('none');
    expect(ATTACH.split.allow.sidearm).toBe(true);
    expect(ATTACH.split.enter).toBeCloseTo(SPLIT.jumpTime);
    expect(axisInput(a, ATTACH.split, 0, 1, 0)).toBe(0);
    const p = attachPose(a, 1, -1, 1.75, { x: 0, y: 0, z: 0, yaw: 0 });
    expect(p.y).toBeCloseTo(SPLIT.feetHeight);
    expect(Math.cos(p.yaw - Math.atan2(-g.tx, -g.tz))).toBeCloseTo(1);
  });
});

describe('wall jump (3.2.0)', () => {
  const lip = (top: number): Ledge => ({ ...makeLedge(-2, 0, 2, 0, top), id: 0 }) as Ledge;
  // makeLedge(a -> b along +x) faces -z? the lip's normal points out over the drop
  const front = (l: Ledge, d: number): { x: number; z: number; dx: number; dz: number } => ({ x: l.nx * d, z: l.nz * d, dx: -l.nx, dz: -l.nz });

  it('a hangable lip 2.7-3.8 m above the feet, facing its wall within reach', () => {
    for (const top of [2.8, 3.3, 3.75]) {
      const l = lip(top);
      const f = front(l, 0.6);
      expect(wallJumpReach(l, f.x, 0, f.z, f.dx, f.dz)).toMatchObject({ corner: false });
    }
    // a standing grab, or out of reach above
    for (const top of [2.5, 3.9]) {
      const l = lip(top);
      const f = front(l, 0.6);
      expect(wallJumpReach(l, f.x, 0, f.z, f.dx, f.dz)).toBeNull();
    }
  });

  it('not too far from the wall, not facing away, not from on top, not off its ends', () => {
    const l = lip(3.3);
    const far = front(l, WALL_JUMP.wallReach + 0.6);
    expect(wallJumpReach(l, far.x, 0, far.z, far.dx, far.dz)).toBeNull();
    const f = front(l, 0.6);
    expect(wallJumpReach(l, f.x, 0, f.z, -f.dx, -f.dz)).toBeNull();
    expect(wallJumpReach(l, -l.nx * 0.5, 0, -l.nz * 0.5, l.nx, l.nz)).toBeNull();
    expect(wallJumpReach(l, 2.1 + f.x, 0, f.z, f.dx, f.dz)).toBeNull();
    expect(wallJumpReach({ ...l, canHang: false }, f.x, 0, f.z, f.dx, f.dz)).toBeNull();
  });

  it('an inside corner: facing the adjoining wall with the lip side-on beside it', () => {
    const l = lip(3.3);
    const f = front(l, 0.6);
    // side-on: facing along the lip
    expect(wallJumpReach(l, f.x, 0, f.z, 1, 0)).toMatchObject({ corner: true });
    expect(wallJumpReach(l, l.nx * (WALL_JUMP.cornerReach + 0.3), 0, l.nz * (WALL_JUMP.cornerReach + 0.3), 1, 0)).toBeNull();
  });
});

describe('pipe sub-states (3.2.0)', () => {
  it('Y: hands -> legs up -> inverted -> legs up; B: legs up -> hands; each a timed transition', () => {
    const p = new PipeHang();
    expect(p.mode).toBe('hands');
    expect(p.down()).toBe(false);
    expect(p.up()).toBe(true);
    expect(p.busy).toBe(true);
    // committed: a second press does nothing mid-way
    expect(p.up()).toBe(false);
    p.update(PIPE.toLegsUp / 2);
    expect(p.progress).toBeCloseTo(0.5);
    p.update(PIPE.toLegsUp / 2 + 1e-3);
    expect(p.mode).toBe('legsUp');
    expect(p.up()).toBe(true);
    p.update(PIPE.toInverted + 1e-3);
    expect(p.mode).toBe('inverted');
    // inverted: B is the caller's drop and flip; Y curls back up
    expect(p.down()).toBe(false);
    expect(p.up()).toBe(true);
    p.update(PIPE.toLegsUp + 1e-3);
    expect(p.mode).toBe('legsUp');
    expect(p.down()).toBe(true);
    p.update(PIPE.toHands + 1e-3);
    expect(p.mode).toBe('hands');
  });

  it('transitions take 0.4-0.6 s; damage drops back to the hands', () => {
    for (const t of [PIPE.toLegsUp, PIPE.toInverted, PIPE.toHands]) {
      expect(t).toBeGreaterThanOrEqual(0.4);
      expect(t).toBeLessThanOrEqual(0.6);
    }
    const p = new PipeHang();
    p.up();
    p.update(0.2);
    p.damage();
    expect(p.mode).toBe('hands');
    expect(p.busy).toBe(false);
  });

  it('travel: hands at the shimmy pace, legs up at 0.5 m/s, none inverted or mid-change', () => {
    const p = new PipeHang();
    expect(p.speed(1)).toBe(1);
    p.up();
    expect(p.speed(1)).toBe(0);
    p.update(1);
    expect(p.speed(1)).toBeCloseTo(PIPE.legsUpSpeed);
    p.up();
    p.update(1);
    expect(p.speed(1)).toBe(0);
  });

  it('legs up lies the body along the pipe face up, the feet higher; inverted turns it over', () => {
    const anchors = new TraversalAnchors();
    const pipe = anchors.add<PipeHorizontal>({ kind: 'pipeH', a: { x: 0, y: 2.5, z: 0 }, b: { x: 5, y: 2.5, z: 0 }, hangHeight: 2.5, radius: 0.06 });
    const out = { x: 0, y: 0, z: 0, yaw: 0 };
    const hands = { ...attachPose(pipe, 2, 1, 1.75, out) };
    const legs = { ...attachPose(pipe, 2, 1, 1.75, out, 'legsUp') };
    const inv = { ...attachPose(pipe, 2, 1, 1.75, out, 'inverted') };
    // hips: by the hands 1.9 - 0.915 under the pipe; legs up close under it
    expect(legs.y + 0.915).toBeGreaterThan(hands.y + 0.915 + PIPE.legsUpLift);
    // every sub-state faces along the pipe (its +x axis)
    expect(Math.abs(Math.sin(legs.yaw))).toBeCloseTo(1);
    expect(Math.abs(Math.sin(hands.yaw))).toBeCloseTo(1);
    expect(Math.cos(inv.yaw - hands.yaw)).toBeCloseTo(-1);
    expect(PIPE_TUMBLE.inverted).toBeCloseTo(Math.PI);
  });
});
