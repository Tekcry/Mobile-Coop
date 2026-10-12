import { describe, expect, it } from 'vitest';
import { changeSetting, controllerLabels, DEFAULT_SETTINGS, HUB_TABS, hubRows, PICTURE_BUTTONS, readSettings, stepLayout, stepTab } from '../../src/editor/hub';
import type { HubInput } from '../../src/editor/hub';

const input: HubInput = {
  unsaved: 2,
  changes: ['Moved Office 1 m east', 'Added wall W1'],
  problems: [{ text: 'FAIL L3: room G01 has no door', fresh: true }],
  levels: [{ id: 'F', name: 'First', floor: '4.2', editing: false }, { id: 'G', name: 'Ground', floor: '0', editing: true }],
  layout: '3d',
  labels: true,
  minimap: false,
  underlay: false,
  settings: DEFAULT_SETTINGS,
};

describe('hub tabs and rows', () => {
  it('seven tabs; LB / RB wrap', () => {
    expect([...HUB_TABS]).toEqual(['Play', 'File', 'Checks', 'Levels', 'View', 'Settings', 'Help']);
    expect(stepTab('Play', -1)).toBe('Help');
    expect(stepTab('Help', 1)).toBe('Play');
    expect(stepTab('File', 1)).toBe('Checks');
  });

  it('Play: quick walk, and the walk test greyed until the next part', () => {
    const r = hubRows('Play', input);
    expect(r.map((x) => x.text)).toEqual(['Quick walk at the dot', 'Walk test as the player']);
    expect(r[1]).toMatchObject({ disabled: true, note: 'Comes in the next part' });
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
    expect(hubRows('View', input).map((x) => `${x.text}: ${x.value}`)).toEqual(['Layout: 3D', 'Plan labels: on', 'Small plan (3D only): off', 'Level below on the plan: off']);
    expect(hubRows('Settings', input).map((x) => x.value)).toEqual(['on', '1.00x', 'off', 'Normal']);
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
  });

  it('stored settings keep only valid fields (old prefs had rumble only)', () => {
    expect(readSettings({ rumble: false })).toEqual({ ...DEFAULT_SETTINGS, rumble: false });
    expect(readSettings({ stickSpeed: 9, textSize: 'huge', invertTilt: 'yes' })).toEqual(DEFAULT_SETTINGS);
    expect(readSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('help picture labels', () => {
  it('every picture button is labelled from the action map, in the pad style', () => {
    const l = controllerLabels('xbox');
    expect(l.map((x) => x.button)).toEqual([...PICTURE_BUTTONS.left, ...PICTURE_BUTTONS.right]);
    const by = (b: string): string => l.find((x) => x.button === b)!.words;
    expect(by('Y')).toMatch(/the last tool again.*hold: Build wheel/);
    expect(by('RB')).toMatch(/go to the selection.*hold: Selection wheel/);
    expect(by('Menu')).toMatch(/the hub/);
    expect(by('X')).toMatch(/undo; hold: redo/);
    expect(by('L3')).toMatch(/quick walk/);
    expect(by('D-pad up')).toMatch(/level up/);
    for (const x of l) expect(x.words, x.button).not.toBe('');
    expect(controllerLabels('playstation').find((x) => x.button === 'A')!.name).toBe('✕');
  });
});
