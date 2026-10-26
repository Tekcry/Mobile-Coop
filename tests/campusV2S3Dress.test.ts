/**
 * (campus-greybox S3 R7) Section 3's dressing re-run on the v2 lab block, flag on (`flags.campusV2 = [3]`; brief
 * `docs/campus-greybox/briefs/S3.md` section 4 "R7"), the pattern of `tests/campusS3Dress.test.ts`: the tags of the v2
 * rooms, the skins on the v2 boxes, the CR3 west face flat and the hoist hatch's west edge (CR3b) bare, the crane girder's
 * clearances, the hero placements placed or logged with their rule, no wall piece on glass, a clean `checkDressing` (the
 * dress rules' keepouts, skin rules and rule V for section 2 with the flag on), the section budgets, and one `dress: true`
 * build that does not throw. The H3 set itself (report, GLB, bounds) is unchanged and stays `campusS3Dress.test.ts`'s.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { LevelBuilder as LB } from '../src/world/levelBuilder';
import { artCounts, hullObb, type ArtPlacement, type CatReport } from '../src/world/campusArt/catalogue';
import { ART_TAGS } from '../src/world/campusArt/artTags';
import { obbOf, pointObbDist } from '../src/world/campusArt/geometry';
import { checkDressing } from '../src/world/campusArt/keepouts';
import { hyp2 } from '../src/core/mathx';

const ASSETS = path.resolve(__dirname, '../src/world/campusArt/assets');
const PI = Math.PI;

/** Loads the campus modules fresh with `flags.campusV2 = [3]` (the selection is made at load, as on a page). */
async function loadV2S3() {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = [3];
  const ops = await import('../src/world/maps/campusOps');
  const dress = await import('../src/world/maps/campusDress');
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  const s3 = await import('../src/world/maps/campusV2/s3');
  const s3Dress = await import('../src/world/maps/campusV2/s3Dress');
  return { ops, dress, LevelBuilder, s3, s3Dress };
}

const m = await loadV2S3();
const { S3_BOX, S3_HIGH_BAYS, S3_L1, S3_ROOMS } = m.s3;
const { S3_ART_TAGS, S3_HERO_LOG } = m.s3Dress;

let ps: ArtPlacement[] = [];
let log: string[] = [];
let bDressed: LB;
const count = (cat: string, prop: string): number => ps.filter((p) => p.cat === cat && p.prop === prop).length;

beforeAll(() => {
  bDressed = new m.LevelBuilder();
  const lay = m.ops.campusOps.build(bDressed, 0);
  ps = (lay.campusArt?.placements ?? []).filter((p) => p.section === 2);
  log = [...S3_HERO_LOG];
}, 300_000);

describe('R7 tags', () => {
  it('every v2 S3 room has a tag (the old rooms gone, the new ones the nearest existing tag)', () => {
    for (const r of S3_ROOMS) expect(ART_TAGS as readonly string[], r.id).toContain(S3_ART_TAGS[r.id]);
    expect(Object.keys(S3_ART_TAGS).sort()).toEqual(S3_ROOMS.map((r) => r.id).sort());
    for (const gone of ['s3-lobby', 's3-back', 's3-strip', 's3-yard']) expect(S3_ART_TAGS[gone], gone).toBeUndefined();
    expect(S3_ART_TAGS).toMatchObject({
      's3-c2': 'lobby', 's3-hall': 'lab-hall', 's3-hall-aisle': 'lab-hall', 's3-dock': 'dock', 's3-view': 'corridor', 's3-east': 'corridor',
      's3-writeup': 'office-cell', 's3-gown': 'lab-gown', 's3-clean': 'lab-clean', 's3-store': 'lab-store', 's3-sec': 'security',
      's3-control': 'noc', 's3-hoist': 'store', 's3-plant': 'plant', 's3-wstair': 'corridor', 's3-nstair': 'corridor', 's3-estair': 'corridor',
    });
  });
});

describe('R7 the skins on the v2 boxes', () => {
  it('chamber, plant, EMC room, racks, benches, log desk, board screen, dock desk, gas store and shelving are skinned', () => {
    expect(count('H3', 'chamberWall')).toBe(1);
    expect(count('H3', 'condensingUnit')).toBe(1);
    expect(count('H3', 'emcPanel')).toBe(1);
    expect(count('F', 'serverRack')).toBe(19);
    expect(count('K', 'labBench')).toBe(2);
    expect(count('H3', 'logDesk')).toBe(1);
    expect(count('H3', 'hoardingPanel')).toBe(6);
    // the v2 dock desk is 2.0 long: the office and reception desks are past their fit, the security desk would block cam-dock
    // (K8): the desk stays greybox, logged (R7 finding)
    expect(count('F', 'officeDesk') + count('F', 'receptionDesk') + count('F', 'securityDesk')).toBe(0);
    expect(log.some((l) => l.startsWith('dock desk: bare greybox'))).toBe(true);
    expect(count('H3', 'gasBottles')).toBe(1);
    expect(count('H3', 'stockShelf')).toBe(4);
    for (const p of ps) if (p.cat === 'H3' && p.cls === 'skin') expect(p.skinOf, p.prop).toBeDefined();
    // the skins sit on the v2 boxes: the gas bottles in the NW cage, the shelving on the x 53 partition, the desk over the dock desk
    const at = (prop: string): ArtPlacement => ps.find((p) => p.prop === prop)!;
    const [gx0, gz0, gx1, gz1] = S3_BOX.gasCage;
    expect(at('gasBottles').x > gx0 && at('gasBottles').x < gx1 && at('gasBottles').z > gz0 && at('gasBottles').z < gz1).toBe(true);
    for (const p of ps.filter((q) => q.prop === 'stockShelf')) expect(Math.abs(p.x - 53), `shelf at ${p.x}`).toBeLessThan(0.3);
  });

  it('the chamber shell: its front faces the hall (east), nothing of it proud of the CR3 lip face beyond 1 cm, nothing else against that face', () => {
    const c = ps.find((p) => p.cat === 'H3' && p.prop === 'chamberWall')!;
    expect(c.yaw).toBeCloseTo(PI / 2, 6);
    const cats = m.dress.sectionCatalogues(2);
    const o = hullObb(cats.H3!, c);
    const west = o.cx - Math.abs(Math.cos(o.yaw)) * o.hx - Math.abs(Math.sin(o.yaw)) * o.hz;
    expect(30 - west).toBeLessThanOrEqual(0.01 + 1e-9);
    expect(30 - west).toBeGreaterThan(0);
    for (const p of ps) {
      if (p === c || p.cls === 'skin') continue;
      const h = hullObb(cats[p.cat]!, p);
      const touches = h.cx - h.hx < 30.3 && h.cx + h.hx > 29.5 && h.cz + h.hz > -22.3 && h.cz - h.hz < -13.7 && h.y0 < 4.4;
      expect(touches, `${p.cat}:${p.prop} at ${p.x},${p.z}`).toBe(false);
    }
  });

  it('the hoist hatch\'s west edge (the CR3b lip, x 18, z -6..-3 at 4.5) stays bare: no placement within 0.3 m of it up to 2 m over the slab', () => {
    const cats = m.dress.sectionCatalogues(2);
    for (const p of ps) {
      const h = hullObb(cats[p.cat]!, p);
      const ex = Math.abs(Math.cos(h.yaw)) * h.hx + Math.abs(Math.sin(h.yaw)) * h.hz;
      const ez = Math.abs(Math.sin(h.yaw)) * h.hx + Math.abs(Math.cos(h.yaw)) * h.hz;
      const near = h.cx - ex < 18.3 && h.cx + ex > 17.7 && h.cz + ez > -6 && h.cz - ez < -3 && h.y1 > S3_L1 - 0.1 && h.y0 < S3_L1 + 2;
      expect(near, `${p.cat}:${p.prop} at ${p.x},${p.z}`).toBe(false);
    }
  });
});

describe('R7 the hero placements', () => {
  it('the crane girder is parked over the hall, clear of the walkway (6.0 + 1.9) and every high-bay lamp by 0.5, spanning east-west inside the walls (the 19 m hall is shorter than it)', () => {
    const g = ps.find((p) => p.cat === 'H3' && p.prop === 'craneGirder');
    expect(g, log.join('\n')).toBeDefined();
    const o = hullObb(m.dress.sectionCatalogues(2).H3!, g!);
    expect(o.y0).toBeGreaterThanOrEqual(S3_BOX.walkwayTop + 1.9 - 1e-6);
    expect(o.y1).toBeLessThanOrEqual(9.0 + 1e-6);
    const obb = obbOf([o.cx, (o.y0 + o.y1) / 2, o.cz], [o.hx * 2, o.y1 - o.y0, o.hz * 2], o.yaw);
    for (const [x, z] of S3_HIGH_BAYS) expect(pointObbDist(obb, x, 8.5, z), `lamp ${x},${z}`).toBeGreaterThanOrEqual(0.5);
    const ex = Math.abs(Math.cos(o.yaw)) * o.hx + Math.abs(Math.sin(o.yaw)) * o.hz;
    const ez = Math.abs(Math.sin(o.yaw)) * o.hx + Math.abs(Math.cos(o.yaw)) * o.hz;
    expect(ex).toBeGreaterThan(ez * 10);
    expect(o.cx - ex).toBeGreaterThan(14);
    expect(o.cx + ex).toBeLessThan(52 - 0.15);
    expect(o.cz - ez).toBeGreaterThan(-29.85);
    expect(o.cz + ez).toBeLessThan(-11.15);
  });

  it('the pass-through hatch, both mats and four plates are placed; every drop is logged with its rule (the clean bench, the gowning bench, the lockers), never silent', () => {
    expect(count('H3', 'passBox')).toBe(1);
    expect(count('H3', 'stickyMat')).toBe(2);
    expect(count('H3', 'hazardPlate')).toBe(4);
    const dropped = log.filter((l) => l.includes('dropped'));
    const placed = log.filter((l) => l.includes(': placed'));
    expect(placed.length + dropped.length).toBeGreaterThanOrEqual(10);
    for (const l of dropped) expect(l).toMatch(/\b(K\d+|C|W|V|S):|scale .* outside/);
    // (R7 finding) the clean suite route crosses the 7 m deep clean room on z -3: the solid bench breaks rule C everywhere
    expect(count('H3', 'cleanBench') === 1 || log.some((l) => l.startsWith('cleanBench: dropped') && /\bC:/.test(l))).toBe(true);
    expect(count('F', 'kitCaseWall')).toBe(0);
    for (const l of log.filter((q) => q.startsWith('kitCaseWall face skin'))) expect(l).toMatch(/dropped, S: .*back passes through the box/);
  });

  it('no wall piece is mounted on glass (0.5 m from any glazed pane on its floor)', () => {
    const glass = bDressed.boxes.filter((p) => !!p.glass);
    for (const p of ps) {
      if (p.cat !== 'H3' || !['passBox', 'hazardPlate'].includes(p.prop)) continue;
      for (const q of glass) {
        if (p.y > q.c[1] + q.s[1] / 2 + 0.5 || p.y < q.c[1] - q.s[1] / 2 - 2.5) continue;
        const hx = (Math.abs(Math.sin(q.yaw)) > 0.5 ? q.s[2] : q.s[0]) / 2;
        const hz = (Math.abs(Math.sin(q.yaw)) > 0.5 ? q.s[0] : q.s[2]) / 2;
        const d = hyp2(Math.max(0, Math.abs(p.x - q.c[0]) - hx), Math.max(0, Math.abs(p.z - q.c[2]) - hz));
        expect(d, `${p.prop} at ${p.x},${p.z} vs glass ${q.c}`).toBeGreaterThan(0.5);
      }
    }
  });
});

describe('R7 the dressing as a whole (flag on)', () => {
  it('passes every keepout, skin rule and rule V for section 2 (checkDressing)', () => {
    const b = new m.LevelBuilder();
    const lay = m.ops.buildCampus(b, { dress: false });
    const ctx = m.dress.sectionContext(b, lay, 2, () => []);
    expect(checkDressing(ctx, m.dress.sectionCatalogues(2), ps)).toEqual([]);
  }, 300_000);

  it('section budgets: at most 40 draws, 150 k triangles, 2500 placements', () => {
    const report = JSON.parse(readFileSync(path.join(ASSETS, 'hero-s3.json'), 'utf8')) as CatReport;
    const reports: Record<string, CatReport> = {
      K: JSON.parse(readFileSync(path.join(ASSETS, 'campus-kit.json'), 'utf8')) as CatReport,
      F: JSON.parse(readFileSync(path.resolve(__dirname, '../src/world/props/assets/facility-props.json'), 'utf8')) as CatReport,
      H3: report,
    };
    const c = artCounts(m.dress.sectionCatalogues(2), reports, ps, 2);
    expect(c.draws).toBeLessThanOrEqual(40);
    expect(c.tris).toBeLessThanOrEqual(150_000);
    expect(c.placements).toBeLessThanOrEqual(2500);
  });

  it('a dress: true build of the whole campus does not throw', () => {
    const b = new m.LevelBuilder();
    expect(() => m.ops.buildCampus(b, { dress: true })).not.toThrow();
  }, 300_000);
});
