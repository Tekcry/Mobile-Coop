import { describe, expect, it } from 'vitest';
import { findConflicts } from '../src/input/conflicts';
import { assignBind, bindable, bindLabel, BINDS, clearBind, defaultBinds, keyActionMap, keyName, sanitizeBinds } from '../src/input/keyBindings';

describe('key bindings', () => {
  it('defaults match the documented keyboard layout', () => {
    const m = keyActionMap(defaultBinds());
    // (CT prototype A3, G96) Space jump, E interact / context, Shift back-to-wall, F / PageDown co-op action; plus the menu keys (menu-ui MD11)
    expect(m.get('Space')).toEqual(['jump', 'uiConfirm']);
    expect(m.get('KeyE')).toEqual(['interact', 'uiTabNext']);
    // (anim-rework S1, A1) Left Shift runs and Left Alt creeps (move magnitudes, no action); back to wall on Caps Lock
    expect(m.get('ShiftLeft')).toEqual([]);
    expect(m.get('AltLeft')).toEqual([]);
    expect(defaultBinds().run).toEqual(['ShiftLeft']);
    expect(defaultBinds().creep).toEqual(['AltLeft']);
    expect(m.get('CapsLock')).toEqual(['cover']);
    expect(m.get('KeyF')).toEqual(['coop', 'uiAlt']);
    expect(m.get('PageDown')).toEqual(['coop']);
    // (menu-ui slice 2, MD11) menu extras on the same keys: Space confirms, E next tab, R = the X action, F = the Y action
    expect(m.get('KeyR')).toEqual(['reload', 'uiX']);
    expect(m.get('Escape')).toEqual(['pause', 'uiBack']);
    expect(m.get('KeyQ')).toEqual(['swapPrev', 'uiTabPrev']);
    // (anim-rework S1) no speed gear keys: = and - are free
    expect(m.get('Equal')).toBeUndefined();
    expect(m.get('Minus')).toBeUndefined();
    // (G343) O shows the objective (tap); no other default uses it
    expect(m.get('KeyO')).toEqual(['objective']);
    expect(defaultBinds().objective).toEqual(['KeyO']);
    expect(BINDS.filter((b) => b.defaults.includes('KeyO')).map((b) => b.id)).toEqual(['objective']);
    expect(findConflicts(defaultBinds())).toEqual([]);
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
    expect(bindLabel(defaultBinds(), 'wall')).toBe('Caps');
    expect(bindLabel(defaultBinds(), 'run')).toBe('Shift');
  });
});
