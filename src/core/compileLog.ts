/**
 * (map-ready S14) The compile log: each shader program a load compiles, its kind (body, guard, level, lit, post, other),
 * when it was first seen and when it became ready (ms from the S1 `world` step), and how many were compiling at once.
 * It reads only: nothing here changes a load. `GameState` feeds it from `engine._compiledEffects` while the load and S1's
 * after-window run, and exposes the record as `window.__compileLog` (`scripts/map-ready-measure.mjs` keeps it); `summary`
 * goes into the feedback note (`compiles`). `order` and `groups` are S14's compile order (`src/game/compileOrder.ts`).
 * Pure: no Babylon, no DOM.
 */

export type ShaderKind = 'body' | 'guard' | 'level' | 'lit' | 'post' | 'other';

export interface CompileEntry {
  /** The cache key, cut to `KEY_MAX` chars. */
  key: string;
  kind: ShaderKind;
  /** Count of `#define` lines. */
  defines: number;
  /** The final fragment source's length when known, else -1. */
  fragChars: number;
  /** First seen, ms from t0 (a key not ready at t0: 0, `early` true). */
  startMs: number;
  /** -1 while pending. */
  readyMs: number;
  /** `readyMs - startMs`, -1 while pending. */
  ms: number;
  /** Entries pending when this one was first seen (itself excluded). */
  inFlight: number;
  early: boolean;
  /** A compile error, or Babylon's fallback gave up. */
  failed: boolean;
}

export interface CompileLogRecord {
  entries: CompileEntry[];
  peakInFlight: number;
  pending: number;
  done: boolean;
  /** Compile group -> its start, ms from t0 (S14's order). */
  groups: Record<string, number>;
  order: 'parallel' | 'serial';
}

/** The logged key's length (the cache key is the whole shader source and its defines). */
export const KEY_MAX = 200;

/** A whole define name on its own `#define` line (`#define SMOOTHBODY`, never `MY_SMOOTHBODY_X` or `SMOOTHBODY_X`). */
const defineRe = (name: string): RegExp => new RegExp(`(?:^|\\n)[ \\t]*#define[ \\t]+${name}(?![A-Za-z0-9_])`);
const BODY = defineRe('SMOOTHBODY');
const GUARD = defineRe('GUARDFIG');
const LEVEL = defineRe('(?:LEVELSHADING|SURFACES)');
const LIT = defineRe('BAKED_LAMPS');

/** From the effect's shader name and defines string: SMOOTHBODY -> body, GUARDFIG -> guard, LEVELSHADING or SURFACES ->
 *  level, BAKED_LAMPS (any other lit material) -> lit, a name other than 'pbr' / 'default' -> post, else other. */
export function shaderKindOf(name: string, defines: string): ShaderKind {
  if (BODY.test(defines)) return 'body';
  if (GUARD.test(defines)) return 'guard';
  if (LEVEL.test(defines)) return 'level';
  if (LIT.test(defines)) return 'lit';
  if (name && name !== 'pbr' && name !== 'default') return 'post';
  return 'other';
}

/** `#define` lines in a defines string (no allocation). */
function defineCount(defines: string): number {
  let n = 0;
  for (let i = defines.indexOf('#define'); i >= 0; i = defines.indexOf('#define', i + 7)) n++;
  return n;
}

export class CompileLog {
  readonly record: CompileLogRecord;
  private readonly t0: number;
  private readonly knownKeys = new Set<string>();
  private readonly byKey = new Map<string, CompileEntry>();

  constructor(t0: number, order: 'parallel' | 'serial') {
    this.t0 = t0;
    this.record = { entries: [], peakInFlight: 0, pending: 0, done: false, groups: {}, order };
  }

  /** Keys compiled before t0 (already ready) are known, never logged. */
  known(key: string): void {
    if (!this.byKey.has(key)) this.knownKeys.add(key);
  }

  /** A program first seen at `now` (`early`: not ready at t0, logged from 0). A second call, a known key or a finished
   *  log: ignored. */
  seen(key: string, name: string, defines: string, now: number, early = false): void {
    const r = this.record;
    if (r.done || this.knownKeys.has(key) || this.byKey.has(key)) return;
    const e: CompileEntry = {
      key: key.length > KEY_MAX ? key.slice(0, KEY_MAX) : key,
      kind: shaderKindOf(name, defines),
      defines: defineCount(defines),
      fragChars: -1,
      startMs: early ? 0 : now - this.t0,
      readyMs: -1,
      ms: -1,
      inFlight: r.pending,
      early,
      failed: false,
    };
    this.byKey.set(key, e);
    r.entries.push(e);
    r.pending++;
    if (r.pending > r.peakInFlight) r.peakInFlight = r.pending;
  }

  /** The program is ready (or `failed`) at `now`. An unknown or already ready key, or a finished log: ignored. */
  ready(key: string, now: number, fragChars: number, failed: boolean): void {
    const r = this.record;
    const e = this.byKey.get(key);
    if (r.done || !e || e.readyMs >= 0) return;
    e.readyMs = Math.max(e.startMs, now - this.t0);
    e.ms = e.readyMs - e.startMs;
    e.fragChars = fragChars;
    e.failed = failed;
    r.pending--;
  }

  /** Compile group `name` started at `now` (the first call per name is kept). */
  group(name: string, now: number): void {
    const g = this.record.groups;
    if (!(name in g)) g[name] = now - this.t0;
  }

  /** The log is closed: entries still pending keep -1. */
  finish(): void {
    this.record.done = true;
  }

  /** The `n` longest compiles, longest first; pending ones last. */
  top(n: number): CompileEntry[] {
    const done = this.record.entries.filter((e) => e.readyMs >= 0).sort((a, b) => b.ms - a.ms);
    const pending = this.record.entries.filter((e) => e.readyMs < 0);
    return [...done, ...pending].slice(0, n);
  }

  /** e.g. "12 programs, peak 6 at once, longest body 31.2 s, sum 74.0 s over 33.5 s" (sum / span: how much they overlapped);
   *  ", 2 pending at 40.1 s" while some are. */
  summary(now: number): string {
    const r = this.record;
    let sum = 0;
    let first = Infinity;
    let last = -Infinity;
    let longest: CompileEntry | null = null;
    for (const e of r.entries) {
      if (e.readyMs < 0) continue;
      sum += e.ms;
      if (e.startMs < first) first = e.startMs;
      if (e.readyMs > last) last = e.readyMs;
      if (!longest || e.ms > longest.ms) longest = e;
    }
    const s = (ms: number): string => (ms / 1000).toFixed(1);
    let out = `${r.entries.length} programs, peak ${r.peakInFlight} at once`;
    out += longest ? `, longest ${longest.kind} ${s(longest.ms)} s, sum ${s(sum)} s over ${s(last - first)} s` : ', none finished';
    if (r.pending > 0) out += `, ${r.pending} pending at ${s(now - this.t0)} s`;
    return out;
  }
}
