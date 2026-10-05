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
      touch: { opacity: -1, layout: { fire: { x: 2, y: 0.5, scale: 0.1 } } },
      video: { renderScale: Number.NaN },
    });
    expect(s.gamepad.deadzoneLeft).toBe(0.5);
    expect(s.gamepad.curve).toBe('classic');
    expect(s.gamepad.invertY).toBe(false);
    expect(s.touch.opacity).toBe(0.1);
    expect(s.touch.layout.fire).toEqual({ x: 1, y: 0.5, scale: 0.5 });
    expect(s.video.renderScale).toBe(1);
  });
  it('keeps valid user values', () => {
    const s = sanitizeSettings({ gamepad: { aimAssist: 'high', invertY: true }, audio: { music: 0.25 } });
    expect(s.gamepad.aimAssist).toBe('high');
    expect(s.gamepad.invertY).toBe(true);
    expect(s.audio.music).toBe(0.25);
  });
});
