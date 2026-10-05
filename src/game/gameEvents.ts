import type { PickupKind } from './pickups';

/** Session-level events (audio, coop broadcast, analytics). */
export interface GameEvents {
  wave: { n: number };
  waveCleared: { n: number };
  objective: { id: string };
  /** Clear mode: a room was secured (n of total). */
  roomCleared: { id: string; n: number; total: number };
  alarm: Record<string, never>;
  pickup: { kind: PickupKind };
  emote: { id: string };
  /** Coop: a shot by a teammate or a host-simulated enemy (audio only). */
  remoteShot: { cls: string; x: number; y: number; z: number };
}
