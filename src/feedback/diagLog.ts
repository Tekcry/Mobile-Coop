/**
 * The diagnostics log (pure, unit-tested): one session per page load, kept on this device, copied as plain text for a
 * chat with the developer. Lines are timestamped in seconds since the session started; errors and warnings that repeat
 * are counted on their first line; a burst is cut off and counted; each session is capped in bytes (its oldest lines
 * after the first block go first). `diag.ts` owns the live session and IndexedDB; `diagText` writes the copied text:
 * a summary first, then this session, then older ones, trimmed to fit a chat message.
 */
export const DIAG = {
  /** Sessions kept on the device (this one included). */
  maxSessions: 5,
  /** All sessions together (approximate stored bytes). */
  storeCapBytes: 1_000_000,
  /** One session; past it the oldest block after the first is dropped. */
  sessionCapBytes: 400_000,
  /** Lines per stored block (only changed blocks are written). */
  chunkLines: 200,
  /** Longest kept line (characters). */
  maxLineChars: 500,
  /** The copied text's cap (characters). */
  copyCapChars: 180_000,
  /** New lines allowed per second (a burst past it is counted, not kept). */
  burstPerSec: 40,
  /** Lines of a session always kept in the copy (its start: boot, device, first errors). */
  keepFirst: 40,
};

export type DiagKind = 'sys' | 'err' | 'warn' | 'info' | 'game' | 'ui' | 'perf' | 'net';
export const DIAG_KINDS: readonly DiagKind[] = ['sys', 'err', 'warn', 'info', 'game', 'ui', 'perf', 'net'];
const TAG: Readonly<Record<DiagKind, string>> = { sys: 'sys  ', err: 'ERROR', warn: 'warn ', info: 'info ', game: 'game ', ui: 'menu ', perf: 'perf ', net: 'net  ' };

export interface DiagLine {
  /** ms since the session started. */
  t: number;
  k: DiagKind;
  m: string;
  /** Repeats counted on this line (2+), and the last one's time (ms since the start). */
  n?: number;
  tl?: number;
}

export interface DiagStats {
  errors: number;
  warnings: number;
  matches: number;
  /** The lowest 1%-low fps of any performance sample (0: none yet), the longest frame (ms), frames over 50 ms. */
  low1Fps: number;
  worstFrameMs: number;
  longFrames: number;
  /** Where the worst sample was taken ("chamber / test"). */
  worstWhere: string;
  /** Co-op connection attempts this session (`ok`: connected), how many went through the relay, failure reasons. */
  attempts: number;
  attemptsOk: number;
  relay: number;
  fails: string[];
  /** The last connection readout ("Connected - direct, 45 ms"). */
  lastLink: string;
  /** Lines not kept (bursts). */
  suppressed: number;
}

export interface DiagChunk {
  id: number;
  lines: DiagLine[];
  bytes: number;
}

export interface DiagSession {
  id: string;
  /** When it started / last wrote (ms since the epoch); its time zone and offset ("Australia/Sydney, UTC+11:00"). */
  started: number;
  last: number;
  tz: string;
  /** The session header, in order (version, device, GPU, settings...). */
  facts: Record<string, string>;
  stats: DiagStats;
  chunks: DiagChunk[];
  /** Lines dropped by the session cap. */
  dropped: number;
}

export function emptyStats(): DiagStats {
  return { errors: 0, warnings: 0, matches: 0, low1Fps: 0, worstFrameMs: 0, longFrames: 0, worstWhere: '', attempts: 0, attemptsOk: 0, relay: 0, fails: [], lastLink: '', suppressed: 0 };
}

export function newSession(now: number, tz: string, id = `${now.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`): DiagSession {
  return { id, started: now, last: now, tz, facts: {}, stats: emptyStats(), chunks: [{ id: 0, lines: [], bytes: 0 }], dropped: 0 };
}

/** "Australia/Sydney, UTC+11:00" for a date (the offset of that moment). */
export function zoneLabel(d: Date): string {
  let name = '';
  try {
    name = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    // (no Intl: the offset alone)
  }
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const a = Math.abs(off);
  const utc = `UTC${sign}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
  return name ? `${name}, ${utc}` : utc;
}

// ---- scrubbing: no relay login, no addresses ----

const IPV4 = /(?<![\w.]|[A-Za-z]\/)(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?![\w.])/g;
const IPV6 = /(?<![\w:.])(?:[0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}(?![\w:.])/gi;
const MDNS = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.local\b/gi;
const SECRET_KV = /\b(username|credential|password|passwd|token|secret|apikey|api_key)(["']?\s*[:=]\s*["']?)[^\s"',;&}]+/gi;

/**
 * A line made safe to keep and share: the given secrets (the relay login, registered by the transport) and
 * `name=value` logins become "[hidden]"; IP addresses (v4, v6) and mDNS host names (an ICE candidate's address)
 * become "[ip]"; capped at `max` characters.
 */
export function scrub(text: string, secrets: readonly string[] = [], max = DIAG.maxLineChars): string {
  let s = text;
  for (const k of secrets) if (k.length >= 4 && s.includes(k)) s = s.split(k).join('[hidden]');
  s = s.replace(SECRET_KV, '$1$2[hidden]');
  s = s.replace(IPV4, (all, a: string, b: string, c: string, d: string) => ([a, b, c, d].every((p) => Number(p) <= 255) ? '[ip]' : all));
  s = s.replace(IPV6, (all) => (all.includes('::') || (all.match(/:/g)?.length ?? 0) >= 5) && /[0-9a-f]/i.test(all) ? '[ip]' : all);
  s = s.replace(MDNS, '[ip]');
  // (one line in the copy: newlines folded)
  s = s.replace(/\s*\n\s*/g, ' | ');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Repeats of a message count as the same when only its numbers differ. */
const dedupeKey = (k: DiagKind, m: string): string => `${k}|${m.replace(/\d+/g, '#')}`;
const lineBytes = (m: string): number => m.length + 24;

/**
 * The live session: adds lines (dedupe, burst cap, session cap) and says which blocks changed since the last write.
 * Pure: the caller passes the time.
 */
export class DiagBook {
  session: DiagSession;
  /** Errors / warnings / notes seen this session, by message (numbers ignored) -> their line. */
  private seen = new Map<string, DiagLine>();
  /** Which block each line is in (a repeat marks its block changed). */
  private chunkOf = new WeakMap<DiagLine, number>();
  private dirty = new Set<number>();
  private removed: number[] = [];
  private tokens = DIAG.burstPerSec;
  private refillAt = 0;
  private skipped = 0;

  constructor(now: number, tz: string, id?: string) {
    this.session = newSession(now, tz, id);
    this.dirty.add(0);
  }

  /** ms since the session started for an epoch time. */
  rel(now: number): number {
    return Math.max(0, now - this.session.started);
  }

  /** Add a line at epoch time `now` (already scrubbed). */
  add(now: number, k: DiagKind, m: string): void {
    const s = this.session;
    const t = this.rel(now);
    s.last = Math.max(s.last, now);
    if (k === 'err') s.stats.errors++;
    else if (k === 'warn') s.stats.warnings++;
    const chunk = s.chunks[s.chunks.length - 1]!;
    const prev = chunk.lines[chunk.lines.length - 1];
    // a repeat: counted on its first line (errors, warnings, notes any time; other lines when back to back)
    const key = k === 'err' || k === 'warn' || k === 'info' ? dedupeKey(k, m) : null;
    const same = key ? this.seen.get(key) : prev && prev.k === k && prev.m === m ? prev : undefined;
    if (same) {
      same.n = (same.n ?? 1) + 1;
      same.tl = t;
      this.markLine(same);
      return;
    }
    // the burst cap (refilled each second)
    const sec = Math.floor(t / 1000);
    if (sec !== this.refillAt) {
      this.refillAt = sec;
      this.tokens = DIAG.burstPerSec;
      if (this.skipped) {
        const n = this.skipped;
        this.skipped = 0;
        this.push(t, 'sys', `${n} more lines were skipped (too many at once)`);
      }
    }
    if (this.tokens <= 0) {
      this.skipped++;
      s.stats.suppressed++;
      return;
    }
    this.tokens--;
    const line = this.push(t, k, m);
    if (key) this.seen.set(key, line);
  }

  private push(t: number, k: DiagKind, m: string): DiagLine {
    const s = this.session;
    let chunk = s.chunks[s.chunks.length - 1]!;
    if (chunk.lines.length >= DIAG.chunkLines) {
      chunk = { id: chunk.id + 1, lines: [], bytes: 0 };
      s.chunks.push(chunk);
    }
    const line: DiagLine = { t, k, m };
    chunk.lines.push(line);
    this.chunkOf.set(line, chunk.id);
    chunk.bytes += lineBytes(m);
    this.dirty.add(chunk.id);
    this.capSession();
    return line;
  }

  /** The block holding `line` changed (a repeat counted on it). */
  private markLine(line: DiagLine): void {
    const id = this.chunkOf.get(line);
    if (id !== undefined) this.dirty.add(id);
  }

  /** Over the session cap: the oldest block after the first goes (the session's start stays). */
  private capSession(): void {
    const s = this.session;
    while (sessionBytes(s) > DIAG.sessionCapBytes && s.chunks.length > 2) {
      const [gone] = s.chunks.splice(1, 1);
      if (!gone) break;
      s.dropped += gone.lines.length;
      this.dirty.delete(gone.id);
      this.removed.push(gone.id);
      for (const l of gone.lines) {
        const key = dedupeKey(l.k, l.m);
        if (this.seen.get(key) === l) this.seen.delete(key);
      }
    }
  }

  /** The blocks changed since the last call and the block ids dropped (to write / delete), then clean. */
  takeDirty(): { chunks: DiagChunk[]; removed: number[] } {
    const chunks = this.session.chunks.filter((c) => this.dirty.has(c.id));
    const removed = this.removed;
    this.dirty.clear();
    this.removed = [];
    return { chunks, removed };
  }

  get isDirty(): boolean {
    return this.dirty.size > 0 || this.removed.length > 0;
  }

  /** Mark the session's meta for the next write (stats / facts changed without a new line). */
  touch(): void {
    this.dirty.add(this.session.chunks[this.session.chunks.length - 1]!.id);
  }

  /** Lines in the session now. */
  get lineCount(): number {
    let n = 0;
    for (const c of this.session.chunks) n += c.lines.length;
    return n;
  }
}

export function sessionBytes(s: DiagSession): number {
  let b = 400;
  for (const v of Object.values(s.facts)) b += v.length + 20;
  for (const c of s.chunks) b += c.bytes;
  return b;
}

// ---- performance sampling (allocation free per frame) ----

export interface PerfSample {
  frames: number;
  fps: number;
  /** The 1% low: the fps of the 99th-percentile frame. */
  low1Fps: number;
  worstMs: number;
  /** Frames over 50 ms. */
  long: number;
  /** The main thread's average work per frame (ms). */
  cpuMs: number;
}

/** Frame intervals between samples: `push` every frame (no allocation), `take` every few seconds. */
export class FramePerf {
  private readonly iv: Float32Array;
  private readonly scratch: Float32Array;
  private n = 0;
  private count = 0;
  private sum = 0;
  private cpu = 0;
  private max = 0;
  private long = 0;

  constructor(cap = 2400) {
    this.iv = new Float32Array(cap);
    this.scratch = new Float32Array(cap);
  }

  push(intervalMs: number, cpuMs: number): void {
    if (!(intervalMs > 0)) return;
    if (this.n < this.iv.length) this.iv[this.n++] = intervalMs;
    this.count++;
    this.sum += intervalMs;
    this.cpu += cpuMs;
    if (intervalMs > this.max) this.max = intervalMs;
    if (intervalMs > 50) this.long++;
  }

  reset(): void {
    this.n = this.count = this.sum = this.cpu = this.max = this.long = 0;
  }

  /** The sample since the last take (into `out`), then reset; false with no frames. */
  take(out: PerfSample): boolean {
    if (!this.count) return false;
    const n = this.n;
    const sorted = this.scratch.subarray(0, n);
    sorted.set(this.iv.subarray(0, n));
    sorted.sort();
    const p99 = sorted[Math.min(n - 1, Math.max(0, Math.ceil(0.99 * n) - 1))] ?? this.max;
    out.frames = this.count;
    out.fps = this.sum > 0 ? (1000 * this.count) / this.sum : 0;
    out.low1Fps = p99 > 0 ? 1000 / p99 : 0;
    out.worstMs = this.max;
    out.long = this.long;
    out.cpuMs = this.cpu / this.count;
    this.reset();
    return true;
  }
}

/** A performance sample's line, and the session's worst kept. */
export function perfLine(p: PerfSample, extra: string): string {
  return `${p.fps.toFixed(0)} fps avg, 1% low ${p.low1Fps.toFixed(0)}, worst frame ${p.worstMs.toFixed(0)} ms, ${p.long} over 50 ms, cpu ${p.cpuMs.toFixed(1)} ms/frame${extra ? `, ${extra}` : ''}`;
}

export function notePerf(st: DiagStats, p: PerfSample, where: string): void {
  if (st.low1Fps === 0 || p.low1Fps < st.low1Fps) {
    st.low1Fps = p.low1Fps;
    st.worstWhere = where;
  }
  if (p.worstMs > st.worstFrameMs) st.worstFrameMs = p.worstMs;
  st.longFrames += p.long;
}

/** "Windows, Edge 130" from a user agent (the full one is in the header too). */
export function shortDevice(ua: string): string {
  const os = /iPhone|iPod/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua) || (/Macintosh/.test(ua) && /Mobile\//.test(ua))
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Windows/.test(ua)
          ? 'Windows'
          : /CrOS/.test(ua)
            ? 'ChromeOS'
            : /Mac OS X|Macintosh/.test(ua)
              ? 'Mac'
              : /Linux/.test(ua)
                ? 'Linux'
                : 'unknown OS';
  const m = /Edg(?:A|iOS)?\/(\d+)/.exec(ua) ?? null;
  const pick = (re: RegExp, name: string): string | null => {
    const r = re.exec(ua);
    return r ? `${name} ${r[1]}` : null;
  };
  const browser = m
    ? `Edge ${m[1]}`
    : (pick(/OPR\/(\d+)/, 'Opera') ?? pick(/SamsungBrowser\/(\d+)/, 'Samsung Internet') ?? pick(/(?:Firefox|FxiOS)\/(\d+)/, 'Firefox') ?? pick(/(?:Chrome|CriOS)\/(\d+)/, 'Chrome') ?? pick(/Version\/(\d+(?:\.\d+)?).*Safari/, 'Safari') ?? 'unknown browser');
  return `${os}, ${browser}`;
}

/** The settings tokens ("key=value", as `settingsDigest` writes them) that are new in `next`: what a change set. */
export function digestDiff(prev: string, next: string): string {
  const before = new Set(prev.split(' '));
  return next
    .split(' ')
    .filter((t) => t && !before.has(t))
    .join(' ');
}

// ---- stored data read back (untrusted) ----

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const str = (v: unknown, max = DIAG.maxLineChars): string => (typeof v === 'string' ? v.slice(0, max) : '');

export function sanitizeStats(raw: unknown): DiagStats {
  const s = emptyStats();
  if (!isObj(raw)) return s;
  for (const k of ['errors', 'warnings', 'matches', 'low1Fps', 'worstFrameMs', 'longFrames', 'attempts', 'attemptsOk', 'relay', 'suppressed'] as const) s[k] = Math.max(0, num(raw[k]));
  s.worstWhere = str(raw.worstWhere, 80);
  s.lastLink = str(raw.lastLink, 120);
  s.fails = Array.isArray(raw.fails) ? raw.fails.filter((f): f is string => typeof f === 'string').slice(0, 20).map((f) => f.slice(0, 60)) : [];
  return s;
}

export function sanitizeLines(raw: unknown): DiagLine[] {
  if (!Array.isArray(raw)) return [];
  const out: DiagLine[] = [];
  for (const r of raw) {
    if (!isObj(r) || typeof r.m !== 'string' || !DIAG_KINDS.includes(r.k as DiagKind)) continue;
    const l: DiagLine = { t: Math.max(0, num(r.t)), k: r.k as DiagKind, m: r.m.slice(0, DIAG.maxLineChars) };
    if (typeof r.n === 'number' && r.n > 1) {
      l.n = Math.floor(r.n);
      l.tl = Math.max(0, num(r.tl, l.t));
    }
    out.push(l);
    if (out.length >= DIAG.chunkLines * 2) break;
  }
  return out;
}

/** A stored session's meta (without its lines): what the index keeps. */
export interface DiagMeta {
  id: string;
  started: number;
  last: number;
  tz: string;
  facts: Record<string, string>;
  stats: DiagStats;
  dropped: number;
  chunkIds: number[];
  bytes: number;
}

export function metaOf(s: DiagSession): DiagMeta {
  return { id: s.id, started: s.started, last: s.last, tz: s.tz, facts: { ...s.facts }, stats: { ...s.stats, fails: [...s.stats.fails] }, dropped: s.dropped, chunkIds: s.chunks.map((c) => c.id), bytes: sessionBytes(s) };
}

export function sanitizeMeta(raw: unknown): DiagMeta | null {
  if (!isObj(raw) || typeof raw.id !== 'string' || !/^[\w-]{1,40}$/.test(raw.id) || typeof raw.started !== 'number') return null;
  const facts: Record<string, string> = {};
  if (isObj(raw.facts)) for (const [k, v] of Object.entries(raw.facts)) if (typeof v === 'string') facts[k.slice(0, 40)] = v.slice(0, DIAG.maxLineChars);
  const ids = Array.isArray(raw.chunkIds) ? raw.chunkIds.filter((c): c is number => typeof c === 'number' && Number.isInteger(c) && c >= 0).slice(0, 200) : [];
  return { id: raw.id, started: raw.started, last: num(raw.last, raw.started), tz: str(raw.tz, 60), facts, stats: sanitizeStats(raw.stats), dropped: Math.max(0, num(raw.dropped)), chunkIds: ids, bytes: Math.max(0, num(raw.bytes)) };
}

/**
 * Which stored sessions stay (newest first) when a new one starts: at most `maxSessions - 1`, and together no more
 * than the store cap less one full session (room for the new one).
 */
export function rotate(old: readonly DiagMeta[], maxSessions = DIAG.maxSessions, capBytes = DIAG.storeCapBytes, reserve = DIAG.sessionCapBytes): { keep: DiagMeta[]; drop: DiagMeta[] } {
  const sorted = [...old].sort((a, b) => b.started - a.started);
  const keep: DiagMeta[] = [];
  const drop: DiagMeta[] = [];
  let bytes = 0;
  for (const m of sorted) {
    if (keep.length < maxSessions - 1 && bytes + m.bytes <= capBytes - reserve) {
      keep.push(m);
      bytes += m.bytes;
    } else drop.push(m);
  }
  return { keep, drop };
}

// ---- the copied text ----

const pad2 = (n: number): string => String(n).padStart(2, '0');
/** "2026-11-02 14:03:09" in local time. */
export function clock(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/** "23 min 10 s", "1 h 02 min", "12 s". */
export function span(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${pad2(s % 60)} s`;
  return `${Math.floor(s / 3600)} h ${pad2(Math.floor((s % 3600) / 60))} min`;
}

const secs = (t: number): string => `${(t / 1000).toFixed(1)}s`.padStart(8);

export function lineText(l: DiagLine): string {
  return `${secs(l.t)} ${TAG[l.k]} ${l.m}${l.n ? ` (x${l.n}, last at ${(l.tl! / 1000).toFixed(1)}s)` : ''}`;
}

function statsLine(m: { started: number; last: number; stats: DiagStats }): string {
  const s = m.stats;
  const parts = [`${span(m.last - m.started)}`, `${s.errors} error${s.errors === 1 ? '' : 's'}`, `${s.warnings} warning${s.warnings === 1 ? '' : 's'}`, `${s.matches} match${s.matches === 1 ? '' : 'es'}`];
  if (s.low1Fps) parts.push(`worst 1% low ${s.low1Fps.toFixed(0)} fps`);
  if (s.attempts) parts.push(`${s.attempts} co-op connection${s.attempts === 1 ? '' : 's'} (${s.attempts - s.attemptsOk} failed)`);
  return parts.join(', ');
}

function perfSummary(s: DiagStats): string {
  if (!s.low1Fps && !s.worstFrameMs) return 'no match measured yet';
  return `worst 1% low ${s.low1Fps.toFixed(0)} fps${s.worstWhere ? ` (${s.worstWhere})` : ''}, longest frame ${s.worstFrameMs.toFixed(0)} ms, ${s.longFrames} frames over 50 ms`;
}

function netSummary(s: DiagStats): string {
  if (!s.attempts && !s.lastLink) return 'no co-op this session';
  const direct = s.attemptsOk - s.relay;
  const fails = s.fails.length ? ` (${[...new Set(s.fails)].join(', ')})` : '';
  return `${s.attempts} attempt${s.attempts === 1 ? '' : 's'}: ${direct} direct, ${s.relay} via relay, ${s.attempts - s.attemptsOk} failed${fails}${s.lastLink ? `; last readout: ${s.lastLink}` : ''}`;
}

/** The fact keys the summary shows first (the rest are in the session's header). */
const SUMMARY_FACTS = ['Game', 'Device', 'Screen', 'GPU', 'Graphics', 'Last session'];

export interface DiagTextOpts {
  now: number;
  cap?: number;
  /** Older sessions whose lines are not loaded (yet): listed by their meta only. */
  unloaded?: readonly DiagMeta[];
}

/**
 * The text to paste: a short summary (version, device, session length, errors, worst performance, connection
 * results), this session's header and lines, then the older sessions (newest first). Over the cap it trims, saying what:
 * first the older sessions' performance / menu / note lines, then their other lines, then this session's oldest lines
 * after its start (`keepFirst`).
 */
export function diagText(sessions: readonly DiagSession[], o: DiagTextOpts): string {
  const cap = o.cap ?? DIAG.copyCapChars;
  const cur = sessions[0];
  const older = sessions.slice(1);
  const unloaded = o.unloaded ?? [];
  if (!cur) return 'Night Shift diagnostics log: empty.';
  const all = (s: DiagSession): DiagLine[] => s.chunks.flatMap((c) => c.lines);
  const curLines = all(cur).map(lineText);
  const oldLines = older.map((s) => all(s));
  const head = (s: DiagSession | DiagMeta, label: string): string[] => [
    '',
    `=== ${label}: started ${clock(s.started)} (${s.tz || 'local time'}), ${statsLine(s)} ===`,
    ...Object.entries(s.facts).map(([k, v]) => `  ${k}: ${v}`),
    ...(s.dropped ? [`  (${s.dropped} older lines of this session were dropped on the device to keep it small)`] : []),
  ];
  // older sessions at a trim level: 0 all, 1 no perf / menu / note lines, 2 errors and warnings only, 3 none
  const keepAt = (lvl: number, l: DiagLine): boolean => lvl === 0 || (lvl === 1 ? l.k !== 'perf' && l.k !== 'ui' && l.k !== 'info' : lvl === 2 ? l.k === 'err' || l.k === 'warn' : false);
  const olderText = (lvl: number): { text: string[]; cut: number } => {
    const text: string[] = [];
    let cut = 0;
    older.forEach((s, i) => {
      text.push(...head(s, `Older session ${i + 2}`));
      const lines = oldLines[i]!;
      const kept = lines.filter((l) => keepAt(lvl, l));
      cut += lines.length - kept.length;
      text.push(...kept.map(lineText));
      if (lines.length !== kept.length) text.push(`  (${lines.length - kept.length} of its lines left out to fit)`);
    });
    for (const m of unloaded) text.push(...head(m, 'Older session (lines not loaded)'));
    return { text, cut };
  };
  const size = (a: readonly string[]): number => a.reduce((n, s) => n + s.length + 1, 0);
  const summary = (trim: string): string[] => {
    const f = cur.facts;
    const out = [
      '=== Night Shift diagnostics log - paste all of this to Claude ===',
      `Copied ${clock(o.now)} (${zoneLabel(new Date(o.now))}).`,
      '',
      '--- Summary ---',
      ...SUMMARY_FACTS.filter((k) => f[k]).map((k) => `${k}: ${f[k]}`),
      `This session: started ${clock(cur.started)}, running ${span(o.now - cur.started)}, ${cur.stats.errors} errors, ${cur.stats.warnings} warnings, ${cur.stats.matches} matches${cur.stats.suppressed ? `, ${cur.stats.suppressed} lines skipped in bursts` : ''}`,
      `Performance: ${perfSummary(cur.stats)}`,
      `Connection: ${netSummary(cur.stats)}`,
      `Older sessions on this device: ${older.length + unloaded.length}${[...older, ...unloaded].length ? ` (${[...older, ...unloaded].map((s) => `${clock(s.started).slice(5, 16)}: ${s.stats.errors} errors`).join('; ')})` : ''}`,
      `Trimmed to fit: ${trim}`,
    ];
    return out;
  };
  const curHead = head(cur, 'This session');
  // pick the lightest trim that fits
  const SUMMARY_ROOM = 2500;
  let lvl = 0;
  let old = olderText(0);
  while (lvl < 3 && SUMMARY_ROOM + size(curHead) + size(curLines) + size(old.text) > cap) {
    lvl++;
    old = olderText(lvl);
  }
  let body = curLines;
  let curCut = 0;
  const room = cap - SUMMARY_ROOM - size(curHead) - size(old.text);
  if (size(body) > room) {
    const first = body.slice(0, DIAG.keepFirst);
    const rest = body.slice(DIAG.keepFirst);
    let n = size(first) + 80;
    let i = rest.length;
    while (i > 0 && n + rest[i - 1]!.length + 1 <= room) n += rest[--i]!.length + 1;
    curCut = i;
    body = [...first, `  ... ${i} lines from this session's middle left out to fit ...`, ...rest.slice(i)];
  }
  const trims: string[] = [];
  if (lvl === 1) trims.push(`older sessions' performance, menu and note lines (${old.cut} lines)`);
  if (lvl === 2) trims.push(`older sessions' lines except errors and warnings (${old.cut} lines)`);
  if (lvl === 3) trims.push(`all older sessions' lines (${old.cut} lines; their summaries stay)`);
  if (curCut) trims.push(`${curCut} of this session's older lines`);
  return [...summary(trims.length ? trims.join('; ') : 'nothing'), ...curHead, ...body, ...old.text, '', '=== end of log ==='].join('\n');
}
