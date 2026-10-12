import { describe, expect, it } from 'vitest';
import { ACTIONS, conflicts, hintItems, padBindingWords } from '../../src/editor/actions';
import { HOLD, PAD, PadState, padWords, REPEAT_EVERY, REPEAT_FIRST } from '../../src/editor/pad';

describe('pad reading', () => {
  const snap = (down: number[], axes = [0, 0, 0, 0]): { buttons: number[]; axes: number[] } => ({ buttons: Array.from({ length: 17 }, (_, i) => (down.includes(i) ? 1 : 0)), axes });

  it('tells a tap from a hold (X redo)', () => {
    const p = new PadState();
    p.update(snap([PAD.X]), 0);
    p.update(snap([]), 0.1);
    expect(p.xTap).toBe('tap');
    p.update(snap([PAD.Y]), 1);
    p.update(snap([PAD.Y]), 1 + HOLD.Y + 0.01);
    expect(p.yTap).toBe('hold');
    p.update(snap([]), 2);
    expect(p.yTap).toBeNull();
  });

  it('edges and D-pad repeat', () => {
    const p = new PadState();
    p.update(snap([PAD.UP]), 0);
    expect(p.pressed(PAD.UP) && p.repeat(PAD.UP)).toBe(true);
    p.update(snap([PAD.UP]), REPEAT_FIRST - 0.01);
    expect(p.repeat(PAD.UP)).toBe(false);
    p.update(snap([PAD.UP]), REPEAT_FIRST + 0.01);
    expect(p.repeat(PAD.UP)).toBe(true);
    p.update(snap([PAD.UP]), REPEAT_FIRST + REPEAT_EVERY / 2);
    expect(p.repeat(PAD.UP)).toBe(false);
    p.update(snap([]), 2);
    expect(p.released(PAD.UP)).toBe(true);
  });

  it('sticks use the dead zone; resting sticks are not activity', () => {
    const p = new PadState();
    p.update(snap([], [0.1, 0.1, 0, 0]), 0);
    expect(p.active).toBe(false);
    p.update(snap([], [1, 0, 0, 0]), 0.1);
    expect(p.active).toBe(true);
    expect(p.ls.x).toBeGreaterThan(0.9);
  });

  it('button words follow the controller style', () => {
    expect(padWords('Y hold', 'playstation')).toBe('△ hold');
    expect(padWords('LT/RT', 'playstation')).toBe('L2/R2');
    expect(padWords('Menu', 'xbox')).toBe('Menu');
    expect(padWords('A', 'nintendo')).toBe('B');
  });
});

describe('pad bindings in the action map', () => {
  it('no pad button is used twice in one context', () => {
    expect(conflicts()).toEqual([]);
  });

  it('every action has a binding on some device; the hint bar shows pad words when the pad was used last', () => {
    for (const a of ACTIONS) expect(a.keys.length || a.mouse || a.pad?.length).toBeTruthy();
    expect(hintItems('menu', 'pad', 'playstation').map((i) => i.keys)).toContain('✕');
    expect(padBindingWords(ACTIONS.find((a) => a.id === 'redo')!, 'xbox')).toBe('X hold');
  });

  it('the hint bar follows the ON0a state, at most 5 prompts', () => {
    const words = (c: Parameters<typeof hintItems>[0]): string => hintItems(c, 'pad').map((i) => `${i.keys} ${i.name}`).join(', ');
    expect(words('idle')).toBe('A Select, Y Menu, X Undo, LS click Walk, Menu Hub');
    expect(words('selected')).toBe('D-pad Edit, A Grab, Y Menu, B Clear, RB Go to');
    expect(words('menu')).toBe('D-pad Move, A Pick, LB / RB Tab, B Close');
    expect(words('card')).toBe('D-pad Edit, A Done, Y Menu, B Back, RB Go to');
    expect(hintItems('drag', 'pad').find((i) => i.keys === 'RB')?.name).toBe('Turn 90');
    expect(hintItems('hub', 'pad').map((i) => i.keys)).toEqual(['LB / RB', 'D-pad up/down', 'D-pad left/right', 'A', 'B / Menu']);
    expect(hintItems('hub', 'keys').map((i) => i.keys)).toContain('Esc / H');
    for (const c of ['idle', 'selected', 'card', 'drag', 'draw', 'menu', 'hub'] as const) expect(hintItems(c, 'pad').length).toBeLessThanOrEqual(5);
  });

  it('no wheels: Y is the menu (Space with the keys), RB hold is free, no wheel words anywhere', () => {
    expect(ACTIONS.find((a) => a.id === 'menu')).toMatchObject({ keys: ['Space'], pad: ['Y'] });
    expect(ACTIONS.some((a) => (a.pad ?? []).some((b) => b === 'RB hold' || b === 'Y hold'))).toBe(false);
    expect(ACTIONS.some((a) => /wheel/i.test(a.name))).toBe(false);
    expect(ACTIONS.some((a) => /Save, Revert, Walk/.test(a.name))).toBe(false);
  });
});

describe('ON0b: LB hint bar', () => {
  it('while LB is held the pad hint bar says the camera height binding (and nothing clashes)', async () => {
    const { conflicts, hintItems } = await import('../../src/editor/actions');
    expect(conflicts()).toEqual([]);
    const lb = hintItems('idle', 'pad', 'xbox', true);
    expect(lb.map((i) => `${i.keys} ${i.name}`)).toEqual(['LB + RS Height', 'LB Slow']);
    expect(hintItems('menu', 'pad', 'xbox', true).map((i) => i.id)).toEqual(hintItems('menu', 'pad', 'xbox').map((i) => i.id));
    expect(hintItems('idle', 'pad', 'xbox').map((i) => i.id)).not.toContain('camHeight');
  });
});
