import { describe, expect, it } from 'vitest';
import { collide, moveWords, nearestWall, pieceObb, projectOnWall, roomsEitherSide, setEdge, snap, wallPieces } from '../../src/editor/geometry';
import type { Opening, Room, Wall } from '../../src/editor/types';

const wall: Wall = { id: 'W1', level: 'G', a: [0, 0], b: [10, 0], t: 0.3, h: 4.2, kind: 'interior' };
const door: Opening = { id: 'D1', wall: 'W1', at: 3, w: 1.2, h: 2.1, sill: 0, type: 'door' };
const win: Opening = { id: 'N1', wall: 'W1', at: 7, w: 1.2, h: 1.2, sill: 0.9, type: 'window' };

describe('editor geometry', () => {
  it('snaps to the grid without float noise', () => {
    expect(snap(0.1 + 0.2, 0.1)).toBe(0.3);
    expect(snap(12.26, 0.5)).toBe(12.5);
    expect(snap(-0.74, 0.5)).toBe(-0.5);
  });

  it('cuts a door (lintel only) and a window (sill and lintel) out of a wall', () => {
    const p = wallPieces(wall, [win, door]);
    expect(p).toEqual([
      { s0: 0, s1: 2.4, y0: 0, y1: 4.2 },
      { s0: 2.4, s1: 3.6, y0: 2.1, y1: 4.2 },
      { s0: 3.6, s1: 6.4, y0: 0, y1: 4.2 },
      { s0: 6.4, s1: 7.6, y0: 0, y1: 0.9 },
      { s0: 6.4, s1: 7.6, y0: 2.1, y1: 4.2 },
      { s0: 7.6, s1: 10, y0: 0, y1: 4.2 },
    ]);
  });

  it('a wall with no openings is one piece; openings on other walls are ignored', () => {
    expect(wallPieces(wall, [{ ...door, wall: 'W2' }])).toEqual([{ s0: 0, s1: 10, y0: 0, y1: 4.2 }]);
  });

  it('projects a point onto a wall, clamped to its ends', () => {
    expect(projectOnWall(wall, 4, 2)).toEqual({ s: 4, dist: 2 });
    expect(projectOnWall(wall, -3, 0).s).toBe(0);
    expect(nearestWall([wall, { ...wall, id: 'W2', level: 'F' }], 'G', 5, 0.5, 1)?.id).toBe('W1');
    expect(nearestWall([wall], 'G', 5, 3, 1)).toBeNull();
  });

  it('finds the rooms either side of a wall (left of a -> b first), smallest room first', () => {
    const north: Room = { id: 'N', level: 'G', kind: 'zone', rect: [0, 0, 10, 5] };
    const south: Room = { id: 'S', level: 'G', kind: 'zone', rect: [0, -5, 10, 0] };
    const yard: Room = { id: 'Y', level: 'G', kind: 'yard', rect: [-50, -50, 50, 50] };
    expect(roomsEitherSide(wall, 3, [yard, north, south])).toEqual(['N', 'S']);
    expect(roomsEitherSide(wall, 3, [north])).toEqual(['N', '']);
  });

  it('moves one rect edge and keeps a minimum size', () => {
    expect(setEdge([0, 0, 4, 4], 'E', 6, 0.5)).toEqual([0, 0, 6, 4]);
    expect(setEdge([0, 0, 4, 4], 'W', 5, 0.5)).toEqual([3.5, 0, 4, 4]);
    expect(setEdge([0, 0, 4, 4], 'N', -2, 0.5)).toEqual([0, 0, 4, 0.5]);
  });

  it('walk collision pushes the walker out of a wall and lets them through a door gap', () => {
    const boxes = wallPieces(wall, [door])
      .filter((p) => p.y0 < 1.75)
      .map((p) => pieceObb(wall, p));
    const [, z] = collide(5, 0.2, 0.3, boxes);
    expect(z).toBeCloseTo(0.45, 5); // half thickness 0.15 + radius 0.3
    expect(collide(3, 0, 0.3, boxes)).toEqual([3, 0]); // centre of the 1.2 m door: 0.6 clear each side
  });

  it('says a move in compass words', () => {
    expect(moveWords(2, -0.5)).toBe('2 m east, 0.5 m south');
    expect(moveWords(0, 0)).toBe('nowhere');
  });
});
