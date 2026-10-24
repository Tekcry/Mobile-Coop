import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// @ts-expect-error plain .mjs process script without types
import { assembleDir, parseFragment, releaseHeading, summary } from '../scripts/changelog-assemble.mjs';

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

  it('an entry already in CHANGELOG.md is skipped; the rest of the fragment still lands', () => {
    write('CHANGELOG.md', `# Changelog\n\n${OLD}`);
    write('changes/feature-lamps.md', '# Lamps\nkind: patch\n- old entry\n- lamp entry\n');
    const r = assembleDir(root, OPTS);
    expect(read('CHANGELOG.md')).toBe(['# Changelog', '', '## 4.56.0 - Train 5: lamps (2026-10-23, PR #130; #125, #127)',
      '- lamp entry', '', OLD].join('\n'));
    expect(r.skipped).toEqual(['old entry']);
    expect(fs.existsSync(path.join(root, 'changes/feature-lamps.md'))).toBe(false);
  });

  it('a fragment whose entries are all already in CHANGELOG.md adds no block, but the file is still deleted', () => {
    write('CHANGELOG.md', `# Changelog\n\n${OLD}`);
    write('changes/feature-dup.md', '# Dup\n- old entry\n');
    const r = assembleDir(root, OPTS);
    expect(r.text).toBeNull();
    expect(read('CHANGELOG.md')).toBe(`# Changelog\n\n${OLD}`);
    expect(r.skipped).toEqual(['old entry']);
    expect(fs.existsSync(path.join(root, 'changes/feature-dup.md'))).toBe(false);
  });

  it('a fully skipped fragment leaves no empty ### block beside fragments with new entries', () => {
    write('CHANGELOG.md', `# Changelog\n\n${OLD}`);
    write('changes/feature-a.md', '# Dup\n- old entry\n');
    write('changes/feature-b.md', '# Wheel\n- wheel entry\n');
    write('changes/feature-c.md', '# Lamp\n- lamp entry\n');
    assembleDir(root, OPTS);
    expect(read('CHANGELOG.md')).toBe(['# Changelog', '', '## 4.56.0 - Train 5: lamps (2026-10-23, PR #130; #125, #127)', '',
      '### Wheel', '- wheel entry', '', '### Lamp', '- lamp entry', '', OLD].join('\n'));
  });

  it('whitespace differences still count as the same entry', () => {
    write('CHANGELOG.md', '# Changelog\n\n## 4.55.1 - Old fix (2026-10-22, PR #124)\n- lamp   entry\n  continued\n');
    write('changes/feature-ws.md', '# Lamps\n- lamp entry continued\n- new  thing\n');
    const r = assembleDir(root, OPTS);
    expect(r.skipped).toEqual(['lamp entry continued']);
    expect(read('CHANGELOG.md')).not.toContain('- lamp entry continued\n');
    expect(read('CHANGELOG.md')).toContain('- new  thing\n');
  });

  it('prints one line per skipped entry, cut to 60 characters', () => {
    const long = `- ${'x'.repeat(80)}`;
    write('CHANGELOG.md', `# Changelog\n\n## 4.55.1 - Old fix (2026-10-22, PR #124)\n${long}\n`);
    write('changes/feature-long.md', `# Long\n${long}\n- fresh\n`);
    const r = assembleDir(root, OPTS);
    expect(summary(r, 'H')).toContain(`  - skipped (already in CHANGELOG.md): ${'x'.repeat(60)}\n`);
    expect(summary(r, 'H')).not.toContain('x'.repeat(61));
  });

  it('stacked train (N+1 on N\'s version head): N\'s section + N+1\'s fragments -> one new section on top, no repeats', () => {
    // train/65 is built on train/64's version commit: CHANGELOG.md already holds 64's section (its fragments consumed and
    // deleted there), changes/ holds only 65's members' fragments; one of them repeats a line 64 already released.
    const n64 = ['## 4.96.0 - Train 64: lamps (2026-10-24, PR #350; #341, #342)', '', '### Lamps', '- lamp entry', '',
      '### Wheel', '- wheel entry', '  continued', ''].join('\n');
    write('CHANGELOG.md', `# Changelog\n\n${n64}\n${OLD}`);
    write('changes/feature-guard-s5.md', '# Guard S5\n- guard s5 entry\n- wheel entry\n  continued\n');
    write('changes/fix-door.md', '# Door fix\nkind: patch\n- door entry\n');
    const r = assembleDir(root, { version: '4.97.0', title: 'Train 65: guards', date: '2026-10-24', pr: 351, members: [343, 344] });
    const text = read('CHANGELOG.md');
    expect(text).toBe(['# Changelog', '', '## 4.97.0 - Train 65: guards (2026-10-24, PR #351; #343, #344)', '',
      '### Guard S5', '- guard s5 entry', '', '### Door fix', '- door entry', '', n64, OLD].join('\n'));
    expect(text.match(/^## /gm)).toHaveLength(3); // 65, 64, the old fix: one new section only
    for (const e of ['- lamp entry', '- wheel entry', '- guard s5 entry', '- door entry']) {
      expect(text.split('\n').filter((l) => l === e)).toHaveLength(1);
    }
    expect(r.skipped).toEqual(['wheel entry continued']);
    expect(r.bump).toBe('minor');
    expect(fs.readdirSync(path.join(root, 'changes'))).toEqual([]);
  });

  it('a dry assembly (write false) leaves the files alone', () => {
    write('CHANGELOG.md', `# Changelog\n\n${OLD}`);
    write('changes/a.md', '# A\n- a\n');
    expect(assembleDir(root, OPTS, false).parts).toHaveLength(1);
    expect(read('CHANGELOG.md')).toBe(`# Changelog\n\n${OLD}`);
    expect(fs.existsSync(path.join(root, 'changes/a.md'))).toBe(true);
  });
});
