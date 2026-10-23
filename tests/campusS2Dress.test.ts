/**
 * (sector-redesign ART-S2, A132-A136) Section 2's dressing on the greybox: the tags (every room of `S2_ROOMS`), the skins
 * of section 2 of the brief (each target once, the turnstile gaps empty, the CR2 planter 0 cm proud on -x), the H2 hero
 * set against its report (triangles, GLB size, hulls) and its placements, `checkDressing` clean, and the S2 draw and
 * triangle budgets. The gameplay gates (nav, cover, ledges, light bake, route legs) are `campusArtGameplay` /
 * `campusArtLight` `-t S2`.
 */
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { buildCampus } from '../src/world/maps/campusOps';
import { sectionCatalogues, sectionContext } from '../src/world/maps/campusDress';
import { CampusDresser } from '../src/world/campusArt/dresser';
import { ART_TAGS } from '../src/world/campusArt/artTags';
import { artCounts, hullObb, type ArtPlacement, type CatReport } from '../src/world/campusArt/catalogue';
import { checkDressing, type DressContext } from '../src/world/campusArt/keepouts';
import { obbAabb, obbOf } from '../src/world/campusArt/geometry';
import { dressS2, HERO_S2, S2_ART_TAGS, S2_DRESS_LOG } from '../src/world/maps/campusS2Dress';
import { S2_ROOMS } from '../src/world/maps/campusS2';
import type { DressReport } from '../src/world/campusArt/dressRules';

const ASSETS = path.resolve(__dirname, '../src/world/campusArt/assets');
const rd = (f: string): CatReport => JSON.parse(readFileSync(f, 'utf8')) as CatReport;
const REPORTS: Record<string, CatReport> = {
  K: rd(path.join(ASSETS, 'campus-kit.json')),
  F: rd(path.resolve(__dirname, '../src/world/props/assets/facility-props.json')),
  H2: rd(path.join(ASSETS, 'hero-s2.json')),
};

let ctx: DressContext;
let d: CampusDresser;
let report: DressReport;
let log: string[];
let ps: ArtPlacement[];
let gb: LevelBuilder;

beforeAll(() => {
  gb = new LevelBuilder();
  const lay = buildCampus(gb, { dress: false });
  ctx = sectionContext(gb, lay, 1, () => []);
  d = new CampusDresser(gb, ctx, sectionCatalogues(1));
  dressS2(d);
  report = d.report;
  log = [...S2_DRESS_LOG];
  ps = d.placements;
}, 120_000);

const count = (piece: string): number => ps.filter((p) => `${p.cat}:${p.prop}` === piece).length;

describe('A132 tags', () => {
  it('every room of S2_ROOMS has one valid tag, and no tag is for a room that does not exist', () => {
    for (const r of S2_ROOMS) expect(ART_TAGS as readonly string[], r.id).toContain(S2_ART_TAGS[r.id]);
    expect(Object.keys(S2_ART_TAGS).sort()).toEqual(S2_ROOMS.map((r) => r.id).sort());
  });

  it('the tags are the brief section 1 table', () => {
    expect(S2_ART_TAGS).toEqual({
      post: 'mailroom', mail: 'mailroom', lift: 'lobby', store: 'store', foyer: 'reception', hall: 'atrium', hallne: 'lobby', plant: 'plant', roof: 'roof',
      l1sw: 'office-open', l1kitchen: 'kitchen', l1north: 'office-open', l1fac: 'office-cell', l1wing: 'office-open', l2sw: 'office-open', l2north: 'office-cell', l2wing: 'office-open',
    });
  });
});

describe('A133 skins', () => {
  it('every skin target of the brief is skinned once, with its piece', () => {
    const of = (piece: string): number[] => ps.filter((p) => `${p.cat}:${p.prop}` === piece && p.skinOf !== undefined).map((p) => p.skinOf!);
    const once = (piece: string, n: number): void => {
      const idx = of(piece);
      expect(idx.length, piece).toBe(n);
    };
    expect(count('H2:receptionCounter')).toBe(2); // the 6 m desk, two 3.0 modules
    expect(new Set(of('H2:receptionCounter')).size).toBe(1);
    expect(count('H2:speedGate')).toBe(18); // 5 + 3 + 3 + 7 modules on the four barrier segments
    expect(new Set(of('H2:speedGate')).size).toBe(4);
    expect(count('H2:cafeCounter')).toBe(2);
    once('K:cafeTable', 3);
    once('H2:mailCage', 3);
    once('H2:switchBoard', 2);
    once('H2:stockShelf', 3);
    once('H2:sortingTable', 1);
    once('H2:liftDoor', 9);
    once('F:officeDesk', 9);
    once('H2:kitchenCounter', 4);
    once('H2:bmsDesk', 1);
    once('K:boardTable', 1);
    once('H2:balconyPlanter', 3);
    // no box is skinned twice by whole-box skins
    const whole = ps.filter((p) => p.skinOf !== undefined && !p.skinPart).map((p) => p.skinOf!);
    expect(new Set(whole).size).toBe(whole.length);
  });

  it('7 of the 9 desks get a chair (the other two are K1 / K6 drops), each 0.7 m from its desk on the user side', () => {
    const chairs = ps.filter((p) => p.prop === 'officeChair');
    expect(chairs.length).toBe(7);
    const desks = ps.filter((p) => p.prop === 'officeDesk');
    for (const c of chairs) {
      const dk = desks.find((q) => Math.abs(q.x - c.x) < 0.3 && Math.abs(q.z - c.z) < 0.8 && q.y === c.y);
      expect(dk, `desk for the chair at ${c.x}, ${c.z}`).toBeDefined();
      // the user sits at +z of a desk with yaw 0: the chair is at +z facing PI, or the desk is turned and the chair is at -z facing 0
      expect(Math.sign(c.z - dk!.z)).toBe(dk!.yaw === 0 ? 1 : -1);
    }
  });

  it('the turnstile gaps stay empty: nothing stands in the three 1.2 gates (z -23.2..-22.8)', () => {
    const cats = sectionCatalogues(1);
    for (const c of [-24, -20, -16]) {
      for (const p of ps) {
        const o = hullObb(cats[p.cat]!, p);
        if (o.y0 > 1.2) continue;
        const a = obbAabb(obbOf([o.cx, (o.y0 + o.y1) / 2, o.cz], [o.hx * 2, o.y1 - o.y0, o.hz * 2], o.yaw));
        const inGate = a[3] > c - 0.6 + 1e-3 && a[0] < c + 0.6 - 1e-3 && a[5] > -23.2 && a[2] < -22.8;
        expect(inGate, `${p.cat}:${p.prop} in the gate at x ${c}`).toBe(false);
      }
    }
  });

  it('the CR2 planter skin is 0 cm proud on its -x face and no higher than the box (the lip headroom is the gameplay gate)', () => {
    const cats = sectionCatalogues(1);
    const rows = ps.filter((p) => p.prop === 'balconyPlanter');
    expect(rows.length).toBe(3);
    for (const p of rows) {
      const o = hullObb(cats.H2!, p);
      const a = obbAabb(obbOf([o.cx, (o.y0 + o.y1) / 2, o.cz], [o.hx * 2, o.y1 - o.y0, o.hz * 2], o.yaw));
      expect(a[0], 'the -x face').toBeGreaterThan(-9.3 - 1e-3);
      expect(a[0]).toBeLessThan(-9.3 + 1e-3);
      expect(a[4]).toBeLessThanOrEqual(4.4 + 0.45 + 1e-3);
      expect(a[2]).toBeGreaterThan(-11 - 1e-3);
      expect(a[5]).toBeLessThan(-5 + 1e-3);
    }
  });

  it('the skinned gate modules carry the atrium circuit and a green lamp (the reception panel cuts them)', () => {
    for (const p of ps.filter((q) => q.prop === 'speedGate')) {
      expect(p.group).toBe(50);
      expect(p.lamp).toEqual([0.1, 1, 0.3]);
    }
  });
});

describe('A134 the H2 hero set', () => {
  const SIZE: Record<string, [number, number, number]> = {
    receptionCounter: [3, 1.1, 0.8], speedGate: [1, 1.1, 0.3], cafeCounter: [3, 1.1, 0.6], mailCage: [2.2, 1.8, 0.9], sortingTable: [3, 0.9, 1], bmsDesk: [3, 0.75, 0.9],
    liftDoor: [1.2, 2.1, 0.14], balconyPlanter: [2, 0.45, 0.6], logoWall: [4, 1.2, 0.05], lowTable: [1.2, 0.4, 0.6],
  };

  it('its pieces are in the report, in budget, under 4 k triangles and a 0.4 MB GLB', () => {
    expect(HERO_S2).not.toBeNull();
    const rep = REPORTS.H2!;
    for (const id of HERO_S2!.ids) {
      expect(rep.pieces[id], id).toBeDefined();
      expect(rep.pieces[id]!.triangles, id).toBeLessThanOrEqual(HERO_S2!.triBudget[id]!);
      for (const m of Object.keys(rep.pieces[id]!.meshes)) expect(HERO_S2!.materials, `${id} ${m}`).toContain(m);
    }
    expect(Object.keys(rep.pieces).sort()).toEqual([...HERO_S2!.ids].sort());
    const total = Object.values(rep.pieces).reduce((s, p) => s + p.triangles, 0);
    expect(total).toBeLessThanOrEqual(4000);
    expect(statSync(path.join(ASSETS, 'hero-s2.glb')).size).toBeLessThanOrEqual(0.4 * 1024 * 1024);
  });

  it('the hulls are the brief sizes within 2 cm (an overhang piece within its listed height)', () => {
    for (const [id, [sx, sy, sz]] of Object.entries(SIZE)) {
      const b = HERO_S2!.bounds![id]!;
      expect(b.hi[0] - b.lo[0], `${id} x`).toBeGreaterThanOrEqual(sx - 0.02);
      expect(b.hi[0] - b.lo[0], `${id} x`).toBeLessThanOrEqual(sx + 0.03);
      const over = HERO_S2!.overhang[id]?.by ?? 0;
      expect(b.hi[1] - b.lo[1], `${id} y`).toBeGreaterThanOrEqual(sy - 0.02);
      expect(b.hi[1] - b.lo[1], `${id} y`).toBeLessThanOrEqual(sy + 0.03 + over);
      expect(b.hi[2] - b.lo[2], `${id} z`).toBeGreaterThanOrEqual(sz - 0.02);
      expect(b.hi[2] - b.lo[2], `${id} z`).toBeLessThanOrEqual(sz + 0.03);
    }
  });

  it('the placements: logo wall, vitrine, seating (table + two seats), each placed or logged', () => {
    expect(count('H2:logoWall')).toBe(1);
    expect(count('F:modelVitrine')).toBe(1);
    expect(count('H2:lowTable')).toBe(1);
    expect(count('F:loungeSeat')).toBe(2);
    // the only things the dresser logs are the known drops: two desks' chairs, the vitrine / seating fallbacks
    const known = /^(chair |modelVitrine|seating group)/;
    for (const l of log) expect(l, l).toMatch(known);
  });

  it('(artnext B3) the green wall is two flush face skins on the atrium (+x) side of the x -30 wall, visual, no box', () => {
    const g = ps.filter((p) => `${p.cat}:${p.prop}` === 'F:greenWall');
    expect(g.length).toBe(2);
    expect(log.filter((l) => l.startsWith('greenWall'))).toEqual([]);
    for (const p of g) {
      expect(p.cls).toBe('skin');
      expect(p.skinFace).toBe('e');
      expect(p.skinOf).toBeDefined();
      expect(ctx.boxes[p.skinOf!]!.c[0]).toBeCloseTo(-30, 6);
      expect(p.x).toBeLessThan(-29.9); // its back sinks into the 0.2 m wall, its front <= ART_PROUD off the face
    }
  });
});

describe('A135-A136 the whole dressing', () => {
  it('passes every keepout, skin rule and rule V (checkDressing), and writes only solid / see boxes', () => {
    expect(d.check()).toEqual([]);
    expect(checkDressing(ctx, sectionCatalogues(1), ps)).toEqual([]);
  });

  it('is within the S2 budgets: <= 40 draws, <= 150 k triangles (numbers written for the build report)', () => {
    const c = artCounts(sectionCatalogues(1), REPORTS, ps, 1);
    expect(c.draws).toBeLessThanOrEqual(40);
    expect(c.tris).toBeLessThanOrEqual(150_000);
    const by: Record<string, number> = {};
    for (const p of ps) by[`${p.cat}:${p.prop}`] = (by[`${p.cat}:${p.prop}`] ?? 0) + 1;
    if (process.env.S2_REPORT) writeFileSync(process.env.S2_REPORT, JSON.stringify({ counts: c, placed: by, dropped: report.dropped, boxes: report.boxes, log }, null, 1));
  });
});
