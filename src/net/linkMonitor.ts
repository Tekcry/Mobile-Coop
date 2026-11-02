import type { Transport } from './transport';
import { classifyJoinError, linkText, type JoinFailure, type LinkSample, type LinkState } from './linkStatus';
import type { AttemptRecord } from './attemptLog';

/** How often the monitor reads the link (ms): the peers, then the selected ICE pair's stats. */
export const LINK_POLL_MS = 1000;

/**
 * (co-op relay fix) One room's connection readout and attempt log. It polls the transport (it never takes the
 * transport's callbacks, which `NetSession` owns, except `onJoinError`): no partner yet is "Waiting for your partner"
 * (host) or "Connecting..." (joiner); a partner connected reads its link every `LINK_POLL_MS` ("Connected - via relay,
 * 120 ms"); a join error with no partner, or a failure `coopUi` reports (`fail`: no answer, other version, full), is
 * "Failed - ...". Each connection logs one attempt: on its first stats read (method, and for the joiner's first
 * connection the ms since the room opened), or on its failure.
 */
export class LinkMonitor {
  state: LinkState;
  /** The readout text changed. */
  onChange: (() => void) | null = null;
  /** A join error with no partner connected (the joiner shows its dialog: there is nothing to wait for). */
  onFailed: ((f: JoinFailure) => void) | null = null;
  private timer: ReturnType<typeof setInterval> | null;
  private readonly t0: number;
  /** The partner this attempt is about, when it connected (ms), whether its line is logged. */
  private peer: string | null = null;
  private connectedAt = 0;
  private logged = false;
  /** Connections so far (the joiner's time to connect is logged for the first only). */
  private connections = 0;
  private reading = false;
  private stopped = false;
  /** `fail` was called: the readout stays failed (the session is closing). */
  private held = false;
  private lastText: string;

  constructor(
    private readonly transport: Transport,
    readonly role: 'host' | 'client',
    private readonly log: (r: AttemptRecord) => void,
    private readonly now: () => number = () => Date.now(),
  ) {
    this.t0 = now();
    this.state = { phase: role === 'host' ? 'waiting' : 'connecting', sample: null, failure: null };
    this.lastText = linkText(this.state);
    transport.onJoinError = (e) => this.joinError(e);
    this.timer = setInterval(() => void this.poll(), LINK_POLL_MS);
  }

  get text(): string {
    return linkText(this.state);
  }

  /** A failure the session saw (`timeout`, `version`, `full`): shown, and logged once for the attempt. */
  fail(f: JoinFailure): void {
    // (the first reason stands: a timeout after a version refusal is not the news)
    if (this.stopped || this.held) return;
    this.held = true;
    this.state = { phase: 'failed', sample: null, failure: f };
    this.logFail(f);
    this.changed();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.transport.onJoinError) this.transport.onJoinError = null;
    this.onChange = null;
    this.onFailed = null;
  }

  private joinError(error: string): void {
    if (this.stopped) return;
    const f = classifyJoinError(error);
    // a partner already connected: another peer's attempt failed, the readout stays on the partner
    if (this.peer) {
      this.log({ at: this.now(), role: this.role, method: 'none', ms: null, result: f });
      return;
    }
    this.state = { phase: 'failed', sample: null, failure: f };
    this.logFail(f);
    this.changed();
    this.onFailed?.(f);
  }

  private logFail(f: JoinFailure): void {
    if (this.logged) return;
    this.logged = true;
    this.log({ at: this.now(), role: this.role, method: 'none', ms: null, result: f });
  }

  /** One read: exposed for tests (the timer calls it). */
  async poll(): Promise<void> {
    if (this.stopped || this.reading || this.held) return;
    const peers = this.transport.peers();
    const id = this.peer !== null && peers.includes(this.peer) ? this.peer : (peers[0] ?? null);
    if (id === null) {
      if (this.peer !== null) {
        // the partner left: the next connection is a new attempt
        this.peer = null;
        this.logged = false;
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
      this.state = { phase: 'connected', sample: null, failure: null };
      this.changed();
    }
    if (!this.transport.linkStats) return;
    this.reading = true;
    let sample: LinkSample | null;
    try {
      sample = await this.transport.linkStats(id);
    } catch {
      sample = null;
    }
    this.reading = false;
    if (this.stopped || this.peer !== id || !sample) return;
    this.state = { phase: 'connected', sample, failure: null };
    if (!this.logged) {
      this.logged = true;
      const ms = this.role === 'client' && this.connections === 1 ? Math.max(0, this.connectedAt - this.t0) : null;
      this.log({ at: this.now(), role: this.role, method: sample.kind, ms, result: 'ok' });
    }
    this.changed();
  }

  private changed(): void {
    const t = this.text;
    if (t === this.lastText) return;
    this.lastText = t;
    this.onChange?.();
  }
}
