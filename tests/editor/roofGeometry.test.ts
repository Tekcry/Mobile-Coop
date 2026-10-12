import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { campusText, EditorModel } from '../../src/editor/model';
import { cardRows, stepCard } from '../../src/editor/card';
import { defaultBase, flatLevelCheck, footprintAt, MAX_SLOPE, newRoof, ROOF_FACTS, roofId, roofWords, steepWords, withRoofType } from '../../src/editor/roofGeometry';
import { menuTiles } from '../../src/editor/tileMenu';
import type { Campus, Roof } from '../../src/editor/types';
import { hipRidgeLength, outerRect, roofParapets, roofPlan, roofShape, roofTrim, roofWalkPieces, sawtoothCount } from '../../src/world/maps/kestrelRoofs';
import type { RoofData } from '../../src/world/maps/kestrelRoofs';
import { campusToBuild, roofContext } from '../../src/world/maps/kestrelCampus';
import type { CampusFile } from '../../src/world/maps/kestrelCampus';

const CAMPUS = 'docs/kestrel/kestrel.campus.blocks.json';
const load = (): Campus => JSON.parse(readFileSync(CAMPUS, 'utf8')) as Campus;
const facts = JSON.parse(readFileSync('scripts/kestrel/facts.json', 'utf8')) as Record<string, Record<string, { value: number }>>;
const tan = (d: number): number => Math.tan((d * Math.PI) / 180);
const roof = (o: Partial<RoofData>): RoofData => ({ id: 'RF01', level: 'G', rect: [0, 0, 12, 8], base: 3, type: 'gable', pitch: 25, ridge: 'x', overhang: 0, fascia: 0.2, gutter: false, ...o });
const minY = (r: RoofData): number => Math.min(...roofShape(r).planes.filter((p) => p.kind === 'roof').flatMap((p) => p.pts.map((q) => q[1])));

describe('roof geometry per type (ON10)', () => {
  it('gable: ridge height = eaves + half span x tan(pitch), ridge along x or z', () => {
    const x = roofShape(roof({}));
    expect(x.ridgeHeight).toBeCloseTo(3 + 4 * tan(25), 3);
    expect(x.planes.filter((p) => p.kind === 'roof').map((p) => p.up).sort()).toEqual(['N', 'S']);
    expect(x.planes.filter((p) => p.kind === 'end')).toHaveLength(2);
    const z = roofShape(roof({ ridge: 'z' }));
    expect(z.ridgeHeight).toBeCloseTo(3 + 6 * tan(25), 3);
    expect(z.ridges[0]![0][0]).toBeCloseTo(6, 6);
  });
  it('hip: ridge length = long side - short side, hips on all four corners; a square roof is a pyramid', () => {
    const h = roofShape(roof({ type: 'hip' }));
    expect(hipRidgeLength([0, 0, 12, 8])).toBe(4);
    const rg = h.ridges[0]!;
    expect(Math.abs(rg[1][0] - rg[0][0])).toBeCloseTo(4, 6);
    expect(h.hips).toHaveLength(4);
    expect(h.planes.filter((p) => p.kind === 'roof').map((p) => p.up).sort()).toEqual(['E', 'N', 'S', 'W']);
    const sq = roofShape(roof({ type: 'hip', rect: [0, 0, 8, 8] }));
    expect(sq.ridges).toHaveLength(0);
    expect(sq.ridgeHeight).toBeCloseTo(3 + 4 * tan(25), 3);
  });
  it('mono-pitch: rises across the whole span to its high side', () => {
    const m = roofShape(roof({ type: 'mono', high: 'E', pitch: 10 }));
    expect(m.ridgeHeight).toBeCloseTo(3 + 12 * tan(10), 3);
    expect(m.planes.find((p) => p.kind === 'roof')!.up).toBe('E');
  });
  it('sawtooth: teeth = span / tooth width, rounded; one glass face per tooth', () => {
    const r = roof({ type: 'sawtooth', rect: [0, 0, 20, 18], tooth: 6, glazed: 'S', pitch: 25 });
    expect(sawtoothCount(r)).toBe(3);
    const s = roofShape(r);
    expect(s.ridges).toHaveLength(3);
    expect(s.planes.filter((p) => p.kind === 'glass')).toHaveLength(3);
    expect(s.ridgeHeight).toBeCloseTo(3 + 6 * tan(25), 3);
    expect(sawtoothCount({ ...r, tooth: 7 })).toBe(3);
    expect(sawtoothCount({ ...r, tooth: 100 })).toBe(1);
  });
  it('curved: the crown is eaves + rise, the eaves facets the steepest', () => {
    const c = roofShape(roof({ type: 'curved', rise: 1.5, ridge: 'x' }));
    expect(c.ridgeHeight).toBeCloseTo(4.5, 6);
    expect(c.steepest).toBeGreaterThan(20);
    expect(c.planes.filter((p) => p.kind === 'roof')).toHaveLength(12);
  });
  it('flat: level at the eaves height with a parapet or an upstand', () => {
    const f = roof({ type: 'flat', edge: 'parapet', parapet: 1.1, fallsTo: 'S' });
    expect(roofShape(f).ridgeHeight).toBe(3);
    const ps = roofParapets(f);
    expect(ps).toHaveLength(4);
    expect(Math.max(...ps.map((p) => p.box.c[1] + p.box.s[1] / 2))).toBeCloseTo(4.1, 6);
    expect(roofParapets({ ...f, edge: 'upstand', upstand: 0.3 })[0]!.box.s[1]).toBeCloseTo(0.3, 6);
    expect(roofPlan(f).arrows).toHaveLength(1);
  });
  it('overhang: the outline grows and the eaves drop by overhang x tan(pitch); the ridge stays', () => {
    const r = roof({ overhang: 0.6 });
    expect(outerRect(r)).toEqual([-0.6, -0.6, 12.6, 8.6]);
    expect(minY(r)).toBeCloseTo(3 - 0.6 * tan(25), 6);
    expect(roofShape(r).ridgeHeight).toBeCloseTo(roofShape(roof({})).ridgeHeight, 6);
    expect(roofShape(roof({ type: 'hip', overhang: 0.6 })).ridges[0]![1][0] - roofShape(roof({ type: 'hip', overhang: 0.6 })).ridges[0]![0][0]).toBeCloseTo(4, 6);
  });
  it('gutters run along the eaves only, downpipes at their ends', () => {
    const t = roofTrim(roof({ gutter: true, downpipes: true, fascia: 0 }), 0);
    // two eaves (north and south) of a gable: two gutters and four downpipes
    expect(t.filter((b) => b.s[1] < 1)).toHaveLength(2);
    expect(t.filter((b) => b.s[1] > 1)).toHaveLength(4);
  });
});

describe('the walk test pieces', () => {
  it('a slope is strips whose tops lie on the plane, tilted by the pitch', () => {
    const r = roof({ overhang: 0.5 });
    const { boxes } = roofWalkPieces(r);
    const strips = boxes.filter((b) => b.s[0] > 0.1 && Math.abs(Math.abs(b.pitch) - (25 * Math.PI) / 180) < 1e-9);
    expect(strips.length).toBeGreaterThan(10);
    for (const s of strips) {
      // the strip's top face centre: the box centre plus half its thickness along its up axis
      const n = [Math.sin(s.yaw) * Math.sin(-s.pitch) * -1, Math.cos(s.pitch), Math.cos(s.yaw) * Math.sin(-s.pitch) * -1];
      const top = [s.c[0] + (n[0]! * s.s[1]) / 2, s.c[1] + (n[1]! * s.s[1]) / 2, s.c[2] + (n[2]! * s.s[1]) / 2];
      const dist = Math.abs(top[2]! - 4);
      expect(top[1]).toBeCloseTo(3 + (4 - dist) * tan(25), 2);
    }
  });
  it('roof lights cut through; a flat roof on a level floor builds no second slab and no second parapet', () => {
    const f = roof({ type: 'flat', edge: 'parapet', parapet: 1.1, rect: [0, 0, 10, 10] });
    const area = (bs: { s: number[]; pitch: number }[]): number => bs.filter((b) => b.pitch === 0 && b.s[1] < 0.3).reduce((a, b) => a + b.s[0]! * b.s[2]!, 0);
    expect(area(roofWalkPieces(f).boxes)).toBeCloseTo(100, 6);
    expect(area(roofWalkPieces(f, { cuts: [[2, 2, 4, 5]] }).boxes)).toBeCloseTo(94, 6);
    const g = roof({ rect: [0, 0, 10, 8] });
    expect(roofWalkPieces(g, { cuts: [[2, 1, 4, 3]] }).boxes.length).toBeGreaterThan(roofWalkPieces(g).boxes.length);
    const covered = roofWalkPieces(f, { slabCovered: true, walledEdges: ['S', 'E', 'N', 'W'] }).boxes;
    expect(area(covered)).toBe(0);
    expect(covered.filter((b) => b.s[1] > 1)).toHaveLength(0);
  });
  it('Building A roof on level R: the R floor and its parapet walls are already there', () => {
    const d = load() as unknown as CampusFile;
    const r = roof({ type: 'flat', level: 'R', rect: [4, 30, 40, 60], base: 8.4, edge: 'parapet', parapet: 1.1 });
    const c = roofContext(d, r);
    expect(c.slabCovered).toBe(true);
    expect(c.walledEdges.length).toBeGreaterThanOrEqual(3);
    const b = campusToBuild({ ...d, roofs: [roof({ type: 'gable', rect: [10, 10, 16, 14], base: 3 })] });
    expect(b.roofBoxes.length).toBeGreaterThan(10);
  });
});

describe('the editor side', () => {
  it('the steepness flag uses the game limit (facts.json player.maxSlope = playerController maxSlopeCosine)', () => {
    const src = readFileSync('src/player/playerController.ts', 'utf8');
    const m = /maxSlopeCosine = Math\.cos\(\((\d+) \* Math\.PI\) \/ 180\)/.exec(src);
    expect(Number(m?.[1])).toBe(MAX_SLOPE);
    expect(MAX_SLOPE).toBe(facts.player!.maxSlope!.value);
    expect(steepWords(roof({ pitch: 25 })).steep).toBe(false);
    const st = steepWords(roof({ pitch: 55 }));
    expect(st.steep).toBe(true);
    expect(st.words).toBe(`too steep to walk (game limit ${MAX_SLOPE} degrees)`);
    expect(steepWords(roof({ pitch: 50 })).steep).toBe(false);
  });
  it('reads the flat roof numbers from facts.json', () => {
    expect(ROOF_FACTS.parapet).toBe(facts.rules!.parapet!.value);
    expect(ROOF_FACTS.upstand).toBe(facts.roof!.upstand!.value);
    expect(ROOF_FACTS.overhangMax).toBe(facts.roof!.overhangMax!.value);
  });
  it('a roof on the gatehouse: A twice takes its room and walls; the eaves sit on the walls', () => {
    const d = load();
    const fp = footprintAt(d, 'G', 3, 10)!;
    expect(fp.rect).toEqual([0.775, 7.775, 5.725, 11.725]);
    expect(defaultBase(d, 'G', fp.rect)).toBe(3);
    const r = newRoof(d, 'G', fp.rect, 'gable', roofId(d));
    expect(r).toMatchObject({ id: 'RF01', type: 'gable', pitch: 25, base: 3, ridge: 'x', overhang: 0.5, material: 'tile' });
    expect(footprintAt(d, 'R', 10, 40)!.rect).toEqual([4, 30, 40, 60]);
    expect(defaultBase(d, 'R', [4, 30, 40, 60])).toBe(8.4);
    // nothing under it: the top of the level
    expect(defaultBase(d, 'G', [20, 2, 24, 5])).toBe(4.2);
  });
  it('the Type row: gable to hip keeps the pitch and overhang; to flat takes the flat defaults', () => {
    const d = load();
    const g = { ...newRoof(d, 'G', [10, 10, 16, 14], 'gable', 'RF01'), overhang: 0.6 };
    const h = withRoofType(g, 'hip');
    expect(h).toMatchObject({ type: 'hip', pitch: 25, overhang: 0.6 });
    expect('ridge' in h).toBe(false);
    const f = withRoofType(h, 'flat');
    expect(f).toMatchObject({ type: 'flat', edge: 'parapet', parapet: ROOF_FACTS.parapet, overhang: 0 });
    expect('pitch' in f).toBe(false);
  });
  it('the card shows only the type\'s settings; pitch steps 1 degree, lengths 0.1 m', () => {
    const d = load();
    const g = newRoof(d, 'G', [10, 10, 16, 14], 'gable', 'RF01');
    const ids = cardRows('roofs', g).map((r) => r.id);
    expect(ids).toEqual(['type', 'name', 'width', 'depth', 'base', 'pitch', 'ridge', 'overhang', 'fascia', 'material', 'colour', 'gutter', 'downpipes', 'id']);
    expect(cardRows('roofs', withRoofType(g, 'flat')).map((r) => r.id)).toContain('parapet');
    expect(cardRows('roofs', withRoofType(g, 'flat')).map((r) => r.id)).not.toContain('upstand');
    expect((stepCard('roofs', g, 'pitch', 1, { step: 0.1 }) as Roof).pitch).toBe(26);
    expect((stepCard('roofs', g, 'overhang', 1, { step: 0.1 }) as Roof).overhang).toBe(0.6);
    expect((stepCard('roofs', g, 'type', 1, { step: 0.1 }) as Roof).type).toBe('hip');
    expect(stepCard('roofs', { ...g, overhang: 1 }, 'overhang', 1, { step: 0.1 })).toBeNull();
  });
  it('a flat roof\'s top is checked against its roof level', () => {
    const d = load();
    const r = roof({ type: 'flat', level: 'R', rect: [4, 30, 40, 60], base: 8.4 });
    expect(flatLevelCheck(d, r)).toBeNull();
    expect(flatLevelCheck(d, { ...r, base: 8.6 })).toMatch(/0.2 m above the Roof floor/);
    expect(roofWords(d, { ...r, base: 8.6 }).warn).toMatch(/above/);
  });
  it('the Build tab has a Roof tile per type', () => {
    const tiles = menuTiles('Build', { sel: null, clipboard: false, view: { layout: '3d', ghost: true, exploded: false, gap: 4, cut: 0, preset: 'upTo', building: 'all', minimap: false, labels: true, underlay: false } });
    expect(tiles.filter((t) => t.id.startsWith('roof.')).map((t) => t.name)).toEqual(['Roof: Flat', 'Roof: Mono-pitch (skillion)', 'Roof: Gable', 'Roof: Hip', 'Roof: Sawtooth', 'Roof: Curved (barrel)']);
  });
  it('schema: a file with roofs round-trips byte-identical; a file without roofs gains no key', () => {
    const d = load();
    const text = readFileSync(CAMPUS, 'utf8');
    expect(campusText(new EditorModel(d).data)).toBe(text);
    const withRoof = { ...load(), roofs: [newRoof(d, 'G', [10, 10, 16, 14], 'hip', 'RF01')] } as Campus;
    const t1 = campusText(withRoof);
    const m = new EditorModel(JSON.parse(t1) as Campus);
    expect(campusText(m.data)).toBe(t1);
    expect(m.dirty).toBe(0);
  });
});
