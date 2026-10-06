import { describe, expect, it } from 'vitest';
import { applyAxisDeadzone, applyCurve, applyRadialDeadzone } from '../src/input/stickMath';
import { detectPadStyle, mapPad, PAD, type PadTuning } from '../src/input/gamepadMapping';
import { InputState } from '../src/input/inputState';
import { NavRepeater } from '../src/input/navRepeat';

const tuning: PadTuning = { deadzoneLeft: 0.15, deadzoneRight: 0.12, triggerDeadzone: 0.08, curve: 'linear', invertY: false };
const snap = (buttons: Record<number, number> = {}, axes: number[] = [0, 0, 0, 0]) => ({
  buttons: Array.from({ length: 17 }, (_, i) => buttons[i] ?? 0),
  axes,
});

describe('stick maths', () => {
  it('radial dead zone zeroes small input and rescales the rest', () => {
    expect(applyRadialDeadzone(0.1, 0.05, 0.15)).toEqual({ x: 0, y: 0 });
    const v = applyRadialDeadzone(0.575, 0, 0.15, 1);
    expect(v.x).toBeCloseTo(0.5, 5);
    const full = applyRadialDeadzone(1, 0, 0.15);
    expect(full.x).toBeCloseTo(1, 5);
  });
  it('preserves direction', () => {
    const v = applyRadialDeadzone(0.5, 0.5, 0.1);
    expect(v.x).toBeCloseTo(v.y, 6);
  });
  it('axis dead zone', () => {
    expect(applyAxisDeadzone(0.05, 0.08)).toBe(0);
    expect(applyAxisDeadzone(1, 0.08)).toBe(1);
    expect(applyAxisDeadzone(-0.54, 0.08)).toBeCloseTo(-0.5, 5);
  });
  it('curves keep 0 and 1 fixed and order precise < linear < aggressive at mid input', () => {
    const mid = { x: 0.5, y: 0 };
    expect(applyCurve({ x: 1, y: 0 }, 'precise').x).toBeCloseTo(1);
    expect(applyCurve({ x: 0, y: 0 }, 'classic').x).toBe(0);
    const p = applyCurve(mid, 'precise').x;
    const l = applyCurve(mid, 'linear').x;
    const a = applyCurve(mid, 'aggressive').x;
    expect(p).toBeLessThan(l);
    expect(l).toBeLessThan(a);
  });
});

describe('gamepad mapping', () => {
  it('maps the standard layout to gameplay and UI actions', () => {
    const f = mapPad(snap({ [PAD.A]: 1, [PAD.X]: 1, [PAD.RB]: 1, [PAD.START]: 1 }), tuning);
    expect(f.buttons.cover).toBe(true);
    expect(f.buttons.jump).toBeUndefined();
    expect(f.buttons.uiConfirm).toBe(true);
    expect(f.buttons.reload).toBe(true);
    expect(f.buttons.swapNext).toBe(true);
    expect(f.buttons.uiTabNext).toBe(true);
    expect(f.buttons.pause).toBe(true);
    expect(f.buttons.fire).toBeUndefined();
  });
  it('B is crouch in game and back in menus; Y traverse + interact; d-pad quick items', () => {
    const f = mapPad(snap({ [PAD.B]: 1, [PAD.Y]: 1, [PAD.UP]: 1, [PAD.LEFT]: 1 }), tuning);
    expect(f.buttons.crouch && f.buttons.uiBack && f.buttons.interact && f.buttons.jump).toBe(true);
    expect(f.buttons.cover).toBeUndefined();
    expect(f.buttons.quick1 && f.buttons.quick4 && f.buttons.uiUp && f.buttons.uiLeft).toBe(true);
  });
  it('triggers: RT fires, LT aims, respecting dead zone', () => {
    expect(mapPad(snap({ [PAD.RT]: 0.9, [PAD.LT]: 0.9 }), tuning).buttons).toMatchObject({ fire: true, ads: true });
    expect(mapPad(snap({ [PAD.RT]: 0.05 }), tuning).buttons.fire).toBeUndefined();
  });
  it('left stick: up is forward; right stick: up looks up unless inverted', () => {
    const f = mapPad(snap({}, [0, -1, 0, -1]), tuning);
    expect(f.move.y).toBeGreaterThan(0.9);
    expect(f.look.y).toBeGreaterThan(0.9);
    const inv = mapPad(snap({}, [0, 0, 0, -1]), { ...tuning, invertY: true });
    expect(inv.look.y).toBeLessThan(-0.9);
  });
  it('left stick also produces menu directions', () => {
    expect(mapPad(snap({}, [0, 0.9, 0, 0]), tuning).buttons.uiDown).toBe(true);
    expect(mapPad(snap({}, [-0.9, 0.2, 0, 0]), tuning).buttons.uiLeft).toBe(true);
    expect(mapPad(snap({}, [0.3, 0.2, 0, 0]), tuning).buttons.uiRight).toBeUndefined();
  });
  it('idle pad is inactive; drift inside dead zone stays inactive', () => {
    expect(mapPad(snap({}, [0.05, -0.08, 0.04, 0.02]), tuning).active).toBe(false);
  });
  it('detects controller families for glyphs', () => {
    expect(detectPadStyle('DualSense Wireless Controller')).toBe('playstation');
    expect(detectPadStyle('Xbox Wireless Controller')).toBe('xbox');
    expect(detectPadStyle('Pro Controller (Nintendo)')).toBe('nintendo');
  });
});

describe('InputState', () => {
  it('latches edges until consumed and merges sources', () => {
    const s = new InputState();
    s.set('a', 'fire', true);
    s.set('b', 'fire', true);
    s.set('a', 'fire', false);
    expect(s.down('fire')).toBe(true);
    expect(s.pressed('fire')).toBe(true);
    s.consumeEdges();
    expect(s.pressed('fire')).toBe(false);
    s.set('b', 'fire', false);
    expect(s.buttons.fire.released).toBe(true);
  });
  it('move takes the strongest source and clamps to unit length', () => {
    const s = new InputState();
    s.setMove('touch', 0.2, 0);
    s.setMove('pad', 1, 1);
    expect(Math.hypot(s.move.x, s.move.y)).toBeCloseTo(1);
    s.setMove('pad', 0, 0);
    expect(s.move.x).toBeCloseTo(0.2);
  });
  it('releaseAll blocks held buttons until released (no phantom presses)', () => {
    const s = new InputState();
    s.set('pad', 'pause', true);
    s.consumeEdges();
    s.releaseAll();
    s.set('pad', 'pause', true); // still physically held
    expect(s.pressed('pause')).toBe(false);
    expect(s.down('pause')).toBe(false);
    s.set('pad', 'pause', false);
    s.set('pad', 'pause', true);
    expect(s.pressed('pause')).toBe(true);
  });
  it('look accumulates and is consumed', () => {
    const s = new InputState();
    s.addLook(0.1, 0.2);
    s.addLook(0.1, 0);
    expect(s.consumeLook()).toEqual({ x: 0.2, y: 0.2 });
    expect(s.consumeLook()).toEqual({ x: 0, y: 0 });
  });
});

describe('NavRepeater', () => {
  it('fires once on press, then repeats after the delay', () => {
    const r = new NavRepeater(0.4, 0.1);
    expect(r.update(true, 0)).toBe(true);
    expect(r.update(true, 0.2)).toBe(false);
    expect(r.update(true, 0.41)).toBe(true);
    expect(r.update(true, 0.45)).toBe(false);
    expect(r.update(true, 0.52)).toBe(true);
    expect(r.update(false, 0.6)).toBe(false);
    expect(r.update(true, 0.61)).toBe(true);
  });
});

describe('holds and the drop alias', () => {
  it('crouch also raises drop (same holders); releasing either source releases both', () => {
    const s = new InputState();
    s.set('pad', 'crouch', true);
    expect(s.pressed('drop')).toBe(true);
    expect(s.down('drop')).toBe(true);
    s.set('pad', 'crouch', false);
    expect(s.down('drop')).toBe(false);
    expect(s.buttons.drop.released).toBe(true);
  });

  it('hold time and progress; interactHold goes down after the hold delay and up on release', () => {
    const s = new InputState();
    s.set('pad', 'interact', true);
    s.tick(0.1);
    expect(s.heldTime('interact')).toBeCloseTo(0.1);
    expect(s.down('interactHold')).toBe(false);
    s.tick(0.25);
    expect(s.down('interactHold')).toBe(true);
    expect(s.pressed('interactHold')).toBe(true);
    expect(s.holdProgress('interact', 1, 0.3)).toBeCloseTo(0.05);
    expect(s.holdProgress('interact', 0.01)).toBe(1);
    s.set('pad', 'interact', false);
    s.tick(0.016);
    expect(s.down('interactHold')).toBe(false);
    expect(s.heldTime('interact')).toBe(0);
    // a quick tap never becomes a hold
    s.consumeEdges();
    s.set('pad', 'interact', true);
    s.tick(0.1);
    s.set('pad', 'interact', false);
    s.tick(0.3);
    expect(s.pressed('interactHold')).toBe(false);
  });
});
