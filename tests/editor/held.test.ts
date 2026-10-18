import { describe, expect, it } from 'vitest';
import { canLift, cornerResize, isVert, VERT_BOT, VERT_TOP, vertResize, growElem, HANDLE_PX, handleWorld, heightWords, liftElem, liftSnap, liftStep, nearestCorner, nearestEnd, planHandleUnits } from '../../src/editor/held';
import { menuTabs, menuTiles, MENU_TABS } from '../../src/editor/tileMenu';
import type { MenuInput, Tile } from '../../src/editor/tileMenu';
import { GROUPS } from '../../src/editor/catalogue';
import { LIGHT_GROUPS } from '../../src/editor/lightCatalogue';
import { presetWords, START_PRESETS } from '../../src/editor/presets';
import type { Coll } from '../../src/editor/types';
import { ridgeHandle, ridgeResize } from '../../src/editor/roofGeometry';
import type { RoofData } from '../../src/editor/roofGeometry';

describe('handles a constant size on screen (fix-up 2026-10-14)', () => {
  it('3D: the world size grows with distance and keeps HANDLE_PX on screen', () => {
    expect(HANDLE_PX).toBe(12);
    const fov = 1.0;
    const near = handleWorld(12, fov, 10, 720);
    const far = handleWorld(12, fov, 40, 720);
    expect(far / near).toBeCloseTo(4, 6);
    // back to pixels: size * viewH / (2 d tan(fov / 2))
    expect((near * 720) / (2 * 10 * Math.tan(fov / 2))).toBeCloseTo(12, 6);
    expect(handleWorld(12, fov, 10, 0)).toBe(0);
  });

  it('plan: SVG units divide by the plan zoom (viewBox fitted with meet)', () => {
    expect(planHandleUnits(12, 100, 50, 1000, 500)).toBeCloseTo(1.2, 6);
    // zoomed in twice: half the units, same pixels
    expect(planHandleUnits(12, 50, 25, 1000, 500)).toBeCloseTo(0.6, 6);
    // the tighter axis decides
    expect(planHandleUnits(12, 100, 100, 1000, 500)).toBeCloseTo(2.4, 6);
  });
});

describe('raise and lower while holding', () => {
  it('trigger steps are analogue and snap to 0.1 m; LB is slower', () => {
    let raw = 0;
    for (let i = 0; i < 30; i++) raw = liftStep(raw, 1, 0, 1 / 60, false);
    expect(raw).toBeCloseTo(0.5, 6);
    expect(liftSnap(raw, 0.1)).toBe(0.5);
    expect(liftSnap(0.149, 0.1)).toBe(0.1);
    expect(liftSnap(-0.26, 0.1)).toBe(-0.3);
    expect(liftStep(0, 1, 0, 1, true)).toBeLessThan(liftStep(0, 1, 0, 1, false));
    expect(liftStep(0, 0.5, 0.5, 1, false)).toBe(0);
  });

  it('every element with a height field moves; rooms and walls stay on their level', () => {
    expect((['objects', 'lamps', 'signs', 'devices', 'exterior', 'openings', 'roofs'] as Coll[]).every(canLift)).toBe(true);
    expect(canLift('rooms')).toBe(false);
    expect(canLift('walls')).toBe(false);
    expect(liftElem('objects', { y: 0.2, h: 1 }, 0.5)).toEqual({ y: 0.7, h: 1 });
    expect(liftElem('objects', { y: 0.2, h: 1 }, -1)).toEqual({ y: 0, h: 1 });
    expect(liftElem('lamps', { at: [1, 2.4, 3], b: [4, 2.4, 3] }, 0.1)).toEqual({ at: [1, 2.5, 3], b: [4, 2.5, 3] });
    expect(liftElem('devices', { a: [0, 0.3, 0], b: [2, 0.5, 0] }, -0.5)).toEqual({ a: [0, 0, 0], b: [2, 0.2, 0] });
    expect(liftElem('devices', { at: [0, 0], y: 2.4 }, 0.2)).toEqual({ at: [0, 0], y: 2.6 });
    expect(liftElem('exterior', { y0: 3, y1: 3.2 }, 1)).toEqual({ y0: 4, y1: 4.2 });
    // an opening's sill stays inside its wall
    expect(liftElem('openings', { sill: 0.9, h: 1.2 }, 5, 3)).toEqual({ sill: 1.8, h: 1.2 });
    expect(liftElem('roofs', { base: 7.5 }, -0.3)).toEqual({ base: 7.2 });
    const room = { rect: [0, 0, 1, 1] };
    expect(liftElem('rooms', room, 1)).toBe(room);
    expect(heightWords('objects', { y: 0.5, h: 1.2 })).toBe('base 0.5 m, 1.2 m high');
    expect(heightWords('rooms', room)).toBeNull();
  });
});

describe('Resize: the corner opposite the dot stays put', () => {
  it('the dragged corner follows, the far one is fixed, min sizes hold, no flipping', () => {
    const r: [number, number, number, number] = [0, 0, 4, 3];
    expect(nearestCorner(r, 3.9, 2.8)).toBe('NE');
    expect(nearestCorner(r, 0.2, 0.1)).toBe('SW');
    expect(cornerResize(r, 'NE', 6.04, 5, 0.1, 0.5)).toEqual([0, 0, 6, 5]);
    expect(cornerResize(r, 'SW', -1, -2, 0.1, 0.5)).toEqual([-1, -2, 4, 3]);
    // past the fixed corner: stops at the min size
    expect(cornerResize(r, 'NE', -3, -3, 0.1, 0.5)).toEqual([0, 0, 0.5, 0.5]);
    expect(cornerResize(r, 'SW', 9, 9, 0.1, 0.1)).toEqual([3.9, 2.9, 4, 3]);
    expect(nearestEnd([0, 0], [5, 0], 4, 1)).toBe('b');
  });

  it('taller and shorter: objects and walls to a minimum, openings to the wall top', () => {
    expect(growElem('objects', { h: 1 }, -2, 0.1)).toEqual({ h: 0.1 });
    expect(growElem('walls', { h: 3 }, 0.5, 0.5)).toEqual({ h: 3.5 });
    expect(growElem('openings', { sill: 1, h: 1.2 }, 5, 0.5, 3)).toEqual({ sill: 1, h: 2 });
    expect(growElem('exterior', { y0: 2, y1: 2.5 }, -3, 0.1)).toEqual({ y0: 2, y1: 2.1 });
  });
});

/** Tile words (fix-up decision 3): a size like "6 x 5 m" or a length like "1.75 m" reads as one word. */
const words = (s: string): number => s.replace(/\d+(\.\d+)? x \d+(\.\d+)? m\b/g, 'SIZE').replace(/\d+(\.\d+)? m\b/g, 'LEN').split(/\s+/).filter(Boolean).length;
const BUTTONS = /\b(A|B|X|Y|LB|RB|LT|RT|D-pad|Menu|View|LS|RS)\b(?! [a-z]*view)/;

describe('tile words: plain, 2-5 words, no button names', () => {
  const view = { layout: '3d', ghost: true, exploded: true, gap: 3, cut: 1.2, preset: 'upTo', building: 'all', minimap: true, labels: true, underlay: true, lmode: 'Switched off', circuit: 'C1', night: { on: true, time: '01:10', frac: 0.5, brief: 0.5, bearing: '205', height: '54', brightness: 'Full', used: true } } as const;
  const base: MenuInput = { sel: null, clipboard: false, view };
  const inputs: MenuInput[] = [base, { ...base, clipboard: true }, { ...base, group: 2 }, { ...base, group: 4, alignFirst: true }];
  for (const coll of ['rooms', 'walls', 'openings', 'stairs', 'ladders', 'voids', 'roofs', 'objects', 'exterior', 'lamps', 'circuits', 'guards', 'objectives', 'hides', 'devices', 'ceilings', 'crawls', 'signs'] as Coll[])
    inputs.push({ ...base, sel: { coll, type: coll === 'devices' ? 'camera' : coll === 'lamps' ? 'flood' : 'x', gap: true, breakable: true } });
  for (const g of [...GROUPS.map((q) => q.id), 'signs' as const]) inputs.push({ ...base, objGroup: g });
  for (const g of LIGHT_GROUPS) inputs.push({ ...base, lightGroup: g.id });
  const list = START_PRESETS.map((p) => ({ id: p.id, name: p.name, desc: presetWords(p) }));
  inputs.push({ ...base, presets: { from: 'start', list, mine: null } }, { ...base, presets: { from: 'mine', list, mine: { id: 'm1', name: 'Mine' } } }, { ...base, presets: { from: 'mine', list: [], mine: null } });
  const all = new Map<string, Tile>();
  for (const inp of inputs) for (const tab of MENU_TABS) for (const t of menuTiles(tab, inp)) all.set(`${t.id}|${t.desc}|${t.disabled ?? ''}`, t);

  it('covers every tab', () => {
    expect(menuTabs({ ...base, sel: { coll: 'rooms', type: 'x' } }).length).toBe(MENU_TABS.length);
    expect(all.size).toBeGreaterThan(150);
  });

  it('every description and disabled reason: 2-5 words, a capital first, no full stop, no leading "A ", no button names', () => {
    const bad: string[] = [];
    for (const t of all.values())
      for (const s of [t.desc, t.disabled].filter((v): v is string => !!v)) {
        const n = words(s);
        if (n < 2 || n > 5 || !/^[A-Z0-9]/.test(s) || /[.;:]$/.test(s) || /^A /.test(s) || BUTTONS.test(s) || /[;>()]/.test(s)) bad.push(`${t.id}: "${s}" (${n})`);
      }
    expect(bad).toEqual([]);
  });

  it('titles: a capital first, no full stop, no doubled spaces', () => {
    const bad = [...all.values()].filter((t) => !/^[A-Z0-9]/.test(t.name) || /\.$/.test(t.name) || / {2}/.test(t.name)).map((t) => t.name);
    expect(bad).toEqual([]);
  });
});

describe('top and bottom handles (Michael 2026-10-14)', () => {
  const obj = { id: 'O1', level: 'L0', rect: [0, 0, 1, 1], y: 0.5, h: 1 };
  it('an object: the top changes the height (base fixed), the bottom the base (top fixed), never under the min', () => {
    expect(vertResize('objects', obj, 'top', 0.3, 0.1)).toMatchObject({ y: 0.5, h: 1.3 });
    expect(vertResize('objects', obj, 'top', -5, 0.1)).toMatchObject({ y: 0.5, h: 0.1 });
    expect(vertResize('objects', obj, 'bot', 0.2, 0.1)).toMatchObject({ y: 0.7, h: 0.8 });
    expect(vertResize('objects', obj, 'bot', -2, 0.1)).toMatchObject({ y: 0, h: 1.5 });
    expect(vertResize('objects', obj, 'bot', 3, 0.1)).toMatchObject({ y: 1.4, h: 0.1 });
    expect(vertResize('objects', obj, 'top', 0, 0.1)).toBe(obj);
  });
  it('an opening stays under its wall top and keeps its head when the sill moves', () => {
    const o = { sill: 0.9, h: 1.2 };
    expect(vertResize('openings', o, 'top', 1, 0.5, 2.7)).toMatchObject({ sill: 0.9, h: 1.8 });
    expect(vertResize('openings', o, 'bot', -0.4, 0.5, 2.7)).toMatchObject({ sill: 0.5, h: 1.6 });
    expect(vertResize('openings', o, 'bot', 1, 0.5, 2.7)).toMatchObject({ sill: 1.6, h: 0.5 });
  });
  it('walls take a top only; climb pieces their ends; signs keep the other edge; roofs their eaves', () => {
    expect(vertResize('walls', { h: 3 }, 'top', -0.2, 0.5)).toEqual({ h: 2.8 });
    expect(vertResize('walls', { h: 3 }, 'bot', 1, 0.5)).toEqual({ h: 3 });
    expect(vertResize('exterior', { y0: 0, y1: 6 }, 'top', -1, 0.1)).toEqual({ y0: 0, y1: 5 });
    expect(vertResize('exterior', { y0: 0, y1: 6 }, 'bot', 7, 0.1)).toEqual({ y0: 5.9, y1: 6 });
    expect(vertResize('signs', { y: 2, size: [0.9, 0.2] }, 'top', 0.1, 0.1)).toEqual({ y: 2.05, size: [0.9, 0.3] });
    expect(vertResize('signs', { y: 2, size: [0.9, 0.2] }, 'bot', 0.5, 0.1)).toEqual({ y: 2.05, size: [0.9, 0.1] });
    expect(vertResize('roofs', { base: 6 }, 'bot', 0.4, 0.1)).toEqual({ base: 6.4 });
    expect(VERT_TOP).toContain('roofs');
    expect(VERT_BOT).not.toContain('walls');
    expect(isVert('top') && isVert('bot') && !isVert('NE') && !isVert(null)).toBe(true);
  });

  it('lamps and devices take one bottom handle: the mounting height, never under the floor (Michael 2026-10-14)', () => {
    expect(VERT_BOT).toContain('lamps');
    expect(VERT_BOT).toContain('devices');
    expect(VERT_TOP).not.toContain('lamps');
    expect(vertResize('lamps', { at: [1, 2.5, 3] }, 'bot', -0.5, 0.1)).toEqual({ at: [1, 2, 3] });
    expect(vertResize('lamps', { at: [1, 2.5, 3], b: [4, 2.5, 3] }, 'bot', 0.3, 0.1)).toEqual({ at: [1, 2.8, 3], b: [4, 2.8, 3] });
    expect(vertResize('lamps', { at: [1, 2.5, 3] }, 'top', 1, 0.1)).toEqual({ at: [1, 2.5, 3] });
    expect(vertResize('devices', { y: 2 }, 'bot', 0.3, 0.1)).toEqual({ y: 2.3 });
    expect(vertResize('devices', { y: 2 }, 'bot', -5, 0.1)).toEqual({ y: 0 });
  });

  it('a roof ridge handle sets the pitch (or a barrel roof its rise); a flat roof has none (Michael 2026-10-14)', () => {
    const gable: RoofData = { id: 'R', level: 'G', rect: [0, 0, 10, 6], base: 6, type: 'gable', pitch: 45, ridge: 'x', overhang: 0 };
    expect(ridgeHandle(gable)).toEqual({ x: 5, z: 3, y: 9 });
    // the ridge 1 m lower: rise 2 over a 3 m run, atan(2 / 3) = 33.7 degrees
    expect(vertResize('roofs', gable, 'top', -1, 0.1)).toMatchObject({ pitch: 33.7, base: 6 });
    expect(ridgeResize(gable, 100).pitch).toBe(60);
    expect(ridgeResize(gable, -5).pitch).toBe(1);
    expect(ridgeHandle({ ...gable, pitch: 33.7 })!.y).toBeCloseTo(8, 2);
    const mono: RoofData = { id: 'M', level: 'G', rect: [0, 0, 4, 10], base: 3, type: 'mono', pitch: 45, high: 'N', overhang: 0 };
    expect(ridgeHandle(mono)).toEqual({ x: 2, z: 10, y: 13 });
    expect(ridgeResize(mono, -5).pitch).toBe(26.6);
    const barrel: RoofData = { id: 'C', level: 'G', rect: [0, 0, 10, 6], base: 6, type: 'curved', rise: 1.5, ridge: 'x', overhang: 0 };
    expect(ridgeHandle(barrel)!.y).toBeCloseTo(7.5, 3);
    expect(ridgeResize(barrel, 1).rise).toBe(2.5);
    expect(ridgeResize(barrel, 9).rise).toBe(3);
    expect(ridgeResize(barrel, -9).rise).toBe(0.1);
    const flat: RoofData = { id: 'F', level: 'G', rect: [0, 0, 10, 6], base: 6, type: 'flat' };
    expect(ridgeHandle(flat)).toBeNull();
    expect(vertResize('roofs', flat, 'top', 1, 0.1)).toBe(flat);
  });
});
