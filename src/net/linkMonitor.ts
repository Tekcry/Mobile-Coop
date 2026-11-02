import type { Transport } from './transport';
import { classifyJoinError, linkText, type JoinFailure, type LinkSample, type LinkState } from './linkStatus';
import type { AttemptRecord } from './attemptLog';
import { diag } from '../feedback/diag';

/** How often the monitor looks at the transport's peers (ms). */
export const LINK_POLL_MS = 1000;
/** Once an attempt is logged, the link's stats are read this often (ms) unless the readout is on screen. */
export const STATS_SLOW_MS = 5000;
/** The readout counts as on screen this long after its text was last read (ms): stats every poll then. */
export const READ_FRESH_MS = 3000;
/** A joiner gives up on join errors alone only after 2 of them at least this far apart (ms): Trystero re-offers about
 *  every 5.3 s, so one error is one failed try, not a failed join. Otherwise the join timeout decides. */
export const RETRY_FAIL_GAP_MS = 6000;

/** Logs an attempt; `replaces` is an earlier record of the same attempt to put it in place of (null: a new line). */
export type AttemptSink = (r: AttemptRecord, replaces: AttemptRecord | null) => void;

/**
 * (co-op relay fix) One room's connection readout and attempt log. It polls the transport (it never takes the
 * transport's callbacks, which `NetSession` owns, except `onJoinError`): no partner yet is "Waiting for your partner"
 * (host) or "Connecting..." (joiner); a partner connected reads its link ("Connected - via relay, 120 ms"); a joiner's
 * join error is "retrying" (Trystero tries again) until a second one 6 s on (`onFailed`) or the join timeout; a failure
 * `coopUi` reports (`fail`) is "Failed - ...". The host counts only peers `accept` takes (its session's members), keeps
 * "Waiting" through join errors and logs every one. Each connection logs one attempt: on its first stats read, or its
 * failure (which replaces an `ok` line of the same attempt: a joiner refused after its link came up).
 */
export class LinkMonitor {
  state: LinkState;
  /** The readout text changed. */
  onChange: (() => void) | null = null;
  /** (diagnostics log) Each stats read of the partner's link (at least every `STATS_SLOW_MS` while connected). */
  onSample: ((s: LinkSample) => void) | null = null;
  /** Joiner: the join failed on its join errors (2+, 6 s apart; the first one's reason). Host: each join error. */
  onFailed: ((f: JoinFailure) => void) | null = null;
  private timer: ReturnType<typeof setInterval> | null;
  private readonly t0: number;
  /** The partner this attempt is about, when it connected (ms), whether its line is logged (and the `ok` line). */
  private peer: string | null = null;
  private connectedAt = 0;
  private logged = false;
  private okRec: AttemptRecord | null = null;
  /** Connections so far (the joiner's time to connect is logged for the first only). */
  private connections = 0;
  private reading = false;
  private stopped = false;
  /** `fail` was called: the readout stays failed (the session is closing). */
  private held = false;
  /** Joiner: the first join error's reason and time, and how many came. */
  private firstErr: JoinFailure | null = null;
  private firstErrAt = 0;
  private errors = 0;
  /** When the stats were last read and the readout's text last asked for (ms). */
  private statsAt = -Infinity;
  private readAt = -Infinity;
  private lastText: string;
  /** (diagnostics log) The last phase / path logged. */
  private diagKey = '';

  constructor(
    private readonly transport: Transport,
    readonly role: 'host' | 'client',
    private readonly log: AttemptSink,
    private readonly now: () => number = () => Date.now(),
    /** Which transport peers are the partner (host: its session's members; a refused joiner is not). */
    private readonly accept: (id: string) => boolean = () => true,
  ) {
    this.t0 = now();
    this.state = { phase: role === 'host' ? 'waiting' : 'connecting', sample: null, failure: null };
    this.lastText = linkText(this.state);
    transport.onJoinError = (e) => this.joinError(e);
    this.timer = setInterval(() => void this.poll(), LINK_POLL_MS);
  }

  /** The readout (reading it marks the readout on screen: the stats are read every poll for a while). */
  get text(): string {
    this.readAt = this.now();
    return linkText(this.state);
  }

  /** Joiner: the first join error's reason (null: none), for the timeout's dialog. */
  get firstJoinError(): JoinFailure | null {
    return this.firstErr;
  }

  /** A failure the session saw (`timeout`, `version`, `full`, or the join errors'): shown, and logged once for the
   *  attempt, in place of its `ok` line if it had one. */
  fail(f: JoinFailure): void {
    // (the first reason stands: a timeout after a version refusal is not the news)
    if (this.stopped || this.held) return;
    this.held = true;
    this.state = { phase: 'failed', sample: null, failure: f };
    this.logged = true;
    this.log({ at: this.now(), role: this.role, method: 'none', ms: null, result: f }, this.okRec);
    this.okRec = null;
    this.changed();
  }

  /** Host: a joiner refused (another version): logged, the readout unchanged. */
  note(f: JoinFailure): void {
    if (!this.stopped) this.log({ at: this.now(), role: this.role, method: 'none', ms: null, result: f }, null);
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.transport.onJoinError) this.transport.onJoinError = null;
    this.onChange = null;
    this.onFailed = null;
    this.onSample = null;
  }

  private joinError(error: string): void {
    if (this.stopped || this.held) return;
    const f = classifyJoinError(error);
    diag.add('net', `join error (${f}): ${error}`);
    // the host (any time) or a joiner already connected: one peer's try failed; logged, the readout stays
    if (this.role === 'host' || this.peer) {
      this.log({ at: this.now(), role: this.role, method: 'none', ms: null, result: f }, null);
      if (this.role === 'host') this.onFailed?.(f);
      return;
    }
    const now = this.now();
    if (this.firstErr === null) {
      this.firstErr = f;
      this.firstErrAt = now;
    }
    this.errors++;
    if (this.errors >= 2 && now - this.firstErrAt >= RETRY_FAIL_GAP_MS) {
      this.onFailed?.(this.firstErr);
      return;
    }
    this.state = { phase: 'retrying', sample: null, failure: null };
    this.changed();
  }

  /** One read: exposed for tests (the timer calls it). */
  async poll(): Promise<void> {
    if (this.stopped || this.reading || this.held) return;
    const peers = this.transport.peers();
    let id: string | null = null;
    if (this.peer !== null && peers.includes(this.peer) && this.accept(this.peer)) id = this.peer;
    else for (const p of peers) if (this.accept(p)) {
      id = p;
      break;
    }
    if (id === null) {
      if (this.peer !== null) {
        // the partner left: the next connection is a new attempt
        this.peer = null;
        this.logged = false;
        this.okRec = null;
        this.state = { phase: this.role === 'host' ? 'waiting' : 'connecting', sample: null, failure: null };
        this.changed();
      }
      return;
    }
    if (id !== this.peer) {
      this.peer = id;
      this.connectedAt = this.now();
      this.connections++;
      this.logged = false;
      this.okRec = null;
      this.statsAt = -Infinity;
      this.state = { phase: 'connected', sample: null, failure: null };
      this.changed();
    }
    if (!this.transport.linkStats) return;
    const now = this.now();
    // (stats every poll until the attempt is logged or while the readout shows; else every STATS_SLOW_MS)
    if (this.logged && now - this.readAt > READ_FRESH_MS && now - this.statsAt < STATS_SLOW_MS) return;
    this.statsAt = now;
    this.reading = true;
    let sample: LinkSample | null;
    try {
      sample = await this.transport.linkStats(id);
    } catch {
      sample = null;
    }
    this.reading = false;
    if (this.stopped || this.held || this.peer !== id || !sample) return;
    this.state = { phase: 'connected', sample, failure: null };
    this.onSample?.(sample);
    if (!this.logged) {
      this.logged = true;
      const ms = this.role === 'client' && this.connections === 1 ? Math.max(0, this.connectedAt - this.t0) : null;
      this.okRec = { at: this.now(), role: this.role, method: sample.kind, ms, result: 'ok' };
      this.log(this.okRec, null);
    }
    this.changed();
  }

  private changed(): void {
    const t = linkText(this.state);
    if (t === this.lastText) return;
    this.lastText = t;
    // (diagnostics log) a readout change of phase or path (connecting / direct / relay / failed); the round trip alone
    // changes often and goes in the 10 s link line instead
    const s = this.state;
    const key = `${s.phase}|${s.sample?.kind ?? ''}|${s.failure ?? ''}|${s.sample ? 1 : 0}`;
    if (key !== this.diagKey) {
      this.diagKey = key;
      diag.link(`${this.role === 'host' ? 'host' : 'joiner'}: ${t}`);
    }
    this.onChange?.();
  }
}
