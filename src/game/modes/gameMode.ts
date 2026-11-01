import type { CourseSummary } from '../course/courseRating';
import type { Enemy } from '../../ai/enemy';
import { emptyKinds, type EnemyKind } from '../../ai/enemyDefs';
import type { HitInfo } from '../damage';
import type { Vector3 } from '../../core/babylon';
import type { Interactable } from '../interactables';
import type { SlotPoint } from '../spawnSlots';
import type { ObjectiveLine } from '../../ui/screens/pauseScreen';
import type { KitKind } from '../teamMoves';

/** `course` is the training course (the campaign's Marlow Yard); `sector` is Sector Ops; `test` is the Test Chamber's
 *  guards-and-revives mode (`TestMode`: practice, no progression); `sandbox` is the guard-free walk of a dev map (the
 *  Kestrel editor's walk test, `?autostart=seclab&mode=sandbox`; no menu offers it). */
export type ModeId = 'sandbox' | 'course' | 'sector' | 'test';

/** (G2a) The practice modes: a test map (no results kept; the sandbox loadout). */
export function practiceMode(mode: ModeId): boolean {
  return mode === 'sandbox' || mode === 'test';
}

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
  detections: number;
  knockouts: number;
  /** Training course: the results panel (T1c). */
  course?: CourseSummary;
  /** (campus-greybox A28) A `?sectorStart=N` run (or its co-op client's): nothing goes to the save. */
  practice?: boolean;
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
  /** (guard-rules S5) The next alarm brings no reinforcements (Sector Ops at the stage cap): the alarm banner says
   *  none are inbound. */
  alarmQuiet?(): boolean;
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
  /** (coop-kit K0) Co-op host: kit move `kind` completed at kit spot `spot` ('' = a free move away from any spot) by `a`
   *  and `b` (player ids; undefined = the host), once per completed move (`kitDone`, game/kit/kitApi.ts). */
  onKitDone?(kind: KitKind, spot: string, a: string | undefined, b: string | undefined): void;
  /** Co-op host: a client's `use` of an item is running (`active` true before its `onUse`, false after). */
  onRemoteUse?(id: string, active: boolean): void;
  /** Co-op host: a client's takedown finished (host-checked); `kind` is the client's takedown kind ('' unknown). */
  onRemoteTakedown?(id: string, kind: string): void;
  /** Co-op host: a client's held jammer target (CT prototype B3; '' = released) and (jammer-fixes) its camera eye. */
  onRemoteJam?(id: string, tgt: string, eye?: readonly [number, number, number]): void;
  /** Co-op host: a client's thrown gadget took effect (host-checked). */
  onRemoteGadget?(id: string, kind: string): void;
  /** (spare 9) Host / solo: an interrogation gave the team code flag `flag` (part B wires the modes). */
  onIntelCode?(flag: string): void;
  /** (marlow-bays item 3) The pause menu's "Restart at checkpoint" (solo or the co-op host): the same clean retry as
   *  everyone down (Sector Ops: the section; Course: the bay), every player back at the checkpoint. False: not now. */
  restartCheckpoint?(): boolean;
  /** (hud-guidance B4, G343 / HG8) Field Terminal > Objectives rows; null: none here (GameState asks the net layer). */
  objectiveLines?(): ObjectiveLine[] | null;
  /** (marlow-bays R3) The checkpoint a resumed co-op match starts from (course: the current bay, 1-based). */
  resumeBay?(): number;
  /** (coop-rejoin) The current checkpoint's slot points (slot 0 the host, slot 1 the partner; one is fine): where the
   *  co-op host puts a respawning partner and a client that joins or reconnects mid-run. Course and Sector Ops. */
  checkpointSpawns?(): SlotPoint[];
  /** (coop-rejoin) Co-op host: send the mode's whole state on the next step (a client joined or reconnected mid-run). */
  resync?(): void;
  dispose(): void;
}
