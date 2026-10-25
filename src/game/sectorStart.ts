/**
 * (campus-greybox A28) The start-at-section link (`?sectorStart=N`, `flags.sectorStart`): a Sector Ops run that begins
 * at section N as the connectors before it leave the run (`SectorRun.advance`): index N - 1, the last connector's
 * checkpoint, the alarm stage (0) as the section's start; the earlier sections never loaded or rated. Such a run is
 * practice: nothing goes to the save (`SectorMode.practiceFrom`). Pure; `sectorMode.ts` puts it in the world.
 */
import type { SectorDef, SectorRun } from './sectors';

/** The run index `?sectorStart=n` asks for (n: the 1-based section number): 0 (a normal run) when n is absent, below 2,
 *  not a whole number, past the last section, or behind a section with no connector (no cycle could reach it). */
export function sectorStartIndex(defs: readonly SectorDef[], n: number | null): number {
  if (n === null || !Number.isInteger(n) || n < 2 || n > defs.length) return 0;
  for (let k = 0; k < n - 1; k++) if (!defs[k]!.connector) return 0;
  return n - 1;
}

/**
 * Put a fresh run (index 0, objective phase) at section `i` as `SectorRun.advance` leaves it once connector i - 1 seals:
 * the index, that connector's checkpoint and partner point, no download, the connector machine locked, the alarm stage
 * recorded as the section's start. The earlier marks stay -1. False, the run untouched, when `i` is not a section after
 * a connector or the run has already moved.
 */
export function applySectorStart(run: SectorRun, i: number): boolean {
  const c = run.defs[i - 1]?.connector;
  if (i <= 0 || !c || !run.defs[i] || run.index !== 0 || run.phase !== 'objective') return false;
  run.index = i;
  const cp = run.checkpoint;
  cp.x = c.checkpoint.x;
  cp.y = c.checkpoint.y;
  cp.z = c.checkpoint.z;
  cp.yaw = c.checkpoint.yaw;
  run.checkpoint2 = c.checkpoint2 ?? null;
  run.progress = 0;
  run.downloading = false;
  run.conn.reset();
  run.alarmAtStart = run.alarm;
  return true;
}

/** The badges a practice run does not earn, as `sectorResult` writes them (the separator is `sectors.ts`'s). */
const PRACTICE_DROPS = ['  ·  PERFECT', '  ·  GHOST'] as const;

/** A practice run's result line: `line` (from `sectorResult`) without its badges, then "PRACTICE from section N". */
export function practiceLine(line: string, from: number): string {
  let out = line;
  for (const b of PRACTICE_DROPS) out = out.replace(b, '');
  return `${out}  ·  PRACTICE from section ${from}`;
}

/** Co-op client: the host's run never rated section 1 (`rh[0]` -1, `packRated`'s unrated), so it began at a later
 *  section: practice (no star). No allocation (read per `sector` message). */
export function practiceFromRh(rh: readonly number[]): boolean {
  return (rh[0] ?? -1) < 0;
}
