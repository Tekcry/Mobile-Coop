// Narrow `git fetch origin` with a retry on ref-lock races (merge-train.mjs, auto-train.mjs). Orchestrator waste audit
// 2026-10-24 23:30:50: a merge-train release failed with "cannot lock ref" because another worktree of the same
// repository fetched at the same moment (worktrees share refs/remotes). A narrow fetch touches fewer refs and the
// retry rides out the other fetch. Pure parts are exported for tests/mergeTrain.test.ts.

/** stderr of a git fetch that lost a ref-lock race with another fetch (worth a retry). */
export const FETCH_LOCK_RE = /cannot lock ref|unable to (update|create) .*lock|\.lock': File exists/i;

/** At most this many tries per fetch. */
export const FETCH_TRIES = 5;

/** True when a failed fetch (stderr `err`, `tries` made so far) should be retried: a lock race and tries left. */
export const shouldRetryFetch = (err, tries, max = FETCH_TRIES) => tries < max && FETCH_LOCK_RE.test(String(err ?? ''));

/** Wait before try `tries + 1`: 2 s, 3 s, 4 s, then 5 s. */
export const fetchBackoffMs = (tries) => Math.min(5000, 1000 + 1000 * Math.max(1, tries));

/** origin branch names (globs like `train/*` allowed) -> forced refspecs into refs/remotes/origin/. */
export const fetchRefspecs = (branches) => branches.map((b) => `+refs/heads/${b}:refs/remotes/origin/${b}`);

/** A missing remote branch: the whole fetch fails with this. */
export const MISSING_REF_RE = /couldn't find remote ref/i;

const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/**
 * `git fetch -q origin <refspecs>` through exec (argv -> { status, out, err }, never throws), retried on a lock race
 * (shouldRetryFetch / fetchBackoffMs). Returns the last { status, out, err, tries }. wait and log are injectable.
 */
export function fetchWithRetry(exec, branches, { wait = sleepSync, log = (l) => console.warn(l) } = {}) {
  let tries = 0;
  for (;;) {
    const r = exec(['git', 'fetch', '-q', 'origin', ...fetchRefspecs(branches)]);
    tries++;
    if (r.status === 0 || !shouldRetryFetch(r.err, tries)) return { ...r, tries };
    const ms = fetchBackoffMs(tries);
    log(`git fetch hit a ref lock (try ${tries}/${FETCH_TRIES}), retrying in ${ms / 1000} s: ${String(r.err).trim().split('\n').pop()}`);
    wait(ms);
  }
}

/**
 * Fetches the `required` branches (must exist on origin) and the `optional` ones (skipped when origin has no such
 * branch: the caller reports it, as with a full fetch). Throws on any other failure. Returns the optional branches
 * origin does not have (a stale origin/<b> from an earlier fetch stays, as before).
 */
export function fetchOrigin(exec, required, optional = [], opts = {}) {
  const fail = (r) => new Error(`git fetch origin failed (${r.status}, ${r.tries} tries): ${String(r.err || r.out).trim().slice(-2000)}`);
  const all = fetchWithRetry(exec, [...required, ...optional], opts);
  if (all.status === 0) return [];
  if (!optional.length || !MISSING_REF_RE.test(String(all.err))) throw fail(all);
  if (required.length) {
    const req = fetchWithRetry(exec, required, opts);
    if (req.status !== 0) throw fail(req);
  }
  const missing = [];
  for (const b of optional) {
    const r = fetchWithRetry(exec, [b], opts);
    if (r.status === 0) continue;
    if (MISSING_REF_RE.test(String(r.err))) missing.push(b);
    else throw fail(r);
  }
  return missing;
}
