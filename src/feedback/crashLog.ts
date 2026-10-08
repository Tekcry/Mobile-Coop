import { newEntry, type FeedbackEntry } from './feedback';

// (localStorage, not IndexedDB: diagnostics, not a save - and its write is synchronous, so the clean mark on
// `pagehide` lands before the page unloads; an asynchronous one could miss it and report a reload as a crash)
const KEY = 'sbd-crash-beat';
/** How often the heartbeat is written (ms). */
export const BEAT_MS = 5000;

/** The last thing the page wrote about itself; `alive` while open and visible. */
export interface Beat {
  alive: boolean;
  /** When it was written / when the session started (ms since the epoch). */
  at: number;
  started: number;
  /** What it was doing: "menu", "loading ...", "benchmark run 3/9: ...". */
  stage: string;
  context: Record<string, string>;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Pure: a feedback note for a session that ended while open and visible - iOS killing the tab (out of memory), a
 * crash or a hang the browser stopped - or null (closed, hidden, nothing stored).
 */
export function crashNote(raw: unknown, now = Date.now()): FeedbackEntry | null {
  if (!isObj(raw) || raw.alive !== true || typeof raw.at !== 'number') return null;
  const ctx: Record<string, string> = {};
  if (isObj(raw.context)) for (const [k, v] of Object.entries(raw.context)) if (typeof v === 'string') ctx[k] = v;
  const started = typeof raw.started === 'number' ? raw.started : raw.at;
  const stage = typeof raw.stage === 'string' ? raw.stage : 'unknown';
  const e = newEntry(ctx, now);
  e.category = 'bug';
  e.text = `Crash report - the last session stopped while the game was open (crashed, out of memory or killed by the browser) at ${new Date(raw.at).toISOString()}, ${Math.round((raw.at - started) / 1000)} s after it started. It was: ${stage}.`;
  return e;
}

/**
 * Crash log (3.1.4): a heartbeat in localStorage every `BEAT_MS` and on every stage change; hiding or closing the page
 * marks it clean. A heartbeat still `alive` at the next start means the page died while open: it becomes a note.
 */
export class CrashLog {
  private beat: Beat;
  private timer = 0;

  constructor(private context: () => Record<string, string>) {
    const now = Date.now();
    this.beat = { alive: true, at: now, started: now, stage: 'starting', context: {} };
  }

  /** At boot, before the first heartbeat: the last session's note if it crashed (saved through `save`). */
  async recover(save: (e: FeedbackEntry) => Promise<void>): Promise<FeedbackEntry | null> {
    let note: FeedbackEntry | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      localStorage.removeItem(KEY);
      note = crashNote(raw ? JSON.parse(raw) : null);
      if (note) await save(note);
    } catch (e) {
      console.warn('crash log read failed', e);
    }
    return note;
  }

  /** Start the heartbeat. */
  start(): void {
    document.addEventListener('visibilitychange', () => this.setAlive(!document.hidden));
    window.addEventListener('pagehide', () => this.setAlive(false));
    this.timer = window.setInterval(() => {
      if (this.beat.alive) this.write();
    }, BEAT_MS);
    this.write();
  }

  /** What the game is doing now (written at once: a crash while loading still says what was loading). */
  stage(s: string): void {
    this.beat.stage = s;
    this.write();
  }

  private setAlive(on: boolean): void {
    this.beat.alive = on;
    this.write();
  }

  private write(): void {
    if (!this.timer) return;
    this.beat.at = Date.now();
    try {
      this.beat.context = this.context();
    } catch {
      // (the context reads the current state: keep the last one)
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(this.beat));
    } catch {
      // (storage full / blocked: no crash log)
    }
  }
}
