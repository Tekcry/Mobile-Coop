import { describe, expect, it } from 'vitest';
import { GRAB, grabPart, MAGNET, magnetSearch, rectBand, turnPt } from '../../src/editor/grab';
import type { GrabShape, SnapCand } from '../../src/editor/grab';

const room: GrabShape = { kind: 'rect', rect: [0, 0, 6, 4] };

describe('edge-aware grab', () => {
  it('rooms: each edge by name inside or just outside, Move in the middle, null outside the band', () => {
    expect(grabPart(room, 5.8, 2)).toEqual({ handle: 'E', words: 'Stretch east edge' });
    expect(grabPart(room, 6.3, 2)).toEqual({ handle: 'E', words: 'Stretch east edge' });
    expect(grabPart(room, 0.2, 2)?.words).toBe('Stretch west edge');
    expect(grabPart(room, 3, 0.1)?.words).toBe('Stretch south edge');
    expect(grabPart(room, 3, 3.9)?.words).toBe('Stretch north edge');
    expect(grabPart(room, 3, 2)).toEqual({ handle: null, words: 'Move' });
    expect(grabPart(room, 6.6, 2)).toBeNull();
    expect(grabPart(room, 3, -0.6)).toBeNull();
  });

  it('the nearer edge wins at a corner', () => {
    expect(grabPart(room, 5.9, 3.7)?.handle).toBe('E');
    expect(grabPart(room, 5.7, 3.9)?.handle).toBe('N');
    expect(grabPart(room, 6.2, 4.1)?.handle).toBe('N');
  });

  it('small rooms keep a middle: the band is a quarter of the shorter side', () => {
    const small: GrabShape = { kind: 'rect', rect: [0, 0, 1.2, 1] };
    expect(rectBand(small.rect)).toBeCloseTo(0.25);
    expect(rectBand(room.kind === 'rect' ? room.rect : [0, 0, 0, 0])).toBe(GRAB.BAND_MAX);
    expect(grabPart(small, 0.6, 0.5)?.words).toBe('Move');
    expect(grabPart(small, 1.0, 0.5)?.handle).toBe('E');
  });

  it('walls: an end stretches that end, the middle moves, null away from the wall', () => {
    const w: GrabShape = { kind: 'wall', a: [0, 0], b: [8, 0], t: 0.3 };
    expect(grabPart(w, 0.3, 0.1)).toEqual({ handle: 'a', words: 'Stretch this end' });
    expect(grabPart(w, 7.8, -0.2)).toEqual({ handle: 'b', words: 'Stretch this end' });
    expect(grabPart(w, -0.3, 0)?.handle).toBe('a');
    expect(grabPart(w, 4, 0.2)).toEqual({ handle: null, words: 'Move' });
    expect(grabPart(w, 4, 0.8)).toBeNull();
    expect(grabPart(w, 8.6, 0)).toBeNull();
    // a 1 m wall: the band is a quarter of its length
    const short: GrabShape = { kind: 'wall', a: [0, 0], b: [1, 0], t: 0.3 };
    expect(grabPart(short, 0.5, 0)?.words).toBe('Move');
    expect(grabPart(short, 0.2, 0)?.handle).toBe('a');
  });

  it('openings: a side widens, the middle slides along the wall', () => {
    const o: GrabShape = { kind: 'opening', a: [0, 0], b: [10, 0], t: 0.3, at: 5, w: 0.9 };
    expect(grabPart(o, 4.6, 0)).toEqual({ handle: 'l', words: 'Widen' });
    expect(grabPart(o, 5.5, 0.1)).toEqual({ handle: 'r', words: 'Widen' });
    expect(grabPart(o, 5, 0)).toEqual({ handle: null, words: 'Slide along the wall' });
    expect(grabPart(o, 5, 0.5)).toBeNull();
    expect(grabPart(o, 3.5, 0)).toBeNull();
  });
});

const cands: SnapCand[] = [
  { kind: 'point', key: 'end:W1:a', label: 'Wall end', owner: 'walls:W1', p: [0, 0] },
  { kind: 'point', key: 'end:W1:b', label: 'Wall end', owner: 'walls:W1', p: [10, 0] },
  { kind: 'point', key: 'open:D1', label: 'Door centre', owner: 'openings:D1', p: [5, 0] },
  { kind: 'line', key: 'line:W1', label: 'On wall', owner: 'walls:W1', a: [0, 0], b: [10, 0] },
];

describe('magnetic dot', () => {
  it('points beat lines; lines snap to the grid along them', () => {
    expect(magnetSearch(0.3, 0.1, cands, null, { grid: 0.5 })).toMatchObject({ key: 'end:W1:a', x: 0, z: 0, label: 'Wall end' });
    expect(magnetSearch(2.7, 0.3, cands, null, { grid: 0.5 })).toMatchObject({ key: 'line:W1', x: 2.5, z: 0, label: 'On wall' });
    expect(magnetSearch(2.7, 0.6, cands, null, { grid: 0.5 })).toBeNull();
    // on a line, a point inside the pull takes over
    const line = magnetSearch(4.2, 0.1, cands, null, { grid: 0.5 });
    expect(line?.kind).toBe('line');
    expect(magnetSearch(4.6, 0.1, cands, line, { grid: 0.5 })?.key).toBe('open:D1');
  });

  it('holds until the release radius', () => {
    const hit = magnetSearch(0.4, 0, cands, null, { grid: 0.5 });
    expect(hit?.key).toBe('end:W1:a');
    expect(magnetSearch(0.65, 0, cands, hit, { grid: 0.5 })?.key).toBe('end:W1:a');
    expect(MAGNET.RELEASE).toBeGreaterThan(MAGNET.PULL);
    // past the release radius the point lets go (the wall line takes over)
    expect(magnetSearch(0.75, 0, cands, hit, { grid: 0.5 })?.key).toBe('line:W1');
    expect(magnetSearch(0.65, 0, cands, null, { grid: 0.5 })?.key).toBe('line:W1');
  });

  it('skips the dragged element and is off while LB is held', () => {
    expect(magnetSearch(0.3, 0, cands, null, { grid: 0.5, skip: 'walls:W1' })).toBeNull();
    expect(magnetSearch(5.2, 0, cands, null, { grid: 0.5, skip: 'openings:D1' })?.key).toBe('line:W1');
    expect(magnetSearch(0.3, 0, cands, null, { grid: 0.5, off: true })).toBeNull();
  });

  it('a quarter turn clockwise about a point', () => {
    expect(turnPt([2, 0], 0, 0)).toEqual([0, -2]);
    expect(turnPt([1, 1], 1, 0)).toEqual([2, 0]);
  });
});
