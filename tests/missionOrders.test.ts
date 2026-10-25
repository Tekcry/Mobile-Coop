import { describe, expect, it } from 'vitest';
import {
  checkMissionOrders, findPost, K_RESET, K_WALK, LEG_DONE, LEG_GIVEUP, LEG_LOOK, LEG_RESET, LEG_TO_POST, LEG_TO_VIA,
  M_ARRIVED, M_DONE, M_DROPPED, M_WALKING, matchesTag, ORDER, OrderBoard, OrderLeg, resolvePoint,
  type MissionPost, type OrderEvent, type OrderSection,
} from '../src/ai/missionOrders';
import { POST } from '../src/ai/posts';
import type { RoomRect } from '../src/world/rooms';

// (guard-ai-mission-hooks S1a, D7, A1-A8) The pure half of mission orders: tag match, post / room resolve, the order
// board (fixed slots, phases from the members), the walk stepper and the mission data check (C4).

const room = (id: string, minX: number, maxX: number, minZ: number, maxZ: number, minY?: number): RoomRect =>
  ({ id, name: id, minX, maxX, minZ, maxZ, ...(minY !== undefined ? { minY } : {}) });
const angDiff = (a: number, b: number): number => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

describe('ORDER, matchesTag, resolvePoint', () => {
  it('holds the prototype values', () => {
    expect(ORDER).toEqual({
      lookT: 8, joinWait: 20, followGap: 1.5, atVia: 2.5, giveUp: 120, bellTier: 1, maxOrders: 8, maxMembers: 4, arrive: 0.8,
    });
  });

  it('matches by zone tag or by <sectionId>:<k> only', () => {
    expect(matchesTag('w3-lodge-porter', 'w3-lodge-porter', 'w3', 2)).toBe(true);
    expect(matchesTag('s2:6', '', 's2', 6)).toBe(true);
    expect(matchesTag('s2:6', '', 's3', 6)).toBe(false);
    expect(matchesTag('s2:6', '', 's2', 5)).toBe(false);
    expect(matchesTag('s2:-1', '', 's2', -1)).toBe(false);
    expect(matchesTag('', '', 's2', 0)).toBe(false);
    expect(matchesTag(':0', '', '', 0)).toBe(false);
  });

  it('resolves a post (y and yaw kept), else a room centre on its storey; a post wins; unknown is false', () => {
    const posts: MissionPost[] = [{ id: 'p', x: 3, z: 4, y: 2, yaw: 1 }, { id: 'hall', x: 50, z: 60 }];
    const rooms = [room('hall', 0, 10, 20, 30), room('loft', 0, 4, 0, 8, 3.5)];
    const out = new Float32Array(4);
    expect(findPost('p', posts)).toBe(posts[0]);
    expect(findPost('q', posts)).toBeNull();
    expect(resolvePoint('p', posts, rooms, out)).toBe(true);
    expect(Array.from(out)).toEqual([3, 2, 4, 1]);
    expect(resolvePoint('loft', posts, rooms, out)).toBe(true);
    expect(Array.from(out.subarray(0, 3))).toEqual([2, 3.5, 4]);
    expect(out[3]).toBeNaN();
    expect(resolvePoint('hall', posts, rooms, out)).toBe(true);
    expect([out[0], out[2]]).toEqual([50, 60]);
    expect(out[1]).toBeNaN();
    expect(resolvePoint('nowhere', posts, rooms, out)).toBe(false);
  });
});

describe('OrderBoard', () => {
  it('joins a running order, fills up, then reuses the oldest ended slot', () => {
    const b = new OrderBoard();
    const s = b.open('a', K_WALK);
    expect(b.add(s, 1, M_WALKING)).toBe(true);
    expect(b.open('a', K_RESET)).toBe(s);
    expect(b.kind[s]).toBe(K_WALK);
    for (let i = 1; i < ORDER.maxOrders; i++) b.add(b.open('o' + i, K_WALK), 100 + i, M_WALKING);
    expect(b.open('x', K_WALK)).toBe(-1);
    const s5 = b.find('o5');
    const s2 = b.find('o2');
    b.set(s5, 105, M_DONE);
    b.set(s2, 102, M_DROPPED, 'giveUp');
    expect(b.open('x', K_WALK)).toBe(s2);
    expect(b.cause[s2]).toBe('');
    expect(b.open('y', K_WALK)).toBe(s5);
    expect(b.open('z', K_WALK)).toBe(-1);
    expect(b.live).toBe(ORDER.maxOrders - 2);
  });

  it('a name whose order ended opens fresh in its own slot', () => {
    const b = new OrderBoard();
    const s = b.open('a', K_WALK);
    b.add(s, 1, M_DONE);
    expect(b.phase[s]).toBe('done');
    expect(b.open('a', K_RESET)).toBe(s);
    expect(b.phase[s]).toBe('offered');
    expect(b.memN[s]).toBe(0);
    expect(b.kind[s]).toBe(K_RESET);
  });

  it('takes any member id, caps at maxMembers and keeps live exact', () => {
    const b = new OrderBoard();
    const s = b.open('a', K_WALK);
    for (let i = 0; i < ORDER.maxMembers; i++) expect(b.add(s, 9000 + i * 31, M_WALKING)).toBe(true);
    expect(b.add(s, 9999, M_WALKING)).toBe(false);
    expect(b.liveN(s)).toBe(ORDER.maxMembers);
    b.set(s, 9031, M_DROPPED, 'held');
    expect(b.live).toBe(ORDER.maxMembers - 1);
    expect(b.cause[s]).toBe('held');
    // a second offer that drops never drops a member on his way
    b.add(s, 9000, M_DROPPED, 'order');
    expect(b.live).toBe(ORDER.maxMembers - 1);
  });

  it('phases follow the members: walking -> arrived -> done; all dropped; a pending tag reads offered', () => {
    const b = new OrderBoard();
    const s = b.open('a', K_WALK);
    expect(b.phase[s]).toBe('offered');
    b.add(s, 7, M_WALKING);
    b.add(s, 8, M_DROPPED, 'busy');
    expect(b.phase[s]).toBe('walking');
    b.set(s, 7, M_ARRIVED);
    expect(b.phase[s]).toBe('arrived');
    b.set(s, 7, M_DONE);
    expect(b.phase[s]).toBe('done');
    expect(b.live).toBe(0);
    const d = b.open('d', K_WALK);
    b.add(d, 1, M_DROPPED, 'alerted');
    expect([b.phase[d], b.cause[d]]).toEqual(['dropped', 'alerted']);
    const p = b.open('p', K_WALK);
    b.pend[p] = 'w3-lodge-porter';
    b.pendN++;
    b.refresh(p);
    expect(b.phase[p]).toBe('offered');
  });

  it('holds a circuit only while a reset member is live; fail drops; clear frees and keeps identity', () => {
    const b = new OrderBoard();
    const s = b.open('r', K_RESET);
    const circ = [55, 56];
    b.circuits[s] = circ;
    expect(b.holdsCircuit(55)).toBe(false);
    b.add(s, 3, M_WALKING);
    expect([b.holdsCircuit(55), b.holdsCircuit(56), b.holdsCircuit(57), b.hasCircuit(s, 56)]).toEqual([true, true, false, true]);
    expect(b.circuits[s]).toBe(circ);
    b.set(s, 3, M_DONE);
    expect(b.holdsCircuit(55)).toBe(false);
    b.fail('bad', 'post');
    expect(b.phase[b.find('bad')]).toBe('dropped');
    expect(b.cause[b.find('bad')]).toBe('post');
    const p = b.open('p', K_WALK);
    b.pend[p] = 't';
    b.pendN++;
    const ids = [b.name, b.phase, b.kind, b.pt, b.face, b.via, b.circuits, b.bell, b.pend, b.cause, b.seq, b.mem, b.memSt, b.memN];
    b.clear();
    const after = [b.name, b.phase, b.kind, b.pt, b.face, b.via, b.circuits, b.bell, b.pend, b.cause, b.seq, b.mem, b.memSt, b.memN];
    for (let i = 0; i < ids.length; i++) expect(after[i]).toBe(ids[i]);
    expect([b.live, b.pendN, b.find('r'), b.find('bad')]).toEqual([0, 0, -1, -1]);
    expect(b.phase.every((ph) => ph === 'none')).toBe(true);
    expect(b.mem.every((m) => m === -1)).toBe(true);
    expect(b.pt.every((v) => Number.isNaN(v))).toBe(true);
  });
});

describe('OrderLeg', () => {
  function board(kind: number, pt: [number, number, number], via?: [number, number]): { b: OrderBoard; s: number } {
    const b = new OrderBoard();
    const s = b.open('o', kind);
    b.pt.set(pt, s * 3);
    if (via) b.via.set([via[0], Number.NaN, via[1]], s * 3);
    return { b, s };
  }

  it('walks by the via to the post, looks round within the sweep, then is done; same goal object', () => {
    const { b, s } = board(K_WALK, [10, Number.NaN, 0], [5, 0]);
    const leg = new OrderLeg();
    leg.start(b, s, 0, 0);
    expect(leg.state).toBe(LEG_TO_VIA);
    const g = leg.step(0.1, b, s, 0, 0, 0);
    expect([g.move, g.x, g.z]).toEqual([true, 5, 0]);
    expect(leg.step(0.1, b, s, 3, 0, 0.5)).toBe(g); // within atVia: aims at the post this step
    expect([leg.state, g.move, g.x]).toEqual([LEG_TO_POST, true, 10]);
    leg.step(0.1, b, s, 9.5, 0, 0);
    expect([leg.state, g.move]).toEqual([LEG_LOOK, false]);
    expect(leg.base).toBeCloseTo(Math.PI / 2); // the arrival heading, via -> post
    let t = 0;
    while (leg.state === LEG_LOOK && t < 20) {
      expect(leg.step(0.1, b, s, 10, 0, 0)).toBe(g);
      if (leg.state === LEG_LOOK) expect(angDiff(g.face, leg.base)).toBeLessThanOrEqual(POST.lureSweep + 1e-6);
      t += 0.1;
    }
    expect(leg.state).toBe(LEG_DONE);
    expect(t).toBeCloseTo(ORDER.lookT, 0);
    expect([g.move, Number.isNaN(g.face)]).toEqual([false, true]);
  });

  it('looks round the post yaw when it has one; needs the post storey', () => {
    const { b, s } = board(K_WALK, [2, 0, 2]);
    b.face[s * 3 + 2] = -1;
    const leg = new OrderLeg();
    leg.start(b, s, 0, 0);
    expect(leg.state).toBe(LEG_TO_POST);
    leg.step(0.1, b, s, 2, 3, 2); // one storey up
    expect(leg.state).toBe(LEG_TO_POST);
    leg.step(0.1, b, s, 2, 0.2, 2);
    expect([leg.state, leg.base]).toEqual([LEG_LOOK, -1]);
  });

  it('a reset post stands at the board facing its switch; the leg keeps time for the caller', () => {
    const { b, s } = board(K_RESET, [2, 0, 2]);
    b.face.set([3, 2], s * 3);
    const leg = new OrderLeg();
    leg.start(b, s, -5, 2);
    const g = leg.step(0.1, b, s, 2, 0, 2.3);
    expect([leg.state, g.move, g.x, g.z]).toEqual([LEG_RESET, false, 2, 2]);
    expect(g.face).toBeCloseTo(Math.atan2(1, -0.3));
    leg.step(1.5, b, s, 2, 0, 2);
    expect(leg.t).toBeCloseTo(1.5);
    expect(g.face).toBeCloseTo(Math.PI / 2);
    expect(leg.state).toBe(LEG_RESET);
  });

  it('gives up after giveUp seconds of walking', () => {
    const { b, s } = board(K_WALK, [50, Number.NaN, 0]);
    const leg = new OrderLeg();
    leg.start(b, s, 0, 0);
    leg.step(ORDER.giveUp - 1, b, s, 0, 0, 0);
    expect(leg.state).toBe(LEG_TO_POST);
    const g = leg.step(1, b, s, 0, 0, 0);
    expect([leg.state, g.move]).toEqual([LEG_GIVEUP, false]);
  });
});

describe('checkMissionOrders', () => {
  // Two-Key-like: W3, the porter (slot 2) posted at (117, 48) in the lodge, the bell on its inner wall.
  const w3 = (porter: Partial<OrderSection['guards'][number]> = {}): OrderSection => ({
    id: 'w3',
    guards: [{ x: 112, z: 46 }, { x: 90, z: 40, zone: 'w3-yard' }, { x: 117, z: 48, zone: 'w3-lodge-porter', ...porter }],
  });
  const tkRooms = [room('w3-lodge', 114, 120, 44, 52), room('w3-passage', 96, 106, 52, 55.5, 0)];
  const tkPost = (reach = 20): MissionPost => ({ id: 'w3-passage', x: 101, z: 53.75, y: 0, bell: { x: 118.5, y: 1.5, z: 50, reach } });
  const tkEv: OrderEvent = { name: 'telltale', guardTag: 'w3-lodge-porter', postId: 'w3-passage' };
  // Split-Shift-like: S2, #7 (s2:6) and #1 (s2:0) by reception (a room id) to the plant board on 55 / 56.
  const s2: OrderSection = { id: 's2', guards: Array.from({ length: 7 }, (_, k) => ({ x: -20 + k * 3, z: -24 })) };
  const ssRooms = [room('foyer', -24, -12, -28, -20), room('plant', -6, 2, -20, -14)];
  const ssPosts = (circuits = [55, 56]): MissionPost[] => [{ id: 's2-plant-board', x: -2, z: -17, y: 0, circuits }];
  const ssEv = (tag: string, via = 'foyer'): OrderEvent => ({ name: 'ss-power', guardTag: tag, postId: 's2-plant-board', via });
  const tk = (sec = w3(), post = tkPost(), ev = tkEv, noisy: OrderSection['noisy'] = []) =>
    checkMissionOrders([ev], [sec], [post], tkRooms, noisy ?? []);
  const ss = (posts = ssPosts(), evs = [ssEv('s2:6'), ssEv('s2:0')]) => checkMissionOrders(evs, [s2], posts, ssRooms, []);
  const one = (errs: string[], re: RegExp): void => {
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(re);
  };

  it('passes the Two-Key and Split Shift data', () => {
    expect(tk()).toEqual([]);
    expect(ss()).toEqual([]);
  });

  it('names one error per fault', () => {
    one(tk(w3(), tkPost(), { ...tkEv, guardTag: 'w3-nobody' }), /telltale.*matches no guard/);
    one(tk(w3(), tkPost(), { ...tkEv, postId: 'w3-nowhere' }), /post 'w3-nowhere' is neither/);
    one(ss(ssPosts(), [ssEv('s2:6', 'nowhere')]), /ss-power.*via 'nowhere' is neither/);
    one(tk(w3({ post: { leash: 0, highSecurity: true } })), /w3:2 stands a high-security post/);
    one(tk(w3({ post: { leash: 1, lookout: true } })), /w3:2 stands a lookout post/);
    one(ss(ssPosts([55.5, 56])), /circuit 55.5 is not an integer/);
    one(ss(ssPosts([55, -1])), /circuit -1 is not an integer/);
    one(ss(ssPosts([])), /empty circuits/);
    one(ss([...ssPosts(), { id: 's2-plant-board', x: 0, z: 0 }]), /duplicate post id/);
    one(tk(w3(), tkPost(0)), /bell reach 0/);
  });

  it('fails a bell the tagged guard would not hear through one wall plus masking', () => {
    one(tk(w3({ x: 118.5, z: 25 })), /w3:2 would not hear the bell.*25\.0 m/);
    const gen = [{ id: 'gen', x: 117, z: 48, radius: 10, db: 12 }];
    one(tk(w3(), tkPost(), tkEv, gen), /would not hear the bell.*12\.0 dB/);
    one(tk({ ...w3(), noisy: gen }), /would not hear the bell/); // the section's own sources win
    // the tier function is the caller's (C4 passes the game's)
    expect(checkMissionOrders([tkEv], [w3()], [tkPost()], tkRooms, [], () => 0)).toHaveLength(1);
  });
});
