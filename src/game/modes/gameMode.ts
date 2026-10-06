import type { Enemy } from '../../ai/enemy';
import { emptyKinds, type EnemyKind } from '../../ai/enemyDefs';
import type { HitInfo } from '../damage';
import type { Blip } from '../../ui/hud/minimap';
import type { Vector3 } from '../../core/babylon';
import type { Interactable } from '../interactables';

/** `clear` is Hunter (`?mode=hunter` too); `infiltration` runs a `MissionDef`. */
export type ModeId = 'sandbox' | 'wave' | 'mission' | 'clear' | 'infiltration' | 'tdm' | 'ffa';

export interface SessionStats {
  mode: ModeId;
  mapId: string;
  won: boolean;
  score: number;
  kills: number;
  headshots: number;
  byKind: Record<EnemyKind, number>;
  waves: number;
  objectives: number;
  time: number;
  shots: number;
  hits: number;
  damageTaken: number;
  /** Kills per weapon (mastery). */
  weaponKills: Record<string, number>;
  /** Play-style points (Ghost / Panther / Assault) and detections. */
  style: { ghost: number; panther: number; assault: number };
  detections: number;
  knockouts: number;
  /** Infiltration: the mission, its rating (0-3) and the bonus rules kept. */
  missionId?: string;
  rating?: number;
  bonuses?: string[];
  /** Challenge inputs: takedowns by kind, executes, gadget knock-outs / kills, alarms raised. */
  takedownsByKind?: Record<string, number>;
  executes?: number;
  gadgetKos?: number;
  alarms?: number;
  /** PvP: deaths (eliminations are `kills`). */
  deaths?: number;
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
    waves: 0,
    objectives: 0,
    time: 0,
    shots: 0,
    hits: 0,
    damageTaken: 0,
    weaponKills: {},
    style: { ghost: 0, panther: 0, assault: 0 },
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
  /** The alarm went off; return true when the mode brings its own reinforcements (Hunter doubles the count). */
  onAlarm?(at: Vector3): boolean;
  /** An interactable the mode put down was used. */
  onInteract?(it: Interactable): void;
  blips(): Blip[];
  dispose(): void;
}
