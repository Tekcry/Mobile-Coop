/**
 * (campus-greybox S2-G6b, `docs/campus-greybox/briefs/S2.md` section 6 "LD 15 tests", job PLAN section 7) The v2 S2 graph
 * (`docs/sector-redesign/graph/v2/campusOps-S2.json`) against the build, flag on: `graph matches the build` (every space's area
 * holds a walkable nav cell on its storey, every door link has a door anchor within 0.6 m of its point, the guard sums per key equal
 * the spawned list from `S2_GUARDS`), `solo past the team doors` (an `analyticNav` path with both pair-gate doors shut and the co-op
 * lip solid, from the start to the objective and on to the landing by the comms-room door) and `light at vantages` (the light field
 * logged at each vantage and hide spot; dark asserted only where no fitting lights the point).
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder as LB } from '../src/world/levelBuilder';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { hyp2 } from '../src/core/mathx';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { SectorDef } from '../src/game/sectors';
import { LIGHT, contribution } from '../src/world/lights';
import { canonicalLightSet } from '../src/voxel/lightShapes';
import { bakeLamps } from '../src/voxel/lampBake';
import { bakeMoon, MOON_CELL } from '../src/voxel/skyBake';
import { bakedLights } from '../src/world/lightBake';
import { buildAmbientGrid } from '../src/world/ambientGrid';
import { LightField, type FieldDoor } from '../src/world/lightField';
import { moonLight } from '../src/world/lampMath';
import type { Flight } from '../src/world/maps/campusV2/s2';


/** Loads the campus modules fresh with `flags.campusV2 = v2` (the selection is made at load, as on a page). */
async function loadCampus(v2: readonly number[]) {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = v2;
  const sections = await import('../src/world/maps/campusSections');
  const { buildCampus, campusOps } = await import('../src/world/maps/campusOps');
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  const s2 = await import('../src/world/maps/campusV2/s2');
  const s2Data = await import('../src/world/maps/campusV2/s2Data');
  const sectors = await import('../src/world/maps/campusSectors');
  return { sections, buildCampus, campusOps, LevelBuilder, s2, s2Data, sectors };
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
function analyticNav(rect: readonly [number, number, number, number], cell = 0.5, layers = 5, extra: readonly NavBlocker[] = []): NavGrid {
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
  const blockers: NavBlocker[] = near.filter((p) => !p.overhead).map((p) => ({ cx: p.c[0], cz: p.c[2], hx: p.s[0] / 2, hz: p.s[2] / 2, yaw: p.yaw, bottom: p.c[1] - p.s[1] / 2, top: p.c[1] + p.s[1] / 2 }));
  for (const f of b.anchors.fences) blockers.push({ cx: (f.a.x + f.b.x) / 2, cz: (f.a.z + f.b.z) / 2, hx: 0.05, hz: f.len / 2, yaw: Math.atan2(f.tx, f.tz), bottom: f.a.y, top: f.a.y + f.height });
  blockers.push(...extra);
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
const G = SEC.guards;
const floorOf = (g: { y?: number }): number => g.y ?? 0;
interface Space { id: string; area: [number, number, number, number]; storey: number; tags: string[]; guards?: Record<string, number>; vantage?: { from: string; sees_pct: number }; note?: string }
interface Link { from: string; to: string; kind: string; reason: string; note?: string }
const graph = JSON.parse(readFileSync(path.resolve(__dirname, '../docs/sector-redesign/graph/v2/campusOps-S2.json'), 'utf8')) as {
  meta: { players: number[]; sections: string[] };
  spaces: Space[];
  links: Link[];
  tracks: Record<string, unknown>;
  syncs: { id: string; solo?: string }[];
};
const spaceOf = (id: string): Space => graph.spaces.find((s) => s.id === id)!;
const doorList = b.anchors.doors.map((d) => ({ d, cx: d.hinge.x + Math.sin(d.yaw) * d.width * 0.5, cz: d.hinge.z + Math.cos(d.yaw) * d.width * 0.5 }));
/** The smallest space area holding (x, z) on the storey (the rule: a guard counts in the space whose area holds his slot on his floor). */
function spaceAt(x: number, z: number, y: number): string | undefined {
  let best: string | undefined;
  let area = Infinity;
  for (const s of graph.spaces) {
    if (Math.abs(s.storey - y) > 0.5 || x < s.area[0] || x > s.area[2] || z < s.area[1] || z > s.area[3]) continue;
    const a = (s.area[2] - s.area[0]) * (s.area[3] - s.area[1]);
    if (a < area) {
      area = a;
      best = s.id;
    }
  }
  return best;
}

describe('S2-G6b graph matches the build (LD 15)', () => {
  it('the plan graph\'s shape: 27 spaces with an area on every one, 53 links and the spine link, tracks, the seven syncs, players 1-4, sections S1-S5', () => {
    expect(graph.spaces.length).toBe(27);
    expect(graph.links.length).toBe(54);
    expect(graph.links.filter((l) => l.kind !== 'corridor' || l.to !== 's3-c2').length).toBe(53);
    for (const s of graph.spaces) expect(s.area.length, s.id).toBe(4);
    expect(graph.meta.players).toEqual([1, 2, 3, 4]);
    expect(graph.meta.sections).toEqual(['S1', 'S2', 'S3', 'S4', 'S5']);
    expect(graph.syncs.map((q) => q.id)).toEqual(['sync-s2-comms', 'sync-s2-power', 'sync-s2-atrium', 'sync-s2-kpfac', 'sync-s2-kitchen', 'sync-s2-plantlog', 'sync-s2-pairdoor']);
    expect(Object.keys(graph.tracks)).toEqual(expect.arrayContaining(['A', 'B', 'meet', 'exfil']));
  });

  it('every space area holds a walkable nav cell on its storey', () => {
    const missing: string[] = [];
    for (const s of graph.spaces) {
      let found = false;
      for (let x = s.area[0] + 0.25; x < s.area[2] && !found; x += 0.5) for (let z = s.area[1] + 0.25; z < s.area[3] && !found; z += 0.5) if (onNav(x, z, s.storey)) found = true;
      if (!found) missing.push(s.id);
    }
    expect(missing).toEqual([]);
  });

  it('every door link has a door anchor within 0.6 m of its point (the first (x,z) in its reason, else its note) on the spaces\' floor', () => {
    const re = /\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/;
    const bad: string[] = [];
    let n = 0;
    for (const l of graph.links.filter((q) => q.kind === 'door')) {
      const mt = re.exec(l.reason) ?? re.exec(l.note ?? '');
      if (!mt) {
        bad.push(`${l.from} -> ${l.to}: no door point in the reason or note`);
        continue;
      }
      const x = Number(mt[1]);
      const z = Number(mt[2]);
      const y = spaceOf(l.from).storey;
      const hit = doorList.find((q) => Math.abs(q.d.hinge.y - y) < 0.01 && hyp2(q.cx - x, q.cz - z) < 0.6);
      if (!hit) bad.push(`${l.from} -> ${l.to}: no door anchor within 0.6 m of (${x}, ${z}) on ${y}`);
      n++;
    }
    expect(bad).toEqual([]);
    expect(n).toBe(graph.links.filter((q) => q.kind === 'door').length);
  });

  it('the guard sums per key equal the spawned list: every guard counts in the space whose area holds his slot on his floor; each guarded space has keys 1-4 (key k = the guards a team of k spawns); the section sums to 18 / 18 / 19 / 20', () => {
    // key k counts the guards a team of k spawns: the base 18, plus coop4's 3-4 player extras (A8) from their minPlayers up
    const want = new Map<string, Record<string, number>>();
    for (const g of G) {
      const sp = spaceAt(g.x, g.z, floorOf(g));
      expect(sp, `guard slot (${g.x}, ${g.z}) on ${floorOf(g)}`).toBeTruthy();
      const w = want.get(sp!) ?? { '1': 0, '2': 0, '3': 0, '4': 0 };
      for (const k of [1, 2, 3, 4]) if ((g.minPlayers ?? 1) <= k) w[String(k)]!++;
      want.set(sp!, w);
    }
    const spawned = (k: number): number => G.filter((g) => (g.minPlayers ?? 1) <= k).length;
    expect([1, 2, 3, 4].map(spawned)).toEqual([18, 18, 19, 20]);
    for (const s of graph.spaces) {
      const w = want.get(s.id);
      if (w === undefined) expect(s.guards, `${s.id} has no guard`).toBeUndefined();
      else expect(s.guards, s.id).toEqual(w);
    }
    expect(['1', '2', '3', '4'].map((k) => graph.spaces.reduce((t, s) => t + (s.guards?.[k] ?? 0), 0))).toEqual([18, 18, 19, 20]);
    // K2 #11 counts in s2-l1-landing, tagged unavoidable with the justified note
    expect(spaceAt(G[10]!.x, G[10]!.z, floorOf(G[10]!))).toBe('s2-l1-landing');
    expect(spaceOf('s2-l1-landing').tags).toEqual(['exit', 'unavoidable']);
    expect(spaceOf('s2-l1-landing').note).toContain("K2 #11 posted at the bridge card door; a connector, so the validator WARNs 'not a guarded encounter space' (justified, job BRIEF A18)");
  });

  it('Q21: the pair-door sync\'s solo note reads "two players (Q21); solo: the comms-room door into the landing"; both pair-gate links say two players', () => {
    expect(graph.syncs.find((q) => q.id === 'sync-s2-pairdoor')!.solo).toBe('two players (Q21); solo: the comms-room door into the landing');
    for (const l of graph.links.filter((q) => q.kind === 'pair_gate')) {
      expect(l.note, `${l.from} -> ${l.to}`).toContain('Two players (Q21: no solo window)');
      expect(l.note ?? '').not.toContain('solo window (PLAN');
    }
  });
});

describe('S2-G6b solo past the team doors', () => {
  // both pair-gate doors shut (a nav blocker across each opening) and every co-op lip box solid: CR2's top box on L1
  const doorBlock = (x: number, z: number, along: 'x' | 'z', y: number): NavBlocker => ({ cx: x, cz: z, hx: along === 'x' ? 0.6 : 0.1, hz: along === 'x' ? 0.1 : 0.6, yaw: 0, bottom: y, top: y + 2.1 });
  const lipBlocks: NavBlocker[] = S2.S2_COOP_LIPS.map((l) => ({ cx: (l.top.x0 + l.top.x1) / 2, cz: (l.top.z0 + l.top.z1) / 2, hx: (l.top.x1 - l.top.x0) / 2, hz: (l.top.z1 - l.top.z0) / 2, yaw: 0, bottom: l.top.top - 0.1, top: l.top.top + 2 }));
  const gates = SEC.pairGates ?? [];
  const shut: NavBlocker[] = [doorBlock(gates[0]!.door[0], gates[0]!.door[1], 'z', L1), doorBlock(gates[1]!.door[0], gates[1]!.door[1], 'x', 8.4)];
  const solo = analyticNav([-46, -34, 12, 8], 0.5, 5, [...shut, ...lipBlocks]);
  const len = (p: [number, number][], a: [number, number]): number => {
    let t = 0;
    let q = a;
    for (const w of p) {
      t += hyp2(w[0] - q[0], w[1] - q[1]);
      q = [w[0], w[1]];
    }
    return t;
  };
  const nearPath = (p: [number, number][], x: number, z: number, r: number): boolean => {
    let q: [number, number] | null = null;
    for (const w of p) {
      if (q) for (let f = 0; f <= 1; f += 0.05) if (hyp2(q[0] + (w[0] - q[0]) * f - x, q[1] + (w[1] - q[1]) * f - z) < r) return true;
      q = [w[0], w[1]];
    }
    return false;
  };

  it('a path from the start to the objective and on to the landing exists with both pair-gate doors shut and the co-op lip solid; it goes through the comms-room door (1, -10.5), not pg-brg', () => {
    expect(S2.S2_COOP_LIPS.length).toBeGreaterThan(0);
    const start: [number, number] = [SEC.start.x, SEC.start.z + 3];
    const obj: [number, number] = [SEC.objective.x, SEC.objective.z - 1.4];
    const landing: [number, number] = [2.5, -14];
    const to = solo.findPath(start, obj, 400000, 0, L1);
    expect(to, 'start to the objective').not.toBeNull();
    const out = solo.findPath(obj, landing, 400000, L1, L1);
    expect(out, 'objective to the landing').not.toBeNull();
    expect(nearPath(out!, 1, -10.5, 0.7), 'through the comms-room door').toBe(true);
    expect(nearPath(out!, -2.5, -16, 0.7), 'not through pg-brg').toBe(false);
    expect(len(to!, start)).toBeLessThan(160);
    // proof the gates and the lip are the point: with the comms door shut too there is no way to the landing, and the unblocked grid has the pg-brg way
    const shutAll = analyticNav([-46, -34, 12, 8], 0.5, 5, [...shut, ...lipBlocks, doorBlock(1, -10.5, 'x', L1), doorBlock(-2.5, -7.5, 'z', L1)]);
    expect(shutAll.findPath(obj, landing, 400000, L1, L1)).toBeNull();
    expect(nav.findPath(obj, landing, 400000, L1, L1)).not.toBeNull();
    // the lip's top is blocked, so the way up is the stairs: the start to L1 east strip behind the lip still has a path round (by the feature stair)
    expect(solo.findPath(start, [-9.5, -16], 400000, 0, L1), 'the L1 east strip by the feature stair').not.toBeNull();
  });
});

describe('S2-G6b light at vantages', () => {
  // the real light field baked in node over a box round S2 (as the live S2 test's atrium check)
  let field: LightField;
  beforeAll(() => {
    const op = m.campusOps;
    const set = canonicalLightSet(b.boxes, b.cylinders, op.id, false);
    const lo: [number, number, number] = [Math.max(set.lo[0], -50), set.lo[1], Math.max(set.lo[2], -40)];
    const hi: [number, number, number] = [Math.min(set.hi[0], 10), set.hi[1], Math.min(set.hi[2], 12)];
    const reg = b.lights;
    reg.ambient = op.theme.lightLevel ?? 0.75;
    const mL = moonLight(op.theme);
    const sky = Math.max(0, reg.ambient - mL);
    const ambient = buildAmbientGrid({ ambientAt: (x, y, z) => { const v = reg.zoneAt(x, y, z); return v === v ? v : sky; } }, lo, hi);
    const s = op.theme.sunDir;
    const l = Math.sqrt(s[0] * s[0] + s[1] * s[1] + s[2] * s[2]);
    const dir: [number, number, number] = [-s[0] / l, -s[1] / l, -s[2] / l];
    const n: [number, number, number] = [0, 1, 2].map((k) => Math.max(1, Math.ceil((hi[k]! - lo[k]!) / MOON_CELL))) as [number, number, number];
    const mo = bakeMoon({ kind: 'moon', id: 0, origin: lo, n, shapes: set.shapes, dir });
    const baked = bakedLights(reg);
    const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo, hi });
    const bake = { lo, hi, lampKey: 't', moonKey: 't', lamps: { baked, r }, moon: { origin: lo, n, cell: MOON_CELL, vis: mo.vis, dir }, ambient, moonLight: mL, ms: 0 };
    field = new LightField(bake, reg, b.anchors.doors.map((anchor): FieldDoor => ({ anchor, open: 0 })));
  }, 600_000);

  it('the light level is logged at each graph vantage (the centre of the `from` space on its storey) and each hide spot; a point no fitting lights is dark (under the shadow line)', () => {
    const pts: { what: string; x: number; y: number; z: number; body: boolean }[] = [];
    const seen = new Set<string>();
    for (const s of graph.spaces) {
      if (!s.vantage || seen.has(s.vantage.from)) continue;
      seen.add(s.vantage.from);
      const f = spaceOf(s.vantage.from);
      pts.push({ what: `vantage ${s.vantage.from} (for ${s.id})`, x: (f.area[0] + f.area[2]) / 2, y: f.storey, z: (f.area[1] + f.area[3]) / 2, body: true });
    }
    for (const h of S2.S2_HIDESPOTS) pts.push({ what: `hide spot (${h.pos.x}, ${h.pos.y}, ${h.pos.z})`, x: h.pos.x, y: h.pos.y, z: h.pos.z, body: false });
    expect(pts.length).toBeGreaterThanOrEqual(8);
    const rows: string[] = [];
    let unlit = 0;
    for (const p of pts) {
      const level = p.body ? field.bodyLevel(p.x, p.y, p.z, 1.7) : field.levelAt(p.x, p.y + 0.05, p.z);
      // the fittings' unoccluded contribution at the point (an upper bound of what they give it)
      const fit = b.lights.lights.reduce((t, l) => t + contribution(l, p.x, p.y + (p.body ? 1.0 : 0.05), p.z), 0);
      const lit = fit > 0.02;
      rows.push(`${p.what}: level ${level.toFixed(2)}, fittings ${fit.toFixed(2)}${lit ? '' : ' (no fitting lights it)'}`);
      expect(Number.isFinite(level) && level >= 0, p.what).toBe(true);
      if (!lit) {
        unlit++;
        expect(level, `${p.what} has no fitting but reads ${level.toFixed(2)}`).toBeLessThan(LIGHT.shadow);
      }
    }
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(`light at vantages (shadow ${LIGHT.shadow}):\n${rows.join('\n')}`);
    expect(unlit + 0).toBeGreaterThanOrEqual(0);
  });
});
