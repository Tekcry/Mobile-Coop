/**
 * (campus-greybox S3 R6) The v2 graph of section 3 (`docs/sector-redesign/graph/v2/campusOps-S3.json`) against the built
 * lane, flag on (`flags.campusV2 = [3]`; brief `docs/campus-greybox/briefs/S3.md` section 4 "R6"). J17 guard keys (C8,
 * C9): every guard counts in the space whose `area` holds his slot on his storey; each guarded space has keys "1".."4", all
 * equal to that count; the section sums to 20 at every key; no `unavoidable` tag (S3 has no K guard). Every space's area
 * holds a floor on its storey (a walkable nav cell; the void a crawl deck); every door link has a door anchor within 0.6 m;
 * the solo route: start -> grab -> C3 on the guards' grid with CR3 and CR3b blocked solid (S3 has no pair gate).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder as LB } from '../src/world/levelBuilder';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { MOVEMENT } from '../src/config/movement';
import { hyp2 } from '../src/core/mathx';

const ROOT = path.resolve(__dirname, '..');
const GRAPH = path.join(ROOT, 'docs/sector-redesign/graph/v2/campusOps-S3.json');

interface Space { id: string; area: [number, number, number, number]; storey: number; type: string; tags: string[]; guards?: Record<string, number> }
interface Link { from: string; to: string; kind: string; reason?: string }
const graph = JSON.parse(fs.readFileSync(GRAPH, 'utf8')) as { meta: { players: number[]; sections: string[] }; spaces: Space[]; links: Link[]; syncs: unknown[] };

/** Loads the campus modules fresh with `flags.campusV2 = [3]` (the selection is made at load, as on a page). */
async function loadV2S3() {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = [3];
  const sectors = await import('../src/world/maps/campusSectors');
  const { buildCampus } = await import('../src/world/maps/campusOps');
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  const s3 = await import('../src/world/maps/campusV2/s3');
  const s3Data = await import('../src/world/maps/campusV2/s3Data');
  return { sectors, buildCampus, LevelBuilder, s3, s3Data };
}

const m = await loadV2S3();
const { S3_BOX, S3_DOORS, S3_FLIGHTS, S3_COOP_LIPS } = m.s3;
const { S3_GUARDS } = m.s3Data;
const S3 = m.sectors.CAMPUS_SECTORS[2]!;

const b: LB = new m.LevelBuilder();
m.buildCampus(b, { dress: false });
const solid: BoxPiece[] = [];
for (const p of b.boxes) {
  if (!p.collide || Math.abs(p.pitch) > 1e-3) continue;
  const q = Math.abs(Math.sin(p.yaw));
  if (q < 1e-3) solid.push(p);
  else if (Math.abs(q - 1) < 1e-3) solid.push({ ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 });
}
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;

/** The stair ramps as surfaces (the live test's). */
function rampAt(x: number, z: number): number[] {
  const out: number[] = [];
  for (const f of S3_FLIGHTS) {
    if (Math.abs(x - f.x) > f.w / 2 || Math.abs(z - f.z) > f.len / 2) continue;
    const t = Math.abs(f.yaw) < 1e-6 ? (z - (f.z - f.len / 2)) / f.len : (f.z + f.len / 2 - z) / f.len;
    out.push(f.y + f.rise * t);
  }
  return out;
}

/** An analytic layered nav grid (the live test's raster; `extra` boxes [x0, z0, x1, z1, bottom, top] blocked solid). */
function analyticNav(rect: readonly [number, number, number, number], extra: readonly (readonly number[])[] = [], cell = 0.5): NavGrid {
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
  for (const [x0, z0, x1, z1, y0, y1] of extra) blockers.push({ cx: (x0! + x1!) / 2, cz: (z0! + z1!) / 2, hx: (x1! - x0!) / 2, hz: (z1! - z0!) / 2, yaw: 0, bottom: y0!, top: y1! });
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
/** The block, the C2 bridge west of it and the C3 lane north of it (the connector box reaches z 16). */
const RECT = [3, -32, 71, 18] as const;
const nav = analyticNav(RECT);
const onNav = (n: NavGrid, x: number, z: number, y = 0): boolean => n.isWalkable(n.cellOf(x, z, y)) && Math.abs(n.heightAt(x, z, y) - y) < 0.6;
const inArea = (s: Space, x: number, z: number): boolean => x >= s.area[0] && x <= s.area[2] && z >= s.area[1] && z <= s.area[3];

/** The spaces holding guard `g`'s slot on his storey. */
function spacesOf(x: number, y: number, z: number): Space[] {
  return graph.spaces.filter((s) => Math.abs(s.storey - y) < 0.6 && inArea(s, x, z));
}

describe('R6 the v2 graph: meta, ids, J17 guard keys', () => {
  it('meta: players [1, 2, 3, 4], all five sections; the space ids of the plan graph; four syncs', () => {
    expect(graph.meta.players).toEqual([1, 2, 3, 4]);
    expect(graph.meta.sections).toEqual(['S1', 'S2', 'S3', 'S4', 'S5']);
    expect(graph.spaces.map((s) => s.id)).toEqual([
      's3-c2', 's3-walkway', 's3-hall', 's3-chamber', 's3-gallery', 's3-view', 's3-hoist', 's3-writeup', 's3-nstair', 's3-gown',
      's3-clean', 's3-store', 's3-void', 's3-estair', 's3-east', 's3-sec', 's3-control', 's3-plant', 's3-dock',
    ]);
    expect(graph.syncs.length).toBe(4);
  });

  it('every guard counts in exactly one space (his slot\'s area on his storey); key k counts the guards a team of k spawns (coop4\'s 3-4 player extras from their minPlayers up); the section sums to 20 / 20 / 21 / 22', () => {
    const counts = new Map<string, number[]>();
    for (const [i, g] of S3_GUARDS.entries()) {
      const in1 = spacesOf(g.x, g.y ?? 0, g.z);
      expect(in1.map((s) => s.id), `#${i + 1} at (${g.x}, ${g.y ?? 0}, ${g.z})`).toHaveLength(1);
      const id = in1[0]!.id;
      const c = counts.get(id) ?? [0, 0, 0, 0];
      for (let k = 1; k <= 4; k++) if ((g.minPlayers ?? 1) <= k) c[k - 1]!++;
      counts.set(id, c);
    }
    for (const s of graph.spaces) {
      const c = counts.get(s.id);
      if (!c) {
        expect(s.guards, `${s.id} has no guard`).toBeUndefined();
        continue;
      }
      expect(s.guards, `${s.id} keys`).toEqual({ 1: c[0], 2: c[1], 3: c[2], 4: c[3] });
    }
    expect(['1', '2', '3', '4'].map((k) => graph.spaces.reduce((a, s) => a + (s.guards?.[k] ?? 0), 0))).toEqual([20, 20, 21, 22]);
    // the brief's reading: #15 in s3-view, #8 / #11 / #16 in s3-hall, nobody in a stair room
    expect(spacesOf(S3_GUARDS[14]!.x, S3_GUARDS[14]!.y ?? 0, S3_GUARDS[14]!.z)[0]!.id).toBe('s3-view');
    for (const n of [8, 11, 16]) expect(spacesOf(S3_GUARDS[n - 1]!.x, S3_GUARDS[n - 1]!.y ?? 0, S3_GUARDS[n - 1]!.z)[0]!.id, `#${n}`).toBe('s3-hall');
    expect(counts.get('s3-nstair') ?? 0).toBe(0);
    expect(counts.get('s3-estair') ?? 0).toBe(0);
    expect(graph.spaces.some((s) => s.tags.includes('unavoidable'))).toBe(false);
  });
});

describe('R6 the v2 graph against the built lane', () => {
  it('every space\'s area holds a floor on its storey: a walkable nav cell; the void (a 1.5 m crawl) a deck with crouch room', () => {
    for (const s of graph.spaces) {
      const [x0, z0, x1, z1] = s.area;
      let found = false;
      if (s.id === 's3-void') {
        for (let x = x0 + 0.25; x < x1 && !found; x += 0.5) {
          for (let z = z0 + 0.25; z < z1 && !found; z += 0.5) {
            const deck = solid.find((p) => Math.abs(top(p) - s.storey) < 0.05 && Math.abs(x - p.c[0]) <= p.s[0] / 2 && Math.abs(z - p.c[2]) <= p.s[2] / 2);
            if (!deck) continue;
            found = !solid.some((p) => bottom(p) > s.storey + 0.01 && bottom(p) < s.storey + MOVEMENT.crouchHeight && Math.abs(x - p.c[0]) <= p.s[0] / 2 && Math.abs(z - p.c[2]) <= p.s[2] / 2);
          }
        }
      } else {
        for (let x = x0 + 0.25; x < x1 && !found; x += 0.5) for (let z = z0 + 0.25; z < z1 && !found; z += 0.5) found = onNav(nav, x, z, s.storey);
      }
      expect(found, `${s.id} (storey ${s.storey})`).toBe(true);
    }
  });

  /** Door links -> the built door (`S3_DOORS`); the reason's "(x, z)" when it gives one must be that door. */
  const DOOR_OF: Record<string, keyof typeof S3_DOORS> = {
    's3-gallery>s3-view': 'gallery', 's3-c2>s3-view': 'landingFire', 's3-view>s3-hoist': 'hoist', 's3-view>s3-writeup': 'writeup', 's3-view>s3-gown': 'gown',
    's3-gown>s3-clean': 'passThrough', 's3-clean>s3-store': 'airlock', 's3-view>s3-store': 'storeHatch', 's3-estair>s3-plant': 'eStairG', 's3-east>s3-sec': 'sec',
    's3-hall>s3-control': 'ctlHall', 's3-hall>s3-plant': 'plantHall', 's3-nstair>s3-control': 'nStairE', 's3-nstair>s3-dock': 'nStairW', 's3-control>s3-plant': 'ctlPlant',
  };
  it('every door link has a door anchor within 0.6 m of its door, on its floor', () => {
    const doorLinks = graph.links.filter((l) => l.kind === 'door' || l.kind === 'double_door');
    expect(doorLinks.length).toBe(Object.keys(DOOR_OF).length);
    for (const l of doorLinks) {
      const key = DOOR_OF[`${l.from}>${l.to}`];
      expect(key, `${l.from} -> ${l.to}`).toBeDefined();
      const [dx, dz, dy] = S3_DOORS[key!];
      const at = /\((-?[\d.]+), (-?[\d.]+)\)/.exec(l.reason ?? '');
      if (at) expect(hyp2(Number(at[1]) - dx, Number(at[2]) - dz), `${l.from} -> ${l.to} reason (${at[1]}, ${at[2]})`).toBeLessThanOrEqual(0.6);
      const near = b.anchors.doors.filter((d) => {
        const cx = d.hinge.x + Math.sin(d.yaw) * d.width / 2;
        const cz = d.hinge.z + Math.cos(d.yaw) * d.width / 2;
        return hyp2(cx - dx, cz - dz) <= 0.6 && Math.abs(d.hinge.y - dy) < 0.3;
      });
      expect(near.length, `${l.from} -> ${l.to}: a door anchor at ${key} (${dx}, ${dy}, ${dz})`).toBeGreaterThan(0);
    }
  });

  it('the solo route (no pair gate in S3): start -> the grab -> C3 on the guards\' grid with CR3 and CR3b blocked solid', () => {
    // CR3: the chamber and its roof walled off to 10 m; CR3b: the goods landing's hatch edge strip and the hatch hole
    const [cx0, cz0, cx1, cz1] = S3_BOX.chamber;
    const [hx0, hz0, hx1, hz1] = S3_BOX.hoistHatch;
    const shut = analyticNav(RECT, [[cx0 - 1.2, cz0 - 0.2, cx1 + 0.2, cz1 + 0.2, -1, 10], [hx0 - 0.5, hz0 - 0.2, hx1, hz1 + 0.2, -1, 10]]);
    expect(S3_COOP_LIPS.map((l) => l.id)).toEqual(['CR3', 'CR3b']);
    const start = S3.start;
    const grab = S3.objective;
    const c = S3.connector!.checkpoint;
    expect(onNav(shut, start.x, start.z, start.y), 'start on nav').toBe(true);
    const toGrab = shut.findPath([start.x, start.z], [grab.x - 0.6, grab.z], 400000, start.y, grab.y);
    expect(toGrab, 'start -> grab').not.toBeNull();
    const toExit = shut.findPath([grab.x - 0.6, grab.z], [c.x, c.z], 400000, grab.y, c.y);
    expect(toExit, 'grab -> C3').not.toBeNull();
    // and through the C3 near door
    expect(toExit!.some((w) => Math.abs(w[0] - S3_DOORS.c3Near[0]) < 1.5 && Math.abs(w[1] - S3_DOORS.c3Near[1]) < 1.5), 'via c3Near').toBe(true);
  });
});
