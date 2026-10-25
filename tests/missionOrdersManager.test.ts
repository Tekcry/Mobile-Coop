import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnemyManager } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { AlertMachine } from '../src/ai/alertState';
import { MODE_BREAKER } from '../src/ai/incidents';
import { BREAKER } from '../src/ai/gear';
import { PACE } from '../src/ai/response';
import { PostLure } from '../src/ai/posts';
import { K_RESET, K_WALK, LEG_LOOK, M_DONE, M_WALKING, OrderBoard, OrderLeg, ORDER, type MissionPost } from '../src/ai/missionOrders';
import type { BreakerHost } from '../src/ai/breaker';
import { LightRegistry } from '../src/world/lights';
import { Vector3, type Scene } from '../src/core/babylon';
import type { AiContext, Enemy } from '../src/ai/enemy';
import type { Body } from '../src/ai/body';
import type { PairGuard } from '../src/ai/pairs';
import type { World } from '../src/world/world';
import type { NavGrid, P2 } from '../src/ai/navGrid';
import type { LightField } from '../src/world/lightField';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';
import { flags } from '../src/core/flags';

// (guard-ai-mission-hooks S1a-2, D7, A1-A8) Mission orders wired into EnemyManager (stand-in guards, as
// hearing.test.ts) and Enemy (a bare prototype, as postsWiring.test.ts): the flag, the offer table, a late-placed slot,
// the bell, the breaker take-over and hold, the reset at the board, the phases, the drops, the pair rule, the restart,
// the torch and no allocation.

let flagWas = false;
beforeEach(() => {
  flagWas = flags.missionOrders;
  flags.missionOrders = true;
});
afterEach(() => {
  flags.missionOrders = flagWas;
});

// ----- EnemyManager on stand-in guards (copied from hearing.test.ts, with the order fields) -----

interface FakeGuard {
  id: string;
  num: number;
  alive: boolean;
  alerted: boolean;
  passive: boolean;
  taken: boolean;
  dog: null;
  secure: boolean;
  runningAlarm: boolean;
  level: string;
  incident: number;
  def: { melee: object | null; kind: string; scale: number };
  pos: Vector3;
  yaw: number;
  zone: string;
  section: number;
  slotIdx: number;
  key: number;
  breakerGroup: number;
  orderSlot: number;
  readonly ordered: boolean;
  leg: { state: number };
  orderRefusal: ReturnType<typeof vi.fn>;
  takeOrder: ReturnType<typeof vi.fn>;
  leaveBreaker: ReturnType<typeof vi.fn>;
  dropOrder: ReturnType<typeof vi.fn>;
  hear: ReturnType<typeof vi.fn>;
  hearTurn: ReturnType<typeof vi.fn>;
  hearGunfire: ReturnType<typeof vi.fn>;
  tell: ReturnType<typeof vi.fn>;
  sendTo: ReturnType<typeof vi.fn>;
  ack: ReturnType<typeof vi.fn>;
  checkLight: ReturnType<typeof vi.fn>;
  resetBreaker: ReturnType<typeof vi.fn>;
  pairSearch: ReturnType<typeof vi.fn>;
  bark: ReturnType<typeof vi.fn>;
  setPost: ReturnType<typeof vi.fn>;
  setGear: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
}

let n = 0;
function guard(x: number, z: number, o: Partial<Omit<FakeGuard, 'ordered'>> = {}): FakeGuard {
  const num = 9000 + n++;
  const g: FakeGuard = {
    id: `m${num}`,
    num,
    alive: true,
    alerted: false,
    passive: false,
    taken: false,
    dog: null,
    secure: false,
    runningAlarm: false,
    level: 'unaware',
    incident: -1,
    def: { melee: null, kind: 'grunt', scale: 1 },
    pos: new Vector3(x, 0, z),
    yaw: 0,
    zone: '',
    section: 0,
    slotIdx: -1,
    key: -1,
    breakerGroup: -1,
    orderSlot: -1,
    get ordered() {
      return this.orderSlot >= 0;
    },
    leg: { state: 0 },
    orderRefusal: vi.fn(() => ''),
    takeOrder: vi.fn((_b: OrderBoard, s: number) => {
      g.orderSlot = s;
      g.breakerGroup = -1;
      return true;
    }),
    leaveBreaker: vi.fn(() => {
      g.breakerGroup = -1;
    }),
    dropOrder: vi.fn(),
    hear: vi.fn(),
    hearTurn: vi.fn(),
    hearGunfire: vi.fn(),
    tell: vi.fn(),
    sendTo: vi.fn(),
    ack: vi.fn(),
    checkLight: vi.fn(),
    resetBreaker: vi.fn(),
    pairSearch: vi.fn(),
    bark: vi.fn(),
    setPost: vi.fn(),
    setGear: vi.fn(),
    dispose: vi.fn(),
    ...o,
  };
  return g;
}

/** A manager with stub world / nav (open floor) and a real light registry; `wall(x, z)`: a wall between a sound and
 *  a listener standing there. */
function manager(wall: (x: number, z: number) => boolean = () => false, reg = new LightRegistry()) {
  const world = { level: { lights: reg, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] } };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const clear = vi.fn((_a: Vector3, b: Vector3) => !wall(b.x, b.z));
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  return { em, reg };
}

function cast(em: EnemyManager, gs: FakeGuard[]): void {
  for (const g of gs) em.enemies.push(g as unknown as Enemy);
}
const E = (g: FakeGuard | Probe) => g as unknown as Enemy;

interface Priv {
  circuitBusy(group: number): boolean;
  circuitOut(group: number, x: number, y: number, z: number, n: number, fresh: boolean): void;
  orderTick(): void;
  fillPair(g: PairGuard, e: Enemy | null): void;
  hearWho: Int32Array;
  lastFault: Map<number, number>;
  faultCut: Map<number, number>;
  dark: { known: Uint8Array };
}
const P = (em: EnemyManager) => em as unknown as Priv;

const LOOK: MissionPost = { id: 'look', x: 20, z: 20 };
const slotOf = (em: EnemyManager, name: string) => em.orders.find(name);
const causeOf = (em: EnemyManager, name: string) => em.orders.cause[slotOf(em, name)]!;

describe('EnemyManager.missionOrder: the flag', () => {
  it('flag off: missionOrder records nothing, offers nothing, rings nothing', () => {
    flags.missionOrders = false;
    const { em } = manager();
    const g = guard(2, 0, { zone: 'porter' });
    const by = guard(3, 0);
    cast(em, [g, by]);
    em.setMissionMap(['s1'], [LOOK, { id: 'bell', x: 20, z: 20, bell: { x: 0, y: 1.5, z: 0, reach: 20 } }]);
    em.missionOrder('porter', 'walk', 'look');
    em.missionOrder('porter', 'walk', 'bell', undefined, 'rung');
    em.onMissionEvent({ name: 'ev', guardTag: 'porter', postId: 'look' });
    expect(em.orders.live).toBe(0);
    expect(em.orderPhase('porter')).toBe('none');
    expect(em.orderPhase('rung')).toBe('none');
    expect(em.orderPhase('ev')).toBe('none');
    expect(g.takeOrder).not.toHaveBeenCalled();
    expect(g.hearTurn).not.toHaveBeenCalled();
    expect(by.hearTurn).not.toHaveBeenCalled();
  });
});

describe('EnemyManager.missionOrder: the offer table (A6)', () => {
  it('an eligible tagged guard takes a walk (walking, 1 member); an untagged guard is never asked', () => {
    const { em } = manager();
    const g = guard(2, 0, { zone: 'porter' });
    const other = guard(4, 0, { zone: 'cook' });
    cast(em, [g, other]);
    em.setMissionMap(['s1'], [LOOK]);
    em.missionOrder('porter', 'walk', 'look', undefined, 'go');
    expect(g.takeOrder).toHaveBeenCalledTimes(1);
    expect(em.orderPhase('go')).toBe('walking');
    expect(em.orderMembers('go')).toBe(1);
    expect(em.orderOf(E(g))).toEqual({ name: 'go', kind: 'walk', phase: 'walking', leg: 0 });
    expect(other.orderRefusal).not.toHaveBeenCalled();
    expect(other.takeOrder).not.toHaveBeenCalled();
    expect(em.orderOf(E(other))).toBeNull();
    // the stand point is the post (no cell under it in the stub nav)
    const s = slotOf(em, 'go');
    expect([em.orders.pt[s * 3], em.orders.pt[s * 3 + 2]]).toEqual([20, 20]);
  });

  it('a tag by mission id <sectionId>:<k> (A1); the post resolves to a room centre when no post has the id (A2)', () => {
    const { em } = manager();
    (em as unknown as { ctx: AiContext }).ctx.rooms = [{ id: 'w3-passage', name: 'Passage', minX: 0, maxX: 10, minZ: 0, maxZ: 4 }] as unknown as AiContext['rooms'];
    const g = guard(2, 0, { section: 1, slotIdx: 6 });
    cast(em, [g]);
    em.setMissionMap(['s1', 's2'], []);
    em.missionOrder('s2:6', 'walk', 'w3-passage', undefined, 'k');
    expect(g.takeOrder).toHaveBeenCalledTimes(1);
    const s = slotOf(em, 'k');
    expect([em.orders.pt[s * 3], em.orders.pt[s * 3 + 2]]).toEqual([5, 2]);
    em.missionOrder('s1:6', 'walk', 'w3-passage', undefined, 'wrong');
    expect(g.takeOrder).toHaveBeenCalledTimes(1);
    expect(em.orderPhase('wrong')).toBe('offered');
  });

  it('an unresolved post or via, or a reset with no circuits: dropped at once with its cause, nobody asked', () => {
    const { em } = manager();
    const g = guard(2, 0, { zone: 'porter' });
    cast(em, [g]);
    em.setMissionMap(['s1'], [LOOK]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    em.missionOrder('porter', 'walk', 'nowhere', undefined, 'a');
    em.missionOrder('porter', 'walk', 'look', 'nowhere', 'b');
    em.missionOrder('porter', 'reset', 'look', undefined, 'c');
    expect([em.orderPhase('a'), em.orderPhase('b'), em.orderPhase('c')]).toEqual(['dropped', 'dropped', 'dropped']);
    expect([causeOf(em, 'a'), causeOf(em, 'b'), causeOf(em, 'c')]).toEqual(['noPost', 'noVia', 'noCircuits']);
    expect(g.orderRefusal).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });

  it('ineligible at the offer: dropped with his cause, and never asked again (a re-raise, a later step, a later placement)', () => {
    const { em } = manager();
    const busy = guard(2, 0, { zone: 'porter', orderRefusal: vi.fn(() => 'busy') });
    const ok = guard(3, 0, { zone: 'porter' });
    cast(em, [busy, ok]);
    em.setMissionMap(['s1'], [LOOK]);
    em.missionOrder('porter', 'walk', 'look', undefined, 'go');
    expect(busy.takeOrder).not.toHaveBeenCalled();
    expect(causeOf(em, 'go')).toBe('busy');
    expect(em.orderPhase('go')).toBe('walking');
    expect(em.orderMembers('go')).toBe(1);
    // free now: the same live order raised again does not revive him (the board's add refuses a dropped guard)
    busy.orderRefusal.mockImplementation(() => '');
    em.missionOrder('porter', 'walk', 'look', undefined, 'go');
    P(em).orderTick();
    const late = guard(5, 0);
    em.enemies.push(E(late));
    em.placeSlot(E(late), { yaw: 0, zone: 'porter' }, 0);
    expect(busy.takeOrder).not.toHaveBeenCalled();
    expect(late.takeOrder).not.toHaveBeenCalled();
    expect(em.orderMembers('go')).toBe(1);
  });

  it("a knocked-out tagged guard (a body, off the list) reads dropped with cause 'down' (S1a-i), never 'offered'", () => {
    const { em } = manager();
    const ko = guard(2, 0, { zone: 'porter', alive: false });
    em.bodies.push({ guard: ko } as unknown as Body);
    em.setMissionMap(['s1'], [LOOK]);
    em.missionOrder('porter', 'walk', 'look', undefined, 'go');
    expect(em.orderPhase('go')).toBe('dropped');
    expect(causeOf(em, 'go')).toBe('down');
    expect(em.orders.pendN).toBe(0);
    em.bodies.length = 0;
  });
});

describe('EnemyManager.missionOrder: a late-placed slot (A6)', () => {
  it("no guard of the tag at the event: 'offered'; his placeSlot gets it once; a second placement does not; a woken guard never", () => {
    const { em } = manager();
    em.setMissionMap(['s1'], [LOOK]);
    em.missionOrder('porter', 'walk', 'look', undefined, 'go');
    expect(em.orderPhase('go')).toBe('offered');
    expect(em.orders.pendN).toBe(1);
    // a woken guard (pushed on the list with the tag, no placeSlot) is never offered
    const woken = guard(1, 0, { zone: 'porter' });
    em.enemies.push(E(woken));
    P(em).orderTick();
    expect(woken.takeOrder).not.toHaveBeenCalled();
    em.enemies.length = 0;
    const g = guard(2, 0);
    em.enemies.push(E(g));
    em.placeSlot(E(g), { yaw: 0, zone: 'porter' }, 0);
    expect(g.takeOrder).toHaveBeenCalledTimes(1);
    expect(em.orderPhase('go')).toBe('walking');
    expect(em.orders.pendN).toBe(0);
    const h = guard(3, 0);
    em.enemies.push(E(h));
    em.placeSlot(E(h), { yaw: 0, zone: 'porter' }, 0);
    expect(h.takeOrder).not.toHaveBeenCalled();
    expect(em.orderMembers('go')).toBe(1);
  });
});

describe('EnemyManager.missionOrder: the bell (A4)', () => {
  const BELL: MissionPost = { id: 'bell', x: 30, z: 0, bell: { x: 0, y: 1.5, z: 0, reach: 20 } };

  it('heard in the open: offered; 25 m off a 20 m bell: dropped unheard', () => {
    const { em } = manager();
    const near = guard(5, 0, { zone: 'porter' });
    const far = guard(25, 0, { zone: 'porter' });
    cast(em, [near, far]);
    em.setMissionMap(['s1'], [BELL]);
    em.missionOrder('porter', 'walk', 'bell', undefined, 'ring');
    expect(near.takeOrder).toHaveBeenCalledTimes(1);
    expect(far.orderRefusal).not.toHaveBeenCalled();
    expect(far.takeOrder).not.toHaveBeenCalled();
    expect(causeOf(em, 'ring')).toBe('unheard');
    expect(em.orderMembers('ring')).toBe(1);
    // the walker himself does not turn to it (he is walking it)
    expect(near.hearTurn).not.toHaveBeenCalled();
  });

  it(`behind a wall (x ${0.45}): 12 m from a 20 m bell (9 m) unheard, 6 m heard`, () => {
    const { em } = manager(() => true);
    const at12 = guard(12, 0, { zone: 'porter' });
    const at6 = guard(0, 6, { zone: 'porter' });
    cast(em, [at12, at6]);
    em.setMissionMap(['s1'], [BELL]);
    em.missionOrder('porter', 'walk', 'bell', undefined, 'ring');
    expect(at12.takeOrder).not.toHaveBeenCalled();
    expect(at6.takeOrder).toHaveBeenCalledTimes(1);
    // the open floor hears 12 m
    const { em: open } = manager();
    const o12 = guard(12, 0, { zone: 'porter' });
    cast(open, [o12]);
    open.setMissionMap(['s1'], [BELL]);
    open.missionOrder('porter', 'walk', 'bell', undefined, 'ring');
    expect(o12.takeOrder).toHaveBeenCalledTimes(1);
  });

  it('beside a 12 dB generator (masking) unheard where the open floor hears it', () => {
    const { em } = manager();
    const g = guard(8, 0, { zone: 'porter' });
    cast(em, [g]);
    em.setNoisy([{ id: 'gen', x: 8, z: 0, radius: 6, db: 12 }]);
    em.setMissionMap(['s1'], [BELL]);
    em.missionOrder('porter', 'walk', 'bell', undefined, 'ring');
    expect(g.takeOrder).not.toHaveBeenCalled();
    expect(causeOf(em, 'ring')).toBe('unheard');
    const { em: open } = manager();
    const h = guard(8, 0, { zone: 'porter' });
    cast(open, [h]);
    open.setMissionMap(['s1'], [BELL]);
    open.missionOrder('porter', 'walk', 'bell', undefined, 'ring');
    expect(h.takeOrder).toHaveBeenCalledTimes(1);
  });

  it('bystanders in reach only turn (hearTurn with no meter bump, once): no hear, no send, no incident; the dog too', () => {
    const { em } = manager();
    const porter = guard(5, 0, { zone: 'porter' });
    const by = guard(-4, 3);
    const dog = guard(3, 3, { def: { melee: {}, kind: 'dog', scale: 1 } });
    const out = guard(40, 0);
    cast(em, [porter, by, dog, out]);
    em.setMissionMap(['s1'], [BELL]);
    em.missionOrder('porter', 'walk', 'bell', undefined, 'ring');
    for (const g of [by, dog]) {
      expect(g.hearTurn).toHaveBeenCalledTimes(1);
      expect(g.hearTurn).toHaveBeenCalledWith(0, 0, 0);
      expect(g.hear).not.toHaveBeenCalled();
      expect(g.sendTo).not.toHaveBeenCalled();
      expect(g.takeOrder).not.toHaveBeenCalled();
    }
    expect(out.hearTurn).not.toHaveBeenCalled();
    expect(em.board.openCount).toBe(0);
  });
});

/** A switch board (as breaker.test.ts): circuit -> switch point, on / off. */
function host(reg: LightRegistry, sws: Record<number, [number, number, number]>) {
  const off = new Set<number>();
  const h: BreakerHost & { cut(g: number): void } = {
    switchOf: (g, _x, _z, out) => {
      const s = sws[g];
      if (!s) return false;
      out[0] = s[0];
      out[1] = s[1];
      out[2] = s[2];
      return true;
    },
    isOff: (g) => off.has(g),
    reset: (g) => {
      if (!off.delete(g)) return false;
      reg.setGroup(g, true);
      return true;
    },
    cut: (g) => {
      off.add(g);
      reg.setGroup(g, false);
    },
  };
  return h;
}

describe('EnemyManager: a reset order and the breaker (PLAN "Cut first" / "Order first")', () => {
  function setup() {
    const reg = new LightRegistry();
    const lamp = reg.add({ x: 0, y: 3, z: 0, group: 55 });
    reg.add({ x: 6, y: 3, z: 0, group: 56 });
    const { em } = manager(() => false, reg);
    const h = host(reg, { 55: [0, 1.2, 4], 56: [6, 1.2, 4] });
    em.breakers = h;
    h.cut(55);
    h.cut(56);
    const board: MissionPost = { id: 'board', x: 0, z: 4, circuits: [55, 56] };
    em.setMissionMap(['s1'], [board]);
    return { em, h, lamp };
  }

  it('a tagged walker of 55 takes the reset of [55, 56]; another walker of 56 leaves his walk; the board faces the switch', () => {
    const { em } = setup();
    const a = guard(2, 0, { zone: 'fac', breakerGroup: 55, incident: 3 });
    const c = guard(4, 0, { breakerGroup: 56 });
    const d = guard(5, 0, { breakerGroup: 57 });
    cast(em, [a, c, d]);
    em.missionOrder('fac', 'reset', 'board', undefined, 'r');
    expect(a.takeOrder).toHaveBeenCalledTimes(1);
    expect(a.breakerGroup).toBe(-1);
    expect(c.leaveBreaker).toHaveBeenCalledTimes(1);
    expect(d.leaveBreaker).not.toHaveBeenCalled();
    expect(em.orderOf(E(a))!.kind).toBe('reset');
    const s = slotOf(em, 'r');
    expect(em.orders.kind[s]).toBe(K_RESET);
    expect([em.orders.face[s * 3], em.orders.face[s * 3 + 1]]).toEqual([0, 4]);
    expect(P(em).circuitBusy(55)).toBe(true);
    expect(P(em).circuitBusy(56)).toBe(true);
    // (57: d still walks it, as today)
    expect(P(em).circuitBusy(57)).toBe(true);
    expect(P(em).circuitBusy(58)).toBe(false);
  });

  it('order first: while it runs, a fresh cut of 55 with a witness opens no incident and starts no tamper clock (the lamps known); after it, the cut is reported as today', () => {
    const { em, lamp } = setup();
    const a = guard(2, 0, { zone: 'fac' });
    const w = guard(1, 1);
    cast(em, [a, w]);
    em.missionOrder('fac', 'reset', 'board', undefined, 'r');
    expect(em.orders.holdsCircuit(55)).toBe(true);
    P(em).hearWho[0] = w.num;
    P(em).circuitOut(55, 0, 0, 4, 1, true);
    expect(em.board.openCount).toBe(0);
    expect(P(em).lastFault.has(55)).toBe(false);
    expect(P(em).faultCut.has(55)).toBe(false);
    expect(P(em).dark.known[lamp.id]).not.toBe(0);
    // the order ends (done): the same cut is a fault again
    em.orders.set(slotOf(em, 'r'), a.num, M_DONE);
    a.orderSlot = -1;
    expect(em.orders.holdsCircuit(55)).toBe(false);
    P(em).hearWho[0] = w.num;
    P(em).circuitOut(55, 0, 0, 4, 1, true);
    expect(em.board.openCount).toBe(1);
    expect(P(em).lastFault.has(55)).toBe(true);
  });
});

describe('EnemyManager: orderTick, pairs, restart', () => {
  it("a member off the list is dropped 'down'; a held member drops his order ('held')", () => {
    const { em } = manager();
    const a = guard(2, 0, { zone: 'porter' });
    const b = guard(3, 0, { zone: 'porter' });
    cast(em, [a, b]);
    em.setMissionMap(['s1'], [LOOK]);
    em.missionOrder('porter', 'walk', 'look', undefined, 'go');
    expect(em.orderMembers('go')).toBe(2);
    em.enemies.splice(0, 1);
    b.taken = true;
    P(em).orderTick();
    expect(em.orderMembers('go')).toBe(1);
    expect(causeOf(em, 'go')).toBe('down');
    expect(b.dropOrder).toHaveBeenCalledWith('held');
  });

  it('fillPair reads an ordered guard as not present (J15 S6: his partner reacts as to a partner gone)', () => {
    const { em } = manager();
    const g = guard(2, 0, { orderSlot: 0 });
    const pg = { present: true, calm: true } as unknown as PairGuard;
    P(em).fillPair(pg, E(g));
    expect(pg.present).toBe(false);
  });

  it('clear(): every order goes (phase none, live 0), the board and its arrays stay the same objects; the mission map stays', () => {
    const { em } = manager();
    const g = guard(2, 0, { zone: 'porter' });
    cast(em, [g]);
    em.setMissionMap(['s1'], [LOOK]);
    em.missionOrder('porter', 'walk', 'look', undefined, 'go');
    const b = em.orders;
    const mem = b.mem;
    const pt = b.pt;
    em.clear();
    expect(em.orders).toBe(b);
    expect(b.mem).toBe(mem);
    expect(b.pt).toBe(pt);
    expect(em.orderPhase('go')).toBe('none');
    expect(b.live).toBe(0);
    expect(b.pendN).toBe(0);
    // the post still resolves: an order after the restart waits for its guard ('offered', not 'dropped')
    em.missionOrder('porter', 'walk', 'look', undefined, 'go');
    expect(em.orderPhase('go')).toBe('offered');
  });
});

// ----- The Enemy side on a bare prototype (as postsWiring.test.ts), walking a real OrderBoard -----

interface Probe {
  num: number;
  pos: { x: number; y: number; z: number };
  yaw: number;
  aware: AlertMachine;
  rate: number;
  caution: number;
  incident: number;
  incMode: number;
  brkGroup: number;
  taken: boolean;
  passive: boolean;
  postDef: { leash: number; highSecurity?: boolean } | null;
  def: { walkSpeed: number; kind: string; melee: object | null; quadruped: boolean };
  lure: { active: boolean; cancel(): void };
  alarm: object | null;
  responder: boolean;
  crew: object | null;
  orderSlot: number;
  readonly ordered: boolean;
  leg: OrderLeg;
  walker: { rejoin: ReturnType<typeof vi.fn> };
  bark: ReturnType<typeof vi.fn>;
  goals: P2[];
  off: Set<number>;
  breakerReset: ReturnType<typeof vi.fn>;
  orderRefusal(b: OrderBoard, s: number): string;
  takeOrder(b: OrderBoard, s: number): boolean;
  calmDecide(dt: number): { point: P2 | null; speed: number; face: number | null };
  orderStep(dt: number): { point: P2 | null; speed: number; face: number | null };
  onLevel(from: string, to: string): void;
  torchWanted(field: LightField, holding?: boolean): boolean;
}

let pn = 7000;
async function probe(x = 0, z = 0): Promise<Probe> {
  const { Enemy: EnemyClass } = await import('../src/ai/enemy');
  const goals: P2[] = [];
  const off = new Set<number>();
  const breakerReset = vi.fn((_e: Enemy, g: number) => off.delete(g));
  const e = Object.assign(Object.create(EnemyClass.prototype) as Enemy, {
    num: pn++,
    aware: new AlertMachine(),
    health: { alive: true },
    passive: false,
    taken: false,
    meter: 0,
    rate: 0,
    caution: 0,
    pos: { x, y: 0, z },
    yaw: 0,
    los: false,
    post: [x, z] as P2,
    postDef: null,
    postYaw: 0,
    stimulus: [0, 0] as P2,
    hasStimulus: false,
    turnT: 0,
    pairFace: Number.NaN,
    incident: -1,
    incMode: 0,
    lure: new PostLure(),
    alarm: null,
    responder: false,
    crew: null,
    camBody: null,
    brkGroup: -1,
    brkSw: [0, 0] as P2,
    brkAt: [0, 0] as P2,
    brkY: 0,
    brkT: 0,
    brkWalkT: 0,
    brkGoal: { point: null, speed: 0, face: null },
    orders: null,
    orderSlot: -1,
    leg: new OrderLeg(),
    ordAt: false,
    ordP: [0, 0] as P2,
    ordGoal: { point: null, speed: 0, face: null },
    spot: [0, 0] as P2,
    spotSet: false,
    reviving: null,
    dog: null,
    routePath: [],
    lc: { active: false, stop() {} },
    alertIn: { called: false },
    def: { walkSpeed: 1.5, kind: 'grunt', melee: null, quadruped: false },
    ctx: {
      coordinated: () => true,
      stealth: () => true,
      nav: { nearestWalkable: () => -1 },
      radioCall: vi.fn(),
      breakerOff: (g: number) => off.has(g),
      breakerReset,
    } as unknown as AiContext,
    walker: { rejoin: vi.fn(), step: () => null, lookYaw: Number.NaN, route: null },
    bark: vi.fn(),
    goals,
    off,
    breakerReset,
    // the nav: record the goal, straight there (null when within `near`)
    goTo(p: P2, _dt: number, near = 0.6): P2 | null {
      goals.push([p[0], p[1]]);
      return Math.hypot(p[0] - this.pos.x, p[1] - this.pos.z) < near ? null : p;
    },
  });
  return e as unknown as Probe;
}

/** A board with one order of `kind` at stand point (px, pz) (face point (fx, fz) for a reset). */
function board(kind: number, px: number, pz: number, circuits: number[] | null = null, fx = Number.NaN, fz = Number.NaN) {
  const b = new OrderBoard();
  const s = b.open('o', kind);
  b.pt[s * 3] = px;
  b.pt[s * 3 + 1] = 0;
  b.pt[s * 3 + 2] = pz;
  b.face[s * 3] = fx;
  b.face[s * 3 + 1] = fz;
  b.circuits[s] = circuits;
  return { b, s };
}

/** The manager's offer, by hand: on the board first, then he takes it. */
function give(p: Probe, b: OrderBoard, s: number): boolean {
  if (p.orderRefusal(b, s) !== '') return false;
  expect(b.add(s, p.num, M_WALKING)).toBe(true);
  return p.takeOrder(b, s);
}

/** Step `calmDecide` at `dt`, walking him at `speed` m/s towards each goal point; phases seen (duplicates collapsed). */
function run(p: Probe, b: OrderBoard, s: number, secs: number, dt = 0.1, speed = 1.5): string[] {
  const seen: string[] = [];
  for (let t = 0; t < secs; t += dt) {
    const g = p.calmDecide(dt);
    if (g.point) {
      const dx = g.point[0] - p.pos.x;
      const dz = g.point[1] - p.pos.z;
      const d = Math.hypot(dx, dz);
      const k = Math.min(d, speed * dt);
      if (d > 0) {
        p.pos.x += (dx / d) * k;
        p.pos.z += (dz / d) * k;
      }
    }
    const ph = b.phase[s]!;
    if (seen[seen.length - 1] !== ph) seen.push(ph);
  }
  return seen;
}

describe('Enemy.orderRefusal: the state gate (A6, S1a-c, S1a-d)', () => {
  it('free and calm (unaware, cooldown, suspicious): eligible', async () => {
    const { b, s } = board(K_WALK, 5, 0);
    for (const lvl of ['unaware', 'cooldown', 'suspicious'] as const) {
      const p = await probe();
      p.aware.set(lvl);
      expect(p.orderRefusal(b, s)).toBe('');
    }
  });

  it("each cause: down, held, passive, alerted, dog, secure, order, busy (an incident, a breaker walk on another circuit, a lure, searching, the alarm run, a responder, a team)", async () => {
    const { b, s } = board(K_WALK, 5, 0);
    const { b: rb, s: rs } = board(K_RESET, 5, 0, [57]);
    const cases: [string, (p: Probe) => void, OrderBoard?, number?][] = [
      ['down', (p) => ((p as unknown as { health: { alive: boolean } }).health.alive = false)],
      ['held', (p) => (p.taken = true)],
      ['passive', (p) => (p.passive = true)],
      ['alerted', (p) => p.aware.set('alert')],
      ['dog', (p) => (p.def.melee = {})],
      ['secure', (p) => (p.postDef = { leash: 3, highSecurity: true })],
      ['order', (p) => (p.orderSlot = 3)],
      ['busy', (p) => (p.incident = 2)],
      ['busy', (p) => ((p.brkGroup = 55), (p.incident = 2), (p.incMode = MODE_BREAKER))],
      ['busy', (p) => ((p.brkGroup = 55), (p.incident = 2), (p.incMode = MODE_BREAKER)), rb, rs],
      ['busy', (p) => (p.lure = { active: true, cancel() {} })],
      ['busy', (p) => p.aware.set('searching')],
      ['busy', (p) => p.aware.set('investigating')],
      ['busy', (p) => (p.alarm = {})],
      ['busy', (p) => (p.responder = true)],
      ['busy', (p) => (p.crew = {})],
    ];
    for (const [why, set, bb, ss] of cases) {
      const p = await probe();
      set(p);
      expect(p.orderRefusal(bb ?? b, ss ?? s), why).toBe(why);
      expect(p.takeOrder(bb ?? b, ss ?? s)).toBe(false);
      expect(p.orderSlot).toBe(why === 'order' ? 3 : -1);
    }
  });

  it("a reset of his own circuit takes his breaker walk over: the walk ends with no reset (incident freed), he is on the order and says 'checking'", async () => {
    const { b, s } = board(K_RESET, 5, 0, [55, 56], 5, 1);
    const p = await probe();
    p.brkGroup = 55;
    p.incident = 4;
    p.incMode = MODE_BREAKER;
    p.off.add(55);
    expect(p.orderRefusal(b, s)).toBe('');
    expect(give(p, b, s)).toBe(true);
    expect(p.brkGroup).toBe(-1);
    expect(p.incident).toBe(-1);
    expect(p.breakerReset).not.toHaveBeenCalled();
    expect(p.ordered).toBe(true);
    expect(p.bark).toHaveBeenCalledWith('checking');
  });
});

describe('Enemy: walking an order (A5)', () => {
  it("phases 'walking' -> 'arrived' -> 'done' (look round lookT s at the post); back on his route once; at patrol pace", async () => {
    const { b, s } = board(K_WALK, 6, 0);
    const p = await probe();
    expect(give(p, b, s)).toBe(true);
    const g = p.calmDecide(0.1);
    expect(g.speed).toBeCloseTo(1.5 * PACE.patrol, 6);
    const seen = run(p, b, s, 6 / 1.5 + ORDER.lookT + 2);
    expect(seen).toEqual(['walking', 'arrived', 'done']);
    expect(Math.hypot(p.pos.x - 6, p.pos.z)).toBeLessThanOrEqual(ORDER.arrive);
    expect(p.ordered).toBe(false);
    expect(p.walker.rejoin).toHaveBeenCalledTimes(1);
    expect(b.liveN(s)).toBe(0);
  });

  it('cautious: the cautious pace', async () => {
    const { b, s } = board(K_WALK, 6, 0);
    const p = await probe();
    p.caution = 1;
    give(p, b, s);
    expect(p.calmDecide(0.1).speed).toBeCloseTo(1.5 * PACE.cautious, 6);
  });

  it(`a walk that never gets there gives up after ORDER.giveUp (${ORDER.giveUp} s): 'dropped', cause 'giveUp'`, async () => {
    const { b, s } = board(K_WALK, 60, 0);
    const p = await probe();
    give(p, b, s);
    // he never moves (speed 0)
    run(p, b, s, ORDER.giveUp + 1, 0.5, 0);
    expect(b.phase[s]).toBe('dropped');
    expect(b.cause[s]).toBe('giveUp');
    expect(p.ordered).toBe(false);
  });

  it("drops on the way: investigating drops it (cause 'investigating'); a glimpse holds him still, then he walks on; a board task drops it ('task')", async () => {
    const { b, s } = board(K_WALK, 20, 0);
    const p = await probe();
    give(p, b, s);
    p.aware.set('suspicious');
    p.rate = 0.5;
    const held = p.calmDecide(0.1);
    expect(held.point).toBeNull();
    expect(held.speed).toBe(0);
    expect(p.ordered).toBe(true);
    p.rate = 0;
    expect(p.calmDecide(0.1).point).not.toBeNull();
    p.aware.set('investigating');
    p.onLevel('suspicious', 'investigating');
    expect(p.ordered).toBe(false);
    expect(b.phase[s]).toBe('dropped');
    expect(b.cause[s]).toBe('investigating');
    // a fresh order; then the board sends him somewhere (an incident): dropped at the next calm step
    const { b: b2, s: s2 } = board(K_WALK, 20, 0);
    const q = await probe();
    give(q, b2, s2);
    q.incident = 7;
    q.calmDecide(0.1);
    expect(q.ordered).toBe(false);
    expect(b2.cause[s2]).toBe('task');
  });
});

describe('Enemy: a reset order at the board', () => {
  it(`at the stand point, after BREAKER.resetT (${BREAKER.resetT} s) facing the switch: every circuit still off back on, then done`, async () => {
    const { b, s } = board(K_RESET, 0, 0, [55, 56], 0, 2);
    const p = await probe();
    p.off.add(55);
    p.off.add(56);
    give(p, b, s);
    const g = p.calmDecide(0.1);
    expect(p.leg.state).not.toBe(LEG_LOOK);
    expect(g.face).toBeCloseTo(0, 6);
    expect(b.phase[s]).toBe('arrived');
    run(p, b, s, BREAKER.resetT + 0.5);
    expect(p.breakerReset.mock.calls.map((c) => c[1])).toEqual([55, 56]);
    expect(b.phase[s]).toBe('done');
    expect(p.ordered).toBe(false);
  });

  it('only the circuit still off is reset', async () => {
    const { b, s } = board(K_RESET, 0, 0, [55, 56], 0, 2);
    const p = await probe();
    p.off.add(56);
    give(p, b, s);
    run(p, b, s, BREAKER.resetT + 0.5);
    expect(p.breakerReset.mock.calls.map((c) => c[1])).toEqual([56]);
    expect(b.phase[s]).toBe('done');
  });

  it("every circuit already on at the first step: done at once (cause 'on'), nothing reset", async () => {
    const { b, s } = board(K_RESET, 10, 0, [55, 56], 10, 2);
    const p = await probe();
    give(p, b, s);
    p.calmDecide(0.1);
    expect(p.breakerReset).not.toHaveBeenCalled();
    expect(b.phase[s]).toBe('done');
    expect(b.cause[s]).toBe('on');
    expect(p.ordered).toBe(false);
  });
});

describe('Enemy: the torch and no allocation', () => {
  it('an ordered calm guard in the dark follows the investigating torch rule; unordered calm, none', async () => {
    const dark = { levelAt: () => 0 } as unknown as LightField;
    const { b, s } = board(K_WALK, 20, 0);
    const p = await probe();
    expect(p.torchWanted(dark)).toBe(false);
    give(p, b, s);
    expect(p.torchWanted(dark)).toBe(true);
  });

  it('orderStep returns the same goal object every step; the board keeps its arrays', async () => {
    const { b, s } = board(K_WALK, 20, 0);
    const mem = b.mem;
    const p = await probe();
    give(p, b, s);
    const g0 = p.orderStep(0.1);
    for (let k = 0; k < 20; k++) expect(p.orderStep(0.1)).toBe(g0);
    expect(b.mem).toBe(mem);
  });
});
