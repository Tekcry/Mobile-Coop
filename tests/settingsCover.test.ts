import { describe, expect, it } from 'vitest';
import { sanitizeSettings } from '../src/core/settings';

describe('settings after the cover removal (locomotion 05)', () => {
  it('a saved settings object with the old coverDash key loads and the key is dropped', () => {
    const old = { gameplay: { defaultShoulder: 'left', adsToggle: true, crouchToggle: false, coverDash: false, slowBeat: true, sprintHold: true, autoRecentre: false } };
    const s = sanitizeSettings(old);
    expect(s.gameplay).toEqual({ defaultShoulder: 'left', adsToggle: true, crouchToggle: false, slowBeat: true, sprintHold: true, autoRecentre: false, wallToggle: true, grabToggle: true, rumble: 1 });
    expect('coverDash' in s.gameplay).toBe(false);
  });
});
