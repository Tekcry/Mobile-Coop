import { dbGet, dbPut } from '../save/db';
import { JOIN_FAILURES, type JoinFailure } from './linkStatus';
import { diag } from '../feedback/diag';

/**
 * (co-op relay fix) The connection attempt log: one line per co-op connection (method, time to connect, failure
 * reason), kept on this device only, in IndexedDB (`kv` `coop:attempts`, newest first, `MAX_ATTEMPTS`), so failures can
 * be counted. Shown under Co-op > Connection log. Diagnostics, not a save: a failed read or write loses nothing else.
 */
export const ATTEMPTS_KEY = 'coop:attempts';
export const MAX_ATTEMPTS = 50;

export type AttemptMethod = 'direct' | 'relay' | 'local' | 'none';

export interface AttemptRecord {
  /** When it ended (ms since the epoch). */
  at: number;
  role: 'host' | 'client';
  /** How it connected ('none': it did not). */
  method: AttemptMethod;
  /** Joiner: ms from opening the room to the partner connected (null: the host, which does not know when the joiner
   *  began, or a failure). */
  ms: number | null;
  /** 'ok', or why it failed. */
  result: 'ok' | JoinFailure;
}

const METHODS: readonly AttemptMethod[] = ['direct', 'relay', 'local', 'none'];

/** Everything read back is untrusted (an old or edited store): bad entries drop, the cap holds. */
export function sanitizeAttempts(raw: unknown): AttemptRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: AttemptRecord[] = [];
  for (const r of raw) {
    if (typeof r !== 'object' || r === null) continue;
    const o = r as Record<string, unknown>;
    const at = typeof o.at === 'number' && Number.isFinite(o.at) ? o.at : null;
    const role = o.role === 'host' || o.role === 'client' ? o.role : null;
    const method = METHODS.find((m) => m === o.method);
    const ms = typeof o.ms === 'number' && Number.isFinite(o.ms) && o.ms >= 0 ? Math.round(o.ms) : null;
    const result = o.result === 'ok' ? 'ok' : JOIN_FAILURES.find((f) => f === o.result);
    if (at === null || !role || !method || !result) continue;
    out.push({ at, role, method, ms, result });
    if (out.length >= MAX_ATTEMPTS) break;
  }
  return out;
}

/** The list with `rec` first, capped. */
export function addAttempt(list: readonly AttemptRecord[], rec: AttemptRecord): AttemptRecord[] {
  return [rec, ...list].slice(0, MAX_ATTEMPTS);
}

/** "12 attempts: 8 direct, 3 via relay, 1 failed" (the counts a tester reports). */
export function attemptSummary(list: readonly AttemptRecord[]): string {
  if (!list.length) return 'No connection attempts yet';
  let direct = 0;
  let relay = 0;
  let local = 0;
  let failed = 0;
  for (const r of list) {
    if (r.result !== 'ok') failed++;
    else if (r.method === 'relay') relay++;
    else if (r.method === 'local') local++;
    else direct++;
  }
  const parts = [`${direct} direct`, `${relay} via relay`, ...(local ? [`${local} same device`] : []), `${failed} failed`];
  return `${list.length} attempt${list.length === 1 ? '' : 's'}: ${parts.join(', ')}`;
}

const FAIL_WORDS: Readonly<Record<JoinFailure, string>> = {
  unreachable: 'no network path',
  timeout: 'no answer',
  version: 'different versions',
  full: 'room full',
  signalling: 'setup failed',
  other: 'failed',
};

/** One row: "Joined - via relay, 3.2 s" / "Hosted - direct" / "Join failed - no network path". */
export function attemptLine(r: AttemptRecord): string {
  const who = r.role === 'host' ? 'Hosted' : 'Joined';
  if (r.result !== 'ok') return `${r.role === 'host' ? 'Host' : 'Join'} failed - ${FAIL_WORDS[r.result]}`;
  const how = r.method === 'relay' ? 'via relay' : r.method === 'local' ? 'same device' : r.method === 'direct' ? 'direct' : 'unknown';
  return r.ms === null ? `${who} - ${how}` : `${who} - ${how}, ${(r.ms / 1000).toFixed(1)} s`;
}

/** The list as last written (newest first), loaded once: the load's promise is cached, so two early callers share one
 *  read and an attempt logged while it runs is never lost. */
let loading: Promise<AttemptRecord[]> | null = null;
/** Writes run one after another (each reads the list the one before it left). */
let queue: Promise<void> = Promise.resolve();

export function loadAttempts(): Promise<AttemptRecord[]> {
  loading ??= dbGet('kv', ATTEMPTS_KEY).then(
    (raw) => sanitizeAttempts(raw),
    () => [] as AttemptRecord[],
  );
  return loading;
}

/**
 * Add one attempt (and say it in the console: no relay login, only the method, time and reason). `replaces`: an earlier
 * record of the same attempt (an `ok` line, then the join was refused) that this one takes the place of.
 */
export function logAttempt(rec: AttemptRecord, replaces: AttemptRecord | null = null): Promise<void> {
  console.info(`co-op connection: ${attemptLine(rec)}${replaces ? ' (in place of the earlier line)' : ''}`);
  // (diagnostics log) counted for its summary (a failure that replaces an `ok` line takes that success back)
  if (replaces?.result === 'ok') {
    const st = diag.session.stats;
    st.attemptsOk = Math.max(0, st.attemptsOk - 1);
    if (replaces.method === 'relay') st.relay = Math.max(0, st.relay - 1);
    st.attempts = Math.max(0, st.attempts - 1);
  }
  diag.attempt(rec.result === 'ok', rec.method === 'relay', rec.result === 'ok' ? '' : FAIL_WORDS[rec.result], `${rec.role}: ${attemptLine(rec)}`);
  queue = queue.then(async () => {
    const list = await loadAttempts();
    const i = replaces ? list.indexOf(replaces) : -1;
    const next = i >= 0 ? list.map((r, k) => (k === i ? rec : r)) : addAttempt(list, rec);
    loading = Promise.resolve(next);
    try {
      await dbPut('kv', ATTEMPTS_KEY, next);
    } catch {
      // (storage blocked: the log lives for this session only)
    }
  });
  return queue;
}

/** For tests: forget the cached list. */
export function resetAttemptCache(): void {
  loading = null;
  queue = Promise.resolve();
}