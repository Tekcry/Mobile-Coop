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
    const body = 'Summary\n\nJob-done: coop4\n- Job-done: `sector-redesign`\njob-done: coop4\nnot Job-done: x y\n';
    expect(jobDoneJobs(body)).toEqual(['coop4', 'sector-redesign']);
  });
  it('ignores non-job folders and path tricks', () => {
    expect(jobDoneJobs('Job-done: archive\nJob-done: systems\nJob-done: ../x\nJob-done: a/b')).toEqual([]);
    expect(jobDoneJobs(null)).toEqual([]);
  });
});

describe('archive moves', () => {
  const files = ['docs/coop4/BRIEF.md', 'docs/coop4/slices/S1.md', 'docs/coop4-x/PLAN.md'];
  it('moves docs/<job>/ under docs/archive/<job>/', () => {
    const p: Plan = archiveMoves('coop4', files, () => false, '2026-10-25');
    expect(p.to).toBe('docs/archive/coop4');
    expect(p.moves).toEqual([
      { from: 'docs/coop4/BRIEF.md', to: 'docs/archive/coop4/BRIEF.md' },
      { from: 'docs/coop4/slices/S1.md', to: 'docs/archive/coop4/slices/S1.md' },
    ]);
  });
  it('adds the date when the archive name is taken, then a counter', () => {
    const taken = new Set(['docs/archive/coop4', 'docs/archive/coop4-2026-10-25']);
    expect(archiveMoves('coop4', files, (t: string) => taken.has(t), '2026-10-25').to).toBe('docs/archive/coop4-2026-10-25-2');
  });
  it('returns null for a job with no docs', () => {
    expect(archiveMoves('none', files, () => false, 'd')).toBeNull();
  });
});

describe('link rewrite', () => {
  const plans: Plan[] = [archiveMoves('coop4', ['docs/coop4/PLAN.md', 'docs/coop4/STATE.md'], () => false, 'd')];
  it('maps paths through the moves', () => {
    expect(movedPath('docs/coop4/PLAN.md', plans)).toBe('docs/archive/coop4/PLAN.md');
    expect(movedPath('docs/coop4-x/PLAN.md', plans)).toBe('docs/coop4-x/PLAN.md');
  });
  it('fixes links and repo paths into the moved folder from other docs', () => {
    const text = 'See [plan](../coop4/PLAN.md#s1), `docs/coop4/STATE.md`, docs/coop4/ and `docs/coop4-x/PLAN.md` [web](https://x/docs/coop4/a).';
    expect(rewriteArchiveLinks(text, 'docs/systems/coop.md', plans)).toBe(
      'See [plan](../archive/coop4/PLAN.md#s1), `docs/archive/coop4/STATE.md`, docs/archive/coop4/ and `docs/coop4-x/PLAN.md` [web](https://x/docs/coop4/a).');
    expect(rewriteArchiveLinks('[p](docs/coop4/PLAN.md)', 'README.md', plans)).toBe('[p](docs/archive/coop4/PLAN.md)');
  });
  it('keeps links out of and inside a moved file working', () => {
    const text = '[bible](../design-bible.md) [state](STATE.md) [ai](../systems/ai.md#x)';
    expect(rewriteArchiveLinks(text, 'docs/coop4/PLAN.md', plans)).toBe(
      '[bible](../../design-bible.md) [state](STATE.md) [ai](../../systems/ai.md#x)');
  });
  it('leaves unrelated text alone', () => {
    const text = 'Nothing [x](../coop4-x/PLAN.md) here.';
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
      write('changes/feature-coop4.md', '# Co-op four\nkind: patch\n- four (#317)\n');
      write('docs/coop4/PLAN.md', '# plan\n[bible](../design-bible.md)\n');
      write('docs/coop4/STATE.md', '# state\n');
      write('docs/design-bible.md', '# bible\nSee `docs/coop4/PLAN.md` and [state](coop4/STATE.md).\n');
      write('docs/archive/old.md', 'history: docs/coop4/PLAN.md\n');
      git('add', '-A'); git('commit', '-q', '-m', 'train head');
      const head = git('rev-parse', 'HEAD');
      const v = versionTreeCommit({
        head, cwd: dir, subject: (ver: string) => `${ver}: version at merge, train 90 (G183)`,
        release: (assembled: unknown) => deriveRelease({ version: '4.90.3', title: 'Co-op four', baseVersion: '4.90.2',
          planned: ['feature/coop4'], merged: ['feature/coop4'], assembled }),
        opts: (version: string, t: string) => ({ version, title: `Train 90: ${t}`, date: '2026-10-25', pr: 500, members: [317] }),
        archive: ['coop4', 'missing'], archiveDate: '2026-10-25',
      });
      expect(v.archived).toEqual([{ job: 'coop4', from: 'docs/coop4', to: 'docs/archive/coop4', files: 2, rewritten: ['docs/design-bible.md'] }]);
      expect(git('ls-tree', '-r', '--name-only', v.sha, 'docs/').split('\n')).toEqual([
        'docs/archive/coop4/PLAN.md', 'docs/archive/coop4/STATE.md', 'docs/archive/old.md', 'docs/design-bible.md']);
      expect(git('show', `${v.sha}:docs/design-bible.md`)).toBe('# bible\nSee `docs/archive/coop4/PLAN.md` and [state](archive/coop4/STATE.md).');
      expect(git('show', `${v.sha}:docs/archive/coop4/PLAN.md`)).toBe('# plan\n[bible](../../design-bible.md)');
      expect(git('show', `${v.sha}:docs/archive/old.md`)).toBe('history: docs/coop4/PLAN.md');
      expect(git('rev-parse', 'HEAD')).toBe(head);
      expect(git('status', '--porcelain')).toBe('');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }, 60_000);
});
