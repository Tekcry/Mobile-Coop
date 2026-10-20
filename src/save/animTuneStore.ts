/**
 * (anim-tuner) The animation tuner's own small IndexedDB database, beside the save (`<save db>-animtune`, one store,
 * one key): the tuner's values never touch the save schema or SAVE_VERSION, and a preview slot keeps its own copy as
 * its save does. Not localStorage. A dev aid: every failure is swallowed (the tuner then just does not persist).
 */
import { DB_NAME } from './db';

export const TUNE_DB_NAME = `${DB_NAME}-animtune`;
const STORE = 'tune';
const KEY = 'current';

let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const r = indexedDB.open(TUNE_DB_NAME, 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE);
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('IndexedDB blocked'));
  });
  dbp.catch(() => {
    dbp = null;
  });
  return dbp;
}

export async function loadAnimTune(): Promise<unknown> {
  try {
    const db = await open();
    return await new Promise((resolve, reject) => {
      const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } catch {
    return undefined;
  }
}

export async function saveAnimTune(value: unknown): Promise<boolean> {
  try {
    const db = await open();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, KEY);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return true;
  } catch {
    return false;
  }
}

/** For tests: forget the cached connection. */
export function resetAnimTuneDb(): void {
  void dbp?.then((db) => db.close()).catch(() => {});
  dbp = null;
}
