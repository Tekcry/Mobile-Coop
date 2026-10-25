import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnemyManager } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { AlertMachine } from '../src/ai/alertState';
import { BREAKER } from '../src/ai/gear';
import { PostLure } from '../src/ai/posts';
import {
  checkMissionOrders, K_WALK, LEG_FOLLOW, LEG_LOOK, LEG_TO_POST, LEG_TO_VIA, LEG_WAIT_VIA, M_ARRIVED, M_DROPPED,
  M_WALKING, ORDER, OrderBoard, OrderLeg, type MissionPost, type OrderEvent, type OrderSection,
} from '../src/ai/missionOrders';
import { LightRegistry } from '../src/world/lights';
import type { Scene } from '../src/core/babylon';
import type { AiContext, Enemy } from '../src/ai/enemy';
import type { World } from '../src/world/world';
import type { NavGrid, P2 } from '../src/ai/navGrid';
import type { RoomRect } from '../src/world/rooms';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';
import { flags } from '../src/core/flags';

// (guard-ai-mission-hooks S1b, D7, A6) Mission order groups: events with one name and via gather at the via, leave
// when every member is there or `ORDER.joinWait` after the leader's arrival (lead decision 2026-10-26), the first live
// member leads and the others follow `ORDER.followGap` behind; the leader's end ends the group, a dropped member leaves
// it and the next leads.

let flagWas = false;
beforeEach(() => {
  flagWas = flags.missionOrders;
  flags.missionOrders = true;
});
afterEach(() => {
  flags.missionOrders = flagWas;
});

/** A board with one walk order 'g' at stand point (px, pz), via (vx, vz) (NaN: none). */
function board(px: number, pz: number, vx = Number.NaN, vz = Number.NaN) {
  const b = new OrderBoard();
  const s = b.open('g', K_WALK);
  b.pt.set([px, 0, pz], s * 3);
  b.via.set([vx, Number.NaN, vz], s * 3);
  return { b, s };
}

/** Steps `gatherStep` (0.1 s) until the group leaves; the seconds it took (fails past joinWait + 1). */
function leaveAfter(b: OrderBoard, s: number): number {
  let t = 0;
  while (!b.gatherStep(s, 0.1)) {
    t += 0.1;
    expect(t).toBeLessThan(ORDER.joinWait + 1);
  }
  return t;
}

describe('OrderBoard: groups (S1b)', () => {
  it("forms only with a via and 2+ members; 'gathering' while a member is live; 'walking' after it leaves", () => {
    const lone = board(10, 0, 5, 0);
    lone.b.add(lone.s, 1, M_WALKING);
    lone.b.group(lone.s);
    expect([lone.b.gath[lone.s], lone.b.phase[lone.s]]).toEqual([0, 'walking']);
    const novia = board(10, 0);
    novia.b.add(novia.s, 1, M_WALKING);
    novia.b.add(novia.s, 2, M_WALKING);
    novia.b.group(novia.s);
    expect([novia.b.gath[novia.s], novia.b.phase[novia.s]]).toEqual([0, 'walking']);
    const { b, s } = board(10, 0, 5, 0);
    b.add(s, 1, M_WALKING);
    b.add(s, 2, M_WALKING);
    b.group(s);
    b.lead[s] = 1;
    expect([b.gath[s], b.phase[s]]).toEqual([1, 'gathering']);
    b.markVia(s, 1);
    b.markVia(s, 2);
    expect(b.gatherStep(s, 0.1)).toBe(true);
    expect([b.gath[s], b.left[s], b.phase[s]]).toEqual([0, 1, 'walking']);
    // left: it never gathers again
    b.group(s);
    expect(b.gath[s]).toBe(0);
  });

  it('a follower at the via starts no clock; it leaves when every member is at the via', () => {
    const { b, s } = board(10, 0, 5, 0);
    b.add(s, 1, M_WALKING);
    b.add(s, 2, M_WALKING);
    b.group(s);
    b.lead[s] = 1;
    // nobody there yet: the wait does not run
    for (let k = 0; k < 300; k++) expect(b.gatherStep(s, 0.1)).toBe(false);
    expect(b.waitT[s]).toBe(-1);
    // (lead decision 2026-10-26) a follower at the via starts no clock: he waits for the leader as long as it takes
    b.markVia(s, 2);
    expect(b.waitT[s]).toBe(-1);
    for (let k = 0; k < 300; k++) expect(b.gatherStep(s, 0.1)).toBe(false);
    expect([b.waitT[s], b.phase[s]]).toEqual([-1, 'gathering']);
    // the leader gets there: everyone is in, it leaves this step
    b.markVia(s, 1);
    expect(b.waitT[s]).toBe(0);
    expect(b.gatherStep(s, 0.1)).toBe(true);
  });

  it('the leader changes: a new leader already at the via starts the clock; one still walking stops it', () => {
    const { b, s } = board(10, 0, 5, 0);
    b.add(s, 1, M_WALKING);
    b.add(s, 2, M_WALKING);
    b.add(s, 3, M_WALKING);
    b.group(s);
    b.lead[s] = 1;
    b.markVia(s, 2);
    for (let k = 0; k < 250; k++) b.gatherStep(s, 0.1);
    expect(b.waitT[s]).toBe(-1);
    // the leader drops on his way: #2 leads, he stands at the via, the clock starts this step
    b.set(s, 1, M_DROPPED, 'down');
    b.lead[s] = b.firstLive(s);
    expect(b.lead[s]).toBe(2);
    expect(b.gatherStep(s, 0.1)).toBe(false);
    expect(b.waitT[s]).toBeCloseTo(0.1, 6);
    // #2 drops at the via: #3, still walking, leads; the clock stops and the group waits for him
    b.set(s, 2, M_DROPPED, 'task');
    b.lead[s] = b.firstLive(s);
    expect(b.lead[s]).toBe(3);
    for (let k = 0; k < 300; k++) expect(b.gatherStep(s, 0.1)).toBe(false);
    expect(b.waitT[s]).toBe(-1);
    b.markVia(s, 3);
    expect(leaveAfter(b, s)).toBeCloseTo(ORDER.joinWait, 0);
  });

  it('with one missing, it leaves only joinWait (+-dt) after the leader arrived', () => {
    const { b, s } = board(10, 0, 5, 0);
    b.add(s, 1, M_WALKING);
    b.add(s, 2, M_WALKING);
    b.group(s);
    b.lead[s] = 1;
    b.markVia(s, 1);
    let t = 0;
    while (!b.gatherStep(s, 0.1)) {
      t += 0.1;
      expect(b.phase[s]).toBe('gathering');
      expect(t).toBeLessThan(ORDER.joinWait + 1);
    }
    expect(Math.abs(t - ORDER.joinWait)).toBeLessThanOrEqual(0.1 + 1e-3);
    expect(b.phase[s]).toBe('walking');
  });

  it('a member recorded dropped never counts as there; no live member: dropped, no gathering', () => {
    const { b, s } = board(10, 0, 5, 0);
    b.add(s, 1, M_WALKING);
    b.add(s, 2, M_DROPPED, 'busy');
    b.group(s);
    expect(b.phase[s]).toBe('gathering');
    expect(b.firstLive(s)).toBe(1);
    expect(b.stateOf(s, 2)).toBe(M_DROPPED);
    expect(b.stateOf(s, 9)).toBe(-1);
    b.lead[s] = 1;
    b.markVia(s, 1);
    b.markVia(s, 2); // (a dropped member never gets there; marking him changes nothing below)
    b.set(s, 2, M_DROPPED);
    expect(b.gatherStep(s, 0.1)).toBe(true); // both marked: leaves
    const r = board(10, 0, 5, 0);
    r.b.add(r.s, 1, M_WALKING);
    r.b.add(r.s, 2, M_DROPPED, 'busy');
    r.b.group(r.s);
    r.b.markVia(r.s, 1);
    expect(r.b.gatherStep(r.s, 1)).toBe(false);
    r.b.set(r.s, 1, M_DROPPED, 'down');
    expect(r.b.gatherStep(r.s, 0.1)).toBe(false);
    expect([r.b.gath[r.s], r.b.phase[r.s], r.b.firstLive(r.s)]).toEqual([0, 'dropped', -1]);
  });

  it('sameRoute; clear frees the group arrays and keeps their identity', () => {
    const { b, s } = board(10, 0, 5, 0);
    b.postId[s] = 'p';
    b.viaId[s] = 'v';
    expect(b.sameRoute(s, 'p', 'v')).toBe(true);
    expect(b.sameRoute(s, 'p', '')).toBe(false);
    b.add(s, 1, M_WALKING);
    b.add(s, 2, M_WALKING);
    b.group(s);
    b.markVia(s, 1);
    b.lead[s] = 1;
    b.leadP.set([1, 2, 3], s * 3);
    const arrs = [b.postId, b.viaId, b.gath, b.left, b.waitT, b.lead, b.leadP, b.memVia];
    b.clear();
    expect([b.postId, b.viaId, b.gath, b.left, b.waitT, b.lead, b.leadP, b.memVia]).toEqual(arrs);
    [b.postId, b.viaId, b.gath, b.left, b.waitT, b.lead, b.leadP, b.memVia].forEach((a, k) => expect(a).toBe(arrs[k]));
    expect([b.postId[s], b.viaId[s], b.gath[s], b.left[s], b.waitT[s], b.lead[s]]).toEqual(['', '', 0, 0, -1, -1]);
    expect(Number.isNaN(b.leadP[s * 3]!)).toBe(true);
    expect(b.memVia[s * b.per]).toBe(0);
  });
});

describe('OrderLeg: wait at the via, follow (S1b)', () => {
  /** Board 'g': post (10, 10), via (10, 0), members 1 and 2 walking, gathering. */
  function grp() {
    const r = board(10, 10, 10, 0);
    r.b.add(r.s, 1, M_WALKING);
    r.b.add(r.s, 2, M_WALKING);
    r.b.group(r.s);
    r.b.lead[r.s] = 1;
    return r;
  }

  it('a member starting at the via waits there facing the post; no walk time while he waits; the same goal object', () => {
    const { b, s } = grp();
    const leg = new OrderLeg();
    leg.start(b, s, 11, 0, 0, 2);
    expect(leg.state).toBe(LEG_TO_VIA);
    const g0 = leg.step(0.1, b, s, 11, 0, 0);
    expect(leg.state).toBe(LEG_WAIT_VIA);
    expect(b.memVia[s * b.per + 1]).toBe(1);
    expect(b.waitT[s]).toBe(-1); // (lead decision 2026-10-26) he is no leader: no clock
    expect(g0.move).toBe(false);
    expect([g0.x, g0.z]).toEqual([10, 0]);
    expect(g0.face).toBeCloseTo(0, 6); // via (10, 0) -> post (10, 10): +Z
    const w = leg.walkT;
    for (let k = 0; k < 50; k++) expect(leg.step(0.1, b, s, 11, 0, 0)).toBe(g0);
    expect(leg.walkT).toBe(w);
    expect(leg.state).toBe(LEG_WAIT_VIA);
  });

  it('on leave the leader heads for the post (arrival heading from the via), a follower follows', () => {
    const { b, s } = grp();
    const lead = new OrderLeg();
    const fol = new OrderLeg();
    lead.start(b, s, 9, 0, 0, 1);
    fol.start(b, s, 11, 0, 0, 2);
    lead.step(0.1, b, s, 9, 0, 0);
    fol.step(0.1, b, s, 11, 0, 0);
    expect(b.gatherStep(s, 0.1)).toBe(true);
    const g = lead.step(0.1, b, s, 9, 0, 0);
    expect(lead.state).toBe(LEG_TO_POST);
    expect([g.x, g.z, g.move]).toEqual([10, 10, true]);
    fol.step(0.1, b, s, 11, 0, 0);
    expect(fol.state).toBe(LEG_FOLLOW);
    // the leader walks the post leg straight up x = 10 and arrives: the look base is via -> post (+Z), not 9,0 -> post
    lead.step(0.1, b, s, 10, 0, 10);
    expect(lead.state).toBe(LEG_LOOK);
    expect(lead.base).toBeCloseTo(0, 6);
  });

  it('the follow goal is followGap from the leader on the line to him; within followGap + 0.5 he holds still facing the leader', () => {
    const { b, s } = grp();
    const fol = new OrderLeg();
    fol.start(b, s, 0, 0, 0, 2);
    b.gath[s] = 0;
    b.left[s] = 1;
    b.leadP.set([10, 0, 4], s * 3);
    // no leader position yet: he stands
    b.leadP[s * 3] = Number.NaN;
    let g = fol.step(0.1, b, s, 10, 0, 0);
    expect([fol.state, g.move, fol.near]).toEqual([LEG_FOLLOW, false, false]);
    b.leadP[s * 3] = 10;
    g = fol.step(0.1, b, s, 10, 0, 0);
    expect(g.move).toBe(true);
    expect(g.x).toBeCloseTo(10, 6);
    expect(g.z).toBeCloseTo(4 - ORDER.followGap, 6);
    expect(fol.near).toBe(false);
    const w = fol.walkT;
    // 1.9 m behind (inside 1.5 + 0.5): he stands, facing the walking leader (+Z)
    g = fol.step(0.1, b, s, 10, 0, 2.1);
    expect([g.move, fol.near]).toEqual([false, true]);
    expect(g.face).toBeCloseTo(0, 6);
    expect(fol.walkT).toBe(w);
    // the leader at the post: he faces the post's stand point (10, 10), here east of him
    b.set(s, 1, M_ARRIVED);
    g = fol.step(0.1, b, s, 8, 0, 10);
    b.leadP.set([9, 0, 10], s * 3);
    g = fol.step(0.1, b, s, 8, 0, 10);
    expect(g.face).toBeCloseTo(Math.PI / 2, 6);
  });

  it('his leader dropped (lead = him): on to the post; a member still on the via leg when the group leaves follows', () => {
    const { b, s } = grp();
    const fol = new OrderLeg();
    fol.start(b, s, 0, 0, 0, 2);
    b.gath[s] = 0;
    b.left[s] = 1;
    b.leadP.set([10, 0, 4], s * 3);
    fol.step(0.1, b, s, 0, 0, 0);
    expect(fol.state).toBe(LEG_FOLLOW);
    b.lead[s] = 2;
    const g = fol.step(0.1, b, s, 10, 0, 2);
    expect(fol.state).toBe(LEG_TO_POST);
    expect([g.x, g.z, g.move]).toEqual([10, 10, true]);
    expect(fol.walkT).toBeGreaterThan(0.1);
  });
});

describe('checkMissionOrders: groups (S1b-b)', () => {
  const room = (id: string, minX: number, maxX: number, minZ: number, maxZ: number): RoomRect =>
    ({ id, minX, maxX, minZ, maxZ }) as RoomRect;
  const s2: OrderSection = { id: 's2', guards: Array.from({ length: 7 }, (_, k) => ({ x: -20 + k * 3, z: -24 })) };
  const rooms = [room('foyer', -24, -12, -28, -20), room('plant', -6, 2, -20, -14)];
  const posts: MissionPost[] = [{ id: 's2-plant-board', x: -2, z: -17, y: 0, circuits: [55, 56] }];
  const ev = (tag: string, via = 'foyer', postId = 's2-plant-board'): OrderEvent =>
    ({ name: 'ss-power', guardTag: tag, postId, via });
  const chk = (evs: OrderEvent[]) => checkMissionOrders(evs, [s2], posts, rooms, []);

  it('two Split-Shift events that agree: []; a disagreeing via: one error; five events of one name: one error', () => {
    expect(chk([ev('s2:6'), ev('s2:0')])).toEqual([]);
    const via = chk([ev('s2:6'), ev('s2:0', 'plant')]);
    expect(via).toHaveLength(1);
    expect(via[0]).toMatch(/ss-power.*disagree on post \/ via \('foyer' vs 'plant'\)/);
    const five = chk([ev('s2:0'), ev('s2:1'), ev('s2:2'), ev('s2:3'), ev('s2:4')]);
    expect(five).toHaveLength(1);
    expect(five[0]).toMatch(/ss-power.*5 events, more than ORDER.maxMembers \(4\)/);
    // one name with no via is fine (each walks alone)
    const nv = { name: 'n', guardTag: 's2:1', postId: 'plant' };
    expect(chk([nv, { ...nv, guardTag: 's2:2' }])).toEqual([]);
  });
});

// ----- Wiring: EnemyManager (stand-in world, as hearing.test.ts) with Enemy probes (bare prototype, as
// postsWiring.test.ts), copied from missionOrdersManager.test.ts -----

function manager() {
  const world = { level: { lights: new LightRegistry(), cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] } };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const clear = vi.fn(() => true);
  return new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
}

interface Probe {
  num: number;
  zone: string;
  pos: { x: number; y: number; z: number };
  incident: number;
  orderSlot: number;
  leg: OrderLeg;
  walker: { rejoin: ReturnType<typeof vi.fn> };
  off: Set<number>;
  breakerReset: ReturnType<typeof vi.fn>;
  finishOrder(): void;
  resetBreaker(x: number, z: number, y: number, incident: number, group: number): void;
  calmDecide(dt: number): { point: P2 | null; speed: number; face: number | null };
  orderStep(dt: number): { point: P2 | null; speed: number; face: number | null };
}

let pn = 6000;
async function probe(x: number, z: number, zone: string, off = new Set<number>()): Promise<Probe> {
  const { Enemy: EnemyClass } = await import('../src/ai/enemy');
  const breakerReset = vi.fn((_e: Enemy, g: number) => off.delete(g));
  const e = Object.assign(Object.create(EnemyClass.prototype) as Enemy, {
    num: pn++, zone, section: 0, slotIdx: -1,
    aware: new AlertMachine(), health: { alive: true }, passive: false, taken: false, meter: 0, rate: 0, caution: 0,
    pos: { x, y: 0, z }, yaw: 0, los: false, post: [x, z] as P2, postDef: null, postYaw: 0,
    stimulus: [0, 0] as P2, hasStimulus: false, turnT: 0, pairFace: Number.NaN,
    incident: -1, incMode: 0, lure: new PostLure(), alarm: null, responder: false, crew: null, camBody: null,
    brkGroup: -1, brkSw: [0, 0] as P2, brkAt: [0, 0] as P2, brkY: 0, brkT: 0, brkWalkT: 0,
    brkGoal: { point: null, speed: 0, face: null },
    orders: null, orderSlot: -1, leg: new OrderLeg(), ordAt: false, ordP: [0, 0] as P2,
    ordGoal: { point: null, speed: 0, face: null },
    spot: [0, 0] as P2, spotSet: false, reviving: null, dog: null, routePath: [],
    lc: { active: false, stop() {} }, alertIn: { called: false },
    def: { walkSpeed: 1.5, kind: 'grunt', melee: null, quadruped: false },
    ctx: {
      coordinated: () => true, stealth: () => true, nav: { nearestWalkable: () => -1 }, radioCall: vi.fn(),
      breakerOff: (g: number) => off.has(g), breakerReset,
    } as unknown as AiContext,
    walker: { rejoin: vi.fn(), step: () => null, lookYaw: Number.NaN, route: null },
    bark: vi.fn(),
    off,
    breakerReset,
    // the nav: straight there (null when within `near`)
    goTo(p: P2, _dt: number, near = 0.6): P2 | null {
      return Math.hypot(p[0] - this.pos.x, p[1] - this.pos.z) < near ? null : p;
    },
  });
  return e as unknown as Probe;
}

const VIA: MissionPost = { id: 'via', x: 10, z: 0 };
const POST: MissionPost = { id: 'post', x: 10, z: 12 };

/** A manager with probes `ps` on its list and the via / post map. */
function world(ps: Probe[], posts: MissionPost[] = [VIA, POST]) {
  const em = manager();
  for (const p of ps) em.enemies.push(p as unknown as Enemy);
  em.setMissionMap(['s1'], posts);
  return em;
}
const tick = (em: EnemyManager, dt: number) => (em as unknown as { orderTick(dt: number): void }).orderTick(dt);
const dist = (a: Probe, b: Probe) => Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z);

/** One step of `dt`: each probe still on the list decides and walks at 1.5 m/s, then the manager's `orderTick`. */
function step(em: EnemyManager, dt = 0.1): void {
  for (const e of em.enemies) {
    const p = e as unknown as Probe;
    const g = p.calmDecide(dt);
    if (!g.point) continue;
    const dx = g.point[0] - p.pos.x;
    const dz = g.point[1] - p.pos.z;
    const d = Math.hypot(dx, dz);
    const k = Math.min(d, 1.5 * dt);
    if (d > 0) {
      p.pos.x += (dx / d) * k;
      p.pos.z += (dz / d) * k;
    }
  }
  if (em.orders.live > 0) tick(em, dt);
}

/** Step `secs`; phases of `name` seen (consecutive duplicates collapsed); `each` runs after every step. */
function run(em: EnemyManager, name: string, secs: number, seen: string[] = [], each?: () => void): string[] {
  for (let t = 0; t < secs; t += 0.1) {
    step(em);
    const ph = em.orderPhase(name);
    if (seen[seen.length - 1] !== ph) seen.push(ph);
    each?.();
  }
  return seen;
}

describe('Wiring: a group walks (S1b)', () => {
  it("both come, one at the via: 'gathering' -> 'walking' -> 'arrived' -> 'done'; leaves the step the second gets there; the follower ends through finishOrder", async () => {
    const a = await probe(-2, -4, 'g1');
    const b = await probe(10.5, -1, 'g2');
    const em = world([a, b]);
    em.missionOrder('g1', 'walk', 'post', 'via', 'grp');
    em.missionOrder('g2', 'walk', 'post', 'via', 'grp');
    const fin = vi.spyOn(b, 'finishOrder');
    const s = em.orders.find('grp');
    expect(em.orderPhase('grp')).toBe('gathering');
    expect(em.orders.lead[s]).toBe(a.num);
    expect(em.orderOf(a as unknown as Enemy)).toMatchObject({ group: true, lead: true, waitT: -1 });
    const seen: string[] = ['gathering'];
    let leftAt = -1;
    let aAt = -1;
    let k = 0;
    let gaps = 0;
    run(em, 'grp', 40, seen, () => {
      k++;
      if (aAt < 0 && a.leg.state === LEG_WAIT_VIA) aAt = k;
      if (leftAt < 0 && em.orders.left[s] === 1) leftAt = k;
      if (leftAt < 0) expect(Math.hypot(b.pos.x - 10.5, b.pos.z + 1)).toBe(0); // he waits where he is
      if (em.orderPhase('grp') === 'walking' && leftAt > 0) {
        expect(em.orderMembers('grp')).toBe(2);
        if (k > leftAt + 20 && a.leg.state === LEG_TO_POST) {
          gaps++;
          expect(dist(a, b)).toBeGreaterThanOrEqual(1.0);
          // (same pace: a follower who starts further back keeps that gap until the leader stops; the e2e bound)
          expect(dist(a, b)).toBeLessThanOrEqual(3.5);
        }
      }
    });
    expect(aAt).toBeGreaterThan(0);
    expect(leftAt).toBe(aAt);
    expect(gaps).toBeGreaterThan(10);
    expect(seen).toEqual(['gathering', 'walking', 'arrived', 'done']);
    expect(fin).toHaveBeenCalledTimes(1);
    expect(em.orders.cause[s]).toBe('lead');
    expect([a.orderSlot, b.orderSlot]).toEqual([-1, -1]);
    expect(a.walker.rejoin).toHaveBeenCalledTimes(1);
    expect(b.walker.rejoin).toHaveBeenCalledTimes(1);
  });

  it('a member busy at the event never joins; the other waits joinWait at the via (gathering), then walks alone', async () => {
    const a = await probe(0, 0, 'g1');
    const b = await probe(10, -2, 'g2');
    b.incident = 2;
    const em = world([a, b]);
    em.missionOrder('g1', 'walk', 'post', 'via', 'grp');
    em.missionOrder('g2', 'walk', 'post', 'via', 'grp');
    const s = em.orders.find('grp');
    expect(em.orders.stateOf(s, b.num)).toBe(M_DROPPED);
    expect(em.orders.cause[s]).toBe('busy');
    expect(b.orderSlot).toBe(-1);
    let at = -1;
    let left = -1;
    let t = 0;
    const seen = run(em, 'grp', 50, [], () => {
      t += 0.1;
      if (at < 0 && a.leg.state === LEG_WAIT_VIA) at = t;
      if (left < 0 && em.orders.left[s] === 1) {
        left = t;
        expect(em.orderPhase('grp')).toBe('walking');
        expect(em.orderMembers('grp')).toBe(1);
      }
      if (at > 0 && left < 0) expect(em.orderPhase('grp')).toBe('gathering');
    });
    expect(Math.abs(left - at - ORDER.joinWait)).toBeLessThanOrEqual(0.25);
    expect(seen).toEqual(['gathering', 'walking', 'arrived', 'done']);
    expect(b.orderSlot).toBe(-1);
    expect(em.orders.stateOf(s, b.num)).toBe(M_DROPPED);
  });

  // (lead decision 2026-10-26: joinWait starts at the leader's arrival) Split Shift's distance class: the leader comes
  // from 35 m out, past joinWait; the follower at the via waits for him and never walks out to meet him.
  it('the leader 35 m out, the follower at the via: gathering past joinWait; leaves the step the leader arrives; nobody walks back to a walking leader', async () => {
    const a = await probe(10, -35, 'g1');
    const b = await probe(10.5, -1, 'g2');
    const em = world([a, b]);
    em.missionOrder('g1', 'walk', 'post', 'via', 'grp');
    em.missionOrder('g2', 'walk', 'post', 'via', 'grp');
    const s = em.orders.find('grp');
    expect(em.orders.lead[s]).toBe(a.num);
    let k = 0;
    let aAt = -1;
    let leftAt = -1;
    let follows = 0;
    const seen = run(em, 'grp', 45, ['gathering'], () => {
      k++;
      if (aAt < 0 && a.leg.state === LEG_WAIT_VIA) aAt = k;
      if (leftAt < 0 && em.orders.left[s] === 1) leftAt = k;
      if (leftAt < 0) {
        expect(Math.hypot(b.pos.x - 10.5, b.pos.z + 1)).toBe(0); // he waits where he is
        if (aAt < 0) expect(em.orders.waitT[s]).toBe(-1); // no clock before the leader is there
      }
      // (check B polish 2) a follower never follows a leader still on his via leg
      if (b.leg.state === LEG_FOLLOW) {
        follows++;
        expect(a.leg.state).not.toBe(LEG_TO_VIA);
      }
    });
    expect(aAt * 0.1).toBeGreaterThan(ORDER.joinWait);
    expect(leftAt).toBe(aAt);
    expect(follows).toBeGreaterThan(0);
    expect(seen).toEqual(['gathering', 'walking', 'arrived', 'done']);
  });

  it('the leader drops on his way: the next member, at the via, leads and the clock starts then', async () => {
    const a = await probe(10, -35, 'g1');
    const b = await probe(10.5, -1, 'g2');
    const em = world([a, b]);
    em.missionOrder('g1', 'walk', 'post', 'via', 'grp');
    em.missionOrder('g2', 'walk', 'post', 'via', 'grp');
    const s = em.orders.find('grp');
    run(em, 'grp', 15);
    expect([em.orderPhase('grp'), em.orders.waitT[s]]).toEqual(['gathering', -1]);
    em.enemies.splice(0, 1);
    tick(em, 0.1);
    expect([em.orders.stateOf(s, a.num), em.orders.lead[s]]).toEqual([M_DROPPED, b.num]);
    expect(em.orders.waitT[s]).toBeCloseTo(0.1, 6);
    let left = -1;
    let t = 0.1;
    const seen = run(em, 'grp', 40, ['gathering'], () => {
      t += 0.1;
      if (left < 0 && em.orders.left[s] === 1) left = t;
    });
    expect(Math.abs(left - ORDER.joinWait)).toBeLessThanOrEqual(0.25);
    expect(seen).toEqual(['gathering', 'walking', 'arrived', 'done']);
  });

  it('a member given a breaker walk on another circuit on the way: dropped (task) at his next step; the other goes on', async () => {
    const a = await probe(9.5, 0, 'g1');
    const b = await probe(10.5, 0, 'g2');
    const em = world([a, b]);
    em.missionOrder('g1', 'walk', 'post', 'via', 'grp');
    em.missionOrder('g2', 'walk', 'post', 'via', 'grp');
    const s = em.orders.find('grp');
    run(em, 'grp', 2);
    expect(em.orders.left[s]).toBe(1);
    expect(b.leg.state).toBe(LEG_FOLLOW);
    b.off.add(57);
    b.resetBreaker(20, 0, 0, 9, 57);
    run(em, 'grp', 0.1);
    expect(b.orderSlot).toBe(-1);
    expect(em.orders.stateOf(s, b.num)).toBe(M_DROPPED);
    expect(em.orders.cause[s]).toBe('task');
    expect(em.orderMembers('grp')).toBe(1);
    const seen = run(em, 'grp', 30, ['walking']);
    expect(seen).toEqual(['walking', 'arrived', 'done']);
  });

  it('the leader knocked out on the last leg (off the list): dropped down; the follower leads, walks to the post and looks round', async () => {
    const a = await probe(9.5, 0, 'g1');
    const b = await probe(10.5, 0, 'g2');
    const em = world([a, b]);
    em.missionOrder('g1', 'walk', 'post', 'via', 'grp');
    em.missionOrder('g2', 'walk', 'post', 'via', 'grp');
    const s = em.orders.find('grp');
    run(em, 'grp', 3);
    expect([a.leg.state, b.leg.state]).toEqual([LEG_TO_POST, LEG_FOLLOW]);
    em.enemies.splice(0, 1);
    tick(em, 0.1);
    expect(em.orders.stateOf(s, a.num)).toBe(M_DROPPED);
    expect(em.orders.cause[s]).toBe('down');
    expect(em.orders.lead[s]).toBe(b.num);
    let looked = false;
    const seen = run(em, 'grp', 30, ['walking'], () => {
      if (b.leg.state === LEG_LOOK) looked = true;
    });
    expect(looked).toBe(true);
    expect(seen).toEqual(['walking', 'arrived', 'done']);
    expect(Math.hypot(b.pos.x - 10, b.pos.z - 12)).toBeLessThanOrEqual(ORDER.arrive);
  });

  it('a reset group on [55, 56]: only the leader works the board', async () => {
    const off = new Set([55, 56]);
    const a = await probe(9.5, 0, 'g1', off);
    const b = await probe(10.5, 0, 'g2', off);
    const board: MissionPost = { id: 'board', x: 10, z: 8, circuits: [55, 56] };
    const em = world([a, b], [VIA, board]);
    em.missionOrder('g1', 'reset', 'board', 'via', 'rg');
    em.missionOrder('g2', 'reset', 'board', 'via', 'rg');
    const seen = run(em, 'rg', 8 / 1.5 + BREAKER.resetT + 4);
    expect(seen[seen.length - 1]).toBe('done');
    expect(a.breakerReset.mock.calls.map((c) => c[1])).toEqual([55, 56]);
    expect(b.breakerReset).not.toHaveBeenCalled();
    expect(off.size).toBe(0);
  });

  it("a lone order with a via (one event): never 'gathering'; S1a's phases", async () => {
    const a = await probe(0, 0, 'g1');
    const em = world([a]);
    em.missionOrder('g1', 'walk', 'post', 'via', 'one');
    const seen = run(em, 'one', 30, [em.orderPhase('one')]);
    expect(seen).toEqual(['walking', 'arrived', 'done']);
  });

  it('flag off: two events of one name do nothing', async () => {
    flags.missionOrders = false;
    const a = await probe(0, 0, 'g1');
    const b = await probe(10, -2, 'g2');
    const em = world([a, b]);
    em.missionOrder('g1', 'walk', 'post', 'via', 'grp');
    em.missionOrder('g2', 'walk', 'post', 'via', 'grp');
    expect(em.orders.live).toBe(0);
    expect(em.orderPhase('grp')).toBe('none');
    expect([a.orderSlot, b.orderSlot]).toEqual([-1, -1]);
  });

  it('no allocation: across 200 steps of a gathering group and a follow, the board arrays and the goal objects keep their identity', async () => {
    const a = await probe(-10, 0, 'g1');
    const b = await probe(10.5, 0, 'g2');
    const em = world([a, b]);
    em.missionOrder('g1', 'walk', 'post', 'via', 'grp');
    em.missionOrder('g2', 'walk', 'post', 'via', 'grp');
    const o = em.orders;
    const arrs = [o.mem, o.gath, o.leadP, o.memVia, o.waitT];
    const goals = [a.leg.goal, b.leg.goal];
    const g0 = b.orderStep(0.1);
    let follow = false;
    for (let k = 0; k < 200; k++) {
      step(em);
      if (b.leg.state === LEG_FOLLOW) follow = true;
    }
    expect(follow).toBe(true);
    expect([o.mem, o.gath, o.leadP, o.memVia, o.waitT]).toEqual(arrs);
    [o.mem, o.gath, o.leadP, o.memVia, o.waitT].forEach((x, i) => expect(x).toBe(arrs[i]));
    expect(a.leg.goal).toBe(goals[0]);
    expect(b.leg.goal).toBe(goals[1]);
    expect(b.orderStep(0.1)).toBe(g0);
  });
});
