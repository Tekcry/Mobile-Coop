import { describe, expect, it } from 'vitest';
import { pickBuildSha } from '../src/core/buildSha';

describe('build commit label (G183)', () => {
  it("the checked-out folder's HEAD wins over the workflow's GITHUB_SHA (a preview slot builds another branch)", () => {
    expect(pickBuildSha('e5fc587\n', 'fca0e267aaaabbbbccccddddeeeeffff00001111')).toBe('e5fc587');
  });
  it('falls back to GITHUB_SHA, shortened, when git gives nothing usable', () => {
    expect(pickBuildSha(null, 'fca0e267aaaabbbbccccddddeeeeffff00001111')).toBe('fca0e26');
    expect(pickBuildSha('', 'FCA0E267')).toBe('fca0e26');
    expect(pickBuildSha('fatal: not a git repository', 'fca0e267')).toBe('fca0e26');
  });
  it('a full git hash is shortened to 7; nothing usable gives an empty label', () => {
    expect(pickBuildSha('e5fc5870123456789abcdef0123456789abcdef0', undefined)).toBe('e5fc587');
    expect(pickBuildSha(null, undefined)).toBe('');
    expect(pickBuildSha(' ', 'not-a-sha')).toBe('');
  });
});
