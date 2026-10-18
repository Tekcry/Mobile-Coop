import { describe, expect, it } from 'vitest';
import { REVIVE_WINDOW, REVIVES_PER_MISSION, ReviveClock } from '../src/game/reviveClock';
import { rearmZones } from '../src/game/jammer';

describe('revive clock (B8, G126)', () => {
  it('uses the 30 s window and 2 revives per mission', () => {
    expect(REVIVE_WINDOW).toBe(30);
    expect(REVIVES_PER_MISSION).toBe(2);
  });

  it('a revive inside the window counts; the window is gone after it', () => {
    const c = new ReviveClock();
    expect(c.down('b')).toBe(true);
    const out: string[] = [];
    c.step(29.9, out);
    expect(out).toEqual([]);
    expect(c.remaining('b')).toBeCloseTo(0.1, 5);
    expect(c.revive('b')).toBe(true);
    expect(c.used).toBe(1);
    expect(c.remaining('b')).toBe(-1);
  });

  it('past 30 s the player is out (reported once), and cannot be revived', () => {
    const c = new ReviveClock();
    c.down('b');
    const out: string[] = [];
    for (let i = 0; i < 30 * 60; i++) c.step(1 / 60, out);
    expect(out).toEqual(['b']);
    c.step(1, out);
    expect(out).toEqual(['b']);
    expect(c.revive('b')).toBe(false);
    expect(c.used).toBe(0);
  });

  it('the third down in a mission is out at once', () => {
    const c = new ReviveClock();
    expect(c.down('a')).toBe(true);
    expect(c.revive('a')).toBe(true);
    expect(c.down('b')).toBe(true);
    expect(c.revive('b')).toBe(true);
    expect(c.canRevive).toBe(false);
    expect(c.down('a')).toBe(false);
    expect(c.remaining('a')).toBe(-1);
  });

  it('a checkpoint stops the windows without a count; reset gives the revives back', () => {
    const c = new ReviveClock();
    c.down('a');
    c.revive('a');
    c.down('b');
    c.checkpoint();
    expect(c.remaining('b')).toBe(-1);
    expect(c.used).toBe(1);
    c.clear('b');
    c.reset();
    expect(c.used).toBe(0);
    expect(c.canRevive).toBe(true);
  });

  it('two players down run their own windows', () => {
    const c = new ReviveClock();
    c.down('a');
    const out: string[] = [];
    c.step(10, out);
    c.down('b');
    c.step(20, out);
    expect(out).toEqual(['a']);
    expect(c.remaining('b')).toBeCloseTo(10, 5);
  });
});

describe('pass zone re-arm on a bay restart (B3 polish 1)', () => {
  const zones = [
    { id: 'z3', flag: 's3-clear' },
    { id: 'z9', flag: 'other' },
  ];
  it('a zone whose flag was cleared can set it again; one whose flag stands stays set', () => {
    const set = new Set(['z3', 'z9']);
    const flags = new Set(['other']);
    rearmZones(set, zones, (f) => flags.has(f));
    expect(set.has('z3')).toBe(false);
    expect(set.has('z9')).toBe(true);
  });
  it('nothing set: nothing to do', () => {
    const set = new Set<string>();
    rearmZones(set, zones, () => false);
    expect(set.size).toBe(0);
  });
});
