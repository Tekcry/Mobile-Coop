/**
 * (mocap-trial-2, M4: Michael ~01:25 "On by default") Mocap locomotion is on by default; a save from before MOCAP_V (off
 * was the default) takes the new default once; a later save keeps the player's choice.
 */
import { describe, expect, it } from 'vitest';
import { defaultSettings, MOCAP_V, sanitizeSettings } from '../src/core/settings';

describe('settings: mocap locomotion on by default (M4, mocapV 1)', () => {
  it('the default is on, at the current version', () => {
    const d = defaultSettings();
    expect(d.gameplay.mocapLoco).toBe(true);
    expect(d.mocapV).toBe(MOCAP_V);
  });
  it('a pre-M4 save (no mocapV, off stored) turns on once', () => {
    const s = sanitizeSettings({ gameplay: { mocapLoco: false } });
    expect(s.gameplay.mocapLoco).toBe(true);
    expect(s.mocapV).toBe(MOCAP_V);
  });
  it('a save at mocapV 1 keeps the player choosing off', () => {
    const s = sanitizeSettings({ mocapV: 1, gameplay: { mocapLoco: false } });
    expect(s.gameplay.mocapLoco).toBe(false);
    expect(sanitizeSettings(structuredClone(s)).gameplay.mocapLoco).toBe(false);
  });
});
