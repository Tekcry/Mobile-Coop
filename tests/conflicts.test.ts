// (locomotion step 18, D7) binding conflicts: allowed pairs pass, a real clash is reported once per pair, both devices
import { describe, expect, it } from 'vitest';
import { conflictIds, findConflicts } from '../src/input/conflicts';
import { assignBind, defaultBinds, FIXED_KEYS } from '../src/input/keyBindings';
import { assignPadBind, defaultPadBinds, PAD_FIXED } from '../src/input/padBinds';
import { PAD } from '../src/input/gamepadMapping';

const padAll = (b = defaultPadBinds()): Record<string, readonly number[]> => ({ ...b, aim: PAD_FIXED.aim, fire: PAD_FIXED.fire });

describe('binding conflicts (step 18)', () => {
  it('the defaults have none (contextual pairs share one row by design)', () => {
    expect(findConflicts(padAll())).toEqual([]);
    expect(findConflicts(defaultBinds())).toEqual([]);
  });

  it('allowed pairs pass: Traverse and Use on one key both raise interact', () => {
    const k = defaultBinds();
    expect(assignBind(k, 'use', 0, 'KeyE')).toBe('traverse');
    expect(findConflicts(k)).toEqual([]);
  });

  it('menu keys are their own group', () => {
    const ui: Record<string, string[]> = {};
    const groups: Record<string, string> = {};
    for (const [c, acts] of Object.entries(FIXED_KEYS)) {
      ui[`ui:${acts[0]}`] = [c];
      groups[`ui:${acts[0]}`] = 'ui';
    }
    // Q is Previous weapon and the menu's previous tab by default: no conflict
    expect(findConflicts({ ...defaultBinds(), ...ui }, groups)).toEqual([]);
  });

  it('pad: reload onto B clashes with crouch, once per pair; onto LT with the fixed aim', () => {
    const b = defaultPadBinds();
    assignPadBind(b, 'reload', 0, PAD.B);
    assignPadBind(b, 'reload', 1, PAD.B);
    const c = findConflicts(padAll(b));
    expect(c).toEqual([{ a: 'crouch', b: 'reload', input: PAD.B }]);
    expect([...conflictIds(c)].sort()).toEqual(['crouch', 'reload']);
    assignPadBind(b, 'reload', 0, PAD.LT);
    expect(findConflicts(padAll(b))).toEqual([{ a: 'reload', b: 'aim', input: PAD.LT }]);
  });

  it('keyboard: two verbs on one key and on two keys still report one conflict per pair', () => {
    const k = defaultBinds();
    expect(assignBind(k, 'reload', 0, 'KeyC')).toBe('crouch');
    expect(assignBind(k, 'reload', 1, 'ControlLeft')).toBe('crouch');
    expect(k.crouch).toEqual(['KeyC', 'ControlLeft']);
    expect(findConflicts(k)).toEqual([{ a: 'crouch', b: 'reload', input: 'KeyC' }]);
    assignBind(k, 'cover', 0, 'KeyC');
    expect(findConflicts(k).length).toBe(3);
  });
});
