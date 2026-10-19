import { describe, expect, it } from 'vitest';
import { DOOR_OPEN, DoorOpenCore, OPEN_ACT, doorOpenSpot, emptyOpenSpot, leafHandPoint } from '../src/world/doorOpen';
import { DOOR_PEEK } from '../src/world/doorPeek';

// a 1 m leaf along +z from the hinge at the origin (yaw 0: t = +z, n = +x), swinging +1
const anchor = (swing: 1 | -1 = 1) => ({ hinge: { x: 0, y: 0, z: 0 }, yaw: 0, width: 1, height: 2.1, swing, locked: false });

describe('normal door open (G6, AUDIT-WALLS row 4, 052349 @ 4.6-7.6)', () => {
  it('the spot: beside the latch, off the leaf, on the body side; turned toward the hinge; a pull stands past the latch', () => {
    // swing +1 turns the leaf toward +n (+x): a body on -x pushes, one on +x pulls
    const s = doorOpenSpot(anchor(1), -0.9, 0.5, emptyOpenSpot());
    expect(s.side).toBe(-1);
    expect(s.pull).toBe(false);
    expect(s.x).toBeCloseTo(-DOOR_OPEN.off, 6);
    expect(s.z).toBeCloseTo(1 - DOOR_OPEN.in, 6);
    // square to the door faces +x (yaw pi/2); turned 35 deg toward the hinge (-z): forward has a -z component
    expect(Math.abs(Math.abs(s.yaw - Math.PI / 2) - DOOR_OPEN.turn)).toBeLessThan(1e-6);
    expect(Math.cos(s.yaw)).toBeLessThan(0);
    // the hinge on the body's right (facing +x the right is -z): the right hand pushes the leaf (052349 @ 6.7-7.0)
    expect(s.handRight).toBe(true);
    const p = doorOpenSpot(anchor(1), 0.9, 0.5, emptyOpenSpot());
    expect(p.pull).toBe(true);
    expect(p.z).toBeGreaterThan(1);
    // out of the leaf's sweep (radius 1 about the hinge)
    expect(Math.hypot(p.x, p.z)).toBeGreaterThan(1.05);
    expect(p.handRight).toBe(true);
  });
  it('steps, holds the hand up, asks for the open 0.8 s after the pick, lets go at 65 deg, frees the body', () => {
    const c = new DoorOpenCore();
    c.start(2, anchor(1), 0.9, 0.5);
    expect(c.phase).toBe('step');
    let acts = 0;
    let at = -1;
    let angle = 0;
    let t = 0;
    while (c.active && t < 5) {
      const a = c.update(1 / 60, angle, acts > 0, false);
      t += 1 / 60;
      if (a === OPEN_ACT.open) {
        acts++;
        at = t;
      }
      if (acts) angle = Math.min(1.53, angle + (1.36 / 0.75) / 60);
    }
    expect(acts).toBe(1);
    expect(at).toBeGreaterThan(DOOR_OPEN.leafAt - 0.02);
    expect(at).toBeLessThan(DOOR_OPEN.leafAt + 0.03);
    expect(c.active).toBe(false);
    expect(t).toBeLessThan(DOOR_OPEN.maxTime);
    // the hand is up before the leaf moves
    const d = new DoorOpenCore();
    d.start(0, anchor(1), 0.9, 0.5);
    for (let k = 0; k < Math.round(DOOR_OPEN.leafAt * 60) - 1; k++) d.update(1 / 60, 0, false, false);
    expect(d.handW()).toBeGreaterThan(0.95);
    expect(d.stepK()).toBe(1);
  });
  it('a door already opened (by anyone) is not asked again; damage ends the move', () => {
    const c = new DoorOpenCore();
    c.start(0, anchor(1), 0.9, 0.5);
    let acts = 0;
    for (let k = 0; k < 120; k++) if (c.update(1 / 60, 0.5, true, false) === OPEN_ACT.open) acts++;
    expect(acts).toBe(0);
    const e = new DoorOpenCore();
    e.start(0, anchor(1), 0.9, 0.5);
    e.update(1 / 60, 0, false, true);
    expect(e.active).toBe(false);
  });
  it('the leaf hand point follows the leaf at the handle height', () => {
    const o = { x: 0, y: 0, z: 0 };
    leafHandPoint(anchor(1), 1, 0, 0.2, o);
    expect(o.y).toBeCloseTo(DOOR_PEEK.handleY);
    expect(o.z).toBeCloseTo(0.8);
    leafHandPoint(anchor(1), 1, Math.PI / 2, 0.2, o);
    expect(Math.hypot(o.x, o.z)).toBeGreaterThan(0.79);
    expect(Math.abs(o.z)).toBeLessThan(0.1);
  });
});
