import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addAttempt, attemptLine, attemptSummary, ATTEMPTS_KEY, loadAttempts, logAttempt, MAX_ATTEMPTS, resetAttemptCache, sanitizeAttempts, type AttemptRecord } from '../src/net/attemptLog';
import { dbGet, dbPut, resetDbCache } from '../src/save/db';

// (co-op relay fix) the connection attempt log: local, capped, countable
const rec = (o: Partial<AttemptRecord> = {}): AttemptRecord => ({ at: 1_700_000_000_000, role: 'client', method: 'direct', ms: 2300, result: 'ok', ...o });

describe('attempt log (pure)', () => {
  it('sanitises what it reads back', () => {
    const raw = [rec(), { ...rec(), role: 'spy' }, { ...rec(), method: 'carrier-pigeon' }, { ...rec(), result: 'boom' }, { ...rec(), ms: -4 }, { ...rec(), ms: 12.6 }, 'x', null, { ...rec(), at: 'now' }];
    const out = sanitizeAttempts(raw);
    expect(out).toEqual([rec(), { ...rec(), ms: null }, { ...rec(), ms: 13 }]);
    expect(sanitizeAttempts({})).toEqual([]);
    expect(sanitizeAttempts(Array.from({ length: MAX_ATTEMPTS + 9 }, () => rec()))).toHaveLength(MAX_ATTEMPTS);
  });

  it('adds newest first and keeps the cap', () => {
    let l: AttemptRecord[] = [];
    for (let i = 0; i < MAX_ATTEMPTS + 5; i++) l = addAttempt(l, rec({ at: i }));
    expect(l).toHaveLength(MAX_ATTEMPTS);
    expect(l[0]!.at).toBe(MAX_ATTEMPTS + 4);
  });

  it('counts direct, via relay and failed', () => {
    expect(attemptSummary([])).toBe('No connection attempts yet');
    const l = [rec(), rec({ method: 'relay' }), rec({ method: 'relay' }), rec({ method: 'none', ms: null, result: 'unreachable' }), rec({ method: 'none', ms: null, result: 'timeout' })];
    expect(attemptSummary(l)).toBe('5 attempts: 1 direct, 2 via relay, 2 failed');
    expect(attemptSummary([rec({ method: 'local' })])).toBe('1 attempt: 0 direct, 0 via relay, 1 same device, 0 failed');
  });

  it('one row in plain words', () => {
    expect(attemptLine(rec({ method: 'relay', ms: 3240 }))).toBe('Joined - via relay, 3.2 s');
    expect(attemptLine(rec({ role: 'host', ms: null }))).toBe('Hosted - direct');
    expect(attemptLine(rec({ method: 'none', ms: null, result: 'unreachable' }))).toBe('Join failed - no network path');
    expect(attemptLine(rec({ role: 'host', method: 'none', ms: null, result: 'version' }))).toBe('Host failed - different versions');
  });
});

describe('attempt log (IndexedDB)', () => {
  afterEach(() => {
    resetAttemptCache();
    resetDbCache();
  });

  it('logs to kv coop:attempts, newest first, and reads it back after a reload', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    await dbPut('kv', ATTEMPTS_KEY, []);
    resetAttemptCache();
    await logAttempt(rec({ at: 1 }));
    await logAttempt(rec({ at: 2, method: 'relay' }));
    expect(info).toHaveBeenCalledWith('co-op connection: Joined - via relay, 2.3 s');
    info.mockRestore();
    expect(sanitizeAttempts(await dbGet('kv', ATTEMPTS_KEY)).map((r) => r.at)).toEqual([2, 1]);
    resetAttemptCache();
    expect((await loadAttempts()).map((r) => r.method)).toEqual(['relay', 'direct']);
  });
});
