import type { SquadSlot } from '../world/rooms';

/**
 * Sector Ops (feature/sector-ops): a map split into sectors played in order. Each sector has one objective (a hack, a
 * grab or a download); then its exit zone opens and the next sector starts. Kills are optional, so a ghost run (no
 * kills, never spotted) is always possible (M3). Pure: the mode (`modes/sectorMode.ts`) puts it in the world.
 */
export type SectorObjectiveKind = 'hack' | 'grab' | 'download';

export interface SectorObjective {
  kind: SectorObjectiveKind;
  label: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface SectorDef {
  id: string;
  name: string;
  /** Where the sector starts (the checkpoint a down respawns at). */
  start: { x: number; y: number; z: number; yaw: number };
  objective: SectorObjective;
  /** The exit zone [x0, z0, x1, z1] on its floor; every living player inside moves on. */
  exit: { label: string; box: [number, number, number, number]; floorY?: number };
  /** The guards that spawn when the sector starts (holding, unaware). */
  guards: SquadSlot[];
  /** Where alarm reinforcements come in (x, z). */
  reinforce: [number, number];
}

/** Tuning (prototype values). */
export const SECTOR = {
  /** A hack is held this long (s). */
  hackTime: 3,
  /** A download runs this long (s) while a player stays within `downloadRange` of the terminal. */
  downloadTime: 10,
  downloadRange: 4,
  /** Alarm stages (G125: escalating, never ends the run) and the guards each stage sends in (A3). */
  alarmMax: 3,
  perStage: 2,
  /** Lives (A5): a down respawns at the sector's start. */
  lives: 3,
} as const;

export type SectorPhase = 'objective' | 'exit' | 'done';

/** The run's progress: which sector, and whether its objective or its exit is next. */
export class SectorRun {
  index = 0;
  phase: SectorPhase = 'objective';
  /** Download progress (s) of the current objective. */
  progress = 0;
  /** The download was started at its terminal. */
  downloading = false;

  constructor(readonly defs: readonly SectorDef[]) {
    if (!defs.length) this.phase = 'done';
  }

  get current(): SectorDef | null {
    return this.phase === 'done' ? null : (this.defs[this.index] ?? null);
  }

  /** The current objective is done: its exit opens. False when it was not the objective's turn. */
  objectiveDone(): boolean {
    if (this.phase !== 'objective') return false;
    this.phase = 'exit';
    this.downloading = false;
    return true;
  }

  /** A download tick while in range; true when it completes (the exit opens). */
  download(dt: number): boolean {
    if (this.phase !== 'objective' || !this.downloading) return false;
    this.progress = Math.min(SECTOR.downloadTime, this.progress + dt);
    return this.progress >= SECTOR.downloadTime && this.objectiveDone();
  }

  /** The exit was reached: 'next' (the next sector starts) or 'done' (the run is over); null when the exit is shut. */
  exitReached(): 'next' | 'done' | null {
    if (this.phase !== 'exit') return null;
    this.progress = 0;
    if (this.index + 1 >= this.defs.length) {
      this.phase = 'done';
      return 'done';
    }
    this.index++;
    this.phase = 'objective';
    return 'next';
  }
}

/** Is (x, y, z) inside the exit zone? */
export function inExit(def: SectorDef, x: number, y: number, z: number): boolean {
  const [x0, z0, x1, z1] = def.exit.box;
  return x >= Math.min(x0, x1) && x <= Math.max(x0, x1) && z >= Math.min(z0, z1) && z <= Math.max(z0, z1) && Math.abs(y - (def.exit.floorY ?? 0)) < 1.5;
}

/** The next alarm stage (capped) and how many guards it sends in (0 once capped). */
export function alarmStep(stage: number): { stage: number; send: number } {
  if (stage >= SECTOR.alarmMax) return { stage, send: 0 };
  return { stage: stage + 1, send: SECTOR.perStage };
}

export interface SectorTally {
  time: number;
  /** Lethal kills (knock-outs are not kills, A4). */
  kills: number;
  /** Times spotted: guard detections plus camera alarms. */
  spotted: number;
}

export function fmtTime(s: number): string {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

/** The result line: time, kills, times spotted, and "Ghost" when there are none of either (A4). */
export function sectorResult(t: SectorTally): { ghost: boolean; line: string } {
  const ghost = t.kills === 0 && t.spotted === 0;
  return { ghost, line: `Time ${fmtTime(t.time)}  ·  Kills ${t.kills}  ·  Spotted ${t.spotted}${ghost ? '  ·  GHOST' : ''}` };
}
