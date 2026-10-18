import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { aimPoint } from '../../src/editor/aim';
import { areaGrid, fittingOf } from '../../src/editor/lightCatalogue';
import { ceilingOver, ceilingSurface, lampArea, placeLamp, slideLamp, withParams } from '../../src/editor/lamps';
import type { Lamp, LampData, PlaceCtx } from '../../src/editor/lamps';
import { clampToRect, deadZone, snapAxis, snapLines, snapSlide, stickMove } from '../../src/editor/mount';
import { defaultBase, newRoof, roofCornerSnap, roofUnderside, wallTopAt } from '../../src/editor/roofGeometry';
import type { RoofData } from '../../src/editor/roofGeometry';
import { campusLights } from '../../src/world/maps/kestrelLights';
import { ROOF_BUILD } from '../../src/world/maps/kestrelRoofs';
import type { Campus } from '../../src/editor/types';

const facts = JSON.parse(readFileSync('scripts/kestrel/facts.json', 'utf8')) as Record<string, Record<string, { value: number }>>;
const LF = (n: string): number => facts.light![n]!.value;

/** A 10 x 10 office (ceiling 3) and a 10 x 10 store beside it (none: the storey less the slab), walls 3.2 high. */
const campus = (roofs: RoofData[] = []): LampData & Campus =>
  ({
    meta: { id: 't', buildings: [{ id: 'A', footprint: [0, 0, 20, 10] }] },
    levels: [{ id: 'G', name: 'Ground', floor: 0, height: 4.2 }],
    rooms: [
      { id: 'R1', level: 'G', name: 'Office', kind: 'room', rect: [0, 0, 10, 10], ceiling: 3, building: 'A' },
      { id: 'R2', level: 'G', name: 'Store', kind: 'room', rect: [10, 0, 20, 10], ceiling: 0, building: 'A' },
    ],
    walls: [
      { id: 'W1', level: 'G', a: [0, 0], b: [20, 0], t: 0.4, h: 3.2, kind: 'exterior' },
      { id: 'W2', level: 'G', a: [20, 0], b: [20, 10], t: 0.4, h: 3.2, kind: 'exterior' },
      { id: 'W3', level: 'G', a: [20, 10], b: [0, 10], t: 0.4, h: 3.2, kind: 'exterior' },
      { id: 'W4', level: 'G', a: [0, 10], b: [0, 0], t: 0.4, h: 3.2, kind: 'exterior' },
      { id: 'W5', level: 'G', a: [10, 0], b: [10, 10], t: 0.2, h: 3.2, kind: 'interior' },
    ],
    openings: [],
    stairs: [],
    ladders: [],
    voids: [],
    objects: [],
    roofs,
  }) as unknown as LampData & Campus;
const ctx = (d: LampData): PlaceCtx => ({ data: d, level: 'G', grid: 0.1, yaw: 0 });
/** A flat roof over the office lowered to 2.6 (its underside 2.6 less the deck). */
const lowRoof = (): RoofData => ({ id: 'RF1', level: 'G', rect: [0, 0, 10, 10], base: 2.6, type: 'flat', fall: 0, overhang: 0 });

describe('snap maths (Michael 2026-10-14)', () => {
  it('a ceiling snaps to its centre and quarter lines both ways within the magnet; LB (off) leaves it free', () => {
    expect(snapLines(0, 8)).toEqual([2, 4, 6]);
    const m = LF('snapMagnet');
    const s = snapSlide(4.1, 5.95, [0, 0, 8, 8], m);
    expect(s).toEqual({ x: 4, z: 6, lx: 4, lz: 6 });
    expect(snapSlide(3, 5, [0, 0, 8, 8], m)).toEqual({ x: 3, z: 5, lx: null, lz: null });
    expect(snapSlide(4.1, 5.95, [0, 0, 8, 8], m, true)).toEqual({ x: 4.1, z: 5.95, lx: null, lz: null });
    expect(snapAxis(2 + m + 0.01, 0, 8, m)).toBeNull();
    expect(clampToRect(-1, 9, [0, 0, 8, 8])).toEqual([0, 8]);
  });

  it('the stick moves the way the camera faces; the dead zone rescales', () => {
    const [x, z] = stickMove(0, 1, 0, 2, 0.5);
    expect(x).toBeCloseTo(0, 6);
    expect(z).toBeCloseTo(1, 6);
    const [rx, rz] = stickMove(1, 0, 0, 2, 0.5);
    expect(rx).toBeCloseTo(1, 6);
    expect(rz).toBeCloseTo(0, 6);
    expect(deadZone(0.1, 0.15)).toBe(0);
    expect(deadZone(-1, 0.15)).toBeCloseTo(-1, 6);
  });
});

describe('placing matches the ghost on a lowered roof (Michael 2026-10-14)', () => {
  it('the ceiling over a point is the lowered roof underside where it is lower than the room ceiling', () => {
    const d = campus([lowRoof()]);
    expect(roofUnderside(lowRoof(), 5, 5)).toBeCloseTo(2.6 - ROOF_BUILD.deck.value, 6);
    expect(ceilingOver(d, 'G', 5, 5)).toBeCloseTo(2.6 - ROOF_BUILD.deck.value, 6);
    expect(ceilingSurface(d, 'G', 5, 5)!.id).toBe('RF1');
    expect(ceilingSurface(d, 'G', 15, 5)!.id).toBe('R2');
    expect(ceilingOver(campus(), 'G', 5, 5)).toBe(3);
  });

  it('a lamp placed from an aim hit on the roof underside is the record committed, at the hit surface less its gap', () => {
    const d = campus([lowRoof()]);
    const under = 2.6 - ROOF_BUILD.deck.value;
    // the aim: a ray from the floor up at the underside (as the 3D pick gives it)
    const a = aimPoint({ o: [4, 1.5, 4], d: [0.6, 0.8, 0] }, { x: 4 + (under - 1.5) * 0.75, y: under, z: 4, n: [0, -1, 0] }, 0, (x, z) => ceilingOver(d, 'G', x, z) ?? 4, 0.1)!;
    expect(a.surf).toBe('ceiling');
    const f = fittingOf('troffer-1200')!;
    const ghost = placeLamp(f, a.p[0], a.p[1], ctx(d));
    const committed = placeLamp(f, a.p[0], a.p[1], ctx(d));
    expect(committed).toEqual(ghost);
    const l = ghost.lamps[0]!;
    expect(l.at[1]).toBeCloseTo(a.ceil - LF('surfaceGap'), 6);
    expect(l.at[1]).toBeLessThan(under);
  });
});

describe('sliding a placed lamp (Michael 2026-10-14)', () => {
  const lamp = (d: LampData, x: number, z: number): Lamp => ({ ...placeLamp(fittingOf('downlight')!, x, z, ctx(d)).lamps[0]!, id: 'LP1', circuit: '' });
  const opt = { grid: 0.1, magnet: LF('snapMagnet'), off: false };

  it('moves over its ceiling and snaps to a quarter line; off keeps the free point', () => {
    const d = campus();
    const l = lamp(d, 4, 4);
    const s = slideLamp(d, l, 3.4, 0.6, opt);
    expect(s.lamp.at[0]).toBe(7.5);
    expect(s.lamp.at[2]).toBe(4.6);
    expect(s.snap).toEqual({ x: 7.5, z: 4.6, lx: 7.5, lz: null });
    expect(s.lamp.at[1]).toBe(l.at[1]);
    const f = slideLamp(d, l, 3.4, 0.6, { ...opt, off: true });
    expect(f.lamp.at[0]).toBe(7.4);
    expect(f.snap).toBeNull();
  });

  it('onto the next ceiling it keeps its drop under that one; off every ceiling it stays on its own', () => {
    const d = campus();
    const l = lamp(d, 8, 5);
    const s = slideLamp(d, l, 4, 0, opt);
    expect(s.lamp.room).toBe('R2');
    expect(s.lamp.at[1]).toBeCloseTo(l.at[1] + (ceilingOver(d, 'G', 12, 5)! - 3), 6);
    const out = slideLamp(d, l, 0, 9, { ...opt, off: true });
    expect(out.lamp.at[2]).toBe(10);
    const lr = campus([lowRoof()]);
    const under = slideLamp(lr, lamp(lr, 12, 5), -4, 0, opt);
    expect(under.lamp.at[1]).toBeLessThan(2.6 - ROOF_BUILD.deck.value);
  });
});

describe('area fittings light across their face (Michael 2026-10-14)', () => {
  it('troffers are 600 x 300 and 1200 x 300, lumens sourced', () => {
    const a = fittingOf('troffer-600')!;
    const b = fittingOf('troffer-1200')!;
    expect([a.name, a.body[0], a.body[2]]).toEqual(['Troffer 600 x 300', 0.6, 0.3]);
    expect([b.name, b.body[0], b.body[2]]).toEqual(['Troffer 1200 x 300', 1.2, 0.3]);
    expect(a.src).toMatch(/Michael, 2026-10-14/);
    expect(b.src).toMatch(/3600 lm/);
    expect(a.lumens).toBe(1800);
  });

  it('a grid per facts light.areaCell, capped at light.areaMax', () => {
    expect(areaGrid(1.2, 0.3)).toEqual({ nw: 4, nd: 1 });
    expect(areaGrid(0.6, 0.3)).toEqual({ nw: 2, nd: 1 });
    expect(areaGrid(0.09, 0.09)).toEqual({ nw: 1, nd: 1 });
    const g = areaGrid(9, 0.3);
    expect(g.nw * g.nd).toBeLessThanOrEqual(LF('areaMax'));
  });

  it('the game builds one light per point: the total output is unchanged and the points span the fitting', () => {
    const d = campus();
    const l: Lamp = { ...placeLamp(fittingOf('troffer-1200')!, 5, 5, ctx(d)).lamps[0]!, id: 'LP1', circuit: '' };
    expect(l.params.area!.pts.length).toBe(4);
    const ls = campusLights({ ...d, lamps: [l], circuits: [] });
    expect(ls.length).toBe(4);
    const sum = ls.reduce((s, q) => s + (q.intensity ?? 0), 0);
    expect(sum).toBeCloseTo(l.params.intensity, 9);
    const xs = ls.map((q) => q.x);
    expect(Math.min(...xs)).toBeCloseTo(5 - 0.45, 6);
    expect(Math.max(...xs)).toBeCloseTo(5 + 0.45, 6);
    expect(ls.every((q) => q.radius === l.params.radius && q.fixture!.sx === 0.3 && q.fixture!.sz === 0.3)).toBe(true);
    // turned a quarter, the points run along z
    const t = withParams({ ...l, yaw: 90 });
    expect(new Set(t.params.area!.pts.map((p) => p[0])).size).toBe(1);
    // a downlight stays one point; a strip spreads along its line
    expect(placeLamp(fittingOf('downlight')!, 5, 5, ctx(d)).lamps[0]!.params.area).toBeUndefined();
    const st = lampArea({ at: [0, 2.5, 0], b: [3, 2.5, 0] }, fittingOf('led-strip')!, 3, 0.03)!;
    expect(st.pts.length).toBe(LF('areaMax'));
    expect(st.pts[0]![0]).toBeLessThan(-1.2);
  });
});

describe('roofs sit on walls (Michael 2026-10-14)', () => {
  it('corners snap to the outer faces of walls under the aim; the eaves default to the wall top along the outline', () => {
    const d = campus();
    expect(roofCornerSnap(d, 'G', -0.1, 4, false).p).toEqual([-0.2, 4]);
    expect(roofCornerSnap(d, 'G', 20.3, 10.1, false).p).toEqual([20.2, 10.2]);
    expect(roofCornerSnap(d, 'G', -0.1, 4, true).p).toEqual([-0.1, 4]);
    expect(wallTopAt(d, 'G', 0.1, 5)).toBe(3.2);
    expect(wallTopAt(d, 'G', 5, 5)).toBeNull();
    expect(defaultBase(d, 'G', [-0.2, -0.2, 20.2, 10.2])).toBe(3.2);
    // a long wall running past the outline still counts (only its overlap)
    expect(defaultBase(d, 'G', [-0.2, -0.2, 10.1, 10.2])).toBe(3.2);
    // a roof just started on a wall top sits on it
    expect(newRoof(d, 'G', [0.1, 5, 0.1, 5], 'flat', 'RF1').base).toBe(3.2);
  });
});
