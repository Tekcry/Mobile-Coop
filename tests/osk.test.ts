import { describe, expect, it } from 'vitest';
import { oskDelete, oskType } from '../src/ui/osk';

describe('osk pure parts', () => {
  it('uppercases and accepts allowed characters', () => {
    expect(oskType('AB', 'c', 'ABC', 5)).toEqual({ value: 'ABC', ok: true });
  });
  it('rejects characters outside the set with a reason', () => {
    const r = oskType('AB', 'z', 'ABC', 5);
    expect(r.ok).toBe(false);
    expect(r.value).toBe('AB');
    expect(r.reason).toMatch(/not used/);
  });
  it('stops at max length', () => {
    const r = oskType('ABCDE', 'A', 'ABC', 5);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/5/);
  });
  it('deletes the last character, safe when empty', () => {
    expect(oskDelete('AB')).toBe('A');
    expect(oskDelete('')).toBe('');
  });
});
