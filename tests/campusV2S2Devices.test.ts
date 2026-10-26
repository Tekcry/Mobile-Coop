/**
 * (campus-greybox S2-G5a, `docs/campus-greybox/briefs/S2.md` section 5) Section 2's Split Shift devices in the v2 data, flag
 * on ("Approve as drawn"; data only, no engine change): the switchgear board (sync-s2-power), the reception board
 * (sync-s2-atrium), the comms patch panel desk (sync-s2-comms), the facilities keypads (sync-s2-kpfac), the overhear and the
 * plant log (sync-s2-kitchen, sync-s2-plantlog), the two-player pair gates (sync-s2-pairdoor, pg-exec; Q21), the BA4-BA6
 * lamps and the BA16 note; each device at its `SYNC.md` (7c021f01) position.
 */
import { describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder as LB } from '../src/world/levelBuilder';
import { NavGrid, type NavSample } from '../src/ai/navGrid';
import { hyp2 } from '../src/core/mathx';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { checkSectors, INTEL_LINE_MAX, type SectorDef } from '../src/game/sectors';
import { DESK_POST_RADIUS } from '../src/game/sectorDesks';
import { MAX_ITEMS, COURSE_MAX } from '../src/net/protocol';
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
  const s2Data = await import('../src/world/maps/campusV2/s2Data');
  const sectors = await import('../src/world/maps/campusSectors');
  return { sections, buildCampus, LevelBuilder, s2, s2Dress, live2Dress, dress, CampusDresser, s2Data, sectors };
}

const m = await loadCampus([2]);
const S2 = m.s2;
const b: LB = new m.LevelBuilder();
const lay = m.buildCampus(b, { dress: false });

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
const L1 = 4.4;
const SEC: SectorDef = m.s2Data.S2_SECTOR;
const G = S2.S2_GROUPS;
/** A walkable nav cell on floor y within r of (x, z): a switch or panel stands on a wall, its user beside it. */
const nearNav = (x: number, z: number, y: number, r = 1.1): boolean => {
  for (let dx = -r; dx <= r; dx += 0.25) for (let dz = -r; dz <= r; dz += 0.25) if (hyp2(dx, dz) <= r && onNav(x + dx, z + dz, y)) return true;
  return false;
};
const src = readFileSync(path.resolve(__dirname, '../src/world/maps/campusV2/s2.ts'), 'utf8') + readFileSync(path.resolve(__dirname, '../src/world/maps/campusV2/s2Data.ts'), 'utf8');
const graph = JSON.parse(readFileSync(path.resolve(__dirname, '../docs/sector-redesign/graph/v2/campusOps-S2.json'), 'utf8')) as { syncs: { id: string }[] };
/** The doors as `Doors` finds them (`nearest`, the first of equal distances kept; DOOR_FIND 1.2): [centre x, z, hinge y]. */
const doorList = b.anchors.doors.map((d) => ({ d, cx: d.hinge.x + Math.sin(d.yaw) * d.width * 0.5, cz: d.hinge.z + Math.cos(d.yaw) * d.width * 0.5 }));
const nearestDoor = (x: number, z: number, r = 1.2) => {
  let best: (typeof doorList)[number] | null = null;
  let bd = r;
  for (const q of doorList) {
    const k = hyp2(q.cx - x, q.cz - z);
    if (k < bd) {
      bd = k;
      best = q;
    }
  }
  return best;
};

describe('S2-G5a the sector data checks', () => {
  it('checkSectors is [] with the map security (codes found before use, lines <= 60, talkers are guard indices, keys apart, the desk\'s cameras in S2); no pair gate carries a soloWindow', () => {
    expect(m.sectors.CAMPUS_SECTORS[1]).toBe(SEC);
    expect(checkSectors(m.sectors.CAMPUS_SECTORS, undefined, m.sectors.CAMPUS_SECURITY)).toEqual([]);
    for (const n of SEC.intel ?? []) expect(n.line.length).toBeLessThanOrEqual(INTEL_LINE_MAX);
    for (const g of SEC.pairGates ?? []) {
      expect('soloWindow' in g).toBe(false);
      expect(g.window).toBeUndefined();
      expect(g.a.y).toBeUndefined();
      expect(g.b.y).toBeUndefined();
    }
    expect(m.sectors.CAMPUS_SECURITY.desks!.filter((d) => d.section === 1)).toEqual(m.s2Data.S2_DESKS);
  });

  it('the switchgear board is groups [55, 56] with no window: cutting it darkens the facilities lamp and both wing downlights, nothing else', () => {
    const sg = S2.S2_BOARDS.find((q) => q.pos.x === 0.3)!;
    expect(sg.groups).toEqual([55, 56]);
    expect(sg.window).toBeUndefined();
    const reg = b.lights;
    const before = reg.lights.map((l) => l.on);
    try {
      for (const g of sg.groups) reg.setGroup(g, false);
      const off = reg.lights.filter((l, i) => before[i] && !l.on).map((l) => [l.x, l.y, l.z]);
      expect(off.sort()).toEqual([[-3.5, 7.9, -16], [-4, 7.9, -2], [-4, 7.9, 3]].sort());
    } finally {
      for (const g of sg.groups) reg.setGroup(g, true);
    }
    expect(reg.lights.map((l) => l.on)).toEqual(before);
  });

  it('BA4-BA6: the wing downlights replace the night lamp; the K2 landing downlight on 53 with its switch; the goods-door bulkhead on 58, unswitched', () => {
    const ls = b.lights.lights;
    expect(ls.filter((l) => l.group === G.l1Cor).map((l) => [l.x, l.z, l.intensity])).toEqual([[-4, -2, 0.8], [-3.5, -16, 0.8]]);
    expect(ls.some((l) => l.x === -3 && l.y === 7.9 && l.z === -1.5)).toBe(false);
    expect(G.landing).toBe(53);
    expect(ls.filter((l) => l.group === 53).map((l) => [l.x, l.y, l.z])).toEqual([[1.5, 7.9, -15.8]]);
    const sw = S2.S2_SWITCHES.filter((q) => q.group === 53);
    expect(sw.map((q) => [q.pos.x, q.pos.y, q.pos.z, q.yaw])).toEqual([[2.6, 4.4, -11, Math.PI]]);
    const goods = ls.find((l) => l.x === -43.6 && l.z === -16)!;
    expect(goods).toBeTruthy();
    expect([goods.y, goods.group, goods.intensity]).toEqual([2.6, G.gCor, 0.8]);
    expect(S2.S2_SWITCHES.some((q) => q.group === G.gCor)).toBe(false);
    // the facilities lamp (55) and the reception downlight (50) stay
    expect(ls.some((l) => l.x === -4 && l.y === 7.9 && l.z === 3 && l.group === G.facilities)).toBe(true);
    expect(ls.some((l) => l.x === -20 && l.y === 3.9 && l.z === -26.5 && l.group === G.atrium)).toBe(true);
    for (const l of ls.filter((q) => q.group >= 50 && q.group <= 58 && q.x > -44.5 && q.x < 4.5 && q.z > -30.5 && q.z < 6.5)) expect(l.on && l.intensity > 0 && l.destructible && l.electric, `lamp (${l.x}, ${l.z})`).toBe(true);
  });

  it('each keypad and pair gate finds its door with Doors.nearest (DOOR_FIND 1.2) on the right floor', () => {
    const want: [string, number, number, number][] = [
      ['keypad wing door', -4, -1, L1],
      ['keypad west door', -7.5, 3, L1],
      ['pg-brg', -2.5, -16, L1],
      ['pg-exec', -33, -4, 8.4],
    ];
    for (const [what, x, z, y] of want) {
      const d = nearestDoor(x, z)!;
      expect(d, what).toBeTruthy();
      expect(d.d.hinge.y, what).toBe(y);
      expect(hyp2(d.cx - x, d.cz - z), what).toBeLessThan(0.05);
    }
    expect((SEC.keypads ?? []).map((k) => [...k.at])).toEqual([[-4, -1], [-7.5, 3]]);
    expect((SEC.pairGates ?? []).map((g) => [...g.door])).toEqual([[-2.5, -16], [-33, -4]]);
  });

  it('every sync id is in s2.ts / s2Data.ts (in a // comment) and the graph\'s syncs ids equal SYNC.md\'s S2 rows; sync-s2-atrium is not renamed; the keypad keeps the SPEC id kp-fac', () => {
    const ids = ['sync-s2-comms', 'sync-s2-power', 'sync-s2-atrium', 'sync-s2-kpfac', 'sync-s2-kitchen', 'sync-s2-plantlog', 'sync-s2-pairdoor'];
    for (const id of ids) expect(src.includes(`// ${id}`), id).toBe(true);
    expect(graph.syncs.map((q) => q.id)).toEqual(ids);
    expect(src.includes('kp-fac')).toBe(true);
    expect(src.includes('// lead for sync-s2-plantlog')).toBe(true);
  });
});

describe('S2-G5a SYNC.md device positions (7c021f01)', () => {
  it('patch panel (sync-s2-comms): (3.6, 4.4, -6.5), operator #8 (SYNC.md:16)', () => {
    // SYNC.md:16 "SecurityDesk as a patch panel ... at (3.6,4.4,-6.5), operator S2 guard #8 ... cameras cam-turnstile, cam-lift, cam-bridge"
    const d = m.s2Data.S2_DESKS.find((q) => q.id === 'desk-comms2')!;
    expect([d.at[0], d.y, d.at[1]]).toEqual([3.6, 4.4, -6.5]);
    expect(d.operator).toBe(7);
    expect(d.section).toBe(1);
    expect(d.yaw).toBeCloseTo(-Math.PI / 2);
    expect(d.cameras).toEqual(['cam-turnstile', 'cam-lift', 'cam-bridge']);
    // #8's panel stop (2.2, -6.5) is within the desk's post radius; the panel stands in the comms room, by the nav
    const op = SEC.guards[7]!;
    expect(op.route!.some((p) => hyp2(p[0] - d.at[0], p[1] - d.at[1]) <= DESK_POST_RADIUS)).toBe(true);
    expect(nearNav(3.6, -6.5, L1)).toBe(true);
  });

  it('switchgear board (sync-s2-power): (0.3, 0, -22), groups 55 + 56, no window (SYNC.md:17)', () => {
    // SYNC.md:17 "breaker BoardDef, no window ... at (0.3,0,-22) on S2_GROUPS.facilities 55 + l1Cor 56"
    const q = S2.S2_BOARDS.find((x) => x.groups.includes(55))!;
    expect([q.pos.x, q.pos.y, q.pos.z]).toEqual([0.3, 0, -22]);
    expect(q.groups).toEqual([55, 56]);
    expect(q.window).toBeUndefined();
    expect(q.yaw).toBeCloseTo(-Math.PI / 2);
  });

  it('reception board (sync-s2-atrium): (-8.4, 0, -28.5), group 50 (SYNC.md:18, S2:192)', () => {
    // SYNC.md:18 "src/world/maps/campusS2.ts:192 (built: S2_BOARDS, group 50)"; S2-detail.md:181 "(-8.4,-28.5)"
    const q = S2.S2_BOARDS.find((x) => x.groups.includes(50))!;
    expect([q.pos.x, q.pos.y, q.pos.z]).toEqual([-8.4, 0, -28.5]);
    expect(q.groups).toEqual([50]);
    expect(q.window).toBeUndefined();
  });

  it('facilities keypads (sync-s2-kpfac): (-4, -1) and (-7.5, 3), code s2-fac-code (SYNC.md:19, D:78)', () => {
    // SYNC.md:19 "SectorKeypad, code s2-fac-code, on both facilities doors"; S2-detail.md:78 "Doors (-4,-1) and (-7.5,3), both sync-s2-kpfac"
    expect(SEC.keypads).toEqual([{ at: [-4, -1], code: 's2-fac-code' }, { at: [-7.5, 3], code: 's2-fac-code' }]);
  });

  it('overhear (sync-s2-kitchen): a 2 x 2 box at (-31, -26) on L1, talkers #5-6, grants s2-fac-code (SYNC.md:20)', () => {
    // SYNC.md:20 "SectorIntel overhear ... box 2 x 2 outside the kitchen west door (-31,-26), talkers #5-6, grants s2-fac-code"
    const n = SEC.intel!.find((q) => q.kind === 'overhear')!;
    expect(n.kind === 'overhear' && n).toMatchObject({ grants: 's2-fac-code', box: [-32, -27, -30, -25], floorY: 4.4, talkers: [4, 5] });
    expect(n.line).toBe('Kitchen: the facilities keypad code, overheard.');
    // the box is outside the kitchen's west door (x -30, z -26), on the nav
    expect(nearNav(-31, -26, L1, 0.5)).toBe(true);
  });

  it('plant log (sync-s2-plantlog): (-41.5, 0, -18.5), grants s2-board (SYNC.md:21); read from the aisle north of cage 3', () => {
    // SYNC.md:21 "SectorIntel board ... in parcel cage 3 (-41.5,0,-18.5), grants s2-board"
    const n = SEC.intel!.find((q) => q.kind === 'board')!;
    expect(n.kind === 'board' && n).toMatchObject({ grants: 's2-board', at: [-41.5, 0, -18.5], yaw: 0 });
    expect(n.line).toBe('Plant log: east-wing breaker, plant room switchgear.');
    // cage 3 is the as-built cage at (-41.5, -18.5); the "Read" item's reach is the default 1.8 in plan (`Interactables.nearest`)
    expect(solid.some((p) => p.c[0] === -41.5 && p.c[2] === -18.5 && Math.abs(p.s[1] - 1.8) < 1e-6)).toBe(true);
    let reached = false;
    for (let dx = -1.8; dx <= 1.8; dx += 0.25) for (let dz = -1.8; dz <= 1.8; dz += 0.25) if (hyp2(dx, dz) < 1.8 && onNav(-41.5 + dx, -18.5 + dz, 0)) reached = true;
    expect(reached).toBe(true);
    expect(onNav(-41.5, -17.25, 0)).toBe(true);
  });

  it('pg-brg (sync-s2-pairdoor): door (-2.5, -16), keys a (-3.1, -16.8) and b (-1.9, -9.9), two players, no soloWindow (Q21; SYNC.md:22, D:185); pg-exec (-33, -4) keys (-34.8, -4.6) / (-31.2, -4.6)', () => {
    // SYNC.md:22 "SectorPairGate pg-brg (src/game/sectors.ts:410, E3)"; S2-detail.md:185 "key b in the comms room then key a in the wing (11.8 m)"
    const [brg, exec] = SEC.pairGates!;
    expect(brg).toEqual({ door: [-2.5, -16], a: { at: [-3.1, -16.8], yaw: -Math.PI / 2 }, b: { at: [-1.9, -9.9], yaw: Math.PI / 2 } });
    expect(exec).toEqual({ door: [-33, -4], a: { at: [-34.8, -4.6], yaw: Math.PI }, b: { at: [-31.2, -4.6], yaw: Math.PI } });
    // key a in the wing hall, key b in the comms room; the pg-exec keys 3.6 m apart on the lift lobby side
    expect(roomOf(-3.1, -16.8, L1)).toBe('l1wing');
    expect(roomOf(-1.9, -9.9, L1)).toBe('l1comms');
    expect(hyp2(exec!.a.at[0] - exec!.b.at[0], exec!.a.at[1] - exec!.b.at[1])).toBeCloseTo(3.6);
    for (const [x, z, y] of [[-3.1, -16.8, L1], [-1.9, -9.9, L1], [-34.8, -4.6, 8.4], [-31.2, -4.6, 8.4]] as const) expect(nearNav(x, z, y), `key (${x}, ${z})`).toBe(true);
  });
});

/** The L1 room id holding (x, z) on floor y (the smallest box, as `roomAt`). */
function roomOf(x: number, z: number, y: number): string | undefined {
  let best: string | undefined;
  let area = Infinity;
  for (const r of S2.S2_ROOMS) {
    if (x < r.minX || x > r.maxX || z < r.minZ || z > r.maxZ || y < (r.minY ?? -Infinity) || y > (r.maxY ?? Infinity)) continue;
    const a = (r.maxX - r.minX) * (r.maxZ - r.minZ);
    if (a < area) {
      area = a;
      best = r.id;
    }
  }
  return best;
}

describe('S2-G5a the post-room note, items, nav', () => {
  it('the BA16 note: a visual box 0.3 x 0.02 x 0.2 on the sorting table top at (-35, 0.91, -26), no collision', () => {
    const n = b.boxes.find((p) => p.c[0] === -35 && p.c[2] === -26 && Math.abs(p.c[1] - 0.91) < 1e-6)!;
    expect(n).toBeTruthy();
    expect(n.s).toEqual([0.3, 0.02, 0.2]);
    expect(n.collide).toBe(false);
  });

  it('the S2 live co-op items stay under MAX_ITEMS (128): doors, switches, boards, alarms, desks, keypads, intel boards, pair keys and the untagged set', () => {
    const lay2 = lay;
    const secs = m.sectors.CAMPUS_SECTORS;
    const conn: [number, number][] = [];
    for (const s of secs) {
      const c = s.connector;
      if (c?.nearAt) conn.push(c.nearAt);
      if (c?.farAt) conn.push(c.farAt);
      for (const p of c?.sealUnlocks ?? []) conn.push(p);
    }
    const isConn = (q: (typeof doorList)[number]): boolean => conn.some((p) => hyp2(p[0] - q.cx, p[1] - q.cz) < 0.6);
    const tagged =
      doorList.filter((q) => !isConn(q) && q.d.section === 1).length +
      (lay2.switches ?? []).filter((x) => x.section === 1).length +
      (lay2.boards ?? []).filter((x) => x.section === 1).length +
      (lay2.alarms ?? []).filter((x) => x.section === 1).length +
      (m.sectors.CAMPUS_SECURITY.desks ?? []).filter((x) => x.section === 1).length +
      (SEC.keypads?.length ?? 0) +
      (SEC.intel?.filter((n) => n.kind === 'board').length ?? 0) +
      (SEC.bolts?.length ?? 0) +
      (SEC.pairGates?.length ?? 0) * 2;
    const n = tagged + doorList.filter(isConn).length + 1 + COURSE_MAX + secs.length;
    expect(n).toBeLessThanOrEqual(MAX_ITEMS);
    expect(doorList.filter((q) => q.d.section === 1).length).toBeGreaterThan(40);
  });

  it('the switches and boards stand on the nav grid on their floor', () => {
    for (const s of S2.S2_SWITCHES) expect(nearNav(s.pos.x, s.pos.z, s.pos.y), `switch (${s.pos.x}, ${s.pos.y}, ${s.pos.z})`).toBe(true);
    for (const q of S2.S2_BOARDS) expect(nearNav(q.pos.x, q.pos.z, q.pos.y), `board (${q.pos.x}, ${q.pos.z})`).toBe(true);
  });
});
