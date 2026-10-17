import { describe, expect, it } from 'vitest';
import { basePreset, clampCustom, DIFFICULTIES, DIFFICULTY, parseDifficulty, parsePreset, presetSliders, resolveDifficulty, sanitizeCustom } from '../src/ai/archetypes';
import { ALARM, raiseTime } from '../src/ai/alarm';
import { ALERT, callInDelay } from '../src/ai/alertState';
import { sightRate, type SightInput } from '../src/ai/perception';
import { computeRewards } from '../src/progression/rewards';

describe('custom difficulty (locomotion step 19, D7)', () => {
  it('presets map to the slider table', () => {
    expect(presetSliders('rookie')).toEqual({ base: 'rookie', perception: 0.7, aim: 0.7, alarm: 1.35 });
    expect(presetSliders('normal')).toEqual({ base: 'normal', perception: 1, aim: 1, alarm: 1 });
    expect(presetSliders('realistic')).toEqual({ base: 'realistic', perception: 1.3, aim: 1.3, alarm: 0.8 });
    expect(presetSliders('perfectionist')).toEqual({ base: 'perfectionist', perception: 1.5, aim: 1.3, alarm: 0.7 });
  });

  it('resolveDifficulty per preset equals the preset (perception / accuracy / reaction unchanged)', () => {
    for (const p of DIFFICULTIES) {
      expect(resolveDifficulty(p, null)).toBe(DIFFICULTY[p]);
      // a preset ignores stored custom values
      expect(resolveDifficulty(p, { base: 'rookie', perception: 2, aim: 2, alarm: 2 })).toBe(DIFFICULTY[p]);
      // Custom with a preset's own sliders and base is that preset (but labelled Custom)
      const c = resolveDifficulty('custom', presetSliders(p));
      expect({ ...c, label: DIFFICULTY[p].label }).toEqual(DIFFICULTY[p]);
    }
  });

  it('custom takes damage, hp, medkits and reward from its base and clamps the sliders', () => {
    const d = resolveDifficulty('custom', { base: 'rookie', perception: 0.2, aim: 3, alarm: 1.27 });
    expect(d).toMatchObject({ label: 'Custom', damage: 0.6, hp: 0.85, medkits: 3, reward: 0.8, perception: 0.5, accuracy: 2, reaction: 1.25 });
    expect(resolveDifficulty('custom', null)).toMatchObject({ perception: 1, accuracy: 1, reaction: 1, medkits: 2, damage: 1 });
    expect(clampCustom(NaN)).toBe(1);
    expect(clampCustom(1.35)).toBe(1.35);
    expect(sanitizeCustom({ base: 'custom', perception: 1.5 })).toEqual({ base: 'normal', perception: 1.5, aim: 1, alarm: 1 });
  });

  it('parses custom and the old names', () => {
    expect(parseDifficulty('custom')).toBe('custom');
    expect(parseDifficulty('easy')).toBe('rookie');
    expect(parseDifficulty('hard')).toBe('realistic');
    expect(parseDifficulty(7)).toBe('normal');
    expect(parsePreset('custom')).toBe('normal');
    expect(basePreset('custom', { base: 'realistic', perception: 1, aim: 1, alarm: 1 })).toBe('realistic');
    expect(basePreset('custom', null)).toBe('normal');
    expect(basePreset('perfectionist', null)).toBe('perfectionist');
  });

  it('perception 0.5 halves the sight meter rate', () => {
    const si: SightInput = { dist: 6, angle: 0, light: 1, crouched: false, speed: 0, exposure: 1, sensitivity: 1 };
    const normal = sightRate({ ...si, sensitivity: resolveDifficulty('normal', null).perception });
    const half = sightRate({ ...si, sensitivity: resolveDifficulty('custom', { base: 'normal', perception: 0.5, aim: 1, alarm: 1 }).perception });
    expect(normal).toBeGreaterThan(0);
    expect(half).toBeCloseTo(normal / 2, 6);
  });

  it('alarm 2.0 doubles the call-in delay and the panel raise time', () => {
    const d = resolveDifficulty('custom', { base: 'normal', perception: 1, aim: 1, alarm: 2 });
    expect(callInDelay(d.reaction)).toBeCloseTo(ALERT.callIn * 2, 9);
    expect(raiseTime(d.reaction)).toBeCloseTo(ALARM.holdTime * 2, 9);
    expect(callInDelay(DIFFICULTY.normal.reaction)).toBe(ALERT.callIn);
  });

  it('rewards pay the base preset', () => {
    const stats = { mode: 'clear', won: true, byKind: {} } as unknown as Parameters<typeof computeRewards>[0];
    const r = computeRewards(stats, basePreset('custom', { base: 'realistic', perception: 0.5, aim: 0.5, alarm: 2 }));
    expect(r.lines.some((l) => l.label === `Difficulty x${DIFFICULTY.realistic.reward}`)).toBe(true);
  });
});
