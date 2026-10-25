/** (sector-batch, G146) Sector Ops Perfect: no kills and no alarm on the run's line; the banner badge. */
import { describe, expect, it } from 'vitest';
import { resultBadge, sectorResult } from '../src/game/sectors';
import { ALL_MARKS } from '../src/game/rating/sectionRating';

describe('sector-batch: Perfect on the Sector Ops result', () => {
  it('no kills, no alarm, never spotted: PERFECT and GHOST', () => {
    const r = sectorResult({ time: 125, kills: 0, spotted: 0, alarms: 0 });
    expect(r.perfect).toBe(true);
    expect(r.ghost).toBe(true);
    expect(r.line).toBe('Time 2:05  ·  Kills 0  ·  Spotted 0  ·  PERFECT  ·  GHOST');
    expect(resultBadge(r)).toBe('PERFECT  ·  GHOST');
  });

  it('spotted but no alarm and no kill: PERFECT only (G146 asks no alarms, not unseen)', () => {
    const r = sectorResult({ time: 60, kills: 0, spotted: 2, alarms: 0 });
    expect(r.perfect).toBe(true);
    expect(r.ghost).toBe(false);
    expect(r.line).toBe('Time 1:00  ·  Kills 0  ·  Spotted 2  ·  PERFECT');
    expect(resultBadge(r)).toBe('PERFECT');
  });

  it('an alarm or a kill loses Perfect; without the alarm stage there is none', () => {
    expect(sectorResult({ time: 60, kills: 0, spotted: 1, alarms: 1 }).perfect).toBe(false);
    expect(sectorResult({ time: 60, kills: 1, spotted: 0, alarms: 0 }).perfect).toBe(false);
    expect(sectorResult({ time: 60, kills: 0, spotted: 0 }).perfect).toBe(false);
    expect(resultBadge(sectorResult({ time: 60, kills: 1, spotted: 3, alarms: 2 }))).toBe('');
    expect(resultBadge({ ghost: true, perfect: false })).toBe('GHOST');
  });

  it('marks still follow the labels', () => {
    const r = sectorResult({ time: 60, kills: 0, spotted: 0, alarms: 0, marks: [ALL_MARKS] });
    expect(r.line).toBe('Time 1:00  ·  Kills 0  ·  Spotted 0  ·  PERFECT  ·  GHOST  ·  Marks 4/4');
  });
});
