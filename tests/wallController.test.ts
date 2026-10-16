import { describe, expect, it } from 'vitest';
import { buildCoverSegments, EDGE_MARGIN, type CoverBox } from '../src/cover/coverData';
import { LEAN_KIND, WALL, WALL_SUB, WallCore, leanBodyTurn, leanPastEdge, wallPeekWanted, wallSlideSpeed, buildWallLinks, emptyWallInput, lowAimKind, openSide, stackClamp, swatDuration, wallHeadCap, wallLeftHand, wallOverride, wallPeekOffset, type WallInput } from '../src/player/wallController';
import { LightField } from '../src/world/lightField';
import { LightRegistry } from '../src/world/lights';
import type { MoveOverride } from '../src/player/playerController';

const SO = 0.35;
const box = (x: number, z: number, w: number, h: number, d: number): CoverBox => ({ c: [x, h / 2, z], s: [w, h, d], yaw: 0, pitch: 0, collide: true });
// a 6 m high wall along x (its +z face at z = 0.2, normal +z, a at x = 3, b at x = -3) and a wall meeting its b end
// at a right angle (an inside corner), plus a low wall far away
const segs = buildCoverSegments([box(0, 0, 6, 2.5, 0.4), box(-3.2, 2.2, 0.4, 2.5, 4), box(20, 0, 4, 1.0, 0.4)]);
const links = buildWallLinks(segs);
const front = segs.findIndex((g) => g.nz > 0.99 && Math.abs(g.az - 0.2) < 1e-6 && !g.low);
const side = segs.findIndex((g) => g.nx > 0.99 && Math.abs(g.ax + 3) < 1e-6);
const lowFront = segs.findIndex((g) => g.low && g.nz > 0.99);

function core(): WallCore {
  return new WallCore(segs, links, SO);
}
/** (step 21w, A83) A core with the stick entry turned back on (off by default). */
function stickCore(): WallCore {
  const w = core();
  w.stickEnter = true;
  return w;
}
function inp(x: number, z: number, o: Partial<WallInput> = {}): WallInput {
  return Object.assign(emptyWallInput(), { x, z, lookX: 0, lookZ: -1 }, o);
}
/** Step the core `t` seconds, moving the body by its velocity (a perfect controller). */
function run(w: WallCore, i: WallInput, t: number, dt = 1 / 60): void {
  for (let k = 0; k < Math.round(t / dt); k++) {
    w.update(dt, i);
    i.context = false;
    i.crouchPressed = false;
    if (w.active) {
      i.x += w.vx * dt;
      i.z += w.vz * dt;
    }
  }
}

describe('back-to-wall core (step 11)', () => {
  it('finds the faces and links the inside corner', () => {
    expect(front).toBeGreaterThanOrEqual(0);
    expect(side).toBeGreaterThanOrEqual(0);
    expect(links.nB[front]).toBe(side);
    expect(links.kB[front]).toBe(1);
    expect(links.nA[front]).toBe(-1);
  });

  it('enters within 0.9 m and 100 deg; not from further or facing away', () => {
    const w = core();
    const i = inp(0, 0.2 + SO + 0.85, { context: true });
    w.update(1 / 60, i);
    expect(w.phase).toBe('entering');
    expect(w.seg).toBe(front);
    const far = core();
    far.update(1 / 60, inp(0, 0.2 + SO + 0.95, { context: true }));
    expect(far.phase).toBe('off');
    const away = core();
    away.update(1 / 60, inp(0, 0.2 + SO + 0.5, { context: true, lookX: 0, lookZ: 1 }));
    expect(away.phase).toBe('off');
    // 95 deg off (looking along the wall, slightly away): still inside the 100 deg cone
    const a = (95 * Math.PI) / 180;
    const along = core();
    along.update(1 / 60, inp(0, 0.2 + SO + 0.5, { context: true, lookX: Math.sin(a), lookZ: -Math.cos(a) }));
    expect(along.phase).toBe('entering');
  });

  it('settles onto the body line in 0.2 s + 0.3 s/m (at most 0.45 s), easing in with no overshoot', () => {
    const w = core();
    const i = inp(0.5, 0.2 + SO + 0.6, { context: true });
    w.update(1 / 60, i);
    i.context = false;
    expect(w.enterDur).toBeCloseTo(0.2 + 0.3 * 0.6, 2);
    let minZ = i.z;
    let vMax = 0;
    for (let k = 0; k < 30; k++) {
      run(w, i, 1 / 60);
      minZ = Math.min(minZ, i.z);
      vMax = Math.max(vMax, Math.hypot(w.vx, w.vz));
    }
    expect(w.phase).toBe('on');
    expect(Math.abs(i.z - (0.2 + SO))).toBeLessThan(0.01);
    // never past the standoff, and the peak pace a walk (1.5 x the mean of the eased path)
    expect(minZ).toBeGreaterThan(0.2 + SO - 0.005);
    expect(vMax).toBeLessThan((1.5 * 0.6) / w.enterDur + 0.1);
    const far = core();
    far.update(1 / 60, inp(0.5, 0.2 + SO + 0.89, { context: true }));
    expect(far.enterDur).toBeLessThanOrEqual(0.45);
  });

  it('a low wall is always crouched', () => {
    const w = core();
    const g = segs[lowFront]!;
    w.update(1 / 60, inp(20, g.az + SO + 0.3, { context: true, crouched: false }));
    expect(w.seg).toBe(lowFront);
    expect(w.crouch).toBe(true);
    expect(w.sub() & WALL_SUB.low).toBeTruthy();
    expect(w.sub() & WALL_SUB.crouch).toBeTruthy();
  });

  it('the stick held into a high face for 0.35 s enters (gear <= 4 only)', () => {
    const w = stickCore();
    const i = inp(0, 0.2 + SO + 0.05, { moveX: 0, moveZ: -1, gear: 3 });
    run(w, i, 0.3);
    expect(w.phase).toBe('off');
    run(w, i, 0.07);
    expect(w.phase).toBe('entering');
    const fast = stickCore();
    run(fast, inp(0, 0.2 + SO + 0.05, { moveX: 0, moveZ: -1, gear: 5 }), 0.5);
    expect(fast.phase).toBe('off');
  });

  it('a stick held through a traversal or a fall does not enter until it is released (A48)', () => {
    const w = stickCore();
    // held forward while blocked (a ladder, an attach) and then airborne, landing against the face
    const i = inp(0, 0.2 + SO + 0.05, { moveX: 0, moveZ: -1, gear: 3, blocked: true });
    run(w, i, 0.2);
    i.blocked = false;
    i.grounded = false;
    run(w, i, 0.3);
    i.grounded = true;
    run(w, i, 1.0);
    expect(w.phase).toBe('off');
    // released for one step, then pushed into the face again: enters after 0.35 s
    i.moveZ = 0;
    run(w, i, 1 / 60);
    i.moveZ = -1;
    run(w, i, 0.3);
    expect(w.phase).toBe('off');
    run(w, i, 0.07);
    expect(w.phase).toBe('entering');
    // a release while blocked re-arms too
    const r = stickCore();
    const j = inp(0, 0.2 + SO + 0.05, { moveX: 0, moveZ: -1, gear: 3, grounded: false });
    run(r, j, 0.2);
    j.moveZ = 0;
    run(r, j, 1 / 60);
    j.grounded = true;
    j.moveZ = -1;
    run(r, j, 0.37);
    expect(r.phase).toBe('entering');
  });

  it('(21w, M14) slides at the slow shuffle: 0.9 standing / 0.6 crouched, within the gear cap', () => {
    for (const [gear, crouched, want] of [
      [6, false, 0.9],
      [4, false, 0.9],
      [1, false, 0.8],
      [6, true, 0.6],
      [1, true, 0.5],
    ] as const) {
      const w = core();
      const i = inp(0, 0.2 + SO + 0.1, { context: true, crouched, gear });
      run(w, i, 0.3);
      i.moveX = -1; // towards b (-x)
      w.update(1 / 60, i);
      expect(Math.abs(w.v)).toBeCloseTo(want, 5);
    }
  });

  it('stops at an outside end (edge flag) and wraps round the inside corner', () => {
    const w = core();
    const i = inp(1.5, 0.2 + SO + 0.1, { context: true });
    run(w, i, 0.3);
    i.moveX = 1; // towards a (+x): an outside end
    run(w, i, 2.5);
    expect(w.s).toBeCloseTo(EDGE_MARGIN, 3);
    expect(w.edge).toBe(-1);
    expect(w.sub() & WALL_SUB.edgeR).toBeTruthy();
    // sliding towards +x is the body's right (it faces out of the wall, +z)
    expect(w.sub() & WALL_SUB.faceRight).toBeTruthy();
    i.moveX = -1; // towards b: the inside corner, the held stick carries on along the side wall
    run(w, i, 7.5);
    expect(w.seg).toBe(side);
    expect(w.count.wrap).toBe(1);
    expect(w.s).toBeGreaterThan(SO + 0.5);
    expect(w.sub() & WALL_SUB.faceRight).toBeFalsy();
  });

  it('pulling the stick away held 0.3 s leaves (a brush never does); the context press leaves (toggle)', () => {
    const w = core();
    const i = inp(0, 0.2 + SO + 0.1, { context: true });
    run(w, i, 0.6);
    i.moveZ = 1;
    run(w, i, 0.15);
    expect(w.active).toBe(true);
    // released, then a weak outward push (under 0.7): stays
    i.moveZ = 0;
    run(w, i, 0.1);
    i.moveZ = 0.6;
    run(w, i, 1);
    expect(w.active).toBe(true);
    i.moveZ = 1;
    run(w, i, 0.25);
    expect(w.active).toBe(true);
    run(w, i, 0.07);
    expect(w.phase).toBe('leaving');
    expect(w.lastLeave).toBe('pull');
    run(w, i, WALL.leaveTime + 0.05);
    expect(w.phase).toBe('off');
    const t = core();
    const j = inp(0, 0.2 + SO + 0.1, { context: true });
    run(t, j, 0.3);
    j.context = true;
    t.update(1 / 60, j);
    expect(t.lastLeave).toBe('context');
  });

  it('hold mode (D7): a stick entry stays while the stick is held; a context entry while the button is held', () => {
    // stick entry, hold mode: no context button at all, no enter / leave loop
    const w = stickCore();
    const i = inp(0, 0.2 + SO + 0.05, { moveX: 0, moveZ: -1, gear: 3, toggle: false, contextHeld: false });
    run(w, i, 0.4);
    expect(w.phase).toBe('entering');
    run(w, i, 1.0);
    expect(w.phase).toBe('on');
    expect(w.count.enter).toBe(1);
    expect(w.count.leave).toBe(0);
    // sliding with the stick along the face keeps it
    i.moveX = 1;
    i.moveZ = 0;
    run(w, i, 0.5);
    expect(w.phase).toBe('on');
    // released: leaves (the stick was the hold)
    i.moveX = 0;
    run(w, i, 0.1);
    expect(w.phase).toBe('leaving');
    expect(w.lastLeave).toBe('stick');
    // context entry, hold mode: stays while held, leaves on release
    const c = core();
    const j = inp(0, 0.2 + SO + 0.1, { context: true, contextHeld: true, toggle: false });
    run(c, j, 0.6);
    expect(c.phase).toBe('on');
    j.contextHeld = false;
    run(c, j, 0.1);
    expect(c.phase).toBe('leaving');
    expect(c.lastLeave).toBe('context');
  });

  it('toggle mode (D7): a stick entry stays after the stick is released; the context press leaves', () => {
    const w = stickCore();
    const i = inp(0, 0.2 + SO + 0.05, { moveX: 0, moveZ: -1, gear: 3, toggle: true, contextHeld: false });
    run(w, i, 1.4);
    expect(w.phase).toBe('on');
    i.moveZ = 0;
    run(w, i, 0.5);
    expect(w.phase).toBe('on');
    i.context = true;
    run(w, i, 1 / 60);
    expect(w.lastLeave).toBe('context');
  });

  it('stackClamp keeps capsule centres >= 0.62 m apart', () => {
    const others = new Float64Array([2.0, 3.5]);
    expect(stackClamp(1.8, 1, others, 2)).toBeCloseTo(1.38, 6);
    expect(stackClamp(2.2, -1, others, 2)).toBeCloseTo(2.62, 6);
    expect(stackClamp(2.0, -1, others, 1)).toBeCloseTo(2.62, 6);
    expect(stackClamp(1.0, 1, others, 0)).toBe(1.0);
    // sliding into a stacked team-mate: the slide stops 0.62 m short
    const w = core();
    w.others[0] = 1.5;
    w.othersN = 1;
    const i = inp(1.5, 0.2 + SO + 0.1, { context: true });
    run(w, i, 0.3);
    expect(Math.abs(w.s - 1.5)).toBeGreaterThanOrEqual(WALL.stackGap - 1e-9);
    i.moveX = 1;
    run(w, i, 1);
    expect(Math.abs(w.s - 1.5)).toBeGreaterThanOrEqual(WALL.stackGap - 1e-9);
  });

  it('allocates nothing per step (reused spot, override and velocity)', () => {
    const w = core();
    const i = inp(0, 0.2 + SO + 0.1, { context: true });
    const ov: MoveOverride = {};
    const spot = w.spot;
    run(w, i, 0.3);
    const a = wallOverride(w, ov);
    const v = ov.velocity;
    i.moveX = -0.5;
    run(w, i, 0.2);
    const b = wallOverride(w, ov);
    expect(a).toBe(ov);
    expect(b).toBe(ov);
    expect(ov.velocity).toBe(v);
    expect(w.spot).toBe(spot);
    expect(ov.noise).toBe('crouched');
  });
});

describe('back-to-wall edge verbs (step 12)', () => {
  /** On the front wall near its outside end a (x = 3): the body line at s, settled. */
  function atA(s = 0.6): { w: WallCore; i: WallInput } {
    const w = core();
    const g = segs[front]!;
    const i = inp(g.ax + g.tx * s, 0.2 + SO + 0.3, { context: true });
    run(w, i, 0.6);
    expect(w.phase).toBe('on');
    return { w, i };
  }

  it('flags the edge within 0.35 m of an outside end, not further, never at the inside corner', () => {
    const { w, i } = atA(1.5);
    expect(w.edge).toBe(0);
    // slide toward a (+x): the edge comes on within 0.35 m of the end (s <= 0.22 + 0.35)
    i.moveX = 1;
    let firstS = -1;
    for (let k = 0; k < 120 && firstS < 0; k++) {
      run(w, i, 1 / 60);
      if (w.edge !== 0) firstS = w.s;
    }
    expect(w.edge).toBe(-1);
    expect(firstS).toBeLessThanOrEqual(EDGE_MARGIN + WALL.edgeReach + 1e-3);
    expect(firstS).toBeGreaterThan(EDGE_MARGIN + WALL.edgeReach - 0.06);
    expect(w.sub() & WALL_SUB.edgeR).toBeTruthy();
    // the b end is an inside corner (wrap): no edge there
    const b = core();
    const g = segs[front]!;
    const ib = inp(g.ax + g.tx * (g.len - 0.6), 0.2 + SO + 0.3, { context: true });
    run(b, ib, 0.6);
    expect(b.edge).toBe(0);
  });

  it('peeks after the stick is held toward the edge 0.25 s at the end (21w); eases out when released', () => {
    const { w, i } = atA(EDGE_MARGIN + 0.05);
    i.moveX = 1;
    run(w, i, 0.2);
    // now stopped at the end: the hold counts from there
    expect(w.atEnd).toBe(true);
    w.peekT = 0;
    run(w, i, 0.2);
    expect(w.peekOn).toBe(false);
    run(w, i, 0.1);
    expect(w.peekOn).toBe(true);
    run(w, i, WALL.peekBlend);
    expect(w.peek).toBe(1);
    expect(w.sub() & WALL_SUB.peek).toBeTruthy();
    expect(Math.hypot(w.exX, w.exZ)).toBeCloseTo(WALL.peekOut, 5);
    expect(Math.abs(w.rigLean())).toBeCloseTo(WALL.peekLean, 5);
    i.moveX = 0;
    run(w, i, WALL.peekBlend + 0.02);
    expect(w.peek).toBe(0);
    expect(w.phase).toBe('on');
  });

  it('leans out 0.35 m past the edge while aiming (lk 1) and is back in 0.25 s', () => {
    const { w, i } = atA(EDGE_MARGIN);
    const g = segs[front]!;
    i.aim = true;
    run(w, i, WALL.leanIn + 0.3);
    expect(w.lk).toBe(1);
    expect(w.lean).toBe(1);
    expect(w.leanS).toBeCloseTo(-WALL.leanOut, 5);
    // the body went past the end (toward a: along -t)
    const along = (i.x - g.ax) * g.tx + (i.z - g.az) * g.tz;
    expect(along).toBeLessThan(EDGE_MARGIN - WALL.leanOut + 0.03);
    expect(w.sub() & WALL_SUB.lean).toBeTruthy();
    i.aim = false;
    run(w, i, WALL.leanBack - 1 / 60);
    expect(w.lean).toBeGreaterThan(0);
    run(w, i, 2 / 60);
    expect(w.lean).toBe(0);
    expect(w.lk).toBe(0);
  });

  it('rises over the top of a low wall to aim (lk 2, standing)', () => {
    const w = core();
    const g = segs[lowFront]!;
    const i = inp(g.ax + g.tx * 2, 0.2 + SO + 0.3, { context: true });
    run(w, i, 0.6);
    expect(w.phase).toBe('on');
    i.aim = true;
    run(w, i, 0.4);
    expect(w.lk).toBe(2);
    const ov: MoveOverride = {};
    expect(wallOverride(w, ov)!.crouch).toBe(false);
  });

  it('(21w, M14) at an outside end the body stops and stays on the wall: pushing on (round the corner too) peeks', () => {
    const { w, i } = atA(EDGE_MARGIN);
    run(w, i, 1);
    expect(w.phase).toBe('on');
    // toward the end and into the wall (round the corner) for 2 s: still on, stopped on the end, peeking
    i.moveX = 0.8;
    i.moveZ = -0.6;
    run(w, i, 2);
    expect(w.phase).toBe('on');
    expect(w.s).toBeCloseTo(EDGE_MARGIN, 3);
    expect(w.peekOn).toBe(true);
    // straight past the end for 2 s: the same
    i.moveX = 1;
    i.moveZ = 0;
    run(w, i, 2);
    expect(w.phase).toBe('on');
    expect(w.s).toBeCloseTo(EDGE_MARGIN, 3);
    expect(w.count.leave).toBe(0);
  });

  it('(21w) peek needs a deliberate push: small stick noise never peeks; once on it holds over the keep threshold', () => {
    expect(wallPeekWanted(false, 1, WALL.peekHold - 0.01)).toBe(false);
    expect(wallPeekWanted(false, 1, WALL.peekHold)).toBe(true);
    expect(wallPeekWanted(true, WALL.peekKeep + 0.01, 0)).toBe(true);
    expect(wallPeekWanted(true, WALL.peekKeep - 0.01, 0)).toBe(false);
    const { w, i } = atA(EDGE_MARGIN);
    run(w, i, 1);
    // noise toward the edge (under the 0.6 push) for 2 s: no peek
    i.moveX = 0.5;
    run(w, i, 2);
    expect(w.peekOn).toBe(false);
    // a deliberate push: on after the hold; easing the push to 0.4 keeps it
    i.moveX = 1;
    run(w, i, WALL.peekHold + 2 / 60);
    expect(w.peekOn).toBe(true);
    i.moveX = 0.4;
    run(w, i, 0.5);
    expect(w.peekOn).toBe(true);
    i.moveX = 0;
    run(w, i, 1 / 60);
    expect(w.peekOn).toBe(false);
  });

  it('(21w) wallSlideSpeed: dead band, analog, crouched and the gear cap', () => {
    expect(wallSlideSpeed(0.15, false, 2)).toBe(0);
    expect(wallSlideSpeed(1, false, 2)).toBeCloseTo(0.9, 9);
    expect(wallSlideSpeed(-1, true, 2)).toBeCloseTo(-0.6, 9);
    expect(wallSlideSpeed(0.6, false, 2)).toBeCloseTo(0.45, 9);
    expect(wallSlideSpeed(1, false, 0.8)).toBeCloseTo(0.8, 9);
  });

  it('(21w, M14) crouch on a high wall: the press toggles on the wall (hold mode: the held button), the body stays on', () => {
    const w = core();
    const i = inp(0, 0.2 + SO + 0.1, { context: true });
    run(w, i, 0.6);
    expect(w.crouch).toBe(false);
    i.crouchPressed = true;
    run(w, i, 1 / 60);
    expect(w.crouch).toBe(true);
    expect(w.phase).toBe('on');
    expect(w.sub() & WALL_SUB.crouch).toBeTruthy();
    i.moveX = -1;
    run(w, i, 0.2);
    expect(Math.abs(w.v)).toBeCloseTo(0.6, 6);
    i.crouchPressed = true;
    run(w, i, 1 / 60);
    expect(w.crouch).toBe(false);
    // hold mode
    i.crouchHold = true;
    i.crouchHeld = true;
    run(w, i, 1 / 60);
    expect(w.crouch).toBe(true);
    i.crouchHeld = false;
    run(w, i, 1 / 60);
    expect(w.crouch).toBe(false);
    expect(w.phase).toBe('on');
  });

  it('(21w, A83) the stick held into a high face never enters on its own (context press only)', () => {
    const w = core();
    const i = inp(0, 0.2 + SO + 0.05, { moveX: 0, moveZ: -1, gear: 3 });
    run(w, i, 1.5);
    expect(w.phase).toBe('off');
  });

  it('SWAT turn across a 0.8-2.0 m coplanar gap: duration clamp, crouched, ends on the far wall', () => {
    expect(swatDuration(0.8)).toBe(0.5);
    expect(swatDuration(1.1)).toBeCloseTo((1.1 / 2.4) * 1.15, 6);
    expect(swatDuration(2.0)).toBe(0.8);
    // two walls on one line with a 1.1 m doorway; another pair 2.4 m apart (no SWAT)
    const ss = buildCoverSegments([box(0, 10, 4, 2.5, 0.4), box(5.1, 10, 4, 2.5, 0.4), box(0, 30, 4, 2.5, 0.4), box(6.4, 30, 4, 2.5, 0.4)]);
    const L = buildWallLinks(ss);
    const near = ss.findIndex((g) => g.nz > 0.99 && Math.abs(g.az - 10.2) < 1e-6 && Math.max(g.ax, g.bx) < 2.1);
    const far = ss.findIndex((g) => g.nz > 0.99 && Math.abs(g.az - 10.2) < 1e-6 && Math.min(g.ax, g.bx) > 3);
    const wide = ss.findIndex((g) => g.nz > 0.99 && Math.abs(g.az - 30.2) < 1e-6 && Math.max(g.ax, g.bx) < 2.1);
    const ng = ss[near]!;
    const endAtDoor = ng.ax > ng.bx ? 0 : 1;
    expect(endAtDoor ? L.gB[near] : L.gA[near]).toBe(far);
    expect(endAtDoor ? L.gapB[near] : L.gapA[near]).toBeCloseTo(1.1, 3);
    expect(L.gA[wide]).toBe(-1);
    expect(L.gB[wide]).toBe(-1);
    const w = new WallCore(ss, L, SO);
    const i = inp(1.0, 10.2 + SO + 0.3, { context: true });
    run(w, i, 0.6);
    i.moveX = 1;
    run(w, i, 1.2);
    expect(w.atEnd).toBe(true);
    expect(w.swatTarget).toBe(far);
    i.context = true;
    w.update(1 / 60, i);
    expect(w.phase).toBe('swat');
    expect(w.crouch).toBe(true);
    expect(w.swatDur).toBeCloseTo(swatDuration(1.1), 6);
    const n0 = w.count.swat;
    run(w, i, w.swatDur + 0.05);
    expect(w.phase).toBe('on');
    expect(w.seg).toBe(far);
    expect(w.count.swat).toBe(n0);
    expect(Math.abs(i.x - w.swatTo.x)).toBeLessThan(0.1);
  });
});

describe('back-to-wall edge choice and SWAT gap (step 12 r1)', () => {
  // a 1.0 m pillar: its +z face has both outside ends within `edgeReach` from the middle
  const ps = buildCoverSegments([box(0, 40, 1.0, 2.5, 1.0)]);
  const PL = buildWallLinks(ps);
  const pf = ps.findIndex((g) => g.nz > 0.99);
  /** On the pillar face at `s` along it (settled, stick idle). */
  function onPillar(s: number): { w: WallCore; i: WallInput } {
    const g = ps[pf]!;
    const w = new WallCore(ps, PL, SO);
    const i = inp(g.ax + g.tx * s, g.az + SO + 0.3, { context: true });
    run(w, i, 0.6);
    expect(w.phase).toBe('on');
    expect(w.seg).toBe(pf);
    return { w, i };
  }

  it('a short face (both outside ends within 0.35 m): the stick picks the end, idle the nearer', () => {
    expect(pf).toBeGreaterThanOrEqual(0);
    expect(PL.kA[pf]).toBe(0);
    expect(PL.kB[pf]).toBe(0);
    const g = ps[pf]!;
    const mid = g.len / 2;
    // both ends in reach from the middle
    expect(mid - EDGE_MARGIN).toBeLessThanOrEqual(WALL.edgeReach);
    // stick +t -> edge 1 (b, edgeL); -t -> edge -1 (a, edgeR)
    {
      const { w, i } = onPillar(mid);
      i.moveX = g.tx * 0.6;
      i.moveZ = g.tz * 0.6;
      w.update(1 / 60, i);
      expect(w.edge).toBe(1);
      expect(w.sub() & WALL_SUB.edgeL).toBeTruthy();
    }
    {
      const { w, i } = onPillar(mid);
      i.moveX = -g.tx * 0.6;
      i.moveZ = -g.tz * 0.6;
      w.update(1 / 60, i);
      expect(w.edge).toBe(-1);
      expect(w.sub() & WALL_SUB.edgeR).toBeTruthy();
    }
    // idle: the nearer end
    {
      const { w, i } = onPillar(mid + 0.06);
      w.update(1 / 60, i);
      expect(w.s).toBeGreaterThan(mid);
      expect(w.edge).toBe(1);
    }
    {
      const { w, i } = onPillar(mid - 0.06);
      w.update(1 / 60, i);
      expect(w.s).toBeLessThan(mid);
      expect(w.edge).toBe(-1);
    }
  });

  it('a coplanar gap under 0.8 m gets no SWAT target (the end is still an edge)', () => {
    // two walls on one line with a 0.6 m gap
    const ss = buildCoverSegments([box(0, 60, 4, 2.5, 0.4), box(4.6, 60, 4, 2.5, 0.4)]);
    const L = buildWallLinks(ss);
    const near = ss.findIndex((g) => g.nz > 0.99 && Math.abs(g.az - 60.2) < 1e-6 && Math.max(g.ax, g.bx) < 2.1);
    expect(near).toBeGreaterThanOrEqual(0);
    const ng = ss[near]!;
    const endAtGap = ng.ax > ng.bx ? 0 : 1;
    expect(endAtGap ? L.kB[near] : L.kA[near]).toBe(0);
    expect(endAtGap ? L.gB[near] : L.gA[near]).toBe(-1);
    const w = new WallCore(ss, L, SO);
    const i = inp(1.0, 60.2 + SO + 0.3, { context: true });
    run(w, i, 0.6);
    i.moveX = 1;
    run(w, i, 1.2);
    expect(w.atEnd).toBe(true);
    expect(w.edge).not.toBe(0);
    expect(w.swatTarget).toBe(-1);
    i.context = true;
    w.update(1 / 60, i);
    expect(w.phase).not.toBe('swat');
  });
});

describe('peek light parity (step 12, bible 5.1)', () => {
  it('wallPeekOffset: the head peekOut past the edge from the MoveState alone (edgeL = +t, edgeR = -t)', () => {
    const o = { x: 9, z: 9 };
    wallPeekOffset('wall', WALL_SUB.peek | WALL_SUB.edgeL, 1, 0, o);
    expect(o.x).toBeCloseTo(WALL.peekOut, 9);
    expect(o.z).toBe(0);
    wallPeekOffset('wall', WALL_SUB.peek | WALL_SUB.edgeR, 0, 1, o);
    expect(o.z).toBeCloseTo(-WALL.peekOut, 9);
    // no peek bit, no edge, or not on a wall: no offset
    for (const [m, sub] of [['wall', WALL_SUB.edgeL], ['wall', WALL_SUB.peek], ['ground', WALL_SUB.peek | WALL_SUB.edgeL]] as const) {
      wallPeekOffset(m, sub, 1, 0, o);
      expect(o.x === 0 && o.z === 0).toBe(true);
    }
    // (r1) the blend amount: the owner's smoothstep (half-way in = half out; 0 = none)
    wallPeekOffset('wall', WALL_SUB.peek | WALL_SUB.edgeL, 1, 0, o, 0.5);
    expect(o.x).toBeCloseTo(WALL.peekOut * 0.5, 9);
    wallPeekOffset('wall', WALL_SUB.peek | WALL_SUB.edgeL, 1, 0, o, 0.25);
    expect(o.x).toBeCloseTo(WALL.peekOut * 0.15625, 9);
    wallPeekOffset('wall', WALL_SUB.peek | WALL_SUB.edgeL, 1, 0, o, 0);
    expect(o.x).toBe(0);
  });

  it('the light sample takes the head where it is: a peek into a lit pool reads lit, the body behind the edge stays dark', () => {
    const reg = new LightRegistry();
    reg.ambient = 0.02;
    // a bright pool starting 0.1 m past the edge at x = 0 (the body stands at x = -0.1, behind it)
    reg.addZone({ minX: 0.1, maxX: 5, minY: -1, maxY: 4, minZ: -5, maxZ: 5, ambient: 0.8 });
    const f = new LightField(null, reg);
    const dark = f.bodyLevel(-0.1, 0, 0, 1.75);
    const o = wallPeekOffset('wall', WALL_SUB.peek | WALL_SUB.edgeL, 1, 0, { x: 0, z: 0 });
    const peek = f.bodyLevel(-0.1, 0, 0, 1.75, undefined, o.x, o.z);
    expect(dark).toBeLessThan(0.1);
    expect(peek).toBeGreaterThan(0.7);
    // the default (no offset) is the old sample
    expect(f.bodyLevel(-0.1, 0, 0, 1.75, undefined, 0, 0)).toBe(dark);
  });
});

describe('open-side weapon and low-wall side lean (step 12b, D9 / D10)', () => {
  // a free-standing high wall and a low wall, both ends outside (edges), front faces normal +z at z = 0.2
  const sg = buildCoverSegments([box(0, 0, 4, 2.5, 0.4), box(20, 0, 4, 1.0, 0.4)]);
  const lk2 = buildWallLinks(sg);
  const hi = sg.findIndex((g) => g.nz > 0.99 && !g.low);
  const lo = sg.findIndex((g) => g.nz > 0.99 && g.low);
  /** Settled on face `k` at its end b (edge +1, edgeL) or a (edge -1, edgeR). */
  function atEnd(k: number, end: 'a' | 'b'): { w: WallCore; i: WallInput; tx: number; tz: number } {
    const g = sg[k]!;
    const w = new WallCore(sg, lk2, SO);
    const s = end === 'a' ? EDGE_MARGIN + 0.05 : g.len - EDGE_MARGIN - 0.05;
    const i = inp(g.ax + g.tx * s, 0.2 + SO + 0.3, { context: true });
    run(w, i, 0.6);
    const e = end === 'b' ? 1 : -1;
    // slide onto the end (the stick toward it), then idle
    i.moveX = g.tx * e;
    i.moveZ = g.tz * e;
    run(w, i, 0.15);
    i.moveX = i.moveZ = 0;
    run(w, i, 0.05);
    expect(w.phase).toBe('on');
    expect(w.edge).toBe(e);
    return { w, i, tx: g.tx * e, tz: g.tz * e };
  }

  it('openSide: left at edgeL, right at edgeR, right mid-wall', () => {
    expect(openSide(WALL_SUB.edgeL)).toBe(-1);
    expect(openSide(WALL_SUB.edgeR)).toBe(1);
    expect(openSide(0)).toBe(1);
    expect(openSide(WALL_SUB.crouch | WALL_SUB.low | WALL_SUB.lean)).toBe(1);
  });

  it('wallLeftHand: only at edgeL while peeking or leaning out (not over the top)', () => {
    expect(wallLeftHand(WALL_SUB.edgeL | WALL_SUB.peek, 0)).toBe(true);
    expect(wallLeftHand(WALL_SUB.edgeL | WALL_SUB.lean, LEAN_KIND.out)).toBe(true);
    expect(wallLeftHand(WALL_SUB.edgeL | WALL_SUB.lean, LEAN_KIND.over)).toBe(false);
    expect(wallLeftHand(WALL_SUB.edgeL, 0)).toBe(false);
    expect(wallLeftHand(WALL_SUB.edgeR | WALL_SUB.peek, 0)).toBe(false);
    expect(wallLeftHand(WALL_SUB.edgeR | WALL_SUB.lean, LEAN_KIND.out)).toBe(false);
    expect(wallLeftHand(WALL_SUB.lean | WALL_SUB.peek, LEAN_KIND.out)).toBe(false);
  });

  it('lowAimKind: stick or look toward the end leans out; stick up, away or mid-wall rises over', () => {
    expect(lowAimKind(1, true, 1, 0, 0)).toBe(LEAN_KIND.out);
    expect(lowAimKind(-1, true, 0.8, 0.2, -1)).toBe(LEAN_KIND.out);
    expect(lowAimKind(1, true, 0, 1, 1)).toBe(LEAN_KIND.over);
    expect(lowAimKind(1, true, -1, 0, 1)).toBe(LEAN_KIND.over);
    expect(lowAimKind(1, true, 0, 0, 0.9)).toBe(LEAN_KIND.out);
    expect(lowAimKind(1, true, 0, 0, 0.2)).toBe(LEAN_KIND.over);
    expect(lowAimKind(0, false, 1, 0, 1)).toBe(LEAN_KIND.over);
    expect(lowAimKind(1, false, 1, 0, 1)).toBe(LEAN_KIND.over);
  });

  it('high wall: leftHand set at edgeL while leaning out or peeking, never at edgeR; back off on release', () => {
    const L = atEnd(hi, 'b');
    expect(L.w.leftHand).toBe(false);
    L.i.aim = true;
    run(L.w, L.i, 1 / 60);
    expect(L.w.lk).toBe(LEAN_KIND.out);
    expect(L.w.leftHand).toBe(true);
    run(L.w, L.i, WALL.leanIn);
    expect(L.w.leftHand).toBe(true);
    L.i.aim = false;
    run(L.w, L.i, WALL.leanBack + 2 / 60);
    expect(L.w.leftHand).toBe(false);
    // the peek (look past the edge) at edgeL
    L.i.lookX = L.tx;
    L.i.lookZ = L.tz;
    run(L.w, L.i, WALL.peekHold + 2 / 60);
    expect(L.w.peekOn).toBe(true);
    expect(L.w.leftHand).toBe(true);
    const R = atEnd(hi, 'a');
    R.i.aim = true;
    run(R.w, R.i, WALL.leanIn + 0.1);
    expect(R.w.lk).toBe(LEAN_KIND.out);
    expect(R.w.leftHand).toBe(false);
    expect(R.w.sub() & WALL_SUB.leftHand).toBe(0);
  });

  it('low wall at an edge: stick / look toward the end leans out crouched (lk 1); stick up or mid-wall rises (lk 2)', () => {
    for (const end of ['a', 'b'] as const) {
      const { w, i, tx, tz } = atEnd(lo, end);
      i.aim = true;
      i.moveX = tx;
      i.moveZ = tz;
      run(w, i, WALL.leanIn + 0.1);
      expect(w.lk).toBe(LEAN_KIND.out);
      expect(w.sub() & WALL_SUB.low).toBeTruthy();
      expect(Math.abs(w.leanS)).toBeCloseTo(WALL.leanOut, 5);
      expect(wallOverride(w, {})!.crouch).toBe(true);
      expect(w.leftHand).toBe(end === 'b');
      i.aim = false;
      i.moveX = i.moveZ = 0;
      run(w, i, WALL.leanBack + 0.05);
      expect(w.lk).toBe(0);
      // the stick up: over the top, standing, right hand
      i.aim = true;
      i.moveUp = 1;
      run(w, i, 0.4);
      expect(w.lk).toBe(LEAN_KIND.over);
      expect(wallOverride(w, {})!.crouch).toBe(false);
      expect(w.leftHand).toBe(false);
    }
    // mid-wall: over the top even looking along the wall
    const w = new WallCore(sg, lk2, SO);
    const g = sg[lo]!;
    const i = inp(g.ax + g.tx * 2, 0.2 + SO + 0.3, { context: true });
    run(w, i, 0.6);
    i.aim = true;
    i.lookX = g.tx;
    i.lookZ = g.tz;
    run(w, i, 0.4);
    expect(w.lk).toBe(LEAN_KIND.over);
  });

  it('crouched peek round a low-wall end works like the high-wall peek', () => {
    const { w, i, tx, tz } = atEnd(lo, 'a');
    expect(w.crouch).toBe(true);
    i.moveX = tx;
    i.moveZ = tz;
    run(w, i, WALL.peekHold + WALL.peekBlend + 0.05);
    expect(w.peekOn).toBe(true);
    expect(w.sub() & (WALL_SUB.peek | WALL_SUB.low | WALL_SUB.crouch)).toBe(WALL_SUB.peek | WALL_SUB.low | WALL_SUB.crouch);
    expect(Math.abs(w.rigLean())).toBeCloseTo(WALL.peekLean, 5);
    expect(wallOverride(w, {})!.crouch).toBe(true);
  });

  it('wallHeadCap sits under the wall top', () => {
    const g = sg[lo]!;
    expect(wallHeadCap(g.y, g.height)).toBeLessThan(g.y + g.height - 0.1);
  });
});

describe('(M16) lean-out arc', () => {
  // a face with normal +z, the edge toward +x
  const past = (deg: number) => leanPastEdge(Math.sin((deg * Math.PI) / 180), Math.cos((deg * Math.PI) / 180), 0, 1, 1, 0);
  it('measures the look round past the edge line', () => {
    expect(past(0)).toBeCloseTo(-Math.PI / 2); // facing out
    expect(past(90)).toBeCloseTo(0); // along the wall toward the edge
    expect(past(180)).toBeCloseTo(Math.PI / 2); // straight into the wall
    expect(past(-170)).toBeGreaterThan(Math.PI / 2); // round behind the wall on the far side: beyond the arc
    expect(past(-90)).toBeCloseTo(-Math.PI); // along the wall away from the edge (the room side's far end)
  });
  it('turns the body toward the aim inside the arc, never past it', () => {
    expect(leanBodyTurn(past(0), 1)).toBe(0);
    expect(leanBodyTurn(past(120), 1)).toBeCloseTo((120 * Math.PI) / 180);
    expect(leanBodyTurn(past(180), 1)).toBeCloseTo(Math.PI / 2 + WALL.leanArc);
    expect(leanBodyTurn(past(-170), 1)).toBeCloseTo(Math.PI / 2 + WALL.leanArc);
    expect(leanBodyTurn(past(120), 0)).toBe(0);
    expect(WALL.leanArc).toBeGreaterThanOrEqual((70 * Math.PI) / 180);
    expect(WALL.leanArc).toBeLessThanOrEqual((90 * Math.PI) / 180);
  });
});
