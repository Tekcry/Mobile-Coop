import { diag } from '../feedback/diag';
import type { Transport } from './transport';
import type { LinkDetail, LinkSample } from './linkStatus';

/** How often a connected link writes its line to the diagnostics log (ms). */
export const NET_DIAG_MS = 10_000;

/**
 * (diagnostics log) One room's link line every `NET_DIAG_MS` while connected: direct or relay, the round trip, the
 * candidate types and protocol (never an address), bytes and packets per second each way (from the WebRTC stats the
 * `LinkMonitor` already reads), and the game messages per second each way with the busiest types (counted at the
 * transport: a counter per message, no copy). Pure enough to test: the clock and the sink are passed in.
 */
export class NetDiag {
  private msgsIn = 0;
  private msgsOut = 0;
  private readonly byType = new Map<string, number>();
  private last: LinkDetail | null = null;
  private lastAt = 0;
  private nextAt = 0;
  private since: number;

  constructor(
    private readonly now: () => number = () => Date.now(),
    private readonly sink: (line: string) => void = (l) => diag.add('net', l),
  ) {
    this.since = now();
  }

  /** Count a message (in or out) and its type (`t`). */
  count(msg: unknown, out: boolean): void {
    if (out) this.msgsOut++;
    else this.msgsIn++;
    const t = typeof msg === 'object' && msg !== null ? (msg as { t?: unknown }).t : undefined;
    const key = `${out ? '>' : '<'}${typeof t === 'string' ? t.slice(0, 12) : '?'}`;
    this.byType.set(key, (this.byType.get(key) ?? 0) + 1);
  }

  /** Wrap a transport's send and receive to count them (after the session took `onMessage`). */
  wrap(t: Transport): void {
    const send = t.send.bind(t);
    t.send = (msg, to) => {
      this.count(msg, true);
      send(msg, to);
    };
    const recv = t.onMessage;
    if (recv)
      t.onMessage = (msg, from) => {
        this.count(msg, false);
        recv(msg, from);
      };
  }

  /** A stats read of the link: a line when `NET_DIAG_MS` has passed since the last one. */
  sample(s: LinkSample): void {
    const now = this.now();
    if (now < this.nextAt) return;
    this.nextAt = now + NET_DIAG_MS;
    const sec = Math.max(0.001, (now - this.since) / 1000);
    const how = s.kind === 'relay' ? 'via relay' : s.kind === 'local' ? 'same device' : 'direct';
    const parts = [`link ${how}`, s.rttMs === null ? 'round trip ?' : `round trip ${s.rttMs} ms`];
    diag.session.stats.lastLink = `Connected - ${how}${s.rttMs === null ? '' : `, ${s.rttMs} ms`}`;
    const d = s.detail;
    if (d) {
      parts.push(`${d.local} -> ${d.remote} over ${d.protocol}`);
      const p = this.last;
      const dt = Math.max(0.001, (now - this.lastAt) / 1000);
      if (p) {
        const r = (a: number, b: number): string => Math.max(0, (a - b) / dt).toFixed(0);
        const kb = (a: number, b: number): string => (Math.max(0, a - b) / dt / 1024).toFixed(1);
        parts.push(`sent ${kb(d.bytesSent, p.bytesSent)} kB/s ${r(d.packetsSent, p.packetsSent)} pkt/s`, `received ${kb(d.bytesReceived, p.bytesReceived)} kB/s ${r(d.packetsReceived, p.packetsReceived)} pkt/s`);
      } else parts.push(`totals sent ${(d.bytesSent / 1024).toFixed(0)} kB, received ${(d.bytesReceived / 1024).toFixed(0)} kB`);
      this.last = d;
      this.lastAt = now;
    }
    const top = [...this.byType.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, n]) => `${k} ${(n / sec).toFixed(1)}`)
      .join(' ');
    parts.push(`game messages out ${(this.msgsOut / sec).toFixed(1)}/s in ${(this.msgsIn / sec).toFixed(1)}/s${top ? ` (${top})` : ''}`);
    this.msgsIn = this.msgsOut = 0;
    this.byType.clear();
    this.since = now;
    this.sink(parts.join(', '));
  }
}
