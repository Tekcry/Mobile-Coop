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
      touch: { opacity: -1, layoutVersion: 2, layout: { fire: { x: 2, y: 0.5, scale: 0.1 } } },
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

describe('spatial focus: multi-column panels', () => {
  it('moves down to a slightly offset button instead of a far, wide row', () => {
    const from = { x: 539, y: 130, w: 118, h: 44 };
    const upgrade = { x: 680, y: 215, w: 144, h: 36 };
    const wideRow = { x: 383, y: 472, w: 456, h: 48 };
    expect(pickSpatial(from, [wideRow, upgrade], 'down')).toBe(1);
  });
});

describe('touch layout migration (v1 -> v2)', () => {
  it('moves untouched v1 placements and the old fire stick to the new defaults, keeps customised ones', () => {
    const d = defaultSettings();
    const s = sanitizeSettings({
      touch: {
        layout: {
          move: { x: 0.16, y: 0.7, scale: 1 }, // v1 default
          fire: { x: 0.8, y: 0.6, scale: 1.2 }, // customised fire stick (role changed)
          reload: { x: 0.5, y: 0.5, scale: 1 }, // customised
          jump: { x: 0.9, y: 0.9, scale: 1 }, // removed control
        },
      },
    });
    expect(s.touch.layoutVersion).toBe(4);
    expect(s.touch.layout.move).toEqual(d.touch.layout.move);
    expect(s.touch.layout.fire).toEqual(d.touch.layout.fire);
    expect(s.touch.layout.reload).toEqual({ x: 0.5, y: 0.5, scale: 1 });
    expect(s.touch.layout.look).toEqual(d.touch.layout.look);
    expect(s.touch.layout.action).toEqual(d.touch.layout.action);
    expect((s.touch.layout as Record<string, unknown>).jump).toBeUndefined();
    expect(s.touch.dashFlick).toBe(false);
  });
  it('keeps v2 layouts and per-control opacity as stored', () => {
    const s = sanitizeSettings({ touch: { layoutVersion: 2, layout: { fire: { x: 0.3, y: 0.4, scale: 1, alpha: 0.5 } } } });
    expect(s.touch.layout.fire).toEqual({ x: 0.3, y: 0.4, scale: 1, alpha: 0.5 });
  });
  it('v2 -> v3 keeps every customised placement and adds the takedown button', () => {
    const d = defaultSettings();
    const s = sanitizeSettings({ touch: { layoutVersion: 2, layout: { mark: { x: 0.2, y: 0.2, scale: 1.2 }, look: { x: 0.8, y: 0.8, scale: 1 } } } });
    expect(s.touch.layout.mark).toEqual({ x: 0.2, y: 0.2, scale: 1.2 });
    expect(s.touch.layout.look).toEqual({ x: 0.8, y: 0.8, scale: 1 });
    expect(s.touch.layout.takedown).toEqual(d.touch.layout.takedown);
    expect(s.touch.layoutVersion).toBe(4);
  });
  it('v3 -> v4 keeps every stored placement and adds the speed rocker at its default spot', () => {
    const d = defaultSettings();
    const stored = { mark: { x: 0.2, y: 0.2, scale: 1.2 }, look: { x: 0.8, y: 0.8, scale: 1 }, takedown: { x: 0.5, y: 0.3, scale: 0.9, alpha: 0.7 }, move: { x: 0.1, y: 0.6, scale: 1.1 } };
    const s = sanitizeSettings({ touch: { layoutVersion: 3, layout: stored } });
    expect(s.touch.layout.mark).toEqual(stored.mark);
    expect(s.touch.layout.look).toEqual(stored.look);
    expect(s.touch.layout.takedown).toEqual(stored.takedown);
    expect(s.touch.layout.move).toEqual(stored.move);
    expect(s.touch.layout.speed).toEqual(d.touch.layout.speed);
    // right of the move stick's zone (the left 42%), clear of it by its centre
    expect(d.touch.layout.speed.x).toBeGreaterThan(0.42);
    expect(s.touch.layoutVersion).toBe(4);
  });
  it('accessibility settings are clamped', () => {
    const s = sanitizeSettings({ access: { hudScale: 9, shake: -1, subtitles: 'no', holdToggle: true } });
    expect(s.access).toMatchObject({ hudScale: 1.4, shake: 0, subtitles: true, holdToggle: true, healthBar: false });
  });
  it('presets cover every control and the left-handed one mirrors', async () => {
    const { LAYOUT_PRESETS, TOUCH_CONTROL_IDS } = await import('../src/core/settings');
    for (const l of Object.values(LAYOUT_PRESETS)) for (const id of TOUCH_CONTROL_IDS) expect(l[id]).toBeDefined();
    expect(LAYOUT_PRESETS.lefty.fire.x).toBeCloseTo(1 - LAYOUT_PRESETS.default.fire.x);
  });
});
