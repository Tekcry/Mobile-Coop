// (coop-kit K4) Swing Pass: one braces on a pipe and swings the partner across a gap. Two TeamControllers on fake
// games (a host page 'h0' and a client page 'c1', each page's mate rebuilt every step from the other page's
// controller), Marlow's A5 spot exactly as #612 places it, a stub host that checks each request (`checkTeamRequest`
// with the host page's device) and starts both pages, and relays each end through K0's `kitEnd`: the spot and its
// device, the anchor offer and stance, the host's rule, the pure arc, the swing both ways round with the one done call on
// the host page, the page's polite refusals, the commit point, the moved end, K0's real host, `?kitmoves=0`, the flag.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from '../../src/core/babylon';
import { flags, KIT_BUILT, readKitMoves } from '../../src/core/flags';
import { checkTeamRequest, SWING_SUB, type TeamRequest, type TeamSide } from '../../src/game/teamMoves';
import { addKitSpot, KIT_PAIR, kitDone, kitSpotIndex, type KitSpot } from '../../src/game/kit/kitApi';
import { registerKitMove } from '../../src/game/kit/registry';
import { addShutterSpec } from '../../src/game/kit/shutter';
import { isSwingDevice, newSwingDevice, SWING, SWING_MOVE, swingLand, swingLocal, swingPath, swingSpotOk, type SwingDevice } from '../../src/game/kit/swingPass';
import { TeamController, type TeamMate, type TeamStart } from '../../src/game/teamController';
import { kitEnd, kitPairOver, newKitPair, type KitPair } from '../../src/net/kitNet';
import { CoopHost } from '../../src/net/coopHost';
import { PF } from '../../src/net/protocol';
import { emptyMoveState } from '../../src/player/moveState';

const DT = 1 / 60;

// Marlow #612 (head 5f6b70b31) a5Substation: the spot on the swing bar, A5_SWING_BAR's posts, A5_CABLE_TRENCH
const SPOT: KitSpot = { id: 'a5-swing', kind: 'swingPass', x: 65.85, y: 2.6, z: 43.0, yaw: -Math.PI / 2, w: 3.5, y2: 0 };
const POSTS = [
  { x0: 65.85, x1: 66.0, z0: 42.325, z1: 42.475 },
  { x0: 65.85, x1: 66.0, z0: 43.525, z1: 43.675 },
];
const SHUT = { id: 'sh1', x: 50, y: 0, z: 50, yaw: 0, width: 3, height: 2.4 };
/** The anchor's press point (0.45 m behind the edge on the line) and the rider 1.0 m beside the anchor's stance. */
const AT = { x: 66.3, z: 43.0 };
const RIDER = { x: 66.45, z: 42.55 };
const FAR = { x: 75, z: 50 };
const WEST = -Math.PI / 2;

interface Page {
  id: string;
  g: { puppet: boolean; mode: { onKitDone: (...a: unknown[]) => void } };
  tm: TeamController;
  c: { pos: Vector3; yaw: number; swallowCrouch: boolean; override: { kinematic?: Vector3; yaw?: number; crouch?: boolean } | null };
  pose: { traverse: string; traverseT: number };
  mates: TeamMate[];
  asked: unknown[][];
  ends: string[];
  health: { hp: number };
  done: unknown[][];
  toasts: string[];
  crouches: { n: number };
}

function page(id: string, puppet: boolean, at: { x: number; z: number }, anchors: object, mateId: string): Page {
  const crouches = { n: 0 };
  const c = { pos: new Vector3(at.x, 0, at.z), renderPos: new Vector3(), yaw: WEST, renderYaw: 0, override: null, grounded: true, swallowCrouch: false, crouched: false, crouchIntent: false, autoCrouch: false, setCrouchToggle: () => void crouches.n++ };
  const mates: TeamMate[] = [{ id: mateId, pos: new Vector3(99, 0, 99), yaw: 0, mode: 'ground', sub: 0, s: 0 }];
  const asked: unknown[][] = [];
  const ends: string[] = [];
  const done: unknown[][] = [];
  const toasts: string[] = [];
  const health = { hp: 100 };
  const pose = { traverse: 'none', traverseT: 0, tumble: 0 };
  const g = {
    puppet,
    mode: { onKitDone: (...a: unknown[]) => done.push(a) },
    player: { alive: true, controller: c, pose },
    net: { teamMates: () => mates, teamRequest: (...a: unknown[]) => asked.push(a), teamHangEnd: (k: string) => ends.push(k) },
    app: { toasts: { show: (t: string) => toasts.push(t) } },
    traversal: { attached: false, committed: null, attach: { kind: 'none', phase: 'off' } },
    takedown: { active: null },
    strike: { active: false },
    target: { health },
    ballistics: { ray: () => ({ hit: false, distance: 0, point: new Vector3() }) },
    world: { level: { anchors } },
  };
  return { id, g, tm: new TeamController(g as never), c, pose, mates, asked, ends, health, done, toasts, crouches };
}

interface World {
  H: Page;
  C: Page;
  pair: KitPair | null;
  seen: { h: number; c: number; hr: number; cr: number };
  denied: string[];
  host: boolean;
  now: number;
}

function world(hAt: { x: number; z: number }, cAt: { x: number; z: number }, spots: readonly KitSpot[] = [SPOT], shutter = false): World {
  const anchors = {};
  if (shutter) addShutterSpec(anchors, SHUT);
  for (const s of spots) addKitSpot(anchors, s);
  const W: World = { H: page('h0', false, hAt, anchors, 'c1'), C: page('c1', true, cAt, anchors, 'h0'), pair: null, seen: { h: 0, c: 0, hr: 0, cr: 0 }, denied: [], host: true, now: 1 };
  sync(W);
  return W;
}

function sync(W: World): void {
  for (const [p, o] of [
    [W.H, W.C],
    [W.C, W.H],
  ] as const) {
    if (p.mates.length === 0) continue;
    const m = p.mates[0]!;
    m.pos.copyFrom(o.c.pos);
    m.yaw = o.c.yaw;
    m.mode = o.tm.mode ?? 'ground';
    m.sub = o.tm.wireSub;
    m.s = o.tm.wireS;
  }
}

/** The player controller in the fake: a kinematic override puts the feet, its yaw turns the body. */
function move(p: Page): void {
  const ov = p.c.override;
  if (ov?.kinematic) p.c.pos.copyFrom(ov.kinematic);
  if (ov && ov.yaw !== undefined) p.c.yaw = ov.yaw;
}

const side = (p: Page): TeamSide => ({ id: p.id, x: p.c.pos.x, y: p.c.pos.y, z: p.c.pos.z, mode: p.tm.mode ?? 'ground', alive: true, sub: p.tm.wireSub, s: p.tm.wireS });

/** The stub host: a request checked against the host page's device at its index, then started on both pages. */
function hostRequests(W: World): void {
  for (const [p, o, k] of [
    [W.H, W.C, 'hr'],
    [W.C, W.H, 'cr'],
  ] as const) {
    while (W.seen[k] < p.asked.length) {
      const [kind, partner, target, , gy, lx, lz] = p.asked[W.seen[k]++] as [string, string, number, number, number, number, number];
      expect([kind, partner]).toEqual(['swingPass', o.id]);
      const list = W.H.tm.devices.list;
      const at = target >= 0 && target < list.length && list[target]!.kind === 'swingPass' ? target : -1;
      const spot = at >= 0 ? list[at] : undefined;
      const why = checkTeamRequest({ kind: 'swingPass', a: side(p), b: side(o), target: at, targetUp: 0, sinceLast: 9, land: { x: lx, y: gy, z: lz }, spot });
      if (why) {
        W.denied.push(why);
        continue;
      }
      const s: TeamStart = { kind: 'swingPass', a: p.id, b: o.id, target: at, s: 0, l: [lx, gy, lz] };
      W.H.tm.begin(s, 'h0');
      W.C.tm.begin(s, 'c1');
      W.pair = newKitPair('swingPass', p.id, o.id, W.now, spot?.id ?? '');
    }
  }
}

/** The stub host's end relay (as `coopHost.kitHangEnd`): through `kitEnd`, to both; a 'pull' tells the mode. */
function hostEnds(W: World): void {
  while (W.seen.h < W.H.ends.length || W.seen.c < W.C.ends.length) {
    const fromH = W.seen.h < W.H.ends.length;
    const k = (fromH ? W.H.ends[W.seen.h++] : W.C.ends[W.seen.c++]) as 'pull' | 'drop';
    const p = W.pair;
    if (!p) continue;
    const v = kitEnd(p, fromH ? 'h0' : 'c1', k, W.now, 0);
    if (!v) continue;
    if (kitPairOver(p, v)) W.pair = null;
    W.H.tm.ended(v);
    W.C.tm.ended(v);
    if (v === 'pull') for (const pg of [W.H, W.C]) kitDone(pg.g, p.kind, p.spot, p.a === 'h0' ? undefined : p.a, p.b === 'h0' ? undefined : p.b);
  }
}

interface In {
  hc?: boolean;
  hb?: boolean;
  cc?: boolean;
  cb?: boolean;
}

function step(W: World, i: In = {}): void {
  W.H.tm.fixedUpdate(DT, !!i.hc, !!i.hb);
  W.C.tm.fixedUpdate(DT, !!i.cc, !!i.cb);
  move(W.H);
  move(W.C);
  sync(W);
  if (W.host) hostRequests(W);
  hostEnds(W);
  W.now += DT;
}

function steps(W: World, seconds: number): void {
  for (let k = 0; k < Math.round(seconds / DT); k++) step(W);
}

/** Steps until `done`; returns the time taken (s). */
function until(W: World, done: () => boolean, max = 10): number {
  let n = 0;
  while (!done() && n < Math.round(max / DT)) {
    step(W);
    n++;
  }
  expect(done()).toBe(true);
  return n * DT;
}

const dev = (p: Page): SwingDevice => p.tm.devices.get('a5-swing') as SwingDevice;
/** No Swing Pass prompt (the fake's ray-less world may show the built-in hang-down offer). */
const noSwing = (p: Page): void => expect(p.tm.prompt ?? '').not.toMatch(/swing|pipe|wrist/);
const boxDist = (x: number, z: number, b: (typeof POSTS)[number]): number => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.z0 - z, 0, z - b.z1));
const req = (a: TeamSide, b: TeamSide, extra: Partial<TeamRequest> = {}): TeamRequest => ({ kind: 'swingPass', a, b, target: 0, targetUp: 0, sinceLast: 9, spot: newSwingDevice(SPOT), land: { x: 61.45, y: 0, z: 43.0 }, ...extra });
const anchorSide = (extra: Partial<TeamSide> = {}): TeamSide => ({ id: 'b', x: 66.45, y: 0, z: 43.55, mode: 'brace', alive: true, sub: SWING_SUB, s: 1, ...extra });
const riderSide = (extra: Partial<TeamSide> = {}): TeamSide => ({ id: 'a', x: RIDER.x, y: 0, z: RIDER.z, mode: 'ground', alive: true, ...extra });

/** The anchor (`an`) offers at A5's edge and settles on its stance. */
function brace(W: World, an: Page): void {
  step(W, an === W.H ? { hc: true } : { cc: true });
  expect(an.tm.state).toBe('swingOffer');
  steps(W, SWING.grab + 0.05);
}

/** The rider (`r`) asks; the stub host starts both pages. */
function ride(W: World, r: Page): void {
  expect(r.tm.prompt).toBe('Co-op: get swung across (swing pass)');
  step(W, r === W.H ? { hc: true } : { cc: true });
  expect(r.tm.state).toBe('swingRide');
}

const kit0 = flags.kitMoves;
const coopKit0 = flags.coopKit;
beforeAll(() => {
  flags.kitMoves = new Set(['swingPass']);
  flags.coopKit = false;
});
afterAll(() => {
  flags.kitMoves = kit0;
  flags.coopKit = coopKit0;
});
beforeEach(() => {
  registerKitMove(SWING_MOVE);
  KIT_PAIR.swingPass = { pairS: SWING.ride + SWING.release + 3, doneBy: 'a' };
});
afterEach(() => {
  flags.kitMoves = new Set(['swingPass']);
  vi.restoreAllMocks();
});

describe('(coop-kit K4) Swing Pass: the spot and its device', () => {
  it('one device per spot with the id off and no mates, the same index on both pages; the band check names each fault', () => {
    flags.kitMoves = new Set();
    const W = world(AT, FAR, [SPOT], true);
    W.H.mates.length = 0;
    step(W);
    for (const p of [W.H, W.C]) {
      expect(p.tm.devices.list.map((d) => d.id)).toEqual(['sh1', 'a5-swing']);
      expect(kitSpotIndex(p.tm.devices.list, 'a5-swing')).toBe(1);
    }
    const d = dev(W.H);
    expect(isSwingDevice(d)).toBe(true);
    expect([d.barY, d.gap, d.farY, d.reach, d.ok]).toEqual([2.6, 3.5, 0, SWING.anchorReach, true]);
    expect([d.lx, d.lz]).toEqual([expect.closeTo(61.45, 9), expect.closeTo(43.0, 9)]);
    expect(swingLocal(d, 66.3, 43.2, { along: 0, side: 0 })).toEqual({ along: expect.closeTo(-0.45, 9), side: expect.closeTo(0.2, 9) });
    expect(swingSpotOk(SPOT)).toBe('');
    expect(swingSpotOk({ ...SPOT, w: 3.6 })).toBe('gap');
    expect(swingSpotOk({ ...SPOT, w: 1.9 })).toBe('gap');
    expect(swingSpotOk({ ...SPOT, y: 3.4 })).toBe('bar');
    expect(swingSpotOk({ ...SPOT, w: undefined })).toBe('missing');
  });

  it('a spot with no w is listed and inert: no offer; one warning per page', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const W = world(AT, FAR, [{ ...SPOT, w: undefined }]);
    step(W, { hc: true });
    expect(dev(W.H).ok).toBe(false);
    expect(W.H.tm.state).toBe('none');
    noSwing(W.H);
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('a5-swing'))).toHaveLength(2);
  });
});

describe('(coop-kit K4) Swing Pass: the anchor offer', () => {
  it('single player: no prompt and no state at the bar', () => {
    const W = world(AT, FAR);
    W.H.mates.length = 0;
    step(W, { hc: true });
    expect([W.H.tm.state, W.H.tm.prompt]).toEqual(['none', null]);
  });

  it('only at a spot, at the edge, facing the gap', () => {
    const W = world(AT, FAR);
    step(W);
    expect(W.H.tm.prompt).toBe('Co-op: brace on the pipe (swing pass)');
    expect(W.H.tm.promptAt).toMatchObject({ x: 65.85, y: expect.closeTo(2.3, 9), z: 43.0 });
    W.H.c.yaw = Math.PI / 2;
    step(W);
    noSwing(W.H);
    W.H.c.yaw = WEST;
    W.H.c.pos.set(66.85, 0, 43.0);
    step(W);
    noSwing(W.H);
    const N = world(AT, FAR, []);
    step(N, { hc: true });
    expect(N.H.tm.state).toBe('none');
    noSwing(N.H);
  });

  it('Co-op: onto the stance by side, clear of the posts and the step-off point; wire brace + 512, s = index + 1', () => {
    for (const [z, sz] of [
      [43.0, 43.55],
      [42.9, 42.45],
    ] as const) {
      const W = world({ x: 66.3, z }, FAR);
      brace(W, W.H);
      const p = W.H.c.pos;
      expect([p.x, p.y, p.z]).toEqual([expect.closeTo(66.45, 6), 0, expect.closeTo(sz, 6)]);
      for (const b of POSTS) expect(boxDist(p.x, p.z, b)).toBeGreaterThanOrEqual(0.3);
      expect(Math.hypot(p.x - 66.2, p.z - 43.0)).toBeGreaterThanOrEqual(0.6);
      expect([W.H.tm.mode, W.H.tm.wireSub, W.H.tm.wireS, W.H.tm.busy]).toEqual(['brace', SWING_SUB, 1, true]);
      expect(W.H.tm.prompt).toBe('Braced on the pipe: B lets go');
    }
    const S = world(AT, FAR, [SPOT], true);
    brace(S, S.H);
    expect(S.H.tm.wireS).toBe(2);
  });

  it('B lets go; a hit lets go', () => {
    const W = world(AT, FAR);
    brace(W, W.H);
    step(W, { hb: true });
    expect([W.H.tm.state, W.H.c.swallowCrouch, dev(W.H).user]).toEqual(['none', true, '']);
    const X = world(AT, FAR);
    brace(X, X.H);
    X.H.health.hp = 80;
    step(X);
    expect([X.H.tm.state, X.H.tm.endWhy]).toEqual(['none', 'swing: hurt']);
  });
});

describe("(coop-kit K4) Swing Pass: the host's rule", () => {
  it("A5's numbers pass; each fault is refused", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(checkTeamRequest(req(riderSide(), anchorSide()))).toBeNull();
    expect(checkTeamRequest(req(riderSide(), anchorSide({ sub: 0 })))).toBe('notOffering');
    expect(checkTeamRequest(req(riderSide(), anchorSide({ s: 2 })))).toBe('notOffering');
    expect(checkTeamRequest(req(riderSide(), anchorSide({ mode: 'ground' })))).toBe('notOffering');
    expect(checkTeamRequest(req(riderSide({ mode: 'air' }), anchorSide()))).toBe('busy');
    expect(checkTeamRequest(req(riderSide({ z: 41.55 }), anchorSide()))).toBe('far');
    expect(checkTeamRequest(req(riderSide({ y: 0.5 }), anchorSide()))).toBe('far');
    expect(checkTeamRequest(req(riderSide(), anchorSide({ x: 67.35, z: 43.0 })))).toBe('far');
    expect(checkTeamRequest(req(riderSide(), anchorSide(), { spot: undefined }))).toBe('noTarget');
    expect(checkTeamRequest(req(riderSide(), anchorSide(), { spot: { id: 'sh1', kind: 'shutter', x: 0, y: 0, z: 0, yaw: 0 } }))).toBe('noTarget');
    expect(checkTeamRequest(req(riderSide(), anchorSide(), { land: { x: 62.25, y: 0, z: 43.0 } }))).toBe('noTarget');
    expect(checkTeamRequest(req(riderSide(), anchorSide(), { land: { x: 61.45, y: 0.5, z: 43.0 } }))).toBe('noTarget');
    expect(checkTeamRequest(req(riderSide(), anchorSide(), { land: undefined }))).toBe('noTarget');
    expect(checkTeamRequest(req(riderSide(), anchorSide(), { spot: newSwingDevice({ ...SPOT, w: 3.6 }) }))).toBe('noTarget');
    expect(checkTeamRequest(req(riderSide(), anchorSide(), { spot: newSwingDevice({ ...SPOT, y2: 0.5 }) }))).toBe('noTarget');
    expect(checkTeamRequest(req(riderSide(), anchorSide(), { spot: newSwingDevice({ ...SPOT, y: 3.2 }) }))).toBe('noTarget');
    // K0's shared checks and the id gate
    expect(checkTeamRequest(req(riderSide(), anchorSide(), { sinceLast: 0 }))).toBe('rate');
    expect(checkTeamRequest(req(riderSide({ alive: false }), anchorSide()))).toBe('dead');
    expect(checkTeamRequest(req(riderSide({ id: 'b' }), anchorSide()))).toBe('notMates');
    flags.kitMoves = new Set();
    expect(checkTeamRequest(req(riderSide(), anchorSide()))).toBe('notOffering');
    expect(warn).toHaveBeenCalled();
  });
});

describe('(coop-kit K4) Swing Pass: the arc (pure)', () => {
  it('starts at the feet, steps off, sags over the gap only, lets go past the far edge and lands on the landing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const [d, lx] of [
      [newSwingDevice(SPOT), 61.45],
      [newSwingDevice({ ...SPOT, w: 2.0 }), 62.95],
    ] as const) {
      const pt = { x: 0, y: 0, z: 0 };
      const kg = SWING.grip / SWING.ride;
      expect(swingPath(0, RIDER.x, 0, RIDER.z, d, 0, 0, pt)).toEqual({ x: RIDER.x, y: 0, z: RIDER.z });
      expect(swingPath(kg, RIDER.x, 0, RIDER.z, d, 0, 0, pt)).toEqual({ x: expect.closeTo(66.2, 9), y: 0, z: expect.closeTo(43.0, 9) });
      let low = Infinity;
      let lowAlong = 0;
      for (let i = 0; i <= 200; i++) {
        const p = swingPath(i / 200, RIDER.x, 0, RIDER.z, d, 0, 0, pt);
        const along = d.x - p.x;
        if (along <= 0 || along >= d.gap) expect(p.y).toBeGreaterThanOrEqual(-1e-9);
        if (p.y < low) {
          low = p.y;
          lowAlong = along;
        }
      }
      // the low point near mid-gap; at mid-gap the feet `dip` under the straight line (step-off to let-go)
      expect(Math.abs(lowAlong - d.gap / 2)).toBeLessThan(0.3);
      const u = (d.gap / 2 + SWING.stepBack) / (d.gap + SWING.releaseIn + SWING.stepBack);
      const mid = swingPath(kg + u * (1 - kg), RIDER.x, 0, RIDER.z, d, 0, 0, pt);
      expect(d.x - mid.x).toBeCloseTo(d.gap / 2, 6);
      expect(mid.y).toBeCloseTo(SWING.releaseUp * u - SWING.dip, 2);
      expect(swingPath(1, RIDER.x, 0, RIDER.z, d, 0, 0, pt)).toEqual({ x: expect.closeTo(d.x - d.gap - 0.3, 9), y: expect.closeTo(SWING.releaseUp, 9), z: expect.closeTo(43.0, 9) });
      expect(swingLand(0, d, 0, pt)).toEqual({ x: expect.closeTo(d.x - d.gap - 0.3, 9), y: expect.closeTo(SWING.releaseUp, 9), z: expect.closeTo(43.0, 9) });
      for (let i = 0; i <= 200; i++) expect(swingLand(i / 200, d, 0, pt).y).toBeGreaterThanOrEqual(-1e-9);
      expect(swingLand(1, d, 0, pt)).toEqual({ x: expect.closeTo(lx, 9), y: 0, z: expect.closeTo(43.0, 9) });
    }
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('(coop-kit K4) Swing Pass: the swing on two pages', () => {
  it('the host page anchors, the client rides: across in 2.0 s, crouched on the landing, one done call on the host', () => {
    const W = world(AT, RIDER);
    brace(W, W.H);
    step(W, { cc: true });
    expect(W.C.asked[0]).toEqual(['swingPass', 'h0', 0, 0, 0, expect.closeTo(61.45, 9), expect.closeTo(43.0, 9)]);
    expect([W.C.tm.state, W.H.tm.state, W.denied]).toEqual(['swingRide', 'swingHold', []]);
    step(W);
    expect([W.C.tm.mode, W.C.tm.wireSub, W.C.tm.wireS, W.C.pose.traverse]).toEqual(['boost', SWING_SUB, 1, 'vault']);
    expect(until(W, () => W.C.tm.state === 'swingRelease')).toBeCloseTo(SWING.ride, 1);
    expect(W.C.c.override?.crouch).toBe(true);
    expect(until(W, () => W.C.tm.state === 'none')).toBeCloseTo(SWING.release, 1);
    const p = W.C.c.pos;
    expect(Math.hypot(p.x - 61.45, p.y - 0, p.z - 43.0)).toBeLessThan(0.05);
    expect([W.C.crouches.n, W.C.ends, W.H.ends, W.H.tm.state, W.C.pose.traverse]).toEqual([1, ['pull'], [], 'none', 'none']);
    expect(W.H.done).toEqual([['swingPass', 'a5-swing', 'c1', undefined]]);
    expect(W.C.done).toEqual([]);
  });

  it('roles swapped: the client anchors, the host page rides', () => {
    const W = world(RIDER, AT);
    brace(W, W.C);
    ride(W, W.H);
    until(W, () => W.H.tm.state === 'none', 3);
    const p = W.H.c.pos;
    expect(Math.hypot(p.x - 61.45, p.y, p.z - 43.0)).toBeLessThan(0.05);
    expect([W.H.ends, W.C.ends, W.C.tm.state, W.H.crouches.n]).toEqual([['pull'], [], 'none', 1]);
    expect(W.H.done).toEqual([['swingPass', 'a5-swing', undefined, 'c1']]);
    expect(W.C.done).toEqual([]);
  });

  it("a pending request says so until the host answers or it lapses", () => {
    const W = world(AT, RIDER);
    W.host = false;
    brace(W, W.H);
    step(W, { cc: true });
    step(W);
    expect([W.C.tm.state, W.C.tm.prompt]).toEqual(['none', "Taking your partner's wrist..."]);
    steps(W, SWING.askWait + 0.05);
    expect(W.C.tm.prompt).toBe('Co-op: get swung across (swing pass)');
  });

  it('a rider in reach of the anchor but over riderStart from the step-off point gets no offer (Marlow ~06:45: the step-in ignores walls)', () => {
    const far = { x: 67.5, z: 43.0 }; // 1.3 m behind the step-off point (66.2, 43.0), ~1.2 m from the braced anchor
    const W = world(AT, far);
    brace(W, W.H);
    step(W, { cc: true });
    expect([W.C.tm.state, W.C.asked]).toEqual(['none', []]);
  });

  it('refused on the press with a line (no request): too wide, not level; a 2.0 m gap runs and lands', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const [spot, text] of [
      [{ ...SPOT, w: 3.6 }, 'The gap is too wide to swing across'],
      [{ ...SPOT, y2: 0.5 }, 'The far side is not level with this one'],
    ] as const) {
      const W = world(AT, RIDER, [spot]);
      brace(W, W.H);
      step(W, { cc: true });
      expect([W.C.tm.state, W.C.asked, W.C.toasts]).toEqual(['none', [], [text]]);
    }
    const W = world(AT, RIDER, [{ ...SPOT, w: 2.0 }]);
    brace(W, W.H);
    ride(W, W.C);
    until(W, () => W.C.tm.state === 'none', 3);
    expect(Math.hypot(W.C.c.pos.x - 62.95, W.C.c.pos.z - 43.0)).toBeLessThan(0.05);
    expect(W.H.done).toHaveLength(1);
  });
});

describe('(coop-kit K4) Swing Pass: committed at the step-off; moved', () => {
  it('the anchor hit before the step-off stops it (the rider stays on the near floor); after it, nothing stops it', () => {
    const W = world(AT, RIDER);
    brace(W, W.H);
    ride(W, W.C);
    steps(W, 0.1);
    W.H.health.hp = 50;
    step(W);
    expect([W.H.tm.state, W.H.ends, W.C.tm.state, W.C.ends, W.H.done]).toEqual(['none', ['drop'], 'none', [], []]);
    expect(W.C.c.pos.y).toBe(0);
    expect(W.C.c.pos.x).toBeGreaterThan(65.85);

    const L = world(AT, RIDER);
    brace(L, L.H);
    ride(L, L.C);
    steps(L, 0.5);
    L.H.health.hp = 50;
    step(L, { hb: true, cb: true });
    expect([L.H.tm.state, L.H.ends, L.C.tm.state, L.C.c.swallowCrouch]).toEqual(['swingHold', [], 'swingRide', true]);
    until(L, () => L.C.tm.state === 'none', 3);
    expect([L.C.ends, L.H.tm.state, L.H.done.length]).toEqual([['pull'], 'none', 1]);
  });

  it('an 8 m teleport mid-offer or mid-ride ends the move at once; the anchor then frees itself', () => {
    const W = world(AT, FAR);
    brace(W, W.H);
    W.H.c.pos.x += 8;
    step(W);
    expect([W.H.tm.state, W.H.tm.endWhy, dev(W.H).user]).toEqual(['none', 'swing: moved', '']);

    const R = world(AT, RIDER);
    brace(R, R.H);
    ride(R, R.C);
    steps(R, 0.5);
    R.C.c.pos.x -= 8;
    step(R);
    expect([R.C.tm.state, R.C.tm.endWhy, R.C.ends, R.C.pose.traverse]).toEqual(['none', 'swing: moved', [], 'none']);
    until(R, () => R.H.tm.state === 'none', 3);
    expect([R.H.tm.endWhy, R.H.ends, R.H.done]).toEqual(['swing: no end heard', [], []]);
  });
});

// ---- K0's real host (tests/kit/kitApi.test.ts's stub) ----

type Who = { x: number; y: number; z: number; m: string; sub?: number; s?: number };

function host(c1: Who, c2: Who, puppet = false) {
  const h = Object.create(CoopHost.prototype) as CoopHost;
  const sent: Record<string, unknown>[] = [];
  const team = { begin: vi.fn(), ended: vi.fn(), denied: vi.fn(), devices: { list: [newSwingDevice(SPOT)] } };
  const mode = { onTeamMove: vi.fn(), onKitDone: vi.fn() };
  const rp = (id: string, p: Who) => ({ id, alive: true, held: false, feet: { x: p.x, y: p.y, z: p.z }, state: { f: PF.grounded, mv: { ...emptyMoveState(), m: p.m, sub: p.sub ?? 0, s: p.s ?? 0 } } });
  Object.assign(h, {
    s: { selfId: 'h', send: (m: Record<string, unknown>) => sent.push(m) },
    g: { team, mode, puppet, player: { alive: true, position: { x: 0.5, y: 0, z: 0 }, controller: { crouched: false } }, world: { level: { anchors: { get: () => null } } } },
    remotes: new Map([
      ['c1', rp('c1', c1)],
      ['c2', rp('c2', c2)],
    ]),
    teamPairs: new Map(),
    kitPairs: new Map(),
    pairT0: new Map(),
    teamLast: new Map(),
    teamMv: emptyMoveState(),
    time: 20,
  });
  return { h: h as unknown as { onTeamMove(by: string, kind: string, partner: string, target: number, ss: number, gy: number, lx?: number, lz?: number): void }, sent, mode };
}

describe("(coop-kit K4) Swing Pass: done through K0's host; the id off; the flag", () => {
  it("the rider's 'pull' tells the mode once with the spot and the pair; the anchor's does nothing; a puppet never", () => {
    const rider: Who = { x: RIDER.x, y: 0, z: RIDER.z, m: 'ground' };
    const anchor: Who = { x: 66.45, y: 0, z: 43.55, m: 'brace', sub: SWING_SUB, s: 1 };
    const t = host(rider, anchor);
    t.h.onTeamMove('c1', 'swingPass', 'c2', 0, 0, 0, 61.45, 43.0);
    expect(t.sent).toEqual([{ t: 'tstart', kind: 'swingPass', a: 'c1', b: 'c2', target: 0, s: 0, t0: 20, l: [61.45, 0, 43.0] }]);
    t.sent.length = 0;
    t.h.onTeamMove('c2', 'hangEnd', '', 0, 0, 0);
    expect([t.sent, t.mode.onKitDone.mock.calls]).toEqual([[], []]);
    t.h.onTeamMove('c1', 'hangEnd', '', 0, 0, 0);
    expect(t.sent).toEqual([{ t: 'tend', a: 'c1', b: 'c2', k: 'pull' }]);
    expect(t.mode.onKitDone.mock.calls).toEqual([['swingPass', 'a5-swing', 'c1', 'c2']]);
    const P = host(rider, anchor, true);
    P.h.onTeamMove('c1', 'swingPass', 'c2', 0, 0, 0, 61.45, 43.0);
    P.h.onTeamMove('c1', 'hangEnd', '', 0, 0, 0);
    expect(P.mode.onKitDone).not.toHaveBeenCalled();
  });

  it('?kitmoves=0: no prompt on either page; the host refuses a spoofed request', () => {
    flags.kitMoves = readKitMoves('0', true);
    const W = world(AT, RIDER);
    step(W, { hc: true, cc: true });
    expect([W.H.tm.state, W.C.tm.state]).toEqual(['none', 'none']);
    noSwing(W.H);
    noSwing(W.C);
    expect(checkTeamRequest(req(riderSide(), anchorSide()))).toBe('notOffering');
  });

  it('swingPass is built: on with the default on (the game), off with it off; its pair rule', () => {
    expect(KIT_BUILT).toContain('swingPass');
    expect(readKitMoves(null, true).has('swingPass')).toBe(true);
    expect(readKitMoves(null, false).has('swingPass')).toBe(false);
    expect(KIT_PAIR.swingPass).toEqual({ pairS: expect.closeTo(5, 9), doneBy: 'a' });
  });
});
