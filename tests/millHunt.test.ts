/**
 * (guard-ai mill-hunt H2) The hunt board (`src/ai/millHunt.ts`): the order, rank, step rules, admission and the start
 * spread as unit tests, then a kinematic sim (straight legs at `HUNT.pace`, the calm turn rate) of the mill's 12- and
 * 16-guard sets on a test `HuntDef` shaped like the mill (two lines of six rooms, the PLAN's phase rows). The sim helper
 * (`runHunt`) takes any `HuntDef` and guard set, so the same checks run on the real `THORNBECK_HUNT` once H1 lands.
 */
import { describe, expect, it } from 'vitest';
import type { AlertLevel } from '../src/ai/alertState';
import { H_HOLD, H_LOOP, H_MOVE, H_REGROUP, H_SPREAD, HUNT, HuntBoard, type HuntMember } from '../src/ai/millHunt';
import { wrapAng } from '../src/ai/sceneSweep';
import { ENEMY_CALM_MOTION } from '../src/config/movement';
import type { HuntDef, HuntLine, HuntStop } from '../src/game/sectors';
import { hyp2 } from '../src/core/mathx';
import { bytesPerCall } from './helpers/allocPerCall';

const DECK = 4.2;
/** W1, the players' start (the phase-0 targets are the stops nearest it). */
const W1X = 5.5;
const W1Z = 5.25;

// ---- a test HuntDef shaped like the mill (THORNBECK_SPACES boxes; the gallery's six rooms; the PLAN's phase rows) ----

/** Aims for a stop whose line heads `h` (up): two forward corners, a side, one back (left to right). */
function aimsAt(h: number): number[] {
  return [wrapAng(h - 1.0), wrapAng(h + 0.8), wrapAng(h + 1.5), wrapAng(h + Math.PI - 0.5)];
}

function line(
  id: string,
  floorY: number,
  rooms: HuntLine['rooms'],
  pts: readonly (readonly [number, number, string, number?])[],
): HuntLine {
  const stops: HuntStop[] = pts.map((p, k) => {
    const a = pts[k + 1 < pts.length ? k : k - 1]!;
    const b = pts[k + 1 < pts.length ? k + 1 : k]!;
    const h = Math.atan2(b[0] - a[0], b[1] - a[1]);
    const dz = p[3] ?? 1.2;
    const y = floorY > 0 ? ([p[0], p[1], floorY] as const) : ([p[0], p[1]] as const);
    const y2 = floorY > 0 ? ([p[0], p[1] + dz, floorY] as const) : ([p[0], p[1] + dz] as const);
    return { pt: y, pt2: y2, room: p[2], aims: aimsAt(h) };
  });
  return { id, floorY, rooms, stops };
}

export const TEST_HUNT: HuntDef = {
  lines: [
    line(
      'ground',
      0,
      [
        { id: 'startBay', box: [0, 0, 9.4, 10.4] },
        { id: 'aisle', box: [9.4, 0, 20, 4] },
        { id: 'millBay', box: [20, 0, 26, 8] },
        { id: 'sackBay', box: [16, 8, 26, 13] },
        { id: 'office', box: [26, 6, 32, 13] },
        { id: 'lobby', box: [26, 13, 32, 18] },
      ],
      [
        [6.0, 8.4, 'startBay'],
        [5.5, 5.0, 'startBay'],
        [7.5, 2.5, 'startBay'],
        [11.0, 2.0, 'aisle'],
        [14.5, 2.0, 'aisle'],
        [18.0, 2.0, 'aisle'],
        [21.5, 2.5, 'millBay'],
        [22.5, 6.0, 'millBay'],
        [21.5, 9.5, 'sackBay'],
        [24.5, 10.5, 'sackBay'],
        [27.5, 8.0, 'office'],
        [29.5, 11.0, 'office'],
        [29.0, 14.5, 'lobby'],
        [30.5, 17.0, 'lobby', -1.2],
      ],
    ),
    line(
      'gallery',
      DECK,
      [
        { id: 'landing', box: [0, 15, 7, 18] },
        { id: 'stairHead', box: [7, 15, 12, 18] },
        { id: 'craneWest', box: [12, 15, 16, 18] },
        { id: 'craneEast', box: [16, 15, 20, 18] },
        { id: 'eastWest', box: [20, 15, 26, 18] },
        { id: 'eastEnd', box: [26, 15, 32, 18] },
      ],
      [
        [2.0, 16, 'landing'],
        [5.5, 16, 'landing'],
        [8.5, 16, 'stairHead'],
        [11.0, 16, 'stairHead'],
        [13.5, 16, 'craneWest'],
        [17.5, 16, 'craneEast'],
        [21.0, 16, 'eastWest'],
        [24.5, 16, 'eastWest'],
        [27.5, 16, 'eastEnd'],
        [30.0, 16, 'eastEnd'],
      ],
    ),
  ],
  phases: [
    ['startBay', 'stairHead'],
    ['aisle', 'craneWest'],
    ['millBay', 'craneEast'],
    ['sackBay', 'eastWest'],
    ['office', 'eastEnd'],
    ['lobby', 'eastEnd'],
  ],
};

/** A guard of a set: the map's slot fields the board reads (`SectorGuard` fits); `pair` is the partner's index. */
export interface SimSlot {
  x: number;
  z: number;
  y?: number;
  pair?: number;
}

/** The mill's 12 (G1-G12) at their start spots (`THORNBECK_GUARDS`), pairs G1 + G2, G4 + G5, G8 + G9, G11 + G12. */
export const SET_12: SimSlot[] = [
  { x: 7.5, z: 8.9, pair: 1 },
  { x: 8.3, z: 7.9, pair: 0 },
  { x: 9.0, z: 2.0 },
  { x: 10.0, z: 3.4, pair: 4 },
  { x: 20.8, z: 9.0, pair: 3 },
  { x: 29.0, z: 9.9 },
  { x: 28.8, z: 16.2, y: DECK },
  { x: 12.5, z: 15.6, y: DECK, pair: 8 },
  { x: 12.5, z: 16.6, y: DECK, pair: 7 },
  { x: 8.8, z: 16.2, y: DECK },
  { x: 1.5, z: 15.9, y: DECK, pair: 11 },
  { x: 1.5, z: 17.0, y: DECK, pair: 10 },
];
/** + G13 (office), G14 (east gallery), G15 + G16 (a pair at the stair head). */
export const SET_16: SimSlot[] = [
  ...SET_12,
  { x: 30.6, z: 7.2 },
  { x: 30.0, z: 16.2, y: DECK },
  { x: 10.6, z: 16.3, y: DECK, pair: 15 },
  { x: 10.6, z: 17.0, y: DECK, pair: 14 },
];

// ---- the kinematic sim -------------------------------------------------------------------------------------------

class SimGuard implements HuntMember {
  alive = true;
  taken = false;
  level: AlertLevel = 'searching';
  readonly pos: { x: number; y: number; z: number };
  yaw = 0;
  gx = 0;
  gz = 0;
  face = Number.NaN;
  speed = 0;
  goal = false;
  constructor(
    readonly slotIdx: number,
    readonly pairSlot: number,
    x: number,
    y: number,
    z: number,
  ) {
    this.pos = { x, y, z };
  }
}

function setGoal(m: SimGuard, x: number, z: number, face: number, speed: number): void {
  m.gx = x;
  m.gz = z;
  m.face = face;
  m.speed = speed;
  m.goal = true;
}

const TURN = ENEMY_CALM_MOTION.turnAim;
const DT = 0.2;
const SUB = 0.1;

/** A board and its guards, stepped at the board tick with straight legs at the goal's pace and the calm turn rate. */
export class HuntWorld {
  readonly board: HuntBoard<SimGuard>;
  readonly gs: SimGuard[] = [];
  t = 0;
  constructor(def: HuntDef) {
    this.board = new HuntBoard<SimGuard>(def, setGoal, W1X, W1Z, 24);
  }
  /** Spawn slot k of `set` (not yet admitted). */
  spawn(set: readonly SimSlot[], k: number): SimGuard {
    return this.spawnAt(set[k]!, k);
  }
  /** Spawn a guard from slot `s` as slot index k. */
  spawnAt(s: SimSlot, k: number): SimGuard {
    const g = new SimGuard(k, s.pair ?? -1, s.x, s.y ?? 0, s.z);
    g.yaw = Math.PI / 2;
    this.gs[k] = g;
    return g;
  }
  step(): void {
    this.board.tick(DT);
    this.move();
  }
  /** The sim's half of a step (after the board's tick). */
  move(): void {
    for (let n = 0; n < DT / SUB - 1e-9; n++) this.integrate(SUB);
    this.t += DT;
  }
  integrate(h: number): void {
    for (let k = 0; k < this.gs.length; k++) {
      const g = this.gs[k];
      if (!g || !g.goal || g.level === 'alert' || !g.alive || g.taken) continue;
      const dx = g.gx - g.pos.x;
      const dz = g.gz - g.pos.z;
      const d = hyp2(dx, dz);
      const st = g.speed * h;
      let want = g.face;
      if (d > 1e-6) {
        const f = st >= d ? 1 : st / d;
        g.pos.x += dx * f;
        g.pos.z += dz * f;
        if (d > 0.05) want = Math.atan2(dx, dz);
      }
      if (want === want) {
        const e = wrapAng(want - g.yaw);
        const m = TURN * h;
        g.yaw = wrapAng(g.yaw + (e > m ? m : e < -m ? -m : e));
      }
    }
  }
}

export interface HuntRunOpts {
  /** Run time (s). */
  T: number;
  /** Slots admitted later (s after t = 0) instead of at t = 0. */
  late?: readonly { k: number; at: number }[];
  /** Slots that leave for a fight (level 'alert') at `off` and rejoin (back to 'searching', admitted again) at `on`. */
  rejoin?: readonly { k: number; off: number; on: number }[];
}

export interface HuntRunReport {
  world: HuntWorld;
  fails: string[];
  /** Most reversals of any member's move legs. */
  maxRev: number;
  /** The phase at each whole minute. */
  phases: number[];
  /** Final positions and yaws, rounded (two runs compare). */
  trace: number[];
  /** Room counts above the cap at t = 0 (room id -> count). */
  startOver: Record<string, number>;
}

/**
 * Run `set` on `def`: spawn order = admit order at t = 0 (or later per `late`), the fights per `rejoin`. Checked every
 * step: the room cap by member positions (a room an admission put over may only fall and is at the cap within 15 s of
 * it, plan fold-in 5); a unit's line distance to its target never grows except in spread, regroup, loop or a target
 * step (fold-in 4); no unit holds while its wanted stop is free of higher-ranked units and its room has space (no
 * deadlock, check 2 item 1); reversals of move legs per member.
 */
export function runHunt(def: HuntDef, set: readonly SimSlot[], opts: HuntRunOpts): HuntRunReport {
  const w = new HuntWorld(def);
  const b = w.board;
  const fails: string[] = [];
  const lateAt = new Map<number, number>();
  for (const l of opts.late ?? []) lateAt.set(l.k, l.at);
  const over = new Map<number, { t0: number; n: number }>();
  const startOver: Record<string, number> = {};
  const prevD = new Map<number, { d: number; st: number; gen: number; u: number }>();
  const lastDir = new Map<number, number>();
  const revs = new Map<number, number>();
  const phases: number[] = [];
  const grow = (st: number): boolean => st === H_SPREAD || st === H_REGROUP || st === H_LOOP;

  const admit = (k: number): void => {
    const g = w.gs[k] ?? w.spawn(set, k);
    expect(b.admit(g)).toBe(true);
    prevD.delete(k);
    countRooms(true);
  };
  const countRooms = (admission: boolean): void => {
    for (let r = 0; r < b.nRooms; r++) {
      const l = b.roomLine[r]!;
      let n = 0;
      for (const g of w.gs) {
        if (!g || b.unitOf(g) < 0) continue;
        if (b.nearestLine(g.pos.y) !== l) continue;
        const bx = r * 4;
        if (
          g.pos.x >= b.roomBox[bx]! &&
          g.pos.x <= b.roomBox[bx + 2]! &&
          g.pos.z >= b.roomBox[bx + 1]! &&
          g.pos.z <= b.roomBox[bx + 3]!
        )
          n++;
      }
      const o = over.get(r);
      if (n <= HUNT.roomCap) {
        over.delete(r);
        continue;
      }
      if (admission) {
        if (!o) over.set(r, { t0: w.t, n });
        else o.n = Math.max(o.n, n);
        if (w.t === 0) startOver[b.roomIds[r]!] = n;
        continue;
      }
      if (!o) fails.push(`t ${w.t.toFixed(1)}: ${b.roomIds[r]} holds ${n}`);
      else {
        if (n > o.n) fails.push(`t ${w.t.toFixed(1)}: ${b.roomIds[r]} rose to ${n}`);
        if (w.t - o.t0 > 15 + 1e-6)
          fails.push(
            `t ${w.t.toFixed(1)}: ${b.roomIds[r]} still ${n} ${(w.t - o.t0).toFixed(1)} s after the admission`,
          );
        o.n = n;
      }
    }
  };

  /** Right after the board's tick (the positions it decided on). */
  const holdCheck = (): void => {
    // no deadlock: a holding unit's wanted stop free of higher ranks and its room with space -> it would have stepped
    for (let u = 0; u < b.cap; u++) {
      if (!b.uLive[u] || b.uState[u] !== H_HOLD || b.uWant[u]! < 0 || b.uLooped[u]) continue;
      const j = b.uWant[u]!;
      const l = b.uLine[u]!;
      let free = true;
      for (let k = 0; k < b.rank[u]!; k++) {
        const h = b.ranked(l, k);
        for (const i of [b.uA[h]!, b.uB[h]!])
          if (i >= 0 && (b.stopDist(j, b.mFrom[i]!) < HUNT.gap || b.stopDist(j, b.mTo[i]!) < HUNT.gap)) free = false;
      }
      const r = b.stopRoom[j]!;
      if (r !== b.stopRoom[b.uFrom[u]!] && b.roomLoad(r, u) + b.unitSize(u) > HUNT.roomCap) free = false;
      if (free) fails.push(`t ${w.t.toFixed(1)}: unit ${u} holds with stop ${j} free`);
    }
  };

  for (let k = 0; k < set.length; k++) if (!lateAt.has(k)) admit(k);
  const steps = Math.round(opts.T / DT);
  for (let n = 0; n < steps; n++) {
    for (const [k, at] of lateAt) if (Math.abs(w.t - at) < DT / 2) admit(k);
    for (const r of opts.rejoin ?? []) {
      const g = w.gs[r.k]!;
      if (Math.abs(w.t - r.off) < DT / 2) g.level = 'alert';
      if (Math.abs(w.t - r.on) < DT / 2) {
        g.level = 'searching';
        admit(r.k);
      }
    }
    const gens = Array.from(b.tgtGen);
    b.tick(DT);
    holdCheck();
    w.move();
    countRooms(false);
    if (Math.abs(w.t / 60 - Math.round(w.t / 60)) < DT / 120) phases.push(b.phase);
    // line distance, reversals
    for (let k = 0; k < w.gs.length; k++) {
      const g = w.gs[k];
      if (!g) continue;
      const u = b.unitOf(g);
      if (u < 0) {
        prevD.delete(k);
        continue;
      }
      const l = b.uLine[u]!;
      const d = b.lineDist(b.uTo[u]!, b.tgt[l]!);
      const st = b.uState[u]!;
      const p = prevD.get(k);
      if (p && p.u === u && d > p.d + 1e-6 && !grow(st) && !grow(p.st) && b.tgtGen[l] === gens[l])
        fails.push(
          `t ${w.t.toFixed(1)}: G${k + 1} line distance ${p.d.toFixed(1)} -> ${d.toFixed(1)} in ${b.stateName(u)}`,
        );
      prevD.set(k, { d, st, gen: b.tgtGen[l]!, u });
      if (st === H_MOVE && b.uTo[u] !== b.uFrom[u]) {
        const dir = b.uTo[u]! > b.uFrom[u]! ? 1 : -1;
        const ld = lastDir.get(k);
        if (ld !== undefined && ld !== dir) revs.set(k, (revs.get(k) ?? 0) + 1);
        lastDir.set(k, dir);
      }
    }
  }
  let maxRev = 0;
  for (const v of revs.values()) maxRev = Math.max(maxRev, v);
  const trace: number[] = [];
  for (const g of w.gs)
    if (g) trace.push(Math.round(g.pos.x * 1e4), Math.round(g.pos.z * 1e4), Math.round(g.yaw * 1e4));
  trace.push(b.phase);
  return { world: w, fails, maxRev, phases, trace, startOver };
}

/**
 * The end state (FIX 1): every live unit in its line's final room, or within `gap` + 4.5 m of the unit ranked just
 * ahead of it and every member facing within `aimSide` (100 deg) of the line towards the target (its line's end).
 */
export function endState(w: HuntWorld): string[] {
  const b = w.board;
  const out: string[] = [];
  const last = b.nPhases - 1;
  for (let l = 0; l < b.nLines; l++) {
    const fr = b.phaseRoom[last * b.nLines + l]!;
    for (let k = 0; k < b.lineUnits(l); k++) {
      const u = b.ranked(l, k);
      const s = b.uFrom[u]!;
      if (b.stopRoom[s] === fr) continue;
      if (k === 0) {
        out.push(`unit ${u} leads line ${l} outside its final room`);
        continue;
      }
      const a = b.ranked(l, k - 1);
      const d = b.stopDist(s, b.uFrom[a]!);
      if (d > HUNT.gap + 4.5) out.push(`unit ${u} ${d.toFixed(1)} m behind unit ${a}`);
      const fwd = b.lineHeading(s, b.tgt[l]! > s ? 1 : -1);
      for (const i of [b.uA[u]!, b.uB[u]!]) {
        if (i < 0) continue;
        const g = b.member(i)!;
        const e = Math.abs(wrapAng(g.yaw - fwd));
        if (e > HUNT.aimSide + 1e-6)
          out.push(`G${g.slotIdx + 1} faces ${((e * 180) / Math.PI).toFixed(0)} deg off the line`);
      }
    }
  }
  return out;
}

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
  it('16 guards, 400 s of ticks per round (walks, clears, holds, loops, phase steps): no bytes per tick', async () => {
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
