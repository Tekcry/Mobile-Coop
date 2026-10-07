/**
 * Minimal promise wrapper over IndexedDB. One database, a few object stores
 * keyed by string. Works in node tests with `fake-indexeddb/auto`.
 */
// the preview build (dev branch, same origin as the live game) keeps its own save, so it can never migrate or
// overwrite the live one
// (a named preview slot, e.g. ct-movement under /ct/, keeps its own too: `shoulder-strike-ct`)
const PREVIEW_ID = typeof __PREVIEW_ID__ !== 'undefined' ? __PREVIEW_ID__ : '';
export const DB_NAME = PREVIEW_ID ? `shoulder-strike-${PREVIEW_ID}` : typeof __PREVIEW__ !== 'undefined' && __PREVIEW__ ? 'shoulder-strike-preview' : 'shoulder-strike';
/** Bump when adding object stores; add the store in `upgrade`. */
export const DB_VERSION = 1;
export const STORES = ['kv', 'profile', 'backups'] as const;
export type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export function openDb(name = DB_NAME): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const r = indexedDB.open(name, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('IndexedDB blocked'));
  });
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

/** For tests: forget the cached connection. */
export function resetDbCache(): void {
  void dbPromise?.then((db) => db.close()).catch(() => {});
  dbPromise = null;
}

export async function dbGet<T>(store: StoreName, key: string): Promise<T | undefined> {
  const db = await openDb();
  return req(db.transaction(store, 'readonly').objectStore(store).get(key)) as Promise<T | undefined>;
}

export async function dbPut(store: StoreName, key: string, value: unknown): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(value, key);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function dbDelete(store: StoreName, key: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(key);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbKeys(store: StoreName): Promise<string[]> {
  const db = await openDb();
  return (await req(db.transaction(store, 'readonly').objectStore(store).getAllKeys())) as string[];
}

/** Ask the browser not to evict our storage (best effort). */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
