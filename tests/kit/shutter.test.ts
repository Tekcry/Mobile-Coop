// (mission KIT-SHUT) The hold shutter: the host's rule, the device's lift / hold / drop, the holder's and the crawler's
// moves on the team controller (headless, a fake GameState), no crush, solo cannot hold and pass, the world piece's
// pure rules.
import { beforeEach, describe, expect, it } from 'vitest';
import { Vector3 } from '../../src/core/babylon';
import { checkTeamRequest, SHUTTER_SUB, type TeamRequest, type TeamSide } from '../../src/game/teamMoves';
import { kitOfferFree, registerKitMove, unregisterKitMove, type KitMove } from '../../src/game/kit/registry';
import { PULL_UP } from '../../src/game/kit/pullUp';
import { addShutterSpec, canCrawl, crawlLane, holderRelease, LOCAL_USER, newShutterDevice, pushForward, SHUTTER, SHUTTER_MOVE, shutterLift, shutterLocal, shutterNoticePoint, shutterRelease, shutterSpecsOf, shutterVisiblyOpen, stepShutter, underShutter, type ShutterDevice, type ShutterSpec } from '../../src/game/kit/shutter';
import { KIT_POSE_LOCAL, newTeamPoseIn, teamPoseOfState } from '../../src/anim/clips/team';
import { TeamController } from '../../src/game/teamController';
import { BODY_STEP, curtainBodyBottom, curtainBox, placeShutter } from '../../src/world/shutterDoor';
import { LevelBuilder } from '../../src/world/levelBuilder';

const DT = 1 / 60;
const SPEC: ShutterSpec = { id: 'sh1', x: 0, y: 0, z: 0, yaw: 0, width: 3, height: 2.4 };

const side = (id: string, mode: string, extra: Partial<TeamSide> = {}): TeamSide => ({ id, x: 0, y: 0, z: 0, mode, alive: true, ...extra });
const req = (a: TeamSide, b: TeamSide, extra: Partial<TeamRequest> = {}): TeamRequest => ({ kind: 'shutter', a, b, target: -1, targetUp: 0, sinceLast: 9, ...extra });
const holderSide = (s = 0.9): TeamSide => side('h', 'brace', { sub: SHUTTER_SUB, s, z: 0.45 });
const crawlerSide = (extra: Partial<TeamSide> = {}): TeamSide => side('c', 'ground', { crouch: true, x: 1, z: 0.6, ...extra });

/** A fake game with one shutter in its level; `me` the local player, `mate` the partner (net). */
function fakeGame(me: { x: number; z: number }, mate: { x: number; z: number; mode?: string; sub?: number; s?: number }) {
  const anchors = {};
  addShutterSpec(anchors, SPEC);
  const controller = { pos: new Vector3(me.x, 0, me.z), renderPos: new Vector3(), yaw: 0, renderYaw: 0, override: null as unknown, grounded: true, swallowCrouch: false, crouched: false, crouchIntent: false, autoCrouch: false, setCrouchToggle: () => {} };
  const m = { id: 'm', pos: new Vector3(mate.x, 0, mate.z), yaw: 0, mode: mate.mode ?? 'ground', sub: mate.sub ?? 0, s: mate.s ?? 0 };
  const asked: unknown[][] = [];
  const ends: string[] = [];
  const health = { hp: 100 };
  const mates = [m];
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
  };
  const tm = new TeamController(g as never);
  return { g, tm, mate: m, mates, asked, ends, health, controller };
}

function steps(tm: TeamController, seconds: number, coop = false, b = false): void {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) tm.fixedUpdate(DT, coop && i === 0, b && i === 0);
}

const dev = (tm: TeamController): ShutterDevice => tm.devices.get('sh1') as ShutterDevice;

/** The local player lifts and holds the shutter (from its spot), ending in `shutterHold`. */
function liftAndHold(tm: TeamController): void {
  tm.fixedUpdate(DT, true, false);
  expect(tm.state).toBe('shutterOffer');
  steps(tm, SHUTTER.grip + 0.05);
  expect(tm.state).toBe('shutterLift');
  steps(tm, SHUTTER.liftTime + 0.05);
  expect(tm.state).toBe('shutterHold');
}

beforeEach(() => {
  registerKitMove(SHUTTER_MOVE);
  KIT_POSE_LOCAL.k = -1;
  KIT_POSE_LOCAL.gap = NaN;
});

describe('host rule (KIT-SHUT)', () => {
  it('the crawl is allowed with the holder braced with the shutter bit, the gap held, the partner crouched in reach', () => {
    expect(checkTeamRequest(req(crawlerSide(), holderSide()))).toBeNull();
    expect(checkTeamRequest(req(crawlerSide(), side('h', 'brace', { sub: 0, s: 0.9 })))).toBe('notOffering');
    expect(checkTeamRequest(req(crawlerSide(), side('h', 'ground', { sub: SHUTTER_SUB, s: 0.9 })))).toBe('notOffering');
    expect(checkTeamRequest(req(crawlerSide(), holderSide(0.5)))).toBe('notBraced');
    expect(checkTeamRequest(req(crawlerSide(), holderSide(0)))).toBe('notBraced');
    expect(checkTeamRequest(req(crawlerSide({ crouch: false }), holderSide()))).toBe('tooHigh');
    expect(checkTeamRequest(req(crawlerSide({ crouch: undefined }), holderSide()))).toBe('tooHigh');
    expect(checkTeamRequest(req(crawlerSide({ mode: 'air' }), holderSide()))).toBe('busy');
    expect(checkTeamRequest(req(crawlerSide({ x: 3 }), holderSide()))).toBe('far');
    expect(checkTeamRequest(req(crawlerSide({ y: 1 }), holderSide()))).toBe('far');
    // the shared checks first
    expect(checkTeamRequest(req(crawlerSide(), holderSide(), { sinceLast: 0 }))).toBe('rate');
    expect(checkTeamRequest(req(crawlerSide({ alive: false }), holderSide()))).toBe('dead');
  });

  it('solo: one player can never be both the holder and the crawler', () => {
    expect(checkTeamRequest(req(crawlerSide({ id: 'h' }), holderSide()))).toBe('notMates');
  });
});

describe('device: lift / hold / drop (KIT-SHUT)', () => {
  it('lifts to the hold gap in liftTime, holds, drops shut in dropTime; guards see it past the doors line', () => {
    const d = newShutterDevice(SPEC);
    expect([d.phase, d.open, d.holdGap, d.reach]).toEqual(['closed', 0, SHUTTER.holdGap, SPEC.width / 2 + SHUTTER.useReach]);
    expect(shutterRelease(d)).toBe(false);
    expect(shutterLift(d)).toBe(true);
    expect(shutterLift(d)).toBe(false);
    for (let t = 0; t < SHUTTER.liftTime / 2 - 1e-9; t += DT) stepShutter(d, DT, 0);
    expect(d.open).toBeCloseTo(SHUTTER.holdGap / 2, 1);
    expect(d.phase).toBe('lifting');
    expect(shutterVisiblyOpen(d)).toBe(true);
    expect(d.opens).toBe(1);
    for (let t = 0; t < SHUTTER.liftTime / 2 + 0.05; t += DT) stepShutter(d, DT, 0);
    expect([d.phase, d.open]).toEqual(['held', SHUTTER.holdGap]);
    stepShutter(d, 5, 0);
    expect(d.open).toBe(SHUTTER.holdGap);
    expect(shutterNoticePoint(d, { x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: SHUTTER.holdGap / 2, z: 0 });
    expect(shutterRelease(d)).toBe(true);
    for (let t = 0; t < SHUTTER.dropTime - 0.05; t += DT) stepShutter(d, DT, 0);
    expect(d.phase).toBe('dropping');
    expect(d.open).toBeGreaterThan(0);
    for (let t = 0; t < 0.1; t += DT) stepShutter(d, DT, 0);
    expect([d.phase, d.open, d.visible, d.openFor]).toEqual(['closed', 0, false, 0]);
    // a second opening is a new one for the guards
    shutterLift(d);
    for (let t = 0; t < 0.5; t += DT) stepShutter(d, DT, 0);
    expect(d.opens).toBe(2);
  });

  it('the bar caught on its way down lifts again from where it is', () => {
    const d = newShutterDevice(SPEC);
    shutterLift(d);
    stepShutter(d, SHUTTER.liftTime, 0);
    shutterRelease(d);
    stepShutter(d, SHUTTER.dropTime / 2, 0);
    const mid = d.open;
    expect(mid).toBeCloseTo(SHUTTER.holdGap / 2, 5);
    expect(shutterLift(d)).toBe(true);
    stepShutter(d, DT, 0);
    expect(d.open).toBeGreaterThan(mid);
  });

  it('no crush: the curtain stops at the crawler\'s back over anyone under it, then shuts when clear', () => {
    const d = newShutterDevice(SPEC);
    shutterLift(d);
    stepShutter(d, SHUTTER.liftTime, 0);
    shutterRelease(d);
    for (let i = 0; i < 120; i++) stepShutter(d, DT, SHUTTER.crawlBody);
    expect(d.phase).toBe('dropping');
    expect(d.open).toBeCloseTo(SHUTTER.crawlBody, 5);
    for (let i = 0; i < 60; i++) stepShutter(d, DT, 0);
    expect(d.phase).toBe('closed');
  });

  it('the release rule, the crawl rule, the lane beside the holder and the push side', () => {
    expect(holderRelease(false, false, false)).toBe('hold');
    expect(holderRelease(true, false, false)).toBe('drop');
    expect(holderRelease(true, false, true)).toBe('wait');
    expect(holderRelease(false, true, true)).toBe('drop');
    expect(canCrawl(SHUTTER.holdGap, true)).toBe(true);
    expect(canCrawl(SHUTTER.holdGap, false)).toBe(false);
    expect(canCrawl(0.5, true)).toBe(false);
    const d = newShutterDevice(SPEC);
    expect(crawlLane(d, 0, 1)).toBe(1);
    expect(crawlLane(d, 0, 0.2)).toBeCloseTo(SHUTTER.laneMin);
    expect(crawlLane(d, 0, -0.1)).toBeCloseTo(-SHUTTER.laneMin);
    expect(crawlLane(d, 1.15, 1.15)).toBeCloseTo(1.15 - SHUTTER.laneMin);
    expect(crawlLane(newShutterDevice({ ...SPEC, width: 1 }), 0, 0.3)).toBeNaN();
    expect(pushForward(1, 0.2)).toBe(false);
    expect(pushForward(1, -0.1)).toBe(true);
    expect(pushForward(-1, 0.1)).toBe(true);
    const l = shutterLocal({ x: 1, z: 2, yaw: Math.PI / 2 }, 2, 1, { across: 0, along: 0 });
    expect(l.across).toBeCloseTo(1);
    expect(l.along).toBeCloseTo(1);
  });
});

describe('the holder (KIT-SHUT)', () => {
  it('lift, hold and let go: the states, their timings, the wire and the pose gap', () => {
    const { tm, asked } = fakeGame({ x: 0, z: SHUTTER.holdSpot }, { x: 6, z: 3 });
    tm.fixedUpdate(DT, false, false);
    expect(tm.devices.list).toHaveLength(1);
    expect(tm.prompt).toBe('Lift the shutter: Co-op');
    expect(tm.state).toBe('none');
    tm.fixedUpdate(DT, true, false);
    expect(tm.state).toBe('shutterOffer');
    // (KIT-TICK) the grip pins the holder to the bar: busy (weapons and interact off)
    expect([tm.busy, tm.mode, tm.wireSub, tm.wireS]).toEqual([true, 'brace', SHUTTER_SUB, 0]);
    expect(dev(tm).user).toBe(LOCAL_USER);
    steps(tm, SHUTTER.grip - 0.1);
    expect(tm.state).toBe('shutterOffer');
    steps(tm, 0.15);
    expect(tm.state).toBe('shutterLift');
    expect(tm.busy).toBe(true);
    steps(tm, SHUTTER.liftTime / 2);
    expect(KIT_POSE_LOCAL.k).toBeGreaterThan(0.4);
    expect(KIT_POSE_LOCAL.k).toBeLessThan(0.6);
    expect(tm.wireS).toBeCloseTo(SHUTTER.holdGap / 2, 1);
    steps(tm, SHUTTER.liftTime / 2 + 0.05);
    expect(tm.state).toBe('shutterHold');
    expect(tm.wireS).toBe(SHUTTER.holdGap);
    expect(KIT_POSE_LOCAL.gap).toBe(SHUTTER.holdGap);
    const i = teamPoseOfState(tm.state, tm.partT, newTeamPoseIn());
    expect([i.move, i.role, i.k, i.gap]).toEqual(['shutter', 'b', 1, SHUTTER.holdGap]);
    // the hold is a loop: it stays open
    steps(tm, 5);
    expect([tm.state, dev(tm).open]).toEqual(['shutterHold', SHUTTER.holdGap]);
    // Co-op lets go (no partner): the drop, then free; the device shuts
    tm.fixedUpdate(DT, true, false);
    expect(tm.state).toBe('shutterDrop');
    expect(dev(tm).phase).toBe('dropping');
    steps(tm, SHUTTER.dropTime + 0.05);
    expect(tm.state).toBe('none');
    steps(tm, 0.2);
    expect([dev(tm).phase, dev(tm).open, dev(tm).user]).toEqual(['closed', 0, '']);
    expect(asked).toEqual([]);
  });

  it('B during the grip lets go before anything lifts; too far from the shutter there is no lift', () => {
    const { tm } = fakeGame({ x: 0, z: SHUTTER.holdSpot }, { x: 6, z: 3 });
    tm.fixedUpdate(DT, true, false);
    tm.fixedUpdate(DT, false, true);
    expect(tm.state).toBe('none');
    expect(dev(tm).phase).toBe('closed');
    const far = fakeGame({ x: 0, z: 1.6 }, { x: 6, z: 3 });
    far.tm.fixedUpdate(DT, true, false);
    expect(far.tm.state).not.toBe('shutterOffer');
  });

  it('solo: the holder pressing Co-op lets go, never crawls; nobody else offers the crawl', () => {
    const { tm, asked } = fakeGame({ x: 0, z: SHUTTER.holdSpot }, { x: 6, z: 3 });
    liftAndHold(tm);
    tm.fixedUpdate(DT, true, false);
    expect(tm.state).toBe('shutterDrop');
    steps(tm, 1);
    expect(tm.state).toBe('none');
    expect(asked).toEqual([]);
  });

  it('no crush: a let-go while the partner crawls under waits, then drops once they are through', () => {
    const { tm, mate, ends } = fakeGame({ x: 0, z: SHUTTER.holdSpot }, { x: 1, z: 0.6 });
    liftAndHold(tm);
    tm.begin({ kind: 'shutter', a: 'm', b: 'me', target: -1, s: 0 }, 'me');
    expect([tm.state, tm.partner]).toEqual(['shutterHold', 'm']);
    mate.mode = 'boost';
    mate.sub = SHUTTER_SUB;
    mate.pos.set(1, 0, 0);
    tm.fixedUpdate(DT, true, false);
    expect(tm.state).toBe('shutterHold');
    expect(tm.prompt).toBe('Partner under the shutter: holding');
    steps(tm, 1);
    expect([tm.state, dev(tm).open]).toEqual(['shutterHold', SHUTTER.holdGap]);
    // through: the host's 'pull' end; the queued release drops
    mate.mode = 'ground';
    mate.sub = 0;
    mate.pos.set(1, 0, -SHUTTER.crawlOut);
    tm.ended('pull');
    tm.fixedUpdate(DT, false, false);
    expect(tm.state).toBe('shutterDrop');
    expect(ends).toEqual([]);
  });

  it('disturbed (hurt) drops at once with the drop end; the curtain rests over the crawler until they are clear', () => {
    const { tm, mate, ends, health } = fakeGame({ x: 0, z: SHUTTER.holdSpot }, { x: 1, z: 0.6 });
    liftAndHold(tm);
    tm.begin({ kind: 'shutter', a: 'm', b: 'me', target: -1, s: 0 }, 'me');
    mate.mode = 'boost';
    mate.sub = SHUTTER_SUB;
    mate.pos.set(1, 0, 0);
    health.hp = 80;
    tm.fixedUpdate(DT, false, false);
    expect(tm.state).toBe('shutterDrop');
    expect(tm.endWhy).toBe('shutter: disturbed');
    expect(ends).toEqual(['drop']);
    steps(tm, 2);
    expect(tm.state).toBe('none');
    expect(dev(tm).phase).toBe('dropping');
    expect(dev(tm).open).toBeCloseTo(SHUTTER.crawlBody, 5);
    mate.mode = 'ground';
    mate.sub = 0;
    mate.pos.set(1, 0, 0.7);
    steps(tm, 1);
    expect(dev(tm).phase).toBe('closed');
  });

  it('shoved off the bar is a forced release', () => {
    const { tm, controller } = fakeGame({ x: 0, z: SHUTTER.holdSpot }, { x: 6, z: 3 });
    liftAndHold(tm);
    controller.pos.set(0, 0, 1.5);
    tm.fixedUpdate(DT, false, false);
    expect(tm.state).toBe('shutterDrop');
    expect(tm.endWhy).toBe('shutter: disturbed');
  });
});

describe('the crawler (KIT-SHUT)', () => {
  const holding = { x: 0, z: SHUTTER.holdSpot, mode: 'brace', sub: SHUTTER_SUB, s: SHUTTER.holdGap };

  it('only crouched and only while held open; the press asks the host', () => {
    const { tm, asked, controller, mate } = fakeGame({ x: 1, z: 0.6 }, holding);
    tm.fixedUpdate(DT, true, false);
    expect(tm.prompt).toBe('Crouch to crawl under the shutter');
    expect(asked).toEqual([]);
    // the remote holder's gap is followed on this page
    expect([dev(tm).open, dev(tm).user, dev(tm).phase]).toEqual([SHUTTER.holdGap, 'm', 'held']);
    controller.crouched = true;
    mate.s = 0.5;
    tm.fixedUpdate(DT, true, false);
    expect(tm.prompt).toBe('Wait for the shutter to open');
    expect(asked).toEqual([]);
    mate.s = SHUTTER.holdGap;
    tm.fixedUpdate(DT, false, false);
    expect(tm.prompt).toBe('Crawl under: Co-op');
    tm.fixedUpdate(DT, true, false);
    expect(asked).toHaveLength(1);
    expect(asked[0]!.slice(0, 5)).toEqual(['shutter', 'm', -1, 0, 0]);
    expect(tm.partner).toBe('m');
    // no second request while the first waits
    tm.fixedUpdate(DT, true, false);
    expect(asked).toHaveLength(1);
  });

  it('the crawl: under to the far side in crawlTime (kinematic, crouched), then the through end', () => {
    const { tm, ends, controller } = fakeGame({ x: 1, z: 0.6 }, holding);
    controller.crouched = true;
    tm.fixedUpdate(DT, false, false);
    tm.begin({ kind: 'shutter', a: 'me', b: 'm', target: -1, s: 0 }, 'me');
    expect([tm.state, tm.mode, tm.wireSub, tm.wireS, tm.busy]).toEqual(['crawlUnder', 'boost', SHUTTER_SUB, 0, true]);
    const ov = controller.override as { kinematic: Vector3; crouch: boolean };
    expect(ov.crouch).toBe(true);
    steps(tm, SHUTTER.crawlTime / 2);
    expect(ov.kinematic.z).toBeLessThan(0.6);
    expect(KIT_POSE_LOCAL.k).toBeCloseTo(0.5, 1);
    expect(tm.state).toBe('crawlUnder');
    steps(tm, SHUTTER.crawlTime / 2 + 0.05);
    expect(tm.state).toBe('none');
    expect(ov.kinematic.x).toBeCloseTo(1);
    expect(ov.kinematic.z).toBeCloseTo(-SHUTTER.crawlOut);
    expect(ends).toEqual(['pull']);
  });

  it('the holder lets go mid-crawl: pushed clear to the nearer side (back before the plane, through past it)', () => {
    const early = fakeGame({ x: 1, z: 0.6 }, holding);
    early.controller.crouched = true;
    early.tm.fixedUpdate(DT, false, false);
    early.tm.begin({ kind: 'shutter', a: 'me', b: 'm', target: -1, s: 0 }, 'me');
    steps(early.tm, 0.2);
    early.controller.pos.copyFrom((early.controller.override as { kinematic: Vector3 }).kinematic);
    early.mate.s = 0.4;
    steps(early.tm, SHUTTER.lostGrace + SHUTTER.pushTime + 0.1);
    expect(early.tm.state).toBe('none');
    expect(early.tm.endWhy).toBe('shutter: pushed clear');
    expect((early.controller.override as unknown) ?? null).toBeNull();
    expect(early.ends).toEqual(['drop']);

    const late = fakeGame({ x: 1, z: 0.6 }, holding);
    late.controller.crouched = true;
    late.tm.fixedUpdate(DT, false, false);
    late.tm.begin({ kind: 'shutter', a: 'me', b: 'm', target: -1, s: 0 }, 'me');
    steps(late.tm, SHUTTER.crawlTime * 0.7);
    const kin = (late.controller.override as { kinematic: Vector3 }).kinematic;
    late.controller.pos.copyFrom(kin);
    late.tm.ended('drop');
    expect(late.tm.state).toBe('crawlUnder');
    steps(late.tm, SHUTTER.pushTime + 0.05);
    expect(late.tm.state).toBe('none');
    expect(kin.z).toBeCloseTo(-SHUTTER.crawlOut);
    // the holder's own drop end already told the host
    expect(late.ends).toEqual([]);
  });
});

describe('per-tick upkeep and polish (KIT-TICK)', () => {
  const holding = { x: 0, z: SHUTTER.holdSpot, mode: 'brace', sub: SHUTTER_SUB, s: SHUTTER.holdGap };

  it('a mate\'s shutter still drops on this page while another kit move claims the idle press', () => {
    // a pull-up that always claims the idle press, registered ahead of the shutter (the glob's order)
    const claim: KitMove = {
      kind: 'pull',
      newRun: () => ({}),
      check: () => null,
      idle(h) {
        h.prompt = 'pull here';
        return false;
      },
      begin() {},
      step() {},
    };
    unregisterKitMove('shutter');
    unregisterKitMove('pull');
    registerKitMove(claim);
    registerKitMove(SHUTTER_MOVE);
    try {
      const { tm, mate } = fakeGame({ x: 1, z: 0.6 }, holding);
      tm.fixedUpdate(DT, false, false);
      expect(tm.prompt).toBe('pull here');
      expect([dev(tm).open, dev(tm).user, dev(tm).phase]).toEqual([SHUTTER.holdGap, 'm', 'held']);
      // the holder lets go: no shutter MoveState any more
      mate.mode = 'ground';
      mate.sub = 0;
      tm.fixedUpdate(DT, false, false);
      expect([dev(tm).user, dev(tm).phase]).toEqual(['', 'dropping']);
      steps(tm, SHUTTER.dropTime + 0.05);
      expect([dev(tm).phase, dev(tm).open]).toEqual(['closed', 0]);
    } finally {
      unregisterKitMove('pull');
      registerKitMove(PULL_UP);
    }
  });

  it('the holder disconnects mid-hold (no mates): the shutter drops; and while this page\'s player is dead', () => {
    const gone = fakeGame({ x: 1, z: 0.6 }, holding);
    gone.tm.fixedUpdate(DT, false, false);
    expect([dev(gone.tm).user, dev(gone.tm).phase]).toEqual(['m', 'held']);
    gone.mates.length = 0;
    steps(gone.tm, SHUTTER.dropTime + 0.05);
    expect([dev(gone.tm).user, dev(gone.tm).phase, dev(gone.tm).open]).toEqual(['', 'closed', 0]);

    const dead = fakeGame({ x: 1, z: 0.6 }, holding);
    dead.tm.fixedUpdate(DT, false, false);
    expect(dev(dead.tm).phase).toBe('held');
    (dead.g.player as { alive: boolean }).alive = false;
    dead.mate.mode = 'ground';
    dead.mate.sub = 0;
    steps(dead.tm, SHUTTER.dropTime + 0.05);
    expect([dev(dead.tm).user, dev(dead.tm).phase]).toEqual(['', 'closed']);
  });

  it('the local holder dies mid-hold: the shutter drops on this page', () => {
    const { g, tm } = fakeGame({ x: 0, z: SHUTTER.holdSpot }, { x: 6, z: 3 });
    liftAndHold(tm);
    (g.player as { alive: boolean }).alive = false;
    steps(tm, SHUTTER.dropTime + 0.1);
    expect(tm.state).toBe('none');
    expect([dev(tm).user, dev(tm).phase, dev(tm).open]).toEqual(['', 'closed', 0]);
  });

  it('(POL1) the crawl request times out in tick, also while another move claims the idle press', () => {
    const claim: KitMove = {
      kind: 'pull',
      newRun: () => ({}),
      check: () => null,
      idle(h) {
        h.prompt = 'pull here';
        return false;
      },
      begin() {},
      step() {},
    };
    try {
      const { tm, asked, controller } = fakeGame({ x: 1, z: 0.6 }, holding);
      controller.crouched = true;
      tm.fixedUpdate(DT, true, false);
      expect(asked).toHaveLength(1);
      // the host never answers; a pull-up claims every idle press for longer than askWait
      unregisterKitMove('shutter');
      unregisterKitMove('pull');
      registerKitMove(claim);
      registerKitMove(SHUTTER_MOVE);
      steps(tm, SHUTTER.askWait + 0.1);
      expect(tm.prompt).toBe('pull here');
      unregisterKitMove('pull');
      // the request already lapsed: the next press asks again at once
      tm.fixedUpdate(DT, true, false);
      expect(asked).toHaveLength(2);
    } finally {
      unregisterKitMove('pull');
      registerKitMove(PULL_UP);
    }
  });

  it('underZone 0.3: a partner standing against the curtain is not under it', () => {
    expect(SHUTTER.underZone).toBe(0.3);
    const d = newShutterDevice(SPEC);
    const loc = { across: 0, along: 0 };
    expect(underShutter(d, 0, 0.25, loc)).toBe(true);
    expect(underShutter(d, 0.5, -0.29, loc)).toBe(true);
    expect(underShutter(d, 0, 0.35, loc)).toBe(false);
    expect(underShutter(d, 0, -0.35, loc)).toBe(false);
    expect(underShutter(d, SPEC.width / 2 + 0.1, 0, loc)).toBe(false);
  });

  it('shutterOffer (the grip) is busy; the pull-up\'s offer stays free', () => {
    expect(SHUTTER_MOVE.busyOffer).toBe(true);
    expect(kitOfferFree('shutterOffer')).toBe(false);
    expect(kitOfferFree('pullOffer')).toBe(true);
    const { tm } = fakeGame({ x: 0, z: SHUTTER.holdSpot }, { x: 6, z: 3 });
    tm.fixedUpdate(DT, true, false);
    expect(tm.state).toBe('shutterOffer');
    expect([tm.active, tm.busy]).toEqual([true, true]);
  });
});

describe('world piece (KIT-SHUT)', () => {
  it('the curtain body: shut below the guards\' line, else from the gap in steps; the drawn curtain from the gap up', () => {
    expect(curtainBodyBottom(0, 0.9)).toBe(0);
    expect(curtainBodyBottom(0.1, 0.9)).toBe(0);
    expect(curtainBodyBottom(0.3, 0.9)).toBeCloseTo(0.3);
    expect(curtainBodyBottom(0.9, 0.9)).toBeCloseTo(0.9);
    expect(curtainBodyBottom(0.89, 0.9)).toBeCloseTo(0.9 - BODY_STEP);
    // nobody fits under the held gap upright or crouched (only the crawl)
    expect(curtainBodyBottom(SHUTTER.holdGap, SHUTTER.holdGap)).toBeLessThan(1.15);
    expect(curtainBox(SPEC, 0, { y: 0, h: 0 })).toEqual({ y: 1.2, h: 2.4 });
    const b = curtainBox(SPEC, 0.9, { y: 0, h: 0 });
    expect(b.h).toBeCloseTo(1.5);
    expect(b.y).toBeCloseTo(1.65);
  });

  it('placeShutter adds the frame boxes and the spec the devices are set up from', () => {
    const lb = new LevelBuilder();
    const n = lb.boxes.length;
    placeShutter(lb, { ...SPEC, id: 'sh2', x: 4 });
    expect(lb.boxes.length - n).toBe(3);
    expect(shutterSpecsOf({ anchors: lb.anchors }).map((s) => s.id)).toEqual(['sh2']);
    expect(shutterSpecsOf({})).toEqual([]);
    expect(shutterSpecsOf(null)).toEqual([]);
  });
});
