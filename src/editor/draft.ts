/**
 * Unsaved edit drafts for the level editor. Every committed edit writes the in-memory campus and the journal to
 * IndexedDB (database `kestrel-editor`, never the game's `shoulder-strike`); on load the editor offers to restore a
 * draft that is newer than the file on disk and differs from it. Save clears it. Babylon-free
 * (tests/editor/draft.test.ts).
 */
import { campusText } from './model';
import type { JournalEntry } from './model';
import type { Campus } from './types';

export interface Draft {
  /** When the draft was written (ms since 1970). */
  savedAt: number;
  campus: Campus;
  journal: JournalEntry[];
}

const DB = 'kestrel-editor';
const STORE = 'drafts';
const KEY = 'campus';

export function makeDraft(campus: Campus, journal: readonly JournalEntry[], now: number): Draft {
  return JSON.parse(JSON.stringify({ savedAt: now, campus, journal })) as Draft;
}

/** Offer a restore only for a draft newer than the file that would change it. */
export function shouldOffer(d: Draft | null, fileText: string, fileMtime: number): d is Draft {
  if (!d?.campus || !Array.isArray(d.journal)) return false;
  return d.savedAt > fileMtime && campusText(d.campus) !== fileText;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error('could not open the draft store'));
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(req.result);
      t.onerror = () => reject(t.error ?? new Error('draft store failed'));
    });
  } finally {
    db.close();
  }
}

export const writeDraft = (d: Draft): Promise<IDBValidKey> => tx('readwrite', (s) => s.put(d, KEY));
export const readDraft = async (): Promise<Draft | null> => ((await tx('readonly', (s) => s.get(KEY))) as Draft | undefined) ?? null;
export const clearDraft = (): Promise<undefined> => tx('readwrite', (s) => s.delete(KEY));
