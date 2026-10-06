import type { Enemy } from '../../ai/enemy';
import type { EnemyKind } from '../../ai/enemyDefs';
import type { HitInfo } from '../damage';
import type { Blip } from '../../ui/hud/minimap';

export type ModeId = 'sandbox' | 'wave' | 'mission' | 'clear';

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
}

export function emptyStats(mode: ModeId, mapId: string): SessionStats {
  return {
    mode,
    mapId,
    won: false,
    score: 0,
    kills: 0,
    headshots: 0,
    byKind: { grunt: 0, runner: 0, heavy: 0 },
    waves: 0,
    objectives: 0,
    time: 0,
    shots: 0,
    hits: 0,
    damageTaken: 0,
    weaponKills: {},
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
  blips(): Blip[];
  dispose(): void;
}
