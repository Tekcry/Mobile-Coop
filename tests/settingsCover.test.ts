import { describe, expect, it } from 'vitest';
import { sanitizeSettings } from '../src/core/settings';

describe('settings after the cover removal (locomotion 05)', () => {
  it('a saved settings object with the old coverDash key loads and the key is dropped', () => {
    const old = { gameplay: { defaultShoulder: 'left', adsToggle: true, crouchToggle: false, coverDash: false, slowBeat: true, sprintHold: true, autoRecentre: false } };
    const s = sanitizeSettings(old);
    // (anim-rework S1) a save from before pad layout 3: the Aim choice goes back to hold (LT is the held aim)
    expect(s.gameplay).toEqual({ defaultShoulder: 'left', adsToggle: false, crouchToggle: false, slowBeat: true, sprintHold: true, autoRecentre: false, wallToggle: true, grabToggle: true, rumble: 1, courseMarkers: true });
    expect('coverDash' in s.gameplay).toBe(false);
  });
});
