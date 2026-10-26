// The run verdict of scripts/run-e2e.mjs (pure, no I/O): which failed suites fail the run, which print KNOWN FLAKY,
// and the REPORT ONLY list a named run takes from `E2E_REPORT` (the laptop queue's report suites).
//
// (J20 T8, BRIEF A3) A quarantine forgives an assert, never a hang: a quarantined suite's failure is KNOWN FLAKY only
// when it exited with code 1. A timeout (124, the runner's KILLED), a signal kill (null) or any other exit code fails
// the run as before the quarantine existed. Undo: make `flakyFail` return `quarantined(s)` alone.

/** The forgiven failure: the suite is quarantined and exited with code 1 (an assert). */
export const flakyFail = (r, quarantined) => r.code === 1 && Boolean(quarantined(r.s));

/**
 * results = [{ s, code, sec }]; report(s) = REPORT ONLY (never fails), quarantined(s) = an active quarantine entry.
 * Returns { failed, flakyFailed }: the non-report failures that fail the run, and those forgiven as KNOWN FLAKY.
 */
export function classify(results, { report, quarantined }) {
  const bad = results.filter((r) => r.code !== 0 && !report(r.s));
  return { failed: bad.filter((r) => !flakyFail(r, quarantined)), flakyFailed: bad.filter((r) => flakyFail(r, quarantined)) };
}

/** A suite's word in the runner's times block (the format laptop-queue lib `parseRun` reads): ok | FAIL | FAIL (KNOWN FLAKY) | REPORT ONLY (exit N). */
export function status(r, { report, quarantined }) {
  if (report(r.s)) return `REPORT ONLY (exit ${r.code})`;
  if (r.code === 0) return 'ok';
  return flakyFail(r, quarantined) ? 'FAIL (KNOWN FLAKY)' : 'FAIL';
}

/** `E2E_REPORT` (a space or comma separated suite list; a whole suite or a part token) as a Set. */
export function reportSet(env) {
  return new Set(String(env?.E2E_REPORT ?? '').split(/[\s,]+/).filter(Boolean));
}

/** True when `s` is in the report set, by itself or by its whole suite (`e2e-wall:flanker` matches `e2e-wall`). */
export const isReport = (s, set) => set.has(s) || set.has(s.split(':')[0]);
