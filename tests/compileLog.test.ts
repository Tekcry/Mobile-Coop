/**
 * (map-ready S14) The compile log (`src/core/compileLog.ts`): `shaderKindOf` on whole define names, known keys never
 * logged, first-seen times, ready times and durations, the in-flight counts, failures, `top`, `summary`, `finish` and
 * the group start times.
 */
import { describe, expect, it } from 'vitest';
import { CompileLog, KEY_MAX, shaderKindOf } from '../src/core/compileLog';

const defs = (...names: string[]): string => names.map((n) => `#define ${n}\n`).join('');

describe('shaderKindOf', () => {
  it('names each kind from its whole define, in order: body, guard, level, lit; then post by name; else other', () => {
    expect(shaderKindOf('pbr', defs('NUM_BONE_INFLUENCERS 4', 'SMOOTHBODY', 'BAKED_LAMPS'))).toBe('body');
    expect(shaderKindOf('pbr', defs('GUARDFIG', 'BAKED_LAMPS'))).toBe('guard');
    expect(shaderKindOf('pbr', defs('LEVELSHADING', 'BAKED_LAMPS'))).toBe('level');
    expect(shaderKindOf('default', defs('SURFACES'))).toBe('level');
    expect(shaderKindOf('pbr', defs('ALBEDO', 'BAKED_LAMPS'))).toBe('lit');
    expect(shaderKindOf('fxaa', defs('FXAA'))).toBe('post');
    expect(shaderKindOf('pbr', defs('ALBEDO'))).toBe('other');
    expect(shaderKindOf('default', '')).toBe('other');
    expect(shaderKindOf('', '')).toBe('other');
    // a value on the define line still counts
    expect(shaderKindOf('pbr', '#define SMOOTHBODY 1\n')).toBe('body');
    expect(shaderKindOf('pbr', '  #define GUARDFIG')).toBe('guard');
  });

  it('a define that only contains a kind name is not that kind', () => {
    expect(shaderKindOf('pbr', defs('MY_SMOOTHBODY_X'))).toBe('other');
    expect(shaderKindOf('pbr', defs('SMOOTHBODY_X'))).toBe('other');
    expect(shaderKindOf('pbr', defs('NOGUARDFIG'))).toBe('other');
    expect(shaderKindOf('pbr', defs('LEVELSHADING2', 'SURFACES_OFF'))).toBe('other');
    expect(shaderKindOf('pbr', defs('BAKED_LAMPS_OFF'))).toBe('other');
    // a name in a comment or another word on the line is not a define of it
    expect(shaderKindOf('pbr', '#define X SMOOTHBODY\n// SMOOTHBODY\n')).toBe('other');
  });
});

describe('CompileLog', () => {
  it('known keys are never logged; seen twice keeps the first time; ready on an unknown key is ignored', () => {
    const l = new CompileLog(1000, 'parallel');
    expect(l.record).toMatchObject({ entries: [], peakInFlight: 0, pending: 0, done: false, groups: {}, order: 'parallel' });
    l.known('old');
    l.seen('old', 'pbr', defs('SMOOTHBODY'), 1500);
    expect(l.record.entries).toHaveLength(0);
    l.seen('a', 'pbr', defs('SMOOTHBODY', 'BAKED_LAMPS'), 1500);
    l.seen('a', 'pbr', defs('GUARDFIG'), 1900);
    expect(l.record.entries).toHaveLength(1);
    expect(l.record.entries[0]).toMatchObject({ key: 'a', kind: 'body', defines: 2, fragChars: -1, startMs: 500, readyMs: -1, ms: -1, inFlight: 0, early: false, failed: false });
    l.ready('nope', 2000, 10, false);
    expect(l.record.pending).toBe(1);
    // a ready entry is not readied again
    l.ready('a', 2500, 1234, false);
    l.ready('a', 9000, 1, true);
    expect(l.record.entries[0]).toMatchObject({ readyMs: 1500, ms: 1000, fragChars: 1234, failed: false });
    expect(l.record.pending).toBe(0);
  });

  it('an early key (not ready at t0) starts at 0; a long key is cut', () => {
    const l = new CompileLog(1000, 'serial');
    const long = 'k'.repeat(KEY_MAX + 50);
    l.seen(long, 'pbr', '', 1000, true);
    const e = l.record.entries[0]!;
    expect(e.key).toHaveLength(KEY_MAX);
    expect(e.early).toBe(true);
    expect(e.startMs).toBe(0);
    l.ready(long, 4000, -1, false);
    expect(e.ms).toBe(3000);
    expect(l.record.order).toBe('serial');
  });

  it('ms, inFlight and peakInFlight on a known series: 3 compiles, the first two overlapping', () => {
    const l = new CompileLog(0, 'parallel');
    l.seen('a', 'pbr', defs('SMOOTHBODY'), 100);
    l.seen('b', 'pbr', defs('GUARDFIG'), 200);
    l.ready('a', 1100, 50, false);
    l.ready('b', 1700, 60, false);
    l.seen('c', 'pbr', defs('LEVELSHADING'), 2000);
    l.ready('c', 2500, 70, false);
    const [a, b, c] = l.record.entries;
    expect([a!.ms, b!.ms, c!.ms]).toEqual([1000, 1500, 500]);
    expect([a!.inFlight, b!.inFlight, c!.inFlight]).toEqual([0, 1, 0]);
    expect(l.record.peakInFlight).toBe(2);
    expect(l.record.pending).toBe(0);
  });

  it('a failed compile is ready and marked failed', () => {
    const l = new CompileLog(0, 'parallel');
    l.seen('x', 'pbr', defs('SMOOTHBODY'), 0);
    l.ready('x', 300, -1, true);
    expect(l.record.entries[0]).toMatchObject({ failed: true, ms: 300, fragChars: -1 });
  });

  it('top(n): longest first, pending last', () => {
    const l = new CompileLog(0, 'parallel');
    l.seen('a', 'pbr', '', 0);
    l.seen('b', 'pbr', '', 0);
    l.seen('p', 'pbr', '', 0);
    l.seen('c', 'pbr', '', 0);
    l.ready('a', 500, 1, false);
    l.ready('b', 2000, 1, false);
    l.ready('c', 1000, 1, false);
    expect(l.top(4).map((e) => e.key)).toEqual(['b', 'c', 'a', 'p']);
    expect(l.top(2).map((e) => e.key)).toEqual(['b', 'c']);
    expect(l.top(0)).toEqual([]);
  });

  it('summary: programs, peak, the longest and its kind, the sum over the span; pending named while some are', () => {
    const l = new CompileLog(1000, 'parallel');
    expect(l.summary(1000)).toBe('0 programs, peak 0 at once, none finished');
    l.seen('a', 'pbr', defs('SMOOTHBODY'), 2000);
    l.seen('b', 'pbr', defs('GUARDFIG'), 3000);
    l.seen('c', 'pbr', defs('LEVELSHADING'), 4000);
    l.ready('a', 33200, 1, false);
    l.ready('b', 21000, 1, false);
    // a: 31.2 s, b: 18.0 s; the span runs from a's start (1.0 s) to a's ready (32.2 s)
    expect(l.summary(40000)).toBe('3 programs, peak 3 at once, longest body 31.2 s, sum 49.2 s over 31.2 s, 1 pending at 39.0 s');
    l.ready('c', 34500, 1, false);
    expect(l.summary(40000)).toBe('3 programs, peak 3 at once, longest body 31.2 s, sum 79.7 s over 32.5 s');
  });

  it('finish leaves pending entries at -1 and the log closed; group keeps the first time per name', () => {
    const l = new CompileLog(500, 'parallel');
    l.group('level', 1500);
    l.group('guards', 1500);
    l.group('level', 9000);
    l.group('own', 2500);
    expect(l.record.groups).toEqual({ level: 1000, guards: 1000, own: 2000 });
    l.seen('a', 'pbr', '', 1000);
    l.finish();
    expect(l.record.done).toBe(true);
    expect(l.record.entries[0]).toMatchObject({ readyMs: -1, ms: -1 });
    expect(l.record.pending).toBe(1);
    // nothing changes once finished
    l.ready('a', 2000, 1, false);
    l.seen('b', 'pbr', '', 2000);
    expect(l.record.entries).toHaveLength(1);
    expect(l.record.entries[0]!.readyMs).toBe(-1);
  });
});
