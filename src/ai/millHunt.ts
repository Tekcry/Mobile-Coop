/**
 * (guard-ai mill-hunt H2) The storm mill's hunt board (pure: no Babylon / DOM; docs/guard-ai/mill-hunt/PLAN.md "Logic").
 * Michael 2026-10-27 ~10:00: "maximum alert level ... cautious and searching ... not bunch up into groups bigger than 2
 * ... searching for you very slowly and methodically ... they will all be heading towards the players ... checking all
 * corners"; ~10:05 "fixed readble path is good".
 *
 * Each storey has one fixed line of stops (`HuntLine`). Every unit (a pair or a solo) walks its line stop by stop
 * towards its line's target at `HUNT.pace`, clears each stop's authored aims, and holds (re-clearing, slower) when the
 * rules below stop it. The targets follow the fixed phase rows (`HuntDef.phases`); no live player position is read.
 * No randomness: the same admissions and ticks give the same goals. Everything after the constructor allocates nothing.
 *
 * Yaw: 0 = +z, grows towards +x (`atan2(dx, dz)`), as `sceneSweep.ts`.
 */
import type { AlertLevel } from './alertState';
import type { HuntDef } from '../game/sectors';
import { hyp2 } from '../core/mathx';
import { sweepTurnTime, wrapAng } from './sceneSweep';

export const HUNT = {
  /** Walking pace between stops (m/s; BRIEF A3; the GA6 sweep 0.7, the plain search 0.68). */
  pace: 0.45,
  /** Hold on each aim while clearing a stop (s, after the calm turn onto it; A8). */
  aimHold: 1.5,
  /** Hold on each aim while held by the rules (s; A9: the same order, slower). */
  holdAim: 2.5,
  /** A unit never steps to a stop within this (m, straight, same line) of a higher-ranked unit's stop (A6). */
  gap: 6,
  /** Guards in a room, or walking into it, never above this (A6). */
  roomCap: 2,
  /** A phase steps on after this at the latest (s; A4). */
  phaseMax: 120,
  /**
   * (plan check 2 fold-in 2) A phase never steps on before this (s), even when every target room is cleared. 60: about
   * what a pair takes to walk into a room of 2-3 stops and clear it (a ~3.5 m leg is ~8 s at 0.45 m/s plus the calm turn;
   * 2-3 aims at 1.5 s plus turns is ~6-9 s a stop), so the front never runs ahead of a careful pair; the six rows reach
   * the last one no sooner than 5 min (no later than 10 min, `phaseMax`).
   */
  phaseMin: 60,
  /** (H4) A check's look at the spot (s) and its pan half width (rad). */
  checkLook: 4,
  checkPan: 0.7,
  /** A member within this of his spot has arrived (m). */
  arrive: 0.5,
  /** Outside the target room only aims within this of the line towards the target are used (rad, 100 deg; A9). */
  aimSide: 1.75,
} as const;

/** A guard on the board: an `Enemy` fits it structurally. */
export interface HuntMember {
  readonly alive: boolean;
  readonly taken: boolean;
  readonly pos: { readonly x: number; readonly y: number; readonly z: number };
  readonly level: AlertLevel;
  /** His slot's index in the section's guard list (-1: none). */
  readonly slotIdx: number;
  /** His pair partner's slot index (-1: none); a pair is either member naming the other. */
  readonly pairSlot: number;
}

/** The board's goal for a member: his spot, the yaw to face there (NaN while walking) and the pace. */
export type HuntOut<M> = (m: M, x: number, z: number, face: number, speed: number) => void;

/** Unit states (`HuntBoard.uState`). */
export const H_SPREAD = 0;
export const H_REGROUP = 1;
export const H_MOVE = 2;
export const H_CLEAR = 3;
export const H_HOLD = 4;
export const H_LOOP = 5;
/** (H4) A check of a glimpse or a sound: not built in H2 (the hook is `HuntBoard.tick`'s `H_CHECK` branches). */
export const H_CHECK = 6;
export const HUNT_STATES: readonly string[] = ['spread', 'regroup', 'move', 'clear', 'hold', 'loop', 'check'];

/** Rank classes (`rankLine`): the unit looping the target room, other units in it, the rest. */
const CLS_LOOP = 0;
const CLS_ROOM = 1e6;
const CLS_OUT = 2e6;

/**
 * The hunt board. Built empty from a `HuntDef` (the scene turns the dark on before its guards spawn); `admit` adds every
 * guard who joins (the spawn, a late spawn, a rejoin after a fight); `tick` (the manager's 0.2 s board tick) writes each
 * member's goal through `out`. Per-stop, per-room, per-member and per-unit state lives in typed arrays sized at build.
 *
 * Stops are numbered over all lines (line l holds `lineFirst[l]` .. `lineEnd[l] - 1`, in walking order); rooms likewise,
 * in the order the line first enters them, so a line's rooms are consecutive and ordered along it.
 */
export class HuntBoard<M extends HuntMember> {
  readonly nLines: number;
  readonly nStops: number;
  readonly nRooms: number;
  readonly nPhases: number;
  /** Member (and unit) capacity. */
  readonly cap: number;
  readonly lineFirst: Int16Array;
  readonly lineEnd: Int16Array;
  readonly lineRoom0: Int16Array;
  readonly lineRoomEnd: Int16Array;
  readonly lineY: Float64Array;
  readonly stopLine: Int16Array;
  readonly stopRoom: Int16Array;
  readonly sx: Float64Array;
  readonly sz: Float64Array;
  readonly sx2: Float64Array;
  readonly sz2: Float64Array;
  /** Distance along the line from its first stop (m). */
  readonly arc: Float64Array;
  /** The line's heading at a stop towards the next stop (up) / the previous one (down); an end stop continues its leg. */
  readonly hUp: Float64Array;
  readonly hDn: Float64Array;
  readonly aimFirst: Int16Array;
  readonly aimN: Int16Array;
  readonly aims: Float64Array;
  readonly roomLine: Int16Array;
  readonly roomFirst: Int16Array;
  readonly roomLast: Int16Array;
  /** x0, z0, x1, z1 per room. */
  readonly roomBox: Float64Array;
  readonly roomIds: readonly string[];
  /** The phase rows as room indices: [phase * nLines + line] (-1: the row names no room of that line). */
  readonly phaseRoom: Int16Array;

  // members (index i: the slot `admit` gave him; kept for a rejoin)
  private readonly ms: (M | null)[];
  readonly mOn: Uint8Array;
  readonly mUnit: Int16Array;
  /** The stop he stands at or walks from / the stop he stands at or walks to. */
  readonly mFrom: Int16Array;
  readonly mTo: Int16Array;
  /** 1: the leader's / a solo's spot (`pt`), 0: the partner's (`pt2`). */
  readonly mLead: Uint8Array;
  /** His pair partner's member index (-1 none), from the map's pair data. */
  readonly mPartner: Int16Array;
  private readonly mMask: Int32Array;
  private readonly mAim: Int8Array;
  private readonly mAimT: Float64Array;
  private readonly mHold: Float64Array;
  /** The yaw the board last gave him (an aim, or the heading he arrived on). */
  readonly mYaw: Float64Array;
  private readonly mDone: Uint8Array;

  // units
  readonly uLive: Uint8Array;
  /** The leader (or solo) / the partner (-1: a solo); the leader is the lower slot. */
  readonly uA: Int16Array;
  readonly uB: Int16Array;
  readonly uLine: Int16Array;
  /** The unit's stop / the stop its leg goes to (equal when standing; a regroup: both the meeting stop). */
  readonly uFrom: Int16Array;
  readonly uTo: Int16Array;
  readonly uState: Uint8Array;
  /** A spread's last stop. */
  readonly uDest: Int16Array;
  /** Its last leg's direction along the line (+1 up, -1 down; a loop's way round). */
  readonly uDir: Int8Array;
  /** It has reached its line's target in this target room (it loops). */
  readonly uLooped: Uint8Array;
  /** Its aim cycle uses the target room's set (counts towards clearing it). */
  private readonly uFull: Uint8Array;
  /** Its clear is done: decide this tick. */
  private readonly uNeed: Uint8Array;
  /** The stop it last asked for (-1 none): the tests' no-deadlock check reads it. */
  readonly uWant: Int16Array;
  /** A regroup's walking member. */
  readonly uWalker: Int16Array;
  /** Its place in its line's order this tick (0 first). */
  readonly rank: Int16Array;
  private readonly ord: Int16Array;
  private readonly ordN: Int16Array;
  private readonly key: Float64Array;

  // the order (A4)
  phase = 0;
  phaseT = 0;
  /** Each line's target stop, and a counter bumped whenever it changes. */
  readonly tgt: Int16Array;
  readonly tgtGen: Uint32Array;
  /** A stop's aims done (a full cycle in its line's target room) in this phase. */
  readonly done: Uint8Array;

  constructor(
    def: HuntDef,
    private readonly out: HuntOut<M>,
    startX: number,
    startZ: number,
    cap = 24,
  ) {
    const L = def.lines.length;
    let S = 0;
    let A = 0;
    for (const ln of def.lines) {
      S += ln.stops.length;
      for (const st of ln.stops) A += st.aims.length;
    }
    this.nLines = L;
    this.nStops = S;
    this.nPhases = Math.max(1, def.phases.length);
    this.cap = cap;
    this.lineFirst = new Int16Array(L);
    this.lineEnd = new Int16Array(L);
    this.lineRoom0 = new Int16Array(L);
    this.lineRoomEnd = new Int16Array(L);
    this.lineY = new Float64Array(L);
    this.stopLine = new Int16Array(S);
    this.stopRoom = new Int16Array(S);
    this.sx = new Float64Array(S);
    this.sz = new Float64Array(S);
    this.sx2 = new Float64Array(S);
    this.sz2 = new Float64Array(S);
    this.arc = new Float64Array(S);
    this.hUp = new Float64Array(S);
    this.hDn = new Float64Array(S);
    this.aimFirst = new Int16Array(S);
    this.aimN = new Int16Array(S);
    this.aims = new Float64Array(A);
    const ids: string[] = [];
    const rl: number[] = [];
    const rf: number[] = [];
    const rla: number[] = [];
    const box: number[] = [];
    let s = 0;
    let a = 0;
    for (let l = 0; l < L; l++) {
      const ln = def.lines[l]!;
      this.lineFirst[l] = s;
      this.lineY[l] = ln.floorY;
      this.lineRoom0[l] = ids.length;
      const r0 = ids.length;
      for (let k = 0; k < ln.stops.length; k++, s++) {
        const st = ln.stops[k]!;
        this.stopLine[s] = l;
        this.sx[s] = st.pt[0];
        this.sz[s] = st.pt[1];
        this.sx2[s] = st.pt2[0];
        this.sz2[s] = st.pt2[1];
        this.arc[s] = k === 0 ? 0 : this.arc[s - 1]! + hyp2(this.sx[s]! - this.sx[s - 1]!, this.sz[s]! - this.sz[s - 1]!);
        let r = -1;
        for (let q = r0; q < ids.length; q++) if (ids[q] === st.room) r = q;
        if (r < 0) {
          r = ids.length;
          ids.push(st.room);
          rl.push(l);
          rf.push(s);
          rla.push(s);
          const def0 = ln.rooms.find((x) => x.id === st.room);
          const b = def0 ? def0.box : ([st.pt[0], st.pt[1], st.pt[0], st.pt[1]] as const);
          box.push(Math.min(b[0], b[2]), Math.min(b[1], b[3]), Math.max(b[0], b[2]), Math.max(b[1], b[3]));
        }
        rla[r] = s;
        this.stopRoom[s] = r;
        this.aimFirst[s] = a;
        this.aimN[s] = Math.min(31, st.aims.length);
        for (let q = 0; q < this.aimN[s]!; q++) this.aims[a++] = st.aims[q]!;
      }
      this.lineEnd[l] = s;
      this.lineRoomEnd[l] = ids.length;
      for (let k = this.lineFirst[l]!; k < s; k++) {
        const up = k + 1 < s ? k + 1 : k;
        const upFrom = k + 1 < s ? k : k - 1;
        const dn = k - 1 >= this.lineFirst[l]! ? k - 1 : k;
        const dnFrom = k - 1 >= this.lineFirst[l]! ? k : k + 1;
        this.hUp[k] = upFrom >= this.lineFirst[l]! && up !== upFrom ? this.legHdg(upFrom, up) : 0;
        this.hDn[k] = dnFrom < s && dn !== dnFrom ? this.legHdg(dnFrom, dn) : wrapAng(this.hUp[k]! + Math.PI);
      }
    }
    const R = ids.length;
    this.nRooms = R;
    this.roomIds = ids;
    this.roomLine = Int16Array.from(rl);
    this.roomFirst = Int16Array.from(rf);
    this.roomLast = Int16Array.from(rla);
    this.roomBox = Float64Array.from(box);
    this.phaseRoom = new Int16Array(this.nPhases * L).fill(-1);
    for (let p = 0; p < def.phases.length; p++)
      for (let l = 0; l < L; l++) {
        const id = def.phases[p]![l];
        for (let r = this.lineRoom0[l]!; r < this.lineRoomEnd[l]!; r++) if (ids[r] === id) this.phaseRoom[p * L + l] = r;
      }

    this.ms = new Array<M | null>(cap).fill(null);
    this.mOn = new Uint8Array(cap);
    this.mUnit = new Int16Array(cap).fill(-1);
    this.mFrom = new Int16Array(cap);
    this.mTo = new Int16Array(cap);
    this.mLead = new Uint8Array(cap);
    this.mPartner = new Int16Array(cap).fill(-1);
    this.mMask = new Int32Array(cap);
    this.mAim = new Int8Array(cap);
    this.mAimT = new Float64Array(cap);
    this.mHold = new Float64Array(cap);
    this.mYaw = new Float64Array(cap);
    this.mDone = new Uint8Array(cap);
    this.uLive = new Uint8Array(cap);
    this.uA = new Int16Array(cap).fill(-1);
    this.uB = new Int16Array(cap).fill(-1);
    this.uLine = new Int16Array(cap);
    this.uFrom = new Int16Array(cap);
    this.uTo = new Int16Array(cap);
    this.uState = new Uint8Array(cap);
    this.uDest = new Int16Array(cap).fill(-1);
    this.uDir = new Int8Array(cap);
    this.uLooped = new Uint8Array(cap);
    this.uFull = new Uint8Array(cap);
    this.uNeed = new Uint8Array(cap);
    this.uWant = new Int16Array(cap).fill(-1);
    this.uWalker = new Int16Array(cap).fill(-1);
    this.rank = new Int16Array(cap);
    this.ord = new Int16Array(cap * Math.max(1, L));
    this.ordN = new Int16Array(Math.max(1, L));
    this.key = new Float64Array(cap);
    this.tgt = new Int16Array(L);
    this.tgtGen = new Uint32Array(L);
    this.done = new Uint8Array(S);
    // phase 0: each line's target is its phase room's stop nearest the start point (the mill: W1)
    for (let l = 0; l < L; l++) {
      const r = this.phaseRoom[l]!;
      this.tgt[l] = this.nearestStop(l, startX, startZ, r);
    }
  }

  // ---- geometry -------------------------------------------------------------------------------------------------

  /** The straight heading from stop a to stop b. */
  legHdg(a: number, b: number): number {
    return Math.atan2(this.sx[b]! - this.sx[a]!, this.sz[b]! - this.sz[a]!);
  }

  /** The line's heading at stop s going `dir` (+1 up, -1 down). */
  lineHeading(s: number, dir: number): number {
    return dir > 0 ? this.hUp[s]! : this.hDn[s]!;
  }

  /** Straight distance between two stops' `pt` (m). */
  stopDist(a: number, b: number): number {
    return hyp2(this.sx[a]! - this.sx[b]!, this.sz[a]! - this.sz[b]!);
  }

  /** Distance along the line between two stops of one line (m). */
  lineDist(a: number, b: number): number {
    const d = this.arc[a]! - this.arc[b]!;
    return d < 0 ? -d : d;
  }

  /** The line whose `floorY` is nearest y (ties: the lower index). */
  nearestLine(y: number): number {
    let best = 0;
    let bd = Infinity;
    for (let l = 0; l < this.nLines; l++) {
      const d = Math.abs(this.lineY[l]! - y);
      if (d < bd) {
        bd = d;
        best = l;
      }
    }
    return best;
  }

  /** Line l's stop nearest (x, z), only room r's stops when r >= 0 (ties: the lower index). */
  nearestStop(l: number, x: number, z: number, r = -1): number {
    let best = this.lineFirst[l]!;
    let bd = Infinity;
    for (let s = this.lineFirst[l]!; s < this.lineEnd[l]!; s++) {
      if (r >= 0 && this.stopRoom[s] !== r) continue;
      const d = hyp2(this.sx[s]! - x, this.sz[s]! - z);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }

  /** The room id of line l's current target. */
  targetRoom(l: number): number {
    return this.stopRoom[this.tgt[l]!]!;
  }

  /** The board index of m (-1: never admitted). */
  memberIndex(m: M): number {
    for (let i = 0; i < this.cap; i++) if (this.ms[i] === m) return i;
    return -1;
  }

  /** m's unit (-1: off the board). */
  unitOf(m: M): number {
    const i = this.memberIndex(m);
    return i >= 0 && this.mOn[i] ? this.mUnit[i]! : -1;
  }

  /** The member at board index i (null: none). */
  member(i: number): M | null {
    return this.ms[i] ?? null;
  }

  unitSize(u: number): number {
    return (this.uA[u]! >= 0 ? 1 : 0) + (this.uB[u]! >= 0 ? 1 : 0);
  }

  private gone(m: M): boolean {
    return !m.alive || m.taken || m.level === 'alert';
  }

  private spotX(i: number): number {
    const s = this.mTo[i]!;
    return this.mLead[i] ? this.sx[s]! : this.sx2[s]!;
  }

  private spotZ(i: number): number {
    const s = this.mTo[i]!;
    return this.mLead[i] ? this.sz[s]! : this.sz2[s]!;
  }

  /** He is within `arrive` of his spot. */
  private settled(i: number): boolean {
    const p = this.ms[i]!.pos;
    return hyp2(p.x - this.spotX(i), p.z - this.spotZ(i)) <= HUNT.arrive;
  }

  private inBox(i: number, r: number): boolean {
    const p = this.ms[i]!.pos;
    const b = r * 4;
    const bx = this.roomBox;
    return p.x >= bx[b]! && p.x <= bx[b + 2]! && p.z >= bx[b + 1]! && p.z <= bx[b + 3]!;
  }

  // ---- the room cap and the gap (A6; plan check 2 item 1) ---------------------------------------------------------

  /**
   * Guards counted in room r, unit `skip`'s members left out: on r's line and standing in its box, or walking to a stop
   * in it, or a regroup walker whose way to the meeting stop still crosses it (his rooms are kept for him).
   */
  roomLoad(r: number, skip: number): number {
    const l = this.roomLine[r]!;
    let n = 0;
    for (let i = 0; i < this.cap; i++) {
      if (!this.mOn[i]) continue;
      const u = this.mUnit[i]!;
      if (u === skip || this.uLine[u] !== l) continue;
      if (this.inBox(i, r) || this.stopRoom[this.mTo[i]!] === r) n++;
      else if (this.uState[u] === H_REGROUP && this.uWalker[u] === i) {
        const a = this.stopRoom[this.mTo[i]!]!;
        const b = this.stopRoom[this.uTo[u]!]!;
        if ((r >= a && r <= b) || (r >= b && r <= a)) n++;
      }
    }
    return n;
  }

  /** As `roomLoad`, without the units already spreading out of r (the start spread's count). */
  private stayLoad(r: number): number {
    let n = this.roomLoad(r, -1);
    for (let u = 0; u < this.cap; u++)
      if (this.uLive[u] && this.uState[u] === H_SPREAD && this.uLine[u] === this.roomLine[r] && this.stopRoom[this.uDest[u]!] !== r) {
        if (this.uA[u]! >= 0 && this.counted(this.uA[u]!, r)) n--;
        if (this.uB[u]! >= 0 && this.counted(this.uB[u]!, r)) n--;
      }
    return n;
  }

  private counted(i: number, r: number): boolean {
    return this.inBox(i, r) || this.stopRoom[this.mTo[i]!] === r;
  }

  /** Room r takes unit u: the guards in it or walking into it, plus u's size, within `roomCap`. */
  roomSpace(r: number, u: number): boolean {
    return this.roomLoad(r, u) + this.unitSize(u) <= HUNT.roomCap;
  }

  /** No higher-ranked unit of u's line has a member standing at or walking to a stop within `gap` of stop j. */
  gapFree(u: number, j: number): boolean {
    const l = this.uLine[u]!;
    const base = l * this.cap;
    const r = this.rank[u]!;
    for (let k = 0; k < r && k < this.ordN[l]!; k++) {
      const h = this.ord[base + k]!;
      if (h === u) continue;
      if (this.memberNear(this.uA[h]!, j) || this.memberNear(this.uB[h]!, j)) return false;
    }
    return true;
  }

  private memberNear(i: number, j: number): boolean {
    if (i < 0) return false;
    return this.stopDist(j, this.mFrom[i]!) < HUNT.gap || this.stopDist(j, this.mTo[i]!) < HUNT.gap;
  }

  /** A step of u to stop j: the gap, and the room cap on entering a new room. */
  canStep(u: number, j: number): boolean {
    if (!this.gapFree(u, j)) return false;
    const r = this.stopRoom[j]!;
    return r === this.stopRoom[this.uFrom[u]!] || this.roomSpace(r, u);
  }

  // ---- rank (FIX 2, plan check 2 item 1) ----------------------------------------------------------------------

  /**
   * Line l's units in order: the unit looping the target room first, then every other unit in the target room, then the
   * rest; within a class nearer the target along the line first; ties the lower unit index. A unit's place is its `uTo`
   * (a regroup: the meeting stop). Insertion sort into kept buffers.
   */
  rankLine(l: number): void {
    const base = l * this.cap;
    const t = this.tgt[l]!;
    const tr = this.stopRoom[t]!;
    let n = 0;
    for (let u = 0; u < this.cap; u++) {
      if (!this.uLive[u] || this.uLine[u] !== l) continue;
      const s = this.uTo[u]!;
      const inRoom = this.stopRoom[s] === tr;
      const k = (inRoom ? (this.uLooped[u] ? CLS_LOOP : CLS_ROOM) : CLS_OUT) + this.lineDist(s, t);
      this.key[u] = k;
      let p = n;
      while (p > 0) {
        const o = this.ord[base + p - 1]!;
        const ko = this.key[o]!;
        if (ko < k || (ko === k && o < u)) break;
        this.ord[base + p] = o;
        p--;
      }
      this.ord[base + p] = u;
      n++;
    }
    this.ordN[l] = n;
    for (let k = 0; k < n; k++) this.rank[this.ord[base + k]!] = k;
  }

  private rankAll(): void {
    for (let l = 0; l < this.nLines; l++) this.rankLine(l);
  }

  /** Line l's unit at place k (k < `lineUnits(l)`). */
  ranked(l: number, k: number): number {
    return this.ord[l * this.cap + k]!;
  }

  lineUnits(l: number): number {
    return this.ordN[l]!;
  }

  // WIP: admission, states and tick follow.
  protected wip(): number {
    return sweepTurnTime(wrapAng(0)) + this.mMask[0]! + this.mAim[0]! + this.mAimT[0]! + this.mHold[0]! + this.mDone[0]! +
      this.uFull[0]! + this.uNeed[0]! + this.out.length + (this.gone as unknown as number) + (this.settled as unknown as number) +
      (this.stayLoad as unknown as number) + (this.rankAll as unknown as number);
  }
}
