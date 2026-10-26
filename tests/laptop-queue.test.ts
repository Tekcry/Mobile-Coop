import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs process script without types
import { assertKey, pickBranch, supersedeStatuses, duplicateStatuses, withdrawnStatuses, vanishedRequests, TASK_ALLOW, cpuTotalPct, backgroundCpuMs, gatedCpu, trainHold, capTail, claimBlocks, contextName, desktopGate, desktopSlotGate, describe as describeRun, failureExcerpt, idTime, lockChanged, mergeTimes, parseClaim, parseRun, pick, requestId, requestProblem, runComplete, shard, superseded, suiteSection, trainBuildFailed, workerActivity, desktopTrainGate, staleTasks, dupKey, duplicates, yieldTo, rerunPassed, buildMarker, pruneDone, cutShort, agedAlone, ALONE_AGE_MIN, holdClears, slotLockDecision, nextTrain, fitsBeforeTrain, FIT_SLACK, readyHeads, seenSince, releasingTrain, readyOrPending, median, desktopFailDesc, laptopRerunRequest, DESKTOP_HOT_CPU, expectedWallS, suiteParts, manualLocks, sortTrains, trainBelow, rerunTrain, trainsUnderMarker, voidMisses, VOID_MISSES, ALONE_PREEMPT_MIN, PREEMPT_MAX_PROGRESS, runProgress, aloneSoon, AFFECTED_REQUESTER, AFFECTED_CTX, AFFECTED_SKIP_LABEL, queueRequester, affectedSuites, affectedNeeds, affectedRequest, prBoard, greenIds, isFront, isFix, placeKey, gateCpu, desktopTooLong, placeFor, supersededRunning, finishedSuites, keptPlan, conflictRetire, conflictStatuses, autoQuarantine, countRuns, flakeBudget, flakeSummary, quarantined, suiteOwner, DEFAULT_OWNER, FLAKE_BUDGET, QUARANTINE_TTL_MS, splitSuites, knownSuites, unknownSuites, SPARE_REQUESTER, spareNext, spareRecord, spareRequest, realWaiting, docsOnlyFiles, isVersionHead, versionAt, carryFiles, carryFrom, carryDesc, prChain, aloneDue, aloneGapOpen, lastTrainEndFrom, holdKeeps, trainRepair, trainFinal, suiteEvents, idleLimitMs, idleStep, unfinishedParts, hungTrainDesc, attemptDir } from '../scripts/laptop-queue/lib.mjs';
// @ts-expect-error plain .mjs process script without types
import { docsOnlyFiles as watchdogDocsOnly } from '../scripts/watchdog.mjs';

const spareReq = (min: number, kind: string) => ({ ...req(min, kind, 'spare', 'laptop-queue spare') });
// @ts-expect-error plain .mjs module without types
import { selectSuites, WIDE_COVERS } from '../scripts/e2e-affected.mjs';
// @ts-expect-error plain .mjs module without types
import { overCapAffected } from '../scripts/laptop-queue/lib.mjs';

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

describe('pick: front, green smallest first', () => {
  const pr = (min: number, tag: string, extra: Record<string, unknown> = {}) => ({ ...req(min, 'pr', tag, tag), pr: 1, sha: tag, ...extra });
  const order = (green: string[], wall: Record<string, number> = {}, extra: Record<string, unknown> = {}) => ({
    green: new Set(green), wallS: wall, frontBranches: ['mixamo'], maxWaitMs: 30 * 60_000, ...extra,
  });
  const run = (requests: unknown[], o: unknown, extra: Record<string, unknown> = {}) =>
    pick({ trains: [], requests, order: o, ...extra }, NOW, slots(false, false))?.request;

  it('a green 12 s request beats an older plain request', () => {
    const plain = pr(20, 'plain');
    const green = pr(5, 'green');
    expect(run([plain, green], order([green.id], { [green.id]: 12 }))).toBe(green);
  });
  it('two green: the smaller wall first, unknown wall last, ties by id', () => {
    const a = pr(10, 'a');
    const b = pr(9, 'b');
    const c = pr(8, 'c');
    expect(run([a, b, c], order([a.id, b.id, c.id], { [a.id]: 206, [b.id]: 12 }))).toBe(b);
    expect(run([a, c], order([a.id, c.id], { [a.id]: 206 }))).toBe(a);
    expect(run([c, b], order([b.id, c.id], {}))).toBe(b);
  });
  it('a mixamo-branch request (not green) beats a green one; an early-id re-file beats green', () => {
    const green = pr(5, 'green');
    const mix = pr(1, 'mix', { branch: 'feature/Mixamo-x' });
    expect(run([green, mix], order([green.id], { [green.id]: 12 }))).toBe(mix);
    const early = { id: '000006-old-d7a3b887', kind: 'pr', requester: 'old', pr: 2, sha: 'old' };
    expect(run([green, early], order([green.id], { [green.id]: 12 }))).toBe(early);
    expect(isFront({ id: idAt(1, 'x'), branch: 'feature/mixamo-x' }, ['mixamo'])).toBe(true);
    expect(isFront({ id: idAt(1, 'x'), branch: 'feature/mixamo-x' }, [])).toBe(false);
    expect(isFront({ id: idAt(1, 'x'), branch: 'feature/other' }, ['mixamo'])).toBe(false);
  });
  it('front tier goes oldest first', () => {
    const m1 = pr(10, 'm1', { branch: 'mixamo-a' });
    const m2 = pr(20, 'm2', { branch: 'mixamo-b' });
    expect(run([m1, m2], order([]))).toBe(m2);
  });
  it('trains, train reruns and an aged alone request still go first', () => {
    const green = pr(5, 'green');
    const o = order([green.id], { [green.id]: 12 });
    expect(pick({ trains: [train], requests: [green], order: o }, NOW, slots(false, false))).toEqual({ kind: 'train', train });
    const rerun = { ...req(3, 'pr', 'rr', 'rr'), trainRerun: true };
    expect(pick({ trains: [], requests: [green, rerun], order: o }, NOW, slots(false, false))?.request).toBe(rerun);
    const alone = req(50, 'alone');
    expect(pick({ trains: [], requests: [green, alone], order: o }, NOW, slots(false, false))).toEqual({ kind: 'alone', request: alone });
    expect(pick({ trains: [], requests: [green, alone], order: o }, NOW, slots(true, false))).toBeNull();
  });
  it('max wait: a plain request 31 min old runs in arrival order this pick, under 30 min the green goes first', () => {
    const old = pr(31, 'old');
    const green = pr(5, 'green');
    expect(run([old, green], order([green.id], { [green.id]: 12 }))).toBe(old);
    const young = pr(29, 'young');
    expect(run([young, green], order([green.id], { [green.id]: 12 }))).toBe(green);
    expect(run([old, green], order([green.id], { [green.id]: 12 }, { maxWaitMs: 0 }))).toBe(green);
  });
  it('max wait: a green 206 s request 31 min old beats a newer green 12 s one; a front request beats both', () => {
    const big = pr(31, 'big');
    const small = pr(5, 'small');
    const o = order([big.id, small.id], { [big.id]: 206, [small.id]: 12 });
    expect(run([big, small], o)).toBe(big);
    const mix = pr(2, 'mix', { branch: 'mixamo-z' });
    expect(run([big, small, mix], o)).toBe(mix);
  });
  it('max wait counts the oldest non-front request even when it is not green', () => {
    const plain = pr(40, 'plain');
    const g1 = pr(10, 'g1');
    const g2 = pr(5, 'g2');
    expect(run([plain, g1, g2], order([g1.id, g2.id], { [g1.id]: 200, [g2.id]: 12 }))).toBe(plain);
  });
  it('no order, or an empty one, matches the arrival rule', () => {
    const a = pr(30, 'a');
    const b = pr(20, 'b');
    const c = { ...req(10, 'full', 'c', 'c') };
    for (const requests of [[a, b], [c, b], [b]]) {
      expect(pick({ trains: [], requests, order: undefined }, NOW, slots(false, false))).toEqual(pick({ trains: [], requests }, NOW, slots(false, false)));
      expect(run(requests, { green: new Set(), wallS: {}, frontBranches: [], maxWaitMs: 0 })).toBe(pick({ trains: [], requests }, NOW, slots(false, false))?.request);
    }
    const fresh = req(20, 'alone');
    expect(pick({ trains: [], requests: [fresh], order: order([]) }, NOW, slots(false, false))?.kind).toBe('alone');
    expect(pick({ trains: [], requests: [fresh, b], order: order([]) }, NOW, slots(true, true))).toBeNull();
  });
  it('spare-only picks ignore the order', () => {
    const s = spareReq(5, 'pr');
    expect(pick({ trains: [], requests: [s], order: order([s.id], {}, { frontBranches: ['x'] }) }, NOW, slots(false, false))?.request).toBe(s);
  });
  it('greenIds: green head at the request sha only; stale sha, reruns, spare and non-pr are not', () => {
    const board = new Map([[1, { head: 'a', conflicting: false, green: true }], [2, { head: 'b', conflicting: false, green: false }], [3, { head: 'new', conflicting: false, green: true }]]);
    const ok = { ...req(1, 'pr', 'ok'), pr: 1, sha: 'a' };
    const notGreen = { ...req(2, 'pr', 'ng'), pr: 2, sha: 'b' };
    const stale = { ...req(3, 'pr', 'st'), pr: 3, sha: 'old' };
    const rerun = { ...req(4, 'pr', 'rr'), pr: 1, sha: 'a', trainRerun: true };
    const lrerun = { ...req(5, 'pr', 'lr'), pr: 1, sha: 'a', laptopRerun: true };
    const spare = { ...spareReq(6, 'pr'), pr: 1, sha: 'a' };
    const full = { ...req(7, 'full', 'fu'), pr: 1, sha: 'a' };
    const got = greenIds([ok, notGreen, stale, rerun, lrerun, spare, full], board);
    expect([...got]).toEqual([ok.id]);
    expect(greenIds([ok], new Map()).size).toBe(0);
  });
});

describe('pick: fixes first, keep place (laptop-queue-8 slice A)', () => {
  const pr = (min: number, tag: string, extra: Record<string, unknown> = {}) => ({ ...req(min, 'pr', tag, tag), pr: 1, sha: tag, ...extra });
  const order = (fix: string[], green: string[] = [], wall: Record<string, number> = {}, extra: Record<string, unknown> = {}) => ({
    fix: new Set(fix), green: new Set(green), wallS: wall, frontBranches: ['mixamo'], maxWaitMs: 30 * 60_000, ...extra,
  });
  const run = (requests: unknown[], o: unknown) => pick({ trains: [], requests, order: o }, NOW, slots(false, false))?.request;

  it('prBoard reads the fix label', () => {
    const b = prBoard([
      { number: 1, headRefOid: 'a', labels: [{ name: 'train-ready' }, { name: 'fix' }] },
      { number: 2, headRefOid: 'b', labels: [{ name: 'wontfix' }] },
      { number: 3, headRefOid: 'c' },
    ]);
    expect(b.get(1).fix).toBe(true);
    expect(b.get(2).fix).toBe(false);
    expect(b.get(3).fix).toBe(false);
  });
  it('isFix: the --fix flag or the board label; never alone, spare, train or laptop reruns', () => {
    const board = new Map([[7, { head: 'x', conflicting: false, green: false, fix: true }], [8, { head: 'y', conflicting: false, green: false, fix: false }]]);
    expect(isFix({ ...pr(1, 'f'), pr: 8, fix: true }, board)).toBe(true);
    expect(isFix({ ...pr(1, 'l'), pr: 7 }, board)).toBe(true);
    expect(isFix({ ...req(1, 'full', 'fu'), pr: 7 }, board)).toBe(true);
    expect(isFix({ ...pr(1, 'n'), pr: 8 }, board)).toBe(false);
    expect(isFix({ ...pr(1, 'g'), pr: 7 }, new Map())).toBe(false); // a gh error empties the board: only --fix counts
    expect(isFix({ ...req(1, 'alone', 'al'), pr: 7, fix: true }, board)).toBe(false);
    expect(isFix({ ...pr(1, 'tr'), pr: 7, trainRerun: true, fix: true }, board)).toBe(false);
    expect(isFix({ ...pr(1, 'lr'), pr: 7, laptopRerun: true }, board)).toBe(false);
    expect(isFix({ ...spareReq(1, 'pr'), pr: 7, fix: true }, board)).toBe(false);
  });
  it('a fix beats a front (mixamo) request and a green one', () => {
    const green = pr(30, 'green');
    const mix = pr(20, 'mix', { branch: 'feature/mixamo-x' });
    const fix = pr(1, 'fix');
    expect(run([green, mix, fix], order([fix.id], [green.id], { [green.id]: 12 }))).toBe(fix);
    expect(run([green, mix, fix], order([], [green.id], { [green.id]: 12 }))).toBe(mix);
  });
  it('two fixes: the smaller place first, no wait bound', () => {
    const f1 = pr(5, 'f1');
    const f2 = pr(3, 'f2', { place: idAt(60, 'old') });
    const plain = pr(90, 'plain'); // waited past the 30 min bound: the fix tier still goes first
    expect(run([plain, f1, f2], order([f1.id, f2.id]))).toBe(f2);
    expect(run([plain, f1], order([f1.id]))).toBe(f1);
  });
  it('trains, train reruns and an aged alone still go before a fix', () => {
    const fix = pr(5, 'fix');
    const o = order([fix.id]);
    expect(pick({ trains: [train], requests: [fix], order: o }, NOW, slots(false, false))).toEqual({ kind: 'train', train });
    const rerun = { ...req(3, 'pr', 'rr', 'rr'), trainRerun: true };
    expect(pick({ trains: [], requests: [fix, rerun], order: o }, NOW, slots(false, false))?.request).toBe(rerun);
    const alone = req(50, 'alone');
    expect(pick({ trains: [], requests: [fix, alone], order: o }, NOW, slots(false, false))).toEqual({ kind: 'alone', request: alone });
    expect(pick({ trains: [], requests: [fix, alone], order: o }, NOW, slots(true, false))).toBeNull();
  });
  it('no order.fix (LQ_FIX_FIRST=0) gives the laptop-queue-7 result', () => {
    const green = pr(30, 'green');
    const mix = pr(20, 'mix', { branch: 'mixamo-a' });
    const fix = pr(1, 'fix', { fix: true });
    const o7 = { green: new Set([green.id]), wallS: { [green.id]: 12 }, frontBranches: ['mixamo'], maxWaitMs: 30 * 60_000 };
    expect(run([green, mix, fix], o7)).toBe(mix);
    expect(run([green, fix], o7)).toBe(green);
    expect(run([green, mix, fix], { ...o7, fix: new Set() })).toBe(mix);
  });
  it('place: a newer request with an older place wins arrival over an older request of another requester', () => {
    const other = pr(30, 'other');
    const kept = pr(5, 'kept', { place: idAt(40, 'gone') });
    expect(pick({ trains: [], requests: [other, kept] }, NOW, slots(false, false))?.request).toBe(kept);
    expect(run([other, kept], order([]))).toBe(kept);
    expect(placeKey(kept)).toBe(idAt(40, 'gone'));
  });
  it('a place above its own id (or not a string) is ignored', () => {
    const other = pr(30, 'other');
    const late = pr(5, 'late', { place: idAt(1, 'newer') });
    const bad = pr(4, 'bad', { place: 12 });
    expect(placeKey(late)).toBe(late.id);
    expect(placeKey(bad)).toBe(bad.id);
    expect(pick({ trains: [], requests: [late, bad, other] }, NOW, slots(false, false))?.request).toBe(other);
  });
  it('starvation uses the place time', () => {
    const kept = pr(5, 'kept', { place: idAt(31, 'gone') });
    const green = pr(3, 'green');
    expect(run([kept, green], order([], [green.id], { [green.id]: 12 }))).toBe(kept);
    const young = pr(5, 'young', { place: idAt(29, 'gone') });
    expect(run([young, green], order([], [green.id], { [green.id]: 12 }))).toBe(green);
  });
  it('green ties go by place', () => {
    const a = pr(10, 'a');
    const b = pr(5, 'b', { place: idAt(20, 'gone') });
    expect(run([a, b], order([], [a.id, b.id], { [a.id]: 12, [b.id]: 12 }))).toBe(b);
  });
  it('placeFor: a chain R1 -> R2 -> R3 gives R3 the place of R1; no entry when the survivor is oldest or not open', () => {
    const r1 = pr(30, 'r1');
    const r2 = pr(20, 'r2');
    const r3 = pr(10, 'r3');
    const sup = new Map([[r1.id, r3.id], [r2.id, r3.id]]);
    expect([...placeFor(sup, [r1, r2, r3])]).toEqual([[r3.id, r1.id]]);
    // r2 already carried r0's place from an earlier pass
    const r2p = { ...r2, place: idAt(50, 'r0') };
    expect(placeFor(new Map([[r2p.id, r3.id]]), [r2p, r3]).get(r3.id)).toBe(idAt(50, 'r0'));
    // the survivor already holds a smaller place
    const r3p = { ...r3, place: idAt(90, 'zz') };
    expect(placeFor(new Map([[r1.id, r3p.id]]), [r1, r3p]).size).toBe(0);
    // survivor not in the open list (claimed or running): no place
    expect(placeFor(new Map([[r1.id, r3.id]]), [r1]).size).toBe(0);
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

describe('supersededRunning: stop a running request on a newer head (laptop-queue-8 slice B)', () => {
  const SHA = (c: string) => c.repeat(40);
  const r = (min: number, tag: string, o: Record<string, unknown> = {}) => ({ id: idAt(min, tag), requester: 'A', kind: 'pr', branch: 'feature/x', pr: 5, sha: SHA('1'), suites: ['e2e-coop', 'e2e-pad'], ...o });
  const anc = (a: string, b: string) => a === SHA('1') && b === SHA('2');
  const stop = (run: unknown[], cands: unknown[], progress: Record<string, number> = {}) => supersededRunning(run, cands, anc, (id: string) => progress[id] ?? NaN);

  it('a running request stops when a newer head contains it and the suites overlap', () => {
    const a = r(30, 'a');
    const b = r(5, 'b', { sha: SHA('2'), suites: ['e2e-pad', 'e2e-menu'] });
    expect([...stop([a], [b, a])]).toEqual([[a.id, b.id]]);
  });
  it('a rebased head (not an ancestor), no overlap or the same sha does not stop it', () => {
    const a = r(30, 'a');
    expect(stop([a], [r(5, 'b', { sha: SHA('3') })]).size).toBe(0);
    expect(stop([a], [r(5, 'b', { sha: SHA('2'), suites: ['e2e-menu'] })]).size).toBe(0);
    expect(stop([a], [r(5, 'b')]).size).toBe(0);
  });
  it('pinned, train rerun, full and alone runs are never stopped', () => {
    const b = r(5, 'b', { sha: SHA('2') });
    expect(stop([r(30, 'a', { pin: true })], [b]).size).toBe(0);
    expect(stop([r(30, 'a', { trainRerun: true })], [{ ...b, trainRerun: true }]).size).toBe(0);
    expect(stop([r(30, 'a', { kind: 'full', suites: undefined })], [{ ...b, kind: 'full', suites: undefined }]).size).toBe(0);
    expect(stop([r(30, 'a', { kind: 'alone', steps: ['x'] })], [{ ...b, kind: 'alone', steps: ['x'] }]).size).toBe(0);
  });
  it('at or past 80% of its expected wall the run finishes', () => {
    const a = r(30, 'a');
    const b = r(5, 'b', { sha: SHA('2') });
    expect(stop([a], [b], { [a.id]: 0.85 }).size).toBe(0);
    expect(stop([a], [b], { [a.id]: PREEMPT_MAX_PROGRESS }).size).toBe(0);
    expect(stop([a], [b], { [a.id]: 0.5 }).get(a.id)).toBe(b.id);
  });
  it('another requester, an older request or a laptop rerun as the newer request does not stop it', () => {
    const a = r(30, 'a');
    expect(stop([a], [r(5, 'b', { sha: SHA('2'), requester: 'B' })]).size).toBe(0);
    expect(stop([a], [r(40, 'b', { sha: SHA('2') })]).size).toBe(0);
    expect(stop([a], [r(5, 'b', { sha: SHA('2'), laptopRerun: true })]).size).toBe(0);
  });
  it('an affected request: another PR branch never stops it, nor does it stop a lead run on the same branch', () => {
    const affA = r(30, 'a', { requester: AFFECTED_REQUESTER, set: 'affected' });
    const affOther = r(5, 'b', { requester: AFFECTED_REQUESTER, set: 'affected', sha: SHA('2'), branch: 'feature/y' });
    expect(stop([affA], [affOther]).size).toBe(0);
    const affSame = { ...affOther, branch: 'feature/x' };
    expect(stop([affA], [affSame]).get(affA.id)).toBe(affSame.id);
    // a rebased affected head (not an ancestor) does not stop it, unlike superseded's per-branch rule
    expect(stop([affA], [{ ...affSame, sha: SHA('3') }]).size).toBe(0);
    const lead = r(30, 'lead', { requester: 'Lead', set: 'mine' });
    expect(stop([lead], [affSame]).size).toBe(0);
  });
  it('an unknown or missing requester and two different sets never pair', () => {
    expect(stop([r(30, 'a', { requester: 'unknown' })], [r(5, 'b', { requester: 'unknown', sha: SHA('2') })]).size).toBe(0);
    expect(stop([r(30, 'a', { requester: '' })], [r(5, 'b', { requester: '', sha: SHA('2') })]).size).toBe(0);
    expect(stop([r(30, 'a', { set: 'off' })], [r(5, 'b', { set: 'on', sha: SHA('2') })]).size).toBe(0);
    expect(stop([r(30, 'a', { set: 's' })], [r(5, 'b', { set: 's', sha: SHA('2') })]).size).toBe(1);
  });
  it('the newer request may be claimed or running (not in the open list) and the newest pairs; the run itself is skipped', () => {
    const a = r(30, 'a');
    const b = r(10, 'b', { sha: SHA('2') });
    const c = r(5, 'c', { sha: SHA('2') });
    expect(stop([a], [a, b, c]).get(a.id)).toBe(c.id);
    expect(stop([a, b], [a, b]).get(a.id)).toBe(b.id);
    expect(stop([a], [a]).size).toBe(0);
    // a newer request that is active only (claimed or running) gets no queue place: placeFor only sees open survivors
    expect(placeFor(stop([a], [b]), [a]).size).toBe(0);
    expect(placeFor(stop([a], [b]), [a, b]).get(b.id)).toBe(a.id);
  });
  it('cutShort: superseded before and after the suites start; withdrawn wins', () => {
    const t = { sha: 'f'.repeat(40), n: '9' };
    expect(cutShort({ kind: 'pr' }, { superseded: 'x' })).toBe('superseded');
    expect(cutShort({ kind: 'pr' }, { superseded: 'x', started: true, trains: [t] })).toBe('superseded');
    expect(cutShort({ kind: 'pr' }, { superseded: 'x', withdrawn: true })).toBe('withdrawn');
    expect(cutShort({ kind: 'pr' }, { superseded: '' })).toBe('');
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
  it('claimBlocks: heartbeat bound (laptop-queue-8 A17)', () => {
    const beat = 300_000;
    expect(claimBlocks({ worker: 'desktop', at: at(25), done: false, beat }, 'laptop', NOW, 3 * H, 4)).toBe(false);
    expect(claimBlocks({ worker: 'desktop', at: at(15), done: false, beat }, 'laptop', NOW, 3 * H, 4)).toBe(true);
    expect(claimBlocks({ worker: 'desktop', at: at(120), done: false }, 'laptop', NOW, 3 * H, 4)).toBe(true); // no beat: 3 h rule
    expect(claimBlocks({ worker: 'desktop', at: at(25), done: false, beat }, 'laptop', NOW, 3 * H, 0)).toBe(true); // beats 0: off
    expect(claimBlocks({ worker: 'desktop', at: at(25), done: true, beat }, 'laptop', NOW, 3 * H, 4)).toBe(true);
    expect(claimBlocks({ worker: 'laptop', at: at(1), done: false, beat }, 'laptop', NOW, 3 * H, 4)).toBe(false); // own claim
    expect(claimBlocks({ worker: 'desktop', at: at(240), done: false }, 'laptop', NOW, 3 * H, 4)).toBe(false);
    expect(claimBlocks({ worker: 'desktop', at: at(25), done: false, beat: 3600_000 }, 'laptop', NOW, 20 * 60_000, 4)).toBe(false); // maxMs caps it
  });
  it('a blocked heartbeat id cuts its run, at any stage and before any other reason (checker FIX 1)', () => {
    const pr = { id: 'r1', kind: 'pr', suites: ['a'] };
    // the laptop's claim went stale in a push outage; the desktop took the train over: its heartbeat names the desktop
    expect(cutShort(pr, { taken: 'desktop' })).toBe('taken');
    expect(cutShort({ id: 'f1', kind: 'full' }, { taken: 'desktop', started: true })).toBe('taken'); // a full run too
    expect(cutShort(pr, { taken: 'desktop', withdrawn: true, superseded: 'r2' })).toBe('taken'); // nothing posted
    expect(cutShort(pr, { taken: '' })).toBe('');
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
    // no parseable pid: the noclobber way is respected
    expect(slotLockDecision('Marlow Build | marlow-final | 18:48', 'Marlow Build | marlow-final | 18:48', dead)).toEqual({ action: 'hold', why: 'no pid in the lock' });
    let probed = 0;
    slotLockDecision('Marlow Build', 'Marlow Build', { host: 'DESKTOP', alive: () => { probed++; return false; } });
    expect(probed).toBe(0);
  });
  it('slot lock decision: the service line (no host) is this machine\'s; a dead pid breaks it (2026-10-25 pid 4484)', () => {
    const dead = { host: 'DESKTOP', alive: () => false };
    const own = 'laptop-queue | 20261025T104000-affected-e2e-d0f574cb-c404 d0f574cb pid 4484 | 2026-10-25T10:40:00.000Z';
    expect(slotLockDecision(own, own, dead)).toEqual({ action: 'break', why: 'pid 4484 is not alive on DESKTOP' });
    expect(slotLockDecision(`${own}\n`, own, dead).action).toBe('break');
    expect(slotLockDecision(own, own, { host: 'DESKTOP', alive: () => true })).toEqual({ action: 'hold', why: 'pid 4484 is alive' });
    expect(slotLockDecision(own, 'laptop-queue | train 83 e610098c pid 77 | 2026-10-25T10:52:00.000Z', dead).action).toBe('hold');
    const noPid = 'laptop-queue | request 1a2b3c4d | 2026-10-25T00:20:00.000Z';
    expect(slotLockDecision(noPid, noPid, dead)).toEqual({ action: 'hold', why: 'no pid in the lock' });
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
  it('gateCpu: normal (default) reads the gated load, total the whole machine; the reason names total mode (laptop-queue-8 slice D)', () => {
    const c = { gated: 45, total: 95 };
    expect(gateCpu(c, 'normal')).toBe(45);
    expect(gateCpu(c, undefined)).toBe(45);
    expect(gateCpu(c, 'total')).toBe(95);
    const base = { lockName: 'heavy2.lock', lockHeld: false, dirOk: true, backlog: 5, minBacklog: 3, maxCpu: 50, cpuTotal: 95 };
    expect(desktopSlotGate({ ...base, cpu: gateCpu(c, 'normal'), cpuMode: 'normal' })).toBe('');
    expect(desktopSlotGate({ ...base, cpu: gateCpu(c, 'total'), cpuMode: 'total' })).toBe('cpu 95% >= 50% (total mode: whole machine)');
    expect(desktopSlotGate({ ...base, cpu: 55, cpuMode: 'normal' })).toBe('cpu 55% >= 50% (Normal+ priority; total 95%)');
  });
});

describe('desktop order and long-run skip (laptop-queue-8 slice D)', () => {
  const times = { quick: 60, mid: 300, mid2: 300, long: 1200, 'e2e-desktop:1': 500, 'e2e-desktop:2': 500 };
  const pr = (min: number, tag: string, suites: string[], extra: Record<string, unknown> = {}) => ({ ...req(min, 'pr', tag, tag), pr: 1, sha: tag, suites, ...extra });
  const desk = (requests: Array<{ id: string; suites: string[] }>, fix: string[] = []) => {
    const wallS: Record<string, number> = {};
    for (const r of requests) wallS[r.id] = expectedWallS(r.suites, times, 1);
    return pick({ trains: [], requests, order: { fix: new Set(fix), green: new Set(), wallS, frontBranches: [], maxWaitMs: 30 * 60_000, smallest: true } }, NOW, slots(false, false))?.request;
  };
  it('desktopTooLong: over the limit at E2E_JOBS=1, never when unknown or the limit is 0', () => {
    expect(desktopTooLong({ suites: ['long'] }, times, 900)).toBe(true);
    expect(desktopTooLong({ suites: ['quick', 'mid'] }, times, 900)).toBe(false);
    expect(desktopTooLong({ suites: ['mid', 'mid2', 'e2e-desktop:1'] }, times, 900)).toBe(true); // 1100 s serial
    expect(desktopTooLong({ suites: ['e2e-desktop'] }, times, 900)).toBe(true); // both parts, one job: 1000 s
    expect(desktopTooLong({ suites: ['nope'] }, times, 900)).toBe(false); // NaN: taken
    expect(desktopTooLong({ suites: [] }, times, 900)).toBe(false);
    expect(desktopTooLong({ suites: ['long'] }, times, 0)).toBe(false);
    // only what still runs counts: 'long' kept on this sha (lib keptPlan), 'quick' left (checker polish)
    expect(desktopTooLong({ sha: 'S', suites: ['long', 'quick'], kept: { sha: 'S', suites: [{ s: 'long', sec: 1 }] } }, times, 900)).toBe(false);
    expect(desktopTooLong({ sha: 'S', suites: ['long', 'quick'], kept: { sha: 'old', suites: [{ s: 'long', sec: 1 }] } }, times, 900)).toBe(true);
  });
  it('the desktop takes the smallest expected wall first, not the oldest', () => {
    const a = pr(30, 'a', ['mid']);
    const b = pr(20, 'b', ['quick']);
    const c = pr(10, 'c', ['quick', 'mid']);
    expect(desk([a, b, c])?.id).toBe(b.id);
  });
  it('a fix goes ahead of a smaller non-fix', () => {
    const a = pr(30, 'a', ['mid']);
    const b = pr(20, 'b', ['quick']);
    expect(desk([a, b], [a.id])?.id).toBe(a.id);
  });
  it('an unknown wall goes last; equal walls go by place', () => {
    const u = pr(40, 'u', ['nope']);
    const m = pr(5, 'm', ['mid']);
    expect(desk([u, m])?.id).toBe(m.id);
    expect(desk([u])?.id).toBe(u.id);
    const x = pr(10, 'x', ['quick']);
    const y = pr(5, 'y', ['quick'], { place: idAt(50, 'old') });
    expect(desk([x, y])?.id).toBe(y.id);
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
    // laptop-queue-8 G: the done push syncTrains retries ("done train <n>") closes the train for the desktop gate
    expect(workerActivity(`${t(0)} done train 118 (laptop)
${t(90)} claim train 118 (laptop)`, 'laptop').openTrain).toBe('');
    expect(workerActivity(`${t(0)} done train ? 7605094d (laptop)
${t(90)} claim train 118 (laptop)`, 'laptop').openTrain).toBe('118'); // a legacy label without n never reads as a train number
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
  it('the service allowlist keeps the watchdog task (its action runs a .vbs in scratch; audit 2026-10-25)', () => {
    const vbs = [{ execute: 'wscript.exe', args: '//B //NoLogo "C:\\NightShift\\scratch\\watchdog-task.vbs"' }];
    expect(TASK_ALLOW).toEqual([...allow, 'NightShift watchdog']);
    expect(staleTasks([t('NightShift watchdog', 'Ready', vbs)], TASK_ALLOW)).toEqual([]);
    expect(staleTasks([t('NightShift watchdog', 'Ready', vbs)], allow).map((x: { why: string }) => x.why)).toEqual(['runs from C:\\NightShift\\scratch']);
    expect(staleTasks([t('NightShift-chain-x', 'Ready')], TASK_ALLOW)).toHaveLength(1);
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
  it('laptop-queue-8 A18: a head whose verdict was lost (finished here, or a done claim) holds nothing', () => {
    const lost = (sha: string) => sha === 'A';
    expect(trainHold([{ n: '118', sha: 'A', laptop: 'pending' }], lost)).toBe(null); // the train 118 replay
    expect(trainHold([{ n: '118', sha: 'A', laptop: '' }], lost)).toBe(null);
    expect(trainHold([{ n: '118', sha: 'A', laptop: 'failure' }], lost)?.n).toBe('118'); // a failed head still holds
    expect(trainHold([{ n: '118', sha: 'A', laptop: 'pending' }, { n: '119', sha: 'B', laptop: 'pending' }], lost)?.n).toBe('119');
    expect(trainHold([{ n: '118', sha: 'A', laptop: 'pending' }])?.n).toBe('118'); // no lost(): as before
  });
});

describe('trainRepair (laptop-queue-8 A15, A16)', () => {
  const entry = { result: 'success', n: '118', state: 'success', desc: '41/43 pass, 900 s; known flaky: x', posted: false, doneSynced: false };
  it('posts a final verdict GitHub lost, never over another final one', () => {
    expect(trainRepair(entry, 'pending')).toEqual({ post: { state: 'success', desc: entry.desc }, done: true, superseded: '' });
    expect(trainRepair(entry, '').post).toEqual({ state: 'success', desc: entry.desc });
    for (const gh of ['success', 'failure', 'error', 'unknown', null]) expect(trainRepair(entry, gh).post).toBe(null);
    expect(trainRepair({ ...entry, posted: true }, 'pending').post).toBe(null);
  });
  it('the train 118 incident: a legacy success entry with GitHub pending posts success', () => {
    expect(trainRepair({ result: 'success', wall: 900, date: '2026-10-26T00:57:00Z' }, 'pending')).toEqual({ post: { state: 'success', desc: 'success (re-posted)' }, done: true, superseded: '' });
  });
  it('another worker claim (live or done) gets no post and no done push', () => {
    expect(trainRepair(entry, 'pending', 'desktop')).toEqual({ post: null, done: false, superseded: 'desktop' });
  });
  it('legacy results map to a state; a desktop verdict keeps its prefix and FAIL list', () => {
    expect(trainRepair({ result: 'failure' }, 'pending').post).toEqual({ state: 'failure', desc: 'failure (re-posted)' });
    expect(trainRepair({ result: 'failure' }, 'pending', '', 'desktop: ').post).toEqual({ state: 'failure', desc: 'desktop: failure (re-posted)' });
    const d = 'desktop: 37/39 pass, 512 s; FAIL: e2e-a,e2e-b';
    expect(trainRepair({ result: 'failure', state: 'failure', desc: d }, '', '', 'desktop: ').post?.desc).toBe(d);
    expect(trainRepair({ result: 'build' }, '').post?.state).toBe('failure');
    expect(trainRepair({ result: 'incomplete' }, '').post?.state).toBe('failure');
    expect(trainRepair({ result: 'nosha' }, '').post?.state).toBe('error');
    expect(trainRepair({ result: 'carried' }, '').post?.state).toBe('success');
    expect(trainRepair({ result: 'odd' }, '').post).toBe(null);
    expect(trainFinal(undefined)).toBe('');
  });
  it('done until the done claim is known to have landed', () => {
    expect(trainRepair({ ...entry, doneSynced: true }, 'success').done).toBe(false);
    expect(trainRepair({ result: 'success' }, 'success').done).toBe(true);
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

describe('nextTrain', () => {
  const MIN = 60_000;
  const lim = { buildMaxMs: 20 * MIN, gapMs: 6.5 * MIN, readyLagMs: 3 * MIN, mergeLagMs: 2 * MIN, lateMs: 5 * MIN };
  const ago = (min: number) => NOW - min * MIN;
  it('building: held up to buildMaxMs with ETA now, then falls through', () => {
    expect(nextTrain({ building: { n: '61', ageMs: MIN }, now: NOW }, lim)).toEqual({ why: 'train 61 building', etaMs: NOW, untilMs: NOW + 19 * MIN });
    expect(nextTrain({ building: { n: '61', ageMs: 21 * MIN }, now: NOW }, lim)).toBeNull();
    expect(nextTrain({ building: { n: '61', ageMs: 21 * MIN }, lastMerge: { n: '60', atMs: ago(1) }, green: [ago(30)], now: NOW }, lim)?.why).toMatch(/^train 60 released/);
    // building wins over a releasing train beside it
    expect(nextTrain({ building: { n: '68', ageMs: 1000 }, releasing: { n: '67', laptopAtMs: ago(1) }, green: [ago(30)], now: NOW }, lim)?.why).toBe('train 68 building');
  });
  it('no candidates: no hold (releasing and released)', () => {
    expect(nextTrain({ releasing: { n: '67', laptopAtMs: ago(1) }, now: NOW }, lim)).toBeNull();
    expect(nextTrain({ lastMerge: { n: '67', atMs: ago(1) }, green: [], running: 0, now: NOW }, lim)).toBeNull();
    expect(nextTrain({ now: NOW }, lim)).toBeNull();
  });
  it('releasing: merge = laptop success + 2 min, ETA = merge + 6.5, held to ETA + 5', () => {
    const n = nextTrain({ releasing: { n: '67', laptopAtMs: ago(1) }, green: [ago(30)], now: NOW }, lim);
    expect(n).toEqual({ why: 'train 67 releasing, 1 train-ready PR(s) next', etaMs: NOW + 7.5 * MIN, untilMs: NOW + 12.5 * MIN });
  });
  it('released: ETA = merge + 6.5 until merge + 11.5; a late green candidate sets ETA = seen + 3; the max of both', () => {
    expect(nextTrain({ lastMerge: { n: '60', atMs: ago(3) }, green: [ago(30)], now: NOW }, lim)).toEqual({ why: 'train 60 released, 1 train-ready PR(s) waiting', etaMs: NOW + 3.5 * MIN, untilMs: NOW + 8.5 * MIN });
    expect(nextTrain({ lastMerge: { n: '60', atMs: ago(11.6) }, green: [ago(30)], now: NOW }, lim)).toBeNull();
    expect(nextTrain({ lastMerge: { n: '60', atMs: ago(20) }, green: [ago(30), ago(1)], now: NOW }, lim)).toEqual({ why: '2 train-ready PR(s) waiting for a train', etaMs: NOW + 2 * MIN, untilMs: NOW + 7 * MIN });
    // merge + 6.5 = +3.5, seen + 3 = +2.5: the later one
    expect(nextTrain({ lastMerge: { n: '60', atMs: ago(3) }, green: [ago(0.5)], now: NOW }, lim)?.etaMs).toBe(NOW + 3.5 * MIN);
    expect(nextTrain({ lastMerge: { n: '60', atMs: ago(5) }, green: [ago(0.5)], now: NOW }, lim)?.etaMs).toBe(NOW + 2.5 * MIN);
  });
  it('lateMs 0 ends the hold at ETA', () => {
    expect(nextTrain({ lastMerge: { n: '60', atMs: ago(6.5) }, green: [ago(30)], now: NOW }, { ...lim, lateMs: 0 })).toBeNull();
    expect(nextTrain({ lastMerge: { n: '60', atMs: ago(6) }, green: [ago(30)], now: NOW }, { ...lim, lateMs: 0 })?.untilMs).toBe(NOW + 0.5 * MIN);
  });
  it('an open train neither building nor releasing (no lastMerge passed): no hold', () => {
    expect(nextTrain({ green: [ago(1)], running: 2, now: NOW }, lim)).toBeNull();
  });
  it('running checks keep a merge hold on but never set or extend the ETA, nor start a hold alone', () => {
    expect(nextTrain({ lastMerge: { n: '60', atMs: ago(3) }, green: [], running: 1, now: NOW }, lim)).toEqual({ why: 'train 60 released, 1 train-ready PR(s) waiting', etaMs: NOW + 3.5 * MIN, untilMs: NOW + 8.5 * MIN });
    expect(nextTrain({ lastMerge: { n: '60', atMs: ago(20) }, green: [], running: 1, now: NOW }, lim)).toBeNull();
    // a running head (seen later than the green one) adds only to the count
    expect(nextTrain({ lastMerge: { n: '60', atMs: ago(3) }, green: [ago(30)], running: 1, now: NOW }, lim)?.etaMs).toBe(NOW + 3.5 * MIN);
    // a failed-check candidate counts for nothing
    const h = readyHeads([{ head: 'x', check: { status: 'COMPLETED', conclusion: 'FAILURE' } }]);
    expect(nextTrain({ lastMerge: { n: '60', atMs: ago(3) }, green: h.green, running: h.running.length, now: NOW }, lim)).toBeNull();
  });
  it('replays trains 102-106 from the log (UTC, 2026-10-24)', () => {
    const t = (hms: string) => Date.parse(`2026-10-24T${hms}Z`);
    // train 103: player-b-ffb7f02a claimed 10:46:02, cut 10:47:35
    expect(nextTrain({ lastMerge: { n: '102', atMs: t('10:40:34') }, green: [t('10:27:00')], now: t('10:46:02') }, lim)?.etaMs).toBe(t('10:47:04'));
    // train 102: #455 green 10:24:00, claim 10:25:11, head 10:26:54
    expect(nextTrain({ lastMerge: { n: '101', atMs: t('10:13:42') }, green: [t('10:24:00')], now: t('10:25:11') }, lim)?.etaMs).toBe(t('10:27:00'));
    // train 104: claim 11:08:41 in the late window: held, nothing fits (ETA already past)
    const n104 = nextTrain({ lastMerge: { n: '103', atMs: t('11:00:24') }, green: [t('10:50:00')], now: t('11:08:41') }, lim);
    expect(n104?.etaMs).toBe(t('11:06:54'));
    expect(fitsBeforeTrain({ kind: 'pr', suites: ['a'] }, { now: t('11:08:41'), etaMs: n104?.etaMs, times: { a: 1 }, prepS: 120 })).toBe(false);
    // train 106: #464 green 11:44:55, guard-ai claim 11:47:00
    expect(nextTrain({ lastMerge: { n: '105', atMs: t('11:43:07') }, green: [t('11:44:55')], now: t('11:47:00') }, lim)?.etaMs).toBe(t('11:49:37'));
  });
});

describe('fitsBeforeTrain', () => {
  const times = { 'e2e-a': 4, 'e2e-b': 4, 'e2e-c': 4, s1: 100, s2: 60, s3: 60, s4: 52, s5: 50, s6: 50, s7: 40 };
  const ctx = { now: NOW, etaMs: NOW + 3.25 * 60_000, times, prepS: 120 };
  it('a short known pr run fits; long, unknown, alone and full runs do not', () => {
    expect(FIT_SLACK).toBe(1.2);
    expect(fitsBeforeTrain({ kind: 'pr', suites: ['e2e-a', 'e2e-b', 'e2e-c'] }, ctx)).toBe(true);
    expect(fitsBeforeTrain({ kind: 'pr', suites: ['s1', 's2', 's3', 's4', 's5', 's6', 's7'] }, ctx)).toBe(false); // eab8c758, ~206 s
    expect(fitsBeforeTrain({ kind: 'pr', suites: ['e2e-coop-real:1'] }, ctx)).toBe(false); // no time
    expect(fitsBeforeTrain({ kind: 'alone', suites: ['e2e-a'] }, ctx)).toBe(false);
    expect(fitsBeforeTrain({ kind: 'full' }, ctx)).toBe(false);
    expect(fitsBeforeTrain({ kind: 'pr', suites: ['e2e-a'] }, { ...ctx, etaMs: NOW })).toBe(false); // building
  });
  it('jobs (default 2) sets the expected wall', () => {
    const c = { ...ctx, etaMs: NOW + 200_000, times: { a: 60, b: 60 } };
    expect(fitsBeforeTrain({ kind: 'pr', suites: ['a', 'b'] }, c)).toBe(true); // 120 + 72 s
    expect(fitsBeforeTrain({ kind: 'pr', suites: ['a', 'b'], jobs: 1 }, c)).toBe(false); // 120 + 144 s
  });
});

describe('lastTrainEndFrom: this worker bump', () => {
  it('a just-posted verdict raises the end, never lowers it', () => {
    const now = new Date(NOW).toISOString();
    expect(lastTrainEndFrom([{ laptop: 'success', laptopAt: now }], NOW - 60_000)).toBe(NOW);
    expect(lastTrainEndFrom([{ laptop: 'success', laptopAt: now }], NOW + 60_000)).toBe(NOW + 60_000);
    expect(lastTrainEndFrom([{ laptop: 'success', laptopAt: now }], NaN)).toBe(NOW);
  });
});

describe('train hold across the next train (laptop-queue-6 rule, BRIEF item 5)', () => {
  const MIN = 60_000;
  const lim = { buildMaxMs: 20 * MIN, gapMs: 6.5 * MIN, readyLagMs: 3 * MIN, mergeLagMs: 2 * MIN, lateMs: 5 * MIN };
  const times = { quick: 12, long: 206 };
  const prepS = 120;
  const fits = (suites: string[], now: number, etaMs: number) => fitsBeforeTrain({ kind: 'pr', suites }, { now, etaMs, times, prepS });
  it('train N releasing, N+1 building, N+1 pending, N+1 releasing, nothing left', () => {
    const t0 = NOW; // train N's laptop success, a candidate green since long before
    const green = [t0 - 30 * MIN];
    // hold with ETA = success + merge lag + gap; the short run fits before it, the 206 s run does not
    const a = nextTrain({ releasing: { n: '110', laptopAtMs: t0 }, green, now: t0 + 5.25 * MIN }, lim);
    expect(a?.etaMs).toBe(t0 + 8.5 * MIN);
    expect(fits(['quick'], t0 + 5.25 * MIN, a!.etaMs)).toBe(true);
    expect(fits(['long'], t0 + 5.25 * MIN, a!.etaMs)).toBe(false);
    // train N+1 building: ETA = now, nothing fits, an alone request is held too
    const now2 = t0 + 9 * MIN;
    const b = nextTrain({ building: { n: '111', ageMs: MIN }, lastMerge: { n: '110', atMs: t0 + 2 * MIN }, green, now: now2 }, lim);
    expect(b?.etaMs).toBe(now2);
    expect(fits(['quick'], now2, b!.etaMs)).toBe(false);
    expect(holdKeeps({ id: 'x', kind: 'alone' }, { next: b, fits: false })).toBe(false);
    // N+1 head pending: trains first, a pr request waits
    const trainHead = { sha: 'b'.repeat(40), n: '111' };
    const q = { trains: [trainHead], requests: [req(5, 'pr')] };
    expect(pick(q, now2, slots(false, false))).toEqual({ kind: 'train', train: trainHead });
    // N+1 laptop success with another green candidate: a new hold with N+1's ETA
    const t1 = t0 + 20 * MIN;
    const g2 = [t1 - 2 * MIN];
    const c = nextTrain({ releasing: { n: '111', laptopAtMs: t1 }, green: g2, now: t1 + MIN }, lim);
    expect(c?.etaMs).toBe(t1 + 8.5 * MIN);
    expect(c?.why).toMatch(/^train 111 releasing/);
    // no candidates left: no hold
    expect(nextTrain({ releasing: { n: '111', laptopAtMs: t1 }, green: [], running: 0, now: t1 + MIN }, lim)).toBeNull();
  });
});

describe('train-ready heads', () => {
  const prs = [
    { head: 'a', check: { status: 'COMPLETED', conclusion: 'SUCCESS' } },
    { head: 'b', check: { status: 'IN_PROGRESS', conclusion: '' } },
    { head: 'c', check: { status: 'QUEUED', conclusion: null } },
    { head: 'd', check: { status: 'COMPLETED', conclusion: 'FAILURE' } },
    { head: 'e', check: null },
  ];
  it('readyHeads: green / running split, failed and missing checks dropped, heads in a train or master dropped', () => {
    expect(readyHeads(prs)).toEqual({ green: ['a'], running: ['b', 'c'] });
    expect(readyHeads(prs, (h: string) => h === 'a' || h === 'c')).toEqual({ green: [], running: ['b'] });
    // unreadable input (a gh error): empty, so no hold
    expect(readyHeads(undefined)).toEqual({ green: [], running: [] });
    expect(readyHeads([])).toEqual({ green: [], running: [] });
  });
  it('readyOrPending: green + running count, not the open train members', () => {
    expect(readyOrPending(prs)).toBe(3);
    expect(readyOrPending(prs, (h: string) => h === 'a')).toBe(2);
    expect(readyOrPending([])).toBe(0);
    expect(readyOrPending(undefined)).toBe(0);
  });
  it('seenSince: keeps old times, stamps new heads, drops gone ones, never mutates prev', () => {
    const prev = { a: 1000, gone: 500 };
    const out = seenSince(prev, ['a', 'b'], NOW);
    expect(out).toEqual({ a: 1000, b: NOW });
    expect(prev).toEqual({ a: 1000, gone: 500 });
    // after a restart: the persisted object (state.json round trip) keeps the old times
    expect(seenSince(JSON.parse(JSON.stringify(out)), ['a', 'b'], NOW + 60_000)).toEqual({ a: 1000, b: NOW });
    expect(seenSince(undefined, [], NOW)).toEqual({});
  });
  it('releasingTrain: the youngest laptop-e2e success among the open heads', () => {
    const at = (min: number) => new Date(NOW - min * 60_000).toISOString();
    expect(releasingTrain([{ n: '67', laptop: 'success', laptopAt: at(2) }], NOW)).toEqual({ n: '67', ageMs: 2 * 60_000 });
    expect(releasingTrain([{ n: '67', laptop: 'success', laptopAt: at(8) }, { n: '68', laptop: 'success', laptopAt: at(1) }], NOW)?.n).toBe('68');
    expect(releasingTrain([{ n: '67', laptop: 'pending', laptopAt: at(1) }, { n: '68', laptop: '', laptopAt: '' }], NOW)).toBeNull();
    expect(releasingTrain([{ n: '67', laptop: 'success', laptopAt: '' }], NOW)).toBeNull(); // no time: no hold
    expect(releasingTrain([], NOW)).toBeNull();
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

describe('kept suites after a train preempt (laptop-queue-8 slice C)', () => {
  const SHA = 'c'.repeat(40);
  it('finishedSuites reads streamed and parallel result lines, not start headers or the times table', () => {
    const streamed = [
      '$ node scripts/run-e2e.mjs e2e-coop e2e-pad e2e-menu',
      '',
      '=== e2e-coop ===',
      'ok 1 - lobby',
      '',
      '=== e2e-coop (ok, 41s) ===',
      '',
      '=== e2e-pad ===',
      'not ok 2 - stick',
      '',
      '=== e2e-pad (FAIL, 12s) ===',
      '',
      '=== anim-audit (REPORT ONLY: never fails the run) ===',
      '',
      '=== anim-audit (REPORT ONLY, exit 1, 9s) ===',
      '',
      '=== e2e-menu ===',
      'ok 1 - menu',
    ].join('\r\n');
    expect(finishedSuites(streamed)).toEqual([
      { s: 'e2e-coop', ok: true, report: false, sec: 41 },
      { s: 'e2e-pad', ok: false, report: false, sec: 12 },
      { s: 'anim-audit', ok: false, report: true, sec: 9 },
    ]);
    const parallel = '[start] e2e-desktop:1\n[start] e2e-coop\n\n=== e2e-desktop:1 (ok, 80s) ===\nlog\n\ntimes (GPU, 2 at a time):\n  e2e-desktop:1 ok 80s\n  e2e-coop FAIL 30s\n';
    expect(finishedSuites(parallel)).toEqual([{ s: 'e2e-desktop:1', ok: true, report: false, sec: 80 }]);
    expect(finishedSuites('')).toEqual([]);
  });
  it('keptPlan: same sha -> the rest without the kept suites; another sha or no kept -> everything', () => {
    const r = { suites: ['e2e-coop', 'e2e-pad', 'e2e-menu'], kept: { sha: SHA, suites: [{ s: 'e2e-coop', sec: 41 }] } };
    expect(keptPlan(r, SHA)).toEqual({ kept: [{ s: 'e2e-coop', sec: 41 }], rest: ['e2e-pad', 'e2e-menu'] });
    expect(keptPlan(r, 'd'.repeat(40))).toEqual({ kept: [], rest: ['e2e-coop', 'e2e-pad', 'e2e-menu'] });
    expect(keptPlan({ suites: ['e2e-pad'] }, SHA)).toEqual({ kept: [], rest: ['e2e-pad'] });
  });
  it('keptPlan: a base name keeps only when every part is kept, else it reruns whole', () => {
    const times = { 'e2e-desktop:1': 80, 'e2e-desktop:2': 70, 'e2e-coop': 40 };
    const one = { suites: ['e2e-desktop', 'e2e-coop'], kept: { sha: SHA, suites: [{ s: 'e2e-desktop:1', sec: 80 }] } };
    expect(keptPlan(one, SHA, times)).toEqual({ kept: [], rest: ['e2e-desktop', 'e2e-coop'] });
    const both = { suites: ['e2e-desktop', 'e2e-coop'], kept: { sha: SHA, suites: [{ s: 'e2e-desktop:2', sec: 70 }, { s: 'e2e-desktop:1', sec: 80 }] } };
    expect(keptPlan(both, SHA, times)).toEqual({ kept: [{ s: 'e2e-desktop:1', sec: 80 }, { s: 'e2e-desktop:2', sec: 70 }], rest: ['e2e-coop'] });
    // a part named on its own keeps by exact name
    expect(keptPlan({ suites: ['e2e-desktop:2'], kept: both.kept }, SHA, times).rest).toEqual([]);
  });
  it('keptPlan: every suite kept -> rest empty; a kept suite no longer in r.suites (re-filed) is dropped', () => {
    const all = { suites: ['e2e-coop'], kept: { sha: SHA, suites: [{ s: 'e2e-coop', sec: 41 }] } };
    expect(keptPlan(all, SHA)).toEqual({ kept: [{ s: 'e2e-coop', sec: 41 }], rest: [] });
    const refiled = { suites: ['e2e-pad'], kept: { sha: SHA, suites: [{ s: 'e2e-coop', sec: 41 }] } };
    expect(keptPlan(refiled, SHA)).toEqual({ kept: [], rest: ['e2e-pad'] });
    // a malformed kept block keeps nothing
    expect(keptPlan({ suites: ['e2e-coop'], kept: { sha: SHA, suites: 'x' } }, SHA).rest).toEqual(['e2e-coop']);
  });
  it('kept rows count as passes in the verdict description', () => {
    const result = { suites: [{ s: 'e2e-coop', ok: true, flaky: false, report: false, sec: 41, kept: true }, { s: 'e2e-pad', ok: true, flaky: false, report: false, sec: 12 }], wall: 20 };
    expect(describeRun(result)).toBe('2/2 pass, 20 s');
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

describe('hung runs and attempt folders (laptop-queue-10 S1)', () => {
  const t = { sha: 'a'.repeat(40), n: '57' };
  it('suiteEvents counts result lines and streamed start headers, not the times table', () => {
    expect(suiteEvents('=== e2e-a (ok, 40s) ===\nlog\n=== e2e-b (FAIL, 12s) ===\nlog')).toBe(2);
    expect(suiteEvents('\n=== e2e-a ===\nlog\n\n=== e2e-a (ok, 40s) ===\r\n')).toBe(2);
    expect(suiteEvents('=== e2e-r (REPORT ONLY: never fails the run) ===\n')).toBe(1);
    expect(suiteEvents('times (GPU, 1 at a time):\n  e2e-a ok 40s\n  e2e-b FAIL 12s\nKILLED: e2e-c after 900s')).toBe(0);
    expect(suiteEvents('')).toBe(0);
  });
  it('idleLimitMs never cuts under the suite timeout + 2 min; 0 is off', () => {
    expect(idleLimitMs(15, 900)).toBe(1_020_000);
    expect(idleLimitMs(20, 900)).toBe(1_200_000);
    expect(idleLimitMs(0, 900)).toBe(0);
  });
  it('idleStep moves the clock on a new event and is hung at the limit', () => {
    const L = 1_020_000;
    const a = idleStep(null, 0, NOW, L);
    expect(a).toEqual({ count: 0, at: NOW, hung: false }); // prev null starts the clock
    const b = idleStep(a, 1, NOW + 5_000, L);
    expect(b.at).toBe(NOW + 5_000);
    expect(idleStep(b, 1, NOW + 5_000 + L - 1, L).hung).toBe(false);
    expect(idleStep(b, 1, NOW + 5_000 + L, L).hung).toBe(true);
    expect(idleStep(b, 1, NOW + 10 * L, 0).hung).toBe(false); // limit 0: off
  });
  it('cutShort: hung stops at any stage, after withdrawn and superseded, before a pending train', () => {
    expect(cutShort({ kind: 'pr' }, { hung: true })).toBe('hung');
    expect(cutShort({ kind: 'full' }, { hung: true, started: true })).toBe('hung');
    expect(cutShort({ kind: 'pr' }, { hung: true, withdrawn: true })).toBe('withdrawn');
    expect(cutShort({ kind: 'pr' }, { hung: true, superseded: 'x' })).toBe('superseded');
    expect(cutShort({ kind: 'pr' }, { hung: true, trains: [t], started: true })).toBe('hung');
  });
  it('unfinishedParts lists the parts with no result row, in order', () => {
    expect(unfinishedParts(['a', 'b:1', 'b:2'], [{ s: 'a', ok: true }, { s: 'b:1', ok: false }])).toEqual(['b:2']);
  });
  it('hungTrainDesc names the failed and unfinished parts as FAIL, cut to 140', () => {
    const rows = [{ s: 'a', ok: true }, { s: 'b', ok: true }, { s: 'c', ok: true }, { s: 'd', ok: false }];
    expect(hungTrainDesc(rows, ['a', 'b', 'c', 'd', 'e'], 1100, 17)).toBe('3/5 pass, 1100 s; hung 17 min; FAIL: d,e');
    expect(hungTrainDesc(rows, ['a', 'b', 'c', 'd', 'e'], 1100, 17, 'desktop: ')).toBe('desktop: 3/5 pass, 1100 s; hung 17 min; FAIL: d,e');
    const many = Array.from({ length: 40 }, (_, i) => `e2e-suite-${i}`);
    const d = hungTrainDesc([], many, 1100, 17);
    expect(d).toHaveLength(140);
    expect(d.endsWith('...')).toBe(true);
  });
  it('attemptDir gives each attempt its own folder', () => {
    expect(attemptDir('runs/x', () => false)).toBe('runs/x');
    const have = new Set(['runs/x', 'runs/x-2']);
    expect(attemptDir('runs/x', (p: string) => have.has(p))).toBe('runs/x-3');
  });
});

describe('aged alone after the coming train', () => {
  const MIN = 60_000;
  const aged = req(ALONE_AGE_MIN + 10, 'alone', 'gc');
  const young = req(5, 'alone', 'young');
  const spare = spareReq(90, 'alone');
  const iso = (ms: number) => new Date(ms).toISOString();
  it('aloneDue stamps an aged alone only when a hold dropped it, and keeps the stamp', () => {
    const requests = [aged, young, spare, req(50, 'pr')];
    expect(aloneDue({}, { requests, now: NOW, held: new Set() })).toEqual({});
    const held = new Set([aged.id, young.id, spare.id]);
    const due = aloneDue({}, { requests, now: NOW, held });
    expect(due).toEqual({ [aged.id]: NOW }); // a young alone and spare work are never stamped
    expect(aloneDue(due, { requests, now: NOW + 5 * MIN, held })).toEqual({ [aged.id]: NOW }); // the first time stays
    expect(aloneDue(due, { requests, now: NOW + 5 * MIN, held: new Set() })).toEqual({ [aged.id]: NOW });
    expect(aloneDue(due, { requests: [young], now: NOW + 5 * MIN, held })).toEqual({}); // done or withdrawn: dropped
  });
  it('aloneDue stamps a preempted (front) alone however young', () => {
    expect(aloneDue({}, { requests: [young], front: new Set([young.id]), now: NOW, held: new Set([young.id]) })).toEqual({ [young.id]: NOW });
  });
  it('lastTrainEndFrom takes the newest success / failure time and never goes back', () => {
    const heads = [
      { n: '50', laptop: 'success', laptopAt: iso(NOW - 20 * MIN) },
      { n: '51', laptop: 'failure', laptopAt: iso(NOW - 5 * MIN) },
      { n: '52', laptop: 'pending', laptopAt: iso(NOW) },
      { n: '53', laptop: 'error', laptopAt: iso(NOW) },
      { n: '54', laptop: '', laptopAt: '' },
    ];
    expect(lastTrainEndFrom(heads, NaN)).toBe(NOW - 5 * MIN);
    expect(lastTrainEndFrom(heads, NOW - 30 * MIN)).toBe(NOW - 5 * MIN);
    expect(lastTrainEndFrom(heads, NOW - MIN)).toBe(NOW - MIN); // a merged train's later end survives
    expect(lastTrainEndFrom([], NOW - MIN)).toBe(NOW - MIN);
    expect(lastTrainEndFrom([], undefined)).toBeNaN();
  });
  it('aloneGapOpen is false before a train ends after the mark, true after', () => {
    const due = { [aged.id]: NOW };
    expect(aloneGapOpen(due, aged.id, NaN)).toBe(false);
    expect(aloneGapOpen(due, aged.id, NOW - MIN)).toBe(false);
    expect(aloneGapOpen(due, aged.id, NOW)).toBe(false);
    expect(aloneGapOpen(due, aged.id, NOW + MIN)).toBe(true);
    expect(aloneGapOpen(due, young.id, NOW + MIN)).toBe(false);
    expect(aloneGapOpen(null, aged.id, NOW + MIN)).toBe(false);
  });
  it('pick: the due alone takes both slots ahead of a green pr request; a pending train still goes first', () => {
    const pr = req(50, 'pr', 'green');
    const order = { green: new Set([pr.id]), wallS: { [pr.id]: 60 }, frontBranches: [], maxWaitMs: 0 };
    const q = { trains: [], requests: [pr, aged], order };
    expect(pick(q, NOW, slots(false, false))).toEqual({ kind: 'alone', request: aged });
    expect(pick(q, NOW, slots(true, false))).toBeNull(); // the slots drain for it
    expect(pick({ ...q, trains: [train] }, NOW, slots(false, false))).toEqual({ kind: 'train', train });
    const preempted = { trains: [], requests: [pr, young], front: new Set([young.id]), order };
    expect(pick(preempted, NOW, slots(false, false))).toEqual({ kind: 'alone', request: young });
  });
  it('cutShort: a pending train does not cut a due alone 3 min in, a non-due one it does', () => {
    const run = { trains: [train], started: true, startedAt: NOW - 3 * MIN, now: NOW };
    expect(cutShort({ kind: 'alone' }, { ...run, due: true })).toBe('');
    expect(cutShort({ kind: 'alone' }, run)).toBe('train');
    expect(cutShort({ kind: 'alone' }, { ...run, due: true, withdrawn: true })).toBe('withdrawn');
    expect(cutShort({ kind: 'pr' }, { ...run, due: true })).toBe('train'); // only the young-alone cut is waived
  });
  it('timeline: held at t0, train ends at t1, a re-armed hold still lets the alone through', () => {
    const pr = req(2, 'pr', 'late'); // does not fit before the train
    const t0 = NOW;
    const next1 = { why: '1 train-ready PR(s)', etaMs: t0 + 10 * MIN };
    // pass at t0: the train-soon hold drops the aged alone -> stamped
    let lastEnd = lastTrainEndFrom([{ n: '49', laptop: 'success', laptopAt: iso(t0 - 60 * MIN) }], NaN);
    const kept0 = [aged, pr].filter((r) => holdKeeps(r, { next: next1, due: {}, lastTrainEnd: lastEnd, fits: false }));
    expect(kept0).toEqual([]);
    let due = aloneDue({}, { requests: [aged, pr], now: t0, held: new Set([aged.id]) });
    expect(due).toEqual({ [aged.id]: t0 });
    // train 50 runs and ends at t1 (here, the desktop or a carry: any final laptop-e2e on its head)
    const t1 = t0 + 25 * MIN;
    const midway = [{ n: '50', laptop: 'pending', laptopAt: iso(t0 + 2 * MIN) }];
    lastEnd = lastTrainEndFrom(midway, lastEnd);
    expect(holdKeeps(aged, { next: next1, due, lastTrainEnd: lastEnd })).toBe(false); // still waiting on the train
    lastEnd = lastTrainEndFrom([{ n: '50', laptop: 'success', laptopAt: iso(t1) }], lastEnd);
    expect(lastEnd).toBe(t1);
    // t2: a new train-ready PR re-arms the hold; the alone passes, PR work does not; the stamp stays
    const t2 = t1 + 2 * MIN;
    const next2 = { why: '2 train-ready PR(s)', etaMs: t2 + 15 * MIN };
    const kept2 = [aged, pr].filter((r) => holdKeeps(r, { next: next2, due, lastTrainEnd: lastEnd, fits: false }));
    expect(kept2).toEqual([aged]);
    due = aloneDue(due, { requests: [aged, pr], now: t2, held: new Set() });
    expect(due).toEqual({ [aged.id]: t0 });
    expect(pick({ trains: [], requests: kept2 }, t2, slots(false, false))).toEqual({ kind: 'alone', request: aged });
    // LQ_ALONE_GAP=0: the service passes due null and the hold keeps it back as before
    expect(holdKeeps(aged, { next: next2, due: null, lastTrainEnd: lastEnd })).toBe(false);
    // no hold, a train rerun and a fitting run always pass
    expect(holdKeeps(pr, { next: null })).toBe(true);
    expect(holdKeeps({ ...pr, trainRerun: true }, { next: next2 })).toBe(true);
    expect(holdKeeps(pr, { next: next2, fits: true })).toBe(true);
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
  // laptop-queue-7 A10: a train rerun shards across both slots when the laptop is free
  it('shards across both slots when both are idle, it is the only open rerun and the service marked it', () => {
    const rr = rerun(1);
    const q = { trains: [], requests: [req(30, 'pr', 'p'), rr], shardRerun: new Set([rr.id]) };
    expect(pick(q, NOW, slots(false, false))).toEqual({ kind: 'request', request: rr, slot: '4189', ports: ['4189', '4192'] });
  });
  it('one slot busy: starts on the free slot at once, no waiting for the second', () => {
    const rr = rerun(1);
    const q = { trains: [], requests: [rr], shardRerun: new Set([rr.id]) };
    expect(pick(q, NOW, slots(true, false))).toEqual({ kind: 'request', request: rr, slot: '4192' });
    expect(pick(q, NOW, slots(false, true))).toEqual({ kind: 'request', request: rr, slot: '4189' });
  });
  it('two open reruns: one slot each, no shard', () => {
    const a = rerun(20, 'a');
    const b = rerun(5, 'b');
    const q = { trains: [], requests: [a, b], shardRerun: new Set([a.id, b.id]) };
    expect(pick(q, NOW, slots(false, false))).toEqual({ kind: 'request', request: a, slot: '4189' });
    expect(pick({ ...q, requests: [b] }, NOW, slots(true, false))).toEqual({ kind: 'request', request: b, slot: '4192' });
  });
  it('a pending train goes first; an early rerun under it runs on one slot, never sharded', () => {
    const rr = rerun(1);
    expect(pick({ trains: [train], requests: [rr], shardRerun: new Set([rr.id]) }, NOW, slots(false, false))).toEqual({ kind: 'train', train });
    const early = { ...rerun(2, 'e'), set: 'train30-rerun' };
    expect(pick({ trains: [train], requests: [early], shardRerun: new Set([early.id]) }, NOW, slots(false, false))).toEqual({ kind: 'request', request: early, slot: '4189' });
  });
  it('shardRerun absent or without the id: today\'s one-slot pick', () => {
    const rr = rerun(1);
    expect(pick({ trains: [], requests: [rr] }, NOW, slots(false, false))).toEqual({ kind: 'request', request: rr, slot: '4189' });
    expect(pick({ trains: [], requests: [rr], shardRerun: new Set() }, NOW, slots(false, false))).toEqual({ kind: 'request', request: rr, slot: '4189' });
  });
  it('suiteParts expands a suite into its times parts and keeps parts and unknown names', () => {
    const times = { 'e2e-desktop:1': 60, 'e2e-desktop:2': 50, 'e2e-coop': 40 };
    expect(suiteParts(['e2e-desktop', 'e2e-coop', 'e2e-new'], times)).toEqual(['e2e-desktop:1', 'e2e-desktop:2', 'e2e-coop', 'e2e-new']);
    expect(suiteParts(['e2e-desktop:2'], times)).toEqual(['e2e-desktop:2']);
    expect(suiteParts(['e2e-coop'], {})).toEqual(['e2e-coop']);
    expect(suiteParts(['e2e-coop'], times).length).toBe(1); // one part: the service never marks it for a shard
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
    expect(calls).toEqual([['merge-base', 'origin/master', SHA('1')], ['diff', '--name-only', '--no-renames', 'b'.repeat(40), SHA('1')], ['show', `${SHA('1')}:src/net/protocol.ts`]]);
    expect(got.files).toEqual(['docs/x.md', 'src/game/sectors/a.ts']);
    expect(got.suites).toEqual(['e2e-gadgets', 'e2e-park', 'e2e-sectorops']);
    expect(affectedSuites(run('docs/a.md\ntests/b.test.ts'), SHA('1')).suites).toEqual([]);
    expect(affectedSuites(run(''), SHA('1')).suites).toEqual([]);
    expect(affectedSuites(() => { throw new Error('no'); }, SHA('1'))).toBeNull();
    expect(affectedSuites(() => '', SHA('1'))).toBeNull();
    const wide = affectedSuites(run('src/game/sectors/a.ts'), SHA('1'), { wide: true });
    expect(wide.suites).toEqual(selectSuites(['src/game/sectors/a.ts'], WIDE_COVERS));
  });
  it('affectedSuites: the wire rule reads protocol.ts at the sha (skipped when the read fails); max 0 is the uncapped gated list', () => {
    const run = (files: string, proto: string | null) => (args: string[]) => {
      if (args[0] === 'merge-base') return 'b'.repeat(40);
      if (args[0] === 'show') { if (proto === null) throw new Error('no protocol.ts'); return proto; }
      return files;
    };
    const proto = "import type { MoveState } from '../player/moveState';\n";
    expect(affectedSuites(run('src/player/moveState.ts', proto), SHA('1')).suites).toEqual(['e2e-coop', 'e2e-ctcourse', 'e2e-netmove']);
    expect(affectedSuites(run('src/player/moveState.ts', null), SHA('1')).suites).toEqual(['e2e-clip', 'e2e-move', 'e2e-stealth']);
    const all = affectedSuites(run('src/game/sectors/a.ts\nsrc/world/lightBake.ts', ''), SHA('1'), { max: 0 }).suites;
    expect(all).toEqual(['e2e-desktop', 'e2e-gadgets', 'e2e-lightbake', 'e2e-park', 'e2e-sectorops', 'e2e-tactics', 'e2e-takedown', 'smoke']);
  });
  it('overCapAffected: only open automatic affected requests over the cap are re-filed', () => {
    const four = ['e2e-anim', 'e2e-clip', 'e2e-move', 'e2e-stealth'];
    const auto = (o: Record<string, unknown> = {}) => ({ id: `a${Object.keys(o).length}`, sha: SHA('1'), kind: 'pr', requester: AFFECTED_REQUESTER, set: 'affected', suites: four, ...o });
    const over = (rs: unknown[], max = 3) => (overCapAffected(rs, max) as { id: string }[]);
    expect(over([auto()])).toHaveLength(1);
    // a lead's hand-filed request (set affected, own requester) is never narrowed
    expect(over([auto({ requester: 'Night Shift | Lead x' })])).toEqual([]);
    for (const o of [{ pin: true }, { trainRerun: true }, { laptopRerun: true }, { kind: 'alone' }]) expect(over([auto(o)]), JSON.stringify(o)).toEqual([]);
    expect(over([auto({ suites: ['e2e-anim', 'e2e-clip', 'e2e-move'] })])).toEqual([]);
    // two parts of one suite count once
    expect(over([auto({ suites: ['e2e-anim', 'e2e-clip', 'e2e-sectorops:1', 'e2e-sectorops:6'] })])).toEqual([]);
    expect(over([auto()], 0)).toEqual([]);
    expect(over([auto()], 5)).toEqual([]);
  });
  it('affectedNeeds: skips trains, drafts, the skip label, heads with a status, open requests and enqueued shas', () => {
    const prs = [
      pr(1),
      pr(2, { headRefName: 'train/66' }),
      pr(3, { isDraft: true }),
      pr(4, { labels: [{ name: AFFECTED_SKIP_LABEL }] }),
      pr(5, { statusCheckRollup: [{ context: AFFECTED_CTX, state: 'FAILURE' }] }),
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
  it('affectedNeeds: a pending affected-e2e with no open, claimed or running affected request is requested again (stuck)', () => {
    const pending = { statusCheckRollup: [{ context: AFFECTED_CTX, state: 'PENDING' }] };
    expect(affectedNeeds([pr(5, pending)])).toEqual([{ pr: 5, sha: SHA('5'), branch: 'feature/p5', stuck: true }]);
    expect(affectedNeeds([pr(5, pending)], [{ requester: AFFECTED_REQUESTER, sha: SHA('5') }])).toEqual([]);
    expect(affectedNeeds([pr(5, pending)], [{ requester: AFFECTED_REQUESTER, sha: SHA('5'), active: true }])).toEqual([]);
    expect(affectedNeeds([pr(5, pending)], [], new Set([SHA('5')]))).toEqual([]);
    // a lead's request on the head does not carry affected-e2e: still stuck
    expect(affectedNeeds([pr(5, pending)], [{ requester: 'lead', sha: SHA('5') }]).map((x: { stuck?: boolean }) => x.stuck)).toEqual([true]);
    for (const state of ['SUCCESS', 'FAILURE', 'ERROR']) expect(affectedNeeds([pr(5, { statusCheckRollup: [{ context: AFFECTED_CTX, state }] })])).toEqual([]);
  });
  it('affectedNeeds: a CONFLICTING head comes back marked, MERGEABLE / UNKNOWN / missing stay plain', () => {
    const got = affectedNeeds([pr(1, { mergeable: 'CONFLICTING' }), pr(2, { mergeable: 'MERGEABLE' }), pr(3, { mergeable: 'UNKNOWN' }), pr(4)]);
    expect(got.map((x: { conflicting?: boolean }) => x.conflicting)).toEqual([true, undefined, undefined, undefined]);
    // a final affected-e2e status (the error posted for the conflict) skips it, so the error is posted once per head
    expect(affectedNeeds([pr(1, { mergeable: 'CONFLICTING', statusCheckRollup: [{ context: AFFECTED_CTX, state: 'ERROR' }] })])).toEqual([]);
  });
  it('prBoard: mergeable values, check + checker green, a failed / pending checker or missing rollup is not green', () => {
    const ok = [{ name: 'check', conclusion: 'SUCCESS' }, { context: 'checker', state: 'SUCCESS' }];
    const b = prBoard([
      pr(1, { mergeable: 'CONFLICTING', statusCheckRollup: ok }),
      pr(2, { mergeable: 'MERGEABLE', statusCheckRollup: ok }),
      pr(3, { mergeable: 'UNKNOWN' }),
      pr(4, { statusCheckRollup: [ok[0], { context: 'checker', state: 'FAILURE' }] }),
      pr(5, { statusCheckRollup: [ok[0], { context: 'checker', state: 'PENDING' }] }),
      pr(6, { statusCheckRollup: [{ name: 'check', conclusion: 'FAILURE' }, ok[1]] }),
      pr(7, { statusCheckRollup: undefined }),
      { headRefOid: SHA('9') },
    ]);
    expect(b.get(1)).toEqual({ head: SHA('1'), conflicting: true, green: true, fix: false });
    expect(b.get(2)).toEqual({ head: SHA('2'), conflicting: false, green: true, fix: false });
    expect(b.get(3)).toEqual({ head: SHA('3'), conflicting: false, green: false, fix: false });
    for (const n of [4, 5, 6, 7]) expect(b.get(n).green).toBe(false);
    expect(b.size).toBe(7);
    expect(prBoard(undefined).size).toBe(0);
  });
  it('conflictRetire: an affected request on the current conflicting head only (A1, A2); an empty board retires nothing', () => {
    const a = (tag: string, n: number, sha: string, o: Record<string, unknown> = {}) => ({ id: idAt(10, tag), requester: AFFECTED_REQUESTER, kind: 'pr', set: 'affected', pr: n, sha, suites: ['smoke'], ...o });
    const board = prBoard([pr(1, { mergeable: 'CONFLICTING' }), pr(2, { mergeable: 'UNKNOWN' }), pr(3, { mergeable: 'CONFLICTING' }), pr(4, { mergeable: 'CONFLICTING' })]);
    const cur = a('c', 1, SHA('1'));
    const filed = a('f', 4, SHA('4'), { requester: 'lead' });
    expect(conflictRetire([cur, a('o', 1, SHA('8')), a('u', 2, SHA('2')), a('n', 3, SHA('3'), { set: 'coop', requester: 'lead' }), a('x', 7, SHA('7')), a('p', undefined as unknown as number, SHA('1')), filed], board)).toEqual([cur.id, filed.id]);
    expect(conflictRetire([cur], new Map())).toEqual([]);
    expect(conflictRetire(undefined, board)).toEqual([]);
  });
  it('conflictStatuses: both contexts for an auto or filed affected request, the PR number in the text', () => {
    const r = { id: 'x', requester: AFFECTED_REQUESTER, kind: 'pr', set: 'affected', pr: 12, sha: SHA('a'), suites: ['smoke'] };
    const description = 'not run: PR #12 conflicts with master (a new head runs again)';
    const both = [{ sha: SHA('a'), state: 'error', context: 'laptop-e2e/affected', description }, { sha: SHA('a'), state: 'error', context: AFFECTED_CTX, description }];
    expect(conflictStatuses(r)).toEqual(both);
    expect(conflictStatuses({ ...r, requester: 'lead' })).toEqual(both);
    expect(conflictStatuses({ ...r, requester: 'lead', set: 'coop' })).toEqual([{ sha: SHA('a'), state: 'error', context: 'laptop-e2e/coop', description }]);
    expect(conflictStatuses(undefined)).toEqual([]);
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
  it('an affected survivor on the same sha takes affected-e2e over; another sha or requester does not', () => {
    const aff = { ...orig, requester: AFFECTED_REQUESTER, set: 'affected' };
    expect(supersedeStatuses(aff, 'N', { ...aff, id: 'N' })).toEqual([{ sha: orig.sha, state: 'pending', context: AFFECTED_CTX, description: 'handed over to N' }]);
    expect(supersedeStatuses(aff, 'N', { ...aff, id: 'N', sha: 'b'.repeat(40) })[0].state).toBe('error');
    expect(supersedeStatuses(aff, 'N', { ...orig, id: 'N' })[0].state).toBe('error');
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

describe('affected-e2e never stuck pending (Orchestrator audit 2026-10-25)', () => {
  const S = 'c'.repeat(40);
  const W = 60 * 60_000;
  const aff = (min: number, tag: string, o: Record<string, unknown> = {}) => ({ id: idAt(min, tag), requester: AFFECTED_REQUESTER, kind: 'pr', sha: S, branch: 'feature/x', pr: 12, set: 'affected', suites: ['smoke', 'e2e-coop'], ...o });
  it('duplicates: an affected request is retired against another affected request or a recent pass, never against a lead run', () => {
    const lead = aff(40, 'lead', { requester: 'Night Shift | Player Build' });
    const a1 = aff(30, 'a1');
    const a2 = aff(20, 'a2');
    expect([...duplicates([a1, a2], [], NOW, W)]).toEqual([[a2.id, a1.id]]);
    expect([...duplicates([{ ...a1, active: true }, a2], [], NOW, W)]).toEqual([[a2.id, a1.id]]);
    // the lead's open or running run posts laptop-e2e/affected only: the affected one stays and runs
    expect(duplicates([lead, a1], [], NOW, W).size).toBe(0);
    expect(duplicates([{ ...lead, active: true }, a1], [], NOW, W).size).toBe(0);
    // with both open, a second affected one goes to the affected survivor, and a newer lead run to the oldest
    expect([...duplicates([lead, a1, a2], [], NOW, W)]).toEqual([[a2.id, a1.id]]);
    const lead2 = aff(10, 'lead2', { requester: 'Night Shift | Player Build' });
    expect(duplicates([a1, lead2], [], NOW, W).get(lead2.id)).toBe(a1.id);
    // a recent pass of the same run (any requester) retires it
    const done = [{ id: 'D', key: dupKey(lead), result: 'success', date: new Date(NOW - 10 * 60_000).toISOString() }];
    expect(duplicates([a1], done, NOW, W).get(a1.id)).toBe('D');
  });
  it('duplicateStatuses: hand over to an affected survivor, success after a recent pass, nothing for other requesters', () => {
    const a1 = aff(30, 'a1');
    const a2 = aff(20, 'a2');
    expect(duplicateStatuses(a2, a1.id, a1)).toEqual([{ sha: S, state: 'pending', context: AFFECTED_CTX, description: `handed over to ${a1.id}` }]);
    expect(duplicateStatuses(a2, 'D', null, 'success')).toEqual([{ sha: S, state: 'success', context: AFFECTED_CTX, description: 'duplicate of D, passed' }]);
    expect(duplicateStatuses(a2, 'X', { ...a1, requester: 'lead' })[0].state).toBe('error');
    expect(duplicateStatuses(a2, 'D', null, 'failure')[0].state).toBe('error');
    expect(duplicateStatuses({ ...a2, requester: 'lead' }, a1.id, a1)).toEqual([]);
    expect(duplicateStatuses(undefined, 'X', null)).toEqual([]);
  });
  it('withdrawnStatuses: an unrun affected request closes affected-e2e, a laptop rerun its own context too', () => {
    const a = aff(30, 'a');
    const d = 'withdrawn by the requester (not run)';
    expect(withdrawnStatuses(a)).toEqual([{ sha: S, state: 'error', context: AFFECTED_CTX, description: d }]);
    const rr = laptopRerunRequest(a, ['e2e-coop'], { now: NOW, suffix: 'beef' });
    expect(withdrawnStatuses(rr)).toEqual([{ sha: S, state: 'error', context: 'laptop-e2e/affected', description: d }, { sha: S, state: 'error', context: AFFECTED_CTX, description: d }]);
    expect(withdrawnStatuses({ ...a, requester: 'lead' })).toEqual([]);
    expect(withdrawnStatuses(null)).toEqual([]);
  });
  it('vanishedRequests: gone only after two listings in a row; listed again starts over', () => {
    const a = aff(30, 'a');
    const b = aff(20, 'b');
    const tracked = new Map([[a.id, a], [b.id, b]]);
    const one = vanishedRequests(tracked, new Set([b.id]));
    expect(one.gone).toEqual([]);
    expect([...one.misses]).toEqual([[a.id, 1]]);
    const back = vanishedRequests(tracked, new Set([a.id, b.id]), one.misses);
    expect(back.gone).toEqual([]);
    expect(back.misses.size).toBe(0);
    const two = vanishedRequests(tracked, new Set([b.id]), one.misses);
    expect(two.gone).toEqual([a]);
    expect(two.misses.size).toBe(0);
  });
});

describe('train head moves (trains 111 / 112)', () => {
  const sh = (c: string) => c.repeat(40);
  const H = sh('a'), D2 = sh('b'), D1 = sh('c'), V = sh('d');
  const vSub = (n: number) => `4.106.0: version at merge, train ${n} (G183)`;
  // `git log --first-parent --format=%H%x09%s` lines, newest first
  const lines = [`${H}\ttrain 112: doc fix`, `${D2}\ttrain 112: fix 2`, `${D1}\tMerge origin/feature/a into train/112`, `${V}\t${vSub(112)}`, `${sh('e')}\tolder`];
  // the service's live(P): claimed here, or an open claim under LQ_CLAIM_MAX_H (a done claim never counts)
  const T = Date.parse('2026-10-26T10:00:00Z');
  const MAX = 3 * 3600_000;
  const liveOf = (claims: Record<string, string>, claimed = new Set<string>()) => (p: string) => {
    if (claimed.has(p)) return true;
    const c = parseClaim(claims[p] ?? '');
    return !!c && !c.done && claimBlocks(c, 'laptop', T, MAX);
  };
  const docs = ['docs/x.md', 'changes/f.md', 'CHANGELOG.md', 'src/a/README.md'];
  const delta = (byFrom: Record<string, string[]>) => (from: string) => byFrom[from] ?? docs;

  it('versionAt finds V under a fix commit, not past depth, not another train\'s version; isVersionHead', () => {
    expect(versionAt(lines, 112)).toEqual({ versionSha: V, index: 3 });
    expect(versionAt(lines, '112', 20)).toEqual({ versionSha: V, index: 3 });
    expect(versionAt([`${V}\t${vSub(112)}`], 112)).toEqual({ versionSha: V, index: 0 });
    expect(versionAt(lines, 112, 3)).toBeNull();
    expect(versionAt(lines, 111)).toBeNull();
    expect(versionAt([`${H}\tfix`, `${V}\t${vSub(111)}`, `${sh('e')}\t${vSub(112)}`], 112)).toBeNull();
    expect(versionAt([], 112)).toBeNull();
    expect(isVersionHead(vSub(112), 112)).toBe(true);
    expect(isVersionHead(`${vSub(112)}\n`, '112')).toBe(true);
    expect(isVersionHead(vSub(112), 11)).toBe(false);
    expect(isVersionHead('4.106.0: version at merge (G183)', 112)).toBe(false);
    expect(isVersionHead('train 112: doc fix', 112)).toBe(false);
  });

  it('carryFiles: the G325 docs-only set minus non-.md files under docs/', () => {
    expect(carryFiles(docs)).toBe(true);
    expect(carryFiles(['src/x.ts', 'docs/a.md'])).toBe(false);
    expect(carryFiles(['package.json'])).toBe(false);
    expect(carryFiles(['docs/kestrel/kestrel.blocks.json'])).toBe(false);
    expect(docsOnlyFiles(['docs/kestrel/kestrel.blocks.json'])).toBe(true); // the G325 set alone would carry it
    expect(carryFiles([])).toBe(false);
    expect(carryFiles(null)).toBe(false);
    expect(docsOnlyFiles([])).toBe(false);
    expect(watchdogDocsOnly).toBe(docsOnlyFiles);
  });

  it('carryFrom: the newest final verdict decides; a newer failure is never skipped', () => {
    const chain = (...st: string[]) => st.map((s, i) => ({ sha: [D2, D1, V][i], laptop: s }));
    // V pass, docs-only delta -> carried from V
    expect(carryFrom(chain('', '', 'success'), delta({}))).toEqual({ from: V });
    // code (or docs JSON) in the delta -> null (H runs as a train)
    for (const f of ['src/x.ts', 'package.json', 'docs/kestrel/kestrel.blocks.json']) expect(carryFrom(chain('', '', 'success'), delta({ [V]: [...docs, f] }))).toBeNull();
    // the newest success wins over an older one
    expect(carryFrom(chain('', 'success', 'success'), delta({}))).toEqual({ from: D1 });
    // V pass, D1 fail, H = D2 -> null; an error after a success too
    expect(carryFrom([{ sha: D1, laptop: 'failure' }, { sha: V, laptop: 'success' }], delta({}))).toBeNull();
    expect(carryFrom(chain('error', '', 'success'), delta({}))).toBeNull();
    // failure or no status on every chain commit -> null
    expect(carryFrom(chain('', '', 'failure'), delta({}))).toBeNull();
    expect(carryFrom(chain('', '', ''), delta({}))).toBeNull();
    expect(carryFrom([], delta({}))).toBeNull();
    // a git error on the delta -> null
    expect(carryFrom(chain('', '', 'success'), () => null)).toBeNull();
  });

  it('carryFrom waits only on a live docs-only run; a dead pending run counts as no verdict', () => {
    const pend = [{ sha: D2, laptop: 'pending' }, { sha: D1, laptop: '' }, { sha: V, laptop: 'failure' }];
    const open = JSON.stringify({ worker: 'desktop', at: '2026-10-26T09:30:00.000Z' });
    const done = JSON.stringify({ worker: 'desktop', at: '2026-10-26T09:30:00.000Z', done: true });
    const old = JSON.stringify({ worker: 'desktop', at: '2026-10-26T06:00:00.000Z' });
    // live: claimed here, or the other worker's open claim
    expect(carryFrom(pend, delta({}), liveOf({}, new Set([D2])))).toEqual({ wait: D2 });
    expect(carryFrom(pend, delta({}), liveOf({ [D2]: open }))).toEqual({ wait: D2 });
    // no claim, a done claim (lost final post), an open claim over LQ_CLAIM_MAX_H, this worker's own open claim (a
    // restart) -> not live: H runs (V failed)
    expect(carryFrom(pend, delta({}), liveOf({}))).toBeNull();
    expect(carryFrom(pend, delta({}), liveOf({ [D2]: done }))).toBeNull();
    expect(carryFrom(pend, delta({}), liveOf({ [D2]: old }))).toBeNull();
    expect(carryFrom(pend, delta({}), liveOf({ [D2]: JSON.stringify({ worker: 'laptop', at: '2026-10-26T09:30:00.000Z' }) }))).toBeNull();
    // ... or carries from an older success over a docs-only delta
    const older = [{ sha: D2, laptop: 'pending' }, { sha: D1, laptop: 'success' }, { sha: V, laptop: 'success' }];
    expect(carryFrom(older, delta({}), liveOf({}))).toEqual({ from: D1 });
    expect(carryFrom(older, delta({}), liveOf({ [D2]: done }))).toEqual({ from: D1 });
    // a live pending ancestor with a code delta -> null (H runs)
    expect(carryFrom(pend, delta({ [D2]: ['src/x.ts'] }), liveOf({ [D2]: open }))).toBeNull();
    // no injected live: never waits
    expect(carryFrom(pend, delta({}))).toBeNull();
  });

  it('carryDesc fits a status description', () => {
    expect(carryDesc('546a2286' + 'f'.repeat(32))).toBe('carried from 546a2286, docs-only delta');
    expect(carryDesc(sh('9')).length).toBeLessThan(140);
  });
});

describe('docs-only carry for PR heads (laptop-queue-8 slice E)', () => {
  const H = 'h'.repeat(40);
  const P1 = '1'.repeat(40);
  const P2 = '2'.repeat(40);
  const MB = 'm'.repeat(40);
  it('prChain drops the head and cuts before the merge-base', () => {
    expect(prChain([H, P1, P2, MB, 'x'], MB)).toEqual([P1, P2]);
    expect(prChain([` ${H} `, '', P1], MB)).toEqual([P1]); // merge-base past the depth: every line after H
    expect(prChain([H], MB)).toEqual([]);
    expect(prChain([H, MB], MB)).toEqual([]);
    expect(prChain([], MB)).toEqual([]);
  });
  it('a docs-only commit after a green affected head carries; a .ts commit runs', () => {
    const chain = prChain([H, P1, MB], MB).map((sha: string) => ({ sha, laptop: 'success' }));
    expect(carryFrom(chain, () => ['docs/laptop-queue-8/STATE.md', 'changes/x.md'])).toEqual({ from: P1 });
    expect(carryFrom(chain, () => ['docs/laptop-queue-8/STATE.md', 'src/game/x.ts'])).toBeNull();
    expect(carryFrom(chain, () => ['docs/kestrel/map.json'])).toBeNull(); // a non-.md file under docs/ runs
    expect(carryFrom(chain, () => null)).toBeNull(); // git error
  });
  it('an older pending head with a live affected request waits; no live request skips it', () => {
    const chain = [{ sha: P1, laptop: 'pending' }, { sha: P2, laptop: 'failure' }];
    const docs = () => ['README.md'];
    expect(carryFrom(chain, docs, (p: string) => p === P1)).toEqual({ wait: P1 });
    expect(carryFrom(chain, docs, () => false)).toBeNull(); // P2 failed: never skipped
    expect(carryFrom([{ sha: P1, laptop: 'pending' }, { sha: P2, laptop: 'success' }], docs, () => false)).toEqual({ from: P2 });
    expect(carryFrom([{ sha: P1, laptop: '' }], docs)).toBeNull(); // no verdict anywhere: H runs
  });
});
