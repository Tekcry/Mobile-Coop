// (F29 guard) Route-run selftest fixtures: the walk point before every link step (a ladder, drop, window, hatch, duct,
// rappel or a stubbed co-op move: everything but a walk-through opening or a door) is a place the robot can stand and
// reach on its starting floor. The R1 points table puts a link's `at` on the shared edge of its two spaces (right for an
// opening, which is walked through), so a step's walk point copied from it can sit in a doorway (the steps selftest's
// ladder 12 point was the locked dock door E12: the nav goal snapped into the sealed plant room, `no-nav-path`) or over
// a hole (its drop 19 point was the canopy hatch's centre: the walk stalled at the lip, `could-not-follow`). Checked
// from the fixture (inside its `from` space, off every edge and door) and on the map (the guards' runtime nav grid with
// the locked doors shut, and the floor under it).
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs tool script without types
import { addPast, stepsForPath } from '../scripts/route-run.mjs';
import { LevelBuilder } from '../src/world/levelBuilder';
import { campusOps } from '../src/world/maps/campusOps';
import { ctcourse } from '../src/world/maps/ctcourse';
import type { MapDef } from '../src/world/mapDef';
import { LockedDoorNav } from '../src/ai/lockedDoors';
import type { NavGrid } from '../src/ai/navGrid';
import { hyp2 } from '../src/core/mathx';
import { downCast, runtimeNav } from './helpers/runtimeNav';

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type P3 = [number, number, number];

const DIR = new URL('./fixtures/route-run/', import.meta.url);
const metrics = JSON.parse(readFileSync(new URL('../docs/design/metrics.json', import.meta.url), 'utf8'));
const FIXTURES = readdirSync(DIR).filter((f) => /^selftest.*\.graph\.json$/.test(f)).sort();

/** Off the `from` space's box edges by at least this (m): strictly inside, never on a shared boundary. */
const INSIDE_M = 0.25;
/** At least this far (plan, m) from any door link's point on the same floor. */
const DOOR_CLEAR_M = 1;
/** The point's height, the nav cell's and the floor under it within this of the space's floor (m). */
const FLOOR_TOL_M = 0.3;
const DOOR_KINDS = new Set(['door', 'double_door', 'roller_door']);
const WALK_ACTIONS = new Set(['walk', 'door']);

/** The map's guards' nav grid (locked doors shut, as `LockedDoorNav` holds them at run time) and its down-cast. */
function mapNav(def: MapDef): { nav: NavGrid; cast: ReturnType<typeof downCast> } {
  const b = new LevelBuilder();
  const lay = def.build(b, 0);
  const nav = runtimeNav(b, lay.playerSpawns[0]!.pos, def.navLayers ?? 3, lay.navSeeds ?? []);
  const doors = b.anchors.doors.map((a) => ({ cx: a.hinge.x + Math.sin(a.yaw) * a.width * 0.5, cz: a.hinge.z + Math.cos(a.yaw) * a.width * 0.5, target: 0, anchor: a }));
  new LockedDoorNav(nav, doors).sync();
  return { nav, cast: downCast(b) };
}
// (J13 R4c) the course selftest runs on Marlow Yard
const MAPS: Record<string, () => { nav: NavGrid; cast: ReturnType<typeof downCast> }> = { campusOps: () => mapNav(campusOps), ctcourse: () => mapNav(ctcourse) };
const built = new Map<string, ReturnType<typeof mapNav>>();
const mapOf = (id: string) => {
  if (!built.has(id)) built.set(id, MAPS[id]!());
  return built.get(id)!;
};

/** Every (walk point, link step) pair of a run's steps, split legs included. */
function stepPoints(steps: Obj[], out: { to: P3; link: Obj }[] = []): { to: P3; link: Obj }[] {
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]!;
    if (s.type === 'split') {
      stepPoints(s.a, out);
      stepPoints(s.b, out);
      continue;
    }
    const n = steps[i + 1];
    if (s.type === 'walk' && Array.isArray(s.to) && n?.type === 'link' && n.index === s.link && !WALK_ACTIONS.has(n.action)) out.push({ to: s.to as P3, link: n });
  }
  return out;
}

/** The problems with one fixture's step walk points ([] = none). `map` false: the fixture checks only. */
function selftestPointProblems(fx: Obj, map = true): string[] {
  const problems: string[] = [];
  const spaces = new Map<string, Obj>((fx.points?.spaces ?? []).map((s: Obj) => [s.id, s]));
  const doors: P3[] = [];
  fx.links.forEach((l: Obj, i: number) => {
    const at = fx.points?.links?.[i]?.at ?? l.at;
    if (DOOR_KINDS.has(l.kind) && Array.isArray(at)) doors.push(at as P3);
  });
  const m = map ? mapOf(fx.meta.map) : null;
  const seen = new Set<number>();
  for (const r of fx.expect.runs) {
    const steps = addPast(stepsForPath([fx], fx.points, r.path, metrics.rules.split_speed_mps), fx.points);
    for (const { to, link } of stepPoints(steps)) {
      if (seen.has(link.index)) continue;
      seen.add(link.index);
      const name = `link ${link.index} (${link.kind} ${link.from} -> ${link.to}) point ${JSON.stringify(to)}`;
      const sp = spaces.get(link.from);
      if (!sp) {
        problems.push(`${name}: no points entry for ${link.from}`);
        continue;
      }
      const [x, y, z] = to;
      const floor = sp.floorY as number;
      if (Math.abs(y - floor) > FLOOR_TOL_M) problems.push(`${name}: height ${y}, ${link.from}'s floor is ${floor}`);
      const inside = (sp.boxes as number[][]).some(([x0, z0, x1, z1]) => x - x0! >= INSIDE_M && x1! - x >= INSIDE_M && z - z0! >= INSIDE_M && z1! - z >= INSIDE_M);
      if (!inside) problems.push(`${name}: not ${INSIDE_M} m inside ${link.from} (on or past its edge)`);
      for (const o of spaces.values()) {
        if (o.id === link.from || Math.abs(o.floorY - floor) > FLOOR_TOL_M) continue;
        if ((o.boxes as number[][]).some(([x0, z0, x1, z1]) => x >= x0! && x <= x1! && z >= z0! && z <= z1!)) problems.push(`${name}: inside ${o.id} too`);
      }
      for (const d of doors) {
        if (Math.abs(d[1] - y) <= FLOOR_TOL_M && hyp2(d[0] - x, d[2] - z) < DOOR_CLEAR_M) problems.push(`${name}: in a doorway (door point ${JSON.stringify(d)})`);
      }
      if (!m) continue;
      // the runtime nav cell under it is walkable on that floor: the driver's walk goal (`goalOf`) stays the point
      const c = m.nav.cellOf(x, z, floor);
      if (!(m.nav.isWalkable(c) && Math.abs(m.nav.height[c]! - floor) <= FLOOR_TOL_M)) problems.push(`${name}: no walkable nav cell on ${link.from}'s floor there (a wall, a shut door or a hole: the walk goal moves)`);
      // the floor under it is the start floor (a drop's point beside its opening, not in it)
      const hit = m.cast(x, floor + 1, z);
      if (!hit || Math.abs(hit.y - floor) > FLOOR_TOL_M) problems.push(`${name}: the floor under it is at ${hit ? hit.y.toFixed(2) : 'none'}, not ${floor} (inside an opening)`);
    }
  }
  return problems;
}

describe('route-run selftest fixtures: the walk point before each link step (F29 guard)', () => {
  it('finds the selftest fixtures, each on a map this test builds', () => {
    expect(FIXTURES).toContain('selftest-steps.graph.json');
    for (const f of FIXTURES) expect(Object.keys(MAPS), f).toContain(JSON.parse(readFileSync(new URL(f, DIR), 'utf8')).meta.map);
  });

  for (const f of FIXTURES) {
    it(`${f}: every step's walk point is inside its starting space, off its edges and doors, on a walkable floor`, () => {
      expect(selftestPointProblems(JSON.parse(readFileSync(new URL(f, DIR), 'utf8')))).toEqual([]);
    });
  }

  it('catches a point on a space edge, in a doorway and over a hole (the old steps fixture: ladder 12, drop 19)', () => {
    const fx = JSON.parse(readFileSync(new URL('selftest-steps.graph.json', DIR), 'utf8'));
    // the R1 edge points the fixture had: the dock door E12 and the canopy hatch's centre
    fx.points.links[12].at = [-33, 0, -40];
    fx.points.links[19].at = [-20, 4.4, -35.85];
    const p = selftestPointProblems(fx);
    const of = (i: number) => p.filter((s) => s.startsWith(`link ${i} `));
    expect(of(12).some((s) => s.includes('not 0.25 m inside s1-dyard'))).toBe(true);
    expect(of(12).some((s) => s.includes('in a doorway'))).toBe(true);
    expect(of(12).some((s) => s.includes('no walkable nav cell'))).toBe(true);
    expect(of(19).some((s) => s.includes('the floor under it is at 0.00'))).toBe(true);
    expect(of(19).some((s) => s.includes('no walkable nav cell'))).toBe(true);
  });
});
