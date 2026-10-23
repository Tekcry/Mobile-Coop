import { describe, it, expect } from 'vitest';
import { StealthRating } from '../src/game/playstyle';

describe('StealthRating duals (spare 12)', () => {
  it('dualTakedown counts duals only', () => {
    const s = new StealthRating();
    s.record('dualTakedown', false);
    s.record('dualTakedown', true);
    expect(s.duals).toBe(2);
    expect(s.knockouts).toBe(0);
    expect(s.kills).toBe(0);
  });
  it('a plain non-lethal takedown leaves duals alone', () => {
    const s = new StealthRating();
    s.record('dualTakedown', false);
    s.record('takedownNonLethal', false);
    expect(s.knockouts).toBe(1);
    expect(s.duals).toBe(1);
  });
});
