// (F1a, G181) the selection wheel: segment from the stick angle, the vision stack, the cursor and the pick
import { describe, expect, it } from 'vitest';
import { buildWheel, nextVision, segmentAt, SelectionWheel, wheelLabel, wheelSegment, WHEEL_DEAD, WHEEL_HOME } from '../src/game/selectionWheel';
import { VisionState } from '../src/game/vision';

const guns = [
  { index: 0, name: 'Pistol', loaded: 11, reserve: 20 },
  { index: 1, name: 'Rifle', loaded: 30, reserve: 90 },
];
const kit = [
  { id: 'frag' as const, name: 'Frag', count: 2 },
  { id: 'gas' as const, name: 'Sleeping gas', count: 0 },
];

describe('selection wheel (F1a)', () => {
  it('the ring: vision at the top, then the guns, then the gadgets', () => {
    const r = buildWheel(guns, kit);
    expect(r.map((s) => s.kind)).toEqual(['vision', 'gun', 'gun', 'gadget', 'gadget']);
  });

  it('segment from the stick angle: 0 at the top, clockwise, dead zone -1', () => {
    expect(segmentAt(0, 1, 4)).toBe(0);
    expect(segmentAt(1, 0, 4)).toBe(1);
    expect(segmentAt(0, -1, 4)).toBe(2);
    expect(segmentAt(-1, 0, 4)).toBe(3);
    expect(segmentAt(0.1, 0.1, 4)).toBe(-1);
    expect(segmentAt(0, WHEEL_DEAD + 0.01, 8)).toBe(0);
    // a slice either side of the top stays on segment 0 (11 segments: half width about 16 deg)
    expect(segmentAt(Math.sin(0.2), Math.cos(0.2), 11)).toBe(0);
    expect(segmentAt(-Math.sin(0.2), Math.cos(0.2), 11)).toBe(0);
    expect(segmentAt(0, 1, 0)).toBe(-1);
  });

  it('the vision carousel (nv-pass slice 3): night -> thermal -> electro -> night', () => {
    expect(nextVision('night')).toBe('thermal');
    expect(nextVision('thermal')).toBe('electro');
    expect(nextVision('electro')).toBe('night');
  });

  it('A on the lit vision slot steps the mode; off the slot it does nothing; the wheel opens on the selected mode', () => {
    const ring = buildWheel(guns, kit);
    const w = new SelectionWheel();
    w.begin('thermal');
    expect(w.mode).toBe('thermal');
    // (sector-fixes W) the vision slot is lit on open: A steps the mode with no stick
    w.update(ring.length);
    expect(w.cycle(ring)).toBe(true);
    expect(w.pick(ring)).toEqual({ kind: 'vision', mode: 'electro' });
    w.place(0, 0.45);
    w.update(ring.length);
    expect(w.cycle(ring)).toBe(true);
    expect(w.pick(ring)).toEqual({ kind: 'vision', mode: 'night' });
    // the cursor length no longer picks: out to the rim keeps the carousel's mode
    w.place(0, 1);
    w.update(ring.length);
    expect(w.pick(ring)).toEqual({ kind: 'vision', mode: 'night' });
    const a = (2 / 5) * Math.PI * 2;
    w.place(Math.sin(a), Math.cos(a));
    w.update(ring.length);
    expect(w.cycle(ring)).toBe(false);
    expect(w.mode).toBe('night');
    w.begin();
    expect(w.mode).toBe('night');
  });

  it('cursor and pick: the vision slot, a gun, a gadget; the dead zone is the vision slot (sector-fixes W)', () => {
    const ring = buildWheel(guns, kit);
    const w = new SelectionWheel();
    w.begin();
    expect(w.open).toBe(true);
    expect(w.seg).toBe(WHEEL_HOME);
    w.update(ring.length);
    expect(w.seg).toBe(0);
    expect(w.pick(ring)).toEqual({ kind: 'vision', mode: 'night' });
    w.place(0, 0.45);
    w.update(ring.length);
    expect(w.pick(ring)).toEqual({ kind: 'vision', mode: 'night' });
    w.place(0, 1);
    w.update(ring.length);
    expect(w.pick(ring)).toEqual({ kind: 'vision', mode: 'night' });
    // segment 2 of 5 (the rifle): 144 deg clockwise from the top
    const a = (2 / 5) * Math.PI * 2;
    w.place(Math.sin(a), Math.cos(a));
    w.update(ring.length);
    expect(w.seg).toBe(2);
    expect(w.pick(ring)).toEqual({ kind: 'gun', index: 1 });
    const b = (4 / 5) * Math.PI * 2;
    w.place(Math.sin(b), Math.cos(b));
    w.update(ring.length);
    expect(w.pick(ring)).toEqual({ kind: 'gadget', id: 'gas' });
    w.end();
    expect(w.open).toBe(false);
  });

  it('no pick is held (sector-fixes W, item 8): the stick let go or the mouse back in the centre lights the vision slot', () => {
    const ring = buildWheel(guns, kit);
    expect(wheelSegment(0, 0, ring.length)).toBe(WHEEL_HOME);
    expect(wheelSegment(0.2, -0.2, ring.length)).toBe(WHEEL_HOME);
    expect(wheelSegment(1, 0, ring.length)).toBe(segmentAt(1, 0, ring.length));
    expect(wheelSegment(0, 0, 0)).toBe(-1);
    const w = new SelectionWheel();
    w.begin('thermal');
    // pad: the stick on the rifle (segment 2 of 5), then let go: back on vision, the release picks the vision mode
    const a = (2 / 5) * Math.PI * 2;
    w.place(Math.sin(a), Math.cos(a));
    w.update(ring.length);
    expect(w.pick(ring)).toEqual({ kind: 'gun', index: 1 });
    w.place(0, 0);
    w.update(ring.length);
    expect(w.seg).toBe(WHEEL_HOME);
    expect(w.cycle(ring)).toBe(true);
    expect(w.pick(ring)).toEqual({ kind: 'vision', mode: 'electro' });
    // mouse: deltas out to the frag (segment 3), then back to the centre: vision again
    const b = (3 / 5) * Math.PI * 2;
    w.look(Math.sin(b) * 0.12, Math.cos(b) * 0.12);
    w.update(ring.length);
    expect(w.pick(ring)).toEqual({ kind: 'gadget', id: 'frag' });
    w.look(-Math.sin(b) * 0.12, -Math.cos(b) * 0.12);
    w.update(ring.length);
    expect(w.seg).toBe(WHEEL_HOME);
    // a fresh open never keeps the last highlight
    w.place(Math.sin(a), Math.cos(a));
    w.update(ring.length);
    w.end();
    w.begin('night');
    expect(w.seg).toBe(WHEEL_HOME);
  });

  it('look deltas move the cursor and clamp it to the rim', () => {
    const w = new SelectionWheel();
    w.begin();
    w.look(0.06, 0);
    expect(w.cx).toBeCloseTo(0.5, 5);
    w.look(5, 5);
    expect(Math.hypot(w.cx, w.cy)).toBeCloseTo(1, 5);
  });

  it('the label names the item and its kind', () => {
    const ring = buildWheel(guns, kit);
    expect(wheelLabel(ring[0], 'thermal')).toEqual(['Thermal vision', 'Vision mode']);
    expect(wheelLabel(ring[1], 'night')).toEqual(['Pistol', 'Weapon 11 / 20']);
    expect(wheelLabel(ring[3], 'night')).toEqual(['Frag', 'Gadget x2']);
    expect(wheelLabel(undefined, 'night')).toEqual(['', '']);
  });

  it('the vision button toggles the selected mode on and off; picking another switches live with no flip (gog-1)', () => {
    const v = new VisionState();
    expect(v.selected).toBe('night');
    expect(v.toggle()).toBe('night');
    expect(v.change).toBe('on');
    v.select('thermal');
    expect(v.mode).toBe('thermal');
    expect(v.change).toBe('switch');
    expect(v.toggle()).toBe('off');
    expect(v.change).toBe('off');
    v.select('electro');
    expect(v.mode).toBe('off');
    expect(v.toggle()).toBe('electro');
  });
});
