import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs process script without types
import { chunks, isProtectedBranch, parseWorktrees, selectBranches, selectWorktrees } from '../scripts/prune-merged.mjs';

type W = { path: string; head: string | null; branch: string | null; locked: boolean; main: boolean; why?: string };
type R = { name: string; sha: string; time: number; remote: boolean; why?: string };

describe('worktrees', () => {
  const porcelain = [
    'worktree C:/NightShift/Mobile-Coop', 'HEAD aaa', 'branch refs/heads/feature/operators', '',
    'worktree C:/NightShift/Mobile-Coop-old', 'HEAD bbb', 'branch refs/heads/feature/old', '',
    'worktree C:/NightShift/Mobile-Coop-menu', 'HEAD ccc', 'branch refs/heads/feature/menu', '',
    'worktree C:/NightShift/Mobile-Coop-lock', 'HEAD ddd', 'detached', 'locked busy', '',
    'worktree C:/NightShift/Mobile-Coop-dirty', 'HEAD eee', 'branch refs/heads/feature/dirty', '',
    'worktree C:/NightShift/Mobile-Coop-new', 'HEAD fff', 'branch refs/heads/feature/new', '',
    'worktree C:/NightShift/Mobile-Coop-wip', 'HEAD ggg', 'branch refs/heads/feature/wip', '',
  ].join('\n');
  it('parses git worktree list --porcelain', () => {
    const list: W[] = parseWorktrees(porcelain);
    expect(list).toHaveLength(7);
    expect(list[0]).toMatchObject({ path: 'C:/NightShift/Mobile-Coop', branch: 'feature/operators', main: true });
    expect(list[3]).toMatchObject({ branch: null, locked: true, main: false });
  });
  it('removes only clean, idle worktrees whose HEAD is in master', () => {
    const facts = (w: W) => ({
      bbb: { exists: true, merged: true, clean: true, idleHours: 30 },
      eee: { exists: true, merged: true, clean: false, idleHours: 30 },
      fff: { exists: true, merged: true, clean: true, idleHours: 2 },
      ggg: { exists: true, merged: false, clean: true, idleHours: 300 },
    } as Record<string, unknown>)[w.head ?? ''] ?? { exists: true, merged: true, clean: true, idleHours: 999 };
    const { remove, keep } = selectWorktrees(parseWorktrees(porcelain), facts, { hours: 24 });
    expect(remove.map((w: W) => w.path)).toEqual(['C:/NightShift/Mobile-Coop-old']);
    expect(Object.fromEntries(keep.map((w: W) => [w.path.split('/').pop(), w.why]))).toEqual({
      'Mobile-Coop': 'main worktree', 'Mobile-Coop-menu': 'service worktree', 'Mobile-Coop-lock': 'locked',
      'Mobile-Coop-dirty': 'uncommitted changes', 'Mobile-Coop-new': 'active 2 h ago', 'Mobile-Coop-wip': 'HEAD not in origin/master',
    });
  });
});

describe('branches', () => {
  const now = 1_800_000_000;
  const day = 86400;
  const refs: R[] = [
    { name: 'feature/done', sha: 'm1', time: now - 10 * day, remote: true },
    { name: 'feature/done', sha: 'm1', time: now - 10 * day, remote: false },
    { name: 'feature/fresh', sha: 'm2', time: now - 2 * day, remote: true },
    { name: 'feature/open', sha: 'u1', time: now - 30 * day, remote: true },
    { name: 'feature/pr', sha: 'm3', time: now - 30 * day, remote: true },
    { name: 'feature/used', sha: 'm4', time: now - 30 * day, remote: false },
    { name: 'master', sha: 'm5', time: now - 30 * day, remote: true },
    { name: 'dev', sha: 'm5', time: now - 30 * day, remote: true },
    { name: 'ct-movement', sha: 'm5', time: now - 30 * day, remote: true },
    { name: 'laptop-queue', sha: 'm5', time: now - 30 * day, remote: true },
    { name: 'cloud-queue', sha: 'm5', time: now - 30 * day, remote: true },
    { name: 'train/82', sha: 'm5', time: now - 30 * day, remote: true },
  ];
  const merged = (sha: string) => sha.startsWith('m');
  it('deletes merged branches older than 7 days, never protected, unmerged, open-PR or in-use ones', () => {
    const { remove, keep } = selectBranches(refs, { merged, now, days: 7, openPrHeads: new Set(['feature/pr']), inUse: new Set(['feature/used']) });
    expect(remove.map((r: R) => `${r.remote ? 'origin/' : ''}${r.name}`)).toEqual(['origin/feature/done', 'feature/done']);
    const why = Object.fromEntries(keep.map((r: R) => [r.name, r.why]));
    expect(why).toMatchObject({ 'feature/fresh': 'tip 2.0 days old', 'feature/open': 'not merged into origin/master', 'feature/pr': 'open PR',
      'feature/used': 'checked out in a worktree', master: 'protected', dev: 'protected', 'train/82': 'protected', 'cloud-queue': 'protected' });
  });
  it('deletes no remote branch when the open PRs are unknown', () => {
    const { remove } = selectBranches(refs, { merged, now, days: 7, openPrHeads: null });
    expect(remove.map((r: R) => `${r.remote}:${r.name}`)).toEqual(['false:feature/done', 'false:feature/used']);
  });
  it('protects the long-lived names', () => {
    for (const b of ['master', 'dev', 'ct-movement', 'laptop-queue', 'cloud-queue', 'feature/menu', 'train/1']) expect(isProtectedBranch(b)).toBe(true);
    expect(isProtectedBranch('feature/train-x')).toBe(false);
  });
  it('chunks lists', () => {
    expect(chunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe('log summary', () => {
  it('groups kept reasons by their words', async () => {
    // @ts-expect-error plain .mjs process script without types
    const { reasons } = await import('../scripts/prune-merged.mjs');
    expect(reasons([{ why: 'active 3 h ago' }, { why: 'active 12 h ago' }, { why: 'protected' }])).toBe('2 active N h ago, 1 protected');
    expect(reasons([])).toBe('none');
  });
});
