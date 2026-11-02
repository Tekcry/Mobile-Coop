import type { LinkSample } from './linkStatus';

/** Minimal peer-to-peer transport used by the coop session. */
export interface Transport {
  readonly selfId: string;
  /** Broadcast (no target) or send to one peer. Payloads are plain JSON. */
  send(msg: unknown, to?: string): void;
  onMessage: ((msg: unknown, from: string) => void) | null;
  onPeerJoin: ((id: string) => void) | null;
  onPeerLeave: ((id: string) => void) | null;
  peers(): string[];
  leave(): Promise<void>;
  /**
   * (co-op relay fix) A peer was found but no connection to it got through (Trystero's `onJoinError`: usually no network
   * path, with or without the relay). The text is the transport's own and holds no relay login. Kept until the next one.
   */
  onJoinError?: ((error: string) => void) | null;
  /** (co-op relay fix) How peer `id` is reached now (direct or via relay, round trip), or null (not connected / no stats yet). */
  linkStats?(id: string): Promise<LinkSample | null>;
}

export const APP_ID = 'shoulder-strike-coop-v1';
