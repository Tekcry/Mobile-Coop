import { describe, expect, it } from 'vitest';
import { DOOR, Doors, type DoorState } from '../src/world/doors';

// Doors without a scene (no leaf mesh): the state rules only
function doors(): { ds: Doors; d: DoorState; disposed: { n: number } } {
  const ds = Object.create(Doors.prototype) as Doors;
  const disposed = { n: 0 };
  const body = { shape: { dispose: () => disposed.n++ }, dispose: () => disposed.n++ };
  const d: DoorState = {
    anchor: { kind: 'door', id: 0, hinge: { x: 0, y: 0, z: 0 }, width: 1, height: 2.1, yaw: 0, swing: 1, locked: false, breachable: true } as unknown as DoorState['anchor'],
    open: 0, target: 0, rate: 0, cracked: false, ajar: 0, cx: 0, cz: 0.5,
    body: body as unknown as DoorState['body'], node: null, index: 0,
  };
  Object.assign(ds, { list: [d], onSound: null, armed: true, mesh: null });
  return { ds, d, disposed };
}

describe('door crack (step 13)', () => {
  it('DOOR.crack 0.12 over 0.6 s', () => {
    expect(DOOR.crack).toBe(0.12);
    expect(DOOR.crackTime).toBe(0.6);
  });
  it('a crack keeps the collision body and the swing at 0 (light and sight see it closed)', () => {
    const { ds, d, disposed } = doors();
    expect(ds.crack(d, true)).toBe(true);
    expect(d.cracked).toBe(true);
    expect(d.body).not.toBeNull();
    expect(disposed.n).toBe(0);
    expect(d.open).toBe(0);
    expect(d.target).toBe(0);
    expect(ds.crack(d, true)).toBe(false);
    expect(ds.crack(d, false)).toBe(true);
    expect(d.cracked).toBe(false);
  });
  it('a locked or open door does not crack', () => {
    const a = doors();
    (a.d.anchor as { locked: boolean }).locked = true;
    expect(a.ds.crack(a.d, true)).toBe(false);
    const b = doors();
    b.ds.open(b.d, 'quiet');
    expect(b.ds.crack(b.d, true)).toBe(false);
  });
  it('an enemy walking through opens a cracked door (and clears the crack, from the cracked angle)', () => {
    const { ds, d, disposed } = doors();
    ds.crack(d, true);
    d.ajar = DOOR.crack;
    ds.pushOpen(0.3, 0.5);
    expect(d.target).toBe(1);
    expect(d.cracked).toBe(false);
    expect(d.open).toBeCloseTo(DOOR.crack);
    expect(d.body).toBeNull();
    expect(disposed.n).toBe(2);
  });
  it('a client mirror opening the door (setOpen) clears the crack', () => {
    const { ds, d } = doors();
    ds.crack(d, true);
    ds.setOpen(d, true);
    expect(d.cracked).toBe(false);
  });
});
