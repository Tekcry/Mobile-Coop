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
  /**
   * (check A FIX 1) Guards whose stops (at or walking to) are within this (m, straight) of each other count as one group;
   * a looping unit never steps to a stop that would make a group above `roomCap` with other units' members, any rank
   * (`crowds`). Keeps every group of at most 2 apart from the next, so a pair taken down together is not watched from
   * 3 m (Michael: "not bunch up into groups bigger than 2 ... so coop gameplay allows stealth takedowns"); 4, not 3: a
   * partner's spot (`pt2`) stands about 1 m off the stop's `pt`.
   */
  apart: 4,
  /**
   * (fix round, H3) A member who gets no nearer his spot (by `stuckGain`) for this long gives it up (s): he counts as
   * arrived where he stands, his unit clears that stop from there and goes on. 8: the manager's `goTo` replans once a
   * second, so 8 replans without a gain mean the nav cannot get him there (a walkable leg gains 0.45 m a second); short
   * of one hold cycle (`holdAim` x 3-4 aims) so the units queued behind him wait no longer than they would on a hold.
   */
  stuckT: 8,
  /** The least gain on his best distance to the spot that counts as progress (m; a 0.2 s tick at `pace` is 0.09). */
  stuckGain: 0.1,
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
  /** The stuck watch (`HUNT.stuckT`): the goal it watches (stop * 2 + lead, -1 none), his best distance, the time since. */
  private readonly mGoal: Int32Array;
  private readonly mBest: Float64Array;
  private readonly mStuck: Float64Array;
  /** 1: he gave up his spot: he counts as arrived and stands where he is until his next goal. */
  readonly mSkip: Uint8Array;

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
  /** (check A polish 4) It has had its one look back at this stop (cleared by the next leg). */
  private readonly uBack: Uint8Array;
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
    this.mGoal = new Int32Array(cap).fill(-1);
    this.mBest = new Float64Array(cap);
    this.mStuck = new Float64Array(cap);
    this.mSkip = new Uint8Array(cap);
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
    this.uBack = new Uint8Array(cap);
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

  /** He is within `arrive` of his spot (or gave it up, `mSkip`). */
  private settled(i: number): boolean {
    if (this.mSkip[i]) return true;
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

  // ---- admission (plan check 2 item 2) and the start spread (FIX 2) ----------------------------------------------

  /**
   * Put m on the board: the spawn after the dark, a late spawn, a rejoin after a fight (each time he joins). His line is
   * the one whose `floorY` is nearest his y, his stop the line's nearest (ties: the lower index); he pairs with his
   * partner (the map's pair data) when the partner is on the board as a solo on the same line (else the first tick both
   * can), and a room this puts over `roomCap` sends a unit out at once (`spreadRoom`). False: he cannot join (down,
   * taken, in a fight, or the board is full). Allocates nothing.
   */
  admit(m: M): boolean {
    if (this.gone(m)) return false;
    let i = this.memberIndex(m);
    // (fix round, H3) a woken guard is a new object for the same slot: he takes the slot's index back, so his partner's
    // link (`mPartner`) still names him; the old object leaves the board first
    if (i < 0 && m.slotIdx >= 0)
      for (let k = 0; k < this.cap; k++) {
        const o = this.ms[k];
        if (o && o.slotIdx === m.slotIdx) {
          if (this.mOn[k]) this.drop(k);
          this.ms[k] = m;
          i = k;
          break;
        }
      }
    if (i < 0) {
      for (let k = 0; k < this.cap; k++)
        if (this.ms[k] === null) {
          i = k;
          break;
        }
      if (i < 0) return false;
      this.ms[i] = m;
      this.mPartner[i] = -1;
      for (let k = 0; k < this.cap; k++) {
        const o = this.ms[k];
        if (k !== i && o && this.mPartner[k]! < 0 && pairOf(o, m)) {
          this.mPartner[i] = k;
          this.mPartner[k] = i;
          break;
        }
      }
    }
    if (this.mOn[i]) return true;
    let u = -1;
    for (let k = 0; k < this.cap; k++)
      if (!this.uLive[k]) {
        u = k;
        break;
      }
    if (u < 0) return false;
    const l = this.nearestLine(m.pos.y);
    const s = this.nearestStop(l, m.pos.x, m.pos.z);
    const dir = this.tgt[l]! >= s ? 1 : -1;
    // (check A polish 1) a second solo on a stop takes its free partner spot, not the same leader spot
    let lead1 = false;
    let lead0 = false;
    for (let k = 0; k < this.cap; k++)
      if (this.mOn[k] && (this.mFrom[k] === s || this.mTo[k] === s)) {
        if (this.mLead[k]) lead1 = true;
        else lead0 = true;
      }
    this.mOn[i] = 1;
    this.mUnit[i] = u;
    this.mFrom[i] = s;
    this.mTo[i] = s;
    this.mLead[i] = lead1 && !lead0 ? 0 : 1;
    this.mGoal[i] = -1;
    this.mSkip[i] = 0;
    this.mYaw[i] = this.lineHeading(s, dir);
    this.uLive[u] = 1;
    this.uA[u] = i;
    this.uB[u] = -1;
    this.uLine[u] = l;
    this.uFrom[u] = s;
    this.uTo[u] = s;
    this.uDir[u] = dir;
    this.uLooped[u] = 0;
    this.uBack[u] = 0;
    this.uDest[u] = -1;
    this.uWant[u] = -1;
    this.uWalker[u] = -1;
    this.uNeed[u] = 0;
    this.uState[u] = H_CLEAR;
    this.startCycle(u, HUNT.aimHold);
    this.rankAll();
    const j = this.mPartner[i]!;
    if (j >= 0 && this.mOn[j] && this.tryPair(i, j)) this.rankAll();
    this.spreadRoom(this.stopRoom[s]!);
    const uu = this.mUnit[i]!;
    if (this.uLive[uu] && this.stopRoom[this.uTo[uu]!] !== this.stopRoom[s]) this.spreadRoom(this.stopRoom[this.uTo[uu]!]!);
    return true;
  }

  /**
   * (FIX 2) While room r holds more than `roomCap` (units already spreading out of it not counted), its lowest-ranked solo
   * (else its lowest-ranked unit) spreads out along the line away from the target (in the target room: towards the
   * line's longer end).
   */
  private spreadRoom(r: number): void {
    for (let it = 0; it < 4 && this.stayLoad(r) > HUNT.roomCap; it++) {
      const v = this.lowestIn(r, true, -1);
      if (v < 0 || !this.spreadUnit(v, this.awayDir(r), 0)) break;
    }
    this.rankAll();
  }

  /** Room r's lowest-ranked unit that may be sent out (not spreading, regrouping or checking); `soloFirst`: a solo first. */
  private lowestIn(r: number, soloFirst: boolean, skip: number): number {
    let best = -1;
    let solo = -1;
    for (let u = 0; u < this.cap; u++) {
      if (!this.uLive[u] || u === skip || this.stopRoom[this.uTo[u]!] !== r) continue;
      const st = this.uState[u]!;
      if (st === H_SPREAD || st === H_REGROUP || st === H_CHECK) continue;
      if (best < 0 || this.rank[u]! > this.rank[best]!) best = u;
      if (this.uB[u]! < 0 && (solo < 0 || this.rank[u]! > this.rank[solo]!)) solo = u;
    }
    return soloFirst && solo >= 0 ? solo : best;
  }

  /** Away from the line's target from room r; in the target room towards the line's longer end (ties: up the line). */
  private awayDir(r: number): number {
    const l = this.roomLine[r]!;
    const tr = this.targetRoom(l);
    if (r !== tr) return r > tr ? 1 : -1;
    const up = this.lineEnd[l]! - 1 - this.roomLast[r]!;
    const dn = this.roomFirst[r]! - this.lineFirst[l]!;
    return up >= dn ? 1 : -1;
  }

  /**
   * Send unit v one room on in `dir`, to that room's first stop on the way. A room without space for it first sends its
   * own lowest-ranked unit one room on (and so on along the line). v walks stop by stop and enters the next room only
   * once it has space (`spreadStep`), so the cap holds by positions on the way.
   */
  private spreadUnit(v: number, dir: number, depth: number): boolean {
    const l = this.uLine[v]!;
    const r = this.stopRoom[this.uTo[v]!]! + dir;
    if (r < this.lineRoom0[l]! || r >= this.lineRoomEnd[l]! || depth > this.nRooms) return false;
    if (this.stayLoad(r) + this.unitSize(v) > HUNT.roomCap) {
      const w = this.lowestIn(r, false, v);
      if (w >= 0) this.spreadUnit(w, dir, depth + 1);
    }
    this.uState[v] = H_SPREAD;
    this.uDest[v] = dir > 0 ? this.roomFirst[r]! : this.roomLast[r]!;
    this.uNeed[v] = 0;
    if (this.uFrom[v] === this.uTo[v]) this.startCycle(v, HUNT.holdAim);
    return true;
  }

  /**
   * Pair members i and j (A6): the member nearer the target walks to his partner's stop (`regroup`). Only when both are
   * standing solos on one line, not spreading or checking, and every room on the walker's way (the meeting room
   * included) takes one more: those rooms are then kept for him (`roomLoad`), so he never waits on the way.
   */
  private tryPair(i: number, j: number): boolean {
    const ui = this.mUnit[i]!;
    const uj = this.mUnit[j]!;
    if (ui === uj || this.uB[ui]! >= 0 || this.uB[uj]! >= 0 || this.uLine[ui] !== this.uLine[uj]) return false;
    if (!this.pairable(ui) || !this.pairable(uj)) return false;
    const t = this.tgt[this.uLine[ui]!]!;
    const di = this.lineDist(this.uFrom[ui]!, t);
    const dj = this.lineDist(this.uFrom[uj]!, t);
    const iWaits = di > dj || (di === dj && this.ms[i]!.slotIdx < this.ms[j]!.slotIdx);
    const v = iWaits ? i : j;
    const w = iWaits ? j : i;
    const uv = this.mUnit[v]!;
    const meet = this.mFrom[v]!;
    const ws = this.mFrom[w]!;
    const rw = this.stopRoom[ws]!;
    const rm = this.stopRoom[meet]!;
    if (rw !== rm) {
      const d = rm > rw ? 1 : -1;
      for (let r = rw + d; ; r += d) {
        if (this.roomLoad(r, this.mUnit[w]!) + 1 > HUNT.roomCap) return false;
        if (r === rm) break;
      }
    }
    const keep = ui < uj ? ui : uj;
    const drop = ui < uj ? uj : ui;
    const looped = this.uLooped[uv]!;
    const dir = this.uDir[uv]!;
    this.uLive[drop] = 0;
    this.uA[drop] = -1;
    this.uB[drop] = -1;
    const a = this.ms[i]!.slotIdx <= this.ms[j]!.slotIdx ? i : j;
    const b = a === i ? j : i;
    this.uA[keep] = a;
    this.uB[keep] = b;
    this.mLead[a] = 1;
    this.mLead[b] = 0;
    this.mUnit[i] = keep;
    this.mUnit[j] = keep;
    this.uFrom[keep] = meet;
    this.uTo[keep] = meet;
    this.uLooped[keep] = looped;
    this.uBack[keep] = 0;
    this.uDir[keep] = dir;
    this.uNeed[keep] = 0;
    this.uWant[keep] = -1;
    this.uDest[keep] = -1;
    if (ws === meet) {
      this.uWalker[keep] = -1;
      this.uState[keep] = H_CLEAR;
      this.startCycle(keep, HUNT.aimHold);
    } else {
      this.uWalker[keep] = w;
      this.uState[keep] = H_REGROUP;
      this.startCycle(keep, HUNT.holdAim);
    }
    return true;
  }

  private pairable(u: number): boolean {
    const st = this.uState[u]!;
    return this.uFrom[u] === this.uTo[u] && (st === H_CLEAR || st === H_HOLD || st === H_LOOP);
  }

  /** A down, taken or fighting member leaves the board; his partner goes on as a solo (a regroup ends where it is). */
  private drop(i: number): void {
    const u = this.mUnit[i]!;
    this.mOn[i] = 0;
    this.mUnit[i] = -1;
    if (u < 0) return;
    const r = this.uA[u] === i ? this.uB[u]! : this.uA[u]!;
    this.uB[u] = -1;
    if (r < 0) {
      this.uLive[u] = 0;
      this.uA[u] = -1;
      return;
    }
    this.uA[u] = r;
    this.mLead[r] = 1;
    if (this.uState[u] === H_REGROUP) {
      const walker = this.uWalker[u] === r;
      this.uWalker[u] = -1;
      if (walker && this.mFrom[r] !== this.mTo[r]) {
        this.uState[u] = H_SPREAD;
        this.uFrom[u] = this.mFrom[r]!;
        this.uTo[u] = this.mTo[r]!;
        this.uDest[u] = this.mTo[r]!;
      } else {
        this.uFrom[u] = this.mFrom[r]!;
        this.uTo[u] = this.mFrom[r]!;
        this.mTo[r] = this.mFrom[r]!;
        this.uState[u] = H_CLEAR;
        this.startCycle(u, HUNT.aimHold);
      }
    }
  }

  // ---- the order (A4, FIX 1) -------------------------------------------------------------------------------------

  /** Every line with a live unit has had every stop of its target room cleared once in this phase. */
  allCleared(): boolean {
    for (let l = 0; l < this.nLines; l++) {
      let any = false;
      for (let u = 0; u < this.cap; u++) if (this.uLive[u] && this.uLine[u] === l) any = true;
      if (!any) continue;
      const r = this.targetRoom(l);
      for (let s = this.roomFirst[r]!; s <= this.roomLast[r]!; s++) if (!this.done[s]) return false;
    }
    return true;
  }

  /** The phase steps on once every target room is cleared and `phaseMin` has run, or at `phaseMax`; the last holds. */
  private orderStep(): void {
    if (this.phase >= this.nPhases - 1) return;
    if (this.phaseT >= HUNT.phaseMax || (this.phaseT >= HUNT.phaseMin && this.allCleared())) this.stepPhase();
  }

  /** Next row: each line's target = its new phase room's stop nearest the previous target. */
  private stepPhase(): void {
    this.phase++;
    this.phaseT = 0;
    this.done.fill(0);
    const L = this.nLines;
    for (let l = 0; l < L; l++) {
      const r = this.phaseRoom[this.phase * L + l]!;
      if (r < 0) continue;
      const t = this.tgt[l]!;
      this.setLineTarget(l, this.nearestStop(l, this.sx[t]!, this.sz[t]!, r));
    }
  }

  private setLineTarget(l: number, s: number): void {
    if (this.stopRoom[s] !== this.stopRoom[this.tgt[l]!]) for (let u = 0; u < this.cap; u++) if (this.uLine[u] === l) this.uLooped[u] = 0;
    if (s !== this.tgt[l]) {
      this.tgt[l] = s;
      this.tgtGen[l]!++;
    }
  }

  /**
   * (H4 calls it: a contact call that gets through, a body found, a fight's end) Jump the order to point (x, z) at
   * height y: that line's target = its stop nearest the point; the phase = the first row naming that stop's room on the
   * line (none, e.g. the landing: 0); every other line's target = its stop in its new phase room nearest (x, z). The
   * phase clock restarts and the order runs on from there.
   */
  setTarget(x: number, z: number, y: number): void {
    const L = this.nLines;
    const l = this.nearestLine(y);
    const s = this.nearestStop(l, x, z);
    const r = this.stopRoom[s]!;
    let p = 0;
    for (let q = 0; q < this.nPhases; q++)
      if (this.phaseRoom[q * L + l] === r) {
        p = q;
        break;
      }
    this.phase = p;
    this.phaseT = 0;
    this.done.fill(0);
    this.setLineTarget(l, s);
    for (let k = 0; k < L; k++) {
      if (k === l) continue;
      const rk = this.phaseRoom[p * L + k]!;
      if (rk >= 0) this.setLineTarget(k, this.nearestStop(k, x, z, rk));
    }
  }

  // ---- aims (A8, A9, fold-in 9) ------------------------------------------------------------------------------------

  /**
   * The aims a unit uses at stop s facing `fwd` (the line towards its target; looping: its way round): those within
   * `aimSide` of it; in the target room (`full`) also the first one outside (at most one look back a stop). None within:
   * the nearest one. Bit k = the stop's aim k.
   */
  aimMask(s: number, fwd: number, full: boolean): number {
    let mask = 0;
    let back = -1;
    let best = 0;
    let bd = Infinity;
    const f = this.aimFirst[s]!;
    for (let k = 0; k < this.aimN[s]!; k++) {
      const d = Math.abs(wrapAng(this.aims[f + k]! - fwd));
      if (d <= HUNT.aimSide) mask |= 1 << k;
      else if (back < 0) back = k;
      if (d < bd) {
        bd = d;
        best = k;
      }
    }
    if (full && back >= 0) mask |= 1 << back;
    if (mask === 0 && this.aimN[s]! > 0) mask = 1 << best;
    return mask;
  }

  /** A new aim cycle at the unit's stop, `hold` s on each aim; a pair: the leader the even ones, his partner the odd. */
  private startCycle(u: number, hold: number): void {
    const l = this.uLine[u]!;
    const t = this.tgt[l]!;
    const s = this.uFrom[u]!;
    const inRoom = this.stopRoom[s] === this.stopRoom[t];
    const ud = this.uDir[u]! >= 0 ? 1 : -1;
    const dir = inRoom && (s === t || this.uLooped[u]) ? ud : t > s ? 1 : t < s ? -1 : ud;
    this.uFull[u] = inRoom ? 1 : 0;
    // (check A polish 4) the one look back once per stop: a hold's later cycles there leave it out
    const back = inRoom && !this.uBack[u];
    if (back) this.uBack[u] = 1;
    const all = this.aimMask(s, this.lineHeading(s, dir), back);
    const a = this.uA[u]!;
    const b = this.uB[u]!;
    if (b < 0) {
      this.memberCycle(a, all, hold);
      return;
    }
    let even = 0;
    let odd = 0;
    let c = 0;
    let first = 0;
    for (let k = 0; k < this.aimN[s]!; k++) {
      if (!(all & (1 << k))) continue;
      if (c === 0) first = 1 << k;
      if (c & 1) odd |= 1 << k;
      else even |= 1 << k;
      c++;
    }
    this.memberCycle(a, even, hold);
    this.memberCycle(b, odd !== 0 ? odd : first, hold);
  }

  private memberCycle(i: number, mask: number, hold: number): void {
    this.mMask[i] = mask;
    this.mAim[i] = -1;
    this.mAimT[i] = 0;
    this.mHold[i] = hold;
    this.mDone[i] = 0;
  }

  /** His aims at his stop in mask order: the calm turn onto each (`sweepTurnTime`), then `mHold` s. */
  private advanceAims(i: number, dt: number): void {
    if (this.mDone[i]) return;
    const f = this.aimFirst[this.mFrom[i]!]!;
    const mask = this.mMask[i]!;
    let t = this.mAimT[i]! - dt;
    while (t <= 0) {
      let k = this.mAim[i]! + 1;
      while (k < 31 && !(mask & (1 << k))) k++;
      if (k >= 31) {
        this.mDone[i] = 1;
        this.mAimT[i] = 0;
        return;
      }
      this.mAim[i] = k;
      const yaw = this.aims[f + k]!;
      t += sweepTurnTime(wrapAng(yaw - this.mYaw[i]!)) + this.mHold[i]!;
      this.mYaw[i] = yaw;
    }
    this.mAimT[i] = t;
  }

  // ---- the states and the tick ----------------------------------------------------------------------------------

  /** The state's name (tests, debug). */
  stateName(u: number): string {
    return HUNT_STATES[this.uState[u]!] ?? '?';
  }

  /**
   * One board tick (the manager's 0.2 s): fights, downs and takedowns leave the board; arrivals and aims run; the order
   * steps; the lines are ranked; pairs that can meet start their regroup; each line's units decide in rank order (higher
   * ranks first, so lower ranks see their new stops); last every member's goal goes out. Allocates nothing.
   */
  tick(dt: number): void {
    this.phaseT += dt;
    const cap = this.cap;
    for (let i = 0; i < cap; i++) if (this.mOn[i] && this.gone(this.ms[i]!)) this.drop(i);
    for (let u = 0; u < cap; u++) if (this.uLive[u]) this.advanceUnit(u, dt);
    this.orderStep();
    this.rankAll();
    let paired = false;
    for (let i = 0; i < cap; i++) {
      const j = this.mPartner[i]!;
      if (j > i && this.mOn[i] && this.mOn[j] && this.mUnit[i] !== this.mUnit[j] && this.tryPair(i, j)) paired = true;
    }
    if (paired) this.rankAll();
    for (let l = 0; l < this.nLines; l++) {
      const n = this.ordN[l]!;
      for (let k = 0; k < n; k++) this.decide(this.ord[l * cap + k]!);
    }
    for (let i = 0; i < cap; i++) if (this.mOn[i]) this.emit(i);
  }

  /**
   * (fix round, H3) The stuck watch: while he is off his spot, his best distance to it must shrink by `stuckGain` at least
   * every `stuckT` s; else he gives the spot up (`mSkip`): he counts as arrived, his unit clears the stop from where he
   * stands (its aim cycle, which marks the stop done in the target room) and steps on as usual. A new goal resets it.
   */
  private watch(i: number, dt: number): void {
    const g = this.mTo[i]! * 2 + this.mLead[i]!;
    if (g !== this.mGoal[i]) {
      this.mGoal[i] = g;
      this.mBest[i] = Infinity;
      this.mStuck[i] = 0;
      this.mSkip[i] = 0;
    }
    if (this.mSkip[i]) return;
    const p = this.ms[i]!.pos;
    const d = hyp2(p.x - this.spotX(i), p.z - this.spotZ(i));
    if (d <= HUNT.arrive || d < this.mBest[i]! - HUNT.stuckGain) {
      this.mBest[i] = d;
      this.mStuck[i] = 0;
      return;
    }
    this.mStuck[i] = this.mStuck[i]! + dt;
    if (this.mStuck[i]! >= HUNT.stuckT) this.mSkip[i] = 1;
  }

  private arriveMember(i: number): void {
    if (this.mFrom[i] === this.mTo[i] || !this.settled(i)) return;
    this.mYaw[i] = this.legHdg(this.mFrom[i]!, this.mTo[i]!);
    this.mFrom[i] = this.mTo[i]!;
  }

  private advanceUnit(u: number, dt: number): void {
    const a = this.uA[u]!;
    const b = this.uB[u]!;
    this.watch(a, dt);
    if (b >= 0) this.watch(b, dt);
    this.arriveMember(a);
    if (b >= 0) this.arriveMember(b);
    let w = -1;
    if (this.uState[u] === H_REGROUP) {
      w = this.uWalker[u]!;
      const meet = this.uTo[u]!;
      if (this.mFrom[w] === meet && this.mTo[w] === meet) {
        this.uState[u] = H_CLEAR;
        this.uWalker[u] = -1;
        w = -1;
        this.startCycle(u, HUNT.aimHold);
      }
    } else if (this.uFrom[u] !== this.uTo[u]) {
      if (this.mFrom[a] !== this.mTo[a] || (b >= 0 && this.mFrom[b] !== this.mTo[b])) return;
      this.uFrom[u] = this.uTo[u]!;
      this.onArrive(u);
    }
    // H_CHECK (H4): the check's look runs here.
    let all = true;
    if (a !== w) {
      const ok = this.settled(a);
      if (ok) this.advanceAims(a, dt);
      if (!ok || !this.mDone[a]) all = false;
    }
    if (b >= 0 && b !== w) {
      const ok = this.settled(b);
      if (ok) this.advanceAims(b, dt);
      if (!ok || !this.mDone[b]) all = false;
    }
    if (all) this.onCycleDone(u);
  }

  /** A walked leg ends: a move clears its new stop (at the target the unit starts its loop), a loop clears, a spread
   *  clears at its last stop and otherwise waits for its next step. */
  private onArrive(u: number): void {
    this.uNeed[u] = 0;
    switch (this.uState[u]) {
      case H_MOVE:
        this.uState[u] = H_CLEAR;
        if (this.uFrom[u] === this.tgt[this.uLine[u]!]) this.uLooped[u] = 1;
        this.startCycle(u, HUNT.aimHold);
        break;
      case H_SPREAD:
        if (this.uFrom[u] === this.uDest[u]) {
          this.uState[u] = H_CLEAR;
          this.startCycle(u, HUNT.aimHold);
        } else this.startCycle(u, HUNT.holdAim);
        break;
      default:
        this.startCycle(u, HUNT.aimHold);
    }
  }

  /** An aim cycle ends: a full cycle in the target room marks its stop done; a cycle outside it marks done the target
   *  room's stops within `apart` (check A FIX 1: the looper may not go there, `crowds`, and outside the target room a
   *  unit's aims face the target, so they cover those stops); a clear (or a loop stop) decides next; a hold, a spread
   *  waiting for space and a regroup's waiting member go round again. */
  private onCycleDone(u: number): void {
    const s = this.uFrom[u]!;
    const tr = this.targetRoom(this.uLine[u]!);
    if (this.stopRoom[s] === tr) {
      if (this.uFull[u]) this.done[s] = 1;
    } else if (this.uFrom[u] === this.uTo[u])
      for (let q = this.roomFirst[tr]!; q <= this.roomLast[tr]!; q++) if (this.stopDist(q, s) < HUNT.apart) this.done[q] = 1;
    const st = this.uState[u]!;
    if (st === H_CLEAR || st === H_LOOP) this.uNeed[u] = 1;
    else if (st === H_HOLD || st === H_SPREAD || st === H_REGROUP) this.startCycle(u, HUNT.holdAim);
  }

  private decide(u: number): void {
    switch (this.uState[u]) {
      case H_CLEAR:
      case H_LOOP:
        if (this.uNeed[u]) this.stepOrHold(u);
        break;
      case H_HOLD:
        this.stepOrHold(u);
        break;
      case H_SPREAD:
        if (this.uFrom[u] === this.uTo[u] && this.uFrom[u] !== this.uDest[u]) this.spreadStep(u);
        break;
      case H_REGROUP: {
        const w = this.uWalker[u]!;
        if (this.mFrom[w] === this.mTo[w] && this.mTo[w] !== this.uTo[u]) this.regroupStep(u);
        break;
      }
      // H_CHECK (H4): the check's steps (its line to the spot's stop under the cap, the room edge) go here.
    }
  }

  /**
   * The step rules (A6, A9). At its target, or once it has reached it, a unit loops its target room's stops in line
   * order, turning at the room's ends (fold-in 6: the way back clears every stop too). Otherwise it steps one stop
   * towards the target when `canStep`. A unit that may not step holds (re-clears its aims at `holdAim`).
   */
  private stepOrHold(u: number): void {
    const l = this.uLine[u]!;
    const t = this.tgt[l]!;
    const s = this.uFrom[u]!;
    this.uNeed[u] = 0;
    if (this.stopRoom[s] === this.stopRoom[t] && (s === t || this.uLooped[u])) {
      this.uLooped[u] = 1;
      const j = this.loopNext(u);
      this.uWant[u] = j;
      if (j >= 0) {
        this.leg(u, j, H_LOOP);
        return;
      }
    } else {
      const j = s + (t > s ? 1 : -1);
      this.uWant[u] = j;
      if (this.canStep(u, j)) {
        this.leg(u, j, H_MOVE);
        return;
      }
    }
    if (this.uState[u] !== H_HOLD) {
      this.uState[u] = H_HOLD;
      this.startCycle(u, HUNT.holdAim);
    }
  }

  /** The loop's next stop: on round its way, else back the other way; never into the gap of a higher rank, onto a stop
   *  another unit holds or walks to, or into a group above 2 (`crowds`, any rank) (-1: neither; the unit holds and
   *  clears where it is). */
  private loopNext(u: number): number {
    const s = this.uFrom[u]!;
    const r = this.stopRoom[s]!;
    let d = this.uDir[u]! >= 0 ? 1 : -1;
    for (let k = 0; k < 2; k++, d = -d) {
      const j = s + d;
      if (j < this.roomFirst[r]! || j > this.roomLast[r]!) continue;
      if (this.gapFree(u, j) && !this.stopTaken(u, j) && !this.crowds(u, j)) return j;
    }
    return -1;
  }

  private stopTaken(u: number, j: number): boolean {
    for (let i = 0; i < this.cap; i++) if (this.mOn[i] && this.mUnit[i] !== u && (this.mFrom[i] === j || this.mTo[i] === j)) return true;
    return false;
  }

  /**
   * (check A FIX 1) Unit u at stop j would stand in a group above `roomCap`: its members plus the other units' members
   * near j (`nearStop`) make more than 2, or (u a solo) the one other guard near j already has another guard near him
   * (his partner included). Any rank.
   */
  crowds(u: number, j: number): boolean {
    let n = this.unitSize(u);
    let near = -1;
    for (let i = 0; i < this.cap; i++)
      if (this.mOn[i] && this.mUnit[i] !== u && this.nearStop(i, j)) {
        n++;
        near = i;
      }
    if (n > HUNT.roomCap) return true;
    if (near < 0) return false;
    const f = this.mFrom[near]!;
    const t = this.mTo[near]!;
    for (let i = 0; i < this.cap; i++)
      if (this.mOn[i] && i !== near && this.mUnit[i] !== u && (this.nearStop(i, f) || this.nearStop(i, t))) return true;
    return false;
  }

  /** Member i stands at or walks to a stop within `apart` of stop j. */
  private nearStop(i: number, j: number): boolean {
    return this.stopDist(j, this.mFrom[i]!) < HUNT.apart || this.stopDist(j, this.mTo[i]!) < HUNT.apart;
  }

  private leg(u: number, j: number, st: number): void {
    const a = this.uA[u]!;
    const b = this.uB[u]!;
    this.uDir[u] = j > this.uFrom[u]! ? 1 : -1;
    this.uTo[u] = j;
    this.uBack[u] = 0;
    if (b < 0) this.mLead[a] = 1;
    this.mTo[a] = j;
    this.mSkip[a] = 0;
    if (b >= 0) {
      this.mTo[b] = j;
      this.mSkip[b] = 0;
    }
    this.uState[u] = st;
    this.uNeed[u] = 0;
  }

  /** A spread's next stop; into a new room only when it has space. */
  private spreadStep(u: number): void {
    const s = this.uFrom[u]!;
    const j = s + (this.uDest[u]! > s ? 1 : -1);
    this.uWant[u] = j;
    const r = this.stopRoom[j]!;
    if (r !== this.stopRoom[s] && !this.roomSpace(r, u)) return;
    this.leg(u, j, H_SPREAD);
  }

  /** The regroup walker's next stop towards the meeting stop (his rooms are kept for him; checked again anyway). */
  private regroupStep(u: number): void {
    const w = this.uWalker[u]!;
    const s = this.mFrom[w]!;
    const meet = this.uTo[u]!;
    const j = s + (meet > s ? 1 : -1);
    const r = this.stopRoom[j]!;
    if (r !== this.stopRoom[s] && this.roomLoad(r, u) + 1 + (r === this.stopRoom[meet] ? 1 : 0) > HUNT.roomCap) return;
    this.mTo[w] = j;
    this.mSkip[w] = 0;
  }

  /** His goal: his spot at the stop he stands at or walks to; the face (NaN while walking); the pace. */
  private emit(i: number): void {
    if (this.mSkip[i]) {
      const p = this.ms[i]!.pos;
      this.out(this.ms[i]!, p.x, p.z, this.mYaw[i]!, HUNT.pace);
      return;
    }
    const walking = this.mFrom[i] !== this.mTo[i] || !this.settled(i);
    this.out(this.ms[i]!, this.spotX(i), this.spotZ(i), walking ? Number.NaN : this.mYaw[i]!, HUNT.pace);
  }
}

/** a and b are a pair: either names the other. */
function pairOf(a: HuntMember, b: HuntMember): boolean {
  return (a.pairSlot >= 0 && a.pairSlot === b.slotIdx) || (b.pairSlot >= 0 && b.pairSlot === a.slotIdx);
}
