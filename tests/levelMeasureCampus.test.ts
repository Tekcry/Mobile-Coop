/**
 * (validator-port S10, from level-validator V6e-2; the archived plan is docs/archive/level-validator/V6-PLAN.md "Stale
 * numbers") The campus drift gate: the five campus graphs re-measured in-process exactly as
 * `scripts/level-measure.mjs` does (same build, runtime nav, node light bake with doors open, sight world and
 * `measureGraph` call), against the `measured` values `level-measure --write` stored. The CLI merges the five files
 * (`mergeGraphs`, file order), measures the merged graph once and gives each file only its own spaces and links (a link's
 * index is the merged index less the file's offset; a split goes to each file whose spaces carry its tag); this test does
 * the same. Fails only when a stored value moved (> 0.05 on a fraction, > 1.5 s on a time), a stored `geom` hash differs
 * (the geometry or light changed: rerun `node scripts/level-measure.mjs docs/sector-redesign/graph/campusOps-S1.json ...
 * docs/sector-redesign/graph/campusOps-S5.json --write`, files in S1 to S5 order), or a measured space has nothing stored.
 * Never fails on a target miss: the campus graphs are AS BUILT and expected to miss (the misses are in
 * docs/level-validator/campus-run/V6-REPORT.md). One build and bake shared by the five sections (~3 min on a loaded
 * desktop), 600 s timeouts as campusArtLight.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { campusOps } from '../src/world/maps/campusOps';
import { SightWorld } from '../src/game/sectorCheck';
import { measureGraph, nodeLightField, type MeasureGraphInput, type MeasureMetrics, type MeasureResult } from '../src/world/levelMeasure';
import { runtimeNav } from './helpers/runtimeNav';
import metricsJson from '../docs/design/metrics.json';
// @ts-expect-error plain .mjs process script without types
import { mergeGraphs } from '../scripts/level-graph-lib.mjs';

const metrics = metricsJson as unknown as MeasureMetrics;
/** Drift tolerances (as the CLI's `--check`): fractions and seconds. */
const FRAC_TOL = 0.05;
const TIME_TOL = 1.5;
const EPS = 1e-9;
const SECTIONS = ['S1', 'S2', 'S3', 'S4', 'S5'] as const;
const TIMEOUT = 600_000;
const SPLIT_TAG = /^split:(.+):(a|b)$/;

interface StoredSpace { id: string; tags?: string[]; area?: unknown; measured?: Record<string, unknown> }
interface StoredLink { from: string; to: string; kind: string; measured?: Record<string, unknown> }
interface StoredGraph extends MeasureGraphInput {
  meta: { map: string; measured?: { geom?: string; splits?: Record<string, Record<string, unknown>> } };
  spaces: (MeasureGraphInput['spaces'][number] & StoredSpace)[];
  links: (MeasureGraphInput['links'][number] & StoredLink)[];
}

const graphOf = (s: string): StoredGraph => JSON.parse(readFileSync(new URL(`../docs/sector-redesign/graph/campusOps-${s}.json`, import.meta.url), 'utf8')) as StoredGraph;

/** The split ids a graph's spaces carry a `split:<id>:a|b` tag for (the CLI's `splitIdsOf`). */
const splitIdsOf = (g: StoredGraph): Set<string> => new Set(g.spaces.flatMap((s) => (s.tags ?? []).map((t) => SPLIT_TAG.exec(t)?.[1]).filter((x): x is string => !!x)));

/** Push a line when `now` is not within `tol` of `stored` (null against a number counts; an absent stored value is skipped). */
function drift(out: string[], name: string, stored: unknown, now: number | null, tol: number): void {
  if (stored === undefined) return;
  const a = typeof stored === 'number' ? stored : null;
  if (a === null && now === null) return;
  if (a === null || now === null || Math.abs(a - now) > tol + EPS) out.push(`${name}: stored ${a} now ${now}`);
}

const graphs: StoredGraph[] = SECTIONS.map(graphOf);
/** Where each file starts in the merged `links` (the CLI's `mergeMap`). */
const linkOff: number[] = [];
let res: MeasureResult;

beforeAll(() => {
  let lOff = 0;
  for (const g of graphs) {
    linkOff.push(lOff);
    lOff += g.links.length;
  }
  const merged = mergeGraphs(graphs) as MeasureGraphInput;
  const b = new LevelBuilder();
  const layout = campusOps.build(b, 0);
  const nav = runtimeNav(b, layout.playerSpawns[0]!.pos, campusOps.navLayers ?? 3, layout.navSeeds ?? []);
  const field = nodeLightField(b, campusOps, { doors: 'open' });
  const guards = (campusOps.sectors ?? []).flatMap((s) => s.guards).map((g) => ({ x: g.x, z: g.z, y: g.y, route: g.route }));
  res = measureGraph(merged, { builder: b, field, nav, sight: new SightWorld(b.boxes, b.cylinders), guards, metrics, rooms: layout.rooms ?? [], map: campusOps });
}, TIMEOUT);

describe('campus graphs: stored measured values match a re-measure (no drift, no stale geom)', () => {
  SECTIONS.forEach((sec, n) => {
    it(`campusOps-${sec}`, () => {
      const g = graphs[n]!;
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
      // the file's own links: merged index = file index + the file's offset
      g.links.forEach((l, k) => {
        const lm = res.links[k + linkOff[n]!];
        if (!l.measured || !lm) return;
        drift(bad, `link ${k} ${l.from} -> ${l.to} (${l.kind}).time_s`, l.measured.time_s, lm.time_s, TIME_TOL);
      });
      // the splits whose leg spaces this file holds (the CLI stores each split in every file that carries its tag)
      const mine = splitIdsOf(g);
      const splits = g.meta.measured?.splits ?? {};
      for (const [id, sp] of Object.entries(res.meta.splits)) {
        if (!mine.has(id)) continue;
        const st = splits[id];
        if (!st) {
          bad.push(`split ${id}: measured but nothing stored`);
          continue;
        }
        for (const key of ['a_s', 'b_s', 'reach_s'] as const) drift(bad, `split ${id}.${key}`, st[key], sp[key], TIME_TOL);
      }
      for (const id of Object.keys(splits)) if (!(id in res.meta.splits)) bad.push(`split ${id}: stored but no longer measured`);
      expect(compared, `campusOps-${sec}: no space compared`).toBeGreaterThan(0);
      expect(bad, `campusOps-${sec} drifted; rerun level-measure --write if the change is intended`).toEqual([]);
    }, TIMEOUT);
  });

  it('the merged measure has one link result per file link', () => {
    expect(res.links.length).toBe(graphs.reduce((t, g) => t + g.links.length, 0));
  });
});
