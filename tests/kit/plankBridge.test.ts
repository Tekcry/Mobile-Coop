// (coop-kit K5a) Plank Bridge, lift and carry: the host's rule, the carry's cap, and two TeamControllers on a stub host
// (headless, fake GameStates; each page sees the other through its mates list, one step late): lift a spot's board,
// carry it 10 m at the slower stick, turn, put it down and lift it again with the hand gap within 0.25 m of the board's
// length on both pages; B or a hit drops it; a restart puts it back on its stack; `?kitmoves=0` and single player offer
// nothing.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Vector3 } from '../../src/core/babylon';
import { EventBus } from '../../src/core/events';
import { flags, readKitMoves } from '../../src/core/flags';
import { hyp2 } from '../../src/core/mathx';
import { checkTeamRequest, PLANK_SUB, type TeamRequest, type TeamSide } from '../../src/game/teamMoves';
import { addKitSpot, KIT_PAIR, type KitSpot } from '../../src/game/kit/kitApi';
import { registerKitMove } from '../../src/game/kit/registry';
import { carryVelocity, checkPlank, newPlankDevice, PLANK, PLANK_MOVE, plankEndNear, plankGap, plankPose, putPlankDown, type PlankDevice } from '../../src/game/kit/plankBridge';
import { TeamController, type TeamMate, type TeamStart } from '../../src/game/teamController';
import type { GameEvents } from '../../src/game/gameEvents';

const kitMoves0 = flags.kitMoves;
const coopKit0 = flags.coopKit;
beforeAll(() => {
  flags.kitMoves = new Set(['plankBridge']);
  flags.coopKit = false;
});
afterAll(() => {
  flags.kitMoves = kitMoves0;
  flags.coopKit = coopKit0;
});
beforeEach(() => registerKitMove(PLANK_MOVE));

const DT = 1 / 60;
/** The board along x (yaw 90 degrees), its ends at x -1.95 and +1.95 on the floor y 0. */
const SPOT: KitSpot = { id: 'a2-plank', kind: 'plankBridge', x: 0, y: 0, z: 0, yaw: Math.PI / 2, w: 3.9, h: 0.16 };
const LEN = 3.9;

interface Page {
  id: string;
  tm: TeamController;
  controller: { pos: Vector3; yaw: number; override: unknown; grounded: boolean; wishDir: Vector3; swallowCrouch: boolean };
  mates: TeamMate[];
  asked: unknown[][];
  ends: string[];
  health: { hp: number };
  events: EventBus<GameEvents>;
}

function page(id: string, x: number, z: number, anchors: object, mateIds: readonly string[]): Page {
  const controller = { pos: new Vector3(x, 0, z), renderPos: new Vector3(), yaw: 0, renderYaw: 0, override: null as unknown, grounded: true, swallowCrouch: false, crouched: false, crouchIntent: false, autoCrouch: false, setCrouchToggle: () => {}, wishDir: new Vector3() };
  const mates: TeamMate[] = mateIds.map((m) => ({ id: m, pos: new Vector3(99, 0, 99), yaw: 0, mode: 'ground', sub: 0, s: 0 }));
  const asked: unknown[][] = [];
  const ends: string[] = [];
  const health = { hp: 100 };
  const events = new EventBus<GameEvents>();
  const g = {
    player: { alive: true, controller, pose: { traverse: 'none', traverseT: 0, tumble: 0 } },
    net: { teamMates: () => mates, teamRequest: (...a: unknown[]) => asked.push(a), teamHangEnd: (k: string) => ends.push(k) },
    app: { toasts: { show: () => {} } },
    traversal: { attached: false, committed: null, attach: { kind: 'none', phase: 'off' } },
    takedown: { active: null },
    strike: { active: false },
    target: { health },
    ballistics: { ray: () => ({ hit: false, distance: 0, point: new Vector3() }) },
    world: { level: { anchors } },
    events,
  };
  return { id, tm: new TeamController(g as never), controller, mates, asked, ends, health, events };
}

/** Two pages: `pb` at the board's -x end (offers first), `pa` at its +x end. */
function pair(): { A: Page; B: Page } {
  const anchors = {};
  addKitSpot(anchors, SPOT);
  const B = page('pb', -2.3, 0, anchors, ['pa']);
  const A = page('pa', 2.3, 0, anchors, ['pb']);
  sync(A, B);
  return { A, B };
}

/** Each page sees the other's body and MoveState (the net's snapshot). */
function sync(A: Page, B: Page): void {
  for (const [p, o] of [
    [A, B],
    [B, A],
  ] as const) {
    const m = p.mates[0]!;
    m.pos.copyFrom(o.controller.pos);
    m.yaw = o.controller.yaw;
    m.mode = o.tm.mode ?? 'ground';
    m.sub = o.tm.wireSub;
    m.s = o.tm.wireS;
  }
}

/** The player controller's step in the fake: the override's velocity moves the body, its yaw turns it. */
function move(p: Page): void {
  const ov = p.controller.override as { velocity?: { x: number; z: number }; yaw?: number } | null;
  if (!ov) return;
  if (ov.velocity) {
    p.controller.pos.x += ov.velocity.x * DT;
    p.controller.pos.z += ov.velocity.z * DT;
  }
  if (ov.yaw !== undefined) p.controller.yaw = ov.yaw;
}

const dev = (p: Page): PlankDevice => p.tm.devices.get('a2-plank') as PlankDevice;

/** The stub host relays a page's end to both (`tend`), as `coopHost.kitHangEnd`. */
function relay(A: Page, B: Page, seen: { a: number; b: number }): void {
  while (seen.a < A.ends.length || seen.b < B.ends.length) {
    const k = (seen.a < A.ends.length ? A.ends[seen.a++] : B.ends[seen.b++]) as 'pull' | 'drop';
    A.tm.ended(k);
    B.tm.ended(k);
  }
}

interface Run {
  gaps: number[];
}

/** Both pages step `seconds`; presses on the first step; every step's hand gap on both pages while carrying. */
function steps(A: Page, B: Page, seen: { a: number; b: number }, seconds: number, press: { coopA?: boolean; coopB?: boolean; bA?: boolean; bB?: boolean } = {}, run?: Run): void {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) {
    A.tm.fixedUpdate(DT, !!press.coopA && i === 0, !!press.bA && i === 0);
    B.tm.fixedUpdate(DT, !!press.coopB && i === 0, !!press.bB && i === 0);
    if (run && A.tm.state === 'plankCarryA' && B.tm.state === 'plankCarry') run.gaps.push(plankGap(dev(A)), plankGap(dev(B)));
    move(A);
    move(B);
    sync(A, B);
    relay(A, B, seen);
  }
}

const side = (p: Page): TeamSide => ({ id: p.id, x: p.controller.pos.x, y: p.controller.pos.y, z: p.controller.pos.z, mode: p.tm.mode ?? 'ground', alive: true, sub: p.tm.wireSub, s: p.tm.wireS });

/** B offers, A takes the other end; the stub host (B's page) checks and starts; both lift to the carry. */
function liftUp(A: Page, B: Page, seen: { a: number; b: number }): void {
  steps(A, B, seen, DT, { coopB: true });
  expect(B.tm.state).toBe('plankOffer');
  // (A stepped before B's offer reached it: one more step)
  steps(A, B, seen, DT);
  expect(A.tm.prompt).toBe('Co-op: take the other end (plank bridge)');
  const n = A.asked.length;
  steps(A, B, seen, DT, { coopA: true });
  expect(A.asked).toHaveLength(n + 1);
  const ask = A.asked[n]!;
  expect(ask.slice(0, 4)).toEqual(['plankBridge', 'pb', 0, 1]);
  const r: TeamRequest = { kind: 'plankBridge', a: side(A), b: side(B), target: 0, targetUp: 0, sinceLast: 9, spot: dev(B) };
  expect(checkTeamRequest(r)).toBeNull();
  const start: TeamStart = { kind: 'plankBridge', a: 'pa', b: 'pb', target: 0, s: 1 };
  A.tm.begin(start, 'pa');
  B.tm.begin(start, 'pb');
  expect([A.tm.state, B.tm.state]).toEqual(['plankLiftA', 'plankLift']);
  expect([A.tm.mode, B.tm.mode, A.tm.wireSub, B.tm.wireSub, A.tm.wireS, B.tm.wireS]).toEqual(['boost', 'brace', PLANK_SUB, PLANK_SUB, 1, 1]);
  steps(A, B, seen, PLANK.liftTime + 0.05);
  expect([A.tm.state, B.tm.state]).toEqual(['plankCarryA', 'plankCarry']);
  expect([A.tm.busy, B.tm.busy]).toEqual([true, true]);
}

function expectBand(gaps: readonly number[]): void {
  expect(gaps.length).toBeGreaterThan(0);
  for (const g of gaps) expect(Math.abs(g - LEN)).toBeLessThanOrEqual(PLANK.band + 1e-6);
}

describe('host rule (K5a)', () => {
  const dv = newPlankDevice(SPOT);
  const sideAt = (id: string, x: number, extra: Partial<TeamSide> = {}): TeamSide => ({ id, x, y: 0, z: 0, mode: 'ground', alive: true, ...extra });
  const offerer = (extra: Partial<TeamSide> = {}): TeamSide => sideAt('b', -2.3, { mode: 'brace', sub: PLANK_SUB, s: -1, ...extra });
  const req = (a: TeamSide, b: TeamSide, extra: Partial<TeamRequest> = {}): TeamRequest => ({ kind: 'plankBridge', a, b, target: 0, targetUp: 0, sinceLast: 9, spot: dv, ...extra });

  it('a lift: b offering at that spot, the board down, a at the other end on the same floor', () => {
    expect(checkPlank(req(sideAt('a', 2.3), offerer()))).toBeNull();
    expect(checkTeamRequest(req(sideAt('a', 2.3), offerer()))).toBeNull();
    // not offering / another spot's offer / no spot
    expect(checkPlank(req(sideAt('a', 2.3), offerer({ mode: 'ground' })))).toBe('notOffering');
    expect(checkPlank(req(sideAt('a', 2.3), offerer({ sub: 0 })))).toBe('notOffering');
    expect(checkPlank(req(sideAt('a', 2.3), offerer({ s: -2 })))).toBe('notOffering');
    expect(checkPlank(req(sideAt('a', 2.3), offerer(), { spot: undefined }))).toBe('noTarget');
    // the same end, too far from the other end, another floor, not on the ground
    expect(checkPlank(req(sideAt('a', -2.0), offerer()))).toBe('far');
    expect(checkPlank(req(sideAt('a', 3.3), offerer()))).toBe('far');
    expect(checkPlank(req(sideAt('a', 2.3, { y: 0.6 }), offerer()))).toBe('far');
    expect(checkPlank(req(sideAt('a', 2.3, { mode: 'air' }), offerer()))).toBe('busy');
    // the host's slack: 0.6 + 0.3 m from the end point
    expect(checkPlank(req(sideAt('a', 1.95 + 0.85), offerer()))).toBeNull();
    // carried already
    const carried = newPlankDevice(SPOT);
    carried.phase = 'carried';
    expect(checkPlank(req(sideAt('a', 2.3), offerer(), { spot: carried }))).toBe('busy');
    // solo: one player can never take both ends
    expect(checkTeamRequest(req(sideAt('b', 2.3), offerer()))).toBe('notMates');
  });

  it('per id: off on the host, refused', () => {
    const k = flags.kitMoves;
    flags.kitMoves = readKitMoves('0');
    try {
      expect(checkPlank(req(sideAt('a', 2.3), offerer()))).toBe('notOffering');
      expect(checkTeamRequest(req(sideAt('a', 2.3), offerer()))).toBe('notOffering');
    } finally {
      flags.kitMoves = k;
    }
  });

  it('the pair row and the device: on its stack, ends at the board length, a put-down keeps where it lies', () => {
    expect(KIT_PAIR.plankBridge).toEqual({ pairS: PLANK.pairS, doneBy: 'a' });
    const d = newPlankDevice(SPOT);
    expect(d.phase).toBe('stack');
    expect(plankGap(d)).toBeCloseTo(LEN, 6);
    expect(d.a.x).toBeCloseTo(-1.95, 6);
    expect(d.b.x).toBeCloseTo(1.95, 6);
    expect(d.a.y).toBeCloseTo(0.16 + PLANK.thick / 2, 6);
    expect(plankEndNear(d, -2.3, 0, PLANK.endReach)).toBe(1);
    expect(plankEndNear(d, 2.3, 0.2, PLANK.endReach)).toBe(2);
    expect(plankEndNear(d, 0, 0, PLANK.endReach)).toBe(0);
    const p = plankPose(d, { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 });
    expect([p.x, p.z, p.pitch]).toEqual([0, 0, -0]);
    expect(p.yaw).toBeCloseTo(Math.PI / 2, 6);
    d.a.y += 1;
    d.b.y += 1;
    putPlankDown(d, 0.5);
    expect([d.phase, d.y]).toEqual(['floor', 0.5]);
    expect(d.a.y).toBeCloseTo(0.5 + PLANK.thick / 2, 6);
  });
});

describe('the carry cap (K5a)', () => {
  const out = { x: 0, z: 0 };
  it('in the band the stick goes as is; at its edge the part along the line stops; across it is kept', () => {
    // the partner at +x (u = (1, 0)); the gap in the band: free
    expect(carryVelocity(-1, 0.5, 1, 0, LEN, LEN, DT, out)).toEqual({ x: -1, z: 0.5 });
    // at the far edge, walking away: the along part is stopped (to the edge), the across part kept
    const hi = LEN + PLANK.band - PLANK.margin;
    carryVelocity(-1, 0.5, 1, 0, hi, LEN, DT, out);
    expect(out.x).toBeCloseTo(0, 6);
    expect(out.z).toBe(0.5);
    // at the near edge, walking in: stopped
    carryVelocity(1, 0, 1, 0, LEN - PLANK.band + PLANK.margin, LEN, DT, out);
    expect(out.x).toBeCloseTo(0, 6);
    // past the band: comes back, at most the carry speed
    carryVelocity(0, 0, 1, 0, LEN + 1, LEN, DT, out);
    expect(out.x).toBe(PLANK.carry);
    carryVelocity(0, 0, 1, 0, LEN + PLANK.band - PLANK.margin + 0.01, LEN, DT, out);
    expect(out.x).toBeGreaterThan(0);
    expect(out.x).toBeLessThan(PLANK.carry);
  });
});

describe('lift, carry 10 m, turn, put down, lift again (K5a, two pages)', () => {
  it('the slower stick leads; the hand gap stays within 0.25 m of the length on both pages', () => {
    const { A, B } = pair();
    const seen = { a: 0, b: 0 };
    // single side first: B's prompt names the move
    steps(A, B, seen, DT);
    expect(B.tm.prompt).toBe('Co-op: take an end of the board (plank bridge)');
    liftUp(A, B, seen);
    expect([dev(A).phase, dev(B).phase]).toEqual(['carried', 'carried']);
    // carry along +x: A (front) on a slow stick, B (behind) on a full one: the pair goes at A's pace
    const run: Run = { gaps: [] };
    const ax0 = A.controller.pos.x;
    const bx0 = B.controller.pos.x;
    A.controller.wishDir.set(0.6, 0, 0);
    B.controller.wishDir.set(1, 0, 0);
    let t = 0;
    while (A.controller.pos.x - ax0 < 10 && t < 30) {
      steps(A, B, seen, DT, {}, run);
      t += DT;
    }
    expect(A.controller.pos.x - ax0).toBeGreaterThanOrEqual(10);
    // A's pace (0.6 x 1.2 m/s), B no faster than A once the gap closed
    expect(t).toBeGreaterThan(10 / (0.6 * PLANK.carry) - 0.2);
    expect(t).toBeLessThan(10 / (0.6 * PLANK.carry) + 0.5);
    expect(Math.abs(B.controller.pos.x - bx0 - (A.controller.pos.x - ax0))).toBeLessThan(2 * PLANK.band + 0.05);
    expectBand(run.gaps);
    expect([A.tm.state, B.tm.state]).toEqual(['plankCarryA', 'plankCarry']);
    // both pages draw the board between the same two bodies: their middles agree within a step's walk
    expect(hyp2(dev(A).x - dev(B).x, dev(A).z - dev(B).z)).toBeLessThan(0.05);
    expect(dev(A).y).toBe(0);
    // facing the walk (A away from B, B toward A)
    expect(A.controller.yaw).toBeCloseTo(Math.PI / 2, 2);
    expect(B.controller.yaw).toBeCloseTo(Math.PI / 2, 2);

    // turn: the leader goes +z, the follower keeps on +x: the board swings round
    const yaw0 = dev(A).yaw;
    A.controller.wishDir.set(0, 0, 1);
    B.controller.wishDir.set(1, 0, 0);
    steps(A, B, seen, 4, {}, run);
    const turned = Math.abs(dev(A).yaw - yaw0);
    expect(turned).toBeGreaterThan(Math.PI / 6);
    expect(Math.abs(dev(B).yaw - dev(A).yaw)).toBeLessThan(0.05);
    expectBand(run.gaps);

    // put down: B lets go (B); the host relays the drop; both lower it over the drop time; it lies on the floor
    A.controller.wishDir.set(0, 0, 0);
    B.controller.wishDir.set(0, 0, 0);
    steps(A, B, seen, DT, { bB: true });
    expect(B.tm.state).toBe('plankDrop');
    expect(A.tm.state).toBe('plankDropA');
    expect(B.ends).toEqual(['drop']);
    expect(A.ends).toEqual([]);
    expect(B.tm.endWhy).toBe('plank: put down');
    steps(A, B, seen, PLANK.dropTime + 0.05);
    expect([A.tm.state, B.tm.state]).toEqual(['none', 'none']);
    for (const p of [A, B]) {
      const d = dev(p);
      expect(d.phase).toBe('floor');
      expect(d.a.y).toBeCloseTo(PLANK.thick / 2, 6);
      expect(d.b.y).toBeCloseTo(PLANK.thick / 2, 6);
      expect(Math.abs(plankGap(d) - LEN)).toBeLessThanOrEqual(PLANK.band);
    }
    expect(hyp2(dev(A).x - dev(B).x, dev(A).z - dev(B).z)).toBeLessThan(0.05);
    expect(Math.abs(dev(A).yaw - dev(B).yaw)).toBeLessThan(0.05);

    // lift it again from where it lies (B still at its end), and carry on
    seen.a = A.ends.length;
    seen.b = B.ends.length;
    liftUp(A, B, seen);
    const run2: Run = { gaps: [] };
    A.controller.wishDir.set(-1, 0, 0);
    B.controller.wishDir.set(-1, 0, 0);
    steps(A, B, seen, 2, {}, run2);
    expectBand(run2.gaps);
    expect([dev(A).phase, dev(B).phase]).toEqual(['carried', 'carried']);
  });

  it('a hit drops it on both pages (the hit page tells the host)', () => {
    const { A, B } = pair();
    const seen = { a: 0, b: 0 };
    liftUp(A, B, seen);
    A.health.hp = 70;
    steps(A, B, seen, DT);
    expect(A.tm.state).toBe('plankDropA');
    expect(A.tm.endWhy).toBe('plank: disturbed');
    expect(A.ends).toEqual(['drop']);
    expect(B.tm.state).toBe('plankDrop');
    steps(A, B, seen, PLANK.dropTime + 0.05);
    expect([A.tm.state, B.tm.state, dev(A).phase, dev(B).phase]).toEqual(['none', 'none', 'floor', 'floor']);
  });

  it('the partner gone (no end reached us): put down after the grace', () => {
    const { A, B } = pair();
    const seen = { a: 0, b: 0 };
    liftUp(A, B, seen);
    // A's page stops hearing B: B's MoveState no longer carries (no relay of any end)
    B.tm.end(true);
    B.ends.length = 0;
    seen.b = 0;
    sync(A, B);
    for (let i = 0; i < Math.round((PLANK.lostGrace + 0.1) / DT); i++) {
      A.tm.fixedUpdate(DT, false, false);
      move(A);
    }
    expect(A.tm.state).toBe('plankDropA');
    expect(A.tm.endWhy).toBe('plank: partner let go');
  });

  it('a restart puts the board back on its stack on both pages and ends the carry', () => {
    const { A, B } = pair();
    const seen = { a: 0, b: 0 };
    liftUp(A, B, seen);
    A.controller.wishDir.set(1, 0, 0);
    B.controller.wishDir.set(1, 0, 0);
    steps(A, B, seen, 3);
    expect(dev(A).x).toBeGreaterThan(2);
    A.events.emit('checkpointRestart', {});
    B.events.emit('checkpointRestart', {});
    expect([A.tm.state, B.tm.state]).toEqual(['none', 'none']);
    steps(A, B, seen, 0.2);
    for (const p of [A, B]) {
      const d = dev(p);
      expect([d.phase, d.x, d.y, d.z, d.yaw]).toEqual(['stack', 0, 0, 0, Math.PI / 2]);
      expect(d.a.y).toBeCloseTo(0.16 + PLANK.thick / 2, 6);
    }
  });

  it('another page draws the board between two mates carrying it, and puts it down when they stop', () => {
    const anchors = {};
    addKitSpot(anchors, SPOT);
    const C = page('pc', 10, 10, anchors, ['pa', 'pb']);
    C.tm.fixedUpdate(DT, false, false);
    const [ma, mb] = C.mates as [TeamMate, TeamMate];
    ma.pos.set(4, 0, 1);
    mb.pos.set(-0.6, 0, 1);
    ma.mode = 'boost';
    mb.mode = 'brace';
    ma.sub = mb.sub = PLANK_SUB;
    ma.s = mb.s = 1;
    C.tm.fixedUpdate(DT, false, false);
    const d = dev(C);
    expect(d.phase).toBe('carried');
    expect(d.a.x).toBeCloseTo(4 - PLANK.hand, 6);
    expect(d.b.x).toBeCloseTo(-0.6 + PLANK.hand, 6);
    expect(d.a.y).toBeCloseTo(PLANK.hip, 6);
    ma.s = mb.s = 0;
    C.tm.fixedUpdate(DT, false, false);
    expect(d.phase).toBe('floor');
    expect(d.a.y).toBeCloseTo(PLANK.thick / 2, 6);
  });
});

describe('offers off (K5a)', () => {
  it('`?kitmoves=0`: no plank prompt, no plank offer, no plank request (the built-in moves are as before)', () => {
    const k = flags.kitMoves;
    flags.kitMoves = readKitMoves('0');
    try {
      const { A, B } = pair();
      const seen = { a: 0, b: 0 };
      steps(A, B, seen, DT);
      expect(String(B.tm.prompt)).not.toContain('plank');
      steps(A, B, seen, DT, { coopB: true });
      expect(B.tm.state.startsWith('plank')).toBe(false);
      steps(A, B, seen, DT);
      expect(String(A.tm.prompt)).not.toContain('plank');
      steps(A, B, seen, DT, { coopA: true });
      expect(A.tm.state.startsWith('plank')).toBe(false);
      expect(A.asked.filter((a) => a[0] === 'plankBridge')).toEqual([]);
      expect(dev(A).phase).toBe('stack');
    } finally {
      flags.kitMoves = k;
    }
  });

  it('single player (no mates): no offer', () => {
    const anchors = {};
    addKitSpot(anchors, SPOT);
    const solo = page('me', -2.3, 0, anchors, []);
    solo.tm.fixedUpdate(DT, true, false);
    expect([solo.tm.state, solo.tm.prompt]).toEqual(['none', null]);
    // the board's device is there all the same (the spot index order matches on every page)
    expect(dev(solo).phase).toBe('stack');
  });

  it('the offer: B lets go; too far from an end there is none', () => {
    const { A, B } = pair();
    const seen = { a: 0, b: 0 };
    steps(A, B, seen, DT, { coopB: true });
    expect([B.tm.state, B.tm.busy, B.tm.wireS]).toEqual(['plankOffer', true, -1]);
    steps(A, B, seen, DT, { bB: true });
    expect(B.tm.state).toBe('none');
    B.controller.pos.set(-3, 0, 0);
    steps(A, B, seen, DT, { coopB: true });
    expect(B.tm.state).toBe('none');
  });
});
