import { describe, expect, it } from 'vitest';
import { EditorModel } from '../../src/editor/model';
import { alignChanges, arrayChanges, arrayStep, distributeChanges, lineMirror, mirrorChanges, unitsOf } from '../../src/editor/arrange';
import { hangsAtA } from '../../src/world/maps/kestrelDoors';
import type { Campus, Key, Obj, Opening, Room, Stair, Wall } from '../../src/editor/types';
import type { SignRecord } from '../../src/editor/signs';

function base(): Campus {
  return { meta: { id: 't', grid: 0.5 }, levels: [{ id: 'G', name: 'Ground', floor: 0, height: 4.2 }], rooms: [], walls: [], openings: [], stairs: [], ladders: [], voids: [], objects: [], signs: [] } as Campus;
}
const room = (id: string, rect: [number, number, number, number], name = id, kind = 'room'): Room => ({ id, level: 'G', name, kind, rect, ring: 2 });
const wall = (id: string, a: [number, number], b: [number, number]): Wall => ({ id, level: 'G', a, b, t: 0.3, h: 4.2, kind: 'interior' });
const desk = (id: string, rect: [number, number, number, number], yaw?: number): Obj => ({ id, level: 'G', rect, h: 0.75, y: 0, preset: 'desk', ...(yaw ? { yaw } : {}) });

/** An office [0,0,4,3] off a corridor [0,-2,12,0]: its own walls W, N, E and the long corridor wall S with door D (swings into the office). */
function office(): Campus {
  const d = base();
  d.rooms.push(room('O', [0, 0, 4, 3], 'Office'), room('C', [0, -2, 12, 0], 'Corridor', 'corridor'));
  d.walls.push(wall('S', [0, 0], [12, 0]), wall('W', [0, 0], [0, 3]), wall('N', [0, 3], [4, 3]), wall('E', [4, 0], [4, 3]));
  d.openings.push({ id: 'D', wall: 'S', at: 1, w: 1.2, h: 2.1, sill: 0, type: 'door', between: ['O', 'C'], door: { swing: 'O' } } as Opening);
  d.objects!.push(desk('K', [0.2, 2, 1.4, 2.8], 90));
  d.signs!.push({ id: 'SG-1', level: 'G', at: [0.5, 2.985], y: 1.8, facing: 180, wall: 'N', kind: 'direction', text: 'Exit', arrow: 'left', size: [0.9, 0.2] } as SignRecord);
  return d;
}

const run = (d: Campus, r: { changes: import('../../src/editor/model').Change[]; why?: string }): EditorModel => {
  expect(r.why).toBeUndefined();
  const m = new EditorModel(d);
  expect(m.commit('arrange', r.changes)).toBe(true);
  return m;
};
const get = <T>(m: EditorModel, coll: 'rooms' | 'walls' | 'openings' | 'objects' | 'signs' | 'stairs', id: string): T => m.get(coll, id) as T;

describe('ON14 arrange: units', () => {
  it('a room brings its own walls and what stands in it, not the long corridor wall', () => {
    const u = unitsOf(office(), ['rooms:O']);
    expect(u).toHaveLength(1);
    expect([...u[0]!.members.get('walls')!].sort()).toEqual(['E', 'N', 'W']);
    expect([...u[0]!.members.get('objects')!]).toEqual(['K']);
    expect([...u[0]!.members.get('signs')!]).toEqual(['SG-1']);
  });
});

describe('ON14 mirror (decision 1)', () => {
  it('east-west about its own centre: walls swap, the door slides along the corridor wall with its hinge mirrored, one undo', () => {
    const d = office();
    const o0 = d.openings[0]!;
    const w0 = d.walls[0]!;
    expect(hangsAtA(o0, w0, d.rooms)).toBe(true);
    const r = mirrorChanges(d, ['rooms:O'], 'x');
    expect(r.words).toMatch(/Mirrored 1 room, 3 walls, 1 object, 1 sign east-west about its centre|Mirrored 1 room/);
    const m = run(d, r);
    expect(get<Room>(m, 'rooms', 'O').rect).toEqual([0, 0, 4, 3]);
    expect(get<Wall>(m, 'walls', 'W').a[0]).toBe(4);
    expect(get<Wall>(m, 'walls', 'E').a[0]).toBe(0);
    const o = get<Opening>(m, 'openings', 'D');
    expect(o.wall).toBe('S');
    expect(o.at).toBe(3);
    // the hinge was at the west end (x 0.4); mirrored it is at the east end (x 3.6)
    expect(hangsAtA(o, get<Wall>(m, 'walls', 'S'), m.data.rooms)).toBe(false);
    const k = get<Obj>(m, 'objects', 'K');
    expect(k.rect).toEqual([2.6, 2, 3.8, 2.8]);
    expect(k.yaw).toBe(270);
    const s = get<SignRecord>(m, 'signs', 'SG-1');
    expect(s.at[0]).toBe(3.5);
    expect(s.arrow).toBe('right');
    m.undo();
    expect(get<Opening>(m, 'openings', 'D').at).toBe(1);
    expect(get<Wall>(m, 'walls', 'W').a[0]).toBe(0);
  });

  it('about a picked line: the office lands beside it, the corridor wall is reused and the door goes with it', () => {
    const d = office();
    const l = lineMirror([6, -1], [6, 5]);
    expect(l).toEqual({ axis: 'x', about: 6 });
    const m = run(d, mirrorChanges(d, ['rooms:O'], l.axis, l.about));
    expect(get<Room>(m, 'rooms', 'O').rect).toEqual([8, 0, 12, 3]);
    expect(m.data.walls).toHaveLength(4);
    const o = get<Opening>(m, 'openings', 'D');
    expect(o.wall).toBe('S');
    expect(o.at).toBe(11);
    expect([...(o.between ?? [])].sort()).toEqual(['C', 'O']);
  });

  it('a stair keeps its climb mirrored; a lone door flips its hinge in place', () => {
    const d = office();
    d.stairs.push({ id: 'ST', kind: 'main', from: 'G', to: 'G', rect: [1, 0.5, 2, 2.5], up: 'E' } as Stair);
    const m = run(d, mirrorChanges(d, ['stairs:ST'], 'x'));
    expect(get<Stair>(m, 'stairs', 'ST').up).toBe('W');
    const d2 = office();
    const m2 = run(d2, mirrorChanges(d2, ['openings:D'], 'x'));
    const o = get<Opening>(m2, 'openings', 'D');
    expect(o.at).toBe(1);
    expect(hangsAtA(o, get<Wall>(m2, 'walls', 'S'), m2.data.rooms)).toBe(false);
  });
});

describe('ON14 align and evenly space (decisions 2, 3)', () => {
  it('aligns two desks by their left edges, or to the first picked', () => {
    const d = base();
    d.objects!.push(desk('A', [1, 1, 2, 2]), desk('B', [3, 4, 4.5, 5]));
    const m = run(d, alignChanges(d, ['objects:B', 'objects:A'], 'left', false, 0.1));
    expect(get<Obj>(m, 'objects', 'B').rect).toEqual([1, 4, 2.5, 5]);
    const d2 = base();
    d2.objects!.push(desk('A', [1, 1, 2, 2]), desk('B', [3, 4, 4.5, 5]));
    const m2 = run(d2, alignChanges(d2, ['objects:B', 'objects:A'], 'top', true, 0.1));
    expect(get<Obj>(m2, 'objects', 'A').rect).toEqual([1, 4, 2, 5]);
    expect(alignChanges(d2, ['objects:A'], 'left', false, 0.1).why).toMatch(/two or more/);
  });

  it('evenly spaces three rooms between the outer two, walls going along', () => {
    const d = base();
    d.rooms.push(room('A', [0, 0, 2, 2]), room('B', [3, 0, 5, 2]), room('C', [8, 0, 10, 2]));
    d.walls.push(wall('BW', [3, 0], [3, 2]), wall('BE', [5, 0], [5, 2]));
    const m = run(d, distributeChanges(d, ['rooms:A', 'rooms:B', 'rooms:C'], 'x', 0.1));
    expect(get<Room>(m, 'rooms', 'B').rect).toEqual([4, 0, 6, 2]);
    expect(get<Wall>(m, 'walls', 'BW').a[0]).toBe(4);
    expect(get<Room>(m, 'rooms', 'C').rect).toEqual([8, 0, 10, 2]);
    expect(distributeChanges(d, ['rooms:A', 'rooms:B'], 'x', 0.1).why).toMatch(/three or more/);
  });
});

describe('ON14 Array (decision 3)', () => {
  it('copies along a line, reusing a wall a copy lands on', () => {
    const d = base();
    d.rooms.push(room('A', [0, 0, 2, 2], 'Cell'));
    d.walls.push(wall('S', [0, 0], [2, 0]), wall('N', [0, 2], [2, 2]), wall('W', [0, 0], [0, 2]), wall('E', [2, 0], [2, 2]));
    d.openings.push({ id: 'D', wall: 'S', at: 1, w: 0.9, h: 2.1, sill: 0, type: 'door', between: ['A', ''] } as Opening);
    const st = arrayStep(d, ['rooms:A'], [3.04, 1.2], 0.1);
    expect(st).toEqual({ axis: 'x', step: 2 });
    const r = arrayChanges(d, ['rooms:A'], 'x', 2, 2);
    const m = run(d, r);
    expect(m.data.rooms.map((q) => q.rect)).toEqual([[0, 0, 2, 2], [2, 0, 4, 2], [4, 0, 6, 2]]);
    expect(m.data.rooms[1]!.name).toBe('Cell 2');
    // A's 4 walls plus 3 per copy (the west wall of each copy is the one before's east wall)
    expect(m.data.walls).toHaveLength(10);
    expect(m.data.openings).toHaveLength(3);
    expect(r.keys.filter((k: Key) => k.startsWith('rooms:'))).toHaveLength(2);
    expect(arrayChanges(d, ['rooms:A'], 'x', 1, 2).why).toMatch(/overlap/);
  });
});
