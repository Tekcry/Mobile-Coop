import type { CourseSummary } from '../course/courseRating';
import type { Enemy } from '../../ai/enemy';
import { emptyKinds, type EnemyKind } from '../../ai/enemyDefs';
import type { HitInfo } from '../damage';
import type { Blip } from '../../ui/hud/minimap';
import type { Vector3 } from '../../core/babylon';
import type { Interactable } from '../interactables';
import type { SlotPoint } from '../spawnSlots';

/** `clear` is Hunter (`?mode=hunter` too); `infiltration` runs a `MissionDef`; `sector` is Sector Ops. */
export type ModeId = 'sandbox' | 'mission' | 'clear' | 'infiltration' | 'course' | 'sector';

export interface SessionStats {
  mode: ModeId;
  mapId: string;
  won: boolean;
  score: number;
  kills: number;
  headshots: number;
  byKind: Record<EnemyKind, number>;
  objectives: number;
  time: number;
  shots: number;
  hits: number;
  damageTaken: number;
  /** Kills per weapon (mastery). */
  weaponKills: Record<string, number>;
  detections: number;
  knockouts: number;
  /** Infiltration: the mission, its rating (0-3) and the bonus rules kept. */
  missionId?: string;
  rating?: number;
  bonuses?: string[];
  /** Challenge inputs: takedowns by kind, gadget knock-outs / kills, alarms raised. */
  takedownsByKind?: Record<string, number>;
  gadgetKos?: number;
  alarms?: number;
  /** Training course: the results panel (T1c). */
  course?: CourseSummary;
}

export function emptyStats(mode: ModeId, mapId: string): SessionStats {
  return {
    mode,
    mapId,
    won: false,
    score: 0,
    kills: 0,
    headshots: 0,
    byKind: emptyKinds(),
    objectives: 0,
    time: 0,
    shots: 0,
    hits: 0,
    damageTaken: 0,
    weaponKills: {},
    detections: 0,
    knockouts: 0,
  };
}

/** A mode scripts a session on top of GameState (spawns, objectives, win/lose). */
export interface GameMode {
  readonly id: ModeId;
  start(): void;
  fixedUpdate(dt: number): void;
  frameUpdate(dt: number): void;
  onEnemyKilled(e: Enemy, h: HitInfo): void;
  /** An enemy came (back) into play: a knocked-out one woken by a squadmate, or reinforcements. */
  onEnemyJoined?(e: Enemy): void;
  onPlayerDeath(): void;
  /** Co-op host: a downed player cannot be revived (window over, no revives left) while a partner is still up. */
  onPlayerOut?(): void;
  /** The alarm went off; return true when the mode brings its own reinforcements (Hunter doubles the count). */
  onAlarm?(at: Vector3): boolean;
  /** An interactable the mode put down was used. */
  onInteract?(it: Interactable): void;
  /** Co-op host: a client reported a verb only it can see (course drills, DECISIONS C10). */
  onRemoteVerb?(id: string, verb: string): void;
  /** The local player sent a ping (course drills). */
  onLocalPing?(): void;
  /** Co-op host: a client's movement mode (from its `pstate`). */
  onRemoteMove?(id: string, mode: string): void;
  /** Co-op host: a team move started between `a` and `b` (player ids; undefined = the host). */
  onTeamMove?(a: string | undefined, b: string | undefined): void;
  /** Co-op host: a client's `use` of an item is running (`active` true before its `onUse`, false after). */
  onRemoteUse?(id: string, active: boolean): void;
  /** Co-op host: a client's takedown finished (host-checked); `kind` is the client's takedown kind ('' unknown). */
  onRemoteTakedown?(id: string, kind: string): void;
  /** Co-op host: a client's held jammer target (CT prototype B3; '' = released) and (jammer-fixes) its camera eye; (coop4 D1)
   *  the sender's player slot (its `SecWire` entry; absent: 1). */
  onRemoteJam?(id: string, tgt: string, eye?: readonly [number, number, number], slot?: number): void;
  /** Co-op host: a client's thrown gadget took effect (host-checked). */
  onRemoteGadget?(id: string, kind: string): void;
  /** (spare 9) Host / solo: an interrogation gave the team code flag `flag` (part B wires the modes). */
  onIntelCode?(flag: string): void;
  /** (marlow-bays item 3) The pause menu's "Restart at checkpoint" (solo or the co-op host): the same clean retry as
   *  everyone down (Sector Ops: the section; Course: the bay), every player back at the checkpoint. False: not now. */
  restartCheckpoint?(): boolean;
  /** (marlow-bays R3) The checkpoint a resumed co-op match starts from (course: the current bay, 1-based). */
  resumeBay?(): number;
  /** (coop-rejoin) The current checkpoint's slot points (slot 0 the host, slot 1 the partner; one is fine): where the
   *  co-op host puts a respawning partner and a client that joins or reconnects mid-run. Course and Sector Ops. */
  checkpointSpawns?(): SlotPoint[];
  /** (coop-rejoin) Co-op host: send the mode's whole state on the next step (a client joined or reconnected mid-run). */
  resync?(): void;
  blips(): Blip[];
  dispose(): void;
}
