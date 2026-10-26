import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs process script without types
import { ownQuarantine, ghRetryable, claimGated, claimSkip, claimSkipStatuses, ciCheckFailed, CI_WORKFLOW, AFFECTED_CTX, AFFECTED_REQUESTER, SPARE_REQUESTER } from '../scripts/laptop-queue/lib.mjs';

const NOW = Date.UTC(2026, 9, 26, 12, 0, 0);
const SHA = 'a'.repeat(40);
const HEAD = 'b'.repeat(40);
const pr = (o: Record<string, unknown> = {}) => ({ state: 'OPEN', headRefOid: SHA, statusCheckRollup: [{ name: 'check', status: 'COMPLETED', conclusion: 'SUCCESS' }], ...o });
const r = (o: Record<string, unknown> = {}) => ({ id: 'x', kind: 'pr', pr: 525, sha: SHA, requester: 'lead', suites: ['e2e-sectorops:6'], set: 'sectorops', ...o });

describe('F48 ownQuarantine', () => {
  const list = [
    { suite: 'e2e-sectorops:6', expiry: new Date(NOW + 3600_000).toISOString() },
    { suite: 'e2e-coop', expiry: new Date(NOW - 1).toISOString() },
  ];
  it('the laptop keeps its live automatic entries', () => {
    expect(ownQuarantine(list, NOW).map((q: { suite: string }) => q.suite)).toEqual(['e2e-sectorops:6']);
  });
  it('the desktop keeps none, so it never forgives an entry the laptop lacks (#525)', () => {
    expect(ownQuarantine(list, NOW, true)).toEqual([]);
  });
  it('a bad file is no list', () => {
    expect(ownQuarantine(null, NOW)).toEqual([]);
    expect(ownQuarantine({ suite: 'x' }, NOW)).toEqual([]);
  });
});

describe('gh retry: ghRetryable', () => {
  it('retries a TLS handshake timeout (stderr or message)', () => {
    expect(ghRetryable({ stderr: 'Post "https://api.github.com/repos/x/statuses/y": net/http: TLS handshake timeout' })).toBe(true);
    expect(ghRetryable({ message: 'Command failed: gh api ...\nerror connecting to api.github.com: TLS handshake timeout' })).toBe(true);
    expect(ghRetryable(new Error('tls: handshake timed out'))).toBe(true);
  });
  it('never retries other failures', () => {
    expect(ghRetryable({ stderr: 'HTTP 422: Validation Failed' })).toBe(false);
    expect(ghRetryable({ stderr: 'HTTP 404: Not Found' })).toBe(false);
    expect(ghRetryable(null)).toBe(false);
  });
});

describe('F46 claimSkip', () => {
  it('runs an open PR at its head with a green or pending check', () => {
    expect(claimSkip(r(), pr())).toBe('');
    expect(claimSkip(r(), pr({ statusCheckRollup: [{ name: 'check', status: 'IN_PROGRESS', conclusion: '' }] }))).toBe('');
    expect(claimSkip(r(), pr({ statusCheckRollup: [] }))).toBe('');
  });
  it('withdraws a red CI check on the head', () => {
    expect(claimSkip(r(), pr({ statusCheckRollup: [{ name: 'check', conclusion: 'FAILURE' }] }))).toBe('red');
    // another job's failure is not the check
    expect(claimSkip(r(), pr({ statusCheckRollup: [{ name: 'lint', conclusion: 'FAILURE' }, { name: 'check', conclusion: 'SUCCESS' }] }))).toBe('');
  });
  it('withdraws a sha that is no longer the PR head (stale beats red)', () => {
    expect(claimSkip(r(), pr({ headRefOid: HEAD, statusCheckRollup: [{ name: 'check', conclusion: 'FAILURE' }] }))).toBe('stale');
  });
  it('withdraws a closed or merged PR', () => {
    expect(claimSkip(r(), pr({ state: 'MERGED' }))).toBe('merged');
    expect(claimSkip(r(), pr({ state: 'CLOSED', headRefOid: HEAD }))).toBe('closed');
  });
  it('a GitHub error (no PR read) runs it', () => {
    expect(claimSkip(r(), null)).toBe('');
    expect(claimSkip(r(), 'oops')).toBe('');
  });
  it('gates only pr requests with a PR, not train reruns or spare work; laptop reruns too', () => {
    expect(claimGated(r())).toBe(true);
    expect(claimGated(r({ laptopRerun: true }))).toBe(true);
    expect(claimGated(r({ trainRerun: true }))).toBe(false);
    // a pinned A/B or baseline run on an older commit (request.mjs fills pr from the branch) is never stale
    expect(claimGated(r({ pin: true }))).toBe(false);
    expect(claimSkip(r({ pin: true }), pr({ headRefOid: HEAD }))).toBe('');
    expect(claimGated(r({ requester: SPARE_REQUESTER }))).toBe(false);
    expect(claimGated(r({ pr: null }))).toBe(false);
    expect(claimGated(r({ kind: 'alone' }))).toBe(false);
    expect(claimGated(r({ kind: 'full' }))).toBe(false);
    expect(claimSkip(r({ trainRerun: true }), pr({ state: 'MERGED' }))).toBe('');
  });
});

describe('F46 claimSkipStatuses', () => {
  it('errors the request context with why', () => {
    expect(claimSkipStatuses(r(), 'red')).toEqual([{ sha: SHA, state: 'error', context: 'laptop-e2e/sectorops', description: "not run: PR #525's CI check failed on this head (request again once it passes)" }]);
    expect(claimSkipStatuses(r(), 'stale', HEAD)[0].description).toBe("not run: aaaaaaaa is no longer PR #525's head (bbbbbbbb)");
    expect(claimSkipStatuses(r(), 'merged')[0].description).toBe('not run: PR #525 is merged');
    expect(claimSkipStatuses(r(), 'closed')[0].description).toBe('not run: PR #525 is closed');
  });
  it('an affected request also closes affected-e2e', () => {
    const s = claimSkipStatuses(r({ requester: AFFECTED_REQUESTER, set: 'affected' }), 'closed');
    expect(s.map((x: { context: string }) => x.context)).toEqual(['laptop-e2e/affected', AFFECTED_CTX]);
  });
  it('nothing without a reason', () => {
    expect(claimSkipStatuses(r(), '')).toEqual([]);
  });
});

describe('F46 ciCheckFailed: only the CI workflow check', () => {
  const ci = (conclusion: string) => ({ name: 'check', workflowName: CI_WORKFLOW, conclusion });
  const preview = (conclusion: string) => ({ name: 'check', workflowName: 'Preview check', conclusion });
  it('a failed preview check is not CI', () => {
    expect(ciCheckFailed([preview('FAILURE'), ci('SUCCESS')])).toBe(false);
    expect(ciCheckFailed([preview('FAILURE')])).toBe(false);
    expect(claimSkip(r(), pr({ statusCheckRollup: [ci('SUCCESS'), preview('FAILURE')] }))).toBe('');
  });
  it('a failed CI check is red whatever comes first', () => {
    expect(ciCheckFailed([preview('SUCCESS'), ci('FAILURE')])).toBe(true);
    expect(claimSkip(r(), pr({ statusCheckRollup: [preview('SUCCESS'), ci('FAILURE')] }))).toBe('red');
  });
  it('rows without a workflow name: a failure and no success', () => {
    expect(ciCheckFailed([{ name: 'check', conclusion: 'FAILURE' }])).toBe(true);
    expect(ciCheckFailed([{ name: 'check', conclusion: 'FAILURE' }, { name: 'check', conclusion: 'SUCCESS' }])).toBe(false);
    expect(ciCheckFailed(null)).toBe(false);
  });
});
