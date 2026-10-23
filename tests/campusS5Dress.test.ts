/**
 * (sector-redesign ART-S5, A147-A151) Section 5's dressing: every room tagged, every brief skin target skinned once, the
 * hero placements at their positions (the refusals the keepouts gave are the logged fallbacks), the H5 report against
 * `HERO_S5`, the section budgets, `d.check()` empty. The gameplay and light gates are the kit's
 * (`campusArtGameplay.test.ts -t S5`, `campusArtLight.test.ts -t S5`).
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { buildCampus } from '../src/world/maps/campusOps';
import { sectionCatalogues, sectionContext } from '../src/world/maps/campusDress';
import { CampusDresser } from '../src/world/campusArt/dresser';
import { artCounts, pieceHull, type ArtPlacement, type CatReport } from '../src/world/campusArt/catalogue';
import { boxAt } from '../src/world/campusArt/geometry';
import { CAMPUS_LOOK } from '../src/world/campusArt/campusKit';
import { PROP_LOOK } from '../src/world/props/facilityProps';
import { S5_BOX, S5_L1, S5_ROOF, S5_ROOMS } from '../src/world/maps/campusS5';
import { dressS5, HERO_S5, S5_ART_TAGS, S5_HERO_LOG, S5_OMITTED } from '../src/world/maps/campusS5Dress';

const ASSETS = path.resolve(__dirname, '../src/world/campusArt/assets');
const rd = (f: string): CatReport => JSON.parse(readFileSync(f, 'utf8')) as CatReport;

let b: LevelBuilder;
let d: CampusDresser;
let ps: ArtPlacement[];

beforeAll(() => {
  b = new LevelBuilder();
  const lay = buildCampus(b, { dress: false });
  d = new CampusDresser(b, sectionContext(b, lay, 4, () => []), sectionCatalogues(4));
  dressS5(d);
  ps = d.placements;
}, 300_000);

const at = (piece: string): ArtPlacement[] => ps.filter((p) => `${p.cat}:${p.prop}` === piece);

describe('ART-S5 tags (A147)', () => {
  it('every room of S5_ROOMS has a tag and every tag names a room', () => {
    expect(S5_ROOMS.map((r) => r.id).filter((id) => !S5_ART_TAGS[id])).toEqual([]);
    expect(Object.keys(S5_ART_TAGS).filter((id) => !S5_ROOMS.some((r) => r.id === id))).toEqual([]);
  });
});

describe('ART-S5 skins (A148)', () => {
  it('each brief skin target is skinned exactly once per module', () => {
    const skinned = (p: ArtPlacement): number | undefined => p.skinOf;
    const perBox = new Map<number, number>();
    for (const p of ps) if (p.skinOf !== undefined) perBox.set(p.skinOf, (perBox.get(p.skinOf) ?? 0) + 1);
    const n = (x: number, y: number, z: number): number => perBox.get(boxAt(b.boxes, x, y, z)) ?? 0;
    // racks: three rows x 4 modules; screens: two boxes x 3; stacks, token, chimneys, van: one each; balustrade: 5 + 19 + 17
    for (const z of S5_BOX.racks) expect(n(-53.8, 1.1, z)).toBe(4);
    for (const [x0, x1, z0, z1] of S5_BOX.screens) expect(n((x0 + x1) / 2, S5_L1 + 1.1, (z0 + z1) / 2)).toBe(3);
    for (const [x0, z0, x1, z1] of S5_BOX.stacks) expect(n((x0 + x1) / 2, S5_L1 + 1.1, (z0 + z1) / 2)).toBe(1);
    expect(n(-43, 0.45, 43.5)).toBe(1);
    for (const [x, z] of S5_BOX.chimneys) expect(n(x, S5_ROOF + 1, z)).toBe(1);
    expect(n(-29, 1.2, 54.5)).toBe(1);
    expect([n(-67.3, 0.5, 50), n(-54, 0.5, 50), n(-34.7, 0.5, 50)]).toEqual([5, 19, 17]);
    expect(skinned(at('H5:panelVan')[0]!)).toBeDefined();
    expect(at('H5:panelVan')[0]!.cls).toBe('skin-hide');
    const cyl = ps.filter((p) => p.skinCyl !== undefined);
    expect(cyl.length).toBe(S5_BOX.trees.length);
    expect(new Set(cyl.map((p) => p.skinCyl)).size).toBe(S5_BOX.trees.length);
    // the rack lamps ride the control-room circuit
    expect(at('H5:radioRackRow').every((p) => p.group === 85)).toBe(true);
  });
});

describe('ART-S5 heroes (A149)', () => {
  it('the safe-deposit fronts and the time lock stand at their positions', () => {
    const faces = at('H5:depositFace');
    expect(faces.length).toBe(8);
    for (let k = 0; k < 4; k++) {
      const z = 38.6 + 1.2 * k;
      expect(faces.some((p) => Math.abs(p.x + 45.9) < 0.05 && Math.abs(p.z - z) < 0.05 && Math.abs(p.yaw - Math.PI / 2) < 1e-6)).toBe(true);
      expect(faces.some((p) => Math.abs(p.x + 40.1) < 0.05 && Math.abs(p.z - z) < 0.05 && Math.abs(p.yaw - (3 * Math.PI) / 2) < 1e-6)).toBe(true);
    }
    const tl = at('F:timeLockPanel');
    expect(tl.length).toBe(1);
    expect(tl[0]!.x).toBeCloseTo(-41.45, 1);
    expect(tl[0]!.y).toBeCloseTo(1.4, 2);
    expect(tl[0]!.z).toBeCloseTo(37.1, 1);
  });

  it('the refusals are logged fallbacks: deposit rows (rule C), the vault leaf (K1), the CCTV wall (S, a face skin whose back passes through the wall)', () => {
    const rules = (piece: string): string[] => Object.keys(d.report.dropped[piece] ?? {});
    expect(rules('F:depositWall').every((r) => r === 'C' || r === 'K4')).toBe(true);
    expect(rules('F:vaultLeaf')).toEqual(['K1']);
    expect(rules('F:monitorWall')).toEqual(['S']);
    expect(S5_HERO_LOG.length).toBeGreaterThan(0);
    // the explicit omitted list (artnext A9): nothing else of the heroes may be missing, and each omission is logged
    expect([...S5_OMITTED].sort()).toEqual(['F:depositWall', 'F:monitorWall', 'F:vaultLeaf', 'vaultFrame']);
    expect(S5_HERO_LOG.some((l) => l.startsWith('vaultFrame: needs catalogue frame entry'))).toBe(true);
    expect(at('F:depositWall').length + at('F:vaultLeaf').length + at('F:monitorWall').length).toBe(0);
    // the base pass still dressed the Old House (fireplaces under the stacks, the hall clock)
    expect(at('K:fireplace').length).toBeGreaterThan(0);
    expect(at('K:longcaseClock').length).toBe(1);
  });

  it('the H5 report matches HERO_S5 (triangles, materials, footprints, GLB size)', () => {
    const cat = HERO_S5!;
    const rep = rd(path.join(ASSETS, 'hero-s5.json'));
    expect(Object.keys(rep.pieces).sort()).toEqual([...cat.ids].sort());
    let tris = 0;
    for (const id of cat.ids) {
      const r = rep.pieces[id]!;
      expect(r.triangles, `${id} triangles`).toBeLessThanOrEqual(cat.triBudget[id]!);
      tris += r.triangles;
      for (const m of Object.keys(r.meshes)) expect(cat.materials, `${id} material ${m}`).toContain(m);
      const h = pieceHull(cat, id);
      const f = cat.footprint[id]!;
      expect(Math.abs(f[0] - h.lo[0]) + Math.abs(f[2] - h.hi[0]) + Math.abs(f[1] - h.lo[2]) + Math.abs(f[3] - h.hi[2]), `${id} footprint`).toBeLessThanOrEqual(0.04);
      expect(cat.classOf![id], `${id} class`).toBeDefined();
    }
    expect(tris).toBeLessThanOrEqual(5000);
    expect(statSync(path.join(ASSETS, 'hero-s5.glb')).size).toBeLessThanOrEqual(500_000);
    for (const m of cat.materials) expect(CAMPUS_LOOK[m] ?? PROP_LOOK[m as keyof typeof PROP_LOOK], `look ${m}`).toBeDefined();
    expect(existsSync(path.join(ASSETS, 'hero-s5.glb'))).toBe(true);
  });
});

describe('ART-S5 artnext B6 / B7 / B8', () => {
  it('the kitchen counter is skinned by the fit kitchenRun, the wall cupboards hang over it', () => {
    const counter = boxAt(b.boxes, -31.2, 0.45, 36);
    const run = at('K:kitchenRun');
    expect(run.length).toBe(3);
    expect(run.every((p) => p.skinOf === counter && p.cls === 'skin')).toBe(true);
    const cup = at('K:wallCupboards');
    expect(cup.length).toBe(3);
    // backs on the west wall's face, over the counter (z 34..38), above the counter's top
    expect(cup.every((p) => Math.abs(p.x + 31.85) < 0.01 && p.z > 34 && p.z < 38 && p.cls === 'visual')).toBe(true);
  });

  it('the vault frame and the CCTV wall are logged drops with their rule ids', () => {
    expect(S5_HERO_LOG.some((l) => l.startsWith('vaultFrame: needs catalogue frame entry'))).toBe(true);
    expect(d.report.dropped['F:monitorWall']).toEqual({ S: 2 });
    expect(at('F:monitorWall').length).toBe(0);
  });

  it('every skinRow module carries its group (B7: no post-call writes)', () => {
    const racks = at('H5:radioRackRow');
    expect(racks.length).toBe(12);
    expect(racks.every((p) => p.group === 85)).toBe(true);
  });

  it('the two hall portraits hang at the hall floor, flush on the front wall (B8)', () => {
    const hall = ps.filter((p) => p.prop === 'portraitFrame' && Math.abs(p.z - 18.15) < 0.01 && p.x > -50 && p.x < -38);
    expect(hall.length).toBe(2);
    for (const p of hall) expect(p.y).toBe(0);
    expect(hall.map((p) => p.x).sort((a, b2) => a - b2)[0]).toBeCloseTo(-46.4, 1);
    // none is left at the door-wall piece's 1.93
    expect(ps.some((p) => p.prop === 'portraitFrame' && Math.abs(p.y - 1.93) < 0.01)).toBe(false);
  });
});

describe('ART-S5 budgets and checks (A150, A151)', () => {
  it('d.check() is empty and the section stays inside its budgets', () => {
    expect(d.check()).toEqual([]);
    const reports: Record<string, CatReport> = { K: rd(path.join(ASSETS, 'campus-kit.json')), F: rd(path.resolve(__dirname, '../src/world/props/assets/facility-props.json')), H5: rd(path.join(ASSETS, 'hero-s5.json')) };
    const c = artCounts(sectionCatalogues(4), reports, ps, 4);
    expect(c.draws).toBeLessThanOrEqual(40);
    expect(c.tris).toBeLessThanOrEqual(150_000);
    expect(c.placements).toBeLessThanOrEqual(2500);
  });
});
