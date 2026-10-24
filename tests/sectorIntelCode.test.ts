import { describe, expect, it } from 'vitest';
import { SectorCodes } from '../src/game/sectorKeypads';
import type { SectorDef } from '../src/game/sectors';

/** (stealth-pays S2, spare 9 part B) A code from an interrogation reaches the team's keypads. */

const pose = { x: 0, y: 0, z: 0, yaw: 0 };
const conn = { label: 'c', box: [0, 0, 1, 1] as [number, number, number, number], checkpoint: pose };
const sec = (id: string, extra: Partial<SectorDef> = {}, last = false): SectorDef => ({
  id,
  name: id,
  start: pose,
  objective: { kind: 'hack', label: 'Hack the terminal', x: 0, y: 0, z: 0, yaw: 0 },
  ...(last ? { extract: { label: 'x', box: [0, 0, 1, 1] } } : { connector: conn }),
  guards: [],
  reinforce: [],
  perStage: 2,
  routes: [],
  ...extra,
});

const DEFS: SectorDef[] = [
  sec('s1', { keypads: [{ at: [10, 0], code: 'fac' }] }),
  sec('s2', { keypads: [{ at: [50, 0], code: 'labs' }] }, true),
];

describe('SectorCodes.grantCode', () => {
  it('host: true once, false on a repeat; the keypad opens', () => {
    const c = new SectorCodes(DEFS);
    expect(c.useKeypad(0, 0)).toBe(false);
    expect(c.grantCode('fac', 0)).toBe(true);
    expect(c.grantCode('fac', 0)).toBe(false);
    expect(c.has('fac')).toBe(true);
    expect(c.useKeypad(0, 0)).toBe(true);
  });

  it('a mirror and an empty flag never grant', () => {
    const m = new SectorCodes(DEFS, false);
    expect(m.grantCode('fac', 0)).toBe(false);
    expect(m.has('fac')).toBe(false);
    expect(new SectorCodes(DEFS).grantCode('', 0)).toBe(false);
  });

  it('an unknown flag is held but opens nothing', () => {
    const c = new SectorCodes(DEFS);
    expect(c.grantCode('nope', 0)).toBe(true);
    expect(c.useKeypad(0, 0)).toBe(false);
  });

  it("the section's restart drops it and relocks; an earlier section's code survives", () => {
    const c = new SectorCodes(DEFS);
    c.grantCode('fac', 0);
    c.grantCode('labs', 1);
    expect(c.useKeypad(0, 0)).toBe(true);
    expect(c.restart(1)).toEqual([]);
    expect(c.has('labs')).toBe(false);
    expect(c.has('fac')).toBe(true);
    expect(c.restart(0)).toEqual([0]);
    expect(c.has('fac')).toBe(false);
    expect(c.isOpen(0, 0)).toBe(false);
    expect(c.useKeypad(0, 0)).toBe(false);
  });
});
