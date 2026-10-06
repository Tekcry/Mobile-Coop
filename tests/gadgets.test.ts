import { describe, expect, it } from 'vitest';
import { DRONE, droneStep, GADGET_IDS, GADGETS, GadgetInventory, predictArc, wheelSlot, type DroneState } from '../src/game/gadgets';

describe('gadget inventory', () => {
  it('starts with each gadget\'s carry, takes until empty, caps adds at the max', () => {
    const inv = new GadgetInventory();
    expect(inv.count).toBe(GADGETS.frag.carry);
    expect(inv.take()).toBe(true);
    expect(inv.take()).toBe(true);
    expect(inv.take()).toBe(false);
    inv.add('frag', 10);
    expect(inv.counts.frag).toBe(GADGETS.frag.max);
  });
  it('cycling skips empty gadgets', () => {
    const inv = new GadgetInventory({ frag: 1, gas: 0, flash: 2 });
    expect(inv.cycle(1)).toBe('flash');
    expect(inv.cycle(-1)).toBe('frag');
  });
  it('restock tops up to the starting carry', () => {
    const inv = new GadgetInventory();
    inv.select('emp');
    inv.take();
    inv.restock();
    expect(inv.counts.emp).toBe(GADGETS.emp.carry);
  });
});

describe('wheel', () => {
  it('maps a direction to a slot clockwise from the top; dead zone in the middle', () => {
    expect(wheelSlot(0, 1)).toBe(0);
    expect(wheelSlot(1, 0)).toBe(2);
    expect(wheelSlot(0, -1)).toBe(4);
    expect(wheelSlot(-1, 0)).toBe(6);
    expect(wheelSlot(0.1, 0.1)).toBe(-1);
    expect(GADGET_IDS.length).toBe(8);
  });
});

describe('throw arc', () => {
  it('follows the ballistic path', () => {
    const out = new Float32Array(30);
    const n = predictArc(0, 1.5, 0, 0, 5, 10, 9.81, 0.1, 10, out);
    expect(n).toBe(10);
    expect(out[3 * 5 + 2]).toBeCloseTo(5, 5);
    expect(out[3 * 5 + 1]).toBeCloseTo(1.5 + 5 * 0.5 - 0.5 * 9.81 * 0.25, 5);
  });
});

describe('drone', () => {
  const s = (): DroneState => ({ x: 0, y: 1, z: 0, yaw: 0, ox: 0, oz: 0, battery: DRONE.battery });
  it('flies camera-relative and stays within range of the launch point', () => {
    const d = s();
    for (let i = 0; i < 1000; i++) droneStep(d, 1 / 60, 0, 1, 0, 0);
    expect(Math.hypot(d.x, d.z)).toBeLessThanOrEqual(DRONE.range + 1e-6);
    expect(d.z).toBeGreaterThan(0);
  });
  it('keeps to its altitude band over the floor', () => {
    const d = s();
    for (let i = 0; i < 600; i++) droneStep(d, 1 / 60, 0, 0, 1, 2);
    expect(d.y).toBeCloseTo(2 + DRONE.maxAlt, 5);
    for (let i = 0; i < 600; i++) droneStep(d, 1 / 60, 0, 0, -1, 2);
    expect(d.y).toBeCloseTo(2 + DRONE.minAlt, 5);
  });
  it('the battery runs flat', () => {
    const d = s();
    let ok = true;
    let t = 0;
    while (ok && t < 100) {
      ok = droneStep(d, 0.5, 0, 0, 0, 0);
      t += 0.5;
    }
    expect(t).toBeCloseTo(DRONE.battery, 0);
  });
});
