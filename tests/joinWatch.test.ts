import { describe, expect, it } from 'vitest';
import { JOIN_GAP_S, JOIN_PLACE, JOIN_RESYNC, JOIN_REVIVE_QUIET_S, JOIN_WATCH_S, JoinWatch, RESTORE_REPEAT_S } from '../src/net/joinWatch';
import type { SlotPoint } from '../src/game/spawnSlots';

/** (coop-rejoin fix round, check A B1 / P1 / P2) The host's watch over a client the match went to again: it places the
 *  client on its reload, not on states from its old match, a kept-up match or a teleport the host sent. */

const pt = (x: number, z: number, yaw = 0): SlotPoint => ({ x, y: 0, z, yaw });
/** Sector Ops: the client's match loads at section 1's start; the host and the held spot are in section 3. */
const START = [pt(2, 10), pt(2, 12)];
const HELD = pt(140, 20, 1);
const STEP = 0.05;

/** A client driven at 20 states a second: `prev` is the host's previous accepted state, as CoopHost passes it. */
class Client {
  prev: { x: number; z: number } | null;
  t = 0;
  placed = 0;
  resynced = 0;
  constructor(
    readonly w: JoinWatch,
    at: { x: number; z: number } | null,
  ) {
    this.prev = at ? { x: at.x, z: at.z } : null;
  }
  /** One state at (x, z): what the watch says; the restore step after it (as `CoopHost.restoreStep`). */
  send(x: number, z: number): number {
    this.t += STEP;
    const j = this.w.state('C', this.prev, x, z, this.t);
    if (j & JOIN_RESYNC) this.resynced++;
    if (j & JOIN_PLACE) {
      this.placed++;
      this.w.place('C', pt(100, 0), this.t);
    }
    this.prev = { x, z };
    this.w.restoreStep('C', x, z, this.t);
    return j;
  }
}

describe('the join watch (B1): placed on its reload, not on its old match', () => {
  it('old-match states at the held spot first, then the reload jump: placed at once (and resynced once)', () => {
    const w = new JoinWatch();
    w.hold('C', HELD);
    w.late('C', START, 0);
    const c = new Client(w, HELD);
    w.resume('C', 0);
    // its old match (page open while it waited for the host): still at the held spot; the held restore is met
    for (let i = 0; i < 10; i++) expect(c.send(140, 20) & JOIN_PLACE).toBe(0);
    expect(w.restoring('C')).toBe(false);
    expect(w.watching('C')).toBe(true);
    // the `start` reached it: its match reloaded at section 1 (slot 1)
    expect(c.send(2, 12) & JOIN_PLACE).toBe(JOIN_PLACE);
    expect(c.placed).toBe(1);
    expect(c.resynced).toBe(1);
    expect(w.heldSpot('C')).toEqual(HELD);
    // the restore repeats until it stands at the placed spot, then the watch ends
    expect(w.restoring('C')).toBe(true);
    for (let i = 0; i < 5; i++) c.send(2, 12);
    expect(c.send(100, 0) & JOIN_PLACE).toBe(0);
    expect(w.restoring('C')).toBe(false);
    expect(w.watching('C')).toBe(false);
    expect(c.placed).toBe(1);
  });

  it('a slow load: old-match states, a gap of more than the watch time while it loads, then the reload: still placed', () => {
    const w = new JoinWatch();
    w.late('C', START, 0);
    const c = new Client(w, HELD);
    for (let i = 0; i < 10; i++) c.send(140, 20);
    c.t += JOIN_WATCH_S + 5;
    expect(c.send(2, 10) & JOIN_PLACE).toBe(JOIN_PLACE);
  });

  it('a new-tab rejoin (its first state is the reload) and a late join (no state before): placed on the first state', () => {
    const w = new JoinWatch();
    w.hold('C', HELD);
    w.late('C', START, 0);
    w.resume('C', 0);
    expect(new Client(w, HELD).send(2, 12)).toBe(JOIN_RESYNC | JOIN_PLACE);
    const w2 = new JoinWatch();
    w2.late('C', START, 0);
    expect(new Client(w2, null).send(60, 60)).toBe(JOIN_RESYNC | JOIN_PLACE);
  });

  it('a repeated `late` (one per hello) keeps the open watch: one resync, the reload still placed', () => {
    const w = new JoinWatch();
    w.late('C', START, 0);
    const c = new Client(w, HELD);
    c.send(140, 20);
    w.late('C', START, c.t);
    c.send(140, 20);
    expect(c.send(2, 12) & JOIN_PLACE).toBe(JOIN_PLACE);
    expect(c.resynced).toBe(1);
  });

  it('(coop-rejoin-2) a restart during the load: the reload after the gap is placed, though the revive is in flight', () => {
    const w = new JoinWatch();
    w.hold('C', HELD);
    w.late('C', START, 0);
    w.resume('C', 0);
    const c = new Client(w, HELD);
    for (let i = 0; i < 10; i++) c.send(140, 20);
    // it loads for 5 s; 4 s in, a checkpoint restart moves its host copy (the revive never reaches the loading page)
    c.t += 4;
    w.respawned('C', c.t);
    // the reload's first state, 1 s after the restart (inside JOIN_REVIVE_QUIET_S) and 5 s after its last state
    c.t += 1 - STEP;
    expect(c.send(2, 12) & JOIN_PLACE).toBe(JOIN_PLACE);
    expect(c.placed).toBe(1);
  });
});

describe('the join watch: never placed without a reload', () => {
  it('a kept-up client walking on: never placed; the watch ends after its time', () => {
    const w = new JoinWatch();
    w.late('C', START, 0);
    const c = new Client(w, HELD);
    let x = 140;
    for (let i = 0; i < (JOIN_WATCH_S + 1) / STEP; i++) {
      x += 0.2;
      c.send(x, 20);
    }
    expect(c.placed).toBe(0);
    expect(c.resynced).toBe(1);
    expect(w.watching('C')).toBe(false);
  });

  it('(check A P1) a kept-up client that moved 3 m or more in a gap the host did not see: not yanked', () => {
    const w = new JoinWatch();
    w.late('C', START, 0);
    const c = new Client(w, HELD);
    // the host's last state of it is stale (HELD); it walked 6 m during the gap
    expect(c.send(146, 20) & JOIN_PLACE).toBe(0);
    for (let i = 0; i < 20; i++) c.send(146, 20 + i * 0.1);
    expect(c.placed).toBe(0);
  });

  it('a teleport the host sent (camera hallway `back`, a revive) is not a reload, even into the start area', () => {
    const w = new JoinWatch();
    w.late('C', START, 0);
    const c = new Client(w, pt(8, 10));
    c.send(8, 10);
    // the host sends it back to the hallway's start (inside its start area): its copy moves at once, its states follow
    w.moved('C', c.t, 3);
    c.prev = { x: 2, z: 10 };
    expect(c.send(8, 10) & JOIN_PLACE).toBe(0);
    expect(c.send(2, 10) & JOIN_PLACE).toBe(0);
    expect(c.placed).toBe(0);
    // a revive at a checkpoint restart: the same
    w.respawned('C', c.t);
    c.prev = { x: 2, z: 12 };
    expect(c.send(8, 10) & JOIN_PLACE).toBe(0);
    // still in flight, no load gap between (a gap that began before the revive is checked: the coop-rejoin-2 test; a
    // stall after a post-revive state is not: the check A1 test)
    expect(JOIN_GAP_S - 0.2 + STEP).toBeLessThan(JOIN_REVIVE_QUIET_S);
    c.t += JOIN_GAP_S - 0.2;
    expect(c.send(2, 12) & JOIN_PLACE).toBe(0);
    expect(c.placed).toBe(0);
  });

  it('(check A1) a stale pre-teleport state after the revive, then a 1.5 s stall, then the start area: not placed', () => {
    const w = new JoinWatch();
    w.late('C', START, 0);
    const c = new Client(w, pt(8, 10));
    for (let i = 0; i < 5; i++) c.send(8, 10);
    // a revive at a checkpoint restart; its last pre-revive state arrives after it (accepted in the teleport grace)
    w.respawned('C', c.t);
    c.send(8, 10);
    // a 1.5 s stall (a long task), a load gap still inside the revive's in-flight time, then its first post-revive state
    expect(1.5 + 2 * STEP).toBeLessThan(JOIN_REVIVE_QUIET_S);
    expect(1.5 + STEP).toBeGreaterThan(JOIN_GAP_S);
    c.t += 1.5;
    expect(c.send(2, 12) & JOIN_PLACE).toBe(0);
    expect(c.placed).toBe(0);
  });

  it('a jump onto the held restore it was sent is that restore, not a reload', () => {
    const w = new JoinWatch();
    w.hold('C', pt(3, 11));
    w.late('C', START, 0);
    w.resume('C', 0);
    const c = new Client(w, pt(9, 11));
    c.prev = { x: 9, z: 11 };
    expect(c.send(3, 11) & JOIN_PLACE).toBe(0);
  });
});

describe('the restore repeat', () => {
  it('goes out every half second until the client stands there, for 30 s at most', () => {
    const w = new JoinWatch();
    w.place('C', pt(10, 10), 0);
    expect(w.restoreStep('C', 0, 0, 0.05)).not.toBeNull();
    expect(w.restoreStep('C', 0, 0, 0.1)).toBeNull();
    expect(w.restoreStep('C', 0, 0, 0.06 + RESTORE_REPEAT_S)).not.toBeNull();
    expect(w.restoreStep('C', 10.5, 10, 1)).toBeNull();
    expect(w.restoring('C')).toBe(false);
    w.place('C', pt(10, 10), 0);
    expect(w.restoreStep('C', 0, 0, 31)).toBeNull();
    expect(w.restoring('C')).toBe(false);
  });

  it('(check A P2) a checkpoint restart during the repeat stops it: the partner is not pulled back to the join spot', () => {
    const w = new JoinWatch();
    w.late('C', START, 0);
    w.place('C', pt(100, 0), 0);
    expect(w.restoreStep('C', 2, 12, 0.05)).not.toBeNull();
    w.respawned('C', 0.2);
    expect(w.restoring('C')).toBe(false);
    for (let t = 0.3; t < 5; t += 0.1) expect(w.restoreStep('C', 50, 50, t)).toBeNull();
    // a held spot's repeat stops the same way
    w.hold('C', HELD);
    w.resume('C', 1);
    w.respawned('C', 1);
    expect(w.restoreStep('C', 50, 50, 1.5)).toBeNull();
  });

  it('(coop-rejoin-2) a drop while its placement restore is unmet ends the watch: the next rejoin is placed on its reload', () => {
    const w = new JoinWatch();
    w.late('C', START, 0);
    const c = new Client(w, HELD);
    c.send(140, 20);
    expect(c.send(2, 12) & JOIN_PLACE).toBe(JOIN_PLACE);
    // it walks off before the placement restore is met, then drops again
    for (let x = 2.5; x <= 20; x += 0.5) c.send(x, 12);
    expect(w.restoring('C')).toBe(true);
    w.hold('C', pt(20, 12));
    expect(w.watching('C')).toBe(false);
    // the rejoin: its old match meets the new held restore, then the reload after the load gap
    c.t += 3;
    w.late('C', START, c.t);
    w.resume('C', c.t);
    for (let i = 0; i < 5; i++) expect(c.send(20, 12) & JOIN_PLACE).toBe(0);
    expect(w.restoring('C')).toBe(false);
    expect(w.watching('C')).toBe(true);
    c.t += 3;
    expect(c.send(2, 10) & JOIN_PLACE).toBe(JOIN_PLACE);
    expect(c.placed).toBe(2);
  });

  it('a watch ends with its client (left for good)', () => {
    const w = new JoinWatch();
    w.hold('C', HELD);
    w.late('C', START, 0);
    w.drop('C');
    expect(w.watching('C')).toBe(false);
    expect(w.restoring('C')).toBe(false);
    expect(JOIN_GAP_S).toBeLessThan(JOIN_WATCH_S);
  });
});

describe('JoinWatch.rehold (coop4 round fix: a held OUT player returned at the connector)', () => {
  it('points the held restore at the new spot; a watch its rejoin opened stays open (its first state still resyncs)', () => {
    const w = new JoinWatch();
    w.hold('C', HELD);
    w.late('C', START, 1);
    w.rehold('C', pt(200, 30, 2));
    expect(w.watching('C')).toBe(true);
    expect(w.heldSpot('C')).toEqual(pt(200, 30, 2));
    expect(w.restores.get('C')).toMatchObject({ x: 200, z: 30, yaw: 2 });
    expect(w.state('C', null, 2, 10, 1.05) & JOIN_RESYNC).toBe(JOIN_RESYNC);
    // before any rejoin: just the restore moves (no watch opened)
    const v = new JoinWatch();
    v.hold('D', HELD);
    v.rehold('D', pt(5, 6));
    expect(v.watching('D')).toBe(false);
    v.resume('D', 2);
    expect(v.restoreStep('D', 140, 20, 2)).toMatchObject({ x: 5, z: 6 });
  });
});
