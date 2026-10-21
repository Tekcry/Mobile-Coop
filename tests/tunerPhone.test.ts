import { describe, expect, it } from 'vitest';
import { emptyPhoneLayout, GESTURE, PHONE_FONT, PHONE_MAX_SIDE, SHEET_MAX_WIDTH, TOUCH_TARGET, TouchGesture, tunerPhoneLayout } from '../src/ui/tunerPhone';
import { clearTouchIn, FREE_CFG, FREE_IN, FreeViewCore, freeSnap } from '../src/player/freeView';

describe('tunerPhoneLayout (marlow-bays item 26; item 29: the viewport size alone decides)', () => {
  it('desktop sizes keep the dock, touch screen or not (the function has no touch input at all)', () => {
    // item 29: a touchscreen laptop at 1920 x 1080 (touch points, a coarse pointer) gets the dock
    for (const [w, h] of [[1920, 1080], [1280, 640], [1366, 768], [1180, 820], [1024, 768]] as const) {
      expect(tunerPhoneLayout(w, h)).toEqual(emptyPhoneLayout());
    }
    expect(tunerPhoneLayout(1080, 1920).mode).toBe('desktop');
  });
  it('a short landscape screen: the side drawer about 36% wide, compact text', () => {
    const l = tunerPhoneLayout(844, 390);
    expect(l).toMatchObject({ mode: 'drawer', width: 304, height: 0, font: PHONE_FONT, target: TOUCH_TARGET });
    expect(tunerPhoneLayout(800, PHONE_MAX_SIDE).mode).toBe('drawer');
    expect(tunerPhoneLayout(800, PHONE_MAX_SIDE + 1).mode).toBe('desktop');
    const s = tunerPhoneLayout(640, 360);
    expect(s.mode).toBe('drawer');
    expect(640 - s.width).toBeGreaterThanOrEqual(640 * 0.55);
  });
  it('portrait: the bottom sheet about 42% high (phones and portrait tablets)', () => {
    const l = tunerPhoneLayout(390, 844);
    expect(l).toMatchObject({ mode: 'sheet', height: 354, width: 0, font: PHONE_FONT, target: TOUCH_TARGET });
    const s = tunerPhoneLayout(360, 640);
    expect(640 - s.height).toBeGreaterThanOrEqual(640 * 0.5);
    // an 820 x 1180 iPad in portrait: the sheet (the dock would take 62% of the width), at the desktop text scale
    const t = tunerPhoneLayout(820, 1180);
    expect(t).toMatchObject({ mode: 'sheet', font: 0, target: TOUCH_TARGET });
    expect(1180 - t.height).toBeGreaterThan(600);
    expect(tunerPhoneLayout(SHEET_MAX_WIDTH + 1, 1400).mode).toBe('desktop');
  });
  it('one density per size: the same layout whatever the input', () => {
    expect(tunerPhoneLayout(844, 390)).toEqual(tunerPhoneLayout(844, 390));
  });
  it('a bad viewport is desktop; the out object is reused', () => {
    expect(tunerPhoneLayout(0, 0).mode).toBe('desktop');
    const o = tunerPhoneLayout(844, 390);
    expect(tunerPhoneLayout(390, 844, o)).toBe(o);
    expect(o.mode).toBe('sheet');
    expect(tunerPhoneLayout(1920, 1080, o)).toBe(o);
    expect(o).toEqual(emptyPhoneLayout());
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
