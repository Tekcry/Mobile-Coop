import { describe, expect, it } from 'vitest';
import { lerpAngle, turnTowards, wrapAngle } from '../src/player/playerController';
import { defaultLook, sanitizeLook } from '../src/cosmetics/avatarLook';

describe('angle helpers', () => {
  it('wraps to [-pi, pi]', () => {
    expect(wrapAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(wrapAngle(-3.5 * Math.PI)).toBeCloseTo(0.5 * Math.PI);
  });
  it('turns the short way and clamps the step', () => {
    expect(turnTowards(3, -3, 0.1)).toBeCloseTo(3.1);
    expect(turnTowards(0, 0.05, 0.1)).toBe(0.05);
  });
  it('lerps across the seam', () => {
    expect(lerpAngle(3, -3, 0.5)).toBeCloseTo(Math.PI, 1);
  });
});

describe('avatar look validation', () => {
  it('rejects bad enums and colours', () => {
    const l = sanitizeLook({ hair: 'afro-laser', colors: { skin: 'red', torso: '#123456' } });
    expect(l.hair).toBe(defaultLook().hair);
    expect(l.colors.skin).toBe(defaultLook().colors.skin);
    expect(l.colors.torso).toBe('#123456');
  });
});

describe('landings', () => {
  it('bands by fall height: soft, roll 2.5-4.5 m, heavy beyond; louder each band', async () => {
    const { landingKind, landingNoise, LANDING } = await import('../src/player/movement');
    expect(landingKind(0.3)).toBe('none');
    expect(landingKind(1.5)).toBe('soft');
    expect(landingKind(LANDING.roll)).toBe('roll');
    expect(landingKind(4.5)).toBe('roll');
    expect(landingKind(4.6)).toBe('heavy');
    expect(landingNoise('soft')).toBeLessThan(landingNoise('roll'));
    expect(landingNoise('roll')).toBeLessThan(landingNoise('heavy'));
    expect(LANDING.heavyRecovery).toBeCloseTo(0.6);
  });
});
