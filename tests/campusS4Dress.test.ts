/**
 * (sector-redesign ART-S4) Section 4 dressing: the hero set H4 against its build report, the tags, the skins of the greybox
 * (pods, baskets, CRAC, batteries, UPS, chillers, generator, tank, crates, cage), the hero placements (landed or logged as
 * omitted), the whole section passing `checkDressing`, and its budgets (<= 40 draws). The gameplay gates are
 * `tests/campusArtGameplay.test.ts -t S4` and `tests/campusArtLight.test.ts -t S4`.
 */
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { campusOps } from '../src/world/maps/campusOps';
import { sectionCatalogues } from '../src/world/maps/campusDress';
import { S4_BOX, S4_GROUPS, S4_PODS, S4_ROOMS } from '../src/world/maps/campusS4';
import { HERO_S4, S4_ART_TAGS, S4_HERO_LOG } from '../src/world/maps/campusS4Dress';
import { ART_TAGS } from '../src/world/campusArt/artTags';
import { artCounts, type ArtPlacement, type CatReport } from '../src/world/campusArt/catalogue';
import { checkDressing } from '../src/world/campusArt/keepouts';
import { sectionContext } from '../src/world/maps/campusDress';
import { buildCampus } from '../src/world/maps/campusOps';

const SECTION = 3;
const assets = path.resolve(__dirname, '../src/world/campusArt/assets');
const heroRep = JSON.parse(readFileSync(path.join(assets, 'hero-s4.json'), 'utf8')) as CatReport & { triangles: number; pieces: Record<string, { triangles: number; meshes: Record<string, number>; bounds: { min: number[]; max: number[] } }> };

let ps: ArtPlacement[] = [];
let bad: string[] = [];
let counts = { draws: 0, tris: 0, placements: 0 };
let log: string[] = [];

beforeAll(() => {
  const b = new LevelBuilder();
  const lay = campusOps.build(b, 0);
  ps = (lay.campusArt?.placements ?? []).filter((p) => p.section === SECTION);
  log = [...S4_HERO_LOG];
  // the greybox the section was dressed over: the first boxes (the dressing's own come after)
  const g = new LevelBuilder();
  const gl = buildCampus(g, { dress: false });
  bad = checkDressing(sectionContext(g, gl, SECTION, () => []), sectionCatalogues(SECTION), ps);
  const reports: Record<string, CatReport> = {
    K: JSON.parse(readFileSync(path.join(assets, 'campus-kit.json'), 'utf8')) as CatReport,
    F: JSON.parse(readFileSync(path.resolve(__dirname, '../src/world/props/assets/facility-props.json'), 'utf8')) as CatReport,
    H4: heroRep,
  };
  counts = artCounts(sectionCatalogues(SECTION), reports, ps, SECTION);
  if (process.env.CAMPUS_S4_PRINT) {
    console.info(log.join('\n'));
    console.info(JSON.stringify(counts));
    const byPiece: Record<string, number> = {};
    for (const p of ps) byPiece[`${p.cat}:${p.prop}/${p.cls}`] = (byPiece[`${p.cat}:${p.prop}/${p.cls}`] ?? 0) + 1;
    console.info(JSON.stringify(byPiece, null, 1));
  }
}, 600_000);

const count = (cat: string, prop: string): number => ps.filter((p) => p.cat === cat && p.prop === prop).length;

describe('H4 (the data hall hero set)', () => {
  it('the catalogue matches its build report: ids, bounds, budgets, materials, size', () => {
    const h = HERO_S4!;
    expect(h.id).toBe('H4');
    expect(Object.keys(heroRep.pieces).sort()).toEqual([...h.ids].sort());
    for (const id of h.ids) {
      const r = heroRep.pieces[id]!;
      expect(r.triangles, `${id} tris`).toBeLessThanOrEqual(h.triBudget[id]!);
      const b = h.bounds![id]!;
      for (let k = 0; k < 3; k++) {
        expect(Math.abs(b.lo[k]! - r.bounds.min[k]!), `${id} lo ${k}`).toBeLessThan(0.01);
        expect(Math.abs(b.hi[k]! - r.bounds.max[k]!), `${id} hi ${k}`).toBeLessThan(0.01);
      }
      for (const m of Object.keys(r.meshes)) {
        expect(h.materials, `${id} material ${m}`).toContain(m);
        expect(h.looks[m], `${id} look ${m}`).toBeDefined();
      }
      expect(h.classOf![id], id).toBeDefined();
      expect(h.pitch[id], id).toBeGreaterThan(0);
    }
    // A144: <= 5 k triangles, GLB <= 0.5 MB
    expect(heroRep.triangles).toBeLessThanOrEqual(5000);
    expect(statSync(path.join(assets, 'hero-s4.glb')).size).toBeLessThanOrEqual(512 * 1024);
  });
});

describe('S4 tags (A142)', () => {
  it('every room of the section is tagged with a known tag, by the brief', () => {
    for (const r of S4_ROOMS) expect(ART_TAGS as readonly string[], r.id).toContain(S4_ART_TAGS[r.id]);
    expect(S4_ART_TAGS['s4-hall']).toBe('data-hall');
    expect(S4_ART_TAGS['s4-noc']).toBe('noc');
    expect(S4_ART_TAGS['s4-yard']).toBe('ext-compound');
    expect(S4_ART_TAGS['s4-deck']).toBe('roof-plant');
  });
});

describe('S4 skins (A143)', () => {
  it('the pods: 10 rack rows of 13, 10 panel rows, 5 roofs', () => {
    expect(S4_PODS).toHaveLength(5);
    const racks = ps.filter((p) => p.cat === 'F' && p.prop === 'serverRack' && p.skinOf !== undefined);
    // 10 pod rows of 13 modules + the spare rack row (5 m of 0.6)
    expect(racks.length).toBe(10 * 13 + Math.round((S4_BOX.spareRack[2] - S4_BOX.spareRack[0]) / 0.6));
    expect(count('H4', 'containPanel')).toBe(10 * 7);
    expect(count('H4', 'podRoof')).toBe(5 * 7);
  });
  it('the baskets, CRAC, batteries, UPS, chillers, generator, tank, crates and cage faces are skinned', () => {
    expect(count('H4', 'basketRun')).toBeGreaterThan(60);
    expect(count('H4', 'cracUnit')).toBe(4);
    // (artnext B5) the battery strings are the kit's `batteryRack` now (1.0 deep: its own fit range 0.8-1.3)
    expect(count('K', 'batteryRack')).toBe(7);
    expect(count('H4', 'batteryString')).toBe(0);
    expect(count('H4', 'upsCabinet')).toBe(18);
    expect(count('H4', 'chiller')).toBe(4);
    expect(count('H4', 'genset')).toBe(1);
    expect(count('H4', 'fuelTank')).toBe(1);
    expect(count('H4', 'crateStack')).toBe(2);
    expect(count('H4', 'cagePanel')).toBeGreaterThan(6);
  });
  it('no skin writes a box (the greybox keeps the gameplay)', () => {
    for (const p of ps) if (p.cat === 'H4' && p.prop !== 'suppressionBank') expect(p.cls, p.prop).toBe('skin');
  });
  it('the CR4 box takes exact-width modules: nothing proud on its east / west faces', () => {
    const [x0, z0, x1, z1] = S4_BOX.cr4;
    const mods = ps.filter((p) => p.cat === 'H4' && p.prop === 'basketRun' && p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1);
    expect(mods.length).toBe(3);
    for (const m of mods) expect(m.s?.[2] ?? 1, 'width scale').toBe(1);
  });
  it('the cage faces: two 6 m side walls of 4 modules, two front / rear walls of 2 strips (the door strips over the gates stay greybox)', () => {
    // the door strips over the gates (0.9 high) stay greybox
    expect(count('H4', 'cagePanel')).toBe(2 * 4 + 2 * 2 * 2);
  });
});

describe('S4 heroes (A144)', () => {
  it('every hero landed, or is logged as omitted with its reason', () => {
    for (const label of ['NOC video wall', 'NOC desk 1', 'NOC desk 2', 'security room desk', 'suppression bank 1', 'suppression bank 2']) {
      expect(log.some((l) => l.startsWith(label)), label).toBe(true);
    }
  });
  it('the NOC video wall, the NOC desks and the security room desk are placed', () => {
    expect(count('F', 'monitorWall')).toBe(1);
    expect(count('F', 'securityDesk')).toBe(3);
  });
  it('the suppression banks are placed', () => {
    expect(count('H4', 'suppressionBank')).toBe(2);
  });
  it('a PDU on every pod end (10) and the raised-floor tiles (few: the aisles are 2 m, kit gap L3)', () => {
    expect(count('K', 'pduStrip')).toBeGreaterThanOrEqual(S4_PODS.length * 2);
    // (artnext B5 / A6) a floor tile is a decal: exempt from the keepouts and the greybox overlap, so the grid covers the hall (72 tiles)
    expect(count('K', 'floorTileGrid')).toBeGreaterThanOrEqual(60);
  });
  it('(artnext B7) the emissive skins carry their circuit from skinRow itself; the genset stack is a listed overhang part (B9)', () => {
    for (const p of ps.filter((q) => q.cat === 'H4' && q.prop === 'cracUnit')) expect(p.group, 'crac').toBe(S4_GROUPS.cold1);
    for (const p of ps.filter((q) => q.cat === 'H4' && q.prop === 'upsCabinet')) expect(p.group, 'ups').toBe(S4_GROUPS.ups);
    expect(HERO_S4!.overhang.genset!.parts?.length).toBeGreaterThanOrEqual(1);
    // the stack part ends at the hull top (3.6) and stands on the container roof (2.6)
    const stack = HERO_S4!.overhang.genset!.parts![0]!;
    expect([stack.a[1], stack.b[1]]).toEqual([2.6, heroRep.pieces.genset!.bounds.max[1]]);
  });
});

describe('S4 gates and budgets (A145, A146)', () => {
  it('the whole dressing passes every keepout, skin rule and rule V (checkDressing)', () => {
    expect(bad).toEqual([]);
  });
  it('the section stays inside its budgets: <= 40 draws, <= 150 k triangles, <= 2500 placements', () => {
    expect(counts.draws).toBeLessThanOrEqual(40);
    expect(counts.tris).toBeLessThanOrEqual(150_000);
    expect(counts.placements).toBeLessThanOrEqual(2500);
  });
});
