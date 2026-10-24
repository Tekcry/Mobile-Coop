import { describe, expect, it } from 'vitest';
import {
  classifyWorktree, countStates, lockState, parseArgs, parseLockHolder, parsePorcelain, parseStatusZ, protectedBranch, pruneCandidates,
  safeVerdict, summarizeQueue, wipAllowed,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/swap.mjs';
import {
  briefBranch, claimExpired, parseExpireArgs, parseStatusLine, planExpiry, reopenText,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/cloud-queue-expire.mjs';

const SHA = 'a'.repeat(40);
const PORCELAIN = [
  'worktree C:/NightShift/Mobile-Coop', `HEAD ${SHA}`, 'branch refs/heads/master', '',
  'worktree C:/NightShift/Mobile-Coop-menu', `HEAD ${'b'.repeat(40)}`, 'branch refs/heads/feature/menu', '',
  'worktree C:/NightShift/Mobile-Coop-testrun', `HEAD ${'c'.repeat(40)}`, 'detached', '',
  'worktree C:/NightShift/Mobile-Coop-gone', `HEAD ${'d'.repeat(40)}`, 'branch refs/heads/feature/gone', 'prunable gitdir file points to non-existent location', '',
  'worktree C:/NightShift/Mobile-Coop-held', `HEAD ${'e'.repeat(40)}`, 'branch refs/heads/feature/held', 'locked reason here', '',
].join('\r\n');

const facts = (over: Record<string, unknown> = {}) => ({
  missing: false, bare: false, detached: false, branch: 'feature/x', dirty: 0, dirtyAgeHours: null, unpushed: 0, merged: false, upstreamGone: false, ...over,
});

describe('parsePorcelain', () => {
  it('reads path, head, branch, detached, locked, prunable (missing) and marks the first as main', () => {
    const w = parsePorcelain(PORCELAIN);
    expect(w).toHaveLength(5);
    expect(w[0]).toMatchObject({ path: 'C:/NightShift/Mobile-Coop', head: SHA, branch: 'master', main: true, detached: false });
    expect(w[1]).toMatchObject({ branch: 'feature/menu', main: false });
    expect(w[2]).toMatchObject({ branch: null, detached: true });
    expect(w[3]).toMatchObject({ branch: 'feature/gone', missing: true });
    expect(w[4]).toMatchObject({ locked: true, missing: false });
  });
  it('empty input gives no worktrees', () => {
    expect(parsePorcelain('')).toEqual([]);
  });
});

describe('parseStatusZ', () => {
  it('lists changed paths, takes the new name of a rename and skips untracked folders holding worktrees', () => {
    const z = [' M src/a.ts', 'R  src/new.ts', 'src/old.ts', '?? scratch/', '?? .claude/worktrees/', '?? tests/zz.test.ts', ''].join('\0');
    const others = ['C:/NightShift/Mobile-Coop', 'C:/NightShift/Mobile-Coop/.claude/worktrees/agent-1'];
    expect(parseStatusZ(z, 'C:\\NightShift\\Mobile-Coop', others)).toEqual(['src/a.ts', 'src/new.ts', 'scratch/', 'tests/zz.test.ts']);
  });
  it('a clean worktree gives nothing', () => {
    expect(parseStatusZ('', 'C:/x', [])).toEqual([]);
  });
});

describe('classifyWorktree', () => {
  it('dirty wins over everything but missing, also on a merged branch (new work after a merge)', () => {
    expect(classifyWorktree(facts({ dirty: 2, unpushed: 3, merged: true }))).toBe('dirty');
    expect(classifyWorktree(facts({ missing: true, dirty: 2 }))).toBe('missing');
  });
  it('unpushed on a branch, detached-local on a detached HEAD', () => {
    expect(classifyWorktree(facts({ unpushed: 1 }))).toBe('unpushed');
    expect(classifyWorktree(facts({ unpushed: 1, detached: true, branch: null }))).toBe('detached-local');
  });
  it('clean merged or upstream-gone job branches are prunable; protected branches never are', () => {
    expect(classifyWorktree(facts({ merged: true }))).toBe('prunable');
    expect(classifyWorktree(facts({ upstreamGone: true }))).toBe('prunable');
    expect(classifyWorktree(facts({ branch: 'master', merged: true }))).toBe('clean');
    expect(classifyWorktree(facts({ branch: 'train/65', merged: true }))).toBe('clean');
  });
  it('clean detached HEAD on origin commits is detached; a plain clean branch is clean', () => {
    expect(classifyWorktree(facts({ detached: true, branch: null }))).toBe('detached');
    expect(classifyWorktree(facts())).toBe('clean');
  });
  it('dirty files all older than staleHours are stale-dirty, unless commits are unpushed; 0 turns it off', () => {
    expect(classifyWorktree(facts({ dirty: 3, dirtyAgeHours: 30 }), { staleHours: 12 })).toBe('stale-dirty');
    expect(classifyWorktree(facts({ dirty: 3, dirtyAgeHours: 2 }), { staleHours: 12 })).toBe('dirty');
    expect(classifyWorktree(facts({ dirty: 3, dirtyAgeHours: 30, unpushed: 1 }), { staleHours: 12 })).toBe('unpushed');
    expect(classifyWorktree(facts({ dirty: 3, dirtyAgeHours: 30 }), { staleHours: 0 })).toBe('dirty');
    expect(classifyWorktree(facts({ dirty: 3, dirtyAgeHours: null }), { staleHours: 12 })).toBe('dirty');
  });
});

describe('branches and WIP', () => {
  it('protects master, main, dev, train/*, the queue branches and gh-pages', () => {
    for (const b of ['master', 'main', 'dev', 'train/64', 'cloud-queue', 'laptop-queue', 'gh-pages', null]) expect(protectedBranch(b)).toBe(true);
    expect(protectedBranch('feature/menu')).toBe(false);
    expect(protectedBranch('trainer/x')).toBe(false);
  });
  it('WIP only on a job branch, never detached', () => {
    expect(wipAllowed({ branch: 'feature/menu', detached: false })).toBe(true);
    expect(wipAllowed({ branch: 'dev', detached: false })).toBe(false);
    expect(wipAllowed({ branch: null, detached: true })).toBe(false);
  });
});

describe('locks', () => {
  it('reads the pid anywhere in the text and the host when named', () => {
    expect(parseLockHolder('laptop-queue | 2026 d0f574cb pid 4484 | 2026-10-24T10:33:24.628Z')).toEqual({ pid: 4484, host: null });
    expect(parseLockHolder('S | job | 2026-10-23T08:00:00.000Z | pid 12 | host desk')).toEqual({ pid: 12, host: 'desk' });
    expect(parseLockHolder('Night Shift | old | 2026-10-22')).toEqual({ pid: null, host: null });
  });
  it('free, held, stale (dead pid here), elsewhere (other host), unknown (no pid)', () => {
    const alive = (p: number): boolean => p === 1;
    expect(lockState(null, { host: 'desk', alive })).toBe('free');
    expect(lockState('x | pid 1 | t', { host: 'desk', alive })).toBe('held');
    expect(lockState('x | pid 2 | t', { host: 'desk', alive })).toBe('stale');
    expect(lockState('x | t | pid 2 | host lap', { host: 'desk', alive })).toBe('elsewhere');
    expect(lockState('x | t | pid 2 | host desk', { host: 'desk', alive })).toBe('stale');
    expect(lockState('x | t', { host: 'desk', alive })).toBe('unknown');
  });
});

describe('summarizeQueue', () => {
  it('splits requests into queued (no claim), running (open claim) and done', () => {
    const q = summarizeQueue(['b', 'a', 'c'], { a: { worker: 'laptop', done: false, at: 't' }, b: { worker: 'desktop', done: true }, c: null });
    expect(q).toEqual({ queued: ['c'], running: [{ id: 'a', worker: 'laptop', at: 't' }], done: 1 });
  });
});

describe('safeVerdict', () => {
  const row = (state: string, over: Record<string, unknown> = {}) => ({ state, path: `C:/w/${state}`, branch: 'feature/x', head: SHA, dirty: 1, unpushed: 2, ...over });
  it('SAFE when nothing is at risk (prunable, stale-dirty, detached, missing do not count)', () => {
    const v = safeVerdict([row('clean'), row('prunable'), row('stale-dirty'), row('detached'), row('missing')], [{ state: 'held' }, { state: 'free' }]);
    expect(v).toEqual({ safe: true, items: [], line: 'SAFE' });
  });
  it('counts dirty, unpushed, detached-local, stale locks and extra problems', () => {
    const v = safeVerdict([row('dirty'), row('unpushed'), row('detached-local', { branch: null })],
      [{ state: 'stale', path: 'C:/NightShift/heavy.lock', pid: 9, text: 't' }, { state: 'unknown' }], ['push failed: feature/y']);
    expect(v.safe).toBe(false);
    expect(v.line).toBe('NOT SAFE: 5 items');
    expect(v.items[0]).toBe('dirty: feature/x 1 uncommitted - C:/w/dirty');
    expect(v.items[2]).toContain('(detached aaaaaaaa) 2 unpushed');
    expect(v.items[3]).toContain('stale lock');
  });
  it('countStates fills every state', () => {
    expect(countStates([row('dirty'), row('dirty'), row('clean')])).toMatchObject({ dirty: 2, clean: 1, unpushed: 0, prunable: 0, 'stale-dirty': 0 });
  });
});

describe('pruneCandidates', () => {
  const r = (over: Record<string, unknown>) => ({ state: 'prunable', merged: true, main: false, locked: false, detached: false, branch: 'feature/x', idleHours: 30, ...over });
  it('only clean merged job branches idle long enough, never main / locked / gone-only / fresh', () => {
    const rows = [r({}), r({ main: true }), r({ locked: true }), r({ merged: false }), r({ idleHours: 2 }), r({ idleHours: null }), r({ state: 'dirty' }), r({ branch: 'dev' })];
    expect(pruneCandidates(rows, { idleHours: 24 })).toEqual([rows[0]]);
  });
});

describe('parseArgs', () => {
  it('defaults from env and per-command flag rules', () => {
    const o = parseArgs(['status'], { NS_ROOT: 'D:/ns', SWAP_REPO: 'D:/ns/repo', LQ_WORKER: 'laptop' });
    expect(o).toMatchObject({ cmd: 'status', repo: 'D:/ns/repo', root: 'D:/ns', machine: 'laptop', staleHours: 12, fetch: true });
    expect(o.scratch.replace(/\\/g, '/')).toBe('D:/ns/scratch');
    expect(o.out.replace(/\\/g, '/')).toBe('D:/ns/scratch/swap-status.json');
    expect(parseArgs(['save', '--commit-wip', '--stale-hours', '0', '--no-fetch'], {})).toMatchObject({ commitWip: true, staleHours: 0, fetch: false });
    expect(parseArgs(['prune', '--yes', '--idle-hours', '48'], {})).toMatchObject({ yes: true, idleHours: 48 });
    expect(() => parseArgs(['status', '--commit-wip'], {})).toThrow(/save only/);
    expect(() => parseArgs(['prune'], {})).toThrow(/exactly one/);
    expect(() => parseArgs(['prune', '--dry-run', '--yes'], {})).toThrow(/exactly one/);
    expect(() => parseArgs(['save', '--yes'], {})).toThrow(/prune only/);
    expect(() => parseArgs(['nuke'], {})).toThrow(/unknown command/);
    expect(() => parseArgs(['status', '--jobs', 'x'], {})).toThrow(/number/);
  });
});

describe('cloud-queue-expire', () => {
  const NOW = Date.UTC(2026, 9, 24, 12, 0);
  const brief = (status: string, branch = 'feature/x') => `${status}\n# title\n\n- Base: origin/master. New branch \`${branch}\`. Only files: a.ts\n`;
  it('parses each status kind; a claim title may hold " | " and the time may lack seconds or zone', () => {
    expect(parseStatusLine('status: claimed Night Shift | Cloud Builder 1 2026-10-24T10:37Z')).toMatchObject({ kind: 'claimed', title: 'Night Shift | Cloud Builder 1', at: Date.UTC(2026, 9, 24, 10, 37) });
    expect(parseStatusLine('status: claimed Builder 2026-10-24T10:37:05.000Z').at).toBe(Date.UTC(2026, 9, 24, 10, 37, 5));
    expect(parseStatusLine('status: claimed Builder 2026-10-24T21:37+11:00').at).toBe(Date.UTC(2026, 9, 24, 10, 37));
    expect(parseStatusLine('status: claimed Builder 2026-10-24T10:37').at).toBe(Date.UTC(2026, 9, 24, 10, 37));
    expect(parseStatusLine('status: claimed Builder').at).toBeNaN();
    expect(parseStatusLine('status: open').kind).toBe('open');
    expect(parseStatusLine('status: done feature/x 1234abcd')).toMatchObject({ kind: 'done', rest: 'feature/x 1234abcd' });
    expect(parseStatusLine('# no status').kind).toBeNull();
  });
  it('finds the brief branch in both spellings', () => {
    expect(briefBranch('New branch `feature/guard-ai-s26`. More')).toBe('feature/guard-ai-s26');
    expect(briefBranch('- New branch: `feature/level-validator-v1b`. Edit')).toBe('feature/level-validator-v1b');
    expect(briefBranch('no branch here')).toBeNull();
  });
  it('expires only an old claim with no commit after it', () => {
    const claimAt = NOW - 100 * 60_000;
    expect(claimExpired({ claimAt, now: NOW, maxMin: 90 })).toBe(true);
    expect(claimExpired({ claimAt, now: NOW, maxMin: 120 })).toBe(false);
    expect(claimExpired({ claimAt, now: NOW, maxMin: 90, lastPushAt: claimAt + 60_000 })).toBe(false);
    expect(claimExpired({ claimAt, now: NOW, maxMin: 90, lastPushAt: claimAt - 60_000 })).toBe(true);
    expect(claimExpired({ claimAt: NaN, now: NOW, maxMin: 90 })).toBe(false);
  });
  it('plans reopens across briefs and rewrites line 1 only', () => {
    const briefs = [
      { path: 'briefs/a.md', text: brief('status: claimed Night Shift | Cloud Builder 1 2026-10-24T10:00Z', 'feature/a') },
      { path: 'briefs/b.md', text: brief('status: claimed Night Shift | Cloud Builder 2 2026-10-24T10:00Z', 'feature/b') },
      { path: 'briefs/c.md', text: brief('status: claimed Night Shift | Cloud Builder 1 2026-10-24T11:30Z', 'feature/c') },
      { path: 'briefs/d.md', text: brief('status: open') },
      { path: 'briefs/e.md', text: brief('status: done feature/e 12345678') },
    ];
    const pushTimes = { 'feature/a': null, 'feature/b': Date.UTC(2026, 9, 24, 11, 0) };
    const plan = planExpiry(briefs, { now: NOW, maxMin: 90, pushTimes });
    expect(plan).toEqual([{ path: 'briefs/a.md', title: 'Night Shift | Cloud Builder 1', at: '2026-10-24T10:00:00.000Z', branch: 'feature/a', ageMin: 120, lastPushAt: null }]);
    expect(reopenText(briefs[0]!.text)).toBe(brief('status: open', 'feature/a'));
    expect(reopenText('status: claimed x 2026-10-24T10:00Z\r\nrest\r\n')).toBe('status: open\r\nrest\r\n');
  });
  it('args: dry run by default, --yes, --max-min', () => {
    expect(parseExpireArgs([], {})).toMatchObject({ yes: false, maxMin: 90, fetch: true });
    expect(parseExpireArgs(['--yes', '--max-min', '60', '--no-fetch'], {})).toMatchObject({ yes: true, maxMin: 60, fetch: false });
    expect(() => parseExpireArgs(['--yes', '--dry-run'], {})).toThrow(/not both/);
    expect(() => parseExpireArgs(['--max-min', '0'], {})).toThrow(/minutes/);
  });
});
