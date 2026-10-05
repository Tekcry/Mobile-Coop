import { describe, expect, it } from 'vitest';
import {
  awayAmount,
  buildCoverSegments,
  clampAlong,
  classifyHeight,
  coverPointsFromSegments,
  coverPose,
  EDGE_MARGIN,
  findSnap,
  locate,
  nearestEdge,
  projectOnTangent,
  type CoverBox,
} from '../src/cover/coverData';
import { CoverStateMachine, emptyCoverInput, ENTER_TIME, VAULT_TIME, CORNER_HOLD, type CoverInput } from '../src/cover/coverState';
import { targetSpeed, EasedVelocity, SprintGate, RollGate } from '../src/player/movement';
import { MOVEMENT } from '../src/config/movement';

// low wall 0.6 thick (x) x 4 long (z) at the origin; high wall 0.5 x 4 at x = 10
const low: CoverBox = { c: [0, 0.525, 0], s: [0.6, 1.05, 4], yaw: 0, pitch: 0, collide: true };
const high: CoverBox = { c: [10, 1.3, 0], s: [0.5, 2.6, 4], yaw: 0, pitch: 0, collide: true };
const floor: CoverBox = { c: [0, -0.2, 0], s: [40, 0.4, 40], yaw: 0, pitch: 0, collide: true };
const ramp: CoverBox = { c: [5, 1, 5], s: [2, 0.3, 4], yaw: 0, pitch: -0.4, collide: true };
const hidden: CoverBox = { c: [5, 1, -5], s: [2, 2, 2], yaw: 0, pitch: 0, collide: true, visible: false };

describe('cover generation', () => {
  const segs = buildCoverSegments([low, high, floor, ramp, hidden], [{ c: [-6, 2, 0], r: 0.6, h: 4, collide: true }]);
  it('classifies by height and skips floors, ramps and hidden helpers', () => {
    expect(classifyHeight(1.05)).toBe('low');
    expect(classifyHeight(2.6)).toBe('high');
    expect(classifyHeight(0.4)).toBeNull();
    expect(classifyHeight(1.5)).toBeNull();
    // 4 faces per box (2 boxes) + 8 for the pillar
    expect(segs.length).toBe(16);
    expect(segs.filter((s) => s.low).length).toBe(4);
  });
  it('normals point outward and are perpendicular to the face', () => {
    for (const s of segs) {
      expect(Math.abs(s.tx * s.nx + s.tz * s.nz)).toBeLessThan(1e-9);
      // the piece centre is behind the face
      const piece = s.piece === 1 ? low.c : s.piece === 2 ? high.c : [-6, 0, 0];
      expect(locate(s, piece[0]!, piece[2]!).dist).toBeLessThan(0);
    }
    const east = segs.find((s) => s.low && s.nx > 0.9)!;
    expect(east.ax).toBeCloseTo(0.3);
    expect(east.len).toBeCloseTo(4);
    expect(east.depth).toBeCloseTo(0.6);
  });
  it('links outside corners around each piece', () => {
    const lowSegs = segs.filter((s) => s.low);
    for (const s of lowSegs) {
      // short end faces (0.6 m) still link; corners join where b of one face meets a of the next
      if (s.nextB >= 0) {
        const n = segs[s.nextB]!;
        expect(n.ax).toBeCloseTo(s.bx);
        expect(n.az).toBeCloseTo(s.bz);
        expect(n.nextA).toBe(s.id);
      }
    }
  });
  it('AI cover points sit in front of faces, protecting towards the cover', () => {
    const pts = coverPointsFromSegments(segs, 0.35);
    expect(pts.length).toBeGreaterThan(4);
    for (const p of pts) {
      const s = segs[p.seg]!;
      const l = locate(s, p.x, p.z);
      expect(l.dist).toBeGreaterThan(0.35);
      expect(p.nx * s.nx + p.nz * s.nz).toBeCloseTo(-1);
    }
  });
});

describe('snap, movement along cover, edges', () => {
  const segs = buildCoverSegments([low, high]);
  const east = segs.find((s) => s.low && s.nx > 0.9)!;
  it('snaps only when close, in front, at the same level and facing the cover', () => {
    expect(findSnap(segs, { x: 1.2, y: 0, z: 0, dirX: -1, dirZ: 0 })?.seg.id).toBe(east.id);
    expect(findSnap(segs, { x: 1.2, y: 0, z: 0, dirX: 1, dirZ: 0 })).toBeNull(); // facing away
    expect(findSnap(segs, { x: 3.5, y: 0, z: 0, dirX: -1, dirZ: 0 })).toBeNull(); // too far
    expect(findSnap(segs, { x: 1.2, y: 3, z: 0, dirX: -1, dirZ: 0 })).toBeNull(); // different level
    expect(findSnap(segs, { x: 1.2, y: 0, z: 5, dirX: -1, dirZ: 0 })).toBeNull(); // past the end
    const near = findSnap(segs, { x: 1.2, y: 0, z: 1.98, dirX: -1, dirZ: 0 })!;
    expect(near.s).toBeLessThanOrEqual(east.len - EDGE_MARGIN + 1e-9);
  });
  it('pose is at the standoff, facing the surface', () => {
    const p = coverPose(east, 2, 0.35);
    expect(p.x).toBeCloseTo(0.65);
    expect(Math.sin(p.yaw)).toBeCloseTo(-1); // faces -x
  });
  it('projects input onto the tangent and measures pushes away', () => {
    expect(Math.abs(projectOnTangent(east, 0, 1))).toBeCloseTo(1);
    expect(projectOnTangent(east, 1, 0)).toBeCloseTo(0);
    expect(awayAmount(east, 1, 0)).toBeCloseTo(1);
    expect(awayAmount(east, -1, 0)).toBe(0);
  });
  it('clamps to the usable range and reports the edge', () => {
    expect(clampAlong(east, -1)).toEqual({ s: EDGE_MARGIN, edge: -1 });
    expect(clampAlong(east, 10)).toEqual({ s: east.len - EDGE_MARGIN, edge: 1 });
    expect(clampAlong(east, 2)).toEqual({ s: 2, edge: 0 });
    expect(nearestEdge(east, 0.5)).toEqual({ side: -1, dist: 0.5 });
    expect(nearestEdge(east, 3.5).side).toBe(1);
  });
});

describe('cover state machine', () => {
  const run = (sm: CoverStateMachine, i: Partial<CoverInput>, seconds: number): string => {
    const inp = { ...emptyCoverInput(), ...i };
    for (let t = 0; t < seconds; t += 1 / 60) sm.step(1 / 60, inp);
    return sm.state;
  };
  const inCover = (low = true): CoverStateMachine => {
    const sm = new CoverStateMachine();
    sm.snap();
    run(sm, { low }, ENTER_TIME + 0.05);
    return sm;
  };
  it('enter eases in, then settles in cover', () => {
    const sm = new CoverStateMachine();
    sm.snap();
    expect(sm.state).toBe('enter');
    expect(run(sm, {}, ENTER_TIME * 0.5)).toBe('enter');
    expect(run(sm, {}, ENTER_TIME)).toBe('in');
  });
  it('aim peeks, release returns; fire without aim is blind fire', () => {
    const sm = inCover();
    expect(run(sm, { ads: true }, 0.05)).toBe('peek');
    expect(run(sm, { ads: false }, 0.05)).toBe('in');
    expect(run(sm, { fire: true }, 0.05)).toBe('blind');
    expect(run(sm, { fire: true }, 0.5)).toBe('blind');
    expect(run(sm, {}, 0.4)).toBe('in');
    run(sm, { fire: true }, 0.05);
    expect(run(sm, { ads: true }, 0.05)).toBe('peek');
  });
  it('exits on release, crouch, sprint, backing away, lost surface or death', () => {
    for (const i of [{ coverPressed: true }, { crouchPressed: true }, { sprint: true }, { valid: false }, { alive: false }] as Partial<CoverInput>[]) {
      const sm = inCover();
      expect(run(sm, i, 1 / 60)).toBe('none');
    }
    const sm = inCover();
    expect(run(sm, { away: 1 }, 0.1)).toBe('in'); // brief push is ignored
    expect(run(sm, { away: 1 }, 0.25)).toBe('none');
  });
  it('jump vaults low cover when clear, otherwise just leaves', () => {
    let sm = inCover(true);
    expect(run(sm, { jumpPressed: true, low: true, canVault: true }, 1 / 60)).toBe('vault');
    expect(run(sm, {}, VAULT_TIME + 0.05)).toBe('none');
    sm = inCover(false);
    expect(run(sm, { jumpPressed: true, low: false, canVault: false }, 1 / 60)).toBe('none');
  });
  it('holding against an outside corner pivots round it', () => {
    const sm = inCover();
    expect(run(sm, { cornerPush: 1 }, CORNER_HOLD * 0.5)).toBe('in');
    expect(run(sm, { cornerPush: 1 }, CORNER_HOLD)).toBe('corner');
    expect(sm.cornerSide).toBe(1);
    expect(run(sm, {}, 0.5)).toBe('in');
  });
  it('dash goes to the next cover when allowed', () => {
    const sm = inCover();
    expect(run(sm, { coverPressed: true, away: 1, canDash: true }, 1 / 60)).toBe('dash');
    expect(run(sm, { arrived: true }, 1 / 60)).toBe('enter');
  });
});

describe('movement', () => {
  it('speed curve: walk band, jog band, stance caps (realistic m/s)', () => {
    expect(targetSpeed(0.02, 'stand')).toBe(0);
    expect(targetSpeed(MOVEMENT.walkBand, 'stand')).toBeCloseTo(MOVEMENT.walkSpeed);
    expect(targetSpeed(1, 'stand')).toBeCloseTo(3.5);
    expect(targetSpeed(1, 'crouch')).toBeCloseTo(1.2);
    expect(targetSpeed(1, 'ads')).toBeCloseTo(1.0);
    expect(targetSpeed(1, 'sprint')).toBeCloseTo(5.5);
    expect(targetSpeed(0.3, 'stand')).toBeLessThan(targetSpeed(0.5, 'stand'));
    expect(MOVEMENT.walkSpeed).toBe(1.4);
  });
  it('acceleration eases in and out with no overshoot', () => {
    const v = new EasedVelocity();
    const xs: number[] = [];
    for (let i = 0; i < 90; i++) {
      v.step(3.5, 0, 1 / 60);
      xs.push(v.x);
    }
    expect(xs[2]! - xs[1]!).toBeGreaterThan(xs[1]! - xs[0]!); // eases in
    expect(xs[89]!).toBeCloseTo(3.5, 1);
    expect(Math.max(...xs)).toBeLessThanOrEqual(3.5 + 1e-6);
    // stopping: no instant stop, no slide past zero
    const ys: number[] = [];
    for (let i = 0; i < 60; i++) {
      v.step(0, 0, 1 / 60);
      ys.push(v.x);
    }
    expect(ys[0]!).toBeGreaterThan(2.5);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(ys[59]!).toBeLessThan(0.05);
  });
  it('sprint has a wind-up and a recovery before weapons are usable', () => {
    const s = new SprintGate();
    s.update(true, 1 / 60);
    expect(s.state).toBe('windup');
    expect(s.blocksWeapon).toBe(true);
    expect(s.blend).toBeLessThan(0.5);
    for (let t = 0; t < MOVEMENT.sprintWindup + 0.05; t += 1 / 60) s.update(true, 1 / 60);
    expect(s.state).toBe('on');
    s.update(false, 1 / 60);
    expect(s.state).toBe('recover');
    expect(s.blocksWeapon).toBe(true);
    for (let t = 0; t < MOVEMENT.sprintRecovery + 0.05; t += 1 / 60) s.update(false, 1 / 60);
    expect(s.blocksWeapon).toBe(false);
  });
  it('roll: fixed duration, recovery, cooldown', () => {
    const r = new RollGate();
    expect(r.start()).toBe(true);
    let t = 0;
    while (r.active) {
      r.update(1 / 60);
      t += 1 / 60;
    }
    expect(t).toBeCloseTo(MOVEMENT.rollTime, 1);
    expect(r.blocksWeapon).toBe(true);
    expect(r.start()).toBe(false);
    for (let k = 0; k < 120; k++) r.update(1 / 60);
    expect(r.blocksWeapon).toBe(false);
    expect(r.start()).toBe(true);
  });
});
