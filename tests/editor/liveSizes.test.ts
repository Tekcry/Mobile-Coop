import { describe, expect, it } from 'vitest';
import { guideLines, magnetSearch, SNAP } from '../../src/editor/grab';
import type { SnapCand } from '../../src/editor/grab';
import { centreOpening, clearRun, edgeSnap, liveOpening, liveRoom, liveWall, openingSides, parallelGap, roomSize } from '../../src/editor/liveSizes';
import type { Room, Wall } from '../../src/editor/types';

const wall = (id: string, a: [number, number], b: [number, number], t = 0.3, level = 'G'): Wall => ({ id, level, a, b, t, h: 4.2, kind: 'interior' });
const room = (id: string, rect: [number, number, number, number]): Room => ({ id, level: 'G', name: id, kind: 'room', rect, ring: 2 });

/** H along x from 0 to 10; a corner wall at x = 0 and two cross walls at x = 2 and x = 8 (all 0.3 m), north of it. */
const H = wall('H', [0, 0], [10, 0]);
const walls: Wall[] = [H, wall('C0', [0, 0], [0, 4]), wall('C1', [2, 0], [2, 4]), wall('C2', [8, 0], [8, 4]), wall('P', [1, 3], [9, 3]), wall('Far', [0, 20], [10, 20]), wall('Q', [12, 1], [15, 1]), wall('V', [11, 0], [11, 3]), wall('Up', [3, 0], [3, 5], 0.3, '1')];

describe('door centring (ON1 decision 3)', () => {
  it('the clear run is between the faces of the nearest cross walls', () => {
    expect(clearRun(H, walls, 5)).toEqual({ lo: 2.15, hi: 7.85 });
    expect(clearRun(H, walls, 1)).toEqual({ lo: 0.15, hi: 1.85 });
    expect(clearRun(H, walls, 9)).toEqual({ lo: 8.15, hi: 10 });
  });

  it('centres between two cross walls within 0.5 m of the middle, not beyond', () => {
    expect(centreOpening(H, walls, 5.4, 0.9)).toEqual({ at: 5, centred: true });
    expect(centreOpening(H, walls, 4.6, 0.9)).toEqual({ at: 5, centred: true });
    expect(centreOpening(H, walls, 4.4, 0.9)).toEqual({ at: 4.4, centred: false });
  });

  it('centres at a wall end between the corner wall and the next cross wall', () => {
    expect(centreOpening(H, walls, 0.7, 0.9)).toEqual({ at: 1, centred: true });
    // the free end: from the last cross wall face to the wall end
    expect(centreOpening(H, walls, 9.2, 0.9)).toEqual({ at: 9.075, centred: true });
  });

  it('LB (off) places it at the dot; a run narrower than the opening does not centre', () => {
    expect(centreOpening(H, walls, 5.4, 0.9, true)).toEqual({ at: 5.4, centred: false });
    expect(centreOpening(H, walls, 1.2, 2, false).centred).toBe(false);
  });
});

describe('door distances (ON1 decision 4)', () => {
  it('the clear distance from each side to the cross wall faces', () => {
    expect(openingSides(H, walls, 5, 0.9)).toEqual([2.4, 2.4]);
    expect(openingSides(H, walls, 3.5, 0.9)).toEqual([0.9, 3.9]);
    expect(openingSides(H, walls, 9.4, 0.9)).toEqual([0.8, 0.15]);
  });

  it('words and plan figures: "Centred, 2.4 m | 2.4 m"', () => {
    const lo = liveOpening(H, walls, 5, 0.9);
    expect(lo.words).toBe('Centred, 2.4 m | 2.4 m');
    expect(lo.centred).toBe(true);
    expect(lo.shapes.filter((s) => s.kind === 'text').map((s) => (s.kind === 'text' ? s.text : ''))).toEqual(['2.4 m', '2.4 m']);
    expect(liveOpening(H, walls, 3.5, 0.9).words).toBe('0.9 m | 3.9 m');
  });
});

describe('live sizes (ON1 decision 5)', () => {
  it('a wall: its length and the clear distance to the nearest parallel wall, face to face', () => {
    const g = parallelGap(H, walls)!;
    expect(g.other).toBe('P');
    expect(g.dist).toBe(2.7);
    expect(g.a).toEqual([5, 0.15]);
    expect(g.b[1]).toBeCloseTo(2.85, 9);
    expect(liveWall(H, walls).words).toBe('length 10 m, 2.7 m to the parallel wall');
    // nothing parallel within 10 m and overlapping
    expect(parallelGap(wall('Lone', [30, 0], [34, 0]), walls)).toBeNull();
    expect(liveWall(wall('Lone', [30, 0], [34, 0]), walls).words).toBe('length 4 m');
  });

  it('a room: size and area; a stretched edge: the distance to the wall it approaches', () => {
    expect(roomSize([0, 0, 4, 3])).toBe('4 x 3 m, 12 m2');
    expect(liveRoom([2, 0, 8, 3], null, null, 'G', walls).words).toBe('6 x 3 m, 18 m2');
    // the east edge moved east onto x = 8 (its own wall C2 does not count); V at x = 11 is next: 3 - 0.15
    expect(liveRoom([2, 0, 8, 3], 'E', [2, 0, 7, 3], 'G', walls).words).toBe('6 x 3 m, 18 m2, 2.85 m to the next wall');
    // moved west: it approaches C1 at x = 2 from x = 4 (2 - 0.15)
    expect(liveRoom([0.5, 0, 4, 3], 'E', [0.5, 0, 5, 3], 'G', walls).words).toBe('3.5 x 3 m, 10.5 m2, 1.85 m to the next wall');
  });
});

describe('smart snapping (ON1 decision 7)', () => {
  const rooms = [room('R2', [12.2, 0, 14, 3])];
  it('room edges snap to wall faces, wall lines and other room edges within 0.3 m', () => {
    expect(edgeSnap(10.8, 'E', 'G', walls, rooms, null, [0, 3])).toEqual({ v: 10.85, label: 'Wall face' });
    expect(edgeSnap(11, 'E', 'G', walls, rooms, null, [0, 3])).toEqual({ v: 11, label: 'Wall line' });
    expect(edgeSnap(12, 'E', 'G', walls, rooms, null, [0, 3])).toEqual({ v: 12.2, label: 'Room edge' });
    expect(edgeSnap(12, 'E', 'G', walls, rooms, 'R2', [0, 3])).toBeNull();
    // a wall far down the same grid line does not pull (only walls and rooms beside the edge)
    expect(edgeSnap(12, 'E', 'G', [wall('Away', [12.2, 50], [12.2, 60])], [], null, [0, 3])).toBeNull();
    expect(edgeSnap(12, 'E', 'G', [wall('Away', [12.2, 50], [12.2, 60])], [], null, [48, 52])).toEqual({ v: 12.05, label: 'Wall face' });
    expect(edgeSnap(1.5, 'N', 'G', walls, rooms, null, [2, 6])).toBeNull();
    expect(edgeSnap(2.8, 'N', 'G', walls, rooms, null, [2, 6])).toEqual({ v: 2.85, label: 'Wall face' });
  });

  it('the dot pulls onto a room edge within SNAP.EDGE only; guide lines follow the snap', () => {
    const edge: SnapCand = { kind: 'line', key: 'edge:R:E', label: 'Room edge', owner: 'rooms:R', a: [4, 0], b: [4, 3], pull: SNAP.EDGE };
    expect(magnetSearch(4.4, 1, [edge], null, { grid: 0.1 })).toBeNull();
    const hit = magnetSearch(4.2, 1, [edge], null, { grid: 0.1 })!;
    expect(hit.label).toBe('Room edge');
    // held a little past the pull, let go by 0.42 m (a wall line holds to 0.7 m)
    expect(magnetSearch(4.4, 1, [edge], hit, { grid: 0.1 })?.key).toBe('edge:R:E');
    expect(magnetSearch(4.5, 1, [edge], hit, { grid: 0.1 })).toBeNull();
    expect([hit.x, hit.z]).toEqual([4, 1]);
    expect(guideLines(hit, [edge])).toEqual([[[4, -SNAP.GUIDE], [4, 3 + SNAP.GUIDE]]]);
    expect(guideLines({ key: 'p', label: 'Wall end', kind: 'point', x: 1, z: 2 }, []).length).toBe(2);
    expect(guideLines(null, [edge])).toEqual([]);
  });
});
