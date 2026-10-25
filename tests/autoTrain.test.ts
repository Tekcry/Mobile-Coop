import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  bumpVersion, ciGreenAt, ciState, contextStatus, decide, desktopFailSuites, docsOnly, fragmentInfo, fragmentPath, joinTitles, laptopMissing, laptopQueueState, membersFromSubjects,
  nextTrainNumber, pacing, parseChangelogHeading, parseLeftOut, parseTrainTitle, planBuild, rebuildSkip, releaseArgs, releaseKind, scratchFiles,
  stackedTips, versionFromSubjects, withRecentSubjects, rerunArgs, rerunContext, rerunPlan, buildMarkerPath, clearBuildMarker, withBuildMarker, writeBuildMarker, leftOutPlan, RERUN_STALE_MIN, RERUN_REQUEST_MAX,
  checkWaitReason, ciLabel, holdForChecks, selfUpdatePlan, CHECK_WAIT_MIN, fastPollPlan, FAST_POLL_S, FAST_POLL_MAX_MIN, LOCK_STALE_MIN, FAST_POLL_LATE_S, LAPTOP_EXPECT_MIN, pendingSince, laptopLate,
  failSuites, failureAsserts, autoDropCase, pickDrops, dropPlan, closeTrainBody, suiteBase, repeatedSuites, carryLastDrop, AUTODROP_MAX_SUITES, confirmPlan,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/auto-train.mjs';
// @ts-expect-error plain .mjs script without types
import { coverFolders, suiteSetFor, QUICK_COVERS } from '../scripts/e2e-affected.mjs';

const MIN = 60_000;
const NOW = Date.parse('2026-10-24T10:00:00Z');
const frag = (title: string, kind?: string) => `# ${title}\n${kind ? `kind: ${kind}\n` : ''}- entry\n`;

describe('auto-train: versions and titles', () => {
  it('bumps minor and patch', () => {
    expect(bumpVersion('4.79.0', 'minor')).toBe('4.80.0');
    expect(bumpVersion('4.79.3', 'minor')).toBe('4.80.0');
    expect(bumpVersion('4.79.3', 'patch')).toBe('4.79.4');
    expect(() => bumpVersion('4.79', 'patch')).toThrow();
  });

  it('reads a fragment title and kind (default minor)', () => {
    expect(fragmentInfo(frag('Release speed-ups', 'patch'))).toEqual({ title: 'Release speed-ups', kind: 'patch' });
    expect(fragmentInfo('# Lamps\r\n\r\nkind: Minor\r\n- x')).toEqual({ title: 'Lamps', kind: 'minor' });
    expect(fragmentInfo(frag('No kind'))).toEqual({ title: 'No kind', kind: 'minor' });
    expect(fragmentInfo('- no title')).toEqual({ title: null, kind: 'minor' });
    expect(fragmentPath('feature/guard-ai-s9')).toBe('changes/feature-guard-ai-s9.md');
  });

  it('is minor when any fragment is minor, has no kind or is missing; patch only when all say patch', () => {
    expect(releaseKind([frag('a', 'patch'), frag('b', 'patch')])).toBe('patch');
    expect(releaseKind([frag('a', 'patch'), frag('b', 'minor')])).toBe('minor');
    expect(releaseKind([frag('a', 'patch'), frag('b')])).toBe('minor');
    expect(releaseKind([frag('a', 'patch'), null])).toBe('minor');
  });

  it('joins titles with "; ", drops duplicates and cuts at whole titles near 200 chars', () => {
    expect(joinTitles(['Lamps', ' Guards ', 'Lamps', ''])).toBe('Lamps; Guards');
    const long = Array.from({ length: 12 }, (_, i) => `Title number ${i} with some words`);
    const out = joinTitles(long);
    expect(out.length).toBeLessThanOrEqual(200);
    expect(out).toMatch(/^Title number 0 with some words; .*; \+\d+ more$/);
    expect(joinTitles(['x'.repeat(300)])).toHaveLength(200);
  });

  it('plans a build: master version bumped by the fragments, PR titles as fallback, stacked bases not passed', () => {
    const p = planBuild('4.79.0', [
      { pr: 1, branch: 'feature/a', fragment: frag('Alpha', 'patch'), title: 'PR a' },
      { pr: 2, branch: 'feature/b', fragment: null, title: 'PR b' },
      { pr: 3, branch: 'feature/c', fragment: frag('Gamma', 'patch'), title: 'PR c', build: false },
      { pr: null, branch: 'feature/menu', title: null },
    ]);
    expect(p).toEqual({ version: '4.80.0', kind: 'minor', title: 'Alpha; PR b; Gamma', branches: ['feature/a', 'feature/b', 'feature/menu'] });
    expect(planBuild('4.80.0', [{ pr: 1, branch: 'feature/a', fragment: frag('Fix', 'patch') }]).version).toBe('4.80.1');
  });

  it('counts docs-only diffs', () => {
    expect(docsOnly(['docs/ROADMAP.md', 'CLAUDE.md', 'docs/x/data.json'])).toBe(true);
    expect(docsOnly(['docs/ROADMAP.md', 'src/main.ts'])).toBe(false);
    expect(docsOnly([])).toBe(false);
  });
});

describe('auto-train: stacked tips and train numbers', () => {
  // s4 <- s5 <- s7 stacked; x independent
  const anc: Record<string, string[]> = { s4: [], s5: ['s4'], s7: ['s4', 's5'], x: [] };
  const contains = (a: string, b: string) => anc[b]!.includes(a);

  it('keeps only the tip of a stacked series, in input order', () => {
    const c = [{ branch: 'b4', head: 's4' }, { branch: 'bx', head: 'x' }, { branch: 'b7', head: 's7' }, { branch: 'b5', head: 's5' }];
    expect(stackedTips(c, contains).map((t: { branch: string }) => t.branch)).toEqual(['bx', 'b7']);
  });

  it('keeps the first of two identical heads', () => {
    expect(stackedTips([{ branch: 'a', head: 'x' }, { branch: 'b', head: 'x' }], contains).map((t: { branch: string }) => t.branch)).toEqual(['a']);
  });

  it('takes the next train number from branches, titles and subjects', () => {
    expect(nextTrainNumber(['refs/heads/train/9', 'refs/heads/train/31', 'refs/heads/train/5'])).toBe(32);
    expect(nextTrainNumber(['train/30'], ['4.80.0: Train 33: x', 'orchestrator: #239 train-ready for train 31'])).toBe(34);
    expect(nextTrainNumber([], ['4.79.0: version at merge, train 30 (G183)'])).toBe(31);
    expect(nextTrainNumber([], [])).toBe(1);
  });
});

describe('auto-train: parsing', () => {
  it('finds the newest version commit of the train', () => {
    const s = ['Merge origin/feature/a into train/31', '4.80.0: version at merge, train 31 (G183)', 'fix: x', '4.81.0: version at merge, train 31 (G183)', 'fix: y'];
    expect(versionFromSubjects(s, 31)).toEqual({ version: '4.81.0', n: 31, index: 3 });
    expect(versionFromSubjects(s, 30)).toBeNull();
    expect(versionFromSubjects(['x'], 31)).toBeNull();
  });

  it('parses a train PR title and a CHANGELOG heading', () => {
    expect(parseTrainTitle('4.79.0: Train 30: Player batches 23-24; voxel look retired')).toEqual({ version: '4.79.0', n: 30, title: 'Player batches 23-24; voxel look retired' });
    expect(parseTrainTitle('Guard AI S8')).toBeNull();
    expect(parseChangelogHeading('## 4.79.0 - Train 30: Player batches (iPad fit) (2026-10-23, PR #241; #214, #223)')).toEqual({ version: '4.79.0', n: 30, title: 'Player batches (iPad fit)' });
    expect(parseChangelogHeading('## 4.55.1 - Old')).toEqual({ version: '4.55.1', n: null, title: 'Old' });
    expect(parseChangelogHeading('# Changelog')).toBeNull();
  });

  it('reads train members from merge subjects and LEFT OUT lines from build output', () => {
    expect(membersFromSubjects(['Merge origin/feature/menu into train/30', 'Merge origin/master into train/30', 'Merge origin/feature/a into train/29',
      "Merge remote-tracking branch 'origin/master' into feature/x", 'Merge origin/feature/b into train/30', 'Merge origin/feature/menu into train/30'], 30))
      .toEqual(['feature/menu', 'feature/b']);
    const out = 'merging origin/feature/a\n  LEFT OUT: src/x.ts\nmembers: feature/b\nLEFT OUT: feature/a - conflicts in src/x.ts, src/y.ts\nLEFT OUT: feature/c - no such branch on origin\n';
    expect(parseLeftOut(out)).toEqual([{ branch: 'feature/a', why: 'conflicts in src/x.ts, src/y.ts' }, { branch: 'feature/c', why: 'no such branch on origin' }]);
  });

  it('reads the CI check from a statusCheckRollup', () => {
    const run = (name: string, conclusion: string, at: string, status = 'COMPLETED') => ({ __typename: 'CheckRun', name, status, conclusion, completedAt: at, startedAt: at });
    expect(ciState([run('lint', 'SUCCESS', '2026-10-23T07:43:00Z')], 'check')).toBe('missing');
    expect(ciState([run('check', 'SUCCESS', '2026-10-23T07:47:00Z'), run('build', 'SKIPPED', '2026-10-23T07:42:00Z')])).toBe('success');
    expect(ciState([run('check', 'FAILURE', '2026-10-23T07:47:00Z')])).toBe('failure');
    expect(ciState([run('check', 'FAILURE', '2026-10-23T07:40:00Z'), run('check', 'SUCCESS', '2026-10-23T07:50:00Z')])).toBe('success');
    expect(ciState([run('check', 'SUCCESS', '2026-10-23T07:40:00Z'), run('check', '', '', 'IN_PROGRESS')])).toBe('pending');
    expect(ciState([run('check', 'CANCELLED', '2026-10-23T07:40:00Z')])).toBe('pending');
    expect(ciState([run('check', 'SKIPPED', '2026-10-23T07:40:00Z'), run('check', 'SUCCESS', '2026-10-23T07:39:00Z')])).toBe('success');
    expect(ciState([{ __typename: 'StatusContext', context: 'check', state: 'ERROR', createdAt: '2026-10-23T07:40:00Z' }])).toBe('failure');
    expect(ciState(undefined)).toBe('missing');
  });

  it('ciLabel: "running" while a CI run has no conclusion yet, "missing" only with no run or check at all', () => {
    const run = (name: string, conclusion: string, status = 'COMPLETED', at = '2026-10-25T00:20:00Z') => ({ __typename: 'CheckRun', name, status, conclusion, completedAt: at, startedAt: at });
    const ctx = (context: string, state: string) => ({ __typename: 'StatusContext', context, state, createdAt: '2026-10-25T00:20:00Z' });
    // the waste-audit case: lint / test / build-check running, the aggregate `check` not created yet
    expect(ciLabel([run('lint', '', 'IN_PROGRESS'), run('test', '', 'QUEUED'), run('build-check', '', 'PENDING')])).toBe('running');
    expect(ciLabel([run('lint', 'SUCCESS'), run('test', '', 'IN_PROGRESS')])).toBe('running');
    expect(ciLabel([run('lint', 'SUCCESS'), run('check', '', 'QUEUED')])).toBe('running');
    expect(ciLabel([run('check', 'SUCCESS'), run('check', '', '', 'IN_PROGRESS')])).toBe('running');
    expect(ciLabel([run('lint', 'SUCCESS'), run('test', 'SUCCESS'), run('build-check', 'SUCCESS')])).toBe('running');
    expect(ciLabel([ctx('ci/external', 'PENDING')])).toBe('running');
    // no CI at all
    expect(ciLabel([])).toBe('missing');
    expect(ciLabel(undefined)).toBe('missing');
    // our own statuses are not CI: a pending laptop-e2e alone is still "missing"
    expect(ciLabel([ctx('laptop-e2e', 'PENDING'), ctx('auto-train/vitest', 'PENDING'), ctx('laptop-e2e/train72-rerun', 'PENDING')])).toBe('missing');
    // finished states pass through
    expect(ciLabel([run('check', 'SUCCESS')])).toBe('success');
    expect(ciLabel([run('check', 'FAILURE'), run('lint', '', 'IN_PROGRESS')])).toBe('failure');
    expect(ciLabel([run('check', 'CANCELLED')])).toBe('pending');
    // decide() treats "running" like any non-final CI word
    const train = { n: 9, head: 'abcdef1234567', version: '1.2.3', versionCommit: true, ci: 'running', laptop: { state: 'pending', description: '' }, vitest: 'success', ageMin: 5, ciGreenAt: null };
    expect(decide({ train })).toMatchObject({ state: 'pending', action: 'none', reason: 'train 9: CI running, laptop pending' });
  });

  it('reads the newest laptop-e2e commit status', () => {
    const combined = { state: 'pending', statuses: [
      { context: 'laptop-e2e', state: 'failure', description: '38/39', updated_at: '2026-10-23T08:00:00Z' },
      { context: 'laptop-e2e', state: 'success', description: '39/39', updated_at: '2026-10-23T09:00:00Z' },
      { context: 'other', state: 'error', updated_at: '2026-10-23T10:00:00Z' }] };
    expect(contextStatus(combined, 'laptop-e2e')).toEqual({ state: 'success', description: '39/39' });
    expect(contextStatus({ statuses: [{ context: 'laptop-e2e', state: 'error', description: 'crashed' }] }, 'laptop-e2e')).toEqual({ state: 'failure', description: 'crashed' });
    expect(contextStatus({ statuses: [] }, 'laptop-e2e')).toEqual({ state: 'missing', description: '' });
    expect(contextStatus(null, 'laptop-e2e').state).toBe('missing');
  });
});

describe('auto-train: laptop missing', () => {
  const now = Date.parse('2026-10-24T10:00:00Z');
  const missing = { state: 'missing', description: '' };

  it('reads the CI green time from the check run completedAt or the status updated_at', () => {
    const run = (conclusion: string, at: string, status = 'COMPLETED') => ({ __typename: 'CheckRun', name: 'check', status, conclusion, completedAt: at });
    expect(ciGreenAt([run('SUCCESS', '2026-10-24T09:40:00Z'), run('FAILURE', '2026-10-24T09:50:00Z')], null)).toBe(Date.parse('2026-10-24T09:40:00Z'));
    expect(ciGreenAt([run('SUCCESS', '2026-10-24T09:40:00Z'), run('SUCCESS', '2026-10-24T09:45:00Z')], null)).toBe(Date.parse('2026-10-24T09:45:00Z'));
    expect(ciGreenAt([{ ...run('SUCCESS', '2026-10-24T09:40:00Z'), name: 'lint' }], null)).toBeNull();
    expect(ciGreenAt([run('', '', 'IN_PROGRESS')], null)).toBeNull();
    const combined = { statuses: [{ context: 'check', state: 'success', updated_at: '2026-10-24T09:30:00Z' }, { context: 'laptop-e2e', state: 'success', updated_at: '2026-10-24T09:55:00Z' }] };
    expect(ciGreenAt([{ __typename: 'StatusContext', context: 'check', state: 'SUCCESS' }], combined)).toBe(Date.parse('2026-10-24T09:30:00Z'));
    expect(ciGreenAt(undefined, undefined)).toBeNull();
  });

  it('counts minutes after CI green with no laptop-e2e status, from the threshold on', () => {
    expect(laptopMissing({ ci: 'success', laptop: missing, ciGreenAt: now - 9 * MIN, now })).toBeNull();
    expect(laptopMissing({ ci: 'success', laptop: missing, ciGreenAt: now - 10 * MIN, now })).toBe(10);
    expect(laptopMissing({ ci: 'success', laptop: missing, ciGreenAt: now - 47.9 * MIN, now })).toBe(47);
    expect(laptopMissing({ ci: 'success', laptop: missing, ciGreenAt: now - 3 * MIN, now, thresholdMin: 2 })).toBe(3);
    expect(laptopMissing({ ci: 'pending', laptop: missing, ciGreenAt: now - 30 * MIN, now })).toBeNull();
    expect(laptopMissing({ ci: 'success', laptop: { state: 'pending', description: 'queued' }, ciGreenAt: now - 30 * MIN, now })).toBeNull();
    expect(laptopMissing({ ci: 'success', laptop: missing, ciGreenAt: null, now })).toBeNull();
  });
});

describe('auto-train: pacing', () => {
  const now = Date.parse('2026-10-23T20:00:00');

  it('builds once the last release is 60 min old, or earlier when the laptop queue is idle', () => {
    expect(pacing({ now, releases: [] })).toBeNull();
    expect(pacing({ now, releases: [now - 61 * MIN, now - 200 * MIN] })).toBeNull();
    expect(pacing({ now, releases: [now - 20 * MIN] })).toMatch(/last release 20 min ago .*laptop queue unknown/);
    expect(pacing({ now, releases: [now - 20 * MIN], queue: 'busy' })).toMatch(/laptop queue busy/);
    expect(pacing({ now, releases: [now - 20 * MIN], queue: 'idle' })).toBeNull();
    expect(pacing({ now, releases: [now - 20 * MIN], minIntervalMin: 0 })).toBeNull();
  });

  it('caps releases per local day when --max-per-day is set', () => {
    const today = [now - 70 * MIN, now - 300 * MIN];
    expect(pacing({ now, releases: today, maxPerDay: 2 })).toMatch(/max 2 releases per day/);
    expect(pacing({ now, releases: today, maxPerDay: 3 })).toBeNull();
    expect(pacing({ now, releases: [now - 30 * 60 * MIN], maxPerDay: 1 })).toBeNull();
  });

  it('reads the laptop queue branch: busy on an unclaimed request or an open claim (requests/, claims/, alerts/)', () => {
    const T = Date.UTC(2026, 9, 25, 2, 0, 0);
    const id = '20261025T013649-affected-e2e-d5ccca5a-f205';
    const done = { worker: 'laptop', at: '2026-10-25T01:40:00.000Z', done: true };
    expect(laptopQueueState([], { now: T })).toBe('idle');
    expect(laptopQueueState(['alerts/20261024T220717Z-desktop-tasks.json', 'README.md'], { now: T })).toBe('idle');
    // queued: the request has no claim yet (auto-train.log: 483 idle ticks, 0 waits before this read requests/)
    expect(laptopQueueState([`requests/${id}.json`], { now: T })).toBe('busy');
    // finished (run, superseded, duplicate, withdrawn: all done claims)
    expect(laptopQueueState([`requests/${id}.json`, `claims/${id}.json`], { claims: { [id]: done }, now: T })).toBe('idle');
    // running: an open claim of a request or a train head
    expect(laptopQueueState([`requests/${id}.json`, `claims/${id}.json`], { claims: { [id]: { ...done, done: false } }, now: T })).toBe('busy');
    expect(laptopQueueState([`claims/${'a'.repeat(40)}.json`], { claims: { ['a'.repeat(40)]: { ...done, done: false } }, now: T })).toBe('busy');
    // stale: a dead worker's open claim (over 3 h) or a never-claimed bad request (over 12 h) stop counting
    expect(laptopQueueState([`claims/${id}.json`], { claims: { [id]: { ...done, done: false, at: '2026-10-24T22:00:00.000Z' } }, now: T })).toBe('idle');
    expect(laptopQueueState(['requests/20261024T120000-bad-a-12345678-0000.json'], { now: T })).toBe('idle');
    expect(laptopQueueState(['requests/20261024T215933-night-shift-sector-o-62d80c02-f7c4.json'], { now: T })).toBe('busy');
    // a busy queue holds the build until the interval; idle builds at once
    expect(pacing({ now: T, releases: [T - 10 * MIN], queue: laptopQueueState([`requests/${id}.json`], { now: T }) })).toMatch(/laptop queue busy/);
  });
});

describe('auto-train: decision', () => {
  const train = (o: Record<string, unknown> = {}) => ({ n: 31, head: 'abcdef1234', version: '4.80.0', ci: 'success',
    laptop: { state: 'success', description: '39/39' }, vitest: 'missing', ageMin: 30, versionCommit: true, ...o });
  const pr = (branch: string) => ({ pr: 1, branch, head: 'x' });

  it('releases when CI and the laptop are both green', () => {
    expect(decide({ train: train() })).toMatchObject({ state: 'releasing', action: 'release' });
  });

  it('waits while either is pending, and flags a stale train after 3 h without a laptop status', () => {
    expect(decide({ train: train({ ci: 'pending' }) })).toMatchObject({ state: 'pending', action: 'none' });
    expect(decide({ train: train({ laptop: { state: 'pending', description: '12/39' } }) }).reason).toMatch(/laptop pending \(12\/39\)/);
    expect(decide({ train: train({ laptop: { state: 'missing', description: '' }, ageMin: 100 }) }).state).toBe('pending');
    expect(decide({ train: train({ laptop: { state: 'missing', description: '' }, ageMin: 181 }) }).state).toBe('stale');
    expect(decide({ train: train({ laptop: { state: 'pending', description: '' }, ageMin: 400 }) }).state).toBe('pending');
  });

  it('fails without acting on a CI, laptop or build-time vitest failure', () => {
    expect(decide({ train: train({ ci: 'failure' }) })).toMatchObject({ state: 'failed', action: 'none' });
    expect(decide({ train: train({ laptop: { state: 'failure', description: '38/39' } }) }).reason).toMatch(/laptop-e2e failed on abcdef12 \(38\/39\)/);
    expect(decide({ train: train({ vitest: 'failure' }) })).toMatchObject({ state: 'failed', action: 'none' });
    expect(decide({ train: train({ version: null }) }).state).toBe('error');
  });

  it('never releases a train without a version commit (build died before it): error, rebuild', () => {
    expect(decide({ train: train({ versionCommit: false }) })).toEqual({ state: 'error', action: 'none', reason: 'train 31 has no version commit: rebuild' });
    expect(decide({ train: train({ versionCommit: undefined }) })).toMatchObject({ state: 'error', action: 'none' });
  });

  it('flags a laptop missing 10 min after CI went green (train, head, minutes)', () => {
    const now = Date.parse('2026-10-24T10:00:00Z');
    const missing = { state: 'missing', description: '' };
    expect(decide({ train: train({ laptop: missing, ciGreenAt: now - 9 * MIN }), now }).state).toBe('pending');
    expect(decide({ train: train({ laptop: missing, ciGreenAt: now - 12.5 * MIN }), now })).toEqual({ state: 'laptop-missing', action: 'none', waitingMin: 12,
      reason: 'train 31: no laptop-e2e status 12 min after CI went green on abcdef12' });
    expect(decide({ train: train({ laptop: missing, ciGreenAt: now - 6 * MIN }), now, laptopMissingMin: 5 }).state).toBe('laptop-missing');
    expect(decide({ train: train({ laptop: missing, ciGreenAt: now - 60 * MIN, ci: 'pending' }), now }).state).toBe('pending');
    expect(decide({ train: train({ laptop: { state: 'pending', description: 'queued' }, ciGreenAt: now - 60 * MIN }), now }).state).toBe('pending');
    expect(decide({ train: train({ laptop: missing, ciGreenAt: now - 60 * MIN, ageMin: 181 }), now }).state).toBe('stale');
  });

  it('with no train: idle, waiting on pacing, or build', () => {
    expect(decide({ train: null, candidates: [] }).state).toBe('idle');
    expect(decide({ train: null, candidates: [{ pr: null, branch: 'feature/menu' }] }).state).toBe('idle');
    expect(decide({ train: null, candidates: [pr('feature/a')], paceReason: 'last release 5 min ago' })).toMatchObject({ state: 'waiting', action: 'none' });
    expect(decide({ train: null, candidates: [pr('feature/a'), { pr: null, branch: 'feature/menu' }] })).toMatchObject({ state: 'building', action: 'build' });
  });
});

describe('auto-train: release pin, rebuild loop guard, dry-run files', () => {
  const head = '0123456789abcdef0123456789abcdef01234567';

  it('release is pinned to the tested head and never takes the old-style fallback', () => {
    expect(releaseArgs({ n: 31, version: '4.80.0', title: 'Lamps', head, resume: false }))
      .toEqual(['release', '31', '4.80.0', 'Lamps', '--head', head, '--no-fallback']);
    expect(releaseArgs({ n: 31, version: '4.80.0', title: 'Lamps', head, resume: true }).slice(-1)).toEqual(['--resume']);
  });

  it('rebuildSkip: skips only while the train head and master are both unchanged', () => {
    const prev = { state: 'failed', reason: `rebuild failed for ${head}: x`, rebuildFailed: { head, master: 'm1' } };
    expect(rebuildSkip(prev, head, 'm1')).toBe(true);
    expect(rebuildSkip(prev, head, 'm2')).toBe(false);
    expect(rebuildSkip(prev, 'other', 'm1')).toBe(false);
    expect(rebuildSkip(prev, head, null)).toBe(false);
    expect(rebuildSkip({ state: 'pending' }, head, 'm1')).toBe(false);
    expect(rebuildSkip(null, head, 'm1')).toBe(false);
  });

  it('a dry run gets its own lock, log and status files', () => {
    const real = scratchFiles('S', false), dry = scratchFiles('S', true);
    expect(real.lock).toMatch(/auto-train\.lock$/);
    expect(real.status).toMatch(/auto-train-status\.json$/);
    expect(real.log).toMatch(/auto-train\.log$/);
    expect(dry.lock).toMatch(/auto-train\.dryrun\.lock$/);
    expect(dry.status).toMatch(/auto-train-status\.dryrun\.json$/);
    expect(dry.log).toMatch(/auto-train\.dryrun\.log$/);
    expect(dry.realStatus).toBe(real.status);
    expect(new Set([real.lock, real.log, real.status, dry.lock, dry.log, dry.status]).size).toBe(6);
  });
});

describe('auto-train: laptop rerun after a desktop failure', () => {
  const head = 'abcdef1234567890';
  const desk = 'desktop: 37/39 pass, 512 s; known flaky: e2e-pad; FAIL: e2e-coop,ctcourse:4';
  const train = (o: Record<string, unknown> = {}) => ({ n: 47, pr: 301, head, version: '4.90.0', ci: 'success', vitest: 'missing', versionCommit: true,
    laptop: { state: 'failure', description: desk }, rerun: { state: 'missing', description: '' }, ageMin: 30, ...o });

  it('parses the failed suites of a desktop description only', () => {
    expect(desktopFailSuites(desk)).toEqual(['e2e-coop', 'ctcourse:4']);
    expect(desktopFailSuites('desktop: 38/39 pass, 300 s; flake: x; FAIL: e2e-menus')).toEqual(['e2e-menus']);
    expect(desktopFailSuites('desktop: 39/39 pass, 300 s')).toEqual([]);
    expect(desktopFailSuites('desktop: no result parsed, see log')).toEqual([]);
    expect(desktopFailSuites('desktop: 30/39 pass, 300 s; FAIL: e2e-a,e2e-b,e2e-c...')).toEqual([]);
    expect(desktopFailSuites('desktop: 1/2 pass, 3 s; FAIL: bad name')).toEqual([]);
    expect(desktopFailSuites('37/39 pass, 512 s; FAIL: e2e-coop')).toBeNull();
    expect(desktopFailSuites(undefined)).toBeNull();
  });

  it('requests one rerun of the failed suites for a new head', () => {
    expect(rerunPlan(train(), null)).toMatchObject({ action: 'request', state: 'laptop-rerun', suites: ['e2e-coop', 'ctcourse:4'], set: 'train47-rerun' });
    expect(rerunPlan(train(), { rerun: { head: 'otherhead', id: 'r0', suites: ['x'] } })).toMatchObject({ action: 'request' });
    expect(rerunContext(47)).toBe('laptop-e2e/train47-rerun');
    expect(rerunArgs({ sha: head, suites: ['e2e-coop', 'ctcourse:4'], pr: 301, set: 'train47-rerun' })).toEqual(['--sha', head, '--suites', 'e2e-coop ctcourse:4',
      '--pr', '301', '--set', 'train47-rerun', '--requester', 'auto-train', '--train-rerun']);
  });

  it('never requests twice for the same head: waits, then fails on the rerun failure', () => {
    const prev = { state: 'laptop-rerun', rerun: { head, id: 'r1', suites: ['e2e-coop'], set: 'train47-rerun' } };
    expect(rerunPlan(train(), prev)).toMatchObject({ action: 'wait', state: 'laptop-rerun', reason: expect.stringMatching(/rerun r1 of e2e-coop on abcdef12 queued/) });
    expect(rerunPlan(train({ rerun: { state: 'pending', description: '1/1' } }), prev)).toMatchObject({ action: 'wait' });
    expect(rerunPlan(train({ rerun: { state: 'failure', description: '0/1 pass' } }), prev)).toMatchObject({ action: 'none', state: 'failed',
      reason: expect.stringMatching(/laptop rerun r1 of e2e-coop failed on abcdef12 \(0\/1 pass\)/) });
  });

  it('keeps "failed" for a laptop failure, unparsed suites, or a CI / vitest failure; a rerun pass releases', () => {
    expect(rerunPlan(train({ laptop: { state: 'failure', description: '37/39 pass, 512 s; FAIL: e2e-coop' } }), null)).toBeNull();
    expect(rerunPlan(train({ laptop: { state: 'failure', description: 'desktop: no result parsed, see log' } }), null)).toBeNull();
    expect(rerunPlan(train({ ci: 'failure' }), null)).toBeNull();
    expect(rerunPlan(train({ vitest: 'failure' }), null)).toBeNull();
    expect(rerunPlan(train({ laptop: { state: 'pending', description: 'desktop: sharded 4191+4192' } }), null)).toBeNull();
    const passed = train({ laptop: { state: 'success', description: 'laptop rerun passed: 2/2' } });
    expect(rerunPlan(passed, { rerun: { head, id: 'r1', suites: ['e2e-coop'] } })).toBeNull();
    expect(decide({ train: passed })).toMatchObject({ state: 'releasing', action: 'release' });
  });

  it('a rerun-context pass with CI green releases through decide() (master request.mjs posts only that context)', () => {
    const rerunOk = train({ rerun: { state: 'success', description: '2/2 pass, 140 s' } });
    const prev = { rerun: { head, id: 'r1', suites: ['e2e-coop', 'ctcourse:4'], set: 'train47-rerun', at: new Date(NOW - 30 * MIN).toISOString() } };
    expect(rerunPlan(rerunOk, prev, { now: NOW })).toBeNull();
    expect(rerunPlan(rerunOk, null, { now: NOW })).toBeNull(); // no record (status lost): still no second request
    const d = decide({ train: rerunOk });
    expect(d).toMatchObject({ state: 'releasing', action: 'release', rerunRelease: ['e2e-coop', 'ctcourse:4'] });
    expect(d.reason).toMatch(/laptop rerun of e2e-coop,ctcourse:4 passed \(laptop-e2e\/train47-rerun success on abcdef12/);
  });

  it('a rerun pass waits for CI, and never releases a CI / vitest failure or a non-desktop laptop failure', () => {
    const prev = { rerun: { head, id: 'r1', suites: ['e2e-coop'], set: 'train47-rerun', at: new Date(NOW - 90 * MIN).toISOString() } };
    const ok = { rerun: { state: 'success', description: '1/1' } };
    expect(rerunPlan(train({ ...ok, ci: 'pending' }), prev, { now: NOW })).toMatchObject({ action: 'wait', state: 'laptop-rerun',
      reason: expect.stringMatching(/rerun r1 of e2e-coop passed on abcdef12; waiting for CI check \(pending\)/) });
    expect(decide({ train: train({ ...ok, ci: 'pending' }) }).action).toBe('none');
    expect(decide({ train: train({ ...ok, ci: 'failure' }) })).toMatchObject({ state: 'failed', action: 'none' });
    expect(decide({ train: train({ ...ok, vitest: 'failure' }) })).toMatchObject({ state: 'failed', action: 'none' });
    expect(decide({ train: train({ ...ok, laptop: { state: 'failure', description: '37/39 pass, 512 s; FAIL: e2e-coop' } }) })).toMatchObject({ state: 'failed' });
    expect(decide({ train: train({ ...ok, laptop: { state: 'failure', description: 'desktop: no result parsed, see log' } }) })).toMatchObject({ state: 'failed' });
    expect(decide({ train: train() })).toMatchObject({ state: 'failed', action: 'none' }); // no rerun verdict yet
  });

  it('a recorded rerun with no verdict for AUTO_TRAIN_RERUN_STALE_MIN turns rerun-stale, naming the request', () => {
    expect(RERUN_STALE_MIN).toBe(60);
    const prev = (min: number) => ({ rerun: { head, id: 'r1', suites: ['e2e-coop'], set: 'train47-rerun', at: new Date(NOW - min * MIN).toISOString() } });
    expect(rerunPlan(train(), prev(59), { now: NOW })).toMatchObject({ action: 'wait', state: 'laptop-rerun' });
    expect(rerunPlan(train(), prev(61), { now: NOW })).toMatchObject({ action: 'none', state: 'rerun-stale',
      reason: expect.stringMatching(/laptop rerun r1 of e2e-coop on abcdef12: no laptop-e2e\/train47-rerun verdict 61 min after the request \(no status\)/) });
    expect(rerunPlan(train({ rerun: { state: 'pending', description: 'running' } }), prev(61), { now: NOW })).toMatchObject({ state: 'rerun-stale', reason: expect.stringMatching(/\(pending\)/) });
    expect(rerunPlan(train(), prev(15), { now: NOW, staleMin: 10 })).toMatchObject({ state: 'rerun-stale' });
    expect(rerunPlan(train({ rerun: { state: 'failure', description: '0/1' } }), prev(61), { now: NOW })).toMatchObject({ state: 'failed' });
    expect(rerunPlan(train(), { rerun: { head, id: 'r0', suites: ['e2e-coop'] } }, { now: NOW })).toMatchObject({ action: 'wait' }); // no time recorded
  });

  it('retries a failed request up to RERUN_REQUEST_MAX times per head, then rerun-request-failed', () => {
    expect(RERUN_REQUEST_MAX).toBe(6);
    const failed = (count: number | undefined, h = head) => ({ rerunRequestFailed: { head: h, exit: 1, why: 'push rejected', ...(count == null ? {} : { count }) } });
    expect(rerunPlan(train(), failed(undefined), { now: NOW })).toMatchObject({ action: 'request', requestFailed: { head }, reason: expect.stringMatching(/try 2\/6/) });
    expect(rerunPlan(train(), failed(5), { now: NOW })).toMatchObject({ action: 'request', reason: expect.stringMatching(/try 6\/6/) });
    expect(rerunPlan(train(), failed(6), { now: NOW })).toMatchObject({ action: 'none', state: 'rerun-request-failed',
      requestFailed: { count: 6 }, reason: expect.stringMatching(/failed 6 times \(last: exit 1: push rejected\); not retried/) });
    const other = rerunPlan(train(), failed(6, 'otherhead'), { now: NOW });
    expect(other).toMatchObject({ action: 'request' });
    expect(other.requestFailed).toBeUndefined();
  });
});

describe('auto-train: build marker', () => {
  const memFs = () => {
    const files = new Map<string, string>();
    return { files, mkdirSync: () => undefined, writeFileSync: (f: string, t: string) => { files.set(f, t); }, rmSync: (f: string) => { files.delete(f); } };
  };

  it('sits in the scratch dir beside the other files, a dry run with its own suffix', () => {
    expect(buildMarkerPath('S', false)).toMatch(/^S[\\/]auto-train-building\.json$/);
    expect(buildMarkerPath('S', true)).toMatch(/^S[\\/]auto-train-building\.dryrun\.json$/);
    expect(scratchFiles('S', false).building).toBe(buildMarkerPath('S', false));
    expect(scratchFiles('S', true).building).toBe(buildMarkerPath('S', true));
  });

  it('writes { train, version, pid, at } and deletes it; never throws', () => {
    const m = memFs();
    expect(writeBuildMarker('S/b.json', { train: 47, version: '4.90.0', pid: 123, at: '2026-10-24T10:00:00.000Z' }, m)).toBe(true);
    expect(JSON.parse(m.files.get('S/b.json')!)).toEqual({ train: 47, version: '4.90.0', pid: 123, at: '2026-10-24T10:00:00.000Z' });
    expect(clearBuildMarker('S/b.json', m)).toBe(true);
    expect(m.files.size).toBe(0);
    const broken = { mkdirSync: () => { throw new Error('EACCES'); }, writeFileSync: () => undefined, rmSync: () => { throw new Error('EBUSY'); } };
    expect(writeBuildMarker('S/b.json', { train: 1, version: '1.0.0' }, broken)).toBe(false);
    expect(clearBuildMarker('S/b.json', broken)).toBe(false);
  });

  it('is present while the build runs and gone after, also on an error', async () => {
    const m = memFs();
    let seen: string | undefined;
    await expect(withBuildMarker('S/b.json', { train: 47, version: '4.90.0' }, async () => { seen = m.files.get('S/b.json'); return 7; }, m)).resolves.toBe(7);
    expect(JSON.parse(seen!)).toMatchObject({ train: 47, version: '4.90.0', pid: process.pid });
    expect(m.files.size).toBe(0);
    await expect(withBuildMarker('S/b.json', { train: 47, version: '4.90.0' }, async () => { throw new Error('boom'); }, m)).rejects.toThrow('boom');
    expect(m.files.size).toBe(0);
  });
});

describe('auto-train: left out on a conflict', () => {
  const head = '0123456789abcdef';
  const base = { pr: 288, branch: 'feature/a', head, n: 47, why: 'conflicts in src/x.ts' };

  it('removes train-ready and comments once per head that the lead re-adds the label', () => {
    const p = leftOutPlan({ ...base, labels: ['train-ready', 'other'], bodies: [] });
    expect(p.remove).toEqual(['gh', 'pr', 'edit', '288', '--remove-label', 'train-ready']);
    expect(p.comment).toMatch(/^Auto-train: `feature\/a` \(01234567\) was left out of train 47: conflicts in src\/x\.ts\./);
    expect(p.comment).toMatch(/label has been removed/);
    expect(p.comment).toMatch(/re-add `train-ready` once the conflict is fixed/);
    expect(p.comment).not.toMatch(/keeps the/);
    expect(p.comment).toMatch(/<!-- auto-train:left-out:0123456789abcdef -->$/);
  });

  it('asks for a doc fix, not a conflict fix, when merge-train left the member out on doc-lint', () => {
    const p = leftOutPlan({ ...base, why: 'doc-lint with master and the members before it: docs/a.md:1 721 lines, budget 720', labels: ['train-ready'] });
    expect(p.comment).toMatch(/was left out of train 47: doc-lint with master/);
    expect(p.comment).toMatch(/fix the doc on this branch so it passes doc-lint together with master/);
    expect(p.comment).not.toMatch(/conflict/);
  });

  it('skips the removal without the label and the comment when this head has one', () => {
    const first = leftOutPlan({ ...base, labels: ['train-ready'] });
    const again = leftOutPlan({ ...base, labels: [], bodies: ['hi', first.comment!] });
    expect(again).toEqual({ remove: null, comment: null });
    expect(leftOutPlan({ ...base, head: 'fedcba9876543210', labels: [], bodies: [first.comment!] }).comment).toMatch(/fedcba98/);
    expect(leftOutPlan({ ...base, labels: ['train-ready'], bodies: [first.comment!] })).toMatchObject({ remove: expect.any(Array), comment: null });
  });
});

describe('auto-train: hold the build for a running check (audit 2 item 1)', () => {
  const run = (name: string, conclusion: string, status = 'COMPLETED', at = '2026-10-24T09:59:00Z') => ({ __typename: 'CheckRun', name, status, conclusion, completedAt: at, startedAt: at });
  const ctx = (context: string, state: string) => ({ __typename: 'StatusContext', context, state, createdAt: '2026-10-24T09:59:00Z' });

  it('checkWaitReason: running while check or any other job is queued / in progress, or check is about to appear', () => {
    expect(checkWaitReason([run('lint', 'SUCCESS'), run('test', '', 'IN_PROGRESS'), run('build-check', '', 'QUEUED')])).toMatch(/check missing, CI running \(test, build-check\)/);
    expect(checkWaitReason([run('lint', 'SUCCESS'), run('test', 'SUCCESS'), run('build-check', 'SUCCESS'), run('check', '', 'QUEUED')])).toBe('check running');
    // PR #299: every sibling green, the aggregate check not created yet (43 s)
    expect(checkWaitReason([run('lint', 'SUCCESS'), run('test', 'SUCCESS'), run('build-check', 'SUCCESS'), run('build', 'SKIPPED')])).toMatch(/check not created yet/);
    expect(checkWaitReason([run('lint', 'SUCCESS'), ctx('laptop-e2e/a', 'PENDING')])).toMatch(/CI running \(laptop-e2e\/a\)/);
  });

  it('checkWaitReason: null when check finished, CI failed or there is no CI activity', () => {
    expect(checkWaitReason([run('check', 'SUCCESS')])).toBeNull();
    expect(checkWaitReason([run('check', 'FAILURE')])).toBeNull();
    expect(checkWaitReason([run('lint', 'FAILURE'), run('test', '', 'IN_PROGRESS')])).toBeNull();
    expect(checkWaitReason([run('lint', 'SUCCESS'), ctx('laptop-e2e', 'FAILURE'), run('check', '', 'QUEUED')])).toBeNull();
    expect(checkWaitReason([])).toBeNull();
    expect(checkWaitReason(undefined)).toBeNull();
    expect(checkWaitReason([run('build', 'SKIPPED'), run('check', 'CANCELLED')])).toBeNull();
    // the siblings present (here only lint) all green: check about to appear
    expect(checkWaitReason([run('lint', 'SUCCESS')])).toMatch(/not created yet/);
  });

  it('holdForChecks: holds up to waitMin per head from when it was first seen, then builds without it', () => {
    const w = [{ pr: 299, branch: 'feature/a', head: 'aaa', why: 'check running' }, { pr: 300, branch: 'feature/b', head: 'bbb', why: null }];
    const first = holdForChecks(w, NOW, {}, CHECK_WAIT_MIN);
    expect(first.hold).toBe(true);
    expect(first.firstSeen).toEqual({ aaa: new Date(NOW).toISOString() });
    expect(first.reason).toMatch(/holding the build up to 3 min for #299 \(check running, 0 s\)/);
    const later = holdForChecks(w, NOW + 2 * MIN, first.firstSeen, 3);
    expect(later).toMatchObject({ hold: true, firstSeen: first.firstSeen });
    const done = holdForChecks(w, NOW + 3 * MIN, first.firstSeen, 3);
    expect(done.hold).toBe(false);
    expect(done.reason).toMatch(/not waiting longer for #299/);
    expect(done.firstSeen).toEqual(first.firstSeen);
    // a new head starts its own wait; heads no longer waiting drop out
    const moved = holdForChecks([{ ...w[0], head: 'ccc' }], NOW + 3 * MIN, first.firstSeen, 3);
    expect(moved.hold).toBe(true);
    expect(moved.firstSeen).toEqual({ ccc: new Date(NOW + 3 * MIN).toISOString() });
    expect(holdForChecks([], NOW, first.firstSeen, 3)).toEqual({ hold: false, reason: '', waiting: [], firstSeen: {} });
    expect(holdForChecks(w, NOW, {}, 0).hold).toBe(false);
  });
});

describe('auto-train: fast poll of a waiting tick (audit 2 item 3)', () => {
  const S = 1000;

  it('polls every 60 s in a waiting state while the next poll starts within 4 min of the tick', () => {
    expect(FAST_POLL_S).toBe(60);
    expect(FAST_POLL_MAX_MIN).toBe(4);
    for (const st of ['pending', 'laptop-rerun', 'holding']) expect(fastPollPlan(st, NOW, NOW + 5 * S)).toMatchObject({ poll: true, delayMs: 60 * S });
    expect(fastPollPlan('pending', NOW, NOW + 3 * MIN, { prevState: 'pending' }).poll).toBe(true); // next at 4:00
    expect(fastPollPlan('pending', NOW, NOW + 3 * MIN + S, { prevState: 'pending' })).toMatchObject({ poll: false, reason: expect.stringMatching(/window over/) });
    expect(fastPollPlan('pending', NOW, NOW, { pollS: 30, maxMin: 1 }).delayMs).toBe(30 * S);
  });

  it('never polls under --once or --dry-run, when off, outside a waiting state, or after a state change', () => {
    expect(fastPollPlan('pending', NOW, NOW, { once: true })).toMatchObject({ poll: false, reason: '--once' });
    expect(fastPollPlan('pending', NOW, NOW, { dry: true })).toMatchObject({ poll: false, reason: 'dry run' });
    expect(fastPollPlan('pending', NOW, NOW, { pollS: 0 }).poll).toBe(false);
    expect(fastPollPlan('pending', NOW, NOW, { maxMin: 0 }).poll).toBe(false);
    for (const st of ['idle', 'waiting', 'built', 'building', 'releasing', 'failed', 'error', 'stale', 'laptop-missing', 'rerun-stale']) {
      expect(fastPollPlan(st, NOW, NOW).poll).toBe(false);
    }
    expect(fastPollPlan('laptop-rerun', NOW, NOW + MIN, { prevState: 'pending' })).toMatchObject({ poll: false, reason: 'state changed (pending -> laptop-rerun)' });
  });

  it('polls every 30 s once the laptop verdict is past its expected wall (laptop-queue-3)', () => {
    expect(FAST_POLL_LATE_S).toBe(30);
    expect(fastPollPlan('pending', NOW, NOW, { late: true })).toMatchObject({ poll: true, delayMs: 30 * S, reason: expect.stringMatching(/laptop verdict due/) });
    expect(fastPollPlan('pending', NOW, NOW, { late: false }).delayMs).toBe(60 * S);
    expect(fastPollPlan('pending', NOW, NOW, { late: true, lateS: 0 }).delayMs).toBe(60 * S); // off
    expect(fastPollPlan('pending', NOW, NOW, { late: true, pollS: 20 }).delayMs).toBe(20 * S); // never slower
    // the window still ends at 4 min (next poll at 3:30 + 30 s = 4:00 ok, 3:31 not)
    expect(fastPollPlan('pending', NOW, NOW + 3.5 * MIN, { late: true, prevState: 'pending' }).poll).toBe(true);
    expect(fastPollPlan('pending', NOW, NOW + 3.5 * MIN + S, { late: true, prevState: 'pending' }).poll).toBe(false);
    expect(fastPollPlan('pending', NOW, NOW, { late: true, once: true }).poll).toBe(false);
  });

  it('laptopLate: the pending laptop-e2e status is older than "expect ~N s", else 10 min', () => {
    expect(LAPTOP_EXPECT_MIN).toBe(10);
    const at = (min: number) => new Date(NOW - min * MIN).toISOString();
    const combined = { statuses: [
      { context: 'laptop-e2e', state: 'pending', description: 'sharded 4189+4192', updated_at: at(12) },
      { context: 'laptop-e2e', state: 'pending', description: 'sharded 4189+4192, expect ~400 s', updated_at: at(7) },
    ] };
    expect(pendingSince(combined, 'laptop-e2e')).toBe(NOW - 7 * MIN);
    expect(pendingSince({ statuses: [{ context: 'laptop-e2e', state: 'success', updated_at: at(1) }] }, 'laptop-e2e')).toBeNull();
    expect(pendingSince({ statuses: [] }, 'laptop-e2e')).toBeNull();
    expect(laptopLate({ since: NOW - 7 * MIN, description: 'sharded 4189+4192, expect ~400 s', now: NOW })).toBe(true);
    expect(laptopLate({ since: NOW - 6 * MIN, description: 'sharded 4189+4192, expect ~400 s', now: NOW })).toBe(false);
    expect(laptopLate({ since: NOW - 9 * MIN, description: 'sharded 4189+4192', now: NOW })).toBe(false);
    expect(laptopLate({ since: NOW - 11 * MIN, description: 'sharded 4189+4192', now: NOW })).toBe(true);
    expect(laptopLate({ since: null, description: '', now: NOW })).toBe(false);
  });

  it('a polling tick stays far inside the tick lock staleness (touched every minute anyway)', () => {
    expect(FAST_POLL_MAX_MIN).toBeLessThan(5);
    expect(FAST_POLL_MAX_MIN * 3).toBeLessThan(LOCK_STALE_MIN);
  });
});

describe('auto-train: idle self-update', () => {
  const A = 'a'.repeat(40), B = 'b'.repeat(40);
  it('updates to origin/master when HEAD differs and the tree is clean', () => {
    expect(selfUpdatePlan({ head: A, master: B, dirty: false })).toEqual({ action: 'update', reason: 'self-updated to bbbbbbbb' });
  });
  it('does nothing when HEAD is already origin/master', () => {
    expect(selfUpdatePlan({ head: A, master: A, dirty: false }).action).toBe('none');
    expect(selfUpdatePlan({ head: A, master: A, dirty: true }).action).toBe('none');
  });
  it('skips (and says why) when the working tree is dirty', () => {
    const p = selfUpdatePlan({ head: A, master: B, dirty: true });
    expect(p.action).toBe('skip');
    expect(p.reason).toContain('not clean');
  });
  it('skips when a sha could not be read', () => {
    expect(selfUpdatePlan({ head: '', master: B, dirty: false }).action).toBe('skip');
    expect(selfUpdatePlan({ head: A, master: '', dirty: false }).action).toBe('skip');
  });
  it('fast-forward only: skips when origin/master is not ahead of HEAD', () => {
    const p = selfUpdatePlan({ head: A, master: B, dirty: false, ff: false });
    expect(p.action).toBe('skip');
    expect(p.reason).toContain('not a fast-forward');
    expect(selfUpdatePlan({ head: A, master: B, dirty: false, ff: true, when: 'after releasing train 86' }))
      .toEqual({ action: 'update', reason: 'self-updated to bbbbbbbb (after releasing train 86)' });
  });
  it('also runs right after a release, before the next build (back-to-back trains never had an idle tick)', () => {
    const src = fs.readFileSync(path.resolve('scripts/auto-train.mjs'), 'utf8');
    const rel = src.indexOf('log(`RELEASED train');
    const upd = src.indexOf('selfUpdate(`after releasing train', rel);
    const next = src.indexOf('await noTrain(o, labelExists)', rel);
    expect(rel).toBeGreaterThan(0);
    expect(upd).toBeGreaterThan(rel);
    expect(upd).toBeLessThan(next);
  });
  it('only an idle decision triggers it: building and open-train decisions are never idle', () => {
    const cands = [{ branch: 'f/a', pr: 1, head: 'h', fragment: null }];
    expect(decide({ train: null, candidates: [], paceReason: null }).state).toBe('idle');
    expect(decide({ train: null, candidates: cands, paceReason: null }).state).toBe('building');
  });
});

describe('auto-train: auto-drop on a failed train (Michael 2026-10-24 "Auto-drop on failure")', () => {
  const head = 'abcdef1234567890';
  type M = { pr: number | null; branch: string; files: string[]; labeledAt?: number | null };
  const m = (pr: number | null, branch: string, files: string[], labeledAt: number | null = null): M => ({ pr, branch, files, labeledAt });
  const branches = (r: { drops: { branch: string }[] }) => r.drops.map((d) => d.branch);

  it('parses the FAIL list of a laptop or desktop description', () => {
    expect(failSuites('37/39 pass, 512 s; known flaky: e2e-pad; FAIL: e2e-lightbake,e2e-ctcourse:4')).toEqual(['e2e-lightbake', 'e2e-ctcourse:4']);
    expect(failSuites('desktop: 38/39 pass, 300 s; FAIL: e2e-menus')).toEqual(['e2e-menus']);
    expect(failSuites('39/39 pass, 300 s')).toEqual([]);
    expect(failSuites('30/39 pass, 300 s; FAIL: e2e-a,e2e-b...')).toEqual([]);
    expect(failSuites('no result parsed, see log')).toEqual([]);
    expect(failSuites(undefined)).toEqual([]);
    expect(desktopFailSuites('37/39 pass, 512 s; FAIL: e2e-coop')).toBeNull();
    expect(suiteBase('e2e-ctcourse:4')).toBe('e2e-ctcourse');
  });

  it('reads the failing asserts of the newest failure comment on the head', () => {
    const c = (sha: string, a: string) => `laptop-e2e failed on ${sha} (train/64).\n\n**e2e-lightbake**\nFailing assert: \`${a}\`\nLog on the laptop: x\n\`\`\`\ntail\n\`\`\`\n\n**e2e-ctcourse:4**\nFailing assert: \`none found\`\n`;
    expect(failureAsserts(['hi', c('abcdef12', 'old'), c('abcdef12', 'not ok 3 - bake lamp count 12 != 14')], head))
      .toEqual({ 'e2e-lightbake': 'not ok 3 - bake lamp count 12 != 14', 'e2e-ctcourse:4': '' });
    expect(failureAsserts([c('99999999', 'x')], head)).toEqual({});
    expect(failureAsserts([c('abcdef12', 'x').replace(/\n/g, '\r\n')], head)).toMatchObject({ 'e2e-lightbake': 'x' });
    expect(failureAsserts(undefined, head)).toEqual({});
  });

  it('confirms a guessed drop (tier 2-3) with one rerun on the same head; tier 1 and a failed rerun drop at once', () => {
    const train = (o: Record<string, unknown> = {}) => ({ n: 64, pr: 341, head, version: '4.96.0', ci: 'success', vitest: 'missing', versionCommit: true,
      laptop: { state: 'failure', description: '38/39 pass, 600 s; FAIL: e2e-ctcourse:4' }, rerun: { state: 'missing', description: '' }, ageMin: 30, ...o });
    const t = train();
    expect(autoDropCase(t, decide({ train: t }), null)).toMatchObject({ confirm: true });
    const guess = [{ pr: 288, branch: 'feature/a', suite: 'e2e-ctcourse', tier: 3 }];
    expect(confirmPlan(t, null, [{ ...guess[0], tier: 1 }], ['e2e-ctcourse:4'])).toBeNull();
    expect(confirmPlan(t, null, guess, ['e2e-ctcourse:4'])).toMatchObject({ action: 'request', state: 'laptop-rerun', suites: ['e2e-ctcourse:4'], set: 'train64-rerun',
      reason: expect.stringMatching(/no member maps to e2e-ctcourse:4: one confirm rerun/) });
    expect(confirmPlan(t, null, [{ ...guess[0], tier: 2 }], ['e2e-ctcourse:4'])).toMatchObject({ action: 'request' });
    const rec = { rerun: { head, id: 'r9', suites: ['e2e-ctcourse:4'], set: 'train64-rerun', at: new Date(NOW - 10 * MIN).toISOString() } };
    expect(confirmPlan(t, rec, guess, ['e2e-ctcourse:4'], { now: NOW })).toMatchObject({ action: 'wait', state: 'laptop-rerun', reason: expect.stringMatching(/r9 .* queued/) });
    expect(confirmPlan(t, { rerun: { ...rec.rerun, head: 'other' } }, guess, ['e2e-ctcourse:4'], { now: NOW })).toMatchObject({ action: 'request' });
    expect(confirmPlan(t, rec, guess, ['e2e-ctcourse:4'], { now: NOW + 120 * MIN })).toMatchObject({ action: 'none', state: 'rerun-stale' });
    expect(confirmPlan(train({ rerun: { state: 'failure', description: '0/1 pass, 80 s; FAIL: e2e-ctcourse:4' } }), rec, guess, ['e2e-ctcourse:4'], { now: NOW })).toBeNull();
    const failed = (count: number) => ({ rerunRequestFailed: { head, exit: 1, why: 'push', count } });
    expect(confirmPlan(t, failed(2), guess, ['e2e-ctcourse:4'])).toMatchObject({ action: 'request', reason: expect.stringMatching(/try 3\/6/) });
    expect(confirmPlan(t, failed(RERUN_REQUEST_MAX), guess, ['e2e-ctcourse:4'])).toMatchObject({ action: 'none', state: 'rerun-request-failed' });
    // the request carries the confirm flag and note; a passed confirm rerun releases even without the laptop-e2e post
    expect(confirmPlan(t, null, guess, ['e2e-ctcourse:4'])).toMatchObject({ confirm: true });
    expect(rerunArgs({ sha: head, suites: ['e2e-ctcourse:4'], pr: 341, set: 'train64-rerun', confirm: true }).slice(-2)).toEqual(['--note', 'confirm rerun']);
    const passed = train({ rerun: { state: 'success', description: '1/1 pass' }, confirm: ['e2e-ctcourse:4'] });
    expect(decide({ train: passed })).toMatchObject({ state: 'releasing', action: 'release', rerunRelease: ['e2e-ctcourse:4'], reason: expect.stringMatching(/confirm rerun of a laptop/) });
    expect(decide({ train: { ...passed, confirm: undefined } })).toMatchObject({ state: 'failed' }); // no confirm record: a laptop failure stands
    expect(decide({ train: { ...passed, ci: 'pending' } })).toMatchObject({ state: 'failed' });
    expect(confirmPlan({ ...passed, ci: 'pending' }, rec, guess, ['e2e-ctcourse:4'], { now: NOW })).toMatchObject({ action: 'wait', reason: expect.stringMatching(/releases once CI is green/) });
    // a failed desktop rerun is already the second failure: no confirm flag
    const desk = train({ laptop: { state: 'failure', description: 'desktop: 38/39 pass, 600 s; FAIL: e2e-coop' }, rerun: { state: 'failure', description: '0/1 pass, 80 s; FAIL: e2e-coop' } });
    expect(autoDropCase(desk, decide({ train: desk }), rerunPlan(desk, rec, { now: NOW }))?.confirm).toBeUndefined();
  });

  it('drops on a laptop failure or a failed laptop rerun only; CI, vitest, a pending rerun and stale stay as before', () => {
    const train = (o: Record<string, unknown> = {}) => ({ n: 64, pr: 341, head, version: '4.96.0', ci: 'success', vitest: 'missing', versionCommit: true,
      laptop: { state: 'failure', description: '38/39 pass, 600 s; FAIL: e2e-lightbake' }, rerun: { state: 'missing', description: '' }, ageMin: 30, ...o });
    const t = train();
    expect(autoDropCase(t, decide({ train: t }), null)).toMatchObject({ failing: ['e2e-lightbake'], reason: expect.stringMatching(/laptop-e2e failed/) });
    const ci = train({ ci: 'failure' });
    expect(autoDropCase(ci, decide({ train: ci }), null)).toBeNull();
    const vt = train({ vitest: 'failure' });
    expect(autoDropCase(vt, decide({ train: vt }), null)).toBeNull();
    const pend = train({ laptop: { state: 'pending', description: '12/39' } });
    expect(autoDropCase(pend, decide({ train: pend }), null)).toBeNull();
    // a desktop failure first gets its laptop rerun (not a failure yet)
    const desk = train({ laptop: { state: 'failure', description: 'desktop: 38/39 pass, 600 s; FAIL: e2e-coop' } });
    expect(autoDropCase(desk, decide({ train: desk }), rerunPlan(desk, null))).toBeNull();
    const rec = { rerun: { head, id: 'r1', suites: ['e2e-coop'], set: 'train64-rerun', at: new Date(NOW - 10 * MIN).toISOString() } };
    expect(autoDropCase(desk, decide({ train: desk }), rerunPlan(desk, rec, { now: NOW }))).toBeNull(); // waiting on it
    expect(autoDropCase(desk, decide({ train: desk }), rerunPlan(desk, rec, { now: NOW + 120 * MIN }))).toBeNull(); // rerun-stale
    const failed = train({ laptop: desk.laptop, rerun: { state: 'failure', description: '0/1 pass, 80 s; FAIL: e2e-coop' } });
    expect(autoDropCase(failed, decide({ train: failed }), rerunPlan(failed, rec, { now: NOW }))).toMatchObject({ failing: ['e2e-coop'] });
    const noDesc = train({ laptop: desk.laptop, rerun: { state: 'failure', description: 'crashed' } });
    // a rerun with no FAIL list (service error, no result, build failed) is no member's failure: no fallback to the desktop's list
    expect(autoDropCase(noDesc, decide({ train: noDesc }), rerunPlan(noDesc, rec, { now: NOW }))).toBeNull();
    // a desktop failure whose FAIL list is cut (no laptop rerun possible) stays "failed" for the orchestrator
    const cut = train({ laptop: { state: 'failure', description: 'desktop: 30/39 pass, 600 s; FAIL: e2e-a,e2e-b...' } });
    expect(autoDropCase(cut, decide({ train: cut }), rerunPlan(cut, null))).toBeNull();
    const deskErr = train({ laptop: { state: 'failure', description: 'desktop: no result parsed, see log' } });
    expect(autoDropCase(deskErr, decide({ train: deskErr }), rerunPlan(deskErr, null))).toBeNull();
    // a laptop failure whose list is cut: dropped with the suites of the failure comment (failing [])
    const lapCut = train({ laptop: { state: 'failure', description: '30/39 pass, 600 s; FAIL: e2e-a,e2e-b...' } });
    expect(autoDropCase(lapCut, decide({ train: lapCut }), rerunPlan(lapCut, null))).toMatchObject({ failing: [] });
    expect(autoDropCase(null, null, null)).toBeNull();
  });

  it('reuses the folder maps of scripts/e2e-affected.mjs: DIRECT_COVERS for tier 1, QUICK_COVERS folders for tier 2', () => {
    expect([...suiteSetFor(['src/voxel/lampBake.ts'])]).toEqual(expect.arrayContaining(['e2e-lightbake', 'e2e-desktop']));
    expect(suiteSetFor(['docs/x.md', 'tests/a.test.ts', 'changes/feature-a.md']).size).toBe(0);
    expect([...suiteSetFor(['scripts/e2e-lightbake.mjs'])]).toEqual(['e2e-lightbake']);
    expect(suiteSetFor(['src\\voxel\\lampBake.ts']).has('e2e-lightbake')).toBe(true);
    expect(suiteSetFor(['src/ai/enemy.ts']).has('e2e-sectorops')).toBe(true); // parts as their suite
    // DIRECT is narrower than --quick: src/ai reaches e2e-levels only in the quick map
    expect(suiteSetFor(['src/ai/enemy.ts']).has('e2e-levels')).toBe(false);
    expect(suiteSetFor(['src/ai/enemy.ts'], QUICK_COVERS).has('e2e-levels')).toBe(true);
    expect(suiteSetFor(['src/core/settings.ts'], QUICK_COVERS).has('e2e-offline')).toBe(false); // first match wins
    expect(coverFolders('e2e-offline')).toEqual(expect.arrayContaining(['src/core/', 'src/save/', 'src/pwa/']));
    expect(coverFolders('e2e-levels')).toContain('src/ai/');
    expect(coverFolders('e2e-move')).toContain('src/'); // a CORE suite covers unlisted src/ paths
  });

  it('tier 1: drops every member whose change maps to a failing suite (parts allowed), never the docs member', () => {
    const ms = [m(1, 'feature/bake', ['src/voxel/lampBake.ts', 'docs/x.md']), m(2, 'feature/hud', ['src/ui/hud/x.ts']),
      m(3, 'feature/marlow', ['src/world/maps/ctcourse.ts']), m(null, 'feature/menu', ['docs/ROADMAP.md'])];
    expect(pickDrops(ms, ['e2e-lightbake'])).toMatchObject({ drops: [{ pr: 1, branch: 'feature/bake', suite: 'e2e-lightbake', tier: 1 }] });
    expect(pickDrops(ms, ['e2e-ctcourse:4']).drops).toEqual([{ pr: 3, branch: 'feature/marlow', suite: 'e2e-ctcourse', tier: 1 }]);
    expect(branches(pickDrops(ms, ['e2e-lightbake', 'e2e-pad']))).toEqual(['feature/bake', 'feature/hud']);
    // feature/menu never leaves, even as a labelled PR whose diff maps to the suite
    expect(branches(pickDrops([m(5, 'feature/menu', ['src/voxel/a.ts']), m(1, 'feature/bake', ['src/voxel/b.ts'])], ['e2e-lightbake']))).toEqual(['feature/bake']);
    expect(pickDrops([m(null, 'feature/menu', ['docs/a.md'])], ['e2e-lightbake'])).toMatchObject({ drops: [], reason: expect.stringMatching(/docs member/) });
    expect(pickDrops(ms, [])).toMatchObject({ drops: [], reason: 'no failing suite named' });
  });

  it('does not drop when every code member of a 2+ member train matches, or when more than 3 suites failed', () => {
    const both = [m(1, 'feature/a', ['src/voxel/a.ts']), m(2, 'feature/b', ['src/voxel/b.ts']), m(null, 'feature/menu', ['docs/a.md']),
      m(4, 'feature/docs', ['docs/c.md'])];
    expect(pickDrops(both, ['e2e-lightbake'])).toMatchObject({ drops: [], reason: expect.stringMatching(/every code member \(#1, #2\) touches e2e-lightbake/) });
    // one code member: still dropped
    expect(branches(pickDrops([both[0], both[2], both[3]], ['e2e-lightbake']))).toEqual(['feature/a']);
    expect(AUTODROP_MAX_SUITES).toBe(3);
    const ms = [m(1, 'feature/a', ['src/voxel/a.ts']), m(2, 'feature/b', ['src/ui/b.ts'])];
    expect(branches(pickDrops(ms, ['e2e-lightbake', 'e2e-ctcourse:1', 'e2e-ctcourse:2', 'e2e-levels']))).toEqual(['feature/a']); // 3 suites
    expect(pickDrops(ms, ['e2e-lightbake', 'e2e-levels', 'e2e-coop', 'e2e-move'])).toMatchObject({ drops: [], reason: expect.stringMatching(/4 suites failed/) });
  });

  it('a suite the last auto-dropped train also failed is not dropped again; the record rides until a release', () => {
    const last = { train: 64, failing: ['e2e-lightbake', 'e2e-ctcourse'], at: '2026-10-24T10:00:00Z' };
    expect(repeatedSuites(last, ['e2e-ctcourse:3', 'e2e-coop'], 65)).toEqual(['e2e-ctcourse']);
    expect(repeatedSuites(last, ['e2e-coop'], 65)).toEqual([]);
    expect(repeatedSuites(last, ['e2e-lightbake'], 64)).toEqual([]); // a retried drop of the same train
    expect(repeatedSuites(undefined, ['e2e-lightbake'], 65)).toEqual([]);
    expect(carryLastDrop({ lastDrop: last }, { state: 'pending' })).toEqual({ state: 'pending', lastDrop: last });
    expect(carryLastDrop({ lastDrop: last }, { state: 'idle', released: '4.97.0 (train 65)' })).toEqual({ state: 'idle', released: '4.97.0 (train 65)' });
    const newer = { train: 65, failing: ['e2e-coop'] };
    expect(carryLastDrop({ lastDrop: last }, { state: 'built', lastDrop: newer }).lastDrop).toBe(newer);
    expect(carryLastDrop(null, { state: 'pending' })).toEqual({ state: 'pending' });
  });

  it('tier 2: no match -> the member with the most src/ files under the failing suite folders', () => {
    const ms = [m(1, 'feature/a', ['src/core/settings.ts', 'src/core/display.ts']), m(2, 'feature/b', ['src/core/settings.ts', 'src/ui/x.ts']),
      m(3, 'feature/c', ['tests/x.test.ts'])];
    expect(pickDrops(ms, ['e2e-offline'])).toMatchObject({ drops: [{ pr: 1, branch: 'feature/a', suite: 'e2e-offline', tier: 2 }],
      reason: expect.stringMatching(/#1 has the most src\/ files under its folders \(2\)/) });
  });

  it('tier 3: no folder match or a tie -> the newest-labelled code member; docs-only members never; one member drops itself', () => {
    const ms = [m(1, 'feature/a', ['src/ai/x.ts'], NOW - 60 * MIN), m(2, 'feature/b', ['src/audio/y.ts'], NOW - 5 * MIN),
      m(4, 'feature/docs', ['docs/a.md'], NOW), m(null, 'feature/menu', ['docs/b.md'])];
    expect(pickDrops(ms, ['smoke'])).toMatchObject({ drops: [{ pr: 2, branch: 'feature/b', suite: 'smoke', tier: 3 }] });
    // no label times: the higher PR number
    expect(branches(pickDrops([m(7, 'feature/a', ['src/ai/x.ts']), m(9, 'feature/b', ['src/audio/y.ts'])], ['smoke']))).toEqual(['feature/b']);
    // a tie at the top: the newest-labelled among the tied only
    const tie = [m(1, 'feature/a', ['src/core/settings.ts'], NOW - 60 * MIN), m(2, 'feature/b', ['src/core/display.ts'], NOW - 30 * MIN),
      m(3, 'feature/c', ['src/ui/z.ts'], NOW)];
    expect(pickDrops(tie, ['e2e-offline'])).toMatchObject({ drops: [{ pr: 2, tier: 3 }], reason: expect.stringMatching(/a tie at 1/) });
    // a one-member train drops that member
    expect(pickDrops([m(8, 'feature/only', ['tests/a.test.ts']), m(null, 'feature/menu', ['docs/a.md'])], ['e2e-ctcourse:2']))
      .toMatchObject({ drops: [{ pr: 8, branch: 'feature/only', suite: 'e2e-ctcourse', tier: 3 }], reason: expect.stringMatching(/the only code member/) });
    expect(pickDrops([m(4, 'feature/docs', ['docs/a.md'])], ['smoke'])).toMatchObject({ drops: [], reason: 'every member is docs-only' });
  });

  it('comments once per train and head with the suite and assert, removes train-ready; the close comment lists the drops', () => {
    const base = { pr: 288, branch: 'feature/bake', head, n: 64, suite: 'e2e-lightbake', tier: 1, assert: 'not ok 3 - `lamps` 12 != 14' };
    const p = dropPlan({ ...base, labels: ['train-ready'], bodies: [] });
    expect(p.remove).toEqual(['gh', 'pr', 'edit', '288', '--remove-label', 'train-ready']);
    expect(p.comment).toMatch(/^Auto-train: `feature\/bake` \(abcdef12\) was dropped from train 64: `e2e-lightbake` failed there; its change touches `e2e-lightbake`/);
    expect(p.comment).toContain("Failing assert: `not ok 3 - 'lamps' 12 != 14`");
    expect(p.comment).toMatch(/re-add `train-ready` once `check` is green/);
    expect(p.comment).toMatch(/<!-- auto-train:dropped:train64:abcdef1234567890 -->$/);
    expect(dropPlan({ ...base, labels: [], bodies: [p.comment!] })).toEqual({ remove: null, comment: null });
    expect(dropPlan({ ...base, n: 65, labels: [], bodies: [p.comment!] }).comment).toMatch(/train 65/);
    expect(dropPlan({ ...base, tier: 3, assert: '' }).comment).toMatch(/newest `train-ready` member[\s\S]*Failing assert: `none found`/);
    // the left-out comment keeps its own marker: a drop comment never stops it
    expect(leftOutPlan({ pr: 288, branch: 'feature/bake', head, n: 64, why: 'conflict', bodies: [p.comment!] }).comment).toMatch(/left out of train 64/);
    expect(closeTrainBody({ n: 64, head, failing: ['e2e-lightbake'], drops: [{ pr: 288, branch: 'feature/bake', suite: 'e2e-lightbake' }] }))
      .toMatch(/^Auto-train: train 64 failed e2e-lightbake on abcdef12; closed without merging\.\n\nDropped .*#288 `feature\/bake` \(e2e-lightbake\)/);
  });
});

describe('auto-train: a version commit past gh\'s 100-commit cap (train 112, 2026-10-26)', () => {
  const vc = '4.106.0: version at merge, train 112 (G183)';
  it('reads the head\'s newest subjects only when the version commit is missing', () => {
    const capped = ['Merge origin/feature/a into train/112', 'train 112: doc fix'];
    let called = 0;
    const got = withRecentSubjects(capped, 112, () => { called++; return `${vc}\ntrain 112: doc fix`; });
    expect(called).toBe(1);
    expect(versionFromSubjects(got, 112)).toEqual({ version: '4.106.0', n: 112, index: 2 });
    expect(versionFromSubjects(got, 112)!.index).toBeLessThan(got.length - 1); // a fix after it: --resume
    const whole = [...capped.slice(0, 1), vc];
    expect(withRecentSubjects(whole, 112, () => { throw new Error('not called'); })).toBe(whole);
    expect(withRecentSubjects(capped, 112, () => null)).toBe(capped);
  });
});
