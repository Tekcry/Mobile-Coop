// (mixamo I9 polish) A failed lazy capture chunk is not cached: the next load retries; whenChamberCaptures reports the
// failure, then refills.
import { describe, expect, it, vi } from 'vitest';

let fail = true;
vi.doMock('../src/anim/chamberCapturesLazy', () => {
  if (fail) throw new Error('chunk 404');
  return { LAZY_CAPTURE_MODULES: [], LAZY_CAPTURE_FILES: [] };
});
const S = await import('../src/anim/chamber');

describe('mixamo I9 polish: a failed capture load retries', () => {
  it('the failed load resolves, warns once and is not cached; the next call loads', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const p1 = S.loadChamberCaptures();
    await expect(p1).resolves.toBeUndefined();
    expect(S.chamberCapturesLoaded()).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toMatch(/did not load/);
    let refills = 0;
    let fails = 0;
    await S.whenChamberCaptures(() => refills++, () => fails++);
    expect([refills, fails]).toEqual([0, 1]);
    fail = false;
    const p2 = S.loadChamberCaptures();
    expect(p2).not.toBe(p1);
    await p2;
    expect(S.chamberCapturesLoaded()).toBe(true);
    await S.whenChamberCaptures(() => refills++, () => fails++);
    expect([refills, fails]).toEqual([1, 1]);
    expect(S.loadChamberCaptures()).toBe(p2);
    warn.mockRestore();
  });
});
