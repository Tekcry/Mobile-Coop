/**
 * The section radio net (guard-ai S3, design section 5; pure: no Babylon / DOM), unit-tested (`tests/radioNet.test.ts`).
 *
 * M5 "Own section, staggered": a guard who reports something holds his radio for a while (a call); only when the call
 * completes does the rest of HIS section hear it, one receiver at a time by distance, over a few seconds, never all at
 * once; other sections hear nothing. A call is a timer the caller must survive: take him out (or grab / blind him)
 * before it completes and the call is lost (`cut`), so only the guards in voice range know (voice is the hearing
 * model's job, see `hearsVoice`). No relay: a receiver does not re-broadcast. No randomness (G143, A7).
 *
 * API (one `RadioNet` per section; Sector Ops: the live `SectorDef` index, other maps 0 unless zones split them, A6):
 * - `startCall(caller, inc, kind, holdS, now?)` -> call id (> 0), or -1 when refused: a second `command` call while one
 *   is open in this section, or the call pool (`RADIO_CALLS`) is full. The same caller, incident and kind already open
 *   returns the open call's id (no duplicate). Nothing is sent until the call completes `holdS` s later (`callHold`).
 * - `isOpen(id)` (guard-ai S14): the call is still open (neither completed nor cut).
 * - `cut(caller)` -> number of calls lost: every open call of that caller is dropped (nothing sent, no alarm). Calls that
 *   already completed (receivers queued) are not recalled: they got through.
 * - `tick(dt, view, sink, reaction?, section?)` at 10 Hz:
 *   1. completes the calls that are due (in due order, ties by call id). A caller missing from the view or flagged
 *      `GV_DOWN` / `GV_HELD` at that moment loses the call (a safety net; integration still calls `cut`).
 *   2. a completed `command` call calls `sink.alarm(section, caller)` once and queues nobody (it goes to command, M4).
 *      Any other kind queues every other live guard of the section (not `GV_DOWN`; `section[i] === this.section` when a
 *      section lane is passed, else everyone in the view) sorted by 3D distance from the caller (ties: lower view
 *      index), receiver of rank r at `delay = min(staggerMax, staggerBase + r * staggerStep + d * staggerDist) *
 *      reaction[i]` after the call completed (`reaction` null = 1). A receiver already queued for the same incident
 *      and kind is not queued twice.
 *   3. delivers the queue entries that are due (due order, ties by queue order) through `sink.deliver(guard, inc,
 *      kind, caller)`, skipping a receiver who has left the view or is `GV_DOWN` by then.
 *   Guards are named by their stable id (`GuardView.id`, `Enemy.num`), never by view index (the manager drops dead
 *   guards from its list between ticks); `deliver`'s first argument is that id.
 * - Lanes (proposal, documented for integration): `reaction` is a Float32Array by VIEW INDEX holding each guard's
 *   reaction multiplier (`diff.reaction x (buff ? ARCHETYPE.officer.reaction : 1)`, the old `callAlert` factor);
 *   `section` is an Int16Array by view index holding each guard's section. Both optional; the manager keeps one of
 *   each beside its `GuardView` and grows them with it. `GuardView` (incidents.ts) is reused unchanged.
 * - Overflow: the receiver queue is a fixed pool of `RADIO.queue` (64) entries. When it is full a new entry is REFUSED
 *   (the farthest receivers of the newest call miss it) and counted in `dropped`; nothing already queued is lost.
 *   The call pool (`RADIO_CALLS` 16) refuses new calls the same way (`refused`).
 *
 * Allocation: fixed typed-array pools; the only growth is the sort scratch when a bigger view arrives (as the board).
 */
import { hyp3 } from '../core/mathx';
import { effectiveReach, hearTier } from './hearing';
import { GV_DOWN, GV_HELD, type GuardView } from './incidents';

export const RADIO = {
  /** Voice reach (m) through the hearing model (walls, ambient): heard at tier >= 2 = inside half of it (6 m open,
   *  2.7 m through one wall). */
  voice: 12,
  /** (S3 integration) Seconds from a shout to a guard who heard it joining (fixed: no randomness, A7). */
  voiceDelay: 0.3,
  /** Seconds a caller holds the radio for a report, x his reaction (the old `ALERT.callIn`). */
  callIn: 2.5,
  /** Seconds a `command` call ("Command, contact. Send backup.") takes, x reaction (alarm, design section 7). */
  report: 4,
  /** Receiver of rank r (by distance) hears at min(staggerMax, staggerBase + r * staggerStep + d * staggerDist) s. */
  staggerBase: 0.6,
  staggerStep: 0.5,
  staggerDist: 0.02,
  staggerMax: 4.5,
  /** Receiver queue entries per section (fixed pool). */
  queue: 64,
} as const;

/** Open calls per section (fixed pool). */
export const RADIO_CALLS = 16;

/** (guard-ai S14) `shots`: a calm guard who heard a loud shot calls it in (section caution on delivery). Appended, so
 *  the older kind codes keep their numbers. */
export type CallKind = 'contact' | 'body' | 'ko' | 'light' | 'standDown' | 'missing' | 'command' | 'shots';

/** Kind codes (the net's typed arrays). */
export const CALL_KIND: readonly CallKind[] = ['contact', 'body', 'ko', 'light', 'standDown', 'missing', 'command', 'shots'];
const C_COMMAND = 6;

/** Where completed calls go (one object kept by the manager, not a closure per tick). */
export interface RadioSink {
  /** Guard `guard` (stable id) hears the call about incident `inc` from `caller` (stable id). */
  deliver(guard: number, inc: number, kind: CallKind, caller: number): void;
  /** A `command` call from `caller` got through in `section`: raise the alarm (reinforcements, M4). */
  alarm(section: number, caller: number): void;
  /** (S3 integration, optional) `caller`'s call got through (before its receivers are queued): his radio line. */
  completed?(caller: number, inc: number, kind: CallKind): void;
}

/** How long a caller holds the radio (s): `command` RADIO.report, else RADIO.callIn, x his reaction. */
export function callHold(kind: CallKind, reaction = 1): number {
  return (kind === 'command' ? RADIO.report : RADIO.callIn) * reaction;
}

/** The stagger (s) of the receiver of rank `rank` (0 = nearest) at `dist` m, x his reaction. */
export function staggerDelay(rank: number, dist: number, reaction = 1): number {
  const R = RADIO;
  return Math.min(R.staggerMax, R.staggerBase + rank * R.staggerStep + dist * R.staggerDist) * reaction;
}

/** Does a guard `dist` m from a shouting guard, `walls` walls between and `ambient` dB of masking at him, hear the
 *  shout well enough to act on it (hearing tier >= 2 for a `RADIO.voice` reach)? */
export function hearsVoice(dist: number, walls: number, ambient: number): boolean {
  return hearTier(dist, effectiveReach(RADIO.voice, walls, ambient), false) >= 2;
}

const NC = RADIO_CALLS;
const NQ = RADIO.queue;

export class RadioNet {
  /** Net clock (s), advanced by `tick`. */
  now = 0;
  /** Counters (tests / debug). */
  completed = 0;
  lost = 0;
  refused = 0;
  dropped = 0;
  alarms = 0;
  delivered = 0;

  // ----- open calls -----
  readonly callId = new Int32Array(NC);
  readonly caller = new Int32Array(NC);
  readonly callInc = new Int32Array(NC);
  readonly callKind = new Uint8Array(NC);
  readonly callDue = new Float64Array(NC);
  readonly callOpen = new Uint8Array(NC);

  // ----- receiver queue (fixed pool) -----
  readonly qUsed = new Uint8Array(NQ);
  readonly qDue = new Float64Array(NQ);
  readonly qRx = new Int32Array(NQ);
  readonly qInc = new Int32Array(NQ);
  readonly qKind = new Uint8Array(NQ);
  readonly qCaller = new Int32Array(NQ);
  readonly qSeq = new Float64Array(NQ);

  private nextId = 1;
  private seq = 0;
  /** Sort scratch by view index. */
  private order = new Int32Array(32);
  private dist = new Float32Array(32);

  /** `section`: the section this net serves (Sector Ops index; elsewhere 0). */
  constructor(public section = 0) {}

  /** Drop every call and queued receiver (a section load, a restart). */
  clear(): void {
    this.callOpen.fill(0);
    this.qUsed.fill(0);
  }

  /** Open calls (tests / debug). */
  get openCalls(): number {
    let n = 0;
    for (let c = 0; c < NC; c++) n += this.callOpen[c]!;
    return n;
  }

  /** Queued receivers (tests / debug). */
  get queued(): number {
    let n = 0;
    for (let q = 0; q < NQ; q++) n += this.qUsed[q]!;
    return n;
  }

  /** Sort scratch capacity (tests: it must not grow without a bigger view). */
  get scratchCap(): number {
    return this.order.length;
  }

  /** Is a `command` call open in this section? */
  get commandOpen(): boolean {
    for (let c = 0; c < NC; c++) if (this.callOpen[c] && this.callKind[c] === C_COMMAND) return true;
    return false;
  }

  /** (guard-ai S14) Is call `id` (a `startCall` id) still open: not yet completed, not cut? */
  isOpen(id: number): boolean {
    if (id <= 0) return false;
    for (let c = 0; c < NC; c++) if (this.callOpen[c] && this.callId[c] === id) return true;
    return false;
  }

  /** Seconds until `caller`'s earliest open call completes (0: none open). Tests / debug / e2e. */
  pendingFor(caller: number): number {
    let best = Infinity;
    for (let c = 0; c < NC; c++) if (this.callOpen[c] && this.caller[c] === caller && this.callDue[c]! < best) best = this.callDue[c]!;
    return best < Infinity ? Math.max(0, best - this.now) : 0;
  }

  /** Start a call (see the header); -1 when refused. */
  startCall(caller: number, inc: number, kind: CallKind, holdS: number, now = this.now): number {
    const k = CALL_KIND.indexOf(kind);
    let free = -1;
    for (let c = 0; c < NC; c++) {
      if (!this.callOpen[c]) {
        if (free < 0) free = c;
        continue;
      }
      if (this.caller[c] === caller && this.callInc[c] === inc && this.callKind[c] === k) return this.callId[c]!;
      if (k === C_COMMAND && this.callKind[c] === C_COMMAND) {
        this.refused++;
        return -1;
      }
    }
    if (free < 0) {
      this.refused++;
      return -1;
    }
    const id = this.nextId++;
    this.callId[free] = id;
    this.caller[free] = caller;
    this.callInc[free] = inc;
    this.callKind[free] = k;
    this.callDue[free] = now + Math.max(0, holdS);
    this.callOpen[free] = 1;
    return id;
  }

  /** The caller went down / was grabbed / blinded: his open calls are lost. Returns how many. */
  cut(caller: number): number {
    let n = 0;
    for (let c = 0; c < NC; c++) {
      if (!this.callOpen[c] || this.caller[c] !== caller) continue;
      this.callOpen[c] = 0;
      n++;
    }
    this.lost += n;
    return n;
  }

  /** Advance the net (10 Hz): complete due calls, queue their receivers, deliver due receivers. */
  tick(dt: number, view: GuardView, sink: RadioSink, reaction: Float32Array | null = null, section: Int16Array | null = null): void {
    this.now += dt;
    if (this.order.length < view.n) {
      let c = this.order.length;
      while (c < view.n) c *= 2;
      this.order = new Int32Array(c);
      this.dist = new Float32Array(c);
    }
    // 1-2. complete due calls, earliest first (ties: lower call id)
    for (;;) {
      let b = -1;
      for (let c = 0; c < NC; c++) {
        if (!this.callOpen[c] || this.callDue[c]! > this.now) continue;
        if (b < 0 || this.callDue[c]! < this.callDue[b]! || (this.callDue[c] === this.callDue[b] && this.callId[c]! < this.callId[b]!)) b = c;
      }
      if (b < 0) break;
      this.callOpen[b] = 0;
      this.complete(b, view, sink, reaction, section);
    }
    // 3. deliver due receivers, earliest first (ties: queue order)
    for (;;) {
      let b = -1;
      for (let q = 0; q < NQ; q++) {
        if (!this.qUsed[q] || this.qDue[q]! > this.now) continue;
        if (b < 0 || this.qDue[q]! < this.qDue[b]! || (this.qDue[q] === this.qDue[b] && this.qSeq[q]! < this.qSeq[b]!)) b = q;
      }
      if (b < 0) break;
      this.qUsed[b] = 0;
      const rx = this.qRx[b]!;
      const i = indexOf(view, rx);
      if (i < 0 || view.flags[i]! & GV_DOWN) continue;
      if (section && section[i] !== this.section) continue;
      this.delivered++;
      sink.deliver(rx, this.qInc[b]!, CALL_KIND[this.qKind[b]!]!, this.qCaller[b]!);
    }
  }

  // ----- internals -----

  private complete(c: number, view: GuardView, sink: RadioSink, reaction: Float32Array | null, section: Int16Array | null): void {
    const caller = this.caller[c]!;
    const ci = indexOf(view, caller);
    if (ci < 0 || view.flags[ci]! & (GV_DOWN | GV_HELD)) {
      this.lost++;
      return;
    }
    this.completed++;
    // (guard-ai S6 stack-tip fix) read the call's slot before `sink.completed`: the slot is already free, and the
    // command call S6 starts from that callback (`contactThrough`) takes it, so reading `callDue` / `callInc` after it
    // queued the section RADIO.report s late (the S3 "call + staggerMax" rule broken)
    const k = this.callKind[c]!;
    const t0 = this.callDue[c]!;
    const inc = this.callInc[c]!;
    sink.completed?.(caller, inc, CALL_KIND[k]!);
    if (k === C_COMMAND) {
      this.alarms++;
      sink.alarm(this.section, caller);
      return;
    }
    // receivers: every other live guard of the section, sorted by distance (ties: lower view index)
    const cx = view.x[ci]!;
    const cy = view.y[ci]!;
    const cz = view.z[ci]!;
    let n = 0;
    for (let i = 0; i < view.n; i++) {
      if (i === ci || view.flags[i]! & GV_DOWN) continue;
      if (section && section[i] !== this.section) continue;
      const d = hyp3(view.x[i]! - cx, view.y[i]! - cy, view.z[i]! - cz);
      // insertion sort by (distance, index): i rises, so an equal distance goes after
      let j = n;
      while (j > 0 && this.dist[j - 1]! > d) {
        this.dist[j] = this.dist[j - 1]!;
        this.order[j] = this.order[j - 1]!;
        j--;
      }
      this.dist[j] = d;
      this.order[j] = i;
      n++;
    }
    for (let r = 0; r < n; r++) {
      const i = this.order[r]!;
      const delay = staggerDelay(r, this.dist[r]!, reaction ? reaction[i]! : 1);
      this.enqueue(t0 + delay, view.id[i]!, inc, k, caller);
    }
  }

  private enqueue(due: number, rx: number, inc: number, k: number, caller: number): void {
    let free = -1;
    for (let q = 0; q < NQ; q++) {
      if (!this.qUsed[q]) {
        if (free < 0) free = q;
        continue;
      }
      if (this.qRx[q] === rx && this.qInc[q] === inc && this.qKind[q] === k) {
        // already on the way to him: keep the earlier one
        if (due < this.qDue[q]!) this.qDue[q] = due;
        return;
      }
    }
    if (free < 0) {
      this.dropped++;
      return;
    }
    this.qUsed[free] = 1;
    this.qDue[free] = due;
    this.qRx[free] = rx;
    this.qInc[free] = inc;
    this.qKind[free] = k;
    this.qCaller[free] = caller;
    this.qSeq[free] = this.seq++;
  }
}

/** View index of guard `gid`, -1. */
function indexOf(view: GuardView, gid: number): number {
  for (let i = 0; i < view.n; i++) if (view.id[i] === gid) return i;
  return -1;
}
