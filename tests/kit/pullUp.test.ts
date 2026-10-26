// (mission KIT-PULL) The pull-up: the band and its sources, the host rule, the catch window, both sides' phases on the
// team clock, the missed catch and the cancels. Headless: a fake GameState with one lip (a top at `H` for x < 0.5, the
// ground at 0, the wall face at x = 0.5) and the real TeamController.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from '../../src/core/babylon';
import { LEAP, TEAM, WALL_JUMP } from '../../src/config/movement';
import { REACH } from '../../src/world/anchors';
import { checkTeamRequest, PULL_SUB, ropeTopY, type TeamRequest, type TeamSide } from '../../src/game/teamMoves';
import { kitMove, registerKitMove, type KitHost } from '../../src/game/kit/registry';
import { checkPullRequest, PULL, PULL_UP, pullBand, pullCatchAt, pullJumpY, pullMissLanding, pullVerdict, type PullRun } from '../../src/game/kit/pullUp';
import { TeamController } from '../../src/game/teamController';
import { KIT_POSE_LOCAL } from '../../src/anim/clips/team';
import { flags } from '../../src/core/flags';

// (mission-framework FLG) the kit is dark behind `flags.coopKit` (`?coopkit=1`): these tests drive its offers
const coopKit0 = flags.coopKit;
beforeAll(() => void (flags.coopKit = true));
afterAll(() => void (flags.coopKit = coopKit0));

const H = 4.4;
const EDGE_X = 0.5;
const DT = 1 / 60;

/** A ray against the lip: the top (y = h, x < 0.5), the ground (y = 0) and the wall face (x = 0.5, 0..h). */
function lipRay(h: number) {
  return (a: Vector3, b: Vector3) => {
    let best = Infinity;
    let nx = 0;
    let ny = 0;
    const dy = b.y - a.y;
    const dx = b.x - a.x;
    const at = (t: number) => ({ x: a.x + dx * t, y: a.y + dy * t, z: a.z + (b.z - a.z) * t });
    for (const [py, top] of [[h, true], [0, false]] as const) {
      if (dy === 0 || (a.y - py) * (b.y - py) > 0) continue;
      const t = (py - a.y) / dy;
      if (t < 0 || t > 1) continue;
      if (top && at(t).x >= EDGE_X) continue;
      if (t < best) {
        best = t;
        nx = 0;
        ny = 1;
      }
    }
    if (dx !== 0 && (a.x - EDGE_X) * (b.x - EDGE_X) <= 0) {
      const t = (EDGE_X - a.x) / dx;
      const p = at(t);
      if (t >= 0 && t <= 1 && p.y >= 0 && p.y <= h && t < best) {
        best = t;
        nx = 1;
        ny = 0;
      }
    }
    const len = Vector3.Distance(a, b);
    if (best === Infinity) return { hit: false, distance: 0, point: new Vector3(), normal: new Vector3() };
    const p = at(best);
    return { hit: true, distance: best * len, point: new Vector3(p.x, p.y, p.z), normal: new Vector3(nx, ny, 0) };
  };
}

/** `self` at `at`, one mate; the net hook records requests and verdicts. */
function fakeGame(at: [number, number, number], yaw: number, mateAt: [number, number, number], mateYaw = 0, h = H) {
  let crouchToggles = 0;
  const controller = {
    pos: new Vector3(...at),
    yaw,
    override: null as null | { kinematic?: Vector3 },
    grounded: true,
    swallowCrouch: false,
    crouched: false,
    crouchIntent: false,
    autoCrouch: false,
    setCrouchToggle: () => crouchToggles++,
    standUp: () => {},
  };
  const mate = { id: 'm', pos: new Vector3(...mateAt), yaw: mateYaw, mode: 'ground', sub: 0 };
  const asked: unknown[][] = [];
  const ends: string[] = [];
  let mates = [mate];
  const g = {
    player: { alive: true, controller, pose: { traverse: 'none', traverseT: 0, tumble: 0 } },
    net: { teamMates: () => mates, teamRequest: (...a: unknown[]) => asked.push(a), teamHangEnd: (k: string) => ends.push(k) },
    app: { toasts: { show: () => {} } },
    traversal: { attached: false, committed: null, attach: { kind: 'none', phase: 'off' } },
    takedown: { active: null },
    strike: { active: false },
    ballistics: { ray: lipRay(h) },
    world: { level: {} },
  };
  const tm = new TeamController(g as never);
  /** Fixed steps, the kinematic override moving the body (as the controller does; a move's last target too). */
  let last: Vector3 | null = null;
  const tick = (n: number, coop = false, b = false): void => {
    for (let i = 0; i < n; i++) {
      tm.fixedUpdate(DT, coop && i === 0, b && i === 0);
      const k = controller.override?.kinematic ?? last;
      if (k) controller.pos.copyFrom(k);
      last = controller.override?.kinematic ?? null;
    }
  };
  const run = (): PullRun => (tm as unknown as { kitRuns: Map<string, PullRun> }).kitRuns.get('pull')!;
  return { g, tm, controller, mate, asked, ends, tick, run, crouchToggles: () => crouchToggles, leave: () => (mates = []) };
}

/** The holder at the top (facing the drop, +x), crouched, the partner below past the wall. */
function holderGame(h = H) {
  const f = fakeGame([0, h, 0], Math.PI / 2, [1.2, 0, 0], 0, h);
  f.controller.crouched = f.controller.crouchIntent = true;
  return f;
}

/** The partner below; the holder above at the edge offering (braced with `PULL_SUB`). */
function partnerGame(at: [number, number, number] = [1.2, 0, 0], h = H) {
  const f = fakeGame(at, -Math.PI / 2, [0, h, 0], Math.PI / 2, h);
  f.mate.mode = 'brace';
  f.mate.sub = PULL_SUB;
  return f;
}

const side = (id: string, mode: string, x: number, y: number, sub = 0): TeamSide => ({ id, x, y, z: 0, mode, alive: true, sub });
const pullReq = (a: TeamSide, b: TeamSide, land: TeamRequest['land'] = { x: 0.85, y: b.y, z: 0 }, extra: Partial<TeamRequest> = {}): TeamRequest => ({
  kind: 'pull',
  a,
  b,
  target: -1,
  targetUp: 0,
  sinceLast: 9,
  land,
  ...extra,
});

beforeEach(() => {
  registerKitMove(PULL_UP);
  KIT_POSE_LOCAL.k = -1;
});

describe('pull-up numbers (KIT-PULL)', () => {
  it('registers itself (the team controller glob loads this file)', () => {
    expect(kitMove('pull')).toBe(PULL_UP);
  });

  it('the band: past a solo climb (wall jump + 0.5), inside a jump grab + the catch; timings from the game', () => {
    expect(PULL.min).toBeCloseTo(WALL_JUMP.maxUp + 0.5);
    expect(PULL.min).toBeCloseTo(4.3);
    expect(PULL.max).toBe(TEAM.boostMax);
    expect(PULL.min).toBeGreaterThan(REACH.grabMax);
    expect(PULL.jumpReach + PULL.catchDrop).toBeCloseTo(PULL.max);
    expect(PULL.catchDrop).toBeCloseTo(1.8);
    expect(PULL.reach).toBe(TEAM.relayReach);
    expect(PULL.jumpRise).toBeCloseTo((LEAP.vy * LEAP.vy) / 36, 5);
    expect(PULL.apexT).toBeCloseTo(0.311, 3);
    expect(PULL.landT).toBeCloseTo(0.622, 3);
    expect(PULL.catchOpen).toBeCloseTo(0.182, 3);
    expect(PULL.catchClose).toBeCloseTo(0.44, 3);
    expect(PULL.haul).toBe(TEAM.hangPull);
    expect(PULL.scramble).toBe(TEAM.ropeTop);
    for (const [up, b] of [[REACH.grabMax, 'low'], [WALL_JUMP.maxUp, 'low'], [4.29, 'low'], [4.3, 'ok'], [4.4, 'ok'], [4.5, 'ok'], [4.51, 'high'], [6, 'high']] as const) expect(pullBand(up)).toBe(b);
  });

  it('the jump arc, the catch window (the feet within catchBand of the apex) and the host verdict', () => {
    expect(pullJumpY(0)).toBe(0);
    expect(pullJumpY(PULL.apexT)).toBeCloseTo(PULL.jumpRise, 5);
    expect(pullJumpY(PULL.landT)).toBe(0);
    expect(PULL.jumpRise - pullJumpY(PULL.catchOpen)).toBeCloseTo(PULL.catchBand, 5);
    expect(PULL.jumpRise - pullJumpY(PULL.catchClose)).toBeCloseTo(PULL.catchBand, 5);
    expect(pullCatchAt(0.1)).toBe('early');
    expect(pullCatchAt(PULL.catchOpen)).toBe('open');
    expect(pullCatchAt(PULL.apexT)).toBe('open');
    expect(pullCatchAt(PULL.catchClose)).toBe('open');
    expect(pullCatchAt(PULL.catchClose + 0.01)).toBe('late');
    expect(pullVerdict(PULL.apexT, 'pull')).toBe('pull');
    expect(pullVerdict(0.1, 'pull')).toBe('drop');
    expect(pullVerdict(PULL.catchClose + 0.05, 'pull')).toBe('drop');
    expect(pullVerdict(PULL.catchClose + 0.05, 'pull', 0.1)).toBe('pull');
    expect(pullVerdict(PULL.apexT, 'drop')).toBe('drop');
    // a missed catch falls only the jump's own rise: crouched, no harm
    expect(pullMissLanding()).toEqual({ crouch: true, harm: false });
  });
});

describe('the host rule (KIT-PULL)', () => {
  const b = side('b', 'brace', 0, H, PULL_SUB);
  const a = side('a', 'ground', 1.2, 0);

  it('valid: the holder offers, the partner on the ground below in the band and under the catch point', () => {
    expect(checkPullRequest(pullReq(a, b))).toBeNull();
    // through the shared checks too (registered)
    expect(checkTeamRequest(pullReq(a, b))).toBeNull();
    expect(checkTeamRequest(pullReq(a, b, undefined, { sinceLast: 0 }))).toBe('rate');
  });

  it('invalid: not offering, airborne, too low (a solo climb), too high, out of reach, no / a far catch point', () => {
    expect(checkPullRequest(pullReq(a, side('b', 'brace', 0, H)))).toBe('notOffering');
    expect(checkPullRequest(pullReq(a, side('b', 'ground', 0, H, PULL_SUB)))).toBe('notOffering');
    expect(checkPullRequest(pullReq(side('a', 'air', 1.2, 0), b))).toBe('busy');
    const low = side('b', 'brace', 0, 3.8, PULL_SUB);
    expect(checkPullRequest(pullReq(a, low))).toBe('noTarget');
    const high = side('b', 'brace', 0, 4.8, PULL_SUB);
    expect(checkPullRequest(pullReq(a, high))).toBe('tooHigh');
    expect(checkPullRequest(pullReq(side('a', 'ground', 2.6, 0), b))).toBe('far');
    expect(checkPullRequest(pullReq(a, b, undefined, { land: undefined }))).toBe('noTarget');
    expect(checkPullRequest(pullReq(a, b, { x: 3, y: H, z: 0 }))).toBe('noTarget');
    expect(checkPullRequest(pullReq(a, b, { x: 0.85, y: 0, z: 0 }))).toBe('noTarget');
  });
});

describe('the holder (KIT-PULL)', () => {
  it('offers crouched at the edge with the partner below: brace + PULL_SUB, not busy', () => {
    const f = holderGame();
    f.tick(1);
    expect(f.tm.prompt).toContain('pull-up');
    f.tick(1, true);
    expect([f.tm.state, f.tm.mode, f.tm.wireSub, f.tm.busy]).toEqual(['pullOffer', 'brace', PULL_SUB, false]);
    expect([f.run().cx, f.run().cz, f.run().edgeY, f.run().floorY]).toEqual([expect.closeTo(0.85, 5), expect.closeTo(0, 5), H, 0]);
    expect(KIT_POSE_LOCAL.k).toBe(-1);
  });

  it('(wharf fix) a 4.5 m lip, the band top, with both feet resting 0.02 m over their floors: the pull-up offer', () => {
    const f = fakeGame([0, 4.52, 0], Math.PI / 2, [1.2, 0.02, 0], 0, 4.5);
    f.controller.crouched = f.controller.crouchIntent = true;
    f.tick(1, true);
    expect(f.tm.state).toBe('pullOffer');
  });

  it('too low for the pull-up (a solo climb reaches it): no pull offer, the hang-down as before', () => {
    const f = holderGame(3.5);
    f.mate.pos.y = 0;
    f.tick(1, true);
    expect(f.tm.state).toBe('hangOffer');
  });

  it('catch in the window: the verdict goes out, the haul runs its time, then free', () => {
    const f = holderGame();
    f.tick(1, true);
    f.tm.begin({ kind: 'pull', a: 'm', b: 'me', target: -1, s: 0, l: [0.85, H, 0] }, 'me');
    expect([f.tm.state, f.tm.partner, f.tm.busy]).toEqual(['pullCatch', 'm', true]);
    f.tick(Math.round(PULL.apexT / DT));
    expect(f.tm.prompt).toBe('Co-op: catch!');
    f.tick(1, true);
    expect(f.ends).toEqual(['pull']);
    expect([f.tm.state, f.run().catches]).toEqual(['pullHaul', 1]);
    // the host's own relay of the catch changes nothing
    f.tm.ended('pull');
    expect(f.tm.state).toBe('pullHaul');
    f.tick(Math.round((PULL.haul + PULL.scramble) / DT) - 2);
    expect(f.tm.state).toBe('pullHaul');
    f.tick(3);
    expect(f.tm.state).toBe('none');
    expect(f.ends).toEqual(['pull']);
  });

  it('missed: no press by the window end, or a press before it; back to the offer for another jump', () => {
    const f = holderGame();
    f.tick(1, true);
    f.tm.begin({ kind: 'pull', a: 'm', b: 'me', target: -1, s: 0, l: [0.85, H, 0] }, 'me');
    f.tick(Math.ceil(PULL.catchClose / DT) + 1);
    expect(f.ends).toEqual(['drop']);
    expect([f.tm.state, f.run().misses, f.run().lastMiss]).toEqual(['pullOffer', 1, 'late']);
    // the host's relay of that miss leaves the offer standing
    f.tm.ended('drop');
    expect(f.tm.state).toBe('pullOffer');
    // again, pressing early
    f.tm.begin({ kind: 'pull', a: 'm', b: 'me', target: -1, s: 0, l: [0.85, H, 0] }, 'me');
    f.tick(3);
    f.tick(1, true);
    expect(f.ends).toEqual(['drop', 'drop']);
    expect([f.tm.state, f.run().misses, f.run().lastMiss]).toEqual(['pullOffer', 2, 'early']);
  });

  it('the host refuses a late catch: back to the offer', () => {
    const f = holderGame();
    f.tick(1, true);
    f.tm.begin({ kind: 'pull', a: 'm', b: 'me', target: -1, s: 0, l: [0.85, H, 0] }, 'me');
    f.tick(Math.round(PULL.catchClose / DT) - 1);
    f.tick(1, true);
    expect(f.tm.state).toBe('pullHaul');
    f.tm.ended('drop');
    expect([f.tm.state, f.run().catches, f.run().lastMiss]).toEqual(['pullOffer', 0, 'host']);
  });

  it('cancels: B / Co-op / the timeout / leaving the ground end the offer; B while catching lets go', () => {
    for (const how of ['b', 'coop', 'time', 'air'] as const) {
      const f = holderGame();
      f.tick(1, true);
      expect(f.tm.state).toBe('pullOffer');
      if (how === 'b') f.tick(1, false, true);
      else if (how === 'coop') f.tick(1, true);
      else if (how === 'time') f.tick(Math.ceil(TEAM.offerTime / DT) + 2);
      else {
        f.controller.grounded = false;
        f.tick(1);
      }
      expect(f.tm.state).toBe('none');
      expect(f.controller.swallowCrouch).toBe(how === 'b');
      expect(f.ends).toEqual([]);
    }
    const f = holderGame();
    f.tick(1, true);
    f.tm.begin({ kind: 'pull', a: 'm', b: 'me', target: -1, s: 0, l: [0.85, H, 0] }, 'me');
    f.tick(2);
    f.tick(1, false, true);
    expect([f.tm.state, f.run().lastMiss]).toEqual(['none', 'cancel']);
    expect(f.ends).toEqual(['drop']);
  });

  it('a start after the offer ended drops the partner at once; the partner leaving ends the catch', () => {
    const f = holderGame();
    f.tm.begin({ kind: 'pull', a: 'm', b: 'me', target: -1, s: 0, l: [0.85, H, 0] }, 'me');
    expect(f.tm.state).toBe('none');
    expect(f.ends).toEqual(['drop']);
    const g2 = holderGame();
    g2.tick(1, true);
    g2.tm.begin({ kind: 'pull', a: 'm', b: 'me', target: -1, s: 0, l: [0.85, H, 0] }, 'me');
    g2.leave();
    g2.tick(1);
    expect([g2.tm.state, g2.tm.endWhy]).toEqual(['none', 'pull: partner gone']);
    expect(g2.ends).toEqual(['drop']);
  });
});

describe('the partner (KIT-PULL)', () => {
  it('under the offering holder: the prompt, Co-op asks the host with the catch point', () => {
    const f = partnerGame();
    f.tick(1);
    expect(f.tm.prompt).toContain('pull-up');
    f.tick(1, true);
    expect(f.asked).toEqual([['pull', 'm', -1, 0, H, expect.closeTo(0.85, 5), expect.closeTo(0, 5)]]);
    expect(f.tm.partner).toBe('m');
  });

  it('(KIT-TICK) the catch point comes from the typed KitHost.hangPoint (the controller\'s drop search)', () => {
    const f = partnerGame();
    const host: KitHost = f.tm;
    const p = host.hangPoint(0, H, 0, Math.PI / 2)!;
    expect(p.x).toBeCloseTo(0.85, 5);
    expect(p.floorY).toBe(0);
    const spy = vi.spyOn(f.tm, 'hangPoint');
    f.tick(1, true);
    expect(spy).toHaveBeenCalledWith(0, H, 0, Math.PI / 2);
    expect(f.asked).toEqual([['pull', 'm', -1, 0, H, expect.closeTo(0.85, 5), expect.closeTo(0, 5)]]);
  });

  it('out of reach of the catch point: a polite refusal, no request', () => {
    const f = partnerGame([2.5, 0, 0]);
    f.tick(1, true);
    f.tick(1);
    expect(f.asked).toEqual([]);
    expect(f.tm.prompt).toBe("Get under your partner's hands");
  });

  it('caught: the jump, the hang up to the lip, the scramble onto the top beside the holder, crouched', () => {
    const f = partnerGame();
    f.tm.begin({ kind: 'pull', a: 'me', b: 'm', target: -1, s: 0, l: [0.85, H, 0] }, 'me');
    expect([f.tm.state, f.tm.mode, f.tm.wireSub, f.tm.busy]).toEqual(['pullJump', 'boost', PULL_SUB, true]);
    expect(f.run().yaw).toBeCloseTo(-Math.PI / 2);
    expect([f.run().tx, f.run().ty, f.run().tz]).toEqual([expect.closeTo(0, 5), expect.closeTo(H, 5), expect.closeTo(-0.8, 5)]);
    f.tick(Math.round(PULL.apexT / DT));
    expect(f.controller.pos.y).toBeCloseTo(PULL.jumpRise, 1);
    expect(f.controller.pos.x).toBeCloseTo(0.85, 2);
    expect(KIT_POSE_LOCAL.k).toBeCloseTo(0.5, 1);
    // the host relays the holder's catch
    f.tm.ended('pull');
    f.tick(1);
    expect(f.tm.state).toBe('pullHang');
    f.tick(Math.round(PULL.haul / DT) + 1);
    expect(f.tm.state).toBe('pullScramble');
    expect(f.controller.pos.y).toBeCloseTo(ropeTopY(H), 2);
    expect(f.controller.pos.x).toBeCloseTo(0.85, 5);
    f.tick(Math.round(PULL.scramble / DT) - 3);
    expect(f.tm.state).toBe('pullScramble');
    f.tick(3);
    expect(f.tm.state).toBe('none');
    expect([f.controller.pos.x, f.controller.pos.y, f.controller.pos.z]).toEqual([expect.closeTo(0, 5), expect.closeTo(H, 5), expect.closeTo(-0.8, 5)]);
    expect(f.controller.override).toBeNull();
    expect(f.g.player.pose.traverse).toBe('none');
    expect(f.run().tops).toBe(1);
    expect(f.crouchToggles()).toBe(1);
  });

  it('missed: the jump comes back down to the floor, unhurt, and the move ends', () => {
    const f = partnerGame();
    f.tm.begin({ kind: 'pull', a: 'me', b: 'm', target: -1, s: 0, l: [0.85, H, 0] }, 'me');
    f.tick(Math.round(PULL.catchClose / DT));
    f.tm.ended('drop');
    // a late catch after the miss changes nothing (the first verdict holds)
    f.tm.ended('pull');
    f.tick(Math.ceil((PULL.landT - PULL.catchClose) / DT) + 1);
    expect([f.tm.state, f.tm.endWhy]).toEqual(['none', 'pull: missed catch']);
    expect(f.controller.pos.y).toBeCloseTo(0, 5);
    expect(f.controller.override).toBeNull();
    expect(f.run().misses).toBe(1);
    expect(pullMissLanding().harm).toBe(false);
  });

  it('no verdict at all (lost): the jump lands, waits verdictWait on the floor, then ends and says drop (NET)', () => {
    const f = partnerGame();
    f.tm.begin({ kind: 'pull', a: 'me', b: 'm', target: -1, s: 0, l: [0.85, H, 0] }, 'me');
    f.tick(Math.ceil(PULL.landT / DT) + 1);
    expect(f.tm.state).toBe('pullJump');
    expect(f.controller.pos.y).toBeCloseTo(0, 5);
    expect(f.ends).toEqual([]);
    f.tick(Math.ceil(PULL.verdictWait / DT) + 1);
    expect(f.tm.state).toBe('none');
    expect(f.controller.pos.y).toBeCloseTo(0, 5);
    // the partner's answer: a catch reaching the host after this lets go (kitNet)
    expect(f.ends).toEqual(['drop']);
  });

  it('(NET) a catch that reaches the landed partner inside the wait still hauls it up', () => {
    const f = partnerGame();
    f.tm.begin({ kind: 'pull', a: 'me', b: 'm', target: -1, s: 0, l: [0.85, H, 0] }, 'me');
    f.tick(Math.ceil(PULL.landT / DT) + 2);
    expect(f.tm.state).toBe('pullJump');
    f.tm.ended('pull');
    f.tick(1);
    expect(f.tm.state).toBe('pullHang');
    expect(f.ends).toEqual([]);
  });

  it('the holder gone mid-haul (left, or the host ends the pair): let go, a plain fall to the floor, crouched', () => {
    for (const how of ['leave', 'end'] as const) {
      const f = partnerGame();
      f.tm.begin({ kind: 'pull', a: 'me', b: 'm', target: -1, s: 0, l: [0.85, H, 0] }, 'me');
      f.tick(Math.round(PULL.apexT / DT));
      f.tm.ended('pull');
      f.tick(20);
      expect(f.tm.state).toBe('pullHang');
      if (how === 'leave') {
        f.leave();
        f.tick(1);
      } else f.tm.ended();
      expect(f.tm.state).toBe('pullJump');
      f.tick(120);
      expect([f.tm.state, f.tm.endWhy]).toEqual(['none', 'pull: dropped from the hang']);
      expect(f.controller.pos.y).toBeCloseTo(0, 5);
      expect(f.crouchToggles()).toBe(1);
    }
  });
});
