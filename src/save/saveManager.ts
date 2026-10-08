import { dbGet, dbKeys, dbPut, dbDelete } from './db';
import { migrate, SaveVersionError } from './migrations';
import { defaultSave, sanitizeSave, SAVE_VERSION, type SaveData } from './schema';

const KEY = 'main';
const EXPORT_MAGIC = 'shoulder-strike-save';
const MAX_BACKUPS = 3;

export interface ExportFile {
  magic: typeof EXPORT_MAGIC;
  exportedAt: number;
  version: number;
  data: unknown;
}

/** Parse + migrate + sanitise any raw save object. Throws SaveVersionError for unusable input. */
export function loadRaw(raw: unknown, openLoadout = false): { save: SaveData; migratedFrom: number } {
  const { data, from } = migrate(raw);
  return { save: sanitizeSave(data, openLoadout), migratedFrom: from };
}

/** Parse an exported save file's text (or a bare save object). */
export function parseExport(text: string, openLoadout = false): SaveData {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new SaveVersionError('File is not valid JSON');
  }
  if (typeof obj === 'object' && obj !== null && (obj as ExportFile).magic === EXPORT_MAGIC) obj = (obj as ExportFile).data;
  return loadRaw(obj, openLoadout).save;
}

export function serializeExport(save: SaveData, now = Date.now()): string {
  const f: ExportFile = { magic: EXPORT_MAGIC, exportedAt: now, version: SAVE_VERSION, data: save };
  return JSON.stringify(f, null, 1);
}

/**
 * The single source of truth for the profile. Loads from IndexedDB (migrating old versions,
 * keeping a backup first), saves with debounce, supports export/import.
 */
export class SaveManager {
  private data: SaveData = defaultSave();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<(s: SaveData) => void>();
  /** Set if IndexedDB is unavailable (private mode): play continues with an in-memory profile. */
  storageError: string | null = null;
  /**
   * The stored profile could not be read (newer app version, corrupt data): play continues on a fresh
   * in-memory profile but nothing is written, so the stored data is never overwritten.
   */
  readOnly = false;
  /** 3.5: the campaign lets any weapon be chosen (`core/legacy.ts` `campaignUnlocked`); set before `load`. */
  openLoadout = false;

  get(): SaveData {
    return this.data;
  }

  /** Raw stored data that could not be loaded (kept so an explicit import/reset can back it up first). */
  private unreadable: unknown = undefined;

  async load(): Promise<void> {
    let raw: unknown = undefined;
    try {
      raw = await dbGet<unknown>('profile', KEY);
      if (raw === undefined) {
        this.data = defaultSave();
        await this.flush();
        return;
      }
      const { save, migratedFrom } = loadRaw(raw, this.openLoadout);
      if (migratedFrom !== SAVE_VERSION) {
        await this.backup(raw, `pre-migration-v${migratedFrom}`);
      }
      this.data = save;
      if (migratedFrom !== SAVE_VERSION) await this.flush();
    } catch (e) {
      console.warn('save load failed', e);
      this.storageError = e instanceof Error ? e.message : String(e);
      this.readOnly = true;
      this.unreadable = raw;
      this.data = defaultSave();
    }
    this.notify();
  }

  /** Mutate the profile; sanitised and persisted (debounced). */
  update(fn: (s: SaveData) => void): void {
    const draft = structuredClone(this.data);
    fn(draft);
    draft.updatedAt = Date.now();
    this.data = sanitizeSave(draft, this.openLoadout);
    this.notify();
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), 200);
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.readOnly) return;
    try {
      await dbPut('profile', KEY, this.data);
    } catch (e) {
      this.storageError = e instanceof Error ? e.message : String(e);
    }
  }

  private async backup(raw: unknown, label: string): Promise<void> {
    try {
      const key = `${Date.now()}-${label}`;
      await dbPut('backups', key, raw);
      const keys = (await dbKeys('backups')).sort();
      while (keys.length > MAX_BACKUPS) await dbDelete('backups', keys.shift()!);
    } catch {
      /* best effort */
    }
  }

  exportText(): string {
    return serializeExport(this.data);
  }

  /** Replace the profile with an imported one (current profile backed up first). */
  /** Explicit user action (import/reset) on a read-only profile: keep the unreadable data, then allow writes. */
  private async unlock(): Promise<void> {
    if (!this.readOnly) return;
    if (this.unreadable !== undefined) await this.backup(this.unreadable, 'unreadable');
    this.unreadable = undefined;
    this.readOnly = false;
    this.storageError = null;
  }

  async importText(text: string): Promise<void> {
    const save = parseExport(text, this.openLoadout);
    await this.unlock();
    await this.backup(this.data, 'pre-import');
    this.data = save;
    await this.flush();
    this.notify();
  }

  async reset(): Promise<void> {
    await this.unlock();
    await this.backup(this.data, 'pre-reset');
    this.data = defaultSave();
    await this.flush();
    this.notify();
  }

  subscribe(fn: (s: SaveData) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    for (const fn of this.listeners) fn(this.data);
  }
}
