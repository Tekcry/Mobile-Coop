// (coop-kit K0) The kit made generic for the five part 2 moves (PLAN "K0 Kit ids, spots and the done call"): the kinds
// and their sub bits, the wire round trip of each kind with a spot index and a claimed point, the host's spot lookup and
// start, the generic pair rule (`KIT_PAIR` time and `doneBy` side), `kitDone` on the host only, the spots API and the
// per-id gate (the host's rule and each page's offers). Headless: a stub host as tests/kitNet.test.ts, a fake GameState
// as tests/kit/registry.test.ts.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Vector3 } from '../../src/core/babylon';
import { flags, readCoopKit, readKitMoves } from '../../src/core/flags';
import {
  CHIMNEY_SUB,
  DEADWEIGHT_SUB,
  DROPCATCH_SUB,
  HANG_SUB,
  KIT_KINDS,
  KIT_SUB,
  KIT_SUB_MASK,
  PART2_KIT_KINDS,
  PLANK_SUB,
  PULL_SUB,
  ROPE_SUB,
  SHUTTER_SUB,
  SWING_SUB,
  TEAM_KINDS,
  THROW_SUB,
  anyPart2KitOn,
  checkTeamRequest,
  isKitKind,
  isPart2Kit,
  kitIdOn,
  type KitKind,
  type TeamRequest,
} from '../../src/game/teamMoves';
import { KIT_PAIR, addKitSpot, kitDone, kitSpotIndex, kitSpotsOf, type KitSpot } from '../../src/game/kit/kitApi';
import { kitKindOf, kitMove, kitStateOffer, kitStateSub, kitStateWireMode, registerKitMove, unregisterKitMove, type KitDevice, type KitMove } from '../../src/game/kit/registry';
import { KIT_POSE_IDS, KIT_POSE_OF, KIT_POSE_PLACEHOLDER, kitMoveOfSub } from '../../src/anim/clips/team';
import { KIT_TUNE_MOVES, KIT_TUNE_STATES, teamRoleGroup } from '../../src/anim/moveTune';
import { KIT_WIRE_ROWS, TEAM_WIRE_BITS } from '../../src/anim/tuneMoveRows';
import { TEAM_MOVE_IDS } from '../../src/anim/tuneBakeTable';
import { KIT_A_BITS, KIT_A_TRAVERSE, emptyMoveState } from '../../src/player/moveState';
import { kitDoneBy, kitEnd, kitPairOver, kitPairS, newKitPair, SHUTTER_PAIR_S, PULL_PAIR_S } from '../../src/net/kitNet';
import { CoopHost } from '../../src/net/coopHost';
import { parseMessage, PF } from '../../src/net/protocol';
import { TeamController } from '../../src/game/teamController';

const PART2: readonly KitKind[] = ['deadweight', 'dropCatch', 'chimneyPair', 'swingPass', 'plankBridge'];
const BITS: Readonly<Record<string, number>> = { deadweight: 64, dropCatch: 128, chimneyPair: 256, swingPass: 512, plankBridge: 1024 };

const kitMoves0 = flags.kitMoves;
const coopKit0 = flags.coopKit;
afterEach(() => {
  flags.kitMoves = kitMoves0;
  flags.coopKit = coopKit0;
  for (const k of PART2) {
    unregisterKitMove(k);
    delete KIT_PAIR[k];
  }
});

describe('K0: the kinds and their bits', () => {
  it('the five part 2 kinds are kit kinds and wire kinds, by a lookup; each has its own sub bit', () => {
    expect([...PART2_KIT_KINDS]).toEqual(PART2);
    expect([...KIT_KINDS]).toEqual(['pull', 'shutter', ...PART2]);
    for (const k of PART2) {
      expect(isKitKind(k)).toBe(true);
      expect(isPart2Kit(k)).toBe(true);
      expect(TEAM_KINDS).toContain(k);
      expect(KIT_SUB[k]).toBe(BITS[k]);
    }
    expect([DEADWEIGHT_SUB, DROPCATCH_SUB, CHIMNEY_SUB, SWING_SUB, PLANK_SUB]).toEqual([64, 128, 256, 512, 1024]);
    for (const k of ['pull', 'shutter', 'boost', 'ladder', 'throw', 'hang', 'rope', 'end', 'hangEnd', 'descent', 'stand', 'toString']) expect(isPart2Kit(k)).toBe(false);
    for (const k of ['boost', 'ladder', 'throw', 'hang', 'rope', 'end', 'hangEnd', 'toString', '']) expect(isKitKind(k)).toBe(false);
    // the seven bits, one each, clear of the built-ins' (throw 1, hang 2, rope 4) and B1's shoulder stand (32)
    expect(KIT_SUB_MASK).toBe(PULL_SUB | SHUTTER_SUB | 64 | 128 | 256 | 512 | 1024);
    let seen = 0;
    for (const k of KIT_KINDS) {
      expect(seen & KIT_SUB[k]).toBe(0);
      seen |= KIT_SUB[k];
    }
    expect(KIT_SUB_MASK & (THROW_SUB | HANG_SUB | ROPE_SUB | 32)).toBe(0);
  });

  it('the pose ids per move and role (PLAN K0), each a kit state with its move, wire mode, bit and placeholder', () => {
    expect(KIT_POSE_IDS.deadweight).toEqual({ b: ['chainGrab', 'chainHang', 'chainDrop'], a: ['grateUnder'] });
    expect(KIT_POSE_IDS.dropCatch).toEqual({ b: ['catchOffer', 'catchTake'], a: ['dropInto'] });
    expect(KIT_POSE_IDS.chimneyPair).toEqual({ b: ['chimneyOffer', 'chimneyBrace', 'chimneyClimb', 'chimneyTop'], a: ['chimneyJoin', 'chimneyPush', 'chimneyRise', 'chimneyOut'] });
    expect(KIT_POSE_IDS.swingPass).toEqual({ b: ['swingOffer', 'swingHold'], a: ['swingRide', 'swingRelease'] });
    expect(KIT_POSE_IDS.plankBridge).toEqual({ b: ['plankOffer', 'plankLift', 'plankCarry', 'plankDrop', 'plankLay'], a: ['plankJoin', 'plankLiftA', 'plankCarryA', 'plankDropA', 'plankLayA'] });
    const offers: string[] = [];
    for (const k of PART2) {
      for (const role of ['a', 'b'] as const) {
        for (const id of KIT_POSE_IDS[k as keyof typeof KIT_POSE_IDS][role]) {
          expect(KIT_POSE_OF.get(id)).toEqual({ move: k, role, id });
          expect(kitKindOf(id)).toBe(k);
          expect(kitStateWireMode(id)).toBe(role === 'b' ? 'brace' : 'boost');
          expect(kitStateSub(id)).toBe(BITS[k]);
          expect(KIT_POSE_PLACEHOLDER[id]).toBeTruthy();
          if (kitStateOffer(id)) offers.push(id);
        }
      }
    }
    // the waiting offers (pose k -1); Deadweight has none (the hanger acts at once)
    expect(offers).toEqual(['catchOffer', 'chimneyOffer', 'swingOffer', 'plankOffer']);
  });

  it('the copies kept equal: the tuner sections and states, the wire rows, the role A traverse bits, the bake ids', () => {
    expect([...KIT_TUNE_MOVES]).toEqual(PART2);
    for (const k of PART2) {
      const ids = KIT_POSE_IDS[k as keyof typeof KIT_POSE_IDS];
      expect(KIT_TUNE_STATES[k as (typeof KIT_TUNE_MOVES)[number]]).toEqual({ b: [...ids.b], a: [...ids.a] });
      for (const s of ids.b) expect(teamRoleGroup(s)).toBe(`team.${k}.b`);
      for (const s of ids.a) expect(teamRoleGroup(s)).toBe(`team.${k}.a`);
      expect(TEAM_MOVE_IDS).toContain(k);
    }
    expect(KIT_WIRE_ROWS.map((r) => r.bit)).toEqual(PART2.map((k) => KIT_SUB[k]));
    expect(KIT_WIRE_ROWS.map((r) => r.a)).toEqual(PART2.map((k) => `team.${k}.a`));
    expect([...KIT_A_BITS]).toEqual(PART2.map((k) => KIT_SUB[k]));
    for (const b of KIT_A_BITS) expect(KIT_A_TRAVERSE[b]).toBeDefined();
    // the relay's 1024 is a `ledge` bit: never read on brace / boost (Plank Bridge's there)
    expect(TEAM_WIRE_BITS.relay).toBe(PLANK_SUB);
    for (const k of KIT_KINDS) expect(kitMoveOfSub(KIT_SUB[k])).toBe(k);
    expect(kitMoveOfSub(0)).toBe('');
    expect(kitMoveOfSub(THROW_SUB | HANG_SUB | ROPE_SUB | 32)).toBe('');
  });
});

describe('K0: the wire round trip of each kind with a spot and a claimed point', () => {
  it('tmove carries the spot index, the phase and the claimed point; tstart the index, the phase and `l`', () => {
    for (const kind of PART2) {
      const req = { t: 'tmove', kind, partner: 'b1', target: 2, s: 2, gy: 1.5, lx: 3.25, lz: -4.5 };
      expect(parseMessage(JSON.parse(JSON.stringify(req)))).toEqual(req);
      // no claimed point (a free move, or a move whose rule needs none): still a request, no lx / lz
      expect(parseMessage({ t: 'tmove', kind, partner: 'b1', target: -1, s: 0, gy: 0 })).toEqual({ t: 'tmove', kind, partner: 'b1', target: -1, s: 0, gy: 0 });
      const start = { t: 'tstart', kind, a: 'a1', b: 'b1', target: 2, s: 2, t0: 12.5, l: [3.25, 1.5, -4.5] };
      expect(parseMessage(JSON.parse(JSON.stringify(start)))).toEqual(start);
      expect(parseMessage({ t: 'tstart', kind, a: 'a1', b: 'b1', target: 0, s: 1, t0: 3 })).toEqual({ t: 'tstart', kind, a: 'a1', b: 'b1', target: 0, s: 1, t0: 3 });
      // a broken claimed point is refused
      expect(parseMessage({ t: 'tstart', kind, a: 'a1', b: 'b1', target: 0, s: 0, t0: 3, l: [0, 'x', 0] })).toBeNull();
    }
  });
});

// ---- a host stub (tests/kitNet.test.ts's, with the host's kit devices and its own player) ----

type Who = { x: number; y: number; z: number; m: string; sub?: number; s?: number; f?: number };

function device(id: string, kind: KitKind, x = 0): KitDevice {
  return { id, kind, x, y: 0, z: 0, yaw: 0, reach: 1, open: 0, user: '' };
}

function host(c1: Who, c2: Who, devices: KitDevice[], puppet = false) {
  const h = Object.create(CoopHost.prototype) as CoopHost;
  const sent: Record<string, unknown>[] = [];
  const team = { begin: vi.fn(), ended: vi.fn(), denied: vi.fn(), devices: { list: devices } };
  const mode = { onTeamMove: vi.fn(), onKitDone: vi.fn() };
  const rp = (id: string, p: Who) => ({ id, alive: true, held: false, feet: { x: p.x, y: p.y, z: p.z }, state: { f: p.f ?? PF.grounded, mv: { ...emptyMoveState(), m: p.m, sub: p.sub ?? 0, s: p.s ?? 0 } } });
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
    // (coop4 A20, merge 15) the busy rule's active-move map
    teamActive: new Map(),
    time: 20,
  });
  const H_ = h as unknown as {
    onTeamMove(by: string, kind: string, partner: string, target: number, ss: number, gy: number, lx?: number, lz?: number): void;
    kitPairs: Map<string, { spot: string; until: number }>;
    time: number;
  };
  return { h: H_, sent, team, mode };
}

/** A stand-in Swing Pass: paired, claims the landing, its rule records the request (no allocation rules here). */
function fakeSwing(seen: TeamRequest[]): KitMove {
  return {
    kind: 'swingPass',
    paired: true,
    claimsPoint: true,
    newRun: () => ({}),
    check: (r) => {
      seen.push({ ...r });
      return null;
    },
    begin: () => {},
    step: () => {},
  };
}

const RIDER: Who = { x: 1, y: 0, z: 0, m: 'ground' };
const ANCHOR: Who = { x: 0, y: 0, z: 0, m: 'brace', sub: SWING_SUB, s: 2 };

describe("K0: the host's spot lookup, start and pair", () => {
  it('a request names a spot by index: the rule gets the device, the start carries the index, the phase and `l`', () => {
    flags.kitMoves = new Set(['swingPass']);
    const seen: TeamRequest[] = [];
    registerKitMove(fakeSwing(seen));
    const devs = [device('w2-shutter', 'shutter'), device('a5-swing', 'swingPass', 1)];
    const t = host(RIDER, ANCHOR, devs);
    t.h.onTeamMove('c1', 'swingPass', 'c2', 1, 2, 0.1, 3.5, 0);
    expect(seen[0]!.target).toBe(1);
    expect(seen[0]!.spot?.id).toBe('a5-swing');
    expect(seen[0]!.land).toEqual({ x: 3.5, y: 0.1, z: 0 });
    expect(t.sent).toEqual([{ t: 'tstart', kind: 'swingPass', a: 'c1', b: 'c2', target: 1, s: 2, t0: 20, l: [3.5, 0.1, 0] }]);
    expect(t.mode.onTeamMove).toHaveBeenCalledWith('c1', 'c2');
    expect(t.h.kitPairs.get('c1')?.spot).toBe('a5-swing');
    expect(t.h.kitPairs.get('c2')).toBe(t.h.kitPairs.get('c1'));
  });

  it("an index out of range or naming another kind's device is none (-1, no spot)", () => {
    flags.kitMoves = new Set(['swingPass']);
    const seen: TeamRequest[] = [];
    registerKitMove(fakeSwing(seen));
    for (const target of [0, 2, 99, -1]) {
      const t = host(RIDER, ANCHOR, [device('w2-shutter', 'shutter'), device('a5-swing', 'swingPass', 1)]);
      t.h.onTeamMove('c1', 'swingPass', 'c2', target, 0, 0, 3.5, 0);
      expect(seen.at(-1)!.spot).toBeUndefined();
      expect(seen.at(-1)!.target).toBe(-1);
      expect(t.sent[0]).toMatchObject({ t: 'tstart', target: -1, s: 0 });
      expect(t.h.kitPairs.get('c1')?.spot).toBe('');
    }
  });

  it("the move's doneBy side's 'pull' is the success end: relayed, and the mode told once with the spot and the pair", () => {
    flags.kitMoves = new Set(['swingPass']);
    registerKitMove(fakeSwing([]));
    KIT_PAIR.swingPass = { pairS: 5, doneBy: 'a' };
    const t = host(RIDER, ANCHOR, [device('a5-swing', 'swingPass')]);
    t.h.onTeamMove('c1', 'swingPass', 'c2', 0, 0, 0, 3.5, 0);
    expect(t.h.kitPairs.get('c1')?.until).toBeCloseTo(25, 6);
    t.sent.length = 0;
    // the anchor (b) cannot say 'pull'
    t.h.onTeamMove('c2', 'hangEnd', '', 0, 0, 0);
    expect(t.sent).toEqual([]);
    expect(t.mode.onKitDone).not.toHaveBeenCalled();
    // the rider (a) lands: success
    t.h.onTeamMove('c1', 'hangEnd', '', 0, 0, 0);
    expect(t.sent).toEqual([{ t: 'tend', a: 'c1', b: 'c2', k: 'pull' }]);
    expect(t.mode.onKitDone).toHaveBeenCalledTimes(1);
    expect(t.mode.onKitDone).toHaveBeenCalledWith('swingPass', 'a5-swing', 'c1', 'c2');
    expect(t.h.kitPairs.size).toBe(0);
    // a drop is no done call
    t.h.time = 30;
    t.h.onTeamMove('c1', 'swingPass', 'c2', 0, 0, 0, 3.5, 0);
    t.h.onTeamMove('c2', 'hangEnd', '', 1, 0, 0);
    expect(t.sent.at(-1)).toEqual({ t: 'tend', a: 'c1', b: 'c2', k: 'drop' });
    expect(t.mode.onKitDone).toHaveBeenCalledTimes(1);
  });

  it('the host in the pair is undefined in the done call (as onTeamMove); a free move has spot ""', () => {
    flags.kitMoves = new Set(['swingPass']);
    registerKitMove(fakeSwing([]));
    KIT_PAIR.swingPass = { pairS: 5, doneBy: 'b' };
    const t = host(RIDER, ANCHOR, []);
    // the host's own side as its view has it (its own MoveState needs a whole game: stubbed here)
    const base = (CoopHost.prototype as unknown as { teamSide(this: unknown, id: string): unknown }).teamSide;
    Object.assign(t.h, { teamSide: (id: string) => (id === 'h' ? { id, x: 0, y: 0, z: 0, mode: 'brace', alive: true, anchor: -1, s: 0, sub: SWING_SUB, crouch: false } : base.call(t.h, id)) });
    t.h.onTeamMove('c1', 'swingPass', 'h', -1, 0, 0, 3.5, 0);
    expect(t.sent[0]).toMatchObject({ t: 'tstart', a: 'c1', b: 'h', target: -1 });
    t.h.onTeamMove('h', 'hangEnd', '', 0, 0, 0);
    expect(t.mode.onKitDone).toHaveBeenCalledWith('swingPass', '', 'c1', undefined);
    expect(t.team.ended).toHaveBeenCalledWith('pull');
  });

  it("the host's per-id gate: a part 2 kind whose id is off is refused, whatever its rule says", () => {
    flags.kitMoves = new Set(['descent', 'pull', 'shutter']);
    const seen: TeamRequest[] = [];
    registerKitMove(fakeSwing(seen));
    const t = host(RIDER, ANCHOR, [device('a5-swing', 'swingPass')]);
    t.h.onTeamMove('c1', 'swingPass', 'c2', 0, 0, 0, 3.5, 0);
    expect(t.sent).toEqual([{ t: 'tdeny', a: 'c1', reason: 'notOffering' }]);
    expect(seen).toHaveLength(0);
    // and an id on with no move registered yet (before its K slice): not offering
    flags.kitMoves = new Set(['deadweight']);
    const side = { id: 'x', x: 0, y: 0, z: 0, mode: 'ground', alive: true };
    expect(checkTeamRequest({ kind: 'deadweight', a: side, b: { ...side, id: 'y', mode: 'brace', sub: DEADWEIGHT_SUB }, target: -1, targetUp: 0, sinceLast: 9 })).toBe('notOffering');
  });
});

describe('K0: the generic pair rule (kitNet)', () => {
  it("pull and shutter keep theirs; another kind takes its KIT_PAIR row, or the shutter's time and side a", () => {
    expect(kitPairS('pull')).toBe(PULL_PAIR_S);
    expect(kitPairS('shutter')).toBe(SHUTTER_PAIR_S);
    expect(kitDoneBy('shutter')).toBe('a');
    for (const k of PART2) {
      expect(kitPairS(k)).toBe(SHUTTER_PAIR_S);
      expect(kitDoneBy(k)).toBe('a');
    }
    KIT_PAIR.dropCatch = { pairS: 4, doneBy: 'b' };
    const p = newKitPair('dropCatch', 'a1', 'b1', 10, 'a6-dropcatch');
    expect([p.until, p.spot, p.verdict]).toEqual([14, 'a6-dropcatch', '']);
    expect(newKitPair('dropCatch', 'a1', 'b1', 10).spot).toBe('');
    // only the catcher (b) says 'pull'; either drops; a stranger nothing
    expect(kitEnd(p, 'a1', 'pull', 11, 0)).toBeNull();
    expect(kitEnd(p, 'b1', 'pull', 11, 0)).toBe('pull');
    expect(kitEnd(p, 'a1', 'drop', 11, 0)).toBe('drop');
    expect(kitEnd(p, 'b1', 'drop', 11, 0)).toBe('drop');
    expect(kitEnd(p, 'x', 'drop', 11, 0)).toBeNull();
    expect(kitPairOver(p, 'pull')).toBe(true);
    // the shutter's crawler still says through (unchanged by any row)
    const s = newKitPair('shutter', 'a1', 'b1', 10);
    expect(kitEnd(s, 'a1', 'pull', 11, 0)).toBe('pull');
    expect(kitEnd(s, 'b1', 'pull', 11, 0)).toBeNull();
  });
});

describe('K0: kitDone is the host only', () => {
  it('tells the mode on the host; a co-op client page (puppet) and a mode without the hook are no-ops', () => {
    const onKitDone = vi.fn();
    expect(kitDone({ puppet: false, mode: { onKitDone } }, 'deadweight', 'a4-deadweight', 'c1', undefined)).toBe(true);
    expect(onKitDone).toHaveBeenCalledWith('deadweight', 'a4-deadweight', 'c1', undefined);
    expect(kitDone({ puppet: true, mode: { onKitDone } }, 'deadweight', 'a4-deadweight', 'c1', undefined)).toBe(false);
    expect(onKitDone).toHaveBeenCalledTimes(1);
    expect(kitDone({ puppet: false, mode: {} }, 'plankBridge', '', undefined, 'c2')).toBe(false);
    expect(kitDone({ puppet: false, mode: null }, 'plankBridge', '', undefined, 'c2')).toBe(false);
  });

  it("a co-op client page's host stub never tells its mode", () => {
    flags.kitMoves = new Set(['swingPass']);
    registerKitMove(fakeSwing([]));
    const t = host(RIDER, ANCHOR, [device('a5-swing', 'swingPass')], true);
    t.h.onTeamMove('c1', 'swingPass', 'c2', 0, 0, 0, 3.5, 0);
    t.h.onTeamMove('c1', 'hangEnd', '', 0, 0, 0);
    expect(t.sent.at(-1)).toEqual({ t: 'tend', a: 'c1', b: 'c2', k: 'pull' });
    expect(t.mode.onKitDone).not.toHaveBeenCalled();
  });
});

describe('K0: the spots', () => {
  it("addKitSpot records on the level's anchors; kitSpotsOf lists all or one kind's; kitSpotIndex finds a device", () => {
    const anchors = {};
    const level = { anchors };
    expect(kitSpotsOf(level)).toEqual([]);
    expect(kitSpotsOf(null)).toEqual([]);
    expect(kitSpotsOf({})).toEqual([]);
    const dw: KitSpot = { id: 'a4-deadweight', kind: 'deadweight', x: 1, y: 2.4, z: 3, yaw: 0, x2: 1, y2: 2.4, z2: 5, door: 'A4-grille' };
    const pb: KitSpot = { id: 'a2-plank', kind: 'plankBridge', x: 0, y: 0, z: 0, yaw: 1.5, w: 3.9 };
    addKitSpot(anchors, dw);
    addKitSpot(anchors, pb);
    expect(kitSpotsOf(level)).toEqual([dw, pb]);
    expect(kitSpotsOf(level, 'plankBridge')).toEqual([pb]);
    expect(kitSpotsOf(level, 'swingPass')).toEqual([]);
    expect(kitSpotsOf({ anchors: {} })).toEqual([]);
    const list = [device('w2-shutter', 'shutter'), device('a4-deadweight', 'deadweight')];
    expect(kitSpotIndex(list, 'a4-deadweight')).toBe(1);
    expect(kitSpotIndex(list, 'nope')).toBe(-1);
  });
});

// ---- the per-id gate on a page (a fake GameState, tests/kit/registry.test.ts's) ----

function fakeGame() {
  const controller = { pos: new Vector3(0, 0, 0), renderPos: new Vector3(), yaw: 0, renderYaw: 0, override: null, grounded: true, swallowCrouch: false, crouched: false, crouchIntent: false, autoCrouch: false };
  const mate = { id: 'm', pos: new Vector3(1, 0, 0), yaw: 0, mode: 'ground', sub: 0 };
  const g = {
    player: { alive: true, controller, pose: { traverse: 'none', traverseT: 0, tumble: 0 } },
    net: { teamMates: () => [mate], teamRequest: () => {} },
    app: { toasts: { show: () => {} } },
    traversal: { attached: false, committed: null, attach: { kind: 'none', phase: 'off' } },
    takedown: { active: null },
    strike: { active: false },
    ballistics: { ray: () => ({ hit: false, distance: 0, point: new Vector3() }) },
    world: { level: {} },
  };
  return new TeamController(g as never);
}

/** A stand-in move that logs its idle call and never applies (the built-ins run). */
function idler(kind: KitKind, log: string[]): KitMove {
  return { kind, newRun: () => ({}), check: () => null, idle: () => (log.push(kind), null), begin: () => {}, step: () => {} };
}

describe('K0: the per-id gate on each page', () => {
  const real: KitMove[] = [];
  beforeAll(() => {
    for (const k of ['pull', 'shutter'] as const) {
      const m = kitMove(k);
      if (m) real.push(m);
    }
  });
  afterAll(() => {
    for (const m of real) registerKitMove(m);
  });

  it('`?kitmoves=deadweight` alone offers no pull-up; `?coopkit=1` still does; neither: no kit offer runs', () => {
    const log: string[] = [];
    registerKitMove(idler('pull', log));
    registerKitMove(idler('deadweight', log));
    // the id alone (as K1 will build it): the deadweight's offer runs, the pull-up's does not
    flags.coopKit = false;
    flags.kitMoves = new Set(['deadweight']);
    expect(anyPart2KitOn()).toBe(true);
    expect([kitIdOn('pull'), kitIdOn('shutter'), kitIdOn('deadweight'), kitIdOn('swingPass')]).toEqual([false, false, true, false]);
    fakeGame().fixedUpdate(1 / 60, false, false);
    expect(log).toEqual(['deadweight']);
    // `?coopkit=1`: the pull-up's runs, the deadweight's (id off) does not
    log.length = 0;
    flags.coopKit = true;
    flags.kitMoves = new Set(['pull', 'shutter']);
    expect(anyPart2KitOn()).toBe(false);
    fakeGame().fixedUpdate(1 / 60, false, false);
    expect(log).toEqual(['pull']);
    // nothing on: no kit offer at all
    log.length = 0;
    flags.coopKit = false;
    flags.kitMoves = new Set();
    fakeGame().fixedUpdate(1 / 60, false, false);
    expect(log).toEqual([]);
    unregisterKitMove('pull');
  });

  it('the URL: `?kitmoves=deadweight` turns Deadweight on (in KIT_BUILT from K1) and no pull-up', () => {
    const k = readKitMoves('deadweight', false, null);
    expect(k.has('deadweight')).toBe(true);
    expect(k.has('pull')).toBe(false);
    expect(readCoopKit(null, k)).toBe(false);
    const c = readKitMoves(null, false, '1');
    expect(readCoopKit('1', c)).toBe(true);
    expect(c.has('pull')).toBe(true);
  });
});
