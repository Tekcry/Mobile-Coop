// (mission KIT0) The co-op kit's plumbing: the pull / shutter ids, the move registry, the host rule hook, the kit device
// hook, the pose ids and the team controller's hand-off to a registered move. Headless (a fake GameState).
import { afterEach, describe, expect, it } from 'vitest';
import { Vector3 } from '../../src/core/babylon';
import { TEAM } from '../../src/config/movement';
import { checkTeamRequest, isKitKind, KIT_CHECKS, KIT_KINDS, KIT_SUB, KIT_SUB_MASK, PULL_SUB, ROPE_SUB, SHUTTER_SUB, HANG_SUB, THROW_SUB, type TeamRequest, type TeamSide } from '../../src/game/teamMoves';
import { isKitState, KitDevices, kitKindOf, kitMove, kitMoveOfState, kitMoves, kitOfferFree, kitPoseK, kitStateOffer, kitStateRole, kitStateSub, kitStateWireMode, registerKitMove, unregisterKitMove, type KitDevice, type KitHost, type KitMove } from '../../src/game/kit/registry';
import { KIT_POSE_IDS, KIT_POSE_LOCAL, KIT_POSE_OF, KIT_POSE_PLACEHOLDER, newTeamPoseIn, teamPoseOfState, teamPoseOfWire, TEAM_LINK, teamLinkFrame, type KitPoseId } from '../../src/anim/clips/team';
import { TeamController } from '../../src/game/teamController';

const side = (id: string, mode: string, sub = 0, x = 0, y = 0): TeamSide => ({ id, x, y, z: 0, mode, alive: true, sub });
const req = (kind: TeamRequest['kind'], a: TeamSide, b: TeamSide, extra: Partial<TeamRequest> = {}): TeamRequest => ({ kind, a, b, target: 3, targetUp: 4.4, sinceLast: 9, ...extra });

const ALL_IDS: KitPoseId[] = ['pullOffer', 'pullCatch', 'pullHaul', 'pullJump', 'pullHang', 'pullScramble', 'shutterOffer', 'shutterLift', 'shutterHold', 'shutterDrop', 'crawlUnder'];

interface FakeRun {
  begun: number;
  steps: number;
  ends: number;
  devices: number;
}

/** A stand-in pull-up: the holder offers when crouched with a mate near, the partner's press asks the host. */
function fakePull(log: string[]): KitMove<FakeRun> {
  return {
    kind: 'pull',
    times: { pullCatch: 0.5 },
    paired: true,
    claimsPoint: true,
    newRun: () => ({ begun: 0, steps: 0, ends: 0, devices: 0 }),
    check: (r) => (r.b.mode === 'brace' && ((r.b.sub ?? 0) & PULL_SUB) !== 0 ? null : 'notOffering'),
    idle(h, _run, coopPressed, free, near) {
      log.push(`idle ${free} ${near.toFixed(1)}`);
      if (!coopPressed) return null;
      h.state = 'pullOffer';
      h.t = 0;
      h.count.offers++;
      return true;
    },
    begin(h, run, s, self) {
      run.begun++;
      if (s.b === self) {
        h.partner = s.a;
        h.state = 'pullCatch';
      } else {
        h.partner = s.b;
        h.state = 'pullJump';
      }
      h.t = 0;
    },
    step(h, run, dt) {
      run.steps++;
      h.t += dt;
    },
    end(_h, run, aborted) {
      run.ends++;
      log.push(`end ${aborted}`);
    },
    wireS: () => 0.9,
    gap: () => NaN,
    setupDevices(_h, run, devices) {
      run.devices++;
      devices.add({ id: 'pull-lip', kind: 'pull', x: 0, y: 3, z: 0, yaw: 0, reach: 1, open: 0, user: '' });
    },
  };
}

function fakeGame(world: object | undefined = { level: {} }) {
  const controller = { pos: new Vector3(0, 0, 0), renderPos: new Vector3(), yaw: 0, renderYaw: 0, override: null, grounded: true, swallowCrouch: false, crouched: false, crouchIntent: false, autoCrouch: false };
  const mate = { id: 'm', pos: new Vector3(1, 0, 0), yaw: 0, mode: 'ground', sub: 0 };
  const asked: unknown[][] = [];
  const g = {
    player: { alive: true, controller, pose: { traverse: 'none', traverseT: 0, tumble: 0 } },
    net: { teamMates: () => [mate], teamRequest: (...a: unknown[]) => asked.push(a) },
    app: { toasts: { show: () => {} } },
    traversal: { attached: false, committed: null, attach: { kind: 'none', phase: 'off' } },
    takedown: { active: null },
    strike: { active: false },
    // a floor at y 0 under every downward ray, nothing else
    ballistics: { ray: (a: Vector3, b: Vector3) => (b.y < a.y - 0.1 && a.y >= 0 && b.y <= 0 ? { hit: true, distance: a.y, point: new Vector3(b.x, 0, b.z) } : { hit: false, distance: 0, point: new Vector3() }) },
    world,
  };
  return { g, mate, asked, tm: new TeamController(g as never) };
}

afterEach(() => {
  for (const k of KIT_KINDS) unregisterKitMove(k);
  KIT_POSE_LOCAL.k = -1;
  KIT_POSE_LOCAL.gap = NaN;
});

describe('kit ids (KIT0)', () => {
  it('pull and shutter are kit kinds with their own wire sub bits, clear of the built-in ones', () => {
    expect(KIT_KINDS).toEqual(['pull', 'shutter']);
    expect(isKitKind('pull') && isKitKind('shutter')).toBe(true);
    for (const k of ['boost', 'ladder', 'throw', 'hang', 'rope', 'end', 'hangEnd']) expect(isKitKind(k)).toBe(false);
    expect(KIT_SUB).toEqual({ pull: PULL_SUB, shutter: SHUTTER_SUB });
    expect(KIT_SUB_MASK & (THROW_SUB | HANG_SUB | ROPE_SUB)).toBe(0);
    expect(PULL_SUB & SHUTTER_SUB).toBe(0);
  });

  it('the agreed pose ids: b = holder, a = partner; every id has a move, a role and a placeholder', () => {
    expect(KIT_POSE_IDS.pull.b).toEqual(['pullOffer', 'pullCatch', 'pullHaul']);
    expect(KIT_POSE_IDS.pull.a).toEqual(['pullJump', 'pullHang', 'pullScramble']);
    expect(KIT_POSE_IDS.shutter.b).toEqual(['shutterOffer', 'shutterLift', 'shutterHold', 'shutterDrop']);
    expect(KIT_POSE_IDS.shutter.a).toEqual(['crawlUnder']);
    expect([...KIT_POSE_OF.keys()].sort()).toEqual([...ALL_IDS].sort());
    for (const id of ALL_IDS) {
      expect(KIT_POSE_PLACEHOLDER[id]).toBeTruthy();
      expect(isKitState(id)).toBe(true);
      expect(kitKindOf(id)).toBe(id === 'crawlUnder' || id.startsWith('shutter') ? 'shutter' : 'pull');
      expect(kitStateWireMode(id)).toBe(kitStateRole(id) === 'b' ? 'brace' : 'boost');
      expect(kitStateSub(id)).toBe(KIT_SUB[kitKindOf(id)!]);
    }
    expect(ALL_IDS.filter(kitStateOffer)).toEqual(['pullOffer', 'shutterOffer']);
    for (const s of ['none', 'offer', 'hangOffer', 'ropeOffer', 'boost', 'hanging']) {
      expect(isKitState(s)).toBe(false);
      expect(kitStateOffer(s)).toBe(false);
      expect(kitKindOf(s)).toBeNull();
    }
  });

  it('pose clock: offers -1, timed phases t / time clamped, the rest held at 1', () => {
    const times = { pullCatch: 0.5 };
    expect(kitPoseK('pullOffer', 3, times)).toBe(-1);
    expect(kitPoseK('pullCatch', 0.25, times)).toBeCloseTo(0.5);
    expect(kitPoseK('pullCatch', 2, times)).toBe(1);
    expect(kitPoseK('pullHaul', 0.1, times)).toBe(1);
    expect(kitPoseK('shutterHold', 0.1)).toBe(1);
  });
});

describe('registry and the host rule (KIT0)', () => {
  it('an unregistered kit kind is refused; a registered one runs its own rule after the shared checks', () => {
    const a = side('a', 'air');
    const offering = side('b', 'brace', PULL_SUB);
    expect(checkTeamRequest(req('pull', a, offering))).toBe('notOffering');
    expect(checkTeamRequest(req('shutter', side('a', 'ground'), side('b', 'brace', SHUTTER_SUB)))).toBe('notOffering');
    registerKitMove(fakePull([]));
    expect(kitMove('pull')?.kind).toBe('pull');
    expect(kitMove('shutter')).toBeNull();
    expect(KIT_CHECKS.pull).toBeTypeOf('function');
    // the partner asks in the air: the kit rule runs before the ground check
    expect(checkTeamRequest(req('pull', a, offering))).toBeNull();
    expect(checkTeamRequest(req('pull', a, side('b', 'brace', 0)))).toBe('notOffering');
    // the shared checks still come first
    expect(checkTeamRequest(req('pull', a, offering, { sinceLast: 0 }))).toBe('rate');
    expect(checkTeamRequest(req('pull', { ...a, alive: false }, offering))).toBe('dead');
    expect(checkTeamRequest(req('pull', a, { ...offering, id: 'a' }))).toBe('notMates');
    unregisterKitMove('pull');
    expect(KIT_CHECKS.pull).toBeUndefined();
    expect(checkTeamRequest(req('pull', a, offering))).toBe('notOffering');
  });

  it('registering again replaces (hot reload); the list keeps one per kind; an unknown kind throws', () => {
    const m1 = fakePull([]);
    const m2 = fakePull([]);
    registerKitMove(m1);
    registerKitMove(m2);
    expect(kitMoves()).toHaveLength(1);
    expect(kitMove('pull')).toBe(m2);
    expect(kitMoveOfState('pullHaul')).toBe(m2);
    expect(kitMoveOfState('crawlUnder')).toBeNull();
    expect(kitMoveOfState('offer')).toBeNull();
    expect(() => registerKitMove({ ...m1, kind: 'ladder' as never })).toThrow();
  });

  it('the built-in moves are unchanged and never complete a partner offering a kit move', () => {
    const a = side('a', 'ground');
    expect(checkTeamRequest(req('boost', a, side('b', 'brace', 0)))).toBeNull();
    expect(checkTeamRequest(req('boost', a, side('b', 'brace', PULL_SUB)))).toBe('notBraced');
    expect(checkTeamRequest(req('boost', a, side('b', 'brace', SHUTTER_SUB)))).toBe('notBraced');
    expect(checkTeamRequest(req('throw', a, side('b', 'brace', SHUTTER_SUB)))).toBe('notBraced');
    expect(checkTeamRequest(req('boost', side('a', 'air'), side('b', 'brace', 0)))).toBe('busy');
  });
});

describe('kit device hook (KIT0)', () => {
  const dev = (id: string, x: number, reach = 1, kind: 'pull' | 'shutter' = 'shutter'): KitDevice => ({ id, kind, x, y: 0, z: 0, yaw: 0, reach, open: 0, user: '' });

  it('add / replace / get / near / remove / clear, the version bumping on each change', () => {
    const d = new KitDevices();
    d.add(dev('s1', 0));
    d.add(dev('s2', 3));
    d.add(dev('p1', 0.5, 1, 'pull'));
    expect(d.list).toHaveLength(3);
    const v = d.version;
    d.add(dev('s1', 0.2));
    expect(d.list).toHaveLength(3);
    expect(d.get('s1')!.x).toBe(0.2);
    expect(d.version).toBe(v + 1);
    expect(d.near('shutter', 0.3, 0, 0)!.id).toBe('s1');
    expect(d.near('shutter', 2.6, 0.5, 0)!.id).toBe('s2');
    expect(d.near('shutter', 1.6, 0, 0)).toBeNull();
    expect(d.near('shutter', 0, 2, 0)).toBeNull();
    expect(d.near('pull', 0.4, 0, 0)!.id).toBe('p1');
    expect(d.remove('s2')).toBe(true);
    expect(d.remove('s2')).toBe(false);
    d.clear();
    expect(d.list).toHaveLength(0);
    expect(d.get('s1')).toBeNull();
  });
});

describe('team pose ids (KIT0)', () => {
  it('a kit state poses its move and role on the controller clock; gap rides along; the built-ins are as before', () => {
    const i = newTeamPoseIn();
    expect(i.gap).toBeNaN();
    KIT_POSE_LOCAL.k = 0.4;
    KIT_POSE_LOCAL.gap = 0.9;
    teamPoseOfState('shutterLift', 0, i);
    expect([i.move, i.role, i.k, i.gap]).toEqual(['shutter', 'b', 0.4, 0.9]);
    teamPoseOfState('crawlUnder', 0, i);
    expect([i.move, i.role]).toEqual(['shutter', 'a']);
    teamPoseOfState('pullJump', 0, i);
    expect([i.move, i.role]).toEqual(['pull', 'a']);
    teamPoseOfState('assist', TEAM.boostTime / 2, i);
    expect([i.move, i.role, i.k]).toEqual(['boost', 'b', 0.5]);
    expect(i.gap).toBeNaN();
    teamPoseOfState('none', 0, i);
    expect([i.move, i.role, i.k]).toEqual(['', '', -1]);
  });

  it('the wire: a braced kit sub poses the kit move (the shutter gap from s); the built-in subs as before', () => {
    const o = newTeamPoseIn();
    expect(teamPoseOfWire('brace', SHUTTER_SUB, 0.85, 0, 'x', o).move).toBe('shutter');
    expect(o.gap).toBe(0.85);
    expect(teamPoseOfWire('brace', PULL_SUB, 0, 0, 'x', o).move).toBe('pull');
    expect(o.gap).toBeNaN();
    expect(teamPoseOfWire('brace', HANG_SUB, 1.2, 0, 'x', o).move).toBe('hang');
    expect(o.depth).toBe(1.2);
    expect(teamPoseOfWire('brace', ROPE_SUB, 0, 0, 'x', o).move).toBe('rope');
    expect(teamPoseOfWire('brace', THROW_SUB, 0, 0, 'x', o).move).toBe('throw');
    expect(teamPoseOfWire('brace', 0, 0, 0, 'x', o).move).toBe('boost');
  });

  it('the link carries the gap to the partner page and clears it', () => {
    const i = newTeamPoseIn();
    KIT_POSE_LOCAL.k = 1;
    KIT_POSE_LOCAL.gap = 0.7;
    teamPoseOfState('shutterHold', 0, i);
    teamLinkFrame(1 / 60, 'p', i, 0, 0, 0, 0);
    expect([TEAM_LINK.move, TEAM_LINK.gap]).toEqual(['shutter', 0.7]);
    teamPoseOfState('none', 0, i);
    teamLinkFrame(1 / 60, 'p', i, 0, 0, 0, 0);
    expect(TEAM_LINK.move).toBe('');
    expect(TEAM_LINK.gap).toBeNaN();
  });
});

describe('team controller hand-off (KIT0)', () => {
  it('with no kit move registered the controller runs as before (no kit hook, a press offers the throw)', () => {
    const { tm, mate } = fakeGame(undefined);
    mate.pos.set(2, 0, 0);
    expect(tm.fixedUpdate(1 / 60, true, false)).toBe(true);
    expect(tm.state).toBe('throwOffer');
    expect(tm.devices.list).toHaveLength(0);
  });

  it('a registered move takes the idle press, the host start, the fixed step, the wire fields and the end', () => {
    const log: string[] = [];
    registerKitMove(fakePull(log));
    const { tm } = fakeGame();
    const host: KitHost = tm;
    expect(host.devices).toBe(tm.devices);
    // idle without a press: the move does not apply, the built-ins run (no offer)
    expect(tm.fixedUpdate(1 / 60, false, false)).toBe(false);
    expect(log[0]).toBe('idle true 1.0');
    expect(tm.devices.get('pull-lip')).not.toBeNull();
    // the press: the move's offer
    expect(tm.fixedUpdate(1 / 60, true, false)).toBe(true);
    expect(tm.state).toBe('pullOffer');
    expect([tm.active, tm.busy, tm.mode, tm.wireSub, tm.wireS]).toEqual([true, false, 'brace', PULL_SUB, 0.9]);
    // the host starts it with us as the holder: the move's begin, then its step
    tm.begin({ kind: 'pull', a: 'm', b: 'me', target: -1, s: 0 }, 'me');
    expect([tm.state, tm.partner]).toEqual(['pullCatch', 'm']);
    expect(tm.busy).toBe(true);
    expect(tm.fixedUpdate(0.25, false, false)).toBe(true);
    expect(tm.partT).toBeCloseTo(0.25);
    expect(KIT_POSE_LOCAL.k).toBeCloseTo(0.5);
    const i = teamPoseOfState(tm.state, tm.partT, newTeamPoseIn());
    expect([i.move, i.role]).toEqual(['pull', 'b']);
    // the partner ends it: no `ended` hook -> free; the move's end ran
    tm.ended();
    expect(tm.state).toBe('none');
    expect(log).toContain('end false');
    expect(KIT_POSE_LOCAL.k).toBe(-1);
    // one device setup per level
    const run = (tm as unknown as { kitRuns: Map<string, FakeRun> }).kitRuns.get('pull')!;
    expect(run.devices).toBe(1);
    expect(run.begun).toBe(1);
    expect(run.ends).toBe(1);
  });

  it('the partner side of a kit move rides boost; a kit state whose move is gone ends', () => {
    registerKitMove(fakePull([]));
    const { tm } = fakeGame();
    tm.begin({ kind: 'pull', a: 'me', b: 'm', target: -1, s: 0 }, 'me');
    expect([tm.state, tm.mode, tm.wireSub]).toEqual(['pullJump', 'boost', PULL_SUB]);
    unregisterKitMove('pull');
    expect(tm.fixedUpdate(1 / 60, false, false)).toBe(false);
    expect(tm.state).toBe('none');
    expect(tm.endWhy).toBe('kit: no move registered');
  });

  it('an unregistered kit start is ignored; the built-ins skip a mate offering a kit move', () => {
    const { tm, mate } = fakeGame();
    tm.begin({ kind: 'shutter', a: 'me', b: 'm', target: -1, s: 0 }, 'me');
    expect(tm.state).toBe('none');
    // a mate braced with the shutter bit is not a leg-up offer
    mate.mode = 'brace';
    mate.sub = SHUTTER_SUB;
    mate.pos.set(0.5, 0, 0);
    tm.fixedUpdate(1 / 60, false, false);
    expect(tm.offer).toBeNull();
    // the same mate offering the throw is seen as before
    mate.sub = THROW_SUB;
    tm.fixedUpdate(1 / 60, false, false);
    expect(tm.offer?.mate.id).toBe('m');
    expect(tm.offer?.toss).toBe(true);
  });

  it('(KIT-TICK) tick runs on every fixed step: idle, during a built-in offer, while dead, in its own states', () => {
    const ticks: { n: number; dt: number; states: string[] } = { n: 0, dt: 0, states: [] };
    // a move with no idle (the built-ins keep the press) and a tick that records the controller state
    const m: KitMove<FakeRun> = {
      ...fakePull([]),
      idle: undefined,
      tick(h, _run, dt) {
        ticks.n++;
        ticks.dt += dt;
        ticks.states.push(h.state);
      },
    };
    registerKitMove(m);
    const { g, tm, mate } = fakeGame();
    mate.pos.set(2, 0, 0);
    tm.fixedUpdate(1 / 60, false, false);
    expect(ticks.n).toBe(1);
    // a built-in offer (the throw): ticked every step
    expect(tm.fixedUpdate(1 / 60, true, false)).toBe(true);
    expect(tm.state).toBe('throwOffer');
    for (let i = 0; i < 5; i++) tm.fixedUpdate(1 / 60, false, false);
    expect(tm.state).toBe('throwOffer');
    expect(ticks.n).toBe(7);
    expect(ticks.states.filter((s) => s === 'throwOffer')).toHaveLength(5);
    // dead: the controller ends the offer and returns early, the tick still runs (before the end)
    g.player.alive = false;
    for (let i = 0; i < 4; i++) tm.fixedUpdate(1 / 60, false, false);
    expect(tm.state).toBe('none');
    expect(ticks.n).toBe(11);
    expect(ticks.states[7]).toBe('throwOffer');
    // in its own states
    g.player.alive = true;
    tm.begin({ kind: 'pull', a: 'm', b: 'me', target: -1, s: 0 }, 'me');
    tm.fixedUpdate(0.25, false, false);
    expect(ticks.n).toBe(12);
    expect(ticks.states[11]).toBe('pullCatch');
    expect(ticks.dt).toBeCloseTo(11 / 60 + 0.25);
  });

  it('(KIT-TICK) a busyOffer move\'s offer holds the player (busy); a plain kit offer stays free', () => {
    expect(kitOfferFree('pullOffer')).toBe(true);
    expect(kitOfferFree('shutterOffer')).toBe(true);
    registerKitMove({ ...fakePull([]), busyOffer: true });
    expect(kitOfferFree('pullOffer')).toBe(false);
    expect(kitOfferFree('pullCatch')).toBe(false);
    expect(kitOfferFree('offer')).toBe(false);
    // the pose clock still reads it as an offer
    expect(kitPoseK('pullOffer', 0.2)).toBe(-1);
    const { tm } = fakeGame();
    tm.fixedUpdate(1 / 60, true, false);
    expect(tm.state).toBe('pullOffer');
    expect([tm.active, tm.busy]).toEqual([true, true]);
  });

  it('kit requests go to the net hook with the kit kind', () => {
    const { tm, asked } = fakeGame();
    tm.kitRequest('shutter', 'm', -1, 0, 0.9, 1, 2);
    expect(tm.partner).toBe('m');
    expect(asked).toEqual([['shutter', 'm', -1, 0, 0.9, 1, 2]]);
  });
});
