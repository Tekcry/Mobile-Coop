import { dbDelete, dbGet, dbKeys, dbPut } from '../save/db';
import { DIAG, DiagBook, diagText, FramePerf, metaOf, rotate, sanitizeLines, sanitizeMeta, scrub, zoneLabel, type DiagKind, type DiagMeta, type DiagSession } from './diagLog';

/**
 * The diagnostics log's live session and its storage: IndexedDB (`kv`), one meta record per session (`diag:s:<id>`) and
 * its lines in blocks (`diag:c:<id>:<block>`), so a write only touches the blocks that changed. Written every
 * `FLUSH_MS` and when the page is hidden or closed (a crash loses a few seconds at most); the oldest sessions go when a
 * new one starts (`rotate`). Without IndexedDB it keeps this session in memory. Settings > Feedback copies it
 * (`text`). Always on; `src/net` pushes the co-op lines here (single player never loads `src/net`).
 */
export const META_PREFIX = 'diag:s:';
export const CHUNK_PREFIX = 'diag:c:';
export const FLUSH_MS = 3000;
const metaKey = (sid: string): string => `${META_PREFIX}${sid}`;
const chunkKey = (sid: string, cid: number): string => `${CHUNK_PREFIX}${sid}:${cid}`;

export class DiagLog {
  private book: DiagBook;
  private secrets: string[] = [];
  /** Older sessions on the device (newest first): their meta, and their lines once loaded. */
  private old: DiagMeta[] = [];
  private oldSessions: DiagSession[] | null = null;
  private oldLoading: Promise<void> | null = null;
  private started = false;
  private storeOk = true;
  private timer: ReturnType<typeof setInterval> | null = null;
  private writing: Promise<void> = Promise.resolve();
  /** Frame intervals for the performance samples (`push` every frame). */
  readonly perf = new FramePerf();

  constructor(
    now = Date.now(),
    /** The clock (tests pass their own). */
    private readonly clockNow: () => number = () => Date.now(),
  ) {
    this.book = new DiagBook(now, zoneLabel(new Date(now)));
  }

  get session(): DiagSession {
    return this.book.session;
  }

  /** The older sessions' lines are loaded (`text` has them all). */
  get oldReady(): boolean {
    return this.oldSessions !== null;
  }

  get lineCount(): number {
    return this.book.lineCount;
  }

  /** One line (scrubbed: no relay login, no addresses). Never throws. */
  add(k: DiagKind, msg: string): void {
    try {
      this.book.add(this.clockNow(), k, scrub(msg, this.secrets));
    } catch {
      // (the log never breaks the game)
    }
  }

  /** A header fact ("GPU", "Graphics"...), replacing the last value. */
  fact(key: string, value: string): void {
    this.book.session.facts[key] = scrub(value, this.secrets, DIAG.maxFactChars);
    this.book.touch();
  }

  /** Values that must never be kept (the relay login): hidden in every line from now on. */
  addSecrets(list: readonly (string | undefined)[]): void {
    for (const s of list) if (s && s.length >= 4 && !this.secrets.includes(s)) this.secrets.push(s);
  }

  /** (co-op) A connection attempt ended: counted for the summary. */
  attempt(ok: boolean, relay: boolean, fail: string, line: string): void {
    const st = this.book.session.stats;
    st.attempts++;
    if (ok) {
      st.attemptsOk++;
      if (relay) st.relay++;
    } else if (st.fails.length < 20) st.fails.push(fail);
    this.add('net', `attempt: ${line}`);
  }

  /** (co-op) The connection readout changed ("Connected - via relay, 120 ms"). */
  link(text: string): void {
    this.book.session.stats.lastLink = text.slice(0, 120);
    this.add('net', `readout: ${text}`);
  }

  /** Load the device's older sessions (their meta), drop the oldest past the caps, then write every few seconds. */
  start(): Promise<void> {
    this.startP ??= this.begin();
    return this.startP;
  }

  private startP: Promise<void> | null = null;

  private async begin(): Promise<void> {
    this.started = true;
    try {
      const keys = (await dbKeys('kv')).filter((k) => k.startsWith('diag:'));
      const metas: DiagMeta[] = [];
      for (const k of keys) {
        if (!k.startsWith(META_PREFIX) || k === metaKey(this.session.id)) continue;
        const m = sanitizeMeta(await dbGet('kv', k));
        if (m) metas.push(m);
        else await dbDelete('kv', k);
      }
      const { keep, drop } = rotate(metas);
      this.old = keep;
      for (const m of drop) await dbDelete('kv', metaKey(m.id));
      // (a dropped session's blocks, and any left behind)
      const live = new Set([...keep.map((m) => m.id), this.session.id]);
      for (const k of keys) if (k.startsWith(CHUNK_PREFIX) && !live.has(k.slice(CHUNK_PREFIX.length).split(':')[0] ?? '')) await dbDelete('kv', k);
    } catch {
      // (no IndexedDB: this session lives in memory only)
      this.storeOk = false;
    }
    void this.flush();
    this.timer = setInterval(() => void this.flush(), FLUSH_MS);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) void this.flush();
      });
      window.addEventListener('pagehide', () => void this.flush());
    }
  }

  /** Write what changed (meta first, then the changed blocks; dropped blocks deleted). */
  flush(): Promise<void> {
    if (!this.started || !this.storeOk || !this.book.isDirty) return this.writing;
    const { chunks, removed } = this.book.takeDirty();
    const sid = this.session.id;
    const meta = metaOf(this.session);
    this.writing = this.writing.then(async () => {
      try {
        await dbPut('kv', metaKey(sid), meta);
        for (const c of chunks) await dbPut('kv', chunkKey(sid, c.id), c.lines);
        for (const id of removed) await dbDelete('kv', chunkKey(sid, id));
      } catch {
        // (storage full or blocked: keep logging in memory)
        this.book.touch();
      }
    });
    return this.writing;
  }

  /** The older sessions' lines (once; the copy waits for it). */
  loadOld(): Promise<void> {
    this.oldLoading ??= (async () => {
      // (the older sessions' list comes from `start`)
      await this.startP;
      const out: DiagSession[] = [];
      for (const m of this.old) {
        const chunks = [];
        for (const id of m.chunkIds) {
          let lines: ReturnType<typeof sanitizeLines> = [];
          try {
            lines = sanitizeLines(await dbGet('kv', chunkKey(m.id, id)));
          } catch {
            // (a block that cannot be read is left out)
          }
          chunks.push({ id, lines, bytes: 0 });
        }
        out.push({ id: m.id, started: m.started, last: m.last, tz: m.tz, facts: m.facts, stats: m.stats, chunks, dropped: m.dropped });
      }
      this.oldSessions = out;
    })();
    return this.oldLoading;
  }

  /** The text to paste (this session, and the older ones loaded so far; `loadOld` first for all of them). */
  text(now = Date.now()): string {
    return diagText([this.session, ...(this.oldSessions ?? [])], { now, unloaded: this.oldSessions ? [] : this.old });
  }

  async fullText(now = Date.now()): Promise<string> {
    await this.loadOld().catch(() => {});
    return this.text(now);
  }

  /** Delete every stored session; this one starts again (its header kept). */
  async clear(): Promise<void> {
    const facts = { ...this.session.facts };
    try {
      await this.writing;
      for (const k of await dbKeys('kv')) if (k.startsWith('diag:')) await dbDelete('kv', k);
    } catch {
      // (no storage: the memory copy is cleared below)
    }
    this.old = [];
    this.oldSessions = [];
    this.oldLoading = Promise.resolve();
    const now = this.clockNow();
    this.book = new DiagBook(now, zoneLabel(new Date(now)));
    Object.assign(this.book.session.facts, facts);
    this.add('sys', 'log cleared on this device');
    await this.flush();
  }

  /** For tests: stop the timer. */
  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

/** The page's diagnostics log. */
export const diag = new DiagLog();
