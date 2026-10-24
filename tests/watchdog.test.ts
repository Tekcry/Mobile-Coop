import { describe, expect, it } from 'vitest';
import {
  parseArgs, parseList, scratchFiles, alert, applySince, actionText, parseLockText, lockAlerts, findOrphans, orphanAlerts,
  normalizePr, labelReady, prAlerts, ownerMap, versionCommit, releaseAlerts, indexScript, previewLabel, pagesAlerts,
  autoTrainAlerts, nonTestFiles, laptopAlerts, parseLooseIso, parseBrief, cloudAlerts, reopenText, labelComment,
  unlabelComment, redChecks, docsOnlyFiles, NS_CMD, E2E_CMD, LIMITS,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/watchdog.mjs';

const MIN = 60_000;
const NOW = Date.parse('2026-10-24T11:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();
const SHA = (c: string) => c.repeat(40).slice(0, 40);

describe('watchdog: options and alert bookkeeping', () => {
  it('parses tick options; fixes are opt-in per check', () => {
    const o = parseArgs(['tick']);
    expect(o.dry).toBe(false);
    expect([...o.fix]).toEqual([]);
    expect(o.checks.size).toBe(9);
    const f = parseArgs(['tick', '--dry-run', '--fix', 'locks, labels,release', '--checks', 'prs,labels', '--require-affected', '--no-self-update']);
    expect(f.dry).toBe(true);
    expect([...f.fix].sort()).toEqual(['labels', 'locks', 'release']);
    expect([...f.checks]).toEqual(['prs', 'labels']);
    expect(f.requireAffected).toBe(true);
    expect(f.selfUpdate).toBe('off');
    expect(o.requireAffected).toBeNull();
    expect(parseArgs(['tick', '--no-require-affected']).requireAffected).toBe(false);
    expect(() => parseArgs(['tick', '--fix', 'pages'])).toThrow(/unknown name "pages"/);
    expect(() => parseArgs(['tick', '--fix', 'all'])).toThrow();
    expect(() => parseArgs(['run'])).toThrow(/usage/);
    expect(() => parseArgs(['tick', '--bogus'])).toThrow(/unknown argument/);
    expect([...parseList('', ['a'], '--x')]).toEqual([]);
  });

  it('keeps the dry run off the real status, log and lock', () => {
    const real = scratchFiles('S', false);
    const dry = scratchFiles('S', true);
    expect(real.status.replace(/\\/g, '/')).toBe('S/watch-status.json');
    expect(dry.status.replace(/\\/g, '/')).toBe('S/watch-status.dryrun.json');
    expect(dry.log).not.toBe(real.log);
    expect(dry.lock).not.toBe(real.lock);
  });

  it('carries first-seen times, holds alerts inside their grace and sorts by severity', () => {
    const a = alert('release-dev-lag', 'dev', 'warn', 'behind', { graceMin: 5 });
    const b = alert('pr-conflict', '#1 x', 'high', 'conflict');
    const first = applySince([a, b], {}, NOW);
    expect(first.shown.map((x: { id: string }) => x.id)).toEqual(['pr-conflict:#1 x']);
    expect(first.held.map((x: { id: string }) => x.id)).toEqual(['release-dev-lag:dev']);
    const later = applySince([a, b], first.since, NOW + 6 * MIN);
    expect(later.shown.map((x: { id: string }) => x.id)).toEqual(['pr-conflict:#1 x', 'release-dev-lag:dev']);
    expect(later.shown[1].since).toBe(iso(NOW));
    // a cleared alert starts over
    expect(applySince([b], later.since, NOW + 7 * MIN).since).toEqual({ 'pr-conflict:#1 x': iso(NOW) });
  });

  it('says what a fix did, would do, or that the alert is alert only', () => {
    const fx = alert('k', 's', 'warn', 'd', { fix: { check: 'locks', desc: 'break it' } });
    expect(actionText(fx, new Set())).toBe('alert only (--fix locks would: break it)');
    expect(actionText(fx, new Set(['locks']))).toBe('fix: break it');
    expect(actionText(fx, new Set(['locks']), 'fixed: broke the lock')).toBe('fixed: broke the lock');
    expect(actionText(alert('k', 's', 'warn', 'd', { advice: 'tell X' }), new Set())).toBe('tell X');
    expect(actionText(alert('k', 's', 'warn', 'd'), new Set())).toBe('alert only');
  });
});

describe('watchdog: locks', () => {
  it('reads every lock writer format', () => {
    expect(parseLockText('Player | e2e | 2026-10-24T10:00:00.000Z | pid 42 | host DESK')).toMatchObject({ writer: 'heavy-lock', pid: 42, host: 'DESK' });
    expect(parseLockText('laptop-queue | 20261024T103116-night-shift-guard-ai-d0f574cb-c404 d0f574cb pid 4484 | 2026-10-24T10:33:24.628Z\n'))
      .toMatchObject({ writer: 'laptop-queue', pid: 4484, at: Date.parse('2026-10-24T10:33:24.628Z') });
    expect(parseLockText('auto-train | pid 7 | 2026-10-24T10:00:00.000Z')).toMatchObject({ writer: 'touch', pid: 7 });
    expect(parseLockText('Night Shift | Player Build | 21:00')).toMatchObject({ writer: 'session', pid: null });
    expect(parseLockText('mine')).toMatchObject({ writer: 'unknown', pid: null });
  });

  it('a dead pid is high and fixable only for a known writer', () => {
    const dead = () => false;
    const [a] = lockAlerts({ path: 'C:/NightShift/heavy.lock', text: 'laptop-queue | x abcd pid 99 | 2026-10-24T10:00:00.000Z', mtimeMs: 0 }, { now: NOW, alive: dead });
    expect(a).toMatchObject({ kind: 'lock-dead-pid', severity: 'high' });
    expect(a.fix).toMatchObject({ check: 'locks', type: 'break-lock', path: 'C:/NightShift/heavy.lock' });
    expect(a.detail).toMatch(/pid 99 is not running \(60 min old\)/);
    // heavy-lock line from another host: its pid cannot be checked here
    expect(lockAlerts({ path: 'L', text: 'P | 2026-10-24T10:00:00.000Z | pid 99 | host LAPTOP', mtimeMs: 0 }, { now: NOW, host: 'DESK', alive: dead })).toEqual([]);
    expect(lockAlerts({ path: 'L', text: 'P | 2026-10-24T10:00:00.000Z | pid 99 | host DESK', mtimeMs: 0 }, { now: NOW, host: 'desk', alive: dead })[0].fix).not.toBeNull();
    expect(lockAlerts({ path: 'L', text: null, mtimeMs: null }, { now: NOW, alive: dead })).toEqual([]);
    expect(lockAlerts({ path: 'L', text: 'auto-train | pid 7 | 2026-10-24T10:59:00.000Z', mtimeMs: 0 }, { now: NOW, alive: () => true })).toEqual([]);
  });

  it('a pid-less lock alerts (never fixable) only when old and no node runs', () => {
    const l = { path: 'L', text: 'Night Shift | Marlow | 19:00', mtimeMs: NOW - 61 * MIN };
    expect(lockAlerts(l, { now: NOW, nodeLive: true })).toEqual([]);
    const [a] = lockAlerts(l, { now: NOW, nodeLive: false });
    expect(a).toMatchObject({ kind: 'lock-stale', severity: 'warn', fix: null });
    expect(lockAlerts({ ...l, mtimeMs: NOW - 30 * MIN }, { now: NOW, nodeLive: false })).toEqual([]);
    expect(lockAlerts({ ...l, mtimeMs: NOW - 241 * MIN }, { now: NOW, nodeLive: true })[0]).toMatchObject({ kind: 'lock-old', severity: 'warn', fix: null });
    expect(lockAlerts({ path: 'L', text: 'auto-train | pid 7 | 2026-10-24T06:00:00.000Z', mtimeMs: 0 }, { now: NOW, alive: () => true })[0].kind).toBe('lock-old');
  });
});

describe('watchdog: orphans', () => {
  const t0 = NOW - 45 * MIN;
  const procs = [
    { pid: 10, ppid: 1, name: 'bash.exe', cmd: 'bash', created: t0 - MIN },
    { pid: 11, ppid: 10, name: 'tail.exe', cmd: 'tail -f /c/NightShift/scratch/x.log', created: t0 }, // parent alive
    { pid: 12, ppid: 999, name: 'tail.exe', cmd: 'tail -f /c/NightShift/scratch/x.log', created: t0 }, // parent gone
    { pid: 13, ppid: 998, name: 'grep.exe', cmd: 'grep -E STALE|DUP', created: t0 }, // not Night Shift
    { pid: 14, ppid: 997, name: 'node.exe', cmd: '"C:\\Program Files\\nodejs\\node.exe" scripts/e2e-coop.mjs http://127.0.0.1:4191/', created: t0 },
    { pid: 15, ppid: 996, name: 'node.exe', cmd: 'node server.js', created: t0 }, // not an e2e runner
    { pid: 16, ppid: 995, name: 'grep.exe', cmd: 'grep x /c/NightShift/a', created: NOW - 5 * MIN }, // young: a live pipeline
    { pid: 20, ppid: 1, name: 'cmd.exe', cmd: 'cmd', created: NOW - MIN },
    { pid: 17, ppid: 20, name: 'tail.exe', cmd: 'tail -f /c/NightShift/b', created: t0 }, // parent pid reused (newer)
    { pid: 18, ppid: 994, name: 'node.exe', cmd: 'node scripts/run-e2e.mjs e2e-move', created: NOW - 150 * MIN },
  ];

  it('finds parentless tail / grep / e2e runners past the minimum age', () => {
    const o = findOrphans(procs, NOW);
    expect(o.map((x: { pid: number }) => x.pid)).toEqual([12, 13, 14, 17, 18]);
    expect(o.map((x: { killable: boolean }) => x.killable)).toEqual([false, false, false, false, true]);
    expect(o.map((x: { why: string }) => x.why)).toEqual([expect.stringMatching(/^MSYS/), expect.stringMatching(/^MSYS/), 'killed from 120 min', expect.stringMatching(/^MSYS/), '']);
    // a heavy lock naming the runner or its (gone) parent keeps it alive
    expect(findOrphans(procs, NOW, { lockPids: new Set([18]) })[4].killable).toBe(false);
    expect(findOrphans(procs, NOW, { lockPids: new Set([994]) })[4].why).toBe('a heavy lock names it');
  });

  it('kills only old Night Shift e2e runners, by pid; MSYS tools are info, alert only', () => {
    const a = orphanAlerts(findOrphans(procs, NOW));
    expect(a[0]).toMatchObject({ severity: 'info', fix: null });
    expect(a[1].advice).toMatch(/never killed/);
    expect(a[2]).toMatchObject({ severity: 'warn', fix: null });
    expect(a[4].fix).toMatchObject({ check: 'orphans', type: 'kill', pid: 18 });
    expect(NS_CMD.test('node node_modules/vite/bin/vite.js preview --port 4191 --strictPort')).toBe(true);
    expect(NS_CMD.test('node node_modules/vite/bin/vite.js preview --port 5000')).toBe(false);
    expect(E2E_CMD.test('node scripts/run-e2e.mjs e2e-move')).toBe(true);
    expect(E2E_CMD.test('node scripts/e2e-move.mjs')).toBe(true);
    expect(E2E_CMD.test('node notscripts/e2e-move.mjs')).toBe(false);
  });
});

const ctxNode = (name: string, state: string, createdAt = '2026-10-24T10:00:00Z', description = '') => ({ __typename: 'StatusContext', context: name, state, description, createdAt });
const runNode = (name: string, conclusion: string, completedAt = '2026-10-24T10:00:00Z') => ({ __typename: 'CheckRun', name, status: 'COMPLETED', conclusion, completedAt, startedAt: completedAt });
type RecentCommit = { oid: string; committedDate: string; checkSuites?: { nodes: { createdAt: string }[] } };
function prNode({ number = 7, branch = 'feature/x', head = SHA('a'), labels = [] as string[], labeledAt = null as string | null, committedDate = '2026-10-24T09:00:00Z',
  contexts = [runNode('check', 'SUCCESS')] as unknown[], mergeable = 'MERGEABLE', isDraft = false, recent = [] as RecentCommit[] } = {}) {
  return {
    number, title: 't', headRefName: branch, headRefOid: head, isDraft, mergeable,
    labels: { nodes: labels.map((name) => ({ name })) },
    timelineItems: { nodes: labeledAt ? [{ __typename: 'LabeledEvent', createdAt: labeledAt, label: { name: 'train-ready' } }] : [] },
    recent: { nodes: recent.map((c) => ({ commit: c })) },
    headRef: { target: { oid: head, committedDate, statusCheckRollup: { contexts: { nodes: contexts } } } } as { target: { oid: string } } | null,
  };
}

describe('watchdog: PRs and the label convention', () => {
  const pa = (prs: unknown[], o: Record<string, unknown>) => prAlerts(prs, { requireAffected: false, ...o });
  it('normalizes a GraphQL PR (newest status per context, error = failure)', () => {
    const p = normalizePr(prNode({ labels: ['train-ready'], labeledAt: '2026-10-24T09:30:00Z',
      contexts: [runNode('check', 'SUCCESS', '2026-10-24T10:05:00Z'), ctxNode('checker', 'FAILURE', '2026-10-24T10:00:00Z'), ctxNode('checker', 'SUCCESS', '2026-10-24T10:10:00Z', 'Opus PASS'), ctxNode('laptop-e2e', 'ERROR')] }));
    expect(p).toMatchObject({ number: 7, branch: 'feature/x', labeled: true, labeledAt: Date.parse('2026-10-24T09:30:00Z'), headAt: Date.parse('2026-10-24T09:00:00Z'), check: 'success', checkGreenAt: Date.parse('2026-10-24T10:05:00Z') });
    expect(p.statuses.checker).toMatchObject({ state: 'success', description: 'Opus PASS' });
    expect(p.statuses['laptop-e2e'].state).toBe('failure');
  });

  it('labels only on green check + checker success + affected-e2e (required by default, opt-out)', () => {
    const base = { contexts: [runNode('check', 'SUCCESS'), ctxNode('checker', 'SUCCESS', undefined, 'Opus PASS')] };
    const off = { requireAffected: false };
    expect(labelReady(normalizePr(prNode(base)), off)).toEqual({ ready: true, why: 'check green, checker success (Opus PASS)' });
    expect(labelReady(normalizePr(prNode({ contexts: [runNode('check', 'SUCCESS')] })), off)).toMatchObject({ ready: false, why: 'checker missing' });
    expect(labelReady(normalizePr(prNode({ contexts: [runNode('check', 'FAILURE'), ctxNode('checker', 'SUCCESS')] }))).why).toBe('check failure');
    expect(labelReady(normalizePr(prNode({ contexts: [...base.contexts, ctxNode('affected-e2e', 'PENDING')] })), off).why).toBe('affected-e2e pending');
    expect(labelReady(normalizePr(prNode({ contexts: [...base.contexts, ctxNode('affected-e2e', 'SUCCESS')] }))).why).toMatch(/affected-e2e success$/);
    // default: no affected-e2e status -> not ready, flagged
    expect(labelReady(normalizePr(prNode(base)))).toEqual({ ready: false, why: 'affected-e2e unavailable', affectedMissing: true });
    expect(labelReady(normalizePr(prNode({ ...base, labels: ['no-affected-e2e'] })))).toEqual({ ready: true, why: 'check green, checker success (Opus PASS), affected-e2e waived (no-affected-e2e)' });
    // a head commit that is no longer headRefOid (or no headRef): its checks do not count
    const lag = prNode(base);
    lag.headRefOid = SHA('n');
    expect(normalizePr(lag)).toMatchObject({ head: SHA('n'), check: 'missing', checkGreenAt: null, statuses: {}, headAt: null });
    expect(normalizePr({ ...prNode(base), headRef: null })).toMatchObject({ check: 'missing', statuses: {} });
    // a rebased head whose commit date is older than the rest of the commit list is still read from the head itself
    const rebased = normalizePr(prNode({ ...base, committedDate: '2026-10-20T09:00:00Z',
      recent: [{ oid: SHA('a'), committedDate: '2026-10-20T09:00:00Z' }, { oid: SHA('z'), committedDate: '2026-10-24T09:00:00Z' }] }));
    expect(rebased).toMatchObject({ check: 'success', statuses: { checker: { state: 'success' } } });
    expect(labelReady(normalizePr(prNode({ ...base, isDraft: true }))).why).toBe('draft');
    expect(labelReady(normalizePr(prNode({ ...base, mergeable: 'CONFLICTING' }))).why).toBe('conflicting');
    expect(labelReady(normalizePr(prNode({ ...base, branch: 'train/65' }))).why).toBe('train PR');
  });

  it('alerts a ready unlabelled PR after 30 green min, or at once with --fix labels', () => {
    const contexts = [runNode('check', 'SUCCESS', iso(NOW - 20 * MIN)), ctxNode('checker', 'SUCCESS')];
    const prs = [normalizePr(prNode({ contexts }))];
    const off = { requireAffected: false };
    expect(prAlerts(prs, { now: NOW, ...off }).alerts).toEqual([]);
    expect(prAlerts(prs, { now: NOW + 11 * MIN, ...off }).alerts[0]).toMatchObject({ kind: 'pr-label-ready', severity: 'warn' });
    const [a] = prAlerts(prs, { now: NOW, labelFix: true, ...off }).alerts;
    expect(a).toMatchObject({ kind: 'pr-label-ready', severity: 'info' });
    expect(a.fix).toMatchObject({ check: 'labels', type: 'label', pr: 7, head: SHA('a') });
    // affected-e2e required (the default) and missing: an alert, never a label fix
    const [u] = prAlerts(prs, { now: NOW, labelFix: true }).alerts;
    expect(u).toMatchObject({ kind: 'pr-affected-unavailable', fix: null });
    expect(u.detail).toMatch(/affected-e2e unavailable/);
    expect(u.advice).toMatch(/WATCHDOG_REQUIRE_AFFECTED=0/);
  });

  it('raises info alerts for an affected-e2e waiver and a labelled head without affected-e2e', () => {
    const contexts = [runNode('check', 'SUCCESS'), ctxNode('checker', 'SUCCESS')];
    const waived = prAlerts([normalizePr(prNode({ contexts, labels: ['no-affected-e2e'] }))], { now: NOW, labelFix: true }).alerts;
    expect(waived.map((a: { kind: string; severity: string }) => `${a.kind} ${a.severity}`)).toEqual(['pr-affected-waived info', 'pr-label-ready info']);
    expect(waived[1].fix.why).toMatch(/affected-e2e waived \(no-affected-e2e\)$/);
    const byHand = normalizePr(prNode({ contexts, labels: ['train-ready'] }));
    expect(prAlerts([byHand], { now: NOW }).alerts).toMatchObject([{ kind: 'pr-label-no-affected', severity: 'info', fix: null }]);
    expect(prAlerts([byHand], { now: NOW, requireAffected: false }).alerts).toEqual([]);
    expect(prAlerts([{ ...byHand, labels: ['train-ready', 'no-affected-e2e'] }], { now: NOW }).alerts.map((a: { kind: string }) => a.kind)).toEqual(['pr-affected-waived']);
  });

  it('drops the label when any required check is red on the current head, even with checker success', () => {
    const red = normalizePr(prNode({ labels: ['train-ready'], labeledAt: '2026-10-24T09:30:00Z', committedDate: '2026-10-24T09:45:00Z',
      contexts: [runNode('check', 'FAILURE'), ctxNode('checker', 'SUCCESS')] }));
    expect(redChecks(red)).toEqual(['check']);
    const r = pa([red], { now: NOW, labelHeads: { 7: SHA('c') } });
    expect(r.alerts).toHaveLength(1);
    expect(r.alerts[0].kind).toBe('pr-label-red');
    expect(r.alerts[0].fix).toMatchObject({ check: 'prs', type: 'unlabel', pr: 7, head: SHA('a'), reason: 'check red on head aaaaaaaa' });
    // an unmoved or docs-only head, and a red checker / affected-e2e status, count too
    const still = normalizePr(prNode({ labels: ['train-ready'], contexts: [runNode('check', 'SUCCESS'), ctxNode('checker', 'FAILURE'), ctxNode('affected-e2e', 'ERROR')] }));
    expect(redChecks(still)).toEqual(['checker', 'affected-e2e']);
    expect(pa([{ ...still, docsOnlyFrom: new Set([SHA('c')]) }], { now: NOW, labelHeads: { 7: SHA('c') } }).alerts[0].kind).toBe('pr-label-red');
    expect(redChecks(normalizePr(prNode({ contexts: [runNode('check', 'SUCCESS'), ctxNode('checker', 'PENDING')] })))).toEqual([]);
  });

  it('flags a labelled CONFLICTING PR with its owner', () => {
    const prs = [normalizePr(prNode({ labels: ['train-ready'], labeledAt: '2026-10-24T09:30:00Z', mergeable: 'CONFLICTING' }))];
    const [a] = pa(prs, { now: NOW, owner: () => 'Night Shift | Marlow Build' }).alerts;
    expect(a).toMatchObject({ kind: 'pr-conflict', severity: 'high', subject: '#7 feature/x' });
    expect(a.detail).toMatch(/Marlow Build/);
  });

  it('flags commits after the label (by commit time or a moved head) unless the checker passed the new head', () => {
    const after = normalizePr(prNode({ labels: ['train-ready'], labeledAt: '2026-10-24T09:30:00Z', committedDate: '2026-10-24T09:45:00Z' }));
    const r = pa([after], { now: NOW });
    expect(r.alerts[0]).toMatchObject({ kind: 'pr-commit-after-label' });
    expect(r.alerts[0].fix).toMatchObject({ check: 'prs', type: 'unlabel', pr: 7 });
    expect(r.labelHeads).toEqual({ 7: SHA('a') });
    const before = normalizePr(prNode({ labels: ['train-ready'], labeledAt: '2026-10-24T09:30:00Z', head: SHA('b') }));
    expect(pa([before], { now: NOW }).alerts).toEqual([]);
    // the head moved since the label was first seen
    const moved = pa([before], { now: NOW, labelHeads: { 7: SHA('c') } });
    expect(moved.alerts[0].kind).toBe('pr-commit-after-label');
    expect(moved.labelHeads).toEqual({ 7: SHA('c') });
    // re-checked: checker success on the new head
    const rechecked = normalizePr(prNode({ labels: ['train-ready'], labeledAt: '2026-10-24T09:30:00Z', committedDate: '2026-10-24T09:45:00Z', contexts: [runNode('check', 'SUCCESS'), ctxNode('checker', 'SUCCESS')] }));
    expect(pa([rechecked], { now: NOW, labelHeads: { 7: SHA('c') } })).toEqual({ alerts: [], labelHeads: { 7: SHA('a') } });
    // trains are never touched
    expect(pa([normalizePr(prNode({ branch: 'train/65', labels: ['train-ready'], mergeable: 'CONFLICTING' }))], { now: NOW }).alerts).toEqual([]);
  });

  it('finds the labelled head and keeps the label across docs-only commits', () => {
    const [c1, c2, c3]: [RecentCommit, RecentCommit, RecentCommit] = [{ oid: SHA('1'), committedDate: '2026-10-24T09:00:00Z' }, { oid: SHA('2'), committedDate: '2026-10-24T09:20:00Z' }, { oid: SHA('3'), committedDate: '2026-10-24T09:45:00Z' }];
    const recent = [c1, c2, c3];
    const p = normalizePr(prNode({ head: SHA('3'), labels: ['train-ready'], labeledAt: '2026-10-24T09:30:00Z', committedDate: '2026-10-24T09:45:00Z', recent }));
    expect(p.labelHead).toBe(SHA('2'));
    // push time beats commit time: 2 was committed before the label but its check suite (the push) came after it
    const suite = (t: string) => ({ nodes: [{ createdAt: `2026-10-24T${t}:00Z` }] });
    const pushed = [{ ...c1, checkSuites: suite('09:01') }, { ...c2, checkSuites: suite('09:40') }, c3];
    expect(normalizePr(prNode({ head: SHA('3'), labels: ['train-ready'], labeledAt: '2026-10-24T09:30:00Z', recent: pushed })).labelHead).toBe(SHA('1'));
    const r = pa([p], { now: NOW });
    expect(r.alerts[0].kind).toBe('pr-commit-after-label');
    expect(r.labelHeads).toEqual({ 7: SHA('2') });
    expect(pa([{ ...p, docsOnlyFrom: new Set([SHA('2')]) }], { now: NOW })).toEqual({ alerts: [], labelHeads: { 7: SHA('2') } });
    expect(docsOnlyFiles(['docs/a.md', 'changes/feature-x.md', 'CHANGELOG.md', 'README.md'])).toBe(true);
    expect(docsOnlyFiles(['docs/a.md', 'tests/a.test.ts'])).toBe(false);
    expect(docsOnlyFiles([])).toBe(false);
  });

  it('writes one comment per head (markers)', () => {
    expect(labelComment(SHA('a'), 'why')).toContain(`<!-- watchdog:label:${SHA('a')} -->`);
    const un = unlabelComment(SHA('a'), 'check red on head aaaaaaaa');
    expect(un).toContain(`<!-- watchdog:unlabel:${SHA('a')} -->`);
    expect(un).toMatch(/^Watchdog: check red on head aaaaaaaa, so `train-ready` was removed/);
  });

  it('names owners: override, newest queue request, cloud brief lead, else the job', () => {
    const owner = ownerMap({
      requests: [{ id: '20261024T01', branch: 'feature/a', requester: 'Old' }, { id: '20261024T02', branch: 'feature/a', requester: 'New' }, { id: '20261024T03', branch: '', pr: 317, requester: 'Guard AI' },
        { id: '20261024T04', branch: 'feature/a', pr: 317, requester: 'affected-e2e' }],
      briefs: [{ branch: 'feature/b', lead: 'Sector Ops' }],
      override: { 'feature/guard-': 'Night Shift | Guard AI Build' },
    });
    expect(owner('feature/a', 1)).toBe('New');
    expect(owner('feature/coop4', 317)).toBe('Guard AI');
    expect(owner('feature/b', 2)).toBe('Sector Ops');
    expect(owner('feature/guard-ai-s9', 3)).toBe('Night Shift | Guard AI Build');
    expect(owner('feature/zzz', 4)).toBe('job zzz');
  });
});

describe('watchdog: release tail', () => {
  it('finds the commit that set master\'s version', () => {
    const log = [{ sha: 'm3', at: 3, version: '4.96.0' }, { sha: 'm2', at: 2, version: '4.96.0' }, { sha: 'm1', at: 1, version: '4.95.3' }];
    expect(versionCommit(log)).toEqual({ version: '4.96.0', sha: 'm2', at: 2 });
    expect(versionCommit([])).toBeNull();
  });

  it('dev behind (fast-forward fix), diverged (alert only), tag missing, open members in master (alert only, never closed)', () => {
    const r = releaseAlerts({ master: SHA('m'), dev: SHA('d'), devBehind: true, version: '4.96.0', versionSha: SHA('v'), tagExists: false,
      members: [{ number: 5, branch: 'feature/x', head: SHA('x'), inMaster: true }, { number: 6, branch: 'feature/y', head: SHA('y'), inMaster: false }, { number: 7, branch: 'train/9', head: SHA('t'), inMaster: true }] });
    expect(r.map((a: { kind: string }) => a.kind)).toEqual(['release-dev-lag', 'release-tag-missing', 'release-member-open']);
    expect(r[0].fix).toMatchObject({ check: 'release', type: 'push-dev', master: SHA('m'), dev: SHA('d') });
    expect(r[0].graceMin).toBe(LIMITS.devGraceMin);
    expect(r[1].fix).toMatchObject({ type: 'push-tag', tag: 'v4.96.0', sha: SHA('v') });
    expect(r[2]).toMatchObject({ fix: null, advice: 'alert only (member PR 5 merged into master but open: close by hand)' });
    const div = releaseAlerts({ master: SHA('m'), dev: SHA('d'), devBehind: false, version: '4.96.0', tagExists: true, members: [] });
    expect(div).toHaveLength(1);
    expect(div[0]).toMatchObject({ kind: 'release-dev-diverged', severity: 'high', fix: null });
    expect(releaseAlerts({ master: SHA('m'), dev: SHA('m'), version: '4.96.0', tagExists: null, members: [] })).toEqual([]);
  });
});

describe('watchdog: Pages', () => {
  it('reads the module script and the preview label', () => {
    expect(indexScript('<script type="module" crossorigin src="/Mobile-Coop/preview/assets/index-Ct3t_Sdu.js"></script>')).toBe('/Mobile-Coop/preview/assets/index-Ct3t_Sdu.js');
    expect(previewLabel('const Noe=()=>"v4.95.3 PREVIEW \u00b7 bd54dfc";')).toEqual({ version: '4.95.3', sha: 'bd54dfc' });
    expect(previewLabel('x="v4.95.3 PREVIEW \\xB7 bd54dfc"')).toEqual({ version: '4.95.3', sha: 'bd54dfc' });
    expect(previewLabel('"v4.95.3 PREVIEW"')).toEqual({ version: '4.95.3', sha: null });
    expect(previewLabel('no label')).toBeNull();
  });

  it('alerts when /preview/ is behind 15 min after the release', () => {
    const released = { version: '4.96.0', at: NOW - 20 * MIN };
    const [a] = pagesAlerts({ released, served: { version: '4.95.3', sha: 'bd54dfc' }, now: NOW });
    expect(a).toMatchObject({ kind: 'pages-behind', severity: 'high' });
    expect(a.detail).toMatch(/serves v4\.95\.3 \(bd54dfc\), master is v4\.96\.0 since 20 min/);
    expect(pagesAlerts({ released: { ...released, at: NOW - 10 * MIN }, served: { version: '4.95.3' }, now: NOW })).toEqual([]);
    expect(pagesAlerts({ released, served: { version: '4.96.0' }, now: NOW })).toEqual([]);
    expect(pagesAlerts({ released, served: null, error: 'HTTP 404', now: NOW })[0]).toMatchObject({ kind: 'pages-unreadable', graceMin: LIMITS.pagesMin });
  });
});

describe('watchdog: auto-train health', () => {
  const ok = { state: 'pending', train: 65, reason: 'r', time: iso(NOW - 2 * MIN) };
  it('stale, failed, error (grace), attention states, behind', () => {
    expect(autoTrainAlerts({ status: ok, now: NOW })).toEqual([]);
    expect(autoTrainAlerts({ status: null, now: NOW })[0]).toMatchObject({ kind: 'autotrain-stale', severity: 'high' });
    expect(autoTrainAlerts({ status: { ...ok, time: iso(NOW - 11 * MIN) }, now: NOW })[0].kind).toBe('autotrain-stale');
    expect(autoTrainAlerts({ status: { ...ok, state: 'failed' }, now: NOW })[0]).toMatchObject({ kind: 'autotrain-failed', severity: 'high', subject: 'train 65' });
    expect(autoTrainAlerts({ status: { ...ok, state: 'error' }, now: NOW })[0]).toMatchObject({ kind: 'autotrain-error', graceMin: LIMITS.autoTrainErrorMin });
    expect(autoTrainAlerts({ status: { ...ok, state: 'rerun-stale' }, now: NOW })[0].kind).toBe('autotrain-rerun-stale');
    const [b] = autoTrainAlerts({ status: ok, now: NOW, head: SHA('a'), master: SHA('b'), dir: 'D' });
    expect(b).toMatchObject({ kind: 'autotrain-behind', subject: 'D', graceMin: LIMITS.autoTrainBehindMin });
  });
});

describe('watchdog: laptop queue', () => {
  const req = (id: string, extra = {}) => ({ id, sha: SHA('1'), branch: 'feature/x', requester: 'Night Shift | Player Build', set: 's', ...extra });
  it('drops docs / tests / e2e scripts / fragments from the stale count', () => {
    expect(nonTestFiles(['docs/a.md', 'tests/x.test.ts', 'scripts/e2e-move.mjs', 'changes/f.md', 'CHANGELOG.md', 'README.md', 'src/a.ts', ''])).toEqual(['src/a.ts']);
  });

  it('silent and stuck claims, old unclaimed requests, stale requests (pin exempt)', () => {
    const q = {
      now: NOW,
      requests: [req('20261024T090000-a'), req('20261024T103000-b'), req('20261024T104000-c'), req('20261024T080000-d', { pin: true }), req('20261024T080000-e')],
      claims: {
        '20261024T090000-a': { worker: 'laptop', at: iso(NOW - 20 * MIN), done: false },
        '20261024T103000-b': { worker: 'desktop', at: iso(NOW - 25 * MIN), done: false },
        '20261024T080000-e': { worker: 'laptop', at: iso(NOW - 100 * MIN), done: true },
        [SHA('e')]: { worker: 'laptop', at: iso(NOW - 95 * MIN), done: false },
        [SHA('f')]: { worker: 'laptop', at: iso(NOW - 95 * MIN), done: false }, // not an open train head: ignored
        'gone-request': { worker: 'laptop', at: iso(NOW - 95 * MIN), done: false },
      },
      trainHeads: new Set([SHA('e')]),
      activity: { laptop: NOW - 16 * MIN, desktop: NOW - 30 * MIN },
      desktopBeat: NOW - MIN,
      stale: { '20261024T104000-c': { ref: 'origin/feature/x', files: 3 }, '20261024T080000-d': { ref: 'origin/feature/x', files: 1 } },
    };
    const a = laptopAlerts(q);
    expect(a.map((x: { id: string }) => x.id)).toEqual([
      'lq-claim-silent:20261024T090000-a',
      `lq-claim-stuck:train ${SHA('e').slice(0, 8)}`,
      'lq-request-stale:20261024T104000-c',
      'lq-request-old:20261024T080000-d',
    ]);
    expect(a[2].detail).toMatch(/Player Build \[s\]: origin\/feature\/x moved past 11111111 in 3 non-test file\(s\)/);
    // the desktop claim stays quiet: its service log is fresh
    expect(a.some((x: { id: string }) => x.id.includes('103000-b'))).toBe(false);
    // a `beat` field in a claim counts as its heartbeat
    const beat = laptopAlerts({ ...q, claims: { '20261024T090000-a': { worker: 'laptop', at: iso(NOW - 20 * MIN), beat: iso(NOW - MIN), done: false } }, stale: {} });
    expect(beat.filter((x: { kind: string }) => x.kind.startsWith('lq-claim'))).toEqual([]);
  });
});

describe('watchdog: cloud queue', () => {
  const brief = (status: string) => `${status}\n\n# Title\n\nLead: Night Shift | Sector Ops Build (brief ~21:40).\nBase: x. New branch:\n\`feature/sector-redesign-fog2\` cut from that sha.\n`;
  it('parses the status line, claim time, branch and lead', () => {
    expect(parseLooseIso('2026-10-24T10:37Z')).toBe(Date.parse('2026-10-24T10:37:00Z'));
    expect(parseLooseIso('2026-10-23T21:15+1100')).toBe(Date.parse('2026-10-23T10:15:00Z'));
    expect(parseBrief(brief('status: claimed Night Shift | Cloud Builder 1 2026-10-24T10:37Z'))).toMatchObject({
      status: 'claimed', by: 'Night Shift | Cloud Builder 1', at: Date.parse('2026-10-24T10:37:00Z'), branch: 'feature/sector-redesign-fog2', lead: 'Night Shift | Sector Ops Build' });
    expect(parseBrief(brief('status: done feature/x abc'))).toMatchObject({ status: 'done', by: null, at: null });
    expect(parseBrief('no status').status).toBeNull();
  });

  it('alerts claims over 90 min with no push; reopens only when the push is known missing', () => {
    const text = brief('status: claimed Night Shift | Cloud Builder 1 2026-10-24T09:00Z');
    const [a] = cloudAlerts([{ path: 'briefs/x.md', blob: 'b1', text, pushed: false }], { now: NOW });
    expect(a).toMatchObject({ kind: 'cloud-claim-stale', subject: 'x.md' });
    expect(a.fix).toMatchObject({ check: 'cloud', type: 'reopen', path: 'briefs/x.md', branch: 'feature/sector-redesign-fog2', age: 120 });
    expect(cloudAlerts([{ path: 'briefs/x.md', text, pushed: true }], { now: NOW })).toEqual([]);
    expect(cloudAlerts([{ path: 'briefs/x.md', text, pushed: null }], { now: NOW })[0].fix).toBeNull();
    expect(cloudAlerts([{ path: 'briefs/x.md', text, pushed: false }], { now: Date.parse('2026-10-24T10:00:00Z') })).toEqual([]);
    const re = reopenText(text, { by: 'B', branch: 'feature/y', age: 120, now: NOW });
    expect(re.split('\n')[0]).toBe('status: open');
    expect(re).toMatch(/Watchdog 2026-10-24T11:00:00.000Z: reopened \(claimed by B 120 min before, no push of `feature\/y`\)\.\n$/);
  });
});
