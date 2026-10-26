import { describe, expect, it } from 'vitest';
import { SectorRun, sectorResult } from '../src/game/sectors';
import { ALL_MARKS, NO_KILLS, UNDETECTED } from '../src/game/rating/sectionRating';

describe('section-rating S2: Sector Ops host parts', () => {
  it('the result line is unchanged without marks', () => {
    const r = sectorResult({ time: 125, kills: 0, spotted: 0 });
    expect(r.line).toBe('Time 2:05  ·  Kills 0  ·  Spotted 0  ·  GHOST');
    expect(r.marks).toBeUndefined();
  });

  it('the result line gains each section\'s marks of 4 ("-" not rated)', () => {
    const marks = [ALL_MARKS, UNDETECTED | NO_KILLS, -1];
    const r = sectorResult({ time: 60, kills: 1, spotted: 0, marks });
    expect(r.line).toBe('Time 1:00  ·  Kills 1  ·  Spotted 0  ·  Marks 4/4 2/4 -');
    expect(r.marks).toEqual(marks);
  });

  it('(POL1) a later mission start: the sections before it read "skip", not "-" or 0/4', () => {
    const marks = [-1, -1, ALL_MARKS, -1];
    const r = sectorResult({ time: 60, kills: 0, spotted: 1, marks, skipped: 2 });
    expect(r.line).toBe('Time 1:00  ·  Kills 0  ·  Spotted 1  ·  Marks skip skip 4/4 -');
    // a rated section before the start (cannot happen, but a mark wins) and no start: unchanged
    expect(sectorResult({ time: 0, kills: 0, spotted: 1, marks: [0, -1], skipped: 1 }).line).toBe('Time 0:00  ·  Kills 0  ·  Spotted 1  ·  Marks 0/4 -');
    expect(sectorResult({ time: 0, kills: 0, spotted: 1, marks: [-1, 0], skipped: 0 }).line).toBe('Time 0:00  ·  Kills 0  ·  Spotted 1  ·  Marks - 0/4');
  });

  it('a run starts with every section unrated and no syringe bonus', () => {
    const run = new SectorRun([]);
    expect(run.marks).toEqual([]);
    expect(run.syringeBonus).toBe(0);
  });
});
