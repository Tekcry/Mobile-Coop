/**
 * (sector-redesign ART-S3, A137-A141) Section 3's dressing: the tags, the H3 hero set against its build report (budgets,
 * bounds, materials), the skins (chamber, plant, EMC room, racks, benches, board screen, dock desk, gas store, shelving),
 * the CR3 west face (nothing proud of the lip beyond 1 cm), the crane girder's clearances, the hero placements (placed or
 * logged), the section budgets and a clean `checkDressing`. The gates proper (gameplay unchanged, light, section data) are
 * `campusArtGameplay -t S3`, `campusArtLight -t S3` and `campusS3.test.ts`.
 */
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseGlb } from '../src/operators/lab/glb';
import { LevelBuilder } from '../src/world/levelBuilder';
import { buildCampus, campusOps } from '../src/world/maps/campusOps';
import { sectionCatalogues, sectionContext } from '../src/world/maps/campusDress';
import { HERO_S3, S3_ART_TAGS, S3_HERO_LOG } from '../src/world/maps/campusS3Dress';
import { S3_BOX, S3_HIGH_BAYS, S3_ROOMS } from '../src/world/maps/campusS3';
import { artCounts, hullObb, type ArtPlacement, type CatReport } from '../src/world/campusArt/catalogue';
import { ART_TAGS } from '../src/world/campusArt/artTags';
import { obbOf, pointObbDist } from '../src/world/campusArt/geometry';
import { checkDressing } from '../src/world/campusArt/keepouts';
import { CAMPUS_LOOK } from '../src/world/campusArt/campusKit';

const ASSETS = path.resolve(__dirname, '../src/world/campusArt/assets');
const report = JSON.parse(readFileSync(path.join(ASSETS, 'hero-s3.json'), 'utf8')) as CatReport & {
  pieces: Record<string, { triangles: number; meshes: Record<string, number>; bounds: { min: number[]; max: number[] } }>;
  materials: string[];
  triangles: number;
  bytes: number;
};
const H = HERO_S3!;
const PI = Math.PI;

let ps: ArtPlacement[] = [];
let log: string[] = [];
const count = (cat: string, prop: string): number => ps.filter((p) => p.cat === cat && p.prop === prop).length;

beforeAll(() => {
  const b = new LevelBuilder();
  const lay = campusOps.build(b, 0);
  ps = (lay.campusArt?.placements ?? []).filter((p) => p.section === 2);
  log = [...S3_HERO_LOG];
}, 300_000);

describe('A137 tags', () => {
  it('every S3 room has a tag from the table, as the brief says', () => {
    for (const r of S3_ROOMS) expect(ART_TAGS as readonly string[]).toContain(S3_ART_TAGS[r.id]);
    expect(Object.keys(S3_ART_TAGS).sort()).toEqual(S3_ROOMS.map((r) => r.id).sort());
    expect(S3_ART_TAGS).toMatchObject({ 's3-lobby': 'lobby', 's3-c2': 'lobby', 's3-hall': 'lab-hall', 's3-dock': 'dock', 's3-view': 'corridor', 's3-writeup': 'office-cell', 's3-gown': 'lab-gown', 's3-clean': 'lab-clean', 's3-back': 'corridor', 's3-store': 'lab-store', 's3-strip': 'corridor', 's3-sec': 'security', 's3-yard': 'ext-service' });
  });
});

describe('A139 the H3 hero set', () => {
  it('the build report holds every id, only H3 materials, under budget, at most 5 k triangles, GLB at most 0.4 MB', () => {
    expect(Object.keys(report.pieces).sort()).toEqual([...H.ids].sort());
    for (const id of H.ids) {
      expect(report.pieces[id]!.triangles, id).toBeLessThanOrEqual(H.triBudget[id]!);
      for (const m of Object.keys(report.pieces[id]!.meshes)) expect(H.materials, `${id} ${m}`).toContain(m);
    }
    expect(report.triangles).toBeLessThanOrEqual(5000);
    expect(statSync(path.join(ASSETS, 'hero-s3.glb')).size).toBeLessThanOrEqual(0.4 * 1024 * 1024);
    expect([...report.materials].sort()).toEqual([...H.materials].sort());
    for (const m of H.materials) expect(H.looks[m], m).toBeDefined();
  });

  it('the GLB meshes are named <piece>.<material> and match the report', () => {
    const buf = readFileSync(path.join(ASSETS, 'hero-s3.glb'));
    const model = parseGlb(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    const names = model.meshes.map((m) => m.name).sort();
    const want: string[] = [];
    for (const id of H.ids) for (const m of Object.keys(report.pieces[id]!.meshes)) want.push(`${id}.${m}`);
    expect(names).toEqual(want.sort());
  });

  it('the catalogue bounds are the build report bounds, the footprints their plan, the sizes as designed', () => {
    for (const id of H.ids) {
      const r = report.pieces[id]!.bounds;
      expect([...H.bounds![id]!.lo].map((v) => v + 0), id).toEqual(r.min.map((v) => v + 0));
      expect([...H.bounds![id]!.hi].map((v) => v + 0), id).toEqual(r.max.map((v) => v + 0));
      expect([...H.footprint[id]!].map((v) => v + 0), id).toEqual([r.min[0]! + 0, r.min[2]! + 0, r.max[0]! + 0, r.max[2]! + 0]);
      expect(H.classOf![id], id).toBeDefined();
    }
    const size = (id: string): number[] => report.pieces[id]!.bounds.max.map((v, i) => +(v - report.pieces[id]!.bounds.min[i]!).toFixed(3));
    expect(size('chamberWall')).toEqual([8.015, 4.405, 6.015]);
    expect(size('emcPanel')).toEqual([6.015, 4.005, 8.015]);
    expect(size('condensingUnit')).toEqual([2.01, 1.205, 6.01]);
    expect(size('gasBottles')).toEqual([2.41, 1.605, 3.11]);
    expect(size('cleanBench')).toEqual([1.8, 2.2, 0.8]);
    expect(size('passBox')).toEqual([0.6, 0.6, 0.15]);
    expect(size('stickyMat')).toEqual([1.2, 0.005, 0.9]);
    expect(size('hazardPlate')).toEqual([0.4, 0.4, 0.02]);
    // wall pieces: back on the wall at z 0; the girder is a ceiling piece (hull below y 0)
    for (const id of ['passBox', 'hazardPlate']) expect(Math.abs(report.pieces[id]!.bounds.min[2]!)).toBe(0);
    expect(Math.abs(report.pieces.craneGirder!.bounds.max[1]!)).toBe(0);
    expect(H.classOf!.cleanBench).toBe('solid');
    expect(H.collision.cleanBench).toHaveLength(1);
  });

  it('uses only names both look tables agree on', () => {
    for (const m of H.materials) if (CAMPUS_LOOK[m]) expect(H.looks[m]).toEqual(CAMPUS_LOOK[m]);
  });
});

describe('A138 the skins', () => {
  it('chamber, plant, EMC room, racks, benches, log desk, board screen, dock desk, gas store and shelving are skinned', () => {
    expect(count('H3', 'chamberWall')).toBe(1);
    expect(count('H3', 'condensingUnit')).toBe(1);
    expect(count('H3', 'emcPanel')).toBe(1);
    expect(count('F', 'serverRack')).toBe(22);
    expect(count('K', 'labBench')).toBe(2);
    expect(count('H3', 'logDesk')).toBe(1);
    expect(count('H3', 'hoardingPanel')).toBe(9);
    expect(count('F', 'officeDesk')).toBe(1);
    expect(count('H3', 'gasBottles')).toBe(1);
    expect(count('H3', 'stockShelf')).toBe(2);
    for (const p of ps) if (p.cat === 'H3' && p.cls === 'skin') expect(p.skinOf, p.prop).toBeDefined();
  });

  it('the chamber shell: its front (door and port) faces the hall (east), nothing of it proud of the CR3 lip face beyond 1 cm', () => {
    const c = ps.find((p) => p.cat === 'H3' && p.prop === 'chamberWall')!;
    expect(c.yaw).toBeCloseTo(PI / 2, 6);
    const cats = sectionCatalogues(2);
    const o = hullObb(cats.H3!, c);
    const west = o.cx - Math.abs(Math.cos(o.yaw)) * o.hx - Math.abs(Math.sin(o.yaw)) * o.hz;
    expect(30 - west).toBeLessThanOrEqual(0.01 + 1e-9);
    expect(30 - west).toBeGreaterThan(0);
    // the back (-z) of the piece is the west face: flat, the report's skin only
    expect(report.pieces.chamberWall!.bounds.min[2]).toBeCloseTo(-3.0075, 4);
    // no other S3 placement stands against the chamber's west face
    for (const p of ps) {
      if (p === c || p.cls === 'skin') continue;
      const h = hullObb(cats[p.cat]!, p);
      const touches = h.cx - h.hx < 30.3 && h.cx + h.hx > 29.5 && h.cz + h.hz > -22.3 && h.cz - h.hz < -13.7 && h.y0 < 4.4;
      expect(touches, `${p.cat}:${p.prop} at ${p.x},${p.z}`).toBe(false);
    }
  });
});

describe('A139 the hero placements', () => {
  it('the crane girder is parked over the bay, clear of the walkway (6.0 + 1.9) and every high-bay lamp by 0.5', () => {
    const g = ps.find((p) => p.cat === 'H3' && p.prop === 'craneGirder');
    expect(g, log.join('\n')).toBeDefined();
    const o = hullObb(sectionCatalogues(2).H3!, g!);
    expect(o.y0).toBeGreaterThanOrEqual(S3_BOX.walkwayTop + 1.9 - 1e-6);
    expect(o.y1).toBeLessThanOrEqual(9.0 + 1e-6);
    const obb = obbOf([o.cx, (o.y0 + o.y1) / 2, o.cz], [o.hx * 2, o.y1 - o.y0, o.hz * 2], o.yaw);
    for (const [x, z] of S3_HIGH_BAYS) expect(pointObbDist(obb, x, 8.5, z), `lamp ${x},${z}`).toBeGreaterThanOrEqual(0.5);
    // it spans the hall north-south (z), inside the walls
    const ex = Math.abs(Math.cos(o.yaw)) * o.hx + Math.abs(Math.sin(o.yaw)) * o.hz;
    const ez = Math.abs(Math.sin(o.yaw)) * o.hx + Math.abs(Math.cos(o.yaw)) * o.hz;
    expect(ez).toBeGreaterThan(ex * 10);
    expect(o.cz - ez).toBeGreaterThan(-29.85);
    expect(o.cz + ez).toBeLessThan(-8.15);
  });

  it('the clean bench, pass-through, mats and plates are placed; what could not be placed is logged with its rule, never silent', () => {
    expect(count('H3', 'cleanBench')).toBe(1);
    expect(count('H3', 'passBox')).toBe(1);
    expect(count('H3', 'stickyMat')).toBe(2);
    expect(count('H3', 'hazardPlate')).toBe(4);
    const dropped = log.filter((l) => l.includes('dropped'));
    const placed = log.filter((l) => l.includes(': placed'));
    expect(placed.length + dropped.length).toBeGreaterThanOrEqual(10);
    for (const l of dropped) expect(l).toMatch(/\b(K\d+|C|W|V|S):/);
    expect(log.some((l) => l.startsWith('dock desk'))).toBe(true);
  });

  it('(artnext B4) the gown lockers: tried as face skins on the partition faces, refused by rule S (0.5 deep on a 0.3 wall), then dropped by the floor rules; the bench stays dropped', () => {
    expect(count('F', 'kitCaseWall')).toBe(0);
    expect(count('F', 'holdingBench')).toBe(0);
    const face = log.filter((l) => l.startsWith('kitCaseWall face skin'));
    expect(face).toHaveLength(3);
    for (const l of face) expect(l).toMatch(/dropped, S: .*back passes through the box/);
    for (const z of [-0.8, -2, -3.2, -4.4]) expect(log.some((l) => l.startsWith(`kitCaseWall z ${z}: dropped`) && /\b(K\d+):/.test(l)), `z ${z}`).toBe(true);
    expect(log.some((l) => l.startsWith('holdingBench: dropped') && /\bK[25]:/.test(l))).toBe(true);
  });

  it('no wall piece is mounted on a glazed wall (the clean room / write-up glass line z -6, the viewing corridor z -8, the landing x 22)', () => {
    for (const p of ps) {
      if (p.cat !== 'H3' || !['passBox', 'hazardPlate'].includes(p.prop)) continue;
      expect(Math.abs(p.z + 6), `${p.prop} at ${p.x},${p.z}`).toBeGreaterThan(0.5);
      expect(Math.abs(p.z + 8), `${p.prop} at ${p.x},${p.z}`).toBeGreaterThan(0.5);
      expect(Math.abs(p.x - 22), `${p.prop} at ${p.x},${p.z}`).toBeGreaterThan(0.5);
    }
  });
});

describe('A140 / A141 the dressing as a whole', () => {
  it('passes every keepout, skin rule and rule V (checkDressing)', () => {
    const b = new LevelBuilder();
    const lay = buildCampus(b, { dress: false });
    const ctx = sectionContext(b, lay, 2, () => []);
    expect(checkDressing(ctx, sectionCatalogues(2), ps)).toEqual([]);
  }, 300_000);

  it('section budgets: at most 40 draws, 150 k triangles, 2500 placements (the numbers go in the report)', () => {
    const reports: Record<string, CatReport> = {
      K: JSON.parse(readFileSync(path.join(ASSETS, 'campus-kit.json'), 'utf8')) as CatReport,
      F: JSON.parse(readFileSync(path.resolve(__dirname, '../src/world/props/assets/facility-props.json'), 'utf8')) as CatReport,
      H3: report,
    };
    const c = artCounts(sectionCatalogues(2), reports, ps, 2);
    if (process.env.S3_DRESS_DUMP) {
      const by: Record<string, number> = {};
      for (const p of ps) by[`${p.cat}:${p.prop}`] = (by[`${p.cat}:${p.prop}`] ?? 0) + 1;
      writeFileSync(process.env.S3_DRESS_DUMP, `${JSON.stringify(c)}\n${JSON.stringify(by)}\n${log.join('\n')}\n`);
    }
    expect(c.draws).toBeLessThanOrEqual(40);
    expect(c.tris).toBeLessThanOrEqual(150_000);
    expect(c.placements).toBeLessThanOrEqual(2500);
  });
});
