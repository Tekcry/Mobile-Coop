import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs process script without types
import { classifyConflicts, membersFromLog, resolveKeepBoth, trainPrBody, trainPrTitle } from '../scripts/merge-train.mjs';

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

  it('reads train members from the merge subjects, oldest first, master excluded', () => {
    expect(membersFromLog(['Merge origin/feature/a into train/5', 'Merge origin/master into train/5', 'Merge origin/fix/b into train/5',
      'something else'])).toEqual(['feature/a', 'fix/b']);
  });
});
