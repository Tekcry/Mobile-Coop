import { describe, expect, it } from 'vitest';
import { ACTIONS, conflicts, hintItems, padBindingWords } from '../../src/editor/actions';
import { HOLD, PAD, PadState, padWords, REPEAT_EVERY, REPEAT_FIRST } from '../../src/editor/pad';
import { menuTree } from '../../src/editor/padMenu';
import { DWELL, Radial, slotAt, visible } from '../../src/editor/radial';
import type { RadialInput, RadialNode } from '../../src/editor/radial';
import type { Campus } from '../../src/editor/types';

const deg = (d: number, m = 1): [number, number] => [Math.sin((d * Math.PI) / 180) * m, -Math.cos((d * Math.PI) / 180) * m];

describe('radial slot maths', () => {
  it('maps a stick to 8 slots clockwise from the top', () => {
    expect(slotAt(...deg(0), 8)).toBe(0);
    expect(slotAt(...deg(90), 8)).toBe(2);
    expect(slotAt(...deg(180), 8)).toBe(4);
    expect(slotAt(...deg(270), 8)).toBe(6);
    expect(slotAt(...deg(350), 8)).toBe(0);
  });

  it('inside the dead zone is no slot', () => {
    expect(slotAt(...deg(90, 0.3), 8)).toBe(-1);
    expect(slotAt(...deg(90, 0.4), 8)).toBe(2);
  });

  it('keeps the previous slot within the hysteresis past a border', () => {
    // the border between slots 0 and 1 is at 22.5 degrees
    expect(slotAt(...deg(26), 8, -1)).toBe(1);
    expect(slotAt(...deg(26), 8, 0)).toBe(0); // 3.5 degrees past: kept
    expect(slotAt(...deg(32), 8, 0)).toBe(1); // 9.5 degrees past: changes
  });
});

const tree: RadialNode = {
  id: 'root',
  name: 'Menu',
  children: [
    { id: 'a', name: 'A' },
    { id: 'sub', name: 'Build', children: [{ id: 'b1', name: 'Room' }, { id: 'b2', name: 'Wall' }, { id: 'h', name: 'Hidden', hidden: true }] },
    { id: 'c', name: 'C' },
    { id: 'd', name: 'D' },
  ],
};
const inp = (o: Partial<RadialInput>): RadialInput => ({ x: 0, y: 0, now: 0, held: true, a: false, b: false, ...o });

describe('radial menu', () => {
  it('release picks the slot the stick points at; release in the centre cancels', () => {
    const r = new Radial(tree);
    r.open();
    r.update(inp({ x: 0, y: -1 }));
    const res = r.update(inp({ x: 0, y: -1, held: false }));
    expect(res).toMatchObject({ kind: 'pick', node: { id: 'a' } });
    r.open();
    expect(r.update(inp({ held: false }))).toEqual({ kind: 'close' });
  });

  it('a submenu opens after the dwell, shows a breadcrumb, hides hidden slots', () => {
    const r = new Radial(tree);
    r.open();
    r.update(inp({ x: 1, y: 0, now: 0 }));
    r.update(inp({ x: 1, y: 0, now: DWELL - 0.01 }));
    expect(r.breadcrumb).toEqual([]);
    r.update(inp({ x: 1, y: 0, now: DWELL + 0.01 }));
    expect(r.breadcrumb).toEqual(['Build']);
    expect(r.ring.map((n) => n.id)).toEqual(['b1', 'b2']);
    expect(visible(tree.children![1]!.children!)).toHaveLength(2);
  });

  it('A opens a submenu; the menu stays open when Y is released; B goes back, then closes', () => {
    const r = new Radial(tree);
    r.open();
    r.update(inp({ x: 1, y: 0 }));
    r.update(inp({ x: 1, y: 0, a: true }));
    expect(r.breadcrumb).toEqual(['Build']);
    expect(r.update(inp({ held: false }))).toBeNull();
    expect(r.isOpen).toBe(true);
    r.update(inp({ held: false, b: true }));
    expect(r.breadcrumb).toEqual([]);
    expect(r.update(inp({ held: false, b: true }))).toEqual({ kind: 'close' });
  });

  it('in a submenu, release while Y is still held picks; path names the way there', () => {
    const r = new Radial(tree);
    r.open();
    r.update(inp({ x: 1, y: 0, a: true }));
    r.update(inp({ x: 1, y: 0 }));
    const res = r.update(inp({ x: 1, y: 0, held: false }));
    expect(res).toMatchObject({ kind: 'pick', node: { id: 'b2' }, path: ['Build', 'Wall'] });
  });

  it('the dwell does not chain into the next ring until the stick moves', () => {
    const deep: RadialNode = { id: 'r', name: 'r', children: [{ id: 's', name: 'S', children: [{ id: 't', name: 'T', children: [{ id: 'u', name: 'U' }] }] }] };
    const r = new Radial(deep);
    r.open();
    r.update(inp({ x: 0, y: -1, now: 0 }));
    r.update(inp({ x: 0, y: -1, now: 1 }));
    r.update(inp({ x: 0, y: -1, now: 2 }));
    expect(r.breadcrumb).toEqual(['S']);
  });

  it('pre-highlights the last pick in each ring', () => {
    const r = new Radial(tree);
    r.open();
    r.update(inp({ x: 0, y: 1 }));
    r.update(inp({ x: 0, y: 1, held: false }));
    r.open();
    expect(r.highlight).toBe(2);
    expect(r.update(inp({ a: true }))).toMatchObject({ kind: 'pick', node: { id: 'c' } });
  });

  it('the editor root ring has 8 slots, at most 8 per ring, levels named with heights', () => {
    const d = { meta: { id: 't', buildings: [{ id: 'A', footprint: [0, 0, 1, 1] }] }, levels: [{ id: 'G', name: 'Ground', floor: 0, height: 4.2 }, { id: 'F', name: 'First', floor: 4.2, height: 4.2 }], rooms: [], walls: [], openings: [], stairs: [], ladders: [], voids: [] } as unknown as Campus;
    const t = menuTree(d, { selected: false, clipboard: false });
    expect(t.children!.map((n) => n.name)).toEqual(['Select', 'Build', 'Edit', 'Undo', 'Walk', 'View', 'Level', 'File']);
    const walk = (n: RadialNode): void => {
      expect(visible(n.children ?? []).length).toBeLessThanOrEqual(8);
      for (const c of n.children ?? []) walk(c);
    };
    walk(t);
    expect(t.children![6]!.children!.map((n) => n.name)).toEqual(['First (4.2 m)', 'Ground (0 m)']);
    expect(visible(t.children![1]!.children!).map((n) => n.name)).toEqual(['Room', 'Wall', 'Door', 'Window']);
  });
});

describe('pad reading', () => {
  const snap = (down: number[], axes = [0, 0, 0, 0]): { buttons: number[]; axes: number[] } => ({ buttons: Array.from({ length: 17 }, (_, i) => (down.includes(i) ? 1 : 0)), axes });

  it('tells a tap from a hold (X redo, Y radial)', () => {
    const p = new PadState();
    p.update(snap([PAD.X]), 0);
    p.update(snap([]), 0.1);
    expect(p.xTap).toBe('tap');
    p.update(snap([PAD.Y]), 1);
    p.update(snap([PAD.Y]), 1 + HOLD.Y + 0.01);
    expect(p.yTap).toBe('hold');
    p.update(snap([]), 2);
    expect(p.yTap).toBeNull();
  });

  it('edges and D-pad repeat', () => {
    const p = new PadState();
    p.update(snap([PAD.UP]), 0);
    expect(p.pressed(PAD.UP) && p.repeat(PAD.UP)).toBe(true);
    p.update(snap([PAD.UP]), REPEAT_FIRST - 0.01);
    expect(p.repeat(PAD.UP)).toBe(false);
    p.update(snap([PAD.UP]), REPEAT_FIRST + 0.01);
    expect(p.repeat(PAD.UP)).toBe(true);
    p.update(snap([PAD.UP]), REPEAT_FIRST + REPEAT_EVERY / 2);
    expect(p.repeat(PAD.UP)).toBe(false);
    p.update(snap([]), 2);
    expect(p.released(PAD.UP)).toBe(true);
  });

  it('sticks use the dead zone; resting sticks are not activity', () => {
    const p = new PadState();
    p.update(snap([], [0.1, 0.1, 0, 0]), 0);
    expect(p.active).toBe(false);
    p.update(snap([], [1, 0, 0, 0]), 0.1);
    expect(p.active).toBe(true);
    expect(p.ls.x).toBeGreaterThan(0.9);
  });

  it('button words follow the controller style', () => {
    expect(padWords('Y hold', 'playstation')).toBe('△ hold');
    expect(padWords('LT/RT', 'playstation')).toBe('L2/R2');
    expect(padWords('Menu', 'xbox')).toBe('Menu');
    expect(padWords('A', 'nintendo')).toBe('B');
  });
});

describe('pad bindings in the action map', () => {
  it('no pad button is used twice in one context', () => {
    expect(conflicts()).toEqual([]);
  });

  it('every action has a binding on some device; the hint bar shows pad words when the pad was used last', () => {
    for (const a of ACTIONS) expect(a.keys.length || a.mouse || a.pad?.length).toBeTruthy();
    expect(hintItems('idle', 'pad').map((i) => i.keys)).toContain('Y hold');
    expect(hintItems('menu', 'pad', 'playstation').map((i) => i.keys)).toContain('✕');
    expect(padBindingWords(ACTIONS.find((a) => a.id === 'redo')!, 'xbox')).toBe('X hold');
  });
});
