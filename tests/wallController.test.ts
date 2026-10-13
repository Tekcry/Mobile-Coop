import { describe, expect, it } from 'vitest';
import { buildCoverSegments, EDGE_MARGIN, type CoverBox } from '../src/cover/coverData';
import { WALL, WALL_SUB, WallCore, buildWallLinks, emptyWallInput, stackClamp, wallOverride, type WallInput } from '../src/player/wallController';
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
    const w = core();
    const i = inp(0, 0.2 + SO + 0.05, { moveX: 0, moveZ: -1, gear: 3 });
    run(w, i, 0.3);
    expect(w.phase).toBe('off');
    run(w, i, 0.07);
    expect(w.phase).toBe('entering');
    const fast = core();
    run(fast, inp(0, 0.2 + SO + 0.05, { moveX: 0, moveZ: -1, gear: 5 }), 0.5);
    expect(fast.phase).toBe('off');
  });

  it('a stick held through a traversal or a fall does not enter until it is released (A48)', () => {
    const w = core();
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
    const r = core();
    const j = inp(0, 0.2 + SO + 0.05, { moveX: 0, moveZ: -1, gear: 3, grounded: false });
    run(r, j, 0.2);
    j.moveZ = 0;
    run(r, j, 1 / 60);
    j.grounded = true;
    j.moveZ = -1;
    run(r, j, 0.37);
    expect(r.phase).toBe('entering');
  });

  it('slides at the gear cap, capped at gear 4 (2.8 / 1.8 m/s)', () => {
    for (const [gear, crouched, want] of [
      [6, false, 2.8],
      [4, false, 2.8],
      [2, false, 1.3],
      [6, true, 1.8],
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
    run(w, i, 1.5);
    expect(w.s).toBeCloseTo(EDGE_MARGIN, 3);
    expect(w.edge).toBe(-1);
    expect(w.sub() & WALL_SUB.edgeR).toBeTruthy();
    // sliding towards +x is the body's right (it faces out of the wall, +z)
    expect(w.sub() & WALL_SUB.faceRight).toBeTruthy();
    i.moveX = -1; // towards b: the inside corner, the held stick carries on along the side wall
    run(w, i, 3.5);
    expect(w.seg).toBe(side);
    expect(w.count.wrap).toBe(1);
    expect(w.s).toBeGreaterThan(SO + 0.5);
    expect(w.sub() & WALL_SUB.faceRight).toBeFalsy();
  });

  it('pulling the stick away for 0.15 s leaves; the context press leaves (toggle)', () => {
    const w = core();
    const i = inp(0, 0.2 + SO + 0.1, { context: true });
    run(w, i, 0.3);
    i.moveZ = 1;
    run(w, i, 0.1);
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
    const w = core();
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
    const w = core();
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
