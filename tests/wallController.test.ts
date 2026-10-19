import { describe, expect, it } from 'vitest';
import { buildCoverSegments, EDGE_MARGIN, type CoverBox } from '../src/cover/coverData';
import { WALL_SIDE, WALL_TURN, wallHeadYaw, wallRootPush, wallSideFromSub, wallTurnRate, wallYawOffset } from '../src/player/wallController';
import { WALL, WALL_SUB, WallCore, wallPeekWanted, wallSlideSpeed, buildWallLinks, emptyWallInput, openSide, stackClamp, wallLeftHand, wallOverride, wallPeekOffset, wallFacing, wallPeekView, type WallInput } from '../src/player/wallController';
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

  it('enters within 0.5 m (playtest 2) and 100 deg; not from further or facing away', () => {
    const w = core();
    const i = inp(0, 0.2 + SO + 0.45, { context: true });
    w.update(1 / 60, i);
    expect(w.phase).toBe('entering');
    expect(w.seg).toBe(front);
    const far = core();
    far.update(1 / 60, inp(0, 0.2 + SO + 0.55, { context: true }));
    expect(far.phase).toBe('off');
    const away = core();
    away.update(1 / 60, inp(0, 0.2 + SO + 0.45, { context: true, lookX: 0, lookZ: 1 }));
    expect(away.phase).toBe('off');
    // 95 deg off (looking along the wall, slightly away): still inside the 100 deg cone
    const a = (95 * Math.PI) / 180;
    const along = core();
    along.update(1 / 60, inp(0, 0.2 + SO + 0.45, { context: true, lookX: Math.sin(a), lookZ: -Math.cos(a) }));
    expect(along.phase).toBe('entering');
  });

  it('settles onto the body line in 0.14 s + 0.2 s/m (at most 0.24 s), easing in with no overshoot', () => {
    const w = core();
    const i = inp(0.5, 0.2 + SO + 0.4, { context: true });
    w.update(1 / 60, i);
    i.context = false;
    expect(w.enterDur).toBeCloseTo(0.14 + 0.2 * 0.4, 2);
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
    expect(vMax).toBeLessThan((1.5 * 0.4) / w.enterDur + 0.1);
    const far = core();
    far.update(1 / 60, inp(0.5, 0.2 + SO + 0.49, { context: true }));
    expect(far.enterDur).toBeLessThanOrEqual(0.24);
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

  // (G6, AUDIT-WALLS row 2, replaces F1b's +50 %) 051917: standing 0.35 m/s and crouched 0.5 m/s at the spawn gear 3
  it('(A3, G35; G6) slides at the CT pace: 0.39 standing / 0.55 crouched at gear 4 (0.35 / 0.5 at gear 3), slower at the low gears', () => {
    expect(wallSlideSpeed(1, false, 3)).toBeCloseTo(0.351, 3);
    expect(wallSlideSpeed(1, true, 3)).toBeCloseTo(0.495, 3);
    for (const [gear, crouched, want] of [
      [6, false, 0.39],
      [4, false, 0.39],
      [1, false, 0.39 * WALL.slideGear1],
      [6, true, 0.55],
      [1, true, 0.55 * WALL.slideGear1],
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
    i.moveX = 1; // towards a (+x): an outside end (1.3 m at the 0.35 m/s shuffle)
    run(w, i, 6);
    expect(w.s).toBeCloseTo(EDGE_MARGIN, 3);
    expect(w.edge).toBe(-1);
    expect(w.sub() & WALL_SUB.edgeR).toBeTruthy();
    // sliding towards +x is the body's right (it faces out of the wall, +z)
    expect(w.sub() & WALL_SUB.faceRight).toBeTruthy();
    i.moveX = -1; // towards b: the inside corner, the held stick carries on along the side wall
    run(w, i, 25);
    expect(w.seg).toBe(side);
    expect(w.count.wrap).toBe(1);
    expect(w.s).toBeGreaterThan(SO + 0.5);
    expect(w.sub() & WALL_SUB.faceRight).toBeFalsy();
  });

  it('(A3, loco M25) pulling the stick away never leaves; the context press, aiming or another action does', () => {
    const w = core();
    const i = inp(0, 0.2 + SO + 0.1, { context: true });
    run(w, i, 0.6);
    i.moveZ = 1;
    run(w, i, 3);
    expect(w.active).toBe(true);
    expect(w.count.leave).toBe(0);
    // the button again (toggle) leaves
    i.moveZ = 0;
    i.context = true;
    w.update(1 / 60, i);
    expect(w.lastLeave).toBe('context');
    run(w, i, WALL.leaveTime + 0.05);
    expect(w.phase).toBe('off');
    // aiming / another action: the leave input
    const a = core();
    const j = inp(0, 0.2 + SO + 0.1, { context: true });
    run(a, j, 0.6);
    j.leave = true;
    a.update(1 / 60, j);
    expect(a.lastLeave).toBe('action');
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
    for (let k = 0; k < 400 && firstS < 0; k++) {
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

  it('(A3, G36) peeks at once when the stick is pushed toward the edge at the end; eases out when released', () => {
    const { w, i } = atA(EDGE_MARGIN + 0.05);
    i.moveX = 1;
    run(w, i, 0.4);
    expect(w.atEnd).toBe(true);
    // no hold: a peek is on within a frame or two of reaching the end
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

  it('(A3) peek needs a push over the threshold: small stick noise never peeks; once on it holds over the keep threshold', () => {
    expect(wallPeekWanted(false, WALL.peekPush - 0.01)).toBe(false);
    expect(wallPeekWanted(false, WALL.peekPush + 0.01)).toBe(true);
    expect(wallPeekWanted(true, WALL.peekKeep + 0.01)).toBe(true);
    expect(wallPeekWanted(true, WALL.peekKeep - 0.01)).toBe(false);
    const { w, i } = atA(EDGE_MARGIN);
    run(w, i, 1);
    // noise toward the edge (under the push) for 2 s: no peek
    i.moveX = 0.3;
    run(w, i, 2);
    expect(w.peekOn).toBe(false);
    // a push: on at once; easing it to 0.3 keeps it
    i.moveX = 1;
    run(w, i, 3 / 60);
    expect(w.peekOn).toBe(true);
    i.moveX = 0.3;
    run(w, i, 0.5);
    expect(w.peekOn).toBe(true);
    i.moveX = 0;
    run(w, i, 1 / 60);
    expect(w.peekOn).toBe(false);
  });

  it('(A3) wallSlideSpeed: dead band, analog, crouched and the gear', () => {
    expect(wallSlideSpeed(0.15, false, 4)).toBe(0);
    expect(wallSlideSpeed(1, false, 4)).toBeCloseTo(0.39, 9);
    expect(wallSlideSpeed(-1, true, 4)).toBeCloseTo(-0.55, 9);
    expect(wallSlideSpeed(0.6, false, 4)).toBeCloseTo(0.195, 9);
    expect(wallSlideSpeed(1, false, 1)).toBeCloseTo(0.39 * WALL.slideGear1, 9);
    expect(wallSlideSpeed(1, false, 6)).toBeCloseTo(0.39, 9);
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
    expect(Math.abs(w.v)).toBeCloseTo(0.55 * (WALL.slideGear1 + (1 - WALL.slideGear1) * (2 / 3)), 6);
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

});

describe('back-to-wall edge choice (step 12 r1)', () => {
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

describe('open-side weapon and the peek (step 12b, D9)', () => {
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
    run(w, i, WALL.peekBlend + 0.05);
    expect(w.phase).toBe('on');
    expect(w.edge).toBe(e);
    return { w, i, tx: g.tx * e, tz: g.tz * e };
  }

  it('openSide: left at edgeL, right at edgeR, right mid-wall', () => {
    expect(openSide(WALL_SUB.edgeL)).toBe(-1);
    expect(openSide(WALL_SUB.edgeR)).toBe(1);
    expect(openSide(0)).toBe(1);
    expect(openSide(WALL_SUB.crouch | WALL_SUB.low)).toBe(1);
  });

  it('wallLeftHand: only at edgeL while peeking', () => {
    expect(wallLeftHand(WALL_SUB.edgeL | WALL_SUB.peek)).toBe(true);
    expect(wallLeftHand(WALL_SUB.edgeL)).toBe(false);
    expect(wallLeftHand(WALL_SUB.edgeR | WALL_SUB.peek)).toBe(false);
    expect(wallLeftHand(WALL_SUB.peek)).toBe(false);
  });

  it('high wall: leftHand set at edgeL while peeking, never at edgeR; back off when the peek ends', () => {
    const L = atEnd(hi, 'b');
    expect(L.w.leftHand).toBe(false);
    // the peek (look past the edge) at edgeL
    L.i.lookX = L.tx;
    L.i.lookZ = L.tz;
    run(L.w, L.i, 3 / 60);
    expect(L.w.peekOn).toBe(true);
    expect(L.w.leftHand).toBe(true);
    L.i.lookX = 0;
    L.i.lookZ = -1;
    run(L.w, L.i, WALL.peekBlend + 2 / 60);
    expect(L.w.leftHand).toBe(false);
    const R = atEnd(hi, 'a');
    R.i.lookX = R.tx;
    R.i.lookZ = R.tz;
    run(R.w, R.i, 3 / 60);
    expect(R.w.peekOn).toBe(true);
    expect(R.w.leftHand).toBe(false);
    expect(R.w.sub() & WALL_SUB.leftHand).toBe(0);
  });

  it('crouched peek round a low-wall end works like the high-wall peek', () => {
    const { w, i, tx, tz } = atEnd(lo, 'a');
    expect(w.crouch).toBe(true);
    i.moveX = tx;
    i.moveZ = tz;
    run(w, i, WALL.peekBlend + 0.1);
    expect(w.peekOn).toBe(true);
    expect(w.sub() & (WALL_SUB.peek | WALL_SUB.low | WALL_SUB.crouch)).toBe(WALL_SUB.peek | WALL_SUB.low | WALL_SUB.crouch);
    expect(Math.abs(w.rigLean())).toBeCloseTo(WALL.peekLean, 5);
    expect(wallOverride(w, {})!.crouch).toBe(true);
  });

});


describe('F4: the edge sets the side, never the camera', () => {
  it('wallFacing: at an edge the open side (edge 1 = left), else the slide facing', () => {
    for (const dir of [-1, 1]) {
      expect(wallFacing(1, dir)).toBe(-1);
      expect(wallFacing(-1, dir)).toBe(1);
    }
    expect(wallFacing(0, -1)).toBe(1);
    expect(wallFacing(0, 1)).toBe(-1);
  });
  it('wallPeekView: the stick push or the look past the edge drives the camera slide (0..1)', () => {
    expect(wallPeekView(0, 0)).toBe(0);
    expect(wallPeekView(-1, -1)).toBe(0);
    expect(wallPeekView(0.5, 0)).toBeCloseTo(0.5);
    expect(wallPeekView(0, WALL.peekLook)).toBeCloseTo(1);
    expect(wallPeekView(0, WALL.viewLook)).toBeCloseTo(0);
    expect(wallPeekView(0, (WALL.viewLook + WALL.peekLook) / 2)).toBeCloseTo(0.5);
    expect(wallPeekView(2, 2)).toBe(1);
  });
});

// (CT prototype G6) the side-on crouch, the turn curves, the standing slide look (AUDIT-WALLS rows 1, 3, 9, 15, 16)
describe('wall stance and turns (G6)', () => {
  it('crouched the body turns side-on toward the travel (83 deg), standing it faces out', () => {
    expect(wallYawOffset(0, 1)).toBe(0);
    expect(wallYawOffset(1, 1)).toBeCloseTo(WALL_SIDE.yaw, 9);
    expect(wallYawOffset(1, -1)).toBeCloseTo(-WALL_SIDE.yaw, 9);
    expect((WALL_SIDE.yaw * 180) / Math.PI).toBeGreaterThan(80);
    expect((WALL_SIDE.yaw * 180) / Math.PI).toBeLessThan(86);
    const mid = wallYawOffset((WALL_SIDE.from + WALL_SIDE.to) / 2, 1);
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(1.2);
  });
  it('the entry turn is front-loaded (180 deg in about 0.27 s), the side-on reversal takes about 0.45 s, the rise about 0.23 s', () => {
    // simulate the limiter
    const turn = (from: number, to: number, settled: boolean, crouch: number, onWall = true): number => {
      let y = from;
      let t = 0;
      for (; Math.abs(to - y) > 1e-3 && t < 2; t += 1 / 60) {
        const d = to - y;
        const mx = wallTurnRate(Math.abs(d), onWall, settled, crouch) / 60;
        y += Math.max(-mx, Math.min(mx, d));
      }
      return t;
    };
    const entry = turn(Math.PI, 0, false, 0);
    expect(entry).toBeGreaterThan(0.22);
    expect(entry).toBeLessThan(0.32);
    // the first 90 deg in under 0.1 s (051917 @ 12.87-12.93: back view to profile in 0.07 s)
    expect(Math.PI / 2 / WALL_TURN.fast).toBeLessThan(0.1);
    const rev = turn(WALL_SIDE.yaw, -WALL_SIDE.yaw, true, 1);
    expect(rev).toBeGreaterThan(0.4);
    expect(rev).toBeLessThan(0.5);
    const rise = turn(WALL_SIDE.yaw, 0, true, 0.9);
    expect(rise).toBeLessThanOrEqual(0.25);
    // the turn out of the wall (AUDIT-EXTRA-OLD row 17): 110 deg in 0.25-0.3 s
    const out = turn(0, (110 * Math.PI) / 180, false, 0, false);
    expect(out).toBeGreaterThan(0.2);
    expect(out).toBeLessThan(0.3);
    expect(WALL.leaveTime).toBeCloseTo(0.28, 6);
  });
  it('side-on the root comes in so the wall-side shoulder is about 3 cm off the face (square: unchanged)', () => {
    const square = wallRootPush(0.35, 0.15, 0, 0.19);
    expect(square).toBeCloseTo(0.35 - 0.15 - 0.015, 9);
    const side = wallRootPush(0.35, 0.15, 1, 0.19);
    // the body line 0.35 out: the root ends shoulder + arm + 1.5 cm from the face
    expect(0.35 - side).toBeCloseTo(0.19 + WALL_SIDE.arm + 0.015, 9);
    expect(side).toBeGreaterThan(square * 0 + 0.1);
  });
  it('the head: toward the travel at rest, further while sliding (70-90 deg), ahead side-on, to the opening at a peek', () => {
    expect(wallHeadYaw(1, 0, 0, 0, 0)).toBeCloseTo(0.55, 9);
    expect(wallHeadYaw(1, 1, 0, 0, 0)).toBeCloseTo(1.3, 9);
    expect(wallHeadYaw(-1, 1, 0, 0, 0)).toBeCloseTo(-1.3, 9);
    expect(wallHeadYaw(1, 0, 0, 0, 0, 1)).toBeCloseTo(1.45, 9);
    // side-on the body already faces the travel: the head looks straight ahead
    expect(wallHeadYaw(1, 1, 1, WALL_SIDE.yaw, 0)).toBeCloseTo(0, 9);
    // raised: no wall look
    expect(wallHeadYaw(1, 1, 0, 0, 1)).toBe(0);
  });
  it('the wall side from WALL_SUB matches the owner (wallFacing)', () => {
    expect(wallSideFromSub(WALL_SUB.edgeL)).toBe(wallFacing(1, 1));
    expect(wallSideFromSub(WALL_SUB.edgeR)).toBe(wallFacing(-1, 1));
    expect(wallSideFromSub(WALL_SUB.faceRight)).toBe(wallFacing(0, -1));
    expect(wallSideFromSub(0)).toBe(wallFacing(0, 1));
  });
  it('(row 9) the peek: a small lean (10-15 deg) with the body stepping toward the edge', () => {
    expect((WALL.peekLean * 180) / Math.PI).toBeGreaterThan(9);
    expect((WALL.peekLean * 180) / Math.PI).toBeLessThan(16);
    expect(WALL.peekStep).toBeGreaterThan(0);
    expect(WALL.peekStep).toBeLessThan(WALL.peekOut);
  });
});

describe('wall root push crouched (G6 fix)', () => {
  it('crouched and turned off side-on the root keeps the forward trunk off the face; side-on and square-standing unchanged', () => {
    const side = wallRootPush(0.35, 0.15, 1, 0.19, 1);
    expect(side).toBeCloseTo(wallRootPush(0.35, 0.15, 1, 0.19, 0), 9);
    const mid = wallRootPush(0.6, 0.15, Math.sin(0.6), 0.19, 1);
    expect(wallRootPush(0.6, 0.15, Math.sin(0.6), 0.19, 0) - mid).toBeCloseTo(WALL_SIDE.crouchBack * Math.cos(0.6), 9);
    expect(wallRootPush(0.35, 0.15, 0, 0.19, 0)).toBeCloseTo(0.35 - 0.15 - 0.015, 9);
  });
});
