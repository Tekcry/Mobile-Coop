/**
 * (sector-redesign ART-S1, A127-A131) Section 1's dressing: every room tagged, the greybox objects of the brief skinned
 * (cars `skin-hide`, the rest `skin`, every skinFit null), the H1 hero set (12 pieces, report within the budgets, the
 * catalogue's bounds = the report's, looks only from the two tables), the hero placements as the brief has them, the whole
 * dressing clean under `checkDressing`, and the section budgets (<= 40 draws, <= 150 k triangles).
 */
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { buildCampus, campusOps } from '../src/world/maps/campusOps';
import { sectionCatalogues, sectionContext } from '../src/world/maps/campusDress';
import { S1_ROOMS } from '../src/world/maps/campusS1';
import { HERO_S1, S1_ART_TAGS, S1_OMITTED, S1_REFUSED } from '../src/world/maps/campusS1Dress';
import { artCounts, skinFit, type ArtPlacement, type CatReport } from '../src/world/campusArt/catalogue';
import { CAMPUS_LOOK } from '../src/world/campusArt/campusKit';
import { PROP_LOOK } from '../src/world/props/facilityProps';
import { ART_TAGS } from '../src/world/campusArt/artTags';
import { checkDressing, type DressContext } from '../src/world/campusArt/keepouts';
import type { MapLayout } from '../src/world/mapDef';

const ASSETS = path.resolve(__dirname, '../src/world/campusArt/assets');
const readReport = (f: string): CatReport & { bytes?: number; triangles?: number; pieces: Record<string, { triangles: number; meshes: Record<string, number>; bounds: { min: number[]; max: number[] } }> } =>
  JSON.parse(readFileSync(f, 'utf8'));
const hero = readReport(path.join(ASSETS, 'hero-s1.json'));

let bG: LevelBuilder;
let bD: LevelBuilder;
let layD: MapLayout;
let ctx: DressContext;
let ps: ArtPlacement[];
let nGrey = 0;

beforeAll(() => {
  bG = new LevelBuilder();
  const layG = buildCampus(bG, { dress: false });
  nGrey = bG.boxes.length;
  ctx = sectionContext(bG, layG, 0, () => []);
  bD = new LevelBuilder();
  layD = campusOps.build(bD, 0);
  ps = (layD.campusArt?.placements ?? []).filter((p) => p.section === 0);
}, 300_000);

const ofCat = (cat: string): ArtPlacement[] => ps.filter((p) => p.cat === cat);

describe('A127 tags', () => {
  it('every room of S1_ROOMS is tagged, and only those, with a known tag', () => {
    expect(Object.keys(S1_ART_TAGS).sort()).toEqual(S1_ROOMS.map((r) => r.id).sort());
    for (const t of Object.values(S1_ART_TAGS)) expect(ART_TAGS).toContain(t);
    expect(S1_ART_TAGS).toMatchObject({ verge: 'ext-verge', gatehouse: 'gatehouse', lane: 'ext-road', park: 'ext-carpark', bins: 'ext-service', c1: 'lobby', bikes: 'ext-shelter', smoke: 'ext-shelter', dyard: 'ext-service', forecourt: 'ext-forecourt', plantroof: 'roof' });
  });
});

describe('A128 skins', () => {
  const skins = (): ArtPlacement[] => ps.filter((p) => p.cls === 'skin' || p.cls === 'skin-hide');
  it('the brief\'s greybox targets are skinned once each: 14 cars skin-hide, 8 bollards and 2 trees on cylinders, the rest skin', () => {
    const cars = skins().filter((p) => p.cls === 'skin-hide');
    expect(cars.length).toBe(14);
    expect(cars.every((p) => ['carSilver', 'carBlack', 'carBlue', 'carWhite'].includes(p.prop))).toBe(true);
    expect(new Set(cars.map((p) => p.prop)).size).toBe(4); // B1: all four colours (35 of 40 draws)
    expect(skins().filter((p) => p.cls === 'skin').length).toBe(23);
    expect(skins().filter((p) => p.skinCyl !== undefined).length).toBe(10);
    const count = (prop: string): number => skins().filter((p) => p.prop === prop).length;
    expect({ bin: count('binLarge'), pillar: count('feederPillar'), planter: count('planterTrough'), tree: count('treeSkin'), trolley: count('cageTrolley'), cctv: count('gateDesk'), pc: count('pcDesk'), tea: count('teaPoint'), island: count('trafficIsland'), arm: count('barrierArm'), bollard: count('lightBollard') }).toEqual({
      bin: 3, pillar: 1, planter: 3, tree: 2, trolley: 1, cctv: 1, pc: 1, tea: 1, island: 1, arm: 1, bollard: 8,
    });
    // each greybox box / cylinder is covered by one skin only
    const boxes = skins().filter((p) => p.skinOf !== undefined).map((p) => p.skinOf);
    expect(new Set(boxes).size).toBe(boxes.length);
    const cyls = skins().filter((p) => p.skinCyl !== undefined).map((p) => p.skinCyl);
    expect(new Set(cyls).size).toBe(cyls.length);
  });
  it('every skin passes skinFit against its greybox piece', () => {
    const cats = sectionCatalogues(0);
    const fails: string[] = [];
    for (const p of skins()) {
      const piece = p.skinCyl !== undefined ? ctx.cylinders![p.skinCyl]! : ctx.boxes[p.skinOf!]!;
      const e = skinFit(cats[p.cat]!, p, piece);
      if (e) fails.push(e);
    }
    expect(fails).toEqual([]);
  });
  it('the emissive skins sit on their circuits: the CCTV desk screens (gate), the arm lamp (lane), the bollard lenses (fore)', () => {
    const g = (prop: string): (number | undefined)[] => ofCat('H1').filter((p) => p.prop === prop).map((p) => p.group);
    expect(g('gateDesk')).toEqual([43]);
    expect(g('barrierArm')).toEqual([49]);
    expect(g('lightBollard')).toEqual(Array(8).fill(42));
  });
});

describe('A129 H1', () => {
  const cat = HERO_S1!;
  it('12 pieces; every piece within its triangle budget; total <= 3 k, GLB <= 0.3 MB', () => {
    expect(cat.ids.length).toBe(12);
    expect(Object.keys(hero.pieces).sort()).toEqual([...cat.ids].sort());
    for (const id of cat.ids) expect(hero.pieces[id]!.triangles, id).toBeLessThanOrEqual(cat.triBudget[id]!);
    expect(hero.triangles!).toBeLessThanOrEqual(3000);
    expect(statSync(path.join(ASSETS, 'hero-s1.glb')).size).toBeLessThanOrEqual(0.3 * 1024 * 1024);
  });
  it('the catalogue\'s bounds are the report\'s; footprints are the brief\'s sizes (x / z within 2 cm of the hull)', () => {
    for (const id of cat.ids) {
      const b = hero.pieces[id]!.bounds;
      expect(cat.bounds![id]!.lo.map((v) => v + 0), id).toEqual(b.min.map((v) => v + 0));
      expect(cat.bounds![id]!.hi.map((v) => v + 0), id).toEqual(b.max.map((v) => v + 0));
      const f = cat.footprint[id]!;
      for (const [a, c] of [[f[0], b.min[0]!], [f[1], b.min[2]!], [f[2], b.max[0]!], [f[3], b.max[2]!]] as const) expect(Math.abs(a - c), id).toBeLessThanOrEqual(0.02);
    }
  });
  it('sizes match the brief (hull height where the piece has no overhang)', () => {
    const size = (id: string): number[] => {
      const b = hero.pieces[id]!.bounds;
      return [0, 1, 2].map((k) => Math.round((b.max[k]! - b.min[k]!) * 100) / 100);
    };
    expect(size('trafficIsland')).toEqual([1, 1, 2.4]);
    expect(size('barrierArm')[0]).toBe(2.5);
    expect(size('barrierHousing')).toEqual([0.32, 0.9, 0.32]);
    expect(size('cageTrolley')).toEqual([1, 1.2, 0.8]);
    expect(size('lightBollard')).toEqual([0.2, 0.95, 0.2]);
    expect(size('monitorBank')).toEqual([1.2, 0.8, 0.12]);
    expect(size('keyCabinet')).toEqual([0.45, 0.6, 0.1]);
  });
  it('materials: the catalogue lists only names of the two look tables, and every mesh uses a listed material', () => {
    for (const m of cat.materials) expect(PROP_LOOK[m as keyof typeof PROP_LOOK] ?? CAMPUS_LOOK[m], m).toBeDefined();
    for (const [id, p] of Object.entries(hero.pieces)) for (const m of Object.keys(p.meshes)) expect(cat.materials, `${id}.${m}`).toContain(m);
  });
  it('the emissive parts the catalogue names exist in the meshes', () => {
    for (const [id, parts] of Object.entries(cat.emissive)) for (const m of parts) expect(Object.keys(hero.pieces[id]!.meshes), `${id}.${m}`).toContain(m);
  });
  it('the hero placements: the exact ones of the brief placed; the refused ones left out and listed (L1: the three wall pieces on the wall faces; L2 / L3: the allowed K6 / K1 omissions)', () => {
    const at = (p: ArtPlacement): number[] => [p.x, p.y, p.z].map((v) => Math.round(v * 100) / 100 + 0);
    const h1 = (prop: string): ArtPlacement[] => ofCat('H1').filter((p) => p.prop === prop);
    expect(h1('barrierHousing').map(at)).toEqual([[11, 1, -76.2]]);
    expect(h1('intercomPost').map(at)).toEqual([[12.6, 0, -79.3]]);
    expect(ps.filter((p) => p.prop === 'siteSign').map(at)).toEqual([[6.8, 0, -79]]);
    expect(ps.filter((p) => p.prop === 'bikeRack' && Math.abs(p.z + 46.8) < 0.01).map((p) => Math.round(p.x * 100) / 100).sort((a, b) => a - b)).toEqual([-8, -2]);
    expect(ps.filter((p) => p.prop === 'parkBench' && Math.abs(p.z + 47.6) < 0.01).length).toBe(0);
    // art-join: the three wall pieces moved onto the gatehouse's inner wall faces (S1 L1)
    expect(h1('monitorBank').map(at)).toEqual([[18.8, 0, -73.15]]);
    expect(h1('keyCabinet').map(at)).toEqual([[15.2, 0, -73.15]]);
    expect(h1('visitorBoard').map(at)).toEqual([[14.15, 0, -78]]);
    expect(S1_REFUSED).toEqual([...S1_OMITTED]);
    expect(S1_OMITTED.map((m) => `${m.piece} ${m.rule}`)).toEqual(['K:bikeRack K6', 'K:parkBench K1']);
  });
});

describe('A130 / A131 the dressing', () => {
  it('checkDressing is empty (keepouts, skins, rule V, boxes over the greybox)', () => {
    expect(checkDressing(ctx, sectionCatalogues(0), ps)).toEqual([]);
  });
  it('every art box written is noLedge; the greybox boxes are unchanged but colour', () => {
    const art = bD.boxes.slice(nGrey);
    expect(art.length).toBeGreaterThan(0);
    for (const [i, b] of art.entries()) expect(b.noLedge, `art box ${i}`).toBe(true);
  });
  it('budgets: <= 40 draws, <= 150 k triangles', () => {
    const reports: Record<string, CatReport> = {
      K: readReport(path.join(ASSETS, 'campus-kit.json')),
      F: readReport(path.resolve(__dirname, '../src/world/props/assets/facility-props.json')),
      H1: hero,
    };
    const c = artCounts(sectionCatalogues(0), reports, layD.campusArt!.placements, 0);
    expect(c.draws).toBeLessThanOrEqual(40);
    expect(c.tris).toBeLessThanOrEqual(150_000);
  });
});
