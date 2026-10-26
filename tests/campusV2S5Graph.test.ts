/**
 * (campus-greybox S5 P4, `docs/campus-greybox/briefs/S5.md` P4, job PLAN section 7 "LD 15") Section 5's v2 graph against the
 * build, flag on (`flags.campusV2 = [5]`): `graph/v2/campusOps-S5.json` matches the greybox (areas, doors, guard sums per key),
 * a solo player gets past the team doors, and the light at the vantages (the real `LightField`, baked in node over S5 as
 * `tests/campusS2.test.ts` does). The nav is the live test's analytic raster (copied: a test file is never imported).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder as LB } from '../src/world/levelBuilder';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { LIGHT } from '../src/world/lights';
import { hyp2 } from '../src/core/mathx';
import { canonicalLightSet } from '../src/voxel/lightShapes';
import { bakeLamps } from '../src/voxel/lampBake';
import { bakeMoon, MOON_CELL } from '../src/voxel/skyBake';
import { bakedLights } from '../src/world/lightBake';
import { buildAmbientGrid } from '../src/world/ambientGrid';
import { LightField, type FieldDoor } from '../src/world/lightField';
import { moonLight } from '../src/world/lampMath';
import { dressingOn } from '../src/world/detailPass';

const PI = Math.PI;

/** Loads the campus modules fresh with `flags.campusV2 = v2` (the selection is made at load, as on a page). */
async function loadCampus(v2: readonly number[]) {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = v2;
  const sectors = await import('../src/world/maps/campusSectors');
  const sectorStage = await import('../src/game/sectorStage');
  const { buildCampus, campusOps } = await import('../src/world/maps/campusOps');
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  const s5 = await import('../src/world/maps/campusV2/s5');
  const s5Data = await import('../src/world/maps/campusV2/s5Data');
  return { sectors, sectorStage, buildCampus, campusOps, LevelBuilder, s5, s5Data };
}

const m = await loadCampus([5]);
const { S5_COOP_LIPS, S5_DOORS, S5_FLIGHTS, S5_HIDESPOTS, S5_L1, S5_ROOF } = m.s5;
const b: LB = new m.LevelBuilder();
m.buildCampus(b, { dress: false });
const S5 = m.sectors.CAMPUS_SECTORS[4]!;

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
const onNav = (x: number, z: number, y = 0): boolean => nav.isWalkable(nav.cellOf(x, z, y)) && Math.abs(nav.heightAt(x, z, y) - y) < 0.6;

const G = S5.guards;

interface GSpace {
  id: string;
  area: [number, number, number, number];
  storey: number;
  guards?: Record<string, number>;
  tags: string[];
  vantage?: { from: string; sees_pct: number };
  note?: string;
}
interface GLink {
  from: string;
  to: string;
  kind: string;
  note?: string;
}
const graph = JSON.parse(readFileSync(fileURLToPath(new URL('../docs/sector-redesign/graph/v2/campusOps-S5.json', import.meta.url)), 'utf8')) as { spaces: GSpace[]; links: GLink[]; meta: { players: number[] } };
const space = (id: string): GSpace => graph.spaces.find((s) => s.id === id)!;
const doorCentre = (d: (typeof b.anchors.doors)[number]): [number, number] => [d.hinge.x + Math.sin(d.yaw) * d.width * 0.5, d.hinge.z + Math.cos(d.yaw) * d.width * 0.5];

/** The guard counts by the rule of job BRIEF A16-A17: each guard in the space whose area holds his slot on his storey (the smaller area when two do). */
function guardSums(team = 1): Map<string, number> {
  const sums = new Map<string, number>();
  G.forEach((g, i) => {
    // key k counts the guards a team of k spawns: coop4's 3-4 player extras (A8) from their minPlayers up
    if ((g.minPlayers ?? 1) > team) return;
    const y = g.y ?? 0;
    const hit = graph.spaces
      .filter((s) => Math.abs(s.storey - y) < 0.05 && g.x >= s.area[0] && g.x <= s.area[2] && g.z >= s.area[1] && g.z <= s.area[3])
      .sort((p, q) => (p.area[2] - p.area[0]) * (p.area[3] - p.area[1]) - (q.area[2] - q.area[0]) * (q.area[3] - q.area[1]));
    expect(hit.length, `guard index ${i} (${g.x}, ${g.z}, ${y}) in a space`).toBeGreaterThan(0);
    sums.set(hit[0]!.id, (sums.get(hit[0]!.id) ?? 0) + 1);
  });
  return sums;
}

describe('P4 graph matches the build (LD 15)', () => {
  it('every S5 space area holds a walkable nav cell on its storey', () => {
    expect(graph.spaces.length).toBe(24);
    for (const s of graph.spaces) {
      const [ax0, az0, ax1, az1] = s.area;
      let found = false;
      for (let x = ax0 + 0.25; x < ax1 && !found; x += 0.25) for (let z = az0 + 0.25; z < az1 && !found; z += 0.25) if (onNav(x, z, s.storey)) found = true;
      expect(found, `${s.id} (${s.area}) at storey ${s.storey}`).toBe(true);
    }
  });

  it('every door / pair_gate link has a door anchor within 0.6 m of its point on its floor (the open day gate aside: SY:49, no door anchor)', () => {
    const D = S5_DOORS;
    const pts: Record<string, readonly [number, number]> = {
      's5-lobby>s5-hall': D.lobbyWest,
      's5-lobby>s5-kitchen': D.lobbyNorth,
      's5-lobby>s5-plant': D.lobbySouth,
      's5-kitchen>s5-back': D.kitchenWest,
      's5-kitchen>s5-lawn': D.kitchenBack,
      's5-hall>s5-ctl': D.hallWest,
      's5-hall>s5-draw': D.drawEast,
      's5-hall>s5-ante': D.anteHall,
      's5-back>s5-core-g': D.core,
      's5-back>s5-ante': D.anteSide,
      's5-core-1>s5-landing': D.core,
      's5-core-r>s5-roof': D.core,
      's5-landing>s5-arch': D.kpArch,
      's5-arch>s5-gal': D.archSouth,
      's5-gal>s5-board': D.boardEast,
      's5-gal>s5-ceo': D.ceoEast,
      's5-board>s5-ceo': D.boardCeo,
      's5-arch>s5-cage': D.pgArch,
      's5-ante>s5-shaft': D.anteShaft,
      's5-draw>s5-garden': D.drawWest,
      's5-ctl>s5-garden': D.ctlGarden,
      's5-garden>s5-lawn': D.gate,
    };
    let n = 0;
    for (const l of graph.links) {
      if (l.kind !== 'door' && l.kind !== 'pair_gate') continue;
      const key = `${l.from}>${l.to}`;
      if (key === 's5-ante>s5-strong') {
        // the strongroom day gate stands open tonight (sync-s5-strongkey reserved, SY:49): an opening, no door anchor
        expect(b.anchors.doors.filter((d) => Math.abs(d.hinge.y) < 0.05 && hyp2(doorCentre(d)[0] - D.dayGate[0], doorCentre(d)[1] - D.dayGate[1]) <= 0.6)).toEqual([]);
        continue;
      }
      const p = pts[key];
      expect(p, `a door point for the ${l.kind} link ${key}`).toBeTruthy();
      const y = Math.max(space(l.from).storey, space(l.to).storey);
      const door = b.anchors.doors.find((d) => Math.abs(d.hinge.y - y) < 0.05 && hyp2(doorCentre(d)[0] - p![0], doorCentre(d)[1] - p![1]) <= 0.6);
      expect(door, `${l.kind} ${key} at (${p}) on ${y}`).toBeTruthy();
      n++;
    }
    expect(n).toBe(22);
    // the sector's keypad and pair-gate doors are door anchors on L1
    for (const k of S5.keypads!) expect(b.anchors.doors.some((d) => Math.abs(d.hinge.y - S5_L1) < 0.05 && hyp2(doorCentre(d)[0] - k.at[0], doorCentre(d)[1] - k.at[1]) < 0.1), `keypad ${k.at}`).toBe(true);
    for (const g of S5.pairGates!) expect(b.anchors.doors.some((d) => Math.abs(d.hinge.y - S5_L1) < 0.05 && hyp2(doorCentre(d)[0] - g.door[0], doorCentre(d)[1] - g.door[1]) < 0.1), `pair gate ${g.door}`).toBe(true);
  });

  it('the guard sums per key computed from S5_GUARDS equal the graph at every key (26 / 26 / 27 / 28: the coop4 3-4 player extras in s5-arch and s5-plant); s5-ante is unavoidable (K4, A18)', () => {
    const sums = guardSums();
    const byKey = [1, 2, 3, 4].map((k) => guardSums(k));
    expect(byKey.map((q) => [...q.values()].reduce((p, n) => p + n, 0))).toEqual([26, 26, 27, 28]);
    expect(G.length).toBe(28);
    expect(graph.meta.players).toEqual([1, 2, 3, 4]);
    for (const s of graph.spaces) {
      const want = byKey.map((q) => q.get(s.id) ?? 0);
      if (want[3] === 0) expect(s.guards, s.id).toBeUndefined();
      else expect(s.guards, s.id).toEqual({ '1': want[0], '2': want[1], '3': want[2], '4': want[3] });
    }
    expect(Object.fromEntries([...sums.entries()].sort())).toEqual({
      's5-ante': 4, 's5-arch': 1, 's5-board': 1, 's5-ceo': 2, 's5-ctl': 3, 's5-gal': 2, 's5-garden': 2, 's5-hall': 3, 's5-kitchen': 1, 's5-lawn': 5, 's5-lobby': 1, 's5-roof': 1,
    });
    expect(space('s5-ante').tags).toContain('unavoidable');
  });

  it('no space or link note says PLAN; no target is written measured', () => {
    for (const s of [...graph.spaces, ...graph.links]) {
      const note = s.note ?? '';
      expect(/\bPLAN\b/.test(note), `${'id' in s ? s.id : `${s.from}>${s.to}`}: ${note.slice(0, 60)}`).toBe(false);
    }
    expect(JSON.stringify(graph)).not.toMatch(/"measured"/);
  });
});

describe('P4 solo past the team doors (LD 15)', () => {
  it('with pg-arch and pg-hoist shut, the armoured hall door shut and every co-op lip top solid: start -> the token by the side door -> the extract box', () => {
    const shutAt = (at: readonly [number, number], y: number, alongX: boolean): number => m.sectorStage.addDoorClosure(nav, { cx: at[0], cz: at[1], yaw: alongX ? PI / 2 : 0, width: 1.2, y });
    const shut = [shutAt(S5_DOORS.pgArch, S5_L1, false), shutAt(S5_DOORS.hoist, S5_L1, false), shutAt(S5_DOORS.anteHall, 0, true)];
    for (const id of shut) nav.setClosed(id, true);
    // every co-op lip's top is solid: no cell on a lip's top box at its height is walkable (the low roof, the roof)
    const blocked: number[] = [];
    for (const l of S5_COOP_LIPS) {
      for (let col = 0; col < nav.cols; col++) {
        const [x, z] = nav.center(col);
        if (x < l.top.x0 || x > l.top.x1 || z < l.top.z0 || z > l.top.z1) continue;
        for (let k = 0; k < nav.layers; k++) {
          const i = k * nav.cols + col;
          if (nav.walk[i] && Math.abs(nav.height[i]! - l.top.top) < 0.3) {
            nav.walk[i] = 0;
            blocked.push(i);
          }
        }
      }
    }
    try {
      expect(blocked.length).toBeGreaterThan(500);
      const start: [number, number] = [S5.start.x, S5.start.z];
      const token: [number, number] = [-43, 42.6];
      const toToken = nav.findPath(start, token, 1e7, 0, 0);
      expect(toToken, 'start -> the token').not.toBeNull();
      expect(toToken!.some((w) => hyp2(w[0] - S5_DOORS.anteSide[0], w[1] - S5_DOORS.anteSide[1]) < 1.2), 'by the side door').toBe(true);
      const [ex0, ez0, ex1, ez1] = S5.extract!.box;
      const out = nav.findPath(token, [(ex0 + ex1) / 2, (ez0 + ez1) / 2], 1e7, 0, 0);
      expect(out, 'the token -> the extract box').not.toBeNull();
    } finally {
      for (const i of blocked) nav.walk[i] = 1;
      for (const id of shut) nav.setClosed(id, false);
    }
  });
});

describe('P4 light at the vantages (LD 15)', () => {
  // the real light field, baked in node as `World.create` + `bakeLevelLight` do (`tests/campusS2.test.ts` LR16g), over a box
  // round S5 only (the whole campus bake is ~2 min)
  const lb: LB = new m.LevelBuilder();
  m.campusOps.build(lb, 0);
  const reg = lb.lights;
  let field: LightField;
  beforeAll(() => {
    const set = canonicalLightSet(lb.boxes, lb.cylinders, m.campusOps.id, dressingOn(m.campusOps));
    const lo: [number, number, number] = [Math.max(set.lo[0], -74), set.lo[1], Math.max(set.lo[2], 14)];
    const hi: [number, number, number] = [Math.min(set.hi[0], -22), set.hi[1], Math.min(set.hi[2], 72)];
    reg.ambient = m.campusOps.theme.lightLevel ?? 0.75;
    const mL = moonLight(m.campusOps.theme);
    const sky = Math.max(0, reg.ambient - mL);
    const ambient = buildAmbientGrid({ ambientAt: (x, y, z) => { const v = reg.zoneAt(x, y, z); return v === v ? v : sky; } }, lo, hi);
    const s = m.campusOps.theme.sunDir;
    const l = Math.sqrt(s[0] * s[0] + s[1] * s[1] + s[2] * s[2]);
    const dir: [number, number, number] = [-s[0] / l, -s[1] / l, -s[2] / l];
    const n: [number, number, number] = [0, 1, 2].map((k) => Math.max(1, Math.ceil((hi[k]! - lo[k]!) / MOON_CELL))) as [number, number, number];
    const mb = bakeMoon({ kind: 'moon', id: 0, origin: lo, n, shapes: set.shapes, dir });
    const baked = bakedLights(reg);
    const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo, hi });
    const bake = { lo, hi, lampKey: 't', moonKey: 't', lamps: { baked, r }, moon: { origin: lo, n, cell: MOON_CELL, vis: mb.vis, dir }, ambient, moonLight: mL, ms: 0 };
    field = new LightField(bake, reg, lb.anchors.doors.map((anchor): FieldDoor => ({ anchor, open: 0 })));
  }, 600_000);
  const centre = (s: GSpace): [number, number, number] => [(s.area[0] + s.area[2]) / 2, s.storey + 0.9, (s.area[1] + s.area[3]) / 2];

  it('the level is logged at each graph vantage `from` point (its space\'s centre) and each hide spot; dark only where no fitting lights the point: the well, the low roof\'s north kerb, the roof behind chimney (-53, 22)', () => {
    const rows: string[] = [];
    for (const s of graph.spaces.filter((q) => q.vantage)) {
      const f = space(s.vantage!.from);
      const [x, y, z] = centre(f);
      rows.push(`vantage ${s.id} from ${f.id} (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}): ${field.levelAt(x, y, z).toFixed(2)}`);
    }
    for (const h of S5_HIDESPOTS) rows.push(`hide spot (${h.pos.x}, ${h.pos.y}, ${h.pos.z}): ${field.levelAt(h.pos.x, h.pos.y + 0.9, h.pos.z).toFixed(2)}`);
    const dark: [string, number, number, number][] = [
      ['the well', -48, 0.9, 36],
      ['the low roof\'s north kerb', -29, S5_L1 + 0.9, 43.4],
      ['the roof behind chimney (-53, 22)', -54.5, S5_ROOF + 0.9, 20.5],
    ];
    for (const [name, x, y, z] of dark) rows.push(`dark: ${name} (${x}, ${y}, ${z}): ${field.levelAt(x, y, z).toFixed(2)} (shadow line ${LIGHT.shadow})`);
    console.info(`S5 light at the vantages (LightField, doors shut):\n${rows.join('\n')}`);
    expect(rows.length).toBeGreaterThan(12);
    for (const [name, x, y, z] of dark) expect(field.levelAt(x, y, z), name).toBeLessThan(LIGHT.shadow);
  }, 600_000);
});
