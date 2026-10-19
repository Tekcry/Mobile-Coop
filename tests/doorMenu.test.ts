// (CT prototype A3, G19, G97; G5) the door options, now rows of the context menu; the bash's guard-behind test
import { describe, expect, it } from 'vitest';
import { addDoorRows, DOOR_BASH, DOOR_KIND, DoorMenuView, doorMenuOptions, guardBehindDoor, type DoorOpt } from '../src/game/doorMenu';
import { ContextMenu, emptyCtxInput } from '../src/game/contextMenu';

describe('door options (A3, G5)', () => {
  it('lists open, stealth open (only when the peek is on offer), bash and the optic cable', () => {
    expect(doorMenuOptions(true)).toEqual(['open', 'stealth', 'bash', 'optic']);
    expect(doorMenuOptions(false)).toEqual(['open', 'bash', 'optic']);
  });

  it('adds the CT door set as latching rows for the door; the view sees the held list', () => {
    const m = new ContextMenu();
    const view = new DoorMenuView(m);
    const opts: DoorOpt[] = view.opts;
    m.begin();
    addDoorRows(m, 3, true, opts);
    m.end();
    expect(m.count).toBe(4);
    expect(m.opts.slice(0, 4).map((o) => o.label)).toEqual(['Open door', 'Open door stealth', 'Bash door', 'Optic cable']);
    expect(m.opts.slice(0, 4).every((o) => o.kind === DOOR_KIND && o.ref === 3 && o.latch)).toBe(true);
    expect(view.opts).toEqual(['open', 'stealth', 'bash', 'optic']);
    const i = emptyCtxInput();
    m.step(i, 1 / 60);
    expect(view.open).toBe(false);
    i.pressed = i.down = true;
    m.step(i, 1 / 60);
    expect(view.open).toBe(true);
    expect(view.sel).toBe(0);
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
