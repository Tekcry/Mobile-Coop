// (coop-kit K3) Chimney Pair: both brace back to back in a narrow shaft and climb it together. Two TeamControllers on
// fake games (a host page 'h0' and a client page 'c1', each page's mate rebuilt every step from the other page's
// controller one step late), Marlow's A5 spot exactly as #612 places it, the host's start by hand and its end relay
// through K0's `kitEnd` (as `coopHost.kitHangEnd`): the spot, the offer, the host's rule, the brace, the lead cap on
// both pages, both top-out orders and the one done call on the host page, the let-go / hit / step-off / lost-partner
// slides, the moved end, no split jump in the spot's shaft, single player and `?kitmoves=0`. Marked spots only (lead).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from '../../src/core/babylon';
import { flags, KIT_BUILT, readKitMoves } from '../../src/core/flags';
import { buildCoverSegments, type CoverBox } from '../../src/cover/coverData';
import { findSplitGaps, noSplitAt, setNoSplit, splitReach } from '../../src/player/splitJump';
import { checkTeamRequest, CHIMNEY_SUB, type TeamRequest, type TeamSide } from '../../src/game/teamMoves';
import { addKitSpot, kitDone, kitSpotIndex, type KitSpot } from '../../src/game/kit/kitApi';
import { registerKitMove } from '../../src/game/kit/registry';
import { CHIMNEY, CHIMNEY_MOVE, chimneySpotOk, inSpot, isChimneyDevice, newShaft, spotShaft, type ChimneyDevice } from '../../src/game/kit/chimneyPair';
import { TeamController, type TeamMate, type TeamStart } from '../../src/game/teamController';
import { kitEnd, kitPairOver, newKitPair, type KitPair } from '../../src/net/kitNet';

const DT = 1 / 60;

// Marlow #612 (head 5f6b70b31) a5Substation: A5_GAP, A5_WALLTOP and the spot's call
const GP = { x0: 68.35, x1: 69.75, z0: 30.25, z1: 35.75 } as const;
const WT = { x0: 67.85, x1: 68.35, y: 6 } as const;
const SPOT: KitSpot = { id: 'a5-chimney', kind: 'chimneyPair', x: (GP.x0 + GP.x1) / 2, y: 0, z: (GP.z0 + GP.z1) / 2, yaw: -Math.PI / 2, w: GP.x1 - GP.x0, h: WT.y, x2: (WT.x0 + WT.x1) / 2, z2: (GP.z0 + GP.z1) / 2 };
/** Station 11's marks and the joiner's spot within reach of the offerer's pin. */
const MARK1 = { x: 69.0, z: 32.0 };
const NEAR = { x: 69.2, z: 33.2 };

/** A5's walls as cover boxes: the 6 m perimeter wall, the hall's 10 m shell wall, the cross walls at z 30 and 36. */
const box = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): CoverBox => ({ c: [cx, cy, cz], s: [sx, sy, sz], yaw: 0, pitch: 0, collide: true });
const A5_BOXES: CoverBox[] = [box(68.1, 3, 33, 0.5, 6, 10), box(70, 5, 33, 0.5, 10, 10), box(69.05, 3, 30, 1.4, 6, 0.5), box(69.05, 3, 36, 1.4, 6, 0.5)];

interface Page {
  id: string;
  g: { puppet: boolean; mode: { onKitDone: (...a: unknown[]) => void } };
  tm: TeamController;
  c: { pos: Vector3; yaw: number; override: { kinematic?: Vector3; yaw?: number } | null };
  pose: { traverse: string; traverseT: number };
  mates: TeamMate[];
  asked: unknown[][];
  ends: string[];
  health: { hp: number };
  done: unknown[][];
  /** The mate is driven by hand (not synced). */
  frozen: boolean;
}

function page(id: string, puppet: boolean, at: { x: number; z: number }, anchors: object, mateId: string | null): Page {
  const c = { pos: new Vector3(at.x, 0, at.z), renderPos: new Vector3(), yaw: -Math.PI / 2, renderYaw: 0, override: null, grounded: true, swallowCrouch: false, crouched: false, crouchIntent: false, autoCrouch: false, setCrouchToggle: () => {} };
  const mates: TeamMate[] = mateId ? [{ id: mateId, pos: new Vector3(99, 0, 99), yaw: 0, mode: 'ground', sub: 0, s: 0 }] : [];
  const asked: unknown[][] = [];
  const ends: string[] = [];
  const done: unknown[][] = [];
  const health = { hp: 100 };
  const pose = { traverse: 'none', traverseT: 0, tumble: 0 };
  const g = {
    puppet,
    mode: { onKitDone: (...a: unknown[]) => done.push(a) },
    player: { alive: true, controller: c, pose },
    net: { teamMates: () => mates, teamRequest: (...a: unknown[]) => asked.push(a), teamHangEnd: (k: string) => ends.push(k) },
    app: { toasts: { show: () => {} } },
    traversal: { attached: false, committed: null, attach: { kind: 'none', phase: 'off' } },
    takedown: { active: null },
    strike: { active: false },
    target: { health },
    ballistics: { ray: () => ({ hit: false, distance: 0, point: new Vector3() }) },
    world: { level: { anchors } },
  };
  return { id, g, tm: new TeamController(g as never), c, pose, mates, asked, ends, health, done, frozen: false };
}

interface World {
  H: Page;
  C: Page;
  pair: KitPair | null;
  seen: { h: number; c: number };
  now: number;
}

/** The host page (b, at mark 1) and the client page (a, within reach), both in Marlow's spot. */
function world(spots: readonly KitSpot[] = [SPOT], cAt = NEAR): World {
  const anchors = {};
  for (const s of spots) addKitSpot(anchors, s);
  const W = { H: page('h0', false, MARK1, anchors, 'c1'), C: page('c1', true, cAt, anchors, 'h0'), pair: null, seen: { h: 0, c: 0 }, now: 1 };
  sync(W);
  return W;
}

function sync(W: World): void {
  for (const [p, o] of [
    [W.H, W.C],
    [W.C, W.H],
  ] as const) {
    if (p.frozen || p.mates.length === 0) continue;
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

/** The stub host: each page's end through `kitEnd` (the pair rule), relayed to both; a 'pull' tells the mode. */
function relay(W: World): void {
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
    if (v === 'pull') {
      for (const pg of [W.H, W.C]) kitDone(pg.g, p.kind, p.spot, p.a === 'h0' ? undefined : p.a, p.b === 'h0' ? undefined : p.b);
    }
  }
}

interface In {
  hc?: boolean;
  hb?: boolean;
  cc?: boolean;
  cb?: boolean;
  hy?: number;
  cy?: number;
}

function step(W: World, i: In = {}, first = true): void {
  W.H.tm.fixedUpdate(DT, !!i.hc && first, !!i.hb && first, i.hy ?? 0);
  W.C.tm.fixedUpdate(DT, !!i.cc && first, !!i.cb && first, i.cy ?? 0);
  move(W.H);
  move(W.C);
  sync(W);
  relay(W);
  W.now += DT;
}

function steps(W: World, seconds: number, i: In = {}, each?: () => void): void {
  const n = Math.round(seconds / DT);
  for (let k = 0; k < n; k++) {
    step(W, i, k === 0);
    each?.();
  }
}

/** Step with held input until `done` (at most `max` s). */
function until(W: World, i: In, done: () => boolean, max = 30, each?: () => void): void {
  for (let k = 0; k < Math.round(max / DT) && !done(); k++) {
    step(W, i, false);
    each?.();
  }
  expect(done()).toBe(true);
}

const side = (p: Page): TeamSide => ({ id: p.id, x: p.c.pos.x, y: p.c.pos.y, z: p.c.pos.z, mode: p.tm.mode ?? 'ground', alive: true, sub: p.tm.wireSub, s: p.tm.wireS });
const dev = (p: Page): ChimneyDevice => p.tm.devices.get('a5-chimney') as ChimneyDevice;
const ys = (W: World): [number, number] => [W.C.tm.wireS, W.H.tm.wireS];
const pulls = (p: Page): number => p.ends.filter((k) => k === 'pull').length;

/** b (host) offers, a (client) joins; the stub host checks and starts; both brace. */
function offerAndJoin(W: World): void {
  step(W, { hc: true });
  expect(W.H.tm.state).toBe('chimneyOffer');
  steps(W, CHIMNEY.offerSnap + 0.05);
  expect(W.C.tm.prompt).toBe('Co-op: climb the shaft back to back (chimney pair)');
  step(W, { cc: true });
  expect(W.C.asked).toHaveLength(1);
  expect(W.C.asked[0]!.slice(0, 4)).toEqual(['chimneyPair', 'h0', 0, 0]);
  step(W);
  expect(W.C.tm.prompt).toBe('Bracing...');
  const r: TeamRequest = { kind: 'chimneyPair', a: side(W.C), b: side(W.H), target: 0, targetUp: 0, sinceLast: 9, spot: dev(W.H) };
  expect(checkTeamRequest(r)).toBeNull();
  const s: TeamStart = { kind: 'chimneyPair', a: 'c1', b: 'h0', target: 0, s: 0 };
  W.H.tm.begin(s, 'h0');
  W.C.tm.begin(s, 'c1');
  W.pair = newKitPair('chimneyPair', 'c1', 'h0', W.now, 'a5-chimney');
  expect([W.H.tm.state, W.C.tm.state]).toEqual(['chimneyBrace', 'chimneyPush']);
}

/** Joined and braced: both in the climb at the floor. */
function climbing(): World {
  const W = world();
  offerAndJoin(W);
  steps(W, CHIMNEY.brace + DT);
  expect([W.H.tm.state, W.C.tm.state]).toEqual(['chimneyClimb', 'chimneyRise']);
  return W;
}

const kit0 = flags.kitMoves;
const coopKit0 = flags.coopKit;
beforeAll(() => {
  flags.kitMoves = new Set(['chimneyPair']);
  flags.coopKit = false;
});
afterAll(() => {
  flags.kitMoves = kit0;
  flags.coopKit = coopKit0;
  setNoSplit([]);
});
beforeEach(() => registerKitMove(CHIMNEY_MOVE));
afterEach(() => {
  flags.kitMoves = new Set(['chimneyPair']);
  vi.restoreAllMocks();
});

describe('(coop-kit K3) Chimney Pair: the spot', () => {
  it('the spot shaft and its box at the marks; the band check names each fault', () => {
    const W = world();
    step(W);
    const d = dev(W.H);
    const s = spotShaft(d, MARK1.x, MARK1.z, newShaft());
    expect([s.cx, s.cz, s.ux, s.w, s.h, s.floor]).toEqual([expect.closeTo(69.05, 6), expect.closeTo(32, 6), expect.closeTo(-1, 9), expect.closeTo(1.4, 9), 6, 0]);
    expect(Math.abs(s.uz)).toBeLessThan(1e-9);
    expect(s.ex).toBeCloseTo(0.95, 6);
    expect(inSpot(d, 69.0, 0, 32.0, 0)).toBe(true);
    expect(inSpot(d, 69.0, 0, 34.0, 0)).toBe(true);
    expect(inSpot(d, 69.05, 0, 36.5, 0)).toBe(false);
    expect(inSpot(d, 68.3, 0, 33, 0)).toBe(false);
    expect(inSpot(d, 69.05, 1, 33, 0)).toBe(false);
    expect(chimneySpotOk(SPOT)).toBe('');
    expect(chimneySpotOk({ ...SPOT, w: 1.0 })).toBe('width');
    expect(chimneySpotOk({ ...SPOT, h: 9 })).toBe('height');
    expect(chimneySpotOk({ ...SPOT, x2: 69.3 })).toBe('exit');
    expect(chimneySpotOk({ ...SPOT, w: undefined })).toBe('fields');
  });

  it('one device per spot with the id off, the same index on both pages; a bad spot warns once', () => {
    flags.kitMoves = new Set();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const W = world([{ ...SPOT, id: 'wide', z: 50, w: 2.0 }, SPOT]);
    step(W);
    for (const p of [W.H, W.C]) {
      expect(p.tm.devices.list.map((d) => d.id)).toEqual(['wide', 'a5-chimney']);
      expect(isChimneyDevice(p.tm.devices.list[1]!)).toBe(true);
      expect(kitSpotIndex(p.tm.devices.list, 'a5-chimney')).toBe(1);
    }
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('wide'))).toHaveLength(2);
  });
});

describe('(coop-kit K3) Chimney Pair: the offer and the host rule', () => {
  it('single player: no prompt, no state in the shaft', () => {
    const W = world();
    W.H.mates.length = 0;
    step(W, { hc: true });
    expect([W.H.tm.state, W.H.tm.prompt]).toEqual(['none', null]);
  });

  it('Co-op in the spot: the offer pinned 0.15 m off the centre line facing its wall; B lets go', () => {
    const W = world();
    step(W);
    expect(W.H.tm.prompt).toBe('Co-op: brace for a chimney climb (chimney pair)');
    step(W, { hc: true });
    steps(W, CHIMNEY.offerSnap + 0.05);
    expect(W.H.tm.state).toBe('chimneyOffer');
    expect(W.H.c.pos.x).toBeCloseTo(69.05 - CHIMNEY.back, 6);
    expect(W.H.c.pos.z).toBeCloseTo(32, 6);
    expect(W.H.c.yaw).toBeCloseTo(-Math.PI / 2, 6);
    expect([W.H.tm.mode, W.H.tm.wireSub, W.H.tm.wireS, W.H.pose.traverse]).toEqual(['brace', CHIMNEY_SUB, expect.closeTo(-1.4, 9), 'brace']);
    expect(W.H.tm.prompt).toBe('Braced in the shaft: your partner presses Co-op (B lets go)');
    step(W, { hb: true });
    expect([W.H.tm.state, W.H.c.override, W.H.pose.traverse]).toEqual(['none', null, 'none']);
    expect(W.H.ends).toEqual([]);
  });

  it('outside a spot (the corridor past the cross wall) and in an inert spot: no chimney offer', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const W = world([SPOT, { ...SPOT, id: 'nofields', z: 60, h: undefined }]);
    // (the fake world has no walls: the built-in edge offers may prompt; none is a chimney)
    for (const z of [37.5, 60]) {
      W.H.c.pos.set(69.05, 0, z);
      step(W, { hc: true });
      expect(W.H.tm.state.startsWith('chimney')).toBe(false);
      expect(W.H.tm.prompt ?? '').not.toContain('chimney');
    }
  });

  it("the host's rule: ok, then each refusal", () => {
    const W = world();
    step(W);
    const spot = dev(W.H);
    const b = (o: Partial<TeamSide> = {}): TeamSide => ({ id: 'h0', x: 68.9, y: 0, z: 32, mode: 'brace', alive: true, sub: CHIMNEY_SUB, s: -1.4, ...o });
    const a = (o: Partial<TeamSide> = {}): TeamSide => ({ id: 'c1', x: 69.2, y: 0, z: 33, mode: 'ground', alive: true, ...o });
    const req = (aa: TeamSide, bb: TeamSide, sp: ChimneyDevice | null = spot): TeamRequest => ({ kind: 'chimneyPair', a: aa, b: bb, target: 0, targetUp: 0, sinceLast: 9, spot: sp ?? undefined });
    expect(checkTeamRequest(req(a(), b()))).toBeNull();
    expect(checkTeamRequest(req(a(), b({ mode: 'ground', sub: 0, s: 0 })))).toBe('notOffering');
    expect(checkTeamRequest(req(a(), b({ s: 3 })))).toBe('notOffering');
    expect(checkTeamRequest(req(a(), b({ s: -1.0 })))).toBe('notBraced');
    expect(checkTeamRequest(req(a(), b({ s: -1.8 })))).toBe('notBraced');
    expect(checkTeamRequest(req(a({ mode: 'air' }), b()))).toBe('busy');
    expect(checkTeamRequest(req(a({ y: 0.5 }), b()))).toBe('far');
    expect(checkTeamRequest(req(a({ z: 34 }), b()))).toBe('far');
    // a outside the spot's box (past its end), within reach of b
    expect(checkTeamRequest(req(a({ z: 36.7 }), b({ z: 35.5 })))).toBe('far');
    // marked spots only: no spot, no chimney
    expect(checkTeamRequest(req(a(), b(), null))).toBe('noTarget');
    flags.kitMoves = new Set();
    expect(checkTeamRequest(req(a(), b()))).toBe('notOffering');
  });
});

describe('(coop-kit K3) Chimney Pair: the climb', () => {
  it('join and brace: back to back in 1.0 s, facing opposite walls, wire s 0', () => {
    const W = climbing();
    expect(W.H.c.pos.x - W.C.c.pos.x).toBeCloseTo(-2 * CHIMNEY.back, 6);
    expect(W.C.c.pos.x).toBeCloseTo(69.05 + CHIMNEY.back, 6);
    expect(Math.abs(W.H.c.pos.z - W.C.c.pos.z)).toBeLessThan(0.05);
    expect(W.H.c.yaw).toBeCloseTo(-Math.PI / 2, 6);
    expect(W.C.c.yaw).toBeCloseTo(Math.PI / 2, 6);
    expect(ys(W)).toEqual([0, 0]);
    expect([W.C.tm.mode, W.C.tm.wireSub]).toEqual(['boost', CHIMNEY_SUB]);
  });

  it('the lead cap on both pages: one alone stops 0.15 m over or under the other; together at 0.35 m/s', () => {
    const W = climbing();
    steps(W, 1, { cy: 1 });
    expect(ys(W)[0]).toBeCloseTo(CHIMNEY.lead, 6);
    expect(W.H.mates[0]!.s).toBeCloseTo(CHIMNEY.lead, 6);
    expect(W.C.tm.prompt).toBe('Wait for your partner');
    steps(W, 2, { hy: 1 });
    expect(ys(W)).toEqual([expect.closeTo(0.15, 6), expect.closeTo(0.3, 6)]);
    expect(W.C.mates[0]!.s).toBeCloseTo(0.3, 6);
    const gap = (): void => {
      for (const p of [W.H, W.C]) expect(Math.abs(p.tm.wireS - p.mates[0]!.s!)).toBeLessThanOrEqual(CHIMNEY.lead + CHIMNEY.climb * DT + 1e-9);
    };
    const y0 = ys(W)[1];
    steps(W, 1, { hy: 1, cy: 1 }, gap);
    expect(Math.abs(ys(W)[1] - y0 - CHIMNEY.climb)).toBeLessThan(0.02);
    steps(W, 0.5, { hy: -1, cy: -1 }, gap);
    steps(W, 1, { cy: -1 });
    expect(ys(W)[1] - ys(W)[0]).toBeCloseTo(CHIMNEY.lead, 6);
    expect(W.H.tm.state).toBe('chimneyClimb');
  });

  for (const first of ['a', 'b'] as const) {
    it(`top-out, ${first} first: both out on the wall top, one 'pull' from a after b's top-out, one done call on the host`, () => {
      const W = climbing();
      const lead = first === 'a' ? W.C : W.H;
      const wait = first === 'a' ? W.H : W.C;
      const top = SPOT.h! - CHIMNEY.topReach;
      let bTopAt = -1;
      let pullAt = -1;
      let n = 0;
      const watch = (): void => {
        n++;
        if (W.H.tm.state === 'chimneyTop') {
          expect(W.H.tm.wireS).toBe(6);
          if (bTopAt < 0) bTopAt = n;
        }
        if (pullAt < 0 && pulls(W.C) > 0) pullAt = n;
      };
      // both up until the waiting one is 0.1 m under the top; it stops, the leader tops out
      until(W, { hy: 1, cy: 1 }, () => wait.tm.wireS >= top - 0.1, 20, watch);
      until(W, first === 'a' ? { cy: 1 } : { hy: 1 }, () => lead.tm.state === 'none', 5, watch);
      expect(lead.tm.wireS).toBe(0);
      // the leader is free on the lip while its partner still climbs (no 'pull' yet)
      steps(W, 2, {}, watch);
      expect(pulls(W.C)).toBe(0);
      until(W, first === 'a' ? { hy: 1 } : { cy: 1 }, () => wait.tm.state === 'none', 5, watch);
      steps(W, 0.2, {}, watch);
      for (const [p, off] of [
        [W.H, CHIMNEY.outSep],
        [W.C, -CHIMNEY.outSep],
      ] as const) {
        expect(p.tm.state).toBe('none');
        expect(p.c.override).toBeNull();
        expect(p.c.pos.y).toBeCloseTo(6, 2);
        expect(Math.abs(p.c.pos.x - 68.1)).toBeLessThan(0.05);
        // (the last kinematic put lands with the end: the body stays one step short, < 1 mm)
        expect(Math.abs(p.c.pos.z - (32 + off))).toBeLessThan(1e-3);
        expect(p.c.yaw).toBeCloseTo(-Math.PI / 2, 6);
      }
      expect(pulls(W.C)).toBe(1);
      expect(pulls(W.H)).toBe(0);
      expect(bTopAt).toBeGreaterThan(0);
      expect(pullAt).toBeGreaterThanOrEqual(bTopAt);
      expect(W.H.done).toEqual([['chimneyPair', 'a5-chimney', 'c1', undefined]]);
      expect(W.C.done).toEqual([]);
      expect(W.pair).toBeNull();
    });
  }

  it("the pair rule: a's 'pull' is the success end, b's is not", () => {
    expect(kitEnd(newKitPair('chimneyPair', 'c1', 'h', 0, 'a5-chimney'), 'c1', 'pull', 1, 0)).toBe('pull');
    expect(kitEnd(newKitPair('chimneyPair', 'c1', 'h', 0, 'a5-chimney'), 'h', 'pull', 1, 0)).toBeNull();
    expect(newKitPair('chimneyPair', 'c1', 'h', 0).until).toBe(CHIMNEY.pairS);
  });
});

describe('(coop-kit K3) Chimney Pair: letting go', () => {
  /** Both climbing at 3 m. */
  const at3 = (): World => {
    const W = climbing();
    until(W, { hy: 1, cy: 1 }, () => W.H.tm.wireS >= 3);
    return W;
  };
  const bothDown = (W: World): void => {
    steps(W, 3);
    for (const p of [W.H, W.C]) {
      expect([p.tm.state, p.c.override]).toEqual(['none', null]);
      expect(Math.abs(p.c.pos.y)).toBeLessThan(0.03);
    }
    expect(pulls(W.H) + pulls(W.C)).toBe(0);
    expect(W.H.done).toEqual([]);
    expect(W.pair).toBeNull();
  };

  it("b's B: b sends 'drop' and slides at the rope's speed; a, told, slides too; both stand", () => {
    const W = at3();
    const y0 = W.H.tm.wireS;
    step(W, { hb: true });
    expect(W.H.ends).toEqual(['drop']);
    steps(W, 0.5);
    expect(y0 - W.H.tm.wireS).toBeCloseTo(1.6 * (0.5 + DT), 1);
    expect(W.C.tm.wireS).toBeLessThan(y0 - 0.5);
    bothDown(W);
  });

  it("a hit and a's B: the same", () => {
    const W = at3();
    W.H.health.hp = 60;
    step(W);
    expect([W.H.ends, W.H.tm.endWhy]).toEqual([['drop'], 'chimney: hurt']);
    bothDown(W);
    const V = at3();
    step(V, { cb: true });
    expect(V.C.ends).toEqual(['drop']);
    bothDown(V);
  });

  it("the step off: at the floor a holds the stick down -> 'drop'; b (0.15 m up) slides and stands", () => {
    const W = climbing();
    steps(W, 1, { hy: 1 });
    expect(W.H.tm.wireS).toBeCloseTo(0.15, 6);
    step(W, { cy: -1 });
    step(W, { cy: -1 });
    expect([W.C.tm.state, W.C.ends, W.C.tm.endWhy]).toEqual(['none', ['drop'], 'chimney: stepped off']);
    bothDown(W);
  });

  it('partner lost: the mate leaves the move with no end -> the slide after 0.5 s, its drop sent', () => {
    const W = at3();
    W.H.frozen = true;
    Object.assign(W.H.mates[0]!, { mode: 'ground', sub: 0, s: 0 });
    steps(W, CHIMNEY.lostGrace - 0.1);
    expect(W.H.ends).toEqual([]);
    steps(W, 0.2);
    expect([W.H.ends, W.H.tm.endWhy]).toEqual([['drop'], 'chimney: partner lost']);
    W.H.frozen = false;
    bothDown(W);
  });

  it('moved: a teleported climber ends at once and sends its drop', () => {
    const W = at3();
    W.C.c.pos.set(77, 0, 33);
    step(W);
    expect([W.C.tm.state, W.C.tm.endWhy, W.C.ends]).toEqual(['none', 'chimney: moved', ['drop']]);
    expect(W.H.tm.state).toBe('chimneyClimb');
  });
});

describe('(coop-kit K3) Chimney Pair: no split jump in the shaft, the id off', () => {
  it("splitReach is null inside the spot's shaft while the id is on; the anchors are unchanged", () => {
    const gaps = findSplitGaps(buildCoverSegments(A5_BOXES));
    expect(gaps).toHaveLength(1);
    const g = gaps[0]!;
    expect((g.a.x + g.b.x) / 2).toBeCloseTo(69.05, 6);
    const far = findSplitGaps(buildCoverSegments(A5_BOXES.map((b) => ({ ...b, c: [b.c[0] + 10, b.c[1], b.c[2]] as [number, number, number] }))))[0]!;
    const W = world();
    step(W);
    expect(splitReach(g, 69.05, 0, 33, 0, 1)).toBeNull();
    expect(splitReach(far, 79.05, 0, 33, 0, 1)).not.toBeNull();
    flags.kitMoves = new Set();
    step(W);
    expect(splitReach(g, 69.05, 0, 33, 0, 1)).not.toBeNull();
    expect(findSplitGaps(buildCoverSegments(A5_BOXES))).toHaveLength(1);
  });

  it('?kitmoves=0: no prompt on either page, the host refuses, no no-split box; KIT_BUILT holds chimneyPair', () => {
    flags.kitMoves = new Set();
    const W = world();
    step(W, { hc: true, cc: true });
    steps(W, 0.2);
    for (const p of [W.H, W.C]) {
      expect(p.tm.state).toBe('none');
      expect(p.tm.prompt ?? '').not.toContain('chimney');
    }
    const r: TeamRequest = { kind: 'chimneyPair', a: side(W.C), b: { ...side(W.H), mode: 'brace', sub: CHIMNEY_SUB, s: -1.4 }, target: 0, targetUp: 0, sinceLast: 9, spot: dev(W.H) };
    expect(checkTeamRequest(r)).toBe('notOffering');
    expect(noSplitAt(69.05, 0, 33)).toBe(false);
    expect(KIT_BUILT).toContain('chimneyPair');
    expect(readKitMoves(null, true).has('chimneyPair')).toBe(true);
    expect(readKitMoves(null, false).has('chimneyPair')).toBe(false);
  });
});
