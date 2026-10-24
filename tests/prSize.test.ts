import { describe, expect, it } from 'vitest';
import {
  BIG_PR_LABEL, PR_SIZE_CAP, countLines, formatReport, isDoc, isExcluded, isTrainBranch, parseArgs, parseNumstat, parseNumstatZ, verdict,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/pr-size.mjs';
// @ts-expect-error plain .mjs helper without types
import { globToRegExp, globsOverlap, segmentsOverlap, expandBraces } from '../scripts/glob-match.mjs';

type Entry = { file: string; added: number; deleted: number; binary: boolean };
const e = (file: string, added: number, deleted = 0, binary = false): Entry => ({ file, added, deleted, binary });

describe('pr-size: globs', () => {
  it('matches * inside a segment, ** across segments, braces as alternatives', () => {
    expect(globToRegExp('src/*.ts').test('src/a.ts')).toBe(true);
    expect(globToRegExp('src/*.ts').test('src/x/a.ts')).toBe(false);
    expect(globToRegExp('src/**/*.ts').test('src/a.ts')).toBe(true);
    expect(globToRegExp('src/**/*.ts').test('src/x/y/a.ts')).toBe(true);
    expect(globToRegExp('docs/**').test('docs/a/b.md')).toBe(true);
    expect(globToRegExp('**/*.{png,glb}').test('public/m/x.glb')).toBe(true);
    expect(globToRegExp('**/*.{png,glb}').test('x.png')).toBe(true);
    expect(globToRegExp('a?.ts').test('ab.ts')).toBe(true);
    expect(globToRegExp('src/a.ts').test('src/aXts')).toBe(false);
    expect(expandBraces('a/{b,c{d,e}}/f')).toEqual(['a/b/f', 'a/cd/f', 'a/ce/f']);
  });

  it('tells whether two globs can match one path', () => {
    expect(globsOverlap('src/world/**', 'src/world/maps/campus.ts')).toBe(true);
    expect(globsOverlap('src/world/maps/*.ts', 'src/world/**/campus*.ts')).toBe(true);
    expect(globsOverlap('src/a/*', 'src/b/*')).toBe(false);
    expect(globsOverlap('src/*.ts', 'src/x/*.ts')).toBe(false);
    expect(globsOverlap('tests/campus*.test.ts', 'tests/*Board.test.ts')).toBe(true);
    expect(globsOverlap('tests/campus*.test.ts', 'tests/sector*.test.ts')).toBe(false);
    expect(globsOverlap('**', 'anything/at/all.ts')).toBe(true);
    expect(globsOverlap('src/{net,ai}/**', 'src/net/protocol.ts')).toBe(true);
    expect(segmentsOverlap('a*c', '*b*')).toBe(true);
    expect(segmentsOverlap('a*', 'b*')).toBe(false);
  });
});

describe('pr-size: what counts', () => {
  it('excludes docs, lockfiles, snapshots and generated assets; counts code and tests', () => {
    for (const f of ['docs/x/PLAN.md', 'README.md', 'changes/feature-x.md', 'package-lock.json', 'tests/__snapshots__/a.snap',
      'public/icons/icon.png', 'src/operators/assets/guard.glb', 'src/gen/generated/table.ts', 'src/a.generated.json', 'scripts/e2e-times.json']) {
      expect(isExcluded(f), f).toBe(true);
    }
    for (const f of ['src/world/maps/campus.ts', 'tests/campus.test.ts', 'scripts/pr-size.mjs', 'src/config/missions.json', '.github/workflows/deploy.yml']) {
      expect(isExcluded(f), f).toBe(false);
    }
    expect(isDoc('docs/a.png')).toBe(true);
    expect(isDoc('package-lock.json')).toBe(false);
  });

  it('sums added + deleted of counted files; binaries never count', () => {
    const c = countLines([e('src/a.ts', 100, 20), e('tests/a.test.ts', 50), e('docs/a.md', 900), e('package-lock.json', 4000, 3000), e('src/m.bin', 0, 0, true)]);
    expect(c.counted).toBe(170);
    expect(c.excluded).toBe(7900);
    expect(c.files).toBe(5);
    expect(c.countedFiles.map((f: { file: string }) => f.file)).toEqual(['src/a.ts', 'tests/a.test.ts']);
  });

  it('parses numstat -z, renames under the new path, binaries as 0', () => {
    const z = '10\t2\tsrc/a.ts\0-\t-\tpublic/x.png\0' + '3\t1\t\0src/old.ts\0src/new.ts\0';
    expect(parseNumstatZ(z)).toEqual([
      { file: 'src/a.ts', added: 10, deleted: 2, binary: false },
      { file: 'public/x.png', added: 0, deleted: 0, binary: true },
      { file: 'src/new.ts', from: 'src/old.ts', added: 3, deleted: 1, binary: false },
    ]);
  });

  it('parses plain numstat with both rename spellings', () => {
    expect(parseNumstat('5\t1\tsrc/{old => new}/a.ts\n2\t0\told.ts => new.ts\n-\t-\tx.png\n')).toEqual([
      { file: 'src/new/a.ts', added: 5, deleted: 1, binary: false },
      { file: 'new.ts', added: 2, deleted: 0, binary: false },
      { file: 'x.png', added: 0, deleted: 0, binary: true },
    ]);
  });
});

describe('pr-size: verdict', () => {
  const big = [e('src/a.ts', 1200), e('tests/a.test.ts', 400)];

  it('passes at the cap and fails one line over', () => {
    expect(PR_SIZE_CAP).toBe(1500);
    expect(verdict({ branch: 'feature/x', entries: [e('src/a.ts', 1500)] }).ok).toBe(true);
    const v = verdict({ branch: 'feature/x', entries: [e('src/a.ts', 1000, 501)] });
    expect(v.ok).toBe(false);
    expect(v.counted).toBe(1501);
    expect(v.reason).toContain(BIG_PR_LABEL);
  });

  it('passes an over-cap PR only with the big-pr label', () => {
    expect(verdict({ branch: 'feature/x', entries: big, labels: ['train-ready'] }).ok).toBe(false);
    const v = verdict({ branch: 'feature/x', entries: big, labels: ['train-ready', 'big-pr'] });
    expect(v.ok).toBe(true);
    expect(v.labelled).toBe(true);
    expect(v.exempt).toBe(null);
  });

  it('exempts train PRs and docs-only PRs', () => {
    expect(isTrainBranch('train/64')).toBe(true);
    expect(isTrainBranch('origin/train/64')).toBe(true);
    expect(isTrainBranch('feature/train-lock-wait')).toBe(false);
    expect(verdict({ branch: 'train/64', entries: big })).toMatchObject({ ok: true, exempt: 'train' });
    expect(verdict({ branch: 'feature/x', entries: [e('docs/x/PLAN.md', 5000), e('changes/feature-x.md', 4)] })).toMatchObject({ ok: true, exempt: 'docs' });
    expect(verdict({ branch: 'feature/x', entries: [e('docs/x/PLAN.md', 5000), e('package-lock.json', 3)] }).exempt).toBe(null);
  });

  it('does not count excluded lines toward the cap', () => {
    const v = verdict({ branch: 'feature/x', entries: [e('src/a.ts', 900), e('docs/a.md', 3000), e('package-lock.json', 9000), e('public/a.svg', 2000)] });
    expect(v).toMatchObject({ ok: true, counted: 900, excluded: 14000 });
  });

  it('reports the largest counted files when failing', () => {
    const text = formatReport(verdict({ branch: 'feature/x', entries: big }));
    expect(text).toMatch(/^pr-size: FAIL/);
    expect(text).toContain('src/a.ts');
  });

  it('reads its arguments', () => {
    expect(parseArgs(['--base', 'origin/master', '--branch', 'feature/x', '--pr', '#12', '--labels', 'a, big-pr'])).toMatchObject({
      base: 'origin/master', head: 'HEAD', branch: 'feature/x', pr: '12', labels: ['a', 'big-pr'], cap: 1500,
    });
    expect(() => parseArgs(['--cap', '0'])).toThrow();
    expect(() => parseArgs(['--nope'])).toThrow();
  });
});
