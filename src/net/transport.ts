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
}

export const APP_ID = 'shoulder-strike-coop-v1';
