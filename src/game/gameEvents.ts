import type { PickupKind } from './pickups';

/** Session-level events (audio, coop broadcast, analytics). */
export interface GameEvents {
  wave: { n: number };
  waveCleared: { n: number };
  objective: { id: string };
  alarm: Record<string, never>;
  pickup: { kind: PickupKind };
  emote: { id: string };
}
