import { describe, expect, it } from 'vitest';
import { repeatEvery, STEPS, StepRepeat, navAxes } from '../../src/editor/stickSteps';
import { gridMove, menuTabs, menuTiles, TileMenu } from '../../src/editor/tileMenu';
import type { MenuInput } from '../../src/editor/tileMenu';

const view = { layout: '3d', ghost: false, exploded: false, gap: 3, cut: 0, preset: 'upTo', building: 'all', minimap: false, labels: true, underlay: false } as const;
const none: MenuInput = { sel: null, clipboard: false, view };
const room: MenuInput = { sel: { coll: 'rooms', type: 'room' }, clipboard: true, view };
const door: MenuInput = { sel: { coll: 'openings', type: 'door' }, clipboard: false, view };
const names = (tab: Parameters<typeof menuTiles>[0], inp: MenuInput): string[] => menuTiles(tab, inp).map((t) => t.name);

describe('tile menu model (ON0a)', () => {
  it('tabs: Selected only with a selection and first; empty tabs (Lights, Mission) hidden until later parts add tiles', () => {
    expect(menuTabs(none)).toEqual(['Build', 'Openings', 'Objects', 'Presets', 'Climb', 'View']);
    expect(menuTabs(room)).toEqual(['Selected', 'Build', 'Openings', 'Objects', 'Presets', 'Climb', 'View']);
  });

  it('Objects tab (ON4): the five groups, then the presets of the chosen group', () => {
    const t = menuTiles('Objects', { ...none, objGroup: 'goodsIn' });
    expect(t.slice(0, 5).map((x) => x.name)).toEqual(['Data hall', 'Plant', 'Office and security', 'Goods-in', 'Yard and roof']);
    expect(t.find((x) => x.id === 'objgroup.goodsIn')!.on).toBe(true);
    expect(t.slice(5).map((x) => x.id)).toContain('obj.crate-1.0');
    expect(menuTiles('Objects', none).slice(5, 7).map((x) => x.name)).toEqual(['Server rack 42U', 'Rack row']);
  });

  it('tile order: Build, Openings and the Selected tab per element kind', () => {
    expect(names('Build', none)).toEqual(['Select', 'Room with walls', 'Room with outside walls', 'Room only', 'Wall', 'Stair: Main dogleg', 'Stair: Fire dogleg', 'Straight stair', 'Ladder', 'Floor hole', 'Roof: Flat', 'Roof: Mono-pitch (skillion)', 'Roof: Gable', 'Roof: Hip', 'Roof: Sawtooth', 'Roof: Curved (barrel)', 'Measure', 'Paste', 'Paste to level above']);
    expect(menuTiles('Build', none).find((t) => t.id === 'build.paste')!.disabled).toBeTruthy();
    expect(menuTiles('Build', room).find((t) => t.id === 'build.paste')!.disabled).toBeUndefined();
    expect(names('Openings', none)).toEqual(['Single door', 'Fire door', 'Double door', 'Glass swing door', 'Sliding glass door (automatic)', 'Sliding glass door (card)', 'Sliding door (manual)', 'Roller shutter', 'Gate', 'Sliding gate', 'Hatch', 'Arch (no leaf)', 'Fixed window', 'Opening window (top hung)', 'Frosted fixed window', 'Louvre window', 'Roof light']);
    expect(names('Selected', room)).toEqual(['Move', 'Duplicate', 'Rotate 90', 'Copy', 'Copy to level above', 'Floor finish', 'Save as preset', 'Split', 'Rename id', 'Change type', 'Properties', 'Delete']);
    expect(names('Selected', door)).toEqual(['Move', 'Duplicate', 'Rename id', 'Change type', 'Properties', 'Delete']);
    expect(names('Selected', { ...none, sel: { coll: 'ladders', type: '' } })).toEqual(['Move', 'Duplicate', 'Rotate 90', 'Rename id', 'Properties', 'Delete']);
    expect(names('Selected', { ...none, sel: { coll: 'stairs', type: 'main' } })).toEqual(['Move', 'Duplicate', 'Rotate 90', 'Fit', 'Turn climb 90', 'Rename id', 'Change type', 'Properties', 'Delete']);
    expect(names('View', none).slice(0, 5)).toEqual(['Layout', 'Ghost other levels', 'Exploded', 'Cut walls at', 'Levels shown']);
  });

  it('grid navigation wraps: left / right through the list, up / down by a row in the same column', () => {
    expect(gridMove(0, 8, 4, -1, 0)).toBe(7);
    expect(gridMove(7, 8, 4, 1, 0)).toBe(0);
    expect(gridMove(1, 8, 4, 0, 1)).toBe(5);
    expect(gridMove(5, 8, 4, 0, 1)).toBe(1);
    expect(gridMove(2, 7, 4, 0, -1)).toBe(6);
    expect(gridMove(3, 7, 4, 0, -1)).toBe(3);
    expect(gridMove(0, 0, 4, 1, 0)).toBe(0);
  });

  it('remembers the last tab and the tile on each tab; opens on Build when asked or when the last tab is gone', () => {
    const m = new TileMenu();
    m.open(room);
    expect(m.tab).toBe('Build');
    m.move(1, 0, 4, room);
    m.move(1, 0, 4, room);
    expect(m.tile(room)!.name).toBe('Room with outside walls');
    m.stepTab(-1, room);
    expect(m.tab).toBe('Selected');
    m.move(0, 1, 4, room);
    expect(m.tile(room)!.name).toBe('Copy to level above');
    m.close();
    m.open(room);
    expect([m.tab, m.tile(room)!.name]).toEqual(['Selected', 'Copy to level above']);
    m.stepTab(1, room);
    expect(m.tile(room)!.name).toBe('Room with outside walls');
    m.stepTab(-1, room);
    m.close();
    m.open(none);
    expect(m.tab).toBe('Build');
    m.stepTab(-1, none);
    expect(m.tab).toBe('View');
    m.close();
    m.open(none, 'build');
    expect(m.tab).toBe('Build');
  });

  it('on the View list left / right do not move the highlight (they change the value)', () => {
    const m = new TileMenu();
    m.open(none);
    m.setTab('View', none);
    m.move(1, 0, 4, none);
    expect(m.index).toBe(0);
    m.move(0, 1, 4, none);
    expect(m.tile(none)!.name).toBe('Ghost other levels');
  });
});

describe('stick and D-pad steps (decision 8b)', () => {
  it('dead zone, a first step at once, repeat after FIRST, accelerating', () => {
    const r = new StepRepeat();
    expect(r.update(STEPS.DEAD - 0.01, 0)).toBe(0);
    expect(r.update(1, 0)).toBe(1);
    expect(r.update(1, 0.1)).toBe(0);
    expect(r.update(1, STEPS.FIRST - 0.01)).toBe(0);
    expect(r.update(1, STEPS.FIRST)).toBe(1);
    // count the steps in the first and the third second of holding
    let early = 0;
    let late = 0;
    for (let t = STEPS.FIRST + 0.01; t < 4; t += 0.01) {
      const s = r.update(1, t);
      if (t < 1.35) early += s;
      else if (t >= 3 && t < 4) late += s;
    }
    expect(late).toBeGreaterThan(early);
    expect(r.update(0, 4)).toBe(0);
    expect(r.update(-1, 4.01)).toBe(-1);
  });

  it('further pushed repeats faster; repeat speed scales it', () => {
    expect(repeatEvery(0, 1)).toBeLessThan(repeatEvery(0, 0.6));
    expect(repeatEvery(10, 1)).toBeCloseTo(STEPS.FASTEST);
    const slow = new StepRepeat();
    const fast = new StepRepeat();
    fast.speed = 2;
    slow.update(1, 0);
    fast.update(1, 0);
    expect(fast.update(1, STEPS.FIRST / 2)).toBe(1);
    expect(slow.update(1, STEPS.FIRST / 2)).toBe(0);
  });

  it('the D-pad wins; on the stick only the stronger axis counts', () => {
    expect(navAxes(1, 0, -1, 1)).toEqual({ x: 1, y: 0 });
    expect(navAxes(0, 0, 0.6, 0.8)).toEqual({ x: 0, y: 0.8 });
    expect(navAxes(0, 0, -0.9, 0.2)).toEqual({ x: -0.9, y: 0 });
  });
});

describe('Climb tab (ON5)', () => {
  it('one tile per climb piece, in catalogue order; a climb piece has Change type', () => {
    const none2: MenuInput = { sel: null, clipboard: false, view: { layout: '3d', ghost: false, exploded: false, gap: 3, cut: 0, preset: 'whole', building: 'all', minimap: false, labels: true, underlay: false } };
    expect(menuTiles('Climb', none2).map((t) => t.id)).toEqual(['climb.downpipe', 'climb.pipe', 'climb.ledge', 'climb.sill', 'climb.parapet', 'climb.vent', 'climb.duct', 'climb.fire-escape', 'climb.lamp-post', 'climb.fence']);
    expect(menuTiles('Selected', { ...none2, sel: { coll: 'exterior', type: 'downpipe' } }).map((t) => t.name)).toContain('Change type');
  });
});

describe('ON11 Presets tab', () => {
  it('shows the three sources, then the shown source presets; Mine adds Rename and Delete', () => {
    const view = { layout: '3d', ghost: false, exploded: false, gap: 0, cut: 0, preset: 'whole', building: 'all', minimap: false, labels: true, underlay: false } as const;
    const inp = { sel: null, clipboard: false, view, presets: { from: 'start' as const, list: [{ id: 'start.office-4', name: '4-desk office', desc: '6 x 5 m' }], mine: null } };
    expect(menuTiles('Presets', inp).map((t) => t.id)).toEqual(['presetfrom.start', 'presetfrom.kit', 'presetfrom.mine', 'preset.start.office-4']);
    const mine = { ...inp, presets: { from: 'mine' as const, list: [], mine: null } };
    const tiles = menuTiles('Presets', mine);
    expect(tiles.map((t) => t.id)).toEqual(['presetfrom.start', 'presetfrom.kit', 'presetfrom.mine', 'mine.rename', 'mine.delete']);
    expect(tiles[3]!.disabled).toBeTruthy();
    expect(menuTiles('Selected', { ...inp, group: 3 }).map((t) => t.name)).toContain('Save as preset');
  });
});
