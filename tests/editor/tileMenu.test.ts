import { describe, expect, it } from 'vitest';
import { repeatEvery, STEPS, StepRepeat, navAxes } from '../../src/editor/stickSteps';
import { gridMove, LIGHT_TOOLS, menuGroup, menuGroups, menuTabs, menuTiles, stepGroup, TileMenu } from '../../src/editor/tileMenu';
import type { MenuInput } from '../../src/editor/tileMenu';

const view = { layout: '3d', ghost: false, exploded: false, gap: 3, cut: 0, preset: 'upTo', building: 'all', minimap: false, labels: true, underlay: false } as const;
const none: MenuInput = { sel: null, clipboard: false, view };
const room: MenuInput = { sel: { coll: 'rooms', type: 'room' }, clipboard: true, view };
const door: MenuInput = { sel: { coll: 'openings', type: 'door' }, clipboard: false, view };
const names = (tab: Parameters<typeof menuTiles>[0], inp: MenuInput): string[] => menuTiles(tab, inp).map((t) => t.name);

describe('tile menu model (ON0a)', () => {
  it('tabs: Selected only with a selection and first; every tab has tiles (ON8 filled Mission)', () => {
    expect(menuTabs(none)).toEqual(['Build', 'Openings', 'Objects', 'Presets', 'Climb', 'Lights', 'Mission', 'Security', 'View']);
    expect(menuTabs(room)).toEqual(['Selected', 'Build', 'Openings', 'Objects', 'Presets', 'Climb', 'Lights', 'Mission', 'Security', 'View']);
  });

  it('Mission tab (ON8): Guard and the markers; a guard has Edit path, Play patrol and Mark alone here, no Duplicate', () => {
    expect(names('Mission', none)).toEqual(['Guard', 'Insertion', 'Extraction', 'Objective', 'Intel', 'Checkpoint', 'Hide']);
    const g = names('Selected', { ...none, sel: { coll: 'guards', type: 'grunt' } });
    expect(g.slice(0, 4)).toEqual(['Edit path', 'Play patrol', 'Mark alone here', 'Move']);
    expect(g).not.toContain('Duplicate');
    expect(g).toContain('Delete');
    expect(names('Selected', { ...none, sel: { coll: 'guards', type: 'grunt' }, playing: true })[1]).toBe('Stop patrol');
    expect(names('Selected', { ...none, sel: { coll: 'objectives', type: 'intel' } }).slice(0, 2)).toEqual(['Needs first', 'Opens']);
    expect(menuTiles('View', none).at(-4)!.value).toBe('All guards');
    // ON12: the Security tab and the coverage view; a camera has Aim, no Duplicate
    expect(names('Security', none)).toEqual(['Fixed camera', 'Pan camera', 'Card reader', 'Keypad', 'Motion sensor', 'Beam']);
    expect(menuTiles('View', none).at(-3)!.name).toBe('Security coverage');
    // ON13: the ceiling voids view; Build > Crawl space; a room's Ceiling, a ceiling's Room, no Move, Duplicate or Rename
    expect(menuTiles('View', none).at(-2)!.name).toBe('Ceiling voids');
    // ON15: Moon and time last; its rows only while it is on
    expect(menuTiles('View', none).at(-1)!.name).toBe('Moon and time');
    const nv = { ...none, view: { ...none.view, night: { on: true, time: '01:10 Brief', frac: 0.57, brief: 0.57, bearing: '205 (SW)', height: '54 degrees', brightness: 'New', used: false } } };
    expect(menuTiles('View', nv).slice(-6).map((t) => t.name)).toEqual(['Moon and time', 'Time of night', 'Moon bearing', 'Moon height', 'Moon brightness', 'Use for the map']);
    expect(names('Selected', { ...none, sel: { coll: 'rooms', type: 'corridor' } })).toContain('Ceiling');
    expect(names('Selected', { ...none, sel: { coll: 'ceilings', type: '' } })).toEqual(['Room', 'Change type', 'Properties', 'Delete']);
    expect(names('Selected', { ...none, sel: { coll: 'crawls', type: '' } })).not.toContain('Duplicate');
    const cam = names('Selected', { ...none, sel: { coll: 'devices', type: 'camera' } });
    expect(cam).toContain('Aim');
    expect(cam).not.toContain('Duplicate');
  });

  it('Objects tab (ON4, group row 2026-10-14): the groups on the group row, the tiles only the chosen group objects', () => {
    expect(menuGroups('Objects').map((g) => g.name)).toEqual(['Data hall', 'Plant', 'Office and security', 'Goods-in', 'Yard and roof', 'Signs']);
    const inp = { ...none, objGroup: 'goodsIn' as const };
    expect(menuGroup('Objects', inp)).toBe('objgroup.goodsIn');
    const t = menuTiles('Objects', inp);
    expect(t.map((x) => x.id)).toContain('obj.crate-1.0');
    expect(t.every((x) => x.id.startsWith('obj.'))).toBe(true);
    expect(menuTiles('Objects', none).slice(0, 2).map((x) => x.name)).toEqual(['Server rack 42U', 'Rack row']);
    // ON14: Signs is a sixth group; its tiles are the sign kinds
    expect(menuTiles('Objects', { ...none, objGroup: 'signs' }).slice(0, 2).map((x) => x.id)).toEqual(['sign.direction', 'sign.room-sign']);
  });

  it('group row (Michael 2026-10-14): only Objects, Presets and Lights; LT / RT step it with wrap; no group tiles left', () => {
    expect(['Build', 'Openings', 'Climb', 'Mission', 'Security', 'View', 'Selected'].map((t) => menuGroups(t as Parameters<typeof menuGroups>[0]).length)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(menuGroup('Build', none)).toBeNull();
    expect(stepGroup('Build', none, 1)).toBeNull();
    expect(stepGroup('Lights', none, 1)).toBe('lightgroup.plant');
    expect(stepGroup('Lights', none, -1)).toBe('lightgroup.' + LIGHT_TOOLS);
    expect(stepGroup('Objects', { ...none, objGroup: 'signs' }, 1)).toBe('objgroup.dataHall');
    expect(stepGroup('Presets', none, 1)).toBe('presetfrom.kit');
    for (const tab of ['Objects', 'Presets', 'Lights'] as const) for (const g of menuGroups(tab)) expect(menuTiles(tab, { ...none, presets: { from: 'start', list: [], mine: null } }).some((t) => t.id === g.id)).toBe(false);
    // a tab with groups shows even when the chosen group is empty
    expect(menuTabs({ ...none, presets: { from: 'mine', list: [], mine: null } })).toContain('Presets');
  });

  it('the highlight is remembered per tab and group', () => {
    const m = new TileMenu();
    const a = { ...none, lightGroup: 'interior' as const };
    const b = { ...none, lightGroup: 'outside' as const };
    m.open(a);
    m.setTab('Lights', a);
    m.move(1, 0, 4, a);
    m.move(1, 0, 4, a);
    expect(m.index).toBe(2);
    m.groupChanged(b);
    expect(m.index).toBe(0);
    m.move(1, 0, 4, b);
    m.groupChanged(a);
    expect(m.index).toBe(2);
    m.groupChanged(b);
    expect(m.index).toBe(1);
  });

  it('Lights tab (ON6, group row): the five groups and Switch and test on the group row, the tiles only fittings; a lamp has Aim and Circuit', () => {
    expect(menuGroups('Lights').map((g) => g.name)).toEqual(['Interior', 'Plant and goods', 'Outside', 'Emergency', 'Glow', 'Switch and test']);
    const t = menuTiles('Lights', { ...none, lightGroup: 'emergency' });
    expect(t.map((x) => x.id)).toEqual(['light.spitfire', 'light.exit-sign', 'light.emergency-bulkhead']);
    expect(menuTiles('Lights', none).slice(0, 2).map((x) => x.name)).toEqual(['Downlight 90 mm', 'Troffer 600 x 600']);
    // Switch and ON7's guard view tester are their own group
    expect(menuTiles('Lights', { ...none, lightGroup: LIGHT_TOOLS }).map((x) => x.id)).toEqual(['light.switch', 'guard.view']);
    // ON7: a breakable lamp can be previewed shot out
    expect(names('Selected', { ...none, sel: { coll: 'lamps', type: 'downlight', breakable: true } })).toContain('Preview shot out');
    expect(names('Selected', { ...none, sel: { coll: 'lamps', type: 'floodlight' } })).toEqual(['Move', 'Duplicate', 'Aim', 'Circuit', 'Mirror east-west', 'Mirror north-south', 'Mirror about a line', 'Array', 'Rename id', 'Change type', 'Properties', 'Delete']);
    expect(names('Selected', { ...none, sel: { coll: 'lamps', type: 'downlight' } })).not.toContain('Aim');
    expect(names('Selected', { ...none, sel: { coll: 'circuits', type: '' } })).toContain('Add lamps');
  });

  it('tile order: Build, Openings and the Selected tab per element kind', () => {
    expect(names('Build', none)).toEqual(['Select', 'Room with walls', 'Room with outside walls', 'Room only', 'Wall', 'Stair: Main dogleg', 'Stair: Fire dogleg', 'Straight stair', 'Ladder', 'Floor hole', 'Crawl space', 'Roof: Flat', 'Roof: Mono-pitch (skillion)', 'Roof: Gable', 'Roof: Hip', 'Roof: Sawtooth', 'Roof: Curved (barrel)', 'Measure', 'Paste', 'Paste to level above']);
    expect(menuTiles('Build', none).find((t) => t.id === 'build.paste')!.disabled).toBeTruthy();
    expect(menuTiles('Build', room).find((t) => t.id === 'build.paste')!.disabled).toBeUndefined();
    expect(names('Openings', none)).toEqual(['Single door', 'Fire door', 'Double door', 'Glass swing door', 'Sliding glass door (automatic)', 'Sliding glass door (card)', 'Sliding door (manual)', 'Roller shutter', 'Gate', 'Sliding gate', 'Hatch', 'Arch (no leaf)', 'Fixed window', 'Opening window (top hung)', 'Frosted fixed window', 'Louvre window', 'Roof light']);
    expect(names('Selected', room)).toEqual(['Move', 'Duplicate', 'Rotate 90', 'Copy', 'Copy to level above', 'Floor finish', 'Ceiling', 'Save as preset', 'Split', 'Mirror east-west', 'Mirror north-south', 'Mirror about a line', 'Array', 'Name plates: this level', 'Name plates: this building', 'Rename id', 'Change type', 'Properties', 'Delete']);
    expect(names('Selected', door)).toEqual(['Move', 'Duplicate', 'Mirror east-west', 'Mirror north-south', 'Mirror about a line', 'Rename id', 'Change type', 'Properties', 'Delete']);
    expect(names('Selected', { ...none, sel: { coll: 'ladders', type: '' } })).toEqual(['Move', 'Duplicate', 'Rotate 90', 'Mirror east-west', 'Mirror north-south', 'Mirror about a line', 'Array', 'Rename id', 'Properties', 'Delete']);
    expect(names('Selected', { ...none, sel: { coll: 'stairs', type: 'main' } })).toEqual(['Move', 'Duplicate', 'Rotate 90', 'Fit', 'Turn climb 90', 'Mirror east-west', 'Mirror north-south', 'Mirror about a line', 'Array', 'Rename id', 'Change type', 'Properties', 'Delete']);
    // ON14: a set: mirror, align (to the outermost or the first picked), evenly space (three or more), Array
    const two = menuTiles('Selected', { ...none, group: 2 });
    expect(two.map((t) => t.id)).toEqual(expect.arrayContaining(['sel.mirrorX', 'sel.align.left', 'sel.align.cz', 'sel.alignFirst', 'sel.distX', 'sel.array']));
    expect(two.find((t) => t.id === 'sel.distX')!.disabled).toBeTruthy();
    expect(menuTiles('Selected', { ...none, group: 3 }).find((t) => t.id === 'sel.distX')!.disabled).toBeUndefined();
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
  it('the three sources on the group row; the tiles are the shown source presets; Mine adds Rename and Delete', () => {
    const view = { layout: '3d', ghost: false, exploded: false, gap: 0, cut: 0, preset: 'whole', building: 'all', minimap: false, labels: true, underlay: false } as const;
    const inp = { sel: null, clipboard: false, view, presets: { from: 'start' as const, list: [{ id: 'start.office-4', name: '4-desk office', desc: '6 x 5 m' }], mine: null } };
    expect(menuGroups('Presets').map((g) => g.id)).toEqual(['presetfrom.start', 'presetfrom.kit', 'presetfrom.mine']);
    expect(menuTiles('Presets', inp).map((t) => t.id)).toEqual(['preset.start.office-4']);
    const mine = { ...inp, presets: { from: 'mine' as const, list: [], mine: null } };
    expect(menuGroup('Presets', mine)).toBe('presetfrom.mine');
    const tiles = menuTiles('Presets', mine);
    expect(tiles.map((t) => t.id)).toEqual(['mine.rename', 'mine.delete']);
    expect(tiles[0]!.disabled).toBeTruthy();
    expect(menuTiles('Selected', { ...inp, group: 3 }).map((t) => t.name)).toContain('Save as preset');
  });
});
