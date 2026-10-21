import { describe, expect, it } from 'vitest';
import { emptyPhoneLayout, GESTURE, nearestMapPart, PAD_ROW, PHONE_FONT, PHONE_MAP_SCALE, PHONE_PAD_FONT, PHONE_PAD_MAP_SCALE, phoneMapHitRadius, TOUCH_TARGET, TouchGesture, tunerPhoneLayout } from '../src/ui/tunerPhone';
import { clearTouchIn, FREE_CFG, FREE_IN, FreeViewCore, freeSnap } from '../src/player/freeView';

describe('tunerPhoneLayout (marlow-bays item 26, 26b)', () => {
  it('keeps the desktop layout without a touch screen, at any size, pad or not', () => {
    for (const [w, h] of [[1920, 1080], [844, 390], [390, 844], [1280, 640]] as const) {
      expect(tunerPhoneLayout(w, h, false).mode).toBe('desktop');
      expect(tunerPhoneLayout(w, h, false, true)).toEqual(emptyPhoneLayout());
    }
  });
  it('keeps the desktop layout on a large touch screen (a tablet)', () => {
    expect(tunerPhoneLayout(1024, 768, true).mode).toBe('desktop');
    expect(tunerPhoneLayout(768, 1024, true, true).mode).toBe('desktop');
  });
  it('touch, landscape: the side drawer about 38% wide, 34 px targets, 13 px text', () => {
    const l = tunerPhoneLayout(844, 390, true);
    expect(l).toMatchObject({ mode: 'drawer', pad: false, width: 321, height: 0, font: PHONE_FONT, target: TOUCH_TARGET, mapScale: PHONE_MAP_SCALE });
    expect(l.font).toBeGreaterThanOrEqual(12);
    expect(l.font).toBeLessThanOrEqual(13);
    expect(l.target).toBeGreaterThanOrEqual(32);
    expect(l.target).toBeLessThanOrEqual(36);
    const s = tunerPhoneLayout(640, 360, true);
    expect(s.mode).toBe('drawer');
    expect(640 - s.width).toBeGreaterThanOrEqual(640 * 0.55);
  });
  it('touch, portrait: the bottom sheet about 45% high', () => {
    const l = tunerPhoneLayout(390, 844, true);
    expect(l).toMatchObject({ mode: 'sheet', pad: false, height: 380, width: 0, target: TOUCH_TARGET });
    const s = tunerPhoneLayout(360, 640, true);
    expect(s.mode).toBe('sheet');
    expect(640 - s.height).toBeGreaterThanOrEqual(640 * 0.5);
  });
  it('pad: smaller again (26 px rows, 11 px text, no touch minimum) and narrower, both orientations', () => {
    const l = tunerPhoneLayout(844, 390, true, true);
    expect(l).toMatchObject({ mode: 'drawer', pad: true, width: 287, font: PHONE_PAD_FONT, target: PAD_ROW, mapScale: PHONE_PAD_MAP_SCALE, mapHitR: 0 });
    const p = tunerPhoneLayout(390, 844, true, true);
    expect(p).toMatchObject({ mode: 'sheet', pad: true, height: 338, target: PAD_ROW });
    expect(l.font).toBeLessThan(tunerPhoneLayout(844, 390, true).font);
    expect(PAD_ROW).toBeLessThan(TOUCH_TARGET);
  });
  it('a bad viewport is desktop; the out object is reused', () => {
    expect(tunerPhoneLayout(0, 0, true).mode).toBe('desktop');
    const o = tunerPhoneLayout(844, 390, true);
    expect(tunerPhoneLayout(844, 390, true, true, o)).toBe(o);
    expect(o.pad).toBe(true);
    expect(tunerPhoneLayout(1920, 1080, false, false, o)).toBe(o);
    expect(o).toEqual(emptyPhoneLayout());
  });
});

describe('the body map on a phone', () => {
  it('a touch hit radius that makes every target at least the touch target across', () => {
    const l = tunerPhoneLayout(844, 390, true);
    expect(l.mapHitR * 2 * l.mapScale).toBeGreaterThanOrEqual(TOUCH_TARGET);
    expect(phoneMapHitRadius(1.5, 44) * 3).toBeGreaterThanOrEqual(44);
  });
  it('picks the nearest centre within the radius', () => {
    const px = [50, 42, 58];
    const py = [72, 78, 78];
    expect(nearestMapPart(px, py, 3, 50, 70, 14.7)).toBe(0);
    expect(nearestMapPart(px, py, 3, 44, 79, 14.7)).toBe(1);
    expect(nearestMapPart(px, py, 3, 60, 80, 14.7)).toBe(2);
    expect(nearestMapPart(px, py, 3, 0, 0, 14.7)).toBe(-1);
  });
});

describe('TouchGesture', () => {
  it('a tap: one finger, no drag, released in time', () => {
    const g = new TouchGesture();
    g.down(1, 100, 100, 0);
    expect(g.move(1, 104, 103)).toBe('none');
    expect(g.up(1, 104, 103, 200)).toBe(true);
    expect([g.tapX, g.tapY]).toEqual([104, 103]);
    expect(g.kind).toBe('none');
  });
  it('a held press is no tap; a cancel is no tap', () => {
    const g = new TouchGesture();
    g.down(1, 100, 100, 0);
    expect(g.up(1, 100, 100, GESTURE.tapMs + 1)).toBe(false);
    g.down(2, 100, 100, 0);
    expect(g.up(2, 100, 100, 10, false)).toBe(false);
  });
  it('one finger dragged orbits, from the press (no lost start), and is no tap', () => {
    const g = new TouchGesture();
    g.down(1, 100, 100, 0);
    expect(g.move(1, 120, 100)).toBe('orbit');
    expect([g.dx, g.dy]).toEqual([20, 0]);
    expect(g.move(1, 130, 95)).toBe('orbit');
    expect([g.dx, g.dy]).toEqual([10, -5]);
    expect(g.up(1, 130, 95, 100)).toBe(false);
  });
  it('two fingers apart: a pinch (zoom in, the log of the spread ratio)', () => {
    const g = new TouchGesture();
    g.down(1, 100, 100, 0);
    g.down(2, 200, 100, 10);
    expect(g.kind).toBe('pending2');
    // one finger at a time: the first alone waits for the other
    expect(g.move(2, 220, 100)).toBe('none');
    expect(g.move(1, 80, 100)).toBe('pinch');
    expect(g.zoom).toBeCloseTo(Math.log(140 / 100), 9);
    expect(g.move(2, 240, 100)).toBe('pinch');
    expect(g.zoom).toBeCloseTo(Math.log(160 / 140), 9);
    // together: no tap, and the one left after a lift does not orbit
    expect(g.up(1, 80, 100, 50)).toBe(false);
    expect(g.kind).toBe('done');
    expect(g.move(2, 300, 300)).toBe('none');
    expect(g.up(2, 300, 300, 60)).toBe(false);
    expect(g.kind).toBe('none');
  });
  it('two fingers together: a pan (the shared travel)', () => {
    const g = new TouchGesture();
    g.down(1, 100, 100, 0);
    g.down(2, 200, 100, 0);
    expect(g.move(1, 114, 100)).toBe('none');
    expect(g.move(2, 214, 100)).toBe('pan');
    expect([g.px, g.py]).toEqual([14, 0]);
    expect(g.move(1, 124, 106)).toBe('pan');
    expect([g.px, g.py]).toEqual([5, 3]);
  });
  it('one finger pulled far from a still one is a pinch', () => {
    const g = new TouchGesture();
    g.down(1, 100, 100, 0);
    g.down(2, 200, 100, 0);
    expect(g.move(2, 220, 100)).toBe('none');
    expect(g.move(2, 230, 100)).toBe('pinch');
    expect(g.zoom).toBeCloseTo(Math.log(130 / 100), 9);
  });
  it('pinching fingers that close zoom out; a third finger is ignored', () => {
    const g = new TouchGesture();
    g.down(1, 100, 100, 0);
    g.down(2, 300, 100, 0);
    g.down(3, 0, 0, 0);
    expect(g.count).toBe(2);
    expect(g.move(3, 50, 50)).toBe('none');
    expect(g.move(2, 285, 100)).toBe('none');
    expect(g.move(1, 115, 100)).toBe('pinch');
    expect(g.zoom).toBeLessThan(0);
  });
  it('reset forgets every finger', () => {
    const g = new TouchGesture();
    g.down(1, 0, 0, 0);
    g.reset();
    expect(g.count).toBe(0);
    expect(g.move(1, 50, 0)).toBe('none');
  });
});

describe('the orbit pan (free view)', () => {
  it('moves the circled point along the view right and up, kept within panMax', () => {
    const c = new FreeViewCore();
    c.start('orbit', 0, 1.2, -3, 0, 0, 0, 0, 0);
    const h0 = c.height;
    c.panR = 1;
    c.panU = 0.25;
    c.place(0, 0, 0);
    // yaw 0 looks along +z: its right is +x
    expect(c.panX).toBeCloseTo(1, 9);
    expect(c.panZ).toBeCloseTo(0, 9);
    expect(c.height).toBeCloseTo(h0 + 0.25, 9);
    expect(c.x).toBeCloseTo(1, 9);
    expect(c.panR).toBe(0);
    c.panR = 100;
    c.place(0, 0, 0);
    expect(Math.sqrt(c.panX * c.panX + c.panZ * c.panZ)).toBeCloseTo(FREE_CFG.panMax, 9);
    c.start('orbit', 0, 1.2, -3, 0, 0, 0, 0, 0);
    expect([c.panX, c.panZ]).toEqual([0, 0]);
  });
  it('a snap or a held snap centres her again (the pan cleared)', () => {
    const c = new FreeViewCore();
    c.start('orbit', 0, 1.2, -3, 0, 0, 0, 0, 0);
    c.panR = 1.5;
    c.place(0, 0, 0);
    expect(c.panX).toBeCloseTo(1.5, 9);
    freeSnap('front', 0, c);
    expect([c.panX, c.panZ]).toEqual([0, 0]);
    c.panR = 1;
    c.place(0, 0, 0);
    expect(c.panX).not.toBe(0);
    c.lock = 'side';
    c.place(0, 0, 0);
    expect([c.panX, c.panZ]).toEqual([0, 0]);
    expect(c.x).toBeCloseTo(-Math.sin(c.yaw) * Math.cos(c.pitch) * c.dist, 9);
    // the plain {yaw, pitch} out still works
    const o = { yaw: 0, pitch: 0 };
    freeSnap('back', 1, o);
    expect(o).toEqual({ yaw: 1, pitch: -0.1 });
  });
  it('clearTouchIn zeroes the touch sums only', () => {
    FREE_IN.wheel = 2;
    FREE_IN.tlx = FREE_IN.tly = FREE_IN.tzoom = FREE_IN.tpx = FREE_IN.tpy = 1;
    clearTouchIn();
    expect([FREE_IN.tlx, FREE_IN.tly, FREE_IN.tzoom, FREE_IN.tpx, FREE_IN.tpy, FREE_IN.wheel]).toEqual([0, 0, 0, 0, 0, 2]);
    FREE_IN.wheel = 0;
  });
});
