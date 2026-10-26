import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs process script without types
import { mergeRecheck, recordMergeable, withMergeable, conflictRetire, prBoard } from '../scripts/laptop-queue/lib.mjs';

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
