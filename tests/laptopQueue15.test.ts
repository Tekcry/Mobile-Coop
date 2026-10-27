import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs process script without types
import { mergeRecheck, recordMergeable, withMergeable, conflictRetire, prBoard } from '../scripts/laptop-queue/lib.mjs';
// @ts-expect-error plain .mjs process script without types
import { ciRunStartedAt, typicalCiMin, holdForChecks, CHECK_WAIT_CAP_MIN, CHECK_WAIT_MARGIN_MIN } from '../scripts/auto-train.mjs';

const MIN = 60_000;
const T0 = Date.parse('2026-10-26T07:54:00Z');
const req = (id: string, pr: number, sha: string, set = 'affected') => ({ id, pr, sha, set, kind: 'pr' });
const boardOf = (rows: Array<{ number: number; headRefOid: string; mergeable?: string }>) => prBoard(rows);

describe('laptop-queue-15 F51: re-check open requests for conflicts when master moves', () => {
  const requests = [req('r581', 581, 'aaa'), req('r590', 590, 'bbb'), req('named', 600, 'ccc', 'smoke'), req('r581b', 581, 'aaa')];
  const board = boardOf([{ number: 581, headRefOid: 'aaa', mergeable: 'UNKNOWN' }, { number: 590, headRefOid: 'bbb', mergeable: 'UNKNOWN' }, { number: 600, headRefOid: 'ccc' }]);

  it('a master move makes each open affected request PR due once (named-suite requests and repeats skipped)', () => {
    const r = mergeRecheck(null, { master: 'm1', requests, board, now: T0 });
    expect(r.state).toEqual({ master: 'm1', since: T0, prs: {} });
    expect(r.due).toEqual([{ pr: 581, head: 'aaa' }, { pr: 590, head: 'bbb' }]);
  });

  it('a known read is not due again; UNKNOWN is re-read after retryMs until maxMs after the move', () => {
    let s = mergeRecheck(null, { master: 'm1', requests, board, now: T0 }).state;
    s = recordMergeable(s, 581, 'aaa', 'MERGEABLE', T0);
    s = recordMergeable(s, 590, 'bbb', 'UNKNOWN', T0);
    expect(mergeRecheck(s, { master: 'm1', requests, board, now: T0 + 30_000 }).due).toEqual([]);
    expect(mergeRecheck(s, { master: 'm1', requests, board, now: T0 + MIN }).due).toEqual([{ pr: 590, head: 'bbb' }]);
    expect(mergeRecheck(s, { master: 'm1', requests, board, now: T0 + 11 * MIN }).due).toEqual([]);
    // the next master move starts over (the MERGEABLE PR can conflict with the new master)
    const next = mergeRecheck(s, { master: 'm2', requests, board, now: T0 + 20 * MIN });
    expect(next.state.since).toBe(T0 + 20 * MIN);
    expect(next.due.map((d: { pr: number }) => d.pr)).toEqual([581, 590]);
  });

  it('no master, a moved board head, a board CONFLICTING head and the per-pass cap keep PRs out', () => {
    expect(mergeRecheck(null, { master: '', requests, board, now: T0 }).due).toEqual([]);
    const moved = boardOf([{ number: 581, headRefOid: 'new', mergeable: 'UNKNOWN' }, { number: 590, headRefOid: 'bbb', mergeable: 'CONFLICTING' }]);
    expect(mergeRecheck(null, { master: 'm1', requests, board: moved, now: T0 }).due).toEqual([]);
    expect(mergeRecheck(null, { master: 'm1', requests, board, now: T0, max: 1 }).due).toEqual([{ pr: 581, head: 'aaa' }]);
  });

  it('a CONFLICTING read on the board head retires the request through conflictRetire; UNKNOWN and other heads do not', () => {
    let s = mergeRecheck(null, { master: 'm1', requests, board, now: T0 }).state;
    expect(conflictRetire(requests, withMergeable(board, s))).toEqual([]);
    s = recordMergeable(s, 590, 'bbb', 'conflicting', T0);
    s = recordMergeable(s, 581, 'old', 'CONFLICTING', T0);
    const b = withMergeable(board, s);
    expect(b).not.toBe(board);
    expect(b.get(590).conflicting).toBe(true);
    expect(b.get(581).conflicting).toBe(false);
    expect(board.get(590).conflicting).toBe(false);
    expect(conflictRetire(requests, b)).toEqual(['r590']);
    expect(recordMergeable(s, 600, 'ccc', undefined, T0).prs[600].mergeable).toBe('UNKNOWN');
  });
});

describe('laptop-queue-15 F50: auto-train holds a running check to its expected CI finish', () => {
  const iso = (ms: number) => new Date(ms).toISOString();
  const run = (name: string, start: number, end: number | null, conclusion = 'SUCCESS') => ({ __typename: 'CheckRun', name, startedAt: iso(start), ...(end == null ? { status: 'IN_PROGRESS' } : { status: 'COMPLETED', conclusion, completedAt: iso(end) }) });
  const greenPr = (n: number, min: number) => ({ number: n, statusCheckRollup: [run('lint', T0, T0 + MIN), run('test', T0 + 5_000, T0 + 9 * MIN), run('check', T0 + min * MIN - 10_000, T0 + min * MIN)] });

  it('ciRunStartedAt: the earliest start of check and its sibling jobs; null without one', () => {
    expect(ciRunStartedAt([run('test', T0 + 5_000, null), run('lint', T0, T0 + MIN), { __typename: 'StatusContext', context: 'checker', startedAt: iso(T0 - MIN) }])).toBe(T0);
    expect(ciRunStartedAt([{ __typename: 'CheckRun', name: 'other', startedAt: iso(T0) }])).toBeNull();
    expect(ciRunStartedAt(undefined)).toBeNull();
  });

  it('typicalCiMin: the median of the open PRs\' green check times, null under 3 samples or out-of-range runs only', () => {
    expect(typicalCiMin([greenPr(1, 12.5), greenPr(2, 13.5), greenPr(3, 13), greenPr(4, 90), { number: 5 }])).toBe(13);
    expect(typicalCiMin([greenPr(1, 12), greenPr(2, 14), greenPr(3, 13), greenPr(6, 15)])).toBe(13.5);
    expect(typicalCiMin([greenPr(1, 12.5), greenPr(2, 13.5)])).toBeNull();
    expect(typicalCiMin([greenPr(1, 0.5), greenPr(2, 0.5), greenPr(3, 0.5)])).toBeNull();
  });

  it('holdForChecks: train 131 / #591 holds to CI start + typical + margin, not the flat 3 min', () => {
    // #591's CI ran ~07:46:30-07:59:59; first seen waiting at 07:54:43; typical 13 + margin 2 -> hold to 08:01:30
    const start = Date.parse('2026-10-26T07:46:30Z');
    const seen = Date.parse('2026-10-26T07:54:43Z');
    const w = [{ pr: 591, branch: 'feature/x', head: 'h591', why: 'check running', ciStartedAt: start }];
    const opts = { typicalMin: 13, marginMin: 2, capMin: 20 };
    const first = holdForChecks(w, seen, {}, 3, opts);
    expect(first.hold).toBe(true);
    expect(first.reason).toMatch(/to the expected CI finish .*#591 \(check running, 0 s, expected CI finish in 7 min\)/);
    // 07:58:48 (the flat wait gave up) and 07:59:59 (its CI finished): still holding
    expect(holdForChecks(w, Date.parse('2026-10-26T07:58:48Z'), first.firstSeen, 3, opts).hold).toBe(true);
    expect(holdForChecks(w, Date.parse('2026-10-26T07:59:59Z'), first.firstSeen, 3, opts).hold).toBe(true);
    const after = holdForChecks(w, start + 15 * MIN, first.firstSeen, 3, opts);
    expect(after.hold).toBe(false);
    expect(after.reason).toMatch(/not waiting longer for #591 \(expected CI finish or cap passed\)/);
  });

  it('holdForChecks: at least the flat wait, at most the cap from first seen, flat fallback without start or typical, 0 = off', () => {
    const w = [{ pr: 7, branch: 'b', head: 'h7', why: 'check running', ciStartedAt: T0 }];
    // expected finish long past (CI late): the flat 3 min from first seen still applies
    const late = holdForChecks(w, T0 + 30 * MIN, {}, 3, { typicalMin: 13 });
    expect(late.hold).toBe(true);
    expect(holdForChecks(w, T0 + 33 * MIN, late.firstSeen, 3, { typicalMin: 13 }).hold).toBe(false);
    // a stuck or slow measurement never holds past the cap
    const slow = holdForChecks(w, T0, {}, 3, { typicalMin: 55, capMin: 20 });
    expect(holdForChecks(w, T0 + 19 * MIN, slow.firstSeen, 3, { typicalMin: 55, capMin: 20 }).hold).toBe(true);
    expect(holdForChecks(w, T0 + 20 * MIN, slow.firstSeen, 3, { typicalMin: 55, capMin: 20 }).hold).toBe(false);
    // unknown start or unknown typical: the old flat wait and its reason
    for (const [ww, t] of [[[{ ...w[0], ciStartedAt: null }], 13], [w, null]] as const) {
      const f = holdForChecks(ww, T0, {}, 3, { typicalMin: t });
      expect(f.reason).toMatch(/holding the build up to 3 min for #7 \(check running, 0 s\)/);
      expect(holdForChecks(ww, T0 + 3 * MIN, f.firstSeen, 3, { typicalMin: t }).hold).toBe(false);
    }
    expect(holdForChecks(w, T0, {}, 0, { typicalMin: 13 }).hold).toBe(false);
    expect([CHECK_WAIT_CAP_MIN, CHECK_WAIT_MARGIN_MIN]).toEqual([20, 2]);
  });
});
