/**
 * ON6: the play file (docs/kestrel/kestrel.play.json, schema.md section 3) beside the campus file, pure. The editor keeps
 * one document: the play collections it edits (`lamps`, `circuits`; ON8 adds `guards`, `objectives`, `hides`,
 * `checkpoints`, `spawns`, `extraction`) ride in the campus data in memory, so undo, the unsaved count, drafts and the
 * change log treat both files as one. On save they are split out again: the campus file never holds them, and the play
 * file keeps every other collection it has untouched. The play file is written in the campus file's own format
 * (one-space indent, LF, trailing newline). ON8: `spawns` (bare points in the file) and `extraction` (one object) are
 * held as records while editing (src/editor/mission.ts) and written back in the file's shapes. Babylon-free
 * (tests/editor/lamps.test.ts, tests/editor/mission.test.ts).
 */
import type { Campus } from './types';
import { extractionFromFile, extractionToFile, spawnsFromFile, spawnsToFile } from './mission';
import type { Extraction, Spawn } from './mission';

/** The play file's collections the editor writes. */
export const PLAY_COLLS = ['lamps', 'circuits', 'guards', 'objectives', 'hides', 'checkpoints', 'spawns', 'extraction'] as const;

export type PlayData = Record<string, unknown>;

/** The play file's text as the editor writes it. */
export const playText = (p: PlayData): string => JSON.stringify(p, null, 1) + '\n';

/** The editor's in-memory form of a file collection (ON8: spawns and extraction become records). */
function fromFile(k: string, v: unknown): unknown[] | null {
  if (k === 'spawns') return spawnsFromFile(v);
  if (k === 'extraction') return extractionFromFile(v);
  return Array.isArray(v) ? v : null;
}

/** The file's form of an in-memory collection (undefined: the file has no such key). */
function toFile(k: string, v: unknown[]): unknown {
  if (k === 'spawns') return spawnsToFile(v as Spawn[]);
  if (k === 'extraction') return extractionToFile(v as Extraction[]) ?? undefined;
  return v;
}

/** The campus data with the play file's editor collections joined in (only those the file has). */
export function joinPlay(campus: Campus, play: PlayData | null): Campus {
  if (!play) return campus;
  const out = campus as Record<string, unknown>;
  for (const k of PLAY_COLLS) {
    const v = fromFile(k, play[k]);
    if (v) out[k] = v;
  }
  return campus;
}

/**
 * The two files from the editor's data: the campus without the play collections (its keys in their order), and the play
 * file (the loaded one with the editor's collections replaced in place, new ones appended), or null when there was no
 * play file and the editor has nothing for one.
 */
export function splitPlay(data: Campus, play: PlayData | null): { campus: Campus; play: PlayData | null } {
  const campus: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) if (!(PLAY_COLLS as readonly string[]).includes(k)) campus[k] = v;
  const has = PLAY_COLLS.some((k) => Array.isArray(data[k]) && (data[k] as unknown[]).length > 0);
  if (!play && !has) return { campus: campus as Campus, play: null };
  const out: PlayData = { ...(play ?? {}) };
  for (const k of PLAY_COLLS) {
    if (Array.isArray(data[k])) {
      const v = toFile(k, data[k] as unknown[]);
      if (v === undefined) delete out[k];
      else out[k] = v;
    } else if (k in out && !play) delete out[k];
  }
  return { campus: campus as Campus, play: out };
}
