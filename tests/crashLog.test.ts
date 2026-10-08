import { describe, expect, it } from 'vitest';
import { crashNote } from '../src/feedback/crashLog';

describe('crash log (3.1.4)', () => {
  const beat = { alive: true, at: Date.UTC(2026, 9, 7, 12, 0, 30), started: Date.UTC(2026, 9, 7, 12, 0, 0), stage: 'loading benchmark run 2/9: without ambient occlusion (ultra)', context: { version: '3.1.4', graphics: 'ultra' } };
  it('a heartbeat still alive becomes a bug note with the stage and the context', () => {
    const e = crashNote(beat)!;
    expect(e.category).toBe('bug');
    expect(e.text).toContain('run 2/9: without ambient occlusion');
    expect(e.text).toContain('30 s after it started');
    expect(e.context.graphics).toBe('ultra');
  });
  it('a clean close (hidden / closed), nothing stored or junk: no note', () => {
    expect(crashNote({ ...beat, alive: false })).toBeNull();
    expect(crashNote(undefined)).toBeNull();
    expect(crashNote('x')).toBeNull();
    expect(crashNote({ alive: true })).toBeNull();
  });
});
