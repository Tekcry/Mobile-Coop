/**
 * (campus-greybox S3 R2) The v2 lab block's L1 (`docs/campus-greybox/briefs/S3.md` section 4 "R2"; pattern
 * `tests/campusS3.test.ts`). With section 3's v2 flag on. R2a: the L1 slab and its listed holes only, the corridor 3.7 clear
 * but for the sample cases, the 1.1 spandrel under the hall glass, this lane's door holes and anchors, the landing, the
 * north rooms' partitions and furniture, the security room. R2b: the gallery, spur, bridge plate and drop gate, the crane
 * walkway and its ladders, the hoist hatch, the ceilings and the void (1.5 clear, off the guards' grid), the L1 rooms, nav
 * seeds and hide spot, the nav layer count.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder } from '../src/world/levelBuilder';
import type { NavBlocker, NavGrid, NavSample } from '../src/ai/navGrid';
import type { RoomDef } from '../src/world/rooms';
import { hyp2 } from '../src/core/mathx';
import type * as KitM from '../src/world/maps/campusV2/s3Kit';
import type * as L1M from '../src/world/maps/campusV2/s3L1';
import type * as S3M from '../src/world/maps/campusV2/s3';

type Kit = typeof KitM;
type L1 = typeof L1M;
type S3 = typeof S3M;

let kit: Kit;
let l1: L1;
/** The whole campus with S3 v2 on (undressed). */
let bAll: LevelBuilder;
/** L1 alone (this lane's pieces only). */
let bL: LevelBuilder;
let lSolid: BoxPiece[];
let s3: S3;
/** The guards' grid over the block: this lane's pieces with R1's roof slab and chamber as stand-ins (see `standIns`). */
let nav: NavGrid;
/** Walkable surfaces per column of `nav`'s sampler (headroom >= 1.7), for the layer count. */
let layersAt: (x: number, z: number) => number;

const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
const ext = (p: BoxPiece): [number, number, number, number] => [p.c[0] - p.s[0] / 2, p.c[2] - p.s[2] / 2, p.c[0] + p.s[0] / 2, p.c[2] + p.s[2] / 2];
/** `ext` to the centimetre, for comparing with plan numbers. */
const extCm = (p: BoxPiece): number[] => ext(p).map((v) => Math.round(v * 100) / 100);

/** The collision pieces as axis-aligned boxes (quarter-turn pieces swapped, as in the S3 test). */
function solidOf(b: LevelBuilder): BoxPiece[] {
  const out: BoxPiece[] = [];
  for (const p of b.boxes) {
    if (!p.collide || Math.abs(p.pitch) > 1e-3) continue;
    const q = Math.abs(Math.sin(p.yaw));
    if (q < 1e-3) out.push(p);
    else if (Math.abs(q - 1) < 1e-3) out.push({ ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 });
  }
  return out;
}

/** The solid piece holding (x, y, z), if any (`glass` false: panes do not count). */
function pieceAt(ps: readonly BoxPiece[], x: number, y: number, z: number, glass = true): BoxPiece | undefined {
  return ps.find((p) => (glass || !p.glass) && Math.abs(x - p.c[0]) <= p.s[0] / 2 + 1e-6 && Math.abs(y - p.c[1]) <= p.s[1] / 2 + 1e-6 && Math.abs(z - p.c[2]) <= p.s[2] / 2 + 1e-6);
}

const inBox = (r: readonly number[], x: number, z: number, m = 0): boolean => x >= r[0]! - m && x <= r[2]! + m && z >= r[1]! - m && z <= r[3]! + m;

/** A door anchor's centre (hinge + half its width along its yaw). */
const doorCentre = (d: { hinge: { x: number; y: number; z: number }; yaw: number; width: number }): [number, number, number] => [
  d.hinge.x + (Math.sin(d.yaw) * d.width) / 2,
  d.hinge.y,
  d.hinge.z + (Math.cos(d.yaw) * d.width) / 2,
];

/**
 * R1's pieces this lane's nav tests stand on, until the lead merges r1 (`s3Shell.ts` steps 1 and 6, as built S3:329 and
 * S3:386): the roof slab (9.0..9.2 over the footprint) and the environmental chamber (x 30..36, z -22..-14, 4.4).
 */
function standIns(k: Kit): BoxPiece[] {
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, overhead: boolean): BoxPiece => ({
    c: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], s: [x1 - x0, y1 - y0, z1 - z0], yaw: 0, pitch: 0, color: '#000000', collide: true, visible: true, overhead, noLedge: true,
  });
  const [cx0, cz0, cx1, cz1] = k.S3_BOX.chamber;
  return [box(10, 64, k.S3_ROOF, 9.2, -30, 0, true), box(cx0, cx1, 0, k.S3_BOX.chamberTop, cz0, cz1, false)];
}

/** An analytic layered nav grid over a rectangle (`tests/campusS3.test.ts` `analyticNav`, headroom 1.7), on `solid`. */
function analyticNav(NavGridCtor: typeof NavGrid, b: LevelBuilder, solid: BoxPiece[], rect: readonly [number, number, number, number], cell = 0.5): NavGrid {
  const snap = (v: number, o: number): number => o + Math.floor((v - o) / cell) * cell;
  const minX = snap(rect[0], -100);
  const minZ = snap(rect[1], -100);
  const maxX = rect[2];
  const maxZ = rect[3];
  const surf = (x: number, z: number): { h: number; bottom: number }[] => {
    const out: { h: number; bottom: number }[] = [];
    for (const p of solid) if (Math.abs(x - p.c[0]) <= p.s[0] / 2 && Math.abs(z - p.c[2]) <= p.s[2] / 2) out.push({ h: top(p), bottom: bottom(p) });
    return out.sort((a, q) => q.h - a.h);
  };
  const sampleLayers = (x: number, z: number): NavSample[] => {
    const out: NavSample[] = [];
    let ceiling = Infinity;
    for (const s of surf(x, z)) {
      if (s.h > ceiling) continue;
      if (ceiling - s.h >= 1.7) out.push({ h: s.h, ok: true });
      ceiling = Math.min(ceiling, s.bottom);
    }
    if (!out.some((o) => o.h === 0) && ceiling >= 1.7) out.push({ h: 0, ok: true });
    return out.sort((a, q) => a.h - q.h);
  };
  layersAt = (x, z) => sampleLayers(x, z).length;
  const blockers: NavBlocker[] = solid.filter((p) => !p.overhead).map((p) => ({ cx: p.c[0], cz: p.c[2], hx: p.s[0] / 2, hz: p.s[2] / 2, yaw: p.yaw, bottom: bottom(p), top: top(p) }));
  const links = b.anchors.ladders.map((l) => {
    const fx = Math.sin(l.facing);
    const fz = Math.cos(l.facing);
    const sx = l.base.x - fx * 0.32;
    const sz = l.base.z - fz * 0.32;
    return { kind: 'ladder' as const, twoWay: true, pts: [l.base.x - fx * 0.7, l.base.y, l.base.z - fz * 0.7, sx, l.base.y, sz, sx, l.top.y, sz, l.top.x + fx * 0.3, l.top.y, l.top.z + fz * 0.3] };
  });
  return new NavGridCtor({ minX, maxX, minZ, maxZ, cell, agentRadius: 0.32, stepHeight: 0.45, layers: 5, blockers, links, sample: () => ({ h: 0, ok: false }), sampleLayers });
}

const onNav = (x: number, z: number, y = 0): boolean => nav.isWalkable(nav.cellOf(x, z, y)) && Math.abs(nav.heightAt(x, z, y) - y) < 0.6;

beforeAll(async () => {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = [3];
  kit = await import('../src/world/maps/campusV2/s3Kit');
  l1 = await import('../src/world/maps/campusV2/s3L1');
  s3 = await import('../src/world/maps/campusV2/s3');
  const { NavGrid: NavGridCtor } = await import('../src/ai/navGrid');
  const { buildCampus } = await import('../src/world/maps/campusOps');
  const lb = await import('../src/world/levelBuilder');
  bAll = new lb.LevelBuilder();
  buildCampus(bAll, { dress: false });
  bL = new lb.LevelBuilder();
  l1.buildS3L1(bL);
  lSolid = solidOf(bL);
  nav = analyticNav(NavGridCtor, bL, [...lSolid, ...standIns(kit)], [9.5, -30.5, 64.5, 0.5]);
}, 120_000);

/** This lane's L1 doors (the cores' doors are R3's): along x (on a z line) or along z. */
const MY_DOORS = ['hoist', 'writeup', 'gown', 'storeHatch', 'gallery', 'sec', 'passThrough', 'airlock', 'walkway'] as const;
const ALONG_X: Record<(typeof MY_DOORS)[number], boolean> = {
  hoist: true, writeup: true, gown: true, storeHatch: true, gallery: true, sec: true, passThrough: false, airlock: false, walkway: false,
};

describe('campus v2 S3 L1 (R2a)', () => {
  it('the slab (top 4.5, 0.2) covers the landing, the z -11..0 band and the part over the plant, but for the listed holes (LD 16.5.2)', () => {
    const slabs = lSolid.filter((p) => p.overhead && p.color === kit.SLAB && Math.abs(top(p) - kit.S3_L1) < 1e-6 && Math.abs(bottom(p) - (kit.S3_L1 - 0.2)) < 1e-6);
    expect(slabs.length).toBeGreaterThan(3);
    for (const p of slabs) {
      expect(p.noLedge).toBe(true);
      const [x0, z0, x1, z1] = ext(p);
      expect(l1.S3_L1_SLABS.some((r) => x0 >= r[0] - 1e-6 && x1 <= r[2] + 1e-6 && z0 >= r[1] - 1e-6 && z1 <= r[3] + 1e-6), `slab ${ext(p)} outside the L1 areas`).toBe(true);
    }
    // the holes: the north and east core wells (inside their walls), the hoist hatch to the x 21 wall face (P9), the sec hatch
    expect(l1.S3_L1_HOLES.map((h) => [...h])).toEqual([
      [30.15, -6.85, 33.35, -0.65],
      [58.15, -6.85, 61.35, -0.65],
      [18, -6, 20.85, -3],
      [53.5, -17.5, 54.5, -16.5],
    ]);
    let covered = 0;
    for (const r of l1.S3_L1_SLABS) {
      for (let x = r[0] + 0.05; x < r[2]; x += 0.25) {
        for (let z = r[1] + 0.05; z < r[3]; z += 0.25) {
          const hole = l1.S3_L1_HOLES.some((h) => inBox(h, x, z, -0.01));
          const edge = l1.S3_L1_HOLES.some((h) => inBox(h, x, z, 0.01)) && !hole;
          if (edge) continue;
          const p = slabs.find((q) => inBox(ext(q), x, z));
          if (hole) expect(p, `slab in a hole at ${x}, ${z}`).toBeUndefined();
          else {
            expect(p, `no slab at ${x}, ${z}`).toBeDefined();
            covered++;
          }
        }
      }
    }
    expect(covered).toBeGreaterThan(9000);
    // the sealed chase x 52..53, z -18..-11 has its slab (P22)
    expect(slabs.some((q) => inBox(ext(q), 52.5, -14.5))).toBe(true);
  });

  it('the viewing corridor and east lobby are 3.7 clear (z -10.85..-7.15) from x 10.15 to 63.85, 4.5 to 7.4, but for the four sample cases', () => {
    const cases = lSolid.filter((p) => Math.abs(bottom(p) - kit.S3_L1) < 1e-6 && Math.abs(top(p) - (kit.S3_L1 + 1.0)) < 1e-6 && Math.abs(p.c[2] + 7.55) < 1e-6);
    expect(cases.map((p) => p.c[0]).sort((a, c) => a - c)).toEqual([18, 26, 34, 46]);
    for (const p of cases) {
      expect(p.s[0]).toBeCloseTo(1.2, 6);
      expect(p.s[2]).toBeCloseTo(0.8, 6);
      expect(p.noLedge).toBe(true);
    }
    for (let x = 10.2; x < 63.85; x += 0.25) {
      for (let z = -10.8; z < -7.15; z += 0.25) {
        for (const y of [4.55, 5.2, 6.0, 7.0, 7.35]) {
          const p = pieceAt(lSolid, x, y, z);
          if (p && cases.includes(p)) continue;
          expect(p, `${x}, ${y}, ${z}: ${p ? JSON.stringify(p.c) : ''}`).toBeUndefined();
        }
      }
    }
    // no wall at x 52 between the corridor and the east lobby (GR:661-666)
    for (let z = -10.8; z < -7.2; z += 0.2) expect(pieceAt(lSolid, 52, 5.5, z), `x 52 at ${z}`).toBeUndefined();
  });

  it('z -11 over the hall (x 14..52): a 1.1 spandrel (top 5.6, AS2) with clear glass over it to the roof, the gallery door aside', () => {
    expect(kit.S3_VIEW_SPANDREL_TOP).toBe(5.6);
    const gx = kit.S3_DOORS.gallery[0];
    for (let x = 14.2; x < 51.9; x += 0.3) {
      if (Math.abs(x - gx) < 0.7) continue;
      expect(pieceAt(lSolid, x, 5.5, -11, false), `spandrel at ${x}`).toBeDefined();
      expect(pieceAt(lSolid, x, 5.7, -11, false), `solid over the spandrel at ${x}`).toBeUndefined();
      const g = pieceAt(lSolid, x, 5.7, -11);
      expect(g?.glass, `glass at ${x}`).toBe('clear');
      expect(bottom(g!)).toBeCloseTo(5.6, 6);
      expect(pieceAt(lSolid, x, 8.95, -11)?.glass, `glass to the roof at ${x}`).toBe('clear');
    }
    // the spandrel is the wall, solid from the floor
    expect(pieceAt(lSolid, 30, 4.6, -11, false)?.noLedge).toBe(true);
  });

  it('every L1 door of this lane is a 1.2 x 2.1 hole with its anchor (the brief 3.2 swing); the fire door is two 0.9 leaves opening north', () => {
    for (const id of MY_DOORS) {
      const [cx, cz, y] = kit.S3_DOORS[id];
      const ax = ALONG_X[id];
      const at = (a: number, h: number): [number, number, number] => (ax ? [cx + a, y + h, cz] : [cx, y + h, cz + a]);
      for (let a = -0.55; a <= 0.55; a += 0.11) for (let h = 0.05; h <= 2.05; h += 0.25) expect(pieceAt(lSolid, ...at(a, h)), `${id} hole at ${a}, ${h}`).toBeUndefined();
      expect(pieceAt(lSolid, ...at(-0.65, 0.5)), `${id} jamb -`).toBeDefined();
      expect(pieceAt(lSolid, ...at(0.65, 0.5)), `${id} jamb +`).toBeDefined();
      expect(pieceAt(lSolid, ...at(0, 2.15)), `${id} head`).toBeDefined();
      const d = bL.anchors.doors.find((q) => {
        const c = doorCentre(q);
        return hyp2(c[0] - cx, c[2] - cz) < 0.01 && Math.abs(c[1] - y) < 0.01;
      });
      expect(d, id).toBeDefined();
      expect(d!.width).toBe(1.2);
      expect(d!.height).toBe(2.1);
      expect(d!.swing).toBe(kit.S3_DOOR_SWING[id]);
      expect(d!.locked).toBe(false);
    }
    // the landing's fire double door (D:62): the hole x 11.1..12.9 on z -11, two 0.9 leaves hinged at the jambs, both
    // opening into the corridor (+z)
    for (let x = 11.15; x < 12.9; x += 0.15) for (let h = 0.05; h <= 2.05; h += 0.5) expect(pieceAt(lSolid, x, kit.S3_L1 + h, -11), `fire door at ${x}`).toBeUndefined();
    expect(pieceAt(lSolid, 11.0, kit.S3_L1 + 0.5, -11)).toBeDefined();
    expect(pieceAt(lSolid, 13.0, kit.S3_L1 + 0.5, -11)).toBeDefined();
    const leaves = bL.anchors.doors.filter((q) => Math.abs(q.hinge.z + 11) < 1e-6 && q.hinge.x < 14 && Math.abs(q.hinge.y - kit.S3_L1) < 1e-6);
    expect(leaves.length).toBe(2);
    expect(leaves.map((q) => q.hinge.x).sort((a, c) => a - c)).toEqual([11.1, 12.9]);
    for (const q of leaves) {
      expect(q.width).toBe(0.9);
      expect(doorCentre(q)[0]).toBeCloseTo(q.hinge.x < 12 ? 11.55 : 12.45, 6);
      expect(Math.cos(q.yaw + q.swing * (Math.PI / 2))).toBeCloseTo(1, 6);
    }
    // no other door anchors in this lane but the gallery's drop gate (R2b)
    expect(bL.anchors.doors.length).toBe(MY_DOORS.length + 2 + 1);
  });

  it('the landing: x 14 glass from the floor to the roof (the walkway door at 6.0 in it), a 1.1 rail inside, the ship ladder to the 6.0 platform, the ceiling but over the crane bay', () => {
    const wz = kit.S3_DOORS.walkway[1];
    for (const z of [-29.8, -29.7, -27.5, -24, -21.2, -14.3, -12, -11.2]) {
      expect(pieceAt(lSolid, 14, 4.6, z)?.glass, `glass foot at ${z}`).toBe('clear');
      expect(pieceAt(lSolid, 14, 8.95, z)?.glass, `glass head at ${z}`).toBe('clear');
      const r = pieceAt(lSolid, 13.8, 5.5, z, false);
      expect(r, `rail at ${z}`).toBeDefined();
      expect(top(r!)).toBeCloseTo(kit.S3_L1 + 1.1, 6);
    }
    expect(pieceAt(lSolid, 14, 5.9, wz)?.glass).toBe('clear');
    expect(pieceAt(lSolid, 14, 8.2, wz)?.glass).toBe('clear');
    // the west core's span (z -21..-14.5) is R3's wall, not this lane's glass
    expect(pieceAt(lSolid, 14, 6, -18)).toBeUndefined();
    const plat = pieceAt(lSolid, 13.2, 5.95, -29.1)!;
    expect(plat).toBeDefined();
    expect(extCm(plat)).toEqual([12.5, -29.85, 14, -28.35]);
    expect(top(plat)).toBeCloseTo(6.0, 6);
    const lad = bL.anchors.ladders.find((q) => Math.abs(q.base.y - kit.S3_L1) < 1e-6 && Math.abs(q.top.y - 6.0) < 1e-6);
    expect(lad).toBeDefined();
    expect(lad!.base.x).toBeCloseTo(12.05, 6);
    expect(lad!.base.z).toBeCloseTo(-29.1, 6);
    expect(lad!.top.x).toBeCloseTo(12.5, 6);
    const ceil = pieceAt(lSolid, 12, 7.45, -20)!;
    expect(ceil?.overhead).toBe(true);
    expect(top(ceil)).toBeCloseTo(7.5, 6);
    expect(pieceAt(lSolid, 12, 7.45, -29)).toBeUndefined();
  });

  it('the north rooms: partitions at x 21, 37.5, 47 (4.5..7.5, the doors aside), the core-slot strips at x 30, 33.5, 58, the z -7 wall and the write-up glass', () => {
    const C = kit.S3_CEIL_TOP;
    for (const x of [21, 37.5, 47]) {
      for (let z = -6.8; z < -0.2; z += 0.2) {
        if (x !== 21 && Math.abs(z + 3) < 0.7) continue;
        expect(pieceAt(lSolid, x, 5.0, z, false), `partition ${x} at ${z}`).toBeDefined();
        expect(pieceAt(lSolid, x, C - 0.05, z, false), `partition ${x} at ${z} to 7.5`).toBeDefined();
        expect(pieceAt(lSolid, x, C + 0.05, z, false), `partition ${x} at ${z} stops at 7.5`).toBeUndefined();
      }
    }
    for (const x of [30, 33.5, 58]) {
      expect(pieceAt(lSolid, x, 5.0, -0.25, false), `strip ${x}`).toBeDefined();
      expect(pieceAt(lSolid, x, 5.0, -3, false), `core wall ${x} is R3's`).toBeUndefined();
    }
    const doorXs = [kit.S3_DOORS.hoist[0], kit.S3_DOORS.gown[0], kit.S3_DOORS.storeHatch[0]];
    for (let x = 10.2; x < 63.9; x += 0.2) {
      const core = (x > 29.9 && x < 33.6) || (x > 57.9 && x < 61.6);
      if (core || doorXs.some((d) => Math.abs(x - d) < 0.7) || Math.abs(x - kit.S3_DOORS.writeup[0]) < 0.7) continue;
      const p = pieceAt(lSolid, x, 5.0, -7);
      expect(p, `z -7 at ${x}`).toBeDefined();
      if (x > 21.2 && x < 29.8) expect(p!.glass, `write-up glass at ${x}`).toBe('clear');
      else if (x < 20.8 || x > 30.2) expect(p!.glass, `z -7 wall at ${x}`).toBeUndefined();
    }
    // the store's shelving partition at x 53 (2.4): solid but the aisle gap z -4..-2.8 (D:70); the board shelf against x 58;
    // the write-up desk as built
    for (let z = -6.8; z < -0.2; z += 0.1) {
      const p = pieceAt(lSolid, 53, 5.5, z, false);
      if (z > -4 + 1e-6 && z < -2.8 - 1e-6) expect(p, `aisle gap at ${z}`).toBeUndefined();
      else if (z < -4.05 || z > -2.75) expect(p, `shelving at ${z}`).toBeDefined();
    }
    expect(top(pieceAt(lSolid, 53, 5.5, -5)!)).toBeCloseTo(kit.S3_L1 + 2.4, 6);
    expect(extCm(pieceAt(lSolid, 57.5, 5.0, -3.8)!)).toEqual([57.2, -5, 57.85, -2.6]);
    expect(extCm(pieceAt(lSolid, 25, 4.9, -5.1)!)).toEqual([24.2, -5.45, 25.8, -4.75]);
  });

  it('the security room: walls x 53 and z -18 to the roof (the chase sealed), the counters, the escape hatch with cover, rails and the ladder to the plant', () => {
    for (let z = -17.8; z < -11.2; z += 0.2) for (const y of [4.6, 7.0, 8.9]) expect(pieceAt(lSolid, 53, y, z, false), `x 53 at ${z}, ${y}`).toBeDefined();
    for (let x = 52.1; x < 63.9; x += 0.2) for (const y of [4.6, 7.0, 8.9]) expect(pieceAt(lSolid, x, y, -18, false), `z -18 at ${x}, ${y}`).toBeDefined();
    // the lobby's wall z -11 x 52..64 closes the chase's north end and holds the sec door (to the ceiling)
    for (let x = 52.1; x < 57.9; x += 0.2) expect(pieceAt(lSolid, x, 5.0, -11, false), `z -11 at ${x}`).toBeDefined();
    expect(top(pieceAt(lSolid, 53, 7.0, -11, false)!)).toBeCloseTo(kit.S3_CEIL_TOP, 6);
    const mon = pieceAt(lSolid, 58.9, 5.0, -15)!;
    expect(extCm(mon)).toEqual([58.6, -16, 59.25, -14]);
    expect(top(mon)).toBeCloseTo(kit.S3_L1 + 0.75, 6);
    const ket = pieceAt(lSolid, 63, 5.0, -11.9)!;
    expect(extCm(ket)).toEqual([62.4, -12.2, 63.85, -11.65]);
    expect(top(ket)).toBeCloseTo(kit.S3_L1 + 0.9, 6);
    // the hatch (1.0 x 1.0 at (54, -17)): rails 1.1 on its west and east edges, the open cover on its south edge, the north
    // edge the way on; the ladder from the plant floor to 4.5
    expect([...l1.S3_SEC_HATCH]).toEqual([53.5, -17.5, 54.5, -16.5]);
    for (const x of [53.45, 54.55]) {
      const r = pieceAt(lSolid, x, 5.0, -17, false)!;
      expect(r, `rail ${x}`).toBeDefined();
      expect(top(r)).toBeCloseTo(kit.S3_L1 + 1.1, 6);
    }
    expect(pieceAt(lSolid, 54, 5.0, -17.52, false)).toBeDefined();
    expect(pieceAt(lSolid, 54, 5.0, -16.45, false)).toBeUndefined();
    const lad = bL.anchors.ladders.find((q) => Math.abs(q.base.x - 54) < 1e-6 && Math.abs(q.base.z + 17) < 1e-6);
    expect(lad).toBeDefined();
    expect(lad!.base.y).toBe(0);
    expect(lad!.top.y).toBe(kit.S3_L1);
    expect(lad!.top.z).toBeGreaterThan(-17);
  });

  it('section 3 on: the whole campus builds with the L1 pieces in it', () => {
    expect(bAll.boxes.length).toBeGreaterThan(bL.boxes.length);
    expect(bAll.anchors.ladders.some((q) => Math.abs(q.base.x - 54) < 1e-6 && Math.abs(q.base.z + 17) < 1e-6)).toBe(true);
  });
});

describe('campus v2 S3 L1 (R2b)', () => {
  it('the crane walkway: 1.5 deep at 6.0 (x 14..52), the north-edge rail but at the ladders, caged ladders at x 18 and 51 from the hall floor', () => {
    const deck = pieceAt(lSolid, 30, 5.95, -29.1)!;
    expect(extCm(deck)).toEqual([14, -29.85, 52, -28.35]);
    expect(top(deck)).toBeCloseTo(6.0, 6);
    expect(deck.s[2]).toBeCloseTo(1.5, 6);
    for (const x of [15, 17.4, 18.6, 30, 50.4]) expect(top(pieceAt(lSolid, x, 6.5, -28.4, false)!), `rail at ${x}`).toBeCloseTo(7.1, 6);
    for (const x of [14.05, 18, 51, 51.7]) expect(pieceAt(lSolid, x, 6.5, -28.4, false), `no rail at ${x}`).toBeUndefined();
    for (const [x, z] of l1.S3_WALKWAY_LADDERS) {
      const lad = bL.anchors.ladders.find((q) => Math.abs(q.base.x - x) < 1e-6 && Math.abs(q.base.z - z) < 1e-6)!;
      expect(lad, `ladder ${x}`).toBeDefined();
      expect(lad.base.y).toBe(0);
      expect(lad.top.y).toBe(6.0);
      expect(lad.facing).toBeCloseTo(Math.PI, 6);
      expect(inBox(ext(deck), lad.top.x, lad.top.z)).toBe(true);
      // the cage hoops (S3:404): drawn only, no collision
      expect(bL.boxes.filter((p) => !p.collide && Math.abs(p.c[0] - x) < 1e-6 && Math.abs(p.c[2] - (z + 0.3)) < 1e-6).length).toBe(4);
    }
    expect(l1.S3_WALKWAY_LADDERS.map((l) => [...l])).toEqual([[18, -28.2], [51, -28.2]]);
  });

  it('the gallery (x 28..44) and spur (x 31..35 to z -14) at 4.5, the 3.0 bridge plate onto the chamber roof, rails on every open edge but the plate end, the drop gate at x 44', () => {
    const g = pieceAt(lSolid, 36, 4.45, -11.75)!;
    expect(extCm(g)).toEqual([28, -12.5, 44, -11]);
    expect(top(g)).toBeCloseTo(4.5, 6);
    const sp = pieceAt(lSolid, 33, 4.45, -13.25)!;
    expect(extCm(sp)).toEqual([31, -14, 35, -12.5]);
    const plate = pieceAt(lSolid, 33, 4.45, -14.25)!;
    expect(extCm(plate)).toEqual([31.5, -14.5, 34.5, -14]);
    expect(top(plate)).toBeCloseTo(4.5, 6);
    expect(bottom(plate)).toBeCloseTo(kit.S3_BOX.chamberTop, 6);
    const railAt = (x: number, z: number): boolean => {
      const p = pieceAt(lSolid, x, 5.0, z, false);
      return !!p && Math.abs(top(p) - 5.6) < 1e-6;
    };
    for (const x of [28.5, 30.9, 35.1, 43.8]) expect(railAt(x, -12.45), `south rail at ${x}`).toBe(true);
    for (const x of [31.5, 33, 34.5]) expect(railAt(x, -12.45), `spur opening at ${x}`).toBe(false);
    for (const z of [-12.4, -11.5]) expect(railAt(28.05, z), `west end at ${z}`).toBe(true);
    for (const z of [-13.9, -13, -12.6]) {
      expect(railAt(31.05, z), `spur west at ${z}`).toBe(true);
      expect(railAt(34.95, z), `spur east at ${z}`).toBe(true);
    }
    for (let x = 31.2; x < 34.9; x += 0.3) expect(pieceAt(lSolid, x, 5.0, -14.05), `plate end open at ${x}`).toBeUndefined();
    // the sprung drop gate: a 1.2 gate 1.1 high on the x 44 end, opening out over the drop (+x); a stub rail closes the rest
    const gate = bL.anchors.doors.find((q) => Math.abs(q.hinge.x - 44) < 1e-6 && Math.abs(q.hinge.y - 4.5) < 1e-6)!;
    expect(gate).toBeDefined();
    expect([gate.hinge.z, gate.width, gate.height]).toEqual([-12.5, 1.2, 1.1]);
    expect(Math.sin(gate.yaw + gate.swing * (Math.PI / 2))).toBeCloseTo(1, 6);
    expect(railAt(43.95, -11.2)).toBe(true);
    // one way down: no ladder or piece under the gate end to climb it from the hall floor
    expect(bL.anchors.ladders.some((q) => hyp2(q.base.x - 44, q.base.z + 11.75) < 3)).toBe(false);
    for (const y of [0.5, 2, 3.5]) expect(pieceAt(lSolid, 44.3, y, -11.9), `under the gate at ${y}`).toBeUndefined();
    // the chamber roof is reached from the gallery over the spur and the plate (on the stand-in chamber)
    const dist = nav.flowField([[36, -11.75]], undefined, [4.5]);
    expect(dist[nav.cellOf(33, -18, 4.4)]!).toBeLessThan(Infinity);
  });

  it('the hoist hatch (x 18..20.85, z -6..-3): rails on the north and south edges, the x 21 wall on the east, the west edge open (the CR3b lip), no ladder', () => {
    for (const z of [-6.05, -2.95]) {
      const r = pieceAt(lSolid, 19.4, 5.0, z, false)!;
      expect(r, `rail ${z}`).toBeDefined();
      expect(top(r)).toBeCloseTo(5.6, 6);
      expect(ext(r)[0]).toBeCloseTo(18, 6);
      expect(ext(r)[2]).toBeCloseTo(20.85, 6);
    }
    for (let z = -5.9; z < -3.1; z += 0.2) {
      expect(pieceAt(lSolid, 21, 5.0, z, false), `x 21 wall at ${z}`).toBeDefined();
      for (const y of [4.6, 5.2, 6.5]) expect(pieceAt(lSolid, 18, y, z), `west edge open at ${z}, ${y}`).toBeUndefined();
    }
    expect(bL.anchors.ladders.some((q) => q.base.x > 17.5 && q.base.x < 21 && q.base.z > -6.5 && q.base.z < -2.5)).toBe(false);
  });

  it('the ceilings (top 7.5, 0.1): over every L1 room and corridor; the crane bay open to the roof', () => {
    const at: readonly (readonly [string, number, number])[] = [
      ['s3-c2', 12, -20], ['s3-view', 30, -9], ['s3-view', 12, -9], ['s3-east', 58, -9], ['s3-hoist', 15, -3.5], ['s3-writeup', 25.5, -2],
      ['s3-gown', 35.5, -3.5], ['s3-clean', 42, -3.5], ['s3-store', 50, -5.5], ['s3-sec', 60, -14.5],
    ];
    for (const [id, x, z] of at) {
      const p = pieceAt(lSolid, x, 7.45, z)!;
      expect(p, `${id} at ${x}, ${z}`).toBeDefined();
      expect(p.overhead).toBe(true);
      expect(top(p)).toBeCloseTo(kit.S3_CEIL_TOP, 6);
      expect(bottom(p)).toBeCloseTo(kit.S3_CEIL_TOP - 0.1, 6);
    }
    for (const z of [-29.9, -28.5, -28.1]) expect(pieceAt(lSolid, 12, 7.45, z), `crane bay at ${z}`).toBeUndefined();
  });

  it('the void (x 20..58, z -7..0): a walk-on deck at 7.5, 1.5 clear to the roof, with only the maintenance hatch and the tile hole; the plenum wall z -7; off the guards\' grid', () => {
    expect(l1.S3_VOID_HOLES.map((h) => [...h])).toEqual([[20, -1.5, 21, -0.5], [48.9, -3.6, 50.1, -2.4]]);
    const [vx0, vz0, vx1, vz1] = kit.S3_BOX.voidDeck;
    expect([vx0, vz0, vx1, vz1]).toEqual([20, -7, 58, 0]);
    for (let x = vx0 + 0.1; x < vx1; x += 0.25) {
      for (let z = vz0 + 0.1; z < vz1; z += 0.25) {
        // the north core (its lid at 7.5 is R3's, P11)
        if (x > kit.S3_BOX.nCore[0] - 0.01 && x < kit.S3_BOX.nCore[2] + 0.01) continue;
        const hole = l1.S3_VOID_HOLES.some((h) => inBox(h, x, z, -0.01));
        if (l1.S3_VOID_HOLES.some((h) => inBox(h, x, z, 0.01)) && !hole) continue;
        // deck pieces only (the x 21 partition's top meets the deck under the hatch's east edge)
        const d = pieceAt(lSolid.filter((p) => p.overhead), x, 7.45, z);
        if (hole) expect(d, `hole at ${x}, ${z}`).toBeUndefined();
        else expect(d && Math.abs(top(d) - 7.5) < 1e-6 && Math.abs(bottom(d) - 7.4) < 1e-6, `deck at ${x}, ${z}`).toBe(true);
        if (z > -6.84 && z < -0.16) for (const y of [7.6, 8.3, 8.95]) expect(pieceAt(lSolid, x, y, z), `void clear at ${x}, ${y}, ${z}`).toBeUndefined();
      }
    }
    // the lifted tile lies on the deck beside its hole, drawn only
    expect(bL.boxes.some((p) => !p.collide && Math.abs(p.c[0] - 50.7) < 1e-6 && Math.abs(p.c[2] + 3) < 1e-6)).toBe(true);
    // the plenum wall z -7, 7.5 to 9.0, seals the corridor plenum (the cores' walls are R3's)
    for (let x = 10.2; x < 63.9; x += 0.3) {
      // (s3 join J2) over the north core too (no gap: an opening there led to the sealed chase); the east core's walls are R3's
      if (x > 57.9 && x < 61.6) continue;
      for (const y of [7.6, 8.9]) expect(pieceAt(lSolid, x, y, -7, false), `plenum wall at ${x}, ${y}`).toBeDefined();
    }
    // (s3 join J2) the softlock: the void reached the corridor ceiling deck over the north core, then the east lobby and
    // the sealed chase (x 52..53, z -18..-11) with no way out. The guards' nav has no cell at the void's height (below),
    // so the seal is the wall: z -7 from 7.5 to 9.0 with no gap over the north core
    for (let x = kit.S3_BOX.nCore[0] + 0.05; x < kit.S3_BOX.nCore[2]; x += 0.25) {
      for (const y of [7.55, 8.25, 8.95]) expect(pieceAt(lSolid, x, y, -7, false), `plenum wall over the north core at ${x}, ${y}`).toBeDefined();
    }
    // guards' nav: no walkable cell at the void's height anywhere (headroom 1.5 < 1.7)
    let voidCells = 0;
    for (let x = 20.25; x < 58; x += 0.5) for (let z = -6.75; z < 0; z += 0.5) if (layersAt(x, z) > 0 && nav.isWalkable(nav.cellOf(x, z, 7.5)) && Math.abs(nav.heightAt(x, z, 7.5) - 7.5) < 0.2) voidCells++;
    expect(voidCells).toBe(0);
    // the maintenance hatch: the goods racking (2.4, noLedge) and the ladder 4.5 -> 7.5 out of the hatch onto the deck (east)
    const rack = pieceAt(lSolid, 19.5, 5.5, -0.5)!;
    expect(extCm(rack)).toEqual([18.5, -0.8, 20.85, -0.15]);
    expect(top(rack)).toBeCloseTo(kit.S3_L1 + 2.4, 6);
    expect(rack.noLedge).toBe(true);
    const lad = bL.anchors.ladders.find((q) => Math.abs(q.base.y - kit.S3_L1) < 1e-6 && Math.abs(q.top.y - kit.S3_CEIL_TOP) < 1e-6)!;
    expect(lad).toBeDefined();
    expect(inBox(l1.S3_VOID_HOLES[0]!, lad.base.x, lad.base.z)).toBe(true);
    expect(lad.top.x + 0.3).toBeGreaterThan(21);
  });

  it('the L1 rooms: the graph ids, minY 4.5, no squads, none overlapping (storeys apart); the walkway, gallery, chamber roof and void are no rooms', () => {
    const r = l1.S3_ROOMS_L1;
    expect(r.map((q) => q.id)).toEqual(['s3-c2', 's3-view', 's3-east', 's3-hoist', 's3-writeup', 's3-gown', 's3-clean', 's3-store', 's3-sec']);
    const boxOf: Record<string, readonly number[]> = {
      's3-c2': kit.S3_BOX.landing, 's3-view': kit.S3_BOX.view, 's3-east': kit.S3_BOX.east, 's3-hoist': kit.S3_BOX.hoist, 's3-writeup': kit.S3_BOX.writeup,
      's3-gown': kit.S3_BOX.gown, 's3-clean': kit.S3_BOX.clean, 's3-store': kit.S3_BOX.store, 's3-sec': kit.S3_BOX.sec,
    };
    for (const q of r) {
      expect(q.minY, q.id).toBe(4.5);
      expect(q.squad ?? [], q.id).toEqual([]);
      expect([q.minX, q.minZ, q.maxX, q.maxZ], q.id).toEqual([...boxOf[q.id]!]);
      expect(s3.S3_ROOMS).toContain(q);
    }
    const rooms: RoomDef[] = s3.S3_ROOMS;
    for (let i = 0; i < rooms.length; i++) {
      for (let k = i + 1; k < rooms.length; k++) {
        const a = rooms[i]!;
        const c = rooms[k]!;
        // (s3 join J1) the stair cores overlap the rooms they rise through (smallest room wins in `roomAt`)
        if (['s3-wstair', 's3-nstair', 's3-estair'].includes(a.id) || ['s3-wstair', 's3-nstair', 's3-estair'].includes(c.id)) continue;
        const ox = Math.min(a.maxX, c.maxX) - Math.max(a.minX, c.minX);
        const oz = Math.min(a.maxZ, c.maxZ) - Math.max(a.minZ, c.minZ);
        const oy = Math.min(a.maxY ?? 99, c.maxY ?? 99) - Math.max(a.minY ?? -99, c.minY ?? -99);
        expect(ox > 0.01 && oz > 0.01 && oy > 0.01, `${a.id} overlaps ${c.id}`).toBe(false);
      }
    }
    for (const id of ['s3-walkway', 's3-gallery', 's3-chamber', 's3-void']) expect(rooms.some((q) => q.id === id), id).toBe(false);
  });

  it('the L1 nav seeds and the hide spot are on nav; the hide spot is >= 1.5 m from every door on its floor', () => {
    expect(l1.S3_NAV_SEEDS_L1.map((v) => [v.x, v.y, v.z])).toEqual([
      [12, 4.5, -20], [30, 4.5, -9], [58, 4.5, -9], [15, 4.5, -3.5], [25.5, 4.5, -2], [35.5, 4.5, -3.5], [42, 4.5, -3.5], [50, 4.5, -3.5],
      [60, 4.5, -14.5], [30, 6.0, -29.1], [36, 4.5, -11.75], [33, 4.4, -18],
    ]);
    for (const v of l1.S3_NAV_SEEDS_L1) expect(onNav(v.x, v.z, v.y), `seed ${v.x}, ${v.y}, ${v.z}`).toBe(true);
    for (const v of l1.S3_NAV_SEEDS_L1) expect(s3.S3_NAV_SEEDS).toContain(v);
    expect(l1.S3_HIDESPOTS_L1.length).toBe(1);
    const h = l1.S3_HIDESPOTS_L1[0]!.pos;
    expect([h.x, h.y, h.z]).toEqual([11, 4.5, -1.0]);
    expect(onNav(h.x, h.z, h.y)).toBe(true);
    for (const d of bL.anchors.doors) {
      const c = doorCentre(d);
      if (Math.abs(c[1] - h.y) < 1) expect(hyp2(c[0] - h.x, c[2] - h.z), `hide vs door ${c}`).toBeGreaterThanOrEqual(1.5);
    }
  });

  it('nav layers: no column holds more than navLayers 5 walkable surfaces (G, L1, the walkway, the roof top; the void is none)', () => {
    let worst = 0;
    for (let x = 10.25; x < 64; x += 0.5) for (let z = -29.75; z < 0; z += 0.5) worst = Math.max(worst, layersAt(x, z));
    expect(worst).toBeGreaterThan(2);
    expect(worst).toBeLessThanOrEqual(5);
  });
});
