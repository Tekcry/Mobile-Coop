/**
 * (marlow-bays item 29, tuner v3) The pure parts that are not the pad map or the layout (those are in
 * `animTunePad.test.ts`, `tunerPhone.test.ts`, `tunerLayout.test.ts`): a touch never changes the input mode (a tap during
 * pad play keeps the pad's glyphs), a mouse press still selects keyboard / mouse.
 */
import { describe, expect, it } from 'vitest';
import { pointerMode } from '../src/input/inputManager';

describe('pointerMode (item 29: a touch keeps the mode)', () => {
  it('a mouse press selects keyboard / mouse; a touch or a pen changes nothing', () => {
    expect(pointerMode('mouse')).toBe('kbm');
    expect(pointerMode('touch')).toBeNull();
    expect(pointerMode('pen')).toBeNull();
    expect(pointerMode('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------------------------
// (item 29 phase 2) game touch, the keyed pin, the foot slide line, the view aids
// ---------------------------------------------------------------------------------------------------------------
import { lastTouchAfter, TouchLook, touchLookDelta, TOUCH_LOOK_RAD_PER_PX } from '../src/input/touchLook';
import { CLIP_BODY, CHAMBER, chamberBodyPin, chamberEntry, chamberReset } from '../src/anim/chamber';
import { TUNE_PIN, tuneBodyGroup } from '../src/anim/tune';
import { footSlideTenths, footSlideText, footSlideWarn, loopGroups } from '../src/ui/tunerLayout';

describe('game touch (item 29: menus + camera)', () => {
  it('one finger drags the look; a second finger is ignored until the first lifts', () => {
    const t = new TouchLook();
    expect(t.down(1, 100, 100)).toBe(true);
    expect(t.down(2, 300, 300)).toBe(false);
    expect(t.move(2, 310, 300)).toBe(false);
    expect(t.move(1, 120, 95)).toBe(true);
    expect([t.dx, t.dy]).toEqual([20, -5]);
    expect(t.move(1, 120, 95)).toBe(false);
    t.up(2);
    expect(t.active).toBe(true);
    t.up(1);
    expect(t.active).toBe(false);
    expect(t.down(2, 0, 0)).toBe(true);
    t.reset();
    expect(t.active).toBe(false);
  });
  it('the look follows the mouse sensitivity and invert; the last input is a touch until a mouse press', () => {
    const o = { yaw: 0, pitch: 0 };
    touchLookDelta(100, 50, 2, false, o);
    expect(o.yaw).toBeCloseTo(100 * TOUCH_LOOK_RAD_PER_PX * 2);
    expect(o.pitch).toBeCloseTo(-50 * TOUCH_LOOK_RAD_PER_PX * 2);
    touchLookDelta(0, 50, 1, true, o);
    expect(o.pitch).toBeGreaterThan(0);
    expect(lastTouchAfter(false, 'touch')).toBe(true);
    expect(lastTouchAfter(true, 'mouse')).toBe(false);
    expect(lastTouchAfter(true, 'pen')).toBe(true);
  });
});

describe('the keyed pin (item 29: the Body sliders reach the keyed clip)', () => {
  it('her keyed clips pin their state; procedural states, guard clips and co-op pairs do not', () => {
    expect(chamberBodyPin(chamberEntry('keyed:jog'))).toBe('jog');
    expect(chamberBodyPin(chamberEntry('keyed:glide_fwd'))).toBe('aim');
    expect(chamberBodyPin(chamberEntry('pair:hold_idle'))).toBe('hold');
    expect(chamberBodyPin(chamberEntry('state:jog'))).toBe('');
    expect(chamberBodyPin(chamberEntry('keyed:guard_held_hands'))).toBe('');
    // the panel and the pin agree on every clip
    for (const clip of Object.keys(CLIP_BODY)) expect(loopGroups(`keyed:${clip}`).body).toBe(CLIP_BODY[clip]);
  });
  it('the pin applies to the pinned rig only', () => {
    const rig = {};
    const other = {};
    const still = { speed: 0, crouch: 0, aim: 0 };
    TUNE_PIN.body = 'jog';
    TUNE_PIN.rig = rig;
    try {
      expect(tuneBodyGroup(still, false, false, rig)).toBe('jog');
      expect(tuneBodyGroup(still, false, false, other)).toBe('idle');
    } finally {
      TUNE_PIN.body = '';
      TUNE_PIN.rig = null;
    }
    expect(tuneBodyGroup(still, false, false, rig)).toBe('idle');
  });
});

describe('the chamber (item 29 phase 2)', () => {
  it('the view aids start off', () => {
    chamberReset();
    expect([CHAMBER.skeleton, CHAMBER.feet, CHAMBER.onion]).toEqual([false, false, false]);
  });
  it('the foot slide line: tenths of a cm, amber over 0.5 cm', () => {
    expect(footSlideTenths(0.04)).toBe(0);
    expect(footSlideTenths(0.55)).toBe(6);
    expect(footSlideTenths(Number.NaN)).toBe(0);
    expect(footSlideText(0, 12)).toBe('Foot slide L 0.0 cm  R 1.2 cm');
    expect(footSlideWarn(5, 5)).toBe(false);
    expect(footSlideWarn(6, 0)).toBe(true);
  });
});
