import { describe, expect, it } from 'vitest';
import { sanitizeSettings } from '../src/core/settings';

describe('settings after the cover removal (locomotion 05)', () => {
  it('a saved settings object with the old coverDash key loads and the key is dropped', () => {
    const old = { gameplay: { defaultShoulder: 'left', adsToggle: true, crouchToggle: false, coverDash: false, slowBeat: true, sprintHold: true, autoRecentre: false } };
    const s = sanitizeSettings(old);
    // (anim-rework S1, Michael 15:25 "Remove it") the aim toggle is gone: its stored key is dropped
    expect(s.gameplay).toEqual({ defaultShoulder: 'left', crouchToggle: false, slowBeat: true, sprintHold: true, autoRecentre: false, wallToggle: true, grabToggle: true, rumble: 1, courseMarkers: true, hints: false, mocapLoco: true, animSource: 'cmu', animSourceSet: false });
    expect('coverDash' in s.gameplay).toBe(false);
  });
});
