// (wheel-ui) the selection wheel's size from the viewport: clear of the top HUD and the hint box, inside the safe area
import { describe, expect, it } from 'vitest';
import { fitWheel, sectorPath, wheelMargin, wheelWant, type WheelLayout } from '../src/ui/hud/wheelLayout';

const out = (): WheelLayout => ({ d: 0, cx: 0, cy: 0, hintX: 0, hintY: 0, below: false });

/** The wheel, the top band and the hint box do not overlap and all stay inside the box. */
function clear(w: number, h: number, top: number, hintW: number, hintH: number): WheelLayout {
  const l = fitWheel({ w, h, top, hintW, hintH }, out());
  const r = l.d / 2;
  expect(l.cy - r).toBeGreaterThanOrEqual(top);
  expect(l.cy + r).toBeLessThanOrEqual(h);
  expect(l.cx - r).toBeGreaterThanOrEqual(0);
  expect(l.cx + r).toBeLessThanOrEqual(w);
  expect(l.hintX).toBeGreaterThanOrEqual(0);
  expect(l.hintY + hintH).toBeLessThanOrEqual(h);
  // the hint box against the wheel's bounding square
  const apart = l.hintX + hintW <= l.cx - r || l.hintY >= l.cy + r;
  expect(apart).toBe(true);
  return l;
}

describe('fitWheel', () => {
  it('1920 x 1080: slightly bigger than the old ~430 px wheel, the hint at the left', () => {
    const l = clear(1920, 1080, 120, 260, 170);
    expect(l.d).toBe(Math.floor(wheelWant(1080)));
    expect(l.d).toBeGreaterThan(430);
    expect(l.d).toBeLessThan(560);
    expect(l.below).toBe(false);
    expect(l.cx).toBe(960);
    expect(l.cy).toBe(540);
  });

  it('2.17:1 (2170 x 1000 and a phone 844 x 390): fits under the top HUD band', () => {
    expect(clear(2170, 1000, 112, 250, 160).d).toBe(Math.floor(wheelWant(1000)));
    const phone = clear(844, 390, 60, 200, 120);
    expect(phone.d).toBeLessThan(wheelWant(390));
    expect(phone.d).toBe(Math.floor(2 * (195 - 60 - wheelMargin(390))));
    expect(phone.below).toBe(false);
  });

  it('a narrow (portrait) box puts the hint under the wheel and shrinks the wheel to keep clear of it', () => {
    const l = clear(390, 844, 60, 200, 140);
    expect(l.below).toBe(true);
    expect(l.d).toBeLessThanOrEqual(390 - 2 * wheelMargin(844));
  });

  it('a tall top band shrinks the wheel; never negative', () => {
    const a = clear(1280, 720, 100, 240, 150).d;
    const b = clear(1280, 720, 220, 240, 150).d;
    expect(b).toBeLessThan(a);
    expect(fitWheel({ w: 100, h: 100, top: 90, hintW: 50, hintH: 50 }, out()).d).toBe(0);
  });
});

describe('sectorPath', () => {
  it('starts on the outer arc at a0 (0 = up) and closes', () => {
    const p = sectorPath(50, 100, 0, Math.PI / 2);
    expect(p).toMatch(/^M0.00 -100.00A100 100 0 0 1 100.00 -?0.00L50.00 -?0.00A50 50 0 0 0 0.00 -50.00Z$/);
    expect(p.endsWith('Z')).toBe(true);
  });
});
