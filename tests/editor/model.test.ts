import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { campusText, EditorModel, logMarkdown } from '../../src/editor/model';
import { deleteChanges, describeChange, describeEdit, newOpening, newWall } from '../../src/editor/ops';
import type { Campus, Opening, Room, Wall } from '../../src/editor/types';

const CAMPUS = 'docs/kestrel/kestrel.campus.blocks.json';
const load = (): Campus => JSON.parse(readFileSync(CAMPUS, 'utf8')) as Campus;

function tiny(): Campus {
  return {
    meta: { id: 't', grid: 0.5 },
    levels: [{ id: 'G', name: 'Ground', floor: 0, height: 4.2 }],
    rooms: [
      { id: 'R1', level: 'G', name: 'Office', kind: 'zone', rect: [0, 0, 10, 5], ring: 2 },
      { id: 'R2', level: 'G', name: 'Corridor', kind: 'corridor', rect: [0, -3, 10, 0], ring: 2 },
    ],
    walls: [
      { id: 'W1', level: 'G', a: [0, 0], b: [10, 0], t: 0.3, h: 4.2, kind: 'interior' },
      { id: 'W2', level: 'G', a: [10, -3], b: [10, 5], t: 0.45, h: 4.2, kind: 'exterior' },
    ],
    openings: [
      { id: 'O1', wall: 'W1', at: 2, w: 1.2, h: 2.1, sill: 0, type: 'door' },
      { id: 'O2', wall: 'W2', at: 4, w: 1.2, h: 2.1, sill: 0, type: 'door' },
      { id: 'O3', wall: 'W1', at: 8, w: 1.2, h: 1.2, sill: 0.9, type: 'window' },
    ],
    stairs: [],
    ladders: [],
    voids: [],
  };
}

describe('editor model', () => {
  it('writes the campus file back byte for byte (no diff from opening and saving)', () => {
    expect(campusText(load())).toBe(readFileSync(CAMPUS, 'utf8'));
  });

  it('commits, undoes and redoes a move, and journals all three', () => {
    const m = new EditorModel(tiny());
    m.now = () => new Date('2026-10-12T00:00:00Z');
    const before = m.snapshot<Room>('rooms', 'R1')!;
    const after: Room = { ...before, rect: [2, 0, 12, 5] };
    expect(m.commit('moved', [{ coll: 'rooms', id: 'R1', before, after }])).toBe(true);
    expect(m.get<Room>('rooms', 'R1')!.rect).toEqual([2, 0, 12, 5]);
    m.undo();
    expect(m.get<Room>('rooms', 'R1')!.rect).toEqual([0, 0, 10, 5]);
    m.redo();
    expect(m.get<Room>('rooms', 'R1')!.rect).toEqual([2, 0, 12, 5]);
    expect(m.journal.map((j) => j.action)).toEqual(['edit', 'undo', 'redo']);
    m.markSaved();
    expect(m.dirty).toBe(0);
    expect(m.canUndo).toBe(true);
  });

  it('ignores an edit that changes nothing and puts a previewed element back', () => {
    const m = new EditorModel(tiny());
    const before = m.snapshot<Room>('rooms', 'R1')!;
    m.preview('rooms', { ...before, rect: [5, 5, 6, 6] });
    expect(m.commit('noop', [{ coll: 'rooms', id: 'R1', before, after: before }])).toBe(false);
    expect(m.get<Room>('rooms', 'R1')!.rect).toEqual([0, 0, 10, 5]);
    expect(m.dirty).toBe(0);
  });

  it('deleting a wall takes its openings, and undo restores the exact order', () => {
    const d = tiny();
    const m = new EditorModel(d);
    const original = campusText(d);
    const ch = deleteChanges(m, 'walls', 'W1');
    expect(ch.map((c) => c.id)).toEqual(['W1', 'O1', 'O3']);
    m.commit(describeEdit(d, ch), ch);
    expect(d.openings.map((o) => o.id)).toEqual(['O2']);
    m.undo();
    expect(campusText(d)).toBe(original);
  });

  it('a new wall and a new opening get fresh ids and the rooms either side', () => {
    const m = new EditorModel(tiny());
    const w = newWall(m, 'G', [0, 5], [10, 5]);
    expect(w).toMatchObject({ id: 'WG-NEW1', t: 0.3, h: 4.2, kind: 'interior' });
    const o = newOpening(m, m.get<Wall>('walls', 'W1')!, 5, 'door');
    expect(o).toMatchObject({ id: 'O-NEW1', at: 5, w: 1.2, h: 2.1, sill: 0, between: ['R1', 'R2'] });
    const near = newOpening(m, m.get<Wall>('walls', 'W1')!, 0.1, 'window');
    expect(near.at).toBe(0.6); // kept inside the wall
    expect(near.sill).toBe(0.9);
  });
});

describe('change descriptions', () => {
  const d = tiny();
  const r = d.rooms[0]!;
  const w = d.walls[0]!;
  const o = d.openings[0] as Opening;

  it('describes moves and resizes in plain words', () => {
    expect(describeChange(d, { coll: 'rooms', id: 'R1', before: r, after: { ...r, rect: [1, 0, 11, 5] } })).toBe('Moved 1 m east: Office (R1, Ground)');
    expect(describeChange(d, { coll: 'rooms', id: 'R1', before: r, after: { ...r, rect: [0, 0, 12, 5] } })).toBe('Resized (east edge 10 to 12; now 12 x 5 m): Office (R1, Ground)');
    expect(describeChange(d, { coll: 'walls', id: 'W1', before: w, after: { ...w, b: [12, 0] } })).toBe('Moved its end 2 m east; now 12 m long: interior wall (W1, Ground)');
    expect(describeChange(d, { coll: 'openings', id: 'O1', before: o, after: { ...o, at: 3.5 } })).toBe('Moved 1.5 m along its wall: door (O1, Ground)');
    expect(describeChange(d, { coll: 'rooms', id: 'R1', before: r, after: { ...r, name: 'Server Room' } })).toBe('Name "Office" to "Server Room": Server Room (R1, Ground)');
  });

  it('describes adds, deletes and a wall delete with its openings', () => {
    expect(describeChange(d, { coll: 'rooms', id: 'R1', before: null, after: r })).toBe('Added Office (R1, Ground)');
    const m = new EditorModel(tiny());
    expect(describeEdit(m.data, deleteChanges(m, 'walls', 'W1'))).toBe('Deleted interior wall (W1, Ground) (and 2 openings in it)');
  });

  it('writes the save log block', () => {
    const t = new Date(2026, 9, 12, 9, 5, 7).toISOString();
    expect(logMarkdown([{ time: t, action: 'undo', text: 'Added Office (R1, Ground)', changes: [] }], '2026-10-12 09:06')).toBe('## Saved 2026-10-12 09:06\n\n- 09:05:07 Undid: Added Office (R1, Ground)\n\n');
  });
});

describe('net unsaved count (ED2 Part B)', () => {
  const move = (m: EditorModel, id: string, dx: number): void => {
    const before = m.snapshot<Room>('rooms', id)!;
    const r = before.rect;
    m.commit(`moved ${id}`, [{ coll: 'rooms', id, before, after: { ...before, rect: [r[0] + dx, r[1], r[2] + dx, r[3]] } }]);
  };

  it('edit, undo = 0; edit, edit, undo = 1 (also read by a listener during each change)', () => {
    const m = new EditorModel(tiny());
    m.onChange(() => void m.dirty);
    move(m, 'R1', 1);
    expect(m.dirty).toBe(1);
    m.undo();
    expect(m.dirty).toBe(0);
    expect(m.journal.length).toBe(2);
    move(m, 'R1', 1);
    move(m, 'R2', 1);
    expect(m.dirty).toBe(2);
    m.undo();
    expect(m.dirty).toBe(1);
  });

  it('save, undo = 1; undo past the save then a new edit = 2', () => {
    const m = new EditorModel(tiny());
    move(m, 'R1', 1);
    m.markSaved();
    expect(m.dirty).toBe(0);
    m.undo();
    expect(m.dirty).toBe(1);
    move(m, 'R2', 1);
    expect(m.dirty).toBe(2);
  });

  it('0 when the text is back as saved; a restored draft that differs counts at least 1', () => {
    const m = new EditorModel(tiny());
    move(m, 'R1', 1);
    move(m, 'R1', -1);
    expect(m.dirty).toBe(0);
    const draft = tiny();
    draft.rooms[0]!.name = 'Changed';
    m.replace(draft, [], true);
    expect(m.dirty).toBeGreaterThanOrEqual(1);
    m.replace(tiny(), []);
    expect(m.dirty).toBe(0);
  });
});
