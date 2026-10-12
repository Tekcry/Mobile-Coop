import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { campusText, EditorModel } from '../../src/editor/model';
import { describeEdit } from '../../src/editor/ops';
import { linkedEdit, linkedHint, linkedWords, missingSpans, onLine, splitRoom, WALL_T, wallsForRoom } from '../../src/editor/roomWalls';
import type { Campus, Opening, Room, Wall } from '../../src/editor/types';

const facts = JSON.parse(readFileSync('scripts/kestrel/facts.json', 'utf8')) as { rules: Record<string, { value: number }> };

function base(): Campus {
  return {
    meta: { id: 't', grid: 0.5 },
    levels: [{ id: 'G', name: 'Ground', floor: 0, height: 4.2 }],
    rooms: [],
    walls: [],
    openings: [],
    stairs: [],
    ladders: [],
    voids: [],
  } as Campus;
}

const room = (id: string, rect: [number, number, number, number], name = id): Room => ({ id, level: 'G', name, kind: 'room', rect, ring: 2 });
const wall = (id: string, a: [number, number], b: [number, number], t = 0.3): Wall => ({ id, level: 'G', a, b, t, h: 4.2, kind: 'interior' });
const door = (id: string, w: string, at: number): Opening => ({ id, wall: w, at, w: 1.2, h: 2.1, sill: 0, type: 'door', between: [] });

/** Two rooms side by side sharing x = 4, every edge walled: A [0,0,4,3], B [4,0,8,3]. */
function pair(): Campus {
  const d = base();
  d.rooms.push(room('A', [0, 0, 4, 3], 'Office'), room('B', [4, 0, 8, 3], 'Store'));
  d.walls.push(
    wall('S', [0, 0], [8, 0]), // south, long: both rooms
    wall('N', [0, 3], [8, 3]), // north, long
    wall('W', [0, 0], [0, 3]),
    wall('M', [4, 0], [4, 3]), // the shared wall
    wall('E', [8, 0], [8, 3]),
  );
  d.openings.push(door('D1', 'M', 1.5));
  return d;
}

/** Applies a change list through the model and checks undo gets the exact old text back. */
function applyAndUndo(d: Campus, changes: Parameters<EditorModel['commit']>[1]): Campus {
  const m = new EditorModel(d);
  const t0 = campusText(m.data);
  expect(m.commit(describeEdit(m.data, changes), changes)).toBe(true);
  const after = JSON.parse(JSON.stringify(m.data)) as Campus;
  expect(m.history.length).toBe(1);
  m.undo();
  expect(campusText(m.data)).toBe(t0);
  return after;
}

describe('room makes walls', () => {
  it('a 4 x 3 room on an empty level makes 4 interior walls of the facts thickness', () => {
    const d = base();
    const r = room('R', [0, 0, 4, 3]);
    const { walls, reusedEdges } = wallsForRoom(d, r, 'walls');
    expect(walls.length).toBe(4);
    expect(reusedEdges).toBe(0);
    expect(new Set(walls.map((w) => w.t))).toEqual(new Set([facts.rules.wallInterior!.value]));
    expect(walls.every((w) => w.kind === 'interior' && w.h === 4.2)).toBe(true);
    expect(WALL_T.exterior).toBe(facts.rules.wallExterior!.value);
    expect(wallsForRoom(d, r, 'outside').walls.every((w) => w.kind === 'exterior' && w.t === WALL_T.exterior)).toBe(true);
    expect(wallsForRoom(d, r, 'none').walls.length).toBe(0);
  });

  it('a room drawn against an existing wall makes 3; a half-covered edge gets one wall for the gap; spans under 0.5 are skipped', () => {
    const d = base();
    d.walls.push(wall('X', [4, -1], [4, 5]));
    expect(wallsForRoom(d, room('R', [4, 0, 8, 3]), 'walls').walls.length).toBe(3);
    const h = base();
    h.walls.push(wall('Y', [0, 0], [2, 0]));
    const r = wallsForRoom(h, room('R', [0, 0, 4, 3]), 'walls');
    const south = r.walls.filter((w) => w.a[1] === 0 && w.b[1] === 0);
    expect(south.map((w) => [w.a, w.b])).toEqual([[[2, 0], [4, 0]]]);
    expect(r.reusedEdges).toBe(1);
    const t = base();
    t.walls.push(wall('Z', [0, 0], [3.7, 0]));
    expect(missingSpans(t.walls, 'G', { axis: 'z', v: 0, lo: 0, hi: 4 })).toEqual([]);
  });

  it('a wall counts as on the edge within half its thickness, never across levels', () => {
    const w = wall('Q', [0, 0.1], [4, 0.1]);
    expect(onLine(w, 'G', { axis: 'z', v: 0, lo: 0, hi: 4 })).toBe(true);
    expect(onLine({ ...w, a: [0, 0.2], b: [4, 0.2] }, 'G', { axis: 'z', v: 0, lo: 0, hi: 4 })).toBe(false);
    expect(onLine(w, 'F', { axis: 'z', v: 0, lo: 0, hi: 4 })).toBe(false);
  });
});

describe('walls follow rooms', () => {
  it('stretching the shared edge moves its wall, resizes the neighbour, keeps the door, cuts nothing', () => {
    const d = pair();
    const r = linkedEdit(d, 'A', [0, 0, 5, 3]);
    expect(r.refused).toBeUndefined();
    const after = applyAndUndo(d, r.changes);
    const M = after.walls.find((w) => w.id === 'M')!;
    expect([M.a, M.b]).toEqual([[5, 0], [5, 3]]);
    expect(after.rooms.find((x) => x.id === 'B')!.rect).toEqual([5, 0, 8, 3]);
    expect(after.openings.find((o) => o.id === 'D1')!.at).toBe(1.5);
    expect(r.neighbours).toEqual(['Store']);
    expect(r.changes[0]!.id).toBe('A');
    expect(linkedWords(r)).toMatch(/moved 1 wall.*also resized Store/);
  });

  it('a long wall on the stretched edge is cut into three and only the middle moves; side walls stretch', () => {
    const d = pair();
    // stretch A's north edge to 4: N runs 0-8, A's edge is 0-4 -> two pieces (0-4 moves, 4-8 stays)
    const r = linkedEdit(d, 'A', [0, 0, 4, 4]);
    expect(r.refused).toBeUndefined();
    expect(r.cut).toBe(1);
    const after = applyAndUndo(d, r.changes);
    const N = after.walls.find((w) => w.id === 'N')!;
    expect([N.a, N.b]).toEqual([[0, 4], [4, 4]]);
    const rest = after.walls.find((w) => w.id.startsWith('N-'))!;
    expect([rest.a, rest.b]).toEqual([[4, 3], [8, 3]]);
    // the west wall and the shared wall end on the old edge: both stretch to the new line
    expect(after.walls.find((w) => w.id === 'W')!.b).toEqual([0, 4]);
    expect(after.walls.find((w) => w.id === 'M')!.b).toEqual([4, 4]);
    expect(r.stretched).toBe(2);
  });

  it('a wall running past both ends of the edge becomes three walls; doors go with the piece holding their centre', () => {
    const d = base();
    d.rooms.push(room('C', [2, 0, 6, 3], 'Store'));
    d.walls.push(wall('S', [0, 0], [8, 0]));
    d.openings.push(door('L', 'S', 1), door('Mid', 'S', 4), door('R', 'S', 7));
    const r = linkedEdit(d, 'C', [2, -1, 6, 3]);
    expect(r.refused).toBeUndefined();
    const after = applyAndUndo(d, r.changes);
    const pieces = after.walls.map((w) => [w.id, w.a, w.b]);
    expect(pieces).toContainEqual(['S', [2, -1], [6, -1]]);
    expect(after.walls.length).toBe(3);
    const at = (id: string): [string, number] => { const o = after.openings.find((x) => x.id === id)!; const w = after.walls.find((x) => x.id === o.wall)!; return [`${w.a}`, o.at]; };
    expect(at('L')).toEqual(['0,0', 1]);
    expect(at('Mid')).toEqual(['2,-1', 2]);
    expect(at('R')).toEqual(['6,0', 1]);
  });

  it('a door across a cut point refuses the stretch', () => {
    const d = pair();
    d.openings.push(door('D2', 'N', 4)); // centred on x 4, where N would be cut
    expect(linkedEdit(d, 'A', [0, 0, 4, 4]).refused).toBe('A door is in the way at the corner');
  });

  it('a stretched perpendicular wall keeps a door its distance from the nearer end', () => {
    const d = pair();
    d.walls.push(wall('P', [2, 3], [2, 10]));
    d.openings.push(door('DP', 'P', 6)); // 6 from a (on the edge), 1 from b
    const r = linkedEdit(d, 'A', [0, 0, 4, 4]);
    const after = applyAndUndo(d, r.changes);
    const P = after.walls.find((w) => w.id === 'P')!;
    expect(P.a).toEqual([2, 4]);
    expect(after.openings.find((o) => o.id === 'DP')!.at).toBe(5); // still 1 m from b
  });

  it('a neighbour only partly on the moved piece is left alone', () => {
    const d = pair();
    d.rooms.push(room('C', [4, 3, 10, 6], 'Long room')); // its south edge 4-10 runs past the N piece over A (0-4)
    const r = linkedEdit(d, 'A', [0, 0, 4, 4]);
    expect(r.neighbours).toEqual([]);
  });

  it('moving a room moves its own walls and leaves shared ones', () => {
    const d = base();
    d.rooms.push(room('A', [0, 0, 4, 3]), room('B', [4, 0, 8, 3]));
    d.walls.push(wall('AS', [0, 0], [4, 0]), wall('AN', [0, 3], [4, 3]), wall('AW', [0, 0], [0, 3]), wall('M', [4, 0], [4, 3]));
    const r = linkedEdit(d, 'A', [0, -2, 4, 1]);
    expect(r.moved).toBe(3);
    expect(r.sharedStay).toBe(1);
    const after = applyAndUndo(d, r.changes);
    expect(after.walls.find((w) => w.id === 'AS')!.a).toEqual([0, -2]);
    expect(after.walls.find((w) => w.id === 'M')!.a).toEqual([4, 0]);
    expect(linkedHint(d, 'A', null, 0.5)).toBe(' (1 shared wall stays)');
    expect(linkedHint(pair(), 'A', 'E', 0.5)).toBe(' (also resizes Store)');
  });

  it('with walls not following, only the room changes (and between)', () => {
    const d = pair();
    const r = linkedEdit(d, 'A', [0, 0, 5, 3], false);
    expect(r.changes.filter((c) => c.coll === 'walls').length).toBe(0);
    expect(r.changes[0]!.id).toBe('A');
  });

  it('refreshes between for doors on the touched walls', () => {
    const d = pair();
    const r = linkedEdit(d, 'A', [0, 0, 5, 3]);
    const o = r.changes.find((c) => c.id === 'D1')!.after as Opening;
    expect([...o.between!].sort()).toEqual(['A', 'B']);
  });
});

describe('split', () => {
  it('makes two rooms and one wall; none when a wall is already on the line', () => {
    const d = base();
    d.rooms.push(room('R', [0, 0, 6, 4], 'Office'));
    const s = splitRoom(d, 'R', 'x', 2, 'walls');
    expect(s.refused).toBeUndefined();
    const after = applyAndUndo(d, s.changes);
    expect(after.rooms.map((r) => [r.name, r.rect])).toEqual([['Office', [0, 0, 2, 4]], ['Office 2', [2, 0, 6, 4]]]);
    expect(after.walls.length).toBe(1);
    expect(s.wallLen).toBe(4);
    const w = base();
    w.rooms.push(room('R', [0, 0, 6, 4], 'Office'));
    w.walls.push(wall('X', [2, -1], [2, 5]));
    expect(splitRoom(w, 'R', 'x', 2, 'walls').changes.filter((c) => c.coll === 'walls').length).toBe(0);
  });

  it('refuses within 1 m of an edge', () => {
    const d = base();
    d.rooms.push(room('R', [0, 0, 6, 4]));
    expect(splitRoom(d, 'R', 'z', 0.5, 'walls').refused).toBe('Too close to the edge');
  });
});
