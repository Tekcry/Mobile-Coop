import { describe, expect, it } from 'vitest';
import { assignBind, bindable, bindLabel, BINDS, clearBind, defaultBinds, keyActionMap, keyName, sanitizeBinds } from '../src/input/keyBindings';

describe('key bindings', () => {
  it('defaults match the documented keyboard layout', () => {
    const m = keyActionMap(defaultBinds());
    // (CT prototype A3, G96) Space jump, E interact / context, Shift back-to-wall, F / PageDown co-op action; plus the menu keys (menu-ui MD11)
    expect(m.get('Space')).toEqual(['jump', 'uiConfirm']);
    expect(m.get('KeyE')).toEqual(['interact', 'uiTabNext']);
    expect(m.get('ShiftLeft')).toEqual(['cover']);
    expect(m.get('KeyF')).toEqual(['ping', 'uiAlt']);
    expect(m.get('PageDown')).toEqual(['ping']);
    // (menu-ui slice 2, MD11) menu extras on the same keys: Space confirms, E next tab, R = the X action, F = the Y action
    expect(m.get('KeyR')).toEqual(['reload', 'uiX']);
    expect(m.get('Escape')).toEqual(['pause', 'uiBack']);
    expect(m.get('KeyQ')).toEqual(['swapPrev', 'uiTabPrev']);
    // 3.2.0 speed gears (the wheel steps them too, fixed in the source)
    expect(m.get('Equal')).toEqual(['speedUp']);
    expect(m.get('Minus')).toEqual(['speedDown']);
  });
  it('(step 18, D7) a key already in use stays there too (a conflict, warned) and the other action is named', () => {
    const b = defaultBinds();
    expect(assignBind(b, 'reload', 0, 'KeyE')).toBe('interact');
    expect(b.reload).toEqual(['KeyE']);
    expect(b.interact).toEqual(['KeyE']);
    expect(assignBind(b, 'crouch', 1, 'Mouse3')).toBeNull();
    expect(b.crouch).toEqual(['KeyC', 'Mouse3']);
    clearBind(b, 'crouch', 0);
    expect(b.crouch).toEqual(['Mouse3']);
  });
  it('menu keys, gadget digits and unknown codes cannot be bound', () => {
    for (const c of ['Escape', 'Enter', 'Backspace', 'ArrowUp', 'Digit3', 'F3', 'MetaLeft', 'Nonsense']) expect(bindable(c)).toBe(false);
    for (const c of ['KeyK', 'Digit9', 'Mouse4', 'ShiftRight', 'Numpad0', 'Backquote']) expect(bindable(c)).toBe(true);
    const b = defaultBinds();
    expect(assignBind(b, 'reload', 0, 'Escape')).toBeNull();
    expect(b.reload).toEqual(['KeyR']);
  });
  it('stored binds are sanitised: two per action, duplicates in one action dropped, missing ones defaulted', () => {
    const b = sanitizeBinds({ reload: ['KeyT', 'KeyR', 'KeyU'], bogus: ['KeyT'], wall: ['Bogus'] });
    expect(b.reload).toEqual(['KeyT', 'KeyR']);
    expect(b).not.toHaveProperty('bogus');
    expect(b.wall).toEqual([]);
    expect(b).not.toHaveProperty('sprint');
    expect(Object.keys(b).length).toBe(BINDS.length);
    expect(sanitizeBinds(null)).toEqual(defaultBinds());
    // a key on two actions is kept on both (step 18: a conflict, not an error)
    expect(sanitizeBinds({ reload: ['KeyC'] }).crouch).toEqual(['KeyC', 'ControlLeft']);
  });
  it('labels', () => {
    expect(keyName('KeyW')).toBe('W');
    expect(keyName('ControlLeft')).toBe('Ctrl');
    expect(keyName('Mouse3')).toBe('Mouse 4');
    expect(bindLabel(defaultBinds(), 'wall')).toBe('Shift');
  });
});
