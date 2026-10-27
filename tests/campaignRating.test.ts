import { describe, expect, it } from 'vitest';
import { campaignRating } from '../src/game/mission/campaignRating';

// (campaign-mode CM1, PLAN 3.2, A5) 100 - 10 per kill - 15 per alarm + 5 per optional; any kill or alarm caps at 99

const r = (kills: number, alarms: number, optional = 0) => campaignRating({ kills, alarms, optional });

describe('campaign rating', () => {
  it('0 kills and 0 alarms is 100% and perfect (G146)', () => {
    expect(r(0, 0)).toEqual({ pct: 100, perfect: true });
    expect(r(0, 0, 3)).toEqual({ pct: 100, perfect: true });
  });

  it('scores kills and alarms by A5', () => {
    expect(r(1, 0)).toEqual({ pct: 90, perfect: false });
    expect(r(0, 1)).toEqual({ pct: 85, perfect: false });
    expect(r(2, 1)).toEqual({ pct: 65, perfect: false });
    expect(r(1, 1, 2)).toEqual({ pct: 85, perfect: false });
  });

  it('any kill or alarm caps at 99: optional objectives cannot lift it to 100', () => {
    expect(r(1, 0, 2)).toEqual({ pct: 99, perfect: false });
    expect(r(1, 0, 10)).toEqual({ pct: 99, perfect: false });
    expect(r(0, 1, 10)).toEqual({ pct: 99, perfect: false });
  });

  it('clamps at 0', () => {
    expect(r(20, 0)).toEqual({ pct: 0, perfect: false });
    expect(r(5, 5, 1)).toEqual({ pct: 0, perfect: false });
  });

  it('junk counts read as 0', () => {
    expect(r(Number.NaN, -3, Number.POSITIVE_INFINITY)).toEqual({ pct: 100, perfect: true });
    expect(r(1.7, 0)).toEqual({ pct: 90, perfect: false });
  });
});
