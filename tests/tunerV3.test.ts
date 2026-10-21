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
