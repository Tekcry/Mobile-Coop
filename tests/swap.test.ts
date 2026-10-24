import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  classifyWorktree, commitWip, countStates, dirtyAge, hasUnmerged, keptIgnored, linkHops, lockState, nodeModulesTargets, norm, opInProgress, parseArgs, parseLockHolder,
  parsePorcelain, parseStatusEntries, parseStatusZ, probeInUse, protectedBranch, pruneBlocker, pruneCandidates, readDirty, resolveClones, safeVerdict,
  scanAll, secretPath, stagePaths, summarizeQueue, wipAllowed, wipCommit, wipGuard,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/swap.mjs';
import {
  briefBranch, claimExpired, parseExpireArgs, parseStatusLine, plan, planExpiry, pushReopen, reopenText,
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
    for (const b of ['master', 'main', 'dev', 'ct-movement', 'train/64', 'cloud-queue', 'laptop-queue', 'gh-pages', null]) expect(protectedBranch(b)).toBe(true);
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
  it('never a worktree that holds another registered worktree (any clone); a sibling with a longer name is fine', () => {
    const rows = [r({ path: 'C:/NS/Mobile-Coop-a' }), r({ path: 'C:/NS/Mobile-Coop-b' })];
    const registered = ['C:/NS/Mobile-Coop', 'C:/NS/Mobile-Coop-a', 'C:\\NS\\mobile-coop-a\\.claude\\worktrees\\agent-1', 'C:/NS/Mobile-Coop-b', 'C:/NS/Mobile-Coop-bb'];
    expect(pruneCandidates(rows, { idleHours: 24, registered })).toEqual([rows[1]]);
  });
  it('ignored entries: node_modules / dist / test-results go, anything else is kept', () => {
    const e = parseStatusEntries(['!! node_modules/', '!! sub/dist/', '!! test-results/', '!! .mocap-cache/', '!! tools/__pycache__/', '?? x.txt', ''].join('\0'));
    expect(keptIgnored(e)).toEqual(['.mocap-cache/', 'tools/__pycache__/']);
  });
  it('in-use probe: a refused rename means in use; a failed rename back stops the prune', () => {
    const calls: string[] = [];
    const err = (code: string): Error => Object.assign(new Error(code), { code });
    expect(probeInUse('C:/w', { renameSync: (a: string, b: string) => { calls.push(`${a}>${b}`); } })).toBe(false);
    expect(calls).toEqual(['C:/w>C:/w.swap-probe', 'C:/w.swap-probe>C:/w']);
    for (const code of ['EBUSY', 'EPERM', 'EACCES']) expect(probeInUse('C:/w', { renameSync: () => { throw err(code); } })).toBe(true);
    let n = 0;
    expect(() => probeInUse('C:/w', { renameSync: () => { if (n++) throw err('EBUSY'); } })).toThrow(/^STOP/);
  });
});

describe('parseArgs', () => {
  it('defaults from env and per-command flag rules', () => {
    const o = parseArgs(['status'], { NS_ROOT: 'D:/ns', SWAP_REPO: 'D:/ns/repo', LQ_WORKER: 'laptop' });
    expect(o).toMatchObject({ cmd: 'status', repos: ['D:/ns/repo'], root: 'D:/ns', machine: 'laptop', staleHours: 12, fetch: true });
    expect(parseArgs(['status'], {}).repos).toEqual([]);
    expect(parseArgs(['status', '--repo', 'A', '--repo', 'B'], { SWAP_REPO: 'C' }).repos).toEqual(['A', 'B']);
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

// ---------------------------------------------------------------- fix round (PR #349 checker)

const GIT_ENV = { GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };
Object.assign(process.env, GIT_ENV);
const g = (cwd: string, ...args: string[]): string => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', env: { ...process.env, ...GIT_ENV }, stdio: ['ignore', 'pipe', 'pipe'] });
const tmpRepo = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'swap-'));
  g(dir, 'init', '-q', '-b', 'feature/x');
  g(dir, 'config', 'core.autocrlf', 'false');
  fs.writeFileSync(path.join(dir, 'a.txt'), 'a\n');
  g(dir, 'add', 'a.txt');
  g(dir, 'commit', '-q', '-m', 'base');
  return dir;
};
const makeOld = (p: string): void => { const t = new Date(Date.now() - 48 * 3_600_000); fs.utimesSync(p, t, t); };
const rm = (d: string): void => fs.rmSync(d, { recursive: true, force: true });

describe('status entries, unmerged, staging, op markers, age', () => {
  it('keeps the status codes; unmerged codes are detected', () => {
    const e = parseStatusEntries(['UU src/a.ts', ' M b.ts', ''].join('\0'));
    expect(e).toEqual([{ xy: 'UU', file: 'src/a.ts' }, { xy: ' M', file: 'b.ts' }]);
    expect(hasUnmerged(e)).toBe(true);
    for (const xy of ['AA', 'DD', 'AU', 'UD', 'DU', 'UA']) expect(hasUnmerged([{ xy, file: 'f' }])).toBe(true);
    expect(hasUnmerged([{ xy: ' M', file: 'f' }, { xy: '??', file: 'g' }, { xy: 'D ', file: 'h' }])).toBe(false);
  });
  it('stages files only, never a nested repository entry', () => {
    expect(stagePaths([{ xy: '??', file: 'scratch/clone/' }, { xy: '??', file: 'n.txt' }, { xy: ' D', file: 'gone.txt' }])).toEqual(['n.txt', 'gone.txt']);
  });
  it('names the first operation in progress', () => {
    expect(opInProgress((m: string) => m === 'REVERT_HEAD' || m === 'rebase-apply')).toBe('REVERT_HEAD');
    expect(opInProgress(() => false)).toBeNull();
  });
  it('age is the newest path; a deleted path counts as fresh', () => {
    const now = Date.UTC(2026, 9, 24, 12);
    const t: Record<string, number | null> = { a: now - 30 * 3_600_000, b: now - 2 * 3_600_000, gone: null };
    expect(dirtyAge(['a', 'b'], (f: string) => t[f], now)).toBe(2);
    expect(dirtyAge(['a', 'gone'], (f: string) => t[f], now)).toBe(0);
    expect(dirtyAge([], () => 0, now)).toBeNull();
  });
});

describe('readDirty (-uall)', () => {
  it('lists a fresh file inside an old untracked folder, so the worktree is not stale', async () => {
    const dir = tmpRepo();
    try {
      fs.mkdirSync(path.join(dir, 'probe'));
      fs.writeFileSync(path.join(dir, 'probe', 'old.txt'), 'x');
      fs.writeFileSync(path.join(dir, 'probe', 'new.txt'), 'y');
      makeOld(path.join(dir, 'probe', 'old.txt'));
      makeOld(path.join(dir, 'probe'));
      const files = ((await readDirty(dir, [])) as { file: string }[]).map((e) => e.file).sort();
      expect(files).toEqual(['probe/new.txt', 'probe/old.txt']);
      const age = dirtyAge(files, (f: string) => fs.statSync(path.join(dir, f)).mtimeMs, Date.now());
      expect(classifyWorktree(facts({ dirty: files.length, dirtyAgeHours: age }), { staleHours: 12 })).toBe('dirty');
    } finally { rm(dir); }
  });
});

describe('wipCommit', () => {
  it('commits the listed files only: no gitlink for a nested repo or a registered worktree', async () => {
    const dir = tmpRepo();
    try {
      fs.writeFileSync(path.join(dir, 'a.txt'), 'changed\n');
      fs.writeFileSync(path.join(dir, 'new.txt'), 'n\n');
      const nested = path.join(dir, 'scratch', 'clone');
      fs.mkdirSync(nested, { recursive: true });
      g(nested, 'init', '-q');
      fs.writeFileSync(path.join(nested, 'f.txt'), 'f');
      g(nested, 'add', 'f.txt');
      g(nested, 'commit', '-q', '-m', 'n');
      const wt = path.join(dir, '.claude', 'worktrees', 'agent-1');
      g(dir, 'worktree', 'add', '-q', '-b', 'agent-1', wt);
      const others = [dir, wt].map((p) => p.replace(/\\/g, '/'));
      const res = await wipCommit(dir, others, '2026-10-24T11:00:00.000Z');
      expect(res).toEqual({ committed: true, problem: null });
      expect(g(dir, 'log', '-1', '--format=%s').trim()).toBe('WIP: swap save 2026-10-24T11:00:00.000Z');
      expect(g(dir, 'show', '--name-only', '--format=', 'HEAD').trim().split('\n').sort()).toEqual(['a.txt', 'new.txt']);
      expect(g(dir, 'ls-files', '-s').includes('160000')).toBe(false);
    } finally { rm(dir); }
  });
  it('refuses mid merge (MERGE_HEAD) and with unmerged paths', async () => {
    const dir = tmpRepo();
    try {
      fs.writeFileSync(path.join(dir, 'a.txt'), 'changed\n');
      const head = g(dir, 'rev-parse', 'HEAD').trim();
      fs.writeFileSync(path.join(dir, '.git', 'MERGE_HEAD'), `${head}\n`);
      const res = await wipCommit(dir, [], 'iso');
      expect(res.committed).toBe(false);
      expect(res.problem).toMatch(/mid MERGE_HEAD/);
      fs.rmSync(path.join(dir, '.git', 'MERGE_HEAD'));
      g(dir, 'checkout', '-q', '--', 'a.txt');
      g(dir, 'checkout', '-q', '-b', 'other');
      fs.writeFileSync(path.join(dir, 'a.txt'), 'other\n');
      g(dir, 'commit', '-q', '-am', 'other');
      g(dir, 'checkout', '-q', 'feature/x');
      fs.writeFileSync(path.join(dir, 'a.txt'), 'mine\n');
      g(dir, 'commit', '-q', '-am', 'mine');
      try { g(dir, 'merge', '-q', 'other'); } catch { /* conflict expected */ }
      // the unmerged check alone: MERGE_HEAD removed, the conflict entries stay in the index
      fs.rmSync(path.join(dir, '.git', 'MERGE_HEAD'), { force: true });
      const res2 = await wipCommit(dir, [], 'iso');
      expect(res2.committed).toBe(false);
      expect(res2.problem).toMatch(/unmerged/);
      expect(g(dir, 'log', '-1', '--format=%s').trim()).toBe('mine');
    } finally { rm(dir); }
  });
});

describe('cloud-queue-expire plan / push use one sha', () => {
  it('reopens on top of the sha it read; a cloud-queue that moved after the read rejects the push (no force)', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-'));
    try {
      const bare = path.join(root, 'origin.git');
      const seed = path.join(root, 'seed');
      const repo = path.join(root, 'repo');
      execFileSync('git', ['init', '-q', '--bare', bare]);
      fs.mkdirSync(seed);
      g(seed, 'init', '-q', '-b', 'cloud-queue');
      g(seed, 'config', 'core.autocrlf', 'false');
      fs.mkdirSync(path.join(seed, 'briefs'));
      fs.writeFileSync(path.join(seed, 'briefs', 'a.md'), 'status: claimed Night Shift | Cloud Builder 1 2026-10-20T10:00Z\n# a\nNew branch `feature/a`.\n');
      g(seed, 'add', '.');
      g(seed, 'commit', '-q', '-m', 'brief');
      g(seed, 'push', '-q', bare, 'cloud-queue');
      execFileSync('git', ['clone', '-q', bare, repo], { stdio: 'ignore' });
      const o = { repo, maxMin: 90, yes: true, fetch: false };
      const first = await plan(o);
      expect(first.list.map((e: { path: string }) => e.path)).toEqual(['briefs/a.md']);
      expect(first.sha).toBe(g(repo, 'rev-parse', 'origin/cloud-queue').trim());
      fs.writeFileSync(path.join(seed, 'briefs', 'b.md'), 'status: open\n# b\n');
      g(seed, 'add', '.');
      g(seed, 'commit', '-q', '-m', 'brief b');
      g(seed, 'push', '-q', bare, 'cloud-queue');
      g(repo, 'fetch', '-q', 'origin');
      expect(await pushReopen(o, first.sha, first.briefs, first.list)).toBe(false);
      const second = await plan(o);
      expect(await pushReopen(o, second.sha, second.briefs, second.list)).toBe(true);
      expect(execFileSync('git', ['-C', bare, 'rev-parse', 'cloud-queue^'], { encoding: 'utf8' }).trim()).toBe(second.sha);
      expect(execFileSync('git', ['-C', bare, 'show', 'cloud-queue:briefs/a.md'], { encoding: 'utf8' }).split('\n')[0]).toBe('status: open');
    } finally { rm(root); }
  });
});

describe('clones, --commit-wip pushes, prune blockers (real git)', () => {
  it('finds each clone once under a root, scans all, and --commit-wip pushes WIP and branch-only commits', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'swapmc-'));
    try {
      const bare = path.join(tmp, 'origin.git');
      const ns = path.join(tmp, 'ns');
      const seed = path.join(tmp, 'seed');
      execFileSync('git', ['init', '-q', '--bare', '-b', 'master', bare]);
      fs.mkdirSync(ns);
      fs.mkdirSync(seed);
      g(seed, 'init', '-q', '-b', 'master');
      fs.writeFileSync(path.join(seed, 'a.txt'), 'a\n');
      g(seed, 'add', '.');
      g(seed, 'commit', '-q', '-m', 'base');
      g(seed, 'push', '-q', bare, 'master');
      const A = path.join(ns, 'A'), B = path.join(ns, 'B'), Awt = path.join(ns, 'A-wt');
      for (const d of [A, B]) execFileSync('git', ['clone', '-q', '-c', 'core.autocrlf=false', bare, d], { stdio: 'ignore' });
      g(A, 'worktree', 'add', '-q', '-b', 'feature/a', Awt);
      fs.writeFileSync(path.join(Awt, 'wip.txt'), 'w\n');
      g(B, 'checkout', '-q', '-b', 'feature/b-only');
      fs.writeFileSync(path.join(B, 'b.txt'), 'b\n');
      g(B, 'add', 'b.txt');
      g(B, 'commit', '-q', '-m', 'b');
      g(B, 'checkout', '-q', 'master');
      fs.mkdirSync(path.join(ns, 'not-a-repo'));
      const clones = await resolveClones(fs.readdirSync(ns).map((n) => path.join(ns, n)));
      expect(clones.map((c: { label: string }) => c.label)).toEqual(['A', 'B']);
      const o = { jobs: 4, staleHours: 12 };
      type Row = { branch: string | null; state: string; label: string };
      const { rows, registered } = await scanAll(o, clones);
      expect(rows.find((r: Row) => r.branch === 'feature/a')).toMatchObject({ label: 'A', state: 'dirty' });
      expect(rows.find((r: Row) => r.branch === 'feature/b-only')).toMatchObject({ label: 'B', state: 'unpushed', unpushed: 1, branchOnly: true });
      const res = await commitWip(o, rows, 'iso', () => {}, registered);
      expect(res.problems).toEqual([]);
      const onOrigin = (b: string): string => execFileSync('git', ['-C', bare, 'log', '-1', '--format=%s', b], { encoding: 'utf8' }).trim();
      expect(onOrigin('feature/a')).toBe('WIP: swap save iso');
      expect(onOrigin('feature/b-only')).toBe('b');
      expect((await scanAll(o, clones)).rows.filter((r: Row) => ['dirty', 'unpushed'].includes(r.state))).toEqual([]);
    } finally { rm(tmp); }
  }, 60_000);
  it('prune keeps a worktree with a .claude/worktrees entry, kept ignored files or another worktree\'s node_modules link target', async () => {
    const dir = fs.realpathSync.native(tmpRepo());
    const other = fs.mkdtempSync(path.join(os.tmpdir(), 'swaplink-'));
    try {
      fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\ndist/\n.mocap-cache/\n.claude/\n');
      g(dir, 'add', '.gitignore');
      g(dir, 'commit', '-q', '-m', 'ignore');
      fs.mkdirSync(path.join(dir, 'node_modules'));
      fs.writeFileSync(path.join(dir, 'node_modules', 'x.js'), '');
      fs.mkdirSync(path.join(dir, 'dist'));
      fs.writeFileSync(path.join(dir, 'dist', 'i.html'), '');
      expect(await pruneBlocker({ path: dir }, [])).toBeNull();
      fs.mkdirSync(path.join(dir, '.mocap-cache'));
      fs.writeFileSync(path.join(dir, '.mocap-cache', 'c.bin'), '');
      expect(await pruneBlocker({ path: dir }, [])).toMatch(/ignored files would be deleted: \.mocap-cache/);
      rm(path.join(dir, '.mocap-cache'));
      fs.mkdirSync(path.join(dir, '.claude', 'worktrees', 'agent-1'), { recursive: true });
      expect(await pruneBlocker({ path: dir }, [])).toMatch(/\.claude\/worktrees holds 1/);
      rm(path.join(dir, '.claude'));
      fs.symlinkSync(path.join(dir, 'node_modules'), path.join(other, 'node_modules'), 'junction');
      const targets = nodeModulesTargets([other, dir]);
      expect(targets).toHaveLength(1);
      expect(await pruneBlocker({ path: dir }, targets)).toMatch(/node_modules link/);
      expect(await pruneBlocker({ path: other }, targets)).not.toMatch(/node_modules link/); // the linking side is not held
    } finally { fs.unlinkSync(path.join(other, 'node_modules')); rm(other); rm(dir); }
  }, 30_000);
  it('a junction chain A -> B -> C keeps B and C (every hop), read also one folder level down', async () => {
    const tmp = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'swapchain-')));
    const A = path.join(tmp, 'A'), B = path.join(tmp, 'B'), C = path.join(tmp, 'C'), D = path.join(tmp, 'D');
    try {
      for (const d of [A, B, C, D]) fs.mkdirSync(d);
      fs.mkdirSync(path.join(C, 'node_modules'));
      fs.symlinkSync(path.join(C, 'node_modules'), path.join(B, 'node_modules'), 'junction');
      fs.symlinkSync(path.join(B, 'node_modules'), path.join(A, 'node_modules'), 'junction');
      const hops = linkHops(path.join(A, 'node_modules')).map((h: string) => h.toLowerCase());
      expect(hops).toContain(norm(path.join(B, 'node_modules')).toLowerCase());
      expect(hops).toContain(norm(path.join(C, 'node_modules')).toLowerCase());
      const targets = nodeModulesTargets([A, B, C]);
      for (const kept of [B, C]) expect(await pruneBlocker({ path: kept }, targets)).toMatch(/node_modules link/);
      // a link one level down (D/sub/node_modules -> A's chain) is read when only D is listed
      fs.mkdirSync(path.join(D, 'sub'));
      fs.symlinkSync(path.join(B, 'node_modules'), path.join(D, 'sub', 'node_modules'), 'junction');
      const down = nodeModulesTargets([D]).map((h: string) => h.toLowerCase());
      expect(down).toEqual(expect.arrayContaining([B, C].map((x) => norm(path.join(x, 'node_modules')).toLowerCase())));
      expect(nodeModulesTargets([C])).toEqual([]); // a real install links nowhere
    } finally {
      for (const l of [path.join(A, 'node_modules'), path.join(B, 'node_modules'), path.join(D, 'sub', 'node_modules')]) try { fs.unlinkSync(l); } catch { /* absent */ }
      rm(tmp);
    }
  });
});

describe('--commit-wip guard: secret deny list and size caps', () => {
  it('flags secret-looking paths in any segment, case-insensitively; ordinary names pass', () => {
    for (const f of ['.env', 'sub/.env.local', 'k/server.PEM', 'a.key', 'c.p12', 'c.pfx', '.ssh/id_rsa.pub', 'aws-credentials.json', 'config/Secrets/x.txt', '.npmrc', 'gh.token']) expect(secretPath(f)).toBe(true);
    for (const f of ['src/env.ts', 'keyboard.ts', 'docs/environment.md', 'tokens.css', 'src/a.ts']) expect(secretPath(f)).toBe(false);
  });
  it('wipGuard: secrets, a big new / modified / renamed file, a big total; deletions and dirs are ignored', () => {
    const MB = 1024 * 1024;
    const size = (m: Record<string, number>) => (f: string): number | null => m[f] ?? null;
    expect(wipGuard([{ xy: '??', file: 'a.txt' }, { xy: ' M', file: '.env.prod' }], size({}))).toMatch(/secret-looking paths \.env\.prod/);
    expect(wipGuard([{ xy: ' D', file: 'old.pem' }, { xy: '??', file: 'nested/' }], size({}))).toBeNull();
    for (const xy of ['??', ' M', 'M ', 'R ', 'C ', 'A ']) expect(wipGuard([{ xy, file: 'big.bin' }], size({ 'big.bin': 11 * MB }))).toMatch(/big\.bin \(over 10 MB\)/);
    const six = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`f${i}`, 9 * MB]));
    expect(wipGuard(Object.keys(six).map((file) => ({ xy: '??', file })), size(six))).toMatch(/54 MB \(over 50 MB/);
    expect(wipGuard([{ xy: '??', file: 'small.txt' }], size({ 'small.txt': 10 }))).toBeNull();
  });
  it('wipCommit stages nothing and commits nothing when a secret or a big modified file is there', async () => {
    const dir = tmpRepo();
    try {
      const head = g(dir, 'rev-parse', 'HEAD').trim();
      fs.writeFileSync(path.join(dir, 'a.txt'), 'changed\n');
      fs.writeFileSync(path.join(dir, 'id_rsa'), 'k');
      const res = await wipCommit(dir, [], 'iso');
      expect(res.committed).toBe(false);
      expect(res.problem).toMatch(/secret-looking paths id_rsa/);
      expect(g(dir, 'rev-parse', 'HEAD').trim()).toBe(head);
      expect(g(dir, 'diff', '--cached', '--name-only').trim()).toBe('');
      fs.rmSync(path.join(dir, 'id_rsa'));
      fs.writeFileSync(path.join(dir, 'a.txt'), Buffer.alloc(11 * 1024 * 1024));
      const res2 = await wipCommit(dir, [], 'iso');
      expect(res2.problem).toMatch(/a\.txt \(over 10 MB\)/);
      expect(g(dir, 'rev-parse', 'HEAD').trim()).toBe(head);
    } finally { rm(dir); }
  }, 30_000);
});
