import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs process script without types
import { parseFragment } from '../scripts/changelog-assemble.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  bumpProtocol, classifyConflicts, closeComment, cmpVersion, findTrainVersionCommit, headPinCheck, heldByParent, mergeCmd, trainLockPath, versionRace,
  findVersionCommit, keepStopMessage, killTreeCmd,
  wireCandidates, membersFromLog, parseArgs, protocolValue,
  resolveKeepBoth, resumeCheck, touchesWire, trainPrBody, trainPrTitle, versionSubject, wirePaths,
  hasTrainMember, hasFragment, syntheticFragment, fragmentPlan, clearBuildMarker,
  baseMarker, parseBaseMarker, withBaseMarker, trainVersionCommits, foreignVersionStop, onBaseCheck, stackedDecision,
  mergeRetryable, retryMerge, mergedTree, treeOf,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/merge-train.mjs';

describe('merge-train', () => {
  it('classifies conflicts: CHANGELOG.md and changes/* resolvable, everything else blocking', () => {
    expect(classifyConflicts(['CHANGELOG.md', 'changes/feature-a.md', 'src/game/x.ts', 'package.json', 'docs/CHANGELOG.md'])).toEqual({
      resolvable: ['CHANGELOG.md', 'changes/feature-a.md'], blocking: ['src/game/x.ts', 'package.json', 'docs/CHANGELOG.md'],
    });
    expect(classifyConflicts(['CHANGELOG.md']).blocking).toEqual([]);
  });

  it('resolves a CHANGELOG conflict keeping both blocks, incoming first, a blank line between', () => {
    const text = ['# Changelog', '', '<<<<<<< ours', '## Unreleased - a', '- a1', '', '=======', '## Unreleased - b', '- b1',
      '>>>>>>> theirs', '## 4.55.1 - Old (2026-10-22, PR #124)', '- old', ''].join('\n');
    expect(resolveKeepBoth(text)).toBe(['# Changelog', '', '## Unreleased - b', '- b1', '', '## Unreleased - a', '- a1', '',
      '## 4.55.1 - Old (2026-10-22, PR #124)', '- old', ''].join('\n'));
  });

  it('drops a diff3 base and keeps a released block from master below the unreleased one', () => {
    const text = ['# Changelog', '', '<<<<<<< train', '## Unreleased - a', '- a1', '||||||| base', '=======',
      '## 4.55.2 - Fix (2026-10-23, PR #131)', '- fix', '>>>>>>> master', '', '## 4.55.1 - Old', '- old'].join('\n');
    expect(resolveKeepBoth(text)).toBe(['# Changelog', '', '## Unreleased - a', '- a1', '', '## 4.55.2 - Fix (2026-10-23, PR #131)',
      '- fix', '', '## 4.55.1 - Old', '- old'].join('\n'));
  });

  it('never drops a block when one side is empty', () => {
    const text = ['<<<<<<< ours', '=======', '- only theirs', '>>>>>>> theirs', 'tail'].join('\n');
    expect(resolveKeepBoth(text)).toBe(['- only theirs', '', 'tail'].join('\n'));
  });

  it('formats the train PR title and body', () => {
    expect(trainPrTitle(5, '4.56.0', 'lamps, wheel')).toBe('4.56.0: Train 5: lamps, wheel');
    const body = trainPrBody(5, 'lamps', [{ branch: 'feature/a', pr: 125 }, { branch: 'fix/b', pr: null }]);
    expect(body).toContain('- #125 `feature/a`');
    expect(body).toContain('- (no open PR) `fix/b`');
    expect(body.split('\n').pop()).toBe('🤖 Generated with [Claude Code](https://claude.com/claude-code)');
  });

  it('synthesises a patch fragment for a member without one, in the changes/README.md format', () => {
    const f = syntheticFragment('test/e2e-flake', 'Fix a flaky e2e wait', 322);
    expect(f.file).toBe('changes/test-e2e-flake.md');
    expect(f.text.split('\n').slice(0, 3)).toEqual(['# Fix a flaky e2e wait', 'kind: patch', '- Fix a flaky e2e wait (#322)']);
    expect(parseFragment(f.text, f.file)).toMatchObject({ title: 'Fix a flaky e2e wait', kind: 'patch', body: ['- Fix a flaky e2e wait (#322)'] });
  });

  it('sees a fragment among the files a branch adds (README and nested paths do not count)', () => {
    expect(hasFragment(['src/a.ts', 'changes/feature-a.md'])).toBe(true);
    expect(hasFragment(['tests/a.test.ts'])).toBe(false);
    expect(hasFragment(['changes/README.md', 'changes/readme.md', 'changes/sub/x.md', 'changes/x.txt', 'docs/changes/x.md'])).toBe(false);
    expect(hasFragment([])).toBe(false);
  });

  it('plans fragments only for open-PR members whose branch adds none, skipping a branch with no merge base', () => {
    const members = [{ branch: 'test/flake', pr: 322 }, { branch: 'feature/a', pr: 125 }, { branch: 'fix/b', pr: null }, { branch: 'gone/c', pr: 9 }];
    const added: Record<string, string[] | null> = { 'test/flake': [], 'feature/a': ['changes/feature-a.md'], 'fix/b': [], 'gone/c': null };
    const asked: number[] = [];
    const plan = fragmentPlan(members, (b: string) => added[b], (pr: number) => { asked.push(pr); return `Title ${pr}`; });
    expect(plan.notes).toEqual(['fragment synthesised for #322']);
    expect(plan.frags).toEqual([{ pr: 322, ...syntheticFragment('test/flake', 'Title 322', 322) }]);
    expect(asked).toEqual([322]);
  });

  it('throws from the fragment plan when a title lookup fails (before anything could be written)', () => {
    expect(() => fragmentPlan([{ branch: 'test/x', pr: 1 }], () => [], () => { throw new Error('gh down'); })).toThrow('gh down');
  });

  it('puts the build notes in the train PR body, above the footer', () => {
    const body = trainPrBody(57, 'tests', [{ branch: 'test/x', pr: 322 }], ['fragment synthesised for #322']);
    expect(body).toContain('fragment synthesised for #322');
    expect(trainPrBody(57, 'tests', [{ branch: 'test/x', pr: 322 }])).not.toContain('synthesised');
    expect(body.split('\n').pop()).toBe('🤖 Generated with [Claude Code](https://claude.com/claude-code)');
  });

  it('reads train members from the merge subjects, oldest first, master excluded', () => {
    expect(membersFromLog(['Merge origin/feature/a into train/5', 'Merge origin/master into train/5', 'Merge origin/fix/b into train/5',
      'something else'])).toEqual(['feature/a', 'fix/b']);
  });
});

describe('merge-train version commit and resume', () => {
  const sub = versionSubject(31, '4.80.0');

  it('formats the version commit subject', () => {
    expect(sub).toBe('4.80.0: version at merge, train 31 (G183)');
  });

  it('finds the version commit in first-parent subjects, newest first', () => {
    expect(findVersionCommit([sub, 'Merge origin/feature/a into train/31'], 31, '4.80.0')).toBe(0);
    expect(findVersionCommit(['fix test', sub, 'Merge origin/feature/a into train/31'], 31, '4.80.0')).toBe(1);
  });

  it('does not find an absent, other-train or other-version commit', () => {
    expect(findVersionCommit(['Merge origin/feature/a into train/31'], 31, '4.80.0')).toBe(-1);
    expect(findVersionCommit([], 31, '4.80.0')).toBe(-1);
    expect(findVersionCommit([sub], 32, '4.80.0')).toBe(-1);
    expect(findVersionCommit([sub], 31, '4.80.1')).toBe(-1);
    expect(findVersionCommit(['4.80.0: version at merge (G183)'], 31, '4.80.0')).toBe(-1);
  });

  it('resumeCheck: the head is the version commit, with or without --resume', () => {
    expect(resumeCheck([sub, 'm'], 0, false)).toEqual({ ok: true, after: [], message: '' });
    expect(resumeCheck([sub, 'm'], 0, true).ok).toBe(true);
  });

  it('resumeCheck: fix commits after the version commit need --resume', () => {
    const subjects = ['fix lint', 'fix test', sub, 'm'];
    const no = resumeCheck(subjects, 2, false);
    expect(no.ok).toBe(false);
    expect(no.after).toEqual(['fix lint', 'fix test']);
    expect(no.message).toContain('--resume');
    const yes = resumeCheck(subjects, 2, true);
    expect(yes.ok).toBe(true);
    expect(yes.message).toBe('resume: 2 commit(s) after the version commit: fix lint | fix test');
    expect(resumeCheck(subjects, -1, true).ok).toBe(false);
  });
});

describe('merge-train --keep, wrong version and member PRs', () => {
  it('findTrainVersionCommit: any version of this train, newest first', () => {
    const subjects = ['fix', versionSubject(31, '4.80.0'), 'Merge origin/feature/a into train/31'];
    expect(findTrainVersionCommit(subjects, 31)).toEqual({ idx: 1, version: '4.80.0' });
    expect(findTrainVersionCommit(subjects, 3)).toEqual({ idx: -1, version: null });
    expect(findTrainVersionCommit(['4.80.0: version at merge (G183)'], 31).idx).toBe(-1);
  });

  it('keepStopMessage: the pre-version sha and the exact commands', () => {
    const msg: string = keepStopMessage({ n: 31, version: '4.80.0', title: 'Lamps, wheel', versionSha: 'abcdef1234567890',
      pre: '1234567890abcdef', members: ['feature/a', 'fix/b'] });
    expect(msg).toContain('git checkout -B train/31 1234567890abcdef');
    expect(msg).toContain('-m "Merge origin/<b> into train/31"');
    expect(msg).toContain('git push --force origin train/31');
    expect(msg).toContain('node scripts/merge-train.mjs build 31 4.80.0 "Lamps, wheel" feature/a fix/b <b> --keep');
    expect(msg).toContain('abcdef12^');
    expect(msg).not.toContain('without --keep');
    expect(msg).not.toContain('cherry-pick');
    expect(keepStopMessage({ n: 31, version: '4.80.0', title: 't', versionSha: 'abcdef12', pre: 'p', members: [], after: 2 })).toContain('2 commit(s)');
  });

  it('wireCandidates: command-line branches plus every train member, once each', () => {
    expect(wireCandidates(['feature/c'], [{ branch: 'feature/a', pr: 1 }, { branch: 'feature/c', pr: 3 }, { branch: 'fix/b', pr: null }]))
      .toEqual(['feature/c', 'feature/a', 'fix/b']);
    expect(wireCandidates([], [])).toEqual([]);
  });

  it('closeComment and the Windows tree kill', () => {
    expect(closeComment('4.80.0', 31, 250)).toBe('Merged in 4.80.0 (train 31, #250)');
    expect(killTreeCmd(1234, 'win32')).toEqual(['taskkill', '/T', '/F', '/PID', '1234']);
    expect(killTreeCmd(1234, 'linux')).toBeNull();
  });
});

describe('merge-train wire bump', () => {
  const protocolTs = fs.readFileSync(path.join(__dirname, '..', 'src/net/protocol.ts'), 'utf8');

  it('wirePaths: src/net plus the relative imports of the real protocol.ts', () => {
    const paths: string[] = wirePaths(protocolTs);
    expect(paths[0]).toBe('src/net/');
    expect(paths).toContain('src/world/mapDef.ts');
    expect(paths).toContain('src/player/moveState.ts');
    expect(paths).toContain('src/game/course/courseWire.ts');
    expect(paths).toContain('src/ai/archetypes.ts');
    expect(paths).not.toContain('src/net/lampSync.ts');
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('wirePaths maps only ../ imports', () => {
    expect(wirePaths("import { a } from '../x/y';\nimport { b } from './z';\nimport type { C } from '../q/r/s';")).toEqual([
      'src/net/', 'src/x/y.ts', 'src/q/r/s.ts']);
  });

  it('touchesWire: folder prefix and exact files', () => {
    const paths = ['src/net/', 'src/world/mapDef.ts'];
    expect(touchesWire(['docs/a.md', 'src/net/session.ts'], paths)).toBe(true);
    expect(touchesWire(['src/world/mapDef.ts'], paths)).toBe(true);
    expect(touchesWire(['src/world/mapDef.test.ts', 'src/network.ts', 'src/world/other.ts'], paths)).toBe(false);
  });

  it('bumpProtocol: always master + 1', () => {
    const text = (v: number): string => `const a = 1;\nexport const PROTOCOL_VERSION = ${v};\nconst b = 2;\n`;
    expect(bumpProtocol(text(40), 40)).toBe(text(41));
    expect(bumpProtocol(text(41), 41)).toBe(text(42));
    expect(bumpProtocol(text(41), 40)).toBe(text(41));
    expect(bumpProtocol(text(39), 40)).toBe(text(41));
    expect(protocolValue(text(43))).toBe(43);
  });

  it('bumpProtocol throws when the line is missing', () => {
    expect(() => bumpProtocol('const PROTOCOL_VERSION = 40;', 40)).toThrow(/PROTOCOL_VERSION/);
    expect(() => protocolValue('')).toThrow(/PROTOCOL_VERSION/);
  });

  it('bumpProtocol reads and rewrites the real protocol.ts', () => {
    const v: number = protocolValue(protocolTs);
    expect(Number.isInteger(v)).toBe(true);
    expect(protocolValue(bumpProtocol(protocolTs, v))).toBe(v + 1);
  });
});

describe('merge-train parseArgs', () => {
  it('build: number, version, title, branches, flags', () => {
    expect(parseArgs(['build', '31', '4.80.0', 'Lamps', 'feature/a', 'fix/b'])).toEqual({
      cmd: 'build', n: '31', version: '4.80.0', title: 'Lamps', branches: ['feature/a', 'fix/b'], keep: false, noTest: false, on: null, dry: false });
    const f = parseArgs(['build', '31', '4.80.0', 'Lamps', '--keep', 'feature/a', '--no-test', '--dry-run']);
    expect([f.keep, f.noTest, f.dry, f.branches]).toEqual([true, true, true, ['feature/a']]);
  });

  it('build: rejects the old form, a missing branch, a bad version, --resume', () => {
    expect(() => parseArgs(['build', '31', 'feature/a', 'feature/b', 'feature/c'])).toThrow(/version must be X.Y.Z/);
    expect(() => parseArgs(['build', '31', '4.80.0', 'Lamps'])).toThrow(/at least one branch/);
    expect(() => parseArgs(['build', 'x', '4.80.0', 'Lamps', 'a'])).toThrow(/train number/);
    expect(() => parseArgs(['build', '31', '4.80.0', 'Lamps', 'a', '--resume'])).toThrow(/--resume/);
  });

  it('release: number, version, title, --resume, --dry-run', () => {
    expect(parseArgs(['release', '31', '4.80.0', 'Lamps'])).toEqual({
      cmd: 'release', n: '31', version: '4.80.0', title: 'Lamps', resume: false, head: null, noFallback: false, dry: false });
    const r = parseArgs(['release', '31', '4.80.0', 'Lamps', '--resume', '--dry-run']);
    expect([r.resume, r.dry]).toEqual([true, true]);
    expect(parseArgs(['--resume', 'release', '31', '4.80.0', 'Lamps']).resume).toBe(true);
  });

  it('release: --head <sha> and --no-fallback', () => {
    const sha = 'ABCDEF0123456789abcdef0123456789abcdef01';
    const r = parseArgs(['release', '31', '4.80.0', 'Lamps', '--head', sha, '--no-fallback', '--resume']);
    expect([r.head, r.noFallback, r.resume, r.title]).toEqual([sha.toLowerCase(), true, true, 'Lamps']);
    expect(parseArgs(['release', '--head', 'abc1234', '31', '4.80.0', 'Lamps']).head).toBe('abc1234');
    expect(() => parseArgs(['release', '31', '4.80.0', 'Lamps', '--head'])).toThrow(/--head needs a commit sha/);
    expect(() => parseArgs(['release', '31', '4.80.0', 'Lamps', '--head', 'Lamps2'])).toThrow(/--head needs a commit sha/);
    expect(() => parseArgs(['build', '31', '4.80.0', 'Lamps', 'a', '--head', 'abc1234'])).toThrow(/--head does not apply/);
    expect(() => parseArgs(['single', 'a', '4.80.1', 'Fix', '--no-fallback'])).toThrow(/--no-fallback does not apply/);
  });

  it('release: rejects missing title, extra argument, --keep, --no-test', () => {
    expect(() => parseArgs(['release', '31', '4.80.0'])).toThrow(/release needs/);
    expect(() => parseArgs(['release', '31', '4.80.0', 'Lamps', 'extra'])).toThrow(/unexpected argument/);
    expect(() => parseArgs(['release', '31', '4.80.0', 'Lamps', '--keep'])).toThrow(/--keep/);
    expect(() => parseArgs(['release', '31', '4.80.0', 'Lamps', '--no-test'])).toThrow(/--no-test/);
  });

  it('single: branch, version, title, --dry-run', () => {
    expect(parseArgs(['single', 'feature/a', '4.80.1', 'Fix'])).toEqual({ cmd: 'single', branch: 'feature/a', version: '4.80.1', title: 'Fix', dry: false });
    expect(parseArgs(['single', 'feature/a', '4.80.1', 'Fix', '--dry-run']).dry).toBe(true);
    expect(() => parseArgs(['single', 'feature/a', '4.80.1', 'Fix', '--resume'])).toThrow(/--resume/);
    expect(() => parseArgs(['single', 'feature/a', '4.80.1'])).toThrow(/single needs/);
  });

  it('rejects an unknown command or flag and no command', () => {
    expect(() => parseArgs([])).toThrow(/no command/);
    expect(() => parseArgs(['merge', '1'])).toThrow(/unknown command/);
    expect(() => parseArgs(['release', '31', '4.80.0', 'Lamps', '--force'])).toThrow(/unknown flag/);
    expect(() => parseArgs(['release', '31', '4.80.0', 'Lamps', '--force'])).toThrow(/usage:/);
  });
});

describe('merge-train release pin, version race, train lock', () => {
  const head = '0123456789abcdef0123456789abcdef01234567';

  it('headPinCheck: STOP unless origin/train/<n> is the tested sha (full or short)', () => {
    expect(headPinCheck(head, null, 'train/31')).toBeNull();
    expect(headPinCheck(head, head, 'train/31')).toBeNull();
    expect(headPinCheck(head, '0123456', 'train/31')).toBeNull();
    expect(headPinCheck(head, 'fedcba9876543210', 'train/31')).toMatch(/^STOP: origin\/train\/31 is 01234567, not the tested head fedcba98: nothing merged$/);
  });

  it('mergeCmd always pins the merge with --match-head-commit', () => {
    expect(mergeCmd(244, head)).toEqual(['gh', 'pr', 'merge', '244', '--merge', '--match-head-commit', head]);
    expect(mergeCmd(null, null)).toEqual(['gh', 'pr', 'merge', 'NEW', '--merge', '--match-head-commit', '<tested head>']);
  });

  it('cmpVersion and versionRace: the version must be above master', () => {
    expect(cmpVersion('4.80.0', '4.79.9')).toBe(1);
    expect(cmpVersion('4.80.0', '4.80.0')).toBe(0);
    expect(cmpVersion('4.9.0', '4.10.0')).toBe(-1);
    expect(versionRace('4.81.0', '4.80.0')).toBeNull();
    expect(versionRace('4.80.0', '4.80.0')).toMatch(/STOP: version 4.80.0 is not above master's package.json 4.80.0/);
    expect(versionRace('4.9.0', '4.10.0')).toMatch(/^STOP/);
  });

  it('trainLockPath and heldByParent: the auto-train tick lock, skipped only under the tick that holds it', () => {
    expect(trainLockPath({})).toBe(path.join('C:/NightShift/scratch', 'auto-train.lock'));
    expect(trainLockPath({ AUTO_TRAIN_SCRATCH: 'D:/s' })).toBe(path.join('D:/s', 'auto-train.lock'));
    expect(trainLockPath({ AUTO_TRAIN_LOCK: 'X:/a.lock', AUTO_TRAIN_SCRATCH: 'D:/s' })).toBe('X:/a.lock');
    const t = 'auto-train | pid 5 | 2026-10-23T09:00:00.000Z';
    expect(heldByParent(t, t)).toBe(true);
    expect(heldByParent(`${t}\n`, t)).toBe(true);
    expect(heldByParent(t, '')).toBe(false);
    expect(heldByParent(null, t)).toBe(false);
    expect(heldByParent('merge-train build | pid 7 | x', t)).toBe(false);
  });
});

describe('hasTrainMember', () => {
  it('feature/menu alone is not a train (train 44 #292)', () => {
    expect(hasTrainMember([])).toBe(false);
    expect(hasTrainMember(['feature/menu'])).toBe(false);
    expect(hasTrainMember(['origin/feature/menu'])).toBe(false);
    expect(hasTrainMember(['feature/menu', 'feature/guard-ai-s25'])).toBe(true);
    expect(hasTrainMember(['feature/guard-ai-s25'])).toBe(true);
  });
});

describe('merge-train build ends at the version-commit push (audit 2026-10-24)', () => {
  it('build runs no local vitest and takes no heavy lock; the marker goes right after the version-commit push', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'merge-train.mjs'), 'utf8');
    const body = src.slice(src.indexOf('async function build('), src.indexOf('export function clearBuildMarker'));
    expect(body).not.toMatch(/runVitest|takeHeavyLock|HEAVY_LOCK|npx vitest/);
    const push = body.lastIndexOf("act(['git', 'push', 'origin', branch]);");
    const vc = body.indexOf('versionCommit(');
    expect(vc).toBeGreaterThan(0);
    expect(push).toBeGreaterThan(vc);
    expect(body.indexOf('clearBuildMarker();')).toBeGreaterThan(push);
    expect(body.slice(push, body.indexOf('clearBuildMarker();'))).not.toMatch(/await |run\(|exec\(/);
  });

  it('clearBuildMarker deletes AUTO_TRAIN_BUILD_MARKER and is a no-op without it', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-marker-'));
    try {
      const file = path.join(dir, 'auto-train-building.json');
      fs.writeFileSync(file, '{}');
      clearBuildMarker({});
      expect(fs.existsSync(file)).toBe(true);
      clearBuildMarker({ AUTO_TRAIN_BUILD_MARKER: file });
      expect(fs.existsSync(file)).toBe(false);
      expect(() => clearBuildMarker({ AUTO_TRAIN_BUILD_MARKER: file })).not.toThrow();
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});

describe('merge-train stacked builds (--on, overlapping trains)', () => {
  const base = 'abcdef0123456789abcdef0123456789abcdef01';
  const other = '1111111111111111111111111111111111111111';
  const v64 = versionSubject(64, '4.96.0');
  const v65 = versionSubject(65, '4.97.0');
  // first-parent subjects of origin/master..<train 65 head> while train 64 is unreleased, newest first
  const stackedSubjects = [v65, 'Merge origin/fix/c into train/65', 'Merge origin/feature/b into train/65', v64,
    'Merge origin/feature/a into train/64', 'Merge origin/feature/menu into train/64'];

  it('membersFromLog with n: only the merges into train/<n>, never the base train\'s', () => {
    const oldestFirst = [...stackedSubjects].reverse();
    expect(membersFromLog(oldestFirst, 65)).toEqual(['feature/b', 'fix/c']);
    expect(membersFromLog(oldestFirst, '64')).toEqual(['feature/menu', 'feature/a']);
    expect(membersFromLog(oldestFirst)).toEqual(['feature/menu', 'feature/a', 'feature/b', 'fix/c']);
    expect(membersFromLog(['Merge origin/feature/x into train/650'], 65)).toEqual([]);
  });

  it('parseArgs: build --on <sha>, rejected on release / single, needs a sha', () => {
    const b = parseArgs(['build', '65', '4.97.0', 'Next', 'feature/b', '--on', base.toUpperCase(), '--dry-run']);
    expect([b.on, b.branches, b.dry, b.keep]).toEqual([base, ['feature/b'], true, false]);
    expect(parseArgs(['build', '65', '4.97.0', 'Next', '--on', 'abc1234', 'feature/b', '--keep']).on).toBe('abc1234');
    expect(() => parseArgs(['build', '65', '4.97.0', 'Next', 'feature/b', '--on'])).toThrow(/--on needs a commit sha/);
    expect(() => parseArgs(['build', '65', '4.97.0', 'Next', 'feature/b', '--on', 'train/64'])).toThrow(/--on needs a commit sha/);
    expect(() => parseArgs(['release', '65', '4.97.0', 'Next', '--on', 'abc1234'])).toThrow(/--on does not apply/);
    expect(() => parseArgs(['single', 'feature/b', '4.97.0', 'Next', '--on', 'abc1234'])).toThrow(/--on does not apply/);
  });

  it('the PR body marker: first line of a stacked body, parsed back, replaced or stripped', () => {
    expect(baseMarker(64, base)).toBe(`<!-- auto-train:base train/64 ${base} -->`);
    const body: string = trainPrBody(65, 'Next', [{ branch: 'feature/b', pr: 351 }], [], { train: 64, sha: base, version: '4.96.0' });
    expect(body.split('\n')[0]).toBe(baseMarker(64, base));
    expect(body).toContain('Stacked on train/64 at abcdef01 (4.96.0): released only after train 64 merges.');
    expect(body).toContain('- #351 `feature/b`');
    expect(body.split('\n').pop()).toBe('🤖 Generated with [Claude Code](https://claude.com/claude-code)');
    expect(parseBaseMarker(body)).toEqual({ train: 64, sha: base });
    expect(parseBaseMarker(trainPrBody(65, 'Next', []))).toBeNull();
    expect(trainPrBody(65, 'Next', [])).not.toContain('auto-train:base');
    expect(parseBaseMarker(`x\n<!-- auto-train:base train/64 abcdef01 -->\n`)).toBeNull(); // short sha: not a marker
    expect(parseBaseMarker(null)).toBeNull();
    const moved: string = withBaseMarker(body, { train: 64, sha: other });
    expect(parseBaseMarker(moved)).toEqual({ train: 64, sha: other });
    expect(moved.match(/auto-train:base/g)).toHaveLength(1);
    expect(withBaseMarker(body, null)).not.toContain('auto-train:base');
    expect(withBaseMarker(body, { train: 64, sha: base })).toBe(body);
  });

  it('trainVersionCommits finds every train version commit; an old lone-PR subject is none', () => {
    expect(trainVersionCommits(stackedSubjects)).toEqual([{ idx: 0, n: 65, version: '4.97.0' }, { idx: 3, n: 64, version: '4.96.0' }]);
    expect(trainVersionCommits(['4.80.0: version at merge (G183)', 'Merge origin/a into train/3'])).toEqual([]);
  });

  it('guard (a): another train\'s version commit in origin/master..head is a STOP (exit 4 in release / single)', () => {
    const stop: string | null = foreignVersionStop(stackedSubjects, 65, 'train/65');
    expect(stop).toMatch(/^STOP: base train not merged: origin\/train\/65 carries the version commit of train 64 4\.96\.0/);
    expect(foreignVersionStop(stackedSubjects.slice(0, 3), 65, 'train/65')).toBeNull(); // train 64 merged: out of the range
    expect(foreignVersionStop(['fix', v65, 'Merge origin/feature/b into train/65'], '65', 'train/65')).toBeNull();
    expect(foreignVersionStop([v64], null, 'feature/x')).toMatch(/train 64 4\.96\.0/); // a lone branch: any train is foreign
    expect(foreignVersionStop(['Merge origin/master into feature/x'], null, 'feature/x')).toBeNull();
  });

  it('release checks guard (a) before anything else reads the version commit, also on the single path', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'merge-train.mjs'), 'utf8');
    const rel = src.slice(src.indexOf('async function release('), src.indexOf('function stackedFacts('));
    expect(rel.indexOf('foreignVersionStop(')).toBeGreaterThan(0);
    expect(rel.indexOf('foreignVersionStop(')).toBeLessThan(rel.indexOf('findVersionCommit('));
    expect(rel).toMatch(/if \(foreign\) \{ console\.error\(foreign\); return 4; \}/);
    expect(rel).toMatch(/ciAndMerge\(\{ branch, sha: head, pr, version, stacked \}\)/);
    const single = src.slice(src.indexOf('async function single('), src.indexOf('export const trainLockPath'));
    expect(single.indexOf('foreignVersionStop(')).toBeGreaterThan(0);
    expect(single.indexOf('foreignVersionStop(')).toBeLessThan(single.indexOf('mergeMaster('));
  });

  it('onBaseCheck: the --on sha must be another, lower train head with master and only its own version commit', () => {
    const ok = { n: 65, sha: base, trains: [{ n: 63, sha: other }, { n: 64, sha: base }], masterInBase: true, baseInMaster: false,
      subjects: stackedSubjects.slice(3) };
    expect(onBaseCheck(ok)).toEqual({ m: 64, version: '4.96.0' });
    expect(onBaseCheck({ ...ok, n: '65' })).toEqual({ m: 64, version: '4.96.0' });
    expect(onBaseCheck({ ...ok, trains: [{ n: 64, sha: other }] }).error).toMatch(/not the head of any other origin\/train/);
    expect(onBaseCheck({ ...ok, trains: [{ n: 65, sha: base }] }).error).toMatch(/not the head of any other/);
    expect(onBaseCheck({ ...ok, n: 63, trains: [{ n: 64, sha: base }] }).error).toMatch(/must be below train 63/);
    expect(onBaseCheck({ ...ok, baseInMaster: true }).error).toMatch(/already in origin\/master: build without --on/);
    expect(onBaseCheck({ ...ok, masterInBase: false }).error).toMatch(/origin\/master is not in train\/64/);
    expect(onBaseCheck({ ...ok, subjects: ['Merge origin/feature/a into train/64'] }).error).toMatch(/no version commit of train 64/);
    expect(onBaseCheck({ ...ok, subjects: [v64, 'Merge origin/a into train/64', versionSubject(63, '4.95.4')] }).error).toMatch(/depth 2 at most/);
  });

  it('bumpProtocol from the base head: a base that already bumped gives base + 1', () => {
    const text = (v: number): string => `export const PROTOCOL_VERSION = ${v};\n`;
    expect(bumpProtocol(text(41), 41)).toBe(text(42)); // train 64 bumped 40 -> 41, train 65 on it -> 42
    expect(bumpProtocol(text(40), 40)).toBe(text(41)); // train 64 did not bump: 41
  });

  it('keepStopMessage keeps --on in the rebuild command', () => {
    expect(keepStopMessage({ n: 65, version: '4.97.0', title: 'Next', versionSha: 'abcdef12', pre: 'p', members: ['feature/b'], on: base }))
      .toContain(`build 65 4.97.0 "Next" feature/b <b> --on ${base} --keep`);
  });

  describe('stackedDecision (check b)', () => {
    const facts = { branch: 'train/65', marker: { train: 64, sha: base }, baseInHead: true, baseInMaster: true, baseVersion: '4.96.0',
      tagCommit: other, tagParent: base, mergeTree: 'tree1', headTree: 'tree1' };

    it('accepts a stacked head whose base merged exactly there, tagged, with an unchanged merge tree', () => {
      const d = stackedDecision(facts);
      expect(d.ok).toBe(true);
      expect(d.message).toMatch(/stacked on train\/64 abcdef01 \(v4\.96\.0 merged, tagged\)/);
    });

    it('no marker: the old "master moved" stop, exit 3', () => {
      expect(stackedDecision({ branch: 'train/65', marker: null })).toEqual({ ok: false, code: 3,
        message: 'STOP: master moved since build: rebuild with the next version (origin/master is not in origin/train/65)' });
    });

    it('waits (exit 4) while the base train is not merged or not tagged', () => {
      expect(stackedDecision({ ...facts, baseInMaster: false })).toMatchObject({ ok: false, code: 4, message: expect.stringMatching(/base train not merged/) });
      expect(stackedDecision({ ...facts, tagCommit: null })).toMatchObject({ ok: false, code: 4, message: expect.stringMatching(/tag v4\.96\.0 \(train 64\) is not on origin/) });
    });

    it('rebuild (exit 3): base not in the head, base merged at another head, merge tree differs or conflicts', () => {
      expect(stackedDecision({ ...facts, baseInHead: false })).toMatchObject({ ok: false, code: 3 });
      expect(stackedDecision({ ...facts, tagParent: other })).toMatchObject({ ok: false, code: 3, message: expect.stringMatching(/merged at 11111111, not at the recorded base abcdef01/) });
      expect(stackedDecision({ ...facts, tagParent: null })).toMatchObject({ ok: false, code: 3 });
      expect(stackedDecision({ ...facts, mergeTree: 'tree2' })).toMatchObject({ ok: false, code: 3, message: expect.stringMatching(/change the tested tree/) });
      expect(stackedDecision({ ...facts, mergeTree: null })).toMatchObject({ ok: false, code: 3, message: expect.stringMatching(/conflict/) });
    });
  });

  it('mergeRetryable: not mergeable / base modified retry; head modified (a push after CI) never', () => {
    expect(mergeRetryable('GraphQL: Pull Request is not mergeable (mergePullRequest)')).toBe(true);
    expect(mergeRetryable('Base branch was modified. Review and try the merge again.')).toBe(true);
    expect(mergeRetryable('Head branch was modified. Review and try the merge again.')).toBe(false);
    expect(mergeRetryable('HTTP 401: Bad credentials')).toBe(false);
  });

  it('retryMerge: retries a retryable failure every step within ~2 min, stops at once on any other', async () => {
    let t = 0;
    const clock = { now: () => t, wait: async (ms: number) => { t += ms; } };
    let calls = 0;
    const flaky = await retryMerge(() => (++calls < 3 ? { ok: false, why: 'not mergeable' } : { ok: true, why: '' }), clock);
    expect([flaky.ok, flaky.tries, t]).toEqual([true, 3, 30_000]);
    t = 0; calls = 0;
    const stuck = await retryMerge(() => { calls++; return { ok: false, why: 'Base branch was modified' }; }, clock);
    expect([stuck.ok, stuck.tries, calls]).toEqual([false, 9, 9]); // tries at 0, 15, ..., 120 s
    expect(t).toBeLessThanOrEqual(120_000);
    t = 0;
    const hard = await retryMerge(() => ({ ok: false, why: 'Head branch was modified' }), clock);
    expect([hard.ok, hard.tries, t]).toEqual([false, 1, 0]);
  });
});

describe('merge-train stacked trains on a real git repo', () => {
  let dir = '';
  const git = (...a: string[]): string => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'core.autocrlf=false', ...a],
    { cwd: dir, encoding: 'utf8' }).trim();
  const commitFile = (file: string, text: string, msg: string): string => {
    fs.writeFileSync(path.join(dir, file), text);
    git('add', file);
    git('commit', '-q', '-m', msg);
    return git('rev-parse', 'HEAD');
  };
  const mergeInto = (target: string, from: string, msg: string): string => {
    git('checkout', '-q', target);
    git('merge', '-q', '--no-ff', from, '-m', msg);
    return git('rev-parse', 'HEAD');
  };

  it('N+1 on N\'s head: after N merges, merge-tree keeps tree(T); a foreign commit on master changes it; guard (a) clears', () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-stack-'));
    try {
      git('init', '-q', '-b', 'master');
      commitFile('a.txt', 'a0\n', 'root');
      fs.writeFileSync(path.join(dir, 'b.txt'), 'b0\n');
      commitFile('c.txt', 'c0\n', 'more');
      git('add', 'b.txt'); git('commit', '-q', '-m', 'b');
      const master0 = git('rev-parse', 'HEAD');
      // members a and b, cut from master
      git('checkout', '-q', '-b', 'feature/a'); commitFile('a.txt', 'a1\n', 'a work');
      git('checkout', '-q', master0); git('checkout', '-q', '-b', 'feature/b'); commitFile('b.txt', 'b1\n', 'b work');
      // train 64 = master + a + version commit; train 65 on its head = + b + version commit
      git('checkout', '-q', '-b', 'train/64', master0);
      mergeInto('train/64', 'feature/a', 'Merge origin/feature/a into train/64');
      const v64 = commitFile('version.txt', '4.96.0\n', versionSubject(64, '4.96.0'));
      git('checkout', '-q', '-b', 'train/65', v64);
      mergeInto('train/65', 'feature/b', 'Merge origin/feature/b into train/65');
      const t65 = commitFile('version.txt', '4.97.0\n', versionSubject(65, '4.97.0'));
      const fp = (range: string): string[] => git('log', '--first-parent', '--format=%s', range).split('\n').filter(Boolean);
      // before train 64 merges: guard (a) stops train 65, and its members are b only
      expect(foreignVersionStop(fp(`master..${t65}`), 65, 'train/65')).toMatch(/train 64 4\.96\.0/);
      expect(membersFromLog(fp(`master..${t65}`).reverse(), 65)).toEqual(['feature/b']);
      // train 64 merges (GitHub --merge: a merge commit, first parent master)
      const m64 = mergeInto('master', v64, 'Merge pull request #350 from train/64');
      expect(git('rev-parse', `${m64}^2`)).toBe(v64); // the tag's second parent is the recorded base
      expect(foreignVersionStop(fp(`master..${t65}`), 65, 'train/65')).toBeNull();
      expect(treeOf(m64, dir)).toBe(treeOf(v64, dir)); // tree(M_N) == tree(V_N)
      expect(mergedTree(m64, t65, dir)).toBe(treeOf(t65, dir)); // check (b): zero delta between tested and merged
      const m65 = mergeInto('master', t65, 'Merge pull request #351 from train/65');
      expect(treeOf(m65, dir)).toBe(treeOf(t65, dir)); // assert (c) holds for a real merge
      // a commit that landed on master in between (not train 64): the merge tree is no longer the tested one
      git('checkout', '-q', '-b', 'm2', m64); const moved = commitFile('c.txt', 'c-hotfix\n', 'hotfix');
      expect(mergedTree(moved, t65, dir)).not.toBe(treeOf(t65, dir));
      // and one that conflicts with a member: null
      git('checkout', '-q', '-b', 'm3', m64); const clash = commitFile('b.txt', 'b-other\n', 'clash');
      expect(mergedTree(clash, t65, dir)).toBeNull();
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});

describe('merge-train carry-overs (overlap-trains slice 4)', () => {
  it('parseArgs normalises the train number: build 063 -> 63, release 007 -> 7', () => {
    expect(parseArgs(['build', '063', '4.80.0', 'Lamps', 'feature/a']).n).toBe('63');
    expect(parseArgs(['release', '007', '4.80.0', 'Lamps']).n).toBe('7');
    expect(membersFromLog(['Merge origin/feature/a into train/63'], parseArgs(['build', '063', '4.80.0', 'L', 'x']).n)).toEqual(['feature/a']);
  });

  it('withBaseMarker(body, null) strips a stale base marker from a reused PR body', () => {
    const sha = 'a'.repeat(40);
    const body = trainPrBody(66, 'Next', [{ branch: 'feature/b', pr: 9 }], [], { train: 65, sha, version: '4.97.0' });
    expect(parseBaseMarker(body)).toEqual({ train: 65, sha });
    const stripped = withBaseMarker(body, null);
    expect(parseBaseMarker(stripped)).toBeNull();
    expect(stripped).toContain('Train 66: Next');
  });
});
