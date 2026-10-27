/**
 * (guard-ai mill-hunt H2) The hunt board (`src/ai/millHunt.ts`): the order, rank, step rules, admission and the start
 * spread as unit tests, then a kinematic sim (straight legs at `HUNT.pace`, the calm turn rate) of the mill's 12- and
 * 16-guard sets on a test `HuntDef` shaped like the mill (two lines of six rooms, the PLAN's phase rows). The sim helper
 * (`tests/helpers/millHuntSim.ts`) takes any `HuntDef` and guard set; `tests/millHuntThornbeck.test.ts` runs the same
 * checks on the real `THORNBECK_HUNT`.
 */
import { describe, expect, it } from 'vitest';
import { H_HOLD, H_MOVE, H_REGROUP, H_SPREAD, HUNT } from '../src/ai/millHunt';
import { wrapAng } from '../src/ai/sceneSweep';
import { bytesPerCall } from './helpers/allocPerCall';
import {
  DECK,
  DT,
  endState,
  HuntWorld,
  runHunt,
  SET_12,
  SET_16,
  SimGuard,
  type SimSlot,
  TEST_HUNT,
} from './helpers/millHuntSim';


// ---- unit tests ---------------------------------------------------------------------------------------------------

/** Ground stop k / gallery stop k as board stop indices (the test def: 14 ground stops, then 10 gallery stops). */
const S = (k: number): number => k;
const G = (k: number): number => 14 + k;

/** A world with the given slots of `set` admitted in order (all others not spawned). */
function worldWith(set: readonly SimSlot[], ks: readonly number[]): HuntWorld {
  const w = new HuntWorld(TEST_HUNT);
  for (const k of ks) expect(w.board.admit(w.spawn(set, k))).toBe(true);
  return w;
}

/** Solos placed exactly on stops (leader spot). */
function solosAt(stops: readonly number[]): HuntWorld {
  const b0 = new HuntWorld(TEST_HUNT).board;
  const set: SimSlot[] = stops.map((s) => ({
    x: b0.sx[s]!,
    z: b0.sz[s]!,
    y: b0.lineY[b0.stopLine[s]!]!,
  }));
  return worldWith(
    set,
    set.map((_, k) => k),
  );
}

/** Pairs placed exactly on stops (leader and partner spots). */
function pairsAt(stops: readonly number[]): HuntWorld {
  const b0 = new HuntWorld(TEST_HUNT).board;
  const set: SimSlot[] = [];
  stops.forEach((s, k) => {
    const y = b0.lineY[b0.stopLine[s]!]!;
    set.push({ x: b0.sx[s]!, z: b0.sz[s]!, y, pair: 2 * k + 1 }, { x: b0.sx2[s]!, z: b0.sz2[s]!, y, pair: 2 * k });
  });
  return worldWith(
    set,
    set.map((_, k) => k),
  );
}

function run(w: HuntWorld, secs: number): void {
  for (let n = Math.round(secs / DT); n > 0; n--) w.step();
}

describe('mill hunt: the order (A4, FIX 1)', () => {
  it('phase 0 targets the phase rooms` stops nearest W1; a cleared phase steps on at phaseMin; the last row holds', () => {
    const w = new HuntWorld(TEST_HUNT);
    const b = w.board;
    expect(b.tgt[0]).toBe(S(1));
    expect(b.tgt[1]).toBe(G(2));
    run(w, 59.6);
    expect(b.phase).toBe(0);
    run(w, 0.8);
    // no units: every line counts as cleared, so the phase steps at phaseMin
    expect(b.phase).toBe(1);
    // the aisle's stop nearest the start bay's target, crane west's only stop
    expect(b.tgt[0]).toBe(S(3));
    expect(b.tgt[1]).toBe(G(4));
    run(w, 1000);
    expect(b.phase).toBe(b.nPhases - 1);
    expect(b.roomIds[b.targetRoom(0)]).toBe('lobby');
    expect(b.roomIds[b.targetRoom(1)]).toBe('eastEnd');
  });

  it('an uncleared target room holds the phase until phaseMax', () => {
    const w = solosAt([S(12)]);
    const b = w.board;
    run(w, 119.6);
    expect(b.phase).toBe(0);
    run(w, 0.8);
    expect(b.phase).toBe(1);
  });

  it('setTarget: the point`s line and stop, the first row naming its room (none: 0), the other line`s phase room, the clock restarts', () => {
    const w = new HuntWorld(TEST_HUNT);
    const b = w.board;
    run(w, 30);
    b.setTarget(22.5, 6.0, 0);
    expect(b.phase).toBe(2);
    expect(b.phaseT).toBe(0);
    expect(b.tgt[0]).toBe(S(7));
    expect(b.tgt[1]).toBe(G(5));
    b.setTarget(2, 16, DECK);
    expect(b.phase).toBe(0);
    expect(b.tgt[1]).toBe(G(0));
    expect(b.tgt[0]).toBe(S(0));
    b.setTarget(30, 16, DECK);
    expect(b.phase).toBe(4);
    expect(b.tgt[0]).toBe(S(11));
  });
});

describe('mill hunt: rank (FIX 2, plan check 2 item 1)', () => {
  it('every unit in the target room ranks above every unit outside it, even one nearer along the line', () => {
    const w = solosAt([S(3), S(0)]);
    const b = w.board;
    b.setTarget(7.5, 2.5, 0);
    w.step();
    const out = b.unitOf(w.gs[0]!);
    const inr = b.unitOf(w.gs[1]!);
    expect(b.lineDist(S(3), S(2))).toBeLessThan(b.lineDist(S(0), S(2)));
    expect(b.rank[inr]).toBe(0);
    expect(b.rank[out]).toBe(1);
  });

  it('the unit looping the target room ranks first', () => {
    const w = solosAt([S(1), S(2)]);
    const b = w.board;
    const a = b.unitOf(w.gs[0]!);
    const c = b.unitOf(w.gs[1]!);
    // the solo on the target loops on to the start bay's north stop (the south one is held); the other, now nearer
    // the target, still ranks below him
    let t = 0;
    while (b.uTo[a] !== S(0) && t < 60) {
      w.step();
      t += DT;
    }
    expect(b.uTo[a]).toBe(S(0));
    expect(b.uLooped[a]).toBe(1);
    expect(b.lineDist(S(0), S(1))).toBeGreaterThan(b.lineDist(S(2), S(1)));
    w.step();
    expect(b.rank[a]).toBe(0);
    expect(b.rank[c]).toBe(1);
  });

  it('check 2 item 1: a unit already in the new target room is never blocked by the unit walking in; it reaches the target, the outsider holds on the full room', () => {
    const w = pairsAt([S(5), S(7)]);
    const b = w.board;
    const outside = b.unitOf(w.gs[0]!);
    const inside = b.unitOf(w.gs[2]!);
    expect(outside).not.toBe(inside);
    b.setTarget(21.5, 2.5, 0);
    expect(b.tgt[0]).toBe(S(6));
    let reached = -1;
    for (let n = 0; n < 300; n++) {
      w.step();
      expect(b.rank[inside]).toBe(0);
      // the outsider stays out of the mill bay while the pair is in it
      expect(b.stopRoom[b.uTo[outside]!]).not.toBe(b.stopRoom[S(6)]);
      if (reached < 0 && b.uFrom[inside] === S(6)) reached = w.t;
    }
    expect(reached).toBeGreaterThan(0);
    expect(reached).toBeLessThan(30);
    expect(b.uState[outside]).toBe(H_HOLD);
    expect(b.uWant[outside]).toBe(S(6));
  });
});

describe('mill hunt: the step rules (A6)', () => {
  it('the gap counts only higher-ranked units', () => {
    const w = solosAt([S(2), S(0)]);
    const b = w.board;
    w.step();
    const hi = b.unitOf(w.gs[0]!);
    const lo = b.unitOf(w.gs[1]!);
    expect(b.rank[hi]).toBe(0);
    expect(b.stopDist(S(1), S(0))).toBeLessThan(HUNT.gap);
    expect(b.gapFree(hi, S(1))).toBe(true);
    expect(b.gapFree(lo, S(1))).toBe(false);
  });

  it('the room cap counts the guards in a room and those walking into it', () => {
    const w = pairsAt([S(5)]);
    const b = w.board;
    b.setTarget(29.0, 14.5, 0);
    const p = b.unitOf(w.gs[0]!);
    const mill = b.stopRoom[S(6)]!;
    const aisle = b.stopRoom[S(5)]!;
    let seen = false;
    for (let n = 0; n < 200 && !seen; n++) {
      w.step();
      if (b.uState[p] === H_MOVE && b.uTo[p] === S(6) && b.mFrom[b.uA[p]!] === S(5)) {
        seen = true;
        expect(b.roomLoad(mill, -1)).toBe(2);
        expect(b.roomLoad(aisle, -1)).toBe(2);
        expect(b.roomLoad(mill, p)).toBe(0);
      }
    }
    expect(seen).toBe(true);
  });

  it('a pair never steps into a room holding a solo; two solos may share one', () => {
    const w = solosAt([S(6), S(4)]);
    const b = w.board;
    const lone = b.unitOf(w.gs[1]!);
    b.setTarget(21.5, 2.5, 0);
    w.step();
    // the solo in the aisle may enter the mill bay with one solo in it (gap aside)
    expect(b.roomLoad(b.stopRoom[S(6)]!, lone) + b.unitSize(lone)).toBe(2);
    const v = pairsAt([S(4)]);
    const pb = v.board;
    expect(pb.admit(v.spawnAt({ x: pb.sx[S(6)]!, z: pb.sz[S(6)]! }, 2))).toBe(true);
    pb.setTarget(21.5, 2.5, 0);
    v.step();
    const pair = pb.unitOf(v.gs[0]!);
    expect(pb.roomSpace(pb.stopRoom[S(6)]!, pair)).toBe(false);
  });
});

describe('mill hunt: groups of at most 2 (check A FIX 1)', () => {
  it('the looper never steps into a group above 2: it holds and clears where it is; the pair beside the room clears that stop', () => {
    // a solo on the stair head's west stop (phase 0's target), a pair on crane west 2.5 m past the stair head's east stop
    const w = solosAt([G(2)]);
    const b = w.board;
    expect(b.admit(w.spawnAt({ x: b.sx[G(4)]!, z: b.sz[G(4)]!, y: DECK, pair: 2 }, 1))).toBe(true);
    expect(b.admit(w.spawnAt({ x: b.sx2[G(4)]!, z: b.sz2[G(4)]!, y: DECK, pair: 1 }, 2))).toBe(true);
    const lone = b.unitOf(w.gs[0]!);
    const pair = b.unitOf(w.gs[1]!);
    expect(pair).toBe(b.unitOf(w.gs[2]!));
    expect(b.stopDist(G(3), G(4))).toBeLessThan(HUNT.apart);
    expect(b.crowds(lone, G(3))).toBe(true);
    let held = false;
    for (let n = 0; n < Math.round(59 / DT); n++) {
      w.step();
      expect(b.uTo[lone]).not.toBe(G(3));
      if (b.uLooped[lone] && b.uState[lone] === H_HOLD) held = true;
    }
    expect(held).toBe(true);
    // the pair outside the target room faces it: its cycles clear the stop the looper may not take
    expect(b.done[G(3)]).toBe(1);
    run(w, 1.4);
    expect(b.phase).toBe(1);
  });

  it('two solos may stand near each other (a group of 2); a pair may not join a solo', () => {
    const w = solosAt([G(2), G(4)]);
    const b = w.board;
    w.step();
    expect(b.crowds(b.unitOf(w.gs[0]!), G(3))).toBe(false);
    const v = pairsAt([G(2)]);
    const pb = v.board;
    expect(pb.admit(v.spawnAt({ x: pb.sx[G(4)]!, z: pb.sz[G(4)]!, y: DECK }, 2))).toBe(true);
    v.step();
    expect(pb.crowds(pb.unitOf(v.gs[0]!), G(3))).toBe(true);
  });
});

describe('mill hunt: admission and the start spread (FIX 2, plan check 2 item 2)', () => {
  it('12 set in spawn order: G3 leaves the start bay for the aisle; G4 walks back to G5; the pairs pair', () => {
    const w = worldWith(
      SET_12,
      SET_12.map((_, k) => k),
    );
    const b = w.board;
    const u = (k: number): number => b.unitOf(w.gs[k]!);
    expect(b.uState[u(2)]).toBe(H_SPREAD);
    expect(b.uDest[u(2)]).toBe(S(3));
    expect(u(0)).toBe(u(1));
    expect(u(7)).toBe(u(8));
    expect(u(10)).toBe(u(11));
    expect(u(3)).toBe(u(4));
    expect(b.uState[u(3)]).toBe(H_REGROUP);
    expect(b.member(b.uWalker[u(3)]!)).toBe(w.gs[3]);
    expect(b.uTo[u(3)]).toBe(S(8));
    // the leader is the lower slot: G4 takes `pt`, G5 `pt2`
    expect(b.member(b.uA[u(3)]!)).toBe(w.gs[3]);
    run(w, 60);
    expect(b.uState[u(3)]).not.toBe(H_REGROUP);
    expect(b.uB[u(3)]).toBeGreaterThanOrEqual(0);
  });

  it('16 set: G8 + G9 step on to crane east, then G10 to crane west (the stair head back to 2 within 15 s)', () => {
    const w = worldWith(
      SET_16,
      SET_16.map((_, k) => k),
    );
    const b = w.board;
    const u = (k: number): number => b.unitOf(w.gs[k]!);
    expect(u(14)).toBe(u(15));
    expect(b.uState[u(7)]).toBe(H_SPREAD);
    expect(b.uDest[u(7)]).toBe(G(5));
    expect(b.uState[u(9)]).toBe(H_SPREAD);
    expect(b.uDest[u(9)]).toBe(G(4));
    const stair = b.stopRoom[G(2)]!;
    run(w, 15);
    expect(b.roomLoad(stair, -1)).toBeLessThanOrEqual(2);
    run(w, 15);
    expect(b.uFrom[u(9)]).toBe(G(4));
    expect(b.uFrom[u(7)]).toBe(G(5));
  });

  it('a late joiner into a full room is sent out the same way', () => {
    const ks = SET_12.map((_, k) => k).filter((k) => k !== 2);
    const w = worldWith(SET_12, ks);
    const b = w.board;
    run(w, 20);
    expect(b.admit(w.spawn(SET_12, 2))).toBe(true);
    const g3 = b.unitOf(w.gs[2]!);
    expect(b.uState[g3]).toBe(H_SPREAD);
    expect(b.stopRoom[b.uDest[g3]!]).toBe(b.stopRoom[S(3)]);
  });

  it('a down or taken member leaves the board and his partner goes on as a solo; a fighter rejoins and pairs again', () => {
    const w = worldWith(
      SET_12,
      SET_12.map((_, k) => k),
    );
    const b = w.board;
    run(w, 5);
    w.gs[0]!.taken = true;
    w.step();
    expect(b.unitOf(w.gs[0]!)).toBe(-1);
    const g2 = b.unitOf(w.gs[1]!);
    expect(b.uB[g2]).toBe(-1);
    expect(b.member(b.uA[g2]!)).toBe(w.gs[1]);
    expect(b.mLead[b.uA[g2]!]).toBe(1);
    expect(b.admit(w.gs[0]!)).toBe(false);
    // G11 fights (off the board), G12 goes on alone; G11 back to searching rejoins and pairs with him again
    w.gs[10]!.level = 'alert';
    w.step();
    expect(b.unitOf(w.gs[10]!)).toBe(-1);
    expect(b.uB[b.unitOf(w.gs[11]!)]).toBe(-1);
    run(w, 20);
    w.gs[10]!.level = 'searching';
    expect(b.admit(w.gs[10]!)).toBe(true);
    run(w, 30);
    expect(b.unitOf(w.gs[10]!)).toBe(b.unitOf(w.gs[11]!));
    // a down member's partner keeps hunting: with the order moved on he walks east out of the start bay
    run(w, 240);
    expect(b.uLive[g2]).toBe(1);
    expect(b.unitOf(w.gs[1]!)).toBe(g2);
    expect(w.gs[1]!.pos.x).toBeGreaterThan(9.4);
  });

  it('a woken guard (a new object for his slot) takes his index back and pairs with his partner again', () => {
    const w = worldWith(
      SET_12,
      SET_12.map((_, k) => k),
    );
    const b = w.board;
    run(w, 5);
    const old = w.gs[10]!;
    const i0 = b.memberIndex(old);
    expect(b.unitOf(old)).toBe(b.unitOf(w.gs[11]!));
    old.taken = true;
    w.step();
    expect(b.uB[b.unitOf(w.gs[11]!)]).toBe(-1);
    const woken = new SimGuard(10, old.pairSlot, old.pos.x, old.pos.y, old.pos.z);
    w.gs[10] = woken;
    expect(b.admit(woken)).toBe(true);
    // the taken guard's index was freed on the tick he left; the woken one takes the first free index (here his)
    expect(b.memberIndex(woken)).toBe(i0);
    expect(b.memberIndex(old)).toBe(-1);
    run(w, 30);
    expect(b.unitOf(woken)).toBe(b.unitOf(w.gs[11]!));
    // woken again before the board's next tick: the old object still holds the index; the new one takes it over
    const again = new SimGuard(10, old.pairSlot, woken.pos.x, woken.pos.y, woken.pos.z);
    woken.taken = true;
    w.gs[10] = again;
    expect(b.admit(again)).toBe(true);
    expect(b.memberIndex(again)).toBe(i0);
    expect(b.memberIndex(woken)).toBe(-1);
    run(w, 30);
    expect(b.unitOf(again)).toBe(b.unitOf(w.gs[11]!));
  });

  it('a dead or taken member frees his board index: a guard is still admitted after 30 kill / revive cycles', () => {
    const w = worldWith(
      SET_12,
      SET_12.map((_, k) => k),
    );
    const b = w.board;
    run(w, 5);
    for (let n = 0; n < 30; n++) {
      // G3 dies; his revive is a new object (half the cycles with a slot index the board has never seen)
      const old = w.gs[2]!;
      if (n & 1) old.taken = true;
      else old.alive = false;
      w.step();
      const g = new SimGuard(n & 1 ? 2 : 100 + n, -1, old.pos.x, old.pos.y, old.pos.z);
      w.gs[2] = g;
      expect(b.admit(g), `cycle ${n}`).toBe(true);
      run(w, 2);
    }
    let used = 0;
    for (let i = 0; i < b.cap; i++) if (b.member(i)) used++;
    expect(used).toBe(12);
  });

  it('a second solo admitted to a taken stop gets its free partner spot', () => {
    const w = solosAt([S(12), S(12)]);
    const b = w.board;
    const a = b.memberIndex(w.gs[0]!);
    const c = b.memberIndex(w.gs[1]!);
    expect(b.mTo[a]).toBe(b.mTo[c]);
    expect(b.mLead[a]).toBe(1);
    expect(b.mLead[c]).toBe(0);
    w.step();
    expect(w.gs[1]!.gx).toBe(b.sx2[S(12)]);
    expect(w.gs[1]!.gz).toBe(b.sz2[S(12)]);
  });

  it('a member who gets no nearer his spot for stuckT gives it up: his unit clears that stop from where he stands and goes on', () => {
    const w = solosAt([S(0)]);
    const b = w.board;
    const g = w.gs[0]!;
    const u = b.unitOf(g);
    const i = b.memberIndex(g);
    const px = g.pos.x;
    const pz = g.pos.z;
    // a wall: he never gets anywhere
    const pin = (): void => {
      w.step();
      g.pos.x = px;
      g.pos.z = pz;
    };
    let left = -1;
    let gave = -1;
    for (let n = 0; n < 400 && gave < 0; n++) {
      pin();
      if (left < 0 && b.uTo[u] === S(1)) left = w.t;
      if (b.mSkip[i]) gave = w.t;
    }
    expect(left).toBeGreaterThan(0);
    expect(gave - left).toBeGreaterThanOrEqual(HUNT.stuckT - 1e-6);
    expect(gave - left).toBeLessThan(HUNT.stuckT + 0.5);
    pin();
    expect(b.uFrom[u]).toBe(S(1));
    expect(g.gx).toBe(px);
    expect(g.gz).toBe(pz);
    let n = 0;
    while (!b.done[S(1)] && n++ < 100) pin();
    expect(b.done[S(1)]).toBe(1);
    n = 0;
    while (b.uTo[u] === S(1) && n++ < 100) pin();
    expect(b.uTo[u]).not.toBe(S(1));
    expect(b.mSkip[i]).toBe(0);
  });

  it('a unit holding in the target room has its one look back once at that stop, not every hold cycle', () => {
    const w = solosAt([S(6), S(7)]);
    const b = w.board;
    const g = w.gs[1]!;
    const u = b.unitOf(g);
    const i = b.memberIndex(g);
    b.setTarget(21.5, 2.5, 0);
    const back = b.aimMask(S(7), b.lineHeading(S(7), -1), true) ^ b.aimMask(S(7), b.lineHeading(S(7), -1), false);
    expect(back).not.toBe(0);
    const mask = (b as unknown as { mMask: Int32Array }).mMask;
    let first = false;
    // (the phase steps on at phaseMin, 60 s)
    for (let n = 0; n < Math.round(58 / DT); n++) {
      w.step();
      expect(b.uFrom[u]).toBe(S(7));
      if (w.t < 15 && mask[i]! & back) first = true;
      if (w.t > 30) expect(mask[i]! & back).toBe(0);
    }
    expect(first).toBe(true);
    expect(b.uState[u]).toBe(H_HOLD);
  });

  it('outside the target room only aims towards the target (within 100 deg, at least one); in it at most one look back', () => {
    const b = new HuntWorld(TEST_HUNT).board;
    const s = S(4);
    const up = b.lineHeading(s, 1);
    const out = b.aimMask(s, up, false);
    const inr = b.aimMask(s, up, true);
    for (let k = 0; k < b.aimN[s]!; k++) {
      const d = Math.abs(wrapAng(b.aims[b.aimFirst[s]! + k]! - up));
      if (out & (1 << k)) expect(d).toBeLessThanOrEqual(HUNT.aimSide);
    }
    expect(out).toBe(0b0111);
    expect(inr).toBe(0b1111);
    const dn = b.lineHeading(s, -1);
    expect(b.aimMask(s, dn, false)).toBe(0b1100);
  });
});

describe('mill hunt: the sims on the test def (15 min, no trigger)', () => {
  for (const [name, set, over] of [
    ['12', SET_12, { startBay: 3 }],
    ['16', SET_16, { startBay: 3, stairHead: 3 }],
  ] as const) {
    it(`${name} guards: cap by positions from t = 0, phases to the last row, no deadlock, one reversal at most, the end state`, () => {
      const r = runHunt(TEST_HUNT, set, { T: 900 });
      expect(r.startOver).toEqual(over);
      expect(r.fails).toEqual([]);
      expect(r.phases.at(-1)).toBe(TEST_HUNT.phases.length - 1);
      expect(r.maxRev).toBeLessThanOrEqual(1);
      expect(endState(r.world)).toEqual([]);
    });

    it(`${name} guards with a late joiner and a rejoin from a fight`, () => {
      const r = runHunt(TEST_HUNT, set, {
        T: 900,
        late: [{ k: 2, at: 20 }],
        rejoin: [{ k: 7, off: 100, on: 160 }],
      });
      expect(r.fails).toEqual([]);
      expect(r.phases.at(-1)).toBe(TEST_HUNT.phases.length - 1);
      expect(r.maxRev).toBeLessThanOrEqual(1);
      expect(endState(r.world)).toEqual([]);
    });

    it(`${name} guards: two runs identical`, () => {
      const a = runHunt(TEST_HUNT, set, { T: 300 });
      const c = runHunt(TEST_HUNT, set, { T: 300 });
      expect(c.trace).toEqual(a.trace);
    });
  }
});

describe('mill hunt: no allocation in tick', () => {
  it('16 guards, 400 s of ticks per round (walks, clears, holds, loops, phase steps), the goal hand-off included: no bytes per tick', async () => {
    const w = worldWith(
      SET_16,
      SET_16.map((_, k) => k),
    );
    run(w, 10);
    const b = w.board;
    const per = await bytesPerCall(
      (n) => {
        for (let k = 0; k < n; k++) {
          b.tick(0.2);
          w.handoff();
          w.integrate(0.1);
          w.integrate(0.1);
        }
      },
      0,
      { n: 2000 },
    );
    expect(per).toBeLessThan(16);
  });
});
