import { describe, expect, it } from 'vitest';
import { RUMBLE, RUMBLE_KINDS, landingRumble, playRumble } from '../src/config/rumble';

describe('rumble table (locomotion step 17, D5.12, D8 local only)', () => {
  it('every event maps to an entry inside 0..1 with a duration', () => {
    const events = ['landSoft', 'landRoll', 'landHeavy', 'takedownDone', 'elbowHit', 'shotSuppressed', 'shotLoud', 'footfallHeavy', 'kill', 'hurt', 'explosion', 'test'];
    expect([...RUMBLE_KINDS].sort()).toEqual([...events].sort());
    for (const k of RUMBLE_KINDS) {
      const e = RUMBLE[k];
      expect(e.strong).toBeGreaterThanOrEqual(0);
      expect(e.strong).toBeLessThanOrEqual(1);
      expect(e.weak).toBeGreaterThanOrEqual(0);
      expect(e.weak).toBeLessThanOrEqual(1);
      expect(e.ms).toBeGreaterThan(0);
    }
    expect(RUMBLE.landHeavy).toEqual({ strong: 0.8, weak: 0.8, ms: 200 });
    expect(RUMBLE.footfallHeavy).toEqual({ strong: 0.06, weak: 0.1, ms: 35 });
  });
  it('landing bands map to their entries', () => {
    expect(landingRumble('soft')).toBe('landSoft');
    expect(landingRumble('roll')).toBe('landRoll');
    expect(landingRumble('heavy')).toBe('landHeavy');
    expect(landingRumble('none')).toBeNull();
  });
  it('remote events never call rumble; the setting scales', () => {
    const calls: number[][] = [];
    const sink = (s: number, w: number, ms: number): void => void calls.push([s, w, ms]);
    for (const k of RUMBLE_KINDS) expect(playRumble(sink, k, false, 1)).toBe(false);
    expect(calls.length).toBe(0);
    expect(playRumble(sink, 'shotLoud', true, 0)).toBe(false);
    expect(playRumble(sink, 'shotLoud', true, 0.5)).toBe(true);
    expect(calls).toEqual([[0.2, 0.275, 80]]);
  });
});
