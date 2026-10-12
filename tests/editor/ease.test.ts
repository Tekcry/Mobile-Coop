import { describe, expect, it } from 'vitest';
import { BOOKMARK_SLOTS, filterFind, findItems, freeSlot, idIndex, netChanges, problemTarget, problemWords, putBookmark, readBookmarks, summaryWords } from '../../src/editor/ease';
import type { Bookmark } from '../../src/editor/ease';
import { boxOf, boxPick, copyItems, groupCentre, groupMoveWords, groupWords, levelAbove, moveSetChanges, pasteChanges } from '../../src/editor/group';
import { EditorModel } from '../../src/editor/model';
import type { Campus, Elem, Key, Room, Wall } from '../../src/editor/types';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function tiny(): Campus {
  return {
    meta: { id: 't', grid: 0.5, buildings: [{ id: 'A', footprint: [0, -5, 20, 10] }] },
    levels: [
      { id: 'G', name: 'Ground', floor: 0, height: 4.2 },
      { id: 'F', name: 'First', floor: 4.2, height: 4.2 },
    ],
    rooms: [
      { id: 'R1', level: 'G', name: 'Admin Office', kind: 'zone', rect: [0, 0, 10, 5], ring: 2 },
      { id: 'R2', level: 'G', name: 'Corridor', kind: 'corridor', rect: [0, -3, 10, 0], ring: 2 },
      { id: 'R3', level: 'F', name: 'Server Room', kind: 'zone', rect: [0, 0, 10, 5], ring: 4 },
    ],
    walls: [
      { id: 'W1', level: 'G', a: [0, 0], b: [10, 0], t: 0.3, h: 4.2, kind: 'interior' },
      { id: 'W2', level: 'G', a: [10, -3], b: [10, 5], t: 0.45, h: 4.2, kind: 'exterior' },
      { id: 'W3', level: 'G', a: [15, 0], b: [18, 0], t: 0.3, h: 4.2, kind: 'interior' },
    ],
    openings: [
      { id: 'O1', wall: 'W1', at: 2, w: 1.2, h: 2.1, sill: 0, type: 'door' },
      { id: 'O3', wall: 'W1', at: 8, w: 1.2, h: 1.2, sill: 0.9, type: 'window' },
    ],
    stairs: [{ id: 'V-S1', name: 'Main Stair', kind: 'main', from: 'G', to: 'F', rect: [12, 0, 14, 4], up: 'N' }],
    ladders: [],
    voids: [],
    objects: [{ id: 'OB1', level: 'G', name: 'Server rack', rect: [1, 1, 2, 2], h: 2, y: 0 }, { id: 'OB2', level: 'G', name: '', rect: [3, 3, 4, 4], h: 1, y: 0 }],
  };
}

describe('problem lines name an element (ON3 decision 1)', () => {
  const idx = idIndex(tiny());
  it('takes the first id in the line, whole words only', () => {
    expect(problemTarget('O1 on W1 (2, 0): 0.5 m from a wall end, need 1.5', idx)).toEqual({ coll: 'openings', id: 'O1' });
    expect(problemTarget('FAIL A12: V-S1 at (12, 2) is in R1 (kind zone)', idx)).toEqual({ coll: 'stairs', id: 'V-S1' });
    expect(problemTarget('Gap 0.04 m: W3 end a to W1', idx)).toEqual({ coll: 'walls', id: 'W3' });
    expect(problemTarget('standards: R2-X is too narrow', idx)).toBeNull();
  });
  it('a line naming nothing has no place to go', () => {
    expect(problemTarget('opening count 3, expected 4', idx)).toBeNull();
    expect(problemTarget('', idx)).toBeNull();
  });
});

describe('save summary (ON3 decision 3)', () => {
  it('groups the net changes in plain words, doors and windows apart', () => {
    const a = tiny();
    const b = clone(a);
    b.rooms.push({ id: 'R9', level: 'G', name: 'New', kind: 'zone', rect: [0, 6, 2, 8] }, { id: 'R10', level: 'G', name: 'New', kind: 'zone', rect: [3, 6, 5, 8] });
    b.walls[0]!.a = [0, 1];
    b.walls[0]!.b = [10, 1];
    b.walls[1]!.b = [10, 6];
    b.openings[0]!.type = 'fire-door';
    b.openings = b.openings.filter((o) => o.id !== 'O3');
    b.rooms[1]!.name = 'Main Corridor';
    const g = netChanges(a, b);
    expect(summaryWords(g)).toBe('2 rooms added, 1 room name changed, 1 wall moved, 1 wall resized, 1 door type changed, 1 window removed');
  });
  it('a renamed id is one rename, not an add and a remove; nothing changed says so', () => {
    const a = tiny();
    const b = clone(a);
    b.rooms[0]!.id = 'R1-NEW';
    expect(summaryWords(netChanges(a, b))).toBe('1 room renamed');
    expect(summaryWords(netChanges(a, clone(a)))).toBe('no changes to the building');
  });
  it('levels, building outlines and the problem count have words', () => {
    const a = tiny();
    const b = clone(a);
    b.levels.push({ id: 'R', name: 'Roof', floor: 8.4, height: 3 });
    b.meta.buildings![0]!.footprint = [0, -5, 22, 10];
    expect(summaryWords(netChanges(a, b))).toBe('1 level added, 1 building outline resized');
    expect(problemWords(0)).toBe('No new check problems');
    expect(problemWords(1)).toMatch(/^1 new check problem /);
    expect(problemWords(3)).toMatch(/^3 new check problems/);
  });
});

describe('Find (ON3 decision 4)', () => {
  const items = findItems(tiny());
  it('lists rooms, stairs and named objects with their level', () => {
    expect(items.map((i) => i.id)).toEqual(['R1', 'R2', 'V-S1', 'OB1', 'R3']);
    expect(items.find((i) => i.id === 'R3')).toMatchObject({ levelName: 'First', at: [5, 2.5] });
  });
  it('filters by every word, any case, name starts first', () => {
    expect(filterFind(items, 'room').map((i) => i.id)).toEqual(['R3']);
    expect(filterFind(items, 'SER').map((i) => i.id)).toEqual(['OB1', 'R3']);
    expect(filterFind(items, 'admin off').map((i) => i.id)).toEqual(['R1']);
    expect(filterFind(items, 'r2').map((i) => i.id)).toEqual(['R2']);
    expect(filterFind(items, 'zzz')).toEqual([]);
    expect(filterFind(items, '', 2)).toHaveLength(2);
  });
});

describe('bookmarks (ON3 decision 7)', () => {
  const bm = (slot: number, at = slot): Bookmark => ({ slot, name: `View ${slot}`, level: 'G', pose: { pos: [1, 2, 3], yaw: 0.5, pitch: 0.7, fov: 1 }, at });
  it('stores one per slot and reads back only valid ones', () => {
    let list = putBookmark([], bm(3));
    list = putBookmark(list, bm(1));
    list = putBookmark(list, { ...bm(3), name: 'Gatehouse view' });
    expect(list.map((b) => `${b.slot} ${b.name}`)).toEqual(['1 View 1', '3 Gatehouse view']);
    const back = readBookmarks(JSON.parse(JSON.stringify(list)));
    expect(back).toEqual(list);
    expect(readBookmarks([{ slot: 10, name: 'x', level: 'G', pose: bm(1).pose }, { slot: 2, name: 'y', level: 'G', pose: { pos: [1, 2] } }, null, 'junk'])).toEqual([]);
    expect(readBookmarks('nope')).toEqual([]);
  });
  it('a new bookmark takes the first free slot, else the oldest', () => {
    expect(freeSlot([bm(1), bm(2), bm(4)])).toBe(3);
    const full = Array.from({ length: BOOKMARK_SLOTS }, (_, i) => bm(i + 1, 100 - i));
    expect(freeSlot(full)).toBe(9);
  });
});

describe('multi-select (ON3 decision 8)', () => {
  it('a box takes whole elements on its level only', () => {
    const d = tiny();
    expect(boxPick(d, 'G', boxOf([10.2, 5.2], [-0.2, -3.2]))).toEqual(['rooms:R1', 'rooms:R2', 'walls:W1', 'walls:W2']);
    expect(boxPick(d, 'G', [11, -1, 19, 5])).toEqual(['walls:W3', 'stairs:V-S1']);
    expect(boxPick(d, 'F', [-1, -1, 11, 6])).toEqual(['rooms:R3']);
  });
  it('moves the set as one edit and undo puts it all back', () => {
    const d = tiny();
    const m = new EditorModel(d);
    const keys: Key[] = ['rooms:R1', 'rooms:R2', 'walls:W1'];
    const before = new Map(keys.map((k) => { const [c, id] = k.split(':') as ['rooms' | 'walls', string]; return [k, m.snapshot(c, id)!] as [Key, Elem]; }));
    m.commit(groupMoveWords(keys, 2, 0), moveSetChanges(before, 2, 0));
    expect(m.history).toHaveLength(1);
    expect(m.get<Room>('rooms', 'R1')!.rect).toEqual([2, 0, 12, 5]);
    expect(m.get<Room>('rooms', 'R2')!.rect).toEqual([2, -3, 12, 0]);
    expect(m.get<Wall>('walls', 'W1')!.a).toEqual([2, 0]);
    expect(m.history[0]!.text).toBe('Moved 2 rooms and 1 wall 2 m east');
    m.undo();
    expect(m.get<Room>('rooms', 'R1')!.rect).toEqual([0, 0, 10, 5]);
    expect(m.get<Wall>('walls', 'W1')!.b).toEqual([10, 0]);
  });
  it('words and centre', () => {
    expect(groupWords(['rooms:R1', 'walls:W1', 'walls:W2', 'stairs:V-S1'])).toBe('1 room, 2 walls and 1 stair');
    expect(groupCentre(tiny(), ['rooms:R1', 'walls:W3'])).toEqual([9, 2.5]);
  });
  it('copy to the level above brings the walls\' doors and windows, fresh ids, one edit', () => {
    const d = tiny();
    const items = copyItems(d, ['rooms:R1', 'walls:W1', 'stairs:V-S1']);
    expect(items.map((i) => `${i.coll}:${i.e.id}`)).toEqual(['rooms:R1', 'walls:W1', 'openings:O1', 'openings:O3']);
    const res = pasteChanges(d, items, (l) => levelAbove(d, l), 0, 0)!;
    expect(res.keys).toEqual(['rooms:F-NEW1', 'walls:WF-NEW1']);
    const ops = res.changes.filter((c) => c.coll === 'openings').map((c) => c.after as unknown as { id: string; wall: string });
    expect(ops).toEqual([expect.objectContaining({ id: 'O-NEW1', wall: 'WF-NEW1' }), expect.objectContaining({ id: 'O-NEW2', wall: 'WF-NEW1' })]);
    expect((res.changes[0]!.after as Room).level).toBe('F');
    expect(pasteChanges(d, items, () => null, 0, 0)).toBeNull();
    const moved = pasteChanges(d, items, () => 'G', 1, -1)!;
    expect((moved.changes[0]!.after as Room).rect).toEqual([1, -1, 11, 4]);
    expect(levelAbove(d, 'F')).toBeNull();
  });
});
