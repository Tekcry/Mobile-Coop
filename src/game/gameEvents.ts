import type { PickupKind } from './pickups';

/** Session-level events (audio, coop broadcast, analytics). */
export interface GameEvents {
  objective: { id: string };
  /** (spare 9) Interrogation intel (host / solo): the feed lines and the code flags; the co-op host relays the lines. */
  /** (mission-framework EN2) `eid`: the interrogated guard's `Enemy.id` (a mission's named target / decoys); none: a
   *  joint read, or a caller that does not pass it yet (the co-op host's client read, NET slice). `by`: the asker's
   *  player id (none: the host / solo player; the co-op host passes the client's id, NET slice). */
  intel: { lines: readonly string[]; codes: readonly string[]; eid?: string; by?: string };
  /** (mission-framework EN2, agreed with Guard AI) A mission's walk-to hook (host / solo): the guards tagged `guardTag`
   *  walk to the post `postId` (by `via` when given). `name`: the mission's event name (`MissionEvent`). */
  missionEvent: { name: string; guardTag: string; postId: string; via?: string };
  /** Clear mode: a room was secured (n of total). */
  /** Clear mode: every hostile down (the only feedback the mode gives). */
  operationComplete: Record<string, never>;
  /** (sector-restart, M9) A Sector Ops section restarted from its checkpoint: a clean start (the music calms). */
  checkpointRestart: Record<string, never>;
  alarm: Record<string, never>;
  /** A light was shot out / switched (stealth). */
  lightOut: { x: number; y: number; z: number; shot: boolean };
  lightSwitch: { on: boolean };
  /** An enemy found a body. */
  bodyFound: { x: number; z: number };
  /** The player picked up / put down / hid a body. */
  body: { action: 'pickup' | 'drop' | 'hide' };
  /** A takedown started / finished / was broken off. */
  takedown: { phase: 'start' | 'done' | 'abort'; lethal: boolean; kind: string };
  /** (spare 12) Co-op host: two players' takedowns within DUAL_WINDOW (`a` first, `b` second, player ids); section-rating reads it. */
  dualTakedown: { a: string; b: string; detected: boolean };
  /** (locomotion step 10) An elbow strike landed (or missed) at contact. */
  strike: { result: 'ko' | 'stagger' | 'miss' };
  /** Goggles switched (audio). */
  vision: { mode: 'off' | 'night' | 'thermal' | 'electro' };
  /** A door opened / closed (audio). */
  door: { how: 'quiet' | 'bash' | 'enemy' | 'close'; x: number; z: number; vol?: number };
  /** Gadgets (audio): thrown, gone off, placed, stuck, a pulse / ping, a dart, a remote view opened / closed. */
  gadget: { kind: string; phase: 'select' | 'throw' | 'detonate' | 'place' | 'stick' | 'pulse' | 'view' | 'exit' | 'trigger' };
  /** A crate picked up, or (`medkit`) a wall medkit station's heal. */
  pickup: { kind: PickupKind | 'medkit' };
  /** An enemy callout (a radio line chirps). */
  bark: { radio: boolean };
  /** Coop: a shot by a teammate or a host-simulated enemy (audio only). */
  /** Co-op: a guard's or partner's shot; (coop-walk-fixes P7) a partner's carries its weapon id `gun` and `quiet` (suppressed). */
  remoteShot: { cls: string; x: number; y: number; z: number; gun?: string; quiet?: boolean };
}
