/**
 * (mocap-trial-2, M4: Michael ~01:25 "On by default") Mocap locomotion is on by default; a save from before MOCAP_V (off
 * was the default) takes the new default once; a later save keeps the stored field.
 * (anim-fix-pass AF5, BRIEF A1: Michael P3 "Mocap off: has old animations which are also still as bad as they originally
 * were") Mocap is the only player path: the Settings row is gone, a stored `mocapLoco: false` boots ON; `?mocap=0` and the
 * tuner box (this page only) still turn it off. No save-shape change: the field stays.
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultSettings, MOCAP_V, sanitizeSettings } from '../src/core/settings';
import { applyMocapSwitch, LOCO, mocapWanted } from '../src/anim/mocap';

const boot = (url: boolean | null, tuner: boolean | null): boolean => mocapWanted(url ?? tuner, true);
const src = (p: string): string => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

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
  it('a save at mocapV 1 keeps the stored field (no save-shape change)', () => {
    const s = sanitizeSettings({ mocapV: 1, gameplay: { mocapLoco: false } });
    expect(s.gameplay.mocapLoco).toBe(false);
    expect(sanitizeSettings(structuredClone(s)).gameplay.mocapLoco).toBe(false);
  });
});

describe('AF5: mocap is the only player path (BRIEF A1)', () => {
  afterEach(() => void applyMocapSwitch(null, true));
  const app = src('src/core/app.ts');

  it('app.ts never resolves the switch from the stored mocapLoco setting', () => {
    // (mixamo-retarget Toggle) the switch is the mocap half of the Animation source (`animSource.ts`): the stored
    // `gameplay.animSource` (default CMU = on), then ?anim=, then ?mocap= and the tuner box (tests/animSource.test.ts)
    const calls = app.match(/applyAnimSource\([^)]*\)/g) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) expect(c).not.toMatch(/mocapLoco/);
    expect(app).not.toMatch(/applyMocapSwitch\(/);
    // the boot and every settings change go through the same resolver: the source, then url, then the tuner box
    // (F45) the setting, Mixamo on /preview/ until picked
    expect(app).toMatch(/applyAnimSource\(\{ setting: settingAnimSource\(this\.settings\.get\(\)\.gameplay, PREVIEW_ON\), url: flags\.anim, mocapUrl: flags\.mocap, mocapTuner, mixamoUrl: flags\.mixamo \}\)/);
    expect(app).toMatch(/get: \(\) => ANIM_SOURCE\.mocap/);
    // the tuner box does not write the save
    expect(app).not.toMatch(/d\.gameplay\.mocapLoco\s*=/);
  });

  it('a stored mocapLoco: false boots ON; ?mocap=0 and the tuner box turn it off', () => {
    const stored = sanitizeSettings({ mocapV: MOCAP_V, gameplay: { mocapLoco: false } });
    expect(stored.gameplay.mocapLoco).toBe(false);
    // the app's resolver (url ?? tuner, over true): no url, no tuner -> ON whatever the save holds
    expect(applyMocapSwitch(null, true)).toBe(true);
    expect(LOCO.mocap).toBe(true);
    // ?mocap=0 -> OFF (the hand-keyed set), ?mocap=1 -> ON
    expect(applyMocapSwitch(false, true)).toBe(false);
    expect(LOCO.mocap).toBe(false);
    expect(applyMocapSwitch(true, true)).toBe(true);
    // the tuner box off (no url) -> OFF; the url wins over the tuner
    expect(boot(null, false)).toBe(false);
    expect(boot(true, false)).toBe(true);
  });

  it('the Settings screen has no Mocap locomotion row and its Gameplay reset leaves the field alone', () => {
    const scr = src('src/ui/screens/settingsScreen.ts');
    expect(scr).not.toMatch(/toggle\('Mocap/);
    expect(scr).not.toMatch(/mocapLoco/);
  });
});
