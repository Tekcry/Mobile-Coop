import { dbGet, dbPut } from '../save/db';
import { sanitizeFeedback, type FeedbackEntry } from './feedback';

const KEY = 'feedback';

/** Feedback notes in IndexedDB (`kv` 'feedback'), photos as Blobs. */
export class FeedbackStore {
  private list: FeedbackEntry[] | null = null;

  async all(): Promise<FeedbackEntry[]> {
    if (!this.list) {
      try {
        this.list = sanitizeFeedback(await dbGet('kv', KEY));
      } catch (e) {
        console.warn('feedback load failed', e);
        this.list = [];
      }
    }
    return this.list;
  }

  async save(e: FeedbackEntry): Promise<void> {
    const list = await this.all();
    e.updated = Date.now();
    const i = list.findIndex((x) => x.id === e.id);
    if (i >= 0) list[i] = e;
    else list.unshift(e);
    await this.persist();
  }

  async remove(id: string): Promise<void> {
    const list = await this.all();
    const i = list.findIndex((x) => x.id === id);
    if (i >= 0) list.splice(i, 1);
    await this.persist();
  }

  async clear(): Promise<void> {
    this.list = [];
    await this.persist();
  }

  private async persist(): Promise<void> {
    await dbPut('kv', KEY, this.list ?? []);
  }
}

/** A Blob as a data URL (for the standalone report). */
export function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });
}
