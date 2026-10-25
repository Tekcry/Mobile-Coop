import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs process script without types
import { classify as classifyUntyped, status as statusUntyped, reportSet as reportSetUntyped, isReport as isReportUntyped } from '../scripts/e2e-verdict.mjs';

type R = { s: string; code: number | null; sec: number };
type Opts = { report: (s: string) => boolean; quarantined: (s: string) => boolean };
const classify = classifyUntyped as (results: R[], o: Opts) => { failed: R[]; flakyFailed: R[] };
const status = statusUntyped as (r: R, o: Opts) => string;
const reportSet = reportSetUntyped as (env: Record<string, string | undefined>) => Set<string>;
const isReport = isReportUntyped as (s: string, set: Set<string>) => boolean;

const q = new Set(['e2e-pad', 'e2e-sectorops:6']);
const opts: Opts = { report: (s) => s === 'e2e-foley', quarantined: (s) => q.has(s) || q.has(s.split(':')[0] ?? '') };
const names = (rs: R[]) => rs.map((r) => r.s);

describe('e2e-verdict classify (J20 T8, BRIEF A3)', () => {
  it('a quarantined suite that asserted (code 1) is KNOWN FLAKY', () => {
    const v = classify([{ s: 'e2e-pad', code: 1, sec: 9 }], opts);
    expect(names(v.flakyFailed)).toEqual(['e2e-pad']);
    expect(v.failed).toEqual([]);
  });
  it('a quarantined suite that timed out (124) fails the run', () => {
    const v = classify([{ s: 'e2e-pad', code: 124, sec: 600 }], opts);
    expect(names(v.failed)).toEqual(['e2e-pad']);
    expect(v.flakyFailed).toEqual([]);
  });
  it('a quarantined suite killed by a signal (null) or with another code fails the run', () => {
    const v = classify([{ s: 'e2e-sectorops:6', code: null, sec: 30 }, { s: 'e2e-pad', code: 3, sec: 5 }], opts);
    expect(names(v.failed)).toEqual(['e2e-sectorops:6', 'e2e-pad']);
    expect(v.flakyFailed).toEqual([]);
  });
  it('a report suite never fails, whatever its code', () => {
    const v = classify([{ s: 'e2e-foley', code: 124, sec: 600 }, { s: 'e2e-foley', code: 1, sec: 1 }], opts);
    expect(v).toEqual({ failed: [], flakyFailed: [] });
  });
  it('an unquarantined code-1 failure fails; passes count nowhere', () => {
    const v = classify([{ s: 'e2e-move', code: 1, sec: 40 }, { s: 'smoke', code: 0, sec: 10 }, { s: 'e2e-pad', code: 0, sec: 8 }], opts);
    expect(names(v.failed)).toEqual(['e2e-move']);
    expect(v.flakyFailed).toEqual([]);
  });
});

describe('e2e-verdict status (the times line parseRun reads)', () => {
  it('words match the times block format', () => {
    expect(status({ s: 'smoke', code: 0, sec: 1 }, opts)).toBe('ok');
    expect(status({ s: 'e2e-move', code: 1, sec: 1 }, opts)).toBe('FAIL');
    expect(status({ s: 'e2e-pad', code: 1, sec: 1 }, opts)).toBe('FAIL (KNOWN FLAKY)');
    expect(status({ s: 'e2e-pad', code: 124, sec: 1 }, opts)).toBe('FAIL');
    expect(status({ s: 'e2e-foley', code: 124, sec: 1 }, opts)).toBe('REPORT ONLY (exit 124)');
  });
});

describe('e2e-verdict E2E_REPORT', () => {
  it('reportSet parses a space or comma list', () => {
    expect([...reportSet({ E2E_REPORT: 'a b,c' })].sort()).toEqual(['a', 'b', 'c']);
    expect([...reportSet({ E2E_REPORT: ' e2e-foley ,, e2e-wall:flanker ' })].sort()).toEqual(['e2e-foley', 'e2e-wall:flanker']);
    expect(reportSet({}).size).toBe(0);
  });
  it('isReport matches a part by its whole suite, not a whole suite by one part', () => {
    expect(isReport('e2e-wall:flanker', new Set(['e2e-wall']))).toBe(true);
    expect(isReport('e2e-wall:flanker', new Set(['e2e-wall:flanker']))).toBe(true);
    expect(isReport('e2e-wall', new Set(['e2e-wall:flanker']))).toBe(false);
    expect(isReport('e2e-move', new Set(['e2e-wall']))).toBe(false);
  });
});
