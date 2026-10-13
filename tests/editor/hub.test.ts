import { describe, expect, it } from 'vitest';
import { changeSetting, controllerLabels, DEFAULT_SETTINGS, HUB_TABS, hubRows, PICTURE_BUTTONS, readSettings, stepLayout, stepTab } from '../../src/editor/hub';
import type { HubInput } from '../../src/editor/hub';

const input: HubInput = {
  unsaved: 2,
  changes: ['Moved Office 1 m east', 'Added wall W1'],
  problems: [{ text: 'FAIL L3: room G01 has no door', fresh: true }],
  levels: [{ id: 'F', name: 'First', floor: '4.2', editing: false }, { id: 'G', name: 'Ground', floor: '0', editing: true }],
  view: { layout: '3d', ghost: false, exploded: true, gap: 3, cut: 0, preset: 'upTo', building: 'A', minimap: false, labels: true, underlay: false },
  settings: DEFAULT_SETTINGS,
};

describe('hub tabs and rows', () => {
  it('seven tabs; LB / RB wrap', () => {
    expect([...HUB_TABS]).toEqual(['Play', 'File', 'Checks', 'Levels', 'View', 'Settings', 'Help']);
    expect(stepTab('Play', -1)).toBe('Help');
    expect(stepTab('Help', 1)).toBe('Play');
    expect(stepTab('File', 1)).toBe('Checks');
  });

  it('Play: quick walk, the walk test as the player (enabled), and Find (ON3)', () => {
    const r = hubRows('Play', input);
    expect(r.map((x) => x.text)).toEqual(['Quick walk at the dot', 'Walk test as the player', 'Start at insertion 1', 'Find a room, stair or object']);
    expect(r[1]!.disabled).toBeFalsy();
    expect(r[1]!.id).toBe('play.walk');
    // ON8: greyed until there is an insertion point
    expect(r[2]!.disabled).toBe(true);
    const on = hubRows('Play', { ...input, insertion: { on: true, n: 1 } })[2]!;
    expect([on.value, !!on.disabled]).toEqual(['on', false]);
  });

  it('File: undone changes grey above the list with "redo up to here" (ON3)', () => {
    const r = hubRows('File', { ...input, undone: ['Added Store', 'Moved Store 1 m north'] });
    expect(r.slice(2, 4).map((x) => [x.id, x.undone, x.note])).toEqual([['redo.0', true, 'Undone'], ['redo.1', true, 'Undone; A: redo up to here']]);
    expect(r[4]!.undone).toBeFalsy();
  });

  it('Checks: a line naming nothing says "no place to go" (ON3)', () => {
    const r = hubRows('Checks', { ...input, problems: [{ text: 'opening count 3', fresh: false, place: false }, { text: 'R1 too small', fresh: false, place: true }] });
    expect(r.slice(1).map((x) => x.note)).toEqual(['no place to go', undefined]);
  });

  it('View: bookmarks after the view rows (ON3)', () => {
    const r = hubRows('View', { ...input, bookmarks: [{ slot: 2, name: 'Gatehouse view' }] });
    expect(r.slice(-2).map((x) => [x.id, x.text])).toEqual([['bm.save', 'Bookmarks: save this view'], ['bm.go.2', 'Go to: Gatehouse view']]);
  });

  it('File: save with the unsaved count, revert, the change list newest first', () => {
    const r = hubRows('File', input);
    expect(r.map((x) => x.id)).toEqual(['file.save', 'file.revert', 'undo.0', 'undo.1']);
    expect(r[0]!.value).toBe('2 unsaved');
    expect(r[2]!.text).toBe('Moved Office 1 m east');
  });

  it('Checks: next problem, then the lines with new ones marked', () => {
    const r = hubRows('Checks', input);
    expect(r[0]!.id).toBe('checks.next');
    expect(r[1]).toMatchObject({ id: 'prob.0', fresh: true });
    expect(hubRows('Checks', { ...input, problems: [] })[0]!.disabled).toBe(true);
  });

  it('Levels, View and Settings rows', () => {
    expect(hubRows('Levels', input).map((x) => [x.text, x.value])).toEqual([['First (4.2 m)', undefined], ['Ground (0 m)', 'editing']]);
    expect(hubRows('View', input).map((x) => `${x.text}: ${x.value}`)).toEqual(['Layout: 3D', 'Ghost other levels: off', 'Exploded: 3 m gap', 'Cut walls at: off', 'Levels shown: Up to this level', 'Building filter: Building A', 'Small plan: off', 'Labels: on', 'Level below on the plan: off', 'Room names in 3D: off', 'Scale figure: off', 'Stealth view: off', 'Finish view: off', 'Lighting: off', 'Darkness map: off', 'Lights preview: Normal', 'Guard paths: All guards', 'Security coverage: off', 'Ceiling voids: off', 'Bookmarks: save this view: undefined']);
    expect(hubRows('Settings', input).map((x) => x.value)).toEqual(['on', '0.1 m', '1.00x', '1.00x', 'Medium', '0.15', '1.00x', 'off', 'Normal', 'Last tab', 'on']);
    expect(hubRows('Settings', input).map((x) => x.text).slice(1, 6)).toEqual(['Grid', 'Pan speed', 'Orbit speed', 'Smoothing', 'Dead zone']);
    expect(hubRows('Settings', input).find((x) => x.id === 'set.repeat')!.slider).toBeCloseTo((1 - 0.5) / 1.5);
    expect(hubRows('Help', input)).toEqual([]);
    expect(stepLayout('3d', -1)).toBe('plan');
    expect(stepLayout('plan', 1)).toBe('3d');
  });
});

describe('pad settings', () => {
  it('stick speed steps 0.25 between 0.5 and 2; toggles flip', () => {
    let s = DEFAULT_SETTINGS;
    for (let i = 0; i < 10; i++) s = changeSetting(s, 'set.speed', 1);
    expect(s.stickSpeed).toBe(2);
    for (let i = 0; i < 10; i++) s = changeSetting(s, 'set.speed', -1);
    expect(s.stickSpeed).toBe(0.5);
    expect(changeSetting(s, 'set.speed', 1).stickSpeed).toBe(0.75);
    expect(changeSetting(DEFAULT_SETTINGS, 'set.rumble', 1).rumble).toBe(false);
    expect(changeSetting(DEFAULT_SETTINGS, 'set.invert', -1).invertTilt).toBe(true);
    expect(changeSetting(DEFAULT_SETTINGS, 'set.text', 1).textSize).toBe('large');
    expect(changeSetting(DEFAULT_SETTINGS, 'set.follow', 1).wallsFollow).toBe(false);
    expect(changeSetting(DEFAULT_SETTINGS, 'set.menuOpens', 1).menuOpens).toBe('build');
    expect(changeSetting(DEFAULT_SETTINGS, 'set.repeat', 1).repeatSpeed).toBe(1.25);
    let r = DEFAULT_SETTINGS;
    for (let i = 0; i < 10; i++) r = changeSetting(r, 'set.repeat', -1);
    expect(r.repeatSpeed).toBe(0.5);
  });

  it('stored settings keep only valid fields (old prefs had rumble only)', () => {
    expect(readSettings({ rumble: false })).toEqual({ ...DEFAULT_SETTINGS, rumble: false });
    expect(readSettings({ stickSpeed: 9, textSize: 'huge', invertTilt: 'yes', menuOpens: 'first', repeatSpeed: 5 })).toEqual(DEFAULT_SETTINGS);
    expect(readSettings({ menuOpens: 'build', repeatSpeed: 1.5 })).toEqual({ ...DEFAULT_SETTINGS, menuOpens: 'build', repeatSpeed: 1.5 });
    expect(readSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(readSettings({ grid: 0.3, deadZone: 0.9, smoothing: 'max', orbitSpeed: 0 })).toEqual(DEFAULT_SETTINGS);
    expect(readSettings({ grid: 0.5, deadZone: 0.25, smoothing: 'high', orbitSpeed: 1.5 })).toEqual({ ...DEFAULT_SETTINGS, grid: 0.5, deadZone: 0.25, smoothing: 'high', orbitSpeed: 1.5 });
  });

  it('ON0b: the grid is 0.1 m by default and cycles 0.1, 0.25, 0.5; camera settings step and stop at the ends', () => {
    expect(DEFAULT_SETTINGS.grid).toBe(0.1);
    const g1 = changeSetting(DEFAULT_SETTINGS, 'set.grid', 1);
    expect([g1.grid, changeSetting(g1, 'set.grid', 1).grid, changeSetting(DEFAULT_SETTINGS, 'set.grid', -1).grid]).toEqual([0.25, 0.5, 0.5]);
    expect(changeSetting(DEFAULT_SETTINGS, 'set.smooth', 1).smoothing).toBe('high');
    expect(changeSetting(changeSetting(DEFAULT_SETTINGS, 'set.smooth', -1), 'set.smooth', -1).smoothing).toBe('low');
    expect(changeSetting(DEFAULT_SETTINGS, 'set.dead', 1).deadZone).toBe(0.2);
    let d = DEFAULT_SETTINGS;
    for (let i = 0; i < 10; i++) d = changeSetting(d, 'set.dead', -1);
    expect(d.deadZone).toBe(0.05);
    expect(changeSetting(DEFAULT_SETTINGS, 'set.orbit', 1).orbitSpeed).toBe(1.25);
  });
});

describe('help picture labels', () => {
  it('every picture button is labelled from the action map, in the pad style', () => {
    const l = controllerLabels('xbox');
    expect(l.map((x) => x.button)).toEqual([...PICTURE_BUTTONS.left, ...PICTURE_BUTTONS.right]);
    const by = (b: string): string => l.find((x) => x.button === b)!.words;
    expect(by('Y')).toMatch(/the tile menu/);
    expect(by('RB')).toMatch(/go to the selection/);
    expect(by('RB')).not.toMatch(/hold/);
    expect(by('D-pad left')).toMatch(/the selection card/);
    expect(by('Menu')).toMatch(/the hub/);
    expect(by('X')).toMatch(/undo; hold: redo/);
    expect(by('L3')).toMatch(/quick walk/);
    expect(by('D-pad up')).toMatch(/level up/);
    for (const x of l) expect(x.words, x.button).not.toBe('');
    expect(controllerLabels('playstation').find((x) => x.button === 'A')!.name).toBe('✕');
  });
});
