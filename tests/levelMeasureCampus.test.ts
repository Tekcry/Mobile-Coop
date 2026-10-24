/**
 * (level-validator V6e-2, docs/level-validator/V6-PLAN.md "Stale numbers") The campus drift gate: the five campus
 * graphs re-measured in-process with the same build, runtime nav, node light bake (doors open), sight world and
 * `measureGraph` call as `scripts/level-measure.mjs`, against the `measured` values `level-measure --write` stored.
 * Fails only when a stored value moved (> 0.05 on a fraction, > 1.5 s on a time), a stored `geom` hash differs (the
 * geometry or light changed: rerun `node scripts/level-measure.mjs docs/sector-redesign/graph/campusOps-S*.json
 * --write`), or a measured space has nothing stored. Never fails on a target miss: the campus graphs are AS BUILT and
 * expected to miss (V6-PLAN "Campus will fail"; the misses are in docs/level-validator/campus-run/V6-REPORT.md).
 * One build and bake shared by the five sections (~2-3 min on a loaded desktop), 600 s timeouts as campusArtLight.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { campusOps } from '../src/world/maps/campusOps';
import { SightWorld } from '../src/game/sectorCheck';
import { measureGraph, nodeLightField, type MeasureGraphInput, type MeasureMetrics, type MeasureOptions } from '../src/world/levelMeasure';
import { runtimeNav } from './helpers/runtimeNav';
import metricsJson from '../docs/design/metrics.json';

const metrics = metricsJson as unknown as MeasureMetrics;
/** Drift tolerances (V6e-2 brief): fractions and seconds. */
const FRAC_TOL = 0.05;
const TIME_TOL = 1.5;
const EPS = 1e-9;
const SECTIONS = ['S1', 'S2', 'S3', 'S4', 'S5'] as const;
const TIMEOUT = 600_000;

interface StoredSpace { id: string; area?: unknown; measured?: Record<string, unknown> }
interface StoredLink { from: string; to: string; kind: string; measured?: Record<string, unknown> }
interface StoredGraph extends MeasureGraphInput {
  meta: { map: string; measured?: { geom?: string; splits?: Record<string, Record<string, unknown>> } };
  spaces: (MeasureGraphInput['spaces'][number] & StoredSpace)[];
  links: (MeasureGraphInput['links'][number] & StoredLink)[];
}

const graphOf = (s: string): StoredGraph => JSON.parse(readFileSync(new URL(`../docs/sector-redesign/graph/campusOps-${s}.json`, import.meta.url), 'utf8')) as StoredGraph;

/** Push a line when `now` is not within `tol` of `stored` (null against a number counts; an absent stored value is skipped). */
function drift(out: string[], name: string, stored: unknown, now: number | null, tol: number): void {
  if (stored === undefined) return;
  const a = typeof stored === 'number' ? stored : null;
  if (a === null && now === null) return;
  if (a === null || now === null || Math.abs(a - now) > tol + EPS) out.push(`${name}: stored ${a} now ${now}`);
}

let opts: MeasureOptions;

beforeAll(() => {
  const b = new LevelBuilder();
  const layout = campusOps.build(b, 0);
  const nav = runtimeNav(b, layout.playerSpawns[0]!.pos, campusOps.navLayers ?? 3, layout.navSeeds ?? []);
  const field = nodeLightField(b, campusOps, { doors: 'open' });
  const guards = (campusOps.sectors ?? []).flatMap((s) => s.guards).map((g) => ({ x: g.x, z: g.z, y: g.y, route: g.route }));
  opts = { builder: b, field, nav, sight: new SightWorld(b.boxes, b.cylinders), guards, metrics, rooms: layout.rooms ?? [], map: campusOps };
}, TIMEOUT);

describe('campus graphs: stored measured values match a re-measure (no drift, no stale geom)', () => {
  for (const sec of SECTIONS) {
    it(`campusOps-${sec}`, () => {
      const g = graphOf(sec);
      const res = measureGraph(g, opts);
      const bad: string[] = [];
      expect(g.meta.measured, `campusOps-${sec}: no meta.measured (run level-measure --write)`).toBeTruthy();
      if (g.meta.measured?.geom !== res.meta.geom) bad.push(`meta.geom stale: stored ${g.meta.measured?.geom} now ${res.meta.geom}`);
      let compared = 0;
      for (const s of g.spaces) {
        const m = res.spaces[s.id];
        if (!m || m.cells === 0) continue;
        const st = s.measured;
        if (!st) {
          bad.push(`${s.id}: measured (${m.cells} cells) but nothing stored`);
          continue;
        }
        compared++;
        if (st.geom !== m.geom) bad.push(`${s.id}: geom stale: stored ${String(st.geom)} now ${m.geom}`);
        drift(bad, `${s.id}.shadow_pct`, st.shadow_pct, m.shadow_pct, FRAC_TOL);
        drift(bad, `${s.id}.sees_pct`, st.sees_pct, m.sees_pct, FRAC_TOL);
        drift(bad, `${s.id}.los_break_s`, st.los_break_s, m.los_break_s, TIME_TOL);
      }
      g.links.forEach((l, k) => {
        const lm = res.links[k];
        if (!l.measured || !lm) return;
        drift(bad, `link ${k} ${l.from} -> ${l.to} (${l.kind}).time_s`, l.measured.time_s, lm.time_s, TIME_TOL);
      });
      const splits = g.meta.measured?.splits ?? {};
      for (const [id, sp] of Object.entries(res.meta.splits)) {
        const st = splits[id];
        if (!st) {
          bad.push(`split ${id}: measured but nothing stored`);
          continue;
        }
        for (const key of ['a_s', 'b_s', 'reach_s'] as const) drift(bad, `split ${id}.${key}`, st[key], sp[key], TIME_TOL);
      }
      expect(compared, `campusOps-${sec}: no space compared`).toBeGreaterThan(0);
      expect(bad, `campusOps-${sec} drifted; rerun level-measure --write if the change is intended`).toEqual([]);
    }, TIMEOUT);
  }
});
