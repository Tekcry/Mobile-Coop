import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { ACTIONS, actionForKey, conflicts, CTXS, hintItems, keyId, keyWords } from '../../src/editor/actions';
import { clearDraft, makeDraft, readDraft, shouldOffer, writeDraft } from '../../src/editor/draft';
import { campusText } from '../../src/editor/model';
import { buildingAt, DEFAULT_VIS, editingForced, elementState, explodeOffset, levelShown, parseVis, presetPicks } from '../../src/editor/visibility';
import type { VisSettings } from '../../src/editor/visibility';
import type { Campus } from '../../src/editor/types';

const LEVELS = [
  { id: 'U', floor: -1.6 },
  { id: 'G', floor: 0 },
  { id: 'F', floor: 4.2 },
  { id: 'R', floor: 8.4 },
];
const BUILDINGS = [
  { id: 'A', footprint: [4, 30, 40, 60] as [number, number, number, number] },
  { id: 'B', footprint: [52, 30, 100, 60] as [number, number, number, number] },
];
const vis = (o: Partial<VisSettings>): VisSettings => ({ ...DEFAULT_VIS, ...o });

describe('editor visibility', () => {
  it('whole building shows every level', () => {
    for (const l of LEVELS) expect(levelShown(vis({ preset: 'whole' }), LEVELS, 'G', l.id)).toBe(true);
  });

  it('single level shows only the editing level', () => {
    expect(LEVELS.filter((l) => levelShown(vis({ preset: 'single' }), LEVELS, 'F', l.id)).map((l) => l.id)).toEqual(['F']);
  });

  it('up to this level shows the editing level and below', () => {
    expect(LEVELS.filter((l) => levelShown(vis({ preset: 'upTo' }), LEVELS, 'G', l.id)).map((l) => l.id)).toEqual(['U', 'G']);
  });

  it('pick shows the ticked levels, and a preset sets the ticks', () => {
    const s = vis({ preset: 'pick', picked: ['U', 'G'] });
    expect(LEVELS.filter((l) => levelShown(s, LEVELS, 'G', l.id)).map((l) => l.id)).toEqual(['U', 'G']);
    expect(presetPicks('upTo', LEVELS, 'F')).toEqual(['U', 'G', 'F']);
    expect(presetPicks('single', LEVELS, 'R')).toEqual(['R']);
  });

  it('the editing level is always shown, and the hint knows it was forced', () => {
    const s = vis({ preset: 'pick', picked: ['U'] });
    expect(levelShown(s, LEVELS, 'F', 'F')).toBe(true);
    expect(editingForced(s, LEVELS, 'F')).toBe(true);
    expect(editingForced(vis({ preset: 'whole' }), LEVELS, 'F')).toBe(false);
  });

  it('ghosts instead of hiding when ghost is on; a stair is shown if either end is', () => {
    expect(elementState(vis({ preset: 'single' }), LEVELS, 'G', ['F'], 'A')).toBe('hidden');
    expect(elementState(vis({ preset: 'single', ghost: true }), LEVELS, 'G', ['F'], 'A')).toBe('ghost');
    expect(elementState(vis({ preset: 'single' }), LEVELS, 'G', ['G', 'F'], 'A')).toBe('shown');
  });

  it('the building filter hides (never ghosts) other buildings and the site', () => {
    const s = vis({ preset: 'whole', ghost: true, building: 'B' });
    expect(elementState(s, LEVELS, 'G', ['G'], 'A')).toBe('hidden');
    expect(elementState(s, LEVELS, 'G', ['G'], 'site')).toBe('hidden');
    expect(elementState(s, LEVELS, 'G', ['G'], 'B')).toBe('shown');
    expect(buildingAt(BUILDINGS, 20, 40)).toBe('A');
    expect(buildingAt(BUILDINGS, 46, 40)).toBe('site');
    expect(buildingAt(BUILDINGS, 100, 60)).toBe('B');
  });

  it('exploded offsets by rank times the gap, zero when off', () => {
    expect(explodeOffset(vis({ exploded: true, gap: 6 }), LEVELS, 'U')).toBe(0);
    expect(explodeOffset(vis({ exploded: true, gap: 6 }), LEVELS, 'F')).toBe(12);
    expect(explodeOffset(vis({ exploded: true, gap: 40 }), LEVELS, 'G')).toBe(12);
    expect(explodeOffset(vis({ exploded: false, gap: 6 }), LEVELS, 'F')).toBe(0);
  });

  it('parses stored settings and drops bad values', () => {
    expect(parseVis({ preset: 'nope', gap: 99, section: -1, ghost: 'yes', picked: ['G', 3] })).toEqual({ ...DEFAULT_VIS, gap: 12, section: 0, picked: ['G'] });
    expect(parseVis(null)).toEqual(DEFAULT_VIS);
  });
});

describe('editor action map', () => {
  it('no binding is used twice in the same context', () => {
    expect(conflicts()).toEqual([]);
  });

  it('every action has an id, a name and a binding, ids are unique', () => {
    expect(new Set(ACTIONS.map((a) => a.id)).size).toBe(ACTIONS.length);
    for (const a of ACTIONS) expect(a.name && (a.keys.length || a.mouse || a.pad?.length)).toBeTruthy();
  });

  it('finds actions by key and context', () => {
    expect(keyId({ code: 'KeyZ', ctrlKey: true, shiftKey: true })).toBe('Ctrl+Shift+KeyZ');
    expect(actionForKey('Ctrl+Shift+KeyZ', 'idle')?.id).toBe('redo');
    expect(actionForKey('Shift+KeyG', 'idle')?.id).toBe('ghost');
    expect(actionForKey('KeyG', 'idle')?.id).toBe('whole');
    expect(actionForKey('Delete', 'idle')).toBeUndefined();
    expect(actionForKey('Ctrl+KeyZ', 'drag')).toBeUndefined();
    expect(actionForKey('KeyW', 'idle')).toBeUndefined(); // camera keys are passive
    expect(keyWords('Ctrl+KeyZ')).toBe('Ctrl+Z');
    expect(keyWords('Backquote')).toBe('`');
  });

  it('every context has hint bar items', () => {
    for (const c of CTXS) expect(hintItems(c).length).toBeGreaterThan(0);
  });
});

describe('editor drafts', () => {
  const campus = (): Campus => ({ meta: { id: 't' }, levels: [], rooms: [], walls: [], openings: [], stairs: [], ladders: [], voids: [] });

  it('offers only a newer draft that differs from the file', () => {
    const file = campusText(campus());
    const changed = campus();
    changed.meta.id = 'u';
    expect(shouldOffer(makeDraft(changed, [], 2000), file, 1000)).toBe(true);
    expect(shouldOffer(makeDraft(changed, [], 500), file, 1000)).toBe(false);
    expect(shouldOffer(makeDraft(campus(), [], 2000), file, 1000)).toBe(false);
    expect(shouldOffer(null, file, 1000)).toBe(false);
  });

  it('a draft is a deep copy and round-trips through IndexedDB', async () => {
    const c = campus();
    const d = makeDraft(c, [{ time: '2026-10-12T00:00:00.000Z', action: 'edit', text: 'Moved a wall', changes: [] }], 5);
    c.meta.id = 'changed after';
    expect(d.campus.meta.id).toBe('t');
    await writeDraft(d);
    expect(await readDraft()).toEqual(d);
    await clearDraft();
    expect(await readDraft()).toBeNull();
  });
});
