import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, DIFFICULTY, parseDifficulty, parsePreset, resolveDifficulty } from '../src/ai/archetypes';
import { ALARM, raiseTime } from '../src/ai/alarm';
import { ALERT, callInDelay } from '../src/ai/alertState';
import { computeRewards } from '../src/progression/rewards';

describe('fixed difficulty levels (G106: no custom sliders)', () => {
  it('the four CT levels keep their numbers', () => {
    expect(DIFFICULTIES).toEqual(['rookie', 'normal', 'realistic', 'perfectionist']);
    expect(DIFFICULTY.rookie).toEqual({ label: 'Rookie', damage: 0.6, accuracy: 0.7, hp: 0.85, reward: 0.8, perception: 0.7, reaction: 1.35, helmets: 'stage' });
    expect(DIFFICULTY.normal).toEqual({ label: 'Normal', damage: 1, accuracy: 1, hp: 1, reward: 1, perception: 1, reaction: 1, helmets: 'stage' });
    expect(DIFFICULTY.realistic).toEqual({ label: 'Realistic', damage: 1.6, accuracy: 1.3, hp: 1.15, reward: 1.35, perception: 1.3, reaction: 0.8, helmets: 'always' });
    expect(DIFFICULTY.perfectionist).toEqual({ label: 'Perfectionist', damage: 1.6, accuracy: 1.3, hp: 1.15, reward: 1.6, perception: 1.5, reaction: 0.7, helmets: 'locked' });
  });

  it('resolveDifficulty is the preset itself', () => {
    for (const p of DIFFICULTIES) expect(resolveDifficulty(p)).toBe(DIFFICULTY[p]);
  });

  it('parses the old names; the old custom reads as Normal', () => {
    expect(parseDifficulty('custom')).toBe('normal');
    expect(parseDifficulty('easy')).toBe('rookie');
    expect(parseDifficulty('hard')).toBe('realistic');
    expect(parseDifficulty(7)).toBe('normal');
    expect(parsePreset('custom')).toBe('normal');
  });

  it('a level reaction scales the call-in delay and the panel raise time', () => {
    const d = resolveDifficulty('rookie');
    expect(callInDelay(d.reaction)).toBeCloseTo(ALERT.callIn * 1.35, 9);
    expect(raiseTime(d.reaction)).toBeCloseTo(ALARM.holdTime * 1.35, 9);
    expect(callInDelay(DIFFICULTY.normal.reaction)).toBe(ALERT.callIn);
  });

  it('rewards pay the level', () => {
    const stats = { mode: 'clear', won: true, byKind: {} } as unknown as Parameters<typeof computeRewards>[0];
    const r = computeRewards(stats, 'realistic');
    expect(r.lines.some((l) => l.label === `Difficulty x${DIFFICULTY.realistic.reward}`)).toBe(true);
  });
});
