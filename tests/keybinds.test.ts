import { describe, expect, it } from 'vitest';
import { assignBind, bindable, bindLabel, BINDS, clearBind, defaultBinds, keyActionMap, keyName, sanitizeBinds } from '../src/input/keyBindings';

describe('key bindings', () => {
  it('defaults match the documented keyboard layout', () => {
    const m = keyActionMap(defaultBinds());
    expect(m.get('Space')).toEqual(['cover']);
    expect(m.get('KeyE')).toEqual(['jump', 'interact', 'uiTabNext', 'uiAlt']);
    expect(m.get('ShiftLeft')).toEqual(['dash']);
    expect(m.get('Escape')).toEqual(['pause', 'uiBack']);
    expect(m.get('KeyQ')).toEqual(['swapPrev', 'uiTabPrev']);
    // 3.2.0 speed gears (the wheel steps them too, fixed in the source)
    expect(m.get('Equal')).toEqual(['speedUp']);
    expect(m.get('Minus')).toEqual(['speedDown']);
  });
  it('a key moves from the action that had it (no key on two actions)', () => {
    const b = defaultBinds();
    expect(assignBind(b, 'reload', 0, 'KeyE')).toBe('traverse');
    expect(b.reload).toEqual(['KeyE']);
    expect(b.traverse).toEqual([]);
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
  it('stored binds are sanitised: two per action, duplicates dropped, missing ones defaulted', () => {
    const b = sanitizeBinds({ reload: ['KeyT', 'KeyR', 'KeyU'], mark: ['KeyT'], cover: ['Bogus'], sprint: 'ShiftLeft' });
    expect(b.reload).toEqual(['KeyT', 'KeyR']);
    expect(b.mark).toEqual([]);
    expect(b.cover).toEqual([]);
    expect(b.sprint).toEqual(['ShiftLeft']);
    expect(Object.keys(b).length).toBe(BINDS.length);
    expect(sanitizeBinds(null)).toEqual(defaultBinds());
  });
  it('labels', () => {
    expect(keyName('KeyW')).toBe('W');
    expect(keyName('ControlLeft')).toBe('Ctrl');
    expect(keyName('Mouse3')).toBe('Mouse 4');
    expect(bindLabel(defaultBinds(), 'cover')).toBe('Space');
  });
});
