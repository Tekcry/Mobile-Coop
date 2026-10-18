import { describe, expect, it } from 'vitest';
import { InputState } from '../src/input/inputState';
import { menuNavDir } from '../src/game/grabMenu';

describe('menu navigation while walking (F1b)', () => {
  it('D-pad up / down always move the pick', () => {
    const i = new InputState();
    i.setMove('t', 0, 1);
    i.tap('speedDown');
    expect(menuNavDir(i, true)).toBe(1);
    i.consumeEdges();
    i.tap('speedUp');
    expect(menuNavDir(i, true)).toBe(-1);
  });
  it('the stick / arrow taps navigate only while standing still', () => {
    const i = new InputState();
    i.setMove('t', 0, 1);
    i.tap('uiDown');
    expect(menuNavDir(i, true)).toBe(0);
    expect(menuNavDir(i, false)).toBe(1);
    i.setMove('t', 0, 0);
    expect(menuNavDir(i, true)).toBe(1);
  });
});
