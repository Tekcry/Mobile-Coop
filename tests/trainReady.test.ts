import { describe, expect, it } from 'vitest';
import {
  LABEL, CHECKER_CONTEXT, AFFECTED_CONTEXT, NO_AFFECTED_LABEL, isTrain, statusesFromRollup, trainReady, heldOff,
  // @ts-expect-error plain .mjs script without types
} from '../scripts/train-ready.mjs';
import {
  labelReady, normalizePr, LABEL as WD_LABEL, CHECKER_CONTEXT as WD_CHECKER, AFFECTED_CONTEXT as WD_AFFECTED, NO_AFFECTED_LABEL as WD_NO_AFFECTED,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/watchdog.mjs';
import {
  LABEL as AT_LABEL,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/auto-train.mjs';

type St = { state: string; description?: string };
const st = (state: string, description = '') => ({ state, description });
const pr = (o: Record<string, unknown> = {}) => ({ branch: 'feature/x', draft: false, mergeable: 'MERGEABLE', labels: [] as string[], check: 'success',
  statuses: { checker: st('success', 'Opus PASS'), 'affected-e2e': st('success') } as Record<string, St>, ...o });
const ctx = (context: string, state: string, at: string, key = 'createdAt') => ({ __typename: 'StatusContext', context, state, [key]: at });

describe('train-ready: one rule for watchdog and auto-train (F16)', () => {
  it('ready on check + checker + affected-e2e success', () => {
    expect(trainReady(pr())).toEqual({ ready: true, why: 'check green, checker success (Opus PASS), affected-e2e success' });
  });

  it('no-affected-e2e waives a missing affected-e2e; without the label it is not ready (affectedMissing)', () => {
    const noAff = { checker: st('success') };
    expect(trainReady(pr({ statuses: noAff, labels: [NO_AFFECTED_LABEL] }))).toEqual({ ready: true, why: 'check green, checker success, affected-e2e waived (no-affected-e2e)' });
    expect(trainReady(pr({ statuses: noAff }))).toEqual({ ready: false, why: 'affected-e2e unavailable', affectedMissing: true });
    expect(trainReady(pr({ statuses: noAff }), { requireAffected: false }).ready).toBe(true);
    expect(trainReady(pr({ statuses: { checker: st('success'), 'affected-e2e': st('failure') }, labels: [NO_AFFECTED_LABEL] })).why).toBe('affected-e2e failure');
  });

  it('a checker failure or pending, a red or running check, a draft, a conflict or a train PR is not ready', () => {
    expect(trainReady(pr({ statuses: { checker: st('failure'), 'affected-e2e': st('success') } })).why).toBe('checker failure');
    expect(trainReady(pr({ statuses: { checker: st('pending'), 'affected-e2e': st('success') } })).why).toBe('checker pending');
    expect(trainReady(pr({ statuses: { 'affected-e2e': st('success') } })).why).toBe('checker missing');
    expect(trainReady(pr({ check: 'pending' })).why).toBe('check pending');
    expect(trainReady(pr({ check: 'failure' })).why).toBe('check failure');
    expect(trainReady(pr({ draft: true })).why).toBe('draft');
    expect(trainReady(pr({ mergeable: 'CONFLICTING' })).why).toBe('conflicting');
    expect(trainReady(pr({ mergeable: 'UNKNOWN' })).ready).toBe(true);
    expect(trainReady(pr({ branch: 'train/7' })).why).toBe('train PR');
    expect(isTrain('train/7')).toBe(true);
    expect(isTrain('feature/train/7x')).toBe(false);
  });

  it('watchdog and auto-train apply this rule and its names (no second copy)', () => {
    expect(labelReady).toBe(trainReady);
    expect([WD_LABEL, WD_CHECKER, WD_AFFECTED, WD_NO_AFFECTED]).toEqual([LABEL, CHECKER_CONTEXT, AFFECTED_CONTEXT, NO_AFFECTED_LABEL]);
    expect(AT_LABEL).toBe(LABEL);
    expect(LABEL).toBe('train-ready');
  });

  it('statusesFromRollup: the newer status per context wins, ERROR -> failure, EXPECTED -> pending, CheckRuns ignored', () => {
    const s = statusesFromRollup([
      ctx('checker', 'FAILURE', '2026-10-24T10:00:00Z'), ctx('checker', 'SUCCESS', '2026-10-24T10:10:00Z'),
      ctx('affected-e2e', 'SUCCESS', '2026-10-24T10:05:00Z'), ctx('affected-e2e', 'ERROR', '2026-10-24T10:01:00Z'),
      ctx('laptop-e2e', 'ERROR', '2026-10-24T10:00:00Z'), ctx('x', 'EXPECTED', '2026-10-24T10:00:00Z'),
      { __typename: 'CheckRun', name: 'check', status: 'COMPLETED', conclusion: 'SUCCESS', completedAt: '2026-10-24T10:00:00Z' },
    ]);
    expect(Object.keys(s).sort()).toEqual(['affected-e2e', 'checker', 'laptop-e2e', 'x']);
    expect(s.checker.state).toBe('success');
    expect(s['affected-e2e'].state).toBe('success');
    expect(s['laptop-e2e'].state).toBe('failure');
    expect(s.x.state).toBe('pending');
    expect(statusesFromRollup(null)).toEqual({});
  });

  it('statusesFromRollup reads gh pr list items too (startedAt, no description)', () => {
    const s = statusesFromRollup([ctx('checker', 'PENDING', '2026-10-26T04:10:00Z', 'startedAt'), ctx('checker', 'SUCCESS', '2026-10-26T04:36:59Z', 'startedAt')]);
    expect(s.checker).toEqual({ state: 'success', description: '', at: Date.parse('2026-10-26T04:36:59Z') });
    expect(trainReady(pr({ statuses: { ...s, 'affected-e2e': st('success') } })).ready).toBe(true);
  });

  it('the watchdog keeps reading GraphQL statuses through it', () => {
    const node = { number: 7, title: 't', headRefName: 'feature/x', headRefOid: 'a'.repeat(40), isDraft: false, mergeable: 'MERGEABLE', labels: { nodes: [] },
      headRef: { target: { oid: 'a'.repeat(40), committedDate: '2026-10-24T09:00:00Z', statusCheckRollup: { contexts: { nodes: [
        { __typename: 'CheckRun', name: 'check', status: 'COMPLETED', conclusion: 'SUCCESS', completedAt: '2026-10-24T10:00:00Z' },
        ctx('checker', 'SUCCESS', '2026-10-24T10:00:00Z'), ctx('affected-e2e', 'SUCCESS', '2026-10-24T10:00:00Z')] } } } } };
    expect(normalizePr(node).statuses.checker.state).toBe('success');
    expect(labelReady(normalizePr(node)).ready).toBe(true);
  });

  it('heldOff: the label removed at or after the head was pushed holds it until a new head', () => {
    const at = (hm: string) => Date.parse(`2026-10-26T${hm}:00Z`);
    expect(heldOff({ unlabeledAt: at('12:05'), headPushedAt: at('12:00') })).toBe(true);
    expect(heldOff({ unlabeledAt: at('12:00'), headPushedAt: at('12:00') })).toBe(true);
    expect(heldOff({ unlabeledAt: at('12:05'), headPushedAt: at('12:10') })).toBe(false);
    expect(heldOff({ unlabeledAt: null, headPushedAt: at('12:10') })).toBe(false);
    expect(heldOff({ unlabeledAt: null, headPushedAt: null })).toBe(false);
    expect(heldOff({ unlabeledAt: at('12:05'), headPushedAt: null })).toBe(true);
  });
});
