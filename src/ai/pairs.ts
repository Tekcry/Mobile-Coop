/**
 * Talking pairs (guard-ai S10, GA2, the `SectorGuard.pair` tag; pure: no Babylon / DOM), unit-tested.
 *
 * Two guards on timed loops (`PatrolRoute.loop`, one shared period) each have a meeting stop. The meeting window is the
 * loop time when both should stand there: from the later arrival (the previous stop's `leave` plus the walk) to the
 * earlier `leave` of the meeting stop (`stopWindow`, `pairWindow`). States per window:
 *   idle -> waiting (window open) -> meeting (both at their meet points, calm: face each other, two lines on a fixed
 *   schedule) -> done (lines over, or one walked off) -> idle (window closed).
 * A disturbance (`interrupt()`, or either guard not calm) -> interrupted for the rest of that window. One guard down or
 * absent while the other is present and calm for `PAIRS.grace` s from the window opening (a meeting is a radio check in
 * person) -> missing: `lookFor` names the one who goes, `lookX` / `lookZ` the partner's last route point. Missing is
 * held until `reset()` (the pair is broken). Both down: done, nobody asks.
 *
 * Lines: one two-line exchange per meeting from `PAIR_LINES` (or the pair's own table, for map intel), chosen by
 * (pair id + meeting count); the opener alternates by meeting count. No randomness (G143, A7); no allocation per step.
 * The caller fills `a` / `b` each tick, calls `step(dt)`, then reads the outputs (`sayWho` / `sayLine` for this step only).
 *
 * (guard-rules S6, A10, A11) Watch and posted pairs. A def with `watch` also checks outside the window: while both are
 * up, they count as walking together when within `PAIRS.togetherR`; if one then goes down or absent and the other stays
 * calm for `PAIRS.notice` s, the pair goes missing at once (the same outputs as the window's `grace` path; inside the
 * window this check fires first when they were together). The timer counts only while the one left is calm. A posted
 * pair (`postedDef`: two standing guards, the manager builds it behind `flags.guardPairs`) runs the same clock with its
 * meet points at the two posts: a fixed `PAIRS.postedPeriod` s period whose window is its first `PAIRS.postedOpen` s,
 * opening on the first step (no randomness, G143), with `watch` on.
 */
import { hyp2 } from '../core/mathx';
import type { PatrolRoute, Pt } from './patrol';

export const PAIRS = {
  /** A guard within this of his meet point (m) is there. */
  meetR: 1.5,
  /** A guard this far from his meet point (m) during the talk has walked off: the meeting is over. */
  leaveR: 2.5,
  /** First line this long after both are there (s); the second line `lineGap` later. */
  firstLine: 1,
  lineGap: 3.2,
  /** After the second line, they stay facing this long (s), then done. */
  linger: 2.5,
  /** Partner down or absent this long after the window opens (s): the other goes to look for him. */
  grace: 6,
  /** Each line at most this many characters (story.md radio rule). */
  maxChars: 90,
  /** (S10 wiring) Meeting stops further apart than this (m) are not a meeting (`pickMeet`). */
  meetMax: 6,
  /** (S10 wiring) Two stop pairs within this (m) of the same distance tie: the longer window wins (`pickMeet`). */
  meetTie: 0.05,
  /** (S10 wiring) The manager steps every pair at the incident board's rate (s). */
  tick: 0.2,
  /** (guard-rules S6, A10) A partner this close (m) counts as walking with him (`PairDef.watch`). */
  togetherR: 4,
  /** (guard-rules S6, A10) A partner who walked with him gone this long (s, the one left calm): missing. */
  notice: 3,
  /** (guard-rules S6, A11) A posted pair's clock (s): it talks once per period (`postedDef`). */
  postedPeriod: 40,
  /** (guard-rules S6, A11) A posted pair's window (s): the first part of each period. */
  postedOpen: 12,
} as const;

/** A two-line exchange: [opener, reply]. */
export type PairExchange = readonly [string, string];

/**
 * Original site-security small talk (British, calm, dry). Overheard, each carries something a player can use: a door
 * that sticks, a code habit, a shift change, a dead camera, a generator dip, a courier time, a lazy check, a sticky lift.
 */
export const PAIR_LINES: readonly PairExchange[] = [
  ["Store-room door's sticking again. Have to put a shoulder to it.", 'Log it. Facilities might get round to it by spring.'],
  ['They changed the keypad code on the lab wing again.', 'Same as before, last digit up one. Every single time.'],
  ['Relief was meant to be here at four.', 'They pushed the change to quarter past. Nobody told you?'],
  ["Camera over the loading bay's been dead since Tuesday.", "Ticket's open. Nobody touches it before the audit."],
  ['Did you hear the generator cough just now?', 'Does it every night round three. Lights dip, then it settles.'],
  ['Supervisor wants the north stair checked twice an hour.', "Once, if he's not watching. It's a long stair."],
  ["Courier's due at three. Who's signing for it?", 'Gate signs, we carry. Same as always.'],
  ['Service lift is stuck on two again.', "Take the back stairs, then. Nobody's fixing it tonight."],
];

export type PairState = 'idle' | 'waiting' | 'meeting' | 'done' | 'interrupted' | 'missing';

/** One guard of the pair, filled by the caller every tick. */
export interface PairGuard {
  /** Up and in the section (false: dead, knocked out, held, despawned). */
  present: boolean;
  /** Calm and on his route (false: suspicious, investigating, searching, combat, tasked by the incident board). */
  calm: boolean;
  /** Position (m). */
  x: number;
  z: number;
  /** The route point he is at or heading for (`route.points[walker.idx]`): where his partner looks if he goes missing. */
  routeX: number;
  routeZ: number;
}

export interface PairDef {
  /** Pair id, stable per section (e.g. section x 100 + the lower guard index): picks the lines. */
  id: number;
  /** Shared loop period (s) and the loop time of guard A's walker when it was made (its `loop.t0`). */
  period: number;
  t0: number;
  /** Meeting window in A's loop time (s, may wrap past the period): `pairWindow`. */
  open: number;
  close: number;
  /** Each guard's meeting stop (m). */
  aPt: Pt;
  bPt: Pt;
  /** The pair's own lines (map intel, e.g. this site's keypad code); default `PAIR_LINES`. */
  lines?: readonly PairExchange[];
  /** (guard-rules S6, A10) Also check outside the window: a partner who walked with him gone `PAIRS.notice` s -> missing. */
  watch?: boolean;
  /** (guard-rules S6, A11) Built from two posts (`postedDef`; informational: the clock is `period` / `t0` / `open` /
   *  `close`). */
  posted?: boolean;
}

/** A window in loop time (s). */
export interface LoopWindow {
  open: number;
  close: number;
}

const mod = (v: number, p: number): number => ((v % p) + p) % p;

/**
 * The loop time window a guard stands at stop `stop` of a timed loop: from the previous stop's `leave` plus the walk at
 * `speed` (m/s) to this stop's `leave`. Writes `out`; false when the route has no loop or the stop is out of range.
 */
export function stopWindow(route: PatrolRoute, stop: number, speed: number, out: LoopWindow): boolean {
  const lp = route.loop;
  const n = route.points.length;
  if (!lp || stop < 0 || stop >= n || n < 2) return false;
  const prev = (stop - 1 + n) % n;
  const p = route.points[prev]!;
  const q = route.points[stop]!;
  const walk = hyp2(q[0] - p[0], q[1] - p[1]) / Math.max(0.1, speed);
  out.open = mod((lp.leave[prev] ?? 0) + walk, lp.period);
  out.close = mod(lp.leave[stop] ?? 0, lp.period);
  return true;
}

/**
 * The window both guards stand at their meeting stops, in A's loop time (B's window moved by the two walkers' `t0`
 * difference: both walkers made at the same moment). Writes `out`; false when either route has no loop, the periods
 * differ, or the two stays never overlap.
 */
export function pairWindow(
  ra: PatrolRoute,
  stopA: number,
  rb: PatrolRoute,
  stopB: number,
  speed: number,
  out: LoopWindow,
): boolean {
  const la = ra.loop;
  const lb = rb.loop;
  if (!la || !lb || Math.abs(la.period - lb.period) > 1e-6) return false;
  const p = la.period;
  const wa = { open: 0, close: 0 };
  const wb = { open: 0, close: 0 };
  if (!stopWindow(ra, stopA, speed, wa) || !stopWindow(rb, stopB, speed, wb)) return false;
  const sa = wa.open;
  const lenA = mod(wa.close - wa.open, p);
  const sb = mod(wb.open - (lb.t0 - la.t0), p);
  const lenB = mod(wb.close - wb.open, p);
  const d = mod(sb - sa, p);
  if (d < lenA) {
    out.open = sb;
    out.close = mod(sb + Math.min(lenB, lenA - d), p);
    return true;
  }
  const e = mod(sa - sb, p);
  if (e < lenB) {
    out.open = sa;
    out.close = mod(sa + Math.min(lenA, lenB - e), p);
    return true;
  }
  return false;
}

/** The meeting `pickMeet` chose: each guard's stop and the window (A's loop time). */
export interface MeetPick {
  stopA: number;
  stopB: number;
  open: number;
  close: number;
  /** Distance between the two stops (m). */
  d: number;
}

/**
 * (S10 wiring) Where two guards on timed loops meet: of every pair of stops (one per route) at most `maxD` apart whose
 * stays overlap (`pairWindow`), the nearest; a tie (within `PAIRS.meetTie`) goes to the longer window, then the lower
 * stops. Writes `out`; false when none. Load time only (allocates through `pairWindow`).
 */
export function pickMeet(ra: PatrolRoute, rb: PatrolRoute, speed: number, maxD: number, out: MeetPick): boolean {
  const la = ra.loop;
  if (!la || !rb.loop) return false;
  const w: LoopWindow = { open: 0, close: 0 };
  let found = false;
  let bestLen = -1;
  out.d = Infinity;
  for (let i = 0; i < ra.points.length; i++) {
    const p = ra.points[i]!;
    for (let j = 0; j < rb.points.length; j++) {
      const q = rb.points[j]!;
      const d = hyp2(p[0] - q[0], p[1] - q[1]);
      if (d > maxD || d > out.d + PAIRS.meetTie) continue;
      if (!pairWindow(ra, i, rb, j, speed, w)) continue;
      const len = mod(w.close - w.open, la.period);
      // a clearly nearer pair wins; a tie goes to the longer window (the lower stops on a full tie)
      if (found && d >= out.d - PAIRS.meetTie && len <= bestLen) continue;
      found = true;
      bestLen = len;
      out.stopA = i;
      out.stopB = j;
      out.open = w.open;
      out.close = w.close;
      out.d = d;
    }
  }
  return found;
}

/**
 * (guard-rules S6, A11) A posted pair's def: meet points at the two posts, a fixed `PAIRS.postedPeriod` s clock whose
 * window (the first `PAIRS.postedOpen` s) opens on the first step after build (no randomness, G143), `watch` on. Load
 * time only (allocates).
 */
export function postedDef(id: number, aPt: Pt, bPt: Pt): PairDef {
  return { id, period: PAIRS.postedPeriod, t0: 0, open: 0, close: PAIRS.postedOpen, aPt, bPt, watch: true, posted: true };
}

const newGuard = (pt: Pt): PairGuard => ({ present: true, calm: true, x: pt[0], z: pt[1], routeX: pt[0], routeZ: pt[1] });

/** One talking pair's meeting clock and talk. */
export class PairMeet {
  /** Inputs: guard A and guard B (fill every tick before `step`). */
  readonly a: PairGuard;
  readonly b: PairGuard;
  state: PairState = 'idle';
  /** Meetings started so far (picks the next exchange). */
  meetings = 0;
  /** Lines said so far. */
  linesSaid = 0;
  /** While meeting: the yaw each guard faces (rad, 0 = +Z, toward the other); NaN otherwise. */
  faceA = NaN;
  faceB = NaN;
  /** This step only: who speaks (0 = A, 1 = B, -1 nobody) and the line (a table string, never built). */
  sayWho = -1;
  sayLine: string | null = null;
  /** The exchange of the current / last meeting (index into the table). */
  exchange = -1;
  /** Missing: the guard who goes to look (0 = A, 1 = B, -1 none), and where (the partner's last route point). */
  lookFor = -1;
  lookX = 0;
  lookZ = 0;
  /** True on the step the missing request fires (edge). */
  requested = false;

  private clock = 0;
  private wasIn = false;
  private tMeet = 0;
  private missT = 0;
  private opener = 0;
  /** (guard-rules S6) Watch: both up and within `PAIRS.togetherR` at the last step both were up; gone time (s). */
  private together = false;
  private goneT = 0;
  private lastAX: number;
  private lastAZ: number;
  private lastBX: number;
  private lastBZ: number;
  private readonly lines: readonly PairExchange[];

  constructor(readonly def: PairDef) {
    this.a = newGuard(def.aPt);
    this.b = newGuard(def.bPt);
    this.lastAX = def.aPt[0];
    this.lastAZ = def.aPt[1];
    this.lastBX = def.bPt[0];
    this.lastBZ = def.bPt[1];
    this.lines = def.lines && def.lines.length > 0 ? def.lines : PAIR_LINES;
  }

  /** Loop time now (s, 0 .. period), A's clock. */
  loopNow(): number {
    return mod(this.def.t0 + this.clock, this.def.period);
  }

  /** Inside the meeting window now (handles a window that wraps past the period). */
  inWindow(): boolean {
    const t = this.loopNow();
    const { open, close } = this.def;
    return open <= close ? t >= open && t < close : t >= open || t < close;
  }

  /** A disturbance near either guard: the talk stops for this window. */
  interrupt(): void {
    if (this.state === 'waiting' || this.state === 'meeting') this.toInterrupted();
  }

  /** The pair is whole again (a partner woken, a respawn): clear missing and start over at the next window. */
  reset(): void {
    this.state = 'idle';
    this.lookFor = -1;
    this.requested = false;
    this.missT = 0;
    this.together = false;
    this.goneT = 0;
    this.wasIn = this.inWindow();
    this.clearTalk();
  }

  step(dt: number): void {
    this.clock += dt;
    this.sayWho = -1;
    this.sayLine = null;
    this.requested = false;
    const a = this.a;
    const b = this.b;
    if (a.present) {
      this.lastAX = a.routeX;
      this.lastAZ = a.routeZ;
    }
    if (b.present) {
      this.lastBX = b.routeX;
      this.lastBZ = b.routeZ;
    }
    // (guard-rules S6) the walking-together check fires first; the pair is missing until `reset`
    if (this.def.watch && this.state !== 'missing' && this.watch(dt)) return;
    const inW = this.inWindow();
    const opened = inW && !this.wasIn;
    this.wasIn = inW;
    switch (this.state) {
      case 'missing':
        return;
      case 'idle':
        if (opened) {
          this.state = 'waiting';
          this.missT = 0;
          this.waiting(dt, inW);
        }
        return;
      case 'waiting':
        this.waiting(dt, inW);
        return;
      case 'meeting':
        this.meeting(dt);
        return;
      case 'done':
      case 'interrupted':
        if (!inW) this.state = 'idle';
        return;
    }
  }

  private waiting(dt: number, inW: boolean): void {
    const a = this.a;
    const b = this.b;
    if ((a.present && !a.calm) || (b.present && !b.calm)) {
      this.toInterrupted();
      return;
    }
    if (!a.present && !b.present) {
      this.state = 'done';
      this.missT = 0;
      return;
    }
    if (!a.present || !b.present) {
      this.missT += dt;
      if (this.missT >= PAIRS.grace) {
        this.state = 'missing';
        this.requested = true;
        this.lookFor = a.present ? 0 : 1;
        this.lookX = a.present ? this.lastBX : this.lastAX;
        this.lookZ = a.present ? this.lastBZ : this.lastAZ;
      }
      return;
    }
    this.missT = 0;
    if (!inW) {
      // the window closed and they never both stood there: no talk this loop
      this.state = 'done';
      return;
    }
    if (this.at(a, this.def.aPt, PAIRS.meetR) && this.at(b, this.def.bPt, PAIRS.meetR)) this.startMeeting();
  }

  /**
   * (guard-rules S6, A10) The walking-together check (`def.watch`): true on the step the missing request fires. Both up:
   * together when within `PAIRS.togetherR`. One gone after walking together, the one left calm for `PAIRS.notice` s:
   * missing (as `waiting`: `lookFor` the one left, `lookX` / `lookZ` the partner's last route point). The one left busy
   * (not calm) does not notice: the timer restarts, `together` is kept. No allocation.
   */
  private watch(dt: number): boolean {
    const a = this.a;
    const b = this.b;
    if (a.present && b.present) {
      this.together = hyp2(a.x - b.x, a.z - b.z) <= PAIRS.togetherR;
      this.goneT = 0;
      return false;
    }
    if (!a.present && !b.present) {
      this.together = false;
      this.goneT = 0;
      return false;
    }
    if (!this.together) return false;
    const left = a.present ? a : b;
    if (!left.calm) {
      this.goneT = 0;
      return false;
    }
    this.goneT += dt;
    if (this.goneT < PAIRS.notice) return false;
    this.clearTalk();
    this.state = 'missing';
    this.requested = true;
    this.lookFor = a.present ? 0 : 1;
    this.lookX = a.present ? this.lastBX : this.lastAX;
    this.lookZ = a.present ? this.lastBZ : this.lastAZ;
    this.together = false;
    this.goneT = 0;
    this.missT = 0;
    return true;
  }

  private startMeeting(): void {
    const n = this.lines.length;
    this.exchange = mod(this.def.id + this.meetings, n);
    this.opener = this.meetings & 1;
    this.meetings++;
    this.state = 'meeting';
    this.tMeet = 0;
    this.face();
  }

  private meeting(dt: number): void {
    const a = this.a;
    const b = this.b;
    if ((a.present && !a.calm) || (b.present && !b.calm)) {
      this.toInterrupted();
      return;
    }
    if (!a.present || !b.present) {
      // one went down mid-talk unseen (the other is still calm): count the grace from now
      this.clearTalk();
      this.state = 'waiting';
      this.missT = 0;
      return;
    }
    if (!this.at(a, this.def.aPt, PAIRS.leaveR) || !this.at(b, this.def.bPt, PAIRS.leaveR)) {
      // one walked on (his schedule): they split
      this.clearTalk();
      this.state = 'done';
      return;
    }
    this.face();
    const t0 = this.tMeet;
    const t1 = t0 + dt;
    this.tMeet = t1;
    const ex = this.lines[this.exchange]!;
    for (let k = 0; k < 2; k++) {
      const at = PAIRS.firstLine + k * PAIRS.lineGap;
      if (t0 < at && t1 >= at) {
        this.sayWho = (this.opener + k) & 1;
        this.sayLine = ex[k]!;
        this.linesSaid++;
      }
    }
    if (t1 >= PAIRS.firstLine + PAIRS.lineGap + PAIRS.linger) {
      this.clearTalk();
      this.state = 'done';
    }
  }

  private face(): void {
    const dx = this.b.x - this.a.x;
    const dz = this.b.z - this.a.z;
    this.faceA = Math.atan2(dx, dz);
    this.faceB = Math.atan2(-dx, -dz);
  }

  private at(g: PairGuard, p: Pt, r: number): boolean {
    return hyp2(g.x - p[0], g.z - p[1]) <= r;
  }

  private toInterrupted(): void {
    this.clearTalk();
    this.state = 'interrupted';
    this.missT = 0;
  }

  private clearTalk(): void {
    this.faceA = NaN;
    this.faceB = NaN;
    this.tMeet = 0;
  }
}
