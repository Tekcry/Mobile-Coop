import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs process script without types
import { assertKey, pickBranch, supersedeStatuses, cpuTotalPct, backgroundCpuMs, gatedCpu, trainHold, capTail, claimBlocks, contextName, desktopGate, desktopSlotGate, describe as describeRun, failureExcerpt, idTime, lockChanged, mergeTimes, parseClaim, parseRun, pick, requestId, requestProblem, runComplete, shard, superseded, suiteSection, trainBuildFailed, workerActivity, desktopTrainGate, staleTasks, dupKey, duplicates, yieldTo, rerunPassed, buildMarker, pruneDone, cutShort, agedAlone, ALONE_AGE_MIN, holdClears, slotLockDecision, trainSoon, releasingTrain, readyOrPending, RELEASE_HOLD_MS, median, desktopFailDesc, laptopRerunRequest, DESKTOP_HOT_CPU, expectedWallS, manualLocks, sortTrains, trainBelow, rerunTrain, trainsUnderMarker, voidMisses, VOID_MISSES, ALONE_PREEMPT_MIN, PREEMPT_MAX_PROGRESS, runProgress, aloneSoon, AFFECTED_REQUESTER, AFFECTED_CTX, AFFECTED_SKIP_LABEL, queueRequester, affectedSuites, affectedNeeds, affectedRequest, autoQuarantine, countRuns, flakeBudget, flakeSummary, quarantined, suiteOwner, DEFAULT_OWNER, FLAKE_BUDGET, QUARANTINE_TTL_MS, splitSuites, knownSuites, unknownSuites, SPARE_REQUESTER, spareNext, spareRecord, spareRequest, realWaiting } from '../scripts/laptop-queue/lib.mjs';

const spareReq = (min: number, kind: string) => ({ ...req(min, kind, 'spare', 'laptop-queue spare') });
// @ts-expect-error plain .mjs module without types
import { selectSuites, WIDE_COVERS } from '../scripts/e2e-affected.mjs';

const NOW = Date.UTC(2026, 9, 23, 20, 0, 0);
const idAt = (min: number, tag: string): string => {
  const d = new Date(NOW - min * 60_000).toISOString().replace(/[-:]/g, '').slice(0, 15);
  return `${d}-${tag}-d7a3b887`;
};
const req = (min: number, kind: string, tag = kind, requester = tag) => ({ id: idAt(min, tag), kind, requester });
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
  it('an alone run preempted by a train goes first among alone requests and counts as aged', () => {
    const older = req(30, 'alone', 'older');
    const cut = req(20, 'alone', 'cut');
    const pr = req(25, 'pr');
    const q = { trains: [], requests: [older, cut, pr], front: new Set([cut.id]) };
    expect(pick(q, NOW, slots(false, false))).toEqual({ kind: 'alone', request: cut });
    expect(pick(q, NOW, slots(true, false))).toBeNull(); // the slots drain for it
    expect(pick({ ...q, front: new Set() }, NOW, slots(false, false))).toEqual({ kind: 'request', request: pr, slot: '4189' });
    // a pending train still goes first
    expect(pick({ ...q, trains: [train] }, NOW, slots(false, false))).toEqual({ kind: 'train', train });
  });
  it('pr and full requests of different requesters go oldest first, on the free slot', () => {
    const a = req(30, 'pr', 'a');
    const b = req(20, 'full', 'b');
    expect(pick({ trains: [], requests: [b, a] }, NOW, slots(true, false))).toEqual({ kind: 'request', request: a, slot: '4192' });
    expect(pick({ trains: [], requests: [b, a] }, NOW, slots(true, true))).toBeNull();
  });
});

describe('pick oldest first per requester (priority first)', () => {
  it('runs the requester with the oldest request first, then that requester oldest request', () => {
    const a1 = req(50, 'pr', 'a1', 'A');
    const b1 = req(40, 'pr', 'b1', 'B');
    const a2 = req(30, 'pr', 'a2', 'A');
    const b2 = req(10, 'full', 'b2', 'B');
    const q = { trains: [], requests: [b2, a2, b1, a1] };
    expect(pick(q, NOW, slots(false, false))).toEqual({ kind: 'request', request: a1, slot: '4189' });
    // a1 done: B's oldest request is now the oldest overall, and B's oldest runs
    expect(pick({ trains: [], requests: [b2, a2, b1] }, NOW, slots(false, false))).toEqual({ kind: 'request', request: b1, slot: '4189' });
    expect(pick({ trains: [], requests: [b2, b1] }, NOW, slots(false, false))).toEqual({ kind: 'request', request: b1, slot: '4189' });
  });
  it('the 2026-10-24 case: Guard AI #317 (oldest) runs before its newer #360 / #363', () => {
    const r317 = { ...req(70, 'pr', 'g317', 'Guard AI'), pr: 317 };
    const r360 = { ...req(20, 'pr', 'g360', 'Guard AI'), pr: 360 };
    const r363 = { ...req(5, 'pr', 'g363', 'Guard AI'), pr: 363 };
    expect(pick({ trains: [], requests: [r363, r360, r317] }, NOW, slots(false, false))?.request).toBe(r317);
  });
  it('a higher priority goes first within the requester, then oldest among equal priority', () => {
    const a1 = req(50, 'pr', 'a1', 'A');
    const a2 = { ...req(30, 'pr', 'a2', 'A'), priority: 1 };
    const a3 = { ...req(10, 'pr', 'a3', 'A'), priority: 1 };
    const a4 = { ...req(5, 'pr', 'a4', 'A'), priority: -1 };
    expect(pick({ trains: [], requests: [a4, a3, a2, a1] }, NOW, slots(false, false))?.request).toBe(a2);
    expect(pick({ trains: [], requests: [a4, a1] }, NOW, slots(false, false))?.request).toBe(a1);
  });
  it('priority never moves a request ahead of another requester (fairness by arrival unchanged)', () => {
    const b1 = req(50, 'pr', 'b1', 'B');
    const a1 = { ...req(30, 'pr', 'a1', 'A'), priority: 9 };
    expect(pick({ trains: [], requests: [a1, b1] }, NOW, slots(false, false))?.request).toBe(b1);
  });
  it('a laptop rerun keeps its place by its id time', () => {
    const a1 = req(50, 'pr', 'a1', 'A');
    const rr = { ...req(10, 'pr', 'rr', 'A'), laptopRerun: true };
    expect(pick({ trains: [], requests: [rr, a1] }, NOW, slots(false, false))?.request).toBe(a1);
    expect(pick({ trains: [], requests: [rr] }, NOW, slots(false, false))?.request).toBe(rr);
  });
  it('an alone request is never picked as the requester pr request', () => {
    const p1 = req(30, 'pr', 'p1', 'A');
    const al = req(5, 'alone', 'al', 'A');
    expect(pick({ trains: [], requests: [al, p1] }, NOW, slots(false, false))).toEqual({ kind: 'request', request: p1, slot: '4189' });
  });
  it('pickBranch: the ref, never for a master sha, the checkout at the sha, then a tip, then the one containing branch', () => {
    expect(pickBranch({ ref: 'origin/feature/a', onMaster: true })).toBe('feature/a');
    expect(pickBranch({ onMaster: true, headBranch: 'feature/b', headIsSha: true, pointsAt: ['  origin/feature/b'] })).toBe('');
    expect(pickBranch({ headBranch: 'feature/b', headIsSha: true, containing: ['  origin/feature/c'] })).toBe('feature/b');
    // a stacked parent's head under the child's checkout: the parent's tip wins, not the checkout
    expect(pickBranch({ headBranch: 'feature/child', headIsSha: false, pointsAt: ['  origin/feature/parent'], containing: ['  origin/feature/parent', '  origin/feature/child'] })).toBe('feature/parent');
    expect(pickBranch({ headBranch: 'feature/b', headIsSha: false, containing: ['  origin/feature/c', '  origin/master', '  origin/HEAD -> origin/master'] })).toBe('feature/c');
    expect(pickBranch({ headBranch: 'master', headIsSha: true, containing: ['  origin/train/74', '  origin/dev'] })).toBe('');
    expect(pickBranch({ containing: ['  origin/feature/c', '  origin/feature/d'] })).toBe('');
    expect(pickBranch({ pointsAt: ['  origin/feature/c', '  origin/feature/d'], containing: ['  origin/feature/c'] })).toBe('');
    expect(pickBranch({ headBranch: 'HEAD', headIsSha: true })).toBe('');
  });

  it('requestProblem: priority must be an integer when given', () => {
    const ok = { id: 'x', sha: 'a'.repeat(40), kind: 'pr', suites: ['e2e-coop'] };
    expect(requestProblem({ ...ok, priority: 2 })).toBe('');
    expect(requestProblem({ ...ok, priority: -1 })).toBe('');
    expect(requestProblem({ ...ok, priority: 1.5 })).toMatch(/priority/);
    expect(requestProblem({ ...ok, priority: NaN })).toMatch(/priority/);
    expect(requestProblem({ ...ok, priority: '2' })).toMatch(/priority/);
  });
});

describe('superseded', () => {
  const SHA = (c: string) => c.repeat(40);
  const r = (min: number, tag: string, o: Record<string, unknown> = {}) => ({ id: idAt(min, tag), requester: 'A', kind: 'pr', sha: SHA('1'), suites: ['e2e-coop'], ...o });
  const never = () => false;
  const anc = (pairs: string[][]) => (a: string, b: string) => pairs.some(([x, y]) => x === a && y === b);

  it('same non-empty set name supersedes, whatever the sha', () => {
    const o = r(30, 'o', { set: 'train', suites: ['x'] });
    const n = r(10, 'n', { set: 'train', sha: SHA('2'), suites: ['y'] });
    expect([...superseded([n, o], never)]).toEqual([[o.id, n.id]]);
    expect(superseded([r(30, 'o', { set: '' }), r(10, 'n', { set: '', sha: SHA('2'), suites: ['y'] })], never).size).toBe(0);
  });
  it('ancestor sha whose newer request covers every suite supersedes', () => {
    const o = r(30, 'o', { sha: SHA('1'), suites: ['a', 'b'] });
    const n = r(10, 'n', { sha: SHA('2'), suites: ['b', 'a', 'c'] });
    expect(superseded([o, n], anc([[SHA('1'), SHA('2')]])).get(o.id)).toBe(n.id);
  });
  it('a partial overlap is kept (the dropped suite would never run)', () => {
    const o = r(30, 'o', { sha: SHA('1'), suites: ['a', 'b'] });
    const n = r(10, 'n', { sha: SHA('2'), suites: ['b', 'c'] });
    expect(superseded([o, n], anc([[SHA('1'), SHA('2')]])).size).toBe(0);
  });
  it('two different set names are kept (flag off / on pair on an ancestor)', () => {
    const o = r(30, 'o', { set: 'gm-g7-off', suites: ['e2e-enemies', 'e2e-coop'] });
    const n = r(10, 'n', { set: 'gm-g7-on', sha: SHA('2'), suites: ['e2e-enemies', 'e2e-coop'] });
    expect(superseded([o, n], anc([[SHA('1'), SHA('2')]])).size).toBe(0);
  });
  it('no requester or "unknown" is never superseded', () => {
    expect(superseded([r(30, 'o', { requester: 'unknown' }), r(10, 'n', { requester: 'unknown' })], never).size).toBe(0);
    expect(superseded([r(30, 'o', { requester: undefined }), r(10, 'n', { requester: undefined })], never).size).toBe(0);
  });
  it('full requests always overlap', () => {
    const o = r(30, 'o', { kind: 'full', suites: undefined });
    const n = r(10, 'n', { kind: 'full', suites: undefined, sha: SHA('2') });
    expect(superseded([o, n], anc([[SHA('1'), SHA('2')]])).get(o.id)).toBe(n.id);
  });
  it('an ancestor without overlapping suites is kept', () => {
    const o = r(30, 'o', { suites: ['a'] });
    const n = r(10, 'n', { sha: SHA('2'), suites: ['b'] });
    expect(superseded([o, n], anc([[SHA('1'), SHA('2')]])).size).toBe(0);
  });
  it('a sha that is not an ancestor is kept', () => {
    expect(superseded([r(30, 'o'), r(10, 'n', { sha: SHA('2') })], never).size).toBe(0);
  });
  it('a different requester or kind is kept', () => {
    expect(superseded([r(30, 'o'), r(10, 'n', { requester: 'B' })], never).size).toBe(0);
    expect(superseded([r(30, 'o', { kind: 'full' }), r(10, 'n')], never).size).toBe(0);
  });
  it('alone is never superseded, even with the same set', () => {
    const o = r(30, 'o', { kind: 'alone', set: 's', steps: ['x'], suites: undefined });
    const n = r(10, 'n', { kind: 'alone', set: 's', steps: ['x'], suites: undefined });
    expect(superseded([o, n], () => true).size).toBe(0);
  });
  it('a duplicate (same sha, overlapping suites) is superseded; the newest one stays', () => {
    const o = r(30, 'o');
    const n = r(10, 'n');
    expect([...superseded([n, o], never)]).toEqual([[o.id, n.id]]);
    expect(superseded([n, o], never).has(n.id)).toBe(false);
  });
  it('ignores the :part suffix when comparing suites', () => {
    const o = r(30, 'o', { suites: ['e2e-ctcourse:2'] });
    const n = r(10, 'n', { sha: SHA('2'), suites: ['e2e-ctcourse'] });
    expect(superseded([o, n], anc([[SHA('1'), SHA('2')]])).get(o.id)).toBe(n.id);
  });
  it('a pinned request is never superseded, but may supersede an older one', () => {
    const o = r(30, 'o', { pin: true });
    const n = r(10, 'n');
    expect(superseded([o, n], never).size).toBe(0);
    const o2 = r(30, 'o2');
    const n2 = r(10, 'n2', { pin: true });
    expect(superseded([o2, n2], never).get(o2.id)).toBe(n2.id);
  });
  it('a chain maps each old request to the newest request that supersedes it', () => {
    const a = r(30, 'a');
    const b = r(20, 'b');
    const c = r(10, 'c');
    const m = superseded([a, b, c], never);
    expect(m.get(a.id)).toBe(c.id);
    expect(m.get(b.id)).toBe(c.id);
    expect(m.has(c.id)).toBe(false);
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
  it('marks a run complete only when its summary line is seen', () => {
    expect(parseRun(RUN).complete).toBe(true);
    expect(parseRun('times (GPU, 1 at a time):\n  e2e-coop ok 5s\n\nall e2e suites passed\n').complete).toBe(true);
    const died = '=== e2e-coop (ok, 74s) ===\nok\n=== e2e-menus ===\nstep 1\n';
    expect(parseRun(died).complete).toBe(false);
    expect(parseRun(died).suites).toEqual([]);
    expect(parseRun('times (GPU, 1 at a time):\n  e2e-coop ok 5s\n').complete).toBe(false);
  });
  it('runComplete needs the summary and every expected suite', () => {
    const good = parseRun(RUN);
    expect(runComplete(good, 4, true)).toBe(true);
    expect(runComplete(good, 5, true)).toBe(false);
    expect(runComplete(good, 3)).toBe(true);
    expect(runComplete(parseRun('crashed'), 0, true)).toBe(false);
    expect(runComplete({ ...good, complete: false }, 4, true)).toBe(false);
    expect(runComplete({ suites: [], complete: true }, 0)).toBe(false);
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
  it('splits --suites on spaces and commas and refuses unknown names at request time', () => {
    expect(splitSuites('e2e-coop,e2e-ctcourse:4  smoke, ')).toEqual(['e2e-coop', 'e2e-ctcourse:4', 'smoke']);
    expect(splitSuites(undefined)).toEqual([]);
    const known = knownSuites(['scripts/e2e-coop.mjs', 'scripts/e2e-ctcourse.mjs', 'scripts/smoke.mjs', 'scripts/anim-audit.mjs', 'scripts/e2e-lib.mjs',
      'scripts/e2e-net-lib.mjs', 'scripts/e2e-affected.mjs', 'scripts/perf.mjs', 'scripts/e2e-times.json', 'scripts/laptop-queue']);
    expect([...known].sort()).toEqual(['anim-audit', 'e2e-coop', 'e2e-ctcourse', 'smoke']);
    expect(unknownSuites(['e2e-ctcourse:4', 'e2e-coop,e2e-ctcourse', 'e2e-lib'], known)).toEqual(['e2e-coop,e2e-ctcourse', 'e2e-lib']);
    const ok = { id: 'x', sha: 'a'.repeat(40), kind: 'pr', suites: ['e2e-coop', 'e2e-ctcourse:4'] };
    expect(requestProblem(ok, { known })).toBe('');
    expect(requestProblem({ ...ok, suites: ['e2e-coop', 'e2e-nope'] }, { known })).toMatch(/unknown suite\(s\) e2e-nope/);
    expect(requestProblem({ ...ok, suites: ['e2e-nope'] })).toBe(''); // no known set (the service's parse): unchecked
    expect(requestProblem({ id: 'x', sha: 'a'.repeat(40), kind: 'full' }, { known })).toBe('');
  });
});

describe('failureExcerpt and mergeTimes', () => {
  it('cuts a suite section and gives the failing assert plus the last 40 lines', () => {
    const sec = suiteSection(RUN, 'e2e-menus');
    expect(sec).toBe('step 3\nnot ok - menu opens');
    expect(failureExcerpt(sec)).toEqual({ assert: 'not ok - menu opens', tail40: 'step 3\nnot ok - menu opens' });
    expect(suiteSection(RUN, 'e2e-nope')).toBe('');
    const long = Array.from({ length: 100 }, (_, i) => (i === 10 ? 'Error: boom' : `line ${i}`)).join('\n');
    const r = failureExcerpt(long);
    expect(r.assert).toBe('Error: boom');
    expect(r.tail40.split('\n')).toHaveLength(40);
    expect(r.tail40.endsWith('line 99')).toBe(true);
    expect(failureExcerpt('')).toEqual({ assert: '', tail40: '' });
  });
  it('reads the streamed "=== s ===" header and stops before the times block', () => {
    const streamed = '=== e2e-coop ===\nstep 1\nnot ok - join\n\ntimes (GPU, 1 at a time):\n  e2e-coop FAIL 9s\n';
    expect(suiteSection(streamed, 'e2e-coop')).toBe('step 1\nnot ok - join\n');
    expect(suiteSection(RUN, 'e2e-pad')).toBe('');
  });
  it('capTail keeps the end within the cap', () => {
    expect(capTail('short', 100)).toBe('short');
    const t = capTail('x'.repeat(50) + 'END', 20);
    expect(t.length).toBe(20);
    expect(t.endsWith('END')).toBe(true);
  });
  it('merges only ok, non-report suites', () => {
    expect(mergeTimes({ a: 1, b: 2 }, [{ s: 'a', ok: true, report: false, sec: 9 }, { s: 'b', ok: false, report: false, sec: 99 }, { s: 'c', ok: true, report: true, sec: 5 }])).toEqual({ a: 9, b: 2 });
  });
});

describe('claims and the desktop lane', () => {
  const H = 3600_000;
  const at = (minAgo: number) => new Date(NOW - minAgo * 60_000).toISOString();
  it('parses a claim, null for absent or bad text', () => {
    expect(parseClaim(`{"worker":"laptop","pid":1,"at":"${at(1)}","done":false}`)).toMatchObject({ worker: 'laptop', done: false });
    expect(parseClaim('')).toBeNull();
    expect(parseClaim('{nope')).toBeNull();
    expect(parseClaim('{"worker":"laptop","at":"never"}')).toBeNull();
  });
  it('a done claim blocks everyone; an open one blocks only the other worker until it is stale', () => {
    expect(claimBlocks(null, 'desktop', NOW, 3 * H)).toBe(false);
    expect(claimBlocks({ worker: 'laptop', at: at(5), done: true }, 'laptop', NOW, 3 * H)).toBe(true);
    expect(claimBlocks({ worker: 'laptop', at: at(5), done: false }, 'desktop', NOW, 3 * H)).toBe(true);
    expect(claimBlocks({ worker: 'laptop', at: at(5), done: false }, 'laptop', NOW, 3 * H)).toBe(false);
    expect(claimBlocks({ worker: 'laptop', at: at(200), done: false }, 'desktop', NOW, 3 * H)).toBe(false);
  });
  it('the desktop gate needs backlog over the minimum and cpu under the cap', () => {
    expect(desktopGate(4, 40, 3, 60)).toBe('');
    expect(desktopGate(3, 40, 3, 60)).toMatch(/backlog/);
    expect(desktopGate(5, 60, 3, 60)).toMatch(/cpu 60/);
    expect(desktopGate(5, NaN, 3, 60)).toBe('cpu unknown');
  });
  it('the per-slot desktop gate: 4192 waits at cpu 55 and starts at 45, lock, missing dir, small backlog', () => {
    const base = { lockName: 'heavy2.lock', lockHeld: false, dirOk: true, backlog: 5, cpu: 45, minBacklog: 3, maxCpu: 50 };
    expect(desktopSlotGate(base)).toBe('');
    expect(desktopSlotGate({ ...base, cpu: 55 })).toMatch(/cpu 55% >= 50%/);
    expect(desktopSlotGate({ ...base, cpu: 55, maxCpu: 60 })).toBe('');
    expect(desktopSlotGate({ ...base, lockHeld: true })).toBe('heavy2.lock held');
    expect(desktopSlotGate({ ...base, dirOk: false })).toBe('worktree missing');
    expect(desktopSlotGate({ ...base, backlog: 3 })).toMatch(/backlog/);
    expect(desktopSlotGate({ ...base, cpu: NaN })).toBe('cpu unknown');
    expect(desktopSlotGate({ ...base, cpu: 55, cpuTotal: 97 })).toBe('cpu 55% >= 50% (Normal+ priority; total 97%)');
  });
  it('slot lock decision: break only a dead pid on this host whose text is unchanged between two reads', () => {
    const t = 'gpu bake | 2026-10-24T21:57:00.000Z | pid 4242 | host DESKTOP';
    const dead = { host: 'DESKTOP', alive: () => false };
    const live = { host: 'DESKTOP', alive: () => true };
    expect(slotLockDecision(null, null, dead)).toEqual({ action: 'free', why: 'no lock' });
    expect(slotLockDecision(t, t, dead)).toEqual({ action: 'break', why: 'pid 4242 is not alive on DESKTOP' });
    expect(slotLockDecision(`${t}
`, t, dead).action).toBe('break');
    expect(slotLockDecision(t, t, live)).toEqual({ action: 'hold', why: 'pid 4242 is alive' });
    expect(slotLockDecision(t, t, { host: 'laptop', alive: () => false }).action).toBe('hold');
    // a fresh taker replaced it (or it was released) between the reads: no break
    expect(slotLockDecision(t, 'other | 2026-10-25T01:00:00.000Z | pid 77 | host DESKTOP', dead)).toEqual({ action: 'hold', why: 'the lock changed between two reads' });
    expect(slotLockDecision(t, null, dead).action).toBe('hold');
    // no parseable pid: the noclobber way and the service's own lines are respected
    expect(slotLockDecision('Marlow Build | marlow-final | 18:48', 'Marlow Build | marlow-final | 18:48', dead)).toEqual({ action: 'hold', why: 'no pid in the lock' });
    const own = 'laptop-queue | request 1a2b3c4d pid 99 | 2026-10-25T00:20:00.000Z';
    expect(slotLockDecision(own, own, dead).action).toBe('hold');
    let probed = 0;
    slotLockDecision('Marlow Build', 'Marlow Build', { host: 'DESKTOP', alive: () => { probed++; return false; } });
    expect(probed).toBe(0);
  });
});

describe('gate cpu (BelowNormal / Idle left out)', () => {
  const snap = (busy: number, idle: number, n = 2) => Array.from({ length: n }, () => ({ times: { user: busy, nice: 0, sys: 0, irq: 0, idle } }));
  it('cpuTotalPct is busy over all time between two os.cpus() snapshots', () => {
    expect(cpuTotalPct(snap(0, 0), snap(750, 250))).toBe(75);
    expect(cpuTotalPct(snap(100, 100), snap(100, 1100))).toBe(0);
    expect(cpuTotalPct(null, snap(1, 1))).toBeNaN();
    expect(cpuTotalPct(snap(0, 0, 2), snap(1, 1, 4))).toBeNaN();
    expect(cpuTotalPct(snap(5, 5), snap(5, 5))).toBeNaN();
  });
  it('backgroundCpuMs sums deltas of pids in both snapshots and reads the window', () => {
    const out = ['a 100 5000', 'a 200 10', 'a 0 999', 'a 300 50', '', 'b 100 13000', 'b 200 10', 'b 0 5000', 'b 400 900', 'el 1012', 'junk line'].join('\r\n');
    // 100: 8000 ms (the Blender bake), 200: idle, 0 left out, 300 ended, 400 new: skipped
    expect(backgroundCpuMs(out)).toEqual({ bgMs: 8000, elapsedMs: 1012 });
    expect(backgroundCpuMs('').elapsedMs).toBeNaN();
    expect(backgroundCpuMs('a 1 10\nb 1 5\nel 0')).toEqual({ bgMs: 0, elapsedMs: NaN });
  });
  it('gatedCpu takes the background share off the total: the 22:34 Blender bake no longer holds 4192', () => {
    // 20 cores at 95%, a BelowNormal bake using 10 cores' worth for 1 s: 95 - 50 = 45 < 50, the slot starts
    expect(gatedCpu({ total: 95, bgMs: 10_000, elapsedMs: 1000, cores: 20 })).toBe(45);
    expect(gatedCpu({ total: 30, bgMs: 20_000, elapsedMs: 1000, cores: 10 })).toBe(0);
    expect(gatedCpu({ total: 60, bgMs: 0, elapsedMs: 1000, cores: 8 })).toBe(60);
    expect(gatedCpu({ total: NaN, bgMs: 0, elapsedMs: 1000, cores: 8 })).toBeNaN();
    expect(gatedCpu({ total: 60, bgMs: 0, elapsedMs: NaN, cores: 8 })).toBeNaN();
    expect(gatedCpu({ total: 60, bgMs: 0, elapsedMs: 1000, cores: 0 })).toBeNaN();
  });
});

describe('trainBuildFailed', () => {
  it('an auto-train/* failure or error skips the train; success, pending and other contexts do not', () => {
    expect(trainBuildFailed([{ context: 'laptop-e2e', state: 'pending' }, { context: 'auto-train/vitest', state: 'failure' }])).toEqual({ context: 'auto-train/vitest', state: 'failure' });
    expect(trainBuildFailed([{ context: 'auto-train/build', state: 'error' }])).toEqual({ context: 'auto-train/build', state: 'error' });
    expect(trainBuildFailed([{ context: 'auto-train/vitest', state: 'success' }, { context: 'auto-train/x', state: 'pending' }])).toBeNull();
    expect(trainBuildFailed([{ context: 'laptop-e2e', state: 'failure' }, { context: 'ci/auto-train', state: 'failure' }])).toBeNull();
    expect(trainBuildFailed([])).toBeNull();
    expect(trainBuildFailed(undefined)).toBeNull();
  });
});

describe('desktop trains', () => {
  const MIN = 60_000;
  const t = (minAgo: number) => Math.floor((NOW - minAgo * MIN) / 1000);
  const log = [
    `${t(3)} claim 20261023T195700-x-d7a3b887 (desktop)`,
    `${t(12)} done train 37 (laptop)`,
    `${t(30)} claim train 37 (laptop)`,
    `${t(40)} claim 20261023T192000-y-d7a3b887 (lock taken) (laptop)`,
    'not a log line',
  ].join('\n');
  it('workerActivity: the newest push of that worker and whether it claims trains', () => {
    expect(workerActivity(log, 'laptop')).toEqual({ last: t(12) * 1000, trainClaims: true, openTrain: '' });
    expect(workerActivity(log, 'desktop')).toEqual({ last: t(3) * 1000, trainClaims: false, openTrain: '' });
    const none = workerActivity('', 'laptop');
    expect(none.last).toBeNaN();
    expect(none.trainClaims).toBe(false);
  });
  it('the desktop takes a train only after 10 min of laptop silence, a laptop that claims trains and a head past the grace', () => {
    const base = { laptop: workerActivity(log, 'laptop'), now: NOW, silentMs: 10 * MIN, trainAgeMs: 5 * MIN, graceMs: 2 * MIN };
    expect(desktopTrainGate(base)).toBe('');
    expect(desktopTrainGate({ ...base, silentMs: 15 * MIN })).toBe('laptop active 12 min ago');
    expect(desktopTrainGate({ ...base, trainAgeMs: MIN })).toBe('train head too new');
    expect(desktopTrainGate({ ...base, laptop: { last: NaN, trainClaims: false } })).toMatch(/does not claim trains/);
    expect(desktopTrainGate({ ...base, laptop: workerActivity(log.replace('claim train 37', 'claim x'), 'laptop') })).toMatch(/does not claim trains/);
  });
  // overlap plan section 3: the laptop runs train 64 (claimed, no done / release yet), train 65 may go to the desktop
  const running = [
    `${t(1)} claim train 64 (lock taken) (laptop)`,
    `${t(2)} claim train 64 (laptop)`,
    `${t(12)} done train 63 (laptop)`,
    `${t(30)} claim train 63 (laptop)`,
  ].join('\n');
  it('workerActivity: openTrain is the newest claimed train with no later done / release', () => {
    expect(workerActivity(running, 'laptop').openTrain).toBe('64');
    expect(workerActivity(`${t(0)} done train 64 (laptop)
${running}`, 'laptop').openTrain).toBe('');
    expect(workerActivity(`${t(0)} release train 64 (closed) (laptop)
${running}`, 'laptop').openTrain).toBe('');
    expect(workerActivity(running, 'desktop').openTrain).toBe('');
    // train 100 vs 99 by time, not text; a same-second done after the claim (listed first) closes it
    expect(workerActivity(`${t(1)} claim train 100 (laptop)
${t(5)} claim train 99 (laptop)`, 'laptop').openTrain).toBe('100');
    expect(workerActivity(`${t(1)} done train 64 (laptop)
${t(1)} claim train 64 (laptop)`, 'laptop').openTrain).toBe('');
    // an orphaned older claim (its done push lost) never stays open once the laptop finished a later train (checker FIX)
    expect(workerActivity(`${t(2)} done train 65 (laptop)
${t(8)} claim train 65 (laptop)
${t(40)} claim train 63 (laptop)`, 'laptop').openTrain).toBe('');
    expect(workerActivity(`${t(1)} claim train 66 (laptop)
${t(2)} done train 65 (laptop)
${t(40)} claim train 63 (laptop)`, 'laptop').openTrain).toBe('66');
  });
  it('beside the laptop own train a different train passes the gate at once, the same train does not', () => {
    const base = { laptop: workerActivity(running, 'laptop'), now: NOW, silentMs: 10 * MIN, trainAgeMs: 5 * MIN, graceMs: 2 * MIN };
    expect(desktopTrainGate({ ...base, train: '65' })).toBe('');
    expect(desktopTrainGate({ ...base, train: '64' })).toBe('laptop active 1 min ago');
    expect(desktopTrainGate(base)).toBe(''); // no train named: any train other than 64 may pass (the pre-check)
    expect(desktopTrainGate({ ...base, train: '65', trainAgeMs: MIN })).toBe('train head too new');
    expect(desktopTrainGate({ ...base, train: '65', laptop: { ...base.laptop, trainClaims: false } })).toMatch(/does not claim trains/);
    // no open train: the silence rule as before
    expect(desktopTrainGate({ ...base, train: '65', laptop: workerActivity(`${t(0)} done train 64 (laptop)
${running}`, 'laptop') })).toBe('laptop active 0 min ago');
  });
});

describe('overlapping trains (queue)', () => {
  const t64 = { sha: 'b'.repeat(40), n: '64' };
  const t65 = { sha: 'c'.repeat(40), n: '65' };
  const rerun = (min: number, n: string) => ({ ...req(min, 'pr', `r${n}`, 'auto-train'), trainRerun: true, pr: 1, set: `train${n}-rerun` });
  it('sortTrains orders by number, not text', () => {
    expect(sortTrains([{ n: '100' }, { n: '99' }, { n: '64' }]).map((x: { n: string }) => x.n)).toEqual(['64', '99', '100']);
  });
  it('pick takes the lowest pending train whatever the list order', () => {
    expect(pick({ trains: [t65, t64], requests: [] }, NOW, slots(false, false))).toEqual({ kind: 'train', train: t64 });
  });
  it('a lower train rerun goes before a higher pending train, on one free slot', () => {
    const r64 = rerun(5, '64');
    expect(pick({ trains: [t65], requests: [req(10, 'pr'), r64] }, NOW, slots(false, false))).toEqual({ kind: 'request', request: r64, slot: '4189' });
    expect(pick({ trains: [t65], requests: [r64] }, NOW, slots(true, false))).toEqual({ kind: 'request', request: r64, slot: '4192' });
    expect(pick({ trains: [t65], requests: [r64] }, NOW, slots(true, true))).toBeNull();
  });
  it('a rerun of the same or a higher train waits behind the pending train', () => {
    expect(pick({ trains: [t64], requests: [rerun(5, '64')] }, NOW, slots(false, false))).toEqual({ kind: 'train', train: t64 });
    expect(pick({ trains: [t64], requests: [rerun(5, '65')] }, NOW, slots(true, false))).toBeNull();
    // a rerun with no train number (no set, no train/ branch) never jumps a train
    expect(pick({ trains: [t64], requests: [{ ...req(5, 'pr'), trainRerun: true, pr: 1 }] }, NOW, slots(false, false))).toEqual({ kind: 'train', train: t64 });
  });
  it('rerunTrain reads the set, then a train/<n> branch', () => {
    expect(rerunTrain({ set: 'train64-rerun' })).toBe('64');
    expect(rerunTrain({ branch: 'train/7' })).toBe('7');
    expect(rerunTrain({ set: 'lr16w', branch: 'feature/x' })).toBe('');
    expect(trainBelow('64', '65')).toBe(true);
    expect(trainBelow('65', '65')).toBe(false);
    expect(trainBelow('', '65')).toBe(false);
    expect(trainBelow('64', '?')).toBe(false);
  });
  it('the build marker holds back only trains at or above the train being built', () => {
    const t66 = { sha: 'd'.repeat(40), n: '66' };
    expect(trainsUnderMarker([t64, t65, t66], { train: '65' })).toEqual([t64]);
    expect(trainsUnderMarker([t64, t65], { train: '?' })).toEqual([]);
    expect(trainsUnderMarker([t65], { train: '65' })).toEqual([]);
  });
  it('voidMisses: a failed listing keeps the count, a missing head counts up, a listed head resets', () => {
    const heads = new Set([t64.sha]);
    expect(voidMisses(0, t65.sha, heads)).toBe(1);
    expect(voidMisses(1, t65.sha, heads)).toBe(VOID_MISSES);
    expect(voidMisses(1, t65.sha, null)).toBe(1);
    expect(voidMisses(1, t64.sha, heads)).toBe(0);
  });
});

describe('assertKey', () => {
  const lantern = "Error: timed out waiting for A3: LANTERN's line reaches the client [host: sim 90.45 s in 90.1 s wall (x1.00), 60 fps]";
  const grilleStop = 'timed out waiting for A8: N2 is at the grille stop (route index 2)';
  it('drops bracketed timing and numbers', () => {
    expect(assertKey(lantern)).toBe(assertKey(lantern.replace('90.45', '90.30').replace('60 fps', '120 fps')));
    expect(assertKey(grilleStop)).toBe('timed out waiting for A#: N# is at the grille stop (route index #)');
    expect(assertKey('')).toBe('');
  });
});

describe('flake budget and quarantine', () => {
  const day = 86400_000;
  const at = (ms: number) => new Date(NOW - ms).toISOString();
  it('quarantined matches a part or a whole suite, never past expiry', () => {
    const list = [{ suite: 'e2e-pad', owner: 'P', expiry: at(-day), reason: 'r' }, { suite: 'e2e-sectorops:6', owner: 'S', expiry: at(-day), reason: 'r' }, { suite: 'e2e-menus', owner: 'O', expiry: at(day), reason: 'old' }];
    expect(quarantined(list, 'e2e-pad', NOW)?.owner).toBe('P');
    expect(quarantined(list, 'e2e-sectorops:6', NOW)?.owner).toBe('S');
    expect(quarantined(list, 'e2e-sectorops:1', NOW)).toBeNull();
    expect(quarantined(list, 'e2e-menus', NOW)).toBeNull();
    expect(quarantined(undefined, 'e2e-pad', NOW)).toBeNull();
  });
  it('suiteOwner: the part, then the suite, then the orchestrator', () => {
    const owners = { 'e2e-sectorops': 'S', 'e2e-sectorops:6': 'S6' };
    expect(suiteOwner(owners, 'e2e-sectorops:6')).toBe('S6');
    expect(suiteOwner(owners, 'e2e-sectorops:1')).toBe('S');
    expect(suiteOwner(owners, 'smoke')).toBe(DEFAULT_OWNER);
  });
  it('countRuns adds today and drops days past the window', () => {
    const old = new Date(NOW - 9 * day).toISOString().slice(0, 10);
    const today = new Date(NOW).toISOString().slice(0, 10);
    const days = countRuns({ [old]: { smoke: 4 }, [today]: { smoke: 1 } }, ['smoke', 'e2e-pad'], NOW);
    expect(days).toEqual({ [today]: { smoke: 2, 'e2e-pad': 1 } });
  });
  it('flakeBudget: flaked suites only, over past the budget, worst first, old flakes ignored', () => {
    const today = new Date(NOW).toISOString().slice(0, 10);
    const flakes = [
      ...Array.from({ length: FLAKE_BUDGET + 1 }, (_, i) => ({ suite: 'e2e-ctcourse:1', date: at(i * 3600_000) })),
      { suite: 'e2e-sectorops:6', date: at(3600_000) },
      { suite: 'e2e-menus', date: at(8 * day) },
    ];
    const rows = flakeBudget(flakes, { [today]: { 'e2e-ctcourse:1': 10, 'e2e-sectorops:6': 4 } }, NOW);
    expect(rows.map((r: { suite: string; flakes: number; runs: number; over: boolean }) => [r.suite, r.flakes, r.runs, r.over])).toEqual([['e2e-ctcourse:1', FLAKE_BUDGET + 1, 10, true], ['e2e-sectorops:6', 1, 4, false]]);
    // runs never below flakes (runs counted before the budget existed)
    expect(flakeBudget([{ suite: 'x', date: at(0) }], {}, NOW)[0]).toMatchObject({ runs: 1, rate: 1 });
  });
  it('autoQuarantine: over-budget suites not already quarantined, owner from the map, 48 h', () => {
    const rows = [{ suite: 'e2e-ctcourse:1', runs: 10, flakes: 3, rate: 0.3, over: true }, { suite: 'e2e-pad', runs: 9, flakes: 5, rate: 0.5, over: true }, { suite: 'smoke', runs: 9, flakes: 1, rate: 0.1, over: false }];
    const repo = [{ suite: 'e2e-pad', owner: 'P', expiry: at(-day), reason: 'r' }];
    const out = autoQuarantine(rows, [repo, []], { 'e2e-ctcourse': 'Marlow' }, NOW);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ suite: 'e2e-ctcourse:1', owner: 'Marlow', auto: true, expiry: new Date(NOW + QUARANTINE_TTL_MS).toISOString() });
    expect(autoQuarantine(rows, [repo, out], {}, NOW)).toEqual([]);
  });
  it('an expired auto quarantine does not renew on the flakes that made it (checker FIX)', () => {
    const flakes = Array.from({ length: FLAKE_BUDGET + 1 }, (_, i) => ({ suite: 'e2e-ctcourse:1', date: at(3 * day + i * 60_000) }));
    const started = { 'e2e-ctcourse:1': at(3 * day - 3600_000) };
    expect(flakeBudget(flakes, {}, NOW)[0].over).toBe(true);
    const after = flakeBudget(flakes, {}, NOW, undefined, undefined, started);
    expect(after).toEqual([]);
    expect(autoQuarantine(after, [[]], {}, NOW)).toEqual([]);
    const later = [...flakes, ...Array.from({ length: FLAKE_BUDGET + 1 }, (_, i) => ({ suite: 'e2e-ctcourse:1', date: at(day - i * 60_000) }))];
    expect(flakeBudget(later, {}, NOW, undefined, undefined, started)[0]).toMatchObject({ flakes: FLAKE_BUDGET + 1, over: true });
  });
  it('flakeSummary: a table row per suite with its quarantine, empty for no rows', () => {
    expect(flakeSummary([], [], {}, NOW)).toBe('');
    const q = [{ suite: 'e2e-ctcourse:1', owner: 'Marlow', expiry: new Date(NOW + day).toISOString(), reason: 'r' }];
    const md = flakeSummary([{ suite: 'e2e-ctcourse:1', runs: 10, flakes: 3, rate: 0.3, over: true }, { suite: 'smoke', runs: 4, flakes: 1, rate: 0.25, over: false }], q, {}, NOW);
    expect(md).toContain('| e2e-ctcourse:1 | 3 / 10 (30%) | Marlow | until ');
    expect(md).toContain(`| smoke | 1 / 4 (25%) | ${DEFAULT_OWNER} | - |`);
  });
});

describe('staleTasks', () => {
  const ps = (args: string) => [{ execute: 'powershell', args }];
  const chain = ps('-NoProfile -WindowStyle Hidden -File C:\\NightShift\\scratch\\chain-1023af.ps1');
  const allow = ['NightShift-laptop-queue', 'NightShift-desktop-queue', 'NightShift auto-train'];
  const t = (name: string, state: string, actions = chain, ends: string[] = ['']) => ({ name, path: '\\', state, actions, ends });
  it('a NightShift-chain-* task is stale unless Disabled; a Running one is still listed (disabled, run left alone)', () => {
    expect(staleTasks([t('NightShift-chain-x', 'Ready')], allow)).toEqual([{ name: 'NightShift-chain-x', path: '\\', state: 'Ready', why: 'not on the allowlist' }]);
    expect(staleTasks([t('NightShift-chain-x', 'Disabled')], allow)).toEqual([]);
    expect(staleTasks([t('NightShift-chain-y', 'Running')], allow).map((x: { state: string }) => x.state)).toEqual(['Running']);
  });
  it('the allowlisted tasks are never stale, even with an action in scratch (auto-train runs a .vbs there)', () => {
    const vbs = [{ execute: 'wscript.exe', args: '//B //NoLogo "C:\\NightShift\\scratch\\auto-train-task.vbs"' }];
    expect(staleTasks([t('NightShift-laptop-queue', 'Running', ps('-Command "node scripts/laptop-queue/service.mjs"')), t('NightShift-desktop-queue', 'Ready'), t('NightShift auto-train', 'Ready', vbs)], allow)).toEqual([]);
    expect(staleTasks([t('NightShift-extra', 'Ready')], [...allow, 'NightShift-extra'])).toEqual([]);
  });
  it('NightShift-run-* is allowed only with an EndBoundary (one-shot-task.ps1)', () => {
    expect(staleTasks([t('NightShift-run-a', 'Ready', chain, ['2026-10-24T11:00:00Z'])], allow)).toEqual([]);
    expect(staleTasks([t('NightShift-run-b', 'Ready', chain, [''])], allow).map((x: { why: string }) => x.why)).toEqual(['not on the allowlist']);
    expect(staleTasks([t('NightShift-run-c', 'Ready', chain, [])], allow)).toHaveLength(1);
  });
  it('any other task is stale only when an action runs laptop-runner.ps1 or from C:\\NightShift\\scratch', () => {
    expect(staleTasks([t('MyRunner', 'Ready', ps('-File C:/Users/Micha/laptop-runner.ps1'))], allow)).toEqual([{ name: 'MyRunner', path: '\\', state: 'Ready', why: 'runs laptop-runner.ps1' }]);
    expect(staleTasks([t('Other', 'Ready', [{ execute: 'C:/NightShift/scratch/x.cmd', args: '' }])], allow).map((x: { why: string }) => x.why)).toEqual(['runs from C:\\NightShift\\scratch']);
    expect(staleTasks([t('MyRunner', 'Disabled', ps('-File laptop-runner.ps1'))], allow)).toEqual([]);
    expect(staleTasks([t('OneDrive Standalone Update Task', 'Ready', [{ execute: 'OneDriveSetup.exe', args: '/reporting' }])], allow)).toEqual([]);
  });
});

describe('trainHold', () => {
  it('holds alone requests while any open train lacks a laptop-e2e success', () => {
    expect(trainHold([])).toBe(null);
    expect(trainHold([{ n: '46', sha: 'a', laptop: 'success' }])).toBe(null);
    expect(trainHold([{ n: '46', sha: 'a', laptop: 'success' }, { n: '47', sha: 'b', laptop: '' }])).toEqual({ n: '47', sha: 'b', laptop: '' });
    expect(trainHold([{ n: '46', sha: 'a', laptop: 'failure' }])?.n).toBe('46'); // failed, still open: rerun or release pending
    expect(trainHold([{ n: '46', sha: 'a', laptop: 'pending' }])?.n).toBe('46');
  });
});

describe('duplicates', () => {
  const SHA = 'a8ff2d45d5054c0da3492d100771aecc3e4531af';
  const W = 60 * 60_000;
  const r = (min: number, tag: string, o: Record<string, unknown> = {}) => ({ id: idAt(min, tag), requester: 'A', kind: 'pr', sha: SHA, suites: ['e2e-coop', 'e2e-enemies'], ...o });
  const bake = { kind: 'alone', set: 'guard-bake-all', suites: undefined, steps: ['node a.mjs --probe', 'node a.mjs --stage sheet'], env: { E2E_GPU: '1' } };

  it('the same run from another requester, open and older, is the one kept', () => {
    const o = r(30, 'o');
    const n = r(10, 'n', { requester: 'B', suites: ['e2e-enemies', 'e2e-coop'] });
    expect([...duplicates([n, o], [], NOW, W)]).toEqual([[n.id, o.id]]);
  });
  it('a different set, jobs or pr is a different run (checker FIX: own context, solo rerun, failure comment)', () => {
    const o = r(30, 'o', { set: 'flag-on' });
    expect(duplicates([o, r(10, 'n', { set: 'flag-off' })], [], NOW, W).size).toBe(0);
    expect(duplicates([o, r(10, 'n')], [], NOW, W).size).toBe(0);
    expect(duplicates([o, r(10, 'n', { set: 'flag-on', jobs: 1 })], [], NOW, W).size).toBe(0);
    expect(duplicates([o, r(10, 'n', { set: 'flag-on', pr: 301 })], [], NOW, W).size).toBe(0);
    expect(duplicates([o, r(10, 'n', { set: 'flag-on', requester: 'B' })], [], NOW, W).size).toBe(1);
  });
  it('a request equal to a claimed or running one never runs; the active one is never marked', () => {
    const a = { ...r(30, 'a'), active: true };
    const n = r(10, 'n');
    expect([...duplicates([a, n], [], NOW, W)]).toEqual([[n.id, a.id]]);
    expect(duplicates([{ ...r(5, 'b'), active: true }, a], [], NOW, W).size).toBe(0);
  });
  it('alone requests match on steps in order and env (the a8ff2d45 57-min bake, sent twice 34 s apart)', () => {
    const first = r(1, 'first', bake);
    const again = r(0, 'again', { ...bake, requester: 'Player Build' });
    expect(duplicates([first, again], [], NOW, W).get(again.id)).toBe(first.id);
    expect(duplicates([first, r(0, 'swap', { ...bake, steps: [...bake.steps].reverse() })], [], NOW, W).size).toBe(0);
    expect(duplicates([first, r(0, 'cpu', { ...bake, env: { E2E_GPU: '0' } })], [], NOW, W).size).toBe(0);
  });
  it('the real a8ff2d45 pair (pr e2e-enemies set gm-enemies-off, then the alone bake) is two different runs', () => {
    const pr = r(1, 'pr', { requester: 'player-build', suites: ['e2e-enemies'], set: 'gm-enemies-off' });
    const al = r(0, 'al', { requester: 'player-build', ...bake });
    expect(duplicates([pr, al], [], NOW, W).size).toBe(0);
  });
  it('a different sha, kind or suite list is kept', () => {
    const o = r(30, 'o');
    expect(duplicates([o, r(10, 'n', { sha: 'b'.repeat(40) })], [], NOW, W).size).toBe(0);
    expect(duplicates([o, r(10, 'n', { suites: ['e2e-coop'] })], [], NOW, W).size).toBe(0);
    expect(duplicates([r(30, 'f', { kind: 'full', suites: undefined }), r(10, 'n', { kind: 'full', suites: undefined })], [], NOW, W).size).toBe(1);
    expect(duplicates([r(30, 'f', { kind: 'full', suites: undefined }), r(10, 'n')], [], NOW, W).size).toBe(0);
  });
  it('only a request done with success within the window is matched (never a failure: a rerun of it is meant to run)', () => {
    const n = r(5, 'n');
    const done = (min: number, result: string) => ({ id: idAt(min + 20, 'd'), key: dupKey(r(0, 'x')), result, date: new Date(NOW - min * 60_000).toISOString() });
    for (const bad of ['failure', 'error', 'build', 'nosha', 'incomplete']) expect(duplicates([n], [done(30, bad)], NOW, W).size).toBe(0);
    expect(duplicates([n], [done(30, 'success')], NOW, W).get(n.id)).toBe(done(30, 'success').id);
    expect(duplicates([n], [done(61, 'success')], NOW, W).size).toBe(0);
    expect(duplicates([n], [done(10, 'superseded'), done(10, 'duplicate')], NOW, W).size).toBe(0);
    expect(duplicates([n], [{ id: 'old', result: 'success', date: new Date(NOW).toISOString() }], NOW, W).size).toBe(0);
  });
  it('checker scenarios: a desktop failure then a laptop re-request; a --jobs 1 solo rerun of a failure; another --set', () => {
    const first = r(40, 'desk', { requester: 'guard-ai', pr: 300 });
    const doneAs = (result: string) => [{ id: first.id, key: dupKey(first), result, date: new Date(NOW - 20 * 60_000).toISOString() }];
    // the desktop ran it and failed: the same request again (to run on the laptop) runs
    const again = r(10, 'again', { requester: 'guard-ai', pr: 300 });
    expect(duplicates([again], doneAs('failure'), NOW, W).size).toBe(0);
    expect(duplicates([again], doneAs('success'), NOW, W).get(again.id)).toBe(first.id);
    // a solo rerun of the failure at --jobs 1 runs, even next to a success of the default run
    const solo = r(10, 'solo', { requester: 'guard-ai', pr: 300, jobs: 1 });
    expect(duplicates([solo], doneAs('failure'), NOW, W).size).toBe(0);
    expect(duplicates([solo], doneAs('success'), NOW, W).size).toBe(0);
    // another set of the same suites on the same sha (a flag off / on pair) runs, open, active or done
    const other = r(10, 'other', { requester: 'guard-ai', pr: 300, set: 'gm-off' });
    expect(duplicates([other], doneAs('success'), NOW, W).size).toBe(0);
    expect(duplicates([{ ...first, active: true }, other], [], NOW, W).size).toBe(0);
  });
  it('three equal open requests all point at the oldest', () => {
    const [a, b, c] = [r(30, 'a'), r(20, 'b'), r(10, 'c')];
    const m = duplicates([c, b, a], [], NOW, W);
    expect(m.get(b.id)).toBe(a.id);
    expect(m.get(c.id)).toBe(a.id);
    expect(m.has(a.id)).toBe(false);
  });
});

describe('agedAlone', () => {
  it('the oldest alone request past ALONE_AGE_MIN, else null', () => {
    expect(ALONE_AGE_MIN).toBe(30);
    const young = req(20, 'alone', 'y');
    const old = req(40, 'alone', 'o');
    const older = req(90, 'alone', 'oo');
    expect(agedAlone([young], NOW)).toBeNull();
    expect(agedAlone([young, old, older], NOW)).toBe(older);
    expect(agedAlone([req(90, 'pr', 'p')], NOW)).toBeNull();
    expect(agedAlone([], NOW)).toBeNull();
  });
  it('pick: an alone request over 30 min blocks new pr work until both slots drain', () => {
    const q = { trains: [], requests: [req(35, 'alone', 'a'), req(5, 'pr', 'p')] };
    expect(pick(q, NOW, slots(true, false))).toBeNull();
    expect(pick(q, NOW, slots(false, false))?.request.id).toBe(q.requests[0]?.id);
  });
});

describe('trainSoon', () => {
  const lim = { gapMs: 3 * 60_000, buildMaxMs: 20 * 60_000 };
  it('holds while a train builds, up to buildMaxMs', () => {
    expect(trainSoon({ building: { n: '61', ageMs: 60_000 } }, lim)).toBe('train 61 building');
    expect(trainSoon({ building: { n: '61', ageMs: 21 * 60_000 } }, lim)).toBe('');
  });
  it('holds gapMs after a release only while train-ready PRs wait', () => {
    expect(trainSoon({ release: { n: '60', ageMs: 60_000 }, candidates: 2 }, lim)).toMatch(/^train 60 released, 2 /);
    expect(trainSoon({ release: { n: '60', ageMs: 60_000 }, candidates: 0 }, lim)).toBe('');
    expect(trainSoon({ release: { n: '60', ageMs: 4 * 60_000 }, candidates: 2 }, lim)).toBe('');
    expect(trainSoon({}, lim)).toBe('');
  });
  it('releasing: holds up to 10 min after an open train laptop-e2e success while train-ready PRs are next', () => {
    expect(RELEASE_HOLD_MS).toBe(10 * 60_000);
    // train 67 success at 22:28:28, an alone claim at 22:28:45 (17 s later) was preempted by train 68 at 22:34
    expect(trainSoon({ releasing: { n: '67', ageMs: 17_000 }, candidates: 1 }, lim)).toBe('train 67 releasing, 1 train-ready PR(s) next');
    expect(trainSoon({ releasing: { n: '67', ageMs: 9 * 60_000 }, candidates: 3 }, lim)).toMatch(/^train 67 releasing/);
    expect(trainSoon({ releasing: { n: '67', ageMs: 10 * 60_000 }, candidates: 3 }, lim)).toBe('');
    expect(trainSoon({ releasing: { n: '67', ageMs: 60_000 }, candidates: 0 }, lim)).toBe('');
    expect(trainSoon({ releasing: { n: '67', ageMs: 60_000 }, candidates: 1 }, { ...lim, releaseMs: 30_000 })).toBe('');
    // building wins (a new train with no version head yet beside a releasing one)
    expect(trainSoon({ building: { n: '68', ageMs: 1000 }, releasing: { n: '67', ageMs: 1000 }, candidates: 1 }, lim)).toBe('train 68 building');
  });
  it('releasingTrain: the youngest laptop-e2e success among the open heads', () => {
    const at = (min: number) => new Date(NOW - min * 60_000).toISOString();
    expect(releasingTrain([{ n: '67', laptop: 'success', laptopAt: at(2) }], NOW)).toEqual({ n: '67', ageMs: 2 * 60_000 });
    expect(releasingTrain([{ n: '67', laptop: 'success', laptopAt: at(8) }, { n: '68', laptop: 'success', laptopAt: at(1) }], NOW)?.n).toBe('68');
    expect(releasingTrain([{ n: '67', laptop: 'pending', laptopAt: at(1) }, { n: '68', laptop: '', laptopAt: '' }], NOW)).toBeNull();
    expect(releasingTrain([{ n: '67', laptop: 'success', laptopAt: '' }], NOW)).toBeNull(); // no time: no hold
    expect(releasingTrain([], NOW)).toBeNull();
  });
  it('readyOrPending: train-ready PRs whose check passed or still runs, not the open train members', () => {
    const prs = [
      { head: 'a', check: { status: 'COMPLETED', conclusion: 'SUCCESS' } },
      { head: 'b', check: { status: 'IN_PROGRESS', conclusion: '' } },
      { head: 'c', check: { status: 'QUEUED', conclusion: null } },
      { head: 'd', check: { status: 'COMPLETED', conclusion: 'FAILURE' } },
      { head: 'e', check: null },
    ];
    expect(readyOrPending(prs)).toBe(3);
    expect(readyOrPending(prs, (h: string) => h === 'a')).toBe(2);
    expect(readyOrPending([])).toBe(0);
    expect(readyOrPending(undefined)).toBe(0);
  });
});

describe('desktop failures rechecked on the laptop', () => {
  const r = { id: idAt(5, 'player'), sha: 'b'.repeat(40), branch: 'feature/x', pr: 412, kind: 'pr', requester: 'Night Shift | Player Build', suites: ['e2e-coop', 'e2e-menus', 'e2e-mouse'] };
  it('median of the finite CPU samples', () => {
    expect(median([50, 95, 92])).toBe(92);
    expect(median([80, 100])).toBe(90);
    expect(median([NaN, 70])).toBe(70);
    expect(median([])).toBeNaN();
  });
  it('the pending description names the failed suites and the CPU, flags cpu>90%, fits 140 chars', () => {
    expect(DESKTOP_HOT_CPU).toBe(90);
    expect(desktopFailDesc(['e2e-coop', 'e2e-menus'], 87.4)).toBe('desktop FAIL e2e-coop,e2e-menus (cpu 87%), laptop rerun queued');
    expect(desktopFailDesc(['e2e-coop'], 93)).toBe('desktop FAIL e2e-coop (cpu 93%), laptop rerun queued; desktop cpu>90%');
    expect(desktopFailDesc(['e2e-coop'], 90)).not.toMatch(/cpu>90/);
    expect(desktopFailDesc(['e2e-coop'], NaN)).toBe('desktop FAIL e2e-coop (cpu ?%), laptop rerun queued');
    const long = desktopFailDesc(Array.from({ length: 20 }, (_, i) => `e2e-suite-${i}`), 99);
    expect(long.length).toBeLessThanOrEqual(140);
    expect(long).toMatch(/\.\.\. \(cpu 99%\), laptop rerun queued; desktop cpu>90%$/);
  });
  it('the laptop rerun keeps sha / set / pr / requester, runs the failed suites, posts on the same context', () => {
    const rr = laptopRerunRequest(r, ['e2e-menus'], { now: NOW, suffix: 'abcd' });
    expect(rr).toMatchObject({ sha: r.sha, branch: 'feature/x', pr: 412, kind: 'pr', requester: r.requester, suites: ['e2e-menus'], laptopRerun: true });
    expect(rr.id).toBe(`${requestId(NOW, r.requester, r.sha)}-abcd`);
    expect(requestProblem(rr)).toBe('');
    // no set: the old suites become the set, so the verdict lands on the context the desktop left pending
    expect(contextName(rr.kind, rr.set, rr.suites)).toBe(contextName(r.kind, undefined, r.suites));
    const aff = { ...r, requester: AFFECTED_REQUESTER, set: 'affected' };
    expect(laptopRerunRequest(aff, ['e2e-coop'], { now: NOW, suffix: 'ef01' })).toMatchObject({ set: 'affected', requester: AFFECTED_REQUESTER });
    expect(requestProblem({ ...rr, kind: 'alone', steps: ['x'] })).toMatch(/laptop rerun needs kind pr/);
  });
  it('a laptop rerun is never a duplicate of the desktop run it rechecks and supersedes nothing', () => {
    const rr = laptopRerunRequest(r, r.suites, { now: NOW, suffix: 'abcd' });
    expect(dupKey(rr)).not.toBe(dupKey({ ...r, set: rr.set }));
    expect(duplicates([rr, { ...r, set: rr.set, active: true }], [], NOW, 3600_000).size).toBe(0);
    // an older open request of the same requester and set is not retired by the rerun
    const older = { ...r, id: idAt(30, 'player'), set: rr.set };
    expect(superseded([older, rr], () => true).size).toBe(0);
    // a newer request still supersedes the rerun
    const newer = { ...r, id: idAt(-5, 'player'), set: rr.set };
    expect(superseded([rr, newer], () => true).get(rr.id)).toBe(newer.id);
    // plain keys unchanged (state.done keys written before stay comparable)
    expect(JSON.parse(dupKey(r))).toHaveLength(8);
  });
});

describe('manualLocks', () => {
  it('lists slots whose lock is not the service own', () => {
    expect(manualLocks({ 4189: 'Player | perf | 2026', 4192: 'laptop-queue | x pid 1 | t', 4191: null })).toEqual({ 4189: 'Player | perf | 2026' });
    expect(manualLocks({ 4189: '', 4192: undefined })).toEqual({});
  });
});

describe('holdClears', () => {
  it('only a train with no laptop verdict yet or a pending one can clear its hold by running', () => {
    expect(holdClears({ n: '57', sha: 'a', laptop: '' })).toBe(true);
    expect(holdClears({ n: '57', sha: 'a', laptop: 'pending' })).toBe(true);
    expect(holdClears({ n: '57', sha: 'a' })).toBe(true);
    expect(holdClears({ n: '57', sha: 'a', laptop: 'failure' })).toBe(false);
    expect(holdClears({ n: '57', sha: 'a', laptop: 'error' })).toBe(false);
    expect(holdClears({ n: '?', sha: '', laptop: 'unknown' })).toBe(false);
    expect(holdClears(null)).toBe(false);
  });
});

describe('cutShort', () => {
  const t = { sha: 'a'.repeat(40), n: '57' };
  it('a withdrawn request stops whatever its kind or phase', () => {
    for (const kind of ['pr', 'full', 'alone']) {
      expect(cutShort({ kind }, { withdrawn: true })).toBe('withdrawn');
      expect(cutShort({ kind }, { withdrawn: true, trains: [t], started: true })).toBe('withdrawn');
    }
    expect(cutShort({ kind: 'pr', trainRerun: true }, { withdrawn: true })).toBe('withdrawn');
  });
  it('a pending train preempts a plain pr request only once its suites started', () => {
    expect(cutShort({ kind: 'pr' }, { trains: [t], started: true })).toBe('train');
    expect(cutShort({ kind: 'pr' }, { trains: [t], started: false })).toBe('');
    expect(cutShort({ kind: 'pr' }, { trains: [], started: true })).toBe('');
  });
  it('never preempts beside a run that cannot give way (the train needs both slots)', () => {
    const run = { trains: [t], started: true };
    expect(cutShort({ kind: 'pr' }, { ...run, others: [{ kind: 'pr' }] })).toBe('train');
    expect(cutShort({ kind: 'pr' }, { ...run, others: [{ kind: 'full' }] })).toBe('');
    expect(cutShort({ kind: 'pr' }, { ...run, others: [{ kind: 'alone' }] })).toBe('');
    expect(cutShort({ kind: 'pr' }, { ...run, others: [{ kind: 'pr', trainRerun: true }] })).toBe('');
    expect(cutShort({ kind: 'pr' }, { withdrawn: true, others: [{ kind: 'full' }] })).toBe('withdrawn');
  });
  it('never preempts a train rerun, a full run or an alone run past its first minutes', () => {
    expect(cutShort({ kind: 'pr', trainRerun: true }, { trains: [t], started: true })).toBe('');
    expect(cutShort({ kind: 'full' }, { trains: [t], started: true })).toBe('');
    expect(cutShort({ kind: 'alone' }, { trains: [t], started: true })).toBe(''); // no start time known
    expect(cutShort({ kind: 'alone' }, { trains: [t], started: true, startedAt: NOW - ALONE_PREEMPT_MIN * 60_000, now: NOW })).toBe('');
    expect(cutShort({ kind: 'pr' })).toBe('');
  });
  it('a pr run at or past PREEMPT_MAX_PROGRESS of its expected wall finishes; unknown progress cuts as before', () => {
    const run = { trains: [t], started: true };
    expect(PREEMPT_MAX_PROGRESS).toBe(0.8);
    expect(cutShort({ kind: 'pr' }, { ...run, progress: 0.79 })).toBe('train');
    expect(cutShort({ kind: 'pr' }, { ...run, progress: 0.8 })).toBe('');
    expect(cutShort({ kind: 'pr' }, { ...run, progress: 1.4 })).toBe('');
    expect(cutShort({ kind: 'pr' }, { ...run, progress: NaN })).toBe('train');
    expect(cutShort({ kind: 'pr' }, { ...run, progress: 0.9, withdrawn: true })).toBe('withdrawn');
  });
  it('a pending train cuts an alone run whose steps started under ALONE_PREEMPT_MIN ago', () => {
    const young = { trains: [t], started: true, startedAt: NOW - 4 * 60_000, now: NOW };
    expect(ALONE_PREEMPT_MIN).toBe(10);
    expect(cutShort({ kind: 'alone' }, young)).toBe('train');
    expect(cutShort({ kind: 'alone' }, { ...young, trains: [] })).toBe('');
    expect(cutShort({ kind: 'alone' }, { ...young, started: false })).toBe(''); // before its steps: yieldTo gives the slots back
    expect(cutShort({ kind: 'full' }, young)).toBe('');
  });
});

describe('runProgress / aloneSoon', () => {
  it('progress is elapsed over the heaviest bin of the suites at that many jobs', () => {
    const times = { a: 100, b: 100, c: 50 };
    expect(runProgress(['a', 'b'], times, 2, 50_000)).toBeCloseTo(0.5);
    expect(runProgress(['a', 'b'], times, 1, 100_000)).toBeCloseTo(0.5);
    // a named suite counts as its parts (times.json holds e2e-desktop:1..n), ahead of a stale base key
    const parts = { 'e2e-desktop:1': 40, 'e2e-desktop:2': 44, 'e2e-sectorops': 43, 'e2e-sectorops:1': 117 };
    expect(runProgress(['e2e-desktop'], parts, 1, 42_000)).toBeCloseTo(0.5);
    expect(runProgress(['e2e-desktop'], parts, 2, 22_000)).toBeCloseTo(0.5);
    expect(runProgress(['e2e-sectorops'], parts, 1, 117_000)).toBeCloseTo(1);
    // any suite with no time at all: unknown (cut as before), never a 1 s guess (checker FIX)
    expect(runProgress(['a', 'x'], times, 1, 150_000)).toBeNaN();
    expect(runProgress(['x'], times, 1, 150_000)).toBeNaN();
    expect(runProgress([], times, 1, 1000)).toBeNaN();
    expect(runProgress(['a'], {}, 1, 1000)).toBeNaN();
  });
  it('expectedWallS: the heaviest bin in s (the train posts it as "expect ~N s")', () => {
    const times = { a: 100, b: 100, c: 50 };
    expect(expectedWallS(['a', 'b', 'c'], times, 2)).toBe(150);
    expect(expectedWallS(['a', 'b'], times, 1)).toBe(200);
    expect(expectedWallS(['a', 'x'], times, 1)).toBeNaN();
    expect(expectedWallS([], times, 1)).toBeNaN();
  });
  it('alone claims wait while a green train-ready PR has no train yet', () => {
    expect(aloneSoon(0, 1)).toMatch(/1 train-ready PR/);
    expect(aloneSoon(1, 3)).toBe(''); // a train is open: the train hold applies instead
    expect(aloneSoon(0, 0)).toBe('');
  });
});

describe('yieldTo', () => {
  const t = { sha: 'a'.repeat(40), n: '47' };
  it('a run not yet in its suites / steps yields to the first pending train', () => {
    expect(yieldTo({ kind: 'pr' }, false, [t])).toBe(t);
    expect(yieldTo({ kind: 'alone' }, false, [t, { ...t, n: '48' }])).toBe(t);
  });
  it('never once started, without a train, or for a train rerun', () => {
    expect(yieldTo({ kind: 'pr' }, true, [t])).toBeNull();
    expect(yieldTo({ kind: 'full' }, false, [])).toBeNull();
    expect(yieldTo({ kind: 'pr', trainRerun: true }, false, [t])).toBeNull();
  });
});

describe('train reruns', () => {
  const rerun = (min: number, tag = 'rr') => ({ ...req(min, 'pr', tag, 'auto-train'), trainRerun: true, pr: 301, suites: ['e2e-coop'] });
  it('goes right after trains, ahead of older pr work and an aged alone run, on one free slot', () => {
    const rr = rerun(1);
    const q = { trains: [], requests: [req(30, 'pr', 'p'), req(60, 'alone', 'al'), rr] };
    expect(pick(q, NOW, slots(false, false))).toEqual({ kind: 'request', request: rr, slot: '4189' });
    expect(pick(q, NOW, slots(true, false))).toEqual({ kind: 'request', request: rr, slot: '4192' });
    expect(pick(q, NOW, slots(true, true))).toBeNull();
    expect(pick({ trains: [train], requests: [rr] }, NOW, slots(false, false))).toEqual({ kind: 'train', train });
  });
  it('the oldest rerun first', () => {
    const a = rerun(20, 'a');
    expect(pick({ trains: [], requests: [rerun(5, 'b'), a] }, NOW, slots(false, false))?.request).toBe(a);
  });
  it('context, description and validation', () => {
    // with a set: the normal set context (auto-train's --set train<n>-rerun is what it reads back)
    expect(contextName('pr', 'train47-rerun', ['e2e-coop', 'e2e-netmove'], true)).toBe('laptop-e2e/train47-rerun');
    expect(contextName('pr', '', ['e2e-coop', 'e2e-netmove'], true)).toBe('laptop-e2e/rerun-coop+netmove');
    expect(contextName('pr', undefined, ['e2e-coop'], true)).toBe('laptop-e2e/rerun-coop');
    expect(contextName('pr', '', ['e2e-' + 'x'.repeat(60)], true).length).toBe('laptop-e2e/'.length + 40);
    expect(rerunPassed(['e2e-coop', 'e2e-netmove'])).toBe('laptop rerun passed: e2e-coop,e2e-netmove (desktop fail)');
    expect(rerunPassed(['e2e-coop'], 'confirm rerun')).toBe('laptop rerun passed: e2e-coop (confirm rerun)');
    const long = rerunPassed(Array.from({ length: 20 }, (_, i) => `e2e-suite-${i}`));
    expect(long.length).toBe(140);
    expect(long.endsWith('... (desktop fail)')).toBe(true);
    const ok = { id: 'x', sha: 'a'.repeat(40), kind: 'pr', suites: ['e2e-coop'], trainRerun: true, pr: 301 };
    expect(requestProblem(ok)).toBe('');
    expect(requestProblem({ ...ok, pr: null })).toMatch(/train rerun/);
    expect(requestProblem({ ...ok, kind: 'full' })).toMatch(/train rerun/);
  });
  it('a rerun and a plain request are never superseded by or duplicates of each other', () => {
    const plain = { ...req(30, 'pr', 'p', 'auto-train'), sha: 'a'.repeat(40), suites: ['e2e-coop'] };
    const rr = { ...rerun(10), sha: 'a'.repeat(40) };
    expect(superseded([plain, rr], () => true).size).toBe(0);
    expect(duplicates([plain, rr], [], NOW, 3600_000).size).toBe(0);
  });
});

describe('pruneDone', () => {
  const at = (days: number) => new Date(NOW - days * 24 * 3600_000).toISOString();
  const WEEK = 7 * 24 * 3600_000;
  it('drops entries over 7 days old whose done claim is on the branch; keeps new, unsynced and undated ones', () => {
    const done = { old: { result: 'success', date: at(8) }, oldUnsynced: { result: 'failure', date: at(9) }, fresh: { result: 'failure', date: at(1) }, nodate: { result: 'success' } };
    const out = pruneDone(done, NOW, WEEK, (id: string) => id !== 'oldUnsynced');
    expect(Object.keys(out).sort()).toEqual(['fresh', 'nodate', 'oldUnsynced']);
    expect(done).toHaveProperty('old'); // a new object
    expect(Object.keys(pruneDone(done, NOW, WEEK))).not.toContain('old');
  });
});

describe('buildMarker', () => {
  const MAX = 30 * 60_000;
  const at = (min: number) => new Date(NOW - min * 60_000).toISOString();
  const text = (min: number) => JSON.stringify({ train: '48', version: '4.80.0', pid: 123, at: at(min) });
  it('no file, no marker', () => {
    expect(buildMarker(null, NaN, NOW, MAX)).toBeNull();
  });
  it('a fresh marker blocks, one over the limit is stale', () => {
    expect(buildMarker(text(5), NaN, NOW, MAX)).toMatchObject({ train: '48', stale: false, ageMs: 5 * 60_000 });
    expect(buildMarker(text(30), NaN, NOW, MAX)?.stale).toBe(true);
  });
  it('an unreadable marker ages from the file time', () => {
    expect(buildMarker('{oops', NOW - 60_000, NOW, MAX)).toMatchObject({ train: '?', stale: false });
    expect(buildMarker('', NOW - 31 * 60_000, NOW, MAX)?.stale).toBe(true);
  });
  it('the key changes per marker (logged once each)', () => {
    expect(buildMarker(text(5), NaN, NOW, MAX)?.key).not.toBe(buildMarker(text(4), NaN, NOW, MAX)?.key);
    expect(buildMarker(text(5), NaN, NOW + 1000, MAX)?.key).toBe(buildMarker(text(5), NaN, NOW, MAX)?.key);
  });
});

describe('affected e2e on every PR head', () => {
  const SHA = (c: string) => c.repeat(40);
  const pr = (n: number, o: Record<string, unknown> = {}) => ({ number: n, headRefName: `feature/p${n}`, headRefOid: SHA(String(n % 10)), isDraft: false, labels: [], statusCheckRollup: [], ...o });

  it('affectedSuites: merge-base diff through the DIRECT map, wide through WIDE, null on a git failure', () => {
    const calls: string[][] = [];
    const run = (files: string) => (args: string[]) => { calls.push(args); return args[0] === 'merge-base' ? 'b'.repeat(40) : files; };
    const got = affectedSuites(run('docs/x.md\nsrc/game/sectors/a.ts\n'), SHA('1'));
    expect(calls).toEqual([['merge-base', 'origin/master', SHA('1')], ['diff', '--name-only', '--no-renames', 'b'.repeat(40), SHA('1')]]);
    expect(got.files).toEqual(['docs/x.md', 'src/game/sectors/a.ts']);
    expect(got.suites).toContain('smoke');
    expect(got.suites).toContain('e2e-sectorops');
    expect(affectedSuites(run('docs/a.md\ntests/b.test.ts'), SHA('1')).suites).toEqual([]);
    expect(affectedSuites(run(''), SHA('1')).suites).toEqual([]);
    expect(affectedSuites(() => { throw new Error('no'); }, SHA('1'))).toBeNull();
    expect(affectedSuites(() => '', SHA('1'))).toBeNull();
    const wide = affectedSuites(run('src/game/sectors/a.ts'), SHA('1'), { wide: true });
    expect(wide.suites).toEqual(selectSuites(['src/game/sectors/a.ts'], WIDE_COVERS));
  });
  it('affectedNeeds: skips trains, drafts, the skip label, heads with a status, open requests and enqueued shas', () => {
    const prs = [
      pr(1),
      pr(2, { headRefName: 'train/66' }),
      pr(3, { isDraft: true }),
      pr(4, { labels: [{ name: AFFECTED_SKIP_LABEL }] }),
      pr(5, { statusCheckRollup: [{ context: AFFECTED_CTX, state: 'PENDING' }] }),
      pr(6, { statusCheckRollup: [{ name: 'check', conclusion: 'SUCCESS' }, { context: 'laptop-e2e/affected', state: 'SUCCESS' }] }),
      pr(7),
      pr(8),
      pr(9, { headRefOid: 'not-a-sha' }),
    ];
    const open = [{ requester: AFFECTED_REQUESTER, sha: SHA('7') }, { requester: 'lead', sha: SHA('8') }];
    expect(affectedNeeds(prs, open, new Set([SHA('1')]))).toEqual([
      { pr: 6, sha: SHA('6'), branch: 'feature/p6' },
      { pr: 8, sha: SHA('8'), branch: 'feature/p8' },
    ]);
    expect(affectedNeeds([pr(1)]).map((x: { pr: number }) => x.pr)).toEqual([1]);
  });
  it('affectedRequest: the request.mjs --affected shape, valid for requestProblem', () => {
    const r = affectedRequest({ now: NOW, pr: 12, sha: SHA('a'), branch: 'feature/x', suites: ['smoke', 'e2e-coop'], suffix: 'beef' });
    expect(r).toEqual({ id: `20261023T200000-affected-e2e-aaaaaaaa-beef`, sha: SHA('a'), branch: 'feature/x', pr: 12, kind: 'pr', requester: AFFECTED_REQUESTER, suites: ['smoke', 'e2e-coop'], set: 'affected', note: 'auto affected-e2e, PR #12' });
    expect(requestProblem(r)).toBe('');
    expect(contextName(r.kind, r.set, r.suites)).toBe('laptop-e2e/affected');
  });
  it('supersede: a newer head on the same branch retires the older, another PR never does', () => {
    const a = (min: number, tag: string, branch: string, sha: string) => ({ id: idAt(min, tag), requester: AFFECTED_REQUESTER, kind: 'pr', set: 'affected', sha, branch, suites: ['smoke'] });
    const old = a(30, 'o', 'feature/x', SHA('1'));
    const other = a(20, 'p', 'feature/y', SHA('2'));
    const newer = a(10, 'n', 'feature/x', SHA('3'));
    const m = superseded([old, other, newer], () => false);
    expect([...m]).toEqual([[old.id, newer.id]]);
    expect(superseded([old, other], () => true).size).toBe(0);
    expect(queueRequester(old)).toBe('affected-e2e:feature/x');
    expect(queueRequester({ requester: 'lead', branch: 'feature/x' })).toBe('lead');
  });
  it('pick: each PR branch queues as its own requester (arrival order kept with the leads)', () => {
    const a = (min: number, tag: string, branch: string) => ({ id: idAt(min, tag), requester: AFFECTED_REQUESTER, kind: 'pr', branch });
    const x1 = a(50, 'x1', 'feature/x');
    const lead = req(40, 'pr', 'l1', 'Lead');
    const y1 = a(30, 'y1', 'feature/y');
    expect(pick({ trains: [], requests: [y1, lead, x1] }, NOW, slots(false, false))?.request).toBe(x1);
    expect(pick({ trains: [], requests: [y1, lead] }, NOW, slots(false, false))?.request).toBe(lead);
  });
});

describe('supersedeStatuses', () => {
  const orig = { id: '20261024T120000-guard-ai-aaaaaaaa', sha: 'a'.repeat(40), kind: 'pr', requester: 'guard-ai', suites: ['e2e-coop', 'e2e-menus'], set: '' };
  it('a superseded laptop rerun closes the desktop FAIL pending on its context; plain requests post nothing', () => {
    const rr = laptopRerunRequest(orig, ['e2e-coop'], { now: Date.UTC(2026, 9, 24, 12, 30), suffix: 'beef' });
    expect(supersedeStatuses(rr, 'NEW-ID')).toEqual([{ sha: orig.sha, state: 'error', context: contextName('pr', '', orig.suites), description: 'superseded by NEW-ID' }]);
    expect(supersedeStatuses(orig, 'NEW-ID')).toEqual([]);
    expect(supersedeStatuses(undefined, 'NEW-ID')).toEqual([]);
  });
  it('an affected request closes affected-e2e; its laptop rerun closes both', () => {
    const aff = { ...orig, requester: AFFECTED_REQUESTER, set: 'affected' };
    expect(supersedeStatuses(aff, 'N')).toEqual([{ sha: orig.sha, state: 'error', context: AFFECTED_CTX, description: 'superseded by a newer head (N)' }]);
    const rr = laptopRerunRequest(aff, ['e2e-coop'], { now: Date.UTC(2026, 9, 24, 12, 30), suffix: 'beef' });
    expect(supersedeStatuses(rr, 'N').map((x: { context: string }) => x.context)).toEqual(['laptop-e2e/affected', AFFECTED_CTX]);
  });
});

describe('spare work when the laptop is idle', () => {
  const sha = 'b'.repeat(40);
  const jobs = [{ set: 'spare-full', kind: 'full' }, { set: 'spare-soak', kind: 'alone', steps: ['x --out=C:/s/spare-<sha8>-<n>'] }, { set: 'spare-pr', kind: 'pr', suites: ['e2e-coop'] }];
  const base = { now: NOW, idleSince: NOW - 6 * 60_000, idleMin: 5, openSpare: false, sha, jobs, history: undefined };
  it('waits for idle minutes, an open spare request, a master sha; off at 0', () => {
    expect(spareNext({ ...base, idleMin: 0 })).toEqual({ why: 'off' });
    expect(spareNext({ ...base, idleSince: null })).toEqual({ why: 'not idle' });
    expect(spareNext({ ...base, idleSince: NOW - 4 * 60_000 }).why).toBe('idle 4/5 min');
    expect(spareNext({ ...base, openSpare: true }).why).toMatch(/open/);
    expect(spareNext({ ...base, sha: '' }).why).toMatch(/sha/);
    expect(spareNext({ ...base, jobs: [] }).why).toMatch(/no spare jobs/);
  });
  it('goes round-robin and never repeats a set on the same sha', () => {
    expect(spareNext(base)).toEqual({ job: jobs[0], index: 0 });
    let h = spareRecord(undefined, sha, 0, 'spare-full');
    expect(h).toEqual({ last: 0, n: 1, ran: { [sha]: ['spare-full'] } });
    expect(spareNext({ ...base, history: h })).toMatchObject({ index: 1 });
    h = spareRecord(spareRecord(h, sha, 1, 'spare-soak'), sha, 2, 'spare-pr');
    expect(spareNext({ ...base, history: h }).why).toMatch(/every spare job already ran on bbbbbbbb/);
    // a new master sha starts over after the last index, the old sha's record dropped
    const next = spareNext({ ...base, sha: 'c'.repeat(40), history: h });
    expect(next).toMatchObject({ index: 0 });
    expect(spareRecord(h, 'c'.repeat(40), 0, 'spare-full').ran).toEqual({ ['c'.repeat(40)]: ['spare-full'] });
    // a set queued out of order is skipped
    expect(spareNext({ ...base, history: { last: 2, ran: { [sha]: ['spare-full'] } } })).toMatchObject({ index: 1 });
  });
  it('builds an ordinary valid request per kind', () => {
    const full = spareRequest({ now: NOW, job: jobs[0], sha, n: 3, suffix: 'abcd' });
    expect(full).toMatchObject({ kind: 'full', requester: SPARE_REQUESTER, set: 'spare-full', branch: '', pr: null });
    expect(full.id).toMatch(/-laptop-queue-spare-bbbbbbbb-abcd$/);
    const alone = spareRequest({ now: NOW, job: jobs[1], sha, n: 3, suffix: 'abcd' });
    expect(alone.steps).toEqual(['x --out=C:/s/spare-bbbbbbbb-3']);
    const pr = spareRequest({ now: NOW, job: jobs[2], sha, n: 3, suffix: 'abcd' });
    for (const r of [full, alone, pr]) expect(requestProblem(r)).toBe('');
  });
  it('docs/laptop-queue/spare-jobs.json gives valid requests with known suites', async () => {
    const fs = await import('node:fs');
    const list = JSON.parse(fs.readFileSync('docs/laptop-queue/spare-jobs.json', 'utf8')).jobs as { set: string }[];
    const known = knownSuites(fs.readdirSync('scripts').map((f: string) => `scripts/${f}`));
    expect(new Set(list.map((j) => j.set)).size).toBe(list.length);
    for (const job of list) expect(requestProblem(spareRequest({ now: NOW, job, sha, n: 1, suffix: 'abcd' }), { known })).toBe('');
  });
});

describe('spare work never holds a train or jumps a real request', () => {
  const t = { sha: 'c'.repeat(40), n: '70' };
  it('cutShort: a pending train stops a spare run whatever its kind, age or progress', () => {
    for (const kind of ['pr', 'full', 'alone']) {
      const r = { kind, requester: SPARE_REQUESTER };
      expect(cutShort(r, { trains: [t], started: true, progress: 0.99, startedAt: NOW - 60 * 60_000, now: NOW })).toBe('train');
      expect(cutShort(r, { trains: [t], started: false, others: [{ kind: 'full' }] })).toBe('train');
      expect(cutShort(r, { trains: [], started: true })).toBe('');
    }
    expect(cutShort({ kind: 'full', requester: 'lead' }, { trains: [t], started: true })).toBe('');
  });
  it('pick: a spare request runs only when no other request is open; never aged, never at the front', () => {
    const spare = spareReq(40, 'alone'); // held 40 min: over ALONE_AGE_MIN
    const pr = req(1, 'pr', 'lead');
    expect(agedAlone([spare], NOW)).toBeNull();
    expect(pick({ trains: [], requests: [spare, pr] }, NOW, slots(false, false))).toEqual({ kind: 'request', request: pr, slot: '4189' });
    expect(pick({ trains: [], requests: [spare, pr], front: new Set([spare.id]) }, NOW, slots(false, false))).toMatchObject({ request: pr });
    // a real alone request waiting for both slots is not jumped by a spare pr on the free slot
    const lead = req(5, 'alone', 'lead');
    expect(pick({ trains: [], requests: [spareReq(40, 'pr'), lead] }, NOW, slots(true, false))).toBeNull();
    expect(pick({ trains: [], requests: [spare] }, NOW, slots(false, false))).toEqual({ kind: 'alone', request: spare });
    expect(pick({ trains: [], requests: [spare] }, NOW, slots(true, false))).toBeNull();
    expect(pick({ trains: [t], requests: [spare] }, NOW, slots(false, false))).toEqual({ kind: 'train', train: t });
    const sp = spareReq(40, 'full');
    expect(pick({ trains: [], requests: [sp] }, NOW, slots(true, false))).toEqual({ kind: 'request', request: sp, slot: '4192' });
  });
  it('realWaiting: an unclaimed non-spare request on the listing (held or not) counts; spare and claimed ones do not', () => {
    const spare = spareReq(10, 'full');
    const lead = req(5, 'alone', 'lead');
    expect(realWaiting([spare])).toBe(false);
    expect(realWaiting([spare, lead])).toBe(true);
    expect(realWaiting([spare, lead], new Set([lead.id]))).toBe(false); // already running here
    expect(realWaiting([])).toBe(false);
    expect(realWaiting(undefined)).toBe(false);
  });
  it('cutShort: a waiting real request stops a spare run whatever its kind, age or progress; never a real run', () => {
    for (const kind of ['pr', 'full', 'alone']) {
      const r = { kind, requester: SPARE_REQUESTER };
      expect(cutShort(r, { realOpen: true, started: true, progress: 0.99, startedAt: NOW - 60 * 60_000, now: NOW })).toBe('real');
      expect(cutShort(r, { realOpen: true, started: false })).toBe('real');
      expect(cutShort(r, { realOpen: false, started: true })).toBe('');
      expect(cutShort(r, { realOpen: true, trains: [t], started: true })).toBe('train');
      expect(cutShort(r, { realOpen: true, withdrawn: true })).toBe('withdrawn');
    }
    expect(cutShort({ kind: 'full', requester: 'lead' }, { realOpen: true, started: true })).toBe('');
  });
  it('pick: no spare starts while a real request is listed, even one the hold filters removed (queue.realOpen)', () => {
    const sp = spareReq(40, 'alone');
    const held = req(5, 'alone', 'lead'); // listed, then dropped by the aloneHold / aloneSoon filter
    const listed = [sp, held];
    const queue = { trains: [], requests: [sp], realOpen: realWaiting(listed) };
    expect(pick(queue, NOW, slots(false, false))).toBeNull();
    expect(pick({ ...queue, requests: [spareReq(40, 'full')] }, NOW, slots(true, false))).toBeNull();
    // nothing real listed: the spare starts as before
    expect(pick({ trains: [], requests: [sp], realOpen: realWaiting([sp]) }, NOW, slots(false, false))).toEqual({ kind: 'alone', request: sp });
  });
});
