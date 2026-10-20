import { describe, expect, it } from 'vitest';
import { demoInput, FREE_CFG, freeAxis, freeTimeScale, FreeViewCore, orbitPlace, type DemoOut } from '../src/player/freeView';
import { stickMagFor } from '../src/player/speedGears';

describe('free view pure parts (tuner-camera, WIP)', () => {
  it('orbit places the view dist back along the look, aimed at the target', () => {
    const o = { x: 0, y: 0, z: 0 };
    orbitPlace(1, 2, 3, 0, 0, 4, o);
    expect(o).toEqual({ x: 1, y: 2, z: -1 });
    orbitPlace(0, 1, 0, Math.PI / 2, -Math.PI / 6, 2, o);
    expect(o.x).toBeCloseTo(-Math.cos(Math.PI / 6) * 2, 9);
    expect(o.y).toBeCloseTo(1 + 1, 9);
    expect(o.z).toBeCloseTo(0, 9);
  });

  it('the time scale snaps to 1 / 0.5 / 0.25 / 0.1; junk is 1', () => {
    expect(freeTimeScale(0.5)).toBe(0.5);
    expect(freeTimeScale(0.3)).toBe(0.25);
    expect(freeTimeScale(0)).toBe(0.1);
    expect(freeTimeScale(7)).toBe(1);
    expect(freeTimeScale(Number.NaN)).toBe(1);
  });

  it('the stick dead zone', () => {
    expect(freeAxis(0.1)).toBe(0);
    expect(freeAxis(-1)).toBe(-1);
    expect(freeAxis(0.575)).toBeCloseTo(0.5, 9);
  });

  it('the demo loop walks a circle at its speed; idle leaves the stance', () => {
    const out: DemoOut = { x: 0, y: 0, ads: false, crouch: -1 };
    demoInput('idle', 3, out);
    expect(out).toEqual({ x: 0, y: 0, ads: false, crouch: -1 });
    demoInput('walk', 0, out);
    expect(out.y).toBeCloseTo(stickMagFor(1.4, false), 9);
    expect(out.x).toBeCloseTo(0, 9);
    // a quarter turn after (pi / 2) / (v / r) s
    demoInput('walk', (Math.PI / 2) / (1.4 / FREE_CFG.demoRadius), out);
    expect(out.x).toBeCloseTo(stickMagFor(1.4, false), 9);
    expect(demoInput('crouchWalk', 1, out).crouch).toBe(1);
    expect(demoInput('aimStrafe', 1, out).ads).toBe(true);
  });

  it('fly moves along the view; orbit zooms within its limits', () => {
    const c = new FreeViewCore();
    c.start('fly', 0, 1, 0, 0, 0, 0, 0, 0);
    c.dt = 1;
    c.moveY = 1;
    c.place(0, 0, 0);
    expect(c.z).toBeCloseTo(FREE_CFG.flySpeed, 9);
    expect(c.moveY).toBe(0);
    c.start('orbit', 0, 1.2, -3, 0, 0, 0, 0, 0);
    expect(c.dist).toBeCloseTo(3, 9);
    c.zoom = 100;
    c.place(0, 0, 0);
    expect(c.dist).toBe(FREE_CFG.distMin);
  });
});
