import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// @ts-expect-error plain .mjs process script without types
import { assembleDir, parseFragment, releaseHeading } from '../scripts/changelog-assemble.mjs';

const OLD = '## 4.55.1 - Old fix (2026-10-22, PR #124)\n- old entry\n';
const OPTS = { version: '4.56.0', title: 'Train 5: lamps', date: '2026-10-23', pr: 130, members: [125, '#127'] };

let root = '';
const write = (rel: string, text: string): void => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
};
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8');

beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-assemble-')); });
afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

describe('changelog-assemble', () => {
  it('formats the release heading, with and without members', () => {
    expect(releaseHeading('4.56.0', 'T', '2026-10-23', 130, [125, '#127'])).toBe('## 4.56.0 - T (2026-10-23, PR #130; #125, #127)');
    expect(releaseHeading('4.55.2', 'Fix', '2026-10-23', '#131')).toBe('## 4.55.2 - Fix (2026-10-23, PR #131)');
  });

  it('parses a fragment: title, optional kind, entries; rejects a missing title or a bad kind', () => {
    expect(parseFragment('# Lamps\nkind: patch\n- a\n  more\n- b\n')).toEqual({ title: 'Lamps', kind: 'patch', body: ['- a', '  more', '- b'] });
    expect(parseFragment('# Lamps\n\n- a\n').kind).toBe('minor');
    expect(() => parseFragment('- a\n', 'x.md')).toThrow(/x\.md/);
    expect(() => parseFragment('# T\nkind: major\n- a\n')).toThrow(/kind/);
    expect(() => parseFragment('# T\n\n')).toThrow(/no entries/);
  });

  it('fragments only: one ### per fragment under one heading, fragments deleted, README kept', () => {
    write('CHANGELOG.md', `# Changelog\n\n${OLD}`);
    write('changes/README.md', '# Format\n- not a fragment\n');
    write('changes/feature-b.md', '# Wheel opens on goggles\nkind: minor\n- wheel entry\n');
    write('changes/feature-a.md', '# Lamp fix\nkind: patch\n- lamp entry\n  continued\n');
    const r = assembleDir(root, OPTS);
    expect(read('CHANGELOG.md')).toBe(['# Changelog', '', '## 4.56.0 - Train 5: lamps (2026-10-23, PR #130; #125, #127)', '',
      '### Lamp fix', '- lamp entry', '  continued', '', '### Wheel opens on goggles', '- wheel entry', '', OLD].join('\n'));
    expect(r.bump).toBe('minor');
    expect(fs.readdirSync(path.join(root, 'changes'))).toEqual(['README.md']);
  });

  it('legacy Unreleased blocks only: folded in, headings removed, older Unreleased below a release untouched', () => {
    const below = '## 4.0.0 - Ancient (2026-01-01, PR #1)\n- x\n\n## Unreleased - Weapon sounds (feature/weapon-audio)\n- kept\n';
    write('CHANGELOG.md', `# Changelog\n\n## Unreleased - menu\n- menu entry\n\n### Sub\n- sub entry\n\n## Unreleased - lamps\n- lamp entry\n\n${OLD}\n${below}`);
    assembleDir(root, OPTS);
    expect(read('CHANGELOG.md')).toBe(['# Changelog', '', '## 4.56.0 - Train 5: lamps (2026-10-23, PR #130; #125, #127)', '',
      '### menu', '- menu entry', '', '#### Sub', '- sub entry', '', '### lamps', '- lamp entry', '', OLD, below].join('\n'));
  });

  it('both: fragments then legacy blocks; a legacy block already released is dropped, not repeated', () => {
    write('CHANGELOG.md', `# Changelog\n\n## Unreleased - menu\n- menu entry\n\n## Unreleased - stale\n- old entry\n\n${OLD}`);
    write('changes/feature-lamps.md', '# Lamps\n- lamp entry\n');
    const r = assembleDir(root, OPTS);
    expect(read('CHANGELOG.md')).toBe(['# Changelog', '', '## 4.56.0 - Train 5: lamps (2026-10-23, PR #130; #125, #127)', '',
      '### Lamps', '- lamp entry', '', '### menu', '- menu entry', '', OLD].join('\n'));
    expect(r.dropped).toEqual(['stale']);
    expect(fs.existsSync(path.join(root, 'changes/feature-lamps.md'))).toBe(false);
  });

  it('a single fragment: entries directly under the heading, no ###', () => {
    write('CHANGELOG.md', `# Changelog\n\n${OLD}`);
    write('changes/fix-guardinfo.md', '# Guard info test\nkind: patch\n- the fix\n');
    const r = assembleDir(root, { version: '4.55.2', title: 'Guard info test', date: '2026-10-23', pr: 131 });
    expect(read('CHANGELOG.md')).toBe(`# Changelog\n\n## 4.55.2 - Guard info test (2026-10-23, PR #131)\n- the fix\n\n${OLD}`);
    expect(r.bump).toBe('patch');
  });

  it('nothing to assemble: null and the file untouched', () => {
    write('CHANGELOG.md', `# Changelog\n\n${OLD}`);
    expect(assembleDir(root, OPTS)).toBeNull();
    expect(read('CHANGELOG.md')).toBe(`# Changelog\n\n${OLD}`);
  });

  it('a dry assembly (write false) leaves the files alone', () => {
    write('CHANGELOG.md', `# Changelog\n\n${OLD}`);
    write('changes/a.md', '# A\n- a\n');
    expect(assembleDir(root, OPTS, false).parts).toHaveLength(1);
    expect(read('CHANGELOG.md')).toBe(`# Changelog\n\n${OLD}`);
    expect(fs.existsSync(path.join(root, 'changes/a.md'))).toBe(true);
  });
});
