/**
 * (hud-guidance B5, R12, BRIEF A9) Field Terminal > Notes: this match's interrogation lines, oldest first. Pure,
 * Babylon-free. Solo and the co-op host add the `intel` event's lines; a co-op client adds the host's `feed` events
 * (they also carry Sector Ops keypad radio lines: no wire change). A new match builds a new list (empty).
 */

/** At most this many lines; a new line past it drops the oldest. */
export const FIELD_NOTES_CAP = 24;

export class FieldNotes {
  private readonly list: string[] = [];

  /** Adds a line (trimmed): an empty one or one already listed is skipped (a repeated line is kept once). Event-driven,
   *  never per frame. Returns true when it was added. */
  add(line: string): boolean {
    const t = line.trim();
    if (!t || this.list.includes(t)) return false;
    if (this.list.length >= FIELD_NOTES_CAP) this.list.shift();
    this.list.push(t);
    return true;
  }

  /** The lines, oldest first (the live list: read it, never keep or change it). */
  lines(): readonly string[] {
    return this.list;
  }
}
