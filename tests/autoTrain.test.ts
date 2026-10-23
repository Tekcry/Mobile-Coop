import { describe, expect, it } from 'vitest';
import {
  bumpVersion, ciGreenAt, ciState, contextStatus, decide, docsOnly, fragmentInfo, fragmentPath, joinTitles, laptopMissing, laptopQueueState, membersFromSubjects,
  nextTrainNumber, pacing, parseChangelogHeading, parseLeftOut, parseTrainTitle, planBuild, rebuildSkip, releaseArgs, releaseKind, scratchFiles,
  stackedTips, versionFromSubjects,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/auto-train.mjs';

const MIN = 60_000;
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

  it('reads the laptop queue tree: busy on a pending request JSON or a running marker', () => {
    expect(laptopQueueState([])).toBe('idle');
    expect(laptopQueueState(['README.md', 'done/2026-10-23-a.json'])).toBe('idle');
    expect(laptopQueueState(['pending/2026-10-23-a.json'])).toBe('busy');
    expect(laptopQueueState(['queue/pending/x.json'])).toBe('busy');
    expect(laptopQueueState(['running.json'])).toBe('busy');
    expect(laptopQueueState(['running/4191.txt'])).toBe('busy');
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
