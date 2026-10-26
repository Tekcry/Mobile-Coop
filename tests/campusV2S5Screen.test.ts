/**
 * (campus-greybox S5 P4, `docs/campus-greybox/briefs/S5.md` P4; A99) The v2 screen count, flag on (`flags.campusV2 = [5]`): no
 * walkable point of section 5 sees more than `CAMPUS_SCREEN_CAP` guards, every guard counted (dogs and dormant guards too), on
 * the undressed build. Ported from `tests/campusS5.test.ts` (T5:722-793) onto the v2 build; the nav is the live test's analytic
 * raster, copied (a test file is never imported). D:148-150 expects 8 at the roof's north-west corner.
 */
import { describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder as LB } from '../src/world/levelBuilder';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { CAMERA as PLAYER_CAMERA } from '../src/config/camera';
import { hyp2 } from '../src/core/mathx';
import { SightWorld, guardPoints } from '../src/game/sectorCheck';

const PI = Math.PI;

/** Loads the campus modules fresh with `flags.campusV2 = v2` (the selection is made at load, as on a page). */
async function loadCampus(v2: readonly number[]) {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = v2;
  const sectors = await import('../src/world/maps/campusSectors');
  const { buildCampus } = await import('../src/world/maps/campusOps');
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  const s5 = await import('../src/world/maps/campusV2/s5');
  return { sectors, buildCampus, LevelBuilder, s5 };
}

const m = await loadCampus([5]);
const { S5_FLIGHTS, S5_L1, S5_ROOF } = m.s5;
const b: LB = new m.LevelBuilder();
m.buildCampus(b, { dress: false });
const S5 = m.sectors.CAMPUS_SECTORS[4]!;
/** The S5 footprint. */
const FOOT = { x0: -70, x1: -26, z0: 18, z1: 70 };
const inFoot = (x: number, z: number): boolean => x >= FOOT.x0 && x <= FOOT.x1 && z >= FOOT.z0 && z <= FOOT.z1;

/** The collision pieces as axis-aligned boxes (every S5 piece is yaw 0 but the pitched rails; quarter turns swapped to plain). */
const solid: BoxPiece[] = [];
for (const p of b.boxes) {
  if (!p.collide || Math.abs(p.pitch) > 1e-3) continue;
  const q = Math.abs(Math.sin(p.yaw));
  if (q < 1e-3) solid.push(p);
  else if (Math.abs(q - 1) < 1e-3) solid.push({ ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 });
}
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
/** The stair ramps as surfaces: (x, z) on a flight -> its height. */
function rampAt(x: number, z: number): number[] {
  const out: number[] = [];
  for (const f of S5_FLIGHTS) {
    if (Math.abs(x - f.cx) > f.w / 2 || Math.abs(z - f.cz) > f.len / 2) continue;
    const t = Math.abs(f.yaw) < 1e-6 ? (z - (f.cz - f.len / 2)) / f.len : (f.cz + f.len / 2 - z) / f.len;
    out.push(f.y0 + f.rise * t);
  }
  return out;
}

/** An analytic layered nav grid over a rectangle (as the live test's, with the stair ramps as surfaces). */
function analyticNav(rect: readonly [number, number, number, number], cell = 0.5): NavGrid {
  const snap = (v: number, o: number): number => o + Math.floor((v - o) / cell) * cell;
  const minX = snap(rect[0], b.bounds.minX);
  const minZ = snap(rect[1], b.bounds.minZ);
  const maxX = rect[2];
  const maxZ = rect[3];
  const near = solid.filter((p) => p.c[0] + p.s[0] > minX - 1 && p.c[0] - p.s[0] < maxX + 1 && p.c[2] + p.s[2] > minZ - 1 && p.c[2] - p.s[2] < maxZ + 1);
  const B = 4;
  const nbx = Math.ceil((maxX - minX) / B) + 1;
  const nbz = Math.ceil((maxZ - minZ) / B) + 1;
  const buckets: BoxPiece[][] = Array.from({ length: nbx * nbz }, () => []);
  for (const p of near) {
    const rad = hyp2(p.s[0], p.s[2]) / 2 + 0.01;
    const i0 = Math.max(0, Math.floor((p.c[0] - rad - minX) / B));
    const i1 = Math.min(nbx - 1, Math.floor((p.c[0] + rad - minX) / B));
    const k0 = Math.max(0, Math.floor((p.c[2] - rad - minZ) / B));
    const k1 = Math.min(nbz - 1, Math.floor((p.c[2] + rad - minZ) / B));
    for (let i = i0; i <= i1; i++) for (let k = k0; k <= k1; k++) buckets[k * nbx + i]!.push(p);
  }
  const surf = (x: number, z: number): { h: number; bottom: number }[] => {
    const out: { h: number; bottom: number }[] = [];
    const i = Math.min(nbx - 1, Math.max(0, Math.floor((x - minX) / B)));
    const k = Math.min(nbz - 1, Math.max(0, Math.floor((z - minZ) / B)));
    for (const p of buckets[k * nbx + i]!) {
      if (Math.abs(x - p.c[0]) <= p.s[0] / 2 && Math.abs(z - p.c[2]) <= p.s[2] / 2) out.push({ h: top(p), bottom: bottom(p) });
    }
    for (const h of rampAt(x, z)) out.push({ h, bottom: h - 0.35 });
    return out.sort((a, q) => q.h - a.h);
  };
  const blockers: NavBlocker[] = near.filter((p) => !p.overhead).map((p) => ({ cx: p.c[0], cz: p.c[2], hx: p.s[0] / 2, hz: p.s[2] / 2, yaw: p.yaw, bottom: bottom(p), top: top(p) }));
  for (const f of b.anchors.fences) blockers.push({ cx: (f.a.x + f.b.x) / 2, cz: (f.a.z + f.b.z) / 2, hx: 0.05, hz: f.len / 2, yaw: Math.atan2(f.tx, f.tz), bottom: f.a.y, top: f.a.y + f.height });
  for (const c of b.cylinders) if (c.collide) blockers.push({ cx: c.c[0], cz: c.c[2], hx: c.r, hz: c.r, yaw: 0, bottom: c.c[1] - c.h / 2, top: c.c[1] + c.h / 2, round: true });
  const links = b.anchors.ladders.map((l) => {
    const fx = Math.sin(l.facing);
    const fz = Math.cos(l.facing);
    const sx = l.base.x - fx * 0.32;
    const sz = l.base.z - fz * 0.32;
    return { kind: 'ladder' as const, twoWay: true, pts: [l.base.x - fx * 0.7, l.base.y, l.base.z - fz * 0.7, sx, l.base.y, sz, sx, l.top.y, sz, l.top.x + fx * 0.3, l.top.y, l.top.z + fz * 0.3] };
  });
  return new NavGrid({
    minX, maxX, minZ, maxZ, cell, agentRadius: 0.32, stepHeight: 0.45, layers: 5, blockers, links,
    sample: () => ({ h: 0, ok: false }),
    sampleLayers: (x, z) => {
      const out: NavSample[] = [];
      let ceiling = Infinity;
      for (const s of surf(x, z)) {
        if (s.h > ceiling) continue;
        if (ceiling - s.h >= 1.7) out.push({ h: s.h, ok: true });
        ceiling = Math.min(ceiling, s.bottom);
      }
      if (!out.some((o) => o.h === 0) && ceiling >= 1.7) out.push({ h: 0, ok: true });
      return out.sort((a, q) => a.h - q.h);
    },
  });
}
const nav = analyticNav([-72, 16, -16, 68]);

const G = S5.guards;
const CAMPUS_SCREEN_CAP = m.sectors.CAMPUS_SCREEN_CAP;

describe('P4 A99: the screen count (no player point sees more than CAMPUS_SCREEN_CAP guards, every guard counted)', () => {
  const nearFoot = (p: BoxPiece): boolean => p.c[0] + p.s[0] > FOOT.x0 - 2 && p.c[0] - p.s[0] < FOOT.x1 + 2 && p.c[2] + p.s[2] > FOOT.z0 - 2 && p.c[2] - p.s[2] < FOOT.z1 + 2;
  const all = G.map((g, i) => ({ g, i }));
  /** A shut leaf for every door no guard route passes. */
  const leaves: BoxPiece[] = [];
  for (const d of b.anchors.doors) {
    const cx = d.hinge.x + (Math.sin(d.yaw) * d.width) / 2;
    const cz = d.hinge.z + (Math.cos(d.yaw) * d.width) / 2;
    if (!inFoot(cx, cz)) continue;
    const passed = all.some(({ g }) => guardPoints({ x: g.x, z: g.z, y: g.y, route: g.route as readonly (readonly [number, number])[] | undefined }).some((p) => hyp2(p[0] - cx, p[2] - cz) < 0.7 && Math.abs(p[1] - d.hinge.y) < 1));
    if (passed) continue;
    const alongX = Math.abs(Math.sin(d.yaw)) > 0.5;
    leaves.push({ c: [cx, d.hinge.y + 1.05, cz], s: alongX ? [d.width, 2.1, 0.1] : [0.1, 2.1, d.width], yaw: 0, pitch: 0, color: '#000', collide: true });
  }
  const world = new SightWorld([...b.boxes.filter(nearFoot), ...leaves], b.cylinders);
  const HALF = ((PLAYER_CAMERA.fov / 2) * PI) / 180;
  const YAWS = Array.from({ length: 32 }, (_, k) => (k * PI) / 16);

  it('at every walkable nav cell centre (0.5 m) of the section on every level, 32 facings: at most CAMPUS_SCREEN_CAP guards (dogs and dormant too) on their routes in the view with a clear line within 40 m', () => {
    const pts = all.map(({ g }) => guardPoints({ x: g.x, z: g.z, y: g.y, route: g.route as readonly (readonly [number, number])[] | undefined }).map(([px, py, pz]) => [px, py + 1.2, pz] as const));
    let worst = { n: -1, at: '', who: [] as number[] };
    let roofNW = { n: -1, at: '', who: [] as number[] };
    let samples = 0;
    const perLevel = new Map<string, number>();
    let over = 0;
    const hist = new Map<number, number>();
    /** Plan number from the list index (#1-#24, then #28, #34). */
    const num = (i: number): number => (i < 24 ? i + 1 : i === 24 ? 28 : 34);
    for (let col = 0; col < nav.cols; col++) {
      const [x, z] = nav.center(col);
      if (!inFoot(x, z)) continue;
      for (let l = 0; l < nav.layers; l++) {
        const i = l * nav.cols + col;
        if (!nav.walk[i]) continue;
        const h = nav.height[i]!;
        if (h > S5_ROOF + 1) continue;
        samples++;
        const lvl = h > S5_ROOF - 0.5 ? 'roof' : h > S5_L1 - 0.5 ? 'L1 / low roof' : h > 0.5 ? 'stairs / deck' : 'ground';
        perLevel.set(lvl, (perLevel.get(lvl) ?? 0) + 1);
        const eye = h + 1.6;
        const seen = all.map(({ i: gi }, k) => ({
          n: num(gi),
          at: pts[k]!.filter(([px, py, pz]) => hyp2(px - x, pz - z) <= 40 && world.clear(x, eye, z, px, py, pz)).map(([px, , pz]) => Math.atan2(px - x, pz - z)),
        }));
        let best = 0;
        for (const yaw of YAWS) {
          const who = seen.filter((s) => s.at.some((a) => Math.abs(Math.atan2(Math.sin(a - yaw), Math.cos(a - yaw))) <= HALF)).map((s) => s.n);
          if (who.length > best) best = who.length;
          const at = `(${x}, ${h.toFixed(2)}, ${z}) facing ${((yaw * 180) / PI).toFixed(0)}`;
          if (who.length > worst.n) worst = { n: who.length, at, who };
          if (lvl === 'roof' && x < -50 && z > 38 && who.length > roofNW.n) roofNW = { n: who.length, at, who };
        }
        hist.set(best, (hist.get(best) ?? 0) + 1);
        if (best > CAMPUS_SCREEN_CAP) over++;
      }
    }
    console.info(`A99 S5 worst ${worst.n} at ${worst.at}: #${worst.who.join(', #')}; roof NW corner ${roofNW.n} at ${roofNW.at}: #${roofNW.who.join(', #')} (D:148-150 expects 8); ${samples} points ${JSON.stringify([...perLevel.entries()])}, ${over} over ${CAMPUS_SCREEN_CAP}; histogram ${JSON.stringify([...hist.entries()].sort((p, q) => p[0] - q[0]))}`);
    expect(G.length).toBe(26);
    expect(samples).toBeGreaterThan(4000);
    expect(perLevel.get('roof') ?? 0).toBeGreaterThan(500);
    expect(perLevel.get('L1 / low roof') ?? 0).toBeGreaterThan(500);
    expect(worst.n, `worst ${worst.at}: #${worst.who.join(', #')}`).toBeLessThanOrEqual(CAMPUS_SCREEN_CAP);
  }, 900_000);
});
