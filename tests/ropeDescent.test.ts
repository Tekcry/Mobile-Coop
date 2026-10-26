// (coop-kit A1, R34) The two-person rope's descent: a partner beside the holder rappels down the rope (the `descent` kit
// id in `flags.kitMoves`). The host's rule, the pure helpers, and the climber's side headless (TeamController with a
// stand-in GameState, as tests/teamClimb.test.ts drives it).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { flags } from '../src/core/flags';
import type { TeamController } from '../src/game/teamController';
import { TEAM } from '../src/config/movement';
import { checkTeamRequest, ROPE_DESCENT_ARM, ROPE_SUB, ropeFromTop, ropeOverPath, ropeStepOff, ropeTopY, type TeamRequest, type TeamSide } from '../src/game/teamMoves';

type V3 = { x: number; y: number; z: number };

const kit0 = flags.kitMoves;
const withDescent = new Set(['descent']);
const none = new Set<string>();
afterAll(() => void (flags.kitMoves = kit0));

const side = (o: Partial<TeamSide> = {}): TeamSide => ({ id: 'a', x: 0, y: 0, z: 0, mode: 'ground', alive: true, ...o });
/** `b` holds the rope on a 4.4 m wall top (brace + rope bit); `a` stands beside them on the top; the rope point 0.55 m out. */
const top = (o: Partial<TeamRequest> = {}, a: Partial<TeamSide> = {}): TeamRequest => ({
  kind: 'rope',
  a: side({ id: 'a', y: 4.4, z: 0.8, ...a }),
  b: side({ id: 'b', y: 4.4, mode: 'brace', sub: ROPE_SUB }),
  target: -1,
  targetUp: 0,
  sinceLast: 5,
  land: { x: -0.55, y: 4.4, z: 0 },
  ...o,
});

describe('(A1) the host rule: the rope taken from the top', () => {
  it('beside the holder on its floor: allowed only with the host\'s `descent` id', () => {
    flags.kitMoves = none;
    expect(checkTeamRequest(top())).toBe('far');
    flags.kitMoves = withDescent;
    expect(checkTeamRequest(top())).toBeNull();
    // a floor 0.35 m off still counts as beside; 0.6 m is neither beside nor below
    expect(checkTeamRequest(top({}, { y: 4.05 }))).toBeNull();
    expect(checkTeamRequest(top({}, { y: 3.8 }))).toBe('far');
    // out of reach across, the rope point off, not offering
    expect(checkTeamRequest(top({}, { z: TEAM.ropeReach + 0.2 }))).toBe('far');
    expect(checkTeamRequest(top({ land: undefined }))).toBe('noTarget');
    expect(checkTeamRequest(top({ land: { x: -3, y: 4.4, z: 0 } }))).toBe('noTarget');
    expect(checkTeamRequest(top({ b: side({ id: 'b', y: 4.4, mode: 'brace', sub: 0 }) }))).toBe('notOffering');
    flags.kitMoves = kit0;
  });

  it('the climb from the foot is the same with the id on or off', () => {
    for (const k of [none, withDescent]) {
      flags.kitMoves = k;
      expect(checkTeamRequest(top({}, { y: 0, x: -1.2, z: 0 }))).toBeNull();
      expect(checkTeamRequest(top({}, { y: 4.4 - TEAM.ropeMin + 0.6, x: -1.2, z: 0 }))).toBe('far');
      expect(checkTeamRequest(top({}, { y: -3, x: -1.2, z: 0 }))).toBe('far');
    }
    flags.kitMoves = kit0;
  });
});

describe('(A1) the descent helpers', () => {
  it('ropeFromTop: the holder\'s floor +-0.4 m', () => {
    expect(ropeFromTop(4.4, 4.4)).toBe(true);
    expect(ropeFromTop(4.4, 4.05)).toBe(true);
    expect(ropeFromTop(4.4, 4.75)).toBe(true);
    expect(ropeFromTop(4.4, 3.9)).toBe(false);
    expect(ropeFromTop(4.4, 0)).toBe(false);
  });

  it('ropeOverPath: the top-out backwards, beside the holder (1, 1) to the rope\'s top (0, 0), out first then down', () => {
    const o = { rise: 0, across: 0 };
    expect(ropeOverPath(0, o)).toEqual({ rise: 1, across: 1 });
    expect(ropeOverPath(1, o)).toEqual({ rise: 0, across: 0 });
    let r0 = 2, a0 = 2;
    for (let i = 0; i <= 100; i++) {
      const p = ropeOverPath(i / 100, o);
      expect(p.rise).toBeLessThanOrEqual(r0 + 1e-9);
      expect(p.across).toBeLessThanOrEqual(a0 + 1e-9);
      r0 = p.rise;
      a0 = p.across;
    }
    // out over the edge before the drop: a third of the way through, mostly out and still mostly up
    const q = ropeOverPath(0.35, o);
    expect(q.across).toBeLessThan(0.75);
    expect(q.rise).toBeGreaterThan(0.95);
  });

  it('ropeStepOff: at the floor with the stick held down', () => {
    expect(ropeStepOff(0, 0, -1)).toBe(true);
    expect(ropeStepOff(0.005, 0, -0.6)).toBe(true);
    expect(ropeStepOff(0, 0, -0.3)).toBe(false);
    expect(ropeStepOff(0.2, 0, -1)).toBe(false);
  });
});

// ---- the climber's side, headless ----

/** The wall: its face along x at z 0 (out towards -z), its top at TOP, the block behind it (z > 0); the floor y 0. */
const TOP = 4.0;
const HOLDER = { x: 0, y: TOP, z: 0.3, yaw: Math.PI };
const BESIDE = { x: 0.8, y: TOP, z: 0.3 };

async function makeRay(): Promise<(a: V3, b: V3) => { hit: boolean; point: V3; normal: V3; distance: number }> {
  const { Vector3 } = await import('../src/core/babylon');
  return (a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    let best = 2;
    let nx = 0, ny = 1, nz = 0;
    {
      let t0 = 0, t1 = 1, ex = 0, ey = 0, ez = 0;
      const clip = (p: number, d: number, sgn: number, fx: number, fy: number, fz: number): void => {
        if (Math.abs(d) < 1e-12) {
          if (sgn * p < 0) t0 = 2;
          return;
        }
        const t = -p / d;
        if (sgn * d > 0) {
          if (t > t0) { t0 = t; ex = fx; ey = fy; ez = fz; }
        } else if (t < t1) t1 = t;
      };
      clip(a.z, dz, 1, 0, 0, -1);
      clip(TOP - a.y, -dy, 1, 0, 1, 0);
      if (t0 <= t1 && t0 < best && t0 > 0) { best = t0; nx = ex; ny = ey; nz = ez; }
    }
    if (dy < 0 && a.y >= 0) {
      const t = -a.y / dy;
      if (t <= 1 && t < best) { best = t; nx = 0; ny = 1; nz = 0; }
    }
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (best > 1) return { hit: false, point: new Vector3(b.x, b.y, b.z), normal: new Vector3(0, 1, 0), distance: len };
    return { hit: true, point: new Vector3(a.x + dx * best, a.y + dy * best, a.z + dz * best), normal: new Vector3(nx, ny, nz), distance: best * len };
  };
}

type Tm = TeamController;

interface Rig {
  tm: Tm;
  c: { pos: { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void }; yaw: number; override: null | { kinematic?: V3; yaw?: number } };
  pose: { traverse: string; traverseT: number };
  holder: { id: string; pos: V3; yaw: number; mode: string; sub: number };
  requests: unknown[][];
  ends: string[];
  /** One fixed step (the kinematic root applied as the player controller would). */
  step: (coop?: boolean, b?: boolean, stick?: number) => void;
}

async function setup(at: V3): Promise<Rig> {
  const { Vector3 } = await import('../src/core/babylon');
  const { TeamController } = await import('../src/game/teamController');
  const ray = await makeRay();
  const blank = { x: 0, y: 0, z: 0, w: 0 };
  const c = { pos: new Vector3(at.x, at.y, at.z), yaw: Math.PI, override: null as null | { kinematic?: V3; yaw?: number }, grounded: true, swallowCrouch: false, crouched: false, crouchIntent: false, autoCrouch: false, standUp: () => {}, setCrouchToggle: () => {} };
  const pose = { traverse: 'none', traverseT: 0, tumble: 0 };
  const holder = { id: 'h', pos: new Vector3(HOLDER.x, HOLDER.y, HOLDER.z), yaw: HOLDER.yaw, mode: 'brace', sub: ROPE_SUB };
  const requests: unknown[][] = [];
  const ends: string[] = [];
  const g = {
    player: { alive: true, controller: c, pose, rig: { height: 1.75, reachL: { ...blank }, reachR: { ...blank }, plantL: { ...blank }, plantR: { ...blank } } },
    ballistics: { ray: (a: V3, b: V3) => ray(a, b) },
    net: { teamMates: () => [holder], teamHangEnd: (k: string) => void ends.push(k), teamRequest: (...a: unknown[]) => void requests.push(a) },
    app: { toasts: { show: () => {} } },
    traversal: { attached: false, committed: false, attach: { kind: 'ledge', phase: 'on' } },
    takedown: { active: null },
    strike: { active: false },
  };
  const tm = new TeamController(g as never);
  const step = (coop = false, b = false, stick = 0): void => {
    tm.fixedUpdate(1 / 60, coop, b, stick);
    const ov = c.override;
    if (ov?.kinematic) c.pos.set(ov.kinematic.x, ov.kinematic.y, ov.kinematic.z);
    if (ov?.yaw !== undefined) c.yaw = ov.yaw;
  };
  return { tm, c: c as never, pose, holder, requests, ends, step };
}

/** The host's start for a rope request the rig sent (the rope point it claimed, at the holder's floor). */
function startOf(req: unknown[]): { kind: 'rope'; a: string; b: string; target: number; s: number; l: [number, number, number] } {
  return { kind: 'rope', a: 'me', b: 'h', target: -1, s: 0, l: [req[5] as number, req[4] as number, req[6] as number] };
}

describe('(A1) the climber\'s side: offer, over the edge, down, step off', () => {
  beforeAll(() => void (flags.kitMoves = withDescent));
  afterAll(() => void (flags.kitMoves = kit0));

  it('beside the holder: the rappel prompt, and Co-op asks for the rope at the holder\'s rope point', async () => {
    const r = await setup(BESIDE);
    r.step();
    expect(r.tm.prompt).toBe('Co-op: rappel down the rope (two-person rope)');
    r.step(true);
    expect(r.requests).toHaveLength(1);
    const q = r.requests[0]!;
    expect(q[0]).toBe('rope');
    expect(q[1]).toBe('h');
    expect(q[4]).toBe(TOP);
    // in front of the holder, over the drop
    expect(q[6] as number).toBeLessThan(0);
  });

  it('without the `descent` id: no rappel offer beside the holder', async () => {
    flags.kitMoves = none;
    const r = await setup(BESIDE);
    r.step();
    expect(r.tm.prompt ?? '').not.toContain('rappel');
    r.step(true);
    expect(r.requests.filter((q) => q[0] === 'rope')).toHaveLength(0);
    flags.kitMoves = withDescent;
  });

  it('goes over the edge (no jump), climbs down at ropeDown, steps off at the floor with the stick held down', async () => {
    const r = await setup(BESIDE);
    r.step(true);
    r.tm.begin(startOf(r.requests[0]!), 'me');
    expect(r.tm.state).toBe('ropeOver');
    expect(r.tm.mode).toBe('boost');
    expect(r.tm.wireSub).toBe(ROPE_SUB);
    expect(r.tm.wireS).toBe(1);
    expect(r.tm.count.descents).toBe(1);
    // over the edge: from the spot beside the holder, the placeholder climb-up run backwards
    let prev = { x: r.c.pos.x, y: r.c.pos.y, z: r.c.pos.z };
    let maxStep = 0;
    let n = 0;
    r.step();
    expect(Math.abs(r.c.pos.y - BESIDE.y)).toBeLessThan(0.01);
    expect(r.pose.traverse).toBe('climbUp');
    expect(r.pose.traverseT).toBeGreaterThan(0.95);
    while (r.tm.state === 'ropeOver' && n++ < 600) {
      maxStep = Math.max(maxStep, Math.hypot(r.c.pos.x - prev.x, r.c.pos.y - prev.y, r.c.pos.z - prev.z));
      prev = { x: r.c.pos.x, y: r.c.pos.y, z: r.c.pos.z };
      r.step();
    }
    expect(n / 60).toBeCloseTo(TEAM.ropeOver, 1);
    expect(r.tm.state).toBe('ropeClimb');
    expect(maxStep).toBeLessThan(0.08);
    expect(r.c.pos.y).toBeCloseTo(ropeTopY(TOP), 2);
    // hanging off the drop's side of the rope (z < 0), facing the wall
    expect(r.c.pos.z).toBeLessThan(0);
    expect(Math.cos(r.c.yaw)).toBeGreaterThan(0.9);
    // the stick pushed up just after going over does not climb straight back out
    for (let i = 0; i < 30; i++) r.step(false, false, 1);
    expect(r.tm.state).toBe('ropeClimb');
    // down the rope on the stick
    const y0 = r.c.pos.y;
    r.step(false, false, -1);
    expect(y0 - r.c.pos.y).toBeCloseTo(TEAM.ropeDown / 60, 4);
    n = 0;
    while (r.c.pos.y > 1e-3 && n++ < 600) r.step(false, false, -1);
    // at the floor the held stick steps off: the holder freed (drop), the climber free
    for (let i = 0; i < 3 && r.tm.state !== 'none'; i++) r.step(false, false, -1);
    expect(r.tm.state).toBe('none');
    expect(r.ends).toEqual(['drop']);
    expect(r.tm.count.stepOffs).toBe(1);
    expect(r.c.override).toBeNull();
    expect(r.c.pos.y).toBeCloseTo(0, 2);
    expect(r.tm.wireS).toBe(0);
  });

  it('at the floor with the stick let go: stays on the rope (no step off until it is held down)', async () => {
    const r = await setup(BESIDE);
    r.step(true);
    r.tm.begin(startOf(r.requests[0]!), 'me');
    for (let i = 0; i < 600 && r.c.pos.y > 1e-3; i++) r.step(false, false, -1);
    r.step(false, false, -0.3);
    for (let i = 0; i < 30; i++) r.step();
    expect(r.tm.state).toBe('ropeClimb');
    expect(r.ends).toEqual([]);
  });

  it('down a little and back up: tops out to where it stood beside the holder', async () => {
    const r = await setup(BESIDE);
    r.step(true);
    r.tm.begin(startOf(r.requests[0]!), 'me');
    for (let i = 0; i < 200 && r.tm.state === 'ropeOver'; i++) r.step();
    const down = Math.ceil(((ROPE_DESCENT_ARM + 0.1) / TEAM.ropeDown) * 60);
    for (let i = 0; i < down; i++) r.step(false, false, -1);
    for (let i = 0; i < 600 && r.tm.state !== 'none'; i++) r.step(false, false, 1);
    expect(r.tm.count.tops).toBe(1);
    expect(r.ends).toEqual(['pull']);
    expect(r.c.pos.x).toBeCloseTo(BESIDE.x, 2);
    expect(r.c.pos.y).toBeCloseTo(BESIDE.y, 2);
    expect(r.c.pos.z).toBeCloseTo(BESIDE.z, 2);
  });

  it('the holder lets go while it goes over: onto the rope, then a slide to the floor', async () => {
    const r = await setup(BESIDE);
    r.step(true);
    r.tm.begin(startOf(r.requests[0]!), 'me');
    r.step();
    r.tm.ended('drop');
    for (let i = 0; i < 200 && r.tm.state === 'ropeOver'; i++) r.step();
    expect(r.tm.state).toBe('ropeSlide');
    for (let i = 0; i < 600 && r.tm.state !== 'none'; i++) r.step();
    expect(r.tm.count.slides).toBe(1);
    // (the last frame's root is the floor; the stand-in applies the root only while overridden: one slide step over it)
    expect(r.c.pos.y).toBeLessThan(TEAM.ropeSlide / 60 + 1e-6);
  });

  it('the climb from the foot is unchanged: wire s 0, no step off at the floor', async () => {
    const r = await setup({ x: 0, y: 0, z: -1.2 });
    r.tm.begin({ kind: 'rope', a: 'me', b: 'h', target: -1, s: 0, l: [0, TOP, -0.25] }, 'me');
    expect(r.tm.state).toBe('ropeClimb');
    expect(r.tm.wireS).toBe(0);
    for (let i = 0; i < 60; i++) r.step(false, false, -1);
    expect(r.tm.state).toBe('ropeClimb');
    expect(r.ends).toEqual([]);
    expect(r.tm.count.descents).toBe(0);
  });
});
