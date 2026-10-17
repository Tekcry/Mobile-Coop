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
    const s = sanitizeSettings({ gamepad: { aimAssist: 'high', invertY: true }, audio: { music: 0.25 } });
    expect(s.gamepad.aimAssist).toBe('high');
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
