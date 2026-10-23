/**
 * (sector-redesign ART-KIT step 8, ART-PLAN 4.4, A119 / A122) The campus art gameplay gate: the campus built twice,
 * `buildCampus(b, { dress: false })` (the greybox, byte for byte the build at the ART-KIT cut) and `{ dress: true }`
 * (what `campusOps.build` makes), and per section (`-t S<n>` runs one) the dressing changes nothing a player, guard,
 * camera or laser uses: (1) route legs keep a path within 2% + 0.5 m, (2) protected nav cells (K1-K6, K13) stay
 * walkable, (3) patrols stay walkable, (4) cover by the legs is unchanged and new cover is 3 m off them, (5) no new solo
 * reach to a co-op lip and its headroom stays clear, (6) camera rays and laser tubes unchanged, (7) every interactable
 * keeps its reach, (8) M8 / A64 run in the section tests on the dressed build, (9) skins fit, (10) rule V; plus the
 * whole dressing passes `checkDressing` and the section budgets (ART-PLAN 5.1). Data-driven: the section slices never
 * edit it; on the stub-dressed campus every delta is 0.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { LevelBuilder, type BoxPiece } from '../src/world/levelBuilder';
import { buildCampus, campusOps } from '../src/world/maps/campusOps';
import { campusCatalogues, sectionCatalogues, sectionContext } from '../src/world/maps/campusDress';
import { CAMPUS_COOP_LIPS } from '../src/world/maps/campusLips';
import { buildCoverSegments, type CoverSegment } from '../src/cover/coverData';
import { hyp2 } from '../src/core/mathx';
import type { MapLayout } from '../src/world/mapDef';
import type { NavGrid } from '../src/ai/navGrid';
import { artCounts, type ArtPlacement, type CatReport } from '../src/world/campusArt/catalogue';
import { buildKeepouts, checkDressing, lipLine, type DressContext, type Keepouts } from '../src/world/campusArt/keepouts';
import { boxObb, pointObbDist, pointSegDist, segHitsObb } from '../src/world/campusArt/geometry';
import { runtimeNav } from './helpers/runtimeNav';
import { soloJumpThreats, soloTopLandingThreats } from './helpers/soloJumpReach';
import { greyboxHash } from './helpers/campusHash';

/** The campus greybox at the ART-KIT cut commit (b26c5925): boxes / cylinders / FNV of the box list (`campusHash.ts`). */
const CUT_GREYBOX = '1297/171/9e5541f8';
const SECTIONS = 5;
const BUDGET = 200000;

let bG: LevelBuilder;
let bD: LevelBuilder;
let layG: MapLayout;
let layD: MapLayout;
let navG: NavGrid;
let navD: NavGrid;
let coverG: CoverSegment[];
let coverD: CoverSegment[];
let nGrey = 0;
const ctxs: DressContext[] = [];
const kos: Keepouts[] = [];

beforeAll(() => {
  bG = new LevelBuilder();
  layG = buildCampus(bG, { dress: false });
  bD = new LevelBuilder();
  layD = campusOps.build(bD, 0);
  nGrey = bG.boxes.length;
  const seeds = (l: MapLayout): { x: number; y: number; z: number }[] => l.navSeeds ?? [];
  navG = runtimeNav(bG, layG.playerSpawns[0]!.pos, campusOps.navLayers ?? 3, seeds(layG));
  navD = runtimeNav(bD, layD.playerSpawns[0]!.pos, campusOps.navLayers ?? 3, seeds(layD));
  coverG = buildCoverSegments(bG.boxes, bG.cylinders);
  coverD = buildCoverSegments(bD.boxes, bD.cylinders);
  for (let k = 0; k < SECTIONS; k++) {
    ctxs.push(sectionContext(bG, layG, k, () => []));
    kos.push(buildKeepouts(ctxs[k]!));
  }
}, 600_000);

const placementsOf = (k: number): ArtPlacement[] => (layD.campusArt?.placements ?? []).filter((p) => p.section === k);
const pathLen = (w: readonly (readonly [number, number] | { 0: number; 1: number })[] | null): number => {
  if (!w) return Infinity;
  let s = 0;
  for (let i = 1; i < w.length; i++) s += hyp2(w[i]![0] - w[i - 1]![0], w[i]![1] - w[i - 1]![1]);
  return s;
};
/** The boxes the dressing wrote (past the greybox). */
const artBoxesWritten = (): BoxPiece[] => bD.boxes.slice(nGrey);

describe('the campus greybox and the dressed build', () => {
  it('buildCampus(b, { dress: false }) is the greybox at the ART-KIT cut, byte for byte (A119)', () => {
    expect(greyboxHash(bG)).toBe(CUT_GREYBOX);
  });

  it('campusOps.build dresses: the greybox boxes stay in place (only colours change), the art boxes come after them', () => {
    expect(layD.campusArt).toBeDefined();
    for (let i = 0; i < nGrey; i++) {
      const g = bG.boxes[i]!;
      const d = bD.boxes[i]!;
      expect({ ...d, color: '' }, `box ${i}`).toEqual({ ...g, color: '' });
    }
    expect(bD.cylinders).toEqual(bG.cylinders);
    // every placement's catalogue is known; every art box is a placement's
    const cats = campusCatalogues();
    for (const p of layD.campusArt!.placements) expect(cats[p.cat], p.cat).toBeDefined();
  });
});

for (let k = 0; k < SECTIONS; k++) {
  describe(`S${k + 1}`, () => {
    it('(1) every walked leg of every route has a path on the dressed grid, within 2% + 0.5 m of the greybox path', () => {
      const fails: string[] = [];
      let legs = 0;
      for (const r of ctxs[k]!.sector.routes) {
        for (let i = 0; i + 1 < r.pts.length; i++) {
          if ((r.climbs ?? []).includes(i)) continue;
          const a = r.pts[i]!;
          const c = r.pts[i + 1]!;
          const g = navG.findPath([a[0], a[1]], [c[0], c[1]], BUDGET, a[2] ?? 0, c[2] ?? 0);
          if (!g) continue;
          legs++;
          const d = navD.findPath([a[0], a[1]], [c[0], c[1]], BUDGET, a[2] ?? 0, c[2] ?? 0);
          const lg = pathLen(g);
          const ld = pathLen(d);
          if (!d || ld > lg * 1.02 + 0.5) fails.push(`${r.name} leg ${i}: ${lg.toFixed(1)} -> ${d ? ld.toFixed(1) : 'none'}`);
        }
      }
      expect(fails).toEqual([]);
      // the check is live: the section's walked legs were compared
      expect(legs).toBeGreaterThan(3);
    });

    it('(2) every greybox-walkable nav cell inside K1-K6 / K13 stays walkable', () => {
      const ko = kos[k]!;
      const bd = ko.bounds;
      const fails: string[] = [];
      let checked = 0;
      for (let i = 0; i < navG.cols * navG.layers; i++) {
        if (!navG.isWalkable(i)) continue;
        const [x, z] = navG.center(i);
        if (x < bd.x0 || x > bd.x1 || z < bd.z0 || z > bd.z1) continue;
        const y = navG.height[i]!;
        const why =
          ko.caps.find((c) => /^K[1-6]$/.test(c.rule) && y + 0.1 >= c.y0 && y - 0.1 <= c.y1 && pointSegDist(x, z, c.ax, c.az, c.bx, c.bz) < c.r)?.what ??
          ko.zones.find((zn) => /^K(3|6|13)$/.test(zn.rule) && y + 0.1 >= zn.y0 && y - 0.1 <= zn.y1 && pointInRect(zn.r, x, z))?.what;
        if (!why) continue;
        checked++;
        const j = navD.cellOf(x, z, y);
        if (j < 0 || !navD.isWalkable(j) || Math.abs(navD.height[j]! - y) > 0.3) fails.push(`cell (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}) in ${why}: ${blame(x, y, z)}`);
        if (fails.length > 20) break;
      }
      expect(fails).toEqual([]);
      expect(checked).toBeGreaterThan(100);
    });

    it('(3) every guard route point is walkable and every guard leg has a path', () => {
      const fails: string[] = [];
      ctxs[k]!.sector.guards.forEach((g, gi) => {
        const y = g.y ?? 0;
        const pts: [number, number][] = [[g.x, g.z], ...(g.route ?? [])];
        for (const [x, z] of pts) {
          const jg = navG.cellOf(x, z, y);
          const jd = navD.cellOf(x, z, y);
          if (jg >= 0 && navG.isWalkable(jg) && !(jd >= 0 && navD.isWalkable(jd))) fails.push(`guard ${gi} point (${x}, ${z})`);
        }
        for (let i = 0; i + 1 < pts.length; i++) {
          if (navG.findPath(pts[i]!, pts[i + 1]!, BUDGET, y, y) && !navD.findPath(pts[i]!, pts[i + 1]!, BUDGET, y, y)) fails.push(`guard ${gi} leg ${i}`);
        }
      });
      expect(fails).toEqual([]);
    });

    it('(4) cover within 3 m of a route or patrol leg is unchanged; new cover only 3 m off them', () => {
      const legs = kos[k]!.caps.filter((c) => c.rule === 'K1' || c.rule === 'K2');
      const nearLeg = (s: CoverSegment): boolean => legs.some((c) => Math.min(pointSegDist(s.ax, s.az, c.ax, c.az, c.bx, c.bz), pointSegDist(s.bx, s.bz, c.ax, c.az, c.bx, c.bz), pointSegDist((s.ax + s.bx) / 2, (s.az + s.bz) / 2, c.ax, c.az, c.bx, c.bz)) < 3 && s.y + 0.5 >= c.y0 && s.y <= c.y1);
      const same = (a: CoverSegment, b: CoverSegment): boolean => Math.abs(a.ax - b.ax) < 0.01 && Math.abs(a.az - b.az) < 0.01 && Math.abs(a.bx - b.bx) < 0.01 && Math.abs(a.bz - b.bz) < 0.01 && Math.abs(a.y - b.y) < 0.01;
      const bd = kos[k]!.bounds;
      const inB = (s: CoverSegment): boolean => s.ax >= bd.x0 && s.ax <= bd.x1 && s.az >= bd.z0 && s.az <= bd.z1;
      const lost = coverG.filter((s) => inB(s) && nearLeg(s) && !coverD.some((d) => same(s, d))).map((s) => `lost (${s.ax.toFixed(2)}, ${s.az.toFixed(2)}) -> (${s.bx.toFixed(2)}, ${s.bz.toFixed(2)})`);
      const added = coverD.filter((s) => inB(s) && !coverG.some((g) => same(s, g)) && nearLeg(s)).map((s) => `new (${s.ax.toFixed(2)}, ${s.az.toFixed(2)}) -> (${s.bx.toFixed(2)}, ${s.bz.toFixed(2)})`);
      expect([...lost, ...added]).toEqual([]);
    });

    it('(5) no new solo reach to a co-op lip (0.5 m margin), and its headroom prism stays clear', () => {
      const solidOf = (b: LevelBuilder): BoxPiece[] => {
        const out: BoxPiece[] = [];
        for (const p of b.boxes) {
          if (!p.collide || Math.abs(p.pitch) > 1e-3) continue;
          const q = Math.abs(Math.sin(p.yaw));
          if (q < 1e-3) out.push(p);
          else if (Math.abs(q - 1) < 1e-3) out.push({ ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 });
        }
        return out;
      };
      const sG = solidOf(bG);
      const sD = solidOf(bD);
      const fails: string[] = [];
      for (const l of CAMPUS_COOP_LIPS.filter((x) => x.section === k)) {
        const grip = { y: l.lip.y, a: { x: l.lip.x, z: l.lip.z0 }, b: { x: l.lip.x, z: l.lip.z1 }, n: l.lip.n };
        const g = new Set([...soloJumpThreats(sG, grip, () => false, 0.5), ...soloTopLandingThreats(sG, l.top, () => false, 0.5)]);
        for (const t of [...soloJumpThreats(sD, grip, () => false, 0.5), ...soloTopLandingThreats(sD, l.top, () => false, 0.5)]) if (!g.has(t)) fails.push(`${l.id}: ${t}`);
        const s = lipLine(l);
        for (const b of artBoxesWritten()) {
          const o = boxObb(b);
          for (let t = 0; t <= 1; t += 0.1) {
            const x = s.ax + (s.bx - s.ax) * t;
            const z = s.az + (s.bz - s.az) * t;
            for (let h = 0.1; h <= 1.9; h += 0.3) if (pointObbDist(o, x - l.lip.n.x * 0.45, l.lip.y + h, z - l.lip.n.z * 0.45) === 0) fails.push(`${l.id}: an art box in the headroom`);
          }
        }
      }
      expect(fails).toEqual([]);
    });

    it('(6) camera rays the greybox leaves clear stay clear; no art box in a laser tube', () => {
      const ctxD = { ...ctxs[k]!, boxes: bD.boxes };
      const key = (r: Keepouts['rays'][number]): string => `${r.cam}|${r.bx.toFixed(2)}|${r.by.toFixed(2)}|${r.bz.toFixed(2)}`;
      const g = new Set(kos[k]!.rays.map(key));
      const d = new Set(buildKeepouts(ctxD).rays.map(key));
      expect([...g].filter((x) => !d.has(x))).toEqual([]);
      const fails: string[] = [];
      for (const l of ctxs[k]!.lasers) {
        for (const y of l.ys) {
          const fy = (l.floorY ?? 0) + y;
          for (const b of artBoxesWritten()) {
            const o = boxObb(b);
            for (let t = 0; t <= 1; t += 0.02) if (pointObbDist(o, l.x1 + (l.x2 - l.x1) * t, fy, l.z1 + (l.z2 - l.z1) * t) < 0.3) fails.push(`laser ${l.id}`);
          }
        }
      }
      expect(fails).toEqual([]);
    });

    it('(7) every interactable keeps its reach: a walkable cell within 1.6 m with a clear line (no art box)', () => {
      const art = artBoxesWritten().filter((b) => b.collide).map(boxObb);
      const reach = (nav: NavGrid, it: { x: number; y: number; z: number }, clear: boolean): boolean => {
        for (let dx = -1.6; dx <= 1.6; dx += nav.cell) {
          for (let dz = -1.6; dz <= 1.6; dz += nav.cell) {
            if (hyp2(dx, dz) > 1.6) continue;
            for (const fy of [it.y - 1.2, it.y - 0.6, it.y - 1.8, it.y]) {
              const j = nav.cellOf(it.x + dx, it.z + dz, fy);
              if (j < 0 || !nav.isWalkable(j) || Math.abs(nav.height[j]! - fy) > 0.7) continue;
              const [cx, cz] = nav.center(j);
              if (!clear || !art.some((o) => segHitsObb(o, cx, nav.height[j]! + 1.0, cz, it.x, it.y, it.z, 0.005))) return true;
            }
          }
        }
        return false;
      };
      const fails = ctxs[k]!.items.filter((it) => reach(navG, it, false) && !reach(navD, it, true)).map((it) => `${it.what} (${it.x}, ${it.y}, ${it.z})`);
      expect(fails).toEqual([]);
    });

    it('(8-10) the dressing passes every keepout, skin rule and rule V (checkDressing), and the section budgets', () => {
      const ps = placementsOf(k);
      expect(checkDressing(ctxs[k]!, sectionCatalogues(k), ps)).toEqual([]);
      // ART-PLAN 5.1 budgets: <= 40 draws, <= 150 k triangles, <= 2500 placements (the hero report when built)
      const reports: Record<string, CatReport> = {
        K: JSON.parse(readFileSync(path.resolve(__dirname, '../src/world/campusArt/assets/campus-kit.json'), 'utf8')) as CatReport,
        F: JSON.parse(readFileSync(path.resolve(__dirname, '../src/world/props/assets/facility-props.json'), 'utf8')) as CatReport,
      };
      const hero = path.resolve(__dirname, `../src/world/campusArt/assets/hero-s${k + 1}.json`);
      if (existsSync(hero)) reports[`H${k + 1}`] = JSON.parse(readFileSync(hero, 'utf8')) as CatReport;
      const c = artCounts(sectionCatalogues(k), reports, layD.campusArt?.placements ?? [], k);
      expect(c.draws).toBeLessThanOrEqual(40);
      expect(c.tris).toBeLessThanOrEqual(150_000);
      expect(c.placements).toBeLessThanOrEqual(2500);
    });
  });
}

function pointInRect(r: { cx: number; cz: number; hx: number; hz: number; ux: number; uz: number }, x: number, z: number): boolean {
  const dx = x - r.cx;
  const dz = z - r.cz;
  const lx = dx * r.ux + dz * r.uz;
  const lz = dx * -r.uz + dz * r.ux;
  return Math.abs(lx) <= r.hx && Math.abs(lz) <= r.hz;
}

/** The art box (index) that takes a cell, for the failure message. */
function blame(x: number, y: number, z: number): string {
  for (let i = nGrey; i < bD.boxes.length; i++) {
    const o = boxObb(bD.boxes[i]!);
    if (pointObbDist(o, x, y + 0.5, z) < 0.4) return `art box ${i}`;
  }
  return 'no art box near (nav change)';
}
