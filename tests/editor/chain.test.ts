import { describe, expect, it } from 'vitest';
import { WallChain } from '../../src/editor/chain';
import { campusText, EditorModel } from '../../src/editor/model';
import { newWall } from '../../src/editor/ops';
import type { Campus, Pt, Wall } from '../../src/editor/types';

function base(): Campus {
  return {
    meta: { id: 't', grid: 0.5 },
    levels: [{ id: 'G', name: 'Ground', floor: 0, height: 4.2 }],
    rooms: [],
    walls: [{ id: 'X1', level: 'G', a: [20, 0], b: [20, 5], t: 0.45, h: 4.2, kind: 'exterior' }],
    openings: [],
    stairs: [],
    ladders: [],
    voids: [],
  } as Campus;
}

/** The editor's flow: each segment is previewed while drawn, then added to the chain when A (a click) ends it. */
function draw(m: EditorModel, c: WallChain, pts: Pt[]): boolean[] {
  const closed: boolean[] = [];
  for (let i = 1; i < pts.length; i++) {
    const w = newWall(m, 'G', pts[i - 1]!, pts[i]!, c.walls[0]);
    m.preview('walls', w);
    closed.push(c.add(w));
  }
  return closed;
}

describe('wall chains (ON1 decision 1)', () => {
  it('three segments then the first point: 4 walls, closed, one commit, undo restores exactly', () => {
    const m = new EditorModel(base());
    const text0 = campusText(m.data);
    const c = new WallChain(m);
    const closed = draw(m, c, [[0, 0], [5, 0], [5, 4], [0, 4], [0, 0]]);
    expect(closed).toEqual([false, false, false, true]);
    const res = c.finish()!;
    expect(res.text).toBe('Added 4 walls (a chain, 18 m)');
    expect(m.commit(res.text, res.changes)).toBe(true);
    expect(m.history.length).toBe(1);
    expect(m.data.walls.length).toBe(5);
    expect(c.walls.length).toBe(0);
    m.undo();
    expect(campusText(m.data)).toBe(text0);
    m.redo();
    expect(m.data.walls.length).toBe(5);
  });

  it('segments keep the first wall kind and thickness; new walls are interior by default', () => {
    const m = new EditorModel(base());
    const c = new WallChain(m);
    const first = newWall(m, 'G', [0, 0], [3, 0], m.data.walls[0]);
    m.preview('walls', first);
    c.add(first);
    draw(m, c, [[3, 0], [3, 3]]);
    expect(c.walls.map((w) => [w.kind, w.t])).toEqual([['exterior', 0.45], ['exterior', 0.45]]);
    const plain = newWall(m, 'G', [0, 9], [3, 9]);
    expect(plain.kind).toBe('interior');
    expect(plain.t).toBe(0.3);
  });

  it('X removes the last finished segment from the model; B with one wall keeps the plain words', () => {
    const m = new EditorModel(base());
    const c = new WallChain(m);
    draw(m, c, [[0, 0], [4, 0], [4, 2]]);
    expect(m.data.walls.length).toBe(3);
    const gone = c.removeLast() as Wall;
    expect(gone.b).toEqual([4, 2]);
    expect(m.data.walls.length).toBe(2);
    expect(c.walls.length).toBe(1);
    const res = c.finish()!;
    expect(res.changes.length).toBe(1);
    expect(res.text).toMatch(/^Added /);
    expect(res.text).not.toMatch(/chain/);
  });

  it('an empty chain commits nothing', () => {
    const c = new WallChain(new EditorModel(base()));
    expect(c.removeLast()).toBeNull();
    expect(c.finish()).toBeNull();
  });
});
