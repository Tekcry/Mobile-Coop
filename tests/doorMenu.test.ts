// (CT prototype A3, G19, G97) the door context menu: options, selection, the bash's guard-behind test
import { describe, expect, it } from 'vitest';
import { DOOR_BASH, DoorMenu, doorMenuOptions, guardBehindDoor } from '../src/game/doorMenu';

describe('door menu (A3)', () => {
  it('lists open, stealth open (only when the peek is on offer), bash and the optic cable', () => {
    expect(doorMenuOptions(true)).toEqual(['open', 'stealth', 'bash', 'optic']);
    expect(doorMenuOptions(false)).toEqual(['open', 'bash', 'optic']);
  });

  it('moves with wrap, picks the highlighted option and closes', () => {
    const m = new DoorMenu();
    expect(m.pick()).toBeNull();
    m.show(3, true);
    expect(m.open).toBe(true);
    expect(m.door).toBe(3);
    m.move(-1);
    expect(m.opts[m.sel]).toBe('optic');
    m.move(1);
    expect(m.sel).toBe(0);
    m.move(1);
    expect(m.pick()).toBe('stealth');
    expect(m.open).toBe(false);
    expect(m.labels()).toEqual(['Open', 'Stealth open', 'Bash', 'Optic cable (not yet)']);
  });

  it('a guard right behind the leaf is hit by the bash; one beside, far, or on the near side is not', () => {
    // hinge at the origin, the leaf along +z (yaw 0), 0.9 wide: its normal is +x; a body on the +x side (side +1) bashes toward -x
    const a = { hinge: { x: 0, z: 0 }, yaw: 0, width: 0.9 };
    expect(guardBehindDoor(a, 1, -0.5, 0.45)).toBe(true);
    expect(guardBehindDoor(a, 1, -DOOR_BASH.behind - 0.1, 0.45)).toBe(false);
    expect(guardBehindDoor(a, 1, -0.5, 0.9 + DOOR_BASH.span + 0.2)).toBe(false);
    expect(guardBehindDoor(a, 1, 0.5, 0.45)).toBe(false);
    expect(guardBehindDoor(a, -1, 0.5, 0.45)).toBe(true);
  });
});
