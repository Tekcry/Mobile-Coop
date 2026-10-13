/**
 * The level editor's document: the campus data, undo / redo, and the change journal written beside the file on save.
 * Every edit is a list of element changes (before and after snapshots), so undo, redo and the review log all read the
 * same record. Babylon-free (tests/editor/model.test.ts).
 */
import type { Campus, Coll, Elem, Key } from './types';
import { keyOf } from './types';
import type { Room } from './types';
import { applyCeiling, ceilingOf } from './ceilings';
import type { Ceiling } from './ceilings';

export interface Change {
  coll: Coll;
  id: string;
  /** null: the element is added by this change. */
  before: Elem | null;
  /** null: the element is deleted by this change. */
  after: Elem | null;
  /** Where a deleted element sat in its list, so undo puts it back in the same place (keeps the file diff small). */
  index?: number;
}

export interface Edit {
  /** Plain-English line for Michael and the reviewer: "Moved Data Hall (B-GHALL, Ground) 2 m east". */
  text: string;
  changes: Change[];
}

export interface JournalEntry {
  time: string;
  action: 'edit' | 'undo' | 'redo';
  text: string;
  changes: Change[];
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export class EditorModel {
  readonly data: Campus;
  private readonly past: Edit[] = [];
  private readonly future: Edit[] = [];
  /** Everything done since the last save, undos included, in order. */
  journal: JournalEntry[] = [];
  private readonly listeners: ((keys: Key[]) => void)[] = [];
  /** Clock for journal times (tests pin it). */
  now: () => Date = () => new Date();
  /** The undo history at the last load or save (edit identities), and the file text then. */
  private savedPast: Edit[] = [];
  private savedText: string;
  /** Bumped on every change to the data, so the text compare runs once per change, not once per read. */
  private version = 0;
  /** ON5: the data's revision (any change, merged card steps too), for screens that redraw when it moves. */
  get rev(): number {
    return this.version;
  }
  private dirtyAt = -1;
  private dirtyCache = 0;

  constructor(data: Campus) {
    this.data = data;
    this.savedText = campusText(data);
  }

  list(coll: Coll): Elem[] {
    // ON13: a ceiling is its room's ceiling fields (never a list in the file)
    if (coll === 'ceilings') return this.data.rooms.map(ceilingOf);
    if (coll === 'buildings') return (this.data.meta.buildings as Elem[] | undefined) ?? [];
    return (this.data[coll] as Elem[] | undefined) ?? [];
  }

  /**
   * Changes an edit brings along (ON2: a stair's stairwell in the floor above, vertical.ts `stairwellLink`). Run on every
   * commit and preview, so every path (drag, card, panel, delete, rename) keeps them in step in the same undo step.
   */
  link: ((data: Campus, changes: readonly Change[]) => Change[]) | null = null;

  private linked(changes: Change[]): Change[] {
    if (!this.link) return changes;
    const more = this.link(this.data, changes).filter((m) => !changes.some((c) => c.coll === m.coll && c.id === m.id));
    return more.length ? [...changes, ...more] : changes;
  }

  get<T extends Elem = Elem>(coll: Coll, id: string): T | undefined {
    return this.list(coll).find((e) => e.id === id) as T | undefined;
  }

  /** A deep copy of an element, for a change's `before`. */
  snapshot<T extends Elem = Elem>(coll: Coll, id: string): T | null {
    const e = this.get<T>(coll, id);
    return e ? clone(e) : null;
  }

  onChange(fn: (keys: Key[]) => void): void {
    this.listeners.push(fn);
  }

  /** The undo history, oldest first (the hub's change list). */
  get history(): readonly Edit[] {
    return this.past;
  }

  /** ON3: the undone edits that redo would bring back, the next redo last (the hub greys them until a new edit drops them). */
  get undone(): readonly Edit[] {
    return this.future;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /**
   * The net unsaved count (ED2 Part B): the undo or redo steps between now and the last load or save (an edit after
   * undoing past the saved point counts both ways). 0 exactly when the data's file text equals the file as last loaded
   * or saved; at least 1 whenever it differs (a restored draft). The journal still records every undo.
   */
  get dirty(): number {
    if (this.dirtyAt === this.version) return this.dirtyCache;
    let common = 0;
    while (common < this.past.length && common < this.savedPast.length && this.past[common] === this.savedPast[common]) common++;
    const steps = this.past.length - common + (this.savedPast.length - common);
    const same = campusText(this.data) === this.savedText;
    this.dirtyCache = same ? 0 : Math.max(1, steps);
    this.dirtyAt = this.version;
    return this.dirtyCache;
  }

  /** The file text as last loaded or saved (the walk test's warm game compares against the text it was built from). */
  get savedFileText(): string {
    return this.savedText;
  }

  /**
   * ON15: one `meta` field set (the map's own night): unsaved until Save, written in the change log; not an undo step
   * (setting it again with other values, or the file as saved, puts it back).
   */
  setMeta(key: string, value: unknown, text: string): void {
    this.data.meta[key] = clone(value);
    this.journal.push({ time: this.now().toISOString(), action: 'edit', text, changes: [] });
    this.emit([]);
  }

  /** Applies a change's `after` without recording it (live preview while dragging). The final commit records it. */
  preview(coll: Coll, after: Elem): void {
    const keys = [keyOf(coll, after.id)];
    if (this.link) {
      const before = this.snapshot(coll, after.id);
      for (const c of this.link(this.data, [{ coll, id: after.id, before, after }])) {
        if (c.after) this.put(c.coll, c.id, clone(c.after));
        else this.remove(c.coll, c.id);
        keys.push(keyOf(c.coll, c.id));
      }
    }
    this.put(coll, after.id, clone(after));
    this.emit(keys);
  }

  /** Throws away a previewed element that was never committed (a new wall or room cancelled mid-drag). */
  drop(coll: Coll, id: string): void {
    const keys = [keyOf(coll, id)];
    const before = this.snapshot(coll, id);
    if (this.link && before) {
      for (const c of this.link(this.data, [{ coll, id, before, after: null }])) {
        this.remove(c.coll, c.id);
        keys.push(keyOf(c.coll, c.id));
      }
    }
    this.remove(coll, id);
    this.emit(keys);
  }

  /** The last edit made with a merge key (selection card steps), for merging the next quick step on the same row. */
  private lastMerge: { key: string; at: number; edit: Edit } | null = null;

  /**
   * Records and applies an edit. Changes whose before and after are equal are dropped; an empty edit is ignored.
   * With `merge` (ON0a: selection card steps), an edit with the same key within `within` seconds of the last one, while
   * that edit is still the newest undo step and not saved, joins it: one undo step, each element's first `before` kept.
   */
  commit(text: string, changes: Change[], merge?: { key: string; at: number; within: number }): boolean {
    changes = this.linked(changes);
    const lm = this.lastMerge;
    if (merge && lm && lm.key === merge.key && merge.at - lm.at <= merge.within && this.past[this.past.length - 1] === lm.edit && !this.savedPast.includes(lm.edit) && !this.future.length) {
      const real = changes.filter((c) => JSON.stringify(c.before) !== JSON.stringify(c.after));
      if (!real.length) return false;
      if (real.some((c) => c.before === null || c.after === null)) return this.commitNew(text, changes, merge);
      this.applyForward({ text, changes: clone(real) });
      for (const c of real) {
        const prev = lm.edit.changes.find((p) => p.coll === c.coll && p.id === c.id);
        if (prev) prev.after = clone(c.after);
        else lm.edit.changes.push(clone(c));
      }
      lm.edit.text = text;
      lm.at = merge.at;
      this.version++;
      const j = this.journal[this.journal.length - 1];
      if (j && j.action === 'edit') {
        j.text = text;
        j.changes = clone(lm.edit.changes);
      } else this.record('edit', lm.edit);
      return true;
    }
    return this.commitNew(text, changes, merge);
  }

  private commitNew(text: string, changes: Change[], merge?: { key: string; at: number }): boolean {
    this.lastMerge = null;
    const real = changes.filter((c) => JSON.stringify(c.before) !== JSON.stringify(c.after));
    if (!real.length) {
      // a drag that ended where it began: put the previewed element back exactly
      for (const c of changes) if (c.before) this.put(c.coll, c.id, clone(c.before));
      if (changes.length) this.emit(changes.map((c) => keyOf(c.coll, c.id)));
      return false;
    }
    const edit: Edit = { text, changes: clone(real) };
    this.applyForward(edit);
    this.past.push(edit);
    this.future.length = 0;
    // (listeners ran before the push: the count is read fresh next time)
    this.version++;
    this.record('edit', edit);
    if (merge) this.lastMerge = { key: merge.key, at: merge.at, edit };
    return true;
  }

  undo(): Edit | null {
    const edit = this.past.pop();
    if (!edit) return null;
    for (const c of edit.changes.slice().reverse()) {
      if (c.before === null) this.remove(c.coll, c.id);
      else if (c.after === null) this.insert(c.coll, clone(c.before), c.index);
      // (a renamed element is found by its new id, ON2)
      else this.put(c.coll, c.after.id, clone(c.before));
    }
    this.future.push(edit);
    this.record('undo', edit);
    this.emit(changeKeys(edit.changes));
    return edit;
  }

  redo(): Edit | null {
    const edit = this.future.pop();
    if (!edit) return null;
    this.applyForward(edit);
    this.past.push(edit);
    this.version++;
    this.record('redo', edit);
    return edit;
  }

  /** Clears the journal after a save (undo history stays); the current data becomes the saved point. */
  markSaved(): void {
    this.journal = [];
    this.savedPast = this.past.slice();
    this.savedText = campusText(this.data);
    this.version++;
  }

  /**
   * Swaps in other campus data in place (revert to the file, restore a draft): undo and redo are cleared and the journal
   * becomes `journal`. A restored draft keeps the saved point (the file on disk; its count is then at least 1 while it
   * differs); a revert makes the new data the saved point. Listeners are not told; the caller rebuilds its views.
   */
  replace(data: Campus, journal: JournalEntry[] = [], keepSaved = false): void {
    const d = this.data as Record<string, unknown>;
    for (const k of Object.keys(d)) delete d[k];
    Object.assign(d, clone(data));
    this.past.length = 0;
    this.future.length = 0;
    this.journal = clone(journal);
    this.savedPast = [];
    if (!keepSaved) this.savedText = campusText(this.data);
    this.version++;
  }

  /** An id not used in `coll`: prefix + 1, 2, 3 ... */
  freshId(coll: Coll, prefix: string): string {
    const used = new Set(this.list(coll).map((e) => e.id));
    for (let n = 1; ; n++) {
      const id = `${prefix}${n}`;
      if (!used.has(id)) return id;
    }
  }

  private applyForward(edit: Edit): void {
    for (const c of edit.changes) {
      if (c.after === null) {
        // index read just before each removal, so undo (in reverse) restores the order exactly
        c.index = this.list(c.coll).findIndex((e) => e.id === c.id);
        this.remove(c.coll, c.id);
      } else if (c.before === null) this.insert(c.coll, clone(c.after), c.index);
      else this.put(c.coll, c.id, clone(c.after));
    }
    this.emit(changeKeys(edit.changes));
  }

  private record(action: JournalEntry['action'], edit: Edit): void {
    this.journal.push({ time: this.now().toISOString(), action, text: edit.text, changes: clone(edit.changes) });
  }

  private arr(coll: Coll): Elem[] {
    this.version++;
    if (coll === 'buildings') {
      if (!Array.isArray(this.data.meta.buildings)) this.data.meta.buildings = [];
      return this.data.meta.buildings as Elem[];
    }
    if (!Array.isArray(this.data[coll])) (this.data as Record<string, unknown>)[coll] = [];
    return this.data[coll] as Elem[];
  }

  private put(coll: Coll, id: string, e: Elem): void {
    if (coll === 'ceilings') return this.putCeiling(id, e as Ceiling);
    const a = this.arr(coll);
    const i = a.findIndex((x) => x.id === id);
    if (i >= 0) a[i] = e;
    else a.push(e);
  }

  /** ON13: a ceiling written back into its room (removing one leaves the room with no ceiling). */
  private putCeiling(id: string, c: Ceiling | null): void {
    this.version++;
    const r = this.data.rooms.find((q) => q.id === id) as Room | undefined;
    if (r) applyCeiling(r, c ?? { ...ceilingOf(r), ceiling: 0, ceilingType: undefined, hatches: undefined });
  }

  private insert(coll: Coll, e: Elem, index?: number): void {
    if (coll === 'ceilings') return this.putCeiling(e.id, e as Ceiling);
    const a = this.arr(coll);
    if (a.some((x) => x.id === e.id)) return this.put(coll, e.id, e);
    if (index !== undefined && index >= 0 && index <= a.length) a.splice(index, 0, e);
    else a.push(e);
  }

  private remove(coll: Coll, id: string): void {
    if (coll === 'ceilings') return this.putCeiling(id, null);
    const a = this.arr(coll);
    const i = a.findIndex((x) => x.id === id);
    if (i >= 0) a.splice(i, 1);
  }

  private emit(keys: Key[]): void {
    this.version++;
    for (const fn of this.listeners) fn(keys);
  }
}

/** Every key an edit touched: a renamed element under its old and its new id. */
function changeKeys(changes: readonly Change[]): Key[] {
  const out: Key[] = [];
  for (const c of changes) {
    out.push(keyOf(c.coll, c.id));
    if (c.after && c.after.id !== c.id) out.push(keyOf(c.coll, c.after.id));
  }
  return out;
}

/** The campus file text exactly as the Kestrel tools write it (one-space indent, LF, trailing newline). */
export const campusText = (data: Campus): string => JSON.stringify(data, null, 1) + '\n';

/** HH:MM:SS in the editor's own time zone (journal times are UTC ISO strings). */
export const localTime = (iso: string): string => {
  const d = new Date(iso);
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

/** The human log block appended to docs/kestrel/editor-log.md on save; `savedAt` is a heading such as "2026-10-12 00:22". */
export function logMarkdown(journal: readonly JournalEntry[], savedAt: string): string {
  const lines = [`## Saved ${savedAt}`, ''];
  for (const j of journal) {
    const t = localTime(j.time);
    const what = j.action === 'edit' ? j.text : `${j.action === 'undo' ? 'Undid' : 'Redid'}: ${j.text}`;
    lines.push(`- ${t} ${what}`);
  }
  return lines.join('\n') + '\n\n';
}
