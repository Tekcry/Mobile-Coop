/**
 * (campus-greybox S2-G4, `docs/campus-greybox/briefs/S2.md` section 4) Section 2's L2 and roof in the v2 layout, flag on:
 * the L2 doors (C13: office A's second door, office B's side door, the board room re-cut with two doors, pg-exec's door kept),
 * the roof plant room with its floor hatch and cat ladder (C14, BA9), the window-cleaning davit and its rope to the sunshade
 * window (C12), and the nav's five-layer limit per column.
 */
import { describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder as LB } from '../src/world/levelBuilder';
import { NavGrid, type NavSample } from '../src/ai/navGrid';
import { hyp2 } from '../src/core/mathx';
import { RAPPEL } from '../src/config/movement';
import type { Flight } from '../src/world/maps/campusV2/s2';


/** Loads the campus modules fresh with `flags.campusV2 = v2` (the selection is made at load, as on a page). */
async function loadCampus(v2: readonly number[]) {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = v2;
  const sections = await import('../src/world/maps/campusSections');
  const { buildCampus } = await import('../src/world/maps/campusOps');
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  const s2 = await import('../src/world/maps/campusV2/s2');
  const s2Dress = await import('../src/world/maps/campusV2/s2Dress');
  const live2Dress = await import('../src/world/maps/campusS2Dress');
  const dress = await import('../src/world/maps/campusDress');
  const { CampusDresser } = await import('../src/world/campusArt/dresser');
  return { sections, buildCampus, LevelBuilder, s2, s2Dress, live2Dress, dress, CampusDresser };
}

const m = await loadCampus([2]);
const S2 = m.s2;
const b: LB = new m.LevelBuilder();
m.buildCampus(b, { dress: false });

/** The plain collision boxes (quarter turns swapped to plain; pitched pieces, the stair ramps and rails, left out). */
const solid: BoxPiece[] = [];
for (const p of b.boxes) {
  if (!p.collide || Math.abs(p.pitch) > 1e-3) continue;
  const q = Math.abs(Math.sin(p.yaw));
  if (q < 1e-3) solid.push(p);
  else if (Math.abs(q - 1) < 1e-3) solid.push({ ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 });
}

/** A flight's ramp surface at (x, z): its height, or NaN outside it. */
function flightH(f: Flight, x: number, z: number): number {
  const dx = x - f.cx;
  const dz = z - f.cz;
  const along = dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw);
  const across = dx * Math.cos(f.yaw) - dz * Math.sin(f.yaw);
  if (Math.abs(across) > f.w / 2 || Math.abs(along) > f.len / 2) return Number.NaN;
  return f.y0 + (f.rise * (along + f.len / 2)) / f.len;
}

/** The analytic nav grid of a rectangle (the live S2 test's raster): blockers, fences, cylinders, the flights, ladder links. */
function analyticNav(rect: readonly [number, number, number, number], cell = 0.5, layers = 5): NavGrid {
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
      if (Math.abs(x - p.c[0]) <= p.s[0] / 2 && Math.abs(z - p.c[2]) <= p.s[2] / 2) out.push({ h: p.c[1] + p.s[1] / 2, bottom: p.c[1] - p.s[1] / 2 });
    }
    for (const f of S2.S2_FLIGHTS) {
      const h = flightH(f, x, z);
      if (h === h) out.push({ h, bottom: h - 0.35 });
    }
    return out.sort((a, q) => q.h - a.h);
  };
  const blockers = near.filter((p) => !p.overhead).map((p) => ({ cx: p.c[0], cz: p.c[2], hx: p.s[0] / 2, hz: p.s[2] / 2, yaw: p.yaw, bottom: p.c[1] - p.s[1] / 2, top: p.c[1] + p.s[1] / 2 }));
  for (const f of b.anchors.fences) blockers.push({ cx: (f.a.x + f.b.x) / 2, cz: (f.a.z + f.b.z) / 2, hx: 0.05, hz: f.len / 2, yaw: Math.atan2(f.tx, f.tz), bottom: f.a.y, top: f.a.y + f.height });
  const links = b.anchors.ladders.map((l) => {
    const fx = Math.sin(l.facing);
    const fz = Math.cos(l.facing);
    const sx = l.base.x - fx * 0.32;
    const sz = l.base.z - fz * 0.32;
    return { kind: 'ladder' as const, twoWay: true, pts: [l.base.x - fx * 0.7, l.base.y, l.base.z - fz * 0.7, sx, l.base.y, sz, sx, l.top.y, sz, l.top.x + fx * 0.3, l.top.y, l.top.z + fz * 0.3] };
  });
  return new NavGrid({
    minX, maxX, minZ, maxZ, cell, agentRadius: 0.32, stepHeight: 0.45, layers, blockers, links,
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

const nav = analyticNav([-46, -34, 12, 8]);
const onNav = (x: number, z: number, y = 0): boolean => nav.isWalkable(nav.cellOf(x, z, y)) && Math.abs(nav.heightAt(x, z, y) - y) < 0.6;
/** The door anchor whose plan centre is (x, z) on floor y (the centre `Doors` computes from the hinge). */
const doorAt = (x: number, z: number, y: number) =>
  b.anchors.doors.find((d) => Math.abs(d.hinge.y - y) < 0.01 && hyp2(d.hinge.x + Math.sin(d.yaw) * d.width * 0.5 - x, d.hinge.z + Math.cos(d.yaw) * d.width * 0.5 - z) < 0.05);

const L2 = 8.4;
const FR = 12.3;
/** A wall or glass piece along the line (along x at z = at, or along z at x = at) over [a, e] at body height on floor y, or a door there. */
const lineCovered = (alongX: boolean, at: number, a: number, e: number, y: number): boolean => {
  const plain = b.boxes.filter((p) => p.collide && Math.abs(p.pitch) < 1e-3).map((p) => (Math.abs(Math.abs(Math.sin(p.yaw)) - 1) < 1e-3 ? { ...p, s: [p.s[2], p.s[1], p.s[0]] as [number, number, number] } : p));
  const pieces = plain.filter((p) => p.c[1] - p.s[1] / 2 < y + 1 && p.c[1] + p.s[1] / 2 > y + 1 && (alongX ? Math.abs(p.c[2] - at) < p.s[2] / 2 + 0.01 : Math.abs(p.c[0] - at) < p.s[0] / 2 + 0.01));
  for (let t = a + 0.05; t < e; t += 0.1) {
    const hit = pieces.some((p) => (alongX ? Math.abs(t - p.c[0]) <= p.s[0] / 2 + 1e-6 : Math.abs(t - p.c[2]) <= p.s[2] / 2 + 1e-6));
    const door = b.anchors.doors.some((d) => Math.abs(d.hinge.y - y) < 0.01 && (alongX ? Math.abs(d.hinge.z - at) < 0.01 && t >= d.hinge.x - 0.01 && t <= d.hinge.x + d.width + 0.01 : Math.abs(d.hinge.x - at) < 0.01 && t >= d.hinge.z - 0.01 && t <= d.hinge.z + d.width + 0.01));
    if (!hit && !door) return false;
  }
  return true;
};

describe('S2-G4 L2 rooms and doors (C13)', () => {
  it('the board room: box x -7.5..-0.2, z -2.5..6 enclosed (south wall moved to z -2.5, shut to the core line), two doors (-4, -2.5) and (-7.5, 3)', () => {
    expect(lineCovered(true, -2.5, -7.5, -0.2, L2)).toBe(true);
    expect(lineCovered(false, -0.1, -2.5, 5.8, L2)).toBe(true);
    expect(lineCovered(false, -7.5, -2.5, 6, L2)).toBe(true);
    expect(lineCovered(true, 6, -7.5, -0.2, L2)).toBe(true);
    for (const [x, z] of [[-4, -2.5], [-7.5, 3]] as const) {
      const d = doorAt(x, z, L2)!;
      expect(d, `board room door (${x}, ${z})`).toBeTruthy();
      expect(d.width).toBeCloseTo(1.2);
    }
    // the old z 0 south wall is gone
    expect(doorAt(-4, 0, L2)).toBeUndefined();
    expect(solid.some((p) => Math.abs(p.c[2]) < 1e-6 && p.c[0] < -0.2 && p.c[0] > -7.5 && Math.abs(p.c[1] - p.s[1] / 2 - L2) < 1e-6)).toBe(false);
    // the board room's floor is on the nav and both doors join it to the wing and the north plan
    expect(onNav(-4, 2, L2)).toBe(true);
    expect(nav.findPath([-4, 2], [-4, -5], 100000, L2, L2)).not.toBeNull();
    expect(nav.findPath([-4, 2], [-10, 3], 100000, L2, L2)).not.toBeNull();
  });

  it('office A has two doors on the south ring (-24, -22.5) and (-20, -22.5); office B a side door (-7.5, -26) into the wing beside its ring door (-10, -22.5)', () => {
    for (const [x, z] of [[-24, -22.5], [-20, -22.5], [-10, -22.5], [-7.5, -26]] as const) expect(doorAt(x, z, L2), `door (${x}, ${z})`).toBeTruthy();
    // office B is a through-office: the south ring to the L2 wing by its two doors
    expect(nav.findPath([-10, -24], [-5, -26], 100000, L2, L2)).not.toBeNull();
    expect(lineCovered(true, -22.5, -28.5, -7.5, L2)).toBe(true);
    expect(lineCovered(false, -7.5, -30, 6, L2)).toBe(true);
  });

  it('the pg-exec door (-33, -4) and the executive suite east door (-30, 1) stay on L2; the wing north door (-7.5, -3) is passable beside the board room corner', () => {
    expect(doorAt(-33, -4, L2)).toBeTruthy();
    expect(doorAt(-30, 1, L2)).toBeTruthy();
    expect(doorAt(-7.5, -3, L2)).toBeTruthy();
    // the north strip to the wing through (-7.5, -3) only (the south door and office B shut)
    const shutBoxes: [number, number, number, number][] = [[-7.9, -21.6, -7.1, -20.4], [-7.9, -26.6, -7.1, -25.4], [-7.9, 2.4, -7.1, 3.6], [-4.6, -2.9, -3.4, -2.1]];
    const off: number[] = [];
    for (let i = 0; i < nav.walk.length; i++) {
      if (!nav.walk[i] || Math.abs(nav.height[i]! - L2) > 1) continue;
      const [x, z] = nav.center(i % nav.cols);
      if (shutBoxes.some(([x0, z0, x1, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1)) {
        nav.walk[i] = 0;
        off.push(i);
      }
    }
    try {
      expect(nav.findPath([-10, -3], [-5, -5], 100000, L2, L2)).not.toBeNull();
    } finally {
      for (const i of off) nav.walk[i] = 1;
    }
  });
});

describe('S2-G4 the roof plant room, its hatch and the davit (C14, C12)', () => {
  const R = S2.ROOF_PLANT;
  it('the roof plant room: x -20.5..-12, z 0..6, walls 4.0 high, a roof on top, the door (-16, 0); the north parapet stops at its walls', () => {
    expect([R.x0, R.x1, R.z0, R.z1, R.h]).toEqual([-20.5, -12, 0, 6, 4.0]);
    const walls = solid.filter((p) => Math.abs(p.c[1] - p.s[1] / 2 - FR) < 1e-6 && Math.abs(p.c[1] + p.s[1] / 2 - (FR + 4)) < 1e-6 && p.c[0] > -20.7 && p.c[0] < -11.8 && p.c[2] > -0.2 && p.c[2] < 6.1);
    expect(walls.length).toBeGreaterThanOrEqual(4);
    expect(walls.every((p) => p.noLedge)).toBe(true);
    expect(lineCovered(true, 0, R.x0, R.x1, FR)).toBe(true);
    expect(lineCovered(true, 5.9, R.x0, R.x1, FR)).toBe(true);
    expect(lineCovered(false, R.x0, 0, 6, FR)).toBe(true);
    expect(lineCovered(false, R.x1, 0, 6, FR)).toBe(true);
    const roof = solid.find((p) => Math.abs(p.c[1] + p.s[1] / 2 - (FR + 4)) < 1e-6 && p.s[0] > 8 && p.s[2] > 6)!;
    expect(roof).toBeTruthy();
    expect(roof.overhead && roof.noLedge).toBe(true);
    const d = doorAt(-16, 0, FR)!;
    expect(d).toBeTruthy();
    expect(d.width).toBeCloseTo(1.2);
    // no parapet piece over x -20.5..-12 on the north edge
    expect(solid.some((p) => Math.abs(p.c[2] - 5.9) < 1e-6 && Math.abs(p.c[1] - (FR + 0.55)) < 1e-6 && p.c[0] - p.s[0] / 2 < R.x1 - 0.01 && p.c[0] + p.s[0] / 2 > R.x0 + 0.01)).toBe(false);
    // the room is walkable inside and reached from the roof by its door
    expect(onNav(-16, 4.5, FR)).toBe(true);
    expect(nav.findPath([-16, -2], [-16, 4.5], 100000, FR, FR)).not.toBeNull();
  });

  it('the hatch (x -18.5..-17.5, z 2.5..3.5) is a hole in the roof slab with a 1.1 rail on three sides, its cat ladder (-18, 3) facing 0 links L2 to the roof plant room', () => {
    const H = S2.ROOF_HATCH;
    expect([H.x0, H.x1, H.z0, H.z1]).toEqual([-18.5, -17.5, 2.5, 3.5]);
    expect(solid.some((p) => Math.abs(p.c[1] + p.s[1] / 2 - FR) < 1e-6 && Math.abs(-18 - p.c[0]) < p.s[0] / 2 - 0.05 && Math.abs(3 - p.c[2]) < p.s[2] / 2 - 0.05)).toBe(false);
    const rails = solid.filter((p) => Math.abs(p.c[1] - (FR + 0.55)) < 1e-6 && Math.abs(p.s[1] - 1.1) < 1e-6 && p.c[0] > -18.7 && p.c[0] < -17.3 && p.c[2] > 2.3 && p.c[2] < 3.7);
    expect(rails.length).toBe(3);
    expect(rails.every((p) => p.noLedge)).toBe(true);
    const l = b.anchors.ladders.filter((a) => a.base.x === -18 && a.base.z === 3);
    expect(l.length).toBe(1);
    expect(l[0]!.base.y).toBe(L2);
    expect(l[0]!.top.y).toBeCloseTo(FR);
    expect(l[0]!.facing).toBe(0);
    const from: [number, number] = [-18, 2.0];
    const to: [number, number] = [-18, 4.6];
    const p = nav.findPath(from, to, 400000, L2, FR)!;
    expect(p).not.toBeNull();
    let len = 0;
    let q: readonly number[] = from;
    for (const w of p) {
      len += hyp2(w[0]! - q[0]!, w[1]! - q[1]!);
      q = w;
    }
    expect(len).toBeLessThan(6);
  });

  it('the davit: a rappel at (-4, 12.3, 5.8), 7.9 m, rope out north; its foot stands on the sunshade (4.4) beside the facilities window (the rope-to-window case)', () => {
    const r = b.anchors.rappels.filter((a) => a.top.x === -4 && a.top.z === 5.8);
    expect(r.length).toBe(1);
    const a = r[0]!;
    expect(a.top.y).toBe(FR);
    expect(a.length).toBeCloseTo(7.9);
    expect(a.nx).toBeCloseTo(0);
    expect(a.nz).toBeCloseTo(1);
    // the body on the rope at its foot: the rope's standoff out from the wall, 7.9 down (4.4: the sunshade top)
    const px = a.top.x + a.nx * RAPPEL.standoff;
    const pz = a.top.z + a.nz * RAPPEL.standoff;
    const py = a.top.y - a.length;
    expect(py).toBeCloseTo(4.4);
    expect(px > -7 && px < -1 && pz > 6 && pz < 7.2).toBe(true);
    // `attachController.windowBeside`: a window in the rope's wall, its normal along the rope's, beside the body (0..1.4 out,
    // within reach sideways) with its sill within 0.8 of the feet + 0.6
    const w = b.anchors.windows.find((q) => Math.abs(Math.sin(q.yaw) * a.nx + Math.cos(q.yaw) * a.nz) >= 0.9 && (() => {
      const off = (px - q.c.x) * a.nx + (pz - q.c.z) * a.nz;
      const lat = Math.abs((px - q.c.x) * -a.nz + (pz - q.c.z) * a.nx);
      return off >= 0 && off <= 1.4 && lat <= Math.max(RAPPEL.windowReach, q.w / 2) && Math.abs(q.sillHeight - (py + 0.6)) <= 0.8;
    })());
    expect(w, 'the facilities window').toBeTruthy();
    expect([w!.c.x, w!.c.z]).toEqual([-4, 6]);
    // the rope time: 7.9 / RAPPEL.descend (0.6) = 13 s (PG:66 says 16 s with the window vault)
    expect(a.length / RAPPEL.descend).toBeCloseTo(13.2, 1);
  });
});

describe('S2-G4 nav layers', () => {
  it('every column of the building has at most 5 walkable surfaces (the roof plant room roof is the 5th; navLayers 5)', () => {
    const wide = analyticNav([-46, -34, 6, 8], 0.5, 8);
    let worst = 0;
    let at = '';
    for (let col = 0; col < wide.cols; col++) {
      let n = 0;
      for (let l = 0; l < wide.layers; l++) if (wide.surf[l * wide.cols + col]) n++;
      if (n > worst) {
        worst = n;
        at = wide.center(col).join(', ');
      }
    }
    expect(worst, `a column with ${worst} surfaces at (${at})`).toBeLessThanOrEqual(5);
    // the roof plant room's column: G, L1, L2, the room's floor (roof) and its roof
    const c = wide.cellOf(-14, 4, 0) % wide.cols;
    let n = 0;
    for (let l = 0; l < wide.layers; l++) if (wide.surf[l * wide.cols + c]) n++;
    expect(n).toBe(5);
  });
});
