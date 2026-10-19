import { describe, expect, it } from 'vitest';
import { DOOR, Doors, driveStep, type DoorState } from '../src/world/doors';

// Doors without a scene (no leaf mesh): the state rules only
function doors(): { ds: Doors; d: DoorState; disposed: { n: number } } {
  const ds = Object.create(Doors.prototype) as Doors;
  const disposed = { n: 0 };
  const body = { shape: { dispose: () => disposed.n++ }, dispose: () => disposed.n++ };
  const d: DoorState = {
    anchor: { kind: 'door', id: 0, hinge: { x: 0, y: 0, z: 0 }, width: 1, height: 2.1, yaw: 0, swing: 1, locked: false, breachable: true } as unknown as DoorState['anchor'],
    open: 0, target: 0, rate: 0, cracked: false, ajar: 0, held: false, cx: 0, cz: 0.5,
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

describe('stick-driven stealth open (F1b, door-2)', () => {
  it('driveStep: a push opens slowly by that much, release holds it, back closes to the crack', () => {
    expect(driveStep(DOOR.crack, 0, 1)).toBe(DOOR.crack);
    expect(driveStep(0.3, 0.1, 1)).toBeCloseTo(0.3); // inside the dead zone
    const half = driveStep(0.3, 0.575, 1) - 0.3;
    const full = driveStep(0.3, 1, 1) - 0.3;
    expect(full).toBeGreaterThan(half * 1.8);
    expect(full).toBeLessThan(0.25); // a full second of a full push is a fifth of the swing: slow
    expect(driveStep(0.3, -1, 10)).toBe(DOOR.crack);
    expect(driveStep(0.3, 1, 100)).toBe(DOOR.driveMax);
  });
  it('under the shut line it stays a crack; over it the door is a real opening, held with no swing', () => {
    const { ds, d } = doors();
    const sounds: string[] = [];
    ds.onSound = (_d, how) => sounds.push(how);
    ds.drive(d, 0.14);
    expect(d.cracked).toBe(true);
    expect(d.target).toBe(0);
    expect(d.body).not.toBeNull();
    ds.drive(d, 0.4);
    expect(d.target).toBe(1);
    expect(d.cracked).toBe(false);
    expect(d.body).toBeNull();
    expect(d.open).toBeCloseTo(0.4);
    expect(d.held).toBe(true);
    expect(sounds).toEqual(['drive']);
    // held: update does not swing it on
    Object.assign(ds, { mesh: { thinInstanceBufferUpdated: () => undefined, thinInstanceRefreshBoundingInfo: () => undefined } });
    ds.update(1);
    expect(d.open).toBeCloseTo(0.4);
  });
});
