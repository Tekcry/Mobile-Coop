/**
 * (locomotion step 20b, D11) Network conditions simulator for the same-device test transport (`localTransport`,
 * `?net=local`) only. It is never imported by the shipped WebRTC transport (`trysteroTransport`) and never by
 * single player; a page reaches it only with `?net=local&netsim=<preset>` (the e2e lib adds `netsim=` from
 * `E2E_NETSIM`).
 *
 * Model: every message gets a one-way delay of `oneWayMs` plus a uniform jitter in [-jitterMs, +jitterMs]. The shipped
 * transport (one Trystero action over a WebRTC data channel) is reliable and ordered, so the simulator keeps those
 * semantics: a "lost" packet (probability `loss`) is not dropped but retransmitted, arriving `2 * oneWayMs + jitterMs`
 * later, and every message on a link waits for the one before it (head-of-line blocking, as SCTP ordered delivery).
 * Nothing is dropped: committed moves, cstart / cdeny, medkit, takedowns and snapshots all keep their delivery.
 * Seeded (mulberry32): the same seed gives the same delay sequence. Babylon-free, pure.
 */
export interface NetSimPreset {
  readonly oneWayMs: number;
  readonly jitterMs: number;
  readonly loss: number;
}

/** `typical`: 80 ms RTT (40 ms one-way), 20 ms jitter, 1% loss (D11). */
export const NETSIM_PRESETS: Readonly<Record<string, NetSimPreset>> = {
  typical: { oneWayMs: 40, jitterMs: 20, loss: 0.01 },
};

/** The preset named by `?netsim=` (null = off, also for unknown names). */
export function netSimPreset(name: string | null | undefined): NetSimPreset | null {
  return name && Object.prototype.hasOwnProperty.call(NETSIM_PRESETS, name) ? NETSIM_PRESETS[name]! : null;
}

export class NetSim {
  private s: number;
  private readonly last = new Map<string, number>();
  /** Messages scheduled, of which retransmitted ("lost" once), and the longest delay (ms). */
  readonly stats = { sent: 0, retransmitted: 0, maxDelayMs: 0 };

  constructor(
    readonly preset: NetSimPreset,
    seed = 1,
  ) {
    this.s = seed >>> 0;
  }

  /** mulberry32: uniform [0, 1). */
  rand(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Delivery time (ms, same clock as `now`) of a message sent at `now` on `link` (ordered per link). */
  deliverAt(link: string, now: number): number {
    const p = this.preset;
    let d = p.oneWayMs + (this.rand() * 2 - 1) * p.jitterMs;
    if (this.rand() < p.loss) {
      d += 2 * p.oneWayMs + p.jitterMs;
      this.stats.retransmitted++;
    }
    const t = Math.max(now + Math.max(0, d), this.last.get(link) ?? -Infinity);
    this.last.set(link, t);
    this.stats.sent++;
    if (t - now > this.stats.maxDelayMs) this.stats.maxDelayMs = t - now;
    return t;
  }
}
