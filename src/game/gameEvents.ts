import type { PickupKind } from './pickups';

/** Session-level events (audio, coop broadcast, analytics). */
export interface GameEvents {
  wave: { n: number };
  waveCleared: { n: number };
  objective: { id: string };
  /** Clear mode: a room was secured (n of total). */
  /** Clear mode: every hostile down (the only feedback the mode gives). */
  operationComplete: Record<string, never>;
  alarm: Record<string, never>;
  /** A light was shot out / switched (stealth). */
  lightOut: { x: number; y: number; z: number; shot: boolean };
  lightSwitch: { on: boolean };
  /** An enemy found a body. */
  bodyFound: { x: number; z: number };
  /** The player picked up / put down / hid a body. */
  body: { action: 'pickup' | 'drop' | 'hide' };
  /** Goggles switched (audio) / a sonar pulse went out. */
  vision: { mode: 'off' | 'night' | 'sonar' };
  sonar: Record<string, never>;
  /** A door opened / closed (audio). */
  door: { how: 'quiet' | 'bash' | 'enemy' | 'close'; x: number; z: number };
  pickup: { kind: PickupKind };
  emote: { id: string };
  /** Coop: a shot by a teammate or a host-simulated enemy (audio only). */
  remoteShot: { cls: string; x: number; y: number; z: number };
}
