import { describe, expect, it } from 'vitest';
import { cardRows, KEYBOARD, nameList, RING_NAMES, stepCard, typeKey } from '../../src/editor/card';
import { EditorModel } from '../../src/editor/model';
import type { Campus, Opening, Room, Wall } from '../../src/editor/types';

const door: Opening = { id: 'O1', wall: 'W1', at: 3, w: 1.2, h: 2.1, sill: 0, type: 'door' };
const wall: Wall = { id: 'W1', level: 'G', a: [0, 0], b: [6, 0], t: 0.3, h: 4, kind: 'interior' };
const room: Room = { id: 'R1', level: 'G', name: 'Office', kind: 'room', rect: [0, 0, 4, 3], ring: 2 };
const c = { step: 0.1, wallLen: 6 };

describe('selection card rows (ON0a decision 4)', () => {
  it('Type first, then the element own fields', () => {
    expect(cardRows('openings', door).map((r) => r.label)).toEqual(['Type', 'Name', 'Width', 'Height', 'Sill', 'Along wall', 'Locked', 'Id']);
    expect(cardRows('walls', wall).map((r) => r.label)).toEqual(['Type', 'Name', 'Thickness', 'Height', 'Length', 'Id']);
    expect(cardRows('rooms', room).map((r) => `${r.label} ${r.value}`)).toEqual(['Type Room', 'Name Office', 'Width 4 m', 'Depth 3 m', `Access ${RING_NAMES[2]}`, `Id ${room.id}`]);
    expect(cardRows('stairs', { id: 'S', kind: 'stair', from: 'G', to: 'F', rect: [0, 0, 2, 5], up: 'N' }).map((r) => r.label)).toEqual(['Type', 'Name', 'Width', 'Depth', 'Climbs', 'To level', 'Id']);
    expect(cardRows('ladders', { id: 'L', at: [1, 1], from: 'G', to: 'F' }).map((r) => r.label)).toEqual(['Name', 'Facing', 'To level', 'Id']);
  });

  it('step sizes: lengths by 0.1 m, lists by one entry (wrapping), flags on / off', () => {
    expect((stepCard('openings', door, 'type', 1, c) as Opening).type).toBe('fire-door');
    expect((stepCard('openings', door, 'type', -1, c) as Opening).type).toBe('window');
    let o = door;
    for (let i = 0; i < 3; i++) o = stepCard('openings', o, 'w', 1, c) as Opening;
    expect(o.w).toBe(1.5);
    expect((stepCard('openings', door, 'locked', 1, c) as Opening).locked).toBe(true);
    expect((stepCard('walls', wall, 'type', 1, c) as Wall).kind).toBe('exterior');
    expect((stepCard('walls', wall, 'len', -1, c) as Wall).b).toEqual([5.9, 0]);
    expect((stepCard('walls', wall, 't', 1, c) as Wall).t).toBe(0.4);
    expect((stepCard('rooms', room, 'width', 1, c) as Room).rect).toEqual([0, 0, 4.1, 3]);
    expect((stepCard('rooms', room, 'ring', 1, c) as Room).ring).toBe(3);
    expect((stepCard('rooms', room, 'type', 1, c) as Room).kind).toBe('corridor');
  });

  it('limits: nothing below one step, an opening stays on its wall, a name row does not step', () => {
    expect(stepCard('openings', { ...door, h: 0.1 }, 'h', -1, c)).toBeNull();
    expect(stepCard('openings', { ...door, at: 0.6 }, 'w', 1, c)).toBeNull();
    expect(stepCard('openings', { ...door, at: 5.4 }, 'at', 1, c)).toBeNull();
    expect(stepCard('rooms', room, 'name', 1, c)).toBeNull();
  });

  it('the name list and the on-screen keyboard', () => {
    expect(nameList([room, { ...room, id: 'R2' }, { ...room, id: 'R3', name: 'Archive' }, { ...room, id: 'R4', name: '' }])).toEqual(['Archive', 'Office']);
    let t = '';
    for (const k of ['D', 'A', 'T', 'A', 'Space', 'H', 'A', 'L', 'L', 'Delete']) t = typeKey(t, k);
    expect(t).toBe('Data Hal');
    expect(typeKey(t, 'Clear')).toBe('');
    expect(KEYBOARD).toContain('Done');
  });
});

describe('quick card steps merge into one undo step', () => {
  const campus = (): Campus => ({ meta: { id: 't', grid: 0.5 }, levels: [], rooms: [], walls: [JSON.parse(JSON.stringify(wall)) as Wall], openings: [JSON.parse(JSON.stringify(door)) as Opening], stairs: [], ladders: [], voids: [] });
  const step = (m: EditorModel, row: string, at: number, key = `O1|${row}`): boolean => {
    const before = m.snapshot<Opening>('openings', 'O1')!;
    const after = stepCard('openings', before, row, 1, c)!;
    return m.commit(`step ${row}`, [{ coll: 'openings', id: 'O1', before, after }], { key, at, within: 1 });
  };

  it('consecutive changes to one row within 1 s are one step; a pause, another row or an undo starts a new one', () => {
    const m = new EditorModel(campus());
    step(m, 'w', 10);
    step(m, 'w', 10.5);
    step(m, 'w', 11.4);
    expect(m.history.length).toBe(1);
    expect(m.get<Opening>('openings', 'O1')!.w).toBe(1.5);
    expect(m.journal.length).toBe(1);
    m.undo();
    expect(m.get<Opening>('openings', 'O1')!.w).toBe(1.2);
    m.redo();
    step(m, 'w', 13);
    expect(m.history.length).toBe(2);
    step(m, 'h', 13.2);
    expect(m.history.length).toBe(3);
    m.undo();
    step(m, 'h', 13.3);
    expect(m.history.length).toBe(3);
    expect(m.get<Opening>('openings', 'O1')!.h).toBe(2.2);
  });

  it('a save in between keeps the saved step whole', () => {
    const m = new EditorModel(campus());
    step(m, 'w', 1);
    m.markSaved();
    step(m, 'w', 1.2);
    expect(m.history.length).toBe(2);
    expect(m.dirty).toBe(1);
  });
});
