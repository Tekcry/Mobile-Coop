import { describe, expect, it } from 'vitest';
import { pickSpatial, pickWrap, type Rect } from '../src/ui/spatial';
import { defaultSettings, sanitizeSettings } from '../src/core/settings';

const r = (x: number, y: number, w = 100, h = 40): Rect => ({ x, y, w, h });

describe('spatial focus navigation', () => {
  const list = [r(0, 0), r(0, 50), r(0, 100), r(200, 50)];
  it('moves down a vertical list', () => {
    expect(pickSpatial(list[0]!, list.slice(1), 'down')).toBe(0);
  });
  it('prefers aligned neighbours over closer diagonal ones', () => {
    const from = r(0, 50);
    const cands = [r(150, 0, 100, 40), r(220, 50)];
    expect(pickSpatial(from, cands, 'right')).toBe(1);
  });
  it('returns -1 when nothing is in that direction, and wraps when asked', () => {
    expect(pickSpatial(list[2]!, [list[0]!, list[1]!], 'down')).toBe(-1);
    expect(pickWrap(list[2]!, [list[0]!, list[1]!], 'down')).toBe(0);
  });
});

describe('settings sanitising', () => {
  it('fills defaults for missing data', () => {
    expect(sanitizeSettings(undefined)).toEqual(defaultSettings());
    expect(sanitizeSettings('garbage')).toEqual(defaultSettings());
  });
  it('clamps numbers and rejects bad enums', () => {
    const s = sanitizeSettings({
      gamepad: { deadzoneLeft: 9, curve: 'wobbly', invertY: 'yes' },
      video: { renderScale: Number.NaN },
    });
    expect(s.gamepad.deadzoneLeft).toBe(0.5);
    expect(s.gamepad.curve).toBe('classic');
    expect(s.gamepad.invertY).toBe(false);
    expect(s.video.renderScale).toBe(1);
  });
  it('keeps valid user values', () => {
    // no aim assist (G16): an old stored aimAssist value is dropped, the rest kept
    const s = sanitizeSettings({ gamepad: { aimAssist: 'high', invertY: true }, audio: { music: 0.25 } });
    expect(s.gamepad).not.toHaveProperty('aimAssist');
    expect(s.gamepad.invertY).toBe(true);
    expect(s.audio.music).toBe(0.25);
  });
  it('moves an untouched old music default to 15 % once', () => {
    expect(sanitizeSettings({}).audio.music).toBe(0.15);
    expect(sanitizeSettings({ audio: { music: 0.5 } }).audio.music).toBe(0.15);
    expect(sanitizeSettings({ audio: { music: 0.3, musicV: 2 } }).audio.music).toBe(0.15);
    expect(sanitizeSettings({ audio: { music: 0.3 } }).audio.music).toBe(0.3);
    expect(sanitizeSettings({ audio: { music: 0.5, musicV: 2 } }).audio.music).toBe(0.5);
    expect(sanitizeSettings({ audio: { music: 0.3, musicV: 3 } }).audio.music).toBe(0.3);
    expect(sanitizeSettings({ audio: { music: 0.3, musicV: 2 } }).audio.musicV).toBe(3);
  });
});

describe('spatial focus: multi-column panels', () => {
  it('moves down to a slightly offset button instead of a far, wide row', () => {
    const from = { x: 539, y: 130, w: 118, h: 44 };
    const upgrade = { x: 680, y: 215, w: 144, h: 36 };
    const wideRow = { x: 383, y: 472, w: 456, h: 48 };
    expect(pickSpatial(from, [wideRow, upgrade], 'down')).toBe(1);
  });
});

describe('accessibility settings', () => {
  it('accessibility settings are clamped', () => {
    const s = sanitizeSettings({ access: { hudScale: 9, shake: -1, subtitles: 'no', holdToggle: true } });
    // (locomotion step 15) the health bar is on by default; a stored false is kept
    expect(s.access).toMatchObject({ hudScale: 1.4, shake: 0, subtitles: true, holdToggle: true, healthBar: true });
    expect(sanitizeSettings({ access: { healthBar: false } }).access.healthBar).toBe(false);
  });
});

describe('menu focus rules (menu-ui slice 2, SPEC 4.3)', () => {
  it('a held adjust turns fast after 1 s of chained repeats; a pause or a new direction restarts it', async () => {
    const { adjustHold, ADJUST_FAST_S } = await import('../src/ui/focusNav');
    let st = adjustHold(0, -1, 0, 1, 10);
    expect(st.fast).toBe(false);
    let at = 10;
    for (let t = 10.11; t < 10 + ADJUST_FAST_S + 0.2; t += 0.11) {
      st = adjustHold(1, at, st.start, 1, t);
      at = t;
    }
    expect(st.fast).toBe(true);
    expect(adjustHold(1, at, st.start, -1, at + 0.1).fast).toBe(false);
    expect(adjustHold(1, at, st.start, 1, at + 2).fast).toBe(false);
  });
  it('wrap picks the far end of the same column; a grid (no data-wrap) has no wrap in pickSpatial', () => {
    const col: Rect[] = [0, 1, 2, 3].map((i) => ({ x: 0, y: i * 40, w: 200, h: 32 }));
    const from = col[3]!;
    expect(pickSpatial(from, col.slice(0, 3), 'down')).toBe(-1);
    expect(pickWrap(from, col.slice(0, 3), 'down')).toBe(0);
  });
  it('slugs give stable keys', async () => {
    const { slug } = await import('../src/ui/widgets');
    expect(slug('Look sensitivity (horizontal)')).toBe('look-sensitivity-horizontal');
    expect(slug('Export report (HTML with photos)')).toBe('export-report-html-with-photos');
  });
});
