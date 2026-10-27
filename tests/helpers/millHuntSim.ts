/**
 * (guard-ai mill-hunt) The hunt board's kinematic sim, shared by `tests/millHunt.test.ts` (the test def) and
 * `tests/millHuntThornbeck.test.ts` (the real `THORNBECK_HUNT`): a test `HuntDef` shaped like the mill, the 12- and
 * 16-guard sets, `HuntWorld` (straight legs at the goal's pace, the calm turn rate), `runHunt` (the checks every step)
 * and `endState`. Moved out of the test file so importing it does not register that file's tests (H2 report, "Notes for
 * the checkers").
 */
import { expect } from 'vitest';
import type { AlertLevel } from '../../src/ai/alertState';
import { H_HOLD, H_LOOP, H_MOVE, H_REGROUP, H_SPREAD, HUNT, HuntBoard, type HuntMember } from '../../src/ai/millHunt';
import { wrapAng } from '../../src/ai/sceneSweep';
import { ENEMY_CALM_MOTION } from '../../src/config/movement';
import type { HuntDef, HuntLine, HuntStop } from '../../src/game/sectors';
import { hyp2 } from '../../src/core/mathx';

export const DECK = 4.2;
/** W1, the players' start (the phase-0 targets are the stops nearest it). */
export const W1X = 5.5;
export const W1Z = 5.25;

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

export class SimGuard implements HuntMember {
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
export const DT = 0.2;
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
