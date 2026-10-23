import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs process script without types
import { contextName, describe as describeRun, failureExcerpt, idTime, lockChanged, mergeTimes, parseRun, pick, requestId, requestProblem, shard } from '../scripts/laptop-queue/lib.mjs';

const NOW = Date.UTC(2026, 9, 23, 20, 0, 0);
const idAt = (min: number, tag: string): string => {
  const d = new Date(NOW - min * 60_000).toISOString().replace(/[-:]/g, '').slice(0, 15);
  return `${d}-${tag}-d7a3b887`;
};
const req = (min: number, kind: string, tag = kind) => ({ id: idAt(min, tag), kind });
const slots = (a: boolean, b: boolean) => [{ port: '4189', busy: a }, { port: '4192', busy: b }];
const train = { sha: 'a'.repeat(40), n: '31' };

describe('pick', () => {
  it('a train waits for both slots and blocks other work meanwhile', () => {
    const q = { trains: [train], requests: [req(5, 'pr')] };
    expect(pick(q, NOW, slots(false, false))).toEqual({ kind: 'train', train });
    expect(pick(q, NOW, slots(true, false))).toBeNull();
  });
  it('an alone request over 45 min beats a pr and needs both slots', () => {
    const old = req(50, 'alone');
    const q = { trains: [], requests: [req(10, 'pr'), old] };
    expect(pick(q, NOW, slots(false, false))).toEqual({ kind: 'alone', request: old });
    expect(pick(q, NOW, slots(true, false))).toBeNull();
  });
  it('a fresh alone request waits behind pr work', () => {
    const pr = req(10, 'pr');
    const q = { trains: [], requests: [req(20, 'alone'), pr] };
    expect(pick(q, NOW, slots(false, false))).toEqual({ kind: 'request', request: pr, slot: '4189' });
    expect(pick({ trains: [], requests: [req(20, 'alone')] }, NOW, slots(true, false))).toBeNull();
    expect(pick({ trains: [], requests: [req(20, 'alone')] }, NOW, slots(false, false))?.kind).toBe('alone');
  });
  it('pr and full requests go oldest first, on the free slot', () => {
    const a = req(30, 'pr', 'a');
    const b = req(20, 'full', 'b');
    expect(pick({ trains: [], requests: [b, a] }, NOW, slots(true, false))).toEqual({ kind: 'request', request: a, slot: '4192' });
    expect(pick({ trains: [], requests: [b, a] }, NOW, slots(true, true))).toBeNull();
  });
});

describe('shard', () => {
  const times: Record<string, number> = { a: 100, b: 90, c: 60, d: 50, e: 40, f: 10 };
  it('two bins within one longest suite of each other', () => {
    const [x, y] = shard(Object.keys(times), times, 2);
    expect(Math.abs(x.weight - y.weight)).toBeLessThanOrEqual(100);
    expect(x.suites.length + y.suites.length).toBe(6);
    expect(x.weight + y.weight).toBe(350);
  });
  it('unknown suites weigh the median and the result is deterministic', () => {
    const t = { a: 10, b: 30, c: 50 };
    const bins = shard(['c', 'z', 'a', 'b'], t, 2);
    expect(bins.reduce((s: number, b: { weight: number }) => s + b.weight, 0)).toBe(10 + 30 + 50 + 30);
    expect(shard(['a', 'b', 'c', 'z'], t, 2)).toEqual(bins);
  });
});

const RUN = `
=== e2e-coop (ok, 74s) ===
ok
=== e2e-menus (FAIL, 61s) ===
step 3
not ok - menu opens
=== e2e-pad (FAIL, 30s) ===

times (GPU, 3 at a time):
  e2e-coop ok 74s
  e2e-menus FAIL 61s
  e2e-pad FAIL (KNOWN FLAKY) 30s
  anim-audit REPORT ONLY (exit 1) 12s

wall 120s, suites summed 177s (x1.5)

2 suite(s) failed: e2e-menus, e2e-pad
`;

describe('parseRun', () => {
  it('reads ok, FAIL, KNOWN FLAKY and REPORT ONLY lines, wall and the failure summary', () => {
    const r = parseRun(RUN);
    expect(r.suites).toEqual([
      { s: 'e2e-coop', ok: true, flaky: false, report: false, sec: 74 },
      { s: 'e2e-menus', ok: false, flaky: false, report: false, sec: 61 },
      { s: 'e2e-pad', ok: false, flaky: true, report: false, sec: 30 },
      { s: 'anim-audit', ok: true, flaky: false, report: true, sec: 12 },
    ]);
    expect(r.wall).toBe(120);
    expect(r.passed).toBe(false);
    expect(r.failed).toEqual(['e2e-menus', 'e2e-pad']);
  });
  it('reads a passing run and an empty text', () => {
    const r = parseRun('times (GPU, 1 at a time):\n  e2e-coop ok 5s\n\nwall 5s, suites summed 5s\n\nall e2e suites passed\n');
    expect(r.passed).toBe(true);
    expect(r.suites).toHaveLength(1);
    expect(parseRun('crashed').suites).toEqual([]);
  });
});

describe('describe', () => {
  it('formats pass count, wall, flakes, known flaky and failures', () => {
    const r = parseRun(RUN);
    expect(describeRun({ ...r, flakes: [] })).toBe('1/3 pass, 120 s; known flaky: e2e-pad; FAIL: e2e-menus');
    const ok = { suites: [{ s: 'a', ok: true, report: false }, { s: 'b', ok: true, report: false }], wall: 99.6, flakes: ['b'] };
    expect(describeRun(ok)).toBe('2/2 pass, 100 s; flake: b');
  });
  it('cuts to 140 characters', () => {
    const suites = Array.from({ length: 30 }, (_, i) => ({ s: `e2e-long-suite-name-${i}`, ok: false, flaky: false, report: false }));
    expect(describeRun({ suites, wall: 1, flakes: [] }).length).toBe(140);
  });
});

describe('lockChanged', () => {
  const lock = (v: string, dep: string): string => `{\n  "version": "${v}",\n  "packages": {\n    "x": { "resolved": "${dep}" }\n  }\n}\n`;
  it('ignores version lines, sees a dependency change', () => {
    expect(lockChanged(lock('4.1.0', 'a'), lock('4.2.0', 'a'))).toBe(false);
    expect(lockChanged(lock('4.1.0', 'a'), lock('4.1.0', 'b'))).toBe(true);
  });
});

describe('contextName and ids', () => {
  it('sanitises to [a-z0-9+._-] and 40 chars', () => {
    expect(contextName('pr', '', ['e2e-coop', 'e2e-netmove'])).toBe('laptop-e2e/e2e-coop+e2e-netmove');
    expect(contextName('pr', 'Guard Carry!', [])).toBe('laptop-e2e/guard-carry-');
    expect(contextName('alone', 'perf', [])).toBe('laptop-e2e/alone-perf');
    expect(contextName('full', '', [])).toBe('laptop-e2e/full');
    expect(contextName('pr', 'x'.repeat(60), []).length).toBe('laptop-e2e/'.length + 40);
  });
  it('request ids sort by time and carry the requester and sha', () => {
    const id = requestId(NOW, 'Night Shift | Guard AI Build', 'd7a3b887'.padEnd(40, '0'));
    expect(id).toBe('20261023T200000-night-shift-guard-ai-d7a3b887');
    expect(idTime(id)).toBe(NOW);
    expect(Number.isNaN(idTime('junk'))).toBe(true);
  });
  it('validates requests', () => {
    const ok = { id: 'x', sha: 'a'.repeat(40), kind: 'pr', suites: ['e2e-coop'] };
    expect(requestProblem(ok)).toBe('');
    expect(requestProblem({ ...ok, sha: 'abc' })).toMatch(/sha/);
    expect(requestProblem({ ...ok, suites: [] })).toMatch(/suites/);
    expect(requestProblem({ ...ok, kind: 'alone' })).toMatch(/steps/);
  });
});

describe('failureExcerpt and mergeTimes', () => {
  it('takes the first matching line of the suite section and the lines before it', () => {
    const ex = failureExcerpt(RUN, 'e2e-menus');
    expect(ex).toBe('step 3\nnot ok - menu opens');
    expect(failureExcerpt(RUN, 'e2e-nope')).toBe('');
  });
  it('merges only ok, non-report suites', () => {
    expect(mergeTimes({ a: 1, b: 2 }, [{ s: 'a', ok: true, report: false, sec: 9 }, { s: 'b', ok: false, report: false, sec: 99 }, { s: 'c', ok: true, report: true, sec: 5 }])).toEqual({ a: 9, b: 2 });
  });
});
