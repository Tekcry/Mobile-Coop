import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs process script without types
import { assertKey, trainHold, capTail, claimBlocks, contextName, desktopGate, desktopSlotGate, describe as describeRun, failureExcerpt, flakeStands, idTime, lockChanged, mergeTimes, parseClaim, parseRun, pick, requestId, requestProblem, runComplete, shard, superseded, suiteSection, trainBuildFailed, workerActivity, desktopTrainGate, staleTasks, dupKey, duplicates, yieldTo, rerunPassed, buildMarker, pruneDone, cutShort, agedAlone, ALONE_AGE_MIN, holdClears, trainSoon, manualLocks, sortTrains, trainBelow, rerunTrain, trainsUnderMarker, voidMisses, VOID_MISSES } from '../scripts/laptop-queue/lib.mjs';

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
  it('pr and full requests of different requesters go oldest first, on the free slot', () => {
    const a = req(30, 'pr', 'a');
    const b = req(20, 'full', 'b');
    expect(pick({ trains: [], requests: [b, a] }, NOW, slots(true, false))).toEqual({ kind: 'request', request: a, slot: '4192' });
    expect(pick({ trains: [], requests: [b, a] }, NOW, slots(true, true))).toBeNull();
  });
});

describe('pick newest first per requester', () => {
  it('runs the requester with the oldest request first, then that one newest request',() => {
    const a1 = req(50, 'pr', 'a1', 'A');
    const b1 = req(40, 'pr', 'b1', 'B');
    const a2 = req(30, 'pr', 'a2', 'A');
    const b2 = req(10, 'full', 'b2', 'B');
    const q = { trains: [], requests: [b2, a2, b1, a1] };
    expect(pick(q, NOW, slots(false, false))).toEqual({ kind: 'request', request: a2, slot: '4189' });
    const rest = { trains: [], requests: [b2, b1] };
    expect(pick(rest, NOW, slots(false, false))).toEqual({ kind: 'request', request: b2, slot: '4189' });
  });
  it('an alone request is never the newest to run', () => {
    const p1 = req(30, 'pr', 'p1', 'A');
    const al = req(5, 'alone', 'al', 'A');
    expect(pick({ trains: [], requests: [al, p1] }, NOW, slots(false, false))).toEqual({ kind: 'request', request: p1, slot: '4189' });
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

describe('assertKey / flakeStands', () => {
  const lantern = "Error: timed out waiting for A3: LANTERN's line reaches the client [host: sim 90.45 s in 90.1 s wall (x1.00), 60 fps]";
  const grilleStop = 'timed out waiting for A8: N2 is at the grille stop (route index 2)';
  const relock = 'Error: ASSERT: A8 pass 2: the grille is locked again on the host';
  it('drops bracketed timing and numbers', () => {
    expect(assertKey(lantern)).toBe(assertKey(lantern.replace('90.45', '90.30').replace('60 fps', '120 fps')));
    expect(assertKey(grilleStop)).toBe('timed out waiting for A#: N# is at the grille stop (route index #)');
    expect(assertKey('')).toBe('');
  });
  it('a failure stands only on the same suite and assert within the window', () => {
    const flakes = [{ suite: 'e2e-ctcourse:4', key: assertKey(grilleStop), date: new Date(NOW - 3600_000).toISOString() }];
    const day = 24 * 3600_000;
    expect(flakeStands(flakes, 'e2e-ctcourse:4', assertKey(grilleStop), NOW, day)).toBe(true);
    expect(flakeStands(flakes, 'e2e-ctcourse:4', assertKey(relock), NOW, day)).toBe(false);
    expect(flakeStands(flakes, 'e2e-ctcourse:2', assertKey(grilleStop), NOW, day)).toBe(false);
    expect(flakeStands(flakes, 'e2e-ctcourse:4', assertKey(grilleStop), NOW + day, day)).toBe(false);
    expect(flakeStands(flakes, 'e2e-ctcourse:4', '', NOW, day)).toBe(false);
    expect(flakeStands([{ suite: 'e2e-ctcourse:4', date: new Date(NOW).toISOString() }], 'e2e-ctcourse:4', assertKey(grilleStop), NOW, day)).toBe(false);
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
  it('never preempts a train rerun, a full or an alone run', () => {
    expect(cutShort({ kind: 'pr', trainRerun: true }, { trains: [t], started: true })).toBe('');
    expect(cutShort({ kind: 'full' }, { trains: [t], started: true })).toBe('');
    expect(cutShort({ kind: 'alone' }, { trains: [t], started: true })).toBe('');
    expect(cutShort({ kind: 'pr' })).toBe('');
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
