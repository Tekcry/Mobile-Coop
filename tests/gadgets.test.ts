import { describe, expect, it } from 'vitest';
import { GADGET_IDS, GADGETS, GadgetInventory, predictArc, wheelSlot } from '../src/game/gadgets';

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
    inv.select('mine');
    inv.take();
    inv.restock();
    expect(inv.counts.mine).toBe(GADGETS.mine.carry);
    expect(inv.counts.emp).toBe(0);
  });
});

describe('wheel', () => {
  it('maps a direction to a slot clockwise from the top; dead zone in the middle', () => {
    expect(wheelSlot(0, 1)).toBe(0);
    expect(wheelSlot(1, 0)).toBe(2);
    expect(wheelSlot(0, -1)).toBe(3);
    expect(wheelSlot(-1, 0)).toBe(5);
    expect(wheelSlot(0.1, 0.1)).toBe(-1);
    expect(GADGET_IDS.length).toBe(6);
    expect(GADGET_IDS).not.toContain('emp');
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
