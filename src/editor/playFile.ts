/**
 * ON6: the play file (docs/kestrel/kestrel.play.json, schema.md section 3) beside the campus file, pure. The editor keeps
 * one document: the play collections it edits (`lamps`, `circuits`; later parts add theirs to PLAY_COLLS) ride in the
 * campus data in memory, so undo, the unsaved count, drafts and the change log treat both files as one. On save they are
 * split out again: the campus file never holds them, and the play file keeps every other collection it has untouched.
 * The play file is written in the campus file's own format (one-space indent, LF, trailing newline). Babylon-free
 * (tests/editor/lamps.test.ts).
 */
import type { Campus } from './types';

/** The play file's collections the editor writes. */
export const PLAY_COLLS = ['lamps', 'circuits'] as const;

export type PlayData = Record<string, unknown>;

/** The play file's text as the editor writes it. */
export const playText = (p: PlayData): string => JSON.stringify(p, null, 1) + '\n';

/** The campus data with the play file's editor collections joined in (only those the file has). */
export function joinPlay(campus: Campus, play: PlayData | null): Campus {
  if (!play) return campus;
  const out = campus as Record<string, unknown>;
  for (const k of PLAY_COLLS) if (Array.isArray(play[k])) out[k] = play[k];
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
    if (Array.isArray(data[k])) out[k] = data[k];
    else if (k in out && !play) delete out[k];
  }
  return { campus: campus as Campus, play: out };
}
