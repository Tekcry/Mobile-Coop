import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// @ts-expect-error plain .mjs script without types
import { archiveMoves, jobDoneJobs, movedPath, rewriteArchiveLinks } from '../scripts/job-archive.mjs';
// @ts-expect-error plain .mjs process script without types
import { deriveRelease, versionTreeCommit } from '../scripts/merge-train.mjs';

type Plan = { from: string; to: string; moves: { from: string; to: string }[] };

describe('Job-done lines', () => {
  it('reads the jobs a PR body names, once each', () => {
    const body = 'Summary\n\nJob-done: demojob\n- Job-done: `sector-redesign`\njob-done: demojob\nnot Job-done: x y\n';
    expect(jobDoneJobs(body)).toEqual(['demojob', 'sector-redesign']);
  });
  it('ignores non-job folders and path tricks', () => {
    expect(jobDoneJobs('Job-done: archive\nJob-done: systems\nJob-done: ../x\nJob-done: a/b')).toEqual([]);
    expect(jobDoneJobs(null)).toEqual([]);
  });
});

describe('archive moves', () => {
  const files = ['docs/demojob/BRIEF.md', 'docs/demojob/slices/S1.md', 'docs/demojob-x/PLAN.md'];
  it('moves docs/<job>/ under docs/archive/<job>/', () => {
    const p: Plan = archiveMoves('demojob', files, () => false, '2026-10-25');
    expect(p.to).toBe('docs/archive/demojob');
    expect(p.moves).toEqual([
      { from: 'docs/demojob/BRIEF.md', to: 'docs/archive/demojob/BRIEF.md' },
      { from: 'docs/demojob/slices/S1.md', to: 'docs/archive/demojob/slices/S1.md' },
    ]);
  });
  it('adds the date when the archive name is taken, then a counter', () => {
    const taken = new Set(['docs/archive/demojob', 'docs/archive/demojob-2026-10-25']);
    expect(archiveMoves('demojob', files, (t: string) => taken.has(t), '2026-10-25').to).toBe('docs/archive/demojob-2026-10-25-2');
  });
  it('returns null for a job with no docs', () => {
    expect(archiveMoves('none', files, () => false, 'd')).toBeNull();
  });
});

describe('link rewrite', () => {
  const plans: Plan[] = [archiveMoves('demojob', ['docs/demojob/PLAN.md', 'docs/demojob/STATE.md'], () => false, 'd')];
  it('maps paths through the moves', () => {
    expect(movedPath('docs/demojob/PLAN.md', plans)).toBe('docs/archive/demojob/PLAN.md');
    expect(movedPath('docs/demojob-x/PLAN.md', plans)).toBe('docs/demojob-x/PLAN.md');
  });
  it('fixes links and repo paths into the moved folder from other docs', () => {
    const text = 'See [plan](../demojob/PLAN.md#s1), `docs/demojob/STATE.md`, docs/demojob/ and `docs/demojob-x/PLAN.md` [web](https://x/docs/demojob/a).';
    expect(rewriteArchiveLinks(text, 'docs/systems/coop.md', plans)).toBe(
      'See [plan](../archive/demojob/PLAN.md#s1), `docs/archive/demojob/STATE.md`, docs/archive/demojob/ and `docs/demojob-x/PLAN.md` [web](https://x/docs/demojob/a).');
    expect(rewriteArchiveLinks('[p](docs/demojob/PLAN.md)', 'README.md', plans)).toBe('[p](docs/archive/demojob/PLAN.md)');
  });
  it('keeps links out of and inside a moved file working', () => {
    const text = '[bible](../design-bible.md) [state](STATE.md) [ai](../systems/ai.md#x)';
    expect(rewriteArchiveLinks(text, 'docs/demojob/PLAN.md', plans)).toBe(
      '[bible](../../design-bible.md) [state](STATE.md) [ai](../../systems/ai.md#x)');
  });
  it('leaves unrelated text alone', () => {
    const text = 'Nothing [x](../demojob-x/PLAN.md) here.';
    expect(rewriteArchiveLinks(text, 'docs/systems/a.md', plans)).toBe(text);
  });
});

describe('versionTreeCommit archives Job-done docs (real git repo)', () => {
  it('moves the folder, fixes the links and leaves every ref alone', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-arch-'));
    const git = (...a: string[]): string => execFileSync('git', ['-c', 'core.autocrlf=false', ...a], { cwd: dir, encoding: 'utf8' }).trim();
    const write = (f: string, t: string): void => {
      fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
      fs.writeFileSync(path.join(dir, f), t);
    };
    try {
      git('init', '-q', '-b', 'master');
      git('config', 'user.name', 't'); git('config', 'user.email', 't@t');
      write('CHANGELOG.md', '# Changelog\n\n## 4.90.2 - Old (2026-10-23, PR #1)\n- old\n');
      write('package.json', '{\n  "name": "x",\n  "version": "4.90.2"\n}\n');
      write('changes/README.md', '# fragments\n');
      write('changes/feature-demojob.md', '# Co-op four\nkind: patch\n- four (#317)\n');
      write('docs/demojob/PLAN.md', '# plan\n[bible](../design-bible.md)\n');
      write('docs/demojob/STATE.md', '# state\n');
      write('docs/design-bible.md', '# bible\nSee `docs/demojob/PLAN.md` and [state](demojob/STATE.md).\n');
      write('docs/archive/old.md', 'history: docs/demojob/PLAN.md\n');
      git('add', '-A'); git('commit', '-q', '-m', 'train head');
      const head = git('rev-parse', 'HEAD');
      const v = versionTreeCommit({
        head, cwd: dir, subject: (ver: string) => `${ver}: version at merge, train 90 (G183)`,
        release: (assembled: unknown) => deriveRelease({ version: '4.90.3', title: 'Co-op four', baseVersion: '4.90.2',
          planned: ['feature/demojob'], merged: ['feature/demojob'], assembled }),
        opts: (version: string, t: string) => ({ version, title: `Train 90: ${t}`, date: '2026-10-25', pr: 500, members: [317] }),
        archive: ['demojob', 'missing'], archiveDate: '2026-10-25',
      });
      expect(v.archived).toEqual([{ job: 'demojob', from: 'docs/demojob', to: 'docs/archive/demojob', files: 2, rewritten: ['docs/design-bible.md'] }]);
      expect(git('ls-tree', '-r', '--name-only', v.sha, 'docs/').split('\n')).toEqual([
        'docs/archive/demojob/PLAN.md', 'docs/archive/demojob/STATE.md', 'docs/archive/old.md', 'docs/design-bible.md']);
      expect(git('show', `${v.sha}:docs/design-bible.md`)).toBe('# bible\nSee `docs/archive/demojob/PLAN.md` and [state](archive/demojob/STATE.md).');
      expect(git('show', `${v.sha}:docs/archive/demojob/PLAN.md`)).toBe('# plan\n[bible](../../design-bible.md)');
      expect(git('show', `${v.sha}:docs/archive/old.md`)).toBe('history: docs/demojob/PLAN.md');
      expect(git('rev-parse', 'HEAD')).toBe(head);
      expect(git('status', '--porcelain')).toBe('');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }, 60_000);
});

describe('archiveInWorktree (merge-train single, real git repo)', () => {
  it('moves the folder with git mv and rewrites the links on disk', async () => {
    // @ts-expect-error plain .mjs script without types
    const { archiveInWorktree } = await import('../scripts/job-archive.mjs');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-arch-wt-'));
    const git = (...a: string[]): string => execFileSync('git', ['-c', 'core.autocrlf=false', ...a], { cwd: dir, encoding: 'utf8' }).trim();
    const write = (f: string, t: string): void => {
      fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
      fs.writeFileSync(path.join(dir, f), t);
    };
    try {
      git('init', '-q', '-b', 'master');
      git('config', 'user.name', 't'); git('config', 'user.email', 't@t');
      write('docs/demojob/PLAN.md', '# plan\n[bible](../design-bible.md)\n');
      write('docs/demojob/STATE.md', '# state\n');
      write('docs/design-bible.md', 'See `docs/demojob/PLAN.md`.\n');
      write('README.md', '[s](docs/demojob/STATE.md)\n');
      write('CHANGELOG.md', 'docs/demojob/PLAN.md\n');
      git('add', '-A'); git('commit', '-q', '-m', 'head');
      const done = archiveInWorktree({ root: dir, jobs: ['demojob', 'none'], date: '2026-10-25' });
      expect(done).toEqual([{ job: 'demojob', from: 'docs/demojob', to: 'docs/archive/demojob', files: 2, rewritten: ['README.md', 'docs/design-bible.md'] }]);
      git('add', '-A', 'docs/archive/demojob', 'README.md', 'docs/design-bible.md');
      expect(git('diff', '--cached', '--no-renames', '--name-status').split('\n').sort()).toEqual([
        'A\tdocs/archive/demojob/PLAN.md', 'A\tdocs/archive/demojob/STATE.md', 'D\tdocs/demojob/PLAN.md', 'D\tdocs/demojob/STATE.md',
        'M\tREADME.md', 'M\tdocs/design-bible.md']);
      expect(git('status', '--porcelain', '--untracked-files=all')).not.toMatch(/^\?\?/m);
      expect(fs.readFileSync(path.join(dir, 'docs/archive/demojob/PLAN.md'), 'utf8')).toBe('# plan\n[bible](../../design-bible.md)\n');
      expect(fs.readFileSync(path.join(dir, 'README.md'), 'utf8')).toBe('[s](docs/archive/demojob/STATE.md)\n');
      expect(fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8')).toBe('docs/demojob/PLAN.md\n');
      expect(archiveInWorktree({ root: dir, jobs: ['nothing'], date: 'd' })).toEqual([]);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }, 60_000);
});

describe('jobs that code, tests or config read are never archived', () => {
  it('keeps data folders out of Job-done', () => {
    expect(jobDoneJobs('Job-done: kestrel\nJob-done: level-validator\nJob-done: mocap-trial')).toEqual([]);
  });
  it('counts only non-markdown files outside the folder as readers', async () => {
    // @ts-expect-error plain .mjs script without types
    const { codeReaders } = await import('../scripts/job-archive.mjs');
    expect(codeReaders('demojob', ['docs/demojob/data.json', 'docs/design-bible.md', 'src/x.ts', 'tests/y.test.ts', 'src/x.ts', 'vite.config.ts']))
      .toEqual(['src/x.ts', 'tests/y.test.ts', 'vite.config.ts']);
  });
  it('skips the job in both the version commit (build) and the worktree (single)', async () => {
    // @ts-expect-error plain .mjs script without types
    const { archiveInWorktree, grepReaders } = await import('../scripts/job-archive.mjs');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-arch-read-'));
    const git = (...a: string[]): string => execFileSync('git', ['-c', 'core.autocrlf=false', ...a], { cwd: dir, encoding: 'utf8' }).trim();
    const write = (f: string, t: string): void => {
      fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
      fs.writeFileSync(path.join(dir, f), t);
    };
    try {
      git('init', '-q', '-b', 'master');
      git('config', 'user.name', 't'); git('config', 'user.email', 't@t');
      write('CHANGELOG.md', '# Changelog\n\n## 4.90.2 - Old (2026-10-23, PR #1)\n- old\n');
      write('package.json', '{\n  "name": "x",\n  "version": "4.90.2"\n}\n');
      write('changes/README.md', '# fragments\n');
      write('changes/feature-x.md', '# X\nkind: patch\n- x (#1)\n');
      write('docs/readjob/data.json', '{}\n');
      write('docs/readjob/PLAN.md', '# plan\n');
      write('docs/freejob/PLAN.md', '# plan\n');
      write('docs/design-bible.md', 'See docs/readjob/PLAN.md and docs/freejob/PLAN.md.\n');
      write('src/load.ts', "export const p = 'docs/readjob/data.json';\n");
      git('add', '-A'); git('commit', '-q', '-m', 'head');
      const head = git('rev-parse', 'HEAD');
      expect(grepReaders('readjob', { cwd: dir, rev: head })).toEqual(['src/load.ts']);
      expect(grepReaders('freejob', { cwd: dir, rev: head })).toEqual([]);
      const v = versionTreeCommit({
        head, cwd: dir, subject: (ver: string) => `${ver}: version at merge, train 91 (G183)`,
        release: (assembled: unknown) => deriveRelease({ version: '4.90.3', title: 'X', baseVersion: '4.90.2',
          planned: ['feature/x'], merged: ['feature/x'], assembled }),
        opts: (version: string, t: string) => ({ version, title: `Train 91: ${t}`, date: '2026-10-25', pr: 501, members: [1] }),
        archive: ['readjob', 'freejob'], archiveDate: '2026-10-25',
      });
      expect(v.archived.map((a: { job: string }) => a.job)).toEqual(['freejob']);
      expect(git('ls-tree', '-r', '--name-only', v.sha, 'docs/').split('\n')).toEqual([
        'docs/archive/freejob/PLAN.md', 'docs/design-bible.md', 'docs/readjob/PLAN.md', 'docs/readjob/data.json']);
      const done = archiveInWorktree({ root: dir, jobs: ['readjob'], date: '2026-10-25' });
      expect(done).toEqual([]);
      expect(git('status', '--porcelain')).toBe('');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }, 60_000);
});
